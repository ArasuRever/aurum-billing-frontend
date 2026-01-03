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
  
  const displayPref = biz.display_preference || 'BOTH';
  const showLogo = (displayPref === 'LOGO' || displayPref === 'BOTH') && biz.logo;
  const showName = (displayPref === 'NAME' || displayPref === 'BOTH');
  const businessGST = biz.gstin || biz.gst || biz.license_number;

  const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return dateString;
          return d.toLocaleDateString('en-IN', {
              day: '2-digit', month: '2-digit', year: 'numeric'
          });
      } catch (e) { return dateString; }
  };

  const transparentStyle = { backgroundColor: 'transparent' };

  return (
    <div id="printable-invoice" className="d-flex flex-column bg-white mx-auto position-relative" 
         style={{
             width: '210mm', 
             minHeight: '297mm',
             padding: '10mm 15mm',
             fontSize: '12px',   
             fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
             color: '#333',
             isolation: 'isolate',
             boxSizing: 'border-box'
         }}>
       
       <style>
         {`
           @media print {
             @page { size: A4; margin: 0; }
             body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
             #printable-invoice { 
                width: 210mm !important; 
                min-height: 297mm !important; 
                margin: 0 !important;
                padding: 10mm 15mm !important;
                box-sizing: border-box !important;
                background-color: white !important;
                position: absolute;
                top: 0;
                left: 0;
             }
           }
         `}
       </style>

       {showWatermark && (
           <div className="position-absolute top-50 start-50 translate-middle d-flex justify-content-center align-items-center" 
                style={{zIndex: -1, pointerEvents: 'none', width: '100%', height: '100%', overflow: 'hidden'}}>
               <h1 className="fw-bolder text-uppercase m-0 text-center" 
                   style={{fontSize: 'clamp(3rem, 8vw, 6rem)', letterSpacing: '0.2rem', lineHeight: '1.2', color: '#d4af37', opacity: 0.1, transform: 'rotate(-45deg)', width: '75%', wordWrap: 'break-word', overflowWrap: 'break-word'}}>
                   {watermarkText}
               </h1>
           </div>
       )}

       <div className="flex-grow-1">
           <div className="d-flex justify-content-between align-items-start mb-4">
               <div className="d-flex align-items-center">
                   {showLogo && (
                       <div className="me-3"> 
                           <img src={biz.logo} alt="Logo" style={{ maxHeight: '80px', maxWidth: '120px', objectFit: 'contain' }} />
                       </div>
                   )}
                   <div>
                       {showName && (
                           <h2 className="fw-bold text-uppercase m-0" style={{color: accentColor, letterSpacing: '1px', lineHeight: '1.1', fontSize: '1.5rem'}}>
                               {biz.business_name || 'AURUM JEWELLERY'}
                           </h2>
                       )}
                       {businessGST && <div className="fw-bold text-dark mt-1" style={{ fontSize: '0.85rem' }}>GSTIN: {businessGST}</div>}
                       <div className="text-secondary mt-1 small" style={{maxWidth: '350px', lineHeight: '1.3', fontSize: '0.8rem'}}>
                           {biz.address || 'Gold Market, Salem'}<br/>
                           <span className="fw-bold text-dark">Mobile:</span> {biz.contact_number} 
                           {biz.email && <span> | <span className="fw-bold text-dark">E-Mail:</span> {biz.email}</span>}
                       </div>
                   </div>
               </div>
               <div className="text-end">
                   <div className="fw-light text-uppercase mb-1" style={{color: '#aaa', fontSize: '1.5rem'}}>{title}</div>
                   <h5 className="fw-bold m-0" style={{color: accentColor}}>#{invoice_id}</h5>
                   <div className="text-muted fw-bold small">{formatDate(date)}</div>
               </div>
           </div>

           <div className="row mb-4">
               <div className="col-7">
                   <div className="text-uppercase small fw-bold text-muted mb-1" style={{letterSpacing: '1px', fontSize:'0.7rem'}}>Billed To</div>
                   <h6 className="fw-bold mb-1 text-dark">{customer.name}</h6>
                   <div className="text-secondary small">{customer.phone}</div>
                   <div className="text-secondary small">{customer.address}</div>
                   {customer.gstin && <div className="small fw-bold mt-1 text-dark">GSTIN: {customer.gstin}</div>}
               </div>
           </div>

           <div className="mb-4">
               <table className="table table-borderless align-middle mb-0" style={transparentStyle}>
                   <thead style={{borderBottom: `2px solid ${accentColor}`, ...transparentStyle}}>
                       <tr className="text-uppercase small fw-bold" style={{color: accentColor, ...transparentStyle}}>
                           <th className="py-2 ps-0" style={{...transparentStyle, width: '25%'}}>Item Description {showHSN && '/ HSN'}</th>
                           <th className="py-2 text-center" style={{...transparentStyle, width: '10%'}}>Gross Wt</th>
                           <th className="py-2 text-center" style={{...transparentStyle, width: '12%'}}>VA / Wastage</th>
                           <th className="py-2 text-center" style={{...transparentStyle, width: '10%'}}>MC</th>
                           <th className="py-2 text-center" style={{...transparentStyle, width: '10%'}}>Rate</th>
                           <th className="py-2 text-center" style={{...transparentStyle, width: '10%'}}>Disc.</th>
                           <th className="py-2 pe-0 text-end" style={{...transparentStyle, width: '15%'}}>Amount</th>
                       </tr>
                   </thead>
                   <tbody className="text-secondary" style={transparentStyle}>
                      {items.map((item, i) => (
                         <tr key={i} style={{borderBottom: '1px solid #f0f0f0', ...transparentStyle}}>
                            <td className="py-2 ps-0" style={transparentStyle}>
                                <div className="fw-bold text-dark">{item.item_name}</div>
                                <div className="d-flex gap-2 small mt-1" style={{fontSize: '0.75rem'}}>
                                    {showHSN && item.hsn_code && <span className="bg-light px-1 rounded border">HSN: {item.hsn_code}</span>}
                                </div>
                            </td>
                            <td className="py-2 text-center" style={transparentStyle}>{parseFloat(item.gross_weight).toFixed(3)} <small>g</small></td>
                            <td className="py-2 text-center" style={transparentStyle}>{item.wastage_percent ? `${item.wastage_percent}%` : '-'}</td>
                            <td className="py-2 text-center" style={transparentStyle}>{item.making_charges ? `₹${item.making_charges}` : '-'}</td>
                            <td className="py-2 text-center" style={transparentStyle}>₹{item.rate}</td>
                            <td className="py-2 text-center text-danger" style={transparentStyle}>{item.discount > 0 ? `- ₹${item.discount}` : '-'}</td>
                            <td className="py-2 pe-0 text-end fw-bold text-dark" style={transparentStyle}>₹{parseFloat(item.total).toLocaleString()}</td>
                         </tr>
                      ))}
                      {items.length < 6 && (
                          <tr style={transparentStyle}><td colSpan="7" style={{height: `${(6 - items.length) * 35}px`, ...transparentStyle}}></td></tr>
                      )}
                   </tbody>
               </table>
           </div>

           <div className="row mb-2">
               <div className="col-7 pe-4">
                   {exchangeItems && exchangeItems.length > 0 && (
                       <div className="mb-3">
                           <div className="text-uppercase small fw-bold text-muted mb-1" style={{letterSpacing: '1px', fontSize:'0.7rem'}}>Exchange / Old Metal</div>
                           <table className="table table-sm table-borderless text-secondary m-0" style={{...transparentStyle, fontSize: '0.85rem'}}>
                               <tbody style={transparentStyle}>
                               {exchangeItems.map((ex, i) => (
                                   <tr key={i} style={transparentStyle}>
                                       <td className="ps-0 py-1" style={transparentStyle}>{ex.name}</td>
                                       <td className="py-1" style={transparentStyle}>{ex.net_weight}g @ {ex.rate}</td>
                                       <td className="text-end text-danger pe-0 py-1" style={transparentStyle}>- ₹{parseFloat(ex.total).toLocaleString()}</td>
                                   </tr>
                               ))}
                               </tbody>
                           </table>
                           <div className="border-bottom my-2 w-75"></div>
                       </div>
                   )}
                   <div className="mt-3">
                       <div className="text-uppercase small fw-bold text-muted mb-1" style={{letterSpacing: '1px', fontSize:'0.7rem'}}>Terms & Conditions</div>
                       <div className="small text-secondary" style={{whiteSpace:'pre-wrap', lineHeight:'1.4', fontSize: '0.75rem'}}>{terms}</div>
                   </div>
               </div>

               <div className="col-5 ps-4">
                   <div className="d-flex justify-content-between mb-1 text-secondary small"><span>Taxable Value</span><span className="fw-bold text-dark">₹{totals.grossTotal.toLocaleString()}</span></div>
                   {includeGST && (<>
                       <div className="d-flex justify-content-between mb-1 text-secondary small"><span>CGST (1.5%)</span><span>₹{totals.cgst.toFixed(2)}</span></div>
                       <div className="d-flex justify-content-between mb-1 text-secondary small"><span>SGST (1.5%)</span><span>₹{totals.sgst.toFixed(2)}</span></div>
                   </>)}
                   {totals.exchangeTotal > 0 && (<div className="d-flex justify-content-between mb-1 text-success small"><span>Less: Exchange</span><span>- ₹{totals.exchangeTotal.toLocaleString()}</span></div>)}
                   {totals.totalDiscount > 0 && (<div className="d-flex justify-content-between mb-1 text-danger small"><span>Total Discount</span><span>- ₹{totals.totalDiscount.toLocaleString()}</span></div>)}
                   
                   <div className="d-flex justify-content-between align-items-center mt-3 pt-2" style={{borderTop: `2px solid ${accentColor}`}}>
                       <span className="fw-bold text-uppercase" style={{color: accentColor, fontSize: '1rem'}}>Grand Total</span>
                       <span className="fw-bold text-dark" style={{fontSize: '1.3rem'}}>₹{Math.round(totals.netPayable).toLocaleString()}</span>
                   </div>
                   <div className="text-end small text-muted mt-1" style={{fontSize: '0.7rem'}}>Inclusive of all taxes</div>
               </div>
           </div>
       </div>

       <div className="mt-auto pt-3">
           <div className="row align-items-end">
               <div className="col-6">
                   <div className="text-uppercase small fw-bold text-muted mb-4" style={{fontSize: '0.7rem'}}>Customer Signature</div>
                   <div className="border-bottom border-secondary" style={{width: '60%'}}></div>
                   <div className="small text-muted mt-1" style={{fontSize: '0.75rem'}}>{footerLeft}</div>
               </div>
               <div className="col-6 text-end">
                   <div className="fw-bold mb-4 small">{biz.business_name}</div>
                   <div className="border-bottom border-secondary d-inline-block" style={{width: '60%'}}></div>
                   <div className="small text-muted mt-1" style={{fontSize: '0.75rem'}}>{footerRight}</div>
               </div>
           </div>
       </div>
    </div>
  );
};

export default InvoiceTemplate;