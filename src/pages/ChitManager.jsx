import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

function ChitManager() {
    const navigate = useNavigate();
    const [activeCustomers, setActiveCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Expansion State (Which customer is expanded)
    const [expandedCustId, setExpandedCustId] = useState(null);
    const [expandedChits, setExpandedChits] = useState([]); // Chits for the expanded customer

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedChit, setSelectedChit] = useState(null);
    const [chitHistory, setChitHistory] = useState([]);
    
    // Payment Form
    const [payMonths, setPayMonths] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchActiveCustomers();
    }, []);

    const fetchActiveCustomers = async () => {
        try {
            const res = await api.getActiveChitCustomers();
            setActiveCustomers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCustomer = async (customerId) => {
        if (expandedCustId === customerId) {
            setExpandedCustId(null);
            setExpandedChits([]);
        } else {
            setExpandedCustId(customerId);
            try {
                const res = await api.getCustomerChits(customerId);
                // Filter only ACTIVE chits for this view if preferred, or show all
                const activeOnly = res.data.filter(c => c.status === 'ACTIVE');
                setExpandedChits(activeOnly);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const openChitModal = async (chit) => {
        try {
            const res = await api.getChitDetails(chit.id);
            setSelectedChit(res.data.plan);
            setChitHistory(res.data.history);
            setPayMonths(1); // Default to 1 month
            setShowModal(true);
        } catch (err) {
            alert("Failed to load details");
        }
    };

    const handleBulkPayment = async () => {
        if (payMonths < 1) return alert("Months cannot be less than 1");
        if (!selectedChit) return;

        setIsSubmitting(true);
        try {
            // Loop to Create Separate Entries
            // The requirement is: "record it on the same date and display separately"
            // So we call the API 'payMonths' times.
            
            const promises = [];
            for (let i = 0; i < payMonths; i++) {
                promises.push(api.payChitInstallment({
                    chit_id: selectedChit.id,
                    amount: selectedChit.monthly_amount,
                    payment_date: new Date() // Same date
                }));
            }

            await Promise.all(promises);

            alert("Payment Recorded Successfully!");
            setShowModal(false);
            
            // Refresh Data
            fetchActiveCustomers(); 
            if (expandedCustId) {
                const res = await api.getCustomerChits(expandedCustId);
                setExpandedChits(res.data.filter(c => c.status === 'ACTIVE'));
            }

        } catch (err) {
            console.error(err);
            alert("Error processing payment: " + (err.response?.data?.error || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

    return (
        <div className="container-fluid pb-5">
            <h3 className="fw-bold mb-4"><i className="bi bi-piggy-bank me-2 text-warning"></i>Active Chit Customers</h3>
            
            {activeCustomers.length === 0 ? (
                <div className="alert alert-light text-center border">No active chit plans found.</div>
            ) : (
                <div className="accordion shadow-sm" id="chitAccordion">
                    {activeCustomers.map(cust => (
                        <div className="accordion-item" key={cust.id}>
                            <h2 className="accordion-header">
                                <button 
                                    className={`accordion-button ${expandedCustId === cust.id ? '' : 'collapsed'}`} 
                                    type="button" 
                                    onClick={() => toggleCustomer(cust.id)}
                                >
                                    <div className="d-flex align-items-center w-100 me-3">
                                        <div className="me-3">
                                            {cust.profile_image ? (
                                                <img src={cust.profile_image} className="rounded-circle" width="40" height="40" style={{objectFit:'cover'}} />
                                            ) : (
                                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width:'40px', height:'40px'}}>
                                                    {cust.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="fw-bold">{cust.name}</div>
                                            <div className="small text-muted">{cust.phone}</div>
                                        </div>
                                        <span className="badge bg-success rounded-pill">{cust.active_count} Active Plans</span>
                                    </div>
                                </button>
                            </h2>
                            <div className={`accordion-collapse collapse ${expandedCustId === cust.id ? 'show' : ''}`}>
                                <div className="accordion-body bg-light">
                                    {expandedChits.length === 0 ? (
                                        <p className="text-center text-muted">Loading plans...</p>
                                    ) : (
                                        <div className="row g-3">
                                            {expandedChits.map(chit => {
                                                 const progress = Math.min((chit.installments_paid / chit.duration_months) * 100, 100);
                                                 return (
                                                    <div className="col-md-6 col-lg-4" key={chit.id}>
                                                        <div 
                                                            className="card h-100 shadow-sm border-0 cursor-pointer chit-card-hover" 
                                                            onClick={() => openChitModal(chit)}
                                                            style={{cursor: 'pointer', transition: 'transform 0.2s'}}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                                        >
                                                            <div className="card-body">
                                                                <div className="d-flex justify-content-between mb-2">
                                                                    <h6 className="fw-bold text-primary mb-0">{chit.plan_name}</h6>
                                                                    <span className={`badge ${chit.plan_type === 'GOLD' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>{chit.plan_type}</span>
                                                                </div>
                                                                <div className="small text-muted mb-3">
                                                                    Monthly: ₹{chit.monthly_amount}
                                                                </div>
                                                                
                                                                <div className="progress mb-2" style={{height:'6px'}}>
                                                                    <div className="progress-bar bg-success" style={{width: `${progress}%`}}></div>
                                                                </div>
                                                                <div className="d-flex justify-content-between small text-muted">
                                                                    <span>{chit.installments_paid}/{chit.duration_months} Paid</span>
                                                                    <span className="fw-bold text-dark">Total: ₹{parseFloat(chit.total_paid).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                 );
                                            })}
                                        </div>
                                    )}
                                    <div className="text-end mt-3">
                                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/customers/${cust.phone}`)}>
                                            View Full Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* PAYMENT & HISTORY MODAL */}
            {showModal && selectedChit && (
                <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <div>
                                    <h5 className="modal-title fw-bold">{selectedChit.plan_name}</h5>
                                    <small className="opacity-75">{selectedChit.plan_type} PLAN | Monthly: ₹{selectedChit.monthly_amount}</small>
                                </div>
                                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-4">
                                    {/* LEFT: PAYMENT FORM */}
                                    <div className="col-md-5 border-end">
                                        <h6 className="fw-bold mb-3 text-success">Make Payment</h6>
                                        
                                        <div className="mb-3">
                                            <label className="form-label text-muted small fw-bold">NO. OF MONTHS / INSTALLMENTS</label>
                                            <input 
                                                type="number" 
                                                className="form-control form-control-lg fw-bold text-center" 
                                                value={payMonths} 
                                                min="1"
                                                max={selectedChit.duration_months - selectedChit.installments_paid}
                                                onChange={e => setPayMonths(parseInt(e.target.value) || 0)} 
                                            />
                                        </div>

                                        <div className="card bg-light border-0 mb-3">
                                            <div className="card-body text-center">
                                                <small className="text-muted d-block">Total Payable Amount</small>
                                                <h3 className="fw-bold text-dark mb-0">₹{(payMonths * selectedChit.monthly_amount).toLocaleString()}</h3>
                                            </div>
                                        </div>

                                        {selectedChit.plan_type === 'GOLD' && (
                                            <div className="alert alert-warning small py-2 mb-3">
                                                <i className="bi bi-info-circle me-1"></i> 
                                                Will be converted to Gold Weight using today's <strong>999 BAR Rate</strong>.
                                            </div>
                                        )}

                                        <button 
                                            className="btn btn-success w-100 py-2 fw-bold" 
                                            onClick={handleBulkPayment}
                                            disabled={isSubmitting || payMonths < 1}
                                        >
                                            {isSubmitting ? 'Processing...' : `PAY FOR ${payMonths} MONTHS`}
                                        </button>
                                    </div>

                                    {/* RIGHT: HISTORY TABLE */}
                                    <div className="col-md-7">
                                        <h6 className="fw-bold mb-3 text-secondary">Transaction History</h6>
                                        <div className="table-responsive border rounded" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                            <table className="table table-sm table-hover mb-0 small">
                                                <thead className="table-light sticky-top">
                                                    <tr>
                                                        <th>Date</th>
                                                        <th className="text-end">Amount</th>
                                                        {selectedChit.plan_type === 'GOLD' && <th className="text-end">Weight</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {chitHistory.map((txn, i) => (
                                                        <tr key={i}>
                                                            <td>{new Date(txn.payment_date).toLocaleDateString()}</td>
                                                            <td className="text-end fw-bold text-success">₹{parseFloat(txn.amount).toLocaleString()}</td>
                                                            {selectedChit.plan_type === 'GOLD' && (
                                                                <td className="text-end text-warning fw-bold bg-dark bg-opacity-75">
                                                                    {parseFloat(txn.gold_weight).toFixed(3)}g
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                    {chitHistory.length === 0 && (
                                                        <tr><td colSpan="3" className="text-center py-4 text-muted">No payments yet</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChitManager;