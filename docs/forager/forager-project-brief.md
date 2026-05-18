# Forager — Project Brief

**Working name:** Forager
**Companion to:** Guildstew
**Status:** Vision locked. Single-file browser prototype running. Ready for production planning.

---

## What Forager Is

Forager is a **living-world map and simulation tool** that runs alongside Guildstew. It is not a VTT. It is not Inkarnate. It is the first product in the TTRPG space to combine paint-driven world authoring, an underlying graph simulation, and a real-time tick engine in a single application.

A GM paints a village, drops buildings, places NPCs with daily schedules, and hits play. The world runs. The baker walks to the bakery at six in the morning because her schedule says so. The town watch patrols a route through the streets. The party arrives at dusk and the village reacts to their presence. When the players leave for the dungeon, the village keeps living without them — and when they come back two game days later, the world has moved on.

When combat starts, Forager hands off cleanly to Guildstew's existing Combat Engine v2. When combat ends, control returns to the map. The two engines share data through one clean interface.

---

## Why It Matters

No other product in the TTRPG space simulates. Foundry, Roll20, Owlbear Rodeo, and FantasyGrounds are all virtual tabletops — battle-map renderers with stat trackers bolted on. Inkarnate is an art tool. None of them run the world. None of them have NPCs who follow schedules. None of them have terrain that matters mechanically. None of them generate fog of war from the objects you place.

Forager does all of that, and it does it on top of the Guildstew platform we've already built. The Compendium system, the Combat Engine, the Brewery/Tavern marketplace, the subscription infrastructure — all of it composes with Forager. We are not racing competitors. We are sitting on the only platform where this product even makes sense to build.

---

## Strategic Architecture

Forager is built as a **lazy-loaded module inside Guildstew**, not a separate application. Users who never open a map pay no bundle cost. Users in a map share Guildstew's auth, Compendium, Realtime, and storage. There is no cross-app synchronization layer to maintain, no second deployment pipeline, no duplicated state.

The engine itself follows the same three-layer philosophy as Combat Engine v2:

- **Universal Map Engine** — game-pack-agnostic. Knows about rooms, exits, entities, schedules, simulation time. Handles graph operations, pathfinding, tick loops, FOW raycast. Lives in `src/maps/engine/`.
- **Game Pack Map Adapters** — system-specific. For the dnd5e pack, the adapter handles things like movement speed conversions, vision rules, and combat triggers. Lives inside each game pack.
- **UI Layer** — React + Three.js (orthographic camera, already in the Guildstew stack) + Framer Motion + Tailwind/shadcn. Editor, viewport, timeline, inspector.

This separation matches what we've already built for combat and means we are extending the existing architecture, not inventing a new one.

---

## Core Feature Set

### Three-Layer World Authoring

The GM builds the world through three painted layers, and the underlying simulation graph generates automatically as they work.

**Layer 1 — Terrain Paint.** Grass, water, dirt, stone, road, sand, snow, lava — each with metadata: speed modifier, stamina cost, damage per tick, footprint persistence, light level, swim requirement. Terrain is not decoration. Terrain is *systems.* Water slows you and exhausts you; snow leaves tracks; tall grass gives stealth. The GM paints with a brush; the engine enforces the rules invisibly.

**Layer 2 — Structures and Objects.** Buildings (auto-register as rooms in the simulation graph), trees (sight occluders), bushes (sight occluders and stealth zones), walls (block movement and sight), paths (auto-generate graph edges between rooms they touch), light sources (torches, lanterns, magical glow). Every asset carries metadata for sight blocking, movement blocking, and gameplay interaction.

**Layer 3 — Entities.** NPCs, monsters, items, encounter triggers, scene transitions. Entities reference the campaign's Compendium for stats; the map only stores spatial and behavioral state. No duplication, no drift.

### Auto-Generated Simulation Graph

When the GM places a building, it becomes a room node. When they draw a path between two buildings, the endpoints touching doorways automatically create graph edges. When they scatter trees, those trees register as occluders for fog-of-war and obstacles for pathfinding. The GM never authors a graph. They paint a world. The graph is the byproduct.

### Auto-Fog of War

The single biggest complaint about Roll20 is that GMs have to manually draw the occluder polygons every time. In Forager, every wall, tree trunk, building edge, and custom wall registered itself as an occluder when it was placed. The runtime fog-of-war is a visibility polygon computed by raycasting from each player position against the occluder set, in real time. No manual masking ever.

### Hybrid Building Model

Three coexisting ways to handle building interiors so GMs aren't forced to paint a hundred rooms for a kingdom:

- **Prefabricated buildings.** Tavern, smithy, generic house, etc. — drop one to fill space without authoring. Pulled from a community/official library.
- **Full painted interior (Option A).** For important buildings. GM uses the Room Maker to paint a custom interior with floor plans, walls, furniture, and props. When the player enters, the roof animates transparent and they see and navigate the interior in detail.
- **Lore blurb (Option B).** Available on every building, including prefabs. When the player enters, the camera centers and a GM-written description appears as on-screen text. Available regardless of whether the interior is painted.

The GM picks per-building. Lazy prefab for filler. Painted interior for the dungeon's throne room. Lore blurb for the herbalist's shop the party never enters but happens to be standing next to.

### Room Maker and Community Library

A dedicated authoring tool for building interiors and complete buildings. Same paint and place tools as the outdoor map, scoped to a building footprint. Authored rooms can be saved at three levels:

- **Single room** → published to the **Brewery** as a free **Pint**.
- **Multi-room building** (a castle, manor, tavern complex) → published as a **Brew**.
- **Full module** (a region, town, dungeon with NPCs and lore) → published as a free **Pub** in the Brewery or, admin-vetted, a paid **Adventure** in the Tavern.

This is the headline strategic move: **maps become content types in the existing creator economy.** Authors who would never write a stat block can now sell dungeons. The creator pool doubles.

### NPC Schedules and Behavior

Each NPC has a daily schedule expressed as a list of timestamped targets. At each tick, the NPC checks its schedule and moves toward its current target on the graph using A* pathfinding. Three behavior archetypes ship at MVP:

- **Schedule-following** (e.g., shopkeepers, residents). Time-of-day-driven, building-to-building routine.
- **Patrol** (e.g., town guards). Waypoint-based routes that loop.
- **Aggro-on-proximity** (e.g., hostile monsters). Detect player within range, pursue, trigger combat.

NPCs carry dispositions toward the party (friendly, neutral, hostile, suspicious) that can shift based on events. Dispositions persist. The innkeeper remembers being robbed. The smuggler the party helped remembers, too.

### Time Simulation

A global game clock advances at GM-controlled rate. Sims-style pacing with three speeds — at normal play, five real minutes equal one game hour; at fast forward, two; at double-fast, one. The clock displays as a real-feeling HH:MM that ticks once every five real seconds at normal, so the world has rhythm without feeling either glacial or frantic. Pause stops the simulation entirely. The GM can also snap directly to noon or midnight for quick lighting checks.

**The killer feature: when the GM fast-forwards a scene the party isn't currently in, the simulation runs in the background.** NPCs follow schedules; encounter zones evaluate; dispositions shift; persistent state evolves. When the party returns to a region they left three game days ago, they return to a region that has lived without them.

### Day/Night and Lighting

Lighting is data-driven per scene and per time of day. Daylight is bright, full-color top-down rendering with no fog of war — you can see your whole village from above because that's how vision works in broad daylight. Night is moonlit: still visible, but cooler and slightly dimmer at distance, with a subtle silver halo around the player. Dungeons and explicitly-marked-dark interiors use the raycast fog-of-war system, where vision is a resource and torches matter.

Placed light sources (torches, lanterns, magical glow) cast warm pools of light into dark scenes. Light sources are additive over the player's vision — they create explorable visibility within a dungeon, just like in real adventures.

### Player Movement

WASD or arrow-key movement on the map. Walls block. Trees block. Buildings block except at their doors. Water slows you to 40% speed and leaves wet footprints behind that fade after a few seconds. Bushes do not block movement — you can step into them.

### Stealth

Stepping into any bush sets the player into a hidden state. Hostile NPCs cannot detect a hidden player. If an NPC was already in pursuit, hiding for roughly two seconds breaks their line of sight and they return to patrol. Stealth is *terrain*, not a stat — where you stand determines whether you're visible. This is the seed of a much richer stealth system that could account for movement, sound, light level, and disguise checks as features layer on.

### Combat Handoff

When a hostile NPC reaches a player room (or a configurable trigger condition fires), the map calls into Combat Engine v2 with the participants and their positions. The map pauses simulation. Combat resolves in turn-based mode using the engine and game pack we've already built. When combat ends, the engine returns updated participant state and the map resumes. The interface between the two is exactly one event in each direction. The map app never implements combat. The combat engine never knows what a map is.

### Persistent World Memory

Every meaningful event in the world persists. Burned down the inn? It's ash. NPC killed? They stay dead. Stolen from the shop? The shopkeeper remembers and disposition reflects it. Dispositions, building state, NPC schedules — all of it is part of the map's save state. A campaign's map is not a level-load that resets every session. It is a save file that grows with the campaign.

The prototype demonstrates this concept with water footprints that fade over time. The production version persists everything to Supabase.

### Encounter Zones

Invisible painted zones with trigger conditions. A GM paints a zone over a clearing in the woods and sets: *if any player enters between 10pm and 4am AND the bandit_quest flag is active, spawn three bandits and start combat.* The GM no longer has to be at the wheel for the world to react. Encounters stage themselves under authored conditions. The same system handles plot flag advancement, stealth detection thresholds, and random-encounter table evaluation.

### The Inspector

Borrowed from RimWorld. Click on any NPC and see exactly what they're doing, where they're going, and why. Click on any building and see who's inside, current state, and assigned lore. Click on any tile and see terrain type and modifiers. Without an inspector, a complex simulation becomes invisible chaos. With one, players understand the rules and the world feels like a system they're inside, not a black box.

### Multiple Scenes

A campaign can have any number of maps in parallel — overworld, dungeon, ship interior, dream sequence, wilderness region. Each scene has its own ambient profile, its own NPCs, its own painted geometry. Transitions between scenes are points on the map the player walks into (a cave entrance, a portal, a dock). The simulation continues running for every scene every tick, regardless of which one is being rendered.

---

## Guildstew Integration Points

| System | How Forager Integrates |
|---|---|
| **Compendium** | Map entities reference Compendium IDs for stats. Custom Pints (NPCs, items, terrain types) authored at the table appear on maps via the same Compendium that the rest of Guildstew uses. |
| **Combat Engine v2** | Hostile NPC contact (or scripted trigger) hands off via a single `startEncounter` call. Combat resolves in the engine. Control returns to the map with updated state. |
| **Brewery / Tavern** | Maps publish as Pubs (free) or Adventures (paid). Map content references the Pints/Brews it depends on. Marketplace downloads install all referenced content and add the map to the campaign. |
| **Subscription Tiers** | Free: 2–3 maps per campaign, basic editor. Adventurer: 10+ maps, AI procgen, Brewery publishing. Veteran: unlimited maps, Tavern publishing rights. Guild: shared map library in the Vault. |
| **Supabase Realtime** | GM client is authoritative. Map state changes publish to a Realtime channel. Players subscribe and render. Same pattern as combat. |
| **Edge Functions** | AI procgen lives in Edge Functions, mirroring the existing `quick-pick-characters` and `ai-generate-character` pattern. Keys stay server-side. |
| **Storage** | Maps live in `users/{user_id}/campaigns/{campaign_id}/maps/` or `guilds/{guild_id}/vault/maps/`. UUID folder keys, same convention as the rest of the platform. |
| **Database** | Following the `game_master_id` convention. RLS policies for GM-authoritative writes and player-readable reads. |

---

## AI Features (Adventurer Tier and Above)

Five new Supabase Edge Functions, each following the existing AI pattern:

- **`procgen-dungeon`** — given a theme, size, and difficulty target, returns a complete dungeon graph with rooms, corridors, NPC placements, and treasure spots.
- **`procgen-town`** — generates a town layout with buildings, paths, residents, and stub schedules.
- **`procgen-wilderness`** — generates a region with biome, points of interest, encounter table, and travel time map.
- **`generate-room-description`** — given a building's properties (type, age, residents, recent events), writes the MUD-style lore blurb.
- **`populate-npc-schedule`** — given an NPC and a town map, generates a believable daily schedule referencing actual rooms.

These are force multipliers, not the soul of the product. The simulation works without them. They turn an empty afternoon's prep into thirty seconds of work.

---

## Tech Stack

Matches Guildstew exactly:

- **Frontend:** React 18, Vite, TypeScript, Three.js (orthographic camera — already in stack), Tailwind, shadcn/ui, Framer Motion, TanStack Query
- **State:** Zustand (lightweight, doesn't trigger React rerenders unless subscribed)
- **Simulation:** Pure TypeScript module, runs in a Web Worker so it doesn't block the UI thread during fast-forward
- **Backend:** Supabase (Postgres + Realtime + Storage + Edge Functions), same project as Guildstew
- **Deployment:** Vercel, same target

No new dependencies. No new infrastructure. Forager extends what's already deployed.

---

## Prototype Status

A single-file HTML browser prototype is running at `forager-v0.2.html`. It demonstrates:

- Terrain paint with three brush types (grass, water, erase)
- Building placement with door auto-generation
- Tree, bush, and torch placement
- Auto-fog-of-war via raycast (in dungeon scene)
- Daylight overworld with no FOW, full top-down vision
- Night moonlight overlay with distance falloff
- Dungeon scene with handcrafted walls and torches
- Two NPCs on full daily schedules (Margery the baker, Brennan the watchman)
- One hostile NPC with aggro-on-proximity (the Lurker in the dungeon)
- Wall and tree collision (player cannot walk through walls; doors are gaps)
- Bush stealth (player hidden, hostile NPCs disengage after ~2s)
- Time system with pause, normal (5 real min/game hour), fast (2:1), and faster (1:1)
- Day/Night quick toggles
- Scene transitions via cave portal
- Building interiors with roof transparency and lore blurbs on entry
- Water footprints that fade over time (persistent memory concept)
- Combat trigger hook (currently triggers NPC pursuit; production wires to Combat Engine v2)

The prototype is the proof. Every system in this brief is at least skeleton-form demonstrable in a browser tab right now. Production work is rebuilding it on the Guildstew stack with proper persistence and integration; the conceptual work is done.

---

## What's Left Before Production

1. **Schema design.** Map data tables in Supabase, following the `game_master_id` convention. The big decision: how the Pub spec accommodates map data. Map content as a child of the existing Pub schema, or extension? Lock this before any code.
2. **Compendium reference pattern.** Confirm `map_entities.source_compendium_id` resolves cleanly through the existing Compendium and that placing an entity creates a reference, not a copy.
3. **Universal Map Engine FSM.** Same shape as Combat Engine FSM, with states `IDLE`, `SIMULATING`, `PAUSED` and a tick event loop.
4. **Game Pack Map Adapter contract.** What the dnd5e pack's map adapter exposes: terrain rules, movement conversions, combat trigger hooks.
5. **Editor UX detail design.** The hardest unsolved problem. Probably 60–70% of total engineering effort. Worth dedicated UX time before implementation.
6. **Realtime sync schema.** What deltas publish to the channel. Same pattern as combat but the message types are different.

After those are locked, a focused MVP build is estimated at three to four months alongside other Guildstew priorities. The lazy-loaded module pattern means it doesn't slow down anything we ship in the meantime.

---

## Positioning Statement

> Forager is the first map tool that runs the world. Paint a village; it lives. Drop a dungeon; it patrols itself. Walk away for a week of game time and come back to a place that has changed without you. When combat starts, it hands off to the engine you already built. When the GM is done, they publish the whole thing to the Tavern. Nobody else in this space is even trying.

---

## Open Questions for the Team

- Do we extend the Pub schema or design a new map content schema that wraps Pubs?
- What's the desktop performance budget? Mobile? Do we target tablet GMs in production or in a later phase?
- Multiplayer real-time map viewing for players, or GM-only with players seeing snapshots? My recommendation is GM-only at launch; multiplayer in a follow-up phase. But this affects schema decisions now.
- AI procgen included in Adventurer tier or gated behind a separate add-on? I'd argue included; it's how we differentiate from competitors who don't have AI infrastructure at all.
- How do we handle in-progress Combat Engine v2 work alongside Forager planning? Suggestion: lock Combat Engine v2 Phase 1, do Forager schema design in parallel, start Forager engine build after Combat Engine Phase 2 spec is stable.

---

*Prepared by: Aetherian Studios design notes, May 2026.*
*Live prototype: forager-v0.2.html. Open in any modern browser. No install required.*
