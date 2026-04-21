import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { getActiveCosmetics } from "@/lib/activeCosmetics";

/**
 * Active dice-skin hook.
 *
 * Returns the file_data of the tavern_item currently slotted in
 * `active_cosmetics.dice_skin_id`, or null if none is applied. The
 * DiceRoller uses this to override its default material + lighting.
 */
export function useActiveDiceSkin() {
  const { user } = useAuth();

  const { data: cosmetics } = useQuery({
    queryKey: ["activeCosmetics", user?.id],
    queryFn: () => getActiveCosmetics(user.id),
    enabled: !!user?.id,
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

  return item?.file_data || null;
}
