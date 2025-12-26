import React, { useEffect, useState } from 'react';
import { api } from '../api';

function SettingsPage() {
  const [activeMainTab, setActiveMainTab] = useState('PRODUCT');

  // --- PRODUCT CONFIG STATE ---
  const [items, setItems] = useState([]);
  const [rates, setRates] = useState({});
  const [loadingRates, setLoadingRates] = useState(false);
  
  // New Item / Bulk Add State
  const [entryNames, setEntryNames] = useState(''); 
  const [newRule, setNewRule] = useState({ 
      calc_method: 'STANDARD', 
      default_wastage: '', 
      mc_type: 'PER_GRAM', 
      mc_value: '',
      hsn_code: '' 
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [productTypes, setProductTypes] = useState([]);
  const [activeProductTab, setActiveProductTab] = useState('GOLD'); 
  const [newTabName, setNewTabName] = useState('');
  const [activeTabSettings, setActiveTabSettings] = useState({ id: null, formula: '', display_color: '', hsn_code: '' });
  const [showAddTab, setShowAddTab] = useState(false);
  
  // Search Filter State
  const [itemSearch, setItemSearch] = useState('');

  // --- BUSINESS PROFILE STATE ---
  const [bizForm, setBizForm] = useState({ business_name: '', contact_number: '', email: '', license_number: '', address: '', display_preference: 'BOTH' });
  const [bizLogo, setBizLogo] = useState(null);
  const [bizLogoPreview, setBizLogoPreview] = useState(null);

  useEffect(() => { loadData(); loadBusinessSettings(); }, []);

  const loadData = async () => {
    try {
        const [typesRes, itemsRes, ratesRes] = await Promise.all([api.getProductTypes(), api.getMasterItems(), api.getDailyRates()]);
        let types = typesRes.data || [];
        if(types.length === 0) types = [{id: 1, name: 'GOLD', display_color: '#ffc107', hsn_code: '7108'}, {id: 2, name: 'SILVER', display_color: '#adb5bd', hsn_code: '7106'}];
        
        setProductTypes(types); setItems(itemsRes.data || []); setRates(ratesRes.data || {});
        
        const current = types.find(t => t.name === activeProductTab) || types[0];
        if(current) {
            setActiveProductTab(current.name);
            setActiveTabSettings({ id: current.id, formula: current.formula || '', display_color: current.display_color || '', hsn_code: current.hsn_code || '' });
        }
    } catch (err) { console.error("Error loading settings", err); }
  };

  const loadBusinessSettings = async () => {
      try {
          const res = await api.getBusinessSettings();
          if (res.data && res.data.id) {
              setBizForm({ ...res.data, display_preference: res.data.display_preference || 'BOTH' });
              setBizLogoPreview(res.data.logo);
          }
      } catch (err) { console.error(err); }
  };

  const handleTabSwitch = (typeName) => {
      setActiveProductTab(typeName);
      const type = productTypes.find(t => t.name === typeName);
      if(type) setActiveTabSettings({ id: type.id, formula: type.formula || '', display_color: type.display_color || '', hsn_code: type.hsn_code || '' });
  };
  
  const handleSaveTabSettings = async () => {
      if(!activeTabSettings.id) return;
      try { await api.updateProductType(activeTabSettings.id, activeTabSettings); alert("Settings Saved"); loadData(); } catch(e) { alert("Error"); }
  };

  const handleBulkAdd = async () => {
    if (!entryNames.trim()) return alert("Enter names");
    const namesArray = entryNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
    try {
      const hsnToUse = newRule.hsn_code || activeTabSettings.hsn_code || '';
      await api.addMasterItemsBulk({ item_names: namesArray, metal_type: activeProductTab, ...newRule, hsn_code: hsnToUse });
      setEntryNames(''); setNewRule({ calc_method: 'STANDARD', default_wastage: '', mc_type: 'PER_GRAM', mc_value: '', hsn_code: '' });
      loadData(); alert(`Added ${namesArray.length} items`);
    } catch (err) { alert("Error"); }
  };

  const handleRateUpdate = async (metal) => { const val = rates[metal]; if(!val) return; setLoadingRates(true); try { await api.updateDailyRate({ metal_type: metal, rate: val }); alert("Updated"); } catch(err) { alert("Failed"); } finally { setLoadingRates(false); } };
  const handleDeleteItem = async (id) => { if(window.confirm("Delete?")) { await api.deleteMasterItem(id); loadData(); }};
  
  // --- EDIT LOGIC ---
  const startEdit = (item) => { setEditingId(item.id); setEditForm({ ...item }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  
  const saveEdit = async () => { 
      try { 
          await api.updateMasterItem(editingId, editForm); 
          setEditingId(null); 
          loadData(); 
      } catch (err) { alert("Failed"); }
  };

  const handleLogoChange = (e) => { const file = e.target.files[0]; if(file) { setBizLogo(file); setBizLogoPreview(URL.createObjectURL(file)); } };
  const saveBusinessProfile = async () => {
      if(!bizForm.business_name) return alert("Business Name Required");
      const formData = new FormData();
      Object.keys(bizForm).forEach(key => formData.append(key, bizForm[key]));
      if (bizLogo) formData.append('logo', bizLogo);
      try { await api.saveBusinessSettings(formData); alert("Saved!"); loadBusinessSettings(); } catch(e) { alert(e.message); }
  };

  // Live Search Filter
  const filteredItems = items.filter(i => 
      i.metal_type === activeProductTab && 
      i.item_name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const handleAddTab = async () => { if(!newTabName) return; try { await api.addProductType({ name: newTabName, formula: '', display_color: '#333333' }); setNewTabName(''); setShowAddTab(false); loadData(); } catch(e) { alert(e.message); } };
  const handleDeleteTab = async () => { if(!window.confirm(`Delete?`)) return; try { await api.deleteProductType(activeTabSettings.id); setActiveProductTab('GOLD'); loadData(); } catch(e) { alert("Error"); } };

  return (
    <div className="container-fluid mt-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4"><h2><i className="bi bi-gear-fill me-2"></i>Settings</h2></div>
      
      <ul className="nav nav-pills mb-4 gap-2">
          <li className="nav-item"><button className={`nav-link fw-bold px-4 ${activeMainTab === 'PRODUCT' ? 'active' : 'bg-white text-dark border'}`} onClick={() => setActiveMainTab('PRODUCT')}>Products & Billing</button></li>
          <li className="nav-item"><button className={`nav-link fw-bold px-4 ${activeMainTab === 'BUSINESS' ? 'active' : 'bg-white text-dark border'}`} onClick={() => setActiveMainTab('BUSINESS')}>Business Profile</button></li>
      </ul>

      {activeMainTab === 'BUSINESS' && (
          <div className="card shadow-sm border-0"><div className="card-header bg-white py-3"><h5 className="mb-0 fw-bold text-primary">Business Settings</h5></div><div className="card-body"><div className="row g-4"><div className="col-md-8"><div className="row g-3"><div className="col-md-6"><label className="form-label small fw-bold">Business Name</label><input className="form-control" value={bizForm.business_name} onChange={e => setBizForm({...bizForm, business_name: e.target.value})} /></div><div className="col-md-6"><label className="form-label small fw-bold">Contact</label><input className="form-control" value={bizForm.contact_number} onChange={e => setBizForm({...bizForm, contact_number: e.target.value})} /></div><div className="col-md-6"><label className="form-label small fw-bold">Email</label><input className="form-control" value={bizForm.email} onChange={e => setBizForm({...bizForm, email: e.target.value})} /></div><div className="col-md-6"><label className="form-label small fw-bold">License / GST</label><input className="form-control" value={bizForm.license_number} onChange={e => setBizForm({...bizForm, license_number: e.target.value})} /></div><div className="col-12"><label className="form-label small fw-bold">Address</label><textarea className="form-control" rows="2" value={bizForm.address} onChange={e => setBizForm({...bizForm, address: e.target.value})}></textarea></div><div className="col-md-6"><label className="form-label small fw-bold">Display Pref</label><select className="form-select" value={bizForm.display_preference} onChange={e => setBizForm({...bizForm, display_preference: e.target.value})}><option value="BOTH">Logo & Name</option><option value="LOGO">Logo Only</option><option value="NAME">Name Only</option></select></div><div className="col-md-6"><label className="form-label small fw-bold">Logo</label><input type="file" className="form-control" accept="image/*" onChange={handleLogoChange} /></div><div className="col-12 mt-4"><button className="btn btn-primary fw-bold px-5" onClick={saveBusinessProfile}>Save Profile</button></div></div></div><div className="col-md-4"><div className="card bg-light h-100"><div className="card-header text-center fw-bold text-muted">Preview</div><div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-4"><div className="border bg-white p-3 w-100 shadow-sm" style={{minHeight:'200px'}}>{(bizForm.display_preference==='LOGO'||bizForm.display_preference==='BOTH')&&bizLogoPreview&&<img src={bizLogoPreview} alt="Logo" className="img-fluid mb-2" style={{maxHeight:'80px'}}/>}{(bizForm.display_preference==='NAME'||bizForm.display_preference==='BOTH')&&<h5 className="fw-bold text-dark mb-1">{bizForm.business_name||'Name'}</h5>}<div className="small text-muted">{bizForm.address||'Address...'}</div></div></div></div></div></div></div></div>
      )}

      {activeMainTab === 'PRODUCT' && (
        <>
            <div className="d-flex justify-content-end mb-3"><button className="btn btn-sm btn-outline-primary" onClick={()=>setShowAddTab(!showAddTab)}>{showAddTab ? 'Cancel' : '+ New Type'}</button></div>
            {showAddTab && <div className="card mb-3 bg-light p-3 border-primary"><div className="input-group"><input className="form-control" placeholder="New Tab Name" value={newTabName} onChange={e=>setNewTabName(e.target.value.toUpperCase())} /><button className="btn btn-primary" onClick={handleAddTab}>Create Tab</button></div></div>}

            <div className="card shadow-sm border-0 mb-4 bg-light"><div className="card-body py-3"><div className="row g-3">{productTypes.map(t => (<div className="col-md-3" key={t.id}><div className="input-group"><span className="input-group-text fw-bold text-white" style={{backgroundColor: t.display_color || '#6c757d', minWidth:'80px'}}>{t.name}</span><input type="number" className="form-control fw-bold" value={rates[t.name]||''} onChange={e => setRates({...rates, [t.name]: e.target.value})} /><button className="btn btn-dark" onClick={() => handleRateUpdate(t.name)} disabled={loadingRates}>✓</button></div></div>))}</div></div></div>

            <div className="card shadow-sm border-0">
                <div className="card-header bg-white p-0">
                    <ul className="nav nav-tabs card-header-tabs m-0">{productTypes.map(t => (<li className="nav-item" key={t.id}><button className={`nav-link fw-bold ${activeProductTab === t.name ? 'active' : 'text-muted'}`} style={activeProductTab === t.name ? {borderTop: `3px solid ${t.display_color}`} : {}} onClick={() => handleTabSwitch(t.name)}>{t.name}</button></li>))}</ul>
                </div>
                <div className="card-body">
                    {/* TAB SETTINGS */}
                    <div className="accordion mb-4" id="tabSettings"><div className="accordion-item"><h2 className="accordion-header"><button className="accordion-button collapsed py-2 bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSettings"><i className="bi bi-gear me-2"></i> Configure {activeProductTab}</button></h2><div id="collapseSettings" className="accordion-collapse collapse" data-bs-parent="#tabSettings"><div className="accordion-body"><div className="row g-2 align-items-end"><div className="col-md-4"><label className="small fw-bold text-muted">Purchase Formula</label><input className="form-control font-monospace form-control-sm" value={activeTabSettings.formula} onChange={e=>setActiveTabSettings({...activeTabSettings, formula:e.target.value})} /></div><div className="col-md-2"><label className="small fw-bold text-muted">Default HSN</label><input className="form-control form-control-sm" value={activeTabSettings.hsn_code} onChange={e=>setActiveTabSettings({...activeTabSettings, hsn_code:e.target.value})} /></div><div className="col-md-2"><label className="small fw-bold text-muted">Color</label><input type="color" className="form-control form-control-color w-100" value={activeTabSettings.display_color} onChange={e=>setActiveTabSettings({...activeTabSettings, display_color:e.target.value})} /></div><div className="col-md-2"><button className="btn btn-sm btn-success w-100" onClick={handleSaveTabSettings}>Save</button></div><div className="col-12 text-end"><button className="btn btn-link btn-sm text-danger" onClick={handleDeleteTab}>Delete Tab</button></div></div></div></div></div></div>

                    {/* BULK ADD */}
                    <div className="bg-light p-3 rounded border mb-4">
                        <div className="row g-3">
                            <div className="col-md-12"><input className="form-control border-primary" placeholder="Item Names (Comma Separated)" value={entryNames} onChange={e => setEntryNames(e.target.value)} /></div>
                            <div className="col-md-2"><select className="form-select" value={newRule.calc_method} onChange={e => setNewRule({...newRule, calc_method: e.target.value})}><option value="STANDARD">Standard</option><option value="RATE_ADD_ON">Rate Add-On</option><option value="FIXED_PRICE">Fixed Price</option></select></div>
                            <div className="col-md-2"><input className="form-control" placeholder="HSN (Opt)" value={newRule.hsn_code} onChange={e => setNewRule({...newRule, hsn_code: e.target.value})} /></div>
                            {newRule.calc_method === 'STANDARD' && (<><div className="col-md-2"><input type="number" className="form-control" placeholder="Wst%" value={newRule.default_wastage} onChange={e => setNewRule({...newRule, default_wastage: e.target.value})} /></div><div className="col-md-3"><div className="input-group"><select className="form-select" style={{maxWidth:'70px'}} value={newRule.mc_type} onChange={e => setNewRule({...newRule, mc_type: e.target.value})}><option value="PER_GRAM">/g</option><option value="FIXED">Flat</option></select><input type="number" className="form-control" placeholder="MC" value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} /></div></div></>)}
                            {(newRule.calc_method === 'RATE_ADD_ON' || newRule.calc_method === 'FIXED_PRICE') && (<div className="col-md-3"><div className="input-group"><span className="input-group-text">₹</span><input type="number" className="form-control" value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} /></div></div>)}
                            <div className="col-md-2"><button className="btn btn-primary w-100 fw-bold" onClick={handleBulkAdd}>ADD</button></div>
                        </div>
                    </div>

                    {/* LIVE SEARCH BAR */}
                    <div className="mb-3">
                        <div className="input-group">
                            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                            <input type="text" className="form-control" placeholder={`Search ${activeProductTab} items...`} value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                        </div>
                    </div>

                    {/* TABLE WITH FULL EDITING */}
                    <div className="table-responsive">
                        <table className="table table-hover align-middle border">
                            <thead className="table-light"><tr><th>Item Name</th><th>HSN</th><th>Method</th><th>Details</th><th className="text-end">Actions</th></tr></thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id}>
                                        {editingId === item.id ? (
                                            /* --- EDIT MODE ROW --- */
                                            <>
                                                <td><input className="form-control form-control-sm" value={editForm.item_name} onChange={e=>setEditForm({...editForm, item_name:e.target.value})} /></td>
                                                <td><input className="form-control form-control-sm" value={editForm.hsn_code} onChange={e=>setEditForm({...editForm, hsn_code:e.target.value})} style={{maxWidth:'80px'}} /></td>
                                                <td>
                                                    <select className="form-select form-select-sm" value={editForm.calc_method} onChange={e => setEditForm({...editForm, calc_method: e.target.value})}>
                                                        <option value="STANDARD">Standard</option>
                                                        <option value="RATE_ADD_ON">Rate+</option>
                                                        <option value="FIXED_PRICE">Fixed</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    {editForm.calc_method === 'STANDARD' ? (
                                                        <div className="d-flex gap-1">
                                                            <input type="number" className="form-control form-control-sm" placeholder="VA%" value={editForm.default_wastage} onChange={e => setEditForm({...editForm, default_wastage: e.target.value})} style={{width: '60px'}} />
                                                            <select className="form-select form-select-sm" value={editForm.mc_type} onChange={e => setEditForm({...editForm, mc_type: e.target.value})} style={{width: '60px'}}>
                                                                <option value="PER_GRAM">/g</option>
                                                                <option value="FIXED">Flat</option>
                                                            </select>
                                                            <input type="number" className="form-control form-control-sm" placeholder="MC" value={editForm.mc_value} onChange={e => setEditForm({...editForm, mc_value: e.target.value})} style={{width: '70px'}} />
                                                        </div>
                                                    ) : (
                                                        <div className="input-group input-group-sm">
                                                            <span className="input-group-text">₹</span>
                                                            <input type="number" className="form-control" value={editForm.mc_value} onChange={e => setEditForm({...editForm, mc_value: e.target.value})} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    <button className="btn btn-sm btn-success me-1" onClick={saveEdit}>Save</button>
                                                    <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button>
                                                </td>
                                            </>
                                        ) : (
                                            /* --- VIEW MODE ROW --- */
                                            <>
                                                <td>{item.item_name}</td>
                                                <td>{item.hsn_code}</td>
                                                <td>
                                                    {item.calc_method === 'STANDARD' && <span className="badge bg-primary">Standard</span>}
                                                    {item.calc_method === 'RATE_ADD_ON' && <span className="badge bg-info text-dark">Rate+</span>}
                                                    {item.calc_method === 'FIXED_PRICE' && <span className="badge bg-success">Fixed</span>}
                                                </td>
                                                <td>{item.calc_method === 'STANDARD' ? `VA: ${item.default_wastage}% | MC: ${item.mc_value}` : `Val: ${item.mc_value}`}</td>
                                                <td className="text-end">
                                                    <button className="btn btn-sm btn-link" onClick={()=>startEdit(item)}>Edit</button>
                                                    <button className="btn btn-sm btn-link text-danger" onClick={()=>handleDeleteItem(item.id)}>Del</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No items found matching "{itemSearch}".</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
}
export default SettingsPage;