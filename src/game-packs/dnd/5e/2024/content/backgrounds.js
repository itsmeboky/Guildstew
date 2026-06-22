/**
 * D&D 5e (2024) — background adapter.
 *
 * SOURCE OF TRUTH:
 *   - docs/5e_reference/2024/5e-SRD-Backgrounds.json (4 SRD backgrounds)
 *   - docs/5e_reference/2024/5e-SRD-Feats.json       (17 SRD feats;
 *     only Origin-type feats are eligible for background-granted picks)
 *
 * 2024 PHB shift: backgrounds grant ability score increases (+2/+1
 * or +1/+1/+1 across three abilities tied to the background), two
 * skill proficiencies, one tool proficiency, an Origin feat, and a
 * starting-equipment package OR gold-only option. Species no longer
 * grants ASI in 2024.
 *
 * SRD 5.2 ships 4 backgrounds: Acolyte, Criminal, Sage, Soldier.
 * The remaining 12 PHB-2024 backgrounds (Artisan, Charlatan,
 * Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble,
 * Sailor, Scribe, Wayfarer) are not in the OGL SRD JSON and are
 * not shipped in this pack.
 *
 * SRD 5.2 ships 4 Origin-type feats: Alert, Magic Initiate,
 * Savage Attacker, Skilled. Each SRD background's `feat` field
 * names exactly one of these as the background's default; some
 * backgrounds (Magic Initiate variants) can pick which spell list
 * the feat draws from.
 */

import BACKGROUNDS from "../../../../../../docs/5e_reference/2024/5e-SRD-Backgrounds.json" with { type: "json" };
import FEATS from "../../../../../../docs/5e_reference/2024/5e-SRD-Feats.json" with { type: "json" };

const BY_ID = new Map(BACKGROUNDS.map((b) => [b.index, b]));

/** All 2024 SRD backgrounds (currently 4). */
export function getBackgroundList() {
  return BACKGROUNDS;
}

/** Single-background lookup by SRD index (e.g. "acolyte"). */
export function getBackgroundById(id) {
  if (!id) return null;
  return BY_ID.get(id) || null;
}

/**
 * The 3 abilities the background grants ASI to. Returns an array of
 * lowercase ability indices (e.g. ['int', 'wis', 'cha'] for Acolyte).
 */
export function getBackgroundAbilities(backgroundId) {
  const bg = getBackgroundById(backgroundId);
  if (!bg) return [];
  return (bg.ability_scores || [])
    .map((a) => (a?.index || "").toLowerCase())
    .filter(Boolean);
}

/**
 * The background's default Origin feat. Returns the feat record
 * (full SRD feat shape) plus a `note` field carrying any
 * background-specific spell-list selection text (e.g. Acolyte's
 * Magic Initiate is Cleric-list-flavored).
 */
export function getBackgroundFeat(backgroundId) {
  const bg = getBackgroundById(backgroundId);
  if (!bg || !bg.feat) return null;
  const featIndex = bg.feat.index;
  const feat = FEATS.find((f) => f.index === featIndex);
  if (!feat) return null;
  return { ...feat, note: bg.feat.note || null };
}

/**
 * The two skill proficiencies + one tool proficiency the background
 * grants. Parses the SRD `proficiencies` array's `Skill: X` and
 * `Tool: X` prefixes.
 */
export function getBackgroundProficiencies(backgroundId) {
  const bg = getBackgroundById(backgroundId);
  if (!bg) return { skills: [], tools: [] };
  const skills = [];
  const tools = [];
  for (const p of bg.proficiencies || []) {
    const name = p.name || "";
    if (name.startsWith("Skill: ")) {
      skills.push(name.replace(/^Skill:\s*/, ""));
    } else if (name.startsWith("Tool: ")) {
      tools.push(name.replace(/^Tool:\s*/, ""));
    }
  }
  return { skills, tools };
}

/**
 * All Origin-type feats from the SRD. Used by the background step
 * if the player can pick the feat (vs. the background's default).
 * Currently the picker isn't exposed in the creator — backgrounds
 * use their default feat — but the helper is here for the future.
 */
export function getOriginFeats() {
  return FEATS.filter((f) => f.type === "origin");
}
