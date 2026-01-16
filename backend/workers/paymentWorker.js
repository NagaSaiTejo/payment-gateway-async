const db = require('../config/database');

// Helper function to simulate delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processPaymentJob(jobData) {
    const { paymentId, orderId, merchantId, method, amount, vpa, card } = jobData;
    
    console.log(`🔄 Processing payment ${paymentId} (${method})`);
    
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
    await sleep(delay);
    
    // 3. Determine success/failure
    let isSuccess = false;
    
    if (isTestMode) {
        isSuccess = process.env.TEST_PAYMENT_SUCCESS !== 'false';
    } else {
        const rand = Math.random();
        if (method === 'upi') {
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
    
    // 5. Log result
    if (isSuccess) {
        console.log(`✅ Payment ${paymentId} succeeded`);
    } else {
        console.log(`❌ Payment ${paymentId} failed`);
    }
    
    // TODO: In STEP 5, we'll add webhook triggering here
    
    return updatedPayment;
}

module.exports = { processPaymentJob };