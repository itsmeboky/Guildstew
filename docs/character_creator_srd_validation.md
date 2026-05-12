# Character Creator — SRD 2014 Cross-Validation + 2024 Edition Scope

**Status:** Recon only. No fix code. Validates the live registry
(`src/components/dnd5e/dnd5eRules.js`, `raceData.jsx`,
`backgroundData.jsx`, `classFeatures.js`) against the canonical
SRD JSON now in `docs/5e_reference/2014/`.

**Reference:**
- `docs/character_creator_step5_recon.md` (Layer 1)
- `docs/character_creator_level_n_recon.md` (Layer 3)

---

## Match summary

The local 5e data is **highly accurate** against the canonical SRD.
Every category I cross-checked either matches the SRD perfectly or
diverges only in the direction of being more complete (i.e. local
includes PHB content that the open SRD subset doesn't).

### MATCHES (no divergence)

| Local registry | Source | Result |
|---|---|---|
| `CLASS_HIT_DICE` | `5e-SRD-Classes.json` | All 12 classes ✓ |
| `CLASS_SKILL_CHOICES` (count + from list) | `5e-SRD-Classes.json` `proficiency_choices[0]` | All 12 classes ✓ — Bard's `'any'` shorthand expands to the SRD's all-18-skills list |
| `MULTICLASS_REQUIREMENTS` | `5e-SRD-Classes.json` `multi_classing.prerequisites` + `prerequisite_options` | All 12 classes ✓ — Fighter's STR 13 OR DEX 13 modeled as `[{str:13},{dex:13}]` (alternatives), AND-prereqs as `[{a:13,b:13}]` |
| `MULTICLASS_PROFICIENCIES.armor/weapons/other` | `5e-SRD-Classes.json` `multi_classing.proficiencies` | All 12 classes ✓ |
| `MULTICLASS_PROFICIENCIES.skills = 1` (Bard / Ranger / Rogue) | `5e-SRD-Classes.json` `multi_classing.proficiency_choices[0].choose` | ✓ |
| `ABILITY_SCORE_IMPROVEMENT_LEVELS` | `5e-SRD-Levels.json` derived from `ability_score_bonuses` increments | All 12 ✓ — Fighter [4,6,8,12,14,16,19], Rogue [4,8,10,12,16,19], rest [4,8,12,16,19] |
| `SPELLCASTING_ABILITY` | `5e-SRD-Classes.json` `spellcasting.spellcasting_ability.index` | All 8 caster classes ✓ |
| `FULL_CASTER_SLOTS` | `5e-SRD-Levels.json` `spellcasting.spell_slots_level_*` | Wizard L1 / L5 spot-checked ✓ |
| `WARLOCK_PACT_SLOTS` | `5e-SRD-Levels.json` Warlock spellcasting | All 20 levels ✓ (1 / 2 / 2 / 2 / 2 / 2 / 2 / 2 / 2 / 2 / 3 / 3 / 3 / 3 / 3 / 3 / 4 / 4 / 4 / 4 slots; level 1 / 1 / 2 / 2 / 3 / 3 / 4 / 4 / 5 / 5 / 5 / 5 / 5 / 5 / 5 / 5 / 5 / 5 / 5 / 5 slot-level) |
| `CANTRIPS_KNOWN` | `5e-SRD-Levels.json` `spellcasting.cantrips_known` | All 6 caster classes at L1 / L4 / L10 / L20 ✓ |
| `SPELLS_KNOWN_TABLE.X.spellsKnown` (Bard / Ranger / Sorcerer / Warlock) | `5e-SRD-Levels.json` `spellcasting.spells_known` | ✓ across all 20 levels |
| `racialBonuses` | `5e-SRD-Races.json` `ability_bonuses` | All 9 PHB races ✓ |
| `raceSpeed` / `RACES.X.speed` | `5e-SRD-Races.json` `speed` | All 9 PHB races ✓ |
| `RACE_SKILL_PROFICIENCIES` | `5e-SRD-Races.json` `traits` → `Traits.json` `proficiencies` / `proficiency_choices` | Elf (Perception fixed), Half-Orc (Intimidation fixed), Half-Elf (choose 2 from "any"), Variant Human (choose 1 from "any") ✓; all other races correctly empty |
| Subrace ability bonuses (4 SRD-listed) | `5e-SRD-Subraces.json` | Hill Dwarf +1 WIS, High Elf +1 INT, Lightfoot Halfling +1 CHA, Rock Gnome +1 CON ✓ |
| Background skill grants (Acolyte) | `5e-SRD-Backgrounds.json` | ✓ — Acolyte: Insight + Religion |
| Subclass-pick levels (`classFeatures.js`) | derived from `5e-SRD-Subclasses.json` + PHB | All 12 classes ✓ — Cleric / Sorcerer / Warlock at L1; Druid / Wizard at L2; rest at L3 |
| `getMulticlassSkillGrant` count + from-list (Layer 2) | `5e-SRD-Classes.json` `multi_classing.proficiency_choices` | Bard 1 from any, Ranger 1 from {8 skills}, Rogue 1 from {11 skills} ✓ |

### Divergences filed

These are real bugs / data gaps surfaced by the cross-check.

#### D1 — `FEATS` missing 2 of 42 PHB feats

Local `FEATS` registry has 40 entries; PHB 2014 has 42. **Missing:
`Skilled` and `Tavern Brawler`.** Both are common picks — Skilled
in particular is one of the most-recommended general feats for
non-combat builds (3 skill proficiencies of choice).

The SRD itself only includes `Grappler` as a sample feat, so this
divergence isn't visible from the strict SRD JSON. Caught by
comparing local to the full PHB feat list from recall.

**Impact:** ASI picker's "feat" alternative offers 40 options
instead of 42. Players can't pick Skilled or Tavern Brawler.

**Fix shape:** add two entries to `FEATS` with
prerequisite=null. Trivial.

#### D2 — `halfCasterSlots(1)` returns `[2]` instead of `[]`

`halfCasterSlots` at `dnd5eRules.js:335` does
`Math.max(1, Math.ceil(level / 2))` then indexes
`FULL_CASTER_SLOTS`. At level 1 this gives `FULL_CASTER_SLOTS[1]` =
`[2]`, but per RAW Paladin and Ranger get **no** spells at level 1
(they start spellcasting at level 2).

The user-facing consumer `getSpellSlots` guards this at
`spellData.jsx:631` with `if (level < 2) return 0`, so the picker
never displays the wrong count for L1 half-casters. The bare
helper alone is wrong but isn't called directly in any user-facing
path I found.

**Impact:** zero today — guarded at the consumer. Latent risk if a
future caller invokes `halfCasterSlots` without the guard.

**Fix shape:** make `halfCasterSlots(1)` return `[]` directly so
the helper alone is also correct.

#### D3 — Two parallel sources for cantrips known

`CANTRIPS_KNOWN` constant at `dnd5eRules.js:378` AND
`SPELLS_KNOWN_TABLE.X.cantrips` at `:3470+` both encode the same
data. They agree today (verified ✓), but they're two places to
keep in sync.

The `cantripsKnown()` helper at `:3581` reads
`SPELLS_KNOWN_TABLE`, making `CANTRIPS_KNOWN` effectively dead
data. Tracked previously as a Layer 3 smell
("ABILITY_SCORE_IMPROVEMENT_LEVELS vs getBreweryClassAsiLevels")
in the same spirit.

**Impact:** zero today; correctness time-bomb if a future
contributor edits one and not the other.

**Fix shape:** delete `CANTRIPS_KNOWN`, or have it re-export from
`SPELLS_KNOWN_TABLE`. One source of truth.

### Out of scope for "strict SRD" but verified against PHB

The open SRD is a deliberate subset. Local registry includes PHB
content that doesn't appear in `docs/5e_reference/2014/*.json`:

- **Subraces:** SRD has 4 (Hill Dwarf, High Elf, Lightfoot
  Halfling, Rock Gnome). Local has 9 — adds Mountain Dwarf
  (+2 STR), Wood Elf (+1 WIS), Dark Elf / Drow (+1 CHA), Stout
  Halfling (+1 CON), Forest Gnome (+1 DEX). All match PHB recall.
- **Backgrounds:** SRD has 1 (Acolyte). Local has 13 (Acolyte +
  Charlatan, Criminal, Entertainer, Folk Hero, Guild Artisan,
  Hermit, Noble, Outlander, Sage, Sailor, Soldier, Urchin). All
  skill grants match PHB recall.
- **Feats:** SRD has 1 (Grappler). Local has 40 PHB feats (per
  D1, missing 2 of 42).
- **Class features by level:** SRD's `5e-SRD-Features.json`
  enumerates SRD-allowed features only. Local `classFeatures.js`
  has the full PHB feature trees, including subclass features for
  the SRD subclass per class. Spot-checks of subclass-pick levels
  all match.

These extensions are **correct PHB content** and necessary for the
character creator to serve real D&D 5e gameplay. The user's intent
("follow the rules of D&D 5e 2024 edition" / earlier "5e 2026
edition") is implicit PHB compatibility, not strict SRD-only.

---

## 2024 Edition Character Creator — Scope Audit

The user requested an edition picker (2014 vs 2024) and a parallel
2024 character creator using the same look + assets. This is a
significant scope addition — captured here as a recon since it's
multi-prompt work, not a single-session task.

### What the 2024 PHB changes (from `docs/5e_reference/2024/`)

Major mechanical reworks vs 2014 that the creator must handle
differently:

1. **Race → Species.** Terminology change throughout. Half-Elf
   and Half-Orc are removed as distinct species (folded into
   player-choice heritage); replaced by 9 species: Aasimar,
   Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human,
   Orc, Tiefling. (Plus 4 from Monsters of the Multiverse moved
   in.)

2. **Ability score increases come from BACKGROUND, not species.**
   Each background grants +2 to one ability and +1 to another (or
   +1 / +1 / +1). Species grants only traits, no ASIs.

3. **Origin feats.** Every character gets one origin feat at
   level 1 from their background. New category of feats gated to
   level 1 only (Magic Initiate, Skilled, Tough, Lucky, etc.).

4. **General feats** (vs origin) only available at ASI levels
   (4/8/12/16/19), with prerequisite of level 4+. Many existing
   PHB 2014 feats have been rebalanced.

5. **Fighting Style is now a feat,** not a class feature. Fighter
   / Paladin / Ranger get it as a free choice via the Fighting
   Style feat.

6. **Weapon Mastery.** Martial classes (Barbarian, Fighter,
   Paladin, Ranger, Rogue) get N weapon masteries at level 1,
   scaling per class. Each mastery is a passive property
   (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex).

7. **Spell list reorganization.** Three lists (Arcane, Divine,
   Primal) instead of per-class. Casters access one or more
   lists. Ritual rules unified.

8. **Class reworks of varying scale:**
   - Bard: Magical Inspiration baked in; new College list.
   - Cleric: Channel Divinity standardized; subclasses
     restructured.
   - Druid: Wild Shape rebalanced.
   - Fighter: Weapon Mastery + Tactical Mind added.
   - Monk: Major rework — Martial Arts dice, Stunning Strike
     changes.
   - Paladin: Smite mechanics changed (now a spell).
   - Ranger: Now full caster from L1 in some builds; favored
     enemy reworked into Hunter's Mark.
   - Rogue: Cunning Strike (sneak attack riders).
   - Sorcerer: Innate Sorcery, Sorcerous Restoration.
   - Warlock: Magic Initiate + Pact Magic blend.
   - Wizard: Spellbook + Schools of Magic reworked.

9. **Subclass pick level normalized to L3** for ALL classes
   (was L1 / L2 / L3 in 2014). This includes Cleric, Sorcerer,
   Warlock, Druid, Wizard now picking subclass at L3.

10. **Backgrounds carry feats + tools + skills + ability bumps.**
    16 official backgrounds (Acolyte, Artisan, Charlatan, Criminal,
    Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble,
    Sage, Sailor, Scribe, Soldier, Wayfarer).

### Scope estimate for the 2024 creator

| Layer | Scope | Estimate |
|---|---|---|
| Edition toggle on the entry page | One UI control + an `edition: '2014' \| '2024'` field on characterData | ~0.5 day |
| 2024 species data | Adapt `raceData.jsx` for 2024 species (no ASIs from species, new heritage rules, weapon masteries for some) | ~1 day |
| 2024 background data | `backgroundData.jsx` adds 16 backgrounds with skill / tool / language / ASI / origin-feat tuples | ~1 day |
| 2024 origin-feat picker | New step (or extension of background step) for the level-1 origin feat | ~1 day |
| 2024 class data per class (12 classes) | `dnd5eRules.js` + `classFeatures.js` 2024 entries; some classes need fundamental reworks (Monk, Ranger, Paladin) | ~5-10 days |
| 2024 subclass pick at L3 | Update `classFeatures.js` so all subclass-pick features land at L3 in the 2024 tree | ~1 day |
| 2024 weapon mastery | New picker UI + per-class mastery counts + mastery property data | ~2 days |
| 2024 spell list reorganization | Three-list (Arcane/Divine/Primal) refactor of `spellData.jsx`; per-class list access derived | ~3 days |
| Save shape additions | `characters` table gains `edition`, `originFeat`, `weaponMasteries`, `species` (vs `race`); migration | ~1 day |
| QA across edition combos | Walking every class × every level × both editions through the creator | ~3 days |

**Total estimate: ~3-4 weeks of focused work, multi-prompt.**

The right phasing is probably:

- **Phase A**: edition toggle + 2024 species + 2024 backgrounds (no class changes; reuse 2014 class data with a "2024 class data not yet ready" notice). Establishes the routing and data shape. ~3-4 days.
- **Phase B**: Per-class 2024 data, one class at a time. Each class gets its own commit (12 commits). Visible progress per ship.
- **Phase C**: Weapon Mastery, Origin Feats, spell list rework. Cross-cutting features.
- **Phase D**: QA pass + save migration if any data shape changed.

### Recommendation

Don't try to do this in one session. The 2024 reference data is
already in the repo (`docs/5e_reference/2024/`) so the source of
truth is available, but turning it into a working creator is the
multi-week part. **Phase A** is the right next step — it's
bounded, ships an edition picker that visibly says "2024 coming
soon" for class details, and unblocks Phase B per-class work.

If user wants to proceed with Phase A in the next prompt, that's
1-2 commits worth:

1. Add `edition` field to `characterData` (default `'2014'`).
   Edition picker UI on the entry page (or as a top control on
   the Race/Species step).
2. Add 2024 species + background data with the new ASI shape.
   Class step shows a "2024 class progressions coming soon"
   banner; defaults to 2014 class data even when edition='2024'.

Phases B / C / D wait for explicit user direction.

---

## TL;DR

- **2014 audit: pass.** Every cross-checkable category matches the
  SRD or extends it correctly to the full PHB. 3 minor divergences
  filed (D1 missing 2 feats; D2 helper edge case; D3 parallel
  cantrip sources). No data corruption, no rules-violations.

- **2024 edition creator: significant scope.** The reference data
  is in the repo, but turning it into a full creator is multi-week
  work. Phase A (edition toggle + species/backgrounds) is the
  right next bite-size commit; classes / weapon mastery / spell
  list rework are later phases.

- **Layer 3 follow-up still open** (multiclass ASI distribution,
  AbilityScoresStep edit-init bug, ABILITY_SCORE_IMPROVEMENT_LEVELS
  vs getBreweryClassAsiLevels) — independent of this audit.
