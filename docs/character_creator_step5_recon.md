# Character Creator — Step 5 Stuck + High-Level Creation Audit

**Status:** Recon complete. Bounded fix scope identified (Layer 1).
Structural issues filed for separate prompts (Layers 2–4).

**Symptoms reported:**
1. Some users get stuck on step 5 (Skills) with valid selections — Next stays disabled.
2. Higher-level (e.g., level 20) characters can't be made — missing skills, attribute points, etc.

---

## Layer 1 — Skills validator diverges from the UI **(BOUNDED FIX)**

### Root cause

`src/pages/CharacterCreator.jsx` and `src/components/characterCreator/SkillsStep.jsx` compute "is the Skills step complete?" with **different rules and different data sources**. The UI shows green / "complete"; the validator returns `false`; the Next button stays disabled.

#### `validateStep('skills')` — `src/pages/CharacterCreator.jsx:475-491`

```js
const primarySkillCount = classSkillCounts[characterData.class] || 2;       // ← LOCAL hardcoded map (line 68-71)
const multiclassSkillCount = (characterData.multiclasses || []).filter(mc => mc.class).length;
const racialBonusSkills =                                                    // ← LOCAL hardcoded checks
  characterData.race === "Half-Elf" ? 2 :
  characterData.race === "Human"    ? 1 :
  0;
const totalRequired = primarySkillCount + multiclassSkillCount + racialBonusSkills;
const backgroundSkillsFromData = getBackgroundSkills(characterData.background);  // ← LOCAL 13-entry map (line 74-92)
const selectedSkillsList = Object.entries(characterData.skills || {})
  .filter(([_, selected]) => selected).map(([skill]) => skill);
const nonBackgroundSkills = selectedSkillsList.filter(skill => !backgroundSkillsFromData.includes(skill));
return nonBackgroundSkills.length === totalRequired;
```

#### `SkillsStep.jsx` — `src/components/characterCreator/SkillsStep.jsx:107-188`

```js
// Reads the registry: CLASS_SKILL_CHOICES (dnd5eRules.js:3565),
// getRaceSkillProficiencies (raceData.jsx:103), getBackgroundSkills
// (backgroundData.jsx:83). Per-source counts:
const selectedFromClassList    = …filter(class list, exclude background + fixed-racial)…length
const selectedFromRacialBonus  = …filter(NOT class list, exclude background + fixed-racial)…length
const isComplete = totalSelectedNonBackground === (classSkillCount + racialBonusSkills)
                   && expertise.length === expertiseCount;
```

### Three orthogonal divergences

#### Divergence A — Fixed-racial skills (Elf, Half-Orc, etc.)

The registry says Elf gets `{ fixed: ["Perception"], choose: 0 }`. The UI auto-grants Perception as a locked chip and EXCLUDES it from the count. The validator does NOT exclude fixed-racial — it counts Perception as a "chosen" skill.

**Reproduction:** Elf Wizard with Sage background, picks Arcana + History.
- UI counts: class=2/2 ✓, racial=0/0 ✓, expertise=0/0 ✓ → "complete".
- Validator counts: `selected = [Perception, Insight, Religion, Arcana, History]`, `nonBackground = [Perception, Arcana, History]` (3), `totalRequired = 2 + 0 + 0 = 2` → `3 !== 2` → **stuck**.

**Affected races (per registry):** Elf, High Elf, Wood Elf, Dark Elf / Drow, Half-Orc.

#### Divergence B — Multiclass skill term

The validator adds 1 to `totalRequired` per multiclass entry (`multiclassSkillCount`). The UI **never surfaces a picker for multiclass skills**. The user can never select enough skills to satisfy the validator regardless of choices.

**Reproduction:** any character with a non-empty `multiclasses` array.
- UI: lets user pick `classSkillCount + racialBonusSkills` skills, considers complete.
- Validator: requires `classSkillCount + 1 (per multiclass) + racialBonusSkills` → **stuck**.

This affects every multiclass character on the standard creator path. (Multiclass mostly comes through QuickCreate / AI flows where `multiclasses` is set programmatically.)

Note on RAW: per 5e 2014/2024, multiclassing into a class grants a fixed subset of that class's proficiencies — most classes grant 0 skill proficiencies on multiclass entry; a few (Bard, Ranger, Rogue, Skald-style) grant 1. Adding 1 per multiclass is incorrect anyway.

#### Divergence C — Hardcoded race list misses registry races

The validator hardcodes `Half-Elf: 2, Human: 1` and zero for everyone else. The registry says **Variant Human** gets `{ choose: 1, from: "any" }` and base **Human** gets 0.

**Reproduction:** Variant Human Fighter, picks 2 Fighter skills + 1 racial bonus skill.
- UI counts: class=2/2 ✓, racial=1/1 ✓ → "complete".
- Validator: `racialBonusSkills = 0` (Variant Human not in hardcoded list). `nonBackground = 3`, `totalRequired = 2 + 0 + 0 = 2`. `3 !== 2` → **stuck**.

Conversely, base Human Fighter: validator says `racialBonusSkills = 1`, but the registry says 0 → UI lets player pick only 2 skills, validator wants 3 → stuck the other direction.

#### Divergence D (latent) — Validator skips expertise

Validator never checks `expertise.length === expertiseCount`. UI does. So a Rogue can advance past Skills WITHOUT picking expertise; later steps assume expertise was picked. Not a "stuck" bug — opposite, a "leak" bug.

### Recommended fix shape (Commit 2)

Extract the UI's completion logic into a shared helper, call it from BOTH SkillsStep (for in-step UI) and validateStep (for the gate). Single source of truth eliminates divergence by construction.

- New file: `src/components/characterCreator/skillsCompletion.js`
- Exports: `getSkillsCompletion(characterData)` returning `{ classSelected, classRequired, racialSelected, racialRequired, expertiseSelected, expertiseRequired, isComplete }`.
- Reads: `CLASS_SKILL_CHOICES` + `ALL_SKILLS` from `dnd5eRules`, `getRaceSkillProficiencies` from `raceData`, `getBackgroundSkills` from `backgroundData`. Internal `EXPERTISE_COUNTS = { Rogue: 2, Bard: 2 }`.
- `validateStep('skills')` becomes `return getSkillsCompletion(characterData).isComplete;`
- Delete the local `classSkillCounts` and local `getBackgroundSkills` in CharacterCreator.jsx (only used by the broken validator).

(SkillsStep can adopt the helper too, but the bounded fix doesn't require it — the divergence goes away as soon as ONE side reads from the registry. Refactoring SkillsStep is opportunistic cleanup, not part of the alpha-blocker fix.)

### Risk assessment

- Touches: validator logic in `CharacterCreator.jsx`, plus a new helper file.
- Does NOT touch: SkillsStep UI behavior, RAW rules, registry data, multiclass mechanics, the multiclass commits (`bec000c` and follow-ups), other validateStep branches.
- Backwards compatibility: pure correction. Characters that were already stuck become un-stuck. Characters that were correctly advancing continue to advance.

---

## Layer 2 — Multiclass skill UX gap **(STRUCTURAL — separate prompt)**

The validator was wrong to require `+1 per multiclass`, but the underlying gap is real: per RAW, multiclassing into Bard/Ranger/Rogue/etc. grants 1 skill from a per-class list. The UI doesn't expose a picker for it. Layer 1's fix removes the spurious requirement; doesn't add the missing picker.

Required for properly-modeled multiclass:
- Per-multiclass skill picker on Skills step (or on a multiclass sub-step) keyed off the entry-class's reduced grant list.
- Schema flag distinguishing "primary class skills" from "multiclass skills" so reload/edit doesn't lose them.

Out of scope for the alpha-blocker fix.

---

## Layer 3 — Level-20 / high-level character creation broken **(STRUCTURAL — separate prompt)**

### What's broken

The standard step-based creator hardcodes `level: 1` (`CharacterCreator.jsx:158`) with **no UI to change it**. Higher levels are only reachable through:

- **QuickCreateDialog** (`src/components/characterCreator/QuickCreateDialog.jsx`) — has a level dropdown, but skips structural application:
  - **Skills set to `{}`** (line 179 / line 211) regardless of level. Class skills + background skills + fixed racial skills + ASI-bonus skills not auto-picked.
  - **Attributes set to `optimalAttributes`** (level-1 array from `getOptimalStatsForClass`) without applying ASIs. A level-20 Fighter should have had 7 ASIs (extra Fighter ASI levels at 6, 14) — none applied.
  - **Spells set to `{ cantrips: [], level1: [] }`** — no high-level spells known/prepared.
  - **No subclass selected** for classes that pick subclass at level 1 (Cleric, Sorcerer, Warlock).
  - **No expertise picked** for Rogue / Bard.
  - **Proficiency bonus + max HP** are calculated correctly via helpers — those work.

- **AIGenerateFlow** — same shape as QuickCreate but populated by the LLM. Same gaps.

When a QuickCreate / AI level-20 character is loaded into the editor (via "Edit in Creator"), they land at step 1 (Race) and walk forward. Skills step finds 0 selections, validator rejects, **stuck immediately**. Even after Layer 1's validator fix, the user has to manually pick skills, ASIs, and spells across 20 levels of progression with no UI scaffolding.

### What would be needed for proper level-20 support

1. **Level picker in the standard creator** — number input or "1 / 5 / 10 / 20" presets at the top of the Class step (where level affects feature display already).

2. **ASI distribution UI** — for each ASI level reached, a "Pick: +2 to one stat / +1 to two stats / a feat" widget. The data layer (`ASI_RULES`, per-class `ASI_LEVELS`) is in `dnd5eRules.js`; the widget is missing.

3. **Per-level feature surface** — class features at every level the character has reached, with picks where the feature requires choosing (e.g., Fighting Style at Fighter 1, Maneuvers at Battle Master 3, etc.). `getBreweryClassFeaturesAtLevel` exists; the UI iterates only level-1 features (`ClassStep.jsx:40` filters `Number(f?.level) === 1`).

4. **Per-level spell knowledge** — spells known/prepared at the character's current level. Existing `SpellsStep` validates against `getSpellSlots(class, level, multiclasses)` which returns proper level scaling, but only for primary-class slots; spell *picking* has gaps for high-level prepared casters.

5. **Hit Points across levels** — fixed-rolls (average) or rolled per level, summed. `calculateMaxHP` exists; mid-tier UX (let player roll per level vs. take average) doesn't.

6. **QuickCreate auto-fill upgrade** — pre-populate skills (class + background), pick expertise where required, pick a default subclass, distribute ASIs to the optimal stats from `getOptimalStatsForClass`, fill spell slots with class-default lists. Without this, level-20 QuickCreate produces an unplayable shell.

This is a multi-prompt feature, not a fix. The alpha-blocker is the unstuck step 5; level-20 support is a follow-on item.

---

## Layer 4 — 5e 2024 / 2026 ruleset alignment **(STRUCTURAL — separate prompt)**

The user asked for 5e 2026 edition rules. The repo's data is mostly 5e 2014:

- **Half-Elf** still exists as a race (`raceData.jsx:38`); the 2024 PHB folds it into player-choice Heritage.
- **Human** has the 2014 `+1 to all six stats` block; 2024 Human is "Versatile" (Origin feat).
- **Background skill grants** are 2014-style (background = 2 fixed skills, e.g. Sage: Arcana + History). 2024 backgrounds bundle 2 skills + 1 tool prof + 1 Origin feat in a different format.
- **Origin feats** aren't represented at all — there's no separate "feat picker" for backgrounds.
- **Species** vs **race** terminology — repo uses "race" everywhere.
- **Skill proficiencies on multiclass entry** — 2024 changed several class lists; the repo's `CLASS_SKILL_CHOICES` matches PHB 2014.

Fixing Layer 4 is a **data migration**, not a code change. Affected files:
- `src/components/dnd5e/raceData.jsx`
- `src/components/dnd5e/backgroundData.jsx`
- `src/components/dnd5e/dnd5eRules.js` (CLASS_SKILL_CHOICES, ASI_LEVELS, multiclass entry tables)
- `src/components/characterCreator/RaceStep.jsx` (UI rebrand to Species + Heritage)
- `src/components/characterCreator/BasicInfoStep.jsx` (background → Origin feat picker)

Out of scope for this prompt. File as a "5e 2024 ruleset migration" feature.

---

## Decision

- **Commit 1 (this doc):** captures all four layers.
- **Commit 2 (next):** Layer 1 ONLY — extract `getSkillsCompletion` helper, replace the validator branch, delete the local duplicates. Targeted unstick of the alpha-reported step-5 hang.

Layer 2 (multiclass picker), Layer 3 (level-20 creation), Layer 4 (5e 2024 ruleset migration) get separate prompts when ready. Each is large enough to deserve its own audit and its own fix.

## Verify plan for Commit 2 (Layer 1 only)

1. **Elf Wizard, Sage background** — picks 2 Wizard class skills (Arcana, History). Should advance step 5 → step 6.
2. **Half-Orc Fighter, Soldier background** — picks 2 Fighter class skills. Should advance.
3. **Human Wizard, Sage background** — picks 2 Wizard class skills. Should advance (registry says base Human gets 0 racial bonus).
4. **Variant Human Wizard, Sage background** — picks 2 Wizard class skills + 1 racial bonus from anywhere. Should advance.
5. **Half-Elf Bard, Entertainer background** — picks 3 Bard class skills + 2 Half-Elf bonus skills. Should advance.
6. **Rogue (any race), any background** — picks 4 class skills + 2 expertise. Should advance. WITHOUT expertise, should stay blocked (this is a bug-fix in the same direction).
7. **Single-class characters that already worked** — picks correct counts, should still advance.
8. **Multiclass characters** — should be allowed to advance the Skills step now (was blocked by spurious +1 per multiclass term). Multiclass-skill picker work is Layer 2 and intentionally not blocking advancement here.
9. **Bard with skill picker** — `8b01215` made Bard accept any skill; Layer 1 fix preserves that path because the helper reads `from === 'any'` directly from the registry.
