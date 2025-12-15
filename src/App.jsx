import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

import VendorManager from './pages/VendorManager';
import VendorDetails from './pages/VendorDetails'; // NEW PAGE
import InventoryManager from './pages/InventoryManager'; 
import Billing from './pages/Billing';

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 bg-light">
        <Navbar />
        <div className="container-fluid px-4">
          <Routes>
            <Route path="/" element={<VendorManager />} />
            <Route path="/vendors/:id" element={<VendorDetails />} /> {/* NEW ROUTE */}
            
            <Route path="/inventory" element={<InventoryManager />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;