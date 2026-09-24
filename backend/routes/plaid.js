const express = require('express');
const router = express.Router();
const plaidClient = require('../services/plaidClient');
const db = require('../services/db');
const { syncBankItem, reconcileTransfers } = require('../services/sync');
const { CountryCode, Products } = require('plaid');

// STEP 1: get a link_token to open Plaid's secure bank-login widget.
router.post('/create-link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'local-user' },
      client_name: 'The Vault',
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca],
      language: 'en',
      android_package_name: 'com.nikhilnathi.thevault',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// STEP 2: exchange the public_token for a permanent access_token,
// store the accounts locally, and run the first sync immediately.
router.post('/exchange-public-token', async (req, res) => {
  const { publicToken, institutionName } = req.body;
  if (!publicToken) {
    return res.status(400).json({ error: 'publicToken is required' });
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const bankItem = {
      id: db.uid(),
      plaid_item_id: itemId,
      plaid_access_token: accessToken,
      institution_name: institutionName || 'Unknown bank',
      created_at: new Date().toISOString(),
    };
    db.table('bank_items').push(bankItem);

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    for (const acc of accountsResponse.data.accounts) {
      db.table('accounts').push({
        id: db.uid(),
        bank_item_id: bankItem.id,
        plaid_account_id: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        current_balance: acc.balances.current,
        available_balance: acc.balances.available,
      });
    }
    await db.save();

    await syncBankItem(bankItem);
    reconcileTransfers();
    await db.save();
    res.json({ success: true, bankItemId: bankItem.id });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Reconnect a bank whose login expired (ITEM_LOGIN_REQUIRED). Plaid's
// "update mode": you log in again on the bank's page and the SAME
// connection resumes — no re-adding, no new slot used, history kept.
router.post('/update-link-token/:id', async (req, res) => {
  const item = db.table('bank_items').find((b) => b.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Bank not found' });
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'local-user' },
      client_name: 'The Vault',
      country_codes: [CountryCode.Ca],
      language: 'en',
      access_token: item.plaid_access_token, // update mode: no products
      android_package_name: 'com.nikhilnathi.thevault',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to start reconnect' });
  }
});

// Remove a linked bank: deletes its accounts + transactions locally and
// tells Plaid to drop the item. Manual (cash) entries are untouched.
router.delete('/items/:id', async (req, res) => {
  const id = req.params.id;
  const items = db.table('bank_items');
  const item = items.find((b) => b.id === id);
  if (!item) return res.status(404).json({ error: 'Bank not found' });

  // Best-effort: tell Plaid to remove the item (tidy; sandbox tokens just error).
  try { await plaidClient.itemRemove({ access_token: item.plaid_access_token }); } catch (e) {}

  const acctIds = new Set(db.table('accounts').filter((a) => a.bank_item_id === id).map((a) => a.id));
  const txs = db.table('transactions');
  for (let i = txs.length - 1; i >= 0; i--) {
    if (acctIds.has(txs[i].account_id)) txs.splice(i, 1);
  }
  const accts = db.table('accounts');
  for (let i = accts.length - 1; i >= 0; i--) {
    if (accts[i].bank_item_id === id) accts.splice(i, 1);
  }
  const idx = items.findIndex((b) => b.id === id);
  if (idx !== -1) items.splice(idx, 1);

  await db.save();
  res.json({ success: true });
});

module.exports = router;
