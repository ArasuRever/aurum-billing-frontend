import React, { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { api } from '../api';
import OldMetalReceipt from '../components/OldMetalReceipt';

function OldMetalPage() {
  const [stats, setStats] = useState({ 
      gold_purchase_gross: 0, gold_purchase_net: 0, 
      gold_exchange_gross: 0, gold_exchange_net: 0, 
      gold_total_gross: 0, gold_total_net: 0, 
      silver_purchase_gross: 0, silver_purchase_net: 0, 
      silver_exchange_gross: 0, silver_exchange_net: 0, 
      silver_total_gross: 0, silver_total_net: 0 
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessProfile, setBusinessProfile] = useState(null); // ADDED: For shop details

  // --- FORM STATE ---
  const [showModal, setShowModal] = useState(false);
  const [customer, setCustomer] = useState({ customer_name: '', mobile: '' });
  
  const [items, setItems] = useState([
      { item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }
  ]);
  const [historyStack, setHistoryStack] = useState([]);
  const [futureStack, setFutureStack] = useState([]);

  // --- GST & PAYMENT STATE ---
  const [deductGst, setDeductGst] = useState(false); 
  const [paymentMode, setPaymentMode] = useState('cash'); 
  const [cashPaid, setCashPaid] = useState(0);
  const [onlinePaid, setOnlinePaid] = useState(0);
  const [grossOverride, setGrossOverride] = useState(''); 

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
        // UPDATED: Now also fetching business settings
        const [s, h, b] = await Promise.all([
            api.getOldMetalStats(), 
            api.getOldMetalList(),
            api.getBusinessSettings() 
        ]);
        if(s.data) setStats(s.data);
        if(Array.isArray(h.data)) setHistory(h.data);
        if(b.data) setBusinessProfile(b.data);
    } catch (err) { console.error("Error loading data:", err); } finally { setLoading(false); }
  };

  // --- UNDO / REDO / ROW LOGIC ---
  const saveToHistory = (currentItems) => { setHistoryStack([...historyStack, JSON.parse(JSON.stringify(currentItems))]); setFutureStack([]); };
  const handleUndo = () => { if (historyStack.length === 0) return; const previous = historyStack[historyStack.length - 1]; const newHistory = historyStack.slice(0, -1); setFutureStack([items, ...futureStack]); setItems(previous); setHistoryStack(newHistory); };
  const handleRedo = () => { if (futureStack.length === 0) return; const next = futureStack[0]; const newFuture = futureStack.slice(1); setHistoryStack([...historyStack, items]); setItems(next); setFutureStack(newFuture); };

  const updateRow = (index, field, value) => {
    saveToHistory(items);
    const newItems = [...items];
    let row = { ...newItems[index], [field]: value };
    const gw = parseFloat(row.gross_weight) || 0;
    const rate = parseFloat(row.rate) || 0;
    let lp = parseFloat(row.less_percent) || 0;
    let lw = parseFloat(row.less_weight) || 0;
    
    if (field === 'gross_weight') { lw = (gw * lp) / 100; row.less_weight = lw.toFixed(3); } 
    else if (field === 'less_percent') { const newPercent = parseFloat(value) || 0; lw = (gw * newPercent) / 100; row.less_weight = lw.toFixed(3); } 
    else if (field === 'less_weight') { const newLessWt = parseFloat(value) || 0; lw = newLessWt; if (gw > 0) row.less_percent = ((newLessWt / gw) * 100).toFixed(2); else row.less_percent = 0; }
    
    const nw = Math.max(0, gw - lw);
    row.net_weight = nw.toFixed(3);
    row.amount = Math.round(nw * rate);
    newItems[index] = row;
    setItems(newItems);
  };

  const addNewRow = () => { saveToHistory(items); setItems([...items, { item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }]); };
  const removeRow = (index) => { saveToHistory(items); if(items.length === 1) { setItems([{ item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }]); } else { setItems(items.filter((_, i) => i !== index)); } };

  const calculatedSubTotal = items.reduce((sum, it) => sum + parseFloat(it.amount || 0), 0);
  const effectiveGross = grossOverride !== '' ? parseFloat(grossOverride) : calculatedSubTotal;
  const gstAmount = deductGst ? Math.round(effectiveGross * 0.03) : 0;
  const netPayout = effectiveGross - gstAmount;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  useEffect(() => {
    if (paymentMode === 'cash') { setCashPaid(netPayout); setOnlinePaid(0); } 
    else if (paymentMode === 'online') { setCashPaid(0); setOnlinePaid(netPayout); } 
    else if (paymentMode === 'combined') {
       const currentTotal = (parseFloat(cashPaid) || 0) + (parseFloat(onlinePaid) || 0);
       if (Math.abs(currentTotal - netPayout) > 1) { setCashPaid(netPayout); setOnlinePaid(0); }
    }
  }, [netPayout, paymentMode]);

  const handleCashChange = (val) => { 
      const cash = parseFloat(val) || 0; setCashPaid(cash); 
      if (paymentMode === 'combined') { const remaining = netPayout - cash; setOnlinePaid(remaining > 0 ? remaining : 0); } 
  };
  
  const handleOnlineChange = (val) => { 
      const online = parseFloat(val) || 0; setOnlinePaid(online); 
      if (paymentMode === 'combined') { const remaining = netPayout - online; setCashPaid(remaining > 0 ? remaining : 0); } 
  };
  
  const handleCustomerSearch = async (val) => {
      setCustomer(prev => ({ ...prev, customer_name: val }));
      if(val.length > 2) {
          try { const res = await api.searchCustomer(val); setSearchResults(res.data); setShowSearch(true); } catch(err) { console.error(err); }
      } else { setShowSearch(false); }
  };
  const selectCustomer = (c) => { setCustomer({ customer_name: c.name, mobile: c.phone }); setShowSearch(false); };

  const handleEditHistory = (row) => {
    setCustomer({ customer_name: row.customer_name, mobile: row.mobile });
    setItems([{ item_name: row.item_name, metal_type: row.metal_type, gross_weight: row.gross_weight || 0, less_weight: 0, net_weight: row.net_weight, rate: row.net_weight > 0 ? (row.amount / row.net_weight).toFixed(2) : 0, amount: row.amount }]);
    setGrossOverride(''); 
    setShowModal(true);
  };

  const handleDeleteHistory = async (id) => {
     if(window.confirm("Are you sure you want to delete this record?")) {
        try { await api.deleteOldMetal(id); setHistory(history.filter(h => h.id !== id)); loadData(); } catch (error) { alert("Failed to delete: " + (error.response?.data?.message || error.message)); }
     }
  };

  const handleFinalSave = async () => {
      const hasValidItem = items.some(i => i.item_name && i.gross_weight && i.rate);
      if(!hasValidItem) return alert("Please enter at least one valid Item.");
      try {
          if (customer.mobile && customer.mobile.length >= 10) {
              try { await api.addCustomer({ name: customer.customer_name, phone: customer.mobile, address: 'Walk-in (Old Metal)', place: 'Local' }); } catch (ignore) {}
          }
          const validItems = items.filter(i => i.item_name && i.gross_weight);
          const payload = { 
              customer_name: customer.customer_name || 'Walk-in Customer', 
              mobile: customer.mobile, 
              items: validItems, 
              total_amount: effectiveGross, 
              gst_deducted: gstAmount, 
              calculated_payout: netPayout, 
              net_payout: netPayout, 
              payment_mode: paymentMode, 
              cash_paid: cashPaid, 
              online_paid: onlinePaid 
          };
          const res = await api.addOldMetalPurchase(payload);
          if (res && res.data) {
              setPrintData({ customer: { ...customer }, items: JSON.parse(JSON.stringify(validItems)), totals: { totalAmount: effectiveGross, gstAmount, netPayout, cgst, sgst }, voucherNo: res.data.voucher_no || 'NA' });
              setShowModal(false); setShowPrintModal(true); loadData(); 
              setCustomer({ customer_name: '', mobile: '' }); 
              setItems([{ item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: 0, less_weight: 0, net_weight: 0, rate: '', amount: 0 }]); 
              setHistoryStack([]); setFutureStack([]); setDeductGst(false); setPaymentMode('cash'); setGrossOverride('');
          } else { alert("Saved, but server returned no confirmation data."); setShowModal(false); loadData(); }
      } catch(err) { console.error(err); alert("Failed to save: " + (err.response?.data?.message || err.message)); }
  };

  const handlePrint = useReactToPrint({ content: () => receiptRef.current, onAfterPrint: () => setShowPrintModal(false) });
  // Indian Currency Format
  const formatCurrency = (val) => { const num = parseFloat(val); return isNaN(num) ? "0.00" : num.toLocaleString('en-IN', { minimumFractionDigits: 2 }); };

  const goldHistory = history.filter(h => h.metal_type === 'GOLD');
  const silverHistory = history.filter(h => h.metal_type === 'SILVER');

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-secondary"><i className="bi bi-recycle me-2"></i>Old Metal / Scrap Stock</h2>
        <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={loadData}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
            <button className="btn btn-warning fw-bold shadow-sm" onClick={() => setShowModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>Buy Old Metal
            </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="row g-3 mb-4">
          <div className="col-md-6">
              <div className="card border-warning shadow-sm h-100">
                  <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                         <div className="text-warning small fw-bold">TOTAL OLD GOLD</div>
                         <div className="text-end">
                            <div className="fw-bold fs-5">{parseFloat(stats.gold_total_gross || 0).toFixed(3)} g <span className="small text-muted">Gross</span></div>
                            <div className="fw-bold fs-5 text-success">{parseFloat(stats.gold_total_net || 0).toFixed(3)} g <span className="small text-muted">Net</span></div>
                         </div>
                      </div>
                      <hr className="my-2"/>
                      <div className="row g-1 small text-muted">
                          <div className="col-6 border-end pe-2">
                              <div className="d-flex justify-content-between"><span>Buy Gross:</span><span className="fw-bold">{parseFloat(stats.gold_purchase_gross).toFixed(3)}</span></div>
                              <div className="d-flex justify-content-between"><span>Buy Net:</span><span className="fw-bold text-success">{parseFloat(stats.gold_purchase_net).toFixed(3)}</span></div>
                          </div>
                          <div className="col-6 ps-2">
                              <div className="d-flex justify-content-between"><span>Exch Gross:</span><span className="fw-bold">{parseFloat(stats.gold_exchange_gross).toFixed(3)}</span></div>
                              <div className="d-flex justify-content-between"><span>Exch Net:</span><span className="fw-bold text-success">{parseFloat(stats.gold_exchange_net).toFixed(3)}</span></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <div className="col-md-6">
              <div className="card border-secondary shadow-sm h-100">
                  <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                         <div className="text-secondary small fw-bold">TOTAL OLD SILVER</div>
                         <div className="text-end">
                            <div className="fw-bold fs-5">{parseFloat(stats.silver_total_gross || 0).toFixed(3)} g <span className="small text-muted">Gross</span></div>
                            <div className="fw-bold fs-5 text-success">{parseFloat(stats.silver_total_net || 0).toFixed(3)} g <span className="small text-muted">Net</span></div>
                         </div>
                      </div>
                      <hr className="my-2"/>
                      <div className="row g-1 small text-muted">
                          <div className="col-6 border-end pe-2">
                              <div className="d-flex justify-content-between"><span>Buy Gross:</span><span className="fw-bold">{parseFloat(stats.silver_purchase_gross).toFixed(3)}</span></div>
                              <div className="d-flex justify-content-between"><span>Buy Net:</span><span className="fw-bold text-success">{parseFloat(stats.silver_purchase_net).toFixed(3)}</span></div>
                          </div>
                          <div className="col-6 ps-2">
                              <div className="d-flex justify-content-between"><span>Exch Gross:</span><span className="fw-bold">{parseFloat(stats.silver_exchange_gross).toFixed(3)}</span></div>
                              <div className="d-flex justify-content-between"><span>Exch Net:</span><span className="fw-bold text-success">{parseFloat(stats.silver_exchange_net).toFixed(3)}</span></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="row g-3 mb-5">
          {/* GOLD HISTORY TABLE */}
          <div className="col-md-6">
              <h5 className="fw-bold text-warning mb-2"><i className="bi bi-circle-fill me-2"></i>Gold Scrap History</h5>
              <div className="card shadow-sm border-0 h-100">
                  <div className="table-responsive" style={{maxHeight: '600px'}}>
                      <table className="table table-hover align-middle mb-0">
                          <thead className="table-light sticky-top"><tr><th>Date</th><th>Customer</th><th>Item</th><th>Net Wt</th><th className="text-end">Value</th><th className="text-center">Act</th></tr></thead>
                          <tbody>
                              {loading ? <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr> : 
                               goldHistory.length === 0 ? <tr><td colSpan="6" className="text-center py-4 text-muted">No Gold Records</td></tr> :
                               goldHistory.map((row, i) => (
                                  <tr key={i}>
                                      {/* Indian Date Format */}
                                      <td className="small text-muted">{new Date(row.date).toLocaleDateString('en-IN')}</td>
                                      <td><div className="fw-bold small">{row.customer_name}</div><div className="small text-muted" style={{fontSize:'0.75rem'}}>{row.voucher_no}</div></td>
                                      <td className="small">{row.item_name}</td>
                                      <td className="fw-bold small">{parseFloat(row.net_weight).toFixed(3)}g</td>
                                      <td className="text-end fw-bold small">
                                          {row.payment_mode === 'EXCHANGE' ? (
                                              <span className="text-warning">₹{formatCurrency(row.amount)} (Ex)</span>
                                          ) : (
                                              <span className="text-danger">- ₹{formatCurrency(row.amount)}</span>
                                          )}
                                      </td>
                                      <td className="text-center">
                                          {row.status === 'AVAILABLE' ? (
                                              <div className="btn-group">
                                                <button className="btn btn-sm btn-link text-primary p-0 me-2" onClick={() => handleEditHistory(row)}><i className="bi bi-pencil"></i></button>
                                                <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteHistory(row.id)}><i className="bi bi-trash"></i></button>
                                              </div>
                                          ) : (
                                              <span className="badge bg-secondary opacity-75" style={{fontSize:'0.6rem'}}>SENT</span>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* SILVER HISTORY TABLE */}
          <div className="col-md-6">
              <h5 className="fw-bold text-secondary mb-2"><i className="bi bi-circle-fill me-2"></i>Silver Scrap History</h5>
              <div className="card shadow-sm border-0 h-100">
                  <div className="table-responsive" style={{maxHeight: '600px'}}>
                      <table className="table table-hover align-middle mb-0">
                          <thead className="table-light sticky-top"><tr><th>Date</th><th>Customer</th><th>Item</th><th>Net Wt</th><th className="text-end">Value</th><th className="text-center">Act</th></tr></thead>
                          <tbody>
                              {loading ? <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr> : 
                               silverHistory.length === 0 ? <tr><td colSpan="6" className="text-center py-4 text-muted">No Silver Records</td></tr> :
                               silverHistory.map((row, i) => (
                                  <tr key={i}>
                                      <td className="small text-muted">{new Date(row.date).toLocaleDateString('en-IN')}</td>
                                      <td><div className="fw-bold small">{row.customer_name}</div><div className="small text-muted" style={{fontSize:'0.75rem'}}>{row.voucher_no}</div></td>
                                      <td className="small">{row.item_name}</td>
                                      <td className="fw-bold small">{parseFloat(row.net_weight).toFixed(3)}g</td>
                                      <td className="text-end fw-bold small">
                                          {row.payment_mode === 'EXCHANGE' ? (
                                              <span className="text-warning">₹{formatCurrency(row.amount)} (Ex)</span>
                                          ) : (
                                              <span className="text-danger">- ₹{formatCurrency(row.amount)}</span>
                                          )}
                                      </td>
                                      <td className="text-center">
                                          {row.status === 'AVAILABLE' ? (
                                              <div className="btn-group">
                                                <button className="btn btn-sm btn-link text-primary p-0 me-2" onClick={() => handleEditHistory(row)}><i className="bi bi-pencil"></i></button>
                                                <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteHistory(row.id)}><i className="bi bi-trash"></i></button>
                                              </div>
                                          ) : (
                                              <span className="badge bg-secondary opacity-75" style={{fontSize:'0.6rem'}}>SENT</span>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>
      
      {showModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'auto'}}>
           <div className="modal-dialog modal-xl"> 
              <div className="modal-content">
                 <div className="modal-header bg-warning">
                    <div className="d-flex gap-2">
                        <h5 className="modal-title fw-bold">New Old Metal Purchase</h5>
                        <button className="btn btn-sm btn-outline-dark" onClick={handleUndo} title="Undo (Ctrl+Z)"><i className="bi bi-arrow-counterclockwise"></i></button>
                        <button className="btn btn-sm btn-outline-dark" onClick={handleRedo} title="Redo (Ctrl+Y)"><i className="bi bi-arrow-clockwise"></i></button>
                    </div>
                    <button className="btn-close" onClick={() => setShowModal(false)}></button>
                 </div>
                 <div className="modal-body p-4">
                    {/* CUSTOMER INFO */}
                    <div className="row g-2 mb-4">
                        <div className="col-md-6 position-relative">
                            <label className="form-label small fw-bold">Customer Name</label>
                            <input className="form-control" value={customer.customer_name} onChange={e => handleCustomerSearch(e.target.value)} onBlur={() => setTimeout(() => setShowSearch(false), 200)} placeholder="Walk-in Customer" autoFocus />
                            {showSearch && searchResults.length > 0 && <ul className="list-group position-absolute w-100 shadow" style={{zIndex:1000}}>{searchResults.map(res => <li key={res.id} className="list-group-item list-group-item-action cursor-pointer" onClick={() => selectCustomer(res)}>{res.name} ({res.phone})</li>)}</ul>}
                        </div>
                        <div className="col-md-6"><label className="form-label small fw-bold">Mobile</label><input className="form-control" value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} /></div>
                    </div>
                    <hr className="text-muted"/>

                    {/* ITEMS TABLE */}
                    <div className="table-responsive mb-3 border rounded">
                        <table className="table table-bordered align-middle mb-0 small">
                            <thead className="table-light"><tr><th style={{width: '20%'}}>Item Name</th><th style={{width: '10%'}}>Type</th><th style={{width: '10%'}}>Gross Wt</th><th style={{width: '8%'}}>Less %</th><th style={{width: '10%'}}>Less Wt</th><th style={{width: '10%'}}>Net Wt</th><th style={{width: '12%'}}>Rate/g</th><th style={{width: '15%'}}>Value</th><th style={{width: '5%'}}></th></tr></thead>
                            <tbody>
                                {items.map((row, idx) => (
                                    <tr key={idx}>
                                        <td><input className="form-control form-control-sm border-0" value={row.item_name} placeholder="Item Desc" onChange={e => updateRow(idx, 'item_name', e.target.value)} /></td>
                                        <td><select className="form-select form-select-sm border-0" value={row.metal_type} onChange={e => updateRow(idx, 'metal_type', e.target.value)}><option>GOLD</option><option>SILVER</option></select></td>
                                        <td><input type="number" className="form-control form-control-sm border-0" value={row.gross_weight} placeholder="0.000" onChange={e => updateRow(idx, 'gross_weight', e.target.value)} /></td>
                                        <td><input type="number" className="form-control form-control-sm border-0" value={row.less_percent} placeholder="0" onChange={e => updateRow(idx, 'less_percent', e.target.value)} /></td>
                                        <td><input type="number" className="form-control form-control-sm border-0 text-danger" value={row.less_weight} placeholder="0.000" onChange={e => updateRow(idx, 'less_weight', e.target.value)} /></td>
                                        <td className="bg-light fw-bold text-center">{row.net_weight}</td>
                                        <td><input type="number" className="form-control form-control-sm border-0" value={row.rate} placeholder="Rate" onChange={e => updateRow(idx, 'rate', e.target.value)} /></td>
                                        <td className="bg-light fw-bold text-end text-danger px-2">{row.amount}</td>
                                        <td className="text-center"><button className="btn btn-link text-danger p-0" onClick={() => removeRow(idx)}><i className="bi bi-trash"></i></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mb-4"><button className="btn btn-outline-dark btn-sm fw-bold" onClick={addNewRow}><i className="bi bi-plus-lg me-1"></i> Add Another Item</button></div>
                    
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="card h-100 bg-light border-0">
                                <div className="card-body">
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-secondary">Agreed Gross Amount</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-secondary text-white">₹</span>
                                            <input type="number" className="form-control fw-bold fs-5" placeholder={calculatedSubTotal} value={grossOverride} onChange={e => setGrossOverride(e.target.value)}/>
                                        </div>
                                    </div>
                                    
                                    <div className="btn-group w-100 mb-3">
                                        <input type="radio" className="btn-check" name="pmode" id="pmCash" checked={paymentMode==='cash'} onChange={()=>setPaymentMode('cash')} />
                                        <label className="btn btn-outline-secondary" htmlFor="pmCash">Cash Only</label>

                                        <input type="radio" className="btn-check" name="pmode" id="pmOnline" checked={paymentMode==='online'} onChange={()=>setPaymentMode('online')} />
                                        <label className="btn btn-outline-secondary" htmlFor="pmOnline">Online Only</label>

                                        <input type="radio" className="btn-check" name="pmode" id="pmSplit" checked={paymentMode==='combined'} onChange={()=>setPaymentMode('combined')} />
                                        <label className="btn btn-outline-secondary" htmlFor="pmSplit">Combined</label>
                                    </div>

                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="small text-muted fw-bold">Cash Paid</label>
                                            <input type="number" className="form-control" value={cashPaid} onChange={e => handleCashChange(e.target.value)} disabled={paymentMode === 'online'} />
                                        </div>
                                        <div className="col-6">
                                            <label className="small text-muted fw-bold">Online Paid</label>
                                            <input type="number" className="form-control" value={onlinePaid} onChange={e => handleOnlineChange(e.target.value)} disabled={paymentMode === 'cash'} />
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
                                    <span className="text-muted small">Agreed Gross:</span>
                                    <span className="fw-bold">₹{effectiveGross.toLocaleString()}</span>
                                </div>
                                {deductGst && (
                                    <div className="d-flex justify-content-between mb-1 text-danger small">
                                        <span>GST (3%):</span>
                                        <span>- ₹{gstAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="d-flex justify-content-between pt-1 border-top border-dark mt-3">
                                    <h4 className="fw-bold text-success">NET PAYOUT:</h4>
                                    <h3 className="fw-bold text-success">₹{netPayout.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
                 <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-warning fw-bold px-4" onClick={handleFinalSave}>CONFIRM PURCHASE</button></div>
              </div>
           </div>
        </div>
      )}

      {showPrintModal && printData && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header"><h5 className="modal-title">Print Receipt</h5><button className="btn-close" onClick={() => setShowPrintModal(false)}></button></div>
                      <div className="modal-body bg-secondary">
                        <div className="mx-auto bg-white shadow-sm" style={{width: '100%', maxWidth: '400px'}}>
                            {/* UPDATED: Passing businessProfile here */}
                            <OldMetalReceipt ref={receiptRef} data={printData} businessProfile={businessProfile} />
                        </div>
                      </div>
                      <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>Close</button><button className="btn btn-primary fw-bold" onClick={handlePrint}><i className="bi bi-printer me-2"></i>PRINT</button></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default OldMetalPage;