import React from 'react';

const InvoiceTemplate = ({ data, businessProfile }) => {
  if (!data) return null;
  const { 
    customer, items, totals, invoice_id, date, 
    includeGST, exchangeItems, type = 'TAX INVOICE' 
  } = data;

  const biz = businessProfile || {};
  
  return (
    <div id="printable-invoice" className="bg-white p-5 mx-auto position-relative" style={{maxWidth: '210mm', minHeight: '297mm', fontSize: '14px', fontFamily: 'Arial, sans-serif'}}>
       
       {/* WATERMARK */}
       <div className="position-absolute top-50 start-50 translate-middle text-muted opacity-25" style={{fontSize: '10rem', zIndex: 0, transform: 'translate(-50%, -50%) rotate(-45deg)', pointerEvents: 'none'}}>
           AURUM
       </div>

       {/* HEADER */}
       <div className="row border-bottom pb-4 align-items-center position-relative" style={{zIndex: 1}}>
           <div className="col-8">
               <h1 className="fw-bold text-uppercase" style={{color: '#d4af37'}}>{biz.business_name || 'AURUM JEWELLERY'}</h1>
               <div className="small text-muted" style={{whiteSpace: 'pre-line'}}>{biz.address || 'Gold Market, Salem'}</div>
               <div className="small fw-bold mt-1">
                   Mobile: {biz.contact_number} 
                   {biz.email && ` | ${biz.email}`}
               </div>
               {biz.gstin && <div className="small fw-bold border-top border-warning d-inline-block mt-2 pt-1">GSTIN: {biz.gstin}</div>}
           </div>
           <div className="col-4 text-end">
               {biz.logo && <img src={biz.logo} alt="Logo" style={{maxHeight: '80px'}} />}
           </div>
       </div>

       {/* INVOICE META */}
       <div className="d-flex justify-content-between my-4 align-items-end position-relative" style={{zIndex: 1}}>
           <div className="border p-3 rounded bg-light" style={{minWidth: '40%'}}>
               <h6 className="fw-bold text-secondary mb-2">BILLED TO:</h6>
               <div className="fw-bold fs-5">{customer.name}</div>
               <div>{customer.phone}</div>
               <div className="small text-muted">{customer.address}</div>
               {customer.gstin && <div className="small fw-bold mt-1">Cust GST: {customer.gstin}</div>}
           </div>
           <div className="text-end">
               <h3 className="fw-bold text-dark mb-0">{type}</h3>
               <div className="fs-5 text-danger fw-bold">#{invoice_id}</div>
               <div>Date: {date}</div>
           </div>
       </div>

       {/* ITEMS TABLE */}
       <table className="table table-bordered border-dark text-center position-relative" style={{zIndex: 1}}>
          <thead className="bg-secondary text-white">
              <tr>
                  <th>#</th>
                  <th className="text-start">Description / HSN</th>
                  <th>Gross Wt</th>
                  <th>V.A / Wastage</th>
                  <th>Rate</th>
                  <th className="text-end">Amount</th>
              </tr>
          </thead>
          <tbody>
             {items.map((item, i) => (
                <tr key={i}>
                   <td>{i + 1}</td>
                   <td className="text-start">
                       <span className="fw-bold">{item.item_name}</span>
                       {item.hsn_code && <div className="small text-muted">HSN: {item.hsn_code}</div>}
                       {item.item_id && <div className="small text-muted" style={{fontSize: '0.7em'}}>Ref: {item.item_id}</div>}
                   </td>
                   <td>{item.gross_weight} g</td>
                   <td>{item.wastage_percent ? `${item.wastage_percent}%` : (item.making_charges || '-')}</td>
                   <td>{item.rate}</td>
                   <td className="text-end fw-bold">{parseFloat(item.total).toLocaleString()}</td>
                </tr>
             ))}
             {/* Filler Rows for layout consistency */}
             {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
                 <tr key={`filler-${i}`} style={{height: '35px'}}><td></td><td></td><td></td><td></td><td></td><td></td></tr>
             ))}
          </tbody>
       </table>

       {/* TOTALS & EXCHANGE */}
       <div className="row mt-2 position-relative" style={{zIndex: 1}}>
           <div className="col-7">
               {exchangeItems && exchangeItems.length > 0 && (
                   <div className="border p-2 small mb-3">
                       <strong className="text-secondary">EXCHANGE / OLD METAL DETAILS</strong>
                       <table className="table table-sm table-borderless m-0">
                           {exchangeItems.map((ex, i) => (
                               <tr key={i}>
                                   <td>{ex.name}</td>
                                   <td>{ex.net_weight}g @ {ex.rate}</td>
                                   <td className="text-end text-danger">- {parseFloat(ex.total).toLocaleString()}</td>
                               </tr>
                           ))}
                       </table>
                   </div>
               )}
               <div className="small text-muted fst-italic border p-2 rounded">
                   <strong>Terms & Conditions:</strong><br/>
                   1. Goods once sold will not be taken back.<br/>
                   2. Subject to Salem Jurisdiction.<br/>
                   3. E. & O.E.
               </div>
           </div>

           <div className="col-5">
               <table className="table table-sm table-bordered border-dark">
                   <tbody>
                       <tr><td className="text-end">Taxable Value</td><td className="text-end fw-bold">{totals.grossTotal.toLocaleString()}</td></tr>
                       {includeGST && (
                           <>
                           <tr><td className="text-end">CGST (1.5%)</td><td className="text-end">{totals.cgst.toFixed(2)}</td></tr>
                           <tr><td className="text-end">SGST (1.5%)</td><td className="text-end">{totals.sgst.toFixed(2)}</td></tr>
                           </>
                       )}
                       {totals.exchangeTotal > 0 && (
                           <tr><td className="text-end text-success">Less: Exchange</td><td className="text-end text-success">- {totals.exchangeTotal.toLocaleString()}</td></tr>
                       )}
                       {totals.totalDiscount > 0 && (
                           <tr><td className="text-end text-danger">Discount</td><td className="text-end text-danger">- {totals.totalDiscount.toLocaleString()}</td></tr>
                       )}
                       <tr className="bg-light border-dark">
                           <td className="text-end fs-5 fw-bold">GRAND TOTAL</td>
                           <td className="text-end fs-5 fw-bold text-primary">₹{Math.round(totals.netPayable).toLocaleString()}</td>
                       </tr>
                   </tbody>
               </table>
           </div>
       </div>

       {/* FOOTER */}
       <div className="row mt-5 pt-5 align-items-end position-relative" style={{zIndex: 1}}>
           <div className="col-6 text-center">
               <div className="border-top border-dark w-75 mx-auto pt-2">Customer's Signature</div>
           </div>
           <div className="col-6 text-center">
               <div className="fw-bold">{biz.business_name}</div>
               <div className="border-top border-dark w-75 mx-auto pt-2 mt-4">Authorized Signatory</div>
           </div>
       </div>
    </div>
  );
};

export default InvoiceTemplate;