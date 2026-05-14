// D&D 5e SRD data. All mechanics, race/class/spell content from System Reference
// Document 5.1 (CC BY 4.0). Names like "Otherworldly Patron", "Acolyte" etc. are
// generic mechanics terms within the SRD.

const RACES = [
  {
    id: 'dragonborn', name: 'Dragonborn', icon: '🐉',
    blurb: 'Proud, draconic warriors with elemental breath and bold, honorable traditions.',
    size: 'Medium', speed: 30, languages: ['Common', 'Draconic'],
    traits: ['Breath Weapon', 'Damage Resistance', 'Draconic Ancestry'],
    bonuses: { str: 2, cha: 1 },
    subraces: [
      { id: 'red', name: 'Red (Fire)', desc: 'Fire-breathing red dragon ancestry. Breath: 15ft cone, Dex save.', element: 'fire' },
      { id: 'gold', name: 'Gold (Fire)', desc: 'Noble gold ancestry. Fire breath cone, fire resistance.', element: 'fire' },
      { id: 'blue', name: 'Blue (Lightning)', desc: 'Lightning bolt breath — 5×30ft line, Dex save.', element: 'lightning' },
      { id: 'black', name: 'Black (Acid)', desc: 'Acid line breath, acid resistance.', element: 'acid' },
      { id: 'silver', name: 'Silver (Cold)', desc: 'Cold cone breath, cold resistance.', element: 'cold' },
      { id: 'green', name: 'Green (Poison)', desc: 'Poison cone breath, poison resistance.', element: 'poison' },
    ],
    description: 'Born of dragons, Dragonborn stand a head taller than humans with scaled hides and proud bearing. They value honor, skill, and ancestry — and breathe elemental fury when pressed.',
  },
  {
    id: 'dwarf', name: 'Dwarf', icon: '⚒️',
    blurb: 'Stout, stoic, stone-shaping folk with deep clan loyalty and an even deeper grudge list.',
    size: 'Medium', speed: 25, languages: ['Common', 'Dwarvish'],
    traits: ['Darkvision', 'Dwarven Resilience (poison)', 'Stonecunning', 'Tool Proficiency'],
    bonuses: { con: 2 },
    subraces: [
      { id: 'hill', name: 'Hill Dwarf', desc: '+1 Wis, +1 HP per level. Wise and resilient — great for clerics.', bonuses: { wis: 1 } },
      { id: 'mountain', name: 'Mountain Dwarf', desc: '+2 Str, light & medium armor proficiency. Tough frontliner.', bonuses: { str: 2 } },
    ],
    description: 'Dwarves are short, broad, and bearded — masters of forge and stone. Centuries of life underground granted them keen sight in darkness and unmatched durability.',
  },
  {
    id: 'elf', name: 'Elf', icon: '🏹',
    blurb: 'Graceful and ancient, elves are quick of wit, swift of foot, and tireless in pursuit of mastery.',
    size: 'Medium', speed: 30, languages: ['Common', 'Elvish'],
    traits: ['Darkvision', 'Keen Senses (Perception)', 'Fey Ancestry', 'Trance'],
    bonuses: { dex: 2 },
    subraces: [
      { id: 'high', name: 'High Elf', desc: '+1 Int, a free wizard cantrip, extra language. Brainy & magical.', bonuses: { int: 1 } },
      { id: 'wood', name: 'Wood Elf', desc: '+1 Wis, 35ft speed, mask of the wild. Scouts and rangers.', bonuses: { wis: 1 } },
      { id: 'drow', name: 'Drow (Dark Elf)', desc: '+1 Cha, superior darkvision, innate magic. Sunlight sensitivity.', bonuses: { cha: 1 } },
    ],
    description: 'Elves live centuries. They view time differently than mortals — patient, deliberate, and unmatched at any craft to which they dedicate themselves.',
  },
  {
    id: 'gnome', name: 'Gnome', icon: '🎩',
    blurb: 'Small, clever tinkers and tricksters with boundless curiosity and a love for mischief.',
    size: 'Small', speed: 25, languages: ['Common', 'Gnomish'],
    traits: ['Darkvision', 'Gnome Cunning (magic save advantage)'],
    bonuses: { int: 2 },
    subraces: [
      { id: 'forest', name: 'Forest Gnome', desc: '+1 Dex, Minor Illusion cantrip, speak with small beasts.', bonuses: { dex: 1 } },
      { id: 'rock', name: 'Rock Gnome', desc: '+1 Con, tinker proficiency, build mechanical toys.', bonuses: { con: 1 } },
    ],
    description: 'A gnome\'s energy fits a body twice its size. They explore the world with the joy of a child opening every drawer in a vast curiosity cabinet.',
  },
  {
    id: 'half-elf', name: 'Half-Elf', icon: '✨',
    blurb: 'Walk between two worlds. Charismatic, adaptable, and curious about everything.',
    size: 'Medium', speed: 30, languages: ['Common', 'Elvish', '+1 of choice'],
    traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility (2 skills)'],
    bonuses: { cha: 2, choice: { count: 2, amount: 1, exclude: ['cha'] } },
    subraces: [{ id: 'standard', name: 'Standard', desc: 'No subrace — pick two ability scores other than Charisma to boost by +1 each.' }],
    description: 'Caught between human ambition and elven grace, half-elves belong nowhere and everywhere. Charming diplomats, restless wanderers, and bridges between cultures.',
  },
  {
    id: 'half-orc', name: 'Half-Orc', icon: '⚔️',
    blurb: 'Fierce and physical. Half-orcs feel everything intensely — rage, joy, loyalty.',
    size: 'Medium', speed: 30, languages: ['Common', 'Orc'],
    traits: ['Darkvision', 'Menacing (Intimidation)', 'Relentless Endurance', 'Savage Attacks'],
    bonuses: { str: 2, con: 1 },
    subraces: [{ id: 'standard', name: 'Standard', desc: 'Survive a killing blow once per long rest. Devastating crits.' }],
    description: 'Half-orcs are scarred by life from birth — but those scars are stories of survival. They love hard, fight harder, and never give up.',
  },
  {
    id: 'halfling', name: 'Halfling', icon: '🍃',
    blurb: 'Small, cheerful, and surprisingly hard to catch. Reroll those 1s.',
    size: 'Small', speed: 25, languages: ['Common', 'Halfling'],
    traits: ['Lucky (reroll 1s)', 'Brave (fear save advantage)', 'Halfling Nimbleness'],
    bonuses: { dex: 2 },
    subraces: [
      { id: 'lightfoot', name: 'Lightfoot', desc: '+1 Cha, hide behind larger creatures. Sneaky and social.', bonuses: { cha: 1 } },
      { id: 'stout', name: 'Stout', desc: '+1 Con, poison resistance & save advantage. Sturdy.', bonuses: { con: 1 } },
    ],
    description: 'Halflings prize peace, full pantries, and good company — but when a halfling decides to leave home, the world had better watch out.',
  },
  {
    id: 'human', name: 'Human', icon: '🧭',
    blurb: 'The everyman. Adaptable, ambitious, and stat-balanced.',
    size: 'Medium', speed: 30, languages: ['Common', '+1 of choice'],
    traits: ['Versatile (+1 to every score)'],
    bonuses: { all: 1 },
    subraces: [
      { id: 'standard', name: 'Standard', desc: '+1 to every ability score. Jack of all trades.' },
      { id: 'variant', name: 'Variant', desc: '+1 to two scores, a free feat, a free skill. (Optional rule)' },
    ],
    description: 'Humans live brief, blazing lives. What they lack in centuries of experience they make up for in ambition, ingenuity, and sheer numbers.',
  },
  {
    id: 'tiefling', name: 'Tiefling', icon: '🔥',
    blurb: 'Touched by infernal heritage. Striking horns, smoldering eyes, sharp wits.',
    size: 'Medium', speed: 30, languages: ['Common', 'Infernal'],
    traits: ['Darkvision', 'Hellish Resistance (fire)', 'Infernal Legacy (Thaumaturgy)'],
    bonuses: { cha: 2, int: 1 },
    subraces: [{ id: 'asmodeus', name: 'Asmodeus (Standard)', desc: 'Inherits classic infernal magic — Hellish Rebuke at L3, Darkness at L5.' }],
    description: 'Tieflings carry the mark of a devil somewhere in their bloodline. Society often distrusts them on sight — so they learn to speak well, fight smart, and trust their own.',
  },
];

const BACKGROUNDS = [
  { id: 'acolyte', name: 'Acolyte', icon: '🛐', desc: 'You served a temple or holy order. You know rites, faith, and how to find shelter at any shrine.', skills: ['Insight', 'Religion'], languages: 2, feature: 'Shelter of the Faithful — your order will house & heal you for free.', tip: 'Great for clerics, paladins, monks — anyone whose backstory has roots in faith.' },
  { id: 'criminal', name: 'Criminal', icon: '🗝️', desc: 'You\'ve lived outside the law. You know fences, secret passages, and how to lie convincingly.', skills: ['Deception', 'Stealth'], tools: ['Thieves\' tools', 'One gaming set'], feature: 'Criminal Contact — a reliable underworld informant in any city.', tip: 'Rogues love this. Also any character whose past has rough edges.' },
  { id: 'folk-hero', name: 'Folk Hero', icon: '🌾', desc: 'You stood up to a tyrant, saved a village, or pulled off something legendary. Commoners love you.', skills: ['Animal Handling', 'Survival'], tools: ['One artisan\'s tools', 'Vehicles (land)'], feature: 'Rustic Hospitality — common folk shelter and hide you from the law.', tip: 'Fits fighters, rangers, barbarians from humble origins.' },
  { id: 'noble', name: 'Noble', icon: '👑', desc: 'You were born into wealth and status. You know etiquette, politics, and how to call in favors.', skills: ['History', 'Persuasion'], tools: ['One gaming set'], languages: 1, feature: 'Position of Privilege — nobles assume you belong.', tip: 'Charismatic classes — bards, sorcerers, paladins — shine here.' },
  { id: 'sage', name: 'Sage', icon: '📜', desc: 'A lifelong scholar. You know where to find the right book — and how to read what it says.', skills: ['Arcana', 'History'], languages: 2, feature: 'Researcher — if you don\'t know a fact, you know who does.', tip: 'Wizards, artificers, anyone who loves lore.' },
  { id: 'soldier', name: 'Soldier', icon: '🛡️', desc: 'You served in a fighting force. You know discipline, gear, and the chain of command.', skills: ['Athletics', 'Intimidation'], tools: ['One gaming set', 'Vehicles (land)'], feature: 'Military Rank — soldiers defer to your former rank.', tip: 'Fighters, paladins, barbarians — natural fit.' },
  { id: 'outlander', name: 'Outlander', icon: '🏔️', desc: 'You grew up in the wilds. Cities feel strange; the wilderness feels like home.', skills: ['Athletics', 'Survival'], tools: ['One musical instrument'], languages: 1, feature: 'Wanderer — you never get lost and remember every landscape.', tip: 'Rangers, druids, barbarians from far places.' },
  { id: 'sailor', name: 'Sailor', icon: '⚓', desc: 'You crewed a ship. You know knots, weather, and how to brawl in a tavern.', skills: ['Athletics', 'Perception'], tools: ['Navigator\'s tools', 'Vehicles (water)'], feature: 'Ship\'s Passage — earn free passage on any ship in exchange for work.', tip: 'Pairs with anyone — adventurers travel a lot.' },
];

const ALIGNMENTS = [
  { id: 'LG', name: 'Lawful Good', short: 'LG', desc: 'Honest and honorable. Acts for justice within rules.', example: 'A paladin who never breaks oath.' },
  { id: 'NG', name: 'Neutral Good', short: 'NG', desc: 'Does the right thing — laws bend when people need help.', example: 'A healer who shelters refugees.' },
  { id: 'CG', name: 'Chaotic Good', short: 'CG', desc: 'Free spirit fighting for the little guy.', example: 'A thief who steals from tyrants.' },
  { id: 'LN', name: 'Lawful Neutral', short: 'LN', desc: 'Order above all. Rules are sacred.', example: 'A monk who keeps the code.' },
  { id: 'TN', name: 'True Neutral', short: 'N', desc: 'Balance. Doesn\'t lean toward law, chaos, good, or evil.', example: 'A druid protecting natural balance.' },
  { id: 'CN', name: 'Chaotic Neutral', short: 'CN', desc: 'Acts on impulse. Personal freedom above all.', example: 'A wandering rogue chasing the next thrill.' },
  { id: 'LE', name: 'Lawful Evil', short: 'LE', desc: 'Methodical, ambitious, willing to harm to win.', example: 'A tyrant who keeps the trains running.' },
  { id: 'NE', name: 'Neutral Evil', short: 'NE', desc: 'Self-interest, no loyalty, no scruples.', example: 'An assassin loyal only to gold.' },
  { id: 'CE', name: 'Chaotic Evil', short: 'CE', desc: 'Cruelty and destruction for their own sake.', example: 'A berserker who burns it all down.' },
];

const CLASSES = [
  {
    id: 'barbarian', name: 'Barbarian', icon: '🪓', color: '#A67651', auraDeep: '#5C3E26', theme: { bg1: '#1F1208', bg2: '#0F0805', accent: '#D89860', accentDeep: '#7A4D2A' },
    hitDie: 12, primary: 'Strength', saves: ['Strength', 'Constitution'],
    blurb: 'A fierce warrior who can enter battle rage — taking massive damage and dishing it out.',
    playstyle: 'Front-line tank. Reckless, durable, big damage. Pick if you want to charge in and smash things.',
    skillChoices: 2,
    skillList: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
    armorProf: ['Light', 'Medium', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    spellcaster: false,
    subclassName: 'Primal Path',
    subclassLevel: 3,
    subclasses: [
      { id: 'berserker', name: 'Path of the Berserker', desc: 'Pure fury. Frenzy lets you attack as a bonus action while raging.', best: 'Players who want unfiltered damage.' },
      { id: 'totem', name: 'Path of the Totem Warrior', desc: 'Channel animal spirits for resistance, speed, or aim.', best: 'Strategic damage-takers who want utility.' },
    ],
    features: [
      { level: 1, name: 'Rage', desc: 'Bonus action; +damage, advantage on Str checks, resistance to bludgeoning/piercing/slashing.' },
      { level: 1, name: 'Unarmored Defense', desc: 'AC = 10 + Dex mod + Con mod when not wearing armor.' },
    ],
  },
  {
    id: 'bard', name: 'Bard', icon: '🎵', color: '#FF2E93', auraDeep: '#7A0E48', theme: { bg1: '#1F0816', bg2: '#0E0410', accent: '#FF4DA6', accentDeep: '#8C1C5A' },
    hitDie: 8, primary: 'Charisma', saves: ['Dexterity', 'Charisma'],
    blurb: 'A magical performer who weaves spells through song, story, and inspiration.',
    playstyle: 'Versatile support and face. Spells, skills, social glue. Pick if you like having an answer for everything.',
    skillChoices: 3,
    skillList: 'ANY',
    armorProf: ['Light'],
    weaponProf: ['Simple', 'Hand crossbow', 'Longsword', 'Rapier', 'Shortsword'],
    spellcaster: 'full',
    spellAbility: 'cha',
    subclassName: 'Bard College',
    subclassLevel: 3,
    subclasses: [
      { id: 'lore', name: 'College of Lore', desc: 'Bonus skills, Cutting Words to debuff enemies, and extra spells from other lists.', best: 'Skill monkeys and spell-thieves.' },
      { id: 'valor', name: 'College of Valor', desc: 'Better armor & weapons, Extra Attack at 6th. Combat bard.', best: 'Front-line inspiring warriors.' },
    ],
    features: [
      { level: 1, name: 'Spellcasting', desc: 'Cast spells from the Bard list using Charisma.' },
      { level: 1, name: 'Bardic Inspiration', desc: 'Give an ally a d6 to add to a roll. CHA mod uses per long rest.' },
    ],
  },
  {
    id: 'cleric', name: 'Cleric', icon: '✚', color: '#F5EAD2', auraDeep: '#6A5A38', theme: { bg1: '#1A1815', bg2: '#0E0D0A', accent: '#FFF1D2', accentDeep: '#A89070' },
    hitDie: 8, primary: 'Wisdom', saves: ['Wisdom', 'Charisma'],
    blurb: 'A divine champion who channels their deity\'s power into healing and miracles.',
    playstyle: 'Healer, buffer, and sometimes wrecking ball — depends on your domain. Versatile and durable.',
    skillChoices: 2,
    skillList: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
    armorProf: ['Light', 'Medium', 'Shields'],
    weaponProf: ['Simple'],
    spellcaster: 'full',
    spellAbility: 'wis',
    subclassName: 'Divine Domain',
    subclassLevel: 1,
    subclasses: [
      { id: 'life', name: 'Life Domain', desc: 'The premier healer. Disciples of Life bonus healing & heavy armor.', best: 'Players who love keeping the party alive.' },
      { id: 'light', name: 'Light Domain', desc: 'Blaster cleric. Fire spells, Warding Flare, Radiance of the Dawn.', best: 'Damage-leaning clerics.' },
      { id: 'war', name: 'War Domain', desc: 'Heavy armor, martial weapons, bonus attack via War Priest.', best: 'Front-line holy warriors.' },
    ],
    features: [
      { level: 1, name: 'Spellcasting', desc: 'Cast Cleric spells using Wisdom.' },
      { level: 1, name: 'Divine Domain', desc: 'Your chosen domain grants spells and features starting at L1.' },
    ],
  },
  {
    id: 'druid', name: 'Druid', icon: '🌿', color: '#3FB76A', auraDeep: '#1F5C36', theme: { bg1: '#091A10', bg2: '#04100A', accent: '#52D880', accentDeep: '#1F6638' },
    hitDie: 8, primary: 'Wisdom', saves: ['Intelligence', 'Wisdom'],
    blurb: 'A guardian of nature with primal magic and the power to take on animal forms.',
    playstyle: 'Shapeshifter, healer, controller. Wildshape into a bear, summon storms. Tons of versatility.',
    skillChoices: 2,
    skillList: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'],
    armorProf: ['Light (non-metal)', 'Medium (non-metal)', 'Shields (non-metal)'],
    weaponProf: ['Clubs', 'Daggers', 'Slings', 'Quarterstaffs', 'Scimitars', 'Spears'],
    spellcaster: 'full',
    spellAbility: 'wis',
    subclassName: 'Druid Circle',
    subclassLevel: 2,
    subclasses: [
      { id: 'land', name: 'Circle of the Land', desc: 'Spellcasting-focused. Bonus spells based on terrain — forest, mountain, etc.', best: 'Druids who want stronger spellcasting.' },
      { id: 'moon', name: 'Circle of the Moon', desc: 'Wildshape into a brown bear at L2. Massive HP pool, frontline beast.', best: 'Players who want to BE the animal.' },
    ],
    features: [
      { level: 1, name: 'Druidic', desc: 'You know the secret language of druids.' },
      { level: 1, name: 'Spellcasting', desc: 'Cast Druid spells using Wisdom.' },
    ],
  },
  {
    id: 'fighter', name: 'Fighter', icon: '⚔️', color: '#E84A3A', auraDeep: '#6A1F18', theme: { bg1: '#1F0C0A', bg2: '#0E0606', accent: '#FF5040', accentDeep: '#8A1F14' },
    hitDie: 10, primary: 'Strength or Dexterity', saves: ['Strength', 'Constitution'],
    blurb: 'A master of weapons and armor. The most flexible martial class.',
    playstyle: 'Pick your weapon, pick your style, and out-soldier everyone. Easy to play, hard to master.',
    skillChoices: 2,
    skillList: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
    armorProf: ['All', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    spellcaster: false,
    subclassName: 'Martial Archetype',
    subclassLevel: 3,
    subclasses: [
      { id: 'champion', name: 'Champion', desc: 'Crit on 19-20, extra athleticism. The simplest fighter to play.', best: 'New players who want to swing weapons reliably.' },
      { id: 'battlemaster', name: 'Battle Master', desc: 'Maneuvers (trip, disarm, riposte) powered by superiority dice. Tactical.', best: 'Players who like options each round.' },
    ],
    features: [
      { level: 1, name: 'Fighting Style', desc: 'Pick one specialty: Archery, Defense, Dueling, Great Weapon, Protection, Two-Weapon.' },
      { level: 1, name: 'Second Wind', desc: 'Bonus action: heal 1d10 + level. Once per short rest.' },
    ],
  },
  {
    id: 'monk', name: 'Monk', icon: '👊', color: '#22D3D8', auraDeep: '#0E5C5F', theme: { bg1: '#061820', bg2: '#03101A', accent: '#3FE0E8', accentDeep: '#0E6A6E' },
    hitDie: 8, primary: 'Dexterity & Wisdom', saves: ['Strength', 'Dexterity'],
    blurb: 'A martial artist channeling ki — fast, mobile, unarmored, and deadly.',
    playstyle: 'Speed and strikes. Multiple attacks, mobility, surgical takedowns. Skill-floor is medium.',
    skillChoices: 2,
    skillList: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
    armorProf: [],
    weaponProf: ['Simple', 'Shortswords'],
    spellcaster: false,
    subclassName: 'Monastic Tradition',
    subclassLevel: 3,
    subclasses: [
      { id: 'open-hand', name: 'Way of the Open Hand', desc: 'Classic unarmed combat — knockdown, knockback, pressure points.', best: 'Players who want clean punch-and-kick combat.' },
      { id: 'shadow', name: 'Way of Shadow', desc: 'Stealth, teleportation, ki-fueled illusions. Ninja monk.', best: 'Players who like sneaking and ambushing.' },
    ],
    features: [
      { level: 1, name: 'Unarmored Defense', desc: 'AC = 10 + Dex mod + Wis mod when not wearing armor.' },
      { level: 1, name: 'Martial Arts', desc: 'Unarmed strikes use Dex, deal d4, and grant a bonus-action strike.' },
    ],
  },
  {
    id: 'paladin', name: 'Paladin', icon: '🛡️', color: '#F2C94C', auraDeep: '#6B5113', theme: { bg1: '#1F1808', bg2: '#100C03', accent: '#FFD550', accentDeep: '#9A7818' },
    hitDie: 10, primary: 'Strength & Charisma', saves: ['Wisdom', 'Charisma'],
    blurb: 'A sacred warrior bound by oath, blending martial power with divine magic.',
    playstyle: 'Tanky support striker. Smite for huge damage, heal with Lay on Hands, aura-buff the party.',
    skillChoices: 2,
    skillList: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
    armorProf: ['All', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    spellcaster: 'half',
    spellAbility: 'cha',
    subclassName: 'Sacred Oath',
    subclassLevel: 3,
    subclasses: [
      { id: 'devotion', name: 'Oath of Devotion', desc: 'The classic paladin — honor, justice, smites against unholy foes.', best: 'Lawful good champions.' },
      { id: 'ancients', name: 'Oath of the Ancients', desc: 'Nature, beauty, defiance of darkness. Damage resistance aura.', best: 'Defensive ranger-paladins.' },
      { id: 'vengeance', name: 'Oath of Vengeance', desc: 'Hunt evildoers. Mobility, Vow of Enmity for advantage.', best: 'Single-target damage paladins.' },
    ],
    features: [
      { level: 1, name: 'Divine Sense', desc: 'Sense celestials, fiends, undead within 60ft.' },
      { level: 1, name: 'Lay on Hands', desc: 'Pool of healing = level × 5. Cure disease/poison.' },
    ],
  },
  {
    id: 'ranger', name: 'Ranger', icon: '🏹', color: '#9E2F2A', auraDeep: '#4F1614', theme: { bg1: '#1A0A06', bg2: '#0E0606', accent: '#D45A50', accentDeep: '#7A1E1A' },
    hitDie: 10, primary: 'Dexterity & Wisdom', saves: ['Strength', 'Dexterity'],
    blurb: 'A wilderness warrior — tracker, hunter, and quiet protector of the wilds.',
    playstyle: 'Skirmisher with archery, nature magic, and an animal companion (Beast Master).',
    hasCompanion: true,
    skillChoices: 3,
    skillList: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'],
    armorProf: ['Light', 'Medium', 'Shields'],
    weaponProf: ['Simple', 'Martial'],
    spellcaster: 'half',
    spellAbility: 'wis',
    spellcasterLevel: 2,
    subclassName: 'Ranger Archetype',
    subclassLevel: 3,
    subclasses: [
      { id: 'hunter', name: 'Hunter', desc: 'Pick anti-horde, anti-boss, or defensive bonuses. Pure combat.', best: 'Bow-focused damage rangers.' },
      { id: 'beast-master', name: 'Beast Master', desc: 'Gain a loyal animal companion. Fight side by side.', best: 'Players who want a pet from level 3.' },
    ],
    companions: [
      { id: 'wolf', name: 'Wolf', stats: 'AC 13, HP 11, bite 1d4+2', desc: 'Pack tactics — advantage on attacks when allies are adjacent.' },
      { id: 'panther', name: 'Panther', stats: 'AC 12, HP 13, claw + bite', desc: 'Stealthy striker. Pounce knocks targets prone.' },
      { id: 'hawk', name: 'Hawk', stats: 'AC 13, HP 1, talons', desc: 'Recon from above. Fragile but fast.' },
      { id: 'boar', name: 'Boar', stats: 'AC 11, HP 11, tusk', desc: 'Charges and knocks prone. Relentless.' },
      { id: 'mastiff', name: 'Mastiff', stats: 'AC 12, HP 5, bite', desc: 'Loyal guard dog. Knocks targets prone.' },
    ],
    features: [
      { level: 1, name: 'Favored Enemy', desc: 'Advantage on tracking & lore about one creature type.' },
      { level: 1, name: 'Natural Explorer', desc: 'Bonuses in chosen terrain — tracking, foraging, never lost.' },
    ],
  },
  {
    id: 'rogue', name: 'Rogue', icon: '🗡️', color: '#7A7585', auraDeep: '#1F1B26', theme: { bg1: '#0E0E16', bg2: '#06060A', accent: '#D8D5E0', accentDeep: '#605A6E' },
    hitDie: 8, primary: 'Dexterity', saves: ['Dexterity', 'Intelligence'],
    blurb: 'A stealthy specialist with deadly precision strikes and unmatched skill mastery.',
    playstyle: 'Sneak Attack for burst damage; Expertise doubles your best skills. Skill king.',
    skillChoices: 4,
    skillList: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'],
    armorProf: ['Light'],
    weaponProf: ['Simple', 'Hand crossbow', 'Longsword', 'Rapier', 'Shortsword'],
    spellcaster: false,
    subclassName: 'Roguish Archetype',
    subclassLevel: 3,
    subclasses: [
      { id: 'thief', name: 'Thief', desc: 'Fast hands (bonus action utility), second-story work. Classic burglar.', best: 'Skill-heavy adventurers.' },
      { id: 'assassin', name: 'Assassin', desc: 'Auto-crit surprise attacks, disguises, poisons.', best: 'Burst damage from the shadows.' },
      { id: 'arcane-trickster', name: 'Arcane Trickster', desc: 'Wizard spells, Mage Hand legerdemain. Spell + skill hybrid.', best: 'Spellsword rogues.' },
    ],
    features: [
      { level: 1, name: 'Expertise', desc: 'Double proficiency on 2 skills (or thieves\' tools).' },
      { level: 1, name: 'Sneak Attack', desc: '+1d6 damage once per turn when you have advantage or an ally is adjacent to target.' },
      { level: 1, name: 'Thieves\' Cant', desc: 'A secret code only rogues understand.' },
    ],
  },
  {
    id: 'sorcerer', name: 'Sorcerer', icon: '✨', color: '#FF7A33', auraDeep: '#7A2E0F', theme: { bg1: '#1F0A04', bg2: '#10050A', accent: '#FF9050', accentDeep: '#AA4520' },
    hitDie: 6, primary: 'Charisma', saves: ['Constitution', 'Charisma'],
    blurb: 'Innate magic flows in your blood. Fewer spells than a wizard, but raw and flexible power.',
    playstyle: 'Blaster with Metamagic — bend your spells. Twin a Haste, Quicken a Fireball.',
    skillChoices: 2,
    skillList: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
    armorProf: [],
    weaponProf: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    spellcaster: 'full',
    spellAbility: 'cha',
    subclassName: 'Sorcerous Origin',
    subclassLevel: 1,
    subclasses: [
      { id: 'draconic', name: 'Draconic Bloodline', desc: 'Dragon ancestry — bonus HP, scaly skin, breath-themed damage.', best: 'Durable blasters.' },
      { id: 'wild', name: 'Wild Magic', desc: 'Roll on the Wild Magic table — chaos triggers when you cast.', best: 'Players who love unpredictability.' },
    ],
    features: [
      { level: 1, name: 'Spellcasting', desc: 'Cast Sorcerer spells using Charisma.' },
      { level: 1, name: 'Sorcerous Origin', desc: 'Choose at L1 — defines your magical heritage.' },
    ],
  },
  {
    id: 'warlock', name: 'Warlock', icon: '👁️', color: '#A66BFF', auraDeep: '#3D1F66', theme: { bg1: '#100620', bg2: '#08031A', accent: '#B580FF', accentDeep: '#5A2BA8' },
    hitDie: 8, primary: 'Charisma', saves: ['Wisdom', 'Charisma'],
    blurb: 'You made a pact with an otherworldly being for power. Eldritch Blast is your signature.',
    playstyle: 'Short-rest caster. Fewer slots, but they recharge often. Eldritch Blast scales to be the best cantrip.',
    hasPatron: true,
    hasCompanion: true, // via Pact of the Chain at L3
    skillChoices: 2,
    skillList: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
    armorProf: ['Light'],
    weaponProf: ['Simple'],
    spellcaster: 'pact',
    spellAbility: 'cha',
    subclassName: 'Otherworldly Patron',
    subclassLevel: 1,
    subclasses: [
      { id: 'fiend', name: 'The Fiend', desc: 'A pact with a devil or demon. Bonus temp HP on kills, fire spells.', best: 'Damage-and-survival warlocks.' },
      { id: 'archfey', name: 'The Archfey', desc: 'Pact with a fey lord. Charm, fear, fey teleports.', best: 'Trickster warlocks.' },
      { id: 'great-old-one', name: 'The Great Old One', desc: 'Eldritch alien horror. Telepathy, psychic damage, madness.', best: 'Mysterious manipulators.' },
    ],
    companions: [
      { id: 'imp', name: 'Imp', stats: 'AC 13, HP 10, sting (poison)', desc: 'Fiendish. Invisible, shapechanger, telepathic.' },
      { id: 'pseudodragon', name: 'Pseudodragon', stats: 'AC 13, HP 7, sting (sleep)', desc: 'Tiny dragon. Telepathy 100ft, magic resistance.' },
      { id: 'sprite', name: 'Sprite', stats: 'AC 15, HP 2, longsword/bow', desc: 'Fey scout. Invisibility, read alignment on touch.' },
      { id: 'quasit', name: 'Quasit', stats: 'AC 13, HP 7, claws (poison)', desc: 'Demonic shapechanger. Frighten on demand.' },
    ],
    features: [
      { level: 1, name: 'Otherworldly Patron', desc: 'Your patron grants features at 1, 6, 10, 14.' },
      { level: 1, name: 'Pact Magic', desc: 'Short-rest spell slots. All cast at highest available level.' },
    ],
  },
  {
    id: 'wizard', name: 'Wizard', icon: '📖', color: '#4A8FE8', auraDeep: '#143D70', theme: { bg1: '#070C20', bg2: '#03061A', accent: '#5AA0FF', accentDeep: '#1F4F9A' },
    hitDie: 6, primary: 'Intelligence', saves: ['Intelligence', 'Wisdom'],
    blurb: 'A scholar of magic. The most spells of any class — your spellbook is your superpower.',
    playstyle: 'Prepare the right spell for the situation. Massive spell library, fragile body.',
    skillChoices: 2,
    skillList: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
    armorProf: [],
    weaponProf: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'],
    spellcaster: 'full',
    spellAbility: 'int',
    subclassName: 'Arcane Tradition',
    subclassLevel: 2,
    subclasses: [
      { id: 'evocation', name: 'School of Evocation', desc: 'Sculpt your fireballs around allies. Damage school.', best: 'Blaster wizards.' },
      { id: 'divination', name: 'School of Divination', desc: 'Portent — replace any roll with a pre-rolled d20. Game-changing.', best: 'Strategic minds.' },
      { id: 'abjuration', name: 'School of Abjuration', desc: 'Arcane Ward absorbs damage. Tankier wizard.', best: 'Defensive casters.' },
    ],
    features: [
      { level: 1, name: 'Spellcasting', desc: 'Cast from your spellbook using Intelligence.' },
      { level: 1, name: 'Arcane Recovery', desc: 'Once per day on a short rest, recover spell slots.' },
    ],
  },
];

const SKILLS = [
  { name: 'Acrobatics', ability: 'dex', desc: 'Tumbling, balancing, escaping a grapple.' },
  { name: 'Animal Handling', ability: 'wis', desc: 'Calming or directing animals.' },
  { name: 'Arcana', ability: 'int', desc: 'Knowledge of spells, magic items, planes.' },
  { name: 'Athletics', ability: 'str', desc: 'Climbing, swimming, jumping, shoving.' },
  { name: 'Deception', ability: 'cha', desc: 'Lying convincingly, bluffing.' },
  { name: 'History', ability: 'int', desc: 'Recalling kingdoms, wars, lore of the past.' },
  { name: 'Insight', ability: 'wis', desc: 'Reading intentions, detecting lies.' },
  { name: 'Intimidation', ability: 'cha', desc: 'Coercing through threats.' },
  { name: 'Investigation', ability: 'int', desc: 'Finding clues, deducing answers.' },
  { name: 'Medicine', ability: 'wis', desc: 'Stabilizing the dying, diagnosing illness.' },
  { name: 'Nature', ability: 'int', desc: 'Knowing terrain, plants, weather, beasts.' },
  { name: 'Perception', ability: 'wis', desc: 'Spotting things — the most-rolled skill.' },
  { name: 'Performance', ability: 'cha', desc: 'Music, acting, storytelling.' },
  { name: 'Persuasion', ability: 'cha', desc: 'Honest charm — convincing others honestly.' },
  { name: 'Religion', ability: 'int', desc: 'Gods, rituals, holy symbols, the divine.' },
  { name: 'Sleight of Hand', ability: 'dex', desc: 'Pickpocketing, palming objects.' },
  { name: 'Stealth', ability: 'dex', desc: 'Sneaking and hiding.' },
  { name: 'Survival', ability: 'wis', desc: 'Tracking, foraging, weathering the wild.' },
];

const SPELLS = {
  cantrips: [
    { name: 'Acid Splash', school: 'Conjuration', classes: ['sorcerer', 'wizard'], range: '60 ft', desc: '1d6 acid to one or two creatures within 5ft of each other.' },
    { name: 'Blade Ward', school: 'Abjuration', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], range: 'Self', desc: 'Resistance to bludgeoning, piercing, slashing until your next turn.' },
    { name: 'Chill Touch', school: 'Necromancy', classes: ['sorcerer', 'warlock', 'wizard'], range: '120 ft', desc: '1d8 necrotic; target can\'t regain HP until your next turn.' },
    { name: 'Dancing Lights', school: 'Evocation', classes: ['bard', 'sorcerer', 'wizard'], range: '120 ft', desc: 'Up to 4 floating torch-bright lights.' },
    { name: 'Druidcraft', school: 'Transmutation', classes: ['druid'], range: '30 ft', desc: 'Predict weather, bloom a flower, light/snuff a candle.' },
    { name: 'Eldritch Blast', school: 'Evocation', classes: ['warlock'], range: '120 ft', desc: '1d10 force damage. Adds beams as you level — the warlock workhorse.' },
    { name: 'Fire Bolt', school: 'Evocation', classes: ['sorcerer', 'wizard'], range: '120 ft', desc: '1d10 fire. Solid all-purpose blaster cantrip.' },
    { name: 'Friends', school: 'Enchantment', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], range: 'Self', desc: 'Advantage on Cha checks with one creature. They notice when it ends.' },
    { name: 'Guidance', school: 'Divination', classes: ['cleric', 'druid'], range: 'Touch', desc: 'Ally adds 1d4 to one ability check. Best buff in the game.' },
    { name: 'Light', school: 'Evocation', classes: ['bard', 'cleric', 'sorcerer', 'wizard'], range: 'Touch', desc: 'Object sheds bright light 20ft.' },
    { name: 'Mage Hand', school: 'Conjuration', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], range: '30 ft', desc: 'Spectral hand. Move/manipulate up to 10 lbs.' },
    { name: 'Mending', school: 'Transmutation', classes: ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'], range: 'Touch', desc: 'Repair a single break or tear.' },
    { name: 'Message', school: 'Transmutation', classes: ['bard', 'sorcerer', 'wizard'], range: '120 ft', desc: 'Whisper privately to a creature you can see.' },
    { name: 'Minor Illusion', school: 'Illusion', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], range: '30 ft', desc: 'Sound or image, no bigger than a 5ft cube.' },
    { name: 'Poison Spray', school: 'Conjuration', classes: ['druid', 'sorcerer', 'warlock', 'wizard'], range: '10 ft', desc: '1d12 poison, Con save. Short range, big damage.' },
    { name: 'Prestidigitation', school: 'Transmutation', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], range: '10 ft', desc: 'Minor magical tricks — clean, chill, flavor, sparkle.' },
    { name: 'Produce Flame', school: 'Conjuration', classes: ['druid'], range: 'Self/30 ft', desc: 'Flame in hand: light source or ranged 1d8 fire attack.' },
    { name: 'Ray of Frost', school: 'Evocation', classes: ['sorcerer', 'wizard'], range: '60 ft', desc: '1d8 cold + target speed -10 until next turn.' },
    { name: 'Sacred Flame', school: 'Evocation', classes: ['cleric'], range: '60 ft', desc: '1d8 radiant, Dex save. Ignores cover.' },
    { name: 'Shillelagh', school: 'Transmutation', classes: ['druid'], range: 'Touch', desc: 'Your club/quarterstaff uses Wis, deals 1d8.' },
    { name: 'Shocking Grasp', school: 'Evocation', classes: ['sorcerer', 'wizard'], range: 'Touch', desc: '1d8 lightning. Target can\'t take reactions until next turn.' },
    { name: 'Spare the Dying', school: 'Necromancy', classes: ['cleric'], range: 'Touch', desc: 'Stabilize a dying creature.' },
    { name: 'Thaumaturgy', school: 'Transmutation', classes: ['cleric'], range: '30 ft', desc: 'Wonder-working — voice boom, eye glow, flame shift.' },
    { name: 'True Strike', school: 'Divination', classes: ['bard', 'sorcerer', 'warlock', 'wizard'], range: '30 ft', desc: 'Advantage on your next attack against the target.' },
    { name: 'Vicious Mockery', school: 'Enchantment', classes: ['bard'], range: '60 ft', desc: '1d4 psychic + target has disadvantage on next attack. Bard staple.' },
  ],
  level1: [
    { name: 'Bless', school: 'Enchantment', classes: ['cleric', 'paladin'], range: '30 ft', desc: 'Up to 3 creatures add 1d4 to attacks & saves. Concentration.', concentration: true },
    { name: 'Burning Hands', school: 'Evocation', classes: ['sorcerer', 'wizard'], range: '15 ft cone', desc: '3d6 fire to all in cone, Dex save half.' },
    { name: 'Charm Person', school: 'Enchantment', classes: ['bard', 'druid', 'sorcerer', 'warlock', 'wizard'], range: '30 ft', desc: 'Target sees you as a friendly acquaintance for 1 hour.' },
    { name: 'Command', school: 'Enchantment', classes: ['cleric', 'paladin'], range: '60 ft', desc: 'One-word command (drop, flee, halt, grovel, approach).' },
    { name: 'Cure Wounds', school: 'Evocation', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'], range: 'Touch', desc: 'Heal 1d8 + spellcasting mod. Standard heal.' },
    { name: 'Detect Magic', school: 'Divination', classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'wizard'], range: 'Self/30ft', desc: 'Ritual. Sense magical auras nearby.' },
    { name: 'Disguise Self', school: 'Illusion', classes: ['bard', 'sorcerer', 'wizard'], range: 'Self', desc: 'Change appearance for 1 hour.' },
    { name: 'Faerie Fire', school: 'Evocation', classes: ['bard', 'druid'], range: '60 ft', desc: '20ft cube outlined; attacks against have advantage. Concentration.', concentration: true },
    { name: 'Feather Fall', school: 'Transmutation', classes: ['bard', 'sorcerer', 'wizard'], range: '60 ft', desc: 'Reaction. 5 creatures fall slowly. Saves lives.' },
    { name: 'Healing Word', school: 'Evocation', classes: ['bard', 'cleric', 'druid'], range: '60 ft', desc: 'Bonus action heal 1d4 + mod. Pick up downed allies fast.' },
    { name: 'Hex', school: 'Enchantment', classes: ['warlock'], range: '90 ft', desc: '+1d6 necrotic on hits + disadvantage on chosen ability. Concentration.', concentration: true },
    { name: 'Hunter\'s Mark', school: 'Divination', classes: ['ranger'], range: '90 ft', desc: '+1d6 damage on hits. Track target. Concentration.', concentration: true },
    { name: 'Identify', school: 'Divination', classes: ['bard', 'wizard'], range: 'Touch', desc: 'Ritual. Learn an item\'s properties.' },
    { name: 'Mage Armor', school: 'Abjuration', classes: ['sorcerer', 'wizard'], range: 'Touch', desc: 'AC = 13 + Dex for 8 hours. Wizard mainstay.' },
    { name: 'Magic Missile', school: 'Evocation', classes: ['sorcerer', 'wizard'], range: '120 ft', desc: '3 darts × 1d4+1 force. Auto-hit.' },
    { name: 'Protection from Evil and Good', school: 'Abjuration', classes: ['cleric', 'paladin', 'warlock', 'wizard'], range: 'Touch', desc: 'Target gets disadvantage from aberrations/fiends/etc.', concentration: true },
    { name: 'Shield', school: 'Abjuration', classes: ['sorcerer', 'wizard'], range: 'Self', desc: 'Reaction. +5 AC until next turn. Wizard survival tool.' },
    { name: 'Shield of Faith', school: 'Abjuration', classes: ['cleric', 'paladin'], range: '60 ft', desc: '+2 AC for 10 min on one target. Concentration.', concentration: true },
    { name: 'Sleep', school: 'Enchantment', classes: ['bard', 'sorcerer', 'wizard'], range: '90 ft', desc: '5d8 HP of creatures fall unconscious. Brutal at L1.' },
    { name: 'Thunderwave', school: 'Evocation', classes: ['bard', 'druid', 'sorcerer', 'wizard'], range: '15ft cube', desc: '2d8 thunder + push 10ft. Get out of danger.' },
    { name: 'Witch Bolt', school: 'Evocation', classes: ['sorcerer', 'warlock', 'wizard'], range: '30 ft', desc: '1d12 lightning + ongoing 1d12. Concentration.', concentration: true },
  ],
};

const EQUIPMENT_PACKS = {
  burglar: { name: "Burglar's Pack", items: 'Backpack, ball bearings (1,000), 10 feet string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks of oil, 5 days rations, tinderbox, waterskin, 50 feet hempen rope.' },
  diplomat: { name: "Diplomat's Pack", items: 'Chest, 2 cases (map/scroll), fine clothes, ink, ink pen, lamp, 2 flasks of oil, 5 sheets paper, vial of perfume, sealing wax, soap.' },
  dungeoneer: { name: "Dungeoneer's Pack", items: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50 feet hempen rope.' },
  entertainer: { name: "Entertainer's Pack", items: 'Backpack, bedroll, 2 costumes, 5 candles, 5 days rations, waterskin, disguise kit.' },
  explorer: { name: "Explorer's Pack", items: 'Backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50 feet hempen rope.' },
  priest: { name: "Priest's Pack", items: 'Backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks of incense, censer, vestments, 2 days rations, waterskin.' },
  scholar: { name: "Scholar's Pack", items: 'Backpack, book of lore, ink, ink pen, 10 sheets parchment, little bag of sand, small knife.' },
};

const CLASS_EQUIPMENT = {
  barbarian: {
    fixed: ['Explorer\'s Pack', 'Four javelins'],
    choices: [
      { label: 'Weapon A', options: ['Greataxe', 'Any martial melee weapon'] },
      { label: 'Weapon B', options: ['Two handaxes', 'Any simple weapon'] },
    ],
    gold: '2d4 × 10 gp',
  },
  bard: {
    fixed: ['Leather armor', 'Dagger'],
    choices: [
      { label: 'Weapon', options: ['Rapier', 'Longsword', 'Any simple weapon'] },
      { label: 'Pack', options: ['Diplomat\'s Pack', 'Entertainer\'s Pack'] },
      { label: 'Instrument', options: ['Lute', 'Any other musical instrument'] },
    ],
    gold: '5d4 × 10 gp',
  },
  cleric: {
    fixed: ['Shield', 'Holy symbol'],
    choices: [
      { label: 'Weapon', options: ['Mace', 'Warhammer (if proficient)'] },
      { label: 'Armor', options: ['Scale mail', 'Leather armor', 'Chain mail (if proficient)'] },
      { label: 'Ranged', options: ['Light crossbow + 20 bolts', 'Any simple weapon'] },
      { label: 'Pack', options: ['Priest\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '5d4 × 10 gp',
  },
  druid: {
    fixed: ['Leather armor', 'Explorer\'s Pack', 'Druidic focus'],
    choices: [
      { label: 'Defense', options: ['Wooden shield', 'Any simple weapon'] },
      { label: 'Weapon', options: ['Scimitar', 'Any simple melee weapon'] },
    ],
    gold: '2d4 × 10 gp',
  },
  fighter: {
    fixed: [],
    choices: [
      { label: 'Armor', options: ['Chain mail', 'Leather armor + longbow + 20 arrows'] },
      { label: 'Weapon A', options: ['A martial weapon + shield', 'Two martial weapons'] },
      { label: 'Ranged', options: ['Light crossbow + 20 bolts', 'Two handaxes'] },
      { label: 'Pack', options: ['Dungeoneer\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '5d4 × 10 gp',
  },
  monk: {
    fixed: ['10 darts'],
    choices: [
      { label: 'Weapon', options: ['Shortsword', 'Any simple weapon'] },
      { label: 'Pack', options: ['Dungeoneer\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '5d4 gp',
  },
  paladin: {
    fixed: ['Chain mail', 'Holy symbol'],
    choices: [
      { label: 'Weapon A', options: ['A martial weapon + shield', 'Two martial weapons'] },
      { label: 'Weapon B', options: ['Five javelins', 'Any simple melee weapon'] },
      { label: 'Pack', options: ['Priest\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '5d4 × 10 gp',
  },
  ranger: {
    fixed: ['Longbow', 'Quiver of 20 arrows'],
    choices: [
      { label: 'Armor', options: ['Scale mail', 'Leather armor'] },
      { label: 'Weapon', options: ['Two shortswords', 'Two simple melee weapons'] },
      { label: 'Pack', options: ['Dungeoneer\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '5d4 × 10 gp',
  },
  rogue: {
    fixed: ['Leather armor', 'Two daggers', 'Thieves\' tools'],
    choices: [
      { label: 'Weapon', options: ['Rapier', 'Shortsword'] },
      { label: 'Ranged', options: ['Shortbow + quiver of 20 arrows', 'Shortsword'] },
      { label: 'Pack', options: ['Burglar\'s Pack', 'Dungeoneer\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '4d4 × 10 gp',
  },
  sorcerer: {
    fixed: ['Two daggers', 'Arcane focus'],
    choices: [
      { label: 'Weapon', options: ['Light crossbow + 20 bolts', 'Any simple weapon'] },
      { label: 'Focus', options: ['Component pouch', 'Arcane focus'] },
      { label: 'Pack', options: ['Dungeoneer\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '3d4 × 10 gp',
  },
  warlock: {
    fixed: ['Leather armor', 'Any simple weapon', 'Two daggers'],
    choices: [
      { label: 'Weapon', options: ['Light crossbow + 20 bolts', 'Any simple weapon'] },
      { label: 'Focus', options: ['Component pouch', 'Arcane focus'] },
      { label: 'Pack', options: ['Scholar\'s Pack', 'Dungeoneer\'s Pack'] },
    ],
    gold: '4d4 × 10 gp',
  },
  wizard: {
    fixed: ['Spellbook'],
    choices: [
      { label: 'Weapon', options: ['Quarterstaff', 'Dagger'] },
      { label: 'Focus', options: ['Component pouch', 'Arcane focus'] },
      { label: 'Pack', options: ['Scholar\'s Pack', 'Explorer\'s Pack'] },
    ],
    gold: '4d4 × 10 gp',
  },
};

// Helpers
function calcMod(score) { return Math.floor((Number(score) - 10) / 2); }
function modString(score) { const m = calcMod(score); return (m >= 0 ? '+' : '') + m; }
function proficiencyBonus(level) { return Math.floor((level - 1) / 4) + 2; }

function applyRacialBonuses(base, race, subrace) {
  const result = { ...base };
  if (!race) return result;
  const raceData = RACES.find(r => r.id === race);
  if (!raceData) return result;
  // Apply race bonuses
  Object.entries(raceData.bonuses || {}).forEach(([k, v]) => {
    if (k === 'all') {
      ['str','dex','con','int','wis','cha'].forEach(a => result[a] = (result[a] || 10) + v);
    } else if (k !== 'choice') {
      result[k] = (result[k] || 10) + v;
    }
  });
  // Apply subrace bonuses
  if (subrace) {
    const sub = raceData.subraces.find(s => s.id === subrace);
    if (sub && sub.bonuses) {
      Object.entries(sub.bonuses).forEach(([k, v]) => {
        result[k] = (result[k] || 10) + v;
      });
    }
  }
  return result;
}

Object.assign(window, {
  RACES, BACKGROUNDS, ALIGNMENTS, CLASSES, SKILLS, SPELLS, EQUIPMENT_PACKS, CLASS_EQUIPMENT,
  calcMod, modString, proficiencyBonus, applyRacialBonuses,
});
