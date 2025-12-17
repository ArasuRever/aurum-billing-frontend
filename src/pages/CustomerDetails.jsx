import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function CustomerDetails() {
  const { phone } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');

  useEffect(() => { loadData(); }, [phone]);

  const loadData = async () => {
    try { const res = await api.getCustomerDetails(phone); setData(res.data); } catch (err) { alert("Error loading customer data"); }
  };

  // --- PROFILE EDIT ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditForm({ ...editForm, profile_image: reader.result });
      reader.readAsDataURL(file);
    }
  };
  const saveEdit = async () => {
    try {
        await api.updateCustomer(editForm.id, editForm);
        setIsEditing(false);
        if (editForm.phone !== phone) navigate(`/customers/${editForm.phone}`); else loadData();
    } catch(err) { alert("Error updating"); }
  };

  // --- PAYMENTS ---
  const openPayModal = (sale) => {
      setSelectedBill(sale);
      setPayAmount(sale.balance_amount); // Default to full balance
      setShowPayModal(true);
  };

  const handlePaymentSubmit = async () => {
      if(!payAmount || payAmount <= 0) return alert("Enter valid amount");
      try {
          await api.addBalancePayment({
              sale_id: selectedBill.id,
              amount: payAmount,
              payment_mode: payMode,
              note: "Balance Payment"
          });
          setShowPayModal(false);
          loadData(); // Refresh to see updated balance
      } catch (err) { alert(err.response?.data?.error || "Payment Failed"); }
  };

  const handleDeleteBill = async (saleId) => {
    if(!window.confirm("Are you sure? This will VOID the bill and Restore Inventory.")) return;
    try { await api.deleteBill(saleId); loadData(); } catch(err) { alert("Error deleting"); }
  };

  if (!data) return <div className="p-5 text-center">Loading...</div>;

  const { customer, history, payments } = data; // Now includes 'payments' array
  const totalSpent = history.reduce((acc, curr) => acc + parseFloat(curr.final_amount), 0);
  const totalDebt = history.reduce((acc, curr) => acc + parseFloat(curr.balance_amount || 0), 0);

  return (
    <div className="container-fluid">
      {/* HEADER */}
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/customers')}><i className="bi bi-arrow-left"></i></button>
        <h3 className="fw-bold mb-0">Customer Profile</h3>
      </div>

      <div className="row g-4">
        {/* LEFT COLUMN: PROFILE CARD */}
        <div className="col-md-4">
           <div className="card shadow-sm h-100">
              <div className="card-body text-center p-4">
                 {/* PROFILE IMAGE & EDIT LOGIC (Same as before) */}
                 <div className="mb-3 position-relative d-inline-block">
                    {isEditing ? (
                        <>
                           <label htmlFor="editImg" style={{cursor:'pointer'}}>
                                {editForm.profile_image ? <img src={editForm.profile_image} className="rounded-circle border opacity-75" style={{width:'100px', height:'100px', objectFit:'cover'}} /> : <div className="bg-light rounded-circle border d-flex justify-content-center align-items-center" style={{width:'100px', height:'100px'}}><i className="bi bi-camera"></i></div>}
                           </label>
                           <input type="file" id="editImg" className="d-none" onChange={handleImageUpload} />
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
                        <button className="btn btn-sm btn-outline-primary mb-3" onClick={() => { setEditForm({ ...customer }); setIsEditing(true); }}><i className="bi bi-pencil me-1"></i> Edit Profile</button>
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

        {/* RIGHT COLUMN: TABS (HISTORY & PAYMENTS) */}
        <div className="col-md-8">
            <div className="card shadow-sm h-100">
                <div className="card-header bg-white p-0">
                    <ul className="nav nav-tabs card-header-tabs m-0" id="custTabs" role="tablist">
                        <li className="nav-item">
                            <button className="nav-link active fw-bold" data-bs-toggle="tab" data-bs-target="#history">
                                <i className="bi bi-cart me-2"></i>Purchase History
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#payments">
                                <i className="bi bi-cash-stack me-2"></i>Payment Log
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="card-body p-0 tab-content">
                    {/* TAB 1: PURCHASE HISTORY */}
                    <div className="tab-pane fade show active" id="history">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light"><tr><th>Date</th><th>Invoice</th><th>Total</th><th>Paid</th><th>Balance</th><th>Action</th></tr></thead>
                                <tbody>
                                    {history.map((sale) => (
                                        <tr key={sale.id} className={sale.balance_amount > 0 ? "table-warning" : ""}> 
                                            <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                                            <td><span className="badge bg-light text-dark border">{sale.invoice_number}</span></td>
                                            <td className="fw-bold">₹{parseFloat(sale.final_amount).toLocaleString()}</td>
                                            <td className="text-success">₹{parseFloat(sale.paid_amount).toLocaleString()}</td>
                                            <td>
                                                {sale.balance_amount > 0 ? 
                                                    <span className="badge bg-danger">BAL: ₹{sale.balance_amount}</span> : 
                                                    <span className="badge bg-success">PAID</span>
                                                }
                                            </td>
                                            <td>
                                                {sale.balance_amount > 0 ? (
                                                    <button className="btn btn-sm btn-primary me-2" onClick={() => openPayModal(sale)}>
                                                        <i className="bi bi-currency-rupee me-1"></i>Pay
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-sm btn-outline-secondary me-2" disabled><i className="bi bi-check-lg"></i></button>
                                                )}
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteBill(sale.id)} title="Delete Bill"><i className="bi bi-trash"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && <tr><td colSpan="6" className="text-center py-4">No purchases yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TAB 2: PAYMENT LOG */}
                    <div className="tab-pane fade" id="payments">
                         <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light"><tr><th>Date</th><th>Bill Ref</th><th>Amount</th><th>Mode</th><th>Note</th></tr></thead>
                                <tbody>
                                    {payments && payments.length > 0 ? payments.map((p, i) => (
                                        <tr key={i}>
                                            <td>{new Date(p.payment_date).toLocaleString()}</td>
                                            <td><span className="badge bg-light text-dark border">{p.invoice_number}</span></td>
                                            <td className="fw-bold text-success">+ ₹{parseFloat(p.amount).toLocaleString()}</td>
                                            <td>{p.payment_mode}</td>
                                            <td className="small text-muted">{p.note || '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="text-center py-4">No extra payments recorded</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header bg-primary text-white">
                          <h5 className="modal-title">Record Payment</h5>
                          <button className="btn-close btn-close-white" onClick={() => setShowPayModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          <div className="alert alert-warning">
                              <strong>Bill:</strong> {selectedBill?.invoice_number} <br/>
                              <strong>Outstanding Balance:</strong> ₹{selectedBill?.balance_amount}
                          </div>
                          <div className="mb-3">
                              <label className="form-label">Amount Received</label>
                              <input type="number" className="form-control form-control-lg" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                          </div>
                          <div className="mb-3">
                              <label className="form-label">Payment Mode</label>
                              <select className="form-select" value={payMode} onChange={e => setPayMode(e.target.value)}>
                                  <option value="CASH">Cash</option>
                                  <option value="UPI">UPI / GPay</option>
                                  <option value="CARD">Card</option>
                                  <option value="BANK">Bank Transfer</option>
                              </select>
                          </div>
                      </div>
                      <div className="modal-footer">
                          <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                          <button className="btn btn-success px-4" onClick={handlePaymentSubmit}>Confirm Payment</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default CustomerDetails;