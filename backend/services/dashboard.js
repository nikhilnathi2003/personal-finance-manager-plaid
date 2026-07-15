const supabase = require('./supabase');

// One place that answers: "what are this user's accounts and this
// month's numbers?" Used by both the dashboard route and the AI
// insights route (no more backend calling itself over HTTP).
async function getDashboard(userId) {
  const { data: bankItems } = await supabase
    .from('bank_items')
    .select('id, institution_name')
    .eq('user_id', userId);
  const bankItemIds = (bankItems || []).map((b) => b.id);

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .in('bank_item_id', bankItemIds.length ? bankItemIds : ['00000000-0000-0000-0000-000000000000']);
  const accountIds = (accounts || []).map((a) => a.id);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .in('account_id', accountIds.length ? accountIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .order('date', { ascending: false });

  const txs = transactions || [];
  const income = txs.filter((t) => t.is_income).reduce((s, t) => s + Math.abs(t.amount), 0);
  const spending = txs.filter((t) => !t.is_income).reduce((s, t) => s + t.amount, 0);

  const spendingByCategory = {};
  txs.filter((t) => !t.is_income).forEach((t) => {
    spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
  });

  const netWorth = (accounts || []).reduce((sum, a) => {
    const bal = a.current_balance || 0;
    return a.type === 'credit' ? sum - bal : sum + bal;
  }, 0);

  return {
    bankItems: bankItems || [],
    accounts: accounts || [],
    accountIds,
    transactions: txs,
    income,
    spending,
    leftover: income - spending,
    spendingByCategory,
    netWorth,
  };
}

// Monthly income vs spending for the last N months (from whatever
// history has been synced — up to 90 days by default).
async function getTrends(userId, months = 6) {
  const { accountIds } = await getDashboard(userId);

  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, is_income, date, category')
    .in('account_id', accountIds.length ? accountIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('date', start.toISOString().split('T')[0]);

  const byMonth = {};
  (transactions || []).forEach((t) => {
    const month = t.date.slice(0, 7); // '2026-07'
    if (!byMonth[month]) byMonth[month] = { month, income: 0, spending: 0 };
    if (t.is_income) byMonth[month].income += Math.abs(t.amount);
    else byMonth[month].spending += t.amount;
  });

  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}

module.exports = { getDashboard, getTrends };
