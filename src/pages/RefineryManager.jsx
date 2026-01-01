import React, { useEffect, useState } from 'react';
import { api } from '../api';

function RefineryManager() {
  const [loading, setLoading] = useState(false);
  const [activeMetal, setActiveMetal] = useState('GOLD'); // Global Metal Toggle
  
  // Data
  const [pendingScrap, setPendingScrap] = useState([]);
  const [refineryBatches, setRefineryBatches] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [shops, setShops] = useState([]);

  // Modals & Selection
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Forms
  const [sendForm, setSendForm] = useState({ 
      selectedIds: [], 
      manualWeight: '',
      batchName: '' 
  });
  
  const [receiveForm, setReceiveForm] = useState({ refined_weight: '', touch: '99.50', pure_weight: '' });
  const [useForm, setUseForm] = useState({ 
      item_name: '', use_weight: '', 
      transfer_to: 'INVENTORY',
      recipient_id: '' 
  });

  // Initial Load & Metal Change
  useEffect(() => { 
      loadData(); 
      api.getVendors().then(res => setVendors(res.data)).catch(console.error);
      api.getShops().then(res => setShops(res.data)).catch(console.error);
  }, [activeMetal]);

  const loadData = async () => {
    setLoading(true);
    try {
        const [scrapRes, batchRes] = await Promise.all([
            api.getPendingScrap(activeMetal),
            api.getRefineryBatches()
        ]);
        setPendingScrap(scrapRes.data);
        setRefineryBatches(batchRes.data.filter(b => b.metal_type === activeMetal));
        setSendForm(prev => ({ ...prev, selectedIds: [] })); 
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // --- Logic Helpers ---

  const handleSelectAll = (e) => {
      setSendForm(prev => ({ 
          ...prev, 
          selectedIds: e.target.checked ? pendingScrap.map(i => i.id) : [] 
      }));
  };

  const toggleSelect = (id) => {
      setSendForm(prev => {
          const ids = prev.selectedIds.includes(id) 
              ? prev.selectedIds.filter(i => i !== id)
              : [...prev.selectedIds, id];
          return { ...prev, selectedIds: ids };
      });
  };

  const calculateTotal = () => {
      const selected = pendingScrap.filter(i => sendForm.selectedIds.includes(i.id));
      const listSum = selected.reduce((sum, i) => sum + parseFloat(i.gross_weight || i.net_weight), 0);
      const manual = parseFloat(sendForm.manualWeight) || 0;
      return (listSum + manual).toFixed(3);
  };

  // Filter Vendors based on Active Metal (Gold/Silver)
  const getFilteredVendors = () => {
      if (!selectedBatch) return vendors;
      return vendors.filter(v => 
          !v.deals_in || v.deals_in.includes(selectedBatch.metal_type) || v.deals_in === 'BOTH'
      );
  };

  // --- Actions ---

  const createBatch = async () => {
      const { selectedIds, manualWeight, batchName } = sendForm;
      if (selectedIds.length === 0 && !manualWeight) return alert("Select items or enter manual weight.");
      
      if (!window.confirm(`Create ${activeMetal} batch? Total: ${calculateTotal()}g`)) return;

      try {
          await api.createRefineryBatch({ 
              metal_type: activeMetal, 
              item_ids: selectedIds, 
              manual_weight: manualWeight,
              batch_name: batchName 
          });
          
          alert("Batch Sent to Refinery!");
          setSendForm(prev => ({ ...prev, selectedIds: [], manualWeight: '', batchName: '' }));
          loadData();
      } catch(err) { alert(err.message); }
  };

  const handleTouchChange = (touchVal) => {
      const refined = parseFloat(receiveForm.refined_weight) || 0;
      const tch = parseFloat(touchVal) || 0;
      const pure = (refined * (tch / 100)).toFixed(3);
      setReceiveForm({ ...receiveForm, touch: touchVal, pure_weight: pure });
  };

  const receiveRefined = async () => {
      if(!selectedBatch) return;
      try {
          await api.receiveRefinedGold({ 
              batch_id: selectedBatch.id, 
              refined_weight: receiveForm.refined_weight, 
              touch: receiveForm.touch
          });
          alert(`${selectedBatch.metal_type} Received Successfully!`);
          setShowReceiveModal(false);
          loadData();
      } catch(err) { 
          alert("Update Failed: " + (err.response?.data?.error || err.message)); 
      }
  };

  const useStock = async () => {
      try {
          await api.useRefinedStock({
              batch_id: selectedBatch.id,
              use_weight: useForm.use_weight,
              item_name: useForm.item_name,
              metal_type: selectedBatch.metal_type,
              transfer_to: useForm.transfer_to,
              recipient_id: useForm.recipient_id
          });
          alert("Transaction Logged & Stock Updated!");
          setShowUseModal(false);
          loadData();
      } catch(err) { alert(err.message); }
  };

  const handleViewHistory = async (batch) => {
      setSelectedBatch(batch);
      try {
          const res = await api.getBatchItems(batch.id);
          setHistoryItems(res.data);
          setShowHistoryModal(true);
      } catch (err) { alert(err.message); }
  };

  // Stats Calculation
  const totalPendingWeight = pendingScrap.reduce((sum, i) => sum + parseFloat(i.gross_weight || i.net_weight), 0).toFixed(3);
  const totalRefinedStock = refineryBatches
    .filter(b => b.status === 'REFINED')
    .reduce((sum, b) => sum + (parseFloat(b.pure_weight) - (parseFloat(b.used_weight)||0)), 0)
    .toFixed(3);

  // Dynamic Calculation for Modal
  const getCalculationDisplay = () => {
      if (!selectedBatch) return null;
      const available = parseFloat(selectedBatch.pure_weight) - (parseFloat(selectedBatch.used_weight)||0);
      const entering = parseFloat(useForm.use_weight) || 0;
      const remaining = available - entering;
      
      return (
          <div className={`alert p-2 small border ${remaining < 0 ? 'alert-danger' : 'alert-success'}`}>
              <div className="d-flex justify-content-between">
                  <span>Available: <strong>{available.toFixed(3)}</strong></span>
                  <span>- Use: <strong>{entering.toFixed(3)}</strong></span>
                  <span className="fw-bold border-start ps-2">Remaining: {remaining.toFixed(3)} g</span>
              </div>
          </div>
      );
  };

  return (
    <div className="container-fluid py-4 bg-light" style={{minHeight:'100vh'}}>
      
      {/* HEADER & METAL TOGGLE */}
      <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold text-dark mb-0"><i className="bi bi-fire me-2 text-danger"></i>Refinery Manager</h4>
            <small className="text-muted">Manage scrap dispatch, refining, and pure metal recovery.</small>
          </div>

          <div className="bg-white p-1 rounded-pill shadow-sm border d-flex">
              <button 
                  className={`btn rounded-pill px-4 fw-bold ${activeMetal==='GOLD'?'btn-warning text-dark':'btn-white text-muted'}`} 
                  onClick={()=>setActiveMetal('GOLD')}
              >
                  GOLD
              </button>
              <button 
                  className={`btn rounded-pill px-4 fw-bold ${activeMetal==='SILVER'?'btn-secondary text-white':'btn-white text-muted'}`} 
                  onClick={()=>setActiveMetal('SILVER')}
              >
                  SILVER
              </button>
          </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="row g-3 mb-4">
          <div className="col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex align-items-center">
                      <div className={`p-3 rounded-circle me-3 ${activeMetal==='GOLD'?'bg-warning-subtle text-warning':'bg-secondary-subtle text-secondary'}`}>
                          <i className="bi bi-recycle fs-4"></i>
                      </div>
                      <div>
                          <h6 className="text-muted mb-0 small fw-bold">PENDING SCRAP</h6>
                          <h4 className="fw-bold mb-0">{totalPendingWeight} <span className="fs-6 text-muted">g</span></h4>
                      </div>
                  </div>
              </div>
          </div>
          <div className="col-md-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex align-items-center">
                      <div className="p-3 rounded-circle me-3 bg-success-subtle text-success">
                          <i className="bi bi-safe fs-4"></i>
                      </div>
                      <div>
                          <h6 className="text-muted mb-0 small fw-bold">REFINED STOCK AVAILABLE</h6>
                          <h4 className="fw-bold mb-0 text-success">{totalRefinedStock} <span className="fs-6 text-muted">g</span></h4>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="row g-4">
          
          {/* LEFT: PENDING SCRAP & CREATE BATCH (Narrower Col) */}
          <div className="col-xl-4 col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white py-3 border-0">
                      <h6 className="fw-bold mb-3"><i className="bi bi-list-check me-2"></i>Select Items to Dispatch</h6>
                      
                      {/* BATCH CREATION FORM */}
                      <div className="bg-light p-3 rounded mb-3 border">
                          <div className="mb-2">
                            <label className="small fw-bold text-muted">Batch Name (Optional)</label>
                            <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                placeholder={`e.g. ${activeMetal} Scrap Batch`} 
                                value={sendForm.batchName} 
                                onChange={e => setSendForm({...sendForm, batchName: e.target.value})} 
                            />
                          </div>
                          <div className="d-flex gap-2">
                              <div className="flex-grow-1">
                                  <label className="small fw-bold text-muted">Manual Weight (g)</label>
                                  <input 
                                      type="number" 
                                      className="form-control form-control-sm" 
                                      placeholder="0.00" 
                                      value={sendForm.manualWeight} 
                                      onChange={e => setSendForm({...sendForm, manualWeight: e.target.value})} 
                                  />
                              </div>
                              <div className="align-self-end text-end">
                                  <small className="d-block text-muted mb-1">Total Sending</small>
                                  <h5 className="fw-bold mb-0">{calculateTotal()} g</h5>
                              </div>
                          </div>
                          <button className="btn btn-dark w-100 mt-3 fw-bold btn-sm" onClick={createBatch}>
                              <i className="bi bi-send me-2"></i>Send to Refinery
                          </button>
                      </div>
                  </div>

                  <div className="table-responsive flex-grow-1">
                      <table className="table table-hover align-middle mb-0 small">
                          <thead className="table-light sticky-top">
                              <tr>
                                  <th style={{width:'40px'}} className="text-center"><input type="checkbox" className="form-check-input" onChange={handleSelectAll} /></th>
                                  <th>Item Name</th>
                                  <th className="text-end">Gross</th>
                                  <th className="text-end">Net</th> {/* ADDED BACK */}
                                  <th className="text-center">Status</th>
                              </tr>
                          </thead>
                          <tbody>
                              {pendingScrap.length === 0 && <tr><td colSpan="5" className="text-center py-5 text-muted">No pending items available.</td></tr>}
                              {pendingScrap.map(item => (
                                  <tr key={item.id} className={sendForm.selectedIds.includes(item.id) ? 'table-active' : ''}>
                                      <td className="text-center"><input type="checkbox" className="form-check-input" checked={sendForm.selectedIds.includes(item.id)} onChange={()=>toggleSelect(item.id)} /></td>
                                      <td>{item.item_name}</td>
                                      <td className="text-end fw-bold">{item.gross_weight}</td>
                                      <td className="text-end text-muted">{item.net_weight}</td> {/* ADDED BACK */}
                                      <td className="text-center"><span className="badge bg-secondary-subtle text-secondary border">Ready</span></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* RIGHT: BATCHES & ACTIONS (Wider Col + Grid System) */}
          <div className="col-xl-8 col-lg-7">
              <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0 text-muted">Active & Past Batches</h6>
                  <button className="btn btn-sm btn-outline-secondary" onClick={loadData}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
              </div>

              {/* GRID SYSTEM: 2 Columns on Large Screens */}
              <div className="row row-cols-1 row-cols-md-2 g-3">
                  {refineryBatches.length === 0 && <div className="col-12 text-center text-muted py-5">No batch history found for {activeMetal}.</div>}
                  
                  {refineryBatches.map(batch => (
                     <div className="col" key={batch.id}>
                       <div className="card border-0 shadow-sm h-100">
                          <div className="card-body p-3 d-flex flex-column">
                             <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="d-flex align-items-center">
                                    <div className={`rounded p-2 me-3 ${batch.status==='COMPLETED'?'bg-success text-white': batch.status==='REFINED'?'bg-primary text-white':'bg-warning text-dark'}`}>
                                        <i className={`bi ${batch.status==='SENT'?'bi-truck':'bi-check-lg'}`}></i>
                                    </div>
                                    <div>
                                        <h6 className="fw-bold mb-0 text-truncate" style={{maxWidth:'150px'}} title={batch.batch_no}>{batch.batch_no}</h6>
                                        <small className="text-muted" style={{fontSize:'0.75rem'}}>{new Date(batch.sent_date).toLocaleDateString()}</small>
                                    </div>
                                </div>
                                <span className={`badge ${batch.status==='SENT'?'bg-warning text-dark': batch.status==='REFINED'?'bg-primary':'bg-success'}`}>{batch.status}</span>
                             </div>

                             <div className="row g-2 mb-3 small bg-light p-2 rounded mx-0 mt-auto">
                                 <div className="col-4 border-end">
                                     <span className="text-muted d-block" style={{fontSize:'0.7rem'}}>SENT</span>
                                     <strong className="text-dark">{batch.gross_weight} g</strong>
                                 </div>
                                 <div className="col-4 border-end text-center">
                                     <span className="text-muted d-block" style={{fontSize:'0.7rem'}}>PURE</span>
                                     <strong className={batch.pure_weight ? "text-success":"text-muted"}>{batch.pure_weight || '--'} g</strong>
                                 </div>
                                 <div className="col-4 text-end">
                                     <span className="text-muted d-block" style={{fontSize:'0.7rem'}}>BALANCE</span>
                                     <strong className="text-primary">{(parseFloat(batch.pure_weight || 0) - (parseFloat(batch.used_weight)||0)).toFixed(3)} g</strong>
                                 </div>
                             </div>

                             <div className="d-flex gap-2">
                                 <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => handleViewHistory(batch)} title="View Sent Items">
                                     <i className="bi bi-card-list"></i>
                                 </button>
                                 
                                 {batch.status === 'SENT' && (
                                     <button className="btn btn-sm btn-primary flex-fill fw-bold" onClick={()=>{setSelectedBatch(batch); setShowReceiveModal(true);}}>
                                         <i className="bi bi-box-arrow-in-down me-1"></i>Receive
                                     </button>
                                 )}
                                 
                                 {batch.status === 'REFINED' && (
                                     <button className="btn btn-sm btn-success flex-fill fw-bold" onClick={()=>{setSelectedBatch(batch); setShowUseModal(true);}}>
                                        <i className="bi bi-arrow-right-circle me-1"></i>Use Stock
                                     </button>
                                 )}
                             </div>
                          </div>
                       </div>
                     </div>
                   ))}
              </div>
          </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* RECEIVE MODAL */}
      {showReceiveModal && selectedBatch && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content shadow border-0">
                      <div className="modal-header bg-primary text-white">
                          <h5 className="modal-title fs-6">Receive {selectedBatch.metal_type} Report</h5>
                          <button className="btn-close btn-close-white" onClick={()=>setShowReceiveModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          <div className="alert alert-light border small text-center mb-3">
                              Batch <strong>{selectedBatch.batch_no}</strong> | Sent: {selectedBatch.gross_weight}g
                          </div>
                          <div className="mb-3">
                              <label className="small fw-bold text-muted">Refined Weight</label>
                              <input className="form-control" type="number" onChange={e=>setReceiveForm({...receiveForm, refined_weight:e.target.value})} autoFocus />
                          </div>
                          <div className="mb-3">
                              <label className="small fw-bold text-muted">Touch (%)</label>
                              <input className="form-control" type="number" placeholder="99.50" value={receiveForm.touch} onChange={e=>handleTouchChange(e.target.value)} />
                          </div>
                          <div className="mb-3">
                              <label className="small fw-bold text-muted">Pure Weight (Calculated)</label>
                              <input className="form-control fw-bold fs-5 text-success bg-light" type="number" disabled value={receiveForm.pure_weight} />
                          </div>
                          <button className="btn btn-primary w-100 fw-bold" onClick={receiveRefined}>Update & Receive</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* USE STOCK MODAL (Updated) */}
      {showUseModal && selectedBatch && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content shadow border-0">
                      <div className="modal-header bg-success text-white">
                          <h5 className="modal-title fs-6">
                              {selectedBatch.metal_type === 'GOLD' ? 'Gold Stock Transfer' : 'Silver Stock Transfer'}
                          </h5>
                          <button className="btn-close btn-close-white" onClick={()=>setShowUseModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          <div className="mb-3">
                              <label className="small fw-bold text-muted">Transfer Destination</label>
                              <select className="form-select" value={useForm.transfer_to} onChange={e=>setUseForm({...useForm, transfer_to: e.target.value, recipient_id: ''})}>
                                  <option value="INVENTORY">Internal Inventory (Create Stock)</option>
                                  <option value="VENDOR">Pay Vendor (Gold/Silver Balance)</option>
                                  <option value="SHOP">Transfer to B2B Shop</option>
                              </select>
                          </div>
                          
                          {/* DYNAMIC FIELDS & VENDOR FILTER */}
                          {useForm.transfer_to === 'VENDOR' && (
                              <div className="mb-3">
                                  <label className="small fw-bold text-muted">Select {selectedBatch.metal_type} Vendor</label>
                                  <select className="form-select" onChange={e=>setUseForm({...useForm, recipient_id: e.target.value})}>
                                      <option value="">-- Select Vendor --</option>
                                      {getFilteredVendors().map(v => (
                                          <option key={v.id} value={v.id}>{v.business_name} ({v.deals_in || 'ALL'})</option>
                                      ))}
                                  </select>
                              </div>
                          )}
                          {useForm.transfer_to === 'SHOP' && (
                              <div className="mb-3">
                                  <label className="small fw-bold text-muted">Select Shop</label>
                                  <select className="form-select" onChange={e=>setUseForm({...useForm, recipient_id: e.target.value})}>
                                      <option value="">-- Select Shop --</option>
                                      {shops.map(s => <option key={s.id} value={s.id}>{s.shop_name}</option>)}
                                  </select>
                              </div>
                          )}
                          {useForm.transfer_to === 'INVENTORY' && (
                              <div className="mb-3">
                                  <label className="small fw-bold text-muted">Stock Item Name</label>
                                  <input className="form-control" 
                                      placeholder={selectedBatch.metal_type === 'GOLD' ? "e.g. 24k Bar" : "e.g. Fine Silver Bar"} 
                                      onChange={e=>setUseForm({...useForm, item_name:e.target.value})} 
                                  />
                              </div>
                          )}
                          
                          <div className="mb-3">
                              <label className="small fw-bold text-muted">Weight to Use (Pure)</label>
                              {/* LIVE CALCULATOR */}
                              {getCalculationDisplay()}
                              
                              <div className="input-group mt-2">
                                <input 
                                    className="form-control fw-bold" 
                                    type="number" 
                                    placeholder="Enter Weight..."
                                    value={useForm.use_weight}
                                    onChange={e=>setUseForm({...useForm, use_weight:e.target.value})} 
                                />
                                <span className="input-group-text">g</span>
                              </div>
                          </div>
                          
                          <button className="btn btn-success w-100 fw-bold" onClick={useStock}>
                              Confirm Transfer & Log
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* HISTORY MODAL (Restored Columns) */}
      {showHistoryModal && selectedBatch && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                  <div className="modal-content shadow border-0">
                      <div className="modal-header bg-light">
                          <h5 className="modal-title fs-6">Batch Items: <span className="font-monospace">{selectedBatch.batch_no}</span></h5>
                          <button className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
                      </div>
                      <div className="modal-body p-0">
                          <table className="table table-striped mb-0 small">
                              <thead className="table-secondary"><tr><th>Item</th><th>Gross</th><th>Net</th><th>Voucher</th><th>Date</th></tr></thead> {/* ADDED Voucher */}
                              <tbody>
                                  {historyItems.map((item, idx) => (
                                      <tr key={idx}>
                                          <td className="fw-bold">{item.item_name}</td>
                                          <td>{item.gross_weight}</td>
                                          <td>{item.net_weight}</td>
                                          <td className="font-monospace text-primary">{item.voucher_no}</td> {/* ADDED Voucher */}
                                          <td>{new Date(item.purchase_date).toLocaleDateString()}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default RefineryManager;