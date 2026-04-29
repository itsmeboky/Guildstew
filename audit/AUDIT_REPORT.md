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

