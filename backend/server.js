require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const db = require('./services/db');
const requireApiKey = require('./middleware/apiKey');
const plaidRoutes = require('./routes/plaid');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const goalRoutes = require('./routes/goals');
const { syncAllUsersTransactions } = require('./services/sync');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check — the only route that doesn't need the API key, so
// hosting platforms can ping it.
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'The Vault backend is running' });
});

// Everything below requires the shared secret (when one is configured).
app.use(requireApiKey);
app.use('/plaid', plaidRoutes);
app.use('/transactions', transactionRoutes);
app.use('/budgets', budgetRoutes);
app.use('/goals', goalRoutes);

// Auto-sync every linked bank every 6 hours (runs while the server is awake).
cron.schedule('0 */6 * * *', () => {
  console.log('[cron] Running scheduled transaction sync...');
  syncAllUsersTransactions().catch((err) =>
    console.error('[cron] Sync failed:', err.message)
  );
});

const PORT = process.env.PORT || 4000;

// Load the data store before accepting requests.
db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`The Vault backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start — could not open data store:', err.message);
    process.exit(1);
  });
