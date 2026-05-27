// Shared helpers + render primitives used by every CharacterSheet
// tab. Kept here so per-tab files only need to import what they use
// rather than re-declaring helpers six times over.

import React from 'react';

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);

// Pull the creator's draft blob off the persisted character record.
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

/**
 * Stat card with optional icon + accent color, matching the D&D 5e
 * library detail treatment. Accent tints the icon and value;
 * `tall` switches to a banner shape for HP-style emphasis. The
 * basic plain-box treatment (no icon, no accent) is the original
 * shape — used for saves and ability mods where visual noise would
 * crowd a 6-card grid.
 */
export function StatCard({ icon: Icon, label, value, sub, accent = '#9CA3AF', tall = false }) {
  return (
    <div
      className={`relative rounded-xl text-center border bg-gradient-to-br from-[#2A3441] to-[#1E2430] ${tall ? 'p-5' : 'p-3'}`}
      style={{ borderColor: `${accent}55` }}
    >
      {Icon && <Icon className={`${tall ? 'w-7 h-7' : 'w-5 h-5'} mx-auto mb-1`} style={{ color: accent }} />}
      <p className="font-display text-[10px] tracking-[0.18em] uppercase text-pf-stone">{label}</p>
      <p
        className={`font-mono ${tall ? 'text-4xl' : 'text-2xl'} tabular-nums leading-tight mt-0.5 font-bold`}
        style={{ color: accent }}
      >
        {value}
      </p>
      {sub && <p className="font-mono text-[10px] text-pf-stone mt-0.5">{sub}</p>}
    </div>
  );
}

// Older alias — the original detail view called this StatBlock.
// Kept for backward compat so any imports still resolve; functionally
// identical when no `icon` or `accent` is provided.
export const StatBlock = StatCard;
