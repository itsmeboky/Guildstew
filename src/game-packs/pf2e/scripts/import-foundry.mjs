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
const FOUNDRY_PATH = 'C:/Users/itsme/Downloads/pf2e-foundry-source/packs';
const OUT = path.join(__dirname, '..', 'data');

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
function readPack(packName) {
  const dir = path.join(FOUNDRY_PATH, packName);
  if (!fs.existsSync(dir)) {
    console.warn(`Pack not found: ${dir}`);
    return [];
  }
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
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
    id: item._id || item.slug || item.name?.toLowerCase().replace(/\s+/g, '-'),
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
  return {
    id: item._id || item.slug || item.name?.toLowerCase().replace(/\s+/g, '-'),
    name: scrub(item.name),
    hp: sys.hp || 8,
    keyAbility: sys.keyAbility?.value || [],
    trainedSkills: sys.trainedSkills?.value?.length || 2,
    skillIncreaseLevels: sys.skillIncreaseLevels?.value || [],
    classFeatLevels: sys.classFeatLevels?.value || [],
    proficiencies: {
      perception: sys.perception,
      saves: {
        fortitude: sys.savingThrows?.fortitude?.rank,
        reflex: sys.savingThrows?.reflex?.rank,
        will: sys.savingThrows?.will?.rank,
      },
      // weapon/armor proficiencies are in sys.attacks/defenses
      weapons: sys.attacks || {},
      armor: sys.defenses || {},
    },
    spellcasting: sys.spellcasting,
    desc: getDesc(item, tier),
    source: sys.publication?.title,
    tier,
  };
}

function transformBackground(item) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  return {
    id: item._id || item.slug,
    name: scrub(item.name),
    boosts: Object.values(sys.boosts || {}).flatMap(b => b.value || []),
    trainedSkills: sys.trainedSkills?.value || [],
    loreSkill: sys.loreSkill,
    grantedFeat: sys.items ? Object.values(sys.items).find(i => i.uuid?.includes('feat'))?.name : null,
    desc: getDesc(item, tier),
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

writeData('ancestries.json',  readPack('ancestries').map(transformAncestry));
writeData('backgrounds.json', readPack('backgrounds').map(transformBackground));
writeData('classes.json',     readPack('classes').map(transformClass));
writeData('feats-srd.json',   readPack('feats-srd').map(transformFeat));
writeData('spells-srd.json',  readPack('spells-srd').map(transformSpell));
writeData('equipment-srd.json', readPack('equipment-srd').map(transformEquipment));

console.log('Done. Review tier2 entries for flavor-scrub completeness before commit.');
