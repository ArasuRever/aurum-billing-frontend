import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { FaTrash, FaEye } from 'react-icons/fa'; // Added FaEye

function VendorManager() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [productTypes, setProductTypes] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATES ---
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  
  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null); 
  const [stockAction, setStockAction] = useState('DELETE'); // 'DELETE' or 'MOVE'

  // --- FORMS ---
  const [vendorForm, setVendorForm] = useState({ business_name: '', contact_number: '', address: '', gst_number: '', vendor_type: 'BOTH' });
  const [agentForm, setAgentForm] = useState({ vendor_id: '', agent_name: '', agent_phone: '', agent_photo: null });

  // --- STOCK BATCH FORM ---
  const [batchForm, setBatchForm] = useState({ vendor_id: '', metal_type: '', invoice_no: '', items: [] });
  const [tempItem, setTempItem] = useState({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });

  useEffect(() => {
    fetchVendors(searchTerm);
    fetchSettings();
  }, [searchTerm]);

  const fetchVendors = async (q = '') => {
    try {
      const res = await api.searchVendor(q);
      setVendors(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
      try {
          const res = await api.getProductTypes();
          const types = res.data || [];
          setProductTypes(types);
          if(types.length > 0 && !batchForm.metal_type) {
              setBatchForm(prev => ({ ...prev, metal_type: types[0].name }));
          }
      } catch (err) { console.error("Error loading product types", err); }
  };

  // --- VENDOR & AGENT HANDLERS ---
  const handleAddVendor = async () => {
    if (!vendorForm.business_name || !vendorForm.contact_number) return alert("Name and Contact are required");
    try { await api.addVendor(vendorForm); alert('Vendor Added'); setShowAddVendor(false); setVendorForm({ business_name: '', contact_number: '', address: '', gst_number: '', vendor_type: 'BOTH' }); fetchVendors(); } catch (err) { alert('Error adding vendor'); }
  };

  const handleAddAgent = async () => {
    if (!agentForm.vendor_id || !agentForm.agent_name) return alert("Vendor and Name are required");
    const formData = new FormData();
    Object.keys(agentForm).forEach(key => formData.append(key, agentForm[key]));
    try { await api.addAgent(formData); alert('Agent Added'); setShowAddAgent(false); setAgentForm({ vendor_id: '', agent_name: '', agent_phone: '', agent_photo: null }); } catch (err) { alert('Error adding agent'); }
  };

  // --- DELETE HANDLER (UPDATED) ---
  const handleDeleteConfirm = async () => {
      if (!deleteTarget) return;
      try {
          await api.deleteVendor(deleteTarget.id, stockAction); // Pass action
          setVendors(vendors.filter(v => v.id !== deleteTarget.id));
          setDeleteTarget(null);
          setStockAction('DELETE'); // Reset default
      } catch (err) {
          alert("Failed to delete: " + (err.response?.data?.error || err.message));
      }
  };

  // Stock Form Handlers
  const handleAddItemToBatch = () => {
      if(!tempItem.item_name || !tempItem.gross_weight) return alert("Enter Details");
      setBatchForm({ ...batchForm, items: [...batchForm.items, { ...tempItem, id: Date.now() }] });
      setTempItem({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });
  };
  const handleRemoveFromBatch = (id) => setBatchForm({ ...batchForm, items: batchForm.items.filter(i => i.id !== id) });
  const submitBatch = async () => {
      if(!batchForm.vendor_id) return alert("Select Source");
      if(batchForm.vendor_id !== 'OWN' && !batchForm.invoice_no) return alert("Invoice No Required");
      if(batchForm.items.length === 0) return alert("Add items");
      try {
          const payload = { ...batchForm, vendor_id: batchForm.vendor_id === 'OWN' ? null : batchForm.vendor_id, invoice_no: batchForm.invoice_no || 'OWN-STOCK' };
          await api.addBatchInventory(payload);
          alert("Stock Added!"); setShowStockModal(false); setBatchForm({ vendor_id: '', metal_type: productTypes[0]?.name || 'GOLD', invoice_no: '', items: [] }); fetchVendors(searchTerm);
      } catch(err) { alert(err.message); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-people-fill me-2"></i>Vendors</h2>
        <div>
          <button className="btn btn-success shadow-sm me-2 fw-bold" onClick={() => setShowStockModal(true)}><i className="bi bi-box-seam me-2"></i>Add Stock</button>
          <button className="btn btn-primary shadow-sm me-2" onClick={() => setShowAddVendor(true)}><i className="bi bi-plus-circle me-2"></i>Add Vendor</button>
          <button className="btn btn-outline-secondary shadow-sm" onClick={() => setShowAddAgent(true)}><i className="bi bi-person-badge me-2"></i>Add Agent</button>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-3">
          <input type="text" className="form-control" placeholder="Search Vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr><th>Business Name</th><th>Type</th><th>Contact</th><th>Balance (Pure)</th><th>Action</th></tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td style={{cursor: 'pointer'}} onClick={() => navigate(`/vendors/${vendor.id}`)}>
                    <div className="fw-bold text-primary">{vendor.business_name}</div>
                    <div className="small text-muted" style={{fontSize: '0.75rem'}}>ID: {vendor.id}</div>
                  </td>
                  <td><span className={`badge ${vendor.vendor_type === 'GOLD' ? 'bg-warning text-dark' : vendor.vendor_type === 'SILVER' ? 'bg-secondary' : 'bg-info text-dark'}`}>{vendor.vendor_type || 'BOTH'}</span></td>
                  <td>{vendor.contact_number}</td>
                  <td className={`fw-bold ${parseFloat(vendor.balance_pure_weight) > 0 ? 'text-danger' : 'text-success'}`}>{vendor.balance_pure_weight} g</td>
                  <td>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/vendors/${vendor.id}`)}><FaEye /></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => { setDeleteTarget(vendor); setStockAction('DELETE'); }}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CONFIRM DELETE MODAL WITH OPTIONS --- */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div className="bg-white p-4 rounded shadow-lg" style={{backgroundColor:'white', padding:'20px', borderRadius:'8px', width:'450px', maxWidth:'90%'}}>
                <h4 className="text-danger fw-bold mb-3">Delete Vendor?</h4>
                <p className="mb-3">
                    You are about to delete <strong>{deleteTarget.business_name}</strong>.
                    <br/>What should happen to their available stock?
                </p>
                
                <div className="mb-4">
                    <div className="form-check mb-2">
                        <input className="form-check-input" type="radio" name="stockAction" id="actionDelete" 
                            checked={stockAction === 'DELETE'} onChange={() => setStockAction('DELETE')} />
                        <label className="form-check-label text-danger fw-bold" htmlFor="actionDelete">
                            Delete All Stock Items (Remove from System)
                        </label>
                    </div>
                    <div className="form-check">
                        <input className="form-check-input" type="radio" name="stockAction" id="actionMove" 
                            checked={stockAction === 'MOVE'} onChange={() => setStockAction('MOVE')} />
                        <label className="form-check-label text-success fw-bold" htmlFor="actionMove">
                            Move Stock to Shop Inventory (Own Stock)
                        </label>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button onClick={() => setDeleteTarget(null)} className="btn btn-light">Cancel</button>
                    <button onClick={handleDeleteConfirm} className="btn btn-danger">Confirm Delete</button>
                </div>
            </div>
        </div>
      )}

      {/* ... (Other Modals: showAddVendor, showAddAgent, showStockModal - kept same as before) ... */}
      {showAddVendor && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Add New Vendor</h5><button className="btn-close" onClick={() => setShowAddVendor(false)}></button></div>
              <div className="modal-body">
                <input className="form-control mb-3" placeholder="Business Name" value={vendorForm.business_name} onChange={e => setVendorForm({...vendorForm, business_name: e.target.value})} />
                <select className="form-select mb-3" value={vendorForm.vendor_type} onChange={e => setVendorForm({...vendorForm, vendor_type: e.target.value})}>
                    <option value="BOTH">All Metals (Both)</option>
                    {productTypes.map(type => (<option key={type.id} value={type.name}>{type.name} Only</option>))}
                </select>
                <input className="form-control mb-3" placeholder="Contact Number" value={vendorForm.contact_number} onChange={e => setVendorForm({...vendorForm, contact_number: e.target.value})} />
                <input className="form-control mb-3" placeholder="GST Number" value={vendorForm.gst_number} onChange={e => setVendorForm({...vendorForm, gst_number: e.target.value})} />
                <textarea className="form-control mb-3" placeholder="Address" rows="2" value={vendorForm.address} onChange={e => setVendorForm({...vendorForm, address: e.target.value})}></textarea>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowAddVendor(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddVendor}>Save</button></div>
            </div>
          </div>
        </div>
      )}

      {/* (Keep showAddAgent and showStockModal same as previous code block provided) */}
       {showStockModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-header bg-success text-white">
                          <h5 className="modal-title">Add Stock (Batch Entry)</h5>
                          <button className="btn-close btn-close-white" onClick={() => setShowStockModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          <div className="row g-3 mb-4">
                              <div className="col-md-4">
                                  <label className="small fw-bold">Source</label>
                                  <select className="form-select" value={batchForm.vendor_id} onChange={e => setBatchForm({...batchForm, vendor_id: e.target.value})}>
                                      <option value="">Select Source</option>
                                      <option value="OWN" className="fw-bold text-success">✦ Shop / Own Stock</option>
                                      <optgroup label="Vendors">
                                          {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                                      </optgroup>
                                  </select>
                              </div>
                              <div className="col-md-4">
                                  <label className="small fw-bold">Metal Type</label>
                                  <select className="form-select" value={batchForm.metal_type} onChange={e => setBatchForm({...batchForm, metal_type: e.target.value})}>
                                      {productTypes.map(type => (
                                          <option key={type.id} value={type.name}>{type.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <div className="col-md-4">
                                  <label className="small fw-bold">Invoice / Ref No</label>
                                  <input className="form-control" 
                                    placeholder={batchForm.vendor_id === 'OWN' ? "Optional" : "Required"}
                                    value={batchForm.invoice_no} 
                                    onChange={e => setBatchForm({...batchForm, invoice_no: e.target.value})} 
                                  />
                              </div>
                          </div>
                          <div className="card bg-light border-0 p-3 mb-3">
                              <div className="row g-2 align-items-end">
                                  <div className="col-3"><label className="small">Item Name</label><input className="form-control form-control-sm" value={tempItem.item_name} onChange={e => setTempItem({...tempItem, item_name: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">Weight (g)</label><input type="number" className="form-control form-control-sm" value={tempItem.gross_weight} onChange={e => setTempItem({...tempItem, gross_weight: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">Wastage %</label><input type="number" className="form-control form-control-sm" value={tempItem.wastage_percent} onChange={e => setTempItem({...tempItem, wastage_percent: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">HUID (Opt)</label><input className="form-control form-control-sm" value={tempItem.huid} onChange={e => setTempItem({...tempItem, huid: e.target.value})} /></div>
                                  <div className="col-3"><button className="btn btn-dark btn-sm w-100" onClick={handleAddItemToBatch}>+ Add Row</button></div>
                              </div>
                          </div>
                          <table className="table table-sm table-bordered">
                              <thead><tr><th>Item</th><th>Wt</th><th>Wastage</th><th>HUID</th><th>Action</th></tr></thead>
                              <tbody>
                                  {batchForm.items.map(item => (
                                      <tr key={item.id}>
                                          <td>{item.item_name}</td><td>{item.gross_weight}</td><td>{item.wastage_percent}</td><td>{item.huid}</td>
                                          <td><button className="btn btn-link text-danger p-0" onClick={() => handleRemoveFromBatch(item.id)}>Remove</button></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      <div className="modal-footer">
                          <button className="btn btn-success fw-bold" onClick={submitBatch}>Save Batch ({batchForm.items.length} Items)</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      {/* ... (Show Add Agent Modal - kept same) ... */}
      {showAddAgent && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Agent</h5>
                <button className="btn-close" onClick={() => setShowAddAgent(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Select Vendor</label>
                  <select className="form-select" value={agentForm.vendor_id} onChange={e => setAgentForm({...agentForm, vendor_id: e.target.value})}>
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Agent Name</label>
                  <input className="form-control" value={agentForm.agent_name} onChange={e => setAgentForm({...agentForm, agent_name: e.target.value})} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Phone Number</label>
                  <input className="form-control" value={agentForm.agent_phone} onChange={e => setAgentForm({...agentForm, agent_phone: e.target.value})} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Photo (Optional)</label>
                  <input type="file" className="form-control" accept="image/*" onChange={e => setAgentForm({...agentForm, agent_photo: e.target.files[0]})} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAddAgent(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddAgent}>Save Agent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorManager;