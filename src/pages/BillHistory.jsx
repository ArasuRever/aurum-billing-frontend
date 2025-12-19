import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function BillHistory() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/billing/history');
      setBills(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching history:", err);
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-clock-history me-2"></i>Bill History</h2>
        <button className="btn btn-outline-primary" onClick={fetchBills}>Refresh</button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover table-striped mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="text-end">Amount</th>
                <th className="text-center">Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="fw-bold text-primary">{bill.invoice_number}</td>
                  <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                  <td>{bill.customer_name} <br/> <small className="text-muted">{bill.customer_phone}</small></td>
                  <td className="text-end fw-bold">
                    ₹{parseFloat(bill.final_amount).toLocaleString()}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${bill.payment_status === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {bill.payment_status}
                    </span>
                  </td>
                  <td className="text-center">
                    {/* THIS BUTTON LINKS TO THE NEW RETURN PAGE */}
                    <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => navigate(`/billing/return?saleId=${bill.invoice_number}`)}
                    >
                        <i className="bi bi-arrow-return-left me-1"></i> Return / Exch
                    </button>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && !loading && (
                  <tr><td colSpan="6" className="text-center py-4">No bills found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BillHistory;