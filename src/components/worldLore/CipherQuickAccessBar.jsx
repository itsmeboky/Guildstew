import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import CipherModal from "@/components/worldLore/CipherModal";
import {
  useEnsureCipherItems,
  ownedCipherItems,
} from "@/utils/cipherInventory";

/**
 * Floating quick-access bar that shows one button per cipher item
 * the active player carries. Click → opens the same CipherModal
 * the inventory click would open. Mounted from Layout.jsx in
 * campaign-player and world-lore contexts so the player can pull
 * up their cypher without diving back into inventory.
 *
 * GMs see no buttons here — they read the mapping directly on the
 * campaign row. Players who don't carry the item see nothing.
 */
export default function CipherQuickAccessBar({ campaignId }) {
  const { user } = useAuth();
  const [openType, setOpenType] = useState(null);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () =>
      base44.entities.Campaign.filter({ id: campaignId }).then((r) => r[0]),
    enabled: !!campaignId,
  });

  const { data: characters = [] } = useQuery({
    queryKey: ["campaignCharacters", campaignId],
    queryFn: () =>
      base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });

  const activeCharacter = useMemo(() => {
    if (!user) return null;
    return characters.find(
      (c) =>
        (c.created_by === user.email || c.user_id === user.id) &&
        c.campaign_id === campaignId,
    ) || null;
  }, [characters, user, campaignId]);

  // Lazy-grant runs even if there's nothing to show yet — handles
  // the case where the player just multiclassed into rogue/druid.
  useEnsureCipherItems(activeCharacter, user);

  const owned = ownedCipherItems(activeCharacter);

  // TEMP DIAGNOSTIC — hotfix v2 / Commit 2 (audit/CYPHER_BUTTON_RECON.md).
  // Logs the data the bar uses to decide whether to render. Remove
  // in Commit 3 once the root cause is locked in. Single console.log
  // per render so the noise floor is bounded.
  if (typeof window !== "undefined") {
    /* eslint-disable no-console */
    console.log("[cypher-debug]", {
      campaignId,
      user_id: user?.id,
      user_email: user?.email,
      characters_loaded: characters.length,
      characters: characters.map((c) => ({
        id: c.id,
        name: c.name,
        class: c.class,
        multiclasses: c.multiclasses,
        created_by: c.created_by,
        user_id: c.user_id,
        campaign_id: c.campaign_id,
        inventory_count: Array.isArray(c.inventory) ? c.inventory.length : 0,
        inventory_names: Array.isArray(c.inventory)
          ? c.inventory.map((it) => ({ id: it?.id, name: it?.name }))
          : null,
      })),
      activeCharacter_id: activeCharacter?.id || null,
      activeCharacter_class: activeCharacter?.class || null,
      activeCharacter_inventory_count: Array.isArray(activeCharacter?.inventory)
        ? activeCharacter.inventory.length
        : 0,
      owned_count: owned.length,
      owned: owned.map((it) => ({ id: it?.id, name: it?.name, cipher_type: it?.cipher_type })),
      campaign_gm: campaign?.game_master_id || null,
      isGM_check: !!campaign && campaign.game_master_id === user?.id,
      early_return_path:
        !campaignId
          ? "no-campaignId"
          : !activeCharacter
            ? "no-activeCharacter"
            : owned.length === 0
              ? "owned-empty"
              : !!campaign && campaign.game_master_id === user?.id
                ? "isGM"
                : "RENDER",
    });
    /* eslint-enable no-console */
  }

  if (!campaignId || !activeCharacter || owned.length === 0) return null;

  const isGM = !!campaign && campaign.game_master_id === user?.id;
  if (isGM) return null;

  return (
    <>
      <div
        className="fixed top-20 right-4 z-40 flex flex-col gap-2 pointer-events-none"
        aria-label="Cypher quick access"
      >
        {owned.map((item) => (
          <button
            key={item.id || item.name}
            type="button"
            onClick={() => setOpenType(item.cipher_type)}
            className="pointer-events-auto inline-flex items-center gap-2 bg-[#1E2430]/95 border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 shadow-lg transition"
            title={`Open ${item.name}`}
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt=""
                className="w-6 h-6 rounded object-cover"
              />
            ) : null}
            <span className="text-xs font-bold text-white">
              {item.cipher_type === "thieves_cant" ? "Cypher" : "Field Guide"}
            </span>
          </button>
        ))}
      </div>

      <CipherModal
        open={!!openType}
        onClose={() => setOpenType(null)}
        cipherType={openType}
        campaign={campaign}
      />
    </>
  );
}
