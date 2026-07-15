require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const requireAuth = require('./middleware/auth');
const plaidRoutes = require('./routes/plaid');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const goalRoutes = require('./routes/goals');
const { syncAllUsersTransactions } = require('./services/sync');

const app = express();

// Security headers (clickjacking, MIME sniffing, etc.)
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Basic abuse protection: 200 requests per 15 min per IP is far more
// than 5 people need, and stops anyone hammering the server.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check (the ONLY route that doesn't require login)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Finance app backend is running' });
});

// EVERYTHING below this line requires a valid login token.
app.use(requireAuth);

app.use('/plaid', plaidRoutes);
app.use('/transactions', transactionRoutes);
app.use('/budgets', budgetRoutes);
app.use('/goals', goalRoutes);

// Auto-sync every linked bank every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('[cron] Running scheduled transaction sync...');
  syncAllUsersTransactions().catch((err) =>
    console.error('[cron] Sync failed:', err.message)
  );
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Finance app backend listening on port ${PORT}`);
});
