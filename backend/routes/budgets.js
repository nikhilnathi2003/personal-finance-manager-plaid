const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { getDashboard } = require('../services/dashboard');

// Budgets + how much of each is already spent this month
router.get('/', async (req, res) => {
  try {
    const [{ data: budgets }, dashboard] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', req.userId).order('category'),
      getDashboard(req.userId),
    ]);

    const withSpent = (budgets || []).map((b) => ({
      ...b,
      spent: Math.round((dashboard.spendingByCategory[b.category] || 0) * 100) / 100,
    }));

    res.json({ budgets: withSpent, categories: Object.keys(dashboard.spendingByCategory) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load budgets' });
  }
});

// Create or update a budget for a category
router.post('/', async (req, res) => {
  const { category, monthly_limit } = req.body;
  const limit = Number(monthly_limit);
  if (!category || !Number.isFinite(limit) || limit <= 0) {
    return res.status(400).json({ error: 'A category and a positive monthly limit are required' });
  }

  try {
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: req.userId, category: String(category).slice(0, 60), monthly_limit: limit },
        { onConflict: 'user_id,category' }
      )
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('budgets').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

module.exports = router;
