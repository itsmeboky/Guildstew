-- ═════════════════════════════════════════════════════════════
--   Display titles
--
--   `user_profiles.display_title` already exists (added in
--   20261115_schema_fixes.sql). This migration adds the catalog
--   + grant table that powers the title selector and the admin
--   panel's "Grant Title" form.
--
--   Catalog rows describe each title (label, unlock rule, scope).
--   Grant rows record explicit awards — needed for the titles that
--   can't be derived from existing state (Founding Backer, Chef de
--   Cuisine, admin-issued one-offs).
-- ═════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS title_catalog (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  description  TEXT,
  unlock_rule  TEXT NOT NULL,
  -- 'default'  → everyone has it
  -- 'tier'     → unlocked at a subscription tier (see unlock_value)
  -- 'guild_member' / 'guild_owner'
  -- 'manual'   → must be granted via user_titles
  unlock_value TEXT,
  is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
  -- True for titles that should never be re-granted automatically
  -- (e.g. Founding Backer — Kickstarter exclusive, manual only).
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_titles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  title_id    TEXT NOT NULL REFERENCES title_catalog(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by  UUID,
  note        TEXT,
  UNIQUE (user_id, title_id)
);

CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE title_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='title_catalog' AND policyname='title_catalog_read') THEN
    CREATE POLICY title_catalog_read ON title_catalog FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_titles' AND policyname='user_titles_read_own') THEN
    -- Public read so other users can see your earned titles on your profile.
    CREATE POLICY user_titles_read_own ON user_titles FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_titles' AND policyname='user_titles_admin_write') THEN
    -- Writes are admin-only at the app layer; we leave the policy
    -- permissive so the service role can grant titles, and rely on
    -- the admin gate in the React panel.
    CREATE POLICY user_titles_admin_write ON user_titles FOR ALL USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- ── Seed catalog ──────────────────────────────────────────────
INSERT INTO title_catalog (id, label, description, unlock_rule, unlock_value, is_exclusive, sort_order) VALUES
  ('wanderer',       'Wanderer',       'Default for new arrivals.',                            'default',      NULL,         FALSE, 0),
  ('player',         'Player',         'Anyone who plays the game.',                           'default',      NULL,         FALSE, 1),
  ('artist',         'Artist',         'For the creatively-inclined.',                         'default',      NULL,         FALSE, 2),
  ('game_master',    'Game Master',    'For those who run the table.',                         'default',      NULL,         FALSE, 3),
  ('adventurer',     'Adventurer',     'Unlocked when you reach the Adventurer tier.',         'tier',         'adventurer', FALSE, 10),
  ('veteran',        'Veteran',        'Unlocked when you reach the Veteran tier.',           'tier',         'veteran',    FALSE, 11),
  ('guild_member',   'Guild Member',   'Unlocked by joining a guild.',                         'guild_member', NULL,         FALSE, 20),
  ('guild_leader',   'Guild Leader',   'Unlocked by founding a guild.',                        'guild_owner',  NULL,         FALSE, 21),
  ('chef_de_cuisine','Chef de Cuisine','For Aetherian Studios staff and core developers.',    'manual',       NULL,         TRUE,  90),
  ('founding_backer','Founding Backer','Kickstarter backer — never granted again.',            'manual',       NULL,         TRUE,  91)
ON CONFLICT (id) DO UPDATE SET
  label        = EXCLUDED.label,
  description  = EXCLUDED.description,
  unlock_rule  = EXCLUDED.unlock_rule,
  unlock_value = EXCLUDED.unlock_value,
  is_exclusive = EXCLUDED.is_exclusive,
  sort_order   = EXCLUDED.sort_order;
