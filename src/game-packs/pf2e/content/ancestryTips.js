// Per-ancestry new-player guidance.
// complexity: 'easy' | 'intermediate' | 'advanced'
// tip: a single string surfaced in StepAncestry's HelpfulTip panel when
//      this ancestry is selected. May contain inline [[slug]] markers
//      parsed by AnnotatedText against the foundational glossary.
//
// Keyed by the ancestry slug (`ANCESTRIES[*].id` / `.slug` from
// data/ancestries.json). Missing slugs fall through to the
// `getAncestryTip` default below.

export const ANCESTRY_TIPS = {
  // ─── Player Core 1 ──────────────────────────────────────────────────────

  human: {
    complexity: 'easy',
    tip: "The flexible default — adaptable, varied, ambitious. 8 [[hit-points|HP]], normal vision, 30 ft [[speed|Speed]]. Two free [[ability-boost|boosts]] (no fixed pair, no [[ability-flaw|flaw]]) — Humans assign both wherever they need. Picks any class equally well; the second free boost lets your secondary stat land at 16 from level 1 instead of 14, which compounds nicely. Heritages add real mechanical variety: Versatile Human grants an extra [[general-feat|general feat]] at level 1 (huge — this is the most-picked heritage in the game), Skilled Human grants an extra trained skill that upgrades faster, plus regional heritages from Mwangi, Garundi, Tian, Varisian traditions.",
  },
  dwarf: {
    complexity: 'easy',
    tip: "Stout, ancient, traditionally-minded mountain people. 10 [[hit-points|HP]] from ancestry — top tier — plus [[vision|Darkvision]] and a 20 ft [[speed|Speed]] that doesn't slow further in heavy armor. Boosts to [[constitution|CON]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[charisma|CHA]]. Built for tanks and people of conviction — Champion, Cleric, Fighter, anyone soaking hits up front. The slow base speed bites in chase scenes and mobility-heavy encounters; the Fleet [[general-feat|general feat]] at level 3 fixes it. Heritages further specialize you into forge-tied elemental work, ancestral memory, or stone-hardened resilience.",
  },
  elf: {
    complexity: 'easy',
    tip: "Long-lived, observant, attuned to the world's slower rhythms. 6 [[hit-points|HP]] from ancestry (low — your class better add HP), [[vision|Low-Light Vision]], 30 ft [[speed|Speed]]. Boosts to [[dexterity|DEX]] and [[intelligence|INT]], [[ability-flaw|flaw]] to [[constitution|CON]]. Best for DEX-based casters (Wizard, Witch), archers (Ranger), or anyone who plans to stay out of melee. The CON flaw is a real cost — fewer HP, weaker [[fortitude|Fortitude]] saves — so Elves should not be the party tank. Heritages cover magical heritage (Otherworldly Magic gives you a cantrip), deep elven traditions, ancient-bloodied seer variants, and the half-elf hybrid path.",
  },
  halfling: {
    complexity: 'easy',
    tip: "Small, optimistic, quietly resilient. 6 [[hit-points|HP]], normal vision, 25 ft [[speed|Speed]], [[size|Small]] size. Boosts to [[dexterity|DEX]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[strength|STR]]. Halflings reroll some failed saves through Halfling Luck and resist fear remarkably well — they're sturdier than they look in the moments that count. Best for Rogue, Ranger, Cleric, Bard — anyone valuing steadiness over flash. Small + low STR means melee builds want finesse weapons. Heritages span hillock (comfortable home-lovers, extra HP), jinxed (unlucky but tough), nomadic (multi-language), gutsy (anti-fear), twilight (Low-Light Vision), wildwood (forest-adapted).",
  },
  gnome: {
    complexity: 'easy',
    tip: "Small, fey-touched, intensely curious — Gnomes who lose curiosity literally start to die. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]], [[size|Small]] size. Boosts to [[constitution|CON]] and [[charisma|CHA]], [[ability-flaw|flaw]] to [[strength|STR]]. Excellent for Sorcerer, Bard, Witch, Champion — any CHA-driven class. The fey blood opens unique [[ancestry-feat|ancestry feats]] for [[primal|primal]] magic, animal communication, and weird gnomish illusions. Small size matters mostly for weapon sizing and squeezing through tight spaces. Heritages tap elemental ties, fey blood, or the chaotic illusions of pure curiosity manifesting as random magic.",
  },
  goblin: {
    complexity: 'easy',
    tip: "Wiry, fast, fire-loving, generally underestimated by larger folk. 6 [[hit-points|HP]], [[vision|Darkvision]], 25 ft [[speed|Speed]], [[size|Small]] size. Boosts to [[dexterity|DEX]] and [[charisma|CHA]], [[ability-flaw|flaw]] to [[wisdom|WIS]]. Quick, charming, impulsive. Great for Rogue, Bard, Sorcerer, Alchemist — anyone playing into speed, flair, or flame. The WIS flaw hurts [[will|Will]] saves and [[perception|Perception]] (which means [[initiative|initiative]]); plan accordingly. Heritages cover charcoal (fire resistance), irongut (immune to disease), snow (cold resistance), tailed (prehensile tail), unbreakable (extra HP), and more. Burn It! is the iconic ancestry feat.",
  },
  leshy: {
    complexity: 'intermediate',
    tip: "Plant spirits awakened into mortal bodies — sentient nature given form. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]]. Boosts to [[constitution|CON]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[intelligence|INT]]. Don't eat or sleep like other ancestries — you photosynthesize and meditate. Excellent for Druid, Ranger, Cleric — any nature-themed class. The INT flaw means avoid Wizard, Witch, Investigator, Alchemist. Heritages cover leaf (gliding membrane), vine (extended reach via tendrils), fungus (decay resistance), fruit (charisma-laden), root (extra stability), seedpod (regenerative), gourd (extreme HP) — each grants a unique perk tied to that body type.",
  },
  orc: {
    complexity: 'intermediate',
    tip: "Strong, scarred, deeply communal, often misjudged by Inner Sea standards. 10 [[hit-points|HP]] (top tier), [[vision|Darkvision]], 25 ft [[speed|Speed]]. Boosts to [[strength|STR]] and one free, NO [[ability-flaw|flaw]] — Orcs are the durable martial pick with no trade-offs. Excellent for Barbarian, Fighter, Champion, Ranger, anyone wielding heavy weapons. Iron Fists ancestry feat turns your bare hands into legitimate weapons. Hold Mark heritages reflect cultural identity — battle-ready, hold-scarred, rainfall-born, winter-touched, badlands, deep, grave, kellid — each leaning into a different traditional path.",
  },

  // ─── Player Core 2 ──────────────────────────────────────────────────────

  catfolk: {
    complexity: 'intermediate',
    tip: "Sleek, instinctive, fortune-favored hunters and wanderers. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]]. Boosts to [[dexterity|DEX]] and [[charisma|CHA]], [[ability-flaw|flaw]] to [[wisdom|WIS]]. Graceful and personable, but easily distracted by anything shiny. Excellent for Swashbuckler, Rogue, Bard, Sorcerer — any class valuing mobility and social charm. Cat's Luck lets you reroll a failed save once per day — clutch in a crisis. Heritages: jungle (climb speed), liminal (planar-touched, slight magic resistance), nine-lives (death-cheating), sharp-fanged (natural bite weapon), winter (cold resistance), hunting (Survival boost), clouded (low-vis adaptation).",
  },
  hobgoblin: {
    complexity: 'intermediate',
    tip: "Militaristic, disciplined, organized — Goblin cousins with very different culture. 8 [[hit-points|HP]], [[vision|Darkvision]], 25 ft [[speed|Speed]]. Boosts to [[constitution|CON]] and [[intelligence|INT]], [[ability-flaw|flaw]] to [[wisdom|WIS]]. Tough, smart, sometimes lacking intuition. Excellent for Fighter, Wizard, Magus, Investigator — anyone valuing tactical mind plus toughness. Remorseless Lash lets you press your advantage when enemies are frightened. Heritages: elfbane (anti-fey culture), runtboss (commanding lesser goblins), shortshanks (small but mighty), smokeworker (camp expertise + fire resistance), warmarch (long-distance endurance with no fatigue).",
  },
  kholo: {
    complexity: 'intermediate',
    tip: "Hyena-people, pack-oriented, twilight predators with strong matrilineal traditions. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]]. Boosts to [[strength|STR]] and [[intelligence|INT]], [[ability-flaw|flaw]] to [[wisdom|WIS]]. Fierce, mobile, pack-minded. Excellent for Barbarian, Ranger, Fighter — any pack-tactics build. Bite ancestry feat grants a natural weapon. Heritages: ant kholo (extreme stamina, no fatigue), cave kholo ([[vision|Darkvision]] upgrade), great kholo (larger, tougher), sweetbreath kholo (eats sweet foods, unusual cultural niche), winter kholo (cold resistance). Previously called Gnoll pre-Remaster — same ancestry, updated name.",
  },
  kobold: {
    complexity: 'intermediate',
    tip: "Small, draconic-touched, clever survivors with deep cultural ties to dragons. 6 [[hit-points|HP]], [[vision|Darkvision]], 25 ft [[speed|Speed]], [[size|Small]] size. Boosts to [[charisma|CHA]] and one free, [[ability-flaw|flaw]] to [[constitution|CON]]. Charming and clever, but fragile. Excellent for Sorcerer (especially draconic bloodline), Rogue, Alchemist, Bard. Many heritages tie to specific dragon types: Caveclimber (mountain-dwelling), Cavernstalker (Darkvision boost), Dragonscaled (resistance based on color), Spellscale (innate cantrip), Strongjaw (bite weapon), Tailtaster (poison resistance). Great pick for a small caster wanting draconic flavor without going Gnome or Halfling.",
  },
  lizardfolk: {
    complexity: 'intermediate',
    tip: "Reptilian, deliberate, often spiritually connected to ancient gods. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]]. Boosts to [[strength|STR]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[intelligence|INT]]. Strong, intuitive, contemplative. Excellent for Champion, Cleric, Druid, Ranger — any STR/WIS-aligned class. Natural Reach + Tail Whip ancestry feats provide unique combat options. Heritages: cliffscale (mountain-climbers, climb speed), cloudleaper (gliding membranes), frilled (intimidation flair), sandstrider (desert adaptation, water conservation), unseen (camouflage), wetlander (swimming proficiency), wood stalker (forest predator).",
  },
  ratfolk: {
    complexity: 'intermediate',
    tip: "Small, communal, adaptable scavengers and craftspeople. 6 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]], [[size|Small]] size. Boosts to [[dexterity|DEX]] and [[intelligence|INT]], [[ability-flaw|flaw]] to [[strength|STR]]. Quick, clever, physically slight. Excellent for Wizard, Witch, Alchemist, Rogue, Investigator — anyone valuing brains over brawn. Cheek Pouches lets you store small items in your mouth (more useful than it sounds — instant access for components and consumables). Heritages: deep rat ([[vision|Darkvision]] boost), desert rat (water conservation), longsnout rat (keen smell, Survival), sewer rat (disease resistance), shadow rat (stealth bonus), tunnel rat (squeezing through tight spaces).",
  },
  tengu: {
    complexity: 'intermediate',
    tip: "Bird-people with rich cultural traditions, weapon mastery, and martial pride. 6 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]]. Boosts to [[dexterity|DEX]] and one free, NO [[ability-flaw|flaw]] — versatile and nimble. Sharp Beak gives you a natural weapon. Tengu Lore covers their cultural traditions. Excellent for Swashbuckler, Rogue, Fighter, Ranger — any class wanting flexibility plus a free boost. Heritages: jinxed (luck reverses for foes), mountainkeeper (mountain-dwelling stoic), skyborn (gliding affinity), stormtossed (electricity resistance), taloned (sharp claw alternative), wavediver (swimming proficiency).",
  },
  tripkee: {
    complexity: 'intermediate',
    tip: "Small, amphibious, jungle-dwelling tree-frog people. 6 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]], [[size|Small]] size. Boosts to [[wisdom|WIS]] and [[dexterity|DEX]], [[ability-flaw|flaw]] to [[strength|STR]]. Perceptive and agile but physically slight. Excellent for Druid, Ranger, Rogue, Monk — any nature-themed or finesse class. Jungle Lore + climbing-themed heritages match jungle/swamp campaigns particularly well. Heritages: poisonhide (touch poison via skin), riverside (swimming), snaptongue (extended-reach prehensile tongue), stickytoe (climb speed), windweb (gliding membranes between limbs). Previously called Grippli pre-Remaster — same ancestry, updated name.",
  },

  // ─── Howl of the Wild ───────────────────────────────────────────────────

  athamaru: {
    complexity: 'advanced',
    tip: "Aquatic salamander people — semi-amphibious humanoids tied to coastal and oceanic communities. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 20 ft [[speed|Speed]] (with swim affinity through heritage). Boosts to [[strength|STR]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[intelligence|INT]]. Strong and intuitive, slower at abstract scholarly work. **Many ancestry feats and heritage options ONLY function in or near water** — Athamaru shine in aquatic campaigns or parties that fight near coasts. Out of water, you're a slightly above-average ancestry rather than a standout. Heritages match different aquatic environments — coastal, deep, riverine, brackish.",
  },
  'awakened-animal': {
    complexity: 'advanced',
    tip: "Animals granted sapience and shaped to walk and talk like people. 6 [[hit-points|HP]], vision varies by source animal, 5 ft baseline [[speed|Speed]] (your specific animal heritage usually grants a much higher movement type — climb, swim, fly, or fast land). Boosts to [[constitution|CON]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[intelligence|INT]]. The specific animal you pick (a heritage equivalent — bear, cat, bird, etc.) determines a LOT — bears lean into CON, cats lean into DEX, birds get limited flight, and so on. Read the animal-type list carefully before locking in — your animal heritage shapes your build more than most ancestry+heritage combinations.",
  },
  centaur: {
    complexity: 'advanced',
    tip: "Quadrupedal half-human half-horse people — significant size and reach. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 30 ft [[speed|Speed]] (faster than most ancestries), [[size|Large]] size. Boosts to [[strength|STR]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[charisma|CHA]]. Strong, perceptive, hooves-first thinkers. Excellent for Fighter, Ranger, Champion, Barbarian — any frontline. Large size gives reach with reach weapons (a lance becomes brutal). Downside: you may not fit in dungeon corridors or human-sized rooms, and some interiors are designed against your scale. Heritages cover different equine ancestries — heavy draft, lithe runner, snow-traveler, plains-dweller.",
  },
  merfolk: {
    complexity: 'advanced',
    tip: "Aquatic half-fish people — fin instead of legs. 8 [[hit-points|HP]], [[vision|Low-Light Vision]], 5 ft LAND [[speed|Speed]] (extremely slow on land), strong swim affinity through heritage. Boosts to [[dexterity|DEX]] and [[charisma|CHA]], [[ability-flaw|flaw]] to [[constitution|CON]]. **Heavily restricted to aquatic campaigns** — out of water you're crawling at less than half walking pace. In water you outswim almost every other ancestry. Pick Merfolk ONLY if your campaign has substantial underwater content; otherwise you're functionally crippled most days. Heritages cover different oceanic adaptations: deep, reef, freshwater, salt-and-stone.",
  },
  minotaur: {
    complexity: 'advanced',
    tip: "Massive bull-headed warriors, ancient and proud, often labyrinth-dwelling. 10 [[hit-points|HP]], [[vision|Darkvision]], 25 ft [[speed|Speed]], [[size|Large]] size. Boosts to [[strength|STR]] and [[constitution|CON]], [[ability-flaw|flaw]] to [[charisma|CHA]]. Physically dominant — socially intimidating in a 'scares everyone unintentionally' way. Excellent for Fighter, Barbarian, Champion — anyone built around heavy weapons and durability. Natural horns provide a gore attack. Large size limits dungeon access but grants reach with appropriate weapons. Heritages: deep (cavern-dwelling), mountain (climbing affinity), sea-walking (coastal-adapted), sword-horned (combat-bred), maze-walker (orientation immunity in twisting passages).",
  },
  surki: {
    complexity: 'intermediate',
    tip: "Insectoid humanoids — chitinous, segmented, often communal and hive-minded. 8 [[hit-points|HP]], [[vision|Darkvision]], 25 ft [[speed|Speed]]. Boosts to [[constitution|CON]] and [[strength|STR]], no fixed [[ability-flaw|flaw]] — sturdy and physically capable with no built-in trade-off. Excellent for Druid, Ranger, Cleric, Investigator, Fighter — any nature-attuned, observational, or frontline class. Chitinous body provides natural armor. Heritages: hivewatch (collective ant-like awareness shared with allies), ironcarapace (extra defensive layer), warmindi (warrior-caste, combat-bred).",
  },
  jotunborn: {
    complexity: 'advanced',
    tip: "Giant-blooded humanoids — descended from giants generations back, carrying inherited [[size|Large]] size, raw [[strength|STR]], and stubbornness that runs in the bone. 10 [[hit-points|HP]], [[vision|Low-Light Vision]], 25 ft [[speed|Speed]]. Boosts to [[strength|STR]] and [[wisdom|WIS]], [[ability-flaw|flaw]] to [[charisma|CHA]]. Best for Barbarian, Fighter, Champion, anyone playing into raw physicality. The Large size grants reach with reach weapons but means tight corridors and human-sized doors become a problem. Heritages explore different giant ancestries — keeper, plane-hopper, sage, warrior, weaver — each a different facet of giant heritage.",
  },

  // ─── Pre-existing entries kept as-is (not in current ORC tip batch) ────

  nephilim: {
    complexity: 'intermediate',
    tip: "Planar-touched [[heritage]] replacing the old Tiefling/Aasimar/Genasi split. Mechanically straightforward, narratively dense — fits players who like backstory hooks.",
  },
  automaton: {
    complexity: 'advanced',
    tip: "Constructed beings with unique repair mechanics and trait interactions. Healing works differently, and you interact with both 'object' and 'creature' rules. Lots of moving parts.",
  },
  skeleton: {
    complexity: 'advanced',
    tip: "Undead PC. Positive damage hurts you; negative damage heals you. Powerful at high levels but requires constant accounting for healing and condition immunities.",
  },
  conrasu: {
    complexity: 'advanced',
    tip: "Spirit-folded constructs from another plane. Niche fantasy, niche mechanics. Pick if their [[lore]] grabs you specifically.",
  },
  fetchling: {
    complexity: 'advanced',
    tip: "Shadow-touched humans from the Plane of Shadow. Mechanics are accessible; the lore investment is the heavier ask.",
  },
  fleshwarp: {
    complexity: 'advanced',
    tip: "Beings reshaped by alchemy or magic. Mechanically flexible ([[size]] varies by [[heritage]]) but appearance is intentionally unsettling — discuss with table before picking.",
  },
  strix: {
    complexity: 'advanced',
    tip: "Winged humanoids with limited flight at low levels. Flight rules in PF2e are strict; not for a first character.",
  },
  vanara: {
    complexity: 'intermediate',
    tip: "Monkey-folk with prehensile tails. Climb-focused movement and [[dexterity|Dex]]/[[wisdom|Wis]] boosts. Approachable if you like mobility-heavy play.",
  },
  ysoki: {
    complexity: 'intermediate',
    tip: "Spacefaring ratfolk variant — Starfinder crossover [[ancestry]]. Same cheek-pouch tricks, more sci-fi flavor.",
  },
};

export function getAncestryTip(slug) {
  return ANCESTRY_TIPS[slug] || {
    complexity: 'intermediate',
    tip: "Pick this [[ancestry]] if its [[lore]] or visuals speak to you. Mechanics are summarized in the statblock above — pair [[dexterity|Dex]]-heavy ancestries with finesse classes, [[strength|Str]]-heavy with martial frontliners.",
  };
}
