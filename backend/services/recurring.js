const db = require('./db');

/**
 * Detects likely subscriptions: the same merchant charging a similar
 * amount at roughly monthly intervals (25-35 day gaps), at least twice
 * in the synced history. Plain pattern matching, no AI.
 */
function detectSubscriptions() {
  const acctSet = new Set(db.table('accounts').map((a) => a.id));

  const start = new Date();
  start.setDate(start.getDate() - 90);
  const startStr = start.toISOString().split('T')[0];

  const transactions = db.table('transactions')
    .filter((t) =>
      (acctSet.has(t.account_id) || t.source === 'manual') &&
      !t.is_income && t.date >= startStr)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const groups = {};
  transactions.forEach((t) => {
    const key = (t.merchant_name || t.description || '').toLowerCase().trim();
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const subscriptions = [];
  for (const txs of Object.values(groups)) {
    if (txs.length < 2) continue;

    let recurring = true;
    for (let i = 1; i < txs.length; i++) {
      const gapDays = (new Date(txs[i].date) - new Date(txs[i - 1].date)) / 86400000;
      const amountDrift =
        Math.abs(txs[i].amount - txs[i - 1].amount) / Math.max(txs[i - 1].amount, 0.01);
      if (gapDays < 25 || gapDays > 35 || amountDrift > 0.15) {
        recurring = false;
        break;
      }
    }

    if (recurring) {
      const latest = txs[txs.length - 1];
      subscriptions.push({
        name: latest.merchant_name || latest.description,
        amount: Math.round(latest.amount * 100) / 100,
        category: latest.category,
        occurrences: txs.length,
        lastCharged: latest.date,
      });
    }
  }

  subscriptions.sort((a, b) => b.amount - a.amount);
  return {
    subscriptions,
    monthlyTotal: Math.round(subscriptions.reduce((s, x) => s + x.amount, 0) * 100) / 100,
  };
}

module.exports = { detectSubscriptions };
