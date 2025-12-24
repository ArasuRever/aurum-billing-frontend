import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path) ? 'active fw-bold' : '';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm mb-4">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" to="/">
          <i className="bi bi-gem me-2"></i>AURUM BILLING
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item"><Link className={`nav-link ${isActive('/billing')}`} to="/billing">Billing</Link></li>
            {/* NEW HISTORY TAB */}
            <li className="nav-item"><Link className={`nav-link ${isActive('/bill-history')}`} to="/bill-history">History</Link></li>
            
            <li className="nav-item"><Link className={`nav-link ${isActive('/ledger')}`} to="/ledger">Ledger</Link></li>
            
            <li className="nav-item"><Link className={`nav-link ${isActive('/old-metal')}`} to="/old-metal">Scrap/Old</Link></li>

            <li className="nav-item"><Link className={`nav-link ${isActive('/inventory')}`} to="/inventory">Inventory</Link></li>
            <li className="nav-item"><Link className={`nav-link ${isActive('/vendors')}`} to="/">Vendors</Link></li>
            <li className="nav-item"><Link className={`nav-link ${isActive('/shops')}`} to="/shops">Shops (B2B)</Link></li>
            <li className="nav-item"><Link className={`nav-link ${isActive('/customers')}`} to="/customers">Customers</Link></li>
            <li className="nav-item"><Link className={`nav-link ${isActive('/settings')}`} to="/settings"><i className="bi bi-gear"></i></Link></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;