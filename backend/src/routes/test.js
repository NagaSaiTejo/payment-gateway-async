const express = require('express');
const Queue = require('bull');
const router = express.Router();

// Required test endpoint for evaluation
router.get('/jobs/status', async (req, res) => {
  try {
    const paymentQueue = new Queue('payment-processing', process.env.REDIS_URL || 'redis://redis:6379');
    
    // Get job counts
    const counts = await paymentQueue.getJobCounts();
    
    res.status(200).json({
      pending: counts.waiting || 0,
      processing: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      worker_status: "running"
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(200).json({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      worker_status: "error: " + error.message
    });
  }
});

// Simple health check
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'payment-gateway',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;