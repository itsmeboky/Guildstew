# Character Creator Visual Reference

This folder holds the prototype design system for the character creator
visual port (D&D 2014 + 2024). Files here are **reference only** —
do NOT import them. They use a Babel-in-browser pattern
(`window.X` globals) that doesn't work in the Vite build.

The actual port lives in:

- `src/styles/character-creator.css` — global styles + CSS variables
- `src/components/characterCreator/chrome/` — shell components (built
  in Phase B)
- `src/components/characterCreator/*Step*.jsx` — per-step components
  (visually ported in Phase C, one step at a time)

When porting a step, read the corresponding `step-*.jsx` here for the
intended structure, layout, and visual treatment. Translate it to:

- Tailwind utility classes for layout/spacing
- The specialty CSS classes from `character-creator.css` for ornament
- The chrome components from `chrome/` for shared building blocks
- The app's existing data layer (Supabase, base44, TanStack Query)
  for ALL data — never the prototype's mock `data.jsx`

The `data.jsx` file is also useful for the per-class theme palettes
that drive the animated page tint (Phase C2 work).
