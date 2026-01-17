import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState({
        count: 0,
        amount: 0,
        successRate: 0,
        todayCount: 0,
        todayAmount: 0
    });
    const [creds, setCreds] = useState({ apiKey: '', apiSecret: '' });
    const [recentPayments, setRecentPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('merchant');
        if (stored) {
            const parsed = JSON.parse(stored);
            setCreds(parsed);
            fetchDashboardData(parsed);
        }
    }, []);

    const fetchDashboardData = async (credentials) => {
        try {
            setLoading(true);
            const paymentsResponse = await axios.get(
                'http://localhost:8000/api/v1/payments',
                {
                    headers: {
                        'X-Api-Key': credentials.apiKey,
                        'X-Api-Secret': credentials.apiSecret
                    }
                }
            );

            const payments = paymentsResponse.data;

            // calculate today's stats locally
            const today = new Date().toDateString();

            const todayPayments = payments.filter(p =>
                new Date(p.created_at).toDateString() === today &&
                p.status.toLowerCase() === 'success'
            );

            const todayCount = todayPayments.length;
            const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);


            // Get last 5 successful payments for recent activity
            const recent = [...payments]
                .filter(p => p.status.toLowerCase() === 'success')
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);

            const totalCount = payments.length;
            const successPayments = payments.filter(
                p => p.status.toLowerCase() === 'success'
            ); const totalAmount = successPayments.reduce((sum, p) => sum + p.amount, 0);
            const rate = totalCount > 0 ? (successPayments.length / totalCount) * 100 : 0;

            setStats({
                count: totalCount,
                amount: totalAmount,
                successRate: Math.round(rate * 10) / 10,
                todayCount,
                todayAmount
            });


            setRecentPayments(recent);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount / 100);
    };

    const getStatusBadge = (status) => {
        const classes = {
            success: 'badge badge-success',
            processing: 'badge badge-processing',
            failed: 'badge badge-failed'
        };
        return <span className={classes[status] || 'badge'}>{status}</span>;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div className="layout" data-test-id="dashboard">
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
                    <Link to="/dashboard" className="nav-link active">
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
                }}>
                </div>
            </aside>

            <main className="main-content">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '2.5rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <h2>Welcome back, Merchant!</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Here's what's happening with your payments today.
                        </p>
                    </div>

                    <div className="api-credentials" data-test-id="api-credentials">
                        <div className="credential-card" onClick={() => copyToClipboard(creds.apiKey)}>
                            <div>
                                <div className="credential-label">API Key</div>
                                <code
                                    className="credential-value"
                                    data-test-id="api-key"
                                    title="Click to copy"
                                >
                                    {creds.apiKey}
                                </code>
                            </div>
                            <button style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer'
                            }}>
                                📋
                            </button>
                        </div>

                        <div className="credential-card" onClick={() => copyToClipboard(creds.apiSecret)}>
                            <div>
                                <div className="credential-label">API Secret</div>
                                <code
                                    className="credential-value"
                                    data-test-id="api-secret"
                                    title="Click to copy"
                                >
                                    {creds.apiSecret}
                                </code>
                            </div>
                            <button style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer'
                            }}>
                                📋
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '300px'
                    }}>
                        <div className="loading" style={{
                            fontSize: '1.5rem',
                            color: 'var(--primary)'
                        }}>
                            Loading dashboard...
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="stats-grid" data-test-id="stats-container">
                            <div className="stat-card">
                                <div className="stat-label">
                                    <span>📈</span>
                                    Total Transactions
                                </div>
                                <div className="stat-value" data-test-id="total-transactions">
                                    {stats.count.toLocaleString()}
                                    <small style={{
                                        fontSize: '0.875rem',
                                        color: 'var(--success)',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        marginLeft: '0.5rem'
                                    }}>
                                        +{stats.todayCount} today
                                    </small>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-label">
                                    <span>💰</span>
                                    Total Volume
                                </div>
                                <div className="stat-value" data-test-id="total-amount">
                                    {formatCurrency(stats.amount)}
                                    <small style={{
                                        fontSize: '0.875rem',
                                        color: 'var(--success)',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        marginLeft: '0.5rem'
                                    }}>
                                        +{formatCurrency(stats.todayAmount)} today
                                    </small>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-label">
                                    <span>✅</span>
                                    Success Rate
                                </div>
                                <div className="stat-value" data-test-id="success-rate">
                                    {stats.successRate}%
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'var(--border)',
                                        borderRadius: '4px',
                                        marginTop: '0.75rem',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${stats.successRate}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, var(--success) 0%, #34d399 100%)',
                                            borderRadius: '4px'
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <div>
                                    <h3>Recent Activity</h3>
                                    <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                        Latest payment transactions
                                    </p>
                                </div>
                                <Link to="/dashboard/transactions" className="btn btn-primary">
                                    View All Transactions
                                </Link>
                            </div>

                            {recentPayments.length > 0 ? (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Payment ID</th>
                                                <th>Amount</th>
                                                <th>Method</th>
                                                <th>Status</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentPayments.map(payment => (
                                                <tr key={payment.id}>
                                                    <td>
                                                        <code style={{
                                                            color: 'var(--primary)',
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem'
                                                        }}>
                                                            {payment.id}
                                                        </code>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>
                                                        {formatCurrency(payment.amount)}
                                                    </td>
                                                    <td style={{ textTransform: 'uppercase' }}>
                                                        {payment.method}
                                                    </td>
                                                    <td>{getStatusBadge(payment.status)}</td>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                        {new Date(payment.created_at).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '3rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
                                    <p>No transactions yet</p>
                                    <p style={{ fontSize: '0.875rem' }}>Start accepting payments to see activity here</p>
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <h4 style={{ marginBottom: '1rem' }}>System Status</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>API Status</span>
                                    <span className="badge badge-success">Operational</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>Database</span>
                                    <span className="badge badge-success">Connected</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>Payment Processing</span>
                                    <span className="badge badge-success">Active</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;