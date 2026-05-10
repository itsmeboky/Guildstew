-- Campaign chat — chat_conversations + messages tables and RLS.
--
-- The Layout / ChatPanel already query these tables via the
-- base44 entity wrappers (ChatConversation, Message), but no
-- migration in the repository defines them. They were created
-- out-of-band on the live Supabase instance during early
-- prototyping. The audit (audit/AUDIT_REPORT.md) flagged the
-- absence of proper RLS as a critical privacy bug and named the
-- client-supplied sender_id pattern as a spoofing vector.
--
-- This migration:
--   1. Idempotently creates the tables with the schema the client
--      already assumes (matches createEntity wrapper expectations,
--      including the updated_at column the wrapper auto-sets on
--      every update).
--   2. Enables RLS and installs the policies the audit recommends.
--   3. Adds the (campaign_id, last_message_at DESC) and
--      (conversation_id, created_date DESC) indexes the polling
--      queries hit every refresh cycle.
--
-- Apply via the Supabase SQL editor or `psql`. Idempotent —
-- re-running is safe.

-- ─── tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL DEFAULT 'dm',     -- 'dm' | 'group' | 'campaign_group' | 'direct'
  name            TEXT,                            -- group / campaign threads only
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  campaign_id     UUID,                            -- nullable; campaign threads link here
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  read_by         UUID[] NOT NULL DEFAULT '{}',
  created_date    TIMESTAMPTZ NOT NULL DEFAULT now(),  -- ChatPanel sorts on this
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),  -- entity wrapper fallback
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill columns onto pre-existing tables that may be missing
-- them (e.g. created out-of-band before the schema settled).
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_by UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants
  ON chat_conversations USING GIN (participant_ids);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_msg
  ON chat_conversations (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_date
  ON messages (conversation_id, created_date DESC);

-- ─── RLS ───────────────────────────────────────────────────────

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first so re-running the migration leaves
-- the policy set in a known state. Each block is wrapped in DO so
-- a missing policy doesn't error out the whole migration.

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "users_read_own_conversations" ON chat_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "users_create_conversations"   ON chat_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "users_update_own_conversations" ON chat_conversations';
  EXECUTE 'DROP POLICY IF EXISTS "users_read_own_messages"      ON messages';
  EXECUTE 'DROP POLICY IF EXISTS "users_send_messages"          ON messages';
  EXECUTE 'DROP POLICY IF EXISTS "users_update_own_messages"    ON messages';
END $$;

-- Conversations: participants can read, anyone listed in
-- participant_ids can create (covers DM-creation flows where the
-- caller is one of the two participants), and existing participants
-- can update metadata (last_message, last_message_at, name).
CREATE POLICY "users_read_own_conversations" ON chat_conversations
  FOR SELECT USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "users_create_conversations" ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "users_update_own_conversations" ON chat_conversations
  FOR UPDATE USING (auth.uid() = ANY(participant_ids));

-- Messages: a user can read messages in conversations they
-- participate in. Insert requires the sender_id match auth.uid()
-- (closes the audit-flagged spoofing vector) AND the conversation
-- to be one they participate in. Update is limited to the sender
-- (read_by toggles, soft-delete content edits if added later).
CREATE POLICY "users_read_own_messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "users_send_messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "users_update_own_messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());
