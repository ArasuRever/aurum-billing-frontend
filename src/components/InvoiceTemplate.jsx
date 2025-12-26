import React from 'react';

const InvoiceTemplate = ({ data, businessProfile }) => {
  if (!data) return null;
  const { customer, items, totals, invoice_id, date, includeGST, exchangeItems } = data;

  // Defaults if no profile set
  const bizName = businessProfile?.business_name || 'SRI KUBERALAKSHMI BANKERS';
  const bizAddr = businessProfile?.address || '123, Gold Market Street, Salem - 636001';
  const bizPhone = businessProfile?.contact_number || '9876543210';
  const displayPref = businessProfile?.display_preference || 'BOTH'; 
  const logoUrl = businessProfile?.logo;

  return (
    <div id="printable-invoice" className="bg-white p-4 mx-auto" style={{maxWidth: '800px', width: '100%', minHeight: '100%'}}>
       
       {/* DYNAMIC HEADER */}
       <div className="text-center mb-4 border-bottom pb-3">
          {/* Logo */}
          {(displayPref === 'LOGO' || displayPref === 'BOTH') && logoUrl && (
              <img src={logoUrl} alt="Logo" style={{maxHeight: '80px', maxWidth: '100%', marginBottom: '10px'}} />
          )}
          
          {/* Name & Details */}
          {(displayPref === 'NAME' || displayPref === 'BOTH') && (
              <>
                <h3 className="fw-bold m-0 text-uppercase">{bizName}</h3>
                <div className="small" style={{whiteSpace: 'pre-line'}}>{bizAddr}</div>
                <div className="small fw-bold mt-1">
                    Phone: {bizPhone} 
                    {businessProfile?.license_number && <span> | Lic: {businessProfile.license_number}</span>}
                    {businessProfile?.email && <span> | {businessProfile.email}</span>}
                </div>
              </>
          )}
       </div>
       
       <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
          <div className="small">
             <strong>Billed To:</strong><br/>
             {customer.name} (ID: {customer.id})<br/>
             {customer.phone}<br/>
             {customer.address}
          </div>
          <div className="text-end small">
             <strong>Invoice #:</strong> {invoice_id}<br/>
             <strong>Date:</strong> {date}
          </div>
       </div>

       <table className="table table-bordered table-sm small mb-3">
          <thead className="table-light"><tr><th>Item</th><th className="text-center">Gross Wt</th><th className="text-center">Rate</th><th className="text-center">MC</th><th className="text-end">Total</th></tr></thead>
          <tbody>
             {items.map((item, i) => (
                <tr key={i}>
                   <td>{item.item_name} {item.item_id && <span className="d-block text-muted" style={{fontSize: '0.7em'}}>Ref: {item.item_id}</span>}</td>
                   <td className="text-center">{item.gross_weight} g</td>
                   <td className="text-center">{item.rate}</td>
                   <td className="text-center">{item.making_charges}</td>
                   <td className="text-end">{item.total.toLocaleString()}</td>
                </tr>
             ))}
          </tbody>
       </table>

       {exchangeItems && exchangeItems.length > 0 && (
         <div className="mb-3">
             <div className="small fw-bold border-bottom mb-1">Exchange / Returns</div>
             <table className="table table-sm small mb-0">
                 <tbody>
                    {exchangeItems.map((ex, i) => (
                        <tr key={i}>
                            <td>{ex.name}</td>
                            <td className="text-center">{ex.net_weight} g</td>
                            <td className="text-center">{ex.rate}</td>
                            <td className="text-end text-success">- {ex.total.toLocaleString()}</td>
                        </tr>
                    ))}
                 </tbody>
             </table>
         </div>
       )}

       <div className="row justify-content-end">
          <div className="col-6">
             <table className="table table-sm table-borderless small">
                <tbody>
                   <tr><td className="text-end">Gross Total:</td><td className="text-end fw-bold">{totals.grossTotal.toLocaleString()}</td></tr>
                   <tr><td className="text-end text-danger">Discount:</td><td className="text-end text-danger">- {totals.totalDiscount.toLocaleString()}</td></tr>
                   {includeGST && (
                     <>
                      <tr><td className="text-end">SGST (1.5%):</td><td className="text-end">{totals.sgst.toFixed(2)}</td></tr>
                      <tr><td className="text-end">CGST (1.5%):</td><td className="text-end">{totals.cgst.toFixed(2)}</td></tr>
                     </>
                   )}
                   {totals.exchangeTotal > 0 && (
                       <tr><td className="text-end text-success">Less Exchange:</td><td className="text-end text-success">- {totals.exchangeTotal.toLocaleString()}</td></tr>
                   )}
                   <tr className="border-top"><td className="text-end fs-5 fw-bold">Net Payable:</td><td className="text-end fs-5 fw-bold">₹{totals.netPayable.toLocaleString()}</td></tr>
                   
                   {/* PAYMENT DETAILS */}
                   <tr><td className="text-end pt-2">Paid Amount:</td><td className="text-end pt-2 fw-bold">₹{totals.paidAmount.toLocaleString()}</td></tr>
                   {totals.balance > 0 && (
                       <tr className="bg-light"><td className="text-end text-danger fw-bold">Balance Pending:</td><td className="text-end text-danger fw-bold">₹{totals.balance.toLocaleString()}</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       <div className="text-center mt-5 small text-muted">
          <p>Thank you for your purchase!</p>
          <div className="border-top w-50 mx-auto pt-2 mt-4">Authorized Signature</div>
       </div>
    </div>
  );
};

export default InvoiceTemplate;