import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function VendorManager() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATES ---
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);

  // --- FORMS ---
  const [vendorForm, setVendorForm] = useState({ business_name: '', contact_number: '', address: '', gst_number: '' });
  const [agentForm, setAgentForm] = useState({ vendor_id: '', agent_name: '', agent_phone: '', agent_photo: null });

  useEffect(() => {
    fetchVendors(searchTerm);
  }, [searchTerm]);

  const fetchVendors = async (q = '') => {
    try {
      const res = await api.searchVendor(q);
      setVendors(res.data);
    } catch (err) { console.error(err); }
  };

  // --- HANDLERS ---
  const handleAddVendor = async () => {
    if (!vendorForm.business_name || !vendorForm.contact_number) return alert("Name and Contact are required");
    try {
      await api.addVendor(vendorForm);
      alert('Vendor Added Successfully');
      setShowAddVendor(false);
      setVendorForm({ business_name: '', contact_number: '', address: '', gst_number: '' });
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-people-fill me-2"></i>Vendors</h2>
        <div>
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

      {/* --- MODAL: ADD AGENT --- */}
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