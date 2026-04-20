-- Creator Spice → USD cashout requests.
-- Spice is debited from the creator's wallet on submission (so they
-- can't double-cashout the same balance). Admin flips status to
-- 'completed' once the off-platform payout lands; 'rejected' refunds.

CREATE TABLE IF NOT EXISTS cashout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  spice_amount BIGINT NOT NULL,
  usd_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'rejected'
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashout_requests_user ON cashout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cashout_requests_status ON cashout_requests(status);

ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_cashouts" ON cashout_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_cashouts" ON cashout_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
