import { useQuery } from "@tanstack/react-query";
import { getSheetModifications } from "@/lib/modEngine";

/**
 * Fetch + merge the campaign's installed sheet_mod changes. Cached
 * per-campaignId via react-query; empty campaignId returns the
 * empty shape synchronously (no fetch).
 *
 * Shape:
 *   { add_skills, remove_skills, rename_skills,
 *     add_proficiency_categories,
 *     add_sections, remove_sections }
 *
 * Callers can iterate add_sections and filter by `position` to
 * render a slice of the merged view at a specific anchor on the
 * character sheet.
 */
const EMPTY = {
  add_skills: [],
  remove_skills: [],
  rename_skills: {},
  add_proficiency_categories: [],
  add_sections: [],
  remove_sections: [],
};

export function useSheetModifications(campaignId) {
  const { data } = useQuery({
    queryKey: ["sheetMods", campaignId],
    queryFn: () => getSheetModifications(campaignId),
    enabled: !!campaignId,
    initialData: EMPTY,
  });
  return data || EMPTY;
}
