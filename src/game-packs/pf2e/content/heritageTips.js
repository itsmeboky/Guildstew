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

  'vine-leshy': "Leshy with prehensile vines that extend reach. Extended reach for some manipulations and grappling. Useful for grapple-focused builds, climbing-heavy campaigns, or characters who want to manipulate distant objects.",

  // ─── ORC heritages ──────────────────────────────────────────────────────

  'badlands-orc': "Orcs adapted to scorched dry desert wastelands. Heat resistance and improved water-rationing. Best for desert campaigns or arid-region adventures. Pairs naturally with martial Orc builds — your durability extends through environmental hardship.",

  'battle-ready-orc': "Orcs raised in martial cultures, trained for war from childhood. Trained in [[intimidation|Intimidation]] automatically. Solid for any Orc who'll be the party's frontline aggressor — Intimidation's Demoralize action is one of the best in-combat skill uses in the game.",

  'deep-orc': "Orcs from the Darklands depths. Upgraded vision: [[vision|Darkvision]] extends further than standard. Useful for any subterranean campaign. Pairs with Druid, Ranger, or Rogue who'll be scouting in lightless conditions.",

  'grave-orc': "Orcs descended from cultures that have warred against undead for generations. Resistance to void / necrotic damage. Excellent for undead-heavy campaigns (Carrion Crown, Strength of Thousands, anything with a lich antagonist).",

  'hold-scarred-orc': "Orcs whose scars from clan war training have given them additional toughness. Extra [[hit-points|HP]] at level 1. Solid universal pick — more HP compounds well for the already-durable Orc base.",

  'rainfall-orc': "Orcs from coastal or river-dwelling clans. Swim speed and minor water adaptation. Good for water-heavy campaigns. Pair with Druid or Ranger for a fully water-themed Orc.",

  'winter-orc': "Orcs from northern frozen lands. Cold resistance scaling with your [[level]]. Best for arctic / northern campaigns. Pair with Barbarian for an ice-blooded warrior who feels right at home in blizzard fights.",
};

export function getHeritageTip(slug) {
  return HERITAGE_TIPS[slug] || null;
}
