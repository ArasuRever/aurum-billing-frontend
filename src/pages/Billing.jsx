import React, { useState, useEffect } from 'react';
import { api } from '../api';

function Billing() {
  // --- STATE ---
  const [rates, setRates] = useState({ GOLD: 7000, SILVER: 85 });
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  
  // NEW: GST State
  const [includeGST, setIncludeGST] = useState(false);

  // --- LIVE SEARCH ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.length > 1) {
        try {
          const res = await api.searchBillingItem(searchTerm);
          setSearchResults(res.data);
        } catch (err) { console.error(err); }
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // --- CART ACTIONS ---
  const addToCart = (item) => {
    if (cart.find(c => c.id === item.id)) return alert("Item already in cart");
    const appliedRate = item.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD;

    const newItem = {
      ...item,
      wastage_percent: '', 
      wastage_weight: '', 
      making_charges: item.making_charges || '', 
      rate: appliedRate, 
      discount: '' 
    };
    setCart([...cart, newItem]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index, field, value) => {
    const newCart = [...cart];
    const item = newCart[index];
    const gross = parseFloat(item.gross_weight) || 0;

    if (field === 'wastage_percent') {
        item.wastage_percent = value;
        if (value === '') {
            item.wastage_weight = '';
        } else {
            const val = parseFloat(value);
            item.wastage_weight = (gross * (val / 100)).toFixed(3);
        }
    } else if (field === 'wastage_weight') {
        item.wastage_weight = value;
        if (value === '') {
            item.wastage_percent = '';
        } else if (gross > 0) {
            const val = parseFloat(value);
            item.wastage_percent = ((val / gross) * 100).toFixed(2);
        }
    } else {
        item[field] = value;
    }
    setCart(newCart);
  };

  // --- ITEM LEVEL CALCULATION ---
  const calculateItemTotal = (item) => {
    const weight = parseFloat(item.gross_weight) || 0;
    const wastageWt = parseFloat(item.wastage_weight) || 0; 
    const rate = parseFloat(item.rate) || 0;
    const mc = parseFloat(item.making_charges) || 0;
    const discount = parseFloat(item.discount) || 0;

    const totalWeight = weight + wastageWt;
    const goldValue = totalWeight * rate;
    
    // Return precise value for summing
    return (goldValue + mc - discount); 
  };

  // --- GLOBAL TOTALS CALCULATION ---
  // 1. Sum of all items (Gross - Discount)
  const taxableAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  
  // 2. Gross (Visual sum before discount)
  const grossTotal = cart.reduce((acc, item) => {
     const weight = parseFloat(item.gross_weight) || 0;
     const wastageWt = parseFloat(item.wastage_weight) || 0; 
     const rate = parseFloat(item.rate) || 0;
     const mc = parseFloat(item.making_charges) || 0;
     return acc + ((weight + wastageWt) * rate) + mc;
  }, 0);

  const totalDiscount = cart.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);

  // 3. GST Calculation (Precise 1.5%)
  const sgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  const cgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  
  // 4. Final Total & Rounding to Nearest 10
  const totalWithTax = taxableAmount + sgstAmount + cgstAmount;
  
  // Round to nearest 10 logic:
  const netPayable = Math.round(totalWithTax / 10) * 10;
  const roundOff = netPayable - totalWithTax;

  // --- SUBMIT ---
  const handlePrintBill = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (!customer.name) return alert("Name required");

    const billData = {
      customer,
      items: cart.map(item => ({
        item_id: item.id, item_name: item.item_name, barcode: item.barcode,
        gross_weight: item.gross_weight, wastage_percent: item.wastage_percent, wastage_weight: item.wastage_weight,
        making_charges: item.making_charges, rate: item.rate, discount: item.discount, 
        total: Math.round(calculateItemTotal(item)) 
      })),
      totals: { 
        grossTotal,
        totalDiscount,
        taxableAmount,
        sgst: sgstAmount.toFixed(2),
        cgst: cgstAmount.toFixed(2),
        roundOff: roundOff.toFixed(2),
        netPayable 
      },
      includeGST
    };

    try {
      const res = await api.createBill(billData);
      alert(`Bill Saved! #${res.data.invoice_id}`);
      setCart([]); setCustomer({ name: '', phone: '', address: '' }); setIncludeGST(false);
    } catch (err) { alert("Error saving bill"); }
  };

  return (
    <div className="container-fluid pb-5">
      <div className="row g-3">
        {/* LEFT: CUSTOMER */}
        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-primary text-white"><h5 className="mb-0">Customer</h5></div>
            <div className="card-body">
              <div className="mb-3"><label className="form-label small fw-bold">Mobile</label><div className="input-group"><input className="form-control" placeholder="Search" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} /><button className="btn btn-outline-secondary"><i className="bi bi-search"></i></button></div></div>
              <div className="mb-3"><label className="form-label small fw-bold">Name</label><input className="form-control" placeholder="Name" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} /></div>
              <div className="mb-3"><label className="form-label small fw-bold">Address</label><textarea className="form-control" rows="3" placeholder="Address..." value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})}></textarea></div>
            </div>
          </div>
        </div>

        {/* RIGHT: CART */}
        <div className="col-md-9">
          <div className="card shadow-sm mb-3">
            <div className="card-body py-2 d-flex align-items-center gap-3">
              <div className="position-relative flex-grow-1">
                <div className="input-group"><span className="input-group-text bg-light"><i className="bi bi-upc-scan"></i></span><input type="text" className="form-control" placeholder="Scan Barcode / Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus /></div>
                {searchResults.length > 0 && (<div className="position-absolute w-100 mt-1 shadow bg-white rounded overflow-hidden" style={{zIndex: 1000}}>{searchResults.map(item => (<button key={item.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" onClick={() => addToCart(item)}><div><span className="fw-bold">{item.item_name}</span> <small className="text-muted">({item.barcode})</small></div><span className={`badge ${item.metal_type==='GOLD'?'bg-warning text-dark':'bg-secondary'}`}>{item.metal_type}</span></button>))}</div>)}
              </div>
              <div className="d-flex align-items-center bg-warning bg-opacity-10 px-2 py-1 rounded border border-warning"><label className="small fw-bold text-dark me-2 mb-0">GOLD:</label><input type="number" className="form-control form-control-sm border-warning fw-bold text-primary" style={{width: '90px'}} value={rates.GOLD} onChange={e => setRates({...rates, GOLD: e.target.value})} /></div>
              <div className="d-flex align-items-center bg-secondary bg-opacity-10 px-2 py-1 rounded border border-secondary"><label className="small fw-bold text-dark me-2 mb-0">SILVER:</label><input type="number" className="form-control form-control-sm border-secondary fw-bold text-secondary" style={{width: '90px'}} value={rates.SILVER} onChange={e => setRates({...rates, SILVER: e.target.value})} /></div>
            </div>
          </div>

          <div className="card shadow-sm border-0 mb-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-center">
                  <tr><th style={{width: '5%'}}></th><th style={{width: '18%'}} className="text-start">Item</th><th style={{width: '8%'}}>Wt</th><th style={{width: '15%'}}>Wastage (% | g)</th><th style={{width: '10%'}}>MC ₹</th><th style={{width: '12%'}}>Rate ₹</th><th style={{width: '10%'}}>Disc.</th><th style={{width: '12%'}}>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="text-center">
                      <td>{item.item_image ? <img src={item.item_image} className="rounded" style={{width:'35px', height:'35px', objectFit:'cover'}} /> : <div className="bg-light rounded" style={{width:'35px',height:'35px'}}></div>}</td>
                      <td className="text-start"><div className="fw-bold text-dark small text-truncate" style={{maxWidth: '150px'}}>{item.item_name}</div><div className="small font-monospace text-muted" style={{fontSize:'0.7rem'}}>{item.barcode}</div></td>
                      <td className="fw-bold">{item.gross_weight}</td>
                      <td>
                        <div className="input-group input-group-sm">
                          <input type="number" className="form-control text-center px-1" placeholder="%" value={item.wastage_percent} onChange={e => updateCartItem(i, 'wastage_percent', e.target.value)} />
                          <span className="input-group-text px-1 text-muted">|</span>
                          <input type="number" className="form-control text-center px-1 bg-light" placeholder="g" value={item.wastage_weight} onChange={e => updateCartItem(i, 'wastage_weight', e.target.value)} />
                        </div>
                      </td>
                      <td><input type="number" className="form-control form-control-sm text-center p-1" value={item.making_charges} onChange={e => updateCartItem(i, 'making_charges', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-center p-1 fw-bold text-primary" value={item.rate} onChange={e => updateCartItem(i, 'rate', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-center p-1 text-danger" value={item.discount} onChange={e => updateCartItem(i, 'discount', e.target.value)} /></td>
                      <td className="fw-bold text-success">{Math.round(calculateItemTotal(item)).toLocaleString()}</td>
                      <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(i)}><i className="bi bi-x-lg"></i></button></td>
                    </tr>
                  ))}
                  {cart.length===0 && <tr><td colSpan="9" className="text-center py-5 text-muted">Empty Cart</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {cart.length > 0 && (
            <div className="row justify-content-end">
              <div className="col-md-5">
                <div className="card shadow-sm bg-light">
                  <div className="card-body">
                    
                    {/* Subtotals */}
                    <div className="d-flex justify-content-between mb-1 text-muted small"><span>Gross Total:</span><span className="fw-bold">₹{Math.round(grossTotal).toLocaleString()}</span></div>
                    <div className="d-flex justify-content-between mb-2 text-danger small"><span>Total Discount:</span><span>- ₹{totalDiscount.toLocaleString()}</span></div>
                    
                    {/* GST Section */}
                    <div className="form-check form-switch mb-2">
                      <input className="form-check-input" type="checkbox" id="gstSwitch" checked={includeGST} onChange={e => setIncludeGST(e.target.checked)} />
                      <label className="form-check-label fw-bold small" htmlFor="gstSwitch">Include GST (3%)</label>
                    </div>

                    {includeGST && (
                      <div className="bg-white p-2 rounded border mb-2 small">
                        <div className="d-flex justify-content-between mb-1 text-secondary"><span>Taxable Value:</span><span>₹{Math.round(taxableAmount).toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-1"><span>SGST (1.5%):</span><span>+ ₹{sgstAmount.toFixed(2)}</span></div>
                        <div className="d-flex justify-content-between mb-1"><span>CGST (1.5%):</span><span>+ ₹{cgstAmount.toFixed(2)}</span></div>
                        <div className="d-flex justify-content-between text-muted fst-italic"><span>Round Off (10s):</span><span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span></div>
                      </div>
                    )}

                    <hr className="my-2" />
                    
                    {/* Final Total */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fs-5 fw-bold text-dark">{includeGST ? 'Net Payable' : 'Payable'}:</span>
                      <span className="fs-3 fw-bold text-success">₹{netPayable.toLocaleString()}</span>
                    </div>
                    
                    <button className="btn btn-success w-100 mt-3 fw-bold" onClick={handlePrintBill}><i className="bi bi-printer me-2"></i> Print Invoice</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Billing;