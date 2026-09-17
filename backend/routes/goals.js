const express = require('express');
const router = express.Router();
const db = require('../services/db');

router.get('/', (req, res) => {
  try {
    res.json({ goals: db.table('goals') });
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
    const goal = {
      id: db.uid(),
      name: String(name).slice(0, 60),
      emoji: String(emoji || '🎯').slice(0, 8),
      target_amount: target,
      saved_amount: 0,
      created_at: new Date().toISOString(),
    };
    db.table('goals').push(goal);
    await db.save();
    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Log money set aside toward a goal (tracking only — never moves money).
router.post('/:id/add', async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'A positive amount is required' });
  }

  try {
    const goal = db.table('goals').find((g) => g.id === req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    goal.saved_amount += amount;
    await db.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const goals = db.table('goals');
    const i = goals.findIndex((g) => g.id === req.params.id);
    if (i !== -1) { goals.splice(i, 1); await db.save(); }
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

module.exports = router;
