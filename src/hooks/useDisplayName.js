import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDisplayName, loadCampaignMods } from "@/lib/modEngine";

/**
 * Resolve a label against the campaign's installed reskin mods.
 *
 * Two ways to use it:
 *
 *   1. Pass the install rows you already have (skip the fetch):
 *        const display = useDisplayName(installedMods);
 *        display("ability", "str") // → "Might" if a grimdark reskin is on
 *
 *   2. Pass `{ campaignId }` to have the hook fetch + cache them:
 *        const display = useDisplayName({ campaignId });
 *        display("term", "Hit Points") // → "Wounds"
 *
 * Either form returns a stable callback so callers can pass it
 * down through props without busting memoization. Falls through to
 * the source key when no reskin mod is installed.
 */
export function useDisplayName(modsOrOpts) {
  const passedMods = Array.isArray(modsOrOpts) ? modsOrOpts : null;
  const campaignId = !passedMods && typeof modsOrOpts === "object"
    ? modsOrOpts?.campaignId
    : null;

  const { data: fetchedMods = [] } = useQuery({
    queryKey: ["reskinMods", campaignId],
    queryFn: () => loadCampaignMods(campaignId),
    enabled: !passedMods && !!campaignId,
    initialData: [],
  });

  const mods = passedMods || fetchedMods;

  return useCallback(
    (category, key) => getDisplayName(mods, category, key),
    [mods],
  );
}
