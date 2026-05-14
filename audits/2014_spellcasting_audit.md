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
| **C2.** Prepared count ENFORCED in picker | Player should be able to pick up to `formula(abilityMod, level)` spells, distributed across spell levels they can cast (any combo). | **Fixed in Commit 4.** New `prepKnownCap` total (sum across spellcasting classes) drives the picker disable. Cantrips have separate `cantripCap`. Header now shows "Spells: X/Y prepared/known" and "Level N: M casts/day" as separate axes. | ✅ | `SpellsStep.jsx:74-128` (caps), `:380-396` (disable) |
| **C3.** Available pool = entire class spell list, filtered by max spell level | When picking, player sees every spell on the class's list at or below their max castable level. | `getAllAvailableSpells()` returns spells filtered by class + level, gated by `getMaxSpellLevelForCharacter()`. Pool is correct; it's the **full class list**, not a subset. | ✅ | `spellData.jsx:784, 937` |
| **C4.** Paladin gets no cantrips | Cantrip count for Paladin is null/zero in the spellcaster table. | `SPELLS_KNOWN_TABLE.Paladin: { cantrips: null, ... }`. `cantripsKnown('Paladin', any)` returns 0. `spellsByClass.Paladin.cantrips: []`. UI: cantrips section iterates `Object.keys(spellSlots)` and only renders sections with `slots > 0` — `spellSlots.cantrips` for Paladin is never set, so the cantrips section is hidden. | ✅ | `dnd5eRules.js:3239`, `spellData.jsx:402` |
| **C5.** Paladin spellcasting starts at level 2 | A Paladin character at level 1 has zero spellcasting. | **Fixed in Commit 4.** `halfCasterSlots(1)` now returns `[]` (was `[2]`). `getSingleClassSpellSlots('Paladin', 1)` cascades to `slots[level1] = 0`, so the "No Spells Available" banner correctly fires. Audit had this as ⚠️ but the bug actually manifested in the UI — Paladin/Ranger 1 used to see a 1st-level picker they shouldn't. | ✅ | `dnd5eRules.js:380`, `rules.js:374` |
| **C6.** Spells changeable on every long rest | Player can re-prepare on each long rest from the full class list. | UI doesn't model rest-cycle spell prep at all — this is a "post-creation play loop" feature, not a creator concern. The creator just locks in the initial preparation. The `SPELLS_KNOWN_TABLE.Cleric.changeDaily: true` flag exists but no UI consumes it. ℹ️ Out of scope for the creator step itself; flag for the character-sheet / play-loop scope. | ℹ️ | `dnd5eRules.js:3225, 3234` |

---

## Bard / Sorcerer / Warlock / Ranger — Known

| Rule | Spec | Code | Status | File:line |
|---|---|---|---|---|
| **K1.** Spells known per class table | Fixed table per class (Bard 1:4, 2:5, 3:6, ... 20:22; Sorcerer 1:2 ... 17:15; Warlock 1:2 ... 19:15; Ranger 2:2, 3:3, 5:4, ... 19:11). | `SPELLS_KNOWN_TABLE` for each class has a `spellsKnown` map matching the spec exactly. `spellsKnown()` returns the right value. | ✅ (data layer) | `dnd5eRules.js:3210, 3251, 3261, 3271` |
| **K2.** Known count ENFORCED in picker | Player can pick up to `spellsKnown[level]` spells total across the eligible levels. | **Fixed in Commit 4.** Same `prepKnownCap` total drives known-caster picker. Sorcerer L5: cap is now 6 known total across L1/L2/L3, not per-level. | ✅ | `SpellsStep.jsx:74-128`, `:380-396` |
| **K3.** Choose from class's full spell list at creation | Pool = full class list filtered to learnable spell levels. | `getAllAvailableSpells()` returns the full class list. ✅ | ✅ | `spellData.jsx:784` |
| **K4.** Can swap one on level-up | On gaining a class level, player can replace ONE known spell with another from the class list. | `SPELLS_KNOWN_TABLE.{Bard,Sorcerer,Warlock,Ranger}.swapOnLevelUp: 1` exists. The creator has no level-up flow that uses it (level-up flow audited in Vetting Commit 9 area). At creation time, this rule doesn't apply (player picks fresh). ℹ️ Data exists; level-up consumer to be vetted separately. | ℹ️ | `dnd5eRules.js:3214, 3265, 3275, 3256` |
| **K5.** Ranger gets no cantrips | Cantrip count for Ranger is null. | `SPELLS_KNOWN_TABLE.Ranger: { cantrips: null, ... }`. `cantripsKnown('Ranger', any)` returns 0. `spellsByClass.Ranger.cantrips: []`. UI hides the cantrips section. | ✅ | `dnd5eRules.js:3249`, `spellData.jsx:407` |
| **K6.** Ranger spellcasting starts at level 2 | A Ranger at level 1 has zero spellcasting. | **Fixed in Commit 4** alongside C5. Same `halfCasterSlots(1) → []` fix applies to Ranger. | ✅ | `dnd5eRules.js:380`, `rules.js:374` |

---

## Wizard — Spellbook

| Rule | Spec | Code | Status | File:line |
|---|---|---|---|---|
| **W1.** Starts with 3 cantrips + 6 first-level spells in spellbook | At character creation, Wizard's spellbook contains 6 chosen 1st-level spells and the player knows 3 cantrips. | `SPELLS_KNOWN_TABLE.Wizard.startingSpells: 6` (data), and `cantrips: { 1: 3, ... }`. There is **no spellbook concept anywhere in the creator** — no spellbook picker, no spellbook persistence on the character record, no separate "spellbook contents" vs "prepared spells" distinction. | ❌ | `dnd5eRules.js:3284-3289` (data only); UI gap |
| **W2.** Gains 2 spells per Wizard level | On level-up the spellbook grows by 2 Wizard spells. | `spellsPerLevel: 2` exists in data. No consumer in the creator. Same UI gap as W1 — without a spellbook concept, this rule has nowhere to attach. | ❌ | `dnd5eRules.js:3285` (data only) |
| **W3.** Prepared count = INT mod + Wizard level | At each long rest, prepare INT + Wizard-level spells. | **Fixed in Commit 4.** `prepKnownCap` now includes the Wizard spellbook branch (`data.type === 'spellbook'` reaches for `preparedFormula(intMod, level)`). | ✅ | `SpellsStep.jsx:108-127` |
| **W4.** Prepared spells drawn from SPELLBOOK, not full Wizard list | Wizard's prepared list is a subset of their spellbook (which is itself a subset of the full Wizard list). | `getAllAvailableSpells()` returns the **full Wizard spell list** — the picker shows every Wizard spell, not a spellbook subset. Without spellbook persistence on the character (W1 gap), there's no subset to show even if the picker tried. **Most player-facing creator-spellcasting bug**: a Wizard player at creation could pick any Wizard spell as "prepared" with no spellbook gate. | ❌ | `spellData.jsx:784-862` |
| **W5.** Can cast any Ritual-tagged spell from spellbook without preparing | Wizard's ritual-from-spellbook special rule. | No ritual surfacing in the creator UI at all. `RITUAL_CASTING` constant exists at `dnd5eRules.js:701` but is not consumed. ℹ️ Cosmetic for the creator step (rituals are a play-loop feature), but the data path needs to acknowledge spell `ritual` flags so the sheet / combat engine can branch on them. Worth flagging because the Wizard ritual rule is the most distinctive ritual rule in the game. | ℹ️ | `dnd5eRules.js:701` (data only) |

---

## Warlock — Pact Magic

| Rule | Spec | Code | Status | File:line |
|---|---|---|---|---|
| **P1.** Slot count + slot level per Warlock level | Per `WARLOCK_PACT_SLOTS`: 1:1@1st, 2:2@1st, 3-4:2@2nd, 5-6:2@3rd, 7-8:2@4th, 9-10:2@5th, 11-16:3@5th, 17-20:4@5th. | `WARLOCK_PACT_SLOTS` table matches the spec for all 20 levels. `getPactSlots()` looks it up, including multiclass tally of all Warlock levels. | ✅ | `dnd5eRules.js:339-362`, `spellData.jsx:862` |
| **P2.** All Pact Magic slots cast at the SAME level (the highest the table says) | Slots aren't separated by level — they're a flat pool, all of one level. | `getPactSlots()` returns `{ slotLevel, slots, ... }` as a single bundle. UI displays it correctly: *"X slots of Yth level"*. | ✅ | `SpellsStep.jsx:243-254` |
| **P3.** Pact slot pool separate from regular spell slots | A Warlock 5 / Wizard 5 has 2 Pact slots @ 3rd PLUS Wizard's full-caster slots; they don't combine. | **Resolved in Commit 4 as a side effect of the cap-by-total fix.** The pact-slot display merge in `getSlotsForLevelKey()` is preserved (cosmetic — the per-row "M casts/day" line still shows the merged total) but the picker disable is now driven by `prepKnownCap` (per-class TOTAL prepared/known) instead of `slots`. Multiclass Warlock / Wizard players no longer see the pact + Wizard slot counts conflate into a fungible pick budget. | ✅ | `SpellsStep.jsx:71-86, 380-396` |
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

## Summary (after Commit 4)

| Class | Pass / Total | Notes |
|---|---|---|
| Cleric    | 6 / 6 ✅ | C2 + C5 fixed in Commit 4 |
| Druid     | 6 / 6 ✅ | C2 fixed |
| Paladin   | 6 / 6 ✅ | C2 + C5 fixed |
| Bard      | 6 / 6 ✅ | K2 fixed |
| Sorcerer  | 6 / 6 ✅ | K2 fixed |
| Ranger    | 6 / 6 ✅ | K2 + K6 fixed |
| Warlock   | 6 / 6 (known) + 3 / 4 (pact) = **9 / 10** | K2 + P3 fixed; **P4 ❌ deferred** (Mystic Arcanum picker — separate UI feature) |
| Wizard    | 2 / 5 ❌❌❌ | W3 fixed (cap formula now used); **W1, W2, W4 deferred** (spellbook concept — needs schema field + two-step UI flow) |

**Shipped in Commit 4 (3 fix shapes covering 6 of the 8 unique bugs):**
1. ✅ Cap by total prepared/known count → C2, K2, W3
2. ✅ Half-caster slot table returns `[]` at level 1 → C5, K6
3. ✅ Pact-slot display merge decoupled from pick cap → P3

**Deferred to follow-up commits (filed for sequencing):**
- ❌ **W1 / W2 / W4 — Wizard spellbook concept.** Needs `character.spellbook = { cantrips, spells }` data field, persistence, two-step UI flow at creation (pick into spellbook → pick prepared from spellbook), and gating `getAllAvailableSpells` for Wizards. Significant scope; its own commit.
- ❌ **P4 — Mystic Arcanum picker for Warlock 11+.** Needs a separate UI surface for the 1/long-rest free 6th-9th level spells. Low alpha impact (testers create at L1-10), high impact for high-level starts. Its own commit.
