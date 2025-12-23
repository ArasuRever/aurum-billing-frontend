import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { api } from '../api';
import OldMetalReceipt from '../components/OldMetalReceipt';

function OldMetalPage() {
  const [stats, setStats] = useState({ gold_weight: 0, gold_cost: 0, silver_weight: 0, silver_cost: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MULTI-ITEM FORM STATE ---
  const [showModal, setShowModal] = useState(false);
  const [customer, setCustomer] = useState({ customer_name: '', mobile: '' });
  const [items, setItems] = useState([]);
  
  // Current Item Input
  const [currentItem, setCurrentItem] = useState({
      item_name: '', metal_type: 'GOLD',
      gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0,
      rate: '', amount: 0
  });

  // GST State
  const [deductGst, setDeductGst] = useState(false);
  const [gstPercent, setGstPercent] = useState(3);

  // Search State
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  // Print State
  const receiptRef = useRef();
  const [printData, setPrintData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
        setLoading(true);
        const [s, h] = await Promise.all([api.getOldMetalStats(), api.getOldMetalList()]);
        if(s.data) setStats(s.data);
        if(Array.isArray(h.data)) setHistory(h.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- LIVE SEARCH LOGIC ---
  const handleCustomerSearch = async (val) => {
      setCustomer(prev => ({ ...prev, customer_name: val }));
      if(val.length > 2) {
          try {
              const res = await api.searchCustomer(val);
              setSearchResults(res.data);
              setShowSearch(true);
          } catch(err) { console.error(err); }
      } else {
          setShowSearch(false);
      }
  };

  const selectCustomer = (c) => {
      setCustomer({ customer_name: c.name, mobile: c.phone });
      setShowSearch(false);
  };

  // --- CALCULATOR LOGIC (Item Level) ---
  const handleGrossChange = (val) => {
      const gw = parseFloat(val) || 0;
      const lp = parseFloat(currentItem.less_percent) || 0;
      const lw = (gw * lp) / 100;
      const nw = gw - lw;
      const rate = parseFloat(currentItem.rate) || 0;
      setCurrentItem({ ...currentItem, gross_weight: val, less_weight: lw.toFixed(3), net_weight: nw.toFixed(3), amount: Math.round(nw * rate) });
  };

  const handlePercentChange = (val) => {
      const lp = parseFloat(val) || 0;
      const gw = parseFloat(currentItem.gross_weight) || 0;
      const lw = (gw * lp) / 100;
      const nw = gw - lw;
      const rate = parseFloat(currentItem.rate) || 0;
      setCurrentItem({ ...currentItem, less_percent: val, less_weight: lw.toFixed(3), net_weight: nw.toFixed(3), amount: Math.round(nw * rate) });
  };

  const handleWeightChange = (val) => {
      const lw = parseFloat(val) || 0;
      const gw = parseFloat(currentItem.gross_weight) || 0;
      let lp = 0;
      if (gw > 0) lp = (lw / gw) * 100;
      const nw = gw - lw;
      const rate = parseFloat(currentItem.rate) || 0;
      setCurrentItem({ ...currentItem, less_weight: val, less_percent: lp.toFixed(2), net_weight: nw.toFixed(3), amount: Math.round(nw * rate) });
  };

  const handleRateChange = (val) => {
      const rate = parseFloat(val) || 0;
      const nw = parseFloat(currentItem.net_weight) || 0;
      setCurrentItem({ ...currentItem, rate: val, amount: Math.round(nw * rate) });
  };

  // --- ADD ITEM TO LIST ---
  const addItem = () => {
      if(!currentItem.item_name || !currentItem.gross_weight || !currentItem.rate) return alert("Enter Item details");
      setItems([...items, currentItem]);
      setCurrentItem({
          item_name: '', metal_type: 'GOLD',
          gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0,
          rate: '', amount: 0
      });
  };

  const removeItem = (idx) => {
      setItems(items.filter((_, i) => i !== idx));
  };

  // --- TOTALS & SAVE ---
  const totalAmount = items.reduce((sum, it) => sum + parseFloat(it.amount), 0);
  const gstAmount = deductGst ? Math.round((totalAmount * gstPercent) / 100) : 0;
  const netPayout = totalAmount - gstAmount;

  const handleFinalSave = async () => {
      if(!customer.customer_name || items.length === 0) return alert("Customer and Items required");
      try {
          const payload = {
              customer_name: customer.customer_name,
              mobile: customer.mobile,
              items: items,
              total_amount: totalAmount,
              gst_deducted: gstAmount,
              net_payout: netPayout
          };
          
          const res = await api.addOldMetalPurchase(payload);
          
          // Prepare Print Data
          setPrintData({
              customer, items, 
              totals: { totalAmount, gstAmount, netPayout },
              voucherNo: res.data.voucher_no
          });
          
          setShowModal(false);
          setShowPrintModal(true); // Open Print Modal
          loadData();
          
          // Reset Form
          setCustomer({ customer_name: '', mobile: '' });
          setItems([]);
          setDeductGst(false);
      } catch(err) { alert("Failed: " + err.message); }
  };

  // --- PRINT HANDLER ---
  const handlePrint = useReactToPrint({
      content: () => receiptRef.current,
      onAfterPrint: () => setShowPrintModal(false)
  });

  const formatCurrency = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? "0.00" : num.toLocaleString();
  };

  return (
    <div className="container-fluid pb-5">
      {/* HEADER & STATS (Same as before) */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-secondary"><i className="bi bi-recycle me-2"></i>Old Metal / Scrap Stock</h2>
        <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={loadData}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
            <button className="btn btn-warning fw-bold shadow-sm" onClick={() => setShowModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>Buy Old Metal
            </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
          <div className="col-md-6">
              <div className="card border-warning shadow-sm h-100">
                  <div className="card-body d-flex justify-content-between align-items-center">
                      <div><div className="text-warning small fw-bold">TOTAL OLD GOLD</div><h3 className="fw-bold mb-0">{parseFloat(stats.gold_weight).toFixed(3)}g</h3></div>
                      <div className="text-end"><div className="text-muted small">Est. Value</div><div className="fs-5 fw-bold">₹{formatCurrency(stats.gold_cost)}</div></div>
                  </div>
              </div>
          </div>
          <div className="col-md-6">
              <div className="card border-secondary shadow-sm h-100">
                  <div className="card-body d-flex justify-content-between align-items-center">
                      <div><div className="text-secondary small fw-bold">TOTAL OLD SILVER</div><h3 className="fw-bold mb-0">{parseFloat(stats.silver_weight).toFixed(3)}g</h3></div>
                      <div className="text-end"><div className="text-muted small">Est. Value</div><div className="fs-5 fw-bold">₹{formatCurrency(stats.silver_cost)}</div></div>
                  </div>
              </div>
          </div>
      </div>

      {/* HISTORY TABLE */}
      <div className="card shadow-sm border-0">
          <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                      <tr>
                          <th>Date</th>
                          <th>Voucher</th>
                          <th>Source</th>
                          <th>Customer</th>
                          <th>Item</th>
                          <th>Net Weight</th>
                          <th className="text-end">Amount Paid</th>
                      </tr>
                  </thead>
                  <tbody>
                      {loading ? <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr> : 
                       history.map((row, i) => (
                          <tr key={i}>
                              <td className="small text-muted">{new Date(row.date).toLocaleDateString()}</td>
                              <td className="small font-monospace">{row.voucher_no || '-'}</td>
                              <td>{row.source === 'DIRECT_PURCHASE' ? <span className="badge bg-primary">Purchase</span> : <span className="badge bg-info text-dark">Exchange</span>}</td>
                              <td><div className="fw-bold">{row.customer_name}</div><div className="small text-muted">{row.mobile}</div></td>
                              <td>{row.item_name} <span className={`badge ms-1 ${row.metal_type==='GOLD'?'bg-warning text-dark':'bg-secondary'}`}>{row.metal_type}</span></td>
                              <td className="fw-bold">{parseFloat(row.net_weight).toFixed(3)}g</td>
                              <td className="text-end fw-bold text-danger">- ₹{formatCurrency(row.amount)}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* PURCHASE FORM MODAL */}
      {showModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'auto'}}>
           <div className="modal-dialog modal-lg">
              <div className="modal-content">
                 <div className="modal-header bg-warning">
                    <h5 className="modal-title fw-bold">New Old Metal Purchase</h5>
                    <button className="btn-close" onClick={() => setShowModal(false)}></button>
                 </div>
                 <div className="modal-body">
                    {/* 1. CUSTOMER SEARCH */}
                    <div className="row g-2 mb-4">
                        <div className="col-md-6 position-relative">
                            <label className="form-label small fw-bold">Customer Name</label>
                            <input 
                                className="form-control" 
                                value={customer.customer_name} 
                                onChange={e => handleCustomerSearch(e.target.value)} 
                                placeholder="Start typing to search..."
                            />
                            {showSearch && searchResults.length > 0 && (
                                <ul className="list-group position-absolute w-100 shadow" style={{zIndex:1000}}>
                                    {searchResults.map(res => (
                                        <li key={res.id} className="list-group-item list-group-item-action cursor-pointer" onClick={() => selectCustomer(res)}>
                                            {res.name} ({res.phone})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-bold">Mobile</label>
                            <input className="form-control" value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} />
                        </div>
                    </div>

                    <hr className="text-muted"/>

                    {/* 2. ADD ITEM FORM */}
                    <div className="bg-light p-3 rounded mb-3 border">
                        <h6 className="fw-bold text-muted mb-3">Add Item Details</h6>
                        <div className="row g-2 mb-2">
                            <div className="col-md-4">
                                <label className="small fw-bold">Item Name</label>
                                <input className="form-control form-control-sm" value={currentItem.item_name} onChange={e => setCurrentItem({...currentItem, item_name: e.target.value})} />
                            </div>
                            <div className="col-md-2">
                                <label className="small fw-bold">Type</label>
                                <select className="form-select form-select-sm" value={currentItem.metal_type} onChange={e => setCurrentItem({...currentItem, metal_type: e.target.value})}>
                                    <option>GOLD</option><option>SILVER</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="small fw-bold">Gross Wt</label>
                                <input type="number" className="form-control form-control-sm" value={currentItem.gross_weight} onChange={e => handleGrossChange(e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className="small fw-bold">Rate/g</label>
                                <input type="number" className="form-control form-control-sm" value={currentItem.rate} onChange={e => handleRateChange(e.target.value)} />
                            </div>
                        </div>
                        <div className="row g-2 align-items-end">
                            <div className="col-md-2">
                                <label className="small fw-bold">Less %</label>
                                <input type="number" className="form-control form-control-sm" value={currentItem.less_percent} onChange={e => handlePercentChange(e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className="small fw-bold">Less Wt</label>
                                <input type="number" className="form-control form-control-sm" value={currentItem.less_weight} onChange={e => handleWeightChange(e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className="small fw-bold">Net Wt</label>
                                <input className="form-control form-control-sm bg-white fw-bold" readOnly value={currentItem.net_weight} />
                            </div>
                            <div className="col-md-2">
                                <label className="small fw-bold">Value</label>
                                <input className="form-control form-control-sm bg-white fw-bold text-danger" readOnly value={currentItem.amount} />
                            </div>
                            <div className="col-md-2">
                                <button className="btn btn-sm btn-dark w-100 fw-bold" onClick={addItem}>ADD +</button>
                            </div>
                        </div>
                    </div>

                    {/* 3. ITEMS LIST */}
                    {items.length > 0 && (
                        <div className="table-responsive mb-3 border rounded">
                            <table className="table table-sm table-striped mb-0 small">
                                <thead className="table-light">
                                    <tr>
                                        <th>Item</th>
                                        <th>Type</th>
                                        <th>Gross</th>
                                        <th>Less</th>
                                        <th>Net</th>
                                        <th>Rate</th>
                                        <th className="text-end">Amount</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={idx}>
                                            <td>{it.item_name}</td>
                                            <td>{it.metal_type}</td>
                                            <td>{it.gross_weight}</td>
                                            <td>{it.less_weight} <span className="text-muted">({it.less_percent}%)</span></td>
                                            <td className="fw-bold">{it.net_weight}</td>
                                            <td>{it.rate}</td>
                                            <td className="text-end fw-bold">{it.amount}</td>
                                            <td className="text-end"><button className="btn btn-link text-danger p-0" onClick={() => removeItem(idx)}><i className="bi bi-x-circle"></i></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 4. TOTALS & GST */}
                    <div className="bg-light p-3 rounded">
                        <div className="d-flex justify-content-between mb-2">
                            <span className="fw-bold">Sub Total:</span>
                            <span className="fw-bold">₹{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" id="gstCheck" checked={deductGst} onChange={e => setDeductGst(e.target.checked)} />
                                <label className="form-check-label small fw-bold" htmlFor="gstCheck">Deduct GST?</label>
                            </div>
                            {deductGst && (
                                <div className="input-group input-group-sm w-25">
                                    <span className="input-group-text">Rate %</span>
                                    <input type="number" className="form-control" value={gstPercent} onChange={e => setGstPercent(e.target.value)} />
                                </div>
                            )}
                            <span className={`fw-bold ${deductGst ? 'text-danger' : 'text-muted'}`}>- ₹{gstAmount.toLocaleString()}</span>
                        </div>
                        <div className="d-flex justify-content-between border-top pt-2">
                            <h5 className="fw-bold text-success">NET PAYOUT:</h5>
                            <h4 className="fw-bold text-success">₹{netPayout.toLocaleString()}</h4>
                        </div>
                    </div>
                 </div>
                 <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-warning fw-bold px-4" onClick={handleFinalSave}>CONFIRM PURCHASE</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {showPrintModal && printData && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h5 className="modal-title text-dark">Print Receipt</h5>
                          <button className="btn-close" onClick={() => setShowPrintModal(false)}></button>
                      </div>
                      <div className="modal-body bg-secondary">
                          <div className="mx-auto bg-white shadow-sm" style={{width: '100%', maxWidth: '400px'}}>
                              <OldMetalReceipt ref={receiptRef} data={printData} />
                          </div>
                      </div>
                      <div className="modal-footer">
                          <button className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>Close</button>
                          <button className="btn btn-primary fw-bold" onClick={handlePrint}><i className="bi bi-printer me-2"></i>PRINT</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default OldMetalPage;