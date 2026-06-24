# Phase 1 — Cutover Recon (audit-only)

**Status:** Audit only. No app code changed. This report locks the Phase 1 build sequence.
**Branch:** `claude/phase1-cutover-recon` · **Base:** `main` (Phase 0 merged through chunk 2g).
**Conventions:** `@/` = `src/`. "Leaf" = `src/game-packs/dnd/5e/2014` or `.../2024`. "Old roots" = the three deletion targets: `src/components/dnd5e/*`, the old shared root `src/game-packs/dnd5e/*`, and `src/data/games/*` (content folders only).

---

## TL;DR — the decisions this recon locks

1. **The brief's "still-real logic modules" assumption is outdated.** Post-Phase-0, **all** of `dnd5eRules.js`, `spellData.jsx`, `itemData.jsx`, `raceData.jsx`, `backgroundData.jsx`, `classFeatures.jsx`, `abilityData.jsx`, `armorClass.js`, `subclassExpandedSpells.js` in `components/dnd5e/` are **7–10 line shims** that `export *` from the 2014 leaf or old shared root (self-documented headers: *"TEMPORARY shim — removed at consumer cutover (Phase 1)"*). The **genuinely real** logic modules are only six: `characterCalculations.jsx`, `deriveCharacterStats.js`, `characterMapping.jsx`, `featureDescriptions.jsx`, `subclassRecommendations.js` — plus two **dead** files (`characterMapping.ts.jsx`, `schemas.jsx`).
2. **Phase 1 = rewire is much narrower than the import surface suggests.** Most "consumers" are static shim imports that just need re-pointing. But the big play surfaces (creator shell+steps, CharacterLibrary sheet, GMPanel, CampaignPlayerPanel, CombatActionBar, MonsterStatBlock) are **structurally D&D-shaped = Reshape (Phase 2)**, not rewire. The reshape line is drawn in §2.
3. **The resolution primitive should be a synchronous `useGamePack` hook.** The registry (`getGamePackData` in `data/games/index.js`) is 100% synchronous/in-memory today, and the hot render paths (combat bar, sheet, stat block) cannot tolerate a first-render loading flash. Async (`loadGamePack`) is reserved for lazy non-D&D packs gated behind `readiness`. (§7)
4. **Readiness gating must be *added*, not rewired** — no play/creation surface reads the `readiness` flags today. (§2)

---

## Section 1 — Consumer table

### Shim-vs-real classification of `src/components/dnd5e/*` (read-verified)

| File | Lines | Verdict | Re-export target |
|---|---|---|---|
| `armorClass.js` | 13 | **SHIM** | `@/game-packs/dnd5e/rules/armorClass.js` |
| `dnd5eRules.js` | 7 | **SHIM** | leaf `dnd/5e/2014/rules/dnd5eRules.js` |
| `subclassExpandedSpells.js` | 7 | **SHIM** | leaf `dnd/5e/2014/content/subclassExpandedSpells.js` |
| `abilityData.jsx` | 9 | **SHIM** | `@/game-packs/dnd5e/data/abilityData.js` |
| `backgroundData.jsx` | 7 | **SHIM** | leaf `dnd/5e/2014/content/backgroundData.js` |
| `classFeatures.jsx` | 10 | **SHIM** | `@/game-packs/dnd5e/data/classFeatures.js` |
| `itemData.jsx` | 9 | **SHIM** | `@/game-packs/dnd5e/data/itemData.js` |
| `raceData.jsx` | 7 | **SHIM** | leaf `dnd/5e/2014/content/raceData.js` |
| `spellData.jsx` | 8 | **SHIM** | leaf `dnd/5e/2014/content/spells.js` |
| `characterCalculations.jsx` | 124 | **REAL** | — |
| `deriveCharacterStats.js` | 175 | **REAL** | — |
| `characterMapping.jsx` | 317 | **REAL** (live) | — |
| `characterMapping.ts.jsx` | 208 | **REAL but DEAD** (never resolves) | — |
| `featureDescriptions.jsx` | 203 | **REAL** | — |
| `schemas.jsx` | 163 | **REAL but DEAD** (no importers) | — |
| `subclassRecommendations.js` | 70 | **REAL** | — |

**Pack-awareness legend:** `getGamePack()` = resolved via `data/games` adapter; `gamePack-state` = reads `characterData.gamePack`; `?gamePack=` = URL param; **HARDCODED** = static dnd5e(2014) import, zero pack awareness; `2024-hardcoded` = static deep-import of `data/games/dnd5e_2024/*`.

### characterCreator

| File | Imports what | Root/shim | Pack awareness | Sync/async |
|---|---|---|---|---|
| `AbilityScoresStep.jsx:4-5` | content (`getRacialAbilityBonuses`), rules (`abilityModifier`) | dnd5e shims | HARDCODED | static |
| `ClassFeaturesStep.jsx:4,16` | content (`getClassFeaturesForLevel`), rules | dnd5e shims | HARDCODED | static |
| `ClassStep.jsx:4` | rules (`ABILITY_NAMES`) | dnd5e shim | HARDCODED (classes inline) | static |
| `EquipmentStep.jsx:4,5,73` | rules (`STARTING_EQUIPMENT`) + adapter equipment | dnd5e shim **and** data/games | **MIXED**: `getGamePack(characterData.gamePack‖"dnd5e_2014")` for equip; `STARTING_EQUIPMENT` static | adapter sync+pack-routed; shim static |
| `IdentityStep.jsx:9` | rules (`RACES`,`BACKGROUNDS`) | dnd5e shim | HARDCODED (race list inline) | static |
| `QuickCreateDialog.jsx:12,20` | content (`getLanguagesForCharacter`), char-logic | backgroundData shim, **characterCalculations REAL** | HARDCODED | static |
| `ReviewStep.jsx:3,4,11-14` | content, rules, char-logic (`calculateMaxHP`,`deriveArmorClass`) | 4 shims + **characterCalculations + deriveCharacterStats REAL** | HARDCODED | static |
| `ReviewStep2024.jsx:8-20` | rules + 2024 content | dnd5eRules shim **and** deep `dnd5e_2024/*` | 2024-hardcoded | static |
| `SkillsStep.jsx:3,4,13` | content (bg/race skills), rules | dnd5e shims | HARDCODED | static |
| `SkillsStep2024.jsx:7-9` | rules + 2024 content | dnd5eRules shim **and** `dnd5e_2024/{classes,species}` | 2024-hardcoded | static |
| `SpellsStep.jsx:21,30` | content (spellData), rules | dnd5e shims | HARDCODED; spell *list* via react-query `fetchAllSpells` | static imports; fetch async |
| `SubclassPicker.jsx:5` | content (recommendations) | **subclassRecommendations REAL** | HARDCODED | static |
| `asiSelections.js:5` | rules | dnd5eRules shim | HARDCODED | static |
| `featuresCompletion.js:6,8` | content, rules (`multiPickCount`) | dnd5e shims | HARDCODED | static |
| `levelTrim.js:12` | rules (`multiPickCount`) | dnd5eRules shim | HARDCODED | static |
| `skillsCompletion.js:5-7` | rules + content | dnd5e shims | HARDCODED | static |
| `spellsCompletion.js:34,35` | rules + content (`getSpellSlots`,`getPactSlots`) | dnd5e shims | HARDCODED | static |
| `AbilitiesStep2024.jsx:9,10` | 2024 content (backgrounds, copy) | deep `dnd5e_2024/*` | 2024-hardcoded | static |
| `ClassFeaturesStep2024.jsx:6,10,11,28` | 2024 content + rules | deep `dnd5e_2024/*` | 2024-hardcoded | static |
| `ClassStep2024.jsx:3-6,26` | adapter + 2024 deep | `getGamePack("dnd5e_2024")` **literal** + deep `dnd5e_2024/*` | hardcoded literal | adapter sync |
| `IdentityStep2024.jsx:9-11` | 2024 content (species, assets, copy) | deep `dnd5e_2024/*` | 2024-hardcoded | static |
| `SpellsStep2024.jsx:6,13,14` | 2024 content (spells, rules, classes) | deep `dnd5e_2024/*` | 2024-hardcoded | static |
| `skillsCompletion2024.js:1,2` | 2024 content (classes, species) | deep `dnd5e_2024/*` | 2024-hardcoded | static |

### pages

| File | Imports what | Root/shim | Pack awareness | Sync/async |
|---|---|---|---|---|
| `BackendAdmin.jsx:8,9` | content (items), rules (abilityData) | itemData+abilityData shims | HARDCODED | static |
| `CampaignNPCs.jsx:14,17` | char-logic (`calculateAC`…), char-mapping | **characterCalculations + characterMapping REAL** | HARDCODED | static |
| `CampaignPlayerPanel.jsx:13,14,56,1896` | content (spell/item), rules; combat shims | spellData/itemData/dnd5eRules shims | HARDCODED | mostly static; **l.1896 `await import(...)`** |
| `CharacterCreator.jsx:14,27,32,51,131` | content, char-logic, char-mapping, 2024 rules | spellData shim + **characterCalculations + characterMapping REAL** + deep `dnd5e_2024/rules` | **`?gamePack=` URL param** drives `characterData.gamePack` + 2014/2024 branch | static imports; pack-state dispatches |
| `CharacterLibrary.jsx:32,36,39,40,43` | catalog, char-logic (`classHitDice`), content, rules, featureDescriptions | **characterCalculations + featureDescriptions REAL** + spellData/dnd5eRules shims | reads `character.game_pack` for tag/catalog; dnd5e body HARDCODED | static |
| `GMPanel.jsx:19,25,26,30,31,74-126` | content, rules (`computeArmorClass`), **UI** (`MonsterStatBlock`,`EquipmentLayout`), combat | dnd5e shims **and** `game-packs/dnd5e/ui/*` | HARDCODED | static |
| `CampaignItems.jsx:20,188` | adapter content | data/games | `getGamePack(campaign?.game_pack‖"dnd5e_2014")` | sync, **pack-routed** |

### components/combat · gm · player · party · npc · worldLore · campaigns · homebrew · engine

| File | Imports what | Root/shim | Pack awareness |
|---|---|---|---|
| `combat/CombatDiceWindow.jsx:16,19` | rules via combat shims | → game-packs/dnd5e | HARDCODED |
| `combat/GroupDiceArena.jsx:10` | rules (`abilityModifier`) | dnd5eRules shim | HARDCODED |
| `combat/classResources.js:25-31` | rules (`RAGES_PER_DAY`,`kiPoints`,`CLASS_ABILITY_MECHANICS`…) | dnd5eRules shim | HARDCODED |
| `combat/CombatActionBar.jsx` | **SHIM** → `game-packs/dnd5e/ui` | — | n/a |
| `combat/actionResolver.js`, `combat/conditions.js` | **SHIMS** → game-packs/dnd5e | — | n/a |
| `gm/CombatQueue.jsx:3,4` | content (items, spells) | itemData+spellData shims | HARDCODED |
| `gm/LootManager.jsx:4`, `gm/monsterEnrichment.jsx:1` | content (items) | itemData shim | HARDCODED |
| `gm/equipmentRules.jsx` | **SHIM** → `game-packs/dnd5e/content/items` | — | n/a |
| `player/LootBox.jsx:3` | content (`itemIcons`) | itemData shim | HARDCODED (trivial) |
| `party/SpellsTab.jsx:3` | content (`spellDetails`) | spellData shim | HARDCODED |
| `npc/NpcVillainPanel.jsx:15` | rules (`DAMAGE_TYPES`) | dnd5eRules shim | HARDCODED |
| `worldLore/MonsterLibrary.jsx:8` | rules (`abilityModifier`) | dnd5eRules shim | HARDCODED |
| `campaigns/HouseRulesPanel.jsx:14` | rules (`MODIFIABLE_RULES`) | dnd5eRules shim | HARDCODED |
| `homebrew/CreateHomebrewDialog.jsx:35` | rules (`CONDITION_COLORS`) via conditions shim | → game-packs/dnd5e/data | HARDCODED |
| `engine/contentLayer.js:27-29` | rules (`getRule`,`getCampaignRules`) | **game-packs/dnd5e/data/rules** (real import) | HARDCODED facade |

### leaf packs — the cutover TARGETS that still reach back into old roots

| File | Imports what | Root | Notes |
|---|---|---|---|
| `dnd/5e/2014/index.js:10`, `2024/index.js:9` | adapter (`getGamePackData`) | data/games index | intended dependency (adapter stays) |
| `2024/content/spells.js:37` | `spell-overrides.json` | deep `dnd5e_2024/` | 2024-hardcoded JSON |
| `2014/shared/ui/EquipmentLayout.jsx:5`, `2024/.../EquipmentLayout.jsx:5` | rules (`canEquipToSlot`) | **game-packs/dnd5e/content/items** | not yet duplicated into leaf |
| `2024/shared/armorClass.js:32` | rules (`abilityModifier`,`ARMOR_TABLE`,`unarmoredDefense`) | dnd5eRules shim | see §6 carve |
| `2024/shared/ui/CombatActionBar.jsx:7,22` | content (spellData), rules | dnd5e shims | see §6 carve |
| `2024/shared/ui/MonsterStatBlock.jsx:6,20` | rules (`abilityModifier`); **`SectionCard`,`collectFightingStyles` from `@/pages/GMPanel`** | dnd5e shim + **page** | see §5 inversion + §6 carve |

### data/games (the adapter)

| File | Imports what | Root | Notes |
|---|---|---|---|
| `data/games/dnd5e_2014/index.js:44,52,59,63,68` | rules+content+char-logic | **components/dnd5e** shims + **characterCalculations REAL** | the 2014 adapter is itself still coupled to old root (a) |
| `data/games/index.js:133-139` | defines `getGamePackData`/`getGamePack` | — | resolver — **target architecture, NOT deleted** |

---

## Section 2 — Rewire vs Reshape classification

**Readiness model (grounding):** `src/game-packs/index.js:40-42,109` defines per-entry flags `{ characterCreation, campaignPlay }`. PF2e is the discriminator (`characterCreation: "ready", campaignPlay: "not_ready"`). **No play/creation surface reads these flags today** — gating must be *added*.

| Surface | Class | Evidence | Gate on |
|---|---|---|---|
| `CharacterCreator.jsx` shell | **Mixed → mostly Reshape** | Hardwires six abilities twice (`attributes`/`baseAttributes` l.175-216), embeds D&D rules in `validateStepImpl` (l.603-690), fixed 2014/2024 step allow-list dispatcher (l.874-884), PF2e short-circuited to "coming soon" (l.993-1051), "Build your D&D 5e hero" header | `characterCreation` |
| `characterCreator/*` steps (2014 + `*2024`) | **Reshape** (the dual-step pattern *is* the evidence) | No pack-agnostic step; each implemented twice, both D&D-bound — six-ability `ABILITIES`, point-buy 27, 12-class tables. 2024 steps differ only in *where data is read*, still six-ability | `characterCreation` |
| `CharacterLibrary.jsx` inline sheet | **Reshape** | Six abilities + 18-skill map inline, AC/initiative=DEX/HP/prof-bonus/CHA-spell-DC inline (l.597-987). Has a rewire seam for non-D&D (`CharacterDetailDispatcher`) but the D&D body (~900 lines) is never extracted | `characterCreation` |
| `GMPanel.jsx` (~7.5k lines) | **Reshape (heavy)** | Full D&D combat stack imports; `actionsState={action,bonus,reaction}` (l.197), per-class resources (rage/ki/sorcery), `spellSaveDC(...)`, AC. No `getGamePack` | `campaignPlay` |
| `CampaignPlayerPanel.jsx` (~3k) | **Reshape** (player mirror) | Same combat imports; `actionsState` + inspiration (l.230); `PlayerStatBlock` computes mods/saves/skills D&D-style (l.2325-2367) | `campaignPlay` |
| leaf `CombatActionBar.jsx` (~1.7k) | **Reshape (deepest D&D binding)** | Action economy `{action,bonus,reaction}` (l.143), off-hand two-weapon logic, ki/sorcery/rage/Lucky models, spell slots keyed 1-9, 12-class `classAbilities`/`classBonusActions` with level gates, AC/INIT/SPEED header | `campaignPlay` |
| leaf `MonsterStatBlock.jsx` | **Reshape** | Six-ability stat block, `abilityModifier`/`computeArmorClass`, monster helpers; plus the GMPanel circular import (§5) | `campaignPlay` |
| `components/player/*` (sidebar, LootBox, archives content) | **Rewire** | Pure chrome / icon lookup; no D&D structure | (session-gated) |
| `CampaignPanel/CampaignGMPanel/CampaignView` | **Rewire** | Lobbies/hubs; read character *metadata* only. `CLASS_ICONS` cosmetic. **Caveat:** `CampaignGMPanel.jsx:89-91` session-start heal reads/writes `hit_points` (hidden D&D schema touch) | `campaignPlay` |
| `CampaignArchives.jsx` hub | **Rewire** | Navigation `SECTIONS` array; renders no gameplay data | `campaignPlay` |

### 🚩 RESHAPE FLAG LIST — looks like rewire, secretly reshape (this is the Phase 1/2 line)

1. **`CharacterLibrary` `Dnd5eCharacterDetail` that doesn't exist yet.** The non-D&D `CharacterDetailDispatcher` fork makes it *look* pack-routed; the catalog already advertises `detailComponent: "Dnd5eCharacterDetail"` (`game-packs/index.js:62,83`) — but it's never been extracted. The ~900-line D&D sheet body is Reshape.
2. **The 2024 creator steps.** `ClassStep2024` calling `getGamePack("dnd5e_2024").getClasses()` reads like the rewire target — but the call is the **hardcoded literal** `"dnd5e_2024"`, not `character.gamePack`, and it still imports edition-pinned `dnd5e_2024/*` + `dnd5eRules` and renders six abilities. A 2024-specific impl wearing a registry call.
3. **`CombatActionBar` shim chain.** `components/combat/CombatActionBar.jsx` is a one-line re-export and the real file lives under `game-packs/.../shared/ui/` — both scream "pack-owned, swap it." But it *is* the entire D&D action/resource/spell-slot/12-class engine, and GMPanel/CampaignPlayerPanel depend on its prop contract (`actionsState`, `maxSpellSlots`, `classResources`).
4. **`CampaignGMPanel` session-start heal** (`:89-91`) — pure-management on the surface, but assumes a D&D `hit_points.{current,max}` schema.
5. **`MonsterStatBlock` ↔ `GMPanel` circular import** (§5) — relocating the stat block "into the pack" drags GMPanel internals with it.
6. **`CampaignItems.jsx`** — *does* `import { getGamePack }` (looks done) but then dot-walks D&D-shaped `properties._raw` SRD item structure.

---

## Section 3 — Deletion-blocker graph

### Root (a) `src/components/dnd5e/*`

**SHIM files** (delete once consumers re-point; no logic to move): `armorClass`, `dnd5eRules`, `subclassExpandedSpells`, `abilityData`, `backgroundData`, `classFeatures`, `itemData`, `raceData`, `spellData`.
Live consumers per shim (must re-point to leaf / shared root):
- **dnd5eRules** → ~22 creator/combat/page/panel files **+ 3 leaf copies** (`2024/shared/armorClass.js`, `2024/.../CombatActionBar.jsx`, `2024/.../MonsterStatBlock.jsx`) **+ `data/games/dnd5e_2014/index.js`**.
- **spellData** → ReviewStep, SpellsStep, spellsCompletion, CampaignPlayerPanel, CharacterLibrary, GMPanel, CombatQueue, party/SpellsTab **+ `2024/.../CombatActionBar.jsx`**.
- **itemData** → BackendAdmin, CampaignPlayerPanel, GMPanel, CombatQueue, LootManager, monsterEnrichment, player/LootBox.
- **classFeatures** → ClassFeaturesStep, ReviewStep, featuresCompletion. **raceData** → AbilityScoresStep, SkillsStep, skillsCompletion. **backgroundData** → QuickCreateDialog, ReviewStep, SkillsStep, skillsCompletion. **abilityData** → BackendAdmin. **armorClass** → GMPanel. **subclassExpandedSpells** → test only.

**REAL-logic files** (must be relocated/duplicated, not just re-pointed):
- `characterCalculations.jsx` → consumers: QuickCreateDialog, ReviewStep, CampaignNPCs, CharacterLibrary, CharacterCreator, **`data/games/dnd5e_2014/index.js`** (+ internal).
- `deriveCharacterStats.js` → ReviewStep (+ `characterMapping.jsx`).
- `characterMapping.jsx` → CharacterCreator, CampaignNPCs, ReviewStep.
- `subclassRecommendations.js` → SubclassPicker. `featureDescriptions.jsx` → CharacterLibrary, CampaignPlayerPanel.
- **DEAD → delete outright:** `characterMapping.ts.jsx` (never resolves — see §4), `schemas.jsx` (zero importers).

> **Ordered:** root (a) is blocked by all the above. Shims just need re-pointing; the **real-logic modules must first be relocated** into a leaf/shared location, and critically **the 2014 adapter (`data/games/dnd5e_2014/index.js`) itself still imports root (a)** — so the adapter must be cut over before the root can die.

### Root (b) `src/game-packs/dnd5e/*` (old shared root)

Direct live importers: `engine/contentLayer.js:27-29` (`data/rules`); `GMPanel.jsx:30-31` (`ui/MonsterStatBlock`+`ui/EquipmentLayout`); **both leaf `EquipmentLayout` copies** (`content/items` → `canEquipToSlot`); plus the shim chain that re-exports from here (`combat/CombatActionBar|actionResolver|conditions`, `gm/equipmentRules`, `components/dnd5e/{abilityData,armorClass,classFeatures,itemData}`).

> **Ordered:** root (b) is blocked by (1) `engine/contentLayer.js`, (2) GMPanel's MonsterStatBlock/EquipmentLayout imports, (3) both leaf EquipmentLayouts (need `canEquipToSlot` + `content/items` duplicated into the leaf), (4) the shim chain (blocked in turn by CombatDiceWindow, CampaignPlayerPanel, GMPanel, CreateHomebrewDialog, BackendAdmin).

### Root (c) `src/data/games/*` — **content folders only; `index.js` adapter STAYS**

- **Via adapter API** (intended path; only blocks the loose submodules): EquipmentStep, ClassStep2024, CampaignItems, leaf `2014/index.js` + `2024/index.js`.
- **Deep direct imports of `dnd5e_2024/*`** (block those submodules): the eight `*2024` creator steps/helpers + `2024/content/spells.js` (→ `spell-overrides.json`).
- **Deep `dnd5e_2014/*`:** none directly; reached only through `dnd5e_2014/index.js` (which depends on root (a)).

> **Ordered:** the `dnd5e_2024` content folders are blocked by the 2024 creator steps' deep imports — re-route through the adapter or move content into the 2024 leaf. **Keep `data/games/index.js`** (leaves depend on it).

### Cross-cutting cutover order

1. Relocate real-logic modules (`characterCalculations`, `deriveCharacterStats`, `subclassRecommendations`, `featureDescriptions`, `characterMapping`); delete dead (`characterMapping.ts.jsx`, `schemas.jsx`). This also unblocks the 2014 adapter.
2. Duplicate `canEquipToSlot`/`content/items` into the leaf; move `data/rules` helpers so `engine/contentLayer.js` drops root (b).
3. Re-route the 2024 deep imports through the adapter (or move content into the 2024 leaf); keep `index.js`.
4. Re-point all shim consumers at the leaf, then delete shims, then delete roots (a) and (b).

**Sync/async note:** nearly every consumer reaches dnd5e via top-of-file **static imports**. Routing them through a per-campaign/character pack hook means resolving at call-time. Already pack-routed/async: `EquipmentStep`, `ClassStep2024`, `CampaignItems` (sync `getGamePack`), `CampaignPlayerPanel:1896` (one `await import`). `CharacterCreator` threads pack via `?gamePack=`/state but still statically imports the spellData shim.

---

## Section 4 — Character-logic module map

**Cross-cutting:** the modules below import rules/tables from `dnd5eRules`/`backgroundData`, which are **2014-only shims** today. So every consumer is currently hard-wired to 2014 data. The 2024 leaf ships its own divergent registry (`game-packs/dnd/5e/2024/rules/rules.js`, header: *"this pack must not fall back to 2014"*). That is the decisive fact for the divergence verdicts.

| Module | Live? | Verdict | Consumers | Internal old-root deps |
|---|---|---|---|---|
| `deriveCharacterStats.js` | Live | **DIVERGES** (table-bound: `CLASS_SAVING_THROWS`, race/species proficiencies, background-grant model, unarmored-defense tables) | characterMapping.jsx, ReviewStep | `dnd5eRules`, `backgroundData` |
| `characterCalculations.jsx` | Live | **DIVERGES** — pure math (`abilityModifier`, `proficiencyBonus`, HP averaging, skill/PP) is **hoistable to shared infra**; data-bound bits (`CLASS_HIT_DICE`, `raceSpeed`/`getSpeed`) specialize per leaf | CharacterLibrary, CharacterCreator, CampaignNPCs, CreateCharacterDialog, QuickCreateDialog, ReviewStep, `data/games/dnd5e_2014/index.js` | `dnd5eRules` |
| `characterMapping.jsx` | **Live** | **DIVERGES** (orchestrates edition-bound helpers + `_brewery_*` overrides; payload adapters are invariant) | CharacterCreator, CampaignNPCs, ReviewStep | `characterCalculations`, `deriveCharacterStats`, `@/lib/breweryClassApply` |
| `characterMapping.ts.jsx` | **DEAD** | delete (Vite resolves bare path to `.jsx`; `.ts.jsx` never matched). Differs from live: AC via the broken `calculateAC(dex)` stub, no derive logic | none | — |
| `featureDescriptions.jsx` | Live | **DIVERGES in content** (2014 race/background/feature text); pure data, copy per leaf | CharacterLibrary, CampaignPlayerPanel | none |
| `schemas.jsx` | **DEAD** | drop (zero importers; invariant if ever revived) | none | — |
| `subclassRecommendations.js` | Live | **DIVERGES in content** (2014 subclass names/mechanics); `bestForSubclass` fn invariant | SubclassPicker | none |

### ⚠️ The `calculateAC` duplication (correctness bug, not just de-sharing)

Two incompatible `calculateAC` exist:
- **Canonical:** `dnd5eRules.js:815` — `calculateAC(armor, dexMod, hasShield, otherBonuses)`, full armor formula. Used by `deriveCharacterStats.deriveArmorClass` → the live `characterMapping.jsx`.
- **Divergent stub:** `characterCalculations.jsx:95` — `calculateAC(dexScore, armor=null)` that **ignores `armor`** and returns `10 + dexMod`. Consumed by the dead `characterMapping.ts.jsx` **and still-live** `CampaignNPCs.jsx:128`, `CreateCharacterDialog.jsx:121`, `QuickCreateDialog.jsx:183/215/291` — these surfaces compute AC ignoring armor. Flag for cutover: retire the stub, point these at the canonical path.

**Relocation order:** (1) leaf-pure data (`featureDescriptions`, `subclassRecommendations`); drop `schemas`. (2) `characterCalculations` (split hoist vs specialize). (3) `deriveCharacterStats`. (4) `characterMapping.jsx`. (5) delete dead `characterMapping.ts.jsx` + `schemas.jsx`.

---

## Section 5 — The GMPanel inversion (CONFIRMED)

**True circular dep:** `GMPanel.jsx:30` imports `MonsterStatBlock` (leaf); the leaf imports named exports **back up** into the page:
- `game-packs/dnd5e/ui/MonsterStatBlock.jsx:14`, `dnd/5e/2014/shared/ui/MonsterStatBlock.jsx:17`, `dnd/5e/2024/shared/ui/MonsterStatBlock.jsx:20` — all `import { SectionCard, collectFightingStyles } from '@/pages/GMPanel';` (2024 copy comments it as deferred entanglement).

**Definitions (in the page):** `SectionCard` at `GMPanel.jsx:6737`; `collectFightingStyles` at `GMPanel.jsx:41` (both `export`ed *specifically* so the leaf can import them back).

**Used outside MonsterStatBlock + GMPanel?** **No.** Exhaustive grep: neither symbol is used anywhere else. (`CampaignPlayerPanel.jsx:2309` defines its *own* local `SectionCard` — unrelated decoy. `EquipmentLayout` has **no** back-import — clean.)

**Blast radius — exactly 5 files:** move both defs into a shared module (e.g. `game-packs/dnd/5e/shared/` or a UI-infra path), add one import back into GMPanel; repoint the 3 MonsterStatBlock leaves' `@/pages/GMPanel` import. GMPanel's 12 internal `<SectionCard>` render sites + 1 `collectFightingStyles` call stay (just re-imported). This **breaks the only leaf→page back-references** and unblocks relocating the stat block into the pack.

---

## Section 6 — The 2024 carve subset (exact)

**Sources are shims** — carve from the **real 2014 leaf sources**, not `components/dnd5e/*`:
`dnd5eRules` shim → `game-packs/dnd/5e/2014/rules/dnd5eRules.js` (self-contained, no imports). `spellData` shim → `game-packs/dnd/5e/2014/content/spells.js`.

**The 4 leaf→old-root relative imports to rewrite** (the only ones under `dnd/5e/2024/**`; zero reach `game-packs/dnd5e`):

| File:line | Members |
|---|---|
| `2024/shared/armorClass.js:32` | `abilityModifier`, `ARMOR_TABLE`, `unarmoredDefense` |
| `2024/shared/ui/MonsterStatBlock.jsx:6` | `abilityModifier` |
| `2024/shared/ui/CombatActionBar.jsx:22` | `RAGES_PER_DAY`, `kiPoints`, `CLASS_ABILITY_MECHANICS` |
| `2024/shared/ui/CombatActionBar.jsx:7` | `spellIcons`, `spellDetails` |

**`dnd5eRules` closure — exactly 6 members, all leaf-pure, zero transitive deps:**

| Member | Def | Kind |
|---|---|---|
| `abilityModifier` | dnd5eRules.js:27 | pure fn |
| `ARMOR_TABLE` | :794 | const object |
| `unarmoredDefense` | :836 | pure fn |
| `RAGES_PER_DAY` | :616 | const object |
| `kiPoints` | :604 | pure fn |
| `CLASS_ABILITY_MECHANICS` | :1493 | const object (the `'RAGES_PER_DAY[level]'` strings inside are literal data, **not** live refs) |

**`spellData` closure — exactly 2 members, zero transitive deps:** `spellIcons` (spells.js:1), `spellDetails` (spells.js:514) — independent top-of-file object literals. Although `spells.js` as a whole imports `subclassExpandedSpells.js` + `dnd5eRules.js` at module level, **neither object references them** — do NOT pull those into a member-precise carve.

**Total carve payload: 8 members (6 + 2), all leaf-pure, no hidden transitive dependencies.**

---

## Section 7 — Resolution primitive shape (async tolerance)

**Registry is 100% synchronous/in-memory.** `data/games/index.js` builds `ADAPTERS` from static top-level imports; `getGamePackData` (l.133-136) is a plain object lookup with fallback — **no `await`/`import()`/`fetch`** anywhere under `src/data/games` (grep: zero matches). Adapters load data via static JSON imports (e.g. `import EQUIPMENT_RAW … with { type: "json" }`) — in-bundle at module-eval time.

**The only async path is the *new* `loadGamePack(id)`** in `game-packs/index.js:195-220` (`await entry.load()` → dynamic `import()` of the leaf body; leaf `ui` exports are React `lazy`). **No play/creation surface consumes `loadGamePack` today** — only 4 files reference `getGamePack` at all (`CampaignItems`, `EquipmentStep`, `ClassStep2024`, + a test).

**Per-surface async tolerance:**
- **HOT — need pack synchronously at first render (async would flash/regress):** `CombatActionBar` (re-renders per action toggle / HP tick / resource click / keystroke target select), `CharacterLibrary` inline sheet (recomputes AC/init/mods per render), `GMPanel` / `CampaignPlayerPanel` (real-time combat state, pack rules read in memos/handlers), `MonsterStatBlock` (inline `abilityModifier`/`computeArmorClass`).
- **Tolerant of a loading state:** creator shell mount, campaign hubs/lobbies, archives hub, player session sidebar — render once on navigation.

**Conclusion:** point the D&D editions at a **synchronous `useGamePack` hook** backed by the existing synchronous registry — the data is already in memory and the hot paths cannot tolerate a first-render loading flash. Reserve the async `loadGamePack`/provider-with-loading-states for lazy **non-D&D** packs, kept off the hot combat paths by their `readiness` gate (a `campaignPlay: not_ready` pack never reaches GMPanel/CombatActionBar in the first place). This favors **hook over provider** for Phase 1 (Scoping doc, Call #2).

---

## Contradictions with the scoping-doc assumptions (call-outs)

1. **"`components/dnd5e/*` is a mix of shims and still-real logic modules" — partially false.** Of the nine modules the brief named as "still-real," **all nine are now shims** (Phase 0 moved the real code into the 2014 leaf / old shared root). Only six modules are real logic, two of which are **dead**. Phase 1's shim-repoint work is therefore larger, but its real-code-relocation work is smaller, than the brief implies.
2. **A "rewire" surface that is secretly a reshape:** the **2024 creator steps** (esp. `ClassStep2024`) call `getGamePack("dnd5e_2024")` and look like the rewire target — but the literal pack id, six-ability tables, and edition-pinned deep imports make them a 2024-specific reshape, not a pack-generic rewire. Likewise the **`CombatActionBar` shim chain** and the un-extracted **`Dnd5eCharacterDetail`** the catalog already advertises.
3. **The 2014 adapter is itself a blocker:** `data/games/dnd5e_2014/index.js` still imports the real-logic + shim modules of root (a). The adapter (the supposed clean resolution layer) cannot be the thing that survives deletion until *its own* old-root imports are cut over.
4. **Latent correctness bug surfaced:** the divergent `characterCalculations.calculateAC` stub (ignores armor) is still live in `CampaignNPCs`, `CreateCharacterDialog`, `QuickCreateDialog` — the cutover should retire it, not faithfully duplicate it per leaf.
5. **Async assumption confirmed, not contradicted:** the registry is fully synchronous, so the hook-vs-provider question resolves cleanly toward a **synchronous hook** for D&D; an async provider is only needed for lazy non-D&D packs.
