-- Support surfaces: user-filed tickets with admin replies, plus
-- admin-managed FAQ and documentation content.
--
-- Admin moderation (status changes, replies, FAQ / docs management)
-- reuses the email-domain admin gate. Consumer reads on FAQ / docs
-- are open to anyone with `is_published = true`.

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  screenshot_urls TEXT[] DEFAULT '{}',

  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documentation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_entries(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_docs_category ON documentation_pages(category, sort_order);

ALTER TABLE support_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_pages  ENABLE ROW LEVEL SECURITY;

-- Users own their tickets and their own replies; reading a ticket's
-- message thread requires owning the ticket OR being an admin.
CREATE POLICY "users_manage_own_tickets" ON support_tickets
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_read_own_messages" ON ticket_messages
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

CREATE POLICY "users_write_own_messages" ON ticket_messages
  FOR INSERT WITH CHECK (author_id = auth.uid());

-- FAQ + docs: public read when published, admin writes.
CREATE POLICY "anyone_read_faq"  ON faq_entries         FOR SELECT USING (is_published = true);
CREATE POLICY "anyone_read_docs" ON documentation_pages FOR SELECT USING (is_published = true);

-- Admin moderation — mirrors the email-domain gate used elsewhere.
DO $$
DECLARE
  admin_clause TEXT := $clause$
    lower(auth.jwt() ->> 'email') = 'itsmeboky@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@aetherianstudios.com'
    OR lower(auth.jwt() ->> 'email') LIKE '%@guildstew.com'
  $clause$;
BEGIN
  EXECUTE format('CREATE POLICY "admins_manage_tickets" ON support_tickets FOR ALL USING (%s)', admin_clause);
  EXECUTE format('CREATE POLICY "admins_manage_ticket_messages" ON ticket_messages FOR ALL USING (%s)', admin_clause);
  EXECUTE format('CREATE POLICY "admins_manage_faq" ON faq_entries FOR ALL USING (%s)', admin_clause);
  EXECUTE format('CREATE POLICY "admins_manage_docs" ON documentation_pages FOR ALL USING (%s)', admin_clause);
END $$;
