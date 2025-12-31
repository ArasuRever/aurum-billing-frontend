import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BusinessContext } from '../context/BusinessContext';

function Navbar() {
  const location = useLocation();
  const { settings } = useContext(BusinessContext);

  // Helper to highlight the main dropdown parent if any child is active
  const isDropdownActive = (paths) => {
      if (paths.includes('/') && location.pathname === '/') return 'active fw-bold';
      return paths.some(p => p !== '/' && location.pathname.startsWith(p)) ? 'active fw-bold' : '';
  };

  const isActive = (path) => location.pathname.startsWith(path) ? 'active fw-bold' : '';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm mb-4">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
           {settings.logo ? (
             <img 
               src={settings.logo} 
               alt="Logo" 
               style={{height: '35px', marginRight: '10px', borderRadius:'4px', border:'1px solid #555'}} 
             />
           ) : (
             <i className="bi bi-gem me-2 text-warning"></i>
           )}
           <span style={{letterSpacing: '1px'}}>{settings.name.toUpperCase()}</span>
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            
            {/* 1. SALES & BILLING */}
            <li className="nav-item dropdown">
              <a className={`nav-link dropdown-toggle ${isDropdownActive(['/billing', '/bill-history'])}`} href="#" role="button" data-bs-toggle="dropdown">
                Sales
              </a>
              <ul className="dropdown-menu">
                <li><Link className="dropdown-item" to="/billing"><i className="bi bi-receipt me-2"></i>New Bill</Link></li>
                <li><Link className="dropdown-item" to="/bill-history"><i className="bi bi-clock-history me-2"></i>Bill History</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/billing/return"><i className="bi bi-arrow-return-left me-2"></i>Sales Return</Link></li>
                <li className="nav-item"><Link className={`nav-link fw-bold ${isActive('/gst-filing')}`} to="/gst-filing" style={{color: '#dc3545'}}><i className="bi bi-file-text me-1"></i>GST Filing</Link></li>
              </ul>
            </li>

            {/* 2. INVENTORY */}
            <li className="nav-item dropdown">
              <a className={`nav-link dropdown-toggle ${isDropdownActive(['/inventory', '/old-metal', '/refinery', '/add-stock', '/audit'])}`} href="#" role="button" data-bs-toggle="dropdown">
                Inventory
              </a>
              <ul className="dropdown-menu">
                <li>
                    <Link className="dropdown-item fw-bold text-success bg-success bg-opacity-10 mb-1" to="/add-stock">
                        <i className="bi bi-plus-circle-fill me-2"></i>Add Stock (Batch)
                    </Link>
                </li>
                <li><Link className="dropdown-item" to="/inventory"><i className="bi bi-box-seam me-2"></i>Manage Inventory</Link></li>
                <li>
                    <Link className="dropdown-item fw-bold text-primary" to="/audit">
                        <i className="bi bi-upc-scan me-2"></i>Stock Audit (Tally)
                    </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/old-metal"><i className="bi bi-recycle me-2"></i>Scrap / Old Metal</Link></li>
                <li><Link className="dropdown-item" to="/refinery"><i className="bi bi-droplet-half me-2"></i>Refinery</Link></li>
              </ul>
            </li>

            {/* 3. PARTNERS */}
            <li className="nav-item dropdown">
              <a className={`nav-link dropdown-toggle ${isDropdownActive(['/vendors', '/shops'])}`} href="#" role="button" data-bs-toggle="dropdown">
                Partners
              </a>
              <ul className="dropdown-menu">
                <li><Link className="dropdown-item" to="/vendors"><i className="bi bi-people me-2"></i>Vendors</Link></li>
                <li><Link className="dropdown-item" to="/shops"><i className="bi bi-shop me-2"></i>Shops (B2B)</Link></li>
              </ul>
            </li>

            {/* 4. CUSTOMERS */}
            <li className="nav-item">
                <Link className={`nav-link ${isActive('/customers')}`} to="/customers">Customers</Link>
            </li>

            {/* --- 5. NEW CHITS TAB --- */}
            <li className="nav-item">
                <Link className={`nav-link ${isActive('/chits')}`} to="/chits">
                    <i className="bi bi-piggy-bank me-1"></i>Chits
                </Link>
            </li>
            {/* ------------------------ */}

            {/* 6. LEDGER */}
            <li className="nav-item">
                <Link className={`nav-link ${isActive('/ledger')}`} to="/ledger">Ledger</Link>
            </li>

            {/* 7. SETTINGS */}
            <li className="nav-item ms-2">
                <Link className={`nav-link ${isActive('/settings')}`} to="/settings" title="Settings">
                    <i className="bi bi-gear-fill"></i>
                </Link>
            </li>

          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;