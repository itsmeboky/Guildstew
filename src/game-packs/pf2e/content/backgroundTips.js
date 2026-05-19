// New-player-friendly tips for backgrounds. Explains who picks this
// background and what playstyle it suits — not what the background
// grants mechanically (that's already on the card).
//
// Keyed by background slug (kebab-case of the display name, since
// imported backgrounds don't carry a `slug` field — the lookup
// derives one at call time in StepBackground).

export const BACKGROUND_TIPS = {
  acolyte: "If you imagine your character starting in a temple, monastery, or church — pick this. Pairs naturally with Cleric and Champion, but a faithful Rogue or Fighter works just as well.",
  acrobat: "For players who want a circus, street performer, or daredevil past. Stacks well with Rogue, Swashbuckler, and Monk.",
  'animal-whisperer': "If you want a character who's better with beasts than people. Pairs with Ranger, Druid, or any class taking an animal companion.",
  artisan: "Crafter's background. Useful if your campaign features crafting downtime. Strong with Inventor and Alchemist.",
  artist: "For a character whose creativity comes first. Strong with Bard, but any class can have an artistic past.",
  bandit: "If your character used to rob people. Pairs with Rogue, Ranger, or Barbarian who's trying to leave the life behind.",
  barber: "Surgeon-barber background — pre-medicine medicine. Quirky and flavorful, pairs with anyone who wants medical skill access.",
  'bounty-hunter': "Your character used to hunt people for coin. Strong with Ranger and Investigator.",
  charlatan: "Con artist past. Strong with Rogue (Scoundrel racket), Sorcerer, or Bard.",
  criminal: "Generic outlaw background. Stealth + Thievery. Pairs with Rogue obviously, but a Fighter who came up rough fits too.",
  detective: "Investigator-flavored, but works for any class that wants to solve mysteries. Strong with Investigator class.",
  emissary: "Diplomat past. Strong with Bard, Cleric, or any face character.",
  entertainer: "Performance-driven past. Strong with Bard, Swashbuckler, or any social character.",
  farmhand: "Salt-of-the-earth background. Honest, simple, pairs with any class without leaning toward one.",
  'field-medic': "Battlefield healer past. Pairs with Champion, Cleric, or any martial who carries Medicine.",
  'fortune-teller': "Mystical past, can lean toward genuine magic or pure showmanship. Pairs with Witch, Oracle, or Sorcerer.",
  gambler: "High-risk past. Pairs with Rogue, Swashbuckler, or Gunslinger.",
  gladiator: "Arena combatant past. Pairs with Fighter, Barbarian, or Monk. Strong intimidation hooks.",
  guard: "Soldier or watch member. Pairs with Fighter, Ranger, or any disciplined martial.",
  herbalist: "Plant lore + Medicine. Pairs with Druid, Witch, or any nature-leaning caster.",
  hermit: "Solitary past — could be a sage, an outcast, or just a recluse. Pairs with Druid, Ranger, or Wizard.",
  hunter: "Tracker and game hunter. Pairs perfectly with Ranger, also great with Druid or any survivalist.",
  laborer: "Tough physical work past. Strength-boost background. Pairs with Fighter, Barbarian, Champion.",
  'martial-disciple': "Trained in a martial school — could be soldier, monk-in-training, or duelist. Pairs with Fighter, Monk, or Champion.",
  merchant: "Trader background. Strong social skills + Society. Pairs with Bard, Investigator, or Rogue (Mastermind).",
  miner: "Underground work past. Strength + Crafting. Pairs with Fighter, Barbarian, or Dwarven anything.",
  noble: "Born into privilege. Strong Society. Pairs with Champion, Bard, or anyone you want with name recognition.",
  nomad: "Traveling past — no fixed home. Survival + extra language. Pairs with Ranger, Druid, or Barbarian.",
  pilgrim: "Religious traveler. Pairs with Cleric, Champion, or anyone with a faith arc.",
  prisoner: "Locked-up past — could be wrongful or earned. Stealth + Thievery + grit. Pairs with Rogue, Barbarian, or Fighter.",
  sailor: "Seafaring past. Athletics + Survival. Pairs with anyone in a coastal/island campaign.",
  scholar: "Bookish past. Strong with Wizard, Investigator, or any INT-based caster.",
  scout: "Wilderness reconnaissance. Pairs with Ranger or Rogue.",
  'street-urchin': "Raised on city streets — Thievery + Society. Pairs with Rogue or any sharp-eyed character.",
  tinker: "Mechanical hobbyist. Strong with Inventor and Alchemist.",
  warrior: "Generic combat past — soldier, mercenary, gladiator. Pairs with any martial class.",
};

const GENERIC_FALLBACK =
  "Pick this background if its flavor matches the character you're imagining — the mechanical benefits are listed on the right.";

export function getBackgroundTip(slug) {
  return BACKGROUND_TIPS[slug] || GENERIC_FALLBACK;
}
