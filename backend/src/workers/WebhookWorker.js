const { Worker } = require('bullmq');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/database');
const { connection, queues } = require('../config/queues');

const WEBHOOK_RETRY_SCHEDULE = [0, 60, 300, 1800, 7200]; // seconds
const TEST_RETRY_SCHEDULE = [0, 5, 10, 15, 20];

const generateSignature = (payload, secret) => {
    const jsonPayload = JSON.stringify(payload);
    return crypto
        .createHmac('sha256', secret)
        .update(jsonPayload)
        .digest('hex');
};

const webhookWorker = new Worker('webhook-queue', async (job) => {
    const { merchantId, event, payload, attempt = 1, logId } = job.data;
    console.log(`Delivering webhook ${event} for merchant ${merchantId}, attempt ${attempt}`);

    try {
        const merchantRes = await db.query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchantId]);
        if (merchantRes.rows.length === 0) return;

        const { webhook_url, webhook_secret } = merchantRes.rows[0];
        if (!webhook_url) return;

        // 1. Log attempt if it's the first time
        let currentLogId = logId;
        if (!currentLogId) {
            const logRes = await db.query(
                `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts)
                 VALUES ($1, $2, $3, 'pending', 0)
                 RETURNING id`,
                [merchantId, event, payload]
            );
            currentLogId = logRes.rows[0].id;
        }

        const signature = generateSignature(payload, webhook_secret || '');

        let responseCode = null;
        let responseBody = null;
        let status = 'failed';

        try {
            const response = await axios.post(webhook_url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature
                },
                timeout: 5000
            });
            responseCode = response.status;
            responseBody = JSON.stringify(response.data).substring(0, 1000);
            status = (responseCode >= 200 && responseCode < 300) ? 'success' : 'failed';
        } catch (err) {
            responseCode = err.response ? err.response.status : null;
            responseBody = err.response ? JSON.stringify(err.response.data).substring(0, 1000) : err.message;
        }


        // Update Log
        await db.query(
            `UPDATE webhook_logs 
             SET status = $1, attempts = attempts + 1, last_attempt_at = CURRENT_TIMESTAMP, 
                 response_code = $2, response_body = $3
             WHERE id = $4`,
            [status, responseCode, responseBody, currentLogId]
        );

        if (status === 'failed' && attempt < 5) {
            const isTest = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';
            const schedule = isTest ? TEST_RETRY_SCHEDULE : WEBHOOK_RETRY_SCHEDULE;
            const delayInSeconds = schedule[attempt]; // attempt is 1-indexed, next delay is index 1 for attempt 2

            const nextRetryAt = new Date(Date.now() + delayInSeconds * 1000);

            await db.query(
                `UPDATE webhook_logs SET next_retry_at = $1 WHERE id = $2`,
                [nextRetryAt, currentLogId]
            );

            // Re-enqueue with delay
            await queues.webhook.add('deliver-webhook', {
                merchantId, event, payload, attempt: attempt + 1, logId: currentLogId
            }, { delay: delayInSeconds * 1000 });

            console.log(`Webhook failed, scheduled retry ${attempt + 1} in ${delayInSeconds}s`);
        } else if (status === 'failed') {
            console.log(`Webhook failed permanently after 5 attempts`);
        } else {
            console.log(`Webhook delivered successfully`);
        }

    } catch (err) {
        console.error(`Error delivering webhook:`, err);
        throw err;
    }
}, { connection });

module.exports = webhookWorker;
