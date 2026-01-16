const Queue = require('bull');
const { processPaymentJob } = require('./paymentWorker');

console.log('🚀 Starting payment gateway worker...');

// Create queues
const paymentQueue = new Queue('payment-processing', process.env.REDIS_URL || 'redis://redis:6379');

// Process payment jobs
paymentQueue.process(async (job) => {
    console.log(`🔧 Processing job ${job.id}: ${job.data.paymentId}`);
    try {
        await processPaymentJob(job.data);
        console.log(`✅ Job ${job.id} completed successfully`);
    } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);
        throw error;
    }
});

// Log when worker is ready
paymentQueue.on('completed', (job) => {
    console.log(`🎉 Job ${job.id} has been completed`);
});

paymentQueue.on('failed', (job, err) => {
    console.error(`💥 Job ${job.id} failed with error:`, err.message);
});

console.log('👂 Worker listening for payment jobs...');