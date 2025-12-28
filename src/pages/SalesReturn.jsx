import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api'; 
import InvoiceTemplate from '../components/InvoiceTemplate';

// --- STYLES ---
const styles = {
  stickySidebar: {
    position: 'sticky',
    top: '20px',
    zIndex: 100
  },
  cardHeader: {
    borderBottom: 'none',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }
};

// Print CSS
const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #printable-invoice, #printable-invoice * { visibility: visible; }
    #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; color: black; }
    .btn-close, .modal-footer, .no-print { display: none !important; }
  }
`;

function SalesReturn() {
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get('saleId');
  const navigate = useNavigate();

  // --- DATA STATE ---
  const [sale, setSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [returnSelection, setReturnSelection] = useState({}); 
  const [restoreToOwn, setRestoreToOwn] = useState({}); // Track ownership choice
  const [shops, setShops] = useState([]); 
  const [rates, setRates] = useState({ GOLD: 0, SILVER: 0 }); 

  // --- NEW ITEM ENTRY STATE ---
  const [newCart, setNewCart] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  // Input Form
  const [entry, setEntry] = useState({
    item_id: null, 
    item_name: '', 
    item_desc: '', 
    barcode: '',
    metal_type: 'GOLD', 
    gross_weight: '', 
    wastage_percent: '', 
    making_charges: '', 
    discount: '', 
    item_image: null,
    neighbour_id: null 
  });

  const [detectedShopName, setDetectedShopName] = useState(''); 
  const [liveEntryTotal, setLiveEntryTotal] = useState(0);

  // --- PRINT STATE ---
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);

    // 1. Fetch Data
    const fetchData = async () => {
        try {
            const shopsRes = await api.getShops();
            setShops(shopsRes.data);

            const ratesRes = await api.getDailyRates();
            if(ratesRes.data && (ratesRes.data.GOLD || ratesRes.data.SILVER)) {
                setRates(prev => ({ ...prev, ...ratesRes.data }));
            }

            if (saleId) {
                // CHANGED: Use centralized API call instead of hardcoded axios
                const invoiceRes = await api.getInvoiceDetails(saleId);
                setSale(invoiceRes.data.sale);
                setSaleItems(invoiceRes.data.items);
            }
        } catch (err) {
            console.error(err);
            if (!saleId) return; // Don't redirect if just loading component without ID (edge case)
            alert("Invoice not found or Error loading data");
            navigate('/bill-history');
        }
    };

    fetchData();

    return () => document.head.removeChild(styleSheet);
  }, [saleId, navigate]);

  // --- LIVE TOTAL CALC ---
  useEffect(() => {
    setLiveEntryTotal(calculateLineTotal(entry));
  }, [entry, rates]);

  // --- RETURN LOGIC ---
  const toggleReturn = (itemId) => {
    setReturnSelection(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    // Reset restore choice when toggling off
    if (returnSelection[itemId]) {
        setRestoreToOwn(prev => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    }
  };

  const toggleRestoreToOwn = (itemId) => {
      setRestoreToOwn(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // --- INPUT HANDLERS ---
  
  // 1. Search Inventory
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (entry.item_name.length > 1 && !entry.item_id) {
        try { 
            const res = await api.searchBillingItem(entry.item_name); 
            setSearchResults(res.data); 
        } catch (err) {}
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [entry.item_name, entry.item_id]);

  // 2. Handle Input Changes
  const handleEntryChange = (field, value) => {
    let finalValue = value;
    let updates = { [field]: finalValue };
    
    if (field === 'item_name' && entry.item_id) { 
        updates.item_id = null; updates.barcode = ''; updates.item_image = null; updates.neighbour_id = null; 
    }

    // Auto-fill Nick ID " - "
    if (field === 'item_desc') {
        const upper = finalValue.toUpperCase();
        const matchedShop = shops.find(s => s.nick_id && (upper === s.nick_id || upper.startsWith(s.nick_id + ' ')));

        if (matchedShop) { 
            updates.neighbour_id = matchedShop.id; 
            setDetectedShopName(matchedShop.shop_name);
            if (upper === matchedShop.nick_id) {
                updates[field] = `${matchedShop.nick_id} - `; 
            }
        } else {
            updates.neighbour_id = null;
            setDetectedShopName('');
        }
    }
    setEntry(prev => ({ ...prev, ...updates }));
  };

  // 3. Populate Form
  const selectItem = (item) => { 
      setSearchResults([]); 
      setEntry({
          ...entry,
          item_id: item.id,
          item_name: item.item_name,
          barcode: item.barcode,
          metal_type: item.metal_type,
          gross_weight: item.gross_weight,
          wastage_percent: '', 
          making_charges: '',   
          discount: '',
          neighbour_id: item.neighbour_shop_id || null,
          item_desc: ''
      });
  };

  // 4. Add to Cart
  const performAddToCart = () => {
    let finalName = entry.item_name;
    if (!finalName && entry.item_desc) finalName = entry.item_desc;

    if (!finalName || !entry.gross_weight) return alert("Name & Weight Required");

    const appliedRate = entry.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD;
    const gross = parseFloat(entry.gross_weight) || 0;
    const wastPct = parseFloat(entry.wastage_percent) || 0;
    const wastWt = (gross * (wastPct / 100)).toFixed(3);

    const newItem = {
      ...entry,
      item_name: finalName,
      id: entry.item_id || `MANUAL-${Date.now()}`,
      isManual: !entry.item_id,
      wastage_weight: wastWt,
      rate: appliedRate, 
      total: 0 // Calc dynamic
    };
    
    setNewCart(prev => [...prev, newItem]);
    
    // Reset Form
    setEntry({ 
        item_id: null, item_name: '', item_desc: '', barcode: '', 
        metal_type: entry.metal_type, gross_weight: '', wastage_percent: '', 
        making_charges: '', discount: '', 
        item_image: null, neighbour_id: null 
    });
    setDetectedShopName('');
  };

  const updateCartItem = (index, field, value) => {
    const updatedCart = [...newCart];
    updatedCart[index][field] = value;
    if (field === 'wastage_percent') {
        const gross = parseFloat(updatedCart[index].gross_weight) || 0;
        updatedCart[index].wastage_weight = (gross * (parseFloat(value) / 100)).toFixed(3);
    }
    setNewCart(updatedCart);
  };

  const removeFromNewCart = (index) => setNewCart(newCart.filter((_, i) => i !== index));
  const handleKeyDown = (e) => { if (e.key === 'Enter') performAddToCart(); };

  // --- MATH ---
  const calculateLineTotal = (item) => {
    const weight = parseFloat(item.gross_weight) || 0;
    const wastPct = parseFloat(item.wastage_percent) || 0;
    const wastageWt = (weight * (wastPct / 100));
    const rate = item.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD;
    const mc = parseFloat(item.making_charges) || 0;
    const disc = parseFloat(item.discount) || 0; 
    return Math.round(((weight + wastageWt) * rate) + mc - disc);
  };

  let totalRefund = 0;
  const itemsToReturn = saleItems.filter(i => returnSelection[i.id]);
  itemsToReturn.forEach(i => totalRefund += parseFloat(i.total_item_price));

  let totalNewBill = 0;
  newCart.forEach(i => totalNewBill += calculateLineTotal(i));

  const netPayable = totalNewBill - totalRefund;

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if(itemsToReturn.length === 0 && newCart.length === 0) return alert("Nothing to process.");
    if(!window.confirm("Confirm Transaction?")) return;

    const payload = {
        sale_id: sale.id,
        customer_id: sale.customer_id, 
        returned_items: itemsToReturn.map(item => ({
            sale_item_id: item.id,
            original_inventory_id: item.item_id,
            item_name: item.item_name,
            gross_weight: item.sold_weight,
            refund_amount: item.total_item_price,
            restore_to_own: !!restoreToOwn[item.id] 
        })),
        exchange_items: newCart.map(item => ({
            id: item.item_id, 
            item_name: item.item_desc ? `${item.item_name} (${item.item_desc})` : item.item_name,
            gross_weight: item.gross_weight,
            rate: item.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD,
            total_price: calculateLineTotal(item),
            metal_type: item.metal_type,
            making_charges: item.making_charges,
            wastage_weight: item.wastage_weight,
            discount: item.discount, 
            neighbour_id: item.neighbour_id
        }))
    };

    try {
        const res = await api.processReturn(payload);
        
        if(res.data.new_invoice) {
            const invoiceData = {
                invoice_id: res.data.new_invoice,
                date: new Date().toLocaleString(),
                customer: { name: sale.customer_name, phone: sale.customer_phone },
                items: newCart.map(item => ({
                    ...item,
                    rate: item.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD,
                    total: calculateLineTotal(item)
                })),
                exchangeItems: itemsToReturn.map(item => ({
                    name: `RETURN: ${item.item_name}`,
                    metal_type: 'N/A',
                    gross_weight: item.sold_weight,
                    less_percent: 0,
                    net_weight: item.sold_weight,
                    rate: item.sold_rate,
                    total: item.total_item_price
                })),
                totals: {
                    grossTotal: totalNewBill,
                    totalDiscount: 0, 
                    taxableAmount: totalNewBill, 
                    sgst: 0, cgst: 0,
                    exchangeTotal: totalRefund, 
                    roundOff: 0,
                    netPayable: netPayable > 0 ? netPayable : 0,
                    paidAmount: netPayable > 0 ? netPayable : 0, 
                    balance: 0
                }
            };
            setLastBill(invoiceData);
            setShowInvoice(true);
        } else {
            alert("Return Processed (No New Bill).");
            navigate('/bill-history');
        }

    } catch (err) {
        alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!sale) return <div className="p-5 text-center text-muted">Loading Invoice Data...</div>;

  return (
    <div className="container-fluid mt-3 pb-5">
      
      {/* HEADER BAR */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-white shadow-sm rounded">
        <div>
            <h4 className="mb-0 fw-bold text-dark"><i className="bi bi-arrow-left-right text-primary me-2"></i>Return & Exchange</h4>
            <div className="text-muted small">
                Invoice: <span className="fw-bold text-dark">{sale.invoice_number}</span> | 
                Customer: <span className="fw-bold text-dark">{sale.customer_name}</span>
            </div>
        </div>
        <button className="btn btn-outline-secondary btn-sm fw-bold" onClick={() => navigate('/bill-history')}>
            <i className="bi bi-arrow-left me-1"></i> Back
        </button>
      </div>

      <div className="row g-4">
        
        {/* === LEFT COLUMN: MAIN TASKS (75%) === */}
        <div className="col-lg-9">
          
          {/* 1. RETURN SECTION */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-danger bg-opacity-10 text-danger d-flex justify-content-between align-items-center" style={styles.cardHeader}>
              <span><i className="bi bi-arrow-return-left me-2"></i>Select Items to Return</span>
              <span className="badge bg-danger">Credit: ₹{totalRefund.toLocaleString()}</span>
            </div>
            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-secondary small text-uppercase">
                        <tr>
                            <th style={{width:'50px'}}>Select</th>
                            <th>Item Name</th>
                            <th>Sold Weight</th>
                            <th>Sold Rate</th>
                            {/* UPDATED COLUMN HEADER */}
                            <th className="text-center text-primary" style={{width:'200px'}}>Restocking Option</th>
                            <th className="text-end">Refund Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                    {saleItems.map(item => {
                        const isReturned = item.item_name.includes('(RETURNED)');
                        const isSelected = !!returnSelection[item.id];
                        
                        return (
                        <tr key={item.id} className={isReturned ? 'bg-light text-muted' : ''}>
                            <td className="text-center">
                                <input className="form-check-input" type="checkbox" 
                                    disabled={isReturned}
                                    checked={isSelected} 
                                    onChange={() => toggleReturn(item.id)} 
                                    style={{cursor: 'pointer', transform: 'scale(1.2)'}} />
                            </td>
                            <td>{item.item_name} {isReturned && <span className="badge bg-secondary ms-2" style={{fontSize:'0.6rem'}}>RETURNED</span>}</td>
                            <td className="fw-bold">{item.sold_weight} g</td>
                            <td className="text-muted">{item.sold_rate}</td>
                            
                            {/* UPDATED RESTOCK OPTION: Always Visible but Disabled if not selected */}
                            <td className="text-center">
                                {!isReturned ? (
                                    <div className={`form-check d-inline-block ${!isSelected ? 'opacity-50' : ''}`}>
                                        <input 
                                            className="form-check-input" 
                                            type="checkbox" 
                                            id={`own-${item.id}`}
                                            checked={!!restoreToOwn[item.id]}
                                            onChange={() => toggleRestoreToOwn(item.id)}
                                            disabled={!isSelected} 
                                        />
                                        <label className="form-check-label small ms-1 text-primary fw-bold" htmlFor={`own-${item.id}`} 
                                               title="Check this to keep item in Own Stock instead of returning to Neighbour.">
                                            Keep in Own Stock
                                        </label>
                                    </div>
                                ) : (
                                    <span className="small text-muted">-</span>
                                )}
                            </td>

                            <td className="text-end fw-bold text-danger">₹{parseFloat(item.total_item_price).toLocaleString()}</td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
          </div>

          {/* 2. EXCHANGE SECTION */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-success bg-opacity-10 text-success d-flex justify-content-between align-items-center" style={styles.cardHeader}>
              <span><i className="bi bi-cart-plus me-2"></i>Add New Items (Exchange)</span>
              
              {/* RATES CONFIG */}
              <div className="d-flex gap-2">
                <div className="input-group input-group-sm" style={{width:'130px'}}>
                    <span className="input-group-text bg-white fw-bold text-warning border-warning">Au</span>
                    <input type="number" className="form-control fw-bold border-warning text-end" value={rates.GOLD} onChange={e => setRates({...rates, GOLD: e.target.value})} />
                </div>
                <div className="input-group input-group-sm" style={{width:'130px'}}>
                    <span className="input-group-text bg-white fw-bold text-secondary border-secondary">Ag</span>
                    <input type="number" className="form-control fw-bold border-secondary text-end" value={rates.SILVER} onChange={e => setRates({...rates, SILVER: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="card-body bg-light bg-opacity-25">
                
                {/* --- SPACIOUS INPUT FORM (2 ROWS) --- */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-3">
                        {/* Row 1: Identity */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-5 position-relative">
                                <label className="form-label small fw-bold text-muted mb-1">Search Inventory</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0"><i className="bi bi-search"></i></span>
                                    <input className="form-control border-start-0" placeholder="Scan or Type Item..." value={entry.item_name} onChange={e => handleEntryChange('item_name', e.target.value)} autoFocus />
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="position-absolute w-100 shadow bg-white rounded overflow-auto border" style={{zIndex: 1000, maxHeight:'250px', top: '100%'}}>
                                        {searchResults.map(item => (
                                            <button key={item.id} className="list-group-item list-group-item-action p-2 small border-0 border-bottom" onClick={() => selectItem(item)}>
                                                <div className="fw-bold text-dark">{item.item_name}</div>
                                                <div className="d-flex justify-content-between text-muted" style={{fontSize:'0.75rem'}}><span>{item.barcode}</span><span>{item.gross_weight}g</span></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold text-muted mb-1">Nick ID / Desc</label>
                                <div className="input-group">
                                    <input className="form-control" placeholder="e.g. RJ" value={entry.item_desc} onChange={e => handleEntryChange('item_desc', e.target.value)} onKeyDown={handleKeyDown} />
                                    {detectedShopName && <span className="input-group-text bg-warning text-dark px-2 border-warning" style={{fontSize:'0.7rem'}}>{detectedShopName}</span>}
                                </div>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-bold text-muted mb-1">Metal Type</label>
                                <select className="form-select fw-bold" value={entry.metal_type} onChange={e => handleEntryChange('metal_type', e.target.value)}>
                                    <option value="GOLD">GOLD (Au)</option>
                                    <option value="SILVER">SILVER (Ag)</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Financials */}
                        <div className="row g-2 align-items-end">
                            <div className="col-md-2">
                                <label className="form-label small fw-bold text-muted mb-1">Weight (g)</label>
                                <input type="number" className="form-control fw-bold" placeholder="0.000" value={entry.gross_weight} onChange={e => handleEntryChange('gross_weight', e.target.value)} onKeyDown={handleKeyDown} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold text-muted mb-1">Wastage %</label>
                                <input type="number" className="form-control" placeholder="0" value={entry.wastage_percent} onChange={e => handleEntryChange('wastage_percent', e.target.value)} onKeyDown={handleKeyDown} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold text-muted mb-1">MC (₹)</label>
                                <input type="number" className="form-control" placeholder="0" value={entry.making_charges} onChange={e => handleEntryChange('making_charges', e.target.value)} onKeyDown={handleKeyDown} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold text-danger mb-1">Discount</label>
                                <input type="number" className="form-control text-danger border-danger" placeholder="0" value={entry.discount} onChange={e => handleEntryChange('discount', e.target.value)} onKeyDown={handleKeyDown} />
                            </div>
                            <div className="col-md-2 text-end px-3">
                                <div className="small text-muted text-uppercase mb-1">Est. Total</div>
                                <div className="fw-bold text-success fs-5">₹{liveEntryTotal.toLocaleString()}</div>
                            </div>
                            <div className="col-md-2">
                                <button className="btn btn-success w-100 fw-bold" onClick={performAddToCart} style={{height: '38px'}}>+ ADD</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CART TABLE --- */}
                <div className="table-responsive bg-white rounded border">
                    <table className="table table-bordered align-middle mb-0">
                        <thead className="table-light small text-center text-secondary text-uppercase">
                            <tr>
                                <th style={{width: '30%'}}>Item Description</th>
                                <th style={{width: '12%'}}>Weight</th>
                                <th style={{width: '10%'}}>Wst %</th>
                                <th style={{width: '12%'}}>MC (₹)</th>
                                <th style={{width: '12%'}}>Disc (₹)</th>
                                <th>Total</th>
                                <th style={{width: '50px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {newCart.map((item, i) => (
                                <tr key={i}>
                                    <td className="text-start">
                                        <div className="fw-bold text-dark">{item.item_name}</div>
                                        <div className="small text-muted">{item.item_desc} {item.neighbour_id && <span className="badge bg-warning text-dark ms-1" style={{fontSize:'0.6em'}}>NEIGHBOUR</span>}</div>
                                    </td>
                                    <td>{item.gross_weight} g</td>
                                    <td className="p-1"><input type="number" className="form-control form-control-sm text-center border-0 bg-transparent" value={item.wastage_percent} onChange={e => updateCartItem(i, 'wastage_percent', e.target.value)} /></td>
                                    <td className="p-1"><input type="number" className="form-control form-control-sm text-center border-0 bg-transparent" value={item.making_charges} onChange={e => updateCartItem(i, 'making_charges', e.target.value)} /></td>
                                    <td className="p-1"><input type="number" className="form-control form-control-sm text-center border-0 bg-transparent text-danger fw-bold" value={item.discount} onChange={e => updateCartItem(i, 'discount', e.target.value)} /></td>
                                    <td className="fw-bold text-success text-end pe-3">₹{Math.round(calculateLineTotal(item)).toLocaleString()}</td>
                                    <td className="text-center"><button className="btn btn-link text-danger p-0" onClick={() => removeFromNewCart(i)}><i className="bi bi-trash"></i></button></td>
                                </tr>
                            ))}
                            {newCart.length === 0 && <tr><td colSpan="7" className="text-center py-4 text-muted small">Cart is empty. Add items above.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: STICKY SUMMARY (25%) === */}
        <div className="col-lg-3">
            <div className="card shadow border-0 text-center" style={styles.stickySidebar}>
                <div className="card-header bg-dark text-white py-3">
                    <h5 className="mb-0 fw-bold ls-1">SUMMARY</h5>
                </div>
                <div className="card-body p-4">
                    
                    {/* Refund */}
                    <div className="mb-3 pb-3 border-bottom d-flex justify-content-between align-items-center">
                        <span className="text-muted small text-uppercase">Return Credit</span>
                        <span className="fw-bold text-danger fs-5">- ₹{totalRefund.toLocaleString()}</span>
                    </div>

                    {/* New Total */}
                    <div className="mb-4 pb-3 border-bottom d-flex justify-content-between align-items-center">
                        <span className="text-muted small text-uppercase">New Bill Total</span>
                        <span className="fw-bold text-success fs-5">+ ₹{Math.round(totalNewBill).toLocaleString()}</span>
                    </div>

                    {/* Net Payable */}
                    <div className="bg-light rounded p-3 mb-4 border">
                        <small className="text-uppercase fw-bold text-secondary d-block mb-1">Net Payable</small>
                        <h2 className={`fw-bold mb-0 ${netPayable > 0 ? 'text-primary' : 'text-warning'}`}>
                            {netPayable > 0 ? `₹${Math.round(netPayable).toLocaleString()}` : `- ₹${Math.abs(Math.round(netPayable)).toLocaleString()}`}
                        </h2>
                        <small className="text-muted">{netPayable > 0 ? '(Customer Pays)' : '(Shop Refunds)'}</small>
                    </div>

                    {/* Actions */}
                    <button className="btn btn-primary w-100 py-3 fw-bold shadow-sm" onClick={handleSubmit}>
                        <i className="bi bi-printer-fill me-2"></i> PROCESS & PRINT
                    </button>
                </div>
            </div>
        </div>

      </div>

      {/* PRINT MODAL */}
      {showInvoice && lastBill && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050}}>
           <div className="modal-dialog modal-lg">
              <div className="modal-content" style={{height: '90vh'}}>
                 <div className="modal-header bg-dark text-white"><h5 className="modal-title">Invoice Preview</h5><button className="btn-close btn-close-white" onClick={() => { setShowInvoice(false); navigate('/bill-history'); }}></button></div>
                 <div className="modal-body overflow-auto p-0 bg-secondary bg-opacity-10"><InvoiceTemplate data={lastBill} /></div>
                 <div className="modal-footer bg-light"><button className="btn btn-secondary" onClick={() => { setShowInvoice(false); navigate('/bill-history'); }}>Close</button><button className="btn btn-primary fw-bold" onClick={() => window.print()}><i className="bi bi-printer me-2"></i>PRINT INVOICE</button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default SalesReturn;