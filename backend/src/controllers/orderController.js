const db = require('../config/database');
const { generateId } = require('../utils/helpers');

const createOrder = async (req, res) => {
    const { amount, currency = 'INR', receipt } = req.body;
    const merchantId = req.merchant.id;

    if (!Number.isInteger(amount) || amount < 100) {
        return res.status(400).json({
            error: { code: "BAD_REQUEST_ERROR", description: "amount must be at least 100" }
        });
    }

    const orderId = generateId("order_");

    await db.query(
        `INSERT INTO orders (id, merchant_id, amount, currency, receipt, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [orderId, merchantId, amount, currency, receipt, "created"]
    );

    // 🔥 SEND RESPONSE DIRECTLY — DON’T USE undefined variable
    return res.status(201).json({
        id: orderId,
        amount,
        currency,
        receipt,
        status: "created",
        created_at: new Date().toISOString()
    });
};


const getOrder = async (req, res) => {
    const { order_id } = req.params;

    try {
        const result = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND_ERROR',
                    description: 'Order not found'
                }
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Get order error:', err);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                description: 'Internal server error'
            }
        });
    }
};

module.exports = { createOrder, getOrder };