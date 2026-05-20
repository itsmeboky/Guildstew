// Per-heritage new-player guidance — Player Core 1 batch.
//
// Keyed by heritage slug (`ancestries.json[*].heritages[*].slug`).
// Each value is a tip string surfaced in StepAncestry's heritage tip
// panel when a heritage is selected. Strings may contain inline
// [[slug]] markers parsed by AnnotatedText against the foundational
// glossary.
//
// Missing slugs fall through to `getHeritageTip`'s `null` return — the
// tip panel simply doesn't render, so the heritage card's own `desc`
// field is the only player-facing description.

export const HERITAGE_TIPS = {
  // ─── DWARF heritages ────────────────────────────────────────────────────

  'ancient-blooded-dwarf': "Dwarves who carry the deep memory of their ancestors and a stubborn resistance to magic. The signature feature lets you reroll a failed save against a magical effect once per day — clutch in a fight against an enemy caster. Pick this if you're playing a Dwarf paladin or champion who'll be the magical-effect target, or if you just want anti-magic insurance for the whole party.",

  'death-warden-dwarf': "Dwarves of clans that fought (and buried) hordes of undead. Granted a critical-success upgrade on successful saves against void / death-aligned effects from undead. Pick this for a campaign with undead opposition (which is most Golarion campaigns), or a Cleric who'll face cultists.",

  'forge-dwarf': "Dwarves born and raised in the heat of the great forges. Fire resistance scaling with your [[level]]. Great pick for any campaign with frequent fire damage — dragon-heavy stories, hellbreaker plots, volcanic settings. Pairs especially well with a Dwarf Fighter or Barbarian who'll be in melee against fire-breathing enemies.",

  'rock-dwarf': "Dwarves so grounded they barely move when pushed. Bonus on saves against being knocked prone or forced to move (Trip, Shove). Great for frontline tanks who need to stay where they're planted — Champion, Fighter, Barbarian. Pair with a heavy weapon and an immovable disposition.",

  'strong-blooded-dwarf': "Dwarves whose hardy blood resists poison better than most. Gain poison resistance scaling with your [[level]], plus saves against poisons get a small bonus. Excellent for campaigns with poison-using enemies (assassins, drow, monstrous flora). A solid universal pick when you don't know what your campaign will throw at you.",

  // ─── ELF heritages ──────────────────────────────────────────────────────

  'ancient-elf': "Elves so old they've already lived several lifetimes' worth of experiences. Heritage feature: take a [[class-feat|multiclass dedication]] at level 1, treating yourself as if you had taken it at the standard level. This is the most powerful heritage in the game for build flexibility — start with two classes' worth of options from day one. Pick this if you want a multiclass build without waiting until level 2.",

  'arctic-elf': "Elves who survived in tundras and arctic conditions. Cold resistance scaling with your [[level]]. Best for campaigns set in northern wastes, plane of cold expeditions, or any antagonist whose signature is freezing damage. Functional anywhere; mechanical bonus mostly only matters in cold-themed stories.",

  'cavern-elf': "Elves born deep underground, attuned to darkness. Upgraded vision: [[vision|Darkvision]] instead of the standard Low-Light Vision. Excellent for dungeon-crawler campaigns, Darklands stories, or any character who'll often be in lightless conditions. The Darkvision upgrade alone is worth this heritage for most subterranean adventures.",

  'seer-elf': "Elves with innate magical sight. Cast Detect Magic at will as an [[ancestry-feat|innate cantrip]]. Free utility — Detect Magic is normally a [[spell-slot|spell slot]] or scroll, and you're casting it forever. Perfect for any campaign with magical mysteries, hidden items, or magical traps. Picks this if you want passive magic detection without spending an ancestry feat on it.",

  'whisper-elf': "Elves with hearing acute enough to detect a heartbeat in another room. Bonus to [[perception|Perception]] for Seek actions against hidden creatures within 30 ft. Great for any Elf who wants to be the party's scout or sneak-detector. Particularly strong in dungeons and urban stealth scenarios.",

  'woodland-elf': "Elves born in deep forests, woven into the canopy. Climb [[speed|Speed]] equal to half your Speed in trees and similar environments. Wood-heavy campaigns (jungle, forest, fey stories) benefit massively; you can move through canopies that slow other characters to a crawl. Pair with Ranger or Druid for full forest-master fantasy.",

  // ─── GNOME heritages ────────────────────────────────────────────────────

  'chameleon-gnome': "Gnomes who shift their skin and hair color at will. Free-action color change — useful for [[stealth|Stealth]], performance, disguise, or just flavor. Combined with the Gnome [[charisma|CHA]] base, this heritage suits Sorcerers, Bards, and Rogues who want a touch of supernatural style without committing to anything more mechanically heavy.",

  'fey-touched-gnome': "Gnomes whose fey blood runs strong enough to grant innate [[primal|primal]] magic. Pick one [[cantrip]] from the primal list — you cast it as an innate cantrip forever. Plus the standard Gnome slow-aging trait gets bonus narrative weight. Best for Gnome characters who want a magic touch without being full casters; pairs nicely with martial classes.",

  'sensate-gnome': "Gnomes whose senses are heightened past normal Gnome levels. Bonus to [[perception|Perception]] for sensing creatures. Solid passive utility — Perception drives [[initiative]] and detection in general. Picks this if you want to be a sensory specialist without committing the trained skill slots elsewhere.",

  'umbral-gnome': "Gnomes raised in the deep dark — caves, Darklands, twilight forests. Upgraded vision: [[vision|Darkvision]] instead of Low-Light Vision. Same logic as Cavern Elf — invaluable for subterranean campaigns. Pair with a Gnome Rogue or Druid for shadow-stalker vibes.",

  'wellspring-gnome': "Gnomes whose magic flows from a non-traditional source — divine, occult, or arcane instead of the usual primal-fey connection. Replaces your innate primal flavor with one of the three other [[spell-tradition|traditions]]. Picks this when your character concept is 'Gnome but not a fey-magic Gnome' — divinely chosen, scholarly arcane lineage, or occultist family.",

  // ─── GOBLIN heritages ───────────────────────────────────────────────────

  'charhide-goblin': "Goblins with literal fire-toughened skin. Fire resistance and faster recovery from being on fire. Excellent for any campaign with fire enemies, alchemist parties (bomb splash on your own teammate stops being lethal), or characters who want to lean into fire-themed flavor.",

  'irongut-goblin': "Goblins who can eat anything — rotten food, garbage, poisons, even small monstrosities. Bonus to saves against [[fortitude|Fortitude]] effects related to ingested poisons or spoiled food. Great for survival-heavy campaigns where food is scarce, or comic-relief flavor moments where your Goblin eats things no one else can stomach.",

  'razortooth-goblin': "Goblins with naturally sharp teeth that can hold their own as a weapon. Bite [[ancestry-feat|attack]] (a natural weapon you don't have to draw). Useful for grappling/unarmed builds, or as a backup attack when disarmed. Pairs well with Monk, Barbarian, or a finesse Rogue who can use the unarmed Strike when their weapon's out of reach.",

  'snow-goblin': "Goblins who survived where most beings freeze. Cold resistance scaling with your [[level]]. Best for arctic / icy / mountainous campaigns. Functional anywhere; combat impact lives in campaigns where cold damage shows up regularly (frost giants, winter witches, frigid demi-planes).",

  'unbreakable-goblin': "Goblins whose wiry bodies just refuse to break. Extra [[hit-points|HP]] at level 1. Solid universal pick — more HP is always good. Pairs especially well with martial Goblins (Barbarian, Fighter, Champion) where the extra survivability matters most.",

  // ─── HALFLING heritages ─────────────────────────────────────────────────

  'gutsy-halfling': "Halflings whose optimism is so deep it works as magical resistance. When you succeed on a save against a fear or emotion effect, you treat it as a critical success — you can shake off mid-combat charms, frights, and despair effects faster than other characters. Excellent for any campaign with fear-heavy enemies (undead, demons, dread fey).",

  'hillock-halfling': "Halflings who come from peaceful hill country and recover from injury fast. Improved [[hit-points|HP]] recovery during full rest. Great for parties without dedicated healers or campaigns where rests are infrequent — your Hillock Halfling bounces back fastest each morning, conserving the party's resources.",

  'nomadic-halfling': "Halflings whose families travel between cultures, speaking many tongues. Two extra [[languages]] at level 1, plus access to learn more efficiently. Great for diplomatic / scholarly / merchant Halfling concepts, or any campaign that takes the party across regions where translation matters.",

  'twilight-halfling': "Halflings who lived in the dim-lit margins between day and night. Upgraded vision: [[vision|Low-Light Vision]] (Halflings normally have only normal vision). Useful as a baseline upgrade — Low-Light is the most common 'better than normal' vision in PF2e and makes dim torch-lit dungeons feel like daylight.",

  'wildwood-halfling': "Halflings raised in dense forests, comfortable moving through undergrowth. Ignore difficult terrain in forests, brush, and similar wild environments. Perfect for Ranger, Druid, or any character who'll spend a lot of time off-road. Effectively a permanent speed buff in wilderness scenarios.",

  'jinxed-halfling': "Halflings whose luck flows backwards onto their enemies. Once per day, you can cause a creature near you that has just succeeded on a check to reroll and take the worse result. The mirror image of Halfling Luck — instead of saving yourself, you sabotage an enemy. Excellent for any party that needs an extra layer of crit-or-fumble manipulation.",

  // ─── HUMAN heritages ────────────────────────────────────────────────────

  'skilled-human': "Humans whose adaptability shows as broad competence. Extra trained [[skill]] that upgrades from [[trained|Trained]] to [[expert|Expert]] at level 5 (instead of the usual level 7). The pick scales with your level: you stay 2 levels ahead on this skill forever. Pick this for a Human who's the party's skill specialist — investigator, social glue, scholar.",

  'versatile-human': "Humans whose flexibility manifests as broader feat options. Extra [[general-feat|general feat]] at level 1. The most-picked heritage in the entire game — that extra general feat (Toughness, Shield Block, Fleet, Incredible Initiative) is enormously valuable at level 1 when everything is tight. Pick this if you can't think of a more specific Human heritage reason; you almost can't go wrong.",

  // ─── LESHY heritages ────────────────────────────────────────────────────

  'cactus-leshy': "Spiny desert Leshy whose body bristles with cactus needles. Natural defensive feature — anyone grappling you takes damage from the spines. Excellent for tank builds, melee-resistance flavor, or any character built around being painful to touch.",

  'fruit-leshy': "Leshy that grow edible fruit on their bodies (yes, really — that's the heritage). Once per day, harvest your own fruit as a healing item. Great for parties with limited [[medicine|Medicine]] or healing capacity. Slightly off-putting in flavor, but mechanically a reliable HP top-up.",

  'fungus-leshy': "Leshy made of fungal matter rather than tree-spirit. Low-Light Vision and slight decay resistance. Good in dungeons (lots of dim spaces) and undead campaigns. Flavor is exotic — a sentient mushroom is a unique character regardless of mechanics.",

  'gourd-leshy': "Leshy whose body is shaped like a large gourd. Extra [[hit-points|HP]] at level 1 — the gourd flesh is dense and protective. Best for melee builds where extra survivability compounds. Roleplaying note: the gourd is the body; remove it and the Leshy spirit moves on.",

  'leaf-leshy': "Leshy whose body is mostly broad leaves. Reduced falling damage — you slow your descent like a falling leaf. Great for climbing/aerial campaigns, dungeon falls, or any Druid/Ranger who'll find themselves in unstable terrain.",

  'lotus-leshy': "Leshy of water-bound origin. Can walk on still water without sinking, plus swim speed. Perfect for water-heavy campaigns (river travel, ocean coastal stories) — lets you keep up with land speed without being slowed by waterways.",

  'root-leshy': "Leshy with extensive root networks instead of legs. Extra stability — bonus on saves to avoid being knocked prone or moved against your will. Ideal for tanks, frontliners, and any character planted in one position by build (turret-style Fighters, etc.).",

  'seaweed-leshy': "Leshy made of kelp, sargassum, and other aquatic plant matter. Swim [[speed|Speed]] and the ability to breathe underwater for limited stretches. Best for aquatic / coastal campaigns where the rest of the party has water adaptation; otherwise the underwater specialty doesn't see much use. Pairs well with Druid (especially Storm or Untamed order) for full ocean-spirit fantasy.",

  'vine-leshy': "Leshy with prehensile vines that extend reach. Extended reach for some manipulations and grappling. Useful for grapple-focused builds, climbing-heavy campaigns, or characters who want to manipulate distant objects.",

  // ─── ORC heritages ──────────────────────────────────────────────────────

  'badlands-orc': "Orcs adapted to scorched dry desert wastelands. Heat resistance and improved water-rationing. Best for desert campaigns or arid-region adventures. Pairs naturally with martial Orc builds — your durability extends through environmental hardship.",

  'battle-ready-orc': "Orcs raised in martial cultures, trained for war from childhood. Trained in [[intimidation|Intimidation]] automatically. Solid for any Orc who'll be the party's frontline aggressor — Intimidation's Demoralize action is one of the best in-combat skill uses in the game.",

  'deep-orc': "Orcs from the Darklands depths. Upgraded vision: [[vision|Darkvision]] extends further than standard. Useful for any subterranean campaign. Pairs with Druid, Ranger, or Rogue who'll be scouting in lightless conditions.",

  'grave-orc': "Orcs descended from cultures that have warred against undead for generations. Resistance to void / necrotic damage. Excellent for undead-heavy campaigns (Carrion Crown, Strength of Thousands, anything with a lich antagonist).",

  'hold-scarred-orc': "Orcs whose scars from clan war training have given them additional toughness. Extra [[hit-points|HP]] at level 1. Solid universal pick — more HP compounds well for the already-durable Orc base.",

  'rainfall-orc': "Orcs from coastal or river-dwelling clans. Swim speed and minor water adaptation. Good for water-heavy campaigns. Pair with Druid or Ranger for a fully water-themed Orc.",

  'winter-orc': "Orcs from northern frozen lands. Cold resistance scaling with your [[level]]. Best for arctic / northern campaigns. Pair with Barbarian for an ice-blooded warrior who feels right at home in blizzard fights.",

  // ─── CATFOLK heritages (PC2) ────────────────────────────────────────────

  'jungle-catfolk': "Catfolk born and raised in dense rainforests. Climb [[speed|Speed]] in trees and vine-heavy environments. Best for jungle/forest campaigns or any character built around mobility through the canopy. Pair with Ranger or Rogue for forest scout vibes.",

  'liminal-catfolk': "Catfolk touched by liminal spaces between worlds — born on planar borders or in haunted twilight zones. Slight resistance to planar magic and bonus saves against effects that try to move you between locations. Picks this for cosmic / planar campaigns or characters with otherworldly backstories.",

  'nine-lives-catfolk': "Catfolk who've cheated death so many times their ancestry mechanically expects it. Once per day, when you fail a save against an effect that would reduce you to 0 [[hit-points|HP]], you can roll twice and take the better result. The mechanical name fits — you've got extra lives baked in. Great for any frontline Catfolk who'll be the target of finishing blows.",

  'winter-catfolk': "Catfolk from snowbound mountains and arctic forests. Cold resistance scaling with your [[level]]. Best for cold-themed campaigns or any character who'll face icy enemies (frost giants, white dragons, winter witches). Pairs with thick-furred Catfolk flavor.",

  'hunting-catfolk': "Catfolk whose families have been pure hunters for generations. Bonus on [[survival|Survival]] checks for tracking and the related action economy. Picks this for any Catfolk built as a tracker or wilderness scout — pairs naturally with Ranger.",

  // ─── HOBGOBLIN heritages (PC2) ──────────────────────────────────────────

  'elfbane-hobgoblin': "Hobgoblins from cultures locked in long wars against elves and fey. Bonus on saves against [[primal|primal]] magic and fey-derived effects. Great for campaigns with significant fey/elven opposition. Pairs naturally with martial Hobgoblin builds for the 'elf-killer' fantasy.",

  'runtboss-hobgoblin': "Hobgoblins who command lesser goblins through force of personality and tradition. Bonus to [[intimidation|Intimidation]] checks against goblinoid creatures specifically — and small mechanical benefits when leading allied goblins. Solid for parties with Goblin members or campaigns where you'll be commanding goblin troops.",

  'smokeworker-hobgoblin': "Hobgoblins from cultures that specialize in smoke, fire, and combat alchemy. Fire resistance scaling with your [[level]], plus you ignore concealment from smoke (your own or anyone else's). Pairs incredibly well with Alchemist or any party that uses smoke screens tactically.",

  'warmarch-hobgoblin': "Hobgoblins from cultures that march vast distances without rest. Reduced fatigue from long travel and forced marches — you and your allies can move farther between rests. Great for sandbox campaigns, exploration-heavy stories, or any party that does a lot of overland travel.",

  // ─── KHOLO heritages (PC2) ──────────────────────────────────────────────

  'ant-kholo': "Kholo from cultures with extreme physical conditioning — runners and endurance hunters. Reduced fatigue and stamina-related effects. Pairs with martial builds where staying mobile through a long combat matters.",

  'cave-kholo': "Kholo from Darklands or deep cavern dwellings. Upgraded vision — extended [[vision|Darkvision]] range. Useful for any subterranean campaign or Darklands stories. Pairs with Rogue or Druid for shadow-stalker builds.",

  'great-kholo': "Larger than typical Kholo — closer to giant-hyena scale. Larger frame, slightly tougher physically. Best for melee Barbarian or Fighter builds where the additional physical presence intimidates and the toughness backs it up.",

  'sweetbreath-kholo': "Kholo whose cultural diet leans toward sweet foods rather than the typical scavenger fare. Cultural-flavor heritage — the mechanical benefit is minor (bonus on saves against certain types of poison perhaps) but the flavor is distinctive. Picks this when you want a Kholo with an unusual cultural background.",

  'winter-kholo': "Kholo from northern frozen lands. Cold resistance scaling with your [[level]]. Best for arctic campaigns or any character facing cold-themed enemies. Pairs with thicker pelt + endurance flavor.",

  // ─── KOBOLD heritages (PC2) ─────────────────────────────────────────────

  'cavernstalker-kobold': "Kobolds whose ancestors hunted in dim caverns for so long their vision improved. Upgraded [[vision|Darkvision]]. Solid for any dark-environment campaign — Darklands stories, dungeon crawlers, twilight-zone adventures.",

  'dragonscaled-kobold': "Kobolds whose draconic ancestry is closer than most — physical scales matching a specific dragon type. Resistance to one elemental damage type, picked at character creation based on your dragon heritage (red = fire, blue = electricity, etc.). Excellent for any campaign with dragon enemies; you essentially have built-in defense against the boss's signature damage.",

  'strongjaw-kobold': "Kobolds with reinforced jaws and bite strength. Bite [[ancestry-feat|attack]] as a natural weapon. Useful as a backup attack for any Kobold or as the primary weapon for an unarmed-focused build. Pairs with Monk, Barbarian, or any class that benefits from natural weapons.",

  // ─── LIZARDFOLK heritages (PC2) ─────────────────────────────────────────

  'cliffscale-lizardfolk': "Lizardfolk from steep mountain or canyon territories. Climb [[speed|Speed]] on natural rock and cliff surfaces. Great for mountain campaigns, climbing-heavy dungeons, or any Lizardfolk built around vertical mobility. Pair with Ranger or Rogue for highland scout vibes.",

  'cloudleaper-lizardfolk': "Lizardfolk with membranes between their limbs that catch air during leaps. Slow falls / glide for short distances. Excellent for any campaign with vertical hazards (cliffs, towers, sky-island stories) — you trade falling damage for elegant landings.",

  'frilled-lizardfolk': "Lizardfolk with extendable neck frills that flare for display, intimidation, and threat-warding. Bonus to [[intimidation|Intimidation]] checks for Demoralize specifically. Great frontline-controller pick — the threat display does mechanical work, not just flavor.",

  'sandstrider-lizardfolk': "Lizardfolk adapted to deserts and arid wastelands. Heat resistance and improved water conservation. Best for desert campaigns or campaigns with significant fire/heat opposition. Pairs with the natural Lizardfolk toughness for a 'survives where others die' niche.",

  'unseen-lizardfolk': "Lizardfolk whose scales chromatically shift to blend with surroundings. Bonus on [[stealth|Stealth]] checks in natural terrain. Pairs with Ranger or Rogue for any wilderness ambush role. Less useful in pure urban / dungeon stories.",

  'wetlander-lizardfolk': "Lizardfolk from swamps, deltas, and river systems. Swim [[speed|Speed]] equal to your land speed, plus the ability to hold your breath much longer than normal. Perfect for water-heavy campaigns; pairs with Druid (Storm/Untamed order) or any aquatic-themed concept.",

  'woodstalker-lizardfolk': "Lizardfolk forest predators whose scales blend with bark and undergrowth. Bonus on [[stealth|Stealth]] and [[survival|Survival]] in forest terrain. Picks this for jungle / forest campaigns and Ranger builds that want to feel like genuine apex predators in their environment.",

  // ─── RATFOLK heritages (PC2) ────────────────────────────────────────────

  'deep-rat': "Ratfolk descended from deep-tunnel dwellers. Upgraded [[vision|Darkvision]]. Essential for any subterranean campaign — your already-[[size|Small]] advantage extends into lightless conditions where most ancestries are blinded.",

  'desert-rat': "Ratfolk from arid lands where water is scarce. Bonus on [[fortitude|Fortitude]] saves against dehydration, heat, and ingested poisons. Great for desert campaigns or survival-themed stories where consumables and water are limited.",

  'longsnout-rat': "Ratfolk whose elongated snouts give them keen smell. Bonus to [[perception|Perception]] for Seek actions that involve scent, plus the ability to track specific scents. Pairs naturally with [[survival|Survival]] training for a scent-tracker concept.",

  'sewer-rat': "Ratfolk from urban undersides — sewers, abandoned cellars, kitchen middens. Resistance to disease (sewer life builds immunities). Excellent for urban campaigns, intrigue stories, or any character built around the gritty underside of city life.",

  'shadow-rat': "Ratfolk whose dark fur and quiet movement make them slip through shadows unnoticed. Bonus on [[stealth|Stealth]] checks in dim or low-light conditions. Perfect for Rogue builds or any character built around urban stealth and infiltration.",

  'tunnel-rat': "Ratfolk who slip through impossibly tight spaces. Reduced size penalty when squeezing through narrow passages, plus the ability to enter spaces normally too small for [[size|Small]] creatures. Essential for dungeon-crawler campaigns where tight passages and hidden routes matter.",

  // ─── TENGU heritages (PC2) ──────────────────────────────────────────────

  'jinxed-tengu': "Tengu whose unlucky reputation rebounds onto opponents. Once per day, when an enemy near you rolls a critical hit, you can make them re-roll and take the worse result. Excellent disruption for boss fights — the mirror of luck-based heritages, weaponizing misfortune against your enemies.",

  'mountainkeeper-tengu': "Tengu from mountain monasteries and high-altitude communities. Bonus on saves against altitude effects and environmental cold. Best for mountain campaigns. Pairs with Monk for the classic stoic mountain-warrior fantasy.",

  'skyborn-tengu': "Tengu whose connection to flight is closer than most — gliding membranes or stronger wings. Slow falls / brief glides for short distances. Excellent for vertical campaigns; pairs with Ranger or Monk for an aerial-mobility build.",

  'stormtossed-tengu': "Tengu born during storms, with electricity literally crackling along their feathers. Electricity resistance scaling with your [[level]]. Best for any campaign with lightning enemies (blue dragons, storm giants, certain elementals).",

  'taloned-tengu': "Tengu with sharp talons on their feet that work as natural weapons. Unarmed [[ancestry-feat|attack]] (kick) that deals notable damage. Pairs with Monk for the classic kicking-bird combatant, or as a backup unarmed attack for any class that wants natural weapons.",

  'wavediver-tengu': "Tengu who dive into water like seabirds, hunting fish and aquatic creatures. Swim [[speed|Speed]] and improved underwater action economy. Great for water-heavy or coastal campaigns; pair with Ranger or Druid for a coastal-hunter concept.",

  // ─── TRIPKEE heritages (PC2) ────────────────────────────────────────────

  'poisonhide-tripkee': "Tripkee whose skin secretes mild toxin that can be transferred through touch. Touch-poison [[ancestry-feat|attack]] — useful as a melee enhancement, especially for unarmed builds. Pairs with Monk, Barbarian, or grappling-focused builds.",

  'riverside-tripkee': "Tripkee from river and stream communities, fully comfortable in rapid water. Swim [[speed|Speed]] equal to your land speed. Picks this for water-heavy campaigns or any Tripkee built around water mobility.",

  'snaptongue-tripkee': "Tripkee with extra-long prehensile tongues — enough range to grab small objects from a distance. Extended-reach tongue manipulator. Useful for grabbing remote keys, handling distant levers, or for the unique flavor of a frog-person who can grab a lit candle off a table across the room.",

  'stickytoe-tripkee': "Tripkee whose tree-frog adhesive toe pads give them grip on nearly any surface. Climb [[speed|Speed]] on most surfaces, including walls and ceilings. Excellent for dungeon climbing, vertical maneuvering, or any campaign with significant climbing demands.",

  'windweb-tripkee': "Tripkee with thin membranes between their fingers and toes that catch air. Slow falls / brief glides. Best for vertical campaigns or any environment where falls and aerial movement matter. Pairs with Druid or Ranger for jungle-canopy fantasy.",

  // ─── PC1/PC2 gap fills ──────────────────────────────────────────────────

  'clawed-catfolk': "Catfolk with naturally long, sharp claws — a built-in weapon you can't be disarmed of. Grants a 1d6 slashing claw [[ancestry-feat|unarmed attack]] with the agile, finesse, and unarmed traits. Excellent for unarmed builds (Monk, Brawler-style Fighter, finesse-based Rogue), as a reliable backup when you can't draw your weapon, or for fighting in tight spaces where weapon swings are restricted.",

  'sharp-eared-catfolk': "Catfolk with hunting-sharp hearing. Bonus on [[perception|Perception]] checks specifically for detecting hidden creatures by sound, and improved ability to act when caught flat-footed by sound-based ambushes. Great for scouts, ambush detectors, and any party that needs an early-warning system. Pairs well with Ranger and Rogue builds.",

  'shortshanks-hobgoblin': "Smaller-than-average Hobgoblins — [[size|Small]] size instead of the normal Medium. Reduces your reach but improves stealth and lets you slip through tight spaces. Great for Rogue, Investigator, or any Hobgoblin built around mobility and infiltration rather than pure martial dominance. Pairs well with finesse weapon builds.",

  'warrenbred-hobgoblin': "Hobgoblins raised in tunnels, warrens, and subterranean strongholds. Upgraded [[vision|Darkvision]] range and improved [[perception|Perception]] in tight underground environments. Excellent for dungeon-crawler campaigns, Darklands stories, or any Hobgoblin built for the underground military fantasy.",

  'dog-kholo': "Kholo with closer ties to dog ancestry than to hyena — a domestication-blooded variant. Improved scent-tracking and bonus to [[survival|Survival]] checks involving following trails. Picks this for any tracker-style Kholo or to lean into a friendlier, more party-cooperative version of the typically pack-aggressive ancestry.",

  'witch-kholo': "Kholo with latent magical heritage — your bloodline carries a thin thread of witch power. Gain one [[cantrip]] from the [[occult]] tradition as an innate spell. Excellent for any Kholo character built as a witch or sorcerer; pairs naturally with a Witch class for thematic alignment, or as a magical-edge supplement for a martial Kholo.",

  'elementheart-kobold': "Kobolds whose eggs incubated near an elemental presence — fire, air, earth, water, metal, or wood. Pick one element at creation; you gain resistance to that elemental damage type equal to half your [[level]] (minimum 1). Perfect for campaigns with heavy elemental opposition. Plan around the element you'll see most — fire if dragons feature heavily, cold for arctic stories, etc.",

  'spellhorn-kobold': "Kobolds hatched in the vicinity of strong magic — arcane energy lingers in your blood. Choose one common [[cantrip]] from the [[arcane]] tradition; you cast it as an innate cantrip, with [[charisma|CHA]] as your spellcasting ability. Free magic forever — pairs incredibly well with Sorcerer, Witch, or any class wanting a magical edge.",

  'tunnelflood-kobold': "Kobolds raised in warrens crisscrossed by underwater passages. Swim [[speed|Speed]] equal to your land speed, plus the ability to hold your breath much longer than normal. Excellent for aquatic or river campaigns, sewer-crawler stories, or any Kobold built around water mobility.",

  'venomtail-kobold': "Kobolds with a poison gland in their tail — descended from venomous draconic lineages. Once per day, apply tail-secreted poison to a weapon or to your own strike, dealing significant persistent poison damage on a hit. Best paired with a class that can guarantee the hit (Investigator's Devise a Stratagem, Magus Spellstrike, anything that improves to-hit) to make the limited-use poison count.",

  'snow-rat': "Ratfolk from northern frozen lands. Cold resistance scaling with your [[level]], plus environmental adaptations to icy terrain. Best for arctic / northern campaigns. Pairs with Druid or Ranger for a snow-stalker concept.",

  'dogtooth-tengu': "Tengu with reinforced jaws and sharp beak-like teeth. Bite [[ancestry-feat|unarmed attack]] — a natural weapon that doesn't need to be drawn. Useful as a backup attack for any Tengu, or as the primary weapon for an unarmed-focused build. Pairs with Monk, Barbarian, or any class that benefits from a natural strike option.",

  'thickskin-tripkee': "Tripkee with hardened, leathery skin — tougher than the typical lithe amphibian frame. Extra [[hit-points|HP]] at level 1, plus minor improvements to non-magical resistance. Best for melee or front-line Tripkee builds where the extra durability matters. Pairs with Barbarian or Champion to push the resilience further.",

  // ─── ATHAMARU heritages (HotW) ──────────────────────────────────────────

  'coral-athamaru': "Athamaru who symbiotically host living coral on their skin. Natural armor from the coral growth grants minor [[armor-class|AC]] benefit, plus minor regeneration during rest in saltwater. Excellent for tank-style Athamaru, especially in aquatic campaigns where you'll spend significant time in the water. Pairs with Champion or Fighter for full reef-warrior fantasy.",

  'hopeful-athamaru': "Athamaru whose pheromones spread emotional uplift to nearby allies. Once per day, you can grant a nearby ally a bonus on their next save against an emotion effect, or shake an ally out of fear. Perfect support pick — pairs well with any party that faces frequent fear opposition (demons, dragons, undead).",

  'kaleidoscopic-athamaru': "Athamaru with chromatophore skin that shifts color at will. Bonus on [[stealth|Stealth]] checks in natural aquatic environments via active camouflage, plus the ability to communicate through color patterns with other Athamaru. Useful for any Athamaru built as a scout, infiltrator, or aquatic ambusher.",

  'quilled-athamaru': "Athamaru with defensive spines like a lionfish or pufferfish. Anyone grappling or striking you in melee may take damage from the spines. Excellent for tank builds where being painful to touch matters — Barbarian, Champion, or any class built around being attacked rather than avoiding it.",

  // ─── AWAKENED-ANIMAL heritages (HotW) ───────────────────────────────────

  'climbing-animal': "Awakened animals whose source animal is a climber — primates, certain felines, geckos. Climb [[speed|Speed]] equal to your land speed. Excellent for treetop, mountain, or vertical-dungeon campaigns. Pairs well with Ranger or Rogue for an aerial ambush style.",

  'flying-animal': "Awakened animals whose source animal flies — birds, bats, flying squirrels (with restrictions on the small ones). Limited flight at level 1 (usually short-burst or glide; full flight unlocks via later [[ancestry-feat|ancestry feats]]). The single best mobility option in the game once flight is online. Plan around the early-level restrictions.",

  'running-animal': "Awakened animals whose source animal is built for sustained ground speed — horses, antelope, big cats. Increased land [[speed|Speed]] above the standard 25 ft baseline. Excellent for any Awakened Animal in overland-travel-heavy campaigns or chase-scene stories. Pairs with Ranger, Barbarian, or any mobile martial.",

  'swimming-animal': "Awakened animals whose source animal is aquatic — orcas, otters, sharks (with form variation). Swim [[speed|Speed]] equal to your land speed, often with breath-holding bonuses. Best for water-heavy campaigns. Pairs with Druid (Storm or Untamed) or Ranger for a fully aquatic predator concept.",

  // ─── CENTAUR heritages (HotW) ───────────────────────────────────────────

  'fleetwind-centaur': "Centaurs of light, slender build — speed over strength. Increased [[speed|Speed]] above the Centaur baseline, plus reduced encumbrance from light loads. Excellent for skirmisher or scout-style Centaurs. Pairs with Ranger or Rogue (yes, a [[size|Large]] Rogue is unusual but workable in open terrain).",

  'ironhoof-centaur': "Centaurs whose hooves are denser and stronger than average — natural weapons that work even when you're unarmed. Hoof [[ancestry-feat|unarmed attack]] that deals notable bludgeoning damage. Pairs well with martial builds; the hoof attack scales with weapon proficiency, so a Fighter Centaur with Iron Hoof has a real backup strike.",

  'mottle-coat-centaur': "Centaurs with naturally camouflaging coat patterns. Bonus on [[stealth|Stealth]] checks in natural terrain. Useful for any Centaur built as a scout, hunter, or wilderness operative. Pair with Ranger or Druid for a 'predator of the plains' concept.",

  'ponygait-centaur': "Centaurs of smaller stature — closer to pony than horse scale. Sometimes Medium instead of [[size|Large]] (verify against data), which solves the dungeon-corridor problem most Centaurs face. Pick this when your concept is a Centaur character without the Large-size logistical headaches.",

  'stoutheart-centaur': "Centaurs of unshakable will — emotional resilience runs in their bloodlines. Bonus on [[will|Will]] saves against fear and emotion-based effects. Excellent for any campaign with fear-heavy opposition. Pairs naturally with the Centaur's already-solid frontline durability.",

  // ─── MERFOLK heritages (HotW) ───────────────────────────────────────────

  'carcharodon-merfolk': "Merfolk with shark-blooded ancestry — sharper teeth, more predatory drive, frenzy when blood is in the water. Bite [[ancestry-feat|unarmed attack]] plus situational bonuses when enemies are wounded. Best for aggressive aquatic combat; pairs with Barbarian for the ocean-predator fantasy.",

  'pelagic-merfolk': "Merfolk from the open deep ocean — far from coasts, where pressure and dark are constants. Pressure resistance plus improved [[vision|Low-Light Vision]] in deep water. Best for any Merfolk built for deep-water campaigns or stories that descend into the ocean's lower reaches.",

  'reef-merfolk': "Merfolk from shallow coral reef ecosystems — colorful, social, more comfortable in warm coastal waters. Bonus on [[stealth|Stealth]] checks in reef and shallow-water environments via chromatic adaptation. Best for coastal campaigns; pairs with Rogue or Ranger for a reef-ambusher concept.",

  'sailfish-merfolk': "Merfolk with fin-shaped sails and streamlined bodies — built for speed rather than strength. Increased swim [[speed|Speed]] above the Merfolk baseline. Best for any Merfolk built as an aquatic scout, chase specialist, or hit-and-run skirmisher. Pairs naturally with Swashbuckler or Ranger.",

  // ─── MINOTAUR heritages (HotW) ──────────────────────────────────────────

  'ghost-bull-minotaur': "Minotaurs of pale, ghost-like complexion — bloodlines that have walked close to death and returned. Resistance to [[ability-flaw|negative]] / necrotic damage and bonus saves against death effects. Excellent for undead-heavy campaigns. Pair with Champion or Cleric for an anti-undead crusader build.",

  'glacier-cavern-minotaur': "Minotaurs from cold, deep cavern systems — combining cold-adaptation with the standard Minotaur dungeon-comfort. Cold resistance plus improved [[vision|Darkvision]]. Best for arctic / glacial / Darklands campaigns. Pairs with Barbarian for a primal ice-warrior fantasy.",

  'littlehorn-minotaur': "Minotaurs with smaller horns and a slighter frame — sometimes [[size|Medium]] instead of Large (verify against data). Pick this for a Minotaur character without the Large-size dungeon problems. The smaller horns may reduce the gore attack's damage compared to other Minotaurs but solve the corridor-fit issue.",

  'roaming-minotaur': "Minotaurs from nomadic herds — long-distance travelers rather than labyrinth-bound. Reduced fatigue from long marches and improved [[survival|Survival]] in unfamiliar terrain. Excellent for exploration-heavy campaigns or any party that does significant overland travel.",

  'slabsoul-minotaur': "Minotaurs of unshakable emotional resilience — the bull-headed stoicism made literal. Bonus on [[will|Will]] saves against fear and emotion effects. Excellent for campaigns with fear-heavy opposition; pairs naturally with the Minotaur's already-solid frontline durability.",

  'stalker-minotaur': "Minotaurs trained for hunting through twisting, complex terrain — masters of the labyrinth they came from. Bonus on [[stealth|Stealth]] and [[perception|Perception]] in dungeon-like environments. Excellent for any Minotaur built as a hunter, scout, or trap-setter rather than a pure frontliner. Pairs with Ranger for full predator-in-the-maze flavor.",

  // ─── SURKI heritages (HotW) ─────────────────────────────────────────────

  'elytron-surki': "Surki with hardened elytra (beetle wing covers) folded across their backs. Natural armor adds to [[armor-class|AC]], plus gliding capability via extended elytra during falls. Excellent for tank-style Surki or any character built around vertical maneuvering. Pairs with Champion or Fighter for full insectoid-knight aesthetic.",

  'hardshell-surki': "Surki with reinforced chitin plating — significantly tougher exoskeleton than standard. Extra [[hit-points|HP]] at level 1 plus minor physical damage resistance. Best for frontline builds where the extra durability compounds with class HP. Pairs with Barbarian or Champion to push the resilience peak.",

  'lantern-surki': "Surki with bioluminescent patches — natural light sources that pulse with mood and intent. Can produce light at will (action-free for dim, brief action for brighter), plus minor communication via light patterns. Excellent for dungeon explorers (built-in light source) or party support roles. Pairs with any class — utility is universal.",
};

export function getHeritageTip(slug) {
  return HERITAGE_TIPS[slug] || null;
}
