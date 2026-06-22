/**
 * Pathfinder 2e Foundational Concept Glossary
 *
 * Used by the <Term slug="X" /> component to render PF2e terms inline with
 * distinctive styling (gold/brass color, subtle underline) plus an (ⓘ) icon
 * that opens a popover.
 *
 * - `short` fires on hover (mobile: tap on term text) — keep ~40-80 words
 * - `full` fires on (ⓘ) icon click — longer form with practical guidance
 * - `related` renders as clickable chips at the bottom of the popover
 */

export const PF2E_GLOSSARY = {

  // ─── Ability scores & modifiers ──────────────────────────────────────────

  'ability-score': {
    term: 'Ability Score',
    short: 'A number from 8 to 18+ measuring raw potential in one of the six attributes (STR, DEX, CON, INT, WIS, CHA). The score itself isn\'t used in rolls — its modifier is.',
    full: 'Every character has six ability scores. They start at 10 (average human), then get raised by ancestry, background, class, and free boosts at character creation. A typical level-1 character lands with one 18 (their class\'s key ability), a couple of 14s, a 12, and one or two 10s. Scores past 18 are possible at higher levels — eventually max 30 in extreme cases. The score itself never gets rolled — your modifier does, calculated as (score − 10) ÷ 2 rounded down.',
    related: ['ability-modifier', 'ability-boost', 'key-ability'],
  },

  'ability-modifier': {
    term: 'Ability Modifier',
    short: 'The number you actually use in rolls. Calculated as (score − 10) ÷ 2, rounded down. Score 18 = +4, 16 = +3, 14 = +2, 12 = +1, 10 = +0, 8 = −1.',
    full: 'When the rules say "add your Strength modifier" or "Dex mod," this is what they mean. Two consecutive even scores produce the same modifier (10 and 11 both = +0; 12 and 13 both = +1), which is why ability scores effectively step by 2 — only even-to-even increases improve your rolls. This is also why every boost is +2 — so each boost actually moves your modifier up by 1.',
    related: ['ability-score', 'ability-boost'],
  },

  'ability-boost': {
    term: 'Ability Boost',
    short: 'A +2 increase to one ability score (or +1 if the score is already 18 or higher). Boosts come in batches from ancestry, background, class, and four free picks at the end.',
    full: 'Within a single boost batch you can\'t boost the same ability twice — the system forces spread. Past 18, boosts only give +1 instead of +2, so you can\'t infinitely pump one stat. A solid level-1 build: max your class\'s key ability to 18, push CON to 14 for HP and Fortitude, push your save ability or DEX (for AC) to 14, and split the rest into 12s for your flavor stats. Avoid leaving anything at 10 if you can help it — every +1 modifier matters across a long campaign.',
    related: ['ability-flaw', 'key-ability', 'ability-modifier'],
  },

  'ability-flaw': {
    term: 'Ability Flaw',
    short: 'A −2 decrease to one ability score, granted by certain ancestries to balance their boosts.',
    full: 'Some ancestries trade specialization for flexibility. Goblin gets +DEX +CHA but a −2 flaw to WIS. Dwarf gets +CON +WIS but a −2 to CHA. The flaw applies at character creation; later boosts work normally on top. Ancestries with flaws usually grant an extra free boost to compensate. Some ancestries — Human is the classic — have no fixed flaw at all, just free boosts you assign yourself. The flaw doesn\'t mean the character is bad at that ability; it just starts lower than someone else might.',
    related: ['ability-boost', 'ancestry'],
  },

  'key-ability': {
    term: 'Key Ability',
    short: 'The ability score your class cares about most. Determines your Class DC, spell DC for casters, and the math behind your most important class features.',
    full: 'Every class has a key ability. Most martial classes give you a choice (Fighter: STR or DEX; Rogue: DEX), most casters lock it in (Wizard: INT, Cleric: WIS, Sorcerer: CHA, Witch: INT). Your class auto-boosts your key ability at level 1. Almost every class-defining roll scales off this stat — there is essentially no reason not to push your key ability to 18 at character creation. If your class gives you two key ability options, pick the one that matches your fighting style (DEX for archers/finesse, STR for heavy melee).',
    related: ['class', 'class-dc', 'ability-boost'],
  },

  'strength': {
    term: 'Strength (STR)',
    short: 'Raw physical power. Drives melee attacks, melee damage, the Athletics skill, and how much Bulk you can carry.',
    full: 'STR matters most for melee martial classes — Fighter, Barbarian, Champion, anyone wielding a non-finesse weapon. It also controls Athletics (Grapple, Shove, Trip, Climb, Swim, Long Jump) and your carrying capacity through Bulk. Casters and DEX-based fighters often dump STR to 10 or even take a flaw on it. If you\'re in heavy armor, you need at least STR 14 to wear it without speed penalty.',
    related: ['ability-score', 'athletics', 'bulk'],
  },

  'dexterity': {
    term: 'Dexterity (DEX)',
    short: 'Agility, reflexes, and precision. Drives ranged attacks, finesse weapon attacks, AC (until armor caps it), and Reflex saves.',
    full: 'DEX is the most universally useful stat in PF2e — it boosts AC for everyone wearing light or no armor, governs Reflex saves, and powers ranged and finesse attacks. Rogues, Rangers using bows, and any caster who\'s not wearing heavy armor want DEX 18. Heavy armor caps how much DEX bonus you get to AC, which is why STR-based heavy-armor fighters can afford to lower DEX a bit. The skills Acrobatics, Stealth, and Thievery all run off DEX.',
    related: ['ability-score', 'armor-class', 'reflex'],
  },

  'constitution': {
    term: 'Constitution (CON)',
    short: 'Toughness and endurance. Drives HP, Fortitude saves, and how long you can resist poison, disease, and exhaustion.',
    full: 'CON is everyone\'s second concern after their key ability. Your CON modifier gets added to your HP at every level, so a +2 CON character has 20 extra HP at level 10 compared to a +0 CON character. CON also drives Fortitude saves, which is what you roll against poison, disease, and Strength-based effects like Grapple. There\'s no skill tied to CON — it\'s purely defensive. Push it to at least 14 unless you have a very good reason not to.',
    related: ['ability-score', 'hit-points', 'fortitude'],
  },

  'intelligence': {
    term: 'Intelligence (INT)',
    short: 'Reasoning, memory, and learned knowledge. Drives Arcana, Crafting, Occultism, and Society skills, plus extra languages and trained skills at character creation.',
    full: 'INT does double duty: it\'s the key ability for Wizards, Witches, Magi, Alchemists, and Investigators, AND it grants every character extra trained skills and extra languages at level 1 (one of each per +1 INT modifier). Even non-INT classes often push it to 12 or 14 just for the extra skills and languages. The four INT skills (Arcana, Crafting, Occultism, Society) cover most of the "research and identify" mechanics — Recall Knowledge to learn about monsters, identify spells, decipher writing, and so on.',
    related: ['ability-score', 'skill', 'lore'],
  },

  'wisdom': {
    term: 'Wisdom (WIS)',
    short: 'Awareness, intuition, and instinct. Drives Perception, Will saves, and Wisdom-based skills (Medicine, Nature, Religion, Survival).',
    full: 'WIS is the key ability for Clerics, Druids, and Rangers. Even non-WIS classes care about it because Perception runs off WIS — and Perception is what gets you initiative, what notices traps and hidden enemies, and the most-rolled non-combat check in the game. Will saves also key off WIS. The WIS skills (Medicine, Nature, Religion, Survival) cover healing, the natural world, faith, and outdoor adventuring. Don\'t dump WIS to 8 unless you\'re ok with being slow on the initiative roll and weak against mind effects.',
    related: ['ability-score', 'perception', 'will'],
  },

  'charisma': {
    term: 'Charisma (CHA)',
    short: 'Force of personality, social presence, magnetism. Drives the four social skills (Deception, Diplomacy, Intimidation, Performance) and is key for Sorcerers, Bards, and Champions.',
    full: 'CHA isn\'t just "charming" — it\'s presence and willpower projected outward. Sorcerers and Bards cast off CHA; Champions use it for their reactions and Lay on Hands. The four CHA skills (Deception, Diplomacy, Intimidation, Performance) cover almost every social interaction in the game. Even non-CHA characters often boost it to 12 just to function in social scenes. Dumping CHA can make a character feel mute in roleplay-heavy campaigns even if they crush combat.',
    related: ['ability-score'],
  },

  // ─── Proficiency system ─────────────────────────────────────────────────

  'proficiency': {
    term: 'Proficiency',
    short: 'How good you are at something. Ranked Untrained / Trained / Expert / Master / Legendary. Affects nearly every roll in the game.',
    full: 'Proficiency is PF2e\'s core skill ladder. Every attack, save, skill, spellcasting check, perception roll, and class ability has a proficiency rank attached. A higher rank adds a bigger bonus, scaled with your level. Untrained adds nothing. Trained adds level + 2. Expert adds level + 4. Master adds level + 6. Legendary adds level + 8. This is what makes high-level characters meaningfully better than low-level ones — and what makes an "untrained" character in something fall further and further behind as the campaign progresses.',
    related: ['proficiency-rank', 'proficiency-bonus', 'trained'],
  },

  'proficiency-rank': {
    term: 'Proficiency Rank',
    short: 'One of five tiers — Untrained, Trained, Expert, Master, Legendary — that determines the size of the bonus you add to relevant rolls.',
    full: 'Most characters start with most things at Untrained. Your class, ancestry, and background train you in specific skills and proficiencies — usually starting at Trained (the lowest "you\'re actually good at this" tier). As you level, class progression upgrades certain proficiencies to Expert, then Master, then occasionally Legendary at very high levels. The jump from Untrained to Trained is the biggest leap in the game; the subsequent jumps each add +2 to the bonus.',
    related: ['proficiency', 'trained', 'expert', 'master', 'legendary'],
  },

  'trained': {
    term: 'Trained',
    short: 'The first proficiency rank above Untrained. Adds your level + 2 to relevant rolls.',
    full: 'Trained is "you can actually do this." A trained character at level 1 adds +3 to relevant rolls (1 level + 2 trained); at level 10 that\'s +12. Most level-1 characters are Trained in their class\'s saves, a handful of skills from their ancestry/background/class/INT, light armor or unarmored, and their starting weapons. Going from Untrained to Trained is the single largest jump in capability you\'ll get from a proficiency upgrade.',
    related: ['proficiency-rank', 'proficiency-bonus'],
  },

  'expert': {
    term: 'Expert',
    short: 'The proficiency rank above Trained. Adds your level + 4 to relevant rolls.',
    full: 'Expert means you\'re notably better than most professionals. Some classes start with one or two things at Expert at level 1 — Witch starts Expert in Will saves, Cleric starts Expert in their key skill, and so on. Most things upgrade from Trained to Expert somewhere between level 3 and 7, depending on class. Going from Trained to Expert is +2 over what you had before.',
    related: ['proficiency-rank', 'trained', 'master'],
  },

  'master': {
    term: 'Master',
    short: 'A high-tier proficiency rank, generally only reached at mid-to-high levels. Adds your level + 6 to relevant rolls.',
    full: 'Master proficiency typically arrives at level 7-13 depending on the class and the proficiency. Some classes never reach Master in certain proficiencies — that\'s the system\'s way of differentiating specialists from generalists. A Master character is among the most skilled mortals in the world at that particular thing.',
    related: ['proficiency-rank', 'expert', 'legendary'],
  },

  'legendary': {
    term: 'Legendary',
    short: 'The highest proficiency rank. Adds your level + 8 to relevant rolls. Most classes only reach Legendary in their signature areas, and not until levels 13-19.',
    full: 'Legendary is "you are one of the best who has ever lived" at this thing. A Legendary Fighter is the kind of swordsman bards write epics about. A Legendary Cleric reshapes nations. Most characters end a long campaign with one or two Legendary proficiencies — never all of them. The level requirements for reaching Legendary in any given proficiency are specifically gated by your class\'s progression.',
    related: ['proficiency-rank', 'master'],
  },

  'proficiency-bonus': {
    term: 'Proficiency Bonus',
    short: 'The number added to your roll based on your proficiency rank. Untrained = 0, Trained = level + 2, Expert = level + 4, Master = level + 6, Legendary = level + 8.',
    full: 'Your proficiency bonus is THE main reason PF2e characters get more powerful as they level. At level 1 with Trained, you\'re adding +3. At level 10 with Trained, you\'re adding +12. At level 10 with Legendary, +18. The level scaling matters — it means even your "I\'m just Trained in this" skills get respectable as you advance, but your specialist Legendary skills become genuinely superhuman.',
    related: ['proficiency-rank', 'level'],
  },

  'level': {
    term: 'Character Level',
    short: 'Your character\'s overall power tier, from 1 to 20. Adds directly to almost every roll you make once you\'re at least Trained in the relevant proficiency.',
    full: 'PF2e\'s level scaling is aggressive: your level gets added to virtually every roll you\'re trained in, so a level 10 Trained character has +12 in something while a level 1 Trained character has +3. This means levels matter a lot — fighting up isn\'t just hard, it\'s often impossible. New characters generally start at level 1 unless the GM specifies otherwise.',
    related: ['proficiency-bonus'],
  },

  // ─── Defense & combat stats ─────────────────────────────────────────────

  'hit-points': {
    term: 'Hit Points (HP)',
    short: 'How much damage you can take before dropping. Starts based on ancestry + class + CON modifier, then grows by your class HP + CON mod every level.',
    full: 'At level 1, HP = your ancestry\'s HP (usually 6, sometimes 8 or 10) + your class\'s HP per level + your CON modifier. A level-1 Elf Witch with CON 12 has 6 (Elf) + 6 (Witch) + 1 (CON +1) = 13 HP. Every level adds your class HP + CON modifier again. Hit 0 HP and you\'re dying — three failed Recovery saves and you\'re dead. The Treat Wounds skill action (Medicine) heals HP out of combat without needing magic.',
    related: ['constitution', 'ancestry', 'class'],
  },

  'armor-class': {
    term: 'Armor Class (AC)',
    short: 'How hard you are to hit. Formula: 10 + DEX (capped by armor) + armor bonus + proficiency in your armor category + level.',
    full: 'AC is what enemies have to beat with their attack rolls. Heavy armor offers a high base bonus but caps the DEX you can add (and may cost STR to wear without slowing you). Light armor offers a lower base but lets full DEX shine. Unarmored is highest DEX cap but no armor bonus. A typical level-1 character has AC 16-18. AC scales with both your armor proficiency upgrades and your level, so it stays competitive through the campaign.',
    related: ['dexterity', 'armor-proficiency', 'proficiency-bonus'],
  },

  'saving-throw': {
    term: 'Saving Throw',
    short: 'A defensive roll you make against effects targeting you. PF2e has three: Fortitude, Reflex, and Will. Formula: ability mod + level + proficiency in that save.',
    full: 'When a spell, trap, poison, or special attack hits you, you usually roll a save instead of the attacker rolling against you. Fortitude resists physical-internal effects (poison, disease, raw force). Reflex dodges things (fireballs, traps, area effects). Will resists mental and magical compulsion (charms, fear, illusions). Each class has different starting proficiency in each save — Fighter is great at Fort/Reflex, weak at Will; Wizard is the reverse. Critical successes on saves often halve or remove the effect entirely; critical failures often double the damage.',
    related: ['fortitude', 'reflex', 'will'],
  },

  'fortitude': {
    term: 'Fortitude Save (Fort)',
    short: 'Your defense against poison, disease, exhaustion, and brute-force physical effects. Based on CON.',
    full: 'Fortitude is your CON modifier + level + proficiency in Fort saves. You roll Fort when you\'re poisoned, when you contract a disease, when a creature tries to suck the life out of you, when a giant tries to crush you, when you need to resist the effects of starvation, and so on. Martial classes — Fighter, Barbarian, Champion — are best at Fort. Most casters start Trained in Fort and rarely improve it past Expert.',
    related: ['saving-throw', 'constitution'],
  },

  'reflex': {
    term: 'Reflex Save (Ref)',
    short: 'Your defense against area effects, traps, fast attacks, and anything you might dodge. Based on DEX.',
    full: 'Reflex is your DEX modifier + level + proficiency in Ref saves. You roll Reflex when a fireball goes off, when a trap fires darts, when you fall from a height, or when an enemy uses a sweeping attack against multiple targets. Rogues, Rangers, Monks, and Swashbucklers excel here. Spellcasters tend to be weaker at Reflex unless they specifically built around DEX.',
    related: ['saving-throw', 'dexterity'],
  },

  'will': {
    term: 'Will Save',
    short: 'Your defense against mental influence — fear, charm, sleep, mind control, illusions. Based on WIS.',
    full: 'Will is your WIS modifier + level + proficiency in Will saves. You roll Will when an enchantment tries to charm you, when a fear effect tries to make you flee, when an illusion tries to trick your senses, or when a possessed object tries to dominate you. Spellcasters and intuition-based classes (Cleric, Druid, Witch, Wizard) are best at Will. Martial classes often have lower Will, which is why "save or lose" mind effects are so dangerous against them.',
    related: ['saving-throw', 'wisdom'],
  },

  'perception': {
    term: 'Perception',
    short: 'How aware you are of your surroundings. Used for initiative, for spotting hidden things, and for noticing trouble before it hits. Based on WIS.',
    full: 'Perception is your WIS modifier + level + proficiency in Perception. It\'s the most-rolled non-combat check in the game. Initiative defaults to your Perception modifier — meaning high-WIS characters consistently act first. Perception also covers spotting traps, noticing creatures sneaking up, finding hidden objects, and reading body language at a distance. Every class has at least Trained Perception at level 1; many upgrade it to Expert by level 3-5.',
    related: ['wisdom', 'initiative'],
  },

  'initiative': {
    term: 'Initiative',
    short: 'The roll at the start of combat that determines turn order. Defaults to your Perception modifier — high WIS characters tend to go first.',
    full: 'When combat starts, everyone rolls initiative — by default that\'s your Perception bonus (the same number used to spot hidden things). Some abilities let you roll a different skill instead — Rangers can use Survival if they\'re tracking, Rogues can use Stealth if they\'re hidden, Bards can use Performance for a dramatic entrance. Higher initiative goes first. Going early matters a lot — you get to set up, attack first, or grab key positions before the enemy moves.',
    related: ['perception', 'wisdom'],
  },

  'class-dc': {
    term: 'Class DC',
    short: 'The Difficulty Class your class-specific abilities use when forcing enemies to roll a save against you. Formula: 10 + key ability mod + level + proficiency.',
    full: 'When a class ability says "the enemy attempts a Will save against your Class DC," this is the number they have to beat. Witch hex DCs, Champion reactions, Monk stunning fist effects, Barbarian intimidating roar — all key off Class DC. Class DC scales like any other DC: 10 + your key ability + level + proficiency rank. For a level 1 trained Witch with INT 18 (+4), Class DC = 10 + 4 + 1 + 2 = 17. Higher Class DC means your signature class abilities are harder to resist.',
    related: ['key-ability', 'proficiency-bonus'],
  },

  // ─── Action economy ─────────────────────────────────────────────────────

  'action': {
    term: 'Action',
    short: 'One of the three things you can do each turn. Most stuff in PF2e costs one action (Strike, Step, Stride) — bigger stuff costs two or three.',
    full: 'PF2e\'s three-action economy is its signature mechanic. Each turn you get three actions plus one reaction plus any number of free actions. A basic attack (Strike) costs one action; you can do it three times in a turn, but each subsequent attack takes a stacking penalty. Some abilities cost 2 actions (a powerful spell, a Power Attack) or 3 actions (the biggest moves). Most spells cost 2 actions to cast.',
    related: ['reaction', 'free-action', 'three-action-economy', 'strike'],
  },

  'reaction': {
    term: 'Reaction',
    short: 'One action per round you can use when triggered, outside your normal turn. Examples: Attack of Opportunity (Fighter), Shield Block, Glimpse of Redemption (Champion).',
    full: 'Reactions trigger off something specific — an enemy attacks, an ally takes damage, a spell goes off. You get one reaction per round, refreshing at the start of your turn. Some classes (especially Fighter) get reactions from level 1; most others need to pick them up via specific feats. Reactions are how characters interact with the action economy outside their own turn, which is powerful — a Fighter\'s Attack of Opportunity essentially gives them a "free" Strike every round whenever an enemy provokes.',
    related: ['action', 'free-action'],
  },

  'free-action': {
    term: 'Free Action',
    short: 'An action that doesn\'t cost any of your three regular actions. Includes spoken communication, dropping a held item, certain combat triggers.',
    full: 'Free actions are the small stuff — speaking a short sentence, dropping a held item, releasing your grip on an ally. Some abilities also work as free actions (a Sorcerer\'s Dangerous Sorcery effect, certain class triggers). The rules cap free actions to once per trigger to prevent abuse, but in general they don\'t compete with your three regular actions. You can do them whenever it\'s your turn or when their trigger condition fires.',
    related: ['action', 'reaction'],
  },

  'strike': {
    term: 'Strike',
    short: 'A single attack with a weapon or unarmed attack. Costs one action. Your second Strike in a turn takes −5, your third takes −10 (with finesse/agile weapons, −4 and −8).',
    full: 'Strike is the basic attack action — roll your attack bonus against the target\'s AC, hit on a tie or higher, critical hit on a 10+ over. Each Strike after your first in a turn takes a Multiple Attack Penalty (MAP). Agile weapons reduce the penalty (−4/−8 instead of −5/−10). Most characters don\'t Strike three times in a turn — it\'s usually better to Strike twice and use the third action for movement, a skill, or a defensive ability.',
    related: ['multiple-attack-penalty', 'action'],
  },

  'multiple-attack-penalty': {
    term: 'Multiple Attack Penalty (MAP)',
    short: 'A stacking penalty for making more than one Strike in a turn. Second Strike = −5, third = −10. Agile weapons reduce it to −4/−8.',
    full: 'MAP makes triple-Striking inefficient. Your first attack is your best chance to hit; the second is rough, the third is usually a Hail Mary. Smart play uses the first action for a Strike, the second for something with no MAP (a skill action, movement, a spell), and the third for either another Strike or another non-attack action. Class features like Rogue\'s Sneak Attack, Ranger\'s Hunt Prey, and Power Attack reset or work around MAP in specific ways.',
    related: ['strike'],
  },

  'step': {
    term: 'Step',
    short: 'A one-action move of 5 feet that doesn\'t trigger reactions like Attack of Opportunity. Lets you reposition safely.',
    full: 'Step is the safe move action. Stride lets you cover ground but provokes reactions; Step covers just 5 feet but slips past enemies without triggering their Attacks of Opportunity. Use Step to disengage from melee, to reposition for a flank, or to back away from a charging enemy. You can\'t Step in difficult terrain.',
    related: ['stride', 'reaction'],
  },

  'stride': {
    term: 'Stride',
    short: 'A one-action move equal to your Speed. Triggers reactions like Attack of Opportunity from enemies you start adjacent to.',
    full: 'Stride is the basic "I move on the map" action. You cover up to your Speed in feet. Enemies you\'re adjacent to when you start striding may get an Attack of Opportunity against you (if they have one). If you only need 5 feet of movement and there\'s an AoO threat, Step instead. Long moves use multiple Strides — you can spend all three actions running 90+ feet if you need to cover ground.',
    related: ['step', 'speed', 'action'],
  },

  'three-action-economy': {
    term: 'Three-Action Economy',
    short: 'PF2e\'s core combat structure: each turn you have 3 actions plus 1 reaction plus free actions. Everything costs at least 1 action.',
    full: 'The three-action economy is what makes PF2e feel different from older d20 games. Instead of "standard, move, swift, free" with their own rules, everything is just "actions" — 3 of them per turn — and abilities cost 1, 2, or 3 actions to use. This means smart play is about action efficiency: combine moves and attacks, use 1-action efficient abilities, and save your reaction for the most impactful moment. Spells overwhelmingly cost 2 actions (somatic + verbal); a 3-action spell is a serious commitment of your whole turn.',
    related: ['action', 'reaction', 'strike'],
  },

  // ─── Spellcasting ───────────────────────────────────────────────────────

  'spell': {
    term: 'Spell',
    short: 'A magical effect a caster can produce, drawn from one of the four traditions. Most spells take 2 actions to cast and consume a spell slot.',
    full: 'Spells are how casters do magic. They\'re organized by rank (1 through 10) — higher ranks are more powerful and cost higher spell slots. Each spell belongs to one or more of the four traditions (arcane, divine, occult, primal), which determines who can learn it. Most spells take 2 actions to cast (one for the gestures, one for the words). A few take 1 action (touch spells, instant reactions), a few take 3 (rituals or very powerful effects). Cantrips are a special category — they cost no spell slot and auto-heighten to your current rank.',
    related: ['cantrip', 'spell-rank', 'spell-slot', 'spell-tradition'],
  },

  'cantrip': {
    term: 'Cantrip',
    short: 'An unlimited-use spell. Doesn\'t consume a slot and auto-heightens to half your level (rounded up), so it stays relevant as you grow.',
    full: 'Cantrips are your at-will magic. Casters know a small number (3-5 typically at level 1) and can cast them as many times as they want. They auto-heighten — a Telekinetic Hand cantrip at level 1 affects 5 Bulk; at level 10, it does much more. Cantrips often serve as your fallback when you don\'t want to burn a spell slot — Telekinetic Projectile and Electric Arc are common combat cantrips, Detect Magic and Light are common utility ones.',
    related: ['spell', 'spell-slot', 'heightening'],
  },

  'spell-rank': {
    term: 'Spell Rank',
    short: 'A spell\'s power level, from 1 to 10. (In Remaster, "rank" replaced the older term "level" for spells to distinguish them from character level.)',
    full: 'Spells have ranks from 1 (low-tier) to 10 (apocalyptic). Rank 1 spells include Magic Missile, Heal, Charm, and other foundational effects. Rank 10 spells reshape reality. You unlock new ranks as you level up — a level 3 caster can cast rank 2 spells, level 5 unlocks rank 3, and so on. Pre-Remaster the term was "level" — if you find old PF2e content, "spell level" and "spell rank" mean the same thing.',
    related: ['spell', 'spell-slot', 'heightening'],
  },

  'spell-slot': {
    term: 'Spell Slot',
    short: 'A daily-use casting capacity at a particular rank. Each slot can hold one prepared spell or be used to cast one spontaneous spell of that rank.',
    full: 'Spell slots are how casters limit their daily output. At level 1 you might have 2 rank-1 slots; by level 5 you\'ll have slots at ranks 1, 2, and 3. Prepared casters (Cleric, Druid, Wizard, Witch) load a specific spell into each slot at dawn and burn the slot to cast it. Spontaneous casters (Sorcerer, Bard, Oracle) keep slots empty and decide what to cast in the moment from their repertoire. Slots refresh after a full night\'s rest.',
    related: ['spell', 'prepared-casting', 'spontaneous-casting'],
  },

  'focus-spell': {
    term: 'Focus Spell',
    short: 'A special category of spell drawn from your subclass or feats. Uses a focus pool instead of regular slots — refresh by spending 10 minutes refocusing.',
    full: 'Focus spells are separate from your normal spell list. Champion Lay on Hands, Druid order spells, Witch patron-puppet spells, Cleric domain spells — all focus spells. They draw from a focus pool (1-3 points depending on how many focus feats you\'ve taken). Spend 10 minutes Refocusing during exploration mode to restore a focus point. They\'re meant to be the "signature ability you use every fight" — not as limited as spell slots, but not at-will like cantrips.',
    related: ['focus-pool', 'refocus', 'spell'],
  },

  'focus-pool': {
    term: 'Focus Pool',
    short: 'A small pool of points (1-3) that fuel focus spells. Most casters with focus spells start at 1 point; pick up additional focus spell feats to expand it.',
    full: 'Your focus pool starts at 1 point if you have any focus spell from your class or subclass. Each additional focus spell you pick up from feats may expand the pool, up to a maximum of 3. Spending one point casts one focus spell — the costlier the focus spell, the more meaningful that one point is. You can\'t exceed 3, no matter how many focus spells you know. Refocus during exploration mode restores points 1 at a time (or all of them at a leisurely pace).',
    related: ['focus-spell', 'refocus'],
  },

  'refocus': {
    term: 'Refocus',
    short: 'A 10-minute exploration action that restores points to your focus pool. The specific method varies by class — a Cleric prays, a Druid attunes to nature, a Witch consults their familiar.',
    full: 'Refocus is your between-fights recovery for focus points. It takes 10 minutes, and you need to be relatively safe to do it. Different classes have different fictional methods — a Cleric meditates and prays, a Druid touches nature, a Witch communes with their patron through their familiar — but mechanically they\'re identical. Refocus restores one focus point at minimum; with the right feats, you can restore your entire pool at once.',
    related: ['focus-spell', 'focus-pool'],
  },

  'spell-tradition': {
    term: 'Spell Tradition',
    short: 'One of four schools of magic: Arcane, Divine, Occult, Primal. Each class casts in one or two traditions; spells generally appear in only one or two.',
    full: 'The four traditions organize magic by source. Arcane comes from study and pattern-recognition (Wizard, some Sorcerer bloodlines). Divine comes from gods and faith (Cleric, Champion focus spells). Occult comes from mind, spirit, and weird truths (Bard, Witch, some Sorcerer). Primal comes from nature and elemental forces (Druid, Ranger, some Sorcerer). A spell\'s tradition determines who can cast it — a Druid can\'t learn an arcane-only spell. Some classes (Witch, especially) get their tradition set by their subclass choice.',
    related: ['spell', 'arcane', 'divine', 'occult', 'primal'],
  },

  'arcane': {
    term: 'Arcane',
    short: 'The tradition of study, structure, and learned spellcraft. Wizards are the iconic arcane caster.',
    full: 'Arcane magic is what scholars and bookworms learn through hard study. Arcane spells tend toward direct effects — Magic Missile, Fireball, Disintegrate, Wall of Stone. The Wizard is the iconic arcane caster; some Sorcerer bloodlines (Imperial, Draconic) and the Witch with an Inscribed One patron also cast arcane. Arcane casters use INT (Wizard, Witch) or CHA (Sorcerer).',
    related: ['spell-tradition', 'divine', 'occult', 'primal'],
  },

  'divine': {
    term: 'Divine',
    short: 'The tradition of gods, faith, and channeled celestial or fiendish power. Clerics are the iconic divine caster.',
    full: 'Divine magic flows from gods and outer planes. It\'s strong on healing, light, protection, and channeling the will of a deity. Clerics, Champions (focus spells), and Witches with a Faith\'s Flamekeeper patron cast divine. Divine casters typically use WIS (Cleric) or CHA (Sorcerer with an angelic/demonic/diabolic bloodline).',
    related: ['spell-tradition', 'arcane', 'occult', 'primal'],
  },

  'occult': {
    term: 'Occult',
    short: 'The tradition of mind, spirit, secrets, and the weird truths between realities. Bards are the iconic occult caster.',
    full: 'Occult magic is mind, soul, and strange truth — illusions, charms, telepathy, dreamcraft, secrets. Bards cast occult, as do Witches with most patrons (Curse Bearer, Mosquito Witch, Resentment, Spinner of Threads, Starless Shadow). Occult casters use CHA (Bard) or INT (Witch).',
    related: ['spell-tradition', 'arcane', 'divine', 'primal'],
  },

  'primal': {
    term: 'Primal',
    short: 'The tradition of nature, elemental forces, and raw life. Druids are the iconic primal caster.',
    full: 'Primal magic is the world itself — storms, plants, beasts, fire, stone, the cycle of life. Druids, Rangers (focus spells), and Witches with primal patrons (Silence in Snow, Wilding Steward, Winter) cast primal. Primal casters use WIS (Druid) or INT (Witch).',
    related: ['spell-tradition', 'arcane', 'divine', 'occult'],
  },

  'prepared-casting': {
    term: 'Prepared Casting',
    short: 'Choose specific spells to load into your slots at dawn. Once cast, the slot is empty until tomorrow. Used by Cleric, Druid, Wizard, Witch.',
    full: 'Prepared casters are versatile but slow to adapt. Each morning you fill your spell slots with specific spells from your known spells (Wizard, Witch) or your tradition\'s list (Cleric, Druid). If you prepared three Healing Words and an emergency comes up that calls for Magic Missile, you can\'t cast Magic Missile — you didn\'t prepare it. The upside: you can prep a wider toolkit of effects since you have access to your full spell list every day, just not all at once.',
    related: ['spontaneous-casting', 'spell-slot', 'spell'],
  },

  'spontaneous-casting': {
    term: 'Spontaneous Casting',
    short: 'Keep slots empty and pick the spell at the moment of casting from your known repertoire. Used by Sorcerer, Bard, Oracle.',
    full: 'Spontaneous casters are nimble in the moment but have narrower repertoires. You learn a small set of spells per rank (your repertoire) and can cast any of them using any slot of that rank, deciding on the spot. Trade-off: you can\'t prep a spell you don\'t know, and your known spells are limited compared to a prepared caster\'s daily access to their full list. Spontaneous casters tend to play tactical with their known spells, repeating signature picks across encounters.',
    related: ['prepared-casting', 'spell-slot', 'spell'],
  },

  'spell-dc': {
    term: 'Spell DC',
    short: 'The Difficulty Class enemies have to beat when saving against your spells. Formula: 10 + key spellcasting ability mod + level + proficiency in spellcasting.',
    full: 'Spell DC is what the rules mean when they say "the enemy attempts a Will save against your spell DC." Higher spell DC = harder for enemies to resist your spells. It scales the same as any DC: 10 + key ability mod (INT for Wizard, WIS for Cleric, etc.) + level + spellcasting proficiency. For a level 1 trained Witch with INT 18 (+4), spell DC = 10 + 4 + 1 + 2 = 17.',
    related: ['key-ability', 'spell', 'spell-attack'],
  },

  'spell-attack': {
    term: 'Spell Attack',
    short: 'Your attack bonus for spells that require an attack roll instead of a save. Formula: key spellcasting ability mod + level + proficiency in spellcasting.',
    full: 'Some spells (rays, magical projectiles, Eldritch Blast equivalents) ask you to roll an attack instead of forcing the target to save. Spell attack uses your spellcasting modifier + level + proficiency. Same math as Spell DC but without the base 10. For a level 1 trained Witch with INT 18, spell attack = +4 + 1 + 2 = +7. Crit on a natural 20 OR by beating AC by 10.',
    related: ['spell-dc', 'spell'],
  },

  'heightening': {
    term: 'Heightening',
    short: 'Casting a lower-rank spell using a higher-rank slot to make it more powerful. Some spells have explicit "heightened" effects; others get bigger numbers.',
    full: 'Heightening is how you keep low-rank spells useful as you level up. Cast a rank-1 Heal using a rank-3 slot, and it heals more. Cast Magic Missile heightened, you get more missiles. Each spell\'s heightened version is listed in its description — sometimes a +1 step ("for each rank above 1st, +1d4 damage"), sometimes a major rewrite ("heightened 5th: also affects allies in a wider area"). Cantrips auto-heighten to your current level\'s effect; spell slots only heighten if you explicitly cast a slot of higher rank than the spell\'s base.',
    related: ['spell-rank', 'cantrip', 'spell-slot'],
  },

  // ─── Character build ────────────────────────────────────────────────────

  'ancestry': {
    term: 'Ancestry',
    short: 'Your character\'s species or origin — Elf, Dwarf, Human, Goblin, etc. Determines starting HP, ability boosts, speed, vision, and what feats you can pick.',
    full: 'Ancestry is the biological / cultural root of your character. Each ancestry grants a fixed pool of ability boosts (sometimes a flaw), a starting HP value (6, 8, or 10), base speed, vision type, languages, and access to ancestry-specific feats. You also pick a heritage at character creation — a sub-variant of your ancestry that adds more specific features. Pick an ancestry whose mechanics support your concept, but don\'t feel locked into stereotypes — a Goblin Cleric or Dwarf Bard works fine.',
    related: ['heritage', 'ability-boost', 'ancestry-feat'],
  },

  'heritage': {
    term: 'Heritage',
    short: 'A sub-variant of your ancestry chosen at character creation. Each heritage adds specific features, often tied to environment, lineage, or magical heritage.',
    full: 'Heritages let one ancestry feel many different ways. A Half-Elf heritage and a Seer Elf heritage are both technically "Elf" but play very differently — the Seer gets magical insight; Half-Elves get hybrid social positioning. Heritages add features on top of your ancestry\'s baseline. You pick one heritage at level 1 and that\'s it — you don\'t swap heritages later (without specific feats). Pick the heritage that matches your concept and the campaign\'s setting.',
    related: ['ancestry'],
  },

  'background': {
    term: 'Background',
    short: 'Your character\'s pre-adventure life — Acolyte, Bounty Hunter, Scholar, Sailor. Grants 2 ability boosts, a trained skill, a Lore subskill, and a skill feat.',
    full: 'Background represents what your character did before adventuring. Mechanically it grants two ability boosts (one constrained between two options, one free), training in one specific skill, training in a Lore subskill (e.g., Religious Lore for Acolyte), and one skill feat. Pick a background that matches your character concept AND that gives you boosts to abilities your class cares about. Acolyte is great for Clerics (free WIS boost!); Criminal works for Rogues; Sailor is great for any DEX-based class.',
    related: ['ability-boost', 'skill', 'lore'],
  },

  'class': {
    term: 'Class',
    short: 'Your character\'s mechanical role and feature set — Fighter, Wizard, Cleric, Rogue, etc. Determines HP per level, proficiencies, class feats, and key abilities.',
    full: 'Class is the biggest mechanical decision in PF2e. It sets your HP per level (6-10), your starting proficiencies in weapons/armor/saves/skills, what class feats you can pick, and your key ability score. Caster classes also pick a tradition. Many classes have a subclass choice at level 1 (Cleric doctrine, Druid order, Sorcerer bloodline, etc.) that further specializes your build. Pick a class whose core fantasy matches what you want to do at the table — combat-focused, support-focused, magical, sneaky, etc.',
    related: ['subclass', 'key-ability', 'class-feat'],
  },

  'subclass': {
    term: 'Subclass',
    short: 'A specialization within your class — Cleric Doctrine, Druid Order, Sorcerer Bloodline, Witch Patron, Barbarian Instinct, etc. Picked at level 1.',
    full: 'Subclasses are the "what kind of X are you" choice within a class. A Cleric picks a doctrine (Cloistered or Warpriest) that determines how much they\'re a caster vs. a melee fighter. A Druid picks an order (Animal, Leaf, Storm, Untamed). A Sorcerer picks a bloodline that sets their tradition and grants signature spells. Subclasses usually grant a focus spell, modify proficiencies, and provide a unique class feature. Pick the subclass whose flavor and mechanics match your build concept.',
    related: ['class'],
  },

  'feat': {
    term: 'Feat',
    short: 'A specific ability or capability picked at certain levels. PF2e has four feat tracks: Class, Ancestry, Skill, and General. Each grants different feats on different schedules.',
    full: 'Feats are how you customize your character beyond the basics. Every class gets class feats at specific levels (usually every other level starting at 1 or 2). Every character gets ancestry feats at level 1, 5, 9, etc. Skill feats arrive at level 2, 4, 6, etc. General feats arrive at level 3, 7, 11, etc. Each feat is a discrete ability — a new combat technique, a new spell, a new way to use a skill, an extra reaction, etc. Building a character is largely about picking feats that interact well.',
    related: ['class-feat', 'ancestry-feat', 'skill-feat', 'general-feat'],
  },

  'class-feat': {
    term: 'Class Feat',
    short: 'A feat from your class\'s specific list. You pick one at level 1, then more at level 2 and every two levels after (depending on class).',
    full: 'Class feats are how your class progresses beyond its base features. Each class has its own list of feats — Fighter gets combat techniques, Wizard gets metamagic and spell tricks, Witch gets hex variations and patron interactions. You pick a class feat at level 1 (most classes), then add one every 2 levels typically. These are the "signature moves" of your class — Power Attack, Sneak Attack improvements, Channel Smite, etc.',
    related: ['feat', 'class'],
  },

  'ancestry-feat': {
    term: 'Ancestry Feat',
    short: 'A feat tied to your ancestry. First one at level 1, more at level 5, 9, 13, 17.',
    full: 'Ancestry feats let your character lean further into their ancestry\'s strengths — an Elf can pick Otherworldly Magic for a cantrip, or Ancestral Longevity for skill bonuses. A Dwarf can pick Stonecunning, Goblin can pick Burn It! for fire-related bonuses. You pick one at level 1, then four more across the campaign at levels 5, 9, 13, and 17. They usually reinforce your concept and your ancestry\'s fictional vibe.',
    related: ['feat', 'ancestry', 'heritage'],
  },

  'skill-feat': {
    term: 'Skill Feat',
    short: 'A feat tied to a specific skill. You unlock new actions or improve existing ones. Requires Trained proficiency in the relevant skill. Picked at level 2 and every 2 levels.',
    full: 'Skill feats unlock new uses of skills you\'re already trained in. Trained in Medicine? Pick up Battle Medicine to use Treat Wounds in combat. Trained in Stealth? Pick up Quick Squeeze to slip through tight spaces fast. Trained in Diplomacy? Pick up Bon Mot to demoralize with words. Skill feats arrive at level 2 and every even level after — they\'re less central than class feats but add a lot of utility across encounters.',
    related: ['feat', 'skill'],
  },

  'general-feat': {
    term: 'General Feat',
    short: 'A feat from a broad pool available to all classes — Toughness, Shield Block, Fleet, etc. Picked at level 3 and every 4 levels.',
    full: 'General feats are universal options. Toughness grants extra HP. Shield Block lets you absorb damage with a shield. Fleet boosts your Speed. Incredible Initiative buffs your turn order. Languages adds extra known languages. They\'re less powerful per-feat than class feats but fill important gaps regardless of class. Skill feats also count as valid choices for general feat slots — but the reverse isn\'t true.',
    related: ['feat'],
  },

  'lore': {
    term: 'Lore (Subskill)',
    short: 'A specialized knowledge subskill — Religious Lore, Heraldry Lore, Mining Lore, Underworld Lore. Each Lore is its own separate proficiency track.',
    full: 'Lore is the catch-all skill for niche expertise. Different Lores are separate skills — being trained in Religious Lore doesn\'t make you trained in Heraldry Lore. Backgrounds grant one specific Lore at trained (Acolyte: Religious Lore; Hunter: Tanning Lore). Lore checks come up for narrow Recall Knowledge questions that other broad skills can\'t cover — "what\'s the symbol of this particular noble house" might call for Heraldry Lore. INT-based.',
    related: ['skill', 'background', 'intelligence'],
  },

  // ─── Equipment & physical ───────────────────────────────────────────────

  'bulk': {
    term: 'Bulk',
    short: 'PF2e\'s encumbrance system. Items have a Bulk value — most things are Light (L) or 1 Bulk; weapons are 1-2. Your STR determines how much you can carry.',
    full: 'Bulk is the simple replacement for tracking weight in pounds. Most weapons are 1 or 2 Bulk. A longsword is 1, a greatsword is 2, a dagger is L (Light — 10 of these add up to 1 Bulk). You can carry 5 + your STR modifier Bulk before becoming Encumbered (which slows your speed). At 10 + STR mod Bulk, you\'re at max capacity. Casters with low STR can\'t haul much — they typically share heavy loot with the party\'s tank.',
    related: ['strength'],
  },

  'class-kit': {
    term: 'Class Kit',
    short: 'A curated bundle of starting equipment priced to fit your level-1 starting gold. Pre-set option to skip shopping at character creation.',
    full: 'Each class has an official Class Kit — a bundle of weapons, armor, and adventuring gear that costs about 14 silver pieces (matching starting gold) and covers everything that class needs to start. Fighter\'s kit has a martial weapon, armor, and basic gear. Wizard\'s kit has a staff, spellbook, scholar\'s pack, and components. Class kits are the "just give me a complete loadout" button. You can always assemble your own gear from the shop if you want specific picks.',
    related: ['class'],
  },

  'weapon-proficiency': {
    term: 'Weapon Proficiency',
    short: 'How good you are with a category of weapons (simple, martial, advanced) or a specific weapon. Trained or better lets you use it without penalty.',
    full: 'Weapon proficiency works the same as any other proficiency: Untrained means a hefty −2 penalty, Trained means level + 2, Expert means level + 4. Weapons come in categories: Simple (clubs, daggers, slings — Trained by most classes), Martial (longswords, bows, halberds — Trained by martial classes), and Advanced (greataxe, repeating crossbow — usually only specific classes). Some classes get specific weapons trained beyond their general category — Wizards get a few specific arcane-themed weapons even though they\'re otherwise simple-weapons-only.',
    related: ['proficiency-rank', 'class'],
  },

  'armor-proficiency': {
    term: 'Armor Proficiency',
    short: 'How good you are with a category of armor (unarmored, light, medium, heavy). Lower proficiency means your AC suffers.',
    full: 'Armor proficiency determines what bonus you add when wearing armor of that category. Trained in light armor means you add your full proficiency bonus when wearing leather, padded, etc. Untrained in heavy armor means you lose your proficiency bonus AND your level when wearing it. Most casters are trained in light armor or unarmored only — heavy armor is martial territory. Each armor has a DEX cap that limits how much DEX bonus you can add — light caps at +4, medium at +2, heavy at +0 usually.',
    related: ['proficiency-rank', 'armor-class', 'class'],
  },

  // ─── Physical ───────────────────────────────────────────────────────────

  'size': {
    term: 'Size',
    short: 'Your physical size category — Tiny, Small, Medium, Large, Huge. Most player characters are Small (Goblin, Halfling, Gnome) or Medium (everyone else).',
    full: 'Size matters for reach, space on the battlemap, and a few specific rules. Small characters take up the same 5-foot square as Medium ones; the difference is mostly fictional and gear-related (Small characters use Small weapons, which deal less damage per category). Large characters take up a 10-foot square and have reach. Most ancestries are Medium; Halfling, Gnome, Goblin, and Leshy are Small.',
    related: ['ancestry'],
  },

  'speed': {
    term: 'Speed',
    short: 'How far you can move with one Stride action. Most ancestries are 25 feet, Elf and Human are 30, Dwarf and Gnome are 20.',
    full: 'Speed is measured in feet on a 5-foot grid. Stride moves up to your Speed per action — most characters cover 25-30 feet per Stride. Spending all three actions Striding moves you 75-90 feet. Some armors slow you (medium armor with insufficient STR, heavy armor). Some feats add to your Speed (Fleet adds +5). Some heritages or feats grant extra movement types — swim speed, climb speed, fly speed.',
    related: ['stride', 'ancestry'],
  },

  'vision': {
    term: 'Vision',
    short: 'How well you see. Normal vision needs light. Low-Light Vision treats dim light as bright. Darkvision lets you see in total darkness (but in shades of gray).',
    full: 'Most humans have only normal vision — they need bright or dim light to see. Many ancestries have Low-Light Vision (Elf, Half-Elf, Gnome) which lets them treat dim light as bright. Some have Darkvision (Dwarf, Goblin, Drow), letting them see in pitch black — though only in shades of gray, not color. The mechanical difference matters in dungeons and at night — a Darkvision Dwarf walks into a dark cavern unconcerned; a normal-vision Human needs a torch and reveals their position to anything watching.',
    related: ['ancestry'],
  },

  'languages': {
    term: 'Languages',
    short: 'What you can speak, read, and understand. Everyone knows Common; ancestries grant one additional language, INT grants more.',
    full: 'Languages are mostly narrative — they let you talk to NPCs and read written material. Every PC starts with Common (the trade language) plus their ancestry\'s primary language (Elven for Elves, Dwarven for Dwarves, etc.). High INT grants additional language picks at level 1 — one extra per +1 INT modifier. Common languages: Draconic, Elven, Dwarven, Goblin, Halfling, Gnomish. Rarer ones: Fey, Celestial, Undercommon, Chthonian (the Remaster name for Abyssal), Wildsong (the Remaster name for Druidic).',
    related: ['intelligence', 'ancestry'],
  },

  // ─── The 16 PF2e skills ─────────────────────────────────────────────────

  'skill': {
    term: 'Skill',
    short: 'A trained capability outside of combat — Athletics, Stealth, Diplomacy, Medicine, etc. PF2e has 16 skills total.',
    full: 'Skills cover what your character can do outside of "I attack with my sword." Each skill is tied to an ability score and a proficiency rank. Most level-1 characters are trained in 4-6 skills depending on their class and INT. Skills handle climbing (Athletics), sneaking (Stealth), persuading (Diplomacy), identifying magic (Arcana/Occultism/Nature/Religion depending on tradition), healing (Medicine), and dozens more. A trained skill lets you do its core actions; skill feats unlock advanced uses.',
    related: ['proficiency', 'skill-feat'],
  },

  'acrobatics': {
    term: 'Acrobatics',
    short: 'Agility-based athleticism — balancing, tumbling, slipping past enemies, escaping grapples. Based on DEX.',
    full: 'Acrobatics covers the moves that need grace more than strength: balancing on narrow ledges, tumbling past an enemy without provoking, sliding under an opponent\'s legs, escaping a grapple or restraint, climbing with style. The Tumble Through action lets you move through an enemy\'s space if you beat their Reflex DC with your Acrobatics. Squeeze action lets you fit through tight spaces. Useful for skirmishers, scouts, and anyone who values mobility.',
    related: ['skill', 'dexterity'],
  },

  'arcana': {
    term: 'Arcana',
    short: 'Knowledge of arcane magic — identifying spells, magical creatures, magic items, and arcane lore. Based on INT.',
    full: 'Arcana covers everything related to arcane magic — recognizing the arcane symbols in a magic circle, identifying that mind flayer as an aberration with arcane resistance, naming the spell an enemy just cast. It also covers Recall Knowledge about wizards, ancient empires of magic, magical creatures (constructs, dragons), and reading magical writing. The skill of choice for Wizards, Witches, and anyone with a scholarly bent toward magic.',
    related: ['skill', 'intelligence', 'arcane'],
  },

  'athletics': {
    term: 'Athletics',
    short: 'Brute physical action — Climb, Swim, Jump, Grapple, Shove, Trip, Force Open. The main combat-utility skill. Based on STR.',
    full: 'Athletics is the workhorse skill for physical characters. It covers climbing walls, swimming, long jumps, forcing open doors, AND the four major combat maneuvers: Grapple (lock down an enemy), Shove (knock them back), Trip (knock them prone), and Disarm (knock their weapon away). Wrestlers, brawlers, frontline fighters, and any character who wants to control the battlefield without spells leans hard on Athletics.',
    related: ['skill', 'strength'],
  },

  'crafting': {
    term: 'Crafting',
    short: 'Making items, repairing gear, identifying mundane objects, and crafting alchemical items. Based on INT.',
    full: 'Crafting is the make-and-fix skill. Repair broken gear, craft mundane items, identify what something is made of, recognize manufacturing techniques. Trained Crafting also unlocks alchemy through feats (Alchemical Crafting) — make bombs, elixirs, and other consumables. Alchemists run their entire class through Crafting. Most other characters take Crafting to repair gear and identify items found in dungeons.',
    related: ['skill', 'intelligence'],
  },

  'deception': {
    term: 'Deception',
    short: 'Lying, disguising yourself, feinting in combat, distracting people. Based on CHA.',
    full: 'Deception covers all the ways you mislead — outright lying (Lie action), wearing a disguise (Impersonate), feinting an enemy out of position (Feint), or creating a distraction so someone else can sneak past. Skilled liars and tricksters live here. Rogues, Bards, and grifter-type characters love Deception. Feint is especially nice in combat — it makes your enemy flat-footed against your next Strike.',
    related: ['skill', 'charisma'],
  },

  'diplomacy': {
    term: 'Diplomacy',
    short: 'Persuading, soothing, gathering rumors, making a good first impression. Based on CHA.',
    full: 'Diplomacy is talking your way through problems — making a stranger friendly toward you (Make an Impression), convincing someone to do what you want (Request), gathering information from the townsfolk (Gather Information). Diplomacy is generally the "kindest" social skill — you\'re convincing people through honest charm and warmth, not threats or tricks. Bards and Champions excel here.',
    related: ['skill', 'charisma'],
  },

  'intimidation': {
    term: 'Intimidation',
    short: 'Frightening, demoralizing, and coercing. Demoralize in combat is one of the most consistent actions in the game. Based on CHA.',
    full: 'Intimidation is the threats-and-fear skill. The Demoralize action — usable in combat for one action — makes a nearby enemy Frightened, giving them a status penalty on most rolls. That penalty stacks with other debuffs and helps the whole party. Coerce is the conversational version, useful for shaking down NPCs. Intimidation works well for Barbarians, Champions (especially Tyrant cause), and any high-CHA front-liner.',
    related: ['skill', 'charisma'],
  },

  'medicine': {
    term: 'Medicine',
    short: 'Healing wounds without magic, treating poison and disease. Based on WIS.',
    full: 'Medicine is non-magical healing — and it\'s really effective in PF2e. Treat Wounds heals a significant chunk of HP in 10 minutes; with the Battle Medicine feat, you can do a quick version in combat. Treat Poison and Treat Disease let medical characters work without spell slots. A trained Medicine character lets the party stretch their healing capacity without burning through Cleric resources every fight.',
    related: ['skill', 'wisdom'],
  },

  'nature': {
    term: 'Nature',
    short: 'Knowledge of the natural world — animals, plants, weather, terrain, primal creatures. Based on WIS.',
    full: 'Nature covers wilderness expertise and primal magic — identifying that strange creature as an animal vs. a beast vs. a magical aberration, predicting weather, recognizing plants, foraging for food, riding mounts, handling animals. Druids, Rangers, and Witches with primal patrons live here. Also covers the Command an Animal action and identifying primal spells.',
    related: ['skill', 'wisdom', 'primal'],
  },

  'occultism': {
    term: 'Occultism',
    short: 'Knowledge of occult magic — spirits, the mind, dreams, weird esoterica. Based on INT.',
    full: 'Occultism is for the strange and mysterious — identifying occult spells, recognizing spirits and aberrations, decoding cryptic texts, understanding planar mysteries. It overlaps with Arcana for some "magical knowledge" but specifically covers occult-tradition spells and creatures (mostly aberrations and some spirits). Bards and Witches with occult patrons lean on Occultism.',
    related: ['skill', 'intelligence', 'occult'],
  },

  'performance': {
    term: 'Performance',
    short: 'Acting, singing, playing music, telling stories, giving speeches. Based on CHA.',
    full: 'Performance is artistic and dramatic expression. Bards use it for their compositions (focus spells channeled through performance). The Perform action lets you entertain a crowd — useful for earning coin in town, distracting guards, or building an NPC\'s opinion of you. Generally social-utility rather than direct combat use, though Battledancer Swashbucklers get panache through Tumble Through and treat it as a performance.',
    related: ['skill', 'charisma'],
  },

  'religion': {
    term: 'Religion',
    short: 'Knowledge of gods, faiths, divine magic, undead, and celestial/fiendish creatures. Based on WIS.',
    full: 'Religion covers everything related to gods and the outer planes — identifying which god a symbol belongs to, recognizing divine spells, naming the type of undead in front of you, understanding planar visitors. Clerics and Champions key off Religion; anyone with divine ties takes it. The Recall Knowledge action via Religion covers undead, divine spellcasters, and theological history.',
    related: ['skill', 'wisdom', 'divine'],
  },

  'society': {
    term: 'Society',
    short: 'Knowledge of civilization — cultures, history, politics, heraldry, current events. Based on INT.',
    full: 'Society is the urban skill — knowing how cities work, who rules where, what the local laws are, what the various noble houses\' symbols mean, how to read and write. Decipher Writing covers translations and cracked codes. Subsist (Society version) covers earning a living through legitimate work in town. Useful for any character who interacts with civilization, especially as the party climbs into political plotlines.',
    related: ['skill', 'intelligence'],
  },

  'stealth': {
    term: 'Stealth',
    short: 'Sneaking, hiding, avoiding detection. Based on DEX.',
    full: 'Stealth is the rogue\'s playground. Hide makes you concealed (hard to target); Sneak lets you move while hidden; Avoid Notice lets you travel quietly without being spotted. Rogues, Rangers, and characters who set up sneak attacks live here. Even non-stealth characters benefit from a few ranks for ambushes and infiltration scenarios.',
    related: ['skill', 'dexterity'],
  },

  'survival': {
    term: 'Survival',
    short: 'Wilderness travel — Subsist in the wild, find your way without a guide, track creatures, predict weather. Based on WIS.',
    full: 'Survival is the wilderness counterpart to Society. Sense Direction lets you orient yourself when lost. Subsist (Survival version) keeps you fed on the road. Track lets you follow a creature\'s trail. Rangers use Survival heavily; Druids and outdoors-y characters lean on it. Sometimes serves as a backup to Nature for woodcraft questions.',
    related: ['skill', 'wisdom'],
  },

  'thievery': {
    term: 'Thievery',
    short: 'Pickpocketing, lockpicking, disabling traps, sleight of hand. Based on DEX.',
    full: 'Thievery is the rogue\'s second favorite skill (after Stealth). Pick Lock opens locked doors and chests. Disable a Device disarms traps and sabotages mechanisms. Steal (Pickpocket) takes items off a person without them noticing. Palm an Object hides items in your hand or about your person. Critical for any character infiltrating, investigating, or running heists.',
    related: ['skill', 'dexterity'],
  },

};

/**
 * Wiring guidance for Claude Code (separate task):
 *
 * 1. Create `<Term slug="X" />` component:
 *    - Renders the term's text inline with distinctive styling:
 *      - Brass/gold color (#c8a04a or similar PF2e-themed accent)
 *      - Subtle underline (1px dotted) to signal interactivity
 *      - Bold weight
 *    - On hover (desktop) or tap (mobile): show tooltip with `short` field
 *    - Small (ⓘ) icon adjacent: on click, opens popover with `full` field
 *      plus clickable chips for each `related` term
 *    - Related-term chips inside the popover open that term's popover
 *
 * 2. Markup convention in tip text:
 *    <p>Your <Term slug="key-ability">key ability</Term> determines your
 *    <Term slug="class-dc">Class DC</Term>.</p>
 *
 * 3. Replace the generic Helpful Tip placeholders systematically.
 *    Existing curated tips (Athamaru, the 36 curated backgrounds) keep
 *    their text but get Term-tagged where concepts appear.
 *
 * 4. Storage: keep this file at
 *    `src/game-packs/pf2e/content/glossary.js`.
 *    Imported wherever Term renders. Single source of truth.
 *
 * 5. Future batches:
 *    - Per-ancestry tips (24 entries, 80-120 words each)
 *    - Per-heritage tips (~80 entries, 50-80 words each)
 *    - Per-class tips (14 ORC classes, 150-200 words each)
 *    - Per-subclass tips (~70 entries, paired with Phase K overlay content)
 *    - Remaining background tips (90 entries to extend Phase C's curated 36)
 */
