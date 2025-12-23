import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { api } from '../api';
import OldMetalReceipt from '../components/OldMetalReceipt';

function OldMetalPage() {
  const [stats, setStats] = useState({ gold_weight: 0, gold_cost: 0, silver_weight: 0, silver_cost: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FORM STATE ---
  const [showModal, setShowModal] = useState(false);
  const [customer, setCustomer] = useState({ customer_name: '', mobile: '' });
  
  // ITEMS STATE with UNDO/REDO
  const [items, setItems] = useState([
      { item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }
  ]);
  const [historyStack, setHistoryStack] = useState([]);
  const [futureStack, setFutureStack] = useState([]);

  // --- GST & PAYMENT STATE ---
  const [deductGst, setDeductGst] = useState(false); 
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash', 'online', 'combined'
  const [cashPaid, setCashPaid] = useState(0);
  const [onlinePaid, setOnlinePaid] = useState(0);

  // Search & Print State
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
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
    } catch (err) { console.error("Error loading data:", err); } finally { setLoading(false); }
  };

  // --- UNDO / REDO LOGIC ---
  const saveToHistory = (currentItems) => {
    setHistoryStack([...historyStack, JSON.parse(JSON.stringify(currentItems))]);
    setFutureStack([]); 
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    const newHistory = historyStack.slice(0, -1);
    setFutureStack([items, ...futureStack]); 
    setItems(previous);
    setHistoryStack(newHistory);
  };

  const handleRedo = () => {
    if (futureStack.length === 0) return;
    const next = futureStack[0];
    const newFuture = futureStack.slice(1);
    setHistoryStack([...historyStack, items]); 
    setItems(next);
    setFutureStack(newFuture);
  };

  // --- ROW MANAGEMENT ---
  const updateRow = (index, field, value) => {
    saveToHistory(items);
    
    const newItems = [...items];
    let row = { ...newItems[index], [field]: value };

    const gw = parseFloat(row.gross_weight) || 0;
    const rate = parseFloat(row.rate) || 0;
    let lp = parseFloat(row.less_percent) || 0;
    let lw = parseFloat(row.less_weight) || 0;

    // Smart Calculation Logic
    if (field === 'gross_weight') {
        lw = (gw * lp) / 100;
        row.less_weight = lw.toFixed(3);
    } 
    else if (field === 'less_percent') {
        const newPercent = parseFloat(value) || 0;
        lw = (gw * newPercent) / 100;
        row.less_weight = lw.toFixed(3);
    } 
    else if (field === 'less_weight') {
        const newLessWt = parseFloat(value) || 0;
        lw = newLessWt;
        if (gw > 0) row.less_percent = ((newLessWt / gw) * 100).toFixed(2);
        else row.less_percent = 0;
    }

    const nw = Math.max(0, gw - lw);
    row.net_weight = nw.toFixed(3);
    row.amount = Math.round(nw * rate);

    newItems[index] = row;
    setItems(newItems);
  };

  const addNewRow = () => {
    saveToHistory(items);
    setItems([...items, { item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }]);
  };

  const removeRow = (index) => {
    saveToHistory(items);
    if(items.length === 1) {
        setItems([{ item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }]);
    } else {
        setItems(items.filter((_, i) => i !== index));
    }
  };

  // --- TOTALS & GST LOGIC (FORWARD) ---
  const subTotal = items.reduce((sum, it) => sum + parseFloat(it.amount || 0), 0);
  
  let taxableValue = 0;
  let gstAmount = 0;
  let netPayout = 0;

  if (deductGst) {
    taxableValue = subTotal;
    gstAmount = Math.round(taxableValue * 0.03);
    netPayout = taxableValue - gstAmount;
  } else {
    taxableValue = subTotal;
    gstAmount = 0;
    netPayout = subTotal;
  }
  
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  // --- SMART PAYMENT LOGIC (2-WAY SYNC) ---
  useEffect(() => {
    if (paymentMode === 'cash') {
      setCashPaid(netPayout);
      setOnlinePaid(0);
    } else if (paymentMode === 'online') {
      setCashPaid(0);
      setOnlinePaid(netPayout);
    } else if (paymentMode === 'combined') {
       const currentTotal = (parseFloat(cashPaid) || 0) + (parseFloat(onlinePaid) || 0);
       // Only update if total doesn't match (prevents infinite loop while typing)
       if (Math.abs(currentTotal - netPayout) > 1) {
           setCashPaid(netPayout);
           setOnlinePaid(0);
       }
    }
  }, [netPayout, paymentMode]);

  const handleCashChange = (val) => {
    const cash = parseFloat(val) || 0;
    setCashPaid(cash);
    if (paymentMode === 'combined') {
      const remaining = netPayout - cash;
      setOnlinePaid(remaining > 0 ? remaining : 0);
    }
  };

  const handleOnlineChange = (val) => {
    const online = parseFloat(val) || 0;
    setOnlinePaid(online);
    if (paymentMode === 'combined') {
      const remaining = netPayout - online;
      setCashPaid(remaining > 0 ? remaining : 0);
    }
  };

  // --- CUSTOMER SEARCH ---
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

  // --- HISTORY ACTIONS ---
  const handleEditHistory = (row) => {
    setCustomer({ customer_name: row.customer_name, mobile: row.mobile });
    setItems([{ 
       item_name: row.item_name, 
       metal_type: row.metal_type, 
       gross_weight: row.gross_weight || 0,
       less_weight: 0, 
       net_weight: row.net_weight, 
       rate: row.net_weight > 0 ? (row.amount / row.net_weight).toFixed(2) : 0, 
       amount: row.amount 
    }]);
    setShowModal(true);
  };

  const handleDeleteHistory = async (id) => {
     if(window.confirm("Are you sure you want to delete this record?")) {
        try {
            await api.deleteOldMetal(id); 
            // Update UI locally only after success
            setHistory(history.filter(h => h.id !== id));
            loadData();
        } catch (error) {
            alert("Failed to delete: " + error.message);
        }
     }
  };

  // --- SAVE HANDLER (With Auto-Add Customer) ---
  const handleFinalSave = async () => {
      const hasValidItem = items.some(i => i.item_name && i.gross_weight && i.rate);
      if(!hasValidItem) return alert("Please enter at least one valid Item.");
      
      try {
          // --- NEW: Auto-Register Customer ---
          if (customer.mobile && customer.mobile.length >= 10) {
              try {
                  // Attempt to add customer to main DB. 
                  // If they exist, this might fail or return existing, which we ignore.
                  await api.addCustomer({
                      name: customer.customer_name,
                      phone: customer.mobile,
                      address: 'Walk-in (Old Metal)',
                      place: 'Local'
                  });
              } catch (ignore) {
                  // Ignore errors (e.g., duplicate phone number)
              }
          }
          // -----------------------------------

          const validItems = items.filter(i => i.item_name && i.gross_weight);

          const payload = {
              customer_name: customer.customer_name || 'Walk-in Customer',
              mobile: customer.mobile,
              items: validItems,
              total_amount: subTotal,
              gst_deducted: gstAmount,
              net_payout: netPayout,
              payment_mode: paymentMode,
              cash_paid: cashPaid,
              online_paid: onlinePaid
          };
          
          const res = await api.addOldMetalPurchase(payload);
          
          if (res && res.data) {
              setPrintData({
                  customer: { ...customer }, 
                  items: JSON.parse(JSON.stringify(validItems)), 
                  totals: { 
                      totalAmount: subTotal, 
                      gstAmount, 
                      netPayout, 
                      cgst, 
                      sgst 
                  },
                  voucherNo: res.data.voucher_no || 'NA'
              });
              
              setShowModal(false);
              setShowPrintModal(true);
              loadData();

              // Reset Form
              setCustomer({ customer_name: '', mobile: '' });
              setItems([{ item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }]);
              setHistoryStack([]); setFutureStack([]); 
              setDeductGst(false);
              setPaymentMode('cash');
          } else {
              alert("Saved, but server returned no confirmation data.");
              setShowModal(false);
              loadData();
          }

      } catch(err) { 
          console.error(err);
          alert("Failed to save: " + (err.response?.data?.message || err.message)); 
      }
  };

  const handlePrint = useReactToPrint({
      content: () => receiptRef.current,
      onAfterPrint: () => setShowPrintModal(false)
  });

  const formatCurrency = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? "0.00" : num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  return (
    <div className="container-fluid pb-5">
      {/* HEADER & STATS */}
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
                          <th>Customer</th>
                          <th>Item</th>
                          <th>Net Weight</th>
                          <th className="text-end">Amount Paid</th>
                          <th className="text-center">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {loading ? <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr> : 
                       history.map((row, i) => (
                          <tr key={i}>
                              <td className="small text-muted">{new Date(row.date).toLocaleDateString()}</td>
                              <td className="small font-monospace">{row.voucher_no || '-'}</td>
                              <td><div className="fw-bold">{row.customer_name}</div><div className="small text-muted">{row.mobile}</div></td>
                              <td>{row.item_name} <span className={`badge ms-1 ${row.metal_type==='GOLD'?'bg-warning text-dark':'bg-secondary'}`}>{row.metal_type}</span></td>
                              <td className="fw-bold">{parseFloat(row.net_weight).toFixed(3)}g</td>
                              <td className="text-end fw-bold text-danger">- ₹{formatCurrency(row.net_payout || row.amount)}</td>
                              <td className="text-center">
                                  <button className="btn btn-sm btn-link text-primary" onClick={() => handleEditHistory(row)}><i className="bi bi-pencil"></i></button>
                                  <button className="btn btn-sm btn-link text-danger" onClick={() => handleDeleteHistory(row.id)}><i className="bi bi-trash"></i></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* PURCHASE FORM MODAL */}
      {showModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'auto'}}>
           <div className="modal-dialog modal-xl"> 
              <div className="modal-content">
                 <div className="modal-header bg-warning">
                    <h5 className="modal-title fw-bold">New Old Metal Purchase</h5>
                    <div className="ms-auto me-3 d-flex gap-2">
                        <button className="btn btn-sm btn-light border" onClick={handleUndo} disabled={historyStack.length===0} title="Undo">
                            <i className="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button className="btn btn-sm btn-light border" onClick={handleRedo} disabled={futureStack.length===0} title="Redo">
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                    <button className="btn-close" onClick={() => setShowModal(false)}></button>
                 </div>
                 <div className="modal-body p-4">
                    {/* 1. CUSTOMER SEARCH */}
                    <div className="row g-2 mb-4">
                        <div className="col-md-6 position-relative">
                            <label className="form-label small fw-bold">Customer Name (Optional)</label>
                            <input 
                                className="form-control" 
                                value={customer.customer_name} 
                                onChange={e => handleCustomerSearch(e.target.value)}
                                // FIX: Hide search on blur with delay to allow clicking
                                onBlur={() => setTimeout(() => setShowSearch(false), 200)} 
                                placeholder="Walk-in Customer"
                                autoFocus
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
                            <label className="form-label small fw-bold">Mobile (Optional)</label>
                            <input className="form-control" value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} />
                        </div>
                    </div>

                    <hr className="text-muted"/>

                    {/* 2. ITEMS TABLE */}
                    <div className="table-responsive mb-3 border rounded">
                        <table className="table table-bordered align-middle mb-0 small">
                            <thead className="table-light">
                                <tr>
                                    <th style={{width: '20%'}}>Item Name</th>
                                    <th style={{width: '10%'}}>Type</th>
                                    <th style={{width: '10%'}}>Gross Wt</th>
                                    <th style={{width: '8%'}}>Less %</th>
                                    <th style={{width: '10%'}}>Less Wt</th>
                                    <th style={{width: '10%'}}>Net Wt</th>
                                    <th style={{width: '12%'}}>Rate/g</th>
                                    <th style={{width: '15%'}}>Value</th>
                                    <th style={{width: '5%'}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <input className="form-control form-control-sm border-0" 
                                                value={row.item_name} placeholder="Item Desc"
                                                onChange={e => updateRow(idx, 'item_name', e.target.value)} 
                                            />
                                        </td>
                                        <td>
                                            <select className="form-select form-select-sm border-0" 
                                                value={row.metal_type} 
                                                onChange={e => updateRow(idx, 'metal_type', e.target.value)}>
                                                <option>GOLD</option><option>SILVER</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" className="form-control form-control-sm border-0" 
                                                value={row.gross_weight} placeholder="0.000"
                                                onChange={e => updateRow(idx, 'gross_weight', e.target.value)} 
                                            />
                                        </td>
                                        <td>
                                            <input type="number" className="form-control form-control-sm border-0" 
                                                value={row.less_percent} placeholder="0"
                                                onChange={e => updateRow(idx, 'less_percent', e.target.value)} 
                                            />
                                        </td>
                                        <td>
                                            <input type="number" className="form-control form-control-sm border-0 text-danger" 
                                                value={row.less_weight} placeholder="0.000"
                                                onChange={e => updateRow(idx, 'less_weight', e.target.value)} 
                                            />
                                        </td>
                                        <td className="bg-light fw-bold text-center">
                                            {row.net_weight}
                                        </td>
                                        <td>
                                            <input type="number" className="form-control form-control-sm border-0" 
                                                value={row.rate} placeholder="Rate"
                                                onChange={e => updateRow(idx, 'rate', e.target.value)} 
                                            />
                                        </td>
                                        <td className="bg-light fw-bold text-end text-danger px-2">
                                            {row.amount}
                                        </td>
                                        <td className="text-center">
                                            <button className="btn btn-link text-danger p-0" onClick={() => removeRow(idx)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-4">
                        <button className="btn btn-outline-dark btn-sm fw-bold" onClick={addNewRow}>
                            <i className="bi bi-plus-lg me-1"></i> Add Another Item
                        </button>
                    </div>

                    {/* 3. PAYMENT & TOTALS FOOTER */}
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="card h-100 bg-light border-0">
                                <div className="card-header bg-transparent fw-bold small text-muted">PAYMENT MODE</div>
                                <div className="card-body">
                                    <div className="btn-group w-100 mb-3" role="group">
                                        <input type="radio" className="btn-check" name="pmode" id="pmCash" checked={paymentMode==='cash'} onChange={()=>setPaymentMode('cash')} />
                                        <label className="btn btn-outline-secondary" htmlFor="pmCash">Cash Only</label>

                                        <input type="radio" className="btn-check" name="pmode" id="pmOnline" checked={paymentMode==='online'} onChange={()=>setPaymentMode('online')} />
                                        <label className="btn btn-outline-secondary" htmlFor="pmOnline">Online Only</label>

                                        <input type="radio" className="btn-check" name="pmode" id="pmSplit" checked={paymentMode==='combined'} onChange={()=>setPaymentMode('combined')} />
                                        <label className="btn btn-outline-secondary" htmlFor="pmSplit">Combined</label>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="small fw-bold">Cash:</span>
                                        <div className="input-group input-group-sm w-50">
                                            <span className="input-group-text">₹</span>
                                            <input type="number" className="form-control text-end" 
                                                disabled={paymentMode === 'online'} 
                                                value={cashPaid}
                                                onChange={e => handleCashChange(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="small fw-bold">Online:</span>
                                        <div className="input-group input-group-sm w-50">
                                            <span className="input-group-text">₹</span>
                                            <input type="number" className="form-control text-end" 
                                                disabled={paymentMode === 'cash'} 
                                                value={onlinePaid}
                                                onChange={e => handleOnlineChange(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="bg-warning-subtle p-3 rounded border border-warning h-100">
                                <div className="d-flex justify-content-end mb-3">
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" id="gstSwitch" checked={deductGst} onChange={e => setDeductGst(e.target.checked)} />
                                        <label className="form-check-label fw-bold small" htmlFor="gstSwitch">Deduct GST (3%)</label>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted small">Gross Value:</span>
                                    <span className="fw-bold">₹{taxableValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                </div>

                                {deductGst && (
                                    <>
                                        <div className="d-flex justify-content-between mb-1 text-danger small">
                                            <span>SGST (1.5%):</span>
                                            <span>- ₹{sgst.toFixed(2)}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2 text-danger small border-bottom border-warning pb-2">
                                            <span>CGST (1.5%):</span>
                                            <span>- ₹{cgst.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}

                                <div className="d-flex justify-content-between pt-2">
                                    <h5 className="fw-bold text-dark">NET PAYOUT:</h5>
                                    <h3 className="fw-bold text-dark">₹{netPayout.toLocaleString()}</h3>
                                </div>
                            </div>
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