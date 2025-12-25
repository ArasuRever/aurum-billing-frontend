import React, { useEffect, useState } from 'react';
import { api } from '../api';

function RefineryManager() {
  const [activeTab, setActiveTab] = useState('pending'); 
  const [metalType, setMetalType] = useState('GOLD');
  const [pendingItems, setPendingItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);

  const [selectedIds, setSelectedIds] = useState({});
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [manualWeight, setManualWeight] = useState('');
  const [receiveForm, setReceiveForm] = useState({ refined_weight: '', touch_percent: '', report_no: '', file: null });
  const [useForm, setUseForm] = useState({ usage_type: 'ADD_TO_INVENTORY', vendor_id: '', weight_to_use: '' });

  useEffect(() => { loadData(); api.getVendors().then(res => setVendors(res.data)).catch(console.error); }, [activeTab, metalType]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') { const res = await api.getPendingScrap(metalType); setPendingItems(res.data); } 
      else { const res = await api.getRefineryBatches(); setBatches(res.data); }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSelection = (id) => { setSelectedIds(prev => ({ ...prev, [id]: !prev[id] })); };
  const calculateSelectedTotal = () => pendingItems.filter(i => selectedIds[i.id]).reduce((sum, i) => sum + parseFloat(i.net_weight), 0);

  const handleCreateBatch = async () => {
    const ids = Object.keys(selectedIds).filter(k => selectedIds[k]).map(Number);
    if (ids.length === 0 && !manualWeight) return alert("Select items or enter manual weight");
    if(!window.confirm("Confirm?")) return;
    try {
      await api.createRefineryBatch({ metal_type: metalType, selected_item_ids: ids, manual_weight: manualWeight || 0 });
      alert("Sent!"); setShowBatchModal(false); setManualWeight(''); setSelectedIds({}); loadData();
    } catch (err) { alert(err.message); }
  };

  const handleReceiveGold = async () => {
    const formData = new FormData();
    formData.append('batch_id', selectedBatch.id);
    formData.append('refined_weight', receiveForm.refined_weight);
    formData.append('touch_percent', receiveForm.touch_percent);
    formData.append('report_no', receiveForm.report_no);
    if (receiveForm.file) formData.append('report_image', receiveForm.file);
    try { await api.receiveRefinedGold(formData); alert("Saved!"); setShowReceiveModal(false); loadData(); } catch (err) { alert("Error: " + err.message); }
  };

  const handleUseStock = async () => {
    try { await api.useRefinedStock({ batch_id: selectedBatch.id, ...useForm }); alert("Done!"); setShowUseModal(false); loadData(); } catch (err) { alert("Error: " + err.response?.data?.error); }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-secondary">Refinery Manager</h3>
        <div className="btn-group">
           <button className={`btn ${activeTab==='pending'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setActiveTab('pending')}>Pending</button>
           <button className={`btn ${activeTab==='batches'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setActiveTab('batches')}>Batches</button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <div className="card shadow-sm border-0">
           <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <select className="form-select w-auto fw-bold" value={metalType} onChange={e=>setMetalType(e.target.value)}><option value="GOLD">GOLD</option><option value="SILVER">SILVER</option></select>
              <div className="d-flex align-items-center gap-3">
                 <div className="text-end"><div className="small text-muted">Selected</div><div className="fw-bold fs-5">{calculateSelectedTotal().toFixed(3)} g</div></div>
                 <button className="btn btn-danger fw-bold" onClick={()=>setShowBatchModal(true)}>CREATE BATCH</button>
              </div>
           </div>
           <div className="table-responsive">
             <table className="table table-hover align-middle mb-0">
               <thead className="table-light"><tr><th style={{width:'50px'}}>#</th><th>Date</th><th>Item</th><th>Voucher</th><th className="text-end">Wt</th></tr></thead>
               <tbody>
                 {pendingItems.map(item => (
                   <tr key={item.id} onClick={() => handleSelection(item.id)} className={selectedIds[item.id] ? 'table-warning' : ''} style={{cursor:'pointer'}}>
                     <td><input type="checkbox" checked={!!selectedIds[item.id]} readOnly /></td>
                     <td>{new Date(item.date).toLocaleDateString()}</td>
                     <td>{item.item_name}</td>
                     <td className="font-monospace">{item.voucher_no}</td>
                     <td className="text-end fw-bold">{item.net_weight} g</td>
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

      {showBatchModal && (
        <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className="modal-header"><h5 className="modal-title">Confirm Batch</h5><button className="btn-close" onClick={()=>setShowBatchModal(false)}></button></div>
                 <div className="modal-body">
                    <p>Selected: <strong>{calculateSelectedTotal().toFixed(3)} g</strong></p>
                    <label className="form-label">Add Manual Weight</label>
                    <input type="number" className="form-control" value={manualWeight} onChange={e=>setManualWeight(e.target.value)} />
                 </div>
                 <div className="modal-footer"><button className="btn btn-danger" onClick={handleCreateBatch}>Send</button></div>
              </div>
           </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className="modal-header"><h5 className="modal-title">Receive Gold</h5><button className="btn-close" onClick={()=>setShowReceiveModal(false)}></button></div>
                 <div className="modal-body">
                    <input type="number" className="form-control mb-2" placeholder="Refined Weight" value={receiveForm.refined_weight} onChange={e=>setReceiveForm({...receiveForm, refined_weight:e.target.value})} />
                    <input type="number" className="form-control mb-2" placeholder="Touch %" value={receiveForm.touch_percent} onChange={e=>setReceiveForm({...receiveForm, touch_percent:e.target.value})} />
                 </div>
                 <div className="modal-footer"><button className="btn btn-success" onClick={handleReceiveGold}>Save</button></div>
              </div>
           </div>
        </div>
      )}

      {showUseModal && (
         <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className="modal-header"><h5 className="modal-title">Use Stock</h5><button className="btn-close" onClick={()=>setShowUseModal(false)}></button></div>
                 <div className="modal-body">
                    <select className="form-select mb-3" value={useForm.usage_type} onChange={e=>setUseForm({...useForm, usage_type:e.target.value})}>
                        <option value="ADD_TO_INVENTORY">Add to Inventory</option>
                        <option value="PAY_VENDOR">Pay Vendor</option>
                    </select>
                    <input type="number" className="form-control mb-3" placeholder="Weight to Use" value={useForm.weight_to_use} onChange={e=>setUseForm({...useForm, weight_to_use:e.target.value})} />
                    {useForm.usage_type === 'PAY_VENDOR' && (
                        <select className="form-select" value={useForm.vendor_id} onChange={e=>setUseForm({...useForm, vendor_id:e.target.value})}>
                            <option value="">Select Vendor</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.balance_pure_weight}g)</option>)}
                        </select>
                    )}
                 </div>
                 <div className="modal-footer"><button className="btn btn-primary" onClick={handleUseStock}>Process</button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
export default RefineryManager;