# Guildstew Frontend Audit Report

## Pass 1A — Components Audit

### Batch 1A-i: shadcn primitives + layout

#### /src/components/ui/

- **Severity:** High
- **File:** src/components/ui/Skeleton.jsx (and src/components/ui/skeleton.jsx)
- **Line:** 1–52 (entire file)
- **Category:** Duplicate components or near-duplicates / Inconsistent file naming
- **Issue:** Two physical files with case-only differences (`Skeleton.jsx` and `skeleton.jsx`) exist in the same folder with byte-identical contents. On case-insensitive filesystems (macOS default, Windows) these collide; in CI / Docker on Linux they are distinct files that will silently drift. Pages import from `@/components/ui/Skeleton` (capital — used by ChatPanel, CharacterLibrary, Friends, UserProfile, Campaigns, Brewery, YourProfile) while `sidebar.jsx` imports from `@/components/ui/skeleton` (lowercase). Two import paths resolve differently per OS.
- **Suggested approach:** Pick one canonical filename (lowercase `skeleton.jsx` is the shadcn convention). Delete the other and update every importer. Decide whether the custom `CardSkeleton` / `RowSkeleton` / `TableRowSkeleton` / `AvatarSkeleton` helpers belong in the same file as the shadcn primitive or live in `src/components/shared/Skeletons.jsx`.

- **Severity:** High
- **File:** src/components/ui/Skeleton.jsx
- **Line:** 13, 43
- **Category:** Hardcoded values / Brand inconsistency
- **Issue:** Hardcoded surface colors `#1a1f2e`, `#2A3441` repeated as Tailwind arbitrary values and not from the brand palette (#FF5300 / #f8a47c / #1B2535 / #04685A). Same colors hardcoded in many UI/layout files — clear sign of missing tokenization.
- **Suggested approach:** Add semantic Tailwind tokens (e.g., `surface`, `surface-2`, `border-subtle`) in `tailwind.config.js` mapped to the brand palette and replace `bg-[#1a1f2e]`/`border-[#2A3441]` everywhere.

- **Severity:** High
- **File:** src/components/ui/sidebar.jsx
- **Line:** 1–626
- **Category:** Dead code (unreferenced components/files)
- **Issue:** The 626-line shadcn sidebar primitive is not referenced anywhere outside itself. The app's actual sidebar is `src/components/layout/AppSidebar.jsx`, which does not import from `@/components/ui/sidebar`. Carrying 626 lines of unused Radix/CVA/cookie/keyboard logic adds bundle weight, two `useMobile` hooks, and confusion.
- **Suggested approach:** Delete `sidebar.jsx` (and `SIDEBAR_*` constants) once you confirm no dynamic imports exist. If a future shadcn-style sidebar is planned, keep this in a feature branch — don't ship dead code.

- **Severity:** High
- **File:** src/components/ui/DesktopOnly.jsx
- **Line:** 9–19
- **Category:** Duplicate components or near-duplicates
- **Issue:** Defines and exports `useIsMobile`, but `src/hooks/use-mobile.jsx` already provides the same hook (used by `sidebar.jsx`). Two divergent implementations of the same primitive.
- **Suggested approach:** Delete the local `useIsMobile` and import from `@/hooks/use-mobile`. Keep only the `DesktopOnly` wrapper here.

- **Severity:** High
- **File:** src/components/ui/DesktopOnly.jsx
- **Line:** 31–36
- **Category:** Hardcoded values / Brand inconsistency / Accessibility
- **Issue:** `bg-[#0f1219]` and `text-[#37F2D1]` are arbitrary; #37F2D1 (cyan/teal) is used as the de-facto accent throughout the app but is NOT in the documented brand palette (#FF5300, #f8a47c, #1B2535, #04685A). Heading hierarchy: an `h2` is rendered with no surrounding `h1`, which a fullscreen "blocker" page should have.
- **Suggested approach:** Either reconcile the brand palette (this is a system-wide decision — see Cosmetic-blocking note in Summary), or replace with Tailwind tokens. Promote heading to `h1` since this view replaces the entire app shell.

- **Severity:** High
- **File:** src/components/ui/DesktopOnly.jsx
- **Line:** 9–18
- **Category:** Performance / State management
- **Issue:** `useIsMobile` re-renders on every window resize with no debounce/throttle and no `matchMedia` listener. Every wrapped page (GMPanel, PlayerPanel) re-renders on each pixel of resize.
- **Suggested approach:** Switch to `window.matchMedia(\`(max-width: ${breakpoint - 1}px)\`).addEventListener('change', ...)` so the state only flips when the breakpoint is crossed.

- **Severity:** Medium
- **File:** src/components/ui/LazyImage.jsx
- **Line:** 18–25
- **Category:** Performance / State management smells
- **Issue:** Manually instantiates `new Image()` in `useEffect` solely to call `setLoaded(true)` — this duplicates what the rendered `<img onLoad>` already does, doubling the HTTP request in some browsers (the prefetched `Image` and the rendered `<img>` are separate cache entries until the cache layer dedupes). Also no cleanup: if `src` changes mid-load, the stale `onload` still fires `setLoaded(true)` on the new src.
- **Suggested approach:** Drop the manual `new Image()` block and rely on `<img onLoad>/<img onError>`. Or, if a preload race is intentional, capture the image in a ref and null it on cleanup to avoid stale state writes.

- **Severity:** Medium
- **File:** src/components/ui/LazyImage.jsx
- **Line:** 14
- **Category:** Accessibility
- **Issue:** `alt` has no default — callers can omit it and produce `<img>` without alt. Many call sites pass `alt=""` (decorative) intentionally, but defaulting to `undefined` makes the contract loose.
- **Suggested approach:** Make `alt` a required prop or default it to `""` and add a JSDoc note that decorative images should pass `alt=""` explicitly.

- **Severity:** Medium
- **File:** src/components/ui/LazyImage.jsx
- **Line:** 51–56
- **Category:** Tailwind issues
- **Issue:** Uses string interpolation to build `object-${objectFit}` Tailwind class. Tailwind's JIT cannot statically detect dynamic class names — these classes will only ship if listed in `safelist` or appear elsewhere as literals.
- **Suggested approach:** Replace with a literal mapping object: `{ cover: "object-cover", contain: "object-contain", ... }[objectFit]`.

- **Severity:** Medium
- **File:** src/components/ui/LazyImage.jsx
- **Line:** 47, 5–14
- **Category:** Inconsistent file naming
- **Issue:** `LazyImage.jsx` uses `default export`, two-space indentation, inconsistent quote style (`'react'` vs `"@/lib/utils"`), and PascalCase filename — while `DesktopOnly.jsx` uses named export and `Skeleton.jsx` uses named exports. Naming + export conventions are inconsistent across `ui/`.
- **Suggested approach:** Establish convention (lowercase-kebab filename for shadcn primitives, named exports) and apply uniformly.

- **Severity:** High
- **File:** src/components/ui/sonner.jsx
- **Line:** 1–29
- **Category:** Dead code / Duplicate components
- **Issue:** `sonner.jsx` is unused (no imports anywhere). Meanwhile `toaster.jsx` (radix-based) IS used (in `App.jsx`). Two competing toast systems shipped: `sonner` package (with `next-themes` dependency just to run it) AND `radix-toast` via `use-toast.jsx` + `toaster.jsx` + `toast.jsx`. Pick one.
- **Suggested approach:** Delete `sonner.jsx` and the `sonner` and `next-themes` dependencies if neither is otherwise used (verify `next-themes` consumers first). Keep the radix toast system that's actually wired in.

- **Severity:** Medium
- **File:** src/components/ui/use-toast.jsx
- **Line:** 5
- **Category:** Hardcoded values / magic numbers
- **Issue:** `TOAST_REMOVE_DELAY = 1000000` (≈16 minutes) is a copy-paste from the shadcn template. Effectively keeps dismissed toasts in DOM forever — a memory leak for long sessions and an a11y issue (screen readers may re-announce).
- **Suggested approach:** Lower to a sane value (e.g., 1000ms) or extract to a config.

- **Severity:** Medium
- **File:** src/components/ui/use-toast.jsx
- **Line:** 144–155
- **Category:** State management smells
- **Issue:** Listener registration depends on `[state]` so the effect re-runs (and re-registers a NEW `setState` reference) on every state change. The `listeners.indexOf(setState)` cleanup looks for the previous reference, which may have already been replaced — leaks listeners on rapid updates. The original shadcn impl uses `[]` here.
- **Suggested approach:** Change dep array to `[]` (mount-only) so a single listener is registered per `useToast` consumer.

- **Severity:** Medium
- **File:** src/components/ui/use-toast.jsx
- **Line:** 102–111
- **Category:** Inconsistent file naming
- **Issue:** Filename is `use-toast.jsx` containing only JS (no JSX). Should be `use-toast.js`. Same critique applies to non-JSX hook-only files.
- **Suggested approach:** Rename to `.js` for consistency with other hooks in `src/hooks/`.

- **Severity:** Low
- **File:** src/components/ui/toast.jsx
- **Line:** 6–22
- **Category:** Duplicate components or near-duplicates
- **Issue:** `ToastProvider` and `ToastViewport` are byte-identical (same className, same forwardRef wrapper). `ToastProvider` should wrap `RadixToast.Provider`, not be a clone of `Viewport`. Likely a botched copy-paste during the original shadcn install — the actual radix `ToastProvider` is missing.
- **Suggested approach:** Restore the canonical shadcn `toast.jsx` template: import `* as ToastPrimitives from "@radix-ui/react-toast"`, wrap `ToastPrimitives.Provider` for Provider, and use `ToastPrimitives.Viewport` for Viewport. Without the radix Provider, the toast system is non-functional in the way it claims.

- **Severity:** High
- **File:** src/components/ui/toaster.jsx, toast.jsx
- **Line:** toaster.jsx:14–32
- **Category:** Broken or unused imports / Dead code
- **Issue:** `<Toaster>` renders `<Toast>` from `toast.jsx`, but `toast.jsx` exports `Toast` as a plain `<div>` (not `RadixToast.Root`). It accepts `open`, `onOpenChange`, etc. via `...props` and silently drops them. The system is wired but every animation/swipe data attribute is non-functional. Combined with the missing Radix Provider above, the entire radix-toast pathway is broken.
- **Suggested approach:** Either (a) restore canonical shadcn `toast.jsx` with `@radix-ui/react-toast` primitives, or (b) commit to `sonner` and remove the radix toast subsystem entirely.

- **Severity:** Medium
- **File:** src/components/ui/checkbox.jsx
- **Line:** 14
- **Category:** Brand inconsistency / Hardcoded values
- **Issue:** Hardcoded `#37F2D1` and `#050816` accent/contrast pair embedded in primitive CSS. Diverges from documented brand palette (#FF5300/#f8a47c/#1B2535/#04685A). Same pattern is repeated in `select.jsx` (lines 19, 57, 99, 103) — every focus ring and hover state is the same off-brand cyan.
- **Suggested approach:** Define `--ring`, `--accent`, `--accent-foreground` CSS variables in `tailwind.config.js` / `index.css` and reference via `ring-ring`, `data-[state=checked]:bg-accent`, etc.

- **Severity:** Medium
- **File:** src/components/ui/select.jsx
- **Line:** 19, 57, 99, 103
- **Category:** Brand inconsistency / Hardcoded values
- **Issue:** Same as above — `bg-[#0b1220]`, `bg-[#1E2430]`, `focus:ring-[#37F2D1]`, `data-[state=checked]:bg-[#37F2D1]/15`, `text-[#37F2D1]` all baked into the primitive.
- **Suggested approach:** Same — tokenize to Tailwind theme variables.

- **Severity:** Low
- **File:** src/components/ui/select.jsx
- **Line:** 95–122
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** Custom `description` prop added to `SelectItem` without a JSDoc/TS type. Existing comment is helpful but doesn't enumerate accepted types (string only? ReactNode?). Without prop-types or TS, callers can pass anything.
- **Suggested approach:** Convert this file (or the project) to TypeScript, or add JSDoc `@param` annotation and a single `@type` for `description: string | ReactNode`.

- **Severity:** Low
- **File:** src/components/ui/dialog.jsx
- **Line:** 21, 34
- **Category:** Tailwind issues
- **Issue:** Double-space inside class strings (`"... bg-black/80  data-[state=open]..."` — same pattern in `alert-dialog.jsx:18`, `sheet.jsx:20`). Cosmetic, but indicates classnames were edited by hand without prettier-tailwind.
- **Suggested approach:** Run `prettier-plugin-tailwindcss` to normalize.

- **Severity:** Medium
- **File:** src/components/ui/dialog.jsx
- **Line:** 39–43
- **Category:** Accessibility
- **Issue:** Default close button only has `<span class="sr-only">Close</span>` — no `aria-label` on the actual `<button>`. Combined with the fact that several call sites style the close button with `[&>button]:hidden` (`sidebar.jsx:164`) to hide it, screen-reader users can be left without an explicit close affordance.
- **Suggested approach:** Add `aria-label="Close"` directly to `DialogPrimitive.Close`. Audit every dialog that hides the default close to ensure it provides its own labelled control. Same fix needed in `sheet.jsx`.

- **Severity:** Medium
- **File:** src/components/ui/dialog.jsx, sheet.jsx
- **Line:** dialog.jsx whole file; sheet.jsx whole file
- **Category:** Accessibility
- **Issue:** Neither `DialogContent` nor `SheetContent` enforces a `DialogTitle`/`SheetTitle` (or `aria-labelledby`). Radix logs a console warning when the title is missing — many dialogs in the app may be untitled (quick spot check needed in pages).
- **Suggested approach:** Either require a `title` prop on the wrapper, or add a hidden `<DialogTitle className="sr-only">` fallback inside `DialogContent` so a11y always passes even if the consumer forgets.

- **Severity:** Medium
- **File:** src/components/ui/calendar.jsx
- **Line:** 8–68
- **Category:** Brand inconsistency / Tailwind issues
- **Issue:** Uses semantic tokens (`bg-primary`, `text-muted-foreground`) — good — but other primitives use hardcoded hex. The codebase is inconsistent: some primitives go through tokens, others bypass them.
- **Suggested approach:** Pick one strategy globally. If tokens are the source of truth, refactor checkbox/select/dialog/etc. to use them; if not, why does `calendar.jsx` differ?

- **Severity:** Low
- **File:** src/components/ui/form.jsx
- **Line:** 25–46
- **Category:** Dead code / logic
- **Issue:** `useFormField` does `if (!fieldContext) throw` AFTER already destructuring `fieldContext.name`. `fieldContext` defaults to `{}` from `createContext({})` so the null-check is unreachable. Original shadcn handles this differently.
- **Suggested approach:** Remove the dead null-check, or reorder (check before destructure) and default the context to `null`.

- **Severity:** Low
- **File:** src/components/ui/chart.jsx
- **Line:** 60–76
- **Category:** Performance / Security
- **Issue:** `<style dangerouslySetInnerHTML>` in a render path with values from `config` — if any `config[key].theme[theme]` or `.color` is user-controlled, this is a CSS injection vector. Today the values appear internal; flag for awareness if user-supplied palette is ever added.
- **Suggested approach:** Validate hex/rgb format before injecting; consider building the style via CSS variables on the data element instead of `<style>` tags.

- **Severity:** Low
- **File:** src/components/ui/chart.jsx
- **Line:** 1–309
- **Category:** Dead code
- **Issue:** No imports of `@/components/ui/chart` outside the file itself. Likely unused.
- **Suggested approach:** Confirm with full-project grep (including dynamic imports) and delete if truly unused — and remove `recharts` dependency if no other consumer.

- **Severity:** Medium
- **File:** src/components/ui/sidebar.jsx
- **Line:** 533–558
- **Category:** Performance / Accessibility
- **Issue:** `SidebarMenuSkeleton` randomizes the width via `Math.random()` inside `useMemo([])` — randomness in a memoized value renders differently between SSR and CSR (hydration mismatch) for any future Next.js port. Decorative loading width does not need random.
- **Suggested approach:** Replace with a deterministic value or compute width on the client only, post-mount.

- **Severity:** Cosmetic
- **File:** src/components/ui/{accordion,alert,aspect-ratio,avatar,breadcrumb,carousel,collapsible,command,context-menu,drawer,dropdown-menu,form,input-otp,menubar,navigation-menu,pagination,popover,progress,radio-group,resizable,separator,table,toggle,toggle-group}.jsx
- **Line:** entire files
- **Category:** Dead code (unreferenced components/files)
- **Issue:** None of these primitives is imported by any file outside `src/components/ui/`. Sub-imports inside the ui folder are scattered (e.g., `pagination.jsx`, `command.jsx`, `carousel.jsx` import others). Total: ~24 unused files.
- **Suggested approach:** Run `npx knip` or similar to confirm unused, then remove. The shadcn convention is to install primitives on demand, not preinstall every one.

- **Severity:** Low
- **File:** src/components/ui/sidebar.jsx
- **Line:** 64–67
- **Category:** Hardcoded values
- **Issue:** Sets `document.cookie` with a 7-day max-age constant; cookie name and TTL inlined. For a Next.js+Supabase migration, sidebar persistence will likely move to user prefs in DB.
- **Suggested approach:** When deleting this file, delete with it. Otherwise extract to shared constants module.

- **Severity:** Low
- **File:** src/components/ui/* (font fallbacks)
- **Line:** N/A — observable in `tailwind.config.js` / `index.css` not in primitives
- **Category:** Brand inconsistency
- **Issue:** No primitive declares the brand fonts ('Cream', 'Stack Sans Notch'). Defer to global theme audit, but flag here that primitives inherit whatever the body sets and there is no font-family override in any primitive.
- **Suggested approach:** Verify `tailwind.config.js` `fontFamily` includes 'Cream' and 'Stack Sans Notch' as primary, with system fallbacks. (Out of scope for this batch — call out in global theme pass.)

- **Severity:** Low
- **File:** src/components/ui/progress.jsx
- **Line:** 18
- **Category:** Inline styles that should be Tailwind/CSS
- **Issue:** Uses inline `style={{ transform: ... }}` for the indicator. Acceptable since `value` is dynamic, but worth noting that a CSS variable (`--progress: ${value}%`) plus a Tailwind utility (`-translate-x-[var(--progress)]`) would keep concerns colocated.
- **Suggested approach:** Optional refactor; not a real bug.

#### /src/components/shared/

- **Severity:** Medium
- **File:** src/components/shared/ItemTooltip.jsx
- **Line:** 10–17
- **Category:** Hardcoded values that should be constants
- **Issue:** `RARITY_COLORS` map exported from a tooltip component. Other places (cards, lists) likely re-define their own rarity color logic — there's no central D&D rarity tokens module.
- **Suggested approach:** Move `RARITY_COLORS` and `getRarityColor` to `src/utils/rarity.js` (or `src/constants/rarity.js`) so non-tooltip consumers don't import from a tooltip file.

- **Severity:** Medium
- **File:** src/components/shared/ItemTooltip.jsx
- **Line:** 64
- **Category:** Tailwind issues / Brand inconsistency
- **Issue:** `bg-[#050816]/97` uses a non-standard opacity scale; Tailwind's defaults are `/90`, `/95`, `/100`. `97` becomes a magic value the JIT will accept but design-system tools won't.
- **Suggested approach:** Snap to `/95` or define an explicit `surface-overlay` token.

- **Severity:** Medium
- **File:** src/components/shared/ItemTooltip.jsx
- **Line:** 65, 71, 88
- **Category:** Inline styles that should be Tailwind/CSS
- **Issue:** Inline `style={{ borderColor: ..., color: rarityColor }}` is unavoidable since rarityColor is dynamic — but the `${rarityColor}80` hex-alpha concatenation only works for 6-char hex; if a future rarity uses 3-char hex, it produces an invalid color.
- **Suggested approach:** Use `color-mix(in srgb, ${rarityColor} 50%, transparent)` (modern CSS) or normalize hex values upfront.

- **Severity:** Medium
- **File:** src/components/shared/ItemTooltip.jsx
- **Line:** 76
- **Category:** Hardcoded values
- **Issue:** `bg-[#111827]` (Tailwind slate-900-ish) hardcoded in a tooltip badge — same pattern as elsewhere; off-brand and not tokenized.
- **Suggested approach:** Same — tokenize.

- **Severity:** Low
- **File:** src/components/shared/ItemTooltip.jsx
- **Line:** 132
- **Category:** Accessibility
- **Issue:** Description scroll container has `overflow-y-auto` and class `custom-scrollbar` but is not focusable for keyboard scroll users when the tooltip is shown via hover — and tooltips that appear only on hover are inaccessible to keyboard-only and touch users.
- **Suggested approach:** Bind tooltip visibility to `focus-within` as well as `hover`, and use `tabIndex={0}` on the scroll container if it can overflow.

- **Severity:** Low
- **File:** src/components/shared/ItemTooltip.jsx
- **Line:** 1, 43
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** `placement` accepts `"top" | "bottom" | "left" | "right"` but no validation; passing an invalid value silently falls through to `bottom-full mb-2` (top placement). Documented behavior is unclear.
- **Suggested approach:** Convert to TS or add a runtime guard / JSDoc enum.

- **Severity:** High
- **File:** src/components/shared/MoneyCounter.jsx
- **Line:** 2
- **Category:** Dead code / Broken or unused imports
- **Issue:** Commented-out import `// import { Coins } from "lucide-react";` left in. Either re-enable or delete.
- **Suggested approach:** Delete the commented line.

- **Severity:** High
- **File:** src/components/shared/MoneyCounter.jsx
- **Line:** 17
- **Category:** State management smells / bug
- **Issue:** `parseInt(value)` without radix; `parseInt('08')` returns 8 in modern engines but historically was 0 (octal). More importantly: negative values are accepted with no clamp; `9999999999` overflows the form. Also `value === ''` short-circuits to 0, but the user might be mid-typing a `-` sign.
- **Suggested approach:** Use `Number(value)` or `parseInt(value, 10)`, clamp to `Math.max(0, Math.min(MAX, n))`, and decide policy on empty input (preserve as `''` until blur).

- **Severity:** Medium
- **File:** src/components/shared/MoneyCounter.jsx
- **Line:** 8–13
- **Category:** State management smells
- **Issue:** "Don't sync from props while editing" pattern is fragile: if `currency` changes mid-edit (e.g., GM updates wallet), local state silently diverges; on Save the user overwrites the GM's update without warning.
- **Suggested approach:** Add a "stale" indicator or merge strategy; or use a controlled component and lift state up.

- **Severity:** Medium
- **File:** src/components/shared/MoneyCounter.jsx
- **Line:** 38, 52, 60, 71
- **Category:** Hardcoded values / Brand inconsistency
- **Issue:** Same accent-color (#37F2D1, #1a1f2e, #2A3441, #1E2430, #0b1220, #111827) hardcoding pattern as ui/ primitives.
- **Suggested approach:** Tokenize.

- **Severity:** High
- **File:** src/components/shared/MoneyCounter.jsx
- **Line:** 4, 30
- **Category:** Hardcoded values that should be constants
- **Issue:** Currency keys `['gp', 'sp', 'cp', 'pp', 'ep']` and color mapping inlined twice (edit form + display row). The order differs (`['gp','sp','cp','pp','ep']` in edit vs same order in display, but colors duplicated). 5e currency definitions belong in a shared constants module.
- **Suggested approach:** Move to `src/constants/currency.js` with `{ key, label, color, exchangeRate }` and iterate.

- **Severity:** Medium
- **File:** src/components/shared/MoneyCounter.jsx
- **Line:** 70
- **Category:** Accessibility
- **Issue:** A `<div>` with `onClick` is used as the click target to enter edit mode — not keyboard accessible (no role, no tabIndex, no Enter/Space handler). Screen reader users can't activate it.
- **Suggested approach:** Replace outer div with `<button>` (or add `role="button" tabIndex={0}` plus key handler).

- **Severity:** Cosmetic
- **File:** src/components/shared/MoneyCounter.jsx
- **Line:** 31
- **Category:** Hardcoded values
- **Issue:** `1000` magic number for K-formatting; `formatAmount` is a tiny utility worth lifting.
- **Suggested approach:** Move to `src/utils/format.js` so other money displays don't reimplement.

- **Severity:** High
- **File:** src/components/shared/SketchCanvas.jsx
- **Line:** 4, 87
- **Category:** Duplicate components / Inconsistent state
- **Issue:** Imports `toast` from `"sonner"` directly. The app's toast system is `@/components/ui/use-toast` (radix). Two competing toast pipelines: this file uses `sonner`, the rest uses radix. Confirms the `sonner.jsx`/`toaster.jsx` duplication noted in ui/.
- **Suggested approach:** Standardize on one. Replace `import { toast } from "sonner"` with the project's `useToast` hook (or vice versa).

- **Severity:** High
- **File:** src/components/shared/SketchCanvas.jsx
- **Line:** 59, 86
- **Category:** console.log / .error / .warn left in
- **Issue:** `console.error("Excalidraw load failed:", err)` and `console.error("Sketch save failed:", err)`. Same pattern in `layout/CampaignActions.jsx:113`.
- **Suggested approach:** Funnel through a project logger that no-ops in production builds, or remove. At minimum, gate behind `if (import.meta.env.DEV)`.

- **Severity:** Medium
- **File:** src/components/shared/SketchCanvas.jsx
- **Line:** 80
- **Category:** Hardcoded values
- **Issue:** Bucket name `"user-assets"` hardcoded; sketch dimensions `{ width: 1200, height: 800, scale: 2 }` hardcoded.
- **Suggested approach:** Move bucket to a config (it'll change between Supabase staging/prod). Move sketch dims to constants.

- **Severity:** Medium
- **File:** src/components/shared/SketchCanvas.jsx
- **Line:** 96–122
- **Category:** Accessibility / Missing error boundaries
- **Issue:** Full-screen modal (`fixed inset-0`) does not trap focus, has no `role="dialog"`, no `aria-modal="true"`, no `aria-label`, and no Escape key handler. Background is not `inert`. Re-implements modal logic instead of using `<Dialog>` from shadcn — which would have given a focus trap and proper a11y.
- **Suggested approach:** Wrap in shadcn `<Dialog>` with a max-width override, or add focus-trap manually via `react-focus-lock` and Escape handling.

- **Severity:** Low
- **File:** src/components/shared/SketchCanvas.jsx
- **Line:** 107
- **Category:** Accessibility
- **Issue:** Cancel button uses `<X>` icon but has full text `Cancel` — fine. But the modal's primary close affordance is the Cancel button only; clicking the dimmed backdrop does nothing.
- **Suggested approach:** Add `onClick={onClose}` to the backdrop with stopPropagation guards on the inner content.

- **Severity:** Medium
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 20–42
- **Category:** Inline styles that should be Tailwind/CSS
- **Issue:** Long inline `style` block for CSS mask (cross-browser). Justified for `WebkitMaskImage` since Tailwind has no built-in mask utilities, but the static parts (`maskRepeat`, `maskPosition`, `maskSize`) should be in a CSS class — only `WebkitMaskImage`/`maskImage` and `backgroundColor`/`width`/`height` are dynamic.
- **Suggested approach:** Move static mask CSS to a global utility class `.symbol-mask`; pass dynamic props via CSS variables.

- **Severity:** Medium
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 91, 103, 153, 155, 193, 207, 240, 241, 249, 261, 277, 278
- **Category:** Hardcoded values / Brand inconsistency
- **Issue:** Same off-brand hex pattern `#050816`, `#0b1220`, `#1E2430`, `#37F2D1` repeated 12+ times.
- **Suggested approach:** Tokenize globally.

- **Severity:** Medium
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 153
- **Category:** Hardcoded values / magic value
- **Issue:** `value={color || "#d4a017"}` — duplicate fallback color from line 20's default. Two sources of truth for the default symbol color.
- **Suggested approach:** Extract to a constant `DEFAULT_SYMBOL_COLOR`.

- **Severity:** Low
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 152–157
- **Category:** Accessibility
- **Issue:** Native `<input type="color">` has no associated `<label htmlFor>`; the `title` attribute is not a substitute for screen readers.
- **Suggested approach:** Wrap with a `<Label>` or add `aria-label="Custom colour"`.

- **Severity:** Low
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 137
- **Category:** Bug / brittle equality
- **Issue:** `color?.toLowerCase() === opt.value.toLowerCase()` — fine, but if `color` is undefined and `opt.value` is uppercase, the active state is silently wrong. Also no normalization of hex shorthand vs longhand (`#fff` vs `#ffffff`).
- **Suggested approach:** Use a hex-normalizer helper.

- **Severity:** Low
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 270–284
- **Category:** Duplicate components or near-duplicates
- **Issue:** `CategoryPill` is a one-off button styled inline; `Tabs` from `@/components/ui/tabs` (currently used in 16 files) could fulfill the same role with consistent styling.
- **Suggested approach:** Use `<Tabs><TabsList><TabsTrigger>` instead.

- **Severity:** Low
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 187
- **Category:** Performance
- **Issue:** Search filter calls `s.id.toLowerCase()` on every keystroke for every symbol. With small catalogs it's fine, but if the symbol catalog grows, precompute lower-cased fields once on prop change.
- **Suggested approach:** Memoize a `searchIndex` derived from `symbols`.

- **Severity:** Cosmetic
- **File:** src/components/shared/SymbolPicker.jsx
- **Line:** 86
- **Category:** Accessibility
- **Issue:** Emoji rendered with `aria-hidden` is fine; but the `Label` text reads "{label} Symbols" — screen readers will read `label` followed by the word "Symbols". OK, but for icon-only buttons (line 108 `Remove`, 111-115) the X button has only `title="Remove"` and no `aria-label`.
- **Suggested approach:** Add `aria-label="Remove symbol"` to the remove button.

- **Severity:** Low
- **File:** src/components/shared/* (all four files)
- **Line:** N/A
- **Category:** Inconsistent file naming
- **Issue:** Three of four files use `default export` (`ItemTooltip`, `MoneyCounter`, `SymbolPicker`, `SketchCanvas`) but `SymbolPicker.jsx` also exports a named `SymbolImage`. PascalCase filenames here, kebab-case in `ui/`. Mixed conventions across folders.
- **Suggested approach:** Pick one (typical: PascalCase for components, kebab-case for primitives) and document in repo conventions.

- **Severity:** Low
- **File:** src/components/shared/* (all four files)
- **Line:** N/A
- **Category:** Missing error boundaries
- **Issue:** None of the shared components is wrapped in or contains an error boundary. `SketchCanvas` dynamically loads Excalidraw — if the chunk fails to parse mid-runtime, the toast fires but the UI is left in a half-broken state.
- **Suggested approach:** Add a top-level route-level error boundary (project-wide concern; flag here).

#### /src/components/layout/

- **Severity:** Critical
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 23, 82–91
- **Category:** Base44 leftovers
- **Issue:** `import { base44 } from "@/api/base44Client"` and `await base44.entities.Friendship.list()` — direct legacy Base44 SDK call in a sidebar that is mid-Supabase-migration. The same file already imports Supabase via `await import("@/api/supabaseClient")` (line 67) and uses it for `tavern_items` and `guilds`. Two backends in one component.
- **Suggested approach:** Migrate the friendship query to Supabase: `supabase.from('friendships').select('*').or(\`user_id.eq.${user.id},friend_id.eq.${user.id}\`)`. Same fix anywhere `base44.entities.Friendship` is used. Open a tracking ticket so this isn't forgotten.

- **Severity:** High
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 110, 112, 150, 191–195, 214, 236, 241, 303, 304, 310, 312, 315, 388–393, 396
- **Category:** Hardcoded values / Brand inconsistency
- **Issue:** Heavy use of off-brand hex (`#1E2430`, `#2a3441`, `#050816`, `#37F2D1`) and a hardcoded Discord CTA gradient `linear-gradient(135deg, #f8a47c 0%, #37F2D1 100%)`. `#f8a47c` IS in the brand palette — but it's mixed with the off-brand `#37F2D1` rather than `#FF5300` or `#04685A`. Also a manual amber gold styling block inline (388–393) for the "Join a Guild" CTA.
- **Suggested approach:** Tokenize. Move the Discord gradient to a CSS class or `bg-discord-cta` Tailwind token. Replace `#37F2D1` with the canonical brand accent (or update the brand spec).

- **Severity:** Medium
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 132–136, 190–196, 388–394
- **Category:** Inline styles that should be Tailwind/CSS
- **Issue:** Three substantial inline `style={{}}` blocks: tier badge (133–136), Discord CTA (191–196), Join a Guild CTA (388–394). Mixes Tailwind and inline styles and makes theming brittle.
- **Suggested approach:** Move static parts to Tailwind classes; keep dynamic parts (e.g., `tier.badgeColor`-derived) as CSS variables.

- **Severity:** Medium
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 117, 123
- **Category:** Accessibility
- **Issue:** User avatar `alt=""` is decorative — that's fine. But the fallback initial `displayInitial(user)` rendered as a plain `div` has no `aria-label` indicating whose initial it is. With many sidebars on screen (friend roster), screen readers get a soup of single letters.
- **Suggested approach:** Add `aria-label={\`${displayName(user)} avatar\`}` to the wrapper or hide the initial with `aria-hidden` and add a sibling `sr-only` with the username.

- **Severity:** Medium
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 110
- **Category:** Accessibility / Semantic HTML
- **Issue:** The aside has `z-50` but contains the entire user header + nav + bottom — yet `<nav>` (line 161) is inside an `<aside>`. Per ARIA, `aside` is "complementary" but this is the primary site nav. Should be `<nav>` at the top level with the inner `<nav>` re-labeled, or use a single semantic element.
- **Suggested approach:** Either change outer to `<nav aria-label="Site navigation">` (and inner becomes a plain `<div>` or `<ul>`), or keep `<aside>` but set `aria-label="Sidebar"` and ensure the actual primary nav role is unambiguous.

- **Severity:** Medium
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 53–76
- **Category:** Performance / State management
- **Issue:** Two `useQuery` calls run on every render of the sidebar (which is mounted on most pages). Stale times are 30s and 60s, but the `friendships` query (82–91) has no `staleTime` — it will refetch on every mount. Combined with the Friend roster panel doing its own queries, the sidebar is N+1 on first paint of every page.
- **Suggested approach:** Add `staleTime: 60_000` to the friendships query; consider a single `sidebarBootstrap` query that batches.

- **Severity:** Low
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 67, 361
- **Category:** Performance / bundle imports
- **Issue:** `await import("@/api/supabaseClient")` inside a queryFn forces a dynamic chunk load on first sidebar render. Every other consumer in the project imports `supabase` synchronously. This adds an unnecessary network roundtrip vs a static import.
- **Suggested approach:** Replace with `import { supabase } from "@/api/supabaseClient"` at the top of the file.

- **Severity:** Low
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 257, 290–340
- **Category:** Duplicate components
- **Issue:** `SidebarLink` here and the project's `<Link>` from react-router are conceptually duplicated by the (unused) shadcn `<SidebarMenuButton>` in `ui/sidebar.jsx`. Two sidebar systems in the codebase.
- **Suggested approach:** Pick one; delete the unused.

- **Severity:** Low
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 296–300
- **Category:** Performance
- **Issue:** Active-link computation inside `SidebarLink` runs `location.pathname.toLowerCase()` and string comparisons on every render of every link (one per nav item, on every route change). Cheap individually, but for ~15 links on every navigation it's wasteful.
- **Suggested approach:** Compute `here = location.pathname.toLowerCase()` once in the parent and pass to children, or memoize.

- **Severity:** Low
- **File:** src/components/layout/AppSidebar.jsx
- **Line:** 36–43
- **Category:** TODO / FIXME / HACK / XXX comments
- **Issue:** Multi-step roadmap embedded in JSDoc ("Structure grows in follow-up commits: 1. ... 8. Polish"). Implementation appears complete; the comment is now misleading.
- **Suggested approach:** Trim the roadmap to a single line summary or move to commit history.

- **Severity:** High
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 4, 113
- **Category:** console.log / Duplicate components
- **Issue:** `import { toast } from "sonner"` (third file using sonner) and `console.error("Join by invite code", err)` left in. Confirms the toast-system fragmentation noted in ui/.
- **Suggested approach:** Standardize toast pipeline; remove console.error.

- **Severity:** Medium
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 70
- **Category:** Performance / State management
- **Issue:** `React.useEffect(() => { if (open) setCode(""); }, [open])` — an effect to reset state on prop change. The component mounts/unmounts with the dialog already (`<Dialog open={open}>`), so `setCode("")` runs on every open. Fine, but a `key={open}` on the dialog body or moving the input state into a `useReducer` keyed by `open` would be cleaner.
- **Suggested approach:** Optional cleanup — not a bug.

- **Severity:** Medium
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 93
- **Category:** Hardcoded values
- **Issue:** `Math.min(campaign.max_players || 6, 8)` — 6 (default) and 8 (hard cap) are magic numbers. The cap should match server policy and be a single source of truth.
- **Suggested approach:** Extract to `MAX_PLAYERS_PER_CAMPAIGN = 8` and `DEFAULT_MAX_PLAYERS = 6` in `src/constants/campaigns.js`. Verify server enforces same cap.

- **Severity:** Medium
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 98–102
- **Category:** State management smells / race condition
- **Issue:** Read-modify-write on `player_ids` is non-atomic. If two players hit the same code simultaneously, both read `player_ids = []`, both write `[user1]` and `[user2]`, last write wins. Capacity check (`playerIds.length >= cap`) is also racy.
- **Suggested approach:** Move join logic into a Postgres function (RPC) that atomically appends if cap not exceeded, or use array_append + a CHECK constraint on cardinality.

- **Severity:** Medium
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 131
- **Category:** Hardcoded values
- **Issue:** `slice(0, 6)` invite-code length hardcoded both here and in the placeholder text "ABC123" (132) and dialog description "the 6-character code" (126).
- **Suggested approach:** Extract `INVITE_CODE_LENGTH = 6` constant.

- **Severity:** Medium
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 37, 45, 53, 120, 123, 133, 141
- **Category:** Hardcoded values / Brand inconsistency
- **Issue:** Same off-brand color soup as everywhere else.
- **Suggested approach:** Tokenize.

- **Severity:** Medium
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 34, 42, 50
- **Category:** Accessibility
- **Issue:** Three sidebar buttons stacked vertically — no `aria-label` and PLAY uses just "PLAY" (clear), but Join/Find don't indicate they navigate. No keyboard focus indicator override (relies on browser default).
- **Suggested approach:** Add explicit `aria-label="Start a new campaign (PLAY)"` etc., and ensure `:focus-visible` ring is preserved (currently no `focus-visible:ring-*` class on these buttons).

- **Severity:** High
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 119–148 (`<Dialog>`)
- **Category:** Accessibility / Modal focus traps
- **Issue:** Uses shadcn `<Dialog>` — focus trap and Escape are provided by Radix. But the dialog has an `<Input autoFocus>` which steals focus before the dialog's auto-focus first-element logic fires; with shorter codes, screen readers may not announce the dialog title. Minor but worth noting.
- **Suggested approach:** Remove `autoFocus` and rely on Radix Dialog's auto-focus to title; or set `aria-describedby` explicitly.

- **Severity:** Low
- **File:** src/components/layout/CampaignActions.jsx
- **Line:** 1
- **Category:** Inconsistent file naming / convention
- **Issue:** Mixes named import `{ useState }` with `React.useEffect` (line 70) — inconsistent React import style within the same file.
- **Suggested approach:** Pick one; ESLint `react/no-deprecated` + a custom rule can enforce.

- **Severity:** Medium
- **File:** src/components/layout/ColorBlindFilters.jsx
- **Line:** 20
- **Category:** Inline styles that should be Tailwind/CSS
- **Issue:** Inline `style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}` — this is the standard "hidden SVG defs" idiom but should be a Tailwind class chain (`absolute w-0 h-0 pointer-events-none`) or a named CSS class.
- **Suggested approach:** Replace with `className="absolute w-0 h-0 pointer-events-none"`.

- **Severity:** Low
- **File:** src/components/layout/ColorBlindFilters.jsx
- **Line:** 1–62
- **Category:** Accessibility / semantic HTML
- **Issue:** Filter ids (`protanopia-filter`, etc.) are global to the document — the filenames in CSS (`body.colorblind-protanopia { filter: url(#protanopia-filter) }`) need to live somewhere reachable from this component's docs. Currently a comment at the top references "App.css" — verify that file actually contains the body selectors. If it doesn't, the filters are inert.
- **Suggested approach:** Add a quick sanity check; document the contract in code or move the body class definitions adjacent to this component.

- **Severity:** Low
- **File:** src/components/layout/ColorBlindFilters.jsx
- **Line:** 18
- **Category:** Accessibility
- **Issue:** `aria-hidden` is correct but missing `focusable="false"` on the SVG; legacy IE11/Edge can tab into it. Modern browsers ignore it.
- **Suggested approach:** Add `focusable="false"`.

- **Severity:** Medium
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 54
- **Category:** Performance / State management
- **Issue:** `queryKey: ["sidebarRosterProfiles", inGuild, targetIds.sort().join(",")]` — `Array.prototype.sort` mutates `targetIds` in place. `targetIds` is derived from a `useMemo` so its reference is stable; mutating it via `.sort()` corrupts the memoized value used elsewhere on the same render.
- **Suggested approach:** Use `[...targetIds].sort().join(",")` or the spread shorthand `targetIds.toSorted().join(",")` (ES2023).

- **Severity:** Medium
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 51
- **Category:** Hardcoded values
- **Issue:** `slice(0, 5)` magic number for max sidebar roster size; appears twice on the same line.
- **Suggested approach:** `const SIDEBAR_ROSTER_MAX = 5` constant.

- **Severity:** Medium
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 124, 127, 132, 156, 160
- **Category:** Hardcoded values / Brand inconsistency
- **Issue:** Same off-brand colour pattern.
- **Suggested approach:** Tokenize.

- **Severity:** Medium
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 132
- **Category:** Inline styles that should be props/Tailwind
- **Issue:** `<StatusDot border="#1E2430" />` passes a literal hex through props — every parent that uses `StatusDot` will need to pass the right surface color. A CSS variable consumed by `StatusDot` would isolate this.
- **Suggested approach:** Have `StatusDot` accept a `tone` prop (`"sidebar"`, `"card"`) that maps to internal Tailwind classes.

- **Severity:** Medium
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 128
- **Category:** Bug / accessibility
- **Issue:** `name[0].toUpperCase()` — if `name` ends up empty (`displayName` returned `""`), `name[0]` is `undefined` and `.toUpperCase()` throws. With `fallback: "Friend"` in displayName this should be safe, but the fallback is a value config; defensive code is cheap.
- **Suggested approach:** `(name?.[0] || "?").toUpperCase()`.

- **Severity:** Medium
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 115–152
- **Category:** Accessibility
- **Issue:** RosterAvatar `<Link>` has no `aria-label`. The avatar img is `alt=""` (decorative) and the fallback initial is text inside a div — screen readers hear only "link", with no person-name. Tooltip content is rendered into a portal so it isn't part of the link's accessible name.
- **Suggested approach:** Add `aria-label={\`Profile of ${name}\`}` to the `<Link>`.

- **Severity:** Low
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 121, 144
- **Category:** Performance / bundle imports
- **Issue:** Two `<img>` elements without `loading="lazy"` and `decoding="async"`. With 5 avatars × every page mount, this adds up.
- **Suggested approach:** Add both attributes.

- **Severity:** Low
- **File:** src/components/layout/FriendsSidebarPanel.jsx
- **Line:** 81
- **Category:** Duplicate components or near-duplicates
- **Issue:** Wraps content in `<TooltipProvider>` here, while `ui/sidebar.jsx` also wraps in `<TooltipProvider>`. Multiple providers don't break anything in Radix, but the sidebar may end up with two providers in the same tree — minor wasted state.
- **Suggested approach:** Hoist `TooltipProvider` to the app root (App.jsx) and remove subtree providers.

- **Severity:** Low
- **File:** src/components/layout/* — overall
- **Line:** N/A
- **Category:** Missing error boundaries
- **Issue:** None of the layout components is wrapped in an error boundary. If `AppSidebar` throws (e.g., the `base44` SDK fails), the entire app shell renders blank.
- **Suggested approach:** Wrap `<AppSidebar>` in a route-level error boundary that degrades gracefully.

##### Batch 1A-i Summary

**Totals by severity (this batch only):**

| Severity  | Count |
|-----------|-------|
| Critical  | 1     |
| High      | 13    |
| Medium    | 49    |
| Low       | 26    |
| Cosmetic  | 3     |
| **Total** | **92** |

**Totals by category (this batch only):**

| Category | Count |
|---|---|
| Hardcoded values that should be constants | 16 |
| Brand inconsistency | 14 |
| Accessibility | 14 |
| Dead code (unreferenced components/functions/files) | 9 |
| Inline styles that should be Tailwind/CSS | 8 |
| State management smells | 7 |
| Duplicate components or near-duplicates | 7 |
| Performance | 7 |
| Tailwind issues | 5 |
| Inconsistent file naming | 5 |
| Prop validation / inconsistent prop usage | 3 |
| console.log / .error / .warn left in | 3 |
| Missing error boundaries | 3 |
| Base44 leftovers | 1 |
| Broken or unused imports | 1 |
| TODO / FIXME / HACK / XXX comments | 1 |
| Semantic HTML | 1 |
| Bug / race condition | 2 |

(Some findings cross-categorize — categories chosen by primary impact.)

**Top cross-cutting themes for follow-up batches to verify:**

1. **Brand-palette mismatch is systemic.** Documented brand is #FF5300 / #f8a47c / #1B2535 / #04685A. The de-facto in-code accent is `#37F2D1` (cyan) with surfaces `#1E2430`, `#0b1220`, `#050816`, `#1a1f2e`, `#2A3441`. Either the brand spec is stale or the codebase needs a sweeping retheme. Decision belongs at design-system level — flag for design owner before any "fix" PR.
2. **Two toast systems shipped.** `radix-toast` (toast.jsx + toaster.jsx + use-toast.jsx) is wired into App.jsx but has a botched `ToastProvider`/`Toast` implementation; meanwhile `sonner` is imported directly by `SketchCanvas.jsx` and `CampaignActions.jsx`. `sonner.jsx` wrapper is unused. Pick one and delete the other.
3. **Two `useIsMobile` hooks.** `src/hooks/use-mobile.jsx` (used by `ui/sidebar.jsx`) and `src/components/ui/DesktopOnly.jsx` (used by `_desktopGuards.jsx`). Consolidate.
4. **Two skeleton files** (`Skeleton.jsx` and `skeleton.jsx`) with identical content but different importer paths — guaranteed to bite on macOS/Windows.
5. **Massive shadcn dead code.** ~24 primitive files in `ui/` are imported by nothing. Remove or commit to using.
6. **Base44 leftovers persist** in `AppSidebar.jsx` (Friendship.list). Check whether other components still import `@/api/base44Client` (out of scope for this batch — flag for next batch).
7. **No error boundaries anywhere** in the audited folders. Project-wide missing safety net.


### Batch 1A-ii: auth & account

#### /src/components/auth/

Folder contains a single component (`AuthBackdrop.jsx`). It is referenced by `pages/Landing.jsx`, `pages/Signup.jsx`, and `pages/Onboarding.jsx` — not dead code.

- **Severity:** Medium
- **File:** src/components/auth/AuthBackdrop.jsx
- **Line:** 21
- **Category:** Hardcoded values that should be constants
- **Issue:** Supabase storage URL for the looping background video is hardcoded inline. The bucket host (`ktdxhsstrgwciqkvprph.supabase.co`) and asset path will need to change between dev/staging/prod or if the bucket is renamed; right now any move requires editing source.
- **Suggested approach:** Move to a constant in `src/config/assets.js` (or similar) keyed off `import.meta.env.VITE_SUPABASE_URL` so the asset path automatically follows whichever Supabase project the build is targeted at.

- **Severity:** Medium
- **File:** src/components/auth/AuthBackdrop.jsx
- **Line:** 13-24
- **Category:** Accessibility
- **Issue:** `<video>` element lacks `aria-hidden="true"` despite being purely decorative. Screen readers may attempt to announce the embedded media element. There is also no fallback poster image, so users with autoplay disabled or slow connections see a blank dark area.
- **Suggested approach:** Add `aria-hidden="true"` and a `poster` attribute pointing to a static fallback image, plus inner fallback text inside the `<video>` element for browsers that cannot play webm.

- **Severity:** Low
- **File:** src/components/auth/AuthBackdrop.jsx
- **Line:** 21
- **Category:** Performance
- **Issue:** Video is loaded eagerly with no `preload="metadata"` hint. On slow connections this blocks rendering of the auth form (Landing/Signup/Onboarding). Three pages all mount this component, but each navigation re-fetches the asset because it's a remote URL with no service-worker caching.
- **Suggested approach:** Add `preload="metadata"` (or `preload="auto"` if autoplay is critical) and consider lifting the `<video>` element to an app-shell-level mount so it persists across the auth flow without re-buffering.

- **Severity:** Low
- **File:** src/components/auth/AuthBackdrop.jsx
- **Line:** 25
- **Category:** Brand inconsistency
- **Issue:** Overlay is `bg-black/20`. No brand-tinted overlay; if the brand sweep adopts `#1B2535` as the dark surface, this hard black should align.
- **Suggested approach:** Replace with a brand-token tint once palette decision is made (deferred per scope context).

- **Severity:** Low
- **File:** src/components/auth/AuthBackdrop.jsx
- **Line:** 10
- **Category:** Auth-specific concerns
- **Issue:** Folder is named `auth/` but contains only a decorative backdrop. Actual auth UI lives in `pages/Landing.jsx`, `pages/Signup.jsx`, `pages/Onboarding.jsx`. The folder name implies auth forms / flows live here, which they don't. New contributors will look here for auth state, password handling, redirect-after-login logic, etc., and find nothing.
- **Suggested approach:** Either rename folder to `auth-backdrop/` (silly) or move auth form components from `pages/` into `components/auth/` and keep `pages/` thin route wrappers — preferred. At minimum add a README to set expectations.

- **Severity:** Cosmetic
- **File:** src/components/auth/AuthBackdrop.jsx
- **Line:** 12
- **Category:** Tailwind issues
- **Issue:** `pointer-events-none` is correct, but `-z-10` is an arbitrary stacking choice with no documented z-index scale. Other components likely use bare numbers, named tokens, or CSS variables — verify against project z-index strategy.
- **Suggested approach:** If a z-index scale exists in `tailwind.config.js`, use a named token; otherwise leave and accept the inconsistency.

#### /src/components/consent/

Three files: `CampaignConsentDialog.jsx` (~339 LOC, used by `CampaignPlayerPanel`), `ConsentChecklist.jsx` (used by `PlayerConsentForm`, `campaigns/create/CampaignConsent.jsx`, `pages/CampaignSettings.jsx`), `PlayerConsentForm.jsx` (used only by `pages/SettingsLegacy.jsx`).

##### CampaignConsentDialog.jsx

- **Severity:** Critical
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 11, 44, 210
- **Category:** Base44 leftovers
- **Issue:** Imports and uses `base44` (`base44.entities.UserProfile.filter(...)`, `base44.entities.Campaign.update(...)`). This is a consent gate — silently failing here will bypass the consent flow during the Supabase migration.
- **Suggested approach:** Replace `base44.entities.UserProfile.filter` with a Supabase select on `user_profiles`, and `base44.entities.Campaign.update` with a Supabase `update` on `campaigns`. Wire through the typed query layer the rest of the migration is using.

- **Severity:** High
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 200-217
- **Category:** State management smells
- **Issue:** `accept()` reads `campaign.player_consents` from the prop, mutates a local copy, and writes back. There is no optimistic concurrency check — two players accepting near-simultaneously can race and lose one another's consent record. This is a correctness bug for consent records.
- **Suggested approach:** Move the mutation server-side (RPC / Postgres function that does an atomic JSONB merge) or use a normalized `campaign_consents` row-per-player table. Don't merge JSONB client-side.

- **Severity:** High
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 196
- **Category:** Bug / race condition
- **Issue:** `const rating = campaign?.campaign_rating || campaign?.consent_rating;` — comment says "fall back to legacy". This is migration tech debt. If a campaign has both fields set to different values during the migration window, the new value silently shadows. Also `consent_rating` may be needed in `isBlockedFromCampaign()` (utils) — confirm both code paths use the same source.
- **Suggested approach:** Run a one-time backfill migrating `consent_rating` into `campaign_rating`, then drop the fallback. Until then, log when the two disagree.

- **Severity:** High
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 213
- **Category:** Form validation gaps
- **Issue:** `toast.error(err?.message || "Failed to record consent")` exposes raw server error messages to end users (potential PII / DB error leaks) and may surface "permission denied for table campaigns" style messages.
- **Suggested approach:** Map known error codes to user-friendly strings; log the raw error for diagnostics.

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 4
- **Category:** Duplicate components or near-duplicates
- **Issue:** Imports `sonner` while the rest of the app also wires `radix-toast`. Confirms the pre-flagged "two toast systems" systemic issue is present in this batch.
- **Suggested approach:** (See systemic-issues note from Batch 1A-i.)

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 108, 133, 221, 285, 308, 320, 321, 286
- **Category:** Brand inconsistency
- **Issue:** Multiple instances of off-brand hex literals: `#1E2430`, `#37F2D1`, `#0b1220`, `#1e293b`, `#050816`, `#2dd9bd`. ~9 occurrences in this file.
- **Suggested approach:** Replace with brand-token CSS vars once palette decision is finalised (deferred per scope context).

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 35-50
- **Category:** Performance
- **Issue:** `useQuery` runs every time the dialog opens with `enabled: open && !!userId`. Cache key is just `["consentProfile", userId]` — fine — but the `.catch(() => [])` swallows errors silently. A network blip leaves `profile` null, which feeds `isBlockedFromCampaign({ campaign, profile: null })` — minors might be allowed through if profile fetch fails.
- **Suggested approach:** On query error, render a loading/error state — do NOT default to "not a minor". Fail closed for a consent gate.

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 35
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** No PropTypes / TS / Zod validation. `campaign` and `userId` are critical and silently no-op (line 201 `if (!agreed || !userId || !campaign?.id) return;`) instead of failing loud.
- **Suggested approach:** Add prop validation; throw / log when `campaign?.id` missing — don't silently return.

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 107, 132, 220
- **Category:** Accessibility
- **Issue:** Three `<Dialog>` instances rely on `onOpenChange` to call `onGoBack`/`onCancel`, but none have `aria-describedby` pointing at the explanatory paragraph. Users on screen readers hear the title but the descriptive body must be discovered manually.
- **Suggested approach:** Add `aria-describedby` to `DialogContent` referencing the explanatory paragraph's id.

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 110-111, 145, 155, 235, 244, 250, 258, 263, 268, 273, 278, 281, 286, 294
- **Category:** Accessibility
- **Issue:** Heavy reliance on emoji glyphs (`🚫`, `🔴`, `🟡`, `📋`, `🛡️`, `📊`, `👥`, `💬`, `🏠`, `⚠️`, `📜`, `📝`) as semantic indicators with no `aria-label` or text equivalent. Screen readers may read or skip these inconsistently. Particularly problematic for the Stage A "Age Restriction" hard-stop where the stop sign carries semantic weight.
- **Suggested approach:** Wrap emojis in `<span aria-hidden="true">` and surface the meaning via accompanying text or an `aria-label` on the parent.

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 298-301
- **Category:** Accessibility
- **Issue:** Bare `<label>` wrapping `<Checkbox>` and a `<span>` — the Checkbox is a Radix primitive which renders as a button, not a real input. The `<label>` won't actually associate via implicit `for/id` linking, so screen readers may not pair the consent text with the checkbox. Critical for the consent acknowledgement.
- **Suggested approach:** Use `htmlFor` + `id` explicitly (`<Checkbox id="consent-ack" />` and `<Label htmlFor="consent-ack">`).

- **Severity:** Medium
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 75
- **Category:** State management smells
- **Issue:** `cancel` always navigates to `Campaigns` regardless of where the user came from. If they were deep-linking to a specific campaign or arrived from an invite, they lose context.
- **Suggested approach:** Accept `onCancel` from parent or use `navigate(-1)` as a fallback.

- **Severity:** Low
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 197-198
- **Category:** Performance
- **Issue:** `hasExpectations`/`hasResponsibilities` computed inline on every render with `.trim?.()`. Trivial cost but pattern repeats across the codebase.
- **Suggested approach:** Inline; only useMemo when expensive.

- **Severity:** Low
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 309
- **Category:** Tailwind issues
- **Issue:** `bg-[#37F2D1] hover:bg-[#2dd9bd]` — arbitrary value pairs both for default and hover. If brand tokens land, only base color will move; the hover-darker variant is hand-tuned per file.
- **Suggested approach:** Define `--brand-accent` and `--brand-accent-hover` tokens in Tailwind config.

- **Severity:** Low
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 329
- **Category:** Inconsistent file naming
- **Issue:** `needsCampaignConsent` exported from a `.jsx` file that is otherwise a component module. Pure helpers should live in `utils/consent.js`.
- **Suggested approach:** Move to `src/utils/consent.js` with the other consent helpers (`findConsentConflicts` etc. already live in `utils/contentConflicts`).

- **Severity:** Low
- **File:** src/components/consent/CampaignConsentDialog.jsx
- **Line:** 219
- **Category:** Missing error boundaries
- **Issue:** Long-running form, network call on accept, no boundary above. Crash bricks the campaign join.
- **Suggested approach:** Project-wide systemic — see Batch 1A-i.

##### ConsentChecklist.jsx

- **Severity:** High
- **File:** src/components/consent/ConsentChecklist.jsx
- **Line:** 4-24
- **Category:** Hardcoded values that should be constants
- **Issue:** `CONSENT_CATEGORIES` is a 4-section, 41-item list defined locally. It is duplicated semantically with the consent topics surfaced by `findConsentConflicts` (in `utils/contentConflicts`) and any GM-side category list. Out-of-sync lists will cause silent gaps in the conflict-detection pipeline (player flags topic X with this list; GM list omits X; `findConsentConflicts` never matches).
- **Suggested approach:** Single source of truth in `src/constants/consent.js` (or DB-driven), imported by player + GM + utility code.

- **Severity:** Medium
- **File:** src/components/consent/ConsentChecklist.jsx
- **Line:** 88-97
- **Category:** Accessibility
- **Issue:** Each checklist item is a `<button>` cycling through 4 states (unset → green → yellow → red → unset). No `aria-pressed`, no announcement of the new state, no keyboard hint. Screen-reader users have no way to know what state an item is in.
- **Suggested approach:** Use `role="radiogroup"` + 3 visible state buttons, OR a `<select>` per row, OR keep the cycle but add `aria-label={\`${item}: ${ratingText(state)}\`}` and announce state changes via `aria-live`.

- **Severity:** Medium
- **File:** src/components/consent/ConsentChecklist.jsx
- **Line:** 26
- **Category:** Form validation gaps
- **Issue:** `checklist` prop is required but defaulted to `{}` only at the call site (`PlayerConsentForm` line 37). Direct importers from `CampaignConsentDialog` / `CampaignSettings` may pass `null` and crash on `checklist[item]` access.
- **Suggested approach:** `function ConsentChecklist({ checklist = {}, onChange }) {`.

- **Severity:** Medium
- **File:** src/components/consent/ConsentChecklist.jsx
- **Line:** 47, 58, 78, 91
- **Category:** Brand inconsistency
- **Issue:** Hardcoded `#1E2430`, `#37F2D1`. Same systemic pattern.
- **Suggested approach:** (deferred — palette decision pending.)

- **Severity:** Medium
- **File:** src/components/consent/ConsentChecklist.jsx
- **Line:** 45-54
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** `getCheckboxStyle` returns either a class string OR (for the unset case) a class string with no `Check` icon — but the consumer renders `<Check>` only when `checklist[item]` is truthy. The unset-style branch returns the same shape as the rated branches but it's used only when no rating exists. Slightly confusing — the function name suggests it's responsible for icon visibility too.
- **Suggested approach:** Rename / split: `getCheckboxColors(rating)` returning class string, with an explicit `if (!rating) return DEFAULT_CLASSES`.

- **Severity:** Low
- **File:** src/components/consent/ConsentChecklist.jsx
- **Line:** 88
- **Category:** Accessibility
- **Issue:** No `type="button"` on the cycling button — inside a `<form>` (which `PlayerConsentForm` arguably is — see SettingsLegacy.jsx) this would default to type=submit and accidentally submit the parent form on Enter.
- **Suggested approach:** Add `type="button"`.

- **Severity:** Low
- **File:** src/components/consent/ConsentChecklist.jsx
- **Line:** 26
- **Category:** Performance
- **Issue:** `CONSENT_CATEGORIES` is recreated on every module load (fine), but `Object.entries(...)` runs on every render. Negligible at 41 items but consistent with other patterns flagged.
- **Suggested approach:** Hoist `Object.entries(CONSENT_CATEGORIES)` to module scope.

##### PlayerConsentForm.jsx

- **Severity:** Medium
- **File:** src/components/consent/PlayerConsentForm.jsx
- **Line:** 8-17
- **Category:** Hardcoded values that should be constants
- **Issue:** `characterConsentOptions` declared inside the component — recreated each render, and decoupled from the categories in `ConsentChecklist`. Same single-source-of-truth issue as the checklist.
- **Suggested approach:** Hoist to module scope or `src/constants/consent.js`.

- **Severity:** Medium
- **File:** src/components/consent/PlayerConsentForm.jsx
- **Line:** 1-105
- **Category:** Dead code (unreferenced components/functions/files)
- **Issue:** Only consumer is `pages/SettingsLegacy.jsx`. If `SettingsLegacy.jsx` is in fact deprecated (named "Legacy"), this entire file may be orphaned.
- **Suggested approach:** Verify `SettingsLegacy.jsx` is still routed; if not, delete `PlayerConsentForm.jsx` together with `SettingsLegacy.jsx`.

- **Severity:** Medium
- **File:** src/components/consent/PlayerConsentForm.jsx
- **Line:** 7
- **Category:** Form validation gaps
- **Issue:** `data` prop undefined-safe via `data.consent_checklist || {}` etc., but if parent passes `data={undefined}` directly, `data.character_consent` access on line 79 throws.
- **Suggested approach:** Default `data = {}`.

- **Severity:** Medium
- **File:** src/components/consent/PlayerConsentForm.jsx
- **Line:** 53, 65, 76, 100
- **Category:** Brand inconsistency
- **Issue:** Hardcoded `#1E2430` four times.
- **Suggested approach:** (deferred.)

- **Severity:** Low
- **File:** src/components/consent/PlayerConsentForm.jsx
- **Line:** 47, 57
- **Category:** Accessibility
- **Issue:** `<Label>` with no `htmlFor` paired with `<Textarea>` with no `id`. Lines & Veils inputs are not programmatically associated with their labels.
- **Suggested approach:** Add matching `id` / `htmlFor` pairs.

- **Severity:** Low
- **File:** src/components/consent/PlayerConsentForm.jsx
- **Line:** 32, 43, 71, 91
- **Category:** Semantic HTML / heading hierarchy
- **Issue:** `<h3>` then `<h4>` x3, with no surrounding `<h2>` in the form (parent SettingsLegacy may or may not). Heading hierarchy will likely jump from page-level h1/h2 to h3 then h4 inconsistently.
- **Suggested approach:** Promote/demote levels to match parent page hierarchy.

#### /src/components/legal/

##### LegalPage.jsx

- **Severity:** High
- **File:** src/components/legal/LegalPage.jsx
- **Line:** 42
- **Category:** Broken or unused imports / DOM bug
- **Issue:** `<div name="termly-embed" data-id={uuid} />` — `name` is not a valid attribute on `<div>` and React will warn about it. Termly's docs typically expect `<div className="termly-embed" ... />` or `<div data-name="termly-embed" ... />`. This may also cause Termly's hydration script to fail to find the container.
- **Suggested approach:** Verify Termly's current embed contract; replace with the documented attribute. If Termly truly expects `name=`, suppress the React warning explicitly via a custom DOM-safe attr set.

- **Severity:** Medium
- **File:** src/components/legal/LegalPage.jsx
- **Line:** 17-26
- **Category:** State management smells
- **Issue:** Cleanup removes the Termly script on unmount, but the script likely hydrated other DOM (event listeners, mutation observers) that survive removal. Also, the `existing` early-return branch returns `undefined` (so the cleanup is skipped on second mount) — meaning second mount installs no script but ALSO does not clean up — but if the user navigates Privacy → Terms, the script remains and Termly may not re-run for the new uuid.
- **Suggested approach:** Either keep the script alive globally (e.g., load once at app mount) and rely on Termly's `data-id` mutation handling, or fully unload + re-load the script per page transition.

- **Severity:** Medium
- **File:** src/components/legal/LegalPage.jsx
- **Line:** 17, 20
- **Category:** Hardcoded values that should be constants
- **Issue:** Termly script URL appears twice in the same effect — drift risk if one is updated and not the other.
- **Suggested approach:** Hoist `const TERMLY_EMBED_URL = '...'` to module scope and use both places.

- **Severity:** Medium
- **File:** src/components/legal/LegalPage.jsx
- **Line:** 24
- **Category:** Form validation gaps / silent failure
- **Issue:** `try { document.body.removeChild(script); } catch { /* ignore */ }` — silent swallow. If the script ever fails to remove, no logging.
- **Suggested approach:** Log the error in dev only.

- **Severity:** Medium
- **File:** src/components/legal/LegalPage.jsx
- **Line:** 32, 36
- **Category:** Brand inconsistency
- **Issue:** Hardcoded `#0f1219`, `#37F2D1`.
- **Suggested approach:** (deferred.)

- **Severity:** Low
- **File:** src/components/legal/LegalPage.jsx
- **Line:** 32
- **Category:** Accessibility
- **Issue:** "Back to app" link uses an icon next to text; fine — but the same link is the only navigation control on the page. Consider adding a skip link or making the heading focusable for keyboard users landing here directly.
- **Suggested approach:** Add `tabIndex={-1}` to the `<h1>` for programmatic focus on route entry.

- **Severity:** Low
- **File:** src/components/legal/LegalPage.jsx
- **Line:** 41
- **Category:** Accessibility
- **Issue:** White card hosting Termly content with no `lang` / region container; if Termly content uses different language than the rest of the app, screen readers may announce in the wrong locale.
- **Suggested approach:** Add `lang` attribute to the embed container if Termly returns a known locale.

##### LegalReconsentGate.jsx

- **Severity:** High
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 8
- **Category:** Inconsistent file naming / coupling
- **Issue:** Imports `CURRENT_TOS_VERSION` from `@/pages/Landing`. A constant that gates the entire app's reconsent flow lives inside an unrelated marketing page and is also re-imported in `pages/Signup.jsx`. Tightly couples the gate to a UI page that could be deleted.
- **Suggested approach:** Move `CURRENT_TOS_VERSION` to `src/constants/legal.js` and update all three import sites.

- **Severity:** High
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 30, 32
- **Category:** Auth-specific concerns
- **Issue:** Gate logic: `needsConsent = !!user?.id && !!profileId && storedVersion !== CURRENT_TOS_VERSION`. If `user.id` exists but `profile_id` is still loading (profile not yet fetched by AuthContext), the gate silently lets the user through (`return children`). A user with stale TOS version sees a brief flash of unrestricted app while their profile loads, defeating the gate.
- **Suggested approach:** Differentiate "loading" from "no consent needed" — render a loading skeleton until profile is known to be present-or-absent.

- **Severity:** High
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 34-47
- **Category:** Form validation gaps
- **Issue:** `accept()` does not check the supabase response for an error. If `update` fails (RLS denial, network), `setDismissed(true)` runs and the page reloads. After reload, AuthContext re-fetches profile, sees old `tos_version`, and the gate re-mounts — so the user is blocked again with no explanation. Worse: if a transient error wipes the catch path, `setSubmitting(false)` runs but UX never tells the user what happened.
- **Suggested approach:** Inspect `{ error }` returned by supabase; surface the error to the user via toast / inline message; do NOT call `setDismissed(true)` unless the update succeeded.

- **Severity:** Medium
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 43
- **Category:** Performance / state management smells
- **Issue:** `window.location.reload()` after accept — full reload throws away in-memory state, query cache, etc. Heavy hammer for a profile change.
- **Suggested approach:** Invalidate AuthContext / profile query manually.

- **Severity:** Medium
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 50
- **Category:** Tailwind issues / Inline styles
- **Issue:** `z-[10000]` arbitrary value with no documented z-index scale; same issue flagged in auth backdrop. If another modal lands above 10000, it'll cover this gate, which is a security/compliance issue (gate must be the topmost layer).
- **Suggested approach:** Define a `z-legal-gate` token at the top of the scale and use it.

- **Severity:** Medium
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 49-99
- **Category:** Accessibility
- **Issue:** Full-screen modal-ish blocker but built with a plain `<div>` — no `role="dialog"`, `aria-modal="true"`, no focus trap, no `aria-labelledby` pointing at the heading. The whole app is gated, so keyboard users can tab out of the modal back into the (frozen) underlying app — disorienting.
- **Suggested approach:** Use the existing Radix Dialog (already used in CampaignConsentDialog) or add the ARIA attributes + focus management manually.

- **Severity:** Medium
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 84-87
- **Category:** Accessibility
- **Issue:** Same `<label>`-wrapping-`<Checkbox>` issue as `CampaignConsentDialog`. Radix Checkbox is a button — implicit label association doesn't work. Critical for a consent gate that legally requires affirmative action.
- **Suggested approach:** Use `htmlFor` + `id` on Checkbox.

- **Severity:** Medium
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 50, 51, 53, 64, 71, 78, 92
- **Category:** Brand inconsistency
- **Issue:** Hardcoded `#0f1219`, `#1a1f2e`, `#37F2D1`, `#0b1220`, `#050816`, `#2dd9bd`. ~8 occurrences.
- **Suggested approach:** (deferred.)

- **Severity:** Low
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 60-82
- **Category:** Hardcoded values that should be constants
- **Issue:** Three `<Link>`s to `/Privacy`, `/Terms`, `/EULA` — paths hardcoded, with capital first letter. Other places use `createPageUrl(...)` (e.g., CampaignConsentDialog line 75). Inconsistent route-helper usage.
- **Suggested approach:** Use `createPageUrl("Privacy")` etc. for consistency.

- **Severity:** Low
- **File:** src/components/legal/LegalReconsentGate.jsx
- **Line:** 44
- **Category:** console.log / .error / .warn left in
- **Issue:** Empty `catch {}` swallows errors with no log. Silent failure.
- **Suggested approach:** Add `console.error` (dev) or telemetry call.

#### /src/components/settings/

Seven tab components, all imported by `pages/Settings.jsx` except `DeleteAccountDialog.jsx` which is only used by `pages/SettingsLegacy.jsx`. Note that `PrivacyTab.jsx` defines its OWN inline `DeleteAccountDialog` component at lines 126-206 — entirely separate from the standalone file. **Two competing delete-account dialogs.**

##### Cross-cutting (all tabs)

- **Severity:** High
- **File:** All settings tabs (AccessibilityTab, AppearanceTab, LegalTab, NotificationsTab, PrivacyTab) lines 10/16
- **Category:** State management smells / coupling
- **Issue:** All tabs `import { Row, SectionHeader } from "@/pages/Settings"`. Layout primitives reused across the settings tabs live inside the `pages/Settings.jsx` route module — backwards dependency: components depend on a page. Renaming or refactoring `Settings.jsx` will break six files; circular-import risk if `Settings.jsx` ever imports back.
- **Suggested approach:** Extract `Row` and `SectionHeader` into `src/components/settings/_layout.jsx` (or similar) and re-export from there.

- **Severity:** Medium
- **File:** All tabs
- **Category:** Performance / state management smells
- **Issue:** Every tab independently calls `useQuery({ queryKey: ["userSettings", user?.id], ... })`. When the user navigates between tabs, each tab triggers its own initial fetch (cache hit but still wasteful re-render churn). More importantly, the cache key has no scope — a stale `getUserSettings` shape change drops every tab's data on the floor at once.
- **Suggested approach:** Hoist the `userSettings` query to `pages/Settings.jsx` (or a `SettingsLayout` wrapper) and pass slices via props or context. Reduces fetch fan-out and keeps the query key in one place.

- **Severity:** Medium
- **File:** All tabs (5 of 6) lines 3
- **Category:** Duplicate components or near-duplicates
- **Issue:** All tabs `import { toast } from "sonner"`, while the rest of the app wires radix-toast. Same systemic issue.
- **Suggested approach:** (See Batch 1A-i.)

- **Severity:** Medium
- **File:** All tabs with `<SelectTrigger>` (AccessibilityTab line 58, 96; AppearanceTab line 168, 188; PrivacyTab line 61, 176, 187)
- **Category:** Brand inconsistency
- **Issue:** Repeated `bg-[#050816] border-slate-700 text-white` on Select triggers and inputs.
- **Suggested approach:** (deferred.)

##### AccessibilityTab.jsx

- **Severity:** Medium
- **File:** src/components/settings/AccessibilityTab.jsx
- **Line:** 119-126
- **Category:** Accessibility
- **Issue:** Ironic: the **Accessibility** tab itself has accessibility issues. Switches and Selects have no `id`, no `htmlFor` on labels, no aria-describedby pointing at the description text. Sighted users see "Dyslexia-friendly mode / description / toggle" — screen readers may hear the toggle without the description. Verify `Row` provides this.
- **Suggested approach:** Audit `Row` (in pages/Settings.jsx) — ensure it generates an id and links it via `aria-describedby` to the description.

- **Severity:** Medium
- **File:** src/components/settings/AccessibilityTab.jsx
- **Line:** 35
- **Category:** Form validation gaps
- **Issue:** `useMutation` has no `onError` — failed save shows nothing. Combined with `onSuccess` toast, users assume success.
- **Suggested approach:** Add `onError: (e) => toast.error(...)`.

##### AppearanceTab.jsx

- **Severity:** Medium
- **File:** src/components/settings/AppearanceTab.jsx
- **Line:** 51-62
- **Category:** Performance
- **Issue:** `useQuery` keyed by `slotIds.sort().join(",")` — `Array.prototype.sort` MUTATES the original. `slotIds` is a fresh array each render so this is fine in practice, but the pattern is a footgun. If anyone refactors to `useMemo` the array, the mutation will resurface as a state-corruption bug.
- **Suggested approach:** Use `[...slotIds].sort().join(",")` to be explicit.

- **Severity:** Medium
- **File:** src/components/settings/AppearanceTab.jsx
- **Line:** 90-127
- **Category:** Performance
- **Issue:** `CosmeticRow` is defined inside the component body. New function reference every render → child memo invalidations → and its inline `<Row>` rerenders.
- **Suggested approach:** Move `CosmeticRow` outside the component and pass `cosmetics`, `itemBySlot`, `clearMut` via props.

- **Severity:** Medium
- **File:** src/components/settings/AppearanceTab.jsx
- **Line:** 65, 73
- **Category:** Form validation gaps
- **Issue:** Both mutations missing `onError` handlers. Same pattern across tabs.
- **Suggested approach:** Add `onError`.

- **Severity:** Low
- **File:** src/components/settings/AppearanceTab.jsx
- **Line:** 99-104
- **Category:** Accessibility
- **Issue:** `<img alt="" />` for cosmetic preview is appropriate (decorative — name is read aloud beside it), but `truncate` on the name span (line 105) means screen-reader text remains intact while sighted users see ellipsis — that's actually good. No fix; flag as confirming-correct.
- **Suggested approach:** No change.

##### DeleteAccountDialog.jsx (standalone)

- **Severity:** Critical
- **File:** src/components/settings/DeleteAccountDialog.jsx
- **Line:** 10, 33, 41, 49, 57, 68
- **Category:** Base44 leftovers
- **Issue:** Account deletion still routes through `base44.entities` for Character / Post / HomebrewRule / Friend / UserProfile. Also uses email-or-userId author lookup inconsistency (line 31 comment). During the Supabase migration this is the worst place to have stale Base44 paths — a half-migrated user will not have their data deleted from Supabase.
- **Suggested approach:** Replace with Supabase `delete()` calls per table; ideally consolidate into a server-side RPC that runs the full deletion atomically.

- **Severity:** Critical
- **File:** src/components/settings/DeleteAccountDialog.jsx
- **Line:** 1-129
- **Category:** Duplicate components or near-duplicates
- **Issue:** This file claims to "delete the account" via a 5-step Base44 walk. `PrivacyTab.jsx` defines a SEPARATE inline `DeleteAccountDialog` (lines 126-206) that just opens a support ticket with `category: 'account'`. Same name, same UX shell, completely different behaviour. The current Settings page (`pages/Settings.jsx`) uses the support-ticket version; the legacy page (`pages/SettingsLegacy.jsx`) uses the destructive version. A user landing on the wrong route gets wildly different consequences.
- **Suggested approach:** Pick one model (support-ticket-then-server-side-delete is the safer default) and delete the other. If both are needed (self-serve vs. moderated), name them distinctly: `SelfServeDeleteAccountDialog` vs. `RequestDeletionDialog`.

- **Severity:** High
- **File:** src/components/settings/DeleteAccountDialog.jsx
- **Line:** 32-72
- **Category:** Form validation gaps / silent failure
- **Issue:** Each phase wrapped in `try { ... } catch {}` swallowing every failure. If characters fail to delete, posts try anyway. If profile flag fails, supabase signOut still runs. User sees a success toast even if half their data remains.
- **Suggested approach:** Track per-step failures, abort on first hard failure, surface partial-failure message. Better: server-side transactional delete.

- **Severity:** High
- **File:** src/components/settings/DeleteAccountDialog.jsx
- **Line:** 31, 33
- **Category:** TODO / FIXME / HACK / XXX comments
- **Issue:** Comment "Hit both to be safe" implies known data-model inconsistency between `created_by` (email) and `user_id`. The code only filters by `user_id` though — it does NOT actually hit `created_by`. So legacy email-keyed Character rows are NEVER deleted.
- **Suggested approach:** Either remove the misleading comment or actually do the second filter pass on `created_by: user.email`.

- **Severity:** Medium
- **File:** src/components/settings/DeleteAccountDialog.jsx
- **Line:** 20
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** Dialog is exported with `userId, profileId` props, but `pages/SettingsLegacy.jsx` line 589 must pass them. No defaults, no validation — if either is undefined the deletion silently no-ops on profile flag (line 67 guard) but still signs the user out (line 74).
- **Suggested approach:** Validate and bail before signOut if profileId missing.

- **Severity:** Medium
- **File:** src/components/settings/DeleteAccountDialog.jsx
- **Line:** 86, 109
- **Category:** Brand inconsistency
- **Issue:** Hardcoded `#1E2430`, `#0b1220`.
- **Suggested approach:** (deferred.)

- **Severity:** Medium
- **File:** src/components/settings/DeleteAccountDialog.jsx
- **Line:** 111
- **Category:** Accessibility
- **Issue:** `autoFocus` on the confirmation input — fine in a dialog, but combined with no proper `aria-describedby` linking the warning copy + the input, screen readers may not associate "type DELETE" with the focused field.
- **Suggested approach:** Wire `aria-describedby` on the Input pointing at the helper paragraph id.

##### LegalTab.jsx

- **Severity:** Medium
- **File:** src/components/settings/LegalTab.jsx
- **Line:** 21-25
- **Category:** Hardcoded values that should be constants
- **Issue:** Hardcoded route paths instead of `createPageUrl(...)` (which the app uses elsewhere). Also paths capitalised — easy to drift if the router config changes case.
- **Suggested approach:** Use `createPageUrl("Terms")` etc.

- **Severity:** Low
- **File:** src/components/settings/LegalTab.jsx
- **Line:** 23
- **Category:** Dead code / route validity
- **Issue:** Links to `/PrivacySummary` — confirm that route exists in the router. (Out-of-scope for this batch but flag.)
- **Suggested approach:** Verify route is registered; if not, remove the link.

- **Severity:** Low
- **File:** src/components/settings/LegalTab.jsx
- **Line:** 39
- **Category:** Form validation gaps
- **Issue:** Mutation has no `onError`.
- **Suggested approach:** Add `onError`.

- **Severity:** Low
- **File:** src/components/settings/LegalTab.jsx
- **Line:** 55
- **Category:** Brand inconsistency
- **Issue:** `text-[#37F2D1]`.
- **Suggested approach:** (deferred.)

##### NotificationsTab.jsx

- **Severity:** Medium
- **File:** src/components/settings/NotificationsTab.jsx
- **Line:** 13-17
- **Category:** TODO / FIXME / HACK / XXX comments
- **Issue:** Doc comment admits "The email delivery path isn't fully wired yet — these toggles are intentionally persisted early so the email service can key its send/suppress decisions off them the moment it goes live." This is a stub-but-shipping pattern. Users will toggle and assume it works.
- **Suggested approach:** Add visible "Coming soon" badge next to the email section header, OR delay shipping the email toggles until the service exists.

- **Severity:** Medium
- **File:** src/components/settings/NotificationsTab.jsx
- **Line:** 31
- **Category:** Form validation gaps
- **Issue:** Mutation has no `onError`. If save fails users see nothing.
- **Suggested approach:** Add `onError`.

- **Severity:** Low
- **File:** src/components/settings/NotificationsTab.jsx
- **Line:** 39-55
- **Category:** Performance
- **Issue:** `emailToggle` / `inAppToggle` are functions defined inside the component body — recreated each render.
- **Suggested approach:** Hoist or memoize. Trivial cost in practice; flag for consistency with codebase patterns.

##### PrivacyTab.jsx

- **Severity:** Critical
- **File:** src/components/settings/PrivacyTab.jsx
- **Line:** 126-206
- **Category:** Duplicate components or near-duplicates
- **Issue:** This file defines its own `DeleteAccountDialog` shadowing the standalone file at `src/components/settings/DeleteAccountDialog.jsx`. Importing the wrong one anywhere produces drastically different behaviour (support ticket vs. immediate destructive deletion).
- **Suggested approach:** See cross-cutting note above. Rename or unify.

- **Severity:** High
- **File:** src/components/settings/PrivacyTab.jsx
- **Line:** 184-189
- **Category:** Duplicate components or near-duplicates
- **Issue:** Inline `<input>` instead of the project's `<Input>` component (which is imported elsewhere in the codebase). Inconsistent styling and behaviour.
- **Suggested approach:** Use `@/components/ui/input`.

- **Severity:** Medium
- **File:** src/components/settings/PrivacyTab.jsx
- **Line:** 41, 131
- **Category:** Form validation gaps
- **Issue:** `save` mutation has no `onError`. Submit mutation has `onError` (good). Inconsistent.
- **Suggested approach:** Standardise.

- **Severity:** Medium
- **File:** src/components/settings/PrivacyTab.jsx
- **Line:** 121, 158
- **Category:** Accessibility
- **Issue:** `DeleteAccountDialog` is rendered with `open={deleteOpen}` — when closed it still mounts (renders an internal `<Dialog open={false}>`). Radix handles this fine, but the inline dialog also re-mounts state on each open (good).
- **Suggested approach:** No-op; flagging for awareness.

- **Severity:** Low
- **File:** src/components/settings/PrivacyTab.jsx
- **Line:** 98-105
- **Category:** Dead code (unreferenced components/functions/files)
- **Issue:** "Download my data" is hardcoded `disabled` with `Coming soon` label and `title` attribute. Stub UI shipped to production.
- **Suggested approach:** Remove until implemented OR add a backlog ticket id in the title attribute for traceability.

- **Severity:** Low
- **File:** src/components/settings/PrivacyTab.jsx
- **Line:** 160, 176, 187
- **Category:** Brand inconsistency
- **Issue:** `#1E2430`, `#050816` hardcoded.
- **Suggested approach:** (deferred.)

##### ProfileTab.jsx

- **Severity:** High
- **File:** src/components/settings/ProfileTab.jsx
- **Line:** 8, 53
- **Category:** Base44 leftovers
- **Issue:** `await base44.entities.UserProfile.update(user.profile_id, { display_title: label })`. The same operation should be done via Supabase.
- **Suggested approach:** Replace with `supabase.from("user_profiles").update({display_title: label}).eq("id", user.profile_id)`.

- **Severity:** Medium
- **File:** src/components/settings/ProfileTab.jsx
- **Line:** 60
- **Category:** console.log / .error / .warn left in
- **Issue:** `console.error("Set title", err)` left in. The toast already surfaces the error to the user.
- **Suggested approach:** Replace with telemetry/Sentry call or remove.

- **Severity:** Medium
- **File:** src/components/settings/ProfileTab.jsx
- **Line:** 48
- **Category:** Hardcoded values that should be constants
- **Issue:** `const current = user?.display_title || "Wanderer";` — "Wanderer" is the canonical default title hardcoded inline. Same string is presumably used in `TITLE_CATALOG`. Drift risk.
- **Suggested approach:** Export `DEFAULT_TITLE` from `@/config/titleCatalog`.

- **Severity:** Medium
- **File:** src/components/settings/ProfileTab.jsx
- **Line:** 80-92
- **Category:** Accessibility
- **Issue:** Title cards are `<button>`s with disabled state but lack `aria-pressed` to communicate the currently selected title. Lock icon on locked items has no `aria-label`.
- **Suggested approach:** Add `aria-pressed={isCurrent}` and an `sr-only` "Locked" span next to the icon.

- **Severity:** Medium
- **File:** src/components/settings/ProfileTab.jsx
- **Line:** 87
- **Category:** Tailwind issues
- **Issue:** Arbitrary value `shadow-[0_0_10px_rgba(55,242,209,0.2)]` — long inline shadow. No design-token. Repeated elsewhere?
- **Suggested approach:** Extract to a tailwind plugin or CSS variable for the brand-glow effect.

- **Severity:** Low
- **File:** src/components/settings/ProfileTab.jsx
- **Line:** 71, 73, 87, 89, 90, 98
- **Category:** Brand inconsistency
- **Issue:** Multiple `#37F2D1`, `#1E2430`, `#0b1220` instances.
- **Suggested approach:** (deferred.)

#### /src/components/subscription/

Single file `SubscriptionTab.jsx` (~499 LOC) imported only by `pages/SettingsLegacy.jsx`. The current `pages/Settings.jsx` does NOT include a subscription tab — billing is presumably linked elsewhere. Worth verifying the routing.

**Tier source-of-truth check vs. audit brief:**

The brief specifies tavern upload fees in **Spice currency** (Free 1,250 Spice, Adventurer 250 Spice, Veteran/Guild waived). The TIERS table in `src/api/billingClient.js` (lines 45, 83, 121, 159) and the feature copy in this file (via `tier.features`) describe upload fees in **dollars** ($5, $1, waived). This is real drift.

Splits (Free 50/50, Adventurer 30/70, Veteran/Guild 20/80) match the brief.

##### SubscriptionTab.jsx

- **Severity:** Critical
- **File:** src/components/subscription/SubscriptionTab.jsx (and src/api/billingClient.js)
- **Line:** SubscriptionTab.jsx 209-216 (renders `tier.features`); billingClient.js lines 26, 45, 63, 83, 100, 121
- **Category:** Tier/subscription drift
- **Issue:** Tavern upload fees rendered to users are dollar amounts ("$5 fee, 50/50 split", "$1 fee, 30/70 split"). Audit brief states the model is **Spice**: 1,250 Spice (Free), 250 Spice (Adventurer), waived for Veteran/Guild. This file consumes `TIERS.features` so it inherits the drift. Either the source-of-truth has not been updated or the brief is stale — flag for product owner.
- **Suggested approach:** Confirm with product whether fees are Spice or USD; update `TIERS[*].features` strings and `TIERS[*].limits.tavernUploadFee` field name (e.g., add `tavernUploadFeeSpice`).

- **Severity:** High
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 1-499
- **Category:** Dead code (unreferenced components/functions/files) / inconsistent file naming
- **Issue:** Only consumer is `pages/SettingsLegacy.jsx`. The current `pages/Settings.jsx` (used by `Settings` route) does NOT mount this tab. Either the user-visible Settings route is missing the Subscription tab entirely, or this file is dead. Either is a substantive shipping bug.
- **Suggested approach:** Confirm whether subscription management is reachable from `pages/Settings.jsx`; if not, either re-mount this tab there or delete the file once SettingsLegacy is retired.

- **Severity:** High
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 401-425
- **Category:** Auth-specific concerns / Privacy
- **Issue:** `inviteByEmail` does `supabase.from('user_profiles').select('user_id, username').ilike('email', email).limit(1)`. This **leaks user existence** by email — anyone on the Guild tier can probe the database with a series of emails to learn whether each account exists, given the differentiated error message ("No user with that email yet" vs success). It also relies on RLS being correctly configured to permit `email` reads — if RLS allows this for any authenticated user, that's a privacy leak by design.
- **Suggested approach:** Move invite resolution server-side via Edge Function with a uniform success/queued response. Never let the client read `email` on `user_profiles`.

- **Severity:** High
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 252
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** `function GuildPanel({ sub, user, queryClient, setConfirmLeave, setConfirmRemove })` — `confirmLeave` / `confirmRemove` props are passed in (lines 111, 113) but not destructured or used inside `GuildPanel`. Dead props.
- **Suggested approach:** Remove `confirmLeave`/`confirmRemove` from the call site or destructure them and use them.

- **Severity:** High
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 274-302
- **Category:** Performance
- **Issue:** `members` query enabled only for `isGuildOwner`. Inside the queryFn, the OR filter `guild_owner_id.eq.${userId},user_id.eq.${userId}` interpolates `userId` into a Postgres OR string. If `userId` came from an attacker-controlled source it could be SQL-injection-adjacent — Supabase's `.or()` is documented to be safe-ish for UUIDs, but it accepts raw strings. Defence-in-depth: validate userId is a UUID before interpolation.
- **Suggested approach:** Validate `userId` matches UUID regex; ideally restructure as two queries combined client-side.

- **Severity:** High
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 38-55
- **Category:** State management smells
- **Issue:** `useEffect` runs on mount, reading `window.location.search`, calling `sub.refresh()`, then mutating history. The eslint-disable hides the dependency-array gap. If `user?.id` is null at mount (auth still loading) the analytics call fires with `undefined` user. If the URL contains `subscription=success` after redirect from Stripe, the success toast fires but `sub.refresh()` may run before the user is fully authenticated.
- **Suggested approach:** Guard the success branch with `if (!user?.id) return;` and add `user?.id` to deps + a ref-based once-only flag.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 365
- **Category:** Hardcoded values that should be constants
- **Issue:** `maxSeats={TIERS.guild.limits.guildSeats}` — Brief says "Guild $34.99 per month for 6 members"; TIERS.guild.limits.guildSeats is `6`. Aligns with brief. But the brief value isn't co-located so seats hardcoded into TIERS table rather than into a `GUILD_SEAT_COUNT` constant. If pricing model evolves (e.g., 8 seats), at least one feature-list string ("$5.83 per person") and the seat count must update together.
- **Suggested approach:** Compute the per-person price string from `price / guildSeats` so it stays in sync.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 132, 161, 316
- **Category:** Form validation gaps
- **Issue:** Three places call bare `toast(...)` (no level) for non-error events. Mixed with `toast.success` and `toast.error`. Inconsistent — `toast()` may render with a different default style.
- **Suggested approach:** Use `toast.success` / `toast.info` consistently.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 401-403
- **Category:** Form validation gaps
- **Issue:** `inviteByEmail` accepts an email but doesn't validate format. Empty / malformed strings produce an unhelpful "No user with that email yet" toast.
- **Suggested approach:** Use the `<Input type="email">` HTML5 validation OR add a regex check before the supabase query.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 478-484
- **Category:** Duplicate components or near-duplicates
- **Issue:** Inline `<input type="email">` instead of `<Input>` from `@/components/ui/input`. Same anti-pattern flagged in `PrivacyTab`. Suggests a wider codebase pattern.
- **Suggested approach:** Use the `<Input>` component.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 119, 148, 183, 374, 429, 446, 450, 483, 485
- **Category:** Brand inconsistency
- **Issue:** Hardcoded `#1E2430`, `#2A3441`, `#111827`, `#0b1220`, `#37F2D1`, `#fbbf24`, `#22c55e`, `#16a34a`, `#fde68a`, `#050816`. ~12 hex values across the file.
- **Suggested approach:** (deferred.)

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 184, 186, 199, 212, 241
- **Category:** Inline styles that should be Tailwind/CSS
- **Issue:** Multiple `style={{ ... }}` (CSS variable injection for accent color) and `style={{ background: accent }}`. The CSS var trick (lines 184, 186, 199) is sensible because tier color is dynamic — but mixing inline-style accent with Tailwind classes for everything else makes scanning harder. Also `shadow-[0_0_25px_rgba(0,0,0,0.4)]` is a long arbitrary value.
- **Suggested approach:** Either commit to inline-style for tier accent or move into a `data-tier` attribute and use Tailwind's `data-[tier=guild]:bg-amber-400` pattern.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 427
- **Category:** Bug
- **Issue:** `const memberCount = (members || []).length || 1;` — falls back to 1 when there are 0 members. UI then renders "1/6 members" even when nobody is in the guild. Misleading.
- **Suggested approach:** Use `members?.length ?? 0`. Owner should count toward the seats anyway, but encode that explicitly.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 264
- **Category:** Performance
- **Issue:** `refetchInterval: 30000` polls invite list every 30s while the user sits on the tab. If many users leave the tab open (it's a settings route), this is unnecessary load.
- **Suggested approach:** Use Supabase realtime subscription OR only refetch on window focus.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 117, 145, 147, 173
- **Category:** Accessibility
- **Issue:** AlertDialog rendered with no `aria-describedby` on the body content; cancel button has heavy custom hover classes (`hover:bg-gray-800 hover:text-white`) — verify focus visible state still works.
- **Suggested approach:** Confirm Radix alert-dialog handles focus management; spot-check focus ring visibility on the cancel button.

- **Severity:** Medium
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 184, 199
- **Category:** Tailwind issues
- **Issue:** `border-[--accent]` and `bg-[--accent]` rely on the CSS-var being defined inline. If a parent ever overrides `--accent`, the tier card will inherit the wrong color silently.
- **Suggested approach:** Use a more specific custom property name like `--gs-tier-accent`.

- **Severity:** Low
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 35
- **Category:** Performance
- **Issue:** Three pieces of local state (`busyTier`, `confirmLeave`, `confirmRemove`) — fine, but `confirmRemove` holds the member id while `confirmLeave` is a boolean. Inconsistent shape.
- **Suggested approach:** No fix needed; flag for awareness.

- **Severity:** Low
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 43
- **Category:** Hardcoded values that should be constants
- **Issue:** `🎉` emoji in toast string; consistent with codebase pattern but flagged for accessibility (screen readers may speak "party popper").
- **Suggested approach:** Remove or replace with text.

- **Severity:** Low
- **File:** src/components/subscription/SubscriptionTab.jsx
- **Line:** 1-499
- **Category:** Missing error boundaries
- **Issue:** No boundary around the panel — a malformed TIERS feature list could crash the route.
- **Suggested approach:** Project-wide systemic.

##### Batch 1A-ii Summary

**Totals by severity (this batch only):**

| Severity  | Count |
|-----------|-------|
| Critical  | 5     |
| High      | 18    |
| Medium    | 53    |
| Low       | 19    |
| Cosmetic  | 1     |
| **Total** | **96** |

**Totals by category (this batch only):**

| Category | Count |
|---|---|
| Brand inconsistency | 13 |
| Accessibility | 13 |
| Form validation gaps | 10 |
| Hardcoded values that should be constants | 9 |
| Performance | 9 |
| State management smells | 6 |
| Duplicate components or near-duplicates | 5 |
| Base44 leftovers | 4 |
| Tailwind issues | 4 |
| Prop validation / inconsistent prop usage | 3 |
| Inconsistent file naming | 3 |
| Inline styles that should be Tailwind/CSS | 2 |
| Missing error boundaries | 2 |
| Dead code (unreferenced components/functions/files) | 3 |
| TODO / FIXME / HACK / XXX comments | 2 |
| console.log / .error / .warn left in | 2 |
| Auth-specific concerns | 2 |
| Bug / race condition | 2 |
| Tier/subscription drift | 1 |
| Semantic HTML / heading hierarchy | 1 |
| Broken or unused imports / DOM bug | 1 |

(Some findings cross-categorize — categories chosen by primary impact.)

**Top systemic issues for THIS batch:**

1. **Base44 still gates consent and account-deletion flows.** `CampaignConsentDialog`, `DeleteAccountDialog`, and `ProfileTab` all read/write through `base44.entities`. If the Base44 backend is decommissioned mid-migration, consent records and account purges silently break — these are exactly the operations that must NOT silently break (legal / compliance posture).
2. **Two `DeleteAccountDialog` components.** A standalone destructive `base44`-walking variant under `settings/` and an inline support-ticket variant inside `PrivacyTab.jsx`. They share a name, share a UX shell, do completely different things. Importing the wrong one is a critical user-data risk.
3. **Settings tabs depend on `pages/Settings`** for the `Row` / `SectionHeader` primitives — backwards layering that will bite any refactor of the Settings route.
4. **Tavern upload-fee unit drift.** Brief documents fees in Spice (1,250 / 250 / waived); `billingClient.TIERS.features` strings render dollars ($5 / $1 / waived). Pricing copy users see in `SubscriptionTab` therefore disagrees with the canonical model.
5. **Privacy leak via Guild invite-by-email.** `inviteByEmail` lets a Guild owner probe the `user_profiles.email` column with arbitrary strings and learn whether each address is registered. Move to a server-side resolver.
6. **Form-association accessibility gaps.** Three different consent / deletion dialogs wrap `<Checkbox>` (Radix button) inside a bare `<label>` without `htmlFor` — the legally-meaningful "I accept" toggle is not programmatically labelled for screen-reader users.
7. **Mutations missing `onError` handlers** in 4 of the 6 Settings tabs and the appearance / accessibility / legal / notifications tabs in particular — silent save failures.

### Batch 1A-iii-a: campaigns folder

**Scope:** `/src/components/campaigns/` (14 top-level files + 6 in `create/`).

#### /src/components/campaigns/

##### BanListEditor.jsx

- **Severity:** Medium
- **File:** src/components/campaigns/BanListEditor.jsx
- **Line:** 104, 169
- **Category:** Accessibility
- **Issue:** Uses native `window.confirm()` for destructive ban-removal and bulk-preset apply. Native confirms are not styled, focus-trap is OS-default, and they break the rest of the app's `AlertDialog` pattern.
- **Suggested approach:** Replace with the project's `AlertDialog` component (already used in BreweryModsPanel).

- **Severity:** Medium
- **File:** src/components/campaigns/BanListEditor.jsx
- **Line:** 29-37, 49-74
- **Category:** Permission gating
- **Issue:** Component is documented as "GM-only" but does not check `canEdit` / GM ownership locally. It relies entirely on RLS, so a non-GM viewing the settings UI would see Add/Remove/Preset controls before the server denies them.
- **Suggested approach:** Accept a `canEdit` prop (matching BreweryModsPanel) and disable mutating controls when false.

- **Severity:** Low
- **File:** src/components/campaigns/BanListEditor.jsx
- **Line:** 79, 94, 128, 154, 200, 209, 216
- **Category:** Brand color mismatches
- **Issue:** 7 hard-coded hex surfaces (`#2A3441`, `#050816`, `#1E2430`) plus rose/amber accent classes — no use of brand tokens.
- **Suggested approach:** Track for the global brand-token migration.

- **Severity:** Low
- **File:** src/components/campaigns/BanListEditor.jsx
- **Line:** 55, 64, 73
- **Category:** console.log / .error / .warn left in
- **Issue:** Three `console.error(err)` calls in mutation onError handlers in production code.
- **Suggested approach:** Route through a logger util or drop once Sentry/equivalent is wired.

- **Severity:** Low
- **File:** src/components/campaigns/BanListEditor.jsx
- **Line:** 81-84, 137
- **Category:** Semantic HTML / heading hierarchy
- **Issue:** Uses `<h2>` inside what is rendered as a tab/panel within a larger Settings page; depending on parent there may be an h1→h2 jump or two h2s siblings.
- **Suggested approach:** Verify against parent route structure.

- **Severity:** Low
- **File:** src/components/campaigns/BanListEditor.jsx
- **Line:** 119-134
- **Category:** Accessibility
- **Issue:** Ban-type tabs are plain `<button>`s without `role="tab"`, `aria-selected`, or a `role="tablist"` wrapper. Keyboard-arrow navigation between tabs is also absent.
- **Suggested approach:** Use the existing shadcn `Tabs` primitive (already shipped) for proper a11y semantics.

- **Severity:** Low
- **File:** src/components/campaigns/BanListEditor.jsx
- **Line:** 137-142, 184-229
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** `AddBanForm` accepts `campaignId` prop but never uses it (only `activeType`, `onAdd`, `submitting` are read).
- **Suggested approach:** Drop the unused prop.

##### BreweryModsPanel.jsx

- **Severity:** High
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 15
- **Category:** Base44 leftovers
- **Issue:** `import { base44 } from "@/api/base44Client"` is imported but never referenced inside the file. Dead Base44 import.
- **Suggested approach:** Remove the import.

- **Severity:** High
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 113-132
- **Category:** Real-time/state sync issues
- **Issue:** `updateMod` mutation writes directly to `campaign_installed_mods` from the client (bypasses `lib/modEngine`). Other writes in this file go through the engine; mixing direct table writes risks divergence (e.g. patch reapplication, audit log, validation hooks).
- **Suggested approach:** Add an `updateMod` helper to `lib/modEngine` and call it instead.

- **Severity:** High
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 73-77, 215-243
- **Category:** Real-time/state sync issues
- **Issue:** Priority up/down buttons mutate priority by ±1 with no atomic swap and no optimistic update — concurrent reorders can produce duplicate priorities; the UI also flashes back to the server value while invalidating.
- **Suggested approach:** Either implement an atomic swap RPC or perform an optimistic mutation that reorders the local list and rolls back on error.

- **Severity:** Medium
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 79-102
- **Category:** Bug / race condition
- **Issue:** `uninstall` and `forceUninstall` mutations have no `onError` handler — a network or RLS failure surfaces nothing to the user, and the Trash2 button stays usable.
- **Suggested approach:** Add `onError` toasts mirroring `toggleStatus`.

- **Severity:** Medium
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 51-60
- **Category:** Performance
- **Issue:** Catalog query key is `modIds.sort().join(",")` — calling `.sort()` mutates the array in place, and the cache key changes any time the install list reorders even when the underlying ids are the same set. Also, sorting on each render forces re-keying when results haven't changed.
- **Suggested approach:** `[...modIds].sort()` (or `Array.from`) and memoize the key, or use a stable shape (`{ ids: modIds }`) — react-query handles deep equality.

- **Severity:** Low
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 141, 160-163, 202-204
- **Category:** Brand color mismatches
- **Issue:** ~6 occurrences of `#37F2D1` / `#2A3441` / `#1E2430` / `#050816` / `#111827`.
- **Suggested approach:** Track for brand-token migration.

- **Severity:** Low
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 195, 198
- **Category:** Hardcoded values that should be constants
- **Issue:** Fallback strings "Unknown mod" and badge `"mod"` are hardcoded — duplicated in modEngine elsewhere.
- **Suggested approach:** Centralize copy.

- **Severity:** Low
- **File:** src/components/campaigns/BreweryModsPanel.jsx
- **Line:** 118
- **Category:** Hardcoded values that should be constants
- **Issue:** Default version `"1.0.0"` hardcoded — should match the catalog's source-of-truth or refuse to update without a version.
- **Suggested approach:** Refuse update if `catalog.version` is absent rather than silently writing 1.0.0.

##### CampaignApplicationsPanel.jsx

- **Severity:** High
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 33-103
- **Category:** Permission gating
- **Issue:** No campaign-membership / GM ownership check before rendering or before mutations. Component trusts `campaignId` prop and RLS — but the component is named "GM application review" and exposes accept/reject buttons. A non-GM user passed `campaignId` would see Accept/Reject buttons that fail at the server.
- **Suggested approach:** Compare `campaign.game_master_id` to current `auth.user.id` (via `useAuth`), or accept an `isGM` prop and short-circuit-render an empty fragment if false.

- **Severity:** High
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 90-94, 98-99
- **Category:** Real-time/state sync issues
- **Issue:** Reject mutations are owned by the dialog (line 262), but `accept` mutation is owned here. After accept the panel invalidates `["userCampaigns"]` — but never invalidates the player-side `["myCampaignApplications"]` cache that `MyApplicationsInbox` reads, so the player won't see the accepted/rejected state until refresh.
- **Suggested approach:** Add `queryClient.invalidateQueries({ queryKey: ["myCampaignApplications"] })` to `invalidate()`.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 47, 124
- **Category:** Hardcoded values that should be constants
- **Issue:** Reads `app.user_id || app.applicant_id` in two places — column ambiguity (which column is canonical for applicant?). This bleeds an unresolved schema decision into UI code.
- **Suggested approach:** Settle the column name in the DB layer and pick one here.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 57, 70
- **Category:** Performance
- **Issue:** Same `.sort()` mutating-key anti-pattern as BreweryModsPanel — `applicantIds.sort().join(",")` and `characterIds.sort().join(",")` mutate the memoized arrays.
- **Suggested approach:** Spread before sorting; consider using the array directly as react-query handles equality.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 156, 220
- **Category:** Accessibility
- **Issue:** Avatar `<img alt="" />` is correct for purely decorative use, but no programmatic association with the applicant name; screen readers will read just the name. Acceptable but verify via heading/list semantics. Also: expand button is `<button>` without `aria-expanded` / `aria-controls`.
- **Suggested approach:** Add `aria-expanded={expanded}` to the disclosure button.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 220
- **Category:** Performance
- **Issue:** `FullCharacterSheetPreview` renders inside an expandable section, but is mounted regardless when expanded — and on a list of 20 pending apps each expansion re-renders the entire sheet. Component appears expensive (read next file). Also, expanding multiple sheets at once mounts each.
- **Suggested approach:** Lazy-load the preview component (`React.lazy`) so first-paint on the list isn't taxed.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 93, 281
- **Category:** console.log / .error / .warn left in
- **Issue:** `console.error(err)` and `console.error("reject", err)` left in production paths.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 106, 153, 189, 220, 291, 310
- **Category:** Brand color mismatches
- **Issue:** ~6 hex constants (`#1E2430`, `#37F2D1`, `#050816`, `#0b1220`).

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplicationsPanel.jsx
- **Line:** 200
- **Category:** Hardcoded values that should be constants
- **Issue:** `slice(0, 4)` truncates ban-violation list with no "+N more" affordance — the GM doesn't know there are additional violations.
- **Suggested approach:** Render a "+N more" tail when the list exceeds the limit.

##### CampaignApplyFlow.jsx

- **Severity:** Critical
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 13, 50-60
- **Category:** Base44 leftovers
- **Issue:** Character library is fetched via `base44.entities.Character.filter({ created_by: user.email })` — Base44 dependency in the apply flow, AND filtering by `email` (PII) instead of `user.id`. This is on the migration-out list and currently couples the entire apply UX to the legacy backend.
- **Suggested approach:** Replace with a Supabase query against the `characters` table filtered by `user_id`.

- **Severity:** High
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 51
- **Category:** Bug / race condition
- **Issue:** Query key `["applyFlowCharacters", user?.email]` keys the cache by **email**, not user id. If a user changes their email, characters appear to vanish until cache invalidation. Also leaks PII into devtools/cache snapshots.
- **Suggested approach:** Key by `user.id`.

- **Severity:** High
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 14
- **Category:** Broken or unused imports
- **Issue:** `import { supabase } from "@/api/supabaseClient"` is imported but never used in this file.
- **Suggested approach:** Remove (or wire into the Base44 replacement above).

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 110-117
- **Category:** Real-time/state sync issues
- **Issue:** `onSuccess` invalidates `["myCampaignApplications"]` but not the GM-side `["campaignApplications", id]` cache — the GM seeing the campaign in another tab won't refresh until manual reload. Real-time channel may help but isn't referenced here.
- **Suggested approach:** Either invalidate both, or rely on a Supabase realtime channel and document it.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 112
- **Category:** State management smells
- **Issue:** `setTimeout(() => onClose?.(), 1800)` auto-dismisses the success modal — if the parent unmounts before that timeout fires, you get a "set state on unmounted component" warning + a stale onClose call.
- **Suggested approach:** Track timeout in a ref and clear in cleanup.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 34
- **Category:** Dead code (unreferenced components/functions/files)
- **Issue:** `STEPS` constant is declared but never read — steps are referenced as string literals throughout.
- **Suggested approach:** Delete or wire into a step indicator.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 70-89
- **Category:** State management smells
- **Issue:** `characterCompat` is recreated every render (closure over `modInfo`/`installedModIds`) but is passed through three props deep and used inside `.map`. Causes child re-renders.
- **Suggested approach:** Wrap in `useCallback`.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 115
- **Category:** console.log / .error / .warn left in
- **Issue:** `console.error("Application submit", err)` in production.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 139, 153, 157, 245, 267, 294, 416, 451
- **Category:** Brand color mismatches
- **Issue:** ~12 hex hardcodes (`#050816`, `#37F2D1`, `#2dd9bd`, `#1E2430`, `#0b1220`).

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 264-274
- **Category:** Accessibility
- **Issue:** "Create New" tile is a `<button>` styled like a card — fine — but uses border-dashed + dashed text only with no programmatic name beyond label. Acceptable, but check focus-visible.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 296
- **Category:** Accessibility
- **Issue:** `CharacterTile` has `onClick` on the outer `<div>` — not a button, no `role="button"`, no `tabIndex`, no `onKeyDown`. Keyboard users can't pick a character; only the inline Edit child button is reachable.
- **Suggested approach:** Make the outer element a `<button>` (or a Radix `RadioGroup.Item` if treating as selection), preserving the inner Edit button via `event.stopPropagation`.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignApplyFlow.jsx
- **Line:** 432-441
- **Category:** Accessibility
- **Issue:** `<label>` has no `htmlFor`/`id` connection to the textarea.
- **Suggested approach:** Add `id` + `htmlFor`, or use shadcn `Label`.

##### CampaignCarousel.jsx

- **Severity:** High
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 6
- **Category:** Broken or unused imports
- **Issue:** `import { base44 } from "@/api/base44Client"` imported but never used.
- **Suggested approach:** Remove.

- **Severity:** High
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 117-118
- **Category:** Brand color mismatches / Inline styles that should be Tailwind/CSS
- **Issue:** Section title hardcoded with inline `style={{ color: "#FF5722" }}` (orange — close to brand `#FF5300` but not identical) and `bg-[#FF5722]` divider. Mixing brand-adjacent oranges with the cyan `#37F2D1` palette used elsewhere in the file.
- **Suggested approach:** Replace inline style with a Tailwind class on a brand token; consolidate orange/cyan choice with design.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 120-122
- **Category:** Accessibility / Dead code
- **Issue:** Trailing `<button>` with `<ChevronRight>` — no onClick, no `aria-label`, no functionality. Looks interactive but does nothing.
- **Suggested approach:** Either wire it (carousel scroll-right) or remove.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 130-194
- **Category:** Accessibility
- **Issue:** Outer card `<div>` has `onClick` but is not a button — no role, tabIndex, keyboard handler. Hover-revealed action buttons (lines 154-191) are completely keyboard-inaccessible (only visible via `group-hover:opacity-100`). On a tab visit, focus jumps to invisible buttons.
- **Suggested approach:** Replace outer click with `<Link>`/`<button>`; show controls on focus-within as well as group-hover.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 155-191
- **Category:** Accessibility
- **Issue:** Action buttons use `title` attribute only — no `aria-label`. Title attributes are unreliable for screen readers.
- **Suggested approach:** Add `aria-label` to each action button.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 47-63
- **Category:** Real-time/state sync issues
- **Issue:** `archiveMutation` has no `onError` — server errors swallowed silently when not surfaced via `res.ok`.
- **Suggested approach:** Add `onError` toast.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 65-79
- **Category:** Real-time/state sync issues
- **Issue:** Same: `unarchiveMutation` lacks `onError`.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 138-140
- **Category:** Hardcoded values that should be constants
- **Issue:** Unsplash placeholder URL hardcoded — duplicated in `CampaignGrid.jsx`. Should be a shared constant or local asset.
- **Suggested approach:** Centralize into `@/utils/placeholders` (or move to `/public/`).

- **Severity:** Low
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 117, 118, 157, 160, 167, 177, 180, 105 (DeleteDialog)
- **Category:** Brand color mismatches
- **Issue:** ~7 hex hardcodes (`#FF5722`, `#37F2D1`, `#1E2430`).

- **Severity:** Low
- **File:** src/components/campaigns/CampaignCarousel.jsx
- **Line:** 22-23
- **Category:** Prop validation / inconsistent prop usage
- **Issue:** Five boolean toggles (`showPlayButton`, `showArchiveButton`, `showUnarchiveButton`, `grayscale`, `currentUserId`) make the call sites brittle. There's also an inferred mode from these flags (active vs. archived listing) — could be a single `mode` prop.
- **Suggested approach:** Replace with a single `mode: "active" | "archived"` prop and derive the buttons from it.

##### CampaignGrid.jsx

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignGrid.jsx
- **Line:** 1-51
- **Category:** Duplicate components or near-duplicates
- **Issue:** Near-duplicate of the card render block in `CampaignCarousel.jsx` (cover image + title + description + meta), but using `<Link to={createPageUrl("CampaignView")…}>` while the carousel routes to `CampaignGMPanel`/`CampaignPanel` based on GM status. Inconsistent routing for the same card.
- **Suggested approach:** Extract a shared `CampaignCard` component with mode-aware navigation.

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignGrid.jsx
- **Line:** 20
- **Category:** Bug / race condition
- **Issue:** Routes to `CampaignView` page — but the carousel routes to `CampaignGMPanel`/`CampaignPanel`. If `CampaignView` is the legacy route, callers of `CampaignGrid` may be sending users to a stale page. Verify route still exists.
- **Suggested approach:** Confirm `CampaignView` is the intended landing; otherwise unify with carousel routing.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignGrid.jsx
- **Line:** 26
- **Category:** Hardcoded values that should be constants
- **Issue:** Same hardcoded Unsplash placeholder as CampaignCarousel.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignGrid.jsx
- **Line:** 38
- **Category:** Bug / race condition
- **Issue:** Reads `campaign.player_ids?.length`. The campaigns table has a separate `campaign_members` table; `player_ids` may be a denormalized cache that drifts.
- **Suggested approach:** Verify whether `player_ids` is the source of truth or denormalized; in the latter case query `campaign_members` count.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignGrid.jsx
- **Line:** 23
- **Category:** Brand color mismatches
- **Issue:** `bg-[#2A3441]`, `ring-[#37F2D1]`.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignGrid.jsx
- **Line:** 6-13
- **Category:** Accessibility
- **Issue:** Empty state is plain text — no heading; screen-reader users tabbing the page won't easily detect the section.
- **Suggested approach:** Add an `<h3>` or `role="status"`.

##### CampaignPreviewPanel.jsx

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignPreviewPanel.jsx
- **Line:** 50
- **Category:** Hardcoded values that should be constants
- **Issue:** `Math.min(Number(campaign?.max_players) || 6, 8)` — magic numbers (6 default, 8 cap). Cap should be a constant; defaulting to 6 silently overrides invalid data.
- **Suggested approach:** Hoist to `MIN_DEFAULT_PARTY = 6` / `MAX_PARTY_HARD_CAP = 8` (or pull from a campaign-config module).

- **Severity:** Medium
- **File:** src/components/campaigns/CampaignPreviewPanel.jsx
- **Line:** 51, 158-175
- **Category:** Hardcoded values that should be constants
- **Issue:** `extractHouseRulesSummary` hard-codes baseline values (DC 10, short rest 60 min, long rest 8 hr). If `HouseRulesPanel` defaults change, this silently desyncs.
- **Suggested approach:** Import baseline rule values from a single source shared with `HouseRulesPanel`.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignPreviewPanel.jsx
- **Line:** 71-74
- **Category:** Bug / race condition
- **Issue:** Reads either `campaign_description` or `description` columns — schema ambiguity. Same on `title || name` (line 59).
- **Suggested approach:** Pick one column and migrate.

- **Severity:** Low
- **File:** src/components/campaigns/CampaignPreviewPanel.jsx
- **Line:** 55, 66, 85, 95-97, 119
- **Category:** Brand color mismatches
- **Issue:** ~5 hex hardcodes.

##### DeleteCampaignDialog.jsx

- **Severity:** High
- **File:** src/components/campaigns/DeleteCampaignDialog.jsx
- **Line:** 51-83
- **Category:** Permission gating
- **Issue:** No verification that `gmUserId === auth.user.id` before calling `deleteCampaign`/`archiveCampaign`. If a non-GM somehow gets the dialog open with a different `gmUserId`, the mutation will fire and rely on RLS for the rejection. Defensive UI check missing.
- **Suggested approach:** Pull the current user from `useAuth` and short-circuit if mismatch.

- **Severity:** Medium
- **File:** src/components/campaigns/DeleteCampaignDialog.jsx
- **Line:** 51-83
- **Category:** Real-time/state sync issues
- **Issue:** Both `archiveMutation` and `deleteMutation` lack `onError` handlers — server / network failure produces no toast.
- **Suggested approach:** Add `onError` mirroring the application-rejection mutations.

- **Severity:** Medium
- **File:** src/components/campaigns/DeleteCampaignDialog.jsx
- **Line:** 80
- **Category:** Real-time/state sync issues
- **Issue:** After delete, only `["userCampaigns"]` invalidated — but `["currentUserSubscription", currentUserId]` (used by `CampaignCarousel` for archive count) and `["myCampaignApplications"]` (player-side) are not refreshed.
- **Suggested approach:** Invalidate the broader cache set or use a dedicated lifecycle helper that owns the invalidation list.

- **Severity:** Low
- **File:** src/components/campaigns/DeleteCampaignDialog.jsx
- **Line:** 105, 167
- **Category:** Brand color mismatches
- **Issue:** `#1E2430`, `#37F2D1`, `#2dd9bd`, `#050816`.

- **Severity:** Low
- **File:** src/components/campaigns/DeleteCampaignDialog.jsx
- **Line:** 110-119
- **Category:** Accessibility
- **Issue:** Uses nested `<span>` blocks inside `AlertDialogDescription`. Radix renders the description as a `<p>`, so nesting `<span class="block">` blocks is valid — but the text is dense; consider explicit list semantics for the bullet-style content.

##### FullCharacterSheetPreview.jsx

- **Severity:** High
- **File:** src/components/campaigns/FullCharacterSheetPreview.jsx
- **Line:** 18-67, 88-132
- **Category:** Duplicate components or near-duplicates
- **Issue:** Re-implements ability/skill/saving-throw math that almost certainly already exists in `src/components/characters/` (canonical character sheet). Duplicating skill-list, modifier formula, proficiency-bonus formula creates two sources of truth for crit/proficiency rules. Risk: campaign-level rule overrides (e.g. flat-DC death save 12) won't apply here.
- **Suggested approach:** Reuse the character-domain helpers (`getRule(campaign.homebrew_rules, …)`-aware) rather than reimplementing baseline 5e math.

- **Severity:** Medium
- **File:** src/components/campaigns/FullCharacterSheetPreview.jsx
- **Line:** 35
- **Category:** Hardcoded values that should be constants
- **Issue:** Proficiency-bonus formula `Math.ceil(l / 4) + 1` hardcoded — and ignores campaign overrides like flat-PB or epic-tier scales.
- **Suggested approach:** Pull from a shared rules helper.

- **Severity:** Medium
- **File:** src/components/campaigns/FullCharacterSheetPreview.jsx
- **Line:** 53-55
- **Category:** Hardcoded values that should be constants
- **Issue:** Reads either `equipment` OR `inventory` array — column ambiguity without resolution.

- **Suggested approach:** Pick one column.

- **Severity:** Medium
- **File:** src/components/campaigns/FullCharacterSheetPreview.jsx
- **Line:** 100-103, 120-121
- **Category:** Performance
- **Issue:** Computes ability mod inside a `.map` that runs 6× (saves) and 18× (skills) on every parent re-render. Cheap individually but `useMemo` over `abilities`/`pb` would avoid the `Math.floor` recomputation.
- **Suggested approach:** Memoize precomputed mod object once.

- **Severity:** Low
- **File:** src/components/campaigns/FullCharacterSheetPreview.jsx
- **Line:** 89, 105, 123, 138, 158, 177, 193, 206, 235, 240, 262
- **Category:** Brand color mismatches
- **Issue:** ~14 hex hardcodes (`#0b1220`, `#37F2D1`, `#050816`).

- **Severity:** Low
- **File:** src/components/campaigns/FullCharacterSheetPreview.jsx
- **Line:** 137, 192, 205, 223
- **Category:** Accessibility
- **Issue:** Lists keyed on `i` (array index) for features/equipment/languages/companions — fine for static lists, but breaks reorder-stability if features are draggable (companions especially).

- **Severity:** Low
- **File:** src/components/campaigns/FullCharacterSheetPreview.jsx
- **Line:** 280-285
- **Category:** Semantic HTML / heading hierarchy
- **Issue:** Renders `<h4>` directly inside a section that's already nested under another `<h2>`/`<h3>` ancestor (the dialog title). Hierarchy could skip levels depending on parent.
- **Suggested approach:** Use `aria-label` on `<section>` or pass a heading-level prop.

##### HouseRulesPanel.jsx

- **Severity:** Critical
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 12, 227, 246, 259, 301, 306, 582, 594
- **Category:** Base44 leftovers
- **Issue:** Eight Base44 calls drive the entire panel:
  - `base44.entities.CampaignHomebrew.filter` (read installed homebrew)
  - `base44.entities.HomebrewRule.filter` (read pack metadata)
  - `base44.entities.Campaign.update` (write `homebrew_rules` + `settings`)
  - `base44.entities.CampaignHomebrew.update` (toggle installed homebrew)
  - `base44.entities.CampaignHomebrew.delete` (uninstall)
  - `base44.entities.Dnd5eSpell.list` (ban-list spell catalog)
  This is the largest concentration of legacy Base44 dependence in the campaigns folder. Every house-rule change still flows through Base44.
- **Suggested approach:** Replace each with the matching Supabase table call; coordinate with campaign / homebrew domain modules.

- **Severity:** High
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 228-232, 248-251
- **Category:** Bug / race condition
- **Issue:** `try / catch` blocks swallow errors silently with `return []` — so a real Base44 outage looks identical to "no homebrew installed", and the UI shows the empty state. Hides outages from users.
- **Suggested approach:** Surface errors in a banner or distinguish "loading", "empty", "error" states.

- **Severity:** High
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 240
- **Category:** Performance / Bug
- **Issue:** Same `.sort().join(",")` mutating-array antipattern; here it sorts `installedHomebrew.map((h) => h.homebrew_id)` without spreading. Any other consumer of that array sees its order mutated.
- **Suggested approach:** Spread before sort.

- **Severity:** High
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 244-247
- **Category:** Performance
- **Issue:** N+1 query — one `base44.entities.HomebrewRule.filter({ id })` call per installed homebrew row, kicked off via `Promise.all`. For a campaign with 20 homebrew packs that's 20 round trips.
- **Suggested approach:** Single `.in("id", ids)` Supabase query.

- **Severity:** High
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 564-568
- **Category:** Hardcoded values that should be constants / Domain
- **Issue:** `CLASSES_FOR_BAN` hard-codes the 14 PHB+TCE classes including the third-party "Blood Hunter". Diverges from the `BanListEditor` flow (the canonical content-restriction store: `campaign_bans` table) — same campaign now has TWO ban systems: `settings.banned_classes` JSONB AND `campaign_bans` rows.
- **Suggested approach:** Pick one. The `BanListEditor`/`campaign_bans` system is the newer one with applicant-side validation; this BanListsSection is a legacy duplicate.

- **Severity:** High
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 570-688
- **Category:** Duplicate components or near-duplicates
- **Issue:** `BanListsSection` overlaps in scope with `BanListEditor.jsx` (same folder). They write to **different** tables/columns (`settings.banned_*` JSONB vs `campaign_bans` table) so picks made in one don't sync to the other. Applicant-side validation only checks one source.
- **Suggested approach:** Decide canonical store, migrate, delete the duplicate. Likely: keep `campaign_bans` (richer schema), remove `BanListsSection`.

- **Severity:** Medium
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 583
- **Category:** Performance
- **Issue:** Loads the **entire** SRD spell list to render a flat ban-toggle grid. ~500 spells with no virtualization, no search field, no level filter — UI freezes on slow devices and creates a long Tab cycle for keyboard users.
- **Suggested approach:** Add a search input + virtualization, or surface only top-N + a "more" affordance.

- **Severity:** Medium
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 300-311
- **Category:** Real-time/state sync issues
- **Issue:** `toggleInstalled` and `removeInstalled` mutations have no `onError` handlers — silent failures.

- **Severity:** Medium
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 50, 65, 117
- **Category:** Performance
- **Issue:** `clone(obj)` uses `JSON.parse(JSON.stringify(...))` — slow for large `homebrew_rules` JSONB and unsafe for non-JSON-serializable fields (Date, undefined, etc.). Called on every keystroke through `setPath`/`clearPath`.
- **Suggested approach:** Use `structuredClone()` (native, faster, handles more types) or a shallow per-path clone.

- **Severity:** Medium
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 257-282
- **Category:** Bug / race condition
- **Issue:** Optimistic update is good, but it cancels and writes via the `["campaign", campaignId]` query key — yet other parts of the codebase (e.g. CampaignPreviewPanel) use `["campaignPreviewBans", campaignId]` etc. Any cache that mirrors `homebrew_rules` won't reflect the optimistic write.
- **Suggested approach:** Either consolidate into a single `["campaign", id]` cache or duplicate the optimistic update.

- **Severity:** Medium
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 270
- **Category:** console.log / .error / .warn left in
- **Issue:** `console.error(err)` retained.

- **Severity:** Medium
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 367-374
- **Category:** Accessibility
- **Issue:** `<label>` wrapping `<span>{enabled ? "Enabled" : "Disabled"}</span>` + `<Switch>` lacks `htmlFor` / Switch `id`. Screen readers will read the visible text but not associate it with the switch state.
- **Suggested approach:** Use shadcn `Label htmlFor=` pattern.

- **Severity:** Medium
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 124
- **Category:** Bug / race condition
- **Issue:** `additional_effects: MODIFIABLE_RULES.combat.critical_hits.additional_effects` — if `MODIFIABLE_RULES` returns an object, multiple campaigns share the same array reference. A push into one campaign's effects mutates the catalog default.
- **Suggested approach:** Spread / clone the default before assigning.

- **Severity:** Low
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 318, 320, 344, 356, 394, 396, 409, 415, 507, 617, 637, 671
- **Category:** Brand color mismatches
- **Issue:** ~12 hex hardcodes.

- **Severity:** Low
- **File:** src/components/campaigns/HouseRulesPanel.jsx
- **Line:** 219-220
- **Category:** TODO / FIXME / HACK / XXX comments
- **Issue:** `// eslint-disable-next-line react-hooks/exhaustive-deps` — silent rule disable. The intent is documented immediately above, but worth flagging.

##### ImagePositionEditor.jsx

- **Severity:** High
- **File:** src/components/campaigns/ImagePositionEditor.jsx
- **Line:** 1-106
- **Category:** Accessibility
- **Issue:** Mouse-only interaction model — no touch handlers, no keyboard handlers, and no `role`/`aria-label` for the drag canvas. Mobile users (the majority of guildstew traffic per CLAUDE.md tier mix) can't reposition images, and keyboard users can't either.
- **Suggested approach:** Add touch (pointer events), arrow-key handlers, and ARIA roles. Replace bespoke drag with pointer events.

- **Severity:** High
- **File:** src/components/campaigns/ImagePositionEditor.jsx
- **Line:** 12-30
- **Category:** Bug / race condition
- **Issue:** Drag handlers attached to the inner container only. If the user drags fast enough to leave the container `onMouseLeave` fires and stops dragging mid-motion. Also no global mousemove listener — drag freezes when the cursor exits.
- **Suggested approach:** Use `onPointerDown` + `setPointerCapture` for robust drag handling.

- **Severity:** Medium
- **File:** src/components/campaigns/ImagePositionEditor.jsx
- **Line:** 33, 37
- **Category:** Hardcoded values that should be constants
- **Issue:** Zoom limits 3.0 and 0.5 + step 0.1 hardcoded inline.

- **Suggested approach:** Hoist as constants.

- **Severity:** Medium
- **File:** src/components/campaigns/ImagePositionEditor.jsx
- **Line:** 5-10
- **Category:** State management smells
- **Issue:** Component initializes state from props but never syncs back when `position`/`zoom` props change. If parent re-uses the editor for a different image (say switching campaigns), local state remains stuck on the prior values until unmount.
- **Suggested approach:** `useEffect` syncing local state on prop change, OR key the editor on `imageUrl` so React remounts it.

- **Severity:** Medium
- **File:** src/components/campaigns/ImagePositionEditor.jsx
- **Line:** 5-106
- **Category:** Dead code (unreferenced components/functions/files)
- **Issue:** Unclear if this component is currently referenced anywhere. `Save Position` button calls `onSave(position, zoom)` but nothing constrains where the values are persisted (storage path is the parent's concern).
- **Suggested approach:** Verify usage; if orphaned, delete.

- **Severity:** Low
- **File:** src/components/campaigns/ImagePositionEditor.jsx
- **Line:** 48, 99
- **Category:** Brand color mismatches
- **Issue:** `#1E2430`, `#37F2D1`, `#2dd9bd`.

##### MyApplicationsInbox.jsx

- **Severity:** Medium
- **File:** src/components/campaigns/MyApplicationsInbox.jsx
- **Line:** 41
- **Category:** Bug / race condition
- **Issue:** Filters by `user_id.eq.${user.id},applicant_id.eq.${user.id}` — the same dual-column ambiguity flagged in CampaignApplicationsPanel. PostgREST `.or()` with raw user input is risky if `user.id` ever contains commas/quotes (UUIDs don't, but the pattern is fragile).
- **Suggested approach:** Settle on one column DB-side; if both must be supported, use a SECURITY DEFINER RPC.

- **Severity:** Medium
- **File:** src/components/campaigns/MyApplicationsInbox.jsx
- **Line:** 54, 71
- **Category:** Performance
- **Issue:** Same `.sort()` mutating-array antipattern in two query keys.

- **Severity:** Medium
- **File:** src/components/campaigns/MyApplicationsInbox.jsx
- **Line:** 34-46, 53-64, 70-81
- **Category:** Performance
- **Issue:** Three sequential queries (apps → campaigns → GMs) — could be one RPC or `select` with foreign-table joins.
- **Suggested approach:** Use a single `.select("*, campaign:campaigns(*, gm:user_profiles!game_master_id(*))")` if RLS allows.

- **Severity:** Medium
- **File:** src/components/campaigns/MyApplicationsInbox.jsx
- **Line:** 134-149
- **Category:** Accessibility
- **Issue:** Native `<details>/<summary>` is fine semantically, but the summary text is `[10px] uppercase tracking-widest text-slate-500` — fails contrast at that size against `#1E2430`.
- **Suggested approach:** Bump contrast/size.

- **Severity:** Medium
- **File:** src/components/campaigns/MyApplicationsInbox.jsx
- **Line:** 59
- **Category:** Bug / race condition
- **Issue:** Selects `image_url` from campaigns — but other components in this folder read `cover_image_url` (CampaignCarousel:138, CampaignGrid:26). Likely column drift.
- **Suggested approach:** Settle on one column.

- **Severity:** Low
- **File:** src/components/campaigns/MyApplicationsInbox.jsx
- **Line:** 95, 142, 166, 176, 201, 211
- **Category:** Brand color mismatches
- **Issue:** ~7 hex hardcodes.

- **Severity:** Low
- **File:** src/components/campaigns/MyApplicationsInbox.jsx
- **Line:** 224-247
- **Category:** Hardcoded values that should be constants
- **Issue:** Status string set scattered across the file (`pending`, `rejected_character`, `rejected_player`, `accepted`, `auto_closed`); referenced as strings in 5 places.
- **Suggested approach:** Centralize as a `STATUS` enum / constant.

##### RecentCampaigns.jsx

- **Severity:** Medium
- **File:** src/components/campaigns/RecentCampaigns.jsx
- **Line:** 17
- **Category:** Bug / race condition
- **Issue:** Routes to `ActiveCampaign` page — but CampaignCarousel routes to `CampaignGMPanel`/`CampaignPanel` and CampaignGrid to `CampaignView`. Three different destination routes for the same campaign card across this folder.
- **Suggested approach:** Pick one canonical destination; very likely `ActiveCampaign` is legacy.

- **Severity:** Medium
- **File:** src/components/campaigns/RecentCampaigns.jsx
- **Line:** 1-37
- **Category:** Duplicate components or near-duplicates
- **Issue:** Card render block duplicates CampaignCarousel + CampaignGrid yet again — fourth campaign-card variant in this folder.
- **Suggested approach:** Extract shared `CampaignCard` component.

- **Severity:** Low
- **File:** src/components/campaigns/RecentCampaigns.jsx
- **Line:** 22
- **Category:** Hardcoded values that should be constants
- **Issue:** Same hardcoded Unsplash placeholder URL.

- **Severity:** Low
- **File:** src/components/campaigns/RecentCampaigns.jsx
- **Line:** 8
- **Category:** Brand color mismatches
- **Issue:** `#2A3441`.

- **Severity:** Low
- **File:** src/components/campaigns/RecentCampaigns.jsx
- **Line:** 32-34
- **Category:** Bug / race condition
- **Issue:** Empty-state rendered AFTER the grid wrapper — when `campaigns` is empty, the `<div className="grid">` still renders (empty), and the empty-state appears below it. Minor visual oddity.

##### permissions.jsx

- **Severity:** High
- **File:** src/components/campaigns/permissions.jsx
- **Line:** 1-132
- **Category:** Inconsistent file naming / Dead code
- **Issue:** File is `.jsx` but exports zero JSX — pure helpers. Should be `.js` (or `.ts` post-migration). Also: this file lives under `components/` but contains domain logic that belongs in `lib/` or `domain/`.
- **Suggested approach:** Rename to `permissions.js` and consider moving to `src/lib/campaignPermissions.js` so non-component callers don't pull a `.jsx` file.

- **Severity:** High
- **File:** src/components/campaigns/permissions.jsx
- **Line:** 24
- **Category:** Inconsistent file naming
- **Issue:** Reads `campaign.co_dm_ids` (uses "DM") but exports `CO_GM` role constants and uses "GM" everywhere else. Project documents the term as "GM" — yet the database column appears to be `co_dm_ids`. Either rename the column or document the discrepancy.
- **Suggested approach:** Settle on GM / DM nomenclature project-wide.

- **Severity:** Medium
- **File:** src/components/campaigns/permissions.jsx
- **Line:** 17-37, 87-96, 101-131
- **Category:** Permission gating
- **Issue:** All checks are client-side; nothing here gates the SERVER side. RLS policies must mirror these rules — and any drift means a player can call the API directly with a forged role. No reference to RLS guards elsewhere.
- **Suggested approach:** Add a comment pointing at the RLS policies; verify policies cover each `canX` here.

- **Severity:** Medium
- **File:** src/components/campaigns/permissions.jsx
- **Line:** 112, 118
- **Category:** Hardcoded values that should be constants
- **Issue:** Section-name string lists `['settings', 'player_management', 'gm_notes']` are duplicated in both branches with subtle differences (mole list excludes `gm_notes`).
- **Suggested approach:** Hoist to module-level `const` arrays and document the difference.

- **Severity:** Medium
- **File:** src/components/campaigns/permissions.jsx
- **Line:** 9, 28-30
- **Category:** Domain
- **Issue:** "MOLE" role concept exists in code but isn't documented in CLAUDE.md / domain rules block. If this is the spy-PC mechanic, callers might forget moles bypass normal player gates.
- **Suggested approach:** Document the mole role in domain notes.

- **Severity:** Low
- **File:** src/components/campaigns/permissions.jsx
- **Line:** 1-132
- **Category:** Dead code (unreferenced components/functions/files)
- **Issue:** Need to verify whether all 6 exported `canX` helpers are actually called. `canArchiveOrDelete`/`canManagePlayers` may be unused given the existing components do their own checks (or skip them entirely — see DeleteCampaignDialog flag above).

#### /src/components/campaigns/create/

##### CampaignBasicInfo.jsx

- **Severity:** Critical
- **File:** src/components/campaigns/create/CampaignBasicInfo.jsx
- **Line:** 2, 26
- **Category:** Base44 leftovers / DOMAIN: Storage path violations
- **Issue:** Cover image upload uses `base44.integrations.Core.UploadFile({ file })` — Base44 storage path. Not only is this a Base44 dependency, it bypasses the documented Supabase storage convention `users/{user_id}/campaigns/{campaign_id}/`. The `file_url` returned is whatever Base44 produces — not under user-scoped storage.
- **Suggested approach:** Replace with Supabase storage upload to `users/{user_id}/campaigns/{campaign_id}/cover-{ts}.ext`.

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignBasicInfo.jsx
- **Line:** 28-30
- **Category:** Bug / race condition
- **Issue:** Upload error swallowed: `console.error("Failed to upload image:", error)` with no toast/UI feedback. User sees the upload spinner stop but no "image" appears, leaving them unsure if it worked.
- **Suggested approach:** Add a toast.error and surface a retry.

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignBasicInfo.jsx
- **Line:** 87-105
- **Category:** Accessibility
- **Issue:** Hidden file input is triggered by clicking a `<Button>` inside a `<label>`. Clicking the button fires `document.getElementById('cover-upload').click()` AND the browser's native label-click; depending on event order this can double-trigger the picker. Plus: nesting `<button>` inside `<label>` is invalid HTML.
- **Suggested approach:** Use either a label-with-htmlFor pattern OR an onClick handler — not both. Move the button outside the label.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignBasicInfo.jsx
- **Line:** 9-15
- **Category:** Hardcoded values that should be constants
- **Issue:** `AVAILABLE_TAGS` (20 strings) and the 3-tag cap inline (`>= 3` repeated 3×) hardcoded. Tag list should live with the campaign domain (probably already does in CLAUDE.md or a constants file).
- **Suggested approach:** Move to `@/utils/campaignTags.js` + `MAX_CAMPAIGN_TAGS = 3`.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignBasicInfo.jsx
- **Line:** 67-77
- **Category:** Hardcoded values that should be constants
- **Issue:** Game system list ("Dungeons and Dragons 5e", "Aetheneum", "Pathfinder 2nd Edition") hardcoded. CLAUDE.md mentions D&D 5e migration plus Aetheneum — these should be a constant exported alongside system-routing logic.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignBasicInfo.jsx
- **Line:** 92, 127
- **Category:** Brand color mismatches
- **Issue:** `text-[#2A3441]` on a Button with no contrasting bg means the upload button reads as gray-on-dark. Likely a leftover from a flipped color scheme.

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignBasicInfo.jsx
- **Line:** 29
- **Category:** console.log / .error / .warn left in

##### CampaignConsent.jsx

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignConsent.jsx
- **Line:** 57-66
- **Category:** Bug / race condition
- **Issue:** `useEffect` watches `data.consent_checklist` only. If `data.consent_rating` updates from elsewhere (parent) but checklist hasn't, the auto-bump won't re-run. Also: missing `onChange`/`data.consent_rating` from deps — eslint-react-hooks would flag.
- **Suggested approach:** Add `data.consent_rating` to dep list (or move logic to a derived value, not effect).

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignConsent.jsx
- **Line:** 45-55
- **Category:** Bug / race condition
- **Issue:** `calculateMinimumRating` only inspects items where `rating === "green"` — but the comment "Click each item to set its rating. Green = Allowed, Yellow = Handle with care, Red = Not allowed" implies green = allowed at the table. The calc reads as "if user marked an explicit-content item GREEN, force minimum rating up". That's correct intent, but the loop returns at the first hit — it doesn't escalate to RED if a later item triggers it.
- **Suggested approach:** Trace through: if first matched item is in `RATING_TRIGGERS.orange` it returns "orange" even when a later item is in `RATING_TRIGGERS.red`. Should iterate all items, track highest, and return.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignConsent.jsx
- **Line:** 7-15
- **Category:** Hardcoded values that should be constants
- **Issue:** `RATING_TRIGGERS` content list is hardcoded HERE — but the actual `ConsentChecklist` component renders its own list of items (not visible). Drift: a checklist item not present here gets no rating bump even if it should.
- **Suggested approach:** Co-locate trigger metadata with the canonical checklist source.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignConsent.jsx
- **Line:** 81-85, 99
- **Category:** Hardcoded values that should be constants
- **Issue:** Hardcoded `⚠️` emojis in user-facing copy. With `Only use emojis if the user explicitly requests it` rule on this codebase, these should be lucide icons (already imported at top of other files).

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignConsent.jsx
- **Line:** 86, 98, 127
- **Category:** Brand color mismatches
- **Issue:** `#1E2430`, `#FF5722`, `#2A3441`.

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignConsent.jsx
- **Line:** 126
- **Category:** Accessibility
- **Issue:** Rating selection buttons rely on bg color + ring for selected-state. No `aria-pressed`/`aria-selected`. Color-blind/keyboard users can't tell which is selected.
- **Suggested approach:** Use `<RadioGroup>` (already in the codebase) or add `aria-pressed`.

##### CampaignDetails.jsx

- **Severity:** Critical
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 2, 21
- **Category:** Base44 leftovers / DOMAIN: Storage path violations
- **Issue:** Same `base44.integrations.Core.UploadFile` pattern. Same storage-path violation. Plus: uploaded URLs are stored only in local state (`uploadedImages`) — they're never sent up to the parent via `onChange`, so the images **vanish on next step**.
- **Suggested approach:** Replace with Supabase upload + persist URLs onto `data.gallery_image_urls` via `onChange`.

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 13, 22
- **Category:** State management smells
- **Issue:** Local `uploadedImages` state is component-private — any user navigation back to this step (or page refresh) loses the upload list. The parent wizard (`CreateCampaign`?) cannot persist this data.
- **Suggested approach:** Lift state to the wizard via `onChange({ gallery_images: ... })`.

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 1-191
- **Category:** Duplicate components or near-duplicates
- **Issue:** This step duplicates `description`, `world_lore`, `homebrew_rules`, `notes`, and image gallery — but `CampaignInformationStep.jsx` (Step 1) ALSO renders a `description` Textarea. So the same field is editable in two places, with the wizard likely overwriting one with the other. Also `homebrew_rules` here is a Quill HTML string while `HouseRulesPanel` writes a JSONB rules object — same column, two incompatible shapes.
- **Suggested approach:** Critical schema/UX decision. Pick one canonical home for each field. The Quill homebrew flow appears to be legacy.

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 159-188
- **Category:** Inline styles that should be Tailwind/CSS
- **Issue:** `<style jsx global>` block — but this is a Vite + React project (not Next.js). Without `styled-jsx` configured, this will render as raw `<style>` in the DOM with `jsx`/`global` as unknown attributes. The CSS may still apply (browsers render unknown-attr `<style>`), but the React warnings/no-op behavior is undefined.
- **Suggested approach:** Move the Quill overrides to `src/index.css` or a per-component `.module.css`.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 8-9
- **Category:** Performance
- **Issue:** Eagerly imports `react-quill` + its CSS at the top of the wizard step. This pulls in a large dependency on initial wizard render even before the user navigates here.
- **Suggested approach:** Dynamic import (`React.lazy` + `Suspense`) for the Quill editor.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 23, 24
- **Category:** Bug / race condition
- **Issue:** Same swallowed-error + no-toast pattern as CampaignBasicInfo.

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 24
- **Category:** console.log / .error / .warn left in

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignDetails.jsx
- **Line:** 52, 67, 75, 90, 105, 126
- **Category:** Brand color mismatches

##### CampaignHomebrewStep.jsx

- **Severity:** Critical
- **File:** src/components/campaigns/create/CampaignHomebrewStep.jsx
- **Line:** 7, 22-24
- **Category:** Base44 leftovers
- **Issue:** Brewery list fetched via `base44.entities.HomebrewRule.filter`. Combined with the catalog read in HouseRulesPanel and the Brewery folder elsewhere, this constitutes a substantial migration debt.
- **Suggested approach:** Replace with Supabase `homebrew_rules` query.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignHomebrewStep.jsx
- **Line:** 23, 30, 37
- **Category:** Hardcoded values that should be constants
- **Issue:** Three hardcoded magic numbers: 100 (catalog page size), 30 (filter result cap). These cap the visible catalog at 100 brews and silently truncates filter results to 30 — probably surprising behavior.
- **Suggested approach:** Use server-side search + pagination, or hoist the constants.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignHomebrewStep.jsx
- **Line:** 28-38
- **Category:** Performance
- **Issue:** Filtering happens client-side on a 100-row dataset. For larger libraries this becomes expensive; but more importantly, the catalog is effectively limited to the most-recent 100 by the server cap. Search misses anything older.
- **Suggested approach:** Server-side search (PostgREST `ilike`).

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignHomebrewStep.jsx
- **Line:** 53, 73, 93, 95, 109
- **Category:** Brand color mismatches
- **Issue:** ~8 hex hardcodes.

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignHomebrewStep.jsx
- **Line:** 90-114
- **Category:** Accessibility
- **Issue:** Selection toggle button has no `aria-pressed`. Selected state only signaled by ring + Check icon.

##### CampaignInformationStep.jsx

- **Severity:** High
- **File:** src/components/campaigns/create/CampaignInformationStep.jsx
- **Line:** 18-32
- **Category:** Duplicate components or near-duplicates
- **Issue:** Renders a Description textarea AND mounts `CampaignBasicInfo` (which doesn't have description) AND mounts `CampaignConsent` — but `CampaignDetails.jsx` (Step 3 of the wizard?) also renders a description editor on its Description tab. Two separate textareas writing to `data.description`. Whichever step is visited last wins.
- **Suggested approach:** Keep description in exactly one step.

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignInformationStep.jsx
- **Line:** 30
- **Category:** Brand color mismatches

##### CampaignSettingsStep.jsx

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignSettingsStep.jsx
- **Line:** 79, 86, 92
- **Category:** Hardcoded values that should be constants
- **Issue:** Default max_players (6), the player range `[2..8]`, and the "+ 1 GM per campaign" text duplicate the cap logic in `CampaignPreviewPanel:50`. Centralize.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignSettingsStep.jsx
- **Line:** 38-46
- **Category:** Inconsistent file naming / Tailwind issues
- **Issue:** Uses a native `<select>` for session day but a Radix `<Select>` for time. Same form, two different control libraries — visual + a11y mismatch.
- **Suggested approach:** Use the Radix Select for both.

- **Severity:** Medium
- **File:** src/components/campaigns/create/CampaignSettingsStep.jsx
- **Line:** 102-105
- **Category:** Accessibility
- **Issue:** "Open recruitment" Switch has no `id` / `htmlFor` association with its Label. Same Label-Switch pairing problem flagged repeatedly.

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignSettingsStep.jsx
- **Line:** 30, 41, 53, 56, 70, 82
- **Category:** Brand color mismatches
- **Issue:** ~7 hex hardcodes (`#1E2430`, `#2A3441`, `#0b1220`, `#37F2D1`, `#1a1f2e`).

- **Severity:** Low
- **File:** src/components/campaigns/create/CampaignSettingsStep.jsx
- **Line:** 50, 51
- **Category:** Hardcoded values that should be constants
- **Issue:** Sentinel string `"__none"` in two places to encode "no value" because Radix Select can't hold an empty string. Project-wide pattern? Hoist to a constant.


##### Batch 1A-iii-a Summary

**Files audited:** 20 (14 in `/src/components/campaigns/`, 6 in `/src/components/campaigns/create/`).

**Findings by severity:**

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High     | 36 |
| Medium   | 51 |
| Low      | 39 |
| Cosmetic | 0 |

**Findings by category (top buckets):**

| Category | Count |
|----------|-------|
| Brand color mismatches | 21 |
| Base44 leftovers | 7 |
| Hardcoded values that should be constants | 17 |
| Bug / race condition | 12 |
| Real-time/state sync issues | 9 |
| Accessibility | 14 |
| Performance | 9 |
| Duplicate components or near-duplicates | 6 |
| State management smells | 3 |
| console.log / .error / .warn left in | 8 |
| Permission gating | 4 |
| Broken or unused imports | 2 |
| Dead code | 4 |
| Inconsistent file naming | 3 |
| Inline styles that should be Tailwind/CSS | 2 |
| Domain (storage path / column drift / guild conflation) | 5 |
| Semantic HTML / heading hierarchy | 2 |
| Tailwind issues | 1 |
| TODO/FIXME/HACK | 1 |
| Prop validation / inconsistent prop usage | 2 |

(Some findings cross-categorize — categories chosen by primary impact.)

**Top systemic issues for THIS batch:**

1. **The campaign-create wizard and HouseRulesPanel are still Base44-bound.** All four upload flows + the brewery catalog read + the homebrew_rules write path go through `base44.integrations.Core.UploadFile` and `base44.entities.*`. If Base44 is decommissioned, campaign creation, image upload, and house-rule editing all break in the same window. Storage uploads also bypass the documented `users/{user_id}/campaigns/{campaign_id}/` Supabase convention.

2. **Two parallel ban systems and two parallel homebrew-rules shapes.** `BanListEditor.jsx` writes to `campaign_bans`; `HouseRulesPanel.BanListsSection` writes to `campaigns.settings.banned_*` JSONB. `HouseRulesPanel` writes structured JSONB to `campaigns.homebrew_rules` while `CampaignDetails.jsx` (create wizard) writes Quill HTML to the same column. Applicant-side validation only checks one source — so picks made in the legacy panels silently don't enforce.

3. **Four near-duplicate campaign-card render blocks** (CampaignCarousel, CampaignGrid, RecentCampaigns, plus the apply-flow tile) with three different destination routes (`CampaignGMPanel`/`CampaignPanel`, `CampaignView`, `ActiveCampaign`). Same card, three pages. Worth a single `CampaignCard` component before another card variant lands.

4. **Mutation `onError` handlers missing in 11 locations** across BreweryModsPanel, CampaignCarousel, DeleteCampaignDialog, HouseRulesPanel, CampaignBasicInfo, CampaignDetails. Server / RLS rejection produces no user feedback — users believe their action succeeded.

5. **Schema column ambiguity bleeds into UI code.** `user_id || applicant_id`, `title || name`, `image_url` vs `cover_image_url`, `equipment` vs `inventory`, `description` vs `campaign_description`, `co_dm_ids` (DM) vs `CO_GM` (GM constants). Six unresolved column drifts being papered over with `||` fallbacks. Each is a future bug magnet.

6. **Permission gating skipped client-side in three places** (BanListEditor, CampaignApplicationsPanel, DeleteCampaignDialog). Components rely on RLS for authorization and don't short-circuit-render for non-GMs — buttons are visible and fire mutations that fail at the server.

7. **Race conditions in client-driven priority/optimistic flows.** BreweryModsPanel reorder is non-atomic; HouseRulesPanel's optimistic update keys on `["campaign", id]` while its sibling components use different cache keys; CampaignApplyFlow's `setTimeout` fires after unmount.

8. **Accessibility gaps repeated across the folder:** Switch/Label disconnect (no `htmlFor`), tabs that aren't `role="tablist"` (BanListEditor), card-as-div with `onClick` and no keyboard fallback (CampaignCarousel, CampaignApplyFlow tiles), drag canvas with no touch/keyboard support (ImagePositionEditor), missing `aria-pressed`/`aria-selected` on toggle buttons (CampaignConsent rating cards, CampaignHomebrewStep selection).


### Batch 1A-iii-b: session + GM + player views

#### /src/components/session/

##### `SessionModal.jsx`

- **Severity:** High
- **File:** src/components/session/SessionModal.jsx
- **Line:** 30-48
- **Category:** Accessibility
- **Issue:** Modal renders as a plain `<div>` — no `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby` pointing at the `<h2>`, and no focus trap. Initial focus also is not moved into the modal, so keyboard users stay on the page underneath. The Escape handler exists but the rest of the dialog accessibility contract is missing.
- **Suggested approach:** Replace with the existing shadcn `Dialog` primitive (Radix) which provides aria attributes, focus trap, focus return, and Escape handling out of the box; or wrap the existing markup with the same primitives manually.

- **Severity:** Medium
- **File:** src/components/session/SessionModal.jsx
- **Line:** 32
- **Category:** Accessibility
- **Issue:** Backdrop `<div>` with `onClick={onClose}` is not keyboard-reachable and has no `role="button"` / `aria-label`. The Escape handler covers keyboard users but assistive tech reading the backdrop sees nothing.
- **Suggested approach:** Either keep the backdrop as a presentational click target while documenting Escape as the keyboard equivalent, or use the Radix Dialog overlay which handles this.

- **Severity:** Medium
- **File:** src/components/session/SessionModal.jsx
- **Line:** 33
- **Category:** Tailwind issues / Hardcoded values
- **Issue:** Arbitrary Tailwind values `w-[80vw] h-[80vh]` plus hardcoded color `bg-[#0f1219]`. Comment above the component says "90vw × 85vh" but the JSX is "80vw × 80vh" — comment and code drifted.
- **Suggested approach:** Move panel sizing into theme/utility classes (or a Dialog variant) and lift the surface color into the design-token layer; update the docblock to match the actual sizes.

- **Severity:** Low
- **File:** src/components/session/SessionModal.jsx
- **Line:** 33-35
- **Category:** Brand color mismatches
- **Issue:** `#0f1219` and `border-slate-700` instead of documented `#1B2535` / brand surface. (Counted: 2 brand-color hits in this file.)
- **Suggested approach:** Replace with brand surface tokens once the design decision lands.

##### `content/AdventuringPartyContent.jsx`

- **Severity:** High
- **File:** src/components/session/content/AdventuringPartyContent.jsx
- **Line:** 4, 33, 40, 46
- **Category:** Base44 leftovers
- **Issue:** Reads characters, NPCs, and (notably) the entire UserProfile list through `base44.entities.*`. The Supabase migration target replaces these calls; leaving the modal on Base44 means it will dark when the legacy adapter is decommissioned.
- **Suggested approach:** Migrate to Supabase queries via the canonical client; scope profile fetches to participants of this campaign.

- **Severity:** High
- **File:** src/components/session/content/AdventuringPartyContent.jsx
- **Line:** 38-42
- **Category:** Performance
- **Issue:** `useQuery({ queryKey: ["allUserProfiles"], queryFn: () => base44.entities.UserProfile.list() })` pulls *every* user profile in the system to resolve at most a handful of party members. Scales linearly with site users.
- **Suggested approach:** Filter by the campaign's player_ids (or join through participants) and key the query on campaignId; never list-all profiles client-side.

- **Severity:** High
- **File:** src/components/session/content/AdventuringPartyContent.jsx
- **Line:** 53-56
- **Category:** Bug / Domain — column drift
- **Issue:** `playerCharacters = characters.filter((c) => c.name)` silently swallows characters whose name lives on `c?.stats?.name` — inconsistent with `PartyRow` which already accepts `c.race || c?.stats?.race`. Members who only have a stats-level name are dropped from the party list.
- **Suggested approach:** Pick one canonical column (most likely top-level `name`) and write a one-shot migration; until then mirror the same fallback used in PartyRow.

- **Severity:** Medium
- **File:** src/components/session/content/AdventuringPartyContent.jsx
- **Line:** 51
- **Category:** Permission gating
- **Issue:** GM detection runs through `isUserGM(campaign, user?.id)` but there's no early-return when `user` or `campaign` is undefined; a brief un-authed render shows the panel as not-GM, which then flickers to GM once auth resolves. There's also no check that the viewer is a member of the campaign at all — anyone with the modal mounted sees every character + relationships graph for non-owned chars when `isGM` resolves true via stale data.
- **Suggested approach:** Render a loading state until `user` and `campaign` are both ready; gate the entire pane on `isMember(campaign, user)` first, then differentiate GM vs player capabilities.

- **Severity:** Medium
- **File:** src/components/session/content/AdventuringPartyContent.jsx
- **Line:** 99-119
- **Category:** Accessibility
- **Issue:** TabsList uses shadcn primitives (good), but icons inside each TabsTrigger have no `aria-hidden` and the trigger label is plain text — screen readers will read both the icon glyph (lucide adds an `aria-hidden` by default — good) and the text. More importantly, `flex-wrap h-auto` produces a multi-row tab list with no visual indicator of grouping; consider also that the "Relationships" tab disappears for non-GM/non-owners which can shift focus mid-session.
- **Suggested approach:** Verify lucide icons receive `aria-hidden`; keep relationships tab rendered but `disabled` (with title) so the tab order doesn't shift between viewers.

- **Severity:** Medium
- **File:** src/components/session/content/AdventuringPartyContent.jsx
- **Line:** 100, 103, 106, 110, 114, 117, 176, 184, 192, 195
- **Category:** Brand color mismatches
- **Issue:** 10 inline `#37F2D1` references plus dark surfaces (`#050816`, `#0b1220`, `#1e293b`). (Counted: 13 brand-color hits in this file.)
- **Suggested approach:** Migrate to brand tokens.

- **Severity:** Low
- **File:** src/components/session/content/AdventuringPartyContent.jsx
- **Line:** 183
- **Category:** Accessibility
- **Issue:** `<img alt="">` on character portrait. Decorative-empty alt is defensible because the character name is rendered next to it, but the `<img>` has no `loading="lazy"` either; for a long roster on a slow connection this matters.
- **Suggested approach:** Add `loading="lazy"` and a width/height to prevent CLS.

##### `content/CampaignArchivesContent.jsx`

- **Severity:** High
- **File:** src/components/session/content/CampaignArchivesContent.jsx
- **Line:** 5-10
- **Category:** Performance
- **Issue:** Six full Page components are imported eagerly at module load (`CampaignNPCs`, `CampaignItems`, `CampaignMonsters`, `CampaignSpells`, `CampaignAbilities`, `CampaignWorldLore`). Whenever the session modal mounts, every compendium page (and its dependency tree — Quill, dice, etc.) is in the bundle even though the modal might never open Archives.
- **Suggested approach:** Convert each `Component` reference to `React.lazy(() => import(...))` and wrap the rendered `<Page />` in `<Suspense>`.

- **Severity:** High
- **File:** src/components/session/content/CampaignArchivesContent.jsx
- **Line:** 5-10, 77
- **Category:** State management smells / Architectural concern
- **Issue:** Importing route-level pages from `src/pages/*` into a component is a circular-architecture smell — pages are normally consumers of components, not the other way around. Also, the pages must accept an `embedded` prop and switch their layout — that prop wires modal-specific concerns into routes.
- **Suggested approach:** Extract the actual content panes from each page into shared sub-components under `src/components/compendium/*` and have both the routes and this modal consume them, instead of routing the modal through page-level shells.

- **Severity:** Medium
- **File:** src/components/session/content/CampaignArchivesContent.jsx
- **Line:** 39-55
- **Category:** Accessibility
- **Issue:** Section landing card `<button>`s have correct `type="button"` but no `aria-label`; the description text is small and provides context but is not associated via `aria-describedby`. Grid is `grid-cols-3` with no responsive fallback for narrow modals.
- **Suggested approach:** Add `aria-label` per section button (or rely on `<h3>` if associated via `aria-labelledby`); use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

- **Severity:** Low
- **File:** src/components/session/content/CampaignArchivesContent.jsx
- **Line:** 47-49
- **Category:** Brand color mismatches
- **Issue:** `bg-[#1a1f2e]` surface and `text-[#37F2D1]` icon. (Counted: 2 brand-color hits.)
- **Suggested approach:** Migrate to brand tokens.

##### `content/CampaignSettingsContent.jsx`

- **Severity:** High
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 5, 46
- **Category:** Base44 leftovers
- **Issue:** Every save goes through `base44.entities.Campaign.update`. This panel is the live in-session settings editor and will brown out when Base44 is decommissioned.
- **Suggested approach:** Migrate to a Supabase mutation against `campaigns` keyed on `game_master_id`.

- **Severity:** High
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** entire file
- **Category:** Permission gating / GM-only leak
- **Issue:** The component performs no client-side check that the viewer is the campaign owner or a co-DM before exposing the mutate-everything UI. A non-GM with this modal route open (e.g. dev-tool tinkering, a leaked link, or a routing bug) sees all settings switches and fires update mutations that rely entirely on RLS to reject. The mole picker even leaks the player_ids list.
- **Suggested approach:** Short-circuit render with a "GM only" placeholder when `campaign.game_master_id !== user.id && !campaign.co_dm_ids?.includes(user.id)`; the parent modal also should not open this content for non-GM viewers.

- **Severity:** High
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 55, 59, 64, 213
- **Category:** Domain — column drift / Co-DM vs Co-GM nomenclature
- **Issue:** Field is `co_dm_ids` everywhere here, but the wider codebase has been mixing `co_dm_ids` with a `CO_GM` constant (flagged in the previous batch summary). UI label literally reads "Co-DM / Co-GM" — confirming the naming is unresolved.
- **Suggested approach:** Pick one (`co_gm_ids` to match the GM terminology used everywhere else) and migrate; update the UI label to match.

- **Severity:** Medium
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 28, 38, 138-145
- **Category:** Domain — guild systems
- **Issue:** Toggle is named `guild_hall_enabled` and labeled "Guild Hall & Training" — this is the in-campaign minigame `guild_halls` (correct) but no comment makes that clear; future code-readers may conflate with the subscription `guilds` table. Worth a domain comment given the active conflation risk flagged for this batch.
- **Suggested approach:** Add a single-line comment documenting that this controls the in-campaign `guild_halls` minigame, not the subscription `guilds` table.

- **Severity:** Medium
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 79
- **Category:** Domain — column drift
- **Issue:** `consent_rating || campaign_rating` fallback — same pattern called out in the Batch 1A-iii-a summary. Two columns persist in production data.
- **Suggested approach:** Migrate the legacy `campaign_rating` column into `consent_rating` and drop the `||`.

- **Severity:** Medium
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 35-43
- **Category:** Bug / state sync
- **Issue:** `useEffect` resets local state only on `campaign?.id` change. If the GM switches a setting in another tab/window, the live realtime payload updates `campaign.session_day` but the local state in this component does not re-sync because the id is identical, leaving stale toggles visible.
- **Suggested approach:** Either drive the controls directly off `campaign.*` (no local state) since every onChange immediately mutates server-side anyway, or include the relevant fields in the dependency array.

- **Severity:** Medium
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 50-52, 58-72
- **Category:** Real-time / state sync
- **Issue:** All four mutations only invalidate `["campaign", campaignId]`. The campaign object also feeds queries keyed on `["campaigns", "byUser", ...]`, `["campaign", "session", id]`, etc. (per the patterns elsewhere in the codebase) — those will not refresh.
- **Suggested approach:** Either invalidate by predicate (`predicate: (q) => q.queryKey[0] === "campaign"`) or list every key explicitly.

- **Severity:** Low
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 74-77
- **Category:** Hardcoded values that should be constants
- **Issue:** Fallback display `Player ${String(uid).slice(0, 4)}` is a UX shrug — silently truncated UUIDs surface to GMs. Also an i18n risk.
- **Suggested approach:** Either ensure profiles list is always present (parent should pass `allUserProfiles` non-empty) or render "Unknown player" with a warn-once console call gated behind dev mode.

- **Severity:** Low
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 21
- **Category:** Hardcoded values that should be constants
- **Issue:** Local `DAYS` array re-declared in many places across the codebase (also in QuickNotes-adjacent and scheduling code).
- **Suggested approach:** Lift to a shared constant alongside `TIME_OPTIONS` in `src/utils/sessionTime`.

- **Severity:** Low
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** `#37F2D1`, `#050816`, `#0f1219`, `#1a1f2e`. (Counted: ~12 brand-color hits.)
- **Suggested approach:** Migrate to brand tokens.

- **Severity:** Low
- **File:** src/components/session/content/CampaignSettingsContent.jsx
- **Line:** 86
- **Category:** Tailwind issues
- **Issue:** `grid-cols-2` with no responsive breakpoints inside an 80vw modal means on narrow screens the day/time selects squeeze.
- **Suggested approach:** `grid-cols-1 sm:grid-cols-2`.

##### `content/QuickNotesContent.jsx`

- **Severity:** High
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 5, 88, 94, 103, 129
- **Category:** Base44 leftovers
- **Issue:** Both `Campaign.update` and `WorldLoreEntry.create` go through `base44.entities.*`. Worse, the WorldLoreEntry creation path will not respect Supabase RLS once migrated unless the call signature is preserved.
- **Suggested approach:** Rewrite as Supabase mutations; pre-validate visibility / category on the server.

- **Severity:** High
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** entire file
- **Category:** Permission gating / GM-only leak
- **Issue:** No GM check anywhere. Notes are stored under `campaigns.settings.quick_notes` — meaning a non-GM with this content mounted can write GM-private notes into the campaign's settings JSONB and create world-lore entries on behalf of the campaign. There is also no membership check.
- **Suggested approach:** Gate the panel render on GM/co-GM; the parent SessionModal opener should also refuse to open it for non-GMs.

- **Severity:** High
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 69-91
- **Category:** Bug / race condition
- **Issue:** Save mutation does an unconditional read-modify-write of the entire `quick_notes` array on `campaigns.settings`. If two tabs (or the GM and a co-GM) save concurrently, the later write wipes the earlier one — no `updated_at` check, no PATCH semantics, no array-merge on the server.
- **Suggested approach:** Move quick notes to their own table with row-level keys, OR write a Supabase RPC that merges into the JSONB array atomically using `jsonb_set` / `jsonb_array_append`.

- **Severity:** High
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 50-55
- **Category:** Domain — column drift
- **Issue:** Reads from `campaign?.settings?.quick_notes` then falls back to `campaign?.gm_quick_notes`. Same dual-shape problem flagged for HouseRulesPanel in the prior batch — JSONB-in-settings vs top-level column.
- **Suggested approach:** One-shot migration that copies legacy `gm_quick_notes` into `settings.quick_notes` and drop the column; remove the fallback.

- **Severity:** Medium
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 100, 109
- **Category:** Domain — column drift
- **Issue:** Sets `created_by: user?.id`, but the canonical campaign-owner column is `game_master_id`. WorldLoreEntry's `created_by` may be correct for that table, but the mix is worth verifying — there's no consistent author column across entities.
- **Suggested approach:** Verify the WorldLoreEntry schema; if its author column has been renamed, update accordingly.

- **Severity:** Medium
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 248
- **Category:** Accessibility
- **Issue:** `confirm("Delete this note?")` uses `window.confirm` — not screen-reader-friendly, not stylable, blocks the entire window.
- **Suggested approach:** Use the project's existing AlertDialog primitive.

- **Severity:** Medium
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 220-222
- **Category:** Accessibility
- **Issue:** Visibility option labels include leading emoji (`🔒 GM Only`, `🌍 Public`, `👁️ Selected`) as the only way to communicate state. Screen readers read the emoji name (which can be inconsistent across platforms) and there is no textual prefix for SR users.
- **Suggested approach:** Pair the emoji with `aria-hidden` icons + plain text, or use lucide icons with explicit labels.

- **Severity:** Low
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 39-41
- **Category:** Hardcoded values that should be constants
- **Issue:** `makeId` reinvents an id-generator. Codebase elsewhere uses `crypto.randomUUID()` and/or `nanoid`.
- **Suggested approach:** Replace with `crypto.randomUUID()`.

- **Severity:** Low
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** 8 inline `#0f1219`, `#1a1f2e`, `#37F2D1` references. (Counted: 8.)
- **Suggested approach:** Migrate to brand tokens.

- **Severity:** Low
- **File:** src/components/session/content/QuickNotesContent.jsx
- **Line:** 173-181
- **Category:** Performance
- **Issue:** `note.content?.slice(0, 120)` runs every render of the list; for many notes it's negligible but combined with `divide-y` and per-row state highlighting, the list rerenders on every keystroke in the editor (because draft state lives in the same component).
- **Suggested approach:** Memoize the note list (`useMemo`) keyed on `savedNotes` and `draft.id`, or split the editor into a child component to localize re-renders.

#### /src/components/gm/

##### `ActionBar.jsx`

- **Severity:** High
- **File:** src/components/gm/ActionBar.jsx
- **Line:** 8-14
- **Category:** Dead code / unfinished feature
- **Issue:** Hard-coded fallback HP (34/52), AC (13), initiative (+2), speed (30) shipped as "demo defaults" if `character` is missing fields. `spellIcons = Array(12).fill(null)` is explicitly labeled "Mock spell icons - replace with actual character spells". This component looks like a designer-prototype that was wired up without finishing the data plumbing.
- **Suggested approach:** Either (a) gate the component behind a "character is fully loaded" precondition and render skeleton on missing data, or (b) remove the hardcoded defaults so missing data renders blanks; in both cases wire the spell row to the character's actual spell list.

- **Severity:** High
- **File:** src/components/gm/ActionBar.jsx
- **Line:** 4
- **Category:** Domain — GM/Player permission leak (HIGH priority)
- **Issue:** This file lives under `/components/gm/` but renders an action bar that visually mirrors a *player* character sheet (HP, spell slots, action buttons). There's no GM-only/Player-only branching; the file's location implies GM but the contents are player-controls. If the player view also imports this, a non-owner GM can inadvertently fire actions on a player's character; if it's only for GM, the component is in the wrong folder.
- **Suggested approach:** Confirm consumer (GM page or player page); move into `/components/character/` if shared, or `/components/player/` if player-only. Add an `isOwner` / `canEdit` prop and gate the buttons.

- **Severity:** High
- **File:** src/components/gm/ActionBar.jsx
- **Line:** 83-104, 110-125
- **Category:** Accessibility
- **Issue:** Every action button is an icon-only `<button>` with a glyph (`♪`, `▶`, etc.) and **no `aria-label`, no `type="button"`, no tooltip text, no keyboard hint**. Spell slot buttons use literal Unicode glyphs as content. None of these buttons have `onClick` handlers either, so they're decorative-but-focusable.
- **Suggested approach:** Add `type="button"`, `aria-label`, and either wire up real handlers or remove the buttons until the feature is implemented; convert the glyphs to lucide icons with `aria-hidden`.

- **Severity:** Medium
- **File:** src/components/gm/ActionBar.jsx
- **Line:** 11
- **Category:** Bug / division by zero
- **Issue:** `(currentHp / maxHp) * 100` — if `maxHp === 0` (edge case, unconscious creature, dehydrated NPC), this divides by zero and sends `Infinity` / `NaN` into `style.width` and the `hpBarColor` threshold function.
- **Suggested approach:** Guard with `maxHp > 0 ? ... : 0`.

- **Severity:** Low
- **File:** src/components/gm/ActionBar.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** Inline hex colors `#050b18`, `#141b30`, `#252b3d`, `#343a4f`, `#1c2340`, `#0ea5e9`, `#020617`, `#38bdf8`, `#111827`, `#1f2937`. (Counted: ~15 brand-color hits.)
- **Suggested approach:** Migrate to brand tokens.

- **Severity:** Cosmetic
- **File:** src/components/gm/ActionBar.jsx
- **Line:** 13
- **Category:** TODO/FIXME/HACK
- **Issue:** `// Mock spell icons - replace with actual character spells` — explicit unfinished-work marker.
- **Suggested approach:** Tracked in the dead-code finding above.

##### `CampaignLog.jsx`

- **Severity:** High
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 2, 30, 36, 78
- **Category:** Base44 leftovers
- **Issue:** Polled live chat reads/writes go through `base44.entities.CampaignLogEntry`. Live chat is the highest-traffic component in a session — if Base44 sunsets, every active table breaks at once.
- **Suggested approach:** Migrate to Supabase realtime channels; replace 5s polling with a `postgres_changes` subscription.

- **Severity:** High
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 26-47
- **Category:** Bug / Domain — column drift
- **Issue:** Defensive try/catch falls back from `created_date` to `created_at`, swallowing errors silently if both fail. Code in the file then sorts/orders by `entry.created_date` (lines 353, 387, 459) — if the schema is on `created_at`, the timestamps will render as "Invalid date" via moment but no error fires. Inline comment at lines 22-25 admits this is a known issue.
- **Suggested approach:** Pick the canonical column (`created_at` matches Postgres/Supabase convention), do a one-shot rename if needed, remove the fallback. Same drift was flagged in earlier batches.

- **Severity:** High
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 54
- **Category:** Domain — column drift / wrong join key
- **Issue:** `characters?.find(c => c.created_by === currentUser?.email)` — joins characters to the user via `email`. Email is mutable, can be re-used after deletion, and is not the canonical user FK. The character should be located by `user_id` against `currentUser.id`.
- **Suggested approach:** Match on `c.user_id === currentUser.id`; if `created_by` is the only field that exists, migrate it to a UUID FK.

- **Severity:** High
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 63
- **Category:** Domain — column drift
- **Issue:** `characters?.find(c => c.created_by === userProfile?.email || entry.character_id === c.id)` — same email-join hazard PLUS using `||` in find means a stale email match can shadow the explicit `character_id` correlation.
- **Suggested approach:** Match strictly on `entry.character_id === c.id` first, then fall back to user FK; never fall back to email.

- **Severity:** High
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 134-147
- **Category:** Domain — GM/Player permission leak (HIGH priority)
- **Issue:** Visibility filter is **purely client-side**. `is_gm_only` and `is_whisper` rows are still fetched from the server and only hidden in JS — anyone with React DevTools or a network tap reads the full feed. Whisper privacy is broken.
- **Suggested approach:** Filter on the server (RLS policy that checks the requesting user's id against `whisper_target_ids`/`is_gm_only` + GM membership). The client filter should be a defense-in-depth layer, not the only layer.

- **Severity:** High
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 49-51
- **Category:** Domain — Co-DM nomenclature
- **Issue:** `isGM` evaluates true for either GM or co-DM, then `isCoGM` is computed but never used. Worse, `isGM` becomes a boolean that conflates two distinct roles — breaks any future "true GM only" gate that needs to differentiate.
- **Suggested approach:** Rename: `isOwner` for game_master_id match, `isCoGM` for co-DM, `isGMOrCoGM` for either. Drop the unused `isCoGM` until needed.

- **Severity:** High
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 26-47
- **Category:** Performance / Real-time/state sync issues
- **Issue:** Polls every 5s, retries 2× with 5s delay on failure. The query also fetches the entire log every poll — for an active campaign with thousands of entries, this is hundreds of KB/poll/user.
- **Suggested approach:** Switch to Supabase realtime subscription on inserts; paginate initial load to last N entries.

- **Severity:** Medium
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 38, 87
- **Category:** console.log / .error / .warn left in
- **Issue:** Two `console.error` calls in production paths.
- **Suggested approach:** Pipe through the project's logger or remove; toast already covers UX-level reporting.

- **Severity:** Medium
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 99-117
- **Category:** Bug / race condition
- **Issue:** `handleSendMessage` clears `setMessage("")` only in `onSuccess`, but the input is not disabled while pending — typing during a slow request can race with the `setMessage("")` clear and silently drop characters.
- **Suggested approach:** Disable the input while `createEntryMutation.isPending`, or clear optimistically before the network round trip.

- **Severity:** Medium
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 215-249
- **Category:** Bug / layout
- **Issue:** The "scroll to bottom" floating button uses `absolute bottom-16 right-4` but the parent has no `relative` positioning context — it positions against the nearest ancestor with `position: relative`, which may be the modal root. Probably renders in the wrong corner.
- **Suggested approach:** Add `relative` to the outer flex column.

- **Severity:** Medium
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 5
- **Category:** Performance
- **Issue:** Imports the full `moment` library (~290KB unminified). Date format is trivial ("h:mm A" / "MM/DD/YYYY h:mm A").
- **Suggested approach:** Replace with `date-fns` (already a tree-shakable dep elsewhere) or native `Intl.DateTimeFormat`.

- **Severity:** Medium
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 220
- **Category:** Bug
- **Issue:** `onScroll` reads `e.target` — in React, this is the DOM element; works, but `setAutoScroll` fires on every scroll event without throttling, causing a re-render per scroll-pixel.
- **Suggested approach:** Throttle, or use `requestAnimationFrame` with a memoized callback.

- **Severity:** Medium
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 192-212, 256-303
- **Category:** Accessibility
- **Issue:** Filter pills and whisper/GM-only toggles are `<button>`s with no `aria-pressed` for their on/off state. Whisper recipient picker uses a native `<select>` with `text-purple-200` on `bg-[#111827]` — color contrast risk. The whisper indicator marker `(whisper)` and `(GM only)` rely on color (purple/amber) only.
- **Suggested approach:** Add `aria-pressed`, ensure WCAG AA contrast on the select, add a non-color glyph for the whisper/GM marker.

- **Severity:** Medium
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 343, 378
- **Category:** Accessibility
- **Issue:** Avatar `<img alt="">` plus `?` placeholder character — for users without an avatar, screen readers announce nothing and sighted readers see `?`.
- **Suggested approach:** Use `alt={displayName}` or a textual fallback; `?` should be `aria-hidden` with a `sr-only` "no avatar" label.

- **Severity:** Low
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** ~22 inline brand-mismatch hex colors (`#22c5f5` cyan variant, `#0a1628`, `#111827`, `#1e293b`, `#1a1f2e`, `#38bdf8`).
- **Suggested approach:** Migrate to brand tokens.

- **Severity:** Low
- **File:** src/components/gm/CampaignLog.jsx
- **Line:** 282
- **Category:** Hardcoded values that should be constants
- **Issue:** Same `Player ${String(p.user_id).slice(0, 4)}` UUID-truncation fallback as CampaignSettingsContent — duplicate logic.
- **Suggested approach:** Extract a shared `displayPlayerName(profile, uid)` helper.

##### `CharacterSelector.jsx`

- **Severity:** High
- **File:** src/components/gm/CharacterSelector.jsx
- **Line:** 130-309
- **Category:** Duplicate components or near-duplicates
- **Issue:** This component is a self-built modal with its own backdrop, focus rules, and embedded `<style>` block — duplicates the existing `SessionModal.jsx` and the shadcn Dialog primitive. Three different modal implementations now ship.
- **Suggested approach:** Reuse the shadcn Dialog or SessionModal; lift the search/filter UI into the body.

- **Severity:** High
- **File:** src/components/gm/CharacterSelector.jsx
- **Line:** entire file
- **Category:** Accessibility
- **Issue:** Custom modal has no `role="dialog"`/`aria-modal`/focus trap; close button (line 136-141) has no `aria-label`; the X icon is unnamed; backdrop click closes via `onClick` on the parent without ESC handler at all. Filter pill button (180) doesn't expose `aria-pressed` for its toggle state. Empty-state graphics use literal emoji `👹` / `👤` (line 340-341).
- **Suggested approach:** Switch to the shadcn Dialog (free a11y), label icon-only buttons, replace emoji with lucide icons.

- **Severity:** Medium
- **File:** src/components/gm/CharacterSelector.jsx
- **Line:** 7-42
- **Category:** Hardcoded values that should be constants
- **Issue:** `CR_OPTIONS`, `SIZE_OPTIONS`, `TYPE_OPTIONS` are duplicates of similar arrays in the bestiary/compendium code (CampaignMonsters page).
- **Suggested approach:** Hoist into `src/constants/dnd.js` (or wherever the dnd5e static lives) and import.

- **Severity:** Medium
- **File:** src/components/gm/CharacterSelector.jsx
- **Line:** 50, 52
- **Category:** Bug
- **Issue:** `parseInt(num) / parseInt(denom)` — no radix arg (lint warning), and no zero-denominator check; a malformed CR like `"1/0"` would yield Infinity.
- **Suggested approach:** `parseInt(num, 10)` and guard `denom > 0`.

- **Severity:** Medium
- **File:** src/components/gm/CharacterSelector.jsx
- **Line:** 291-306
- **Category:** Inline styles that should be Tailwind/CSS / Duplicate components
- **Issue:** Inline `<style>{...}` block re-declares `.custom-scrollbar` rules that are already declared in `index.css`/global stylesheet (the same class is used in CombatQueue.jsx without a local declaration, confirming a global already exists). Duplicate scoped styles.
- **Suggested approach:** Remove the local `<style>` block; rely on the global definition.

- **Severity:** Medium
- **File:** src/components/gm/CharacterSelector.jsx
- **Line:** 311-374
- **Category:** Domain — column drift
- **Issue:** `CharacterCard` reads `character.image_url || character.avatar_url`, `character.challenge_rating ?? character.cr`, `stats.hit_points` which can be a number OR object. The component is papering over four different schemas in one render path.
- **Suggested approach:** Normalize at the data-loader edge so every monster/NPC has a consistent `imageUrl`, `cr`, `hp` shape.

- **Severity:** Low
- **File:** src/components/gm/CharacterSelector.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** ~15 inline `#22c5f5`, `#37F2D1`, `#050816`, `#1a1f2e`, `#111827`, `#0b1220`, `#38bdf8`.
- **Suggested approach:** Migrate to brand tokens.

##### `CombatQueue.jsx`

- **Severity:** Critical
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 20-33, 81
- **Category:** Bug / race condition
- **Issue:** `markMonsterEncountered` does a read-modify-write on `campaigns.encountered_monsters` with no concurrency control. Two players in two tabs adding two different monsters simultaneously will silently lose one of the entries (last write wins). The fire-and-forget `.catch(() => {})` swallows even the lost write.
- **Suggested approach:** Use a Supabase RPC or `array_append` with a single SQL update; never read-modify-write JSONB/array columns from the client.

- **Severity:** High
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 8, 23, 30
- **Category:** Base44 leftovers
- **Issue:** Reads/writes `campaigns.encountered_monsters` through `base44.entities.Campaign`. Combat queue is the highest-traffic GM surface — a Base44 outage breaks combat.
- **Suggested approach:** Migrate to Supabase.

- **Severity:** High
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 44, 58-61
- **Category:** Real-time/state sync issues
- **Issue:** Combat queue lives in `localStorage` only. If the GM has the campaign open on two devices (laptop + tablet at the table), the queues diverge. There is also no realtime broadcast to players — they cannot see what's queued without server state.
- **Suggested approach:** Move combat queue to a server table (`combat_state`) with Supabase realtime; the localStorage fallback is acceptable as offline cache only.

- **Severity:** High
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 35-296
- **Category:** Permission gating / Domain — GM-only leak
- **Issue:** No GM check anywhere. Component receives `campaignId` and mutates campaign state. Same defense-only-via-RLS posture flagged across this batch.
- **Suggested approach:** Gate render on `campaign.game_master_id === user.id || co_dm_ids.includes(user.id)`.

- **Severity:** High
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 103
- **Category:** Bug / id collision
- **Issue:** `queueId: Date.now() + i` — when adding a quantity of monsters in a tight loop, `Date.now()` returns the same millisecond for adjacent iterations and only `i` distinguishes them. If a second batch is added the same millisecond from a different click, ids can collide.
- **Suggested approach:** `crypto.randomUUID()`.

- **Severity:** High
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** entire file
- **Category:** Accessibility (HIGH for combat/initiative interactions)
- **Issue:** Combat is the most keyboard-frequented UI in the app; here:
  - The combatant tile (lines 191-252) is a `<div>` with hover-only edit/remove buttons — invisible & unreachable via keyboard.
  - The hover tooltip (lines 246-251) shows the combatant's name; without hover, screen-reader/keyboard users have no name affordance.
  - Faction badge color (lines 235-243) is the only signal of friend/foe — color-only encoding.
  - All custom dialogs lack focus trap, role=dialog, aria-modal, aria-labelledby.
  - Many icon-only buttons (X, ChevronLeft/Right, Package, Trash2) lack `aria-label`.
- **Suggested approach:** Convert combatant tile to `<button>`, expose name as visible label or `aria-label`, add a non-color glyph for faction, switch dialogs to shadcn Dialog.

- **Severity:** Medium
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 47-55
- **Category:** console.log / .error / .warn left in
- **Issue:** `console.error("Failed to parse saved loadouts", e)` runs at module-init for any user with a corrupt localStorage entry — noisy in production.
- **Suggested approach:** Pipe through logger; fall back silently.

- **Severity:** Medium
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 5
- **Category:** Inconsistent file naming
- **Issue:** Imports `./monsterEnrichment` (lowercase) but the file is `monsterEnrichment.jsx` while sibling React component files use PascalCase. Non-component utility file with a `.jsx` extension is misleading.
- **Suggested approach:** Rename to `.js`; or move the helper out of `/components/gm/` into `/utils/`.

- **Severity:** Medium
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 67, 359-361
- **Category:** Hardcoded values that should be constants
- **Issue:** `12` (max queue size) and `visibleCount = 6` are duplicated in three places (cap, scroll math, UI label). Quantity max also pinned at 12 in the input.
- **Suggested approach:** Lift to `MAX_QUEUE_SIZE` constant.

- **Severity:** Medium
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 297-528, 530-777
- **Category:** State management smells / Component size
- **Issue:** `AddMonsterDialog` and `EditLoadoutDialog` are 230 + 250 lines and live inline. Each owns its own state and search logic. The file is 778 lines in total.
- **Suggested approach:** Split into separate files; consider extracting common dialog frame.

- **Severity:** Medium
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 549-555
- **Category:** Bug
- **Issue:** `monster.inventory.find(i => i.name === item.name)` — name-as-key collides for items with duplicate names but different magic properties (e.g. two "Longsword" entries with different enchantments). Stacks unrelated items.
- **Suggested approach:** Compare on `id` (or `id || name`).

- **Severity:** Low
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** 544-547
- **Category:** Performance
- **Issue:** `Object.keys(spellDetails)` and `.filter().slice(0,30)` reruns each render — full keys array build on every keystroke.
- **Suggested approach:** Wrap in `useMemo` keyed on `spellSearch`.

- **Severity:** Low
- **File:** src/components/gm/CombatQueue.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** ~30 inline brand-mismatch hex colors (`#050816`, `#22c5f5`, `#37F2D1`, `#0b1220`, `#111827`, `#1a1f2e`, `#22c55e`, `#38bdf8`).
- **Suggested approach:** Migrate to brand tokens.

##### `CustomCompanionApprovalDialog.jsx`

- **Severity:** High
- **File:** src/components/gm/CustomCompanionApprovalDialog.jsx
- **Line:** 15, 129
- **Category:** Base44 leftovers
- **Issue:** Writes companion data through `base44.entities.Character.update`. Critical session path (gates combat participation).
- **Suggested approach:** Migrate to Supabase.

- **Severity:** High
- **File:** src/components/gm/CustomCompanionApprovalDialog.jsx
- **Line:** 104-141
- **Category:** Bug / race condition
- **Issue:** Read-modify-write on `character.companions` JSONB array — same anti-pattern as CombatQueue and QuickNotes. If the player edits the companion (e.g. renames it) while the GM approves stats in another tab, one write wipes the other.
- **Suggested approach:** Use a Supabase RPC that updates a single companion entry atomically (`jsonb_set` keyed by index/uuid).

- **Severity:** Medium
- **File:** src/components/gm/CustomCompanionApprovalDialog.jsx
- **Line:** 68
- **Category:** Domain — column drift
- **Issue:** `playerName: char.created_by || ""` — same email-as-FK pattern flagged for CampaignLog. `created_by` here is the character creator's email, not their user id; the field shouldn't be repurposed as `playerName`.
- **Suggested approach:** Resolve through `userProfile.user_id === char.user_id` and read the username.

- **Severity:** Medium
- **File:** src/components/gm/CustomCompanionApprovalDialog.jsx
- **Line:** 127-128
- **Category:** Domain — index-based JSONB key fragility
- **Issue:** `companionIndex` is captured when the dialog opens, then used to write back to `newCompanions[editing.companionIndex]`. If the player deletes / reorders companions on their side while the dialog is open, the index points at the wrong companion (overwriting an unrelated one).
- **Suggested approach:** Match by `companion.id` (UUID added at creation) rather than array index.

- **Severity:** Medium
- **File:** src/components/gm/CustomCompanionApprovalDialog.jsx
- **Line:** 138
- **Category:** console.log / .error / .warn left in
- **Issue:** `console.error("Custom companion save", err);` — production log noise.

- **Severity:** Low
- **File:** src/components/gm/CustomCompanionApprovalDialog.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** ~6 inline `#1E2430`, `#050816` references and amber-hardcoded buttons.
- **Suggested approach:** Use brand tokens.

##### `GMSessionSidebar.jsx`

- **Severity:** Medium
- **File:** src/components/gm/GMSessionSidebar.jsx
- **Line:** 32-79
- **Category:** Accessibility
- **Issue:** Sidebar uses `<aside>` (good) but the section list is plain `<button>`s with no `aria-current="page"` on the active item. `nav` (line 58) wraps the buttons but has no `aria-label` differentiating it from other nav landmarks. `End Session` button has a destructive action with `title=` only — no confirmation prompt either, accidentally clickable.
- **Suggested approach:** Add `aria-current="true"` on active button, `aria-label="Session tools"` on `<nav>`, and require a confirm/AlertDialog on End Session.

- **Severity:** Low
- **File:** src/components/gm/GMSessionSidebar.jsx
- **Line:** 32, 69
- **Category:** Brand color mismatches
- **Issue:** `bg-[#1a1f2e]`, `bg-[#37F2D1]/10 text-[#37F2D1]`. Counted: 3.
- **Suggested approach:** Brand tokens.

##### `GMSidebarAchievements.jsx`

- **Severity:** High
- **File:** src/components/gm/GMSidebarAchievements.jsx
- **Line:** 5, 34, 45
- **Category:** Base44 leftovers
- **Issue:** Reads achievement catalog and writes new Achievement rows via `base44.entities.Achievement`.
- **Suggested approach:** Migrate to Supabase.

- **Severity:** High
- **File:** src/components/gm/GMSidebarAchievements.jsx
- **Line:** 30-40
- **Category:** Bug / silent failure
- **Issue:** `try { … } catch { return []; }` swallows all errors with no log. If the table doesn't exist or RLS rejects the request, the component silently uses `DEFAULT_ACHIEVEMENTS` and the GM thinks the catalog is empty.
- **Suggested approach:** Surface errors via toast or a banner; only fall back to defaults when the result is genuinely empty.

- **Severity:** High
- **File:** src/components/gm/GMSidebarAchievements.jsx
- **Line:** 82
- **Category:** Domain — column drift
- **Issue:** Same `c.user_id === uid || c.created_by === profile?.email` email-as-FK fallback flagged across the batch.
- **Suggested approach:** Centralize "find character for player" in a helper that uses user_id only.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarAchievements.jsx
- **Line:** entire file
- **Category:** Permission gating
- **Issue:** No GM check — relies on the parent rendering only for GMs. The grant mutation has no client-side ownership assertion.
- **Suggested approach:** Add an explicit early-return for non-GM viewers.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarAchievements.jsx
- **Line:** 44-58
- **Category:** Real-time/state sync
- **Issue:** `onSuccess` invalidates the achievement catalog, but the player's *earned* achievements live elsewhere (probably keyed differently). Players will not see the grant until their feed re-polls — and the comment at line 14 says "next poll", confirming a polling model.
- **Suggested approach:** Switch to Supabase realtime, or invalidate the player-side query key as well.

- **Severity:** Low
- **File:** src/components/gm/GMSidebarAchievements.jsx
- **Line:** 135-141
- **Category:** Hardcoded values that should be constants
- **Issue:** `DEFAULT_ACHIEVEMENTS` is scaffolding ("until the achievement store lands" per the inline comment) — should be tracked or removed.
- **Suggested approach:** File a follow-up; consider sourcing from an SRD-style catalog file.

##### `GMSidebarPartyPanel.jsx`

- **Severity:** High
- **File:** src/components/gm/GMSidebarPartyPanel.jsx
- **Line:** 2, 13
- **Category:** Base44 leftovers
- **Issue:** `Character.filter` via base44.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarPartyPanel.jsx
- **Line:** 23
- **Category:** Domain — column drift
- **Issue:** Same email-as-FK fallback `c.user_id === uid || c.created_by === profile?.email`.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarPartyPanel.jsx
- **Line:** 25-27
- **Category:** Bug
- **Issue:** `current = Number(hp.current ?? hp.max ?? 0)` — when `hp.current` is missing, falls back to `hp.max`, displaying a full HP bar for characters with no recorded current HP. That misleads the GM at the table.
- **Suggested approach:** Explicit "no HP recorded" state when `current` is undefined; don't fall back to max.

- **Severity:** Low
- **File:** src/components/gm/GMSidebarPartyPanel.jsx
- **Line:** 47
- **Category:** Accessibility
- **Issue:** Avatar `<img alt="">` is acceptable since the name is rendered next to it, but the connection-status dot at line 53-58 uses color + `title=` only — color-blind users have no other signal.
- **Suggested approach:** Add a small icon (Wifi/WifiOff) or text suffix.

##### `GMSidebarPlayers.jsx`

- **Severity:** High
- **File:** src/components/gm/GMSidebarPlayers.jsx
- **Line:** 2, 23, 29, 35
- **Category:** Base44 leftovers
- **Issue:** Two-step Base44 mutation: campaign `player_ids` update + best-effort character `active_session_id` clear. Critical session-lifecycle path.
- **Suggested approach:** Wrap into a single Supabase RPC that atomically kicks the player and releases their character lock.

- **Severity:** High
- **File:** src/components/gm/GMSidebarPlayers.jsx
- **Line:** 19-45
- **Category:** Bug / race condition
- **Issue:** Read-modify-write of `player_ids` and `disconnected_players` arrays; concurrent kicks (e.g. GM and co-GM both kicking different players) will overwrite each other.
- **Suggested approach:** Server-side RPC with array operations.

- **Severity:** High
- **File:** src/components/gm/GMSidebarPlayers.jsx
- **Line:** 28-38
- **Category:** Bug / silent failure / Domain — session lifecycle
- **Issue:** Empty `try { /* ignore */ } catch { /* ignore */ }` plus `.catch(() => {})` per character lock release means kicked players may retain stale session locks. The session-lifecycle migration (20261022_session_lifecycle.sql) presumably depends on accurate `active_session_id`; silent failure here violates that contract.
- **Suggested approach:** Surface errors; treat lock-release failure as a partial failure with a toast warning.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarPlayers.jsx
- **Line:** 77
- **Category:** Accessibility
- **Issue:** `confirm()` window prompt — same a11y issue as QuickNotesContent. Destructive "Kick" action should use AlertDialog.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarPlayers.jsx
- **Line:** 61
- **Category:** Domain — column drift
- **Issue:** Email-as-FK fallback again.

##### `GMSidebarQuickNotes.jsx`

- **Severity:** Critical
- **File:** src/components/gm/GMSidebarQuickNotes.jsx
- **Line:** 8, 14, 20, 27
- **Category:** Domain — column drift / Duplicate components
- **Issue:** This file persists notes to `campaigns.gm_quick_notes` (top-level column, single string textarea). The session modal `QuickNotesContent.jsx` persists to `campaigns.settings.quick_notes` (JSONB array of structured notes). These are TWO completely different data shapes both labeled "Quick Notes" in the GM UI. Whichever one the GM types into doesn't appear in the other. The QuickNotesContent file actually reads `gm_quick_notes` as a legacy fallback (lines 50-55 of that file) but only tolerates it as an Array — a sidebar-saved string would fail the `Array.isArray` check and silently disappear.
- **Suggested approach:** Pick one model. The structured JSONB array is richer; the sidebar's free-text textarea should be deleted or migrated to render the same array (read-only summary?).

- **Severity:** High
- **File:** src/components/gm/GMSidebarQuickNotes.jsx
- **Line:** 2, 27
- **Category:** Base44 leftovers
- **Issue:** Direct base44 update of campaign.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarQuickNotes.jsx
- **Line:** 8-10, 22-35
- **Category:** Bug
- **Issue:** Comment at line 8 says "debounced save so the GM can jot without thinking about a save button" — but there's no debounced save in the code; only a manual button. Comment misrepresents behavior.
- **Suggested approach:** Either implement the debounce (preferred for the UX described) or fix the comment.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarQuickNotes.jsx
- **Line:** 19-21
- **Category:** Bug / state sync
- **Issue:** `useEffect` only re-seeds when `campaign?.id` changes — same stale-state bug as CampaignSettingsContent. If a co-GM saves notes, the local state here won't update.
- **Suggested approach:** Watch `campaign?.gm_quick_notes`; or render directly off the prop.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarQuickNotes.jsx
- **Line:** entire file
- **Category:** Permission gating
- **Issue:** No GM gate.

##### `GMSidebarSettings.jsx`

- **Severity:** Critical
- **File:** src/components/gm/GMSidebarSettings.jsx
- **Line:** 30, 48-54
- **Category:** Domain — column drift / Duplicate components
- **Issue:** Persists house rules to `campaign.settings.house_rules` (free text). The full Campaign Settings page wires HouseRulesPanel to `campaigns.homebrew_rules` (structured JSONB) per the prior batch summary, AND `CampaignDetails.jsx` writes Quill HTML to that same column. This file adds a THIRD location/shape: `settings.house_rules`. Three separate places for "house rules" data.
- **Suggested approach:** Pick one column + shape. Probably collapse `settings.house_rules` into `homebrew_rules` and migrate.

- **Severity:** Critical
- **File:** src/components/gm/GMSidebarSettings.jsx
- **Line:** 87
- **Category:** Domain — column drift
- **Issue:** `consentRating = campaign?.campaign_rating || campaign?.consent_rating` — same column drift as CampaignSettingsContent BUT the order is reversed (`campaign_rating` is preferred here, `consent_rating` there). Two GM-facing settings panels disagree on which is the primary source.
- **Suggested approach:** Pick one canonical column, migrate, drop the fallback.

- **Severity:** Critical
- **File:** src/components/gm/GMSidebarSettings.jsx
- **Line:** entire file
- **Category:** Duplicate components or near-duplicates
- **Issue:** This file and `content/CampaignSettingsContent.jsx` are 75%+ overlapping — same Co-DM, Mole, Day/Time controls, with slightly different layout, slightly different field set, and disagreeing column choices. Keeping both invites bug drift.
- **Suggested approach:** Consolidate into one component; the sidebar can render a compact variant via a `density` prop.

- **Severity:** High
- **File:** src/components/gm/GMSidebarSettings.jsx
- **Line:** 5, 44
- **Category:** Base44 leftovers
- **Issue:** `base44.entities.Campaign.update` for every save.

- **Severity:** High
- **File:** src/components/gm/GMSidebarSettings.jsx
- **Line:** 48-54
- **Category:** Bug / race condition
- **Issue:** House-rules save spreads `...(campaign?.settings || {})` with the *current* `houseRules` state. If a co-GM edits a different settings field concurrently, that change is overwritten by this save's stale settings spread.
- **Suggested approach:** Either move house_rules to its own column (cleanest) or use a Supabase RPC that merges into `settings` server-side.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarSettings.jsx
- **Line:** 36-41
- **Category:** Bug / state sync
- **Issue:** Same `campaign?.id`-keyed effect — won't re-seed on field-level realtime updates.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarSettings.jsx
- **Line:** 26
- **Category:** Hardcoded values that should be constants
- **Issue:** `DAYS` array re-declared (third occurrence in this batch).

##### `GMSidebarUpdates.jsx`

- **Severity:** High
- **File:** src/components/gm/GMSidebarUpdates.jsx
- **Line:** 3, 29, 37
- **Category:** Base44 leftovers
- **Issue:** `CampaignUpdate` reads/writes through base44.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarUpdates.jsx
- **Line:** 7
- **Category:** Domain — column drift
- **Issue:** `update?.created_at || update?.created_date` — same `created_at`/`created_date` drift seen across this batch.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarUpdates.jsx
- **Line:** 27-34
- **Category:** Bug / silent failure
- **Issue:** `.catch(() => [])` swallows all errors. RLS rejection or schema problems silently render an empty "Recent" list.
- **Suggested approach:** Surface a tiny error banner; toast on failure.

- **Severity:** Medium
- **File:** src/components/gm/GMSidebarUpdates.jsx
- **Line:** entire file
- **Category:** Permission gating
- **Issue:** No GM check.

- **Severity:** Low
- **File:** src/components/gm/GMSidebarUpdates.jsx
- **Line:** 71
- **Category:** Bug
- **Issue:** Validation runs only after the click handler — no `aria-invalid` or visible field-level validation on title/content inputs.
- **Suggested approach:** Disable submit until both fields have content; mark required.

##### `equipmentRules.jsx`

- **Severity:** Medium
- **File:** src/components/gm/equipmentRules.jsx
- **Line:** 1
- **Category:** Inconsistent file naming / dead extension
- **Issue:** File is named `.jsx` but contains zero JSX. Sibling utility `monsterEnrichment.jsx` has the same problem.
- **Suggested approach:** Rename to `equipmentRules.js`; or, since these are utilities, move out of `/components/gm/` into `/utils/` or `/components/dnd5e/`.

- **Severity:** Medium
- **File:** src/components/gm/equipmentRules.jsx
- **Line:** 1-15
- **Category:** Hardcoded values that should be constants
- **Issue:** Big keyword arrays (sword/axe/dagger/etc.) duplicate dnd5e item taxonomy that should live alongside the SRD item data.
- **Suggested approach:** Move to `src/components/dnd5e/equipmentTaxonomy.js`.

- **Severity:** Low
- **File:** src/components/gm/equipmentRules.jsx
- **Line:** 17-37
- **Category:** Performance
- **Issue:** Matching uses `.some(kw => itemName.includes(kw))` per slot per item — fine for small calls, but `monsterEnrichment` calls it inside a `.forEach` per item per monster. Loadout dialog can call it 50+ times per render.
- **Suggested approach:** Pre-compile a `Set` for category/type lookups; keyword fuzzy matching is unavoidable.

##### `monsterEnrichment.jsx`

- **Severity:** Critical
- **File:** src/components/gm/monsterEnrichment.jsx
- **Line:** 50
- **Category:** Base44 leftovers / Storage path violation
- **Issue:** Hardcoded fallback URL `https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/.../2bbbf582f_2.png` — this is a base44.app CDN URL that **will 404 once Base44 is decommissioned**. Used as the default item icon when itemIcons lookup misses.
- **Suggested approach:** Self-host the fallback icon under `/public/` or `/src/assets/`; never link to a third-party CDN that's mid-decommission.

- **Severity:** High
- **File:** src/components/gm/monsterEnrichment.jsx
- **Line:** 1-220
- **Category:** Inconsistent file naming
- **Issue:** `.jsx` extension on a pure-JS file (no JSX); also duplicated above.

- **Severity:** Medium
- **File:** src/components/gm/monsterEnrichment.jsx
- **Line:** 105-110
- **Category:** Bug
- **Issue:** Two `parseInt(levelMatch[1])` calls without a radix — minor lint/correctness warning.

- **Severity:** Medium
- **File:** src/components/gm/monsterEnrichment.jsx
- **Line:** 178-200
- **Category:** Bug
- **Issue:** Auto-equip logic for melee weapons sets `equipped = true` even when both `weapon1` and `weapon2` slots are full and `tryEquip` returned false (line 198). The boolean is overwritten unconditionally, so the item ends up in equipped-flag-true state but never actually equipped.
- **Suggested approach:** Mirror the ranged branch: `equipped = tryEquip('weapon1') || tryEquip('weapon2');`.

- **Severity:** Low
- **File:** src/components/gm/monsterEnrichment.jsx
- **Line:** 205, 209
- **Category:** Bug
- **Issue:** `Object.values(newEquipped).some(eq => eq.name === item.name)` — same name-as-key collision noted in CombatQueue (different items with the same name dedupe each other).

##### `LootManager.jsx`

- **Severity:** Critical
- **File:** src/components/gm/LootManager.jsx
- **Line:** 134-294
- **Category:** Bug / race condition
- **Issue:** `executeDistribution` runs N parallel `base44.entities.Character.update` calls (one per recipient). If any one fails partway through, partial loot has already landed on some characters and there's no rollback — only a toast. The "audit" lives client-side and only persists when `handleSave` writes to the campaign. So the GM can crash mid-distribution and end up with a half-distributed pool plus no audit to retract.
- **Suggested approach:** Wrap the entire distribution in a Supabase RPC / transaction that updates every character + the campaign in a single atomic operation; the audit then becomes a server-side log.

- **Severity:** Critical
- **File:** src/components/gm/LootManager.jsx
- **Line:** 165-181, 195-197, 215-222
- **Category:** Bug / race condition
- **Issue:** Read-modify-write pattern on `char.currency` and `char.inventory` JSONB — using the *cached* `char.currency` and `char.inventory` from the prop. If the player's character has been edited since the panel last loaded, this update silently overwrites those edits.
- **Suggested approach:** Server-side RPC that does `currency = currency + delta` rather than client-side `+`.

- **Severity:** High
- **File:** src/components/gm/LootManager.jsx
- **Line:** 5, 166, 181, 197, 222, 321, 332
- **Category:** Base44 leftovers
- **Issue:** Heavy Character.update usage through Base44.

- **Severity:** High
- **File:** src/components/gm/LootManager.jsx
- **Line:** 299-348
- **Category:** Bug
- **Issue:** `retractDistribution` `Promise.all(promises).catch(...)` runs the database-roll-back after `handleSave(false, ...)` updates local state. If the rollback fails, the UI says "loot retracted" while the players' characters still have the loot. State and server diverge.
- **Suggested approach:** Await the promises before flipping the local distributed flag; show the failure to the GM if any character.update rejects.

- **Severity:** High
- **File:** src/components/gm/LootManager.jsx
- **Line:** 173-184
- **Category:** Bug
- **Issue:** Random distribution picks the same player for every iteration when `Math.random()` produces close values — but more importantly, when `random_items` runs without `split_gold_evenly`, gold piles up in `finalCurrency` and never gets distributed to anyone. The branching logic combines toggles in confusing ways; commented "manual distribution" path is the catch-all but is only triggered when `!split_gold_evenly OR (!random_items && items.length>0)`.
- **Suggested approach:** Spell out a state machine for the four toggle combinations and add tests.

- **Severity:** High
- **File:** src/components/gm/LootManager.jsx
- **Line:** 374
- **Category:** Bug / id collision
- **Issue:** `Math.random().toString(36).substr(2, 9)` for item ids — `.substr` is deprecated, and 9-char base36 ids collide on a few-thousand-entry pool (birthday paradox). Items with colliding ids confuse the manual-distribution `itemDist` map (line 631).
- **Suggested approach:** `crypto.randomUUID()`.

- **Severity:** High
- **File:** src/components/gm/LootManager.jsx
- **Line:** entire file
- **Category:** Permission gating
- **Issue:** No GM gate. A non-GM with this component mounted can fire Character.updates against every player's currency and inventory.

- **Severity:** High
- **File:** src/components/gm/LootManager.jsx
- **Line:** entire file
- **Category:** Accessibility
- **Issue:** Custom modals (CRTreasurePicker, ManualDistributionModal, ItemSelectorModal) — no `role="dialog"`, no focus trap, X button without aria-label, color-only currency styling (orange-700 for cp, slate-200 for pp), TogglePill doesn't expose `aria-pressed`.
- **Suggested approach:** Switch dialogs to shadcn Dialog primitive.

- **Severity:** Medium
- **File:** src/components/gm/LootManager.jsx
- **Line:** 236, 338
- **Category:** console.log / .error / .warn left in
- **Issue:** Two `console.error` calls.

- **Severity:** Medium
- **File:** src/components/gm/LootManager.jsx
- **Line:** 32-42
- **Category:** Bug
- **Issue:** `rollTreasureExpr` regex `^(\d+)d(\d+)(?:\*(\d+))?$` doesn't support modifiers (`+2`, `-1`) — fine for the current treasure tables but brittle as a "tiny dice parser".

- **Severity:** Medium
- **File:** src/components/gm/LootManager.jsx
- **Line:** 16-21
- **Category:** Hardcoded values that should be constants
- **Issue:** DMG treasure table baked into the component; `INDIVIDUAL_TREASURE` and `GEM_NAMES` belong in `/utils/dnd/`.

- **Severity:** Medium
- **File:** src/components/gm/LootManager.jsx
- **Line:** 106-113
- **Category:** Bug / state sync
- **Issue:** `useEffect([lootData])` re-syncs local state — which discards in-progress edits if `lootData` updates from elsewhere (e.g. realtime subscription).
- **Suggested approach:** Use a "dirty" flag or only re-sync on `lootData?.id` change (or remove local state entirely).

- **Severity:** Medium
- **File:** src/components/gm/LootManager.jsx
- **Line:** 96-99
- **Category:** State management smells
- **Issue:** Four pieces of `useState` mirror the same `lootData` prop, plus the parent owns the persistence callback. Bidirectional state sync between props and local state is fragile; this is what the lootData re-sync effect is patching.
- **Suggested approach:** Either make this a controlled component (no local state) or fully uncontrolled (no re-sync).

- **Severity:** Low
- **File:** src/components/gm/LootManager.jsx
- **Line:** 477, 644, 645, 690
- **Category:** Bug
- **Issue:** `parseInt(...)` with no radix in five places (a recurring pattern across this batch).

- **Severity:** Low
- **File:** src/components/gm/LootManager.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** 28 inline `#37F2D1`, `#1E2430`, `#0b1220`, `#111827`, `#1a1f2e`, `#2A3441`, `#050816`.
- **Suggested approach:** Brand tokens.

#### /src/components/player/

##### `LootBox.jsx`

- **Severity:** High
- **File:** src/components/player/LootBox.jsx
- **Line:** 5
- **Category:** Broken or unused imports
- **Issue:** `import { base44 } from "@/api/base44Client"` — never referenced in this file.
- **Suggested approach:** Remove.

- **Severity:** High
- **File:** src/components/player/LootBox.jsx
- **Line:** 47, 77
- **Category:** Domain — GM/Player permission leak (HIGH priority)
- **Issue:** Component exposes "Take My Share" / "Take All Currency" buttons whose mutation handlers (`onTakeCurrency`, `onTakeItem`) live in the parent. There is no client-side check that the loot was actually allocated to *this* player vs all-or-nothing. Combined with the GM-side LootManager's race conditions, two players can both "Take All Currency" before the GM's distribution write commits, double-spending the pool.
- **Suggested approach:** Server-side mutation that atomically debits the campaign loot pool and credits the player's character; clients should never own the source of truth.

- **Severity:** Medium
- **File:** src/components/player/LootBox.jsx
- **Line:** 64-94
- **Category:** Accessibility
- **Issue:** Item tiles are `<div draggable onClick>` with no `role="button"`, `tabIndex`, or keyboard handler. `title=` provides hover help only, no on-screen label. Drag is not keyboard-accessible.
- **Suggested approach:** Convert to `<button>` for click; pair drag with a keyboard fallback (e.g. an explicit "Take" action menu).

- **Severity:** Medium
- **File:** src/components/player/LootBox.jsx
- **Line:** 64-94
- **Category:** Performance
- **Issue:** AnimatePresence + per-tile motion.div for every loot item. With a large pool this re-runs animations on every parent re-render.
- **Suggested approach:** Memoize tile component, use `layoutId` only when needed.

- **Severity:** Low
- **File:** src/components/player/LootBox.jsx
- **Line:** 16, 26, 56, 78
- **Category:** Brand color mismatches
- **Issue:** ~8 inline `#050816`, `#0b1220`, `#111827`, `#1a1f2e`, `#37F2D1`, `#2A3441`.

##### `PlayerCenterPanel.jsx`

- **Severity:** Critical
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 8-13
- **Category:** Storage path violation / Hardcoded values
- **Issue:** `basicActionIcons` URLs split across **two** problem CDNs:
  1. `static.wixstatic.com` — third-party Wix CDN, will go away when the Wix project is decommissioned (lines 8-11).
  2. `ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/abilities/...` (lines 12-13) — **uses the forbidden `campaign-assets` bucket per the batch's storage path domain rules** (must use `users/{user_id}/campaigns/{campaign_id}/`, never `campaign-assets`).
- **Suggested approach:** Self-host the icons in `/public/dnd5e/` (these are SRD-shipped reference images, not user uploads), or move to a dedicated `dnd5e-assets` bucket that is *not* a per-campaign user bucket.

- **Severity:** High
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 18, 65-103, 199-213
- **Category:** Dead code / unfinished feature
- **Issue:** `quickItems` state is declared with four `null` slots and rendered as empty hover-able boxes — comment at line 208 admits "Placeholder logic for quick items - would need drag/drop". Same scaffolding seen in ActionBar.jsx. This is a non-functional feature shipped to production.
- **Suggested approach:** Either implement the feature or remove the placeholder; do not ship empty quick-slot UI.

- **Severity:** High
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 38
- **Category:** Bug
- **Issue:** `((current || 0) / (max || 1)) * 100` — when `max` is `0` and `current` is `0`, formula yields 0. But when `max` is `null` and `current` is `5`, max defaults to 1 → percent = 500%, then `Math.min(..., 100)` clamps. Better to guard explicitly (no display) when max is missing.

- **Severity:** High
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 30-36
- **Category:** Bug / unused variable
- **Issue:** `const spells = character.spells?.known_spells || [];` is declared on line 30 then never used. The actually-used variable is `spellsList` on line 31. Dead code.

- **Severity:** High
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 65-69, 76-81, 99-102, 207-211
- **Category:** Accessibility
- **Issue:** Action toggle icons (`ToggleIcon`) and basic-action tile, plus quick-item slots, are interactive `<div>`s without keyboard handling or `role`/`aria-label`. The "Add Spell Slot" `+` icon (line 99) is also a non-button div.
- **Suggested approach:** Convert to `<button>`; add labels.

- **Severity:** Medium
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 17
- **Category:** TODO/FIXME/HACK
- **Issue:** `// stats, skills, background` and `// 4 slots` and `// ... add more if needed` (line 35) and `// Limit to 8 for display` — multiple in-line scaffolding comments.
- **Suggested approach:** Implement properly or delete.

- **Severity:** Medium
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 23
- **Category:** Domain — column drift
- **Issue:** `character.attributes || { str: 10, ... }` — silent fallback to all-10s for a missing character object. Players with no recorded attributes will see fake placeholder stats and a misleading character sheet.
- **Suggested approach:** Render a "no stats" state instead of synthesizing.

- **Severity:** Medium
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** 31-36
- **Category:** Bug
- **Issue:** Spells split into `cantrips`, `level1`, `level2` only — comment says "add more if needed". A character with level-3+ spells will silently lose them.

- **Severity:** Low
- **File:** src/components/player/PlayerCenterPanel.jsx
- **Line:** various
- **Category:** Brand color mismatches
- **Issue:** ~12 inline `#050816`, `#1e293b`, `#111827`, `#1E2430`, `#37F2D1`.

##### `PlayerLeftPanel.jsx`

- **Severity:** Critical
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 9-22
- **Category:** Storage path violation
- **Issue:** Twelve hardcoded class-portrait URLs all under `ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/...` — same forbidden `campaign-assets` bucket pattern as PlayerCenterPanel. Plus the silhouette image at line 163 is on `static.wixstatic.com`.
- **Suggested approach:** Move to a dedicated SRD-asset bucket (or `/public/dnd5e/`); class portraits are static SRD content, not per-campaign uploads.

- **Severity:** Critical
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 121-132
- **Category:** Dead code / Unfinished feature / Bug
- **Issue:** "Roll Initiative" button declares `const roll = Math.floor(Math.random() * 20) + 1;` and **then does nothing with it**. The comment explicitly admits "In a real app, we'd mutate the campaign log here". Click does nothing visible. Unused variable warning + non-functional shipped UI.
- **Suggested approach:** Wire to `logCombatEvent` (the helper used by the GM panel), or remove the button.

- **Severity:** High
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 1-7
- **Category:** Broken or unused imports
- **Issue:** `Input` (line 3), `Search`, `Shield`, `Skull` (line 4), `spellIcons` (line 6) all imported but never used.
- **Suggested approach:** Remove.

- **Severity:** High
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 29-41
- **Category:** Domain — column drift
- **Issue:** `character.equipment.armor.head` etc — a flat `armor` map with `head`/`armor`/`hands`/`feet`/`ring1`/`ring2`/`neck`/`back` keys. But `equipmentRules.jsx` SLOT_RESTRICTIONS uses different slot names (`gauntlets`, `belt`, `boots`, `cloak`, `necklace`, `implement`, `weapon1`, `weapon2`, `ranged`). The two slot taxonomies don't match — equipment auto-equipped via `monsterEnrichment` won't render in the player panel and vice versa.
- **Suggested approach:** Pick one slot taxonomy; align CharacterCreator, equipmentRules, PlayerLeftPanel, and the schema.

- **Severity:** High
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 162-164
- **Category:** Hardcoded values that should be constants / Brand
- **Issue:** Silhouette PNG hosted on `static.wixstatic.com` — third-party CDN.

- **Severity:** Medium
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 27
- **Category:** Bug
- **Issue:** Returns `<div className="text-white">Loading character...</div>` for missing character. No skeleton, no error state — looks identical to "loaded but empty".

- **Severity:** Medium
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 87-185
- **Category:** Accessibility
- **Issue:** Tab buttons for melee/spells (138-150) lack `role="tab"`/`aria-selected`. EquipSlot tooltips use hover-only `display:none` → `display:block`, no keyboard focus equivalent. Avatar fallback `?` is a literal character with no SR text. SVG decorative element at 116-118 has no `aria-hidden`.
- **Suggested approach:** Use shadcn Tabs, attach focus-visible state to EquipSlot, mark decorative SVG `aria-hidden`.

- **Severity:** Medium
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 196
- **Category:** Performance
- **Issue:** Inventory grid hardcoded to 18 slots regardless of inventory size. Both wastes cells when player has fewer items and silently truncates when they have more (`character.inventory?.[i]` returns undefined past 17).
- **Suggested approach:** Render `character.inventory?.length` slots, with a "max capacity" indicator if relevant.

- **Severity:** Low
- **File:** src/components/player/PlayerLeftPanel.jsx
- **Line:** 122
- **Category:** Brand color mismatches / GOOD HIT
- **Issue:** `#FF5722` and `#FF6B3D` — these are *closer* to the documented brand `#FF5300` orange than the cyan/teal used elsewhere. Inconsistent: this file half-respects the brand palette, the rest of the codebase uses #37F2D1.

##### `PlayerRightPanel.jsx`

- **Severity:** Critical
- **File:** src/components/player/PlayerRightPanel.jsx
- **Line:** 2
- **Category:** Domain — GM/Player permission leak (HIGH priority)
- **Issue:** Imports `CampaignLog from "@/components/gm/CampaignLog"` — the GM chat log component. CampaignLog renders the `isGM` UI branch (whisper-to picker, GM-only toggle) gated on a runtime computation of `isGM`, but it does so based on `currentUser?.id` against `campaign.game_master_id`. Importing a `gm/`-pathed component from `player/` is the file-system smell, but more importantly: the GM-only filter is **purely client-side** (flagged earlier in this batch) — meaning a player viewing this panel still receives every gm_only and whisper-target-other entry over the wire. Also: PlayerRightPanel passes only `campaignId` and `currentUser` to CampaignLog without the `campaign`, `characters`, `currentUserProfile`, or `allUserProfiles` props CampaignLog requires (lines 9, 49-51) — so `isGM` resolves false, role lookup is broken, and the chat will render with `displayName: undefined` and crash on `whisperTargets` (which calls `.forEach` on `campaign.player_ids`).
- **Suggested approach:** Either lift CampaignLog into a neutral folder (`/components/session/CampaignLog.jsx`) and pass the full prop set, OR build a `PlayerCampaignLog` view that's read-only by design. Server-side gate gm_only/whisper rows.

- **Severity:** Critical
- **File:** src/components/player/PlayerRightPanel.jsx
- **Line:** 84-88
- **Category:** Bug / Prop validation
- **Issue:** Renders `<CampaignLog campaignId={campaignId} currentUser={currentUser} height="100%" />` with **no** `campaign`, `currentUserProfile`, `characters`, or `allUserProfiles`. CampaignLog accepts a `height` prop that isn't actually consumed (search the file — it's not in the destructured props list at line 9). Component will crash or render broken (line 152 of CampaignLog: `if (!campaign?.player_ids || !allUserProfiles) return [];` saves it from crashing but every name resolution is broken; `getDisplayInfo` accesses `campaign?.game_master_id` on `undefined`).
- **Suggested approach:** Either thread the full prop set or refactor CampaignLog to load its own data.

- **Severity:** High
- **File:** src/components/player/PlayerRightPanel.jsx
- **Line:** 13-24
- **Category:** Domain — Session lifecycle / Bug
- **Issue:** "Leave Session" handler reads-modify-writes `ready_player_ids` array — same race condition family as the GM-side panels. Worse, the handler uses `window.confirm`, then if the campaign fetch fails or returns 0 rows the navigate still fires, leaving session-state in an inconsistent place. Per the session-lifecycle migration rules called out for this batch, leaving a session should also release any character lock the player holds (`active_session_id = null`) — that's not done here, contrast with GMSidebarPlayers.kickMutation which does it.
- **Suggested approach:** Wrap in a Supabase RPC `leave_session(campaign_id, user_id)` that does both atomically.

- **Severity:** High
- **File:** src/components/player/PlayerRightPanel.jsx
- **Line:** 5, 16, 20
- **Category:** Base44 leftovers
- **Issue:** Direct `Campaign.filter` and `Campaign.update`.

- **Severity:** Medium
- **File:** src/components/player/PlayerRightPanel.jsx
- **Line:** 14
- **Category:** Accessibility
- **Issue:** `window.confirm` for the destructive Leave Session action. AlertDialog is the project standard.

- **Severity:** Medium
- **File:** src/components/player/PlayerRightPanel.jsx
- **Line:** 36
- **Category:** State management smells
- **Issue:** Filtering self out (`if (player.user_id === currentUser.id) return null`) inside the map — fine, but yields a render with `null` items in the JSX list that React still has to reconcile. Pre-filter the array.

- **Severity:** Medium
- **File:** src/components/player/PlayerRightPanel.jsx
- **Line:** 39, 80
- **Category:** Brand color mismatches
- **Issue:** ~6 inline brand-mismatch hex.

##### Batch 1A-iii-b Summary

**Files audited:** 25 (5 session, 16 gm, 4 player).

**Findings by severity:**

| Severity | Count |
|----------|-------|
| Critical | 13 |
| High     | 67 |
| Medium   | 51 |
| Low      | 22 |
| Cosmetic | 1 |

**Findings by category:**

| Category | Count |
|----------|-------|
| Base44 leftovers | 19 |
| Brand color mismatches | 18 |
| Domain — GM/Player permission leak (HIGH priority) | 6 |
| Domain — column drift / schema ambiguity | 18 |
| Domain — guild systems (correct usage flagged) | 1 |
| Domain — storage path violations (campaign-assets bucket / 3rd-party CDN) | 4 |
| Domain — session lifecycle gaps | 3 |
| Permission gating | 8 |
| Bug / race condition (read-modify-write JSONB) | 11 |
| Real-time / state sync issues | 6 |
| Accessibility (combat / initiative / modal) | 14 |
| Performance | 7 |
| Hardcoded values that should be constants | 10 |
| Dead code / unfinished features (placeholders, mock loops, no-op handlers) | 6 |
| Duplicate components or near-duplicates | 5 |
| State management smells | 4 |
| Inconsistent file naming (.jsx for non-JSX util files) | 3 |
| Inline styles / scoped style blocks | 1 |
| TODO / FIXME / HACK | 2 |
| Broken or unused imports | 4 |
| Prop validation / inconsistent prop usage | 1 |
| console.log / .error / .warn left in | 9 |
| Tailwind issues | 2 |

(Some findings cross-categorize — categories chosen by primary impact.)

**Top systemic issues for THIS batch:**

1. **GM/Player visibility is enforced client-side only.** CampaignLog filters `is_gm_only` and `is_whisper` rows in JSX, but every entry is fetched. Whispers and GM-private rows leak to all clients. PlayerRightPanel imports the GM-pathed CampaignLog component and passes a partial prop set, so a player view of the chat both crashes on lookups and (if it didn't) would still trust the same client-side filter. This is the most consequential leak in the batch — fix server-side first.

2. **Read-modify-write of JSONB arrays is ubiquitous.** `campaigns.encountered_monsters` (CombatQueue), `campaigns.settings.quick_notes` (QuickNotesContent), `campaigns.player_ids`/`disconnected_players` (GMSidebarPlayers), `character.companions` (CustomCompanionApprovalDialog), `character.currency`/`inventory` (LootManager × N), `campaigns.ready_player_ids` (PlayerRightPanel) — every one of these is a last-write-wins race condition. With a session-driven UI that has GMs, co-GMs, and players all mutating the same documents, this is going to corrupt state in production. Several can be fixed by atomic Supabase RPCs.

3. **Three places store "house rules" / "quick notes" with three different shapes.** GMSidebarSettings writes a free-text string to `campaign.settings.house_rules`. The full HouseRulesPanel writes structured JSONB to `campaigns.homebrew_rules`. CampaignDetails (creation wizard) writes Quill HTML to `homebrew_rules`. Quick notes have a similar split: GMSidebarQuickNotes writes a string to top-level `gm_quick_notes`, QuickNotesContent writes a JSONB array to `settings.quick_notes`. Neither pair migrates the legacy column. Whichever surface the GM types into may not appear in the others.

4. **Storage path / asset hosting violations.** PlayerCenterPanel and PlayerLeftPanel reference 12+ class portrait / basic-action icons via `campaign-assets/dnd5e/...` (forbidden bucket per domain rules) and `static.wixstatic.com` (third-party CDN). monsterEnrichment.jsx hard-codes a `base44.app/.../2bbbf582f_2.png` fallback that will 404 once Base44 sunsets. SRD reference assets need their own bucket or `/public/`.

5. **Multiple half-built features shipped to production.** ActionBar (mock spell icons, hardcoded HP/AC fallbacks, no-op buttons), PlayerCenterPanel (4 quick-item slots with no drag/drop), PlayerLeftPanel ("Roll Initiative" computes a roll and discards it). Either implement or delete; do not ship dead-end UI.

6. **`co_dm_ids` vs `CO_GM` nomenclature still unresolved.** UI in CampaignSettingsContent and GMSidebarSettings literally reads "Co-DM / Co-GM" — confirming the schema/term mismatch the codebase has been papering over. Pick one.

7. **Combat UI is the most keyboard-hostile surface in the app.** CombatQueue tiles are non-button divs with hover-only edit/remove; faction is encoded only by border color; custom dialogs lack focus traps; CharacterSelector ships its own modal + scrollbar style block instead of the shadcn Dialog. The combat/initiative UX needs a deliberate a11y pass before any general accessibility work.


---

### Batch 1A-iv: character creator + characters + dnd5e + spells

Folders covered (in order): `/src/components/characterCreator/`, `/src/components/characters/`, `/src/components/dnd5e/`, `/src/components/spells/`.

#### /src/components/characterCreator/

##### AIGenerateFlow.jsx

- **Severity:** High
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 71-82
- **Category:** Portrait upload validation gaps
- **Issue:** `replacePortrait(file)` accepts any file, no MIME type or size validation before calling `uploadFile`. The `<input>` only relies on `accept="image/*"` which is a UX hint, not a security check. No 400-error feedback, no file size cap.
- **Suggested approach:** Validate `file.type.startsWith("image/")` and `file.size < MAX_BYTES` (e.g. 5MB) before upload; surface a toast on rejection.

- **Severity:** High
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 28-69
- **Category:** AI feature tier gate gaps
- **Issue:** `aiGenerate` and `generatePortrait` are called with no tier check. Per domain rules, AI generation/portraits are Adventurer+ only. The component reads `useAuth()` but never inspects `user.tier`/`subscription_tier`.
- **Suggested approach:** Gate `run()` behind a tier guard (Adventurer+) and show an upsell when a Free user reaches this flow.

- **Severity:** Medium
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 8
- **Category:** Multi-game abstraction breakage
- **Issue:** `aiClient.aiGenerate` is presumably system-agnostic, but the consumed shape (str/dex/con/int/wis/cha, race, subrace, class, subclass, alignment, spells_known) is hardcoded D&D 5e. This component should live under `/dnd5e/` or be parameterized by system.
- **Suggested approach:** Parameterize the summary by system schema, or move the summary panel into a dnd5e subfolder.

- **Severity:** Medium
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 102, 117, 137, 143, 146, 183, 218
- **Category:** Brand color mismatches
- **Issue:** Hardcoded `#a855f7`, `#37F2D1`, `#1E2430`, `#0b1220`, `#050816`, `#2A3441` instead of brand palette. ~10 occurrences in this file.

- **Severity:** Medium
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 142
- **Category:** Accessibility
- **Issue:** Portrait `<img alt="Portrait" />` is a generic alt that doesn't describe the character; bloodied portrait fetch has no alt at all (it isn't rendered, but still). No `aria-live` on the loading text. Loading spinner has no `role="status"`/screen-reader label.
- **Suggested approach:** Use `alt={character?.name ? \`Portrait of ${character.name}\` : ""}` and add `role="status"` + visually-hidden label to spinner.

- **Severity:** Medium
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 153-159
- **Category:** Accessibility / Form labels
- **Issue:** File `<input type="file">` lacks an explicit label/aria-label. The visible label-wrapper text changes ("Uploading…" / "Upload your own portrait instead") but is not associated as the input's accessible name.
- **Suggested approach:** Add `aria-label="Upload portrait"` on the input.

- **Severity:** Low
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 56-63
- **Category:** Race condition risks in character save/update
- **Issue:** The bloodied-portrait promise is fired-and-forgotten with `.then(setBloodiedPortrait)`. If `confirm()` runs before this promise resolves, `bloodied_avatar_url` is null and the variant is silently lost. No way to retry; the file in storage becomes orphaned.
- **Suggested approach:** Either await the bloodied generation (with a short timeout), persist the in-flight promise so confirm() can wait on it, or have the server enqueue the variant after save.

- **Severity:** Low
- **File:** src/components/characterCreator/AIGenerateFlow.jsx
- **Line:** 277, 287
- **Category:** React keys
- **Issue:** Spell/equipment lists use array index as key — fine for read-only lists but breaks if the source mutates.

##### AbilityScoresStep.jsx

- **Severity:** High
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 100
- **Category:** Math errors in character calculations
- **Issue:** Manual entry clamps base score to `Math.max(3, Math.min(18, ...))`. RAW point-buy/manual entry caps starting score at 15 before racial bonuses; 18 is theoretically reachable only after racial. Also, the upper cap of 18 is wrong if a homebrew/brewery race adds bonuses past 20 — but conversely, ASIs and feats post-creation can push to 20. The hard 18 ceiling on the *base* is plausible, but the lower bound of 3 silently coerces invalid inputs (e.g. blank field becomes 8 via the `|| 8`, while 0 becomes 3 via the clamp). Inconsistent and not documented.
- **Suggested approach:** Decide on a single rule (point-buy 8-15, standard array, or roll). Use validation + error state instead of silent clamping; preserve user's typed value while showing inline error.

- **Severity:** Medium
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 38-43
- **Category:** State management smells
- **Issue:** Three parallel sources of truth for ability scores: `baseScores` local state, `assignedScores` local state, and `characterData.attributes` from parent. Every handler must remember to update both local + parent. Initial sync of `baseScores` ignores parent updates after mount.
- **Suggested approach:** Lift `baseScores` to the parent or derive locally with `useMemo` from `characterData`; eliminate duplicate state.

- **Severity:** High
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 1-448 (entire file)
- **Category:** Multi-game abstraction breakage
- **Issue:** Component is hardcoded D&D 5e: six abilities (str/dex/con/int/wis/cha), `classRecommendations` hash for 12 classes, `getRacialAbilityBonuses` from dnd5e. Lives in supposedly system-agnostic `/characterCreator/`. Should be under `/dnd5e/` or driven by a system descriptor.
- **Suggested approach:** Move to `/dnd5e/AbilityScoresStep.jsx` and drive system-agnostic shell from a registry.

- **Severity:** Medium
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 23-36
- **Category:** Hardcoded values
- **Issue:** `classRecommendations` literal embedded in the step component instead of living next to the rest of the class data in `dnd5e/`.
- **Suggested approach:** Move to `dnd5e/classData` or similar.

- **Severity:** Medium
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 113-118
- **Category:** Math errors in character calculations
- **Issue:** `rollDice` uses `Math.random()` for 4d6-drop-lowest. Acceptable for client UX but non-deterministic & cannot be replayed/audited. Worse: there is no display of the actual dice rolls, breaking the social ritual of rolled stats.
- **Suggested approach:** Either (a) call a server-side dice roller for parity with combat rolls, or (b) at minimum render the four individual rolls so the player sees the drop.

- **Severity:** Medium
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 192-228, 322-340
- **Category:** Brand color mismatches
- **Issue:** ~12 occurrences of `#37F2D1`, `#FFC6AA`, `#FF5722`, `#1E2430`, `#2A3441`, `#0b1220`, `#050816` mixed in. Note `#FF5722` is close to `#FF5300` brand orange but not identical.

- **Severity:** Medium
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 268-273
- **Category:** Accessibility
- **Issue:** Help-modal is a non-semantic div: no `role="dialog"`, no focus trap, no `aria-modal`, no Escape handler. The close `<button>` has no `aria-label` (only an X icon).
- **Suggested approach:** Use the shadcn Dialog primitive or add full ARIA + focus trap + Escape.

- **Severity:** Medium
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 405-420, 422-429
- **Category:** Accessibility / Form labels
- **Issue:** `<select>` and `<Input type="number">` have no `<label>` or `aria-label`. The ability name in an adjacent `<h3>` is not associated. Screen readers announce "Strength 14" without context if the select is focused.
- **Suggested approach:** Wrap each ability block in a `<fieldset>` with `<legend>`, or add `aria-labelledby={abilityHeadingId}` on each control.

- **Severity:** Low
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 296-309
- **Category:** Accessibility / keyboard
- **Issue:** "Available Scores" tiles claim `cursor-pointer` but have no click handler — they're decorative-only despite the affordance. The actual assignment happens via `<select>`. Misleading UI for keyboard / screen-reader users.
- **Suggested approach:** Remove the cursor/hover state, or wire them to actual click-to-assign.

- **Severity:** Low
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 41
- **Category:** Hardcoded values
- **Issue:** `[15, 14, 13, 12, 10, 8]` standard array literal in component state. Should be a named constant.

- **Severity:** Low
- **File:** src/components/characterCreator/AbilityScoresStep.jsx
- **Line:** 184-186
- **Category:** Dead code
- **Issue:** `availableScores` is computed but never rendered; the available-tiles UI just iterates `standardArray` directly with an `isAssigned` check.

##### BasicInfoStep.jsx

- **Severity:** High
- **File:** src/components/characterCreator/BasicInfoStep.jsx
- **Line:** 13-17
- **Category:** Multi-game abstraction breakage
- **Issue:** Hardcoded D&D 5e PHB backgrounds list and D&D-style 9-square alignment grid embedded in supposedly system-agnostic basic-info step. Other systems (Mörk Borg, BitD, CY_BORG) lack the alignment construct entirely.
- **Suggested approach:** Move both lists into `dnd5e/backgroundData` / `dnd5e/alignmentData`; render fields conditionally on system descriptor.

- **Severity:** High
- **File:** src/components/characterCreator/BasicInfoStep.jsx
- **Line:** 29-35
- **Category:** Form validation gaps
- **Issue:** Required field marked with `*` but no validation, no error state, no minLength/maxLength. Empty string is silently accepted; whitespace-only names will pass.
- **Suggested approach:** Trim + length-check on blur and on step navigation; show inline error.

- **Severity:** Medium
- **File:** src/components/characterCreator/BasicInfoStep.jsx
- **Line:** 88-92
- **Category:** Form validation gaps / Math errors
- **Issue:** Age input uses `parseInt(e.target.value)` with no NaN guard; clearing the field stores `NaN` into state. No min/max; negative or absurd ages allowed.
- **Suggested approach:** Coerce empty → null, enforce `min={0}`, validate.

- **Severity:** Low
- **File:** src/components/characterCreator/BasicInfoStep.jsx
- **Line:** 23, 34, 47
- **Category:** Brand color mismatches
- **Issue:** ~6 hardcoded color hexes (`#FF5722`, `#1E2430`, `#2A3441`).

- **Severity:** Low
- **File:** src/components/characterCreator/BasicInfoStep.jsx
- **Line:** 27
- **Category:** Tailwind / responsive
- **Issue:** `grid-cols-2` and `grid-cols-3` used without `md:` breakpoints; on narrow screens fields will be cramped.

##### ClassFeaturesStep.jsx

- **Severity:** High
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 13
- **Category:** Multi-game abstraction breakage
- **Issue:** Hardcoded list of 12 D&D classes inline in a system-agnostic-named folder. Should pull from a system descriptor.

- **Severity:** High
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 16-17, 44-47
- **Category:** Math errors in character calculations
- **Issue:** `primaryClassLevel = level - sum(multiclassLevels)` does not account for the case where the user lowers `level` after adding multiclasses, allowing `primaryClassLevel` to go ≤ 0. The `canMulticlass` check requires `primaryClassLevel >= 1` but doesn't re-validate when level is reduced. The `handleMulticlassChange` clamp logic is also bug-prone — it references `multiclasses[index].level` (stale state) while writing into `newMulticlasses[index].level` (already mutated).
- **Suggested approach:** Refactor to compute remaining class levels reactively (useMemo); clamp at change time using the *previous* level value before mutation.

- **Severity:** Medium
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 10-11, 49-50, 53-56
- **Category:** State management smells
- **Issue:** `multiclasses` and `featureChoices` duplicated between local state and parent (`characterData`). Initial sync from parent on mount means parent updates from siblings won't propagate. Both setters always update parent — can deduplicate.

- **Severity:** Medium
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 41-42
- **Category:** State management smells (mutation)
- **Issue:** `newMulticlasses[index][field] = value` mutates the spread copy's nested object — the array is new but the referenced `mc` objects are shared with the prior state. Same shape later spread fine, but `multiclasses[index].level` on line 46 references original. Risky pattern.

- **Severity:** Low
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 211
- **Category:** Math errors
- **Issue:** `Math.min(19, characterData.level - 1)` allows multiclass to reach level 19, but D&D character cap is 20 and multiclass total can equal `characterData.level`, not `level - 1`. The off-by-one excludes the legitimate case where a character is full-multiclass at level N (e.g. Fighter 1 / Wizard N-1).
- **Suggested approach:** Use `characterData.level - sumOtherMulticlasses` as the per-row maximum.

- **Severity:** Low
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 67-78, 83-92, 102-159, 183-287
- **Category:** Brand color mismatches
- **Issue:** ~20 hardcoded color hexes (`#FFC6AA`, `#FF5722`, `#37F2D1`, `#1E2430`, `#2A3441`, `#5B4B9E`).

- **Severity:** Low
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 96, 144, 182, 231
- **Category:** React keys
- **Issue:** Index-based keys on stably-positioned items would be fine, but feature lists are derived from class+level lookup that may reorder if data changes; index keys risk stale UI when removing multiclass rows.

- **Severity:** Low
- **File:** src/components/characterCreator/ClassFeaturesStep.jsx
- **Line:** 126, 253
- **Category:** Performance
- **Issue:** No memoization of `getClassFeaturesForLevel` calls inside render — runs on every keystroke / state change. For 12+ feature rows with potential nested evaluations this can be costly.

##### ClassStep.jsx (1062 lines)

- **Severity:** Critical
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 71-181
- **Category:** Storage path violations / SRD vs user data bucket
- **Issue:** Twelve hardcoded image URLs to `campaign-assets/dnd5e/classes/...`. Per domain rules these are SRD reference assets (legitimate use of campaign-assets) — but the file is shipped via `https://ktdxhsstrgwciqkvprph.supabase.co/...` instead of being routed through the documented `campaign-assets` configurable bucket helper. If the SRD bucket is renamed, all 12 break silently.
- **Suggested approach:** Centralize SRD image URL building (e.g. `srdAssetUrl("classes/Barbarian1.png")`) so swaps are one-line.

- **Severity:** Critical
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 10, 283, 302, 321
- **Category:** Base44 leftovers
- **Issue:** Direct calls to `base44.integrations.Core.UploadFile({ file })` on three distinct upload paths (avatar, profile, companion). Per domain rules portrait uploads must go through user-assets storage helper, and Base44 is being sunset. Other components in this batch (e.g. AIGenerateFlow) already use `uploadFile(file, "user-assets", ...)`.
- **Suggested approach:** Replace all three with `uploadFile(file, "user-assets", "characters", { uploadType: "avatar" | "profile" | "companion" })`.

- **Severity:** High
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 277-329
- **Category:** Portrait upload validation gaps
- **Issue:** All three upload handlers accept any file with no MIME / size validation. `accept="image/*"` is the only check.

- **Severity:** High
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 62-183, 197-234, 236-242
- **Category:** Multi-game abstraction breakage
- **Issue:** ~120 lines of D&D class metadata (descriptions, hit dice, primary abilities, saves, features) plus alignment/companion-types embedded in supposedly system-agnostic step. The brewery integration only further entrenches D&D 5e-specific shape. Should live in `/dnd5e/`.

- **Severity:** High
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 188-195
- **Category:** State management smells
- **Issue:** Top-level `classes.forEach(...)` mutates the module-scoped `classes` array on every import — if `CLASS_*` registries are loaded asynchronously or vary per system, the mutation persists across mounts/HMR and contaminates other consumers. Side effects in module bodies are a code smell.
- **Suggested approach:** Compute a derived array via `useMemo` or `const enrichedClasses = classes.map(...)`.

- **Severity:** High
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 263-271
- **Category:** State management smells (dual state)
- **Issue:** `fullBodyPosition`, `fullBodyZoom`, `profilePosition`, `profileZoom`, `fullBodySaved`, `profileSaved` are seeded once from `characterData.*` on mount. If parent updates these props later (e.g. AI auto-fill), local state silently desyncs.

- **Severity:** Medium
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 361-370
- **Category:** Performance / leak
- **Issue:** Window-level mousemove/mouseup listeners are recreated on every `dragStart` change — handlers are inline and not stable references; the dependency array of `dragStart` causes constant add/remove. Cheap, but unnecessary churn during drag.
- **Suggested approach:** Use `useRef` for `dragStart`, useCallback for handlers, or attach listeners once on isDragging-true.

- **Severity:** Medium
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 688, 781
- **Category:** Accessibility / anti-pattern
- **Issue:** `document.getElementById('avatar-upload').click()` and `'profile-upload'` — DOM lookup by id from a React component. Two potential bugs if multiple ClassStep instances ever mount (id collision). Also no keyboard activation since the visible Button forwards click but the file input has no aria.
- **Suggested approach:** Use `useRef()` on the file input.

- **Severity:** Medium
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 615-700, 711-744
- **Category:** Accessibility / keyboard
- **Issue:** Drag/zoom of avatar is mouse-only — `onMouseDown` with no touch support, no keyboard repositioning. Slider is keyboard-accessible only because it's a Radix Slider; the drag interaction is not keyboard- or touch-reachable.

- **Severity:** Medium
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 622-635, 715-729
- **Category:** Accessibility
- **Issue:** Portrait `<img alt="Character" />` and `<img alt="Profile" />` are generic. Use character name when available.

- **Severity:** Medium
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 542, 546
- **Category:** Form validation gaps
- **Issue:** Same `parseInt(e.target.value)` NaN bug as BasicInfoStep — duplicated.

- **Severity:** Low
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 387-799
- **Category:** Brand color mismatches
- **Issue:** ~50+ hardcoded `#37F2D1`, `#FF5722`, `#1E2430`, `#2A3441`, `#050816`, `#0b1220`, `#8B5CF6` instances. Highest concentration in this batch.

- **Severity:** Low
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 911, 1027, 1031, 1036
- **Category:** React keys
- **Issue:** Index-based keys in feature/equipment lists.

- **Severity:** Low
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 940-961, 963-1018
- **Category:** Code quality
- **Issue:** Two IIFE patterns inline in JSX (`{(() => { ... })()}`). Hard to read and re-render. Extract as small components.

- **Severity:** Cosmetic
- **File:** src/components/characterCreator/ClassStep.jsx
- **Line:** 161
- **Category:** Typo
- **Issue:** Asset URL `Sorceror1.png` (misspelled). Other classes use the correct spelling `Sorcerer`. The image still loads only because it's the actual filename uploaded.

##### CompanionPicker.jsx

- **Severity:** Critical
- **File:** src/components/characterCreator/CompanionPicker.jsx
- **Line:** 8, 149
- **Category:** Base44 leftovers / Portrait upload validation
- **Issue:** `base44.integrations.Core.UploadFile({ file })` for both companion editor variants. No MIME / size validation. Bypasses storage path rules.
- **Suggested approach:** Switch to `uploadFile(file, "user-assets", "companions", { uploadType: "companion" })` and add validation.

- **Severity:** High
- **File:** src/components/characterCreator/CompanionPicker.jsx
- **Line:** 43-60
- **Category:** Multi-game abstraction breakage
- **Issue:** Hardcoded query against `dnd5e_monsters` table inline; component lives in `/characterCreator/`. Should be in `/dnd5e/` or fed via prop.

- **Severity:** Medium
- **File:** src/components/characterCreator/CompanionPicker.jsx
- **Line:** 54
- **Category:** console.log / .error
- **Issue:** `console.error("Beast companion fetch failed", error)` left in.

- **Severity:** Medium
- **File:** src/components/characterCreator/CompanionPicker.jsx
- **Line:** 280, 362
- **Category:** Accessibility / anti-pattern
- **Issue:** `e.currentTarget.parentElement.querySelector('input').click()` — DOM-walk to trigger hidden file input. Brittle and not focus-accessible.
- **Suggested approach:** `useRef`.

- **Severity:** Medium
- **File:** src/components/characterCreator/CompanionPicker.jsx
- **Line:** 158-242
- **Category:** Brand color mismatches
- **Issue:** ~15 hex literals (`#37F2D1`, `#5B4B9E`, `#1E2430`, `#0b1220`, `#050816`).

- **Severity:** Low
- **File:** src/components/characterCreator/CompanionPicker.jsx
- **Line:** 122, 165
- **Category:** React keys
- **Issue:** Index keys for fixedItems / inventory list.

- **Severity:** Low
- **File:** src/components/characterCreator/CompanionPicker.jsx
- **Line:** 285, 367
- **Category:** Accessibility / form labels
- **Issue:** Hidden file inputs lack `aria-label`; their visible "Portrait" / "Upload Portrait" Button is a sibling, not a `<label htmlFor>`.

##### EquipmentStep.jsx

- **Severity:** Critical
- **File:** src/components/characterCreator/EquipmentStep.jsx
- **Line:** 11, 46-53
- **Category:** Base44 leftovers
- **Issue:** `base44.entities.Dnd5eItem.list("name")` — should be Supabase query against `dnd5e_items`. Failing path silently returns `[]` (empty browse).
- **Suggested approach:** Replace with `supabase.from('dnd5e_items').select(...)`.

- **Severity:** High
- **File:** src/components/characterCreator/EquipmentStep.jsx
- **Line:** 12, 38-90
- **Category:** Multi-game abstraction breakage
- **Issue:** Pulls `STARTING_EQUIPMENT` from `dnd5e/dnd5eRules`. Component is hardcoded to D&D 5e starting-equipment shape (fixed/choices/startingGold) and currency types (cp/sp/ep/gp/pp). Should live in `/dnd5e/`.

- **Severity:** Medium
- **File:** src/components/characterCreator/EquipmentStep.jsx
- **Line:** 287-298, 336-340
- **Category:** Form validation gaps
- **Issue:** `parseInt(e.target.value) || 1` and `parseFloat ... || 0` mask invalid input — typing "abc" silently coerces to 1/0 with no user feedback.
- **Suggested approach:** Surface validation; allow blank-during-typing UX.

- **Severity:** Medium
- **File:** src/components/characterCreator/EquipmentStep.jsx
- **Line:** 84-90
- **Category:** Race condition / dedup
- **Issue:** `applyStartingEquipment` can be invoked multiple times — each click appends another full set. No guard / no toggle.

- **Severity:** Medium
- **File:** src/components/characterCreator/EquipmentStep.jsx
- **Line:** 274
- **Category:** React keys
- **Issue:** `key={index}` on inventory rows — sorting/removing causes inputs to retain wrong DOM state.
- **Suggested approach:** Use a stable id; generate one in `addInventoryItem`.

- **Severity:** Low
- **File:** src/components/characterCreator/EquipmentStep.jsx
- **Line:** 235
- **Category:** Accessibility
- **Issue:** Item icon `alt=""` is correct only if the name beside it is the accessible label — fine here, noted as intentional.

- **Severity:** Low
- **File:** src/components/characterCreator/EquipmentStep.jsx
- **Line:** 107-348
- **Category:** Brand color mismatches
- **Issue:** ~25 hardcoded hex values.

##### ModeSelector.jsx

- **Severity:** Medium
- **File:** src/components/characterCreator/ModeSelector.jsx
- **Line:** 53-55
- **Category:** AI feature tier gate gaps
- **Issue:** Quick Pick is gated behind `aiGeneration` permission alongside AI Generate. Quick Pick is described in MODES as "we'll find you six adventurers to choose from" — implying it actually uses AI under the hood, which is appropriate. But this contradicts the QuickPickFlow file (separate component) — verify Quick Pick really does call AI before locking it.

- **Severity:** Low
- **File:** src/components/characterCreator/ModeSelector.jsx
- **Line:** 21, 28, 35, 86, 100
- **Category:** Brand color mismatches
- **Issue:** `#37F2D1`, `#fbbf24`, `#a855f7`, `#1E2430`, `#2A3441` literals.

- **Severity:** Low
- **File:** src/components/characterCreator/ModeSelector.jsx
- **Line:** 100-101
- **Category:** Tailwind issues / arbitrary values
- **Issue:** `border-[--accent]` and `style={{ ['--accent']: accent }}` — Tailwind arbitrary class with CSS variable. Works but unusual; readability cost.

##### QuickCreateDialog.jsx (781 lines)

- **Severity:** Critical
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 9, 87, 115, 250
- **Category:** Base44 leftovers
- **Issue:** Three base44 calls: `base44.integrations.Core.InvokeLLM` (×2 for character generation, AI generate) and `base44.integrations.Core.GenerateImage` (per-character portrait gen). All must be migrated to the documented `aiClient` API.

- **Severity:** Critical
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 1-781 (entire file)
- **Category:** Duplicate components
- **Issue:** This component overlaps massively with QuickPickFlow.jsx and AIGenerateFlow.jsx in the same folder. Same Quick Pick concept, separate AI generate flow, separate "dating profile" picker. Two parallel implementations of the same UX with diverging Base44 vs aiClient backends.
- **Suggested approach:** Delete this file or QuickPickFlow+AIGenerateFlow — pick one path.

- **Severity:** Critical
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 87-108, 250-276
- **Category:** AI feature tier gate gaps
- **Issue:** No tier gate on either AI flow. Anyone with the dialog open can spend AI credits.

- **Severity:** High
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 22-24, 27-43, 296-309, 316-329, 341-354
- **Category:** Multi-game abstraction breakage / Hardcoded values
- **Issue:** Five separate hardcoded D&D 5e dictionaries embedded in this dialog (races list, classes list, backgrounds list, optimal stats per class, class skills, class equipment, class features). All belong in `dnd5e/` data files. Several are duplicates of data already in `dnd5e/` (e.g. starting equipment).

- **Severity:** High
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 161-162
- **Category:** Form validation / UX
- **Issue:** `handleRejectCharacter` resets `currentCharIndex` to 0 with toast, but only generates 9 characters. After 9 rejections it boots back to `quick` mode but the 9 expensive AI portrait generations are wasted.
- **Suggested approach:** Cache by quick-pick parameters; allow regenerate with delta.

- **Severity:** High
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 89-107
- **Category:** Math errors / response validation
- **Issue:** AI response `result.characters` is used without checking length / minimum count. If LLM returns 4 characters instead of 9, the loop completes but the gender-balance promise (3F/3M/3NB) is silently violated.

- **Severity:** High
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 186, 393
- **Category:** Math errors in character calculations
- **Issue:** `passive_perception: 10` (line 186, in `handleLetAIPick`) hardcodes passive perception to 10 — ignores wisdom modifier and Perception proficiency. The `handleAIGenerate` path computes it correctly (line 358-364). Inconsistent.

- **Severity:** Medium
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 124, 141, 403
- **Category:** console.error left in
- **Issue:** Three `console.error` calls left in production paths.

- **Severity:** Medium
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 425, 443, 452, 488, 504, 520
- **Category:** Brand color mismatches
- **Issue:** ~25 hex literals.

- **Severity:** Low
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 318-319, 321, 323
- **Category:** Math errors / data shape
- **Issue:** Hardcoded `ac_bonus: 11/14/16` for Leather/Scale/Chain Mail — these are the *total AC* of the armor, not a "bonus". A consumer applying it as a +N modifier will produce nonsense. (Also leather's listed AC includes Dex modifier, so even "total" is wrong.)
- **Suggested approach:** Pull from `dnd5e/itemData` armor table instead of inlining.

- **Severity:** Low
- **File:** src/components/characterCreator/QuickCreateDialog.jsx
- **Line:** 22
- **Category:** Multi-game abstraction
- **Issue:** Races list is missing Dragonborn from QuickPickFlow's own race list — diverging "supported races" between Quick paths.

##### QuickPickFlow.jsx (446 lines)

- **Severity:** High
- **File:** src/components/characterCreator/QuickPickFlow.jsx
- **Line:** 33-44
- **Category:** AI feature tier gate gaps
- **Issue:** No tier-gate inside the component (relies on ModeSelector). If anything else instantiates this directly (e.g. deep link), Free tier is unprotected.
- **Suggested approach:** Mirror ModeSelector check, or move guard to a wrapper.

- **Severity:** High
- **File:** src/components/characterCreator/QuickPickFlow.jsx
- **Line:** 20-24
- **Category:** Multi-game abstraction breakage / Duplicate constants
- **Issue:** `BACKGROUNDS` array duplicated identically in BasicInfoStep, ReviewStep, QuickCreateDialog, and `dnd5e/backgroundData`. Should consume a single source.

- **Severity:** Medium
- **File:** src/components/characterCreator/QuickPickFlow.jsx
- **Line:** 17-18, 144, 160
- **Category:** Architecture / coupling
- **Issue:** Imports and renders `RaceStep` and `ClassStep` inside Quick Pick. These full-creator components carry their own unrelated UI (avatar uploads, drag-zoom for portrait). Quick Pick using them as race/class pickers means the user sees the whole step apparatus inside what's billed as a "3-step quick" flow.
- **Suggested approach:** Extract a slim race/class picker component that both flows can consume.

- **Severity:** Low
- **File:** src/components/characterCreator/QuickPickFlow.jsx
- **Line:** 75-81, 79
- **Category:** State management smells
- **Issue:** `pass()` sets `setCursor(candidates.length)` to indicate exhaustion via out-of-range cursor. Rendering then has to compare `cursor >= candidates.length`. Fragile; better to track an explicit `exhausted` state or use null.

- **Severity:** Low
- **File:** src/components/characterCreator/QuickPickFlow.jsx
- **Line:** 286-306
- **Category:** Portrait upload validation gaps
- **Issue:** `replacePortrait` accepts any file with no MIME / size check.

- **Severity:** Low
- **File:** src/components/characterCreator/QuickPickFlow.jsx
- **Line:** 218, 287, 391, 412
- **Category:** Brand color mismatches
- **Issue:** ~12 hex literals (`#fbbf24`, `#37F2D1`, `#1E2430`, `#0b1220`, `#050816`, `#22c55e`).

- **Severity:** Low
- **File:** src/components/characterCreator/QuickPickFlow.jsx
- **Line:** 412, 420
- **Category:** React keys
- **Issue:** Index keys for likes/dislikes lists.

##### RaceStep.jsx (921 lines)

- **Severity:** Critical
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 100-262, 263-316
- **Category:** Multi-game abstraction breakage / Hardcoded data
- **Issue:** Massive D&D 5e `races` array (~160 lines) and full `backgrounds` array (~50 lines) hardcoded inline. Same backgrounds list duplicated at least four other places in this batch alone (BasicInfoStep, QuickPickFlow, QuickCreateDialog, ReviewStep). Race data partially duplicates `dnd5e/raceData` and conflicts with `RACES` registry from `dnd5e/dnd5eRules`.
- **Suggested approach:** Consume from `dnd5e/raceData` and `dnd5e/backgroundData`; move to /dnd5e/.

- **Severity:** High
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 391-400
- **Category:** State management smells / infinite loop risk
- **Issue:** `useEffect` depends on `currentRace.name`, `currentRace.subtypes`, `combinedRaces`, `updateCharacterData` and writes back via `updateCharacterData(buildRaceUpdates(currentRace))`. `combinedRaces` is rebuilt as a new array reference whenever `moddedRaces` changes; `currentRace` references change too. Dep `updateCharacterData` is provided by parent — if the parent doesn't memoize it, this effect re-runs on every render and triggers another updateCharacterData → render loop.
- **Suggested approach:** Use a ref to track whether init has run; remove function dep from array.

- **Severity:** High
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 67-71
- **Category:** Hardcoded values / Multi-game abstraction
- **Issue:** SRD language list inlined here while a parallel set lives in `dnd5e/`. Should be one source.

- **Severity:** Medium
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 502, 567-593
- **Category:** Accessibility / keyboard
- **Issue:** Trait reveal is hover-only via `onMouseEnter` / `onMouseLeave`. Touch and keyboard users cannot read trait descriptions. The trait container has `cursor-pointer` but no `onClick` and no `tabIndex`.

- **Severity:** Medium
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 494-499, 519-524
- **Category:** Accessibility
- **Issue:** Race carousel arrow buttons are bare `<button>`s with only icon children — no `aria-label`, no role hint. Screen readers announce just "button".

- **Severity:** Medium
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 410
- **Category:** Tailwind / responsive
- **Issue:** `grid-cols-[1fr_1.2fr]` arbitrary value with no responsive break-down — the carousel is cramped on mobile.

- **Severity:** Low
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 418-633
- **Category:** Brand color mismatches
- **Issue:** ~50+ hex literals (`#37F2D1`, `#FF5722`, `#1E2430`, `#2A3441`, `#5B4B9E`, `#8B5CF6`, `#050816`).

- **Severity:** Low
- **File:** src/components/characterCreator/RaceStep.jsx
- **Line:** 566
- **Category:** React keys
- **Issue:** Index keys for traits.

##### ReviewStep.jsx (~700 lines based on imports)

- **Severity:** Critical
- **File:** src/components/characterCreator/ReviewStep.jsx
- **Line:** 10-23
- **Category:** Storage path violations / Duplicate data
- **Issue:** A *third* copy of class icon URLs (also in ClassStep.jsx and likely Quick paths). All hardcoded supabase URLs that bypass any SRD-asset helper.

- **Severity:** Critical
- **File:** src/components/characterCreator/ReviewStep.jsx
- **Line:** 25-70, 72-91, 93-99
- **Category:** Multi-game abstraction breakage / Duplicate data
- **Issue:** D&D race traits, skill descriptions, and companion-types-by-class all duplicated inline (also exist in RaceStep, SkillsStep, ClassStep). Diverging copies will silently drift.

- **Severity:** Critical
- **File:** src/components/characterCreator/ReviewStep.jsx
- **Line:** 116-119
- **Category:** Math errors in character calculations
- **Issue:** HP and AC formulas are wrong for level >1 and for any armor.
  - `maxHP = hitDie + conMod` ignores level — a level-10 fighter shows max HP = 10 + Con mod, not 10d10 + 10×con.
  - `ac = 10 + abilityModifier(dex)` ignores armor entirely — unarmored only. Many classes wear armor.
  This is the *review* screen, the user's last sanity check before saving. Wrong numbers persist into combat.
- **Suggested approach:** Use `calculateMaxHP(class, level, con)` / `calculateAC(...)` from `dnd5e/characterCalculations` (which QuickCreateDialog already does correctly).

- **Severity:** High
- **File:** src/components/characterCreator/ReviewStep.jsx
- **Line:** 222-238, 246-296, 387-432, 444-471, 519-548
- **Category:** Accessibility
- **Issue:** Hover-only tooltips throughout — for racial traits, ability scores, combat stats, skills, class features, spells. None keyboard-reachable. `cursor-help` decoration is the only affordance.

- **Severity:** Medium
- **File:** src/components/characterCreator/ReviewStep.jsx
- **Line:** 119, 290
- **Category:** Math errors
- **Issue:** Speed `characterData.speed || 30` falls back to 30 even for races with different base speeds (Halfling 25, Dwarf 25). The default should be derived from race, not 30.

- **Severity:** Medium
- **File:** src/components/characterCreator/ReviewStep.jsx
- **Line:** 142, 149, 171, 219, 230, 243
- **Category:** Brand color mismatches
- **Issue:** Heavy hex usage (`#FF5722`, `#FFC6AA`, `#37F2D1`, `#1E2430`, `#2A3441`, `#5B4B9E`, `#F23737`).

- **Severity:** Low
- **File:** src/components/characterCreator/ReviewStep.jsx
- **Line:** 179, 204, 221, 443, 479
- **Category:** React keys
- **Issue:** Index keys throughout.

##### SkillsStep.jsx

- **Severity:** High
- **File:** src/components/characterCreator/SkillsStep.jsx
- **Line:** 52-60
- **Category:** State management smells / infinite loop risk
- **Issue:** `useEffect` dep `[characterData.background]` only — but mutates `selectedSkills` from a stale closure (`const updatedSkills = { ...selectedSkills }`). Eslint exhaustive-deps would flag. Switching background back-and-forth re-applies skills but never removes the previous background's skills → orphaned proficiencies.

- **Severity:** High
- **File:** src/components/characterCreator/SkillsStep.jsx
- **Line:** 86-96
- **Category:** State management smells
- **Issue:** Sync-to-parent `useEffect` runs on every selectedSkills/expertise change but parent's `updateCharacterData` is in the dep array implicitly through closure. If parent re-renders and provides a new `updateCharacterData` reference, this effect will fire continuously.

- **Severity:** High
- **File:** src/components/characterCreator/SkillsStep.jsx
- **Line:** 26-29
- **Category:** Hardcoded values / Multi-game abstraction
- **Issue:** `classExpertiseCount = { Rogue: 2, Bard: 2 }` — D&D-specific, hardcoded inline. Also miss Ranger Expertise from Tasha's optional rule and class-feature-derived expertise (Rogue Expertise gains *another* 2 at level 6).

- **Severity:** Medium
- **File:** src/components/characterCreator/SkillsStep.jsx
- **Line:** 163
- **Category:** Math errors / Duplication
- **Issue:** `proficiencyBonus = Math.floor((level - 1) / 4) + 2` re-implemented inline instead of using `proficiencyBonus()` from `dnd5e/dnd5eRules` (which other steps import).

- **Severity:** Medium
- **File:** src/components/characterCreator/SkillsStep.jsx
- **Line:** 286-298
- **Category:** Accessibility
- **Issue:** Skill cards are `<motion.div>` with `onClick` — not buttons, no role, no keyboard binding, no aria-pressed.

- **Severity:** Low
- **File:** src/components/characterCreator/SkillsStep.jsx
- **Line:** 289, 305, 327, 343
- **Category:** Brand color mismatches
- **Issue:** ~20 hex literals.

##### SpellsStep.jsx

- **Severity:** High
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 1-368
- **Category:** Multi-game abstraction breakage
- **Issue:** Entire component is D&D-specific (spell slots, cantrips, Pact Magic, half-casters list). Reasonable to live in /dnd5e/ — flagged for design readiness.

- **Severity:** High
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 99-123
- **Category:** Math errors
- **Issue:** `getSpellcastingClass()` returns the first match. If a character is Fighter 5 / Wizard 3, it returns Fighter (primary, not a caster) — wait no, it skips non-casters → returns Wizard 3 ✓. But it still uses `level: characterData.level` (line 105) for the *primary* class, which means a Cleric 5 / Fighter 3 reports as Cleric level 8 — wrong for spell slot calc. The full-character `level` instead of the cleric level.
- **Suggested approach:** When primary is the caster, use class-specific level (which equals total level for single-class only).

- **Severity:** High
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 100, 108
- **Category:** Hardcoded values
- **Issue:** `spellcastingClasses` and `halfCasters` arrays inline. Missing Artificer (TCoE). Missing Eldritch Knight / Arcane Trickster (third-caster subclasses), since this list assumes pure caster status.

- **Severity:** Medium
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 281-289
- **Category:** Accessibility
- **Issue:** Spell card is a `<div onClick>` with `<Checkbox pointer-events-none>`. Click hits the div, not the checkbox. Keyboard users can't focus the spell card, and the visible checkbox is decorative-only.

- **Severity:** Medium
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 297-302
- **Category:** SRD vs user data buckets
- **Issue:** `spellIcons[spell]` reads from `dnd5e/spellData`. Need to verify icons themselves don't reside in `user-assets`. (Verify in spellData audit.)

- **Severity:** Medium
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 312-329
- **Category:** Performance
- **Issue:** Each spell card creates a hover state per effect. A Wizard with 12+ spells × 3 effects = 36+ `onMouseEnter` listeners. Acceptable, but flagged for memoization if perf becomes an issue.

- **Severity:** Low
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 254
- **Category:** Math errors / cosmetic
- **Issue:** `["st","nd","rd"][parseInt(...) - 1] || "th"` — works for 1/2/3 but produces "21st" → "21th". Edge case not reachable in 5e (max spell level 9), so cosmetic.

- **Severity:** Low
- **File:** src/components/characterCreator/SpellsStep.jsx
- **Line:** 129, 197, 215, 230, 286
- **Category:** Brand color mismatches
- **Issue:** ~15 hex literals.


#### /src/components/characters/

##### CharacterGrid.jsx

- **Severity:** High
- **File:** src/components/characters/CharacterGrid.jsx
- **Line:** 24
- **Category:** Hardcoded values / Storage
- **Issue:** Fallback character avatar URL points at `images.unsplash.com/photo-1589254065878-...` — third-party CDN with no caching guarantees, no licensing record. Should be a local placeholder asset.
- **Suggested approach:** Move placeholder to `/public/images/character-placeholder.png` (or src bucket) and reference from there.

- **Severity:** High
- **File:** src/components/characters/CharacterGrid.jsx
- **Line:** 17-22
- **Category:** Accessibility
- **Issue:** Card-as-clickable-div: `<div role>` missing, no `onClick`/`onKeyDown` handler in the file (probably handled by a parent), but the `cursor-pointer` styling implies click. If clickable, must be a `<button>` or anchor.

- **Severity:** Medium
- **File:** src/components/characters/CharacterGrid.jsx
- **Line:** 50, 54, 58
- **Category:** Math errors / data shape
- **Issue:** `character.stats?.dps`, `defense`, `healing` — these aren't D&D 5e fields. They look like generic RPG metrics (DPS = damage-per-second). For a 5e character there is no canonical "DPS"; this UI may be displaying zero for everyone.
- **Suggested approach:** Either derive proxies (e.g. damage-per-round) or remove these icons.

- **Severity:** Medium
- **File:** src/components/characters/CharacterGrid.jsx
- **Line:** 32
- **Category:** Multi-game abstraction
- **Issue:** "Level {level} {class}" hardcodes D&D phrasing — Mörk Borg, BitD have no levels.

- **Severity:** Low
- **File:** src/components/characters/CharacterGrid.jsx
- **Line:** 36-43
- **Category:** React keys
- **Issue:** Tag index keys.

- **Severity:** Low
- **File:** src/components/characters/CharacterGrid.jsx
- **Line:** 20, 22
- **Category:** Brand color mismatches
- **Issue:** `#2A3441`, `#37F2D1`, `from-purple-600 to-blue-600`.

##### CompanionCard.jsx

- **Severity:** Medium
- **File:** src/components/characters/CompanionCard.jsx
- **Line:** 70-76
- **Category:** Multi-game abstraction
- **Issue:** Fixed six D&D abilities (str/dex/con/int/wis/cha). For other game systems this won't apply.

- **Severity:** Low
- **File:** src/components/characters/CompanionCard.jsx
- **Line:** 24, 26, 71
- **Category:** Brand color mismatches
- **Issue:** `#1E2430`, `#050816` literals.

##### CreateCharacterDialog.jsx

- **Severity:** Critical
- **File:** src/components/characters/CreateCharacterDialog.jsx
- **Line:** 14, 33
- **Category:** Base44 leftovers
- **Issue:** `base44.entities.Character.create(data)` is the actual character save call. Must be migrated to Supabase. This is the central insertion point — failing this means all Quick Create characters never persist.

- **Critical**
- **File:** src/components/characters/CreateCharacterDialog.jsx
- **Line:** 32-44, 86
- **Category:** Tier-gated character limit gaps
- **Issue:** No character-limit check before `createMutation.mutate(finalData)`. Domain rules require Free=4, Adventurer=12, Veteran/Guild unlimited. Free users can spam create with no enforcement.
- **Suggested approach:** Query existing character count for `user_id`; reject (or redirect to upgrade) if at tier cap.

- **Severity:** High
- **File:** src/components/characters/CreateCharacterDialog.jsx
- **Line:** 56-87
- **Category:** Math errors / Storage paths
- **Issue:** `handleQuickCreateComplete` writes character but does not specify storage bucket / path. The character record itself is fine in DB, but the `avatar_url` from QuickCreate could be a base44 generated URL or unsplash fallback — neither is in `users/{user_id}/character-library/`.

- **Severity:** High
- **File:** src/components/characters/CreateCharacterDialog.jsx
- **Line:** 33
- **Category:** Storage path violations
- **Issue:** No `library_id` / campaign assignment; the create call doesn't specify whether this is library or campaign-scoped. Per domain rules, library characters live at `users/{user_id}/character-library/` and campaign chars at `users/{user_id}/campaigns/{campaign_id}/`. The save here should target the library by default.

- **Severity:** Medium
- **File:** src/components/characters/CreateCharacterDialog.jsx
- **Line:** 41
- **Category:** console.error left in
- **Issue:** `console.error("Character save failed", err)`.

- **Severity:** Medium
- **File:** src/components/characters/CreateCharacterDialog.jsx
- **Line:** 12, 144-148
- **Category:** Duplicate components
- **Issue:** Bridges to `QuickCreateDialog` (a Base44-flagged component already slated for removal). With QuickPickFlow / AIGenerateFlow as the modern path, this dialog is the last place keeping the legacy QuickCreateDialog alive.

- **Severity:** Low
- **File:** src/components/characters/CreateCharacterDialog.jsx
- **Line:** 92, 101, 122
- **Category:** Brand color mismatches
- **Issue:** `#2A3441`, `#37F2D1`, `#1E2430`, `#FF5722`.

##### RecentCharacters.jsx

- **Severity:** Medium
- **File:** src/components/characters/RecentCharacters.jsx
- **Line:** 13-20
- **Category:** Accessibility
- **Issue:** Card-as-div with `cursor-pointer` but no `onClick`, no role, no semantic anchor — looks clickable but isn't.
- **Suggested approach:** Decide: make navigable via `<Link>` or remove the cursor styling.

- **Severity:** Low
- **File:** src/components/characters/RecentCharacters.jsx
- **Line:** 6, 15, 17
- **Category:** Brand color mismatches
- **Issue:** `#2A3441`, `#1E2430`, `#37F2D1`.


#### /src/components/dnd5e/

##### armorClass.js

- **Severity:** Low
- **File:** src/components/dnd5e/armorClass.js
- **Line:** 24-29
- **Category:** Code quality
- **Issue:** Imports `unarmoredDefense as registryUnarmoredDefense` but never uses it. Dead import.

- **Severity:** Low
- **File:** src/components/dnd5e/armorClass.js
- **Line:** 107
- **Category:** Math errors / data shape
- **Issue:** `if (kind === "shield") { shield = shield || item; }` keeps the *first* shield; `else if (!bodyArmor) { bodyArmor = item; }` keeps the *first* armor. If a character has two armor items equipped (data inconsistency), the second is silently ignored without a warning.

##### characterCalculations.jsx

- **Severity:** Critical
- **File:** src/components/dnd5e/characterCalculations.jsx
- **Line:** 33-37
- **Category:** Math errors in character calculations
- **Issue:** `calculateAC(dexScore, armor = null)` *takes* an `armor` argument but ignores it — both branches return `10 + dexMod`. Effectively unarmored only. ReviewStep / QuickCreate consume this and display wrong AC. Should call `computeArmorClass()` from `armorClass.js`.
- **Suggested approach:** Implement properly using ARMOR_TABLE or delegate to `computeArmorClass`.

- **Severity:** High
- **File:** src/components/dnd5e/characterCalculations.jsx
- **Line:** 16-19
- **Category:** Hardcoded values / Duplication
- **Issue:** `raceSpeed` map duplicates `RACES` registry data (`getSpeed` already falls back to it). Two sources to maintain.

- **Severity:** Medium
- **File:** src/components/dnd5e/characterCalculations.jsx
- **Line:** 25-31
- **Category:** Math errors
- **Issue:** `calculateMaxHP` uses *average rounded down + 1* per level (`Math.floor(hitDie/2) + 1`). For a d10 hitDie = 6 — that matches RAW (`(d10/2)+1 = 6`). Correct, but only for averaging — does not support rolled HP per level. Per-level Con is also stacked, which is correct. Flagged for completeness — verify against dnd5eRules canonical formula.

##### backgroundData.jsx

- **Severity:** High
- **File:** src/components/dnd5e/backgroundData.jsx
- **Line:** 95-107
- **Category:** Math errors / hardcoded fallback
- **Issue:** `getLanguagesForCharacter` hardcodes "Dwarvish" as the first bonus and "Elvish" as the second background language regardless of actual character. Acolyte and Sage get 2 languages: this returns ["Common","Dwarvish","Elvish"] for *every* such character, with no player choice. Should be a placeholder slot the player fills.

- **Severity:** Medium
- **File:** src/components/dnd5e/backgroundData.jsx
- **Line:** 71-81
- **Category:** Duplicate data
- **Issue:** `raceLanguages` map duplicates the `RACES.languages` data in dnd5eRules.

##### raceData.jsx

- **Severity:** High
- **File:** src/components/dnd5e/raceData.jsx
- **Line:** 3-54
- **Category:** Duplicate data
- **Issue:** `racialBonuses` overlaps RACES registry in dnd5eRules.js (which has its own `abilityBonuses` shape). Two race-bonus tables with subtly different schemas — drift risk.

- **Severity:** Medium
- **File:** src/components/dnd5e/raceData.jsx
- **Line:** 73-95
- **Category:** Hardcoded values / Multi-game abstraction
- **Issue:** `RACE_SKILL_PROFICIENCIES` mixes race + subrace keys with no parent linkage. "Elf" and "High Elf" both have `Perception` fixed — duplicated, not merged.

##### schemas.jsx

- **Severity:** Medium
- **File:** src/components/dnd5e/schemas.jsx
- **Line:** 145-156
- **Category:** Form validation gaps
- **Issue:** `validateCharacter` is shallow — only checks 4 fields with non-meaningful error strings. Doesn't actually run the JSON Schema. The schemas above are decorative (no AJV / Zod).

- **Severity:** Low
- **File:** src/components/dnd5e/schemas.jsx
- **Line:** 134
- **Category:** Math errors
- **Issue:** `hit_die enum: [1, 2, 4, 6, 8, 10, 12, 20]` — D&D classes use d6/d8/d10/d12. The 1 / 2 / 4 / 20 entries are nonsensical.

##### characterMapping.jsx + characterMapping.ts.jsx

- **Severity:** Critical
- **File:** src/components/dnd5e/characterMapping.ts.jsx
- **Line:** 1-204
- **Category:** Duplicate components / Inconsistent file naming
- **Issue:** TWO copies of the same module. `characterMapping.jsx` (273 lines, brewery-aware) and `characterMapping.ts.jsx` (204 lines, no brewery support, missing damage_resistances / brewery_class fields). The `.ts.jsx` extension is unusual — not a `.ts` file, not a `.tsx` file. Likely a stale rename mid-refactor. Importers binding to one or the other will silently diverge.
- **Suggested approach:** Delete `characterMapping.ts.jsx`; it's the older variant.

##### featureDescriptions.jsx

- **Severity:** Medium
- **File:** src/components/dnd5e/featureDescriptions.jsx
- **Line:** 1-71
- **Category:** Duplicate data
- **Issue:** Class feature blurbs partially duplicate `classFeatures.jsx` descriptions. Two sources for the same content.

##### classFeatures.jsx (~89k bytes)

- **Severity:** High
- **File:** src/components/dnd5e/classFeatures.jsx
- **Line:** entire file
- **Category:** Hardcoded values
- **Issue:** Massive 90k JSON of class features as JS literal. Should arguably live in DB (`dnd5e_class_features`) the same way spells/items moved to Supabase tables. Bundle-size impact: every page that imports `getClassFeaturesForLevel` ships this whole tree.
- **Suggested approach:** Migrate to a Supabase reference table; lazy-load per class.

##### spellData.jsx (1054 lines)

- **Severity:** Critical
- **File:** src/components/dnd5e/spellData.jsx
- **Line:** 1-339 (337 entries)
- **Category:** Base44 leftovers / Storage path violations
- **Issue:** **337 spell icon URLs all point at `https://base44.app/...`**. Once Base44 is sunset, every spell icon in the app 404s. This is the single largest concentration of Base44 dependence in this batch.
- **Suggested approach:** Bulk-migrate all spell PNGs into `campaign-assets/dnd5e/spells/` (legitimate SRD-asset bucket) and rewrite URLs.

- **Severity:** Critical
- **File:** src/components/dnd5e/spellData.jsx
- **Line:** 357-364
- **Category:** Base44 leftovers
- **Issue:** `fetchAllSpells` falls through to `base44.entities.Spell.filter({ campaign_id })` for homebrew spells. Once Base44 sunsets, homebrew spells don't load. Also: dynamic `await import("@/api/base44Client")` in a hot path — bundle doesn't tree-shake this.

- **Severity:** High
- **File:** src/components/dnd5e/spellData.jsx
- **Line:** 353, 366
- **Category:** console.error
- **Issue:** Two `console.error` calls.

- **Severity:** High
- **File:** src/components/dnd5e/spellData.jsx
- **Line:** 371-404
- **Category:** Hardcoded values
- **Issue:** `spellsByClass` only covers cantrips + level1 explicitly per class. The function `getAllAvailableSpells` then queries the DB for level 2+ — meaning a fresh DB / Supabase outage results in spells beyond level 1 silently disappearing.

- **Severity:** Medium
- **File:** src/components/dnd5e/spellData.jsx
- **Line:** 891
- **Category:** Hardcoded values
- **Issue:** `["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"]` full-caster list duplicated here. Same list (in different forms) in SpellsStep.jsx.

##### itemData.jsx (66k bytes)

- **Severity:** Critical
- **File:** src/components/dnd5e/itemData.jsx
- **Line:** 2-80+ (80 entries)
- **Category:** Base44 leftovers / Storage path violations
- **Issue:** 80 `itemIcons` URLs all on base44.app. Same problem as spell icons.

##### abilityData.jsx (46k bytes)

- **Severity:** Medium
- **File:** src/components/dnd5e/abilityData.jsx
- **Line:** 3-200+
- **Category:** Dead code
- **Issue:** `abilityIcons` map has dozens of class abilities all set to empty string "". The lookup serves no purpose currently — every ability returns "" so nothing renders an icon.
- **Suggested approach:** Either populate icons or remove the map entirely; consumers should fall back gracefully.

##### dnd5eRules.js (191k bytes)

- **Severity:** Low
- **File:** src/components/dnd5e/dnd5eRules.js
- **Line:** 1-3976
- **Category:** Architecture
- **Issue:** 3976-line single source of truth file. Reasonable as a registry; flagged because importing any single export loads the entire 191k file. Tree-shaking helps for constants, but functions referencing nested constants may carry the full module.
- **Suggested approach:** Consider module splits by section (combat / classes / spellcasting / death), even if just for build chunking.


#### /src/components/spells/

##### SpellHoverCard.jsx

- **Severity:** Low
- **File:** src/components/spells/SpellHoverCard.jsx
- **Line:** 36-40
- **Category:** Math errors / data shape
- **Issue:** `Number(spell.level)` on a string like "Cantrip" returns NaN; the conditional collapses to "—". Fine, but if upstream sends `"1st-level"` (textual), level chip says "—" instead of "Level 1".

- **Severity:** Low
- **File:** src/components/spells/SpellHoverCard.jsx
- **Line:** 27
- **Category:** Brand color mismatches
- **Issue:** Single hardcoded `#0b1220`.

- **Severity:** Low
- **File:** src/components/spells/SpellHoverCard.jsx
- **Line:** 22
- **Category:** Accessibility
- **Issue:** HoverCard trigger wraps children in an `<span>` — fine for inline content, but if `children` is itself a button, this nests interactive elements (or, more often, makes the tooltip purely hover-only and unreachable by keyboard unless the wrapped element is focusable).
- **Suggested approach:** Document/enforce that `children` must be focusable, or fall back to a tap-to-show variant on touch.


##### Batch 1A-iv Summary

**Findings by severity (approximate, this batch):**

| Severity | Count |
|---|---|
| Critical | ~17 |
| High | ~38 |
| Medium | ~55 |
| Low | ~55 |
| Cosmetic | ~3 |

**Findings by primary category:**

| Category | Count |
|---|---|
| Brand color mismatches | ~25 (~300+ literal hex occurrences) |
| Multi-game abstraction breakage | ~17 |
| Hardcoded values / duplicate constants | ~20 |
| Math errors in character calculations | ~14 |
| Base44 leftovers | ~12 (incl. ~417 base44.app URLs across spell+item icons) |
| Accessibility | ~22 |
| State management smells | ~10 |
| Form validation gaps | ~9 |
| Storage path violations | ~7 |
| Portrait upload validation gaps | ~6 |
| AI feature tier gate gaps | ~5 |
| Tier-gated character limit gaps | 1 |
| Duplicate components | ~6 |
| React keys (index keys) | ~12 |
| console.log/.error left in | ~7 |
| Performance | ~3 |

**Top systemic issues for THIS batch:**

1. **The character creator does not respect multi-game architecture.** Every step in `/characterCreator/` (BasicInfo, AbilityScores, Class, ClassFeatures, Race, Skills, Spells, Equipment, Review, plus the Quick paths) hardcodes D&D 5e concepts — six abilities, twelve classes, PHB races, PHB backgrounds, alignment grid, spell slots, hit dice. Worse, multiple D&D constants are duplicated 3-5 times across files (backgrounds list in five places, class list in three, optimal-stats hash in two, race traits in two). When PF2e/WoD/Mörk Borg game packs ship, almost the entire creator folder becomes /dnd5e/ subfolder material — but only after reconciling the duplicates.

2. **Base44 has not been removed; it is the dominant icon hosting strategy.** `spellData.jsx` ships **337** spell icons via `base44.app/api/...` and `itemData.jsx` ships **80** item icons the same way. `ClassStep`, `CompanionPicker`, `QuickCreateDialog`, `CreateCharacterDialog` still call `base44.entities` / `base44.integrations.Core.UploadFile|InvokeLLM|GenerateImage` directly. `fetchAllSpells` uses base44 for homebrew. When Base44 is sunset, every spell and item in the app loses its image, every avatar/companion upload breaks, and every Quick-Create AI flow stops. This is the single largest pre-launch cleanup item across the entire frontend.

3. **Math is inconsistent and frequently wrong.** `characterCalculations.calculateAC` ignores its `armor` parameter and always returns unarmored AC. `ReviewStep.maxHP = hitDie + conMod` ignores level entirely, so the *final review screen* shows a level-10 fighter with HP=10+conMod. `QuickCreateDialog.handleLetAIPick` hardcodes passive_perception=10. `BasicInfo`/`ClassStep` use `parseInt(...)` for age with no NaN guard. `getLanguagesForCharacter` hardcodes "Dwarvish/Elvish" as bonus languages for any background that grants them. Any character built through Quick Create or saved through Review starts with broken combat-relevant numbers.

4. **Tier gating is missing in three places that must enforce it.** `CreateCharacterDialog.createMutation` does not check the Free/Adventurer/Veteran character cap before saving — Free users can create unlimited characters. `AIGenerateFlow` and `QuickCreateDialog` do not gate AI calls behind Adventurer+ at the component level (they rely on the Mode Selector). And the `CompanionPicker` query against `dnd5e_monsters` runs unconditionally. The tier check should be enforced at the mutation, not the entry point.

5. **Storage is shared across SRD and user assets in inconsistent ways.** Class portrait URLs (Barbarian1.png, etc.) are routed through `campaign-assets/dnd5e/classes/` (acceptable per domain rules) but hardcoded as full Supabase URLs in three different files — there is no SRD-asset URL helper. User uploads from `ClassStep` and `CompanionPicker` go through `base44.integrations.Core.UploadFile` which doesn't enforce the `users/{user_id}/character-library/` path. `CharacterGrid` falls back to a third-party `images.unsplash.com` URL for missing avatars. None of these violations leak data, but every one is a long-term liability.

6. **The Quick Create UX is shipped twice.** `QuickCreateDialog` (Base44, dating-card UI inside a modal) and `QuickPickFlow` (aiClient, swipe-card UI as a full-page flow) are both wired into routes. They diverge on race list, generation prompt, post-pick edit affordance, and tier-gating. Pick one and delete the other before launch.

**Multi-game abstraction readiness:** **NOT READY.**
The current `/characterCreator/` is effectively the `/dnd5e/characterCreator/` — D&D-specific data lives in every step, often hardcoded inline rather than imported from `/dnd5e/`. To support PF2e / WoD / Mörk Borg / CY_BORG / KoB / BitD as game packs, the steps must be split into a system-agnostic shell (mode selector, step navigation, basic identity) plus per-system step modules driven by a registry. As of this batch, that split does not exist; even `/characterCreator/AbilityScoresStep.jsx` hardcodes the six D&D abilities in 24 distinct lines. Plan on a substantial refactor before enabling a second game pack.



### Batch 1A-v-a: combat + dice

#### /src/components/combat/

##### PortraitWithState.jsx

- **Severity:** Medium
  **File:** src/components/combat/PortraitWithState.jsx
  **Line:** 37, 98–104
  **Category:** DOMAIN — Combat tracker dynamic portrait states
  **Issue:** Bloodied/dead thresholds (`<=50%`, `<=0`) are hardcoded directly into the component. Spec says 50% and 0% are required, but the literals are not exported as named constants and are duplicated between the component body and the `portraitStateOf` utility, so the two will drift if either is changed.
  **Suggested approach:** Extract `BLOODIED_HP_PERCENT = 50` (and equivalent dead threshold) into a shared constants module (e.g. `combatConstants.js`); reuse across both the component and the helper.

- **Severity:** Medium
  **File:** src/components/combat/PortraitWithState.jsx
  **Line:** 62–79
  **Category:** Inline styles that should be Tailwind/CSS
  **Issue:** Bloodied overlay uses an inline `style={{ backgroundImage, mixBlendMode, … }}` with multi-layer radial gradients embedded in JSX. This is brittle, hard to theme, and pure presentation that belongs in CSS.
  **Suggested approach:** Move the overlay declarations into `index.css` under the existing `.bloodied-overlay` selector (already referenced by className), drive opacity with a CSS custom property.

- **Severity:** Medium
  **File:** src/components/combat/PortraitWithState.jsx
  **Line:** 86
  **Category:** Hardcoded values / accessibility
  **Issue:** Death state is conveyed solely by the literal "💀" emoji + greyscale. Emoji rendering varies across platforms; for screen readers the emoji has no role/label.
  **Suggested approach:** Wrap the skull in `<span role="img" aria-label="dead">…` (or a proper SVG icon component), and consider exposing a `deadIcon` prop so non-D&D systems (Mörk Borg etc.) can supply their own symbol — this component is currently in `/combat/` but its visuals are system-specific.

- **Severity:** Low
  **File:** src/components/combat/PortraitWithState.jsx
  **Line:** 36
  **Category:** Math / edge case
  **Issue:** When `max <= 0`, `pct` defaults to `100` ("healthy"), but `cur` could still be `0`. The death check at line 37 catches `cur <= 0`, but a max-less monster with current=10 would render as healthy regardless of any wound state.
  **Suggested approach:** Treat `max <= 0` as "unknown HP — render plain portrait, no overlay state" rather than forcing healthy.

- **Severity:** Low
  **File:** src/components/combat/PortraitWithState.jsx
  **Line:** 1
  **Category:** Missing error boundaries
  **Issue:** No error boundary; image load errors fall through to a broken-image graphic with no fallback.
  **Suggested approach:** Add an `onError` handler that swaps to the `fallback` slot when the `<img>` fails (e.g. broken Supabase URL after Base44 sunset).

##### ConditionRing.jsx

- **Severity:** High
  **File:** src/components/combat/ConditionRing.jsx
  **Line:** 26 (CONDITIONS / CONDITION_COLORS imported from `@/components/combat/conditions`)
  **Category:** Multi-game abstraction concerns
  **Issue:** Component is in `/combat/` (system-agnostic per audit rules) but imports a D&D-5e-specific condition list (Blinded, Charmed, Frightened, Stunned, etc.) from `combat/conditions.js`. PF2e/Mörk Borg/CY_BORG have entirely different status taxonomies; this component will not render their conditions correctly.
  **Suggested approach:** Make the rendering driven by a `conditions` prop carrying `{ name, color, description }` already resolved by the caller (via the active game pack). The /combat/ component should not import the D&D condition table directly.

- **Severity:** Medium
  **File:** src/components/combat/ConditionRing.jsx
  **Line:** 41 (`Dodging: "#37F2D1"`)
  **Category:** Brand color mismatches
  **Issue:** Hardcoded brand cyan `#37F2D1`. (1 occurrence in this file; logged for systemic count.)
  **Suggested approach:** Replace with brand token once the palette decision lands.

- **Severity:** Medium
  **File:** src/components/combat/ConditionRing.jsx
  **Line:** 28
  **Category:** Hardcoded values
  **Issue:** `MAX_VISIBLE = 4` ring cap, `step = 4` radius step, `20 + i * 3` rotation duration, `fontSize` thresholds — all magic numbers inline.
  **Suggested approach:** Hoist to module-level constants with names; group as a `RING_TUNING` object so designers can adjust without re-reading the geometry math.

- **Severity:** Medium
  **File:** src/components/combat/ConditionRing.jsx
  **Line:** 133
  **Category:** Brand color mismatches / Tailwind arbitrary values
  **Issue:** Tooltip uses arbitrary value `bg-[#050816]/97` (dark blue surface) plus `shadow-[0_20px_60px_rgba(0,0,0,0.8)]` — neither matches the documented surface palette and they're embedded across the `/combat/` and `/dice/` folders.
  **Suggested approach:** Resolve once palette is finalized; replace with theme tokens.

- **Severity:** Medium
  **File:** src/components/combat/ConditionRing.jsx
  **Line:** 51, 55
  **Category:** Performance
  **Issue:** Animation runs continuously on every visible portrait via `gs-spin` keyframe; with a long initiative order each conditioned combatant gets up to 4 SVG groups animating. With ~10+ combatants this can cause measurable repaint overhead on lower-end devices.
  **Suggested approach:** Pause animations when off-screen (`IntersectionObserver` or CSS `content-visibility: auto`); consider gating the rotating arcs behind `prefers-reduced-motion` media query.

- **Severity:** Medium
  **File:** src/components/combat/ConditionRing.jsx
  **Line:** 130–161
  **Category:** Accessibility
  **Issue:** The condition tooltip is shown on `mouseenter` only — no keyboard equivalent (`onFocus`/`onBlur`) and no ARIA. Players using keyboard or screen reader cannot discover what conditions a combatant has.
  **Suggested approach:** Add focusable wrapper, mirror onFocus/onBlur with the hover state, give the tooltip `role="tooltip"` and the trigger `aria-describedby`. Without this, conditions are invisible to AT users.


##### useTurnContext.jsx

- **Severity:** High
  **File:** src/components/combat/useTurnContext.jsx
  **Line:** 20–93
  **Category:** Inconsistent file naming
  **Issue:** File is `.jsx` but contains zero JSX — exports a single hook returning a plain object. The other `.jsx` siblings in `/combat/` actually render JSX. Mixed naming is already noted as systemic; this is one of the cleaner violations to flag.
  **Suggested approach:** Rename to `useTurnContext.js` (the hook is pure logic).

- **Severity:** High
  **File:** src/components/combat/useTurnContext.jsx
  **Line:** 33–34
  **Category:** DOMAIN — GM/player permission gating
  **Issue:** `actorIsGM` is determined solely by `actor.type === "monster" || actor.type === "npc"`. There is no check that the actor was injected by an actually-GM session — any client could pass `{ type: "monster" }` and unlock GM-side ally/enemy queues. The hook is consumed by combat UIs that route different actions for GM vs player.
  **Suggested approach:** Determine GM-ness from the campaign membership (e.g. `campaign.gm_id === currentUser.id`) at the call site and pass it in explicitly. Don't infer authorization from the actor entity's `type` field.

- **Severity:** Medium
  **File:** src/components/combat/useTurnContext.jsx
  **Line:** 76–79
  **Category:** Hardcoded values
  **Issue:** "Up next" allies and enemies are capped at `4` in two unlabelled magic numbers.
  **Suggested approach:** Hoist to a named constant (`UP_NEXT_LIMIT`), or accept it as a hook option.

- **Severity:** Medium
  **File:** src/components/combat/useTurnContext.jsx
  **Line:** 45–53
  **Category:** State management smells
  **Issue:** Identity matching across four heuristics (`id`, `uniqueId`, `user_id`, `player-${user_id}`). This indicates the rest of the system stores combatant identity inconsistently and is a maintenance hazard — a missed alias means "is it my turn" silently returns false.
  **Suggested approach:** Settle on a single canonical id at the moment a combatant is added to `combat_data.order`; use that same id across UI and DB writes.

- **Severity:** Low
  **File:** src/components/combat/useTurnContext.jsx
  **Line:** 73
  **Category:** Math / edge case
  **Issue:** `if (c.id === active.id && order.length === 1) continue;` skips self only when there is exactly one combatant; if `order.length > 1` and the current actor appears elsewhere in the list (e.g. mounts, summoned creatures sharing an id), they'll be listed in their own up-next queue.
  **Suggested approach:** Skip self unconditionally; the `length === 1` guard is unnecessary.

##### hpColor.js

- **Severity:** Medium
  **File:** src/components/combat/hpColor.js
  **Line:** 15–17, 22–25
  **Category:** Brand color mismatches / hardcoded values
  **Issue:** HP bar colors hardcoded as `#22c55e`/`#eab308`/`#ef4444` (Tailwind green-500/yellow-500/red-500). Used everywhere via `bg-[#…]` arbitrary classes which conflict with the documented palette (#FF5300/#04685A). Also, identical thresholds (50/25) live in both functions.
  **Suggested approach:** Move thresholds and colors to a single config object, expose as `HP_COLOR_TIERS = [{min:50,…},{min:25,…},{min:0,…}]`. Replace inline hex with theme tokens once palette decision lands.

- **Severity:** Medium
  **File:** src/components/combat/hpColor.js
  **Line:** 29–33
  **Category:** Math errors / state management
  **Issue:** `clampHp(current, max, delta)` subtracts delta from current — this is a damage-only signature when applied directly, but the docstring says "works for damage AND healing". Healing is encoded by passing a *negative* delta, which is non-obvious from the function name and trivially mis-called by passing positive heal amounts (which would deal damage). No callers within this file reveal which convention the rest of the app uses.
  **Suggested approach:** Either rename to `applyDamage` (positive=damage) or split into `applyDamage`/`applyHeal`/`setHp` with explicit names.

- **Severity:** Medium
  **File:** src/components/combat/hpColor.js
  **Line:** 48–93
  **Category:** State management smells
  **Issue:** `normalizeHp` exists specifically because HP shape is inconsistent across the codebase (six different observed shapes). This is itself a smell — the normalizer is a band-aid for upstream inconsistency.
  **Suggested approach:** Pick a canonical HP shape (`{ current, max, temporary }`) and migrate all writers to emit it; relegate `normalizeHp` to a one-time migration helper rather than a runtime read path.

- **Severity:** Low
  **File:** src/components/combat/hpColor.js
  **Line:** 86–90
  **Category:** Math errors
  **Issue:** SRD-style "135 (18d10 + 36)" parsing extracts only the first integer, which assumes the average always appears first. SRD/Open5e data is consistent here, but homebrew or imported monster blocks may format differently (e.g. `"(18d10+36) avg 135"`).
  **Suggested approach:** Be explicit about the expected format, or look for a digit followed by `(` to ensure we extract the average rather than any first integer.

##### deathSaves.js

- **Severity:** Critical
  **File:** src/components/combat/deathSaves.js
  **Line:** 1–100
  **Category:** Multi-game abstraction concerns
  **Issue:** Entire module encodes D&D 5e-specific death save mechanics (3 successes / 3 failures, nat-20-revives-to-1, crit doubles failures) and lives in the system-agnostic `/combat/` folder. Pathfinder 2e uses a 4-stage Dying condition; Mörk Borg uses a critical-injury table; CY_BORG/KoB/BitD/WoD all differ.
  **Suggested approach:** Move to `/dnd5e/` and have the combat tracker resolve "dying" semantics through an active-game-pack hook (e.g. `useGameSystem().resolveDeathRoll(...)`).

- **Severity:** Medium
  **File:** src/components/combat/deathSaves.js
  **Line:** 50
  **Category:** Math / state edge case
  **Issue:** `normalizeDeathSaves` will set `stabilized = true` when `s >= 3 && f < 3`. Combined with `dead: !!saves?.dead || f >= 3`, an entry with `s=3, f=3` is computed `stabilized=false, dead=true` — fine. But a previously-stabilized character (`stabilized=true, s=3, f=0`) who later takes a failure (`s=3, f=1`) will still report `stabilized=true` because `s>=3 && f<3` is still true. Stabilization should not auto-reapply once cleared.
  **Suggested approach:** Once stabilized, the actor leaves the dying state — they shouldn't be normalizing further saves at all. The normalizer should refuse to recompute stabilized; only the orchestrator should set/clear it.

- **Severity:** Medium
  **File:** src/components/combat/deathSaves.js
  **Line:** 62–90
  **Category:** DOMAIN — Dice/RNG concerns / race conditions
  **Issue:** `applyDeathSaveRoll` takes a pre-rolled `d20` integer, so the source of randomness is opaque to this module. If the caller uses `Math.random()` for combat-critical rolls anti-cheat-wise, this function is complicit. Also, the function is purely synchronous on `existing` — concurrent writes (player and GM both rolling) will race.
  **Suggested approach:** Document required RNG provenance in a JSDoc invariant; make all combat-critical rolls funnel through a single seeded/auditable RNG. Resolve persistence races at the database layer (transactional update with optimistic concurrency on `combat_data.version`).

- **Severity:** Low
  **File:** src/components/combat/deathSaves.js
  **Line:** 95–99
  **Category:** Hardcoded values
  **Issue:** "Crits add 2 failures" magic number `add = critical ? 2 : 1`.
  **Suggested approach:** Hoist into named constants `DEATH_FAILURE_PER_HIT = 1`, `DEATH_FAILURE_PER_CRIT = 2`.


##### classResources.js

- **Severity:** Critical
  **File:** src/components/combat/classResources.js
  **Line:** 1–189
  **Category:** Multi-game abstraction concerns
  **Issue:** Entire module is D&D 5e specific (Barbarian rages, Monk ki, Fighter Action Surge / Second Wind, Paladin Lay-on-Hands, Bard Inspiration, Sorcerer points, Cleric Channel Divinity, Druid Wild Shape) and imports from `@/components/dnd5e/dnd5eRules`. Yet it lives at `/components/combat/classResources.js`, defeating the abstraction.
  **Suggested approach:** Move file to `/components/dnd5e/classResources.js`. Combat tracker should consume a system-agnostic `resources` array yielded by the active game pack.

- **Severity:** High
  **File:** src/components/combat/classResources.js
  **Line:** 56–58, 117–119
  **Category:** Hardcoded values / math
  **Issue:** Action Surge fallback `level >= 17 ? (uses[17] || 2) : (uses[2] || 1)` mixes mechanics-table lookups with magic-number fallbacks. If `CLASS_ABILITY_MECHANICS['Action Surge'].uses` is missing or shaped differently, the silent fallback may give an incorrect resource count.
  **Suggested approach:** If the table is required, fail loudly on missing keys (assert during dev). Don't bake the canonical numbers into both the table and the fallback.

- **Severity:** Medium
  **File:** src/components/combat/classResources.js
  **Line:** 89, 141
  **Category:** Math / hardcoded values
  **Issue:** Wild Shape uses hardcoded `2` regardless of subclass; PHB Druid (Circle of the Moon) and various subclass features modify wild shape uses. `bardicInspirationRemaining` similarly uses `Math.max(1, chaMod)` regardless of class features that may scale it differently.
  **Suggested approach:** Drive these from `dnd5eRules` (which already exists for some abilities).

- **Severity:** Medium
  **File:** src/components/combat/classResources.js
  **Line:** 73, 129, 167
  **Category:** State management smells
  **Issue:** Reads `character.attributes?.cha`. The character schema elsewhere uses `stats.attributes.cha`, `attributes.charisma`, or `ability_scores.cha` depending on the writer. Silent fallback `|| 10` will produce wrong inspiration count.
  **Suggested approach:** Normalize attribute access via a single helper (referenced repeatedly by prior batches).

- **Severity:** Low
  **File:** src/components/combat/classResources.js
  **Line:** 47, 89, 161
  **Category:** Hardcoded values
  **Issue:** Default `RAGES_PER_DAY[level] || 2` — when the level lookup fails, every Barbarian regardless of level gets 2 rages.
  **Suggested approach:** Don't silently mask missing-data bugs; either throw or log a warn.

##### conditions.js

- **Severity:** Critical
  **File:** src/components/combat/conditions.js
  **Line:** 1–383
  **Category:** Multi-game abstraction concerns
  **Issue:** Entire D&D 5e condition library plus modifier resolver lives in `/combat/`, including specific 5e rules (advantage/disadvantage cancel, War Caster feat, Barbarian Danger Sense level gate, exhaustion ladder per PHB p.291). Other systems do not have advantage/disadvantage; flagging this whole file as system-specific.
  **Suggested approach:** Move to `/components/dnd5e/conditions.js`; expose `getConditionModifiers` as a game-pack interface method.

- **Severity:** High
  **File:** src/components/combat/conditions.js
  **Line:** 41
  **Category:** Brand color mismatches
  **Issue:** `Dodging: "#37F2D1"` — brand cyan hardcoded. (1 occurrence; logged for systemic count.)
  **Suggested approach:** Token replacement.

- **Severity:** High
  **File:** src/components/combat/conditions.js
  **Line:** 226–235
  **Category:** State management smells
  **Issue:** Feat detection walks four possible shapes (`feats`, `features`, `class_features`, `metadata.feats`). Same systemic schema-shape problem as elsewhere — if a feat lives somewhere else (e.g. `subclass_features`) War Caster is silently inactive.
  **Suggested approach:** Single canonical feat-list helper; remove the heuristic chain.

- **Severity:** High
  **File:** src/components/combat/conditions.js
  **Line:** 315–322
  **Category:** Math / DOMAIN combat correctness
  **Issue:** `auto_fail_save` is currently flagged for *any* save against a target with the rule, regardless of whether the save is in `m.saves` (`["str","dex"]`). The TODO admits "Future: check save ability vs m.saves" — a Paralyzed creature should only auto-fail STR/DEX saves, but as written it auto-fails Wisdom/Charisma saves too.
  **Suggested approach:** Implement the save-ability check now (`if (!m.saves?.includes(normalizedSave)) continue;`); this is a real combat-correctness bug.

- **Severity:** Medium
  **File:** src/components/combat/conditions.js
  **Line:** 26–44
  **Category:** Brand color mismatches
  **Issue:** 17 inline condition colors hardcoded as hex strings; none match the brand palette. Some are duplicated across `ConditionRing.jsx`, action bar, and dice window. (17 hex literals; logged for systemic count.)
  **Suggested approach:** Single source of color tokens once palette finalizes.

- **Severity:** Medium
  **File:** src/components/combat/conditions.js
  **Line:** 178–187, 193–199
  **Category:** Dead code / state management
  **Issue:** `isIncapacitated` and `getNoActionConditionName` are functionally redundant — both walk the conditions list checking the same rule. Consumers can call one and infer the other.
  **Suggested approach:** Replace `isIncapacitated` callers with `Boolean(getNoActionConditionName(...))`.

- **Severity:** Medium
  **File:** src/components/combat/conditions.js
  **Line:** 348–373
  **Category:** Math / DOMAIN
  **Issue:** Exhaustion handler emits warnings only — does not actually halve speed/HP-max or zero out movement. The `warnings` array is informational; the combat tracker still computes movement/HP from the unmodified entity.
  **Suggested approach:** Either return numeric multipliers (`speedMultiplier`, `hpMaxMultiplier`) for the consumer to apply, or document explicitly that exhaustion is informational.


##### actionResolver.js

- **Severity:** Critical
  **File:** src/components/combat/actionResolver.js
  **Line:** 1–883
  **Category:** Multi-game abstraction concerns
  **Issue:** This is the single largest D&D 5e mechanics file in the entire `/combat/` folder — 883 lines of D&D-specific behavior (action economy, cantrip scaling, upcasting, spell attack vs save, action surge, sneak attack assumptions). Comment at line 1 already calls itself "D&D 5e Action Resolver". Belongs entirely under `/dnd5e/`.
  **Suggested approach:** Move to `/components/dnd5e/actionResolver.js`. Combat tracker should consume an opaque `{ rollType, cost, … }` resolved by the active game pack.

- **Severity:** Critical
  **File:** src/components/combat/actionResolver.js
  **Line:** 80–183, 229–317, 538–598
  **Category:** Hardcoded values / state management smells
  **Issue:** Three large hardcoded spell tables (`SPELL_DAMAGE_DICE` ~100 entries, `SPELL_EFFECTS_FALLBACK` ~60 entries, `SPELL_ATTACK_SPELLS`/`SPELL_SAVE_MAP`/`NO_ROLL_SPELLS`). These duplicate data that lives in the `dnd5e_spells` table (per the comment on line 222–227). Risk: data drift when the DB row changes but the hardcoded table doesn't.
  **Suggested approach:** Migrate the fallback tables out into a JSON data file consumed both by a one-time DB seed and by this resolver, or query the DB row once and rely on the `classifySpellEffect` parser. The current dual-source-of-truth is asking to drift.

- **Severity:** High
  **File:** src/components/combat/actionResolver.js
  **Line:** 60–67, 70–73, 585–598
  **Category:** Math / DOMAIN combat correctness
  **Issue:** Bonus-action and reaction-spell sets are inconsistent. `Healing Word` and `Mass Healing Word` appear in BOTH `BONUS_ACTION_SPELLS` and `NO_ROLL_SPELLS`. `Magic Missile`, `Cure Wounds`, `Bless`, `Mage Armor` etc. show up in `NO_ROLL_SPELLS` even though several of them require a target/healing roll. `Counterspell` and `Dispel Magic` are listed in `NO_ROLL_SPELLS` AND `REACTION_SPELLS`. The interplay of `getSpellCost` and `resolveAction` may produce off-by-one action-economy bugs.
  **Suggested approach:** Consolidate to a single per-spell descriptor `{ cost, rollType, … }`. Lint for spells appearing in multiple sets.

- **Severity:** High
  **File:** src/components/combat/actionResolver.js
  **Line:** 246
  **Category:** Math errors
  **Issue:** Magic Missile listed as `dice: "3d4+3"` — that's the level-1 cast. Per RAW Magic Missile fires `1d4+1` per dart × 3 darts at level 1, with `+1d4+1 per upcast`. Some renderers will treat `3d4+3` as a single damage roll rather than three separate targeting rolls, which changes per-target distribution.
  **Suggested approach:** Encode multi-target spells as `{ multiAttack: 3, dice: "1d4+1" }` so the renderer rolls each dart separately. The rest of the code already uses `multiAttack` for Scorching Ray (line 249).

- **Severity:** High
  **File:** src/components/combat/actionResolver.js
  **Line:** 469–475
  **Category:** Math / dice notation parsing
  **Issue:** `getScaledDice` only handles the strict regex `^(\d+)d(\d+)$`. Anything with a `+modifier` (e.g. "1d4+1" Magic Missile cantrip variant) or compound dice ("2d8+4d6") returns unscaled. Comment (467) acknowledges the limitation but the resolver routes all cantrips through this path — Magic Stone (1d6), Magic Missile-style cantrips, Eldritch Blast multi-beam are silently mis-scaled.
  **Suggested approach:** Extend the parser to accept `(\d+)d(\d+)(?:\+\d+)?` for the trailing flat, document that compound `+NdM` cannot scale via cantrip rule (which is correct), and emit a console warn when an unscalable shape is fed in.

- **Severity:** High
  **File:** src/components/combat/actionResolver.js
  **Line:** 490–535
  **Category:** Math / dice notation parsing
  **Issue:** `getUpcastDice` handles three forms but silently bails on most edge cases (no upcast rule + non-simple base = unchanged). For spells like Magic Missile (`3d4+3`, +1d4+1 per upcast), the resulting expression `3d4+3+1d4+1` is technically valid but no consumer test confirms collapse correctness.
  **Suggested approach:** Add unit tests covering at minimum: Magic Missile, Fireball, Burning Hands, Heal (flat), Inflict Wounds. Without them, upcasting is a silent-correctness hazard.

- **Severity:** High
  **File:** src/components/combat/actionResolver.js
  **Line:** 353–457
  **Category:** Math / DOMAIN combat correctness
  **Issue:** `classifySpellEffect` parses spell effect from the description string, taking the first `\d+d\d+` it finds. For spells like "Toll the Dead" (1d8 if undamaged, 1d12 if damaged) it picks 1d8 silently; for spells like "Spiritual Weapon" (1d8 + spellmod) it picks 1d8 but cannot resolve the +mod; for Magic Missile descriptions ("three darts of magical force … each dart hits a creature … 1d4+1 force damage") the regex grabs "1d4" and drops the +1, then the multi-attack count of 3 is never inferred.
  **Suggested approach:** Don't auto-classify damage from description text for combat-critical math. Treat parser output as advisory; require a manual entry for any spell used in actual combat dice flows.

- **Severity:** Medium
  **File:** src/components/combat/actionResolver.js
  **Line:** 793, 796–797, 802
  **Category:** State management / math
  **Issue:** Falls back to `actor.attributes?.str || 10` etc. — same systemic schema shape problem as elsewhere. A character whose attributes live in `stats.attributes` will always roll with +0 mods.
  **Suggested approach:** Single canonical attribute reader; remove the fallback chain.

- **Severity:** Medium
  **File:** src/components/combat/actionResolver.js
  **Line:** 795
  **Category:** Hardcoded values
  **Issue:** `actor.proficiency_bonus || 2` silently gives every actor a level-1 proficiency bonus when the field is missing.
  **Suggested approach:** Compute via `proficiencyBonus(actor.level)` (already imported on line 22) when missing, not a hardcoded 2.

- **Severity:** Medium
  **File:** src/components/combat/actionResolver.js
  **Line:** 813
  **Category:** Math / DOMAIN combat correctness
  **Issue:** Finesse weapon detection uses `weapon.properties?.includes("Finesse")` — but the modifier choice is "ranged ? dex : str", so a Finesse melee weapon with high STR gets DEX applied even when STR is higher. RAW says Finesse lets the character *choose*; current code forces DEX.
  **Suggested approach:** For Finesse weapons, take `Math.max(strMod, dexMod)`.

- **Severity:** Low
  **File:** src/components/combat/actionResolver.js
  **Line:** 56
  **Category:** DOMAIN combat correctness
  **Issue:** "Throw" listed as `no_roll` with a comment admitting "RAW it's a weapon attack roll; the tool treats it as a flavor action". This is a deliberate-but-flagged correctness gap.
  **Suggested approach:** Either make Throw a proper attack with a thrown weapon resolver, or document this in the GM tooltip so players don't think the dice flow is bugged.

- **Severity:** Low
  **File:** src/components/combat/actionResolver.js
  **Line:** 822–828
  **Category:** Hardcoded values
  **Issue:** `getSpellSaveDC` returns `13` when actor is null. That's an arbitrary fallback that could mask missing-actor bugs.
  **Suggested approach:** Throw or return `null`; let the caller decide what to do.


##### DeathSaveWindow.jsx

- **Severity:** Critical
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 153
  **Category:** DOMAIN — Dice/RNG concerns
  **Issue:** Uses `Math.floor(Math.random() * 20) + 1` for the death-save d20. This is a **combat-critical** roll determining whether a PC lives or dies; a non-seedable, non-auditable RNG is an anti-cheat hole and can't be replayed in P.I.E. logs.
  **Suggested approach:** Route the roll through a single auditable RNG service that emits a P.I.E. event with seed/source. Make `Math.random` for combat dice an ESLint-blocked pattern.

- **Severity:** Critical
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 207–214
  **Category:** DOMAIN — missing P.I.E. telemetry
  **Issue:** The death-save roll is generated locally and only emitted upward via `onRoll(d20)`. No P.I.E. event is emitted from this component at all (success/failure/nat-1/nat-20/stabilized/dead). The audit rules explicitly require dice rolls to feed P.I.E.; a critical dramatic moment is currently invisible to telemetry.
  **Suggested approach:** Emit `pie.event({ kind: 'death_save', actor, value: d20, outcome, willStabilize, willDie, isSilent })` immediately after `setRollValue`. Verify whether the parent already emits — if so, document; if not, add here.

- **Severity:** High
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 188–193
  **Category:** Hardcoded values / inclusivity
  **Issue:** Stabilized SFX is binary male/female keyed off heuristic string match on `combatant.gender || pronouns`. Non-binary / they-them / unspecified all silently default to male. Also a localization landmine.
  **Suggested approach:** Add a third "neutral" sting and pick neutral when neither female nor male is unambiguously declared; long-term, allow per-character custom stings.

- **Severity:** High
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 21–24, 32–44
  **Category:** Hardcoded values / Base44 leftovers risk
  **Issue:** Hardcoded full Supabase storage URLs (project ref `ktdxhsstrgwciqkvprph`) for icons and 8 MP3/WAV sound files. URL-encoded filenames with spaces are fragile. If the project ref ever changes (env split, dev/staging) every URL silently 404s.
  **Suggested approach:** Use a `getCampaignAssetUrl('dnd5e/UI/life.png')` helper that reads the Supabase URL from `import.meta.env`. Move SFX into an asset registry; rename files to remove spaces.

- **Severity:** High
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 168–179
  **Category:** Math / DOMAIN combat correctness — duplicate logic
  **Issue:** The window predicts `nextSuccesses`/`nextFailures` with its own copy of the rules (nat20 resets, nat1=+2 failures, ≥10=success). This duplicates `applyDeathSaveRoll` from `deathSaves.js`. The component then calls `onRoll(d20)` and trusts the parent to apply the canonical rules — so two implementations of the same rule must stay in sync.
  **Suggested approach:** Import `applyDeathSaveRoll` from `deathSaves.js` and use its computed `next` for the SFX decision; remove the inline duplicate.

- **Severity:** Medium
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 1–413
  **Category:** Multi-game abstraction concerns
  **Issue:** Component lives in `/combat/` but assumes 5e death-save mechanics (3 successes/3 failures, 10 threshold, nat-20 revives to 1 HP). Visual presentation also assumes 5e narrative (e.g. "Roll for Your Life" copy, life/death icons under `dnd5e/UI/`).
  **Suggested approach:** Either move under `/dnd5e/` or accept a `rules` prop encapsulating per-system death/dying mechanics.

- **Severity:** Medium
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 218
  **Category:** Hardcoded values
  **Issue:** Magic numbers everywhere (350ms, 700ms, 1000ms ramp-up, 2500ms / 3400ms holds, 0.45/0.7/0.5 volumes, 0.85/1.0/1.3/1.55 playback rates).
  **Suggested approach:** Hoist into a `DEATH_SAVE_TIMING` constants object so designers can tune without re-reading the code.

- **Severity:** Medium
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 235–411
  **Category:** Accessibility / focus traps
  **Issue:** Full-screen modal with `position: fixed inset-0 z-[200]` but no focus trap, no `role="dialog"`/`aria-modal`/`aria-labelledby`, no escape-to-cancel. The roll button is keyboard-reachable but the modal scrim doesn't trap tabbing.
  **Suggested approach:** Wrap in a Radix `Dialog` (already in the dep list) so modal semantics, focus trap, and Esc are handled.

- **Severity:** Medium
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 246–265, 364, 396
  **Category:** Inline styles that should be Tailwind/CSS / brand color mismatches
  **Issue:** Heavy reliance on inline `style={{ background: radial-gradient … }}`, inline `boxShadow`, `textShadow`, gradient strings in JSX. Plus bare hex `#22c55e`, `#ef4444`, `#991b1b`, `#450a0a`, `#1a1f2e`, `rgba(239,68,68,…)` repeated ~8 times.
  **Suggested approach:** CSS-class-ify; pull colors from a single token map.

- **Severity:** Low
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 212
  **Category:** console.log/.error left in
  **Issue:** `console.error("DeathSaveWindow onRoll error:", err);` left in user-facing build.
  **Suggested approach:** Replace with the project's logger.

- **Severity:** Low
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 159
  **Category:** Dead code
  **Issue:** `let resultVolume = 0.7;` is declared but only ever read once in `tryPlay(makeAudio(resultUrl, { volume: resultVolume }))`; never reassigned (the `let` is a stub for branches that never set it).
  **Suggested approach:** Convert to const, or delete and inline.

- **Severity:** Low
  **File:** src/components/combat/DeathSaveWindow.jsx
  **Line:** 81–85
  **Category:** State management smells
  **Issue:** Default save shape inlined as a fallback; the project also has `blankDeathSaves()` in `deathSaves.js`.
  **Suggested approach:** Import the helper.


##### CombatActionBar.jsx

- **Severity:** Critical
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 1–1655
  **Category:** Multi-game abstraction concerns
  **Issue:** 1655-line component that imports D&D 5e rules tables (`RAGES_PER_DAY`, `kiPoints`, `CLASS_ABILITY_MECHANICS`, `computeArmorClass`) and hardcodes 5e-only mechanics: 12 class branches (Barbarian, Fighter, Monk, Paladin, Cleric, Druid, Bard, Sorcerer, Rogue), feat-by-name handling (Lucky, Great Weapon Master, Sharpshooter, Polearm Master), spell slots, ki diamonds, sorcery points. This is the single most D&D-coupled "system-agnostic" file in the folder.
  **Suggested approach:** Move to `/components/dnd5e/CombatActionBar.jsx`. The combat tracker should render an action bar resolved from the active game pack's component slot.

- **Severity:** High
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 21–22, 25–34, 37–42
  **Category:** Hardcoded values / Base44 leftovers risk
  **Issue:** Two hardcoded full Supabase storage URLs (`PC_ICON_BASE`, `MONSTER_ICON_BASE`) baked at module load. ~25+ icon URLs constructed via string concat, every URL using `%20` for spaces.
  **Suggested approach:** Centralize via `getCampaignAssetUrl(...)`; rename storage files to remove spaces.

- **Severity:** High
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 48–55
  **Category:** Hardcoded values / DOMAIN
  **Issue:** `CLASS_TINT` map applies a hue-rotate filter to coloured icons by class. The comment explicitly notes "only Rogue and Monk are actually used in the UI today; the others are future-proof placeholders". Three of the six entries are dead.
  **Suggested approach:** Drop unused entries; let the theme system handle class colours.

- **Severity:** High
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 213–247
  **Category:** State management smells / math
  **Issue:** AC is computed inline by walking 5+ possible character shapes (`character.armor_class`, `character.equipped`, `character.equipment`, `character.attributes?.dex`, `character.stats?.dexterity`). On error in `computeArmorClass`, silently catches and falls back to `armor_class || 10`. No telemetry or warning, so misconfigured equipment silently rolls AC 10.
  **Suggested approach:** Standardize AC source; surface fallback warnings to GM in dev mode at minimum.

- **Severity:** High
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 142, 187, 188
  **Category:** DOMAIN — GM/player permission gating
  **Issue:** Component decides "isCreature" from `character.type === 'monster' || 'npc'` — same pattern as `useTurnContext`. There is no separate `isGM` prop; the bar trusts that the parent only mounted it for entities the user is allowed to control. A player viewing a monster portrait would render an action bar that fires `onActionClick`, and authorization is left to the consumer.
  **Suggested approach:** Add an explicit `canControl` boolean prop; wrap action handlers behind that gate inside the component.

- **Severity:** High
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 297–304
  **Category:** Math errors
  **Issue:** `totalMaxHp = maxHp + (tempHp > 0 ? tempHp : 0)`; `hpPercent = (currentHp / totalMaxHp) * 100`. Per RAW, temporary HP is a separate buffer in *front* of current HP, not added to max. Computing percent across `current/(max+temp)` makes the bar shrink when temp HP is granted (because the denominator grew) until current HP rises to match. Bar geometry then layers temp HP after the main bar at offset `hpPercent%`, but the percents are computed against different bases.
  **Suggested approach:** Render two stacked rectangles: HP fill from 0 → currentHp/max, temp HP fill from currentHp/max → (currentHp+temp)/maxIfShown. Don't merge them into a single denominator.

- **Severity:** High
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 580
  **Category:** Math errors
  **Issue:** `chaMod = Math.max(1, Math.floor(((character.attributes?.cha || 10) - 10) / 2))` — silently treats negative modifiers as 1. RAW: Bard with Cha 8 has Cha mod -1, but Bardic Inspiration uses count = max(1, mod) ≠ this expression. Closer but: integer-divide of negative numbers in JS rounds toward zero (so `Math.floor(-1/2)` = `-1`), and `Math.max(1, -1) = 1` works coincidentally; however, the comment elsewhere uses `abilityModifier(...)`. Inline duplication of the modifier formula is itself smelly.
  **Suggested approach:** Reuse the imported `abilityModifier` from dnd5eRules.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 762–777
  **Category:** State management smells / accessibility
  **Issue:** Hover uses a 3000ms `setTimeout` to open the spell-detail tooltip, with no keyboard equivalent and no cleanup if `setHoveredSpell` reaches `null` between hover and timer fire. Also, mouseleave only clears the latest `hoverTimer`; rapidly hovering across multiple spells could leak timers because `setHoverTimer` replaces the ref before the previous one is cleared.
  **Suggested approach:** Use `useRef` for the timer, clearTimeout on every change. Add focus-driven open/close. Consider a Radix Tooltip with built-in delay+a11y.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 226 (`character.features` walked again here), 532–536, 222–225
  **Category:** State management smells
  **Issue:** Same shape-soup problem: feat list is read from `feats` OR `features` OR `class_features` OR `metadata.feats`. Three different reading sites in this file alone (lines 222–225, 282–287, 532–536) — each will silently miss feats stored in shapes the others handle.
  **Suggested approach:** Single shared `getCharacterFeats(character)` helper.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 1453–1454
  **Category:** Dead code / inconsistent file naming
  **Issue:** `const toText = safeText; const safeRender = safeText;` declared at the bottom of the module but used throughout the JSX above. Two aliases for the same import — `safeRender` is the only one referenced before the declaration but the file works because the constants are hoisted via `var`-hoisting? Actually: these are `const` declarations *after* a JSX expression that uses them — only works because the JSX is inside functions evaluated later. Still confusing; both aliases point to the same import.
  **Suggested approach:** Import once as `safeText`, use that name; remove the aliases.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 51 (filter strings), 1387 (drop-shadow strings), 1391 (linear-gradient)
  **Category:** Inline styles that should be Tailwind/CSS
  **Issue:** Heavy inline `style={{ filter, boxShadow, animation, borderImage }}` strings throughout — `borderImage: 'linear-gradient(45deg, #37F2D1, #FF5722, #37F2D1) 1'` is essentially the entire button accent baked into a JSX literal.
  **Suggested approach:** Move to CSS classes / theme tokens.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** Throughout (counted ~70+ inline hex usages)
  **Category:** Brand color mismatches
  **Issue:** ~30 distinct hex literals used inline (`#37F2D1`, `#050816`, `#111827`, `#1e293b`, `#1E2430`, `#1e2636`, `#a855f7`, `#fbbf24`, `#FF5722`, `#ef4444`, `#22c55e`, `#38bdf8`, `#6366f1`, `#4c1d95`, `#22d3ee`, `#0b1220`, `#a7f5e6`, `#d8b4fe`, `#fde68a`, `#334155`, `#818cf8`). None match the documented brand palette. (Counted ~50+ literal hex occurrences in this file alone — large contributor to the systemic mismatch.)
  **Suggested approach:** Token replacement once palette is finalized.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 785, 1343, 1410, 1432, 1564, 1635, 1650
  **Category:** Tailwind issues — arbitrary values
  **Issue:** Many `rounded-[32px]`, `w-[52px]`, `h-[52px]`, `text-[9px]`, `text-[7px]`, `border-[10px]` etc. arbitrary values rather than configured spacing scale.
  **Suggested approach:** Define a small set of design tokens; replace ad-hoc values.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 1408–1437
  **Category:** Accessibility
  **Issue:** `BasicActionSlot`, `MonsterActionSlot`, `SpellSlot` are `<button>` with image content but no aria-label — they rely on a hover-only tooltip for the action name. Screen readers see an unlabeled button. `<img>` `alt={tooltipText}` partly compensates, but missing for some image-less buttons.
  **Suggested approach:** Add `aria-label={tooltipText}` to each button; keep the visual tooltip as supplementary.

- **Severity:** Medium
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 791, 798–799, 813
  **Category:** Performance
  **Issue:** Inline percentage style computed every render; `tempHp` overlay layered with separate transform, no memoization. With many combatants in a long initiative list, action bars re-render on every parent state change. The component does not memoize via `React.memo`.
  **Suggested approach:** Wrap export in `React.memo` with a custom equality check on `character.id` + key resource fields.

- **Severity:** Low
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 1453, 1456
  **Category:** Dead code
  **Issue:** `const toText = safeText` is declared but only `safeRender` is the public name in this file; some sections use `toText` (lines 1459–1461, 1497–1505) others use `safeRender`.
  **Suggested approach:** Pick one alias; the dual is confusing and adds no value.

- **Severity:** Low
  **File:** src/components/combat/CombatActionBar.jsx
  **Line:** 1454 (`safeRender = safeText`)
  **Category:** Inconsistent file naming / indirection
  **Issue:** `safeRender` defined at module bottom but used at module top inside JSX inside functions — works, but reads out of order.
  **Suggested approach:** Hoist or just call `safeText` directly.


##### CombatDiceWindow.jsx

- **Severity:** Critical
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 1–3122
  **Category:** Multi-game abstraction concerns
  **Issue:** 3122-line dice window — the largest single file in /combat/ — is entirely D&D 5e-specific. Imports a dozen 5e symbols (`abilityModifier`, `proficiencyBonus`, `SPELLCASTING_ABILITY`, `CLASS_SAVING_THROWS`, `sneakAttackDice`, `cantripScaling`, `MONK_MARTIAL_ARTS_DIE`, `divineSmiteDice`, `spellSaveDC`, `getSpellSlots`, `COVER`). Mechanics: Divine Smite, Stunning Strike, Sneak Attack, Great Weapon Fighting reroll, Power Attack, Bardic Inspiration, Lucky, Two-Weapon Fighting, Uncanny Dodge, Cover (Half/Three-Quarters), Concentration. None of this lives behind a per-system abstraction.
  **Suggested approach:** Move under `/components/dnd5e/`. Define a small dice-window contract the game pack implements.

- **Severity:** Critical
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 282–299, 682, 797, 857, 897, 986, 1182, 1190, 1196, 1225, 1247, 1265, 1575, 1603, 1747
  **Category:** DOMAIN — Dice/RNG concerns
  **Issue:** **16 separate `Math.random()` invocations** inside the most combat-critical dice flow in the app: paired d20 for advantage/disadvantage (line 682), Bardic Inspiration die (797), Lucky reroll (857), DM Inspiration reroll (897), saving throws (986, 1603), each crit-extra die (1182, 1190, 1196), Great Weapon Fighting rerolls (1225), Sneak Attack d6 (1247), Divine Smite radiant dice (1265), and the generic `rollDiceString` (292). All combat-critical, all opaque, all unreplayable. Anti-cheat is impossible.
  **Suggested approach:** Single auditable RNG service (seedable per-encounter), all rolls funnel through it; emit a P.I.E. event per roll with seed + result. Make `Math.random` a banned token in `/combat/` via lint rule.

- **Severity:** Critical
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 5, 337, 344, 356
  **Category:** Base44 leftovers
  **Issue:** Four direct base44 calls: `base44.auth.me()` (337), `base44.entities.UserProfile.filter(...)` (344), `base44.entities.Campaign.filter(...)` (356). The dice window still depends on Base44 for current user, profile, and campaign config. When Base44 is sunset the dice flow breaks.
  **Suggested approach:** Replace with the Supabase auth/profile/campaign layer used by the rest of the v0.27 codebase.

- **Severity:** Critical
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 658–739, 968–1007
  **Category:** Race conditions in concurrent combat updates
  **Issue:** Dice rolls call `setAttackRoll(...)` / `setPostHitDecisions(...)` and emit `onRoll(...)` to the parent without any optimistic-concurrency check on `combat_data.version`. Two players simultaneously resolving (e.g. attacker rolls damage while defender rolls Uncanny Dodge) can produce interleaved writes that drop one update.
  **Suggested approach:** All combat state mutations should go through a single transactional handler with a version check; surface conflicts via a "the GM updated this — re-resolve?" toast.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 50, 1959, 3079
  **Category:** DOMAIN — GM/player permission gating
  **Issue:** `isGM` is a plain prop with no validation. The component renders GM-only UI behind `{isGM && (...)}`. A malicious client passing `isGM={true}` could expose GM-only controls. Authorization should not depend on a frontend prop alone.
  **Suggested approach:** Compute `isGM` from `campaign.gm_id === currentUser.id` server-side / inside trusted code; mutations must enforce authorization at the server (Supabase RLS), not just the client component.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 1146–1232
  **Category:** Math errors / DOMAIN combat correctness
  **Issue:** Crit + Great Weapon Fighting + power attack + uncanny dodge interaction is implemented inline with branching that's hard to verify. Particularly: (a) when `critMaxFirst` is on, line 1180–1184 first pushes max dice and the visible `roll`, then re-rolls the rest, but then doubles `numDice *= 2` for display only — there's an off-by-one risk. (b) GWF reroll loop at 1225 only retries once even though RAW says you take the second roll regardless. (c) Power Attack +10 (line 1103) applies even when the weapon is a finesse one-hand; RAW restricts GWM to heavy melee, Sharpshooter to ranged.
  **Suggested approach:** Extract a pure `rollWeaponDamage({...})` function with unit tests covering crit branches, GWF, GWM/Sharpshooter weapon gates, and rage damage. Current inline branching has too many silent edge cases.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 695–697
  **Category:** State management smells
  **Issue:** `target.stats?.armor_class || target?.armor_class || 10` — same shape-soup pattern as everywhere else. AC of 10 silently applies if both fields are missing. Doesn't use `computeArmorClass` even though that helper exists elsewhere in the codebase.
  **Suggested approach:** Single canonical AC reader; use the same helper as CombatActionBar.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 974–981
  **Category:** Math errors
  **Issue:** Stunning Strike CON save: target proficiency is **not** added even if the target is proficient in CON saves. Line 982–985 admits "fall back to just their CON mod" for monsters; for player characters the proficiency bonus is silently dropped too. RAW: target rolls CON save with proficiency if proficient. Current implementation favors the attacker.
  **Suggested approach:** Use `getSaveModifier(target, 'con')` from actionResolver — it already handles proficiency.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 304–320
  **Category:** State management smells
  **Issue:** `getSpellAbilityMod` walks `CLASS_SPELL_ABILITY` keys looking for substring matches in `actor.class`. A character with class "Eldritch Knight" (subclass of Fighter) substring-matches "Fighter" → defaults wrong ability. Multiclassed PCs only get the first matching class.
  **Suggested approach:** Match on canonical class array; respect explicit `actor.spellcasting_ability` already supported below.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 1071–1083
  **Category:** State management / DOMAIN
  **Issue:** Two-Weapon Fighting style detection walks four shapes inline (`fighting_style`, `fightingStyle`, `fighting_styles`, `features`). `getCharacterFeats`-style helper still missing. Same issue as CombatActionBar lines 222–225.
  **Suggested approach:** Single helper.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 396–444
  **Category:** Performance / state management
  **Issue:** Spectator sync path mutates state (`setPhase`, `setAttackRoll`, `setIsCrit`, `setSelectedAction`) for every change in `spectatorData` and uses `setTimeout(... 100ms)` to trigger the dice roll animation. Large encounter (10+ combatants, frequent updates) means many short-lived timers stacking; no cleanup of pending timeouts when `spectatorData` changes mid-flight.
  **Suggested approach:** `useRef` for the timer, clear on each spectator update; or migrate to a derived-state model that doesn't need timeouts.

- **Severity:** High
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 663–667, 720–725, 1379, 1448, 1675, etc.
  **Category:** DOMAIN — P.I.E. telemetry
  **Issue:** P.I.E. `onStat` calls fire for many but not all roll events: covers `spells_cast`, `nat_20s`, `nat_1s`, `attacks_hit`, `attacks_missed`, `crits_landed` — but does NOT emit a roll-level event with the actual d20/damage value, conditions applied, advantage/disadvantage, target, etc. Bardic Inspiration / Lucky / DM Inspiration usage is logged in `logCombatEvent` but not via `onStat`. Death saves are not visible at all (those live in DeathSaveWindow). The audit rules specifically require dice rolls feed P.I.E.; coverage is partial.
  **Suggested approach:** Standardize: every randomized roll emits `pie.dice({ kind, actor, target, value, total, advantage, conditions, source })`; existing per-stat counters then derive from the stream rather than being instrumented separately.

- **Severity:** Medium
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 364
  **Category:** console.error left in
  **Issue:** `console.error("Failed to load campaign config", err);` — production console noise.
  **Suggested approach:** Replace with the project's logger / toast.

- **Severity:** Medium
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 1138–1139, 3 callsites
  **Category:** Hardcoded values
  **Issue:** Homebrew rule lookups via `getRule(homebrewRules, 'combat.critical_hits.max_all')` — the path string is hardcoded inline rather than imported as a constant.
  **Suggested approach:** Module-level RULE_PATH constants.

- **Severity:** Medium
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** Throughout — `bg-[#FF5722]`, `bg-[#37F2D1]`, `bg-[#22c55e]`, `bg-[#8B5CF6]`, etc.
  **Category:** Brand color mismatches
  **Issue:** Counted ~80+ inline hex literals in this file alone (`#37F2D1` appears 30+ times, `#050816`, `#FF5722`, `#22c55e`, `#ef4444`, `#fbbf24`, `#8B5CF6`, `#38bdf8`, `#a855f7`, dozens more). Massive contributor to the systemic palette mismatch.
  **Suggested approach:** Token replacement.

- **Severity:** Medium
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** Throughout — `text-[10px]`, `text-[11px]`, `rounded-2xl`, `border-[#…]`
  **Category:** Tailwind issues — arbitrary values
  **Issue:** Heavy use of arbitrary Tailwind values for sizes, colors, shadows. Hard to scan, hard to refactor.
  **Suggested approach:** Define theme tokens.

- **Severity:** Medium
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 1860, 1871, 1982, 2967, 3042
  **Category:** Accessibility
  **Issue:** Modal close: 5 different paths to `onClose()` — overlay click, X button, finish button, etc. — but no `role="dialog"`, no `aria-modal`, no focus trap, no Escape key handler. Same issue as DeathSaveWindow.
  **Suggested approach:** Use Radix Dialog primitive.

- **Severity:** Medium
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 1093–1100
  **Category:** Math errors
  **Issue:** Dueling fighting style: "no other weapons" check is approximated by "no `weapon2` slot equipped". Shield is correctly excluded ("Shield doesn't count as a weapon"), but the actual RAW check is "wielding a one-handed melee weapon and no other weapons", which fails when the second hand holds a non-shield non-weapon (e.g. a torch, a focus). Code permits the bonus in cases RAW disallows.
  **Suggested approach:** Document the deviation or implement the full rule.

- **Severity:** Medium
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 446–478
  **Category:** Performance
  **Issue:** `getQueueAvatars` is recomputed on every render (no `useMemo`); walks `allCombatants.length * 2` entries. With 12+ combatants that is ~24 iterations × multiple component renders.
  **Suggested approach:** Memoize on `[allCombatants, actor, target]`.

- **Severity:** Low
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 38
  **Category:** Inconsistent imports / dead code
  **Issue:** `const CLASS_SPELL_ABILITY = SPELLCASTING_ABILITY;` aliases an import. The codebase is mid-rename; one alias is fine but signals incomplete cleanup.
  **Suggested approach:** Rename callsites and drop the alias.

- **Severity:** Low
  **File:** src/components/combat/CombatDiceWindow.jsx
  **Line:** 1247
  **Category:** Hardcoded values
  **Issue:** Sneak attack die hardcoded as `Math.floor(Math.random() * 6) + 1` — the die size (6) is implicit. Other dice paths read the size from the dice expression.
  **Suggested approach:** Use a `SNEAK_ATTACK_DIE_FACES = 6` constant or share the rolling helper.


#### /src/components/dice/

##### diceConfig.jsx

- **Severity:** Low
  **File:** src/components/dice/diceConfig.jsx
  **Line:** 1–10
  **Category:** Inconsistent file naming
  **Issue:** File is `.jsx` but contains zero JSX — exports a single object literal. Same pattern as `combat/useTurnContext.jsx`.
  **Suggested approach:** Rename to `.js`.

- **Severity:** Low
  **File:** src/components/dice/diceConfig.jsx
  **Line:** 2–10
  **Category:** Multi-game abstraction concerns
  **Issue:** `DICE_SIDES` enumerates D&D-style polyhedrals (d4, d6, d8, d10, d12, d20, d100). Mörk Borg / CY_BORG use d6, d20; Blades in the Dark uses pools of d6; WoD uses d10 pools. The list is mostly fine but `d100` (percentile) is rarely used outside specific systems and there's no `d2`/`d3`. Minor system-leakage.
  **Suggested approach:** Keep the list as the *available* dice; let game-pack components opt in.

##### faceRotations.jsx

- **Severity:** Low
  **File:** src/components/dice/faceRotations.jsx
  **Line:** 1–77
  **Category:** Inconsistent file naming
  **Issue:** `.jsx` extension but no JSX — file exports calibrated Euler-angle data only.
  **Suggested approach:** Rename to `.js`.

- **Severity:** Low
  **File:** src/components/dice/faceRotations.jsx
  **Line:** 4–76
  **Category:** Hardcoded values
  **Issue:** Calibrated Euler rotations are hard-coded as raw float literals — out of scope to fix (calibration is by definition ad-hoc data), but there's no comment indicating which model file shape these were calibrated against. If the GLBs in `campaign-assets/dice/models/` change, every rotation breaks silently.
  **Suggested approach:** Add a comment stating which model SHAs/version these rotations correspond to; consider versioning the calibration alongside the models.

##### DiceRoller3D.jsx

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller3D.jsx
  **Line:** 1
  **Category:** Dead code
  **Issue:** File is **empty** (0 bytes), never imported (grep confirms — only references are comments in `DiceCalibrator.jsx` calling out where a future component would live). Pure dead file.
  **Suggested approach:** Delete the file, or stub it with the actual extracted 3D rendering code from `DiceRoller.jsx`. As-is it's a misleading placeholder.

##### DiceRoller.jsx

- **Severity:** Critical
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 766
  **Category:** DOMAIN — Dice/RNG concerns / missing P.I.E. telemetry
  **Issue:** `roll = Math.floor(Math.random() * sides) + 1;` — the **single visible roll source** for the user-facing 3D dice roller. No P.I.E. event is emitted from this component (search for `onStat`, `pie.`, or any telemetry callback returns nothing). The audit rules explicitly require "Dice rolls feed the P.I.E. telemetry system — flag missing event emission" and "Roll Screen Overlay should log to P.I.E. — flag missing logging". This component is the Roll Screen Overlay; it logs nothing.
  **Suggested approach:** Funnel through the same auditable RNG service as combat. Emit `pie.dice({ kind: 'manual_roll', sides, value, modifier, total })` on every roll completion. Add an `onRoll`/telemetry prop the parent can wire up.

- **Severity:** Critical
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 146–148, 155–158, 163–166, 649–652, 661–662, 671–672
  **Category:** Hardcoded values / Base44 leftovers risk
  **Issue:** **9 hardcoded `static.wixstatic.com` URLs** for crit GIFs (3) and roll/crit success/crit fail SFX (6). Wixstatic was the Base44 hosting CDN; if those URLs are de-provisioned every dice roll loses its sound + crit feedback. This is silent third-party hosting still in production.
  **Suggested approach:** Migrate assets to Supabase `campaign-assets/dice/`; reference via `getCampaignAssetUrl(...)` like the rest of v0.27.

- **Severity:** High
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 26–60
  **Category:** Brand color mismatches
  **Issue:** `Particles` config bakes in 14 distinct hex literals across three crit modes (`#37F2D1`, `#00FFFF`, `#8B5CF6`, `#FFD700`, `#FFFFFF`, `#FFA500`, `#DC2626`, `#7F1D1D`, `#000000`, `#450a0a`, `#FF6B6B`, `#FFFF00`, `#991b1b`). `#37F2D1` is the legacy brand cyan (pending decision). Same color literal duplicated across three places in this file.
  **Suggested approach:** Move into a `DICE_PARTICLE_PALETTE` object once palette is finalized.

- **Severity:** High
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 89, 94, 154–155, 654, 664, 674, 766
  **Category:** DOMAIN — Dice/RNG concerns
  **Issue:** Many `Math.random()` invocations in this file are *visual-only* (particle scatter, sound selection — fine). But line **766** (`roll = Math.floor(Math.random() * sides) + 1`) is THE roll source and is intermixed with the same RNG used for sparkles. There's no separation between "presentation jitter" RNG and "result" RNG, so a future code-mover could accidentally seed one and not the other. (Counted ~14 visual `Math.random` + 1 result `Math.random` in this file.)
  **Suggested approach:** Two RNG sources — `useVisualRng()` (unseeded) and `useGameRng()` (seedable, audited). The visual scatter and sound selection use `useVisualRng`; the actual roll uses `useGameRng` + emits a P.I.E. event.

- **Severity:** High
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 763–764
  **Category:** DOMAIN — anti-cheat / auditing
  **Issue:** `forcedResult` prop allows the parent to override the roll (`roll = Math.min(Math.max(1, forcedResult), sides)`). This exists for the calibrator, but the prop is exposed at component-public surface. A consumer in production combat could pass `forcedResult` to fix the result of a player roll. There is no telemetry distinguishing forced vs random rolls.
  **Suggested approach:** Restrict forced rolls to a calibrator-only mode (e.g. require `mode='calibration'` prop in addition to forcedResult), and emit a distinct P.I.E. event so audit logs show the result was forced.

- **Severity:** High
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 342–343
  **Category:** State management smells
  **Issue:** Reads `localStorage.getItem("diceConfig")` synchronously during component initialization. (a) Not SSR-safe (will throw on server). (b) `JSON.parse` has no try/catch — corrupt localStorage breaks the entire dice flow. (c) The same key is written by `pages/DiceCalibrator.jsx`, which means dice calibration is per-browser and not synced across devices.
  **Suggested approach:** Wrap in `try/catch`; consider persisting calibration to user profile so it follows the user.

- **Severity:** High
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 405–605 (the Init Three.js effect)
  **Category:** Performance / state management
  **Issue:** Massive 200-line `useEffect` with dependency `[isOpen, embedded, modelsReady, selectedDice, forcedResult]`. The comment explicitly says "Re-add forcedResult to dependency array so force re-roll works", which means changing `forcedResult` *re-instantiates the entire Three.js scene* — disposing the renderer, removing the canvas, and re-running `loadCustomConfig`. Heavy and unnecessary. Also: `selectedDice` in the dep array tears down the scene every time the user changes dice type.
  **Suggested approach:** Init the renderer/scene once; parameterize the dice creation via the existing `createDice` call rather than re-instantiating WebGL.

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 378–381
  **Category:** console.log/.error left in
  **Issue:** `console.error("Failed to load custom dice model for ${type}:", err);` left in production.
  **Suggested approach:** Replace with project logger or surface via a toast.

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 854–869, 850
  **Category:** Accessibility
  **Issue:** Modal mode (`isOpen=true`, not embedded) renders a full-screen `bg-black/70` overlay with no `role="dialog"`, no `aria-modal`, no focus trap, no Escape handler. Same issue as combat dice window and death save window.
  **Suggested approach:** Use Radix Dialog.

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 145–148, 154–158, 163–166
  **Category:** Accessibility
  **Issue:** Three crit/result GIFs are decorative but use `alt` text describing them as "Critical Fail"/"Critical Success"/"Result Reveal" — these will be announced by screen readers as content during animations. Should be `alt=""` (decorative) since the result number is announced separately.
  **Suggested approach:** Set `alt=""` on visual-only effects; rely on the rolled-number element for accessible announcement.

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 88–193
  **Category:** Performance
  **Issue:** `Particles` re-creates 40–100 sparkle divs + 12 trails + 15 embers every render. Inside a function component called whenever `showParticles` flips. The particles are intentionally short-lived (1s) but each is a DOM node with a per-element style object including custom properties.
  **Suggested approach:** Use a single canvas / requestAnimationFrame loop, or at minimum gate behind `prefers-reduced-motion`.

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 195–222, 968–982
  **Category:** Inline styles that should be Tailwind/CSS
  **Issue:** Two embedded `<style>` blocks injecting `@keyframes` rules inline. The keyframes (pulseGlow, expandRing, sparkBurst, swirlTrail, floatUp) are global once injected, so multiple instances of the component re-inject the same rules.
  **Suggested approach:** Move keyframes into the global stylesheet (`index.css`) once.

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 231–239
  **Category:** Brand color mismatches
  **Issue:** `STOCK_SKIN` defaults: `primaryLight: "#FF5722"` (close to but not exactly the documented `#FF5300`), `secondaryLight: "#8B5CF6"` (purple — not in palette), `baseColor: "#2a3441"` (dark blue surface — not the documented `#1B2535`).
  **Suggested approach:** Reconcile against the brand palette decision; either align numbers or move STOCK_SKIN definition into the design tokens module.

- **Severity:** Medium
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 805
  **Category:** Hardcoded values
  **Issue:** `orbitTurns: 1 + Math.random() * 1` and other animation tuning constants (1000ms duration, 12.0 maxRadius, spinX/Y/Z ranges) baked inline.
  **Suggested approach:** Module-level `DICE_ANIM` constants object.

- **Severity:** Low
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 815–828
  **Category:** State management smells
  **Issue:** `rollHistory` is local component state capped at the last 10 rolls. Lost on dialog close. If the user wants to reference prior rolls (or the GM wants an audit trail), the state is throwaway.
  **Suggested approach:** Persist rolls into the campaign log or P.I.E. stream rather than ephemeral component state.

- **Severity:** Low
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 17–24
  **Category:** Hardcoded values
  **Issue:** `diceTypes` array duplicates `DICE_SIDES` from `diceConfig.jsx` (different shape but overlapping data). Two sources of truth for which dice the roller supports.
  **Suggested approach:** Derive from `DICE_SIDES`.

- **Severity:** Low
  **File:** src/components/dice/DiceRoller.jsx
  **Line:** 944
  **Category:** Math errors
  **Issue:** `parseInt(e.target.value) || 0` — `parseInt` without radix; also empty input produces NaN which falls through the `|| 0`. Negative modifiers via leading `-` work but the input has `type="number"` with no `min`/`max`, so a user can type `1e9` and get a huge modifier.
  **Suggested approach:** Add radix `parseInt(..., 10)`, clamp the modifier range.


##### Batch 1A-v-a Summary

**Findings by severity (this batch):**

| Severity | Count |
|---|---|
| Critical | ~13 |
| High | ~32 |
| Medium | ~38 |
| Low | ~17 |
| Cosmetic | 0 |

**Findings by primary category:**

| Category | Count |
|---|---|
| Multi-game abstraction concerns | ~10 (entire combat folder is D&D 5e) |
| Brand color mismatches | ~12 findings (~150+ literal hex occurrences in this batch alone) |
| Hardcoded values / magic numbers | ~14 |
| Math errors / DOMAIN combat correctness | ~12 |
| DOMAIN — Dice/RNG concerns | ~5 (16 Math.random in CombatDiceWindow, 1 result + 14 visual in DiceRoller, 1 in DeathSaveWindow) |
| DOMAIN — missing P.I.E. telemetry | ~3 (DiceRoller emits nothing; DeathSaveWindow emits nothing; CombatDiceWindow partial) |
| DOMAIN — GM/player permission gating | ~3 |
| State management smells | ~12 (HP/AC/feat/attribute shape soup, multiple readers per field) |
| Performance | ~6 (re-init Three.js, unmemoized queues, particle DOM churn, action bar re-render) |
| Tailwind issues — arbitrary values | ~3 |
| Inline styles that should be Tailwind/CSS | ~6 |
| Accessibility | ~7 (no focus traps on 3 modals, hover-only tooltips, unlabeled icon buttons, decorative GIFs) |
| Base44 leftovers | ~4 (CombatDiceWindow direct calls; static.wixstatic.com URLs in DiceRoller) |
| console.log/.error left in | ~3 |
| Inconsistent file naming | ~3 (.jsx files with no JSX) |
| Dead code | ~3 (DiceRoller3D.jsx empty, dual safeRender alias, isIncapacitated/getNoActionConditionName redundant) |
| Race conditions in concurrent combat updates | 1 |
| Missing error boundaries | 1 |

**Top systemic issues for THIS batch:**

1. **`/components/combat/` is `/components/dnd5e/combat/` in disguise.** Eight of the eleven files in `/combat/` are 100% D&D 5e — `actionResolver.js` (883 lines), `CombatDiceWindow.jsx` (3122 lines), `CombatActionBar.jsx` (1655 lines), `conditions.js`, `classResources.js`, `deathSaves.js`, plus the components that import them. Only `PortraitWithState.jsx`, `useTurnContext.jsx`, and `hpColor.js` are even close to system-agnostic, and even those bake-in 5e assumptions (50%/0% HP thresholds, advantage/disadvantage paired-d20 logic). To support PF2e / WoD / Mörk Borg / CY_BORG / KoB / BitD as game packs, the entire folder must be moved under `/dnd5e/` and a thin system-agnostic combat tracker built on top.

2. **17 distinct `Math.random()` calls determine combat outcomes; zero of them are auditable.** `CombatDiceWindow.jsx` rolls advantage/disadvantage paired d20s, sneak attack d6s, divine smite radiants, GWF rerolls, Stunning Strike CON saves, Lucky/DM Inspiration rerolls, and crit-extra dice — 16 inline `Math.floor(Math.random() * N) + 1` invocations. `DeathSaveWindow.jsx` rolls the death save d20 the same way. `DiceRoller.jsx` rolls the visible 3D die the same way. There is no single RNG service, no seed, no way to replay an encounter, and (per audit rule) no anti-cheat hook. P.I.E. telemetry coverage is partial: hit/miss/crit counters fire, but the actual roll value, advantage state, conditions applied, and death-save outcomes are NOT emitted as discrete dice events. The Roll Screen Overlay (DiceRoller) emits no telemetry at all.

3. **Math correctness is shaky in combat-critical paths.** `CombatActionBar.totalMaxHp = max + temp` makes the HP bar geometry wrong when temp HP changes. `actionResolver.getAttackModifier` forces DEX on Finesse weapons even when STR is higher (RAW gives the choice). `CombatDiceWindow.handleStunningStrike` skips target proficiency on the CON save (always favors attacker). `conditions.getConditionModifiers` flags `auto_fail_save` for any save against a paralyzed/petrified/stunned target instead of just STR/DEX (per RAW). `actionResolver.classifySpellEffect` parses spell descriptions with a single `\d+d\d+` regex — Magic Missile lands as 1d4 ignoring the +1 and the 3-dart count; Toll the Dead is always 1d8 even when 1d12 should fire; Spiritual Weapon drops the +mod. `GetUpcastDice` cannot collapse compound dice. None of these have unit tests.

4. **GM/player authorization is inferred from frontend state only.** `useTurnContext.actorIsGM = actor.type === "monster" || "npc"`, `CombatActionBar.isCreature` does the same, `CombatDiceWindow.isGM` is a plain prop with no validation. There is no server-trusted "is this user the GM of this campaign" check at the component layer — players can render GM-only controls by spoofing combatant type or props. Authorization belongs in Supabase RLS, not in JSX.

5. **Schema-shape soup.** Every combat file walks 3–5 alternative shapes for the same data: HP (`hit_points` / `hp` / `stats.hp`), attributes (`attributes.str` / `stats.strength` / `ability_scores.str`), feats (`feats` / `features` / `class_features` / `metadata.feats`), fighting style (`fighting_style` / `fightingStyle` / `fighting_styles` / inside `features`), AC (`armor_class` / computed via `equipped` / `equipment`). Each reader picks a different traversal order, so the same character can be missing a feat in one window and have it in another. Fix the writers, then collapse to a single canonical reader.

6. **Combat tracker UI uses three full-screen modals (DeathSaveWindow, CombatDiceWindow, DiceRoller) — none have a focus trap, dialog role, or escape-key handler.** Radix Dialog is already in the dep list; this is a one-time migration with measurable a11y impact.

**Combat math correctness — specific note.**
Combat math in this batch is *plausible* but not *verified*. There is no automated test coverage for: HP-percent rendering with temp HP, AC computation across equipped/unequipped paths, advantage/disadvantage cancellation, crit dice doubling under each homebrew rule (max-all vs max-first), Great Weapon Fighting reroll behavior, sneak attack dice on crit, divine smite undead/fiend bonus, stunning-strike CON save proficiency, upcasting compound spell expressions, finesse-weapon STR-vs-DEX selection, Bardic Inspiration die parsing, Lucky reroll keep-the-better, Uncanny Dodge halving order-of-operations vs Divine Smite bonus dice, exhaustion ladder application. Several of these have known bugs called out in this audit (Stunning Strike proficiency dropped, Finesse always-DEX, auto-fail-save targeting wrong abilities). Before launch, a dedicated combat-math test suite is non-optional.

**Dice / P.I.E. integration — specific note.**
Dice and P.I.E. are **not integrated** as the spec requires. The DiceRoller component has no `onStat`/telemetry prop and emits nothing. The DeathSaveWindow rolls a d20 locally and notifies only its parent — no P.I.E. event for death-save outcomes (success/failure/nat-1/nat-20/stabilized/dead). The CombatDiceWindow does call `onStat()` for hit/miss/crit/nat-20/nat-1/spells_cast counters but does not emit a *roll-level* event with d20 value, modifier, advantage state, conditions applied, target id, or weapon. Bardic Inspiration / Lucky / DM Inspiration usage is logged via `logCombatEvent` (campaign log) but not via P.I.E. The result: P.I.E. has counters but cannot replay or audit a specific roll. Recommend a single `pie.dice({ kind, sides, value, modifier, total, advantage, disadvantage, conditions, source, actor, target, isForced })` event emitted from a single auditable RNG service that all dice components share.

