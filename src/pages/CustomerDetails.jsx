import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import InvoiceTemplate from '../components/InvoiceTemplate'; 

// --- PRINT CSS (Matches Billing.jsx) ---
const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #printable-invoice, #printable-invoice * { visibility: visible; }
    #printable-invoice { 
      position: absolute; 
      left: 0; 
      top: 0; 
      width: 100%; 
      margin: 0; 
      padding: 0; 
      background: white; 
      color: black; 
    }
    .btn-close, .modal-footer, .no-print { display: none !important; }
  }
`;

function CustomerDetails() {
  const { phone } = useParams();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [data, setData] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null); 
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [restoreMode, setRestoreMode] = useState('REVERT_DEBT'); 

  // Invoice View State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewInvoiceData, setViewInvoiceData] = useState(null); 

  // Chit States
  const [chits, setChits] = useState([]);
  const [showChitModal, setShowChitModal] = useState(false); 
  const [newChit, setNewChit] = useState({ plan_type: 'AMOUNT', plan_name: '', monthly_amount: '' });
  const [showChitPayModal, setShowChitPayModal] = useState(false); 
  const [selectedChit, setSelectedChit] = useState(null);
  const [chitInstallmentAmount, setChitInstallmentAmount] = useState('');

  // --- INJECT PRINT STYLES ---
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  useEffect(() => { 
      loadData(); 
      api.getBusinessSettings().then(res => setBusinessProfile(res.data)).catch(console.error);
  }, [phone]);

  const loadData = async () => {
    try { 
        const res = await api.getCustomerDetails(phone); 
        setData(res.data);
        if (res.data.customer && res.data.customer.id) {
            const chitRes = await api.getCustomerChits(res.data.customer.id);
            setChits(chitRes.data);
        }
    } catch (err) { alert("Error loading customer data"); }
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

  // --- REGULAR PAYMENTS ---
  const openPayModal = (sale) => {
      setSelectedBill(sale);
      setPayAmount(sale.balance_amount);
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
          loadData();
      } catch (err) { alert(err.response?.data?.error || "Payment Failed"); }
  };

  // --- DELETE BILL ---
  const promptDeleteBill = (sale) => {
      setBillToDelete(sale);
      setRestoreMode('REVERT_DEBT'); 
      setShowDeleteModal(true);
  };

  const confirmDeleteBill = async () => {
    if(!billToDelete) return;
    try { 
        await api.deleteBill(billToDelete.id, restoreMode); 
        setShowDeleteModal(false);
        setBillToDelete(null);
        loadData(); 
        alert("Bill Voided & Inventory Restored Successfully");
    } catch(err) { alert("Error deleting: " + (err.response?.data?.error || err.message)); }
  };

  // --- VIEW INVOICE ---
  const handleViewInvoice = async (sale) => {
      try {
          const res = await api.getInvoiceDetails(sale.id);
          const { sale: saleData, items, exchangeItems } = res.data;

          const formattedData = {
              invoice_id: saleData.invoice_number,
              date: saleData.created_at || saleData.invoice_date,
              customer: {
                  name: saleData.customer_name,
                  phone: saleData.customer_phone,
                  address: saleData.customer_address || '', 
                  gstin: saleData.cust_gstin || ''
              },
              items: items.map(item => ({
                  item_name: item.item_name,
                  gross_weight: item.sold_weight,
                  rate: item.sold_rate,
                  total: item.total_item_price,
                  wastage_percent: item.making_charges_collected || 0,
                  hsn_code: item.hsn_code,
                  item_id: item.item_id
              })),
              totals: {
                  grossTotal: parseFloat(saleData.gross_total || 0),
                  cgst: parseFloat(saleData.cgst_amount || 0),
                  sgst: parseFloat(saleData.sgst_amount || 0),
                  totalDiscount: parseFloat(saleData.discount || 0),
                  exchangeTotal: parseFloat(saleData.exchange_total || 0),
                  netPayable: parseFloat(saleData.final_amount || 0)
              },
              includeGST: saleData.is_gst_bill,
              exchangeItems: (exchangeItems || []).map(ex => ({
                  name: ex.item_name,
                  gross_weight: ex.gross_weight,
                  less_weight: ex.less_weight,
                  net_weight: ex.net_weight,
                  rate: ex.rate,
                  total: ex.total_amount
              })),
              type: 'TAX INVOICE'
          };

          setViewInvoiceData(formattedData);
          setShowInvoiceModal(true);
      } catch(err) { 
          console.error(err);
          alert("Could not fetch invoice details"); 
      }
  };

  // --- CHIT LOGIC ---
  const handleCreateChit = async () => {
      if(!newChit.plan_name || !newChit.monthly_amount) return alert("Fill all fields");
      try {
          await api.createChitPlan({
              customer_id: data.customer.id,
              ...newChit
          });
          setShowChitModal(false);
          loadData();
          setNewChit({ plan_type: 'AMOUNT', plan_name: '', monthly_amount: '' });
      } catch(err) { alert(err.response?.data?.error || "Failed"); }
  };

  const openChitPayModal = (chit) => {
      setSelectedChit(chit);
      setChitInstallmentAmount(chit.monthly_amount); 
      setShowChitPayModal(true);
  };

  const handleChitPayment = async () => {
      if(!chitInstallmentAmount || chitInstallmentAmount <= 0) return alert("Invalid Amount");
      try {
          const res = await api.payChitInstallment({
              chit_id: selectedChit.id,
              amount: chitInstallmentAmount
          });
          alert("Payment Successful!");
          setShowChitPayModal(false);
          loadData();
      } catch(err) { alert(err.response?.data?.error || "Failed"); }
  };

  const handleAddBonus = async (chitId) => {
      if(!window.confirm("Add 12th Month Bonus? This will mark the plan as MATURED.")) return;
      try {
          await api.addChitBonus(chitId);
          loadData();
          alert("Bonus Added!");
      } catch(err) { alert("Error adding bonus"); }
  };

  if (!data) return <div className="p-5 text-center">Loading...</div>;

  const { customer, history, payments } = data; 
  const totalSpent = history.reduce((acc, curr) => acc + parseFloat(curr.final_amount), 0);
  const totalDebt = history.reduce((acc, curr) => acc + parseFloat(curr.balance_amount || 0), 0);

  return (
    <div className="container-fluid pb-5">
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

        {/* RIGHT COLUMN: TABS */}
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
                            <button className="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#chits">
                                <i className="bi bi-piggy-bank me-2 text-warning"></i>Savings Scheme
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
                    
                    {/* TAB 1: SAVINGS SCHEME */}
                    <div className="tab-pane fade" id="chits">
                         <div className="p-3 d-flex justify-content-between align-items-center bg-light border-bottom">
                            <h6 className="mb-0 fw-bold">Active Plans</h6>
                            <button className="btn btn-sm btn-primary" onClick={() => setShowChitModal(true)}>
                                <i className="bi bi-plus-circle me-1"></i> New Plan
                            </button>
                        </div>
                        <div className="p-3">
                             {chits.length === 0 ? <p className="text-center text-muted my-4">No Active Plans</p> : (
                                <div className="row g-3">
                                    {chits.map(chit => {
                                        const progress = Math.min((chit.installments_paid / chit.duration_months) * 100, 100);
                                        const isMatured = chit.status === 'MATURED';
                                        return (
                                            <div key={chit.id} className="col-md-6">
                                                <div className={`card h-100 ${isMatured ? 'border-success bg-success bg-opacity-10' : 'border-secondary'}`}>
                                                    <div className="card-body">
                                                        <div className="d-flex justify-content-between mb-2">
                                                            <h6 className="fw-bold">{chit.plan_name}</h6>
                                                            <span className={`badge ${chit.plan_type === 'GOLD' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>{chit.plan_type}</span>
                                                        </div>
                                                        <div className="small text-muted mb-3">
                                                            Monthly: ₹{chit.monthly_amount} | Tenure: {chit.duration_months} Months
                                                        </div>
                                                        <div className="progress mb-2" style={{height:'8px'}}>
                                                            <div className="progress-bar bg-success" style={{width: `${progress}%`}}></div>
                                                        </div>
                                                        <div className="d-flex justify-content-between small text-muted mb-3">
                                                            <span>{chit.installments_paid} Paid</span>
                                                            <span>{chit.duration_months} Total</span>
                                                        </div>
                                                        <div className="row g-0 border rounded mb-3 bg-white">
                                                            <div className="col-6 border-end p-2 text-center">
                                                                <small className="d-block text-muted">Total Saved</small>
                                                                <span className="fw-bold text-success">₹{parseFloat(chit.total_paid).toLocaleString()}</span>
                                                            </div>
                                                            {chit.plan_type === 'GOLD' ? (
                                                                <div className="col-6 p-2 text-center">
                                                                    <small className="d-block text-muted">Accumulated</small>
                                                                    <span className="fw-bold text-warning">{parseFloat(chit.total_gold_weight).toFixed(3)}g</span>
                                                                </div>
                                                            ) : (
                                                                 <div className="col-6 p-2 text-center">
                                                                    <small className="d-block text-muted">Bonus</small>
                                                                    <span className="fw-bold">{isMatured ? 'Yes' : 'Pending'}</span>
                                                                 </div>
                                                            )}
                                                        </div>
                                                        <div className="d-flex gap-2">
                                                            {!isMatured && (
                                                                <button className="btn btn-sm btn-outline-success flex-grow-1" onClick={() => openChitPayModal(chit)}>Pay Installment</button>
                                                            )}
                                                            {!isMatured && chit.plan_type === 'AMOUNT' && chit.installments_paid >= 11 && (
                                                                <button className="btn btn-sm btn-warning flex-grow-1" onClick={() => handleAddBonus(chit.id)}>Add Bonus</button>
                                                            )}
                                                            {isMatured && <div className="w-100 text-center text-success fw-bold small py-1"><i className="bi bi-check-circle-fill me-1"></i> MATURED</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TAB 2: PURCHASE HISTORY */}
                    <div className="tab-pane fade show active" id="history">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light"><tr><th>Date</th><th>Invoice</th><th>Total</th><th>Paid</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
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
                                            <td className="text-end">
                                                {sale.balance_amount > 0 && (
                                                    <button className="btn btn-sm btn-success me-1" title="Pay Balance" onClick={() => openPayModal(sale)}>
                                                        <i className="bi bi-currency-rupee"></i>
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-warning me-1" title="Return / Exchange" onClick={() => navigate(`/billing/return?saleId=${sale.invoice_number || sale.id}`)}>
                                                    <i className="bi bi-arrow-counterclockwise"></i>
                                                </button>
                                                <button className="btn btn-sm btn-info me-1 text-white" title="View Bill" onClick={() => handleViewInvoice(sale)}>
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" title="Void Bill" onClick={() => promptDeleteBill(sale)}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && <tr><td colSpan="6" className="text-center py-4">No purchases yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TAB 3: PAYMENT LOG */}
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
                                    )) : <tr><td colSpan="5" className="text-center py-4">No extra payments</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- MODAL: CREATE CHIT --- */}
      {showChitModal && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h5 className="modal-title">New Savings Plan</h5>
                          <button className="btn-close" onClick={() => setShowChitModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          <div className="mb-3">
                              <label className="form-label">Plan Name</label>
                              <input className="form-control" placeholder="e.g. Monthly Gold Saver" 
                                  value={newChit.plan_name} onChange={e => setNewChit({...newChit, plan_name: e.target.value})} />
                          </div>
                          <div className="mb-3">
                              <label className="form-label">Plan Type</label>
                              <select className="form-select" value={newChit.plan_type} onChange={e => setNewChit({...newChit, plan_type: e.target.value})}>
                                  <option value="AMOUNT">Fixed Amount + Bonus (11+1)</option>
                                  <option value="GOLD">Gold Accumulation (Weight)</option>
                              </select>
                          </div>
                          <div className="mb-3">
                              <label className="form-label">Monthly Amount</label>
                              <input type="number" className="form-control" placeholder="e.g. 1000"
                                  value={newChit.monthly_amount} onChange={e => setNewChit({...newChit, monthly_amount: e.target.value})} />
                          </div>
                      </div>
                      <div className="modal-footer">
                          <button className="btn btn-secondary" onClick={() => setShowChitModal(false)}>Cancel</button>
                          <button className="btn btn-success" onClick={handleCreateChit}>Create Plan</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: PAY CHIT --- */}
      {showChitPayModal && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header bg-success text-white">
                          <h5 className="modal-title">Pay Installment</h5>
                          <button className="btn-close btn-close-white" onClick={() => setShowChitPayModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          <p className="mb-2"><strong>Plan:</strong> {selectedChit?.plan_name}</p>
                          <div className="mb-3">
                              <label className="form-label">Amount</label>
                              <input type="number" className="form-control form-control-lg"
                                  value={chitInstallmentAmount} onChange={e => setChitInstallmentAmount(e.target.value)} />
                          </div>
                      </div>
                      <div className="modal-footer">
                          <button className="btn btn-secondary" onClick={() => setShowChitPayModal(false)}>Cancel</button>
                          <button className="btn btn-success" onClick={handleChitPayment}>Confirm Payment</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: BILL PAYMENT --- */}
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

      {/* --- MODAL: DELETE CONFIRMATION --- */}
      {showDeleteModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.6)'}}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-danger text-white">
                        <h5 className="modal-title">⚠ Void Bill & Restore Stock</h5>
                        <button className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        <p className="fw-bold">Are you sure you want to void this bill?</p>
                        <p className="text-muted small">Items will be added back to inventory. Please select how to handle Neighbour/B2B items:</p>
                        <div className="list-group">
                            <label className={`list-group-item list-group-item-action ${restoreMode === 'REVERT_DEBT' ? 'active' : ''}`}>
                                <input className="form-check-input me-2" type="radio" checked={restoreMode === 'REVERT_DEBT'} onChange={() => setRestoreMode('REVERT_DEBT')} />
                                <div><div className="fw-bold">Revert Debt (Recommended)</div><div className="small">Return item to neighbour shop. Removes the debt we owe them.</div></div>
                            </label>
                            <label className={`list-group-item list-group-item-action ${restoreMode === 'TAKE_OWNERSHIP' ? 'active' : ''}`}>
                                <input className="form-check-input me-2" type="radio" checked={restoreMode === 'TAKE_OWNERSHIP'} onChange={() => setRestoreMode('TAKE_OWNERSHIP')} />
                                <div><div className="fw-bold">Take Ownership</div><div className="small">Keep item in OUR stock. We still owe them money (Debt remains).</div></div>
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        <button className="btn btn-danger fw-bold" onClick={confirmDeleteBill}>Confirm Void</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL: VIEW INVOICE (FIXED PRINTING) --- */}
      {showInvoiceModal && viewInvoiceData && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content" style={{height: '90vh'}}>
                      <div className="modal-header bg-dark text-white">
                          <h5 className="modal-title">Invoice Preview</h5>
                          <button className="btn-close btn-close-white" onClick={() => setShowInvoiceModal(false)}></button>
                      </div>
                      <div className="modal-body overflow-auto p-0 bg-secondary bg-opacity-10">
                          {/* Invoice content wraps in a div but standard printing reads #printable-invoice via CSS */}
                          <InvoiceTemplate 
                             data={viewInvoiceData}
                             businessProfile={businessProfile} 
                          />
                      </div>
                      <div className="modal-footer bg-light">
                          <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Close</button>
                          {/* Changed to window.print() which works with the new printStyles CSS */}
                          <button className="btn btn-primary fw-bold" onClick={() => window.print()}>
                              <i className="bi bi-printer me-2"></i>PRINT
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

export default CustomerDetails;