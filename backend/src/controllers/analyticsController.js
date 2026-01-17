const { Pool } = require('pg');
const pool = require('../config/database');

const getAnalytics = async (req, res) => {
  try {
    // REAL DATABASE QUERIES
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      totalRevenue,
      todayStats
    ] = await Promise.all([
      // Total payments
      pool.query('SELECT COUNT(*) FROM payments'),
      
      // Successful payments
      pool.query("SELECT COUNT(*) FROM payments WHERE status = 'success'"),
      
      // Failed payments  
      pool.query("SELECT COUNT(*) FROM payments WHERE status = 'failed'"),
      
      // Total revenue
      pool.query("SELECT SUM(amount) FROM payments WHERE status = 'success'"),
      
      // Today's stats
      pool.query(`
        SELECT 
          COUNT(*) as today_count,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as today_success,
          COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0) as today_revenue
        FROM payments 
        WHERE DATE(created_at) = CURRENT_DATE
      `)
    ]);

    res.json({
      // Core metrics
      payments: parseInt(totalPayments.rows[0].count),
      success: parseInt(successfulPayments.rows[0].count),
      failed: parseInt(failedPayments.rows[0].count),
      revenue: parseInt(totalRevenue.rows[0].sum) || 0,
      
      // Today's metrics
      today: {
        transactions: parseInt(todayStats.rows[0].today_count),
        success: parseInt(todayStats.rows[0].today_success),
        revenue: parseInt(todayStats.rows[0].today_revenue),
        success_rate: todayStats.rows[0].today_count > 0 
          ? (parseInt(todayStats.rows[0].today_success) / parseInt(todayStats.rows[0].today_count) * 100).toFixed(1)
          : 0
      },
      
      // Time series data (last 7 days)
      daily_trend: await getDailyTrend(),
      
      // Payment method breakdown
      method_breakdown: await getMethodBreakdown(),
      
      // Recent transactions
      recent_transactions: await getRecentTransactions()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

async function getDailyTrend() {
  const result = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as success
    FROM payments 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 7
  `);
  return result.rows;
}

async function getMethodBreakdown() {
  const result = await pool.query(`
    SELECT 
      method,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as success
    FROM payments 
    GROUP BY method
  `);
  return result.rows;
}

async function getRecentTransactions() {
  const result = await pool.query(`
    SELECT id, amount, currency, method, status, created_at
    FROM payments 
    ORDER BY created_at DESC
    LIMIT 10
  `);
  return result.rows;
}

module.exports = { getAnalytics };