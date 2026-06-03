# D&D 5e (2014) Character Creator — Accuracy & Integrity Audit

**Mode:** Read-only reconnaissance. No source files were modified. This report is the only artifact.
**Date:** 2026-06-03
**SRD source of truth:** SRD 5.1 (CC BY 4.0), cross-referenced against the dnd5eapi.co content boundary.
**Scope:** the **2014** creator only. The `2024` (`*2024.jsx`) and PF2e/VTM packs were not audited and were left untouched.

---

## 1. Recon Map (Phase 0)

### 1.1 Orchestrator & step flow
- **Entry / orchestrator:** `src/pages/CharacterCreator.jsx` (1086 lines). Holds all wizard state, validation gates, the save mutation, and per-pack step dispatch.
- **Step order (2014)** — `STEPS` array, `CharacterCreator.jsx:61-70`:
  1. `identity` → `IdentityStep.jsx` (name, race, subrace, background, alignment, languages, level, portrait, appearance)
  2. `class` → `ClassStep.jsx` (class + subclass "path")
  3. `abilities` → `AbilityScoresStep.jsx` (point-buy / standard array / roll + racial ASI)
  4. `features` → `ClassFeaturesStep.jsx` (class features, fighting style, ASI/feat picker, multiclass)
  5. `skills` → `SkillsStep.jsx` (skill + expertise picks)
  6. `spells` → `SpellsStep.jsx`
  7. `equipment` → `EquipmentStep.jsx`
  8. `review` → `ReviewStep.jsx`
- The dispatcher at `CharacterCreator.jsx:798-808` swaps to `*2024` components when `characterData.gamePack === 'dnd5e_2024'`; the 2014 path uses the components above.

### 1.2 Where the rules data lives
- **Single source of truth for formulas + most tables:** `src/components/dnd5e/dnd5eRules.js` (3974 lines). Ability modifier, proficiency bonus, point-buy costs, standard array, skill→ability map, spell-slot tables (full/half/pact), caster types, spellcasting abilities, `SPELLS_KNOWN_TABLE`, `CLASS_SKILL_CHOICES`, `CLASS_TOOL_PROFICIENCIES`, `STARTING_EQUIPMENT`, `FEATS`, `RACES`, `BACKGROUNDS`, `ARMOR_TABLE`, a correct `calculateAC`, `spellSaveDC`, `spellAttackMod`, ASI levels.
- **Per-step display data with embedded rules:** `ClassStep.jsx` `CLASSES_DATA` (`:47-246`) carries hit dice, saving throws, skill counts, **and the subclass lists**; `IdentityStep.jsx` `RACE_LORE`/`BACKGROUND_LORE` (`:57-193`) carry the selectable race/subrace/background lists.
- **Class features:** `src/game-packs/dnd5e/data/classFeatures.js` (used by `ClassFeaturesStep`).
- **Other data:** `raceData.jsx` (a *second, unused* racial-ASI table), `backgroundData.jsx`, `spellData.jsx` (class spell lists, slot helpers, spell details/icons), `itemData.jsx`, `schemas.jsx`.

### 1.3 Where stats are computed at runtime
- `src/components/dnd5e/characterCalculations.jsx` — thin re-export layer over `dnd5eRules.js`, **plus a divergent local `calculateAC` stub** (`:95-99`).
- `src/components/dnd5e/characterMapping.jsx` — `buildStatsFromCharacterData()` (`:17-181`) is the **canonical save-payload builder**: it computes HP, AC, prof bonus, initiative, passive perception, speed and assembles the row written to Supabase.
- Completion gates: `skillsCompletion.js`, `spellsCompletion.js` (shared by the steps and the orchestrator's `validateStep`).

### 1.4 State model
- One `characterData` object held in `useState` at `CharacterCreator.jsx:148-199`; every step receives `characterData` + `updateCharacterData` (a shallow-merge setter, `:521-523`). No per-step local persistence beyond transient UI state.

### 1.5 Exact save path
- `handleSubmit` (`CharacterCreator.jsx:676-702`) → guards `user?.id` from **`useAuth()`** (`:146`, `:88`) → `buildStatsFromCharacterData(characterData)` → stamps `created_by = user.email`, `user_id = user.id`, `game_pack` → `createMutation.mutate(stats)`.
- `createMutation` (`:368-519`) writes via `base44.entities.Character.create/update` (PC) or `CampaignNPC.create/update` (NPC). Errors surface through `onError` → `toast.error` (`:515-518`) — **no silent-success swallow on the write**.
- **Auth source is the canonical `useAuth()` hook — `base44.auth.me()` is NOT on the creator save path.** (Phase-2 requirement satisfied; see Notes for the one benign `.catch` in a count query.)
- Portrait upload: `IdentityStep.jsx:318,335` calls `base44.integrations.Core.UploadFile({ file })`, which defaults to bucket **`campaign-assets`** (`base44Client.js:70`). The Quick/AI flows instead use `uploadFile(file, "user-assets", "characters", …)`.

---

## 2. Findings

### 🔴 Critical

**C1 — Saved Armor Class ignores armor, shield, and unarmored defense (always 10 + Dex).**
`characterCalculations.jsx:95-99` — `calculateAC(dexScore, armor=null)` accepts an `armor` arg but never uses it; it returns `10 + dexMod` unconditionally. The save builder calls it with Dex only: `characterMapping.jsx:35` (`calculateAC(attributes.dex)`). A correct, full implementation already exists and is *not* used: `dnd5eRules.js:796-814` (`calculateAC(armor, dexMod, hasShield, otherBonuses)` handles light = full Dex, medium = Dex cap +2, heavy = flat, shield +2) and `unarmoredDefense()` at `:817-822`.
- **Correct:** AC should be derived from equipped armor/shield (or Barbarian Con / Monk Wis unarmored defense). A plate-armored Fighter and a naked Wizard with the same Dex currently save the *same* AC.
- **Trigger:** every character saved through the creator. `armor_class` is wrong for anyone wearing armor or a shield.

**C2 — Class saving-throw proficiencies are never persisted (`saving_throws` saves as `{}`).**
No 2014 step ever writes `characterData.saving_throws`. `ClassStep.jsx` carries each class's two saves only as display data (`CLASSES_DATA[].savingThrows`, e.g. `:53,68,83…`) and never calls `updateCharacterData({ saving_throws })`. The save builder passes the empty map straight through: `characterMapping.jsx:129`. (Grep across all 2014 step files: zero `saving_throws` writes.)
- **Correct (SRD):** each class grants proficiency in exactly two saves (Fighter STR/CON, Wizard INT/WIS, etc.). These must be recorded so save bonuses add the proficiency bonus.
- **Trigger:** every character. Saved character has no proficient saves.

**C3 — Class/race armor, weapon, and tool proficiencies are never persisted (`proficiencies` saves empty).**
Same pattern as C2: nothing in the 2014 flow writes `characterData.proficiencies`. Default is `{ armor: [], weapons: [], tools: [] }` (`CharacterCreator.jsx:174`) and it round-trips empty via `characterMapping.jsx:131-135`. The data exists (`CLASS_TOOL_PROFICIENCIES` `dnd5eRules.js:3440-3453`, class armor/weapon grants) but is never applied.
- **Correct (SRD):** e.g. Fighter = all armor + shields + simple/martial weapons; Rogue = Thieves' tools; Druid = Herbalism kit, etc.
- **Trigger:** every character. Weapon-attack proficiency, armor-without-penalty eligibility, and tool checks are all unrecorded.

**C4 — SRD leak: 12 non-SRD backgrounds presented as core content.**
SRD 5.1 contains **only Acolyte**. The creator offers all 13 PHB backgrounds. Selectable UI list: `IdentityStep.jsx:179-193` (`BACKGROUND_LORE`: Acolyte + Criminal, Folk Hero, Noble, Sage, Soldier, Outlander, Sailor, Charlatan, Entertainer, Guild Artisan, Hermit, Urchin). Mirrored in `backgroundData.jsx:9-68` and `dnd5eRules.js:2275-2358`.
- **Correct:** only Acolyte as base SRD content; the rest belong in the Brewery.

**C5 — SRD leak: non-SRD subraces presented as core content.**
SRD ships one subrace per race (Hill Dwarf, High Elf, Lightfoot Halfling, Rock Gnome). Selectable lineages in `IdentityStep.jsx` (`RACE_LORE`, `:57-173`) and `RACES[*].subraces` (`dnd5eRules.js` ~`:648-696`) additionally expose: **Wood Elf** (`IdentityStep.jsx:79`), **Drow/Dark Elf** (`:79`), **Mountain Dwarf** (`:91`), **Stout Halfling** (`:112`), **Forest Gnome** (`:164`), the 9 named **Tiefling bloodlines** (`:123`), and **Half-Elf variant lineages** (Half-High/Half-Wood/Half-Drow, `:141`).
- **Correct:** one SRD subrace per race. Note also Mountain Dwarf and Forest Gnome are listed *first*, so they become the silent default subrace (see M11).

**C6 — SRD leak: non-SRD subclasses offered for all 12 classes.**
SRD ships exactly one subclass per class. The Class step's `CLASSES_DATA[].subclasses` (`ClassStep.jsx:58-244`) offers extras for every class, e.g. Path of the Totem Warrior (`:58-61`), College of Valor (`:73-76`), Light/War Domain (`:88-92`), Circle of the Moon (`:104-107`), Battle Master (`:119-122`), Way of Shadow (`:134-137`), Oath of the Ancients/Vengeance (`:149-153`), Beast Master (`:165-168`), Assassin/Arcane Trickster (`:187-191`), Wild Magic (`:203-206`), The Archfey/Great Old One (`:218-222`), School of Divination/Abjuration (`:240-244`).
- **Correct:** one subclass each (Berserker, College of Lore, Life Domain, Circle of the Land, Champion, Way of the Open Hand, Oath of Devotion, Hunter, Thief, Draconic Bloodline, The Fiend, School of Evocation). Note the downstream feature data (`classFeatures.js`) was *already* trimmed to one each — so the two sources are **inconsistent**, and a player can pick a non-SRD subclass on the Class step that the Features step then can't service.

**C7 — SRD leak: full 40-feat PHB catalog (only Grappler is SRD).**
`FEATS` at `dnd5eRules.js:1392`(–~1700) defines 40 PHB feats. Surfaced to the user in the ASI/feat picker `ClassFeaturesStep.jsx:972` (`feasibleFeats`) and rendered `:1098`; also re-exported as a base catalog at `src/data/games/dnd5e_2014/index.js:110`.
- **Correct:** SRD 5.1 contains **only Grappler**. The other 39 must be gated as non-SRD.

### 🟠 Major

**M1 — Warlock Pact Magic feature missing from the level-1 feature list.**
`classFeatures.js:477-489` (Warlock L1) lists Otherworldly Patron but **no Pact Magic / Spellcasting feature**, even though `ClassStep.jsx:214` advertises `["Otherworldly Patron", "Pact Magic"]`. (Patron at L1 and Invocations correctly gated at L2 are both fine.) The slot/cantrip/known counts themselves are correct in the spell tables (see verified items), but the L1 feature entry omits Pact Magic.

**M2 — Features step has no enforced Continue gate.**
`CharacterCreator.jsx:571` — `case 'features': return true`. The "resolve all orange-bordered choices" warning (`ClassFeaturesStep.jsx:858`) is advisory only; a player can advance with an unchosen L1 subclass (Cleric/Sorcerer/Warlock/Wizard) or unpicked Fighting Style.

**M3 — Round-trip gap: `baseAttributes`, `asiSelections`, `multiclassSkills` are dropped from the save payload.**
`buildStatsFromCharacterData` (`characterMapping.jsx:64-181`) never emits these three keys, though the creator tracks them (`CharacterCreator.jsx:170,184,191`). On edit-reload they fall back to defaults (`CharacterCreator.jsx:272,281,282`): `baseAttributes` collapses to the post-ASI `attributes`, and `asiSelections`/`multiclassSkills` become empty. Re-editing any character that took an ASI (level 4+) or multiclass loses the ASI audit trail and can mis-recompute attributes.

**M4 — Round-trip gap: equipment choice state doesn't reload.**
`equipment_choices` (`EquipmentStep.jsx:101`) and `used_starting_gold` (`:114`) are neither in initial state nor in the reload hydration list (`CharacterCreator.jsx:270-288`). On edit-reload the choice selectors reset to defaults (`EquipmentStep.jsx:61-64`) and the gold/kit toggle reverts. The applied inventory/currency survive, but the editor UI no longer reflects what was chosen.

**M5 — Spells Continue gate uses strict `===` with no down-trim → can lock permanently.**
`spellsCompletion.js:126-127` requires `selCantrips === cantripCap && selNonCantrips === nonCantripCap`. The picker blocks *adding* past the cap but never trims an over-cap stored `spells` object. If stored picks exceed the current cap (e.g. pick spells at L3, then lower level/class so the cap drops, or a recommended pre-fill overshoots), `selNonCantrips > nonCantripCap` is never equal → Continue is wrongly disabled with no guidance until the player manually deselects. (The previously-reported "every prepared/known caster stuck at L1" bug — validator comparing to slot counts — is **fixed**; non-casters and L1 half-casters correctly pass via `:113-115`.)
- **Repro:** Sorcerer L3 (cap 4 known) → pick 4 → change level to 1 (cap 2) → stored `spells.level1` has 4 → `4 === 2` false → locked.

**M6 — Bard expertise forced at level 1 (SRD: Bard expertise is level 3).**
`SkillsStep.jsx:38` and `skillsCompletion.js:26` hardcode `Bard: 2` expertise with no level gate, and the gate requires `expertiseSelected === expertiseRequired` (`skillsCompletion.js:155`). A level-1 Bard is forced to pick 2 expertise (illegal at L1) and is *blocked* from continuing until they do. (Rogue 2-at-L1 is correct.) Expertise is also not level-scaled (Rogue L6 / Bard L10 second grants ignored).

**M7 — Background bonus languages are not collected in the full creator.**
`IdentityStep` only *displays* "N of your choice" for background languages (`:1016-1021`) with no picker and writes nothing. Acolyte's 2 free languages are lost. Additionally, the High Elf "Extra Language" pick is not surfaced (`RACES.Elf` has no `"+1 choice"` token), and the **Half-Elf +1/+1 ability choice** is not collectible at the Identity step (`bonusesFor` surfaces only CHA +2).

**M8 — Portrait storage target is the wrong bucket.**
Full-creator uploads go to `campaign-assets` root (`base44Client.js:70` default, called with no bucket/path at `IdentityStep.jsx:318,335`). Quick/AI flows use `user-assets/characters` (`QuickPickFlow.jsx:118`, `AIGenerateFlow.jsx:75`). Neither uses the expected `user-assets/users/{user_id}/character-library/` path.

**M9 — `getLanguagesForCharacter` hardcodes placeholder languages.**
`backgroundData.jsx:102-105` pushes literal `"Dwarvish"` then `"Elvish"` for background language slots regardless of player choice. Not reached by `IdentityStep` (see M7), but **is** used by `QuickCreateDialog.jsx:187,219,379` and the `dnd5e_2014` data-layer index — so quick-created characters get wrong, non-chosen languages.

**M10 — Stray class-feature data errors.**
- Cleric has a bogus **Expertise** feature (copy-paste from Bard/Rogue) at `classFeatures.js:122-126` (tagged L3; Clerics never get Expertise).
- Paladin **Divine Health duplicated** at `classFeatures.js:315-318` and `:331-334` (renders twice).

**M11 — Default subrace is a non-SRD lineage.**
`buildRaceUpdates` always sets `subrace = race.subtypes[0]` (`IdentityStep.jsx:388`); because Mountain Dwarf (`:91`) and Forest Gnome (`:164`) are listed first, a player who picks Dwarf/Gnome and clicks Continue without touching lineage silently gets a non-SRD subrace. Subrace and languages are also not gated by the Continue button (`CharacterCreator.jsx:559`). Re-clicking the already-selected race re-runs `buildRaceUpdates` and **resets** a previously chosen subrace back to `subtypes[0]`.

**M12 — Skills: "choose any" racial bonus overlapping the class list is mis-attributed; background change leaves stale proficiencies.**
- For a race that chooses from "any" (e.g. Half-Elf's 2), a bonus skill that is also on the class list is counted in the *class* bucket, not the racial bucket (`skillsCompletion.js:73-78`, mirrored `SkillsStep.jsx:165-172`). The total still resolves, but per-bucket StatusCards can stall the racial card at 0/2. 
- Background skills are force-applied on background change (`SkillsStep.jsx:58-66`) with no removal path; switching backgrounds leaves the old background's skills set as proficient and they get mis-counted on recompute.

### 🟡 Minor

**m1 — Starting-equipment application is rough.** `EquipmentStep.jsx:106-110`: placeholder option strings ("Any martial melee weapon", "Warhammer (if proficient)") are stored verbatim as inventory item names; all items get `weight:0, quantity:1` (stack counts like "20 Arrows" baked into the name); and "Add starting equipment" is **not idempotent** (double-click duplicates the whole kit).

**m2 — Equipment vs. starting gold not mutually exclusive.** `used_starting_gold` only swaps the panel; a player can apply the kit *and* roll gold without one clearing the other (`EquipmentStep.jsx:114,198`). SRD treats them as alternatives.

**m3 — Spell name branding leaks.** `spellData.jsx:602` "Tasha's Hideous Laughter", `:603` "Tenser's Floating Disk", `:443` "Otto's Irresistible Dance" use PHB-branded names; SRD 5.1 uses the de-branded forms ("Hideous Laughter", "Floating Disk", "Irresistible Dance") — for which SRD-named icons already exist in the same file. Several "recommended" spells (`:422-433,494`) reference entries with no detail/icon card (harmless at L1).

**m4 — No structured `feats` array.** Feats taken via ASI live only in `asiSelections`; the schema `feats` field (`schemas.jsx:52`) is never populated, so the sheet can't read feats without reconstructing from `asiSelections`.

**m5 — Two divergent racial-ASI sources.** `raceData.jsx:3-54` (`racialBonuses`) is a second ASI table not used by `IdentityStep` (which reads `RACES`). Both are internally SRD-correct, but two sources of truth is a latent drift risk; `raceData.jsx` also carries the non-SRD subraces and a "Variant Human" skill entry (`:86`).

**m6 — Identity gate is loose.** Subrace and language completeness are not required to advance (`CharacterCreator.jsx:559`); only name/race/background/alignment gate.

### ⚪ Notes / Unverifiable

- **No React #306 double-lazy-export risk in this creator.** No `lazy()` usage in `CharacterCreator.jsx` or any 2014 step; all steps are eagerly imported (`CharacterCreator.jsx:33-58`), each with a single default export (e.g. `ReviewStep.jsx:118`).
- **No silent-save swallow.** The two `.catch(() => [])` in scope are benign and off the write path: the character-count query (`CharacterCreator.jsx:103`) and the homebrew-spell merge (`spellData.jsx:362`). The actual write throws to `createMutation.onError` → `toast.error` (`:515-518`).
- **Spell save DC / attack are defined but not computed in the creator.** `spellSaveDC`/`spellAttackMod` (`dnd5eRules.js:724-731`) are correct (`8 + prof + mod`; `prof + mod`) and casting abilities are correct (`:342-345`), but the Spells step neither computes nor persists a DC/attack — presumably the character sheet derives them at render (sheet is out of scope; not verified).
- **Saves/AC at display time.** Because `saving_throws`/`proficiencies`/`armor_class` are stored wrong/empty (C1–C3), correctness depends on whether the character sheet recomputes from class/equipment at render. The sheet was out of scope and not read; regardless, the *saved payload* is incomplete/incorrect.
- **DB-backed spell content (L2–L9) unverifiable statically.** `fetchAllSpells` reads the `dnd5e_spells` Supabase table (`spellData.jsx:347-368`); its contents (and any non-SRD rows) can't be checked from the repo.
- **Verified correct (no action):** ability modifier `floor((score-10)/2)` (`dnd5eRules.js:27-29`); proficiency bonus by level (`:32-42`); point-buy costs 8=0…15=9 and total 27 (`:88-91`); standard array 15/14/13/12/10/8 (`:85`); skill→ability map, all 18 (`:53-72`); HP = max die + Con at L1, averages after, multiclass-aware (`characterCalculations.jsx:43-93`); full/half/pact spell-slot tables (`dnd5eRules.js:356-430`); Warlock pact slots (`:396-417`); `SPELLS_KNOWN_TABLE` known/prepared/spellbook incl. Wizard 6 at L1 (`:3321-3408`); `CLASS_SKILL_CHOICES` counts/lists (`:3455-3468`); class saving-throw *data*, hit dice, ASI levels incl. Fighter 6/14 & Rogue 10 (`ClassStep.jsx` + `:1377-1390`); racial ASI *values* in `RACES`; `STARTING_EQUIPMENT` contents and starting-gold formulas; 5-coin currency model; expertise→passive-perception wiring (`characterMapping.jsx:52-62`). The problems above are about this correct data **not being written/used**, not the numbers themselves.

---

## 3. Recommended fix order (sequencing only — no code)

1. **C1 AC** — wire the save builder to the real `dnd5eRules.calculateAC` (+ `unarmoredDefense`) using the equipped armor/shield. Highest player-facing correctness impact, smallest change.
2. **C2 + C3 proficiencies/saves** — populate `characterData.saving_throws` and `proficiencies` from the class/race tables at class selection, and emit them in `buildStatsFromCharacterData`. Do these together; they share the same root cause (data exists, never written).
3. **C4–C7 SRD leaks** — trim base content to SRD: backgrounds→Acolyte only, one subrace per race, one subclass per class (align `ClassStep.CLASSES_DATA` with the already-clean `classFeatures.js`), feats→Grappler only. Move the rest to the Brewery. Legal risk → do before any public release. m3 branding rename rides along.
4. **M1 Warlock Pact Magic** — add the missing L1 feature entry.
5. **M3 + M4 round-trip** — emit/rehydrate `baseAttributes`, `asiSelections`, `multiclassSkills`, `equipment_choices`, `used_starting_gold`.
6. **M5 spells gate + M6 Bard expertise** — switch the spells gate to tolerate ≤ cap (or auto-trim over-cap) and level-gate Bard expertise to L3.
7. **M7 + M9 languages** — add background/High-Elf/Half-Elf language and ability pickers; fix the placeholder-language helper.
8. **M2 features gate, M8 storage bucket, M10–M12, minors** — enforce the features gate, point portraits at `user-assets/.../character-library/`, fix the stray feature dupes/leaks, default-subrace ordering, and skill attribution edges. Polish (m1–m6) last.

---

## 4. Severity summary (counts)

| Tier | Count |
|------|-------|
| 🔴 Critical | 7 |
| 🟠 Major | 12 |
| 🟡 Minor | 6 |
| ⚪ Notes / unverifiable | 6 |
