-- Backfill legacy flat companion columns into the canonical
-- characters.companions[] rich array.
--
-- Context: the character creator's CompanionPicker writes companions[]
-- (entries shaped like CompanionCard expects: name / species /
-- creature_type / ac / hp / speed / image / description / abilities /
-- is_custom / needs_gm_approval). Older characters predate the picker
-- and only have the deprecated flat columns companion_name /
-- companion_image / companion_background. This migration copies that
-- flat data into a single companions[] entry so every display path
-- (CompanionCard, buildCampaignCompanions, the GM/Player campaign
-- panels) renders them without relying on the legacy read fallbacks.
--
-- SAFETY:
--   * Non-destructive: only fills rows where companions is empty, so a
--     character already migrated (or edited via the picker) is never
--     overwritten.
--   * The deprecated flat columns are intentionally LEFT IN PLACE.
--     Dropping them is a separate, later cleanup once the legacy read
--     fallbacks are removed.
--
-- COLUMN TYPE ASSUMPTION — CONFIRM BEFORE RUNNING:
--   No repo migration defines characters.companions, so this assumes it
--   is JSONB (the app reads it as Array.isArray(char.companions) and
--   jsonb_array_length is used below). If it is actually a text[]/json
--   column, adjust the jsonb_* helpers accordingly.
--
-- HOW TO RUN: paste into the Supabase SQL editor. Do NOT auto-run as
-- part of an app deploy.

update characters
set companions = jsonb_build_array(
  jsonb_build_object(
    'id', 'comp_' || substr(md5(random()::text), 1, 8),
    'name', companion_name,
    'description', coalesce(companion_background, ''),
    'image', companion_image,
    'species', '',
    'creature_type', 'pet',
    'ac', null,
    'hp', null,
    'speed', null,
    'abilities', '[]'::jsonb,
    'is_custom', false,
    'needs_gm_approval', false
  )
)
where companion_name is not null
  and companion_name <> ''
  and (
    companions is null
    or jsonb_array_length(coalesce(companions, '[]'::jsonb)) = 0
  );
