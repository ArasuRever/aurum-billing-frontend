import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Page Imports
import VendorManager from './pages/VendorManager';
import VendorDetails from './pages/VendorDetails';
import InventoryManager from './pages/InventoryManager'; 
import Billing from './pages/Billing';
import ShopManager from './pages/ShopManager';
import ShopDetails from './pages/ShopDetails';
import CustomerManager from './pages/CustomerManager';
import CustomerDetails from './pages/CustomerDetails';
import SettingsPage from './pages/SettingsPage';
import BillHistory from './pages/BillHistory';
import SalesReturn from './pages/SalesReturn';

// --- NEW IMPORT ---
import LedgerDashboard from './pages/LedgerDashboard';

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Navbar />
        <div className="container-fluid px-4">
          <Routes>
            <Route path="/" element={<VendorManager />} />
            <Route path="/vendors/:id" element={<VendorDetails />} />
            <Route path="/shops" element={<ShopManager />} />
            <Route path="/shops/:id" element={<ShopDetails />} />
            <Route path="/inventory" element={<InventoryManager />} />
            <Route path="/customers" element={<CustomerManager />} />
            <Route path="/customers/:phone" element={<CustomerDetails />} />
            <Route path="/settings" element={<SettingsPage />} />
            
            {/* BILLING SECTION */}
            <Route path="/billing" element={<Billing />} />
            <Route path="/bill-history" element={<BillHistory />} />
            <Route path="/billing/return" element={<SalesReturn />} />
            
            {/* LEDGER SECTION */}
            <Route path="/ledger" element={<LedgerDashboard />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;