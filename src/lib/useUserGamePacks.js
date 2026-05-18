// useUserGamePacks — returns the picker-ids of the game packs the
// current player currently has access to.
//
// Resolution order:
//   1. Free packs (game_packs.is_free = true) are auto-owned for
//      every authenticated user.
//   2. Purchased packs (game_pack_purchases rows for this user)
//      are owned regardless of how they were paid (Stripe USD or
//      Spice debit).
//
// The DB stores game pack slugs (e.g. 'dnd5e', 'pathfinder2e').
// The picker config keys are richer (dnd5e_2014, dnd5e_2024,
// pathfinder_2e) because a single DB pack can unlock multiple
// picker entries — e.g. both 5e editions share `entitlementSlug: 'dnd5e'`.
//
// The hook reads through React Query so the GamePacksGrid purchase
// mutation can invalidate `["userOwnedGamePackSlugs", userId]`
// and the picker live-updates without a reload.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { GAME_PACKS } from "@/config/gamePacks";

export function useUserGamePacks() {
  const { user } = useAuth();

  const { data: ownedSlugs = [] } = useQuery({
    queryKey: ["userOwnedGamePackSlugs", user?.id ?? null],
    queryFn: async () => {
      const [freeRes, purchasedRes] = await Promise.all([
        supabase.from("game_packs").select("slug").eq("is_active", true).eq("is_free", true),
        user?.id
          ? supabase
              .from("game_pack_purchases")
              .select("game_packs(slug)")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const free = (freeRes.data || []).map((r) => r.slug);
      const purchased = (purchasedRes.data || [])
        .map((r) => r.game_packs?.slug)
        .filter(Boolean);

      return Array.from(new Set([...free, ...purchased]));
    },
    // Free packs are public; keep the query enabled even when
    // signed-out so the picker still has something to show on
    // landing-page screenshots. The user-bound branch short-
    // circuits to an empty array when there's no id.
    enabled: true,
    staleTime: 60_000,
  });

  // Map DB slugs back to picker-ids via entitlementSlug.
  const ids = [];
  for (const [pickerId, pack] of Object.entries(GAME_PACKS)) {
    if (pack.entitlementSlug && ownedSlugs.includes(pack.entitlementSlug)) {
      ids.push(pickerId);
    }
  }
  return ids;
}
