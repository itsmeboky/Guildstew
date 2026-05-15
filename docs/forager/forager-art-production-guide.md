# Forager Art Production Guide

*For the artist building Forager's visual identity. What to make, how to make it, where it goes, how it gets wired in. Keep this open while you paint.*

---

## Part 0 — Read This First

You have a structural advantage that most TTRPG projects don't. Custom art means Forager doesn't look like Roll20, doesn't look like Foundry, doesn't look like every other small VTT that bought the same asset packs. Visual identity is the single fastest way for a new product to differentiate from incumbents, and you can do it from day one.

This guide covers every category of asset Forager needs, in technical detail, organized by what to make first. **You don't need to read all of it before you start. You need to make the Phase 1 starter set, get it wired in, and grow from there.**

A few principles to internalize before the specs:

**Tiling matters more than you think.** Most game assets need to tile seamlessly — meaning their edges match so they can repeat across a surface without visible seams. Terrain tiles tile in both directions. Wall textures tile horizontally. Roof textures tile in both. Floor textures tile in both. Failing to tile is the most common indie mistake. Whenever you make a tile, *test the tiling* before you call it done.

**Silhouette over detail.** Things will be rendered small. A 64x64 tree that has gorgeous bark texture but a vague blob silhouette reads worse than a simpler tree with a strong silhouette. *Squint at your asset. If you can't tell what it is at half size, simplify.*

**Atmospheric not photorealistic.** Forager's mood is moody. The dark void, the warm torchlight, the cool moonlight. Stylized illustrated art works better than photorealistic. Painterly is good. Pixel art is fine if you commit to it. Whatever style — *commit to it.* Inconsistent style is worse than any consistent style.

**Naming will save your life.** A consistent naming convention means assets find themselves. Sloppy naming means hours of "wait, which file was that one?" Use the conventions in this doc and you'll thank yourself in month three.

---

## Part 1 — The Asset Categories (Everything You'll Eventually Make)

This is the master list. Don't make all of it. Phase priorities come later. Just know what's coming.

### Terrain Tiles

The painted ground layer. Every variant of "what's the player walking on."

**Categories:**
- Grass (multiple biomes: meadow, jungle, savanna, dead grass)
- Water (shallow, deep, swamp, lake, salt water, frozen)
- Dirt (path, plain, road, muddy)
- Stone (cobblestone, flagstone, smooth marble, rough rock)
- Sand (beach, desert, glassy obsidian sand)
- Mud (wet, dry-cracked)
- Snow (fresh, packed, slushy)
- Ice (smooth, broken, glacial)
- Lava (flowing, cooling, obsidian crust)
- Forest floor (leaves, pine needles, moss)
- Wooden deck (for ships)
- Cave floor (gravel, stalagmite-strewn)

**Specs:**
- 64x64 PNG, transparent backgrounds NOT needed (these are full opacity)
- 3-5 variations per type, randomly selected per tile to break up repetition
- Must tile seamlessly with other tiles of same type (left-right, top-bottom)
- Color palette grounded but slightly stylized

### Wall Materials / Textures

The vertical surfaces of buildings. Used both as outer walls and interior walls.

**Categories:**
- Stone (rough hewn, smooth quarried, mortared blocks)
- Brick (red, gray, weathered)
- Wood (planks horizontal, planks vertical, logs)
- Plaster (smooth painted, peeling, ornate)
- Wattle and daub (rustic)
- Marble (white, green, red, veined)
- Metal (iron banded, riveted plates, copper)
- Fabric (tent canvas, silk, velvet drape)
- Magical (crystalline, runic, energy field)
- Ice (carved, glacial)

**Specs:**
- 64x64 PNG (square format makes them work for both vertical and horizontal walls)
- Must tile horizontally (the wall direction)
- Don't worry about vertical tiling — walls are usually a constant height
- Damage variants are nice-to-have later: intact, cracked, destroyed

### Roof Textures

The view from above when a building's roof is sealed.

**Categories:**
- Thatch (golden straw, dark mossy, recently re-thatched)
- Slate (gray, dark, weathered)
- Tile (red clay, terracotta)
- Wooden shingles (cedar, weathered gray)
- Copper (new bright, oxidized green)
- Snow-covered (any roof type with snow overlay)
- Canvas (tents)
- Reed (rough)

**Specs:**
- 64x64 PNG, tiles in both directions
- These read at the building scale — a 200x150 px building roof will be the texture tiled
- Should have enough variation that tiling doesn't look like obvious repetition

### Floor Textures

The interior of buildings, visible when the roof is transparent.

**Categories:**
- Wooden planks (light, dark, polished)
- Stone tile (square, hexagonal, mosaic)
- Dirt (packed, swept)
- Carpet (red, woven, ornate, threadbare)
- Marble (checkered black/white, single color)
- Sawdust (smithy)
- Straw (stable)
- Tile mosaic (temple)

**Specs:**
- 64x64 PNG, tiles in both directions
- Often paired with a wall material thematically (wooden floor + wooden walls = peasant cottage)

### Door Variants

Doors as sprites placed at points along wall edges.

**Categories:**
- Wooden plank (simple farm door)
- Iron-banded (sturdy)
- Ornate carved (manor, temple)
- Stone (dungeon)
- Magical (rune-inscribed)
- Curtain (drape over an entryway)
- Hidden / secret (visually a wall section)

**States per door:**
- Closed
- Open (swung inward or outward)
- Locked (visual: chains, lock plate)
- Broken (smashed inward)
- Barred (planks across)

**Specs:**
- 32x48 PNG, transparent background
- Designed to render facing south (along a south wall)
- Engine rotates the sprite for north/east/west walls
- Can include shadow underneath for grounding

### Window Variants

Same concept as doors, smaller, no traversal.

**Categories:**
- Glass pane (clear, lead-lined)
- Shuttered (wooden shutters open or closed)
- Barred (iron grille)
- Stained glass (color, ornate)
- Broken (glass jagged)
- Curtained (cloth across opening)
- Arrow slit (defensive)
- Round (porthole, for ships)
- Rose window (temple)

**States:**
- Open
- Closed (glass visible or shutters closed)
- Broken
- Shuttered (separate from closed if you want curtains/shutters as a thing)

**Specs:**
- 24x32 PNG, transparent background
- South-facing, engine rotates for other walls

### Trees

Top-down view trees, the most-used object after terrain.

**Categories per biome:**
- Forest: oak, pine, birch, ash, dead, ancient/gnarled
- Tropical: palm, jungle canopy, mangrove
- Cold: pine snow-laden, dead, evergreen
- Magical: glowing willow, crystalline, blood-leaved
- Domestic: orchard fruit trees (apple, plum), olive

**Specs:**
- 64x64 PNG, transparent background
- Top-down view from slightly elevated angle so you see the canopy
- Should have a "shadow" cast on the ground (built into the asset)
- Variations: 3-5 per type (different rotations, slight size variation)
- Seasonal variants nice-to-have: spring blossoms, summer full, autumn red/gold, winter bare

### Bushes / Shrubs

Smaller foliage, also used as stealth/cover.

**Categories:**
- Brambles (thorny, dense)
- Berry bushes (red berry, blueberry, brambleberry)
- Hedges (manicured, wild)
- Ferns (forest floor)
- Reeds (water's edge)
- Cactus / desert succulents
- Moss patches (cave, forest)
- Stalagmites (cave variant)

**Specs:**
- 32x32 or 48x48 PNG, transparent background
- Top-down view
- Variations: 3-5 per type

### Decor / Furniture

Interior objects that make a building feel populated.

**Categories:**
- Furniture: tables, chairs, benches, beds, wardrobes, cabinets, bookshelves, desks
- Lighting: candelabra, candles, oil lanterns (when not lit/placed)
- Cooking: hearth, cauldron, cooking pot, fire pit, oven
- Containers: chests, crates, barrels, sacks, vases, urns
- Decoration: rugs, tapestries, paintings (frames), statues, busts
- Tools: anvil, forge, loom, scribe's desk, alchemy bench
- Personal: mirrors, washbasins, chamber pots
- Religious: altars, idols, shrines, prayer mats
- Combat: weapon racks, armor stands, training dummies

**Specs:**
- Variable sizes based on what they are — 32x32 for small things (chair), 64x32 for tables, etc.
- PNG with transparency
- Top-down or slight 3/4 isometric view (pick one and commit)

### Light Sources

Things that emit visible light.

**Categories:**
- Torch (lit, unlit)
- Lantern (oil, magical)
- Candle (single, in candelabra)
- Campfire (small, medium, roaring)
- Magical glow stone / orb
- Brazier (large)
- Firefly cluster (ambient)

**Specs:**
- 16x16 to 32x32 PNG sprites for the light source itself
- The "glow" is rendered programmatically as a radial gradient — you don't paint that
- Two states per light: lit (with subtle flame/glow embedded) and unlit (cold)
- Light color is a property in the metadata, not baked into the sprite

### NPC Tokens

The visible representation of characters on the map.

**Categories:**
- Archetypes: peasant, merchant, noble, guard, soldier, priest, scholar, thief, sailor, child, elder
- Variations within each: different clothes, postures, body types
- Race variants if your setting wants them: human, elf, dwarf, halfling, orc, etc.
- Class variants: warrior, wizard, rogue, cleric, ranger, etc.
- Monster variants: goblin, skeleton, wolf, spider, demon, etc.

**Specs:**
- 64x64 or 128x128 PNG with transparency
- Top-down view (a circle with the character's head/shoulders visible from above) OR slight 3/4 angle
- Each token has a "facing" — should support 4 or 8 directions if you want directional rendering
- Color band around the edge for disposition (warm for friendly, red for hostile, gray for neutral) — but that can be programmatic, you don't paint it

### Mounts and Animal Companions

Their own category because they're animated entities.

**Categories:**
- Mounts: horse (various colors), warhorse, pony, mule, camel, dire wolf, griffon, ram, lizard mount, giant spider
- Companions: wolf, cat, raven, owl, eagle, hawk, dog (various breeds), ferret, snake, fox
- Monster pets: pseudodragon, imp, faerie dragon, blink dog

**Specs:**
- 48x48 to 96x96 PNG with transparency, depending on creature size
- Top-down view, same convention as NPCs

### Effects / Overlays

Visual effects rendered over the map.

**Categories:**
- Weather: rain droplets, snow particles, fog wisps
- Magic: aura glow, sparkles, runes, spell effect placeholders
- Combat: damage numbers (engine renders), wound markers, blood splatter
- Environmental: leaves blowing, smoke, dust devils
- UI: selection ring, target indicator, range circle outline

**Specs:**
- Most effects are rendered programmatically — you don't paint rain particles. But you might paint a single raindrop sprite that the engine duplicates.
- Particles: 8x8 to 16x16 PNGs with transparency
- Auras and large effects: 128x128 or larger, can be radial

### UI Elements

The chrome around the canvas.

**Categories:**
- Tool icons (paint brush, building tool, tree, NPC, torch, etc.)
- Cursors (custom cursor per tool — paint cursor, place cursor, move cursor)
- Panel backgrounds (parchment, dark wood, marbled stone for different moods)
- Buttons (idle, hover, active, disabled states)
- Borders and frames (around portraits, around blurbs)
- Dividers and ornaments
- The clock face (since the clock is a key visual element)
- Currency icons (gold, silver, copper, spice)
- Dice (d4, d6, d8, d10, d12, d20)
- Health/condition icons (poisoned, prone, blinded, etc.)
- Faction crests / heraldry pieces

**Specs:**
- Toolbar icons: 24x24 or 32x32 PNG with transparency
- Cursor: 32x32 PNG, hot-spot identified
- Panel decoration: variable, depends on use

### Decals and Surface Marks

Things that go ON other surfaces.

**Categories:**
- Blood (small splatter, large pool, dried stain)
- Footprints (boot, bare foot, paw, claw)
- Wagon tracks
- Scorch marks
- Magical sigils (drawn, scorched, drawn-in-chalk)
- Graffiti / writing
- Door knockers / handles
- Wear marks (scratched wood, scuffed stone)

**Specs:**
- Small: 16x16 to 32x32 PNG with transparency
- Often rendered with reduced opacity to look like staining

---

## Part 2 — How Assets Get Wired In

This is the bit Claude Code will set up; you just need to know where to drop the files and what to write alongside them.

### Folder Structure

```
public/forager-assets/
├── terrain/
│   ├── grass-meadow/
│   │   ├── grass-meadow-01.png
│   │   ├── grass-meadow-02.png
│   │   ├── grass-meadow-03.png
│   │   └── manifest.json
│   ├── water-shallow/
│   ├── stone-cobblestone/
│   └── ...
├── materials/
│   ├── wall-stone-rough/
│   │   ├── wall-stone-rough.png
│   │   └── manifest.json
│   ├── wall-wood-planks/
│   └── ...
├── roofs/
├── floors/
├── doors/
├── windows/
├── trees/
├── bushes/
├── decor/
├── lights/
├── tokens/
│   ├── npcs/
│   ├── monsters/
│   ├── mounts/
│   └── companions/
├── effects/
├── decals/
└── ui/
    ├── icons/
    ├── cursors/
    └── panels/
```

Each asset *category* lives in its own folder. Multiple files per category go into a subfolder. The `manifest.json` file alongside the images tells the engine what each asset is and what metadata it carries.

### The Manifest Format

A `manifest.json` next to your terrain tiles looks like this:

```json
{
  "id": "grass-meadow",
  "displayName": "Meadow Grass",
  "category": "terrain",
  "variants": [
    "grass-meadow-01.png",
    "grass-meadow-02.png",
    "grass-meadow-03.png"
  ],
  "metadata": {
    "speedModifier": 1.0,
    "footstepSound": "soft-grass",
    "concealment": "none",
    "biome": "temperate-meadow",
    "season": "summer"
  },
  "credits": "Art by Boky, May 2026"
}
```

For a wall material:

```json
{
  "id": "wall-stone-rough",
  "displayName": "Rough Stone",
  "category": "wall-material",
  "texture": "wall-stone-rough.png",
  "tilesHorizontally": true,
  "metadata": {
    "soundDampening": 0.95,
    "coverValue": "full",
    "climbable": false,
    "fireResistance": "high",
    "structuralIntegrity": "high"
  },
  "credits": "Art by Boky"
}
```

For a door:

```json
{
  "id": "door-wooden-plank",
  "displayName": "Wooden Plank Door",
  "category": "door",
  "states": {
    "closed": "door-wooden-plank-closed.png",
    "open": "door-wooden-plank-open.png",
    "locked": "door-wooden-plank-locked.png",
    "broken": "door-wooden-plank-broken.png"
  },
  "metadata": {
    "material": "wood",
    "soundDampening": 0.6,
    "lockDifficulty": "medium",
    "hingeCreaky": true
  },
  "credits": "Art by Boky"
}
```

You don't write the engine code that reads these. Claude Code does. *You just drop the files in and add the manifest.* If the manifest format is right, the asset shows up in Forager and can be used by GMs.

### The Wiring (How It Works Under The Hood)

When the app starts, the engine scans `public/forager-assets/` and loads every `manifest.json` it finds. Those manifests get compiled into a registry the engine uses to:

- Show your asset in the GM's tool palette
- Apply the metadata (speed modifier, sound dampening, etc.) to the simulation
- Render the visual at the right time

You don't need to know how this works. You need to know that the moment you drop a properly-formatted asset + manifest into the right folder, *it shows up in the app.*

---

## Part 3 — Phase Priority (What To Make When)

Don't make everything before code starts. Make exactly what's needed for the current phase. The list:

### Phase 1 (Engine Skeleton): Make nothing.

You don't need assets yet. The engine is being set up. Spend this time deciding your *style* — do a few test pieces, find the look, lock it in. Don't ship any final art yet.

What to do during Phase 1:
- Make 3-5 *style test pieces* — try a grass tile, a wall texture, a tree, a building outline, a torch sprite. Don't worry about finishing them. Iterate until you have a look that feels right.
- Decide your style guidelines (more on this below).
- Build a small mood board of references.

### Phase 2 (Rendering Foundation): The starter set.

When the engine can render scenes, you need basic assets so there's something to render. The Phase 2 starter set:

- **3 terrain types, 3 variants each** (9 PNGs): grass-meadow, water-shallow, dirt-path
- **2 wall materials** (2 PNGs): wall-stone-rough, wall-wood-planks
- **1 roof type** (1 PNG): roof-thatch
- **1 floor type** (1 PNG): floor-wood-planks
- **3 trees, 3 variants each** (9 PNGs): tree-oak, tree-pine, tree-dead
- **2 bushes, 3 variants each** (6 PNGs): bush-bramble, bush-fern
- **1 door, 2 states** (2 PNGs): door-wooden-plank closed and open
- **1 window, 2 states** (2 PNGs): window-glass closed and open
- **1 torch, 2 states** (2 PNGs): torch lit and unlit
- **3 NPC tokens** (3 PNGs): npc-peasant, npc-guard, npc-merchant
- **1 player token** (1 PNG)

**Total: about 38 PNG files + manifests.** This is your *demoable village* — enough to populate a small map convincingly. Don't make more until this is wired in and rendering correctly.

### Phase 3 (Authoring Tools): Expand the palette.

Now that the building tools are real, you need richer material and decor options.

- **5 more wall materials**: brick, plaster, marble, fabric (tent), metal
- **3 more roof types**: slate, tile, copper
- **3 more floor types**: stone, carpet, dirt
- **5 more door variants** (with 3-4 states each): ornate, iron-banded, magical, curtain, hidden
- **5 more window variants** (with states): shuttered, barred, stained glass, broken, round
- **Furniture / decor**: table, chair, bed, chest, bookshelf, hearth, weapons rack, anvil, alchemy bench (3-4 variations of each)
- **Toolbar icons** for all the tools in the UI

**Total: about 60-80 more PNGs.** This is when the world starts looking lived-in.

### Phase 4 (Simulation): Atmospheric assets.

Time, weather, lighting, NPC variety.

- **More terrain types**: stone-cobblestone, sand, snow, mud, ice
- **Weather effects**: rain particle, snow particle, fog overlay
- **Weather UI**: rain icon, sun icon, etc.
- **More NPC archetypes**: 10-15 more (priest, scholar, noble, child, etc.)
- **Mount/companion sprites**: horse (3 colors), wolf, raven, dog, cat — Phase 4 introduces mounts and companions

### Phase 5 (Integration): Polish and content packs.

- **Faction crests** and heraldry pieces
- **Magical effects**: aura glow, sigils, spell area outlines
- **Decals**: blood, footprints, scorch marks
- **Currency icons**, dice icons, condition icons
- **Sample published content** for the marketplace launch: a Pub or two of fully-art-loaded content

### Phase 6 (Polish): Brand identity.

- **UI chrome refinement**: panel backgrounds, frames, dividers
- **Custom cursors** per tool
- **Marketing visuals**: hero art for landing pages, social media kits, Kickstarter rewards

---

## Part 4 — Style Guidelines (Pick And Commit)

This is the most important meta-decision. Whatever style you choose, *commit to it everywhere.* Inconsistent style is the #1 killer of visual identity.

### Style Direction Questions

Before you make a single final asset, answer these:

1. **Painterly or pixel art?** Painterly (Inkarnate, RimWorld 2D-ish, soft brush strokes) reads as more "fantasy serious." Pixel art (Stardew Valley, RimWorld) reads as "cozy retro." Pick one.

2. **Top-down flat or 3/4 isometric?** Flat is simpler to draw, easier to rotate. Iso has more visual interest but is harder. Pick one and stick to it across the whole project.

3. **Outlined or no-outline?** Outlines make things read clearly at small sizes but can feel cartoonish. No-outline feels more painterly but harder to read. Pick one.

4. **Color palette: muted or vibrant?** Forager's prototype leans dark and warm with stark contrasts. The brand is orange/navy/teal/salmon. You could go more muted earth tones, or push the saturation. Find your palette and document it.

5. **Realistic proportions or stylized?** Tokens at human-scale realism vs. chibi-style with big heads. Affects all character art.

### My Recommendation (Take Or Leave)

If I were calling the shots: **painterly, top-down with slight elevated angle, light outlines around objects only (not on tiles), muted earthy palette with saturated accents from the brand (orange/teal), slightly stylized proportions for tokens.**

This style:
- Reads well at the dark-FOW atmosphere of the prototype
- Matches the Cinzel/serif type aesthetic of Guildstew
- Is more distinctive than the polished-realism look every other VTT goes for
- Scales from 32x32 icons up to 128x128 NPC tokens without looking weird

But you're the artist. Try a few directions during Phase 1 and pick what feels right to you. Bringing your authentic style is more valuable than aping mine.

### Style Guide Document

Once you've picked a direction, document it. A `style-guide.md` in `docs/forager/` with:

- Color palette (hex codes for primary, secondary, accents)
- Outline rules (where outlines go, how thick, what color)
- Lighting (warm light from above, cool shadows below, etc.)
- Texture roughness level (smooth painterly vs. textured impasto)
- Reference images that capture the vibe

This becomes the rulebook for every future asset, and if you ever hire help, it tells them how to match your style.

---

## Part 5 — Naming Conventions (Don't Skip This)

Every file gets a name. Consistent naming saves you hours.

### The Format

```
{category}-{subcategory}-{variant}.png
```

Examples:
- `grass-meadow-01.png`
- `wall-stone-rough.png`
- `door-wooden-plank-closed.png`
- `tree-oak-spring-02.png`
- `npc-peasant-female-01.png`
- `mount-horse-brown.png`
- `decor-chair-wooden.png`

### The Rules

- All lowercase
- Hyphens between words, never spaces or underscores
- Numbers for variants are two-digit (`01`, `02`, not `1`, `2`)
- States as suffixes after the variant: `door-wooden-plank-01-closed.png`
- Be specific: `tree-oak-summer-02.png` is better than `tree-2.png`

### The Manifest IDs Match

The `id` field in `manifest.json` matches the folder name. If your folder is `grass-meadow/`, the manifest `id` is `"grass-meadow"`. The engine uses the id to reference the asset throughout the codebase.

---

## Part 6 — The First Ten Things To Make

If you want a starting checklist for week one of art production:

1. **Grass meadow tile, three variants.** Tileable in both directions. Test the tiling.
2. **Water shallow tile, three variants.** Tileable. Optional: a small bonus variant with a ripple.
3. **Stone cobblestone tile, three variants.** Tileable.
4. **Wall material: stone-rough.** One texture, horizontally tileable.
5. **Wall material: wood-planks.** Same.
6. **Roof: thatch.** Tileable in both directions.
7. **Floor: wood-planks.** Tileable.
8. **Tree: oak.** Three variants, top-down, with built-in shadow.
9. **Bush: bramble.** Three variants.
10. **Player token.** Just one. Generic adventurer figure. 64x64.

That's your first ten files. With those plus the manifests, you have *enough to make Phase 2 functional.* The engine can render scenes. The art is yours. The look is locked in.

Spend a week on those, no more. Don't perfect them. Get them done. The engine team needs assets to wire in by Phase 2; the perfect grass tile arrives in version three.

---

## Part 7 — Workflow Tips From The Trenches

A few practical things that'll matter as you produce.

**Work in a high-resolution master file, export at the target size.** Paint your grass tile at 256x256 or higher. Export at 64x64. You always have the high-res original if you need to redo or upscale.

**Group similar assets in one session.** Don't make a grass tile then a door then a tree. Make all five grass variants in one sitting. Style and consistency stay locked in within a session and drift between them.

**Save your color palette as a swatch file.** Affinity, Procreate, Photoshop — all have palette tools. Same palette across all assets keeps consistency without effort.

**Make your first version fast and ugly.** Get a placeholder version of an asset into the project as soon as possible so the engine can wire it in. Improve later. Don't spend three hours on the first stone tile.

**Look at your art in-context, not just in the canvas.** Once your asset is in Forager, look at it in the actual map alongside other assets. Things often look great in isolation and wrong in context.

**Reuse and mirror.** Most tree variants can be the same tree mirrored or rotated. Most NPC tokens can share base outlines and vary clothes. Don't paint from scratch when you can paint variations.

**Reference photography is fine. Reference other people's art is not.** Take a thousand photos of grass for a grass tile. Don't trace someone's tree.

**Document credits as you go.** Every asset gets a credit field. Forager will be a marketplace; copyright matters. Track who made what.

---

## Part 8 — When You're Stuck

You'll hit walls. Here's how to break through them.

**"I can't get this tile to tile cleanly."** Use the offset filter (most apps have one). Look at the seams. Paint over them. Re-test. Repeat until invisible.

**"My style doesn't look consistent."** Pull out your style guide. Look at three favorite assets you've made. Find the common thread. Apply that thread to the inconsistent one.

**"This NPC token looks awful."** Silhouette test. Black it out, look at the shape. If the shape doesn't read, the details don't matter — fix the silhouette first.

**"I don't know what color palette to use."** Pick three colors you love. One bright (your accent), one muted (your base), one dark (your shadow). Most things will use those three plus white. Limit yourself; force the constraint to drive cohesion.

**"It looks bad and I don't know why."** Show it to someone. Even a non-artist friend. They won't know the term for what's wrong but they'll feel it. Their feeling is data.

**"I've spent three hours on this and I hate it."** Save it as a draft. Move on. Come back tomorrow. Sometimes the eyes need to reset.

---

*Keep this open while you paint. Update it when you find better conventions. Your future self will thank present you.*
