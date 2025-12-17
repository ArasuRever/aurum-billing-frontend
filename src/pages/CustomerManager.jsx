import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function CustomerManager() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'recycle'
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '', profile_image: '' });

  useEffect(() => { loadCustomers(); }, [viewMode]);

  const loadCustomers = async () => {
    try { 
      // Toggle between Active List and Recycle Bin
      const res = viewMode === 'active' ? await api.getCustomers() : await api.getRecycleBin();
      setCustomers(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewCust({ ...newCust, profile_image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!newCust.name || !newCust.phone) return alert("Name & Phone required");
    try {
      await api.addCustomer(newCust);
      setShowModal(false);
      loadCustomers();
      setNewCust({ name: '', phone: '', address: '', profile_image: '' });
    } catch (err) { alert("Error saving customer"); }
  };

  // ACTIONS
  const handleSoftDelete = async (id) => {
    if(!window.confirm("Move to Recycle Bin?")) return;
    try { await api.softDeleteCustomer(id); loadCustomers(); } catch(err) { alert("Error deleting"); }
  };

  const handleRestore = async (id) => {
    try { await api.restoreCustomer(id); loadCustomers(); } catch(err) { alert("Error restoring"); }
  };

  const handlePermanentDelete = async (id) => {
    if(!window.confirm("WARNING: This will permanently delete the customer and cannot be undone!")) return;
    try { await api.permanentDeleteCustomer(id); loadCustomers(); } catch(err) { alert("Error deleting permanently"); }
  };

  const filtered = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary">
            <i className={`bi ${viewMode === 'active' ? 'bi-people-fill' : 'bi-trash'} me-2`}></i>
            {viewMode === 'active' ? 'Customer Management' : 'Recycle Bin'}
        </h2>
        
        <div className="d-flex gap-2">
            {/* View Toggle Button */}
            <button className={`btn ${viewMode === 'active' ? 'btn-outline-secondary' : 'btn-outline-primary'}`} 
                    onClick={() => setViewMode(viewMode === 'active' ? 'recycle' : 'active')}>
                {viewMode === 'active' ? <><i className="bi bi-trash me-2"></i>Recycle Bin</> : <><i className="bi bi-arrow-left me-2"></i>Back to List</>}
            </button>
            
            {viewMode === 'active' && (
                <>
                    <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                    <button className="btn btn-primary text-nowrap" onClick={() => setShowModal(true)}>
                        <i className="bi bi-person-plus-fill me-2"></i>Add Customer
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
                <tr><th>Profile</th><th>Name</th><th>Phone</th><th>Address</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                      {c.profile_image ? 
                        <img src={c.profile_image} className="rounded-circle border" style={{width:'40px', height:'40px', objectFit:'cover'}} /> : 
                        <div className="bg-secondary text-white rounded-circle d-flex justify-content-center align-items-center small" style={{width:'40px', height:'40px'}}>{c.name.charAt(0)}</div>
                      }
                  </td>
                  <td className="fw-bold">{c.name}</td>
                  <td>{c.phone}</td>
                  <td className="small text-muted text-truncate" style={{maxWidth:'200px'}}>{c.address || '-'}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                  <td className="text-end">
                      {viewMode === 'active' ? (
                          <>
                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => navigate(`/customers/${c.phone}`)}>View</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleSoftDelete(c.id)} title="Delete"><i className="bi bi-trash"></i></button>
                          </>
                      ) : (
                          <>
                             <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore(c.id)} title="Restore"><i className="bi bi-arrow-counterclockwise me-1"></i>Restore</button>
                             <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete(c.id)} title="Delete Forever"><i className="bi bi-x-lg"></i></button>
                          </>
                      )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" className="text-center py-4 text-muted">No customers found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CUSTOMER MODAL (Only needed in Active View) */}
      {showModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Add Customer</h5><button className="btn-close" onClick={() => setShowModal(false)}></button></div>
              <div className="modal-body text-center">
                 <div className="mb-3">
                    <label htmlFor="imgUpload" style={{cursor:'pointer'}}>
                        {newCust.profile_image ? 
                            <img src={newCust.profile_image} className="rounded-circle border shadow-sm" style={{width:'100px', height:'100px', objectFit:'cover'}} /> :
                            <div className="bg-light rounded-circle border d-flex justify-content-center align-items-center mx-auto" style={{width:'100px', height:'100px'}}><i className="bi bi-camera fs-2 text-muted"></i></div>
                        }
                    </label>
                    <input type="file" id="imgUpload" className="d-none" accept="image/*" onChange={handleImageUpload} />
                 </div>
                 <input className="form-control mb-2" placeholder="Full Name" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
                 <input className="form-control mb-2" placeholder="Phone Number" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} />
                 <textarea className="form-control" rows="3" placeholder="Address" value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})}></textarea>
              </div>
              <div className="modal-footer"><button className="btn btn-primary w-100" onClick={handleSave}>Save Customer</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default CustomerManager;