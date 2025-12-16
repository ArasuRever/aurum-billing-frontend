import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Page Imports
import VendorManager from './pages/VendorManager';
import VendorDetails from './pages/VendorDetails';
import InventoryManager from './pages/InventoryManager'; 
import Billing from './pages/Billing';

// NEW IMPORTS FOR SHOP LEDGER
import ShopManager from './pages/ShopManager';
import ShopDetails from './pages/ShopDetails';

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Navbar />
        <div className="container-fluid px-4">
          <Routes>
            {/* VENDORS */}
            <Route path="/" element={<VendorManager />} />
            <Route path="/vendors/:id" element={<VendorDetails />} />
            
            {/* NEW: SHOP LEDGER (B2B) */}
            <Route path="/shops" element={<ShopManager />} />
            <Route path="/shops/:id" element={<ShopDetails />} />

            {/* INVENTORY */}
            <Route path="/inventory" element={<InventoryManager />} />
            
            {/* BILLING */}
            <Route path="/billing" element={<Billing />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;