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

  // Bard — Bard College
  "College of Lore":
    "Support and utility builds. Excels at debuffs (Cutting Words), skill versatility, and stealing spells from any class (Additional Magical Secrets at 6th — six levels earlier than other bards). Pick this if you want to be the party's swiss-army knife and problem solver.",

  // Cleric — Divine Domain
  "Life Domain":
    "Pure healing focus. Every healing spell you cast restores extra HP equal to 2 + the spell's level. Heavy armor proficiency on top. Pick this if your party wants a dedicated medic — no other class out-heals you per-spell.",

  // Druid — Druid Circle
  "Circle of the Land":
    "Caster-focused druid. Extra spells based on terrain choice (forest, mountain, etc.) and free spell-slot recovery on a short rest. Pick this if you want druid versatility without the in-and-out of Wild Shape.",

  // Fighter — Martial Archetype
  "Champion":
    "Simple, high-damage martial. Improved critical range (19-20 at 3rd level, 18-20 at 15th) plus passive durability bonuses. Zero resource management. Pick this if you want a low-complexity damage dealer that gets stronger as you level.",

  // Monk — Monastic Tradition
  "Way of the Open Hand":
    "Pure martial monk. Flurry of Blows gains add-ons that knock prone, push, or disable reactions. Self-healing at higher levels. Pick this if you want the cleanest, simplest monk experience.",

  // Paladin — Sacred Oath
  "Oath of Devotion":
    "Classic paladin. Bonus damage to fiends and undead, sacred weapon (Channel Divinity adds CHA to attacks), and a strong anti-charm aura. Pick this if you want the lawful-good knight archetype.",

  // Ranger — Ranger Archetype
  "Hunter":
    "Versatile damage ranger. Choose a tier of bonuses that scale with situation — extra damage to large creatures, multiattack, defensive reactions. Pick this if you want a flexible ranger that's good at most fights.",

  // Rogue — Roguish Archetype
  "Thief":
    "Mobility and utility rogue. Bonus action to use objects, climbing speed, and the ability to use any magic item regardless of class restriction at 13th. Pick this if you want the swashbuckling cat-burglar archetype.",

  // Sorcerer — Sorcerous Origin
  "Draconic Bloodline":
    "Tanky blaster sorcerer. Bonus HP per level, scale-armor AC, and an elemental damage type that you do extra damage with. Pick this if you want a durable face caster who doesn't need to hide in the back.",

  // Warlock — Otherworldly Patron
  "The Fiend":
    "Damage-and-survival warlock. Bonus temp HP after killing an enemy, fire and necrotic spells, and dark-one's-blessing scaling. Pick this if you want a hardier warlock with raw damage.",

  // Wizard — Arcane Tradition
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
