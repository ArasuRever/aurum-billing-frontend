import React, { useState, useEffect } from 'react';
import { api } from '../api';

function InventoryManager() {
  const [items, setItems] = useState([]);
  const [filterVendor, setFilterVendor] = useState('');
  const [vendors, setVendors] = useState([]);
  
  // Batch Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
      vendor_id: '',
      metal_type: 'GOLD',
      invoice_no: '',
      items: [] // List of items to add
  });
  // Temp state for single item input in the batch
  const [tempItem, setTempItem] = useState({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, vendRes] = await Promise.all([
        api.getInventory(),
        api.searchVendor('') 
      ]);
      setItems(invRes.data);
      setVendors(vendRes.data);
    } catch (err) { console.error(err); }
  };

  const handleAddItemToBatch = () => {
      if(!tempItem.item_name || !tempItem.gross_weight) return alert("Enter Item Name and Weight");
      setBatchForm({
          ...batchForm,
          items: [...batchForm.items, { ...tempItem, id: Date.now() }]
      });
      setTempItem({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });
  };

  const handleRemoveFromBatch = (id) => {
      setBatchForm({
          ...batchForm,
          items: batchForm.items.filter(i => i.id !== id)
      });
  };

  const submitBatch = async () => {
      if(!batchForm.vendor_id || !batchForm.invoice_no) return alert("Select Vendor and Invoice No");
      if(batchForm.items.length === 0) return alert("Add at least one item");
      
      try {
          await api.addBatchInventory({
              vendor_id: batchForm.vendor_id,
              metal_type: batchForm.metal_type,
              invoice_no: batchForm.invoice_no,
              items: batchForm.items
          });
          alert("Stock Batch Added Successfully!");
          setShowAddModal(false);
          setBatchForm({ vendor_id: '', metal_type: 'GOLD', invoice_no: '', items: [] });
          fetchData();
      } catch(err) { alert(err.message); }
  };

  const filteredItems = filterVendor ? items.filter(i => i.vendor_id === parseInt(filterVendor)) : items;

  const totalGold = filteredItems.filter(i => i.metal_type === 'GOLD').reduce((sum, i) => sum + parseFloat(i.gross_weight), 0).toFixed(3);
  const totalSilver = filteredItems.filter(i => i.metal_type === 'SILVER').reduce((sum, i) => sum + parseFloat(i.gross_weight), 0).toFixed(3);

  return (
    <div className="container-fluid">
      {/* TOP CARDS */}
      <div className="row g-4 mb-4">
        <div className="col-md-3"><div className="card bg-warning text-dark shadow-sm border-0"><div className="card-body"><h6 className="opacity-75">TOTAL GOLD</h6><div className="display-6 fw-bold">{totalGold}g</div></div></div></div>
        <div className="col-md-3"><div className="card bg-secondary text-white shadow-sm border-0"><div className="card-body"><h6 className="opacity-75">TOTAL SILVER</h6><div className="display-6 fw-bold">{totalSilver}g</div></div></div></div>
        
        <div className="col-md-6 d-flex align-items-end justify-content-end gap-2">
           <div>
               <label className="small fw-bold text-muted">Filter Vendor</label>
               <select className="form-select" value={filterVendor} onChange={e => setFilterVendor(e.target.value)}>
                  <option value="">All Vendors</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
               </select>
           </div>
           <button className="btn btn-primary fw-bold" onClick={() => setShowAddModal(true)}>
               <i className="bi bi-plus-lg me-2"></i>Add Stock
           </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3"><h5 className="mb-0 fw-bold text-primary">Available Inventory</h5></div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light"><tr><th>Item</th><th>Barcode</th><th>Metal</th><th>Weight</th><th>Wastage</th><th>Vendor</th></tr></thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td><div className="fw-bold">{item.item_name}</div></td>
                  <td className="small font-monospace text-muted">{item.barcode}</td>
                  <td><span className={`badge ${item.metal_type === 'GOLD' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{item.metal_type}</span></td>
                  <td className="fw-bold">{item.gross_weight}g</td>
                  <td>{item.wastage_percent}%</td>
                  <td className="small text-muted">{vendors.find(v => v.id === item.vendor_id)?.business_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BATCH ADD MODAL */}
      {showAddModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-header bg-primary text-white">
                          <h5 className="modal-title">Add Stock (Batch Entry)</h5>
                          <button className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
                      </div>
                      <div className="modal-body">
                          {/* Header Inputs */}
                          <div className="row g-3 mb-4">
                              <div className="col-md-4">
                                  <label className="small fw-bold">Vendor</label>
                                  <select className="form-select" value={batchForm.vendor_id} onChange={e => setBatchForm({...batchForm, vendor_id: e.target.value})}>
                                      <option value="">Select Vendor</option>
                                      {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                                  </select>
                              </div>
                              <div className="col-md-4">
                                  <label className="small fw-bold">Metal Type</label>
                                  <select className="form-select" value={batchForm.metal_type} onChange={e => setBatchForm({...batchForm, metal_type: e.target.value})}>
                                      <option value="GOLD">GOLD</option><option value="SILVER">SILVER</option>
                                  </select>
                              </div>
                              <div className="col-md-4">
                                  <label className="small fw-bold">Invoice / Ref No</label>
                                  <input className="form-control" value={batchForm.invoice_no} onChange={e => setBatchForm({...batchForm, invoice_no: e.target.value})} />
                              </div>
                          </div>

                          {/* Grid Entry */}
                          <div className="card bg-light border-0 p-3 mb-3">
                              <div className="row g-2 align-items-end">
                                  <div className="col-3"><label className="small">Item Name</label><input className="form-control form-control-sm" value={tempItem.item_name} onChange={e => setTempItem({...tempItem, item_name: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">Weight (g)</label><input type="number" className="form-control form-control-sm" value={tempItem.gross_weight} onChange={e => setTempItem({...tempItem, gross_weight: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">Wastage %</label><input type="number" className="form-control form-control-sm" value={tempItem.wastage_percent} onChange={e => setTempItem({...tempItem, wastage_percent: e.target.value})} /></div>
                                  <div className="col-2"><label className="small">HUID (Opt)</label><input className="form-control form-control-sm" value={tempItem.huid} onChange={e => setTempItem({...tempItem, huid: e.target.value})} /></div>
                                  <div className="col-3"><button className="btn btn-dark btn-sm w-100" onClick={handleAddItemToBatch}>+ Add Row</button></div>
                              </div>
                          </div>

                          {/* Preview Table */}
                          <table className="table table-sm table-bordered">
                              <thead><tr><th>Item</th><th>Wt</th><th>Wastage</th><th>HUID</th><th>Action</th></tr></thead>
                              <tbody>
                                  {batchForm.items.map(item => (
                                      <tr key={item.id}>
                                          <td>{item.item_name}</td><td>{item.gross_weight}</td><td>{item.wastage_percent}</td><td>{item.huid}</td>
                                          <td><button className="btn btn-link text-danger p-0" onClick={() => handleRemoveFromBatch(item.id)}>Remove</button></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      <div className="modal-footer">
                          <button className="btn btn-success fw-bold" onClick={submitBatch}>Save Batch ({batchForm.items.length} Items)</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default InventoryManager;