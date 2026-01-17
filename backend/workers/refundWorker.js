const db = require('../src/config/database');
const Queue = require('bull');

const webhookQueue = new Queue('webhook-delivery', process.env.REDIS_URL || 'redis://redis:6379');

async function processRefundJob(jobData) {
    const { refundId } = jobData;
    
    console.log(`🔄 Processing refund ${refundId}`);
    
    // 1. Fetch refund from database
    const refundRes = await db.query(
        'SELECT * FROM refunds WHERE id = $1',
        [refundId]
    );
    
    if (refundRes.rows.length === 0) {
        throw new Error(`Refund ${refundId} not found`);
    }
    
    const refund = refundRes.rows[0];
    
    // 2. Check if payment is refundable
    const paymentRes = await db.query(
        'SELECT amount, status FROM payments WHERE id = $1',
        [refund.payment_id]
    );
    
    if (paymentRes.rows.length === 0) {
        throw new Error(`Payment ${refund.payment_id} not found`);
    }
    
    const payment = paymentRes.rows[0];
    
    if (payment.status !== 'success') {
        throw new Error(`Payment ${refund.payment_id} is not in success state`);
    }
    
    // 3. Check total already refunded
    const totalRefundedRes = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM refunds WHERE payment_id = $1 AND status = $2',
        [refund.payment_id, 'processed']
    );
    
    const totalRefunded = parseInt(totalRefundedRes.rows[0].total);
    const available = payment.amount - totalRefunded;
    
    if (refund.amount > available) {
        throw new Error(`Refund amount ${refund.amount} exceeds available ${available}`);
    }
    
    // 4. Simulate processing delay
    const delay = Math.floor(Math.random() * 2000) + 3000; // 3-5 seconds
    console.log(`⏳ Simulating ${delay}ms processing delay for refund ${refundId}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 5. Update refund status
    await db.query(`
        UPDATE refunds 
        SET status = $1, 
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
    `, ['processed', refundId]);
    
    // 6. Enqueue webhook
    await webhookQueue.add({
        merchantId: refund.merchant_id,
        event: 'refund.processed',
        data: {
            refund: {
                id: refund.id,
                payment_id: refund.payment_id,
                amount: refund.amount,
                reason: refund.reason,
                status: 'processed'
            }
        }
    });
    
    console.log(`✅ Refund ${refundId} processed successfully`);
    
    return { success: true, refundId };
}

module.exports = { processRefundJob };