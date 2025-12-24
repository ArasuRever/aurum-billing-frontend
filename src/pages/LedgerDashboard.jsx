import React, { useEffect, useState } from 'react';
import { api } from '../api'; 
import { useNavigate } from 'react-router-dom'; // NEW IMPORT

function LedgerDashboard() {
  const navigate = useNavigate(); // NEW HOOK

  // --- STATE ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); 
  
  // Data
  const [ledgerData, setLedgerData] = useState([]);
  const [dayStats, setDayStats] = useState({ 
      opening: { cash: 0, bank: 0 }, 
      income: 0, expense: 0, 
      gold_in: 0, gold_out: 0, 
      silver_in: 0, silver_out: 0 
  });
  const [assets, setAssets] = useState({ cash_balance: 0, bank_balance: 0 });
  const [oldMetalStats, setOldMetalStats] = useState(null); // NEW STATE

  // Refinery Modal State
  const [showRefineryModal, setShowRefineryModal] = useState(false);
  const [refineryTab, setRefineryTab] = useState('SEND');
  
  // Refinery Data
  const [pendingScrap, setPendingScrap] = useState([]);
  const [refineryBatches, setRefineryBatches] = useState([]);
  const [vendors, setVendors] = useState([]);
  
  // Forms
  const [sendForm, setSendForm] = useState({ metal: 'GOLD', selectedIds: [], manualWeight: '' });
  const [receiveForm, setReceiveForm] = useState({ batchId: '', weight: '', touch: '', reportNo: '', file: null });
  const [useForm, setUseForm] = useState({ batchId: '', type: 'PAY_VENDOR', vendorId: '', weight: '' });

  // Transaction Modal (Quick Add)
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnForm, setTxnForm] = useState({ type: 'INCOME', amount: '', description: '', mode: 'CASH' });

  // --- EFFECTS ---
  useEffect(() => {
    loadDashboard();
  }, [selectedDate]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
        // 1. Fetch Ledger Transactions
        const histRes = await api.getLedgerHistory('', selectedDate); 
        if (histRes.data) {
            setLedgerData(histRes.data.transactions || []);
            if(histRes.data.dayStats) setDayStats(histRes.data.dayStats);
        }

        // 2. Fetch Assets
        const statsRes = await api.getLedgerStats();
        if (statsRes.data && statsRes.data.assets) {
            setAssets(statsRes.data.assets);
        }

        // 3. Fetch Old Metal Stats (NEW)
        const oldStatsRes = await api.getOldMetalStats();
        setOldMetalStats(oldStatsRes.data);

    } catch (err) {
        console.error("Load Error:", err);
    } finally {
        setLoading(false);
    }
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

  // --- HANDLERS (Same as before) ---
  const handleSendScrap = async () => {
      try {
          await api.axiosInstance.post('/refinery/create-batch', {
              metal_type: sendForm.metal,
              selected_item_ids: sendForm.selectedIds,
              manual_weight: sendForm.manualWeight
          });
          alert("Batch Created & Sent!");
          loadRefineryData();
          loadDashboard(); 
      } catch(err) { alert(err.message); }
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
      try {
          if (txnForm.type === 'INCOME') {
               await api.adjustBalance({ type: 'ADD', amount: txnForm.amount, mode: txnForm.mode, note: txnForm.description });
          } else {
               await api.addExpense({ description: txnForm.description, amount: txnForm.amount, category: 'GENERAL', payment_mode: txnForm.mode });
          }
          alert("Saved");
          setShowTxnModal(false);
          loadDashboard();
      } catch(err) { alert(err.message); }
  };

  // --- UI HELPERS ---
  const formatMoney = (val) => Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  
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
            <h2 className="fw-bold text-primary mb-1"><i className="bi bi-journal-text me-2"></i>Day Book Ledger</h2>
            <div className="text-muted small">Manage Daily Cash, Metal & Refinery Operations</div>
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

      {/* ASSETS SUMMARY (Top Cards) */}
      <div className="row g-3 mb-4">
          <div className="col-md-3">
              <div className="card bg-success text-white shadow-sm h-100">
                  <div className="card-body">
                      <small className="opacity-75 fw-bold">CURRENT CASH</small>
                      <h3 className="fw-bold mb-0">{formatMoney(assets.cash_balance)}</h3>
                  </div>
              </div>
          </div>
          <div className="col-md-3">
              <div className="card bg-primary text-white shadow-sm h-100">
                  <div className="card-body">
                      <small className="opacity-75 fw-bold">CURRENT BANK</small>
                      <h3 className="fw-bold mb-0">{formatMoney(assets.bank_balance)}</h3>
                  </div>
              </div>
          </div>
          {/* Day Specific Stats */}
          <div className="col-md-6">
              <div className="card shadow-sm border-0 h-100">
                  <div className="card-body d-flex justify-content-around align-items-center">
                      <div className="text-center">
                          <small className="text-muted fw-bold">TODAY INCOME</small>
                          <h4 className="text-success fw-bold">+{formatMoney(dayStats?.income || 0)}</h4>
                      </div>
                      <div className="vr"></div>
                      <div className="text-center">
                          <small className="text-muted fw-bold">TODAY EXPENSE</small>
                          <h4 className="text-danger fw-bold">-{formatMoney(dayStats?.expense || 0)}</h4>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- NEW SECTION: OLD METAL STATS --- */}
      <div className="row g-3 mb-4">
        <div className="col-12">
            <h6 className="fw-bold text-secondary text-uppercase ls-1">Collected Scrap / Old Metal (Total)</h6>
        </div>
        <div className="col-md-6">
            <div 
                className="card bg-warning bg-opacity-10 border-warning text-dark shadow-sm cursor-pointer hover-shadow" 
                onClick={() => navigate('/old-metal')}
                style={{cursor: 'pointer'}}
            >
                <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="fw-bold mb-0 text-warning text-opacity-75">OLD GOLD</h5>
                        <small className="text-muted">Purchased + Exchanged</small>
                    </div>
                    <div className="text-end">
                        <h3 className="fw-bold mb-0">{parseFloat(oldMetalStats?.gold_weight || 0).toFixed(3)} g</h3>
                    </div>
                </div>
            </div>
        </div>
        <div className="col-md-6">
            <div 
                className="card bg-secondary bg-opacity-10 border-secondary text-dark shadow-sm cursor-pointer hover-shadow" 
                onClick={() => navigate('/old-metal')}
                style={{cursor: 'pointer'}}
            >
                <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="fw-bold mb-0 text-secondary">OLD SILVER</h5>
                        <small className="text-muted">Purchased + Exchanged</small>
                    </div>
                    <div className="text-end">
                        <h3 className="fw-bold mb-0">{parseFloat(oldMetalStats?.silver_weight || 0).toFixed(3)} g</h3>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card shadow-sm border-0 mb-3">
          <div className="card-body p-2">
              <div className="nav nav-pills nav-fill">
                  {['ALL', 'GOLD', 'SILVER', 'CASH', 'BANK', 'REFINERY'].map(tab => (
                      <button 
                        key={tab} 
                        className={`nav-link ${activeTab === tab ? 'active bg-dark' : 'text-muted'}`}
                        onClick={() => setActiveTab(tab)}
                      >
                          {tab}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="card shadow-sm border-0">
          <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-secondary small">
                      <tr>
                          <th>TIME</th>
                          <th>TYPE</th>
                          <th>DESCRIPTION</th>
                          <th>MODE</th>
                          <th className="text-end text-warning">GOLD</th>
                          <th className="text-end text-secondary">SILVER</th>
                          <th className="text-end">AMOUNT</th>
                      </tr>
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
                              <td className="text-end text-warning font-monospace">
                                  {parseFloat(txn.gold_weight) > 0 ? <strong>{parseFloat(txn.gold_weight).toFixed(3)}g</strong> : '-'}
                              </td>
                              <td className="text-end text-secondary font-monospace">
                                  {parseFloat(txn.silver_weight) > 0 ? <strong>{parseFloat(txn.silver_weight).toFixed(3)}g</strong> : '-'}
                              </td>
                              <td className={`text-end fw-bold ${txn.direction === 'IN' ? 'text-success' : 'text-danger'}`}>
                                  {parseFloat(txn.cash_amount) > 0 ? (txn.direction === 'IN' ? '+' : '-') + formatMoney(txn.cash_amount) : '-'}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* --- MODALS (Refinery, Txn, etc) kept same as original --- */}
      {showRefineryModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-warning text-dark">
                        <h5 className="modal-title fw-bold"><i className="bi bi-fire"></i> Refinery Management</h5>
                        <button className="btn-close" onClick={() => setShowRefineryModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        {/* Tabs inside Modal */}
                        <ul className="nav nav-tabs mb-3">
                            <li className="nav-item"><button className={`nav-link ${refineryTab === 'SEND' && 'active'}`} onClick={() => setRefineryTab('SEND')}>1. Send Scrap</button></li>
                            <li className="nav-item"><button className={`nav-link ${refineryTab === 'RECEIVE' && 'active'}`} onClick={() => setRefineryTab('RECEIVE')}>2. Receive Report</button></li>
                            <li className="nav-item"><button className={`nav-link ${refineryTab === 'USE' && 'active'}`} onClick={() => setRefineryTab('USE')}>3. Use Pure Gold</button></li>
                        </ul>

                        {/* TAB 1: SEND SCRAP */}
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
                                        <thead className="table-light sticky-top">
                                            <tr>
                                                <th>Select</th>
                                                <th>Item</th>
                                                <th>Wt</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingScrap.map(item => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <input type="checkbox" 
                                                            checked={sendForm.selectedIds.includes(item.id)}
                                                            onChange={e => {
                                                                const ids = e.target.checked 
                                                                    ? [...sendForm.selectedIds, item.id]
                                                                    : sendForm.selectedIds.filter(id => id !== item.id);
                                                                setSendForm({...sendForm, selectedIds: ids});
                                                            }}
                                                        />
                                                    </td>
                                                    <td>{item.item_name}</td>
                                                    <td>{item.net_weight}g</td>
                                                    <td>{new Date(item.date).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                            {pendingScrap.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No pending items found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mb-3">
                                    <label className="small fw-bold">Additional Manual Scrap Weight (g)</label>
                                    <input type="number" className="form-control" placeholder="0.000" value={sendForm.manualWeight} onChange={e => setSendForm({...sendForm, manualWeight: e.target.value})} />
                                    <div className="form-text">If you have loose scrap not in the list above.</div>
                                </div>
                                <button className="btn btn-dark w-100" onClick={handleSendScrap}>Create & Send Batch</button>
                            </div>
                        )}

                        {/* TAB 2: RECEIVE REPORT */}
                        {refineryTab === 'RECEIVE' && (
                            <div>
                                <label className="small fw-bold mb-1">Select Sent Batch</label>
                                <select className="form-select mb-3" value={receiveForm.batchId} onChange={e => setReceiveForm({...receiveForm, batchId: e.target.value})}>
                                    <option value="">-- Select Batch --</option>
                                    {refineryBatches.filter(b => b.status === 'SENT').map(b => (
                                        <option key={b.id} value={b.id}>{b.batch_no} ({b.gross_weight}g {b.metal_type}) - {new Date(b.sent_date).toLocaleDateString()}</option>
                                    ))}
                                </select>

                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="small fw-bold">Refined Weight (g)</label>
                                        <input type="number" className="form-control" value={receiveForm.weight} onChange={e => setReceiveForm({...receiveForm, weight: e.target.value})} />
                                    </div>
                                    <div className="col-6">
                                        <label className="small fw-bold">Touch %</label>
                                        <input type="number" className="form-control" placeholder="99.50" value={receiveForm.touch} onChange={e => setReceiveForm({...receiveForm, touch: e.target.value})} />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="small fw-bold">Touch Report No</label>
                                    <input type="text" className="form-control" value={receiveForm.reportNo} onChange={e => setReceiveForm({...receiveForm, reportNo: e.target.value})} />
                                </div>

                                <div className="mb-3">
                                    <label className="small fw-bold">Upload Report Image</label>
                                    <input type="file" className="form-control" onChange={e => setReceiveForm({...receiveForm, file: e.target.files[0]})} />
                                </div>

                                <button className="btn btn-success w-100" onClick={handleReceiveRefined}>Update & Save Pure Weight</button>
                            </div>
                        )}

                        {/* TAB 3: USE GOLD */}
                        {refineryTab === 'USE' && (
                            <div>
                                <label className="small fw-bold mb-1">Select Refined Batch</label>
                                <select className="form-select mb-3" value={useForm.batchId} onChange={e => setUseForm({...useForm, batchId: e.target.value})}>
                                    <option value="">-- Select Batch --</option>
                                    {refineryBatches.filter(b => b.status === 'REFINED').map(b => {
                                        const available = parseFloat(b.pure_weight) - parseFloat(b.used_weight || 0);
                                        return (
                                            <option key={b.id} value={b.id}>
                                                {b.batch_no} (Avail: {available.toFixed(3)}g Pure)
                                            </option>
                                        );
                                    })}
                                </select>

                                <div className="mb-3">
                                    <label className="small fw-bold">Action Type</label>
                                    <select className="form-select" value={useForm.type} onChange={e => setUseForm({...useForm, type: e.target.value})}>
                                        <option value="PAY_VENDOR">Pay Vendor (Gold Payment)</option>
                                        <option value="ADD_TO_INVENTORY">Add to Stock (Raw Material)</option>
                                    </select>
                                </div>

                                {useForm.type === 'PAY_VENDOR' && (
                                    <div className="mb-3">
                                        <label className="small fw-bold">Select Vendor</label>
                                        <select className="form-select" value={useForm.vendorId} onChange={e => setUseForm({...useForm, vendorId: e.target.value})}>
                                            <option value="">-- Select Vendor --</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="small fw-bold">Weight to Use (Pure g)</label>
                                    <input type="number" className="form-control" value={useForm.weight} onChange={e => setUseForm({...useForm, weight: e.target.value})} />
                                </div>

                                <button className="btn btn-primary w-100" onClick={handleUseStock}>Execute Transaction</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* QUICK TRANSACTION MODAL */}
      {showTxnModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Manual Entry</h5>
                        <button className="btn-close" onClick={() => setShowTxnModal(false)}></button>
                    </div>
                    <div className="modal-body">
                         <div className="btn-group w-100 mb-3">
                             <button className={`btn ${txnForm.type === 'INCOME' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setTxnForm({...txnForm, type: 'INCOME'})}>INCOME</button>
                             <button className={`btn ${txnForm.type === 'EXPENSE' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setTxnForm({...txnForm, type: 'EXPENSE'})}>EXPENSE</button>
                         </div>
                         <input className="form-control mb-2" placeholder="Description" value={txnForm.description} onChange={e => setTxnForm({...txnForm, description: e.target.value})} />
                         <input type="number" className="form-control mb-2" placeholder="Amount" value={txnForm.amount} onChange={e => setTxnForm({...txnForm, amount: e.target.value})} />
                         <select className="form-select" value={txnForm.mode} onChange={e => setTxnForm({...txnForm, mode: e.target.value})}>
                             <option value="CASH">CASH</option>
                             <option value="ONLINE">ONLINE / BANK</option>
                         </select>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-primary w-100" onClick={handleManualTxn}>SAVE</button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default LedgerDashboard;