# Secrets Sweep

Date: 2026-04-30
Branch: `claude/remove-giphy-secrets-KPUjP`
Scope: `/src`, `/functions`, `/scripts`, `/migrations`, `/generated`, root config files.

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0     |
| High     | 1     |
| Low      | 2     |

## Findings

### 1. Hardcoded Supabase project URL + anon JWT

- **File:** `src/api/supabaseClient.js:3-4`
- **Line:**
  ```js
  const supabaseUrl = 'https://ktdxhsstrgwciqkvprph.supabase.co'
  const supabaseAnonKey = '[REDACTED]'
  ```
- **Severity:** High
- **Notes:** Supabase anon keys are designed to be exposed in client bundles
  and are guarded by Row Level Security, so this is not a "live secret" leak in
  the strictest sense. However:
    - Hardcoding prevents rotation without a redeploy.
    - It bypasses the `VITE_SUPABASE_URL` env-var pattern already used by
      `src/utils/languageFonts.js`, `src/config/diceAssets.js`,
      `src/config/druidicSymbols.js`, `src/config/thievesCantSymbols.js`,
      `src/utils/storagePaths.js`, etc.
    - Anon-JWT signing keys, if exposed elsewhere, become a problem; consistent
      env-var sourcing reduces blast radius.
- **Suggested action:** Move to env vars
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) with a documented
  `.env.example`. Keep RLS strict on every table so the anon key remains safe
  even if leaked.

### 2. Hardcoded Supabase project URL fallback

- **File:** `src/config/diceAssets.js:10`
- **Line:**
  ```js
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ktdxhsstrgwciqkvprph.supabase.co";
  ```
- **Severity:** Low
- **Notes:** Public project hostname only — no credentials. Same fallback
  appears in `src/utils/languageFonts.js:23`. Public Supabase storage URLs
  (e.g. `https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/...`)
  are scattered across ~50 files; these are non-secret CDN paths.
- **Suggested action:** Optional cleanup — drop the literal fallback so the
  project URL is sourced exclusively from env. Leaving as-is is acceptable.

### 3. Inline `data:audio/wav;base64,...` chimes

- **Files:** `src/Layout.jsx:176`, `src/pages/Friends.jsx:300`
- **Severity:** Low (false positive)
- **Notes:** Tiny inline WAV used as a notification chime. Not a secret.
- **Suggested action:** Leave alone.

## Other patterns checked (no findings)

- `api_key` / `apikey` / `API_KEY` / `API-KEY` — 0 hits in `/src`.
- `Bearer ` literal / `Authorization:` header literal — 0 hits in `/src`.
- `password` / `passwd` / `pwd` / `client_secret` / `private_key` literal
  assignments — 0 hits.
- `https://user:pass@…` credentialed URLs — 0 hits (only Google Fonts query
  strings matched the regex, which are not credentials).
- `secret` keyword — only D&D game content (Secret Document, Secret Society,
  "secret language of druids", Magical Secrets, etc.). All false positives.

## .env hygiene

- `.env` and `.env.*` are listed in `.gitignore` (lines 2-3, 30).
- `git ls-files | grep -i "\.env"` returned no tracked env files.
- No `.env.example` or `.env.template` exists in the repo. Recommend adding
  one (without real values) once the supabaseClient.js fix lands, so new
  contributors know which `VITE_*` vars to set.

## Phase 1 outcome (Giphy removal)

- Deleted `src/components/chat/GiphyPicker.jsx`.
- No other source file imported `GiphyPicker` or referenced the picker,
  so no JSX, handlers, or state needed to be removed.
- No `giphy` dependency existed in `package.json` or `package-lock.json`.
- Hardcoded Giphy API key removed with the file. No other source file
  referenced the key.
- `npm run build` succeeds.
