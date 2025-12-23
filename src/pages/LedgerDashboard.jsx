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
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, GOLD, SILVER, IN, OUT
  
  // Modal State (Unified Manual Entry)
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ 
      type: 'INCOME', // INCOME or EXPENSE
      amount: '', 
      description: '', 
      mode: 'CASH',
      category: 'GENERAL'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        setLoading(true);
        const s = await api.getLedgerStats();
        if(s.data) setStats(s.data);
        
        await fetchHistory();
    } catch (err) { 
        console.error("Ledger Load Error:", err);
    } finally {
        setLoading(false);
    }
  };

  const fetchHistory = async () => {
      try {
          const h = await api.getLedgerHistory(searchTerm);
          if(Array.isArray(h.data)) setHistory(h.data);
      } catch(err) { console.error(err); }
  };

  // Trigger search on enter or button click
  const handleSearch = (e) => {
      e.preventDefault();
      fetchHistory();
  };

  const handleSaveTransaction = async () => {
      if(!form.amount || !form.description) return alert("Fill all details");
      try {
          // If Income -> Use Adjust (Type ADD)
          if (form.type === 'INCOME') {
              await api.adjustBalance({
                  type: 'ADD',
                  amount: form.amount,
                  mode: form.mode,
                  note: form.description
              });
          } 
          // If Expense -> Use Add Expense
          else {
              await api.addExpense({
                  description: form.description,
                  amount: form.amount,
                  category: form.category,
                  payment_mode: form.mode
              });
          }
          alert("Transaction Recorded");
          setShowModal(false);
          setForm({ type: 'INCOME', amount: '', description: '', mode: 'CASH', category: 'GENERAL' });
          loadData();
      } catch(err) { alert("Failed: " + err.message); }
  };

  const formatCurrency = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? "0.00" : num.toLocaleString();
  };

  const getRowColor = (txn) => {
      if (txn.direction === 'IN') return 'table-success';
      if (txn.direction === 'OUT') return 'table-danger';
      return '';
  };

  // Client-side Filtering based on Tab
  const filteredHistory = history.filter(txn => {
      if(filterType === 'ALL') return true;
      if(filterType === 'GOLD') return parseFloat(txn.gold_weight) > 0;
      if(filterType === 'SILVER') return parseFloat(txn.silver_weight) > 0;
      if(filterType === 'IN') return txn.direction === 'IN';
      if(filterType === 'OUT') return txn.direction === 'OUT';
      return true;
  });

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-wallet2 me-2"></i>Master Ledger</h2>
        <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={loadData}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
            <button className="btn btn-dark shadow-sm fw-bold" onClick={() => setShowModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>Record Transaction
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

      {/* 2. FILTERS & SEARCH */}
      <div className="card shadow-sm border-0 mb-3">
          <div className="card-body p-2 d-flex justify-content-between align-items-center">
              {/* Tabs */}
              <div className="btn-group" role="group">
                  {['ALL', 'GOLD', 'SILVER', 'IN', 'OUT'].map(type => (
                      <button 
                        key={type}
                        className={`btn btn-sm ${filterType === type ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setFilterType(type)}
                      >
                        {type === 'IN' ? 'CASH IN' : type === 'OUT' ? 'CASH OUT' : type}
                      </button>
                  ))}
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="d-flex gap-2">
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="Search invoices, shops..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <button type="submit" className="btn btn-sm btn-primary"><i className="bi bi-search"></i></button>
              </form>
          </div>
      </div>

      {/* 3. TRANSACTION HISTORY */}
      <div className="card shadow-sm border-0">
          <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                      <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Mode</th>
                          <th className="text-end text-warning">Gold</th>
                          <th className="text-end text-secondary">Silver</th>
                          <th className="text-end">Amount</th>
                      </tr>
                  </thead>
                  <tbody>
                      {loading ? <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr> : 
                       filteredHistory.length === 0 ? <tr><td colSpan="7" className="text-center py-4 text-muted">No transactions found.</td></tr> :
                       filteredHistory.map((txn, i) => (
                          <tr key={i} className={getRowColor(txn) + " bg-opacity-10"}>
                              <td className="small text-muted">{new Date(txn.date).toLocaleString()}</td>
                              <td><span className={`badge ${txn.direction === 'IN' ? 'bg-success' : 'bg-danger'}`}>{txn.type.replace('_', ' ')}</span></td>
                              <td className="fw-bold text-dark">{txn.description || 'N/A'}</td>
                              <td><span className="badge bg-light text-dark border">{txn.payment_mode}</span></td>
                              
                              {/* Gold */}
                              <td className="text-end font-monospace text-warning">
                                  {parseFloat(txn.gold_weight) > 0 ? <strong>{parseFloat(txn.gold_weight).toFixed(3)}g</strong> : '-'}
                              </td>

                              {/* Silver */}
                              <td className="text-end font-monospace text-secondary">
                                  {parseFloat(txn.silver_weight) > 0 ? `${parseFloat(txn.silver_weight).toFixed(3)}g` : '-'}
                              </td>

                              {/* Amount */}
                              <td className={`text-end fw-bold ${txn.direction === 'IN' ? 'text-success' : 'text-danger'}`}>
                                  {parseFloat(txn.cash_amount) > 0 ? (
                                      <>
                                        {txn.direction === 'IN' ? '+' : '-'} ₹{formatCurrency(txn.cash_amount)}
                                      </>
                                  ) : '-'}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* MANUAL ENTRY MODAL */}
      {showModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className={`modal-header text-white ${form.type === 'INCOME' ? 'bg-success' : 'bg-danger'}`}>
                    <h5 className="modal-title">Record Manual Transaction</h5>
                    <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                 </div>
                 <div className="modal-body">
                    {/* Toggle Type */}
                    <div className="d-flex justify-content-center mb-3">
                        <div className="btn-group w-100">
                            <button className={`btn ${form.type === 'INCOME' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setForm({...form, type: 'INCOME'})}>INCOME (Money In)</button>
                            <button className={`btn ${form.type === 'EXPENSE' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setForm({...form, type: 'EXPENSE'})}>EXPENSE (Money Out)</button>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label small fw-bold">Description / Note</label>
                        <input className="form-control" placeholder="e.g. Old Payment Received" value={form.description} onChange={e => setForm({...form, description: e.target.value})} autoFocus />
                    </div>

                    <div className="row g-2 mb-3">
                        <div className="col-6">
                            <label className="form-label small fw-bold">Amount (₹)</label>
                            <input type="number" className="form-control fw-bold" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label className="form-label small fw-bold">Mode</label>
                            <select className="form-select" value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}>
                                <option value="CASH">CASH</option>
                                <option value="ONLINE">ONLINE / BANK</option>
                            </select>
                        </div>
                    </div>

                    {form.type === 'EXPENSE' && (
                        <div className="mb-3">
                            <label className="form-label small fw-bold">Category</label>
                            <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                <option>GENERAL</option><option>RENT</option><option>SALARY</option><option>UTILITY</option><option>MAINTENANCE</option>
                            </select>
                        </div>
                    )}
                 </div>
                 <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className={`btn fw-bold px-4 ${form.type === 'INCOME' ? 'btn-success' : 'btn-danger'}`} onClick={handleSaveTransaction}>
                        SAVE {form.type}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default LedgerDashboard;