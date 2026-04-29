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
