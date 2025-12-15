import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Data
  const [vendor, setVendor] = useState(null);
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [itemSuggestions, setItemSuggestions] = useState([]);

  // UI Modes
  const [viewMode, setViewMode] = useState('overview'); 
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Modal States
  const [showEditVendor, setShowEditVendor] = useState(false);
  const [editVendorForm, setEditVendorForm] = useState({});
  
  const [showManageAgents, setShowManageAgents] = useState(false);
  const [agentForm, setAgentForm] = useState({ id: null, agent_name: '', agent_phone: '', agent_photo: null });
  const [isEditingAgent, setIsEditingAgent] = useState(false);

  const [showRepayment, setShowRepayment] = useState(false);
  const [repayForm, setRepayForm] = useState({ type: 'CASH', amount: '', rate: '', metal_weight: '', description: '' });

  // Stock Form
  const [stockRows, setStockRows] = useState([]);

  useEffect(() => { loadAllData(); }, [id]);

  const loadAllData = async () => {
    try {
      const allVendors = await api.searchVendor('');
      const v = allVendors.data.find(v => v.id === parseInt(id));
      if (v) { setVendor(v); setEditVendorForm(v); }
      
      const itemRes = await api.getVendorInventory(id);
      setItems(itemRes.data);
      setItemSuggestions([...new Set(itemRes.data.map(i => i.item_name))]);

      const transRes = await api.getVendorTransactions(id);
      setTransactions(transRes.data);

      const agentRes = await api.getVendorAgents(id);
      setAgents(agentRes.data);

    } catch (err) { console.error(err); }
  };

  // --- VENDOR ACTIONS ---
  const handleUpdateVendor = async () => {
    try { await api.updateVendor(id, editVendorForm); alert('Vendor Updated'); setShowEditVendor(false); loadAllData(); } catch (err) { alert('Update failed'); }
  };

  // --- AGENT ACTIONS ---
  const handleSaveAgent = async () => {
    if (!agentForm.agent_name) return alert("Name required");
    const formData = new FormData();
    formData.append('vendor_id', id);
    formData.append('agent_name', agentForm.agent_name);
    formData.append('agent_phone', agentForm.agent_phone);
    if (agentForm.agent_photo) formData.append('agent_photo', agentForm.agent_photo);

    try {
      if (isEditingAgent && agentForm.id) {
        await api.updateAgent(agentForm.id, formData);
        alert('Agent Updated');
      } else {
        await api.addAgent(formData);
        alert('Agent Added');
      }
      setAgentForm({ id: null, agent_name: '', agent_phone: '', agent_photo: null });
      setIsEditingAgent(false);
      const agentRes = await api.getVendorAgents(id);
      setAgents(agentRes.data);
    } catch(err) { alert('Error saving agent'); }
  };

  const handleEditAgent = (agent) => {
    setAgentForm({ id: agent.id, agent_name: agent.agent_name, agent_phone: agent.agent_phone, agent_photo: null });
    setIsEditingAgent(true);
  };

  const handleDeleteAgent = async (agentId) => {
    if(!window.confirm("Delete this agent?")) return;
    try { await api.deleteAgent(agentId); const res = await api.getVendorAgents(id); setAgents(res.data); } catch(err) { alert('Delete failed'); }
  };

  // --- STOCK ACTIONS ---
  const initStockForm = () => {
    // UPDATED: Defaults are now empty strings '' instead of 0 or 91.60
    setStockRows([{ metal_type: 'GOLD', stock_type: 'SINGLE', item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', item_image: null, calc_total_pure: 0 }]);
    setViewMode('add_stock');
  };
  const handleAddRow = () => setStockRows([...stockRows, { metal_type: 'GOLD', stock_type: 'SINGLE', item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', item_image: null, calc_total_pure: 0 }]);
  const removeRow = (i) => setStockRows(stockRows.filter((_, idx) => idx !== i));

  const handleRowChange = (index, field, value) => {
    const copy = [...stockRows];
    copy[index][field] = value;
    if (field === 'gross_weight' || field === 'wastage_percent') {
      const gross = parseFloat(field === 'gross_weight' ? value : copy[index].gross_weight) || 0;
      const pct = parseFloat(field === 'wastage_percent' ? value : copy[index].wastage_percent) || 0;
      copy[index].calc_total_pure = (gross * (pct / 100)).toFixed(3);
    }
    setStockRows(copy);
  };
  const handleFileChange = (i, file) => { const copy = [...stockRows]; copy[i].item_image = file; setStockRows(copy); };

  const batchTotalPure = stockRows.reduce((sum, row) => sum + (parseFloat(row.calc_total_pure) || 0), 0).toFixed(3);
  const batchTotalGross = stockRows.reduce((sum, row) => sum + (parseFloat(row.gross_weight) || 0), 0).toFixed(3);

  const handleSubmitStock = async () => {
    const validRows = stockRows.filter(r => r.item_name && r.gross_weight);
    if (validRows.length === 0) return alert("Fill at least one row");

    try {
      for (const row of validRows) {
        const formData = new FormData();
        formData.append('vendor_id', id);
        formData.append('metal_type', row.metal_type);
        formData.append('stock_type', row.stock_type);
        formData.append('item_name', row.item_name);
        formData.append('gross_weight', row.gross_weight);
        formData.append('wastage_percent', row.wastage_percent);
        formData.append('making_charges', row.making_charges);
        if (row.item_image) formData.append('item_image', row.item_image);
        await api.addInventory(formData);
      }
      const desc = `Stock Added: ${validRows.length} items (Gross: ${batchTotalGross}g)`;
      await api.vendorTransaction({ vendor_id: id, type: 'STOCK_ADDED', description: desc, metal_weight: batchTotalPure, cash_amount: 0, conversion_rate: 0 });
      alert('Stock Added'); setViewMode('overview'); loadAllData();
    } catch(err) { alert('Error adding stock'); }
  };

  // --- ITEM ACTIONS ---
  const handleDeleteItem = async (itemId) => { if(window.confirm("Delete item? This will reduce the balance.")) { await api.deleteInventory(itemId); loadAllData(); }};
  const startEditItem = (item) => { setEditingItem(item); setEditForm({ gross_weight: item.gross_weight, wastage_percent: item.wastage_percent, update_comment: '' }); };
  const handleSaveEditItem = async () => { if(!editForm.update_comment) return alert("Note required"); await api.updateInventory(editingItem.id, editForm); setEditingItem(null); loadAllData(); };

  // --- REPAYMENT ---
  const calculateRepaymentTotal = () => {
    let total = 0;
    if (['CASH', 'MIXED'].includes(repayForm.type) && repayForm.amount && repayForm.rate) total += parseFloat(repayForm.amount) / parseFloat(repayForm.rate);
    if (['METAL', 'MIXED'].includes(repayForm.type) && repayForm.metal_weight) total += parseFloat(repayForm.metal_weight);
    return total.toFixed(3);
  };
  const handleRepayment = async () => {
    const total = calculateRepaymentTotal();
    if (parseFloat(total) <= 0) return alert("Invalid");
    const payload = {
      vendor_id: id, type: 'REPAYMENT', description: repayForm.description || 'Settlement',
      metal_weight: (repayForm.type !== 'CASH') ? repayForm.metal_weight : 0,
      cash_amount: (repayForm.type !== 'METAL') ? repayForm.amount : 0,
      conversion_rate: (repayForm.type !== 'METAL') ? repayForm.rate : 0
    };
    await api.vendorTransaction(payload);
    alert('Saved'); setShowRepayment(false); setRepayForm({ type: 'CASH', amount: '', rate: '', metal_weight: '', description: '' }); loadAllData();
  };

  // --- HELPERS ---
  const availableItems = items.filter(i => i.status === 'AVAILABLE');
  const soldItems = items.filter(i => i.status === 'SOLD');

  const getBadgeInfo = (txn) => {
    if (txn.type === 'STOCK_ADDED') return { label: 'STOCK', color: 'text-danger' };
    if (txn.description.toLowerCase().includes('deleted')) return { label: 'DELETED', color: 'text-warning' };
    return { label: 'PAID', color: 'text-success' };
  };

  if (!vendor) return <div className="p-5 text-center">Loading...</div>;

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/')}><i className="bi bi-arrow-left me-1"></i> Back</button>
        <div className="btn-group">
          <button className={`btn ${viewMode === 'overview' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('overview')}>Dashboard</button>
          <button className={`btn ${viewMode === 'add_stock' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={initStockForm}>Add Stock</button>
        </div>
      </div>

      {viewMode === 'add_stock' && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-primary text-white"><h5 className="mb-0">Add Stock</h5></div>
          <div className="table-responsive">
            <table className="table table-bordered mb-0 align-middle">
              <thead className="table-light text-center small">
                <tr><th>Metal</th><th>Item Name</th><th>Image (Capture)</th><th>Type</th><th>Gross Wt</th><th>Wastage %</th><th>Making ₹</th><th className="bg-light">Pure</th><th></th></tr>
              </thead>
              <tbody>
                {stockRows.map((row, i) => (
                  <tr key={i}>
                    <td><select className="form-select form-select-sm" value={row.metal_type} onChange={e => handleRowChange(i, 'metal_type', e.target.value)}><option>GOLD</option><option>SILVER</option></select></td>
                    <td><input className="form-control form-control-sm" list={`suggestions-${i}`} placeholder="Name" value={row.item_name} onChange={e => handleRowChange(i, 'item_name', e.target.value)} /><datalist id={`suggestions-${i}`}>{itemSuggestions.map((n, idx) => <option key={idx} value={n} />)}</datalist></td>
                    <td><input type="file" className="form-control form-control-sm" accept="image/*" capture="environment" onChange={e => handleFileChange(i, e.target.files[0])} /></td>
                    <td><select className="form-select form-select-sm" value={row.stock_type} onChange={e => handleRowChange(i, 'stock_type', e.target.value)}><option>SINGLE</option><option>BULK</option></select></td>
                    <td><input type="number" step="0.001" className="form-control form-control-sm" value={row.gross_weight} onChange={e => handleRowChange(i, 'gross_weight', e.target.value)} /></td>
                    <td><input type="number" step="0.01" className="form-control form-control-sm" value={row.wastage_percent} onChange={e => handleRowChange(i, 'wastage_percent', e.target.value)} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={row.making_charges} onChange={e => handleRowChange(i, 'making_charges', e.target.value)} /></td>
                    <td className="bg-light fw-bold text-center text-primary">{row.calc_total_pure}</td>
                    <td className="text-center"><button className="btn btn-sm btn-link text-danger" onClick={() => removeRow(i)}><i className="bi bi-x-lg"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
            <button className="btn btn-outline-primary btn-sm" onClick={handleAddRow}>+ Row</button>
            <div className="text-end"><span className="me-3 small fw-bold text-muted">BATCH PURE: <span className="text-success fs-5">{batchTotalPure} g</span></span><button className="btn btn-success fw-bold px-4" onClick={handleSubmitStock}>Save</button></div>
          </div>
        </div>
      )}

      {viewMode === 'overview' && (
        <div className="row g-3">
          {/* LEFT: VENDOR */}
          <div className="col-md-3">
             <div className="card shadow-sm mb-3">
                <div className="card-header bg-white fw-bold d-flex justify-content-between"><span>Vendor (ID: {vendor.id})</span><button className="btn btn-sm btn-link" onClick={() => setShowEditVendor(true)}>Edit</button></div>
                <div className="card-body">
                   <h5 className="fw-bold text-primary">{vendor.business_name}</h5>
                   <p className="small mb-1"><i className="bi bi-telephone me-1"></i> {vendor.contact_number}</p>
                   <p className="small mb-1"><i className="bi bi-geo-alt me-1"></i> {vendor.address}</p>
                   <p className="small mb-0"><i className="bi bi-receipt me-1"></i> GST: {vendor.gst_number}</p>
                   <hr />
                   <button className="btn btn-outline-dark btn-sm w-100" onClick={() => setShowManageAgents(true)}><i className="bi bi-people me-1"></i> Manage Agents</button>
                </div>
             </div>
          </div>
          
          {/* CENTER: ITEMS */}
          <div className="col-md-6">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold text-success">Available ({availableItems.length})</h6></div>
              <div className="table-responsive" style={{maxHeight:'40vh'}}>
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light sticky-top small"><tr><th>Date</th><th>Image</th><th>Details</th><th>Wt / Wst%</th><th>Actions</th></tr></thead>
                  <tbody>
                    {availableItems.map(item => (
                      <tr key={item.id}>
                        <td className="small text-muted">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td>{item.item_image && <img src={item.item_image} className="rounded border" style={{width:'40px',height:'40px',objectFit:'cover'}} />}</td>
                        <td><div className="fw-bold small">{item.item_name}</div><div className="small font-monospace text-muted">{item.barcode} | ID:{item.id}</div></td>
                        <td><div className="fw-bold">{item.gross_weight}g</div><div className="small text-muted">{item.wastage_percent}%</div></td>
                        <td><button className="btn btn-sm btn-link text-primary p-0 me-2" onClick={() => startEditItem(item)}><i className="bi bi-pencil"></i></button><button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteItem(item.id)}><i className="bi bi-trash"></i></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* SOLD TABLE */}
            <div className="card shadow-sm border-0"><div className="card-header bg-white py-2"><h6 className="mb-0 fw-bold text-secondary">History / Sold ({soldItems.length})</h6></div><div className="table-responsive" style={{maxHeight:'40vh'}}><table className="table table-hover align-middle mb-0"><thead className="table-light sticky-top small"><tr><th>Date</th><th>Image</th><th>Details</th><th>Wt</th><th>Status</th></tr></thead><tbody>{soldItems.map(item => (<tr key={item.id} className="bg-light opacity-75"><td className="small text-muted">{new Date(item.created_at).toLocaleDateString()}</td><td>{item.item_image && <img src={item.item_image} className="rounded border" style={{width:'35px',height:'35px',objectFit:'cover',filter:'grayscale(100%)'}} />}</td><td><div className="fw-bold small">{item.item_name}</div><div className="small font-monospace text-muted">{item.barcode}</div></td><td className="fw-bold">{item.gross_weight}g</td><td><span className="badge bg-secondary">SOLD</span></td></tr>))}</tbody></table></div></div>
          </div>
          
          {/* RIGHT: LEDGER */}
          <div className="col-md-3">
             <div className="card bg-danger text-white mb-3 text-center p-3 shadow-sm">
                <small className="fw-bold opacity-75">PURE BALANCE OWED</small>
                <div className="display-6 fw-bold">{vendor.balance_pure_weight} g</div>
                <button className="btn btn-light btn-sm w-100 mt-2 text-danger fw-bold" onClick={() => setShowRepayment(!showRepayment)}>{showRepayment?'Cancel':'+ Settlement'}</button>
             </div>
             {showRepayment && (
               <div className="card shadow-sm mb-3 border-danger">
                 <div className="card-body">
                    <select className="form-select form-select-sm mb-2" value={repayForm.type} onChange={e => setRepayForm({...repayForm, type: e.target.value})}><option value="CASH">Cash</option><option value="METAL">Metal</option><option value="MIXED">Mixed</option></select>
                    {(repayForm.type!=='METAL') && <div className="row g-1 mb-2"><div className="col-6"><input type="number" className="form-control form-control-sm" placeholder="₹ Amount" value={repayForm.amount} onChange={e => setRepayForm({...repayForm, amount: e.target.value})} /></div><div className="col-6"><input type="number" className="form-control form-control-sm" placeholder="Rate" value={repayForm.rate} onChange={e => setRepayForm({...repayForm, rate: e.target.value})} /></div></div>}
                    {(repayForm.type!=='CASH') && <input type="number" className="form-control form-control-sm mb-2" placeholder="Metal Wt (g)" value={repayForm.metal_weight} onChange={e => setRepayForm({...repayForm, metal_weight: e.target.value})} />}
                    <div className="alert alert-warning p-1 text-center small mb-2">Total Reduced: <strong>{calculateRepaymentTotal()} g</strong></div>
                    <button className="btn btn-danger btn-sm w-100" onClick={handleRepayment}>Save</button>
                 </div>
               </div>
             )}
             <div className="card shadow-sm"><div className="card-header bg-white py-2 small fw-bold text-muted">Ledger</div><div className="card-body p-0 overflow-auto" style={{maxHeight:'40vh'}}><ul className="list-group list-group-flush small">{transactions.map(txn => { const badge = getBadgeInfo(txn); return (<li key={txn.id} className="list-group-item"><div className="d-flex justify-content-between"><span className={`fw-bold ${badge.color}`}>{badge.label}</span><span>{new Date(txn.created_at).toLocaleDateString()}</span></div><div className="mb-1 text-muted" style={{fontSize:'0.75rem'}}>{txn.description}</div><div className="d-flex justify-content-between align-items-center bg-light p-1 rounded"><div className="text-muted" style={{fontSize:'0.7rem'}}>Bal: <span className="text-dark fw-bold">{txn.balance_after}g</span></div><div className={`fw-bold ${badge.color}`}>{txn.type==='STOCK_ADDED'?'+':'-'} {txn.total_repaid_pure||txn.stock_pure_weight} g</div></div></li>)})}</ul></div></div>
          </div>
        </div>
      )}

      {/* --- MODAL: MANAGE AGENTS --- */}
      {showManageAgents && (
         <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg">
               <div className="modal-content">
                  <div className="modal-header"><h5 className="modal-title">Manage Agents for {vendor.business_name}</h5><button className="btn-close" onClick={() => setShowManageAgents(false)}></button></div>
                  <div className="modal-body">
                     <div className="row g-2 mb-3 bg-light p-2 rounded">
                        <div className="col-md-4"><input className="form-control form-control-sm" placeholder="Agent Name" value={agentForm.agent_name} onChange={e => setAgentForm({...agentForm, agent_name: e.target.value})} /></div>
                        <div className="col-md-4"><input className="form-control form-control-sm" placeholder="Phone" value={agentForm.agent_phone} onChange={e => setAgentForm({...agentForm, agent_phone: e.target.value})} /></div>
                        <div className="col-md-4 d-flex"><input type="file" className="form-control form-control-sm me-2" onChange={e => setAgentForm({...agentForm, agent_photo: e.target.files[0]})} /><button className="btn btn-primary btn-sm" onClick={handleSaveAgent}>{isEditingAgent?'Update':'Add'}</button></div>
                     </div>
                     <div className="table-responsive">
                       <table className="table table-bordered align-middle">
                         <thead><tr className="table-light"><th>Photo</th><th>Name</th><th>Phone</th><th>Actions</th></tr></thead>
                         <tbody>
                           {agents.map(agent => (
                             <tr key={agent.id}>
                               <td>{agent.agent_photo ? <img src={agent.agent_photo} style={{width:'30px',height:'30px',objectFit:'cover',borderRadius:'50%'}} /> : <i className="bi bi-person-circle text-muted fs-4"></i>}</td>
                               <td className="fw-bold">{agent.agent_name}</td>
                               <td>{agent.agent_phone}</td>
                               <td><button className="btn btn-sm btn-link" onClick={() => handleEditAgent(agent)}>Edit</button><button className="btn btn-sm btn-link text-danger" onClick={() => handleDeleteAgent(agent.id)}>Delete</button></td>
                             </tr>
                           ))}
                           {agents.length===0 && <tr><td colSpan="4" className="text-center text-muted">No agents found.</td></tr>}
                         </tbody>
                       </table>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* MODAL: EDIT VENDOR */}
      {showEditVendor && (
         <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog">
               <div className="modal-content">
                  <div className="modal-header"><h5 className="modal-title">Edit Vendor</h5><button className="btn-close" onClick={() => setShowEditVendor(false)}></button></div>
                  <div className="modal-body">
                     <input className="form-control mb-2" placeholder="Name" value={editVendorForm.business_name} onChange={e => setEditVendorForm({...editVendorForm, business_name: e.target.value})} />
                     <input className="form-control mb-2" placeholder="Contact" value={editVendorForm.contact_number} onChange={e => setEditVendorForm({...editVendorForm, contact_number: e.target.value})} />
                     <textarea className="form-control mb-2" placeholder="Address" value={editVendorForm.address} onChange={e => setEditVendorForm({...editVendorForm, address: e.target.value})} />
                     <input className="form-control mb-2" placeholder="GST" value={editVendorForm.gst_number} onChange={e => setEditVendorForm({...editVendorForm, gst_number: e.target.value})} />
                  </div>
                  <div className="modal-footer"><button className="btn btn-primary" onClick={handleUpdateVendor}>Save</button></div>
               </div>
            </div>
         </div>
      )}

      {/* MODAL: EDIT ITEM */}
      {editingItem && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Edit Item</h5><button className="btn-close" onClick={() => setEditingItem(null)}></button></div><div className="modal-body"><div className="mb-2"><label className="form-label">Gross Wt</label><input className="form-control" type="number" value={editForm.gross_weight} onChange={e => setEditForm({...editForm, gross_weight: e.target.value})} /></div><div className="mb-2"><label className="form-label">Wastage %</label><input className="form-control" type="number" value={editForm.wastage_percent} onChange={e => setEditForm({...editForm, wastage_percent: e.target.value})} /></div><div className="mb-2"><label className="form-label">Note</label><textarea className="form-control" value={editForm.update_comment} onChange={e => setEditForm({...editForm, update_comment: e.target.value})} /></div></div><div className="modal-footer"><button className="btn btn-primary" onClick={handleSaveEditItem}>Update</button></div></div></div>
        </div>
      )}
    </div>
  );
}

export default VendorDetails;