/**
 * D&D 5e (2024) — hand-authored copy.
 *
 * Class playstyle prose, species descriptions, subspecies lineage
 * prose, companion blurbs, alignment text. The 2024 SRD JSON ships
 * mechanical data but no narrative prose; this file fills that gap
 * with 2024-edition flavor so the step components match the polish
 * the 2014 step components have.
 *
 * 2024-specific notes:
 *   - All martial classes (Barbarian, Fighter, Monk, Paladin,
 *     Ranger, Rogue) get Weapon Mastery — called out in their
 *     descriptions.
 *   - Ability score bonuses come from BACKGROUND, not species, in
 *     every species blurb.
 *   - Half-casters (Paladin, Ranger) cast spells from level 1
 *     (changed from level 2 in 2014).
 *   - Bards, Sorcerers, and Warlocks all "prepare" spells from a
 *     fixed table — not "know" them like in 2014.
 */

export const CLASS_COPY = {
  Barbarian: {
    description:
      "Barbarians are fierce warriors driven by primal rage. In 2024 their Rage scales harder at higher tiers, and they pick a Primal Path subclass at level 3. As a martial class they get Weapon Mastery — apply mastery properties (Cleave, Topple, Vex, etc.) to weapons they wield.",
    playstyle:
      "Best for players who want to be the toughest character in combat, dealing massive damage while shrugging off hits. Aggressive, straightforward, and now with Weapon Mastery to keep combat tactically interesting at every level.",
  },
  Bard: {
    description:
      "Bards are versatile performers who weave magic through song and word. In 2024 they prepare spells from a fixed table (no longer 'spells known'); Bardic Inspiration scales d6 → d8 → d10 → d12 across tiers. They pick a Bard College subclass at level 3.",
    playstyle:
      "Ideal for players who enjoy versatility and support. Bards buff allies with Inspiration, debuff enemies, and have access to every problem-solving spell list. Perfect for social encounters and players who like having a tool for every situation.",
  },
  Cleric: {
    description:
      "Clerics are divine spellcasters who channel holy power through their deity. The 2024 Cleric picks a Divine Order at level 1 that grants extra proficiencies or a cantrip, picks a Divine Domain subclass at level 3, and uses Channel Divinity scaling (2 / 3 / 4 uses at 2 / 6 / 18).",
    playstyle:
      "Great for players who want to support their team while staying effective in combat. Clerics heal, buff, smite, and can pivot from frontline to backline as the fight needs.",
  },
  Druid: {
    description:
      "Druids are nature-bound spellcasters who can transform into beasts. The 2024 Druid picks a Primal Order at level 1 (Magician or Warden flavor) and a Druid Circle subclass at level 3. Wild Shape pool scales with class level.",
    playstyle:
      "Perfect for players who love nature themes and want maximum versatility. Wild Shape into a bear, scout as a hawk, or hold the line as a dire wolf. Creative problem-solving rewarded.",
  },
  Fighter: {
    description:
      "Fighters are masters of weapons and armor. In 2024 Fighters get the most Weapon Mastery slots of any class (3 at L1 → 6 by L16), Action Surge twice per short rest at L17, and a Martial Archetype subclass at level 3.",
    playstyle:
      "Best for players who want to focus on combat mastery. Reliable, customizable through Weapon Mastery and fighting style, and effective in any party composition. Great entry class for new D&D players.",
  },
  Monk: {
    description:
      "Monks are martial artists who channel Ki (now called 'Focus Points' in 2024) for supernatural feats. Martial Arts die scales d6 → d8 → d10 → d12. Monks pick a Monastic Tradition subclass at level 3. Note: Monks do NOT get Weapon Mastery in 2024 — their unarmed strikes are their identity.",
    playstyle:
      "Ideal for players who want high mobility and multiple attacks per turn. Tactical, rewarding, and combines unarmed combat with elemental and supernatural abilities.",
  },
  Paladin: {
    description:
      "Paladins are holy warriors bound by sacred oaths. In 2024 they cast spells starting at level 1 (changed from L2), gain Channel Divinity (1 / 2 uses at L3 / L7), and pick a Sacred Oath subclass at level 3. Divine Smite is now a spell, always prepared, and doesn't count against the prep cap.",
    playstyle:
      "Perfect for players who want to be a frontline fighter with healing and smiting on tap. Tough, righteous, and now magical from day one.",
  },
  Ranger: {
    description:
      "Rangers are skilled wilderness warriors who blend martial prowess with nature magic. In 2024 they cast from level 1 (changed from L2) and pick a Ranger Archetype subclass at level 3. Hunter's Mark is always prepared and doesn't count against the prep cap.",
    playstyle:
      "Great for players who want a mix of combat and exploration. Rangers excel at single-target damage with Hunter's Mark, navigate the wilderness expertly, and now start with spells from level 1.",
  },
  Rogue: {
    description:
      "Rogues are stealthy tricksters who strike from the shadows with deadly precision. Sneak Attack dice scale d6 → 10d6 by level 19. Rogues pick a Roguish Archetype subclass at level 3 and get Weapon Mastery slots that grow with class level.",
    playstyle:
      "Best for players who enjoy tactical positioning and big damage numbers. Rewards clever play, careful flanking, and creative skill use. Perfect for stealth, infiltration, and scouting roles.",
  },
  Sorcerer: {
    description:
      "Sorcerers are natural spellcasters born with innate magic. In 2024 they pick a Sorcerous Origin subclass at level 1 (changed from L3 in 2014), gain a 1/min spell-buff toggle (Innate Sorcery) and start metamagic at level 2 with 2 options known.",
    playstyle:
      "Ideal for players who want to be powerful spellcasters with built-in flexibility. Metamagic lets you twin, quicken, and reshape spells. Less spell volume than a Wizard but more spontaneous magical power.",
  },
  Warlock: {
    description:
      "Warlocks gain their power through a pact with an Otherworldly Patron, picked at level 1 in 2024 (Archfey / Celestial / Fiend / Great Old One in the SRD). Pact slots refresh on Short Rest, Eldritch Invocations start at level 1, Mystic Arcanum lets you cast 6th+ level spells once per long rest at L11+.",
    playstyle:
      "Perfect for players who want consistent magical damage with great customization. Eldritch Blast is the strongest cantrip in the game, and Invocations let you reshape your character every short rest.",
  },
  Wizard: {
    description:
      "Wizards study magic from a spellbook. The 2024 Wizard starts with 6 first-level spells in the book, adds 2 per level on level-up, can swap a cantrip on a long rest, and gets Ritual Adept at level 1 — cast any ritual-tagged spell from the spellbook without preparing it. Arcane Tradition subclass at level 3.",
    playstyle:
      "Ideal for players who want the widest spell selection and deep tactical play. The spellbook system means access to every wizard spell — your character's magical breadth grows with your library, not just your class level.",
  },
};

export const SPECIES_COPY = {
  Dragonborn: {
    description:
      "Dragonborn are humanoids with the bearing and breath of dragons. Your draconic ancestry determines your damage type for Breath Weapon and your associated damage resistance. Subspecies (lineage) options pick the ancestry — choose Black/Acid, Blue/Lightning, Brass/Fire, Gold/Fire, Green/Poison, Red/Fire, Silver/Cold, etc.",
  },
  Dwarf: {
    description:
      "Dwarves are stout, hardy folk shaped by stone and tradition. The 2024 Dwarf rolls all subraces into one shared trait set: Darkvision 120 ft, Dwarven Resilience (advantage on poison saves, resistance to poison damage), Dwarven Toughness (extra HP per level), Stonecunning, and Forge Wise tool proficiency.",
  },
  Elf: {
    description:
      "Elves are graceful, long-lived people attuned to magic. Pick an Elven Lineage (subspecies) at level 1 — Drow grants Faerie Fire / Darkness, High Elf grants extra wizard cantrips, Wood Elf grants Longstrider / Pass Without Trace. All elves share Darkvision, Fey Ancestry, Keen Senses, and Trance.",
  },
  Gnome: {
    description:
      "Gnomes are small, inquisitive folk with deep magical heritage. Pick a Gnomish Lineage — Forest Gnome grants Speak with Small Beasts and Minor Illusion; Rock Gnome grants Artificer's Lore and a tinker's ability to build minor mechanical devices.",
  },
  Goliath: {
    description:
      "Goliaths are massive humanoids descended from giants. New in 2024: pick a Giant Ancestry (Cloud, Fire, Frost, Hill, Stone, or Storm) for an additional supernatural trait scaling with Proficiency Bonus uses. All Goliaths share Powerful Build (count as one size larger for carrying) and Large Form at level 5.",
  },
  Halfling: {
    description:
      "Halflings are small, cheerful folk with a surprising knack for survival. The 2024 Halfling shares one trait set across lineages: Lucky (reroll 1s on d20 tests), Brave (advantage on Frightened saves), Halfling Nimbleness (move through space of larger creatures), Naturally Stealthy.",
  },
  Human: {
    description:
      "Humans are the most adaptable species. The 2024 Human gains Resourceful (Heroic Inspiration on every Long Rest), Skillful (one free skill proficiency), and Versatile (a free Origin feat at level 1). The default 'pick a feat / extra skill' baseline that other species build off of.",
  },
  Orc: {
    description:
      "Orcs are fierce, resilient warriors. The 2024 Orc gains Adrenaline Rush (Dash as a Bonus Action, regain HP equal to PB), Darkvision 120 ft, Powerful Build (count as one size larger for carrying), and Relentless Endurance (when reduced to 0 HP, drop to 1 HP instead, PB times per long rest).",
  },
  Tiefling: {
    description:
      "Tieflings carry a fiendish legacy. Pick a Fiendish Legacy (subspecies) — Abyssal grants Poison Spray scaling, Chthonic grants Chill Touch / False Life, Infernal grants Fire Bolt / Hellish Rebuke. All tieflings share Darkvision and Otherworldly Presence (use a thaumaturgy-like cantrip).",
  },
};

export const SUBSPECIES_COPY = {
  // Dragonborn ancestries (10) — keyed by SRD subspecies index.
  "draconic-ancestor-black":   "Acid breath weapon and acid damage resistance. Vintage 'I am hatred and decay' build.",
  "draconic-ancestor-blue":    "Lightning breath weapon and lightning damage resistance. Sharp, predatory, and electric.",
  "draconic-ancestor-brass":   "Fire breath weapon and fire damage resistance. Curious, talkative, and warm-tempered.",
  "draconic-ancestor-bronze":  "Lightning breath weapon and lightning damage resistance. Lawful and inquisitive.",
  "draconic-ancestor-copper":  "Acid breath weapon and acid damage resistance. Mischievous and humor-loving.",
  "draconic-ancestor-gold":    "Fire breath weapon and fire damage resistance. Noble and just.",
  "draconic-ancestor-green":   "Poison breath weapon and poison damage resistance. Cunning and manipulative.",
  "draconic-ancestor-red":     "Fire breath weapon and fire damage resistance. Proud, greedy, and devastatingly hot.",
  "draconic-ancestor-silver":  "Cold breath weapon and cold damage resistance. Helpful and curious about mortals.",
  "draconic-ancestor-white":   "Cold breath weapon and cold damage resistance. Bestial and ruthless in winter.",
  // Elven lineages (3)
  "elven-lineage-drow":        "Faerie Fire and Darkness as 1/long-rest spells. Drow excel at deception and shadow magic.",
  "elven-lineage-high-elf":    "Extra Wizard cantrip; swap and add Wizard spells as you level. The bookworm elf.",
  "elven-lineage-wood-elf":    "Longstrider always active; Pass Without Trace 1/long-rest. The scout / ranger flavor.",
  // Gnomish lineages (2)
  "gnomish-lineage-forest-gnome": "Minor Illusion cantrip; speak with small beasts. The illusionist + critter-whisperer combo.",
  "gnomish-lineage-rock-gnome":   "Artificer's Lore (double Proficiency on History for magic items, technology) and Tinker — build clockwork devices.",
  // Goliath / Giant ancestries (6)
  "giant-ancestry-clouds-jaunt":      "Cloud's Jaunt — teleport short distances PB times per long rest. Get out of melee instantly.",
  "giant-ancestry-fires-burn":        "Fire's Burn — extra fire damage on hits, scaling with class level. Run hot, hit harder.",
  "giant-ancestry-frosts-chill":      "Frost's Chill — slow a creature you damage. Battlefield control on every weapon hit.",
  "giant-ancestry-hills-tumble":      "Hill's Tumble — knock a creature prone on a hit, PB times per long rest.",
  "giant-ancestry-stones-endurance":  "Stone's Endurance — reduce damage taken with a reaction. Tanky on demand.",
  "giant-ancestry-storms-thunder":    "Storm's Thunder — thunder damage to nearby foes when you take damage. Punishment-on-hit aura.",
  // Tiefling legacies (3)
  "fiendish-legacy-abyssal":   "Poison Spray cantrip; Ray of Sickness at L3; Hold Person at L5. The chaos-and-poison line.",
  "fiendish-legacy-chthonic":  "Chill Touch cantrip; False Life at L3; Ray of Enfeeblement at L5. The undead / necromantic line.",
  "fiendish-legacy-infernal":  "Fire Bolt cantrip; Hellish Rebuke at L3; Darkness at L5. The classic devil-blooded line.",
};

export const ALIGNMENTS = [
  { name: "Lawful Good",     description: "Believes in honor, compassion, and helping others while respecting laws and order. Think noble paladins and righteous heroes." },
  { name: "Neutral Good",    description: "Does good because it's right, regardless of laws. Helps others and fights evil pragmatically. Think kind-hearted adventurers." },
  { name: "Chaotic Good",    description: "Values freedom and kindness above all. Does good but dislikes rules and authority. Think Robin Hood or rebel heroes." },
  { name: "Lawful Neutral",  description: "Values order, tradition, and law above all else. Neither particularly good nor evil. Think judges or soldiers following orders." },
  { name: "True Neutral",    description: "Balanced and pragmatic. Doesn't lean toward law or chaos, good or evil. Acts based on situation. Think druids protecting natural balance." },
  { name: "Chaotic Neutral", description: "Values personal freedom above all. Unpredictable and follows their whims. Neither cruel nor caring. Think free spirits and wanderers." },
  { name: "Lawful Evil",     description: "Uses laws and systems to gain power and hurt others methodically. Think tyrants and corrupt officials." },
  { name: "Neutral Evil",    description: "Purely selfish and does whatever benefits them. No loyalty to law or chaos. Think mercenaries and opportunists." },
  { name: "Chaotic Evil",    description: "Destroys and causes suffering for pleasure. Values freedom to do terrible things. Think demons and psychopaths." },
];

export const BACKGROUND_COPY = {
  Acolyte: {
    description:
      "You spent years in service to a temple, learning sacred rites and the lore of your faith. You speak the languages of religion and have an Origin Feat in Magic Initiate (Cleric).",
  },
  Criminal: {
    description:
      "You learned your trade in the back alleys and rooftops of the wider world. You're at home moving silent and unseen, and you've made contacts on the wrong side of the law. Origin Feat: Alert.",
  },
  Sage: {
    description:
      "You spent years studying the multiverse — manuscripts, ancient lore, the natural world. Origin Feat: Magic Initiate (Wizard). The bookworm path.",
  },
  Soldier: {
    description:
      "War was your trade. You learned weapons, armor, and the brutal practicalities of staying alive on a battlefield. Origin Feat: Savage Attacker.",
  },
};

export function backgroundCopy(name) {
  return BACKGROUND_COPY[name] || { description: "" };
}

export const COMPANION_TYPES = {
  Paladin: { name: "Mount",            description: "Your loyal steed that accompanies you in battle." },
  Ranger:  { name: "Animal Companion", description: "Your beast companion that fights alongside you." },
  Warlock: { name: "Patron",           description: "The otherworldly entity you made a pact with." },
  Wizard:  { name: "Familiar",         description: "Your magical companion that serves and scouts for you." },
  Druid:   { name: "Animal Companion", description: "A creature of nature bonded to you." },
};

export function classCopy(className) {
  return CLASS_COPY[className] || { description: "", playstyle: "" };
}

export function speciesCopy(speciesName) {
  return SPECIES_COPY[speciesName] || { description: "" };
}

export function subspeciesCopy(subspeciesIndex) {
  return SUBSPECIES_COPY[subspeciesIndex] || "";
}
