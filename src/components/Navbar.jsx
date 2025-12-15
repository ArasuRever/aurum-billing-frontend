import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active fw-bold' : '';

  return (
    // Changed bg-dark to bg-primary (Blue) for a professional look
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm mb-4">
      <div className="container-fluid px-4"> 
        {/* Changed container to container-fluid for wider reach */}
        
        {/* Brand */}
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <i className="bi bi-gem me-2"></i>
          <span className="fw-bold">AURUM</span>
          <span className="ms-2 fw-light opacity-75">Billing</span>
        </Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/')}`} to="/">
                <i className="bi bi-people me-1"></i> Vendors
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/inventory')}`} to="/inventory">
                <i className="bi bi-box-seam me-1"></i> Inventory
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/billing')}`} to="/billing">
                <i className="bi bi-receipt me-1"></i> Billing
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;