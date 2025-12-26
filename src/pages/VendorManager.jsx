import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function VendorManager() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [productTypes, setProductTypes] = useState([]); // NEW: Dynamic Metal Types
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATES ---
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // --- FORMS ---
  const [vendorForm, setVendorForm] = useState({ 
    business_name: '', 
    contact_number: '', 
    address: '', 
    gst_number: '', 
    vendor_type: 'BOTH' 
  });
  
  const [agentForm, setAgentForm] = useState({ vendor_id: '', agent_name: '', agent_phone: '', agent_photo: null });

  // --- STOCK BATCH FORM ---
  const [batchForm, setBatchForm] = useState({
      vendor_id: '',
      metal_type: '', // Changed default to empty to force selection or set in useEffect
      invoice_no: '',
      items: [] 
  });
  const [tempItem, setTempItem] = useState({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });


  useEffect(() => {
    fetchVendors(searchTerm);
    fetchSettings(); // NEW: Fetch types on load
  }, [searchTerm]);

  const fetchVendors = async (q = '') => {
    try {
      const res = await api.searchVendor(q);
      setVendors(res.data);
    } catch (err) { console.error(err); }
  };

  // NEW: Fetch Dynamic Product Types
  const fetchSettings = async () => {
      try {
          const res = await api.getProductTypes();
          const types = res.data || [];
          setProductTypes(types);
          // Set default metal type for stock form if available
          if(types.length > 0 && !batchForm.metal_type) {
              setBatchForm(prev => ({ ...prev, metal_type: types[0].name }));
          }
      } catch (err) { console.error("Error loading product types", err); }
  };

  // --- VENDOR & AGENT HANDLERS ---
  const handleAddVendor = async () => {
    if (!vendorForm.business_name || !vendorForm.contact_number) return alert("Name and Contact are required");
    try {
      await api.addVendor(vendorForm);
      alert('Vendor Added Successfully');
      setShowAddVendor(false);
      setVendorForm({ business_name: '', contact_number: '', address: '', gst_number: '', vendor_type: 'BOTH' });
      fetchVendors();
    } catch (err) { alert('Error adding vendor'); }
  };

  const handleAddAgent = async () => {
    if (!agentForm.vendor_id || !agentForm.agent_name) return alert("Vendor and Name are required");
    const formData = new FormData();
    formData.append('vendor_id', agentForm.vendor_id);
    formData.append('agent_name', agentForm.agent_name);
    formData.append('agent_phone', agentForm.agent_phone);
    if (agentForm.agent_photo) formData.append('agent_photo', agentForm.agent_photo);
    try {
      await api.addAgent(formData);
      alert('Agent Added Successfully');
      setShowAddAgent(false);
      setAgentForm({ vendor_id: '', agent_name: '', agent_phone: '', agent_photo: null });
    } catch (err) { alert('Error adding agent'); }
  };

  // --- STOCK HANDLERS ---
  const handleAddItemToBatch = () => {
      if(!tempItem.item_name || !tempItem.gross_weight) return alert("Enter Item Name and Weight");
      setBatchForm({
          ...batchForm,
          items: [...batchForm.items, { ...tempItem, id: Date.now() }]
      });
      setTempItem({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });
  };

  const handleRemoveFromBatch = (id) => {
      setBatchForm({ ...batchForm, items: batchForm.items.filter(i => i.id !== id) });
  };

  const submitBatch = async () => {
      if(!batchForm.vendor_id) return alert("Select Vendor or 'Shop Stock'");
      if(batchForm.vendor_id !== 'OWN' && !batchForm.invoice_no) return alert("Invoice No is required for Vendor Stock");
      if(batchForm.items.length === 0) return alert("Add at least one item");
      
      try {
          const payload = {
              vendor_id: batchForm.vendor_id === 'OWN' ? null : batchForm.vendor_id,
              metal_type: batchForm.metal_type,
              invoice_no: batchForm.invoice_no || 'OWN-STOCK',
              items: batchForm.items
          };
          await api.addBatchInventory(payload);
          alert("Stock Added Successfully!");
          setShowStockModal(false);
          setBatchForm({ vendor_id: '', metal_type: productTypes[0]?.name || 'GOLD', invoice_no: '', items: [] });
          fetchVendors(searchTerm); 
      } catch(err) { alert(err.message); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-people-fill me-2"></i>Vendors</h2>
        <div>
          <button className="btn btn-success shadow-sm me-2 fw-bold" onClick={() => setShowStockModal(true)}>
            <i className="bi bi-box-seam me-2"></i>Add Stock
          </button>
          <button className="btn btn-primary shadow-sm me-2" onClick={() => setShowAddVendor(true)}>
            <i className="bi bi-plus-circle me-2"></i>Add Vendor
          </button>
          <button className="btn btn-outline-secondary shadow-sm" onClick={() => setShowAddAgent(true)}>
            <i className="bi bi-person-badge me-2"></i>Add Agent
          </button>
        </div>
      </div>

      {/* --- LIST TABLE --- */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-3">
          <input 
            type="text" className="form-control" placeholder="Search Vendors..." 
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Business Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Balance (Pure)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} style={{cursor: 'pointer'}} onClick={() => navigate(`/vendors/${vendor.id}`)}>
                  <td>
                    <div className="fw-bold text-primary">{vendor.business_name}</div>
                    <div className="small text-muted" style={{fontSize: '0.75rem'}}>ID: {vendor.id}</div>
                  </td>
                  <td>
                    {/* DYNAMIC BADGE LOGIC */}
                    <span className={`badge ${vendor.vendor_type === 'GOLD' ? 'bg-warning text-dark' : vendor.vendor_type === 'SILVER' ? 'bg-secondary' : 'bg-info text-dark'}`}>
                        {vendor.vendor_type || 'BOTH'}
                    </span>
                  </td>
                  <td>{vendor.contact_number}</td>
                  <td className={`fw-bold ${parseFloat(vendor.balance_pure_weight) > 0 ? 'text-danger' : 'text-success'}`}>
                    {vendor.balance_pure_weight} g
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary">
                      View Details <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: ADD VENDOR --- */}
      {showAddVendor && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Vendor</h5>
                <button className="btn-close" onClick={() => setShowAddVendor(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Business Name</label>
                  <input className="form-control" value={vendorForm.business_name} onChange={e => setVendorForm({...vendorForm, business_name: e.target.value})} />
                </div>
                <div className="mb-3">
                    <label className="form-label small fw-bold">Vendor Dealing Type</label>
                    <select className="form-select" value={vendorForm.vendor_type} onChange={e => setVendorForm({...vendorForm, vendor_type: e.target.value})}>
                        <option value="BOTH">All Metals (Both)</option>
                        {productTypes.map(type => (
                            <option key={type.id} value={type.name}>{type.name} Only</option>
                        ))}
                    </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Contact Number</label>
                  <input className="form-control" value={vendorForm.contact_number} onChange={e => setVendorForm({...vendorForm, contact_number: e.target.value})} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">GST Number</label>
                  <input className="form-control" value={vendorForm.gst_number} onChange={e => setVendorForm({...vendorForm, gst_number: e.target.value})} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Address</label>
                  <textarea className="form-control" rows="2" value={vendorForm.address} onChange={e => setVendorForm({...vendorForm, address: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAddVendor(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddVendor}>Save Vendor</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD AGENT (Unchanged) --- */}
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

      {/* --- MODAL: BATCH ADD STOCK (UPDATED) --- */}
      {showStockModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-header bg-success text-white">
                          <h5 className="modal-title">Add Stock (Batch Entry)</h5>
                          <button className="btn-close btn-close-white" onClick={() => setShowStockModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          {/* Header Inputs */}
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
                                  {/* DYNAMIC METAL TYPE DROPDOWN */}
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

                          {/* Grid Entry */}
                          <div className="card bg-light border-0 p-3 mb-3">
                              <div className="row g-2 align-items-end">
                                  <div className="col-3"><label className="small">Item Name</label><input className="form-control form-control-sm" value={tempItem.item_name} onChange={e => setTempItem({...tempItem, item_name: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">Weight (g)</label><input type="number" className="form-control form-control-sm" value={tempItem.gross_weight} onChange={e => setTempItem({...tempItem, gross_weight: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">Wastage %</label><input type="number" className="form-control form-control-sm" value={tempItem.wastage_percent} onChange={e => setTempItem({...tempItem, wastage_percent: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">HUID (Opt)</label><input className="form-control form-control-sm" value={tempItem.huid} onChange={e => setTempItem({...tempItem, huid: e.target.value})} /></div>
                                  <div className="col-3"><button className="btn btn-dark btn-sm w-100" onClick={handleAddItemToBatch}>+ Add Row</button></div>
                              </div>
                          </div>

                          {/* Preview Table */}
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

    </div>
  );
}

export default VendorManager;