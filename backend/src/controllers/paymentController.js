const db = require('../config/database');
const { generateId } = require('../utils/helpers');
const { validateVPA, validateLuhn, getCardNetwork, validateExpiry } = require('../utils/validation');

// ADD THIS: Import Bull queue
const Queue = require('bull');
const paymentQueue = new Queue('payment-processing', process.env.REDIS_URL || 'redis://redis:6379');

const createPayment = async (req, res) => {
    const { order_id, method, vpa, card } = req.body;
    const merchantId = req.merchant.id;

    try {
        // 1. Verify Order
        const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' } });
        }
        const order = orderRes.rows[0];
        if (order.merchant_id !== merchantId) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' } });
        }

        // 2. Validate Method Specifics
        let cardNetwork = null;
        let cardLast4 = null;

        if (method === 'upi') {
            if (!vpa || !validateVPA(vpa)) {
                return res.status(400).json({ error: { code: 'INVALID_VPA', description: 'VPA format invalid' } });
            }
        } else if (method === 'card') {
            if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
                return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Missing card details' } });
            }
            if (!validateLuhn(card.number)) {
                return res.status(400).json({ error: { code: 'INVALID_CARD', description: 'Card validation failed' } });
            }
            if (!validateExpiry(card.expiry_month, card.expiry_year)) {
                return res.status(400).json({ error: { code: 'EXPIRED_CARD', description: 'Card expiry date invalid' } });
            }

            cardNetwork = getCardNetwork(card.number);
            cardLast4 = card.number.replace(/[\s-]/g, '').slice(-4);
        } else {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Invalid payment method' } });
        }

        // 3. Create Payment (PENDING - CHANGED FROM 'processing')
        const paymentId = generateId('pay_');
        const amount = order.amount;
        const currency = order.currency;

        await db.query(
            `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)`,
            [paymentId, order_id, merchantId, amount, currency, method, vpa, cardNetwork, cardLast4]
        );

        // 4. Add job to Bull queue (NEW - ASYNC PROCESSING)
        await paymentQueue.add({
            paymentId: paymentId,
            orderId: order_id,
            merchantId: merchantId,
            method: method,
            amount: amount,
            vpa: vpa,
            card: card
        });

        // 5. Return immediate response (CHANGED - Don't wait for processing)
        res.status(201).json({
            id: paymentId,
            order_id: order_id,
            amount: amount,
            currency: currency,
            method: method,
            vpa: vpa || null,
            status: 'pending',  // CHANGED: Was 'processing' from sync processing
            created_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('Create payment error:', err);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const getPayment = async (req, res) => {
    const { payment_id } = req.params;
    try {
        const result = await db.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Get payment error:', err);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

// Checkout Public Endpoints
const getOrderPublic = async (req, res) => {
    const { order_id } = req.params;
    try {
        const result = await db.query('SELECT id, amount, currency, status, merchant_id FROM orders WHERE id = $1', [order_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' } });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const getPayments = async (req, res) => {
    const merchantId = req.merchant.id;
    try {
        const result = await db.query('SELECT * FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantId]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const createPaymentPublic = async (req, res) => {
    const { order_id, method, vpa, card } = req.body;

    try {
        // 1. Verify Order Exists
        const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' } });
        }
        const order = orderRes.rows[0];
        const merchantId = order.merchant_id;

        // 2. Validate Method
        let cardNetwork = null;
        let cardLast4 = null;

        if (method === 'upi') {
            if (!vpa || !validateVPA(vpa)) return res.status(400).json({ error: { code: 'INVALID_VPA', description: 'VPA format invalid' } });
        } else if (method === 'card') {
            if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
                return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Missing card details' } });
            }
            if (!validateLuhn(card.number)) return res.status(400).json({ error: { code: 'INVALID_CARD', description: 'Card validation failed' } });
            if (!validateExpiry(card.expiry_month, card.expiry_year)) return res.status(400).json({ error: { code: 'EXPIRED_CARD', description: 'Card expiry date invalid' } });

            cardNetwork = getCardNetwork(card.number);
            cardLast4 = card.number.replace(/[\s-]/g, '').slice(-4);
        } else {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Invalid payment method' } });
        }

        // 3. Create Payment (PENDING - CHANGED FROM 'processing')
        const paymentId = generateId('pay_');
        await db.query(
            `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)`,
            [paymentId, order_id, merchantId, order.amount, order.currency, method, vpa, cardNetwork, cardLast4]
        );

        // 4. Add job to Bull queue (NEW - ASYNC PROCESSING)
        await paymentQueue.add({
            paymentId: paymentId,
            orderId: order_id,
            merchantId: merchantId,
            method: method,
            amount: order.amount,
            vpa: vpa,
            card: card
        });

        // 5. Return immediate response
        res.status(201).json({
            id: paymentId,
            order_id: order_id,
            amount: order.amount,
            currency: order.currency,
            method: method,
            vpa: vpa || null,
            status: 'pending',  // CHANGED: Was 'processing' from sync processing
            created_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('Create payment public error:', err);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const getPaymentPublic = async (req, res) => {
    const { payment_id } = req.params;
    try {
        const result = await db.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

module.exports = { createPayment, getPayment, getOrderPublic, getPayments, createPaymentPublic, getPaymentPublic };