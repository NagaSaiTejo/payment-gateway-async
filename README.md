# Payment Gateway – Multi-Method Processing & Hosted Checkout

  This project is a full-stack Payment Gateway system built to simulate how platforms like Razorpay, Stripe, or PayPal work internally.
  It supports merchant authentication, order creation, UPI & card payments, a hosted checkout page, and a merchant dashboard — all running in Docker.

  The system is designed for fintech-grade workflows, including payment state machines, validation logic, and transaction persistence.

# What This Project Includes
 ## Merchant System

  A pre-seeded test merchant is created on startup:

  Email: test@example.com
  API Key: key_test_abc123
  API Secret: secret_test_xyz789


Merchants can:

  View their API keys
  Track payments
  See total volume & success rate

## Orders API

  Merchants can create payment orders through authenticated REST APIs.

  Example:

  POST /api/v1/orders
  {
    "amount": 50000,
    "currency": "INR",
    "receipt": "order_001"
  }


  Orders are stored with IDs like:

  order_c80UYgluKJPPkARY => which was my last testing order id.

## Payment Engine

  Payments support:
  UPI (user@bank)
  Cards (Luhn validated, network detected)
  Features:
  Realistic 5–10 second processing delay
  Randomized success/failure (UPI 90%, Card 95%)
  State machine:
  processing → success / failed
  No CVV or full card numbers are stored (only last 4 digits)

## Hosted Checkout Page

  Customers are redirected to:

  http://localhost:3001/checkout?order_id=ORDER_ID


  It includes:
  Order summary
  UPI & Card selection
  Processing animation
  Success / Failure screens
  Payment ID display

## Merchant Dashboard

  Available at:
  http://localhost:3000


  Shows:

  API Key & Secret
  Total transactions
  Total amount processed
  Success rate
  Full transaction history

## Run with Docker (One Command)
  1️⃣ Clone the project
  git clone https://github.com/NagaSaiTejo/payment-gateway
  cd payment-gateway

  2️⃣ Start everything
  docker-compose up --build

  This starts:
  PostgreSQL
  API Server (port 8000)
  Merchant Dashboard (port 3000)
  Checkout Page (port 3001)

  When ready you’ll see:
  Server running on port 8000

## How to Test
  Step 1 – Login

  Go to:

  http://localhost:3000


  Login with:

  Email: test@example.com
  Password: anything

  Step 2 – Create Order
  curl -X POST http://localhost:8000/api/v1/orders \
    -H "Content-Type: application/json" \
    -H "X-Api-Key: key_test_abc123" \
    -H "X-Api-Secret: secret_test_xyz789" \
    -d '{
      "amount": 50000,
      "currency": "INR",
      "receipt": "demo_001"
    }'


  You’ll receive:

  {
    "id": "order_c8OUYgLuKJPPkARY",
    ...
  }

  Step 3 – Pay via Checkout

  Open:

  http://localhost:3001/checkout?order_id=order_c80UYgluKJPPkARY


  Try:

  UPI → user@paytm

  Card → 4242424242424242

  You’ll see:

  Payment Successful
  pay_xxxxxxxxxxxxxxxx
## Database Schema
  Merchants
  Column	Type
  id	UUID
  name	VARCHAR
  email	VARCHAR
  api_key	VARCHAR
  api_secret	VARCHAR
  is_active	BOOLEAN
  Orders
  Column	Type
  id	VARCHAR (order_ + 16 chars)
  merchant_id	UUID
  amount	INTEGER
  currency	VARCHAR
  receipt	VARCHAR
  status	VARCHAR
  created_at	TIMESTAMP
  Payments
  Column	Type
  id	VARCHAR (pay_ + 16 chars)
  order_id	VARCHAR
  merchant_id	UUID
  method	VARCHAR (upi / card)
  status	VARCHAR (processing / success / failed)
  vpa	VARCHAR
  card_network	VARCHAR
  card_last4	VARCHAR
## API Endpoints
  Method	Endpoint	Description	Auth
  GET	/health	System status	No
  POST	/api/v1/orders	Create order	Yes
  GET	/api/v1/orders/:id	Fetch order	Yes
  POST	/api/v1/payments	Create payment	Yes
  GET	/api/v1/payments/:id	Payment status	Yes
  🧪 Test Mode (For Evaluation)

  Controlled via .env:

  TEST_MODE=true
  TEST_PAYMENT_SUCCESS=true
  TEST_PROCESSING_DELAY=1000


  This ensures:
  Deterministic payment result
  Fixed delay
  Suitable for automated evaluation

## Tech Stack

  Backend – Node.js, Express
  Database – PostgreSQL
  Frontend – React + Vite
  DevOps – Docker & Docker Compose
  Security – API Key + Secret authentication
  Validation – Luhn Algorithm, VPA Regex, Card Network Detection

## Final Result

  This project delivers:
  A real payment gateway architecture
  Secure merchant authentication
  Order → Payment lifecycle
  Full Dockerized fintech stack
  Professional checkout & dashboard