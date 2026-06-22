-- Remove the Vampire: The Masquerade (World of Darkness) game pack.
--
-- Phase 0 consolidation, chunk 1: the VTM pack body, route, creator, and
-- catalog entry were deleted in code pending the WoD/Paradox license. This
-- migration removes any matching DB rows so the Tavern/entitlement tables
-- don't reference a pack that no longer exists in the app.
--
-- NOTE: no in-repo seed migration ever inserts a world_of_darkness row
-- (the seeds only create the D&D packs), so on a freshly-migrated DB this
-- is a no-op. It is written defensively for any environment where a VTM
-- row was inserted out-of-band during pre-launch admin testing.
--
-- Purchases/entitlements that reference game_packs(id) are removed via the
-- table's ON DELETE CASCADE. The DELETE is idempotent and safe to re-run.
--
-- DO NOT auto-run as part of the chunk-1 code change — apply deliberately.

DELETE FROM public.game_packs
WHERE slug IN ('world_of_darkness', 'vtm');
