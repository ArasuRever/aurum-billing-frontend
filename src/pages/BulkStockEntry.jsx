import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

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
  
  // Header State
  const [batchDetails, setBatchDetails] = useState({
      vendor_id: '',
      metal_type: 'GOLD',
      invoice_no: ''
  });

  // Grid State
  const [rows, setRows] = useState([]);
  const [purityMode, setPurityMode] = useState('TOUCH'); // 'TOUCH' or 'WASTAGE'

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
        try {
            const [vRes, mRes] = await Promise.all([api.searchVendor(''), api.getMasterItems()]);
            setVendors(vRes.data);
            setMasterItems(mRes.data);
            // Add initial empty row
            handleAddRow();
        } catch(e) { console.error(e); }
    };
    init();
  }, []);

  // --- ACTIONS ---
  const handleAddRow = () => {
    setRows(prev => [...prev, {
        id: Date.now(),
        item_name: '',
        stock_type: 'SINGLE',
        gross_weight: '',
        wastage_percent: '', // Acts as Touch% or Wastage% based on mode
        making_charges: '',
        huid: '',
        item_image: null,
        calc_pure: 0
    }]);
  };

  const handleRemoveRow = (id) => {
      if(rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  const calculatePure = (gross, val, mode) => {
      const g = parseFloat(gross) || 0;
      const v = parseFloat(val) || 0;
      if(mode === 'TOUCH') return (g * (v / 100)).toFixed(3);
      return (g * (v / 100)).toFixed(3);
  };

  const handleRowChange = (id, field, value) => {
      const newRows = rows.map(row => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value };
          
          // Auto-Populate from Master Item
          if (field === 'item_name') {
              const match = masterItems.find(m => 
                  m.item_name.toLowerCase() === value.toLowerCase() && 
                  m.metal_type === batchDetails.metal_type
              );
              if (match) {
                  updated.wastage_percent = match.default_wastage;
                  if (match.mc_type === 'FIXED') updated.making_charges = match.mc_value;
              }
          }

          // Recalc Pure
          if (field === 'gross_weight' || field === 'wastage_percent') {
              updated.calc_pure = calculatePure(updated.gross_weight, updated.wastage_percent, purityMode);
              
              // Recalc MC if Per Gram
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

  // --- VENDOR CHANGE HANDLER ---
  const handleVendorChange = (e) => {
      const val = e.target.value;
      const selectedVendor = vendors.find(v => v.id.toString() === val);
      
      setBatchDetails(prev => ({
          ...prev,
          vendor_id: val,
          // Auto-switch metal type if vendor has a specific metal preference
          metal_type: selectedVendor?.metal_type ? selectedVendor.metal_type : prev.metal_type
      }));
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
      if(!batchDetails.vendor_id) return alert("Please select a Source (Vendor/Own)");
      const validRows = rows.filter(r => r.item_name && r.gross_weight);
      if(validRows.length === 0) return alert("Please enter at least one valid item");

      if(!window.confirm(`Add ${validRows.length} items to inventory?`)) return;

      try {
          // Process Images
          const processedItems = await Promise.all(validRows.map(async (r) => {
              let b64 = null;
              if (r.item_image) b64 = await toBase64(r.item_image);
              return {
                  ...r,
                  pure_weight: r.calc_pure,
                  item_image_base64: b64
              };
          }));

          const payload = {
              vendor_id: batchDetails.vendor_id === 'OWN' ? null : batchDetails.vendor_id,
              metal_type: batchDetails.metal_type,
              invoice_no: batchDetails.invoice_no || 'OWN-STOCK',
              items: processedItems
          };

          await api.addBatchInventory(payload);
          alert("Batch Added Successfully!");
          navigate('/inventory');
      } catch (err) {
          alert("Failed: " + err.message);
      }
  };

  // Totals
  const totalGross = rows.reduce((sum, r) => sum + (parseFloat(r.gross_weight)||0), 0).toFixed(3);
  const totalPure = rows.reduce((sum, r) => sum + (parseFloat(r.calc_pure)||0), 0).toFixed(3);

  return (
    <div className="container-fluid mt-4 pb-5">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-primary mb-0"><i className="bi bi-box-seam me-2"></i>Bulk Stock Entry</h2>
            <div className="text-muted small">Add multiple items to inventory efficiently</div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => navigate('/inventory')}>Cancel</button>
            <button className="btn btn-success fw-bold px-4" onClick={handleSubmit}>
                <i className="bi bi-check-lg me-2"></i>SAVE BATCH
            </button>
          </div>
      </div>

      {/* SETTINGS CARD */}
      <div className="card shadow-sm border-0 mb-4">
          <div className="card-body bg-light">
              <div className="row g-3">
                  <div className="col-md-3">
                      <label className="form-label small fw-bold text-muted">Stock Source</label>
                      <select className="form-select border-primary" value={batchDetails.vendor_id} onChange={handleVendorChange}>
                          <option value="">-- Select Source --</option>
                          <option value="OWN" className="fw-bold text-primary">✦ Shop / Own Stock</option>
                          <optgroup label="Vendors">
                              {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name} ({v.metal_type || 'Mix'})</option>)}
                          </optgroup>
                      </select>
                  </div>
                  <div className="col-md-2">
                      <label className="form-label small fw-bold text-muted">Metal Group</label>
                      <select className="form-select fw-bold" value={batchDetails.metal_type} onChange={e => setBatchDetails({...batchDetails, metal_type: e.target.value})}>
                          <option value="GOLD">GOLD</option>
                          <option value="SILVER">SILVER</option>
                      </select>
                  </div>
                  <div className="col-md-3">
                      <label className="form-label small fw-bold text-muted">Invoice / Ref No</label>
                      <input className="form-control" placeholder="e.g. INV-2024-001" value={batchDetails.invoice_no} onChange={e => setBatchDetails({...batchDetails, invoice_no: e.target.value})} />
                  </div>
                  <div className="col-md-4 d-flex align-items-end justify-content-end">
                       <div className="bg-white px-3 py-2 rounded border text-end me-3">
                           <div className="small text-muted">Total Gross</div>
                           <div className="fw-bold text-dark">{totalGross} g</div>
                       </div>
                       <div className="bg-white px-3 py-2 rounded border text-end">
                           <div className="small text-muted">Total Pure</div>
                           <div className="fw-bold text-success">{totalPure} g</div>
                       </div>
                  </div>
              </div>
          </div>
      </div>

      {/* GRID */}
      <div className="card shadow-sm border-0">
          <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0 text-center">
                  <thead className="table-light text-secondary small text-uppercase">
                      <tr>
                          <th style={{width:'50px'}}>#</th>
                          <th style={{width:'25%'}}>Item Name</th>
                          <th>Type</th>
                          <th>Gross Wt</th>
                          <th style={{width:'100px'}}>Touch %</th>
                          <th>Pure Wt</th>
                          <th>MC (₹)</th>
                          <th>HUID</th>
                          <th>Image</th>
                          <th style={{width:'50px'}}></th>
                      </tr>
                  </thead>
                  <tbody>
                      {rows.map((row, index) => (
                          <tr key={row.id}>
                              <td className="text-muted small">{index + 1}</td>
                              <td>
                                  <input 
                                    className="form-control form-control-sm fw-bold" 
                                    placeholder="Search Item..." 
                                    list={`list-${row.id}`}
                                    value={row.item_name}
                                    onChange={e => handleRowChange(row.id, 'item_name', e.target.value)}
                                    autoFocus={index === rows.length - 1} 
                                  />
                                  <datalist id={`list-${row.id}`}>
                                      {masterItems.filter(m => m.metal_type === batchDetails.metal_type).map(m => <option key={m.id} value={m.item_name} />)}
                                  </datalist>
                              </td>
                              <td>
                                  <select className="form-select form-select-sm" value={row.stock_type} onChange={e => handleRowChange(row.id, 'stock_type', e.target.value)}>
                                      <option value="SINGLE">Single</option>
                                      <option value="BULK">Bulk</option>
                                  </select>
                              </td>
                              <td>
                                  <input type="number" className="form-control form-control-sm" placeholder="0.000" value={row.gross_weight} onChange={e => handleRowChange(row.id, 'gross_weight', e.target.value)} />
                              </td>
                              <td>
                                  <input type="number" className="form-control form-control-sm bg-warning bg-opacity-10 text-center" placeholder="92.0" value={row.wastage_percent} onChange={e => handleRowChange(row.id, 'wastage_percent', e.target.value)} />
                              </td>
                              <td>
                                  <input type="text" className="form-control form-control-sm bg-light text-center border-0 fw-bold text-success" readOnly value={row.calc_pure} />
                              </td>
                              <td>
                                  <input type="number" className="form-control form-control-sm" placeholder="0" value={row.making_charges} onChange={e => handleRowChange(row.id, 'making_charges', e.target.value)} />
                              </td>
                              <td>
                                  <input type="text" className="form-control form-control-sm text-uppercase" placeholder="XXXX" value={row.huid} onChange={e => handleRowChange(row.id, 'huid', e.target.value)} />
                              </td>
                              <td>
                                  <input type="file" className="form-control form-control-sm" style={{width:'100px'}} onChange={e => handleFileChange(row.id, e.target.files[0])} />
                              </td>
                              <td>
                                  <button className="btn btn-link btn-sm text-danger" onClick={() => handleRemoveRow(row.id)} tabIndex="-1">
                                      <i className="bi bi-x-circle-fill"></i>
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          <div className="card-footer bg-white text-center py-3">
              <button className="btn btn-outline-primary btn-sm px-4 rounded-pill" onClick={handleAddRow}>
                  <i className="bi bi-plus-lg me-1"></i> Add Another Row
              </button>
          </div>
      </div>
    </div>
  );
}

export default BulkStockEntry;