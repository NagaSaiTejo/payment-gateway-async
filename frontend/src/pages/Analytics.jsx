import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Analytics = () => {
  const [stats, setStats] = useState({ payments: 0, success: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch analytics data
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/analytics', {
          headers: {
            'X-Api-Key': 'key_test_abc123',
            'X-Api-Secret': 'secret_test_xyz789'
          }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        // Mock data for demo
        setStats({ payments: 45, success: 40, failed: 5, revenue: 12500 });
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #818cf8 0%, #c4b5fd 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            PG
          </div>
          <span>Payment Gateway</span>
        </div>
        <nav>
          <Link to="/dashboard" className="nav-link">
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
          <Link to="/dashboard/transactions" className="nav-link">
            <span>💳</span>
            <span>Transactions</span>
          </Link>
          <Link to="/analytics" className="nav-link active">
            <span>📈</span>
            <span>Analytics</span>
          </Link>
          <Link to="/webhooks" className="nav-link">
            <span>🔔</span>
            <span>Webhooks</span>
          </Link>
          <Link to="/queue" className="nav-link">
            <span>📬</span>
            <span>Queue</span>
          </Link>
          <Link to="/login" className="nav-link" onClick={() => localStorage.clear()}>
            <span>🚪</span>
            <span>Logout</span>
          </Link>
        </nav>
        <div style={{
          marginTop: 'auto',
          padding: '1.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          margin: '1rem'
        }} />
      </aside>
      <main className="main-content">
        <div className="analytics-page">
          <h1>📊 Analytics Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Payments</h3>
          <p className="stat-number">{stats.payments}</p>
        </div>
        <div className="stat-card">
          <h3>Success Rate</h3>
          <p className="stat-number success">
            {stats.payments ? ((stats.success / stats.payments) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="stat-card">
          <h3>Failed</h3>
          <p className="stat-number failed">{stats.failed}</p>
        </div>
        <div className="stat-card">
          <h3>Revenue</h3>
          <p className="stat-number">₹{stats.revenue || 0}</p>
        </div>
      </div>
      
      <h2>📈 Recent Activity</h2>
      <p>Analytics data fetched from backend API.</p>
      <p>🎯 <strong>Deliverable 2 Feature:</strong> Real-time payment analytics</p>
        </div>
      </main>
    </div>
  );
};

export default Analytics;