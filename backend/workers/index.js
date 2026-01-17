const Queue = require('bull');
const { processPaymentJob } = require('./paymentWorker');
const { deliverWebhookJob } = require('./webhookWorker');
const { processRefundJob } = require('./refundWorker');

console.log('🚀 Starting payment gateway worker...');

// Create queues
const paymentQueue = new Queue('payment-processing', process.env.REDIS_URL || 'redis://redis:6379');
const webhookQueue = new Queue('webhook-delivery', process.env.REDIS_URL || 'redis://redis:6379');
const refundQueue = new Queue('refund-processing', process.env.REDIS_URL || 'redis://redis:6379');

// Process payment jobs
paymentQueue.process(async (job) => {
    console.log(`🔧 Processing payment job ${job.id}: ${job.data.paymentId}`);
    try {
        await processPaymentJob(job.data);
        console.log(`✅ Payment job ${job.id} completed successfully`);
    } catch (error) {
        console.error(`❌ Payment job ${job.id} failed:`, error);
        throw error;
    }
});

// Process webhook jobs with retry logic
webhookQueue.process(async (job) => {
    console.log(`🔧 Processing webhook job ${job.id}: ${job.data.event}`);
    try {
        await deliverWebhookJob(job.data);
        console.log(`✅ Webhook job ${job.id} completed successfully`);
    } catch (error) {
        console.error(`❌ Webhook job ${job.id} failed:`, error);
        
        // Calculate exponential backoff for retries
        const attemptsMade = job.attemptsMade;
        const retryDelays = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true' 
            ? [0, 5000, 10000, 15000, 20000] // Test mode: seconds
            : [0, 60000, 300000, 1800000, 7200000]; // Production: 1min, 5min, 30min, 2hr
        
        if (attemptsMade < retryDelays.length) {
            const delay = retryDelays[attemptsMade];
            console.log(`⏳ Scheduling retry ${attemptsMade + 1} in ${delay}ms`);
            throw new Queue.DelayedError(delay);
        } else {
            console.log(`❌ Max retries exceeded for webhook ${job.data.event}`);
        }
    }
});

// Process refund jobs
refundQueue.process(async (job) => {
    console.log(`🔧 Processing refund job ${job.id}: ${job.data.refundId}`);
    try {
        await processRefundJob(job.data);
        console.log(`✅ Refund job ${job.id} completed successfully`);
    } catch (error) {
        console.error(`❌ Refund job ${job.id} failed:`, error);
        throw error;
    }
});

// Log when workers are ready
paymentQueue.on('completed', (job) => {
    console.log(`🎉 Payment job ${job.id} has been completed`);
});

paymentQueue.on('failed', (job, err) => {
    console.error(`💥 Payment job ${job.id} failed with error:`, err.message);
});

webhookQueue.on('completed', (job) => {
    console.log(`🎉 Webhook job ${job.id} delivered successfully`);
});

refundQueue.on('completed', (job) => {
    console.log(`🎉 Refund job ${job.id} processed successfully`);
});

console.log('👂 Worker listening for payment jobs...');
console.log('👂 Worker listening for webhook jobs...');
console.log('👂 Worker listening for refund jobs...');

// Keep process alive
setInterval(() => {
    // Heartbeat
}, 60000);