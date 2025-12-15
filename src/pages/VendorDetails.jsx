import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [vendor, setVendor] = useState(null);
  const [items, setItems] = useState([]); // All Items (Sold + Available)
  const [stockRows, setStockRows] = useState([]); // For Adding Stock
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'add_stock'

  // Load Data
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // We need to fetch vendor details. 
      // Since we don't have a direct getVendorById, we use search with exact name or assume the list has it.
      // Better: Create getVendorById in backend, OR just search list.
      // Hack for now: Fetch all vendors and find (since list is small) or search by name if we had it.
      // ideally: api.getVendor(id).
      // Let's use the search endpoint with ID if backend supports, or just list.
      // Assuming you added `getVendor` to backend or we just filter from list:
      const allVendors = await api.searchVendor(''); 
      const v = allVendors.data.find(v => v.id === parseInt(id));
      setVendor(v);

      const itemRes = await api.getVendorInventory(id);
      setItems(itemRes.data);

    } catch (err) { console.error(err); }
  };

  // Calculations
  const totalAdded = items.length;
  const totalSold = items.filter(i => i.status === 'SOLD').length;
  const soldWeight = items.filter(i => i.status === 'SOLD').reduce((sum, i) => sum + parseFloat(i.gross_weight), 0).toFixed(3);
  
  // Stock Entry Logic (Same as before)
  const handleAddRow = () => setStockRows([...stockRows, { metal_type: 'GOLD', stock_type: 'SINGLE', item_name: '', gross_weight: '', wastage_percent: '0', making_charges: '0', item_image: null }]);
  
  const handleSubmitStock = async () => {
    try {
      for (const row of stockRows) {
        if(!row.item_name) continue;
        const formData = new FormData();
        formData.append('vendor_id', id);
        // ... append other fields ...
        Object.keys(row).forEach(k => formData.append(k, row[k]));
        await api.addInventory(formData);
      }
      
      // Update Ledger (Simplified)
      const totalWeight = stockRows.reduce((sum, r) => sum + (parseFloat(r.gross_weight)||0), 0);
      await api.vendorTransaction({
        vendor_id: id, type: 'STOCK_ADDED', description: 'Bulk Stock Add',
        metal_weight: totalWeight, cash_amount: 0, conversion_rate: 0
      });
      
      alert('Stock Added');
      setViewMode('overview');
      loadData();
    } catch(err) { alert('Error'); }
  };

  if (!vendor) return <div className="p-5 text-center">Loading...</div>;

  return (
    <div>
      {/* HEADER */}
      <div className="mb-4">
        <button className="btn btn-link text-decoration-none p-0 mb-2" onClick={() => navigate('/')}>
          <i className="bi bi-arrow-left"></i> Back to Vendors
        </button>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="fw-bold mb-0">{vendor.business_name}</h2>
            <div className="text-muted">{vendor.address} | {vendor.contact_number}</div>
          </div>
          <div className="text-end">
            <div className="small text-muted text-uppercase fw-bold">Current Balance Owed</div>
            <div className="display-6 fw-bold text-danger">{vendor.balance_pure_weight} <span className="fs-4">g</span></div>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card bg-white shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small fw-bold">TOTAL ITEMS ADDED</div>
              <div className="fs-3 fw-bold">{totalAdded}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-white shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small fw-bold">ITEMS SOLD</div>
              <div className="fs-3 fw-bold text-success">{totalSold}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-white shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small fw-bold">SOLD WEIGHT (Gross)</div>
              <div className="fs-3 fw-bold text-primary">{soldWeight} g</div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS / ACTIONS */}
      <div className="d-flex mb-3 gap-2">
        <button className={`btn ${viewMode === 'overview' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setViewMode('overview')}>
          Item History
        </button>
        <button className={`btn ${viewMode === 'add_stock' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => {
           setStockRows([{ metal_type: 'GOLD', stock_type: 'SINGLE', item_name: '', gross_weight: '', wastage_percent: '0', making_charges: '0', item_image: null }]);
           setViewMode('add_stock');
        }}>
          + Add New Stock
        </button>
      </div>

      {/* VIEW: OVERVIEW (Item List) */}
      {viewMode === 'overview' && (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Weight</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={item.status === 'SOLD' ? 'table-light text-muted' : ''}>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="fw-bold">{item.item_name}</div>
                      <div className="small font-monospace">{item.barcode}</div>
                    </td>
                    <td>{item.gross_weight}g</td>
                    <td>
                      <span className={`badge ${item.status === 'SOLD' ? 'bg-secondary' : 'bg-success'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: ADD STOCK (Reuse your grid form here) */}
      {viewMode === 'add_stock' && (
        <div className="card shadow-sm p-3">
           {/* ... Paste your Stock Grid Table code here ... */}
           <div className="alert alert-info">
             Use the form below to add items. They will be linked to <strong>{vendor.business_name}</strong>.
           </div>
           {/* Simplified for brevity: Render your inputs here mapped to stockRows */}
           <button className="btn btn-success" onClick={handleSubmitStock}>Confirm & Add Stock</button>
        </div>
      )}

    </div>
  );
}

export default VendorDetails;