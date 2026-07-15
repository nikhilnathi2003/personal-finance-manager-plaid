const plaidClient = require('./plaidClient');
const supabase = require('./supabase');

// Pulls the latest transactions + fresh balances for ONE bank connection.
// 90 days of history so the Trends screen and subscription detection
// have enough data to work with.
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

  // Refresh account balances while we're here
  for (const acc of response.data.accounts) {
    await supabase
      .from('accounts')
      .update({
        current_balance: acc.balances.current,
        available_balance: acc.balances.available,
        updated_at: new Date().toISOString(),
      })
      .eq('plaid_account_id', acc.account_id);
  }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, plaid_account_id')
    .eq('bank_item_id', bankItem.id);

  const accountIdMap = Object.fromEntries(
    accounts.map((a) => [a.plaid_account_id, a.id])
  );

  for (const tx of response.data.transactions) {
    const localAccountId = accountIdMap[tx.account_id];
    if (!localAccountId) continue;

    await supabase.from('transactions').upsert(
      {
        account_id: localAccountId,
        plaid_transaction_id: tx.transaction_id,
        amount: tx.amount,
        category: tx.personal_finance_category?.primary || tx.category?.[0] || 'Other',
        merchant_name: tx.merchant_name,
        description: tx.name,
        date: tx.date,
        is_income: tx.amount < 0, // Plaid: negative amount = money IN
      },
      { onConflict: 'plaid_transaction_id' }
    );
  }

  return response.data.transactions.length;
}

async function syncAllUsersTransactions() {
  const { data: bankItems, error } = await supabase.from('bank_items').select('*');
  if (error) throw error;

  for (const item of bankItems) {
    try {
      const count = await syncBankItem(item);
      console.log(`Synced ${count} transactions for bank item ${item.id}`);
    } catch (err) {
      console.error(`Failed to sync bank item ${item.id}:`, err.response?.data || err.message);
    }
  }
}

module.exports = { syncBankItem, syncAllUsersTransactions };
