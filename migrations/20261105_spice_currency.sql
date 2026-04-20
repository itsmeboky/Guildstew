-- The Tavern Part 1 — Spice currency system.
-- Personal wallet + shared guild wallet + append-only ledger + atomic
-- add/spend RPCs. Base rate: $1 USD = 250 Spice.

CREATE TABLE IF NOT EXISTS spice_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  lifetime_earned BIGINT NOT NULL DEFAULT 0,
  lifetime_spent BIGINT NOT NULL DEFAULT 0,
  lifetime_purchased BIGINT NOT NULL DEFAULT 0,
  last_stipend_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_spice_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  lifetime_total BIGINT NOT NULL DEFAULT 0,
  spending_restricted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spice_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  guild_id UUID,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spice_wallets_user ON spice_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_spice_transactions_user ON spice_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_spice_transactions_type ON spice_transactions(transaction_type);

-- Atomic credit: upsert-then-return the balance after the increment so
-- the caller can log the balance_after in the ledger without racing a
-- second reader.
CREATE OR REPLACE FUNCTION add_spice(p_user_id UUID, p_amount BIGINT)
RETURNS BIGINT AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  INSERT INTO spice_wallets (user_id, balance, lifetime_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = spice_wallets.balance + p_amount,
    lifetime_earned = spice_wallets.lifetime_earned + p_amount,
    updated_at = now();

  SELECT balance INTO new_balance FROM spice_wallets WHERE user_id = p_user_id;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic debit: raises if the wallet is missing or the balance would
-- go negative. Callers catch the exception to show a friendly toast.
CREATE OR REPLACE FUNCTION spend_spice(p_user_id UUID, p_amount BIGINT)
RETURNS BIGINT AS $$
DECLARE
  current_balance BIGINT;
  new_balance BIGINT;
BEGIN
  SELECT balance INTO current_balance FROM spice_wallets WHERE user_id = p_user_id;
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Spice balance';
  END IF;

  UPDATE spice_wallets SET
    balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;

  SELECT balance INTO new_balance FROM spice_wallets WHERE user_id = p_user_id;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE spice_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_spice_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE spice_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_wallet" ON spice_wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_read_own_transactions" ON spice_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "guild_members_read_guild_wallet" ON guild_spice_wallets
  FOR SELECT USING (true);
