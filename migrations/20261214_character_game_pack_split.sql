-- ═════════════════════════════════════════════════════════════
--   Characters — game_pack column + dnd5e -> dnd5e_2014 backfill
--
--   The character creator is splitting the single `dnd5e` game
--   pack into two siblings — `dnd5e_2014` and `dnd5e_2024` — so
--   each edition runs against its own data adapter, validators
--   and per-step UI. No fall-through, no mixed-edition characters.
--
--   Every existing character in the DB was created when only
--   2014 rules were in code, so their reality IS 2014. The
--   backfill is deterministic — no user prompt — and labels
--   that truth. After this migration, application code can
--   assume `game_pack` is always non-null and is one of the
--   gamePacks.js ids.
--
--   The column default lands on `dnd5e_2014` so the back-compat
--   alias path in src/data/games/index.js (`dnd5e` -> `dnd5e_2014`)
--   keeps working for any code path that still writes `dnd5e`
--   while the JS-side rename is in progress.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS game_pack TEXT NOT NULL DEFAULT 'dnd5e_2014';

-- Backfill: any existing row whose column was just added gets the
-- default; any pre-existing row (if a column with this name ever
-- existed before) holding the legacy single id is canonicalised.
UPDATE characters
  SET game_pack = 'dnd5e_2014'
  WHERE game_pack IS NULL OR game_pack = 'dnd5e';

CREATE INDEX IF NOT EXISTS idx_characters_game_pack
  ON characters(game_pack);

NOTIFY pgrst, 'reload schema';
