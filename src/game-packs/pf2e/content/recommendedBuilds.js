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
  },
  champion: {
    rationale: "Tanky frontliner. Strength for damage, Constitution for HP, Charisma for divine abilities and reactions, Wisdom for Perception.",
    boosts: { free: ['str', 'con', 'cha', 'wis'] },
    skills: ['religion', 'athletics'],
    classFeats: { 1: ['ranged-reprisal'] },
    spells: null,
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
  },
  ranger: {
    rationale: "Versatile martial. Dexterity for bows, Strength if going melee, Constitution for HP, Wisdom for Perception and Nature.",
    boosts: { free: ['dex', 'wis', 'con', 'str'] },
    skills: ['nature', 'survival', 'stealth'],
    classFeats: { 1: ['hunted-shot'] },
    spells: null,
  },
  rogue: {
    rationale: "Skills and mobility. Dexterity for everything, Charisma or Intelligence depending on racket, Constitution for HP.",
    boosts: { free: ['dex', 'cha', 'con', 'wis'] },
    skills: ['stealth', 'thievery', 'acrobatics', 'society'],
    classFeats: { 1: ['nimble-dodge'] },
    spells: null,
  },
  barbarian: {
    rationale: "Damage and durability. Strength swings, Constitution survives, Dexterity for AC, Wisdom for Will saves.",
    boosts: { free: ['str', 'con', 'dex', 'wis'] },
    skills: ['athletics', 'intimidation'],
    classFeats: { 1: ['raging-intimidation'] },
    spells: null,
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
  },
  monk: {
    rationale: "Mobile martial. Strength or Dexterity for unarmed strikes. Constitution for HP. Wisdom for Perception and AC.",
    boosts: { free: ['str', 'dex', 'wis', 'con'] },
    skills: ['athletics', 'acrobatics'],
    classFeats: { 1: ['ki-strike'] },
    spells: null,
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
