# Warlock Implementation Audit — 2026-05-18

Audit of the Warlock class across both D&D 5e 2014 and 2024 character
creator paths in this repository. Compares each surface against the PHB
RAW. No code changes in this commit — defects are fixed in subsequent
commits referencing the IDs below.

## Summary

**13 defects** found, classified by impact on character creation:

- **2 critical** — block correct character creation (C-1, C-2).
- **6 major** — character can be saved but mechanics are wrong or
  whole sub-features are missing (M-1 through M-6).
- **5 minor** — cosmetic, data-coverage, or copy-only (N-1 through N-5).

The single root-cause cluster is that **Pact Boon choice is captured
but never propagated** — Chain, Tome, and Blade all stop at the
dropdown and never trigger their downstream pickers / equipment /
companion-list changes. Patron expanded spell lists are likewise
unused.

---

## 2014 Edition Findings

### Base class data — `src/components/dnd5e/dnd5eRules.js`

| Field | Source | Code value | RAW (PHB p.105–106) | Status |
|---|---|---|---|---|
| Hit Die | `CLASS_HIT_DICE` line 247 | d8 | d8 | ✓ |
| Primary Ability | `CLASS_PRIMARY_ABILITY` line 277 | Charisma (`cha`) | Charisma | ✓ |
| Saving Throws | `CLASS_SAVING_THROWS` line 308 | `['wis', 'cha']` | Wisdom + Charisma | ✓ |
| Armor Profs | `CLASS_ARMOR_PROFICIENCIES` line 322 | `['light']` | Light only | ✓ |
| Weapon Profs | `CLASS_WEAPON_PROFICIENCIES` line 337 | `['simple']` | Simple only | ✓ |
| Tool Profs | absent | none | none | ✓ |
| Skill list | `CLASS_SKILL_LIST` line 3466 | Arcana, Deception, History, Intimidation, Investigation, Nature, Religion (choose 2) | same | ✓ |
| ASI Levels | `ABILITY_SCORE_IMPROVEMENT_LEVELS` line 1388 | `[4, 8, 12, 16, 19]` | same | ✓ |
| Starting Equipment | not present | — | (a) light crossbow+20 bolts OR simple weapon; (a) component pouch OR arcane focus; (a) scholar's pack OR dungeoneer's pack; leather armor + simple weapon + 2 daggers | ✗ N-3 |

Base class data is correct in every mechanical field. Only the
starting-equipment "choice" packs are missing — equipment is handled
elsewhere as a generic step and never presents the Warlock-specific
A/B options.

### Spellcasting tables

| Surface | Code | RAW | Status |
|---|---|---|---|
| Cantrips known | `SPELLS_KNOWN_TABLE.Warlock.cantrips` line 3387 — `{1:2, 4:3, 10:4}` | 2/3/4 at 1/4/10 | ✓ |
| Spells known 1→20 | `SPELLS_KNOWN_TABLE.Warlock.spellsKnown` line 3388 — `{1:2, 2:3, ... 20:15}` | full PHB table | ✓ |
| Pact slots progression | `WARLOCK_PACT_SLOTS` lines 425–445 — 1→1×L1, 2→2×L1, 3→2×L2, … 17→4×L5 | full PHB table | ✓ |
| Mystic Arcanum spell levels | `SPELLS_KNOWN_TABLE.Warlock.mysticArcanum` line 3393 — `{11:1, 13:1, 15:1, 17:1}` for 6th/7th/8th/9th | 1 each at L11/13/15/17 | ⚠ M-3 |
| Spell list filter | `getAllAvailableSpells` `spellData.jsx:784` — pure class-membership filter | should also merge patron expansion at L1+ | ✗ M-1 |

The **data** for Mystic Arcanum exists, but no picker / UI consumes
`mysticArcanum` in the 2014 path — see M-3. The 2014 `ClassFeaturesStep`
does not surface a Mystic Arcanum chapter and the `CLASS_COMBAT_FEATURES`
strings at `dnd5eRules.js:554–558` (which name Mystic Arcanum at L11/13/15/17)
are exported but never imported anywhere in `src/components/` or
`src/pages/` — confirmed by grep.

### Class features per level — `src/game-packs/dnd5e/data/classFeatures.js:477–519`

The Warlock entry only contains feature blocks for levels **1, 2, and 3**.
Levels 4–20 are absent from the per-level feature data.

| Level | RAW (PHB p.106) | Code | Status |
|---|---|---|---|
| 1 | Otherworldly Patron + Pact Magic | Patron (choice w/ Fiend only) | ⚠ M-2, N-1 |
| 2 | Eldritch Invocations (2) | description text only — no picker | ⚠ M-4 |
| 3 | Pact Boon | choice w/ Chain/Blade/Tome | ⚠ C-1, M-5, M-6 |
| 4 | ASI | global ASI picker (works) | ✓ |
| 5/7/9/12/15/18 | additional invocations | not in data | ⚠ M-4 |
| 6/10/14 | Patron features | not in per-level data; only inlined in Fiend description | ⚠ M-2 |
| 8/12/16/19 | ASI | global ASI picker | ✓ |
| 11/13/15/17 | Mystic Arcanum | not in data; no picker | ⚠ M-3 |
| 20 | Eldritch Master | not in data | ⚠ N-4 |

### Patron picker — `src/components/characterCreator/ClassStep.jsx:218–222`

The class-tome's `subclasses` array lists **three** patrons: The Fiend,
The Archfey, The Great Old One. Player picks one → writes to
`characterData.subclass`.

But `classFeatures.js:484–487` only lists "The Fiend" as a Patron
choice. The `ClassFeaturesStep` re-renders the Patron choice as a
`SubclassPicker` reading `feature.choices` (Fiend only), then reads the
selected value back from `characterData.subclass` — so a player who
picked Archfey or Great Old One in ClassStep sees a panel whose only
option is "The Fiend" but is already pre-selected with Archfey/Great
Old One. Cosmetic confusion, not blocking (N-1).

The 2014 PHB has 3 patrons (Archfey, Fiend, Great Old One) — they are
in the picker. XGtE / TCoE patrons (Hexblade, Celestial, Undying,
Fathomless, Genie) are out of scope (supplementary, not SRD).

### Pact Boon — `src/game-packs/dnd5e/data/classFeatures.js:497–518`

Picker exists at L3, three boons present (Chain, Blade, Tome). Choice
saves to `featureChoices['Warlock-3-Pact Boon']`. **No downstream
integration**:

- **Pact of the Chain → familiar upgrade is keyed off the wrong field.**
  `companionCatalog.js:80` reads `(subclass || "").toLowerCase().includes("chain")`
  — but `subclass` is the **patron** name (Fiend/Archfey/Great Old One),
  not the Pact Boon. Result: a Pact-of-the-Chain warlock never gets the
  imp / pseudodragon / quasit / sprite list, regardless of selection.
  See M-5.
- **Pact of the Tome** should grant a 3-cantrip picker drawing from any
  class's cantrip list. No such picker exists; the player just sees the
  description. See M-6.
- **Pact of the Blade** should grant martial-weapon proficiency for the
  conjured pact weapon. No effect on weapon profs / equipment step.
  See N-5.

### Eldritch Invocations — `src/components/dnd5e/dnd5eRules.js:2105–2122`

Partial data: a `popular` object lists 7 invocations as examples
(`Agonizing Blast`, `Armor of Shadows`, `Devil's Sight`, `Eldritch
Sight`, `Mask of Many Faces`, `Repelling Blast`, `Thirsting Blade`).
PHB 2014 has ~30 invocations.

`known` table is correct: `{2:2, 5:3, 7:4, 9:5, 12:6, 15:7, 18:8}` at
line 2109.

**No picker exists anywhere.** Grep across `src/components/characterCreator/`
returns only display rows in `ClassFeaturesStep2024.jsx:128–129`
(counter, not a chooser). The 2014 `ClassFeaturesStep` does not surface
invocations at all. See M-4.

### Companion picker — `src/components/characterCreator/CompanionPicker.jsx`
+ `src/config/companionCatalog.js:71–89`

Catalog **does** contain the four Chain familiars (imp, pseudodragon,
quasit, sprite) at `companionCatalog.js:51–54`. The combine logic
exists. The wiring is just wrong — see M-5 above.

---

## 2024 Edition Findings

### Base class data — `src/data/games/dnd5e_2024/rules.js`

| Field | Code | RAW (PHB 2024 p.150) | Status |
|---|---|---|---|
| Hit Die | `CLASS_HIT_DICE.Warlock` line 106 — 8 | d8 | ✓ |
| Primary Ability | `CLASS_PRIMARY_ABILITY.Warlock` line 139 — `cha` | Charisma | ✓ |
| Saving Throws | `CLASS_SAVING_THROWS.Warlock` line 121 — `['wis','cha']` | Wisdom + Charisma | ✓ |
| Armor / Weapon profs | derived from SRD JSON adapter (`classes.js`) | Light / Simple | ✓ |
| ASI Levels | `ABILITY_SCORE_IMPROVEMENT_LEVELS_MAP.Warlock` line 173 — `[4,8,12,16,19]` | same | ✓ |
| Starting Equipment | not surfaced as Warlock-specific package | light crossbow + 20 bolts + 2 daggers + arcane focus (orb) + leather armor + scholar's pack + 15 GP | ✗ N-3 |

### Spellcasting

| Surface | Code | RAW | Status |
|---|---|---|---|
| Pact slots | `WARLOCK_PACT_SLOTS` lines 299–320 — same table as 2014 | unchanged in 2024 | ✓ |
| Prepared table (2024 model) | `PACT_CASTER_PREPARED_WARLOCK` lines 459–464 — `{1:2, 2:3, ... 20:15}` | matches PHB 2024 fixed-prep table | ✓ |
| Cantrips | `CANTRIPS_KNOWN_MAP.Warlock` line 688 — `{1:2, 4:3, 10:4}` | same | ✓ |
| Mystic Arcanum levels | `mysticArcanumLevels()` lines 334–341 — returns `[6,7,8,9]` at 11/13/15/17 | same | ✓ |
| Invocations known | `eldritchInvocationsKnown()` lines 348–352 — starts at L1 = 1, scales to 10 at L18 | 2024 starts at L1 with 1 (vs 2014 L2 with 2) | ⚠ M-4 |
| Spell list filter | `getSpellsForClass` `dnd5e_2024/spells.js:146` — class-membership only | should merge patron expanded prep list | ✗ M-1 |

`eldritchInvocationsKnown(1) === 1`, not 2. PHB 2024 grants **two** at
L1 (the famous L1-invocations change). Off-by-one in the table — see
M-4 details.

### Class features — `src/data/games/dnd5e_2024/classFeatures.js:1–22`

Per-level feature progression is **intentionally absent** from this
adapter. The 2024 SRD JSON `class_levels` is a URL reference, not an
inline array — per the file header it cannot be hand-authored without
OGL exposure, so per-level features ship as URL stubs.

Surfaces consumed at this level:

- `ClassFeaturesStep2024.jsx:125–132` adds three info rows for Warlock:
  Pact Magic slot count, Eldritch Invocations known, Mystic Arcanum
  slots. These display correctly but **no picker** for either
  Invocations or Arcanum spells.
- Magical Cunning (L2 PHB-2024 feature) mechanic encoded as data
  field `level2RecoverPactSlots` at `rules.js:598–602`. Name is
  intentionally not shipped (OGL). No UI surfaces the mechanic.

### Patron — 2024

Subclass picker fires at L3 (correct for 2024, per PHB-2024 unified
L3 subclass rule).
`getSubclassesForClass("warlock")` in `dnd5e_2024/subclassFeatures.js`
reads from `5e-SRD-Subclasses.json`. Only **one** warlock subclass
present in that file (Fiend) — the other 2024 PHB patrons (Archfey,
Celestial, Great Old One) are not in the SRD JSON. See N-2.

### Pact Boon — 2024

In 2024 the Pact Boons are folded into the Eldritch Invocations list
(Pact of the Blade, Chain, Tome each became invocations). Since no
invocations system exists in the codebase (see M-4), there is no Pact
Boon surface in the 2024 path either. The Chain familiar upgrade in
`companionCatalog.js:80` has the same wrong-field bug here too — would
fail silently since `subclass` is now the Patron, never the Pact Boon.

---

## Critical Defects (block correct creation)

### C-1 · 2024 Eldritch Invocations count at L1 is wrong
`dnd5eRules.js` 2014 / `dnd5e_2024/rules.js` 2024 — `ELDRITCH_INVOCATIONS_BY_LEVEL`
at 2024/`rules.js:344` reads `{1:1, 2:3, 5:5, 7:6, 9:7, 12:8, 15:9, 18:10}`.
PHB 2024 grants **2** invocations at L1 (and 2024 keeps gaining: 3 at
L2, etc.). The L1 value should be **2**, not 1. Players using the
displayed "Eldritch Invocations known" count get a number off by one
from RAW.

Per PHB 2024 Warlock Features table: L1 = 2 Invocations, L2 = 3, L5 = 5,
L7 = 6, L9 = 7, L12 = 8, L15 = 9, L18 = 10. The code's `{1:1, 2:3, …}`
suggests an intentional reading where L1 grants the first invocation
and L2 brings the second — but the displayed total at L1 should be 2,
not 1. Either the L1 entry should be 2 (and L2 stays 3), or the
function should report cumulative.

(Classified critical because the displayed count drives any future
picker's cap, and right now if/when a picker is built it would short
the player one invocation at L1.)

### C-2 · 2014 Continue may block at L11+ Warlock
`ClassFeaturesStep.jsx` renders per-level features from
`classFeatures.js` Warlock entries (only L1/2/3 exist). For L11+
warlocks, the page shows the base sections fine, but `validateStep`
in `CharacterCreator.jsx` may keep the user stuck if any required
`feature.choiceRequired` lookup misfires — needs runtime confirmation.
Listed critical pending validation; if benign, demote to major.

---

## Major Defects (mechanically wrong, creation still possible)

### M-1 · Patron expanded spell lists not merged into the spell picker
PHB 2014 Fiend warlock at L1 must be able to prepare/know `burning hands`,
`command`, etc. — spells not on the base warlock list. The code's
`getAllAvailableSpells` (`spellData.jsx:784`) only filters by class
membership, never reads the patron's expanded list. Same gap in the
2024 path (`dnd5e_2024/spells.js:146`'s `getSpellsForClass`).

Effect: A Fiend Warlock at L1 cannot select `burning hands` in the
picker — but per RAW it's always available to them.

The expanded list is documented in the Fiend description text in
`classFeatures.js:486` but never parsed into the spell pool.

### M-2 · 2014 Patron `feature.choices` lists only "The Fiend"
`classFeatures.js:484–487` — Archfey and Great Old One are absent from
the L1 Otherworldly Patron `choices`. The `ClassStep` tome offers all
three (✓), but the `ClassFeaturesStep` re-renders the picker reading
`feature.choices` (Fiend only) — and any 2014 feature that depends on
patron name (e.g. patron features at L6/10/14) cannot exist in data
for Archfey or Great Old One. So an Archfey warlock at L6 has no
Misty Escape feature surface, no Archfey expanded spell list, etc.

### M-3 · Mystic Arcanum has no picker in either edition
Data exists (`SPELLS_KNOWN_TABLE.Warlock.mysticArcanum` 2014;
`mysticArcanumLevels()` 2024). 2024 `ClassFeaturesStep2024.jsx:130–131`
shows an INFO row ("Mystic Arcanum slots: level-6, level-7"). 2014
surfaces nothing. A L11+ warlock saves their character with no
recorded Arcanum spell choices, then arrives at the sheet missing
their L11 6th-level spell pick.

### M-4 · Eldritch Invocations: no data list, no picker, no prereq enforcement (2014 & 2024)
PHB 2014 has ~30 invocations. The codebase has 7 in a "popular" object
used for description only (`dnd5eRules.js:2110–2118`). No picker,
no prerequisite checks (min level, pact boon, patron, other
invocations), no per-level count enforcement. A L2+ warlock saves
with zero invocation choices recorded.

### M-5 · Pact of the Chain doesn't actually upgrade the familiar list
`companionCatalog.js:80` reads `(subclass || "").toLowerCase().includes("chain")`.
But `subclass` is the patron name (Fiend / Archfey / Great Old One),
**never** the Pact Boon — that lives in
`featureChoices['Warlock-3-Pact Boon']`. So the imp / pseudodragon /
quasit / sprite list is never actually appended. (The catalog data is
correct; just the trigger is keyed off the wrong field.)

### M-6 · Pact of the Tome doesn't open a cantrip picker
PHB 2014: "choose three cantrips from any class's spell list". Selecting
Pact of the Tome captures the boon name but never opens a picker, never
adds those cantrips to `characterData.spells.cantrips`, and never
flags them as not-counting-against-the-cap. The character sheet ends
up with 2 cantrips instead of 5 at L3.

---

## Minor Defects (cosmetic / data coverage)

### N-1 · 2014 Patron-picker UI duplication
`ClassFeaturesStep` re-renders the Patron picker with `choices=[Fiend]`
when the actual chosen value (read back from `characterData.subclass`)
is Archfey or Great Old One. Visually confusing but doesn't break
anything because the picker reads `currentChoice` from `subclass`.

### N-2 · 2024 patron list — only Fiend in SRD JSON
Only "The Fiend" comes from the 2024 SRD `5e-SRD-Subclasses.json`.
The 2024 PHB has 4 patrons (Archfey, Celestial, Fiend, Great Old One).
The others can't be hand-authored without OGL exposure per the
adapter header in `dnd5e_2024/classes.js:1–35`. This is a deliberate
SRD constraint, not a code defect — flag as out-of-scope.

### N-3 · Warlock-specific starting equipment options not surfaced
Both editions. PHB 2014 has the A/B equipment branch; PHB 2024 has a
fixed Warlock starting package. The `EquipmentStep` is generic and
doesn't present either. Equipment is functional (player can pick
items) but Warlock players never see the RAW starter package.

### N-4 · 2014 Eldritch Master (L20) feature not in per-level data
`classFeatures.js` Warlock entry has no L20 block. The string exists
in `CLASS_COMBAT_FEATURES.Warlock.20` at `dnd5eRules.js:560` but that
constant is unused.

### N-5 · Pact of the Blade doesn't alter weapon proficiencies
RAW: pact weapon makes the warlock proficient with whatever form they
choose (effectively all weapons via summoning). The picker captures
the boon but never adds martial weapon proficiency or equipment
implication.

---

## Recommended fix order

1. **C-1** — Eldritch Invocations count off-by-one at L1 in 2024.
   One-line table fix in `dnd5e_2024/rules.js:344`. Add regression
   assertion.
2. **C-2** — Confirm or refute the 2014 L11+ Continue blocker; if real,
   add safe fallback in `validateStep`.
3. **M-5** — Pact of the Chain trigger reads wrong field
   (`companionCatalog.js:71–89`). Route the trigger through `featureChoices`
   for the Pact Boon name. Self-contained fix.
4. **M-1** — Merge patron expanded spell lists into the picker. Needs a
   `PATRON_EXPANDED_SPELLS` data table + integration into
   `getAllAvailableSpells` and `getSpellsForClass`. Largest single fix.
5. **M-2** — Add Archfey + Great Old One to the 2014 Patron
   `feature.choices` (and patron features at L6/10/14 for each).
6. **M-3** — Build a Mystic Arcanum picker chapter that fires at
   L11/13/15/17 with `spell.level` filtered to 6/7/8/9 from the
   warlock list. Both editions.
7. **M-4** — Build the Eldritch Invocations data set + picker with
   prerequisite enforcement and per-level count cap. Largest in
   scope; could be done in stages (data first, picker second).
8. **M-6** — Pact of the Tome cantrip picker (3 cantrips from any
   class list, stored separately so they don't count against the
   cantrip cap).
9. **N-1 through N-5** — Batch in a "warlock cosmetic + data
   coverage" commit. N-2 → flag-only (out of scope, document the
   SRD constraint).

The single highest-leverage fix is **M-1** (patron expanded spells) +
**M-5** (Chain familiar trigger) — together they make the L1 / L3
Warlock experience match RAW for the three patron paths the data
already supports.
