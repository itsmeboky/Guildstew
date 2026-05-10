# Multiclass Character Creation — Audit Findings

Recon-only. No fix code. Documents how the existing character
creator handles multiclassing and which RAW rules it gets right,
wrong, or silently skips. Drives the followup multiclass-fix
prompt — the bugs called out below are intentionally left
in-place here so the next commit bundle has a clean diff to
target.

## Architecture overview

Multiclass entry lives in
`src/components/characterCreator/ClassFeaturesStep.jsx`. State
shape on `characterData`:

- `class` — primary class string (e.g. `"Bard"`)
- `level` — total character level
- `multiclasses` — `[{ class: string, level: number, archetype?: string }, ...]`
- Primary class level = `characterData.level - sum(multiclasses[].level)`

Add Class flow (lines 167–179): button enabled when
`canMulticlass = characterData.level >= 2 && primaryClassLevel >= 1`.
No prerequisite check, no gating beyond level math.

Supporting data in `src/components/dnd5e/dnd5eRules.js`:

- `MULTICLASS_REQUIREMENTS` (line 992) — exists, defines the
  ability-score prereqs per RAW.
- `CLASS_HIT_DICE`, `CLASS_SAVING_THROWS`,
  `CLASS_ARMOR_PROFICIENCIES`, `CLASS_WEAPON_PROFICIENCIES`,
  `CASTER_TYPE` — all per-class arrays.
- `FULL_CASTER_SLOTS`, `WARLOCK_PACT_SLOTS`, `halfCasterSlots()` —
  slot tables.

Spell-slot merging in `src/components/dnd5e/spellData.jsx`:

- `getSpellSlots(class, level, multiclasses)` (line 642) —
  computes effective caster level by summing per-class
  contributions (`getCasterContribution`, line 615): full caster
  = level, half caster = level/2, third caster (Eldritch
  Knight / Arcane Trickster, gated on archetype) =
  `(level - 2) / 3`. Final caster level is
  `Math.floor(sum)`. Cantrips known sums per-class via
  `getCantripsKnown(class, level)`.

HP in `src/components/dnd5e/characterCalculations.jsx` line 25:

```js
export function calculateMaxHP(className, level, conScore) {
  const hitDie = CLASS_HIT_DICE[className] || 8;
  const conMod = abilityModifier(conScore || 10);
  if (level === 1) return hitDie + conMod;
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + ((level - 1) * (avgPerLevel + conMod));
}
```

Class features per level in
`src/components/dnd5e/classFeatures.jsx` (queried via
`getClassFeaturesForLevel(class, classLevel)`). Per-class ASI
entries are encoded as `{ type: 'asi', ... }` inside the
features array (e.g. line 1176 of `dnd5eRules.js`).

## Verification matrix

For each row: ✓ correct / ✗ broken / ◐ partial / ? unable to
test from static analysis. Severity: **block** = gameplay-blocking,
**correct** = wrong number on sheet, **cosmetic**.

### 1. Prerequisite check (RAW PHB p. 163)

| Class | Required | Status |
|---|---|---|
| Barbarian | STR 13 | ✗ block |
| Bard | CHA 13 | ✗ block |
| Cleric | WIS 13 | ✗ block |
| Druid | WIS 13 | ✗ block |
| Fighter | STR 13 OR DEX 13 | ✗ block |
| Monk | DEX 13 AND WIS 13 | ✗ block |
| Paladin | STR 13 AND CHA 13 | ✗ block |
| Ranger | DEX 13 AND WIS 13 | ✗ block |
| Rogue | DEX 13 | ✗ block |
| Sorcerer | CHA 13 | ✗ block |
| Warlock | CHA 13 | ✗ block |
| Wizard | INT 13 | ✗ block |

**Symptom:** `ClassFeaturesStep.jsx:29-32` `handleAddMulticlass`
adds without checking ability scores. The class dropdown at line
192-201 shows every class regardless of prereqs (only filters
already-used). The data in `MULTICLASS_REQUIREMENTS` exists but
is unconsumed by the UI.

**Severity:** block. Players can build legally illegal
combinations (e.g., a Bard 1 with CHA 8 multiclassing into
Wizard with INT 8). This is the most visible RAW violation in
the system.

**Fix surface:** `ClassFeaturesStep.jsx` — gate `handleAddMulticlass`
+ filter the dropdown options + render a tooltip on disabled
options explaining the missing prereq. Importable helper from
`dnd5eRules.js` already exists.

### 2. Multiclass proficiency grant (RAW PHB p. 164)

**Status:** ✗ block (data missing entirely).

Per RAW, multiclassing into a class grants only a SUBSET of that
class's proficiencies — not the full primary list. Examples:

| Class | Multiclass-only proficiencies |
|---|---|
| Barbarian | Shields, simple/martial weapons |
| Bard | Light armor, one skill of choice, one musical instrument |
| Cleric | Light/medium armor, shields |
| Druid | Light/medium armor, shields (no metal) |
| Fighter | Light/medium armor, shields, simple/martial weapons |
| Monk | Simple weapons, shortswords |
| Paladin | Light/medium armor, shields, simple/martial weapons |
| Ranger | Light/medium armor, shields, simple/martial weapons, one skill from class list |
| Rogue | Light armor, one skill from class list, thieves' tools |
| Sorcerer | (none) |
| Warlock | Light armor, simple weapons |
| Wizard | (none) |

The codebase has `CLASS_ARMOR_PROFICIENCIES` /
`CLASS_WEAPON_PROFICIENCIES` for the FULL primary lists but no
`MULTICLASS_PROFICIENCIES` lookup table.
`ClassFeaturesStep.jsx` doesn't compute proficiency deltas on
multiclass add — secondary classes silently grant nothing on
the proficiency front, which is closer-to-correct than granting
the full primary list, but skill-of-choice and tool grants from
Bard / Ranger / Rogue multiclass are missing entirely.

**Severity:** block (correctness — armor/shield wear and
attack proficiency directly affect every combat roll).

**Fix surface:** add `MULTICLASS_PROFICIENCIES` to
`dnd5eRules.js`; consume it from a new effect in
`ClassFeaturesStep.jsx` that merges the deltas into
`characterData.proficiencies` whenever multiclasses change.

### 3. Spell slot merging (RAW PHB p. 164–165)

**Status:** ◐ partial.

Working in `getSpellSlots` (`spellData.jsx:642`):

- ✓ Full casters contribute 1:1.
- ✓ Half casters (Paladin/Ranger) contribute level/2.
- ✓ Third casters (Eldritch Knight, Arcane Trickster) contribute
  `(level - 2) / 3`, gated on the right archetype.
- ✓ Warlock excluded from the multiclass slot table — handled as
  Pact Magic separately.
- ✓ Cantrips summed per-class.

Possible issues — needs runtime confirmation but called out for
the followup:

- ✗ Half-caster slot floor: per RAW, you don't get spell slots
  from multiclass half-caster levels until level 2 of that
  class. Code has `level >= 2` floor in `dnd5eRules.js:369` for
  the SINGLE-class case; the multiclass path in
  `getCasterContribution` does `level / 2` unconditionally.
  Suspect: a Fighter 5 / Paladin 1 character would get +0.5
  effective caster level which floors to 0, so the bug is masked
  for level 1; but a Fighter 4 / Paladin 2 would correctly get
  +1, so the floor matters. Worth a verify pass.
- ◐ Rounding: `Math.floor(effectiveCasterLevelFloat)` —
  per RAW you round DOWN for multiclass except for half/third
  caster individual rounding. Matches RAW.

**Severity:** correct (one corner case at low levels).

### 4. Hit dice tracked per-class

**Status:** ✗ correct.

`characterCalculations.jsx:25` `calculateMaxHP` only accepts a
single `className` and computes the entire HP pool from one hit
die. A Fighter 5 / Wizard 3 character is computed as if all 8
levels were Fighter (8d10 hit dice), not 5d10 + 3d6. The hit
dice array on the character row doesn't appear to track
per-class buckets at all — `characterData.hit_points.max` is a
single number, no `hit_dice_pool` of `{ d6: 3, d10: 5 }` or
similar.

`ReviewStep.jsx:116-118` reflects the same bug:

```js
const hitDie = CLASS_HIT_DICE[characterData.class] || 10;
const maxHP = hitDie + conMod;
```

This shows level-1 max HP and ignores `multiclasses` entirely.
Note the Review step also looks at level 1 only — see #5.

**Severity:** block (correctness). The raw HP number on the
sheet is wrong for any multiclass character.

**Fix surface:** rewrite `calculateMaxHP` to accept the full
class breakdown:

```js
calculateMaxHP({
  classes: [{ class: 'Fighter', level: 5 }, { class: 'Wizard', level: 3 }],
  conScore,
});
```

Each class contributes `(hitDie + conMod)` for its first level
in that class IF it's the primary, else `(avgPerLevel + conMod)`
for all of its levels (multiclass levels never grant the
fixed-max-die bonus per RAW). Update all call sites
(`characterMapping.jsx:29` and `.ts.jsx:25`,
`QuickCreateDialog.jsx:169/201/290`, `ReviewStep.jsx:116`).

### 5. HP per level uses correct class

Bound up in #4. The avgPerLevel computation in
`calculateMaxHP` keys off `className` only — there's no notion
of "this level was a Wizard level so use d6, that level was a
Fighter level so use d10." A multiclass character's per-level
HP is uniformly the primary class's average. Same fix surface as
#4.

### 6. ASI / feat triggers at CLASS milestones

**Status:** ◐ partial.

Per RAW, ASI/feat fires at CLASS levels 4, 8, 12, 16, 19. So
Fighter 4 / Wizard 1 has had ONE ASI (from Fighter 4); Fighter
3 / Wizard 1 has had ZERO. Fighter additionally gets bonus ASIs
at 6 and 14.

`getClassFeaturesForLevel(class, classLevel)` in
`classFeatures.jsx` is called with the per-class level, and the
features array contains `{ type: 'asi', ... }` entries at the
right per-class levels — so the underlying lookup path is
correct. The UI code in
`ClassFeaturesStep.jsx:21-25` flat-maps multiclass features and
keys them with `featureKey = ${class}-${level}-${name}`, so
choices stick to the right class level.

What's not verifiable from static analysis: whether the ASI
choice actually mutates `characterData.attributes` correctly
when made through the multiclass branch (the same Select
component is reused), and whether Fighter's bonus ASIs at level
6/14 are encoded in `classFeatures.jsx`. Suspect both work but
need runtime confirmation.

**Severity:** ? — likely working, untestable from static read.

### 7. Class features at split levels

**Status:** ✓.

`getClassFeaturesForLevel(class, classLevel)` accepts class +
class-level pair and returns the right features for that class
at that level. `ClassFeaturesStep.jsx:21-25` calls it once per
multiclass entry with each entry's own level. Bard 3
specifically (subclass-pick level) → returns the Bard College
choice feature. Same for Cleric 1, Wizard 2, etc.

The College-of-Lore-vs-Valor / Domain-vs-Domain choice surfaces
through the `choiceRequired` + `choices` shape on the feature.
Currently rendered as a Select dropdown (line 136–158) — that's
exactly the surface Commit 2 of this bundle replaces with the
arrow picker.

### 8. Cantrips known / spells known

**Status:** ✓ for cantrips; ◐ for spells known.

Cantrips: `getSpellSlots` (`spellData.jsx:679-686`) sums
`getCantripsKnown(class, level)` across primary + all
multiclass entries. Per RAW (PHB p. 165), cantrips known is
tracked PER CLASS, not summed — but the practical effect for a
character sheet that shows "you know N cantrips" is the sum, so
this is fine for display.

Spells known is harder. Bard 3 / Sorcerer 2 should have Bard's
3rd-level spells known (4) AND Sorcerer's 2nd-level spells
known (3) tracked separately. Bards LEARN spells; Wizards
PREPARE from a spellbook; the multiclass spell selection UI
needs to honour each class's own list per per-class level.
Looking at `SpellsStep.jsx`, the spell selection groups by
spell level (cantrips, level1, level2, ...) using
`availableSpells = getAllAvailableSpells(class, multiclasses)`
which presumably unions class lists, but the per-class
"spells-known cap" (4 + INT for Wizard's spellbook addition,
fixed table for Bard/Sorcerer/Ranger) doesn't appear to be
enforced per-class — it's enforced as a single cap derived
from spell slot count.

**Severity:** correct. Doesn't block creation but wrong number
of spells known on sheet.

**Fix surface:** `SpellsStep.jsx` needs per-class
spells-known counters when multiclassing.

### 9. Saving throw proficiencies

**Status:** ✗ correct (low severity, hard-to-detect).

Per RAW: only the FIRST class chosen at level 1 grants saving
throw proficiencies (PHB p. 164). Multiclassing into another
class does NOT add saves.

Codebase: `characterMapping.jsx:124` and `:240` carry forward
`characterData.saving_throws || {}` from form state but I see
no place that initialises `saving_throws` from
`CLASS_SAVING_THROWS[class]` when the primary class is picked,
nor any place that ADDS to it on multiclass. So saving throws
are likely unwired entirely on the character creator side —
probably populated elsewhere (auto-derive from primary class on
sheet render) or just not surfaced at creation time.

**Severity:** correct (if it's auto-derived at render); block
if not. Untestable from static read.

## Summary

| Row | Status |
|---|---|
| 1 Prerequisites | ✗ block (data exists, UI doesn't consume it) |
| 2 Multiclass proficiencies | ✗ block (data missing entirely) |
| 3 Spell slot merging | ◐ partial (one half-caster floor case) |
| 4 Hit dice per-class | ✗ block (HP wrong for any multiclass) |
| 5 HP per-level by class | ✗ block (same bug as #4) |
| 6 ASI/feat triggers | ? likely ✓, needs runtime |
| 7 Class features at split levels | ✓ |
| 8 Cantrips/spells known | ◐ partial |
| 9 Saving throws first-class only | ? likely ✓ if auto-derived |

**Broken (block-severity):** 4 (Prereqs, Multiclass profs, HP
calc, HP per-level — last two are the same bug).
**Partial (correct-severity):** 2 (slot floor edge case,
spells-known cap).
**Working:** 1 (split-level features).
**Needs runtime verification:** 2 (ASI mutation through
multiclass branch, saving-throw initialisation).

## Recommended fix order for the followup commit bundle

1. **Multiclass prerequisites** — wire
   `MULTICLASS_REQUIREMENTS` through to
   `ClassFeaturesStep.jsx`. Filter / disable the class dropdown
   when prereqs aren't met; render a tooltip explaining why
   each disabled option is unavailable. Bounded change in one
   file. Highest ROI — visible to every player attempting a
   multiclass.
2. **Per-class HP calculation** — refactor `calculateMaxHP` to
   accept `[{ class, level }]`. Update all 6 call sites. Add
   tests if a test harness is in place. Affects every
   multiclass character's sheet immediately.
3. **Multiclass proficiencies** — add
   `MULTICLASS_PROFICIENCIES` table to `dnd5eRules.js`; new
   effect in `ClassFeaturesStep.jsx` merges deltas. Less
   visible but RAW-correct.
4. **Spells-known per-class cap** — `SpellsStep.jsx` per-class
   counters. Mostly UI work.
5. **Half-caster floor edge case** — small fix in
   `getCasterContribution`. Worth confirming with a few
   manually-built characters first.

Items 6 and 9 (ASI mutation, saving throws) need a runtime
verification pass before scoping fixes — could already be
correct.

## Smells filed during recon

1. **Two `getSpellSlots` exports.** `dnd5eRules.js:365` and
   `spellData.jsx:642` both export functions with the same name
   and overlapping responsibilities. The single-class one in
   `dnd5eRules.js` ignores multiclasses; the multi-class one in
   `spellData.jsx` is the production entry point. If a future
   caller imports the wrong one, multiclass slots silently
   regress to single-class.
2. **`characterMapping.jsx` and `characterMapping.ts.jsx` both
   exist.** Two near-identical files, lines 25 / 29 differ by
   one line. Risk of drift — fix one, miss the other. Worth
   collapsing.
3. **`MULTICLASS_REQUIREMENTS` exists unconsumed.** Dead data is
   worse than no data — implies the feature was scoped, partly
   built, and then dropped. Easy win to wire it up.
4. **HP calculation hardcodes `|| 10` and `|| 8` defaults**
   (`calculateMaxHP` and `ReviewStep.jsx:116` use different
   defaults). Should fail loud on unknown class instead of
   silently picking a number.
5. **Subclass picker is a Select dropdown.** Already targeted
   by Commit 2 of this bundle but worth noting — the same
   dropdown pattern handles other "make a choice" features
   (fighting style, expertise picks, etc.) and the new
   arrow-picker should evaluate whether to extend to those too
   (probably not — they're shorter lists).
