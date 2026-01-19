import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const Checkout = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');

    const [order, setOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('upi');
    const [paymentState, setPaymentState] = useState('initial');
    const [paymentResult, setPaymentResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timer, setTimer] = useState(5);

    // Form states
    const [vpa, setVpa] = useState('');
    const [cardDetails, setCardDetails] = useState({
        number: '', expiry: '', cvv: '', name: ''
    });

    useEffect(() => {
        if (orderId) fetchOrder();
    }, [orderId]);

    useEffect(() => {
        if (paymentState === 'processing') {
            const interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [paymentState]);

    const fetchOrder = async () => {
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/orders/${orderId}/public`);
            setOrder(res.data);
        } catch (err) {
            setPaymentState('fatal_error');
        } finally {
            setLoading(false);
        }
    };

    const isEmbedded = searchParams.get('embedded') === 'true';

    const sendMessageToParent = (type, data) => {
        if (isEmbedded && window.parent) {
            window.parent.postMessage({ type, data }, '*');
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setPaymentState('processing');
        setTimer(5);

        try {
            let payload = {
                order_id: orderId,
                method: paymentMethod
            };

            if (paymentMethod === 'upi') {
                payload.vpa = vpa;
            } else {
                const [month, year] = cardDetails.expiry.split('/');
                payload.card = {
                    number: cardDetails.number,
                    expiry_month: month,
                    expiry_year: year,
                    cvv: cardDetails.cvv,
                    holder_name: cardDetails.name
                };
            }

            const res = await axios.post('http://localhost:8000/api/v1/payments/public', payload);
            const paymentId = res.data.id;
            pollStatus(paymentId);
        } catch (err) {
            setPaymentState('error');
            sendMessageToParent('payment_failed', { error: 'Request failed' });
        }
    };

    const pollStatus = async (paymentId) => {
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/payments/${paymentId}/public`);
                const status = res.data.status;

                if (status === 'success') {
                    clearInterval(interval);
                    setPaymentResult(res.data);
                    setPaymentState('success');
                    sendMessageToParent('payment_success', { paymentId });
                } else if (status === 'failed') {
                    clearInterval(interval);
                    setPaymentState('error');
                    sendMessageToParent('payment_failed', { paymentId, status: 'failed' });
                }
            } catch (err) {
                clearInterval(interval);
                setPaymentState('error');
                sendMessageToParent('payment_failed', { error: 'Polling failed' });
            }
        }, 2000);
    };

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return value;
        }
    };

    const formatExpiry = (value) => {
        const v = value.replace(/[^0-9]/g, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
        }
        return v;
    };

    // Views
    if (!orderId) {
        return (
            <div className="checkout-container">
                <div className="checkout-card error-state">
                    <div className="error-icon">⚠️</div>
                    <h3>Invalid Request</h3>
                    <p className="text-muted">Missing Order ID in URL.</p>
                    <p className="text-muted-small">Use <code>?order_id=order_xxxx</code> parameter</p>
                </div>
            </div>
        );
    }

    if (paymentState === 'fatal_error') {
        return (
            <div className="checkout-container">
                <div className="checkout-card error-state">
                    <div className="error-icon">❌</div>
                    <h3>Order Not Found</h3>
                    <p className="text-muted">The order ID provided is invalid or expired.</p>
                    <button
                        className="btn-secondary"
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (paymentState === 'processing') {
        return (
            <div className="checkout-container" data-test-id="checkout-container">
                <div className="checkout-card processing-state" data-test-id="processing-state">
                    <div className="processing-animation">
                        <div className="spinner-large"></div>
                        <div className="pulse-ring"></div>
                    </div>
                    <h3 data-test-id="processing-message">Processing Payment</h3>
                    <p className="text-muted">Please wait while we process your payment</p>
                    <div className="timer-display">
                        <div className="timer-circle">
                            <span>{timer}s</span>
                        </div>
                        <p className="timer-label">Estimated time remaining</p>
                    </div>
                </div>
            </div>
        );
    }

    if (paymentState === 'success' && paymentResult) {
        return (
            <div className="checkout-container" data-test-id="checkout-container">
                <div className="checkout-card success-state" data-test-id="success-state">
                    <div className="success-animation">
                        <div className="checkmark">✓</div>
                        <div className="confetti"></div>
                    </div>
                    <h2 className="success-title">Payment Successful!</h2>
                    <div className="amount-display-large">
                        ₹{(paymentResult.amount / 100).toLocaleString()}
                    </div>
                    <p className="text-muted" data-test-id="success-message">
                        Your payment was processed successfully
                    </p>

                    <div className="transaction-details">
                        <div className="detail-row">
                            <span className="detail-label">Transaction ID</span>
                            <code className="detail-value" data-test-id="payment-id">
                                {paymentResult.id}
                            </code>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Order ID</span>
                            <span className="detail-value">{paymentResult.order_id}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Payment Method</span>
                            <span className="detail-value">{paymentResult.method.toUpperCase()}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Date & Time</span>
                            <span className="detail-value">
                                {new Date(paymentResult.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button className="btn-primary" onClick={() => window.print()}>
                            <span>🖨️</span> Print Receipt
                        </button>
                        <button className="btn-secondary" onClick={() => {
                            sendMessageToParent('close_modal');
                            window.close();
                        }}>
                            <span>←</span> Close Window
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (paymentState === 'error') {
        return (
            <div className="checkout-container" data-test-id="checkout-container">
                <div className="checkout-card error-state" data-test-id="error-state">
                    <div className="error-animation">
                        <div className="error-icon-large">⚠️</div>
                    </div>
                    <h2>Payment Failed</h2>
                    <p className="text-muted" data-test-id="error-message">
                        We couldn't process your payment. Please try again.
                    </p>

                    <div className="troubleshoot-tips">
                        <h4>📝 Troubleshooting Tips:</h4>
                        <ul>
                            <li>Check your internet connection</li>
                            <li>Verify your payment details</li>
                            <li>Ensure sufficient balance</li>
                            <li>Contact your bank if issue persists</li>
                        </ul>
                    </div>

                    <button
                        className="btn-primary"
                        data-test-id="retry-button"
                        onClick={() => setPaymentState('initial')}
                    >
                        <span>🔄</span> Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="checkout-container">
                <div className="checkout-card loading-state">
                    <div className="loading-spinner"></div>
                    <h3>Loading Order Details</h3>
                    <p className="text-muted">Please wait...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-container" data-test-id="checkout-container">
            <div className="checkout-card">
                {/* Header */}
                <div className="checkout-header">
                    <div className="header-logo">
                        <div className="logo-icon">PG</div>
                        <span className="logo-text">Payment Gateway</span>
                    </div>
                    <div className="security-badge">
                        <span className="lock-small">🔒</span>
                        Secure Payment
                    </div>
                </div>

                {/* Order Summary */}
                <div className="order-summary" data-test-id="order-summary">
                    <div className="summary-header">
                        <h3>Order Summary</h3>
                        <span className="order-status">Payment Pending</span>
                    </div>

                    <div className="summary-details">
                        <div className="amount-display-main">
                            <span className="currency">₹</span>
                            <span className="amount" data-test-id="order-amount">
                                {(order.amount / 100).toLocaleString()}
                            </span>
                        </div>

                        <div className="detail-items">
                            <div className="detail-item">
                                <span className="item-label">Order ID</span>
                                <code className="item-value" data-test-id="order-id">
                                    {order.id}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="payment-methods" data-test-id="payment-methods">
                    <div className="methods-header">
                        <h3>Select Payment Method</h3>
                    </div>

                    <div className="method-cards">
                        <div
                            className={`method-card ${paymentMethod === 'upi' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('upi')}
                            data-test-id="method-upi"
                        >
                            <div className="method-icon upi-icon">
                                <span>📱</span>
                            </div>
                            <div className="method-info">
                                <h4>UPI Payment</h4>
                                <p className="text-muted">Instant payment using UPI ID</p>
                            </div>
                            <div className="method-radio">
                                <div className={`radio-dot ${paymentMethod === 'upi' ? 'active' : ''}`}></div>
                            </div>
                        </div>

                        <div
                            className={`method-card ${paymentMethod === 'card' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('card')}
                            data-test-id="method-card"
                        >
                            <div className="method-icon card-icon">
                                <span>💳</span>
                            </div> <br />
                            <div className="method-info">
                                <h4>Credit/Debit Card</h4>
                                <p className="text-muted">Visa, Mastercard, RuPay</p>
                            </div>
                            <div className="method-radio">
                                <div className={`radio-dot ${paymentMethod === 'card' ? 'active' : ''}`}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Form */}
                <div className="payment-form">
                    {paymentMethod === 'upi' && (
                        <form onSubmit={handlePayment} data-test-id="upi-form">
                            <div className="form-section">
                                <h4>Enter UPI Details</h4>
                                <div className="input-group">
                                    <label className="input-label">UPI ID</label>
                                    <div className="input-wrapper">
                                        <span className="input-prefix">@</span>
                                        <input
                                            className="input-field"
                                            data-test-id="vpa-input"
                                            type="text"
                                            placeholder="username@bank"
                                            value={vpa}
                                            onChange={e => setVpa(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="input-hint">Enter your UPI ID (e.g., username@bank)</p>
                                </div>
                            </div>

                            <button className="btn-pay" data-test-id="pay-button" type="submit">
                                <span>💳</span>
                                Pay ₹{(order.amount / 100).toLocaleString()}
                            </button>
                        </form>
                    )}

                    {paymentMethod === 'card' && (
                        <form onSubmit={handlePayment} data-test-id="card-form">
                            <div className="form-section">
                                <h4>Enter Card Details</h4>

                                <div className="input-group">
                                    <label className="input-label">Card Number</label>
                                    <div className="input-wrapper">
                                        <span className="card-icon">💳</span>
                                        <input
                                            className="input-field"
                                            data-test-id="card-number-input"
                                            type="text"
                                            placeholder="1234 5678 9012 3456"
                                            value={formatCardNumber(cardDetails.number)}
                                            onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                                            maxLength={19}
                                            required
                                        />
                                        <span className="card-type"></span>
                                    </div>
                                </div>

                                <div className="row-inputs">
                                    <div className="input-group">
                                        <label className="input-label">Expiry Date</label>
                                        <input
                                            className="input-field"
                                            data-test-id="expiry-input"
                                            type="text"
                                            placeholder="MM/YY"
                                            value={formatExpiry(cardDetails.expiry)}
                                            onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                            maxLength={5}
                                            required
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">CVV</label>
                                        <div className="input-wrapper">
                                            <input
                                                className="input-field"
                                                data-test-id="cvv-input"
                                                type="password"
                                                placeholder="123"
                                                value={cardDetails.cvv}
                                                onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                                maxLength={4}
                                                required
                                            />
                                            <span className="cvv-hint">?</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Cardholder Name</label>
                                    <input
                                        className="input-field"
                                        data-test-id="cardholder-name-input"
                                        type="text"
                                        placeholder="John Doe"
                                        value={cardDetails.name}
                                        onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>


                            <button className="btn-pay" data-test-id="pay-button" type="submit">
                                <span>💳</span>
                                Pay ₹{(order.amount / 100).toLocaleString()}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Checkout;