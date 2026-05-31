-- Attributions & Studio — optional seed. Run ONCE, AFTER the table
-- migration (20260518030000_attributions_studio.sql).
--
-- Guarded: every block is a no-op when the target table already has
-- rows, so re-running (or running on a populated DB) changes nothing.
--
-- ⚠️  PLACEHOLDER CONTENT — Boky must edit after seeding:
--   * Member bios, avatar photos, portfolio links, and contact emails
--     are intentionally left null/blank for the team to fill in via the
--     Admin → Studio tab (or by self-managing from a company-domain
--     account).
--   * Group assignments and role labels below are a best-guess starting
--     point (the prototype's exact roster wasn't available at build
--     time) — adjust in the admin panel.
--   * Rows tagged "REPLACE:" in their body carry placeholder license
--     wording. The SRD 5.1 / 5.2, Pathfinder (ORC/Community Use), and
--     game-icons.net credits MUST be replaced with the exact required
--     license text and the specific game-icons artist names before this
--     page is considered legally complete.

-- ---------- team_groups ----------
insert into team_groups (name, sort_order)
select v.name, v.sort_order
from (values
  ('The Pass — Leadership', 1),
  ('The Kitchen — Creative', 2),
  ('Front of House — Reach', 3)
) v(name, sort_order)
where not exists (select 1 from team_groups);

-- ---------- team_members ----------
-- Roster, roles, groups, monogram colors, and bios match the prototype.
-- Emails / portfolio links / avatar photos are left null for the team to
-- fill in (via Admin → Studio, or self-managing from a company account).
insert into team_members
  (name, full_name, role, group_id, is_artist, commissions_open,
   business_inquiries, bio, avatar_color_1, avatar_color_2, sort_order)
select
  m.name, m.full_name, m.role,
  (select id from team_groups g where g.name = m.group_name),
  m.is_artist, m.commissions_open, m.business_inquiries, m.bio, m.c1, m.c2, m.sort_order
from (values
  ('Boky', 'Bojana Milenkovic', 'Creative Director · CEO · Programmer · Artist', 'The Pass — Leadership', true, true, true,
     'Head chef of the whole kitchen — sets the menu, writes the code, and paints when no one is looking.', '#FF5300', '#ff8a4d', 1),
  ('Brandon Hazell', null, 'Chief Financial Officer', 'The Pass — Leadership', false, false, true,
     'Keeps the coffers honest and the spreadsheets balanced so the rest of the kitchen can build weird without burning the place down.', '#1B2535', '#3a4a63', 2),
  ('Chris Brink', null, 'Lore Master', 'The Kitchen — Creative', false, false, false,
     'Keeper of the world bible. If it has a backstory, a faction, or a forgotten god, Chris probably wrote it.', '#04685A', '#0a9c87', 1),
  ('Olivia Hardy', null, 'Artist', 'The Kitchen — Creative', true, true, false,
     'Paints the faces of Guildstew, from the mascot grinning at the top of this page to the monsters lurking in your campaign.', '#F8A47C', '#ff9d6e', 2),
  ('June River', null, 'Artist', 'The Kitchen — Creative', true, false, false,
     'Concept art and splash frames — the reason a nat 20 actually feels like a crit.', '#7c5cff', '#a78bfa', 3),
  ('Christopher Wylie', null, 'Marketing Manager', 'Front of House — Reach', false, false, false,
     'Tells the world Guildstew exists — loudly, cleverly, and always on-brand.', '#d4380d', '#ff7847', 1),
  ('Skylar LaBounty', null, 'Outreach Coordinator', 'Front of House — Reach', false, false, false,
     'Builds bridges to the community one conversation at a time.', '#04685A', '#5bb3a3', 2),
  ('Joshua Stanford', null, 'Outreach Coordinator', 'Front of House — Reach', false, false, false,
     'Outreach and partnerships — the friendly face in your inbox.', '#1B2535', '#04685A', 3)
) m(name, full_name, role, group_name, is_artist, commissions_open, business_inquiries, bio, c1, c2, sort_order)
where not exists (select 1 from team_members);

-- ---------- attribution_entries ----------
insert into attribution_entries
  (section, title, body, link_url, link_label, tag, accent, sort_order)
select v.section, v.title, v.body, v.link_url, v.link_label, v.tag, v.accent, v.sort_order
from (values
  -- Open Game Content (license cards). SRD wording matches the prototype;
  -- the Pathfinder card stays flagged (REPLACE:) until the exact ORC /
  -- Community Use notice + product-identity list is confirmed.
  ('open_content', 'System Reference Document 5.1',
     '2014-edition content from the SRD 5.1, © Wizards of the Coast LLC, under the Creative Commons Attribution 4.0 International License (CC-BY-4.0). Inclusion gated strictly to SRD coverage.',
     'https://www.dndbeyond.com/srd', 'dndbeyond.com/srd', null, 'orange', 1),
  ('open_content', 'System Reference Document 5.2',
     '2024-edition content from the SRD 5.2, © Wizards of the Coast LLC, under CC-BY-4.0.',
     'https://www.dndbeyond.com/srd', 'dndbeyond.com/srd', null, 'teal', 2),
  ('open_content', 'Pathfinder Second Edition',
     'REPLACE: Pathfinder content used under Paizo''s ORC License. "Pathfinder" and associated marks and logos are trademarks of Paizo Inc. and are used under license / the Community Use Policy where applicable — confirm the exact notice + product-identity list.',
     'https://paizo.com/community/communityuse', 'Paizo Community Use', null, 'navy', 3),
  ('open_content', 'A note on homebrew',
     'Community creations in the Brewery are owned by their authors. Guildstew only ships official content covered by the licenses above.',
     null, null, null, 'salmon', 4),

  -- The Tech Pantry (chips: "Title · tag")
  ('tech', 'React',          null, 'https://react.dev',             'react.dev',        'UI',         'navy',   1),
  ('tech', 'Vite',           null, 'https://vitejs.dev',            'vitejs.dev',       'build',      'salmon', 2),
  ('tech', 'TailwindCSS',    null, 'https://tailwindcss.com',       'tailwindcss.com',  'styles',     'teal',   3),
  ('tech', 'shadcn/ui',      null, 'https://ui.shadcn.com',         'ui.shadcn.com',    'components', 'navy',   4),
  ('tech', 'TanStack Query', null, 'https://tanstack.com/query',    'tanstack.com',     'data',       'orange', 5),
  ('tech', 'React Router',   null, 'https://reactrouter.com',       'reactrouter.com',  'routing',    'salmon', 6),
  ('tech', 'Three.js',       null, 'https://threejs.org',           'threejs.org',      '3D dice',    'teal',   7),
  ('tech', 'Framer Motion',  null, 'https://www.framer.com/motion', 'framer.com',       'animation',  'navy',   8),
  ('tech', 'Supabase',       null, 'https://supabase.com',          'supabase.com',     'backend',    'orange', 9),

  -- Type, Art & Sundries (credit cards). Iconography stays flagged until
  -- the exact game-icons.net artist list is filled in.
  ('assets', 'Cream',
     'Our display typeface, designed by Philip Trautmann of Shaped Fonts.',
     'https://shapedfonts.com/about/', 'shapedfonts.com', null, 'teal', 1),
  ('assets', '3D Dice Models',
     'Polyhedral dice modeled by Boky, rendered in Three.js.',
     null, null, null, 'orange', 2),
  ('assets', 'Iconography',
     'REPLACE: Interface icons by Lucide (ISC). Game & ability icons from game-icons.net under CC-BY-3.0 — by Lorc, Delapouite, and other contributors. List the exact artists whose icons ship.',
     'https://game-icons.net', 'game-icons.net', null, 'salmon', 3),
  ('assets', 'Motion & Templates',
     'Select motion graphics and graphic templates sourced from Envato under its standard license.',
     'https://envato.com', 'Envato', null, 'navy', 4),
  ('assets', 'Placeholder Imagery',
     'Temporary art from Unsplash under its standard license, pending replacement with original work.',
     'https://unsplash.com', 'Unsplash', null, 'orange', 5)
) v(section, title, body, link_url, link_label, tag, accent, sort_order)
where not exists (select 1 from attribution_entries);
