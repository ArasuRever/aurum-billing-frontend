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
  const [rates, setRates] = useState({ GOLD: 7000, SILVER: 85 });
  
  // --- CUSTOMER STATE ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });

  // --- ENTRY & CART STATE ---
  const [entry, setEntry] = useState({
    item_id: null, 
    item_name: '', 
    item_desc: '', 
    barcode: '',
    metal_type: 'GOLD', 
    gross_weight: '', 
    wastage_percent: '', 
    making_charges: '', 
    item_image: null,
    neighbour_id: null 
  });

  // --- EXCHANGE STATE (UPDATED) ---
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [editingExchangeIndex, setEditingExchangeIndex] = useState(null); // To edit existing items
  const [exchangeEntry, setExchangeEntry] = useState({
    name: '', 
    metal_type: 'GOLD', 
    gross_weight: '', 
    less_percent: '', 
    less_weight: '', 
    net_weight: 0, 
    rate: '', 
    total: 0
  });
  const [exchangeItems, setExchangeItems] = useState([]);

  // --- GENERAL STATE ---
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [shops, setShops] = useState([]); 
  const [includeGST, setIncludeGST] = useState(false);
  const [paidAmount, setPaidAmount] = useState(''); 
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  const searchRef = useRef(null);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);
    api.getShops().then(res => setShops(res.data)).catch(console.error);
    return () => document.head.removeChild(styleSheet);
  }, []);

  // --- CUSTOMER SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (customerSearch.length > 2 && !selectedCustomer) {
        try { const res = await api.searchCustomer(customerSearch); setCustomerResults(res.data); } catch (err) {}
      } else { setCustomerResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [customerSearch, selectedCustomer]);

  const selectCustomer = (cust) => { setSelectedCustomer(cust); setCustomerSearch(''); setCustomerResults([]); };
  const clearCustomer = () => { setSelectedCustomer(null); setCustomerSearch(''); };
  const handleAddCustomer = async () => {
    if(!newCustomer.name || !newCustomer.phone) return alert("Name and Phone required");
    try {
        const res = await api.addCustomer(newCustomer);
        selectCustomer(res.data); 
        setShowCustomerModal(false);
        setNewCustomer({ name: '', phone: '', address: '' });
    } catch(err) { alert(err.response?.data?.error || "Error adding customer"); }
  };

  // --- ITEM SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (entry.item_name.length > 1 && !entry.item_id) {
        try { const res = await api.searchBillingItem(entry.item_name); setSearchResults(res.data); } catch (err) {}
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [entry.item_name, entry.item_id]);

  // --- CART HANDLERS ---
  const handleEntryChange = (field, value) => {
    let finalValue = value;
    let updates = { [field]: finalValue };
    
    if (field === 'item_name' && entry.item_id) { 
        updates.item_id = null; updates.barcode = ''; updates.item_image = null; updates.neighbour_id = null; 
    }

    if (field === 'item_desc') {
        const upper = finalValue.toUpperCase();
        const matchedShop = shops.find(s => s.nick_id && (upper === s.nick_id || upper.startsWith(s.nick_id + ' ')));
        if (matchedShop) { 
            updates.neighbour_id = matchedShop.id; 
            if (upper === matchedShop.nick_id) updates[field] = `${matchedShop.nick_id} - `; 
        } else {
            updates.neighbour_id = null;
        }
    }
    setEntry(prev => ({ ...prev, ...updates }));
  };

  const performAddToCart = (itemToAdd) => {
    if (itemToAdd.item_id && cart.find(c => c.item_id === itemToAdd.item_id)) return alert("Item already in cart.");
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
      total: 0,
      neighbour_id: itemToAdd.neighbour_id 
    };
    
    setCart(prev => [...prev, newItem]);
    setEntry({ 
        item_id: null, item_name: '', item_desc: '', barcode: '', 
        metal_type: entry.metal_type, gross_weight: '', wastage_percent: '', 
        making_charges: '', item_image: null, neighbour_id: null 
    });
  };

  const selectItem = (item) => { setSearchResults([]); performAddToCart({ ...item, item_id: item.id, item_desc: '' }); };
  const handleManualAdd = () => {
    let finalName = entry.item_name || entry.item_desc;
    if (!finalName || !entry.gross_weight) return alert("Name & Weight Required");
    performAddToCart({ ...entry, item_name: finalName });
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
    } else { item[field] = value; }
    setCart(newCart);
  };

  // --- NEW: EXCHANGE MODAL HANDLERS ---
  const openExchangeModal = (index = null) => {
    if (index !== null) {
      setEditingExchangeIndex(index);
      setExchangeEntry(exchangeItems[index]);
    } else {
      setEditingExchangeIndex(null);
      // Reset with default rate based on Metal Type
      setExchangeEntry({ 
        name: 'Old Gold', 
        metal_type: 'GOLD', 
        gross_weight: '', 
        less_percent: '', 
        less_weight: '', 
        net_weight: 0, 
        rate: rates.GOLD, 
        total: 0 
      });
    }
    setShowExchangeModal(true);
  };

  const handleExchangeFormChange = (field, value) => {
    const newData = { ...exchangeEntry, [field]: value };
    
    // Auto-update Rate if metal type changes (only if user hasn't manually set a weird rate)
    if (field === 'metal_type') {
       newData.rate = value === 'SILVER' ? rates.SILVER : rates.GOLD;
    }

    // Calculations
    const gross = parseFloat(field === 'gross_weight' ? value : newData.gross_weight) || 0;
    
    if (field === 'less_percent') {
        const pct = parseFloat(value) || 0;
        newData.less_weight = (gross * (pct / 100)).toFixed(3);
    } else if (field === 'less_weight') {
        const wt = parseFloat(value) || 0;
        newData.less_percent = gross > 0 ? ((wt / gross) * 100).toFixed(2) : 0;
    } else if (field === 'gross_weight') {
        // Recalculate weight deduction based on existing percent
        const pct = parseFloat(newData.less_percent) || 0;
        newData.less_weight = (parseFloat(value) * (pct / 100)).toFixed(3);
    }

    const lessWt = parseFloat(newData.less_weight) || 0;
    const netWt = gross - lessWt;
    newData.net_weight = netWt > 0 ? netWt.toFixed(3) : 0;
    
    const rate = parseFloat(field === 'rate' ? value : newData.rate) || 0;
    const totalVal = Math.round(parseFloat(newData.net_weight) * rate);
    newData.total = isNaN(totalVal) ? 0 : totalVal;

    setExchangeEntry(newData);
  };

  const saveExchangeItem = () => {
    if (!exchangeEntry.name || !exchangeEntry.gross_weight || !exchangeEntry.rate) return alert("Name, Weight and Rate are required");
    
    if (editingExchangeIndex !== null) {
      // Update existing
      const updated = [...exchangeItems];
      updated[editingExchangeIndex] = exchangeEntry;
      setExchangeItems(updated);
    } else {
      // Add new
      setExchangeItems([...exchangeItems, { ...exchangeEntry, id: Date.now() }]);
    }
    setShowExchangeModal(false);
  };

  const removeExchangeItem = (index) => {
      setExchangeItems(exchangeItems.filter((_, i) => i !== index));
  };

  // --- TOTALS & SAVING ---
  const calculateItemTotal = (item) => {
    const weight = parseFloat(item.gross_weight) || 0;
    const wastageWt = parseFloat(item.wastage_weight) || 0; 
    const rate = parseFloat(item.rate) || 0;
    const mc = parseFloat(item.making_charges) || 0;
    const discount = parseFloat(item.discount) || 0;
    return (weight + wastageWt) * rate + mc - discount;
  };
  const taxableAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const grossTotal = cart.reduce((acc, item) => acc + ((parseFloat(item.gross_weight)||0) + (parseFloat(item.wastage_weight)||0)) * (parseFloat(item.rate)||0) + (parseFloat(item.making_charges)||0), 0);
  const totalDiscount = cart.reduce((acc, item) => acc + (parseFloat(item.discount) || 0), 0);
  const sgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  const cgstAmount = includeGST ? (taxableAmount * 0.015) : 0;
  const billTotalWithTax = taxableAmount + sgstAmount + cgstAmount;
  const exchangeTotal = exchangeItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
  const netPayableRaw = billTotalWithTax - exchangeTotal;
  const netPayable = Math.round(netPayableRaw / 10) * 10;
  const roundOff = netPayable - netPayableRaw;

  const cashReceived = paidAmount === '' ? netPayable : parseFloat(paidAmount);
  const balancePending = netPayable - cashReceived;

  const handleSaveAndPrint = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (!selectedCustomer) return alert("Please select a Customer first");
    if (balancePending > 0) {
        if (!window.confirm(`⚠️ PARTIAL PAYMENT DETECTED\n\nBalance Pending: ₹${balancePending.toLocaleString()}\n\nProceed?`)) return;
    }

    const billData = {
      customer: selectedCustomer,
      items: cart.map(item => ({
        item_id: item.item_id, 
        item_name: item.item_desc ? `${item.item_name} (${item.item_desc})` : item.item_name,
        metal_type: item.metal_type,
        gross_weight: item.gross_weight, 
        rate: item.rate, 
        making_charges: item.making_charges,
        wastage_weight: item.wastage_weight, 
        neighbour_id: item.neighbour_id,
        total: Math.round(calculateItemTotal(item))
      })),
      exchangeItems, 
      totals: { 
          grossTotal, totalDiscount, taxableAmount, sgst: sgstAmount, cgst: cgstAmount, 
          exchangeTotal, roundOff, netPayable,
          paidAmount: cashReceived,
          balance: balancePending
      },
      includeGST
    };

    try {
      const res = await api.createBill(billData);
      setLastBill({ invoice_id: res.data.invoice_id, date: new Date().toLocaleString(), ...billData });
      setShowInvoice(true);
      setCart([]); setExchangeItems([]); clearCustomer(); setPaidAmount('');
    } catch (err) { alert(`Error: ${err.response?.data?.error || err.message}`); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleManualAdd(); };

  return (
    <div className="container-fluid pb-5">
      <div className="row g-3">
        {/* LEFT COLUMN: CUSTOMER & CART */}
        <div className="col-md-9">
          
          {/* CUSTOMER SEARCH / CARD */}
          <div className="row g-3 mb-3">
             {!selectedCustomer && (
                 <div className="col-md-12">
                     <div className="card shadow-sm border-primary border-2">
                        <div className="card-body">
                           <h5 className="card-title text-primary"><i className="bi bi-person-bounding-box me-2"></i>Find Customer</h5>
                           <div className="position-relative">
                             <div className="input-group">
                               <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                               <input className="form-control form-control-lg" placeholder="Enter Mobile Number or Name..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} autoFocus />
                             </div>
                             {customerResults.length > 0 && (
                                 <div className="position-absolute w-100 mt-1 shadow bg-white rounded overflow-hidden" style={{zIndex: 1000}}>
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
             )}
             {selectedCustomer && (
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

          {/* ADD ITEM CARD */}
          <div className="card shadow-sm mb-3 border-primary border-2">
            <div className="card-body py-2">
               <div className="d-flex gap-3 mb-2 align-items-center">
                  <div className="flex-grow-1 position-relative" ref={searchRef}>
                     <div className="input-group input-group-sm"><span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span><input className="form-control border-start-0 ps-0 fw-bold" placeholder="Scan Barcode or Type Item Name..." value={entry.item_name} onChange={e => handleEntryChange('item_name', e.target.value)} /></div>
                     {searchResults.length > 0 && (<div className="position-absolute w-100 mt-1 shadow bg-white rounded overflow-hidden" style={{zIndex: 1000, maxHeight:'300px', overflowY:'auto'}}>{searchResults.map(item => (<button key={item.id} className="list-group-item list-group-item-action d-flex align-items-center p-2" onClick={() => selectItem(item)}><div className="fw-bold">{item.item_name}</div></button>))}</div>)}
                  </div>
                  <div className="d-flex gap-2">
                    <div className="input-group input-group-sm" style={{width:'100px'}}><span className="input-group-text bg-warning text-dark fw-bold">Au</span><input type="number" className="form-control fw-bold text-primary px-1" value={rates.GOLD} onChange={e => setRates({...rates, GOLD: e.target.value})} /></div>
                    <div className="input-group input-group-sm" style={{width:'100px'}}><span className="input-group-text bg-secondary text-white fw-bold">Ag</span><input type="number" className="form-control fw-bold text-secondary px-1" value={rates.SILVER} onChange={e => setRates({...rates, SILVER: e.target.value})} /></div>
                  </div>
               </div>
               <div className="row g-2 align-items-end">
                  <div className="col-md-2"><label className="small fw-bold text-muted">Metal</label><select className="form-select form-select-sm fw-bold" value={entry.metal_type} onChange={e => handleEntryChange('metal_type', e.target.value)}><option>GOLD</option><option>SILVER</option></select></div>
                  <div className="col-md-2"><label className="small fw-bold text-muted">NickID</label><input className="form-control form-control-sm" placeholder="e.g. RJ" value={entry.item_desc} onChange={e => handleEntryChange('item_desc', e.target.value)} onKeyDown={handleKeyDown} /></div>
                  <div className="col-md-2"><label className="small fw-bold text-muted">Weight (g)</label><input type="number" className="form-control form-control-sm" placeholder="0.000" value={entry.gross_weight} onChange={e => handleEntryChange('gross_weight', e.target.value)} onKeyDown={handleKeyDown} /></div>
                  <div className="col-md-1"><label className="small fw-bold text-muted">Wst%</label><input type="number" className="form-control form-control-sm" placeholder="0" value={entry.wastage_percent} onChange={e => handleEntryChange('wastage_percent', e.target.value)} onKeyDown={handleKeyDown} /></div>
                  <div className="col-md-2"><label className="small fw-bold text-muted">MC (₹)</label><input type="number" className="form-control form-control-sm" placeholder="0" value={entry.making_charges} onChange={e => handleEntryChange('making_charges', e.target.value)} onKeyDown={handleKeyDown} /></div>
                  <div className="col-md-3"><button className="btn btn-primary btn-sm w-100 fw-bold" onClick={handleManualAdd}>ADD ITEM</button></div>
               </div>
            </div>
          </div>

          {/* CART TABLE */}
          <div className="card shadow-sm border-0 mb-3">
             <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-center">
                  <tr><th>Item</th><th>Wt</th><th>Wastage</th><th>MC</th><th>Rate</th><th>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={i} className="text-center">
                      <td className="text-start"><div className="fw-bold">{item.item_name}</div><div className="small text-muted">{item.item_id || 'MANUAL'}</div></td>
                      <td className="fw-bold">{item.gross_weight}</td>
                      <td>{item.wastage_percent}% ({item.wastage_weight}g)</td>
                      <td>{item.making_charges}</td>
                      <td>{item.rate}</td>
                      <td className="fw-bold text-success">{Math.round(calculateItemTotal(item)).toLocaleString()}</td>
                      <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(i)}><i className="bi bi-x-lg"></i></button></td>
                    </tr>
                  ))}
                  {cart.length===0 && <tr><td colSpan="7" className="text-center py-5 text-muted">Cart is empty</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* EXCHANGE SECTION (REVAMPED) */}
          <div className="card shadow-sm border-0 mb-3 bg-light">
             <div className="card-header bg-secondary text-white py-2 d-flex justify-content-between align-items-center">
                <span className="small fw-bold"><i className="bi bi-arrow-repeat me-2"></i>Exchange / Old Gold</span>
                <button className="btn btn-sm btn-light text-secondary fw-bold" onClick={() => openExchangeModal(null)}>+ Add Old Gold</button>
             </div>
             <div className="card-body p-0">
                {exchangeItems.length > 0 ? (
                   <table className="table table-hover mb-0">
                      <thead className="table-secondary"><tr><th>Item</th><th>Type</th><th>Gross Wt</th><th>Deduction</th><th>Net Wt</th><th>Rate</th><th>Total</th><th></th></tr></thead>
                      <tbody>
                         {exchangeItems.map((item, i) => (
                            <tr key={i} style={{cursor: 'pointer'}} onClick={() => openExchangeModal(i)}>
                               <td>{item.name}</td>
                               <td><span className={`badge ${item.metal_type==='GOLD'?'bg-warning text-dark':'bg-secondary'}`}>{item.metal_type}</span></td>
                               <td>{item.gross_weight}</td>
                               <td className="text-danger">-{item.less_weight}g <small>({item.less_percent}%)</small></td>
                               <td className="fw-bold">{item.net_weight}</td>
                               <td>{item.rate}</td>
                               <td className="fw-bold text-success">{item.total}</td>
                               <td onClick={e => e.stopPropagation()}><button className="btn btn-sm text-danger" onClick={() => removeExchangeItem(i)}>&times;</button></td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                ) : (
                    <div className="text-center py-3 text-muted small">No Old Gold added. Click "+ Add Old Gold" to exchange.</div>
                )}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="col-md-3">
            <div className="card shadow-sm bg-white h-100 border-0">
                <div className="card-header bg-dark text-white text-center py-3"><h5 className="mb-0">SUMMARY</h5></div>
                <div className="card-body d-flex flex-column justify-content-between p-3">
                    <div className="mb-4">
                        <div className="d-flex justify-content-between mb-2"><span className="text-muted">Gross Sale</span><span className="fw-bold">₹{Math.round(grossTotal).toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-2 text-danger"><span>Discount</span><span>- ₹{totalDiscount.toLocaleString()}</span></div>
                        {includeGST && (<div className="bg-light p-2 rounded mb-2 small border"><div className="d-flex justify-content-between"><span>SGST (1.5%)</span><span>+ {sgstAmount.toFixed(2)}</span></div><div className="d-flex justify-content-between"><span>CGST (1.5%)</span><span>+ {cgstAmount.toFixed(2)}</span></div></div>)}
                        <div className="d-flex justify-content-between mb-3 pt-2 border-top"><span className="fw-bold">Bill Total</span><span className="fw-bold">₹{Math.round(billTotalWithTax).toLocaleString()}</span></div>
                        {exchangeTotal > 0 && (<div className="alert alert-success p-2 mb-0"><div className="d-flex justify-content-between"><span className="small fw-bold">Less Exchange</span><span className="fw-bold">- ₹{exchangeTotal.toLocaleString()}</span></div></div>)}
                    </div>
                    <div className="mt-auto">
                        <div className="text-center mb-3 p-3 bg-light rounded border">
                            <small className="text-muted text-uppercase d-block mb-1">Net Payable</small>
                            <h2 className="text-success fw-bold display-6 mb-0">₹{netPayable.toLocaleString()}</h2>
                        </div>
                        <div className="mb-3">
                            <label className="small fw-bold text-muted">Cash Received</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white fw-bold text-success">₹</span>
                                <input type="number" className="form-control fw-bold fs-5 text-end" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-check form-switch mb-3 text-center"><input className="form-check-input float-none me-2" type="checkbox" checked={includeGST} onChange={e => setIncludeGST(e.target.checked)} /><label className="form-check-label small fw-bold">Include GST Bill</label></div>
                        <button className="btn btn-success w-100 py-3 fw-bold shadow-sm" onClick={handleSaveAndPrint}><i className="bi bi-printer-fill me-2"></i> SAVE & PRINT</button>
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

      {/* NEW: EXCHANGE ITEM MODAL */}
      {showExchangeModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
           <div className="modal-dialog">
              <div className="modal-content">
                 <div className="modal-header bg-secondary text-white">
                    <h5 className="modal-title">{editingExchangeIndex !== null ? 'Edit Old Gold' : 'Add Old Gold / Silver'}</h5>
                    <button className="btn-close btn-close-white" onClick={() => setShowExchangeModal(false)}></button>
                 </div>
                 <div className="modal-body">
                    <div className="mb-3">
                        <label className="form-label small fw-bold">Item Description</label>
                        <input className="form-control" placeholder="e.g. Old Chain" value={exchangeEntry.name} onChange={e => handleExchangeFormChange('name', e.target.value)} autoFocus />
                    </div>
                    <div className="row g-2 mb-3">
                        <div className="col-6">
                            <label className="form-label small fw-bold">Metal Type</label>
                            <select className="form-select" value={exchangeEntry.metal_type} onChange={e => handleExchangeFormChange('metal_type', e.target.value)}>
                                <option value="GOLD">GOLD</option>
                                <option value="SILVER">SILVER</option>
                            </select>
                        </div>
                        <div className="col-6">
                            <label className="form-label small fw-bold">Gross Weight (g)</label>
                            <input type="number" className="form-control" placeholder="0.000" value={exchangeEntry.gross_weight} onChange={e => handleExchangeFormChange('gross_weight', e.target.value)} />
                        </div>
                    </div>
                    
                    <label className="form-label small fw-bold text-danger">Deductions (Stones / Dust)</label>
                    <div className="input-group mb-3">
                        <span className="input-group-text text-muted small">Less %</span>
                        <input type="number" className="form-control" placeholder="0" value={exchangeEntry.less_percent} onChange={e => handleExchangeFormChange('less_percent', e.target.value)} />
                        <span className="input-group-text text-muted small">OR Less Wt</span>
                        <input type="number" className="form-control" placeholder="0.000" value={exchangeEntry.less_weight} onChange={e => handleExchangeFormChange('less_weight', e.target.value)} />
                    </div>

                    <div className="row g-2 mb-3 bg-light p-2 rounded border mx-0">
                        <div className="col-6">
                            <label className="form-label small fw-bold text-primary">Net Weight</label>
                            <input type="number" className="form-control fw-bold bg-white" disabled value={exchangeEntry.net_weight} />
                        </div>
                        <div className="col-6">
                            <label className="form-label small fw-bold text-primary">Rate / gram</label>
                            <input type="number" className="form-control fw-bold" value={exchangeEntry.rate} onChange={e => handleExchangeFormChange('rate', e.target.value)} />
                        </div>
                    </div>

                    <div className="alert alert-success text-center mb-0">
                        <small className="text-uppercase fw-bold text-muted">Exchange Value</small>
                        <h3 className="fw-bold mb-0">₹{exchangeEntry.total}</h3>
                    </div>
                 </div>
                 <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowExchangeModal(false)}>Cancel</button>
                    <button className="btn btn-success fw-bold px-4" onClick={saveExchangeItem}>{editingExchangeIndex !== null ? 'Update Item' : 'Add Item'}</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* INVOICE PREVIEW MODAL */}
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