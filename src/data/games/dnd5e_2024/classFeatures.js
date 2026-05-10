/**
 * D&D 5e (2024) — class features by level.
 *
 * Hand-authored against PHB 2024 RAW. The 2024 SRD does not embed
 * level-by-level progressions (`class_levels` is a URL ref, no
 * inline data, and there is no `5e-SRD-Levels.json` for 2024) so
 * this file fills the gap. Mirrors the shape of the 2014 dataset
 * at `src/game-packs/dnd5e/data/classFeatures.js` so step-level
 * UI can stay edition-agnostic and dispatch on `gamePack`.
 *
 * Shape:
 *
 *   {
 *     <ClassName>: {
 *       <level: number>: [
 *         {
 *           name,
 *           level,
 *           description,        // multi-paragraph; \n for line breaks
 *           uses?,              // "X/long rest" or similar
 *           choiceRequired?,    // true if the player picks
 *           choices?: [{name, description}],
 *           is_asi?,            // marks "Ability Score Improvement"
 *         }, ...
 *       ]
 *     }
 *   }
 *
 * 2024-specific changes are called out in the prose so testers
 * can see at a glance what differs from 2014:
 *   - Weapon Mastery on the six martial classes
 *   - Subclass selection unified at level 3 for every class
 *   - Brutal Strike replaces Brutal Critical (Barbarian)
 *   - Magical Inspiration (Bard) — Bardic Inspiration on spells
 *   - Channel Divinity scaling shift (Cleric / Paladin)
 *   - Wild Shape Forms with built-in stat blocks (Druid)
 *   - Tactical Mind / Tactical Shift (Fighter)
 *   - Discipline Points (renamed Ki) (Monk)
 *   - Smite-as-spell — Divine Smite is now a spell (Paladin)
 *   - Hunter's Mark scaling + Roving (Ranger)
 *   - Cunning Strike rider effects (Rogue)
 *   - Innate Sorcery (Sorcerer)
 *   - Magical Cunning (Warlock) — pact slots recharge mid-day
 *   - Memorize Spell + revised cantrip list (Wizard)
 *   - Epic Boon at level 19 (every class)
 *
 * Subclass pickers fire at level 3 across the board (uniform 2024
 * change). The "choice" feature at level 3 is the subclass-decision
 * gate; consumed by ClassFeaturesStep2024 + SubclassPicker.
 */

const classFeaturesData = {
  Barbarian: {
    1: [
      {
        name: "Rage",
        level: 1,
        description: "You can imbue yourself with a primal power called Rage, a force that grants you extraordinary might and resilience. As a Bonus Action, you can enter a Rage if you are not wearing Heavy armor.\n\nWhile raging, you gain the following benefits if you aren't wearing Heavy armor:\n• Damage Resistance: bludgeoning, piercing, and slashing damage.\n• Rage Damage: When you make a melee attack using Strength and deal damage to a target, you gain a bonus to the damage that increases as you gain levels (+2 at 1st, +3 at 9th, +4 at 16th).\n• Strength Advantage: Advantage on Strength checks and Strength saving throws.\n• Bonus Action: While raging, you can take a Bonus Action to attack a creature, do strength-based damage to an object, or end your Rage.\n\nYour Rage lasts until the end of your next turn and is then sustained for another round if you took or dealt damage during the previous turn. You can extend Rage further on each subsequent turn the same way (max 10 minutes). It ends early if you fall Unconscious or die. You can choose to end it on your turn (no action required).\n\nOnce you have Raged the maximum number of times for your level (2 at 1st level), you must finish a Long Rest before you can Rage again. You regain one expended use when you finish a Short Rest at level 11+.",
        uses: "2/long rest"
      },
      {
        name: "Unarmored Defense",
        level: 1,
        description: "While you aren't wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a Shield and still gain this benefit."
      },
      {
        name: "Weapon Mastery",
        level: 1,
        description: "(2024) Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency, such as Greataxes and Handaxes.\n\nWhenever you finish a Long Rest, you can change one of those weapon choices for another eligible weapon. At higher levels you gain access to more masteries (3 at 4th, 4 at 10th, 5 at 16th).\n\nWeapon mastery properties you might assign include Cleave (Greatsword/Greataxe/Halberd), Graze (Glaive/Greatsword), Push (Greatclub/Pike/Warhammer), Sap (Mace/Spear/Flail), Slow (Club/Javelin/Longbow), Topple (Battleaxe/Quarterstaff/Maul), and Vex (Dagger/Handaxe/Shortsword).",
        choiceRequired: true,
        choices: [
          { name: "Mastery slots", description: "Choose 2 weapon types you're proficient with to assign mastery properties to. The weapons in the choice list become available based on the weapon's `mastery` field in the 2024 SRD." }
        ]
      }
    ],
    2: [
      {
        name: "Reckless Attack",
        level: 2,
        description: "When you make your first attack roll on your turn, you can decide to attack recklessly. Doing so gives you Advantage on melee attack rolls using Strength during this turn, but attack rolls against you have Advantage until the start of your next turn."
      },
      {
        name: "Danger Sense",
        level: 2,
        description: "You have Advantage on Dexterity saving throws against effects that you can perceive (such as traps and Spells). To gain this benefit, you can't be Blinded, Deafened, or Incapacitated."
      }
    ],
    3: [
      {
        name: "Primal Path",
        level: 3,
        description: "(2024 unified subclass level) Choose a Primal Path that shapes the nature of your Rage. Your choice grants you features at 3rd level and again at 6th, 10th, and 14th levels.\n\nThe SRD-included Primal Path is Path of the Berserker. PHB 2024 also publishes Path of the Wild Heart, Path of the World Tree, and Path of the Zealot — those land via the subclass-features adapter when the dataset is extended.",
        choiceRequired: true,
        choices: [
          { name: "Path of the Berserker", description: "For some Barbarians, Rage is a means to an end — that end being violence. The Path of the Berserker lets you channel the rage into raw, unrelenting carnage." }
        ]
      },
      {
        name: "Primal Knowledge",
        level: 3,
        description: "(2024) When you reach 3rd level and again at 10th, you gain proficiency in one skill of your choice from the Barbarian skill list (Animal Handling, Athletics, Intimidation, Nature, Perception, Survival).\n\nIn addition, while raging, you can use Strength instead of Dexterity for the following skill checks: Acrobatics, Sleight of Hand, and Stealth."
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "You can increase one ability score by 2, or two ability scores by 1 each (no score above 20). Alternatively, you can take a Feat from the General feats list (PHB 2024)." }
    ],
    5: [
      {
        name: "Extra Attack",
        level: 5,
        description: "You can attack twice, instead of once, whenever you take the Attack action on your turn."
      },
      {
        name: "Fast Movement",
        level: 5,
        description: "Your speed increases by 10 feet while you aren't wearing Heavy armor."
      }
    ],
    6: [
      { name: "Primal Path Feature (6th)", level: 6, description: "Your Primal Path grants you a feature at 6th level. See the chosen path's entry under Subclasses." }
    ],
    7: [
      {
        name: "Feral Instinct",
        level: 7,
        description: "Your instincts are so honed that you have Advantage on Initiative rolls.\n\nIn addition, if you are Surprised at the start of combat and aren't Incapacitated, you can take your turn normally on the first round, but only if you enter your Rage as part of that turn (no action required to enter Rage)."
      },
      {
        name: "Instinctive Pounce",
        level: 7,
        description: "(2024) As part of the Bonus Action you take to enter your Rage, you can move up to half your Speed."
      }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General). See level 4 description." }
    ],
    9: [
      {
        name: "Brutal Strike",
        level: 9,
        description: "(2024 — replaces 2014's Brutal Critical) When you use Reckless Attack, you can forgo Advantage to gain a Brutal Strike effect. If you hit with that attack, the target takes an extra 1d10 damage of the same type as the weapon's damage. You also choose one of the following Brutal Strike effects:\n\n• Forceful Blow: The target is pushed 15 feet straight away from you, and you can move up to half your Speed straight toward the target without provoking Opportunity Attacks.\n• Hamstring Blow: The target's Speed is reduced by 15 feet until the start of your next turn. A target can be subjected to only one Hamstring Blow at a time, and a target with Speed of 0 is unaffected.\n\nYou gain the use of more options at higher levels (Improved Brutal Strike at 13, more options unlocked at 17)."
      }
    ],
    10: [
      { name: "Primal Path Feature (10th)", level: 10, description: "Your Primal Path grants you a feature at 10th level. See the chosen path's entry under Subclasses." }
    ],
    11: [
      {
        name: "Relentless Rage",
        level: 11,
        description: "Your Rage can keep you fighting despite grievous wounds. If you drop to 0 Hit Points while raging and don't die outright, you can make a DC 10 Constitution saving throw. If you succeed, you drop to 1 Hit Point instead.\n\nEach time you use this feature after the first, the DC increases by 5. When you finish a Short or Long Rest, the DC resets to 10."
      }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General). See level 4 description." }
    ],
    13: [
      {
        name: "Improved Brutal Strike",
        level: 13,
        description: "(2024) You have honed new ways to attack furiously. The following Brutal Strike options are added to those you have available:\n\n• Staggering Blow: The target has Disadvantage on the next saving throw it makes, and it can't make Opportunity Attacks until the start of your next turn.\n• Sundering Blow: One creature of your choice you can see within 60 feet of the target has Advantage on the next attack roll it makes against the target before the start of your next turn."
      }
    ],
    14: [
      { name: "Primal Path Feature (14th)", level: 14, description: "Your Primal Path grants you a feature at 14th level. See the chosen path's entry under Subclasses." }
    ],
    15: [
      {
        name: "Persistent Rage",
        level: 15,
        description: "(2024) Your Rage is so fierce that it can last indefinitely. Your Rage no longer ends if you didn't take or deal damage on your previous turn. Your Rage continues to end if you fall Unconscious or end it as a no-action.\n\nIn addition, you can extend the duration of your Rage by spending 1 Hit Die at the end of your turn (roll the die and gain that many temporary HP)."
      }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General). See level 4 description." }
    ],
    17: [
      {
        name: "Improved Brutal Strike (+1 effect)",
        level: 17,
        description: "(2024) When you use Brutal Strike, you can apply two of its effects to the same attack instead of one."
      }
    ],
    18: [
      {
        name: "Indomitable Might",
        level: 18,
        description: "If your total for a Strength check is less than your Strength score, you can use that score in place of the total."
      }
    ],
    19: [
      {
        name: "Epic Boon",
        level: 19,
        is_asi: true,
        description: "(2024) You gain an Epic Boon feat or another feat of your choice for which you qualify. The recommended Epic Boon for Barbarians is Boon of Irresistible Offense.\n\nAlternatively you can take an Ability Score Improvement (+2 to one or +1 to two)."
      }
    ],
    20: [
      {
        name: "Primal Champion",
        level: 20,
        description: "You embody the power of the wilds. Your Strength and Constitution scores increase by 4. Your maximum for those scores is now 25.",
      }
    ]
  },

  Bard: {
    1: [
      {
        name: "Bardic Inspiration",
        level: 1,
        description: "You can supernaturally inspire others through stirring words or music. As a Bonus Action, you can choose one creature within 60 feet of yourself that can hear you. That creature gains one Bardic Inspiration die, a d6.\n\nFor the next 10 minutes, the creature can roll the die and add the number rolled to one ability check, attack roll, or saving throw it makes. The creature can wait until after it rolls the d20 before deciding to use the Bardic Inspiration die, but must decide before the GM says whether the roll succeeds or fails. Once the Bardic Inspiration die is rolled, it is lost. A creature can have only one Bardic Inspiration die at a time.\n\nYou can use this feature a number of times equal to your Charisma modifier (minimum once). You regain any expended uses when you finish a Long Rest.\n\nThe die scales: d6 at 1st, d8 at 5th, d10 at 10th, d12 at 15th.",
        uses: "Cha mod/long rest"
      },
      {
        name: "Spellcasting (Cha)",
        level: 1,
        description: "You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music. Your spells are part of your vast repertoire, magic that you can tune to different situations.\n\nCantrips: You know two cantrips of your choice from the Bard spell list. You learn additional Bard cantrips at higher levels (3 at 4th, 4 at 10th).\n\nSpells Known and Spell Slots: The Bard table shows how many spell slots you have at each spell level. You know four 1st-level Bard spells of your choice; the table shows your total spells known at each level. Each spell must be of a level for which you have spell slots.\n\nSpellcasting Ability: Charisma. Spell save DC = 8 + your proficiency bonus + your Charisma modifier. Spell attack modifier = your proficiency bonus + your Charisma modifier.\n\n(2024) Bards now choose spells from the Bard list each long rest's preparation step using the Prepared Spells column rather than fixed spells-known."
      },
      {
        name: "Expertise",
        level: 1,
        description: "(2024 — moved from 3rd level) Choose two of your skill proficiencies. Your Proficiency Bonus is doubled for any ability check you make that uses either of those proficiencies.\n\nAt 9th level, you can choose two more of your skill proficiencies to gain this benefit."
      }
    ],
    2: [
      {
        name: "Jack of All Trades",
        level: 2,
        description: "You can add half your Proficiency Bonus, rounded down, to any ability check you make that uses a skill proficiency you lack and that doesn't otherwise use your Proficiency Bonus."
      },
      {
        name: "Magical Inspiration",
        level: 2,
        description: "(2024) When you cast a spell that uses a Spell Slot to restore Hit Points to a creature or deal damage to a creature, that creature can expend one Bardic Inspiration die you've given them, rolling it and either adding the number rolled to one of the spell's healing or damage rolls (player's choice)."
      }
    ],
    3: [
      {
        name: "Bard College",
        level: 3,
        description: "(2024 unified subclass level) Choose a Bard College that shapes the nature of your bardic magic. Your choice grants you features at 3rd, 6th, and 14th levels.\n\nThe SRD-included Bard College is College of Lore. PHB 2024 also publishes College of Dance, College of Glamour, and College of Valor.",
        choiceRequired: true,
        choices: [
          { name: "College of Lore", description: "Bards of the College of Lore know something about most things, collecting tidbits of knowledge from sources as diverse as scholarly tomes and peasant tales." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      {
        name: "Font of Inspiration",
        level: 5,
        description: "You regain all expended uses of your Bardic Inspiration when you finish a Short or Long Rest.\n\n(2024) In addition, your Bardic Inspiration die becomes a d8."
      }
    ],
    6: [
      { name: "Bard College Feature (6th)", level: 6, description: "Your Bard College grants you a feature at 6th level. See the chosen college's entry under Subclasses." }
    ],
    7: [
      {
        name: "Countercharm",
        level: 7,
        description: "(2024) When you or a creature within 30 feet of you that you can see fails a saving throw against an effect that applies the Charmed or Frightened condition, you can take a Reaction to allow the saving throw to be rerolled, and the new roll is made with Advantage. If the failure was caused by a 1 on the d20, the new roll is made with Disadvantage instead."
      }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      {
        name: "Expertise (additional)",
        level: 9,
        description: "Choose two more of your skill proficiencies. Your Proficiency Bonus is doubled for ability checks using either of these proficiencies."
      }
    ],
    10: [
      {
        name: "Magical Secrets",
        level: 10,
        description: "(2024) You have plundered magical knowledge from a wide spectrum of disciplines. Choose two spells from any class's spell list (including Bard). A spell you choose must be of a level you can cast or be a cantrip. The chosen spells count as Bard spells for you and are included in the number in the Spells Known column. You learn additional spells from any class's spell list when you reach certain Bard levels: 14th and 18th.\n\nIn addition, your Bardic Inspiration die becomes a d10."
      }
    ],
    11: [
      { name: "(no feature)", level: 11, description: "No new class feature this level. Your spell slots increase per the Bard table." }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "(no feature)", level: 13, description: "No new class feature this level." }
    ],
    14: [
      { name: "Bard College Feature (14th)", level: 14, description: "Your Bard College grants you a feature at 14th level." },
      { name: "Magical Secrets (additional)", level: 14, description: "Two more spells of your choice from any class's spell list, subject to the same rules." }
    ],
    15: [
      {
        name: "Bardic Inspiration (d12)",
        level: 15,
        description: "Your Bardic Inspiration die becomes a d12."
      }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "(no feature)", level: 17, description: "No new class feature this level." }
    ],
    18: [
      { name: "Magical Secrets (additional)", level: 18, description: "Two more spells of your choice from any class's spell list, subject to the same rules." }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Spell Recall. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Words of Creation",
        level: 20,
        description: "(2024 — replaces 2014's Superior Inspiration) You learn the Power Word Heal and Power Word Kill spells. You can cast each of them once without expending a Spell Slot, and you regain the ability to do so when you finish a Long Rest."
      }
    ]
  },

  Cleric: {
    1: [
      {
        name: "Spellcasting (Wis)",
        level: 1,
        description: "As a conduit for divine power, you can cast Cleric spells.\n\nCantrips: You know three Cleric cantrips of your choice. You learn additional Cleric cantrips at higher levels (4 at 4th, 5 at 10th).\n\nPreparing and Casting Spells: The Cleric table shows how many spell slots you have. You prepare a list of Cleric spells from the Cleric spell list, equal to your Wisdom modifier + your Cleric level (minimum of one spell). The spells must be of a level for which you have spell slots. You can change your list of prepared spells when you finish a Long Rest.\n\nSpellcasting Ability: Wisdom. Spell save DC = 8 + PB + Wis. Spell attack = PB + Wis.\n\nRitual Casting: You can cast a Cleric spell as a Ritual if that spell has the Ritual tag and you have the spell prepared.\n\nSpellcasting Focus: You can use a Holy Symbol as a Spellcasting Focus."
      },
      {
        name: "Divine Order",
        level: 1,
        description: "(2024 — new at 1st level) You have dedicated yourself to one of the following sacred roles of your choice:\n\n• Protector: Trained for battle, you gain proficiency with Martial weapons and you gain proficiency with Heavy Armor.\n• Thaumaturge: You learn one extra cantrip from the Cleric spell list, and your Wisdom score increases by 1, to a maximum of 20.",
        choiceRequired: true,
        choices: [
          { name: "Protector", description: "Martial weapons + Heavy Armor proficiency." },
          { name: "Thaumaturge", description: "+1 cantrip + Wis +1 (max 20)." }
        ]
      }
    ],
    2: [
      {
        name: "Channel Divinity",
        level: 2,
        description: "You can channel divine energy directly from the Outer Planes, using that energy to fuel magical effects. You start with two such effects: Turn Undead and an effect determined by your Divine Domain.\n\nWhen you use your Channel Divinity, you choose which effect to create. You must then finish a Short or Long Rest to use your Channel Divinity again. Some Channel Divinity effects require saving throws; the DC equals your Cleric spell save DC.\n\nYou gain additional uses at higher levels (2 uses at 6th, 3 uses at 18th).\n\nTurn Undead: As an Action, you present your Holy Symbol and speak a prayer censuring the Undead. Each Undead within 30 feet that can see or hear you must succeed on a Wisdom save or be Turned for 1 minute or until it takes any damage."
      }
    ],
    3: [
      {
        name: "Divine Domain",
        level: 3,
        description: "(2024 unified subclass level — moved from level 1 in 2014) Choose a Divine Domain related to your deity. The SRD-included Divine Domain is Life Domain. PHB 2024 also publishes Light, Trickery, and War.\n\nYour Divine Domain grants you features at 3rd, 6th, 17th, and other levels per the domain.",
        choiceRequired: true,
        choices: [
          { name: "Life Domain", description: "Life Domain Clerics emphasize the divine power that preserves and renews life." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      {
        name: "Sear Undead",
        level: 5,
        description: "(2024 — replaces 2014's Destroy Undead at the same level scaling) When an Undead fails its saving throw against your Turn Undead, the creature also takes Radiant damage equal to 1d8 plus your Wisdom modifier. The damage increases to 2d8 at 11th, 3d8 at 17th."
      }
    ],
    6: [
      { name: "Channel Divinity (2/rest)", level: 6, description: "You gain an additional use of Channel Divinity per rest." },
      { name: "Divine Domain Feature (6th)", level: 6, description: "Your Divine Domain grants you a feature at 6th level." }
    ],
    7: [
      {
        name: "Blessed Strikes",
        level: 7,
        description: "(2024) Once on each of your turns, you can deal an extra 1d8 damage to one target you damage with a cantrip or a weapon attack. The damage is the same type dealt by the cantrip or weapon, and the damage increases to 2d8 at 14th level.\n\nThis replaces the Divine Strike / Potent Spellcasting fork from 2014 — every Cleric gets the same blended progression."
      }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      { name: "(no feature)", level: 9, description: "No new class feature; spell slots progress per the Cleric table." }
    ],
    10: [
      {
        name: "Divine Intervention",
        level: 10,
        description: "(2024 — revised) You can call on your deity to intervene on your behalf. As a Magic action, choose any Cleric spell of 5th level or lower that doesn't require a Reaction to cast. As part of the same Action, you cast the spell without expending a Spell Slot or providing material components. You can't use this feature again until you finish a Long Rest."
      }
    ],
    11: [
      { name: "Sear Undead (2d8)", level: 11, description: "Sear Undead damage increases to 2d8 + Wis modifier." }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "(no feature)", level: 13, description: "No new class feature this level." }
    ],
    14: [
      { name: "Blessed Strikes (2d8)", level: 14, description: "Blessed Strikes bonus damage increases to 2d8." }
    ],
    15: [
      { name: "(no feature)", level: 15, description: "No new class feature this level." }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "Sear Undead (3d8)", level: 17, description: "Sear Undead damage increases to 3d8 + Wis modifier." },
      { name: "Divine Domain Feature (17th)", level: 17, description: "Your Divine Domain grants you a feature at 17th level." }
    ],
    18: [
      { name: "Channel Divinity (3/rest)", level: 18, description: "You gain a third use of Channel Divinity per rest." }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Truesight. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Greater Divine Intervention",
        level: 20,
        description: "(2024) When you use Divine Intervention, you can cast a Cleric spell of 9th level or lower instead of 5th level. The 1/long rest cap remains; once you've used Divine Intervention to cast a 6th-level-or-higher spell, you can't use it again until you finish a Long Rest.\n\nIn addition, the Wish spell becomes available as one of your Divine Intervention options."
      }
    ]
  },

  Druid: {
    1: [
      {
        name: "Druidic",
        level: 1,
        description: "You know Druidic, the secret language of Druids. You can speak the language and use it to leave hidden messages. You and others who know this language automatically spot such a message. Others spot the message's presence with a successful DC 15 Wisdom (Perception) check, but can't decipher it without magic."
      },
      {
        name: "Spellcasting (Wis)",
        level: 1,
        description: "Cantrips: 2 Druid cantrips of your choice (3 at 4th, 4 at 10th).\n\nPreparing and Casting Spells: Wis modifier + Druid level prepared from the Druid spell list. Spells changeable on a Long Rest.\n\nSpellcasting Ability: Wisdom. Spellcasting Focus: a Druidic Focus.\n\nRitual Casting: Druid spells with the Ritual tag can be cast as a ritual if prepared."
      },
      {
        name: "Primal Order",
        level: 1,
        description: "(2024 — new at 1st level) You have dedicated yourself to one of the following sacred roles of your choice:\n\n• Magician: You learn one extra cantrip from the Druid spell list, and you gain proficiency in either Arcana or Nature.\n• Warden: Trained for battle, you gain proficiency with Martial Weapons and Medium Armor.",
        choiceRequired: true,
        choices: [
          { name: "Magician", description: "+1 cantrip + Arcana or Nature proficiency." },
          { name: "Warden", description: "Martial Weapons + Medium Armor proficiency." }
        ]
      }
    ],
    2: [
      {
        name: "Wild Shape",
        level: 2,
        description: "(2024 — major revision) You can magically assume the shape of a beast that you have seen before. You can use this feature twice per Short or Long Rest.\n\nAs a Bonus Action, you transform into the form of a Wild Shape Form (chosen from a category list, with built-in stat blocks rather than 2014's beast-stat-by-CR memorization). You can stay in this form for a number of hours equal to half your Druid level, and revert with another Bonus Action or when you fall unconscious or drop to 0 HP.\n\nWhile in your Wild Shape form, your game statistics are replaced by the form's stat block, but you retain your Wisdom, Intelligence, and Charisma scores; you also retain all your skill proficiencies. You can't cast spells, but transforming doesn't break your Concentration on a spell already cast.\n\nForm categories include Land (e.g. wolf, panther), Aquatic (e.g. shark, octopus), and Air (e.g. hawk, eagle). Forms expand at higher levels."
      },
      {
        name: "Wild Companion",
        level: 2,
        description: "(2024) You can summon a spirit that assumes an animal form. As a Magic action, you can expend a use of your Wild Shape to cast Find Familiar without material components. The familiar is a Fey, and disappears when you finish a Long Rest."
      }
    ],
    3: [
      {
        name: "Druid Circle",
        level: 3,
        description: "(2024 unified subclass level — moved from level 2 in 2014) Choose a Druid Circle that reflects your bond with nature. The SRD-included Druid Circle is Circle of the Land. PHB 2024 also publishes Circle of the Moon, Circle of the Sea, and Circle of the Stars.",
        choiceRequired: true,
        choices: [
          { name: "Circle of the Land", description: "The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." },
      {
        name: "Wild Shape Improvement",
        level: 4,
        description: "Your Wild Shape forms expand. You gain access to forms in additional categories per your Druid Circle."
      }
    ],
    5: [
      { name: "(no feature)", level: 5, description: "No new class feature; spell slots progress." }
    ],
    6: [
      { name: "Druid Circle Feature (6th)", level: 6, description: "Your Druid Circle grants a feature at 6th level." }
    ],
    7: [
      {
        name: "Elemental Fury",
        level: 7,
        description: "(2024) The might of the elements flows through you. You gain one of the following options of your choice (cannot change):\n\n• Potent Spellcasting: Add your Wisdom modifier to the damage you deal with any Druid cantrip.\n• Primal Strike: Once on each of your turns when you hit a creature with an attack roll using a weapon or an unarmed strike (including in a Wild Shape form), you can deal an extra 1d8 damage of the same type as the weapon or natural attack."
      }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." },
      { name: "Wild Shape Improvement", level: 8, description: "Wild Shape forms expand further." }
    ],
    9: [
      { name: "(no feature)", level: 9, description: "Spell slots progress." }
    ],
    10: [
      { name: "Druid Circle Feature (10th)", level: 10, description: "Your Druid Circle grants a feature at 10th level." }
    ],
    11: [
      { name: "(no feature)", level: 11, description: "Spell slots progress." }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "(no feature)", level: 13, description: "No new class feature." }
    ],
    14: [
      { name: "Druid Circle Feature (14th)", level: 14, description: "Your Druid Circle grants a feature at 14th level." }
    ],
    15: [
      {
        name: "Improved Elemental Fury",
        level: 15,
        description: "(2024) The damage from Potent Spellcasting / Primal Strike increases (cantrip damage scales with Druid level via the cantrip table; Primal Strike damage increases to 2d8)."
      }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "(no feature)", level: 17, description: "No new class feature." }
    ],
    18: [
      {
        name: "Beast Spells",
        level: 18,
        description: "While in a Wild Shape form, you can cast spells (you must provide somatic and verbal components if the spell has them, even if your form can't normally make these components)."
      }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Spell Recall. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Archdruid",
        level: 20,
        description: "(2024) You become a paragon of natural magic. You can use Wild Shape unlimited times. In addition, your Wisdom and Constitution scores increase by 2, and the maximum for those scores becomes 22.\n\nFurthermore, when you would die, you can transform into a Wild Shape form one more time as your final breath, regaining HP equal to your Druid level + Constitution modifier."
      }
    ]
  },

  Fighter: {
    1: [
      {
        name: "Fighting Style",
        level: 1,
        description: "(2024 — gained at 1st level instead of as a feat) You adopt a particular style of fighting as your specialty. Choose one of the Fighting Style feats from the PHB 2024 Fighting Style feats list. The chosen feat counts as a Fighter feature for you, not a feat. You can change this choice when you reach 4th level and at certain higher levels.",
        choiceRequired: true,
        choices: [
          { name: "Archery", description: "+2 to attack rolls with ranged weapons." },
          { name: "Defense", description: "+1 AC while wearing armor." },
          { name: "Dueling", description: "+2 damage with one-handed melee weapons (no other weapon in other hand)." },
          { name: "Great Weapon Fighting", description: "Reroll 1s and 2s on damage with two-handed/versatile melee weapons." },
          { name: "Protection", description: "Use Reaction + Shield to impose Disadvantage on an attack against an ally within 5 feet." },
          { name: "Two-Weapon Fighting", description: "Add ability modifier to off-hand attack damage." }
        ]
      },
      {
        name: "Second Wind",
        level: 1,
        description: "(2024 — uses scale with level) On your turn, you can use a Bonus Action to regain Hit Points equal to 1d10 + your Fighter level. You can use this feature twice per Short or Long Rest at 1st level. The number of uses scales: 2 at 1st, 3 at 4th, 4 at 10th, 5 at 17th."
      },
      {
        name: "Weapon Mastery",
        level: 1,
        description: "(2024) Your training with weapons allows you to use the mastery properties of three kinds of weapons of your choice with which you have proficiency. Whenever you finish a Long Rest, you can change one of those choices for another eligible weapon. You learn additional masteries: 4 at 4th, 5 at 10th, 6 at 16th."
      }
    ],
    2: [
      {
        name: "Action Surge",
        level: 2,
        description: "On your turn, you can take one additional Action. Once you use this feature, you must finish a Short or Long Rest before you can use it again. Starting at 17th level, you can use it twice before a rest, but only once on the same turn."
      },
      {
        name: "Tactical Mind",
        level: 2,
        description: "(2024) You have a mind for tactics on and off the battlefield. When you fail an ability check, you can spend a use of Second Wind to push yourself toward success. Roll 1d10 and add the number rolled to the check. If this causes the check to succeed, you don't expend the use of Second Wind."
      }
    ],
    3: [
      {
        name: "Martial Archetype",
        level: 3,
        description: "(2024 unified subclass level) Choose a Martial Archetype that you strive to emulate. The SRD-included Martial Archetype is Champion. PHB 2024 also publishes Battle Master, Eldritch Knight, and Psi Warrior.",
        choiceRequired: true,
        choices: [
          { name: "Champion", description: "The Champion focuses on the development of raw physical power honed to deadly perfection." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      {
        name: "Extra Attack",
        level: 5,
        description: "You can attack twice, instead of once, whenever you take the Attack action on your turn. Additional attacks: 3 at 11th, 4 at 20th."
      },
      {
        name: "Tactical Shift",
        level: 5,
        description: "(2024) Whenever you activate Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attacks."
      }
    ],
    6: [
      { name: "Ability Score Improvement", level: 6, is_asi: true, description: "Increase ability scores or take a Feat (General). Fighters get bonus ASIs at 6 and 14." }
    ],
    7: [
      { name: "Martial Archetype Feature (7th)", level: 7, description: "Your Martial Archetype grants a feature at 7th level." }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      {
        name: "Indomitable",
        level: 9,
        description: "You can reroll a saving throw that you fail. If you do so, you must use the new roll. You can use this feature once per Long Rest. Uses scale: 1 at 9th, 2 at 13th, 3 at 17th."
      },
      {
        name: "Tactical Master",
        level: 9,
        description: "(2024) When you attack with a weapon that has a mastery property you don't have, you can apply the Push, Sap, or Slow mastery property to the attack."
      }
    ],
    10: [
      { name: "Martial Archetype Feature (10th)", level: 10, description: "Your Martial Archetype grants a feature at 10th level." }
    ],
    11: [
      {
        name: "Two Extra Attacks",
        level: 11,
        description: "You can attack three times whenever you take the Attack action on your turn (instead of two)."
      }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "Indomitable (2 uses)", level: 13, description: "You can use Indomitable twice between rests." },
      { name: "Studied Attacks", level: 13, description: "(2024) When you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn." }
    ],
    14: [
      { name: "Ability Score Improvement", level: 14, is_asi: true, description: "Bonus ASI / Feat (Fighter only — extra ASIs at 6 and 14)." }
    ],
    15: [
      { name: "Martial Archetype Feature (15th)", level: 15, description: "Your Martial Archetype grants a feature at 15th level." }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "Action Surge (2 uses)", level: 17, description: "You can use Action Surge twice between rests, but only once on the same turn." },
      { name: "Indomitable (3 uses)", level: 17, description: "You can use Indomitable three times between rests." }
    ],
    18: [
      { name: "Martial Archetype Feature (18th)", level: 18, description: "Your Martial Archetype grants a feature at 18th level." }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Combat Prowess. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Three Extra Attacks",
        level: 20,
        description: "You can attack four times whenever you take the Attack action on your turn (instead of three)."
      }
    ]
  },

  Monk: {
    1: [
      {
        name: "Martial Arts",
        level: 1,
        description: "(2024 — uses Dex/Wis fork) Your practice of martial arts gives you mastery of combat styles using unarmed strikes and Monk Weapons (Simple Melee weapons and Shortswords without the Two-Handed or Heavy property).\n\nWhile unarmored and not using a Shield, with an unarmed strike or Monk Weapon, you gain the following:\n• Bonus Unarmed Strike: When you use the Attack action on your turn, you can make one unarmed strike as a Bonus Action.\n• Martial Arts die: You can use Dexterity instead of Strength for the attack and damage rolls of your unarmed strikes and Monk Weapons. The damage die for those attacks is the Martial Arts die: d6 at 1st, d8 at 5th, d10 at 11th, d12 at 17th."
      },
      {
        name: "Unarmored Defense",
        level: 1,
        description: "While not wearing any armor and not using a Shield, your Armor Class equals 10 + your Dexterity modifier + your Wisdom modifier."
      }
    ],
    2: [
      {
        name: "Discipline Points",
        level: 2,
        description: "(2024 — renamed from Ki) Your training allows you to harness the mystic energy of Discipline. Your access to this energy is represented by Discipline Points.\n\nYour Monk level determines the number of points you have, as shown in the Discipline Points column on the Monk table (2 at 2nd; equal to your Monk level thereafter).\n\nYou can spend these points to fuel various Discipline features. You start knowing three such features: Flurry of Blows, Patient Defense, and Step of the Wind. You learn more Discipline features as you gain levels.\n\nWhen you spend a Discipline Point, it is unavailable until you finish a Short or Long Rest, at which point you regain all expended points.\n\nSome of your Discipline features require your target to make a saving throw. The save DC is your Discipline save DC = 8 + PB + Wis."
      },
      {
        name: "Flurry of Blows",
        level: 2,
        description: "(2024) You can spend 1 Discipline Point to make two unarmed strikes as a Bonus Action."
      },
      {
        name: "Patient Defense",
        level: 2,
        description: "(2024) You can take the Disengage action as a Bonus Action. Alternatively, you can spend 1 Discipline Point to take both the Disengage and Dodge actions as a Bonus Action."
      },
      {
        name: "Step of the Wind",
        level: 2,
        description: "(2024) You can take the Dash action as a Bonus Action. Alternatively, you can spend 1 Discipline Point to take both Dash and Disengage as a Bonus Action, and your jump distance is doubled for the turn."
      },
      {
        name: "Unarmored Movement",
        level: 2,
        description: "Your speed increases by 10 feet while you are not wearing armor or using a Shield. This bonus increases at higher levels (+15 ft at 6th, +20 ft at 10th, +25 ft at 14th, +30 ft at 18th)."
      }
    ],
    3: [
      {
        name: "Monastic Tradition",
        level: 3,
        description: "(2024 unified subclass level) Choose a Monastic Tradition that shapes your training. The SRD-included Monastic Tradition is Warrior of the Open Hand. PHB 2024 also publishes Warrior of Mercy, Warrior of Shadow, and Warrior of the Elements.",
        choiceRequired: true,
        choices: [
          { name: "Warrior of the Open Hand", description: "Open Hand monks specialize in unarmed combat, using their fists and physical prowess to overwhelm foes." }
        ]
      },
      {
        name: "Deflect Attacks",
        level: 3,
        description: "(2024 — replaces Deflect Missiles, broader scope) When an attacker you can see hits you with a melee or ranged attack that deals Bludgeoning, Piercing, or Slashing damage, you can take a Reaction to reduce the damage by 1d10 + your Dexterity modifier + your Monk level.\n\nIf you reduce the damage to 0, you can spend 1 Discipline Point to redirect some of the attack's force, attacking back as part of the same Reaction."
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." },
      { name: "Slow Fall", level: 4, description: "You can use your Reaction when you fall to reduce any falling damage you take by an amount equal to five times your Monk level." }
    ],
    5: [
      { name: "Extra Attack", level: 5, description: "You can attack twice when you take the Attack action on your turn." },
      { name: "Stunning Strike", level: 5, description: "(2024 — once per turn) When you hit another creature with a Monk Weapon or unarmed strike, you can spend 1 Discipline Point to attempt a stunning strike. The target must succeed on a Constitution save or have the Stunned condition until the start of your next turn. You can use this feature only once per turn." }
    ],
    6: [
      {
        name: "Empowered Strikes",
        level: 6,
        description: "(2024) Your unarmed strikes and Monk Weapons count as Magical for the purpose of overcoming resistance and immunity to non-magical attacks and damage."
      },
      { name: "Monastic Tradition Feature (6th)", level: 6, description: "Your Monastic Tradition grants a feature at 6th level." }
    ],
    7: [
      {
        name: "Evasion",
        level: 7,
        description: "When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail."
      },
      {
        name: "Stillness of Mind",
        level: 7,
        description: "(2024 — broadened) As an action, you can end one effect on yourself that is causing you to be Charmed or Frightened. You can also use this action to end the Confused effect on yourself."
      }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      {
        name: "Acrobatic Movement",
        level: 9,
        description: "(2024) While not wearing armor or using a Shield, you gain the ability to move along vertical surfaces and across liquids on your turn without falling during the move."
      }
    ],
    10: [
      {
        name: "Heightened Discipline",
        level: 10,
        description: "(2024) You gain extra mastery of your Discipline features:\n• When you use Flurry of Blows, you make three unarmed strikes instead of two.\n• When you use Patient Defense, you also gain Temp HP equal to two rolls of your Martial Arts die.\n• When you use Step of the Wind, you can choose a creature within 5 feet of you that is no more than one size larger than you to come along; the creature also gains the doubled jump distance and Dash."
      }
    ],
    11: [
      { name: "Monastic Tradition Feature (11th)", level: 11, description: "Your Monastic Tradition grants a feature at 11th level." }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      {
        name: "Deflect Energy",
        level: 13,
        description: "(2024) Your Deflect Attacks feature can now also reduce damage from Acid, Cold, Fire, Force, Lightning, Necrotic, Poison, Psychic, Radiant, or Thunder damage."
      }
    ],
    14: [
      {
        name: "Disciplined Survivor",
        level: 14,
        description: "(2024 — replaces 2014's Diamond Soul) You have proficiency in all saving throws.\n\nIn addition, when you fail a saving throw, you can spend 1 Discipline Point to reroll it with a bonus equal to your Wisdom modifier (minimum +1). You must use the new roll."
      }
    ],
    15: [
      {
        name: "Perfect Focus",
        level: 15,
        description: "(2024) When you roll Initiative, you regain 1 expended Discipline Point.\n\nIn addition, your Wisdom score increases by 1 (max 20)."
      }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "Monastic Tradition Feature (17th)", level: 17, description: "Your Monastic Tradition grants a feature at 17th level." }
    ],
    18: [
      {
        name: "Superior Defense",
        level: 18,
        description: "(2024) As a Bonus Action, you can spend 3 Discipline Points to fortify yourself for 1 minute. For the duration, at the start of each of your turns, you gain 10 Temp HP, and you have Resistance to all damage except Force damage."
      }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Irresistible Offense. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Body and Mind",
        level: 20,
        description: "(2024) You have developed your body and mind to new heights. Your Dexterity and Wisdom scores increase by 4. The maximum for those scores is now 25."
      }
    ]
  },

  Paladin: {
    1: [
      {
        name: "Lay On Hands",
        level: 1,
        description: "Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total number of Hit Points equal to your Paladin level × 5.\n\nAs a Bonus Action, you can touch a creature (including yourself) and draw power from the pool to restore a number of Hit Points to that creature, up to the maximum amount remaining in the pool. Alternatively, you can expend 5 Hit Points from the pool to cure the target of one disease or neutralize one poison affecting it. You can cure multiple diseases and neutralize multiple poisons with a single use, expending Hit Points separately for each one.",
        uses: "Pool: 5 × Paladin level / long rest"
      },
      {
        name: "Spellcasting (Cha)",
        level: 1,
        description: "(2024 — Paladins now have spellcasting at 1st level instead of 2nd) You have learned to draw on divine magic to cast spells.\n\nPreparing and Casting Spells: The Paladin table shows your spell slots. You prepare Cha mod + half your Paladin level (rounded down, min 1) Paladin spells, changeable on a Long Rest.\n\nSpellcasting Ability: Charisma. Spell save DC = 8 + PB + Cha. Spell attack = PB + Cha.\n\nSpellcasting Focus: a Holy Symbol."
      },
      {
        name: "Lay On Hands (additional bonus)",
        level: 1,
        description: "When you use Lay On Hands to restore HP, you can also expend 5 HP from the pool to remove one Disease or one Poison condition."
      }
    ],
    2: [
      {
        name: "Fighting Style",
        level: 2,
        description: "Choose a Fighting Style feat from the PHB 2024 list (Defense, Dueling, Great Weapon Fighting, Protection, Two-Weapon Fighting, etc.). You can swap this on level-up.",
        choiceRequired: true,
        choices: [
          { name: "Defense", description: "+1 AC while wearing armor." },
          { name: "Dueling", description: "+2 damage with one-handed melee, no other weapon." },
          { name: "Great Weapon Fighting", description: "Reroll 1s/2s on damage with two-handed/versatile melee." },
          { name: "Protection", description: "Reaction + Shield to impose Disadvantage on attacks against an ally." },
          { name: "Blessed Warrior", description: "(2024) You learn 2 Cleric cantrips." }
        ]
      },
      {
        name: "Divine Smite",
        level: 2,
        description: "(2024 — major change: now a 1st-level Paladin spell) Divine Smite is a 1st-level spell on the Paladin spell list. You always have it prepared, and casting it (using a spell slot) deals 2d8 Radiant damage to a creature you've hit with a melee weapon attack on the same turn (+1d8 per slot level above 1st, +1d8 if the target is an Undead or Fiend).\n\nThis costs a Bonus Action to cast (the spell's casting time). Because it is now a spell, it is subject to Concentration rules and can no longer be triggered after the attack roll is resolved freely as in 2014."
      }
    ],
    3: [
      {
        name: "Sacred Oath",
        level: 3,
        description: "(2024 unified subclass level) Choose a Sacred Oath that defines your divine purpose. The SRD-included Sacred Oath is Oath of Devotion. PHB 2024 also publishes Oath of Glory, Oath of the Ancients, and Oath of Vengeance.",
        choiceRequired: true,
        choices: [
          { name: "Oath of Devotion", description: "The Oath of Devotion binds a Paladin to the loftiest ideals of justice, virtue, and order." }
        ]
      },
      {
        name: "Channel Divinity",
        level: 3,
        description: "Channel divine power as fuel for magical effects. You start with two effects: an effect determined by your Sacred Oath, and a sub-pool ability called Divine Sense (now standardized).\n\nYou can use Channel Divinity 1 time at 3rd level. The number of uses scales: 2 at 7th, 3 at 15th. You regain expended uses when you finish a Short or Long Rest."
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      { name: "Extra Attack", level: 5, description: "You can attack twice when you take the Attack action on your turn." },
      {
        name: "Faithful Steed",
        level: 5,
        description: "(2024) You can call upon a faithful steed (an otherworldly mount). You can cast Find Steed without expending a spell slot. Once you do so, you can't do so again until you finish a Long Rest."
      }
    ],
    6: [
      {
        name: "Aura of Protection",
        level: 6,
        description: "Whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus to the saving throw equal to your Charisma modifier (minimum +1). You must be conscious to grant this bonus.\n\nAt 18th level, the range of this aura increases to 30 feet."
      }
    ],
    7: [
      { name: "Sacred Oath Feature (7th)", level: 7, description: "Your Sacred Oath grants a feature at 7th level." }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      {
        name: "Abjure Foes",
        level: 9,
        description: "(2024) As a Magic action, you can use a Channel Divinity charge to overawe foes. Each creature of your choice that you can see within 60 feet of you must succeed on a Wisdom save or have the Frightened condition for 1 minute or until it takes any damage."
      }
    ],
    10: [
      {
        name: "Aura of Courage",
        level: 10,
        description: "(2024) You and friendly creatures within 10 feet of you can't be Frightened while you are conscious."
      }
    ],
    11: [
      {
        name: "Radiant Strikes",
        level: 11,
        description: "(2024) Your strikes carry divine power. When you hit a creature with an attack roll using a Melee weapon or an Unarmed Strike, you can deal an extra 1d8 Radiant damage to the target."
      }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "(no feature)", level: 13, description: "Spell slots progress." }
    ],
    14: [
      {
        name: "Restoring Touch",
        level: 14,
        description: "(2024) When you use Lay on Hands, you can expend 5 HP from the pool to also end the Charmed, Frightened, Paralyzed, or Stunned condition on the target."
      }
    ],
    15: [
      { name: "Sacred Oath Feature (15th)", level: 15, description: "Your Sacred Oath grants a feature at 15th level." }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "(no feature)", level: 17, description: "Spell slots progress." }
    ],
    18: [
      {
        name: "Aura Expansion",
        level: 18,
        description: "The range of your Aura of Protection (and Aura of Courage if you have it) increases to 30 feet."
      }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of the Night Spirit. Or take an Ability Score Improvement." }
    ],
    20: [
      { name: "Sacred Oath Feature (20th)", level: 20, description: "Your Sacred Oath grants its capstone feature at 20th level." }
    ]
  },

  Ranger: {
    1: [
      {
        name: "Favored Enemy",
        level: 1,
        description: "(2024 — Hunter's Mark scaling) You always have the Hunter's Mark spell prepared. You can cast it without expending a spell slot a number of times equal to your Wisdom modifier (minimum 1), and you regain expended uses when you finish a Long Rest.\n\nYou can also cast Hunter's Mark using any spell slots you have. The number of free castings increases per the Ranger table (2 at 5th, 3 at 13th, 4 at 17th).",
        uses: "Wis mod free castings/long rest"
      },
      {
        name: "Spellcasting (Wis)",
        level: 1,
        description: "(2024 — Rangers now have spellcasting at 1st level instead of 2nd) You can cast Ranger spells.\n\nSpell Preparation: Wis modifier + half Ranger level (rounded down, min 1) prepared from the Ranger spell list. Spells changeable on a Long Rest.\n\nSpellcasting Ability: Wisdom. Spellcasting Focus: a Druidic Focus."
      },
      {
        name: "Weapon Mastery",
        level: 1,
        description: "(2024) Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency. You learn additional masteries at higher levels (3 at 4th, 4 at 10th, 5 at 16th)."
      }
    ],
    2: [
      {
        name: "Deft Explorer",
        level: 2,
        description: "(2024 — replaces 2014 Natural Explorer / Favored Terrain machinery) You are an unsurpassed explorer. You gain the following benefits:\n• Expertise: Choose one of your skill proficiencies in which you have proficiency. You gain Expertise (double PB) in that skill.\n• Languages: You learn two languages of your choice."
      },
      {
        name: "Fighting Style",
        level: 2,
        description: "(2024 — gained at 2nd level) Choose a Fighting Style feat from the PHB 2024 list.",
        choiceRequired: true,
        choices: [
          { name: "Archery", description: "+2 to attack rolls with ranged weapons." },
          { name: "Defense", description: "+1 AC while wearing armor." },
          { name: "Druidic Warrior", description: "(2024) Learn 2 Druid cantrips; Wis is the spellcasting ability." },
          { name: "Two-Weapon Fighting", description: "Add ability modifier to off-hand attack damage." }
        ]
      }
    ],
    3: [
      {
        name: "Ranger's Conclave",
        level: 3,
        description: "(2024 unified subclass level) Choose a Ranger Conclave that reflects your specialty. The SRD-included Conclave is Hunter. PHB 2024 also publishes Beast Master, Fey Wanderer, and Gloom Stalker.",
        choiceRequired: true,
        choices: [
          { name: "Hunter", description: "The Hunter conclave is born of the need to protect humanoid civilization from the terrors of the wild." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      { name: "Extra Attack", level: 5, description: "You can attack twice when you take the Attack action on your turn." }
    ],
    6: [
      {
        name: "Roving",
        level: 6,
        description: "(2024 — replaces some 2014 exploration features) Your Speed increases by 10 feet while you aren't wearing Heavy armor. You also have a Climb Speed and a Swim Speed equal to your Speed."
      }
    ],
    7: [
      { name: "Ranger Conclave Feature (7th)", level: 7, description: "Your Conclave grants a feature at 7th level." }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      {
        name: "Expertise",
        level: 9,
        description: "(2024) You gain Expertise in two of your skill proficiencies."
      }
    ],
    10: [
      {
        name: "Tireless",
        level: 10,
        description: "(2024) Primal forces sustain you. As a Magic action, you can grant yourself Temp HP equal to 1d8 + your Wisdom modifier. You can use this feature a number of times equal to your Wisdom modifier (minimum 1), and you regain all expended uses when you finish a Long Rest."
      }
    ],
    11: [
      { name: "Ranger Conclave Feature (11th)", level: 11, description: "Your Conclave grants a feature at 11th level." }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      {
        name: "Relentless Hunter",
        level: 13,
        description: "(2024) When you take damage, your Concentration on Hunter's Mark isn't broken unless the damage equals or exceeds 20 (or you fail the save by 5+)."
      }
    ],
    14: [
      {
        name: "Nature's Veil",
        level: 14,
        description: "(2024) You can briefly veil yourself in nature. As a Bonus Action, you can magically become Invisible until the start of your next turn. You can use this feature a number of times equal to your Wisdom modifier (minimum 1), and you regain all expended uses when you finish a Long Rest."
      }
    ],
    15: [
      { name: "Ranger Conclave Feature (15th)", level: 15, description: "Your Conclave grants a feature at 15th level." }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "(no feature)", level: 17, description: "Spell slots progress." }
    ],
    18: [
      {
        name: "Feral Senses",
        level: 18,
        description: "(2024) You gain preternatural senses that help you fight foes you can't see. You don't suffer Disadvantage on attack rolls against creatures you can't see, and creatures you can't see don't have Advantage on attack rolls against you."
      }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Dimensional Travel. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Foe Slayer",
        level: 20,
        description: "(2024) Once on each of your turns, when you hit a creature affected by your Hunter's Mark with an attack roll, you can deal an extra 1d10 damage of the same type as the weapon's damage."
      }
    ]
  },

  Rogue: {
    1: [
      {
        name: "Expertise",
        level: 1,
        description: "(2024 — moved to 1st level) Choose two of your skill proficiencies, or one skill proficiency and your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of those proficiencies. You gain another two Expertise picks at 6th level."
      },
      {
        name: "Sneak Attack",
        level: 1,
        description: "Once per turn, you can deal extra damage to one creature you hit with an attack with a Finesse or a Ranged weapon if you have Advantage on the attack roll. You don't need Advantage on the attack roll if at least one of your allies is within 5 feet of the target, the ally isn't Incapacitated, and you don't have Disadvantage on the attack roll.\n\nThe extra damage is 1d6 at 1st level and increases as you gain levels (2d6 at 3rd, 3d6 at 5th, 4d6 at 7th, 5d6 at 9th, 6d6 at 11th, 7d6 at 13th, 8d6 at 15th, 9d6 at 17th, 10d6 at 19th)."
      },
      {
        name: "Thieves' Cant",
        level: 1,
        description: "You know Thieves' Cant, a secret mix of dialect, jargon, and code. Only another creature that knows Thieves' Cant understands the messages.\n\n(2024) You also gain proficiency in your choice of Sleight of Hand or Stealth (or both via Expertise above), and you can speak, read, and write Thieves' Cant."
      },
      {
        name: "Weapon Mastery",
        level: 1,
        description: "(2024) You can use the mastery properties of two kinds of weapons of your choice with which you have proficiency. You learn additional masteries at higher levels (3 at 4th, 4 at 10th, 5 at 16th)."
      }
    ],
    2: [
      {
        name: "Cunning Action",
        level: 2,
        description: "Your quick thinking and agility allow you to act and react quickly. You can take a Bonus Action on each of your turns to take the Dash, Disengage, or Hide action."
      }
    ],
    3: [
      {
        name: "Roguish Archetype",
        level: 3,
        description: "(2024 unified subclass level) Choose a Roguish Archetype. The SRD-included Roguish Archetype is Thief. PHB 2024 also publishes Arcane Trickster, Assassin, and Soulknife.",
        choiceRequired: true,
        choices: [
          { name: "Thief", description: "The Thief archetype is for the rogue who excels at stealing and ranging into hostile territory." }
        ]
      },
      {
        name: "Steady Aim",
        level: 3,
        description: "(2024 — moved to 3rd level) As a Bonus Action, you can give yourself Advantage on your next attack roll on the current turn. You can use this Bonus Action only if you haven't moved during this turn, and after you use the Bonus Action, your Speed is 0 until the end of the current turn."
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      {
        name: "Cunning Strike",
        level: 5,
        description: "(2024 — major new feature) You learn how to fight with a Cunning Strike. When you deal Sneak Attack damage, you can subtract dice from the Sneak Attack damage to apply rider effects:\n\n• Poison (1d6): The target must succeed on a Constitution save or have the Poisoned condition for 1 minute. The target repeats the save at the end of each of its turns.\n• Trip (1d6): If the target is Large or smaller, it must succeed on a Dexterity save or have the Prone condition.\n• Withdraw (1d6): Immediately after the attack, you can move up to half your Speed without provoking Opportunity Attacks.\n\nUpgraded options unlock at 14th: Daze, Knock Out, and Obscure (more dice required)."
      },
      {
        name: "Uncanny Dodge",
        level: 5,
        description: "(2024 — moved to 5th level) When an attacker that you can see hits you with an attack, you can use your Reaction to halve the attack's damage against you."
      }
    ],
    6: [
      {
        name: "Expertise (additional)",
        level: 6,
        description: "Choose two more of your skill proficiencies (or thieves' tools) to gain Expertise."
      }
    ],
    7: [
      {
        name: "Evasion",
        level: 7,
        description: "When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed and only half damage if you fail."
      },
      {
        name: "Reliable Talent",
        level: 7,
        description: "(2024 — moved from 11th level) Whenever you make an ability check that lets you add your Proficiency Bonus, you can treat a d20 roll of 9 or lower as a 10."
      }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      { name: "Roguish Archetype Feature (9th)", level: 9, description: "Your Roguish Archetype grants a feature at 9th level." }
    ],
    10: [
      { name: "Ability Score Improvement", level: 10, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    11: [
      {
        name: "Improved Cunning Strike",
        level: 11,
        description: "(2024) You can use up to two Cunning Strike rider effects on the same Sneak Attack, instead of one."
      }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "Roguish Archetype Feature (13th)", level: 13, description: "Your Roguish Archetype grants a feature at 13th level." }
    ],
    14: [
      {
        name: "Devious Strikes",
        level: 14,
        description: "(2024) You learn three new Cunning Strike options:\n• Daze (2d6): Target has the Dazed condition until the end of its next turn.\n• Knock Out (6d6): Target must succeed on a Constitution save or have the Unconscious condition for 1 minute (it repeats the save at the end of each of its turns).\n• Obscure (1d6): Target must succeed on a Dexterity save or have the Blinded condition until the end of its next turn."
      }
    ],
    15: [
      {
        name: "Slippery Mind",
        level: 15,
        description: "You gain proficiency in Wisdom and Charisma saving throws."
      }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "Roguish Archetype Feature (17th)", level: 17, description: "Your Roguish Archetype grants a feature at 17th level." }
    ],
    18: [
      {
        name: "Elusive",
        level: 18,
        description: "No attack roll has Advantage against you while you aren't Incapacitated."
      }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of the Night Spirit. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Stroke of Luck",
        level: 20,
        description: "You have an uncanny knack for succeeding when you need to. If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20.\n\nOnce you use this feature, you can't use it again until you finish a Short or Long Rest."
      }
    ]
  },

  Sorcerer: {
    1: [
      {
        name: "Spellcasting (Cha)",
        level: 1,
        description: "Cantrips: 4 Sorcerer cantrips of your choice (5 at 4th, 6 at 10th).\n\nSpell Slots / Prepared Spells: Per the Sorcerer table. You prepare Cha mod + Sorcerer level Sorcerer spells, changeable on a Long Rest.\n\nSpellcasting Ability: Charisma. Spell save DC = 8 + PB + Cha. Spell attack = PB + Cha.\n\nSpellcasting Focus: A Sorcerous Focus."
      },
      {
        name: "Innate Sorcery",
        level: 1,
        description: "(2024 — major new 1st-level feature) An event in your past left an indelible mark on you, infusing you with simmering magic. As a Bonus Action, you can unleash that magic for 1 minute.\n\nFor the duration, the spell save DC of your Sorcerer spells increases by 1, and you have Advantage on the attack rolls of Sorcerer spells you cast.\n\nYou can use this feature twice per Long Rest.",
        uses: "2/long rest"
      }
    ],
    2: [
      {
        name: "Font of Magic",
        level: 2,
        description: "You tap into a deep wellspring of magic within yourself. This wellspring is represented by Sorcery Points, which allow you to fuel a variety of magical abilities. The Sorcerer table shows your number of Sorcery Points (2 at 2nd, equal to your Sorcerer level thereafter).\n\nYou can spend Sorcery Points to gain spell slots (Flexible Casting) or to fuel Metamagic options. You regain all expended Sorcery Points when you finish a Long Rest."
      },
      {
        name: "Metamagic",
        level: 2,
        description: "(2024 — moved from 3rd level) You gain the ability to twist your spells. You learn two of the following Metamagic options of your choice. You learn another at 10th level and one more at 17th.\n\n• Careful Spell\n• Distant Spell\n• Empowered Spell\n• Extended Spell\n• Heightened Spell\n• Quickened Spell\n• Seeking Spell\n• Subtle Spell\n• Transmuted Spell\n• Twinned Spell",
        choiceRequired: true,
        choices: [
          { name: "Careful Spell", description: "Protect chosen creatures from spell damage when you cast a spell that forces saving throws." },
          { name: "Distant Spell", description: "Double the range of a spell with a range of 5+ ft, or make a 'Touch' spell into 30-ft range." },
          { name: "Empowered Spell", description: "Reroll up to Cha mod damage dice on a damage spell (must use new rolls)." },
          { name: "Extended Spell", description: "Double a spell's duration up to 24 hours." },
          { name: "Heightened Spell", description: "Spend 3 SP to give Disadvantage on the target's first save against the spell." },
          { name: "Quickened Spell", description: "Spend 2 SP to cast a 1-action spell as a Bonus Action." },
          { name: "Seeking Spell", description: "Reroll a missed spell attack roll, must use new roll." },
          { name: "Subtle Spell", description: "Cast a spell without somatic or verbal components." },
          { name: "Transmuted Spell", description: "Change a damage type of a spell." },
          { name: "Twinned Spell", description: "Spend 1 SP per spell level to target a 2nd creature with a single-target spell." }
        ]
      }
    ],
    3: [
      {
        name: "Sorcerous Origin",
        level: 3,
        description: "(2024 unified subclass level — moved from 1st level in 2014) Choose a Sorcerous Origin that describes the source of your magic. The SRD-included origin is Draconic Sorcery. PHB 2024 also publishes Aberrant Sorcery, Clockwork Sorcery, and Wild Magic.",
        choiceRequired: true,
        choices: [
          { name: "Draconic Sorcery", description: "Your innate magic comes from a draconic bloodline that suffuses your spirit." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      {
        name: "Sorcerous Restoration",
        level: 5,
        description: "(2024) When you finish a Short Rest, you regain expended Sorcery Points up to half your Sorcerer level (rounded down). You can't regain Sorcery Points using this feature again until you finish a Long Rest."
      }
    ],
    6: [
      { name: "Sorcerous Origin Feature (6th)", level: 6, description: "Your Sorcerous Origin grants a feature at 6th level." }
    ],
    7: [
      { name: "Sorcery Incarnate", level: 7, description: "(2024) While Innate Sorcery is active, you can use up to 2 Metamagic options on a single spell." }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      { name: "(no feature)", level: 9, description: "Spell slots progress." }
    ],
    10: [
      { name: "Metamagic (additional)", level: 10, description: "You learn one additional Metamagic option from the list at level 2." }
    ],
    11: [
      { name: "(no feature)", level: 11, description: "Spell slots progress." }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "(no feature)", level: 13, description: "Spell slots progress." }
    ],
    14: [
      { name: "Sorcerous Origin Feature (14th)", level: 14, description: "Your Sorcerous Origin grants a feature at 14th level." }
    ],
    15: [
      { name: "(no feature)", level: 15, description: "Spell slots progress." }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "Metamagic (additional)", level: 17, description: "You learn one more Metamagic option from the list." }
    ],
    18: [
      { name: "Sorcerous Origin Feature (18th)", level: 18, description: "Your Sorcerous Origin grants a feature at 18th level." }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Dimensional Travel. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Arcane Apotheosis",
        level: 20,
        description: "(2024) While Innate Sorcery is active, you can spend 1 Sorcery Point to use any number of Metamagic options without their normal Sorcery Point cost on the same spell."
      }
    ]
  },

  Warlock: {
    1: [
      {
        name: "Pact Magic (Cha)",
        level: 1,
        description: "Your arcane research and the magic bestowed on you by your patron have given you facility with spells.\n\nCantrips: 2 Warlock cantrips of your choice (3 at 4th, 4 at 10th).\n\nSpell Slots: The Warlock table shows your spell slots, which all level up together at the highest available slot level. You regain all expended Pact Magic spell slots when you finish a Short or Long Rest.\n\nPrepared Spells: Cha mod + Warlock level prepared from the Warlock spell list, changeable on a Long Rest.\n\nSpellcasting Ability: Charisma. Spellcasting Focus: A Pact Boon item or Arcane Focus."
      },
      {
        name: "Eldritch Invocations",
        level: 1,
        description: "(2024 — moved to 1st level) You have unearthed Eldritch Invocations, pieces of forbidden knowledge that imbue you with abiding magical abilities. You learn one Invocation of your choice. You learn additional Invocations at higher levels (2 at 2nd, 3 at 5th, etc., per the Warlock table — total 8 by 19th).\n\nYou can replace one Invocation with another whenever you gain a Warlock level.\n\nSome Invocations have prerequisites; the player must meet them to take them."
      }
    ],
    2: [
      {
        name: "Magical Cunning",
        level: 2,
        description: "(2024) You have honed your reservoirs of arcane power. As a Magic action, you can regain expended Pact Magic spell slots, but no more than half your maximum (rounded up). Once you use this feature, you can't do so again until you finish a Long Rest."
      },
      { name: "Eldritch Invocations (additional)", level: 2, description: "You learn one additional Invocation." }
    ],
    3: [
      {
        name: "Otherworldly Patron",
        level: 3,
        description: "(2024 unified subclass level — moved from 1st level in 2014) Choose an Otherworldly Patron. The SRD-included Patron is Fiend Patron. PHB 2024 also publishes Archfey, Celestial, and Great Old One.",
        choiceRequired: true,
        choices: [
          { name: "Fiend Patron", description: "You have made a pact with a fiend from the lower planes of existence." }
        ]
      },
      {
        name: "Pact Boon",
        level: 3,
        description: "(2024 — moved from 3rd to remain at 3rd) Choose one of the Pact Boons (Pact of the Blade, Pact of the Chain, Pact of the Talisman, or Pact of the Tome). The boon is now an Eldritch Invocation that you always have prepared.",
        choiceRequired: true,
        choices: [
          { name: "Pact of the Blade", description: "You can summon a magical pact weapon as a Bonus Action." },
          { name: "Pact of the Chain", description: "You can cast Find Familiar as a ritual; familiar can take Imp/Pseudodragon/Quasit/Sprite/Sphinx form." },
          { name: "Pact of the Talisman", description: "Wear a talisman; once per Short Rest, you can add 1d4 to a failed ability check." },
          { name: "Pact of the Tome", description: "You receive a Book of Shadows containing 3 cantrips of your choice from any class spell list." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      { name: "Eldritch Invocations (additional)", level: 5, description: "You learn one additional Invocation." }
    ],
    6: [
      { name: "Otherworldly Patron Feature (6th)", level: 6, description: "Your Patron grants a feature at 6th level." }
    ],
    7: [
      { name: "Eldritch Invocations (additional)", level: 7, description: "You learn one additional Invocation." }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      { name: "Eldritch Invocations (additional)", level: 9, description: "You learn one additional Invocation." }
    ],
    10: [
      { name: "Otherworldly Patron Feature (10th)", level: 10, description: "Your Patron grants a feature at 10th level." }
    ],
    11: [
      {
        name: "Mystic Arcanum (6th level)",
        level: 11,
        description: "Your Patron bestows upon you a magical secret called an Arcanum. Choose one 6th-level spell from the Warlock spell list as this Arcanum.\n\nYou can cast your Arcanum spell once without expending a spell slot. You must finish a Long Rest before you can do so again.\n\nYou gain additional Mystic Arcanum slots: 7th-level at 13th, 8th-level at 15th, 9th-level at 17th."
      }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "Mystic Arcanum (7th level)", level: 13, description: "Choose one 7th-level Warlock spell as another Arcanum." }
    ],
    14: [
      { name: "Otherworldly Patron Feature (14th)", level: 14, description: "Your Patron grants a feature at 14th level." }
    ],
    15: [
      { name: "Mystic Arcanum (8th level)", level: 15, description: "Choose one 8th-level Warlock spell as another Arcanum." },
      { name: "Eldritch Invocations (additional)", level: 15, description: "You learn one additional Invocation." }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "Mystic Arcanum (9th level)", level: 17, description: "Choose one 9th-level Warlock spell as another Arcanum." }
    ],
    18: [
      { name: "Eldritch Invocations (additional)", level: 18, description: "You learn one additional Invocation." }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Fate. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Eldritch Master",
        level: 20,
        description: "You can draw on your inner reserve of mystical power while entreating your patron to regain expended spell slots. As a Magic action, you can regain all expended Pact Magic spell slots from your Pact Magic feature. Once you regain spell slots with this feature, you can't do so again until you finish a Long Rest."
      }
    ]
  },

  Wizard: {
    1: [
      {
        name: "Spellcasting (Int)",
        level: 1,
        description: "Cantrips: 3 Wizard cantrips of your choice (4 at 4th, 5 at 10th).\n\nSpellbook: You start with a Spellbook containing six 1st-level Wizard spells. You add additional spells as you gain levels (2 per level-up). You can copy spells you find at 50 gp + 2 hours per spell level.\n\nPreparing and Casting Spells: Int mod + Wizard level prepared from your Spellbook, changeable on a Long Rest.\n\nSpellcasting Ability: Intelligence. Spell save DC = 8 + PB + Int. Spell attack = PB + Int.\n\nSpellcasting Focus: An Arcane Focus."
      },
      {
        name: "Ritual Adept",
        level: 1,
        description: "(2024 — formalized at 1st level) You can cast any Wizard spell with the Ritual tag as a ritual, even if the spell isn't prepared (as long as it is in your Spellbook)."
      },
      {
        name: "Arcane Recovery",
        level: 1,
        description: "Once per day when you finish a Short Rest, you can recover expended spell slots whose combined level is equal to or less than half your Wizard level (rounded up), and none of the slots can be 6th level or higher."
      }
    ],
    2: [
      {
        name: "Scholar",
        level: 2,
        description: "(2024 — replaces 2014's 'Arcane Tradition at 2nd' framing) You gain Expertise (double PB) in one of your Wizard skill proficiencies of your choice from Arcana, History, Investigation, Medicine, Nature, or Religion."
      }
    ],
    3: [
      {
        name: "Arcane Tradition",
        level: 3,
        description: "(2024 unified subclass level — moved from 2nd level in 2014) Choose an Arcane Tradition. The SRD-included Tradition is Evoker (School of Evocation). PHB 2024 also publishes Abjurer, Diviner, and Illusionist.",
        choiceRequired: true,
        choices: [
          { name: "Evoker (School of Evocation)", description: "Evokers focus on the study of magic that creates powerful elemental effects." }
        ]
      }
    ],
    4: [
      { name: "Ability Score Improvement", level: 4, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    5: [
      {
        name: "Memorize Spell",
        level: 5,
        description: "(2024 — major new feature) Whenever you finish a Short Rest, you can replace one of the wizard spells you have prepared with another wizard spell from your spellbook. The new spell must be of a level for which you have spell slots."
      }
    ],
    6: [
      { name: "Arcane Tradition Feature (6th)", level: 6, description: "Your Arcane Tradition grants a feature at 6th level." }
    ],
    7: [
      { name: "(no feature)", level: 7, description: "Spell slots progress." }
    ],
    8: [
      { name: "Ability Score Improvement", level: 8, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    9: [
      { name: "(no feature)", level: 9, description: "Spell slots progress." }
    ],
    10: [
      { name: "Arcane Tradition Feature (10th)", level: 10, description: "Your Arcane Tradition grants a feature at 10th level." }
    ],
    11: [
      { name: "(no feature)", level: 11, description: "Spell slots progress." }
    ],
    12: [
      { name: "Ability Score Improvement", level: 12, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    13: [
      { name: "(no feature)", level: 13, description: "Spell slots progress." }
    ],
    14: [
      { name: "Arcane Tradition Feature (14th)", level: 14, description: "Your Arcane Tradition grants a feature at 14th level." }
    ],
    15: [
      { name: "(no feature)", level: 15, description: "Spell slots progress." }
    ],
    16: [
      { name: "Ability Score Improvement", level: 16, is_asi: true, description: "Increase ability scores or take a Feat (General)." }
    ],
    17: [
      { name: "(no feature)", level: 17, description: "Spell slots progress." }
    ],
    18: [
      {
        name: "Spell Mastery",
        level: 18,
        description: "Choose a 1st-level Wizard spell and a 2nd-level Wizard spell that are in your Spellbook. You can cast those spells at their lowest level without expending a spell slot when you have them prepared.\n\nIf you want to cast either spell at a higher level, you must expend a spell slot as normal.\n\nBy spending 8 hours of study, you can exchange one or both of the spells you chose for different spells of the same levels."
      }
    ],
    19: [
      { name: "Epic Boon", level: 19, is_asi: true, description: "(2024) Recommended: Boon of Spell Recall. Or take an Ability Score Improvement." }
    ],
    20: [
      {
        name: "Signature Spells",
        level: 20,
        description: "Choose two 3rd-level Wizard spells in your Spellbook as your Signature Spells. You always have these spells prepared, they don't count against the number of spells you have prepared, and you can cast each of them once at 3rd level without expending a spell slot.\n\nWhen you do so, you can't do so again until you finish a Short or Long Rest. If you want to cast either spell at a higher level, you must expend a spell slot as normal."
      }
    ]
  },
};

/**
 * Returns the cumulative class features for a given class up to and
 * including the requested level. Mirrors the 2014 helper's signature
 * so consumers (ClassFeaturesStep / ClassFeaturesStep2024) can call
 * the same way.
 */
export function getClassFeaturesForLevel(className, level) {
  const cls = classFeaturesData[className];
  if (!cls) return [];
  const features = [];
  for (let i = 1; i <= level; i++) {
    if (cls[i]) features.push(...cls[i]);
  }
  return features;
}

/**
 * Returns features ONLY at a specific level (not cumulative).
 * Useful for level-up screens.
 */
export function getClassFeaturesAtLevel(className, level) {
  const cls = classFeaturesData[className];
  if (!cls) return [];
  return cls[level] || [];
}

/**
 * Returns the levels at which a class grants ASIs.
 */
export function getClassAsiLevels(className) {
  const cls = classFeaturesData[className];
  if (!cls) return [];
  const levels = [];
  for (const lvl in cls) {
    if (cls[lvl].some((f) => f.is_asi)) {
      levels.push(Number(lvl));
    }
  }
  return levels.sort((a, b) => a - b);
}

export default classFeaturesData;
