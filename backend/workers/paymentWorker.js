const db = require('../src/config/database');
const Queue = require('bull');

const webhookQueue = new Queue('webhook-delivery', process.env.REDIS_URL || 'redis://redis:6379');

async function processPaymentJob(jobData) {
    const { paymentId } = jobData;
    
    console.log(`🔄 Processing payment ${paymentId}`);
    
    // 1. Fetch payment from database
    const paymentRes = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    if (paymentRes.rows.length === 0) {
        throw new Error(`Payment ${paymentId} not found`);
    }
    
    const payment = paymentRes.rows[0];
    
    // 2. Simulate processing delay
    const isTestMode = process.env.TEST_MODE === 'true';
    let delay = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000); // 5-10 seconds
    
    if (isTestMode) {
        delay = parseInt(process.env.TEST_PROCESSING_DELAY) || 1000;
    }
    
    console.log(`⏳ Simulating ${delay}ms processing delay for payment ${paymentId}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 3. Determine success/failure
    let isSuccess = false;
    
    if (isTestMode) {
        isSuccess = process.env.TEST_PAYMENT_SUCCESS !== 'false';
    } else {
        const rand = Math.random();
        if (payment.method === 'upi') {
            isSuccess = rand < 0.90; // 90% success for UPI
        } else {
            isSuccess = rand < 0.95; // 95% success for card
        }
    }
    
    // 4. Update payment status
    const finalStatus = isSuccess ? 'success' : 'failed';
    let errorCode = null;
    let errorDesc = null;
    
    if (!isSuccess) {
        errorCode = 'PAYMENT_FAILED';
        errorDesc = 'Payment processing failed';
    }
    
    const updateQuery = `
        UPDATE payments 
        SET status = $1, 
            error_code = $2, 
            error_description = $3, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 
        RETURNING *
    `;
    
    const updateRes = await db.query(updateQuery, [finalStatus, errorCode, errorDesc, paymentId]);
    const updatedPayment = updateRes.rows[0];
    
    // 5. Enqueue webhook job
    const event = isSuccess ? 'payment.success' : 'payment.failed';
    await webhookQueue.add({
        merchantId: payment.merchant_id,
        event,
        data: {
            payment: {
                id: updatedPayment.id,
                order_id: updatedPayment.order_id,
                amount: updatedPayment.amount,
                currency: updatedPayment.currency,
                method: updatedPayment.method,
                status: updatedPayment.status,
                created_at: updatedPayment.created_at
            }
        }
    });
    
    // 6. Log result
    if (isSuccess) {
        console.log(`✅ Payment ${paymentId} succeeded`);
    } else {
        console.log(`❌ Payment ${paymentId} failed`);
    }
    
    return updatedPayment;
}

module.exports = { processPaymentJob };