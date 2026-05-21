// Recommended new-player builds per class. Each section can be
// auto-applied via the "Use Recommended" button (B.2). When a player
// overrides a single auto-filled pick, only that slot loses its ★
// badge — sibling picks keep theirs.
//
// Note on slugs: skill / feat / spell entries reference *name-form
// slugs* (kebab-case of the entity's display name) so the picker can
// match them against either the entity's `slug` field or
// `name.toLowerCase().replace(/\s+/g, '-')`. This sidesteps the
// Foundry-random-id problem until the slug-resolver lands.

export const RECOMMENDED_BUILDS = {
  fighter: {
    rationale: "Frontline melee. Strength swings hard, Constitution keeps you up, Dexterity for AC and initiative, Wisdom for Perception and Will saves.",
    boosts: { free: ['str', 'con', 'dex', 'wis'] },
    skills: ['athletics', 'intimidation'],
    classFeats: { 1: ['power-attack'] },
    spells: null,
    startingItems: ['longsword', 'steel-shield', 'chain-mail', 'crossbow-20-bolts', 'adventurers-pack', 'healing-potion-minor'],
    reasoning: {
      boosts: "[[strength|Strength]] powers your melee damage and your [[athletics|Athletics]] maneuvers (Grapple, Trip, Shove). [[constitution|Constitution]] keeps you upright through hits. [[dexterity|Dexterity]] bumps [[armor-class|AC]] and [[initiative|Initiative]]. [[wisdom|Wisdom]] backstops [[perception|Perception]] and your [[will|Will save]] — Fighters are [[trained]] Will, so the +1 mod matters.",
      skills: "[[athletics|Athletics]] is the Fighter staple: any Grapple/Trip/Shove uses it, and you'll need it against bigger creatures. [[intimidation|Intimidation]] pairs with [[strength|Strength]] for Demoralize — a [[free-action|free action]]-tax on enemies once you close.",
      classFeats: "Power Attack — spend 2 [[action|actions]] to make one [[strike]] with bonus damage and a -5 [[multiple-attack-penalty|MAP]] for the next attack. Bread-and-butter when you've burned your iterative attacks already, or against a target that needs to drop now.",
      spells: null,
      startingItems: "Longsword for the d8 + reach-when-two-handed flex. Steel Shield for Raise-a-Shield [[reaction|reactions]]. Chain Mail until you can afford something better. Crossbow gives you ranged options without burning a [[strength|Strength]] [[ability-boost|boost]] on ranged [[proficiency]].",
    },
  },
  champion: {
    rationale: "Tanky frontliner. Strength for damage, Constitution for HP, Charisma for divine abilities and reactions, Wisdom for Perception.",
    boosts: { free: ['str', 'con', 'cha', 'wis'] },
    skills: ['religion', 'athletics'],
    classFeats: { 1: ['ranged-reprisal'] },
    spells: null,
    startingItems: ['longsword', 'steel-shield', 'chain-mail', 'religious-symbol-wooden', 'javelin', 'adventurers-pack'],
    reasoning: {
      boosts: "[[strength|Strength]] swings your weapon and lets you keep up your shield. [[charisma|Charisma]] is the Champion's [[spell-dc|spell DC]] + scales your Lay on Hands, so it matters even on a non-caster build. [[constitution|Constitution]] + [[wisdom|Wisdom]] keep you upright and aware on the front line.",
      skills: "[[religion|Religion]] is doctrinal — you'll Recall Knowledge about divine creatures and undead constantly. [[athletics|Athletics]] for Bulwark-style maneuvers when guarding allies.",
      classFeats: "Ranged Reprisal — your Champion's [[reaction|Reaction]] works against ranged attackers within 30 feet, not just melee. Solves the classic 'archer is melting our wizard from across the map' problem.",
      spells: null,
      startingItems: "Longsword + Steel Shield = the canonical Champion silhouette. Chain Mail because medium armor is your bread and butter. Holy symbol unlocks [[divine|Divine]] [[focus-spell|focus spells]] from your cause. Javelin gives ranged options before Ranged Reprisal becomes online.",
    },
  },
  cleric: {
    rationale: "Divine caster. Wisdom drives your spells. Constitution for survival. Strength or Dexterity for incidental melee/ranged.",
    boosts: { free: ['wis', 'con', 'dex', 'cha'] },
    skills: ['religion', 'medicine'],
    classFeats: { 1: ['domain-initiate'] },
    spells: {
      cantrips: ['guidance', 'shield', 'light', 'stabilize', 'detect-magic'],
      first: ['heal', 'bless'],
    },
    startingItems: ['mace', 'wooden-shield', 'scale-mail', 'religious-symbol-wooden', 'healers-toolkit', 'adventurers-pack'],
    reasoning: {
      boosts: "[[wisdom|Wisdom]] IS your [[spell-dc|spell DC]] and your Heal effectiveness — every +1 matters. [[constitution|Constitution]] to stay concentrating through hits. [[dexterity|Dexterity]] for [[armor-class|AC]]. [[charisma|Charisma]] backs up your Cha-based [[skill|skills]] if you're the party face.",
      skills: "[[religion|Religion]] for divine knowledge and identifying [[spell|spells]]. [[medicine|Medicine]] to back up your divine healing with mundane Treat Wounds during downtime.",
      classFeats: "Domain Initiate — pick a [[focus-spell|focus spell]] from one of your deity's domains. Gives you a [[refocus|Refocus]]-able power you can spam through a fight without burning [[spell-slot|slots]].",
      spells: "Guidance: free +1 to one check per minute on someone. Shield: [[cantrip]]-tier [[armor-class|AC]] boost on [[reaction]]. Light: dark-clearing utility. Stabilize: save someone dying without burning a slot. Detect Magic: identify magical effects. Heal at [[spell-rank|rank]] 1: AoE healing in a 30-ft burst, the Cleric's signature. Bless: party-wide attack-roll buff.",
      startingItems: "Mace is your deity's typical Favored Weapon; if your deity favors something else, swap. Wooden Shield + Scale Mail for [[armor-class|AC]]. Healer's Toolkit for out-of-combat Treat Wounds.",
    },
  },
  ranger: {
    rationale: "Versatile martial. Dexterity for bows, Strength if going melee, Constitution for HP, Wisdom for Perception and Nature.",
    boosts: { free: ['dex', 'wis', 'con', 'str'] },
    skills: ['nature', 'survival', 'stealth'],
    classFeats: { 1: ['hunted-shot'] },
    spells: null,
    startingItems: ['longbow-20-arrows', 'shortsword', 'studded-leather-armor', 'climbing-kit', 'rope-50-ft', 'adventurers-pack'],
    reasoning: {
      boosts: "[[dexterity|Dexterity]] for ranged attacks and [[armor-class|AC]]. [[wisdom|Wisdom]] backs [[perception|Perception]] (yours is high) and [[nature|Nature]]. [[constitution|Constitution]] for [[hit-points|HP]]. [[strength|Strength]] as a fourth if you want melee options.",
      skills: "[[nature|Nature]] + [[survival|Survival]] are core Ranger flavor — track prey, identify creatures, navigate the wilds. [[stealth|Stealth]] pairs with Hunt Prey for ambushes — the first attack often crits when you're hidden.",
      classFeats: "Hunted Shot — make two ranged [[strike|Strikes]] against your hunted prey for the cost of one [[action]]. Highest [[three-action-economy|action economy]] at [[level]] 1 for any ranged Ranger. Trades the second shot's accuracy for tempo.",
      spells: null,
      startingItems: "Longbow + 20 arrows: your primary weapon. Shortsword for when something closes. Studded Leather for [[armor-class|AC]] without slowing [[stealth|Stealth]]. Climbing Kit and Rope for the wilderness work you'll be doing.",
    },
  },
  rogue: {
    rationale: "Skills and mobility. Dexterity for everything, Charisma or Intelligence depending on racket, Constitution for HP.",
    boosts: { free: ['dex', 'cha', 'con', 'wis'] },
    skills: ['stealth', 'thievery', 'acrobatics', 'society'],
    classFeats: { 1: ['nimble-dodge'] },
    spells: null,
    startingItems: ['rapier', 'shortbow-20-arrows', 'leather-armor', 'thieves-toolkit', 'dagger', 'adventurers-pack'],
    reasoning: {
      boosts: "[[dexterity|Dexterity]] is the Rogue universal — [[armor-class|AC]], [[reflex|Reflex]], [[stealth|Stealth]], finesse weapons, and (for Thief racket) damage. [[charisma|Charisma]] if you're playing Scoundrel; [[intelligence|Intelligence]] if Mastermind. [[constitution|Constitution]] to survive when sneak attacks miss.",
      skills: "[[stealth|Stealth]] + [[thievery|Thievery]] are the headline Rogue [[skill|skills]]. [[acrobatics|Acrobatics]] for tumbling through enemy spaces (Tumble Through is a great [[level]]-1 trick). [[society|Society]] to pair with Mastermind's Recall Knowledge → off-guard combo.",
      classFeats: "Nimble Dodge — [[reaction]] +2 circumstance bonus to [[armor-class|AC]] against one attack. Trades nothing for the bonus; just a free defensive boost once per round.",
      spells: null,
      startingItems: "Rapier for finesse + d6 piercing. Shortbow for ranged sneak attacks. Leather Armor for [[stealth|Stealth]]. Thieves' Toolkit unlocks Pick Locks and Disable Devices.",
    },
  },
  barbarian: {
    rationale: "Damage and durability. Strength swings, Constitution survives, Dexterity for AC, Wisdom for Will saves.",
    boosts: { free: ['str', 'con', 'dex', 'wis'] },
    skills: ['athletics', 'intimidation'],
    classFeats: { 1: ['raging-intimidation'] },
    spells: null,
    startingItems: ['greataxe', 'hide-armor', 'javelin', 'adventurers-pack', 'rations-1-week'],
    reasoning: {
      boosts: "[[strength|Strength]] is the Barbarian's everything — damage, [[athletics|Athletics]], weapon swings during Rage. [[constitution|Constitution]] because Barbarian [[hit-points|HP]] is the highest in the game; you want the multiplier on a high base. [[dexterity|Dexterity]] for [[armor-class|AC]] since you can't wear heavy armor and Rage. [[wisdom|Wisdom]] for [[will|Will saves]] (mind effects shut your damage down).",
      skills: "[[athletics|Athletics]] for Grapple/Trip during Rage (still works even though Rage limits casting). [[intimidation|Intimidation]] pairs with Raging Intimidation — Demoralize as a [[free-action|free action]] while raging.",
      classFeats: "Raging Intimidation — Demoralize becomes a [[free-action|free action]] while you Rage and gain its skill bonus from [[intimidation|Intimidation]]. Lockdown opener: rage in, demoralize the boss to off-guard, then swing.",
      spells: null,
      startingItems: "Greataxe for d12 damage. Hide Armor (medium, since Barbarian Rage forbids armor heavier than medium). Javelin for the rare opening turn where you need a ranged attack before charging.",
    },
  },
  bard: {
    rationale: "Occult caster and support. Charisma drives spells. Dexterity for AC. Constitution to stay up while concentrating.",
    boosts: { free: ['cha', 'dex', 'con', 'wis'] },
    skills: ['performance', 'occultism', 'diplomacy'],
    classFeats: { 1: ['lingering-composition'] },
    spells: {
      cantrips: ['courageous-anthem', 'daze', 'light', 'shield', 'detect-magic'],
      first: ['fear', 'soothe'],
    },
    startingItems: ['rapier', 'leather-armor', 'musical-instrument-handheld', 'writing-set', 'adventurers-pack'],
    reasoning: {
      boosts: "[[charisma|Charisma]] is your [[spell-dc|spell DC]] and the source of Inspire Courage's +1. [[dexterity|Dexterity]] for [[armor-class|AC]] and [[reflex|Reflex]]. [[constitution|Constitution]] to keep concentrating through hits. [[wisdom|Wisdom]] for [[perception|Perception]] backup.",
      skills: "[[performance|Performance]] is the Bard signature — Inspire Courage scales with it and you'll use it to schmooze NPCs constantly. [[occultism|Occultism]] for [[spell]] identification. [[diplomacy|Diplomacy]] for the party-face role most Bards default into.",
      classFeats: "Lingering Composition — extend Inspire Courage to last 2 or 3 rounds with one extra [[action]], instead of having to recast it every turn. Frees up your [[three-action-economy|action economy]] for actual damage [[spell|spells]].",
      spells: "Inspire Courage: the [[cantrip]] you'll cast every fight; +1 to attack and damage for every ally in earshot, scales to +2 then +3 by [[level]] 7/15. Daze: low-damage cantrip with a stunning rider. Shield/Light/Detect Magic: standard utility. Fear: [[spell-rank|rank]]-1 frightened, weakens save DCs party-wide. Soothe: healing without divine magic.",
      startingItems: "Rapier for finesse + Cha-driven Bards. Leather Armor for [[armor-class|AC]] + [[stealth|Stealth]]. A musical instrument (your spellcasting focus). Writing Set for composing and downtime work.",
    },
  },
  druid: {
    rationale: "Primal caster. Wisdom drives spells. Constitution for survival. Dexterity for AC.",
    boosts: { free: ['wis', 'con', 'dex', 'str'] },
    skills: ['nature', 'survival'],
    classFeats: { 1: ['order-explorer'] },
    spells: {
      cantrips: ['ignition', 'light', 'detect-magic', 'shield', 'stabilize'],
      first: ['heal', 'soothe'],
    },
    startingItems: ['scimitar', 'sling-20-bullets', 'leather-armor', 'material-component-pouch', 'adventurers-pack'],
    reasoning: {
      boosts: "[[wisdom|Wisdom]] is your [[spell-dc|spell DC]] AND your [[perception|Perception]] — Druid is one of the few classes that doubles up there. [[constitution|Constitution]] to stay concentrating. [[dexterity|Dexterity]] for [[armor-class|AC]] since you can't wear metal armor (per druidic anathema). [[strength|Strength]] helps if you go Animal Order or Untamed Order and want to wrestle.",
      skills: "[[nature|Nature]] lets you identify [[primal]] threats and Recall Knowledge on beasts/plants/elementals. [[survival|Survival]] for Subsist and tracking. Both pair with [[wisdom|Wisdom]] (your [[key-ability|key ability]]).",
      classFeats: "Order Explorer — gain a [[feat]] from another order's list. Lets you splash one signature ability without committing to a multi-order build.",
      spells: "Produce Flame: ranged [[primal]] [[cantrip]], your bread-and-butter damage. Light/Detect Magic: utility. Shield: [[reaction]] [[armor-class|AC]]. Stabilize: save dying allies. Heal at [[spell-rank|rank]] 1: 30-ft burst healing. Soothe: emotion + healing.",
      startingItems: "Scimitar is the iconic Druid weapon (d6 slashing, finesse). Sling for ranged + cheap reload. Leather Armor (NO METAL — druid anathema). Material component pouch for casting.",
    },
  },
  sorcerer: {
    rationale: "Spontaneous caster. Charisma drives spells. Dexterity for AC. Constitution for staying up.",
    boosts: { free: ['cha', 'dex', 'con', 'wis'] },
    skills: ['arcana', 'deception'],
    classFeats: { 1: ['counterspell'] },
    spells: {
      cantrips: ['daze', 'light', 'detect-magic', 'shield', 'prestidigitation'],
      first: ['force-barrage', 'fear'],
    },
    startingItems: ['crossbow-20-bolts', 'dagger', 'material-component-pouch', 'adventurers-pack', 'healing-potion-minor'],
    reasoning: {
      boosts: "[[charisma|Charisma]] is your [[spell-dc|spell DC]] — non-negotiable. [[dexterity|Dexterity]] for [[armor-class|AC]]. [[constitution|Constitution]] for survival and concentration. [[wisdom|Wisdom]] for [[perception|Perception]] backup since Sorcerers aren't [[trained]] Perception by default.",
      skills: "[[arcana|Arcana]] for [[spell]] identification (most Sorcerer bloodlines key off [[arcane]]). [[deception|Deception]] fits the trickster fantasy and pairs with [[charisma|Charisma]].",
      classFeats: "Counterspell — react to an opponent's cast by spending one of your own [[spell-slot|spell slots]] of the same [[spell-rank|rank]]. Best used on critical enemy spells (Slow, Fear, AoE damage); your spell slots are precious, so save it for big moments.",
      spells: "Magic Missile: auto-hit force damage, scales by spending more [[action|actions]] in the same cast. Fear: [[spell-rank|rank]]-1 mental, weakens save DCs. Daze: scaling damage [[cantrip]] with a [[saving-throw|save]]. Shield: [[reaction]] [[armor-class|AC]], refreshes per round. Light/Prestidigitation: utility cantrips you'll lean on out of combat.",
      startingItems: "Crossbow for the rare turn you need to do mundane damage. Dagger as a backup. Material component pouch. Healing Potion for the inevitable 'I missed every [[spell]] and now I'm in melee' turn.",
    },
  },
  wizard: {
    rationale: "Prepared arcane caster. Intelligence drives spells. Constitution for staying up. Dexterity for AC.",
    boosts: { free: ['int', 'con', 'dex', 'wis'] },
    skills: ['arcana', 'society'],
    classFeats: { 1: ['reach-spell'] },
    spells: {
      cantrips: ['daze', 'light', 'detect-magic', 'shield', 'prestidigitation'],
      first: ['force-barrage', 'fear'],
    },
    startingItems: ['quarterstaff', 'dagger', 'spellbook-blank', 'writing-set', 'material-component-pouch', 'adventurers-pack'],
    reasoning: {
      boosts: "[[intelligence|Intelligence]] is your [[spell-dc|spell DC]] and your [[skill|skills]] budget — Wizards get bonus [[trained]] skills from a high [[intelligence|INT]]. [[constitution|Constitution]] to concentrate. [[dexterity|Dexterity]] for [[armor-class|AC]]. [[wisdom|Wisdom]] for [[will|Will saves]] (Wizards are trained, not [[expert]]).",
      skills: "[[arcana|Arcana]] to identify magic and Recall Knowledge on [[spell|spells]]/constructs. [[society|Society]] for the cosmopolitan polymath fantasy + bonus [[languages]] from [[intelligence|INT]].",
      classFeats: "Reach Spell — add 30 ft to a touch [[spell]]'s range, or 30 ft to any other spell. Lets you safely cast from second [[proficiency-rank|rank]] instead of getting interrupted.",
      spells: "Magic Missile: reliable auto-hit force damage. Fear: [[spell-rank|rank]]-1 control. Daze: [[cantrip]] damage with a [[will|Will save]] rider. Shield: [[reaction]] [[armor-class|AC]], the Wizard's mainstay defense. Light + Prestidigitation: utility you'll cast constantly.",
      startingItems: "Quarterstaff in case something closes (and as a focus). Dagger for emergencies. Spellbook (blank) — your most important item; it holds every [[spell]] you can prep. Writing Set for copying scrolls. Material component pouch.",
    },
  },
  witch: {
    rationale: "Patron-granted prepared caster. Intelligence drives spell DC. Constitution keeps you alive concentrating. Dexterity for initiative and AC.",
    boosts: { free: ['int', 'con', 'dex', 'wis'] },
    skills: ['occultism', 'nature'],
    classFeats: { 1: ['cauldron'] },
    spells: {
      cantrips: ['daze', 'light', 'detect-magic', 'shield', 'prestidigitation'],
      first: ['fear', 'soothe'],
    },
    startingItems: ['dagger', 'sling-20-bullets', 'material-component-pouch', 'writing-set', 'adventurers-pack'],
    reasoning: {
      boosts: "[[intelligence|Intelligence]] is your [[spell-dc|spell DC]], hex DC, and [[skill]] budget. [[constitution|Constitution]] because you'll be concentrating on hexes in melee range. [[dexterity|Dexterity]] for [[armor-class|AC]]. [[wisdom|Wisdom]] for [[will|Will saves]].",
      skills: "[[occultism|Occultism]] is the Witch default — your patron is [[occult]]-flavored (mostly), and you'll Recall Knowledge on spirits, fey, and supernatural creatures. [[nature|Nature]] pairs with the [[primal]]-patron path (Wilding Steward, Silence in Snow, Winter).",
      classFeats: "Cauldron — gain the Brew Potion [[skill-feat|skill feat]] for free and craft healing/utility potions during downtime. Niche but unique, and the [[three-action-economy|action economy]] is excellent (no daily prep cost).",
      spells: "Daze: [[cantrip]] with a [[will|Will]] rider. Shield: [[reaction]] [[armor-class|AC]]. Light + Detect Magic + Prestidigitation: utility. Fear: [[spell-rank|rank]]-1 mental control. Soothe: healing without burning a [[divine]] [[spell-slot|slot]] — Witches don't get heal, so soothe is your healer fallback.",
      startingItems: "Dagger + sling as your mundane backups. Material component pouch and writing set for casting. Your familiar handles spellbook duty for you, so no spellbook in the kit.",
    },
  },
  monk: {
    rationale: "Mobile martial. Strength or Dexterity for unarmed strikes. Constitution for HP. Wisdom for Perception and AC.",
    boosts: { free: ['str', 'dex', 'wis', 'con'] },
    skills: ['athletics', 'acrobatics'],
    classFeats: { 1: ['ki-strike'] },
    spells: null,
    startingItems: ['quarterstaff', 'shortbow-20-arrows', 'climbing-kit', 'rope-50-ft', 'adventurers-pack'],
    reasoning: {
      boosts: "[[strength|Strength]] for unarmed damage, OR [[dexterity|Dexterity]] if you want to lead with finesse [[strike|strikes]]. [[wisdom|Wisdom]] is unique to Monk — adds to [[armor-class|AC]] when unarmored, plus [[perception|Perception]]. [[constitution|Constitution]] for [[hit-points|HP]].",
      skills: "[[athletics|Athletics]] is the Monk core — most martial Monk [[feat|feats]] (Flurry of Blows, Trip, Grapple) key off it. [[acrobatics|Acrobatics]] for Tumble Through (move freely through enemy spaces — the Monk's signature mobility).",
      classFeats: "Ki Strike — spend a [[focus-pool|focus point]] to make an extra unarmed [[strike]] at a -5 [[multiple-attack-penalty|MAP]] penalty AND add force/positive/negative damage. The Monk's first '[[spell]]' — saves itself with [[refocus|Refocus]].",
      spells: null,
      startingItems: "Quarterstaff if you want a weapon backup (still a Monk weapon). Shortbow for range. Climbing Kit + Rope because Monk movement options are the headline class feature.",
    },
  },
  // Remaining classes from the SRD import — boost spread + a starter
  // skill set. Class-feat and spell defaults stay TODO until the
  // catalog joins finalize for each one; the recommended button shows
  // for the sections that are filled.
  alchemist: {
    rationale: "Bomb thrower. Intelligence drives DC, Dexterity for ranged attacks and AC, Constitution for HP, Wisdom for Perception.",
    boosts: { free: ['int', 'dex', 'con', 'wis'] },
    skills: ['crafting', 'medicine'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "[[intelligence|INT]] is everything for an Alchemist — your [[class-dc|Class DC]] for splash damage, your Crafting checks for making items, and the size of your daily reagent pool all scale off it. Push INT to 18 at level 1, then take [[constitution|CON]] to 14 for [[hit-points|HP]] (your concoctions sometimes splash you), and [[dexterity|DEX]] to 14 for [[armor-class|AC]] since you're in light armor.",
      skills: "[[crafting|Crafting]] is non-negotiable — Alchemical Crafting is what unlocks daily reagent prep. [[medicine|Medicine]] pairs well, especially for Bombers carrying healing elixirs. [[thievery|Thievery]] for handling delicate situations and [[survival|Survival]] for foraging components round out the kit.",
      classFeats: "Quick Bomber at level 1 lets you draw and throw a bomb as a single [[action|action]] instead of two — huge for action economy. Calculated Splash boosts your splash damage with your INT modifier. Far Lobber extends your bomb range past the default 20 ft.",
      spells: null,
      startingItems: "The Alchemist [[class-kit|class kit]] covers your formula book, starting reagents, and a sturdy bandolier. Round it out with a simple weapon (a dagger for backup) and studded leather for some AC without slowing you down.",
    },
  },
  investigator: {
    rationale: "INT-based skill specialist. Intelligence drives Devise a Stratagem, Dexterity for AC, Constitution for HP.",
    boosts: { free: ['int', 'dex', 'con', 'wis'] },
    skills: ['society', 'stealth', 'thievery'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "[[intelligence|INT]] is everything — Devise a Stratagem rolls off INT, your [[class-dc|Class DC]] uses INT, your extra trained skills come from INT. Max it to 18. [[dexterity|DEX]] to 14 for [[armor-class|AC]] and Reflex. [[constitution|CON]] to 14 for [[hit-points|HP]].",
      skills: "[[society|Society]] is your signature — research, decipher writing, Recall Knowledge on civilization. [[stealth|Stealth]] for shadowing suspects. Your methodology grants a third skill at [[expert|Expert]] (Forensic = [[medicine|Medicine]], Empiricism = a Lore, Interrogation = [[intimidation|Intimidation]]). [[deception|Deception]] or [[diplomacy|Diplomacy]] for working sources.",
      classFeats: "That's Odd at level 1 lets you spot something off about a scene. Strategic Strike upgrades your damage when you act on a Devised Stratagem. Clue In shares your investigative bonus with the party.",
      spells: null,
      startingItems: "Investigator [[class-kit|kit]] includes a formulary, a magnifying glass for clue-spotting, and a rapier or hand crossbow (your call — rapier for melee, hand crossbow for ranged). Studded leather rounds out the loadout.",
    },
  },
  swashbuckler: {
    rationale: "Charisma-driven martial. Dexterity for AC and attacks, Charisma for panache and class DC, Constitution for HP.",
    boosts: { free: ['dex', 'cha', 'con', 'wis'] },
    skills: ['acrobatics', 'performance'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "[[charisma|CHA]] is your [[key-ability|key ability]] for [[class-dc|Class DC]] AND your finisher math. [[dexterity|DEX]] to 18 for attacks and [[armor-class|AC]]. Push CHA to 16-18 too. [[constitution|CON]] to 12-14 for [[hit-points|HP]] — Swashbucklers are squishier than most martials.",
      skills: "[[acrobatics|Acrobatics]] is core — Tumble Through generates panache for many styles. [[performance|Performance]] if you're a Battledancer (panache through art). [[diplomacy|Diplomacy]] or [[intimidation|Intimidation]] depending on whether you charm or threaten your way through scenes. Style-specific picks round out the kit.",
      classFeats: "Confident Finisher at level 1 is your iconic move — a powerful [[strike|Strike]] that consumes panache. Opportune Riposte for reactive defense. Style-specific feats (One for All, Goading Feint, etc.) unlock your subclass's signature flavor.",
      spells: null,
      startingItems: "Swashbuckler [[class-kit|kit]] gives you a rapier or other agile weapon (agile is huge — reduced [[multiple-attack-penalty|MAP]] on follow-up strikes), light armor, and fashionable clothes for the social half of the class. Picking a one-handed weapon leaves your off hand free for buckler or showmanship.",
    },
  },
  magus: {
    rationale: "Spellstrike hybrid. Strength or Dexterity for weapon, Intelligence for spells, Constitution for HP.",
    boosts: { free: ['str', 'int', 'con', 'dex'] },
    skills: ['arcana', 'athletics'],
    classFeats: null,
    spells: {
      cantrips: ['shield', 'detect-magic', 'light', 'prestidigitation', 'electric-arc'],
      first: ['force-barrage', 'fear'],
    },
    reasoning: {
      boosts: "Magus needs both martial and casting investment. [[strength|STR]] or [[dexterity|DEX]] for your weapon (pick by Hybrid Study — Inexorable Iron = STR, Starlit Span = DEX), AND [[intelligence|INT]] to 16-18 for [[spell-dc|spell DC]] and Spellstrike scaling. [[constitution|CON]] to 14 for [[hit-points|HP]] — you'll be in melee a lot.",
      skills: "[[arcana|Arcana]] for identifying spells and Recall Knowledge on arcane creatures. [[athletics|Athletics]] for melee maneuvers if STR-based, [[acrobatics|Acrobatics]] for DEX-based. [[intimidation|Intimidation]] or [[society|Society]] for social work.",
      classFeats: "Cascade Countermeasure at level 1 if you took Inexorable Iron. Other Hybrid Study feats expand your signature Spellstrike combo. Force Bolt feats for ranged options.",
      spells: "You're a [[prepared-casting|prepared]] [[arcane|arcane]] caster, but with a tiny spell pool — make every slot count. [[cantrip|Cantrips]]: Shield (mandatory — your reactive defense), Telekinetic Projectile, Electric Arc. First-rank [[spell|spells]] for your slots: True Strike (huge with Spellstrike), Magic Missile, Force Barrage.",
      startingItems: "Magus [[class-kit|kit]] includes a martial weapon (longsword/bastard sword for STR, rapier for DEX), spellbook, and medium armor (or light if you went DEX). Component pouch for spellcasting.",
    },
  },
  inventor: {
    rationale: "Innovator. Intelligence for DC, Dexterity for AC, Constitution for HP and Overdrive.",
    boosts: { free: ['int', 'dex', 'con', 'str'] },
    skills: ['crafting', 'society'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "[[intelligence|INT]] is your [[key-ability|key ability]] — your innovation, [[crafting|Crafting]] checks, and [[class-dc|Class DC]] all scale off it. Max to 18. [[constitution|CON]] to 14 for [[hit-points|HP]]. [[dexterity|DEX]] to 14 for [[armor-class|AC]] if your innovation isn't doing the work for you.",
      skills: "[[crafting|Crafting]] is mandatory — it's how you tinker with your innovation. [[society|Society]] for tactical and scholarly know-how. [[thievery|Thievery]] for handling delicate mechanisms beyond your own.",
      classFeats: "Megaton Strike at level 1 channels innovation power into a heavy hit. Searing Restoration for self-repair on construct or armor innovations. Innovation-specific feats define your build path (weapon, armor, construct).",
      spells: null,
      startingItems: "Inventor [[class-kit|kit]] centers on your innovation (weapon/armor/construct — your level-1 choice). Tools for tinkering, light armor if your innovation isn't already protective, and a basic ranged weapon for variety.",
    },
  },
  gunslinger: {
    rationale: "Firearms specialist. Dexterity for everything, Constitution for HP, Wisdom for Perception.",
    boosts: { free: ['dex', 'con', 'wis', 'str'] },
    skills: ['acrobatics', 'stealth'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "[[dexterity|DEX]] is your [[key-ability|key ability]] for everything — firearm attacks, [[armor-class|AC]], [[reflex|Reflex]]. Max it to 18. [[constitution|CON]] to 14 for [[hit-points|HP]]. [[wisdom|WIS]] to 12-14 matters more than you'd think — high [[perception|Perception]] for [[initiative|initiative]] lets you go first and get off shots before melee closes.",
      skills: "[[stealth|Stealth]] for snipers and approach work. [[crafting|Crafting]] for gunsmithing and ammo. [[acrobatics|Acrobatics]] for positioning. Way-specific skills (Pistolero = [[intimidation|Intimidation]], Vanguard = [[athletics|Athletics]], Sniper = [[stealth|Stealth]] even harder).",
      classFeats: "Way-specific feats (Drifter's Juke, Pistolero's Riposte, Sniper's Aim, Vanguard's Shove) define your subclass. Black Powder Boost amplifies your firearm damage. Munitions Crafter at later levels for self-sufficiency.",
      spells: null,
      startingItems: "Gunslinger [[class-kit|kit]] includes your starting firearm (way-determined — pistol, musket, jezail, blunderbuss), powder, ammunition, and light armor. Always carry a melee backup — reload times leave you vulnerable.",
    },
  },
  kineticist: {
    rationale: "Elemental Blast specialist. Constitution drives Impulse DC. Dexterity for AC, Wisdom for Perception.",
    boosts: { free: ['con', 'dex', 'wis', 'str'] },
    skills: ['nature', 'athletics'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "[[constitution|CON]] is your [[key-ability|key ability]] — your kinetic gate and [[class-dc|Class DC]] both run off it, AND it boosts your [[hit-points|HP]]. Double-dip. Max to 18. [[dexterity|DEX]] to 14 for [[armor-class|AC]] and [[reflex|Reflex]]. [[strength|STR]] to 12-14 if you took an Earth or Water gate (those love melee blasts).",
      skills: "Element-specific picks — Air loves [[acrobatics|Acrobatics]], Earth loves [[athletics|Athletics]], Fire loves [[intimidation|Intimidation]], Water loves [[stealth|Stealth]] or [[diplomacy|Diplomacy]], Wood loves [[medicine|Medicine]], Metal loves [[crafting|Crafting]]. [[nature|Nature]] and [[survival|Survival]] are universally useful for elemental flavor.",
      classFeats: "Element-specific impulse feats are your bread and butter — pick the impulses that match your gate's role (control, damage, support, mobility). Gate Attenuator unlocks at later levels for cross-element flexibility.",
      spells: null,
      startingItems: "Kineticist [[class-kit|kit]] is minimal — your impulses are your primary weapons. Light armor or unarmored (your gate's element may grant defensive resonance), a simple backup weapon, and element-specific reagents (an elemental focus stone for your gate).",
    },
  },
  psychic: {
    rationale: "Spontaneous occult caster with amped cantrips. Intelligence or Charisma drives DC, Constitution for staying up.",
    boosts: { free: ['int', 'con', 'dex', 'wis'] },
    skills: ['occultism', 'arcana'],
    classFeats: null,
    spells: {
      cantrips: ['daze', 'detect-magic', 'light', 'shield', 'prestidigitation'],
      first: ['fear', 'soothe'],
    },
    reasoning: {
      boosts: "Pick [[intelligence|INT]] (cerebral) or [[charisma|CHA]] (emotional) as your [[key-ability|key ability]] based on conscious mind subclass — both work for [[spell-dc|spell DC]]. [[constitution|CON]] to 14 for [[hit-points|HP]] (Psychics are fragile). [[dexterity|DEX]] to 14 for [[armor-class|AC]] in light or no armor.",
      skills: "[[occultism|Occultism]] is essential — your spells are [[occult|occult]], and you'll Recall Knowledge constantly on mind-affecting creatures. [[diplomacy|Diplomacy]] or [[intimidation|Intimidation]] depending on social style. [[society|Society]] for esoteric scholarship.",
      classFeats: "Amped cantrip feats are signature — they spend a [[focus-spell|focus]] point to amplify your [[cantrip|cantrips]] into combat-grade attacks. Conscious Mind feats expand your subclass's specific powers.",
      spells: "[[spontaneous-casting|Spontaneous]] [[occult|occult]] caster with a tiny pool of leveled slots but a strong cantrip-amp loop. [[cantrip|Cantrips]]: Daze (signature — pairs with Amp), Telekinetic Hand, Guidance. First-rank [[spell|spells]]: Phantom Pain, Soothe, plus one tradition-flavored utility pick.",
      startingItems: "Psychic kit is minimal — light armor or unarmored (your cantrips do the work, not your gear), a simple backup weapon, and a focus object that anchors your psychic power.",
    },
  },
  thaumaturge: {
    rationale: "Esoteric implements. Charisma drives DC, Dexterity for AC, Constitution for HP.",
    boosts: { free: ['cha', 'dex', 'con', 'wis'] },
    skills: ['occultism', 'religion'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "[[charisma|CHA]] is your [[key-ability|key ability]] — Esoteric Lore checks and [[class-dc|Class DC]] both depend on it. Max to 18. [[constitution|CON]] to 14 for [[hit-points|HP]]. [[dexterity|DEX]] to 14 for [[armor-class|AC]].",
      skills: "Esoteric [[lore|Lore]] is your signature — auto-trained, lets you Recall Knowledge on virtually any creature with the right framing. [[religion|Religion]], [[occultism|Occultism]], [[arcana|Arcana]], [[nature|Nature]] — the more broad-knowledge skills you train in, the more your Exploit Vulnerability lands. [[diplomacy|Diplomacy]] for social work with the supernatural.",
      classFeats: "Diverse Lore at level 1 lets you sub Esoteric Lore for any other knowledge skill — huge. Implement-specific feats (Amulet, Bell, Chalice, Lantern, Mirror, Regalia, Tome, Wand, Weapon) define your subclass.",
      spells: null,
      startingItems: "Thaumaturge [[class-kit|kit]] includes your primary implement (the heart of your power — pick by subclass), a martial weapon, and light or medium armor. Carry a charm or trinket pouch for esoterica — minor magical reagents you'll consume during Exploit Vulnerability.",
    },
  },
  oracle: {
    rationale: "Spontaneous divine caster. Charisma drives DC, Constitution for staying up, Dexterity for AC.",
    boosts: { free: ['cha', 'con', 'dex', 'wis'] },
    skills: ['religion', 'medicine'],
    classFeats: null,
    spells: {
      cantrips: ['guidance', 'shield', 'light', 'stabilize', 'detect-magic'],
      first: ['heal', 'bless'],
    },
    reasoning: {
      boosts: "[[charisma|CHA]] is your [[key-ability|key ability]] for [[spell-dc|spell DC]] and revelation powers — max it to 18. [[constitution|CON]] to 14 because Oracle mysteries inflict curse damage on you when you cast certain spells, and you need the [[hit-points|HP]] cushion. [[wisdom|WIS]] to 12 for [[will|Will]] saves.",
      skills: "[[religion|Religion]] is mandatory — your mystery ties you to a divine power. [[diplomacy|Diplomacy]] for the social half of being a mystery-touched prophet. Your specific mystery grants a third skill (Battle Mystery = [[athletics|Athletics]], Bones Mystery = [[medicine|Medicine]], Cosmos Mystery = [[nature|Nature]], and so on).",
      classFeats: "Domain Acumen gives you a domain spell tied to your mystery — pick early. Revelation feats expand your mystery's signature powers and are the single biggest source of class identity.",
      spells: "You're a [[spontaneous-casting|spontaneous]] [[divine|divine]] caster. [[cantrip|Cantrips]] to grab: Guidance (party support), Stabilize (downed-ally insurance), Light. First-rank [[spell|spells]] for your repertoire: Heal (always), Bless, Shield, and one offensive option like Harm or Spirit Strike depending on mystery flavor.",
      startingItems: "Oracle [[class-kit|kit]] includes a religious symbol of your divine source, a simple weapon, and light armor. The religious symbol matters — many spells require it as a focus.",
    },
  },
  animist: {
    rationale: "Primal vessel caster. Wisdom drives spells. Constitution for HP, Charisma for diplomacy.",
    boosts: { free: ['wis', 'con', 'cha', 'dex'] },
    skills: ['nature', 'religion'],
    classFeats: null,
    spells: {
      cantrips: ['guidance', 'ignition', 'light', 'shield', 'stabilize'],
      first: ['heal', 'soothe'],
    },
    reasoning: {
      boosts: "[[wisdom|WIS]] is your [[key-ability|key ability]] for both [[spell-dc|spell DC]] and apparition powers — max it to 18. [[constitution|CON]] to 14 for survivability since apparitions can put you in messy positions, plus [[dexterity|DEX]] to 14 for [[armor-class|AC]] in light armor.",
      skills: "[[religion|Religion]] is core — your apparitions are spiritual entities, and you'll be Recalling Knowledge on them constantly. [[nature|Nature]] supports your [[primal|primal]] spell side. [[diplomacy|Diplomacy]] for the social work that often comes with spiritual mediation; [[intimidation|Intimidation]] if you lean confrontational.",
      classFeats: "Channeler's Stance at level 1 turns one of your apparitions into a passive buff. Additional Apparition feats let you collect more spiritual partners — pick to match your party's needs (combat support, healing, control).",
      spells: "You cast both [[divine|divine]] and [[primal|primal]] spells through your apparitions, which is unusual and powerful. [[cantrip|Cantrips]] to grab: Guidance for party buff support, Tangle Vine for primal battlefield control, Telekinetic Hand for utility. First-rank [[spell|spells]]: Heal (always), Bless, Sure Strike for ally support.",
      startingItems: "Animist kit gives you a spiritual vessel for your primary apparition, a simple weapon, and light armor. The vessel matters — it's where you funnel apparition power, so don't lose it.",
    },
  },
  summoner: {
    rationale: "You + your eidolon. Charisma drives the bond, Constitution for shared HP, Dexterity for AC.",
    boosts: { free: ['cha', 'con', 'dex', 'wis'] },
    skills: ['arcana', 'nature'],
    classFeats: null,
    spells: {
      cantrips: ['shield', 'light', 'detect-magic', 'prestidigitation', 'guidance'],
      first: ['fear', 'soothe'],
    },
    reasoning: {
      boosts: "[[charisma|CHA]] is your [[key-ability|key ability]] for [[spell-dc|spell DC]] and eidolon math — max it to 18. [[constitution|CON]] to 14 because your eidolon shares your [[hit-points|HP]] pool — every HP you lose, the eidolon loses too. [[dexterity|DEX]] to 14 for your own [[armor-class|AC]] (the eidolon handles its own AC differently).",
      skills: "Your eidolon's traits influence skill picks — astral eidolons love [[occultism|Occultism]], fey eidolons love [[nature|Nature]], etc. [[diplomacy|Diplomacy]] for the dual-personality social dynamic. [[athletics|Athletics]] if your eidolon is a frontline brawler.",
      classFeats: "Tandem Strike at later levels lets you and your eidolon attack the same target with combined action economy. Eidolon-specific feats (varied by Boost choice) shape your partner's combat style.",
      spells: "Spontaneous caster with your tradition determined by eidolon type (Angel = [[divine|divine]], Beast = [[primal|primal]], Construct = [[arcane|arcane]], etc.). [[cantrip|Cantrips]]: Guidance, Detect Magic, plus one offensive option. First-rank [[spell|spells]]: Heal or equivalent + buffs to make your eidolon scarier (Sure Strike, Bless).",
      startingItems: "Summoner kit is lean — light armor, a simple weapon for backup. Your eidolon does the heavy lifting in combat, so spend gold on consumables and ritual focus rather than personal gear.",
    },
  },
  exemplar: {
    rationale: "Mythic martial. Strength for melee, Constitution for HP, Charisma for divine resonance.",
    boosts: { free: ['str', 'con', 'cha', 'dex'] },
    skills: ['athletics', 'religion'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "Your [[key-ability|key ability]] depends on your chosen ikon path — [[strength|STR]] for Cataphract-style martial focus, [[dexterity|DEX]] for nimble ikon paths, sometimes [[charisma|CHA]] for divine-charisma builds. Always max your key ability. [[constitution|CON]] to 14 for [[hit-points|HP]].",
      skills: "[[religion|Religion]] is essential — you're divinely blooded and Recall Knowledge on outer planes constantly. [[athletics|Athletics]] for martial maneuvers. [[diplomacy|Diplomacy]] or [[society|Society]] depending on your character's role in mortal politics.",
      classFeats: "Ikon-specific feats are your meat — pick the ones that interact with your chosen ikon. Spark of Iruxi grants divine sparkle to your strikes. Lessons of Divinity at later levels unlock godlike utility.",
      spells: null,
      startingItems: "Exemplar kit centers on your starting ikon weapon — that's the divine vessel everything else builds around. Pair with medium armor and a religious symbol for ritual work.",
    },
  },
  commander: {
    rationale: "Tactical leader. Strength or Dexterity for personal weapon, Intelligence for tactics, Constitution for HP.",
    boosts: { free: ['str', 'int', 'con', 'wis'] },
    skills: ['society', 'warfare-lore'],
    classFeats: null,
    spells: null,
    reasoning: {
      boosts: "Pick [[strength|STR]] (Frontline) or [[intelligence|INT]] (Strategist) based on your subclass — both work for [[class-dc|Class DC]]. [[constitution|CON]] to 14 since you're usually near the action issuing orders. [[charisma|CHA]] to 12-14 helps your social leadership feel natural.",
      skills: "[[diplomacy|Diplomacy]] for commanding allies and negotiating during exploration. [[intimidation|Intimidation]] for commanding enemies (Demoralize stacks with your tactical debuffs). [[athletics|Athletics]] for frontline maneuvers. [[society|Society]] gives you the tactical lore for Recall Knowledge on military matters.",
      classFeats: "Drilled Reactions at level 1 lets allies act with extra polish under your orders. Tactical Expertise grants bonuses to your commands. Lead by Example synergizes when you Strike alongside your allies.",
      spells: null,
      startingItems: "Commander [[class-kit|kit]] gives you a martial weapon, medium or heavy armor depending on subclass, and a banner or signet for tactical authority. The banner matters mechanically for some abilities — don't skip it.",
    },
  },
};

// Subclass-aware spell recommendations. Keyed by class slug → subclass
// id → spell list. Override applies only to the .spells field; other
// recommendation sections (boosts, skills, classFeats, startingItems)
// stay class-wide because they don't vary with subclass at level 1.
//
// Covers the cases where subclass selection materially changes the
// recommended spell list — primarily classes whose subclass determines
// spell tradition. Other classes can fall through to the class-wide
// .spells when no override is registered for the selected subclass.
export const SPELLS_BY_SUBCLASS = {
  // Sorcerer bloodlines — each picks a tradition; cantrip and first-rank
  // recs match the tradition's signature staples.
  sorcerer: {
    'bloodline-aberrant':  { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['fear','phantom-pain'] },
    'bloodline-angelic':   { cantrips: ['guidance','light','detect-magic','shield','stabilize'],          first: ['bless','heal'] },
    'bloodline-demonic':   { cantrips: ['guidance','light','detect-magic','shield','divine-lance'],        first: ['fear','harm'] },
    'bloodline-diabolic':  { cantrips: ['guidance','light','detect-magic','shield','ignition'],            first: ['charm','fear'] },
    'bloodline-draconic':  { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['force-barrage','fear'] },
    'bloodline-elemental': { cantrips: ['light','detect-magic','electric-arc','tangle-vine','stabilize'],  first: ['sure-strike','heal'] },
    'bloodline-fey':       { cantrips: ['light','detect-magic','electric-arc','tangle-vine','stabilize'],  first: ['charm','heal'] },
    'bloodline-hag':       { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['fear','soothe'] },
    'bloodline-imperial':  { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['force-barrage','sure-strike'] },
    'bloodline-undead':    { cantrips: ['guidance','light','detect-magic','shield','void-warp'],           first: ['harm','fear'] },
    'bloodline-aesir':     { cantrips: ['guidance','light','detect-magic','shield','stabilize'],           first: ['bless','heal'] },
  },
  // Witch patrons — patron determines tradition. Same logic as Sorcerer.
  witch: {
    'faiths-flamekeeper': { cantrips: ['guidance','light','detect-magic','shield','stabilize'],          first: ['bless','heal'] },
    'the-inscribed-one':  { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['force-barrage','fear'] },
    'the-resentment':     { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['fear','soothe'] },
    'silence-in-snow':    { cantrips: ['light','detect-magic','electric-arc','tangle-vine','stabilize'],  first: ['gust-of-wind','heal'] },
    'spinner-of-threads': { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['sure-strike','soothe'] },
    'starless-shadow':    { cantrips: ['daze','light','detect-magic','shield','telekinetic-projectile'], first: ['fear','soothe'] },
    'wilding-steward':    { cantrips: ['light','detect-magic','electric-arc','tangle-vine','stabilize'],  first: ['summon-animal','heal'] },
    'devourer-of-decay':  { cantrips: ['light','detect-magic','electric-arc','tangle-vine','stabilize'],  first: ['enfeeble','heal'] },
    'ripple-in-the-deep': { cantrips: ['light','detect-magic','electric-arc','tangle-vine','stabilize'],  first: ['dizzying-colors','heal'] },
    'whisper-of-wings':   { cantrips: ['light','detect-magic','electric-arc','tangle-vine','stabilize'],  first: ['gentle-landing','heal'] },
  },
};

export function getRecommended(classSlug, subclassId) {
  const base = RECOMMENDED_BUILDS[classSlug] || null;
  if (!base || !subclassId) return base;
  const override = SPELLS_BY_SUBCLASS[classSlug]?.[subclassId];
  if (!override) return base;
  // Shallow-merge: override only the .spells field, leave the rest of
  // the recommendation untouched (boosts, skills, classFeats, etc.).
  return { ...base, spells: { ...base.spells, ...override } };
}

// Normalize a display name to the kebab-case slug form used in
// `startingItems` so the shop can match its entries against the
// recommendation list without forcing a separate slug field on each
// catalog item.
export function itemSlug(displayName) {
  return String(displayName || '')
    .toLowerCase()
    .trim()
    // strip parentheticals before slugifying — "(minor)" / "(50 ft)"
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/[+×]/g, '-')
    .replace(/[\s_,/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Is `item` recommended for the chosen class? Two paths:
 *   1. Direct slug match against `startingItems` in the class's
 *      recommendation entry.
 *   2. Weapon-proficiency backstop: if the item is a weapon and the
 *      class has at least Trained in that weapon category, count it
 *      as "viable" — broader than the curated list but useful for
 *      classes without a curated entry.
 */
export function isRecommendedForClass(item, classData) {
  if (!item || !classData) return false;
  const rec = getRecommended(classData.slug);
  if (rec?.startingItems?.length) {
    const slug = itemSlug(item.name);
    if (rec.startingItems.includes(slug)) return true;
  }
  // Backstop: weapon category proficiency. The catalog doesn't carry
  // a `category` field today, so this only fires once item records
  // gain one (post-equipment-import wiring).
  const category = item.category || item.weaponCategory;
  if (category) {
    const profRank = classData.proficiencies?.weapons?.[category] ?? 0;
    if (profRank >= 1) return true;
  }
  return false;
}
