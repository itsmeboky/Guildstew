# Cypher Button Visibility — Root Cause Recon

Recon-only diagnosis for the missing `CipherQuickAccessBar`
button. The bar is mounted correctly in `Layout.jsx:609` for the
`CampaignWorldLore` route, but never appears for the alpha tester
playing a rogue. One of the bar's early-return paths is firing.
This doc enumerates the candidates, ranks them by likelihood, and
ships a one-render diagnostic block whose output Boky should
paste back so Commit 3 can patch the right thing.

## The early-return chain

`src/components/worldLore/CipherQuickAccessBar.jsx:54, 57`:

```jsx
const owned = ownedCipherItems(activeCharacter);
if (!campaignId || !activeCharacter || owned.length === 0) return null;

const isGM = !!campaign && campaign.game_master_id === user?.id;
if (isGM) return null;
```

Five distinct silent-fail paths to isolate:

| # | Condition | What it means |
|---|---|---|
| 1 | `!campaignId` | URL doesn't carry `?id=...` — unlikely (entries are loading) |
| 2 | `!activeCharacter` | `characters.find` returned nothing — owner-match miss |
| 3 | `owned.length === 0` (with character) | Auto-grant never wrote, OR item shape doesn't match `isCipherInventoryItem` |
| 4 | `isGM === true` | rogue user happens to match `campaign.game_master_id` (data sanity issue) |
| 5 | Bar never mounts | Layout's `CampaignWorldLore` early-return doesn't fire — different `currentPageName` |

## Code-level evidence

### Active-character lookup (`CipherQuickAccessBar.jsx:40-47`)

```jsx
const activeCharacter = useMemo(() => {
  if (!user) return null;
  return characters.find(
    (c) =>
      (c.created_by === user.email || c.user_id === user.id) &&
      c.campaign_id === campaignId,
  ) || null;
}, [characters, user, campaignId]);
```

Two fields tried for owner match: `created_by === user.email` OR
`user_id === user.id`. If the rogue's character has neither
correctly populated, this returns null and #2 fires.

### Auto-grant (`src/utils/cipherInventory.js:43-70`)

```jsx
useEffect(() => {
  if (firedRef.current) return;
  if (!character?.id) return;
  const ownerEmail = character.created_by;
  if (ownerEmail && viewer?.email && ownerEmail !== viewer.email) return;

  const missing = missingCipherItemsForCharacter(character);
  if (missing.length === 0) return;
  ...
});
```

Owner-gated by `character.created_by === viewer.email`. If
`character.created_by` is null, the gate passes (else-branch) and
the grant runs. If it's a non-matching email, the grant skips
silently — the rogue never gets the item.

### Class match (`src/config/cipherInventoryItems.js:82-108`)

```js
const CLASS_ITEMS = {
  Rogue: getCipherItem(CANT_CYPHER_ID),
  Druid: getCipherItem(DRUIDIC_FIELD_GUIDE_ID),
};

export function cipherItemsForCharacter(character) {
  ...
  if (character.class) classes.add(character.class);
  if (Array.isArray(character.multiclasses)) {
    for (const mc of character.multiclasses) if (mc?.class) classes.add(mc.class);
  }
  ...
  for (const cls of classes) {
    const item = CLASS_ITEMS[cls];   // exact-string lookup
    if (item) items.push(item);
  }
  return items;
}
```

Bundle smell #6 — exact-case string match. `"rogue"`, `"Rogue "`
(trailing space), `"Arcane Trickster"` would all miss.

### Owned filter (`src/utils/cipherInventory.js:78-81`)

```js
export function ownedCipherItems(character) {
  const inv = Array.isArray(character?.inventory) ? character.inventory : [];
  return inv.filter(isCipherInventoryItem);
}
```

`isCipherInventoryItem` matches by `id` or by `name` against the
catalog (`src/config/cipherInventoryItems.js:65-68`). If the auto-
grant wrote the item with a different `id` / `name` (unlikely; the
template is the source of truth), this would return empty.

## Hypotheses ranked by prior probability

1. **Auto-grant never ran** because either the character row's
   `created_by` doesn't match `user.email`, OR the active-character
   lookup is failing first (so the hook doesn't see a character).
   Most likely diagnostic: `character.created_by` is a username /
   UUID / different email shape, while `user.email` is the Supabase
   auth email — drift between the two systems.
2. **Class string mismatch.** `character.class` is something other
   than the exact string `"Rogue"`. Most likely lowercase, trimming
   issue, or a subclass-as-class anti-pattern.
3. **`characters` query hasn't loaded yet.** If the user lands on
   the world-lore page faster than the React Query fetch resolves,
   `characters` is empty and the bar renders early-return,
   eventually re-renders with data populated. Should self-recover —
   would only persist if the query is permanently failing.
4. **`isGM === true`.** Sanity-check; data corruption.
5. **Bar never mounts.** The world-lore early-return at
   `Layout.jsx:594` requires `currentPageName === "CampaignWorldLore"`.
   If the page name resolution is off, the bar isn't even rendered.

## Diagnostic instrumentation (this commit)

`src/components/worldLore/CipherQuickAccessBar.jsx` — added a
single `console.log("[cypher-debug]", { … })` block right BEFORE
the early-return. Logs:

- `campaignId`, `user_id`, `user_email`
- `characters_loaded` count + per-character `{id, name, class, multiclasses, created_by, user_id, campaign_id, inventory_count, inventory_names}`
- `activeCharacter_id`, `activeCharacter_class`, `activeCharacter_inventory_count`
- `owned_count` and `owned` items
- `campaign_gm` and `isGM_check`
- `early_return_path` — one of `no-campaignId | no-activeCharacter | owned-empty | isGM | RENDER`

If the log line never appears → the bar isn't mounting →
hypothesis #5 (`Layout.jsx` route gate). Action: trace
`currentPageName` resolution.

If `early_return_path === "no-activeCharacter"` → hypothesis #1 or
#3. Compare `user_email` against each character's `created_by` to
spot the drift. Action depends on which side is wrong.

If `early_return_path === "owned-empty"` with a real
`activeCharacter` → drill into:
- `activeCharacter_class` value vs the `"Rogue"` / `"Druid"`
  exact-string keys → hypothesis #2.
- `activeCharacter_inventory_count` to see if the auto-grant
  ever wrote.

If `early_return_path === "isGM"` → hypothesis #4 (data sanity).

If `early_return_path === "RENDER"` but the user still sees no
button → CSS / DOM issue, not visibility logic. Different recon
prompt.

## What Boky needs to do

1. Pull this branch, run the dev build (or whatever the alpha
   environment uses).
2. Log in as the rogue user (Chione DuCairne's owner).
3. Navigate to the campaign's world lore page.
4. Open browser devtools → Console.
5. Find lines tagged `[cypher-debug]`. Paste the contents back here.
6. Commit 3 will (a) interpret the data, (b) ship the targeted
   fix, (c) remove the diagnostic block.

## Risk assessment for the eventual fix

- **No data migration needed for class-string normalization.**
  Update `CLASS_ITEMS` to use a normalized map (lowercased keys
  with `.toLowerCase()` lookup), or expand the `Set` of accepted
  variations. Confined to `cipherInventoryItems.js`.
- **No schema change for owner-mismatch.** Either `useEnsureCipherItems`
  loosens the owner gate (e.g., compare by `user_id` if `created_by`
  is empty), OR the active-character lookup needs another field
  match.
- **Bar mount issue would touch `Layout.jsx`.** Bigger blast radius
  but well-trodden.
- **No risk to GM behaviour.** GM bypass at line 57 stays.

## Out of scope for Commit 3

- Backfilling existing campaigns / characters whose class string
  is non-canonical. The fix should make the runtime check robust;
  cleaning up old data is a separate task.
- Reworking the auto-grant trigger surface (e.g., adding a
  level-up hook). The lazy-grant-on-render pattern from Commit 4
  of the bundle covers all cases if the gating logic is right.
- Removing bundle smell #2 (`PickerSymbol` / `CipherSymbol`
  convergence). Unrelated.
