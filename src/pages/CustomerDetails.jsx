import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function CustomerDetails() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { loadData(); }, [phone]);

  const loadData = async () => {
    try { const res = await api.getCustomerDetails(phone); setData(res.data); } catch (err) { alert("Error loading"); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditForm({ ...editForm, profile_image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const startEdit = () => { setEditForm({ ...data.customer }); setIsEditing(true); };
  const saveEdit = async () => {
    try {
        await api.updateCustomer(editForm.id, editForm);
        setIsEditing(false);
        if (editForm.phone !== phone) navigate(`/customers/${editForm.phone}`); else loadData();
    } catch(err) { alert("Error updating"); }
  };

  const handleDeleteBill = async (saleId) => {
    if(!window.confirm("Are you sure? This will VOID the bill and Restore Inventory.")) return;
    try { await api.deleteBill(saleId); loadData(); } catch(err) { alert("Error deleting"); }
  };

  if (!data) return <div className="p-5 text-center">Loading...</div>;

  const { customer, history } = data;
  const totalSpent = history.reduce((acc, curr) => acc + parseFloat(curr.final_amount), 0);
  // NEW: Calculate Total Pending Debt
  const totalDebt = history.reduce((acc, curr) => acc + parseFloat(curr.balance_amount || 0), 0);

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/customers')}><i className="bi bi-arrow-left"></i></button>
        <h3 className="fw-bold mb-0">Customer Profile</h3>
      </div>

      <div className="row g-4">
        {/* PROFILE CARD */}
        <div className="col-md-4">
           <div className="card shadow-sm h-100">
              <div className="card-body text-center p-4">
                 <div className="mb-3 position-relative d-inline-block">
                    {isEditing ? (
                        <>
                           <label htmlFor="editImg" style={{cursor:'pointer'}}>
                                {editForm.profile_image ? <img src={editForm.profile_image} className="rounded-circle border opacity-75" style={{width:'100px', height:'100px', objectFit:'cover'}} /> : <div className="bg-light rounded-circle border d-flex justify-content-center align-items-center" style={{width:'100px', height:'100px'}}><i className="bi bi-camera"></i></div>}
                           </label>
                           <input type="file" id="editImg" className="d-none" onChange={handleImageUpload} />
                           <div className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-1" style={{width:'30px',height:'30px'}}><i className="bi bi-pencil small"></i></div>
                        </>
                    ) : (
                        customer.profile_image ? 
                        <img src={customer.profile_image} className="rounded-circle border shadow-sm" style={{width:'100px', height:'100px', objectFit:'cover'}} /> : 
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto" style={{width:'100px', height:'100px', fontSize:'2.5rem'}}>{customer.name.charAt(0).toUpperCase()}</div>
                    )}
                 </div>

                 {isEditing ? (
                     <div className="text-start">
                         <input className="form-control mb-2" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                         <input className="form-control mb-2" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                         <textarea className="form-control mb-3" rows="2" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}></textarea>
                         <div className="d-flex gap-2"><button className="btn btn-success flex-grow-1" onClick={saveEdit}>Save</button><button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button></div>
                     </div>
                 ) : (
                     <>
                        <h4 className="fw-bold">{customer.name}</h4>
                        <div className="text-muted mb-3">{customer.phone}</div>
                        <p className="small text-secondary px-3">{customer.address || "No Address Provided"}</p>
                        <button className="btn btn-sm btn-outline-primary mb-3" onClick={startEdit}><i className="bi bi-pencil me-1"></i> Edit Profile</button>
                        <hr />
                        <div className="row text-center">
                            <div className="col-4 border-end"><small className="text-muted">Visits</small><h5 className="fw-bold">{history.length}</h5></div>
                            <div className="col-4 border-end"><small className="text-muted">Spent</small><h5 className="fw-bold text-success">₹{totalSpent.toLocaleString()}</h5></div>
                            <div className="col-4"><small className="text-muted">Pending</small><h5 className={`fw-bold ${totalDebt > 0 ? 'text-danger' : 'text-success'}`}>₹{totalDebt.toLocaleString()}</h5></div>
                        </div>
                     </>
                 )}
              </div>
           </div>
        </div>

        {/* HISTORY TABLE */}
        <div className="col-md-8">
            <div className="card shadow-sm h-100">
                <div className="card-header bg-white fw-bold">Purchase History</div>
                <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light"><tr><th>Date</th><th>Invoice</th><th>Total</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead>
                        <tbody>
                            {history.map((sale, index) => (
                                <tr key={sale.id} className={sale.balance_amount > 0 ? "table-warning" : ""}> 
                                    <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                                    <td><span className="badge bg-light text-dark border">{sale.invoice_number}</span></td>
                                    <td className="fw-bold">₹{parseFloat(sale.final_amount).toLocaleString()}</td>
                                    <td className="text-success">₹{parseFloat(sale.paid_amount).toLocaleString()}</td>
                                    <td>
                                        {sale.balance_amount > 0 ? (
                                            <span className="badge bg-danger">BAL: ₹{sale.balance_amount}</span>
                                        ) : (
                                            <span className="badge bg-success">PAID</span>
                                        )}
                                    </td>
                                    <td>
                                        {index === 0 && (
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteBill(sale.id)} title="Void / Delete Bill">
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan="6" className="text-center py-4">No purchases yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetails;