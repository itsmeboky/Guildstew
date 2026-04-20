-- Guild Hall Part 2: active training progress on characters.
--
-- Stores one in-flight training row per character: { current_training,
-- type, weeks_completed, weeks_required, cost_paid, total_cost,
-- started_at }. Empty object when the character has nothing active.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS training_progress JSONB NOT NULL DEFAULT '{}'::jsonb;
