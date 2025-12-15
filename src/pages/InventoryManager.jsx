import React, { useState, useEffect } from 'react';
import { api } from '../api';

function InventoryManager() {
  const [items, setItems] = useState([]);
  const [filterVendor, setFilterVendor] = useState('');
  const [vendors, setVendors] = useState([]);

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, vendRes] = await Promise.all([
        api.getInventory(),
        api.searchVendor('') // Fetch all vendors for filter
      ]);
      setItems(invRes.data);
      setVendors(vendRes.data);
    } catch (err) { console.error(err); }
  };

  // Calculations
  const filteredItems = filterVendor 
    ? items.filter(i => i.vendor_id === parseInt(filterVendor)) 
    : items;

  const totalGold = filteredItems
    .filter(i => i.metal_type === 'GOLD')
    .reduce((sum, i) => sum + parseFloat(i.gross_weight), 0)
    .toFixed(3);

  const totalSilver = filteredItems
    .filter(i => i.metal_type === 'SILVER')
    .reduce((sum, i) => sum + parseFloat(i.gross_weight), 0)
    .toFixed(3);

  return (
    <div className="container-fluid">
      {/* 1. TOP CARDS: TOTALS */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card bg-warning text-dark shadow-sm border-0">
            <div className="card-body">
              <h6 className="text-uppercase fw-bold opacity-75">Total Gold Stock</h6>
              <div className="display-6 fw-bold">{totalGold} <small className="fs-5">g</small></div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card bg-secondary text-white shadow-sm border-0">
            <div className="card-body">
              <h6 className="text-uppercase fw-bold opacity-75">Total Silver Stock</h6>
              <div className="display-6 fw-bold">{totalSilver} <small className="fs-5">g</small></div>
            </div>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="col-md-12 col-xl-6 d-flex align-items-end justify-content-end">
          <div className="w-50">
            <label className="form-label small fw-bold text-muted">Filter by Vendor</label>
            <select className="form-select" value={filterVendor} onChange={e => setFilterVendor(e.target.value)}>
              <option value="">Show All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.business_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. TABLE VIEW */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-bold text-primary"><i className="bi bi-box-seam me-2"></i>Available Inventory</h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Item</th>
                <th>Barcode</th>
                <th>Metal</th>
                <th>Weight</th>
                <th>Wastage</th>
                <th>MC</th>
                <th>Vendor</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      {item.item_image && (
                         <img src={item.item_image} className="rounded me-2" style={{width:'30px', height:'30px', objectFit:'cover'}} />
                      )}
                      <span className="fw-bold">{item.item_name}</span>
                    </div>
                  </td>
                  <td className="small font-monospace text-muted">{item.barcode}</td>
                  <td>
                    <span className={`badge ${item.metal_type === 'GOLD' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {item.metal_type}
                    </span>
                  </td>
                  <td className="fw-bold">{item.gross_weight}g</td>
                  <td>{item.wastage_percent}%</td>
                  <td>₹{item.making_charges}</td>
                  <td className="small text-muted">
                    {/* Find vendor name from the list safely */}
                    {vendors.find(v => v.id === item.vendor_id)?.business_name || '-'}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan="7" className="text-center py-5 text-muted">No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InventoryManager;