# Building Forager With Claude Code — A Step-By-Step Guide

*Plain-English. Practical. Honest about what's hard. Read straight through once, then keep it open while you work.*

---

## Part 0 — Get Your Head Right First

Before you write a single line of code or open Claude Code at all, internalize three things. They will save you weeks.

**This is a 3-4 month project, not a weekend hack.** Forager is genuinely big. The prototype took ten focused work sessions to land. The production version is at least 50 to 100 work sessions, possibly more. If you go in expecting a polished beta in a month, you'll burn out and abandon it. If you go in expecting a working alpha in three months and a beta in six, you'll feel like a wizard the whole way through.

**Claude Code is a junior engineer with infinite patience and no memory.** It writes code fast and well. It understands context if you give it. It does NOT remember yesterday's work, your team conventions, your brand voice, or anything that isn't currently in the conversation or the files it can read. Treat it like a brilliant new hire on their first day: clear instructions, small scoped tasks, verify everything, document for context. The better the context you give it, the better the code you get back.

**The hardest part isn't the coding.** The hardest part is *scope discipline.* Every session, you will be tempted to add "just one more thing." You will be tempted to gold-plate. You will be tempted to refactor everything when one thing breaks. The number-one cause of solo developer projects failing is scope creep. Write the smallest thing that demonstrates the next step. Ship it. Move on.

Three things to never lose sight of: **stay scoped, commit often, test as you go.** If you only remember one piece of advice from this whole document, remember those.

---

## Part 1 — Before You Start

Set up your environment so the first session of real work is uninterrupted.

### Step 1.1: Open a feature branch in Guildstew

```bash
cd /path/to/guildstew
git checkout main
git pull
git checkout -b feature/forager-engine
```

You're working on `feature/forager-engine`. Everything happens here. When something works, you'll merge it back to main. When something breaks, you can throw the branch away without losing your existing work. *This is your safety net.*

### Step 1.2: Drop your reference documents into the repo

Create a folder `docs/forager/` and put everything we've built into it:

```
docs/forager/
├── forager-project-brief-expanded.md
├── forager-prototype-walkthrough.md
├── forager-marketing-copy.md
└── forager-prototype-v0.2.html
```

This matters because **Claude Code can read these files.** Every time you start a session, you can tell it "read `docs/forager/forager-project-brief-expanded.md` for context" and it gets the whole vision in one shot. You're not re-explaining the project every session. The docs are the institutional memory.

### Step 1.3: Open Claude Code in the repo

Launch Claude Code, point it at the Guildstew project root. Make sure it has read/write access. Confirm it can see the codebase by asking it: *"List the folders in this repo and tell me what each one is for."*

If it gives you a sensible answer, you're connected. If it doesn't, fix the connection before doing anything else.

### Step 1.4: Pick a session length and stick to it

Decide right now: **how long are your work sessions?** Two hours? Three? Four? Whatever you choose, commit to it. The reason: Claude Code sessions get more confused the longer they run. Context window fills up. Earlier instructions get forgotten. Quality degrades. *Short focused sessions beat long messy ones.* My recommendation: 2-3 hour sessions, with a clear goal for each one, and a definite end.

---

## Part 2 — The Project Plan

Six phases. Each phase has a goal, a deliverable, and a rough time estimate. The estimates assume 10 hours of focused work per week. Adjust for your actual schedule.

### Phase 1 — Engine Skeleton (Week 1-2)

**Goal:** Set up the file structure for the Forager module inside Guildstew. Define the core data types. Get something running that doesn't crash.

**Deliverable:** A `/maps` route in the Guildstew app that shows an empty viewport. No content yet. Just proves the module loads.

### Phase 2 — Rendering Foundation (Week 2-4)

**Goal:** Three.js orthographic camera renders a scene. Pan and zoom work. Empty grid is visible.

**Deliverable:** Navigate to `/maps`, see a panable/zoomable grid in the browser.

### Phase 3 — Authoring Tools (Week 4-8)

**Goal:** GM can paint terrain, place buildings (polygonal, with materials), add doors/windows, drop NPCs. Everything saves to memory.

**Deliverable:** You can build a village in the browser. Nothing simulates yet — just authoring.

### Phase 4 — Simulation (Week 8-12)

**Goal:** Time runs. NPCs follow schedules. Day/night cycles. Player moves around. FOW works in the dungeon scene.

**Deliverable:** You can run a session in Forager. The prototype's full feature set, but in production.

### Phase 5 — Integration (Week 12-16)

**Goal:** Maps save to Supabase. Compendium provides NPC stats. Combat trigger calls into Combat Engine v2. Realtime sync to players.

**Deliverable:** Forager talks to Guildstew. Real campaign data. Real persistence.

### Phase 6 — Polish, Test, Ship Beta (Week 16-20+)

**Goal:** UI chrome, edge case handling, performance, subscription tier checks, marketplace integration, mobile responsiveness.

**Deliverable:** A beta release Guildstew users can try.

---

## Part 3 — How to Actually Use Claude Code

This is the bit that determines whether you're 3x productive or 10x productive.

### The Three-Sentence Prompt Pattern

The best prompts have three parts:

**1. Context.** What you're working on, and what files matter. *"I'm working on the Forager map module inside Guildstew. The brief is in `docs/forager/forager-project-brief-expanded.md`. The walkthrough of the prototype is in `docs/forager/forager-prototype-walkthrough.md`. Look at those before starting."*

**2. Task.** What you want done. *"Create the file `src/maps/engine/types.ts` with TypeScript interfaces for Building, Wall, Room, Door, Window, and Scene. Match the existing Guildstew conventions for type definitions."*

**3. Verification.** How you'll know it worked. *"After you're done, run `tsc --noEmit` and confirm it compiles. Then list the types you created and explain each in two sentences."*

This pattern works because it gives Claude Code the information to do the work *and* the way to confirm it's done. Without verification steps, you get sloppy code that compiles but does the wrong thing.

### Good Prompts vs Bad Prompts

**Bad:** "Make the map work."

**Good:** "In `src/maps/engine/scene.ts`, add a function `addBuilding(scene, building)` that pushes a building onto the scene's building list and triggers a `rebuildGeometry(scene)` call. Use the existing types from `types.ts`. After you're done, show me the diff."

The difference is *specificity.* Bad prompts force Claude Code to guess. Good prompts let it execute.

**Bad:** "Set up the database."

**Good:** "Create a Supabase migration file under `supabase/migrations/` that adds three tables: `maps`, `map_buildings`, `map_npcs`. Each table has `id` UUID, `game_master_id` UUID with FK to auth.users, `campaign_id` UUID with FK to campaigns table, and a `data` JSONB column. Match the column conventions in the existing migrations folder."

The good version references existing conventions, names specific tables, specifies columns, and is concrete enough to verify.

### When To Push, When To Course-Correct

After Claude Code completes a task, you check the work. Three outcomes:

**It's correct.** Commit it. Move to the next task.

**It's mostly correct but one thing is off.** Say specifically what's wrong: *"The `addBuilding` function looks good, but it's not calling `rebuildGeometry`. Add that call at the end."* Be specific. Don't say "this is broken" — say what's broken.

**It's badly off-track.** Stop. Revert any changes. *"Reset the file to its previous state. I want to try a different approach."* Then re-explain the task with more context. Don't fight the bad answer; restart from the prompt.

### Loading Context Smartly

You can't fit your whole codebase into Claude Code's context window. So you have to pick what matters. The rule of thumb:

- **Always load:** the file you're editing, types/interfaces it depends on, the relevant section of the brief.
- **Sometimes load:** related files in the same module, the database schema, the prototype HTML for visual reference.
- **Rarely load:** unrelated parts of the codebase, full marketing copy, the entire brief if only one section is relevant.

Specific phrasing that works: *"Read `src/maps/engine/types.ts` first. Don't load other files unless I tell you to."* This keeps the context window clean.

### Verification Habits That Save You

Every change Claude Code makes, you verify before committing. The habits:

1. **Read the diff.** Don't just trust the summary. Read the actual lines that changed.
2. **Run the code.** If it's a function, call it with test inputs. If it's a UI change, look at it in the browser.
3. **Type-check.** Run `tsc --noEmit` after every significant change. TypeScript catches a lot.
4. **Test edge cases.** Empty inputs, null values, large inputs. Ask Claude Code: *"What happens if I pass an empty array to this function?"*
5. **Commit before moving on.** Every working change gets committed. Tiny commits are good commits. *"Add Building type definition"* is a fine commit message.

---

## Part 4 — The Daily Rhythm

Each work session follows the same pattern. Get this in your bones.

**Start (5 min):** Open Claude Code. Tell it the goal for the session. *"Today we're adding wall material types to the Building data model and rendering walls with different colors based on material. Read `docs/forager/forager-project-brief-expanded.md` Section V for the design."*

**Plan (10 min):** Break the goal into 2-4 small tasks. *"Task 1: add `material` field to Wall type. Task 2: create a materials registry with three starter materials. Task 3: update the wall rendering function to use material color. Task 4: write a test that creates a building with mixed materials."*

**Execute (90 min):** Work the tasks one at a time. After each task, verify it works. Commit. Move to the next.

**Wrap (15 min):** Update your `docs/forager/PROGRESS.md` file with what you did and what's next. Commit that. Close Claude Code. Walk away.

**Daily total: about 2 hours.** Sustainable. Productive. Compounds over weeks.

---

## Part 5 — Specific Example Prompts For Each Phase

These are templates you can copy-paste-adapt for actual work. They're written to be productive immediately.

### Phase 1 Example Prompts

**Setting up the folder structure:**

```
Read docs/forager/forager-project-brief-expanded.md, specifically 
Section O (Tech Stack) and Section P (MVP vs Phase Breakdown).

Create the following folder structure inside src/:

src/maps/
├── engine/         (game-pack-agnostic simulation)
├── ui/             (React components, panels, controls)
├── render/         (Three.js rendering layer)
├── adapters/       (game pack adapters - dnd5e first)
├── hooks/          (custom React hooks)
└── api/            (Supabase wrapper functions)

Add an empty `index.ts` to each folder. Don't add any other files yet.
```

**Defining the core types:**

```
Read docs/forager/forager-project-brief-expanded.md, specifically 
Section A (Core World Authoring) and Section V (Architectural Authoring).

Create `src/maps/engine/types.ts` with the following TypeScript 
interfaces, in this order:

- Scene
- Tile (terrain tile)
- Building (polygonal, with shape as point array)
- Wall (line segment with material reference)
- Material (wall material with sound/sight/cover properties)
- Door (state, position on wall, material, lock)
- Window (state, position on wall, material)
- NPC (with current room, schedule, disposition)
- Schedule (list of timestamped targets)
- LightSource
- Transition (scene-to-scene portal)

Use string IDs everywhere (UUIDs in production but `string` in types).
Add JSDoc comments above each interface explaining what it represents.

After you're done, run `npx tsc --noEmit` and confirm no errors.
```

**Setting up the route:**

```
The Guildstew app uses React Router v6. Look at how existing routes 
are registered in `src/App.tsx` or `src/router.tsx` (find the right 
file first).

Add a new route at `/maps/:campaignId/:mapId` that renders a 
component `<MapView />` defined in `src/maps/ui/MapView.tsx`.

For now, MapView just returns a div that says "Forager — Phase 1" 
centered on the screen with Tailwind classes. Use the brand colors 
from the existing app.

Show me the routing change and the new component. Tell me which 
file you edited for routing.
```

### Phase 2 Example Prompts

**Setting up the Three.js viewport:**

```
Three.js is already in the Guildstew dependencies. Confirm this by 
checking `package.json` first.

In `src/maps/render/viewport.tsx`, create a React component called 
`<Viewport />` that:

1. Creates a Three.js scene with an orthographic camera.
2. Renders the scene inside a `<canvas>` element that fills its 
   parent.
3. Sets up pan (mouse drag) and zoom (scroll wheel) controls.
4. Renders a grid of dots as background (subtle, every 28px).

Use `useEffect` for the Three.js setup and tear-down. Resize handling 
needs to update both camera and renderer.

Reference forager-prototype-v0.2.html for visual style — same dark 
void background with subtle dot grid.

After this, mount Viewport inside the MapView component and verify 
in the browser that pan and zoom work.
```

**Rendering layers:**

```
In `src/maps/render/`, create three files:

- `layer-terrain.tsx` — renders the tile grid
- `layer-objects.tsx` — renders buildings, trees, bushes
- `layer-entities.tsx` — renders NPCs and the player

Each file exports a React component that takes a `scene` prop 
(of type Scene from `engine/types.ts`) and renders that layer 
using Three.js objects.

For now, render simple shapes:
- Tiles as colored squares (green for grass, blue for water)
- Buildings as filled polygons with a darker outline
- Entities as small circles

Reference forager-prototype-v0.2.html for the exact colors and 
shapes. Use the brand colors.

Add all three layers to the Viewport component. Confirm in the 
browser that an empty scene renders without errors.
```

### Phase 3 Example Prompts

**Polygonal building creation:**

```
In `src/maps/ui/tools/BuildingTool.tsx`, create a building drawing 
tool with this behavior:

- When active, clicking on the canvas adds a corner point.
- A preview line shows from the last point to the cursor.
- Double-click or pressing Enter closes the polygon and creates 
  a Building entity.
- Pressing Escape cancels the current drawing.
- The created Building has its corners as the `shape` field and 
  empty arrays for doors, windows, and walls.

Use Zustand for state management (check existing Guildstew code for 
how it's set up). The current tool and in-progress drawing should 
live in the map module's Zustand store.

After this, integrate the tool into the viewport so the user can 
draw a building by clicking. Confirm in the browser that you can 
draw an L-shaped building.
```

**Wall materials:**

```
Read Section V of docs/forager/forager-project-brief-expanded.md 
for the material system design.

In `src/maps/engine/materials.ts`, define a `MATERIAL_REGISTRY` 
constant with five starter materials:

- `stone` — dampening 0.95, cover full, climbable false
- `wood` — dampening 0.6, cover full, climbable true (with check)
- `brick` — dampening 0.85, cover full, climbable false
- `plaster` — dampening 0.7, cover full, climbable false
- `fabric` — dampening 0.15, cover partial, climbable true

Each material has a visual color and texture name. For now use 
plain colors; we'll add texture rendering later.

After this, update the Building type to have a `defaultMaterial` 
field, and each Wall to have an optional `material` override.

Update the rendering layer to draw walls in their material's color.
Confirm in the browser that you can create a building, change a 
wall's material via a UI control, and see the color change.
```

**Doors and windows:**

```
In `src/maps/ui/tools/DoorTool.tsx` and `src/maps/ui/tools/WindowTool.tsx`,
create tools that:

- When active, the cursor highlights the nearest wall.
- Clicking on a wall places a door (or window) at that point on 
  the wall.
- Doors/windows are stored on the building with their wall ID and 
  parameter (0 to 1) along that wall.
- Doors and windows can be dragged to reposition along the same wall.
- Right-click opens a property panel for state (open/closed/locked) 
  and material.

After this, update the rendering layer to draw doors as orange bars 
on the wall and windows as lighter rectangles.

When auto-detection of building-to-building connections happens 
(not yet implemented; flag it as a TODO), doors will auto-place. 
For now, all doors are manual.

Verify in the browser that you can place doors and windows on 
walls and reposition them.
```

### Phase 4 Example Prompts

**Time system:**

```
In `src/maps/engine/time.ts`, create a TimeSystem class with:

- `gameTime` — minutes since midnight (0 to 1440)
- `timeScale` — game minutes per real second (0 = paused, 0.2 = 
  normal, 0.5 = fast, 1.0 = faster)
- `tick(dt: number)` — advances gameTime by dt * timeScale
- `getTimeOfDay()` — returns 'day' | 'dusk' | 'night'
- `formatTime()` — returns "HH:MM" string

Integrate this with the map module's Zustand store. The store 
exposes `gameTime` and `timeScale` to React components.

Build a `<TimeControls />` component that shows pause/play/fast 
forward buttons and the current clock. Match the styling from 
forager-prototype-v0.2.html.

After this, set up a requestAnimationFrame loop in the Viewport 
that calls tick() on every frame. Confirm the clock advances at 
the right pace (1 game minute per 5 real seconds at normal).
```

**NPC schedules and movement:**

```
Read forager-prototype-v0.2.html's updateNPC function for reference.

In `src/maps/engine/npc.ts`, port the updateNPC logic. It should 
handle three behavior archetypes:

- Schedule-following (target a building based on time)
- Patrol (cycle through waypoints)
- Aggro-on-proximity (chase player when close, lose interest when 
  hidden or far)

For pathfinding, use straight-line movement for now (TODO: replace 
with A* in a later phase).

Integrate NPC updates into the tick loop. Each tick, every NPC in 
every scene gets updated.

Add a `<NpcInspector />` panel that shows the selected NPC's 
current state: schedule entry, location, disposition, recent memory.

Verify in the browser by hardcoding a test scene with two NPCs on 
schedules. Hit play and watch them move between buildings.
```

### Phase 5 Example Prompts

**Supabase persistence:**

```
Read the existing Supabase migration files in `supabase/migrations/`.

Create a new migration: `supabase/migrations/[timestamp]_create_maps_tables.sql`

Add the following tables:

- `maps` — id, game_master_id, campaign_id, name, settings_jsonb, 
  created_at, updated_at
- `map_scenes` — id, map_id, name, ambient_mode, data_jsonb 
  (the scene state as JSON)
- `map_buildings` — id, scene_id, shape_jsonb, walls_jsonb, 
  doors_jsonb, windows_jsonb, default_material, name, description
- `map_npcs` — id, scene_id, source_compendium_id, position_xy, 
  schedule_jsonb, current_state_jsonb
- `map_simulation_state` — id, map_id, game_time, time_scale, 
  is_paused

Match column conventions from existing migrations. Use 
`game_master_id` (not created_by or user_id).

Add RLS policies: GM owns full read/write; players see read-only 
based on campaign membership.

Run the migration in development and confirm tables exist in 
Supabase Studio.
```

**Compendium integration:**

```
Read the existing Compendium API in Guildstew. Find the function 
that resolves a compendium ID to a stat block.

In `src/maps/api/compendium.ts`, create a wrapper:

`resolveEntity(campaignId, compendiumId): Promise<EntityStats>`

When an NPC is placed on the map, it stores `source_compendium_id`. 
When the simulation needs that NPC's stats (for combat triggers, 
for display in the inspector), it calls resolveEntity.

The Compendium cache should be respected — don't make a network 
call every time. Use TanStack Query if it's already in the 
Guildstew stack.

Update the NPC inspector to display compendium-resolved data.
```

**Combat handoff:**

```
Read the Combat Engine v2 documentation. Find the function 
that starts an encounter — probably called something like 
`startEncounter` or `beginCombat`.

In `src/maps/engine/combat-handoff.ts`, create a function 
`triggerCombatFromMap(scene, participants)` that:

1. Pauses the map simulation.
2. Collects participant stat blocks via the Compendium.
3. Calls the Combat Engine's startEncounter with participants 
   and positions.
4. Subscribes to the combat-ended event to resume map state 
   with updated participant data.

Hook this into the aggro-on-proximity behavior: when a hostile 
NPC reaches the player's room, the trigger fires.

Test by setting up a scene with a hostile NPC, walking the 
player into range, and confirming combat starts in the game.
```

---

## Part 6 — Failure Modes (And How to Recover)

### When Claude Code goes off the rails

**Symptoms:** It's writing code that doesn't match what you asked for. It's refactoring things you didn't want refactored. It's making up function names. It's confused about which file to edit.

**Recovery:** Stop immediately. Don't try to fix the bad output. Revert any uncommitted changes (`git checkout .`). Close the session if it's been long. Open a fresh session. Re-prompt with more context, smaller scope, and explicit constraints.

Example fresh prompt: *"Forget anything from before. Read `src/maps/engine/types.ts`. ONLY modify the `Building` interface — do not touch anything else. Add a `defaultMaterial: string` field. Show me the diff."*

### When the code doesn't work

**Symptoms:** It compiles but does nothing. It throws errors. The behavior is wrong.

**Recovery:** Show Claude Code the error or the wrong behavior. Be specific: *"After your change, when I click to add a building corner, nothing happens. Here's the console output: [paste]. Here's the relevant code: [paste]."*

Claude Code is often great at debugging when you give it concrete failure data. Less great at debugging from vague "it doesn't work."

### When you don't understand the code

**Symptoms:** Claude Code wrote something that works but you don't get how. You're afraid to modify it because you don't know what'll break.

**Recovery:** Ask Claude Code to explain. *"Walk me through `addBuilding` line by line. What does each part do? What happens if I call it twice with the same building?"*

Never ship code you don't understand. If you can't explain it to yourself in plain English, don't commit it. Ask until you do.

### When scope creeps

**Symptoms:** You started the session planning to add walls and now you're rewriting the rendering pipeline. The session is three hours in and you have nothing committable.

**Recovery:** Stop. Save what you have to a feature branch. Commit a note in PROGRESS.md describing what you were trying. Switch back to the original branch. Resume tomorrow with the original small task.

Scope creep happens because Claude Code makes it *too easy* to keep going. Discipline is your job, not its.

### When you hit a wall on integration

**Symptoms:** Something in Guildstew isn't where you expected. The Compendium API doesn't have the function you assumed. The Combat Engine works differently than you described.

**Recovery:** This is fine and expected. Real codebases have surprises. Open the relevant Guildstew code. Ask Claude Code: *"Read [file path]. Tell me how the Combat Engine actually starts an encounter — what function, what arguments. Then update our handoff plan."*

Adapt the plan to the actual code, not the imagined code.

---

## Part 7 — Survival Tips From Doing This For Real

**Commit every working change, even tiny ones.** A commit is a save point. You can always go back. The cost is zero. The peace of mind is enormous.

**Write a PROGRESS.md and update it every session.** Two-sentence summaries. *"Added Building polygon support and material registry. Next: door tool with snap-to-wall placement."* Future-you will thank present-you.

**Take breaks.** Programming brain works in cycles. After two hours of focused work, you're done. Push through and you make worse code. Walk away for thirty minutes and come back fresh.

**Don't gold-plate.** First version is ugly. Second version is functional. Third version is pretty. Don't skip to third. The temptation to "make it perfect before moving on" kills momentum.

**Celebrate small wins.** First building drawn on screen — that's a win. Take the screenshot. Post it somewhere. The dopamine of progress matters when the project is long.

**Talk to people.** Other developers, your team, even just rubber-ducking to Claude. Solo isolation is the productivity killer of long projects. Even a Discord channel where you post screenshots once a week is enough.

**Watch your energy, not your hours.** Some days you'll do four hours of brilliant work. Some days you'll do thirty minutes of decent work. Don't measure by clock time; measure by whether you moved the project forward today. *Most days you should move it forward. A few you shouldn't push and that's fine.*

**Eat. Sleep. Drink water.** Cliché but the project will eat you if you let it. Set hard limits. The project will be here tomorrow.

---

## Part 8 — When You're Stuck and Don't Know Why

A diagnostic checklist for those frustrating moments where everything's broken and you can't figure out where to even start.

1. **Did you commit recently?** If yes, `git diff` to see what changed. If no, this might be old broken state.
2. **Does the dev server actually have the new code?** Try restarting it. Vite usually hot-reloads but not always.
3. **Did you change types and forget to update consumers?** TypeScript will tell you with errors.
4. **Is the database in the expected state?** If migrations changed, did you run them?
5. **Is it a caching issue?** Hard-refresh the browser. Clear `node_modules/.vite`. Restart everything.
6. **Did Claude Code edit a file you didn't expect?** Check `git status` for unexpected modifications.
7. **Are you actually on the right branch?** `git branch` to confirm.
8. **Is there a console error you've been ignoring?** Open dev tools, look for red.

90% of "I'm stuck" moments are one of those eight things. Run the checklist before reaching for the next big idea.

---

## Part 9 — One More Time, The Big Three

If you remember nothing else from this guide:

**Stay scoped.** Every session, one small clearly-defined task. Resist the temptation to do more.

**Commit often.** Working code gets committed. No exceptions. Tiny commits are good commits.

**Test as you go.** Every change verified in the browser or with a test. Don't accumulate untested code; it compounds into chaos.

Do those three things and you will ship Forager. Don't, and you won't.

You've got this. Now go build the thing.

---

*Keep this open in a tab while you work. Reference it when you're confused. Update it as you discover what actually works for you.*
