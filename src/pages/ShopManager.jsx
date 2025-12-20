//
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function ShopManager() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({ shop_name: '', nick_id: '', person_name: '', mobile: '', address: '' });

  useEffect(() => { loadShops(); }, []);

  const loadShops = async () => {
    try { 
      // Added timestamp to prevent browser caching of the list
      const res = await api.getShops(); 
      setShops(res.data); 
    } catch (err) { console.error("Failed to load shops", err); }
  };

  // --- HANDLERS ---
  const initAdd = () => {
    setForm({ shop_name: '', nick_id: '', person_name: '', mobile: '', address: '' });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const initEdit = (shop, e) => {
    e.stopPropagation(); 
    setForm({ 
      shop_name: shop.shop_name, 
      nick_id: shop.nick_id || '', 
      person_name: shop.person_name || '', 
      mobile: shop.mobile || '', 
      address: shop.address || '' 
    });
    setIsEditing(true);
    setEditingId(shop.id);
    setShowModal(true);
  };

  const handleSaveShop = async () => {
    if (!form.shop_name) return alert("Shop Name Required");
    
    try { 
      if (isEditing) {
        await api.updateShop(editingId, form);
      } else {
        await api.addShop(form); 
      }
      
      // 1. Refresh Data FIRST (Awaited to ensure list is updated before modal closes)
      await loadShops(); 
      
      // 2. Close Modal & Reset
      setShowModal(false); 
      setForm({ shop_name: '', nick_id: '', person_name: '', mobile: '', address: '' }); 

    } catch (err) { 
      console.error(err);
      alert("Error saving shop. Please try again."); 
    }
  };

  const handleDeleteShop = async (shop, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${shop.shop_name}"?\nThis cannot be undone.`)) return;
    
    try {
        await api.deleteShop(shop.id);
        alert("Shop deleted successfully");
        await loadShops();
    } catch (err) {
        alert(err.response?.data?.error || "Error deleting shop");
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-shop me-2"></i>Shop Ledger (B2B)</h2>
        <button className="btn btn-primary shadow-sm" onClick={initAdd}>
            <i className="bi bi-plus-lg me-2"></i>Add Shop
        </button>
      </div>

      <div className="row g-3">
        {shops.map(shop => (
          <div className="col-md-4" key={shop.id}>
            <div className="card shadow-sm h-100 action-hover" onClick={() => navigate(`/shops/${shop.id}`)} style={{cursor:'pointer', transition: 'transform 0.1s'}}>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <h5 className="fw-bold mb-0 text-truncate text-dark">
                    {shop.shop_name} 
                    {shop.nick_id && <span className="badge bg-warning text-dark ms-2" style={{fontSize: '0.7rem'}}>{shop.nick_id}</span>}
                  </h5>
                  <div>
                    {/* EDIT BUTTON */}
                    <button className="btn btn-sm btn-outline-secondary border-0 me-1" onClick={(e) => initEdit(shop, e)} title="Edit Details">
                        <i className="bi bi-pencil-square"></i>
                    </button>
                    {/* DELETE BUTTON */}
                    <button className="btn btn-sm btn-outline-danger border-0" onClick={(e) => handleDeleteShop(shop, e)} title="Delete Shop">
                        <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
                
                <div className="small text-muted mb-1"><i className="bi bi-person me-2"></i>{shop.person_name || 'N/A'}</div>
                <div className="small text-muted mb-3"><i className="bi bi-telephone me-2"></i>{shop.mobile || 'N/A'}</div>
                
                <div className="bg-light rounded p-2 small border">
                  <div className="d-flex justify-content-between mb-1">
                      <span>Gold Bal:</span> 
                      <strong className={parseFloat(shop.balance_gold) > 0 ? 'text-danger' : 'text-success'}>
                          {parseFloat(shop.balance_gold).toFixed(3)} g
                      </strong>
                  </div>
                  <div className="d-flex justify-content-between">
                      <span>Cash Bal:</span> 
                      <strong className={parseFloat(shop.balance_cash) > 0 ? 'text-danger' : 'text-success'}>
                          ₹{parseFloat(shop.balance_cash).toLocaleString()}
                      </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {shops.length === 0 && (
            <div className="col-12 text-center p-5 text-muted">
                <i className="bi bi-shop display-1 mb-3 d-block opacity-25"></i>
                No shops found. Add one to get started.
            </div>
        )}
      </div>

      {showModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isEditing ? 'Edit Shop Details' : 'Add New Shop'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-2 mb-3">
                    <div className="col-8">
                        <label className="small fw-bold text-muted">Shop Name *</label>
                        <input className="form-control" placeholder="e.g. Balaji Jewellers" value={form.shop_name} onChange={e => setForm({...form, shop_name: e.target.value})} autoFocus />
                    </div>
                    <div className="col-4">
                        <label className="small fw-bold text-muted">Nick ID</label>
                        <input className="form-control" placeholder="e.g. BJ" value={form.nick_id} onChange={e => setForm({...form, nick_id: e.target.value.toUpperCase()})} />
                    </div>
                </div>
                
                <div className="mb-3">
                    <label className="small fw-bold text-muted">Owner / Contact Person</label>
                    <input className="form-control" placeholder="Name" value={form.person_name} onChange={e => setForm({...form, person_name: e.target.value})} />
                </div>
                
                <div className="mb-3">
                    <label className="small fw-bold text-muted">Mobile Number</label>
                    <input className="form-control" placeholder="10-digit mobile" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
                </div>
                
                <div className="mb-3">
                    <label className="small fw-bold text-muted">Address</label>
                    <textarea className="form-control" placeholder="City / Area" rows="2" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer bg-light">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary fw-bold px-4" onClick={handleSaveShop}>
                      {isEditing ? 'Update Shop' : 'Save Shop'}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ShopManager;