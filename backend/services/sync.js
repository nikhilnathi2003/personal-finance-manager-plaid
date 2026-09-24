const plaidClient = require('./plaidClient');
const db = require('./db');
const { categorize, matchKey, CATALOG } = require('./categorize');

// Pulls the latest transactions + fresh balances for ONE bank connection
// into the local store. 90 days of history so Trends and subscription
// detection have enough to work with.
async function syncBankItem(bankItem) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  const endDate = new Date();

  const response = await plaidClient.transactionsGet({
    access_token: bankItem.plaid_access_token,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    options: { count: 500 },
  });

  const accounts = db.table('accounts');

  // Refresh balances on the accounts we already have.
  for (const acc of response.data.accounts) {
    const local = accounts.find((a) => a.plaid_account_id === acc.account_id);
    if (local) {
      local.current_balance = acc.balances.current;
      local.available_balance = acc.balances.available;
      local.updated_at = new Date().toISOString();
    }
  }

  const accountIdMap = {};
  accounts
    .filter((a) => a.bank_item_id === bankItem.id)
    .forEach((a) => { accountIdMap[a.plaid_account_id] = a.id; });

  // Your saved category corrections, keyed by merchant.
  const overrides = Object.fromEntries(db.table('overrides').map((o) => [o.match_key, o]));
  const txs = db.table('transactions');
  const startStr = startDate.toISOString().split('T')[0];
  const itemAccountIds = new Set(Object.values(accountIdMap));

  // RECONCILE: drop this bank's transactions inside the synced window, then
  // rebuild them from Plaid's current response. Without this, a charge that
  // goes pending -> posted (Plaid changes its id) lingers as a DUPLICATE and
  // inflates spending. Manual (cash) entries and other banks are left alone.
  for (let i = txs.length - 1; i >= 0; i--) {
    const t = txs[i];
    if (t.source !== 'manual' && itemAccountIds.has(t.account_id) && t.date >= startStr) {
      txs.splice(i, 1);
    }
  }

  for (const tx of response.data.transactions) {
    const localAccountId = accountIdMap[tx.account_id];
    if (!localAccountId) continue;

    let { category, categoryKey, is_income } = categorize(tx);

    const ov = overrides[matchKey(tx)];
    if (ov) {
      categoryKey = ov.category_key;
      category = ov.category;
      const entry = CATALOG[ov.category_key];
      if (entry) {
        // income/expense are fixed; transfers and Interac follow the money direction
        is_income = entry.type === 'income' ? true : entry.type === 'expense' ? false : tx.amount < 0;
      }
    }

    txs.push({
      id: db.uid(),
      account_id: localAccountId,
      plaid_transaction_id: tx.transaction_id,
      amount: tx.amount,
      category,
      category_key: categoryKey,
      merchant_name: tx.merchant_name,
      description: tx.name,
      date: tx.date,
      is_income,
      source: 'plaid',
    });
  }

  await db.save();
  return response.data.transactions.length;
}

// Detect money you moved between YOUR OWN linked accounts (an e-transfer
// or transfer out of one account matched by an in of the same amount into
// another, within a few days) and mark both sides as an internal Transfer
// so they're excluded from income AND spending. Runs after a sync.
function reconcileTransfers() {
  const txs = db.table('transactions').filter((t) => t.source !== 'manual');
  const transferish = (t) =>
    ['interac_in', 'interac_out', 'transfer', 'cc_payment'].includes(t.category_key);

  const outs = txs.filter((t) => transferish(t) && t.amount > 0);   // money out
  const ins = txs.filter((t) => transferish(t) && t.amount < 0);    // money in
  const usedIn = new Set();

  for (const o of outs) {
    const match = ins.find((i) =>
      !usedIn.has(i.id) &&
      i.account_id !== o.account_id &&
      Math.abs(Math.abs(i.amount) - Math.abs(o.amount)) < 0.01 &&
      Math.abs(new Date(i.date) - new Date(o.date)) <= 3 * 86400000);
    if (!match) continue;
    usedIn.add(match.id);
    for (const [t, income] of [[o, false], [match, true]]) {
      t.category = 'Transfer';
      t.category_key = 'transfer';
      t.is_income = income;
    }
  }
}

// Syncs every linked bank in parallel and records each one's status, so a
// broken connection (e.g. CIBC asking you to log in again) is visible in
// the app instead of silently showing stale numbers.
async function syncAllUsersTransactions() {
  const items = db.table('bank_items');
  const results = await Promise.allSettled(items.map((item) => syncBankItem(item)));
  const now = new Date().toISOString();

  const summary = items.map((item, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      item.error_code = null;
      item.last_synced_at = now;
      return { id: item.id, name: item.institution_name, ok: true, count: r.value };
    }
    const err = r.reason;
    item.error_code = err?.response?.data?.error_code || 'SYNC_FAILED';
    item.error_at = now;
    console.error(`Failed to sync ${item.institution_name}:`, err?.response?.data || err?.message);
    return { id: item.id, name: item.institution_name, ok: false, error: item.error_code };
  });

  reconcileTransfers();
  await db.save();
  return summary;
}

module.exports = { syncBankItem, syncAllUsersTransactions, reconcileTransfers };
