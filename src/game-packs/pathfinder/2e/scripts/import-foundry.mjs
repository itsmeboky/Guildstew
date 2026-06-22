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
  'Pathfinder Dark Archive (Remastered)',
  'Pathfinder Rage of Elements',
  'Pathfinder Secrets of Magic',
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

// Foundry's inline DSL leaks raw into our UI — every `@UUID[...]{Name}`
// renders as ugly text. This runs BEFORE stripHTML so the Foundry
// syntax is reduced to display-only fragments, and any unmatched
// brackets get cleaned up by the HTML pass that follows.
function stripFoundrySyntax(s) {
  if (!s) return '';
  return s
    // @UUID[Compendium...]{Display Text}   → "Display Text"
    .replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g, '$1')
    // bare @UUID[Compendium...]            → removed (rare; usually has display)
    .replace(/@UUID\[[^\]]+\]/g, '')
    // @Check[type:reflex|dc:20]{Display}   → "Display"
    .replace(/@Check\[[^\]]+\]\{([^}]+)\}/g, '$1')
    // @Check[type:reflex|dc:20]            → "Reflex save DC 20"
    .replace(/@Check\[([^\]]+)\]/g, (_, params) => {
      const parts = Object.fromEntries(
        params.split('|').map(p => p.split(':').map(x => x.trim())),
      );
      const type = parts.type ? parts.type[0].toUpperCase() + parts.type.slice(1) : '';
      const dc = parts.dc ? ` DC ${parts.dc}` : '';
      return `${type} save${dc}`.trim();
    })
    // @Damage[2d6[fire]]{Display}          → "Display"
    .replace(/@Damage\[[^\]]+\]\{([^}]+)\}/g, '$1')
    // @Damage[2d6[fire]]                   → "2d6 fire"
    .replace(/@Damage\[([^\]]+)\]/g, (_, inner) =>
      inner.replace(/\[/g, ' ').replace(/\]/g, '').replace(/\s+/g, ' ').trim())
    // @Template[type:burst|distance:20]{Display}
    .replace(/@Template\[[^\]]+\]\{([^}]+)\}/g, '$1')
    // @Template[type:burst|distance:20]    → "20-ft burst"
    .replace(/@Template\[([^\]]+)\]/g, (_, params) => {
      const parts = Object.fromEntries(
        params.split('|').map(p => p.split(':').map(x => x.trim())),
      );
      return `${parts.distance || ''}-ft ${parts.type || 'area'}`.trim();
    })
    // @Localize[PF2E.Some.Key]             → removed (localization key with no fallback text)
    .replace(/@Localize\[[^\]]+\]/g, '')
    // [[/r 1d6]]{Display}                  → "Display"
    .replace(/\[\[\/r [^\]]+\]\]\{([^}]+)\}/g, '$1')
    // [[/r 1d6]]                           → "1d6"
    .replace(/\[\[\/r ([^\]]+)\]\]/g, '$1')
    // {action:strike} / {action:1} action-glyph placeholders
    .replace(/\{action:[a-z0-9]+\}/g, '')
    // stray trailing `}` on their own line (left over from heightened
    // headings that wrapped weirdly)
    .replace(/^\s*\}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHTML(html) {
  return stripFoundrySyntax(html || '')
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

// Canonical slug derivation. Prefer Paizo's official slug
// (`system.slug`) when the source carries it; otherwise derive from
// the display name. Matches the normalizer used at the call sites
// (content/backgroundTips.js etc.) so cross-file lookups line up.
function deriveSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveSlug(item) {
  return item?.system?.slug || deriveSlug(item?.name);
}

// Collision tracker — every emitted entity registers its slug here.
// Two different entities deriving the same slug means we have to
// disambiguate by hand (rename one, suffix the other, etc.) — better
// to crash the import than ship a silently-merged lookup table.
function makeCollisionGuard(kind) {
  const seen = new Map();
  return (slug, name) => {
    if (!slug) return slug;
    const prior = seen.get(slug);
    if (prior && prior !== name) {
      throw new Error(
        `[pf2e import] Slug collision in ${kind}: "${slug}" derived from both "${prior}" and "${name}". `
        + 'Rename one in the source or add a tiebreaker to deriveSlug.',
      );
    }
    seen.set(slug, name);
    return slug;
  };
}

// === TRANSFORMERS ===

function transformFeat(item, guard) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const slug = guard(resolveSlug(item), item.name);
  return {
    id: slug,
    slug,
    foundryId: item._id || item.flags?.core?.sourceId,
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

function transformSpell(item, guard) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const slug = guard(resolveSlug(item), item.name);
  return {
    id: slug,
    slug,
    foundryId: item._id,
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

function transformAncestry(item, guard) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const slug = guard(resolveSlug(item), item.name);
  return {
    // `id` stays aliased to `slug` so the existing UI lookups
    // (`ANCESTRIES.find(a => a.id === data.ancestry)`) keep matching
    // — ancestry was the first kind to land here and consumers got
    // wired against `.id` before the slug field existed.
    id: slug,
    slug,
    foundryId: item._id,
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

function transformClass(item, guard) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const slug = guard(resolveSlug(item), item.name);
  return {
    // Make `id` an alias of `slug` so callers can match against
    // either field without ambiguity — templates ship slugs, the
    // creator now writes slugs everywhere too (see F.2).
    id: slug,
    slug,
    foundryId: item._id,
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
    license: sys.publication?.license,
    tier,
  };
}

// Pull the granted Lore subskill out of the description prose. Returns
// a label string ("Scribing", "Underworld", ...) when the background
// grants a specific Lore, or `null` when the player picks freely
// ("a Lore skill of your choice", "a Lore skill related to ..."). The
// SRD source has no structured field for this, so we string-match.
function loreFromDesc(rawDesc) {
  if (!rawDesc) return null;
  // Player-choice phrasing comes in two flavors — both surface as
  // "a Lore skill" in the prose.
  if (/\ba\s+Lore\s+skill\b/i.test(rawDesc)) return null;
  // Specific "X Lore" — up to 4 capitalized words preceding "Lore".
  const m = rawDesc.match(/\b([A-Z][\w-]+(?:\s+[A-Z][\w-]+){0,3})\s+Lore\b/);
  return m ? m[1] : null;
}

// Some backgrounds grant Lore via a feature-item reference instead of
// (or in addition to) prose. Today's Foundry pf2e source only uses
// the generic "Additional Lore" feat for this — which still requires
// a player choice — so this fallback ships defensively for future
// imports where Paizo might ship "Religious Lore" as a discrete item.
function loreFromItems(srcBackground) {
  const items = srcBackground?.system?.items;
  if (!items) return null;
  const collection = Array.isArray(items) ? items : Object.values(items);
  for (const item of collection) {
    if (!item || typeof item !== 'object') continue;
    const name = item.name || '';
    const m = name.match(/^(.+?)\s+Lore$/i);
    if (m && !/^additional$/i.test(m[1])) {
      return m[1];
    }
  }
  return null;
}

// Last-resort scan of Foundry rule elements. `GrantItem` rules that
// point at a Lore compendium item embed the Lore name in the UUID.
function loreFromRules(srcBackground) {
  const rules = srcBackground?.system?.rules || [];
  for (const rule of rules) {
    if (rule?.key !== 'GrantItem') continue;
    const uuid = rule.uuid || '';
    const m = uuid.match(/Item\.([^.]+?)-Lore(?:\b|$)/i);
    if (m && !/^additional$/i.test(m[1])) return m[1].replace(/-/g, ' ');
  }
  return null;
}

// Resolve the granted Lore through every pathway we know about.
// Priority: structured field on system → prose extraction (highest
// signal in current data) → granted-items pathway → rule elements.
// Returns null only when none of those resolve, meaning the player
// genuinely picks freely.
function extractLoreSubskill(srcBackground, rawDesc) {
  if (srcBackground?.system?.loreSubskill) return srcBackground.system.loreSubskill;
  const fromDesc = loreFromDesc(rawDesc);
  if (fromDesc) return fromDesc;
  const fromItems = loreFromItems(srcBackground);
  if (fromItems) return fromItems;
  const fromRules = loreFromRules(srcBackground);
  if (fromRules) return fromRules;
  return null;
}

function transformBackground(item, guard) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const desc = getDesc(item, tier);
  const slug = guard(resolveSlug(item), item.name);
  return {
    id: slug,
    slug,
    foundryId: item._id,
    name: scrub(item.name),
    boosts: Object.values(sys.boosts || {}).flatMap(b => b.value || []),
    trainedSkills: sys.trainedSkills?.value || [],
    loreSkill: sys.loreSkill,
    loreSubskill: extractLoreSubskill(item, desc),
    grantedFeat: sys.items ? Object.values(sys.items).find(i => i.uuid?.includes('feat'))?.name : null,
    rarity: sys.traits?.rarity || 'common',
    desc,
    source: sys.publication?.title,
    tier,
  };
}

function transformEquipment(item, guard) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const slug = guard(resolveSlug(item), item.name);
  return {
    id: slug,
    slug,
    foundryId: item._id,
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

function transformHeritage(item, guard) {
  const tier = publicationOK(item);
  if (!tier) return null;
  const sys = item.system;
  const slug = guard(resolveSlug(item), item.name);
  return {
    id: slug,
    slug,
    foundryId: item._id,
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
// expect them embedded on each ancestry record. Each kind gets its
// own collision guard so a duplicate slug surfaces as a loud error
// instead of a silent merge.
const ancestries = readPack('ancestries')
  .map(x => transformAncestry(x, makeCollisionGuard('ancestries')))
  .filter(Boolean);
const heritages = readPack('heritages')
  .map(x => transformHeritage(x, makeCollisionGuard('heritages')))
  .filter(Boolean);
attachHeritages(ancestries, heritages);
writeData('ancestries.json',  ancestries);

const backgroundGuard = makeCollisionGuard('backgrounds');
writeData('backgrounds.json', readPack('backgrounds').map(x => transformBackground(x, backgroundGuard)));

const classGuard = makeCollisionGuard('classes');
writeData('classes.json',     readPack('classes').map(x => transformClass(x, classGuard)));

const featGuard = makeCollisionGuard('feats');
writeData('feats-srd.json',   readPack('feats-srd').map(x => transformFeat(x, featGuard)));

const spellGuard = makeCollisionGuard('spells');
writeData('spells-srd.json',  readPack('spells-srd').map(x => transformSpell(x, spellGuard)));

const equipGuard = makeCollisionGuard('equipment');
writeData('equipment-srd.json', readPack('equipment-srd').map(x => transformEquipment(x, equipGuard)));

console.log(`  attached ${heritages.length} heritages across ${ancestries.length} ancestries`);
console.log('Done. Review tier2 entries for flavor-scrub completeness before commit.');
