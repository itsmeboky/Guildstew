# Standard Creator Level-N Support — Recon (Layer 3)

**Status:** Recon complete. The infrastructure for level-N
characters mostly exists but isn't wired through to a UI. Two
follow-up commits cover the gaps.

**Reference:** `docs/character_creator_step5_recon.md` Layer 3
identified this gap during the step-5 stuck recon. Quick Create
and AI Generate are gated behind "Coming in 1.0" as of `29a6f56`,
so this audit only covers the **standard step-by-step creator**.

---

## What's already level-aware

These pieces work today for `characterData.level` 1–20; nothing in
Commits 3 / 4 has to rebuild them.

| Concern | Implementation | Notes |
|---|---|---|
| HP calculation | `calculateMaxHP({ class, level, conScore, multiclasses })` at `characterCalculations.jsx:43` | Already handles primary L1 max-die + average per subsequent + multiclass averages + CON mod. |
| Proficiency bonus | `proficiencyBonus(level)` at `dnd5eRules.js` | Standard PHB 2014 progression (+2 → +6). |
| Spell slots | `getSpellSlots(class, level, multiclasses)` at `spellData.jsx:650` | Full / half / third caster + multiclass combined caster level rule. |
| Pact magic | `getPactSlots(class, level, multiclasses)` at `spellData.jsx:857` | Warlock-specific table. |
| Cantrips known | `cantripsKnown(class, level)` at `dnd5eRules.js:3543` (registry `CANTRIPS_KNOWN`:378) | Already called from `SpellsStep.jsx:513`. |
| Class features cumulative-up-to-level | `getClassFeaturesForLevel(class, level)` at `classFeatures.js:639` | Returns flat list of every feature with `level <= passed level`. |
| Brewery (custom) class features | `getBreweryClassFeaturesAtLevel(class, level, subclass)` at `breweryClassApply.js:169` | Same shape, plus subclass features when a subclass is selected. |
| Brewery ASI levels | `getBreweryClassAsiLevels(class)` at `breweryClassApply.js:209` | Reads `is_asi: true` features from the brewery class definition. |
| ASI levels per class (PHB) | `ABILITY_SCORE_IMPROVEMENT_LEVELS` at `dnd5eRules.js:1294` | `{Fighter: [4,6,8,12,14,16,19], Rogue: [4,8,10,12,16,19], …}`. |
| Class hit dice | `CLASS_HIT_DICE` at `dnd5eRules.js:247` | d6 / d8 / d10 / d12 per class. |
| Multiclass entries with per-entry level | `characterData.multiclasses[].level` | `ClassFeaturesStep.jsx:78` adds; `:294` Select picker. |
| Class features with `choiceRequired` | Each feature with `choiceRequired: true` + `choices: [...]` is rendered as a dropdown / SubclassPicker by `ClassFeaturesStep.jsx:178` | Fighting Style, Primal Path, Bardic College, Domain, etc. |
| Subclass picker on choice features | `SubclassPicker` at `:181`, fed by `feature.choices` | Already arrow-picker UI per `0976761`. |
| Validator (Skills step) | `getSkillsCompletion` from `skillsCompletion.js` (Layer 1 + Layer 2) | Multiclass skill grants computed per RAW. |

## The actual gaps

Three holes in the UX wiring. Everything else is plumbing that
needs to be invoked.

### Gap 1 — No level selector

**This is the single biggest blocker.** `CharacterCreator.jsx:133`
hardcodes `level: 1` in the initial state. The user can:

- Edit individual `multiclasses[].level` in `ClassFeaturesStep`
  (which subtracts from primary level)
- That's it. There is **no UI to set `characterData.level` itself**.

So even though every helper above accepts a level parameter, the
input is permanently `1`. A "level 5 Wizard" can only exist if it's
loaded from an existing character record (`existingCharacter.level`
flows through the editCharacter loader at `:251`) or is generated
by Quick Create / AI (now disabled).

**Fix shape (Commit 3):** add a level dropdown / number input in
the Class step (after class picker, before subclass / multiclass
controls). Range 1-20. On change, recompute HP and proficiency
bonus on screen. Multiclass entries already handle their own
levels; total character level = sum of primary + multiclass entry
levels, which is what every helper expects.

### Gap 2 — No ASI / feat picker UI

Class features with `is_asi: true` exist in the brewery class data
shape (and `ABILITY_SCORE_IMPROVEMENT_LEVELS` enumerates the levels
per PHB class). But the only surface that mentions ASIs today is
`ClassStep.jsx:934-936`:

```jsx
ASI pending at level{asiReached.length > 1 ? "s" : ""}: {asiReached.join(", ")} —
```

That's a read-only banner. There is no widget for the player to
choose:

- +2 to one ability score (cap 20)
- +1 to two different ability scores (cap 20 each)
- A feat from the `FEATS` registry (`dnd5eRules.js:1309`) instead

Selections aren't stored anywhere on the character. `attributes`
is set once at `AbilityScoresStep` and not bumped by ASI choices.
`feature_choices` exists (used for Fighting Style, etc.) but
doesn't have a slot per ASI level.

**Fix shape (Commit 3):**
- New storage: `characterData.asiSelections = { [level]: { kind: 'asi'|'feat', ability1?, ability2?, feat? } }` or similar.
- New UI section in `ClassFeaturesStep` (or a dedicated step inserted between Abilities and Features): one card per ASI level the character has reached. Each card has the choice radio + the appropriate selectors.
- Apply ASI bumps to displayed ability scores throughout the rest of the flow (or store them as a derived value computed from `baseAttributes + sum(asiSelections)`).
- Feat list filtered by prerequisite (e.g., Great Weapon Master needs STR 13+; Spell Sniper needs casting ability).
- Cap enforcement: clamp to 20 per ability score.

This is the single hardest piece of Layer 3 because ASIs ripple
into ability-score-derived numbers across the sheet (HP from CON
bumps, spell save DCs, attack bonuses, skill modifiers, …).

### Gap 3 — Spells/features may need verification at higher levels

The infrastructure is there (`getSpellSlots`, `getClassFeaturesForLevel`)
but no level-N character has actually run through the standard
creator end-to-end (since Gap 1 prevents getting one). Plausible
issues that won't show up until Gap 1 is fixed:

- **Cantrips known scaling.** `SpellsStep.jsx:513` passes `level`
  to `cantripsKnown(cls, level)`. Should work; needs to be
  exercised at L4 (Wizard goes 3→4) and L10 (4→5).
- **Validator counts on the Spells step.** `validateStep('spells')`
  at `CharacterCreator.jsx:464` checks "every slot filled." A
  level-5 Wizard with 2× 3rd-level slots needs 2 selections — make
  sure the picker offers them.
- **Subclass-pick level gating.** Cleric / Sorcerer / Warlock pick
  subclass at level 1; Druid / Wizard at 2; most others at 3. The
  brewery class normalization at `ClassStep.jsx:39-40` filters
  `Number(f?.level) === 1` for `level1Features`, which suggests
  the level-1 filter assumes subclass-at-1; at higher levels this
  may not surface the subclass picker until a later step. Worth
  re-checking once Gap 1 lets us walk a level-3 Fighter through.
- **Per-class feature pickers** (Metamagic for Sorcerer at 3/10/17,
  Eldritch Invocations for Warlock at 2 with level-scaled count,
  Maneuvers for Battle Master, etc.). The registry has these as
  `choiceRequired` entries; they should render via the existing
  `ClassFeaturesStep` dropdown path. Verify in browser.
- **Multiclass spell slots.** `multiclassSpellSlots(totalCasterLevel)`
  exists at `dnd5eRules.js:3042`. Feeds into `getSpellSlots`.
  Should work; eyeball at Wizard 5 / Cleric 3.

**Fix shape (Commit 4):** mostly a verify-pass with targeted
patches where reality diverges from expectation. Don't preemptively
rewrite anything that's already correct.

## Schema notes

- **Top-level `level` field on `characterData`**: `CharacterCreator.jsx:133`. No per-class level concept at top level — primary class level is `total - sum(mc.level)`.
- **No `level` migration.** The `characters` table presumably has a `level` column already (existing records load with non-1 levels via `existingCharacter.level || prev.level` at `:251`). No schema change needed.
- **`characterData.feature_choices`**: keyed by `${className}-${level}-${featureName}`. ASI picks could co-locate here, OR live on a new `asiSelections` key. The latter is cleaner because ASIs need ability/feat data, not just a choice string.

## Multiclass × level interaction

The existing model:

- `characterData.level` = total character level (1-20)
- `characterData.multiclasses[]` = each entry has `class` + `level`
- Primary class level is **derived**: `total - sum(mc.level)`
- `ClassFeaturesStep:92-94` clamps multiclass level so primary
  stays ≥ 1.

This works fine for level-N. The level picker in Commit 3 just
edits `characterData.level`; the existing multiclass UI continues
to manage entry levels; primary recomputes implicitly.

The only edge case: if a player sets total = 5 with no multiclass,
then adds a multiclass at level 3, primary drops to 2. That's
consistent with how D&D actually works (a 5th-level character is
the SUM of class levels), and the existing clamp prevents primary
from dropping below 1.

## Validator review (CharacterCreator.jsx:463-495)

| step.id | Behavior at level > 1 | Status |
|---|---|---|
| race | name + race + background | ✅ level-independent |
| class | class + alignment | ✅ level-independent (level picker is a sibling control, not part of validation) |
| abilities | every score 3–18 | ⚠ ASI bumps may push some scores above 18 → above 20 cap, validator currently rejects |
| features | always returns true | ✅ |
| skills | `getSkillsCompletion(...).isComplete` | ✅ Layer 1 + Layer 2 |
| spells | every available slot filled (per `getSpellSlots`) | ✅ in theory; needs higher-level eyeball |
| equipment | always returns true | ✅ |
| review | always returns true | ✅ |

**Validator-side concern**: the `abilities` validator caps at 18,
which is correct for un-bumped rolled / point-buy / standard array
scores. After ASI is in play, scores can legitimately go up to 20
(or higher in edge cases). Need to either:

1. Keep the 18 cap on `attributes` (the BASE scores) and add
   `asiSelections` on top, computing displayed-totals as derived.
2. Bump the cap to 20 and let players set scores directly higher.

Option 1 is RAW-correct (ASI is its own choice; a level-1 stat
cap of 20 would skip it). Recommendation: keep the 18 cap on the
abilities step, surface ASI as its own step / section.

## Decision matrix for the next two commits

**Commit 3 — Level selector + ASI/feat picker + HP/prof scaling**

- Level dropdown UI in Class step.
- ASI / feat picker UI (probably its own collapsible section in
  `ClassFeaturesStep`, one card per `is_asi: true` feature reached).
- Storage: `characterData.asiSelections`.
- Apply ASI bumps to derived ability scores (a helper similar to
  `applyRacialBonuses` already in `raceData.jsx:128`).
- Feat list filtered by prerequisite. Read from `FEATS` registry.
- HP and prof bonus already recompute when `level` changes (the
  helpers are pure functions of level + class + conScore); the
  display surfaces in `ReviewStep` etc. should re-render
  naturally because `characterData.level` is a useState dependency.

**Commit 4 — Spells / features / subclass progression verification**

- Walk a level-5 Wizard, level-8 Sorcerer, level-7 Paladin, level-10
  Warlock, multiclass 5/3 caster through the creator end-to-end.
- For each, eyeball: cantrips count, slots count, subclass picker
  triggers, per-class feature pickers (Metamagic, Eldritch
  Invocations, Maneuvers, Pact Boon).
- Fix divergences. No preemptive rewrites.

## Out of scope for this Layer

- Quick Create / AI Generate — disabled via `29a6f56` until 1.0.
- 5e 2024/2026 ruleset migration — Layer 4, separate prompt.
- Level-up ON an existing character (post-creation). The creator
  flow handles "build a level N character from scratch." A
  separate "level up" wizard for existing characters is its own
  feature.
- Multiclass skill UX (Layer 2) — already shipped in `9686ed9`.

## Smells noted but not blocking

1. **`ABILITY_SCORE_IMPROVEMENT_LEVELS` (PHB) vs `getBreweryClassAsiLevels` (custom)** — two sources for the same data. Standard PHB classes go through one; custom (brewery) classes go through the other. ClassStep at `:826` calls the brewery helper for ALL classes (including PHB ones). Probably works because the brewery normalizer for PHB classes seeds the same is_asi features, but worth confirming the lists actually match.
2. **`STANDARD_ASI_LEVELS`** referenced in `breweryClassApply.js:206` — a parallel constant. Locate and reconcile or note as a follow-up.
3. **Primary class level isn't directly editable** — only deducible. The level dropdown will set total; multiclass entries deduct. UX is fine but worth a tooltip explaining "your Wizard level = total − multiclass levels".
