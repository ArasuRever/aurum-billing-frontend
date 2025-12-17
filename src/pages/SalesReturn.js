import React, { useState } from 'react';
import { api } from '../api';

function SalesReturn() {
  const [invoiceId, setInvoiceId] = useState('');
  const [billData, setBillData] = useState(null);

  const fetchInvoice = async () => {
    if (!invoiceId) return alert("Enter Invoice Number");
    try {
        const res = await api.getInvoiceDetails(invoiceId);
        setBillData(res.data);
    } catch (err) { alert("Invoice not found"); setBillData(null); }
  };

  const handleReturn = async (item) => {
    if (!window.confirm(`Return "${item.item_name}"? This will add it back to inventory.`)) return;
    try {
        await api.returnItem({ sale_item_id: item.id, item_id: item.item_id });
        alert("Success! Item is back in stock. Please refund cash or create new bill.");
        fetchInvoice(); // Refresh list
    } catch (err) { alert("Error processing return"); }
  };

  return (
    <div className="container-fluid">
      <h2 className="fw-bold text-danger mb-4"><i className="bi bi-arrow-counterclockwise me-2"></i>Sales Return / Exchange</h2>
      
      {/* SEARCH BOX */}
      <div className="card shadow-sm mb-4">
        <div className="card-body d-flex gap-3">
            <input className="form-control" placeholder="Enter Invoice Number (e.g. INV-173...)" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} />
            <button className="btn btn-primary px-4" onClick={fetchInvoice}>Find Bill</button>
        </div>
      </div>

      {/* RESULT LIST */}
      {billData && (
        <div className="card shadow-sm">
            <div className="card-header bg-light">
                <strong>Customer:</strong> {billData.sale.customer_name} | <strong>Phone:</strong> {billData.sale.customer_phone}
            </div>
            <table className="table table-hover align-middle mb-0">
                <thead><tr><th>Item</th><th>Weight</th><th>Sold Rate</th><th>Total</th><th>Action</th></tr></thead>
                <tbody>
                    {billData.items.map(item => (
                        <tr key={item.id} className={item.item_name.includes('(RETURNED)') ? 'table-secondary text-muted' : ''}>
                            <td>{item.item_name}</td>
                            <td>{item.sold_weight} g</td>
                            <td>{item.sold_rate}</td>
                            <td>{item.total_item_price}</td>
                            <td>
                                {item.item_name.includes('(RETURNED)') ? (
                                    <span className="badge bg-secondary">RETURNED</span>
                                ) : (
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleReturn(item)}>
                                        <i className="bi bi-arrow-return-left me-1"></i> Return Item
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}

export default SalesReturn;