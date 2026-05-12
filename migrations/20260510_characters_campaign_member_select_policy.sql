-- ═════════════════════════════════════════════════════════════
--   Guildstew — characters: campaign-member SELECT policy
--
--   PROBLEM
--   --------
--   The Adventurers panel of CampaignPlayerPanel renders one card
--   per entry in `players` (CampaignPlayerPanel.jsx:686), where each
--   row is { ...profile, character }. The character is found via
--   `characters.find(c => c.created_by === profile.email && c.campaign_id === campaignId)`
--   from the `Character.filter({ campaign_id })` query. The query
--   itself is `select('*')`, so no field is being dropped at the
--   client layer — `profile_avatar_url` is selected like every
--   other column.
--
--   The placeholder "?" portrait fires when `players[i].character`
--   is undefined — i.e., that other player's character row was not
--   returned by the SELECT. Today the `characters` table has no
--   migration-defined SELECT policy that lets a campaign member
--   read other members' characters in the same campaign, so the
--   row is silently filtered by RLS. Owner-only reads are the
--   default; cross-player reads inside one campaign do not work,
--   which breaks the Adventurers panel for every campaign with
--   more than one player.
--
--   FIX
--   ---
--   Add a SELECT policy on `characters` that lets you read a row
--   when:
--     (a) you own it (auth.uid() = user_id) — already covered by
--         the existing owner policy, included here for clarity so
--         the new policy alone is sufficient if the owner policy
--         ever drifts.
--     (b) the character is attached to a campaign you're in:
--           - you are the campaign's game_master_id, OR
--           - your auth.uid() is in campaigns.player_ids.
--
--   Cross-campaign reads stay blocked: a user not in `player_ids`
--   and not the GM gets nothing back — same as today.
--
--   Co-DMs are NOT included here. The application treats
--   `co_dm_ids` as a plain JS array (Layout.jsx:308, GMSidebarSettings.jsx:63)
--   but no migration exposes its on-disk type, so we don't know
--   whether `@>` (JSONB) or `= ANY()` (text[]) is the correct
--   operator. A co-DM who is also in player_ids reads fine through
--   the player_ids branch; a pure co-DM (rare) would not. Tightening
--   here is safer than guessing the wrong operator and silently
--   widening reads or erroring at policy-eval time. Follow-up
--   migration can add the co-DM branch once the column type is
--   confirmed.
--
--   PRECEDENT
--   ---------
--   This mirrors `campaign_members_read_conditions` at
--   20261025_campaign_conditions.sql:33-40 — same membership join,
--   same JSONB containment operator on player_ids.
--
--   Idempotent. Apply via Supabase dashboard SQL editor.
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_members_read_characters" ON public.characters;
CREATE POLICY "campaign_members_read_characters" ON public.characters
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      campaign_id IS NOT NULL
      AND campaign_id IN (
        SELECT id FROM public.campaigns
        WHERE game_master_id = auth.uid()
          OR player_ids @> to_jsonb(auth.uid()::text)
      )
    )
  );

NOTIFY pgrst, 'reload schema';
