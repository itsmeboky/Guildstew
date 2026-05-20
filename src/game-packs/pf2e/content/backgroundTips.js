// New-player-friendly tips for backgrounds. Explains who picks this
// background and what playstyle it suits — not what the background
// grants mechanically (that's already on the card).
//
// The lookup normalizes both the file's keys and the incoming slug
// through `normalizeSlug` so any drift (extra whitespace, accidental
// capitalization, underscore-vs-hyphen) at the call site still
// resolves. Backgrounds that aren't curated here fall through to a
// generic framing line.

function normalizeSlug(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')      // spaces and underscores → hyphens
    .replace(/[^a-z0-9-]/g, '')   // strip anything that isn't alphanumeric or hyphen
    .replace(/-+/g, '-')          // collapse multi-hyphens
    .replace(/^-|-$/g, '');       // trim edge hyphens
}

// Inline [[slug]] / [[slug|label]] markers reference entries in
// content/glossary.js. The render path (GMWhisper / AnnotatedText)
// turns them into <Term> components with hover tooltip + popover.
const _RAW_TIPS = {
  acolyte: "If you imagine your character starting in a temple, monastery, or church — pick this. Pairs naturally with Cleric and Champion, but a faithful Rogue or Fighter works just as well.",
  acrobat: "For players who want a circus, street performer, or daredevil past. Stacks well with Rogue, Swashbuckler, and Monk.",
  'animal-whisperer': "If you want a character who's better with beasts than people. Pairs with Ranger, Druid, or any [[class]] taking an animal companion.",
  artisan: "Crafter's [[background]]. Useful if your campaign features crafting downtime. Strong with Inventor and Alchemist.",
  artist: "For a character whose creativity comes first. Strong with Bard, but any [[class]] can have an artistic past.",
  bandit: "If your character used to rob people. Pairs with Rogue, Ranger, or Barbarian who's trying to leave the life behind.",
  barber: "Surgeon-barber [[background]] — pre-medicine medicine. Quirky and flavorful, pairs with anyone who wants medical [[skill]] access.",
  'bounty-hunter': "Your character used to hunt people for coin. Strong with Ranger and Investigator.",
  charlatan: "Con artist past. Strong with Rogue (Scoundrel racket), Sorcerer, or Bard.",
  criminal: "Generic outlaw [[background]]. [[stealth|Stealth]] + [[thievery|Thievery]]. Pairs with Rogue obviously, but a Fighter who came up rough fits too.",
  detective: "Investigator-flavored, but works for any [[class]] that wants to solve mysteries. Strong with Investigator class.",
  emissary: "Diplomat past. Strong with Bard, Cleric, or any face character.",
  entertainer: "[[performance|Performance]]-driven past. Strong with Bard, Swashbuckler, or any social character.",
  farmhand: "Salt-of-the-earth [[background]]. Honest, simple, pairs with any [[class]] without leaning toward one.",
  'field-medic': "Battlefield healer past. Pairs with Champion, Cleric, or any martial who carries [[medicine|Medicine]].",
  'fortune-teller': "Mystical past, can lean toward genuine magic or pure showmanship. Pairs with Witch, Oracle, or Sorcerer.",
  gambler: "High-risk past. Pairs with Rogue, Swashbuckler, or Gunslinger.",
  gladiator: "Arena combatant past. Pairs with Fighter, Barbarian, or Monk. Strong [[intimidation]] hooks.",
  guard: "Soldier or watch member. Pairs with Fighter, Ranger, or any disciplined martial.",
  herbalist: "Plant lore + [[medicine|Medicine]]. Pairs with Druid, Witch, or any [[nature]]-leaning caster.",
  hermit: "Solitary past — could be a sage, an outcast, or just a recluse. Pairs with Druid, Ranger, or Wizard.",
  hunter: "Tracker and game hunter. Pairs perfectly with Ranger, also great with Druid or any survivalist.",
  laborer: "Tough physical work past. [[strength|Strength]]-[[ability-boost|boost]] [[background]]. Pairs with Fighter, Barbarian, Champion.",
  'martial-disciple': "[[trained|Trained]] in a martial school — could be soldier, monk-in-training, or duelist. Pairs with Fighter, Monk, or Champion.",
  merchant: "Trader [[background]]. Strong social skills + [[society|Society]]. Pairs with Bard, Investigator, or Rogue (Mastermind).",
  miner: "Underground work past. [[strength|Strength]] + [[crafting|Crafting]]. Pairs with Fighter, Barbarian, or Dwarven anything.",
  noble: "Born into privilege. Strong [[society|Society]]. Pairs with Champion, Bard, or anyone you want with name recognition.",
  nomad: "Traveling past — no fixed home. [[survival|Survival]] + extra [[languages|language]]. Pairs with Ranger, Druid, or Barbarian.",
  pilgrim: "[[religion|Religious]] traveler. Pairs with Cleric, Champion, or anyone with a faith arc.",
  prisoner: "Locked-up past — could be wrongful or earned. [[stealth|Stealth]] + [[thievery|Thievery]] + grit. Pairs with Rogue, Barbarian, or Fighter.",
  sailor: "Seafaring past. [[athletics|Athletics]] + [[survival|Survival]]. Pairs with anyone in a coastal/island campaign.",
  scholar: "Bookish past. Strong with Wizard, Investigator, or any [[intelligence|INT]]-based caster.",
  scout: "Wilderness reconnaissance. Pairs with Ranger or Rogue.",
  'street-urchin': "Raised on city streets — [[thievery|Thievery]] + [[society|Society]]. Pairs with Rogue or any sharp-eyed character.",
  tinker: "Mechanical hobbyist. Strong with Inventor and Alchemist.",
  warrior: "Generic combat past — soldier, mercenary, gladiator. Pairs with any martial [[class]].",
};

export const BACKGROUND_TIPS = Object.fromEntries(
  Object.entries(_RAW_TIPS).map(([k, v]) => [normalizeSlug(k), v]),
);

const GENERIC_FALLBACK =
  "Pick this [[background]] if its flavor matches the character you're imagining — the mechanical benefits are listed on the right.";

export function getBackgroundTip(rawSlug) {
  const key = normalizeSlug(rawSlug);
  return BACKGROUND_TIPS[key] || GENERIC_FALLBACK;
}
