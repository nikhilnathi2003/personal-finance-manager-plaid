const db = require('./db');
const { CATALOG } = require('./categorize');

// What kind of money movement is this transaction?
function flowOf(tx) {
  const entry = tx.category_key && CATALOG[tx.category_key];
  if (entry) return entry.type; // 'income' | 'expense' | 'transfer'
  return tx.is_income ? 'income' : 'expense';
}

// Group accounts into the buckets the Home screen shows (combined
// across every linked bank).
function summarizeAccounts(accounts) {
  const summary = { chequing: 0, savings: 0, credit: 0, other: 0 };
  for (const a of accounts) {
    const bal = a.current_balance || 0;
    const sub = (a.subtype || '').toLowerCase();
    if (a.type === 'credit') summary.credit += bal;
    else if (sub === 'checking' || sub === 'chequing') summary.chequing += bal;
    else if (sub === 'savings') summary.savings += bal;
    else summary.other += bal;
  }
  return summary;
}

// First and last day (exclusive) of a 'YYYY-MM' month; defaults to now.
function monthRange(month) {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [yy, mm] = month.split('-').map(Number);
    y = yy; m = mm - 1;
  }
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    key: `${y}-${String(m + 1).padStart(2, '0')}`,
  };
}

// Bank + manual transactions in a date window, newest first.
function fetchTransactions(accountIds, start, end) {
  const acctSet = new Set(accountIds);
  return db.table('transactions')
    .filter((t) =>
      t.date >= start && t.date < end &&
      (acctSet.has(t.account_id) || t.source === 'manual'))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// Everything the Home screen needs for one month.
function getDashboard(month) {
  const bankItems = db.table('bank_items').map((b) => ({ id: b.id, institution_name: b.institution_name }));
  const accounts = db.table('accounts');
  const accountIds = accounts.map((a) => a.id);

  const { start, end, key } = monthRange(month);
  const txs = fetchTransactions(accountIds, start, end);

  const income = txs
    .filter((t) => flowOf(t) === 'income')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const spending = txs
    .filter((t) => flowOf(t) === 'expense')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const spendingByCategory = {};
  txs.filter((t) => flowOf(t) === 'expense').forEach((t) => {
    spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + Math.abs(t.amount);
  });

  const incomeByCategory = {};
  txs.filter((t) => flowOf(t) === 'income').forEach((t) => {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + Math.abs(t.amount);
  });

  const netWorth = accounts.reduce((sum, a) => {
    const bal = a.current_balance || 0;
    return a.type === 'credit' ? sum - bal : sum + bal;
  }, 0);

  return {
    month: key,
    bankItems,
    accounts,
    accountIds,
    transactions: txs,
    income,
    spending,
    leftover: income - spending,
    spendingByCategory,
    incomeByCategory,
    balances: summarizeAccounts(accounts),
    netWorth,
  };
}

// Monthly income vs spending for the last N months.
function getTrends(months = 6) {
  const accountIds = db.table('accounts').map((a) => a.id);

  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  const startStr = start.toISOString().split('T')[0];
  const endStr = new Date(Date.UTC(2999, 0, 1)).toISOString().split('T')[0];

  const transactions = fetchTransactions(accountIds, startStr, endStr);

  const byMonth = {};
  transactions.forEach((t) => {
    const month = t.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { month, income: 0, spending: 0 };
    const flow = flowOf(t);
    if (flow === 'income') byMonth[month].income += Math.abs(t.amount);
    else if (flow === 'expense') byMonth[month].spending += Math.abs(t.amount);
  });

  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}

module.exports = { getDashboard, getTrends, monthRange };
