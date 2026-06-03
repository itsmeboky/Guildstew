# D&D 5e (2014) Character Creator — Level Progression & Feature-Gating Audit (1–20)

**Mode:** Read-only reconnaissance. No source files were modified. This report is the only artifact.
**Date:** 2026-06-03
**Ruleset:** D&D 5e 2014 / SRD 5.1. Per-level progression cross-referenced against the SRD class tables (dnd5eapi.co content boundary).
**Scope:** the **2014** creator only. The `2024` pack and all other packs were left untouched.

---

## 1. Recon Map + Structural Answer (Phase 0)

### 1.1 Structural answer — where leveling lives (read this first)

**The creator is a *fully-leveled builder* in intent, but a *level-1-to-3 builder* in practice. There is no separate level-up flow — the creator is the only place leveling happens.**

- The level is chosen in **one place**: a 1–20 `LevelPicker` `<select>` on the **Features** step (`ClassFeaturesStep.jsx:413-460`, rendered at `:226-232`; `handleLevelChange` clamps 1–20 at `:104-115`). The Identity step also has a level field (`IdentityStep.jsx:1104`), and both write `characterData.level`.
- The Features step *intends* to accumulate every feature for levels ≤ target: `getClassFeaturesForLevel(class, level)` concatenates each level's entries from 1 to `level` (`classFeatures.js:551-563`), and ASIs are generated for every reached ASI level (`reachedAsiLevels`, `asiSelections.js:57-60`).
- **But the underlying data table only contains entries for levels 1–3** (and *less* for several classes — see 1.4). There are **no feature entries for levels 4–20**. So `getClassFeaturesForLevel('Fighter', 5)` returns the *same* features as level 3 — Extra Attack (L5) and everything above L3 simply do not exist in the data.
- **No level-up flow exists anywhere.** Grepping `level.up|levelUp|gainLevel|onLevelUp` finds no character-progression flow (only unrelated hits). The only consumers of `getClassFeaturesForLevel` are `ClassFeaturesStep.jsx`, `ReviewStep.jsx`, and the `dnd5e_2014/index.js:144` re-export. The Combat Engine v2 pack (`src/game-packs/dnd5e/`) is not wired into production (its own `index.js` header says so). **The real gating logic does not live elsewhere — it lives here, and the data behind it stops at level 3.**

Consequence: ASIs, subclass *selection*, Metamagic count, spell slots/known/prepared, HP, and proficiency bonus all scale to the target level correctly — but **base class features above level 3, all subclass features above the selection level (as discrete gated entries), Eldritch Invocations, Mystic Arcanum, and all level-6+ class capstones are never delivered.**

### 1.2 The data + gating layer
- **Data:** `src/game-packs/dnd5e/data/classFeatures.js` (562 lines), surfaced via the shim `src/components/dnd5e/classFeatures.jsx`. Keyed `classFeaturesData[ClassName][level] = [ {name, level, description, uses?, choiceRequired?, choices?} ]`.
- **Gating UI:** `ClassFeaturesStep.jsx` renders all features for the level (`FeatureScroll`), generates ASI cards (`AsiCard`), and renders a `RequiredChoice` picker for each feature with `choiceRequired: true` (`:283-322`). A feature surfaces a picker **only** if `choiceRequired` is set.
- **Completion/validation:** the Features step's orchestrator gate is `case 'features': return true` (`CharacterCreator.jsx:571`) — i.e., **not enforced at all**; `allChoicesMade` (`ClassFeaturesStep.jsx:171-175`) only drives an advisory banner.
- **ASI levels:** `ABILITY_SCORE_IMPROVEMENT_LEVELS` (`dnd5eRules.js:1377-1390`) — correct, incl. Fighter 6/14 and Rogue 10.
- **Multi-pick scaling:** `multiPickCount` → `SCALING_FEATURE_PICKS` (`dnd5eRules.js:1191-1215`) defines scalers for **Metamagic** (2/3/4 at 3/10/17) and **Eldritch Invocations** (2…8).

### 1.3 Inventory of prompt-able choices in the creator
| Choice | Where it triggers | Gated by level? |
|---|---|---|
| Subclass | `ClassStep` SubclassChapter **and** `ClassFeaturesStep` RequiredChoice (subclass features at their selection level) | Selection level correct in data; ClassStep lets you pick early as "planning" |
| ASI / feat | `AsiCard` per `reachedAsiLevels` | ✅ correct |
| Fighting Style | `choiceRequired` feature (Fighter L1, Paladin/Ranger L2) | ✅ at base level; ❌ Champion's 2nd at L10 missing |
| Metamagic | `choiceRequired` feature (Sorcerer L3) | ✅ scales 2/3/4 |
| Expertise | **Not** in Features step — handled in `SkillsStep` | ❌ no level scaling (see M6) |
| Eldritch Invocations | feature entry exists (L2) but **no `choices`, not `choiceRequired`** | ❌ never pickable (C3) |
| Mystic Arcanum | **absent from data** | ❌ missing (C4) |
| Pact Boon | `choiceRequired` feature (Warlock L3) ✅ | ✅ |
| Familiar / companion / steed | `CompanionPicker` in `ClassStep` | ❌ **level-agnostic** (M1/M2) |
| Spells / cantrips | `SpellsStep` (scales to level via `SPELLS_KNOWN_TABLE`) | ✅ (verified prior audit) |

### 1.4 Per-class data coverage (which levels even exist in `classFeatures.js`)
Barbarian 1-2-3 · Bard 1-2-3 · **Cleric 1 only** · **Druid 1-2** · Fighter 1-2-3 · Monk 1-2-3 · Paladin 1-2-3 · Ranger 1-2-3 · Rogue 1-2-3 · Sorcerer 1-2-3 · Warlock 1-2-3 · **Wizard 1-2**. Nothing above level 3 for any class.

---

## 2. Per-Class Progression Matrix (levels 1–20)

Legend: **Missing** = feature/choice never delivered; **Premature** = surfaced before unlock; **Mislevel** = wrong unlock level in code; **Dup/Bogus** = duplicated or non-SRD entry. Subclass = the one SRD subclass. ASIs are correct for every class and omitted from the "defect" lists.

- **Barbarian** *(Berserker)* — L1 ✅ (Rage, Unarmored Defense). L2 ✅. L3 subclass ✅ (but Berserker's Mindless Rage/Intimidating Presence/Retaliation are prose at L3, **not gated at 6/10/14**). **Missing:** Extra Attack + Fast Movement (5), Brutal Critical (9/13/17), Relentless Rage (11), Persistent Rage (15), Indomitable Might/Primal Champion (20). Defective levels: **5, 6, 9, 10, 11, 13, 14, 15, 17, 20**.
- **Bard** *(College of Lore)* — L1 ✅ (Spellcasting *prose says 4 cantrips — wrong, see m1*, Bardic Inspiration). L2 ✅. L3 subclass ✅; Bard Expertise at 3 present as prose, **not delivered as a pick here** (SkillsStep handles it, see M6). **Missing:** Font of Inspiration (5), Bardic Inspiration die scaling (5/10/15) as features, Countercharm (6), College features at 6/14, Expertise 2nd grant (10), Magical Secrets (10/14/18), Superior Inspiration (20). Defective: **5, 6, 10, 14, 15, 18, 20**.
- **Cleric** *(Life Domain)* — L1 ✅ (Spellcasting, Divine Domain) **but carries a bogus Expertise entry (M3)**. **Missing everything else:** Channel Divinity/Turn Undead (2), Destroy Undead (5/8/11/14/17), Channel Divinity 2nd–3rd use (6/18), Divine Intervention (10/20); Life Domain's Preserve Life (2)/Blessed Healer (6)/Divine Strike (8)/Supreme Healing (17). Defective: **2, 3(bogus), 5, 6, 8, 10, 11, 14, 17, 18, 20**.
- **Druid** *(Circle of the Land)* — L1 ✅, L2 ✅ (Wild Shape, Circle). Land features at 6/10/14 are prose at L2, **not gated**. **Missing:** Wild Shape improvements (4, 8), Timeless Body + Beast Spells (18), Archdruid (20). Defective: **4, 6, 8, 10, 14, 18, 20**.
- **Fighter** *(Champion)* — L1 ✅, L2 ✅ (Action Surge), L3 subclass ✅. **Missing:** **Extra Attack (5/11/20)**, Indomitable (9/13/17), Action Surge 2nd use (17); Champion's Remarkable Athlete (7), **Additional Fighting Style (10)**, Superior Critical (15), Survivor (18). Defective: **5, 7, 9, 10, 11, 13, 15, 17, 18, 20**. (ASIs at 4/6/8/12/14/16/19 ✅.)
- **Monk** *(Open Hand)* — L1 ✅, L2 ✅ (Ki, Unarmored Movement), L3 subclass + Deflect Missiles ✅. **Missing:** Extra Attack + Stunning Strike (5), Ki-Empowered Strikes (6), Evasion/Stillness of Mind (7), Slow Fall (4), Purity of Body (10), Diamond Soul (14), Timeless Body (15), Empty Body (18), Perfect Self (20); Open Hand's Wholeness of Body (6, *and prose typo "Wholesness"*), Tranquility (11), Quivering Palm (17). Defective: **4, 5, 6, 7, 10, 11, 13, 14, 15, 18, 20**.
- **Paladin** *(Oath of Devotion)* — L1 ✅, L2 ✅ (Fighting Style, Spellcasting, Divine Smite), L3 ✅ (Divine Health **duplicated, M4**; Sacred Oath). **Missing:** Extra Attack (5), Aura of Protection (6), Aura of Courage (10), Improved Divine Smite (11), Cleansing Touch (14), aura range 30ft (18); Devotion's Aura of Devotion (7), Purity of Spirit (15), Holy Nimbus (20). **Steed picker behavior:** see M2. Defective: **3(dup), 5, 6, 7, 10, 11, 14, 15, 18, 20**.
- **Ranger** *(Hunter)* — L1 ✅, L2 ✅ (Fighting Style, Spellcasting), L3 subclass + Primeval Awareness ✅. **Missing:** Extra Attack (5), Land's Stride (8), Hide in Plain Sight (10), Vanish (14), Feral Senses (18), Foe Slayer (20); Hunter features at 7/11/15; additional Favored Enemy/Terrain (6/10/14). **Companion picker is level-agnostic — M1/M2.** Defective: **5, 6, 7, 8, 10, 11, 14, 15, 18, 20**.
- **Rogue** *(Thief)* — L1 ✅ (Expertise, Sneak Attack, Thieves' Cant), L2 ✅ (Cunning Action), L3 subclass ✅. **Missing:** **2nd Expertise (6, see M6)**, Sneak Attack scaling as features (3d6+), Uncanny Dodge (5), Evasion (7), Reliable Talent (11), Blindsense (14), Slippery Mind (15), Elusive (18), Stroke of Luck (20); Thief's Supreme Sneak (9)/Use Magic Device (13)/Thief's Reflexes (17). Defective: **5, 6, 7, 9, 11, 13, 14, 15, 17, 18, 20**. (Extra ASI at 10 ✅.)
- **Sorcerer** *(Draconic Bloodline)* — L1 ✅, L2 ✅ (Font of Magic), L3 ✅ (**Metamagic — scales 2/3/4 correctly via multiPickCount**). Draconic features at 6/14/18 are prose at L1, **not gated**. **Missing:** Sorcery Point scaling, Sorcerous Restoration (20). Defective: **6, 14, 17(Metamagic +1 works), 18, 20** (least-affected of the martial/divine set; Metamagic is the one scaling choice that works).
- **Warlock** *(The Fiend)* — L1 ✅ Otherworldly Patron, **but Pact Magic feature is MISSING at L1 (C2)**. L2 has Eldritch Invocations text **but it's never selectable (C3)**. L3 ✅ Pact Boon. **Missing:** Mystic Arcanum 6th/7th/8th/9th at 11/13/15/17 (C4), Eldritch Master (20); Fiend's Dark One's Own Luck (6)/Fiendish Resilience (10)/Hurl Through Hell (14) are prose at L1, not gated. **Familiar picker is premature + level-agnostic — M1.** Defective: **1(Pact Magic), 2(invocations), 6, 10, 11, 13, 14, 15, 17, 20**.
- **Wizard** *(School of Evocation)* — L1 ✅ (Spellcasting, Arcane Recovery), L2 ✅ (Arcane Tradition). Evocation features at 6/10/14 are prose at L2, not gated. **Missing:** Spell Mastery (18), Signature Spells (20). **Least affected** — Wizard's L3–17 are mostly ASIs (correct) + spell scaling (correct); only the capstones and subclass-level features are absent. Defective: **6, 10, 14, 18, 20**.

**No class is fully correct across 1–20.** Wizard and Sorcerer are the least affected (their non-ASI level-up gains are largely spell scaling, which works); the eight martial/divine classes lose major combat features (Extra Attack, Channel Divinity, Indomitable, etc.).

---

## 3. Findings by severity

### 🔴 Critical

**C1 — No class feature above level 3 is ever delivered (data table stops at L3).**
`classFeatures.js:17-549` defines entries only for levels 1–3 (Cleric L1 only; Druid/Wizard 1–2). `getClassFeaturesForLevel` (`:551-563`) therefore returns the level-3 feature set for *every* level 3–20. **Extra Attack (level 5)** is missing for Barbarian, Fighter, Monk, Paladin, and Ranger; **Cleric Channel Divinity / Turn Undead (level 2)** is missing entirely; all capstones (level 20) are missing; Indomitable, Brutal Critical, Reliable Talent, Wild Shape scaling, etc. are all absent. *Correct:* each class gains discrete features at the SRD-specified levels. *Trigger:* any character built at level ≥ 4 (Extra Attack at ≥ 5; Cleric at ≥ 2). This is the master defect behind nearly every matrix entry above.

**C2 — Warlock is missing Pact Magic at level 1.**
`classFeatures.js:478-489` (Warlock L1) lists only Otherworldly Patron. *Correct:* Warlock L1 = Otherworldly Patron **+ Pact Magic** (1 pact slot, 2 cantrips, 2 spells known). *Trigger:* every Warlock. (The spell counts themselves are correct in `SPELLS_KNOWN_TABLE`/`WARLOCK_PACT_SLOTS`; the *feature* entry is absent. Carried over from the prior audit's M1.)

**C3 — Warlock Eldritch Invocations are never selectable at any level.**
The "Eldritch Invocations" entry (`classFeatures.js:491-495`) has **no `choices` array and no `choiceRequired` flag**, so `ClassFeaturesStep` (which only renders pickers for `choiceRequired` features, `:283`) never surfaces an invocation picker — even though a correct scaler exists (`SCALING_FEATURE_PICKS["Eldritch Invocations"]`, `dnd5eRules.js:1199-1210`, dead code here). *Correct:* a Warlock chooses 2 invocations at L2, scaling to 8 by L18, with the list of SRD invocations. *Trigger:* every Warlock level ≥ 2.

**C4 — Warlock Mystic Arcanum is absent from the data.**
No entry for levels 11/13/15/17 exists (`classFeatures.js` Warlock has only keys 1–3); `SPELLS_KNOWN_TABLE.Warlock.mysticArcanum` exists (`dnd5eRules.js:3393`) but nothing in the creator reads it for a picker. *Correct:* one 6th/7th/8th/9th-level spell at 11/13/15/17. *Trigger:* Warlock level ≥ 11.

### 🟠 Major

**M1 — Warlock familiar prompt is level-agnostic and premature (the motivating bug, confirmed).**
The CompanionPicker is rendered for any Warlock whenever `hasPatron` is true (`ClassStep.jsx:385`; Warlock `hasPatron: true` at `:216`), and `resolveCompanionContext` (`companionCatalog.js`) **takes no level parameter** — it returns a familiar picker for every Warlock regardless of level or Pact Boon. A **level-1 Warlock is shown "Familiar — Pick a familiar"** and can select one that persists to `characterData.companions[0]` (saved via `characterMapping.jsx:169`). *Correct:* a Warlock gets a familiar **only** via Pact of the Chain (Pact Boon, level 3) — never at level 1, and never at all without Chain. *Trigger:* every Warlock; egregious at levels 1–2.

**M2 — Same level-agnostic companion bug for Ranger; latent for Wizard/Paladin/Druid.**
Ranger (`hasCompanion: true`, `ClassStep.jsx:163`) shows an animal-companion picker at **all** levels, including 1–2. *Correct:* a beast companion comes only from Beast Master (level 3); a base Ranger gets no companion. The picker even offers a non-RAW "flavor pet" to non-Beast-Master rangers (`companionCatalog.js` Ranger branch). `resolveCompanionContext` also supports Wizard/Paladin/Druid companions, but those classes lack the `hasCompanion`/`hasPatron` flag so the picker never renders for them (dead catalog branches — note, not an active bug). *Trigger:* Ranger levels 1–2 (premature), and any non-Beast-Master Ranger (extra/non-RAW).

**M3 — Cleric carries a bogus Expertise feature.**
`classFeatures.js:122-126` — an "Expertise" feature sits inside the Cleric **level-1** array with `level: 3`. Clerics never get Expertise. Because it's in the `1` bucket, it renders for a **level-1 Cleric** (with a level-3 emblem). *Correct:* remove entirely. *Trigger:* every Cleric.

**M4 — Paladin Divine Health is duplicated.**
`classFeatures.js:315-318` and `:331-334` both define Divine Health at level 3; it renders twice on a level-3+ Paladin. *Correct:* one level-3 feature. *Trigger:* Paladin level ≥ 3.

**M5 — Champion Fighter's second Fighting Style (level 10) is not delivered.**
"Additional Fighting Style (10th)" appears only as prose inside the Champion subclass description (`classFeatures.js:222`); there is no second `choiceRequired` Fighting Style entry at level 10. *Correct:* a level-10 Champion picks a second Fighting Style. *Trigger:* Champion Fighter level ≥ 10.

**M6 — Expertise does not scale with level (Rogue 2nd at 6, Bard 2nd at 10); Bard forced at level 1.**
Expertise is handled in `SkillsStep` with a hardcoded count of 2 and no level gate (carried from the prior audit's M6: `SkillsStep.jsx:38`, `skillsCompletion.js:26`). A level-6 Rogue does not get the **second** Expertise pair; a level-10 Bard does not get its second; and a **level-1 Bard is wrongly forced** to pick Expertise (Bard Expertise unlocks at level 3). *Trigger:* Rogue ≥ 6, Bard ≥ 3 / Bard = 1.

**M7 — Subclass features above the selection level are prose-only, not gated per-level.**
Every subclass's later features are bundled into one description string at the selection level (e.g., Berserker's "Mindless Rage (6th) / Intimidating Presence (10th) / Retaliation (14th)" at `classFeatures.js:53`; Quivering Palm (17th) at `:263`). They appear **all at once** when the subclass is chosen and are never surfaced as discrete, correctly-leveled features. *Correct:* each subclass feature delivered at its own level. *Trigger:* any character whose level ≥ subclass selection level (the features display regardless of whether the character has actually reached them).

**M8 — Features step has no enforced completion gate.**
`CharacterCreator.jsx:571` (`case 'features': return true`) lets a player advance with an unchosen subclass, Fighting Style, or Metamagic; the "resolve orange choices" banner (`ClassFeaturesStep.jsx:858`) is advisory only. *Trigger:* any build with an unresolved required choice (e.g., a level-1 Cleric who skips Divine Domain). Carried from prior audit's M2.

### 🟡 Minor

**m1 — Bard Spellcasting prose overstates cantrips.** `classFeatures.js:64` says "You know 4 cantrips and 4 1st-level spells at 1st level." Bard knows **2** cantrips at level 1 (the 4 spells is correct). *Correct:* 2 cantrips. (Sorcerer "4 cantrips/2 spells" and Wizard "3 cantrips/6 spells" prose are correct.)

**m2 — Subclass is selectable before its unlock level in ClassStep.** The SubclassChapter lets you pick a subclass at any level with a "plan ahead" framing (prior audit). Informational, but a level-1 Fighter can stamp a Champion subclass that unlocks at 3.

**m3 — Prose typo.** "Wholesness of Body" (Monk Open Hand, `classFeatures.js:263`).

**m4 — "Coming up" panel is effectively empty above level 3.** `UpcomingFeatures` (`ClassFeaturesStep.jsx:609-624`) reads the same level-capped data, so for any character at level ≥ 3 it shows no upcoming milestones (there are none keyed > 3). Low-impact UX.

### ⚪ Notes / Unverifiable

- **ASI gating is correct.** `reachedAsiLevels` accumulates every earned ASI; a level-8 Fighter correctly gets ASI cards at 4, 6, **and** 8 (`ABILITY_SCORE_IMPROVEMENT_LEVELS` + `asiSelections.js:57-60`). Fighter 6/14 and Rogue 10 honored.
- **Metamagic scaling works** (2/3/4 at 3/10/17) and persists to `feature_choices`. It is the one multi-pick level-scaled choice the creator delivers correctly.
- **Subclass *selection* levels are all correct in `classFeatures.js`:** Cleric/Sorcerer/Warlock L1, Druid/Wizard L2, the other seven L3. Druid is correctly at 2 (not lumped with the L3 group).
- **Spell scaling** (slots / cantrips known / spells known / prepared) scales to the target level via `SPELLS_KNOWN_TABLE` and was verified correct in the prior audit; not re-verified here.
- **HP and proficiency bonus** scale correctly at every level (`calculateMaxHP`, `proficiencyBonus`). Accumulated-state mismatches (Phase 3) are entirely in **features/choices**, not in HP/PB/slots.
- **Phase 3 spot-builds:** Fighter 5 → **missing Extra Attack**, ASI@4 ✅, PB +3 ✅. Wizard 8 → School@2 ✅, ASIs@4&8 ✅, slots/cantrips/prepared ✅ (least affected). Warlock 11 → Pact Boon@3 ✅ but **Pact Magic feature missing, invocations never pickable, Mystic Arcanum missing**. Rogue 10 → Expertise@1 ✅ but **2nd Expertise@6 missing**, ASI@10 ✅. Any level 20 → **no capstone**, PB +6 ✅.
- **Cross-link to prior audit M3:** `asiSelections`/`baseAttributes` are dropped from the save payload (`characterMapping.jsx`), so even the ASI choices that *are* collected here are **phantom on reload** for the editor — a level-gated choice that's prompted and persisted to the row, but not rehydrated into the editor state.
- **DB-backed content unverifiable statically:** the `dnd5e_2014/index.js` adapter and any DB spell rows were not executed; this audit reflects the static `classFeatures.js` data.

---

## 4. Recommended fix order (sequencing only — no code)

1. **C1 — rebuild `classFeatures.js` with full 1–20 progression.** The file's own header already prescribes this: make it a thin adapter over `docs/5e_reference/2014/5e-SRD-Levels.json` + `5e-SRD-Features.json` (the dnd5e_2024 adapter pattern). This single change resolves the bulk of the matrix (Extra Attack, Channel Divinity, capstones, and per-level subclass features → fixes M7 too). Highest impact.
2. **C2 — add the Warlock Pact Magic L1 feature entry** (small, can ride with #1).
3. **C3 + C4 — make Eldritch Invocations a `choiceRequired` scaling pick (the scaler already exists) and add Mystic Arcanum entries at 11/13/15/17.**
4. **M1 + M2 — give `resolveCompanionContext` (and the `ClassStep` gate) a level parameter**, so the familiar/steed/beast picker only appears at/after the granting level (Warlock Chain → 3; Ranger Beast Master → 3) and never for classes/levels that don't grant it.
5. **M3 + M4 — delete the bogus Cleric Expertise entry and the duplicate Paladin Divine Health.**
6. **M5 + M6 — deliver Champion's 2nd Fighting Style at 10, and level-scale Expertise** (Rogue 1/6, Bard 3/10; stop forcing Bard expertise at level 1).
7. **M8 — enforce the Features-step completion gate** (require resolved subclass/Fighting Style/Metamagic before Continue).
8. **Minors (m1–m4)** — fix Bard cantrip prose, the typo, the early-subclass framing, and the empty "Coming up" panel last.

---

## 5. Severity summary (counts)

| Tier | Count |
|------|-------|
| 🔴 Critical | 4 |
| 🟠 Major | 8 |
| 🟡 Minor | 4 |
| ⚪ Notes / unverifiable | (8 notes) |
