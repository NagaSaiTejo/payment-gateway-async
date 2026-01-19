const paymentWorker = require('./PaymentWorker');
const webhookWorker = require('./WebhookWorker');
const refundWorker = require('./RefundWorker');

console.log('Worker service started and listening for jobs...');

// Keep process alive
process.on('SIGINT', async () => {
    console.log('Stopping workers...');
    await Promise.all([
        paymentWorker.close(),
        webhookWorker.close(),
        refundWorker.close()
    ]);
    process.exit(0);
});
