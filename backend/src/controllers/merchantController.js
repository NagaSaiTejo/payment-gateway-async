const db = require('../config/database');
const crypto = require('crypto');
const { queues } = require('../config/queues');

const getMerchantConfig = async (req, res) => {
    const merchantId = req.merchant.id;
    try {
        const result = await db.query(
            'SELECT id, name, email, webhook_url, webhook_secret, api_key FROM merchants WHERE id = $1',
            [merchantId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description: 'Merchant not found' } });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const updateWebhookConfig = async (req, res) => {
    const merchantId = req.merchant.id;
    const { webhook_url } = req.body;

    try {
        const result = await db.query(
            'UPDATE merchants SET webhook_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING webhook_url, webhook_secret',
            [webhook_url, merchantId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const regenerateWebhookSecret = async (req, res) => {
    const merchantId = req.merchant.id;
    const newSecret = 'whsec_' + crypto.randomBytes(16).toString('hex');

    try {
        const result = await db.query(
            'UPDATE merchants SET webhook_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING webhook_secret',
            [newSecret, merchantId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

const sendTestWebhook = async (req, res) => {
    const merchantId = req.merchant.id;

    try {
        const merchantRes = await db.query('SELECT webhook_url FROM merchants WHERE id = $1', [merchantId]);
        const webhook_url = merchantRes.rows[0].webhook_url;

        if (!webhook_url) {
            return res.status(400).json({ error: { code: 'BAD_REQUEST_ERROR', description: 'No webhook URL configured' } });
        }

        const payload = {
            event: 'webhook.test',
            created_at: new Date().toISOString(),
            data: {
                message: 'This is a test webhook from your payment gateway.',
                sample_id: 'test_' + crypto.randomBytes(4).toString('hex')
            }
        };

        await queues.webhook.add('deliver-webhook', {
            merchantId,
            event: 'webhook.test',
            payload
        });

        res.json({ status: 'success', message: 'Test webhook enqueued' });
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', description: 'Internal server error' } });
    }
};

module.exports = { getMerchantConfig, updateWebhookConfig, regenerateWebhookSecret, sendTestWebhook };

