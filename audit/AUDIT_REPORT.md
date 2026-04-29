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

