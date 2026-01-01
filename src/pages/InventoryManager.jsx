import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useReactToPrint } from 'react-to-print';
import BarcodePrintComponent from '../components/BarcodePrintComponent';

function InventoryManager() {
  const [activeTab, setActiveTab] = useState('FRESH'); 
  
  const [items, setItems] = useState([]); // Fresh Items
  const [oldItems, setOldItems] = useState([]); // Old Metal Items
  
  const [filterMode, setFilterMode] = useState(''); // Source Filter
  const [filterMetal, setFilterMetal] = useState(null); // Card Click Filter
  const [searchQuery, setSearchQuery] = useState(''); // Live Search
  
  const [vendors, setVendors] = useState([]);
  const [productTypes, setProductTypes] = useState([]); 
  
  const [selectedIds, setSelectedIds] = useState({});
  const printRef = useRef();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ vendor_id: '', metal_type: '', invoice_no: '', items: [] });
  const [tempItem, setTempItem] = useState({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });

  useEffect(() => { 
      fetchData();
      fetchOldMetal(); 
  }, []);

  const fetchData = async () => {
    try {
      const [invRes, vendRes, typesRes] = await Promise.all([
        api.getInventory(),
        api.searchVendor(''),
        api.getProductTypes()
      ]);
      setItems(invRes.data);
      setVendors(vendRes.data);
      setProductTypes(typesRes.data || []);
      if(typesRes.data.length > 0) setBatchForm(prev => ({ ...prev, metal_type: typesRes.data[0].name }));
    } catch (err) { console.error(err); }
  };

  const fetchOldMetal = async () => {
      try {
          const [goldRes, silverRes] = await Promise.all([
              api.getPendingScrap('GOLD'),
              api.getPendingScrap('SILVER')
          ]);
          setOldItems([...goldRes.data, ...silverRes.data]);
      } catch(err) { console.error(err); }
  };

  // --- MASTER FILTERING LOGIC ---
  const getFilteredList = () => {
      const baseList = activeTab === 'FRESH' ? items : oldItems;
      
      return baseList.filter(i => {
          // 1. Source Filter
          if (filterMode !== '') {
              if (filterMode === 'OWN' && i.source_type !== 'OWN') return false;
              if (filterMode !== 'OWN' && i.vendor_id !== parseInt(filterMode)) return false;
          }

          // 2. Live Search
          if (searchQuery) {
              const q = searchQuery.toLowerCase();
              const match = 
                  (i.item_name && i.item_name.toLowerCase().includes(q)) ||
                  (i.barcode && i.barcode.toLowerCase().includes(q)) ||
                  (i.voucher_no && i.voucher_no.toLowerCase().includes(q)) ||
                  (i.huid && i.huid.toLowerCase().includes(q));
              if (!match) return false;
          }

          return true;
      });
  };

  const searchFilteredItems = getFilteredList();

  // 3. Apply Metal Card Filter (Visual)
  const displayItems = searchFilteredItems.filter(i => 
      !filterMetal || i.metal_type === filterMetal
  );

  // --- DYNAMIC TOTALS CALCULATION (Based on Search Results) ---
  const getTotals = () => {
      // Use the items found by search/source to calculate totals for the cards
      const typeSet = new Set([...productTypes.map(t=>t.name), ...searchFilteredItems.map(i=>i.metal_type)]);
      const uniqueTypes = Array.from(typeSet);

      return uniqueTypes.map(type => {
          const matchingItems = searchFilteredItems.filter(i => i.metal_type === type);
          const totalWeight = matchingItems
              .reduce((sum, i) => sum + parseFloat(i.gross_weight || 0), 0)
              .toFixed(3);
          const count = matchingItems.length;
          
          const setting = productTypes.find(t => t.name === type);
          return { 
              type, 
              totalWeight,
              count,
              color: setting ? setting.display_color : '#6c757d' 
          };
      });
  };

  const totals = getTotals();

  // Search Summary Stats
  const searchCount = searchFilteredItems.length;
  const searchWeight = searchFilteredItems.reduce((sum, i) => sum + parseFloat(i.gross_weight || 0), 0).toFixed(3);

  const handleCardClick = (type) => {
      setFilterMetal(prev => prev === type ? null : type);
  };

  const getSourceLabel = (item) => {
      if (item.source_type === 'OWN') return <span className="badge bg-success">SHOP OWNED</span>;
      if (item.source_type === 'NEIGHBOUR') return <span className="badge bg-info text-dark">NEIGHBOUR</span>;
      if (item.source_type === 'REFINERY') return <span className="badge bg-warning text-dark">REFINED</span>;
      const vName = vendors.find(v => v.id === item.vendor_id)?.business_name || 'Unknown Vendor';
      return <span className="text-muted small">{vName}</span>;
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const allIds = {};
          displayItems.forEach(i => allIds[i.id] = true);
          setSelectedIds(allIds);
      } else {
          setSelectedIds({});
      }
  };

  const handleSelectRow = (id) => {
      setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrintTags = useReactToPrint({
      content: () => printRef.current,
      onAfterPrint: () => setSelectedIds({})
  });

  const getItemsToPrint = () => {
      const list = activeTab === 'FRESH' ? items : oldItems;
      return list.filter(item => selectedIds[item.id]).map(item => ({
          ...item,
          item_name: item.item_name || 'Old Metal',
          gross_weight: item.gross_weight || item.net_weight, 
          barcode: item.barcode || item.voucher_no || 'OLD'
      }));
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const handleAddItemToBatch = () => {
      if(!tempItem.item_name || !tempItem.gross_weight) return alert("Enter Item Name and Weight");
      setBatchForm({
          ...batchForm,
          items: [...batchForm.items, { ...tempItem, id: Date.now() }]
      });
      setTempItem({ item_name: '', gross_weight: '', wastage_percent: '', making_charges: '', huid: '' });
  };

  const handleRemoveFromBatch = (id) => {
      setBatchForm({ ...batchForm, items: batchForm.items.filter(i => i.id !== id) });
  };

  const submitBatch = async () => {
      if(!batchForm.vendor_id) return alert("Select Vendor or 'Shop Stock'");
      if(batchForm.vendor_id !== 'OWN' && !batchForm.invoice_no) return alert("Invoice No is required for Vendor Stock");
      if(batchForm.items.length === 0) return alert("Add at least one item");
      
      try {
          const payload = {
              vendor_id: batchForm.vendor_id === 'OWN' ? null : batchForm.vendor_id, 
              metal_type: batchForm.metal_type,
              invoice_no: batchForm.invoice_no || 'OWN-STOCK',
              items: batchForm.items
          };

          await api.addBatchInventory(payload);
          alert("Stock Added Successfully!");
          setShowAddModal(false);
          setBatchForm({ vendor_id: '', metal_type: productTypes[0]?.name || 'GOLD', invoice_no: '', items: [] });
          fetchData();
      } catch(err) { alert(err.message); }
  };

  return (
    <div className="container-fluid pb-5">
      
      <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
              <h4 className="fw-bold text-dark mb-3">Inventory Manager</h4>
              <ul className="nav nav-pills">
                  <li className="nav-item">
                      <button className={`nav-link fw-bold px-4 ${activeTab==='FRESH'?'active':''}`} onClick={()=>{setActiveTab('FRESH'); setFilterMetal(null); setSelectedIds({}); setSearchQuery('');}}>
                          <i className="bi bi-gem me-2"></i>Fresh Stock
                      </button>
                  </li>
                  <li className="nav-item">
                      <button className={`nav-link fw-bold px-4 ${activeTab==='OLD'?'active':''}`} onClick={()=>{setActiveTab('OLD'); setFilterMetal(null); setSelectedIds({}); setSearchQuery('');}}>
                          <i className="bi bi-recycle me-2"></i>Old Metal Stock
                      </button>
                  </li>
              </ul>
          </div>
          
          <div className="d-flex gap-2 align-items-center">
              {/* LIVE SEARCH BAR */}
              <div className="input-group" style={{maxWidth: '250px'}}>
                  <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                  <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search Item / Barcode..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>

              {selectedCount > 0 && (
                  <button className="btn btn-dark fw-bold" onClick={handlePrintTags}>
                      <i className="bi bi-printer-fill me-2"></i>Tags ({selectedCount})
                  </button>
              )}
              {activeTab === 'FRESH' && (
                  <>
                    <select className="form-select w-auto fw-bold" value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                        <option value="">All Sources</option>
                        <option value="OWN">Shop / Own</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
                    </select>
                    <button className="btn btn-primary fw-bold" onClick={() => setShowAddModal(true)}>
                        <i className="bi bi-plus-lg me-2"></i>Add Fresh Stock
                    </button>
                  </>
              )}
          </div>
      </div>

      {/* SEARCH STATS SUMMARY */}
      {searchQuery && (
          <div className="alert alert-info py-2 mb-4 d-flex justify-content-between align-items-center">
              <span><i className="bi bi-search me-2"></i>Results for "<strong>{searchQuery}</strong>"</span>
              <strong>Found: {searchCount} items | Total Weight: {searchWeight} g</strong>
          </div>
      )}

      {/* CLICKABLE STATS CARDS */}
      <div className="row g-3 mb-4">
        {totals.map(t => {
            const isActive = filterMetal === t.type;
            return (
                <div className="col-md-3" key={t.type}>
                    <div 
                        className={`card text-white shadow-sm border-0 cursor-pointer ${isActive ? 'ring-4 ring-offset-2' : ''}`} 
                        style={{
                            backgroundColor: t.color || '#6c757d',
                            cursor: 'pointer',
                            transform: isActive ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all 0.2s',
                            boxShadow: isActive ? '0 0 0 3px rgba(0,0,0,0.2) inset' : 'none',
                            border: isActive ? '2px solid white' : 'none'
                        }}
                        onClick={() => handleCardClick(t.type)}
                        title={isActive ? "Click to clear filter" : `Filter by ${t.type}`}
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="opacity-75 text-uppercase small mb-0 fw-bold">{t.type}</h6>
                                {isActive && <i className="bi bi-funnel-fill opacity-50"></i>}
                            </div>
                            <div className="d-flex justify-content-between align-items-end">
                                <div>
                                    <div className="fs-3 fw-bold lh-1">{t.totalWeight} <span className="fs-6 fw-normal">g</span></div>
                                    <small className="opacity-75">{t.count} Items</small>
                                </div>
                                <i className="bi bi-box-seam fs-1 opacity-25"></i>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold text-secondary">
                {activeTab === 'FRESH' ? 'Available Fresh Inventory' : 'Available Old Metal (Scrap)'}
                {filterMetal && <span className="badge bg-secondary ms-2 small">{filterMetal}</span>}
            </h5>
            {filterMetal && (
                <button className="btn btn-sm btn-link text-muted text-decoration-none" onClick={() => setFilterMetal(null)}>
                    Clear Filter <i className="bi bi-x"></i>
                </button>
            )}
        </div>
        
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
                <tr>
                    <th style={{width:'40px'}} className="text-center">
                        <input type="checkbox" className="form-check-input" onChange={handleSelectAll} checked={displayItems.length > 0 && displayItems.every(i => selectedIds[i.id])} />
                    </th>
                    <th>Item Name</th>
                    {activeTab === 'FRESH' ? (
                        <><th>Barcode</th><th>Metal</th><th>Weight</th><th>Wastage</th><th>Source</th></>
                    ) : (
                        <><th>Ref / Voucher</th><th>Metal</th><th>Gross Wt</th><th>Net Wt</th><th>Date</th><th>Status</th></>
                    )}
                </tr>
            </thead>
            <tbody>
              {displayItems.map(item => (
                <tr key={item.id} className={selectedIds[item.id] ? 'table-primary' : ''}>
                  <td className="text-center">
                      <input type="checkbox" className="form-check-input" checked={!!selectedIds[item.id]} onChange={() => handleSelectRow(item.id)} />
                  </td>
                  <td className="fw-bold">{item.item_name}</td>
                  
                  {activeTab === 'FRESH' ? (
                      <>
                        <td className="small font-monospace text-muted">{item.barcode}</td>
                        <td><span className="badge bg-light text-dark border">{item.metal_type}</span></td>
                        <td className="fw-bold">{item.gross_weight}g</td>
                        <td>{item.wastage_percent}%</td>
                        <td>{getSourceLabel(item)}</td>
                      </>
                  ) : (
                      <>
                        <td className="small font-monospace text-muted">{item.voucher_no || item.id}</td>
                        <td><span className={`badge ${item.metal_type==='GOLD'?'bg-warning text-dark':'bg-secondary'}`}>{item.metal_type}</span></td>
                        <td>{item.gross_weight} g</td>
                        <td className="fw-bold">{item.net_weight} g</td>
                        <td className="small text-muted">{new Date(item.date || Date.now()).toLocaleDateString()}</td>
                        <td><span className="badge bg-success">AVAILABLE</span></td>
                      </>
                  )}
                </tr>
              ))}
              {displayItems.length === 0 && (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">No items found matching the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal - Unchanged but included for completeness */}
      {showAddModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-header bg-primary text-white"><h5 className="modal-title">Add Stock</h5><button className="btn-close btn-close-white" onClick={()=>setShowAddModal(false)}></button></div>
                      <div className="modal-body">
                          <div className="row g-3 mb-3">
                              <div className="col-4"><label className="small fw-bold">Source</label><select className="form-select" value={batchForm.vendor_id} onChange={e=>setBatchForm({...batchForm, vendor_id:e.target.value})}><option value="OWN">Own Stock</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.business_name}</option>)}</select></div>
                              <div className="col-4"><label className="small fw-bold">Type</label><select className="form-select" value={batchForm.metal_type} onChange={e=>setBatchForm({...batchForm, metal_type:e.target.value})}>{productTypes.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}</select></div>
                              <div className="col-4"><label className="small fw-bold">Ref No</label><input className="form-control" value={batchForm.invoice_no} onChange={e=>setBatchForm({...batchForm, invoice_no:e.target.value})} /></div>
                          </div>
                          <div className="card bg-light p-2 mb-3"><div className="row g-2 align-items-end"><div className="col-3"><input className="form-control form-control-sm" placeholder="Name" value={tempItem.item_name} onChange={e=>setTempItem({...tempItem, item_name:e.target.value})} /></div><div className="col-2"><input type="number" className="form-control form-control-sm" placeholder="Wt" value={tempItem.gross_weight} onChange={e=>setTempItem({...tempItem, gross_weight:e.target.value})} /></div><div className="col-2"><input type="number" className="form-control form-control-sm" placeholder="Wst%" value={tempItem.wastage_percent} onChange={e=>setTempItem({...tempItem, wastage_percent:e.target.value})} /></div><div className="col-2"><input className="form-control form-control-sm" placeholder="HUID" value={tempItem.huid} onChange={e=>setTempItem({...tempItem, huid:e.target.value})} /></div><div className="col-3"><button className="btn btn-dark btn-sm w-100" onClick={handleAddItemToBatch}>Add</button></div></div></div>
                          <table className="table table-sm"><tbody>{batchForm.items.map(i=><tr key={i.id}><td>{i.item_name}</td><td>{i.gross_weight}</td><td><button className="btn btn-link text-danger p-0" onClick={()=>handleRemoveFromBatch(i.id)}>x</button></td></tr>)}</tbody></table>
                      </div>
                      <div className="modal-footer"><button className="btn btn-success" onClick={submitBatch}>Save</button></div>
                  </div>
              </div>
          </div>
      )}

      <div style={{ display: 'none' }}>
          <BarcodePrintComponent ref={printRef} items={getItemsToPrint()} shopName="AURUM" />
      </div>

    </div>
  );
}

export default InventoryManager;