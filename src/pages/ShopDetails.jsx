import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { FaEdit, FaTrash, FaCheck } from 'react-icons/fa';

function ShopDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [transactions, setTransactions] = useState([]); // Borrow/Lend Items (Top tables)
  const [fullHistory, setFullHistory] = useState([]);   // Combined History (Bottom table)
  const [loading, setLoading] = useState(false);
  const [productTypes, setProductTypes] = useState([]); 

  // States
  const [activeModal, setActiveModal] = useState(null); 
  const [formMode, setFormMode] = useState('ITEM'); 
  const [itemRows, setItemRows] = useState([]);
  const [form, setForm] = useState({ description: '', item_cash: '', settle_gold: '', settle_silver: '', settle_cash: '', bulk_action: 'ADD' });

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [settleForm, setSettleForm] = useState({ mode: 'METAL', gold_val: '', silver_val: '', cash_val: '', metal_rate: '' });

  // --- EDIT MODAL STATE ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, description: '', gross: '', wastage: '', mc_rate: '', manual_cash: '', type: 'GOLD', pure: 0, mc_total: 0, total_cash: 0 });
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try { 
        const [res, typeRes] = await Promise.all([
             api.getShopDetails(id),
             api.getProductTypes()
        ]);
        setShop(res.data.shop); 
        setTransactions(res.data.transactions); 
        setFullHistory(res.data.full_history || []); 
        setProductTypes(typeRes.data || []);
    } catch (err) { console.error(err); }
  };

  const toggleItemView = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // --- INITIALIZE ADD MODAL ---
  const initModal = (type) => {
    setActiveModal(type);
    setFormMode('ITEM');
    const defaultMetal = productTypes.length > 0 ? productTypes[0].name : 'GOLD';
    setItemRows([{ 
        type: defaultMetal, desc: '', gross: '', quantity: 1, 
        wast: 92, calcType: 'MUL', 
        mc_rate: '', mc_total: 0, pure: 0, 
        inventory_id: null, stock_type: 'SINGLE', metalOverride: 'AUTO' 
    }]);
    setForm({ description: '', item_cash: '', settle_gold: '', settle_silver: '', settle_cash: '', bulk_action: 'ADD' }); 
  };

  // --- ROW HANDLERS ---
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
    if (field === 'type') newRows[index].metalOverride = 'AUTO';
    setItemRows(newRows);
  };
  
  const toggleMetalOverride = (index) => {
      const newRows = [...itemRows];
      const current = newRows[index].metalOverride;
      if (current === 'AUTO') newRows[index].metalOverride = 'GOLD';
      else if (current === 'GOLD') newRows[index].metalOverride = 'SILVER';
      else newRows[index].metalOverride = 'AUTO';
      setItemRows(newRows);
  };

  const toggleStockType = (index) => {
      const newRows = [...itemRows];
      newRows[index].stock_type = newRows[index].stock_type === 'SINGLE' ? 'BULK' : 'SINGLE';
      setItemRows(newRows);
  };
  
  const getMetalTypeForRow = (row) => {
      if (row.metalOverride === 'GOLD') return 'GOLD';
      if (row.metalOverride === 'SILVER') return 'SILVER';
      const typeStr = (row.type || '').trim().toUpperCase();
      const matchedType = productTypes.find(t => (t.name || '').toUpperCase() === typeStr);
      const dbMetalType = matchedType ? (matchedType.metal_type || '').toUpperCase() : typeStr;
      const isSilver = dbMetalType.includes('SILVER') || dbMetalType.includes('AG') || dbMetalType.includes('STERLING') || dbMetalType.includes('925');
      return isSilver ? 'SILVER' : 'GOLD';
  };
  
  const searchAndFill = async (index) => {
      const query = prompt("Enter Item Name / Barcode:");
      if (!query) return;
      try {
          const res = await api.searchBillingItem(query);
          if (res.data && res.data.length > 0) {
              const item = res.data[0]; 
              const newRows = [...itemRows];
              const m = (item.metal_type || '').toUpperCase();
              const isSilver = m.includes('SILVER') || m.includes('AG') || m.includes('STERLING');
              newRows[index] = { ...newRows[index], desc: item.item_name, gross: item.gross_weight, type: item.metal_type, inventory_id: item.id, pure: item.pure_weight, stock_type: item.stock_type, quantity: 1, wast: item.wastage_percent || 0, metalOverride: isSilver ? 'SILVER' : 'GOLD' };
              setItemRows(newRows);
          } else { alert("No item found."); }
      } catch (err) { alert("Error searching."); }
  };
  
  const addRow = () => {
    const defaultMetal = productTypes.length > 0 ? productTypes[0].name : 'GOLD';
    setItemRows([...itemRows, { type: defaultMetal, desc: '', gross: '', quantity: 1, wast: 92, calcType: 'MUL', mc_rate: '', mc_total: 0, pure: 0, inventory_id: null, stock_type: 'SINGLE', metalOverride: 'AUTO' }]);
  };
  const removeRow = (i) => setItemRows(itemRows.filter((_, idx) => idx !== i));

  // --- SUBMIT NEW TRANSACTION ---
  const handleMainSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
        let promises = [];
        let actionType = '';
        if (formMode === 'ITEM') { actionType = (activeModal === 'BORROW') ? 'BORROW_ADD' : 'LEND_ADD'; } 
        else {
             if (activeModal === 'BORROW') actionType = (form.bulk_action === 'ADD') ? 'BORROW_ADD' : 'BORROW_REPAY';
             else actionType = (form.bulk_action === 'ADD') ? 'LEND_ADD' : 'LEND_COLLECT';
        }

        if (formMode === 'ITEM') {
            const validRows = itemRows.filter(r => r.gross);
            const manualCash = parseFloat(form.item_cash) || 0;
            if (validRows.length === 0 && manualCash === 0) { setLoading(false); return alert("Enter items or cash"); }

            for (const row of validRows) {
                const p = parseFloat(row.pure) || 0;
                if (p <= 0) {
                    setLoading(false);
                    return alert(`Item '${row.desc || 'Unnamed'}' has 0 Pure Weight. Please check Purity/Touch %.`);
                }
            }

            validRows.forEach(row => {
                const metalType = getMetalTypeForRow(row);
                const isSilver = (metalType === 'SILVER');
                const qty = parseInt(row.quantity) || 1;
                let details = `${row.desc || row.type}`; 
                if (row.stock_type === 'BULK') details += ` (x${qty})`;
                
                const payload = {
                    shop_id: id, action: actionType, description: details,
                    gross_weight: parseFloat(row.gross)||0, wastage_percent: parseFloat(row.wast)||0, making_charges: parseFloat(row.mc_total)||0,
                    pure_weight: !isSilver ? parseFloat(row.pure)||0 : 0,  
                    silver_weight: isSilver ? parseFloat(row.pure)||0 : 0, 
                    cash_amount: parseFloat(row.mc_total)||0, transfer_cash: false, inventory_item_id: row.inventory_id, quantity: qty 
                };
                promises.push(api.shopTransaction(payload));
            });
            
            if (manualCash > 0) {
                promises.push(api.shopTransaction({ shop_id: id, action: actionType, description: "Cash Loan / Advance", gross_weight: 0, wastage_percent: 0, making_charges: 0, pure_weight: 0, silver_weight: 0, cash_amount: manualCash, transfer_cash: true }));
            }
        } else {
            promises.push(api.shopTransaction({ shop_id: id, action: actionType, description: form.description || 'Manual Entry', pure_weight: form.settle_gold, silver_weight: form.settle_silver, cash_amount: form.settle_cash, transfer_cash: true }));
        }
        await Promise.all(promises);
        alert('Saved!'); setActiveModal(null); loadData(); 
    } catch (err) { alert('Error: ' + err.message); } finally { setLoading(false); }
  };

  const handleDeleteTxn = async (txnId) => {
    if(!window.confirm("Undo/Delete this transaction? Balance will be reversed.")) return;
    try { await api.deleteShopTransaction(txnId); loadData(); } catch(err) { alert('Delete Failed'); }
  };

  const getOutstanding = (t) => {
    const origGold = parseFloat(t.pure_weight) || 0; 
    const origSilver = parseFloat(t.silver_weight) || 0;
    const origCash = parseFloat(t.cash_amount) || 0;

    const paidGold = parseFloat(t.total_gold_paid) || 0; 
    const paidSilver = parseFloat(t.total_silver_paid) || 0;
    const paidCash = parseFloat(t.total_cash_paid) || 0;

    return { 
        remGold: Math.max(0, origGold - paidGold).toFixed(3), 
        remSilver: Math.max(0, origSilver - paidSilver).toFixed(3), 
        remCash: Math.max(0, origCash - paidCash).toFixed(2),
        isSettled: t.is_settled 
    };
  };
  
  // --- EDIT HANDLERS (UPDATED) ---
  const handleEditChange = (field, value) => {
    const newState = { ...editForm, [field]: value };
    const g = parseFloat(field==='gross'?value:newState.gross)||0;
    const w = parseFloat(field==='wastage'?value:newState.wastage)||0;
    const rate = parseFloat(field==='mc_rate'?value:newState.mc_rate)||0;
    const manCash = parseFloat(field==='manual_cash'?value:newState.manual_cash)||0;
    
    // Auto Calculate Pure
    newState.pure = (g * (w / 100)).toFixed(3); 
    newState.mc_total = (g * rate).toFixed(2);
    newState.total_cash = (parseFloat(newState.mc_total) + manCash).toFixed(2);
    setEditForm(newState);
  };

  const handleEditSubmit = async () => {
    const isSilver = editForm.type === 'SILVER';
    const payload = { 
        description: editForm.description, 
        gross_weight: editForm.gross, 
        wastage_percent: editForm.wastage, 
        making_charges: editForm.mc_total, 
        pure_weight: !isSilver ? editForm.pure : 0, 
        silver_weight: isSilver ? editForm.pure : 0, 
        cash_amount: editForm.total_cash 
    };
    try { 
        await api.updateShopTransaction(editForm.id, payload); 
        alert('Updated Successfully!'); 
        setEditModalOpen(false); 
        loadData(); 
    } catch (err) { alert('Update Failed: ' + err.message); }
  };

  const openEditModal = (t) => { 
      const totalCash = parseFloat(t.cash_amount) || 0;
      const mc = parseFloat(t.making_charges) || 0;
      const manualCash = (totalCash - mc).toFixed(2);
      const gross = parseFloat(t.gross_weight) || 0;
      const rate = gross > 0 ? (mc / gross).toFixed(2) : 0;

      // DETECT EXISTING TYPE
      let currentType = 'GOLD';
      if (parseFloat(t.silver_weight) > 0.001) {
          currentType = 'SILVER';
      }

      setEditForm({ 
          id: t.id, 
          description: t.description, 
          gross: t.gross_weight, 
          wastage: t.wastage_percent, 
          mc_rate: rate, 
          manual_cash: manualCash, 
          type: currentType, 
          pure: (currentType === 'GOLD' ? t.pure_weight : t.silver_weight), 
          mc_total: mc, 
          total_cash: totalCash 
      }); 
      setEditModalOpen(true); 
  };
  
  // --- SETTLE HANDLERS ---
  const openSettleModal = async (t) => { setSelectedTxn(t); setSettleModalOpen(true); };
  const handleSettleSubmit = async () => {
    let converted = 0; if (['CASH','BOTH'].includes(settleForm.mode) && settleForm.cash_val && settleForm.metal_rate) converted = (parseFloat(settleForm.cash_val) / parseFloat(settleForm.metal_rate)).toFixed(3);
    try { await api.settleShopItem({ transaction_id: selectedTxn.id, shop_id: id, payment_mode: settleForm.mode, gold_val: settleForm.gold_val, silver_val: settleForm.silver_val, cash_val: settleForm.cash_val, metal_rate: settleForm.metal_rate, converted_weight: converted }); alert("Recorded!"); setSettleModalOpen(false); loadData(); } catch (err) { alert("Error"); }
  };

  if (!shop) return <div>Loading...</div>;

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

      <div className="row text-center mb-4 g-3">
         {renderTallyCard('Net Gold', shop.balance_gold, 'g')}
         {renderTallyCard('Net Silver', shop.balance_silver, 'g')}
         {renderTallyCard('Net Cash', shop.balance_cash, '₹')}
      </div>

      {/* Transaction Lists (Top) */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 border-end">
          <div className="d-flex justify-content-between mb-2"><h5 className="text-danger fw-bold">Borrowed (We Owe)</h5><button className="btn btn-danger btn-sm" onClick={() => initModal('BORROW')}>+ New Borrow</button></div>
          <div className="table-responsive bg-light rounded" style={{maxHeight:'50vh'}}>
             <table className="table table-hover table-sm small mb-0">
                <thead className="table-danger text-dark"><tr><th>Date</th><th>Item</th><th>Gross</th><th className="text-end">Pending Pure</th><th className="text-end">Act</th></tr></thead>
                <tbody>
                    {borrowList.map(t => {
                        const { remGold, remSilver, remCash, isSettled } = getOutstanding(t);
                        return (
                        <tr key={t.id} className={isSettled ? "text-muted" : "bg-white"}>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                            <td onClick={() => toggleItemView(t.id)} style={{cursor: 'pointer'}}>{t.description}</td>
                            <td className="fw-bold">{t.gross_weight > 0 ? `${t.gross_weight}g` : '-'}</td>
                            <td className="text-end fw-bold text-danger bg-warning bg-opacity-10">
                                {isSettled ? <FaCheck className="text-success"/> : (
                                    <>
                                        {parseFloat(remGold)>0.005 && <div>{remGold}g Au</div>}
                                        {parseFloat(remSilver)>0.005 && <div>{remSilver}g Ag</div>}
                                        {parseFloat(remCash) > 1 && <div className="text-muted small">Bal: ₹{remCash}</div>}
                                        {parseFloat(remGold) <= 0.005 && parseFloat(remSilver) <= 0.005 && parseFloat(remCash) <= 1 && <span>-</span>}
                                    </>
                                )}
                            </td>
                            <td className="text-end">
                                {!isSettled && (
                                    <button className="btn btn-sm btn-outline-primary py-0 me-1" onClick={() => openEditModal(t)} title="Edit Item">
                                        <FaEdit />
                                    </button>
                                )}
                                <button className={`btn btn-sm py-0 me-1 ${isSettled?'btn-outline-secondary':'btn-outline-danger'}`} onClick={() => openSettleModal(t)}>{isSettled?'View':'Pay'}</button>
                                <button className="btn btn-link text-muted p-0" onClick={() => handleDeleteTxn(t.id)} title="Delete"><FaTrash /></button>
                            </td>
                        </tr>
                    )})}
                </tbody>
             </table>
          </div>
        </div>

        <div className="col-md-6">
          <div className="d-flex justify-content-between mb-2"><h5 className="text-success fw-bold">Lent (They Owe)</h5><button className="btn btn-success btn-sm" onClick={() => initModal('LEND')}>+ New Lend</button></div>
          <div className="table-responsive bg-light rounded" style={{maxHeight:'50vh'}}>
             <table className="table table-hover table-sm small mb-0">
                <thead className="table-success text-dark"><tr><th>Date</th><th>Item</th><th>Gross</th><th className="text-end">Pending Pure</th><th className="text-end">Act</th></tr></thead>
                <tbody>
                    {lendList.map(t => {
                        const { remGold, remSilver, remCash, isSettled } = getOutstanding(t);
                        return (
                        <tr key={t.id} className={isSettled ? "text-muted" : "bg-white"}>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                            <td onClick={() => toggleItemView(t.id)} style={{cursor: 'pointer'}}>{t.description}</td>
                            <td className="fw-bold">{t.gross_weight > 0 ? `${t.gross_weight}g` : '-'}</td>
                            <td className="text-end fw-bold text-success bg-success bg-opacity-10">
                                {isSettled ? <FaCheck className="text-primary"/> : (
                                    <>
                                        {parseFloat(remGold)>0.005 && <div>{remGold}g Au</div>}
                                        {parseFloat(remSilver)>0.005 && <div>{remSilver}g Ag</div>}
                                        {parseFloat(remCash) > 1 && <div className="text-muted small">Bal: ₹{remCash}</div>}
                                        {parseFloat(remGold) <= 0.005 && parseFloat(remSilver) <= 0.005 && parseFloat(remCash) <= 1 && <span>-</span>}
                                    </>
                                )}
                            </td>
                            <td className="text-end">
                                {!isSettled && (
                                    <button className="btn btn-sm btn-outline-primary py-0 me-1" onClick={() => openEditModal(t)} title="Edit Item">
                                        <FaEdit />
                                    </button>
                                )}
                                <button className={`btn btn-sm py-0 me-1 ${isSettled?'btn-outline-secondary':'btn-outline-success'}`} onClick={() => openSettleModal(t)}>{isSettled?'View':'Collect'}</button>
                                <button className="btn btn-link text-muted p-0" onClick={() => handleDeleteTxn(t.id)} title="Delete"><FaTrash /></button>
                            </td>
                        </tr>
                    )})}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* Audit Log Table (Bottom) */}
      <div className="card shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">Detailed Audit Log (Transactions & Payments)</div>
        <div className="table-responsive" style={{maxHeight:'400px'}}>
            <table className="table table-sm table-striped small align-middle mb-0">
                <thead className="table-light sticky-top">
                    <tr><th>Date</th><th>Type</th><th>Description</th><th className="text-end">Gold</th><th className="text-end">Silver</th><th className="text-end">Cash</th><th className="text-end">Action</th></tr>
                </thead>
                <tbody>
                    {fullHistory.map(row => (
                        <tr key={row.id} className={row.type === 'SETTLEMENT' ? 'table-info' : ''}>
                            <td>{new Date(row.created_at).toLocaleString()}</td>
                            <td>
                                {row.type === 'SETTLEMENT' ? (
                                    <span className="badge bg-info text-dark">SETTLEMENT</span>
                                ) : (
                                    <span className={`badge ${row.type.includes('BORROW') ? 'bg-danger' : 'bg-success'}`}>{row.type.replace('_', ' ')}</span>
                                )}
                            </td>
                            <td>{row.description}</td>
                            <td className="text-end fw-bold text-warning">
                                {parseFloat(row.pure_weight) > 0 ? `${parseFloat(row.pure_weight).toFixed(3)}g` : '-'}
                            </td>
                            <td className="text-end fw-bold text-secondary">
                                {parseFloat(row.silver_weight) > 0 ? `${parseFloat(row.silver_weight).toFixed(3)}g` : '-'}
                            </td>
                            <td className="text-end fw-bold text-success">
                                {parseFloat(row.cash_amount) > 0 ? `₹${row.cash_amount}` : '-'}
                            </td>
                            <td className="text-end">
                                {row.kind === 'TXN' && (
                                    <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => handleDeleteTxn(row.id)} title="Undo"><i className="bi bi-arrow-counterclockwise"></i></button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {fullHistory.length === 0 && <tr><td colSpan="7" className="text-center py-4">No History</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {/* ADD MODAL (Items/Cash) - Unchanged */}
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
                        <th>Item Name (Inventory)</th>
                        <th style={{width:'8%'}}>Category</th>
                        <th style={{width:'12%'}}>Gross Wt</th>
                        <th style={{width:'8%'}}>Qty</th>
                        <th style={{width:'12%'}}>Touch %</th>
                        <th style={{width:'10%'}}>MC Rate</th>
                        <th style={{width:'10%'}}>Total MC</th>
                        <th style={{width:'10%'}}>Pure Wt</th>
                        <th></th>
                      </tr></thead>
                      <tbody>
                        {itemRows.map((row, i) => {
                            const detectedMetal = getMetalTypeForRow(row);
                            const isSilver = (detectedMetal === 'SILVER');
                            return (
                          <tr key={i}>
                            <td>
                                <select className="form-select form-select-sm" value={row.type} onChange={e => handleRowChange(i, 'type', e.target.value)}>
                                    {!productTypes.find(t => t.name === row.type) && row.type && (
                                        <option value={row.type}>{row.type}</option>
                                    )}
                                    {productTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </td>
                            <td>
                                <div className="input-group input-group-sm">
                                    <input className="form-control" value={row.desc} onChange={e => handleRowChange(i, 'desc', e.target.value)} placeholder="Type Desc" />
                                    <button className="btn btn-primary" onClick={() => searchAndFill(i)} title="Search Inventory">
                                        <i className="bi bi-search"></i>
                                    </button>
                                </div>
                                {row.inventory_id && (
                                    <small className="d-block text-success text-start" style={{fontSize:'0.7rem'}}>
                                        Linked: #{row.inventory_id} {row.stock_type === 'BULK' ? '(Bulk)' : ''}
                                    </small>
                                )}
                            </td>
                            <td>
                                <span 
                                    className={`badge cursor-pointer ${isSilver ? 'bg-secondary text-white' : 'bg-warning text-dark'}`}
                                    onClick={() => toggleMetalOverride(i)}
                                    title={`Click to switch. Currently: ${row.metalOverride} (Detected: ${detectedMetal})`}
                                >
                                    {isSilver ? 'SILVER' : 'GOLD'}
                                </span>
                            </td>
                            <td><input className="form-control form-control-sm" type="number" value={row.gross} onChange={e => handleRowChange(i, 'gross', e.target.value)} /></td>
                            <td>
                                <div className="input-group input-group-sm">
                                    <input className="form-control text-center" type="number" value={row.quantity} onChange={e => handleRowChange(i, 'quantity', e.target.value)} />
                                    {!row.inventory_id && (
                                        <button className="btn btn-outline-secondary px-1" title="Toggle Bulk/Single" onClick={() => toggleStockType(i)}>{row.stock_type==='BULK' ? 'B' : 'S'}</button>
                                    )}
                                </div>
                            </td>
                            <td>
                                <div className="input-group input-group-sm">
                                    <input className="form-control" type="number" value={row.wast} onChange={e => handleRowChange(i, 'wast', e.target.value)} />
                                    <button className="btn btn-outline-secondary px-1" style={{fontSize:'0.7rem'}} onClick={() => handleRowChange(i, 'calcType', row.calcType === 'ADD' ? 'MUL' : 'ADD')}>
                                        {row.calcType==='ADD' ? '+ %' : 'x %'}
                                    </button>
                                </div>
                            </td>
                            <td><input className="form-control form-control-sm" type="number" placeholder="Rate" value={row.mc_rate} onChange={e => handleRowChange(i, 'mc_rate', e.target.value)} /></td>
                            <td className="bg-light fw-bold">₹{row.mc_total}</td>
                            <td className="bg-light fw-bold text-primary">{row.pure}</td>
                            <td><button className="btn btn-sm text-danger" onClick={() => removeRow(i)}><i className="bi bi-x"></i></button></td>
                          </tr>
                        )})}
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
                    <div className="mb-3 text-center">
                        <label className="fw-bold me-3">Action Type:</label>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="bulkAction" 
                                checked={form.bulk_action === 'ADD'} onChange={() => setForm({...form, bulk_action: 'ADD'})} />
                            <label className="form-check-label">{activeModal==='BORROW'?'Add Borrow (Increase Debt)':'Add Lend (Increase Credit)'}</label>
                        </div>
                        <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="bulkAction" 
                                checked={form.bulk_action === 'REPAY'} onChange={() => setForm({...form, bulk_action: 'REPAY'})} />
                            <label className="form-check-label">{activeModal==='BORROW'?'Repayment (Decrease Debt)':'Collection (Decrease Credit)'}</label>
                        </div>
                    </div>
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

      {/* EDIT MODAL (NOW INCLUDES METAL TYPE SWITCH) */}
      {editModalOpen && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Edit Transaction Details</h5>
                <button className="btn-close btn-close-white" onClick={() => setEditModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                    <label className="form-label small">Item Description</label>
                    <input className="form-control" value={editForm.description} onChange={e => handleEditChange('description', e.target.value)} />
                </div>
                
                {/* NEW: Metal Type Selector */}
                <div className="mb-3">
                    <label className="form-label small">Metal Type (Balance Bucket)</label>
                    <select className="form-select form-select-sm bg-light" value={editForm.type} onChange={e => handleEditChange('type', e.target.value)}>
                        <option value="GOLD">Gold</option>
                        <option value="SILVER">Silver</option>
                    </select>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <label className="form-label small">Gross Weight (g)</label>
                        <input type="number" className="form-control" value={editForm.gross} onChange={e => handleEditChange('gross', e.target.value)} />
                    </div>
                    <div className="col-6">
                        <label className="form-label small">Touch / Purity %</label>
                        <input type="number" className="form-control" value={editForm.wastage} onChange={e => handleEditChange('wastage', e.target.value)} />
                    </div>
                </div>
                <div className="alert alert-warning py-2 d-flex justify-content-between align-items-center">
                    <span>Pure Weight:</span>
                    <strong className="fs-5">{editForm.pure} g <small className="text-muted">({editForm.type})</small></strong>
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
                <div className="alert alert-success py-2 d-flex justify-content-between align-items-center">
                    <span>Total Cash Debt:</span>
                    <strong className="fs-5">₹{editForm.total_cash}</strong>
                </div>
              </div>
              <div className="modal-footer">
                 <button className="btn btn-primary w-100 fw-bold" onClick={handleEditSubmit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTLE MODAL - Unchanged */}
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