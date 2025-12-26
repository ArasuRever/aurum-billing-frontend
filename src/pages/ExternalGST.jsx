import React, { useState, useEffect } from 'react';
import { api } from '../api';
import InvoiceTemplate from '../components/InvoiceTemplate';

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #printable-invoice, #printable-invoice * { visibility: visible; }
    #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; color: black; }
    .btn-close, .modal-footer, .no-print { display: none !important; }
  }
`;

function ExternalGST() {
  const [activeTab, setActiveTab] = useState('CREATE'); 
  const [history, setHistory] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);

  // Bill Meta
  const [billId, setBillId] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState(`GST-${Date.now()}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', gstin: '' });
  
  // Sale Items
  const [items, setItems] = useState([
      { id: Date.now(), item_name: '', hsn_code: '', gross_weight: '', purity: '', rate: '', making_charges: '', total: 0 }
  ]);

  // --- NEW: EXCHANGE STATE ---
  const [exchangeEntry, setExchangeEntry] = useState({
    item_name: '', metal_type: 'GOLD', gross_weight: '', 
    less_percent: '', less_weight: '', net_weight: 0, 
    rate: '', total: 0
  });
  const [exchangeItems, setExchangeItems] = useState([]);

  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);
    
    loadHistory();
    api.getBusinessSettings().then(res => setBusinessProfile(res.data)).catch(console.error);

    return () => document.head.removeChild(styleSheet);
  }, []);

  const loadHistory = async () => {
      try { const res = await api.getGstHistory(); setHistory(res.data); } catch(e) { console.error(e); }
  };

  // --- SALE ITEM HANDLERS ---
  const handleItemChange = (id, field, value) => {
      const newItems = items.map(item => {
          if(item.id !== id) return item;
          const updated = { ...item, [field]: value };
          const wt = parseFloat(field === 'gross_weight' ? value : updated.gross_weight) || 0;
          const rt = parseFloat(field === 'rate' ? value : updated.rate) || 0;
          const mc = parseFloat(field === 'making_charges' ? value : updated.making_charges) || 0;
          updated.total = ((wt * rt) + mc).toFixed(2);
          return updated;
      });
      setItems(newItems);
  };
  const addItemRow = () => setItems([...items, { id: Date.now(), item_name: '', hsn_code: '', gross_weight: '', purity: '', rate: '', making_charges: '', total: 0 }]);
  const removeItemRow = (id) => { if(items.length > 1) setItems(items.filter(i => i.id !== id)); };

  // --- EXCHANGE HANDLERS (Same as Billing.jsx) ---
  const handleExchangeEntryChange = (field, value) => {
      const newData = { ...exchangeEntry, [field]: value };
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
      if (!exchangeEntry.item_name || !exchangeEntry.gross_weight) return alert("Enter Item Name and Weight");
      setExchangeItems([...exchangeItems, { ...exchangeEntry, id: Date.now() }]);
      setExchangeEntry({ ...exchangeEntry, item_name: '', gross_weight: '', less_percent: '', less_weight: '', net_weight: 0, total: 0 });
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

  // --- CALCULATIONS ---
  const taxableTotal = items.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const cgst = taxableTotal * 0.015; 
  const sgst = taxableTotal * 0.015; 
  const billTotal = taxableTotal + cgst + sgst;
  const exchangeTotal = exchangeItems.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const finalTotal = Math.round(billTotal - exchangeTotal);

  // --- SAVE / UPDATE ---
  const handleSave = async () => {
      if(!customer.name) return alert("Customer Name Required");
      if(items.some(i => !i.item_name || !i.total)) return alert("Check Item Details");

      const payload = {
          invoice_no: invoiceNo,
          date: billDate,
          customer,
          items,
          exchangeItems, // Pass exchange items
          totals: {
              taxable: taxableTotal,
              cgst: cgst,
              sgst: sgst,
              exchange: exchangeTotal,
              final: finalTotal
          }
      };

      try {
          if (billId) {
              await api.updateGstBill(billId, payload);
              alert("Bill Updated!");
          } else {
              await api.createGstBill(payload);
              alert("Bill Created!");
          }
          resetForm();
          loadHistory();
          setActiveTab('HISTORY');
      } catch(e) { alert("Error: " + e.message); }
  };

  const resetForm = () => {
      setBillId(null);
      setInvoiceNo(`GST-${Date.now()}`);
      setBillDate(new Date().toISOString().split('T')[0]);
      setCustomer({ name: '', phone: '', address: '', gstin: '' });
      setItems([{ id: Date.now(), item_name: '', hsn_code: '', gross_weight: '', purity: '', rate: '', making_charges: '', total: 0 }]);
      setExchangeItems([]);
      setExchangeEntry({ item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: '', less_weight: '', net_weight: 0, rate: '', total: 0 });
  };

  // --- HISTORY & PRINT ---
  const handleEdit = async (bill) => {
      try {
          const res = await api.getGstBill(bill.id);
          const { bill: b, items: i, exchange_items: e } = res.data;
          
          setBillId(b.id);
          setInvoiceNo(b.invoice_number);
          setBillDate(b.bill_date.split('T')[0]);
          setCustomer({ name: b.customer_name, phone: b.customer_phone, address: b.customer_address, gstin: b.customer_gstin });
          setItems(i.map(x => ({ ...x, id: x.id, total: x.taxable_value })));
          
          // Load Exchange Items
          if(e && e.length > 0) {
              setExchangeItems(e.map(ex => ({
                  id: ex.id,
                  item_name: ex.item_name,
                  metal_type: ex.metal_type,
                  gross_weight: ex.gross_weight,
                  less_percent: ex.less_percent,
                  less_weight: ex.less_weight,
                  net_weight: ex.net_weight,
                  rate: ex.rate,
                  total: ex.total_amount
              })));
          } else { setExchangeItems([]); }

          setActiveTab('CREATE');
      } catch(e) { alert("Error loading bill"); }
  };

  const handleDelete = async (id) => { if(window.confirm("Delete?")) { await api.deleteGstBill(id); loadHistory(); } };

  const handlePrint = async (bill) => {
      try {
          const res = await api.getGstBill(bill.id);
          const { bill: b, items: i, exchange_items: e } = res.data;
          
          const data = {
              invoice_id: b.invoice_number,
              date: new Date(b.bill_date).toLocaleDateString(),
              customer: { name: b.customer_name, phone: b.customer_phone, address: b.customer_address, id: b.customer_gstin ? `GST: ${b.customer_gstin}` : '' },
              items: i.map(x => ({ 
                  item_name: x.item_name, gross_weight: x.gross_weight, rate: x.rate, making_charges: x.making_charges, total: parseFloat(x.taxable_value) 
              })),
              // Map Exchange items for Template
              exchangeItems: e ? e.map(ex => ({
                  name: ex.item_name,
                  net_weight: ex.net_weight,
                  rate: ex.rate,
                  total: parseFloat(ex.total_amount)
              })) : [],
              totals: {
                  grossTotal: parseFloat(b.gross_total),
                  totalDiscount: 0,
                  sgst: parseFloat(b.sgst_amount),
                  cgst: parseFloat(b.cgst_amount),
                  exchangeTotal: parseFloat(b.exchange_total || 0),
                  netPayable: parseFloat(b.total_amount),
                  paidAmount: parseFloat(b.total_amount), // Assuming full paid
                  balance: 0
              },
              includeGST: true
          };
          setPreviewData(data);
          setShowPreview(true);
      } catch(e) { console.error(e); }
  };

  return (
    <div className="container-fluid mt-4 pb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold text-danger"><i className="bi bi-file-earmark-text me-2"></i>External GST Billing</h2>
            <div className="btn-group">
                <button className={`btn ${activeTab === 'CREATE' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => { resetForm(); setActiveTab('CREATE'); }}>New Bill</button>
                <button className={`btn ${activeTab === 'HISTORY' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setActiveTab('HISTORY')}>History</button>
            </div>
        </div>

        {activeTab === 'CREATE' && (
            <div className="row g-3">
                {/* 1. Header Info */}
                <div className="col-12">
                    <div className="card shadow-sm border-danger border-2">
                        <div className="card-body">
                            <h6 className="fw-bold text-danger mb-3">Customer & Bill Details</h6>
                            <div className="row g-3">
                                <div className="col-md-3"><label className="small fw-bold">Invoice No</label><input className="form-control" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
                                <div className="col-md-3"><label className="small fw-bold">Date</label><input type="date" className="form-control" value={billDate} onChange={e => setBillDate(e.target.value)} /></div>
                                <div className="col-md-3"><label className="small fw-bold">Customer Name</label><input className="form-control" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} /></div>
                                <div className="col-md-3"><label className="small fw-bold">Phone</label><input className="form-control" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} /></div>
                                <div className="col-md-6"><label className="small fw-bold">Address</label><input className="form-control" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} /></div>
                                <div className="col-md-6"><label className="small fw-bold">Customer GSTIN</label><input className="form-control" value={customer.gstin} onChange={e => setCustomer({...customer, gstin: e.target.value})} /></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Items Grid */}
                <div className="col-md-9">
                    {/* Sale Items */}
                    <div className="card shadow-sm border-0 mb-3">
                        <div className="card-header bg-light fw-bold text-secondary">New Items</div>
                        <div className="card-body p-0">
                            <table className="table table-bordered mb-0 align-middle text-center">
                                <thead className="table-light"><tr><th style={{width:'25%'}}>Item</th><th>HSN</th><th>Gr. Wt</th><th>Purity</th><th>Rate</th><th>MC</th><th>Total</th><th></th></tr></thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id}>
                                            <td><input className="form-control form-control-sm" value={item.item_name} onChange={e => handleItemChange(item.id, 'item_name', e.target.value)} placeholder="Item" /></td>
                                            <td><input className="form-control form-control-sm" value={item.hsn_code} onChange={e => handleItemChange(item.id, 'hsn_code', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm" value={item.gross_weight} onChange={e => handleItemChange(item.id, 'gross_weight', e.target.value)} /></td>
                                            <td><input className="form-control form-control-sm" value={item.purity} onChange={e => handleItemChange(item.id, 'purity', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm" value={item.making_charges} onChange={e => handleItemChange(item.id, 'making_charges', e.target.value)} /></td>
                                            <td className="fw-bold">{item.total}</td>
                                            <td><button className="btn btn-sm text-danger" onClick={() => removeItemRow(item.id)}>&times;</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 text-center"><button className="btn btn-sm btn-outline-secondary" onClick={addItemRow}>+ Add Row</button></div>
                        </div>
                    </div>

                    {/* 3. Old Item Exchange Table */}
                    <div className="card shadow-sm border-0 mb-3 bg-light">
                        <div className="card-header bg-secondary text-white py-2"><span className="small fw-bold"><i className="bi bi-arrow-repeat me-2"></i>Old Item Exchange</span></div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-bordered mb-0">
                                    <thead className="table-secondary small text-center"><tr><th>Item</th><th>Metal</th><th>Gr. Wt</th><th>Less %</th><th>Less Wt</th><th>Net Wt</th><th>Rate</th><th>Total</th><th></th></tr></thead>
                                    <tbody className="align-middle">
                                        {exchangeItems.map((item, i) => (
                                            <tr key={item.id}>
                                                <td><input className="form-control form-control-sm" value={item.item_name} onChange={e => updateExchangeItem(i, 'item_name', e.target.value)} /></td>
                                                <td><select className="form-select form-select-sm" value={item.metal_type} onChange={e => updateExchangeItem(i, 'metal_type', e.target.value)}><option value="GOLD">GOLD</option><option value="SILVER">SILVER</option></select></td>
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
                                            <td><input className="form-control form-control-sm" placeholder="Old Item..." value={exchangeEntry.item_name} onChange={e => handleExchangeEntryChange('item_name', e.target.value)} /></td>
                                            <td><select className="form-select form-select-sm" value={exchangeEntry.metal_type} onChange={e => handleExchangeEntryChange('metal_type', e.target.value)}><option value="GOLD">GOLD</option><option value="SILVER">SILVER</option></select></td>
                                            <td><input type="number" className="form-control form-control-sm" placeholder="Wt" value={exchangeEntry.gross_weight} onChange={e => handleExchangeEntryChange('gross_weight', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm" placeholder="%" value={exchangeEntry.less_percent} onChange={e => handleExchangeEntryChange('less_percent', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm" placeholder="Less" value={exchangeEntry.less_weight} onChange={e => handleExchangeEntryChange('less_weight', e.target.value)} /></td>
                                            <td className="text-center text-muted small">{exchangeEntry.net_weight || '-'}</td>
                                            <td><input type="number" className="form-control form-control-sm" placeholder="Rate" value={exchangeEntry.rate} onChange={e => handleExchangeEntryChange('rate', e.target.value)} /></td>
                                            <td className="text-center fw-bold text-success">{exchangeEntry.total || '-'}</td>
                                            <td><button className="btn btn-sm btn-success fw-bold" onClick={addExchangeItem}>+</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Totals */}
                <div className="col-md-3">
                    <div className="card bg-white shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h5 className="border-bottom pb-2">Summary</h5>
                            <div className="d-flex justify-content-between mb-1"><span>Taxable:</span><span>{taxableTotal.toFixed(2)}</span></div>
                            <div className="d-flex justify-content-between mb-1 text-muted small"><span>CGST (1.5%):</span><span>{cgst.toFixed(2)}</span></div>
                            <div className="d-flex justify-content-between mb-3 text-muted small"><span>SGST (1.5%):</span><span>{sgst.toFixed(2)}</span></div>
                            <div className="d-flex justify-content-between mb-3 pt-2 border-top fw-bold"><span>Bill Total:</span><span>₹{billTotal.toFixed(2)}</span></div>
                            {exchangeTotal > 0 && <div className="alert alert-success p-2 mb-3 d-flex justify-content-between"><span className="small fw-bold">Less Exchange</span><span className="fw-bold">- {exchangeTotal}</span></div>}
                            <div className="d-flex justify-content-between pt-2 border-top"><span className="fw-bold fs-4">Payable:</span><span className="fw-bold fs-4 text-success">₹{finalTotal}</span></div>
                            
                            <button className="btn btn-danger w-100 fw-bold mt-4 py-2" onClick={handleSave}>{billId ? 'UPDATE BILL' : 'SAVE GST BILL'}</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'HISTORY' && (
            <div className="card shadow-sm border-0">
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                        <thead className="table-light"><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Amount</th><th>Actions</th></tr></thead>
                        <tbody>
                            {history.map(b => (
                                <tr key={b.id}>
                                    <td className="fw-bold">{b.invoice_number}</td>
                                    <td>{new Date(b.bill_date).toLocaleDateString()}</td>
                                    <td>{b.customer_name}<br/><small className="text-muted">{b.customer_phone}</small></td>
                                    <td className="fw-bold text-success">₹{b.total_amount}</td>
                                    <td>
                                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handlePrint(b)}><i className="bi bi-printer"></i></button>
                                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => handleEdit(b)}><i className="bi bi-pencil"></i></button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(b.id)}><i className="bi bi-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-muted">No Bills Found</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {showPreview && previewData && (
            <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050}}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content" style={{height: '90vh'}}>
                        <div className="modal-header bg-dark text-white"><h5 className="modal-title">External GST Invoice</h5><button className="btn-close btn-close-white" onClick={() => setShowPreview(false)}></button></div>
                        <div className="modal-body overflow-auto p-0 bg-secondary bg-opacity-10"><InvoiceTemplate data={previewData} businessProfile={businessProfile} /></div>
                        <div className="modal-footer bg-light"><button className="btn btn-primary fw-bold" onClick={() => window.print()}>PRINT</button></div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default ExternalGST;