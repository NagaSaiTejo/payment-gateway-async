const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Running schema migration...');
        await db.query(schema);

        // Seed Test Merchant
        const testMerchantId = '550e8400-e29b-41d4-a716-446655440000';
        const checkMerchant = await db.query('SELECT * FROM merchants WHERE id = $1', [testMerchantId]);

        if (checkMerchant.rows.length === 0) {
            console.log('Seeding test merchant...');
            await db.query(`
                INSERT INTO merchants (id, name, email, api_key, api_secret)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                testMerchantId,
                'Test Merchant',
                'test@example.com',
                'key_test_abc123',
                'secret_test_xyz789'
            ]);
        } else {
            console.log('Test merchant already exists.');
        }

        console.log('Database initialization complete.');
    } catch (err) {
        console.error('Database initialization failed:', err);
        throw err;
    }
};

module.exports = initDb;
