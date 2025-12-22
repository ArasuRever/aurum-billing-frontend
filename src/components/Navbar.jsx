import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active fw-bold' : '';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm py-3 no-print">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold text-uppercase" to="/billing">
            <i className="bi bi-gem me-2 text-warning"></i>Aurum Billing
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto gap-2">
            
            {/* CORE OPERATIONS */}
            <li className="nav-item"><Link className={`nav-link ${isActive('/billing')}`} to="/billing">Billing</Link></li>
            <li className="nav-item"><Link className={`nav-link ${isActive('/bill-history')}`} to="/bill-history">History</Link></li>
            <li className="nav-item"><Link className={`nav-link ${isActive('/inventory')}`} to="/inventory">Inventory</Link></li>
            
            {/* LEDGER (NEW) */}
            <li className="nav-item"><Link className={`nav-link ${isActive('/ledger')}`} to="/ledger"><i className="bi bi-wallet2 me-1"></i>Ledger</Link></li>
            
            {/* PARTNERS DROPDOWN */}
            <li className="nav-item dropdown">
               <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">Partners</a>
               <ul className="dropdown-menu dropdown-menu-end shadow">
                  <li><Link className="dropdown-item" to="/customers">Customers</Link></li>
                  <li><Link className="dropdown-item" to="/shops">Shop Ledger (B2B)</Link></li>
                  <li><Link className="dropdown-item" to="/">Vendors</Link></li>
               </ul>
            </li>
            
            <li className="nav-item"><Link className={`nav-link ${isActive('/settings')}`} to="/settings"><i className="bi bi-gear-fill"></i></Link></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;