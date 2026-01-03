import React, { useState, useEffect } from 'react';
import { api } from '../api';
import InvoiceTemplate from '../components/InvoiceTemplate';

// --- CLEAN PRINT STYLES ---
const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #printable-invoice, #printable-invoice * { visibility: visible; }
    #printable-invoice { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 210mm; 
        margin: 0; 
        padding: 0; 
        background: white; 
        color: black; 
    }
    .btn-close, .modal-footer, .no-print { display: none !important; }
  }
`;

function ExternalGST() {
  const [activeTab, setActiveTab] = useState('CREATE'); 
  const [history, setHistory] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  
  // Data for Auto-Import
  const [masterItems, setMasterItems] = useState([]);
  const [rates, setRates] = useState({ GOLD: 0, SILVER: 0 });

  // Bill Form
  const [billId, setBillId] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState(`GST-${Date.now()}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', gstin: '' });
  
  // Items Grid
  const [items, setItems] = useState([
      { id: Date.now(), item_name: '', hsn_code: '', gross_weight: '', wastage_percent: '', wastage_weight: 0, rate: '', making_charges: '', discount: '', total: 0 }
  ]);

  const [exchangeEntry, setExchangeEntry] = useState({ item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: '', less_weight: '', net_weight: 0, rate: '', total: 0 });
  const [exchangeItems, setExchangeItems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = printStyles;
    document.head.appendChild(styleSheet);
    
    loadHistory();
    loadInitData();

    return () => document.head.removeChild(styleSheet);
  }, []);

  const loadInitData = async () => {
      try {
          const [biz, mItems, dRates] = await Promise.all([api.getBusinessSettings(), api.getMasterItems(), api.getDailyRates()]);
          setBusinessProfile(biz.data);
          setMasterItems(mItems.data || []);
          if(dRates.data) setRates(dRates.data);
      } catch(e) { console.error(e); }
  };

  const loadHistory = async () => { try { const res = await api.getGstHistory(); setHistory(res.data); } catch(e) {} };

  // --- ITEM HANDLERS ---
  const handleItemChange = (id, field, value) => {
      const newItems = items.map(item => {
          if(item.id !== id) return item;
          const updated = { ...item, [field]: value };

          // Auto-Import Logic
          if(field === 'item_name') {
              const match = masterItems.find(m => m.item_name.toLowerCase() === value.toLowerCase());
              if(match) {
                  updated.hsn_code = match.hsn_code || updated.hsn_code;
                  updated.wastage_percent = match.default_wastage || updated.wastage_percent;
                  if(match.metal_type === 'GOLD' && !updated.rate) updated.rate = rates.GOLD;
                  if(match.metal_type === 'SILVER' && !updated.rate) updated.rate = rates.SILVER;
                  if(match.mc_type === 'FIXED') updated.making_charges = match.mc_value;
              }
          }

          // Calculation Logic
          const gross = parseFloat(field === 'gross_weight' ? value : updated.gross_weight) || 0;
          
          if (field === 'wastage_percent') {
              updated.wastage_weight = (gross * (parseFloat(value || 0) / 100)).toFixed(3);
          } else if (field === 'wastage_weight') {
              updated.wastage_weight = value; 
          } else if (field === 'gross_weight') {
              updated.wastage_weight = (gross * (parseFloat(updated.wastage_percent || 0) / 100)).toFixed(3);
          }

          const wstWt = parseFloat(updated.wastage_weight) || 0;
          const rt = parseFloat(field === 'rate' ? value : updated.rate) || 0;
          const mc = parseFloat(field === 'making_charges' ? value : updated.making_charges) || 0;
          const disc = parseFloat(field === 'discount' ? value : updated.discount) || 0;

          updated.total = (((gross + wstWt) * rt) + mc - disc).toFixed(2);
          return updated;
      });
      setItems(newItems);
  };

  const addItemRow = () => setItems([...items, { id: Date.now(), item_name: '', hsn_code: '', gross_weight: '', wastage_percent: '', wastage_weight: 0, rate: '', making_charges: '', discount: '', total: 0 }]);
  const removeItemRow = (id) => { if(items.length > 1) setItems(items.filter(i => i.id !== id)); };

  // --- EXCHANGE HANDLERS ---
  const handleExchangeEntryChange = (f, v) => {
      const n = { ...exchangeEntry, [f]: v };
      const g = parseFloat(f==='gross_weight'?v:n.gross_weight)||0;
      if(f==='less_percent') n.less_weight=(g*(parseFloat(v||0)/100)).toFixed(3);
      else if(f==='less_weight') n.less_percent=g>0?((parseFloat(v||0)/g)*100).toFixed(2):0;
      else if(f==='gross_weight') n.less_weight=(parseFloat(v||0)*(parseFloat(n.less_percent||0)/100)).toFixed(3);
      const nw = g-(parseFloat(n.less_weight)||0); n.net_weight=nw>0?nw.toFixed(3):0;
      n.total=Math.round(parseFloat(n.net_weight)*(parseFloat(n.rate)||0));
      setExchangeEntry(n);
  };
  const addExchangeItem = () => { if(!exchangeEntry.item_name) return; setExchangeItems([...exchangeItems, { ...exchangeEntry, id: Date.now() }]); setExchangeEntry({ item_name: '', metal_type: 'GOLD', gross_weight: '', less_percent: '', less_weight: '', net_weight: 0, rate: '', total: 0 }); };
  const removeExchangeItem = (i) => setExchangeItems(exchangeItems.filter((_, x) => x !== i));

  // --- TOTAL CALCULATIONS (Live Deduction) ---
  const taxableTotal = items.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const cgst = taxableTotal * 0.015; 
  const sgst = taxableTotal * 0.015; 
  const billTotal = taxableTotal + cgst + sgst;
  
  const currentTypingTotal = parseFloat(exchangeEntry.total) || 0;
  const listExchangeTotal = exchangeItems.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const totalExchangeDeduction = listExchangeTotal + currentTypingTotal;

  const finalTotal = Math.round(billTotal - totalExchangeDeduction);

  const handleSave = async () => {
      if(!customer.name) return alert("Customer Name Required");
      const payload = { invoice_no: invoiceNo, date: billDate, customer, items, exchangeItems, totals: { taxable: taxableTotal, cgst, sgst, exchange: listExchangeTotal, final: Math.round(billTotal - listExchangeTotal) } };
      try {
          if (billId) await api.updateGstBill(billId, payload); else await api.createGstBill(payload);
          alert("Saved!"); resetForm(); loadHistory(); setActiveTab('HISTORY');
      } catch(e) { alert(e.message); }
  };

  const resetForm = () => {
      setBillId(null); setInvoiceNo(`GST-${Date.now()}`); setCustomer({ name: '', phone: '', address: '', gstin: '' });
      setItems([{ id: Date.now(), item_name: '', hsn_code: '', gross_weight: '', wastage_percent: '', wastage_weight: 0, rate: '', making_charges: '', discount: '', total: 0 }]);
      setExchangeItems([]);
  };

  // --- PRINT PREPARATION (Fixed Missing Fields) ---
  const handlePrint = async (bill) => {
      try {
          const res = await api.getGstBill(bill.id);
          const { bill: b, items: i, exchange_items: e } = res.data;
          
          const data = {
              invoice_id: b.invoice_number, 
              date: new Date(b.bill_date).toLocaleDateString(),
              customer: { name: b.customer_name, phone: b.customer_phone, address: b.customer_address, gstin: b.customer_gstin },
              
              // MAPPED CORRECTLY for new Invoice Template
              items: i.map(x => ({ 
                  item_name: x.item_name, 
                  hsn_code: x.hsn_code,  // <--- ADDED THIS (Was Missing)
                  gross_weight: x.gross_weight, 
                  wastage_percent: x.wastage_percent, 
                  wastage_weight: x.wastage_weight, 
                  rate: x.rate, 
                  making_charges: x.making_charges, // <--- Ensures MC shows
                  discount: x.discount_amount,      // <--- Ensures Discount shows
                  total: parseFloat(x.taxable_value) 
              })),
              
              exchangeItems: e ? e.map(ex => ({ name: ex.item_name, net_weight: ex.net_weight, rate: ex.rate, total: parseFloat(ex.total_amount) })) : [],
              totals: { 
                  grossTotal: parseFloat(b.gross_total), 
                  totalDiscount: 0, // Discount is per item, so global discount is 0 here
                  sgst: parseFloat(b.sgst_amount), 
                  cgst: parseFloat(b.cgst_amount), 
                  exchangeTotal: parseFloat(b.exchange_total||0), 
                  netPayable: parseFloat(b.total_amount), 
                  paidAmount: parseFloat(b.total_amount), 
                  balance: 0 
              },
              includeGST: true
          };
          setPreviewData(data); setShowPreview(true);
      } catch(e) { console.error(e); }
  };

  return (
    <div className="container-fluid mt-4 pb-5">
        <div className="d-flex justify-content-between align-items-center mb-4"><h2 className="fw-bold text-danger">External GST Billing</h2><div><button className={`btn ${activeTab==='CREATE'?'btn-danger':'btn-outline-danger'} me-1`} onClick={()=>{resetForm();setActiveTab('CREATE')}}>New Bill</button><button className={`btn ${activeTab==='HISTORY'?'btn-danger':'btn-outline-danger'}`} onClick={()=>setActiveTab('HISTORY')}>History</button></div></div>
        
        {activeTab === 'CREATE' && (
            <div className="row g-3">
                <div className="col-12"><div className="card shadow-sm border-danger border-2"><div className="card-body py-2"><div className="row g-2"><div className="col-md-2"><label className="small fw-bold">Invoice</label><input className="form-control form-control-sm" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}/></div><div className="col-md-2"><label className="small fw-bold">Date</label><input type="date" className="form-control form-control-sm" value={billDate} onChange={e=>setBillDate(e.target.value)}/></div><div className="col-md-3"><label className="small fw-bold">Customer</label><input className="form-control form-control-sm" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/></div><div className="col-md-2"><label className="small fw-bold">Phone</label><input className="form-control form-control-sm" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></div><div className="col-md-3"><label className="small fw-bold">GSTIN</label><input className="form-control form-control-sm" value={customer.gstin} onChange={e=>setCustomer({...customer,gstin:e.target.value})}/></div></div></div></div></div>
                
                <div className="col-md-12">
                    <div className="card shadow-sm border-0 mb-3">
                        <div className="table-responsive">
                            <table className="table table-bordered mb-0 align-middle text-center table-sm">
                                <thead className="table-light small"><tr><th style={{width:'20%'}}>Item</th><th style={{width:'8%'}}>HSN</th><th style={{width:'8%'}}>Gr. Wt</th><th style={{width:'15%'}}>Wastage (% / Wt)</th><th>Rate</th><th>MC</th><th>Disc</th><th>Total</th><th></th></tr></thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <input className="form-control form-control-sm" value={item.item_name} onChange={e => handleItemChange(item.id, 'item_name', e.target.value)} placeholder="Type Name..." list={`list-${item.id}`} />
                                                <datalist id={`list-${item.id}`}>{masterItems.map(m=><option key={m.id} value={m.item_name}/>)}</datalist>
                                            </td>
                                            <td><input className="form-control form-control-sm" value={item.hsn_code} onChange={e => handleItemChange(item.id, 'hsn_code', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm" value={item.gross_weight} onChange={e => handleItemChange(item.id, 'gross_weight', e.target.value)} /></td>
                                            <td><div className="input-group input-group-sm"><input type="number" className="form-control px-1" placeholder="%" value={item.wastage_percent} onChange={e => handleItemChange(item.id, 'wastage_percent', e.target.value)} /><input type="number" className="form-control px-1 bg-light" placeholder="Wt" value={item.wastage_weight} onChange={e => handleItemChange(item.id, 'wastage_weight', e.target.value)} /></div></td>
                                            <td><input type="number" className="form-control form-control-sm" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm" value={item.making_charges} onChange={e => handleItemChange(item.id, 'making_charges', e.target.value)} /></td>
                                            <td><input type="number" className="form-control form-control-sm text-danger" value={item.discount} onChange={e => handleItemChange(item.id, 'discount', e.target.value)} /></td>
                                            <td className="fw-bold">{item.total}</td>
                                            <td><button className="btn btn-sm text-danger" onClick={() => removeItemRow(item.id)}>&times;</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 text-center"><button className="btn btn-sm btn-outline-secondary" onClick={addItemRow}>+ Add Row</button></div>
                        </div>
                    </div>
                    
                    <div className="row">
                        <div className="col-md-8">
                            <div className="card shadow-sm border-0 mb-3 bg-light"><div className="card-header bg-secondary text-white py-1 small">Exchange</div><div className="table-responsive"><table className="table table-bordered mb-0 table-sm small"><thead className="table-secondary text-center"><tr><th>Item</th><th>Wt</th><th>Less%</th><th>LessWt</th><th>Net</th><th>Rate</th><th>Total</th><th></th></tr></thead><tbody>{exchangeItems.map((item, i) => (<tr key={item.id}><td>{item.item_name}</td><td>{item.gross_weight}</td><td>{item.less_percent}</td><td>{item.less_weight}</td><td>{item.net_weight}</td><td>{item.rate}</td><td>{item.total}</td><td><button className="btn btn-sm text-danger p-0" onClick={()=>removeExchangeItem(i)}>&times;</button></td></tr>))}<tr className="bg-white"><td><input className="form-control form-control-sm" value={exchangeEntry.item_name} onChange={e=>handleExchangeEntryChange('item_name',e.target.value)} placeholder="Item" /></td><td><input type="number" className="form-control form-control-sm" value={exchangeEntry.gross_weight} onChange={e=>handleExchangeEntryChange('gross_weight',e.target.value)} style={{width:'60px'}}/></td><td><input type="number" className="form-control form-control-sm" value={exchangeEntry.less_percent} onChange={e=>handleExchangeEntryChange('less_percent',e.target.value)} style={{width:'50px'}}/></td><td><input type="number" className="form-control form-control-sm" value={exchangeEntry.less_weight} onChange={e=>handleExchangeEntryChange('less_weight',e.target.value)} style={{width:'60px'}}/></td><td>{exchangeEntry.net_weight}</td><td><input type="number" className="form-control form-control-sm" value={exchangeEntry.rate} onChange={e=>handleExchangeEntryChange('rate',e.target.value)} style={{width:'70px'}}/></td><td>{exchangeEntry.total}</td><td><button className="btn btn-sm btn-success p-0 px-2" onClick={addExchangeItem}>+</button></td></tr></tbody></table></div></div>
                        </div>
                        <div className="col-md-4">
                            <div className="card bg-white shadow-sm border-0 h-100"><div className="card-body"><div className="d-flex justify-content-between mb-1"><span>Taxable:</span><span>{taxableTotal.toFixed(2)}</span></div><div className="d-flex justify-content-between mb-1 text-muted small"><span>CGST (1.5%):</span><span>{cgst.toFixed(2)}</span></div><div className="d-flex justify-content-between mb-3 text-muted small"><span>SGST (1.5%):</span><span>{sgst.toFixed(2)}</span></div><div className="d-flex justify-content-between mb-3 pt-2 border-top fw-bold"><span>Bill Total:</span><span>₹{billTotal.toFixed(2)}</span></div>{totalExchangeDeduction > 0 && <div className="alert alert-success p-1 px-2 mb-3 d-flex justify-content-between small"><span className="fw-bold">Less Exchange</span><span className="fw-bold">- {totalExchangeDeduction}</span></div>}<div className="d-flex justify-content-between pt-2 border-top"><span className="fw-bold fs-4">Payable:</span><span className="fw-bold fs-4 text-success">₹{finalTotal}</span></div><button className="btn btn-danger w-100 fw-bold mt-4" onClick={handleSave}>{billId?'UPDATE':'SAVE BILL'}</button></div></div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'HISTORY' && (<div className="card shadow-sm border-0"><div className="table-responsive"><table className="table table-hover align-middle"><thead className="table-light"><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{history.map(b => (<tr key={b.id}><td className="fw-bold">{b.invoice_number}</td><td>{new Date(b.bill_date).toLocaleDateString()}</td><td>{b.customer_name}</td><td className="fw-bold text-success">₹{b.total_amount}</td><td><button className="btn btn-sm btn-outline-primary me-2" onClick={() => handlePrint(b)}><i className="bi bi-printer"></i></button><button className="btn btn-sm btn-outline-secondary me-2" onClick={() => {setBillId(b.id); setInvoiceNo(b.invoice_number); setBillDate(b.bill_date.split('T')[0]); setCustomer({name:b.customer_name, phone:b.customer_phone, address:b.customer_address, gstin:b.customer_gstin}); api.getGstBill(b.id).then(res=>{setItems(res.data.items.map(x=>({...x, total:x.taxable_value}))); setExchangeItems(res.data.exchange_items.map(e=>({...e, total:e.total_amount}))); setActiveTab('CREATE');});}}><i className="bi bi-pencil"></i></button><button className="btn btn-sm btn-outline-danger" onClick={() => {if(window.confirm("Del?")) api.deleteGstBill(b.id).then(loadHistory)}}><i className="bi bi-trash"></i></button></td></tr>))}</tbody></table></div></div>)}
        {showPreview && previewData && (<div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050}}><div className="modal-dialog modal-lg"><div className="modal-content" style={{height: '90vh'}}><div className="modal-header bg-dark text-white"><h5 className="modal-title">GST Invoice</h5><button className="btn-close btn-close-white" onClick={() => setShowPreview(false)}></button></div><div className="modal-body overflow-auto p-0 bg-secondary bg-opacity-10"><InvoiceTemplate data={previewData} businessProfile={businessProfile} /></div><div className="modal-footer bg-light"><button className="btn btn-primary fw-bold" onClick={() => window.print()}>PRINT</button></div></div></div></div>)}
    </div>
  );
}
export default ExternalGST;