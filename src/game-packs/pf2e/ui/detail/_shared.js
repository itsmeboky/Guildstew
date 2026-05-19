// Shared helpers + render primitives used by every CharacterSheet
// tab. Kept here so per-tab files only need to import what they use
// rather than re-declaring `cap`/`fmtMod`/`sd`/`SectionHeading` six
// times over.

import React from 'react';

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);

// Pull the creator's draft blob off the persisted character record.
// Same name still leaks through — `system_data` IS the blob — so this
// is just defensive null-handling at the call sites.
export const sd = (character) => character?.system_data || {};

// Portrait/token/allies/enemies live flat on `sd` post-J.2 but the
// pre-flatten nested path is checked as a fallback for any records
// that slipped through the migration.
export const media = (sdObj) => ({
  portrait_url: sdObj?.portrait_url ?? sdObj?.system_data?.portrait_url,
  token_url:    sdObj?.token_url    ?? sdObj?.system_data?.token_url,
  allies:       sdObj?.allies       ?? sdObj?.system_data?.allies,
  enemies:      sdObj?.enemies      ?? sdObj?.system_data?.enemies,
});

export function SectionHeading({ children }) {
  return (
    <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase border-b border-pf-brass-dim/30 pb-1 mt-3">
      {children}
    </p>
  );
}

export function StatBlock({ label, value, sub }) {
  return (
    <div className="bg-[#1E2430] border border-pf-brass-dim/40 px-3 py-2 text-center">
      <p className="font-display text-[9px] tracking-[0.18em] text-pf-brass uppercase">{label}</p>
      <p className="font-mono text-xl text-pf-bone tabular-nums leading-tight mt-0.5">{value}</p>
      {sub && <p className="font-mono text-[9px] text-pf-stone">{sub}</p>}
    </div>
  );
}
