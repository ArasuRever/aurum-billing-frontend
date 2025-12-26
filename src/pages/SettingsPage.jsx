import React, { useEffect, useState } from 'react';
import { api } from '../api';

function SettingsPage() {
  // Existing States
  const [items, setItems] = useState([]);
  const [rates, setRates] = useState({});
  const [loadingRates, setLoadingRates] = useState(false);

  // Bulk Add States
  const [entryNames, setEntryNames] = useState(''); 
  const [newRule, setNewRule] = useState({
    calc_method: 'STANDARD', 
    default_wastage: '',
    mc_type: 'PER_GRAM', 
    mc_value: ''
  });

  // Edit States
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // NEW: Dynamic Product Types (Tabs)
  const [productTypes, setProductTypes] = useState([]);
  const [activeTabName, setActiveTabName] = useState('GOLD'); 
  const [newTabName, setNewTabName] = useState('');
  const [activeTabSettings, setActiveTabSettings] = useState({ id: null, formula: '', display_color: '' });
  const [showAddTab, setShowAddTab] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const [typesRes, itemsRes, ratesRes] = await Promise.all([
            api.getProductTypes(),
            api.getMasterItems(),
            api.getDailyRates()
        ]);

        let types = typesRes.data || [];
        // Fallback for UI if DB empty
        if(types.length === 0) types = [{id: 1, name: 'GOLD', display_color: '#ffc107'}, {id: 2, name: 'SILVER', display_color: '#adb5bd'}];
        
        setProductTypes(types);
        setItems(itemsRes.data || []);
        setRates(ratesRes.data || {});

        // Set Active Tab
        const current = types.find(t => t.name === activeTabName) || types[0];
        if(current) {
            setActiveTabName(current.name);
            setActiveTabSettings({ id: current.id, formula: current.formula || '', display_color: current.display_color || '' });
        }
    } catch (err) { console.error("Error loading settings", err); }
  };

  // --- DYNAMIC TAB LOGIC ---
  const handleTabSwitch = (typeName) => {
      setActiveTabName(typeName);
      const type = productTypes.find(t => t.name === typeName);
      if(type) setActiveTabSettings({ id: type.id, formula: type.formula || '', display_color: type.display_color || '' });
  };

  const handleAddTab = async () => {
      if(!newTabName) return;
      try {
          await api.addProductType({ name: newTabName, formula: '', display_color: '#333333' });
          setNewTabName('');
          setShowAddTab(false);
          loadData();
      } catch(e) { alert("Error adding tab: " + e.message); }
  };

  const handleSaveTabSettings = async () => {
      if(!activeTabSettings.id) return;
      try {
          await api.updateProductType(activeTabSettings.id, activeTabSettings);
          alert("Settings Saved");
          loadData();
      } catch(e) { alert("Error saving settings"); }
  };

  const handleDeleteTab = async () => {
      if(!window.confirm(`Delete ${activeTabName} and ALL its items?`)) return;
      try {
          await api.deleteProductType(activeTabSettings.id);
          // Default back to GOLD
          setActiveTabName('GOLD');
          loadData();
      } catch(e) { alert("Error deleting tab"); }
  };

  // --- RATES ---
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

  // --- BULK ADD ITEM (PRESERVED) ---
  const handleBulkAdd = async () => {
    if (!entryNames.trim()) return alert("Please enter at least one item name");
    const namesArray = entryNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
    if (namesArray.length === 0) return alert("No valid names found");

    try {
      // Uses activeTabName to assign metal_type
      await api.addMasterItemsBulk({
          item_names: namesArray,
          metal_type: activeTabName, 
          ...newRule
      });
      setEntryNames('');
      setNewRule({ calc_method: 'STANDARD', default_wastage: '', mc_type: 'PER_GRAM', mc_value: '' });
      loadData();
      alert(`Successfully added ${namesArray.length} items to ${activeTabName}!`);
    } catch (err) { alert(err.response?.data?.error || "Error adding items"); }
  };

  // --- EDIT/DELETE ---
  const handleDeleteItem = async (id) => { if(window.confirm("Delete item?")) { await api.deleteMasterItem(id); loadData(); }};
  const startEdit = (item) => { setEditingId(item.id); setEditForm({ ...item }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const saveEdit = async () => { try { await api.updateMasterItem(editingId, editForm); setEditingId(null); loadData(); } catch (err) { alert("Failed to update."); }};

  const filteredItems = items.filter(i => i.metal_type === activeTabName);

  return (
    <div className="container-fluid mt-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-sliders me-2"></i>Configuration</h2>
        <button className="btn btn-sm btn-outline-primary" onClick={()=>setShowAddTab(!showAddTab)}>{showAddTab ? 'Cancel' : '+ New Type'}</button>
      </div>

      {/* NEW TAB FORM */}
      {showAddTab && (
          <div className="card mb-3 bg-light p-3 border-primary">
              <div className="input-group">
                  <input className="form-control" placeholder="New Tab Name (e.g. PLATINUM)" value={newTabName} onChange={e=>setNewTabName(e.target.value.toUpperCase())} />
                  <button className="btn btn-primary" onClick={handleAddTab}>Create Tab</button>
              </div>
          </div>
      )}

      {/* 1. DYNAMIC RATES CARD */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
          <div className="card-body py-3">
              <div className="row g-3">
                  {productTypes.map(t => (
                      <div className="col-md-3" key={t.id}>
                          <div className="input-group">
                              <span className="input-group-text fw-bold text-white" style={{backgroundColor: t.display_color || '#6c757d', minWidth:'80px'}}>{t.name}</span>
                              <input type="number" className="form-control fw-bold" value={rates[t.name]||''} onChange={e => setRates({...rates, [t.name]: e.target.value})} />
                              <button className="btn btn-dark" onClick={() => handleRateUpdate(t.name)} disabled={loadingRates}>✓</button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* 2. MASTER ITEMS & CONFIG */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-0">
            <ul className="nav nav-tabs card-header-tabs m-0">
                {productTypes.map(t => (
                    <li className="nav-item" key={t.id}>
                        <button className={`nav-link fw-bold ${activeTabName === t.name ? 'active' : 'text-muted'}`} 
                            style={activeTabName === t.name ? {borderTop: `3px solid ${t.display_color}`} : {}}
                            onClick={() => handleTabSwitch(t.name)}>
                            {t.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
        
        <div className="card-body">
            
            {/* A. TAB SETTINGS (Formula & Color) */}
            <div className="accordion mb-4" id="tabSettings">
                <div className="accordion-item">
                    <h2 className="accordion-header">
                        <button className="accordion-button collapsed py-2 bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSettings">
                            <i className="bi bi-gear me-2"></i> Configure {activeTabName} Logic
                        </button>
                    </h2>
                    <div id="collapseSettings" className="accordion-collapse collapse" data-bs-parent="#tabSettings">
                        <div className="accordion-body">
                            <div className="row g-2 align-items-end">
                                <div className="col-md-8">
                                    <label className="small fw-bold text-muted">Purchase Formula</label>
                                    <input className="form-control font-monospace form-control-sm" placeholder="(gross_weight * rate) + mc" value={activeTabSettings.formula} onChange={e=>setActiveTabSettings({...activeTabSettings, formula:e.target.value})} />
                                    <div className="form-text small">Vars: <code>gross_weight</code>, <code>rate</code>, <code>less_weight</code>, <code>less_percent</code></div>
                                </div>
                                <div className="col-md-2">
                                    <label className="small fw-bold text-muted">Color</label>
                                    <input type="color" className="form-control form-control-color w-100" value={activeTabSettings.display_color} onChange={e=>setActiveTabSettings({...activeTabSettings, display_color:e.target.value})} />
                                </div>
                                <div className="col-md-2">
                                    <button className="btn btn-sm btn-success w-100" onClick={handleSaveTabSettings}>Save</button>
                                </div>
                                <div className="col-12 text-end mt-2"><button className="btn btn-link btn-sm text-danger" onClick={handleDeleteTab}>Delete Tab</button></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* B. BULK ADD FORM (PRESERVED) */}
            <div className="bg-light p-3 rounded border mb-4">
                <h6 className="fw-bold mb-3 text-primary"><i className="bi bi-plus-circle me-2"></i>Add {activeTabName} Items</h6>
                <div className="row g-3">
                    <div className="col-12">
                        <input className="form-control border-primary" placeholder="Item Names (Comma Separated)" value={entryNames} onChange={e => setEntryNames(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={newRule.calc_method} onChange={e => setNewRule({...newRule, calc_method: e.target.value})}>
                            <option value="STANDARD">Standard</option><option value="RATE_ADD_ON">Rate Add-On</option><option value="FIXED_PRICE">Fixed Price</option>
                        </select>
                    </div>
                    {newRule.calc_method === 'STANDARD' && (
                        <>
                            <div className="col-md-2"><input type="number" className="form-control" placeholder="Wst%" value={newRule.default_wastage} onChange={e => setNewRule({...newRule, default_wastage: e.target.value})} /></div>
                            <div className="col-md-3">
                                <div className="input-group">
                                    <select className="form-select" style={{maxWidth:'80px'}} value={newRule.mc_type} onChange={e => setNewRule({...newRule, mc_type: e.target.value})}><option value="PER_GRAM">/g</option><option value="FIXED">Flat</option></select>
                                    <input type="number" className="form-control" placeholder="MC" value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}
                    {(newRule.calc_method === 'RATE_ADD_ON' || newRule.calc_method === 'FIXED_PRICE') && (
                        <div className="col-md-5"><div className="input-group"><span className="input-group-text">₹</span><input type="number" className="form-control" value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} /></div></div>
                    )}
                    <div className="col-md-2"><button className="btn btn-primary w-100 fw-bold" onClick={handleBulkAdd}>ADD</button></div>
                </div>
            </div>

            {/* C. ITEM LIST (PRESERVED) */}
            <div className="table-responsive">
                <table className="table table-hover align-middle border">
                    <thead className="table-light"><tr><th>Item Name</th><th>Method</th><th>Details</th><th className="text-end">Actions</th></tr></thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id}>
                                <td>{editingId === item.id ? <input className="form-control form-control-sm" value={editForm.item_name} onChange={e=>setEditForm({...editForm, item_name:e.target.value})} /> : item.item_name}</td>
                                <td>
                                    {item.calc_method === 'STANDARD' && <span className="badge bg-primary">Standard</span>}
                                    {item.calc_method === 'RATE_ADD_ON' && <span className="badge bg-info text-dark">Rate+</span>}
                                    {item.calc_method === 'FIXED_PRICE' && <span className="badge bg-success">Fixed</span>}
                                </td>
                                <td>{/* Simplified logic display for brevity, functionality preserved */}
                                    {item.calc_method === 'STANDARD' ? `VA: ${item.default_wastage}% | MC: ${item.mc_value}` : `Val: ${item.mc_value}`}
                                </td>
                                <td className="text-end">
                                    {editingId === item.id ? 
                                        <><button className="btn btn-sm btn-success me-1" onClick={saveEdit}>Save</button><button className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button></> 
                                        : 
                                        <><button className="btn btn-sm btn-link" onClick={()=>startEdit(item)}>Edit</button><button className="btn btn-sm btn-link text-danger" onClick={()=>handleDeleteItem(item.id)}>Del</button></>
                                    }
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-4">No items found in {activeTabName}.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
export default SettingsPage;