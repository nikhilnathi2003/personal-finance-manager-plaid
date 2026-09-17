const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../services/db');
const { syncAllUsersTransactions } = require('../services/sync');
const { generateInsights } = require('../services/gemini');
const { getDashboard, getTrends } = require('../services/dashboard');
const { detectSubscriptions } = require('../services/recurring');
const { CATALOG, matchKey } = require('../services/categorize');

// Manual pull-to-refresh — re-sync every linked bank.
router.post('/sync-now', async (req, res) => {
  try {
    await syncAllUsersTransactions();
    res.json({ success: true });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Everything the Home screen needs. Optional ?month=YYYY-MM.
router.get('/dashboard', (req, res) => {
  try {
    res.json(getDashboard(req.query.month));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

router.get('/trends', (req, res) => {
  try {
    res.json({ months: getTrends(6) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load trends' });
  }
});

router.get('/subscriptions', (req, res) => {
  try {
    res.json(detectSubscriptions());
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to detect subscriptions' });
  }
});

// Fix-a-category: correct one transaction, remember the merchant, and
// retroactively fix other transactions from the same merchant.
router.post('/:id/category', async (req, res) => {
  try {
    const { categoryKey } = req.body;
    const entry = CATALOG[categoryKey];
    if (!entry) return res.status(400).json({ error: 'Unknown category' });

    const txs = db.table('transactions');
    const tx = txs.find((t) => t.id === req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const is_income = entry.type === 'income' ? true : entry.type === 'expense' ? false : tx.is_income;

    // Update this transaction + same-merchant siblings.
    const key = matchKey(tx);
    for (const t of txs) {
      const sameMerchant = tx.merchant_name
        ? t.merchant_name === tx.merchant_name
        : t.id === tx.id;
      if (t.id === tx.id || sameMerchant) {
        t.category = entry.label;
        t.category_key = categoryKey;
        t.is_income = is_income;
      }
    }

    // Remember the correction for future syncs.
    if (key) {
      const overrides = db.table('overrides');
      const existing = overrides.find((o) => o.match_key === key);
      if (existing) { existing.category_key = categoryKey; existing.category = entry.label; }
      else overrides.push({ id: db.uid(), match_key: key, category_key: categoryKey, category: entry.label });
    }

    await db.save();
    res.json({ success: true, category: entry.label, category_key: categoryKey });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Add a manual cash transaction (money the bank never sees).
router.post('/manual', async (req, res) => {
  try {
    const { amount, categoryKey, description, date } = req.body;
    const entry = CATALOG[categoryKey];
    const value = Number(amount);
    if (!entry) return res.status(400).json({ error: 'Pick a category' });
    if (!value || value <= 0) return res.status(400).json({ error: 'Enter an amount' });

    const is_income = entry.type === 'income';
    const signed = is_income ? -Math.abs(value) : Math.abs(value); // Plaid: negative = money in

    const row = {
      id: db.uid(),
      account_id: null,
      plaid_transaction_id: null,
      source: 'manual',
      amount: signed,
      category: entry.label,
      category_key: categoryKey,
      merchant_name: description || null,
      description: description || entry.label,
      date: date || new Date().toISOString().split('T')[0],
      is_income,
    };
    db.table('transactions').push(row);
    await db.save();

    res.json({ success: true, transaction: row });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Delete a manual transaction.
router.delete('/manual/:id', async (req, res) => {
  try {
    const txs = db.table('transactions');
    const i = txs.findIndex((t) => t.id === req.params.id && t.source === 'manual');
    if (i !== -1) { txs.splice(i, 1); await db.save(); }
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// AI insights — light rate limit to be kind to the free Gemini quota.
const insightsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Slow down — insights are limited to 20 per hour.' },
});

router.get('/insights', insightsLimiter, async (req, res) => {
  try {
    const dashboard = getDashboard(req.query.month);
    const insights = await generateInsights({
      income: dashboard.income,
      spendingByCategory: dashboard.spendingByCategory,
      leftover: dashboard.leftover,
    });
    res.json(insights);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;
