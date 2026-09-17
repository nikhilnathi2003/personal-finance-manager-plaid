const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { getDashboard } = require('../services/dashboard');

// Budgets + how much of each is already spent this month.
router.get('/', (req, res) => {
  try {
    const dashboard = getDashboard();
    const withSpent = db.table('budgets').map((b) => ({
      ...b,
      spent: Math.round((dashboard.spendingByCategory[b.category] || 0) * 100) / 100,
    }));
    res.json({ budgets: withSpent, categories: Object.keys(dashboard.spendingByCategory) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load budgets' });
  }
});

// Create or update a budget for a category.
router.post('/', async (req, res) => {
  const { category, monthly_limit } = req.body;
  const limit = Number(monthly_limit);
  if (!category || !Number.isFinite(limit) || limit <= 0) {
    return res.status(400).json({ error: 'A category and a positive monthly limit are required' });
  }

  try {
    const budgets = db.table('budgets');
    const name = String(category).slice(0, 60);
    const existing = budgets.find((b) => b.category === name);
    let data;
    if (existing) { existing.monthly_limit = limit; data = existing; }
    else { data = { id: db.uid(), category: name, monthly_limit: limit, created_at: new Date().toISOString() }; budgets.push(data); }
    await db.save();
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const budgets = db.table('budgets');
    const i = budgets.findIndex((b) => b.id === req.params.id);
    if (i !== -1) { budgets.splice(i, 1); await db.save(); }
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

module.exports = router;
