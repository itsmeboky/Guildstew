/**
 * D&D 5e (2024) — class adapter.
 *
 * Sources from `docs/5e_reference/2024/5e-SRD-Classes.json` and
 * `5e-SRD-Subclasses.json`. The 2024 SRD does not embed
 * level-by-level progression in this file (`class_levels` is a URL
 * reference, not an inline array — and there is no separate
 * `5e-SRD-Levels.json` either) so per-level features are out of
 * scope for this adapter. They land in commit 3 of the 2024
 * character creator bundle, sourced from a hand-authored
 * progression file or extracted from the upstream 5e-bits dataset.
 *
 * Normalised class shape returned by every helper:
 *
 *   {
 *     id, name,
 *     hitDie,                    // numeric, e.g. 12
 *     primaryAbility,            // human-readable, e.g. "Strength"
 *     primaryAbilities,          // raw SRD list of {index, name}
 *     savingThrows,              // ["STR", "CON"] or human-readable
 *     proficiencies,             // armor + weapon names
 *     skillChoiceCount,          // how many skills the class grants
 *     skillChoices,              // names available
 *     multiclass: {
 *       prerequisites: [{ ability, minimumScore }],
 *       proficiencies: [name],
 *     },
 *     subclasses,                // [{ id, name }] — refs only
 *     hasWeaponMastery,          // martial classes only
 *     _raw,                      // full SRD record
 *   }
 *
 * Mirrors the 2014 adapter's surface so the dispatcher in
 * CharacterCreator.jsx can route by gamePack without per-step
 * shape branching.
 */

import CLASSES_RAW from "../../../../docs/5e_reference/2024/5e-SRD-Classes.json";
import SUBCLASSES_RAW from "../../../../docs/5e_reference/2024/5e-SRD-Subclasses.json";

const ABILITY_FULL_NAME = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

// Martial classes get Weapon Mastery in 2024 (Barbarian, Fighter,
// Monk, Paladin, Ranger, Rogue per PHB 2024). Sourced by class id
// because the SRD doesn't tag this directly.
const MARTIAL_CLASS_IDS = new Set([
  "barbarian",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
]);

function abilityIndexToName(idx) {
  const lower = String(idx || "").toLowerCase();
  return ABILITY_FULL_NAME[lower] || idx;
}

function normaliseSubclass(raw) {
  return { id: raw.index, name: raw.name };
}

function normaliseProficiencyChoice(raw) {
  if (!raw) return null;
  const opts = raw.from?.options || [];
  return {
    desc: raw.desc || "",
    choose: raw.choose || 0,
    options: opts
      .map((o) => o.item?.name || o.choice?.desc || "")
      .filter(Boolean),
  };
}

function normaliseMulticlass(raw) {
  if (!raw) {
    return { prerequisites: [], proficiencies: [] };
  }
  return {
    prerequisites: (raw.prerequisites || []).map((p) => ({
      ability: p.ability_score?.index?.toUpperCase() || null,
      abilityName: abilityIndexToName(p.ability_score?.index),
      minimumScore: p.minimum_score || 0,
    })),
    proficiencies: (raw.proficiencies || []).map((p) => p.name),
  };
}

function normalise(raw) {
  const id = raw.index;
  const subclasses = SUBCLASSES_RAW
    .filter((s) => s.class?.index === id)
    .map(normaliseSubclass);

  const skillChoiceRaw = (raw.proficiency_choices || []).find((c) =>
    String(c.desc || "").toLowerCase().includes("skill"),
  );
  const skillChoice = skillChoiceRaw
    ? normaliseProficiencyChoice(skillChoiceRaw)
    : { choose: 0, options: [] };

  const primaryList = raw.primary_ability?.all_of
    || raw.primary_ability?.any_of
    || raw.primary_ability?.options
    || [];
  const primaryNames = primaryList
    .map((a) => abilityIndexToName(a.index || a?.item?.index))
    .filter(Boolean);

  return {
    id,
    name: raw.name,
    hitDie: raw.hit_die,
    primaryAbility: primaryNames[0] || raw.primary_ability?.desc || "",
    primaryAbilities: primaryNames,
    savingThrows: (raw.saving_throws || []).map((s) =>
      abilityIndexToName(s.index),
    ),
    proficiencies: (raw.proficiencies || []).map((p) => p.name),
    skillChoiceCount: skillChoice.choose || 0,
    skillChoices: skillChoice.options || [],
    multiclass: normaliseMulticlass(raw.multi_classing),
    subclasses,
    hasWeaponMastery: MARTIAL_CLASS_IDS.has(id),
    _raw: raw,
  };
}

const ALL = CLASSES_RAW.map(normalise);
const BY_ID = new Map(ALL.map((c) => [c.id, c]));
const BY_NAME = new Map(ALL.map((c) => [c.name.toLowerCase(), c]));

export function getClasses() {
  return ALL;
}

export function getClassByName(name) {
  if (!name) return null;
  return BY_NAME.get(String(name).toLowerCase()) || null;
}

export function getClassById(id) {
  if (!id) return null;
  return BY_ID.get(id) || null;
}

export function getSubclassesForClass(classKeyOrName) {
  if (!classKeyOrName) return [];
  const cls = getClassById(classKeyOrName) || getClassByName(classKeyOrName);
  return cls ? cls.subclasses : [];
}

export function getMulticlassPrereqs(classKeyOrName) {
  const cls = getClassById(classKeyOrName) || getClassByName(classKeyOrName);
  return cls ? cls.multiclass : null;
}
