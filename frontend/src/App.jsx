import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Webhooks from './pages/Webhooks';
import Queue from './pages/Queue';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/transactions" element={<Transactions />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route path="/queue" element={<Queue />} />
      </Routes>
    </Router>
  );
}
export default App;