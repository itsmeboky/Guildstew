// src/game-packs/pf2e/scripts/import-foundry.mjs
// Run with: node src/game-packs/pf2e/scripts/import-foundry.mjs
// Reads Foundry pf2e source at FOUNDRY_PATH and writes Guildstew-shaped JSON
// to src/game-packs/pf2e/data/.
//
// Run-once per Foundry version bump. Output files ARE committed to git.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolved relative to the repo so the script works in any environment.
// Override with FOUNDRY_PATH env var if your source lives elsewhere.
const FOUNDRY_PATH = process.env.FOUNDRY_PATH
  || path.resolve(__dirname, '../pf2e-foundry-source/packs/pf2e');
const OUT = path.join(__dirname, '..', 'data');

// Foundry's pruned source layout uses bare directory names, not the
// `-srd` suffix the original importer assumed. Map output-file names
// to the actual source dirs the pruned dump ships.
const PACK_DIR = {
  'feats-srd':     'feats',
  'spells-srd':    'spells',
  'equipment-srd': 'equipment',
  'ancestries':    'ancestries',
  'backgrounds':   'backgrounds',
  'classes':       'classes',
};

// === LICENSING TIERS ===
// Tier 1: Ship as-is (ORC, Player Core scope)
const TIER_1_SOURCES = new Set([
  'Pathfinder Player Core',
  'Pathfinder Player Core 2',
  'Pathfinder GM Core',
  'Pathfinder Monster Core',
  'Pathfinder Monster Core 2',
  'Pathfinder NPC Core',
  'Pathfinder Treasure Vault',
]);

// Tier 2: Ship with flavor scrub (mechanics OK, Lost Omens flavor text replaced)
const TIER_2_SOURCES = new Set([
  'Pathfinder Guns & Gears',
  'Pathfinder Howl of the Wild',
  'Pathfinder Battlecry!',
  'Pathfinder War of Immortals',
  'Pathfinder Dark Archive',
  'Pathfinder Rage of Elements',
]);

// Tier 3: NEVER ship (Lost Omens, APs, Society, OGL legacy, iconics)
function isTier3(src) {
  return /Lost Omens|Adventure Path|Pathfinder Society|Player Companion|Bestiary 1|Bestiary 2|Bestiary 3|Core Rulebook|Advanced Player|Iconics/i.test(src || '');
}

// === FLAVOR SCRUB ===
// Replace Lost Omens proper nouns in Tier 2 description text with generic equivalents
const FLAVOR_REPLACEMENTS = [
  [/Iomedae/gi, 'the Champion deity'],
  [/Sarenrae/gi, 'the Sun deity'],
  [/Pharasma/gi, 'the Death deity'],
  [/Asmodeus/gi, 'the Tyrant deity'],
  [/Cayden Cailean/gi, 'the Freedom deity'],
  [/Desna/gi, 'the Wanderer deity'],
  [/Golarion/gi, 'the world'],
  [/Cheliax/gi, 'a hellbound empire'],
  [/Absalom/gi, 'the great metropolis'],
  // ... extend per release. Keep the list versioned in scripts/flavor-scrub.json
];

function scrub(text) {
  if (!text) return text;
  return FLAVOR_REPLACEMENTS.reduce((t, [pat, rep]) => t.replace(pat, rep), text);
}

function stripHTML(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// === GENERIC ITEM READER ===
// Recursive walker — spells/ and feats/ are subdivided in the
// pruned Foundry source (spells/{focus,rituals,spells},
// feats/{ancestry,archetype,class,general,miscellaneous,mythic,skill}).
// Skip Foundry's _folders.json compendium-tree metadata.
function walkJsonSync(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonSync(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== '_folders.json') {
      try {
        acc.push(JSON.parse(fs.readFileSync(full, 'utf8')));
      } catch (err) {
        console.warn(`! skipping malformed JSON: ${full} (${err.message})`);
      }
    }
  }
  return acc;
}

function readPack(outFilename) {
  const sourceDir = PACK_DIR[outFilename] || outFilename;
  const dir = path.join(FOUNDRY_PATH, sourceDir);
  if (!fs.existsSync(dir)) {
    console.warn(`Pack not found: ${dir}`);
    return [];
  }
  return walkJsonSync(dir);
}

function publicationOK(item) {
  const src = item?.system?.publication?.title || '';
  if (isTier3(src)) return null;
  if (TIER_1_SOURCES.has(src)) return 'tier1';
  if (TIER_2_SOURCES.has(src)) return 'tier2';
  return null; // unrecognized source → skip
}

function getDesc(item, tier) {
  const raw = stripHTML(item?.system?.description?.value);
  return tier === 'tier2' ? scrub(raw) : raw;
}

// === TRANSFORMERS ===

function transformFeat(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  return {
    id: item._id || item.flags?.core?.sourceId,
    name: scrub(item.name),
    level: sys.level?.value || 1,
    actions: sys.actions?.value ?? (sys.actionType?.value === 'reaction' ? 'reaction'
              : sys.actionType?.value === 'free' ? 'free'
              : sys.actionType?.value === 'passive' ? 'passive' : 1),
    traits: sys.traits?.value || [],
    prereqs: (sys.prerequisites?.value || []).map(p => p.value),
    desc: getDesc(item, tier),
    category: sys.category, // skill | general | class | ancestry | classfeature | archetype
    source: sys.publication?.title,
    publication: sys.publication,
    tier,
  };
}

function transformSpell(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  return {
    id: item._id,
    name: scrub(item.name),
    rank: sys.level?.value || 0,
    traits: sys.traits?.value || [],
    traditions: sys.traits?.traditions || [],
    actions: sys.time?.value ?? sys.cast?.value ?? 2,
    range: sys.range?.value,
    duration: sys.duration?.value,
    save: sys.defense?.save?.statistic,
    desc: getDesc(item, tier),
    isCantrip: sys.traits?.value?.includes('cantrip'),
    isFocus: sys.category?.value === 'focus' || sys.traits?.value?.includes('focus'),
    isComposition: sys.traits?.value?.includes('composition'),
    source: sys.publication?.title,
    tier,
  };
}

function transformAncestry(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  return {
    // Heritages reference their parent via system.ancestry.slug.
    // Anchor the ancestry id to the same slug so attachHeritages()
    // joins cleanly regardless of which legacy id field is set.
    id: item.slug || item.name?.toLowerCase().replace(/\s+/g, '-') || item._id,
    name: scrub(item.name),
    hp: sys.hp || 8,
    size: sys.size || 'Medium',
    speed: sys.speed || 25,
    boosts: Object.values(sys.boosts || {}).flatMap(b => b.value || []),
    flaws: Object.values(sys.flaws || {}).flatMap(b => b.value || []),
    vision: sys.vision || 'normal',
    languages: sys.languages?.value || ['Common'],
    additionalLanguages: sys.additionalLanguages?.value || [],
    traits: sys.traits?.value || [],
    desc: getDesc(item, tier),
    source: sys.publication?.title,
    tier,
  };
}

function transformClass(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const slug = item.system?.slug || item.name?.toLowerCase().replace(/\s+/g, '-');
  return {
    id: item._id || item.slug || item.name?.toLowerCase().replace(/\s+/g, '-'),
    slug,
    name: scrub(item.name),
    hp: sys.hp || 8,
    keyAbility: sys.keyAbility?.value || [],
    // Foundry stores `trainedSkills.{value, additional}` — `value` is
    // the auto-trained skill list (slug strings) and `additional` is
    // the formula constant added to INT mod for player-pickable slots.
    trainedSkills: {
      value: sys.trainedSkills?.value || [],
      additional: sys.trainedSkills?.additional ?? 2,
    },
    skillIncreaseLevels: sys.skillIncreaseLevels?.value || [],
    classFeatLevels: sys.classFeatLevels?.value || [],
    proficiencies: {
      // Source emits saves as direct numbers (0-4), not { rank: N } —
      // the earlier `?.rank` access dropped them all to undefined.
      perception: sys.perception ?? 0,
      saves: {
        fortitude: sys.savingThrows?.fortitude ?? 0,
        reflex:    sys.savingThrows?.reflex    ?? 0,
        will:      sys.savingThrows?.will      ?? 0,
      },
      weapons: sys.attacks || {},
      armor: sys.defenses || {},
    },
    spellcasting: sys.spellcasting ?? 0,
    desc: getDesc(item, tier),
    source: sys.publication?.title,
    tier,
  };
}

// Pull the granted Lore subskill out of the description prose. Returns
// a label string ("Scribing", "Underworld", ...) when the background
// grants a specific Lore, or `null` when the player picks freely
// ("a Lore skill of your choice", "a Lore skill related to ..."). The
// SRD source has no structured field for this, so we string-match.
function extractLoreSubskill(rawDesc) {
  if (!rawDesc) return null;
  // Player-choice phrasing comes in two flavors — both surface as
  // "a Lore skill" in the prose.
  if (/\ba\s+Lore\s+skill\b/i.test(rawDesc)) return null;
  // Specific "X Lore" — up to 4 capitalized words preceding "Lore".
  const m = rawDesc.match(/\b([A-Z][\w-]+(?:\s+[A-Z][\w-]+){0,3})\s+Lore\b/);
  return m ? m[1] : null;
}

function transformBackground(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const desc = getDesc(item, tier);
  return {
    id: item._id || item.slug,
    name: scrub(item.name),
    boosts: Object.values(sys.boosts || {}).flatMap(b => b.value || []),
    trainedSkills: sys.trainedSkills?.value || [],
    loreSkill: sys.loreSkill,
    loreSubskill: extractLoreSubskill(desc),
    grantedFeat: sys.items ? Object.values(sys.items).find(i => i.uuid?.includes('feat'))?.name : null,
    rarity: sys.traits?.rarity || 'common',
    desc,
    source: sys.publication?.title,
    tier,
  };
}

function transformEquipment(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  return {
    id: item._id,
    name: scrub(item.name),
    type: item.type, // weapon | armor | consumable | equipment
    category: sys.category,
    price: sys.price?.value,           // { gp, sp, cp }
    bulk: sys.bulk?.value,
    level: sys.level?.value || 0,
    traits: sys.traits?.value || [],
    damage: sys.damage,
    range: sys.range,
    desc: getDesc(item, tier),
    source: sys.publication?.title,
    tier,
  };
}

function transformHeritage(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  return {
    id: item._id || item.name?.toLowerCase().replace(/\s+/g, '-'),
    name: scrub(item.name),
    ancestrySlug: sys.ancestry?.slug || null,
    traits: sys.traits?.value || [],
    desc: getDesc(item, tier),
    source: sys.publication?.title,
    tier,
  };
}

// Merge transformed heritages onto their parent ancestry records by
// ancestry slug. data/index.js builds HERITAGES_BY_ANCESTRY by reading
// `a.heritages` off each ancestry — populating that field here keeps
// the bridge unchanged.
function attachHeritages(ancestries, heritages) {
  const byAncestry = new Map();
  for (const h of heritages) {
    if (!h?.ancestrySlug) continue;
    if (!byAncestry.has(h.ancestrySlug)) byAncestry.set(h.ancestrySlug, []);
    byAncestry.get(h.ancestrySlug).push(h);
  }
  for (const a of ancestries) {
    a.heritages = byAncestry.get(a.id) || [];
  }
  return ancestries;
}

// === WRITE ===
function writeData(filename, items) {
  const out = items.filter(Boolean);
  const filePath = path.join(OUT, filename);
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} entries → ${filename}`);
}

// === RUN ===
console.log('Importing from:', FOUNDRY_PATH);
fs.mkdirSync(OUT, { recursive: true });

// Ancestries first, then attach heritages from their own pack before
// writing — heritages are filed separately in Foundry but consumers
// expect them embedded on each ancestry record.
const ancestries = readPack('ancestries').map(transformAncestry).filter(Boolean);
const heritages = readPack('heritages').map(transformHeritage).filter(Boolean);
attachHeritages(ancestries, heritages);
writeData('ancestries.json',  ancestries);

writeData('backgrounds.json', readPack('backgrounds').map(transformBackground));
writeData('classes.json',     readPack('classes').map(transformClass));
writeData('feats-srd.json',   readPack('feats-srd').map(transformFeat));
writeData('spells-srd.json',  readPack('spells-srd').map(transformSpell));
writeData('equipment-srd.json', readPack('equipment-srd').map(transformEquipment));

console.log(`  attached ${heritages.length} heritages across ${ancestries.length} ancestries`);
console.log('Done. Review tier2 entries for flavor-scrub completeness before commit.');
