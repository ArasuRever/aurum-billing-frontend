import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function ShopDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [transactions, setTransactions] = useState([]);
  
  // --- MAIN MODAL STATE (Add Borrow/Lend) ---
  const [activeModal, setActiveModal] = useState(null); // 'BORROW' or 'LEND'
  const [formMode, setFormMode] = useState('ITEM'); // 'ITEM' or 'SETTLE' (Bulk)
  
  // Item Rows (Multi-row support)
  const [itemRows, setItemRows] = useState([]);
  
  // Form State (Unified for Add)
  const [form, setForm] = useState({
    mode: 'ITEM',
    description: '', 
    item_cash: '', 
    settle_gold: '', settle_silver: '', settle_cash: '' 
  });

  // --- SETTLEMENT MODAL STATE (Partial / Item-wise) ---
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [settleForm, setSettleForm] = useState({
    mode: 'METAL', // 'METAL', 'CASH', 'BOTH'
    gold_val: '',
    silver_val: '',
    cash_val: '',
    metal_rate: '',
  });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try { 
        const res = await api.getShopDetails(id); 
        setShop(res.data.shop); 
        setTransactions(res.data.transactions); 
    } catch (err) { console.error(err); }
  };

  // =================================================================================
  //  SECTION 1: ADD NEW TRANSACTION (BORROW / LEND)
  // =================================================================================

  const initModal = (type) => {
    setActiveModal(type);
    setFormMode('ITEM');
    setItemRows([{ type: 'GOLD', desc: '', gross: '', wast: '', mc: '', pure: 0 }]);
    setForm({ ...form, item_cash: '', description: '', settle_gold: '', settle_silver: '', settle_cash: '' });
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...itemRows];
    newRows[index][field] = value;
    
    // Auto Calculate Pure
    if (field === 'gross' || field === 'wast') {
      const g = parseFloat(field==='gross'?value:newRows[index].gross) || 0;
      const w = parseFloat(field==='wast'?value:newRows[index].wast) || 0;
      newRows[index].pure = (g * (1 + w/100)).toFixed(3);
    }
    setItemRows(newRows);
  };

  const addRow = () => setItemRows([...itemRows, { type: 'GOLD', desc: '', gross: '', wast: '', mc: '', pure: 0 }]);
  const removeRow = (i) => setItemRows(itemRows.filter((_, idx) => idx !== i));

  const handleMainSubmit = async () => {
    let payload = { shop_id: id };
    
    if (activeModal === 'BORROW') payload.action = formMode === 'ITEM' ? 'BORROW_ADD' : 'BORROW_REPAY';
    else payload.action = formMode === 'ITEM' ? 'LEND_ADD' : 'LEND_COLLECT';

    if (formMode === 'ITEM') {
        const validRows = itemRows.filter(r => r.gross);
        const cashValue = parseFloat(form.item_cash) || 0;

        if (validRows.length === 0 && cashValue === 0) return alert("Enter at least one item or cash amount");
        
        const totalGold = validRows.filter(r => r.type === 'GOLD').reduce((sum, r) => sum + parseFloat(r.pure), 0);
        const totalSilver = validRows.filter(r => r.type === 'SILVER').reduce((sum, r) => sum + parseFloat(r.pure), 0);
        
        const totalMC = validRows.reduce((sum, r) => sum + (parseFloat(r.mc)||0), 0);
        const totalGross = validRows.reduce((sum, r) => sum + (parseFloat(r.gross)||0), 0);
        
        // Create Description
        let descList = validRows.map(r => `${r.desc || 'Item'} (${r.gross}g ${r.type === 'GOLD' ? 'Au' : 'Ag'})`).join(', ');
        if (cashValue > 0) descList += descList ? ` + Cash ₹${cashValue}` : `Cash ₹${cashValue}`;
        
        payload.description = descList;
        payload.pure_weight = totalGold.toFixed(3);   
        payload.silver_weight = totalSilver.toFixed(3); 
        payload.making_charges = totalMC;
        payload.gross_weight = totalGross;
        payload.cash_amount = cashValue;
    } else {
        // Bulk Settlement (Manual)
        payload.description = form.description || 'Settlement';
        payload.pure_weight = form.settle_gold;
        payload.silver_weight = form.settle_silver;
        payload.cash_amount = form.settle_cash;
    }

    try {
      await api.shopTransaction(payload);
      alert('Saved!'); setActiveModal(null); loadData();
    } catch (err) { alert('Error saving'); }
  };

  const handleDeleteTxn = async (txnId) => {
    if(!window.confirm("Undo/Delete this transaction? Balance will be reversed.")) return;
    try { await api.deleteShopTransaction(txnId); loadData(); } catch(err) { alert('Delete Failed'); }
  };

  // =================================================================================
  //  SECTION 2: SETTLEMENT LOGIC (PARTIAL / HISTORY)
  // =================================================================================

  const openSettleModal = async (txn) => {
    setSelectedTxn(txn);
    setPaymentHistory([]); // Clear previous
    setSettleForm({ mode: 'METAL', gold_val: '', silver_val: '', cash_val: '', metal_rate: '' });
    
    // Fetch History
    try {
        const res = await api.getShopTransactionHistory(txn.id);
        setPaymentHistory(res.data);
    } catch(err) { console.error("Failed to load history", err); }
    
    setSettleModalOpen(true);
  };

  const handleSettleSubmit = async () => {
    if (!selectedTxn) return;
    
    // Calculate Converted Weight
    let converted = 0;
    if ((settleForm.mode === 'CASH' || settleForm.mode === 'BOTH') && settleForm.cash_val && settleForm.metal_rate) {
        converted = (parseFloat(settleForm.cash_val) / parseFloat(settleForm.metal_rate)).toFixed(3);
    }

    const payload = {
        transaction_id: selectedTxn.id,
        shop_id: id,
        payment_mode: settleForm.mode,
        gold_val: settleForm.gold_val,
        silver_val: settleForm.silver_val,
        cash_val: settleForm.cash_val,
        metal_rate: settleForm.metal_rate,
        converted_weight: converted
    };

    try {
        await api.settleShopItem(payload);
        alert("Payment Recorded!");
        setSettleModalOpen(false);
        loadData();
    } catch (err) { alert("Error: " + (err.response?.data?.error || err.message)); }
  };

  // Helper: Calculate Outstanding Balance for a Row
  const getOutstanding = (t) => {
    const origGold = parseFloat(t.pure_weight) || 0;
    const origSilver = parseFloat(t.silver_weight) || 0;
    
    // Amounts paid so far (Summed from DB)
    const paidGold = parseFloat(t.total_gold_paid) || 0; // Includes converted cash->gold
    const paidSilver = parseFloat(t.total_silver_paid) || 0;

    const remGold = Math.max(0, origGold - paidGold).toFixed(3);
    const remSilver = Math.max(0, origSilver - paidSilver).toFixed(3);

    return { remGold, remSilver, isSettled: t.is_settled };
  };

  if (!shop) return <div className="p-5 text-center">Loading...</div>;

  const borrowList = transactions.filter(t => t.type === 'BORROW_ADD');
  const lendList = transactions.filter(t => t.type === 'LEND_ADD');

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/shops')}><i className="bi bi-arrow-left me-2"></i>Back</button>
        <h3 className="fw-bold mb-0">{shop.shop_name} <span className="text-muted fs-6">({shop.person_name})</span></h3>
      </div>

      <div className="row g-4">
        {/* --- LEFT: BORROWED ITEMS (WE OWE THEM) --- */}
        <div className="col-md-6 border-end">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="text-danger fw-bold"><i className="bi bi-box-arrow-in-down me-2"></i>Borrowed (We Owe)</h5>
            <button className="btn btn-danger btn-sm" onClick={() => initModal('BORROW')}>+ New Borrow</button>
          </div>
          
          <div className="card shadow-sm border-0 bg-light">
             <div className="table-responsive" style={{maxHeight:'60vh'}}>
                <table className="table table-hover table-sm align-middle mb-0 small">
                    <thead className="table-danger text-dark">
                        <tr>
                            <th>Date</th>
                            <th>Item</th>
                            <th>Original</th>
                            <th className="text-center">Outstanding</th>
                            <th>Status</th>
                            <th className="text-end">Act</th>
                        </tr>
                    </thead>
                    <tbody>
                        {borrowList.length === 0 && <tr><td colSpan="6" className="text-center text-muted p-3">No pending debts.</td></tr>}
                        {borrowList.map(t => {
                            const { remGold, remSilver, isSettled } = getOutstanding(t);
                            return (
                            <tr key={t.id} className={isSettled ? "table-light text-muted" : "bg-white"}>
                                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                <td title={t.description} className="text-truncate" style={{maxWidth:'100px'}}>{t.description}</td>
                                <td>
                                    {t.pure_weight > 0 && <div className="text-nowrap">{t.pure_weight}g Au</div>}
                                    {t.silver_weight > 0 && <div className="text-nowrap">{t.silver_weight}g Ag</div>}
                                </td>
                                
                                <td className="text-center fw-bold text-danger bg-warning bg-opacity-10">
                                    {isSettled ? <span className="text-success"><i className="bi bi-check-all"></i></span> : (
                                        <>
                                            {parseFloat(remGold) > 0.005 && <div>{remGold}g Au</div>}
                                            {parseFloat(remSilver) > 0.005 && <div>{remSilver}g Ag</div>}
                                        </>
                                    )}
                                </td>

                                <td>{isSettled ? <span className="badge bg-success">Paid</span> : <span className="badge bg-warning text-dark">Due</span>}</td>
                                
                                <td className="text-end">
                                    <button className={`btn btn-sm py-0 ${isSettled ? 'btn-outline-secondary' : 'btn-outline-danger'}`} onClick={() => openSettleModal(t)}>
                                        {isSettled ? <i className="bi bi-eye"></i> : 'Pay'}
                                    </button>
                                    <button className="btn btn-link text-muted p-0 ms-1" onClick={() => handleDeleteTxn(t.id)}><i className="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* --- RIGHT: LENT ITEMS (THEY OWE US) --- */}
        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="text-success fw-bold"><i className="bi bi-box-arrow-up me-2"></i>Lent (They Owe)</h5>
            <button className="btn btn-success btn-sm" onClick={() => initModal('LEND')}>+ New Lend</button>
          </div>
          
          <div className="card shadow-sm border-0 bg-light">
             <div className="table-responsive" style={{maxHeight:'60vh'}}>
                <table className="table table-hover table-sm align-middle mb-0 small">
                    <thead className="table-success text-dark">
                        <tr>
                            <th>Date</th>
                            <th>Item</th>
                            <th>Original</th>
                            <th className="text-center">Outstanding</th>
                            <th>Status</th>
                            <th className="text-end">Act</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lendList.length === 0 && <tr><td colSpan="6" className="text-center text-muted p-3">No pending collections.</td></tr>}
                        {lendList.map(t => {
                            const { remGold, remSilver, isSettled } = getOutstanding(t);
                            return (
                            <tr key={t.id} className={isSettled ? "table-light text-muted" : "bg-white"}>
                                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                <td title={t.description} className="text-truncate" style={{maxWidth:'100px'}}>{t.description}</td>
                                <td>
                                    {t.pure_weight > 0 && <div className="text-nowrap">{t.pure_weight}g Au</div>}
                                    {t.silver_weight > 0 && <div className="text-nowrap">{t.silver_weight}g Ag</div>}
                                </td>
                                
                                <td className="text-center fw-bold text-success bg-success bg-opacity-10">
                                    {isSettled ? <span className="text-primary"><i className="bi bi-check-all"></i></span> : (
                                        <>
                                            {parseFloat(remGold) > 0.005 && <div>{remGold}g Au</div>}
                                            {parseFloat(remSilver) > 0.005 && <div>{remSilver}g Ag</div>}
                                        </>
                                    )}
                                </td>

                                <td>{isSettled ? <span className="badge bg-primary">Recv'd</span> : <span className="badge bg-warning text-dark">Due</span>}</td>
                                
                                <td className="text-end">
                                    <button className={`btn btn-sm py-0 ${isSettled ? 'btn-outline-secondary' : 'btn-outline-success'}`} onClick={() => openSettleModal(t)}>
                                        {isSettled ? <i className="bi bi-eye"></i> : 'Collect'}
                                    </button>
                                    <button className="btn btn-link text-muted p-0 ms-1" onClick={() => handleDeleteTxn(t.id)}><i className="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>

      {/* --- NET TALLY SECTION --- */}
      <div className="card mt-4 bg-light border-0 shadow-sm">
        <div className="card-body">
          <h5 className="fw-bold text-center mb-3 text-secondary">NET LEDGER POSITION (TALLY)</h5>
          <div className="row text-center align-items-center">
             <div className="col-md-4">
                 <div className={`p-3 bg-white rounded border shadow-sm ${parseFloat(shop.balance_gold) > 0 ? 'border-danger' : parseFloat(shop.balance_gold) < 0 ? 'border-success' : ''}`}>
                     <div className="text-muted small fw-bold">NET GOLD</div>
                     <h4 className={parseFloat(shop.balance_gold) > 0 ? 'text-danger' : parseFloat(shop.balance_gold) < 0 ? 'text-success' : 'text-muted'}>
                        {shop.balance_gold > 0 ? `We Owe ${shop.balance_gold}g` : shop.balance_gold < 0 ? `They Owe ${Math.abs(shop.balance_gold)}g` : '0g'}
                     </h4>
                 </div>
             </div>
             <div className="col-md-4">
                 <div className={`p-3 bg-white rounded border shadow-sm ${parseFloat(shop.balance_silver) > 0 ? 'border-danger' : parseFloat(shop.balance_silver) < 0 ? 'border-success' : ''}`}>
                     <div className="text-muted small fw-bold">NET SILVER</div>
                     <h4 className={parseFloat(shop.balance_silver) > 0 ? 'text-danger' : parseFloat(shop.balance_silver) < 0 ? 'text-success' : 'text-muted'}>
                        {shop.balance_silver > 0 ? `We Owe ${shop.balance_silver}g` : shop.balance_silver < 0 ? `They Owe ${Math.abs(shop.balance_silver)}g` : '0g'}
                     </h4>
                 </div>
             </div>
             <div className="col-md-4">
                 <div className={`p-3 bg-white rounded border shadow-sm ${parseFloat(shop.balance_cash) > 0 ? 'border-danger' : parseFloat(shop.balance_cash) < 0 ? 'border-success' : ''}`}>
                     <div className="text-muted small fw-bold">NET CASH</div>
                     <h4 className={parseFloat(shop.balance_cash) > 0 ? 'text-danger' : parseFloat(shop.balance_cash) < 0 ? 'text-success' : 'text-muted'}>
                        {shop.balance_cash > 0 ? `We Owe ₹${shop.balance_cash}` : shop.balance_cash < 0 ? `They Owe ₹${Math.abs(shop.balance_cash)}` : '₹0'}
                     </h4>
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- SETTLEMENT MODAL (Manual Bootstrap) --- */}
      {settleModalOpen && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className={`modal-header text-white ${selectedTxn?.type.includes('BORROW') ? 'bg-danger' : 'bg-success'}`}>
                <h5 className="modal-title">
                    {selectedTxn?.is_settled ? 'History' : selectedTxn?.type.includes('BORROW') ? 'Make Payment (Settle)' : 'Collect Payment (Settle)'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSettleModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                {selectedTxn && (
                    <>
                    {/* 1. Item Summary */}
                    <div className="alert alert-light border d-flex justify-content-between align-items-center">
                        <div>
                            <strong className="d-block text-muted small">Item Description</strong>
                            <span className="fs-5">{selectedTxn.description}</span>
                        </div>
                        <div className="text-end">
                            <strong className="d-block text-muted small">Total Value</strong>
                            {selectedTxn.pure_weight > 0 && <span className="badge bg-warning text-dark fs-6 me-1">Au {selectedTxn.pure_weight}g</span>}
                            {selectedTxn.silver_weight > 0 && <span className="badge bg-secondary fs-6">Ag {selectedTxn.silver_weight}g</span>}
                        </div>
                    </div>

                    {/* 2. Payment History Table */}
                    {paymentHistory.length > 0 && (
                        <div className="mb-4">
                            <h6 className="fw-bold border-bottom pb-2">History</h6>
                            <table className="table table-sm table-bordered text-center small">
                                <thead className="table-light"><tr><th>Date</th><th>Mode</th><th>Metal</th><th>Cash</th><th>Rate</th><th>Conv.</th></tr></thead>
                                <tbody>
                                    {paymentHistory.map(p => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td>{p.payment_mode}</td>
                                            <td>{parseFloat(p.gold_paid)>0 ? `${p.gold_paid}g Au` : parseFloat(p.silver_paid)>0 ? `${p.silver_paid}g Ag` : '-'}</td>
                                            <td>{parseFloat(p.cash_paid)>0 ? `₹${p.cash_paid}` : '-'}</td>
                                            <td>{p.metal_rate > 0 ? `₹${p.metal_rate}` : '-'}</td>
                                            <td className="fw-bold text-primary">{parseFloat(p.converted_metal_weight) > 0 ? `+ ${p.converted_metal_weight}g` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 3. New Payment Form (Only if NOT Settled) */}
                    {!selectedTxn.is_settled && (
                        <div className="bg-light p-3 rounded border">
                            <h6 className="fw-bold text-primary mb-3">
                                {selectedTxn.type.includes('BORROW') ? <><i className="bi bi-dash-circle me-2"></i>Record Payment Out</> : <><i className="bi bi-plus-circle me-2"></i>Record Payment In</>}
                            </h6>
                            
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="form-label small fw-bold">Payment Mode</label>
                                    <select className="form-select" value={settleForm.mode} onChange={e => setSettleForm({...settleForm, mode: e.target.value})}>
                                        <option value="METAL">Metal Only</option>
                                        <option value="CASH">Cash Only (Convert)</option>
                                        <option value="BOTH">Metal + Cash</option>
                                    </select>
                                </div>

                                {/* Metal Inputs */}
                                {(settleForm.mode === 'METAL' || settleForm.mode === 'BOTH') && (
                                    <>
                                    <div className="col-md-6">
                                        <label className="small">Gold Weight (g)</label>
                                        <input type="number" className="form-control" placeholder="0.000" value={settleForm.gold_val} onChange={e => setSettleForm({...settleForm, gold_val: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small">Silver Weight (g)</label>
                                        <input type="number" className="form-control" placeholder="0.000" value={settleForm.silver_val} onChange={e => setSettleForm({...settleForm, silver_val: e.target.value})} />
                                    </div>
                                    </>
                                )}

                                {/* Cash + Rate Inputs */}
                                {(settleForm.mode === 'CASH' || settleForm.mode === 'BOTH') && (
                                    <>
                                    <div className="col-md-12"><hr className="my-1"/></div>
                                    <div className="col-md-4">
                                        <label className="small fw-bold">Cash (₹)</label>
                                        <input type="number" className="form-control" placeholder="0" value={settleForm.cash_val} onChange={e => setSettleForm({...settleForm, cash_val: e.target.value})} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="small fw-bold">Metal Rate / g</label>
                                        <input type="number" className="form-control" placeholder="Rate" value={settleForm.metal_rate} onChange={e => setSettleForm({...settleForm, metal_rate: e.target.value})} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="small text-muted">Converted</label>
                                        <input type="text" className="form-control bg-white fw-bold text-success" disabled 
                                            value={ (settleForm.cash_val && settleForm.metal_rate) ? (parseFloat(settleForm.cash_val) / parseFloat(settleForm.metal_rate)).toFixed(3) + ' g' : '0.000 g' } 
                                        />
                                    </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 text-end">
                                <button className="btn btn-secondary me-2" onClick={() => setSettleModalOpen(false)}>Cancel</button>
                                <button className={`btn fw-bold px-4 ${selectedTxn.type.includes('BORROW') ? 'btn-danger' : 'btn-success'}`} onClick={handleSettleSubmit}>
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD NEW TRANSACTION MODAL --- */}
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
                   <button className={`btn ${formMode==='ITEM' ? (activeModal==='BORROW'?'btn-danger':'btn-success') : 'btn-outline-secondary'}`} onClick={() => setFormMode('ITEM')}>
                     1. Add Items / Cash
                   </button>
                   <button className={`btn ${formMode==='SETTLE' ? (activeModal==='BORROW'?'btn-danger':'btn-success') : 'btn-outline-secondary'}`} onClick={() => setFormMode('SETTLE')}>
                     2. Bulk Entry (Legacy)
                   </button>
                </div>

                {formMode === 'ITEM' && (
                  <div>
                    <table className="table table-bordered align-middle small text-center mb-3">
                      <thead className="table-light"><tr><th style={{width:'15%'}}>Type</th><th>Item Name</th><th style={{width:'15%'}}>Gross Wt</th><th style={{width:'10%'}}>Wst%</th><th style={{width:'15%'}}>Pure Wt</th><th></th></tr></thead>
                      <tbody>
                        {itemRows.map((row, i) => (
                          <tr key={i}>
                            <td>
                                <select className="form-select form-select-sm" value={row.type} onChange={e => handleRowChange(i, 'type', e.target.value)}>
                                    <option value="GOLD">Gold (Au)</option>
                                    <option value="SILVER">Silver (Ag)</option>
                                </select>
                            </td>
                            <td><input className="form-control form-control-sm" value={row.desc} onChange={e => handleRowChange(i, 'desc', e.target.value)} /></td>
                            <td><input className="form-control form-control-sm" type="number" value={row.gross} onChange={e => handleRowChange(i, 'gross', e.target.value)} /></td>
                            <td><input className="form-control form-control-sm" type="number" value={row.wast} onChange={e => handleRowChange(i, 'wast', e.target.value)} /></td>
                            <td className="bg-light fw-bold text-primary">{row.pure}</td>
                            <td><button className="btn btn-sm text-danger" onClick={() => removeRow(i)}><i className="bi bi-x"></i></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="btn btn-sm btn-outline-dark mb-3" onClick={addRow}>+ Add Item Row</button>
                    
                    <div className="card bg-light border-0 p-3">
                        <label className="fw-bold mb-1">Cash Amount (₹)</label>
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
                 <button className={`btn w-100 fw-bold ${activeModal==='BORROW'?'btn-danger':'btn-success'}`} onClick={handleMainSubmit}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopDetails;