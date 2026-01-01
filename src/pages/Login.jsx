import React, { useState, useEffect } from 'react';
import { api } from '../api';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isSetup, setIsSetup] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false); // Controls if Setup button is visible
  const [config, setConfig] = useState({ business_name: 'AURUM BILLING', logo: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.getLoginConfig();
      setSetupRequired(res.data.setupRequired); // Only true if NO users exist
      if(res.data.business) {
          setConfig(res.data.business);
      }
      // If setup is strictly required (0 users), force setup mode
      if (res.data.setupRequired) {
          setIsSetup(true);
      }
    } catch (err) {
      console.error("Failed to load login config", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSetup) {
          await api.setupAdmin(formData);
          alert("Super Admin Created! Please Login.");
          setIsSetup(false);
          setSetupRequired(false); // Hide button immediately after success
      } else {
          const res = await api.login(formData);
          onLogin(res.data.token, res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Operation Failed");
    }
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-white">Loading...</div>;

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-dark">
      <div className="card shadow-lg border-0" style={{ width: '400px' }}>
        <div className="card-body p-5">
          
          {/* LOGO & BRANDING */}
          <div className="text-center mb-4">
              {config.logo ? (
                  <img 
                    src={config.logo} 
                    alt="Logo" 
                    className="img-fluid mb-3" 
                    style={{ maxHeight: '80px', borderRadius: '5px' }} 
                  />
              ) : (
                  <i className="bi bi-gem text-warning display-4 mb-2 d-block"></i>
              )}
              <h4 className="fw-bold text-uppercase" style={{ letterSpacing: '1px' }}>
                  {config.business_name}
              </h4>
              <span className="badge bg-light text-dark border">
                  {isSetup ? 'SYSTEM SETUP' : 'SECURE LOGIN'}
              </span>
          </div>

          {error && <div className="alert alert-danger small py-2 text-center">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">Username</label>
              <div className="input-group">
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-person"></i></span>
                  <input 
                    type="text" 
                    className="form-control border-start-0 ps-0" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    autoFocus
                    required
                  />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted">Password</label>
              <div className="input-group">
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-lock"></i></span>
                  <input 
                    type="password" 
                    className="form-control border-start-0 ps-0" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    required
                  />
              </div>
            </div>
            
            <button className={`btn w-100 fw-bold shadow-sm ${isSetup ? 'btn-success' : 'btn-warning'}`} type="submit">
              {isSetup ? 'CREATE SUPER ADMIN' : 'LOGIN'}
            </button>
          </form>

          {/* SETUP TOGGLE - HIDDEN IF ADMIN EXISTS */}
          {setupRequired && !isSetup && (
              <div className="text-center mt-3">
                  <button className="btn btn-link btn-sm text-danger text-decoration-none" onClick={() => setIsSetup(true)}>
                      <i className="bi bi-exclamation-triangle me-1"></i> System Not Setup? Click Here
                  </button>
              </div>
          )}
          
          {isSetup && setupRequired && (
               <div className="text-center mt-3">
                   <small className="text-muted">Creating the first Super Admin account.</small>
               </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;