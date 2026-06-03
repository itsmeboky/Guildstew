// D&D 5e (2014) Class Features by Level — SRD adapter.
//
// SOURCE OF TRUTH:
//   docs/5e_reference/2014/5e-SRD-Levels.json   (per-class & per-subclass
//                                                feature progression 1–20)
//   docs/5e_reference/2014/5e-SRD-Features.json (feature descriptions)
//
// Architecture mirrors the dnd5e_2024 adapters (static SRD JSON →
// derived per-level data), but the DATA SOURCE is the 2014 reference —
// the 2024 progression differs (weapon mastery, 2024 Pact Magic, etc.)
// and must not be pulled here. Sourcing strictly from the SRD reference
// enforces the SRD-5.1 content boundary by construction: only the 12
// SRD classes and their single SRD subclass each appear.
//
// EXPORT CONTRACT (unchanged):
//   getClassFeaturesForLevel(className, level) → Array<{
//     name, level, description, uses?, choiceRequired?, choices?
//   }>, accumulating every feature from level 1 → `level`.
//
// Choice-bearing features that already have working pickers in
// ClassFeaturesStep keep their `choiceRequired` + `choices`:
//   • subclass-selection features (Primal Path, Divine Domain, …)
//   • Fighting Style          • Metamagic          • Pact Boon
// Everything else (Eldritch Invocations, Mystic Arcanum, Expertise, …)
// is emitted as a plain descriptive feature — their picker wiring is a
// separate follow-up brief and is intentionally NOT built here.
//
// Ability Score Improvement features are excluded: ASIs are surfaced
// independently by ClassFeaturesStep's AsiCard via reachedAsiLevels.

import LEVELS from '../../../../docs/5e_reference/2014/5e-SRD-Levels.json' with { type: 'json' };
import FEATURES from '../../../../docs/5e_reference/2014/5e-SRD-Features.json' with { type: 'json' };

// ─── Class / subclass identity maps ──────────────────────────────────
// Display name (as used across the creator UI + characterData.class)
// → SRD class index in the reference JSON.
const CLASS_INDEX = {
  Barbarian: 'barbarian', Bard: 'bard', Cleric: 'cleric', Druid: 'druid',
  Fighter: 'fighter', Monk: 'monk', Paladin: 'paladin', Ranger: 'ranger',
  Rogue: 'rogue', Sorcerer: 'sorcerer', Warlock: 'warlock', Wizard: 'wizard',
};

// The one SRD subclass per class. `index` is the SRD subclass index;
// `display` is the canonical name ClassStep writes to
// characterData.subclass (and that subclassRecommendations keys on);
// `selectionFeature` is the SRD base-class feature name that triggers
// the subclass choice (kept in sync with ClassFeaturesStep's
// SUBCLASS_FEATURE_NAMES set).
const SUBCLASS_BY_CLASS = {
  Barbarian: { index: 'berserker', display: 'Path of the Berserker', selectionFeature: 'Primal Path' },
  Bard:      { index: 'lore',      display: 'College of Lore',       selectionFeature: 'Bard College' },
  Cleric:    { index: 'life',      display: 'Life Domain',           selectionFeature: 'Divine Domain' },
  Druid:     { index: 'land',      display: 'Circle of the Land',    selectionFeature: 'Druid Circle' },
  Fighter:   { index: 'champion',  display: 'Champion',              selectionFeature: 'Martial Archetype' },
  Monk:      { index: 'open-hand', display: 'Way of the Open Hand',  selectionFeature: 'Monastic Tradition' },
  Paladin:   { index: 'devotion',  display: 'Oath of Devotion',      selectionFeature: 'Sacred Oath' },
  Ranger:    { index: 'hunter',    display: 'Hunter',                selectionFeature: 'Ranger Archetype' },
  Rogue:     { index: 'thief',     display: 'Thief',                 selectionFeature: 'Roguish Archetype' },
  Sorcerer:  { index: 'draconic',  display: 'Draconic Bloodline',    selectionFeature: 'Sorcerous Origin' },
  Warlock:   { index: 'fiend',     display: 'The Fiend',             selectionFeature: 'Otherworldly Patron' },
  Wizard:    { index: 'evocation', display: 'School of Evocation',   selectionFeature: 'Arcane Tradition' },
};

// ─── Curated picker choices (the features with working pickers) ──────
// Fighting Style option text (SRD). Each class draws its own subset.
const FIGHTING_STYLES = {
  Archery: 'You gain a +2 bonus to attack rolls you make with ranged weapons.',
  Defense: 'While you are wearing armor, you gain a +1 bonus to AC.',
  Dueling: 'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.',
  'Great Weapon Fighting': 'When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll. The weapon must have the two-handed or versatile property.',
  Protection: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.',
  'Two-Weapon Fighting': 'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.',
};
const FIGHTING_STYLE_BY_CLASS = {
  Fighter: ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'],
  Paladin: ['Defense', 'Dueling', 'Great Weapon Fighting', 'Protection'],
  Ranger: ['Archery', 'Defense', 'Dueling', 'Two-Weapon Fighting'],
};

const METAMAGIC_CHOICES = [
  { name: 'Careful Spell', description: 'When you cast a spell that forces other creatures to make a saving throw, you can spend 1 sorcery point to choose a number of those creatures up to your Charisma modifier (minimum of one). A chosen creature automatically succeeds on its saving throw against the spell.' },
  { name: 'Distant Spell', description: 'When you cast a spell that has a range of 5 feet or greater, you can spend 1 sorcery point to double the range. When you cast a spell with a range of touch, you can spend 1 sorcery point to make the range 30 feet.' },
  { name: 'Empowered Spell', description: 'When you roll damage for a spell, you can spend 1 sorcery point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls.' },
  { name: 'Extended Spell', description: 'When you cast a spell with a duration of 1 minute or longer, you can spend 1 sorcery point to double its duration, to a maximum of 24 hours.' },
  { name: 'Heightened Spell', description: 'When you cast a spell that forces a creature to make a saving throw, you can spend 3 sorcery points to give one target disadvantage on its first saving throw against the spell.' },
  { name: 'Quickened Spell', description: 'When you cast a spell with a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action for this casting.' },
  { name: 'Subtle Spell', description: 'When you cast a spell, you can spend 1 sorcery point to cast it without any somatic or verbal components.' },
  { name: 'Twinned Spell', description: "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend sorcery points equal to the spell's level (1 for a cantrip) to target a second creature in range with the same spell." },
];

const PACT_BOON_CHOICES = [
  { name: 'Pact of the Chain', description: 'You learn the find familiar spell and can cast it as a ritual. The spell doesn\'t count against your number of spells known. You can choose one of the normal familiar forms or a special form: imp, pseudodragon, quasit, or sprite. When you take the Attack action, you can forgo one of your own attacks to let your familiar make one attack of its own.' },
  { name: 'Pact of the Blade', description: 'You can use your action to create a pact weapon in your empty hand. You are proficient with it while you wield it, and it counts as magical. You can transform a magic weapon into your pact weapon through a special ritual.' },
  { name: 'Pact of the Tome', description: 'Your patron gives you a Book of Shadows. Choose three cantrips from any class\'s spell list; while the book is on your person you can cast them at will. They don\'t count against your cantrips known and are warlock spells for you.' },
];

// ─── SRD lookup helpers ──────────────────────────────────────────────
// Feature index → joined description string.
const FEATURE_DESC = new Map();
for (const f of FEATURES) {
  if (!f || !f.index) continue;
  const desc = Array.isArray(f.desc) ? f.desc.join('\n') : (f.desc || '');
  FEATURE_DESC.set(f.index, desc);
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function isAsiFeature(ref) {
  return /ability-score-improvement/i.test(ref.index || '')
    || /^ability score improvement$/i.test(ref.name || '');
}

// Assemble the single-subclass choice description in the
// "Feature (Nth): body" format SubclassPicker parses for its Key
// Features list. Sourced from the subclass's own SRD features.
function buildSubclassChoiceDescription(subEntriesByLevel) {
  const lines = [];
  const levels = Object.keys(subEntriesByLevel).map(Number).sort((a, b) => a - b);
  for (const lvl of levels) {
    for (const feat of subEntriesByLevel[lvl]) {
      const body = (feat.description || '').replace(/\s+/g, ' ').trim();
      lines.push(`${feat.name} (${ordinal(lvl)}): ${body}`);
    }
  }
  return lines.join('\n\n');
}

// Is this base feature one of the four working-picker features?
function isCuratedChoiceFeature(name, className) {
  const sub = SUBCLASS_BY_CLASS[className];
  return (
    (sub && name === sub.selectionFeature)
    || (name === 'Fighting Style' && !!FIGHTING_STYLE_BY_CLASS[className])
    || name === 'Metamagic'
    || name === 'Pact Boon'
  );
}

// Decorate a base feature with picker choices when it's one of the
// working-picker features; otherwise return it untouched. The SRD data
// repeats some choice features at every level they recur (e.g.
// Metamagic at 3/10/17); the caller emits only the FIRST occurrence so
// a single picker renders and multiPickCount handles the scaling count.
function decorateChoice(feature, className, subclassChoiceDesc) {
  const sub = SUBCLASS_BY_CLASS[className];
  if (sub && feature.name === sub.selectionFeature) {
    return {
      ...feature,
      choiceRequired: true,
      choices: [{ name: sub.display, description: subclassChoiceDesc }],
    };
  }
  if (feature.name === 'Fighting Style' && FIGHTING_STYLE_BY_CLASS[className]) {
    return {
      ...feature,
      choiceRequired: true,
      choices: FIGHTING_STYLE_BY_CLASS[className].map((name) => ({
        name,
        description: FIGHTING_STYLES[name],
      })),
    };
  }
  if (feature.name === 'Metamagic') {
    return { ...feature, choiceRequired: true, choices: METAMAGIC_CHOICES };
  }
  if (feature.name === 'Pact Boon') {
    return { ...feature, choiceRequired: true, choices: PACT_BOON_CHOICES };
  }
  return feature;
}

// ─── Precompute classFeaturesData[ClassName][level] = [features…] ─────
function buildClassFeaturesData() {
  const data = {};

  for (const [className, classIdx] of Object.entries(CLASS_INDEX)) {
    const sub = SUBCLASS_BY_CLASS[className];

    // Base-class level entries (no subclass) and subclass level entries.
    const baseEntries = LEVELS.filter(
      (e) => e.class?.index === classIdx && !e.subclass,
    );
    const subEntries = LEVELS.filter(
      (e) => e.subclass?.index === sub?.index,
    );

    // Subclass features grouped by level (for both the discrete
    // per-level entries and the assembled choice description).
    const subByLevel = {};
    for (const e of subEntries) {
      for (const ref of e.features || []) {
        if (isAsiFeature(ref)) continue;
        (subByLevel[e.level] ||= []).push({
          name: ref.name,
          level: e.level,
          description: FEATURE_DESC.get(ref.index) || '',
        });
      }
    }
    const subclassChoiceDesc = buildSubclassChoiceDescription(subByLevel);

    // Base features grouped by level, with picker choices attached.
    // Curated-choice features (subclass selection, Fighting Style,
    // Metamagic, Pact Boon) are emitted only on their FIRST occurrence
    // — the single picker scales via multiPickCount, so the SRD's
    // repeat entries (e.g. Metamagic at 3/10/17) must not each spawn
    // their own picker.
    const seenChoiceFeature = new Set();
    const byLevel = {};
    for (const e of baseEntries) {
      for (const ref of e.features || []) {
        if (isAsiFeature(ref)) continue;
        if (isCuratedChoiceFeature(ref.name, className)) {
          if (seenChoiceFeature.has(ref.name)) continue;
          seenChoiceFeature.add(ref.name);
        }
        const feature = decorateChoice(
          {
            name: ref.name,
            level: e.level,
            description: FEATURE_DESC.get(ref.index) || '',
          },
          className,
          subclassChoiceDesc,
        );
        (byLevel[e.level] ||= []).push(feature);
      }
    }

    // Fold the subclass's discrete features in at their own levels,
    // after the base features for that level (single SRD subclass, so
    // it's always the character's actual subclass).
    for (const [lvl, feats] of Object.entries(subByLevel)) {
      (byLevel[lvl] ||= []).push(...feats);
    }

    data[className] = byLevel;
  }

  return data;
}

const classFeaturesData = buildClassFeaturesData();

/**
 * Accumulate every class feature a character of `className` has earned
 * by `level` (levels 1 → level inclusive), in level order. Signature,
 * output shape, and accumulation behavior are preserved from the
 * original stub so all consumers work unchanged.
 */
export function getClassFeaturesForLevel(className, level) {
  const classFeatures = classFeaturesData[className];
  if (!classFeatures) return [];

  const cap = Number(level) || 1;
  let features = [];
  for (let lvl = 1; lvl <= cap; lvl++) {
    if (classFeatures[lvl]) {
      features = features.concat(classFeatures[lvl]);
    }
  }
  return features;
}
