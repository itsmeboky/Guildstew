import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { getActiveCosmetics } from "@/lib/activeCosmetics";

/**
 * Active dice-skin hook.
 *
 * Returns the file_data of the tavern_item slotted in
 * `active_cosmetics.dice_skin_id` for the given user, or null if
 * no user_id is supplied or that user has no slotted skin.
 *
 * Signature change (Phase 3 redesign Commit 2):
 *   - useActiveDiceSkin(userId) → that user's active dice cosmetic.
 *     Used to render any specific user's dice — including the
 *     viewer themselves and other players in the GroupDiceArena.
 *   - useActiveDiceSkin() / useActiveDiceSkin(null) → null.
 *     Caller falls through to base textures + gradients. The
 *     no-arg form intentionally has NO implicit viewer default —
 *     callers who want the viewer's skin must source the id from
 *     useAuth() and pass it explicitly. Removes the silent
 *     "whose skin is rendering here" ambiguity that blocked the
 *     multi-player arena.
 *
 * The DiceRoller's internal call site (the only existing one)
 * passes its userId prop / falls back to viewer-from-useAuth, so
 * no behavior change at any current DiceRoller mount.
 */
export function useActiveDiceSkin(userId) {
  const { data: cosmetics } = useQuery({
    queryKey: ["activeCosmetics", userId],
    queryFn: () => getActiveCosmetics(userId),
    enabled: !!userId,
  });

  const skinId = cosmetics?.dice_skin_id || null;

  const { data: item } = useQuery({
    queryKey: ["tavernDiceSkinItem", skinId],
    queryFn: async () => {
      if (!skinId) return null;
      const { data } = await supabase
        .from("tavern_items")
        .select("id, name, file_data")
        .eq("id", skinId)
        .maybeSingle();
      return data || null;
    },
    enabled: !!skinId,
  });

  if (!userId) return null;
  return item?.file_data || null;
}
