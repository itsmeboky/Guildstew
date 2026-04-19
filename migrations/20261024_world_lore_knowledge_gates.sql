-- Knowledge gates on World Lore entries. Each entry can carry a
-- JSONB array of `{ id, type, skill|ability|language, dc,
-- gated_content, gated_section_id, failure_text }` objects. The
-- GatedEntryView in the app walks them in order before revealing
-- the content.
--
-- Other columns referenced by this feature already exist:
--   world_lore_entries.language
--   world_lore_entries.gist
--   world_lore_entries.decipher_dc
--   campaigns.skill_check_retry_policy
--   reveal_attempts (full table + RLS policies)
--
-- Idempotent. Run via the Supabase SQL editor.

ALTER TABLE world_lore_entries
  ADD COLUMN IF NOT EXISTS knowledge_gates JSONB DEFAULT '[]'::jsonb;
