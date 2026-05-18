# PF2e Foundry source — pruned mirror

This directory is a stripped-down mirror of the
[foundryvtt/pf2e](https://github.com/foundryvtt/pf2e) repository,
kept here as a build-time data source for the Guildstew Pathfinder 2e
game pack. **Nothing in this directory ships to end users at runtime.**
The build script (`scripts/build-pf2e-pack.mjs`, lands in a follow-up
commit) reads from here and emits trimmed adapter modules into
`src/game-packs/pf2e/{data,content,rules,ui}/` matching the
`src/game-packs/dnd5e/` shape. Those generated modules are what the app
imports.

## License

The foundryvtt/pf2e repository is a **hybrid** of four license terms,
not a single one. The full attribution lives at
[`LICENSES/PATHFINDER_2E.md`](../../../../LICENSES/PATHFINDER_2E.md);
the summary:

| Layer | License | Covers |
|---|---|---|
| Code / logic | Apache 2.0 | Anything ported from the foundryvtt/pf2e TypeScript source |
| Remaster game content | ORC | Player Core, Player Core 2, Monster Core, GM Core, War of Immortals, ongoing remaster migrations |
| Pre-Remaster legacy content | OGL 1.0a | Legacy bestiary entries / items the upstream hasn't migrated yet |
| Paizo trademarks | Paizo Community Use Policy | Pathfinder name, Golarion, deities, location/proper nouns |

This source dump was extracted from a **Remaster-era release** (confirmed
by the presence of `exemplar.json` and `commander.json` — both War of
Immortals classes, post-Remaster-only — and the upstream having moved
fully to Remaster in system release 5.9.0).

The top-level `LICENSE`, `static/LICENSE`, and `static/licenses/` files
are preserved here verbatim to satisfy attribution requirements. When
the generated adapter modules ship in production, the relevant
attribution block also appears in `LICENSES/PATHFINDER_2E.md` and is
surfaced in the Tavern listing for the pack.

## What was kept

| Path | Why |
|---|---|
| `LICENSE`, `README.md` | Attribution + provenance |
| `static/LICENSE`, `static/licenses/` | Dependency licenses (required attribution) |
| `static/icons/{ancestries,classes,class-icons,deities,default-icons,conditions}` | Picker-UI artwork the character creator will display directly |
| `packs/pf2e/ancestries` | Character ancestry list |
| `packs/pf2e/ancestry-features` | Innate per-ancestry traits |
| `packs/pf2e/heritages` | Sub-ancestry options |
| `packs/pf2e/backgrounds` | Background list (gives ability boosts + skill + lore + feat) |
| `packs/pf2e/classes` | Class list |
| `packs/pf2e/class-features` | Per-class feature progression |
| `packs/pf2e/feats` | Class / ancestry / skill / general feats |
| `packs/pf2e/feat-effects` | Feat-driven mechanic effects |
| `packs/pf2e/spells` | Cantrips through 10th-rank spells |
| `packs/pf2e/spell-effects` | Spell-driven mechanic effects |
| `packs/pf2e/equipment` | Weapons, armor, gear, consumables |
| `packs/pf2e/equipment-effects` | Item-driven mechanic effects |
| `packs/pf2e/conditions` | Status conditions (frightened, prone, etc.) |
| `packs/pf2e/deities` | Cleric deity list |
| `packs/pf2e/familiar-abilities` | Pact / familiar abilities |
| `packs/pf2e/actions` | Basic action library (Stride, Strike, Aid, etc.) |
| `packs/pf2e/other-effects` | Generic mechanic effects |

## What was dropped (and why)

- **`build/`, `src/`, `types/`, `tests/`, `eslint.config.js`,
  `jest.config.json`, `tsconfig.json`, `typedoc.json`, `vite.config.ts`,
  `roll-grammar.peggy`, `package.json`, `package-lock.json`** — Foundry's
  TypeScript application code + build tooling. We don't run Foundry; we
  only read the data.
- **`module.pf2e-anachronism.json`, `module.sf2e-anachronism.json`,
  `system.pf2e.json`, `system.sf2e.json`** — Foundry module / system
  manifests, irrelevant outside Foundry's runtime.
- **`CHANGELOG.md`, `CHANGELOG (SF2E).md`, `CONTRIBUTING.md`,
  `.editorconfig`, `.gitattributes`, `.gitignore`, `.prettierrc.json`** —
  Repo-meta files for Foundry contributors.
- **`packs/sf2e/`** — Starfinder 2e content (~33MB). Out of scope.
- **All bestiary / AP / scenario packs** (`*-bestiary`,
  `fall-of-plaguestone`, `kingmaker-features`, `iconics`, `journals`,
  `macros`, `npc-gallery`, `paizo-pregens`, `criticaldeck`, `hazards`,
  `vehicles`, `rollable-tables`, `pathfinder-society-boons`,
  `standalone-adventures`, `boons-and-curses`, `campaign-effects`,
  `adventure-specific-actions`, `action-macros`, `bestiary-*`) —
  monster / encounter / adventure content. Not used by the character
  creator. Easily added back later if a combat/encounter feature
  needs them.
- **`static/assets/`** (23MB), **`static/dice/`**, **`static/fonts/`**,
  **`static/lang/`**, **`static/lib/`**, **`static/templates/`**,
  **`static/template.json`**, **`static/changelog.old`** — Foundry UI
  assets, Handlebars templates, localization bundles, dice
  visualizations. The Guildstew app has its own UI / chrome / fonts.
- **`static/icons/iconics`** (46MB), **`static/icons/equipment`**
  (8.8MB), **`static/icons/spells`** (5.4MB),
  **`static/icons/abilities`** (3.5MB), **`static/icons/features`**
  (2.3MB), **`static/icons/effects`**, **`static/icons/damage`**,
  **`static/icons/actions`**, **`static/icons/unarmed-attacks`**,
  **`static/icons/unidentified_item_icons`**,
  **`static/icons/pathfinder-society`**, **`static/icons/mdi`**,
  **`static/icons/hazards`**, **`static/icons/other`**,
  **`static/icons/conditions-2`** — Foundry's full icon library
  (~73MB). The build script will either hotlink remaining icon
  references to the public foundryvtt/pf2e CDN (`raw.githubusercontent
  .com/foundryvtt/pf2e/master/static/icons/...`) or strip refs entirely.
  The small subset kept above is enough for picker UI.

## Size before / after

- Initial push: **484 MB**
- After prune: **91 MB**

## Updating

When updating to a newer foundryvtt-pf2e release:

1. Clone or pull the upstream repo elsewhere (not inside this folder).
2. `rsync -av --delete` the directories listed in "What was kept" over
   the equivalents here.
3. Re-run the build script (`scripts/build-pf2e-pack.mjs`) to
   regenerate `src/game-packs/pf2e/{data,content,...}`.
4. Commit both the source diff and the generated diff in one PR for
   reproducibility.
