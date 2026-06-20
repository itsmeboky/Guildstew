-- Assets-section credits reconciliation, part 2.
--
-- Two fixes the earlier seed edit could NOT deliver, because the seed is
-- guarded (`where not exists (...)`) and therefore a no-op once the
-- attribution_entries table already has rows in the live DB:
--
--   1. Iconography card still shows the original "REPLACE:" placeholder.
--      Force it to the Creative Commons Attribution 3.0 wording Boky
--      supplied, with the inline "Creative Commons" link, and drop the
--      "⚑ Replace with exact license wording" flag (the page raises that
--      flag whenever the body starts with "REPLACE:").
--
--   2. Add a "Modders" credit card to the "Type, Art & Sundries" (assets)
--      tab, positioned right after "Placeholder Imagery" (sort_order 6).
--      Its text is built at run time from the legacy artist_attributions
--      roster — every person whose role mentions "mod" — so it reflects
--      whatever Boky actually entered through the old admin tool.
--
-- Idempotent and additive: re-running refreshes both rows; nothing is
-- deleted. The Modders card is a STATIC SNAPSHOT of the roster at run
-- time — re-run this migration (or edit the card in Admin → Studio) when
-- the modder list changes.

-- ---------- 1. Iconography → exact CC-BY 3.0 wording ----------
update public.attribution_entries
set body = 'Some content used in this project is licensed under the Creative Commons Attribution 3.0 License, which allows use and modification of the material as long as proper credit is provided to the original creator. More information is available from Creative Commons.',
    link_url   = 'https://creativecommons.org/licenses/by/3.0/legalcode.en',
    link_label = 'Creative Commons'
where section = 'assets' and title = 'Iconography';

-- ---------- 2. Modders credit card (auto-pulled from legacy roster) ----------
-- Guarded: skip cleanly if the legacy table isn't present, or if no modder
-- rows exist (don't create an empty card).
do $do$
declare
  v_body text;
begin
  if to_regclass('public.artist_attributions') is null then
    raise notice 'artist_attributions absent — Modders credit card skipped.';
    return;
  end if;

  select 'Community modding and content contributions by '
         || string_agg(
              la.name || coalesce(' (' || la.role || ')', ''),
              ', ' order by la.sort_order, la.name)
         || '.'
    into v_body
  from public.artist_attributions la
  where la.role ilike '%mod%';

  if v_body is null then
    raise notice 'No modder rows (role ILIKE ''%%mod%%'') in artist_attributions — Modders card not created.';
    return;
  end if;

  if exists (
    select 1 from public.attribution_entries
    where section = 'assets' and title = 'Modders'
  ) then
    update public.attribution_entries
    set body = v_body, accent = 'teal', sort_order = 6, is_active = true
    where section = 'assets' and title = 'Modders';
  else
    insert into public.attribution_entries
      (section, title, body, accent, sort_order)
    values
      ('assets', 'Modders', v_body, 'teal', 6);
  end if;

  raise notice 'Modders credit card written. Re-run this migration or edit in Admin → Studio to refresh the snapshot.';
end
$do$;
