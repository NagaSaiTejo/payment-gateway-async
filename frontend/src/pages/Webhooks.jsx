import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Webhooks = () => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creds, setCreds] = useState({ apiKey: '', apiSecret: '' });

    useEffect(() => {
        const stored = localStorage.getItem('merchant');
        if (stored) {
            const parsed = JSON.parse(stored);
            setCreds(parsed);
            fetchWebhookConfig(parsed);
            fetchLogs(parsed);
        }
    }, []);

    const fetchWebhookConfig = async (credentials) => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/merchant/config', {
                headers: { 'X-Api-Key': credentials.apiKey, 'X-Api-Secret': credentials.apiSecret }
            });
            setWebhookUrl(res.data.webhook_url || '');
            setWebhookSecret(res.data.webhook_secret || '');
        } catch (err) { console.error(err); }
    };

    const fetchLogs = async (credentials) => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8000/api/v1/webhooks', {
                headers: { 'X-Api-Key': credentials.apiKey, 'X-Api-Secret': credentials.apiSecret }
            });
            setLogs(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.patch('http://localhost:8000/api/v1/merchant/webhook', { webhook_url: webhookUrl }, {
                headers: { 'X-Api-Key': creds.apiKey, 'X-Api-Secret': creds.apiSecret }
            });
            alert('Webhook configuration saved!');
            fetchWebhookConfig(creds);
        } catch (err) { alert('Failed to save configuration'); }
    };

    const handleRegenerateSecret = async () => {
        if (!window.confirm('Are you sure you want to regenerate the secret? Your current signature verification will break until you update it.')) return;
        try {
            const res = await axios.post('http://localhost:8000/api/v1/merchant/webhook/regenerate', {}, {
                headers: { 'X-Api-Key': creds.apiKey, 'X-Api-Secret': creds.apiSecret }
            });
            setWebhookSecret(res.data.webhook_secret);
            alert('Secret regenerated!');
        } catch (err) { alert('Failed to regenerate secret'); }
    };

    const handleSendTestWebhook = async () => {
        try {
            await axios.post(
                'http://localhost:8000/api/v1/merchant/webhook/test',
                {},
                {
                    headers: {
                        'X-Api-Key': creds.apiKey,
                        'X-Api-Secret': creds.apiSecret
                    }
                }
            );
            alert('Test webhook enqueued successfully!');
            fetchWebhookLogs(); // Refresh logs to show the new pending delivery
        } catch (err) {

            console.error('Failed to send test webhook', err);
            alert('Failed to send test webhook. Please ensure a URL is configured.');
        }
    };

    const handleRetry = async (logId) => {
        try {
            await axios.post(`http://localhost:8000/api/v1/webhooks/${logId}/retry`, {}, {
                headers: { 'X-Api-Key': creds.apiKey, 'X-Api-Secret': creds.apiSecret }
            });
            alert('Retry scheduled');
            fetchLogs(creds);
        } catch (err) { alert('Retry failed'); }
    };

    return (
        <div className="layout" data-test-id="webhook-config">
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
                    <Link to="/dashboard/webhooks" className="nav-link active">
                        <span>🔗</span>
                        <span>Webhooks</span>
                    </Link>
                    <Link to="/dashboard/docs" className="nav-link">
                        <span>📖</span>
                        <span>Docs</span>
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
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                </div>
            </aside>

            <main className="main-content">
                <header className="page-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                    background: 'white',
                    padding: '1.5rem 2rem',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Webhook Configuration</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Configure your real-time event notifications</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Test Merchant</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Merchant ID: mer_8a2b3c</div>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: '#f1f5f9',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}>
                            🏢
                        </div>
                    </div>
                </header>


                <div className="card" style={{ marginTop: '1.5rem', padding: '2rem' }}>
                    <form onSubmit={handleSave} data-test-id="webhook-config-form">
                        <div className="form-group">
                            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Webhook URL</label>
                            <input
                                type="url"
                                className="input-field"
                                data-test-id="webhook-url-input"
                                value={webhookUrl}
                                onChange={e => setWebhookUrl(e.target.value)}
                                placeholder="https://your-site.com/webhook"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                required
                            />
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Where we'll send POST requests for payment events.</p>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Webhook Secret</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                <code data-test-id="webhook-secret" style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>{webhookSecret || 'Not Generated'}</code>
                                <button type="button" className="btn btn-secondary" data-test-id="regenerate-secret-button" onClick={handleRegenerateSecret} style={{ marginLeft: 'auto' }}>Regenerate</button>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Used to sign webhook payloads using HMAC-SHA256.</p>
                        </div>

                        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary" data-test-id="save-webhook-button" style={{ padding: '0.8rem 2rem' }}>Save Configuration</button>
                            <button type="button" className="btn btn-secondary" data-test-id="test-webhook-button" onClick={handleSendTestWebhook}>Send Test Webhook</button>
                        </div>
                    </form>
                </div>


                <h3 style={{ marginTop: '2.5rem' }}>Webhook Logs</h3>
                <div className="card" style={{ marginTop: '1rem' }}>
                    {loading ? <p>Loading logs...</p> : (
                        <div className="table-container">
                            <table data-test-id="webhook-logs-table">
                                <thead>
                                    <tr>
                                        <th>Event</th>
                                        <th>Status</th>
                                        <th>Attempts</th>
                                        <th>Last Attempt</th>
                                        <th>Resp</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} data-test-id="webhook-log-item" data-webhook-id={log.id}>
                                            <td data-test-id="webhook-event">{log.event}</td>
                                            <td data-test-id="webhook-status"><span className={`badge badge-${log.status}`}>{log.status}</span></td>
                                            <td data-test-id="webhook-attempts">{log.attempts}</td>
                                            <td data-test-id="webhook-last-attempt">{log.last_attempt_at ? new Date(log.last_attempt_at).toLocaleString() : '-'}</td>
                                            <td data-test-id="webhook-response-code">{log.response_code || '-'}</td>
                                            <td>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    data-test-id="retry-webhook-button"
                                                    data-webhook-id={log.id}
                                                    onClick={() => handleRetry(log.id)}
                                                >
                                                    Retry
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>No logs found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Webhooks;
