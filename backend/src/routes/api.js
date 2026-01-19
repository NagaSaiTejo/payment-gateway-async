const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

const authenticateHost = require('../middleware/auth');
const orderController = require('../controllers/orderController');
const merchantController = require('../controllers/merchantController');

// Public routes
router.get('/health', healthController.getHealth);

// Merchant Config Routes
router.get('/merchant/config', authenticateHost, merchantController.getMerchantConfig);
router.patch('/merchant/webhook', authenticateHost, merchantController.updateWebhookConfig);
router.post('/merchant/webhook/regenerate', authenticateHost, merchantController.regenerateWebhookSecret);
router.post('/merchant/webhook/test', authenticateHost, merchantController.sendTestWebhook);


router.get('/test/merchant', async (req, res) => {

    // Implement test merchant endpoint inline for now or move to controller later as urged by task list
    try {
        const db = require('../config/database');
        const result = await db.query("SELECT id, email, api_key FROM merchants WHERE email = 'test@example.com'");
        if (result.rows.length > 0) {
            res.json({ ...result.rows[0], seeded: true });
        } else {
            res.status(404).json({ error: 'Test merchant not found' });
        }
    } catch (e) { res.status(500).json({ error: e.message }) }
});

const paymentController = require('../controllers/paymentController');

// Protected routes
router.post('/orders', authenticateHost, orderController.createOrder);
router.get('/orders/:order_id', authenticateHost, orderController.getOrder);

router.post('/payments', authenticateHost, paymentController.createPayment);
router.get('/payments', authenticateHost, paymentController.getPayments);
router.get('/payments/:payment_id', authenticateHost, paymentController.getPayment);
router.post('/payments/:payment_id/capture', authenticateHost, paymentController.capturePayment);

router.post('/payments/:payment_id/refunds', authenticateHost, paymentController.createRefund);
router.get('/refunds/:refund_id', authenticateHost, paymentController.getRefund);

router.get('/webhooks', authenticateHost, paymentController.listWebhookLogs);
router.post('/webhooks/:webhook_id/retry', authenticateHost, paymentController.retryWebhook);

// Test routes (Evaluation)
router.get('/test/jobs/status', paymentController.getJobQueueStatus);

// Public Checkout Routes
router.get('/orders/:order_id/public', paymentController.getOrderPublic);
router.post('/payments/public', paymentController.createPaymentPublic);
router.get('/payments/:payment_id/public', paymentController.getPaymentPublic);

// Webhook Debugging
router.post('/debug/webhook-receiver', paymentController.handleDebugWebhook);

module.exports = router;

