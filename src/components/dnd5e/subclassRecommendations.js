// "Best For" build recommendations per subclass.
//
// Used by SubclassPicker to render a third panel that helps a new
// player decide based on actual playstyle guidance, not vague "good
// for many builds" hedging. Each entry is 2-3 sentences. Keyed by
// the canonical subclass name as it appears in classFeatures.jsx
// (the same string the picker uses for the choice value).
//
// Adding a new modded subclass? Add a row here keyed by the
// subclass name. Missing rows fall through to a generic message;
// the picker still works without an entry.

export const SUBCLASS_BEST_FOR = {
  // Barbarian — Primal Path
  "Path of the Berserker":
    "Pure damage builds. Frenzy gives you a bonus-action attack every round you're raging — the highest sustained DPR in the class — at the cost of one exhaustion level when rage ends. Pick this if you want simple, savage, and you don't mind the post-fight cooldown.",
  "Path of the Totem Warrior":
    "Tankier and more versatile. Bear totem grants resistance to ALL damage except psychic while raging — the closest the game has to true invincibility. Eagle and Wolf totems trade tankiness for mobility or pack-tactics support. Pick this if you want to soak hits for the party.",

  // Bard — Bard College
  "College of Lore":
    "Support and utility builds. Excels at debuffs (Cutting Words), skill versatility, and stealing spells from any class (Additional Magical Secrets at 6th — six levels earlier than other bards). Pick this if you want to be the party's swiss-army knife and problem solver.",
  "College of Valor":
    "Frontline gish builds. Medium armor, shields, martial weapons, and Extra Attack at 6th level make you a credible melee combatant who also has a full caster's spell list. Pick this if you want a charisma-based fighter-mage.",

  // Cleric — Divine Domain
  "Knowledge Domain":
    "Skill-monkey caster. Two extra languages, two extra skills (with Expertise), and Channel Divinity to read minds. Pick this if your party needs a knowledge-and-investigation caster who can also heal in a pinch.",
  "Life Domain":
    "Pure healing focus. Every healing spell you cast restores extra HP equal to 2 + the spell's level. Heavy armor proficiency on top. Pick this if your party wants a dedicated medic — no other class out-heals you per-spell.",
  "Light Domain":
    "Blaster cleric. Free Fireball at 5th level and a reaction power that imposes disadvantage on attacks against you. Pick this if you want full-caster damage output with cleric durability.",
  "Nature Domain":
    "Half druid, half cleric. Heavy armor + a druid cantrip + free Animal Handling, Nature, or Survival proficiency. Pick this if you want a wilderness-focused cleric who can also charm beasts/plants.",
  "Tempest Domain":
    "Lightning-focused damage cleric. Once per turn you can max-roll a thunder or lightning damage spell. Heavy armor and martial weapons. Pick this if you want big single-shot bursts and don't mind being in the storm.",
  "Trickery Domain":
    "Sneaky support cleric. Bless, invisibility, and the ability to send an illusory duplicate of yourself. Pick this if you want a cleric that fits a heist or infiltration-focused party.",
  "War Domain":
    "Frontline cleric. Bonus-action attack via Channel Divinity, heavy armor, martial weapons, and a +10 bonus to a single attack roll once per long rest. Pick this if you want a cleric who fights as well as a paladin.",

  // Druid — Druid Circle
  "Circle of the Land":
    "Caster-focused druid. Extra spells based on terrain choice (forest, mountain, etc.) and free spell-slot recovery on a short rest. Pick this if you want druid versatility without the in-and-out of Wild Shape.",
  "Circle of the Moon":
    "Combat shapeshifter. Wild Shape into a bear at 2nd level, then progressively scarier creatures as you level. Spend spell slots to heal in animal form. Pick this if you want to be the party's big monster.",

  // Fighter — Martial Archetype
  "Champion":
    "Simple, high-damage martial. Improved critical range (19-20 at 3rd level, 18-20 at 15th) plus passive durability bonuses. Zero resource management. Pick this if you want a low-complexity damage dealer that gets stronger as you level.",
  "Battle Master":
    "Tactical martial. Maneuvers (superiority dice) let you trip, disarm, push, riposte, and more. Highest skill ceiling of the three Fighter archetypes. Pick this if you like decision-heavy combat with battlefield control.",
  "Eldritch Knight":
    "Half-magic fighter. Wizard-list spells (mostly abjuration and evocation) and the ability to bond with a weapon so it can never be disarmed. Slow caster progression. Pick this if you want a fighter with utility magic and ranged options.",

  // Monk — Monastic Tradition
  "Way of the Open Hand":
    "Pure martial monk. Flurry of Blows gains add-ons that knock prone, push, or disable reactions. Self-healing at higher levels. Pick this if you want the cleanest, simplest monk experience.",
  "Way of Shadow":
    "Stealth-and-teleport monk. Cast Darkness, Pass Without Trace, Silence as ki abilities; teleport between shadows at 6th level. Pick this if you want a ninja-flavored infiltrator.",
  "Way of the Four Elements":
    "Spell-flinging monk. Spend ki to cast elemental spells (fireball, gust of wind, etc.). Pick this if you want a magic-monk hybrid — be aware it's the weakest of the three subclasses mechanically.",

  // Paladin — Sacred Oath
  "Oath of Devotion":
    "Classic paladin. Bonus damage to fiends and undead, sacred weapon (Channel Divinity adds CHA to attacks), and a strong anti-charm aura. Pick this if you want the lawful-good knight archetype.",
  "Oath of the Ancients":
    "Tanky support paladin. Aura of Warding (resistance to spell damage for you and allies within 10 ft.) at 7th level — possibly the strongest aura in the game. Pick this if you want to make your whole party harder to kill.",
  "Oath of Vengeance":
    "Damage paladin. Free Hunter's Mark, advantage on attacks against your sworn enemy, and a bonus-action teleport to a fallen ally at 15th. Pick this if you want maximum smite damage.",

  // Ranger — Ranger Archetype
  "Hunter":
    "Versatile damage ranger. Choose a tier of bonuses that scale with situation — extra damage to large creatures, multiattack, defensive reactions. Pick this if you want a flexible ranger that's good at most fights.",
  "Beast Master":
    "Pet-focused ranger. A loyal animal companion fights alongside you. Pick this if you want the iconic ranger-and-pet combo — be aware action economy makes this the harder ranger to play effectively.",

  // Rogue — Roguish Archetype
  "Thief":
    "Mobility and utility rogue. Bonus action to use objects, climbing speed, and the ability to use any magic item regardless of class restriction at 13th. Pick this if you want the swashbuckling cat-burglar archetype.",
  "Assassin":
    "Burst-damage rogue. Auto-crit on surprise, advantage on attacks against creatures that haven't acted yet. Pick this if your party plans encounters around setup-and-strike rather than walk-up fights.",
  "Arcane Trickster":
    "Half-magic rogue. Wizard-list spells (mostly enchantment and illusion), Mage Hand that pickpockets at range, and the ability to make sneak attacks via spells. Pick this if you want a mage-thief.",

  // Sorcerer — Sorcerous Origin
  "Draconic Bloodline":
    "Tanky blaster sorcerer. Bonus HP per level, scale-armor AC, and an elemental damage type that you do extra damage with. Pick this if you want a durable face caster who doesn't need to hide in the back.",
  "Wild Magic":
    "Chaotic gambler sorcerer. Random magical effects when you cast (sometimes amazing, sometimes a fireball at your feet) plus Tides of Chaos for free advantage. Pick this if you like high-variance fun and have a GM who'll roll the table.",

  // Warlock — Otherworldly Patron
  "The Archfey":
    "Charm-and-control warlock. Fey-themed enchantment spells, plus the ability to teleport when an enemy misses you. Pick this if you want a tricky, evasive caster with crowd-control focus.",
  "The Fiend":
    "Damage-and-survival warlock. Bonus temp HP after killing an enemy, fire and necrotic spells, and dark-one's-blessing scaling. Pick this if you want a hardier warlock with raw damage.",
  "The Great Old One":
    "Mind-magic warlock. Telepathy, psychic damage spells, and the ability to charm/frighten anything that crits you. Pick this if you want the cosmic-horror caster vibe with strong anti-monster utility.",

  // Wizard — Arcane Tradition
  "School of Abjuration":
    "Defensive caster. Arcane Ward absorbs damage for you and recharges every time you cast an abjuration spell. Counterspell is your bread and butter. Pick this if you want the safest wizard playstyle.",
  "School of Evocation":
    "Blaster wizard. Sculpt Spells lets you carve allies out of your fireballs — say goodbye to friendly fire. Damage spells get extra power. Pick this if you want to throw the biggest spells without worrying about hitting your own party.",
};

/**
 * Lookup with a sane fallback so the picker never crashes if a
 * homebrew subclass adds itself without a recommendation row.
 */
export function bestForSubclass(name) {
  if (!name) return null;
  return SUBCLASS_BEST_FOR[name] || null;
}
