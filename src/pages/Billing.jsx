import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import InvoiceTemplate from '../components/InvoiceTemplate';

// --- PRINT CSS ---
const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #printable-invoice, #printable-invoice * { visibility: visible; }
    #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; color: black; }
    .btn-close, .modal-footer, .no-print { display: none !important; }
  }
`;

function Billing() {
  const [rates, setRates] = useState({ GOLD: 0, SILVER: 0 });
  const [masterItems, setMasterItems] = useState([]); 
  
  // --- CUSTOMER STATE ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });

  // --- ENTRY STATE (Main Billing) ---
  const [entry, setEntry] = useState({
    item_id: null, item_name: '', item_desc: '', barcode: '',
    metal_type: 'GOLD', gross_weight: '', wastage_percent: '', making_charges: '', 
    item_image: null, neighbour_id: null, calc_method: 'STANDARD', fixed_price: 0
  });

  // --- EXCHANGE STATE (Inline Form) ---
  const [exchangeEntry, setExchangeEntry] = useState({
    name: '', metal_type: 'GOLD', gross_weight: '', 
    less_percent: '', less_weight: '', net_weight: 0, 
    rate: '', total: 0
  });
  const [exchangeItems, setExchangeItems] = useState([]);

  // --- GENERAL STATE ---
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [shops, setShops] = useState([]); 
  const [includeGST, setIncludeGST] = useState(false);
  
  // --- PAYMENT & INVOICE STATE ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payment, setPayment] = useState({ cash: '', online: '' });
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  const searchRef = useRef(null);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);
    
    api.getShops().then(res => setShops(res.data)).catch(console.error);
    api.getDailyRates().then(res => {
        if(res.data) setRates(prev => ({ ...prev, ...res.data }));
    }).catch(console.error);
    api.getMasterItems().then(res => setMasterItems(res.data)).catch(console.error);

    return () => document.head.removeChild(styleSheet);
  }, []);

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (customerSearch.length > 2 && !selectedCustomer) {
        try { const res = await api.searchCustomer(customerSearch); setCustomerResults(res.data); } catch (err) {}
      } else { setCustomerResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [customerSearch, selectedCustomer]);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (entry.item_name.length > 1 && !entry.item_id) {
        try { const res = await api.searchBillingItem(entry.item_name); setSearchResults(res.data); } catch (err) {}
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [entry.item_name, entry.item_id]);

  const selectCustomer = (cust) => { setSelectedCustomer(cust); setCustomerSearch(''); setCustomerResults([]); };
  const clearCustomer = () => { setSelectedCustomer(null); setCustomerSearch(''); };
  
  const handleAddCustomer = async () => {
    if(!newCustomer.name || !newCustomer.phone) return alert("Name/Phone required");
    try {
        const res = await api.addCustomer(newCustomer);
        selectCustomer(res.data); 
        setShowCustomerModal(false);
        setNewCustomer({ name: '', phone: '', address: '' });
    } catch(err) { alert(err.response?.data?.error || "Error adding customer"); }
  };

  // --- CART HANDLERS ---
  const handleEntryChange = (field, value) => {
    let updates = { [field]: value };
    if (field === 'item_name' && entry.item_id) { 
        updates.item_id = null; updates.barcode = ''; updates.item_image = null; updates.neighbour_id = null; 
    }
    if (field === 'item_desc') {
        const upper = value.toUpperCase();
        const matchedShop = shops.find(s => s.nick_id && (upper === s.nick_id || upper.startsWith(s.nick_id + ' ')));
        updates.neighbour_id = matchedShop ? matchedShop.id : null;
        if (matchedShop && upper === matchedShop.nick_id) updates[field] = `${matchedShop.nick_id} - `; 
    }
    setEntry(prev => ({ ...prev, ...updates }));
  };

  const selectItem = (item) => { 
      setSearchResults([]); 
      setEntry(prev => ({ ...prev, item_name: '', item_desc: '', gross_weight: '' }));

      const matchedRule = masterItems.find(m => m.item_name.toLowerCase() === item.item_name.toLowerCase() && m.metal_type === item.metal_type);
      
      let method = 'STANDARD', wast = item.wastage_percent || 0, mc = item.making_charges || 0, fixed = 0;

      if (matchedRule) {
          method = matchedRule.calc_method;
          if(matchedRule.default_wastage > 0) wast = matchedRule.default_wastage;
          if(method === 'FIXED_PRICE') { fixed = matchedRule.mc_value; mc = 0; }
          else if (method === 'RATE_ADD_ON') { mc = matchedRule.mc_value; }
          else {
              if(matchedRule.mc_type === 'FIXED') mc = matchedRule.mc_value;
              else if (matchedRule.mc_type === 'PER_GRAM') mc = (parseFloat(item.gross_weight || 0) * parseFloat(matchedRule.mc_value || 0)).toFixed(2);
          }
      }

      performAddToCart({
          item_id: item.id, item_name: item.item_name, barcode: item.barcode, metal_type: item.metal_type,
          gross_weight: item.gross_weight, neighbour_id: item.neighbour_shop_id || null,
          calc_method: method, wastage_percent: wast, making_charges: mc, fixed_price: fixed, item_image: item.item_image,
          default_wastage: wast 
      });
  };

  const performAddToCart = (itemToAdd) => {
    if (itemToAdd.item_id && cart.find(c => c.item_id === itemToAdd.item_id)) return alert("Item already in cart.");
    
    const gross = parseFloat(itemToAdd.gross_weight) || 0;
    const wastPct = parseFloat(itemToAdd.wastage_percent) || 0;
    const wastWt = (gross * (wastPct / 100)).toFixed(3);
    
    let appliedRate = itemToAdd.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD;
    if (itemToAdd.calc_method === 'FIXED_PRICE') appliedRate = itemToAdd.fixed_price;

    setCart(prev => [...prev, {
      ...itemToAdd,
      id: itemToAdd.item_id || `MANUAL-${Date.now()}`,
      isManual: !itemToAdd.item_id,
      wastage_weight: wastWt,
      rate: appliedRate,
      discount: '', 
      total: 0
    }]);
  };

  const handleManualAdd = () => {
    let finalName = entry.item_name || entry.item_desc;
    if (!finalName || !entry.gross_weight) return alert("Name & Weight Required");
    performAddToCart({ ...entry, item_name: finalName, default_wastage: entry.wastage_percent });
    setEntry({ item_id: null, item_name: '', item_desc: '', barcode: '', metal_type: 'GOLD', gross_weight: '', wastage_percent: '', making_charges: '', item_image: null, neighbour_id: null, calc_method: 'STANDARD', fixed_price: 0 });
  };

  // --- EDITABLE CART LOGIC ---
  const updateCartItem = (index, field, value) => {
      const newCart = [...cart];
      const item = newCart[index];
      const gross = parseFloat(item.gross_weight) || 0;

      if (field === 'wastage_percent') {
          item.wastage_percent = value;
          item.wastage_weight = (gross * (parseFloat(value || 0) / 100)).toFixed(3);
      } else if (field === 'wastage_weight') {
          item.wastage_weight = value;
          if (gross > 0) item.wastage_percent = ((parseFloat(value || 0) / gross) * 100).toFixed(2);
      } else {
          item[field] = value;
      }
      setCart(newCart);
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));
  const clearCart = () => { if(window.confirm("Clear cart?")) { setCart([]); setPayment({cash:'', online:''}); } };

  // --- CALCULATION LOGIC ---
  const calculateItemTotal = (item) => {
    const weight = parseFloat(item.gross_weight) || 0;
    const wastageWt = parseFloat(item.wastage_weight) || 0; 
    const rate = parseFloat(item.rate) || 0;
    const mc = parseFloat(item.making_charges) || 0;
    const discount = parseFloat(item.discount) || 0;

    if (item.calc_method === 'STANDARD') return ((weight + wastageWt) * rate) + mc - discount;
    if (item.calc_method === 'RATE_ADD_ON') return (weight * (rate + mc)) - discount;
    if (item.calc_method === 'FIXED_PRICE') return (weight * rate) - discount;
    return 0;
  };

  // --- EXCHANGE HANDLERS ---
  const handleExchangeEntryChange = (field, value) => {
      const newData = { ...exchangeEntry, [field]: value };
      if (field === 'metal_type') newData.rate = value === 'SILVER' ? rates.SILVER : rates.GOLD;
      
      const gross = parseFloat(field === 'gross_weight' ? value : newData.gross_weight) || 0;
      
      if (field === 'less_percent') newData.less_weight = (gross * (parseFloat(value || 0) / 100)).toFixed(3);
      else if (field === 'less_weight') newData.less_percent = gross > 0 ? ((parseFloat(value || 0) / gross) * 100).toFixed(2) : 0;
      else if (field === 'gross_weight') newData.less_weight = (parseFloat(value || 0) * (parseFloat(newData.less_percent || 0) / 100)).toFixed(3);

      const netWt = gross - (parseFloat(newData.less_weight) || 0);
      newData.net_weight = netWt > 0 ? netWt.toFixed(3) : 0;
      newData.total = Math.round(parseFloat(newData.net_weight) * (parseFloat(newData.rate) || 0));
      
      setExchangeEntry(newData);
  };

  const addExchangeItem = () => {
      if (!exchangeEntry.name || !exchangeEntry.gross_weight) return alert("Missing details");
      setExchangeItems([...exchangeItems, { ...exchangeEntry, id: Date.now() }]);
      setExchangeEntry({ ...exchangeEntry, name: '', gross_weight: '', less_percent: '', less_weight: '', net_weight: 0, total: 0 });
  };

  const updateExchangeItem = (index, field, value) => {
      const updated = [...exchangeItems];
      const item = updated[index];
      item[field] = value;
      
      const gross = parseFloat(item.gross_weight) || 0;
      if (field === 'less_percent') item.less_weight = (gross * (parseFloat(value || 0) / 100)).toFixed(3);
      else if (field === 'less_weight') item.less_percent = gross > 0 ? ((parseFloat(value || 0) / gross) * 100).toFixed(2) : 0;
      else if (field === 'gross_weight' || field === 'rate') {
           item.less_weight = (parseFloat(item.gross_weight) * (parseFloat(item.less_percent || 0) / 100)).toFixed(3);
      }
      
      const netWt = parseFloat(item.gross_weight || 0) - (parseFloat(item.less_weight) || 0);
      item.net_weight = netWt > 0 ? netWt.toFixed(3) : 0;
      item.total = Math.round(parseFloat(item.net_weight) * (parseFloat(item.rate) || 0));

      setExchangeItems(updated);
  };

  const removeExchangeItem = (index) => setExchangeItems(exchangeItems.filter((_, i) => i !== index));

  // --- TOTALS ---
  const taxableAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const totalDiscount = cart.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);
  
  const itemTotalNoDisc = (item) => {
      const weight = parseFloat(item.gross_weight) || 0;
      const wastageWt = parseFloat(item.wastage_weight) || 0; 
      const rate = parseFloat(item.rate) || 0;
      const mc = parseFloat(item.making_charges) || 0;
      if (item.calc_method === 'STANDARD') return ((weight + wastageWt) * rate) + mc;
      if (item.calc_method === 'RATE_ADD_ON') return (weight * (rate + mc));
      if (item.calc_method === 'FIXED_PRICE') return (weight * rate);
      return 0;
  };
  const grossTotal = cart.reduce((acc, item) => acc + itemTotalNoDisc(item), 0);
  
  const sgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  const cgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  const billTotalWithTax = taxableAmount + sgstAmount + cgstAmount;
  const exchangeTotal = exchangeItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
  const netPayableRaw = billTotalWithTax - exchangeTotal;
  const netPayable = Math.round(netPayableRaw / 10) * 10;
  const roundOff = netPayable - netPayableRaw;

  // --- PAYMENT CONFIRMATION LOGIC ---
  const handleConfirmSale = () => {
      if (cart.length === 0) return alert("Cart is empty");
      if (!selectedCustomer) return alert("Select Customer");
      // Default to full cash if not set
      if (!payment.cash && !payment.online) {
          setPayment({ cash: netPayable, online: '' });
      }
      setShowPaymentModal(true);
  };

  const finalizeBill = async () => {
    const cash = parseFloat(payment.cash) || 0;
    const online = parseFloat(payment.online) || 0;
    const totalPaid = cash + online;
    const balance = netPayable - totalPaid;

    const billData = {
      customer: selectedCustomer,
      items: cart.map(item => ({ ...item, total: Math.round(calculateItemTotal(item)) })),
      exchangeItems, 
      totals: { 
          grossTotal, totalDiscount, taxableAmount, 
          sgst: sgstAmount, cgst: cgstAmount, 
          exchangeTotal, roundOff, netPayable, 
          paidAmount: totalPaid, // Total Paid (Cash+Online)
          cashReceived: cash, 
          onlineReceived: online,
          balance: balance > 0 ? balance : 0 
      },
      includeGST
    };

    try {
      const res = await api.createBill(billData);
      setLastBill({ invoice_id: res.data.invoice_id, date: new Date().toLocaleString(), ...billData });
      setShowPaymentModal(false);
      setShowInvoice(true);
      setCart([]); setExchangeItems([]); clearCustomer(); setPayment({cash:'', online:''});
    } catch (err) { alert(`Error: ${err.response?.data?.error || err.message}`); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleManualAdd(); };

  // Calculate Balance for Modal Preview
  const currentTotalPaid = (parseFloat(payment.cash)||0) + (parseFloat(payment.online)||0);
  const currentBalance = netPayable - currentTotalPaid;

  return (
    <div className="container-fluid pb-5">
      <div className="row g-3">
        <div className="col-md-9">
          
          {/* 1. CUSTOMER SEARCH */}
          <div className="row g-3 mb-3">
             {!selectedCustomer ? (
                 <div className="col-md-12">
                     <div className="card shadow-sm border-primary border-2">
                        <div className="card-body">
                           <h5 className="card-title text-primary"><i className="bi bi-person-bounding-box me-2"></i>Find Customer</h5>
                           <div className="position-relative d-flex gap-2">
                             <div className="input-group">
                               <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                               <input className="form-control form-control-lg" placeholder="Mobile or Name..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} autoFocus />
                             </div>
                             <button className="btn btn-outline-primary fw-bold" onClick={() => setShowCustomerModal(true)}><i className="bi bi-person-plus-fill me-1"></i>New</button>
                             {customerResults.length > 0 && (
                                 <div className="position-absolute w-100 mt-5 shadow bg-white rounded overflow-hidden" style={{zIndex: 1000, top: '10px'}}>
                                     {customerResults.map(cust => (
                                         <button key={cust.id} className="list-group-item list-group-item-action d-flex justify-content-between p-3" onClick={() => selectCustomer(cust)}>
                                             <div><h6 className="mb-0 fw-bold">{cust.name}</h6><small className="text-muted">{cust.phone}</small></div>
                                         </button>
                                     ))}
                                 </div>
                             )}
                           </div>
                        </div>
                     </div>
                 </div>
             ) : (
                 <div className="col-md-12">
                     <div className="card shadow-sm bg-success text-white">
                        <div className="card-body d-flex justify-content-between align-items-center">
                            <div><small>BILLING TO</small><h4 className="fw-bold mb-0">{selectedCustomer.name}</h4><div><i className="bi bi-telephone me-2"></i>{selectedCustomer.phone}</div></div>
                            <button className="btn btn-light text-danger fw-bold shadow-sm" onClick={clearCustomer}>Change</button>
                        </div>
                     </div>
                 </div>
             )}
          </div>

          {/* 2. ADD ITEM (SEARCH & MANUAL) */}
          <div className="card shadow-sm mb-3 border-primary border-2">
            <div className="card-body py-2">
               {/* Search Bar */}
               <div className="d-flex gap-3 mb-2 align-items-center">
                  <div className="flex-grow-1 position-relative" ref={searchRef}>
                     <div className="input-group input-group-sm"><span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span><input className="form-control border-start-0 ps-0 fw-bold" placeholder="Scan Barcode or Type Item Name..." value={entry.item_name} onChange={e => handleEntryChange('item_name', e.target.value)} /></div>
                     {searchResults.length > 0 && (
                        <div className="position-absolute w-100 mt-1 shadow bg-white rounded overflow-hidden" style={{zIndex: 1000, maxHeight:'300px', overflowY:'auto'}}>
                            {searchResults.map(item => (
                                <button key={item.id} className="list-group-item list-group-item-action p-2 d-flex align-items-center gap-3" onClick={() => selectItem(item)}>
                                    <div style={{width:'40px', height:'40px'}} className="bg-light rounded d-flex align-items-center justify-content-center border">
                                        {item.item_image ? <img src={item.item_image} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'4px'}} /> : <i className="bi bi-box-seam text-muted"></i>}
                                    </div>
                                    <div className="flex-grow-1 text-start">
                                        <div className="fw-bold text-dark">{item.item_name}</div>
                                        <div className="small text-muted font-monospace">{item.barcode || 'NO BARCODE'}</div>
                                    </div>
                                    <div className="text-end">
                                        <span className="badge bg-light text-dark border">{item.gross_weight}g</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                     )}
                  </div>
                  {/* Live Rates */}
                  <div className="d-flex gap-2">
                    <div className="input-group input-group-sm" style={{width:'100px'}}><span className="input-group-text bg-warning text-dark fw-bold">Au</span><input className="form-control fw-bold text-primary px-1" value={rates.GOLD} disabled /></div>
                    <div className="input-group input-group-sm" style={{width:'100px'}}><span className="input-group-text bg-secondary text-white fw-bold">Ag</span><input className="form-control fw-bold text-secondary px-1" value={rates.SILVER} disabled /></div>
                  </div>
               </div>

               {/* Manual Inputs */}
               <div className="row g-2 align-items-end">
                  <div className="col-md-2"><label className="small fw-bold text-muted">Metal</label><select className="form-select form-select-sm fw-bold" value={entry.metal_type} onChange={e => handleEntryChange('metal_type', e.target.value)}><option>GOLD</option><option>SILVER</option></select></div>
                  <div className="col-md-2"><label className="small fw-bold text-muted">NickID</label><input className="form-control form-control-sm" placeholder="e.g. RJ" value={entry.item_desc} onChange={e => handleEntryChange('item_desc', e.target.value)} onKeyDown={handleKeyDown} /></div>
                  <div className="col-md-2"><label className="small fw-bold text-muted">Weight</label><input type="number" className="form-control form-control-sm" placeholder="0.000" value={entry.gross_weight} onChange={e => handleEntryChange('gross_weight', e.target.value)} onKeyDown={handleKeyDown} /></div>
                  
                  {entry.calc_method === 'STANDARD' && (<><div className="col-md-1"><label className="small fw-bold text-muted">Wst%</label><input type="number" className="form-control form-control-sm" placeholder="0" value={entry.wastage_percent} onChange={e => handleEntryChange('wastage_percent', e.target.value)} onKeyDown={handleKeyDown} /></div><div className="col-md-2"><label className="small fw-bold text-muted">MC (₹)</label><input type="number" className="form-control form-control-sm" placeholder="0" value={entry.making_charges} onChange={e => handleEntryChange('making_charges', e.target.value)} onKeyDown={handleKeyDown} /></div></>)}
                  {entry.calc_method === 'RATE_ADD_ON' && (<div className="col-md-3"><label className="small fw-bold text-info">Extra/g</label><input type="number" className="form-control form-control-sm border-info" placeholder="10" value={entry.making_charges} onChange={e => handleEntryChange('making_charges', e.target.value)} onKeyDown={handleKeyDown} /></div>)}
                  {entry.calc_method === 'FIXED_PRICE' && (<div className="col-md-3"><label className="small fw-bold text-success">Fixed/g</label><input type="number" className="form-control form-control-sm border-success fw-bold" placeholder="150" value={entry.fixed_price} onChange={e => handleEntryChange('fixed_price', e.target.value)} onKeyDown={handleKeyDown} /></div>)}

                  <div className="col-md-3"><button className="btn btn-primary btn-sm w-100 fw-bold" onClick={handleManualAdd}>MANUAL ADD</button></div>
               </div>
            </div>
          </div>

          {/* 3. CART TABLE */}
          <div className="card shadow-sm border-0 mb-3">
             <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-center">
                  <tr>
                    <th style={{width: '20%'}}>Item</th>
                    <th style={{width: '8%'}}>Weight</th>
                    <th style={{width: '18%'}}>Wastage (% / Wt)</th>
                    <th style={{width: '10%'}}>MC / Extra</th>
                    <th style={{width: '10%'}}>Rate</th>
                    <th style={{width: '10%'}}>Discount</th>
                    <th style={{width: '15%'}}>Total</th>
                    <th style={{width: '5%'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="text-center">
                      <td className="text-start">
                          <div className="fw-bold text-truncate">{item.item_name}</div>
                          {item.calc_method !== 'STANDARD' && <span className="badge bg-info text-dark" style={{fontSize:'0.6em'}}>{item.calc_method.replace('_',' ')}</span>}
                      </td>
                      <td className="fw-bold">{item.gross_weight}</td>
                      {item.calc_method === 'STANDARD' ? (
                          <td>
                              <div className="input-group input-group-sm">
                                  <input type="number" className="form-control text-center px-1" placeholder="%" 
                                      value={item.wastage_percent} onChange={e => updateCartItem(i, 'wastage_percent', e.target.value)} 
                                      title={`Default: ${item.default_wastage || 0}%`}
                                  />
                                  <input type="number" className="form-control text-center px-1 bg-light" placeholder="Wt"
                                      value={item.wastage_weight} onChange={e => updateCartItem(i, 'wastage_weight', e.target.value)} 
                                  />
                              </div>
                              {item.default_wastage && <div style={{fontSize:'0.6rem'}} className="text-muted mt-1">Default: {item.default_wastage}%</div>}
                          </td>
                      ) : (
                          <td className="text-muted">-</td>
                      )}
                      <td>
                          {item.calc_method === 'FIXED_PRICE' ? <span className="text-muted">Fixed</span> : 
                            <input type="number" className="form-control form-control-sm text-center" 
                                value={item.making_charges} onChange={e => updateCartItem(i, 'making_charges', e.target.value)} />
                          }
                      </td>
                      <td>
                           <input type="number" className="form-control form-control-sm text-center fw-bold text-primary" 
                                value={item.rate} onChange={e => updateCartItem(i, 'rate', e.target.value)} />
                      </td>
                      <td>
                          <input type="number" className="form-control form-control-sm text-center text-danger fw-bold" 
                                placeholder="0" value={item.discount} onChange={e => updateCartItem(i, 'discount', e.target.value)} />
                      </td>
                      <td className="fw-bold text-success">{Math.round(calculateItemTotal(item)).toLocaleString()}</td>
                      <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(i)}><i className="bi bi-x-lg"></i></button></td>
                    </tr>
                  ))}
                  {cart.length===0 && <tr><td colSpan="8" className="text-center py-5 text-muted">Cart is empty</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. OLD ITEM EXCHANGE */}
          <div className="card shadow-sm border-0 mb-3 bg-light">
             <div className="card-header bg-secondary text-white py-2"><span className="small fw-bold"><i className="bi bi-arrow-repeat me-2"></i>Old Item Exchange</span></div>
             <div className="card-body p-0">
                 <div className="table-responsive">
                    <table className="table table-bordered mb-0">
                        <thead className="table-secondary small text-center">
                            <tr><th>Item</th><th>Metal</th><th>Gr. Wt</th><th>Less %</th><th>Less Wt</th><th>Net Wt</th><th>Rate</th><th>Total</th><th></th></tr>
                        </thead>
                        <tbody className="align-middle">
                            {exchangeItems.map((item, i) => (
                                <tr key={item.id}>
                                    <td><input className="form-control form-control-sm" value={item.name} onChange={e => updateExchangeItem(i, 'name', e.target.value)} /></td>
                                    <td>
                                        <select className="form-select form-select-sm" value={item.metal_type} onChange={e => updateExchangeItem(i, 'metal_type', e.target.value)}>
                                            <option value="GOLD">GOLD</option><option value="SILVER">SILVER</option>
                                        </select>
                                    </td>
                                    <td><input type="number" className="form-control form-control-sm" style={{width:'80px'}} value={item.gross_weight} onChange={e => updateExchangeItem(i, 'gross_weight', e.target.value)} /></td>
                                    <td><input type="number" className="form-control form-control-sm text-danger" style={{width:'60px'}} value={item.less_percent} onChange={e => updateExchangeItem(i, 'less_percent', e.target.value)} /></td>
                                    <td><input type="number" className="form-control form-control-sm text-danger" style={{width:'70px'}} value={item.less_weight} onChange={e => updateExchangeItem(i, 'less_weight', e.target.value)} /></td>
                                    <td className="fw-bold bg-light text-center">{item.net_weight}</td>
                                    <td><input type="number" className="form-control form-control-sm" style={{width:'80px'}} value={item.rate} onChange={e => updateExchangeItem(i, 'rate', e.target.value)} /></td>
                                    <td className="fw-bold text-success text-center">{item.total}</td>
                                    <td><button className="btn btn-sm text-danger" onClick={() => removeExchangeItem(i)}>&times;</button></td>
                                </tr>
                            ))}
                            <tr className="bg-white">
                                <td><input className="form-control form-control-sm" placeholder="New Item..." value={exchangeEntry.name} onChange={e => handleExchangeEntryChange('name', e.target.value)} /></td>
                                <td>
                                    <select className="form-select form-select-sm" value={exchangeEntry.metal_type} onChange={e => handleExchangeEntryChange('metal_type', e.target.value)}>
                                        <option value="GOLD">GOLD</option><option value="SILVER">SILVER</option>
                                    </select>
                                </td>
                                <td><input type="number" className="form-control form-control-sm" placeholder="Wt" value={exchangeEntry.gross_weight} onChange={e => handleExchangeEntryChange('gross_weight', e.target.value)} /></td>
                                <td><input type="number" className="form-control form-control-sm" placeholder="%" value={exchangeEntry.less_percent} onChange={e => handleExchangeEntryChange('less_percent', e.target.value)} /></td>
                                <td><input type="number" className="form-control form-control-sm" placeholder="Less" value={exchangeEntry.less_weight} onChange={e => handleExchangeEntryChange('less_weight', e.target.value)} /></td>
                                <td className="text-center text-muted small">{exchangeEntry.net_weight || '-'}</td>
                                <td><input type="number" className="form-control form-control-sm" placeholder={exchangeEntry.rate} value={exchangeEntry.rate} onChange={e => handleExchangeEntryChange('rate', e.target.value)} /></td>
                                <td className="text-center fw-bold text-success">{exchangeEntry.total || '-'}</td>
                                <td><button className="btn btn-sm btn-success fw-bold" onClick={addExchangeItem}>+</button></td>
                            </tr>
                        </tbody>
                    </table>
                 </div>
             </div>
          </div>
        </div>

        {/* 5. SUMMARY COLUMN */}
        <div className="col-md-3">
            <div className="card shadow-sm bg-white h-100 border-0">
                <div className="card-header bg-dark text-white text-center py-3"><h5 className="mb-0">SUMMARY</h5></div>
                <div className="card-body d-flex flex-column justify-content-between p-3">
                    <div className="mb-4">
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Gross Sale</span><span className="fw-bold">₹{Math.round(grossTotal).toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-2 text-danger"><span>Total Discount</span><span>- ₹{totalDiscount.toLocaleString()}</span></div>
                        {includeGST && (<div className="bg-light p-2 rounded mb-2 small border"><div className="d-flex justify-content-between"><span>SGST (1.5%)</span><span>+ {sgstAmount.toFixed(2)}</span></div><div className="d-flex justify-content-between"><span>CGST (1.5%)</span><span>+ {cgstAmount.toFixed(2)}</span></div></div>)}
                        <div className="d-flex justify-content-between mb-3 pt-2 border-top"><span className="fw-bold">Bill Total</span><span className="fw-bold">₹{Math.round(billTotalWithTax).toLocaleString()}</span></div>
                        {exchangeTotal > 0 && (<div className="alert alert-success p-2 mb-0"><div className="d-flex justify-content-between"><span className="small fw-bold">Less Exchange</span><span className="fw-bold">- ₹{exchangeTotal.toLocaleString()}</span></div></div>)}
                    </div>
                    <div className="mt-auto">
                        <div className="text-center mb-3 p-3 bg-light rounded border">
                            <small className="text-muted text-uppercase d-block mb-1">Net Payable</small>
                            <h2 className="text-success fw-bold display-6 mb-0">₹{netPayable.toLocaleString()}</h2>
                        </div>
                        
                        <div className="form-check form-switch mb-3 text-center"><input className="form-check-input float-none me-2" type="checkbox" checked={includeGST} onChange={e => setIncludeGST(e.target.checked)} /><label className="form-check-label small fw-bold">Include GST Bill</label></div>
                        <div className="d-grid gap-2">
                            {/* CHANGED: Open Payment Modal instead of direct save */}
                            <button className="btn btn-success py-2 fw-bold shadow-sm" onClick={handleConfirmSale}><i className="bi bi-check-circle-fill me-2"></i> CONFIRM SALE</button>
                            <button className="btn btn-outline-danger btn-sm" onClick={clearCart}>Clear Cart</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white"><h5 className="modal-title">Add New Customer</h5><button className="btn-close btn-close-white" onClick={() => setShowCustomerModal(false)}></button></div>
              <div className="modal-body">
                <div className="mb-3"><label className="form-label small fw-bold">Customer Name</label><input className="form-control" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} /></div>
                <div className="mb-3"><label className="form-label small fw-bold">Mobile Number</label><input className="form-control" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button className="btn btn-primary w-100" onClick={handleAddCustomer}>Save & Select</button></div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT CONFIRMATION MODAL */}
      {showPaymentModal && (
          <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
             <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title fw-bold"><i className="bi bi-wallet2 me-2"></i>Payment Confirmation</h5>
                        <button className="btn-close btn-close-white" onClick={() => setShowPaymentModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        {/* Mini Summary */}
                        <div className="card bg-light border-0 mb-3">
                            <div className="card-body text-center py-2">
                                <small className="text-muted">Total Payable Amount</small>
                                <h2 className="text-success fw-bold m-0">₹{netPayable.toLocaleString()}</h2>
                            </div>
                        </div>

                        {/* Split Inputs */}
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Cash Received</label>
                            <div className="input-group">
                                <span className="input-group-text">₹</span>
                                <input type="number" className="form-control fw-bold" value={payment.cash} onChange={e => setPayment({...payment, cash: e.target.value})} autoFocus />
                            </div>
                        </div>
                        <div className="mb-3">
                             <label className="form-label fw-bold small text-muted">Online Payment</label>
                             <div className="input-group">
                                 <span className="input-group-text">₹</span>
                                 <input type="number" className="form-control fw-bold" value={payment.online} onChange={e => setPayment({...payment, online: e.target.value})} />
                             </div>
                        </div>

                        {/* Dynamic Balance */}
                        <div className={`alert ${currentBalance > 0 ? 'alert-danger' : 'alert-success'} d-flex justify-content-between align-items-center mb-0`}>
                            <span className="fw-bold small">{currentBalance > 0 ? 'BALANCE PENDING (CREDIT)' : 'FULL PAYMENT DONE'}</span>
                            <span className="fw-bold fs-5">₹{currentBalance > 0 ? currentBalance.toLocaleString() : '0'}</span>
                        </div>
                        {currentBalance > 0 && <small className="text-danger d-block mt-1 text-center">* This amount will be added to Customer's Pending Balance</small>}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Back</button>
                        <button className="btn btn-success fw-bold px-4" onClick={finalizeBill}>GENERATE BILL & PRINT</button>
                    </div>
                </div>
             </div>
          </div>
      )}

      {/* INVOICE PREVIEW */}
      {showInvoice && lastBill && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050}}>
           <div className="modal-dialog modal-lg">
              <div className="modal-content" style={{height: '90vh'}}>
                 <div className="modal-header bg-dark text-white"><h5 className="modal-title">Invoice Preview</h5><button className="btn-close btn-close-white" onClick={() => setShowInvoice(false)}></button></div>
                 <div className="modal-body overflow-auto p-0 bg-secondary bg-opacity-10"><InvoiceTemplate data={lastBill} /></div>
                 <div className="modal-footer bg-light"><button className="btn btn-secondary" onClick={() => setShowInvoice(false)}>Close</button><button className="btn btn-primary fw-bold" onClick={() => window.print()}><i className="bi bi-printer me-2"></i>PRINT INVOICE</button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default Billing;