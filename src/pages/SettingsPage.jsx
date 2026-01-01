import React, { useEffect, useState, useContext } from 'react';
import { api } from '../api';
import { BusinessContext } from '../context/BusinessContext';

const MODULES = [
    { key: 'BILLING', label: 'Sales & Billing' },
    { key: 'GST', label: 'GST Filing' },
    { key: 'INVENTORY', label: 'Inventory Mgmt' },
    { key: 'AUDIT', label: 'Stock Audit' },
    { key: 'REFINERY', label: 'Refinery / Old Metal' },
    { key: 'PARTNERS', label: 'Vendors & Shops' },
    { key: 'CUSTOMERS', label: 'Customer Mgmt' },
    { key: 'CHITS', label: 'Chit Schemes' },
    { key: 'LEDGER', label: 'Ledger / Expenses' },
    { key: 'SETTINGS', label: 'Settings Access' }
];

function SettingsPage() {
  const { refreshSettings } = useContext(BusinessContext);
  const [activeMainTab, setActiveMainTab] = useState('PRODUCT');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  // --- BACKUP STATE ---
  const [restoring, setRestoring] = useState(false);

  // --- PRODUCT STATE ---
  const [items, setItems] = useState([]);
  const [rates, setRates] = useState({});
  const [loadingRates, setLoadingRates] = useState(false);
  const [entryNames, setEntryNames] = useState(''); 
  const [newRule, setNewRule] = useState({ calc_method: 'STANDARD', default_wastage: '', mc_type: 'PER_GRAM', mc_value: '', hsn_code: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [productTypes, setProductTypes] = useState([]);
  const [activeProductTab, setActiveProductTab] = useState('GOLD'); 
  const [newTabName, setNewTabName] = useState('');
  const [activeTabSettings, setActiveTabSettings] = useState({ id: null, formula: '', display_color: '', hsn_code: '' });
  const [showAddTab, setShowAddTab] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // --- BUSINESS PROFILE STATE ---
  const [bizForm, setBizForm] = useState({ business_name: '', contact_number: '', email: '', license_number: '', address: '', display_preference: 'BOTH' });
  const [bizLogo, setBizLogo] = useState(null);
  const [bizLogoPreview, setBizLogoPreview] = useState(null);

  // --- USER STATE ---
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
  const [newUserPermissions, setNewUserPermissions] = useState([]);
  const [passModal, setPassModal] = useState({ show: false, userId: null, newPassword: '' });

  useEffect(() => { loadData(); loadBusinessSettings(); }, []);

  const loadData = async () => {
    try {
        const [typesRes, itemsRes, ratesRes] = await Promise.all([api.getProductTypes(), api.getMasterItems(), api.getDailyRates()]);
        let types = typesRes.data || [];
        setProductTypes(types); setItems(itemsRes.data || []); setRates(ratesRes.data || {});
        if (types.length > 0) {
            const targetTab = types.find(t => t.name === activeProductTab) || types[0];
            if (targetTab) {
                setActiveProductTab(targetTab.name);
                setActiveTabSettings({ id: targetTab.id, formula: targetTab.formula || '', display_color: targetTab.display_color || '', hsn_code: targetTab.hsn_code || '' });
            }
        }
    } catch (err) { console.error(err); }
  };

  const loadBusinessSettings = async () => {
      try {
          const res = await api.getBusinessSettings();
          if (res.data && res.data.id) {
              setBizForm({ 
                  business_name: res.data.business_name || '',
                  contact_number: res.data.contact_number || '',
                  email: res.data.email || '',
                  license_number: res.data.license_number || '',
                  address: res.data.address || '',
                  display_preference: res.data.display_preference || 'BOTH'
              });
              setBizLogoPreview(res.data.logo || null);
          }
      } catch (err) { console.error(err); }
  };

  // --- BACKUP HANDLERS ---
  const handleDownloadBackup = async () => {
      try {
          const res = await api.downloadBackup();
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `AURUM_BACKUP_${new Date().toLocaleDateString()}.json`);
          document.body.appendChild(link);
          link.click();
          link.remove();
      } catch (err) { alert("Download Failed"); }
  };

  const handleRestoreBackup = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.confirm("WARNING: This will ERASE current data and replace it with the backup. Continue?")) {
          e.target.value = null;
          return;
      }

      setRestoring(true);
      try {
          await api.restoreBackup(file);
          alert("System Restored Successfully! Page will reload.");
          window.location.reload();
      } catch (err) {
          alert("Restore Failed: " + (err.response?.data?.error || err.message));
          setRestoring(false);
      }
  };

  // --- USER HANDLERS ---
  const loadUsers = async () => { try { const res = await api.getUsers(); setUsers(res.data); } catch(e) {} };
  const handleTogglePermission = (key) => setNewUserPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const handleAddUser = async () => {
      if (!newUser.username || !newUser.password) return alert("Required fields missing");
      try { await api.addUser({ ...newUser, permissions: newUserPermissions }); alert("User Created!"); setNewUser({ username: '', password: '', role: 'staff' }); setNewUserPermissions([]); loadUsers(); } catch (err) { alert(err.response?.data?.error); }
  };
  const handleDeleteUser = async (id) => { if(window.confirm("Delete?")) { try { await api.deleteUser(id); loadUsers(); } catch(e){ alert(e.message); } } };
  const handleChangePassword = async () => { if(!passModal.newPassword) return; try { await api.updateUser(passModal.userId, { password: passModal.newPassword }); alert("Updated"); setPassModal({ show: false, userId: null, newPassword: '' }); } catch(e){ alert(e.message); } };

  // --- OTHER HANDLERS ---
  const handleTabSwitch = (typeName) => { setActiveProductTab(typeName); const type = productTypes.find(t => t.name === typeName); if(type) setActiveTabSettings({ id: type.id, formula: type.formula || '', display_color: type.display_color || '', hsn_code: type.hsn_code || '' }); };
  const handleSaveTabSettings = async () => { if(!activeTabSettings.id) return; try { await api.updateProductType(activeTabSettings.id, activeTabSettings); alert("Saved"); loadData(); } catch(e) { alert("Error"); } };
  const handleBulkAdd = async () => { if (!entryNames.trim()) return alert("Enter names"); try { await api.addMasterItemsBulk({ item_names: entryNames.split(','), metal_type: activeProductTab, ...newRule, hsn_code: newRule.hsn_code || activeTabSettings.hsn_code }); setEntryNames(''); loadData(); alert(`Added!`); } catch (err) { alert("Error"); } };
  const handleRateUpdate = async (metal) => { const val = rates[metal]; if(!val) return; setLoadingRates(true); try { await api.updateDailyRate({ metal_type: metal, rate: val }); alert("Updated"); } catch(err) { alert("Failed"); } finally { setLoadingRates(false); } };
  const handleDeleteItem = async (id) => { if(window.confirm("Delete?")) { await api.deleteMasterItem(id); loadData(); }};
  const startEdit = (item) => { setEditingId(item.id); setEditForm({ ...item }); }; 
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const saveEdit = async () => { try { await api.updateMasterItem(editingId, editForm); setEditingId(null); loadData(); } catch (err) { alert("Failed"); } };
  const handleLogoChange = (e) => { const file = e.target.files[0]; if(file) { setBizLogo(file); setBizLogoPreview(URL.createObjectURL(file)); } };
  const saveBusinessProfile = async () => { const fd = new FormData(); Object.keys(bizForm).forEach(k => fd.append(k, bizForm[k])); if (bizLogo) fd.append('logo', bizLogo); try { await api.saveBusinessSettings(fd); await refreshSettings(); alert("Saved!"); loadBusinessSettings(); } catch(e) { alert(e.message); } };
  const filteredItems = items.filter(i => i.metal_type === activeProductTab && i.item_name.toLowerCase().includes(itemSearch.toLowerCase()));
  const handleAddTab = async () => { if(!newTabName) return; try { await api.addProductType({ name: newTabName, formula: '', display_color: '#333333' }); setNewTabName(''); setShowAddTab(false); loadData(); } catch(e) { alert(e.message); } };
  const handleDeleteTab = async () => { if(!window.confirm(`Delete?`)) return; try { await api.deleteProductType(activeTabSettings.id); setActiveProductTab(''); loadData(); } catch(e) { alert("Error"); } };

  return (
    <div className="container-fluid mt-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4"><h2><i className="bi bi-gear-fill me-2"></i>Settings</h2></div>
      
      <ul className="nav nav-pills mb-4 gap-2">
          <li className="nav-item"><button className={`nav-link fw-bold px-4 ${activeMainTab === 'PRODUCT' ? 'active' : 'bg-white text-dark border'}`} onClick={() => setActiveMainTab('PRODUCT')}>Products & Billing</button></li>
          <li className="nav-item"><button className={`nav-link fw-bold px-4 ${activeMainTab === 'BUSINESS' ? 'active' : 'bg-white text-dark border'}`} onClick={() => setActiveMainTab('BUSINESS')}>Business Profile</button></li>
          {isAdmin && <li className="nav-item"><button className={`nav-link fw-bold px-4 ${activeMainTab === 'USERS' ? 'active' : 'bg-white text-dark border'}`} onClick={() => { setActiveMainTab('USERS'); loadUsers(); }}>Users & Staff</button></li>}
          {isAdmin && <li className="nav-item"><button className={`nav-link fw-bold px-4 ${activeMainTab === 'BACKUP' ? 'active' : 'bg-white text-dark border'}`} onClick={() => setActiveMainTab('BACKUP')}>Backup & Restore</button></li>}
      </ul>

      {/* --- BACKUP TAB --- */}
      {activeMainTab === 'BACKUP' && isAdmin && (
          <div className="card shadow-sm border-0">
              <div className="card-header bg-dark text-white py-3"><h5 className="mb-0 fw-bold"><i className="bi bi-database-fill-gear me-2"></i>Data Management</h5></div>
              <div className="card-body p-5 text-center">
                  <div className="row g-5">
                      <div className="col-md-6 border-end">
                          <div className="mb-4 text-success"><i className="bi bi-cloud-download display-1"></i></div>
                          <h4 className="fw-bold">Download Backup</h4>
                          <p className="text-muted">Creates a full JSON snapshot of Inventory, Users, Bills, and Ledger.</p>
                          <button className="btn btn-success btn-lg fw-bold px-5" onClick={handleDownloadBackup}>Download Snapshot</button>
                      </div>
                      <div className="col-md-6">
                          <div className="mb-4 text-danger"><i className="bi bi-cloud-upload display-1"></i></div>
                          <h4 className="fw-bold">Restore Data</h4>
                          <p className="text-muted">Restores the system from a previous backup file. <br/><strong className="text-danger">Warning: Current data will be overwritten.</strong></p>
                          {restoring ? (
                              <div className="spinner-border text-danger" role="status"><span className="visually-hidden">Loading...</span></div>
                          ) : (
                              <div className="mx-auto" style={{maxWidth:'300px'}}>
                                  <label className="btn btn-outline-danger btn-lg w-100 fw-bold">
                                      <i className="bi bi-folder2-open me-2"></i> Select Backup File
                                      <input type="file" accept=".json" hidden onChange={handleRestoreBackup} />
                                  </label>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- USERS TAB --- */}
      {activeMainTab === 'USERS' && isAdmin && (
          <div className="row g-4">
              <div className="col-md-5">
                  <div className="card shadow-sm border-0 h-100">
                      <div className="card-header bg-primary text-white fw-bold">Create New User</div>
                      <div className="card-body">
                          <div className="row g-2 mb-3">
                              <div className="col-6"><label className="form-label small fw-bold">Username</label><input className="form-control" value={newUser.username||''} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="e.g. staff1" /></div>
                              <div className="col-6"><label className="form-label small fw-bold">Role</label><select className="form-select" value={newUser.role||'staff'} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
                              <div className="col-12"><label className="form-label small fw-bold">Password</label><input className="form-control" type="password" value={newUser.password||''} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="******" /></div>
                          </div>
                          <div className="mb-3">
                              <label className="form-label small fw-bold text-muted border-bottom pb-1 d-block">Permissions</label>
                              <div className="row g-2">{MODULES.map(mod => (<div className="col-6" key={mod.key}><div className="form-check"><input className="form-check-input" type="checkbox" id={`perm-${mod.key}`} checked={newUserPermissions.includes(mod.key)} onChange={() => handleTogglePermission(mod.key)} /><label className="form-check-label small" htmlFor={`perm-${mod.key}`}>{mod.label}</label></div></div>))}</div>
                          </div>
                          <button className="btn btn-primary w-100 fw-bold mt-2" onClick={handleAddUser}>Create User</button>
                      </div>
                  </div>
              </div>
              <div className="col-md-7">
                  <div className="card shadow-sm border-0 h-100">
                      <div className="card-header bg-white fw-bold">Staff Logins</div>
                      <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                              <thead className="table-light"><tr><th>User</th><th>Role</th><th>Access</th><th>Actions</th></tr></thead>
                              <tbody>
                                  {users.map(u => (
                                      <tr key={u.id}>
                                          <td className="fw-bold">{u.username} {currentUser.id === u.id && <span className="badge bg-success ms-1">YOU</span>}</td>
                                          <td><span className={`badge ${u.role==='admin'?'bg-danger':u.role==='manager'?'bg-warning text-dark':'bg-secondary'}`}>{u.role.toUpperCase()}</span></td>
                                          <td>{u.role === 'admin' ? <span className="badge bg-success">FULL</span> : <small className="text-muted" style={{fontSize:'0.75rem'}}>{u.permissions?.join(', ')||'None'}</small>}</td>
                                          <td><button className="btn btn-sm btn-link text-primary p-0 me-2" onClick={() => setPassModal({ show: true, userId: u.id, newPassword: '' })}>Pass</button>{currentUser.id !== u.id && <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDeleteUser(u.id)}><i className="bi bi-trash"></i></button>}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- BUSINESS TAB --- */}
      {activeMainTab === 'BUSINESS' && (
          <div className="card shadow-sm border-0"><div className="card-header bg-white py-3"><h5 className="mb-0 fw-bold text-primary">Business Settings</h5></div><div className="card-body"><div className="row g-4"><div className="col-md-8"><div className="row g-3"><div className="col-md-6"><label className="form-label small fw-bold">Business Name</label><input className="form-control" value={bizForm.business_name||''} onChange={e => setBizForm({...bizForm, business_name: e.target.value})} /></div><div className="col-md-6"><label className="form-label small fw-bold">Contact</label><input className="form-control" value={bizForm.contact_number||''} onChange={e => setBizForm({...bizForm, contact_number: e.target.value})} /></div><div className="col-md-6"><label className="form-label small fw-bold">Email</label><input className="form-control" value={bizForm.email||''} onChange={e => setBizForm({...bizForm, email: e.target.value})} /></div><div className="col-md-6"><label className="form-label small fw-bold">License / GST</label><input className="form-control" value={bizForm.license_number||''} onChange={e => setBizForm({...bizForm, license_number: e.target.value})} /></div><div className="col-12"><label className="form-label small fw-bold">Address</label><textarea className="form-control" rows="2" value={bizForm.address||''} onChange={e => setBizForm({...bizForm, address: e.target.value})}></textarea></div><div className="col-md-6"><label className="form-label small fw-bold">Display Pref</label><select className="form-select" value={bizForm.display_preference} onChange={e => setBizForm({...bizForm, display_preference: e.target.value})}><option value="BOTH">Logo & Name</option><option value="LOGO">Logo Only</option><option value="NAME">Name Only</option></select></div><div className="col-md-6"><label className="form-label small fw-bold">Logo</label><input type="file" className="form-control" accept="image/*" onChange={handleLogoChange} /></div><div className="col-12 mt-4"><button className="btn btn-primary fw-bold px-5" onClick={saveBusinessProfile}>Save Profile</button></div></div></div><div className="col-md-4"><div className="card bg-light h-100"><div className="card-header text-center fw-bold text-muted">Preview</div><div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-4"><div className="border bg-white p-3 w-100 shadow-sm" style={{minHeight:'200px'}}>{(bizForm.display_preference==='LOGO'||bizForm.display_preference==='BOTH')&&bizLogoPreview&&<img src={bizLogoPreview} alt="Logo" className="img-fluid mb-2" style={{maxHeight:'80px'}}/>}{(bizForm.display_preference==='NAME'||bizForm.display_preference==='BOTH')&&<h5 className="fw-bold text-dark mb-1">{bizForm.business_name||'Name'}</h5>}<div className="small text-muted">{bizForm.address||'Address...'}</div></div></div></div></div></div></div></div>
      )}

      {/* --- PRODUCT TAB --- */}
      {activeMainTab === 'PRODUCT' && (
        <>
            <div className="d-flex justify-content-end mb-3"><button className="btn btn-sm btn-outline-primary" onClick={()=>setShowAddTab(!showAddTab)}>{showAddTab ? 'Cancel' : '+ New Type'}</button></div>
            {showAddTab && <div className="card mb-3 bg-light p-3 border-primary"><div className="input-group"><input className="form-control" placeholder="New Tab Name" value={newTabName} onChange={e=>setNewTabName(e.target.value.toUpperCase())} /><button className="btn btn-primary" onClick={handleAddTab}>Create Tab</button></div></div>}
            <div className="card shadow-sm border-0 mb-4 bg-light"><div className="card-body py-3"><div className="row g-3">{productTypes.map(t => (<div className="col-md-3" key={t.id}><div className="input-group"><span className="input-group-text fw-bold text-white" style={{backgroundColor: t.display_color || '#6c757d', minWidth:'80px'}}>{t.name}</span><input type="number" className="form-control fw-bold" value={rates[t.name]||''} onChange={e => setRates({...rates, [t.name]: e.target.value})} /><button className="btn btn-dark" onClick={() => handleRateUpdate(t.name)} disabled={loadingRates}>✓</button></div></div>))}</div></div></div>
            <div className="card shadow-sm border-0"><div className="card-header bg-white p-0"><ul className="nav nav-tabs card-header-tabs m-0">{productTypes.map(t => (<li className="nav-item" key={t.id}><button className={`nav-link fw-bold ${activeProductTab === t.name ? 'active' : 'text-muted'}`} style={activeProductTab === t.name ? {borderTop: `3px solid ${t.display_color}`} : {}} onClick={() => handleTabSwitch(t.name)}>{t.name}</button></li>))}</ul></div><div className="card-body"><div className="accordion mb-4" id="tabSettings"><div className="accordion-item"><h2 className="accordion-header"><button className="accordion-button collapsed py-2 bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSettings"><i className="bi bi-gear me-2"></i> Configure {activeProductTab}</button></h2><div id="collapseSettings" className="accordion-collapse collapse" data-bs-parent="#tabSettings"><div className="accordion-body"><div className="row g-2 align-items-end"><div className="col-md-4"><label className="small fw-bold text-muted">Purchase Formula</label><input className="form-control font-monospace form-control-sm" value={activeTabSettings.formula} onChange={e=>setActiveTabSettings({...activeTabSettings, formula:e.target.value})} /></div><div className="col-md-2"><label className="small fw-bold text-muted">Default HSN</label><input className="form-control form-control-sm" value={activeTabSettings.hsn_code} onChange={e=>setActiveTabSettings({...activeTabSettings, hsn_code:e.target.value})} /></div><div className="col-md-2"><label className="small fw-bold text-muted">Color</label><input type="color" className="form-control form-control-color w-100" value={activeTabSettings.display_color} onChange={e=>setActiveTabSettings({...activeTabSettings, display_color:e.target.value})} /></div><div className="col-md-2"><button className="btn btn-sm btn-success w-100" onClick={handleSaveTabSettings}>Save</button></div><div className="col-12 text-end"><button className="btn btn-link btn-sm text-danger" onClick={handleDeleteTab}>Delete Tab</button></div></div></div></div></div></div><div className="bg-light p-3 rounded border mb-4"><div className="row g-3"><div className="col-md-12"><input className="form-control border-primary" placeholder="Item Names (Comma Separated)" value={entryNames} onChange={e => setEntryNames(e.target.value)} /></div><div className="col-md-2"><select className="form-select" value={newRule.calc_method} onChange={e => setNewRule({...newRule, calc_method: e.target.value})}><option value="STANDARD">Standard</option><option value="RATE_ADD_ON">Rate Add-On</option><option value="FIXED_PRICE">Fixed Price</option></select></div><div className="col-md-2"><input className="form-control" placeholder="HSN (Opt)" value={newRule.hsn_code} onChange={e => setNewRule({...newRule, hsn_code: e.target.value})} /></div>{newRule.calc_method === 'STANDARD' && (<><div className="col-md-2"><input type="number" className="form-control" placeholder="Wst%" value={newRule.default_wastage} onChange={e => setNewRule({...newRule, default_wastage: e.target.value})} /></div><div className="col-md-3"><div className="input-group"><select className="form-select" style={{maxWidth:'70px'}} value={newRule.mc_type} onChange={e => setNewRule({...newRule, mc_type: e.target.value})}><option value="PER_GRAM">/g</option><option value="FIXED">Flat</option></select><input type="number" className="form-control" placeholder="MC" value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} /></div></div></>)}{(newRule.calc_method === 'RATE_ADD_ON' || newRule.calc_method === 'FIXED_PRICE') && (<div className="col-md-3"><div className="input-group"><span className="input-group-text">₹</span><input type="number" className="form-control" value={newRule.mc_value} onChange={e => setNewRule({...newRule, mc_value: e.target.value})} /></div></div>)}<div className="col-md-2"><button className="btn btn-primary w-100 fw-bold" onClick={handleBulkAdd}>ADD</button></div></div></div><div className="mb-3"><div className="input-group"><span className="input-group-text bg-white"><i className="bi bi-search"></i></span><input type="text" className="form-control" placeholder={`Search ${activeProductTab} items...`} value={itemSearch} onChange={e => setItemSearch(e.target.value)} /></div></div><div className="table-responsive"><table className="table table-hover align-middle border"><thead className="table-light"><tr><th>Item Name</th><th>HSN</th><th>Method</th><th>Details</th><th className="text-end">Actions</th></tr></thead><tbody>{filteredItems.map(item => (<tr key={item.id}>{editingId === item.id ? (<><td><input className="form-control form-control-sm" value={editForm.item_name||''} onChange={e=>setEditForm({...editForm, item_name:e.target.value})} /></td><td><input className="form-control form-control-sm" value={editForm.hsn_code||''} onChange={e=>setEditForm({...editForm, hsn_code:e.target.value})} style={{maxWidth:'80px'}} /></td><td><select className="form-select form-select-sm" value={editForm.calc_method} onChange={e => setEditForm({...editForm, calc_method: e.target.value})}><option value="STANDARD">Standard</option><option value="RATE_ADD_ON">Rate+</option><option value="FIXED_PRICE">Fixed</option></select></td><td>{editForm.calc_method === 'STANDARD' ? (<div className="d-flex gap-1"><input type="number" className="form-control form-control-sm" placeholder="VA%" value={editForm.default_wastage||''} onChange={e => setEditForm({...editForm, default_wastage: e.target.value})} style={{width: '60px'}} /><select className="form-select form-select-sm" value={editForm.mc_type} onChange={e => setEditForm({...editForm, mc_type: e.target.value})} style={{width: '60px'}}><option value="PER_GRAM">/g</option><option value="FIXED">Flat</option></select><input type="number" className="form-control form-control-sm" placeholder="MC" value={editForm.mc_value||''} onChange={e => setEditForm({...editForm, mc_value: e.target.value})} style={{width: '70px'}} /></div>) : (<div className="input-group input-group-sm"><span className="input-group-text">₹</span><input type="number" className="form-control" value={editForm.mc_value||''} onChange={e => setEditForm({...editForm, mc_value: e.target.value})} /></div>)}</td><td className="text-end"><button className="btn btn-sm btn-success me-1" onClick={saveEdit}>Save</button><button className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button></td></>) : (<><td>{item.item_name}</td><td>{item.hsn_code}</td><td>{item.calc_method === 'STANDARD' ? <span className="badge bg-primary">Standard</span> : item.calc_method === 'RATE_ADD_ON' ? <span className="badge bg-info text-dark">Rate+</span> : <span className="badge bg-success">Fixed</span>}</td><td>{item.calc_method === 'STANDARD' ? `VA: ${item.default_wastage}% | MC: ${item.mc_value}` : `Val: ${item.mc_value}`}</td><td className="text-end"><button className="btn btn-sm btn-link" onClick={()=>startEdit(item)}>Edit</button><button className="btn btn-sm btn-link text-danger" onClick={()=>handleDeleteItem(item.id)}>Del</button></td></>)}</tr>))}</tbody></table></div></div></div>
        </>
      )}

      {passModal.show && (<div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h5>Change Password</h5><button className="btn-close" onClick={()=>setPassModal({show:false, userId:null, newPassword:''})}></button></div><div className="modal-body"><input className="form-control" type="password" placeholder="Enter New Password" value={passModal.newPassword} onChange={e=>setPassModal({...passModal, newPassword:e.target.value})} autoFocus /></div><div className="modal-footer"><button className="btn btn-primary" onClick={handleChangePassword}>Update Password</button></div></div></div></div>)}
    </div>
  );
}

export default SettingsPage;