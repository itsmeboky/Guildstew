// Compute derived statistics for the character sheet snapshot.
//
// Source priority for proficiency ranks:
//   1. Imported class data (`cls.proficiencies`, numeric ranks 0-4).
//      This is the canonical Foundry-native shape and covers every
//      ORC-cleared class.
//   2. Hand-curated CLASS_DETAILS (string tiers like 'trained').
//      Partial coverage today — only a handful of classes have
//      curated entries. Acts as a secondary layer for extras the
//      imported data doesn't carry (favored-weapon proficiency,
//      tradition-specific spellcasting ranks, etc).
//   3. Sensible defaults — 'trained' for spellcasting on caster
//      classes, 'untrained' (rank 0) elsewhere.
//
// Pre-fix bug: the function only looked at CLASS_DETAILS, which has
// no entry for most classes. For Witch / Sorcerer / Monk / etc.,
// every defensive proficiency landed at 'untrained' and profBonus
// returned 0, so AC/Saves/Perception/Class-DC displayed as just the
// ability modifier (no +level, no +rank bonus). Spell DC worked
// because that branch had a `|| 'trained'` fallback that the
// defensive branch lacked.

import { ABILITIES } from './constants.js';
import { profBonus, normalizeRank } from './proficiency.js';
import { computeAbilityScores, modOf } from './compute-ability-scores.js';
import { getEffectiveKeyAbility } from './key-ability.js';
import {
  ANCESTRIES,
  CLASSES,
  CLASS_DETAILS,
  ANCESTRY_LANGUAGES,
  CASTING_TRADITION_BY_CLASS,
} from '../data/index.js';

// Pick the first rank that's defined. Imported data wins; the
// hand-curated table is a backstop for classes missing from the
// import; the literal fallback closes the chain.
const pickRank = (...candidates) => {
  for (const c of candidates) {
    if (c !== undefined && c !== null) return c;
  }
  return 0;
};

export const computeDerivedStats = (data) => {
  const level = data.level || 1;
  const scores = computeAbilityScores(data);
  const mods = Object.fromEntries(ABILITIES.map(ab => [ab, modOf(scores[ab])]));
  const cls = CLASSES.find(c => c.slug === data.class);
  const importedProfs = cls?.proficiencies || {};
  const curatedProfs = (cls && CLASS_DETAILS[cls.slug]?.proficiencies) || {};
  const opts = { proficiencyWithoutLevel: !!data.houseRules?.proficiencyWithoutLevel };

  // AC: 10 + DEX (capped by armor) + armor proficiency + armor item
  // bonus. The character creator doesn't track an equipped-armor
  // category cleanly yet, so default to unarmored — which is also
  // correct for casters mid-walkthrough before they take the kit.
  const armorCategory = data.equippedArmor?.category || 'unarmored';
  const armorBonus = data.equippedArmor?.bonus ?? 0;
  const dexCap = data.equippedArmor?.dexCap ?? Infinity;
  const acRank = pickRank(
    importedProfs.armor?.[armorCategory],
    curatedProfs.armor?.[armorCategory],
  );
  const ac = 10 + Math.min(mods.Dexterity, dexCap) + armorBonus + profBonus(acRank, level, opts);

  // Saves. Witch is one of the classes that started failing
  // pre-fix: importedProfs.saves has fortitude/reflex=1 (trained)
  // and will=2 (expert), but CLASS_DETAILS has no witch entry, so
  // every save resolved to 'untrained' and returned 0.
  const fortRank = pickRank(importedProfs.saves?.fortitude, curatedProfs.saves?.fortitude);
  const refRank  = pickRank(importedProfs.saves?.reflex,    curatedProfs.saves?.reflex);
  const willRank = pickRank(importedProfs.saves?.will,      curatedProfs.saves?.will);
  const fort = mods.Constitution + profBonus(fortRank, level, opts);
  const ref  = mods.Dexterity    + profBonus(refRank,  level, opts);
  const will = mods.Wisdom       + profBonus(willRank, level, opts);

  // Perception. Same shape — numeric in imports, string in curated.
  const percRank = pickRank(importedProfs.perception, curatedProfs.perception);
  const perception = mods.Wisdom + profBonus(percRank, level, opts);

  // Class DC — uses key ability + level + proficiency. Caster
  // classes lacking a Class DC in the imported data (it's only set
  // on classes that key off it like Alchemist, Witch hex DC, etc.)
  // still get one defaulted to trained at level 1, matching every
  // PF2e class's level-1 starting proficiency.
  const keyAb = getEffectiveKeyAbility(cls, data);
  const classDCRank = pickRank(
    importedProfs.classDC,
    curatedProfs.classDC,
    keyAb ? 1 : 0, // trained for any class that has a key ability
  );
  const classDC = keyAb ? 10 + mods[keyAb] + profBonus(classDCRank, level, opts) : null;

  // Spell DC and spell attack. Caster classes have spellcasting=1
  // (trained) at level 1 by default. The curated layer may carry a
  // tradition-specific rank ({occultSpellcasting:'trained',…}) for
  // classes that scale differently across traditions.
  let spellDC = null;
  let spellAttack = null;
  const tradition = cls && CASTING_TRADITION_BY_CLASS[cls.slug];
  if (tradition) {
    const castProfKey = tradition.tradition + 'Spellcasting';
    const castRank = pickRank(
      curatedProfs[castProfKey],
      importedProfs.spellcasting,
      1, // trained default for casters
    );
    spellDC     = 10 + mods[tradition.keyAbility] + profBonus(castRank, level, opts);
    spellAttack =       mods[tradition.keyAbility] + profBonus(castRank, level, opts);
  }

  // HP — ancestry + (class HP/level + CON mod/level).
  const ancestry = ANCESTRIES.find(a => a.slug === data.ancestry);
  const hp = (ancestry?.hp || 0) + (cls?.hp || 0) * level + mods.Constitution * level;

  // Languages count = base ancestry + max(0, INT mod). The legacy
  // ANCESTRY_LANGUAGES table is slug-keyed; the SRD-imported ancestry
  // shape carries `languages` directly, so we union both.
  const importedLangs = ancestry?.languages || [];
  const baseLanguages = importedLangs.length
    ? importedLangs
    : (ANCESTRY_LANGUAGES[data.ancestry]?.base || []);
  const bonusLangSlots = Math.max(0, mods.Intelligence);

  return {
    level, scores, mods, ac, fort, ref, will, perception, classDC,
    spellDC, spellAttack, hp, baseLanguages, bonusLangSlots,
    initiative: perception, opts,
  };
};
