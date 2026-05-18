# What's Inside Forager v0.2

*A complete walkthrough of every system in the prototype — what it does, how it works, and where the honest seams are.*

---

## The Big Picture

The prototype is a single HTML file. Open it in any modern browser and the whole thing runs — no install, no build step, no dependencies. About 1,100 lines of JavaScript do the entire job. Everything lives in memory: refresh the page and the state resets.

What's working in it is the *complete shape* of every system Forager will need in production. The rendering will get prettier with Three.js. The state will persist when you swap memory for Supabase. The pathfinding will get smarter. But the *systems* — terrain, buildings, NPCs, schedules, time, fog of war, day/night, stealth, collision, scene transitions, combat triggers — those are all real and they all compose with each other exactly the way they're supposed to. The prototype's job is to prove the architecture works, and it does.

Let me walk you through it.

---

## The Canvas and Coordinate System

The whole world is drawn on a single HTML `<canvas>` element using the standard 2D drawing context. Coordinates are pixels — `(0, 0)` is the top-left of the canvas, x increases right, y increases down. There's no scrolling viewport in the prototype, which is why everything has to fit on screen. (Production version pans and zooms; that's a Three.js-side thing and trivial when we get there.)

When you resize the window, the canvas resizes too, and we account for high-DPI screens by drawing at higher resolution than the display pixels. That's the boring part. Everything visual rests on top of it.

---

## The Scene System

A "scene" in Forager is a complete world: its own terrain, its own buildings, its own NPCs, its own ambient mood. The prototype has two — `overworld` and `dungeon` — but the system is built to handle any number.

Each scene carries everything it needs in a single object:

```
{
  tiles:        Map of painted terrain
  buildings:    rectangles with names + descriptions + doors
  trees:        circular sight blockers
  bushes:       smaller occluders, also stealth zones
  customWalls:  hand-placed line segments (dungeon stones)
  lights:       torches/lanterns
  npcs:         characters with schedules and state
  transitions:  points that teleport to other scenes
  footprints:   wet tracks that fade over time
  occluders:    DERIVED — everything that blocks sight
  colliders:    DERIVED — everything that blocks movement
}
```

The two derived arrays at the bottom are important — more on those in a minute.

When you walk into a cave entrance, the engine saves the player's current position in the scene you're leaving, swaps the active scene reference, and places the player at the corresponding transition in the new scene. Both scenes keep running every tick — NPCs in the overworld continue their schedules while you're underground. The render only draws the current scene; the simulation runs everywhere.

That's the bones of "the world keeps running" in fifteen lines of code.

---

## The Three Paint Layers

Forager's authoring model is a three-layer paint stack, and the prototype demonstrates all three.

**Layer 1, Terrain.** A `Map` data structure keyed by tile coordinates. Click-drag with the Grass tool paints `'grass'` into a tile. Water paints `'water'`. Erase deletes the entry. Each terrain type carries metadata the simulation respects — in the prototype, water reduces player speed to 40% and marks the player as wet (which produces footprints when they keep walking). In production, every terrain type will have a full property bundle: speed modifier, stamina cost, damage per tick, occludes/blocks/concealment, footprint persistence, etc.

**Layer 2, Structures.** Click-drag in Building mode creates a rectangle with auto-generated properties: a unique ID, a generic name, a description, and a doorway at the bottom-center. Trees and bushes are single clicks — each gets a random radius for visual variety. Custom walls (the dungeon's stone corridors) are hand-placed as line segments in code; eventually GMs will paint them with a wall brush.

**Layer 3, Entities.** NPCs are seeded into the scene at startup. Light sources are placeable via the Torch tool. Transitions (the cave entrance, the cave mouth back) are hand-placed in code. Production will let the GM place NPCs from the Compendium and configure their schedules via UI.

The crucial detail: when you place anything in Layer 2, the engine *immediately rebuilds the occluder set and the collider set* for the scene. This is the "auto-graph extraction" working — you painted the world, and the simulation infrastructure (what blocks sight, what stops movement) regenerates from what you painted. You don't author it. It falls out.

---

## The Derived Geometry

This is the cleverest piece in the prototype, and it's worth understanding clearly.

Every time the scene changes, `rebuildGeometry(scene)` runs and produces two arrays from the raw structures:

**Occluders** — everything that blocks line of sight. A building contributes four wall segments (the full rectangle). A tree contributes an eight-segment polygon approximating its circle. A bush contributes a six-segment polygon. Custom walls add themselves directly. This is the dataset the fog-of-war raycast consults.

**Colliders** — everything that blocks movement. Almost the same as occluders, but with one important difference: building walls are *split at the door,* so the door is a gap in the collider but not in the occluder. You can walk through doors. You can't see through walls. Bushes are deliberately *not* in the collider set — they block sight but you can step inside them, which is what makes them hiding spots.

This split lets us model real architectural behavior cleanly. A door is a hole in the wall for the *movement* system and a solid wall for the *sight* system, just like a closed door in real life. (When we add open/closed door states in production, the door becomes a hole for both systems when open; the geometry just regenerates.)

The chest in the treasure chamber has a `solid: true` flag, which tells the collider generator to skip the door gap. The chest is a building visually, but you can't enter it, because solid buildings have no door. Same data structure, one extra property, completely different behavior.

---

## The Fog of War

The fog of war is the visual signature of the dungeon scene, and the algorithm is surprisingly simple.

From the player's position, we fire 280 rays at evenly-spaced angles around them — every 1.28 degrees or so. For each ray, we check every wall segment in the scene's occluder list and find the closest one the ray hits. That closest-hit distance defines how far the player can see in that direction. The 280 endpoints connect into a polygon, and that polygon is the visible region.

```javascript
for each ray angle 0 to 360:
  closest = MAX_DISTANCE
  for each wall segment:
    if ray hits wall at distance t and t < closest:
      closest = t
  visible_point = player_position + ray_direction * closest
```

The ray-segment math is one function (`rayHit`) doing a parametric line intersection. It's about ten lines.

Once we have the visibility polygon, we use it as a *clipping region* in the canvas — only pixels inside the polygon get drawn with the "lit" rendering pass. Everything outside stays dark. That's literally how fog of war works.

The reason this is a big deal: every wall, tree, building edge, and custom wall in the scene contributes to the occluder list automatically. The GM never authors a visibility map. They place things, the algorithm uses what they placed.

The 280 ray count is arbitrary — turn it down to 60 and the polygon gets visibly angular; turn it up to 720 and it's smooth as glass but you do more math per frame. 280 is the readable-but-cheap sweet spot.

---

## The Lighting Models

A scene plus a time-of-day produces an *ambient mode* — `day`, `dusk`, `night`, or `fow`. Each mode has its own render path.

**`day` (overworld, 6am – 5:30pm):** The whole canvas renders as a top-down map. No clip. No raycast. No fog of war. There's a warm sunlight gradient suggesting late-morning warmth, and that's it. You see the entire village from above because that's how vision works at noon.

**`dusk` (overworld, 5:30pm – 8pm):** Same full-visibility model, but the canvas gets a warm-purple sky gradient overlay and a soft vignette at the corners. Transitional mood.

**`night` (overworld, 8pm – 6am):** Still full visibility — moonlight isn't blindness. But the whole canvas gets a cool-blue dimming overlay, a radial darkening from the player's position outward (further is darker), and a soft silver halo right around the player. Distant things look colder and less distinct. You can see Brennan walking the patrol from across the village; he just looks moonlit instead of sunlit.

**`fow` (dungeon, all times):** This is the only mode that uses the raycast. Vision range shrinks to 170 pixels (versus 380 in daylight). The render path clips to the visibility polygon, fills it with dim torch-warmth ambient, layers in light sources, and lets nothing outside the polygon be drawn. The dungeon feels claustrophobic *because the render is enforcing the claustrophobia.*

This per-mode render path is how Forager will eventually handle any new lighting condition — magical sight, undersea, fog banks, dream sequences. Each is a new mode in `getAmbient()` plus a corresponding render branch.

---

## The Time System

A global game clock in minutes — 0 at midnight, 720 at noon, 1440 wraps back to 0. Every render tick advances it by `dt * timeScale`, where `dt` is real seconds since the last frame and `timeScale` is *game minutes per real second.*

After the fix, the speeds are exactly:

- **Paused** (`timeScale = 0`): nothing advances.
- **Normal** (`0.2`): 0.2 game minutes per real second. So one full game minute takes five real seconds; one game hour takes five real minutes. The clock ticks at a pace your eye reads as "real-feeling."
- **Fast** (`0.5`): 2.5x normal. One game hour in two real minutes.
- **Faster** (`1.0`): 5x normal. One game hour in one real minute.

The Day and Night buttons hard-snap `gameTime` to noon (720) and midnight (1380). Useful for demoing lighting without having to wait.

This is the entire time engine. The clock display formats minutes as `HH:MM`, the ambient model reads the current hour to decide day/dusk/night, and the NPC schedule logic reads the current time to decide where each NPC should be. Three consumers, one clock, everything in sync.

---

## NPCs and Their Behaviors

The prototype seeds three NPCs that demonstrate three distinct behavior archetypes. All of them run through the same `updateNPC` function — the function branches on archetype.

**Margery (schedule-following).** Lives at her cottage. Her schedule is a list of timestamped targets:

```
06:00 → Bakery   (opening the bakery)
12:00 → Market   (at the market)
14:00 → Bakery   (back to baking)
19:00 → Home     (heading home)
```

The function picks the latest schedule entry whose time has passed and points her toward that building's door. If she's not at the door yet, she walks toward it. If she gets there, the engine sets her `insideBuilding` to that building's ID, teleports her into the building's center, and she does a small randomized wander inside while the schedule entry is current. When the next schedule entry hits, she walks to that building's door, exits, walks across the village to the new target, and goes inside.

This is the *entire* schedule system. Add more entries, add more NPCs, it scales linearly.

**Brennan (patrol).** Lives at the watchhouse. His schedule has six entries, one for each leg of his patrol. He visits home, the market, the bakery, back to the market, then home. Same archetype as Margery, more legs. Six entries playing out across a 24-hour cycle. (He also has a real patrol waypoint variant available — a schedule entry can carry a `patrolPoints` array instead of a building target, and the function walks the NPC waypoint-to-waypoint instead of building-to-building. The Lurker uses this version.)

**The Lurker (aggro-on-proximity).** Lives in the dungeon's main chamber. Has one schedule entry that defines a patrol loop through four waypoints. The crucial difference: the function checks every tick whether the player is in the same scene, visible (not hidden), and within `aggroDist` pixels. If yes, `aggroed = true`. While aggroed, the schedule is ignored entirely — the Lurker walks directly toward the player at higher speed. Its name turns red, the status panel marks it hostile, and the line `PURSUING — combat trigger!` appears in the HUD.

That last line is the *combat handoff seam.* In production, when `aggroed` flips true and the Lurker reaches the player, instead of just continuing to chase, the engine fires `combatEngine.startEncounter(participants, mapState)` and the game's existing combat system takes over. The prototype doesn't have a combat engine plugged in, so the Lurker just keeps chasing — but the *trigger fires.* You can watch the system stage itself.

The Lurker also demonstrates *aggro break*. If you step into a bush and stay there for about 1.8 seconds, `player.hidden` is true the whole time, the Lurker's `aggroLossTimer` increments, hits the threshold, aggro flips back to false, and the Lurker resumes patrol. The state label changes to `prowling (lost sight)`. This is the stealth system working with the AI system through one shared `player.hidden` flag.

---

## Collision

When the player moves, two things happen: the position updates based on input, and then `resolveCollision()` runs to push them out of anything they shouldn't be inside.

The math is the same point-to-line-segment distance function we use elsewhere. For each collider segment in the scene, we find the closest point on the segment to the player's current position. If that distance is less than the player's radius, the player is overlapping the wall, and we push them along the surface normal (away from the wall) by the overlap amount. We do the same thing with tree circles, except it's circle-vs-circle math instead of point-vs-segment.

We iterate this resolution up to three times per frame, because pushing the player out of one wall can sometimes push them into another. Three iterations is plenty in practice.

This is why walls work in the prototype. Walk straight at the bakery and you bonk and stop. Walk around to the south door and the door is a gap in the collider set, so you pass through. Walk into a tree and you slide around it. Walk into a bush and *nothing happens*, because bushes aren't in the collider set — they're only in the occluder set.

NPCs deliberately don't have collision in the prototype. Margery and Brennan walk straight lines toward their target doors, which sometimes passes through other buildings on the diagonal. It looks fine because the buildings are small and the walks are quick, but it's the obvious next thing to fix — give NPCs A* pathfinding on the room graph in the production version.

---

## The Bush Stealth System

Every frame, `checkHidden(scene)` walks the scene's bush list and returns `true` if the player's position is within any bush's radius (plus a small margin). The result is stored on `player.hidden`.

When `player.hidden` is true, three things visibly change. The HUD shows a green `HIDDEN` badge. The player's body color dims to about half-opacity. A dashed green ring replaces the solid orange outline.

The functional consequence: hostile NPCs skip their aggro check entirely when the player is hidden. If they're already aggroed, hiding for 1.8 seconds drops their aggro and they return to schedule. Stealth is *terrain* — where you stand determines whether you're detected. No skill check, no roll, no math beyond a distance comparison.

This is the simplest possible version of the system. Production will layer in: movement speed affecting detection, sound (running in a bush isn't sneaking), perception checks for the AI (some enemies see through bushes), magical detection that ignores bushes entirely, etc. But the seam is the same — `player.hidden` is a flag the AI consults, and anything in production can flip it.

---

## Footprints (The Persistence Demo)

When the player moves while wet (their `wetness` value is above 0.1), the engine occasionally drops a `footprint` object into the scene's footprint array. Each footprint has a position and a `life` value that decrements every frame. When `life` reaches zero, the footprint is removed.

It's a tiny system. Total code: about twelve lines. Visually, you walk through water, leave wet prints behind you, and they fade after a few seconds.

The reason this matters is *demonstrative.* Forager's full vision includes persistent world state — burned buildings, dead NPCs, robbed shops, broken doors. The production version persists all of that to the database and the world remembers it indefinitely. The prototype's footprints prove the *concept* of "actions leave traces the world records" in the smallest possible form. Swap "fade in five seconds" for "save to Supabase" and the same loop becomes the real persistence system.

---

## The Render Pipeline

The order things get drawn matters. Painting order in the prototype:

1. Void/background color
2. Subtle dot grid (texture for empty space)
3. The scene's ambient base (clipped to visibility polygon if in dungeon)
4. The player's light gradient (warm in fow mode, cool moonlight halo at night)
5. Placed light sources (torches puddle warmth in fow mode)
6. Terrain tiles (grass, water)
7. Footprints
8. The player's current building floor (revealed because no roof)
9. Scene transitions (cave portals)
10. Bushes
11. Trees
12. Custom walls (dungeon stones)
13. NPCs
14. Torch flame markers
15. Building roofs (all buildings except the player's)
16. Building outlines and doors
17. Building name labels
18. Vision polygon edge glow (fow mode only)
19. Drag preview (if drawing a new building)
20. Day/dusk/night atmospheric overlays
21. The player on top of everything

The order produces the visual logic: NPCs are drawn *before* roofs, so NPCs inside other buildings are visually covered by the roofs (you can't see them from outside). The player's building's roof is skipped from the roof pass, so its floor shows through. Walls are drawn after bushes and trees so they sit on top visually. The vision-polygon edge glow happens after everything inside the polygon, so it traces the visible boundary cleanly.

When you change the order, the world reads differently. This is one of those systems where the bug is "it looks wrong" and the fix is "swap two function calls."

---

## The HUD

Three pieces of UI sit on top of the canvas:

The **clock** (top-right of the toolbar) shows current game time as `HH:MM`.

The **status panel** (bottom-right) reports your current location ("Outside", "The Crust & Cinder Bakery", "Black Hollow Cave"), the time of day in words ("Morning", "Dusk"), the current state of each major NPC ("opening the bakery", "patrol — east end", "PURSUING — combat trigger!"), and a green `HIDDEN` badge if you're in a bush.

The **building blurb** (top-center, only visible when you're inside a building) shows the building's name in display type and its description in mono. It's the in-world equivalent of room description text in a MUD.

A **toast** at the top center shows briefly when you transition between scenes ("Entered the Black Hollow", "Surfaced — back outside"). It auto-hides after about two seconds.

All of these update every frame from current state — there's no UI framework, no React, no template engine. Just `element.textContent = newValue` whenever the value changes. That works fine at this scale; production will use React for the UI chrome, but the data model is identical.

---

## Tools and Editing

The toolbar at the top of the screen has six groups: Scene swap, Paint, Place, Sky (day/night snap), Time controls, and Reset.

**Scene** — flips between the overworld and dungeon scenes. The active scene is highlighted in teal.

**Paint** — Grass, Water, and Erase. Click-drag on the canvas to paint tiles. Erase deletes whatever's painted there.

**Place** — Building (click-drag to draw rectangle), Tree (single click), Bush (single click), Torch (single click), Teleport (click to jump the player to that spot).

**Sky** — Day snaps the clock to noon, Night snaps it to 11pm. Useful for showing the lighting model without waiting.

**Time** — Pause / Normal / Fast / Faster. Spacebar toggles pause from anywhere.

**Reset** — wipes the current scene completely. Confirmation prompt first.

Every tool routes through one input handler that branches on `activeTool`. Adding a new tool is one new button and one new branch.

---

## What's Production-Ready and What's Prototype-Grade

Honest accounting, because you'll want to know.

**Production-ready as designs (port directly to Guildstew):**

- The scene system. Add a database backing and it's done.
- The terrain metadata pattern. Move metadata to a config table.
- The schedule format. Direct translation to a Supabase JSONB column.
- The occluder/collider derivation. Same algorithm, more performance work needed for big maps.
- The raycast fog of war. Same algorithm. Move to WebGL/Three.js for batching once we have thousands of segments.
- The ambient model. Same `getAmbient()` shape, more modes added.
- The combat trigger seam. Identical hook, wired to the real combat engine.

**Prototype-grade (will need rewriting in production):**

- The rendering. Canvas 2D is fine for proof-of-concept, but production goes to Three.js orthographic for batched rendering, viewports, pan/zoom, and 10x+ entity counts.
- NPC movement. Straight-line walking will be replaced with A* pathfinding on the auto-extracted graph.
- The HUD. Plain DOM manipulation is fine here; production uses React with Tailwind/shadcn.
- The schedule editor. Currently authored in code; production gets a real UI.
- State persistence. In-memory only; production goes to Supabase with Realtime sync.
- Footprints. Demo only at this scale; production gets a real persistent-state system.

**Not addressed yet (real engineering work to come):**

- Pathfinding for NPCs around obstacles.
- The full Path tool that draws a polyline and auto-generates graph edges.
- The Room Maker for authoring building interiors.
- Compendium integration for entity stats.
- Multiplayer real-time sync.
- The encounter zone painter.
- Procgen Edge Functions.
- The Inspector panel.
- Triggered events.
- Weather.

---

## What the Prototype Is Actually For

The point of the prototype is not to ship. The point is to *prove the design works,* and to give anyone who needs to understand the product a 60-second demo they can run on their own machine.

Open the file. Hit fast forward. Watch Margery walk to work. Toggle night. Watch the village go cool. Walk to the cave. Descend. Get aggroed by the Lurker. Hide in moss. Surface. Time has passed. *That's the entire pitch in motion,* and it lives in one HTML file you can email.

When this gets rebuilt inside Guildstew, the systems explained above are exactly the systems that come over. The implementation changes, the design doesn't. Every piece in the prototype is a piece in the production app. The prototype's job is just to prove they hang together — and they do.

---

*Save this anywhere alongside the prototype file. Hand both to anyone who needs to understand what we're building. They will, fast.*
