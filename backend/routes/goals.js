const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

router.get('/', async (req, res) => {
  try {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at');
    res.json({ goals: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

router.post('/', async (req, res) => {
  const { name, emoji, target_amount } = req.body;
  const target = Number(target_amount);
  if (!name || !Number.isFinite(target) || target <= 0) {
    return res.status(400).json({ error: 'A name and a positive target amount are required' });
  }

  try {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: req.userId,
        name: String(name).slice(0, 60),
        emoji: String(emoji || '🎯').slice(0, 8),
        target_amount: target,
        saved_amount: 0,
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Log money you've set aside toward a goal (manual — the app is
// read-only and can never actually move money, this is just tracking).
router.post('/:id/add', async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'A positive amount is required' });
  }

  try {
    const { data: goal } = await supabase
      .from('goals')
      .select('saved_amount')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const { data, error } = await supabase
      .from('goals')
      .update({ saved_amount: goal.saved_amount + amount })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('goals').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

module.exports = router;
