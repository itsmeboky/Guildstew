# PF2e Game Pack

Pathfinder Second Edition (Remaster) game pack for Guildstew.

## Status

`0.1.0` — Phase 1 scaffold only. No data, rules, or UI implemented yet.

## Layout

- `config/` — Pack-specific theme tokens.
- `data/` — Transformed Foundry pf2e content (ancestries, classes, feats, spells, etc.).
- `rules/` — Math + prereq helpers (ability scores, derived stats, proficiency).
- `content/` — Homebrew and publisher overrides (per-entity JSON).
- `ui/` — Character creator flow + sheet view + shared components.
- `scripts/` — One-shot Node transformers (e.g. `import-foundry.mjs`).

## Source

Mechanics are sourced from the Foundry VTT pf2e system
(<https://github.com/foundryvtt/pf2e>) and transformed via
`scripts/import-foundry.mjs`. The Foundry repo is cloned outside of
Guildstew and is not committed here.

## Licensing

- **Mechanics:** ORC (Open RPG Creative License). Player Core / Remaster only.
- **Lost Omens setting content (deities, gods, regions):** excluded. Deity
  templates in `data/deities.json` are Guildstew-original.

## Versioning

Bump `PACK_META.version` in `index.js` whenever the data shape changes
or after a Foundry re-import.
