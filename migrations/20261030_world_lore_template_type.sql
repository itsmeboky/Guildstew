-- Template type on world-lore entries. The column is already written
-- to by EntryForm (initial.template_type), but we add it here with
-- IF NOT EXISTS so fresh environments pick it up.

ALTER TABLE world_lore_entries
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'freeform';
