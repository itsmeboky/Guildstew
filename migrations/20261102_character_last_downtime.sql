-- Guild Hall Part 2: last downtime activity ledger.
--
-- Each entry on the Downtime panel stamps this field with
-- { activity_id, label, category, at } so the GM can see at a
-- glance who did what between sessions. Empty object when the
-- character hasn't taken a downtime.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS last_downtime JSONB NOT NULL DEFAULT '{}'::jsonb;
