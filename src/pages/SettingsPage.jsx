import React, { useEffect, useState } from 'react';
import { api } from '../api';

function SettingsPage() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('GOLD'); 
  
  // RATES STATE
  const [rates, setRates] = useState({ GOLD: '', SILVER: '' });
  const [loadingRates, setLoadingRates] = useState(false);

  // BULK ADD STATE
  const [entryNames, setEntryNames] = useState(''); // Comma separated string
  const [newRule, setNewRule] = useState({
    calc_method: 'STANDARD', // STANDARD, RATE_ADD_ON, FIXED_PRICE
    default_wastage: '',
    mc_type: 'PER_GRAM', 
    mc_value: ''
  });

  // EDIT STATE
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchRates();
    fetchItems();
  }, []);

  const fetchRates = async () => {
    try {
        const res = await api.getDailyRates();
        if(res.data) setRates(res.data);
    } catch (err) { console.error("Error fetching rates", err); }
  };

  const fetchItems = async () => {
    try {
      const res = await api.getMasterItems();
      setItems(res.data);
    } catch (err) { console.error(err); }
  };

  const handleRateUpdate = async (metal) => {
      const val = rates[metal];
      if(!val) return;
      setLoadingRates(true);
      try {
          await api.updateDailyRate({ metal_type: metal, rate: val });
          alert(`${metal} Rate Updated to ₹${val}`);
      } catch(err) { alert("Failed"); } 
      finally { setLoadingRates(false); }
  };

  // --- BULK ADD HANDLER ---
  const handleBulkAdd = async () => {
    if (!entryNames.trim()) return alert("Please enter at least one item name");
    
    // Split by comma and clean up
    const namesArray = entryNames.split(',').map(n => n.trim()).filter(n => n.length > 0);

    if (namesArray.length === 0) return alert("No valid names found");

    try {
      const payload = {
          item_names: namesArray,
          metal_type: activeTab,
          ...newRule
      };

      await api.addMasterItemsBulk(payload);
      
      // Reset form
      setEntryNames('');
      setNewRule({ calc_method: 'STANDARD', default_wastage: '', mc_type: 'PER_GRAM', mc_value: '' });
      fetchItems();
      alert(`Successfully added ${namesArray.length} items!`);

    } catch (err) {
      alert(err.response?.data?.error || "Error adding items");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this item setting?")) return;
    try { await api.deleteMasterItem(id); fetchItems(); } catch(err) { alert("Error deleting"); }
  };

  // --- EDIT HANDLERS ---
  const startEdit = (item) => {
      setEditingId(item.id);
      setEditForm({ ...item }); // Copy item data to form
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditForm({});
  };

  const saveEdit = async () => {
      try {
          await api.updateMasterItem(editingId, editForm);
          setEditingId(null);
          fetchItems(); // Refresh to show updates
      } catch (err) {
          alert("Failed to update item.");
      }
  };

  const filteredItems = items.filter(i => i.metal_type === activeTab);

  return (
    <div className="container-fluid mt-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-sliders me-2"></i>Billing Configuration</h2>
      </div>

      {/* --- 1. DAILY RATES CARD --- */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
          <div className="card-body py-3">
              <div className="row g-4">
                  <div className="col-md-6">
                      <div className="input-group">
                          <span className="input-group-text bg-warning text-dark fw-bold border-warning" style={{width:'120px'}}>GOLD</span>
                          <input type="number" className="form-control fw-bold fs-5" value={rates.GOLD} onChange={e => setRates({...rates, GOLD: e.target.value})} />
                          <button className="btn btn-dark" onClick={() => handleRateUpdate('GOLD')} disabled={loadingRates}>UPDATE</button>
                      </div>
                  </div>
                  <div className="col-md-6">
                      <div className="input-group">
                          <span className="input-group-text bg-secondary text-white fw-bold border-secondary" style={{width:'120px'}}>SILVER</span>
                          <input type="number" className="form-control fw-bold fs-5" value={rates.SILVER} onChange={e => setRates({...rates, SILVER: e.target.value})} />
                          <button className="btn btn-dark" onClick={() => handleRateUpdate('SILVER')} disabled={loadingRates}>UPDATE</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- 2. MASTER ITEMS CONFIG --- */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-0">
            <ul className="nav nav-tabs card-header-tabs m-0">
                <li className="nav-item">
                    <button className={`nav-link fw-bold ${activeTab === 'GOLD' ? 'active text-warning' : 'text-muted'}`} 
                        onClick={() => setActiveTab('GOLD')}>GOLD ITEMS</button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link fw-bold ${activeTab === 'SILVER' ? 'active text-secondary' : 'text-muted'}`} 
                        onClick={() => setActiveTab('SILVER')}>SILVER ITEMS</button>
                </li>
            </ul>
        </div>
        
        <div className="card-body">
            {/* BULK ADD FORM */}
            <div className="bg-light p-3 rounded border mb-4">
                <h6 className="fw-bold mb-3 text-primary"><i className="bi bi-plus-circle me-2"></i>Add New Items (Batch)</h6>
                <div className="row g-3">
                    
                    {/* Item Names (Bulk) */}
                    <div className="col-12">
                        <label className="form-label small fw-bold text-muted">Item Names (Comma Separated)</label>
                        <input className="form-control form-control-lg border-primary" placeholder="e.g. 92 Ring, Anklet, Silver Chain, Plate" 
                            value={entryNames} onChange={e => setEntryNames(e.target.value)} />
                    </div>

                    {/* Shared Rule Config */}
                    <div className="col-md-3">
                        <label className="form-label small fw-bold text-muted">Billing Logic</label>
                        <select className="form-select" value={newRule.calc_method} onChange={e => setNewRule({...newRule, calc_method: e.target.value})}>
                            <option value="STANDARD">Standard (Wt + VA%) * Rate</option>
                            <option value="RATE_ADD_ON">Rate Add-On (Rate + ₹X)</option>
                            <option value="FIXED_PRICE">Fixed Price (₹X per gram)</option>
                        </select>
                    </div>

                    {/* Dynamic Fields for Rule */}
                    {newRule.calc_method === 'STANDARD' && (
                        <>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold text-muted">Wastage %</label>
                                <input type="number" className="form-control" placeholder="0" 
                                    value={newRule.default_wastage} onChange={e => setNewRule({...newRule, default_wastage: e.target.value})} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-bold text-muted">Making Charges</label>
                                <div className="input-group">
                                    <select className="form-select" style={{maxWidth:'80px'}} value={newRule.mc_type} onChange={e => setNewRule({...newRule, mc_type: e.target.value})}>
                                        <option value="PER_GRAM">/g</option>
                                        <option value="FIXED">Flat</option>
                                    </select>
                                    <input type="number" className="form-control" placeholder="0" 
                                        value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}

                    {newRule.calc_method === 'RATE_ADD_ON' && (
                        <div className="col-md-5">
                            <label className="form-label small fw-bold text-muted">Extra Amount per Gram</label>
                            <div className="input-group">
                                <span className="input-group-text">Daily Rate + ₹</span>
                                <input type="number" className="form-control" placeholder="e.g. 10" 
                                    value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {newRule.calc_method === 'FIXED_PRICE' && (
                        <div className="col-md-5">
                            <label className="form-label small fw-bold text-muted">Fixed Selling Price</label>
                            <div className="input-group">
                                <span className="input-group-text">₹</span>
                                <input type="number" className="form-control" placeholder="e.g. 150" 
                                    value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} />
                                <span className="input-group-text">per gram</span>
                            </div>
                        </div>
                    )}

                    <div className="col-md-2 d-flex align-items-end">
                        <button className="btn btn-primary w-100 fw-bold py-2" onClick={handleBulkAdd}>SAVE ITEMS</button>
                    </div>
                </div>
            </div>

            {/* MASTER ITEMS LIST WITH INLINE EDIT */}
            <div className="table-responsive">
                <table className="table table-hover align-middle border">
                    <thead className="table-light">
                        <tr>
                            <th style={{width: '25%'}}>Item Name</th>
                            <th style={{width: '20%'}}>Logic</th>
                            <th style={{width: '40%'}}>Details</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => {
                            const isEditing = editingId === item.id;
                            
                            // --- RENDER EDIT MODE ---
                            if (isEditing) return (
                                <tr key={item.id} className="bg-warning bg-opacity-10 border border-warning">
                                    <td>
                                        <input className="form-control form-control-sm fw-bold" 
                                            value={editForm.item_name} onChange={e => setEditForm({...editForm, item_name: e.target.value})} />
                                    </td>
                                    <td>
                                        <select className="form-select form-select-sm" 
                                            value={editForm.calc_method} onChange={e => setEditForm({...editForm, calc_method: e.target.value})}>
                                            <option value="STANDARD">Standard</option>
                                            <option value="RATE_ADD_ON">Rate Add-On</option>
                                            <option value="FIXED_PRICE">Fixed Price</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            {editForm.calc_method === 'STANDARD' && (
                                                <>
                                                   <input type="number" className="form-control form-control-sm" placeholder="Wst%" style={{width:'70px'}}
                                                        value={editForm.default_wastage} onChange={e => setEditForm({...editForm, default_wastage: e.target.value})} />
                                                   <select className="form-select form-select-sm" style={{width:'70px'}}
                                                        value={editForm.mc_type} onChange={e => setEditForm({...editForm, mc_type: e.target.value})}>
                                                        <option value="PER_GRAM">/g</option>
                                                        <option value="FIXED">Flat</option>
                                                   </select>
                                                   <input type="number" className="form-control form-control-sm" placeholder="MC" style={{width:'80px'}}
                                                        value={editForm.mc_value} onChange={e => setEditForm({...editForm, mc_value: e.target.value})} />
                                                </>
                                            )}
                                            {(editForm.calc_method === 'RATE_ADD_ON' || editForm.calc_method === 'FIXED_PRICE') && (
                                                 <div className="input-group input-group-sm">
                                                     <span className="input-group-text">₹</span>
                                                     <input type="number" className="form-control" value={editForm.mc_value} onChange={e => setEditForm({...editForm, mc_value: e.target.value})} />
                                                 </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-end">
                                        <button className="btn btn-sm btn-success me-1" onClick={saveEdit}><i className="bi bi-check-lg"></i></button>
                                        <button className="btn btn-sm btn-secondary" onClick={cancelEdit}><i className="bi bi-x-lg"></i></button>
                                    </td>
                                </tr>
                            );

                            // --- RENDER VIEW MODE ---
                            return (
                            <tr key={item.id}>
                                <td className="fw-bold">{item.item_name}</td>
                                
                                {/* LOGIC BADGE */}
                                <td>
                                    {item.calc_method === 'STANDARD' && <span className="badge bg-primary">Standard</span>}
                                    {item.calc_method === 'RATE_ADD_ON' && <span className="badge bg-info text-dark">Rate + Extra</span>}
                                    {item.calc_method === 'FIXED_PRICE' && <span className="badge bg-success">Fixed Price</span>}
                                </td>

                                {/* DETAILS */}
                                <td>
                                    {item.calc_method === 'STANDARD' && (
                                        <span className="text-muted small">
                                            Wastage: <strong className="text-dark">{item.default_wastage}%</strong> • 
                                            MC: <strong className="text-dark">₹{item.mc_value}</strong> ({item.mc_type === 'PER_GRAM' ? '/g' : 'Flat'})
                                        </span>
                                    )}
                                    {item.calc_method === 'RATE_ADD_ON' && (
                                        <span className="text-muted small">Price = Rate + <strong className="text-dark">₹{item.mc_value}/g</strong></span>
                                    )}
                                    {item.calc_method === 'FIXED_PRICE' && (
                                        <span className="text-muted small">Fixed: <strong className="text-dark">₹{item.mc_value}/g</strong></span>
                                    )}
                                </td>

                                <td className="text-end">
                                    <button className="btn btn-sm btn-link text-primary me-2" onClick={() => startEdit(item)}>
                                        <i className="bi bi-pencil-square"></i> Edit
                                    </button>
                                    <button className="btn btn-sm btn-link text-danger" onClick={() => handleDelete(item.id)}>
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        )})}
                        {filteredItems.length === 0 && (
                            <tr><td colSpan="4" className="text-center text-muted py-4">No settings found. Add specific item rules above.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;