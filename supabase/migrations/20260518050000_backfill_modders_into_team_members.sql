-- Backfill: reconcile the legacy artist_attributions roster (including
-- the "modder" entries Boky added through the old Admin → Artists &
-- Attributions tool) into the new team_members system so they render on
-- the rebuilt, data-driven Attributions "Crew" page.
--
-- WHY THIS EXISTS
--   The old public page read public.artist_attributions; the rebuild
--   switched the page to read team_members/team_groups. Nothing copied
--   the existing people across, so every contributor added via the old
--   tool — modders included — silently stopped rendering. This migration
--   carries them over.
--
-- GUARANTEES
--   * Additive & idempotent: never deletes; safe to re-run. Matched people
--     are updated IN PLACE (NULL fields filled from legacy, existing values
--     never clobbered); unmatched people are inserted once.
--   * Data-driven: it operates on whatever rows exist in artist_attributions
--     at run time, so modder rows that live only in the live DB (not in any
--     repo seed) are picked up automatically.
--   * The legacy table is left fully intact (read-only here) — see note.
--
-- DEDUPE KEY: case-insensitive, trimmed name. artist_attributions has no
--   email column (only a free-text `contact`), so name is the only match
--   key available. Near-duplicates with differing spellings (e.g. a legacy
--   "June" vs a seeded "June River") will NOT auto-merge and are flagged in
--   the run NOTICEs for Boky to merge by hand in Admin → Studio.
--
-- SCOPE: only category='studio_artist' rows (the people) are migrated.
--   category='asset_credit' rows (the game-icons.net icon artists Lorc /
--   Delapouite / Skoll, is_protected) are external license credits, NOT
--   crew — they stay in artist_attributions (preserved) and are covered on
--   the new page by the "Iconography" attribution_entry. Do not surface them
--   as team members.

-- ---------- 1. preserve legacy-only fields on team_members ----------
-- studio_artist carries `contact` and `credit_note`, which have no home in
-- team_members. Add columns rather than drop the data. `legacy_source`
-- records provenance for anyone carried over from the old tool.
alter table public.team_members add column if not exists contact       text;
alter table public.team_members add column if not exists credit_note   text;
alter table public.team_members add column if not exists legacy_source text;

-- ---------- 2. ensure a Modders group exists ----------
insert into public.team_groups (name, sort_order)
select 'The Modders — Community', 90
where not exists (
  select 1 from public.team_groups where lower(name) like '%modder%'
);

-- ---------- 3. backfill people from artist_attributions ----------
-- Guarded: if the legacy table isn't present in this environment, skip
-- cleanly. plpgsql plans each statement lazily, so the statements that
-- reference artist_attributions are never compiled when we RETURN early —
-- no "relation does not exist" error on fresh DBs.
do $do$
begin
  if to_regclass('public.artist_attributions') is null then
    raise notice 'artist_attributions absent — modder/contributor backfill skipped.';
    return;
  end if;

  -- 3a. UPDATE matched people in place. Fill NULL gaps from legacy; never
  --     overwrite an existing non-null value. is_artist is OR-ed so a legacy
  --     "Artist" label can promote, but never demote, an existing member.
  update public.team_members tm
  set role          = coalesce(tm.role, la.role),
      portfolio_url = coalesce(tm.portfolio_url, la.portfolio_url),
      contact       = coalesce(tm.contact, la.contact),
      credit_note   = coalesce(tm.credit_note, la.credit_note),
      is_artist     = tm.is_artist or coalesce(la.role ilike '%artist%', false),
      legacy_source = 'artist_attributions'
  from public.artist_attributions la
  where la.category = 'studio_artist'
    and lower(btrim(tm.name)) = lower(btrim(la.name));

  -- 3b. INSERT people with no name match. Modders (role mentions "mod") land
  --     in the Modders group; everyone else stays ungrouped and renders in
  --     the page's "The Crew" fallback bucket for Boky to file in admin.
  insert into public.team_members
    (name, role, portfolio_url, contact, credit_note,
     is_artist, group_id, legacy_source, sort_order)
  select
    la.name, la.role, la.portfolio_url, la.contact, la.credit_note,
    coalesce(la.role ilike '%artist%', false),
    case when la.role ilike '%mod%'
         then (select id from public.team_groups
               where lower(name) like '%modder%' order by sort_order limit 1)
         else null end,
    'artist_attributions',
    100 + coalesce(la.sort_order, 0)
  from public.artist_attributions la
  where la.category = 'studio_artist'
    and not exists (
      select 1 from public.team_members tm
      where lower(btrim(tm.name)) = lower(btrim(la.name))
    );

  -- 3c. File already-matched modders who are still ungrouped into the
  --     Modders group (don't touch anyone who already has a group).
  update public.team_members tm
  set group_id = (select id from public.team_groups
                  where lower(name) like '%modder%' order by sort_order limit 1)
  from public.artist_attributions la
  where la.category = 'studio_artist'
    and la.role ilike '%mod%'
    and lower(btrim(tm.name)) = lower(btrim(la.name))
    and tm.group_id is null;

  raise notice 'Modder/contributor backfill complete. Verify group assignments and merge any name-variant duplicates in Admin → Studio.';
end
$do$;
