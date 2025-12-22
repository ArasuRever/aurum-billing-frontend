import React, { useEffect, useState } from 'react';
import { api } from '../api';

function LedgerDashboard() {
  const [stats, setStats] = useState({ 
      assets: { cash_balance: 0, bank_balance: 0 }, 
      today_income: 0, 
      today_expense: 0 
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'GENERAL', payment_mode: 'CASH' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        setLoading(true);
        const s = await api.getLedgerStats();
        // Safe check using optional chaining to prevent crashes
        if(s.data && s.data.assets) setStats(s.data);
        
        const h = await api.getLedgerHistory();
        if(Array.isArray(h.data)) setHistory(h.data);
    } catch (err) { 
        console.error("Ledger Load Error:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleAddExpense = async () => {
      if(!expenseForm.amount || !expenseForm.description) return alert("Fill details");
      try {
          await api.addExpense(expenseForm);
          alert("Expense Recorded");
          setShowExpenseModal(false);
          setExpenseForm({ description: '', amount: '', category: 'GENERAL', payment_mode: 'CASH' });
          loadData();
      } catch(err) { alert("Failed"); }
  };

  // Helper for safe number display
  const formatCurrency = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? "0.00" : num.toLocaleString();
  };

  const getRowColor = (type, direction) => {
      if(direction === 'IN') return 'table-success'; 
      if(type === 'EXPENSE') return 'table-danger'; 
      if(direction === 'OUT') return 'table-warning'; 
      return '';
  };

  if(loading && !stats.assets) return <div className="p-5 text-center text-muted">Loading Financial Data...</div>;

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-wallet2 me-2"></i>Master In-Shop Ledger</h2>
        <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={loadData}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
            <button className="btn btn-danger shadow-sm fw-bold" onClick={() => setShowExpenseModal(true)}>
                <i className="bi bi-dash-circle me-2"></i>Add Expense
            </button>
        </div>
      </div>

      {/* 1. ASSET CARDS */}
      <div className="row g-3 mb-4">
          <div className="col-md-3">
              <div className="card bg-success text-white shadow-sm h-100">
                  <div className="card-body">
                      <div className="opacity-75 small fw-bold">CASH IN HAND</div>
                      <div className="display-6 fw-bold">₹{formatCurrency(stats?.assets?.cash_balance)}</div>
                  </div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="card bg-primary text-white shadow-sm h-100">
                  <div className="card-body">
                      <div className="opacity-75 small fw-bold">ONLINE / BANK</div>
                      <div className="display-6 fw-bold">₹{formatCurrency(stats?.assets?.bank_balance)}</div>
                  </div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="card border-success shadow-sm h-100">
                  <div className="card-body">
                      <div className="text-success small fw-bold">TODAY'S INCOME</div>
                      <h3 className="fw-bold mb-0">+ ₹{formatCurrency(stats?.today_income)}</h3>
                  </div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="card border-danger shadow-sm h-100">
                  <div className="card-body">
                      <div className="text-danger small fw-bold">TODAY'S EXPENSE</div>
                      <h3 className="fw-bold mb-0">- ₹{formatCurrency(stats?.today_expense)}</h3>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. TRANSACTION HISTORY (THE RIVER) */}
      <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3"><h5 className="mb-0 fw-bold">Recent Transactions (Money & Metal)</h5></div>
          <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                      <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Mode</th>
                          <th className="text-end">Metal</th>
                          <th className="text-end">Amount</th>
                      </tr>
                  </thead>
                  <tbody>
                      {history.map((txn, i) => (
                          <tr key={i} className={getRowColor(txn.type, txn.direction) + " bg-opacity-10"}>
                              <td className="small text-muted">{new Date(txn.date).toLocaleString()}</td>
                              <td><span className={`badge ${txn.direction === 'IN' ? 'bg-success' : 'bg-danger'}`}>{txn.type.replace('_', ' ')}</span></td>
                              <td className="fw-bold text-dark">{txn.description || 'N/A'}</td>
                              <td><span className="badge bg-light text-dark border">{txn.payment_mode}</span></td>
                              
                              {/* Metal Column */}
                              <td className="text-end font-monospace text-secondary">
                                  {parseFloat(txn.metal_weight) > 0 ? `${parseFloat(txn.metal_weight).toFixed(3)}g` : '-'}
                              </td>

                              {/* Amount Column */}
                              <td className={`text-end fw-bold ${txn.direction === 'IN' ? 'text-success' : 'text-danger'}`}>
                                  {parseFloat(txn.cash_amount) > 0 ? (
                                      <>
                                        {txn.direction === 'IN' ? '+' : '-'} ₹{formatCurrency(txn.cash_amount)}
                                      </>
                                  ) : '-'}
                              </td>
                          </tr>
                      ))}
                      {history.length === 0 && <tr><td colSpan="6" className="text-center py-4 text-muted">No transactions found.</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className="modal-header bg-danger text-white">
                    <h5 className="modal-title">Record Shop Expense</h5>
                    <button className="btn-close btn-close-white" onClick={() => setShowExpenseModal(false)}></button>
                 </div>
                 <div className="modal-body">
                    <div className="mb-3">
                        <label className="form-label small fw-bold">Description</label>
                        <input className="form-control" placeholder="e.g. Tea & Snacks" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} autoFocus />
                    </div>
                    <div className="row g-2 mb-3">
                        <div className="col-6">
                            <label className="form-label small fw-bold">Amount (₹)</label>
                            <input type="number" className="form-control fw-bold" placeholder="0" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label className="form-label small fw-bold">Category</label>
                            <select className="form-select" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                                <option>GENERAL</option><option>RENT</option><option>SALARY</option><option>UTILITY</option><option>MAINTENANCE</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label small fw-bold">Payment Source</label>
                        <div className="btn-group w-100" role="group">
                            <input type="radio" className="btn-check" name="pmode" id="p_cash" checked={expenseForm.payment_mode==='CASH'} onChange={() => setExpenseForm({...expenseForm, payment_mode: 'CASH'})} />
                            <label className="btn btn-outline-danger" htmlFor="p_cash">CASH</label>

                            <input type="radio" className="btn-check" name="pmode" id="p_online" checked={expenseForm.payment_mode==='ONLINE'} onChange={() => setExpenseForm({...expenseForm, payment_mode: 'ONLINE'})} />
                            <label className="btn btn-outline-primary" htmlFor="p_online">ONLINE / BANK</label>
                        </div>
                    </div>
                 </div>
                 <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                    <button className="btn btn-danger fw-bold px-4" onClick={handleAddExpense}>SAVE EXPENSE</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default LedgerDashboard;