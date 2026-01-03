import React from 'react';

const OldMetalReceipt = React.forwardRef(({ data, businessProfile }, ref) => {
  if (!data) return null;
  const { customer, items, totals, voucherNo } = data;
  
  const config = (businessProfile && businessProfile.invoice_config) ? businessProfile.invoice_config : {};
  const accentColor = config.accent_color || '#d4af37';
  const title = config.purchase_title || 'PURCHASE VOUCHER';
  const footerLeft = config.purchase_footer_left || '(Customer Sig)';
  const footerRight = config.purchase_footer_right || '(Cashier)';

  return (
    <div ref={ref} className="bg-white p-4 mx-auto" 
         style={{ 
             width: '100%', 
             maxWidth: '148mm', 
             minHeight: '210mm', 
             fontFamily: "'Segoe UI', sans-serif",
             color: '#333',
             border: '1px solid #f0f0f0' 
         }}>
        
        {/* HEADER */}
        <div className="text-center mb-4">
            <h4 className="fw-bold text-uppercase mb-1" style={{color: accentColor, letterSpacing: '1px'}}>{title}</h4>
            <div className="text-muted small">Date: {new Date().toLocaleDateString()}</div>
        </div>
        
        <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded" style={{backgroundColor: '#fafafa'}}>
            <div>
                <div className="small text-uppercase text-muted fw-bold">Voucher #</div>
                <div className="fw-bold fs-5 text-dark">{voucherNo}</div>
            </div>
            <div className="text-end">
                <div className="small text-uppercase text-muted fw-bold">Vendor / Customer</div>
                <div className="fw-bold">{customer.customer_name}</div>
                <div className="small text-secondary">{customer.mobile}</div>
            </div>
        </div>

        {/* ITEMS */}
        <div className="mb-4">
            <table className="table table-borderless table-sm small align-middle">
                <thead style={{borderBottom: '1px solid #eee'}}>
                    <tr className="text-uppercase text-muted">
                        <th className="py-2 ps-0">Item</th>
                        <th className="py-2 text-center">Gross</th>
                        <th className="py-2 text-center">Less</th>
                        <th className="py-2 text-center">Net</th>
                        <th className="py-2 text-center">Rate</th>
                        <th className="py-2 pe-0 text-end">Amt</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, i) => (
                        <tr key={i} style={{borderBottom: '1px solid #fafafa'}}>
                            <td className="py-2 ps-0 fw-bold">{item.item_name} <span className="text-muted fw-normal">({item.metal_type})</span></td>
                            <td className="py-2 text-center">{parseFloat(item.gross_weight).toFixed(3)}</td>
                            <td className="py-2 text-center text-muted">{parseFloat(item.less_weight).toFixed(3)}</td>
                            <td className="py-2 text-center fw-bold text-dark">{parseFloat(item.net_weight).toFixed(3)}</td>
                            <td className="py-2 text-center">{item.rate}</td>
                            <td className="py-2 pe-0 text-end fw-bold">₹{parseFloat(item.amount).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* TOTALS */}
        <div className="border-top pt-3">
            <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Total Amount</span>
                <span className="fw-bold">₹{totals.totalAmount.toLocaleString()}</span>
            </div>
            {totals.gstAmount > 0 && (
                <div className="d-flex justify-content-between mb-1 small">
                    <span className="text-muted">GST Deducted</span>
                    <span className="text-danger">- ₹{totals.gstAmount.toLocaleString()}</span>
                </div>
            )}
            <div className="d-flex justify-content-between align-items-center mt-3 p-3 rounded" style={{backgroundColor: '#f8f9fa'}}>
                <span className="fw-bold text-uppercase" style={{color: accentColor}}>Net Payout</span>
                <span className="fs-4 fw-bold text-success">₹{totals.netPayout.toLocaleString()}</span>
            </div>
        </div>

        {/* FOOTER */}
        <div className="mt-5 pt-5 d-flex justify-content-between align-items-end">
             <div className="text-center">
                 <div className="border-bottom mb-2" style={{width: '100px'}}></div>
                 <small className="text-muted">{footerLeft}</small>
             </div>
             <div className="text-center">
                 <div className="border-bottom mb-2" style={{width: '100px'}}></div>
                 <small className="text-muted">{footerRight}</small>
             </div>
        </div>
    </div>
  );
});

export default OldMetalReceipt;