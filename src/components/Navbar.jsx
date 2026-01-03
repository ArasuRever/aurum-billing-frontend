import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BusinessContext } from '../context/BusinessContext';

function Navbar({ onLogout }) {
  const location = useLocation();
  const { settings } = useContext(BusinessContext);
  
  // User & Permission Logic
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'guest';
  const permissions = user.permissions || [];

  const canAccess = (moduleKey) => {
      // Admins and Managers get full access by default
      if (role === 'admin' || role === 'manager' || role === 'superadmin') return true; 
      return permissions.includes(moduleKey);
  };

  const isDropdownActive = (paths) => {
      if (paths.includes('/') && location.pathname === '/') return 'active fw-bold';
      return paths.some(p => p !== '/' && location.pathname.startsWith(p)) ? 'active fw-bold' : '';
  };
  const isActive = (path) => location.pathname.startsWith(path) ? 'active fw-bold' : '';

  // --- CUSTOM NAVBAR COLOR SETTINGS ---
  const navbarStyle = {
      backgroundColor: '#1e1e1eff', // <--- CHANGE THIS HEX CODE TO YOUR DESIRED COLOR (e.g. #0d6efd for Blue)
      color: 'white'
  };

  return (
    // Removed 'bg-dark' class and added custom 'style={navbarStyle}'
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm mb-4" style={navbarStyle}>
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
           {settings.logo ? (
             <img src={settings.logo} alt="Logo" style={{height: '35px', marginRight: '10px', borderRadius:'4px', border:'1px solid #555'}} />
           ) : (<i className="bi bi-gem me-2 text-warning"></i>)}
           <span style={{letterSpacing: '1px'}}>{settings.name.toUpperCase()}</span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"><span className="navbar-toggler-icon"></span></button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            
            {/* 1. SALES */}
            {canAccess('BILLING') && (
                <li className="nav-item dropdown">
                  <a className={`nav-link dropdown-toggle ${isDropdownActive(['/billing', '/bill-history'])}`} href="#" role="button" data-bs-toggle="dropdown">Sales</a>
                  <ul className="dropdown-menu">
                    <li><Link className="dropdown-item" to="/billing"><i className="bi bi-receipt me-2"></i>New Bill</Link></li>
                    <li><Link className="dropdown-item" to="/bill-history"><i className="bi bi-clock-history me-2"></i>Bill History</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><Link className="dropdown-item" to="/billing/return"><i className="bi bi-arrow-return-left me-2"></i>Sales Return</Link></li>
                    {canAccess('GST') && <li className="nav-item"><Link className={`nav-link fw-bold ${isActive('/gst-filing')}`} to="/gst-filing" style={{color: '#dc3545'}}><i className="bi bi-file-text me-1"></i>GST Filing</Link></li>}
                  </ul>
                </li>
            )}

            {/* 2. INVENTORY */}
            {canAccess('INVENTORY') && (
                <li className="nav-item dropdown">
                  <a className={`nav-link dropdown-toggle ${isDropdownActive(['/inventory', '/old-metal', '/refinery', '/add-stock', '/audit'])}`} href="#" role="button" data-bs-toggle="dropdown">Inventory</a>
                  <ul className="dropdown-menu">
                    <li><Link className="dropdown-item fw-bold text-success bg-success bg-opacity-10 mb-1" to="/add-stock"><i className="bi bi-plus-circle-fill me-2"></i>Add Stock</Link></li>
                    <li><Link className="dropdown-item" to="/inventory"><i className="bi bi-box-seam me-2"></i>Manage Inventory</Link></li>
                    {canAccess('AUDIT') && <li><Link className="dropdown-item fw-bold text-primary" to="/audit"><i className="bi bi-upc-scan me-2"></i>Stock Audit</Link></li>}
                    <li><hr className="dropdown-divider" /></li>
                    {canAccess('REFINERY') && (
                        <>
                            <li><Link className="dropdown-item" to="/old-metal"><i className="bi bi-recycle me-2"></i>Scrap Metal</Link></li>
                            <li><Link className="dropdown-item" to="/refinery"><i className="bi bi-droplet-half me-2"></i>Refinery</Link></li>
                        </>
                    )}
                  </ul>
                </li>
            )}

            {/* 3. PARTNERS */}
            {canAccess('PARTNERS') && (
                <li className="nav-item dropdown">
                  <a className={`nav-link dropdown-toggle ${isDropdownActive(['/vendors', '/shops'])}`} href="#" role="button" data-bs-toggle="dropdown">Partners</a>
                  <ul className="dropdown-menu">
                    <li><Link className="dropdown-item" to="/vendors"><i className="bi bi-people me-2"></i>Vendors</Link></li>
                    <li><Link className="dropdown-item" to="/shops"><i className="bi bi-shop me-2"></i>Shops (B2B)</Link></li>
                  </ul>
                </li>
            )}

            {/* DIRECT LINKS */}
            {canAccess('CUSTOMERS') && <li className="nav-item"><Link className={`nav-link ${isActive('/customers')}`} to="/customers">Customers</Link></li>}
            {canAccess('CHITS') && <li className="nav-item"><Link className={`nav-link ${isActive('/chits')}`} to="/chits"><i className="bi bi-piggy-bank me-1"></i>Chits</Link></li>}
            {canAccess('LEDGER') && <li className="nav-item"><Link className={`nav-link ${isActive('/ledger')}`} to="/ledger">Ledger</Link></li>}

            {/* SETTINGS */}
            {canAccess('SETTINGS') && <li className="nav-item ms-2 me-4"><Link className={`nav-link ${isActive('/settings')}`} to="/settings" title="Settings"><i className="bi bi-gear-fill"></i></Link></li>}

            {/* LOGGED IN USER BADGE & LOGOUT */}
            {user.username && (
              <li className="nav-item d-flex align-items-center border-start ps-3">
                  <div className="text-white text-end me-3" style={{lineHeight: '1.1'}}>
                      <div className="fw-bold" style={{fontSize: '0.9rem'}}>{user.username}</div>
                      <span className={`badge ${user.role==='admin'?'bg-danger':user.role==='manager'?'bg-warning text-dark':'bg-secondary'}`} style={{fontSize: '0.65rem'}}>
                          {user.role ? user.role.toUpperCase() : 'STAFF'}
                      </span>
                  </div>
                  <button className="btn btn-outline-danger btn-sm" onClick={onLogout} title="Logout"><i className="bi bi-power"></i></button>
              </li>
            )}

          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;