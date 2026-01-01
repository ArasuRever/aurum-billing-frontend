import React from 'react';

const OldMetalReceipt = React.forwardRef(({ data }, ref) => {
  if (!data) return null;
  const { customer, items, totals, voucherNo } = data;

  return (
    <div ref={ref} className="bg-white p-4" style={{ width: '100%', maxWidth: '148mm', minHeight: '210mm', border: '1px dashed #ccc' }}>
        <h4 className="text-center fw-bold border-bottom pb-2 border-dark">PURCHASE VOUCHER</h4>
        
        <div className="d-flex justify-content-between mt-3 mb-2 small">
            <div>
                <strong>Voucher #:</strong> <span className="text-danger font-monospace">{voucherNo}</span><br/>
                <strong>Date:</strong> {new Date().toLocaleDateString()}
            </div>
            <div className="text-end">
                <strong>Vendor / Customer:</strong><br/>
                {customer.customer_name}<br/> 
                {customer.mobile}
            </div>
        </div>

        <table className="table table-bordered border-dark table-sm small mt-3">
            <thead className="table-secondary">
                <tr><th>Item Description</th><th>Gross</th><th>Less</th><th>Net Wt</th><th>Rate</th><th className="text-end">Amount</th></tr>
            </thead>
            <tbody>
                {items.map((item, i) => (
                    <tr key={i}>
                        <td>{item.item_name} <span className="badge bg-light text-dark border p-0 px-1">{item.metal_type}</span></td>
                        <td>{parseFloat(item.gross_weight).toFixed(3)}</td>
                        <td>{parseFloat(item.less_weight).toFixed(3)}</td>
                        <td className="fw-bold">{parseFloat(item.net_weight).toFixed(3)}</td>
                        <td>{item.rate}</td>
                        <td className="text-end fw-bold">{parseFloat(item.amount).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan="5" className="text-end fw-bold">Total Amount:</td>
                    <td className="text-end fw-bold">₹{totals.totalAmount.toLocaleString()}</td>
                </tr>
                {totals.gstAmount > 0 && (
                    <tr>
                        <td colSpan="5" className="text-end">GST Deducted:</td>
                        <td className="text-end text-danger">- {totals.gstAmount.toLocaleString()}</td>
                    </tr>
                )}
                <tr className="bg-light">
                    <td colSpan="5" className="text-end fw-bold fs-5">NET PAYOUT:</td>
                    <td className="text-end fw-bold fs-5 text-success">₹{totals.netPayout.toLocaleString()}</td>
                </tr>
            </tfoot>
        </table>

        <div className="mt-5 pt-3 border-top border-dark d-flex justify-content-between">
             <div className="text-center w-25">
                 <small>(Customer Sig)</small>
             </div>
             <div className="text-center w-25">
                 <small>(Cashier)</small>
             </div>
        </div>
    </div>
  );
});

export default OldMetalReceipt;