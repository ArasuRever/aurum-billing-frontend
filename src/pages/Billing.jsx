import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Trash2, Plus, Printer, Save, RefreshCw, Calculator, X } from 'lucide-react';
import { api } from '../api';
import Navbar from '../components/Navbar';
import InvoiceTemplate from '../components/InvoiceTemplate';

const Billing = () => {
  // --- STATE ---
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [items, setItems] = useState([]);
  const [exchangeItems, setExchangeItems] = useState([]);
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Search & Autosuggest
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Invoice Settings
  const [includeGST, setIncludeGST] = useState(true);
  const [discount, setDiscount] = useState(0);

  // Print & Modal State
  const [invoiceData, setInvoiceData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const componentRef = useRef();

  // --- CALCULATIONS ---
  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const exchangeTotal = exchangeItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    
    // Tax Calculation
    const taxableAmount = itemsTotal; // Assuming rates are exclusive of tax for calculation base
    const gstRate = includeGST ? 0.03 : 0;
    const gstAmount = taxableAmount * gstRate;
    
    const grossTotal = taxableAmount + gstAmount;
    const netTotal = grossTotal - exchangeTotal - parseFloat(discount || 0);
    
    return {
      itemsTotal,
      exchangeTotal,
      taxableAmount,
      gstAmount: gstAmount,
      grossTotal,
      netPayable: Math.round(netTotal) // Round off final amount
    };
  };

  const totals = calculateTotals();

  // --- HANDLERS ---
  const handleAddItem = (item) => {
    setItems([...items, { ...item, id: Date.now() }]);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleSearch = async (val) => {
    setSearchTerm(val);
    if (val.length > 2) {
      try {
        const res = await api.searchBillingItem(val);
        setSearchResults(res.data);
        setShowSuggestions(true);
      } catch (err) { console.error(err); }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleCustomerSearch = async (val) => {
    setCustomer(prev => ({ ...prev, name: val }));
    if(val.length > 9) { // Auto-fetch if phone number
         try {
             const res = await api.getCustomerDetails(val); // Assuming this API exists or uses search
             if(res.data && res.data.customer) {
                 setCustomer({
                     name: res.data.customer.name,
                     phone: res.data.customer.phone,
                     address: res.data.customer.address
                 });
             }
         } catch(err) {}
    }
  };

  // --- MODAL & SAVING LOGIC ---
  
  // 1. Open Payment Modal
  const handleConfirmSale = () => {
    if (!customer.name || !customer.phone) return alert("Please enter Customer Details");
    if (items.length === 0) return alert("Please add at least one item");
    setShowPaymentModal(true);
  };

  // 2. Submit to Backend
  const submitBill = async (paymentDetails) => {
    try {
      const payload = {
        customer,
        items,
        exchangeItems,
        totals: {
          ...totals,
          paidAmount: paymentDetails.totalPaid,
          balance: paymentDetails.balance,
          cashPaid: paymentDetails.cash,
          onlinePaid: paymentDetails.online
        },
        includeGST,
        billDate
      };

      const res = await api.createBill(payload);
      
      // Prepare Print Data
      setInvoiceData({
        ...payload,
        invoiceNo: res.data.invoice_id,
        date: billDate
      });

      setShowPaymentModal(false);
      setShowPrintModal(true); // Open Print Preview

      // Reset Form (Optional, maybe wait until after print)
      setItems([]);
      setExchangeItems([]);
      setCustomer({ name: '', phone: '', address: '' });
      setDiscount(0);

    } catch (err) {
      alert("Error Saving Bill: " + err.message);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: () => setShowPrintModal(false)
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: BILLING FORM */}
        <div className="lg:col-span-2 space-y-6">
            {/* Customer Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        className="border p-2 rounded focus:ring-2 focus:ring-yellow-500 outline-none" 
                        placeholder="Phone Number"
                        value={customer.phone}
                        onChange={(e) => {
                            const val = e.target.value;
                            setCustomer({...customer, phone: val});
                            if(val.length > 2) handleCustomerSearch(val);
                        }}
                    />
                    <input 
                        className="border p-2 rounded focus:ring-2 focus:ring-yellow-500 outline-none" 
                        placeholder="Customer Name"
                        value={customer.name}
                        onChange={(e) => setCustomer({...customer, name: e.target.value})}
                    />
                    <input 
                        className="border p-2 rounded focus:ring-2 focus:ring-yellow-500 outline-none md:col-span-2" 
                        placeholder="Address (Optional)"
                        value={customer.address}
                        onChange={(e) => setCustomer({...customer, address: e.target.value})}
                    />
                </div>
            </div>

            {/* Item Search & List */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Add Items</h3>
                <div className="relative mb-4">
                    <input 
                        className="w-full border p-3 rounded-lg shadow-inner focus:ring-2 focus:ring-yellow-500 outline-none pl-10"
                        placeholder="Scan Barcode or Search Item..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    <div className="absolute left-3 top-3.5 text-gray-400"><Plus size={20}/></div>
                    
                    {showSuggestions && (
                        <div className="absolute z-10 w-full bg-white border shadow-xl rounded-lg mt-1 max-h-60 overflow-y-auto">
                            {searchResults.map(item => (
                                <div 
                                    key={item.id} 
                                    className="p-3 hover:bg-yellow-50 cursor-pointer border-b flex justify-between"
                                    onClick={() => handleAddItem({
                                        item_id: item.id,
                                        item_name: item.item_name,
                                        metal_type: item.metal_type,
                                        gross_weight: item.gross_weight,
                                        rate: 6500, // Replace with dynamic daily rate
                                        making_charges: item.making_charges,
                                        total: (parseFloat(item.gross_weight) * 6500) + parseFloat(item.making_charges)
                                    })}
                                >
                                    <span className="font-medium">{item.item_name} <span className="text-xs text-gray-500">({item.barcode})</span></span>
                                    <span className="font-mono">{item.gross_weight}g</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Added Items Table */}
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-2 rounded-l">Item</th>
                            <th className="p-2">Wt (g)</th>
                            <th className="p-2">Rate</th>
                            <th className="p-2">MC</th>
                            <th className="p-2 text-right">Total</th>
                            <th className="p-2 rounded-r"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} className="border-b">
                                <td className="p-2">{item.item_name}</td>
                                <td className="p-2">{item.gross_weight}</td>
                                <td className="p-2">{item.rate}</td>
                                <td className="p-2">{item.making_charges}</td>
                                <td className="p-2 text-right font-medium">{item.total}</td>
                                <td className="p-2 text-center text-red-500 cursor-pointer" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                                    <Trash2 size={16} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Exchange Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Exchange / Returns</h3>
                    <button className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200" onClick={() => {
                        const name = prompt("Item Name:");
                        const wt = parseFloat(prompt("Weight:"));
                        const rate = parseFloat(prompt("Rate:"));
                        if(name && wt && rate) setExchangeItems([...exchangeItems, { name, gross_weight: wt, rate, total: wt * rate, id: Date.now() }]);
                    }}>+ Add Manual Exchange</button>
                </div>
                {exchangeItems.length > 0 && (
                     <table className="w-full text-sm text-left text-red-600">
                        <tbody>
                            {exchangeItems.map((item, idx) => (
                                <tr key={item.id} className="border-b border-red-100 bg-red-50">
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2">{item.gross_weight}g</td>
                                    <td className="p-2">@{item.rate}</td>
                                    <td className="p-2 text-right font-bold">-{item.total}</td>
                                    <td className="p-2 text-center cursor-pointer" onClick={() => setExchangeItems(exchangeItems.filter((_, i) => i !== idx))}>
                                        <X size={16} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* RIGHT: TOTALS & ACTIONS */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-yellow-200 sticky top-24">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Calculator className="text-yellow-600"/> Payment Summary
                </h2>

                <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Items Total:</span>
                        <span className="font-mono">₹ {totals.itemsTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                        <span>Less Exchange:</span>
                        <span className="font-mono">- ₹ {totals.exchangeTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-y border-dashed">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={includeGST} onChange={(e) => setIncludeGST(e.target.checked)} className="accent-yellow-600"/>
                            <span>GST (3%)</span>
                        </label>
                        <span className="font-mono">₹ {totals.gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Discount:</span>
                        <input 
                            type="number" 
                            className="w-20 border rounded p-1 text-right text-xs" 
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 font-medium">Grand Total</span>
                        <span className="text-3xl font-bold text-gray-900">₹ {totals.netPayable.toLocaleString()}</span>
                    </div>
                </div>

                <button 
                    onClick={handleConfirmSale}
                    className="w-full mt-8 bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 shadow-lg transform active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                    Confirm Sale <Save size={20}/>
                </button>
            </div>
        </div>

      </div>

      {/* --- CONFIRMATION & PAYMENT MODAL --- */}
      {showPaymentModal && (
        <PaymentModal 
          totals={totals} 
          customer={customer}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={submitBill}
        />
      )}

      {/* --- PRINT MODAL --- */}
      {showPrintModal && invoiceData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-lg">Invoice Preview</h3>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="bg-yellow-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-yellow-600">
                            <Printer size={18}/> Print
                        </button>
                        <button onClick={() => setShowPrintModal(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                            Close
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                    <InvoiceTemplate ref={componentRef} data={invoiceData} />
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

// Internal Component for Payment Modal
const PaymentModal = ({ totals, customer, onClose, onConfirm }) => {
    const [cash, setCash] = useState(totals.netPayable); // Default full cash
    const [online, setOnline] = useState(0);

    const totalPaid = parseFloat(cash || 0) + parseFloat(online || 0);
    const balance = totals.netPayable - totalPaid;

    // Auto-adjust logic
    const handleCashChange = (val) => {
        const c = parseFloat(val) || 0;
        setCash(c);
        // Optional: Auto-calculate remaining for online? 
        // For now, let's keep them independent but show balance warning
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Confirm Payment</h3>
                    <button onClick={onClose} className="hover:bg-gray-700 p-1 rounded"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-5">
                    {/* Summary */}
                    <div className="text-center">
                        <p className="text-gray-500 text-sm mb-1">Total Payable Amount</p>
                        <h2 className="text-4xl font-bold text-gray-800">₹ {totals.netPayable.toLocaleString()}</h2>
                        <p className="text-xs text-yellow-600 mt-1 font-medium">{customer.name} ({customer.phone})</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cash Received</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                                <input 
                                    type="number" 
                                    className="w-full border rounded pl-8 p-2 font-mono font-bold text-lg outline-none focus:border-yellow-500"
                                    value={cash}
                                    onChange={(e) => handleCashChange(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Online / UPI</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400">₹</span>
                                <input 
                                    type="number" 
                                    className="w-full border rounded pl-8 p-2 font-mono font-bold text-lg outline-none focus:border-blue-500"
                                    value={online}
                                    onChange={(e) => setOnline(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Balance Indicator */}
                    <div className={`p-3 rounded text-center border ${balance > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                        {balance > 0 ? (
                            <>
                                <span className="block text-xs font-bold uppercase">Balance Due (Credit)</span>
                                <span className="text-xl font-bold">₹ {balance.toLocaleString()}</span>
                                <p className="text-[10px] mt-1">This amount will be added to customer's pending balance.</p>
                            </>
                        ) : (
                            <span className="font-bold flex items-center justify-center gap-2">
                                ✅ Payment Complete
                            </span>
                        )}
                    </div>

                    <button 
                        onClick={() => onConfirm({ cash, online, totalPaid, balance })}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg shadow-md transition-colors"
                    >
                        Generate Invoice
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Billing;