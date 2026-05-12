// D&D 5e (2014) Class Features by Level.
//
// HAND-AUTHORED legacy data. Subclass entries beyond the 2014 SRD's
// 12 (Berserker, Lore, Life, Land, Champion, Open Hand, Devotion,
// Hunter, Thief, Draconic Bloodline, The Fiend, School of Evocation)
// have been stripped per the OGL cleanup pass. Base class features
// (Rage, Spellcasting, etc.) remain hand-typed.
//
// Smell filed: this file should be rewritten as a thin adapter
// reading from docs/5e_reference/2014/5e-SRD-Levels.json and
// 5e-SRD-Features.json (which carry full per-level progression for
// the 2014 SRD), matching the dnd5e_2024 adapter pattern. Until
// that refactor lands, the hand-typed prose here is a residual
// hand-authoring exposure even though the listed entities are all
// SRD-covered.

const classFeaturesData = {
  Barbarian: {
    1: [
      {
        name: "Rage",
        level: 1,
        description: "In battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus action.\n\nWhile raging, you gain the following benefits if you aren't wearing heavy armor:\n• You have advantage on Strength checks and Strength saving throws.\n• When you make a melee weapon attack using Strength, you gain a bonus to the damage roll that increases as you gain levels as a barbarian (+2 at 1st level).\n• You have resistance to bludgeoning, piercing, and slashing damage.\n\nYour rage lasts for 1 minute. It ends early if you are knocked unconscious or if your turn ends and you haven't attacked a hostile creature since your last turn or taken damage since then. You can also end your rage on your turn as a bonus action.\n\nYou can rage 2 times per long rest at 1st level.",
        uses: "2/long rest"
      },
      {
        name: "Unarmored Defense",
        level: 1,
        description: "While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit."
      }
    ],
    2: [
      {
        name: "Reckless Attack",
        level: 2,
        description: "Starting at 2nd level, you can throw aside all concern for defense to attack with fierce desperation. When you make your first attack on your turn, you can decide to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength during this turn, but attack rolls against you have advantage until your next turn."
      },
      {
        name: "Danger Sense",
        level: 2,
        description: "At 2nd level, you gain an uncanny sense of when things nearby aren't as they should be, giving you an edge when you dodge away from danger. You have advantage on Dexterity saving throws against effects that you can see, such as traps and spells. To gain this benefit, you can't be blinded, deafened, or incapacitated."
      }
    ],
    3: [
      {
        name: "Primal Path",
        level: 3,
        description: "At 3rd level, you choose a path that shapes the nature of your rage. Pick from the available Primal Path options below.",
        choiceRequired: true,
        choices: [
          {
            name: "Path of the Berserker",
            description: "For some barbarians, rage is a means to an end—that end being violence. The Path of the Berserker is a path of untrammeled fury, slick with blood. As you enter the berserker's rage, you thrill in the chaos of battle, heedless of your own health or well-being.\n\nFrenzy (3rd): While raging, you can go into a frenzy. If you do so, for the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns after this one. When your rage ends, you suffer one level of exhaustion.\n\nMindless Rage (6th): You can't be charmed or frightened while raging. If you are charmed or frightened when you enter your rage, the effect is suspended for the duration of the rage.\n\nIntimidating Presence (10th): You can use your action to frighten someone with your menacing presence. Choose one creature within 30 feet. It must succeed on a Wisdom saving throw or be frightened until the end of your next turn.\n\nRetaliation (14th): When you take damage from a creature within 5 feet of you, you can use your reaction to make a melee weapon attack against that creature."
          },        ]
      }
    ]
  },

  Bard: {
    1: [
      {
        name: "Spellcasting",
        level: 1,
        description: "You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music. Your spells are part of your vast repertoire, magic that you can tune to different situations. You know 4 cantrips and 4 1st-level spells at 1st level."
      },
      {
        name: "Bardic Inspiration",
        level: 1,
        description: "You can inspire others through stirring words or music. To do so, you use a bonus action on your turn to choose one creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die, a d6.\n\nOnce within the next 10 minutes, the creature can roll the die and add the number rolled to one ability check, attack roll, or saving throw it makes. The creature can wait until after it rolls the d20 before deciding to use the Bardic Inspiration die, but must decide before the DM says whether the roll succeeds or fails. Once the Bardic Inspiration die is rolled, it is lost. A creature can have only one Bardic Inspiration die at a time.\n\nYou can use this feature a number of times equal to your Charisma modifier (minimum of once). You regain any expended uses when you finish a long rest.\n\nYour Bardic Inspiration die changes when you reach certain levels in this class. The die becomes a d8 at 5th level, a d10 at 10th level, and a d12 at 15th level.",
        uses: "Charisma modifier/long rest"
      }
    ],
    2: [
      {
        name: "Jack of All Trades",
        level: 2,
        description: "Starting at 2nd level, you can add half your proficiency bonus, rounded down, to any ability check you make that doesn't already include your proficiency bonus."
      },
      {
        name: "Song of Rest",
        level: 2,
        description: "Beginning at 2nd level, you can use soothing music or oration to help revitalize your wounded allies during a short rest. If you or any friendly creatures who can hear your performance regain hit points at the end of the short rest by spending one or more Hit Dice, each of those creatures regains an extra 1d6 hit points. The extra hit points increase when you reach certain levels in this class: to 1d8 at 9th level, to 1d10 at 13th level, and to 1d12 at 17th level."
      }
    ],
    3: [
      {
        name: "Bard College",
        level: 3,
        description: "At 3rd level, you delve into the advanced techniques of a bard college of your choice. Your choice grants you features at 3rd level and again at 6th and 14th level.",
        choiceRequired: true,
        choices: [
          {
            name: "College of Lore",
            description: "Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales. They use their knowledge and their magic to uncover secrets and undo those who would do ill.\n\nBonus Proficiencies (3rd): You gain proficiency with three skills of your choice.\n\nCutting Words (3rd): You learn how to use your wit to distract, confuse, and otherwise sap the confidence of others. When a creature you can see within 60 feet makes an attack roll, ability check, or damage roll, you can use your reaction to expend one Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number from the creature's roll.\n\nAdditional Magical Secrets (6th): You learn two spells of your choice from any class. The spells you choose must be of a level you can cast.\n\nPeerless Skill (14th): When you make an ability check, you can expend one use of Bardic Inspiration. Roll a Bardic Inspiration die and add it to your ability check."
          },        ]
      },
      {
        name: "Expertise",
        level: 3,
        description: "At 3rd level, choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies. At 10th level, you can choose another two skill proficiencies to gain this benefit."
      }
    ]
  },

  Cleric: {
    1: [
      {
        name: "Spellcasting",
        level: 1,
        description: "As a conduit for divine power, you can cast cleric spells. You prepare the list of cleric spells that are available for you to cast, choosing from the cleric spell list. You can change your list of prepared spells when you finish a long rest."
      },
      {
        name: "Divine Domain",
        level: 1,
        description: "Choose one domain related to your deity. Your choice grants you domain spells and other features when you choose it at 1st level and additional benefits at 2nd, 6th, 8th, and 17th level.",
        choiceRequired: true,
        choices: [          {
            name: "Life Domain",
            description: "The Life domain focuses on the vibrant positive energy that sustains all life. The gods of life promote vitality and health through healing the sick and wounded, caring for those in need, and driving away the forces of death and undeath.\n\nBonus Proficiency (1st): You gain proficiency with heavy armor.\n\nDisciple of Life (1st): Your healing spells are more effective. Whenever you use a spell of 1st level or higher to restore hit points to a creature, the creature regains additional hit points equal to 2 + the spell's level.\n\nChannel Divinity: Preserve Life (2nd): You can use your Channel Divinity to heal the badly injured. As an action, you present your holy symbol and evoke healing energy that can restore hit points equal to five times your cleric level. Choose any creatures within 30 feet of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum.\n\nBlessed Healer (6th): The healing spells you cast on others heal you as well. When you cast a spell of 1st level or higher that restores hit points to a creature other than you, you regain hit points equal to 2 + the spell's level.\n\nDivine Strike (8th): You gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 radiant damage to the target.\n\nSupreme Healing (17th): When you would normally roll one or more dice to restore hit points with a spell, you instead use the highest number possible for each die."
          },        ]
      },
      {
        name: "Expertise",
        level: 3,
        description: "At 3rd level, choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies. At 10th level, you can choose another two skill proficiencies to gain this benefit."
      }
    ]
  },

  Druid: {
    1: [
      {
        name: "Druidic",
        level: 1,
        description: "You know Druidic, the secret language of druids. You can speak the language and use it to leave hidden messages. You and others who know this language automatically spot such a message. Others spot the message's presence with a successful DC 15 Wisdom (Perception) check but can't decipher it without magic."
      },
      {
        name: "Spellcasting",
        level: 1,
        description: "Drawing on the divine essence of nature itself, you can cast spells to shape that essence to your will. You prepare the list of druid spells that are available for you to cast, choosing from the druid spell list."
      }
    ],
    2: [
      {
        name: "Wild Shape",
        level: 2,
        description: "Starting at 2nd level, you can use your action to magically assume the shape of a beast that you have seen before. You can use this feature twice. You regain expended uses when you finish a short or long rest.\n\nYour druid level determines the beasts you can transform into. At 2nd level, you can transform into any beast that has a challenge rating of 1/4 or lower that doesn't have a flying or swimming speed.\n\nYou can stay in a beast shape for a number of hours equal to half your druid level (rounded down). You then revert to your normal form unless you expend another use of this feature.",
        uses: "2/short rest"
      },
      {
        name: "Druid Circle",
        level: 2,
        description: "At 2nd level, you choose to identify with a circle of druids. Your choice grants you features at 2nd level and again at 6th, 10th, and 14th level.",
        choiceRequired: true,
        choices: [
          {
            name: "Circle of the Land",
            description: "The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition. These druids meet within sacred circles of trees or standing stones to whisper primal secrets in Druidic.\n\nBonus Cantrip (2nd): You learn one additional druid cantrip of your choice.\n\nNatural Recovery (2nd): You can regain some of your magical energy by sitting in meditation and communing with nature. During a short rest, you choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your druid level (rounded up), and none of the slots can be 6th level or higher. You can't use this feature again until you finish a long rest.\n\nCircle Spells (3rd, 5th, 7th, 9th): Your mystical connection to the land infuses you with the ability to cast certain spells. You choose a type of terrain (Arctic, Coast, Desert, Forest, Grassland, Mountain, Swamp, or Underdark) and gain access to circle spells based on that terrain.\n\nLand's Stride (6th): Moving through nonmagical difficult terrain costs you no extra movement. You can also pass through nonmagical plants without being slowed and without taking damage if they have thorns, spines, or a similar hazard.\n\nNature's Ward (10th): You can't be charmed or frightened by elementals or fey, and you are immune to poison and disease.\n\nNature's Sanctuary (14th): Creatures of the natural world sense your connection to nature and become hesitant to attack you. When a beast or plant creature attacks you, that creature must make a Wisdom saving throw. On a failed save, the creature must choose a different target, or the attack automatically misses."
          },        ]
      }
    ]
  },

  Fighter: {
    1: [
      {
        name: "Fighting Style",
        level: 1,
        description: "You adopt a particular style of fighting as your specialty. Choose one of the following options. You can't take a Fighting Style option more than once, even if you later get to choose again.",
        choiceRequired: true,
        choices: [
          {
            name: "Archery",
            description: "You gain a +2 bonus to attack rolls you make with ranged weapons."
          },
          {
            name: "Defense",
            description: "While you are wearing armor, you gain a +1 bonus to AC."
          },
          {
            name: "Dueling",
            description: "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon."
          },
          {
            name: "Great Weapon Fighting",
            description: "When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2. The weapon must have the two-handed or versatile property for you to gain this benefit."
          },
          {
            name: "Protection",
            description: "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield."
          },
          {
            name: "Two-Weapon Fighting",
            description: "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack."
          }
        ]
      },
      {
        name: "Second Wind",
        level: 1,
        description: "You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.",
        uses: "1/short rest"
      }
    ],
    2: [
      {
        name: "Action Surge",
        level: 2,
        description: "Starting at 2nd level, you can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action. Once you use this feature, you must finish a short or long rest before you can use it again. Starting at 17th level, you can use it twice before a rest, but only once on the same turn.",
        uses: "1/short rest"
      }
    ],
    3: [
      {
        name: "Martial Archetype",
        level: 3,
        description: "At 3rd level, you choose an archetype that you strive to emulate in your combat styles and techniques. Pick from the available Martial Archetype options below.",
        choiceRequired: true,
        choices: [
          {
            name: "Champion",
            description: "The archetypal Champion focuses on the development of raw physical power honed to deadly perfection. Those who model themselves on this archetype combine rigorous training with physical excellence to deal devastating blows.\n\nImproved Critical (3rd): Your weapon attacks score a critical hit on a roll of 19 or 20.\n\nRemarkable Athlete (7th): You can add half your proficiency bonus (rounded up) to any Strength, Dexterity, or Constitution check you make that doesn't already use your proficiency bonus. In addition, when you make a running long jump, the distance you can cover increases by a number of feet equal to your Strength modifier.\n\nAdditional Fighting Style (10th): You can choose a second option from the Fighting Style class feature.\n\nSuperior Critical (15th): Your weapon attacks score a critical hit on a roll of 18–20.\n\nSurvivor (18th): At the start of each of your turns, you regain hit points equal to 5 + your Constitution modifier if you have no more than half of your hit points left. You don't gain this benefit if you have 0 hit points."
          },        ]
      }
    ]
  },

  Monk: {
    1: [
      {
        name: "Unarmored Defense",
        level: 1,
        description: "Beginning at 1st level, while you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier."
      },
      {
        name: "Martial Arts",
        level: 1,
        description: "At 1st level, your practice of martial arts gives you mastery of combat styles that use unarmed strikes and monk weapons.\n\nYou gain the following benefits while unarmed or wielding only monk weapons and you aren't wearing armor or wielding a shield:\n• You can use Dexterity instead of Strength for the attack and damage rolls of your unarmed strikes and monk weapons.\n• You can roll a d4 in place of the normal damage of your unarmed strike or monk weapon. This die changes as you gain monk levels.\n• When you use the Attack action with an unarmed strike or a monk weapon on your turn, you can make one unarmed strike as a bonus action."
      }
    ],
    2: [
      {
        name: "Ki",
        level: 2,
        description: "Starting at 2nd level, your training allows you to harness the mystic energy of ki. Your access to this energy is represented by a number of ki points. Your monk level determines the number of points you have (2 ki points at 2nd level).\n\nYou can spend these points to fuel various ki features. You start knowing three such features: Flurry of Blows, Patient Defense, and Step of the Wind. You learn more ki features as you gain levels in this class. When you spend a ki point, it is unavailable until you finish a short or long rest.\n\n• Flurry of Blows: Immediately after you take the Attack action, you can spend 1 ki point to make two unarmed strikes as a bonus action.\n• Patient Defense: You can spend 1 ki point to take the Dodge action as a bonus action.\n• Step of the Wind: You can spend 1 ki point to take the Disengage or Dash action as a bonus action, and your jump distance is doubled for the turn.",
        uses: "2 ki points/short rest at 2nd level"
      },
      {
        name: "Unarmored Movement",
        level: 2,
        description: "Starting at 2nd level, your speed increases by 10 feet while you are not wearing armor or wielding a shield. This bonus increases when you reach certain monk levels. At 9th level, you gain the ability to move along vertical surfaces and across liquids on your turn without falling during the move."
      }
    ],
    3: [
      {
        name: "Monastic Tradition",
        level: 3,
        description: "At 3rd level, you commit yourself to a monastic tradition. Your tradition grants you features at 3rd level and again at 6th, 11th, and 17th level.",
        choiceRequired: true,
        choices: [
          {
            name: "Way of the Open Hand",
            description: "Monks of the Way of the Open Hand are the ultimate masters of martial arts combat. They learn techniques to push and trip their opponents, manipulate ki to heal damage to their bodies, and practice advanced meditation that can protect them from harm.\n\nOpen Hand Technique (3rd): Whenever you hit a creature with one of the attacks granted by your Flurry of Blows, you can impose one of the following effects: knocked prone, pushed up to 15 feet away, or prevented from taking reactions until the end of your next turn.\n\nWholesness of Body (6th): You can use your action to regain hit points equal to three times your monk level. You must finish a long rest before you can use this feature again.\n\nTranquility (11th): You can cast the sanctuary spell on yourself without expending a spell slot or material components. The spell lasts for 8 hours. Once you cast the spell in this way, you can't do so again for 1 minute.\n\nQuivering Palm (17th): When you hit a creature with an unarmed strike, you can spend 3 ki points to start imperceptible vibrations. At any time before the end of your next long rest, you can use your action to end the vibrations, forcing the creature to make a Constitution saving throw. On a failed save, it is reduced to 0 hit points. On a successful save, it takes 10d10 necrotic damage."
          },        ]
      },
      {
        name: "Deflect Missiles",
        level: 3,
        description: "Starting at 3rd level, you can use your reaction to deflect or catch the missile when you are hit by a ranged weapon attack. When you do so, the damage you take from the attack is reduced by 1d10 + your Dexterity modifier + your monk level.\n\nIf you reduce the damage to 0, you can catch the missile if it is small enough for you to hold in one hand and you have at least one hand free. If you catch a missile in this way, you can spend 1 ki point to make a ranged attack with the weapon or piece of ammunition you just caught, as part of the same reaction. You make this attack with proficiency, and the missile counts as a monk weapon for the attack."
      }
    ]
  },

  Paladin: {
    1: [
      {
        name: "Divine Sense",
        level: 1,
        description: "The presence of strong evil registers on your senses like a noxious odor, and powerful good rings like heavenly music in your ears. As an action, you can open your awareness to detect such forces. Until the end of your next turn, you know the location of any celestial, fiend, or undead within 60 feet of you that is not behind total cover. You know the type of any being whose presence you sense, but not its identity. Within the same radius, you also detect the presence of any place or object that has been consecrated or desecrated.\n\nYou can use this feature a number of times equal to 1 + your Charisma modifier. When you finish a long rest, you regain all expended uses.",
        uses: "1 + Charisma modifier/long rest"
      },
      {
        name: "Lay on Hands",
        level: 1,
        description: "Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5.\n\nAs an action, you can touch a creature and draw power from the pool to restore a number of hit points to that creature, up to the maximum amount remaining in your pool.\n\nAlternatively, you can expend 5 hit points from your pool of healing to cure the target of one disease or neutralize one poison affecting it. You can cure multiple diseases and neutralize multiple poisons with a single use of Lay on Hands, expending hit points separately for each one.",
        uses: "Paladin level × 5 HP/long rest"
      }
    ],
    2: [
      {
        name: "Fighting Style",
        level: 2,
        description: "At 2nd level, you adopt a style of fighting as your specialty. Choose one of the following options. You can't take a Fighting Style option more than once, even if you get to choose again.",
        choiceRequired: true,
        choices: [
          { name: "Defense", description: "While you are wearing armor, you gain a +1 bonus to AC." },
          { name: "Dueling", description: "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon." },
          { name: "Great Weapon Fighting", description: "When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll. The weapon must have the two-handed or versatile property." },
          { name: "Protection", description: "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield." }
        ]
      },
      {
        name: "Spellcasting",
        level: 2,
        description: "By 2nd level, you have learned to draw on divine magic through meditation and prayer to cast spells as a cleric does. You prepare the list of paladin spells that are available for you to cast."
      },
      {
        name: "Divine Smite",
        level: 2,
        description: "Starting at 2nd level, when you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target, in addition to the weapon's damage. The extra damage is 2d8 for a 1st-level spell slot, plus 1d8 for each spell level higher than 1st, to a maximum of 5d8. The damage increases by 1d8 if the target is an undead or a fiend, to a maximum of 6d8."
      }
    ],
    3: [
      {
        name: "Divine Health",
        level: 3,
        description: "By 3rd level, the divine magic flowing through you makes you immune to disease."
      },
      {
        name: "Sacred Oath",
        level: 3,
        description: "When you reach 3rd level, you swear the oath that binds you as a paladin forever. Your choice grants you features at 3rd level and again at 7th, 15th, and 20th level.",
        choiceRequired: true,
        choices: [
          {
            name: "Oath of Devotion",
            description: "The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order. Sometimes called cavaliers, white knights, or holy warriors, these paladins meet the ideal of the knight in shining armor, acting with honor in pursuit of justice and the greater good.\n\nTenets: Honesty, Courage, Compassion, Honor, Duty.\n\nOath Spells (3rd): You gain oath spells at the paladin levels listed: protection from evil and good, sanctuary (3rd); lesser restoration, zone of truth (5th); beacon of hope, dispel magic (9th); freedom of movement, guardian of faith (13th); commune, flame strike (17th).\n\nChannel Divinity: Sacred Weapon (3rd): As an action, you can imbue one weapon with positive energy. For 1 minute, you add your Charisma modifier to attack rolls made with that weapon (minimum bonus of +1). The weapon also emits bright light in a 20-foot radius and dim light 20 feet beyond that. If the weapon is not already magical, it becomes magical for the duration.\n\nChannel Divinity: Turn the Unholy (3rd): As an action, you present your holy symbol and speak a prayer censuring fiends and undead. Each fiend or undead that can see or hear you within 30 feet must make a Wisdom saving throw. If the creature fails, it is turned for 1 minute or until it takes damage.\n\nAura of Devotion (7th): You and friendly creatures within 10 feet of you can't be charmed while you are conscious. At 18th level, the range increases to 30 feet.\n\nPurity of Spirit (15th): You are always under the effects of a protection from evil and good spell.\n\nHoly Nimbus (20th): As an action, you can emanate an aura of sunlight. For 1 minute, bright light shines from you in a 30-foot radius, and dim light shines 30 feet beyond that. Whenever an enemy creature starts its turn in the bright light, the creature takes 10 radiant damage. In addition, for the duration, you have advantage on saving throws against spells cast by fiends or undead. Once you use this feature, you can't use it again until you finish a long rest."
          },        ]
      },
      {
        name: "Divine Health",
        level: 3,
        description: "By 3rd level, the divine magic flowing through you makes you immune to disease."
      }
    ]
  },

  Ranger: {
    1: [
      {
        name: "Favored Enemy",
        level: 1,
        description: "Beginning at 1st level, you have significant experience studying, tracking, hunting, and even talking to a certain type of enemy. Choose a type of favored enemy: aberrations, beasts, celestials, constructs, dragons, elementals, fey, fiends, giants, monstrosities, oozes, plants, or undead. Alternatively, you can select two races of humanoid (such as gnolls and orcs) as favored enemies.\n\nYou have advantage on Wisdom (Survival) checks to track your favored enemies, as well as on Intelligence checks to recall information about them. You choose one additional favored enemy, as well as an associated language, at 6th and 14th level."
      },
      {
        name: "Natural Explorer",
        level: 1,
        description: "You are particularly familiar with one type of natural environment and are adept at traveling and surviving in such regions. Choose one type of favored terrain: arctic, coast, desert, forest, grassland, mountain, swamp, or the Underdark.\n\nWhen you make an Intelligence or Wisdom check related to your favored terrain, your proficiency bonus is doubled if you are using a skill that you're proficient in. While traveling for an hour or more in your favored terrain, you gain the following benefits:\n• Difficult terrain doesn't slow your group's travel.\n• Your group can't become lost except by magical means.\n• Even when you are engaged in another activity while traveling, you remain alert to danger.\n• If you are traveling alone, you can move stealthily at a normal pace.\n• When you forage, you find twice as much food as you normally would.\n• While tracking other creatures, you also learn their exact number, sizes, and how long ago they passed through the area.\n\nYou choose additional favored terrain types at 6th and 10th level."
      }
    ],
    2: [
      {
        name: "Fighting Style",
        level: 2,
        description: "At 2nd level, you adopt a particular style of fighting as your specialty. Choose one of the following options. You can't take a Fighting Style option more than once.",
        choiceRequired: true,
        choices: [
          { name: "Archery", description: "You gain a +2 bonus to attack rolls you make with ranged weapons." },
          { name: "Defense", description: "While you are wearing armor, you gain a +1 bonus to AC." },
          { name: "Dueling", description: "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon." },
          { name: "Two-Weapon Fighting", description: "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack." }
        ]
      },
      {
        name: "Spellcasting",
        level: 2,
        description: "By the time you reach 2nd level, you have learned to use the magical essence of nature to cast spells, much as a druid does. You know two 1st-level ranger spells of your choice."
      }
    ],
    3: [
      {
        name: "Ranger Archetype",
        level: 3,
        description: "At 3rd level, you choose an archetype that you strive to emulate. Your choice grants you features at 3rd level and again at 7th, 11th, and 15th level.",
        choiceRequired: true,
        choices: [
          {
            name: "Hunter",
            description: "Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness. As you walk the Hunter's path, you learn specialized techniques for fighting the threats you face.\n\nHunter's Prey (3rd): You gain one of the following features of your choice: Colossus Slayer (extra 1d8 damage once per turn to a creature already injured), Giant Killer (reaction attack when Large or larger creature attacks you), or Horde Breaker (extra attack against different creature within 5 feet of first target).\n\nDefensive Tactics (7th): You gain one of the following features: Escape the Horde (opportunity attacks against you are made with disadvantage), Multiattack Defense (+4 AC against subsequent attacks from same creature), or Steel Will (advantage on saves against being frightened).\n\nMultiattack (11th): You gain one of the following features: Volley (ranged attack against all creatures in 10-foot radius), or Whirlwind Attack (melee attack against all creatures within 5 feet).\n\nSuperior Hunter's Defense (15th): You gain one of the following features: Evasion (when you are subjected to an effect that allows a Dexterity save for half damage, you instead take no damage on success and half on failure), Stand Against the Tide (when a creature misses you with a melee attack, you can use your reaction to force that creature to repeat the attack against another creature of your choice), or Uncanny Dodge (when an attacker you can see hits you with an attack, you can use your reaction to halve the attack's damage)."
          },        ]
      },
      {
        name: "Primeval Awareness",
        level: 3,
        description: "Beginning at 3rd level, you can use your action and expend one ranger spell slot to focus your awareness on the region around you. For 1 minute per level of the spell slot you expend, you can sense whether the following types of creatures are present within 1 mile of you (or within up to 6 miles if you are in your favored terrain): aberrations, celestials, dragons, elementals, fey, fiends, and undead. This feature doesn't reveal the creatures' location or number."
      }
    ]
  },

  Rogue: {
    1: [
      {
        name: "Expertise",
        level: 1,
        description: "At 1st level, choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies. At 6th level, you can choose two more of your proficiencies to gain this benefit."
      },
      {
        name: "Sneak Attack",
        level: 1,
        description: "Beginning at 1st level, you know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon.\n\nYou don't need advantage on the attack roll if another enemy of the target is within 5 feet of it, that enemy isn't incapacitated, and you don't have disadvantage on the attack roll.\n\nThe amount of the extra damage increases as you gain levels in this class (2d6 at 3rd level, 3d6 at 5th, etc.)."
      },
      {
        name: "Thieves' Cant",
        level: 1,
        description: "During your rogue training you learned thieves' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation. It takes four times longer to convey such a message than it does to speak the same idea plainly."
      }
    ],
    2: [
      {
        name: "Cunning Action",
        level: 2,
        description: "Starting at 2nd level, your quick thinking and agility allow you to move and act quickly. You can take a bonus action on each of your turns in combat. This action can be used only to take the Dash, Disengage, or Hide action."
      }
    ],
    3: [
      {
        name: "Roguish Archetype",
        level: 3,
        description: "At 3rd level, you choose an archetype that you emulate in the exercise of your rogue abilities. Your archetype choice grants you features at 3rd level and then again at 9th, 13th, and 17th level.",
        choiceRequired: true,
        choices: [
          {
            name: "Thief",
            description: "You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype, but so do rogues who prefer to think of themselves as professional treasure seekers, explorers, delvers, and investigators.\n\nFast Hands (3rd): You can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves' tools to disarm a trap or open a lock, or take the Use an Object action.\n\nSecond-Story Work (3rd): You gain the ability to climb faster than normal; climbing no longer costs you extra movement. In addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier.\n\nSupreme Sneak (9th): You have advantage on Dexterity (Stealth) checks if you move no more than half your speed on the same turn.\n\nUse Magic Device (13th): You ignore all class, race, and level requirements on the use of magic items.\n\nThief's Reflexes (17th): You can take two turns during the first round of any combat. You take your first turn at your normal initiative and your second turn at your initiative minus 10."
          },        ]
      }
    ]
  },

  Sorcerer: {
    1: [
      {
        name: "Spellcasting",
        level: 1,
        description: "An event in your past, or in the life of a parent or ancestor, left an indelible mark on you, infusing you with arcane magic. This font of magic, whatever its origin, fuels your spells. You know 4 cantrips and 2 1st-level spells at 1st level."
      },
      {
        name: "Sorcerous Origin",
        level: 1,
        description: "Choose a sorcerous origin, which describes the source of your innate magical power. Your choice grants you features when you choose it at 1st level and again at 6th, 14th, and 18th level.",
        choiceRequired: true,
        choices: [
          {
            name: "Draconic Bloodline",
            description: "Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors. Most often, sorcerers with this origin trace their descent back to a mighty sorcerer of ancient times who made a bargain with a dragon or who might even have claimed a dragon parent.\n\nDragon Ancestor (1st): You choose one type of dragon as your ancestor. The damage type associated with each dragon is used by features you gain later. You can speak, read, and write Draconic. Additionally, whenever you make a Charisma check when interacting with dragons, your proficiency bonus is doubled if it applies to the check.\n\nDraconic Resilience (1st): As magic flows through your body, it causes physical traits of your dragon ancestors to emerge. Your hit point maximum increases by 1 and increases by 1 again whenever you gain a level in this class. Additionally, parts of your skin are covered by a thin sheen of dragon-like scales. When you aren't wearing armor, your AC equals 13 + your Dexterity modifier.\n\nElemental Affinity (6th): When you cast a spell that deals damage of the type associated with your draconic ancestry, you can add your Charisma modifier to one damage roll of that spell. At the same time, you can spend 1 sorcery point to gain resistance to that damage type for 1 hour.\n\nDragon Wings (14th): You gain the ability to sprout a pair of dragon wings from your back, gaining a flying speed equal to your current speed. You can create these wings as a bonus action on your turn. They last until you dismiss them as a bonus action on your turn.\n\nDraconic Presence (18th): You can channel the dread presence of your dragon ancestor, causing those around you to become awestruck or frightened. As an action, you can spend 5 sorcery points to draw on this power and exude an aura of awe or fear (your choice) to a distance of 60 feet. For 1 minute or until you lose your concentration, each hostile creature that starts its turn in this aura must succeed on a Wisdom saving throw or be charmed (if you chose awe) or frightened (if you chose fear) until the aura ends."
          },        ]
      }
    ],
    2: [
      {
        name: "Font of Magic",
        level: 2,
        description: "At 2nd level, you tap into a deep wellspring of magic within yourself. This wellspring is represented by sorcery points, which allow you to create a variety of magical effects.\n\nYou have 2 sorcery points at 2nd level, and you gain more as you reach higher levels. You can never have more sorcery points than shown on the Sorcerer table for your level. You regain all spent sorcery points when you finish a long rest.\n\nYou can use your sorcery points to gain additional spell slots, or sacrifice spell slots to gain additional sorcery points.",
        uses: "2 sorcery points/long rest at 2nd level"
      }
    ],
    3: [
      {
        name: "Metamagic",
        level: 3,
        description: "At 3rd level, you gain the ability to twist your spells to suit your needs. You gain two of the following Metamagic options of your choice. You gain another one at 10th and 17th level. You can use only one Metamagic option on a spell when you cast it, unless otherwise noted.",
        choiceRequired: true,
        choices: [
          { name: "Careful Spell", description: "When you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full force. To do so, you spend 1 sorcery point and choose a number of those creatures up to your Charisma modifier (minimum of one creature). A chosen creature automatically succeeds on its saving throw against the spell." },
          { name: "Distant Spell", description: "When you cast a spell that has a range of 5 feet or greater, you can spend 1 sorcery point to double the range of the spell. When you cast a spell that has a range of touch, you can spend 1 sorcery point to make the range of the spell 30 feet." },
          { name: "Empowered Spell", description: "When you roll damage for a spell, you can spend 1 sorcery point to reroll a number of the damage dice up to your Charisma modifier (minimum of one). You must use the new rolls. You can use Empowered Spell even if you have already used a different Metamagic option during the casting of the spell." },
          { name: "Extended Spell", description: "When you cast a spell that has a duration of 1 minute or longer, you can spend 1 sorcery point to double its duration, to a maximum duration of 24 hours." },
          { name: "Heightened Spell", description: "When you cast a spell that forces a creature to make a saving throw to resist its effects, you can spend 3 sorcery points to give one target of the spell disadvantage on its first saving throw made against the spell." },
          { name: "Quickened Spell", description: "When you cast a spell that has a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action for this casting." },
          { name: "Subtle Spell", description: "When you cast a spell, you can spend 1 sorcery point to cast it without any somatic or verbal components." },
          { name: "Twinned Spell", description: "When you cast a spell that targets only one creature and doesn't have a range of self, you can spend a number of sorcery points equal to the spell's level to target a second creature in range with the same spell (1 sorcery point if the spell is a cantrip). To be eligible, a spell must be incapable of targeting more than one creature at the spell's current level." }
        ]
      }
    ]
  },

  Warlock: {
    1: [
      {
        name: "Otherworldly Patron",
        level: 1,
        description: "At 1st level, you have struck a bargain with an otherworldly being of your choice. Your choice grants you features at 1st level and again at 6th, 10th, and 14th level.",
        choiceRequired: true,
        choices: [          {
            name: "The Fiend",
            description: "You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil, even if you strive against those aims. Such beings desire the corruption or destruction of all things, ultimately including you.\n\nExpanded Spell List: Burning hands, command (1st); blindness/deafness, scorching ray (2nd); fireball, stinking cloud (3rd); fire shield, wall of fire (4th); flame strike, hallow (5th).\n\nDark One's Blessing (1st): When you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level (minimum of 1).\n\nDark One's Own Luck (6th): You can call on your patron to alter fate in your favor. When you make an ability check or a saving throw, you can use this feature to add a d10 to your roll. You can do so after seeing the initial roll but before any of the roll's effects occur. Once you use this feature, you can't use it again until you finish a short or long rest.\n\nFiendish Resilience (10th): You can choose one damage type when you finish a short or long rest. You gain resistance to that damage type until you choose a different one with this feature. Damage from magical weapons or silver weapons ignores this resistance.\n\nHurl Through Hell (14th): When you hit a creature with an attack, you can use this feature to instantly transport the target through the lower planes. The creature disappears and hurtles through a nightmare landscape. At the end of your next turn, the target returns to the space it previously occupied, or the nearest unoccupied space. If the target is not a fiend, it takes 10d10 psychic damage as it reels from its horrific experience. Once you use this feature, you can't use it again until you finish a long rest."
          },        ]
      }
    ],
    2: [
      {
        name: "Eldritch Invocations",
        level: 2,
        description: "In your study of occult lore, you have unearthed eldritch invocations, fragments of forbidden knowledge that imbue you with an abiding magical ability. At 2nd level, you gain two eldritch invocations of your choice. When you gain certain warlock levels, you gain additional invocations (3rd at 5th level, 4th at 7th level, etc.).\n\nAdditionally, when you gain a level in this class, you can choose one of the invocations you know and replace it with another invocation that you could learn at that level."
      }
    ],
    3: [
      {
        name: "Pact Boon",
        level: 3,
        description: "At 3rd level, your otherworldly patron bestows a gift upon you for your loyal service. You gain one of the following features of your choice.",
        choiceRequired: true,
        choices: [
          {
            name: "Pact of the Chain",
            description: "You learn the find familiar spell and can cast it as a ritual. The spell doesn't count against your number of spells known. When you cast the spell, you can choose one of the normal forms for your familiar or one of the following special forms: imp, pseudodragon, quasit, or sprite.\n\nAdditionally, when you take the Attack action, you can forgo one of your own attacks to allow your familiar to make one attack with its reaction."
          },
          {
            name: "Pact of the Blade",
            description: "You can use your action to create a pact weapon in your empty hand. You can choose the form that this melee weapon takes each time you create it. You are proficient with it while you wield it. This weapon counts as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.\n\nYour pact weapon disappears if it is more than 5 feet away from you for 1 minute or more. It also disappears if you use this feature again, if you dismiss the weapon (no action required), or if you die. You can transform one magic weapon into your pact weapon by performing a special ritual while you hold the weapon."
          },
          {
            name: "Pact of the Tome",
            description: "Your patron gives you a grimoire called a Book of Shadows. When you gain this feature, choose three cantrips from any class's spell list (the three needn't be from the same list). While the book is on your person, you can cast those cantrips at will. They don't count against your number of cantrips known. If they don't appear on the warlock spell list, they are nonetheless warlock spells for you.\n\nIf you lose your Book of Shadows, you can perform a 1-hour ceremony to receive a replacement from your patron. This ceremony can be performed during a short or long rest, and it destroys the previous book."
          }
        ]
      }
    ]
  },

  Wizard: {
    1: [
      {
        name: "Spellcasting",
        level: 1,
        description: "As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power. You know 3 cantrips of your choice from the wizard spell list. You also have a spellbook containing six 1st-level wizard spells of your choice."
      },
      {
        name: "Arcane Recovery",
        level: 1,
        description: "You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your wizard level (rounded up), and none of the slots can be 6th level or higher.",
        uses: "1/long rest"
      }
    ],
    2: [
      {
        name: "Arcane Tradition",
        level: 2,
        description: "When you reach 2nd level, you choose an arcane tradition, shaping your practice of magic through one of eight schools. Your choice grants you features at 2nd level and again at 6th, 10th, and 14th level.",
        choiceRequired: true,
        choices: [          {
            name: "School of Evocation",
            description: "You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some evokers find employment in military forces, serving as artillery to blast enemy armies from afar.\n\nEvocation Savant (2nd): The gold and time you must spend to copy an evocation spell into your spellbook is halved.\n\nSculpt Spells (2nd): You can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.\n\nPotent Cantrip (6th): Your damaging cantrips affect even creatures that avoid the brunt of the effect. When a creature succeeds on a saving throw against your cantrip, the creature takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip.\n\nEmpowered Evocation (10th): You can add your Intelligence modifier to one damage roll of any wizard evocation spell you cast.\n\nOverchannel (14th): You can increase the power of your simpler spells. When you cast a wizard spell of 1st through 5th level that deals damage, you can deal maximum damage with that spell. The first time you do so, you suffer no adverse effect. If you use this feature again before you finish a long rest, you take 2d12 necrotic damage for each level of the spell, immediately after you cast it. Each time you use this feature again before finishing a long rest, the necrotic damage per spell level increases by 1d12."
          }
        ]
      }
    ]
  }
};

export function getClassFeaturesForLevel(className, level) {
  const classFeatures = classFeaturesData[className];
  if (!classFeatures) return [];

  let features = [];
  for (let lvl = 1; lvl <= level; lvl++) {
    if (classFeatures[lvl]) {
      features = features.concat(classFeatures[lvl]);
    }
  }

  return features;
}