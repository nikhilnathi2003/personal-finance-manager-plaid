// One place for every color / radius / spacing choice, so the whole
// app stays consistent and is easy to re-skin later.
export const T = {
  ink: '#060913',          // app background — near-black blue
  surface: 'rgba(255,255,255,0.055)',
  surfaceSolid: '#10141F',
  hairline: 'rgba(255,255,255,0.09)',

  // The aurora — used on the hero card and login backdrop
  aurora: ['#2B1670', '#6D3BF5', '#1C8C86'],
  auroraSheen: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'],

  violet: '#8E6BFF',
  mint: '#3EE6B0',         // income / positive / on-track
  coral: '#FF6E8A',        // spending / negative / over-budget
  gold: '#FFC663',         // warnings
  sky: '#5FB7FF',

  text: '#F3F5FA',
  muted: '#8A93A8',
  faint: '#5A6275',

  radius: 20,
  radiusSm: 13,
  pad: 20,

  chartColors: ['#8E6BFF', '#3EE6B0', '#FF6E8A', '#FFC663', '#5FB7FF', '#FF9E6B', '#6BFFEA', '#D06BFF'],
};

export const money = (n) =>
  '$' + Math.abs(Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
