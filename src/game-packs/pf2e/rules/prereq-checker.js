// Feat prerequisite checker. Lifted verbatim from the prototype (meetsPrereqs).
//
// Parses prereq strings against character state. Returns { ok, reasons: [strings] }.
// Strings handled: "level N", "trained/expert/master/legendary in <Skill>",
//   "<ABILITY> NN", "<Ancestry> ancestry", "trained in any skill".
// Foundry's prereq.value strings follow this same shape.

import { PROF_TIER_INDEX } from './proficiency.js';
import { computeDerivedStats } from './compute-derived-stats.js';
import { ANCESTRIES, BACKGROUNDS } from '../data/index.js';

export const meetsPrereqs = (feat, data) => {
  if (!feat || !feat.prereqs || feat.prereqs.length === 0) return { ok: true, reasons: [] };
  const stats = computeDerivedStats(data);
  const ancestry = ANCESTRIES.find(a => a.id === data.ancestry);
  const trained = data.trainedSkills || [];
  const bgSkill = BACKGROUNDS.find(b => b.id === data.background)?.skill;
  const tiers = data.skillTiers || {};
  const fail = [];

  for (const req of feat.prereqs) {
    const r = req.toLowerCase();

    // Level requirement
    const levelMatch = r.match(/^level (\d+)/);
    if (levelMatch) {
      const needed = parseInt(levelMatch[1]);
      if ((data.level || 1) < needed) fail.push(`Requires level ${needed}+`);
      continue;
    }

    // Proficiency-in-skill check
    const profMatch = r.match(/^(trained|expert|master|legendary) in (.+)$/);
    if (profMatch) {
      const neededTier = profMatch[1];
      const skillExpr = profMatch[2];
      // Handle "any skill" and slash-separated lists
      if (skillExpr.includes('any')) {
        const anyTrained = trained.length > 0 || bgSkill;
        if (neededTier === 'trained' && !anyTrained) fail.push('Requires trained in any skill');
        continue;
      }
      const candidates = skillExpr.split('/').map(s => s.trim());
      const meets = candidates.some(skill => {
        const cap = skill.charAt(0).toUpperCase() + skill.slice(1);
        const isTrained = trained.includes(cap) || bgSkill === cap;
        const currentTier = tiers[cap] || (isTrained ? 'trained' : 'untrained');
        return PROF_TIER_INDEX[currentTier] >= PROF_TIER_INDEX[neededTier];
      });
      if (!meets) fail.push(`Requires ${neededTier} in ${skillExpr}`);
      continue;
    }

    // Ability score requirement (e.g. "Strength 14")
    const abMatch = r.match(/^(strength|dexterity|constitution|intelligence|wisdom|charisma) (\d+)/);
    if (abMatch) {
      const ab = abMatch[1].charAt(0).toUpperCase() + abMatch[1].slice(1);
      const score = stats.scores[ab] || 10;
      if (score < parseInt(abMatch[2])) fail.push(`Requires ${ab} ${abMatch[2]}+`);
      continue;
    }

    // Ancestry requirement
    const ancestryMatch = r.match(/^(\w+) ancestry/);
    if (ancestryMatch && ancestry?.id !== ancestryMatch[1].toLowerCase()) {
      fail.push(`Requires ${ancestryMatch[1]} ancestry`);
      continue;
    }
  }

  return { ok: fail.length === 0, reasons: fail };
};
