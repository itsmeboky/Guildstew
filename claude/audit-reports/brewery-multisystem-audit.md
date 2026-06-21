# Brewery Multi-System Audit — Recon Report

**Scope:** Map what it takes to (a) make the Brewery **game-pack-aware** across **D&D 5e 2014, D&D 5e 2024, Pathfinder 2e**, and (b) add two net-new Pint authoring forms — **Background** and **Subclass**.

**Status:** Investigation only. No source file was modified, created, renamed, or deleted (the sole new file is this report). No SQL written. No fixes applied — bugs tripped over are logged in the Appendix.

**Branch:** `claude/brewery-multisystem-audit`, cut from `origin/main`.

All anchors below were grep/read-confirmed on the working tree; the seeded hints from the prior audit had drifted and the verified line numbers are used throughout.

---

## Section 1 — Brewery shell & form architecture

Primary file: `src/components/homebrew/CreateHomebrewDialog.jsx` (5983 lines).

### 1.1 Type selection — **static, hardcoded list**

The authorable Pint-type set is a static module-level array, **not** config-driven and **not** pack-derived.

- `src/components/homebrew/CreateHomebrewDialog.jsx:57-63` — the enumeration:
  ```js
  const CONTENT_TYPES = [
    { value: "rule_modification",    label: "Rule Modification",    description: "Change how an existing rule works." },
    { value: "custom_item",          label: "Custom Item",          description: "Weapon, armor, potion, wondrous item, or scroll." },
    { value: "custom_monster",       label: "Custom Monster",       description: "A new creature with a full combat-ready stat block." },
    { value: "custom_spell",         label: "Custom Spell",         description: "A new spell with effects and upcasting." },
    { value: "custom_class_feature", label: "Custom Class Feature", description: "A class feature, racial trait, or general ability." },
  ];
  ```
- The user picks a type via a **button grid** mapped from this array: `CreateHomebrewDialog.jsx:933` (`{CONTENT_TYPES.map((t) => {`), setting `contentType` state.
- The chosen type then **switches the rendered form** via `contentType === "..."` conditionals (≈`CreateHomebrewDialog.jsx:1138-1160`).
- Form component definitions (verified):
  - `CustomItemForm` — `CreateHomebrewDialog.jsx:1485`
  - `CustomMonsterForm` — `CreateHomebrewDialog.jsx:2211`
  - `CustomSpellForm` — `CreateHomebrewDialog.jsx:5179`
  - `CustomClassFeatureForm` — `CreateHomebrewDialog.jsx:5545`
- Blank-state constants (verified):
  - `BLANK_MONSTER` — `CreateHomebrewDialog.jsx:444`
  - `BLANK_SPELL` — `CreateHomebrewDialog.jsx:485`
  - `BLANK_CLASS_FEATURE` — `CreateHomebrewDialog.jsx:532`
  - `BLANK_ITEM` — `CreateHomebrewDialog.jsx:635`

> **Refactor implication:** adding `custom_background` / `custom_subclass` means extending `CONTENT_TYPES`, adding two `BLANK_*` constants, two `Custom*Form` components, two render conditionals, and two `build*Modifications` serializers — the same five-touchpoint pattern every existing type follows. To become pack-aware, `CONTENT_TYPES` must become a function of the selected pack rather than a frozen constant.

### 1.2 — 2014 / D&D assumptions baked into the dialog (the surface to neutralize)

The dialog assumes a single system. The system picker exists but **only offers D&D 5e**, and the entire rules vocabulary is hardcoded or imported from a D&D-only module.

**System is hardwired:**
- `CreateHomebrewDialog.jsx:707` — `const [gameSystem, setGameSystem] = useState("dnd5e");`
- `CreateHomebrewDialog.jsx:749` — edit path defaults to dnd5e: `setGameSystem(brew?.game_system || "dnd5e");`
- `CreateHomebrewDialog.jsx:983` — `<Select value={gameSystem} ...>`
- `CreateHomebrewDialog.jsx:988` — **only one option**: `<SelectItem value="dnd5e">D&D 5e</SelectItem>`

**Hardcoded D&D rules vocabulary (constants):**
- `CreateHomebrewDialog.jsx:66` — `ABILITY_KEYS = ["str","dex","con","int","wis","cha"]` (6-ability model)
- `CreateHomebrewDialog.jsx:70-77` — `SKILLS_BY_ABILITY` (5e skill list) + `:78` `ALL_SKILLS`
- `CreateHomebrewDialog.jsx:81-82` — `CR_OPTIONS` (Challenge Rating 0…30, 1/8, 1/4, 1/2)
- `CreateHomebrewDialog.jsx:84` — `SIZE_OPTIONS` (Tiny…Gargantuan)
- `CreateHomebrewDialog.jsx:86-89` — `CREATURE_TYPES` (Aberration, Beast, …)
- `CreateHomebrewDialog.jsx:91-96` — `ALIGNMENTS` (9-box)
- `CreateHomebrewDialog.jsx:98` — `SAVE_ABILITIES = ["STR","DEX","CON","INT","WIS","CHA"]`
- `CreateHomebrewDialog.jsx:100-102` — `CASTING_TIMES` (1 action / bonus action / reaction …)
- `CreateHomebrewDialog.jsx:108` — `FEATURE_SOURCE_TYPES` (Class Feature / Racial Feature / General Ability / Feature Menu)
- `CreateHomebrewDialog.jsx:109` — `FEATURE_COSTS` (Action / Bonus Action / Reaction / Free / Passive)
- `CreateHomebrewDialog.jsx:110-119` — `FEATURE_USES` (At Will, 1/Short Rest, 1/Long Rest, Proficiency Bonus/Long Rest…)
- `CreateHomebrewDialog.jsx:120` — `FEATURE_RECHARGE` (Short Rest / Long Rest / Dawn / Dusk / Never)
- `CreateHomebrewDialog.jsx:128-135` — `RESOURCE_POOLS` (Hit Points, Spell Slot, Rages…)
- `CreateHomebrewDialog.jsx:154` — `ACTION_COSTS` (…, Legendary)

**Hardcoded D&D imports / formulas:**
- `CreateHomebrewDialog.jsx:29-34` — imports `DAMAGE_TYPES, WEAPON_PROPERTIES, SPELL_SCHOOLS, CLASS_HIT_DICE` from `@/components/dnd5e/dnd5eRules` (a D&D-only module; `SPELL_CLASSES = Object.keys(CLASS_HIT_DICE)` at `:104`)
- `CreateHomebrewDialog.jsx:35` — imports `CONDITION_COLORS` from `@/components/combat/conditions` (D&D condition set)
- 5e ability modifier formula `(score-10)/2` inside `CustomMonsterForm` (≈`CreateHomebrewDialog.jsx:2201-2205`)
- Feature-DC formula `8 + prof + ability` baked into `BLANK_CLASS_FEATURE` (`CreateHomebrewDialog.jsx:584`) and the DC-source labels (≈`:138-142`)
- D&D defaults throughout the `BLANK_*` constants: `school:"Evocation"` (`:488`), `stats:{str..cha:10}` (`:453`), `save:"DEX"`/`condition_save:"WIS"` (`:508`,`:517`), HP placeholder `"30 (4d8 + 12)"`, `legendary_resistances`/`multiattack`/`villain_actions` (monster, `:470-473`).

> Note: the many `// Tier 3 — …` comments (e.g. `:263`, `:293`, `:315`) refer to **feature-complexity tiers**, not subscription tiers — do not confuse with §1.5.

> **Refactor implication:** every constant above is a "pack capability" that PF2e (and 2024, in part) will answer differently — PF2e has no CR, no 9-box alignment, different skills, proficiency-rank not bonus, four-degree saves, ability *boosts* not 6-score. The pack-aware path is to source these lists from the selected game pack rather than module constants, and to drop the hard `dnd5eRules` import in favor of a pack-provided rules surface.

### 1.3 Save path — `HomebrewRule.create` → `homebrew_rules`, discriminator is `category`

- Entity wrapper: `src/api/entities.js:120` — `HomebrewRule: createEntity('homebrew_rules')`.
- Create call: `CreateHomebrewDialog.jsx:858` — `await base44.entities.HomebrewRule.create({ ...payload, is_published: false })`.
- **The discriminator column is `category`, not `type`** — confirmed at `CreateHomebrewDialog.jsx:820-842`:
  ```js
  let effectiveCategory;
  if (isCustomItem)                          effectiveCategory = "custom_item";
  else if (contentType === "custom_monster") effectiveCategory = "custom_monster";
  else if (contentType === "custom_spell")   effectiveCategory = "custom_spell";
  else if (contentType === "custom_class_feature") effectiveCategory = "custom_class_feature";
  else                                       effectiveCategory = category;   // → "rule_modification"
  ...
  const payload = { creator_id, title, description, category: effectiveCategory, game_system: gameSystem, version, content_rating, cover_image_url, tags, modifications: mods };
  ```
- **Verbatim discriminator strings written today:** `custom_item`, `custom_monster`, `custom_spell`, `custom_class_feature`, `rule_modification`. (Legacy `custom_ability` is still *read* on attach — see §4.3 — but is no longer authored by this dialog.)
- **Payload shape per type:** the type-specific content is serialized into the `modifications` JSONB blob by per-type builders:
  - `custom_item` → `buildItemModifications(item)` (≈`CreateHomebrewDialog.jsx:2112`)
  - `custom_monster` → `buildMonsterModifications(monster)` (≈`:4771`)
  - `custom_spell` → `buildSpellModifications(spell)` (≈`:4945`)
  - `custom_class_feature` → `buildClassFeatureModifications(classFeature)` (≈`:5087`)
  - `rule_modification` → raw `modifications` state passthrough.
  The blob shape mirrors the corresponding `BLANK_*` constant (field lists in §1.1 anchors).

### 1.4 Brewery surfaces (visual-refresh scope)

Full component set composing the Brewery UI (all under `src/components/homebrew/` unless noted):

| Surface | File |
|---|---|
| Page / tabs / filters | `src/pages/Brewery.jsx` |
| Marketplace grid card | `src/components/homebrew/BreweryCard.jsx` |
| Content-pack card | `src/components/homebrew/ContentPackCard.jsx` |
| User's brews list + attach flow | `src/components/homebrew/MyBrewsList.jsx` |
| Detail modal (reviews/install) | `src/components/homebrew/BreweryDetailDialog.jsx` |
| Type chooser entry point | `src/components/homebrew/CreateModDialog.jsx` |
| Campaign-homebrew creator (the Pint forms) | `src/components/homebrew/CreateHomebrewDialog.jsx` |
| Race / Class / Content-Pack / Reskin / Sheet / Code creators | `CreateRaceModDialog.jsx`, `CreateClassModDialog.jsx`, `CreateContentPackDialog.jsx`, `CreateReskinModDialog.jsx`, `CreateSheetModDialog.jsx`, `CreateCodeModDialog.jsx` |
| Install confirm / code-mod help / sheet sections | `InstallModDialog.jsx`, `CodeModHelpPanel.jsx`, `SheetModSections.jsx` |
| Campaign-side installed-mods panel | `src/components/campaigns/BreweryModsPanel.jsx` |

**Shared design system the refresh must stay inside:**
- shadcn/ui primitives under `src/components/ui/` — `dialog.jsx`, `select.jsx`, `tabs.jsx`, `badge.jsx`, `button.jsx`, `input.jsx`, `textarea.jsx`, `scroll-area.jsx`, etc. (used throughout the surfaces above).
- Theme tokens: `tailwind.config.js` (creator palette ≈`:67-80`) and `src/index.css` (`--font-heading` / `--font-body`, dyslexia mode).
- Recurring inline brand tokens to keep consistent: teal accent `#37F2D1`, card `#2A3441`, modal `#1E2430`, input `#0b1220`, deep bg `#050816` (e.g. active tab `data-[state=active]:bg-[#37F2D1]` in `Brewery.jsx`; hover glow `hover:shadow-[0_0_20px_rgba(55,242,209,0.15)]` in `BreweryCard.jsx`).

### 1.5 Tier-gating — **not in the Pint dialog; enforced per mod-type elsewhere**

- `CreateHomebrewDialog.jsx` has **no tier/entitlement check** — the Pint forms (monster/item/spell/class-feature) are ungated client-side; the only disable is `saveMutation.isPending`. Server-side RLS on `homebrew_rules` is not defined in repo migrations (see §4.1), so any gate there is base44-managed and not visible in-repo.
- Tier gating **does** exist on the surrounding mod creators, using a shared `tierAtLeast(...)` helper against `sub?.tier`:
  - `CreateModDialog.jsx:82-88` — `const tier = sub?.tier || "free"; const isVeteran = tierAtLeast(tier, "veteran"); ... if (type.veteranOnly && !isVeteran) return;` (Code Mod card flagged `veteranOnly: true` at `:76`, locked UI at `:113`/`:131`).
  - `CreateContentPackDialog.jsx:80` — `const canPublish = tierAtLeast(sub?.tier || "free", "veteran");`; throws "Publishing to the Brewery requires a Veteran subscription" at `:149`; stamps `creator_tier` at `:172`.
  - `CreateCodeModDialog.jsx:64,121,124,168` — create + publish both require Veteran.
- Ladder names observed: `free` / `adventurer` / `veteran` (the "Guild" name in the brief does not appear as a literal in these files; the live ladder literals are free/adventurer/veteran with `tierAtLeast` ordering).

> **Implication:** Background/Subclass forms inherit the dialog's current *ungated* authoring behavior unless a `tierAtLeast` gate is added deliberately, matching the content-pack/code-mod precedent.

---

## Section 2 — Game pack declaration in code

### 2.1 Is there a `GamePack` interface? — **Two parallel, partial systems exist; no single contract**

There is no TypeScript interface / typedef / formal spec defining a `GamePack` shape. Instead two **separate, similarly-named** systems coexist:

1. **Data-adapter registry** — `src/data/games/index.js:1-144`.
   - `ADAPTERS` registry with three keys (`dnd5e_2014`, `dnd5e_2024`, `pathfinder_2e`).
   - Exports `getGamePackData(packId)` (`:133`), aliased `export const getGamePack = getGamePackData` (`:139`), and `listGamePackIds()` (`:142`).
   - Surface is **ad-hoc method bags** (`getEquipment`, `getEquipmentByCategory`, and for 2024 `getClasses`, `getSubclassesForClass`, …) — there is **no declared content-type catalog**.
   - Consumed by the character creator (e.g. `EquipmentStep.jsx`, `ClassStep2024.jsx`).
2. **Config/metadata catalog** — `src/config/gamePacks.js`.
   - `GAME_PACKS` map (available + coming-soon) with UI metadata (`id, family, name, accent, icon, status, creatorRoute, detailComponent, entitlementSlug`).
   - Exposes its **own** `getGamePack(id)` (≈`:194`) returning *metadata*, not a data adapter — a name collision with `src/data/games`’s `getGamePack`.

Neither exposes "what Pint types does this pack support." The Compendium-spec notion of a pack declaring supported Pint types is **aspirational**, not implemented.

### 2.2 Pack locations — **root-path divergence (confirmed)**

Packs live under **two different parents**, split by architectural generation:

- `src/data/games/` — `dnd5e_2014/`, `dnd5e_2024/`, `pathfinder_2e/`, `index.js`
  - `dnd5e_2014/` — full adapter (`index.js`, `equipment.js`)
  - `dnd5e_2024/` — full adapter + many files (`classes.js`, `classFeatures.js`, `subclassFeatures.js`, `rules.js`, …)
  - `pathfinder_2e/` — **stub only** (`equipment.js`; no `index.js`/full adapter here)
- `src/game-packs/` — `dnd5e/`, `pf2e/`, `vtm/`
  - `pf2e/` — the **real** PF2e pack: `index.js` (`PACK_META`, `pf2eGamePack`, lazy creator/sheet), `data/` (35+ json: `ancestries.json`, `classes.json`, `backgrounds.json`, `class-details.json`, …), `rules/`, `content/`, `ui/CharacterCreatorFlow.jsx`
  - `dnd5e/` — a phase-1 **draft** "Combat Engine v2" pack, explicitly *not consumed* in production (see `src/game-packs/dnd5e/index.js` header comment ≈`:13-15`)
  - `vtm/` — pre-launch, same `PACK_META` shape as pf2e

**The divergence, stated plainly:** D&D editions' authored data lives under `src/data/games/`, while the production PF2e content lives under `src/game-packs/pf2e/`. A pack-aware Brewery cannot assume a single parent directory — PF2e content discovery must reach into `src/game-packs/`, D&D into `src/data/games/`. The `src/game-packs/dnd5e/` draft is a red herring (not wired up).

### 2.3 Type declaration per pack — **none; packs just export what they have**

- D&D adapters (`src/data/games/index.js`) expose method bags, no category list.
- PF2e (`src/game-packs/pf2e/index.js`) exposes `pf2eGamePack.content` getters (`ancestries`, `heritages`, `backgrounds`, `classes`, `deities`, `domains`, `languages`) and re-exports named constants from `pf2e/data/index.js` (`ANCESTRIES`, `CLASSES`, `BACKGROUNDS`, …). This is the *closest* thing to a discoverable category set, but it is PF2e-only and shaped differently from the D&D adapters.
- VTM mirrors the PF2e re-export pattern.

**Nothing a pack-aware Brewery can read today** to answer "what Pint types does pack X support?" To make `CONTENT_TYPES` (§1.1) pack-driven, each pack would need to declare a `supportedPintTypes` (or equivalent) manifest. **This does not exist and would need to be added** — out of scope for this pass; documented only.

---

## Section 3 — Per-system content shape matrix (the multi-bird core)

Field names are the *actual* keys in the existing data objects.

### 3.1 Backgrounds

| Concept | **2014** (`src/components/dnd5e/backgroundData.jsx`) | **2024** (`docs/5e_reference/2024/5e-SRD-Backgrounds.json`) | **PF2e** (`src/game-packs/pf2e/data/backgrounds.json`) |
|---|---|---|---|
| Primary id | object key (e.g. `"Acolyte"`) | `index` | `id` + `slug` |
| Display name | object key | `name` | `name` |
| Ability bonuses | **none** (race-granted in this era) | `ability_scores[]` (named abilities) | `boosts[]` (pool of options, pick 2) |
| Skills | `skills[]` (skill-name array) | `proficiencies[]` (mixed skill/tool refs) | `trainedSkills[]` (single) |
| Tools | `tools[]` | `proficiencies[]` + `proficiency_choices[]` | — |
| Languages | `languages` (**count only**) | — (dropped) | — |
| Lore skill | — | — | `loreSubskill` |
| Feat | — | `feat` (origin feat, optional `note`) | `grantedFeat` (name; details in `background-details.json`) |
| Equipment | — | `equipment_options[]` (nested choices) | — |
| Metadata | — | `url` | `rarity`, `source`, `tier`, `foundryId` |

Verified anchors: 2014 shape at `backgroundData.jsx:6-11`; 2024 fields at `docs/5e_reference/2024/5e-SRD-Backgrounds.json` (Acolyte entry, `index`/`name`/`ability_scores`/`feat`/`proficiencies`); PF2e fields at `src/game-packs/pf2e/data/backgrounds.json` (Academy Dropout entry: `id`,`slug`,`name`,`boosts`,`trainedSkills`,`loreSubskill`,`grantedFeat`,`rarity`,`source`,`tier`).

### 3.2 Subclasses

| Concept | **2014** (`src/components/dnd5e/dnd5eRules.js`) | **2024** (`docs/5e_reference/2024/5e-SRD-Subclasses.json`; `src/data/games/dnd5e_2024/subclassFeatures.js`) | **PF2e** (`src/game-packs/pf2e/data/class-details.json`) |
|---|---|---|---|
| Primary id | display-name key | `index` | nested `options[].id` |
| Display name | key | `name` | `options[].name` |
| Class binding | implicit (which constant) | `class` object (`index`/`name`/`url`) | implicit (which class entry) |
| Feature storage | scattered across constants (`SUBCLASS_COMBAT_FEATURES`, `ADDITIONAL_SUBCLASS_FEATURES`, …), per-level, **variable optional fields** (`critRange`, `options`, …) | **uniform** `features[]` of `{ name, level, description }` | **no subclass-level features** — features are class feats |
| "Subclass" framing | "Path/School/…" name | "Path/School/…" name | **per-class label**: Wizard=`Arcane School`, Rogue=`Racket`, Cleric=`Doctrine`, Barbarian=`Instinct`, Bard=`Muse`, Druid=`Order`, Champion=`Cause`; Fighter=`subclasses: null` |
| Shape uniformity | low (multi-source, variant fields) | high (single uniform array) | **non-uniform / class-by-class** (`{ label, help, options[] }` per class; some add sub-picks via `subclass-subpicks.json`) |

Verified anchors: 2014 `SUBCLASS_COMBAT_FEATURES` (e.g. `dnd5eRules.js:2061+`, "Path of the Berserker"/Frenzy; Champion `critRange`; Hunter `options`); 2024 uniform `features[]` in `docs/5e_reference/2024/5e-SRD-Subclasses.json` and adapter `src/data/games/dnd5e_2024/subclassFeatures.js`; PF2e `class-details.json` per-class `subclasses` blocks (`null` for Fighter; distinct `label` per class) plus `src/game-packs/pf2e/data/subclass-subpicks.json`.

### 3.3 Headline answer — **one parameterized form per concept across the D&D packs; PF2e needs variants**

- **Backgrounds:** 2014 and 2024 are close enough to share **one parameterized D&D form** whose visible fields toggle on edition (2024 adds ability-score-array + origin-`feat` + `equipment_options`; 2014 adds the legacy `languages` count). **PF2e diverges semantically** — ability *boost pool* (pick 2 of N), `loreSubskill`, `grantedFeat`-by-name, no equipment/languages — and is best served by a **PF2e variant**, not a toggle on the D&D form.
- **Subclasses:** 2014↔2024 differ mainly in feature *storage* (scattered-variant vs uniform `{name,level,description}` array) — bridgeable by a normalize-on-read step feeding **one D&D subclass form**. **PF2e is genuinely different:** no subclass-level features, per-class label/semantics, and a legal `null` case (Fighter) — a **PF2e variant** with class-first selection is required.

**Conclusion:** *Yes* for the two D&D editions — one Background form + one Subclass form, parameterized per pack. *No* for PF2e — its Background and Subclass authoring need their own form variants. The clean architecture is **a per-pack form resolver**: D&D packs map both new types to shared parameterized forms; PF2e maps them to dedicated forms (build later).

---

## Section 4 — `homebrew_rules` table & attach targets

### 4.1 Schema — table is **base44-managed; no CREATE TABLE in repo**

- `homebrew_rules` is registered only as an entity wrapper: `src/api/entities.js:120` (`createEntity('homebrew_rules')`). A repo-wide grep of `migrations/` and `supabase/migrations/` finds **no `CREATE TABLE homebrew_rules`** (the only `homebrew` hits are unrelated, e.g. `migrations/20261103_brewery_content_pack_tag.sql:8` comment). The table and its RLS live in the base44/Supabase backend, not in versioned migrations.
- **Columns inferred from the save/read code** (`CreateHomebrewDialog.jsx:838-858`; reads in `MyBrewsList.jsx`, `BreweryDetailDialog.jsx`):
  - `id`, `creator_id`, `title`, `description`
  - `category` — **the type discriminator** (`custom_item|custom_monster|custom_spell|custom_class_feature|rule_modification`; legacy `custom_ability` read on attach)
  - `modifications` — **JSONB blob** holding the type-specific payload (the `properties`/blob column)
  - `game_system` (e.g. `"dnd5e"`), `version`, `content_rating`, `cover_image_url`, `tags`
  - `is_published`, `downloads`, `rating_total`, `rating_count`
  - `is_system` / `source` referenced on the campaign-side rows (see §4.3), not authoritatively confirmed on `homebrew_rules` itself
- Cross-reference: a prior in-repo audit exists at `docs/homebrew-form-audit.md` and agrees on the `category` + `modifications` shape.

> **Gap flag (for a scoped migration step):** because the schema is not in-repo, any new discriminator (`custom_background`, `custom_subclass`) is purely a string convention on the existing `category` column plus its `modifications` blob — **no `homebrew_rules` migration is required** to store them. The migrations land on the *campaign side* (§4.2).

### 4.2 New-type landing — **campaign tables for backgrounds & subclasses do NOT exist (gap)**

Existing campaign-side attach targets (all confirmed as registered entities in `src/api/entities.js`):
- `monsters` — `entities.js:134` (`Monster`)
- `campaign_items` — `entities.js:86` (`CampaignItem`)
- `spells` — `entities.js:142` (`Spell`)
- `campaign_class_features` — `entities.js:93` (`CampaignClassFeature`)
- `campaign_homebrew` — `entities.js:95` (`CampaignHomebrew`, the join table; indexed in `supabase/migrations/20260620120000_add_campaign_id_indexes.sql`)

**No `campaign_backgrounds` table. No `campaign_subclasses` table.** Neither appears in `src/api/entities.js`, `migrations/`, or `supabase/migrations/`.

> **Gap flag (NEW DB TABLES — own scoped step, NOT created here):**
> - A **`campaign_backgrounds`** table (campaign_id, name, description, `properties` JSONB blob, `source`, `is_system`, timestamps + campaign_id index) and matching `CampaignBackground` entity + RLS.
> - A **`campaign_subclasses`** table (same skeleton plus a `class_name`/parent-class column) and matching `CampaignSubclass` entity + RLS.
> These mirror `campaign_class_features` exactly (blob in a `properties` column + scalar columns), so the migration is mechanical once written.

### 4.3 Round-trip pattern — `homebrew_rules` row → campaign table (exact mapping)

The attach flow ("Add to Campaign") lives in `src/components/homebrew/MyBrewsList.jsx` and branches on `brew.category`:

- `custom_item` → `CampaignItem.create(...)` — `MyBrewsList.jsx:311-322`; maps `modifications.name/type/rarity/description/image_url` to columns and stores the **full blob in `properties`**, `is_system:false`.
- `custom_monster` → `Monster.create(...)` — `MyBrewsList.jsx:323-333`; **full blob → `stats`** (combat reads `monster.stats.actions`), plus name/description/image_url, `is_system:false`, `is_active:true`.
- `custom_spell` → `Spell.create(...)` — `MyBrewsList.jsx:334-362`; flattens `modifications` into spell columns (`level/school/casting_time/range/components/duration/...`), stamps `source:"homebrew"`, with legacy fallbacks (sniffs duration text for `concentration`/`ritual` on old brews).
- `custom_class_feature` **or legacy** `custom_ability` → `CampaignClassFeature.create(...)` — `MyBrewsList.jsx:363-378`; maps name/description/type/level, sets `class_name` only when `type === "Class Feature"`, stores **full blob in `properties`**, `is_system:false`; wrapped in try/catch with a "table unavailable" toast.
- **All paths** also write the join row: `CampaignHomebrew.create({ campaign_id, homebrew_id: brew.id, enabled: true, added_by: userId })` — `MyBrewsList.jsx:390`. (Pure `rule_modification` brews create *only* this join row.)
- `BreweryDetailDialog.jsx` carries a parallel install path with download-count increment.

**Pattern to replicate for the new types:** add a `brew.category === "custom_background"` branch → `CampaignBackground.create({ campaign_id, name, description, properties: mods, is_system:false })`, and `brew.category === "custom_subclass"` → `CampaignSubclass.create({ campaign_id, name, class_name, description, properties: mods, is_system:false })`, each followed by the same `CampaignHomebrew` join write. This is the identical "scalar columns + full `modifications` blob in a `properties`/`stats` column + join row" pattern every existing type uses.

---

## Section 5 — Gap list & recommended seams (dependency-ranked)

### Phase A — Make the Brewery pack-aware (system picker for the three launch packs)

1. **Add a pack-capability source (prerequisite).** Define a per-pack declaration of authorable Pint types + their vocab lists (skills, abilities, sizes, CRs/ranks, alignments, schools, damage types, etc.). Nothing readable exists today (§2.3). Cheapest seam: a `supportedPintTypes` + `rules vocab` object on each pack, surfaced through a single unified accessor (reconcile the two `getGamePack` collisions in §2.1 first, or pick `src/config/gamePacks.js` as the metadata home and `src/data/games` + `src/game-packs/*` as the data home).
2. **Make `CONTENT_TYPES` pack-derived.** Replace the static array (`CreateHomebrewDialog.jsx:57-63`) with a lookup keyed by the selected pack.
3. **Wire the system picker.** It already exists but is single-option (`CreateHomebrewDialog.jsx:983-988`); populate from `listGamePackIds()`/`GAME_PACKS`, and stop hardcoding `useState("dnd5e")` (`:707`) / the `|| "dnd5e"` default (`:749`).
4. **Cut the 2014 assumptions (§1.2).** Source every hardcoded list and the `dnd5eRules`/`conditions` imports (`:29-35`) from the active pack's vocab, not module constants. This is the bulk of the work and the surface PF2e forces open.
5. **Pack-aware attach + visual refresh.** Brewery surfaces in §1.4 must discover content per pack and account for the §2.2 root-path divergence (`src/data/games/` vs `src/game-packs/`). Refresh stays inside the design tokens noted in §1.4.

### Phase B — Background + Subclass forms for the D&D packs (2014 first, then 2024)

6. **Register two new types** following the five-touchpoint pattern (§1.1): extend `CONTENT_TYPES`, add `BLANK_BACKGROUND`/`BLANK_SUBCLASS`, `CustomBackgroundForm`/`CustomSubclassForm`, render conditionals, and `buildBackgroundModifications`/`buildSubclassModifications` serializers writing `category: "custom_background"` / `"custom_subclass"` into `modifications` (§1.3 — no `homebrew_rules` migration needed, §4.1).
7. **One parameterized form per concept across 2014/2024** (§3.3): edition toggles field visibility (2024 ability-array + origin-feat + equipment; 2014 legacy language count; subclass: normalize 2014's scattered features to the 2024 uniform `{name,level,description}` shape on read).
8. **Attach branches** in `MyBrewsList.jsx` (and `BreweryDetailDialog.jsx`) mirroring `custom_class_feature` (§4.3).

### Phase C — PF2e divergent forms (fast-follow seams, don't build now)

9. **Per-pack form resolver** (§3.3): D&D packs → shared parameterized forms; PF2e → dedicated `Pf2eBackgroundForm` (boost-pool pick-2, `loreSubskill`, `grantedFeat`) and `Pf2eSubclassForm` (class-first, per-class `label`, `null`-subclass case). Leave the resolver indirection in place during Phase B so PF2e slots in without re-touching the dialog core.

### ⚠️ Items requiring NEW DB tables / migrations (separate scoped step)

- **`campaign_backgrounds`** table + `CampaignBackground` entity + RLS (§4.2).
- **`campaign_subclasses`** table (with `class_name`) + `CampaignSubclass` entity + RLS (§4.2).
- Both model on `campaign_class_features` (blob-in-`properties` + scalar columns). **No `homebrew_rules` migration is required** — new types ride the existing `category`/`modifications` columns (§4.1). RLS for `homebrew_rules` itself is base44-managed and out of repo.

---

## Appendix: Bugs observed (not fixed)

- **M7/M9 — 2014 background languages.** `src/components/dnd5e/backgroundData.jsx`:
  - Background language data is a **bare count**, with no list of *which* languages: `getBackgroundLanguages` returns `backgroundSkills[bg]?.languages || 0` (`backgroundData.jsx:33-35`), and `backgroundSkills` only stores `languages: 2` (`:6-11`).
  - `getLanguagesForCharacter` then **hardcodes placeholder languages** instead of collecting player choice — pushes `"Dwarvish"` for the first and `"Elvish"` for the second background language regardless of background/character (`backgroundData.jsx:44-49`):
    ```js
    for (let i = 0; i < bgLangCount; i++) {
      if (i === 0) languages.push("Dwarvish");
      else if (i === 1) languages.push("Elvish");
    }
    ```
  - Also: SRD comment notes only Acolyte ships in `backgroundSkills` (`:3-4`), so every other background resolves to `0` background languages anyway.
- **Two colliding `getGamePack` exports** (`src/data/games/index.js:139` returns a *data adapter*; `src/config/gamePacks.js` ≈`:194` returns *metadata*). Not a runtime bug today (different import paths) but a foot-gun for any pack-aware refactor. Logged, not fixed.
- **`pathfinder_2e` is half-present under `src/data/games/`** — only `equipment.js`, no `index.js`/adapter, while the real pack lives at `src/game-packs/pf2e/`. Any code calling `getGamePack('pathfinder_2e')` for non-equipment data will not find a full adapter. Logged, not fixed.
- **`campaign_class_features` may not exist in all environments** — the attach path defensively try/catches and toasts "campaign_class_features table unavailable" (`src/components/homebrew/MyBrewsList.jsx:363-378`), implying the table is not guaranteed by an in-repo migration. Relevant precedent for the new background/subclass tables. Logged, not fixed.

---

## Push proof

`git log origin/claude/brewery-multisystem-audit --oneline` — appended after push:

```
$ git log origin/claude/brewery-multisystem-audit --oneline
867b0d7d docs: Brewery multi-system audit recon report
c154369f Merge pull request #162 from itsmeboky/claude/world-lore-import-subheader-color
cd32bbe6 Make imported sub-headers neon purple + strip Google's dark-grey defaults
3c0badfa Merge World Lore import readable color defaults
0bc0baf7 Apply readable color defaults on World Lore import
```

Commit `867b0d7d` (this report) is the HEAD of `origin/claude/brewery-multisystem-audit`, cut from `main` at `c154369f`.
