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

  for (const tx of response.data.transactions) {
    const localAccountId = accountIdMap[tx.account_id];
    if (!localAccountId) continue;

    let { category, categoryKey, is_income } = categorize(tx);

    const ov = overrides[matchKey(tx)];
    if (ov) {
      categoryKey = ov.category_key;
      category = ov.category;
      const entry = CATALOG[ov.category_key];
      if (entry && entry.type !== 'transfer') is_income = entry.type === 'income';
    }

    const row = {
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
    };

    const existing = txs.find((t) => t.plaid_transaction_id === tx.transaction_id);
    if (existing) Object.assign(existing, row);
    else txs.push({ id: db.uid(), ...row });
  }

  await db.save();
  return response.data.transactions.length;
}

async function syncAllUsersTransactions() {
  for (const item of db.table('bank_items')) {
    try {
      const count = await syncBankItem(item);
      console.log(`Synced ${count} transactions for bank item ${item.id}`);
    } catch (err) {
      console.error(`Failed to sync bank item ${item.id}:`, err.response?.data || err.message);
    }
  }
}

module.exports = { syncBankItem, syncAllUsersTransactions };
