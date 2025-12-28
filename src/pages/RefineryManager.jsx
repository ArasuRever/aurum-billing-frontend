import React, { useEffect, useState } from 'react';
import { api } from '../api';

function RefineryManager() {
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  
  // Data
  const [pendingScrap, setPendingScrap] = useState([]);
  const [refineryBatches, setRefineryBatches] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [shops, setShops] = useState([]);

  // Modals
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Forms
  const [sendForm, setSendForm] = useState({ metal: 'GOLD', selectedIds: [], manualWeight: '' });
  const [receiveForm, setReceiveForm] = useState({ refined_weight: '', touch: '99.50', pure_weight: '' });
  const [useForm, setUseForm] = useState({ 
      item_name: '', use_weight: '', 
      transfer_to: 'INVENTORY',
      recipient_id: '' 
  });

  useEffect(() => { 
      loadData(); 
      api.getVendors().then(res => setVendors(res.data)).catch(console.error);
      api.getShops().then(res => setShops(res.data)).catch(console.error);
  }, [activeTab]);

  // --- FIX 1: Auto-reload when Metal Type changes ---
  useEffect(() => {
      if (activeTab === 'pending') {
          loadData();
          // Clear selection to prevent mixing metals
          setSendForm(prev => ({ ...prev, selectedIds: [] }));
      }
  }, [sendForm.metal]);

  const loadData = async () => {
    setLoading(true);
    try {
        if (activeTab === 'pending') {
            const res = await api.getPendingScrap(sendForm.metal);
            setPendingScrap(res.data);
        } else {
            const res = await api.getRefineryBatches();
            setRefineryBatches(res.data);
        }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          setSendForm(prev => ({ ...prev, selectedIds: pendingScrap.map(i => i.id) }));
      } else {
          setSendForm(prev => ({ ...prev, selectedIds: [] }));
      }
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

  const createBatch = async () => {
      const { selectedIds, manualWeight, metal } = sendForm;
      if (selectedIds.length === 0 && !manualWeight) return alert("Select items or enter manual weight.");
      
      if (!window.confirm(`Create ${metal} batch? Total: ${calculateTotal()}g`)) return;

      try {
          // --- FIX 2: Correct Payload Keys (item_ids instead of selected_item_ids) ---
          await api.createRefineryBatch({ 
              metal_type: metal, 
              item_ids: selectedIds, 
              manual_weight: manualWeight 
          });
          
          alert("Batch Sent to Refinery!");
          setSendForm(prev => ({ ...prev, selectedIds: [], manualWeight: '' }));
          loadData();
      } catch(err) { alert(err.message); }
  };

  const handleTouchChange = (touchVal) => {
      const refined = parseFloat(receiveForm.refined_weight) || 0;
      const tch = parseFloat(touchVal) || 0;
      const pure = (refined * (tch / 100)).toFixed(3);
      setReceiveForm({ ...receiveForm, touch: touchVal, pure_weight: pure });
  };

  const receiveGold = async () => {
      try {
          await api.receiveRefinedGold({ 
              batch_id: selectedBatch.id, 
              refined_weight: receiveForm.refined_weight, 
              touch: receiveForm.touch
          });
          alert("Gold Received!");
          setShowReceiveModal(false);
          loadData();
      } catch(err) { alert(err.message); }
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
          alert("Stock Used / Transferred!");
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

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold text-dark"><i className="bi bi-fire me-2 text-danger"></i>Refinery Manager</h4>
          <div className="btn-group">
              <button className={`btn fw-bold ${activeTab==='pending'?'btn-dark':'btn-outline-dark'}`} onClick={()=>setActiveTab('pending')}>Pending Scrap</button>
              <button className={`btn fw-bold ${activeTab==='batches'?'btn-dark':'btn-outline-dark'}`} onClick={()=>setActiveTab('batches')}>Batches History</button>
          </div>
      </div>

      {activeTab === 'pending' && (
          <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <div className="btn-group">
                      <button className={`btn btn-sm ${sendForm.metal==='GOLD'?'btn-warning':'btn-outline-secondary'}`} onClick={()=>setSendForm({...sendForm, metal: 'GOLD'})}>GOLD</button>
                      <button className={`btn btn-sm ${sendForm.metal==='SILVER'?'btn-secondary':'btn-outline-secondary'}`} onClick={()=>setSendForm({...sendForm, metal: 'SILVER'})}>SILVER</button>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                      <div className="input-group input-group-sm">
                          <span className="input-group-text">Manual Wt</span>
                          <input type="number" className="form-control" style={{maxWidth:'80px'}} placeholder="0.00" value={sendForm.manualWeight} onChange={e => setSendForm({...sendForm, manualWeight: e.target.value})} />
                      </div>
                      <h5 className="m-0">Total: <strong>{calculateTotal()} g</strong></h5>
                      <button className="btn btn-danger fw-bold" onClick={createBatch}>Send to Refinery <i className="bi bi-arrow-right"></i></button>
                  </div>
              </div>
              <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                          <tr>
                              <th style={{width:'40px'}} className="text-center"><input type="checkbox" className="form-check-input" onChange={handleSelectAll} /></th>
                              <th>Item Name</th><th>Gross Wt</th><th>Net Wt</th><th>Status</th>
                          </tr>
                      </thead>
                      <tbody>
                          {pendingScrap.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-muted">No pending scrap found.</td></tr>}
                          {pendingScrap.map(item => (
                              <tr key={item.id} className={sendForm.selectedIds.includes(item.id) ? 'table-warning' : ''}>
                                  <td className="text-center"><input type="checkbox" className="form-check-input" checked={sendForm.selectedIds.includes(item.id)} onChange={()=>toggleSelect(item.id)} /></td>
                                  <td>{item.item_name}</td>
                                  <td className="fw-bold">{item.gross_weight} g</td>
                                  <td className="text-muted small">{item.net_weight} g</td>
                                  <td><span className="badge bg-success">AVAILABLE</span></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'batches' && (
        <div className="row g-4">
           {refineryBatches.map(batch => (
             <div className="col-md-6 col-xl-4" key={batch.id}>
               <div className={`card h-100 border-top-4 shadow-sm ${batch.status==='COMPLETED'?'border-success':'border-warning'}`}>
                  <div className="card-body">
                     <div className="d-flex justify-content-between mb-2">
                        <span className="badge bg-secondary">{batch.batch_no}</span>
                        <span className={`badge ${batch.status==='SENT'?'bg-warning text-dark': batch.status==='REFINED'?'bg-primary':'bg-success'}`}>{batch.status}</span>
                     </div>
                     <div className="d-flex justify-content-between mb-1"><span className="text-muted small">Sent Gross:</span><span className="fw-bold">{batch.gross_weight} g</span></div>
                     <div className="text-center mb-3">
                         <button className="btn btn-link btn-sm text-decoration-none" onClick={() => handleViewHistory(batch)}>
                             <i className="bi bi-eye me-1"></i> View {batch.items_count} Items
                         </button>
                     </div>
                     {batch.status !== 'SENT' && (
                        <div className="bg-light p-2 rounded mb-3 small">
                           <div className="d-flex justify-content-between"><span>Refined:</span> <strong>{batch.refined_weight} g</strong></div>
                           <div className="d-flex justify-content-between"><span>Touch:</span> <strong>{batch.touch}%</strong></div>
                           <div className="d-flex justify-content-between"><span>Pure:</span> <strong>{parseFloat(batch.pure_weight).toFixed(3)} g</strong></div>
                           <div className="d-flex justify-content-between text-success"><span>Available:</span> <strong>{(parseFloat(batch.pure_weight) - (parseFloat(batch.used_weight)||0)).toFixed(3)} g</strong></div>
                        </div>
                     )}
                     {batch.status === 'SENT' && <button className="btn btn-outline-primary w-100" onClick={()=>{setSelectedBatch(batch); setShowReceiveModal(true);}}>Receive Gold</button>}
                     {batch.status === 'REFINED' && <button className="btn btn-outline-success w-100" onClick={()=>{setSelectedBatch(batch); setShowUseModal(true);}}>Transfer / Use Stock</button>}
                  </div>
               </div>
             </div>
           ))}
        </div>
      )}

      {/* RECEIVE MODAL */}
      {showReceiveModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header"><h5 className="modal-title">Receive Gold</h5><button className="btn-close" onClick={()=>setShowReceiveModal(false)}></button></div>
                      <div className="modal-body">
                          <div className="mb-3"><label>Total Refined Wt</label><input className="form-control" type="number" onChange={e=>setReceiveForm({...receiveForm, refined_weight:e.target.value})} /></div>
                          <div className="mb-3"><label>Touch (%)</label><input className="form-control" type="number" placeholder="99.50" value={receiveForm.touch} onChange={e=>handleTouchChange(e.target.value)} /></div>
                          <div className="mb-3"><label>Calculated Pure Wt</label><input className="form-control fw-bold" type="number" disabled value={receiveForm.pure_weight} /></div>
                          <button className="btn btn-primary w-100" onClick={receiveGold}>Save</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* USE / TRANSFER STOCK MODAL */}
      {showUseModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header"><h5 className="modal-title">Use / Transfer Refined Stock</h5><button className="btn-close" onClick={()=>setShowUseModal(false)}></button></div>
                      <div className="modal-body">
                          <div className="mb-3">
                              <label className="fw-bold small">Transfer To:</label>
                              <select className="form-select" value={useForm.transfer_to} onChange={e=>setUseForm({...useForm, transfer_to: e.target.value, recipient_id: ''})}>
                                  <option value="INVENTORY">Internal Inventory (New Bar)</option>
                                  <option value="VENDOR">Vendor (Pay/Credit)</option>
                                  <option value="SHOP">B2B Shop / Neighbour</option>
                              </select>
                          </div>
                          {useForm.transfer_to === 'VENDOR' && (
                              <div className="mb-3"><label className="small">Select Vendor</label><select className="form-select" onChange={e=>setUseForm({...useForm, recipient_id: e.target.value})}><option value="">-- Select Vendor --</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}</select></div>
                          )}
                          {useForm.transfer_to === 'SHOP' && (
                              <div className="mb-3"><label className="small">Select Shop</label><select className="form-select" onChange={e=>setUseForm({...useForm, recipient_id: e.target.value})}><option value="">-- Select Shop --</option>{shops.map(s => <option key={s.id} value={s.id}>{s.shop_name}</option>)}</select></div>
                          )}
                          {useForm.transfer_to === 'INVENTORY' && (
                              <div className="mb-3"><label>Item Name</label><input className="form-control" placeholder="e.g. 24k Bar" onChange={e=>setUseForm({...useForm, item_name:e.target.value})} /></div>
                          )}
                          <div className="mb-3"><label>Weight to Transfer (Pure)</label><input className="form-control" type="number" onChange={e=>setUseForm({...useForm, use_weight:e.target.value})} /></div>
                          <button className="btn btn-success w-100" onClick={useStock}>{useForm.transfer_to === 'INVENTORY' ? 'Add to Inventory' : 'Transfer Balance'}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && selectedBatch && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-header bg-light">
                          <h5 className="modal-title">Batch History: {selectedBatch.batch_no}</h5>
                          <button className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
                      </div>
                      <div className="modal-body p-0">
                          <div className="table-responsive">
                              <table className="table table-striped mb-0 small">
                                  <thead className="table-secondary"><tr><th>Item</th><th>Gross Wt</th><th>Net Wt</th><th>Voucher</th><th>Date</th></tr></thead>
                                  <tbody>
                                      {historyItems.map((item, idx) => (
                                          <tr key={idx}>
                                              <td className="fw-bold">{item.item_name}</td><td>{item.gross_weight} g</td><td>{item.net_weight} g</td><td className="font-monospace">{item.voucher_no}</td><td>{new Date(item.purchase_date).toLocaleDateString()}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                      <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>Close</button></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default RefineryManager;