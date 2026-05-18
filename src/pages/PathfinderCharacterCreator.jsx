import { Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { getGamePack } from "@/config/gamePacks";

// Mount point for the PF2e character creator. Mirrors the routing
// pattern CharacterCreator.jsx uses (window.location URL params,
// react-router useNavigate, createPageUrl for back-navigation).
//
// Save path is stubbed in 4.5a — the migration adding a
// `system_data jsonb` column to `characters` + verification that
// base44.entities.Character.create passes unknown columns through
// lands in 4.5b. Until then the Forge button console.logs the
// characterData and toasts a placeholder.

export default function PathfinderCharacterCreator() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("campaignId");
  const returnTo = urlParams.get("returnTo");
  const gamePackId = urlParams.get("gamePack") || "pathfinder_2e";
  const pack = getGamePack(gamePackId);

  if (!pack || pack.family !== "pf2e") {
    return (
      <div className="min-h-screen bg-pf-bg flex items-center justify-center text-pf-bone">
        <div className="text-center">
          <p className="font-display text-pf-brass tracking-[0.3em] uppercase text-sm mb-2">
            Invalid Game Pack
          </p>
          <p className="font-body text-pf-stone text-sm">
            {gamePackId} is not a PF2e-family pack.
          </p>
        </div>
      </div>
    );
  }

  const Creator = pack.creator;

  const handleComplete = (characterData) => {
    // 4.5b: replace with base44.entities.Character.create({
    //   game_pack: "pathfinder_2e",
    //   name: characterData.name,
    //   level: characterData.level,
    //   system_data: characterData,
    //   created_by, user_id,
    // }) once the system_data jsonb migration is applied and the
    // base44 wrapper is verified to round-trip unknown columns.
    console.log("PF2e character data (save not yet wired):", characterData);
    toast("Almost there", {
      description: "Save path lands in 4.5b — schema migration pending.",
    });
    if (returnTo) navigate(returnTo);
    else if (campaignId) navigate(createPageUrl(`CampaignView?id=${campaignId}`));
    else navigate(createPageUrl("CharacterLibrary"));
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-pf-bg flex items-center justify-center">
          <p className="font-display text-pf-brass tracking-[0.3em] uppercase text-sm">
            Loading the Forge…
          </p>
        </div>
      }
    >
      <Creator onComplete={handleComplete} />
    </Suspense>
  );
}
