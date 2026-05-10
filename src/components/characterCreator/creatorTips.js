// Centralised tooltip copy for the character creator. Keeps the
// strings out of the JSX and makes it easy for a copy editor / GM
// to tune wording without touching component code. Add new entries
// when alpha testers report confusion at a specific decision
// point — the InfoTip component reads from this map by key.

export const CREATOR_TIPS = {
  // Ability score generation methods
  method_standard_array:
    "Pre-set scores: 15, 14, 13, 12, 10, 8. Assign each to one ability. Quick and balanced — recommended for new players or fast character creation.",
  method_point_buy:
    "27 points to distribute. All scores start at 8, max 15. Strategic — lets you optimize for your build but takes more thought than Standard Array.",
  method_roll:
    "Roll 4d6, drop the lowest die, repeat for each ability. High variance — your character could end up amazing or struggle. Most fun for casual play, but check with your GM first.",
  method_manual:
    "Enter scores directly. Use only if your GM provided custom values or you want to hand-tune after another method.",

  // Race / class / background top-of-step tips
  race:
    "Your character's species. Determines your starting size, speed, ability score bonuses, and racial traits. Some races have subraces with additional choices.",
  class:
    "Your character's profession and combat role. Determines hit points, weapons/armor, skills, and core abilities. The most decisive single pick in character creation.",
  background:
    "Your character's life before adventuring. Provides 2 free skill proficiencies, 2 languages or tool proficiencies, equipment, and a feature. Mostly flavor — pick whatever fits your concept.",

  // Skill picker
  skill_class:
    "Class Skills are the proficiencies your class lets you pick. Each chosen skill adds your proficiency bonus to checks made with it. Skills are how you interact with the world outside combat.",
  skill_expertise:
    "Expertise doubles your proficiency bonus for that skill. Bards and Rogues get this — represents true mastery. Pick skills you'll use often (Stealth, Perception, Persuasion are evergreen).",
  skill_free:
    "Background gives these skills automatically — they don't count against your class's skill picks. If your class skill list overlaps with a background skill, pick a different one for your class skill so you don't waste it.",

  // Saving throws / HP / hit dice
  saving_throws:
    "Defenses against effects that try to hurt you (poison, fireballs, mind control). Your class determines which two saves you're proficient in. The 'big three' (DEX, CON, WIS) are most commonly targeted.",
  hit_points:
    "Your damage capacity. Calculated as: max hit die at 1st level + CON modifier per level. Determines how much damage you can take before dropping unconscious.",
  hit_dice:
    "Spend during a short rest to heal. You have one hit die per character level. Roll the die, add your CON modifier, regain that many HP. Recover half your spent dice on a long rest.",

  // Spells
  spell_cantrip:
    "Spell of level 0. Cast at will, unlimited times. Scales in power as you level. Most casters get a few cantrips that work as basic ranged attacks.",
  spell_slots:
    "Resource you spend to cast leveled spells. Higher slots cast bigger spells (or up-cast smaller ones for extra effect). Recover on long rest — except Warlocks, who recover on short rest.",
  spell_prepared_vs_known:
    "Some classes (Cleric, Druid, Wizard, Paladin) PREPARE spells daily from a list. Others (Bard, Sorcerer, Warlock, Ranger) KNOW a fixed set permanently. Prepared = flexible but requires planning; known = locked in but always ready.",

  // Subclass / multiclass / languages / inspiration
  subclass:
    "Your specialization within your class. Unlocks at the level shown. Strongly affects playstyle — read each option's 'Best For' before deciding; your subclass is harder to change than most other choices.",
  multiclass_prereqs:
    "To multiclass, you need at least 13 in the relevant ability for BOTH your current class AND your new one. Multiclassing isn't 'better' — it's a flavor and build choice. Single-class characters are often mechanically stronger.",
  languages:
    "Knowing a language means you can read, write, and speak it. Common is the default tongue everyone speaks. Other languages let you communicate with specific creatures or factions in-game.",
  inspiration:
    "A boon your GM grants when you roleplay your character well or do something heroic. Spend it to gain advantage on a roll. This is the D&D rule, distinct from Bardic Inspiration which is a class feature.",
};

export function tipFor(key) {
  return CREATOR_TIPS[key] || null;
}
