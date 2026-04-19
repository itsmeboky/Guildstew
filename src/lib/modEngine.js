import { supabase } from "@/api/supabaseClient";

/**
 * Brewery mod engine — Part 1 foundation.
 *
 * Mods live in `brewery_mods`. Campaign installations snapshot the
 * patches + metadata into `campaign_installed_mods` so a mod update
 * never breaks a live campaign (version pinning — the GM has to opt
 * in to an update). Character dependencies live on
 * `characters.mod_dependencies` so the library can grey out modded
 * characters in campaigns missing those mods.
 *
 * This module is the single source of truth for every "what mods are
 * installed, what do they do, is this legal" question in the app.
 */

const modCache = new Map();

export async function loadCampaignMods(campaignId) {
  if (!campaignId) return [];
  if (modCache.has(campaignId)) return modCache.get(campaignId);
  const { data, error } = await supabase
    .from("campaign_installed_mods")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "active")
    .order("priority", { ascending: true });
  if (error) {
    console.warn("loadCampaignMods failed:", error.message || error);
    return [];
  }
  const mods = data || [];
  modCache.set(campaignId, mods);
  return mods;
}

export function invalidateModCache(campaignId) {
  if (campaignId) modCache.delete(campaignId);
  else modCache.clear();
}

/**
 * Resolve a game rule's effective value after applying every installed
 * mod's patch for that target/field. Operations:
 *   override — replace the value
 *   modify   — numeric add (ignored for non-numbers)
 *   extend   — array append (ignored for non-arrays)
 * Patches run in priority order so later mods "win".
 */
export async function getModdedRule(campaignId, target, field, defaultValue) {
  const mods = await loadCampaignMods(campaignId);
  let value = defaultValue;
  for (const mod of mods) {
    for (const patch of (mod.pinned_patches || [])) {
      if (patch.target !== target || patch.field !== field) continue;
      if (patch.operation === "override") value = patch.value;
      else if (patch.operation === "modify" && typeof value === "number") value = value + (Number(patch.value) || 0);
      else if (patch.operation === "extend" && Array.isArray(value)) value = [...value, ...(Array.isArray(patch.value) ? patch.value : [patch.value])];
    }
  }
  return value;
}

/**
 * Build the mod_dependencies array a character row should carry based
 * on the race / class objects the creator selected. Anything with
 * `_source === "brewery"` contributes an entry. Pass the selected
 * race / class / subclass objects as they flow out of the creator's
 * wizard state; non-mod entries produce no dependency tags.
 */
export function buildModDependencies({ race, cls, subclass } = {}) {
  const deps = [];
  const push = (obj, type) => {
    if (!obj) return;
    if (obj._source !== "brewery") return;
    if (!obj._mod_id) return;
    deps.push({
      mod_id: obj._mod_id,
      mod_name: obj._mod_name || obj.name || "Unnamed mod",
      mod_type: type,
    });
  };
  push(race,     "race");
  push(cls,      "class");
  push(subclass, "subclass");
  return deps;
}

export async function getModdedRaces(campaignId) {
  const mods = await loadCampaignMods(campaignId);
  return mods
    .filter((m) => m.pinned_metadata?.mod_type === "race")
    .map((m) => ({ ...m.pinned_metadata, _source: "brewery", _mod_id: m.mod_id, _mod_name: m.pinned_metadata?.name }));
}

export async function getModdedClasses(campaignId) {
  const mods = await loadCampaignMods(campaignId);
  return mods
    .filter((m) => m.pinned_metadata?.mod_type === "class")
    .map((m) => ({ ...m.pinned_metadata, _source: "brewery", _mod_id: m.mod_id, _mod_name: m.pinned_metadata?.name }));
}

/**
 * Check whether a character's declared mod dependencies are satisfied
 * by a given campaign. Returns { compatible, missing[] } where each
 * missing entry carries { mod_id, mod_name, mod_type }.
 */
export async function checkCharacterCompatibility(character, campaignId) {
  const deps = Array.isArray(character?.mod_dependencies) ? character.mod_dependencies : [];
  if (deps.length === 0) return { compatible: true, missing: [] };
  const mods = await loadCampaignMods(campaignId);
  const installed = new Set(mods.map((m) => m.mod_id));
  const missing = deps.filter((d) => !installed.has(d.mod_id));
  return { compatible: missing.length === 0, missing };
}

/**
 * Install a mod into a campaign. Snapshots the mod's current version,
 * patches, and metadata into the install row (version pinning). Rejects
 * when the mod's game_system doesn't match the campaign's.
 * Returns { success } or { success: false, conflicts, reason }.
 */
export async function installMod(campaignId, modId, userId) {
  const { data: mod, error: modErr } = await supabase
    .from("brewery_mods")
    .select("*")
    .eq("id", modId)
    .single();
  if (modErr || !mod) return { success: false, reason: "Mod not found." };

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("game_system")
    .eq("id", campaignId)
    .single();
  const campaignSystem = campaign?.game_system || "dnd5e";
  if (mod.game_system && mod.game_system !== campaignSystem) {
    return {
      success: false,
      reason: `This mod is for ${mod.game_system} but this campaign uses ${campaignSystem}.`,
    };
  }

  const conflicts = await checkConflicts(campaignId, mod);
  if (conflicts.length > 0) {
    return { success: false, conflicts };
  }

  const { error: insErr } = await supabase.from("campaign_installed_mods").insert({
    campaign_id: campaignId,
    mod_id: modId,
    installed_by: userId,
    installed_version: mod.version || "1.0.0",
    pinned_patches: mod.patches || [],
    pinned_metadata: {
      ...(mod.metadata || {}),
      mod_type: mod.mod_type,
      name: mod.name,
    },
    status: "active",
  });
  if (insErr) return { success: false, reason: insErr.message };

  invalidateModCache(campaignId);
  return { success: true };
}

/**
 * Detect patches that collide with already-installed mods. Two mods
 * that both `override` the same target/field are flagged as conflicts
 * so the GM sees it before the install commits.
 */
export async function checkConflicts(campaignId, incomingMod) {
  const mods = await loadCampaignMods(campaignId);
  const conflicts = [];
  const incomingPatches = Array.isArray(incomingMod?.patches) ? incomingMod.patches : [];
  for (const patch of incomingPatches) {
    if (patch.operation !== "override") continue;
    for (const existing of mods) {
      for (const ep of (existing.pinned_patches || [])) {
        if (ep.operation !== "override") continue;
        if (ep.target === patch.target && ep.field === patch.field) {
          conflicts.push({
            mod_name: existing.pinned_metadata?.name || "Unknown",
            target: patch.target,
            field: patch.field,
          });
        }
      }
    }
  }
  return conflicts;
}

/**
 * Uninstall gate. Returns { warning, affected_characters, message }
 * when characters in the campaign depend on this mod — the caller
 * surfaces a confirm dialog and calls forceUninstallMod() to proceed.
 */
export async function uninstallMod(campaignId, modId) {
  const { data: dependentChars } = await supabase
    .from("characters")
    .select("id, name, mod_dependencies")
    .eq("campaign_id", campaignId);
  const affected = (dependentChars || []).filter((c) =>
    Array.isArray(c.mod_dependencies) && c.mod_dependencies.some((d) => d.mod_id === modId),
  );
  if (affected.length > 0) {
    return {
      success: false,
      warning: true,
      affected_characters: affected.map((c) => c.name).filter(Boolean),
      message: `${affected.length} character(s) depend on this mod: ${affected.map((c) => c.name).filter(Boolean).join(", ")}. Uninstalling may break them.`,
    };
  }
  const { error } = await supabase
    .from("campaign_installed_mods")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("mod_id", modId);
  if (error) return { success: false, reason: error.message };
  invalidateModCache(campaignId);
  return { success: true };
}

export async function forceUninstallMod(campaignId, modId) {
  await supabase
    .from("campaign_installed_mods")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("mod_id", modId);
  invalidateModCache(campaignId);
}

export async function setModStatus(campaignId, modId, status) {
  await supabase
    .from("campaign_installed_mods")
    .update({ status })
    .eq("campaign_id", campaignId)
    .eq("mod_id", modId);
  invalidateModCache(campaignId);
}

export async function setModPriority(campaignId, modId, priority) {
  await supabase
    .from("campaign_installed_mods")
    .update({ priority })
    .eq("campaign_id", campaignId)
    .eq("mod_id", modId);
  invalidateModCache(campaignId);
}

// ───────────────────────── Validation ─────────────────────────────

const VALID_TARGETS = [
  "rest_rules", "death_saves", "critical_hits", "initiative",
  "healing", "conditions", "ability_scores", "combat", "magic",
  "encumbrance", "progression", "economy", "races", "classes",
];
const VALID_OPERATIONS = ["override", "extend", "modify"];

/**
 * Guard against unsafe expressions before any runtime eval of a
 * code-mod formula. We don't actually eval here — just syntactic
 * sanity checks — because the engine that runs formulas will come in
 * a later part. Catches: empty strings, disallowed tokens (import,
 * require, window, document, global, process, eval, Function,
 * constructor).
 */
export function validateFormula(formula) {
  if (typeof formula !== "string" || !formula.trim()) {
    throw new Error("formula is empty");
  }
  const banned = /\b(import|require|window|document|globalThis|global|process|eval|Function|constructor|__proto__)\b/;
  if (banned.test(formula)) throw new Error("formula contains a banned identifier");
  // Allow digits, letters, arithmetic, whitespace, parens, dots,
  // underscores, and the math operators. Anything else is rejected.
  const allowed = /^[a-zA-Z0-9_. \t\n\r+\-*/()?:%<>=&|!,]+$/;
  if (!allowed.test(formula)) throw new Error("formula contains disallowed characters");
  return true;
}

/**
 * Run validation over every mod installed in a campaign. Each broken
 * mod is flipped to status='error' + error_message is populated so
 * the session-start gate + Campaign Settings UI can surface what's
 * wrong. Returns a list of { mod_id, mod_name, errors[] }.
 */
export async function validateInstalledMods(campaignId) {
  const mods = await loadCampaignMods(campaignId);
  const report = [];
  for (const mod of mods) {
    const modErrors = [];
    const patches = Array.isArray(mod.pinned_patches) ? mod.pinned_patches : [];
    for (const patch of patches) {
      if (!patch || typeof patch !== "object") {
        modErrors.push("Malformed patch entry.");
        continue;
      }
      if (!patch.target || !VALID_TARGETS.includes(patch.target)) {
        modErrors.push(`Unknown target: "${patch.target}"`);
      }
      if (!VALID_OPERATIONS.includes(patch.operation)) {
        modErrors.push(`Invalid operation: "${patch.operation}"`);
      }
      if (patch.value === undefined) {
        modErrors.push(`Missing value for ${patch.target}.${patch.field}`);
      }
    }
    const triggers = Array.isArray(mod.pinned_metadata?.triggers) ? mod.pinned_metadata.triggers : [];
    for (const trigger of triggers) {
      if (trigger?.formula) {
        try { validateFormula(trigger.formula); }
        catch (err) { modErrors.push(`Bad formula in "${trigger.name || "unnamed"}": ${err.message}`); }
      }
    }
    if (modErrors.length > 0) {
      report.push({
        mod_id: mod.mod_id,
        install_id: mod.id,
        mod_name: mod.pinned_metadata?.name || "Unknown mod",
        errors: modErrors,
      });
      try {
        await supabase
          .from("campaign_installed_mods")
          .update({ status: "error", error_message: modErrors.join("; ") })
          .eq("id", mod.id);
      } catch (err) {
        console.warn("failed to flag mod as error:", err?.message || err);
      }
    }
  }
  return report;
}
