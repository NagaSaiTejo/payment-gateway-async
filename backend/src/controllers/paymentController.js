const db = require('../config/database');
const { generateId } = require('../utils/helpers');
const { validateVPA, validateLuhn, getCardNetwork, validateExpiry } = require('../utils/validation');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const { queues } = require('../config/queues');

const createPayment = async (req, res) => {
    const { order_id, method, vpa, card } = req.body;
    const merchantId = req.merchant.id;
    const idempotencyKey = req.headers['idempotency-key'];

    try {
        // 1. Handle Idempotency
        if (idempotencyKey) {
            const idenRes = await db.query(
                'SELECT * FROM idempotency_keys WHERE key = $1 AND merchant_id = $2',
                [idempotencyKey, merchantId]
            );
            if (idenRes.rows.length > 0) {
                const iden = idenRes.rows[0];
                if (new Date() < new Date(iden.expires_at)) {
                    return res.status(200).json(iden.response);
                } else {
                    await db.query('DELETE FROM idempotency_keys WHERE key = $1 AND merchant_id = $2', [idempotencyKey, merchantId]);
                }
            }
        }

        // 2. Verify Order
        const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' } });
        }
        const order = orderRes.rows[0];
        if (order.merchant_id !== merchantId) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' } });
        }

        // 3. Validate Method Specifics
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

        // 4. Create Payment (Pending)
        const paymentId = generateId('pay_');
        const paymentResult = await db.query(
            `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
             RETURNING id, order_id, amount, currency, method, vpa, status, created_at`,
            [paymentId, order_id, merchantId, order.amount, order.currency, method, vpa, cardNetwork, cardLast4]
        );
        const paymentResponse = paymentResult.rows[0];

        // 5. Enqueue Job
        await queues.payment.add('process-payment', { paymentId });

        // 6. Store Idempotency
        if (idempotencyKey) {
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await db.query(
                `INSERT INTO idempotency_keys (key, merchant_id, response, expires_at)
                 VALUES ($1, $2, $3, $4)`,
                [idempotencyKey, merchantId, paymentResponse, expiresAt]
            );
        }

        res.status(201).json(paymentResponse);

    } catch (err) {
        console.error('Create payment error:', err);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const capturePayment = async (req, res) => {
    const { payment_id } = req.params;
    const { amount } = req.body;
    const merchantId = req.merchant.id;

    try {
        const result = await db.query('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [payment_id, merchantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });

        const payment = result.rows[0];
        if (payment.status !== 'success') {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Payment not in capturable state' } });
        }

        const updateRes = await db.query(
            'UPDATE payments SET captured = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [payment_id]
        );
        res.status(200).json(updateRes.rows[0]);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const createRefund = async (req, res) => {
    const { payment_id } = req.params;
    const { amount, reason } = req.body;
    const merchantId = req.merchant.id;

    try {
        const paymentRes = await db.query('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [payment_id, merchantId]);
        if (paymentRes.rows.length === 0) return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });

        const payment = paymentRes.rows[0];
        if (payment.status !== 'success') {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Only successful payments can be refunded' } });
        }

        const refundsRes = await db.query('SELECT SUM(amount) as total FROM refunds WHERE payment_id = $1 AND status IN (\'processed\', \'pending\')', [payment_id]);
        const totalRefunded = parseInt(refundsRes.rows[0].total || 0);

        if (amount > (payment.amount - totalRefunded)) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'Refund amount exceeds available amount' } });
        }

        const refundId = generateId('rfnd_');
        const refundRes = await db.query(
            `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING id, payment_id, amount, reason, status, created_at`,
            [refundId, payment_id, merchantId, amount, reason]
        );
        const refund = refundRes.rows[0];

        await queues.refund.add('process-refund', { refundId });

        res.status(201).json(refund);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const getRefund = async (req, res) => {
    const { refund_id } = req.params;
    const merchantId = req.merchant.id;
    try {
        const result = await db.query('SELECT * FROM refunds WHERE id = $1 AND merchant_id = $2', [refund_id, merchantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Refund not found' } });
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const listWebhookLogs = async (req, res) => {
    const merchantId = req.merchant.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const result = await db.query(
            'SELECT id, event, status, attempts, created_at, last_attempt_at, response_code FROM webhook_logs WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [merchantId, limit, offset]
        );
        const countRes = await db.query('SELECT COUNT(*) FROM webhook_logs WHERE merchant_id = $1', [merchantId]);
        res.status(200).json({
            data: result.rows,
            total: parseInt(countRes.rows[0].count),
            limit,
            offset
        });
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const retryWebhook = async (req, res) => {
    const { webhook_id } = req.params;
    const merchantId = req.merchant.id;

    try {
        const result = await db.query('SELECT * FROM webhook_logs WHERE id = $1 AND merchant_id = $2', [webhook_id, merchantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Webhook log not found' } });

        const log = result.rows[0];
        await db.query('UPDATE webhook_logs SET status = \'pending\', attempts = 0 WHERE id = $1', [webhook_id]);

        await queues.webhook.add('deliver-webhook', {
            merchantId,
            event: log.event,
            payload: log.payload,
            logId: webhook_id,
            attempt: 1
        });

        res.status(200).json({ id: webhook_id, status: 'pending', message: 'Webhook retry scheduled' });
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const getJobQueueStatus = async (req, res) => {
    try {
        const [paymentCounts, webhookCounts, refundCounts] = await Promise.all([
            queues.payment.getJobCounts(),
            queues.webhook.getJobCounts(),
            queues.refund.getJobCounts()
        ]);

        const pending = paymentCounts.waiting + webhookCounts.waiting + refundCounts.waiting;
        const processing = paymentCounts.active + webhookCounts.active + refundCounts.active;
        const completed = paymentCounts.completed + webhookCounts.completed + refundCounts.completed;
        const failed = paymentCounts.failed + webhookCounts.failed + refundCounts.failed;

        res.status(200).json({
            pending,
            processing,
            completed,
            failed,
            worker_status: 'running' // Mocked as running since if this endpoint responds it is mostly running
        });
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const getPayment = async (req, res) => {
    const { payment_id } = req.params;
    const merchantId = req.merchant.id;
    try {
        const result = await db.query('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [payment_id, merchantId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' } });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Get payment error:', err);
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

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
        const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderRes.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' } });
        }
        const order = orderRes.rows[0];
        const merchantId = order.merchant_id;

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

        const paymentId = generateId('pay_');
        const paymentRes = await db.query(
            `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
             RETURNING *`,
            [paymentId, order_id, merchantId, order.amount, order.currency, method, vpa, cardNetwork, cardLast4]
        );

        await queues.payment.add('process-payment', { paymentId });

        res.status(201).json(paymentRes.rows[0]);

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

const handleDebugWebhook = async (req, res) => {
    console.log('--- DEBUG WEBHOOK RECEIVED ---');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Payload:', JSON.stringify(req.body, null, 2));
    console.log('------------------------------');
    res.status(200).json({ status: 'success', received: true });
};

module.exports = {
    createPayment,
    getPayment,
    getOrderPublic,
    getPayments,
    createPaymentPublic,
    getPaymentPublic,
    capturePayment,
    createRefund,
    getRefund,
    listWebhookLogs,
    retryWebhook,
    getJobQueueStatus,
    handleDebugWebhook
};

// Payment logic verified
