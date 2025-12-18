import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function ShopDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // States
  const [activeModal, setActiveModal] = useState(null); 
  const [formMode, setFormMode] = useState('ITEM'); 
  const [itemRows, setItemRows] = useState([]);
  const [form, setForm] = useState({ description: '', item_cash: '', settle_gold: '', settle_silver: '', settle_cash: '' });

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [settleForm, setSettleForm] = useState({ mode: 'METAL', gold_val: '', silver_val: '', cash_val: '', metal_rate: '' });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, description: '', gross: '', wastage: '', mc_rate: '', manual_cash: '', type: 'GOLD', pure: 0, mc_total: 0, total_cash: 0 });
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try { 
        const res = await api.getShopDetails(id); 
        setShop(res.data.shop); 
        setTransactions(res.data.transactions); 
    } catch (err) { console.error(err); }
  };

  const toggleItemView = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // --- ACTIONS ---
  const initModal = (type) => {
    setActiveModal(type);
    setFormMode('ITEM');
    setItemRows([{ type: 'GOLD', desc: '', gross: '', wast: '', calcType: 'MUL', mc_rate: '', mc_total: 0, pure: 0 }]);
    setForm({ ...form, item_cash: '' });
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...itemRows];
    newRows[index][field] = value;
    const gross = parseFloat(newRows[index].gross) || 0;
    const val = parseFloat(newRows[index].wast) || 0;
    const mcRate = parseFloat(newRows[index].mc_rate) || 0;
    const cType = newRows[index].calcType;

    if (field === 'gross' || field === 'wast' || field === 'calcType') {
      newRows[index].pure = (cType === 'MUL' ? gross * (val/100) : gross * (1 + val/100)).toFixed(3);
    }
    if (field === 'gross' || field === 'mc_rate') {
      newRows[index].mc_total = (gross * mcRate).toFixed(2);
    }
    setItemRows(newRows);
  };

  const addRow = () => setItemRows([...itemRows, { type: 'GOLD', desc: '', gross: '', wast: '', calcType: 'MUL', mc_rate: '', mc_total: 0, pure: 0 }]);
  const removeRow = (i) => setItemRows(itemRows.filter((_, idx) => idx !== i));

  const handleMainSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
        let promises = [];
        let actionType = '';
        if (activeModal === 'BORROW') actionType = formMode === 'ITEM' ? 'BORROW_ADD' : 'BORROW_REPAY';
        else actionType = formMode === 'ITEM' ? 'LEND_ADD' : 'LEND_COLLECT';

        if (formMode === 'ITEM') {
            const validRows = itemRows.filter(r => r.gross);
            const manualCash = parseFloat(form.item_cash) || 0;
            if (validRows.length === 0 && manualCash === 0) { setLoading(false); return alert("Enter items or cash"); }

            validRows.forEach(row => {
                const gross = parseFloat(row.gross) || 0;
                const wast = parseFloat(row.wast) || 0;
                const pure = parseFloat(row.pure) || 0;
                const mcTotal = parseFloat(row.mc_total) || 0; 
                let details = `${row.gross}g`;
                if(row.wast) details += ` @ ${row.wast}${row.calcType==='MUL'?'% Tch':'% Wst'}`;
                if(row.mc_rate) details += `, MC: ${row.mc_rate}/g`;
                
                const payload = {
                    shop_id: id, action: actionType, description: `${row.desc || 'Item'} (${details})`,
                    gross_weight: gross, wastage_percent: wast, making_charges: mcTotal,
                    pure_weight: row.type === 'GOLD' ? pure : 0,
                    silver_weight: row.type === 'SILVER' ? pure : 0,
                    cash_amount: mcTotal
                };
                promises.push(api.shopTransaction(payload));
            });

            if (manualCash > 0) {
                promises.push(api.shopTransaction({
                    shop_id: id, action: actionType, description: "Cash Loan / Advance",
                    gross_weight: 0, wastage_percent: 0, making_charges: 0, pure_weight: 0, silver_weight: 0, cash_amount: manualCash
                }));
            }
        } else {
            promises.push(api.shopTransaction({
                shop_id: id, action: actionType, description: form.description || 'Settlement',
                pure_weight: form.settle_gold, silver_weight: form.settle_silver, cash_amount: form.settle_cash
            }));
        }
        await Promise.all(promises);
        alert('Saved!'); setActiveModal(null); loadData(); 
    } catch (err) { alert('Error saving'); } finally { setLoading(false); }
  };

  const handleDeleteTxn = async (txnId) => {
    if(!window.confirm("Undo/Delete this transaction? Balance will be reversed.")) return;
    try { await api.deleteShopTransaction(txnId); loadData(); } catch(err) { alert('Delete Failed'); }
  };

  const getOutstanding = (t) => {
    const origGold = parseFloat(t.pure_weight) || 0; const origSilver = parseFloat(t.silver_weight) || 0;
    const paidGold = parseFloat(t.total_gold_paid) || 0; const paidSilver = parseFloat(t.total_silver_paid) || 0;
    return { remGold: Math.max(0, origGold - paidGold).toFixed(3), remSilver: Math.max(0, origSilver - paidSilver).toFixed(3), isSettled: t.is_settled };
  };
  
  const handleEditChange = (field, value) => {
    const newState = { ...editForm, [field]: value };
    const g = parseFloat(field==='gross'?value:newState.gross)||0;
    const w = parseFloat(field==='wastage'?value:newState.wastage)||0;
    const rate = parseFloat(field==='mc_rate'?value:newState.mc_rate)||0;
    const manCash = parseFloat(field==='manual_cash'?value:newState.manual_cash)||0;
    newState.pure = (g * (w / 100)).toFixed(3); 
    newState.mc_total = (g * rate).toFixed(2);
    newState.total_cash = (parseFloat(newState.mc_total) + manCash).toFixed(2);
    setEditForm(newState);
  };

  const handleEditSubmit = async () => {
    const payload = { description: editForm.description, gross_weight: editForm.gross, wastage_percent: editForm.wastage, making_charges: editForm.mc_total, pure_weight: editForm.type === 'GOLD' ? editForm.pure : 0, silver_weight: editForm.type === 'SILVER' ? editForm.pure : 0, cash_amount: editForm.total_cash };
    try { await api.updateShopTransaction(editForm.id, payload); alert('Updated!'); setEditModalOpen(false); loadData(); } catch (err) { alert('Update Failed'); }
  };

  const openEditModal = (t) => {
    const gross = parseFloat(t.gross_weight)||0, mc = parseFloat(t.making_charges)||0, cash = parseFloat(t.cash_amount)||0;
    setEditForm({ id: t.id, description: t.description, gross: gross, wastage: t.wastage_percent||0, mc_rate: gross>0?(mc/gross).toFixed(2):0, manual_cash: (cash-mc).toFixed(2), type: t.pure_weight>0?'GOLD':'SILVER', pure: t.pure_weight>0?t.pure_weight:t.silver_weight, mc_total: mc, total_cash: cash });
    setEditModalOpen(true);
  };

  const openSettleModal = async (t) => { setSelectedTxn(t); setPaymentHistory([]); try { const res = await api.getShopTransactionHistory(t.id); setPaymentHistory(res.data); } catch(err){} setSettleModalOpen(true); };
  
  const handleSettleSubmit = async () => {
    if (!selectedTxn) return;
    let converted = 0; if (['CASH','BOTH'].includes(settleForm.mode) && settleForm.cash_val && settleForm.metal_rate) converted = (parseFloat(settleForm.cash_val) / parseFloat(settleForm.metal_rate)).toFixed(3);
    try { await api.settleShopItem({ transaction_id: selectedTxn.id, shop_id: id, payment_mode: settleForm.mode, gold_val: settleForm.gold_val, silver_val: settleForm.silver_val, cash_val: settleForm.cash_val, metal_rate: settleForm.metal_rate, converted_weight: converted }); alert("Recorded!"); setSettleModalOpen(false); loadData(); } catch (err) { alert("Error"); }
  };

  if (!shop) return <div>Loading...</div>;

  // --- DYNAMIC TALLY HELPER ---
  const renderTallyCard = (label, value, unit) => {
      const val = parseFloat(value) || 0;
      let statusColor = 'text-muted';
      let statusText = 'Settled';
      let displayVal = '0';
      let borderClass = 'border-secondary';

      if (val > 0) {
          statusColor = 'text-danger';
          statusText = 'We Owe';
          displayVal = val;
          borderClass = 'border-danger';
      } else if (val < 0) {
          statusColor = 'text-success';
          statusText = 'They Owe';
          displayVal = Math.abs(val);
          borderClass = 'border-success';
      }

      return (
          <div className="col-md-4">
              <div className={`card p-3 shadow-sm ${borderClass}`} style={{borderWidth: '1px', borderLeftWidth: '5px'}}>
                  <small className="text-muted fw-bold text-uppercase">{label}</small>
                  <h4 className={`fw-bold mb-0 ${statusColor}`}>
                      {statusText} {unit === '₹' ? unit : ''}{displayVal}{unit !== '₹' ? unit : ''}
                  </h4>
              </div>
          </div>
      );
  };

  const borrowList = transactions.filter(t => t.type === 'BORROW_ADD');
  const lendList = transactions.filter(t => t.type === 'LEND_ADD');

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/shops')}>Back</button>
        <h3 className="fw-bold">{shop.shop_name} ({shop.person_name})</h3>
      </div>

      {/* --- DYNAMIC NET TALLY --- */}
      <div className="row text-center mb-4 g-3">
         {renderTallyCard('Net Gold', shop.balance_gold, 'g')}
         {renderTallyCard('Net Silver', shop.balance_silver, 'g')}
         {renderTallyCard('Net Cash', shop.balance_cash, '₹')}
      </div>

      <div className="row g-4">
        {/* LEFT: BORROWED */}
        <div className="col-md-6 border-end">
          <div className="d-flex justify-content-between mb-2"><h5 className="text-danger fw-bold">Borrowed (We Owe)</h5><button className="btn btn-danger btn-sm" onClick={() => initModal('BORROW')}>+ New Borrow</button></div>
          <div className="table-responsive bg-light rounded" style={{maxHeight:'50vh'}}>
             <table className="table table-hover table-sm small mb-0">
                <thead className="table-danger text-dark"><tr><th>Date</th><th>Item</th><th>Gross</th><th className="text-end">Pending Pure</th><th className="text-end">Act</th></tr></thead>
                <tbody>
                    {borrowList.map(t => {
                        const { remGold, remSilver, isSettled } = getOutstanding(t);
                        const isExpanded = expandedItems[t.id];
                        return (
                        <tr key={t.id} className={isSettled ? "text-muted" : "bg-white"}>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                            <td onClick={() => toggleItemView(t.id)} style={{cursor: 'pointer'}}><div className={isExpanded ? "" : "text-truncate"} style={{maxWidth:'120px'}} title="Click to expand">{t.description}</div></td>
                            <td className="fw-bold">{t.gross_weight > 0 ? `${t.gross_weight}g` : '-'}</td>
                            <td className="text-end fw-bold text-danger bg-warning bg-opacity-10">
                                {isSettled ? <i className="bi bi-check-all text-success"></i> : (parseFloat(remGold)>0.005 ? `${remGold}g Au` : parseFloat(remSilver)>0.005 ? `${remSilver}g Ag` : '-')}
                                {!isSettled && t.cash_amount > 0 && <div className="text-muted small">₹{t.cash_amount}</div>}
                            </td>
                            <td className="text-end">
                                {!isSettled && <button className="btn btn-link p-0 me-2 text-primary" onClick={() => openEditModal(t)} title="Edit"><i className="bi bi-pencil-square"></i></button>}
                                <button className={`btn btn-sm py-0 me-1 ${isSettled?'btn-outline-secondary':'btn-outline-danger'}`} onClick={() => openSettleModal(t)}>{isSettled?'View':'Pay'}</button>
                                <button className="btn btn-link text-muted p-0" onClick={() => handleDeleteTxn(t.id)} title="Delete"><i className="bi bi-trash"></i></button>
                            </td>
                        </tr>
                    )})}
                </tbody>
             </table>
          </div>
        </div>

        {/* RIGHT: LENT */}
        <div className="col-md-6">
          <div className="d-flex justify-content-between mb-2"><h5 className="text-success fw-bold">Lent (They Owe)</h5><button className="btn btn-success btn-sm" onClick={() => initModal('LEND')}>+ New Lend</button></div>
          <div className="table-responsive bg-light rounded" style={{maxHeight:'50vh'}}>
             <table className="table table-hover table-sm small mb-0">
                <thead className="table-success text-dark"><tr><th>Date</th><th>Item</th><th>Gross</th><th className="text-end">Pending Pure</th><th className="text-end">Act</th></tr></thead>
                <tbody>
                    {lendList.map(t => {
                        const { remGold, remSilver, isSettled } = getOutstanding(t);
                        const isExpanded = expandedItems[t.id];
                        return (
                        <tr key={t.id} className={isSettled ? "text-muted" : "bg-white"}>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                            <td onClick={() => toggleItemView(t.id)} style={{cursor: 'pointer'}}><div className={isExpanded ? "" : "text-truncate"} style={{maxWidth:'120px'}} title="Click to expand">{t.description}</div></td>
                            <td className="fw-bold">{t.gross_weight > 0 ? `${t.gross_weight}g` : '-'}</td>
                            <td className="text-end fw-bold text-success bg-success bg-opacity-10">
                                {isSettled ? <i className="bi bi-check-all text-primary"></i> : (parseFloat(remGold)>0.005 ? `${remGold}g Au` : parseFloat(remSilver)>0.005 ? `${remSilver}g Ag` : '-')}
                                {!isSettled && t.cash_amount > 0 && <div className="text-muted small">₹{t.cash_amount}</div>}
                            </td>
                            <td className="text-end">
                                {!isSettled && <button className="btn btn-link p-0 me-2 text-primary" onClick={() => openEditModal(t)} title="Edit"><i className="bi bi-pencil-square"></i></button>}
                                <button className={`btn btn-sm py-0 me-1 ${isSettled?'btn-outline-secondary':'btn-outline-success'}`} onClick={() => openSettleModal(t)}>{isSettled?'View':'Collect'}</button>
                                <button className="btn btn-link text-muted p-0" onClick={() => handleDeleteTxn(t.id)} title="Delete"><i className="bi bi-trash"></i></button>
                            </td>
                        </tr>
                    )})}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* --- HISTORY SECTION --- */}
      <div className="card mt-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">Transaction History (Combined)</div>
        <div className="table-responsive" style={{maxHeight:'400px'}}>
            <table className="table table-sm table-striped small align-middle mb-0">
                <thead className="table-light sticky-top">
                    <tr><th>ID</th><th>Date</th><th>Type</th><th>Description</th><th className="text-end">Gold</th><th className="text-end">Silver</th><th className="text-end">Cash</th><th className="text-end">Action</th></tr>
                </thead>
                <tbody>
                    {transactions.map(t => (
                        <tr key={t.id}>
                            <td>{t.id}</td>
                            <td>{new Date(t.created_at).toLocaleString()}</td>
                            <td><span className={`badge ${t.type.includes('BORROW') ? 'bg-danger' : 'bg-success'}`}>{t.type.replace('_', ' ')}</span></td>
                            <td>{t.description}</td>
                            <td className="text-end">{t.pure_weight > 0 ? t.pure_weight : '-'}</td>
                            <td className="text-end">{t.silver_weight > 0 ? t.silver_weight : '-'}</td>
                            <td className="text-end">{t.cash_amount > 0 ? t.cash_amount : '-'}</td>
                            <td className="text-end"><button className="btn btn-sm btn-outline-danger py-0" onClick={() => handleDeleteTxn(t.id)} title="Revert/Undo Transaction"><i className="bi bi-arrow-counterclockwise me-1"></i>Revert</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* [MODALS START HERE] */}
      {activeModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className={`modal-header text-white ${activeModal === 'BORROW' ? 'bg-danger' : 'bg-success'}`}>
                <h5 className="modal-title fw-bold">{activeModal === 'BORROW' ? 'Add Borrow Entry (In)' : 'Add Lend Entry (Out)'}</h5>
                <button className="btn-close btn-close-white" onClick={() => setActiveModal(null)}></button>
              </div>
              <div className="modal-body">
                <div className="btn-group w-100 mb-3">
                   <button className={`btn ${formMode==='ITEM' ? (activeModal==='BORROW'?'btn-danger':'btn-success') : 'btn-outline-secondary'}`} onClick={() => setFormMode('ITEM')}>1. Add Items / Cash</button>
                   <button className={`btn ${formMode==='SETTLE' ? (activeModal==='BORROW'?'btn-danger':'btn-success') : 'btn-outline-secondary'}`} onClick={() => setFormMode('SETTLE')}>2. Bulk Entry (Legacy)</button>
                </div>
                {formMode === 'ITEM' && (
                  <div>
                    <table className="table table-bordered align-middle small text-center mb-3">
                      <thead className="table-light"><tr>
                        <th style={{width:'15%'}}>Type</th>
                        <th>Item Name</th>
                        <th style={{width:'12%'}}>Gross Wt</th>
                        <th style={{width:'15%'}}>Touch %</th>
                        <th style={{width:'10%'}}>MC Rate</th>
                        <th style={{width:'10%'}}>Total MC</th>
                        <th style={{width:'12%'}}>Pure Wt</th>
                        <th></th>
                      </tr></thead>
                      <tbody>
                        {itemRows.map((row, i) => (
                          <tr key={i}>
                            <td><select className="form-select form-select-sm" value={row.type} onChange={e => handleRowChange(i, 'type', e.target.value)}><option value="GOLD">Gold</option><option value="SILVER">Silver</option></select></td>
                            <td><input className="form-control form-control-sm" value={row.desc} onChange={e => handleRowChange(i, 'desc', e.target.value)} /></td>
                            <td><input className="form-control form-control-sm" type="number" value={row.gross} onChange={e => handleRowChange(i, 'gross', e.target.value)} /></td>
                            <td>
                                <div className="input-group input-group-sm">
                                    <input className="form-control" type="number" value={row.wast} onChange={e => handleRowChange(i, 'wast', e.target.value)} />
                                    <button className="btn btn-outline-secondary px-1" style={{fontSize:'0.7rem'}} 
                                        onClick={() => handleRowChange(i, 'calcType', row.calcType === 'ADD' ? 'MUL' : 'ADD')}
                                        title={row.calcType==='ADD' ? 'Adding Wastage' : 'Multiplying Touch'}
                                    >
                                        {row.calcType==='ADD' ? '+ %' : 'x %'}
                                    </button>
                                </div>
                            </td>
                            <td><input className="form-control form-control-sm" type="number" placeholder="Rate" value={row.mc_rate} onChange={e => handleRowChange(i, 'mc_rate', e.target.value)} /></td>
                            <td className="bg-light fw-bold">₹{row.mc_total}</td>
                            <td className="bg-light fw-bold text-primary">{row.pure}</td>
                            <td><button className="btn btn-sm text-danger" onClick={() => removeRow(i)}><i className="bi bi-x"></i></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="btn btn-sm btn-outline-dark mb-3" onClick={addRow}>+ Add Item Row</button>
                    <div className="card bg-light border-0 p-3">
                        <label className="fw-bold mb-1">Additional Cash Loan (₹)</label>
                        <input type="number" className="form-control" value={form.item_cash} onChange={e => setForm({...form, item_cash: e.target.value})} />
                    </div>
                  </div>
                )}
                {formMode === 'SETTLE' && (
                  <div className="bg-light p-3 rounded">
                    <input className="form-control mb-2" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                    <div className="row g-2">
                       <div className="col-4"><label>Gold (g)</label><input type="number" className="form-control" value={form.settle_gold} onChange={e => setForm({...form, settle_gold: e.target.value})} /></div>
                       <div className="col-4"><label>Silver (g)</label><input type="number" className="form-control" value={form.settle_silver} onChange={e => setForm({...form, settle_silver: e.target.value})} /></div>
                       <div className="col-4"><label>Cash (₹)</label><input type="number" className="form-control" value={form.settle_cash} onChange={e => setForm({...form, settle_cash: e.target.value})} /></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                 <button className={`btn w-100 fw-bold ${activeModal==='BORROW'?'btn-danger':'btn-success'}`} onClick={handleMainSubmit} disabled={loading}>{loading ? 'Saving...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Edit Item Details</h5>
                <button className="btn-close btn-close-white" onClick={() => setEditModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                    <label className="form-label small">Description</label>
                    <input className="form-control" value={editForm.description} onChange={e => handleEditChange('description', e.target.value)} />
                </div>
                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <label className="form-label small">Gross Weight (g)</label>
                        <input type="number" className="form-control" value={editForm.gross} onChange={e => handleEditChange('gross', e.target.value)} />
                    </div>
                    <div className="col-6">
                        <label className="form-label small">Touch / Purity</label>
                        <input type="number" className="form-control" value={editForm.wastage} onChange={e => handleEditChange('wastage', e.target.value)} />
                    </div>
                </div>
                <div className="alert alert-warning py-2 d-flex justify-content-between">
                    <span>Pure Weight:</span>
                    <strong>{editForm.pure} g ({editForm.type})</strong>
                </div>
                <hr />
                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <label className="form-label small">MC Rate (Per g)</label>
                        <input type="number" className="form-control" value={editForm.mc_rate} onChange={e => handleEditChange('mc_rate', e.target.value)} />
                    </div>
                    <div className="col-6">
                        <label className="form-label small">Total MC (₹)</label>
                        <input type="text" className="form-control bg-light" disabled value={editForm.mc_total} />
                    </div>
                </div>
                <div className="mb-3">
                    <label className="form-label small">Extra Cash Loan (₹)</label>
                    <input type="number" className="form-control" value={editForm.manual_cash} onChange={e => handleEditChange('manual_cash', e.target.value)} />
                </div>
                <div className="alert alert-success py-2 d-flex justify-content-between">
                    <span>Total Cash Debt:</span>
                    <strong>₹{editForm.total_cash}</strong>
                </div>
              </div>
              <div className="modal-footer">
                 <button className="btn btn-primary w-100" onClick={handleEditSubmit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {settleModalOpen && (
         <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
                <div className="modal-header"><h5 className="modal-title">Settle / Pay</h5><button className="btn-close" onClick={()=>setSettleModalOpen(false)}></button></div>
                <div className="modal-body">
                    <div className="mb-3">
                        <select className="form-select" value={settleForm.mode} onChange={e=>setSettleForm({...settleForm, mode:e.target.value})}>
                            <option value="METAL">Metal</option><option value="CASH">Cash</option><option value="BOTH">Both</option>
                        </select>
                    </div>
                    {(settleForm.mode === 'METAL' || settleForm.mode === 'BOTH') && (
                        <div className="row g-2 mb-2">
                            <div className="col-6"><input className="form-control" placeholder="Gold" value={settleForm.gold_val} onChange={e=>setSettleForm({...settleForm, gold_val:e.target.value})} /></div>
                            <div className="col-6"><input className="form-control" placeholder="Silver" value={settleForm.silver_val} onChange={e=>setSettleForm({...settleForm, silver_val:e.target.value})} /></div>
                        </div>
                    )}
                    {(settleForm.mode === 'CASH' || settleForm.mode === 'BOTH') && (
                        <div className="row g-2">
                            <div className="col-6"><input className="form-control" placeholder="Cash" value={settleForm.cash_val} onChange={e=>setSettleForm({...settleForm, cash_val:e.target.value})} /></div>
                            <div className="col-6"><input className="form-control" placeholder="Rate/g" value={settleForm.metal_rate} onChange={e=>setSettleForm({...settleForm, metal_rate:e.target.value})} /></div>
                        </div>
                    )}
                    <div className="text-end mt-3"><button className="btn btn-success" onClick={handleSettleSubmit}>Confirm Payment</button></div>
                </div>
            </div></div>
         </div>
      )}
    </div>
  );
}

export default ShopDetails;