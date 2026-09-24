// ============================================================
// Category catalog (mobile side)
// ------------------------------------------------------------
// Maps the stable category_key coming from the backend
// (see backend/services/categorize.js) to an Ionicons name + color
// so every transaction row, donut slice, and legend stays consistent.
// ============================================================
import { Ionicons } from '@expo/vector-icons';

// key -> { label, icon (Ionicons name), color, flow }
export const CATEGORY_META = {
  // ---- Income (greens / teals) ----
  salary:         { label: 'Salary',            icon: 'briefcase',        color: '#3EE6B0', flow: 'income' },
  interest:       { label: 'Interest',          icon: 'trending-up',      color: '#7CE38B', flow: 'income' },
  refund:         { label: 'Refund',            icon: 'return-down-back',  color: '#9BE870', flow: 'income' },
  income_other:   { label: 'Other Income',      icon: 'add-circle',        color: '#5FB7FF', flow: 'income' },

  // ---- Spending ----
  food_delivery:  { label: 'Food Delivery',     icon: 'bicycle',           color: '#FF6E8A', flow: 'expense' },
  dining:         { label: 'Dining',            icon: 'restaurant',        color: '#FF8A6B', flow: 'expense' },
  coffee:         { label: 'Coffee',            icon: 'cafe',              color: '#C98A5E', flow: 'expense' },
  groceries:      { label: 'Groceries',         icon: 'cart',              color: '#FFC663', flow: 'expense' },
  rideshare:      { label: 'Rideshare & Taxi',  icon: 'car-sport',         color: '#8E6BFF', flow: 'expense' },
  transit:        { label: 'Transit',           icon: 'bus',               color: '#7C87FF', flow: 'expense' },
  fuel:           { label: 'Gas & Fuel',        icon: 'flame',             color: '#FF9E6B', flow: 'expense' },
  shopping:       { label: 'Shopping',          icon: 'bag-handle',        color: '#D06BFF', flow: 'expense' },
  subscriptions:  { label: 'Subscriptions',     icon: 'repeat',            color: '#5FB7FF', flow: 'expense' },
  entertainment:  { label: 'Entertainment',     icon: 'game-controller',   color: '#6BC1FF', flow: 'expense' },
  rent:           { label: 'Rent & Housing',    icon: 'home',              color: '#B58BFF', flow: 'expense' },
  utilities:      { label: 'Utilities',         icon: 'flash',             color: '#FFD166', flow: 'expense' },
  phone_internet: { label: 'Phone & Internet',  icon: 'wifi',              color: '#6BE0FF', flow: 'expense' },
  health:         { label: 'Health',            icon: 'fitness',           color: '#4FD6A8', flow: 'expense' },
  travel:         { label: 'Travel',            icon: 'airplane',          color: '#7AA8FF', flow: 'expense' },
  education:      { label: 'Education',          icon: 'school',            color: '#9E8BFF', flow: 'expense' },
  fees:           { label: 'Fees & Charges',    icon: 'alert-circle',      color: '#FF7A7A', flow: 'expense' },
  cash:           { label: 'Cash & ATM',        icon: 'cash',              color: '#A0A8BC', flow: 'expense' },

  // ---- Interac e-Transfers — their own section, not income/spending ----
  interac_in:     { label: 'Interac Received',  icon: 'arrow-down-circle', color: '#FFB84D', flow: 'interac' },
  interac_out:    { label: 'Interac Sent',      icon: 'arrow-up-circle',   color: '#FFB84D', flow: 'interac' },

  // ---- Transfers (muted / neutral) ----
  transfer:       { label: 'Transfer',          icon: 'swap-horizontal',   color: '#8A93A8', flow: 'transfer' },
  cc_payment:     { label: 'Card Payment',      icon: 'card',              color: '#8A93A8', flow: 'transfer' },

  other:          { label: 'Other',             icon: 'ellipsis-horizontal', color: '#8A93A8', flow: 'expense' },
};

// Ordered keys for the category picker (fix-a-category + manual add).
export const INCOME_KEYS = ['salary', 'interest', 'refund', 'income_other'];
export const INTERAC_KEYS = ['interac_in', 'interac_out'];
export const TRANSFER_KEYS = ['transfer', 'cc_payment'];
export const EXPENSE_KEYS = [
  'food_delivery', 'dining', 'coffee', 'groceries', 'rideshare', 'transit', 'fuel',
  'shopping', 'subscriptions', 'entertainment', 'rent', 'utilities', 'phone_internet',
  'health', 'travel', 'education', 'fees', 'cash', 'other',
];

const FALLBACK = CATEGORY_META.other;

// Look up by key; if an old row only has a label, try to match that too.
export function categoryMeta(keyOrLabel) {
  if (!keyOrLabel) return FALLBACK;
  if (CATEGORY_META[keyOrLabel]) return CATEGORY_META[keyOrLabel];
  const lower = String(keyOrLabel).toLowerCase();
  const byLabel = Object.values(CATEGORY_META).find(
    (m) => m.label.toLowerCase() === lower
  );
  return byLabel || FALLBACK;
}

// Resolve a whole transaction to its display meta (prefers category_key).
export function metaForTx(tx) {
  return categoryMeta(tx?.category_key || tx?.category);
}
