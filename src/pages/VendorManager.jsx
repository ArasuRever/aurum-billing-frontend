import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import Navigate
import { api } from '../api';

function VendorManager() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // (Include your existing Add Vendor/Agent Forms state here if you want to keep them on this page, 
  //  OR move them to a modal. For brevity, I'll show the List logic).

  useEffect(() => {
    fetchVendors(searchTerm);
  }, [searchTerm]);

  const fetchVendors = async (q = '') => {
    try {
      const res = await api.searchVendor(q);
      setVendors(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary"><i className="bi bi-people-fill me-2"></i>Vendors</h2>
        {/* You can keep Add Vendor Buttons here */}
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-3">
          <input 
            type="text" className="form-control" placeholder="Search Vendors..." 
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Business Name</th>
                <th>Contact</th>
                <th>Balance (Pure)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} style={{cursor: 'pointer'}} onClick={() => navigate(`/vendors/${vendor.id}`)}>
                  <td className="fw-bold text-primary">{vendor.business_name}</td>
                  <td>{vendor.contact_number}</td>
                  <td className={`fw-bold ${parseFloat(vendor.balance_pure_weight) > 0 ? 'text-danger' : 'text-success'}`}>
                    {vendor.balance_pure_weight} g
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary">
                      View Details <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default VendorManager;