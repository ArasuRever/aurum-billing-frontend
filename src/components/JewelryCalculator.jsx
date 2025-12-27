import React, { useState } from 'react';

function JewelryCalculator({ onClose, goldRate }) {
    const [weight, setWeight] = useState('');
    const [wastage, setWastage] = useState('');
    const [mc, setMc] = useState('');
    const [rate, setRate] = useState(goldRate || 0);

    const pure = weight && wastage ? (parseFloat(weight) * (parseFloat(wastage)/100)).toFixed(3) : 0;
    const finalWt = (parseFloat(weight || 0) + parseFloat(pure)).toFixed(3);
    const total = Math.round(finalWt * rate + parseFloat(mc || 0));

    return (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-sm">
                <div className="modal-content">
                    <div className="modal-header bg-dark text-white p-2">
                        <h6 className="m-0"><i className="bi bi-calculator me-2"></i>Quick Calc</h6>
                        <button className="btn-close btn-close-white small" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-3">
                        <div className="mb-2">
                            <label className="small text-muted">Weight (g)</label>
                            <input type="number" className="form-control form-control-sm fw-bold" value={weight} onChange={e=>setWeight(e.target.value)} autoFocus />
                        </div>
                        <div className="row g-2 mb-2">
                            <div className="col-6">
                                <label className="small text-muted">Wst %</label>
                                <input type="number" className="form-control form-control-sm" value={wastage} onChange={e=>setWastage(e.target.value)} />
                            </div>
                            <div className="col-6">
                                <label className="small text-muted">Add Wt</label>
                                <input className="form-control form-control-sm bg-light" value={pure} disabled />
                            </div>
                        </div>
                        <div className="mb-2">
                            <label className="small text-muted">Rate</label>
                            <input type="number" className="form-control form-control-sm" value={rate} onChange={e=>setRate(e.target.value)} />
                        </div>
                        <div className="mb-3">
                            <label className="small text-muted">Making (₹)</label>
                            <input type="number" className="form-control form-control-sm" value={mc} onChange={e=>setMc(e.target.value)} />
                        </div>
                        <div className="alert alert-success mb-0 py-2 text-center">
                            <small>Total Estimate</small>
                            <h4 className="fw-bold m-0">₹{total.toLocaleString()}</h4>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default JewelryCalculator;