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
