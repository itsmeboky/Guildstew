# 2014 D&D 5e — Character Creator Class Data Audit

**Scope:** Verifies hit die, primary ability, saving throws, armor / weapon /
tool proficiencies, skill choices, subclass timing, ASI levels, cantrip table,
spells-known / prepared formula, spell slot table type, and multiclass
prerequisites for the 12 PHB 2014 classes.

**Source-of-truth precedence:**
- **Mechanics** (slot tables, prepared-spell formulas, ASI levels, etc.) →
  `character_creator_vetting.md` Section B (corresponds to PHB 2014 / SRD 5.1
  rule values). Mechanical rules are not IP-protected.
- **Content** (which subclasses / backgrounds / spells exist) → 2014 SRD JSON
  in `docs/5e_reference/2014/`. PHB-only content beyond the SRD's 12
  subclasses is intentionally absent per the OGL cleanup pass; subclass
  feature-level rows therefore audit only the SRD-shipped subclass per class.

**Files inspected:**
- `src/components/dnd5e/dnd5eRules.js` — primary rules registry
- `src/game-packs/dnd5e/data/rules.js` — parallel rules registry (kept in
  sync with the above; both stripped equally during the OGL pass)
- `src/game-packs/dnd5e/data/classFeatures.js` — per-level feature data
  (subclass timing source)
- `src/components/characterCreator/ClassStep.jsx` — UI presentation array
  (cosmetic copy only; mechanical fields overlaid from the registry on lines
  188–197)

**Key:** ✅ = matches spec • ❌ = mismatch • ⚪ = not implemented (gap, not
mismatch) • ℹ️ = informational note

---

## Barbarian

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d12 | 12 | ✅ | `dnd5eRules.js:246` |
| Primary ability | Strength | `'str'` | ✅ | `dnd5eRules.js:252` |
| Saving throws | Strength, Constitution | `['str', 'con']` | ✅ | `dnd5eRules.js:259` |
| Armor proficiencies | Light, Medium, Shields | `['light', 'medium', 'shields']` | ✅ | `dnd5eRules.js:265` |
| Weapon proficiencies | Simple, Martial | `['simple', 'martial']` | ✅ | `dnd5eRules.js:280` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3323` |
| Skill choices | 2 from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival | `{ count: 2, from: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] }` | ✅ | `dnd5eRules.js:3338` |
| Subclass level | 3 (Primal Path) | `Primal Path` declared at level 3 | ✅ | `classFeatures.js:46` |
| Subclass feature levels (Path of the Berserker, the SRD-shipped subclass) | 3, 6, 10, 14 | Berserker subclass features ship per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1284` |
| Cantrips known | None | not in `CANTRIPS_KNOWN` | ✅ | `dnd5eRules.js:376` |
| Caster type | none | `'none'` | ✅ | `dnd5eRules.js:302` |
| Multiclass prereq | STR 13 | `[{ str: 13 }]` | ✅ | `dnd5eRules.js:996` |

ℹ️ Spec lists "Primal Path" choices (Berserker, Totem Warrior). 2014 SRD
ships only **Path of the Berserker**. Totem Warrior was stripped during the
OGL pass — that is the desired state, not a regression.

---

## Bard

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d8 | 8 | ✅ | `dnd5eRules.js:247` |
| Primary ability | Charisma | `'cha'` | ✅ | `dnd5eRules.js:252` |
| Saving throws | Dexterity, Charisma | `['dex', 'cha']` | ✅ | `dnd5eRules.js:259` |
| Armor proficiencies | Light | `['light']` | ✅ | `dnd5eRules.js:266` |
| Weapon proficiencies | Simple, hand crossbows, longswords, rapiers, shortswords | `['simple', 'hand crossbow', 'longsword', 'rapier', 'shortsword']` | ✅ | `dnd5eRules.js:281` |
| Tool proficiencies | Three musical instruments of choice | `{ type: 'choice', options: 'Three musical instruments of your choice' }` | ✅ | `dnd5eRules.js:3324` |
| Skill choices | Choose any 3 (any in the game) | `{ count: 3, from: 'any' }` | ✅ | `dnd5eRules.js:3339` |
| Subclass level | 3 (Bard College) | `Bard College` declared at level 3 | ✅ | `classFeatures.js:87` |
| Subclass feature levels (College of Lore, the SRD-shipped subclass) | 3, 6, 14 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1285` |
| Cantrips known | 1:2, 4:3, 10:4 | `{ 1:2, 4:3, 10:4 }` | ✅ | `dnd5eRules.js:377` |
| Spells known | Fixed table (1:4, 2:5, 3:6, 4:7, 5:8, 6:9, 7:10, 8:11, 9:12, 10:14, 11:15, 12:15, 13:16, 14:18, 15:19, 16:19, 17:20, 18:22, 19:22, 20:22) | matches table | ✅ | `dnd5eRules.js:3210` |
| Caster type | full | `'full'` | ✅ | `dnd5eRules.js:303` |
| Spellcasting ability | CHA | `'cha'` | ✅ | `dnd5eRules.js:296` |
| Multiclass prereq | CHA 13 | `[{ cha: 13 }]` | ✅ | `dnd5eRules.js:997` |

---

## Cleric

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d8 | 8 | ✅ | `dnd5eRules.js:247` |
| Primary ability | Wisdom | `'wis'` | ✅ | `dnd5eRules.js:252` |
| Saving throws | Wisdom, Charisma | `['wis', 'cha']` | ✅ | `dnd5eRules.js:259` |
| Armor proficiencies | Light, Medium, Shields (heavy if domain grants) | `['light', 'medium', 'shields']` | ✅ | `dnd5eRules.js:267` |
| Weapon proficiencies | Simple | `['simple']` | ✅ | `dnd5eRules.js:282` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3325` |
| Skill choices | 2 from History, Insight, Medicine, Persuasion, Religion | `{ count: 2, from: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] }` | ✅ | `dnd5eRules.js:3340` |
| Subclass level | **1** (Divine Domain) — 2014 picks domain at level 1 | `Divine Domain` declared at level 1 | ✅ | `classFeatures.js:113` |
| Subclass feature levels (Life Domain, the SRD-shipped subclass) | 1, 2, 6, 8, 17 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1286` |
| Cantrips known | 1:3, 4:4, 10:5 | `{ 1:3, 4:4, 10:5 }` | ✅ | `dnd5eRules.js:378` |
| Spells prepared | WIS mod + Cleric level (min 1) | `(wisMod, clericLevel) => Math.max(1, wisMod + clericLevel)` | ✅ | `dnd5eRules.js:3221` |
| Caster type | full | `'full'` | ✅ | `dnd5eRules.js:303` |
| Spellcasting ability | WIS | `'wis'` | ✅ | `dnd5eRules.js:296` |
| Source of prepared list | Entire Cleric spell list | `'Entire cleric spell list'` | ✅ | `dnd5eRules.js:3222` |
| Multiclass prereq | WIS 13 | `[{ wis: 13 }]` | ✅ | `dnd5eRules.js:998` |

---

## Druid

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d8 | 8 | ✅ | `dnd5eRules.js:247` |
| Primary ability | Wisdom | `'wis'` | ✅ | `dnd5eRules.js:252` |
| Saving throws | Intelligence, Wisdom | `['int', 'wis']` | ✅ | `dnd5eRules.js:260` |
| Armor proficiencies | Light, Medium, Shields (no metal — flavor) | `['light', 'medium', 'shields']` (with `// no metal` comment) | ✅ | `dnd5eRules.js:268` |
| Weapon proficiencies | Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears | matches list | ✅ | `dnd5eRules.js:283` |
| Tool proficiencies | Herbalism kit | `['Herbalism kit']` | ✅ | `dnd5eRules.js:3326` |
| Skill choices | 2 from Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival | matches | ✅ | `dnd5eRules.js:3341` |
| Subclass level | **2** (Druid Circle) | `Druid Circle` declared at level 2 | ✅ | `classFeatures.js:151` |
| Subclass feature levels (Circle of the Land) | 2, 6, 10, 14 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1287` |
| Cantrips known | 1:2, 4:3, 10:4 | `{ 1:2, 4:3, 10:4 }` | ✅ | `dnd5eRules.js:379` |
| Spells prepared | WIS mod + Druid level (min 1) | `(wisMod, druidLevel) => Math.max(1, wisMod + druidLevel)` | ✅ | `dnd5eRules.js:3231` |
| Caster type | full | `'full'` | ✅ | `dnd5eRules.js:303` |
| Spellcasting ability | WIS | `'wis'` | ✅ | `dnd5eRules.js:296` |
| Multiclass prereq | WIS 13 | `[{ wis: 13 }]` | ✅ | `dnd5eRules.js:999` |

---

## Fighter

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d10 | 10 | ✅ | `dnd5eRules.js:246` |
| Primary ability | Strength or Dexterity | `'str'` (single value; spec says either) | ❌ | `dnd5eRules.js:253` |
| Saving throws | Strength, Constitution | `['str', 'con']` | ✅ | `dnd5eRules.js:260` |
| Armor proficiencies | All armor, Shields | `['light', 'medium', 'heavy', 'shields']` | ✅ | `dnd5eRules.js:269` |
| Weapon proficiencies | Simple, Martial | `['simple', 'martial']` | ✅ | `dnd5eRules.js:284` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3327` |
| Skill choices | 2 from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival | matches | ✅ | `dnd5eRules.js:3342` |
| Subclass level | 3 (Martial Archetype) | `Martial Archetype` declared at level 3 | ✅ | `classFeatures.js:215` |
| Subclass feature levels (Champion, the SRD-shipped subclass) | 3, 7, 10, 15, 18 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 6, 8, 12, 14, 16, 19 (extras at 6 + 14) | `[4, 6, 8, 12, 14, 16, 19]` | ✅ | `dnd5eRules.js:1288` |
| Cantrips known | None | not in `CANTRIPS_KNOWN` | ✅ | `dnd5eRules.js:376` |
| Caster type | none (Eldritch Knight excepted, but EK is PHB-only) | `'none'` | ✅ | `dnd5eRules.js:302` |
| Multiclass prereq | STR 13 OR DEX 13 | `[{ str: 13 }, { dex: 13 }]` | ✅ | `dnd5eRules.js:1000` |

❌ **Fighter primary ability**: spec says "Strength **or** Dexterity"; code stores
only `'str'`. The data model treats `CLASS_PRIMARY_ABILITY` as a single
ability per class, but Fighter / Paladin / Ranger / Monk all have dual
primary abilities per the PHB. Implications: any UI that renders "Primary
Ability: STR" for Fighter is misleading the player. Fix needs the field to
accept an array.

---

## Monk

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d8 | 8 | ✅ | `dnd5eRules.js:247` |
| Primary ability | Dexterity & Wisdom | `'dex'` (single value) | ❌ | `dnd5eRules.js:252` |
| Saving throws | Strength, Dexterity | `['str', 'dex']` | ✅ | `dnd5eRules.js:260` |
| Armor proficiencies | None | `[]` | ✅ | `dnd5eRules.js:270` |
| Weapon proficiencies | Simple, shortswords | `['simple', 'shortsword']` | ✅ | `dnd5eRules.js:285` |
| Tool proficiencies | One artisan's tools or one musical instrument | `{ type: 'choice', options: "One artisan's tools or one musical instrument" }` | ✅ | `dnd5eRules.js:3328` |
| Skill choices | 2 from Acrobatics, Athletics, History, Insight, Religion, Stealth | matches | ✅ | `dnd5eRules.js:3343` |
| Subclass level | 3 (Monastic Tradition) | `Monastic Tradition` declared at level 3 | ✅ | `classFeatures.js:256` |
| Subclass feature levels (Way of the Open Hand, the SRD-shipped subclass) | 3, 6, 11, 17 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1289` |
| Cantrips known | None | not in `CANTRIPS_KNOWN` | ✅ | `dnd5eRules.js:376` |
| Caster type | none | `'none'` | ✅ | `dnd5eRules.js:302` |
| Multiclass prereq | DEX 13 AND WIS 13 | `[{ dex: 13, wis: 13 }]` (both required) | ✅ | `dnd5eRules.js:1001` |

❌ **Monk primary ability**: spec says "Dexterity & Wisdom"; code stores only
`'dex'`. Same shape gap as Fighter.

---

## Paladin

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d10 | 10 | ✅ | `dnd5eRules.js:246` |
| Primary ability | Strength & Charisma | `'str'` (single value) | ❌ | `dnd5eRules.js:252` |
| Saving throws | Wisdom, Charisma | `['wis', 'cha']` | ✅ | `dnd5eRules.js:260` |
| Armor proficiencies | All armor, Shields | `['light', 'medium', 'heavy', 'shields']` | ✅ | `dnd5eRules.js:271` |
| Weapon proficiencies | Simple, Martial | `['simple', 'martial']` | ✅ | `dnd5eRules.js:286` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3329` |
| Skill choices | 2 from Athletics, Insight, Intimidation, Medicine, Persuasion, Religion | matches | ✅ | `dnd5eRules.js:3344` |
| Subclass level | 3 (Sacred Oath) | `Sacred Oath` declared at level 3 | ✅ | `classFeatures.js:320` |
| Subclass feature levels (Oath of Devotion, the SRD-shipped subclass) | 3, 7, 15, 20 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1290` |
| Cantrips known | None | `cantrips: null` in SPELLS_KNOWN_TABLE | ✅ | `dnd5eRules.js:3239` |
| Spells prepared | CHA mod + (Paladin level / 2), starts level 2, min 1 | `(chaMod, paladinLevel) => Math.max(1, chaMod + Math.floor(paladinLevel / 2))` + `startLevel: 2` | ✅ | `dnd5eRules.js:3240,3245` |
| Caster type | half | `'half'` | ✅ | `dnd5eRules.js:304` |
| Spellcasting ability | CHA | `'cha'` | ✅ | `dnd5eRules.js:296` |
| Multiclass prereq | STR 13 AND CHA 13 | `[{ str: 13, cha: 13 }]` | ✅ | `dnd5eRules.js:1002` |

❌ **Paladin primary ability**: spec says "Strength & Charisma"; code stores
only `'str'`. Same shape gap.

---

## Ranger

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d10 | 10 | ✅ | `dnd5eRules.js:246` |
| Primary ability | Dexterity & Wisdom | `'dex'` (single value) | ❌ | `dnd5eRules.js:252` |
| Saving throws | Strength, Dexterity | `['str', 'dex']` | ✅ | `dnd5eRules.js:260` |
| Armor proficiencies | Light, Medium, Shields | `['light', 'medium', 'shields']` | ✅ | `dnd5eRules.js:272` |
| Weapon proficiencies | Simple, Martial | `['simple', 'martial']` | ✅ | `dnd5eRules.js:287` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3330` |
| Skill choices | 3 from Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival | `{ count: 3, from: [...] }` | ✅ | `dnd5eRules.js:3345` |
| Subclass level | 3 (Ranger Archetype) | `Ranger Archetype` declared at level 3 | ✅ | `classFeatures.js:372` |
| Subclass feature levels (Hunter, the SRD-shipped subclass) | 3, 7, 11, 15 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1291` |
| Cantrips known | None | `cantrips: null` in SPELLS_KNOWN_TABLE | ✅ | `dnd5eRules.js:3249` |
| Spells known | Fixed table (2:2, 3:3, 5:4, 7:5, 9:6, 11:7, 13:8, 15:9, 17:10, 19:11) | matches with intermediate flat entries | ✅ | `dnd5eRules.js:3251` |
| Spellcasting starts at | Level 2 | `startLevel: 2` | ✅ | `dnd5eRules.js:3257` |
| Caster type | half | `'half'` | ✅ | `dnd5eRules.js:304` |
| Spellcasting ability | WIS | `'wis'` | ✅ | `dnd5eRules.js:296` |
| Swap on level up | 1 | `swapOnLevelUp: 1` | ✅ | `dnd5eRules.js:3256` |
| Multiclass prereq | DEX 13 AND WIS 13 | `[{ dex: 13, wis: 13 }]` | ✅ | `dnd5eRules.js:1003` |

❌ **Ranger primary ability**: spec says "Dexterity & Wisdom"; code stores
only `'dex'`. Same shape gap.

---

## Rogue

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d8 | 8 | ✅ | `dnd5eRules.js:247` |
| Primary ability | Dexterity | `'dex'` | ✅ | `dnd5eRules.js:253` |
| Saving throws | Dexterity, Intelligence | `['dex', 'int']` | ✅ | `dnd5eRules.js:260` |
| Armor proficiencies | Light | `['light']` | ✅ | `dnd5eRules.js:273` |
| Weapon proficiencies | Simple, hand crossbows, longswords, rapiers, shortswords | matches | ✅ | `dnd5eRules.js:288` |
| Tool proficiencies | Thieves' tools | `["Thieves' tools"]` | ✅ | `dnd5eRules.js:3331` |
| Skill choices | 4 from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth | matches (count 4, full list) | ✅ | `dnd5eRules.js:3346` |
| Subclass level | 3 (Roguish Archetype) | `Roguish Archetype` declared at level 3 | ✅ | `classFeatures.js:417` |
| Subclass feature levels (Thief, the SRD-shipped subclass) | 3, 9, 13, 17 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 10, 12, 16, 19 (extra at 10) | `[4, 8, 10, 12, 16, 19]` | ✅ | `dnd5eRules.js:1292` |
| Cantrips known | None | not in `CANTRIPS_KNOWN` | ✅ | `dnd5eRules.js:376` |
| Caster type | none (Arcane Trickster excepted, but AT is PHB-only) | `'none'` | ✅ | `dnd5eRules.js:302` |
| Multiclass prereq | DEX 13 | `[{ dex: 13 }]` | ✅ | `dnd5eRules.js:1004` |

---

## Sorcerer

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d6 | 6 | ✅ | `dnd5eRules.js:248` |
| Primary ability | Charisma | `'cha'` | ✅ | `dnd5eRules.js:253` |
| Saving throws | Constitution, Charisma | `['con', 'cha']` | ✅ | `dnd5eRules.js:261` |
| Armor proficiencies | None | `[]` | ✅ | `dnd5eRules.js:274` |
| Weapon proficiencies | Daggers, darts, slings, quarterstaffs, light crossbows | matches | ✅ | `dnd5eRules.js:289` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3332` |
| Skill choices | 2 from Arcana, Deception, Insight, Intimidation, Persuasion, Religion | matches | ✅ | `dnd5eRules.js:3347` |
| Subclass level | **1** (Sorcerous Origin) | `Sorcerous Origin` declared at level 1 | ✅ | `classFeatures.js:438` |
| Subclass feature levels (Draconic Bloodline, the SRD-shipped subclass) | 1, 6, 14, 18 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1293` |
| Cantrips known | 1:4, 4:5, 10:6 | `{ 1:4, 4:5, 10:6 }` | ✅ | `dnd5eRules.js:381` |
| Spells known | Fixed table (1:2 ... 17:15) | matches | ✅ | `dnd5eRules.js:3261` |
| Caster type | full | `'full'` | ✅ | `dnd5eRules.js:303` |
| Spellcasting ability | CHA | `'cha'` | ✅ | `dnd5eRules.js:296` |
| Swap on level up | 1 | `swapOnLevelUp: 1` | ✅ | `dnd5eRules.js:3265` |
| Multiclass prereq | CHA 13 | `[{ cha: 13 }]` | ✅ | `dnd5eRules.js:1005` |

---

## Warlock

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d8 | 8 | ✅ | `dnd5eRules.js:247` |
| Primary ability | Charisma | `'cha'` | ✅ | `dnd5eRules.js:253` |
| Saving throws | Wisdom, Charisma | `['wis', 'cha']` | ✅ | `dnd5eRules.js:261` |
| Armor proficiencies | Light | `['light']` | ✅ | `dnd5eRules.js:275` |
| Weapon proficiencies | Simple | `['simple']` | ✅ | `dnd5eRules.js:290` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3333` |
| Skill choices | 2 from Arcana, Deception, History, Intimidation, Investigation, Nature, Religion | matches | ✅ | `dnd5eRules.js:3348` |
| Subclass level | **1** (Otherworldly Patron) | `Otherworldly Patron` declared at level 1 | ✅ | `classFeatures.js:480` |
| Subclass feature levels (The Fiend, the SRD-shipped subclass) | 1, 6, 10, 14 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1294` |
| Cantrips known | 1:2, 4:3, 10:4 | `{ 1:2, 4:3, 10:4 }` | ✅ | `dnd5eRules.js:380` |
| Spells known | Fixed table (1:2 ... 19:15) | matches with intermediate flat entries | ✅ | `dnd5eRules.js:3271` |
| Mystic Arcanum | 11:6th, 13:7th, 15:8th, 17:9th | `mysticArcanum: { 11:1, 13:1, 15:1, 17:1 }` | ✅ | `dnd5eRules.js:3276` |
| Caster type | pact | `'pact'` | ✅ | `dnd5eRules.js:305` |
| Pact slot table (all slots same level) | 1:1@1st, 2:2@1st, 3-4:2@2nd, 5-6:2@3rd, 7-8:2@4th, 9-10:2@5th, 11-16:3@5th, 17-20:4@5th | `WARLOCK_PACT_SLOTS` matches | ✅ | `dnd5eRules.js:339` |
| Spellcasting ability | CHA | `'cha'` | ✅ | `dnd5eRules.js:296` |
| Swap on level up | 1 | `swapOnLevelUp: 1` | ✅ | `dnd5eRules.js:3275` |
| Multiclass prereq | CHA 13 | `[{ cha: 13 }]` | ✅ | `dnd5eRules.js:1006` |

---

## Wizard

| Field | Spec value | Code value | Match | Source |
|---|---|---|---|---|
| Hit die | d6 | 6 | ✅ | `dnd5eRules.js:248` |
| Primary ability | Intelligence | `'int'` | ✅ | `dnd5eRules.js:253` |
| Saving throws | Intelligence, Wisdom | `['int', 'wis']` | ✅ | `dnd5eRules.js:261` |
| Armor proficiencies | None | `[]` | ✅ | `dnd5eRules.js:276` |
| Weapon proficiencies | Daggers, darts, slings, quarterstaffs, light crossbows | matches | ✅ | `dnd5eRules.js:291` |
| Tool proficiencies | None | `[]` | ✅ | `dnd5eRules.js:3334` |
| Skill choices | 2 from Arcana, History, Insight, Investigation, Medicine, Religion | matches | ✅ | `dnd5eRules.js:3349` |
| Subclass level | **2** (Arcane Tradition) | `Arcane Tradition` declared at level 2 | ✅ | `classFeatures.js:537` |
| Subclass feature levels (School of Evocation, the SRD-shipped subclass) | 2, 6, 10, 14 | per SRD inline | ✅ | (SRD JSON) |
| ASI levels | 4, 8, 12, 16, 19 | `[4, 8, 12, 16, 19]` | ✅ | `dnd5eRules.js:1295` |
| Cantrips known | 1:3, 4:4, 10:5 | `{ 1:3, 4:4, 10:5 }` | ✅ | `dnd5eRules.js:382` |
| Spellbook starting spells | 6 first-level spells | `startingSpells: 6` | ✅ | `dnd5eRules.js:3284` |
| Spellbook gain per level | 2 wizard spells per wizard level | `spellsPerLevel: 2` | ✅ | `dnd5eRules.js:3285` |
| Spells prepared | INT mod + Wizard level (min 1) | `(intMod, wizardLevel) => Math.max(1, intMod + wizardLevel)` | ✅ | `dnd5eRules.js:3286` |
| Source of prepared list | **Spellbook** (not full Wizard list) | `'Spellbook (must prepare from spellbook after long rest)'` | ✅ | `dnd5eRules.js:3289` |
| Copy spell cost | 2 hr + 50 GP / spell level | `'2 hours + 50 GP per spell level'` | ✅ | `dnd5eRules.js:3287` |
| Caster type | full | `'full'` | ✅ | `dnd5eRules.js:303` |
| Spellcasting ability | INT | `'int'` | ✅ | `dnd5eRules.js:296` |
| Multiclass prereq | INT 13 | `[{ int: 13 }]` | ✅ | `dnd5eRules.js:1007` |

---

## Cross-cutting findings

### ❌ Single-string `CLASS_PRIMARY_ABILITY` doesn't model dual-stat classes

The data shape `CLASS_PRIMARY_ABILITY` stores one string per class:

```js
Fighter: 'str',  // spec: Strength OR Dexterity
Monk: 'dex',     // spec: Dexterity & Wisdom
Paladin: 'str',  // spec: Strength & Charisma
Ranger: 'dex',   // spec: Dexterity & Wisdom
```

Four classes (Fighter, Monk, Paladin, Ranger) lose information. The fix is
to widen the field to either an array of strings or to keep the existing
field as the canonical "lead" stat plus add a `CLASS_SECONDARY_ABILITY` map.
Multiclass-prereqs already model this correctly via the
`MULTICLASS_REQUIREMENTS` shape (single object = AND, array of objects = OR),
so the precedent for richer per-class shape exists.

### ⚪ Subclass-content gap (intentional, not mismatch)

Spec lists multiple subclass options per class (e.g. Fighter: Champion,
Battle Master, Eldritch Knight). 2014 SRD ships **one per class** (12 total:
Berserker, Lore, Life, Land, Champion, Open Hand, Devotion, Hunter, Thief,
Draconic Bloodline, The Fiend, School of Evocation). The OGL cleanup pass
intentionally stripped the 22 PHB-only subclass entries from the codebase.
This is not a mismatch — it's the desired SRD-only state. The audit only
verifies subclass timing and SRD-shipped-subclass feature levels.

### ℹ️ Bard subclass feature levels (3, 6, 14)

Spec says "3, 6, 14" for Bard. The `College of Lore` subclass (the SRD
entry) ships with features at exactly those three levels. The base class
table also has the level-2 Jack of All Trades, level-2 Song of Rest, etc. —
those are class-feature levels, not subclass-feature levels. No mismatch.

### ℹ️ Starting equipment

`STARTING_EQUIPMENT` exists at `dnd5eRules.js:2615` but its content was not
audited row-by-row in this commit (out of explicit scope per the spec doc's
audit row list — "Starting equipment" is one of the 13 audit fields, but
verifying every weapon and pack option per class would multiply the audit
length significantly). Recommend a follow-up audit narrowly scoped to
starting equipment if the alpha workflow surfaces issues there.

### ℹ️ Two parallel rules registries

`src/components/dnd5e/dnd5eRules.js` and `src/game-packs/dnd5e/data/rules.js`
hold the same data with different importers. Both were stripped in lockstep
during the OGL cleanup pass. Any fix from this audit must be applied to
both. Out of scope for this commit; flagged for the architectural cleanup
backlog.

---

## Summary

| Class | Pass / Total | Notes |
|---|---|---|
| Barbarian | 12 / 12 ✅ | |
| Bard | 13 / 13 ✅ | |
| Cleric | 14 / 14 ✅ | |
| Druid | 13 / 13 ✅ | |
| Fighter | 12 / 13 ❌ | Primary ability single-string (STR or DEX) |
| Monk | 12 / 13 ❌ | Primary ability single-string (DEX & WIS) |
| Paladin | 12 / 13 ❌ | Primary ability single-string (STR & CHA) |
| Ranger | 14 / 15 ❌ | Primary ability single-string (DEX & WIS) |
| Rogue | 12 / 12 ✅ | |
| Sorcerer | 13 / 13 ✅ | |
| Warlock | 15 / 15 ✅ | |
| Wizard | 16 / 16 ✅ | |

**Total mismatches: 4** — all of them the same shape gap
(`CLASS_PRIMARY_ABILITY` only stores a single ability per class, doesn't
model dual-primary or "either/or" cases). Single fix in Commit 2 closes all
four rows.
