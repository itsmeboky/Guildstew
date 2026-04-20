import { supabase } from "@/api/supabaseClient";
import {
  installContentPack,
  uninstallContentPack,
} from "@/lib/breweryContentPack";
import { validateFormula, evaluateFormula } from "@/lib/formulaEvaluator";

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
  // Trigger-gate counters are scoped to the campaign's install
  // list; wipe them whenever that list could have changed so a
  // "once per round" gate from an uninstalled mod doesn't linger.
  if (typeof gateTracker !== "undefined" && gateTracker?.clear) {
    if (campaignId) {
      for (const key of Array.from(gateTracker.keys())) {
        if (key.startsWith(`${campaignId}:`)) gateTracker.delete(key);
      }
    } else {
      gateTracker.clear();
    }
  }
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
export async function installMod(campaignId, modId, userId, { configValues } = {}) {
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

  // Code mods pin `config_values` onto pinned_metadata so formulas
  // can resolve config.<key> at runtime. The caller's `configValues`
  // object overrides per-param defaults; any param the caller didn't
  // supply falls back to the creator's default.
  const pinnedMetadata = {
    ...(mod.metadata || {}),
    mod_type: mod.mod_type,
    name: mod.name,
  };
  if (mod.mod_type === "code_mod") {
    const schema = Array.isArray(mod.metadata?.config_schema) ? mod.metadata.config_schema : [];
    const merged = {};
    for (const p of schema) {
      if (!p?.key) continue;
      merged[p.key] = configValues && Object.prototype.hasOwnProperty.call(configValues, p.key)
        ? configValues[p.key]
        : p.default;
    }
    pinnedMetadata.config_values = merged;
  }

  const { error: insErr } = await supabase.from("campaign_installed_mods").insert({
    campaign_id: campaignId,
    mod_id: modId,
    installed_by: userId,
    installed_version: mod.version || "1.0.0",
    pinned_patches: mod.patches || [],
    pinned_metadata: pinnedMetadata,
    status: "active",
  });
  if (insErr) return { success: false, reason: insErr.message };

  // Content packs ship pre-bundled monsters / items / spells /
  // class features that get copied into the campaign's homebrew
  // tables, tagged with the pack's mod id so uninstall can pull
  // them cleanly.
  if (mod.mod_type === "content_pack") {
    const result = await installContentPack(campaignId, modId, mod.metadata);
    if (!result.success) {
      // Roll back the install row so the mod doesn't appear
      // half-installed if the content copy failed.
      await supabase
        .from("campaign_installed_mods")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("mod_id", modId);
      return { success: false, reason: `Content pack install failed: ${result.reason}` };
    }
  }

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
  // Pull the install row first so we can detect content packs
  // and walk back any inserted campaign content.
  const { data: installRow } = await supabase
    .from("campaign_installed_mods")
    .select("pinned_metadata")
    .eq("campaign_id", campaignId)
    .eq("mod_id", modId)
    .maybeSingle();
  if (installRow?.pinned_metadata?.mod_type === "content_pack") {
    await uninstallContentPack(campaignId, modId);
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
  const { data: installRow } = await supabase
    .from("campaign_installed_mods")
    .select("pinned_metadata")
    .eq("campaign_id", campaignId)
    .eq("mod_id", modId)
    .maybeSingle();
  if (installRow?.pinned_metadata?.mod_type === "content_pack") {
    await uninstallContentPack(campaignId, modId);
  }
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
 * code-mod formula. Delegates to the real parser in
 * src/lib/formulaEvaluator.js so session-start validation and the
 * creator form's on-blur check use identical rules — no
 * double-standards, no divergence between "looks safe" and
 * "actually runs." The parser rejects unknown identifiers, unknown
 * functions, bad dice notation, and any token outside the
 * whitelisted grammar.
 */
export { validateFormula };

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

/**
 * Resolve the display label for a renameable game term against the
 * campaign's installed reskin mods. Walks every install row whose
 * pinned_metadata.mod_type is 'reskin' in priority order; the first
 * mod that has a rename for the requested (category, key) wins.
 *
 * Falls through to the source key when nothing matches, so callers
 * can use this as a drop-in label resolver everywhere a renameable
 * term renders.
 *
 * Categories:
 *   'ability'       — abilities[key].name        (key is "str" / "dex" / …)
 *   'abbreviation'  — abilities[key].abbreviation
 *   'term'          — terms[key]                 (key is original label, e.g. "Hit Points")
 *   'damage_type'   — damage_types[key]          (key is lowercase damage type)
 *   'condition'     — conditions[key]            (key is condition name)
 */
/**
 * Merge every installed sheet_mod's `sheet_changes` blob into a
 * single aggregate view the character sheet can consume. Later
 * mods stack on top of earlier ones (priority order maintained by
 * loadCampaignMods); duplicate skill names / section names are
 * kept as-is so the sheet can render them in install order.
 *
 * Returns {
 *   add_skills:                [{ name, ability, description }],
 *   remove_skills:             string[],
 *   rename_skills:             { [orig]: replacement },
 *   add_proficiency_categories:[{ name, items: string[] }],
 *   add_sections:              [{ name, position, fields: [...] }],
 *   remove_sections:           string[],
 * }
 *
 * Always returns the full shape so callers can destructure without
 * null-checking.
 */
export async function getSheetModifications(campaignId) {
  const mods = await loadCampaignMods(campaignId);
  const result = {
    add_skills: [],
    remove_skills: [],
    rename_skills: {},
    add_proficiency_categories: [],
    add_sections: [],
    remove_sections: [],
  };
  for (const mod of mods) {
    if (mod?.pinned_metadata?.mod_type !== "sheet_mod") continue;
    const changes = mod.pinned_metadata.sheet_changes || {};
    if (Array.isArray(changes.add_skills)) result.add_skills.push(...changes.add_skills);
    if (Array.isArray(changes.remove_skills)) result.remove_skills.push(...changes.remove_skills);
    if (changes.rename_skills && typeof changes.rename_skills === "object") {
      Object.assign(result.rename_skills, changes.rename_skills);
    }
    if (Array.isArray(changes.add_proficiency_categories)) {
      result.add_proficiency_categories.push(...changes.add_proficiency_categories);
    }
    if (Array.isArray(changes.add_sections)) result.add_sections.push(...changes.add_sections);
    if (Array.isArray(changes.remove_sections)) result.remove_sections.push(...changes.remove_sections);
  }
  // Dedupe remove_skills so a character sheet iterating over them
  // doesn't see the same name twice when two mods both strip it.
  result.remove_skills = Array.from(new Set(result.remove_skills));
  return result;
}

/**
 * Slugify a section name so custom-section data can hang off a
 * stable key on characterData.stats.mod_data. Matches the shape
 * the character sheet writer + reader expect in step 5.
 */
export function sheetSectionSlug(name) {
  return (name || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getDisplayName(campaignMods, category, key) {
  if (!Array.isArray(campaignMods) || campaignMods.length === 0) return key;
  for (const mod of campaignMods) {
    if (mod?.pinned_metadata?.mod_type !== "reskin") continue;
    const r = mod.pinned_metadata.renames || {};
    if (category === "ability" && r.abilities?.[key]?.name)         return r.abilities[key].name;
    if (category === "abbreviation" && r.abilities?.[key]?.abbreviation) return r.abilities[key].abbreviation;
    if (category === "term" && r.terms?.[key])                       return r.terms[key];
    if (category === "damage_type" && r.damage_types?.[key])         return r.damage_types[key];
    if (category === "condition" && r.conditions?.[key])             return r.conditions[key];
  }
  return key;
}

// ──────────── Layer 3 code-mod runtime dispatch ────────────

// Per-campaign gate tracking keeps track of "once per turn /
// round / rest" triggers. Cleared when the campaign mod cache is
// invalidated (installMod / uninstallMod) so stale gate counts
// don't persist across install changes.
const gateTracker = new Map(); // key: `${campaignId}:${modInstallId}:${triggerId}:${scope}` → count

function trackerKey(campaignId, installId, triggerId, scope) {
  return `${campaignId}:${installId}:${triggerId}:${scope}`;
}

export function resetTriggerGates(campaignId, scope = "all") {
  if (!campaignId) return;
  for (const key of Array.from(gateTracker.keys())) {
    if (!key.startsWith(`${campaignId}:`)) continue;
    if (scope === "all" || key.endsWith(`:${scope}`)) gateTracker.delete(key);
  }
}

function gateScope(gate) {
  if (gate === "once_per_turn")    return "turn";
  if (gate === "once_per_round")   return "round";
  if (gate === "once_per_rest")    return "rest";
  if (gate === "proficiency_bonus") return "rest";
  return null; // unlimited
}

function canFireGate(campaignId, installId, trigger, context) {
  const scope = gateScope(trigger.gate);
  if (!scope) return true;
  const key = trackerKey(campaignId, installId, trigger.id || "_", scope);
  const used = gateTracker.get(key) || 0;
  if (trigger.gate === "proficiency_bonus") {
    const cap = Number(context?.actor?.prof) || 0;
    return used < Math.max(1, cap);
  }
  return used === 0;
}

function recordGateUse(campaignId, installId, trigger) {
  const scope = gateScope(trigger.gate);
  if (!scope) return;
  const key = trackerKey(campaignId, installId, trigger.id || "_", scope);
  gateTracker.set(key, (gateTracker.get(key) || 0) + 1);
}

/**
 * Whether a trigger's filters match the combat event context.
 * `filters` is shaped { source, weapon_type, damage_type, ... };
 * missing fields default to "any" and always match.
 */
function matchesFilters(filters, context) {
  if (!filters) return true;
  const f = filters;
  if (f.source && f.source !== "any") {
    if ((context.source || "any") !== f.source) return false;
  }
  if (f.weapon_type && f.weapon_type !== "any") {
    if ((context.weapon_type || "any") !== f.weapon_type) return false;
  }
  if (f.damage_type && f.damage_type !== "any") {
    if ((context.damage_type || "any") !== f.damage_type) return false;
  }
  if (f.creature_type && f.creature_type !== "any") {
    if ((context.creature_type || "any") !== f.creature_type) return false;
  }
  return true;
}

/**
 * Walk every installed code_mod at the given event point,
 * evaluate each matching trigger's formula against the live
 * context, and return a list of resolved effects for the combat
 * layer to apply. Runtime formula errors are caught per-trigger:
 * the bad mod gets flipped to status='error' + error_message so
 * the session-start gate surfaces it on the next reload, but
 * combat is NEVER interrupted — other triggers keep firing.
 *
 * Returns [{ mod_id, mod_name, trigger_id, trigger_name,
 *            effect_type, effect, result, description }]
 * with { error } on failed rows so the UI can show a warning
 * banner.
 */
export async function checkModTriggers(campaignId, eventType, context = {}) {
  const mods = await loadCampaignMods(campaignId);
  const results = [];

  for (const mod of mods) {
    if (mod.status !== "active") continue;
    if (mod?.pinned_metadata?.mod_type !== "code_mod") continue;
    const triggers = Array.isArray(mod.pinned_metadata.triggers) ? mod.pinned_metadata.triggers : [];

    for (const trigger of triggers) {
      if (!trigger || trigger.event !== eventType) continue;
      if (!matchesFilters(trigger.filters, context)) continue;
      if (!canFireGate(campaignId, mod.id, trigger, context)) continue;

      const formulaContext = {
        actor: context.actor || {},
        target: context.target || {},
        config: mod.pinned_metadata?.config_values || {},
        weapon_damage_dice: context.weapon_damage_dice || 0,
        spell_level: context.spell_level || 0,
        damage_dealt: context.damage_dealt || 0,
        roll_result: context.roll_result || 0,
        save_dc: context.save_dc || 0,
      };

      try {
        const effect = { ...(trigger.effect || {}) };
        const formula = effect.formula;
        const value = formula ? evaluateFormula(formula, formulaContext) : null;
        // DC formulas (save / force_save) evaluate the same way.
        const dcFormulaSource = effect.save_dc_formula || effect.dc_formula;
        const dc = dcFormulaSource ? evaluateFormula(dcFormulaSource, formulaContext) : null;

        recordGateUse(campaignId, mod.id, trigger);
        results.push({
          mod_id: mod.mod_id,
          install_id: mod.id,
          mod_name: mod.pinned_metadata?.name || "Unknown mod",
          trigger_id: trigger.id,
          trigger_name: trigger.name,
          effect_type: effect.type,
          effect,
          result: value,
          dc,
          description: effect.description || trigger.description || "",
        });
      } catch (err) {
        console.error(
          `[ModEngine] Formula error in "${mod.pinned_metadata?.name}" / "${trigger?.name}":`,
          err,
        );
        const message = `Runtime error in "${trigger?.name || "trigger"}": ${err?.message || err}`;
        try {
          await supabase
            .from("campaign_installed_mods")
            .update({ status: "error", error_message: message })
            .eq("id", mod.id);
        } catch (dbErr) {
          console.warn("failed to flag mod as error:", dbErr?.message || dbErr);
        }
        results.push({
          mod_id: mod.mod_id,
          install_id: mod.id,
          mod_name: mod.pinned_metadata?.name || "Unknown mod",
          trigger_id: trigger.id,
          trigger_name: trigger?.name || "unnamed",
          error: err?.message || String(err),
        });
      }
    }
  }

  return results;
}
