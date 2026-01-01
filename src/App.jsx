import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { BusinessProvider } from './context/BusinessContext';
import Login from './pages/Login'; 

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
import LedgerDashboard from './pages/LedgerDashboard';
import OldMetalPage from './pages/OldMetalPage';
import RefineryManager from './pages/RefineryManager';
import BulkStockEntry from './pages/BulkStockEntry';
import ExternalGST from './pages/ExternalGST';
import Dashboard from './pages/Dashboard';
import StockAudit from './pages/StockAudit';
import ChitManager from './pages/ChitManager';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  const handleLogin = (newToken, user) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(newToken);
    
    // --- FIX: FORCE REDIRECT TO DASHBOARD ---
    // This resets the URL to '/' so the Router loads the Dashboard
    window.history.replaceState(null, '', '/'); 
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    // Optional: Reset URL on logout too
    window.history.replaceState(null, '', '/');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BusinessProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100 bg-light">
          <Navbar onLogout={handleLogout} />
          <div className="container-fluid px-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/gst-filing" element={<ExternalGST />} />
              <Route path="/vendors" element={<VendorManager />} />
              <Route path="/vendors/:id" element={<VendorDetails />} />
              <Route path="/shops" element={<ShopManager />} />
              <Route path="/shops/:id" element={<ShopDetails />} />
              <Route path="/inventory" element={<InventoryManager />} />
              <Route path="/add-stock" element={<BulkStockEntry />} />
              <Route path="/customers" element={<CustomerManager />} />
              <Route path="/customers/:phone" element={<CustomerDetails />} />
              <Route path="/chits" element={<ChitManager />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/bill-history" element={<BillHistory />} />
              <Route path="/billing/return" element={<SalesReturn />} />
              <Route path="/ledger" element={<LedgerDashboard />} />
              <Route path="/old-metal" element={<OldMetalPage />} />
              <Route path="/refinery" element={<RefineryManager />} />
              <Route path="/audit" element={<StockAudit />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </BusinessProvider>
  );
}

export default App;