import React, { useEffect, useState } from 'react';
import { api } from '../api'; 
import { useNavigate } from 'react-router-dom';

function LedgerDashboard() {
  const navigate = useNavigate();

  // --- STATE ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); 
  
  // Data
  const [ledgerData, setLedgerData] = useState([]);
  const [dayStats, setDayStats] = useState({ income: 0, expense: 0 });
  const [assets, setAssets] = useState({ cash_balance: 0, bank_balance: 0 });
  const [oldMetalStats, setOldMetalStats] = useState(null); 
  
  // Suspense
  const [pendingExpenses, setPendingExpenses] = useState([]); 
  const [shops, setShops] = useState([]); 

  // Refinery Modal State
  const [showRefineryModal, setShowRefineryModal] = useState(false);
  const [refineryTab, setRefineryTab] = useState('SEND');
  
  // Refinery Data
  const [pendingScrap, setPendingScrap] = useState([]);
  const [refineryBatches, setRefineryBatches] = useState([]);
  const [vendors, setVendors] = useState([]);
  
  // Forms
  const [sendForm, setSendForm] = useState({ metal: 'GOLD', selectedIds: [], manualWeight: '', totalNetWeight: '' });
  const [receiveForm, setReceiveForm] = useState({ batchId: '', weight: '', touch: '', reportNo: '', file: null });
  const [useForm, setUseForm] = useState({ batchId: '', type: 'PAY_VENDOR', vendorId: '', weight: '' });

  // Transaction Modal
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState({ type: 'INCOME', amount: '', description: '', mode: 'CASH', is_unrecorded: false });
  
  // Allocate Modal
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateData, setAllocateData] = useState({ expense_id: null, shop_id: '' });

  useEffect(() => {
    loadDashboard();
    loadPending();
    loadShops();
  }, [selectedDate]);

  // Auto-calculate Total Net Weight when selection changes
  useEffect(() => {
    if (showRefineryModal && pendingScrap.length > 0) {
        const selectedItems = pendingScrap.filter(i => sendForm.selectedIds.includes(i.id));
        const listNet = selectedItems.reduce((sum, i) => sum + parseFloat(i.net_weight || 0), 0);
        const manual = parseFloat(sendForm.manualWeight) || 0;
        setSendForm(prev => ({ ...prev, totalNetWeight: (listNet + manual).toFixed(3) }));
    }
  }, [sendForm.selectedIds, sendForm.manualWeight, pendingScrap, showRefineryModal]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
        const histRes = await api.getLedgerHistory('', selectedDate); 
        if (histRes.data) {
            setLedgerData(histRes.data.transactions || []);
            if(histRes.data.dayStats) setDayStats(histRes.data.dayStats);
        }
        const statsRes = await api.getLedgerStats();
        if (statsRes.data && statsRes.data.assets) setAssets(statsRes.data.assets);
        const oldStatsRes = await api.getOldMetalStats();
        setOldMetalStats(oldStatsRes.data);
    } catch (err) { console.error("Load Error:", err); } finally { setLoading(false); }
  };

  const loadPending = async () => {
      try {
          const res = await api.axiosInstance.get('/ledger/pending-expenses');
          setPendingExpenses(res.data);
      } catch(err) {}
  };

  const loadShops = async () => {
      try { const res = await api.getShops(); setShops(res.data); } catch(err) {}
  };

  const loadRefineryData = async () => {
      try {
          const pendingRes = await api.axiosInstance.get(`/refinery/pending-scrap?metal_type=${sendForm.metal}`);
          setPendingScrap(pendingRes.data);
          const batchesRes = await api.axiosInstance.get('/refinery/batches');
          setRefineryBatches(batchesRes.data);
          const vendRes = await api.getVendors();
          setVendors(vendRes.data);
      } catch (err) { console.error(err); }
  };

  // --- HANDLERS ---
  const handleSendScrap = async () => {
      if (sendForm.selectedIds.length === 0 && (!sendForm.manualWeight || parseFloat(sendForm.manualWeight) <= 0)) {
          return alert("Please select items or enter manual weight.");
      }
      try {
          await api.axiosInstance.post('/refinery/create-batch', {
              metal_type: sendForm.metal,
              item_ids: sendForm.selectedIds, // FIXED: Matches Backend key
              manual_weight: sendForm.manualWeight,
              net_weight: sendForm.totalNetWeight 
          });
          alert("Batch Created & Sent!");
          setSendForm({ metal: 'GOLD', selectedIds: [], manualWeight: '', totalNetWeight: '' });
          loadRefineryData();
          loadDashboard(); 
      } catch(err) { alert("Error: " + (err.response?.data?.error || err.message)); }
  };

  const handleReceiveRefined = async () => {
      const formData = new FormData();
      formData.append('batch_id', receiveForm.batchId);
      formData.append('refined_weight', receiveForm.weight);
      formData.append('touch_percent', receiveForm.touch);
      formData.append('report_no', receiveForm.reportNo);
      if(receiveForm.file) formData.append('report_image', receiveForm.file);

      try {
          await api.axiosInstance.post('/refinery/receive-refined', formData);
          alert("Refined Stock Updated!");
          loadRefineryData();
      } catch(err) { alert(err.message); }
  };

  const handleUseStock = async () => {
      try {
          await api.axiosInstance.post('/refinery/use-stock', {
              batch_id: useForm.batchId,
              usage_type: useForm.type,
              vendor_id: useForm.vendorId,
              weight_to_use: useForm.weight
          });
          alert("Transaction Recorded!");
          loadRefineryData();
          loadDashboard();
      } catch(err) { alert(err.message); }
  };

  const handleManualTxn = async () => {
      if(!txnForm.amount || !txnForm.description) return alert("Fill all fields");
      try {
          if (txnForm.type === 'INCOME') {
               await api.adjustBalance({ type: 'ADD', amount: txnForm.amount, mode: txnForm.mode, note: txnForm.description });
          } else {
               await api.addExpense({ 
                   description: txnForm.description, 
                   amount: txnForm.amount, 
                   category: 'GENERAL', 
                   payment_mode: txnForm.mode,
                   is_unrecorded: txnForm.is_unrecorded 
               });
          }
          alert("Saved");
          setShowTxnModal(false);
          setTxnForm({ type: 'INCOME', amount: '', description: '', mode: 'CASH', is_unrecorded: false });
          loadDashboard();
          loadPending();
      } catch(err) { alert(err.message); }
  };

  const handleAllocateSubmit = async () => {
      if(!allocateData.shop_id) return alert("Select a shop");
      try {
          await api.axiosInstance.post('/ledger/allocate-expense', allocateData);
          alert("Allocated!");
          setShowAllocateModal(false);
          loadPending();
          loadDashboard(); 
      } catch(err) { alert(err.message); }
  };

  const formatMoney = (val) => Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const pendingTotal = pendingExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const effectiveCash = parseFloat(assets.cash_balance) - pendingTotal;

  const getSelectedTotals = () => {
      const selected = pendingScrap.filter(i => sendForm.selectedIds.includes(i.id));
      const listGross = selected.reduce((sum, i) => sum + parseFloat(i.gross_weight || 0), 0);
      const manual = parseFloat(sendForm.manualWeight) || 0;
      return { gross: (listGross + manual).toFixed(3) };
  };

  const filteredTxns = ledgerData.filter(txn => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'GOLD') return parseFloat(txn.gold_weight) > 0;
      if (activeTab === 'SILVER') return parseFloat(txn.silver_weight) > 0;
      if (activeTab === 'CASH') return txn.payment_mode === 'CASH';
      if (activeTab === 'BANK') return txn.payment_mode !== 'CASH' && txn.payment_mode !== 'STOCK';
      if (activeTab === 'REFINERY') return txn.type === 'REFINERY';
      return true;
  });

  return (
    <div className="container-fluid pb-5">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
            <h2 className="fw-bold text-primary mb-1"><i className="bi bi-wallet2 me-2"></i>Ledger & Cash Flow</h2>
            <div className="text-muted small">Track Income, Expenses, Suspense & Refinery</div>
        </div>
        <div className="d-flex gap-2">
            <div>
                <label className="form-label small fw-bold mb-0">Date Selection</label>
                <input type="date" className="form-control" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div className="align-self-end">
                <button className="btn btn-warning me-2 fw-bold text-dark" onClick={() => { setShowRefineryModal(true); loadRefineryData(); }}>
                    <i className="bi bi-fire me-1"></i> Refinery
                </button>
                <button className="btn btn-dark fw-bold" onClick={() => setShowTxnModal(true)}>
                    <i className="bi bi-plus-lg me-1"></i> Entry
                </button>
            </div>
        </div>
      </div>

      {/* ASSETS SUMMARY */}
      <div className="row g-3 mb-4">
          <div className="col-md-3">
              <div className="card bg-success text-white shadow-sm h-100">
                  <div className="card-body">
                      <small className="opacity-75 fw-bold">SYSTEM CASH</small>
                      <h3 className="fw-bold mb-0">{formatMoney(assets.cash_balance)}</h3>
                  </div>
              </div>
          </div>
          <div className="col-md-3">
              {/* WARNING CARD FOR UNRECORDED */}
              <div className={`card shadow-sm h-100 ${pendingTotal > 0 ? 'bg-warning text-dark border-warning' : 'bg-light text-muted'}`}>
                  <div className="card-body">
                      <div className="d-flex justify-content-between">
                          <small className="opacity-75 fw-bold">UNRECORDED EXP</small>
                          {pendingTotal > 0 && <i className="bi bi-exclamation-circle-fill text-danger"></i>}
                      </div>
                      <h3 className="fw-bold mb-0">{formatMoney(pendingTotal)}</h3>
                      {pendingTotal > 0 && (
                          <div className="mt-2 pt-2 border-top border-dark border-opacity-25">
                              <small className="fw-bold d-block">Effective Cash:</small>
                              <span className={`fw-bold fs-5 ${effectiveCash < 0 ? 'text-danger' : 'text-success'}`}>
                                  {formatMoney(effectiveCash)}
                              </span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="card bg-primary text-white shadow-sm h-100">
                  <div className="card-body">
                      <small className="opacity-75 fw-bold">BANK BALANCE</small>
                      <h3 className="fw-bold mb-0">{formatMoney(assets.bank_balance)}</h3>
                  </div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex justify-content-around align-items-center">
                      <div className="text-center">
                          <small className="text-muted fw-bold">INCOME</small>
                          <h5 className="text-success fw-bold">+{formatMoney(dayStats.income)}</h5>
                      </div>
                      <div className="vr"></div>
                      <div className="text-center">
                          <small className="text-muted fw-bold">EXPENSE</small>
                          <h5 className="text-danger fw-bold">-{formatMoney(dayStats.expense)}</h5>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* ROW 2: OLD METAL STATS */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
            <div className="card bg-warning bg-opacity-10 border-warning text-dark shadow-sm cursor-pointer hover-shadow" onClick={() => navigate('/old-metal')}>
                <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="fw-bold mb-0 text-warning text-opacity-75">OLD GOLD</h5>
                        <small className="text-muted">Purchased + Exchanged</small>
                    </div>
                    <div className="text-end">
                        <div className="fw-bold fs-5">{parseFloat(oldMetalStats?.gold_total_gross || 0).toFixed(3)} g <span className="small text-muted">Gross</span></div>
                        <div className="fw-bold fs-5 text-success">{parseFloat(oldMetalStats?.gold_total_net || 0).toFixed(3)} g <span className="small text-muted">Net</span></div>
                    </div>
                </div>
            </div>
        </div>
        <div className="col-md-6">
            <div className="card bg-secondary bg-opacity-10 border-secondary text-dark shadow-sm cursor-pointer hover-shadow" onClick={() => navigate('/old-metal')}>
                <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="fw-bold mb-0 text-secondary">OLD SILVER</h5>
                        <small className="text-muted">Purchased + Exchanged</small>
                    </div>
                    <div className="text-end">
                         <div className="fw-bold fs-5">{parseFloat(oldMetalStats?.silver_total_gross || 0).toFixed(3)} g <span className="small text-muted">Gross</span></div>
                         <div className="fw-bold fs-5 text-success">{parseFloat(oldMetalStats?.silver_total_net || 0).toFixed(3)} g <span className="small text-muted">Net</span></div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* PENDING EXPENSES LIST (If Any) */}
      {pendingExpenses.length > 0 && (
          <div className="card border-warning mb-4 shadow-sm">
              <div className="card-header bg-warning bg-opacity-25 fw-bold text-dark d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-hourglass-split me-2"></i>Pending / Unrecorded Expenses</span>
                  <span className="badge bg-dark">{pendingExpenses.length} Items</span>
              </div>
              <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light"><tr><th>Date</th><th>Description</th><th>Amount</th><th className="text-end">Action</th></tr></thead>
                      <tbody>
                          {pendingExpenses.map(exp => (
                              <tr key={exp.id}>
                                  <td>{new Date(exp.expense_date).toLocaleDateString()}</td>
                                  <td>{exp.description}</td>
                                  <td className="fw-bold text-danger">₹{parseFloat(exp.amount).toLocaleString()}</td>
                                  <td className="text-end">
                                      <button className="btn btn-sm btn-outline-primary fw-bold" 
                                          onClick={() => { setAllocateData({ expense_id: exp.id, shop_id: '' }); setShowAllocateModal(true); }}>
                                          Allocate to Shop <i className="bi bi-arrow-right ms-1"></i>
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* FILTERS */}
      <div className="card shadow-sm border-0 mb-3">
          <div className="card-body p-2">
              <div className="nav nav-pills nav-fill">
                  {['ALL', 'GOLD', 'SILVER', 'CASH', 'BANK', 'REFINERY'].map(tab => (
                      <button key={tab} className={`nav-link ${activeTab === tab ? 'active bg-dark' : 'text-muted'}`} onClick={() => setActiveTab(tab)}>{tab}</button>
                  ))}
              </div>
          </div>
      </div>

      <div className="card shadow-sm border-0">
          <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-secondary small">
                      <tr><th>TIME</th><th>TYPE</th><th>DESCRIPTION</th><th>MODE</th><th className="text-end text-warning">GOLD</th><th className="text-end text-secondary">SILVER</th><th className="text-end">AMOUNT</th></tr>
                  </thead>
                  <tbody>
                      {loading ? <tr><td colSpan="7" className="text-center py-5">Loading Data...</td></tr> : 
                       filteredTxns.length === 0 ? <tr><td colSpan="7" className="text-center py-5 text-muted">No transactions for this date.</td></tr> :
                       filteredTxns.map((txn, i) => (
                          <tr key={i} className={txn.direction === 'IN' ? 'bg-success bg-opacity-10' : ''}>
                              <td className="small text-muted">{new Date(txn.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                              <td><span className="badge bg-secondary text-light">{txn.type.replace('_',' ')}</span></td>
                              <td className="fw-bold text-dark">{txn.description}</td>
                              <td className="small">{txn.payment_mode}</td>
                              <td className="text-end text-warning font-monospace">{parseFloat(txn.gold_weight) > 0 ? <strong>{parseFloat(txn.gold_weight).toFixed(3)}g</strong> : '-'}</td>
                              <td className="text-end text-secondary font-monospace">{parseFloat(txn.silver_weight) > 0 ? <strong>{parseFloat(txn.silver_weight).toFixed(3)}g</strong> : '-'}</td>
                              <td className={`text-end fw-bold ${txn.direction === 'IN' ? 'text-success' : 'text-danger'}`}>{parseFloat(txn.cash_amount) > 0 ? (txn.direction === 'IN' ? '+' : '-') + formatMoney(txn.cash_amount) : '-'}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* TRANSACTION MODAL */}
      {showTxnModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header"><h5 className="modal-title">New Ledger Entry</h5><button className="btn-close" onClick={() => setShowTxnModal(false)}></button></div>
                    <div className="modal-body">
                         <div className="btn-group w-100 mb-3">
                             <button className={`btn ${txnForm.type === 'INCOME' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setTxnForm({...txnForm, type: 'INCOME'})}>INCOME</button>
                             <button className={`btn ${txnForm.type === 'EXPENSE' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setTxnForm({...txnForm, type: 'EXPENSE'})}>EXPENSE</button>
                         </div>
                         <input className="form-control mb-2" placeholder="Description" value={txnForm.description} onChange={e => setTxnForm({...txnForm, description: e.target.value})} />
                         <input type="number" className="form-control mb-2" placeholder="Amount" value={txnForm.amount} onChange={e => setTxnForm({...txnForm, amount: e.target.value})} />
                         <select className="form-select mb-3" value={txnForm.mode} onChange={e => setTxnForm({...txnForm, mode: e.target.value})}><option value="CASH">CASH</option><option value="ONLINE">ONLINE / BANK</option></select>
                         {txnForm.type === 'EXPENSE' && (
                             <div className="form-check bg-danger bg-opacity-10 p-3 rounded border border-danger">
                                 <input className="form-check-input" type="checkbox" id="unrec" checked={txnForm.is_unrecorded} onChange={e => setTxnForm({...txnForm, is_unrecorded: e.target.checked})} />
                                 <label className="form-check-label fw-bold text-danger" htmlFor="unrec">Mark as Unrecorded (Suspense)</label>
                                 <div className="form-text small text-dark">Cash will NOT be deducted. Allocating later creates a Shop Loan.</div>
                             </div>
                         )}
                    </div>
                    <div className="modal-footer"><button className="btn btn-primary w-100" onClick={handleManualTxn}>SAVE ENTRY</button></div>
                </div>
            </div>
        </div>
      )}

      {/* ALLOCATE MODAL */}
      {showAllocateModal && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header bg-primary text-white"><h5 className="modal-title">Allocate Expense</h5><button className="btn-close btn-close-white" onClick={() => setShowAllocateModal(false)}></button></div>
                      <div className="modal-body">
                          <p className="text-muted">Select the Shop/Lender who paid this.</p>
                          <select className="form-select" value={allocateData.shop_id} onChange={e => setAllocateData({...allocateData, shop_id: e.target.value})}>
                              <option value="">-- Choose Shop --</option>
                              {shops.map(s => <option key={s.id} value={s.id}>{s.shop_name}</option>)}
                          </select>
                      </div>
                      <div className="modal-footer"><button className="btn btn-success w-100" onClick={handleAllocateSubmit}>Confirm</button></div>
                  </div>
              </div>
          </div>
      )}

      {/* REFINERY MODAL */}
      {showRefineryModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-warning text-dark">
                        <h5 className="modal-title fw-bold"><i className="bi bi-fire"></i> Refinery Management</h5>
                        <button className="btn-close" onClick={() => setShowRefineryModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        <ul className="nav nav-tabs mb-3">
                            <li className="nav-item"><button className={`nav-link ${refineryTab === 'SEND' && 'active'}`} onClick={() => setRefineryTab('SEND')}>1. Send Scrap</button></li>
                            <li className="nav-item"><button className={`nav-link ${refineryTab === 'RECEIVE' && 'active'}`} onClick={() => setRefineryTab('RECEIVE')}>2. Receive Report</button></li>
                            <li className="nav-item"><button className={`nav-link ${refineryTab === 'USE' && 'active'}`} onClick={() => setRefineryTab('USE')}>3. Use Pure Gold</button></li>
                        </ul>

                        {refineryTab === 'SEND' && (
                            <div>
                                <div className="d-flex gap-2 mb-3">
                                    <select className="form-select w-auto" value={sendForm.metal} onChange={(e) => { setSendForm({...sendForm, metal: e.target.value}); loadRefineryData(); }}>
                                        <option value="GOLD">GOLD</option>
                                        <option value="SILVER">SILVER</option>
                                    </select>
                                    <div className="flex-grow-1"></div>
                                </div>
                                <div className="table-responsive border mb-3" style={{maxHeight:'200px'}}>
                                    <table className="table table-sm table-hover mb-0">
                                        <thead className="table-light sticky-top"><tr><th>Select</th><th>Item</th><th>Gross</th><th>Net</th><th>Date</th></tr></thead>
                                        <tbody>
                                            {pendingScrap.map(item => (
                                                <tr key={item.id}>
                                                    <td><input type="checkbox" checked={sendForm.selectedIds.includes(item.id)} onChange={e => { const ids = e.target.checked ? [...sendForm.selectedIds, item.id] : sendForm.selectedIds.filter(id => id !== item.id); setSendForm({...sendForm, selectedIds: ids}); }} /></td>
                                                    <td>{item.item_name}</td><td>{item.gross_weight}g</td><td>{item.net_weight}g</td><td>{new Date(item.date).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                            {pendingScrap.length === 0 && <tr><td colSpan="5" className="text-center text-muted">No pending items found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mb-3">
                                    <label className="small fw-bold">Additional Manual Scrap Weight (g)</label>
                                    <input type="number" className="form-control" value={sendForm.manualWeight} onChange={e => setSendForm({...sendForm, manualWeight: e.target.value})} />
                                </div>
                                <div className="card bg-light border-0 p-3 mb-3">
                                    <div className="row text-center align-items-center">
                                        <div className="col-6 border-end"><small className="text-muted fw-bold d-block">TOTAL GROSS</small><h3 className="fw-bold mb-0">{getSelectedTotals().gross} g</h3></div>
                                        <div className="col-6"><small className="text-muted fw-bold d-block mb-1">TOTAL NET (EDITABLE)</small><input type="number" className="form-control text-center fw-bold fs-5 text-success mx-auto" style={{maxWidth:'150px'}} value={sendForm.totalNetWeight} onChange={e => setSendForm({...sendForm, totalNetWeight: e.target.value})} /></div>
                                    </div>
                                </div>
                                <button className="btn btn-dark w-100 py-2 fw-bold" onClick={handleSendScrap}>Create & Send Batch</button>
                            </div>
                        )}

                        {/* TAB 2: RECEIVE */}
                        {refineryTab === 'RECEIVE' && (
                            <div>
                                <label className="small fw-bold mb-1">Select Sent Batch</label>
                                <select className="form-select mb-3" value={receiveForm.batchId} onChange={e => setReceiveForm({...receiveForm, batchId: e.target.value})}>
                                    <option value="">-- Select Batch --</option>
                                    {refineryBatches.filter(b => b.status === 'SENT').map(b => ( <option key={b.id} value={b.id}>{b.batch_no} ({b.gross_weight}g {b.metal_type})</option> ))}
                                </select>
                                <div className="row g-2 mb-3">
                                    <div className="col-6"><label className="small fw-bold">Refined Weight (g)</label><input type="number" className="form-control" value={receiveForm.weight} onChange={e => setReceiveForm({...receiveForm, weight: e.target.value})} /></div>
                                    <div className="col-6"><label className="small fw-bold">Touch %</label><input type="number" className="form-control" placeholder="99.50" value={receiveForm.touch} onChange={e => setReceiveForm({...receiveForm, touch: e.target.value})} /></div>
                                </div>
                                <button className="btn btn-success w-100" onClick={handleReceiveRefined}>Update Pure Weight</button>
                            </div>
                        )}

                        {/* TAB 3: USE */}
                        {refineryTab === 'USE' && (
                            <div>
                                <label className="small fw-bold mb-1">Select Refined Batch</label>
                                <select className="form-select mb-3" value={useForm.batchId} onChange={e => setUseForm({...useForm, batchId: e.target.value})}>
                                    <option value="">-- Select Batch --</option>
                                    {refineryBatches.filter(b => b.status === 'REFINED').map(b => { const avail = parseFloat(b.pure_weight) - parseFloat(b.used_weight || 0); return <option key={b.id} value={b.id}>{b.batch_no} (Avail: {avail.toFixed(3)}g)</option>; })}
                                </select>
                                <div className="mb-3"><label className="small fw-bold">Action Type</label><select className="form-select" value={useForm.type} onChange={e => setUseForm({...useForm, type: e.target.value})}><option value="PAY_VENDOR">Pay Vendor</option><option value="ADD_TO_INVENTORY">Add to Stock</option></select></div>
                                {useForm.type === 'PAY_VENDOR' && ( <div className="mb-3"><label className="small fw-bold">Select Vendor</label><select className="form-select" value={useForm.vendorId} onChange={e => setUseForm({...useForm, vendorId: e.target.value})}><option value="">-- Select Vendor --</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}</select></div> )}
                                <div className="mb-3"><label className="small fw-bold">Weight (Pure g)</label><input type="number" className="form-control" value={useForm.weight} onChange={e => setUseForm({...useForm, weight: e.target.value})} /></div>
                                <button className="btn btn-primary w-100" onClick={handleUseStock}>Execute</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default LedgerDashboard;