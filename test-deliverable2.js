// test-deliverable2.js
const axios = require('axios');

async function testDeliverable2() {
  const headers = {
    'X-Api-Key': 'key_test_abc123',
    'X-Api-Secret': 'secret_test_xyz789'
  };

  console.log('🧪 Testing DELIVERABLE 2 Features...\n');

  // 1. Test Webhook System (New in Deliverable 2)
  console.log('1️⃣ Testing Webhook System...');
  try {
    const webhooks = await axios.get('http://localhost:8000/api/v1/webhooks', { headers });
    console.log('✅ Webhooks endpoint:', webhooks.data);
  } catch (error) {
    console.log('❌ Webhooks endpoint missing - but webhook_logs table exists');
  }

  // 2. Check if webhook_logs table has data (Deliverable 2)
  console.log('\n2️⃣ Checking webhook_logs table (Deliverable 2 feature)...');
  const exec = require('child_process').exec;
  exec('docker exec pg_gateway psql -U gateway_user -d payment_gateway -c "SELECT COUNT(*) FROM webhook_logs;"', 
    (error, stdout) => {
      console.log('📊 webhook_logs count:', stdout);
    });

  // 3. Check Redis Queue (Deliverable 2)
  console.log('\n3️⃣ Checking Redis Job Queue (Deliverable 2 feature)...');
  exec('docker exec redis_gateway redis-cli KEYS "bull:*"', (error, stdout) => {
    console.log('🎯 Active job queues:', stdout);
  });

  // 4. Create a payment to trigger webhook (Deliverable 2)
  console.log('\n4️⃣ Creating payment to test webhook delivery...');
  try {
    const payment = await axios.post('http://localhost:8000/api/v1/payments', {
      order_id: 'deliverable2_test_' + Date.now(),
      amount: 1000,
      currency: 'INR',
      method: 'upi',
      vpa: 'test@upi'
    }, { headers });
    console.log('✅ Payment created:', payment.data.id);
    console.log('📤 Webhook should be triggered (check worker logs)');
  } catch (error) {
    console.log('❌ Payment failed:', error.response?.data?.error || error.message);
  }
}

testDeliverable2();