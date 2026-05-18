import { Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { getGamePack } from "@/config/gamePacks";

// Mount point for the PF2e character creator. Mirrors the routing
// pattern CharacterCreator.jsx uses (window.location URL params,
// react-router useNavigate, createPageUrl for back-navigation).
//
// Save path mirrors the 5e creator's non-apply, non-NPC branch:
// stamp created_by (email) + user_id (UUID) explicitly, never
// rely on base44.auth.me() server-side resolution. The full
// PF2e characterData blob goes into system_data (jsonb) per the
// generic-column decision; flat `name` and `level` are duplicated
// out for index/search use.
//
// NOT covered here: the campaign apply-flow (campaign_origin,
// is_campaign_copy, mod_dependencies, required_mods). The 5e
// creator handles that for /CharacterCreator?campaignId=…&forApply=1
// — replicating it for PF2e is its own commit. PF2e characters
// built with ?campaignId= today still navigate back to the
// campaign view, but the row carries no campaign linkage.

export default function PathfinderCharacterCreator() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
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

  const handleComplete = async (characterData) => {
    if (!authUser) {
      toast.error("Not signed in", {
        description: "Please sign in to save your character.",
      });
      return;
    }

    try {
      const created = await base44.entities.Character.create({
        game_pack: "pathfinder_2e",
        name: characterData.name || "Unnamed Character",
        level: characterData.level || 1,
        created_by: authUser.email,
        user_id: authUser.id,
        system_data: characterData,
      });

      toast.success("Character forged", {
        description: `${created?.name || characterData.name || "Your character"} is in your library.`,
      });

      if (returnTo) navigate(returnTo);
      else if (campaignId) navigate(createPageUrl(`CampaignView?id=${campaignId}`));
      else navigate(createPageUrl("CharacterLibrary"));
    } catch (err) {
      console.error("PF2e Character.create failed:", err);
      toast.error("Save failed", {
        description: err?.message || "Unknown error — check console.",
      });
    }
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
