const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

const queues = {
    payment: new Queue('payment-queue', { connection }),
    webhook: new Queue('webhook-queue', { connection }),
    refund: new Queue('refund-queue', { connection }),
};

module.exports = { queues, connection };
