import React from 'react';

const InvoiceTemplate = ({ data, businessProfile }) => {
  if (!data) return null;
  const { 
    customer, items, totals, invoice_id, date, 
    includeGST, exchangeItems, type 
  } = data;

  const biz = businessProfile || {};
  const config = biz.invoice_config || {};
  
  // --- CONFIGURATION ---
  const accentColor = config.accent_color || '#d4af37';
  const showWatermark = config.show_watermark !== false; 
  const watermarkText = config.watermark_text || 'AURUM';
  const title = type || config.sales_title || 'TAX INVOICE';
  const terms = config.sales_terms || '1. Goods once sold will not be taken back.\n2. Subject to Salem Jurisdiction.\n3. E. & O.E.';
  const footerLeft = config.sales_footer_left || "Customer's Signature";
  const footerRight = config.sales_footer_right || "Authorized Signatory";
  const showHSN = config.show_hsn !== false; 
  
  // Header Display Preference
  const displayPref = biz.display_preference || 'BOTH';
  const showLogo = (displayPref === 'LOGO' || displayPref === 'BOTH') && biz.logo;
  const showName = (displayPref === 'NAME' || displayPref === 'BOTH');

  // --- HELPER: Indian Date Formatter ---
  const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return dateString;
          return d.toLocaleDateString('en-IN', {
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric'
          });
      } catch (e) { return dateString; }
  };

  // --- STYLE FOR TRANSPARENCY ---
  const transparentStyle = { backgroundColor: 'transparent' };

  return (
    <div id="printable-invoice" className="bg-white p-5 mx-auto position-relative" 
         style={{
             maxWidth: '210mm', 
             minHeight: '297mm', 
             fontSize: '14px', 
             fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
             color: '#333',
             overflow: 'hidden',
             isolation: 'isolate' 
         }}>
       
       {/* --- WATERMARK (WRAPPED, CENTERED, FADED) --- */}
       {showWatermark && (
           <div className="position-absolute top-50 start-50 translate-middle d-flex justify-content-center align-items-center" 
                style={{
                    zIndex: -1, // Behind everything
                    pointerEvents: 'none', 
                    width: '100%', 
                    height: '100%',
                    overflow: 'hidden'
                }}>
               <h1 className="fw-bolder text-uppercase m-0 text-center" 
                   style={{
                       fontSize: 'clamp(3rem, 8vw, 6rem)', // Adjusted for wrapping
                       letterSpacing: '0.2rem',
                       lineHeight: '1.2',
                       color: '#d4af37', 
                       opacity: 0.1,    
                       transform: 'rotate(-45deg)', 
                       width: '75%', // Constrain width to force wrapping
                       wordWrap: 'break-word', // Ensure long words break
                       overflowWrap: 'break-word'
                   }}>
                   {watermarkText}
               </h1>
           </div>
       )}

       {/* --- HEADER SECTION --- */}
       <div className="d-flex justify-content-between align-items-start mb-5 position-relative">
           <div>
               {showLogo && (
                   <img src={biz.logo} alt="Logo" className="mb-3" style={{maxHeight: '90px', objectFit: 'contain'}} />
               )}
               {showName && (
                   <h2 className="fw-bold text-uppercase m-0" style={{color: accentColor, letterSpacing: '1px'}}>
                       {biz.business_name || 'AURUM JEWELLERY'}
                   </h2>
               )}
               <div className="text-secondary mt-2 small" style={{maxWidth: '300px', lineHeight: '1.5'}}>
                   {biz.address || 'Gold Market, Salem'}<br/>
                   <span className="fw-bold text-dark">Mobile:</span> {biz.contact_number} {biz.email && <span>| <span className="fw-bold text-dark">E-Mail:</span> {biz.email}</span>}
                   {biz.gstin && <div className="mt-1"><span className="badge bg-light text-dark border">GSTIN: {biz.gstin}</span></div>}
               </div>
           </div>
           <div className="text-end">
               <div className="display-6 fw-light text-uppercase mb-2" style={{color: '#aaa'}}>{title}</div>
               <h4 className="fw-bold m-0" style={{color: accentColor}}>#{invoice_id}</h4>
               <div className="text-muted fw-bold">{formatDate(date)}</div>
           </div>
       </div>

       {/* --- CUSTOMER INFO --- */}
       <div className="row mb-5 position-relative">
           <div className="col-6">
               <div className="text-uppercase small fw-bold text-muted mb-2" style={{letterSpacing: '1px'}}>Billed To</div>
               <h5 className="fw-bold mb-1">{customer.name}</h5>
               <div className="text-secondary">{customer.phone}</div>
               <div className="text-secondary small">{customer.address}</div>
               {customer.gstin && <div className="small fw-bold mt-1 text-dark">GSTIN: {customer.gstin}</div>}
           </div>
       </div>

       {/* --- ITEMS TABLE (TRANSPARENT) --- */}
       <div className="mb-4 position-relative">
           <table className="table table-borderless align-middle mb-0" style={transparentStyle}>
               <thead style={{borderBottom: `2px solid ${accentColor}`, ...transparentStyle}}>
                   <tr className="text-uppercase small fw-bold" style={{color: accentColor, ...transparentStyle}}>
                       <th className="py-3 ps-0" style={transparentStyle}>Item Description {showHSN && '/ HSN'}</th>
                       <th className="py-3 text-center" style={transparentStyle}>Gross Wt</th>
                       <th className="py-3 text-center" style={transparentStyle}>VA / Wastage</th>
                       <th className="py-3 text-center" style={transparentStyle}>Rate</th>
                       <th className="py-3 pe-0 text-end" style={transparentStyle}>Amount</th>
                   </tr>
               </thead>
               <tbody className="text-secondary" style={transparentStyle}>
                  {items.map((item, i) => (
                     <tr key={i} style={{borderBottom: '1px solid #f0f0f0', ...transparentStyle}}>
                        <td className="py-3 ps-0" style={transparentStyle}>
                            <div className="fw-bold text-dark">{item.item_name}</div>
                            <div className="d-flex gap-2 small mt-1">
                                {showHSN && item.hsn_code && <span className="bg-light px-1 rounded" style={{backgroundColor: 'rgba(248,249,250,0.5)'}}>HSN: {item.hsn_code}</span>}
                                {item.item_id && <span className="text-muted">Ref: {item.item_id}</span>}
                            </div>
                        </td>
                        <td className="py-3 text-center" style={transparentStyle}>{parseFloat(item.gross_weight).toFixed(3)} <small>g</small></td>
                        <td className="py-3 text-center" style={transparentStyle}>{item.wastage_percent ? `${item.wastage_percent}%` : (item.making_charges || '-')}</td>
                        <td className="py-3 text-center" style={transparentStyle}>₹{item.rate}</td>
                        <td className="py-3 pe-0 text-end fw-bold text-dark" style={transparentStyle}>₹{parseFloat(item.total).toLocaleString()}</td>
                     </tr>
                  ))}
                  {/* Spacer Rows */}
                  {items.length < 5 && (
                      <tr style={transparentStyle}><td colSpan="5" style={{height: `${(5 - items.length) * 50}px`, ...transparentStyle}}></td></tr>
                  )}
               </tbody>
           </table>
       </div>

       {/* --- TOTALS & FOOTER --- */}
       <div className="row position-relative">
           {/* Left: Exchange & Terms */}
           <div className="col-7 pe-5">
               {exchangeItems && exchangeItems.length > 0 && (
                   <div className="mb-4">
                       <div className="text-uppercase small fw-bold text-muted mb-2" style={{letterSpacing: '1px'}}>Exchange / Old Metal</div>
                       {/* Transparent Exchange Table */}
                       <table className="table table-sm table-borderless text-secondary m-0" style={transparentStyle}>
                           <tbody style={transparentStyle}>
                           {exchangeItems.map((ex, i) => (
                               <tr key={i} style={transparentStyle}>
                                   <td className="ps-0" style={transparentStyle}>{ex.name}</td>
                                   <td style={transparentStyle}>{ex.net_weight}g @ {ex.rate}</td>
                                   <td className="text-end text-danger pe-0" style={transparentStyle}>- ₹{parseFloat(ex.total).toLocaleString()}</td>
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

           {/* Right: Calculations */}
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

       {/* --- FOOTER --- */}
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