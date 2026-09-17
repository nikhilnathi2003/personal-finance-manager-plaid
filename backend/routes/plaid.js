const express = require('express');
const router = express.Router();
const plaidClient = require('../services/plaidClient');
const db = require('../services/db');
const { syncBankItem } = require('../services/sync');
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
    res.json({ success: true, bankItemId: bankItem.id });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

module.exports = router;
