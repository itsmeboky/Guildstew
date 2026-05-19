// Subclass proficiency overlays — interim hardcoded table.
//
// PF2e subclasses (Rogue rackets, Cleric doctrines, Druid orders,
// Witch patrons, Sorcerer bloodlines, etc.) modify base class
// proficiencies and grant bonus skills. Foundry encodes these as
// rule elements inside the subclass feature items, which is its own
// parser project. Until that parser lands, this file is the source of
// truth for the subclasses we explicitly support.
//
// Shape:
//   { [classSlug]: { [subclassId]: { proficiencyDeltas, bonusSkills,
//                                    keyAbility, notes } } }
//
// Apply with `applySubclassOverlay(baseProficiencies, overlay)`.
// `proficiencyDeltas` are deep-merged onto the base; bonus skills are
// surfaced separately so the UI can render them as auto-granted
// chips. Adding a new entry below is the recommended way to extend
// coverage — the rule-element parser is tracked separately.

export const SUBCLASS_OVERLAYS = {
  rogue: {
    thief: {
      proficiencyDeltas: {
        // No proficiency changes — racket grant is mechanical
        // (Dex-to-damage with finesse), surfaced via `notes`.
      },
      bonusSkills: ['thievery'],
      keyAbility: 'Dexterity',
      notes: "Use your Dexterity modifier instead of Strength for melee damage with finesse and agile weapons.",
    },
    scoundrel: {
      proficiencyDeltas: {},
      bonusSkills: ['deception', 'diplomacy'],
      keyAbility: 'Charisma',
      notes: "Charm-focused. A successful Feint makes the target off-guard for a full round (instead of just one Strike).",
    },
    mastermind: {
      proficiencyDeltas: {},
      bonusSkills: ['society'],
      // Intelligence-flavored — pick a Lore at level 1.
      keyAbility: 'Intelligence',
      notes: "After Recall Knowledge on a creature, it's off-guard against your sneak attack until the start of your next turn.",
    },
    ruffian: {
      proficiencyDeltas: {
        armor: { medium: 'trained' },
        weapons: { martial: 'trained' },
      },
      bonusSkills: ['intimidation'],
      keyAbility: 'Strength',
      notes: "Sneak attack with simple weapons (d8 or less) and martial weapons (d6 or less, agile/finesse only). Brutal hits make targets flat-footed when criticalled.",
    },
    'eldritch-trickster': {
      proficiencyDeltas: {},
      bonusSkills: [],
      keyAbility: 'Charisma',
      notes: "Multiclass caster dedication available at 2nd level via the Eldritch Trickster archetype.",
    },
  },
  cleric: {
    cloistered: {
      proficiencyDeltas: {
        weapons: { simple: 'trained', favoredWeapon: 'trained' },
      },
      bonusSkills: [],
      keyAbility: 'Wisdom',
      notes: "Full spellcaster focus. Better spell progression and access to expert proficiency in spellcasting earlier.",
    },
    warpriest: {
      proficiencyDeltas: {
        weapons: { simple: 'trained', martial: 'trained', favoredWeapon: 'trained' },
        armor:   { medium: 'trained' },
        saves:   { fortitude: 'expert' },
      },
      bonusSkills: [],
      keyAbility: 'Wisdom',
      notes: "Martial-leaning. Stronger Fortitude, medium armor, and martial weapons at the cost of slower spell-rank progression.",
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
