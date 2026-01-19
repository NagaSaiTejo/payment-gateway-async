const { Worker } = require('bullmq');
const db = require('../config/database');
const { connection, queues } = require('../config/queues');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const refundWorker = new Worker('refund-queue', async (job) => {
    const { refundId } = job.data;
    console.log(`Processing refund: ${refundId}`);

    try {
        const refundRes = await db.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
        if (refundRes.rows.length === 0) throw new Error('Refund not found');
        const refund = refundRes.rows[0];

        // Verify total refunded amount
        const allRefundsRes = await db.query(
            'SELECT SUM(amount) as total FROM refunds WHERE payment_id = $1 AND status IN (\'processed\', \'pending\')',
            [refund.payment_id]
        );
        const currentTotal = parseInt(allRefundsRes.rows[0].total || 0);

        const paymentRes = await db.query('SELECT amount FROM payments WHERE id = $1', [refund.payment_id]);
        const paymentAmount = paymentRes.rows[0].amount;

        if (currentTotal > paymentAmount) {
            // This should have been caught in the API, but double check.
            console.error(`Refund ${refundId} exceeds available amount. Marking as failed.`);
            await db.query('UPDATE refunds SET status = \'failed\' WHERE id = $1', [refundId]);
            return;
        }

        // Simulating delay
        const delay = Math.floor(Math.random() * (5000 - 3000 + 1) + 3000); // 3-5s
        await sleep(delay);

        // Update refund status
        const updateRes = await db.query(
            `UPDATE refunds 
             SET status = 'processed', processed_at = CURRENT_TIMESTAMP 
             WHERE id = $1 
             RETURNING *`,
            [refundId]
        );
        const updatedRefund = updateRes.rows[0];

        // If full refund, update payment status (optional but good)
        if (currentTotal === paymentAmount) {
            await db.query('UPDATE payments SET status = \'refunded\' WHERE id = $1', [refund.payment_id]);
        }

        // Enqueue Webhook
        await queues.webhook.add('deliver-webhook', {
            merchantId: updatedRefund.merchant_id,
            event: 'refund.processed',
            payload: {
                event: 'refund.processed',
                timestamp: Math.floor(Date.now() / 1000),
                data: { refund: updatedRefund }
            }
        });

        console.log(`Refund ${refundId} processed successfully`);
    } catch (err) {
        console.error(`Error processing refund ${refundId}:`, err);
        throw err;
    }
}, { connection });

module.exports = refundWorker;
