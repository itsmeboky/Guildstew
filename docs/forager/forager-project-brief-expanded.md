# Forager — Expanded Project Brief

**Working name:** Forager
**Companion to:** Guildstew
**Status:** Vision locked. Browser prototype running. Production planning expanded with full feature set.

*This is the comprehensive version. Every feature from our conversations plus the additions research surfaced from current GM pain points and active community feature requests.*

---

## What Forager Is

Forager is a **living-world map and simulation tool** that runs alongside Guildstew. It is not a VTT. It is not Inkarnate. It is the first product in the TTRPG space to combine paint-driven world authoring, an underlying simulation graph, real-time tick engine, integrated GM workflow tools, and an entity system with genuine agency — all built on top of an existing campaign management platform with combat engine, character sheets, marketplace, and subscription infrastructure already shipping.

A GM paints a village. The village lives. NPCs follow schedules. Companions track scent. The watchman patrols and remembers faces. The party fast-forwards two game weeks and returns to a world that has lived without them. When combat starts, Forager hands off to Guildstew's combat engine cleanly. When prep ends, the whole world publishes to the marketplace as content other GMs can buy or download free.

This brief covers every system the production version will support, organized for planning. Some features are MVP-day-one. Some are phase-two. Some are stretch goals worth declaring early so the architecture leaves room for them.

---

## Why It Matters — Now With Research-Grounded Evidence

The TTRPG community is loud about its pain points. Forager addresses every major one.

**Prep time is the #1 GM complaint.** Active community threads report GMs spending 10–30 hours per week on prep, and the consensus is that current VTT tools *increase* total prep load rather than reduce it. The Lazy DM movement (Sly Flourish) and similar minimal-prep philosophies exist precisely because the tools demand too much. Forager attacks this directly: auto-generated fog of war, auto-extracted simulation graph from painted geometry, AI procgen for towns and dungeons, schedule templates, encounter library, session recaps generated from simulation events.

**Tool fragmentation is the second-biggest complaint.** GMs juggle Roll20 + D&D Beyond + Notion + Obsidian + OneNote + Google Docs + a wiki + Discord + a separate party-loot app + a separate initiative tracker + a separate dice roller. Every survey, forum thread, and review reinforces the same conclusion: the holy grail is *unification.* Forager and Guildstew together replace nine tools with one.

**Encounter builders have been quietly abandoned.** D&D Beyond received explicit user backlash for letting their encounter builder atrophy while focusing on Maps. Multiple long threads from frustrated GMs. Forager rebuilds the encounter builder, fully integrated with the map and Combat Engine v2.

**Dynamic lighting is a setup nightmare.** Roll20's dynamic lighting requires extensive per-map setup. Players complain about performance on low-end machines. Forager's auto-FOW eliminates the manual setup entirely; lighting is a property of placed objects, not authored polygons.

**Party loot management is a hand-maintained spreadsheet for almost everyone.** Active third-party apps (Party Loot, Foundry's Party Inventory module, custom Google Sheets) exist solely to fill this gap. Forager bakes a proper loot management system in.

**Note-taking is fragmented and disconnected from the world.** Obsidian's "knowledge graph" approach is loved because it lets NPCs, locations, and plot threads cross-link. Quest Portal's multiplayer notes are praised as a killer feature. Forager's notes link directly into the world — the NPC entry in the note links to the actual NPC in the simulation.

**Hand-drawn / improv mapping is underserved.** Many GMs prefer to sketch maps live during play. Excalidraw integration is on the roadmap; the Brewery already plans a sketch tool. Forager treats minimal-prep GMs as a first-class audience.

**Hybrid in-person + digital play is the fastest-growing use case.** GMs running games at physical tables with a TV-cast view for players. Forager designs for this from day one with player-view vs GM-view separation.

**AI-skeptic GMs are a vocal segment.** Multiple users have stated they would *pay extra* for guarantees against AI features. Forager respects this: every AI feature has a non-AI equivalent (procgen has random tables; AI description generation has manual templates), and AI features are opt-in at the user-preferences level, not mandatory.

The combined picture: every major VTT serves *some* of these needs and misses others. Nobody serves all of them. Forager is the first to attempt unification on top of an existing campaign platform that already handles character sheets, combat, marketplace, and subscriptions.

---

## Strategic Architecture (Unchanged)

Forager is a **lazy-loaded module inside Guildstew**, not a separate application. Users who never open a map pay no bundle cost. Users in a map share Guildstew's auth, Compendium, Realtime, and storage. No cross-app sync layer, no second deployment, no duplicated state.

The engine follows the same three-layer philosophy as Combat Engine v2:

- **Universal Map Engine** — game-pack-agnostic. Knows about rooms, exits, entities, schedules, simulation time. Lives in `src/maps/engine/`.
- **Game Pack Map Adapters** — system-specific. Handle movement conversions, vision rules, combat triggers per game system. Live inside each game pack.
- **UI Layer** — React + Three.js (orthographic, already in stack) + Framer Motion + Tailwind/shadcn.

---

## Section A — Core World Authoring

### The Three-Layer Paint Stack

**Layer 1, Terrain Paint.** Grass, water, dirt, stone, sand, mud, snow, lava, ice, road — each carrying full metadata: speed modifier, stamina cost, damage per tick, footprint persistence, light absorption, swim requirement, fall damage, climbable, sound type. Terrain is *systems,* not skins.

**Layer 2, Structures and Objects.** Buildings (auto-rooms with doorways), trees (sight occluders), bushes (sight occluders + stealth zones), walls (block movement and sight), paths (auto-generate graph edges), light sources, decor (chairs, barrels, statues), interactive objects (containers, doors, levers).

**Layer 3, Entities.** NPCs, monsters, items, mounts, animal companions, hirelings, encounter triggers, scene transitions, weather emitters, sound emitters.

### Auto-Generated Simulation Graph

Placing a building creates a room node. Drawing a path between buildings creates a graph edge through their doorways. Scattering trees registers occluders for FOW and obstacles for pathfinding. The GM paints a world; the graph is the byproduct.

### Auto-Generated Fog of War

Every wall, tree trunk, building edge, and custom wall registers itself as an occluder when placed. The runtime FOW is a raycast visibility polygon computed per-player. No manual masking ever. Dungeon-style raycast FOW activates in dark/enclosed scenes; daylight overworld renders top-down with no FOW; night uses moonlight falloff.

### Per-Token Vision (Darkvision, Truesight, Blindsight)

Each character can have its own vision properties — vision range, darkvision range, can-see-through-illusions, can-see-invisible, can-see-through-fog, magical detection. The visibility polygon is computed per-character with their specific rules. Solves the "the dwarf can see in the dark but the human can't" problem that current VTTs handle poorly.

### Scene System

Multiple scenes per campaign — overworld, dungeon, ship interior, dream sequence, wilderness region, mansion, sewer system, otherworld. Each has its own ambient profile, painted geometry, NPCs. Transitions are points players walk into. Every scene ticks the simulation every frame, regardless of which one is being rendered.

### Multi-Story Buildings and Vertical Levels

Buildings can have multiple floors. The tavern has ground floor for drinking, second floor for rooms, cellar for the smuggling operation. Stairs and ladders are transition points. Each floor is its own scene attached to the parent building. Critical for any real architecture — castles, wizard towers, mansions, megadungeons.

### Naval and Water Travel

Boats and ships are entities. Crossing water requires a boat or a swim check. Ships have decks paintable as their own scenes — below deck is a separate map. Naval combat. Drowning mechanic. Diving for treasure.

---

## Section B — The Simulation

### Time and Pacing

Game clock advances in minutes. Pacing follows Sims-style controls:
- **Normal (1x):** 5 real minutes = 1 game hour (clock ticks like a clock)
- **Fast (2.5x):** 2 real minutes = 1 game hour
- **Faster (5x):** 1 real minute = 1 game hour
- **Paused:** halts simulation entirely

Day/Night quick-jump buttons snap to noon and midnight for atmospheric checks without waiting.

### Time-of-Day Behaviors

Markets fill in mornings and empty in afternoons. Taverns crowd at dusk. The watch changes shifts at dawn and sundown. Children play in the square between 3-5pm. Drunkards stumble home at 11pm. All of it emerges from individual NPC schedules running in parallel.

### Lighting

Per-scene ambient mode driven by time-of-day and scene type. Day (full top-down visibility), Dusk (warm purple, slight darkening), Night (moonlight with cool falloff, still visible), Dungeon (raycast FOW with torch radius), Cave (no ambient light at all, only placed light sources). Light sources are additive: torches, lanterns, magical glow, campfires, flickering candles. Light interacts with weather (rain extinguishes torches).

### Weather

Rain, fog, snow, wind, storm, hail, sandstorm, blizzard. Weather is a system that interacts with everything else: rain extinguishes flame, fog reduces vision, snow leaves tracks, wind disperses scent, storms damage structures, fog enables daytime FOW. NPC schedules account for weather — the baker stays home in a downpour. GM can schedule forecasts or override the weather by hand.

### Calendar, Seasons, Festivals, Anniversaries

Year-long calendar with months, days, seasons, holy days, festivals, and personal anniversaries. Seasonal weather patterns. Festivals reshape towns (harvest fair, dark moon ritual, royal birthday). NPCs commemorate personal dates (the smith's daughter died three years ago today). The party's own actions become anniversaries (the day they defeated the lich, celebrated as a holiday in the village they saved).

### Sound Propagation

Every action generates sound. Footsteps on stone are louder than on grass. Combat is loud. Doors creak. Bells ring. Explosions wake the dead. Sound propagates: muffled by walls, dampened by distance, carried by wind, dulled by rain. NPCs hear what reaches them and react. *Stealth becomes more than line-of-sight.*

### Scent Tracking

Entities leave scent trails — a fading line of recent positions. Terrain holds scent differently. Rain washes it. Wind disperses it. Magical effects mask it. Bloodhounds, wolves, certain monsters track by scent. Players with the right skill can read trails too. *Mystery and tracking gameplay get an actual physics layer.*

### Tracks in Mud/Snow

Footprints persist in mud, snow, blood, and wet conditions. Trackers can examine paths, roll checks, and learn who passed, when, and which direction. *Forensic investigation becomes a real mechanic.*

### Persistent World Memory

Every meaningful event persists. Burned buildings stay burned. Dead NPCs stay dead. Stolen items have ownership history. Dispositions persist. The campaign's map is a save file that grows. Production goes to Supabase for persistence; the database is the world's memory.

### Random World Events

The simulation rolls on event tables at intervals. In any town, on any game day, there's a small chance of: a fire, a death, a birth, a wedding announcement, a traveling merchant arriving, news of a distant disaster, a thief caught in the act, a religious procession, a noble in the streets, a stray dog. Most atmospheric. Some are quest hooks. *Things happen without the GM staging them.*

### Emergent Storytelling

All systems interact. Weather + NPC schedule + player action = unscripted moments. The baker walks to market in the rain. The drunk fighter splashes her with mud. Disposition drops. Three sessions later the party needs a favor and Margery says no. *That story emerged.* Forager doesn't write stories; it creates the conditions for stories to write themselves.

---

## Section C — Entities With Agency

### NPCs

Three behavior archetypes ship at MVP:

- **Schedule-following** (shopkeepers, residents). Time-of-day-driven, building-to-building routine.
- **Patrol** (guards, sentries). Waypoint-based routes that loop.
- **Aggro-on-proximity** (hostile creatures). Detect player within range, pursue, trigger combat.

Behavior archetypes are stackable. A hostile guard *also* has a patrol schedule.

### NPC Memory

Every NPC carries a memory log. Tracks events involving the party. The smith remembers you bought the longsword. The barkeep remembers you started the brawl. The merchant your party robbed in Chapter Two: three chapters later, his brother knows your faces. *Memory persists across sessions.*

### NPC Disposition

Disposition toward each party member is a number that shifts based on events. Friendly, neutral, hostile, suspicious. Drives reactions and dialogue. Layered with memory: the NPC remembers *why* their disposition is what it is.

### Gossip Propagation

Significant events spread between NPCs who would plausibly talk. The crime committed in the harbor district reaches the inquisitor's office in two game days. The favor done for the smith's daughter reaches her cousin the watch captain. *Information is a network.*

### Mounts

A real entity in the world. Saddle slots, inventory, stamina, loyalty, terrain affinity, and persistent state. The warhorse takes a wound and limps for three sessions until healed. The riding mule kicks the apprentice. The dire wolf grows over the campaign. Different mounts for different terrain (horse, camel, mountain goat, dire wolf, griffon, donkey). Stables as buildings where mounts live when unused. They eat. They wander off if untended. Combat contributions: charge bonus, mounted archery, dismount as action, panic from loud noise. Trained warhorse holds; pack pony bolts.

### Animal Companions and Familiars

Entities in the simulation with personality traits and autonomous behavior. The ranger's wolf has a trait — loyal, curious, lazy, protective, mischievous, cowardly, cunning — that drives behavior. The wolf sleeps near the ranger at night, patrols at dusk, wanders during downtime. Companions roll on tables during simulation idle time and occasionally produce events: *the wolf returns at dawn with a kill / a missing locket / a strange amulet.* Bonds to specific party members. Real persistence — hurt, killed, lost, trained, leveled. Type-specific behaviors: wolves track scent, ravens scout from above, weasels squeeze into spaces, pseudodragons detect magic.

### Hirelings and Followers

Real NPCs with stats, schedules, wages, loyalty. Torchbearers, porters, hireling fighters, guides. They eat, sleep, charge wages, can be sent on errands during downtime. *"Bram, scout the road to Halethorne and report back in two days."* Bram leaves. Two days pass. Bram returns with information the simulation generated. Loyalty isn't fake — hirelings remember mistreatment. Defection is real.

### Crowds and Background NPCs

Simplified background entities for crowd scenes — drunks at the tavern, market shoppers, kids in the square. They wander on procedural patterns within bounded areas. Don't carry full schedules or memory; they exist to make scenes feel inhabited. Click any one to "promote" it to a full NPC with name, schedule, disposition if it becomes important.

---

## Section D — Social Systems

### Factions

Every NPC belongs to one or more factions. Faction is a tag with weight. NPCs of a faction share information. Faction-aligned NPCs react to the same triggers. Wear a faction's livery and faction members treat you differently. Wear the wrong one and react accordingly.

### Reputation

Tracked per-region and per-faction. Heroes attract followers. Criminals attract guards. Reputation propagates with the gossip system.

### Disguises

Real system. The rogue puts on a dead guard's tabard. NPC checks vary by familiarity — a guard who served with the dead man sees through it; a recruit who joined yesterday doesn't. Disguises can break — bleed, rain, hard running, challenged with a passphrase. Combined with memory: *being recognized is constant low-grade tension.* Visible faction marks reveal alignment unless concealed.

### Crime, Witnesses, and Law

Witnessed crimes get reported. Bounties posted on the wanted board (which is a real entity painted on a tavern wall). The town watch knows faces. Guards in different regions share intelligence imperfectly. Justice is a slow simulated network. The mob justice of lawless regions is its own subsystem.

---

## Section E — Resource and Economic Systems

### Foraging — The App's Namesake

A full system. Biomes contain harvestable resources tied to terrain and season. Forests yield mushrooms, herbs, deadfall wood, nuts. Mountains have ore, gems. Coasts have shellfish, seaweed, driftwood. Each biome rolls on a flora-and-fauna table. The party searches a tile or area — skill check or time-take — and gets results based on terrain, season, weather, skill. *Time in the wilderness becomes gameplay with economic and survival output.* Tied to companion AI: the ranger's wolf returns from the woods with a rabbit as a system-generated event.

### Hunting

Game lives in biomes. Deer, boar, bear, exotic creatures. Hunters track, stalk, and bring down food. Hunting tied to weather, season, and time of day. Pelts and meat are real resources.

### Crafting Stations

Forges, alchemy benches, looms, cooking pots, scribing desks. Each is a placed object in a building. Crafting requires the right station + materials. Players sit at the station for game time and produce output. Production scales with skill.

### Trade and Economy

Prices fluctuate by region. Salt costs more inland. Spices cost more far from spice ports. Caravans bring goods between cities on visible routes. Player merchants can run actual trade routes. Market manipulation possible.

### Owned Property and Theft

Players own specific items by reference in the world. Locked containers. Houses they buy. Ships they captain. Stolen items can be traced back, fenced through criminal connections, or recovered. Property has insurance / inheritance mechanics for high-stakes campaigns.

### Player-Owned Settlements (Stretch)

Players can found a base. Build walls. Set up traps. Hire defenders. Trade goods. Attacked by enemies in their absence. Returns to find consequences.

---

## Section F — GM Workflow Tools (The Big Research Section)

This is where Forager solves the *tool fragmentation* problem. Every standalone third-party GM tool that exists today gets absorbed.

### The Encounter Builder

A proper drag-and-drop encounter builder with CR balancing. Templates. Loot generation. Pre-placed tokens for upcoming combats that *don't clutter the active map.* Encounter library — save reusable encounters and drop them into combat mid-session. Combat Engine v2 reads encounter setups directly. Solves the D&D Beyond / Roll20 encounter builder gap.

### Loot and Inventory Management

Built-in party loot tracker — gold, items, magical treasures, with assignment per-character. Drop-and-share mechanics: GM drops a chest's contents into the *party pool,* players claim items. Automatic gold splitting. Transaction history. Session-tagged loot timeline. Shops with merchants, custom inventories, browseable purchases.

Pulls from the campaign's Compendium for items. Custom items authorable on-the-fly. Loot persists with the party across sessions. **Solves the Party Loot / Foundry Party Inventory / Google Sheets fragmentation pain.**

### The DM Screen

A customizable single-screen dashboard the GM has up during play. Configurable panels: combat tracker, initiative order, active conditions, current weather, current time, current room, NPCs in current scene, recent player actions, plot threads relevant to here, secret notes only visible to GM. *Customisable quick tabs on one screen* — the most-upvoted feature request in multiple community forums for years, finally shipped.

### Campaign Notes with Hyperlinking

Obsidian-style knowledge-graph note system, integrated with the world. Every NPC entry hyperlinks to the actual NPC entity. Every location hyperlinks to the actual map scene. Plot threads link to the entities they involve. *Notes aren't separate from the world; they're a view onto the world.* Multiplayer collaborative notes (Quest Portal-style) — players and GMs see each other's cursors, edit in real time. Roll buttons inside notes for in-line dice. Toggle visibility per-player (secret info for some, public for others).

### Plot Thread Tracker

A visual board of active plot threads with states (active, complete, dormant, escalating). Threads link to involved NPCs, locations, and factions. The state of each thread is partly authored, partly emergent — threads escalate when relevant NPCs make moves in the simulation.

### Session Recap Generator

Auto-generated session recap from simulation events, dice rolls, location changes, NPC interactions, combat outcomes. Editable summary, shareable with players. Solves the post-session prep tax that GMs complain about constantly.

### Pre-Session Briefing

When the GM opens a campaign before a session, Forager surfaces: last session's recap, current location, plot threads in progress, NPCs the party last interacted with, what changed in the world since last play (the village they left a week ago has had a week of simulation). *The GM walks into the session already in-context.*

### Random Generators (Non-AI)

For GMs who don't want AI: classic random tables. NPC names by culture/race. Tavern names. Encounter tables by terrain. Treasure tables by CR. Plot complications. *Roll a button, get a result, drop it into the world.* These coexist with the AI procgen for users who want either or both.

### Quick Sketch Mode

Excalidraw-style hand-drawn whiteboard mode for improv-heavy GMs. Quick sketch a map mid-session, drop tokens, run a fight. Doesn't pull from the simulation — explicitly for "I didn't prep this." Switches back to full Forager when the moment is over. Caters to the Lazy DM philosophy and minimal-prep audience.

### Adventure / Module Authoring

Multi-scene authoring tools for module creators. Plot trees, location maps, NPC schedules, faction relationships, encounter lists — all assembled into a single Pub or Adventure that other GMs can buy or download free from the Brewery/Tavern.

### Co-GM Support

Multiple GMs on a campaign with different permission levels. Hand off control. One GM runs combat while the other runs NPCs. Permission tiers: full GM, scene GM (only their scenes), assistant (read + propose changes).

### Encounter and NPC Templates Library

Save any NPC, encounter, building, room, or schedule as a reusable template. Drop into another campaign. Publish to Brewery as content. Build a personal library that compounds over years of GMing.

### Schedule Editor

Drag-and-drop UI for authoring NPC schedules. Visual timeline of a day, drag blocks for "at bakery" / "at market" / "asleep" / "patrol route alpha." Templates for common archetypes (shopkeeper, watchman, noble, beggar).

### Faction Editor

UI for authoring factions, their relationships, their territories, their members, their goals. Faction relationships displayed as a visual graph. Set a faction's goal and watch the simulation pursue it through its member NPCs.

---

## Section G — Player Experience Features

### Player Handouts as World Objects

Custom documents tied to scenes — a letter on a desk, a contract on a tavern wall, a journal in a chest. The player examines the object, reads the handout. Discovered handouts go into player inventory. Some are obvious (the wanted poster); some hidden (the letter under the floorboard). *The handout IS the world.*

### Per-Player Visibility (Fog of Knowledge)

Notes, NPCs, items, even map regions can be visible only to specific players. Critical for split parties, secret missions, divided loyalties. The rogue's secret patron is real to her player and absent to the others.

### MUD-Style Interaction Verbs

Look. Examine. Search. Listen. Climb. Push. Pull. Talk. Steal. Each is a real player action with a real mechanical resolution. Examine the bookshelf: get description, possible hidden compartment with a check. Listen at the door: hear conversation through walls. Climb the cliff: skill check, fall distance, chance of dropped torch. The world has *texture* the player runs hands across.

### Player-Visible Inspector

When players click on an entity (with permission), they see what they should know — disposition surface signals, public information, what they've personally witnessed. Doesn't reveal GM-private state. The Inspector is permission-gated, not all-or-nothing.

### Stealth System

Step into bushes, become hidden. Hostile NPCs can't detect. Aggro breaks after 1.8 seconds of hiding. Layered with sound (running while hiding is loud) and scent (bloodhounds bypass bushes) for real depth.

### Eavesdropping

NPCs talk to each other in the background. Sit nearby and the system surfaces their conversation. Tail an NPC and overhear their messages. Skill check for *not being noticed* while eavesdropping.

### Quests Emerge from World State

No quest log. Quests live in the world: the wanted poster, the desperate father pacing the market, the courier's body in the woods. Quest tracking happens in the player's head and the simulation's state. *The story isn't in a journal; it's in the place.*

### Mobile and Tablet Play

Mobile-friendly UI for in-session reference, character sheet access, and limited editing. Tablet support optimized for in-person play at the physical table. Touchscreen-friendly tap targets.

### Streaming and Spectator Mode

Read-only view for spectators. OBS-friendly output for Twitch streaming. Player portraits / scene framing for productions like Critical Role-style streams. Hybrid in-person / digital support: TV-cast player view (no GM info) while the GM keeps full view on their screen.

### Per-Player Vision Differences

Darkvision dwarves see what humans don't. Truesight clerics see through illusions. Blindsight monks see in the dark. Each player's view of the world reflects their character's senses. *Solves the constant Roll20/Foundry pain of "the human player feels left out because she doesn't have darkvision."*

---

## Section H — Combat Integration

### Combat Engine v2 Handoff

Hostile NPC contact (or scripted trigger) calls `combatEngine.startEncounter(participants, mapState)`. Combat resolves in the existing engine. Control returns to map with updated state. Interface is one event in each direction.

### Spell Area Templates

Cone, sphere, line, cube, cylinder. Drag from a character sheet's spell entry onto the map; the template renders with proper geometry. Affected entities highlighted. Combined with terrain rules: walls block the cone; high ground extends the line; difficult terrain absorbs effects differently.

### Range and Movement Indicators

When a player selects their token to move, a translucent range circle shows: walk distance, dash distance, reach for attacks, spell ranges. Click and drag to plan movement; the system tracks "if you go here, you've used X feet of your movement." Solves a major positioning-confusion pain point in current VTTs.

### Cover and Concealment

Half-cover, three-quarters cover, total cover — driven by line geometry. Concealment (heavy fog, darkness, foliage) handled separately from cover. Combat math respects both.

### Initiative Tracker

Built into the DM screen. Drag-to-reorder. Surprise rounds. Held actions. Reactions. Multi-character rolls. *Already exists in Combat Engine v2; Forager just surfaces it on the map.*

### Condition Tracking

Token overlays for poisoned, prone, paralyzed, frightened, charmed, blinded, etc. Visual at a glance. Conditions interact with movement and vision (blinded character can't see; prone character has half speed).

### Vehicle and Mount Combat

Mounted combat with charge bonus. Ship-to-ship combat with crew positions. Wagons can be chased. Vehicle hit points, damage thresholds, crew morale.

---

## Section I — Magic Systems

### Visible Magic Auras

Spells leave auras for X game minutes after casting. Magical items glow faintly to detection magic. Wards on doors and books are *visible* to the right senses. *Detection becomes a real action, not a sheet-based query.*

### Magical Zones

Wild magic regions where spells go strange. Anti-magic fields. Ley line confluences that boost spell power. Areas of effect persist in the world (the cursed forest stays cursed).

### Illusions

Illusion-tagged entities. Pass perception/investigation/insight checks to see through. Truesight bypasses automatically. *The bandit who's actually a doppelganger renders convincingly to everyone but the truth-seer.*

### Ritual and Long Casting

Rituals can be performed at appropriate locations (altars, ley lines, summoning circles). They take game time. The simulation continues running while the ritual is performed; consequences can unfold.

---

## Section J — Content & Marketplace

### Maps as Pubs and Adventures

Authored maps publish to the Brewery as free **Pubs** or to the Tavern (admin-vetted) as paid **Adventures**. Map content references the **Pints** and **Brews** it depends on (NPCs, monsters, items, custom terrain). Marketplace download installs all referenced content + adds the map to the campaign.

### Room Maker

Dedicated authoring tool for building interiors and complete buildings. Same tools as outdoor map, scoped to a footprint. Outputs Pints (single room), Brews (multi-room buildings), or Pubs (full modules).

### Encounter Library

Saved encounters publishable to the marketplace. Drop a bought encounter into combat instantly.

### NPC Templates and Personality Packs

Pre-authored NPC archetypes. The Grumpy Barkeep. The Mysterious Stranger. The Earnest Apprentice. Drop in, customize. Authorable and shareable.

### Mount and Companion Packs

Authored mount stat blocks, companion personalities, animal behavior tables. Marketplace content.

### Adventure-in-a-Box

A full Adventure: map + NPCs + plot + lore + handouts + encounters + loot tables. One purchase, one install, ready to play. *This is the format every TTRPG publisher has been trying to build for two decades.* Forager makes it actually possible.

---

## Section K — AI Features (Opt-In, With Non-AI Fallbacks)

Every AI feature has a non-AI equivalent. AI is opt-in at the user level.

**Edge Functions (Adventurer tier and above):**
- `procgen-dungeon` — generates dungeon graph with rooms, NPCs, treasure
- `procgen-town` — generates town layout, buildings, residents, schedules
- `procgen-wilderness` — generates region with biome, POIs, encounter table
- `generate-room-description` — writes lore blurb for a building
- `populate-npc-schedule` — generates believable daily schedule
- `generate-npc-portrait` — image generation, follows existing pattern
- `summarize-session` — turns session events into prose recap
- `generate-quest-hook` — given current world state, suggests next quest
- `voice-of-npc` — short dialogue lines for an NPC based on their personality
- `name-this` — generic name generator with cultural/genre filtering

**Non-AI equivalents for AI-skeptics:**
- Random tables for procgen (rooms, NPCs, treasure, weather, encounters)
- Manual template descriptions
- Hand-authored schedule library
- Portrait library / token packs
- Session events logged automatically, recap manually written
- Plot hook tables
- NPC dialogue prompts written by hand
- Name lists by culture/race/gender

This addresses both pro-AI and anti-AI camps. The product never demands AI. The product offers AI to users who want it.

---

## Section L — Mobile, Tablet, and Hybrid Play

### Mobile App

iOS and Android apps for player-side use. View the map. Reference character sheet. Roll dice. View loot. Receive handouts. Limited editing for GMs on the go.

### Tablet Optimization

Touch-friendly targets. Pinch-zoom. Drag-to-paint. Designed for in-person play at the physical table where players have iPads.

### Hybrid Casting Mode

GM runs the map on a laptop. A separate "player view" outputs to a TV or projector at the physical table. Players see what they should see (no GM private info). GM sees everything. *Solves the in-person + digital hybrid use case that's the fastest-growing TTRPG segment.*

### Offline Mode

Limited offline support for in-person play with bad wifi. Local caching. Sync when reconnected.

---

## Section M — Streaming and Production

### Spectator Mode

Read-only view for spectators. Strip GM info. Player portraits visible. *Twitch-friendly.*

### OBS Integration

Scene-aware output for streamers. Lower-thirds with character names. Initiative tracker visible to viewers. Music transitions tied to scene changes.

### Theatrical Camera

Auto-zoom on important dialogue. Frame combat starts. Pan when players enter new areas. *Cinematic moments for streamed games.*

### Player Portraits and Name Tags

Player-side stylized portraits visible during scenes. Name tags with character info. Critical Role-style production values *built in.*

---

## Section N — Guildstew Integration Points

| System | How Forager Integrates |
|---|---|
| **Compendium** | Map entities reference Compendium IDs for stats. Custom Pints (NPCs, items, terrain, companions, mounts) authored at the table appear on maps via the same Compendium. |
| **Combat Engine v2** | Hostile contact or scripted trigger hands off via `startEncounter(participants, mapState)`. Control returns to the map after combat resolves. |
| **Brewery / Tavern** | Maps publish as Pubs (free) or Adventures (paid). Same flow as existing rules content. |
| **Subscription Tiers** | Free: 2–3 maps per campaign. Adventurer: 10+ maps + AI procgen + Brewery publishing. Veteran: unlimited maps + Tavern publishing. Guild: shared map library in Vault + multi-GM. |
| **Supabase Realtime** | GM-authoritative map state. Players subscribe. Same pattern as combat. |
| **Edge Functions** | All AI features. Keys stay server-side. |
| **Storage** | Maps under `users/{user_id}/campaigns/{campaign_id}/maps/` or `guilds/{guild_id}/vault/maps/`. |
| **Character Sheets** | Forager NPCs/mounts/companions reference character sheet IDs. Sheet rolls fire from inside the map (e.g., perception check while examining a chest). |
| **Trade System** | Loot management ties into existing trade system for inter-character item passing. |
| **NPC Manager** | Forager NPCs integrate with the existing campaign-scoped NPC system. |
| **House Rules** | Map system respects per-campaign rule overrides (e.g., movement speed conversions, vision range modifiers). |
| **Session Zero Config** | Map content respects content warnings and consent settings (e.g., no graphic violence options, no harm-to-animals options). |
| **Forums and Blog** | Map creators can post tutorials, share workflows, build community. |
| **Achievements / Legend Tracker** | Map-driven achievements (visited 100 unique locations, found 50 hidden items, etc.) |
| **Guild Vault** | Subscription guilds share a map library. Members can build maps collaboratively. |
| **Guild Hall (in-game)** | The minigame guild hall can be visualized as a Forager scene that party members visit. |

---

## Section O — Tech Stack (Matches Guildstew)

- **Frontend:** React 18, Vite, TypeScript, Three.js (orthographic camera, already in stack), Tailwind, shadcn/ui, Framer Motion, TanStack Query
- **State:** Zustand
- **Simulation:** TypeScript module in a Web Worker
- **Backend:** Supabase (Postgres + Realtime + Storage + Edge Functions)
- **Deployment:** Vercel
- **No new infrastructure.** Forager extends what's already deployed.

---

## Section P — MVP vs Phase Breakdown

Not everything ships day one. Realistic phasing:

### MVP (Months 1–4)

The map module is functional inside Guildstew with:

- Three-layer paint stack (terrain, structures, entities)
- Auto-generated FOW
- Auto-extracted simulation graph
- Multi-scene support (overworld + dungeon as primary archetypes)
- Day/Night/Dusk lighting + Dungeon FOW
- NPC schedules (schedule-following, patrol, aggro-on-proximity)
- Wall collision and player movement
- Bush stealth
- Combat Engine v2 handoff
- Compendium integration for entity stats
- Supabase Realtime sync (GM-authoritative)
- Building interiors (transparent roofs + lore blurbs)
- Time controls (Sims-style pacing)
- Basic loot management
- Pub-format map publishing to Brewery
- Mobile-friendly viewing

### Phase 2 (Months 5–8)

- Mounts and animal companions with personality
- Sound propagation
- Scent tracking
- Weather system
- NPC memory and gossip propagation
- Faction system
- Encounter Builder with Combat Engine integration
- DM Screen / unified dashboard
- Campaign notes with hyperlinking
- Plot thread tracker
- Session recap generation (manual + AI option)
- Random table generators (non-AI)
- Multi-story buildings (vertical)
- Tablet optimization
- Player handouts as world objects
- MUD-style interaction verbs
- AI procgen Edge Functions

### Phase 3 (Months 9–12)

- Hirelings and followers with errand system
- Foraging and hunting systems
- Crafting stations
- Trade economy
- Disguise system with NPC familiarity checks
- Crime and law network
- Calendar with festivals and anniversaries
- Magical zones and visible auras
- Naval and vehicle combat
- Streaming/spectator mode
- Hybrid in-person casting
- Per-player vision differences
- Encounter library and templates marketplace
- Quick sketch mode

### Stretch (Year 2+)

- Player-owned settlements
- Crowd simulation
- Adventure-in-a-Box content format
- Co-GM with multi-permission
- Full mobile native app
- Theatrical camera for streaming
- Advanced AI features (voice-of-NPC, dynamic dialogue trees)

This phasing protects the launch from scope death while making clear that the long-term vision is enormous and the foundation supports all of it.

---

## Section Q — Prototype Status

A single-file browser prototype (`forager-v0.2.html`) demonstrates:

- Terrain paint (grass/water/erase)
- Building placement with auto-doorways
- Tree, bush, torch placement
- Auto-FOW raycast in dungeon scene
- Day/night/dusk top-down overworld with no FOW
- Night moonlight overlay
- Wall collision (real)
- Bush stealth (hide and break aggro)
- Three NPCs with three behavior archetypes (Margery scheduled, Brennan patrol, Lurker hostile)
- Time controls at correct Sims-style pacing
- Day/Night quick toggles
- Scene transitions via cave portal
- Building interiors with transparent roofs and lore blurbs
- Water footprints (persistent memory concept)
- Combat trigger hook in code (PURSUING — combat trigger!)
- Real-time HUD with hidden state indicator

Every system in this brief is at least skeleton-demonstrable in the prototype. Production work rebuilds it on the Guildstew stack with persistence, Compendium integration, real combat handoff, and Three.js rendering. The conceptual work is done.

---

## Section R — Competitive Positioning

| Competitor | What They Are | What Forager Adds |
|---|---|---|
| **Roll20** | Most popular VTT. Battle map + tokens. | Living simulation. Auto-FOW. Persistent memory. NPC agency. Foraging. Marketplace. Unified workflow. |
| **Foundry VTT** | Powerful, modular, technical. | Out-of-the-box living simulation. No setup tax for fog of war. Unified marketplace. Schedule-driven NPCs. |
| **Owlbear Rodeo** | Simple, fast, minimal. | Everything Owlbear deliberately doesn't have, while still being simple to use at the basic level. |
| **Inkarnate** | Art tool. Maps as pictures. | Maps as simulation. Inkarnate maps don't move; Forager maps live. |
| **Quest Portal** | Story-focused VTT. AI tools. | Quest Portal's notes/AI angle + simulation depth + combat integration via Guildstew. |
| **Alchemy RPG** | Cinematic, atmospheric. | Cinematic + functional + simulated. Combat actually works. Marketplace integrated. |
| **Fantasy Grounds** | Heavy automation, complex. | Modern UX. Cloud-native. Visual world. Compendium-driven. |
| **TaleSpire** | 3D battle map. | 2D top-down + actual world simulation. The aesthetic isn't the product. |
| **D&D Beyond Maps** | Beta. Closed ecosystem. | Cross-system. Real simulation. Marketplace participation. |
| **Party Loot apps** | Loot management standalone. | Built in. Integrated with the world. |
| **World Anvil** | Wiki + campaign manager. | World-anvil-style notes inside Forager, linked to the actual world entities. |
| **Notion/Obsidian** | GMs cobbling notes together. | Same knowledge-graph notes, plus the world they describe is *actually running.* |

**Forager's position:** the first product that does what every GM has been trying to build for themselves out of seven tools — and the only one that simulates.

---

## Section S — Open Questions for the Team

These need resolution before serious schema work:

1. **Pub schema extension or new map content schema?** Forager maps reference NPCs, terrains, encounters, loot, schedules. Does the existing Pub data model extend cleanly or do we need a new container type?
2. **Multiplayer real-time map viewing.** GM-only with snapshot exports to players, or full player presence on the map? Recommendation: GM-only at launch, multiplayer in phase 2.
3. **AI tier strategy.** Bundle AI procgen into Adventurer tier or charge separately? Recommendation: included, since differentiation requires it.
4. **Mobile native vs PWA.** Native iOS/Android apps or progressive web app? Recommendation: PWA at launch, native if KPIs warrant.
5. **Combat Engine v2 timing.** Forager Phase 1 needs combat handoff working. Locks Combat Engine v2 timing tightly. What's the hard date?
6. **Loot management integration.** Build Forager-native loot system or extend the existing Guildstew trade system? Recommendation: extend, don't duplicate.
7. **In-person casting mode.** TV-cast as launch feature or phase 3? Recommendation: phase 3, but design data flow for it now (player-view vs GM-view separation must exist in the rendering layer from day one).
8. **Encounter Builder ownership.** Lives in Forager or in Guildstew core? Probably Guildstew core since it doesn't require a map, but tight Forager integration. Worth confirming.
9. **Notes system.** New Forager-native notes or extend existing Guildstew note features? Recommendation: build properly in Forager with hyperlinking from day one, since Guildstew doesn't have a knowledge-graph notes system yet.
10. **Naming.** Forager is a working title. Locked, or open?

---

## Section T — Financial Implications

Adding Forager to Guildstew's revenue model:

- **Subscription pull-through.** GMs who upgrade specifically for Forager (10+ maps, AI procgen, marketplace publishing). Conservative estimate: 25% conversion lift from Free → Adventurer for active GMs.
- **Marketplace transaction volume.** Maps as Adventures with the standard creator split (30/70 Adventurer, 20/80 Veteran/Guild). New content type doubles potential creator pool.
- **Kickstarter alignment.** Forager is the *flagship feature* for the planned $65K–$110K Kickstarter campaign. The pitch video is the simulation running. The reward tiers map to access (early Forager beta, exclusive starter maps, named NPCs in default content).
- **Press and community.** Forager is the launch hook. Roll20-fatigue and tool-fragmentation pain create a captive audience for a unified alternative.
- **Long-term moat.** No competitor has both a Combat Engine and a simulation layer talking to each other. Even if competitors copy individual features (auto-FOW, schedules), they can't copy the *integration.*

---

## Positioning Statement

> Forager is the first map tool that runs the world. Paint a village; it lives. Drop a baker; she bakes. Walk the wilderness; you can forage. Lose your sword to a thief; it stays lost. Fast-forward a week; come back to a world that lived without you. When combat starts, the engine you trust takes over. When you're done building, the whole world ships to the marketplace. Mounts work. Companions help. The simulation surprises you with stories nobody wrote. Nobody else is even trying.

---

*Prepared: May 2026. Updated with research-grounded GM tool requirements and full feature expansion from team brainstorm. Live prototype: forager-v0.2.html.*
