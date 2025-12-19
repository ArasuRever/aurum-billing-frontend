import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function SalesReturn() {
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get('saleId');
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [returnSelection, setReturnSelection] = useState({}); 
  const [exchangeItems, setExchangeItems] = useState([]);
  
  // Exchange Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  // Exchange Rate (Live Rate for new items)
  const [todaysRate, setTodaysRate] = useState(6500); // Default, can be editable

  useEffect(() => {
    if (saleId) fetchSaleDetails(saleId);
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

  const toggleReturn = (itemId) => {
    setReturnSelection(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

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
    if(exchangeItems.find(ex => ex.id === item.id)) return;
    
    // Calculate Price for New Item (Weight * Rate + MC)
    // Assuming MC is in item or defaulting to 0
    const mc = parseFloat(item.making_charges) || 0;
    const price = (parseFloat(item.gross_weight) * todaysRate) + mc;

    const itemWithPrice = { 
        ...item, 
        rate: todaysRate, 
        total_price: price 
    };

    setExchangeItems([...exchangeItems, itemWithPrice]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeExchangeItem = (index) => {
    const newItems = [...exchangeItems];
    newItems.splice(index, 1);
    setExchangeItems(newItems);
  };

  // --- TOTALS ---
  let totalRefund = 0;
  saleItems.filter(i => returnSelection[i.id]).forEach(i => totalRefund += parseFloat(i.total_item_price));

  let totalNewBill = 0;
  exchangeItems.forEach(i => totalNewBill += i.total_price);

  const netPayable = totalNewBill - totalRefund;

  const handleSubmit = async () => {
    const itemsToReturn = saleItems.filter(item => returnSelection[item.id]);
    
    if(itemsToReturn.length === 0 && exchangeItems.length === 0) return alert("Select items to return or exchange.");
    if(!window.confirm("Process this Return & Exchange?")) return;

    const payload = {
        sale_id: sale.id,
        customer_id: sale.customer_id, // Pass if available, or backend copies from sale
        returned_items: itemsToReturn.map(item => ({
            sale_item_id: item.id,
            original_inventory_id: item.item_id,
            item_name: item.item_name,
            gross_weight: item.sold_weight,
            refund_amount: item.total_item_price
        })),
        exchange_items: exchangeItems.map(item => ({
            id: item.id, // Inventory ID
            item_name: item.item_name,
            gross_weight: item.gross_weight,
            rate: item.rate,
            total_price: item.total_price
        }))
    };

    try {
        const res = await axios.post('http://localhost:5000/api/billing/process-return', payload);
        
        let msg = `Success! \nReturn Receipt: ${res.data.return_receipt}`;
        if(res.data.new_invoice) msg += `\nNew Invoice: ${res.data.new_invoice}`;
        
        alert(msg);
        navigate('/bill-history');
    } catch (err) {
        alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!sale) return <div className="p-5 text-center">Loading...</div>;

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 className="text-danger fw-bold">Return & Exchange</h2>
            <div className="text-muted">Original Invoice: {sale.invoice_number}</div>
        </div>
        <div className="d-flex gap-2">
            <div className="input-group">
                <span className="input-group-text bg-warning">Today's Rate</span>
                <input type="number" className="form-control" value={todaysRate} onChange={e=>setTodaysRate(e.target.value)} style={{width:'100px'}} />
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/bill-history')}>Back</button>
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT: RETURN */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-danger">
            <div className="card-header bg-danger text-white">1. Select Items to Return</div>
            <ul className="list-group list-group-flush">
              {saleItems.map(item => {
                 const isReturned = item.item_name.includes('(RETURNED)'); // Simple check, ideally check status
                 return (
                  <li key={item.id} className={`list-group-item d-flex justify-content-between ${isReturned ? 'bg-light text-muted':''}`}>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" disabled={isReturned}
                          checked={!!returnSelection[item.id]} onChange={() => toggleReturn(item.id)} />
                      <label className="form-check-label ms-2">
                        {item.item_name} <br/> <small>{item.sold_weight}g</small>
                      </label>
                    </div>
                    <span className="badge bg-danger">Refund: ₹{item.total_item_price}</span>
                  </li>
                 );
              })}
            </ul>
          </div>
        </div>

        {/* RIGHT: EXCHANGE */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100 border-success">
            <div className="card-header bg-success text-white">2. Add New Items (New Bill)</div>
            <div className="card-body">
                <input type="text" className="form-control mb-2" placeholder="Scan or Search..." 
                    value={searchQuery} onChange={handleSearch} />
                
                {searchResults.length > 0 && (
                    <div className="list-group position-absolute w-100 shadow" style={{zIndex:1000}}>
                        {searchResults.map(res => (
                            <button key={res.id} className="list-group-item list-group-item-action" onClick={() => addExchangeItem(res)}>
                                {res.item_name} ({res.gross_weight}g)
                            </button>
                        ))}
                    </div>
                )}

                <ul className="list-group mt-3">
                    {exchangeItems.map((ex, idx) => (
                        <li key={idx} className="list-group-item d-flex justify-content-between">
                            <div>{ex.item_name} <br/><small>{ex.gross_weight}g @ {ex.rate}</small></div>
                            <div>
                                <span className="fw-bold text-success me-2">₹{ex.total_price}</span>
                                <button className="btn btn-sm text-danger" onClick={()=>removeExchangeItem(idx)}>x</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="card bg-light border-primary mt-4 shadow-sm">
        <div className="card-body text-center">
            <div className="row">
                <div className="col-4"><h5 className="text-danger">Refund: ₹{totalRefund}</h5></div>
                <div className="col-4"><h5 className="text-success">New Bill: ₹{totalNewBill}</h5></div>
                <div className="col-4">
                    <h3 className={netPayable > 0 ? "text-primary" : "text-warning"}>
                        {netPayable > 0 ? `Pay: ₹${netPayable}` : `Refund: ₹${Math.abs(netPayable)}`}
                    </h3>
                </div>
            </div>
            <button className="btn btn-lg btn-primary mt-3 px-5" onClick={handleSubmit}>
                Generate Return & New Invoice
            </button>
        </div>
      </div>
    </div>
  );
}

export default SalesReturn;