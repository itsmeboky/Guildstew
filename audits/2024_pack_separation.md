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
| `features` | `ClassFeaturesStep.jsx` | `ClassFeaturesStep2024.jsx` (extended in Commit 8 with Weapon Mastery picker + L1 path-choice banner) | ✅ dispatched on `gamePack` |
| `skills` | `SkillsStep.jsx` | — | ❌ 2024 falls back to 2014 |
| `spells` | `SpellsStep.jsx` | — | ❌ 2024 falls back to 2014 (DEFERRED — see below) |
| `equipment` | `EquipmentStep.jsx` (gamepack-aware via adapter) | (same) | ⚠️ shared component, but the adapter dispatches the equipment list per `characterData.gamePack`. Not a fallback — same UI, edition-correct data. |
| `review` | `ReviewStep.jsx` | — | ❌ 2024 falls back to 2014 |

**5 of 8 steps still cross-run 2014 logic for 2024 characters.** Down
from 6 of 8 before Commit 8 (Weapon Mastery + L1 path-choice live in
the already-dispatched `features` step now). Until the remaining
steps ship, **2024 stays `coming_soon` in the picker** so no user
actually hits the cross-edition paths in production.

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

**Action items captured (status after Commit 8):**

1. ✅ **Commit 6** — 2024 martial classes data shipped.
2. ✅ **Commit 7** — 2024 spellcasting classes data shipped.
3. ⚠️ **Commit 8** (partial — see deferred items below) — Weapon
   Mastery picker for the 5 martials + L1 path-choice banner for
   Cleric/Druid landed in `ClassFeaturesStep2024.jsx`. Subclass L3
   gate confirmed correct (already present from Commit 3 of the
   original 2024 bundle).
4. **Separate ticket** — Campaign-level gamepack: migration adding
   `campaigns.game_pack`, UI dropdown in campaign settings, character
   creation inheritance from campaign context, cross-edition character
   attach enforcement.

### Commit 8 deferred sub-items (need their own commits)

The spec doc's Commit 8 listed 7 UI changes. Commit 8 (this one)
shipped 2 of them. The remaining 5 are deferred with rationale:

**a. SpellsStep2024.jsx (deferred — SRD data gap):** Building a
2024-specific spell prep step is blocked because the 2024 SRD's
per-class spell lists (`spells` field on each class in
`5e-SRD-Classes.json`) are malformed in the upstream 5e-bits
extraction — every class shows a single string like `"/"` or
`"/api/2"` instead of a spell-ref array. Without per-class spell
lists, the picker has nothing to show. Options once resolved:
either fix the upstream extraction or hand-author the class
spell lists (the latter would re-introduce hand-authored
content that the OGL pass stripped). Deferred until upstream is
corrected or a licensed source ships.

**b. Paladin Divine Smite rendering (deferred — depends on 8a):**
Per 2024 PHB, Divine Smite is a spell, always prepared. The
`SPELLS_KNOWN_TABLE.Paladin.alwaysPrepared = ["Divine Smite"]`
field is set (Commit 6). Rendering this in the picker depends
on SpellsStep2024 existing, so this lands when 8a does.

**c. Hunter's Mark always-prepared rendering (deferred — depends
on 8a):** Same shape as Divine Smite. The data field is set
(`SPELLS_KNOWN_TABLE.Ranger.alwaysPrepared = ["Hunter's Mark"]`).

**d. Two-option starting equipment (deferred — UX redesign):**
The 2024 SRD provides structured `starting_equipment_options`
with `(a) package + small gold or (b) gold-only` per class. The
existing EquipmentStep uses the 2014 (a)/(b)/(c) sub-option
trees inline. Adapting the step to the 2024 two-option shape is
a UX redesign that touches the shared component. Either build
`EquipmentStep2024.jsx` or extend the existing step to be
gamepack-aware via the adapter shape. Either way it's its own
commit-sized work.

**e. Background ASI shift (deferred — architectural):** 2024 moves
ability score bonuses from species (race) to background. This
requires:
  - A new BackgroundStep (or expanding RaceStep) to capture the
    ASI assignment
  - Species no longer offering ASI when gamePack === 'dnd5e_2024'
  - Validator changes to account for the shifted source of ASI
  Substantial architectural change touching multiple steps and
  the character data model. Its own commit (or sub-bundle).

**f. Wizard spellbook concept (deferred — carried from Vetting
Commit 4):** The 2024 Wizard needs a `character.spellbook =
{ cantrips, spells }` data field plus a two-step UI flow at
creation (pick into spellbook → pick prepared from spellbook).
Same scope concern as in Commit 4's deferral. Will benefit
both 2014 and 2024 Wizards when it lands.

**g. Mystic Arcanum picker for Warlock 11+ (deferred — carried
from Vetting Commit 4):** Same as the 2014 deferral. Low alpha
impact (testers create at L1-10), high impact at high-level
starts.
