const db = require('../config/database');

const initDb = async () => {
    try {
        console.log('Database initialization started...');

        // Just check if database is accessible
        const result = await db.query('SELECT 1 as connected');
        console.log('Database connection test passed');

        console.log('Database initialization complete - tables are handled by migrations.');
    } catch (err) {
        console.error('Database initialization failed:', err);
        throw err;
    }
};

module.exports = initDb;
