import { useSearchParams } from "react-router-dom";

/**
 * @typedef {Object} ActiveCampaign
 * @property {string|null} campaignId  The ?id query param, or null if absent.
 * @property {string|null} mapId       The ?map query param, or null if absent.
 */

/**
 * Read the active campaign and map from the current URL.
 * Reactive — components re-render when the query params change.
 *
 * @returns {ActiveCampaign}
 */
export function useActiveCampaign() {
  const [searchParams] = useSearchParams();
  return {
    campaignId: searchParams.get("id"),
    mapId: searchParams.get("map"),
  };
}
