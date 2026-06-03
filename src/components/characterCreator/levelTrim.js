// Level-decrease hygiene: when a character's level drops, choices that
// are no longer legal at the new level must be trimmed so nothing stale
// persists and the build can never lock. Returns a partial characterData
// update (only the keys that actually changed).
//
// Trims: a subclass selected above the new level, expertise beyond the
// new allowance, over-cap spells (highest-level buckets first), and
// feature choices that are now out of reach (Mystic Arcanum / Champion's
// 2nd Fighting Style above level) or over their scaling pick count
// (Eldritch Invocations, Metamagic).

import { multiPickCount } from "@/components/dnd5e/dnd5eRules";
import { getSpellsCompletion } from "@/components/characterCreator/spellsCompletion";
import { expertiseRequiredFor } from "@/components/characterCreator/skillsCompletion";
import { subclassUnlockLevel } from "@/components/characterCreator/featuresCompletion";

function primaryClassLevel(characterData, totalLevel) {
  const mcLevels = Array.isArray(characterData.multiclasses)
    ? characterData.multiclasses.reduce((s, m) => s + (Number(m?.level) || 0), 0)
    : 0;
  return Math.max(1, (Number(totalLevel) || 1) - mcLevels);
}

// Trim primary-class feature choices to what's legal at the new level.
// Keys are `${className}-${unlockLevel}-${featureName}`; class names have
// no hyphens, so the level is always the second segment.
function trimFeatureChoices(characterData, primaryLevel) {
  const fc = characterData.feature_choices || {};
  const cls = characterData.class;
  const out = {};
  for (const [key, val] of Object.entries(fc)) {
    const parts = key.split("-");
    const keyClass = parts[0];
    const keyLevel = parseInt(parts[1], 10);
    const name = parts.slice(2).join("-");
    // Leave multiclass-owned keys untouched (their level is bounded by
    // the multiclass panel, not the primary level).
    if (keyClass !== cls) {
      out[key] = val;
      continue;
    }
    // Drop choices whose feature unlocks above the new level
    // (Mystic Arcanum 11/13/15/17, Champion's Additional Fighting Style 10).
    if (Number.isFinite(keyLevel) && keyLevel > primaryLevel) continue;
    // Trim multi-pick arrays (Invocations, Metamagic) to the new count.
    if (Array.isArray(val)) {
      const cap = multiPickCount(name, primaryLevel);
      out[key] = cap < val.length ? val.slice(0, cap) : val;
    } else {
      out[key] = val;
    }
  }
  return out;
}

// Trim spells to the caps at the new level — cantrips first, then
// non-cantrips from the highest-level bucket down (those vanish first
// when level drops).
function trimSpells(characterData, newLevel) {
  const { cantripCap, nonCantripCap } = getSpellsCompletion({
    ...characterData,
    level: newLevel,
  });
  const spells = characterData.spells || {};
  const next = { ...spells };

  if (Array.isArray(next.cantrips) && next.cantrips.length > cantripCap) {
    next.cantrips = next.cantrips.slice(0, cantripCap);
  }

  const bucketLevel = (k) => {
    const m = /(\d+)/.exec(k);
    return m ? parseInt(m[1], 10) : 0;
  };
  const buckets = Object.keys(next)
    .filter((k) => k !== "cantrips" && Array.isArray(next[k]))
    .sort((a, b) => bucketLevel(b) - bucketLevel(a));
  let total = buckets.reduce((s, k) => s + next[k].length, 0);
  for (const k of buckets) {
    if (total <= nonCantripCap) break;
    const remove = Math.min(next[k].length, total - nonCantripCap);
    if (remove > 0) {
      next[k] = next[k].slice(0, next[k].length - remove);
      total -= remove;
    }
  }
  return next;
}

const stable = (v) => JSON.stringify(v ?? null);

export function trimChoicesToLevel(characterData = {}, newLevel) {
  const updates = {};
  const primaryLevel = primaryClassLevel(characterData, newLevel);

  // Subclass selected above the new level (L3→L2 edge).
  const unlock = subclassUnlockLevel(characterData.class);
  if (characterData.subclass && unlock != null && primaryLevel < unlock) {
    updates.subclass = "";
  }

  // Expertise beyond the new allowance.
  const expCap = expertiseRequiredFor({ ...characterData, level: newLevel });
  if (Array.isArray(characterData.expertise) && characterData.expertise.length > expCap) {
    updates.expertise = characterData.expertise.slice(0, expCap);
  }

  // Feature choices out of reach / over the scaling count.
  const trimmedFC = trimFeatureChoices(characterData, primaryLevel);
  if (stable(trimmedFC) !== stable(characterData.feature_choices || {})) {
    updates.feature_choices = trimmedFC;
  }

  // Over-cap spells.
  const trimmedSpells = trimSpells(characterData, newLevel);
  if (stable(trimmedSpells) !== stable(characterData.spells || {})) {
    updates.spells = trimmedSpells;
  }

  return updates;
}
