import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function CustomerManager() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '', profile_image: '' });

  useEffect(() => { 
    console.log("CustomerManager Mounted. Loading customers..."); // DEBUG LOG 1
    loadCustomers(); 
  }, []);

  const loadCustomers = async () => {
    try { 
      const res = await api.getCustomers(); 
      console.log("API Response:", res); // DEBUG LOG 2: Check the raw response
      console.log("Customer Data:", res.data); // DEBUG LOG 3: Check the array
      
      if (Array.isArray(res.data)) {
        setCustomers(res.data);
      } else {
        console.error("Data is not an array!", res.data);
        alert("Error: Backend returned invalid data format.");
      }
    } catch (err) { 
      console.error("API Error:", err); // DEBUG LOG 4: Check for Network Errors
      alert("Failed to connect to server. Check Console (F12)."); 
    }
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
    } catch (err) { alert("Error saving"); }
  };

  const filtered = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-people-fill me-2"></i>Customer Management</h2>
        <div className="d-flex gap-2">
            <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary text-nowrap" onClick={() => setShowModal(true)}><i className="bi bi-person-plus-fill me-2"></i>Add Customer</button>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light"><tr><th>Profile</th><th>Name</th><th>Phone</th><th>Address</th><th>Joined</th><th></th></tr></thead>
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
                  <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/customers/${c.phone}`)}>View Profile</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" className="text-center py-4">No customers found (Check Console F12 if list should not be empty)</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CUSTOMER MODAL */}
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
                    <div className="small text-muted mt-1">Click to Upload / Capture</div>
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