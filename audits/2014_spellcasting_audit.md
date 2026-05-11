# 2014 D&D 5e — Spellcasting Flow Audit

**Scope:** Verifies the character creator's spellcasting step against the
2014 PHB rules per `character_creator_vetting.md` Commit 3 spec. Covers all
8 spellcaster classes (Bard, Cleric, Druid, Paladin, Ranger, Sorcerer,
Warlock, Wizard).

**Source-of-truth precedence:**
- **Mechanics** (prepared/known formulas, spell slot tables, ritual rules,
  Mystic Arcanum scaling, pact-slot-same-level invariant) → spec doc /
  PHB 2014 / SRD 5.1. Mechanical rules aren't IP-protected.
- **Spell content** (which spells exist on each class list) → 2014 SRD
  JSON at `docs/5e_reference/2014/5e-SRD-Spells.json` (319 spells).
- The hand-typed `spellsByClass` table at `src/components/dnd5e/
  spellData.jsx:371` is a separate audit target (filed in OGL Commit 2's
  smell list — pending migration to a thin SRD adapter; not in scope here).

**Files inspected:**
- `src/components/characterCreator/SpellsStep.jsx` — spell-picker UI
- `src/components/dnd5e/spellData.jsx` — spell helpers (`getAllAvailableSpells`,
  `getSpellSlots`, `getPactSlots`, `getMaxSpellLevelForCharacter`)
- `src/components/dnd5e/dnd5eRules.js` — `SPELLS_KNOWN_TABLE`,
  `cantripsKnown()`, `spellsKnown()`, `spellsPrepared()`,
  `WARLOCK_PACT_SLOTS`, `FULL_CASTER_SLOTS`, `halfCasterSlots()`

**Key:** ✅ enforced • ❌ not enforced (mismatch) • ⚠️ partial • ℹ️ note

---

## Cleric / Druid / Paladin — Prepared from full list

| Rule | Spec | Code | Status | File:line |
|---|---|---|---|---|
| **C1.** Prepared count formula | Cleric/Druid: WIS + class level (min 1). Paladin: CHA + floor(level/2) (min 1). | `spellsPrepared()` returns the right value: Cleric `(wisMod, level) => max(1, wis+lvl)`, Druid same, Paladin `(cha, lvl) => max(1, cha + floor(lvl/2))` with `startLevel: 2` | ✅ (data layer) | `dnd5eRules.js:3221, 3231, 3240` |
| **C2.** Prepared count ENFORCED in picker | Player should be able to pick up to `formula(abilityMod, level)` spells, distributed across spell levels they can cast (any combo). | Picker caps **per spell level** by SLOT COUNT (`isDisabled = !isSelected && currentSelected.length >= slots` where `slots` = slots of that spell level). The TOTAL prepared count is never enforced — and the per-level cap is the wrong axis (slot count is casts/day, not prepared count). `spellsPrepared()` is imported but only used by `PerClassSpellsKnownPanel` (read-only multiclass info display). | ❌ | `SpellsStep.jsx:296` (cap), `:475-543` (info-only use of helper) |
| **C3.** Available pool = entire class spell list, filtered by max spell level | When picking, player sees every spell on the class's list at or below their max castable level. | `getAllAvailableSpells()` returns spells filtered by class + level, gated by `getMaxSpellLevelForCharacter()`. Pool is correct; it's the **full class list**, not a subset. | ✅ | `spellData.jsx:784, 937` |
| **C4.** Paladin gets no cantrips | Cantrip count for Paladin is null/zero in the spellcaster table. | `SPELLS_KNOWN_TABLE.Paladin: { cantrips: null, ... }`. `cantripsKnown('Paladin', any)` returns 0. `spellsByClass.Paladin.cantrips: []`. UI: cantrips section iterates `Object.keys(spellSlots)` and only renders sections with `slots > 0` — `spellSlots.cantrips` for Paladin is never set, so the cantrips section is hidden. | ✅ | `dnd5eRules.js:3239`, `spellData.jsx:402` |
| **C5.** Paladin spellcasting starts at level 2 | A Paladin character at level 1 has zero spellcasting. | `SPELLS_KNOWN_TABLE.Paladin.startLevel: 2` and `spellsPrepared('Paladin', 1, mod)` returns 0. `getSpellcastingClass()` checks `level >= 2` for half-casters. The "No Spells Available" empty state at `SpellsStep.jsx:142-150` triggers when `spellSlots.cantrips === 0 && spellSlots.level1 === 0`. ⚠️ But: `getSpellSlots()` is called unconditionally; need to verify it returns zero slots for Paladin level 1 (it should, via the half-caster table). | ⚠️ | `dnd5eRules.js:3245`, `SpellsStep.jsx:123, 142` |
| **C6.** Spells changeable on every long rest | Player can re-prepare on each long rest from the full class list. | UI doesn't model rest-cycle spell prep at all — this is a "post-creation play loop" feature, not a creator concern. The creator just locks in the initial preparation. The `SPELLS_KNOWN_TABLE.Cleric.changeDaily: true` flag exists but no UI consumes it. ℹ️ Out of scope for the creator step itself; flag for the character-sheet / play-loop scope. | ℹ️ | `dnd5eRules.js:3225, 3234` |

---

## Bard / Sorcerer / Warlock / Ranger — Known

| Rule | Spec | Code | Status | File:line |
|---|---|---|---|---|
| **K1.** Spells known per class table | Fixed table per class (Bard 1:4, 2:5, 3:6, ... 20:22; Sorcerer 1:2 ... 17:15; Warlock 1:2 ... 19:15; Ranger 2:2, 3:3, 5:4, ... 19:11). | `SPELLS_KNOWN_TABLE` for each class has a `spellsKnown` map matching the spec exactly. `spellsKnown()` returns the right value. | ✅ (data layer) | `dnd5eRules.js:3210, 3251, 3261, 3271` |
| **K2.** Known count ENFORCED in picker | Player can pick up to `spellsKnown[level]` spells total across the eligible levels. | Same bug as C2 — picker caps **per spell level by slot count**, not by total known count. `spellsKnown()` is imported but only used in `PerClassSpellsKnownPanel` (read-only). For Sorcerer at level 5 the spec says 6 known total; picker caps as 4 cantrips / 4 level-1 / 3 level-2 / 2 level-3 (slot counts). | ❌ | `SpellsStep.jsx:296`, `:475-543` |
| **K3.** Choose from class's full spell list at creation | Pool = full class list filtered to learnable spell levels. | `getAllAvailableSpells()` returns the full class list. ✅ | ✅ | `spellData.jsx:784` |
| **K4.** Can swap one on level-up | On gaining a class level, player can replace ONE known spell with another from the class list. | `SPELLS_KNOWN_TABLE.{Bard,Sorcerer,Warlock,Ranger}.swapOnLevelUp: 1` exists. The creator has no level-up flow that uses it (level-up flow audited in Vetting Commit 9 area). At creation time, this rule doesn't apply (player picks fresh). ℹ️ Data exists; level-up consumer to be vetted separately. | ℹ️ | `dnd5eRules.js:3214, 3265, 3275, 3256` |
| **K5.** Ranger gets no cantrips | Cantrip count for Ranger is null. | `SPELLS_KNOWN_TABLE.Ranger: { cantrips: null, ... }`. `cantripsKnown('Ranger', any)` returns 0. `spellsByClass.Ranger.cantrips: []`. UI hides the cantrips section. | ✅ | `dnd5eRules.js:3249`, `spellData.jsx:407` |
| **K6.** Ranger spellcasting starts at level 2 | A Ranger at level 1 has zero spellcasting. | `SPELLS_KNOWN_TABLE.Ranger.startLevel: 2` and `spellsKnown('Ranger', 1)` returns 0 (table row 1 absent). `getSpellcastingClass()` gates half-casters on `level >= 2`. Same partial concern as C5 — `getSpellSlots()` is called unconditionally; rely on the half-caster table to return zero slots at level 1. | ⚠️ | `dnd5eRules.js:3257`, `SpellsStep.jsx:123` |

---

## Wizard — Spellbook

| Rule | Spec | Code | Status | File:line |
|---|---|---|---|---|
| **W1.** Starts with 3 cantrips + 6 first-level spells in spellbook | At character creation, Wizard's spellbook contains 6 chosen 1st-level spells and the player knows 3 cantrips. | `SPELLS_KNOWN_TABLE.Wizard.startingSpells: 6` (data), and `cantrips: { 1: 3, ... }`. There is **no spellbook concept anywhere in the creator** — no spellbook picker, no spellbook persistence on the character record, no separate "spellbook contents" vs "prepared spells" distinction. | ❌ | `dnd5eRules.js:3284-3289` (data only); UI gap |
| **W2.** Gains 2 spells per Wizard level | On level-up the spellbook grows by 2 Wizard spells. | `spellsPerLevel: 2` exists in data. No consumer in the creator. Same UI gap as W1 — without a spellbook concept, this rule has nowhere to attach. | ❌ | `dnd5eRules.js:3285` (data only) |
| **W3.** Prepared count = INT mod + Wizard level | At each long rest, prepare INT + Wizard-level spells. | `SPELLS_KNOWN_TABLE.Wizard.preparedFormula: (intMod, wizardLevel) => Math.max(1, intMod + wizardLevel)`. **NOT enforced** in the picker — same per-spell-level slot-count cap bug as C2/K2. | ❌ | `dnd5eRules.js:3286`, `SpellsStep.jsx:296` |
| **W4.** Prepared spells drawn from SPELLBOOK, not full Wizard list | Wizard's prepared list is a subset of their spellbook (which is itself a subset of the full Wizard list). | `getAllAvailableSpells()` returns the **full Wizard spell list** — the picker shows every Wizard spell, not a spellbook subset. Without spellbook persistence on the character (W1 gap), there's no subset to show even if the picker tried. **Most player-facing creator-spellcasting bug**: a Wizard player at creation could pick any Wizard spell as "prepared" with no spellbook gate. | ❌ | `spellData.jsx:784-862` |
| **W5.** Can cast any Ritual-tagged spell from spellbook without preparing | Wizard's ritual-from-spellbook special rule. | No ritual surfacing in the creator UI at all. `RITUAL_CASTING` constant exists at `dnd5eRules.js:701` but is not consumed. ℹ️ Cosmetic for the creator step (rituals are a play-loop feature), but the data path needs to acknowledge spell `ritual` flags so the sheet / combat engine can branch on them. Worth flagging because the Wizard ritual rule is the most distinctive ritual rule in the game. | ℹ️ | `dnd5eRules.js:701` (data only) |

---

## Warlock — Pact Magic

| Rule | Spec | Code | Status | File:line |
|---|---|---|---|---|
| **P1.** Slot count + slot level per Warlock level | Per `WARLOCK_PACT_SLOTS`: 1:1@1st, 2:2@1st, 3-4:2@2nd, 5-6:2@3rd, 7-8:2@4th, 9-10:2@5th, 11-16:3@5th, 17-20:4@5th. | `WARLOCK_PACT_SLOTS` table matches the spec for all 20 levels. `getPactSlots()` looks it up, including multiclass tally of all Warlock levels. | ✅ | `dnd5eRules.js:339-362`, `spellData.jsx:862` |
| **P2.** All Pact Magic slots cast at the SAME level (the highest the table says) | Slots aren't separated by level — they're a flat pool, all of one level. | `getPactSlots()` returns `{ slotLevel, slots, ... }` as a single bundle. UI displays it correctly: *"X slots of Yth level"*. | ✅ | `SpellsStep.jsx:243-254` |
| **P3.** Pact slot pool separate from regular spell slots | A Warlock 5 / Wizard 5 has 2 Pact slots @ 3rd PLUS Wizard's full-caster slots; they don't combine. | `getSpellSlots()` excludes Warlock from the multiclass spellcaster table calculation (only Bard/Cleric/Druid/Sorcerer/Wizard contribute as full casters; Paladin/Ranger as half). Pact slots returned separately by `getPactSlots()`. UI displays both: regular slots in the main panel + "Pact Magic (Warlock)" panel below. ⚠️ But: `getSlotsForLevelKey()` at `SpellsStep.jsx:71-86` MERGES pact slots into the matching `levelN` count for **display only** — the merge mutates the displayed cap, which feeds the pick limit (the same `slots` variable). For a Warlock 3 / Wizard 3 the player at the level-2 spell row would see "2 + 2 = 4" slots and could over-pick by treating pact and Wizard slots as fungible for spell selection. | ⚠️ | `SpellsStep.jsx:71-86` |
| **P4.** Mystic Arcanum at level 11+ (one each of 6th/7th/8th/9th by levels 11/13/15/17) | Per `mysticArcanum: { 11:1, 13:1, 15:1, 17:1 }`. | `SPELLS_KNOWN_TABLE.Warlock.mysticArcanum` is set correctly. **No UI surface** — player has no way to see or pick their Mystic Arcanum spells in the creator. A Warlock 11+ character has unaccounted-for high-level spells. | ❌ | `dnd5eRules.js:3276` (data only) |

---

## Cross-cutting findings

### ❌ Selection cap uses slot count, not prepared/known count

The single-most-impactful bug surfaced. `SpellsStep.jsx:296`:
```js
const isDisabled = !isSelected && currentSelected.length >= slots;
```
where `slots` is the per-spell-level slot count from `spellSlots[levelKey]`.
This treats casts-per-day as if it were the number of spells you can have
prepared/known at that spell level. For 2014 RAW:

- **Prepared casters (Cleric/Druid/Paladin)**: should have a TOTAL prepared
  count = `formula(abilityMod, level)`, distributable across any spell levels
  the caster can cast.
- **Known casters (Bard/Sorcerer/Warlock/Ranger)**: should have a TOTAL
  known count = `spellsKnown[level]` from the per-class table, distributable
  across eligible levels.
- **Spellbook caster (Wizard)**: prepared count = INT + Wizard level (same
  total-pool model as Cleric).

Affects all 8 spellcaster classes. Hits at character creation (under-picks
spells, can't fully fill out a level-3 Cleric's WIS+3 prepared budget if
they want to put more than 2 into level-2 spells); will also break
multiclass casting math when the multiclass spell-slot table lands. Single
line fix at the cap, but it requires plumbing the `spellsPrepared() /
spellsKnown()` total through to the UI per-class.

### ❌ No Wizard spellbook concept

The 2014 Wizard's defining mechanic — a spellbook that holds the spells
they CAN prepare, distinct from the prepared list — doesn't exist in the
codebase. `getAllAvailableSpells()` returns the full Wizard spell list as
the picker pool. Three rules (W1 starts-with-6, W2 gains-2-per-level, W4
prepare-from-spellbook) are all blocked on this gap.

The fix shape: add a `spellbook: { cantrips: [], spells: [] }` field to
the character data model (Wizard-only), and during creation the Wizard
picks 3 cantrips + 6 1st-level spells **into the spellbook**, then picks
INT+1 from the spellbook **as prepared**. Two-step UI flow.

### ❌ No Mystic Arcanum picker

A Warlock at character creation level 11+ has 1 free 6th-level spell + 1
free 7th-level spell + 1 free 8th-level spell + 1 free 9th-level spell
(per their level), each cast 1/long rest with no slot. The creator
provides no UI to pick these.

Most testers create at level 1-10 so this is low-impact for alpha; high
impact for any campaign starting at high levels.

### ⚠️ Pact-slot merge displayed-as-fungible

`getSlotsForLevelKey()` adds pact slots to the display count of the
matching spell-level row. This is correct **for display purposes** (a
Warlock 3 player sees "2 level-2 slots" combining their pact slots
which are all at level 2) — but the same displayed value drives the
pick limit. For a single-class Warlock this is harmless because pact and
prepared/known are the same Warlock pool. For multiclass (Warlock 3 /
Wizard 3) the player gets a 2 + 2 = 4 cap on level-2 spell selection
which conflates two non-fungible pools.

The fix: keep the merge for the "X / Y slots" display label but use the
**non-merged** slot count for the per-spell-level pick disabling — or
better, use the right total-pool count per class (per the C2/K2/W3 fix).

### ℹ️ Long-rest re-preparation, ritual UI, swap-on-level-up

These are play-loop concerns, not creator-step concerns. Data is in place
(`changeDaily: true`, `RITUAL_CASTING`, `swapOnLevelUp: 1`); the consumers
are out of scope for the spellcasting STEP audit. Surface in the
character-sheet / level-up audits when those land.

### ℹ️ Hand-typed `spellsByClass` table at `spellData.jsx:371`

The hand-typed cantrips-and-1st-level lists are separate from this audit's
mechanical scope and were already filed as a smell in OGL Commit 2's
report (migration to a thin SRD adapter against
`docs/5e_reference/2014/5e-SRD-Spells.json` is pending). Not a regression,
not in scope here.

### ℹ️ `getSpellSlots()` returns the right zero for half-casters at level 1

Spot-check: `halfCasterSlots(1)` computes `Math.ceil(1/2) = 1`, so it
looks up `FULL_CASTER_SLOTS[1] = [2]` — that returns 2 first-level slots
for a Paladin/Ranger at level 1, which is **wrong** (should return 0
slots for a Paladin/Ranger at level 1; spellcasting starts at level 2).
However, the `getSpellcastingClass()` UI gate at `SpellsStep.jsx:123-125`
short-circuits with `level >= 2` for half-casters, so the empty-state
banner at `:142` fires before any slot UI renders for Paladin 1 / Ranger 1.

This means the user-facing behavior is correct ("No Spells Available"
banner), but the underlying slot calculation will silently return spurious
slots if any other consumer calls `getSpellSlots('Paladin', 1)` without
the half-caster level-2 guard. Fragile. Worth fixing the slot calc itself
to return `[]` for half-casters at level 1. Filed as ⚠️ in C5/K6.

---

## Summary

| Class | Pass / Total | Notes |
|---|---|---|
| Cleric    | 4 / 6 | C2 ❌ (cap by slot not prep formula); C5 ⚠️ |
| Druid     | 4 / 6 | C2 ❌ (cap); C5 ⚠️ (N/A — full caster from L1) → 5/6 actually |
| Paladin   | 4 / 6 | C2 ❌; C5 ⚠️ |
| Bard      | 4 / 6 | K2 ❌ (cap by slot not known table); K6 N/A — full caster from L1 → 5/6 |
| Sorcerer  | 4 / 6 | K2 ❌; K6 N/A → 5/6 |
| Warlock   | 4 / 6 (known) + 2 / 4 (pact) = **6 / 10** | K2 ❌; P3 ⚠️; P4 ❌ |
| Ranger    | 4 / 6 | K2 ❌; K6 ⚠️ |
| Wizard    | 1 / 5 ❌❌❌❌ | W1, W2, W3, W4 all ❌ — spellbook concept missing entirely |

**Total mismatches:** 8 unique bugs across 8 classes, but really 4 distinct
fix shapes:

1. **Cap by total prepared/known count, not per-spell-level slot count.**
   Fixes C2, K2, W3 — affects all 8 spellcasters.
2. **Add Wizard spellbook concept (data + UI).** Fixes W1, W2, W4.
3. **Add Mystic Arcanum picker for Warlock 11+.** Fixes P4.
4. **Tighten half-caster slot table at level 1 to return zero slots.** Fixes
   C5, K6 ⚠️ and prevents future consumers from getting spurious slots.

Plus one secondary fix:

5. **Decouple pact-slot display merge from pick-cap value.** Fixes P3 ⚠️.

Commit 4 will apply these fixes in priority order, with #1 and #4 being
the easiest / highest-impact.
