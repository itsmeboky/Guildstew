-- Purge all Vampire: The Masquerade (World of Darkness) characters.
--
-- VTM was admin-only / pre-license; any character whose game_pack is the
-- WoD pack is test data and is being deleted intentionally. The pack itself
-- was removed in the Phase 0 chunk-1 work; this finalizes the data side.
--
-- FK safety: every in-repo foreign key that references characters(id)
-- (source_character_id on characters and campaign_npcs, character_id on the
-- approval flow) is declared ON DELETE SET NULL — non-blocking — so deleting
-- these rows nulls those back-references rather than cascading or erroring.
-- Campaign copies of VTM characters also carry game_pack = 'world_of_darkness'
-- (with source_character_id pointing at the original), so the single predicate
-- below removes both library originals and their campaign copies. No ordered
-- dependent-deletion is required.
--
-- DESTRUCTIVE and irreversible. Apply deliberately in the Supabase SQL editor
-- — NOT auto-run as part of the code change. Idempotent: a safe no-op once no
-- world_of_darkness rows remain.
--
-- Companion: 20260622000000_remove_wod_game_pack.sql drops the pack catalog
-- row. Storage assets (VTM portrait/polaroid uploads) live in the storage
-- bucket and are not removed here — clean those up via the storage API if
-- required.

DELETE FROM public.characters
WHERE game_pack IN ('world_of_darkness', 'vtm');
