# Payment Gateway – Production-Ready System with Async Processing & Webhooks
🚀 Overview
This is a production-ready payment gateway system implementing real-world patterns used by Stripe, Razorpay, and PayPal. Built on top of the core payment processing system, it adds asynchronous job processing, webhook delivery, embeddable SDK, refund management, and idempotency support.

The system now handles real production workloads with background job processing, event-driven webhooks, cross-origin SDK integration, and advanced retry mechanisms.

📋 What This Project Includes
Enhanced Architecture
Redis-based Job Queues: Background processing of payments, refunds, and webhooks

Worker Services: Dedicated containers for async job processing

Event-Driven Webhooks: Secure event delivery with HMAC signatures

Embeddable SDK: JavaScript widget for in-context payments without redirects

Idempotent APIs: Prevent duplicate charges with idempotency keys

Enhanced Dashboard: Webhook configuration, logs, and integration docs

Merchant System
A pre-seeded test merchant is created on startup:

text
Email: test@example.com
API Key: key_test_abc123
API Secret: secret_test_xyz789
Webhook Secret: whsec_test_abc123
Merchants can now:

Configure webhook endpoints and secrets

View webhook delivery logs

Manually retry failed webhooks

Generate SDK integration code

Process refunds (full & partial)

Orders & Payments API
New Async Payment Flow:

Payment created with status: 'pending' (immediate response)

ProcessPaymentJob enqueued for background processing

Worker processes payment (5-10s simulation)

Webhook delivered to merchant endpoint

Payment status updated to success/failed

Idempotency Support:

bash
# Include idempotency key to prevent duplicates
Idempotency-Key: unique_request_123
Refund Management
Full and partial refunds

Asynchronous processing via ProcessRefundJob

Amount validation (cannot exceed payment amount)

Webhook events for refund status

Webhook System
Events Emitted:

payment.created, payment.pending, payment.success, payment.failed

refund.created, refund.processed

Secure Delivery:

HMAC-SHA256 signature verification

Automatic retry logic (5 attempts with exponential backoff)

Delivery logs with response tracking

Embeddable JavaScript SDK
Merchants can embed payments directly on their websites:

html
<script src="http://localhost:3001/checkout.js"></script>
<button onclick="checkout.open()">Pay Now</button>
Features:

Modal/iframe checkout (no redirects)

PostMessage communication

Success/failure callbacks

Mobile-responsive design

Enhanced Dashboard
New Pages:

Webhook Configuration (/dashboard/webhooks)

Set webhook URL and secret

View delivery logs

Manual retry buttons

Send test webhooks

API Documentation (/dashboard/docs)

Integration code snippets

SDK usage examples

Webhook verification code

🐳 Run with Docker (Updated)
Updated Docker Compose
The system now includes Redis and worker services:

bash
# 1️⃣ Clone the project
git clone https://github.com/NagaSaiTejo/payment-gateway
cd payment-gateway

# 2️⃣ Start all services (including Redis and Worker)
docker-compose up --build
This starts:

PostgreSQL (port 5432)

Redis (port 6379)

API Server (port 8000)

Worker Service (background jobs)

Merchant Dashboard (port 3000)

Checkout Page + SDK (port 3001)

Service Health Check
Verify all services are running:

bash
docker-compose ps

# Should show:
# postgres      ...   Up (healthy)
# redis         ...   Up (healthy)
# api           ...   Up (healthy)
# worker        ...   Up
# dashboard     ...   Up
# checkout      ...   Up
🧪 How to Test Deliverable 2
Step 1: Set Up Test Merchant Webhook
bash
# Create test merchant receiver
mkdir test-merchant
cd test-merchant
npm init -y
npm install express
Create webhook-receiver.js:

javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', 'whsec_test_abc123')
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.log('❌ Invalid signature');
    return res.status(401).send('Invalid signature');
  }
  
  console.log('✅ Webhook verified:', req.body.event);
  console.log('Payment ID:', req.body.data.payment?.id);
  
  res.status(200).send('OK');
});

app.listen(4000, () => {
  console.log('Test merchant webhook running on port 4000');
});
Run it:

bash
node webhook-receiver.js
Step 2: Update Merchant Webhook URL
bash
# Update the test merchant with webhook URL
docker exec pg_gateway psql -U gateway_user -d payment_gateway -c \
"UPDATE merchants SET webhook_url = 'http://host.docker.internal:4000/webhook', 
webhook_secret = 'whsec_test_abc123' 
WHERE email = 'test@example.com';"
Step 3: Test Async Payment Flow
bash
# Create payment with idempotency key
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Idempotency-Key: test_123_$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_test_async",
    "method": "upi",
    "vpa": "test@paytm",
    "amount": 1000,
    "currency": "INR"
  }'

# Response will be immediate with status: 'pending'
# Check job queue status
curl http://localhost:8000/api/v1/test/jobs/status

# Check webhook logs after processing
curl -H "X-Api-Key: key_test_abc123" \
     -H "X-Api-Secret: secret_test_xyz789" \
     http://localhost:8000/api/v1/webhooks
Step 4: Test Refunds
bash
# First, get a successful payment ID
PAYMENT_ID="pay_xxxxxxxxxxxx"

# Create refund
curl -X POST http://localhost:8000/api/v1/payments/$PAYMENT_ID/refunds \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "reason": "Partial refund test"
  }'

# Check refund status
curl -H "X-Api-Key: key_test_abc123" \
     -H "X-Api-Secret: secret_test_xyz789" \
     http://localhost:8000/api/v1/refunds/{refund_id}
Step 5: Test SDK Integration
Open merchant dashboard: http://localhost:3000

Go to API Docs page

Copy SDK integration code

Create HTML file with the code

Open in browser and test payment flow

🗃️ Updated Database Schema
New Tables
Refunds Table
sql
id            VARCHAR(64)     PRIMARY KEY (rfnd_ + 16 chars)
payment_id    VARCHAR(64)     REFERENCES payments(id)
merchant_id   UUID            REFERENCES merchants(id)
amount        INTEGER         Refund amount in smallest unit
reason        TEXT            Optional reason
status        VARCHAR(20)     'pending' or 'processed'
created_at    TIMESTAMP       Auto-set
processed_at  TIMESTAMP       When status changes to 'processed'
Webhook Logs Table
sql
id               UUID          PRIMARY KEY
merchant_id      UUID          REFERENCES merchants(id)
event            VARCHAR(50)   Event type
payload          JSON          Event data
status           VARCHAR(20)   'pending', 'success', 'failed'
attempts         INTEGER       Delivery attempts
last_attempt_at  TIMESTAMP     Last attempt time
next_retry_at    TIMESTAMP     Scheduled retry time
response_code    INTEGER       HTTP response code
response_body    TEXT          Response body
created_at       TIMESTAMP     Auto-set
Idempotency Keys Table
sql
key          VARCHAR(255)  PRIMARY KEY
merchant_id  UUID          REFERENCES merchants(id)
response     JSON          Cached API response
created_at   TIMESTAMP     Auto-set
expires_at   TIMESTAMP     created_at + 24 hours
Modified Tables
Merchants Table (Added)
sql
webhook_secret   VARCHAR(64)   For HMAC signature generation
webhook_url      VARCHAR(255)  Merchant's webhook endpoint
Payments Table (Modified)
sql
captured         BOOLEAN       DEFAULT false  # Tracks if payment captured
🔧 Updated API Endpoints
Modified Endpoints
POST /api/v1/payments (Async)
Now returns immediately with status: 'pending'

Processes payment via background job

Supports idempotency keys

New Endpoints
POST /api/v1/payments/{payment_id}/capture
bash
curl -X POST http://localhost:8000/api/v1/payments/{id}/capture \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
POST /api/v1/payments/{payment_id}/refunds
bash
curl -X POST http://localhost:8000/api/v1/payments/{id}/refunds \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -d '{"amount": 1000, "reason": "Customer request"}'
GET /api/v1/refunds/{refund_id}
bash
curl -H "X-Api-Key: key_test_abc123" \
     -H "X-Api-Secret: secret_test_xyz789" \
     http://localhost:8000/api/v1/refunds/{id}
GET /api/v1/webhooks
bash
curl -H "X-Api-Key: key_test_abc123" \
     -H "X-Api-Secret: secret_test_xyz789" \
     "http://localhost:8000/api/v1/webhooks?limit=10&offset=0"
POST /api/v1/webhooks/{webhook_id}/retry
bash
curl -X POST http://localhost:8000/api/v1/webhooks/{id}/retry \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
GET /api/v1/test/jobs/status (For Evaluation)
bash
curl http://localhost:8000/api/v1/test/jobs/status
# Returns: {"pending": 5, "processing": 2, "completed": 100, "failed": 0, "worker_status": "running"}
🔐 Webhook Specification
Signature Generation
javascript
// Merchant-side verification example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
Payload Format
json
{
  "event": "payment.success",
  "timestamp": 1705315870,
  "data": {
    "payment": {
      "id": "pay_H8sK3jD9s2L1pQr",
      "order_id": "order_NXhj67fGH2jk9mPq",
      "amount": 50000,
      "currency": "INR",
      "method": "upi",
      "status": "success"
    }
  }
}
Retry Schedule
Production:

Attempt 1: Immediate

Attempt 2: After 1 minute

Attempt 3: After 5 minutes

Attempt 4: After 30 minutes

Attempt 5: After 2 hours

Test Mode (set WEBHOOK_RETRY_INTERVALS_TEST=true):

Attempt 1: 0 seconds

Attempt 2: 5 seconds

Attempt 3: 10 seconds

Attempt 4: 15 seconds

Attempt 5: 20 seconds

📦 Embeddable SDK Usage
Integration
html
<!-- Include SDK -->
<script src="http://localhost:3001/checkout.js"></script>

<!-- Payment Button -->
<button id="pay-button">Pay Now</button>

<script>
document.getElementById('pay-button').addEventListener('click', function() {
  const checkout = new PaymentGateway({
    key: 'key_test_abc123',
    orderId: 'order_xyz',
    onSuccess: function(response) {
      console.log('Payment successful:', response.paymentId);
      // Update your UI
    },
    onFailure: function(error) {
      console.log('Payment failed:', error);
      // Show error message
    },
    onClose: function() {
      console.log('Modal closed');
    }
  });
  
  checkout.open();
});
</script>
SDK Modal Structure
html
<div id="payment-gateway-modal" data-test-id="payment-modal">
  <div class="modal-overlay">
    <div class="modal-content">
      <iframe 
        data-test-id="payment-iframe"
        src="http://localhost:3001/checkout?order_id=xxx&embedded=true"
      ></iframe>
      <button data-test-id="close-modal-button" class="close-button">×</button>
    </div>
  </div>
</div>
🧰 Tech Stack (Updated)
Backend
Node.js + Express - API server

Redis + Bull - Job queue and background processing

PostgreSQL - Transactional data

JWT - Authentication

Frontend
React + Vite - Dashboard and checkout

Embeddable SDK - Vanilla JS + Webpack bundle

PostMessage API - Cross-origin communication

DevOps & Infrastructure
Docker & Docker Compose - Container orchestration

Redis - Job queue and caching

Multi-service Architecture - API, Worker, Dashboard, Checkout

Security & Reliability
HMAC-SHA256 - Webhook signature verification

Idempotency Keys - Prevent duplicate transactions

Exponential Backoff - Smart retry logic

Database Transactions - Data consistency

🎯 Testing Modes
Automated Evaluation Mode
Set in .env:

env
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
WEBHOOK_RETRY_INTERVALS_TEST=true
Effects:

Fixed payment processing delay (1 second)

Deterministic payment success/failure

Fast webhook retry intervals (under 1 minute cycle)

Suitable for automated testing

Production Mode
env
TEST_MODE=false
# Uses random 5-10s processing delays
# Real success rates (UPI: 90%, Card: 95%)
# Standard retry intervals (1min, 5min, 30min, 2hr)
🔍 Monitoring & Debugging
Job Queue Status
bash
# Check worker health
docker-compose logs worker

# Check Redis queue
docker exec redis_gateway redis-cli keys "*"
docker exec redis_gateway redis-cli LLEN bull:payment:wait

# API endpoint for queue stats
curl http://localhost:8000/api/v1/test/jobs/status
Database Inspection
bash
# Check webhook logs
docker exec pg_gateway psql -U gateway_user -d payment_gateway -c \
"SELECT event, status, attempts, response_code FROM webhook_logs ORDER BY created_at DESC LIMIT 5;"

# Check refunds
docker exec pg_gateway psql -U gateway_user -d payment_gateway -c \
"SELECT id, payment_id, amount, status FROM refunds;"
Common Issues & Solutions
Worker not processing jobs

bash
# Restart worker
docker-compose restart worker

# Check Redis connection
docker-compose logs worker | grep -i "redis\|connect"
Webhook signatures don't match

Ensure JSON stringification is consistent (no whitespace changes)

Verify merchant has webhook_secret set

Check signature generation uses exact request body

SDK not loading

Verify checkout service is running on port 3001

Check browser console for CORS errors

Ensure iframe URL includes embedded=true parameter

📊 Production Readiness Features
Background Processing - No blocking API calls

Retry Logic - Automatic recovery from failures

Idempotency - Safe retry of API requests

Webhook Security - HMAC signature verification

Cross-Origin SDK - Embeddable payment widget

Comprehensive Logging - Audit trails for all operations

Health Checks - Service monitoring endpoints

Test Mode Support - Deterministic behavior for CI/CD

🏆 Deliverable 2 Complete
This deliverable transforms the core payment gateway into a production-ready system with:

✅ Async Processing - Redis + Bull job queues
✅ Webhook System - Event-driven with HMAC signatures
✅ Embeddable SDK - Cross-origin iframe/modal payments
✅ Refund Management - Full & partial refunds
✅ Idempotent APIs - Duplicate request prevention
✅ Enhanced Dashboard - Webhook config, logs, docs
✅ Retry Mechanisms - Exponential backoff for webhooks
✅ Worker Services - Dedicated background job processing

The system is now capable of handling real production workloads with the reliability and scalability patterns used by leading payment gateways.