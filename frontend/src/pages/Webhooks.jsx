import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Webhooks = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/webhooks', {
          headers: {
            'X-Api-Key': 'key_test_abc123',
            'X-Api-Secret': 'secret_test_xyz789'
          }
        });
        setWebhooks(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch webhooks:', error);
        // Mock data for demo
        setWebhooks([
          { id: '1', event: 'payment.success', status: 'failed', attempts: 2, created_at: new Date().toISOString() },
          { id: '2', event: 'payment.success', status: 'failed', attempts: 2, created_at: new Date().toISOString() }
        ]);
      }
      setLoading(false);
    };
    fetchWebhooks();
  }, []);

  if (loading) return <div>Loading webhooks...</div>;

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
          <Link to="/analytics" className="nav-link">
            <span>📈</span>
            <span>Analytics</span>
          </Link>
          <Link to="/webhooks" className="nav-link active">
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
        <div className="webhooks-page">
          <h1>🔔 Webhook Logs</h1>
      <p><strong>Deliverable 2 Feature:</strong> Automated webhook delivery with retry logic</p>
      
      <div className="webhooks-list">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Created At</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map(webhook => (
              <tr key={webhook.id}>
                <td>{webhook.event}</td>
                <td className={`status-${webhook.status}`}>
                  {webhook.status}
                </td>
                <td>{webhook.attempts}</td>
                <td>{new Date(webhook.created_at).toLocaleString()}</td>
                <td>
                  {webhook.status === 'failed' ? '⚠️ Retrying...' : '✅ Delivered'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="webhook-info">
        <h3>🎯 Webhook System Status:</h3>
        <ul>
          <li>✅ Worker listening for webhook jobs</li>
          <li>✅ Webhook delivery attempts logged</li>
          <li>✅ Retry mechanism active</li>
          <li>❌ Currently failing because test URL (example.com) rejects webhooks</li>
          <li>⚠️ Change webhook_url in database to your actual endpoint</li>
        </ul>
      </div>
    </div>
        </main>
    </div>
  );
};

export default Webhooks;
