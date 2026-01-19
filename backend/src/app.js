const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const initDb = require('./utils/initDb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const apiRoutes = require('./routes/api');

app.use('/', apiRoutes); // Mount at root for /health
app.use('/api/v1', apiRoutes); // Mount for API endpoints

// Placeholder for routes
app.get('/', (req, res) => {
    res.send('Payment Gateway API is running');
});

const startServer = async () => {
    try {
        // Wait for DB to be ready (rudimentary check handled by docker-compose, but we can retry here if needed)
        // For now, assume docker-compose healthcheck is sufficient.
        await initDb();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();

// Export for potential testing
module.exports = app;

// App initialized
