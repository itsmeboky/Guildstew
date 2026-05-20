// Helpful Tip content per class. Aimed at first-time PF2e players.
// complexity: 'easy' | 'intermediate' | 'advanced' | 'master'
// tip: a string surfaced in StepClass's HelpfulTip panel. May contain
//      inline [[slug]] markers parsed by AnnotatedText against the
//      foundational glossary.
//
// Keyed by the class slug (`CLASSES[*].slug` from the importer).

export const CLASS_TIPS = {
  // ─── Physical martial classes ───────────────────────────────────────────

  fighter: {
    complexity: 'easy',
    tip: "The undisputed master of weapons. 10 [[hit-points|HP]] per level, [[strength|STR]] or [[dexterity|DEX]] [[key-ability|key ability]] depending on weapon choice. Fighters start [[expert|Expert]] in their chosen weapon group at level 1 — every other class starts [[trained|Trained]] — and they're the only class that reaches [[legendary|Legendary]] in martial weapons by level 13. Attack of Opportunity at level 1 (most classes pay a feat for it). The class's signature is the highest critical hit rate in the game; the 'attack roll meets DC + 10 = crit' rule means a Fighter with their key weapon is critting far more often than anyone else.\n\nPlays as the iconic combat virtuoso — flexible weapon options (pick a different weapon group at each subclass tier), excellent at locking down a battlefield. Pairs well with any party as the reliable damage anchor.\n\nBest for players who want to be undeniably good at fighting without managing daily spell prep or complex resource pools. Skip if you want non-combat focus or magic — Fighter is laser-focused on combat excellence.",
  },
  barbarian: {
    complexity: 'easy',
    tip: "The frontline berserker. 12 [[hit-points|HP]] per level (top tier), [[strength|STR]] [[key-ability|key ability]]. Instinct subclass shapes everything — Animal grants natural attacks and movement traits, Dragon grants breath weapons and damage type, Fury is pure rage stats, Giant grants reach and big-weapon mastery, Spirit channels ancestor power. Each Instinct sets your Rage damage type and signature ability.\n\nThe class's signature is Rage — spend an [[action]] to enter Rage, gain temporary [[hit-points|HP]] and a damage bonus, but lose access to most non-Rage skills. You're trading versatility for raw aggression while raging.\n\nPlays as the ultimate aggressive frontline — soak hits, deal heavy damage, intimidate. Pairs well with parties that need a heavy hitter; less ideal as a solo character since you're not great outside combat.\n\nBest for players who want simple-but-powerful combat where bigger numbers feel earned. Skip if you want subtlety, magic, or a class that lets you do skill-based things mid-combat — Rage locks down most of those options.",
  },
  monk: {
    complexity: 'intermediate',
    tip: "The unarmed striker. 10 [[hit-points|HP]] per level, [[strength|STR]] or [[dexterity|DEX]] [[key-ability|key ability]]. Monks fight with their bodies — fists, kicks, throws — and reach [[master|Master]] proficiency in unarmed strikes faster than any other martial. Stances are the signature mechanic: at level 1 you pick a fighting style (Crane, Dragon, Mountain, Tiger, Wolf, etc.) that changes your unarmed attack profile. Switching stances mid-combat is a tactical choice.\n\nMonks also have access to [[focus-spell|focus spells]] via Ki feats — small mystical abilities like Ki Strike for extra damage, Wholeness of Body for self-healing, or Wind Jump for vertical leaps. These run on a [[focus-pool|focus pool]] and refresh through [[refocus|Refocus]].\n\nThe class shines in mobility — high base [[speed|Speed]], reaction-based defensive options, ability to move through enemies. Pairs well with parties that benefit from a flexible skirmisher.\n\nBest for players who want acrobatic combat, Eastern-inspired styles, or a martial that mixes physical and mystical. Skip if you want heavy armor or two-handed weapon damage — Monk is light-armor + unarmed by design.",
  },
  ranger: {
    complexity: 'easy',
    tip: "The focused hunter. 10 [[hit-points|HP]] per level, [[strength|STR]] or [[dexterity|DEX]] [[key-ability|key ability]] (most Rangers go DEX for archery). Hunter's Edge subclass shapes combat: Flurry reduces the [[multiple-attack-penalty|MAP]] for follow-up attacks, Outwit grants skill bonuses against your Hunt Prey, Precision adds bonus damage to your first hit each round against your prey.\n\nHunt Prey is the signature mechanic — spend an [[action]] to mark a target, then gain Hunter's Edge benefits against it. Smart Rangers re-mark prey constantly; you don't lock into one target for the whole fight.\n\nOptional animal companion at level 1 via a [[class-feat|class feat]] (Cat, Dog, Hawk, Wolf, etc.) lets you fight with a partner. Companion progresses with you and can take its own actions.\n\nPairs well with any party as the reliable single-target damage dealer and wilderness scout. Plays well at any level since Hunt Prey scales with your progression.\n\nBest for players who like tactical martial play with an optional pet. Skip if you want spell-heavy magic — Ranger has some focus spells but is fundamentally a martial class.",
  },
  rogue: {
    complexity: 'easy',
    tip: "The skill specialist with deadly tactical strikes. 8 [[hit-points|HP]] per level, [[dexterity|DEX]] [[key-ability|key ability]] for most rackets. Racket subclasses define playstyle: Eldritch Trickster adds spellcasting, Mastermind trades combat for knowledge, Ruffian uses heavy armor + medium weapons, Scoundrel weaponizes Deception via Feint, Thief uses DEX for damage instead of STR.\n\nSneak Attack is the signature — extra damage when your target is off-guard (flanked, blinded, or otherwise compromised). Stacks with your weapon damage on every successful hit. By level 5+, Sneak Attack adds 2d6 every strike against off-guard enemies, which is significant.\n\nRogues have the highest [[skill]] count and progression in the game — they reach [[master|Master]] and [[legendary|Legendary]] in skills earlier than any other class. The party's investigator, scout, social face, and tactical disruptor.\n\nPairs well with any party that has a frontliner who can position enemies (the flanking partner). Solo Rogues struggle more than supported ones.\n\nBest for players who want utility + ambush damage. Skip if you don't want to manage positioning carefully — Sneak Attack requires setup every round.",
  },
  swashbuckler: {
    complexity: 'intermediate',
    tip: "The flashy duelist. 10 [[hit-points|HP]] per level, [[dexterity|DEX]] [[key-ability|key ability]] (with [[charisma|CHA]] also critical for [[class-dc|Class DC]] and Panache). Style subclasses determine how you generate Panache: Battledancer through Performance and Tumble Through, Braggart through Intimidation, Fencer through Acrobatics, Gymnast through Athletics, Wit through Diplomacy.\n\nPanache is the signature — a temporary status you gain through bold actions, then spend on a Finisher (a powerful damage move that ends the Panache state). The setup-payoff loop defines the class's combat rhythm.\n\nWhile you have Panache, you get a [[speed|Speed]] bonus and access to abilities like Opportune Riposte (a reactive strike). Losing it means setting up again — the cycle keeps you moving and engaging.\n\nPlays as the flashy combat showperson — every move has narrative weight, every Finisher feels like a duel-climax moment.\n\nPairs well with parties that benefit from mobile striker + social face. Less ideal if you want consistent turn-by-turn damage without setup.\n\nBest for players who want narrative-rich combat. Skip if you want low-effort damage — Swashbuckler is high-engagement by design.",
  },

  // ─── Divine / Protector classes ─────────────────────────────────────────

  champion: {
    complexity: 'easy',
    tip: "The divine protector. 10 [[hit-points|HP]] per level, [[strength|STR]] or [[dexterity|DEX]] [[key-ability|key ability]] (plus [[charisma|CHA]] for [[class-dc|Class DC]] and Lay on Hands). Cause subclasses set tenets and reactive abilities: Liberator (was Paladin — protects allies' freedom), Redeemer (gives enemies a chance to relent), Desecrator (anti-good divine), Glimmer, Justice, etc. Each Cause grants a unique Champion's Reaction triggered when an ally is harmed.\n\nLay on Hands is the iconic [[focus-spell|focus spell]] — touch heal an ally or harm undead. Refreshes through [[refocus|Refocus]]. Combined with the Reaction-based defense, Champion is the party's last line of protection.\n\nPlays as the iconic paladin/tank — soak hits up front, redirect damage from allies, heal in clutch moments. Pairs incredibly well with parties that have a squishy caster — Champion's [[reaction|Reaction]] can pull the caster out of a death spiral.\n\nBest for players who want to be the unbreakable defender + party medic. Skip if you want to be the primary damage dealer — Champion's offense is solid but not the focus.",
  },
  cleric: {
    complexity: 'easy',
    tip: "The divine caster. 8 [[hit-points|HP]] per level, [[wisdom|WIS]] [[key-ability|key ability]]. Doctrine subclasses: Cloistered Cleric (full caster, more [[spell-slot|spell slots]], lighter armor), Warpriest (caster-martial hybrid, heavier armor, trades some slots for combat ability).\n\nDeity choice matters mechanically — your god grants Domains ([[focus-spell|focus spells]]), a favored weapon (you train in it automatically), Anathema (actions that revoke your power), and Edicts (actions that strengthen it). Pick a god whose flavor matches your concept AND whose mechanical grants are useful.\n\nChannel Smite (Warpriest) and Healing/Harm Font (Cloistered) let you spend spell slots for big healing or damage. The Heal [[spell]] auto-prepared in every slot above level 1 — Clerics are the default party healer for a reason.\n\nPlays as the divine support-and-power source — heal allies, buff allies, smite enemies. Pairs with virtually any party; Clerics are the most universally useful class.\n\nBest for players who want primary healing duty plus divine flavor. Skip if you want to be a non-religious caster — Cleric is fundamentally about divine connection.",
  },
  oracle: {
    complexity: 'advanced',
    tip: "The mystery-touched caster. 8 [[hit-points|HP]] per level, [[charisma|CHA]] [[key-ability|key ability]]. Mystery subclasses (Battle, Bones, Cosmos, Flames, Life, Lore, Tempest, etc.) shape revelations and curse type — each mystery brings power AND a cost. Mystery curse damage triggers when you cast revelation spells, escalating as you cast more during a day.\n\nOracle is a [[spontaneous-casting|spontaneous]] [[divine]] caster — pick spells in the moment from your known repertoire. Revelation spells are mystery-specific [[focus-spell|focus spells]] that draw from a separate pool.\n\nThe curse mechanic is the signature trade-off — every time you tap deeper into your mystery, you accumulate curse damage. Pace yourself, or burn bright and crash. Oracle is the most thematically risk-reward class in the game.\n\nPlays as the prophet-touched caster who pays for power — high-impact moments balanced against the curse cost. Pairs well with parties that can absorb the cost of you going hard in clutch fights.\n\nBest for players who enjoy risk-reward dynamics and dramatic character arcs. Skip if you want a smooth, consistent magical output — Oracle is meant to feel risky.",
  },

  // ─── Primal / Nature classes ────────────────────────────────────────────

  druid: {
    complexity: 'intermediate',
    tip: "The nature caster. 8 [[hit-points|HP]] per level, [[wisdom|WIS]] [[key-ability|key ability]]. Order subclasses define focus: Animal (animal companion), Leaf (plant-themed, healing), Storm (weather and lightning), Untamed (shapeshifting), Wild (raw primal force). Each Order grants a unique order spell as a [[focus-spell|focus spell]] and specific feat options.\n\nDruids are [[prepared-casting|prepared]] [[primal]] casters — load specific spells into slots at dawn. The primal tradition emphasizes nature damage types, healing, summoning, and environmental control.\n\nOptional features depending on Order: Animal Order gets a full animal companion. Untamed Order gets Wild Shape for shapeshifting into specific beast forms (battle forms with their own stat blocks). Leaf Order gets enhanced healing. Storm Order gets weather-based attacks. Wild Order gets broad versatility.\n\nPlays as the versatile nature caster — healing, control, summoning, optional shapeshift. Pairs well with virtually any party.\n\nBest for players who want nature-themed magic AND (optional) shapeshifting. Skip if you're in a purely urban campaign — Druid's flavor leans heavily on natural world themes.",
  },

  // ─── Arcane / Intellectual classes ──────────────────────────────────────

  wizard: {
    complexity: 'intermediate',
    tip: "The arcane scholar. 6 [[hit-points|HP]] per level (low — Wizards are fragile), [[intelligence|INT]] [[key-ability|key ability]]. Arcane School subclasses (Battle, Boundary, Civic, Mentalism, Protean, Unified) grant curriculum spells and a school-specific [[focus-spell|focus spell]]. School choice shapes your daily prep menu.\n\nWizards are [[prepared-casting|prepared]] [[arcane]] casters with the largest known [[spell]] pool of any class — your spellbook is your toolkit. Add new spells through Learn a Spell (Crafting/INT-based), copy spells from scrolls, swap out daily preps each morning.\n\nThe signature trait: maximum spell versatility through daily preparation. A prepared Wizard with the right spell list can solve almost any problem, but you need to predict what's coming. Wizards who walk into a session with the wrong prep get punished hard.\n\nPlays as the iconic scholar-caster — versatility incarnate. Pairs well with parties that benefit from a magical solver.\n\nBest for players who love daily planning and tactical spell choice. Skip if you don't want to manage a spellbook and prep menu — Sorcerer is the simpler arcane alternative.",
  },
  witch: {
    complexity: 'advanced',
    tip: "The patron-bound caster. 6 [[hit-points|HP]] per level, [[intelligence|INT]] [[key-ability|key ability]]. Patron subclasses determine your [[spell-tradition|tradition]] AND your hex spells: Curse Bearer (occult), Faith's Flamekeeper (divine), Inscribed One (arcane), Mosquito Witch (occult), Resentment Witch (occult), Silence in Snow (primal), Spinner of Threads (occult), Starless Shadow (occult), Wilding Steward (primal), Winter Witch (primal).\n\nFamiliar is the signature feature — a magical helper that holds spells, communicates with the patron, and serves as a small combat ally. The familiar IS the patron connection; protect it.\n\nWitches are [[prepared-casting|prepared]] casters with a unique twist — hex [[cantrip|cantrips]] (specific subclass-themed offensive cantrips) and Familiar-based mechanics. Each Patron also grants a unique hex [[focus-spell|focus spell]] that runs on the [[focus-pool|focus pool]].\n\nPlays as the patron-flavored caster with intimate magical familiar. Pairs well with parties that benefit from focused single-target debuffs and unusual magical effects.\n\nBest for players who want flavored magic from a specific source. Skip if you want a generic caster or don't want to track a familiar.",
  },
  sorcerer: {
    complexity: 'intermediate',
    tip: "The blood-magic caster. 6 [[hit-points|HP]] per level, [[charisma|CHA]] [[key-ability|key ability]]. Bloodline subclasses determine your [[spell-tradition|tradition]] AND grant signature spells, blood magic effects, and a bloodline-specific [[focus-spell|focus spell]]: Angelic (divine), Demonic (divine), Draconic (arcane, varies by dragon), Elemental (primal, varies by element), Fey (primal), Hag (occult), Imperial (arcane), Phoenix (primal), Psychopomp (divine), Undead (divine), Wyrmblessed (arcane).\n\nSorcerers are [[spontaneous-casting|spontaneous]] casters with MORE daily [[spell-slot|slots]] than any other caster (the trade-off for a smaller known spell repertoire). You don't prepare specific spells; you pick what to cast in the moment from your known pool.\n\nBlood Magic effects trigger when you cast bloodline-tradition spells — small bonus effects like extra damage, temp HP for an ally, or environmental influence. They make every spell feel charged with bloodline flavor.\n\nPlays as the iconic innate caster — magic in your veins, consistent output. Pairs with any party as the reliable spell damage and utility source.\n\nBest for players who want consistent magical output. Skip if you want versatility — Wizard's broader spell list wins on flexibility.",
  },

  // ─── Support / Social classes ───────────────────────────────────────────

  bard: {
    complexity: 'intermediate',
    tip: "The party enabler. 8 [[hit-points|HP]] per level, [[charisma|CHA]] [[key-ability|key ability]]. Muse subclasses: Enigma (mystery-themed, learns new spells from observed phenomena), Maestro (classic music-themed support), Polymath (versatility-focused), Warrior (martial-ish bard).\n\nBard is a [[spontaneous-casting|spontaneous]] [[occult]] caster. The signature mechanic is Composition [[cantrip|cantrips]] and spells — magical performances that buff allies, debuff enemies, or both. Inspire Courage is the iconic level-1 cantrip — every ally near you gets a status bonus to attacks and damage while you sing.\n\nThis is the party support class. A Bard with Inspire Courage active is making the entire party noticeably more dangerous every round of combat. The Composition cantrips alone justify the class for almost any party.\n\nPlays as the iconic support-and-utility caster — buff allies, debuff enemies, social face, knowledge source. Pairs with virtually any party; Bards make everyone else better.\n\nBest for players who want to enable their teammates and feel like a force multiplier. Skip if you want to be the main damage dealer — Bard's strength is shared, not personal.",
  },
  commander: {
    complexity: 'master',
    tip: "The tactical leader. 8 [[hit-points|HP]] per level, [[intelligence|INT]] [[key-ability|key ability]]. Commander subclasses lean tactical or martial-tactical — verify the specific subclass list against your data file.\n\nThe signature mechanic is Tactic actions — issue orders that grant allies action-economy benefits. Reposition allies, grant them off-turn movement, set up attack opportunities. Your turn directs the party as much as your own actions.\n\nA Commander's individual damage is solid but not the focus — your impact comes from making the rest of the party more effective. A good Commander triples your party's effective tactical options.\n\nBattlecry! introduced the class; it's designed for war and large-scale conflict campaigns, with rules for commanding NPC troops and squads. Even in standard parties, the [[three-action-economy|action-economy]] manipulation works beautifully.\n\nPlays as the field marshal — your turn shapes everyone's turn. Pairs incredibly well with parties that have several martial characters to coordinate.\n\nBest for players who love party-wide tactics. Skip if you want solo damage focus — Commander is fundamentally a force multiplier.",
  },

  // ─── Investigative / Method classes ─────────────────────────────────────

  investigator: {
    complexity: 'intermediate',
    tip: "The cerebral detective-combatant. 8 [[hit-points|HP]] per level, [[intelligence|INT]] [[key-ability|key ability]]. Methodology subclasses: Empiricism (broad knowledge-based), Forensic Medicine ([[medicine|Medicine]]-focused, treating wounds and identifying poisons), Interrogation ([[intimidation|Intimidation]]-focused, breaking suspects).\n\nDevise a Stratagem is the signature mechanic — you 'pre-roll' your attack die against a target you've studied, then choose whether to use that roll or roll fresh. Solves the unreliable-low-roll problem that plagues other martials.\n\nStrategic Strike adds significant bonus damage when you act on a Devised Stratagem. Combined with the pre-roll, you essentially know whether you're going to land a big hit before committing the [[action]].\n\nClue In and That's Odd at level 1 add to the investigative flavor — gather information faster, spot anomalies your party misses.\n\nPlays as the cerebral combatant — every move is calculated, every attack is informed. Pairs well with parties that benefit from a tactical anchor + skill specialist.\n\nBest for players who love narrative deduction and tactical combat. Skip if you don't enjoy INT-frame storytelling — Investigator is the most overtly cerebral class.",
  },

  // ─── Item-using class ──────────────────────────────────────────────────

  alchemist: {
    complexity: 'master',
    tip: "The crafted-consumables specialist. 8 [[hit-points|HP]] per level, [[intelligence|INT]] [[key-ability|key ability]]. Research Field subclasses: Bomber (offensive alchemical bombs), Chirurgeon (healing-focused alchemy), Mutagenist (self-buffing mutagens), Toxicologist (poisons).\n\nThe signature mechanic is Alchemical Crafting — every morning you generate free alchemical items based on your reagent pool. Your reagents replenish daily. You're effectively a daily-prep caster who casts through items instead of spells. Quick Bomber at level 1 lets you draw+throw in a single [[action]].\n\nUnlike spell-prep casters, your 'preparations' are consumable items — you can hand bombs to allies, share elixirs, or store excess. Mutagens let you transform yourself for combat at the cost of side effects.\n\nPlays as the resource manager who turns daily prep into combat impact. Pairs well with parties that benefit from controllable consumable supply.\n\nBest for players who love consumables, daily resource cycles, and item-tracking. Skip if you want straightforward 'I attack' gameplay — Alchemist is fundamentally a complex resource class.",
  },

  // ─── Hybrid / Unique classes (HotW + Battlecry!) ────────────────────────

  animist: {
    complexity: 'advanced',
    tip: "The spirit-channeler. 8 [[hit-points|HP]] per level, [[wisdom|WIS]] [[key-ability|key ability]]. Apparition subclasses determine your patron spirits — each apparition grants unique [[focus-spell|focus spells]] and tradition flavor.\n\nAnimist is unusual in that it casts both [[divine]] AND [[primal]] spells through different apparitions. Your apparition determines which tradition any given spell pulls from. This dual-tradition flexibility is unique.\n\nThe signature mechanic is multiple apparitions — you 'attune' to several spirit partners and can shift focus between them. Each apparition is a portion of your power, and switching emphasis lets you adapt to scene needs (combat apparition for fighting, healing apparition for between fights, social apparition for negotiation).\n\nChanneler's Stance lets your primary apparition's presence stay active continuously, granting passive benefits.\n\nPlays as the flexible spirit-mediator — channel different presences for different scenes. Pairs well with parties that benefit from adaptable support and unusual tradition coverage.\n\nBest for players who want both casting flexibility AND a strong narrative thread (your spirit partners ARE your story). Skip if you don't want to track multiple apparition relationships.",
  },
  exemplar: {
    complexity: 'master',
    tip: "The mythic hero. 10 [[hit-points|HP]] per level, [[strength|STR]] or [[dexterity|DEX]] [[key-ability|key ability]] (chosen at character creation alongside your Ikon path). Ikon paths grant divinely-charged weapons, armor, and signature gear — your weapon IS a divine artifact you wield.\n\nThe class is built around 'epithets' (titles that mark your mythic role) and divine-charged abilities that scale with story significance. Battlecry! introduced the class for larger-than-life heroic fantasy.\n\nIkons grant [[focus-spell|focus spells]] — your divine-blooded warrior nature comes with both martial prowess AND mystical abilities. The focus spells are themed to your specific Ikon (Sword of Iruxi, Crown of the Stars, etc.).\n\nSpark of Iruxi at level 1 grants divine sparkle to your strikes — your weapon hits land with celestial weight.\n\nPlays as the legendary hero — your weapons are artifacts, your strikes carry divine significance, your story matters. Pairs well with story-focused campaigns where epic narrative arcs matter.\n\nBest for players who want big-arc hero stories with mythic flavor. Skip if you want subtle character — Exemplars are designed to be larger-than-life. The class is overtly heroic by design.",
  },

  // ─── OGL classes (kept as short tips until ORC scope decision) ──────────

  magus: {
    complexity: 'advanced',
    tip: "Mix spell and steel via Spellstrike — one action, one attack, one spell. Tight tempo gameplay with focus point management. Best for players who like resource puzzles.",
  },
  inventor: {
    complexity: 'advanced',
    tip: "Choose a research field (armor, construct, weapon). Modifications stack into a unique tactical signature. Mechanically dense — be ready to track Overdrive and Unstable.",
  },
  gunslinger: {
    complexity: 'advanced',
    tip: "Firearms specialist. Pick a way (Pistolero, Sniper, Triggerbrand, Vanguard, Drifter). Big damage, fragile defenses, positioning-dependent. Reload action management is core.",
  },
  kineticist: {
    complexity: 'advanced',
    tip: "Element-bender with no spell slots — Elemental Blasts are your bread and butter. Pick elements (Air, Earth, Fire, Metal, Water, Wood). Unlike any other caster, elegant when learned.",
  },
  psychic: {
    complexity: 'advanced',
    tip: "Spontaneous occult caster with amped cantrips. Pick a conscious mind + subconscious mind. Lower spell count than other casters, but cantrips hit harder.",
  },
  thaumaturge: {
    complexity: 'advanced',
    tip: "Esoteric occultist with implements (Amulet, Bell, Chalice, Lantern, Mirror, Regalia, Tome, Wand, Weapon). Lots of moving parts but unique flavor and powerful situational tricks.",
  },
  summoner: {
    complexity: 'master',
    tip: "You + your eidolon, shared HP pool, shared actions. Two characters in one — twice the work, twice the fun. Not for first PF2e characters.",
  },
};

export function getClassTip(slug) {
  return CLASS_TIPS[slug] || {
    complexity: 'intermediate',
    tip: "A specialized [[class]]. Read the description and [[feat|feats]] carefully — the class's identity comes from the choices you make at [[level]] 1.",
  };
}
