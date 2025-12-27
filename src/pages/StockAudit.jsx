import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

function StockAudit() {
  const [step, setStep] = useState('SETUP'); // SETUP, SCANNING, REPORT
  const [auditSession, setAuditSession] = useState(null);
  
  // Setup State
  const [setupForm, setSetupForm] = useState({ name: '', filter: 'ALL' });
  const [loading, setLoading] = useState(false);

  // Scanning State
  const [barcode, setBarcode] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const [lastScanned, setLastScanned] = useState(null);
  const [scanMessage, setScanMessage] = useState(null); // { type: 'success'|'error', text: '' }
  const scanInputRef = useRef(null);

  // Report State
  const [report, setReport] = useState(null);

  // Focus input constantly for rapid scanning
  useEffect(() => {
      if (step === 'SCANNING' && scanInputRef.current) {
          scanInputRef.current.focus();
      }
  }, [step, barcode, lastScanned]);

  const startAudit = async () => {
      if(!setupForm.name) return alert("Enter Audit Name");
      setLoading(true);
      try {
          const res = await api.startAudit({ 
              audit_name: setupForm.name, 
              category_filter: setupForm.filter 
          });
          setAuditSession(res.data);
          setScannedCount(0);
          setStep('SCANNING');
      } catch(err) {
          alert("Error: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleScan = async (e) => {
      e.preventDefault();
      if(!barcode) return;
      
      const code = barcode.trim();
      setBarcode(''); // Clear immediately for next scan

      try {
          const res = await api.scanAuditItem({ audit_id: auditSession.id, barcode: code });
          
          if(res.data.warning) {
              setScanMessage({ type: 'warning', text: `⚠️ ${res.data.warning}: ${res.data.item.item_name}` });
              playBeep('warning');
          } else {
              setScannedCount(prev => prev + 1);
              setLastScanned(res.data.item);
              setScanMessage({ type: 'success', text: `✅ Found: ${res.data.item.item_name}` });
              playBeep('success');
          }
      } catch(err) {
          setScanMessage({ type: 'error', text: `❌ ${err.response?.data?.error || "Scan Failed"}` });
          playBeep('error');
      }
  };

  const finishAudit = async () => {
      if(!window.confirm("Finish Audit and view Missing Items report?")) return;
      try {
          await api.finishAudit(auditSession.id);
          const res = await api.getAuditReport(auditSession.id);
          setReport(res.data);
          setStep('REPORT');
      } catch(err) { alert(err.message); }
  };

  // Simple Beep Logic
  const playBeep = (type) => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if(type === 'success') { osc.frequency.value = 1000; osc.type = 'sine'; } // High beep
      else if(type === 'error') { osc.frequency.value = 200; osc.type = 'sawtooth'; } // Low buzz
      else { osc.frequency.value = 600; osc.type = 'square'; } // Warning

      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
      setTimeout(() => osc.stop(), 100);
  };

  return (
    <div className="container-fluid py-4" style={{minHeight:'100vh', backgroundColor:'#f0f2f5'}}>
      
      {/* 1. SETUP SCREEN */}
      {step === 'SETUP' && (
          <div className="row justify-content-center">
              <div className="col-md-5">
                  <div className="card shadow-lg border-0 mt-5">
                      <div className="card-header bg-dark text-white text-center py-3">
                          <h4 className="mb-0"><i className="bi bi-upc-scan me-2"></i>Stock Audit</h4>
                      </div>
                      <div className="card-body p-4">
                          <div className="mb-3">
                              <label className="form-label fw-bold">Session Name</label>
                              <input className="form-control" placeholder="e.g. Evening Count - 27 Dec" value={setupForm.name} onChange={e => setSetupForm({...setupForm, name: e.target.value})} autoFocus />
                          </div>
                          <div className="mb-4">
                              <label className="form-label fw-bold">Audit Scope</label>
                              <select className="form-select" value={setupForm.filter} onChange={e => setSetupForm({...setupForm, filter: e.target.value})}>
                                  <option value="ALL">Full Inventory (All Metals)</option>
                                  <option value="GOLD">Gold Only</option>
                                  <option value="SILVER">Silver Only</option>
                              </select>
                          </div>
                          <button className="btn btn-primary w-100 py-2 fw-bold" onClick={startAudit} disabled={loading}>
                              {loading ? 'Initializing...' : 'START SCANNING'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 2. SCANNING SCREEN */}
      {step === 'SCANNING' && auditSession && (
          <div className="row justify-content-center">
              <div className="col-md-8 text-center">
                  
                  {/* Progress Stats */}
                  <div className="card shadow-sm border-0 mb-4 bg-white">
                      <div className="card-body">
                          <h6 className="text-muted text-uppercase mb-1">{auditSession.audit_name}</h6>
                          <div className="d-flex justify-content-center align-items-baseline gap-2">
                              <h1 className="display-1 fw-bold text-primary mb-0">{scannedCount}</h1>
                              <span className="fs-4 text-muted">/ {auditSession.total_expected}</span>
                          </div>
                          <small className="text-muted">Items Scanned</small>
                          
                          <div className="progress mt-3" style={{height:'10px'}}>
                              <div className="progress-bar bg-primary" style={{width: `${(scannedCount/auditSession.total_expected)*100}%`}}></div>
                          </div>
                      </div>
                  </div>

                  {/* Scan Input */}
                  <form onSubmit={handleScan} className="mb-4">
                      <input 
                          ref={scanInputRef}
                          className="form-control form-control-lg text-center fw-bold fs-3 border-2 border-primary shadow-sm"
                          placeholder="Scan Barcode Here..."
                          value={barcode}
                          onChange={e => setBarcode(e.target.value)}
                          onBlur={() => setTimeout(() => scanInputRef.current?.focus(), 10)}
                      />
                  </form>

                  {/* Feedback Message */}
                  {scanMessage && (
                      <div className={`alert ${scanMessage.type === 'success' ? 'alert-success' : scanMessage.type === 'error' ? 'alert-danger' : 'alert-warning'} fw-bold shadow-sm`}>
                          {scanMessage.text}
                      </div>
                  )}

                  {/* Last Scanned Details */}
                  {lastScanned && (
                      <div className="card bg-light border-0 mb-4 fade-in">
                          <div className="card-body d-flex align-items-center justify-content-center gap-4">
                              <div className="text-start">
                                  <h5 className="mb-0 fw-bold">{lastScanned.item_name}</h5>
                                  <div className="text-muted small">{lastScanned.gross_weight} g</div>
                              </div>
                              <span className="badge bg-success">SCANNED</span>
                          </div>
                      </div>
                  )}

                  <button className="btn btn-danger fw-bold px-5 py-2 mt-3" onClick={finishAudit}>
                      <i className="bi bi-stop-circle me-2"></i> FINISH AUDIT
                  </button>
              </div>
          </div>
      )}

      {/* 3. REPORT SCREEN */}
      {step === 'REPORT' && report && (
          <div className="container">
              <div className="card shadow-lg border-0">
                  <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center py-3">
                      <h5 className="mb-0">Audit Report: {report.audit.audit_name}</h5>
                      <button className="btn btn-outline-light btn-sm" onClick={() => window.print()}>Print Report</button>
                  </div>
                  <div className="card-body">
                      {/* Summary Cards */}
                      <div className="row text-center mb-4">
                          <div className="col-4">
                              <div className="p-3 bg-light rounded">
                                  <small className="text-muted">Expected</small>
                                  <h3 className="fw-bold">{report.audit.total_expected}</h3>
                              </div>
                          </div>
                          <div className="col-4">
                              <div className="p-3 bg-success bg-opacity-10 text-success rounded border border-success">
                                  <small>Found</small>
                                  <h3 className="fw-bold">{report.audit.total_scanned}</h3>
                              </div>
                          </div>
                          <div className="col-4">
                              <div className="p-3 bg-danger bg-opacity-10 text-danger rounded border border-danger">
                                  <small>MISSING</small>
                                  <h3 className="fw-bold">{report.missing_count}</h3>
                              </div>
                          </div>
                      </div>

                      {/* Missing List */}
                      {report.missing_count > 0 ? (
                          <>
                              <h5 className="text-danger fw-bold mb-3"><i className="bi bi-exclamation-triangle-fill me-2"></i>Missing Items List</h5>
                              <div className="table-responsive">
                                  <table className="table table-bordered table-hover align-middle">
                                      <thead className="table-danger">
                                          <tr><th>Image</th><th>Item Name</th><th>Barcode</th><th>Weight</th><th>Type</th></tr>
                                      </thead>
                                      <tbody>
                                          {report.missing_items.map(item => (
                                              <tr key={item.id}>
                                                  <td style={{width:'60px'}}>
                                                      {item.item_image ? <img src={item.item_image} style={{width:'50px', height:'50px', objectFit:'cover'}} /> : '-'}
                                                  </td>
                                                  <td className="fw-bold">{item.item_name}</td>
                                                  <td className="font-monospace">{item.barcode}</td>
                                                  <td>{item.gross_weight} g</td>
                                                  <td>{item.metal_type}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </>
                      ) : (
                          <div className="alert alert-success text-center p-5">
                              <h1><i className="bi bi-check-circle-fill"></i></h1>
                              <h4 className="fw-bold">Perfect! No Items Missing.</h4>
                          </div>
                      )}
                  </div>
                  <div className="card-footer text-center">
                      <button className="btn btn-secondary" onClick={() => setStep('SETUP')}>Start New Audit</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default StockAudit;