/**
 * D&D 5e (2024) — subclass features.
 *
 * Hand-authored against PHB 2024 RAW. Covers the 12 subclasses
 * exposed by the 2024 SRD's `5e-SRD-Subclasses.json` (one per
 * class). PHB 2024 publishes 4 subclasses per class; the others
 * land via a content drop and are filed below as smells.
 *
 * Shape mirrors the 2014 ADDITIONAL_SUBCLASS_FEATURES helper:
 *
 *   {
 *     <SubclassName>: {
 *       class: <ClassName>,
 *       featureLevels: [<level>, ...],
 *       features: [
 *         { name, level, description, choices?: [{name, description}] },
 *         ...
 *       ]
 *     }
 *   }
 */

const subclassFeaturesData = {
  // ── Barbarian ────────────────────────────────────────────
  "Path of the Berserker": {
    class: "Barbarian",
    featureLevels: [3, 6, 10, 14],
    features: [
      {
        name: "Frenzy",
        level: 3,
        description: "(2024 — revised; no exhaustion penalty) Whenever you start your Rage, you can goad yourself into a frenzied state. While you are in a Rage and frenzied, you gain the following benefits:\n• Heightened Movement: Your Speed increases by 10 feet.\n• Heightened Reflexes: You have Advantage on Initiative rolls.\n• Heightened Strikes: When you Reckless Attack, the extra damage you deal with the first hit increases by 1d6 (per the Brutal Strike scaling — adds to Brutal Strike's bonus damage).\n\nFrenzy ends when your Rage ends. The 2024 revision removes the level-of-exhaustion penalty that 2014 imposed at the end of Frenzy."
      },
      {
        name: "Mindless Rage",
        level: 6,
        description: "While you are raging, you can't be Charmed or Frightened. If you are Charmed or Frightened when you enter your Rage, the effect is suspended for the duration of the Rage."
      },
      {
        name: "Retaliation",
        level: 10,
        description: "(2024 — moved earlier from 14th in 2014) When you take damage from a creature that is within 5 feet of you, you can use your Reaction to make a melee weapon attack against that creature."
      },
      {
        name: "Intimidating Presence",
        level: 14,
        description: "(2024 — moved later from 10th in 2014) You can use a Bonus Action to terrify someone with your menacing presence. When you do so, choose one creature that you can see within 30 feet of you. If the creature can see or hear you, it must succeed on a Wisdom save (DC 8 + PB + Str) or have the Frightened condition until the end of your next turn.\n\nOn subsequent turns, you can use a Bonus Action to extend the duration of this effect on the frightened creature until the end of your next turn. This effect ends if the creature ends its turn out of line of sight or more than 60 feet from you. If the creature succeeds on its saving throw, you can't use this feature on that creature again for 24 hours."
      }
    ]
  },

  // ── Bard ─────────────────────────────────────────────────
  "College of Lore": {
    class: "Bard",
    featureLevels: [3, 6, 14],
    features: [
      {
        name: "Bonus Proficiencies",
        level: 3,
        description: "When you join the College of Lore at 3rd level, you gain proficiency with three skills of your choice."
      },
      {
        name: "Cutting Words",
        level: 3,
        description: "When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your Reaction to expend one use of your Bardic Inspiration, rolling the Bardic Inspiration die and subtracting the number rolled from the creature's roll.\n\nYou can choose to use this feature after the creature makes its roll, but before the GM determines whether the attack roll or ability check succeeds or fails, or before the creature deals its damage. The creature is immune if it can't hear you or if it's immune to being Charmed."
      },
      {
        name: "Magical Discoveries",
        level: 6,
        description: "(2024 — replaces 2014's Additional Magical Secrets) Choose two spells from any class's spell list. A spell you choose must be a cantrip or be of a level for which you have spell slots. The chosen spells count as Bard spells for you and are included in the number in the Spells Known column of the Bard table."
      },
      {
        name: "Peerless Skill",
        level: 14,
        description: "When you make an ability check, you can expend one use of Bardic Inspiration. Roll a Bardic Inspiration die and add the number rolled to your ability check. You can choose to do so after you roll the die for the ability check, but before the GM tells you whether you succeed or fail."
      }
    ]
  },

  // ── Cleric ───────────────────────────────────────────────
  "Life Domain": {
    class: "Cleric",
    featureLevels: [3, 6, 17],
    features: [
      {
        name: "Disciple of Life",
        level: 3,
        description: "Your healing spells are more effective. Whenever you use a spell of 1st level or higher to restore Hit Points to a creature, the creature regains additional Hit Points equal to 2 + the spell's level."
      },
      {
        name: "Bonus Proficiency",
        level: 3,
        description: "You gain proficiency with Heavy Armor."
      },
      {
        name: "Channel Divinity: Preserve Life",
        level: 3,
        description: "(2024 — moved from 2nd-level shape) As an Action, you can present your Holy Symbol and expend a use of your Channel Divinity to invoke a healing energy that can restore a number of HP equal to five times your Cleric level. Choose any creatures within 30 feet of you and divide those HP among them. This feature can restore a creature to no more than half its HP maximum. You can't use this feature on an Undead or a Construct."
      },
      {
        name: "Blessed Healer",
        level: 6,
        description: "(2024) The healing spells you cast on others heal you as well. When you cast a spell of 1st level or higher that restores Hit Points to a creature other than yourself, you regain Hit Points equal to 2 + the spell's level."
      },
      {
        name: "Supreme Healing",
        level: 17,
        description: "When you would normally roll one or more dice to restore Hit Points with a spell, you instead use the highest number possible for each die. For example, instead of restoring 2d6 Hit Points to a creature, you restore 12."
      }
    ]
  },

  // ── Druid ────────────────────────────────────────────────
  "Circle of the Land": {
    class: "Druid",
    featureLevels: [3, 6, 10, 14],
    features: [
      {
        name: "Circle Spells",
        level: 3,
        description: "(2024 — terrain-based bonus spells) Your mystical connection to the land infuses you with the ability to cast certain spells. At 3rd level, choose a land — Arctic, Coast, Desert, Forest, Grassland, Mountain, Swamp, or Underdark — and consult the associated spell list.\n\nOnce you gain access to a Circle Spell, you always have it prepared, and it doesn't count against the number of spells you can prepare. If you gain access to a spell that doesn't appear on the Druid spell list, the spell is nonetheless a Druid spell for you.\n\nYou expand the spell list at higher Druid levels (5th, 7th, 9th).",
        choiceRequired: true,
        choices: [
          { name: "Arctic", description: "Hold Person, Spike Growth, Sleet Storm, Slow, Cone of Cold, Ice Storm." },
          { name: "Coast", description: "Mirror Image, Misty Step, Water Breathing, Water Walk, Control Water, Freedom of Movement." },
          { name: "Desert", description: "Blur, Silence, Create Food and Water, Protection from Energy, Blight, Hallucinatory Terrain." },
          { name: "Forest", description: "Barkskin, Spider Climb, Call Lightning, Plant Growth, Divination, Freedom of Movement." },
          { name: "Grassland", description: "Invisibility, Pass Without Trace, Daylight, Haste, Divination, Freedom of Movement." },
          { name: "Mountain", description: "Spider Climb, Spike Growth, Lightning Bolt, Meld into Stone, Stone Shape, Stoneskin." },
          { name: "Swamp", description: "Acid Arrow, Darkness, Water Walk, Stinking Cloud, Freedom of Movement, Insect Plague." },
          { name: "Underdark", description: "Spider Climb, Web, Gaseous Form, Stinking Cloud, Greater Invisibility, Cloudkill." }
        ]
      },
      {
        name: "Land's Aid",
        level: 6,
        description: "(2024 — replaces 2014's Land's Stride at this slot for Land Druids) As a Magic action, you can expend one use of Wild Shape to plant a seed of nature's vitality. Each creature of your choice within 10 feet of the seed regains 2d6 + your Wisdom modifier Hit Points and the area becomes Difficult Terrain for your enemies for 1 minute."
      },
      {
        name: "Nature's Ward",
        level: 10,
        description: "You can't be Charmed or Frightened by Elementals or Fey, and you are immune to poison and disease."
      },
      {
        name: "Nature's Sanctuary",
        level: 14,
        description: "When a Beast or Plant creature attacks you, that creature must make a Wisdom saving throw against your spell save DC. On a failed save, the creature must choose a different target, or the attack automatically misses. On a successful save, the creature is immune to this effect for 24 hours.\n\nThe creature is aware of this effect before it makes its attack against you."
      }
    ]
  },

  // ── Fighter ──────────────────────────────────────────────
  Champion: {
    class: "Fighter",
    featureLevels: [3, 7, 10, 15, 18],
    features: [
      {
        name: "Improved Critical",
        level: 3,
        description: "Your weapon attacks score a Critical Hit on a roll of 19 or 20 on the d20."
      },
      {
        name: "Remarkable Athlete",
        level: 7,
        description: "(2024 — refined) You can add half your Proficiency Bonus (rounded up) to any Strength, Dexterity, or Constitution check you make that doesn't already use your Proficiency Bonus.\n\nIn addition, when you make a running long jump, the distance you can cover increases by a number of feet equal to your Strength modifier."
      },
      {
        name: "Additional Fighting Style",
        level: 10,
        description: "You can choose a second Fighting Style feat from the available list."
      },
      {
        name: "Superior Critical",
        level: 15,
        description: "Your weapon attacks score a Critical Hit on a roll of 18, 19, or 20."
      },
      {
        name: "Survivor",
        level: 18,
        description: "At the start of each of your turns, you regain Hit Points equal to 5 + your Constitution modifier if you have no more than half of your HP maximum left. You don't gain this benefit if you have 0 Hit Points."
      }
    ]
  },

  // ── Monk ─────────────────────────────────────────────────
  "Warrior of the Open Hand": {
    class: "Monk",
    featureLevels: [3, 6, 11, 17],
    features: [
      {
        name: "Open Hand Technique",
        level: 3,
        description: "You can manipulate your enemy's ki when you harness your own. Whenever you hit a creature with one of the attacks granted by your Flurry of Blows, you can impose one of the following effects on that target:\n\n• Addle (no save): The target can't make Opportunity Attacks until the start of your next turn.\n• Push (Strength save or be pushed up to 15 feet from you).\n• Topple (Dexterity save or have the Prone condition)."
      },
      {
        name: "Wholeness of Body",
        level: 6,
        description: "(2024 — moved from 17th in 2014, scaled appropriately) As a Bonus Action, you can heal yourself for HP equal to your Martial Arts die roll + your Wisdom modifier. You can use this feature a number of times equal to your Wisdom modifier (minimum 1), and you regain all expended uses when you finish a Long Rest."
      },
      {
        name: "Fleet Step",
        level: 11,
        description: "(2024) Whenever you take a Bonus Action on your turn, you can also use Step of the Wind without spending Discipline Points before or after the Bonus Action."
      },
      {
        name: "Quivering Palm",
        level: 17,
        description: "You can set up lethal vibrations in someone's body. When you hit a creature with an unarmed strike, you can spend 4 Discipline Points to start these imperceptible vibrations, which last for a number of days equal to your Monk level. The vibrations are harmless unless you use a Magic action to end them. To do so, you and the target must be on the same plane of existence. When you use this Action, the creature must make a Constitution save. If it fails, it is reduced to 0 HP. If it succeeds, it takes 10d12 Necrotic damage."
      }
    ]
  },

  // ── Paladin ──────────────────────────────────────────────
  "Oath of Devotion": {
    class: "Paladin",
    featureLevels: [3, 7, 15, 20],
    features: [
      {
        name: "Channel Divinity: Sacred Weapon",
        level: 3,
        description: "(2024) As a Magic action, you can expend a use of your Channel Divinity to imbue one weapon that you are holding with positive energy. For 1 minute, you add your Charisma modifier to attack rolls made with that weapon (with a minimum bonus of +1).\n\nThe weapon also emits Bright Light in a 20-foot radius and Dim Light 20 feet beyond that. If the weapon is not already magical, it becomes magical for the duration."
      },
      {
        name: "Sanctuary Vow",
        level: 7,
        description: "(2024 — replaces 2014's Aura of Devotion) You and creatures within 10 feet of you can't be Charmed while you are conscious. The aura's range increases to 30 feet at 18th level."
      },
      {
        name: "Smite of Protection",
        level: 15,
        description: "(2024 — replaces 2014's Purity of Spirit) Your Aura of Protection now also grants you and your allies Resistance to damage from Smite spells. In addition, you and friendly creatures within your Aura have Advantage on saving throws against spells."
      },
      {
        name: "Holy Nimbus",
        level: 20,
        description: "As a Magic action, you can emanate an aura of sunlight. For 1 minute, Bright Light shines from you in a 30-foot radius, and Dim Light shines 30 feet beyond that.\n\nWhenever an enemy creature starts its turn in the Bright Light, the creature takes 10 Radiant damage. In addition, for the duration, you have Advantage on saving throws against spells cast by Fiends or Undead.\n\nOnce you use this feature, you can't use it again until you finish a Long Rest."
      }
    ]
  },

  // ── Ranger ───────────────────────────────────────────────
  Hunter: {
    class: "Ranger",
    featureLevels: [3, 7, 11, 15],
    features: [
      {
        name: "Hunter's Lore",
        level: 3,
        description: "(2024 — new at 3rd level) You can call on the wisdom of nature to learn about your foes. When you cast Hunter's Mark on a creature, you learn whether the creature has any Damage Vulnerabilities, Resistances, or Immunities, and if it does, what they are."
      },
      {
        name: "Hunter's Prey",
        level: 3,
        description: "(2024 — at 3rd level instead of 3rd in 2014) You gain one of the following options of your choice. The chosen feature applies whenever you damage a creature affected by your Hunter's Mark.",
        choiceRequired: true,
        choices: [
          { name: "Colossus Slayer", description: "Once per turn when you hit a creature with a weapon attack, you can deal an extra 1d8 damage if the target is below its HP maximum." },
          { name: "Horde Breaker", description: "Once on each of your turns when you make a weapon attack, you can make another weapon attack against a different creature within 5 feet of the original target and within range of your weapon." }
        ]
      },
      {
        name: "Defensive Tactics",
        level: 7,
        description: "(2024) You gain one of the following options of your choice (cannot change).",
        choiceRequired: true,
        choices: [
          { name: "Escape the Horde", description: "Opportunity Attacks against you have Disadvantage." },
          { name: "Multiattack Defense", description: "When a creature hits you with an attack, you have a +4 bonus to AC against all subsequent attacks made by that creature for the rest of the turn." },
          { name: "Steel Will", description: "Advantage on saving throws against being Frightened." }
        ]
      },
      {
        name: "Superior Hunter's Defense",
        level: 11,
        description: "(2024) You gain one of the following options of your choice.",
        choiceRequired: true,
        choices: [
          { name: "Evasion", description: "When subjected to an effect that allows a Dexterity save for half damage, you take no damage on a success and only half on a failure." },
          { name: "Stand Against the Tide", description: "When a hostile creature misses you with a melee attack, you can use your Reaction to force the creature to repeat the same attack against another creature (other than itself) of your choice." },
          { name: "Uncanny Dodge", description: "When an attacker that you can see hits you with an attack, you can use your Reaction to halve the damage." }
        ]
      },
      {
        name: "Superior Hunter's Prey",
        level: 15,
        description: "(2024) Your Hunter's Prey damage option (Colossus Slayer or Horde Breaker) becomes more potent: the bonus die becomes 1d10."
      }
    ]
  },

  // ── Rogue ────────────────────────────────────────────────
  Thief: {
    class: "Rogue",
    featureLevels: [3, 9, 13, 17],
    features: [
      {
        name: "Fast Hands",
        level: 3,
        description: "You can use the Bonus Action granted by your Cunning Action to make a Sleight of Hand check, use your Thieves' Tools to disarm a trap or open a lock, or take the Use an Object action."
      },
      {
        name: "Second-Story Work",
        level: 3,
        description: "You gain the ability to climb faster than normal; climbing no longer costs you extra movement.\n\nIn addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier."
      },
      {
        name: "Supreme Sneak",
        level: 9,
        description: "(2024 — revised) You have Advantage on Stealth checks if you move no more than half your Speed on the same turn. Once per turn when you Hide, you can also enter the Hidden state without rolling Stealth, automatically achieving the highest possible result on the check (treating any d20 as a 20)."
      },
      {
        name: "Use Magic Device",
        level: 13,
        description: "You have learned enough about the workings of magic that you can improvise the use of items even when they are not intended for you. You ignore all class, race, and level requirements on the use of magic items.\n\nYou can attune to up to four magic items instead of three."
      },
      {
        name: "Thief's Reflexes",
        level: 17,
        description: "You can take two turns during the first round of any combat. You take your first turn at your normal Initiative and your second turn at your Initiative minus 10. You can't use this feature when you are Surprised."
      }
    ]
  },

  // ── Sorcerer ─────────────────────────────────────────────
  "Draconic Sorcery": {
    class: "Sorcerer",
    featureLevels: [3, 6, 14, 18],
    features: [
      {
        name: "Draconic Resilience",
        level: 3,
        description: "Your Hit Point maximum increases by 3, and increases by 1 again whenever you gain a level in this class.\n\nAdditionally, parts of your skin are covered by a thin sheen of dragon-like scales. When you aren't wearing armor, your AC equals 13 + your Dexterity modifier."
      },
      {
        name: "Draconic Spells",
        level: 3,
        description: "(2024) You always have certain spells prepared, in addition to your normal prepared spells. The spells are Alter Self, Chromatic Orb, Command, Dragon's Breath, Fear, Fly, Charm Person."
      },
      {
        name: "Elemental Affinity",
        level: 6,
        description: "(2024 — broadened) When you cast a spell that deals damage of the type associated with your draconic ancestry, you can add your Charisma modifier to one damage roll of that spell. You also gain Resistance to the damage type of your draconic ancestry."
      },
      {
        name: "Dragon Wings",
        level: 14,
        description: "(2024 — moved earlier from 14th to remain at 14th in 2024) As a Bonus Action, you can sprout a pair of dragon wings from your back, gaining a Fly Speed equal to your current Speed. You can create these wings any number of times.\n\nYou can dismiss them as a Bonus Action."
      },
      {
        name: "Draconic Presence",
        level: 18,
        description: "You can channel the dread presence of your dragon ancestor, causing those around you to become awestruck or frightened.\n\nAs an Action, you can spend 5 Sorcery Points to draw on this power and exude an aura of awe or fear (your choice) to a distance of 60 feet. For 1 minute or until you lose your Concentration, each hostile creature that starts its turn in this aura must succeed on a Wisdom save or be Charmed (if you chose awe) or Frightened (if you chose fear) until the aura ends.\n\nA creature that succeeds on this save is immune to your aura for 24 hours."
      }
    ]
  },

  // ── Warlock ──────────────────────────────────────────────
  "Fiend Patron": {
    class: "Warlock",
    featureLevels: [3, 6, 10, 14],
    features: [
      {
        name: "Dark One's Blessing",
        level: 3,
        description: "When you reduce a hostile creature to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier + your Warlock level (minimum 1)."
      },
      {
        name: "Fiend Spells",
        level: 3,
        description: "(2024) You always have certain spells prepared after you reach particular Warlock levels (also count as Warlock spells for you):\n• 1st level: Burning Hands, Command\n• 3rd level: Blindness/Deafness, Scorching Ray\n• 5th level: Fireball, Stinking Cloud\n• 7th level: Fire Shield, Wall of Fire\n• 9th level: Flame Strike, Insect Plague"
      },
      {
        name: "Dark One's Own Luck",
        level: 6,
        description: "When you make an ability check or saving throw, you can use this feature to add a d10 to your roll. You can do so after seeing the initial roll but before any of the roll's effects occur. Once you use this feature, you can't use it again until you finish a Short or Long Rest."
      },
      {
        name: "Fiendish Resilience",
        level: 10,
        description: "Choose one damage type, other than Force, whenever you finish a Short or Long Rest. You gain Resistance to that damage type until you choose a different one with this feature. Damage from magical weapons or Silvered weapons ignores this Resistance."
      },
      {
        name: "Hurl Through Hell",
        level: 14,
        description: "When you hit a creature with an attack roll, you can channel its journey through the lower planes. The creature disappears and hurtles through a nightmare landscape.\n\nAt the end of your next turn, the target returns to the space it previously occupied, or the nearest unoccupied space. If the target is not a Fiend, it takes 8d10 Psychic damage as it reels from its harrowing experience.\n\nOnce you use this feature, you can't use it again until you finish a Long Rest."
      }
    ]
  },

  // ── Wizard ───────────────────────────────────────────────
  Evoker: {
    class: "Wizard",
    featureLevels: [3, 6, 10, 14],
    features: [
      {
        name: "Evocation Savant",
        level: 3,
        description: "(2024 — moved from 2nd-level shape) The gold and time you must spend to copy an Evocation spell into your Spellbook is halved."
      },
      {
        name: "Potent Cantrip",
        level: 3,
        description: "(2024 — moved earlier from 6th in 2014) Your damaging cantrips affect even creatures that avoid the brunt of the effect. When a creature succeeds on a saving throw against your cantrip, the creature takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip."
      },
      {
        name: "Sculpt Spells",
        level: 6,
        description: "You can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save."
      },
      {
        name: "Empowered Evocation",
        level: 10,
        description: "You can add your Intelligence modifier to one damage roll of any wizard evocation spell you cast."
      },
      {
        name: "Overchannel",
        level: 14,
        description: "You can increase the power of your simpler spells. When you cast a wizard spell of 1st through 5th level that deals damage, you can deal maximum damage with that spell.\n\nThe first time you do so, you suffer no adverse effect. If you use this feature again before you finish a Long Rest, you take 2d12 Necrotic damage for each level of the spell, immediately after you cast it. Each time you use this feature again before finishing a Long Rest, the Necrotic damage per spell level increases by 1d12. This damage ignores Resistance and Immunity."
      }
    ]
  },
};

/**
 * Returns the cumulative subclass features for a given subclass up
 * to and including the requested level.
 */
export function getSubclassFeaturesForLevel(subclassName, level) {
  const sub = subclassFeaturesData[subclassName];
  if (!sub) return [];
  return (sub.features || []).filter((f) => f.level <= level);
}

/**
 * Returns features ONLY at a specific level.
 */
export function getSubclassFeaturesAtLevel(subclassName, level) {
  const sub = subclassFeaturesData[subclassName];
  if (!sub) return [];
  return (sub.features || []).filter((f) => f.level === level);
}

/**
 * Returns the names of all subclasses that belong to a given class.
 */
export function getSubclassNamesForClass(className) {
  return Object.entries(subclassFeaturesData)
    .filter(([, v]) => v.class === className)
    .map(([k]) => k);
}

export default subclassFeaturesData;
