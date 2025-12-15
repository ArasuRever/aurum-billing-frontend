import React, { useState } from 'react';
import { api } from '../api';

function Billing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [billDetails, setBillDetails] = useState({
    customer_name: '',
    customer_phone: '',
    discount: 0,
    payment_mode: 'CASH'
  });

  // 1. Search Item
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;
    try {
      const res = await api.searchBillingItem(searchTerm);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Add to Cart
  const addToCart = (item) => {
    // Check if already in cart
    if (cart.find(c => c.id === item.id)) return alert('Item already in cart');
    
    // Default sold rate (can be edited)
    const cartItem = {
      ...item,
      sold_weight: item.gross_weight, // Default to full weight
      sold_rate: 6500, // Default Gold Rate (Example)
    };
    setCart([...cart, cartItem]);
    setSearchResults([]); // Clear search
    setSearchTerm('');
  };

  // 3. Create Bill
  const handleCreateBill = async () => {
    if (cart.length === 0) return alert('Cart is empty');

    const payload = {
      ...billDetails,
      items: cart.map(item => ({
        item_id: item.id,
        sold_weight: item.sold_weight,
        sold_rate: item.sold_rate,
        making_charges: item.making_charges
      }))
    };

    try {
      const res = await api.createBill(payload);
      alert(`Bill Created! Invoice: ${res.data.invoice}`);
      setCart([]);
      setBillDetails({ customer_name: '', customer_phone: '', discount: 0, payment_mode: 'CASH' });
    } catch (err) {
      alert('Billing Failed');
    }
  };

  // Calculate Total
  const totalAmount = cart.reduce((acc, item) => acc + (item.sold_weight * item.sold_rate) + parseFloat(item.making_charges), 0);
  const finalAmount = totalAmount - billDetails.discount;

  return (
    <div>
      <h2 className="fw-bold mb-4"><i className="bi bi-receipt me-2"></i>New Bill</h2>

      <div className="row g-4">
        {/* LEFT: Search & Cart */}
        <div className="col-lg-8">
          
          {/* Search Bar */}
          <div className="card shadow-sm p-3 mb-3">
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Scan Barcode or Search Item..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <ul className="list-group mt-2">
                {searchResults.map(item => (
                  <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center action-hover" 
                      onClick={() => addToCart(item)} style={{cursor: 'pointer'}}>
                    <div>
                      <strong>{item.item_name}</strong> <small className="text-muted">({item.barcode})</small>
                    </div>
                    <span className="badge bg-success">Add +</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cart Table */}
          <div className="card shadow-sm">
            <div className="card-header bg-white fw-bold">Items in Cart</div>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th style={{width: '100px'}}>Weight</th>
                    <th style={{width: '100px'}}>Rate</th>
                    <th style={{width: '100px'}}>MC</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={item.id}>
                      <td>{item.item_name}<br/><small className="text-muted">{item.barcode}</small></td>
                      <td>
                        <input type="number" className="form-control form-control-sm" value={item.sold_weight}
                          onChange={e => {
                            const newCart = [...cart];
                            newCart[index].sold_weight = e.target.value;
                            setCart(newCart);
                          }} />
                      </td>
                      <td>
                        <input type="number" className="form-control form-control-sm" value={item.sold_rate}
                          onChange={e => {
                            const newCart = [...cart];
                            newCart[index].sold_rate = e.target.value;
                            setCart(newCart);
                          }} />
                      </td>
                      <td>{item.making_charges}</td>
                      <td className="fw-bold">
                        {Math.round((item.sold_weight * item.sold_rate) + parseFloat(item.making_charges))}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setCart(cart.filter(c => c.id !== item.id))}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && <tr><td colSpan="6" className="text-center py-4">Cart is empty</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Customer & Total */}
        <div className="col-lg-4">
          <div className="card shadow-sm p-3">
            <h5 className="mb-3">Customer Details</h5>
            <div className="mb-2">
              <label className="form-label small text-muted">Customer Name</label>
              <input type="text" className="form-control" 
                value={billDetails.customer_name} onChange={e => setBillDetails({...billDetails, customer_name: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">Phone Number</label>
              <input type="text" className="form-control" 
                value={billDetails.customer_phone} onChange={e => setBillDetails({...billDetails, customer_phone: e.target.value})} />
            </div>
            
            <hr />
            
            <div className="d-flex justify-content-between mb-2">
              <span>Subtotal:</span>
              <span className="fw-bold">₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">Discount</label>
              <input type="number" className="form-control" 
                value={billDetails.discount} onChange={e => setBillDetails({...billDetails, discount: e.target.value})} />
            </div>
            <div className="d-flex justify-content-between fs-4 fw-bold text-success mb-4">
              <span>Total:</span>
              <span>₹{finalAmount.toFixed(2)}</span>
            </div>

            <div className="d-grid">
              <button className="btn btn-success btn-lg" onClick={handleCreateBill}>
                Print Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Billing;