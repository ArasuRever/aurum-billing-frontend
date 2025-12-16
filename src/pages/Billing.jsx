import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

function Billing() {
  const [rates, setRates] = useState({ GOLD: 7000, SILVER: 85 });
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  
  // --- UNIFIED ENTRY STATE ---
  const [entry, setEntry] = useState({
    item_id: null,       
    item_name: '',       
    item_desc: '',       
    barcode: '',
    metal_type: 'GOLD',
    gross_weight: '',
    wastage_percent: '',
    making_charges: '',
    item_image: null
  });

  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [shops, setShops] = useState([]); 
  const [includeGST, setIncludeGST] = useState(false);
  
  const searchRef = useRef(null);

  useEffect(() => {
    api.getShops().then(res => setShops(res.data)).catch(console.error);
  }, []);

  // --- LIVE SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      // Only search if text > 1 AND we haven't selected an ID yet
      if (entry.item_name.length > 1 && !entry.item_id) {
        try {
          const res = await api.searchBillingItem(entry.item_name);
          setSearchResults(res.data);
        } catch (err) { console.error(err); }
      } else { 
        setSearchResults([]); 
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [entry.item_name, entry.item_id]);

  // --- HANDLERS ---
  const handleEntryChange = (field, value) => {
    let finalValue = value;
    let updates = { [field]: finalValue };

    // Reset ID if name changes manually
    if (field === 'item_name' && entry.item_id) {
       updates.item_id = null; updates.barcode = ''; updates.item_image = null;
    }

    // NICK ID LOGIC
    if (field === 'item_desc') {
        const upperVal = value.toUpperCase();
        const matchedShop = shops.find(s => s.nick_id && s.nick_id === upperVal);
        if (matchedShop) {
            finalValue = `${matchedShop.nick_id} - `;
            updates[field] = finalValue;
        }
    }

    setEntry(prev => ({ ...prev, ...updates }));
  };

  const performAddToCart = (itemToAdd) => {
    // Check Duplicate
    if (itemToAdd.item_id && cart.find(c => c.item_id === itemToAdd.item_id)) {
        return alert("Item already in cart.");
    }

    const appliedRate = itemToAdd.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD;
    const gross = parseFloat(itemToAdd.gross_weight) || 0;
    const wastPct = parseFloat(itemToAdd.wastage_percent) || 0;
    const wastWt = (gross * (wastPct / 100)).toFixed(3);

    const newItem = {
      ...itemToAdd,
      id: itemToAdd.item_id || `MANUAL-${Date.now()}`,
      isManual: !itemToAdd.item_id,
      wastage_weight: wastWt,
      rate: appliedRate,
      discount: '',
      total: 0
    };

    setCart(prev => [...prev, newItem]);
    
    // Reset Form (Preserve Metal Type)
    setEntry({ 
      item_id: null, item_name: '', item_desc: '', barcode: '', 
      metal_type: entry.metal_type, gross_weight: '', wastage_percent: '', 
      making_charges: '', item_image: null 
    });
  };

  const selectItem = (item) => {
    setSearchResults([]); 
    const itemToAdd = {
      item_id: item.id,
      item_name: item.item_name,
      item_desc: '',
      barcode: item.barcode,
      metal_type: item.metal_type,
      gross_weight: item.gross_weight,
      wastage_percent: item.wastage_percent,
      making_charges: item.making_charges,
      item_image: item.item_image
    };
    performAddToCart(itemToAdd);
  };

  // 4. MANUAL ADD HANDLER (Fixed)
  const handleManualAdd = () => {
    let finalName = entry.item_name;
    
    // FIX: If Name (Top Bar) is empty but Detail is filled, use Detail as Name
    if (!finalName && entry.item_desc) {
        finalName = entry.item_desc;
    }

    if (!finalName || !entry.gross_weight) {
        return alert("Please enter Item Name (Top Bar) and Weight.");
    }

    performAddToCart({
        ...entry,
        item_name: finalName // Use the resolved name
    });
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const updateCartItem = (index, field, value) => {
    const newCart = [...cart];
    const item = newCart[index];
    const gross = parseFloat(item.gross_weight) || 0;

    if (field === 'wastage_percent') {
        item.wastage_percent = value;
        item.wastage_weight = value === '' ? '' : (gross * (parseFloat(value) / 100)).toFixed(3);
    } else if (field === 'wastage_weight') {
        item.wastage_weight = value;
        item.wastage_percent = (value === '' || gross === 0) ? '' : ((parseFloat(value) / gross) * 100).toFixed(2);
    } else {
        item[field] = value;
    }
    setCart(newCart);
  };

  // --- CALCS ---
  const calculateItemTotal = (item) => {
    const weight = parseFloat(item.gross_weight) || 0;
    const wastageWt = parseFloat(item.wastage_weight) || 0; 
    const rate = parseFloat(item.rate) || 0;
    const mc = parseFloat(item.making_charges) || 0;
    const discount = parseFloat(item.discount) || 0;
    return (weight + wastageWt) * rate + mc - discount;
  };

  const taxableAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const grossTotal = cart.reduce((acc, item) => {
     const weight = parseFloat(item.gross_weight) || 0;
     const wastageWt = parseFloat(item.wastage_weight) || 0; 
     const rate = parseFloat(item.rate) || 0;
     const mc = parseFloat(item.making_charges) || 0;
     return acc + ((weight + wastageWt) * rate) + mc;
  }, 0);
  const totalDiscount = cart.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);
  
  const sgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  const cgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  const totalWithTax = taxableAmount + sgstAmount + cgstAmount;
  const netPayable = Math.round(totalWithTax / 10) * 10;
  const roundOff = netPayable - totalWithTax;

  const handlePrintBill = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (!customer.name) return alert("Customer Name required");

    const billData = {
      customer,
      items: cart.map(item => ({
        item_id: item.item_id, 
        // Combine Name + Desc for Invoice
        item_name: item.item_desc ? `${item.item_name} (${item.item_desc})` : item.item_name,
        gross_weight: item.gross_weight, rate: item.rate, making_charges: item.making_charges,
        total: Math.round(calculateItemTotal(item))
      })),
      totals: { grossTotal, totalDiscount, taxableAmount, sgst: sgstAmount, cgst: cgstAmount, roundOff, netPayable },
      includeGST
    };

    try {
      const res = await api.createBill(billData);
      alert(`Saved! Invoice #${res.data.invoice_id}`);
      setCart([]); setCustomer({ name: '', phone: '', address: '' });
    } catch (err) { alert("Error"); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleManualAdd(); };

  return (
    <div className="container-fluid pb-5">
      <div className="row g-3">
        {/* CUSTOMER */}
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

        {/* BILLING AREA */}
        <div className="col-md-9">
          
          {/* --- QUICK ADD BAR --- */}
          <div className="card shadow-sm mb-3 border-primary border-2">
            <div className="card-body">
               {/* Row 1: Search & Rates */}
               <div className="d-flex gap-3 mb-2 align-items-center">
                  <div className="flex-grow-1 position-relative" ref={searchRef}>
                     <div className="input-group">
                        <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
                        <input 
                            className="form-control border-start-0 ps-0 fw-bold" 
                            placeholder="Type Item Name here (e.g. Ring)..." 
                            value={entry.item_name} 
                            onChange={e => handleEntryChange('item_name', e.target.value)} 
                            autoFocus 
                        />
                     </div>
                     {searchResults.length > 0 && (
                        <div className="position-absolute w-100 mt-1 shadow bg-white rounded overflow-hidden" style={{zIndex: 1000, maxHeight: '300px', overflowY: 'auto'}}>
                          {searchResults.map(item => (
                            <button key={item.id} className="list-group-item list-group-item-action d-flex align-items-center p-2" onClick={() => selectItem(item)}>
                              {item.item_image ? <img src={item.item_image} className="rounded me-3 border" style={{width:'40px', height:'40px', objectFit:'cover'}} /> : <div className="bg-light rounded me-3 d-flex align-items-center justify-content-center" style={{width:'40px', height:'40px'}}><i className="bi bi-gem text-muted"></i></div>}
                              <div className="flex-grow-1 text-start"><div className="fw-bold">{item.item_name}</div><div className="small text-muted">{item.barcode}</div></div>
                              <span className={`badge ${item.metal_type==='GOLD'?'bg-warning text-dark':'bg-secondary'}`}>{item.gross_weight}g</span>
                            </button>
                          ))}
                        </div>
                     )}
                  </div>
                  <div className="d-flex gap-2">
                    <div className="input-group input-group-sm" style={{width:'140px'}}><span className="input-group-text bg-warning bg-opacity-25 border-warning text-dark fw-bold">GOLD</span><input type="number" className="form-control fw-bold text-primary" value={rates.GOLD} onChange={e => setRates({...rates, GOLD: e.target.value})} /></div>
                    <div className="input-group input-group-sm" style={{width:'140px'}}><span className="input-group-text bg-secondary bg-opacity-25 border-secondary text-dark fw-bold">SILVER</span><input type="number" className="form-control fw-bold text-secondary" value={rates.SILVER} onChange={e => setRates({...rates, SILVER: e.target.value})} /></div>
                  </div>
               </div>

               {/* Row 2: Inputs */}
               <div className="row g-2 align-items-end">
                  <div className="col-md-2">
                     <label className="small fw-bold text-muted">Metal</label>
                     <select className="form-select form-select-sm fw-bold" value={entry.metal_type} onChange={e => handleEntryChange('metal_type', e.target.value)}><option>GOLD</option><option>SILVER</option></select>
                  </div>
                  <div className="col-md-2">
                     <label className="small fw-bold text-muted">Detail / NickID</label>
                     <input className="form-control form-control-sm" placeholder="e.g. RJ" value={entry.item_desc} onChange={e => handleEntryChange('item_desc', e.target.value)} onKeyDown={handleKeyDown} />
                  </div>
                  <div className="col-md-2">
                     <label className="small fw-bold text-muted">Weight (g)</label>
                     <input type="number" className="form-control form-control-sm" placeholder="0.000" value={entry.gross_weight} onChange={e => handleEntryChange('gross_weight', e.target.value)} onKeyDown={handleKeyDown} />
                  </div>
                  <div className="col-md-1">
                     <label className="small fw-bold text-muted">Wst%</label>
                     <input type="number" className="form-control form-control-sm" placeholder="0" value={entry.wastage_percent} onChange={e => handleEntryChange('wastage_percent', e.target.value)} onKeyDown={handleKeyDown} />
                  </div>
                  <div className="col-md-2">
                     <label className="small fw-bold text-muted">MC (₹)</label>
                     <input type="number" className="form-control form-control-sm" placeholder="0" value={entry.making_charges} onChange={e => handleEntryChange('making_charges', e.target.value)} onKeyDown={handleKeyDown} />
                  </div>
                  <div className="col-md-3">
                     <button className="btn btn-primary btn-sm w-100 fw-bold" style={{height: '31px', marginTop: '23px'}} onClick={handleManualAdd}><i className="bi bi-plus-lg me-2"></i>ADD MANUAL ITEM</button>
                  </div>
               </div>
            </div>
          </div>

          {/* CART TABLE */}
          <div className="card shadow-sm border-0 mb-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-center">
                  <tr><th style={{width: '5%'}}></th><th style={{width: '25%'}} className="text-start">Item</th><th style={{width: '8%'}}>Wt</th><th style={{width: '15%'}}>Wastage</th><th style={{width: '10%'}}>MC</th><th style={{width: '12%'}}>Rate</th><th style={{width: '10%'}}>Disc</th><th style={{width: '12%'}}>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="text-center">
                      <td>{item.item_image ? <img src={item.item_image} className="rounded" style={{width:'35px', height:'35px', objectFit:'cover'}} /> : <i className="bi bi-gem text-muted opacity-25 fs-4"></i>}</td>
                      <td className="text-start">
                        <div className="fw-bold text-dark small text-truncate" style={{maxWidth: '200px'}}>{item.item_name}</div>
                        <div className="d-flex gap-2">
                           {item.isManual && <span className="badge bg-secondary text-white" style={{fontSize:'0.6rem'}}>MANUAL</span>}
                           {item.item_desc && <span className="text-muted small fst-italic" style={{fontSize:'0.75rem'}}>{item.item_desc}</span>}
                        </div>
                      </td>
                      <td className="fw-bold">{item.gross_weight}</td>
                      <td><div className="input-group input-group-sm"><input type="number" className="form-control text-center px-1" placeholder="%" value={item.wastage_percent} onChange={e => updateCartItem(i, 'wastage_percent', e.target.value)} /><span className="input-group-text px-1 text-muted">|</span><input type="number" className="form-control text-center px-1 bg-light" placeholder="g" value={item.wastage_weight} onChange={e => updateCartItem(i, 'wastage_weight', e.target.value)} /></div></td>
                      <td><input type="number" className="form-control form-control-sm text-center p-1" value={item.making_charges} onChange={e => updateCartItem(i, 'making_charges', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-center p-1 fw-bold text-primary" value={item.rate} onChange={e => updateCartItem(i, 'rate', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm text-center p-1 text-danger" value={item.discount} onChange={e => updateCartItem(i, 'discount', e.target.value)} /></td>
                      <td className="fw-bold text-success">{Math.round(calculateItemTotal(item)).toLocaleString()}</td>
                      <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(i)}><i className="bi bi-x-lg"></i></button></td>
                    </tr>
                  ))}
                  {cart.length===0 && <tr><td colSpan="9" className="text-center py-5 text-muted">Cart is empty</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTALS */}
          {cart.length > 0 && (
            <div className="row justify-content-end">
              <div className="col-md-5">
                <div className="card shadow-sm bg-light">
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-1 text-muted small"><span>Gross Total:</span><span className="fw-bold">₹{Math.round(grossTotal).toLocaleString()}</span></div>
                    <div className="d-flex justify-content-between mb-2 text-danger small"><span>Total Discount:</span><span>- ₹{totalDiscount.toLocaleString()}</span></div>
                    
                    <div className="form-check form-switch mb-2"><input className="form-check-input" type="checkbox" id="gstSwitch" checked={includeGST} onChange={e => setIncludeGST(e.target.checked)} /><label className="form-check-label fw-bold small" htmlFor="gstSwitch">Include GST (3%)</label></div>
                    {includeGST && (<div className="bg-white p-2 rounded border mb-2 small"><div className="d-flex justify-content-between mb-1 text-secondary"><span>Taxable:</span><span>₹{Math.round(taxableAmount).toLocaleString()}</span></div><div className="d-flex justify-content-between mb-1"><span>SGST:</span><span>+ ₹{sgstAmount.toFixed(2)}</span></div><div className="d-flex justify-content-between mb-1"><span>CGST:</span><span>+ ₹{cgstAmount.toFixed(2)}</span></div><div className="d-flex justify-content-between text-muted fst-italic"><span>Round Off:</span><span>{roundOff.toFixed(2)}</span></div></div>)}
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between align-items-center"><span className="fs-5 fw-bold text-dark">{includeGST?'Net Payable':'Payable'}:</span><span className="fs-3 fw-bold text-success">₹{netPayable.toLocaleString()}</span></div>
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