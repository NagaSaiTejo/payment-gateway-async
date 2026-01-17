const crypto = require('crypto');
const axios = require('axios');
const db = require('../src/config/database');

async function deliverWebhookJob(jobData) {
    const { merchantId, event, data } = jobData;
    
    console.log(`📤 Delivering webhook: ${event} for merchant: ${merchantId}`);
    
    // Get merchant webhook config
    const merchantRes = await db.query(
        'SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1',
        [merchantId]
    );
    
    const merchant = merchantRes.rows[0];
    if (!merchant || !merchant.webhook_url) {
        console.log('⚠️ Skipping webhook: No URL configured');
        return { skipped: true, reason: 'No webhook URL' };
    }
    
    // Create payload
    const payload = {
        event,
        timestamp: Math.floor(Date.now() / 1000),
        data
    };
    
    const payloadString = JSON.stringify(payload);
    
    // Generate HMAC signature
    const signature = crypto
        .createHmac('sha256', merchant.webhook_secret || 'whsec_test_abc123')
        .update(payloadString)
        .digest('hex');
    
    // Log webhook attempt
    const logResult = await db.query(`
        INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts, last_attempt_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
    `, [merchantId, event, payload, 'pending', 1]);
    
    const webhookLogId = logResult.rows[0].id;
    
    try {
        // Send webhook
        const response = await axios.post(merchant.webhook_url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature
            },
            timeout: 5000
        });
        
        // Update log with success
        await db.query(`
            UPDATE webhook_logs 
            SET status = $1, 
                response_code = $2, 
                response_body = $3,
                last_attempt_at = NOW()
            WHERE id = $4
        `, ['success', response.status, JSON.stringify(response.data), webhookLogId]);
        
        console.log(`✅ Webhook delivered successfully: ${response.status}`);
        return { success: true, status: response.status };
        
    } catch (error) {
        // Update log with failure
        await db.query(`
            UPDATE webhook_logs 
            SET status = $1, 
                response_code = $2, 
                response_body = $3,
                attempts = attempts + 1,
                last_attempt_at = NOW()
            WHERE id = $4
        `, ['failed', error.response?.status || 500, error.message, webhookLogId]);
        
        console.error(`❌ Webhook delivery failed:`, error.message);
        throw error; // Will trigger retry
    }
}

module.exports = { deliverWebhookJob };