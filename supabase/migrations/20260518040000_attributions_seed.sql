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
-- monogram colors use the brand palette; bios/emails/portfolio/avatar
-- left null for the team to fill in.
insert into team_members
  (name, full_name, role, group_id, is_artist, business_inquiries,
   avatar_color_1, avatar_color_2, sort_order)
select
  m.name, m.full_name, m.role,
  (select id from team_groups g where g.name = m.group_name),
  m.is_artist, m.business_inquiries, m.c1, m.c2, m.sort_order
from (values
  ('Boky',              'Bojana "Boky" Milenkovic', 'Founder & Creative Director', 'The Pass — Leadership',  true,  true,  '#FF5300', '#ff8a4d', 1),
  ('Brandon Hazell',    null,                       'Co-Founder & Operations',     'The Pass — Leadership',  false, true,  '#04685A', '#3aa191', 2),
  ('Chris Brink',       null,                       'Engineering Lead',            'The Pass — Leadership',  false, false, '#1B2535', '#39506e', 3),
  ('Olivia Hardy',      null,                       'Artist',                      'The Kitchen — Creative', true,  false, '#F8A47C', '#ffc6a8', 1),
  ('June River',        null,                       'Artist',                      'The Kitchen — Creative', true,  false, '#FF5300', '#ff8a4d', 2),
  ('Christopher Wylie', null,                       'Writer',                      'The Kitchen — Creative', false, false, '#04685A', '#3aa191', 3),
  ('Skylar LaBounty',   null,                       'Community',                   'Front of House — Reach', false, false, '#F8A47C', '#ffc6a8', 1),
  ('Joshua Stanford',   null,                       'Marketing',                   'Front of House — Reach', false, false, '#1B2535', '#39506e', 2)
) m(name, full_name, role, group_name, is_artist, business_inquiries, c1, c2, sort_order)
where not exists (select 1 from team_members);

-- ---------- attribution_entries ----------
insert into attribution_entries
  (section, title, body, link_url, link_label, tag, accent, sort_order)
select v.section, v.title, v.body, v.link_url, v.link_label, v.tag, v.accent, v.sort_order
from (values
  -- Open Content (license cards) — body text is PLACEHOLDER, replace with exact wording.
  ('open_content', 'System Reference Document 5.1',
     'REPLACE: include the exact CC-BY 4.0 attribution required for SRD 5.1 — "System Reference Document 5.1" © Wizards of the Coast LLC, CC-BY 4.0.',
     'https://www.dndbeyond.com/srd', 'D&D Beyond SRD', null, 'orange', 1),
  ('open_content', 'System Reference Document 5.2',
     'REPLACE: include the exact CC-BY 4.0 attribution required for SRD 5.2 — "System Reference Document 5.2" © Wizards of the Coast LLC, CC-BY 4.0.',
     'https://www.dndbeyond.com/srd', 'D&D Beyond SRD', null, 'orange', 2),
  ('open_content', 'Pathfinder Second Edition',
     'REPLACE: include the exact ORC License notice and the Paizo Community Use / product-identity list required for Pathfinder Second Edition content.',
     'https://paizo.com/community/communityuse', 'Paizo Community Use', null, 'teal', 3),

  -- Brewed With (tech chips)
  ('tech', 'React',        null, 'https://react.dev',            'react.dev',        'framework', 'navy',   1),
  ('tech', 'Vite',         null, 'https://vitejs.dev',           'vitejs.dev',       'build',     'salmon', 2),
  ('tech', 'TailwindCSS',  null, 'https://tailwindcss.com',      'tailwindcss.com',  'styling',   'teal',   3),
  ('tech', 'shadcn/ui',    null, 'https://ui.shadcn.com',        'ui.shadcn.com',    'UI',        'navy',   4),
  ('tech', 'TanStack Query', null, 'https://tanstack.com/query', 'tanstack.com',     'data',      'orange', 5),
  ('tech', 'React Router', null, 'https://reactrouter.com',      'reactrouter.com',  'routing',   'salmon', 6),
  ('tech', 'Three.js',     null, 'https://threejs.org',          'threejs.org',      '3D',        'teal',   7),
  ('tech', 'Framer Motion', null, 'https://www.framer.com/motion', 'framer.com',     'motion',    'navy',   8),
  ('tech', 'Supabase',     null, 'https://supabase.com',         'supabase.com',     'backend',   'orange', 9),

  -- Art & Assets (credit cards)
  ('assets', 'Cream',
     'Display typeface by Philip Trautmann.',
     'https://shapedfonts.com/about/', 'ShapedFonts', null, 'salmon', 1),
  ('assets', '3D Dice Models',
     'Dice models by Boky (Aetherian Studios).',
     null, null, null, 'orange', 2),
  ('assets', 'Iconography',
     'REPLACE: Lucide icons (ISC License) and game-icons.net icons (CC-BY 3.0) — list the specific game-icons.net artist names whose icons are used.',
     'https://game-icons.net', 'game-icons.net', null, 'teal', 3),
  ('assets', 'Motion & Templates',
     'Motion graphics and templates licensed via Envato.',
     'https://envato.com', 'Envato', null, 'navy', 4),
  ('assets', 'Placeholder Imagery',
     'Placeholder photography from Unsplash.',
     'https://unsplash.com', 'Unsplash', null, 'salmon', 5)
) v(section, title, body, link_url, link_label, tag, accent, sort_order)
where not exists (select 1 from attribution_entries);
