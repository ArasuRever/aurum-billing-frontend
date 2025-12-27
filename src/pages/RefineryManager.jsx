import React, { useEffect, useState } from 'react';
import { api } from '../api';

function RefineryManager() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'batches'
  const [metalType, setMetalType] = useState('GOLD');
  const [pendingItems, setPendingItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState({});
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  
  // NEW: History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  // Forms
  const [receiveForm, setReceiveForm] = useState({ refined_weight: '', pure_weight: '' });
  const [useForm, setUseForm] = useState({ item_name: '', use_weight: '' });

  useEffect(() => { loadData(); }, [activeTab, metalType]);

  const loadData = async () => {
    setLoading(true);
    try {
        if (activeTab === 'pending') {
            const res = await api.getPendingScrap(metalType);
            setPendingItems(res.data);
        } else {
            const res = await api.getRefineryBatches();
            setBatches(res.data);
        }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const ids = {};
          pendingItems.forEach(i => ids[i.id] = true);
          setSelectedIds(ids);
      } else {
          setSelectedIds({});
      }
  };

  const toggleSelect = (id) => setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const calculateTotal = () => {
      return pendingItems.filter(i => selectedIds[i.id]).reduce((sum, i) => sum + parseFloat(i.net_weight), 0).toFixed(3);
  };

  const createBatch = async () => {
      const item_ids = Object.keys(selectedIds).filter(id => selectedIds[id]).map(id => parseInt(id));
      if (item_ids.length === 0) return alert("Select items first");
      if (!window.confirm(`Create batch with ${item_ids.length} items? Total: ${calculateTotal()}g`)) return;

      try {
          await api.createRefineryBatch({ metal_type: metalType, item_ids });
          alert("Batch Sent to Refinery!");
          setSelectedIds({});
          loadData();
      } catch(err) { alert(err.message); }
  };

  const receiveGold = async () => {
      try {
          await api.receiveRefinedGold({ 
              batch_id: selectedBatch.id, 
              refined_weight: receiveForm.refined_weight, 
              pure_weight: receiveForm.pure_weight 
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
              metal_type: selectedBatch.metal_type
          });
          alert("Stock Used / Added to Inventory!");
          setShowUseModal(false);
          loadData();
      } catch(err) { alert(err.message); }
  };

  // NEW: View History Function
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
                      <button className={`btn btn-sm ${metalType==='GOLD'?'btn-warning':'btn-outline-secondary'}`} onClick={()=>setMetalType('GOLD')}>GOLD</button>
                      <button className={`btn btn-sm ${metalType==='SILVER'?'btn-secondary':'btn-outline-secondary'}`} onClick={()=>setMetalType('SILVER')}>SILVER</button>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                      <h5 className="m-0">Selected: <strong>{calculateTotal()} g</strong></h5>
                      <button className="btn btn-danger fw-bold" onClick={createBatch}>Send to Refinery <i className="bi bi-arrow-right"></i></button>
                  </div>
              </div>
              <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                          <tr>
                              <th style={{width:'40px'}} className="text-center"><input type="checkbox" className="form-check-input" onChange={handleSelectAll} /></th>
                              <th>Item Name</th><th>Weight</th><th>Purity</th><th>Status</th>
                          </tr>
                      </thead>
                      <tbody>
                          {pendingItems.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-muted">No pending scrap found.</td></tr>}
                          {pendingItems.map(item => (
                              <tr key={item.id} className={selectedIds[item.id] ? 'table-warning' : ''}>
                                  <td className="text-center"><input type="checkbox" className="form-check-input" checked={!!selectedIds[item.id]} onChange={()=>toggleSelect(item.id)} /></td>
                                  <td>{item.item_name}</td>
                                  <td className="fw-bold">{item.net_weight} g</td>
                                  <td>{item.purity}%</td>
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
           {batches.map(batch => (
             <div className="col-md-6 col-xl-4" key={batch.id}>
               <div className={`card h-100 border-top-4 shadow-sm ${batch.status==='COMPLETED'?'border-success':'border-warning'}`}>
                  <div className="card-body">
                     <div className="d-flex justify-content-between mb-2">
                        <span className="badge bg-secondary">{batch.batch_no}</span>
                        <span className={`badge ${batch.status==='SENT'?'bg-warning text-dark': batch.status==='REFINED'?'bg-primary':'bg-success'}`}>{batch.status}</span>
                     </div>
                     
                     <div className="d-flex justify-content-between mb-1"><span className="text-muted small">Sent:</span><span className="fw-bold">{batch.gross_weight} g</span></div>
                     
                     {/* VIEW HISTORY BUTTON */}
                     <div className="text-center mb-3">
                         <button className="btn btn-link btn-sm text-decoration-none" onClick={() => handleViewHistory(batch)}>
                             <i className="bi bi-eye me-1"></i> View {batch.items_count} Items History
                         </button>
                     </div>

                     {batch.status !== 'SENT' && (
                        <div className="bg-light p-2 rounded mb-3 small">
                           <div className="d-flex justify-content-between"><span>Refined:</span> <strong>{batch.refined_weight} g</strong></div>
                           <div className="d-flex justify-content-between"><span>Pure:</span> <strong>{parseFloat(batch.pure_weight).toFixed(3)} g</strong></div>
                           <div className="d-flex justify-content-between text-success"><span>Available:</span> <strong>{(parseFloat(batch.pure_weight) - (parseFloat(batch.used_weight)||0)).toFixed(3)} g</strong></div>
                        </div>
                     )}
                     
                     {batch.status === 'SENT' && <button className="btn btn-outline-primary w-100" onClick={()=>{setSelectedBatch(batch); setShowReceiveModal(true);}}>Receive Gold</button>}
                     {batch.status === 'REFINED' && <button className="btn btn-outline-success w-100" onClick={()=>{setSelectedBatch(batch); setShowUseModal(true);}}>Use Stock</button>}
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
                          <div className="mb-3"><label>Total Pure Wt (24k)</label><input className="form-control" type="number" onChange={e=>setReceiveForm({...receiveForm, pure_weight:e.target.value})} /></div>
                          <button className="btn btn-primary w-100" onClick={receiveGold}>Save</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* USE STOCK MODAL */}
      {showUseModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header"><h5 className="modal-title">Use Refined Stock</h5><button className="btn-close" onClick={()=>setShowUseModal(false)}></button></div>
                      <div className="modal-body">
                          <div className="mb-3"><label>Item Name (for Inventory)</label><input className="form-control" placeholder="e.g. 24k Bar" onChange={e=>setUseForm({...useForm, item_name:e.target.value})} /></div>
                          <div className="mb-3"><label>Weight to Use</label><input className="form-control" type="number" onChange={e=>setUseForm({...useForm, use_weight:e.target.value})} /></div>
                          <button className="btn btn-success w-100" onClick={useStock}>Add to Inventory</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* HISTORY MODAL (NEW) */}
      {showHistoryModal && selectedBatch && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-header bg-light">
                          <h5 className="modal-title">Batch Content History: {selectedBatch.batch_no}</h5>
                          <button className="btn-close" onClick={() => setShowHistoryModal(false)}></button>
                      </div>
                      <div className="modal-body p-0">
                          <div className="table-responsive">
                              <table className="table table-striped mb-0 small">
                                  <thead className="table-secondary">
                                      <tr>
                                          <th>Item Name</th>
                                          <th>Net Weight</th>
                                          <th>Metal</th>
                                          <th>Origin Customer</th>
                                          <th>Voucher</th>
                                          <th>Date</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {historyItems.map((item, idx) => (
                                          <tr key={idx}>
                                              <td className="fw-bold">{item.item_name}</td>
                                              <td>{item.net_weight} g</td>
                                              <td>{item.metal_type}</td>
                                              <td>{item.customer_name || 'Walk-in'}</td>
                                              <td className="font-monospace">{item.voucher_no}</td>
                                              <td>{new Date(item.purchase_date).toLocaleDateString()}</td>
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