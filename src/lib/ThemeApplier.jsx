import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getActiveCosmetics } from "@/lib/activeCosmetics";
import { loadThemeItem, applyTheme, clearTheme } from "@/lib/tavernTheme";

/**
 * Mount-once theme listener.
 *
 * Reads the signed-in user's `active_cosmetics.theme_id`, fetches the
 * underlying Tavern item, and writes its `file_data` colors into CSS
 * variables on :root. Re-runs whenever `active_cosmetics` changes so
 * "Apply" in My Collection takes effect immediately. Logged-out or
 * theme-less users get `clearTheme()` so stale vars don't linger
 * across account switches.
 *
 * Rendered invisibly from App.jsx.
 */
export default function ThemeApplier() {
  const { user } = useAuth();

  const { data: cosmetics } = useQuery({
    queryKey: ["activeCosmetics", user?.id],
    queryFn: () => getActiveCosmetics(user.id),
    enabled: !!user?.id,
  });

  const themeId = cosmetics?.theme_id || null;

  const { data: themeItem } = useQuery({
    queryKey: ["tavernThemeItem", themeId],
    queryFn: () => loadThemeItem(themeId),
    enabled: !!themeId,
  });

  useEffect(() => {
    if (!user?.id) {
      clearTheme();
      return;
    }
    if (!themeId) {
      clearTheme();
      return;
    }
    if (themeItem?.file_data) {
      applyTheme(themeItem.file_data);
    }
  }, [user?.id, themeId, themeItem?.id]);

  return null;
}
