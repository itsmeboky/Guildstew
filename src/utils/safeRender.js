/**
 * Monster / character / spell / action / item data shapes drift
 * wildly — a field expected to be a string can arrive as a number,
 * an object ({ name }, { damage_dice, damage_type }, { type, value }
 * from the 5e-api, `{ desc }`, `{ description }`, ...), or an array.
 * Interpolating any of those directly into JSX crashes React with
 * "Objects are not valid as a React child".
 *
 * `safeText` collapses any of those shapes to a plain string so
 * downstream JSX renders safely. Use it on EVERY dynamic monster /
 * character / action / spell / item field that flows into JSX.
 */
export function safeText(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (Array.isArray(val)) {
    return val.map(safeText).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    if (val.damage_dice) {
      return `${safeText(val.damage_dice)} ${safeText(val.damage_type || '')}`.trim();
    }
    if (val.name) return safeText(val.name);
    if (val.type && val.value !== undefined) {
      return `${safeText(val.type)}: ${safeText(val.value)}`;
    }
    if (val.desc) return safeText(val.desc);
    if (val.description) return safeText(val.description);
    if (val.text) return safeText(val.text);
    if (val.value !== undefined) return safeText(val.value);
    try { return JSON.stringify(val); } catch { return '[object]'; }
  }
  return String(val);
}

// Back-compat alias for earlier call sites that imported `safeRender`
// from the per-component helpers (CombatActionBar / others).
export const safeRender = safeText;
