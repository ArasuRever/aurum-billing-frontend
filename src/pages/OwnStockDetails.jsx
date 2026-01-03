import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useReactToPrint } from 'react-to-print'; 
import BarcodePrintComponent from '../components/BarcodePrintComponent'; 
import { FaTrash, FaPlus, FaClock, FaUndo, FaCamera } from 'react-icons/fa';

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); 
    reader.onerror = error => reject(error);
});

function OwnStockDetails() {
  const navigate = useNavigate();
  
  // Data
  const [items, setItems] = useState([]); 
  const [soldHistory, setSoldHistory] = useState([]); 
  const [shopAssets, setShopAssets] = useState({ cash_balance: 0, bank_balance: 0 });
  const [masterItems, setMasterItems] = useState([]); 
  const [productTypes, setProductTypes] = useState([]);

  // UI & Search
  const [viewMode, setViewMode] = useState('overview'); 
  const [itemSearch, setItemSearch] = useState('');
  
  // Modals & Forms
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ item_name: '', gross_weight: '', wastage_percent: '', update_comment: '', item_image: null });
  const [previewImage, setPreviewImage] = useState(null);
  const [purityMode, setPurityMode] = useState('TOUCH'); 

  // --- RESTOCK & HISTORY STATE ---
  const [restockItem, setRestockItem] = useState(null);
  const [restockForm, setRestockForm] = useState({ gross_weight: '', quantity: '', invoice_no: '', wastage_percent: '' });
  const [historyItem, setHistoryItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);

  const [selectedIds, setSelectedIds] = useState({});
  const printRef = useRef();

  // Stock Form
  const [stockRows, setStockRows] = useState([]);
  const [batchInvoice, setBatchInvoice] = useState('');

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    try {
      const [itemRes, salesRes, assetsRes, typesRes] = await Promise.all([
          api.getOwnInventory(),
          api.getOwnSalesHistory(),
          api.getLedgerStats(),
          api.getProductTypes()
      ]);

      setItems(itemRes.data);
      setSoldHistory(salesRes.data || []);
      setShopAssets(assetsRes.data || { cash_balance: 0, bank_balance: 0 });
      setProductTypes(typesRes.data || []);

      fetchMasterItems();
    } catch (err) { console.error("Error loading data", err); }
  };

  const fetchMasterItems = async () => {
      try {
        const masterRes = await api.getMasterItems();
        setMasterItems(masterRes.data);
      } catch (e) { console.warn("Settings API error", e); }
  };

  const filterItems = (list) => {
    if(!itemSearch) return list;
    const lower = itemSearch.toLowerCase();
    return list.filter(i => 
       (i.item_name && i.item_name.toLowerCase().includes(lower)) || 
       (i.barcode && i.barcode.toLowerCase().includes(lower)) ||
       (i.huid && i.huid.toLowerCase().includes(lower))
    );
  };

  const availableItems = filterItems(items);
  const soldItems = filterItems(soldHistory);

  const availableWeight = availableItems.reduce((acc, i) => acc + (parseFloat(i.gross_weight)||0), 0).toFixed(3);
  const soldWeight = soldItems.reduce((acc, i) => acc + (parseFloat(i.gross_weight)||0), 0).toFixed(3);

  // --- DELETE ITEM LOGIC ---
  const handleDeleteItem = async (itemId) => { 
      if(window.confirm("Are you sure you want to delete this item?")) { 
          await api.deleteInventory(itemId); 
          loadAllData(); 
      }
  };

  // --- RESTORE ITEM LOGIC ---
  const handleRestoreItem = async (itemId) => {
      if(!itemId) {
          alert("Unable to restore: Missing Item ID.");
          return;
      }
      if(window.confirm("Restore this deleted item?")) {
          try {
              await api.restoreInventoryItem(itemId);
              alert("Item Restored Successfully!");
              loadAllData();
          } catch(err) {
              alert("Failed to restore: " + (err.response?.data?.error || err.message));
          }
      }
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const allIds = {};
          availableItems.forEach(i => allIds[i.id] = true);
          setSelectedIds(allIds);
      } else {
          setSelectedIds({});
      }
  };
  const handleSelectRow = (id) => { setSelectedIds(prev => ({ ...prev, [id]: !prev[id] })); };
  const handlePrintTags = useReactToPrint({ content: () => printRef.current, onAfterPrint: () => setSelectedIds({}) });
  const getItemsToPrint = () => items.filter(item => selectedIds[item.id]);
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const openRestockModal = (item) => { setRestockItem(item); setRestockForm({ gross_weight: '', quantity: '', invoice_no: '', wastage_percent: item.wastage_percent }); };
  const handleRestockSubmit = async () => {
      if (!restockForm.gross_weight || !restockForm.quantity) return alert("Weight and Qty required");
      try {
          await api.axiosInstance.post(`/inventory/restock/${restockItem.id}`, {
              added_gross_weight: restockForm.gross_weight,
              added_quantity: restockForm.quantity,
              wastage_percent: restockForm.wastage_percent,
              invoice_no: restockForm.invoice_no
          });
          alert("Restock Successful!"); setRestockItem(null); loadAllData();
      } catch (err) { alert("Restock Failed: " + (err.response?.data?.error || err.message)); }
  };

  const openHistoryModal = async (item) => { setHistoryItem(item); try { const res = await api.axiosInstance.get(`/inventory/history/${item.id}`); setItemHistory(res.data); } catch (err) { console.error(err); } };
  
  const initStockForm = () => { fetchMasterItems(); const allowed = productTypes; const defaultMetal = allowed.length > 0 ? allowed[0].name : 'GOLD'; setStockRows([{ metal_type: defaultMetal, stock_type: 'SINGLE', quantity: 1, item_name: '', huid: '', gross_weight: '', wastage_percent: '', making_charges: '', item_image: null, calc_total_pure: 0 }]); setBatchInvoice(''); setViewMode('add_stock'); setPurityMode('TOUCH'); };
  const handleAddRow = () => { const allowed = productTypes; const defaultMetal = allowed.length > 0 ? allowed[0].name : 'GOLD'; setStockRows([...stockRows, { metal_type: defaultMetal, stock_type: 'SINGLE', quantity: 1, item_name: '', huid: '', gross_weight: '', wastage_percent: '', making_charges: '', item_image: null, calc_total_pure: 0 }]); };
  const removeRow = (i) => setStockRows(stockRows.filter((_, idx) => idx !== i));
  const togglePurityMode = () => { const newMode = purityMode === 'TOUCH' ? 'WASTAGE' : 'TOUCH'; setPurityMode(newMode); setStockRows(stockRows.map(row => ({ ...row, calc_total_pure: calculatePure(row.gross_weight, row.wastage_percent, newMode) }))); };
  const calculatePure = (grossStr, factorStr, mode) => { const gross = parseFloat(grossStr) || 0; const factor = parseFloat(factorStr) || 0; return mode === 'TOUCH' ? (gross * (factor / 100)).toFixed(3) : (gross * (1 + (factor / 100))).toFixed(3); };
  
  const handleRowChange = (index, field, value) => { 
    const copy = [...stockRows]; copy[index][field] = value; let gross = parseFloat(copy[index].gross_weight) || 0;
    if (field === 'gross_weight' || field === 'wastage_percent') { if(field === 'gross_weight') gross = parseFloat(value) || 0; copy[index].calc_total_pure = calculatePure(copy[index].gross_weight, copy[index].wastage_percent, purityMode); }
    if (field === 'item_name') { const matched = masterItems.find(m => m.item_name.toLowerCase() === value.trim().toLowerCase() && m.metal_type === copy[index].metal_type); if (matched) { copy[index].wastage_percent = matched.default_wastage; copy[index].calc_total_pure = calculatePure(copy[index].gross_weight, matched.default_wastage, purityMode); if (matched.mc_type === 'FIXED') copy[index].making_charges = matched.mc_value; else if (matched.mc_type === 'PER_GRAM' && gross > 0) copy[index].making_charges = (gross * parseFloat(matched.mc_value)).toFixed(2); } }
    setStockRows(copy);
  };
  const handleFileChange = (i, file) => { const copy = [...stockRows]; copy[i].item_image = file; setStockRows(copy); };
  const autoCreateMasterItems = async (itemsToSave) => { const newItems = itemsToSave.filter(stockItem => { if (!stockItem.item_name) return false; const exists = masterItems.some(master => master.item_name.toLowerCase() === stockItem.item_name.trim().toLowerCase() && master.metal_type === stockItem.metal_type ); return !exists; }); if (newItems.length === 0) return; const grouped = {}; newItems.forEach(item => { if (!grouped[item.metal_type]) grouped[item.metal_type] = []; if (!grouped[item.metal_type].some(i => i.item_name.toLowerCase() === item.item_name.trim().toLowerCase())) { grouped[item.metal_type].push(item); } }); for (const metal of Object.keys(grouped)) { const groupItems = grouped[metal]; const names = groupItems.map(i => i.item_name.trim()); const referenceItem = groupItems[0]; try { await api.addMasterItemsBulk({ item_names: names, metal_type: metal, calc_method: 'STANDARD', default_wastage: referenceItem.wastage_percent || 0, mc_type: 'FIXED', mc_value: 0, hsn_code: '' }); } catch (err) { console.warn("Failed to auto-create master items", err); } } fetchMasterItems(); };
  const handleSubmitStock = async () => { const validRows = stockRows.filter(r => r.item_name && r.gross_weight); if (validRows.length === 0) return alert("Fill at least one row"); try { await autoCreateMasterItems(validRows); const grouped = {}; validRows.forEach(row => { if(!grouped[row.metal_type]) grouped[row.metal_type] = []; grouped[row.metal_type].push(row); }); for (const metal of Object.keys(grouped)) { const itemsToProcess = grouped[metal]; const processedItems = await Promise.all(itemsToProcess.map(async (item) => { let b64 = null; if (item.item_image && item.item_image instanceof File) { b64 = await toBase64(item.item_image); } return { ...item, pure_weight: item.calc_total_pure, item_image_base64: b64, quantity: item.stock_type === 'BULK' ? (item.quantity || 1) : 1 }; })); await api.addBatchInventory({ vendor_id: 'OWN', metal_type: metal, invoice_no: batchInvoice || 'OWN-STOCK', items: processedItems }); } alert('Stock Added Successfully!'); setViewMode('overview'); loadAllData(); } catch(err) { console.error(err); alert('Error adding stock: ' + err.message); } };

  const startEditItem = (item) => { 
      setEditingItem(item); 
      setEditForm({ 
          item_name: item.item_name, 
          gross_weight: item.gross_weight, 
          wastage_percent: item.wastage_percent, 
          update_comment: '',
          item_image: null
      }); 
      setPreviewImage(item.item_image); 
  };

  const handleEditFileChange = (file) => {
      if(file) {
          setEditForm({...editForm, item_image: file});
          setPreviewImage(URL.createObjectURL(file));
      }
  };

  const handleSaveEditItem = async () => { 
      if(!editForm.update_comment) return alert("Note required");
      
      const formData = new FormData();
      formData.append('item_name', editForm.item_name);
      formData.append('gross_weight', editForm.gross_weight);
      formData.append('wastage_percent', editForm.wastage_percent);
      formData.append('update_comment', editForm.update_comment);
      if(editForm.item_image) {
          formData.append('item_image', editForm.item_image);
      }

      await api.updateInventory(editingItem.id, formData); 
      setEditingItem(null); 
      loadAllData(); 
  };

  return (
    <div className="container-fluid pb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/inventory')}><i className="bi bi-arrow-left me-1"></i> Back</button>
        <div className="d-flex gap-2">
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
              <h5 className="mb-0">Add Own Stock</h5>
              <input type="text" className="form-control form-control-sm w-auto text-uppercase" placeholder="Ref No" value={batchInvoice} onChange={e => setBatchInvoice(e.target.value)} />
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
                    <td>
                        <select className="form-select form-select-sm" value={row.metal_type} onChange={e => handleRowChange(i, 'metal_type', e.target.value)}>
                            {productTypes.map(type => (
                                <option key={type.id} value={type.name}>{type.name}</option>
                            ))}
                        </select>
                    </td>
                    <td><input className="form-control form-control-sm" list={`suggestions-${i}`} placeholder="Name" value={row.item_name} onChange={e => handleRowChange(i, 'item_name', e.target.value)} /><datalist id={`suggestions-${i}`}>{masterItems.filter(m => m.metal_type === row.metal_type).map((m, idx) => <option key={idx} value={m.item_name} />)}</datalist></td>
                    <td><input type="file" className="form-control form-control-sm" style={{width:'80px'}} accept="image/*" onChange={e => handleFileChange(i, e.target.files[0])} /></td>
                    <td>
                        <div className="d-flex gap-1">
                            <select className="form-select form-select-sm" value={row.stock_type} onChange={e => handleRowChange(i, 'stock_type', e.target.value)} style={{width: row.stock_type === 'BULK' ? '70px' : '100%'}}>
                                <option value="SINGLE">Single</option>
                                <option value="BULK">Bulk</option>
                            </select>
                            {row.stock_type === 'BULK' && (
                                <input type="number" className="form-control form-control-sm" placeholder="Qty" value={row.quantity} onChange={e => handleRowChange(i, 'quantity', e.target.value)} style={{width: '60px'}} />
                            )}
                        </div>
                    </td>
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
                    <div className="card-header bg-white fw-bold">Shop Info</div>
                    <div className="card-body">
                        <h5 className="fw-bold text-primary">Own Inventory</h5>
                        <p className="text-muted small">Manage items owned by the shop directly.</p>
                    </div>
                </div>
                
                <div className="card shadow-sm mb-3 bg-light">
                    <div className="card-header bg-transparent fw-bold text-muted small">Shop Assets</div>
                    <div className="card-body">
                        <div className="d-flex justify-content-between mb-2">
                            <span>Cash:</span>
                            <span className="fw-bold text-success">₹ {parseFloat(shopAssets.cash_balance).toLocaleString()}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span>Bank:</span>
                            <span className="fw-bold text-primary">₹ {parseFloat(shopAssets.bank_balance).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="col-md-9">
                {/* AVAILABLE STOCK */}
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold text-success">Available Shop Stock</h6>
                        <div className="d-flex align-items-center gap-2">
                            {selectedCount > 0 && <button className="btn btn-dark btn-sm fw-bold" onClick={handlePrintTags}><i className="bi bi-printer-fill me-2"></i>Print Tags ({selectedCount})</button>}
                            <span className="badge bg-success bg-opacity-10 text-success border border-success">{availableItems.length} Items &bull; {availableWeight} g</span>
                        </div>
                    </div>
                    <div className="table-responsive" style={{maxHeight:'40vh'}}>
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small sticky-top">
                                <tr>
                                    <th style={{width:'30px'}} className="text-center"><input type="checkbox" className="form-check-input" onChange={handleSelectAll} checked={availableItems.length > 0 && availableItems.every(i => selectedIds[i.id])} /></th>
                                    <th>Image</th><th>Details</th><th>Count</th><th>Wt</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableItems.length === 0 && <tr><td colSpan="6" className="text-center py-3 text-muted">No items found</td></tr>}
                                {availableItems.map(item => (
                                    <tr key={item.id} className={selectedIds[item.id] ? 'table-primary' : ''}>
                                        <td className="text-center"><input type="checkbox" className="form-check-input" checked={!!selectedIds[item.id]} onChange={() => handleSelectRow(item.id)} /></td>
                                        <td>{item.item_image && <img src={item.item_image} style={{width:'40px',height:'40px'}} />}</td>
                                        <td><div className="fw-bold small">{item.item_name}</div><div className="small font-monospace text-muted">{item.barcode}</div>{item.stock_type === 'BULK' && <span className="badge bg-primary text-white" style={{fontSize:'0.6rem'}}>BULK</span>}</td>
                                        <td>{item.stock_type === 'BULK' ? (<div className="small"><strong>{item.quantity}</strong> <span className="text-muted">/ {item.total_quantity_added || '-'}</span></div>) : '-'}</td>
                                        <td><div className="fw-bold">{item.gross_weight}g</div>{item.stock_type === 'BULK' && <div className="small text-muted" style={{fontSize:'0.65rem'}}>Total: {item.total_weight_added || '-'}g</div>}</td>
                                        <td>
                                            <div className="btn-group btn-group-sm">
                                                {item.stock_type === 'BULK' && (<><button className="btn btn-outline-success" onClick={() => openRestockModal(item)} title="Restock"><FaPlus/></button><button className="btn btn-outline-secondary" onClick={() => openHistoryModal(item)} title="History"><FaClock/></button></>)}
                                                <button className="btn btn-outline-primary" onClick={() => startEditItem(item)}><i className="bi bi-pencil"></i></button>
                                                <button className="btn btn-outline-danger" onClick={() => handleDeleteItem(item.id)} title="Delete Item"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* SOLD HISTORY */}
                <div className="card shadow-sm border-0">
                    <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold text-secondary">Shop Sales History</h6>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary">{soldItems.length} Records &bull; {soldWeight} g</span>
                    </div>
                    <div className="table-responsive" style={{maxHeight:'40vh'}}>
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light sticky-top small">
                                <tr><th>Date</th><th>Image</th><th>Details</th><th>Qty</th><th>Wt</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {soldItems.length === 0 && <tr><td colSpan="6" className="text-center py-3 text-muted">No history found</td></tr>}
                                {soldItems.map((item, idx) => (
                                    <tr key={idx} className="bg-light opacity-75">
                                        <td className="small text-muted">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td>{item.item_image && <img src={item.item_image} className="rounded border" style={{width:'35px',height:'35px',objectFit:'cover',filter:'grayscale(100%)'}} />}</td>
                                        <td><div className="fw-bold small">{item.item_name}</div><div className="small font-monospace text-muted">{item.barcode}</div></td>
                                        <td className="fw-bold text-center">{item.quantity || 1}</td>
                                        <td className="fw-bold">{item.gross_weight}g</td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                {item.status === 'LENT' ? <span className="badge bg-warning text-dark">LENT</span> : <span className="badge bg-secondary">SOLD</span>}
                                                {(item.status === 'SOLD' && item.description && item.description.includes('Deleted')) && (
                                                    <button className="btn btn-sm btn-outline-primary py-0 px-1" title="Restore" onClick={() => handleRestoreItem(item.reference_id || item.id)}>
                                                        <FaUndo size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* REUSED MODALS FROM VENDOR DETAILS (Simplified) */}
      {restockItem && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-header bg-success text-white"><h5 className="modal-title">Restock Bulk Item</h5><button className="btn-close btn-close-white" onClick={() => setRestockItem(null)}></button></div>
                      <div className="modal-body"><p className="mb-2"><strong>Item:</strong> {restockItem.item_name}</p><div className="row g-2 mb-3"><div className="col-6"><label className="small">Added Weight</label><input className="form-control" type="number" value={restockForm.gross_weight} onChange={e => setRestockForm({...restockForm, gross_weight: e.target.value})} /></div><div className="col-6"><label className="small">Added Qty</label><input className="form-control" type="number" value={restockForm.quantity} onChange={e => setRestockForm({...restockForm, quantity: e.target.value})} /></div></div><div className="mb-3"><label className="small">Invoice / Ref</label><input className="form-control" value={restockForm.invoice_no} onChange={e => setRestockForm({...restockForm, invoice_no: e.target.value})} /></div></div>
                      <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setRestockItem(null)}>Cancel</button><button className="btn btn-success" onClick={handleRestockSubmit}>Confirm</button></div>
                  </div>
              </div>
          </div>
      )}
      
      {/* EDIT MODAL */}
      {editingItem && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className="modal-header"><h5 className="modal-title">Edit Item</h5><button className="btn-close" onClick={() => setEditingItem(null)}></button></div>
                 <div className="modal-body">
                    <div className="mb-2"><label className="form-label small fw-bold">Item Name</label><input className="form-control" value={editForm.item_name} onChange={e => setEditForm({...editForm, item_name: e.target.value})} /></div>
                    <div className="mb-2"><label className="form-label small fw-bold">Photo</label><div className="d-flex align-items-center gap-2">{previewImage && <img src={previewImage} className="border rounded" style={{width:'50px', height:'50px', objectFit:'cover'}} />}<label className="btn btn-outline-secondary btn-sm"><FaCamera className="me-1"/> Upload<input type="file" hidden accept="image/*" onChange={e => { if(e.target.files[0]) { setEditForm({...editForm, item_image: e.target.files[0]}); setPreviewImage(URL.createObjectURL(e.target.files[0])); } }} /></label></div></div>
                    <div className="row g-2 mb-2"><div className="col-6"><label className="form-label small">Gross Wt</label><input className="form-control" type="number" value={editForm.gross_weight} onChange={e => setEditForm({...editForm, gross_weight: e.target.value})} /></div><div className="col-6"><label className="form-label small">Wastage %</label><input className="form-control" type="number" value={editForm.wastage_percent} onChange={e => setEditForm({...editForm, wastage_percent: e.target.value})} /></div></div>
                    <div className="mb-2"><label className="form-label small">Note</label><textarea className="form-control" value={editForm.update_comment} onChange={e => setEditForm({...editForm, update_comment: e.target.value})} /></div>
                 </div>
                 <div className="modal-footer"><button className="btn btn-primary" onClick={handleSaveEditItem}>Update</button></div>
              </div>
           </div>
        </div>
      )}

      {historyItem && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-header"><h5 className="modal-title">Batch History</h5><button className="btn-close" onClick={() => setHistoryItem(null)}></button></div>
                      <div className="modal-body p-0"><table className="table table-striped mb-0 small"><thead className="table-light"><tr><th>Date</th><th>Type</th><th>Qty</th><th>Wt</th><th>Ref</th></tr></thead><tbody>{itemHistory.map((log, i) => (<tr key={i}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.action_type}</td><td>{log.quantity_change}</td><td>{log.weight_change}g</td><td>{log.related_bill_no}</td></tr>))}</tbody></table></div>
                  </div>
              </div>
          </div>
      )}

      <div style={{ display: 'none' }}>
          <BarcodePrintComponent ref={printRef} items={getItemsToPrint()} shopName="AURUM" />
      </div>
    </div>
  );
}

export default OwnStockDetails;