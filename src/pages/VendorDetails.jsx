import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

// Helper to convert File to Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // remove data:image/jpeg;base64, header
    reader.onerror = error => reject(error);
});

function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Data
  const [vendor, setVendor] = useState(null);
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [masterItems, setMasterItems] = useState([]); 

  // UI Modes & Search
  const [viewMode, setViewMode] = useState('overview'); 
  const [itemSearch, setItemSearch] = useState('');
  
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [purityMode, setPurityMode] = useState('TOUCH'); 

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
  const [batchInvoice, setBatchInvoice] = useState(''); // NEW STATE

  useEffect(() => { loadAllData(); }, [id]);

  const loadAllData = async () => {
    try {
      const allVendors = await api.searchVendor('');
      const v = allVendors.data.find(v => v.id === parseInt(id));
      if (v) { setVendor(v); setEditVendorForm(v); }
      
      const itemRes = await api.getVendorInventory(id);
      setItems(itemRes.data);

      const transRes = await api.getVendorTransactions(id);
      setTransactions(transRes.data || []); 

      const agentRes = await api.getVendorAgents(id);
      setAgents(agentRes.data || []);

      fetchMasterItems();
    } catch (err) { console.error("Error loading data", err); }
  };

  const fetchMasterItems = async () => {
      try {
        const masterRes = await api.getMasterItems();
        setMasterItems(masterRes.data);
      } catch (e) { console.warn("Settings API error", e); }
  };

  // --- FILTER LOGIC (SEARCH) ---
  const filterItems = (list) => {
    if(!itemSearch) return list;
    const lower = itemSearch.toLowerCase();
    return list.filter(i => 
       (i.item_name && i.item_name.toLowerCase().includes(lower)) || 
       (i.barcode && i.barcode.toLowerCase().includes(lower)) ||
       (i.huid && i.huid.toLowerCase().includes(lower))
    );
  };

  const availableItems = filterItems(items.filter(i => i.status === 'AVAILABLE'));
  const soldItems = filterItems(items.filter(i => i.status === 'SOLD'));

  // Calculate Totals for Filtered Views
  const availableWeight = availableItems.reduce((acc, i) => acc + (parseFloat(i.gross_weight)||0), 0).toFixed(3);
  const soldWeight = soldItems.reduce((acc, i) => acc + (parseFloat(i.gross_weight)||0), 0).toFixed(3);

  // --- ACTIONS ---
  const handleUpdateVendor = async () => { try { await api.updateVendor(id, editVendorForm); alert('Vendor Updated'); setShowEditVendor(false); loadAllData(); } catch (err) { alert('Update failed'); } };
  
  const handleSaveAgent = async () => {
    if (!agentForm.agent_name) return alert("Name required");
    const formData = new FormData();
    formData.append('vendor_id', id);
    formData.append('agent_name', agentForm.agent_name);
    formData.append('agent_phone', agentForm.agent_phone);
    if (agentForm.agent_photo) formData.append('agent_photo', agentForm.agent_photo);

    try {
      if (isEditingAgent && agentForm.id) { await api.updateAgent(agentForm.id, formData); } else { await api.addAgent(formData); }
      setAgentForm({ id: null, agent_name: '', agent_phone: '', agent_photo: null }); setIsEditingAgent(false);
      const res = await api.getVendorAgents(id); setAgents(res.data);
    } catch(err) { alert('Error saving agent'); }
  };

  const handleEditAgent = (agent) => { setAgentForm({ id: agent.id, agent_name: agent.agent_name, agent_phone: agent.agent_phone, agent_photo: null }); setIsEditingAgent(true); };
  const handleDeleteAgent = async (agentId) => { if(window.confirm("Delete?")) { await api.deleteAgent(agentId); const res = await api.getVendorAgents(id); setAgents(res.data); }};

  // --- STOCK FORM LOGIC ---
  const getDefaultMetal = () => (!vendor || vendor.vendor_type === 'SILVER') ? 'SILVER' : 'GOLD';
  const showGoldOption = () => !vendor || vendor.vendor_type !== 'SILVER';
  const showSilverOption = () => !vendor || vendor.vendor_type !== 'GOLD';

  const initStockForm = () => {
    fetchMasterItems();
    setStockRows([{ metal_type: getDefaultMetal(), stock_type: 'SINGLE', item_name: '', huid: '', gross_weight: '', wastage_percent: '', making_charges: '', item_image: null, calc_total_pure: 0 }]);
    setBatchInvoice('');
    setViewMode('add_stock'); setPurityMode('TOUCH');
  };

  const handleAddRow = () => setStockRows([...stockRows, { metal_type: getDefaultMetal(), stock_type: 'SINGLE', item_name: '', huid: '', gross_weight: '', wastage_percent: '', making_charges: '', item_image: null, calc_total_pure: 0 }]);
  const removeRow = (i) => setStockRows(stockRows.filter((_, idx) => idx !== i));

  const togglePurityMode = () => {
      const newMode = purityMode === 'TOUCH' ? 'WASTAGE' : 'TOUCH';
      setPurityMode(newMode);
      setStockRows(stockRows.map(row => ({ ...row, calc_total_pure: calculatePure(row.gross_weight, row.wastage_percent, newMode) })));
  };

  const calculatePure = (grossStr, factorStr, mode) => {
      const gross = parseFloat(grossStr) || 0;
      const factor = parseFloat(factorStr) || 0;
      return mode === 'TOUCH' ? (gross * (factor / 100)).toFixed(3) : (gross * (1 + (factor / 100))).toFixed(3);
  };

  const handleRowChange = (index, field, value) => {
    const copy = [...stockRows];
    copy[index][field] = value;
    let gross = parseFloat(copy[index].gross_weight) || 0;
    
    if (field === 'gross_weight' || field === 'wastage_percent') {
        if(field === 'gross_weight') gross = parseFloat(value) || 0;
        copy[index].calc_total_pure = calculatePure(copy[index].gross_weight, copy[index].wastage_percent, purityMode);
    }
    if (field === 'item_name') {
        const matched = masterItems.find(m => m.item_name.toLowerCase() === value.trim().toLowerCase() && m.metal_type === copy[index].metal_type);
        if (matched) {
            copy[index].wastage_percent = matched.default_wastage;
            copy[index].calc_total_pure = calculatePure(copy[index].gross_weight, matched.default_wastage, purityMode);
            if (matched.mc_type === 'FIXED') copy[index].making_charges = matched.mc_value;
            else if (matched.mc_type === 'PER_GRAM' && gross > 0) copy[index].making_charges = (gross * parseFloat(matched.mc_value)).toFixed(2);
        }
    }
    setStockRows(copy);
  };

  const handleFileChange = (i, file) => { const copy = [...stockRows]; copy[i].item_image = file; setStockRows(copy); };
  
  // NEW: Updated Submit Logic for Batching
  const handleSubmitStock = async () => {
    const validRows = stockRows.filter(r => r.item_name && r.gross_weight);
    if (validRows.length === 0) return alert("Fill at least one row");

    // Group rows by Metal Type
    const grouped = {};
    validRows.forEach(row => {
        if(!grouped[row.metal_type]) grouped[row.metal_type] = [];
        grouped[row.metal_type].push(row);
    });

    try {
      for (const metal of Object.keys(grouped)) {
          const itemsToProcess = grouped[metal];
          
          // Process images to Base64 async
          const processedItems = await Promise.all(itemsToProcess.map(async (item) => {
              let b64 = null;
              if (item.item_image && item.item_image instanceof File) {
                  b64 = await toBase64(item.item_image);
              }
              return {
                  ...item,
                  pure_weight: item.calc_total_pure, // Send frontend calculated pure
                  item_image_base64: b64 // Send image as Base64 string
              };
          }));

          // Send Batch
          await api.addBatchInventory({
              vendor_id: id,
              metal_type: metal,
              invoice_no: batchInvoice,
              items: processedItems
          });
      }

      alert('Stock Added Successfully!'); 
      setViewMode('overview'); 
      loadAllData();
    } catch(err) { 
        console.error(err);
        alert('Error adding stock: ' + err.message); 
    }
  };

  const handleDeleteItem = async (itemId) => { if(window.confirm("Delete item? Reduces balance.")) { await api.deleteInventory(itemId); loadAllData(); }};
  const startEditItem = (item) => { setEditingItem(item); setEditForm({ gross_weight: item.gross_weight, wastage_percent: item.wastage_percent, update_comment: '' }); };
  const handleSaveEditItem = async () => { if(!editForm.update_comment) return alert("Note required"); await api.updateInventory(editingItem.id, editForm); setEditingItem(null); loadAllData(); };
  
  const handleRepayment = async () => {
    const total = (repayForm.type === 'METAL') ? repayForm.metal_weight : (parseFloat(repayForm.amount) / parseFloat(repayForm.rate)).toFixed(3);
    if (parseFloat(total) <= 0) return alert("Invalid Amount");
    const payload = { vendor_id: id, type: 'REPAYMENT', description: repayForm.description || 'Settlement', metal_weight: (repayForm.type !== 'CASH') ? repayForm.metal_weight : 0, cash_amount: (repayForm.type !== 'METAL') ? repayForm.amount : 0, conversion_rate: (repayForm.type !== 'METAL') ? repayForm.rate : 0 };
    try { await api.vendorTransaction(payload); alert('Saved'); setShowRepayment(false); setRepayForm({ type: 'CASH', amount: '', rate: '', metal_weight: '', description: '' }); loadAllData(); } catch (err) { alert(err.message); }
  };

  if (!vendor) return <div className="p-5 text-center">Loading...</div>;

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/')}><i className="bi bi-arrow-left me-1"></i> Back</button>
        <div className="d-flex gap-2">
            {/* GLOBAL SEARCH BAR */}
            {viewMode === 'overview' && (
                <div className="input-group input-group-sm" style={{width: '250px'}}>
                    <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
                    <input className="form-control border-start-0" placeholder="Search Items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                </div>
            )}
            <div className="btn-group">
                <button className={`btn ${viewMode === 'overview' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('overview')}>Dashboard</button>
                <button className={`btn ${viewMode === 'add_stock' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={initStockForm}>Add Stock</button>
            </div>
        </div>
      </div>

      {viewMode === 'add_stock' && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Add Stock</h5>
              {/* INVOICE INPUT */}
              <input type="text" className="form-control form-control-sm w-auto text-uppercase" placeholder="Invoice / Ref No" value={batchInvoice} onChange={e => setBatchInvoice(e.target.value)} />
          </div>
          <div className="table-responsive">
            <table className="table table-bordered mb-0 align-middle">
              <thead className="table-light text-center small">
                <tr><th>Metal</th><th>Item Name</th><th>Image</th><th>Type</th><th>Gross Wt</th><th>HUID</th>
                    <th className="bg-warning bg-opacity-10 cursor-pointer" onClick={togglePurityMode}>{purityMode === 'TOUCH' ? 'Touch %' : 'Wastage %'} <i className="bi bi-arrow-repeat"></i></th>
                    <th>Making ₹</th><th className="bg-light">Pure</th><th></th></tr>
              </thead>
              <tbody>
                {stockRows.map((row, i) => (
                  <tr key={i}>
                    <td><select className="form-select form-select-sm" value={row.metal_type} onChange={e => handleRowChange(i, 'metal_type', e.target.value)}>{showGoldOption() && <option value="GOLD">GOLD</option>}{showSilverOption() && <option value="SILVER">SILVER</option>}</select></td>
                    <td><input className="form-control form-control-sm" list={`suggestions-${i}`} placeholder="Name" value={row.item_name} onChange={e => handleRowChange(i, 'item_name', e.target.value)} /><datalist id={`suggestions-${i}`}>{masterItems.filter(m => m.metal_type === row.metal_type).map((m, idx) => <option key={idx} value={m.item_name} />)}</datalist></td>
                    <td><input type="file" className="form-control form-control-sm" style={{width:'80px'}} accept="image/*" onChange={e => handleFileChange(i, e.target.files[0])} /></td>
                    <td><select className="form-select form-select-sm" value={row.stock_type} onChange={e => handleRowChange(i, 'stock_type', e.target.value)}><option value="SINGLE">Single</option><option value="BULK">Bulk</option></select></td>
                    <td><input type="number" step="0.001" className="form-control form-control-sm" value={row.gross_weight} onChange={e => handleRowChange(i, 'gross_weight', e.target.value)} /></td>
                    <td><input type="text" className="form-control form-control-sm" placeholder="XXXX" value={row.huid} onChange={e => handleRowChange(i, 'huid', e.target.value)} /></td>
                    <td className="bg-warning bg-opacity-10"><input type="number" step="0.01" className="form-control form-control-sm fw-bold" placeholder={purityMode==='TOUCH'?'92':'10'} value={row.wastage_percent} onChange={e => handleRowChange(i, 'wastage_percent', e.target.value)} /></td>
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
            <button className="btn btn-success fw-bold px-4" onClick={handleSubmitStock}>Save Batch Stock</button>
          </div>
        </div>
      )}

      {viewMode === 'overview' && (
        <div className="row g-3">
             <div className="col-md-3">
                <div className="card shadow-sm mb-3">
                    <div className="card-header bg-white fw-bold d-flex justify-content-between"><span>Vendor Info</span><button className="btn btn-sm btn-link" onClick={() => setShowEditVendor(true)}>Edit</button></div>
                    <div className="card-body">
                        <h5 className="fw-bold text-primary">{vendor.business_name}</h5>
                        <ul className="list-unstyled small mb-3">
                            <li><i className="bi bi-telephone me-2"></i>{vendor.contact_number}</li>
                            <li><i className="bi bi-geo-alt me-2"></i>{vendor.address || 'No Address'}</li>
                            <li><i className="bi bi-card-heading me-2"></i>GST: {vendor.gst_number || '-'}</li>
                            <li><i className="bi bi-gem me-2"></i>Type: {vendor.vendor_type}</li>
                        </ul>
                        <button className="btn btn-outline-dark btn-sm w-100" onClick={() => setShowManageAgents(true)}>Manage Agents</button>
                    </div>
                </div>
             </div>
             
             <div className="col-md-6">
                {/* AVAILABLE STOCK */}
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold text-success">Available Stock</h6>
                        <span className="badge bg-success bg-opacity-10 text-success border border-success">
                            {availableItems.length} Items &bull; {availableWeight} g
                        </span>
                    </div>
                    <div className="table-responsive" style={{maxHeight:'40vh'}}>
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small sticky-top"><tr><th>Date</th><th>Image</th><th>Details</th><th>Wt</th><th>Actions</th></tr></thead>
                            <tbody>
                                {availableItems.length === 0 && <tr><td colSpan="5" className="text-center py-3 text-muted">No items found</td></tr>}
                                {availableItems.map(item => (
                                    <tr key={item.id}>
                                        <td className="small">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td>{item.item_image && <img src={item.item_image} style={{width:'40px',height:'40px'}} />}</td>
                                        <td>
                                            <div className="fw-bold small">{item.item_name}</div>
                                            <div className="small font-monospace text-muted">{item.barcode}</div>
                                            {item.huid && <span className="badge bg-info text-dark" style={{fontSize:'0.6rem'}}>HUID: {item.huid}</span>}
                                        </td>
                                        <td><div className="fw-bold">{item.gross_weight}g</div></td>
                                        <td>
                                            <button className="btn btn-sm btn-link text-primary" onClick={() => startEditItem(item)}><i className="bi bi-pencil"></i></button>
                                            <button className="btn btn-sm btn-link text-danger" onClick={() => handleDeleteItem(item.id)}><i className="bi bi-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SOLD ITEMS */}
                <div className="card shadow-sm border-0">
                    <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold text-secondary">Sold History</h6>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary">
                            {soldItems.length} Sold &bull; {soldWeight} g
                        </span>
                    </div>
                    <div className="table-responsive" style={{maxHeight:'40vh'}}>
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light sticky-top small"><tr><th>Date</th><th>Image</th><th>Details</th><th>Wt</th><th>Status</th></tr></thead>
                            <tbody>
                                {soldItems.length === 0 && <tr><td colSpan="5" className="text-center py-3 text-muted">No sold items</td></tr>}
                                {soldItems.map(item => (
                                    <tr key={item.id} className="bg-light opacity-75">
                                        <td className="small text-muted">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td>{item.item_image && <img src={item.item_image} className="rounded border" style={{width:'35px',height:'35px',objectFit:'cover',filter:'grayscale(100%)'}} />}</td>
                                        <td><div className="fw-bold small">{item.item_name}</div><div className="small font-monospace text-muted">{item.barcode}</div></td>
                                        <td className="fw-bold">{item.gross_weight}g</td>
                                        <td><span className="badge bg-secondary">SOLD</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
             
             {/* RIGHT: LEDGER */}
             <div className="col-md-3">
                 <div className="card bg-danger text-white mb-3 text-center p-3 shadow-sm">
                    <small className="fw-bold opacity-75">PURE BALANCE OWED</small>
                    <div className="display-6 fw-bold">{parseFloat(vendor.balance_pure_weight || 0).toFixed(3)} g</div>
                    <button className="btn btn-light btn-sm w-100 mt-2 text-danger fw-bold" onClick={() => setShowRepayment(!showRepayment)}>{showRepayment?'Cancel':'+ Settlement'}</button>
                 </div>
                 {showRepayment && (
                   <div className="card shadow-sm mb-3 border-danger">
                     <div className="card-body">
                        <select className="form-select form-select-sm mb-2" value={repayForm.type} onChange={e => setRepayForm({...repayForm, type: e.target.value})}><option value="CASH">Cash</option><option value="METAL">Metal</option><option value="MIXED">Mixed</option></select>
                        {(repayForm.type!=='METAL') && <div className="row g-1 mb-2"><div className="col-6"><input type="number" className="form-control form-control-sm" placeholder="₹ Amount" value={repayForm.amount} onChange={e => setRepayForm({...repayForm, amount: e.target.value})} /></div><div className="col-6"><input type="number" className="form-control form-control-sm" placeholder="Rate" value={repayForm.rate} onChange={e => setRepayForm({...repayForm, rate: e.target.value})} /></div></div>}
                        {(repayForm.type!=='CASH') && <input type="number" className="form-control form-control-sm mb-2" placeholder="Metal Wt (g)" value={repayForm.metal_weight} onChange={e => setRepayForm({...repayForm, metal_weight: e.target.value})} />}
                        <button className="btn btn-danger btn-sm w-100" onClick={handleRepayment}>Save</button>
                     </div>
                   </div>
                 )}
                 <div className="card shadow-sm">
                   <div className="card-header bg-white py-2 small fw-bold text-muted">Ledger</div>
                   <div className="card-body p-0 overflow-auto" style={{maxHeight:'40vh'}}>
                     <ul className="list-group list-group-flush small">
                       {transactions.map(txn => (
                           <li key={txn.id} className="list-group-item">
                             <div className="d-flex justify-content-between">
                               <span className={`fw-bold ${txn.type === 'STOCK_ADDED' ? 'text-danger' : 'text-success'}`}>{txn.type === 'STOCK_ADDED' ? 'STOCK' : 'PAID'}</span>
                               <span>{new Date(txn.created_at).toLocaleDateString()}</span>
                             </div>
                             <div className="mb-1 text-muted" style={{fontSize:'0.75rem'}}>{txn.description}</div>
                             <div className="d-flex justify-content-between align-items-center bg-light p-1 rounded">
                               <div className="text-muted" style={{fontSize:'0.7rem'}}>Bal: <span className="text-dark fw-bold">{parseFloat(txn.balance_after).toFixed(3)}g</span></div>
                               <div className="fw-bold">{txn.type==='STOCK_ADDED'?'+':'-'} {parseFloat(txn.total_repaid_pure||txn.stock_pure_weight).toFixed(3)} g</div>
                             </div>
                           </li>
                       ))}
                     </ul>
                   </div>
                 </div>
              </div>
        </div>
      )}

      {/* MANAGE AGENTS MODAL */}
      {showManageAgents && (
         <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg">
               <div className="modal-content">
                  <div className="modal-header"><h5 className="modal-title">Manage Agents</h5><button className="btn-close" onClick={() => setShowManageAgents(false)}></button></div>
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
                                  <td>{agent.agent_photo ? <img src={agent.agent_photo} style={{width:'30px',height:'30px',borderRadius:'50%'}} /> : <i className="bi bi-person-circle"></i>}</td>
                                  <td className="fw-bold">{agent.agent_name}</td>
                                  <td>{agent.agent_phone}</td>
                                  <td><button className="btn btn-sm btn-link" onClick={() => handleEditAgent(agent)}>Edit</button><button className="btn btn-sm btn-link text-danger" onClick={() => handleDeleteAgent(agent.id)}>Delete</button></td>
                               </tr>
                            ))}
                         </tbody>
                       </table>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* EDIT VENDOR MODAL */}
      {showEditVendor && (
         <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog">
               <div className="modal-content">
                  <div className="modal-header"><h5 className="modal-title">Edit Vendor</h5><button className="btn-close" onClick={() => setShowEditVendor(false)}></button></div>
                  <div className="modal-body">
                     <input className="form-control mb-2" placeholder="Name" value={editVendorForm.business_name} onChange={e => setEditVendorForm({...editVendorForm, business_name: e.target.value})} />
                     <input className="form-control mb-2" placeholder="Contact" value={editVendorForm.contact_number} onChange={e => setEditVendorForm({...editVendorForm, contact_number: e.target.value})} />
                     <select className="form-select mb-2" value={editVendorForm.vendor_type} onChange={e => setEditVendorForm({...editVendorForm, vendor_type: e.target.value})}><option value="BOTH">Gold & Silver</option><option value="GOLD">Gold Only</option><option value="SILVER">Silver Only</option></select>
                     <textarea className="form-control mb-2" placeholder="Address" value={editVendorForm.address} onChange={e => setEditVendorForm({...editVendorForm, address: e.target.value})} />
                     <input className="form-control mb-2" placeholder="GST" value={editVendorForm.gst_number} onChange={e => setEditVendorForm({...editVendorForm, gst_number: e.target.value})} />
                  </div>
                  <div className="modal-footer"><button className="btn btn-primary" onClick={handleUpdateVendor}>Save</button></div>
               </div>
            </div>
         </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className="modal-header"><h5 className="modal-title">Edit Item</h5><button className="btn-close" onClick={() => setEditingItem(null)}></button></div>
                 <div className="modal-body">
                    <div className="mb-2"><label className="form-label">Gross Wt</label><input className="form-control" type="number" value={editForm.gross_weight} onChange={e => setEditForm({...editForm, gross_weight: e.target.value})} /></div>
                    <div className="mb-2"><label className="form-label">Wastage %</label><input className="form-control" type="number" value={editForm.wastage_percent} onChange={e => setEditForm({...editForm, wastage_percent: e.target.value})} /></div>
                    <div className="mb-2"><label className="form-label">Note</label><textarea className="form-control" value={editForm.update_comment} onChange={e => setEditForm({...editForm, update_comment: e.target.value})} /></div>
                 </div>
                 <div className="modal-footer"><button className="btn btn-primary" onClick={handleSaveEditItem}>Update</button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default VendorDetails;