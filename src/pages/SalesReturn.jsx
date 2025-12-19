import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import InvoiceTemplate from '../components/InvoiceTemplate';

// --- PRINT STYLES ---
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
  const [shops, setShops] = useState([]); 
  const [rates, setRates] = useState({ GOLD: 7000, SILVER: 85 });

  // --- NEW ITEM ENTRY STATE ---
  const [newCart, setNewCart] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  // The Input Form
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

  const [detectedShopName, setDetectedShopName] = useState(''); 

  // --- PRINT STATE ---
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);

    if (saleId) fetchSaleDetails(saleId);
    fetchShops(); 

    return () => document.head.removeChild(styleSheet);
  }, [saleId]);

  const fetchSaleDetails = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/billing/invoice/${id}`);
      setSale(res.data.sale);
      setSaleItems(res.data.items);
    } catch (err) { 
        alert("Invoice not found"); 
        navigate('/bill-history'); 
    }
  };

  const fetchShops = async () => {
      try {
          const res = await axios.get('http://localhost:5000/api/shops');
          setShops(res.data);
      } catch (err) { console.error("Error fetching shops", err); }
  };

  // --- RETURN LOGIC ---
  const toggleReturn = (itemId) => {
    setReturnSelection(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // --- NEW ITEM LOGIC ---
  
  // 1. Search Inventory
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (entry.item_name.length > 1 && !entry.item_id) {
        try { 
            const res = await axios.get(`http://localhost:5000/api/billing/search-item?q=${entry.item_name}`); 
            setSearchResults(res.data); 
        } catch (err) {}
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [entry.item_name, entry.item_id]);

  // 2. Handle Input Changes & Nick ID
  const handleEntryChange = (field, value) => {
    let finalValue = value;
    let updates = { [field]: finalValue };
    
    if (field === 'item_name' && entry.item_id) { 
        updates.item_id = null; updates.barcode = ''; 
    }

    // --- FIXED NICK ID LOGIC (Auto-Fill " - ") ---
    if (field === 'item_desc') {
        const inputUpper = finalValue.toUpperCase();
        
        // Find shop where input matches Nick ID
        const matchedShop = shops.find(s => 
            s.nick_id && (inputUpper === s.nick_id.toUpperCase() || inputUpper.startsWith(s.nick_id.toUpperCase() + ' '))
        );
        
        if (matchedShop) { 
            updates.neighbour_id = matchedShop.id;
            setDetectedShopName(matchedShop.shop_name); 
            
            // THE FIX: Automatically append " - " when Nick ID is typed completely
            if (inputUpper === matchedShop.nick_id.toUpperCase()) {
                updates[field] = `${matchedShop.nick_id.toUpperCase()} - `;
            }
        } else {
            updates.neighbour_id = null;
            setDetectedShopName('');
        }
    }
    setEntry(prev => ({ ...prev, ...updates }));
  };

  // 3. Populate Form (Values from Vendor are cleared so you can edit)
  const selectItem = (item) => { 
      setSearchResults([]); 
      setEntry({
          ...entry,
          item_id: item.id,
          item_name: item.item_name,
          barcode: item.barcode,
          metal_type: item.metal_type,
          gross_weight: item.gross_weight,
          wastage_percent: '', // Cleared for editing
          making_charges: '',   // Cleared for editing
          neighbour_id: null,
          item_desc: ''
      });
      setDetectedShopName('');
  };

  // 4. Add to Cart
  const performAddToCart = () => {
    let finalName = entry.item_name;
    if (!finalName || !entry.gross_weight) return alert("Name & Weight Required");

    const appliedRate = entry.metal_type === 'SILVER' ? rates.SILVER : rates.GOLD;
    const gross = parseFloat(entry.gross_weight) || 0;
    const wastPct = parseFloat(entry.wastage_percent) || 0;
    const wastWt = (gross * (wastPct / 100)).toFixed(3);

    const newItem = {
      ...entry,
      id: entry.item_id || `MANUAL-${Date.now()}`,
      isManual: !entry.item_id,
      wastage_weight: wastWt,
      rate: appliedRate, 
      total: 0 // Calc below
    };
    
    setNewCart(prev => [...prev, newItem]);
    
    // Reset Form
    setEntry({ 
        item_id: null, item_name: '', item_desc: '', barcode: '', 
        metal_type: entry.metal_type, gross_weight: '', wastage_percent: '', 
        making_charges: '', item_image: null, neighbour_id: null 
    });
    setDetectedShopName('');
  };

  const removeFromNewCart = (index) => setNewCart(newCart.filter((_, i) => i !== index));
  const handleKeyDown = (e) => { if (e.key === 'Enter') performAddToCart(); };

  // --- CALCULATIONS ---
  const calculateLineTotal = (item) => {
    const weight = parseFloat(item.gross_weight) || 0;
    const wastageWt = parseFloat(item.wastage_weight) || 0; 
    const rate = parseFloat(item.rate) || 0;
    const mc = parseFloat(item.making_charges) || 0;
    return Math.round((weight + wastageWt) * rate + mc);
  };

  let totalRefund = 0;
  const itemsToReturn = saleItems.filter(i => returnSelection[i.id]);
  itemsToReturn.forEach(i => totalRefund += parseFloat(i.total_item_price));

  let totalNewBill = 0;
  newCart.forEach(i => totalNewBill += calculateLineTotal(i));

  const netPayable = totalNewBill - totalRefund;

  // --- SUBMIT TRANSACTION ---
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
            refund_amount: item.total_item_price
        })),
        exchange_items: newCart.map(item => ({
            id: item.item_id, 
            item_name: item.item_desc ? `${item.item_name} (${item.item_desc})` : item.item_name,
            gross_weight: item.gross_weight,
            rate: item.rate,
            total_price: calculateLineTotal(item),
            metal_type: item.metal_type,
            making_charges: item.making_charges,
            wastage_weight: item.wastage_weight,
            neighbour_id: item.neighbour_id
        }))
    };

    try {
        const res = await axios.post('http://localhost:5000/api/billing/process-return', payload);
        
        if(res.data.new_invoice) {
            // Prepare Data for InvoiceTemplate
            const invoiceData = {
                invoice_id: res.data.new_invoice,
                date: new Date().toLocaleString(),
                customer: { name: sale.customer_name, phone: sale.customer_phone },
                items: newCart.map(item => ({
                    ...item,
                    total: calculateLineTotal(item)
                })),
                // Map returned items to "exchangeItems" so they show in the template detail
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
                    exchangeTotal: totalRefund, // Will show as "Less Exchange" on the bill
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

  if (!sale) return <div className="p-5 text-center">Loading...</div>;

  return (
    <div className="container-fluid mt-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 className="text-danger fw-bold"><i className="bi bi-arrow-left-right me-2"></i>Return & Exchange</h2>
            <div className="text-muted">
                Ref: <strong>{sale.invoice_number}</strong> | Customer: <strong>{sale.customer_name}</strong>
            </div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/bill-history')}>Back</button>
      </div>

      <div className="row g-4">
        {/* RETURN SECTION */}
        <div className="col-12">
          <div className="card shadow-sm border-danger">
            <div className="card-header bg-danger text-white d-flex justify-content-between">
              <h5 className="mb-0">Select Items to Return</h5>
              <h5 className="mb-0">Credit: ₹{totalRefund.toLocaleString()}</h5>
            </div>
            <div className="card-body p-0">
                <table className="table table-hover mb-0 align-middle">
                    <thead className="table-light"><tr><th width="50"></th><th>Item</th><th>Wt</th><th>Rate</th><th className="text-end">Amount</th></tr></thead>
                    <tbody>
                    {saleItems.map(item => (
                        <tr key={item.id} className={item.item_name.includes('(RETURNED)') ? 'table-secondary text-muted' : ''}>
                            <td className="text-center">
                                <input className="form-check-input" type="checkbox" 
                                    disabled={item.item_name.includes('(RETURNED)')}
                                    checked={!!returnSelection[item.id]} 
                                    onChange={() => toggleReturn(item.id)} 
                                    style={{transform: 'scale(1.2)'}} />
                            </td>
                            <td>{item.item_name}</td>
                            <td>{item.sold_weight} g</td>
                            <td>{item.sold_rate}</td>
                            <td className="text-end fw-bold">₹{parseFloat(item.total_item_price).toLocaleString()}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* NEW ITEMS SECTION */}
        <div className="col-12">
          <div className="card shadow-sm border-success">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">New Items (Exchange)</h5>
              <div className="d-flex gap-2">
                <div className="input-group input-group-sm" style={{width:'120px'}}><span className="input-group-text bg-warning border-warning text-dark fw-bold">Au</span><input type="number" className="form-control fw-bold" value={rates.GOLD} onChange={e => setRates({...rates, GOLD: e.target.value})} /></div>
                <div className="input-group input-group-sm" style={{width:'120px'}}><span className="input-group-text bg-secondary border-secondary text-white fw-bold">Ag</span><input type="number" className="form-control fw-bold" value={rates.SILVER} onChange={e => setRates({...rates, SILVER: e.target.value})} /></div>
              </div>
            </div>

            <div className="card-body">
                {/* INPUT FORM */}
                <div className="row g-2 align-items-end mb-3 pb-3 border-bottom">
                    <div className="col-md-3 position-relative">
                        <label className="small fw-bold text-muted">Search / Item Name</label>
                        <input className="form-control fw-bold" placeholder="Scan or Type..." value={entry.item_name} onChange={e => handleEntryChange('item_name', e.target.value)} />
                        {searchResults.length > 0 && (
                            <div className="position-absolute w-100 shadow bg-white rounded overflow-auto" style={{zIndex: 1000, maxHeight:'200px', top: '100%'}}>
                                {searchResults.map(item => (
                                    <button key={item.id} className="list-group-item list-group-item-action p-2 small" onClick={() => selectItem(item)}>
                                        <div className="fw-bold">{item.item_name}</div>
                                        <div className="text-muted d-flex justify-content-between"><span>{item.barcode}</span><span>{item.gross_weight}g</span></div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="col-md-1">
                        <label className="small fw-bold text-muted">Metal</label>
                        <select className="form-select fw-bold" value={entry.metal_type} onChange={e => handleEntryChange('metal_type', e.target.value)}><option>GOLD</option><option>SILVER</option></select>
                    </div>
                    <div className="col-md-2">
                        <label className="small fw-bold text-muted">NickID</label>
                        <div className="input-group">
                            <input className="form-control" placeholder="e.g. RJ" value={entry.item_desc} onChange={e => handleEntryChange('item_desc', e.target.value)} onKeyDown={handleKeyDown} />
                            {detectedShopName && <span className="input-group-text bg-warning text-dark px-2" title={detectedShopName}>✓</span>}
                        </div>
                    </div>
                    <div className="col-md-2">
                        <label className="small fw-bold text-muted">Weight</label>
                        <input type="number" className="form-control" placeholder="0.000" value={entry.gross_weight} onChange={e => handleEntryChange('gross_weight', e.target.value)} onKeyDown={handleKeyDown} />
                    </div>
                    <div className="col-md-1">
                        <label className="small fw-bold text-muted">Wst%</label>
                        <input type="number" className="form-control" placeholder="0" value={entry.wastage_percent} onChange={e => handleEntryChange('wastage_percent', e.target.value)} onKeyDown={handleKeyDown} />
                    </div>
                    <div className="col-md-2">
                        <label className="small fw-bold text-muted">MC (₹)</label>
                        <input type="number" className="form-control" placeholder="0" value={entry.making_charges} onChange={e => handleEntryChange('making_charges', e.target.value)} onKeyDown={handleKeyDown} />
                    </div>
                    <div className="col-md-1">
                        <button className="btn btn-primary w-100 fw-bold" onClick={performAddToCart}>ADD</button>
                    </div>
                </div>

                {/* TABLE */}
                <table className="table table-bordered table-striped align-middle text-center mb-0">
                    <thead className="table-light small"><tr><th>Item</th><th>Weight</th><th>Wastage</th><th>MC</th><th>Rate</th><th>Total</th><th>Action</th></tr></thead>
                    <tbody>
                        {newCart.map((item, i) => (
                            <tr key={i}>
                                <td className="text-start"><strong>{item.item_name}</strong> <small className="text-muted">{item.item_desc}</small> {item.neighbour_id && <span className="badge bg-warning text-dark ms-1">Neighbour</span>}</td>
                                <td>{item.gross_weight}</td>
                                <td>{item.wastage_percent}%</td>
                                <td>{item.making_charges}</td>
                                <td>{item.rate}</td>
                                <td className="fw-bold text-success">₹{Math.round(calculateLineTotal(item)).toLocaleString()}</td>
                                <td><button className="btn btn-sm btn-outline-danger" onClick={() => removeFromNewCart(i)}>&times;</button></td>
                            </tr>
                        ))}
                        {newCart.length === 0 && <tr><td colSpan="7" className="text-muted py-3">No new items.</td></tr>}
                    </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="col-12">
            <div className="card bg-light border-primary shadow">
                <div className="card-body">
                    <div className="row text-center align-items-center">
                        <div className="col-md-4"><h6 className="text-danger">Return Credit</h6><h2 className="fw-bold text-danger">- ₹{totalRefund.toLocaleString()}</h2></div>
                        <div className="col-md-4 border-start border-end"><h6 className="text-success">New Bill Total</h6><h2 className="fw-bold text-success">+ ₹{Math.round(totalNewBill).toLocaleString()}</h2></div>
                        <div className="col-md-4">
                            <h6 className="text-muted">Net Payable</h6>
                            <h1 className={`fw-bold ${netPayable > 0 ? 'text-primary' : 'text-warning'}`}>
                                {netPayable > 0 ? `Pay: ₹${Math.round(netPayable).toLocaleString()}` : `Refund: ₹${Math.abs(Math.round(netPayable)).toLocaleString()}`}
                            </h1>
                        </div>
                    </div>
                    <div className="text-end border-top pt-3 mt-3">
                        <button className="btn btn-lg btn-primary px-5 fw-bold" onClick={handleSubmit}><i className="bi bi-printer me-2"></i> PROCESS & PRINT</button>
                    </div>
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