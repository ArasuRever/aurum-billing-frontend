import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function SalesReturn() {
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get('saleId'); // We get invoice # from URL
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [returnSelection, setReturnSelection] = useState({}); // { itemId: boolean }
  const [exchangeItems, setExchangeItems] = useState([]);
  
  // Search state for adding exchange items
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (saleId) fetchSaleDetails(saleId);
  }, [saleId]);

  const fetchSaleDetails = async (id) => {
    try {
      // Handles fetching by Invoice Number (e.g. INV-123456)
      const res = await axios.get(`http://localhost:5000/api/billing/invoice/${id}`);
      setSale(res.data.sale);
      setSaleItems(res.data.items);
    } catch (err) { 
        alert("Invoice not found"); 
        navigate('/bill-history'); 
    }
  };

  const toggleReturn = (itemId) => {
    setReturnSelection(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // --- EXCHANGE SEARCH LOGIC ---
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length > 1) {
      const res = await axios.get(`http://localhost:5000/api/billing/search-item?q=${q}`);
      setSearchResults(res.data);
    } else {
      setSearchResults([]);
    }
  };

  const addExchangeItem = (item) => {
    // Basic check to prevent duplicates
    if(exchangeItems.find(ex => ex.id === item.id)) return;
    
    setExchangeItems([...exchangeItems, item]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeExchangeItem = (index) => {
    const newItems = [...exchangeItems];
    newItems.splice(index, 1);
    setExchangeItems(newItems);
  };

  // --- TOTALS CALCULATION ---
  const calculateTotals = () => {
    // 1. Calculate Refund Amount (From Selected Return Items)
    let totalRefund = 0;
    const itemsToReturn = saleItems.filter(item => returnSelection[item.id]);
    itemsToReturn.forEach(item => {
        // We refund the price it was SOLD at
        totalRefund += parseFloat(item.total_item_price); 
    });

    // 2. Calculate New Purchase Amount (From Exchange Items)
    let totalNewPurchase = 0;
    exchangeItems.forEach(item => {
        // For accurate pricing, you might want an editable "rate" field for exchanges.
        // Here we default to current inventory rate or a standard calculation.
        // Assuming: weight * rate + MC. For now, let's estimate or use item price if exists.
        // Replace '6500' with your actual daily gold rate logic if needed.
        const rate = 6500; 
        const price = (parseFloat(item.gross_weight) * rate) + (parseFloat(item.making_charges) || 0);
        totalNewPurchase += price;
    });

    const netDifference = totalNewPurchase - totalRefund;

    return { totalRefund, totalNewPurchase, netDifference, itemsToReturn };
  };

  const { totalRefund, totalNewPurchase, netDifference, itemsToReturn } = calculateTotals();

  const handleSubmit = async () => {
    if(!window.confirm("Confirm Return & Exchange transaction?")) return;

    const payload = {
        sale_id: sale.id, // ID from database, not the invoice string
        returned_items: itemsToReturn.map(item => ({
            sale_item_id: item.id,
            original_inventory_id: item.item_id, // Important: This ID links back to inventory
            item_name: item.item_name,
            gross_weight: item.sold_weight,
            refund_amount: item.total_item_price
        })),
        exchange_items: exchangeItems,
        financial_summary: {
            totalRefund,
            totalNewPurchase,
            netPayable: netDifference > 0 ? netDifference : 0,
            netRefundable: netDifference < 0 ? Math.abs(netDifference) : 0
        }
    };

    try {
        await axios.post('http://localhost:5000/api/billing/process-return', payload);
        alert('Return & Exchange Processed Successfully!');
        navigate('/bill-history');
    } catch (err) {
        alert('Error processing return');
        console.error(err);
    }
  };

  if (!sale) return <div className="p-5 text-center">Loading Invoice Data...</div>;

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 className="text-danger fw-bold"><i className="bi bi-arrow-repeat me-2"></i>Return & Exchange</h2>
            <div className="text-muted">Invoice: {sale.invoice_number} | Customer: {sale.customer_name}</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/bill-history')}>Cancel</button>
      </div>

      <div className="row g-4">
        {/* LEFT: RETURN SECTION */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-danger">
            <div className="card-header bg-danger text-white">
              <h5 className="mb-0"><i className="bi bi-arrow-return-left me-2"></i>Select Items to Return</h5>
            </div>
            <ul className="list-group list-group-flush">
              {saleItems.map(item => {
                 const isReturned = item.item_name.includes('(RETURNED)');
                 return (
                  <li key={item.id} className={`list-group-item d-flex justify-content-between align-items-center ${isReturned ? 'bg-light text-muted' : ''}`}>
                    <div className="form-check">
                      <input 
                          className="form-check-input" 
                          type="checkbox" 
                          disabled={isReturned}
                          checked={!!returnSelection[item.id]} 
                          onChange={() => toggleReturn(item.id)}
                      />
                      <label className="form-check-label ms-2">
                        <strong>{item.item_name}</strong>
                        <div className="small">{item.sold_weight}g @ ₹{item.sold_rate}</div>
                      </label>
                    </div>
                    {isReturned ? 
                        <span className="badge bg-secondary">Already Returned</span> :
                        <span className="badge bg-danger">Refund: ₹{item.total_item_price}</span>
                    }
                  </li>
                 );
              })}
            </ul>
          </div>
        </div>

        {/* RIGHT: EXCHANGE SECTION */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-success">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0"><i className="bi bi-cart-plus me-2"></i>Add Exchange Items (New)</h5>
            </div>
            <div className="card-body">
                {/* Search Bar */}
                <div className="position-relative mb-3">
                    <input 
                        type="text" className="form-control" placeholder="Scan Barcode or Search Item..."
                        value={searchQuery} onChange={handleSearch}
                    />
                    {searchResults.length > 0 && (
                        <div className="list-group position-absolute w-100 shadow" style={{zIndex:1000, maxHeight:'200px', overflowY:'auto'}}>
                            {searchResults.map(res => (
                                <button key={res.id} className="list-group-item list-group-item-action" onClick={() => addExchangeItem(res)}>
                                    <div className="d-flex justify-content-between">
                                        <span>{res.item_name}</span>
                                        <small>{res.gross_weight}g</small>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Exchange Items List */}
                {exchangeItems.length === 0 ? (
                    <div className="text-center text-muted py-4">No new items added.</div>
                ) : (
                    <ul className="list-group">
                        {exchangeItems.map((ex, idx) => (
                            <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <div>{ex.item_name}</div>
                                    <small className="text-muted">{ex.gross_weight}g</small>
                                </div>
                                <div>
                                    <span className="badge bg-success me-2">+ ₹{(parseFloat(ex.gross_weight) * 6500).toFixed(0)}</span>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeExchangeItem(idx)}>&times;</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: FINANCIAL SUMMARY */}
      <div className="card bg-light border-primary mt-4 shadow-sm">
        <div className="card-body">
            <div className="row text-center align-items-center">
                <div className="col-md-4">
                    <h6 className="text-danger">Total Refund Credit</h6>
                    <h3 className="fw-bold">- ₹{totalRefund.toLocaleString()}</h3>
                </div>
                <div className="col-md-4 border-start border-end">
                    <h6 className="text-success">New Items Total</h6>
                    <h3 className="fw-bold">+ ₹{totalNewPurchase.toLocaleString()}</h3>
                </div>
                <div className="col-md-4">
                    <h6 className={netDifference > 0 ? "text-primary" : "text-warning"}>
                        {netDifference > 0 ? "Customer Pays" : "Shop Refunds"}
                    </h6>
                    <h2 className={`fw-bold ${netDifference > 0 ? "text-primary" : "text-warning"}`}>
                        ₹{Math.abs(netDifference).toLocaleString()}
                    </h2>
                </div>
            </div>
            <div className="text-end mt-3 border-top pt-3">
                <button 
                    className="btn btn-lg btn-primary px-5" 
                    onClick={handleSubmit} 
                    disabled={itemsToReturn.length === 0 && exchangeItems.length === 0}
                >
                    Complete Transaction
                </button>
            </div>
        </div>
      </div>

    </div>
  );
}

export default SalesReturn;