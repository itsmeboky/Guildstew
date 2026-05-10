# Symbol Mismatch + Visibility Recon

Recon-only diagnosis for the two outstanding world-lore cypher
bugs from alpha testing. No fix code. Findings drive the next
commit.

## Symptoms reported

- **Bug B** — Symbols GM picks for an entry visually differ from
  the same symbols shown in the rogue's cypher modal.
- **Bug C** — Rogue can't see symbols GM put on entries at all.

## Are they the same root cause?

**Mostly, with a small secondary issue.** Bug C is the dominant
problem; Bug B is partly a side effect of C and partly a separate
(smaller) color-treatment divergence. Each has its own root cause,
but they show up together because alpha testers couldn't compare
shapes against the cypher when entry symbols were hidden entirely.

## Render path inventory

### Catalogs (Q1)

All three render contexts import the catalogs from the same files:

- `src/components/worldLore/EntryForm.jsx:23-26` →
  `@/config/thievesCantSymbols` + `@/config/druidicSymbols`
- `src/components/worldLore/GatedEntryView.jsx:15-16` → same
- `src/components/worldLore/CipherModal.jsx:12-16` → same
- `src/utils/languageCipherMaps.js:2-3` (cipher-map generator) → same

No catalog drift. Same arrays, same `id` / `name` / `category`
fields, same `src` URLs for Cant. Druidic uses the inline-SVG path
(`src` field absent post-Commit 1 of the bundle).

### Render dispatch (Q2)

**Authoring (`SymbolPicker`):** uses an inline `PickerSymbol`
helper at `src/components/shared/SymbolPicker.jsx:51-58` to avoid
the documented circular import with `CipherSymbol`.

```jsx
function PickerSymbol({ cipherType, symbol, color, size }) {
  if (cipherType === "druidic") {
    return <DruidicSymbol id={symbol.id} size={size} color={color} title={symbol.name} />;
  }
  return <SymbolImage src={symbol.src} color={color} size={size} title={symbol.name} />;
}
```

**Entry view (`GatedEntryView` → `AnnotationSymbols`):**
`src/components/worldLore/GatedEntryView.jsx:454-477` calls
`<CipherSymbol cipherType={cipherType} symbol={sym} color={...} size={40} />`.

**Cypher modal (`CipherModal`):**
`src/components/worldLore/CipherModal.jsx:108-113` calls
`<CipherSymbol cipherType={cipherType} symbol={symbol} color={cfg.color} size={48} />`.

`CipherSymbol` (`src/components/shared/CipherSymbol.jsx:21-49`)
dispatches identically:

```jsx
if (cipherType === "druidic") {
  return <DruidicSymbol id={symbol.id} size={size} color={color} title={symbol.name} ... />;
}
return <SymbolImage src={symbol.src} color={color} size={size} title={symbol.name} ... />;
```

**Conclusion:** all three paths converge on the same leaf
component per cipher type (`<DruidicSymbol id=...>` for Druidic,
`<SymbolImage src=...>` for Cant). The shape output for a given
`id` / `src` is byte-identical across contexts.

### Storage shape (Q3)

`EntryForm` saves picked symbols as `[{ id, color }, ...]`
(`src/components/worldLore/EntryForm.jsx:519-524, 553-558`):

```jsx
onSelect={(sym) =>
  setCantSymbols((prev) =>
    prev.some((s) => s.id === sym.id) ? prev : [...prev, { id: sym.id, color: cantColor }],
  )
}
```

`AnnotationSymbols` looks up by `sel.id` against the catalog
(`GatedEntryView.jsx:457-462`). `CipherModal` walks the catalog
itself and reads `mapping[sym.id]` (`CipherModal.jsx:60-69`).

**Conclusion:** the `id` field is the unique key end-to-end. No
field renaming or normalization in flight. Stored ID matches the
catalog ID matches the cipher map key.

### `PickerSymbol` vs `CipherSymbol` (Q4)

Both are functionally identical for the same inputs. Only
differences:

- `CipherSymbol` defaults `size=32` and `cipherType="thieves_cant"`;
  `PickerSymbol` has no defaults and is always called with
  explicit values from `SymbolPicker`.
- `CipherSymbol` accepts a `className` prop that's threaded into
  the leaf component; `PickerSymbol` doesn't.
- `CipherSymbol` short-circuits on a falsy `symbol`;
  `PickerSymbol` doesn't (but is never called with one).

None of these affect render output for normal use. **Not a source
of the visual mismatch.**

### Visibility gate on entry view (Q5) — **ROOT CAUSE A**

**`src/components/worldLore/GatedEntryView.jsx:412-413`**:

```jsx
const knowsCant    = isGM || speaksLanguage(character, "Thieves' Cant");
const knowsDruidic = isGM || speaksLanguage(character, "Druidic");
```

**`:421` and `:435`** — the symbol grid is only rendered when the
gate passes:

```jsx
{hasCant && knowsCant && (
  <div ...>
    <AnnotationSymbols cipherType="thieves_cant" selected={cantSymbols} ... />
    {cant && <p ...>{cant}</p>}
  </div>
)}
{hasDruidic && knowsDruidic && (
  <div ...>
    <AnnotationSymbols cipherType="druidic" selected={druidicSymbols} ... />
    ...
  </div>
)}
```

`speaksLanguage` (`src/utils/languageComprehension.js:49-53`) is a
case-insensitive membership check against `character.stats.languages`
or `character.languages`:

```js
export function speaksLanguage(character, language) {
  if (!language) return true;
  const known = characterLanguages(character).map((l) => l.toLowerCase());
  return known.includes(String(language).toLowerCase());
}
```

**This is the root cause of Bug C.** A rogue whose character data
doesn't have `"Thieves' Cant"` populated in `stats.languages` (or
the legacy top-level `languages` field) sees nothing — the entire
amber annotation block is gated off. Same for Druidic.

**This contradicts the bundle's design:** symbols on entries are
supposed to be visible to ALL viewers (rogue, druid, fighter, GM);
the cypher only affects the ability to **decode** them, not the
ability to **see** them. Raw symbols are public; meanings are
private to GM + correct-class-via-cypher.

It also creates the bundle's intent failure: alpha testers expect
"the rogue sees a row of mysterious markings on the entry, then
opens the cypher to look them up." Today they see an empty entry
unless their character data happens to list Thieves' Cant as a
language.

This effect explains Bug C directly and is the **primary driver
of Bug B's perception** too — testers couldn't compare a missing
entry symbol against the cypher modal grid, so they reported "the
symbols don't match" / "the symbol on the entry doesn't appear in
the cypher mapping grid."

### Render dimension / color (Q6) — **ROOT CAUSE B (secondary)**

Sizes differ across contexts (22 / 40 / 48) but proportionally;
shapes are visually identical. **Not the issue.**

Colors are the issue. Compare:

- **Entry view:** `<CipherSymbol ... color={sel.color || defaultColor} />`
  where `defaultColor` is the entry's `meta.thieves_cant_color` /
  `meta.druidic_color` (GM's per-entry pick).
  Reference: `src/components/worldLore/GatedEntryView.jsx:430, 444`.
- **Cypher modal:** `<CipherSymbol ... color={cfg.color} />`
  where `cfg.color` is hardcoded to `CANT_DEFAULT_COLOR` /
  `DRUIDIC_DEFAULT_COLOR` from the catalog files.
  Reference: `src/components/worldLore/CipherModal.jsx:23, 31, 110`.

If the GM picks a non-default color for an entry's annotation
block (e.g., `bark` `#78350f` for Druidic, or `forest` `#166534`
in place of the default `emerald` `#10b981`), the entry symbols
render in that color while the cypher modal renders the same
shapes in the catalog default. **Same shape, different color
treatment** — which the bundle's verify step #3 explicitly calls
out as a mismatch ("same shape, same size, same color treatment").

This is the primary driver of Bug B *as stated*, distinct from
Bug C's invisibility issue.

## Affected paths (fix surface)

For Bug C / Root cause A:

- `src/components/worldLore/GatedEntryView.jsx:412-413` — drop
  `knowsCant` / `knowsDruidic` from the symbol-grid gate.
- `src/components/worldLore/GatedEntryView.jsx:421, 435` — render
  `AnnotationSymbols` unconditionally; gate only the textual
  `cant` / `druidic` *message* if we want to keep that legacy
  behavior (open question: per the bundle, the cypher item is the
  decoder; the textual message becomes redundant).

For Bug B / Root cause B:

- `src/components/worldLore/EntryForm.jsx` — color picker still
  exposed; either (a) drop the picker UI and stop persisting
  per-entry color, or (b) keep the picker but stop using its
  output at render time, or (c) drive the cypher modal off the
  most-recent entry color (campaign-level normalisation).
- `src/components/worldLore/GatedEntryView.jsx:430, 444` — switch
  from `meta.thieves_cant_color || CANT_DEFAULT_COLOR` to just
  `CANT_DEFAULT_COLOR` (and same for Druidic) so entry render and
  cypher modal land on the same color.
- `src/components/worldLore/CipherModal.jsx:23, 31` — already at
  default; nothing to change here, just confirm the entry side
  matches.

## Recommended fix (drives Commit 3)

**Bug C** — remove the language-gate on the symbol render.
Render `<AnnotationSymbols>` whenever `hasCant` /
`hasDruidic`, regardless of `knowsCant` / `knowsDruidic`. Keep
the GM-authored block frame (the amber/emerald container) so
it's clearly marked as a Cant / Druidic annotation, but every
viewer sees the symbols.

For the textual `thieves_cant_message` / `druidic_message`
fields: **keep them GM-only**. Per the bundle, decoding is the
in-fiction action via the cypher item; auto-translating the
text inline contradicts that. Rendering the message under
`isGM` only (drop the `knowsCant` branch entirely for the
textual layer) keeps the GM's legacy plain-English notes
visible to themselves while removing the auto-decode for
class-eligible players.

**Bug B** — converge the entry render on the catalog default
color. Drop `meta.thieves_cant_color` / `meta.druidic_color`
from the `defaultColor` chain at `:430` and `:444`, so the
entry uses `CANT_DEFAULT_COLOR` / `DRUIDIC_DEFAULT_COLOR`
matching what the cypher modal uses.

The picker's color UI in `EntryForm.jsx` can be left in place
for one cycle (harmless — it just stops affecting render); a
follow-up commit can remove the dead UI cleanly. Doing the
removal in Commit 3 is also fine but expands the diff.

## Risk assessment

- **No data migration.** Existing entries with
  `thieves_cant_color` / `druidic_color` keep those fields in
  metadata; we just stop reading them at render time. If a
  future commit decides to bring per-entry color back, the
  data is still there.
- **No cipher-map shape change.** The Commit-3 (bundle)
  `language_cipher_maps` JSONB stays exactly as-is. This bug is
  in render and visibility paths, not in mapping data.
- **Circular import workaround stays.** `PickerSymbol` (inline
  in `SymbolPicker.jsx`) is functionally identical to
  `CipherSymbol`'s dispatch; we don't need to converge them in
  this hotfix. Smell #2 from the bundle's cumulative report
  still applies but isn't load-bearing.
- **GM authoring flow unchanged.** GM picker, save, reload all
  keep working — we're only changing what non-GM viewers see
  on the entry side.
- **Backwards compat for visible-to-class players.** A rogue
  with `"Thieves' Cant"` in their languages list gains nothing
  from the change (they already saw symbols and message). A
  rogue without it goes from seeing nothing to seeing
  symbols. No regression.

## Out of scope

- Removing the EntryForm color picker UI (vestigial after the
  fix; one-line removal in a follow-up).
- Removing `thieves_cant_message` / `druidic_message`
  altogether (legacy auto-decode path; superseded by the cypher
  item).
- Real-time sync of GM resets to player views (smell #9 from
  the bundle).
