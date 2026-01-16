const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://gateway_user:gateway_pass@postgres:5432/payment_gateway'
  });

  try {
    console.log('📊 Running database migrations...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations/001_add_deliverable2_tables.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Run migration
    await pool.query(sql);
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();