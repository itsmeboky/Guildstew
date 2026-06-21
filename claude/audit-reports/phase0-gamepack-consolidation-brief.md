# Phase 0 — GamePack Consolidation Brief (Import-Graph Recon)

**Companion to:** *Phase 0 — Unified GamePack Contract* (the spec) and *Brewery Multi-System Audit* (`claude/audit-reports/brewery-multisystem-audit.md`).

**Purpose.** Map the full import graph behind the three pack roots and the `getGamePack` collision, then specify the **cleanest** end state that satisfies the contract — optimizing for a correct final architecture even where that means touching adjacent systems, with the pragmatic zero-break execution path called out alongside.

**Decisions locked (from the requester):** single pack home = **`src/game-packs/`**; deliverable = **audit/brief only** (no code moved). This is read-only — no source file was modified (the sole new file is this report).

**Method.** Every consumer table below is grep/read-confirmed with `path:line` anchors. Where a count is given it is the grep hit count on the working tree at this commit.

---

## 0. TL;DR — what the recon changes about the plan

The spec is directionally right but **two of its assumptions are wrong against the current tree**, and one structural fact makes the job *easier* than the spec assumed:

1. **❌ "Delete `src/game-packs/dnd5e/` — the unused Combat Engine v2 draft."** Only `src/game-packs/dnd5e/index.js` (the summary object) is unconsumed. Its **`data/`, `rules/`, `ui/`, `content/` subdirs are live in production** — consumed through an *already-built shim layer*. Deleting the directory would break GMPanel, the combat engine, and the homebrew dialog. **Correction: delete only `index.js`; keep and build on the subdirs.**
2. **✅ The D&D migration is already half-done.** `src/components/dnd5e/*` and `src/components/combat/*` already contain `export *` **shims** forwarding to `src/game-packs/dnd5e/...` (itemData, abilityData, conditions, classFeatures, armorClass, actionResolver, equipmentRules, CombatActionBar). This is the exact zero-break pattern Phase 0 needs — it's a *precedent to extend*, not invent.
3. **❌ "matching keys everywhere" is violated today and the spec's own key table is internally inconsistent for VTM.** VTM is `vtm` (dir) / `world_of_darkness` (registry key + `PACK_META.id`) / `vtm` (`family`). Pathfinder is `pathfinder_2e` (key + `PACK_META.id`) / `pf2e` (dir + `family`). Aligning these is the single highest-value, highest-risk-of-stale-data part of the move (entitlement slugs + stored `game_system`/`game_pack` strings reference the old ids).

Net: the contract is achievable, the data-layer skeleton already exists under `src/game-packs/`, and the bulk of the work is **(a) collapsing three accessors into one, (b) renaming two packs to their canonical keys, and (c) folding the big D&D rules modules into the pack via the existing shim pattern.**

---

## 1. Current state — three roots, one already bridging to another

| Root | Role today | Accessor(s) | Launch packs present |
|---|---|---|---|
| `src/config/gamePacks.js` | **Metadata catalog** (display, status, routes, entitlement slugs, lazy creator/sheet) | `getGamePack` (metadata), `GAME_PACKS`, `GAME_PACK_ORDER`, `getOwnedGamePacks`, `getUpcomingGamePacks`, `ID_ALIASES` | all 3 + 4 coming-soon |
| `src/data/games/` | **Data-adapter registry** (method bags: equipment/classes/subclasses) | `getGamePackData`, `getGamePack` (alias), `listGamePackIds` | `dnd5e_2014`, `dnd5e_2024` (real); `pathfinder_2e` (equipment **stub**) |
| `src/game-packs/` | **Rich pack pattern** (`PACK_META`, content getters, lazy UI) | per-pack `index.js` exports; no central accessor | `pf2e` (real), `vtm` (status pending), `dnd5e` (data subdirs live, `index.js` unconsumed) |

**The crucial cross-link:** `src/data/games/dnd5e_2014/index.js` is a *thin adapter* that imports the actual rules from `src/components/dnd5e/*` (`src/data/games/dnd5e_2014/index.js:20,46,54,61,65` pull `dnd5eRules`, `raceData`, `backgroundData`, …), which in turn **shim** to `src/game-packs/dnd5e/*`. So a single 2014 equipment call already traverses `data/games → components/dnd5e → game-packs/dnd5e`. That three-hop chain is the split-brain made concrete.

### 1.1 Registry shape (metadata) — `src/config/gamePacks.js`
- `GAME_PACKS` keys (`:21`–`:168`): `dnd5e_2014`, `dnd5e_2024`, `pathfinder_2e`, `world_of_darkness`, `mork_borg`, `cyborg`, `kids_on_bikes`.
- Per-entry fields: `id, family, name, short/shortName, tagAbbreviation, tagline, description, accent/accentColor, icon, status, creatorRoute?, detailComponent?, entitlementSlug?, license?, creator?(lazy), sheet?(lazy), meta?(lazy)`.
- `status`: `dnd5e_2014/2024/pathfinder_2e = "available"`; `world_of_darkness/mork_borg/cyborg/kids_on_bikes = "coming_soon"` (`:35,62,81,123,146,157,168`).
- `ID_ALIASES = { dnd5e: "dnd5e_2014", pf2e: "pathfinder_2e" }` (`:189`), resolved in `getGamePack` (`:196`).
- Exports: `getGamePack` (`:194`), `getOwnedGamePacks` (`:200`), `getUpcomingGamePacks` (`:214`), `GAME_PACKS` (`:20`), `GAME_PACK_ORDER` (`:176`).

### 1.2 Adapter shape (data) — `src/data/games/index.js`
- `ADAPTERS` registry (`:73`–`:116`); method bags:
  - `dnd5e_2014`: equipment getters only.
  - `dnd5e_2024`: equipment + `getClasses/getClassByName/getSubclassesForClass/getSubclassFeaturesAtLevel/...` + `rules` namespace.
  - `pathfinder_2e`: equipment getters only (**stub**).
- Exports: `getGamePackData` (`:133`), `getGamePack = getGamePackData` (`:139`, the alias), `listGamePackIds` (`:142`).

### 1.3 Rich pack shape — `src/game-packs/*/index.js`
- `pf2e/index.js`: `PACK_META` (`:35`, `id:"pathfinder_2e"`), `pf2eGamePack` with `content` getters (`ancestries/heritages/backgrounds/classes/deities/domains/languages`, `:75`–`:99`) and `rules:{resolveAction:null, armorClass:null}`; `export { CharacterCreatorFlow, CharacterSheet }` (`:66`–`:67`); `export * from "./data/index.js"` (`:31`).
- `vtm/index.js`: `PACK_META` (`:28`, `id:"world_of_darkness"`, `family:"vtm"`, `ready:false`); `export { CharacterCreatorFlow, CharacterDetail, ... }` (`:49`–`:59`); `export * from "./data/index.js"`.
- `dnd5e/index.js`: header says *"NOT YET CONSUMED IN PRODUCTION"* (`:1`–`:15`); default-exports a config object (`:105`). **The object is unconsumed; the sibling subdirs are not.**

---

## 2. The `getGamePack` collision — resolved cleanly

**No file imports both** `getGamePack`s, so there is no active shadowing bug — but the two functions return different things, which blocks a literal merge under one name unless call sites are reconciled.

- **Data-adapter `getGamePack`** (`@/data/games`) — 3 call sites:
  - `src/pages/CampaignItems.jsx:20`, `src/components/characterCreator/EquipmentStep.jsx:5`, `src/components/characterCreator/ClassStep2024.jsx:3`.
- **Metadata `getGamePack`** (`@/config/gamePacks`) — 5 call sites:
  - `src/components/characters/GamePackTag.jsx:8`, `CharacterDetailDispatcher.jsx:14`, `CreateCharacterDialog.jsx:28`, `src/pages/CharacterLibrary.jsx:36`, `src/pages/PathfinderCharacterCreator.jsx:8`.
  - Plus metadata-only siblings: `GamePackPicker.jsx:4-6` (`getOwnedGamePacks/getUpcomingGamePacks`), `useUserGamePacks.js:26` (`GAME_PACKS`), `CharacterDetailDispatcher.jsx:14` (`GAME_PACKS`).

**Cleanest resolution (matches the contract):** the unified `getGamePack(id)` returns the **whole `GamePack` object** — metadata is top-level fields, data is `content.*`, capability is `supportedPintTypes`/`resolveForm`/`vocab`. Then:
- the 3 adapter sites read `pack.content.*` (or a thin `pack.getEquipment` shim during transition);
- the 5 metadata sites read `pack.name/icon/status/...` directly.

No name survives twice. The `getGamePackData` alias is deleted; the metadata `getGamePack` becomes *the* `getGamePack` at `src/game-packs/index.js`.

---

## 3. Consumer blast radius (grep-confirmed)

### 3.1 `src/config/gamePacks.js` — 7 consumer files
`GamePackTag.jsx:8` · `GamePackPicker.jsx:4-6` · `CharacterDetailDispatcher.jsx:14` · `CreateCharacterDialog.jsx:28` · `useUserGamePacks.js:26` · `CharacterLibrary.jsx:36` · `PathfinderCharacterCreator.jsx:8`. Plus the file itself lazy-imports pack UI: `pf2e` at `:96/99/101`, `vtm` at `:133/135`.

### 3.2 `src/data/games/` — 3 root + ~12 deep (2024) consumers
- Root (`@/data/games`): `CampaignItems.jsx:20`, `EquipmentStep.jsx:5`, `ClassStep2024.jsx:3`.
- Deep into `@/data/games/dnd5e_2024/*` (the 2024 creator's real backbone): `AbilitiesStep2024.jsx:9-10`, `ClassFeaturesStep2024.jsx:6,10,11,28`, `ClassStep2024.jsx:4-6`, `IdentityStep2024.jsx:5-11`, `ReviewStep2024.jsx:9-12,20`, `SkillsStep2024.jsx:8-9`, `SpellsStep2024.jsx:6,13,14`, `skillsCompletion2024.js:1-2`, `CharacterCreator.jsx:51`. These import named module functions (`getBackgroundList`, `getSubclassesForClass`, `getSpellSlots`, …) — they move *with* the 2024 pack but the import path changes from `@/data/games/dnd5e_2024/*` → `@/game-packs/dnd5e_2024/*`.

### 3.3 `src/game-packs/` — consumers by pack
- **pf2e:** `config/gamePacks.js:96/99/101` (lazy), `CharacterDetailDispatcher.jsx:21` (lazy sheet), `glossary/Term.jsx:24` + `glossary/TermPopover.jsx:7` (`PF2E_GLOSSARY`).
- **vtm:** `pages/VTMCharacterCreator.jsx:20`, `config/gamePacks.js:133/135`, `CharacterDetailDispatcher.jsx:24`.
- **dnd5e (subdirs, live):** `pages/GMPanel.jsx:30-31` (`MonsterStatBlock`, `EquipmentLayout`), `engine/contentLayer.js:29` (`dnd5e/data/rules`), and the **shim forwarders** in §3.4. `dnd5e/index.js` itself: **0 consumers** → deletable.

### 3.4 The existing D&D shim layer (the precedent to extend)
`export *`/`export { default }` forwarders already in place:
- `src/components/dnd5e/classFeatures.jsx:10` → `@/game-packs/dnd5e/data/classFeatures.js`
- `src/components/dnd5e/abilityData.jsx:9` → `…/data/abilityData.js`
- `src/components/dnd5e/itemData.jsx:9` → `…/data/itemData.js` *(grep header line; `export *` at `:8`)*
- `src/components/dnd5e/armorClass.js:13` → `…/rules/armorClass.js`
- `src/components/combat/conditions.js:8` → `…/data/conditions.js`
- `src/components/combat/actionResolver.js:9` → `…/rules/actionResolver.js`
- `src/components/combat/CombatActionBar.jsx:10` → `…/ui/CombatActionBar.jsx`
- `src/components/gm/equipmentRules.jsx:10` → `…/content/items`

### 3.5 The D&D rules modules **not yet migrated** (still real in `src/components/dnd5e/`)
These are **pure data** (no JSX/hooks) and are the big fold-in targets for pack `vocab`/`content`:

| Module | Consumers | Notes |
|---|---|---|
| `dnd5eRules.js` (3,615 lines, 110+ exports) | **35 files** | The 5e source of truth (abilities, skills, CR/XP, classes, spell slots, subclass features, `MODIFIABLE_RULES`/`getRule`). `SUBCLASS_COMBAT_FEATURES:2061`, `SPELL_SCHOOLS:784`, `DAMAGE_TYPES:182`, `WEAPON_PROPERTIES:844`, `CLASS_HIT_DICE:245`. |
| `spellData.jsx` (1,099 lines) | 11 files | Imports `dnd5eRules` at `:722` → must move with it or repoint. |
| `backgroundData.jsx` | 6 files | Holds the M7/M9 bug (see appendix). |
| `raceData.jsx` | 4 files | Character-creation only. |

Total distinct consumer files across all D&D data modules: **~50** (overlapping). `dnd5eRules.js`'s 35-file fan-out is the single largest rewire surface in the whole consolidation.

---

## 4. Canonical-key reality check (the "matches everywhere" rule)

The contract demands one literal per pack across dir / `id` / registry key / every reference. Current drift:

| Pack | Dir | Registry key | `PACK_META.id` | `family` | `entitlementSlug` | Aligned? |
|---|---|---|---|---|---|---|
| D&D 5e 2014 | `data/games/dnd5e_2014` | `dnd5e_2014` | — (no PACK_META) | `dnd5e` | `dnd5e_2014` | key ✓, no dir under game-packs yet |
| D&D 5e 2024 | `data/games/dnd5e_2024` | `dnd5e_2024` | — | `dnd5e` | `dnd5e_2024` | key ✓, dir to move |
| Pathfinder 2e | **`game-packs/pf2e`** | `pathfinder_2e` | `pathfinder_2e` | **`pf2e`** | `pathfinder_2e` | **dir+family drift** |
| VTM | **`game-packs/vtm`** | **`world_of_darkness`** | **`world_of_darkness`** | `vtm` | — | **4-way drift** |

**Implications:**
- `pf2e → pathfinder_2e` dir rename blast radius: **7 path imports** (`config/gamePacks.js:96/99/101`, `CharacterDetailDispatcher.jsx:21`, `glossary/Term.jsx:24`, `glossary/TermPopover.jsx:7`) + **2 family-string checks** (`config/gamePacks.js:69`, `PathfinderCharacterCreator.jsx:66`). Internal `pf2eGamePack`/`pf2eTheme` export names are local — cosmetic, optional.
- **VTM needs a decision, not just a rename:** the registry key/`id` is `world_of_darkness` while dir/family are `vtm`. Pick ONE canonical key. `entitlementSlug`/stored `game_pack` rows and the DB `game_packs` table (migrations `20260514010000_seed_game_packs.sql`, `20261119_game_packs.sql`) likely reference `world_of_darkness` — so the canonical key probably must remain `world_of_darkness` (rename the *dir* `vtm → world_of_darkness` and set `family` consistently), **or** a data migration is required. Flagged as an open decision (§7).
- `ID_ALIASES` (`dnd5e`, `pf2e`) exists precisely because legacy stored ids differ from canonical keys. Once dirs align, aliases are still needed for **stored data** (characters/brews persisted with `game_system:"dnd5e"` or `"pf2e"`) — keep the alias resolver in the unified accessor; do not assume it can be deleted without a data audit.

---

## 5. Cleanest target architecture

```
src/game-packs/
├── index.js                     ← THE accessor (only getGamePack lives here)
│      export const GAME_PACKS: Record<id, GamePack>
│      export function getGamePack(id): GamePack | null   // alias-resolving
│      export function listGamePackIds(): string[]
│      export function listGamePacks(filter?): GamePack[]
├── dnd5e_2014/index.js          ← GamePack (absorbs data/games/dnd5e_2014 + the
│                                   src/components/dnd5e rules modules + 5e vocab)
├── dnd5e_2024/index.js          ← GamePack (absorbs data/games/dnd5e_2024)
├── pathfinder_2e/index.js       ← GamePack (renamed from pf2e/)
├── world_of_darkness/index.js   ← GamePack, status:"admin_only" (renamed from vtm/, pending key decision)
└── _shared/                     ← cross-pack form components the D&D packs both resolveForm() to
```

Each `index.js` default-exports an object conforming to the contract (`id, family, name, status, meta, supportedPintTypes, resolveForm, vocab, content, createCharacter, characterSheet`). The three current accessors collapse:
- `config/gamePacks.js` metadata → `GamePack` top-level fields + `meta`.
- `data/games` adapter methods → `GamePack.content.*`.
- `game-packs/*` PACK_META/content → already the closest shape; formalize field names.

**`src/config/gamePacks.js` and `src/data/games/index.js` become thin re-export shims** (or are deleted once consumers are repointed) — same zero-break technique already used for the D&D data modules.

---

## 6. Migration sequence (dependency-ordered, lowest-risk first)

The goal is correct final state; the path keeps the tree green at every step by leaning on shims.

1. **Stand up the accessor.** Create `src/game-packs/index.js` exporting `GAME_PACKS`/`getGamePack`/`listGamePackIds`/`listGamePacks`, initially *composing* today's `config/gamePacks.js` + `data/games` so it returns a unified object. Nothing else changes yet. (New file; zero consumer edits.)
2. **Repoint metadata consumers** (7 files, §3.1) to the new accessor. Low risk — same return shape for the metadata fields.
3. **Delete `src/game-packs/dnd5e/index.js`** (0 consumers, §3.3). Trivial, removes the misleading "draft."
4. **Rename `pf2e → pathfinder_2e`** (dir + 7 path imports + 2 family strings, §4). Mechanical; one atomic commit. Update `pf2eGamePack`→`pathfinder2eGamePack` optionally.
5. **Move `data/games/dnd5e_2024` → `game-packs/dnd5e_2024`** and repoint the ~12 deep creator imports (§3.2). Leave a shim at the old path for one release if desired. Medium risk (many call sites, but pure path swaps).
6. **Fold the D&D rules modules into `game-packs/dnd5e_2014` (and shared)**: relocate `dnd5eRules.js` (+ `spellData.jsx` dependency, `backgroundData.jsx`, `raceData.jsx`) under the pack, leaving `export *` shims at `src/components/dnd5e/*` (extends the existing pattern, §3.4). This neutralizes the 35-file `dnd5eRules` fan-out with **zero call-site edits**. Highest effort, lowest breakage thanks to shims.
7. **Delete the `data/games/pathfinder_2e/` stub** and the `data/games` + `config/gamePacks` files once all consumers are on the accessor and all shims retired.
8. **VTM** (`world_of_darkness`): conform to contract with `status:"admin_only"`; execute the key/dir alignment chosen in §7. Not a launch Brewery target — sequence last.

Stop points 1–4 are safe to land independently and already remove the collision + the misleading draft. 5–6 are the real consolidation. 7–8 are cleanup + the deferred pack.

---

## 7. Open decisions (need a human call)

1. **VTM canonical key — `vtm` vs `world_of_darkness`.** The contract's example table says `vtm`; the code + likely DB say `world_of_darkness`. Choosing `vtm` implies a data migration of `game_packs`/entitlement rows; choosing `world_of_darkness` means renaming the dir/family to match. **Recommend `world_of_darkness`** (no data migration) unless the DB audit shows it's safe to rename — out of scope for this read-only pass.
2. **`family` for Pathfinder — `pf2e` vs `pathfinder`.** The contract example uses `family:"pathfinder"`; code uses `"pf2e"`. Pick one and apply at `config/gamePacks.js:69` + `PathfinderCharacterCreator.jsx:66`.
3. **`ID_ALIASES` lifespan.** Keep in the unified accessor until a data audit confirms no persisted rows use legacy `dnd5e`/`pf2e` ids. Do not delete blind.
4. **Shim retention window.** Zero-break needs temporary shims at `src/components/dnd5e/*`, `src/data/games/*`, `src/config/gamePacks.js`. Decide whether to retire them in the same PR (bigger diff, cleaner tree) or a follow-up.

---

## 8. Risk ranking

| Move | Files touched | Risk | Why |
|---|---|---|---|
| Fold `dnd5eRules.js` into pack | 35 consumers (shimmed → ~0 edits) | **High effort / Low break** | Huge fan-out, but shim pattern proven |
| Move `dnd5e_2024` data dir | ~12 deep imports | Medium | Pure path swaps, no shape change |
| `pf2e → pathfinder_2e` rename | 9 (7 path + 2 string) | Medium | Atomic, but a missed string = runtime 404 on lazy import |
| VTM key alignment | dir + registry + DB? | Medium-High | May require data migration (decision §7.1) |
| Collapse 3 accessors → 1 | 10 call sites | Medium | Return-shape reconciliation at adapter sites |
| Delete `game-packs/dnd5e/index.js` | 0 | Trivial | Unconsumed |
| Delete `data/games/pathfinder_2e/` stub | 0 (after §6.5) | Trivial | Stub only |

---

## Appendix: bugs / hazards observed (not fixed)

- **`src/game-packs/dnd5e/index.js` self-describes as unconsumed draft (`:1`–`:15`) while its siblings are production** — the misleading framing is what the spec's "delete the draft" line latched onto. Hazard for any contributor who trusts the comment and deletes the directory.
- **Three-hop 2014 data path:** `data/games/dnd5e_2014/index.js → components/dnd5e/* → game-packs/dnd5e/*`. Functional but fragile; a shim edit in the middle layer silently affects 2014 character creation.
- **M7/M9 (carried from the prior audit):** `src/components/dnd5e/backgroundData.jsx:33-35` returns a bare language *count*; `:44-49` pushes hardcoded `"Dwarvish"`/`"Elvish"` placeholders. This module is a §6.6 fold-in target — fix during the move, not before.
- **`spellData.jsx:722` imports `dnd5eRules`** — a circular-ish coupling that forces the two to migrate together (or `spellData` to repoint to the pack copy first).
- **VTM identifier fracture** (§4): `vtm`/`world_of_darkness`/`vtm` across dir/key/family — already a latent foot-gun (e.g. anyone matching on `family==="vtm"` vs key `world_of_darkness`).

---

## Push proof

```
$ git log origin/claude/brewery-multisystem-audit --oneline
4fe59595 docs: Phase 0 GamePack consolidation brief (import-graph recon)
9c870d23 docs: add git log push-proof to Brewery audit report
867b0d7d docs: Brewery multi-system audit recon report
c154369f Merge pull request #162 from itsmeboky/claude/world-lore-import-subheader-color
```

This brief is commit `4fe59595` on `origin/claude/brewery-multisystem-audit`.
