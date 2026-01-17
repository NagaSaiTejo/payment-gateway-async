const getWebhooks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM webhook_logs';
    let countQuery = 'SELECT COUNT(*) FROM webhook_logs';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      countQuery += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const [webhooks, totalResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, status ? [status] : [])
    ]);
    
    res.json({
      data: webhooks.rows,
      total: parseInt(totalResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(totalResult.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Webhook fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
};