import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

/**
 * Realtime subscription on a single campaign row.
 *
 * Subscribes to postgres_changes UPDATE events on
 * `public.campaigns` filtered by id, pushes payload.new directly
 * into the React Query cache for ['campaign', campaignId]. The
 * polling refetchInterval on the original useQuery becomes a slow
 * resilience fallback (e.g. 5s) — Realtime carries the live
 * updates, polling re-syncs after disconnect/reconnect.
 *
 * Why this lives here, not inside the existing presence channel:
 *   The presence channel at GMPanel.jsx:261 / CampaignPlayerPanel.jsx:386
 *   uses Supabase Realtime for tracking who's connected (presence
 *   join/leave events). It doesn't subscribe to data changes. Mixing
 *   the two responsibilities into one channel is doable but
 *   couples disconnect-detection to data-sync — separate channels
 *   keep each concern clean and let Supabase apply different
 *   reconnect strategies per channel.
 *
 * Pre-fix: spectator dice sync relied on the campaign query's 1s
 * polling floor during combat. Alpha testing confirmed parties
 * felt sluggish — 250-1000ms latency between actor's roll and
 * spectator's animation. Switching to Realtime drops the latency
 * to whatever the Supabase server's push interval is (typically
 * sub-100ms).
 *
 * Smell filed in 98fb542's report and resurfaced as alpha bug 5;
 * this hook is the resolution.
 */
export function useCampaignRealtime(campaignId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`campaign-data:${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          // Replace the cached campaign with the new row payload.
          // Mirrors what a refetch would produce — same shape,
          // already validated by the DB. No need to invalidate +
          // re-fetch; the payload IS the fresh data.
          if (payload?.new) {
            queryClient.setQueryData(['campaign', campaignId], payload.new);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);
}
