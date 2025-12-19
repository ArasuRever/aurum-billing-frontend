import React, { useState, useEffect } from 'react';
import axios from 'axios';

function InventoryManager() {
  const [items, setItems] = useState([]);
  const [filterVendor, setFilterVendor] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Using direct axios for consistency with the new changes
      const [invRes, vendRes] = await Promise.all([
        axios.get('http://localhost:5000/api/inventory'),
        axios.get('http://localhost:5000/api/vendors') 
      ]);
      setItems(invRes.data);
      setVendors(vendRes.data);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  // Helper to safely get Vendor Name or display "In-House"
  const getVendorDisplay = (item) => {
    if (item.source_type === 'RETURN') return <span className="badge bg-warning text-dark">Returned (In-House)</span>;
    if (item.source_type === 'NEIGHBOUR') return <span className="badge bg-info text-dark">Neighbour Borrow</span>;
    
    const vendor = vendors.find(v => v.id === item.vendor_id);
    return vendor ? vendor.name : <span className="badge bg-secondary">Old Stock / In-House</span>;
  };

  const filteredItems = filterVendor 
    ? items.filter(i => i.vendor_id === parseInt(filterVendor)) 
    : items;

  // Totals Calculation
  const totalGold = filteredItems
    .filter(i => !i.metal_type || i.metal_type === 'GOLD')
    .reduce((sum, i) => sum + parseFloat(i.gross_weight || 0), 0)
    .toFixed(3);

  const totalSilver = filteredItems
    .filter(i => i.metal_type === 'SILVER')
    .reduce((sum, i) => sum + parseFloat(i.gross_weight || 0), 0)
    .toFixed(3);

  return (
    <div className="container-fluid mt-4">
      {/* 1. TOP CARDS */}
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
              <option value="">Show All Inventory</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
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
                <th>Barcode</th>
                <th>Item Name</th>
                <th>Metal</th>
                <th>Weight</th>
                <th>Source / Vendor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td className="small font-monospace text-muted fw-bold">{item.barcode}</td>
                  <td>
                      <span className="fw-bold">{item.item_name}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.metal_type === 'SILVER' ? 'bg-secondary' : 'bg-warning text-dark'}`}>
                      {item.metal_type || 'GOLD'}
                    </span>
                  </td>
                  <td className="fw-bold">{item.gross_weight}g</td>
                  <td>{getVendorDisplay(item)}</td>
                  <td>
                      <span className={`badge ${item.status === 'AVAILABLE' ? 'bg-success' : 'bg-danger'}`}>
                        {item.status}
                      </span>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && !loading && (
                <tr><td colSpan="6" className="text-center py-5 text-muted">No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InventoryManager;