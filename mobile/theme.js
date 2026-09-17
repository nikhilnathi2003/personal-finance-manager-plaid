// ============================================================
// Design system — one source of truth for color, type, space,
// radius, elevation and MOTION. Dark-first (the app is a deep-space
// dark UI). Every token the older screens already use is preserved,
// with a richer layer of tokens added on top.
// ============================================================
export const T = {
  // ---- Base surfaces (layered depth) ----
  ink: '#060913',          // app background — near-black blue
  ink2: '#0A0F1C',         // one step up, for grouped sections
  surface: 'rgba(255,255,255,0.055)', // translucent glass surface
  surface2: 'rgba(255,255,255,0.085)', // elevated glass
  surfaceSolid: '#10141F', // opaque surface (tab bar, sheets)
  elevated: '#151B2B',     // highest opaque surface (modals)
  hairline: 'rgba(255,255,255,0.09)',
  hairlineStrong: 'rgba(255,255,255,0.16)',

  // ---- Signature gradients ----
  aurora: ['#2B1670', '#6D3BF5', '#1C8C86'],
  auroraSheen: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'],
  chequingGrad: ['#3A2A8C', '#6D3BF5'], // violet card
  savingsGrad: ['#0F5C55', '#1FB89E'],  // teal/mint card

  // ---- Accents & semantics ----
  violet: '#8E6BFF',
  violetDim: 'rgba(142,107,255,0.16)',
  mint: '#3EE6B0',         // income / positive / on-track
  coral: '#FF6E8A',        // spending / negative / over-budget
  gold: '#FFC663',         // warnings
  sky: '#5FB7FF',
  success: '#3EE6B0',
  warning: '#FFC663',
  error: '#FF6E8A',

  // ---- Text ----
  text: '#F3F5FA',
  muted: '#8A93A8',
  faint: '#5A6275',

  // ---- Radius scale ----
  radius: 20,
  radiusSm: 13,
  radiusLg: 26,
  radiusXl: 32,
  pill: 999,

  // ---- Spacing scale (4pt base) ----
  pad: 20,                 // legacy screen padding
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 44 },

  chartColors: ['#8E6BFF', '#3EE6B0', '#FF6E8A', '#FFC663', '#5FB7FF', '#FF9E6B', '#6BFFEA', '#D06BFF'],
};

// ---- Typography scale ----
export const type = {
  hero:  { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  h1:    { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  h2:    { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 18, fontWeight: '700' },
  body:  { fontSize: 15, fontWeight: '500' },
  meta:  { fontSize: 12, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
};

// ---- Elevation presets (soft, layered shadows) ----
export const elevation = {
  low:  { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  med:  { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  high: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 34, shadowOffset: { width: 0, height: 18 }, elevation: 18 },
  glow: (c) => ({ shadowColor: c, shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 12 }),
};

// ---- Motion system ----
// Durations answer "how big is this move?" and springs give it physics.
export const motion = {
  fast: 180,   // taps, toggles, small state changes
  base: 320,   // standard element transitions
  slow: 560,   // large spatial / hero transitions
  // Reanimated spring configs
  soft:   { damping: 18, stiffness: 140, mass: 0.9 },  // calm settle
  snappy: { damping: 20, stiffness: 260, mass: 0.8 },  // responsive UI
  bouncy: { damping: 10, stiffness: 180, mass: 0.9 },  // playful, for celebrations
  press:  { damping: 26, stiffness: 380, mass: 0.7 },  // button compression
};

export const money = (n) =>
  '$' + Math.abs(Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Compact money for tight spots: $1.2k, $34.5k
export const moneyShort = (n) => {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1000) return '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
  return '$' + v.toFixed(0);
};
