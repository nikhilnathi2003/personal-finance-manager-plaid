// ============================================================
// Categorization engine
// ------------------------------------------------------------
// Turns a raw Plaid transaction into a friendly, specific category
// (e.g. "Food Delivery", "Rideshare & Taxi", "Salary", "Interac
// e-Transfer") plus a stable key the mobile app maps to an icon +
// color, and a corrected income/expense flag.
//
// Priority order when deciding a category:
//   1. Canadian description rules (Interac, payroll, interest…)
//   2. Known merchant name  (Uber Eats vs Uber vs Tim Hortons…)
//   3. Plaid's DETAILED personal-finance category
//   4. Plaid's PRIMARY category  (coarse fallback)
//   5. "Other"
// ============================================================

// The catalog. `key` is the stable id stored in the DB and shared
// with the mobile app (see mobile/utils/categories.js). `type` tells
// the dashboard whether it counts as income, spending, or an internal
// transfer that should be excluded from both totals.
const CATALOG = {
  // ---- Income ----
  salary:            { key: 'salary',            label: 'Salary',            type: 'income' },
  interac_in:        { key: 'interac_in',        label: 'Interac e-Transfer', type: 'income' },
  interest:          { key: 'interest',          label: 'Interest',          type: 'income' },
  refund:            { key: 'refund',            label: 'Refund',            type: 'income' },
  income_other:      { key: 'income_other',      label: 'Other Income',      type: 'income' },

  // ---- Spending ----
  food_delivery:     { key: 'food_delivery',     label: 'Food Delivery',     type: 'expense' },
  dining:            { key: 'dining',            label: 'Dining',            type: 'expense' },
  coffee:            { key: 'coffee',            label: 'Coffee',            type: 'expense' },
  groceries:         { key: 'groceries',         label: 'Groceries',         type: 'expense' },
  rideshare:         { key: 'rideshare',         label: 'Rideshare & Taxi',  type: 'expense' },
  transit:           { key: 'transit',           label: 'Transit',           type: 'expense' },
  fuel:              { key: 'fuel',              label: 'Gas & Fuel',        type: 'expense' },
  shopping:          { key: 'shopping',          label: 'Shopping',          type: 'expense' },
  subscriptions:     { key: 'subscriptions',     label: 'Subscriptions',     type: 'expense' },
  entertainment:     { key: 'entertainment',     label: 'Entertainment',     type: 'expense' },
  rent:              { key: 'rent',              label: 'Rent & Housing',    type: 'expense' },
  utilities:         { key: 'utilities',         label: 'Utilities',         type: 'expense' },
  phone_internet:    { key: 'phone_internet',    label: 'Phone & Internet',  type: 'expense' },
  health:            { key: 'health',            label: 'Health',            type: 'expense' },
  travel:            { key: 'travel',            label: 'Travel',            type: 'expense' },
  education:         { key: 'education',         label: 'Education',         type: 'expense' },
  fees:              { key: 'fees',              label: 'Fees & Charges',    type: 'expense' },
  cash:              { key: 'cash',              label: 'Cash & ATM',        type: 'expense' },

  // ---- Transfers (excluded from income/spend totals) ----
  interac_out:       { key: 'interac_out',       label: 'Interac Sent',      type: 'transfer' },
  transfer:          { key: 'transfer',          label: 'Transfer',          type: 'transfer' },
  cc_payment:        { key: 'cc_payment',        label: 'Card Payment',      type: 'transfer' },

  other:             { key: 'other',             label: 'Other',             type: 'expense' },
};

// Known merchants → category key. Matched as a case-insensitive
// substring of merchant_name OR the raw description.
const MERCHANT_RULES = [
  // Food delivery
  [/uber\s*eats|ubereats/, 'food_delivery'],
  [/doordash|door dash/, 'food_delivery'],
  [/skip\s*the\s*dishes|skipthedishes/, 'food_delivery'],
  [/grubhub|postmates|foodora|instacart/, 'food_delivery'],
  // Rideshare & taxi  (note: plain "uber" AFTER uber eats above)
  [/\buber\b|\blyft\b/, 'rideshare'],
  [/taxi|\bcab\b|beck\b/, 'rideshare'],
  // Coffee
  [/tim\s*hortons|starbucks|second cup|mccafe|coffee/, 'coffee'],
  // Groceries
  [/loblaws|no frills|nofrills|metro|sobeys|freshco|food basics|foodbasics|superstore|costco|walmart\s*supercentre|zehrs|farm boy|farmboy|save-on|safeway|t&t|whole foods/, 'groceries'],
  // Transit
  [/presto|ttc|go transit|via rail|translink|compass|stm\b|oc transpo/, 'transit'],
  // Fuel
  [/petro|esso|shell|husky|chevron|ultramar|gas\b|pioneer energy/, 'fuel'],
  // Subscriptions / streaming
  [/netflix|spotify|disney|crave|amazon prime|prime video|youtube premium|apple\.com\/bill|apple music|icloud|hbo|paramount|audible|patreon|onlyfans|dropbox|google (one|storage)|adobe|notion|chatgpt|openai|claude|anthropic/, 'subscriptions'],
  // Phone & internet
  [/rogers|bell canada|\bbell\b|telus|freedom mobile|fido|koodo|virgin plus|videotron|shaw|lucky mobile/, 'phone_internet'],
  // Shopping
  [/amazon|amzn|\bebay\b|aliexpress|best buy|bestbuy|the bay|hudson|winners|marshalls|ikea|canadian tire|dollarama|indigo|shoppers drug|sephora|zara|h&m|uniqlo|nike|adidas|lululemon/, 'shopping'],
  // Entertainment
  [/cineplex|steam|playstation|xbox|nintendo|epic games|riot|twitch|ticketmaster|stubhub/, 'entertainment'],
  // Health
  [/pharmacy|rexall|jean coutu|dental|clinic|physio|gym|goodlife|fit4less|la fitness/, 'health'],
];

// Canadian description keyword rules. Checked FIRST because Interac /
// payroll show up as generic "TRANSFER" in Plaid categories.
function fromDescription(text, amountIn) {
  const t = text.toLowerCase();

  if (/interac|e-?transfer|etrsf|email trfs|virement/.test(t)) {
    return amountIn ? 'interac_in' : 'interac_out';
  }
  if (amountIn && /(payroll|paie|direct deposit|dir dep|salary|wages|adp|payroll dep)/.test(t)) {
    return 'salary';
  }
  if (amountIn && /interest|int pd|intérêt/.test(t)) return 'interest';
  if (amountIn && /(refund|remb|reversal|return)/.test(t)) return 'refund';

  if (/(pre-?auth|preauth).*(payment|pmt)|credit card pay|mastercard|visa desjardins|payment - thank you|paiement/.test(t)) {
    return 'cc_payment';
  }
  if (/(nsf|overdraft|service charge|monthly fee|account fee|frais)/.test(t)) return 'fees';
  if (/(atm|withdrawal|retrait|cash advance|abm)/.test(t)) return 'cash';
  if (/rent|loyer|landlord/.test(t)) return 'rent';
  return null;
}

// Plaid DETAILED personal_finance_category → our key.
// (Detailed strings look like FOOD_AND_DRINK_FAST_FOOD.)
const DETAILED_MAP = {
  INCOME_WAGES: 'salary',
  INCOME_DIVIDENDS: 'income_other',
  INCOME_INTEREST_EARNED: 'interest',
  INCOME_RETIREMENT_PENSION: 'income_other',
  INCOME_TAX_REFUND: 'refund',
  INCOME_UNEMPLOYMENT: 'income_other',
  INCOME_OTHER_INCOME: 'income_other',

  TRANSFER_IN_CASH_ADVANCES_AND_LOANS: 'income_other',
  TRANSFER_IN_DEPOSIT: 'income_other',
  TRANSFER_IN_ACCOUNT_TRANSFER: 'transfer',
  TRANSFER_IN_OTHER_TRANSFER_IN: 'transfer',
  TRANSFER_OUT_ACCOUNT_TRANSFER: 'transfer',
  TRANSFER_OUT_OTHER_TRANSFER_OUT: 'transfer',
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: 'cc_payment',

  FOOD_AND_DRINK_FAST_FOOD: 'dining',
  FOOD_AND_DRINK_RESTAURANT: 'dining',
  FOOD_AND_DRINK_COFFEE: 'coffee',
  FOOD_AND_DRINK_GROCERIES: 'groceries',
  FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR: 'dining',
  FOOD_AND_DRINK_VENDING_MACHINES: 'dining',
  FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK: 'dining',

  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: 'rideshare',
  TRANSPORTATION_PUBLIC_TRANSIT: 'transit',
  TRANSPORTATION_GAS: 'fuel',
  TRANSPORTATION_PARKING: 'transit',
  TRANSPORTATION_TOLLS: 'transit',
  TRANSPORTATION_BIKES_AND_SCOOTERS: 'transit',
  TRANSPORTATION_OTHER_TRANSPORTATION: 'transit',

  TRAVEL_FLIGHTS: 'travel',
  TRAVEL_LODGING: 'travel',
  TRAVEL_RENTAL_CARS: 'travel',
  TRAVEL_OTHER_TRAVEL: 'travel',

  RENT_AND_UTILITIES_RENT: 'rent',
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: 'phone_internet',
  RENT_AND_UTILITIES_TELEPHONE: 'phone_internet',
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: 'utilities',
  RENT_AND_UTILITIES_WATER: 'utilities',
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE: 'utilities',
  RENT_AND_UTILITIES_OTHER_UTILITIES: 'utilities',

  GENERAL_MERCHANDISE_ONLINE_MARKETPLACES: 'shopping',
  GENERAL_MERCHANDISE_ELECTRONICS: 'shopping',
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: 'shopping',
  GENERAL_MERCHANDISE_DEPARTMENT_STORES: 'shopping',
  GENERAL_MERCHANDISE_DISCOUNT_STORES: 'shopping',
  GENERAL_MERCHANDISE_SPORTING_GOODS: 'shopping',
  GENERAL_MERCHANDISE_SUPERSTORES: 'groceries',
  GENERAL_MERCHANDISE_CONVENIENCE_STORES: 'shopping',
  GENERAL_MERCHANDISE_PET_SUPPLIES: 'shopping',
  GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE: 'shopping',

  ENTERTAINMENT_VIDEO_GAMES: 'entertainment',
  ENTERTAINMENT_MOVIES_AND_DVDS: 'entertainment',
  ENTERTAINMENT_MUSIC_AND_AUDIO: 'subscriptions',
  ENTERTAINMENT_TV_AND_MOVIES: 'subscriptions',
  ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS: 'entertainment',
  ENTERTAINMENT_CASINOS_AND_GAMBLING: 'entertainment',
  ENTERTAINMENT_OTHER_ENTERTAINMENT: 'entertainment',

  PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS: 'health',
  MEDICAL_PRIMARY_CARE: 'health',
  MEDICAL_DENTAL_CARE: 'health',
  MEDICAL_PHARMACIES_AND_SUPPLEMENTS: 'health',
  MEDICAL_EYE_CARE: 'health',
  MEDICAL_VETERINARY_SERVICES: 'health',
  MEDICAL_OTHER_MEDICAL: 'health',

  GENERAL_SERVICES_EDUCATION: 'education',
  GENERAL_SERVICES_INSURANCE: 'utilities',
  BANK_FEES_ATM_FEES: 'fees',
  BANK_FEES_OVERDRAFT_FEES: 'fees',
  BANK_FEES_OTHER_BANK_FEES: 'fees',
  BANK_FEES_FOREIGN_TRANSACTION_FEES: 'fees',
  BANK_FEES_INSUFFICIENT_FUNDS: 'fees',
};

// Plaid PRIMARY category → our key (coarse fallback).
const PRIMARY_MAP = {
  INCOME: 'income_other',
  TRANSFER_IN: 'transfer',
  TRANSFER_OUT: 'transfer',
  LOAN_PAYMENTS: 'cc_payment',
  BANK_FEES: 'fees',
  ENTERTAINMENT: 'entertainment',
  FOOD_AND_DRINK: 'dining',
  GENERAL_MERCHANDISE: 'shopping',
  GENERAL_SERVICES: 'other',
  GOVERNMENT_AND_NON_PROFIT: 'other',
  MEDICAL: 'health',
  PERSONAL_CARE: 'health',
  RENT_AND_UTILITIES: 'utilities',
  TRANSPORTATION: 'transit',
  TRAVEL: 'travel',
};

function matchMerchant(text) {
  const t = text.toLowerCase(); // rules are written lowercase
  for (const [re, key] of MERCHANT_RULES) {
    if (re.test(t)) return key;
  }
  return null;
}

/**
 * Categorize one Plaid transaction.
 * @param {object} tx  a raw transaction from plaidClient.transactionsGet
 * @returns {{ categoryKey: string, category: string, is_income: boolean, type: string }}
 */
function categorize(tx) {
  // Plaid convention on depository accounts: negative amount = money IN.
  const amountIn = tx.amount < 0;
  const merchant = tx.merchant_name || '';
  const name = tx.name || '';
  const haystack = `${merchant} ${name}`;
  const pfc = tx.personal_finance_category || {};
  const detailed = pfc.detailed || '';
  const primary = pfc.primary || (tx.category && tx.category[0]) || '';

  let key =
    fromDescription(haystack, amountIn) ||
    matchMerchant(haystack) ||
    DETAILED_MAP[detailed] ||
    PRIMARY_MAP[primary] ||
    'other';

  const entry = CATALOG[key] || CATALOG.other;

  // Decide income vs expense from the resolved category's type, but
  // always trust the money direction as the tie-breaker: a "transfer"
  // that actually brought money in still shows in the ledger, and a
  // category tagged income can't apply to money going out.
  let is_income;
  if (entry.type === 'income') is_income = true;
  else if (entry.type === 'expense') is_income = false;
  else is_income = amountIn; // transfer: follow the money direction

  return { categoryKey: key, category: entry.label, is_income, type: entry.type };
}

// A stable key for "the same merchant" so a category correction on one
// transaction can apply to every other charge from that merchant.
// Uses merchant_name when Plaid provides it, else the raw description,
// lowercased and stripped of store numbers / punctuation noise.
function matchKey(tx) {
  const base = (tx.merchant_name || tx.name || tx.description || '').toLowerCase();
  return base
    .replace(/[#*].*$/, '')          // drop "#4821", "*order id"
    .replace(/\b\d{2,}\b/g, '')       // drop long digit runs (store/txn ids)
    .replace(/[^a-z0-9&' ]+/g, ' ')   // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { categorize, CATALOG, matchKey };
