import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Transactions = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        method: 'all',
        search: ''
    });
    const [sortConfig, setSortConfig] = useState({
        key: 'created_at',
        direction: 'descending'
    });

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        const stored = localStorage.getItem('merchant');
        if (!stored) return;
        const { apiKey, apiSecret } = JSON.parse(stored);

        try {
            setLoading(true);
            const response = await axios.get('http://localhost:8000/api/v1/payments', {
                headers: {
                    'X-Api-Key': apiKey,
                    'X-Api-Secret': apiSecret
                }
            });
            setPayments(response.data);
        } catch (err) {
            console.error('Failed to fetch payments', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const icons = {
            success: '✅',
            pending: '⌛',
            failed: '❌',
            refunded: '↩️'
        };

        const classes = {
            success: 'badge badge-success',
            pending: 'badge badge-processing',
            failed: 'badge badge-failed',
            refunded: 'badge badge-secondary'
        };

        return (
            <span className={classes[status] || 'badge'} style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                fontWeight: 600,
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                textTransform: 'capitalize'
            }}>
                {icons[status] || '📊'} {status}
            </span>
        );
    };


    const getMethodIcon = (method) => {
        const icons = {
            upi: '📱',
            card: '💳'
        };
        return icons[method] || '💳';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount / 100);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortedPayments = () => {
        const sortablePayments = [...payments];
        if (sortConfig.key) {
            sortablePayments.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortablePayments;
    };

    const getFilteredPayments = () => {
        let filtered = getSortedPayments();

        if (filters.status !== 'all') {
            filtered = filtered.filter(p => p.status === filters.status);
        }

        if (filters.method !== 'all') {
            filtered = filtered.filter(p => p.method === filters.method);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.id.toLowerCase().includes(searchLower) ||
                p.order_id.toLowerCase().includes(searchLower) ||
                p.method.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    };

    const exportToCSV = () => {
        const csvContent = [
            ['Payment ID', 'Order ID', 'Amount', 'Method', 'Status', 'Date', 'Time'],
            ...getFilteredPayments().map(p => [
                p.id,
                p.order_id,
                formatCurrency(p.amount),
                p.method.toUpperCase(),
                p.status,
                formatDate(p.created_at).date,
                formatDate(p.created_at).time
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getStats = () => {
        const filtered = getFilteredPayments();
        const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);
        const successCount = filtered.filter(p => p.status === 'success').length;

        return {
            total: filtered.length,
            amount: totalAmount,
            successRate: filtered.length > 0 ? Math.round((successCount / filtered.length) * 100) : 0
        };
    };

    const stats = getStats();
    const filteredPayments = getFilteredPayments();

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
                    <Link to="/dashboard/transactions" className="nav-link active">
                        <span>💳</span>
                        <span>Transactions</span>
                    </Link>
                    <Link to="/dashboard/webhooks" className="nav-link">
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
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <h2>Transaction History</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            View and manage all your payment transactions
                        </p>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={exportToCSV}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <span>📥</span>
                        Export CSV
                    </button>
                </div>

                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <div className="stat-label">
                            <span>📊</span>
                            Total Transactions
                        </div>
                        <div className="stat-value">
                            {stats.total.toLocaleString()}
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">
                            <span>💰</span>
                            Filtered Amount
                        </div>
                        <div className="stat-value">
                            {formatCurrency(stats.amount)}
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-label">
                            <span>✅</span>
                            Success Rate
                        </div>
                        <div className="stat-value">
                            {stats.successRate}%
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.25rem',
                                    fontWeight: '600'
                                }}>
                                    Status
                                </label>
                                <select
                                    className="form-input"
                                    style={{ width: '150px', padding: '0.5rem' }}
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="all">All Status</option>
                                    <option value="success">Success</option>
                                    <option value="processing">Processing</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.25rem',
                                    fontWeight: '600'
                                }}>
                                    Method
                                </label>
                                <select
                                    className="form-input"
                                    style={{ width: '150px', padding: '0.5rem' }}
                                    value={filters.method}
                                    onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                                >
                                    <option value="all">All Methods</option>
                                    <option value="upi">UPI</option>
                                    <option value="card">Card</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.25rem',
                                    fontWeight: '600'
                                }}>
                                    Search
                                </label>
                                <input
                                    className="form-input"
                                    style={{ width: '200px', padding: '0.5rem' }}
                                    type="text"
                                    placeholder="Search ID or Order..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                className="btn"
                                onClick={() => {
                                    setFilters({
                                        status: 'all',
                                        method: 'all',
                                        search: ''
                                    });
                                    setSortConfig({
                                        key: 'created_at',
                                        direction: 'descending'
                                    });
                                }}
                                style={{
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: 'var(--primary)'
                                }}
                            >
                                Clear Filters
                            </button>
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
                                Loading transactions...
                            </div>
                        </div>
                    ) : filteredPayments.length > 0 ? (
                        <div className="table-container">
                            <table data-test-id="transactions-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                                            PAYMENT ID {sortConfig.key === 'id' && (
                                                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                                            )}
                                        </th>
                                        <th onClick={() => handleSort('order_id')} style={{ cursor: 'pointer' }}>
                                            ORDER ID {sortConfig.key === 'order_id' && (
                                                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                                            )}
                                        </th>
                                        <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                                            AMOUNT {sortConfig.key === 'amount' && (
                                                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                                            )}
                                        </th>
                                        <th onClick={() => handleSort('method')} style={{ cursor: 'pointer' }}>
                                            METHOD {sortConfig.key === 'method' && (
                                                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                                            )}
                                        </th>
                                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                            STATUS {sortConfig.key === 'status' && (
                                                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                                            )}
                                        </th>
                                        <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                                            DATE & TIME {sortConfig.key === 'created_at' && (
                                                <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                                            )}
                                        </th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map(payment => {
                                        const { date, time } = formatDate(payment.created_at);
                                        return (
                                            <tr
                                                key={payment.id}
                                                data-test-id="transaction-row"
                                                data-payment-id={payment.id}
                                                style={{ transition: 'all 0.2s ease' }}
                                            >
                                                <td data-test-id="payment-id">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.875rem' }}>
                                                            {getMethodIcon(payment.method)}
                                                        </span>
                                                        <code style={{
                                                            color: 'var(--primary)',
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            background: 'rgba(99, 102, 241, 0.05)',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '4px',
                                                            display: 'block'
                                                        }}>
                                                            {payment.id}
                                                        </code>
                                                    </div>
                                                </td>
                                                <td data-test-id="order-id">
                                                    <code style={{
                                                        color: 'var(--text-muted)',
                                                        fontSize: '0.75rem',
                                                        background: 'var(--background)',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        display: 'block'
                                                    }}>
                                                        {payment.order_id}
                                                    </code>
                                                </td>
                                                <td data-test-id="amount" style={{ fontWeight: 600 }}>
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td data-test-id="method" style={{ textTransform: 'uppercase' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {getMethodIcon(payment.method)}
                                                        {payment.method}
                                                    </div>
                                                </td>
                                                <td data-test-id="status">
                                                    {getStatusBadge(payment.status)}
                                                </td>
                                                <td data-test-id="created-at">
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                                                            {date}
                                                        </div>
                                                        <div style={{
                                                            color: 'var(--text-muted)',
                                                            fontSize: '0.75rem',
                                                            marginTop: '0.25rem'
                                                        }}>
                                                            {time}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {payment.status === 'success' && (
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            data-test-id="refund-button"
                                                            data-payment-id={payment.id}
                                                            onClick={async () => {
                                                                const reason = prompt('Reason for refund:');
                                                                if (!reason) return;
                                                                try {
                                                                    const { apiKey, apiSecret } = JSON.parse(localStorage.getItem('merchant'));
                                                                    await axios.post(`http://localhost:8000/api/v1/payments/${payment.id}/refunds`,
                                                                        { amount: payment.amount, reason },
                                                                        { headers: { 'X-Api-Key': apiKey, 'X-Api-Secret': apiSecret } }
                                                                    );
                                                                    alert('Refund initiated!');
                                                                    fetchPayments();
                                                                } catch (err) { alert('Refund failed'); }
                                                            }}
                                                        >
                                                            Refund
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem 1.5rem',
                                borderTop: '1px solid var(--border)',
                                background: '#f8fafc'
                            }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    Showing {filteredPayments.length} of {payments.length} transactions
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn" style={{ padding: '0.375rem 0.75rem' }} disabled>
                                        ← Previous
                                    </button>
                                    <button className="btn" style={{ padding: '0.375rem 0.75rem' }} disabled>
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: 'var(--text-muted)'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <h3 style={{ marginBottom: '0.5rem' }}>No transactions found</h3>
                            <p style={{ fontSize: '0.875rem' }}>
                                {payments.length === 0
                                    ? "You haven't processed any payments yet."
                                    : "No transactions match your current filters."}
                            </p>
                            {payments.length === 0 ? (
                                <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: '1rem' }}
                                    onClick={() => setFilters({
                                        status: 'all',
                                        method: 'all',
                                        search: ''
                                    })}
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem',
                    marginTop: '1.5rem'
                }}>
                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>Transaction Insights</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.25rem'
                                }}>
                                    Most Common Method
                                </div>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    {(() => {
                                        const upiCount = payments.filter(p => p.method === 'upi').length;
                                        const cardCount = payments.filter(p => p.method === 'card').length;
                                        return upiCount > cardCount ? '📱 UPI' : '💳 Card';
                                    })()}
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '0.25rem'
                                }}>
                                    Average Transaction
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                                    {payments.length > 0
                                        ? formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0) / payments.length)
                                        : '₹0'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h4 style={{ marginBottom: '1rem' }}>Quick Actions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                className="btn"
                                style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: 'var(--success)',
                                    justifyContent: 'flex-start'
                                }}
                                onClick={exportToCSV}
                            >
                                📥 Download Report
                            </button>
                            <button
                                className="btn"
                                style={{
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: 'var(--primary)',
                                    justifyContent: 'flex-start'
                                }}
                                onClick={fetchPayments}
                            >
                                🔄 Refresh Data
                            </button>
                            <Link
                                to="/dashboard"
                                className="btn"
                                style={{
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    color: 'var(--secondary)',
                                    justifyContent: 'flex-start',
                                    textDecoration: 'none'
                                }}
                            >
                                ← Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Transactions;