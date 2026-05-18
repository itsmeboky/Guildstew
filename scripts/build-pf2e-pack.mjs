#!/usr/bin/env node
/**
 * Build PF2e adapter modules from the pruned Foundry source dump.
 *
 *   Source:  src/game-packs/pf2e/pf2e-foundry-source/packs/pf2e/<pack>/...
 *   Output:  src/game-packs/pf2e/{data,content}/<pack>.js
 *
 * Run with:  node scripts/build-pf2e-pack.mjs
 *
 * Why this exists
 * ===============
 *
 * The character creator can't import 11,000+ individual JSON files at
 * runtime — that would tank cold-start and blow past every code-
 * splitting heuristic. This script reads the Foundry source once at
 * build time, trims each entity down to the fields the app actually
 * reads, groups them into per-pack JS modules, and writes them under
 * src/game-packs/pf2e/data/ (mechanic data) and content/ (browsable
 * picker data).
 *
 * Re-run the script after updating the source dump. The generated
 * modules are committed alongside the source diff for reproducibility.
 *
 * License posture
 * ===============
 *
 * Source content is hybrid-licensed (Apache 2.0 code + ORC Remaster +
 * OGL 1.0a legacy + Paizo CUP trademarks) per
 * LICENSES/PATHFINDER_2E.md. Each generated module file gets a short
 * header re-stating which license layer it inherits, so a downstream
 * reader doesn't need to trace it back.
 *
 * The `publication` field is preserved verbatim on every entity so the
 * UI can surface which Paizo book a row came from, and so future
 * build-time filters can drop pre-Remaster legacy rows by checking
 * `publication.title`.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOT = path.join(
  REPO_ROOT,
  "src/game-packs/pf2e/pf2e-foundry-source/packs/pf2e",
);
const DATA_OUT = path.join(REPO_ROOT, "src/game-packs/pf2e/data");
const CONTENT_OUT = path.join(REPO_ROOT, "src/game-packs/pf2e/content");

// ----------------------------------------------------------------------------
// Generic walk + load
// ----------------------------------------------------------------------------

async function walkJson(dir) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return results;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkJson(full)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      // Foundry stores compendium folder layout in _folders.json
      // alongside the content. Skip — it's not a real entity.
      if (entry.name === "_folders.json") continue;
      const text = await fs.readFile(full, "utf8");
      try {
        const parsed = JSON.parse(text);
        results.push({ path: full, json: parsed });
      } catch (err) {
        console.warn(`! skipping malformed JSON: ${full} (${err.message})`);
      }
    }
  }
  return results;
}

// ----------------------------------------------------------------------------
// Per-pack trimmers — strip Foundry-runtime junk, keep what the app uses
// ----------------------------------------------------------------------------

// Shared description shape: Foundry stores rich-text under
// system.description.value. We keep the raw HTML string so the app can
// sanitize + render. Stripping HTML at build time would lose paragraph
// structure / tables / links that the picker UI wants to display.
function pickDescription(system) {
  return system?.description?.value || "";
}

function pickPublication(system) {
  // Source book metadata — used to filter ORC vs OGL content later.
  if (!system?.publication) return null;
  const p = system.publication;
  return {
    title: p.title || "",
    license: p.license || "",
    remaster: !!p.remaster,
  };
}

// Ancestry — directly drives the ancestry-picker step.
function trimAncestry({ name, system }) {
  return {
    name,
    hp: system?.hp ?? 0,
    size: system?.size || "med",
    speed: system?.speed ?? 25,
    boosts: system?.boosts || {},
    flaws: system?.flaws || {},
    languages: system?.languages || {},
    additionalLanguages: system?.additionalLanguages || {},
    vision: system?.vision || "normal",
    traits: system?.traits || {},
    reach: system?.reach ?? 5,
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Heritage — sub-ancestry option.
function trimHeritage({ name, system }) {
  return {
    name,
    ancestry: system?.ancestry?.slug || system?.ancestry?.value || null,
    traits: system?.traits || {},
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Background — gives ability boosts + skill + lore + feat.
function trimBackground({ name, system }) {
  return {
    name,
    boosts: system?.boosts || {},
    trainedSkills: system?.trainedSkills || {},
    trainedLore: system?.trainedLore || "",
    items: system?.items || {},
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Class — major picker entity.
function trimClass({ name, system }) {
  return {
    name,
    keyAbility: system?.keyAbility || {},
    hp: system?.hp ?? 8,
    perception: system?.perception ?? 0,
    savingThrows: system?.savingThrows || {},
    attacks: system?.attacks || {},
    defenses: system?.defenses || {},
    trainedSkills: system?.trainedSkills || {},
    classDC: system?.classDC ?? 0,
    ancestryFeatLevels: system?.ancestryFeatLevels || {},
    classFeatLevels: system?.classFeatLevels || {},
    generalFeatLevels: system?.generalFeatLevels || {},
    skillFeatLevels: system?.skillFeatLevels || {},
    skillIncreaseLevels: system?.skillIncreaseLevels || {},
    items: system?.items || {},
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Feat — many thousands; keep the fields the picker filters by.
function trimFeat({ name, system }) {
  return {
    name,
    level: system?.level?.value ?? 1,
    category: system?.category || "general",
    actionType: system?.actionType?.value || null,
    actions: system?.actions?.value ?? null,
    prerequisites: system?.prerequisites?.value || [],
    traits: system?.traits || {},
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Spell — focus / ritual / spell flavors.
function trimSpell({ name, system }) {
  return {
    name,
    rank: system?.level?.value ?? 1, // Remaster term
    traditions: system?.traits?.traditions || [],
    category: system?.category?.value || "spell",
    actions: system?.time?.value || "",
    range: system?.range?.value || "",
    targets: system?.target?.value || "",
    area: system?.area || null,
    duration: system?.duration?.value || "",
    defense: system?.defense || null,
    traits: system?.traits || {},
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Equipment — weapons, armor, consumables, gear.
function trimEquipment({ name, system, type }) {
  return {
    name,
    type, // weapon / armor / consumable / equipment / treasure / etc.
    level: system?.level?.value ?? 0,
    price: system?.price?.value || {},
    bulk: system?.bulk?.value ?? 0,
    traits: system?.traits || {},
    usage: system?.usage?.value || null,
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Condition — fear, frightened, prone, etc.
function trimCondition({ name, system }) {
  return {
    name,
    value: system?.value?.value ?? null,
    traits: system?.traits || {},
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Deity — cleric picker entity.
function trimDeity({ name, system }) {
  return {
    name,
    alignment: system?.alignment || {},
    sanctification: system?.sanctification || null,
    edicts: system?.edicts || [],
    anathema: system?.anathema || [],
    domains: system?.domains || {},
    font: system?.font || [],
    spells: system?.spells || {},
    weapons: system?.weapons || [],
    skill: system?.skill || [],
    ability: system?.ability || [],
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// Generic — for class-features, ancestry-features, feat-effects, etc.
// We don't introspect their full schema yet; preserve name + system
// wholesale so consumers can read what they need. Strip Foundry runtime
// junk only.
function trimGeneric({ name, type, system }) {
  return {
    name,
    type,
    level: system?.level?.value ?? null,
    traits: system?.traits || {},
    actions: system?.actions?.value ?? null,
    actionType: system?.actionType?.value ?? null,
    description: pickDescription(system),
    publication: pickPublication(system),
  };
}

// ----------------------------------------------------------------------------
// Pack registry — which subdir → which output module + which trimmer
// ----------------------------------------------------------------------------

const PACKS = [
  // --- Picker-essential data (drives the creator step UIs) ----------
  { dir: "ancestries",          out: ["content", "ancestries.js"],          trimmer: trimAncestry },
  { dir: "heritages",           out: ["content", "heritages.js"],           trimmer: trimHeritage },
  { dir: "backgrounds",         out: ["content", "backgrounds.js"],         trimmer: trimBackground },
  { dir: "classes",             out: ["content", "classes.js"],             trimmer: trimClass },
  { dir: "deities",             out: ["content", "deities.js"],             trimmer: trimDeity },

  // --- Mechanic data --------------------------------------------------
  { dir: "conditions",          out: ["data",    "conditions.js"],          trimmer: trimCondition },

  // --- Large piles (feats + spells + equipment) -----------------------
  // These are by far the biggest packs. Keep them as separate modules
  // so per-category code-splitting works (Spells step doesn't pay the
  // feat-module cost, etc.).
  { dir: "feats",               out: ["content", "feats.js"],               trimmer: trimFeat },
  { dir: "spells",              out: ["content", "spells.js"],              trimmer: trimSpell },
  { dir: "equipment",           out: ["content", "equipment.js"],           trimmer: trimEquipment },

  // --- Features + effects (mostly system-side, referenced by class) --
  { dir: "class-features",      out: ["data",    "classFeatures.js"],       trimmer: trimGeneric },
  { dir: "ancestry-features",   out: ["data",    "ancestryFeatures.js"],    trimmer: trimGeneric },
  { dir: "familiar-abilities",  out: ["data",    "familiarAbilities.js"],   trimmer: trimGeneric },
  { dir: "actions",             out: ["data",    "actions.js"],             trimmer: trimGeneric },
  { dir: "feat-effects",        out: ["data",    "featEffects.js"],         trimmer: trimGeneric },
  { dir: "spell-effects",       out: ["data",    "spellEffects.js"],        trimmer: trimGeneric },
  { dir: "equipment-effects",   out: ["data",    "equipmentEffects.js"],    trimmer: trimGeneric },
  { dir: "other-effects",       out: ["data",    "otherEffects.js"],        trimmer: trimGeneric },
];

// ----------------------------------------------------------------------------
// Module emitter
// ----------------------------------------------------------------------------

const FILE_HEADER = (packName, count) => `/**
 * PF2e — ${packName} (${count} entries)
 *
 * AUTO-GENERATED by scripts/build-pf2e-pack.mjs. DO NOT EDIT BY HAND.
 * Re-run the script after updating the Foundry source dump.
 *
 * License: hybrid (Apache 2.0 code + ORC Remaster + OGL 1.0a legacy +
 * Paizo CUP trademarks). Full attribution at
 * LICENSES/PATHFINDER_2E.md. Each entry retains its \`publication\`
 * field so downstream filters can split by source book / license.
 */

`;

async function buildPack(pack) {
  const sourceDir = path.join(SOURCE_ROOT, pack.dir);
  const entries = await walkJson(sourceDir);

  // Type field varies — some packs (equipment) split type across many
  // files like weapon.json / armor.json. We pull it from the top-level
  // `type` if present so the trimmer has it.
  const trimmed = entries
    .map(({ json }) => pack.trimmer({ name: json.name, type: json.type, system: json.system }))
    .filter((entity) => entity && entity.name);

  const constName = pack.dir.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
  const safeName = constName.replace(/^([A-Z])/, (m) => m.toLowerCase());
  const body =
    FILE_HEADER(pack.dir, trimmed.length) +
    `export const ${safeName} = ${JSON.stringify(trimmed, null, 2)};\n\n` +
    `export default ${safeName};\n`;

  const outPath = path.join(REPO_ROOT, "src/game-packs/pf2e", ...pack.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, body, "utf8");

  return { pack: pack.dir, count: trimmed.length, outPath };
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  console.log(`PF2e build — source root: ${SOURCE_ROOT}`);
  try {
    await fs.access(SOURCE_ROOT);
  } catch {
    console.error(`! source root not found: ${SOURCE_ROOT}`);
    console.error(`  the pf2e-foundry-source dump must be present`);
    process.exit(1);
  }

  const results = [];
  for (const pack of PACKS) {
    try {
      const result = await buildPack(pack);
      results.push(result);
      const rel = path.relative(REPO_ROOT, result.outPath);
      console.log(`  ${rel.padEnd(48)}  ${String(result.count).padStart(5)} entries`);
    } catch (err) {
      console.error(`! failed to build pack ${pack.dir}: ${err.message}`);
      console.error(err.stack);
    }
  }

  const total = results.reduce((s, r) => s + r.count, 0);
  console.log(`\n  ${results.length} packs built, ${total} entries total.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
