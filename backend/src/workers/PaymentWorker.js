const { Worker } = require('bullmq');
const db = require('../config/database');
const { connection, queues } = require('../config/queues');
const dotenv = require('dotenv');

dotenv.config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const paymentWorker = new Worker('payment-queue', async (job) => {
    const { paymentId } = job.data;
    console.log(`Processing payment: ${paymentId}`);

    try {
        const paymentRes = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
        if (paymentRes.rows.length === 0) throw new Error('Payment not found');

        const payment = paymentRes.rows[0];

        // Simulating delay
        const isTestMode = process.env.TEST_MODE === 'true';
        let delay = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000); // 5-10s
        let isSuccess = false;

        if (isTestMode) {
            delay = parseInt(process.env.TEST_PROCESSING_DELAY) || 1000;
            isSuccess = process.env.TEST_PAYMENT_SUCCESS !== 'false';
        } else {
            const rand = Math.random();
            if (payment.method === 'upi') {
                isSuccess = rand < 0.90;
            } else {
                isSuccess = rand < 0.95;
            }
        }

        await sleep(delay);

        const finalStatus = isSuccess ? 'success' : 'failed';
        let errorCode = null;
        let errorDesc = null;

        if (!isSuccess) {
            errorCode = 'PAYMENT_FAILED';
            errorDesc = 'Payment processing failed';
        }

        const updateRes = await db.query(
            `UPDATE payments 
             SET status = $1, error_code = $2, error_description = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 
             RETURNING *`,
            [finalStatus, errorCode, errorDesc, paymentId]
        );

        const updatedPayment = updateRes.rows[0];

        // Enqueue Webhook
        await queues.webhook.add('deliver-webhook', {
            merchantId: updatedPayment.merchant_id,
            event: isSuccess ? 'payment.success' : 'payment.failed',
            payload: {
                event: isSuccess ? 'payment.success' : 'payment.failed',
                timestamp: Math.floor(Date.now() / 1000),
                data: { payment: updatedPayment }
            }
        });

        console.log(`Payment ${paymentId} processed as ${finalStatus}`);
    } catch (err) {
        console.error(`Error processing payment ${paymentId}:`, err);
        throw err;
    }
}, { connection });

module.exports = paymentWorker;
