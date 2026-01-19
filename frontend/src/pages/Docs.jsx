import React from 'react';
import { Link } from 'react-router-dom';

const Docs = () => {
    return (
        <div className="layout" data-test-id="api-docs">
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
                    <Link to="/dashboard/webhooks" className="nav-link">
                        <span>🔗</span>
                        <span>Webhooks</span>
                    </Link>
                    <Link to="/dashboard/docs" className="nav-link active">
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
                        <h2 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Integration Documentation</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Everything you need to integrate our payment gateway</p>
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


                <div className="docs-container" style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
                    <section data-test-id="section-create-order" className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="badge badge-primary" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>1</div>
                            <h3 style={{ margin: 0 }}>Create Order</h3>
                        </div>
                        <p style={{ margin: '1rem 0', color: '#64748b' }}>Initiate an order from your server. This returns an `order_id` which is required for the checkout process.</p>
                        <pre data-test-id="code-snippet-create-order" className="code-block" style={{ background: '#0f172a', color: '#cbd5e1', padding: '1.5rem', borderRadius: '12px', overflowX: 'auto', fontSize: '0.9rem' }}>
                            <code>{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "X-Api-Key: YOUR_KEY" \\
  -H "X-Api-Secret: YOUR_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'`}</code>
                        </pre>
                    </section>

                    <section data-test-id="section-sdk-integration" className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="badge badge-primary" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>2</div>
                            <h3 style={{ margin: 0 }}>SDK Integration</h3>
                        </div>
                        <p style={{ margin: '1rem 0', color: '#64748b' }}>Include the checkout script on your page and initialize the `PaymentGateway` class.</p>
                        <pre data-test-id="code-snippet-sdk" className="code-block" style={{ background: '#0f172a', color: '#cbd5e1', padding: '1.5rem', borderRadius: '12px', overflowX: 'auto', fontSize: '0.9rem' }}>
                            <code>{`<script src="http://localhost:3001/checkout.js"></script>
<script>
const checkout = new PaymentGateway({
  key: 'YOUR_KEY',
  orderId: 'order_xyz',
  onSuccess: (response) => {
    console.log('Payment successful!', response.paymentId);
  },
  onFailure: (error) => {
    console.error('Payment failed', error);
  }
});

document.getElementById('pay-button').onclick = () => checkout.open();
</script>`}</code>
                        </pre>
                    </section>

                    <section data-test-id="section-webhook-verification" className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="badge badge-primary" style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>3</div>
                            <h3 style={{ margin: 0 }}>Verify Webhook Signature</h3>
                        </div>
                        <p style={{ margin: '1rem 0', color: '#64748b' }}>Always verify the webhook signature to ensure the request came from us.</p>
                        <pre data-test-id="code-snippet-webhook" className="code-block" style={{ background: '#0f172a', color: '#cbd5e1', padding: '1.5rem', borderRadius: '12px', overflowX: 'auto', fontSize: '0.9rem' }}>
                            <code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}`}</code>
                        </pre>
                    </section>
                </div>
            </main>

        </div>
    );
};

export default Docs;
