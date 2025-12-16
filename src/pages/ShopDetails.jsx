import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function ShopDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [transactions, setTransactions] = useState([]);
  
  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'BORROW' or 'LEND'
  const [formMode, setFormMode] = useState('ITEM'); // 'ITEM' or 'SETTLE'
  
  // Item Rows (Multi-row support)
  const [itemRows, setItemRows] = useState([]);
  
  // Form State (Unified)
  const [form, setForm] = useState({
    mode: 'ITEM',
    description: '', 
    item_cash: '', // NEW: Separate Cash field for Item Mode
    settle_gold: '', settle_silver: '', settle_cash: '' 
  });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try { const res = await api.getShopDetails(id); setShop(res.data.shop); setTransactions(res.data.transactions); } catch (err) { console.error(err); }
  };

  // --- ACTIONS ---
  const initModal = (type) => {
    setActiveModal(type);
    setFormMode('ITEM');
    // REMOVED 'cash' from row object
    setItemRows([{ desc: '', gross: '', wast: '', mc: '', pure: 0 }]);
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

  const addRow = () => setItemRows([...itemRows, { desc: '', gross: '', wast: '', mc: '', pure: 0 }]);
  const removeRow = (i) => setItemRows(itemRows.filter((_, idx) => idx !== i));

  const handleDeleteTxn = async (txnId) => {
    if(!window.confirm("Undo/Delete this transaction? Balance will be reversed.")) return;
    try { await api.deleteShopTransaction(txnId); loadData(); } catch(err) { alert('Delete Failed'); }
  };

  const handleSubmit = async () => {
    let payload = { shop_id: id };
    
    if (activeModal === 'BORROW') payload.action = formMode === 'ITEM' ? 'BORROW_ADD' : 'BORROW_REPAY';
    else payload.action = formMode === 'ITEM' ? 'LEND_ADD' : 'LEND_COLLECT';

    if (formMode === 'ITEM') {
        const validRows = itemRows.filter(r => r.gross);
        const cashValue = parseFloat(form.item_cash) || 0;

        // Validation: Must have at least (One Item) OR (Cash Value)
        if (validRows.length === 0 && cashValue === 0) return alert("Enter at least one item or cash amount");
        
        // Sum up totals
        const totalPure = validRows.reduce((sum, r) => sum + parseFloat(r.pure), 0);
        const totalMC = validRows.reduce((sum, r) => sum + (parseFloat(r.mc)||0), 0);
        const totalGross = validRows.reduce((sum, r) => sum + (parseFloat(r.gross)||0), 0);
        
        // Create Description
        let descList = validRows.map(r => `${r.desc || 'Item'} (${r.gross}g)`).join(', ');
        if (cashValue > 0) {
            descList += descList ? ` + Cash ₹${cashValue}` : `Cash ₹${cashValue}`;
        }
        
        payload.description = descList;
        payload.pure_weight = totalPure.toFixed(3);
        payload.making_charges = totalMC;
        payload.gross_weight = totalGross;
        payload.silver_weight = 0;
        payload.cash_amount = cashValue; // Use the separate field
    } else {
        // Settlement
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

  if (!shop) return <div className="p-5 text-center">Loading...</div>;

  const borrowHist = transactions.filter(t => t.type.includes('BORROW'));
  const lendHist = transactions.filter(t => t.type.includes('LEND'));

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/shops')}><i className="bi bi-arrow-left me-2"></i>Back</button>
        <h3 className="fw-bold mb-0">{shop.shop_name} <span className="text-muted fs-6">({shop.person_name})</span></h3>
      </div>

      <div className="row g-4">
        {/* --- LEFT: BORROW MANAGEMENT --- */}
        <div className="col-md-6 border-end">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-danger fw-bold"><i className="bi bi-box-arrow-in-down me-2"></i>Manage Borrowing (Debt)</h5>
            <button className="btn btn-danger btn-sm" onClick={() => initModal('BORROW')}>+ Add / Repay</button>
          </div>
          
          <div className="card shadow-sm mb-3 border-danger border-top-0 border-end-0 border-bottom-0 border-3">
             <div className="card-body p-2">
                <div className="row text-center">
                   <div className="col-4 border-end"><small className="text-muted d-block">Gold Debt</small><strong className="text-danger">{shop.balance_gold > 0 ? shop.balance_gold : 0} g</strong></div>
                   <div className="col-4 border-end"><small className="text-muted d-block">Silver Debt</small><strong className="text-danger">{shop.balance_silver > 0 ? shop.balance_silver : 0} g</strong></div>
                   <div className="col-4"><small className="text-muted d-block">Cash Debt</small><strong className="text-danger">₹{shop.balance_cash > 0 ? shop.balance_cash : 0}</strong></div>
                </div>
             </div>
          </div>

          <div className="table-responsive" style={{maxHeight:'50vh'}}>
            <table className="table table-sm table-hover small">
              <thead className="table-light"><tr><th>Date</th><th>Action</th><th>Desc</th><th>Value</th><th></th></tr></thead>
              <tbody>
                {borrowHist.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>{t.type==='BORROW_ADD'?<span className="badge bg-danger">ADDED</span>:<span className="badge bg-success">REPAID</span>}</td>
                    <td className="text-truncate" style={{maxWidth:'120px'}} title={t.description}>{t.description}</td>
                    <td className="fw-bold">{t.pure_weight>0?`${t.pure_weight}g`:t.cash_amount>0?`₹${t.cash_amount}`:'-'}</td>
                    <td><button className="btn btn-link text-muted p-0" onClick={() => handleDeleteTxn(t.id)} title="Undo"><i className="bi bi-trash"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- RIGHT: LEND MANAGEMENT --- */}
        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-success fw-bold"><i className="bi bi-box-arrow-up me-2"></i>Manage Lending (Credit)</h5>
            <button className="btn btn-success btn-sm" onClick={() => initModal('LEND')}>+ Lend / Collect</button>
          </div>

          <div className="card shadow-sm mb-3 border-success border-top-0 border-end-0 border-bottom-0 border-3">
             <div className="card-body p-2">
                <div className="row text-center">
                   <div className="col-4 border-end"><small className="text-muted d-block">Gold Credit</small><strong className="text-success">{shop.balance_gold < 0 ? Math.abs(shop.balance_gold) : 0} g</strong></div>
                   <div className="col-4 border-end"><small className="text-muted d-block">Silver Credit</small><strong className="text-success">{shop.balance_silver < 0 ? Math.abs(shop.balance_silver) : 0} g</strong></div>
                   <div className="col-4"><small className="text-muted d-block">Cash Credit</small><strong className="text-success">₹{shop.balance_cash < 0 ? Math.abs(shop.balance_cash) : 0}</strong></div>
                </div>
             </div>
          </div>

          <div className="table-responsive" style={{maxHeight:'50vh'}}>
            <table className="table table-sm table-hover small">
              <thead className="table-light"><tr><th>Date</th><th>Action</th><th>Desc</th><th>Value</th><th></th></tr></thead>
              <tbody>
                {lendHist.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>{t.type==='LEND_ADD'?<span className="badge bg-success">LENT</span>:<span className="badge bg-primary">COLLECT</span>}</td>
                    <td className="text-truncate" style={{maxWidth:'120px'}} title={t.description}>{t.description}</td>
                    <td className="fw-bold">{t.pure_weight>0?`${t.pure_weight}g`:t.cash_amount>0?`₹${t.cash_amount}`:'-'}</td>
                    <td><button className="btn btn-link text-muted p-0" onClick={() => handleDeleteTxn(t.id)} title="Undo"><i className="bi bi-trash"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- NET TALLY SECTION --- */}
      <div className="card mt-4 bg-light border-0 shadow-sm">
        <div className="card-body">
          <h5 className="fw-bold text-center mb-3">NET LEDGER POSITION (TALLY)</h5>
          <div className="row text-center align-items-center">
             <div className="col-md-4"><div className="p-3 bg-white rounded border"><div className="text-muted small fw-bold">NET GOLD</div><h4 className={parseFloat(shop.balance_gold) > 0 ? 'text-danger' : parseFloat(shop.balance_gold) < 0 ? 'text-success' : 'text-muted'}>{shop.balance_gold} g</h4></div></div>
             <div className="col-md-4"><div className="p-3 bg-white rounded border"><div className="text-muted small fw-bold">NET SILVER</div><h4 className={parseFloat(shop.balance_silver) > 0 ? 'text-danger' : parseFloat(shop.balance_silver) < 0 ? 'text-success' : 'text-muted'}>{shop.balance_silver} g</h4></div></div>
             <div className="col-md-4"><div className="p-3 bg-white rounded border"><div className="text-muted small fw-bold">NET CASH</div><h4 className={parseFloat(shop.balance_cash) > 0 ? 'text-danger' : parseFloat(shop.balance_cash) < 0 ? 'text-success' : 'text-muted'}>₹{shop.balance_cash}</h4></div></div>
          </div>
        </div>
      </div>

      {/* --- MODAL --- */}
      {activeModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className={`modal-header text-white ${activeModal === 'BORROW' ? 'bg-danger' : 'bg-success'}`}>
                <h5 className="modal-title fw-bold">
                  {activeModal === 'BORROW' ? 'Borrow Management' : 'Lend Management'}
                </h5>
                <button className="btn-close btn-close-white" onClick={() => setActiveModal(null)}></button>
              </div>
              <div className="modal-body">
                
                {/* MODE SWITCHER */}
                <div className="btn-group w-100 mb-3">
                   <button className={`btn ${formMode==='ITEM' ? (activeModal==='BORROW'?'btn-danger':'btn-success') : 'btn-outline-secondary'}`} 
                     onClick={() => setFormMode('ITEM')}>
                     {activeModal === 'BORROW' ? '1. Add Transaction (Items/Cash)' : '1. Lend (Items/Cash)'}
                   </button>
                   <button className={`btn ${formMode==='SETTLE' ? (activeModal==='BORROW'?'btn-danger':'btn-success') : 'btn-outline-secondary'}`} 
                     onClick={() => setFormMode('SETTLE')}>
                     {activeModal === 'BORROW' ? '2. Repayment (Out)' : '2. Collection (In)'}
                   </button>
                </div>

                {/* MODE 1: ITEMS + SEPARATE CASH */}
                {formMode === 'ITEM' && (
                  <div>
                    {/* Item Table */}
                    <table className="table table-bordered align-middle small text-center mb-3">
                      <thead className="table-light"><tr><th>Item Name / Desc</th><th style={{width:'15%'}}>Gross Wt</th><th style={{width:'10%'}}>Wst%</th><th style={{width:'15%'}}>Pure (Calc)</th><th style={{width:'12%'}}>MC</th><th></th></tr></thead>
                      <tbody>
                        {itemRows.map((row, i) => (
                          <tr key={i}>
                            <td><input className="form-control form-control-sm" placeholder="Name" value={row.desc} onChange={e => handleRowChange(i, 'desc', e.target.value)} /></td>
                            <td><input className="form-control form-control-sm" type="number" placeholder="0" value={row.gross} onChange={e => handleRowChange(i, 'gross', e.target.value)} /></td>
                            <td><input className="form-control form-control-sm" type="number" placeholder="0" value={row.wast} onChange={e => handleRowChange(i, 'wast', e.target.value)} /></td>
                            <td className="bg-light fw-bold text-primary">{row.pure}</td>
                            <td><input className="form-control form-control-sm" type="number" placeholder="0" value={row.mc} onChange={e => handleRowChange(i, 'mc', e.target.value)} /></td>
                            <td><button className="btn btn-sm text-danger" onClick={() => removeRow(i)}><i className="bi bi-x"></i></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="btn btn-sm btn-outline-dark mb-3" onClick={addRow}>+ Add Item Row</button>

                    {/* SEPARATE CASH FIELD */}
                    <div className="card bg-light border-0 p-3">
                        <label className="fw-bold mb-1"><i className="bi bi-cash me-1"></i> Cash {activeModal === 'BORROW' ? 'Borrowed' : 'Lent'} (₹)</label>
                        <input 
                            type="number" 
                            className="form-control" 
                            placeholder="Enter amount (Optional)" 
                            value={form.item_cash} 
                            onChange={e => setForm({...form, item_cash: e.target.value})} 
                        />
                    </div>
                  </div>
                )}

                {/* MODE 2: SETTLEMENT */}
                {formMode === 'SETTLE' && (
                  <div className="bg-light p-3 rounded">
                    <h6 className="fw-bold mb-3">Settlement Entry</h6>
                    <input className="form-control mb-2" placeholder="Note / Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                    <div className="row g-2">
                       <div className="col-4"><label className="small">Pure Gold (g)</label><input type="number" className="form-control" value={form.settle_gold} onChange={e => setForm({...form, settle_gold: e.target.value})} /></div>
                       <div className="col-4"><label className="small">Silver (g)</label><input type="number" className="form-control" value={form.settle_silver} onChange={e => setForm({...form, settle_silver: e.target.value})} /></div>
                       <div className="col-4"><label className="small">Cash (₹)</label><input type="number" className="form-control" value={form.settle_cash} onChange={e => setForm({...form, settle_cash: e.target.value})} /></div>
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                 <button className={`btn w-100 fw-bold ${activeModal==='BORROW'?'btn-danger':'btn-success'}`} onClick={handleSubmit}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopDetails;