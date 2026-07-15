const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const supabase = require('../services/supabase');
const { syncBankItem } = require('../services/sync');
const { generateInsights } = require('../services/gemini');
const { getDashboard, getTrends } = require('../services/dashboard');
const { detectSubscriptions } = require('../services/recurring');

// Manual pull-to-refresh
router.post('/sync-now', async (req, res) => {
  try {
    const { data: bankItems } = await supabase
      .from('bank_items')
      .select('*')
      .eq('user_id', req.userId);

    let total = 0;
    for (const item of bankItems || []) {
      total += await syncBankItem(item);
    }
    res.json({ synced: total });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Everything the Home screen needs in one call
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await getDashboard(req.userId);
    res.json(dashboard);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Monthly income vs spending for the Trends screen
router.get('/trends', async (req, res) => {
  try {
    res.json({ months: await getTrends(req.userId, 6) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load trends' });
  }
});

// Detected recurring subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    res.json(await detectSubscriptions(req.userId));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to detect subscriptions' });
  }
});

// AI insights — extra rate limit so 5 friends can't accidentally
// burn through the shared free Gemini quota (1,500 requests/day).
const insightsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Slow down — insights are limited to 10 per hour.' },
});

router.get('/insights', insightsLimiter, async (req, res) => {
  try {
    const dashboard = await getDashboard(req.userId);

    const insights = await generateInsights({
      income: dashboard.income,
      spendingByCategory: dashboard.spendingByCategory,
      leftover: dashboard.leftover,
    });

    await supabase.from('recommendations').insert({
      user_id: req.userId,
      month: new Date().toISOString().slice(0, 7),
      leftover_amount: dashboard.leftover,
      summary_text: insights.summary,
      suggestions: insights.suggestions,
    });

    res.json(insights);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;
