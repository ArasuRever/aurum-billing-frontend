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
  
  // Header State
  const [batchDetails, setBatchDetails] = useState({
      vendor_id: '',
      metal_type: 'GOLD',
      invoice_no: ''
  });

  // Grid State
  const [rows, setRows] = useState([]);
  const [purityMode, setPurityMode] = useState('TOUCH'); 

  // Load Initial Data
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
            
            // Set default metal if available
            if(tRes.data && tRes.data.length > 0) {
                setBatchDetails(prev => ({ ...prev, metal_type: tRes.data[0].name }));
            }

            // Add initial empty row
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

  // --- ACTIONS ---
  const handleAddRow = () => {
    setRows(prev => [...prev, {
        id: Date.now(),
        item_name: '',
        stock_type: 'SINGLE',
        quantity: 1, // Default quantity
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

  // --- PURITY LOGIC (Same as VendorDetails) ---
  const togglePurityMode = () => {
      const newMode = purityMode === 'TOUCH' ? 'WASTAGE' : 'TOUCH';
      setPurityMode(newMode);
      // Recalculate all rows based on new mode
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
          
          // Auto-Populate from Master Item
          if (field === 'item_name') {
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

          // Recalc Pure & MC
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
              else newMetal = selectedVendor.vendor_type;
          }
          return { ...prev, vendor_id: val, metal_type: newMetal };
      });
  };

  // --- AUTO CREATE MASTER ITEMS ---
  const autoCreateMasterItems = async (itemsToSave) => {
      const newItems = itemsToSave.filter(stockItem => {
          if (!stockItem.item_name) return false;
          const exists = masterItems.some(master => 
              master.item_name.toLowerCase() === stockItem.item_name.trim().toLowerCase() && 
              master.metal_type === batchDetails.metal_type
          );
          return !exists;
      });

      if (newItems.length === 0) return;

      // Group by item name to avoid duplicates
      const uniqueNames = [...new Set(newItems.map(i => i.item_name.trim()))];
      const referenceItem = newItems[0]; // Use first item for default values

      try {
          await api.addMasterItemsBulk({
              item_names: uniqueNames,
              metal_type: batchDetails.metal_type,
              calc_method: 'STANDARD',
              default_wastage: referenceItem.wastage_percent || 0,
              mc_type: 'FIXED', 
              mc_value: 0,
              hsn_code: '' 
          });
          await fetchMasterItems(); // Refresh list
      } catch (err) { 
          console.warn("Failed to auto-create master items", err); 
      }
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
      if(!batchDetails.vendor_id) return alert("Please select a Source (Vendor/Own)");
      const validRows = rows.filter(r => r.item_name && r.gross_weight);
      if(validRows.length === 0) return alert("Please enter at least one valid item");

      if(!window.confirm(`Add ${validRows.length} items to inventory?`)) return;

      try {
          // 1. Auto Create Master Items if needed
          await autoCreateMasterItems(validRows);

          // 2. Process Items
          const processedItems = await Promise.all(validRows.map(async (r) => {
              let b64 = null;
              if (r.item_image) b64 = await toBase64(r.item_image);
              return {
                  ...r,
                  pure_weight: r.calc_pure,
                  quantity: r.stock_type === 'BULK' ? (r.quantity || 1) : 1, // Handle Quantity
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

  const totalGross = rows.reduce((sum, r) => sum + (parseFloat(r.gross_weight)||0), 0).toFixed(3);
  const totalPure = rows.reduce((sum, r) => sum + (parseFloat(r.calc_pure)||0), 0).toFixed(3);

  return (
    <div className="container-fluid mt-4 pb-5">
      
      <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-primary mb-0"><i className="bi bi-box-seam me-2"></i>Bulk Stock Entry</h2>
            <div className="text-muted small">Add multiple items to inventory efficiently</div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => navigate('/inventory')}>Cancel</button>
            <button className="btn btn-success fw-bold px-4 d-flex align-items-center gap-2" onClick={handleSubmit}>
                <FaSave /> SAVE BATCH
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
                              {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name} ({v.vendor_type || 'Mix'})</option>)}
                          </optgroup>
                      </select>
                  </div>
                  <div className="col-md-2">
                      <label className="form-label small fw-bold text-muted">Metal Group</label>
                      <select className="form-select fw-bold" value={batchDetails.metal_type} onChange={e => setBatchDetails({...batchDetails, metal_type: e.target.value})}>
                          {productTypes.map(t => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                          {productTypes.length === 0 && <option value="GOLD">GOLD</option>}
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
                          <th style={{width:'40px'}}>#</th>
                          <th style={{width:'25%'}}>Item Name</th>
                          <th style={{width:'15%'}}>Type</th>
                          <th>Gross Wt</th>
                          <th 
                            style={{width:'100px', cursor:'pointer'}} 
                            className="bg-warning bg-opacity-10 text-dark"
                            onClick={togglePurityMode}
                            title="Click to switch Touch/Wastage"
                          >
                              {purityMode === 'TOUCH' ? 'Touch %' : 'Wastage %'} <FaCalculator className="ms-1" size={10}/>
                          </th>
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
                                  <div className="d-flex gap-1">
                                      <select className="form-select form-select-sm" value={row.stock_type} onChange={e => handleRowChange(row.id, 'stock_type', e.target.value)}>
                                          <option value="SINGLE">Single</option>
                                          <option value="BULK">Bulk</option>
                                      </select>
                                      {/* QUANTITY INPUT FOR BULK */}
                                      {row.stock_type === 'BULK' && (
                                          <input 
                                            type="number" 
                                            className="form-control form-control-sm" 
                                            placeholder="Qty" 
                                            style={{width:'60px'}}
                                            value={row.quantity} 
                                            onChange={e => handleRowChange(row.id, 'quantity', e.target.value)} 
                                          />
                                      )}
                                  </div>
                              </td>
                              <td>
                                  <input type="number" className="form-control form-control-sm" placeholder="0.000" value={row.gross_weight} onChange={e => handleRowChange(row.id, 'gross_weight', e.target.value)} />
                              </td>
                              <td className="bg-warning bg-opacity-10">
                                  <input type="number" className="form-control form-control-sm text-center fw-bold bg-transparent border-0" placeholder={purityMode === 'TOUCH' ? "92.0" : "8.0"} value={row.wastage_percent} onChange={e => handleRowChange(row.id, 'wastage_percent', e.target.value)} />
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
                                      <FaTrash />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          <div className="card-footer bg-white text-center py-3">
              <button className="btn btn-outline-primary btn-sm px-4 rounded-pill" onClick={handleAddRow}>
                  <FaPlus className="me-1" /> Add Another Row
              </button>
          </div>
      </div>
    </div>
  );
}

export default BulkStockEntry;