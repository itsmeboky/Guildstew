-- Purge all Vampire: The Masquerade (World of Darkness) characters.
--
-- Phase 0 consolidation: VTM is being removed completely, including any
-- characters players/admins created against it during pre-launch testing.
-- This deletes every character row whose game_pack is the WoD pack.
--
-- FK safety: every in-repo foreign key that references characters(id)
-- (source_character_id on characters/campaign_npcs, character_id on the
-- approval flow) is declared ON DELETE SET NULL, so deleting these rows
-- nulls those back-references rather than cascading or blocking.
--
-- DESTRUCTIVE and irreversible. Apply deliberately — NOT auto-run as part
-- of the code change. Idempotent: re-running deletes nothing once clean.
--
-- Run the companion 20260622000000_remove_wod_game_pack.sql to drop the
-- pack catalog row as well. Storage assets (VTM portrait/polaroid uploads)
-- live in the storage bucket and are not removed here — clean those up via
-- the storage API separately if required.

DELETE FROM public.characters
WHERE game_pack IN ('world_of_darkness', 'vtm');
