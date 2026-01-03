import React from 'react';

const InvoiceTemplate = ({ data, businessProfile }) => {
  if (!data) return null;
  const { 
    customer, items, totals, invoice_id, date, 
    includeGST, exchangeItems, type 
  } = data;

  const biz = businessProfile || {};
  const config = biz.invoice_config || {};
  
  // Use Defaults
  const accentColor = config.accent_color || '#d4af37';
  const showWatermark = config.show_watermark !== false; 
  const watermarkText = config.watermark_text || 'AURUM';
  const title = type || config.sales_title || 'TAX INVOICE';
  const terms = config.sales_terms || '1. Goods once sold will not be taken back.\n2. Subject to Salem Jurisdiction.\n3. E. & O.E.';
  const footerLeft = config.sales_footer_left || "Customer's Signature";
  const footerRight = config.sales_footer_right || "Authorized Signatory";
  const showHSN = config.show_hsn !== false; 

  return (
    <div id="printable-invoice" className="bg-white p-5 mx-auto position-relative" 
         style={{
             maxWidth: '210mm', 
             minHeight: '297mm', 
             fontSize: '14px', 
             fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
             color: '#333'
         }}>
       
       {/* WATERMARK */}
       {showWatermark && (
           <div className="position-absolute top-50 start-50 translate-middle text-muted opacity-10" 
                style={{
                    fontSize: '8rem', 
                    zIndex: 0, 
                    transform: 'translate(-50%, -50%) rotate(-45deg)', 
                    pointerEvents: 'none', 
                    whiteSpace:'nowrap',
                    fontWeight: '900',
                    letterSpacing: '10px'
                }}>
               {watermarkText}
           </div>
       )}

       {/* HEADER SECTION */}
       <div className="d-flex justify-content-between align-items-start mb-5 position-relative" style={{zIndex: 1}}>
           <div>
               {biz.logo && <img src={biz.logo} alt="Logo" className="mb-3" style={{maxHeight: '80px', objectFit: 'contain'}} />}
               <h2 className="fw-bold text-uppercase m-0" style={{color: accentColor, letterSpacing: '1px'}}>{biz.business_name || 'AURUM JEWELLERY'}</h2>
               <div className="text-secondary mt-2 small" style={{maxWidth: '300px', lineHeight: '1.5'}}>
                   {biz.address || 'Gold Market, Salem'}<br/>
                   <span className="fw-bold text-dark">Mobile:</span> {biz.contact_number} {biz.email && <span>| <span className="fw-bold text-dark">E-Mail:</span> {biz.email}</span>}
                   {biz.gstin && <div className="mt-1"><span className="badge bg-light text-dark border">GSTIN: {biz.gstin}</span></div>}
               </div>
           </div>
           <div className="text-end">
               <div className="display-6 fw-light text-uppercase mb-2" style={{color: '#aaa'}}>{title}</div>
               <h4 className="fw-bold m-0" style={{color: accentColor}}>#{invoice_id}</h4>
               <div className="text-muted fw-bold">{date}</div>
           </div>
       </div>

       {/* CUSTOMER & BILLING INFO */}
       <div className="row mb-5 position-relative" style={{zIndex: 1}}>
           <div className="col-6">
               <div className="text-uppercase small fw-bold text-muted mb-2" style={{letterSpacing: '1px'}}>Billed To</div>
               <h5 className="fw-bold mb-1">{customer.name}</h5>
               <div className="text-secondary">{customer.phone}</div>
               <div className="text-secondary small">{customer.address}</div>
               {customer.gstin && <div className="small fw-bold mt-1 text-dark">GSTIN: {customer.gstin}</div>}
           </div>
       </div>

       {/* MODERN ITEMS TABLE */}
       <div className="mb-4 position-relative" style={{zIndex: 1}}>
           <table className="table table-borderless align-middle">
               <thead style={{borderBottom: `2px solid ${accentColor}`}}>
                   <tr className="text-uppercase small fw-bold" style={{color: accentColor}}>
                       <th className="py-3 ps-0">Item Description {showHSN && '/ HSN'}</th>
                       <th className="py-3 text-center">Gross Wt</th>
                       <th className="py-3 text-center">VA / Wastage</th>
                       <th className="py-3 text-center">Rate</th>
                       <th className="py-3 pe-0 text-end">Amount</th>
                   </tr>
               </thead>
               <tbody className="text-secondary">
                  {items.map((item, i) => (
                     <tr key={i} style={{borderBottom: '1px solid #f0f0f0'}}>
                        <td className="py-3 ps-0">
                            <div className="fw-bold text-dark">{item.item_name}</div>
                            <div className="d-flex gap-2 small mt-1">
                                {showHSN && item.hsn_code && <span className="bg-light px-1 rounded">HSN: {item.hsn_code}</span>}
                                {item.item_id && <span className="text-muted">Ref: {item.item_id}</span>}
                            </div>
                        </td>
                        <td className="py-3 text-center">{parseFloat(item.gross_weight).toFixed(3)} <small>g</small></td>
                        <td className="py-3 text-center">{item.wastage_percent ? `${item.wastage_percent}%` : (item.making_charges || '-')}</td>
                        <td className="py-3 text-center">₹{item.rate}</td>
                        <td className="py-3 pe-0 text-end fw-bold text-dark">₹{parseFloat(item.total).toLocaleString()}</td>
                     </tr>
                  ))}
                  {/* Minimal Filler - just space */}
                  {items.length < 5 && (
                      <tr><td colSpan="5" style={{height: `${(5 - items.length) * 50}px`}}></td></tr>
                  )}
               </tbody>
           </table>
       </div>

       {/* TOTALS & EXCHANGE SECTION */}
       <div className="row position-relative" style={{zIndex: 1}}>
           <div className="col-7 pe-5">
               {exchangeItems && exchangeItems.length > 0 && (
                   <div className="mb-4">
                       <div className="text-uppercase small fw-bold text-muted mb-2" style={{letterSpacing: '1px'}}>Exchange Details</div>
                       <table className="table table-sm table-borderless text-secondary m-0">
                           <tbody>
                           {exchangeItems.map((ex, i) => (
                               <tr key={i}>
                                   <td className="ps-0">{ex.name}</td>
                                   <td>{ex.net_weight}g @ {ex.rate}</td>
                                   <td className="text-end text-danger pe-0">- ₹{parseFloat(ex.total).toLocaleString()}</td>
                               </tr>
                           ))}
                           </tbody>
                       </table>
                       <div className="border-bottom my-2 w-50"></div>
                   </div>
               )}
               
               <div className="mt-4">
                   <div className="text-uppercase small fw-bold text-muted mb-2" style={{letterSpacing: '1px'}}>Terms & Conditions</div>
                   <div className="small text-secondary" style={{whiteSpace:'pre-wrap', lineHeight:'1.6'}}>
                       {terms}
                   </div>
               </div>
           </div>

           <div className="col-5 ps-4">
               <div className="d-flex justify-content-between mb-2 text-secondary">
                   <span>Taxable Value</span>
                   <span className="fw-bold text-dark">₹{totals.grossTotal.toLocaleString()}</span>
               </div>
               {includeGST && (
                   <>
                   <div className="d-flex justify-content-between mb-2 text-secondary">
                       <span>CGST (1.5%)</span>
                       <span>₹{totals.cgst.toFixed(2)}</span>
                   </div>
                   <div className="d-flex justify-content-between mb-2 text-secondary">
                       <span>SGST (1.5%)</span>
                       <span>₹{totals.sgst.toFixed(2)}</span>
                   </div>
                   </>
               )}
               {totals.exchangeTotal > 0 && (
                   <div className="d-flex justify-content-between mb-2 text-success">
                       <span>Less: Exchange</span>
                       <span>- ₹{totals.exchangeTotal.toLocaleString()}</span>
                   </div>
               )}
               {totals.totalDiscount > 0 && (
                   <div className="d-flex justify-content-between mb-2 text-danger">
                       <span>Discount</span>
                       <span>- ₹{totals.totalDiscount.toLocaleString()}</span>
                   </div>
               )}
               
               <div className="d-flex justify-content-between align-items-center mt-4 pt-3" 
                    style={{borderTop: `2px solid ${accentColor}`}}>
                   <span className="fs-5 fw-bold text-uppercase" style={{color: accentColor}}>Grand Total</span>
                   <span className="fs-3 fw-bold text-dark">₹{Math.round(totals.netPayable).toLocaleString()}</span>
               </div>
               <div className="text-end small text-muted mt-1">Inclusive of all taxes</div>
           </div>
       </div>

       {/* FOOTER */}
       <div className="position-absolute bottom-0 start-0 w-100 p-5">
           <div className="row align-items-end">
               <div className="col-6">
                   <div className="text-uppercase small fw-bold text-muted mb-4">Customer Signature</div>
                   <div className="border-bottom border-secondary" style={{width: '60%'}}></div>
                   <div className="small text-muted mt-2">{footerLeft}</div>
               </div>
               <div className="col-6 text-end">
                   <div className="fw-bold mb-4">{biz.business_name}</div>
                   <div className="border-bottom border-secondary d-inline-block" style={{width: '60%'}}></div>
                   <div className="small text-muted mt-2">{footerRight}</div>
               </div>
           </div>
       </div>
    </div>
  );
};

export default InvoiceTemplate;