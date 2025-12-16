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
    try { const res = await api.getShops(); setShops(res.data); } catch (err) { console.error(err); }
  };

  // --- HANDLERS ---
  const initAdd = () => {
    setForm({ shop_name: '', nick_id: '', person_name: '', mobile: '', address: '' });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const initEdit = (shop, e) => {
    e.stopPropagation(); // Prevent card click (navigation)
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
        alert("Shop Updated");
      } else {
        await api.addShop(form); 
        alert("Shop Added");
      }
      
      setShowModal(false); 
      loadShops(); 
      setForm({ shop_name: '', nick_id: '', person_name: '', mobile: '', address: '' }); 
    } catch (err) { alert("Error saving shop"); }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-shop me-2"></i>Shop Ledger (B2B)</h2>
        <button className="btn btn-primary" onClick={initAdd}><i className="bi bi-plus-lg me-2"></i>Add Shop</button>
      </div>

      <div className="row g-3">
        {shops.map(shop => (
          <div className="col-md-4" key={shop.id}>
            <div className="card shadow-sm h-100 action-hover" onClick={() => navigate(`/shops/${shop.id}`)} style={{cursor:'pointer'}}>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <h5 className="fw-bold mb-0 text-truncate">
                    {shop.shop_name} 
                    {shop.nick_id && <span className="text-muted small ms-2">({shop.nick_id})</span>}
                  </h5>
                  {/* EDIT BUTTON */}
                  <button className="btn btn-sm btn-light text-primary border px-2 py-0" onClick={(e) => initEdit(shop, e)} title="Edit Shop Details">
                    <i className="bi bi-pencil-square"></i>
                  </button>
                </div>
                
                <div className="small text-muted mb-1"><i className="bi bi-person me-1"></i> {shop.person_name || 'N/A'}</div>
                <div className="small text-muted mb-3"><i className="bi bi-telephone me-1"></i> {shop.mobile || 'N/A'}</div>
                
                <div className="bg-light rounded p-2 small">
                  <div className="d-flex justify-content-between"><span>Gold Bal:</span> <strong className={parseFloat(shop.balance_gold) > 0 ? 'text-danger' : 'text-success'}>{shop.balance_gold} g</strong></div>
                  <div className="d-flex justify-content-between"><span>Cash Bal:</span> <strong className={parseFloat(shop.balance_cash) > 0 ? 'text-danger' : 'text-success'}>₹{shop.balance_cash}</strong></div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
                <div className="row g-2 mb-2">
                    <div className="col-8">
                        <label className="small fw-bold text-muted">Shop Name</label>
                        <input className="form-control" placeholder="Shop Name" value={form.shop_name} onChange={e => setForm({...form, shop_name: e.target.value})} />
                    </div>
                    <div className="col-4">
                        <label className="small fw-bold text-muted">Nick ID</label>
                        <input className="form-control" placeholder="e.g. RJ" value={form.nick_id} onChange={e => setForm({...form, nick_id: e.target.value.toUpperCase()})} />
                    </div>
                </div>
                
                <label className="small fw-bold text-muted">Owner Name</label>
                <input className="form-control mb-2" placeholder="Owner/Person Name" value={form.person_name} onChange={e => setForm({...form, person_name: e.target.value})} />
                
                <label className="small fw-bold text-muted">Mobile</label>
                <input className="form-control mb-2" placeholder="Mobile" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
                
                <label className="small fw-bold text-muted">Address</label>
                <textarea className="form-control" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div className="modal-footer"><button className="btn btn-primary" onClick={handleSaveShop}>{isEditing ? 'Update Shop' : 'Save Shop'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ShopManager;