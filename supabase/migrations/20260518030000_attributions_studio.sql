-- Attributions & Studio Gallery — data model for the tabbed
-- "tavern-menu" attributions page, the studio gallery, and member
-- profiles. Every field that renders on the public page or the admin
-- panel lives in one of these five tables; nothing is hardcoded in the
-- app (same lesson as homepage_banners: data-driven, RLS correct from
-- the start, tracked in the CLI migrations dir).
--
-- Five tables:
--   team_groups         — crew sections ("The Pass — Leadership", …)
--   team_members        — each person + artist flags + contact fields
--   attribution_entries — license/credit cards + "Brewed With" tech chips
--   gallery_pieces      — artist-uploaded artwork, per-piece comment lock
--   gallery_comments    — user comments on pieces
--
-- Writes are gated by the staff email-domain predicate is_staff(),
-- matching the existing admin gate (Layout / Admin.jsx isAdminUser and
-- the homepage_banners policy). NOTE: a team member signed in with a
-- personal email (e.g. itsmeboky@gmail.com) fails every staff write
-- policy — to self-manage their bio/avatar/gallery they must be signed
-- in on an @aetherianstudios.com / @guildstew.com account, or have
-- their address added to is_staff() below.
--
-- Fully idempotent: safe to re-run.

-- ---------- helper: staff predicate ----------
-- Mirrors is_admin()'s domain test. is_admin() also ORs an admin_users
-- table fallback; we keep a dedicated is_staff() so the studio policies
-- read clearly and stay decoupled from the moderator-grant table.
create or replace function public.is_staff() returns boolean
  language sql stable as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') like '%@aetherianstudios.com'
    or lower(auth.jwt() ->> 'email') like '%@guildstew.com', false);
$$;

-- ---------- tables ----------
create table if not exists team_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  group_id uuid references team_groups(id) on delete set null,
  name text not null,
  full_name text,
  role text,
  bio text,
  avatar_url text,                       -- uploaded photo; null => letter monogram
  avatar_color_1 text default '#FF5300', -- monogram gradient (editable in admin)
  avatar_color_2 text default '#ff8a4d',
  is_artist boolean default false,
  portfolio_url text,
  commissions_open boolean default false,
  commission_email text,
  business_inquiries boolean default false,
  business_email text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists attribution_entries (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('open_content','tech','assets')),
  title text not null,
  body text,
  link_url text,
  link_label text,
  tag text,                              -- for 'tech' chips (e.g. "UI", "build")
  accent text default 'orange' check (accent in ('orange','teal','salmon','navy')),
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists gallery_pieces (
  id uuid primary key default gen_random_uuid(),
  artist_member_id uuid references team_members(id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,               -- uploaded to user-assets bucket
  comments_enabled boolean default true,
  sort_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now()
);

create table if not exists gallery_comments (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid references gallery_pieces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists idx_team_members_group on team_members(group_id);
create index if not exists idx_gallery_pieces_artist on gallery_pieces(artist_member_id);
create index if not exists idx_gallery_comments_piece on gallery_comments(piece_id);

-- ---------- RLS ----------
alter table team_groups         enable row level security;
alter table team_members        enable row level security;
alter table attribution_entries enable row level security;
alter table gallery_pieces      enable row level security;
alter table gallery_comments    enable row level security;

-- team_groups: public read active, staff write
drop policy if exists tg_read on team_groups;
create policy tg_read on team_groups for select using (is_active or is_staff());
drop policy if exists tg_write on team_groups;
create policy tg_write on team_groups for all using (is_staff()) with check (is_staff());

-- team_members: public read active; staff manage all; members may update their own row
drop policy if exists tm_read on team_members;
create policy tm_read on team_members for select using (is_active or is_staff());
drop policy if exists tm_staff on team_members;
create policy tm_staff on team_members for all using (is_staff()) with check (is_staff());
drop policy if exists tm_self on team_members;
create policy tm_self on team_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- attribution_entries: public read active, staff write
drop policy if exists ae_read on attribution_entries;
create policy ae_read on attribution_entries for select using (is_active or is_staff());
drop policy if exists ae_write on attribution_entries;
create policy ae_write on attribution_entries for all using (is_staff()) with check (is_staff());

-- gallery_pieces: public read published; staff manage all; artist manages own
drop policy if exists gp_read on gallery_pieces;
create policy gp_read on gallery_pieces for select using (
  is_published or is_staff()
  or exists (select 1 from team_members tm where tm.id = artist_member_id and tm.user_id = auth.uid())
);
drop policy if exists gp_staff on gallery_pieces;
create policy gp_staff on gallery_pieces for all using (is_staff()) with check (is_staff());
drop policy if exists gp_artist_ins on gallery_pieces;
create policy gp_artist_ins on gallery_pieces for insert with check (
  exists (select 1 from team_members tm where tm.id = artist_member_id and tm.user_id = auth.uid())
);
drop policy if exists gp_artist_upd on gallery_pieces;
create policy gp_artist_upd on gallery_pieces for update using (
  exists (select 1 from team_members tm where tm.id = artist_member_id and tm.user_id = auth.uid())
);
drop policy if exists gp_artist_del on gallery_pieces;
create policy gp_artist_del on gallery_pieces for delete using (
  exists (select 1 from team_members tm where tm.id = artist_member_id and tm.user_id = auth.uid())
);

-- gallery_comments: public read (when piece visible); authenticated insert
-- only when the piece allows it; owner / artist / staff delete
drop policy if exists gc_read on gallery_comments;
create policy gc_read on gallery_comments for select using (
  exists (select 1 from gallery_pieces p where p.id = piece_id and (p.is_published or is_staff()))
);
drop policy if exists gc_insert on gallery_comments;
create policy gc_insert on gallery_comments for insert with check (
  user_id = auth.uid()
  and exists (select 1 from gallery_pieces p where p.id = piece_id and p.comments_enabled and p.is_published)
);
drop policy if exists gc_delete on gallery_comments;
create policy gc_delete on gallery_comments for delete using (
  user_id = auth.uid() or is_staff()
  or exists (select 1 from gallery_pieces p join team_members tm on tm.id = p.artist_member_id
             where p.id = piece_id and tm.user_id = auth.uid())
);
