// D&D 5e PHB Activatable Abilities (Non-Spell)

export const abilityIcons = {
  // Barbarian
  "Rage": "",
  "Reckless Attack": "",
  "Feral Instinct": "",
  "Relentless Rage": "",
  "Brutal Critical": "",
  "Persistent Rage": "",
  // Berserker
  "Frenzy": "",
  "Mindless Rage": "",
  "Retaliation": "",
  // Totem Warrior
  "Intimidating Presence": "",

  // Bard
  "Bardic Inspiration": "",
  "Countercharm": "",
  "Song of Rest": "",
  // College of Lore
  "Cutting Words": "",
  // College of Valor
  "Combat Inspiration": "",
  "Battle Magic": "",

  // Cleric
  "Turn Undead": "",
  "Destroy Undead": "",
  "Divine Intervention": "",
  // Knowledge Domain
  "Knowledge of the Ages": "",
  "Read Thoughts": "",
  // Life Domain
  "Preserve Life": "",
  // Light Domain
  "Radiance of the Dawn": "",
  "Warding Flare": "",
  "Corona of Light": "",
  // Nature Domain
  "Charm Animals and Plants": "",
  // Tempest Domain
  "Destructive Wrath": "",
  "Wrath of the Storm": "",
  // Trickery Domain
  "Invoke Duplicity": "",
  "Cloak of Shadows": "",
  // War Domain
  "Guided Strike": "",
  "War God's Blessing": "",
  "War Priest": "",

  // Druid
  "Wild Shape": "",
  "Unlimited Wild Shape": "",
  // Circle of the Land
  "Natural Recovery": "",
  // Circle of the Moon
  "Combat Wild Shape": "",
  "Primal Strike": "",

  // Fighter
  "Second Wind": "",
  "Action Surge": "",
  "Indomitable": "",
  "Extra Attack": "",
  // Battle Master Maneuvers
  "Commander's Strike": "",
  "Disarming Attack": "",
  "Distracting Strike": "",
  "Evasive Footwork": "",
  "Feinting Attack": "",
  "Goading Attack": "",
  "Lunging Attack": "",
  "Maneuvering Attack": "",
  "Menacing Attack": "",
  "Parry": "",
  "Precision Attack": "",
  "Pushing Attack": "",
  "Rally": "",
  "Riposte": "",
  "Sweeping Attack": "",
  "Trip Attack": "",
  "Know Your Enemy": "",
  // Eldritch Knight
  "War Magic": "",
  "Eldritch Strike": "",
  "Arcane Charge": "",

  // Monk
  "Martial Arts": "",
  "Flurry of Blows": "",
  "Patient Defense": "",
  "Step of the Wind": "",
  "Deflect Missiles": "",
  "Slow Fall": "",
  "Stunning Strike": "",
  "Empty Body": "",
  "Perfect Self": "",
  // Way of the Open Hand
  "Open Hand Technique": "",
  "Wholeness of Body": "",
  "Tranquility": "",
  "Quivering Palm": "",
  // Way of Shadow
  "Shadow Step": "",

  // Paladin
  "Divine Sense": "",
  "Lay on Hands": "",
  "Divine Smite": "",
  "Cleansing Touch": "",
  // Oath of Devotion
  "Sacred Weapon": "",
  "Turn the Unholy": "",
  // Oath of the Ancients
  "Nature's Wrath": "",
  "Turn the Faithless": "",
  "Undying Sentinel": "",
  // Oath of Vengeance
  "Abjure Enemy": "",
  "Vow of Enmity": "",
  "Relentless Avenger": "",
  "Soul of Vengeance": "",

  // Ranger
  "Primeval Awareness": "",
  "Hide in Plain Sight": "",
  "Vanish": "",
  // Hunter
  "Colossus Slayer": "",
  "Stand Against Tide": "",
  // Beast Master
  "Command the Beast": "",
  "Bestial Fury": "",

  // Rogue
  "Cunning Action": "",
  "Sneak Attack": "",
  "Uncanny Dodge": "",
  "Evasion": "",
  "Stroke of Luck": "",
  // Thief
  "Fast Hands": "",
  "Second-Story Work": "",
  "Supreme Sneak": "",
  "Use Magic Device": "",
  // Assassin
  "Assassinate": "",
  "Imposter": "",
  // Arcane Trickster
  "Magical Ambush": "",

  // Sorcerer
  "Font of Magic": "",
  "Metamagic": "",
  "Sorcerous Restoration": "",

  // Warlock
  "Fiendish Vigor": "",
  "Gaze of Two Minds": "",
  "Pact Weapon": "",
  "Dark One's Own Luck": "",
  "Hurl Through Hell": "",
  "Entropic Ward": "",
  "Fey Step": "",
  "Misty Escape": "",

  // Wizard
  "Arcane Recovery": "",
  "Spell Mastery": "",
  "Signature Spells": "",
  // Abjuration
  "Arcane Ward": "",
  "Projected Ward": "",
  // Conjuration
  "Minor Conjuration": "",
  // Divination
  "Portent": "",
  // Enchantment
  "Hypnotic Gaze": "",
  "Instinctive Charm": "",
  // Evocation
  "Sculpt Spells": "",
  "Overchannel": "",
  // Illusion
  "Improved Minor Illusion": "",
  "Illusory Self": "",
  "Illusory Reality": "",
  // Necromancy
  "Grim Harvest": "",
  // Transmutation
  "Minor Alchemy": "",
  "Shapechanger": "",

  // Races
  "Breath Weapon": "",
  "Relentless Endurance": "",
  "Savage Attacks": "",
  "Lucky": "",
};

export const abilityDetails = {
  // Barbarian
  "Rage": {
    class: "Barbarian",
    subclass: null,
    level: 1,
    actionType: "Bonus Action",
    description: "Enter a battle rage. Gain advantage on STR checks and saves, bonus rage damage, and resistance to bludgeoning, piercing, and slashing damage.",
    uses: "2-6/long rest",
    category: "core"
  },
  "Reckless Attack": {
    class: "Barbarian",
    subclass: null,
    level: 2,
    actionType: "Special",
    description: "When you make your first attack on your turn, you can decide to attack recklessly. Gain advantage on melee weapon attacks using STR, but attack rolls against you have advantage until your next turn.",
    uses: "At will",
    category: "core"
  },
  "Feral Instinct": {
    class: "Barbarian",
    subclass: null,
    level: 7,
    actionType: "Passive/Trigger",
    description: "You can't be surprised while not incapacitated. You can act normally on your first turn if surprised, as long as you enter rage first.",
    uses: "Passive",
    category: "core"
  },
  "Relentless Rage": {
    class: "Barbarian",
    subclass: null,
    level: 11,
    actionType: "Trigger",
    description: "If you drop to 0 HP while raging, make a DC 10 CON save. On success, drop to 1 HP instead. DC increases by 5 each time until long rest.",
    uses: "While raging",
    category: "core"
  },
  "Brutal Critical": {
    class: "Barbarian",
    subclass: null,
    level: 9,
    actionType: "Trigger",
    description: "Roll additional weapon damage dice when determining extra damage for a critical hit with a melee attack.",
    uses: "On crit",
    category: "core"
  },
  "Persistent Rage": {
    class: "Barbarian",
    subclass: null,
    level: 15,
    actionType: "Passive",
    description: "Your rage only ends early if you fall unconscious or choose to end it.",
    uses: "Passive",
    category: "core"
  },
  "Frenzy": {
    class: "Barbarian",
    subclass: "Berserker",
    level: 3,
    actionType: "Bonus Action",
    description: "While raging, you can make a single melee weapon attack as a bonus action. When rage ends, suffer one level of exhaustion.",
    uses: "While raging",
    category: "subclass"
  },
  "Mindless Rage": {
    class: "Barbarian",
    subclass: "Berserker",
    level: 6,
    actionType: "Passive",
    description: "You can't be charmed or frightened while raging. If charmed/frightened when entering rage, the effect is suspended.",
    uses: "While raging",
    category: "subclass"
  },
  "Retaliation": {
    class: "Barbarian",
    subclass: "Berserker",
    level: 14,
    actionType: "Reaction",
    description: "When you take damage from a creature within 5 feet, you can use your reaction to make a melee weapon attack against them.",
    uses: "Reaction",
    category: "subclass"
  },
  "Intimidating Presence": {
    class: "Barbarian",
    subclass: "Totem Warrior",
    level: 10,
    actionType: "Action",
    description: "Use your action to frighten someone. Choose one creature within 30 feet that can see or hear you. WIS save or frightened until end of next turn.",
    uses: "Action",
    category: "subclass"
  },

  // Bard
  "Bardic Inspiration": {
    class: "Bard",
    subclass: null,
    level: 1,
    actionType: "Bonus Action",
    description: "Give one creature within 60 feet an Inspiration die (d6-d12) to add to one ability check, attack roll, or saving throw in the next 10 minutes.",
    uses: "CHA mod/long rest",
    category: "core"
  },
  "Countercharm": {
    class: "Bard",
    subclass: null,
    level: 6,
    actionType: "Action",
    description: "Start a performance that grants you and allies within 30 feet advantage on saves against being frightened or charmed.",
    uses: "Action",
    category: "core"
  },
  "Song of Rest": {
    class: "Bard",
    subclass: null,
    level: 2,
    actionType: "Short Rest",
    description: "During a short rest, allies who hear your performance regain extra HP when spending Hit Dice (d6-d12 extra).",
    uses: "Short rest",
    category: "core"
  },
  "Cutting Words": {
    class: "Bard",
    subclass: "College of Lore",
    level: 3,
    actionType: "Reaction",
    description: "When a creature within 60 feet makes an attack roll, ability check, or damage roll, subtract your Bardic Inspiration die from their roll.",
    uses: "Bardic Inspiration",
    category: "subclass"
  },
  "Combat Inspiration": {
    class: "Bard",
    subclass: "College of Valor",
    level: 3,
    actionType: "Reaction",
    description: "A creature with your Bardic Inspiration can add it to a weapon damage roll or to AC against one attack.",
    uses: "Bardic Inspiration",
    category: "subclass"
  },
  "Battle Magic": {
    class: "Bard",
    subclass: "College of Valor",
    level: 14,
    actionType: "Bonus Action",
    description: "When you cast a bard spell as an action, you can make one weapon attack as a bonus action.",
    uses: "At will",
    category: "subclass"
  },

  // Cleric
  "Turn Undead": {
    class: "Cleric",
    subclass: null,
    level: 2,
    actionType: "Action",
    description: "Present your holy symbol. Each undead within 30 feet must make a WIS save or be turned for 1 minute.",
    uses: "Channel Divinity",
    category: "core"
  },
  "Destroy Undead": {
    class: "Cleric",
    subclass: null,
    level: 5,
    actionType: "Trigger",
    description: "When an undead fails its save against Turn Undead, it is instantly destroyed if its CR is low enough.",
    uses: "On Turn Undead",
    category: "core"
  },
  "Divine Intervention": {
    class: "Cleric",
    subclass: null,
    level: 10,
    actionType: "Action",
    description: "Call on your deity to intervene. Roll percentile dice; if you roll equal to or lower than your cleric level, your deity intervenes.",
    uses: "1/long rest",
    category: "core"
  },
  "Knowledge of the Ages": {
    class: "Cleric",
    subclass: "Knowledge Domain",
    level: 2,
    actionType: "Action",
    description: "Gain proficiency with one skill or tool for 10 minutes.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Read Thoughts": {
    class: "Cleric",
    subclass: "Knowledge Domain",
    level: 6,
    actionType: "Action",
    description: "Read the surface thoughts of one creature within 60 feet. WIS save or read thoughts for 1 minute.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Preserve Life": {
    class: "Cleric",
    subclass: "Life Domain",
    level: 2,
    actionType: "Action",
    description: "Restore HP equal to 5× cleric level, divided among creatures within 30 feet (can't exceed half their HP max).",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Radiance of the Dawn": {
    class: "Cleric",
    subclass: "Light Domain",
    level: 2,
    actionType: "Action",
    description: "Dispel magical darkness within 30 feet. Hostile creatures within 30 feet take 2d10+cleric level radiant damage (CON save for half).",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Warding Flare": {
    class: "Cleric",
    subclass: "Light Domain",
    level: 1,
    actionType: "Reaction",
    description: "When attacked by a creature within 30 feet, impose disadvantage on the attack roll.",
    uses: "WIS mod/long rest",
    category: "subclass"
  },
  "Corona of Light": {
    class: "Cleric",
    subclass: "Light Domain",
    level: 17,
    actionType: "Action",
    description: "Activate an aura of sunlight. Enemies within 60 feet have disadvantage on saves against fire or radiant spells.",
    uses: "Action",
    category: "subclass"
  },
  "Charm Animals and Plants": {
    class: "Cleric",
    subclass: "Nature Domain",
    level: 2,
    actionType: "Action",
    description: "Charm all beasts and plant creatures within 30 feet for 1 minute (WIS save negates).",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Destructive Wrath": {
    class: "Cleric",
    subclass: "Tempest Domain",
    level: 2,
    actionType: "Special",
    description: "When you deal lightning or thunder damage, you can maximize the damage instead of rolling.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Wrath of the Storm": {
    class: "Cleric",
    subclass: "Tempest Domain",
    level: 1,
    actionType: "Reaction",
    description: "When hit by a creature within 5 feet, deal 2d8 lightning or thunder damage (DEX save for half).",
    uses: "WIS mod/long rest",
    category: "subclass"
  },
  "Invoke Duplicity": {
    class: "Cleric",
    subclass: "Trickery Domain",
    level: 2,
    actionType: "Action",
    description: "Create an illusory duplicate of yourself within 30 feet. Gain advantage when you and duplicate are within 5 feet of a target.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Cloak of Shadows": {
    class: "Cleric",
    subclass: "Trickery Domain",
    level: 6,
    actionType: "Action",
    description: "Become invisible until the end of your next turn or until you attack or cast a spell.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Guided Strike": {
    class: "Cleric",
    subclass: "War Domain",
    level: 2,
    actionType: "Special",
    description: "When you make an attack roll, grant yourself a +10 bonus to the roll.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "War God's Blessing": {
    class: "Cleric",
    subclass: "War Domain",
    level: 6,
    actionType: "Reaction",
    description: "When a creature within 30 feet makes an attack roll, grant them a +10 bonus.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "War Priest": {
    class: "Cleric",
    subclass: "War Domain",
    level: 1,
    actionType: "Bonus Action",
    description: "When you take the Attack action, make one weapon attack as a bonus action.",
    uses: "WIS mod/long rest",
    category: "subclass"
  },

  // Druid
  "Wild Shape": {
    class: "Druid",
    subclass: null,
    level: 2,
    actionType: "Action",
    description: "Transform into a beast you have seen. Limited by CR and movement type based on level.",
    uses: "2/short rest",
    category: "core"
  },
  "Unlimited Wild Shape": {
    class: "Druid",
    subclass: null,
    level: 20,
    actionType: "Action",
    description: "You can use Wild Shape an unlimited number of times.",
    uses: "Unlimited",
    category: "core"
  },
  "Natural Recovery": {
    class: "Druid",
    subclass: "Circle of the Land",
    level: 2,
    actionType: "Short Rest",
    description: "During a short rest, recover expended spell slots with a combined level equal to half your druid level (rounded up).",
    uses: "1/long rest",
    category: "subclass"
  },
  "Combat Wild Shape": {
    class: "Druid",
    subclass: "Circle of the Moon",
    level: 2,
    actionType: "Bonus Action",
    description: "Use Wild Shape as a bonus action. While in beast form, expend a spell slot to regain 1d8 HP per slot level.",
    uses: "Bonus Action",
    category: "subclass"
  },
  "Primal Strike": {
    class: "Druid",
    subclass: "Circle of the Moon",
    level: 6,
    actionType: "Passive",
    description: "Your attacks in beast form count as magical for overcoming resistance and immunity.",
    uses: "Passive",
    category: "subclass"
  },

  // Fighter
  "Second Wind": {
    class: "Fighter",
    subclass: null,
    level: 1,
    actionType: "Bonus Action",
    description: "Regain HP equal to 1d10 + fighter level.",
    uses: "1/short rest",
    category: "core"
  },
  "Action Surge": {
    class: "Fighter",
    subclass: null,
    level: 2,
    actionType: "Free",
    description: "Take one additional action on your turn.",
    uses: "1-2/short rest",
    category: "core"
  },
  "Indomitable": {
    class: "Fighter",
    subclass: null,
    level: 9,
    actionType: "Special",
    description: "Reroll a failed saving throw. You must use the new roll.",
    uses: "1-3/long rest",
    category: "core"
  },
  "Extra Attack": {
    class: "Fighter",
    subclass: null,
    level: 5,
    actionType: "Action",
    description: "Attack multiple times when you take the Attack action (2-4 attacks).",
    uses: "At will",
    category: "core"
  },
  // Battle Master Maneuvers
  "Commander's Strike": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Forgo one attack to direct an ally to attack. Add superiority die to ally's damage.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Disarming Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to damage. Target must make STR save or drop one held item.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Distracting Strike": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to damage. Next attack against target by someone other than you has advantage.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Evasive Footwork": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "When you move, add superiority die to AC until you stop moving.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Feinting Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Bonus Action",
    description: "Expend superiority die. Gain advantage on next attack against a creature within 5 feet. Add die to damage on hit.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Goading Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to damage. Target must make WIS save or have disadvantage on attacks against others.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Lunging Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Increase reach by 5 feet for one attack. Add superiority die to damage.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Maneuvering Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to damage. Ally can use reaction to move half speed without provoking opportunity attacks from target.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Menacing Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to damage. Target must make WIS save or be frightened until end of your next turn.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Parry": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Reaction",
    description: "When hit by melee attack, reduce damage by superiority die + DEX modifier.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Precision Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to attack roll.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Pushing Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to damage. If Large or smaller, push target up to 15 feet (STR save negates push).",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Rally": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Bonus Action",
    description: "Grant an ally within 60 feet temporary HP equal to superiority die + CHA modifier.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Riposte": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Reaction",
    description: "When a creature misses you with melee attack, make a melee attack against them. Add superiority die to damage.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Sweeping Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "When you hit, deal superiority die damage to another creature within 5 feet (if original attack would hit).",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Trip Attack": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 3,
    actionType: "Special",
    description: "Add superiority die to damage. If Large or smaller, target must make STR save or be knocked prone.",
    uses: "Superiority Die",
    category: "maneuver"
  },
  "Know Your Enemy": {
    class: "Fighter",
    subclass: "Battle Master",
    level: 7,
    actionType: "Special",
    description: "Spend 1 minute observing a creature to learn if it's equal, superior, or inferior in two characteristics.",
    uses: "At will",
    category: "subclass"
  },
  // Eldritch Knight
  "War Magic": {
    class: "Fighter",
    subclass: "Eldritch Knight",
    level: 7,
    actionType: "Bonus Action",
    description: "When you cast a cantrip as an action, make one weapon attack as a bonus action.",
    uses: "At will",
    category: "subclass"
  },
  "Eldritch Strike": {
    class: "Fighter",
    subclass: "Eldritch Knight",
    level: 10,
    actionType: "Trigger",
    description: "When you hit a creature with a weapon attack, they have disadvantage on the next save against a spell you cast.",
    uses: "On hit",
    category: "subclass"
  },
  "Arcane Charge": {
    class: "Fighter",
    subclass: "Eldritch Knight",
    level: 15,
    actionType: "Free",
    description: "When you use Action Surge, you can teleport up to 30 feet to an unoccupied space you can see.",
    uses: "With Action Surge",
    category: "subclass"
  },

  // Monk
  "Martial Arts": {
    class: "Monk",
    subclass: null,
    level: 1,
    actionType: "Bonus Action",
    description: "When you use Attack action with unarmed strike or monk weapon, make one unarmed strike as a bonus action.",
    uses: "At will",
    category: "core"
  },
  "Flurry of Blows": {
    class: "Monk",
    subclass: null,
    level: 2,
    actionType: "Bonus Action",
    description: "After Attack action, spend 1 ki to make two unarmed strikes as a bonus action.",
    uses: "1 Ki",
    category: "core"
  },
  "Patient Defense": {
    class: "Monk",
    subclass: null,
    level: 2,
    actionType: "Bonus Action",
    description: "Spend 1 ki to take the Dodge action as a bonus action.",
    uses: "1 Ki",
    category: "core"
  },
  "Step of the Wind": {
    class: "Monk",
    subclass: null,
    level: 2,
    actionType: "Bonus Action",
    description: "Spend 1 ki to take the Disengage or Dash action as a bonus action. Jump distance doubled for the turn.",
    uses: "1 Ki",
    category: "core"
  },
  "Deflect Missiles": {
    class: "Monk",
    subclass: null,
    level: 3,
    actionType: "Reaction",
    description: "Reduce ranged weapon damage by 1d10 + DEX + monk level. If reduced to 0, catch and throw back for 1 ki.",
    uses: "Reaction (1 Ki to throw)",
    category: "core"
  },
  "Slow Fall": {
    class: "Monk",
    subclass: null,
    level: 4,
    actionType: "Reaction",
    description: "Reduce falling damage by 5× monk level.",
    uses: "Reaction",
    category: "core"
  },
  "Stunning Strike": {
    class: "Monk",
    subclass: null,
    level: 5,
    actionType: "Special",
    description: "When you hit with a melee weapon attack, spend 1 ki. Target must make CON save or be stunned until end of your next turn.",
    uses: "1 Ki",
    category: "core"
  },
  "Empty Body": {
    class: "Monk",
    subclass: null,
    level: 18,
    actionType: "Action",
    description: "Spend 4 ki to become invisible for 1 minute. Also gain resistance to all damage except force.",
    uses: "4 Ki",
    category: "core"
  },
  "Perfect Self": {
    class: "Monk",
    subclass: null,
    level: 20,
    actionType: "Special",
    description: "When you roll initiative and have no ki points, regain 4 ki points.",
    uses: "On initiative",
    category: "core"
  },
  // Way of the Open Hand
  "Open Hand Technique": {
    class: "Monk",
    subclass: "Way of the Open Hand",
    level: 3,
    actionType: "Special",
    description: "When you hit with Flurry of Blows, impose one effect: knock prone (DEX save), push 15 feet (STR save), or prevent reactions.",
    uses: "With Flurry of Blows",
    category: "subclass"
  },
  "Wholeness of Body": {
    class: "Monk",
    subclass: "Way of the Open Hand",
    level: 6,
    actionType: "Action",
    description: "Regain HP equal to 3× monk level.",
    uses: "1/long rest",
    category: "subclass"
  },
  "Tranquility": {
    class: "Monk",
    subclass: "Way of the Open Hand",
    level: 11,
    actionType: "Long Rest",
    description: "At the end of a long rest, gain the effect of Sanctuary spell until your next long rest.",
    uses: "Long rest",
    category: "subclass"
  },
  "Quivering Palm": {
    class: "Monk",
    subclass: "Way of the Open Hand",
    level: 17,
    actionType: "Action",
    description: "Spend 3 ki when you hit with unarmed strike. Within 17 days, use action to cause CON save: fail = drop to 0 HP, success = 10d10 necrotic.",
    uses: "3 Ki",
    category: "subclass"
  },
  // Way of Shadow
  "Shadow Step": {
    class: "Monk",
    subclass: "Way of Shadow",
    level: 6,
    actionType: "Bonus Action",
    description: "When in dim light or darkness, teleport up to 60 feet to an unoccupied space you can see in dim light/darkness. Gain advantage on first melee attack.",
    uses: "At will",
    category: "subclass"
  },

  // Paladin
  "Divine Sense": {
    class: "Paladin",
    subclass: null,
    level: 1,
    actionType: "Action",
    description: "Detect celestials, fiends, and undead within 60 feet (not behind total cover). Know type and location.",
    uses: "1 + CHA mod/long rest",
    category: "core"
  },
  "Lay on Hands": {
    class: "Paladin",
    subclass: null,
    level: 1,
    actionType: "Action",
    description: "Touch a creature to restore HP from a pool equal to 5× paladin level. Or spend 5 HP from pool to cure one disease or neutralize one poison.",
    uses: "Pool/long rest",
    category: "core"
  },
  "Divine Smite": {
    class: "Paladin",
    subclass: null,
    level: 2,
    actionType: "Special",
    description: "When you hit with melee weapon, expend spell slot to deal extra radiant damage (2d8 + 1d8/slot level above 1st, max 5d8). +1d8 vs undead/fiend.",
    uses: "Spell slots",
    category: "core"
  },
  "Cleansing Touch": {
    class: "Paladin",
    subclass: null,
    level: 14,
    actionType: "Action",
    description: "End one spell on yourself or on one willing creature you touch.",
    uses: "CHA mod/long rest",
    category: "core"
  },
  // Oath of Devotion
  "Sacred Weapon": {
    class: "Paladin",
    subclass: "Oath of Devotion",
    level: 3,
    actionType: "Action",
    description: "Imbue one weapon with positive energy. Add CHA mod to attack rolls, emits bright light 20 feet. Lasts 1 minute.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Turn the Unholy": {
    class: "Paladin",
    subclass: "Oath of Devotion",
    level: 3,
    actionType: "Action",
    description: "Each fiend or undead within 30 feet must make WIS save or be turned for 1 minute.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  // Oath of the Ancients
  "Nature's Wrath": {
    class: "Paladin",
    subclass: "Oath of the Ancients",
    level: 3,
    actionType: "Action",
    description: "Spectral vines spring up around a creature within 10 feet. STR or DEX save or be restrained.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Turn the Faithless": {
    class: "Paladin",
    subclass: "Oath of the Ancients",
    level: 3,
    actionType: "Action",
    description: "Each fey or fiend within 30 feet must make WIS save or be turned for 1 minute.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Undying Sentinel": {
    class: "Paladin",
    subclass: "Oath of the Ancients",
    level: 15,
    actionType: "Trigger",
    description: "When you are reduced to 0 HP and not killed outright, drop to 1 HP instead.",
    uses: "1/long rest",
    category: "subclass"
  },
  // Oath of Vengeance
  "Abjure Enemy": {
    class: "Paladin",
    subclass: "Oath of Vengeance",
    level: 3,
    actionType: "Action",
    description: "One creature within 60 feet must make WIS save or be frightened and speed reduced to 0. Fiends/undead have disadvantage.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Vow of Enmity": {
    class: "Paladin",
    subclass: "Oath of Vengeance",
    level: 3,
    actionType: "Bonus Action",
    description: "Gain advantage on attack rolls against one creature within 10 feet for 1 minute.",
    uses: "Channel Divinity",
    category: "subclass"
  },
  "Relentless Avenger": {
    class: "Paladin",
    subclass: "Oath of Vengeance",
    level: 7,
    actionType: "Special",
    description: "When you hit with opportunity attack, move up to half speed immediately after without provoking opportunity attacks.",
    uses: "On opportunity attack",
    category: "subclass"
  },
  "Soul of Vengeance": {
    class: "Paladin",
    subclass: "Oath of Vengeance",
    level: 15,
    actionType: "Reaction",
    description: "When a creature under your Vow of Enmity makes an attack, you can use reaction to make a melee weapon attack against it.",
    uses: "Reaction",
    category: "subclass"
  },

  // Ranger
  "Primeval Awareness": {
    class: "Ranger",
    subclass: null,
    level: 3,
    actionType: "Action",
    description: "Expend a spell slot to sense aberrations, celestials, dragons, elementals, fey, fiends, and undead within 1 mile (6 miles in favored terrain).",
    uses: "Spell slot",
    category: "core"
  },
  "Hide in Plain Sight": {
    class: "Ranger",
    subclass: null,
    level: 10,
    actionType: "1 Minute",
    description: "Spend 1 minute camouflaging yourself. Gain +10 to Stealth while remaining still against a surface.",
    uses: "At will",
    category: "core"
  },
  "Vanish": {
    class: "Ranger",
    subclass: null,
    level: 14,
    actionType: "Bonus Action",
    description: "Use the Hide action as a bonus action. Can't be tracked by nonmagical means unless you choose to leave a trail.",
    uses: "At will",
    category: "core"
  },
  // Hunter
  "Colossus Slayer": {
    class: "Ranger",
    subclass: "Hunter",
    level: 3,
    actionType: "Trigger",
    description: "Once per turn, deal an extra 1d8 damage when you hit a creature below its HP maximum.",
    uses: "1/turn",
    category: "subclass"
  },
  "Stand Against Tide": {
    class: "Ranger",
    subclass: "Hunter",
    level: 15,
    actionType: "Reaction",
    description: "When a hostile creature misses you with a melee attack, use reaction to force it to repeat the attack against another creature.",
    uses: "Reaction",
    category: "subclass"
  },
  // Beast Master
  "Command the Beast": {
    class: "Ranger",
    subclass: "Beast Master",
    level: 3,
    actionType: "Action",
    description: "Your companion can take the Attack, Dash, Disengage, Dodge, or Help action on its turn when you command it.",
    uses: "Action",
    category: "subclass"
  },
  "Bestial Fury": {
    class: "Ranger",
    subclass: "Beast Master",
    level: 11,
    actionType: "Action",
    description: "When you command your beast to take the Attack action, it can make two attacks.",
    uses: "At will",
    category: "subclass"
  },

  // Rogue
  "Cunning Action": {
    class: "Rogue",
    subclass: null,
    level: 2,
    actionType: "Bonus Action",
    description: "Take the Dash, Disengage, or Hide action as a bonus action.",
    uses: "At will",
    category: "core"
  },
  "Sneak Attack": {
    class: "Rogue",
    subclass: null,
    level: 1,
    actionType: "Trigger",
    description: "Deal extra damage (1d6-10d6) when you hit and have advantage, or an enemy of the target is within 5 feet.",
    uses: "1/turn",
    category: "core"
  },
  "Uncanny Dodge": {
    class: "Rogue",
    subclass: null,
    level: 5,
    actionType: "Reaction",
    description: "When an attacker you can see hits you, halve the attack's damage against you.",
    uses: "Reaction",
    category: "core"
  },
  "Evasion": {
    class: "Rogue",
    subclass: null,
    level: 7,
    actionType: "Passive/Trigger",
    description: "When subjected to DEX save for half damage, take no damage on success, half on failure.",
    uses: "Passive",
    category: "core"
  },
  "Stroke of Luck": {
    class: "Rogue",
    subclass: null,
    level: 20,
    actionType: "Special",
    description: "Turn a missed attack into a hit, or treat a failed ability check as a 20.",
    uses: "1/short rest",
    category: "core"
  },
  // Thief
  "Fast Hands": {
    class: "Rogue",
    subclass: "Thief",
    level: 3,
    actionType: "Bonus Action",
    description: "Use Cunning Action to make a Sleight of Hand check, use thieves' tools, or Use an Object action.",
    uses: "At will",
    category: "subclass"
  },
  "Second-Story Work": {
    class: "Rogue",
    subclass: "Thief",
    level: 3,
    actionType: "Passive",
    description: "Climbing costs no extra movement. Running jump distance increases by DEX modifier feet.",
    uses: "Passive",
    category: "subclass"
  },
  "Supreme Sneak": {
    class: "Rogue",
    subclass: "Thief",
    level: 9,
    actionType: "Passive",
    description: "Have advantage on Stealth checks if you move no more than half your speed.",
    uses: "Passive",
    category: "subclass"
  },
  "Use Magic Device": {
    class: "Rogue",
    subclass: "Thief",
    level: 13,
    actionType: "Special",
    description: "Ignore all class, race, and level requirements on the use of magic items.",
    uses: "Passive",
    category: "subclass"
  },
  // Assassin
  "Assassinate": {
    class: "Rogue",
    subclass: "Assassin",
    level: 3,
    actionType: "Trigger",
    description: "Advantage on attacks against creatures that haven't acted. Any hit against a surprised creature is a critical.",
    uses: "First round",
    category: "subclass"
  },
  "Imposter": {
    class: "Rogue",
    subclass: "Assassin",
    level: 13,
    actionType: "Special",
    description: "Spend 7 days studying a person to unerringly mimic speech, writing, and behavior.",
    uses: "7 days",
    category: "subclass"
  },
  // Arcane Trickster
  "Magical Ambush": {
    class: "Rogue",
    subclass: "Arcane Trickster",
    level: 9,
    actionType: "Trigger",
    description: "If you are hidden when you cast a spell, the target has disadvantage on the saving throw.",
    uses: "When hidden",
    category: "subclass"
  },

  // Sorcerer
  "Font of Magic": {
    class: "Sorcerer",
    subclass: null,
    level: 2,
    actionType: "Bonus Action",
    description: "Create spell slots by spending sorcery points, or convert spell slots into sorcery points.",
    uses: "Sorcery Points",
    category: "core"
  },
  "Metamagic": {
    class: "Sorcerer",
    subclass: null,
    level: 3,
    actionType: "Special",
    description: "Apply metamagic options when casting spells: Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned.",
    uses: "Sorcery Points",
    category: "core"
  },
  "Sorcerous Restoration": {
    class: "Sorcerer",
    subclass: null,
    level: 20,
    actionType: "Short Rest",
    description: "Regain 4 sorcery points on a short rest.",
    uses: "Short rest",
    category: "core"
  },

  // Warlock
  "Fiendish Vigor": {
    class: "Warlock",
    subclass: null,
    level: 2,
    actionType: "Action",
    description: "Cast false life on yourself at will, without expending a spell slot.",
    uses: "At will",
    category: "invocation"
  },
  "Gaze of Two Minds": {
    class: "Warlock",
    subclass: null,
    level: 2,
    actionType: "Action",
    description: "Touch a willing humanoid to perceive through their senses.",
    uses: "Action",
    category: "invocation"
  },
  "Pact Weapon": {
    class: "Warlock",
    subclass: "Pact of the Blade",
    level: 3,
    actionType: "Action",
    description: "Create a pact weapon in your hand. You are proficient with it. It counts as magical.",
    uses: "At will",
    category: "pact"
  },
  "Dark One's Own Luck": {
    class: "Warlock",
    subclass: "The Fiend",
    level: 6,
    actionType: "Special",
    description: "When you make an ability check or saving throw, add d10 to the roll.",
    uses: "1/short rest",
    category: "subclass"
  },
  "Hurl Through Hell": {
    class: "Warlock",
    subclass: "The Fiend",
    level: 14,
    actionType: "Trigger",
    description: "When you hit with an attack, send the creature to the lower planes. They return and take 10d10 psychic damage.",
    uses: "1/long rest",
    category: "subclass"
  },
  "Entropic Ward": {
    class: "Warlock",
    subclass: "Great Old One",
    level: 6,
    actionType: "Reaction",
    description: "When attacked, impose disadvantage. If the attack misses, gain advantage on your next attack against them.",
    uses: "1/short rest",
    category: "subclass"
  },
  "Fey Step": {
    class: "Warlock",
    subclass: "Archfey",
    level: 1,
    actionType: "Bonus Action",
    description: "Teleport up to 30 feet to an unoccupied space you can see.",
    uses: "1/short rest",
    category: "subclass"
  },
  "Misty Escape": {
    class: "Warlock",
    subclass: "Archfey",
    level: 6,
    actionType: "Reaction",
    description: "When you take damage, turn invisible and teleport up to 60 feet. Stay invisible until start of next turn.",
    uses: "1/short rest",
    category: "subclass"
  },

  // Wizard
  "Arcane Recovery": {
    class: "Wizard",
    subclass: null,
    level: 1,
    actionType: "Short Rest",
    description: "Once per day during a short rest, recover spell slots with a combined level equal to half your wizard level (rounded up).",
    uses: "1/day",
    category: "core"
  },
  "Spell Mastery": {
    class: "Wizard",
    subclass: null,
    level: 18,
    actionType: "Special",
    description: "Cast one 1st-level and one 2nd-level wizard spell at their lowest level without expending a slot.",
    uses: "At will",
    category: "core"
  },
  "Signature Spells": {
    class: "Wizard",
    subclass: null,
    level: 20,
    actionType: "Special",
    description: "Choose two 3rd-level spells. You always have them prepared and can cast each once without a slot.",
    uses: "1 each/short rest",
    category: "core"
  },
  // Abjuration
  "Arcane Ward": {
    class: "Wizard",
    subclass: "Abjuration",
    level: 2,
    actionType: "Trigger",
    description: "When you cast an abjuration spell, create a ward with HP equal to twice your wizard level + INT mod. Absorbs damage.",
    uses: "On abjuration spell",
    category: "subclass"
  },
  "Projected Ward": {
    class: "Wizard",
    subclass: "Abjuration",
    level: 6,
    actionType: "Reaction",
    description: "When a creature within 30 feet takes damage, use your Arcane Ward to absorb the damage instead.",
    uses: "Reaction",
    category: "subclass"
  },
  // Conjuration
  "Minor Conjuration": {
    class: "Wizard",
    subclass: "Conjuration",
    level: 2,
    actionType: "Action",
    description: "Conjure an inanimate object no larger than 3 feet on a side and no heavier than 10 pounds. Lasts 1 hour.",
    uses: "At will",
    category: "subclass"
  },
  // Divination
  "Portent": {
    class: "Wizard",
    subclass: "Divination",
    level: 2,
    actionType: "Special",
    description: "Roll 2d20 after a long rest. Replace any attack roll, save, or ability check made by you or a creature you can see with one of these rolls.",
    uses: "2/long rest",
    category: "subclass"
  },
  // Enchantment
  "Hypnotic Gaze": {
    class: "Wizard",
    subclass: "Enchantment",
    level: 2,
    actionType: "Action",
    description: "Choose one creature within 5 feet. It must make a WIS save or be charmed and incapacitated until end of your next turn.",
    uses: "At will",
    category: "subclass"
  },
  "Instinctive Charm": {
    class: "Wizard",
    subclass: "Enchantment",
    level: 6,
    actionType: "Reaction",
    description: "When attacked, redirect the attack to another creature within range (WIS save negates). Target becomes immune for 24 hours.",
    uses: "1/long rest",
    category: "subclass"
  },
  // Evocation
  "Sculpt Spells": {
    class: "Wizard",
    subclass: "Evocation",
    level: 2,
    actionType: "Special",
    description: "When you cast an evocation spell, choose up to 1 + spell level creatures. They automatically succeed on their save and take no damage.",
    uses: "At will",
    category: "subclass"
  },
  "Overchannel": {
    class: "Wizard",
    subclass: "Evocation",
    level: 14,
    actionType: "Special",
    description: "Deal maximum damage with a wizard spell of 5th level or lower. Take 2d12 necrotic damage per spell level after the first use per long rest.",
    uses: "At will (with cost)",
    category: "subclass"
  },
  // Illusion
  "Improved Minor Illusion": {
    class: "Wizard",
    subclass: "Illusion",
    level: 2,
    actionType: "Special",
    description: "When you cast minor illusion, you can create both a sound and an image with a single casting.",
    uses: "At will",
    category: "subclass"
  },
  "Illusory Self": {
    class: "Wizard",
    subclass: "Illusion",
    level: 10,
    actionType: "Reaction",
    description: "When attacked, create an illusory duplicate that takes the hit, causing the attack to miss.",
    uses: "1/short rest",
    category: "subclass"
  },
  "Illusory Reality": {
    class: "Wizard",
    subclass: "Illusion",
    level: 14,
    actionType: "Bonus Action",
    description: "Make one inanimate, nonmagical object in an illusion real for 1 minute.",
    uses: "1/illusion",
    category: "subclass"
  },
  // Necromancy
  "Grim Harvest": {
    class: "Wizard",
    subclass: "Necromancy",
    level: 2,
    actionType: "Trigger",
    description: "When you kill a creature with a spell, regain HP equal to twice the spell's level (3× for necromancy spells).",
    uses: "On kill",
    category: "subclass"
  },
  // Transmutation
  "Minor Alchemy": {
    class: "Wizard",
    subclass: "Transmutation",
    level: 2,
    actionType: "10 Minutes",
    description: "Transform one object made of wood, stone, iron, copper, or silver into another of those materials. Lasts 1 hour.",
    uses: "At will",
    category: "subclass"
  },
  "Shapechanger": {
    class: "Wizard",
    subclass: "Transmutation",
    level: 14,
    actionType: "Action",
    description: "Cast polymorph without a spell slot to transform into a beast with CR equal to or less than your level.",
    uses: "At will",
    category: "subclass"
  },

  // Racial Abilities
  "Breath Weapon": {
    class: null,
    race: "Dragonborn",
    level: 1,
    actionType: "Action",
    description: "Exhale destructive energy. Damage type and area determined by draconic ancestry. DEX/CON save for half.",
    uses: "1/short rest",
    category: "racial"
  },
  "Relentless Endurance": {
    class: null,
    race: "Half-Orc",
    level: 1,
    actionType: "Trigger",
    description: "When reduced to 0 HP but not killed outright, drop to 1 HP instead.",
    uses: "1/long rest",
    category: "racial"
  },
  "Savage Attacks": {
    class: null,
    race: "Half-Orc",
    level: 1,
    actionType: "Trigger",
    description: "When you score a critical hit with a melee weapon attack, roll one additional weapon damage die.",
    uses: "On crit",
    category: "racial"
  },
  "Lucky": {
    class: null,
    race: "Halfling",
    level: 1,
    actionType: "Trigger",
    description: "When you roll a 1 on an attack roll, ability check, or saving throw, reroll and use the new roll.",
    uses: "On natural 1",
    category: "racial"
  },
};

// Get abilities by class
export function getAbilitiesByClass(className) {
  return Object.entries(abilityDetails)
    .filter(([_, ability]) => ability.class === className)
    .map(([name, ability]) => ({ name, ...ability, icon: abilityIcons[name] }));
}

// Get abilities by subclass
export function getAbilitiesBySubclass(className, subclassName) {
  return Object.entries(abilityDetails)
    .filter(([_, ability]) => ability.class === className && ability.subclass === subclassName)
    .map(([name, ability]) => ({ name, ...ability, icon: abilityIcons[name] }));
}

// Get abilities by race
export function getAbilitiesByRace(raceName) {
  return Object.entries(abilityDetails)
    .filter(([_, ability]) => ability.race === raceName)
    .map(([name, ability]) => ({ name, ...ability, icon: abilityIcons[name] }));
}

// Get abilities available at a specific level
export function getAbilitiesAtLevel(className, level, subclassName = null) {
  return Object.entries(abilityDetails)
    .filter(([_, ability]) => {
      if (ability.class !== className) return false;
      if (ability.level > level) return false;
      if (ability.subclass && ability.subclass !== subclassName) return false;
      return true;
    })
    .map(([name, ability]) => ({ name, ...ability, icon: abilityIcons[name] }));
}

// Get all ability names for a category
export function getAbilityCategories() {
  const categories = {};
  Object.entries(abilityDetails).forEach(([name, ability]) => {
    const cat = ability.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(name);
  });
  return categories;
}

// All abilities list
export const allAbilities = Object.keys(abilityDetails);

// Export for localStorage persistence
export function saveAbilityIcons(icons) {
  localStorage.setItem('abilityIcons', JSON.stringify(icons));
}

export function loadAbilityIcons() {
  const saved = localStorage.getItem('abilityIcons');
  if (saved) {
    const loaded = JSON.parse(saved);
    Object.assign(abilityIcons, loaded);
  }
  return abilityIcons;
}