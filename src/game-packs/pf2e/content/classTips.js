// Helpful Tip content per class. Aimed at first-time PF2e players.
// complexity: 'easy' | 'intermediate' | 'advanced' | 'master'
// Keyed by the class slug (`CLASSES[*].slug` from the importer).

export const CLASS_TIPS = {
  fighter: {
    complexity: 'easy',
    tip: "The flexible weapons master. Pick a weapon, get good with it. Honest action economy and no resource tracking — perfect for first-time players. STR or DEX is your key attribute.",
  },
  champion: {
    complexity: 'easy',
    tip: "Sworn defender. Heavy armor, divine power, reactions that protect allies. Pick a sanctification (holy or unholy) and a cause that fits — your edicts and anathema flow from there.",
  },
  cleric: {
    complexity: 'easy',
    tip: "Divine spellcaster bound to a deity. Cloistered (Wisdom-focused, full prepared caster) or Warpriest (martial-leaning). New-player-friendly when you pick a clear deity early.",
  },
  ranger: {
    complexity: 'easy',
    tip: "Hunter or skirmisher. Pick Animal Companion edge or Precision edge. Lots of small tactical choices that snowball into a specialist by level 5.",
  },
  rogue: {
    complexity: 'easy',
    tip: "Skills, sneak attack, mobility. Pick a racket (Thief, Scoundrel, Mastermind, Ruffian) early — it shapes your whole career. Beginner-friendly with deep build options.",
  },
  barbarian: {
    complexity: 'easy',
    tip: "Pick an instinct (Animal, Dragon, Fury, Giant, Spirit), rage, hit things. Honest damage class with a strong early game. New players: Giant Instinct is the most forgiving.",
  },
  bard: {
    complexity: 'intermediate',
    tip: "Occult spellcaster with composition cantrips. Pick a muse (Enigma, Maestro, Polymath, Warrior). Inspire Courage is the most-used support cantrip in PF2e — you'll cast it a lot.",
  },
  druid: {
    complexity: 'intermediate',
    tip: "Primal spellcaster with a doctrine (Animal, Leaf, Storm, Wild, Untamed). Untamed gets shapeshifting, Storm gets weather control. Pick the doctrine that matches your fantasy.",
  },
  sorcerer: {
    complexity: 'intermediate',
    tip: "Innate magic from a bloodline. Spontaneous caster — less prep, more flexibility than wizard. Great for players who want spell flair without daily prep paperwork.",
  },
  wizard: {
    complexity: 'intermediate',
    tip: "Prepared arcane caster. Pick a thesis (Spell Substitution is the most forgiving). Classic spellbook gameplay — you prep your spells each morning. Intelligence drives everything.",
  },
  monk: {
    complexity: 'intermediate',
    tip: "Unarmed combat, mobility, ki abilities (now 'qi' post-Remaster). High HP, lots of action options. Requires more action planning than fighter.",
  },
  investigator: {
    complexity: 'intermediate',
    tip: "INT-based skill monkey. Devise a Stratagem rewards setup and tactical thinking. Not for players who want to just hit things — you investigate and outsmart.",
  },
  swashbuckler: {
    complexity: 'intermediate',
    tip: "Style + panache. Pick a style (Battledancer, Braggart, Fencer, Gymnast, Wit). Charisma-driven martial with reactive opportunities. Showy, fragile, fun.",
  },
  magus: {
    complexity: 'advanced',
    tip: "Mix spell and steel via Spellstrike — one action, one attack, one spell. Tight tempo gameplay with focus point management. Best for players who like resource puzzles.",
  },
  witch: {
    complexity: 'advanced',
    tip: "Patron-granted prepared caster with a familiar that holds your spellbook. Pick a patron (Curse, Fate, Faith, Mosquito, Resentment, Silence, Spinner of Threads, Starless, Wilding) — drives your spell list, lessons, and aesthetic.",
  },
  inventor: {
    complexity: 'advanced',
    tip: "Choose a research field (armor, construct, weapon). Modifications stack into a unique tactical signature. Mechanically dense — be ready to track Overdrive and Unstable.",
  },
  gunslinger: {
    complexity: 'advanced',
    tip: "Firearms specialist. Pick a way (Pistolero, Sniper, Triggerbrand, Vanguard, Drifter). Big damage, fragile defenses, positioning-dependent. Reload action management is core.",
  },
  kineticist: {
    complexity: 'advanced',
    tip: "Element-bender with no spell slots — Elemental Blasts are your bread and butter. Pick elements (Air, Earth, Fire, Metal, Water, Wood). Unlike any other caster, elegant when learned.",
  },
  psychic: {
    complexity: 'advanced',
    tip: "Spontaneous occult caster with amped cantrips. Pick a conscious mind + subconscious mind. Lower spell count than other casters, but cantrips hit harder.",
  },
  thaumaturge: {
    complexity: 'advanced',
    tip: "Esoteric occultist with implements (Amulet, Bell, Chalice, Lantern, Mirror, Regalia, Tome, Wand, Weapon). Lots of moving parts but unique flavor and powerful situational tricks.",
  },
  oracle: {
    complexity: 'advanced',
    tip: "Spontaneous divine caster cursed by a mystery (Ancestors, Battle, Bones, Cosmos, Flames, Life, Lore, Tempest). The curse is mechanical AND narrative — you'll trigger it during play.",
  },
  animist: {
    complexity: 'advanced',
    tip: "Primal caster channeling apparitions (spirits). Complex resource management with vessel spells. Read the class twice before committing.",
  },
  alchemist: {
    complexity: 'master',
    tip: "Bomb thrower / mutagenist / chirurgeon / toxicologist. Heavy resource economy with infused reagents and Quick Alchemy. Mechanically dense — not for a first character.",
  },
  summoner: {
    complexity: 'master',
    tip: "You + your eidolon, shared HP pool, shared actions. Two characters in one — twice the work, twice the fun. Not for first PF2e characters.",
  },
  exemplar: {
    complexity: 'master',
    tip: "War of Immortals class. Mortal hero with divine ikons (weapons that grow with you). Big single-target swings, dramatic choices, mythic feel.",
  },
  commander: {
    complexity: 'master',
    tip: "War of Immortals class. Tactical leader using banner + tactics. Action-rich support flavor — you're the table's voice in combat.",
  },
};

export function getClassTip(slug) {
  return CLASS_TIPS[slug] || {
    complexity: 'intermediate',
    tip: "A specialized class. Read the description and feats carefully — the class's identity comes from the choices you make at level 1.",
  };
}
