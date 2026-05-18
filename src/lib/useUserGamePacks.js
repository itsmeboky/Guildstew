// useUserGamePacks — returns the picker-ids of the game packs the
// current player currently has access to.
//
// Resolution order:
//   1. Config-driven free packs — anything in GAME_PACKS with
//      `status: "available"` is granted automatically. This is the
//      source of truth for which systems are free-by-spec
//      (currently dnd5e_2014, dnd5e_2024, pathfinder_2e), so the
//      picker works regardless of whether the matching game_packs
//      DB row has been seeded / has the right slug / has
//      `is_free = true`. Decoupling this from the DB row means
//      a player can build characters even before deploy ops touch
//      Supabase.
//   2. Purchased packs (game_pack_purchases rows for this user)
//      are granted regardless of how they were paid (Stripe USD
//      or Spice debit). Those still need a DB-backed entitlement
//      since the purchase IS the ownership.
//
// The hook reads through React Query so the GamePacksGrid purchase
// mutation can invalidate `["userOwnedGamePackPurchases", userId]`
// and the picker live-updates without a reload.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { GAME_PACKS } from "@/config/gamePacks";

// Free-by-spec packs — config is the source of truth. The DB
// game_packs.is_free column still exists for the Tavern grid +
// admin tooling but no longer gates the picker.
const FREE_PICKER_IDS = Object.entries(GAME_PACKS)
  .filter(([, pack]) => pack.status === "available")
  .map(([pickerId]) => pickerId);

export function useUserGamePacks() {
  const { user } = useAuth();

  // Purchased entitlements — only for paid packs. Empty for users
  // who haven't bought anything yet (or who aren't signed in).
  const { data: purchasedPickerIds = [] } = useQuery({
    queryKey: ["userOwnedGamePackPurchases", user?.id ?? null],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("game_pack_purchases")
        .select("game_packs(slug)")
        .eq("user_id", user.id);
      const purchasedSlugs = (data || [])
        .map((r) => r.game_packs?.slug)
        .filter(Boolean);
      if (purchasedSlugs.length === 0) return [];
      const ids = [];
      for (const [pickerId, pack] of Object.entries(GAME_PACKS)) {
        if (pack.entitlementSlug && purchasedSlugs.includes(pack.entitlementSlug)) {
          ids.push(pickerId);
        }
      }
      return ids;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Free + purchased, dedup. Free is config-driven so no async
  // wait — the picker can render the free cards on the first paint.
  return Array.from(new Set([...FREE_PICKER_IDS, ...purchasedPickerIds]));
}
