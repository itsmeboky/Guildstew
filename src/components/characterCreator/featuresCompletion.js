// Completion helpers for the Features step and the Class-step subclass
// gate — the single source of truth shared by CharacterCreator's
// validateStep and ClassFeaturesStep's "resolve your choices" banner, so
// the gate and the in-step UI can never disagree (M2/M8).

import { getClassFeaturesForLevel } from "@/components/dnd5e/classFeatures";
import { resolveFeatureChoices } from "@/components/characterCreator/featureChoiceResolver";
import { multiPickCount } from "@/components/dnd5e/dnd5eRules";

// Canonical "choose your specialization" feature names per class. A
// choiceRequired feature with one of these names is the subclass-
// SELECTION prompt, which (post-reorder) lives on the Class step — the
// Features step neither offers nor gates it.
export const SUBCLASS_FEATURE_NAMES = new Set([
  "Primal Path",
  "Bard College",
  "Divine Domain",
  "Druid Circle",
  "Martial Archetype",
  "Monastic Tradition",
  "Sacred Oath",
  "Ranger Archetype",
  "Ranger Conclave",
  "Roguish Archetype",
  "Sorcerous Origin",
  "Otherworldly Patron",
  "Arcane Tradition",
]);

export function isSubclassFeature(feature) {
  return !!feature?.choiceRequired && SUBCLASS_FEATURE_NAMES.has(feature?.name);
}

function primaryClassLevel(characterData) {
  const total = Number(characterData.level) || 1;
  const mcLevels = Array.isArray(characterData.multiclasses)
    ? characterData.multiclasses.reduce((s, m) => s + (Number(m?.level) || 0), 0)
    : 0;
  return Math.max(1, total - mcLevels);
}

/**
 * The level at which a class gains its subclass-selection feature
 * (1 for Cleric/Sorcerer/Warlock, 2 for Wizard/Druid, 3 for the rest).
 * Read straight from the feature data so it can't drift.
 */
export function subclassUnlockLevel(className) {
  if (!className) return null;
  const all = getClassFeaturesForLevel(className, 20) || [];
  const sel = all.find(isSubclassFeature);
  return sel ? sel.level : null;
}

/**
 * Is the (primary) subclass selected when the character's level
 * qualifies for one? A level-1 Fighter (subclass unlocks at 3) is fine
 * with none; a level-3 Fighter must have one.
 */
export function isSubclassSelectionComplete(characterData = {}) {
  if (!characterData.class) return false;
  const unlock = subclassUnlockLevel(characterData.class);
  if (unlock == null) return true; // class has no subclass in the data
  if (primaryClassLevel(characterData) < unlock) return true; // not yet due
  return !!characterData.subclass;
}

// A choiceRequired feature is "resolved" when the stored selection meets
// its (level-scaled) pick count. Multi-pick features (Invocations,
// Metamagic) store an array; single-pick store a value.
function featureResolved(feature, characterData, classLevel, ownerClass) {
  const key = `${ownerClass}-${feature.level}-${feature.name}`;
  const stored = (characterData.feature_choices || {})[key];
  const need = multiPickCount(feature.name, classLevel) || 1;
  const have = Array.isArray(stored) ? stored.length : stored ? 1 : 0;
  return have >= need;
}

function requiredFeaturesFor(className, classLevel, characterData) {
  return resolveFeatureChoices(
    getClassFeaturesForLevel(className, classLevel) || [],
    characterData,
    classLevel,
  ).filter((f) => f.choiceRequired && !isSubclassFeature(f));
}

/**
 * Features-step completion: every mandatory (non-subclass) choiceRequired
 * pick is resolved — Fighting Style, Metamagic, Pact Boon, Eldritch
 * Invocations, Mystic Arcanum, across the primary class and any
 * multiclass entries. Returns { isComplete, missing }.
 */
export function getFeaturesCompletion(characterData = {}) {
  if (!characterData.class) return { isComplete: true, missing: [] };
  const missing = [];

  const pLvl = primaryClassLevel(characterData);
  for (const f of requiredFeaturesFor(characterData.class, pLvl, characterData)) {
    if (!featureResolved(f, characterData, pLvl, characterData.class)) missing.push(f.name);
  }

  const multiclasses = Array.isArray(characterData.multiclasses)
    ? characterData.multiclasses.filter((mc) => mc?.class && mc?.level)
    : [];
  for (const mc of multiclasses) {
    for (const f of requiredFeaturesFor(mc.class, mc.level, characterData)) {
      if (!featureResolved(f, characterData, mc.level, mc.class)) missing.push(`${mc.class}: ${f.name}`);
    }
  }

  return { isComplete: missing.length === 0, missing };
}
