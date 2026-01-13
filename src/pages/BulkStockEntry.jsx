import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { FaTrash, FaPlus, FaSave, FaCalculator } from 'react-icons/fa';

// Helper: Image to Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

function BulkStockEntry() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [productTypes, setProductTypes] = useState([]); 
  
  const [batchDetails, setBatchDetails] = useState({
      vendor_id: '',
      metal_type: 'GOLD',
      invoice_no: ''
  });

  const [rows, setRows] = useState([]);
  const [purityMode, setPurityMode] = useState('TOUCH'); 

  useEffect(() => {
    const init = async () => {
        try {
            const [vRes, mRes, tRes] = await Promise.all([
                api.searchVendor(''), 
                api.getMasterItems(),
                api.getProductTypes()
            ]);
            setVendors(vRes.data);
            setMasterItems(mRes.data);
            setProductTypes(tRes.data || []);
            
            if(tRes.data && tRes.data.length > 0) {
                setBatchDetails(prev => ({ ...prev, metal_type: tRes.data[0].name }));
            }
            handleAddRow();
        } catch(e) { console.error(e); }
    };
    init();
  }, []);

  const fetchMasterItems = async () => {
      try {
        const res = await api.getMasterItems();
        setMasterItems(res.data);
      } catch (e) { console.error(e); }
  };

  // --- BARCODE GENERATOR: Format G-MKCB6IZE-267 ---
  const generateBarcodeID = (itemName, metalType) => {
    if (!itemName) return '';
    const prefix = metalType === 'SILVER' ? 'S' : 'G';
    
    // Extract Initials (e.g., "Muthu Kuberan Chain" -> "MKC")
    const initials = itemName
        .replace(/[^a-zA-Z ]/g, "")
        .split(' ')
        .filter(w => w.length > 0)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 3) || 'XX';
    
    // Generate unique hash (middle part like "B6IZE")
    const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Random sequence (suffix like "267")
    const seq = Math.floor(Math.random() * 900) + 100;

    return `${prefix}-${initials}${hash}-${seq}`;
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, {
        id: Date.now(),
        item_name: '',
        barcode: '', // New field
        stock_type: 'SINGLE',
        quantity: 1,
        gross_weight: '',
        wastage_percent: '', 
        making_charges: '',
        huid: '',
        item_image: null,
        calc_pure: 0
    }]);
  };

  const handleRemoveRow = (id) => {
      if(rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  const togglePurityMode = () => {
      const newMode = purityMode === 'TOUCH' ? 'WASTAGE' : 'TOUCH';
      setPurityMode(newMode);
      setRows(rows.map(row => ({
          ...row,
          calc_pure: calculatePure(row.gross_weight, row.wastage_percent, newMode)
      })));
  };

  const calculatePure = (grossStr, factorStr, mode) => {
      const gross = parseFloat(grossStr) || 0;
      const factor = parseFloat(factorStr) || 0;
      return mode === 'TOUCH' 
        ? (gross * (factor / 100)).toFixed(3) 
        : (gross * (1 + (factor / 100))).toFixed(3);
  };

  const handleRowChange = (id, field, value) => {
      const newRows = rows.map(row => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value };
          
          if (field === 'item_name') {
              // GENERATE BARCODE ON NAME CHANGE
              updated.barcode = generateBarcodeID(value, batchDetails.metal_type);
              
              const match = masterItems.find(m => 
                  m.item_name.toLowerCase() === value.toLowerCase() && 
                  m.metal_type === batchDetails.metal_type
              );
              if (match) {
                  updated.wastage_percent = match.default_wastage;
                  updated.calc_pure = calculatePure(updated.gross_weight, match.default_wastage, purityMode);
                  if (match.mc_type === 'FIXED') updated.making_charges = match.mc_value;
              }
          }

          if (field === 'gross_weight' || field === 'wastage_percent') {
              updated.calc_pure = calculatePure(updated.gross_weight, updated.wastage_percent, purityMode);
              if (field === 'gross_weight') {
                   const match = masterItems.find(m => m.item_name === updated.item_name);
                   if (match && match.mc_type === 'PER_GRAM') {
                       updated.making_charges = (parseFloat(value) * parseFloat(match.mc_value)).toFixed(2);
                   }
              }
          }
          return updated;
      });
      setRows(newRows);
  };

  const handleFileChange = (id, file) => {
      setRows(rows.map(r => r.id === id ? { ...r, item_image: file } : r));
  };

  const handleVendorChange = (e) => {
      const val = e.target.value;
      const selectedVendor = vendors.find(v => v.id.toString() === val);
      setBatchDetails(prev => {
          let newMetal = prev.metal_type;
          if (selectedVendor && selectedVendor.vendor_type && selectedVendor.vendor_type !== 'BOTH') {
              const match = productTypes.find(t => t.name.toUpperCase() === selectedVendor.vendor_type.toUpperCase());
              if(match) newMetal = match.name;
          }
          return { ...prev, vendor_id: val, metal_type: newMetal };
      });
  };

  const handleSubmit = async () => {
      if(!batchDetails.vendor_id) return alert("Select Source");
      const validRows = rows.filter(r => r.item_name && r.gross_weight);
      if(validRows.length === 0) return alert("Enter valid items");

      if(!window.confirm(`Add ${validRows.length} items to inventory?`)) return;

      try {
          const processedItems = await Promise.all(validRows.map(async (r) => ({
              ...r,
              pure_weight: r.calc_pure,
              quantity: r.stock_type === 'BULK' ? (r.quantity || 1) : 1,
              item_image_base64: r.item_image ? await toBase64(r.item_image) : null
          })));

          const payload = {
              vendor_id: batchDetails.vendor_id === 'OWN' ? null : batchDetails.vendor_id,
              metal_type: batchDetails.metal_type,
              invoice_no: batchDetails.invoice_no || 'OWN-STOCK',
              items: processedItems
          };

          await api.addBatchInventory(payload);
          alert("Batch Added Successfully!");
          navigate('/inventory');
      } catch (err) { alert("Failed: " + err.message); }
  };

  const totalGross = rows.reduce((sum, r) => sum + (parseFloat(r.gross_weight)||0), 0).toFixed(3);
  const totalPure = rows.reduce((sum, r) => sum + (parseFloat(r.calc_pure)||0), 0).toFixed(3);

  return (
    <div className="container-fluid mt-4 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-primary mb-0"><i className="bi bi-box-seam me-2"></i>Bulk Stock Entry</h2>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => navigate('/inventory')}>Cancel</button>
            <button className="btn btn-success fw-bold px-4" onClick={handleSubmit}><FaSave className="me-2"/> SAVE BATCH</button>
          </div>
      </div>

      <div className="card shadow-sm border-0 mb-4 bg-light">
          <div className="card-body">
              <div className="row g-3">
                  <div className="col-md-3">
                      <label className="form-label small fw-bold">Stock Source</label>
                      <select className="form-select" value={batchDetails.vendor_id} onChange={handleVendorChange}>
                          <option value="">-- Select Source --</option>
                          <option value="OWN">✦ Shop / Own Stock</option>
                          <optgroup label="Vendors">
                              {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                          </optgroup>
                      </select>
                  </div>
                  <div className="col-md-2">
                      <label className="form-label small fw-bold">Metal Group</label>
                      <select className="form-select" value={batchDetails.metal_type} onChange={e => setBatchDetails({...batchDetails, metal_type: e.target.value})}>
                          {productTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                  </div>
                  <div className="col-md-3">
                      <label className="form-label small fw-bold">Invoice / Ref No</label>
                      <input className="form-control" value={batchDetails.invoice_no} onChange={e => setBatchDetails({...batchDetails, invoice_no: e.target.value})} />
                  </div>
                  <div className="col-md-4 d-flex align-items-end justify-content-end gap-2">
                       <div className="bg-white px-3 py-2 rounded border">Gross: <strong>{totalGross}g</strong></div>
                       <div className="bg-white px-3 py-2 rounded border">Pure: <strong className="text-success">{totalPure}g</strong></div>
                  </div>
              </div>
          </div>
      </div>

      <div className="card shadow-sm border-0">
          <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0 text-center small">
                  <thead className="table-light text-uppercase">
                      <tr>
                          <th>#</th>
                          <th style={{width:'22%'}}>Item Name</th>
                          <th style={{width:'18%'}}>Barcode ID</th>
                          <th style={{width:'15%'}}>Type</th>
                          <th>Gross Wt</th>
                          <th onClick={togglePurityMode} style={{cursor:'pointer'}} className="bg-warning bg-opacity-10">{purityMode} <FaCalculator size={10}/></th>
                          <th>Pure Wt</th>
                          <th>MC</th>
                          <th>HUID</th>
                          <th>Image</th>
                          <th></th>
                      </tr>
                  </thead>
                  <tbody>
                      {rows.map((row, index) => (
                          <tr key={row.id}>
                              <td>{index + 1}</td>
                              <td>
                                  <input className="form-control form-control-sm fw-bold" list={`list-${row.id}`} value={row.item_name} onChange={e => handleRowChange(row.id, 'item_name', e.target.value)} />
                                  <datalist id={`list-${row.id}`}>{masterItems.filter(m => m.metal_type === batchDetails.metal_type).map(m => <option key={m.id} value={m.item_name} />)}</datalist>
                              </td>
                              <td>
                                  <input className="form-control form-control-sm bg-light text-center font-monospace border-0 fw-bold" value={row.barcode} readOnly placeholder="AUTO" />
                              </td>
                              <td>
                                  <div className="d-flex gap-1">
                                      <select className="form-select form-select-sm" value={row.stock_type} onChange={e => handleRowChange(row.id, 'stock_type', e.target.value)}>
                                          <option value="SINGLE">Single</option><option value="BULK">Bulk</option>
                                      </select>
                                      {row.stock_type === 'BULK' && <input type="number" className="form-control form-control-sm" style={{width:'50px'}} value={row.quantity} onChange={e => handleRowChange(row.id, 'quantity', e.target.value)} />}
                                  </div>
                              </td>
                              <td><input type="number" className="form-control form-control-sm" value={row.gross_weight} onChange={e => handleRowChange(row.id, 'gross_weight', e.target.value)} /></td>
                              <td className="bg-warning bg-opacity-10"><input type="number" className="form-control form-control-sm border-0 bg-transparent text-center" value={row.wastage_percent} onChange={e => handleRowChange(row.id, 'wastage_percent', e.target.value)} /></td>
                              <td><input className="form-control form-control-sm bg-light border-0 text-center fw-bold text-success" readOnly value={row.calc_pure} /></td>
                              <td><input type="number" className="form-control form-control-sm" value={row.making_charges} onChange={e => handleRowChange(row.id, 'making_charges', e.target.value)} /></td>
                              <td><input className="form-control form-control-sm text-uppercase" value={row.huid} onChange={e => handleRowChange(row.id, 'huid', e.target.value)} /></td>
                              <td><input type="file" className="form-control form-control-sm" style={{width:'90px'}} onChange={e => handleFileChange(row.id, e.target.files[0])} /></td>
                              <td><button className="btn btn-link btn-sm text-danger" onClick={() => handleRemoveRow(row.id)}><FaTrash /></button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          <div className="card-footer bg-white text-center py-3">
              <button className="btn btn-outline-primary btn-sm rounded-pill px-4" onClick={handleAddRow}><FaPlus className="me-1"/>Add Another Row</button>
          </div>
      </div>
    </div>
  );
}

export default BulkStockEntry;