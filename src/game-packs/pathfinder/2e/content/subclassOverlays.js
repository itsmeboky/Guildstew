// Per-class subclass overlays — ORC content only.
//
// Phase K extends the original Phase D.4 schema beyond Rogue rackets
// to cover every ORC-cleared class with a subclass concept (Cleric,
// Druid, Witch, Wizard, Sorcerer, Bard, Oracle, Investigator,
// Champion, Barbarian, Ranger, Swashbuckler, Alchemist, Animist,
// Exemplar, Commander). OGL-only classes (Magus, Summoner,
// Gunslinger, Inventor, Psychic, Thaumaturge, Kineticist) are
// deferred until those books are Remastered into ORC.
//
// Foundry encodes subclass mechanics as rule elements on class-
// feature items; the rule-element parser is its own multi-session
// task. Until that lands, this file is the source of truth for the
// mechanical effects of each subclass pick.
//
// Schema:
// {
//   name: string,                          // Display name
//   slug: string,                          // Canonical key (matches the lookup key)
//   licenseSource: 'orc-pc1' | 'orc-pc2'   // Provenance — audited by K.8 script
//                | 'orc-hotw' | 'orc-woi',
//
//   // Mechanical deltas — merged onto the base class's proficiencies
//   // by applySubclassOverlay()/mergeOverlay(). Shallow leaf-replace.
//   proficiencyDeltas: {
//     skills?:       { [skillSlug]: 'trained'|'expert'|... | profRank },
//     weapons?:      { [category]:  'trained'|'expert'|... | profRank },
//     armor?:        { [category]:  'trained'|'expert'|... | profRank },
//     saves?:        { fortitude?, reflex?, will? },
//     perception?:   tier,
//     classDC?:      tier,
//     spellcasting?: tier,
//   },
//
//   bonusSkills?: string[],                // Surfaced as auto chips
//   keyAbility?: 'Strength'|...|'Charisma',
//
//   // Caster-shape fields — only set on subclasses that change the
//   // base class's casting story (sorcerer bloodlines, witch patrons).
//   spellTradition?:   'arcane'|'divine'|'occult'|'primal',
//   spellPreparation?: 'prepared'|'spontaneous',
//
//   // Mechanical grants — feature slugs the subclass automatically
//   // grants at level 1. UI surfaces these for player awareness;
//   // resolving them against the feats/features catalog is the
//   // rule-element parser's job.
//   grants?: string[],
//
//   // Caster grants — cantrips, leveled bloodline spells, focus spells.
//   grantedSpells?: {
//     cantrips?: string[],
//     bloodline?: { [rank]: string[] },
//     focus?:    string[],
//   },
//
//   // Class-specific flags
//   grantedFamiliar?:        boolean,      // Witch patrons, some Wizard theses
//   grantedAnimalCompanion?: boolean,      // Druid animal-order, Ranger AC edge
//
//   // Narrative fields. `tenets` and `anathema` come from imported
//   // class-feature data when shown in the UI — the strings here are
//   // mechanical handles, not Paizo prose.
//   sanctification?: 'holy' | 'unholy' | 'unsanctified',
//   tenets?:         string[],
//   anathema?:       string[],
//   curse?:          { name: string },
//   instinctAbility?: string,
//
//   notes?: string,
// }
//
// IMPORTANT: description prose is NOT carried in this file. The UI
// resolves the user-facing description from
// CLASS_DETAILS[classSlug].subclasses.options[].desc (curated in
// data/class-details.json) so the overlay can stay mechanical and
// rule-element-parser-shaped without duplicating Paizo text.

export const SUBCLASS_OVERLAYS = {
  rogue: {
    thief: {
      name: 'Thief',
      slug: 'thief',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        // No proficiency changes — racket grant is mechanical
        // (Dex-to-damage with finesse), surfaced via `notes`.
      },
      bonusSkills: ['thievery'],
      keyAbility: 'Dexterity',
      notes: "Use your Dexterity modifier instead of Strength for melee damage with finesse and agile weapons.",
    },
    scoundrel: {
      name: 'Scoundrel',
      slug: 'scoundrel',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {},
      bonusSkills: ['deception', 'diplomacy'],
      keyAbility: 'Charisma',
      notes: "Charm-focused. A successful Feint makes the target off-guard for a full round (instead of just one Strike).",
    },
    mastermind: {
      name: 'Mastermind',
      slug: 'mastermind',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {},
      bonusSkills: ['society'],
      keyAbility: 'Intelligence',
      notes: "After Recall Knowledge on a creature, it's off-guard against your sneak attack until the start of your next turn.",
    },
    ruffian: {
      name: 'Ruffian',
      slug: 'ruffian',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        armor: { medium: 'trained' },
        weapons: { martial: 'trained' },
      },
      bonusSkills: ['intimidation'],
      keyAbility: 'Strength',
      notes: "Sneak attack with simple weapons (d8 or less) and martial weapons (d6 or less, agile/finesse only). Brutal hits make targets flat-footed when criticalled.",
    },
    'eldritch-trickster': {
      name: 'Eldritch Trickster',
      slug: 'eldritch-trickster',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {},
      bonusSkills: [],
      keyAbility: 'Charisma',
      notes: "Multiclass caster dedication available at 2nd level via the Eldritch Trickster archetype.",
    },
  },

  // Cleric doctrines — ORC Player Core 1.
  //
  // Canonical Foundry filenames are `cloistered-cleric.json` and
  // `warpriest.json`. We key these overlays by the short `cloistered`
  // / `warpriest` stems that already exist as option ids in
  // class-details.json so persisted characters keep resolving without
  // a migration. The K.8 audit script accepts either.
  cleric: {
    cloistered: {
      name: 'Cloistered Cleric',
      slug: 'cloistered',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        weapons: { simple: 'trained', favoredWeapon: 'trained' },
        spellcasting: 'trained',
      },
      keyAbility: 'Wisdom',
      spellTradition: 'divine',
      spellPreparation: 'prepared',
      grants: ['domain-initiate'],
      notes: "Full spellcaster focus. Better spell progression and access to expert proficiency in spellcasting earlier.",
    },
    warpriest: {
      name: 'Warpriest',
      slug: 'warpriest',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        weapons: { simple: 'trained', martial: 'trained', favoredWeapon: 'trained' },
        armor:   { medium: 'trained' },
        saves:   { fortitude: 'expert' },
        spellcasting: 'trained',
      },
      keyAbility: 'Wisdom',
      spellTradition: 'divine',
      spellPreparation: 'prepared',
      grants: ['domain-initiate', 'shield-block'],
      notes: "Martial-leaning. Stronger Fortitude, medium armor, and martial weapons at the cost of slower spell-rank progression.",
    },
  },

  // Druid orders — ORC Player Core 1. Four Remaster orders; the
  // pre-Remaster Wild Order was rebuilt and renamed to Untamed Order
  // in PC1. Order slugs match Foundry's `class-features/*.json`
  // filenames (animal-order, leaf-order, storm-order, untamed-order).
  druid: {
    'animal-order': {
      name: 'Animal Order',
      slug: 'animal-order',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        skills: { athletics: 'trained' },
      },
      bonusSkills: ['athletics'],
      keyAbility: 'Wisdom',
      spellTradition: 'primal',
      spellPreparation: 'prepared',
      grants: ['animal-companion', 'animal-order-spell'],
      grantedAnimalCompanion: true,
      grantedSpells: { focus: ['heal-animal'] },
      notes: 'Animal companion granted at level 1 — pick its type via the standard companion list.',
    },
    'leaf-order': {
      name: 'Leaf Order',
      slug: 'leaf-order',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        skills: { diplomacy: 'trained' },
      },
      bonusSkills: ['diplomacy'],
      keyAbility: 'Wisdom',
      spellTradition: 'primal',
      spellPreparation: 'prepared',
      grants: ['leshy-familiar', 'leaf-order-spell'],
      grantedFamiliar: true,
      grantedSpells: { focus: ['goodberry'] },
      notes: 'Leshy familiar granted at level 1 — a sapient plant companion.',
    },
    'storm-order': {
      name: 'Storm Order',
      slug: 'storm-order',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        skills: { acrobatics: 'trained' },
      },
      bonusSkills: ['acrobatics'],
      keyAbility: 'Wisdom',
      spellTradition: 'primal',
      spellPreparation: 'prepared',
      grants: ['storm-order-spell'],
      grantedSpells: { focus: ['tempest-surge'] },
      notes: 'Long-range elemental damage focus; Tempest Surge stacks reach with weather control.',
    },
    'untamed-order': {
      name: 'Untamed Order',
      slug: 'untamed-order',
      licenseSource: 'orc-pc1',
      proficiencyDeltas: {
        skills: { nature: 'trained' },
      },
      bonusSkills: ['nature'],
      keyAbility: 'Wisdom',
      spellTradition: 'primal',
      spellPreparation: 'prepared',
      grants: ['untamed-form', 'untamed-order-spell'],
      grantedSpells: { focus: ['untamed-form'] },
      notes: 'Shapeshifter path. Untamed Form replaces the pre-Remaster Wild Shape with rebalanced, level-scaling battle forms.',
    },
  },
};

/**
 * Look up an overlay for a class+subclass pair. Returns null when
 * either the class or subclass isn't covered yet — caller treats null
 * as "base proficiencies only, no extras".
 */
export function getSubclassOverlay(classSlug, subclassId) {
  if (!classSlug || !subclassId) return null;
  return SUBCLASS_OVERLAYS[classSlug]?.[subclassId] || null;
}

/**
 * Merge a subclass's proficiency deltas onto a base class
 * proficiency block. Deltas are shallow-replaced at the leaf level
 * (`weapons.simple = 'trained'` wins over the base `'untrained'`).
 * Returns a new object — does not mutate `base`.
 */
export function applySubclassOverlay(base, overlay) {
  if (!overlay?.proficiencyDeltas) return base;
  const out = { ...base };
  for (const [group, fields] of Object.entries(overlay.proficiencyDeltas)) {
    out[group] = { ...(base[group] || {}), ...fields };
  }
  return out;
}

// Alias kept for the Phase K family code added below — `mergeOverlay`
// reads more naturally than `applySubclassOverlay` in K.2's
// Wizard-style two-axis chains (`mergeOverlay(mergeOverlay(base,
// school), thesis)`). Same semantics, no double application of the
// same overlay needed.
export const mergeOverlay = applySubclassOverlay;
