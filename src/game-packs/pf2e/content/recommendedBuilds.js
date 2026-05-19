// Recommended new-player builds per class. Each section can be
// auto-applied via the "Use Recommended" button (B.2). When a player
// overrides a single auto-filled pick, only that slot loses its ★
// badge — sibling picks keep theirs.
//
// Note on slugs: skill / feat / spell entries reference *name-form
// slugs* (kebab-case of the entity's display name) so the picker can
// match them against either the entity's `slug` field or
// `name.toLowerCase().replace(/\s+/g, '-')`. This sidesteps the
// Foundry-random-id problem until the slug-resolver lands.

export const RECOMMENDED_BUILDS = {
  fighter: {
    rationale: "Frontline melee. Strength swings hard, Constitution keeps you up, Dexterity for AC and initiative, Wisdom for Perception and Will saves.",
    boosts: { free: ['str', 'con', 'dex', 'wis'] },
    skills: ['athletics', 'intimidation'],
    classFeats: { 1: ['power-attack'] },
    spells: null,
    startingItems: ['longsword', 'steel-shield', 'chain-mail', 'crossbow-20-bolts', 'adventurers-pack', 'healing-potion-minor'],
    reasoning: {
      boosts: "Strength powers your melee damage and your Athletics maneuvers (Grapple, Trip, Shove). Constitution keeps you upright through hits. Dexterity bumps AC and Initiative. Wisdom backstops Perception and your Will save — Fighters are trained Will, so the +1 mod matters.",
      skills: "Athletics is the Fighter staple: any Grapple/Trip/Shove uses it, and you'll need it against bigger creatures. Intimidation pairs with Strength for Demoralize — a free action-tax on enemies once you close.",
      classFeats: "Power Attack — spend 2 actions to make one strike with bonus damage and a -5 MAP for the next attack. Bread-and-butter when you've burned your iterative attacks already, or against a target that needs to drop now.",
      spells: null,
      startingItems: "Longsword for the d8 + reach-when-two-handed flex. Steel Shield for Raise-a-Shield reactions. Chain Mail until you can afford something better. Crossbow gives you ranged options without burning a Strength boost on ranged proficiency.",
    },
  },
  champion: {
    rationale: "Tanky frontliner. Strength for damage, Constitution for HP, Charisma for divine abilities and reactions, Wisdom for Perception.",
    boosts: { free: ['str', 'con', 'cha', 'wis'] },
    skills: ['religion', 'athletics'],
    classFeats: { 1: ['ranged-reprisal'] },
    spells: null,
    startingItems: ['longsword', 'steel-shield', 'chain-mail', 'religious-symbol-wooden', 'javelin', 'adventurers-pack'],
    reasoning: {
      boosts: "Strength swings your weapon and lets you keep up your shield. Charisma is the Champion's spell DC + scales your Lay on Hands, so it matters even on a non-caster build. Constitution + Wisdom keep you upright and aware on the front line.",
      skills: "Religion is doctrinal — you'll Recall Knowledge about divine creatures and undead constantly. Athletics for Bulwark-style maneuvers when guarding allies.",
      classFeats: "Ranged Reprisal — your Champion's Reaction works against ranged attackers within 30 feet, not just melee. Solves the classic 'archer is melting our wizard from across the map' problem.",
      spells: null,
      startingItems: "Longsword + Steel Shield = the canonical Champion silhouette. Chain Mail because medium armor is your bread and butter. Holy symbol unlocks Divine focus spells from your cause. Javelin gives ranged options before Ranged Reprisal becomes online.",
    },
  },
  cleric: {
    rationale: "Divine caster. Wisdom drives your spells. Constitution for survival. Strength or Dexterity for incidental melee/ranged.",
    boosts: { free: ['wis', 'con', 'dex', 'cha'] },
    skills: ['religion', 'medicine'],
    classFeats: { 1: ['domain-initiate'] },
    spells: {
      cantrips: ['guidance', 'shield', 'light', 'stabilize', 'detect-magic'],
      first: ['heal', 'bless'],
    },
    startingItems: ['mace', 'wooden-shield', 'scale-mail', 'religious-symbol-wooden', 'healers-toolkit', 'adventurers-pack'],
    reasoning: {
      boosts: "Wisdom IS your spell DC and your Heal effectiveness — every +1 matters. Constitution to stay concentrating through hits. Dexterity for AC. Charisma backs up your Cha-based skills if you're the party face.",
      skills: "Religion for divine knowledge and identifying spells. Medicine to back up your divine healing with mundane Treat Wounds during downtime.",
      classFeats: "Domain Initiate — pick a focus spell from one of your deity's domains. Gives you a Refocus-able power you can spam through a fight without burning slots.",
      spells: "Guidance: free +1 to one check per minute on someone. Shield: cantrip-tier AC boost on reaction. Light: dark-clearing utility. Stabilize: save someone dying without burning a slot. Detect Magic: identify magical effects. Heal at rank 1: AoE healing in a 30-ft burst, the Cleric's signature. Bless: party-wide attack-roll buff.",
      startingItems: "Mace is your deity's typical Favored Weapon; if your deity favors something else, swap. Wooden Shield + Scale Mail for AC. Healer's Toolkit for out-of-combat Treat Wounds.",
    },
  },
  ranger: {
    rationale: "Versatile martial. Dexterity for bows, Strength if going melee, Constitution for HP, Wisdom for Perception and Nature.",
    boosts: { free: ['dex', 'wis', 'con', 'str'] },
    skills: ['nature', 'survival', 'stealth'],
    classFeats: { 1: ['hunted-shot'] },
    spells: null,
    startingItems: ['longbow-20-arrows', 'shortsword', 'studded-leather-armor', 'climbing-kit', 'rope-50-ft', 'adventurers-pack'],
    reasoning: {
      boosts: "Dexterity for ranged attacks and AC. Wisdom backs Perception (yours is high) and Nature. Constitution for HP. Strength as a fourth if you want melee options.",
      skills: "Nature + Survival are core Ranger flavor — track prey, identify creatures, navigate the wilds. Stealth pairs with Hunt Prey for ambushes — the first attack often crits when you're hidden.",
      classFeats: "Hunted Shot — make two ranged Strikes against your hunted prey for the cost of one action. Highest action economy at level 1 for any ranged Ranger. Trades the second shot's accuracy for tempo.",
      spells: null,
      startingItems: "Longbow + 20 arrows: your primary weapon. Shortsword for when something closes. Studded Leather for AC without slowing Stealth. Climbing Kit and Rope for the wilderness work you'll be doing.",
    },
  },
  rogue: {
    rationale: "Skills and mobility. Dexterity for everything, Charisma or Intelligence depending on racket, Constitution for HP.",
    boosts: { free: ['dex', 'cha', 'con', 'wis'] },
    skills: ['stealth', 'thievery', 'acrobatics', 'society'],
    classFeats: { 1: ['nimble-dodge'] },
    spells: null,
    startingItems: ['rapier', 'shortbow-20-arrows', 'leather-armor', 'thieves-toolkit', 'dagger', 'adventurers-pack'],
    reasoning: {
      boosts: "Dexterity is the Rogue universal — AC, Reflex, Stealth, finesse weapons, and (for Thief racket) damage. Charisma if you're playing Scoundrel; Intelligence if Mastermind. Constitution to survive when sneak attacks miss.",
      skills: "Stealth + Thievery are the headline Rogue skills. Acrobatics for tumbling through enemy spaces (Tumble Through is a great level-1 trick). Society to pair with Mastermind's Recall Knowledge → off-guard combo.",
      classFeats: "Nimble Dodge — reaction +2 circumstance bonus to AC against one attack. Trades nothing for the bonus; just a free defensive boost once per round.",
      spells: null,
      startingItems: "Rapier for finesse + d6 piercing. Shortbow for ranged sneak attacks. Leather Armor for Stealth. Thieves' Toolkit unlocks Pick Locks and Disable Devices.",
    },
  },
  barbarian: {
    rationale: "Damage and durability. Strength swings, Constitution survives, Dexterity for AC, Wisdom for Will saves.",
    boosts: { free: ['str', 'con', 'dex', 'wis'] },
    skills: ['athletics', 'intimidation'],
    classFeats: { 1: ['raging-intimidation'] },
    spells: null,
    startingItems: ['greataxe', 'hide-armor', 'javelin', 'adventurers-pack', 'rations-1-week'],
    reasoning: {
      boosts: "Strength is the Barbarian's everything — damage, Athletics, weapon swings during Rage. Constitution because Barbarian HP is the highest in the game; you want the multiplier on a high base. Dexterity for AC since you can't wear heavy armor and Rage. Wisdom for Will saves (mind effects shut your damage down).",
      skills: "Athletics for Grapple/Trip during Rage (still works even though Rage limits casting). Intimidation pairs with Raging Intimidation — Demoralize as a free action while raging.",
      classFeats: "Raging Intimidation — Demoralize becomes a free action while you Rage and gain its skill bonus from Intimidation. Lockdown opener: rage in, demoralize the boss to off-guard, then swing.",
      spells: null,
      startingItems: "Greataxe for d12 damage. Hide Armor (medium, since Barbarian Rage forbids armor heavier than medium). Javelin for the rare opening turn where you need a ranged attack before charging.",
    },
  },
  bard: {
    rationale: "Occult caster and support. Charisma drives spells. Dexterity for AC. Constitution to stay up while concentrating.",
    boosts: { free: ['cha', 'dex', 'con', 'wis'] },
    skills: ['performance', 'occultism', 'diplomacy'],
    classFeats: { 1: ['lingering-composition'] },
    spells: {
      cantrips: ['inspire-courage', 'daze', 'light', 'shield', 'detect-magic'],
      first: ['fear', 'soothe'],
    },
    startingItems: ['rapier', 'leather-armor', 'musical-instrument-handheld', 'writing-set', 'adventurers-pack'],
    reasoning: {
      boosts: "Charisma is your spell DC and the source of Inspire Courage's +1. Dexterity for AC and Reflex. Constitution to keep concentrating through hits. Wisdom for Perception backup.",
      skills: "Performance is the Bard signature — Inspire Courage scales with it and you'll use it to schmooze NPCs constantly. Occultism for spell identification. Diplomacy for the party-face role most Bards default into.",
      classFeats: "Lingering Composition — extend Inspire Courage to last 2 or 3 rounds with one extra action, instead of having to recast it every turn. Frees up your action economy for actual damage spells.",
      spells: "Inspire Courage: the cantrip you'll cast every fight; +1 to attack and damage for every ally in earshot, scales to +2 then +3 by level 7/15. Daze: low-damage cantrip with a stunning rider. Shield/Light/Detect Magic: standard utility. Fear: rank-1 frightened, weakens save DCs party-wide. Soothe: healing without divine magic.",
      startingItems: "Rapier for finesse + Cha-driven Bards. Leather Armor for AC + Stealth. A musical instrument (your spellcasting focus). Writing Set for composing and downtime work.",
    },
  },
  druid: {
    rationale: "Primal caster. Wisdom drives spells. Constitution for survival. Dexterity for AC.",
    boosts: { free: ['wis', 'con', 'dex', 'str'] },
    skills: ['nature', 'survival'],
    classFeats: { 1: ['order-explorer'] },
    spells: {
      cantrips: ['produce-flame', 'light', 'detect-magic', 'shield', 'stabilize'],
      first: ['heal', 'soothe'],
    },
    startingItems: ['scimitar', 'sling-20-bullets', 'leather-armor', 'material-component-pouch', 'adventurers-pack'],
    reasoning: {
      boosts: "Wisdom is your spell DC AND your Perception — Druid is one of the few classes that doubles up there. Constitution to stay concentrating. Dexterity for AC since you can't wear metal armor (per druidic anathema). Strength helps if you go Animal Order or Untamed Order and want to wrestle.",
      skills: "Nature lets you identify primal threats and Recall Knowledge on beasts/plants/elementals. Survival for Subsist and tracking. Both pair with Wisdom (your key ability).",
      classFeats: "Order Explorer — gain a feat from another order's list. Lets you splash one signature ability without committing to a multi-order build.",
      spells: "Produce Flame: ranged primal cantrip, your bread-and-butter damage. Light/Detect Magic: utility. Shield: reaction AC. Stabilize: save dying allies. Heal at rank 1: 30-ft burst healing. Soothe: emotion + healing.",
      startingItems: "Scimitar is the iconic Druid weapon (d6 slashing, finesse). Sling for ranged + cheap reload. Leather Armor (NO METAL — druid anathema). Material component pouch for casting.",
    },
  },
  sorcerer: {
    rationale: "Spontaneous caster. Charisma drives spells. Dexterity for AC. Constitution for staying up.",
    boosts: { free: ['cha', 'dex', 'con', 'wis'] },
    skills: ['arcana', 'deception'],
    classFeats: { 1: ['counterspell'] },
    spells: {
      cantrips: ['daze', 'light', 'detect-magic', 'shield', 'prestidigitation'],
      first: ['magic-missile', 'fear'],
    },
    startingItems: ['crossbow-20-bolts', 'dagger', 'material-component-pouch', 'adventurers-pack', 'healing-potion-minor'],
    reasoning: {
      boosts: "Charisma is your spell DC — non-negotiable. Dexterity for AC. Constitution for survival and concentration. Wisdom for Perception backup since Sorcerers aren't trained Perception by default.",
      skills: "Arcana for spell identification (most Sorcerer bloodlines key off arcane). Deception fits the trickster fantasy and pairs with Charisma.",
      classFeats: "Counterspell — react to an opponent's cast by spending one of your own spell slots of the same rank. Best used on critical enemy spells (Slow, Fear, AoE damage); your spell slots are precious, so save it for big moments.",
      spells: "Magic Missile: auto-hit force damage, scales by spending more actions in the same cast. Fear: rank-1 mental, weakens save DCs. Daze: scaling damage cantrip with a save. Shield: reaction AC, refreshes per round. Light/Prestidigitation: utility cantrips you'll lean on out of combat.",
      startingItems: "Crossbow for the rare turn you need to do mundane damage. Dagger as a backup. Material component pouch. Healing Potion for the inevitable 'I missed every spell and now I'm in melee' turn.",
    },
  },
  wizard: {
    rationale: "Prepared arcane caster. Intelligence drives spells. Constitution for staying up. Dexterity for AC.",
    boosts: { free: ['int', 'con', 'dex', 'wis'] },
    skills: ['arcana', 'society'],
    classFeats: { 1: ['reach-spell'] },
    spells: {
      cantrips: ['daze', 'light', 'detect-magic', 'shield', 'prestidigitation'],
      first: ['magic-missile', 'fear'],
    },
    startingItems: ['quarterstaff', 'dagger', 'spellbook-blank', 'writing-set', 'material-component-pouch', 'adventurers-pack'],
    reasoning: {
      boosts: "Intelligence is your spell DC and your skills budget — Wizards get bonus trained skills from a high INT. Constitution to concentrate. Dexterity for AC. Wisdom for Will saves (Wizards are trained, not expert).",
      skills: "Arcana to identify magic and Recall Knowledge on spells/constructs. Society for the cosmopolitan polymath fantasy + bonus languages from INT.",
      classFeats: "Reach Spell — add 30 ft to a touch spell's range, or 30 ft to any other spell. Lets you safely cast from second rank instead of getting interrupted.",
      spells: "Magic Missile: reliable auto-hit force damage. Fear: rank-1 control. Daze: cantrip damage with a Will save rider. Shield: reaction AC, the Wizard's mainstay defense. Light + Prestidigitation: utility you'll cast constantly.",
      startingItems: "Quarterstaff in case something closes (and as a focus). Dagger for emergencies. Spellbook (blank) — your most important item; it holds every spell you can prep. Writing Set for copying scrolls. Material component pouch.",
    },
  },
  witch: {
    rationale: "Patron-granted prepared caster. Intelligence drives spell DC. Constitution keeps you alive concentrating. Dexterity for initiative and AC.",
    boosts: { free: ['int', 'con', 'dex', 'wis'] },
    skills: ['occultism', 'nature'],
    classFeats: { 1: ['cauldron'] },
    spells: {
      cantrips: ['daze', 'light', 'detect-magic', 'shield', 'prestidigitation'],
      first: ['fear', 'soothe'],
    },
    startingItems: ['dagger', 'sling-20-bullets', 'material-component-pouch', 'writing-set', 'adventurers-pack'],
    reasoning: {
      boosts: "Intelligence is your spell DC, hex DC, and skill budget. Constitution because you'll be concentrating on hexes in melee range. Dexterity for AC. Wisdom for Will saves.",
      skills: "Occultism is the Witch default — your patron is occult-flavored (mostly), and you'll Recall Knowledge on spirits, fey, and supernatural creatures. Nature pairs with the primal-patron path (Wilding Steward, Silence in Snow, Winter).",
      classFeats: "Cauldron — gain the Brew Potion skill feat for free and craft healing/utility potions during downtime. Niche but unique, and the action economy is excellent (no daily prep cost).",
      spells: "Daze: cantrip with a Will rider. Shield: reaction AC. Light + Detect Magic + Prestidigitation: utility. Fear: rank-1 mental control. Soothe: healing without burning a divine slot — Witches don't get heal, so soothe is your healer fallback.",
      startingItems: "Dagger + sling as your mundane backups. Material component pouch and writing set for casting. Your familiar handles spellbook duty for you, so no spellbook in the kit.",
    },
  },
  monk: {
    rationale: "Mobile martial. Strength or Dexterity for unarmed strikes. Constitution for HP. Wisdom for Perception and AC.",
    boosts: { free: ['str', 'dex', 'wis', 'con'] },
    skills: ['athletics', 'acrobatics'],
    classFeats: { 1: ['ki-strike'] },
    spells: null,
    startingItems: ['quarterstaff', 'shortbow-20-arrows', 'climbing-kit', 'rope-50-ft', 'adventurers-pack'],
    reasoning: {
      boosts: "Strength for unarmed damage, OR Dexterity if you want to lead with finesse strikes. Wisdom is unique to Monk — adds to AC when unarmored, plus Perception. Constitution for HP.",
      skills: "Athletics is the Monk core — most martial Monk feats (Flurry of Blows, Trip, Grapple) key off it. Acrobatics for Tumble Through (move freely through enemy spaces — the Monk's signature mobility).",
      classFeats: "Ki Strike — spend a focus point to make an extra unarmed strike at a -5 MAP penalty AND add force/positive/negative damage. The Monk's first 'spell' — saves itself with Refocus.",
      spells: null,
      startingItems: "Quarterstaff if you want a weapon backup (still a Monk weapon). Shortbow for range. Climbing Kit + Rope because Monk movement options are the headline class feature.",
    },
  },
  // Remaining classes from the SRD import — boost spread + a starter
  // skill set. Class-feat and spell defaults stay TODO until the
  // catalog joins finalize for each one; the recommended button shows
  // for the sections that are filled.
  alchemist: {
    rationale: "Bomb thrower. Intelligence drives DC, Dexterity for ranged attacks and AC, Constitution for HP, Wisdom for Perception.",
    boosts: { free: ['int', 'dex', 'con', 'wis'] },
    skills: ['crafting', 'medicine'],
    classFeats: null,
    spells: null,
  },
  investigator: {
    rationale: "INT-based skill specialist. Intelligence drives Devise a Stratagem, Dexterity for AC, Constitution for HP.",
    boosts: { free: ['int', 'dex', 'con', 'wis'] },
    skills: ['society', 'stealth', 'thievery'],
    classFeats: null,
    spells: null,
  },
  swashbuckler: {
    rationale: "Charisma-driven martial. Dexterity for AC and attacks, Charisma for panache and class DC, Constitution for HP.",
    boosts: { free: ['dex', 'cha', 'con', 'wis'] },
    skills: ['acrobatics', 'performance'],
    classFeats: null,
    spells: null,
  },
  magus: {
    rationale: "Spellstrike hybrid. Strength or Dexterity for weapon, Intelligence for spells, Constitution for HP.",
    boosts: { free: ['str', 'int', 'con', 'dex'] },
    skills: ['arcana', 'athletics'],
    classFeats: null,
    spells: {
      cantrips: ['shield', 'detect-magic', 'light', 'prestidigitation', 'electric-arc'],
      first: ['magic-missile', 'fear'],
    },
  },
  inventor: {
    rationale: "Innovator. Intelligence for DC, Dexterity for AC, Constitution for HP and Overdrive.",
    boosts: { free: ['int', 'dex', 'con', 'str'] },
    skills: ['crafting', 'society'],
    classFeats: null,
    spells: null,
  },
  gunslinger: {
    rationale: "Firearms specialist. Dexterity for everything, Constitution for HP, Wisdom for Perception.",
    boosts: { free: ['dex', 'con', 'wis', 'str'] },
    skills: ['acrobatics', 'stealth'],
    classFeats: null,
    spells: null,
  },
  kineticist: {
    rationale: "Elemental Blast specialist. Constitution drives Impulse DC. Dexterity for AC, Wisdom for Perception.",
    boosts: { free: ['con', 'dex', 'wis', 'str'] },
    skills: ['nature', 'athletics'],
    classFeats: null,
    spells: null,
  },
  psychic: {
    rationale: "Spontaneous occult caster with amped cantrips. Intelligence or Charisma drives DC, Constitution for staying up.",
    boosts: { free: ['int', 'con', 'dex', 'wis'] },
    skills: ['occultism', 'arcana'],
    classFeats: null,
    spells: {
      cantrips: ['daze', 'detect-magic', 'light', 'shield', 'prestidigitation'],
      first: ['fear', 'soothe'],
    },
  },
  thaumaturge: {
    rationale: "Esoteric implements. Charisma drives DC, Dexterity for AC, Constitution for HP.",
    boosts: { free: ['cha', 'dex', 'con', 'wis'] },
    skills: ['occultism', 'religion'],
    classFeats: null,
    spells: null,
  },
  oracle: {
    rationale: "Spontaneous divine caster. Charisma drives DC, Constitution for staying up, Dexterity for AC.",
    boosts: { free: ['cha', 'con', 'dex', 'wis'] },
    skills: ['religion', 'medicine'],
    classFeats: null,
    spells: {
      cantrips: ['guidance', 'shield', 'light', 'stabilize', 'detect-magic'],
      first: ['heal', 'bless'],
    },
  },
  animist: {
    rationale: "Primal vessel caster. Wisdom drives spells. Constitution for HP, Charisma for diplomacy.",
    boosts: { free: ['wis', 'con', 'cha', 'dex'] },
    skills: ['nature', 'religion'],
    classFeats: null,
    spells: {
      cantrips: ['guidance', 'produce-flame', 'light', 'shield', 'stabilize'],
      first: ['heal', 'soothe'],
    },
  },
  summoner: {
    rationale: "You + your eidolon. Charisma drives the bond, Constitution for shared HP, Dexterity for AC.",
    boosts: { free: ['cha', 'con', 'dex', 'wis'] },
    skills: ['arcana', 'nature'],
    classFeats: null,
    spells: {
      cantrips: ['shield', 'light', 'detect-magic', 'prestidigitation', 'guidance'],
      first: ['fear', 'soothe'],
    },
  },
  exemplar: {
    rationale: "Mythic martial. Strength for melee, Constitution for HP, Charisma for divine resonance.",
    boosts: { free: ['str', 'con', 'cha', 'dex'] },
    skills: ['athletics', 'religion'],
    classFeats: null,
    spells: null,
  },
  commander: {
    rationale: "Tactical leader. Strength or Dexterity for personal weapon, Intelligence for tactics, Constitution for HP.",
    boosts: { free: ['str', 'int', 'con', 'wis'] },
    skills: ['society', 'warfare-lore'],
    classFeats: null,
    spells: null,
  },
};

export function getRecommended(classSlug) {
  return RECOMMENDED_BUILDS[classSlug] || null;
}

// Normalize a display name to the kebab-case slug form used in
// `startingItems` so the shop can match its entries against the
// recommendation list without forcing a separate slug field on each
// catalog item.
export function itemSlug(displayName) {
  return String(displayName || '')
    .toLowerCase()
    .trim()
    // strip parentheticals before slugifying — "(minor)" / "(50 ft)"
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/[+×]/g, '-')
    .replace(/[\s_,/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Is `item` recommended for the chosen class? Two paths:
 *   1. Direct slug match against `startingItems` in the class's
 *      recommendation entry.
 *   2. Weapon-proficiency backstop: if the item is a weapon and the
 *      class has at least Trained in that weapon category, count it
 *      as "viable" — broader than the curated list but useful for
 *      classes without a curated entry.
 */
export function isRecommendedForClass(item, classData) {
  if (!item || !classData) return false;
  const rec = getRecommended(classData.slug);
  if (rec?.startingItems?.length) {
    const slug = itemSlug(item.name);
    if (rec.startingItems.includes(slug)) return true;
  }
  // Backstop: weapon category proficiency. The catalog doesn't carry
  // a `category` field today, so this only fires once item records
  // gain one (post-equipment-import wiring).
  const category = item.category || item.weaponCategory;
  if (category) {
    const profRank = classData.proficiencies?.weapons?.[category] ?? 0;
    if (profRank >= 1) return true;
  }
  return false;
}
