# 2024 Game Pack Separation Audit

**Purpose:** Confirms the `dnd5e_2024` game pack is wired as a separate
pack from `dnd5e_2014` with no silent fallbacks to 2014 logic. Per the
multiclass vetting spec: "the 2024 pack must NOT inherit from the 2014
pack via fallbacks."

**Date:** Captured at Vetting Commit 5. Refresh after Commits 6-8 land.

---

## Registry & catalog

| Layer | State | Source |
|---|---|---|
| `GAME_PACKS` config | Both `dnd5e_2014` (status: `available`) and `dnd5e_2024` (status: `coming_soon`) registered as separate entries. Both share `family: "dnd5e"` for visual grouping in the picker; that's cosmetic, not a fallback path. | `src/config/gamePacks.js:18-48` |
| `useUserGamePacks()` | Returns `['dnd5e_2014']` only — 2024 is hidden from the picker until commits 6-7-8 ship full coverage. | `src/lib/useUserGamePacks.js` |
| Data registry | `getGamePack(id)` dispatches by id; aliases legacy `'dnd5e'` → `'dnd5e_2014'` for back-compat. The `dnd5e_2024` entry spreads the 2024 adapters and nests the rules module under `.rules`. | `src/data/games/index.js` |
| Backfill migration | `migrations/20261214_character_game_pack_split.sql` added `game_pack` column to `characters`, canonicalised legacy `'dnd5e'` / NULL → `'dnd5e_2014'`. | (existing) |

✅ The catalog layer is properly separated. No registry-level fallbacks.

---

## Data adapters (`src/data/games/dnd5e_2024/`)

| Module | State | Source-of-truth |
|---|---|---|
| `equipment.js` | Shipped. Reads from `docs/5e_reference/2024/5e-SRD-Equipment.json`. Surfaces 2024-specific weapon mastery property on weapons. | 2024 SRD JSON ✅ |
| `classes.js` | Shipped. Reads from `docs/5e_reference/2024/5e-SRD-Classes.json`. Exposes hit die, primary ability, saving throws, proficiencies, multiclass prereqs, subclass refs. | 2024 SRD JSON ✅ |
| `classFeatures.js` | Shipped (thin adapter). Reads from `5e-SRD-Classes.json`. Exposes `getClassBasics()`, `getClassAsiLevels()`, `hasPerLevelFeatures()` (always false — 2024 SRD's `class_levels` is a URL stub). | 2024 SRD JSON ✅ |
| `subclassFeatures.js` | Shipped (thin adapter). Reads from `5e-SRD-Subclasses.json`, which carries features inline as `{name, level, description}`. 12 subclasses (one per class — PHB has 4, the other 36 are SRD gaps). | 2024 SRD JSON ✅ |
| `rules.js` | **Scaffold (added in Vetting Commit 5).** Most helpers throw "not yet implemented" with a clear message pointing at the missing commit. Same-shape constants (`CLASS_HIT_DICE`, `CLASS_SAVING_THROWS`, `CLASS_PRIMARY_ABILITY`, `MULTICLASS_REQUIREMENTS`) are stubbed — they happen to match 2014 numerically but the spec is explicit: re-declare with 2024 values when 6/7 land, don't re-export from 2014. | Pending Commits 6/7 |

✅ Data adapters are properly separated. The `rules.js` scaffold marks
the explicit gap; nothing in `dnd5e_2024/` re-exports from `dnd5e_2014/`
or the legacy 2014 paths.

---

## Step components (`src/components/characterCreator/`)

| Step | 2014 component | 2024 component | Dispatcher status |
|---|---|---|---|
| `race` | `RaceStep.jsx` | — | ❌ 2024 falls back to 2014 |
| `class` | `ClassStep.jsx` | `ClassStep2024.jsx` | ✅ dispatched on `gamePack` |
| `abilities` | `AbilityScoresStep.jsx` | — | ❌ 2024 falls back to 2014 |
| `features` | `ClassFeaturesStep.jsx` | `ClassFeaturesStep2024.jsx` | ✅ dispatched on `gamePack` |
| `skills` | `SkillsStep.jsx` | — | ❌ 2024 falls back to 2014 |
| `spells` | `SpellsStep.jsx` | — | ❌ 2024 falls back to 2014 |
| `equipment` | `EquipmentStep.jsx` (gamepack-aware via adapter) | (same) | ⚠️ shared component, but the adapter dispatches the equipment list per `characterData.gamePack`. Not a fallback — same UI, edition-correct data. |
| `review` | `ReviewStep.jsx` | — | ❌ 2024 falls back to 2014 |

**6 of 8 steps still cross-run 2014 logic for 2024 characters.** This is
the dispatcher gap that commits 6-8 will close (per the spec's commit
plan: 6 = martial classes, 7 = spellcasting classes, 8 = creator UI
adjustments). Until then, **2024 stays `coming_soon` in the picker** so
no user actually hits the cross-edition paths in production.

ℹ️ **The picker gate is the safety net.** As long as `useUserGamePacks()`
doesn't surface `dnd5e_2024` to the picker, the only path to a
`gamePack === 'dnd5e_2024'` character is hand-stamping the URL with
`?gamePack=dnd5e_2024` (intentional dev access). That's the deliberate
sequencing — commits 6-8 land the missing pieces before the picker
flips on for testers.

---

## Cross-edition imports in 2024 components

✅ **Neither `ClassStep2024.jsx` nor `ClassFeaturesStep2024.jsx` imports
from any `@/components/dnd5e/` or `@/game-packs/dnd5e/` path.** Their
game-data imports go through `@/data/games/dnd5e_2024/*` or
`@/data/games` (the registry). Shared UI primitives (`Button`,
`Select`, `Badge`, `SubclassPicker`, `InfoTip`) are edition-agnostic.

Grep verification:
```
$ grep "^import" src/components/characterCreator/ClassStep2024.jsx \
                src/components/characterCreator/ClassFeaturesStep2024.jsx \
  | grep -v "^[a-z]*:[0-9]*:import { \(Input\|Label\|Textarea\|Button\|\
Select\|Badge\|SubclassPicker\|InfoTip\|tipFor\|getGamePack\|getClass\|\
getSubclass\|motion\|toast\|base44\|React\)"
(no cross-edition game-data imports)
```

---

## Campaign-level game pack

❌ **Not implemented.** Per the spec's Commit 5 step 4:
> Update the game pack switcher (campaign settings → game pack
> dropdown) so a campaign can pick dnd5e (2014) or dnd5e2024 (2024)

Current state:
- The `characters` table has a `game_pack` column (added in the prior
  dual-pack split).
- The `campaigns` table does NOT have a `game_pack` column.
- Campaign settings UI has no game-pack selector.
- Character creation honors only the URL-stamped `?gamePack=` or the
  character's persisted `game_pack`. It does NOT inherit from the
  parent campaign (because campaigns don't have a gamepack to
  inherit from).

**Filed as a smell with proposed shape:**

```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS game_pack TEXT NOT NULL DEFAULT 'dnd5e_2014';
UPDATE campaigns SET game_pack = 'dnd5e_2014' WHERE game_pack IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_game_pack ON campaigns(game_pack);
```

Plus:
- Campaign settings UI dropdown for picking `dnd5e_2014` /
  `dnd5e_2024` / future packs.
- Character creation defaults to the parent campaign's gamepack when
  the creator is opened from a campaign context (the URL already
  carries `campaignId` for the apply flow).
- Per-campaign enforcement: a `dnd5e_2014` campaign should reject
  attaching a `dnd5e_2024` character (and vice versa). Filed in the
  multiclass vetting handoff under "edge cases".

This is a substantial feature (migration + UI + enforcement) — keep
it as its own commit, not bundled into the Commit 5 scaffold.

---

## Summary

| Layer | Status |
|---|---|
| Registry / catalog | ✅ Separated |
| Data adapters (`src/data/games/dnd5e_2024/`) | ✅ Separated |
| Step components for `class` + `features` | ✅ Dispatched |
| Step components for `race / abilities / skills / spells / review` | ❌ 6 of 8 cross-fall to 2014 — commits 6-8 close the gap |
| Step component for `equipment` | ✅ Shared UI, edition-correct data via adapter |
| Picker safety (`coming_soon` gate) | ✅ 2024 hidden from `useUserGamePacks()` |
| Campaign-level gamepack | ❌ Not implemented — separate commit |
| `rules.js` scaffold for 2024-specific helpers | ✅ Added in Commit 5 (stubs throw "not yet implemented") |

**The 2024 pack is architecturally separate.** The gaps that remain
(6-of-8 dispatcher coverage, campaign-level gamepack, mechanical data)
are explicit work items for commits 6-8, not silent fallbacks.

**Action items captured:**

1. **Commit 6** — Implement 2024 martial classes data in `dnd5e_2024/rules.js`
   (Weapon Mastery slot counts, half-caster slot helper with L1 + round-up
   rules, ASI extras).
2. **Commit 7** — Implement 2024 spellcasting data in `dnd5e_2024/rules.js`
   (SPELLS_KNOWN_TABLE with fixed prepared tables, CANTRIPS_KNOWN, Divine
   Order / Primal Order options, Innate Sorcery / Magical Cunning
   mechanics).
3. **Commit 8** — Build 2024-specific step components for race / abilities /
   skills / spells / review (Divine Order picker at L1 Cleric, Primal Order
   picker at L1 Druid, Weapon Mastery picker for martial classes, fixed
   prepared spell table UI, etc.).
4. **Separate ticket** — Campaign-level gamepack: migration adding
   `campaigns.game_pack`, UI dropdown in campaign settings, character
   creation inheritance from campaign context, cross-edition character
   attach enforcement.
