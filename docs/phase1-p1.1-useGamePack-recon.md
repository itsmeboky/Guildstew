# P1.1 Recon — the `useGamePack` resolution primitive

**Chunk:** Phase 1 / P1.1. **Branch:** `claude/phase1-useGamePack`. **Base:** `main`.
**Status of this commit:** report only — no code, no behavior change.
Answers the five deciding questions before building, and records the chosen build path with evidence.

---

## Q1 — What does the existing synchronous registry return: contract body or old adapter shape?

**Answer: the OLD data-adapter shape, NOT the contract body.**

`src/data/games/index.js` — `getGamePackData(packId)` (and its alias `export const getGamePack = getGamePackData`) returns `ADAPTERS[canonical]`, whose entries are:

```js
dnd5e_2014: { id, getEquipment, getEquipmentByCategory, getEquipmentByName, getEquipmentById }
dnd5e_2024: { id, …equipment getters…, getClasses, getClassByName, getSubclassesForClass, … , rules }
pathfinder_2e: { id, …equipment getters… }
```

This is the data-adapter surface (`getEquipment()`, `getClasses()`, …). It is **not** the GamePack contract body `{ resolveForm, vocab, content, ui }`.

The contract body lives **only** in the leaf `index.js` default exports:
- `src/game-packs/dnd/5e/2014/index.js` → `export default { resolveForm, vocab, content, ui }`
- `src/game-packs/dnd/5e/2024/index.js` → same shape (`vocab: rules`, `content`, `ui`).

**→ Build path (per the chunk's decision tree): "old shape" → add a thin synchronous leaf-body registry** that statically imports the two D&D leaf bodies and exposes their contract-body default exports, keyed by canonical id. D&D resolves through that, synchronously. The existing `data/games` adapter is **not** touched — it stays as the leaf bodies' own `content` delegate.

## Q2 — What does `loadGamePack(id)` return, and is it cacheable so a lazy pack loads once and is sync thereafter?

**Answer: it returns a Promise of `{ ...catalogEntry, ...leafBody }` and it is already memoized (loads at most once).**

`src/game-packs/index.js` → `async loadGamePack(id)`:
- Resolves the alias via `getCatalogEntry(id)`, returns `null` for unknown ids.
- Has a module-level cache: `const _bodyCache = new Map()`; on a hit it returns the cached body. *"A body is loaded at most once."*
- For a conforming D&D leaf (`typeof leaf.resolveForm === "function"`) → `pack = { ...entry, ...leaf }` (catalog metadata + contract body).
- For PF2e / coming-soon (no conforming leaf) → composes `{ ...entry, content: getGamePackData(entry.id), ...(mod||{}) }` (TEMPORARY, removed in Chunk 3).

**Cacheability:** already load-once via `_bodyCache`. Layering TanStack Query (which **is** a dep — `@tanstack/react-query@^5`, provider wired in `src/App.jsx`) on top would additionally give per-mount *synchronous* cached reads. **P1.1 decision:** the hook stays dependency-light — it leans on `loadGamePack`'s existing module-level cache and a `useReducer`/`useEffect` async branch, rather than coupling every surface (including the dominant synchronous D&D path) to QueryClient context. react-query remains available if a later chunk wants cross-mount sync caching for lazy packs; it is not needed for correctness here.

## Q3 — Static-import safety: does statically importing the D&D leaf bodies drag the heavy creators into the eager bundle?

**Answer: NO — the creators (and combat UI) are already lazy references, so static-importing a leaf body does not pull them eagerly.** (See the flag at the bottom.)

In both `dnd/5e/2014/index.js` and `dnd/5e/2024/index.js`, every heavy UI export is a dynamic import behind `React.lazy`:

```js
ui = {
  createCharacter: lazy(() => import("@/pages/CharacterCreator")),  // NOT static
  statBlock:       lazy(() => import("./shared/ui/MonsterStatBlock.jsx")),
  equipmentLayout: lazy(() => import("./shared/ui/EquipmentLayout.jsx")),
  actionBar:       lazy(() => import("./shared/ui/CombatActionBar.jsx")),
}
```

`lazy(() => import(...))` is a thunk; the `import()` is not evaluated at module load, so a static `import body from ".../index.js"` does **not** bundle the creator/combat UI into the importer's chunk.

What the static leaf-body import **does** pull eagerly (per leaf's top-level `import`s): the `src/data/games` data adapter (equipment JSON etc.), the leaf's `rules` module, and a couple of content getters (`backgrounds`, `subclassFeatures`). That is data/rules weight, not the React creators.

**Node-test reachability (decisive for the design):** the leaf `index.js` files statically `import { getGamePackData } from "@/data/games"`. The test runner is `node --test` with **no `@/` alias resolution** (confirmed: `node` import of a leaf body fails `ERR_MODULE_NOT_FOUND '@/data'`; `react`'s `lazy` and the relative `data/games/index.js` both import fine). Therefore the **sync leaf-body registry and the hook are React/Vite-only and are not node-tested** — consistent with the existing suite, which node-tests only relative, `@/`-free modules (e.g. `ClassStep2024.test.js` imports `../../../data/games/index.js`). The **testable logic is factored into a node-safe pure module** (`resolveGamePack.js`, relative `.js`, imports `getCatalogEntry` from `./index.js` which has zero static imports and is node-safe). The real sync-body wiring (registry → real leaf bodies) is verified by the build. **No leaf body is modified** (honoring "do not touch existing resolution paths").

## Q4 — Locations of the readiness model and the alias map (so the hook reads them directly)

- **Readiness model (catalog):** `src/game-packs/index.js` → `CATALOG` entries carry `readiness: { characterCreation, campaignPlay }`. Constants `FULLY_READY = {…:"ready", …:"ready"}` and `NOT_READY`. D&D 2014/2024 = `FULLY_READY`; PF2e = `{ characterCreation:"ready", campaignPlay:"not_ready" }`. Read synchronously via `getCatalogEntry(id).readiness` — available immediately, body-free.
- **Alias map:** `src/game-packs/index.js` → `const ID_ALIASES = { dnd5e: "dnd5e_2014", pf2e: "pathfinder_2e" }`, applied by `getCatalogEntry(id)`. This is the map with **both** aliases the API needs. (Note: `data/games/index.js` has a *separate* `PACK_ALIASES` with only `dnd5e` — the hook does **not** use that one; it normalizes through the catalog's `getCatalogEntry`, which covers `pf2e` too.)

`game-packs/index.js` is node-safe (no top-level static imports; its `import()`s live inside `load` thunks and `loadGamePack`, none evaluated at module load), so the pure resolver imports `getCatalogEntry` from it directly via relative `./index.js`.

## Q5 — Chosen build path (summary)

**Add a thin synchronous leaf-body registry + a node-safe pure resolver; the hook composes them.**

| File | New? | node-tested? | Role |
|---|---|---|---|
| `src/game-packs/resolveGamePack.js` | new | **yes** (relative `.js`, `@/`-free) | pure logic: `planGamePack(id, getSyncBody)` (alias + readiness + sync-body lookup), `syncState(plan)`, `asyncReducer`/`initialAsyncState` |
| `src/game-packs/syncBodies.js` | new | no (React/Vite; static-imports leaf bodies) | maps canonical id → contract body for the registered sync packs (D&D 2014/2024); `getSyncBody(id)` |
| `src/hooks/useGamePack.js` | new | no (React) | thin wrapper: `useMemo(planGamePack)` → sync return for D&D / unknown; `useReducer`+`useEffect`+`loadGamePack` for lazy packs; merges `readiness` from the plan |
| `src/game-packs/__tests__/resolveGamePack.test.js` | new | yes | the five API behaviors |

Existing `data/games` adapter, `loadGamePack`, the catalog, and both leaf bodies are **untouched**. The hook is **unconsumed** by any surface at end of P1.1.

---

## Flag (not fixed here) — creator-eager-pull → P1.3

Static-importing the D&D leaf bodies (what `syncBodies.js` does) pulls each leaf's **data + rules + content getters** eagerly, but **not** the creators or combat UI, because `ui.createCharacter` / `statBlock` / `equipmentLayout` / `actionBar` are already `lazy(() => import(...))` references. So the thing Phase 0 split out (the heavy creator) stays out of the eager bundle **as long as `ui.createCharacter` remains a lazy ref**.

**Bundle impact at P1.1: zero.** The hook is unconsumed, so `syncBodies.js` (and the leaf bodies it imports) tree-shake out of the production build entirely. The eager-pull only materializes when a surface first imports the hook (P1.2+), and even then it is data/rules weight, not the creator. **P1.3 (creator split) must preserve the laziness of `ui.createCharacter`;** if a future change makes it a static import, static-importing the leaf body would re-bloat the eager bundle with the creator. P1.1 records this; it does not optimize it.
