// VTM-scoped color palette. Lifted from the prototype's `V`
// constant. The platform's existing design tokens
// (tailwind.config.js theme.colors.creator) don't cover the
// glass / blood-neon / parchment / outline-stroke aesthetic the
// pf2e pack already established its own tokens for; this file is
// the VTM analogue, exported as a single object and re-published as
// CSS variables by theme/GlobalStyles.jsx so utility-style classes
// (.v-card, .v-btn, .v-input, etc.) can reference them.

export const V = {
  bg: '#03020a', bgDeep: '#01000a', bgWarm: '#0a0408',
  surface: '#120612', surfaceLi: '#1a0a14', surfaceHi: '#241024',
  // Glass alphas: 0.6 is the readability floor for any creator panel
  // that holds text — below that the patterned background bleeds
  // through and the text fights with it. `glass` was at 0.55 and
  // visibly let the chrome through; bumped to 0.6 to match
  // `glassWarm` and clear the legibility threshold. `glassDeep` at
  // 0.78 is already well above and stays — it's the heavyweight
  // surface used for content cards with dense information.
  glass: 'rgba(15, 8, 18, 0.6)',
  glassDeep: 'rgba(8, 4, 12, 0.78)',
  glassWarm: 'rgba(26, 12, 18, 0.6)',
  edgeRed: 'rgba(196, 30, 58, 0.4)',
  edgeRedDim: 'rgba(196, 30, 58, 0.22)',
  edgeTeal: 'rgba(34, 211, 238, 0.3)',
  edgeGold: 'rgba(184, 152, 90, 0.35)',
  blood: '#8b1a1a', bloodBri: '#c41e3a', bloodNeon: '#ff2d3f',
  bloodDeep: '#3a0a10', bloodInk: '#5a0e14',
  teal: '#1d9e75', tealBri: '#5DCAA5',
  cyan: '#22d3ee', cyanSoft: '#67e8f9', cyanDeep: '#0a3a4a',
  night: '#1a0e2e',
  text: '#e8dcc8', textBri: '#ffffff', textBone: '#d8c8a8',
  textMuted: '#8a7a68', textDim: '#5a4a38',
  gold: '#b8985a', goldBri: '#d4b06a', goldDim: '#7a6438',
  parchment: '#e8dcc4', parchOld: '#c9b98e', parchInk: '#3a2818',
};
