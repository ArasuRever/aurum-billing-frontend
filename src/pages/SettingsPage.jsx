import React, { useEffect, useState } from 'react';
import { api } from '../api';

function SettingsPage() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('GOLD'); 
  
  // RATES STATE
  const [rates, setRates] = useState({ GOLD: '', SILVER: '' });
  const [loadingRates, setLoadingRates] = useState(false);

  // MASTER ITEM STATE
  const [newItem, setNewItem] = useState({
    item_name: '',
    calc_method: 'STANDARD', // STANDARD, RATE_ADD_ON, FIXED_PRICE
    default_wastage: '',
    mc_type: 'PER_GRAM', 
    mc_value: ''
  });

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

  const handleAdd = async () => {
    if (!newItem.item_name) return alert("Item Name is required");
    try {
      await api.addMasterItem({ ...newItem, metal_type: activeTab });
      alert("Item Added!");
      // Reset form
      setNewItem({ item_name: '', calc_method: 'STANDARD', default_wastage: '', mc_type: 'PER_GRAM', mc_value: '' });
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.error || "Error adding item");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this setting?")) return;
    try { await api.deleteMasterItem(id); fetchItems(); } catch(err) { alert("Error deleting"); }
  };

  const filteredItems = items.filter(i => i.metal_type === activeTab);

  return (
    <div className="container-fluid mt-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-sliders me-2"></i>Billing Configuration</h2>
      </div>

      {/* --- 1. DAILY RATES CARD --- */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
          <div className="card-header bg-transparent border-0 fw-bold text-uppercase text-secondary">
              <i className="bi bi-cash-coin me-2"></i>Daily Market Rates
          </div>
          <div className="card-body">
              <div className="row g-4">
                  <div className="col-md-6">
                      <div className="input-group">
                          <span className="input-group-text bg-warning text-dark fw-bold border-warning">GOLD (22k)</span>
                          <input type="number" className="form-control fw-bold fs-5" value={rates.GOLD} onChange={e => setRates({...rates, GOLD: e.target.value})} />
                          <button className="btn btn-dark" onClick={() => handleRateUpdate('GOLD')} disabled={loadingRates}>UPDATE</button>
                      </div>
                  </div>
                  <div className="col-md-6">
                      <div className="input-group">
                          <span className="input-group-text bg-secondary text-white fw-bold border-secondary">SILVER</span>
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
            {/* ADD ITEM FORM */}
            <div className="bg-light p-3 rounded border mb-4">
                <h6 className="fw-bold mb-3 text-primary">Add New Item Rule</h6>
                <div className="row g-3 align-items-end">
                    
                    {/* Item Name */}
                    <div className="col-md-3">
                        <label className="form-label small fw-bold text-muted">Item Name</label>
                        <input className="form-control" placeholder="e.g. Anklet, 92 Ring" 
                            value={newItem.item_name} onChange={e => setNewItem({...newItem, item_name: e.target.value})} />
                    </div>

                    {/* Calculation Method */}
                    <div className="col-md-3">
                        <label className="form-label small fw-bold text-muted">Billing Logic</label>
                        <select className="form-select" value={newItem.calc_method} onChange={e => setNewItem({...newItem, calc_method: e.target.value})}>
                            <option value="STANDARD">Standard (Wt + VA%) * Rate</option>
                            <option value="RATE_ADD_ON">Rate Add-On (Rate + ₹X)</option>
                            <option value="FIXED_PRICE">Fixed Price (₹X per gram)</option>
                        </select>
                    </div>

                    {/* DYNAMIC FIELDS BASED ON METHOD */}
                    
                    {/* SCENARIO 1: STANDARD (Wastage + MC) */}
                    {newItem.calc_method === 'STANDARD' && (
                        <>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold text-muted">Wastage %</label>
                                <input type="number" className="form-control" placeholder="0" 
                                    value={newItem.default_wastage} onChange={e => setNewItem({...newItem, default_wastage: e.target.value})} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold text-muted">Making Charges</label>
                                <div className="input-group">
                                    <select className="form-select" style={{maxWidth:'80px'}} value={newItem.mc_type} onChange={e => setNewItem({...newItem, mc_type: e.target.value})}>
                                        <option value="PER_GRAM">/g</option>
                                        <option value="FIXED">Flat</option>
                                    </select>
                                    <input type="number" className="form-control" placeholder="0" 
                                        value={newItem.mc_value} onChange={e => setNewItem({...newItem, mc_value: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* SCENARIO 2: RATE ADD ON (e.g. Silver 92) */}
                    {newItem.calc_method === 'RATE_ADD_ON' && (
                        <div className="col-md-4">
                            <label className="form-label small fw-bold text-muted">Extra Amount per Gram</label>
                            <div className="input-group">
                                <span className="input-group-text">Daily Rate + ₹</span>
                                <input type="number" className="form-control" placeholder="e.g. 10" 
                                    value={newItem.mc_value} onChange={e => setNewItem({...newItem, mc_value: e.target.value})} />
                            </div>
                            <small className="text-muted d-block mt-1">Ex: Rate {rates.SILVER || 90} + {newItem.mc_value || 0} = ₹{(parseFloat(rates.SILVER||0) + parseFloat(newItem.mc_value||0))} /g</small>
                        </div>
                    )}

                    {/* SCENARIO 3: FIXED PRICE (e.g. Sterling Ring) */}
                    {newItem.calc_method === 'FIXED_PRICE' && (
                        <div className="col-md-4">
                            <label className="form-label small fw-bold text-muted">Fixed Selling Price</label>
                            <div className="input-group">
                                <span className="input-group-text">₹</span>
                                <input type="number" className="form-control" placeholder="e.g. 150" 
                                    value={newItem.mc_value} onChange={e => setNewItem({...newItem, mc_value: e.target.value})} />
                                <span className="input-group-text">per gram</span>
                            </div>
                        </div>
                    )}

                    <div className="col-md-2">
                        <button className="btn btn-primary w-100 fw-bold" onClick={handleAdd}>SAVE RULE</button>
                    </div>
                </div>
            </div>

            {/* MASTER ITEMS LIST */}
            <div className="table-responsive">
                <table className="table table-hover align-middle border">
                    <thead className="table-light">
                        <tr>
                            <th>Item Name</th>
                            <th>Logic</th>
                            <th>Details</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
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
                                        <span>
                                            Wastage: <strong>{item.default_wastage}%</strong>, 
                                            MC: <strong>₹{item.mc_value}</strong> ({item.mc_type === 'PER_GRAM' ? '/g' : 'Flat'})
                                        </span>
                                    )}
                                    {item.calc_method === 'RATE_ADD_ON' && (
                                        <span>
                                            Price = Daily Rate + <strong>₹{item.mc_value}/g</strong>
                                        </span>
                                    )}
                                    {item.calc_method === 'FIXED_PRICE' && (
                                        <span>
                                            Fixed Selling Rate: <strong>₹{item.mc_value}/g</strong>
                                        </span>
                                    )}
                                </td>

                                <td className="text-end">
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}><i className="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        ))}
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