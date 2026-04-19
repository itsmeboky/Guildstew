-- Custom campaign conditions (Tier 3)
-- GMs define homebrew status effects scoped to a campaign. These
-- surface alongside the standard 14 5e conditions in every condition
-- picker (monster actions, class features, spell effects, the
-- combat-UI manual condition apply button) and feed into the same
-- mechanical engine conditions.js already drives.

CREATE TABLE IF NOT EXISTS campaign_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f59e0b',
  icon TEXT DEFAULT 'flame',
  mechanical JSONB DEFAULT '[]'::jsonb,
  end_condition TEXT DEFAULT 'save_each_turn',
  save_ability TEXT,
  save_dc_source TEXT DEFAULT 'fixed',
  save_dc_fixed INTEGER,
  damage_per_turn TEXT,
  damage_type TEXT,
  damage_trigger TEXT DEFAULT 'start_of_turn',
  stacking BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_conditions_campaign
  ON campaign_conditions(campaign_id);

ALTER TABLE campaign_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_members_read_conditions" ON campaign_conditions;
CREATE POLICY "campaign_members_read_conditions" ON campaign_conditions
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE game_master_id = auth.uid()
      OR player_ids @> to_jsonb(auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "gm_manage_conditions" ON campaign_conditions;
CREATE POLICY "gm_manage_conditions" ON campaign_conditions
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE game_master_id = auth.uid()
    )
  );
