# P1.2 — First surface cutover: selection report

**Chunk:** Phase 1 / P1.2. **Branch:** `claude/phase1-npcvillain-cutover`. **Base:** `main` (P1.1 `useGamePack` present).
**This commit:** Step-1 selection only — the reviewable judgment, on the record before the rewire.

---

## Selected surface

**`src/components/npc/NpcVillainPanel.jsx`** — the villain/NPC editor, rendered by `src/pages/CampaignNPCs.jsx:856` (its only render site; `isVillain && <NpcVillainPanel … />`).

**Read being cut over:** a single symbol — `DAMAGE_TYPES` — imported at `NpcVillainPanel.jsx:15`:
```js
import { DAMAGE_TYPES } from "@/components/dnd5e/dnd5eRules";   // shim → 2014 leaf vocab
```
`DAMAGE_TYPES` is a frozen 13-element string array (`'bludgeoning','piercing',… 'radiant'`) — D&D's damage-type vocabulary. It is used in exactly three places, all **read-only** (populating `<CompactSelect>` / `<Select>` dropdown options for a villain action's / phase action's / aura's damage type): `NpcVillainPanel.jsx:435`, `:741`, `:851`.

**How it knows its pack today:** it doesn't — **HARDCODED** D&D via a static shim import, zero pack awareness. After cutover, `packId` is sourced from **`campaign?.game_pack`**, threaded from `CampaignNPCs` (which already holds the campaign via `useQuery(['campaign', campaignId])`) into a new `gamePack` prop, and consumed with `useGamePack(gamePack)` → `pack.vocab.DAMAGE_TYPES`.

---

## Why this is the lowest-risk first cutover

Against the priority-ordered criteria:

1. **Pure rewire — not a reshape.** It is not the creator/sheet/`GMPanel`/`CampaignPlayerPanel`/`CombatActionBar`, and not one of the six §2 reshape flags. The read is a flat vocabulary list, not a structural D&D assumption (no ability-score model, no action economy, no AC/HP math). Swapping the source changes nothing about shape.
2. **Smallest possible pack-content footprint — one symbol.** Exactly one read (`DAMAGE_TYPES`), one import line removed.
3. **Read-mostly for the cut-over read.** Although the host component is an editor, the `DAMAGE_TYPES` read itself is **pure display** — it only fills dropdown option lists. Worst-case blast radius if anything were off is "a damage-type dropdown shows the wrong/zero options," which is non-destructive and immediately visible.
4. **D&D-only in practice, and behavior-identical today.** Decisively: **`campaign.game_pack` is not populated/read by any campaign surface today** (the only reader of `campaign.*game_pack` in the codebase is `CampaignItems.jsx`, a different/flagged surface). So `useGamePack(campaign?.game_pack)` receives `undefined` → the registry's `resolvePackId` fallback yields **`dnd5e_2014`** → `pack.vocab` is the same 2014 `dnd5eRules` the shim already re-exports → **`DAMAGE_TYPES` is byte-identical** to today. And PF2e (the only non-D&D pack with a creator) has `campaignPlay: "not_ready"`, so a PF2e campaign cannot reach this GM/campaign editor at all.
5. **Tie-breakers:** it reads **vocab** (`pack.vocab`), not a deep `content` getter, and the read is read-only display. Both tie-breakers favor it.

## Why the obvious "rewire-clean" surfaces were *not* chosen (the constraints that narrowed the field)

Two facts discovered during selection eliminated the surfaces that looked easier in recon §2:

- **The contract body doesn't expose the deep maps those surfaces read.** `pack.content` for the D&D leaves is the equipment/background/class **getter** surface (`getEquipment`, `getBackground`, `listClasses`, `getItem`, …); `pack.vocab` is the `dnd5eRules` namespace. The recon-flagged "rewire-clean" surfaces either read **metadata** (campaign hubs / player sidebar — nothing to route through a pack) or read **maps that aren't on the contract**: `LootBox`→`itemIcons`, `party/SpellsTab`→`spellDetails`. Routing those would require adding to a leaf's `content` — forbidden this chunk ("DO NOT alter any leaf's content/ui/vocab"). (`SpellsTab` is also rendered by the **PF2e** character sheet, so it isn't D&D-only.)
- **The two leaf vocabs are asymmetric.** 2014's `vocab` is the full `dnd5eRules` (152 exports); 2024's `vocab` is a smaller 2024-specific rules module (~50 exports) that **omits** `DAMAGE_TYPES`, `abilityModifier`, `ABILITY_NAMES`, `MODIFIABLE_RULES` (the 2024 leaf notes a shared-5e vocab is "populated in the Brewery phase"). So a **character-scoped** surface (whose `character.game_pack` can be `dnd5e_2024`) reading such a symbol would regress for 2024. A **campaign-scoped** surface is safe **today** precisely because campaign pack-routing isn't wired yet (everything resolves to 2014).

Other candidates ruled out: `worldLore/MonsterLibrary` (reads `abilityModifier` but is **dead** — no render site anywhere); `HouseRulesPanel` (reads `MODIFIABLE_RULES` at **module scope** — a hook can't replace it); `CreateHomebrewDialog` (5983 lines, **four** vocab symbols across many nested sub-forms, no campaign pack source); `CampaignItems` (a **flagged reshape**, §2 #6).

`NpcVillainPanel` is therefore the lowest-risk surface that (a) is live, (b) is pure rewire, (c) reads a symbol the contract body actually exposes, (d) is sourced from a pack signal that resolves identically today, and (e) reads a single edition-invariant constant in read-only display.

---

## The cutover plan (Step 2, next commit)

- `CampaignNPCs.jsx:856` — pass `gamePack={campaign?.game_pack}` to `<NpcVillainPanel>`. (packId sourcing at the boundary — the canonical campaign-scoped pattern.)
- `NpcVillainPanel.jsx` — accept a `gamePack` prop; call `useGamePack(gamePack)` once at the top; derive `const damageTypes = pack?.vocab?.DAMAGE_TYPES ?? []` (defensive `{pack,loading,error}` consumption — D&D never hits the async branch, but the shape is handled correctly for the packs that will); thread `damageTypes` to the three children that render the dropdowns (`VillainActionCard`, `PhaseActionEditor` via `PhaseCard`, `AuraCard`); remove the hardcoded `DAMAGE_TYPES` import.

**Behavior-identity check (pass condition):** for every campaign today `campaign?.game_pack` is unset → `useGamePack` resolves `dnd5e_2014` → `pack.vocab.DAMAGE_TYPES` is the same array the shim returns → the three dropdowns render the identical 13 options in the identical order. Verified by diffing the resolved value against the import and by the existing build/test suite.

## Readiness handling

**No new gate added — and that is correct here.** `readiness` doesn't distinguish 2014 vs 2024 (both `FULLY_READY`), and PF2e (`campaignPlay: not_ready`) already cannot reach a GM/campaign NPC editor — so there is no non-D&D pack that renders this surface to gate against. The defensive `?? []` is the only guard needed. **Forward note:** once campaigns become pack-routed (campaign rows carrying `game_pack`) AND 2024 is selectable for a campaign, the 2024 leaf vocab must gain `DAMAGE_TYPES` (the Brewery-phase shared-5e vocab convergence) before that path goes live; until then the defensive guard degrades to an empty list rather than crashing.

## Cutover pattern this establishes (for P1.3+ to copy)

1. **packId sourcing:** the parent that owns the scope object passes the id down — `campaign?.game_pack` for campaign-scoped surfaces, `character?.game_pack` for character-scoped ones.
2. **Hook consumption:** call `useGamePack(packId)` once in the surface; read content off `pack.vocab` / `pack.content`; consume `{ pack, loading, error }` defensively even when D&D is synchronous (`loading` stays false), because non-D&D packs will exercise the async branch.
3. **Readiness:** gate on `readiness.campaignPlay` / `.characterCreation` only when a non-D&D pack can actually reach the surface; never fall back to D&D — degrade safely instead.
