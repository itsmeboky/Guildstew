import { Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { getCatalogEntry } from "@/game-packs";

// The PF2e creator flow is a heavy pack body, lazy-loaded so it stays out
// of the main chunk. Resolved here directly (the catalog carries metadata
// only, not pack bodies). Path updates with the pf2e -> pathfinder/2e move.
const Creator = lazy(() =>
  import("@/game-packs/pathfinder/2e").then((m) => ({ default: m.CharacterCreatorFlow })),
);

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
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("campaignId");
  const returnTo = urlParams.get("returnTo");
  // Edit mode: the library's Edit button routes here as
  // /PathfinderCharacterCreator?edit=<characterId>. When present we load
  // that row and hydrate the flow instead of starting blank, and the save
  // path below branches to Character.update rather than .create.
  const editCharacterId = urlParams.get("edit");
  const gamePackId = urlParams.get("gamePack") || "pathfinder_2e";
  const pack = getCatalogEntry(gamePackId);

  // Fetch the existing character when editing. Mirrors the 5e creator's
  // loader (base44.entities.Character.filter by id, take the single row),
  // staying consistent with how this page saves via base44 below. Gated so
  // brand-new creates never hit the network. No silent .catch — a failure
  // is logged with context and surfaced as an error state.
  const {
    data: existingCharacter,
    isLoading: editLoading,
    isError: editError,
  } = useQuery({
    queryKey: ["pf2eEditCharacter", editCharacterId],
    enabled: !!editCharacterId,
    queryFn: async () => {
      try {
        const rows = await base44.entities.Character.filter({ id: editCharacterId });
        return rows?.[0] ?? null;
      } catch (err) {
        console.error("[PF2e edit] failed to load character", editCharacterId, err);
        throw err;
      }
    },
  });

  if (!pack || pack.family !== "pathfinder") {
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

  const handleComplete = async (characterData) => {
    if (!authUser) {
      toast.error("Not signed in", {
        description: "Please sign in to save your character.",
      });
      return;
    }

    try {
      // Editing only rewrites the mutable payload (name/level/system_data).
      // Ownership stamps (created_by, user_id) are set once on create and
      // left untouched on update so an edit can't reassign the row.
      const saved = editCharacterId
        ? await base44.entities.Character.update(editCharacterId, {
            name: characterData.name || "Unnamed Character",
            level: characterData.level || 1,
            system_data: characterData,
          })
        : await base44.entities.Character.create({
            game_pack: "pathfinder_2e",
            name: characterData.name || "Unnamed Character",
            level: characterData.level || 1,
            created_by: authUser.email,
            user_id: authUser.id,
            system_data: characterData,
          });

      // Refresh the library list (CharacterLibrary keys off ['allCharacters'])
      // and the edit row itself so a reopen reflects the new save.
      queryClient.invalidateQueries({ queryKey: ["allCharacters"] });
      if (editCharacterId) {
        queryClient.invalidateQueries({ queryKey: ["pf2eEditCharacter", editCharacterId] });
      }

      toast.success(editCharacterId ? "Character updated" : "Character forged", {
        description: editCharacterId
          ? `${saved?.name || characterData.name || "Your character"} has been updated.`
          : `${saved?.name || characterData.name || "Your character"} is in your library.`,
      });

      if (returnTo) navigate(returnTo);
      else if (campaignId) navigate(createPageUrl(`CampaignView?id=${campaignId}`));
      else navigate(createPageUrl("CharacterLibrary"));
    } catch (err) {
      console.error(
        editCharacterId ? "PF2e Character.update failed:" : "PF2e Character.create failed:",
        err,
      );
      toast.error("Save failed", {
        description: err?.message || "Unknown error — check console.",
      });
    }
  };

  // In edit mode we must not mount <Creator> until the row has loaded —
  // otherwise the user could start typing into the blank default fields and
  // the hydration effect would clobber their input once the fetch lands.
  if (editCharacterId && editLoading) {
    return (
      <div className="min-h-screen bg-pf-bg flex items-center justify-center">
        <p className="font-display text-pf-brass tracking-[0.3em] uppercase text-sm">
          Loading character…
        </p>
      </div>
    );
  }

  if (editCharacterId && (editError || !existingCharacter)) {
    return (
      <div className="min-h-screen bg-pf-bg flex items-center justify-center text-pf-bone">
        <div className="text-center">
          <p className="font-display text-pf-brass tracking-[0.3em] uppercase text-sm mb-2">
            Character Not Found
          </p>
          <p className="font-body text-pf-stone text-sm mb-4">
            We couldn't load that character to edit. It may have been deleted.
          </p>
          <button
            type="button"
            onClick={() => navigate(createPageUrl("CharacterLibrary"))}
            className="font-display text-xs tracking-[0.2em] uppercase text-pf-brass underline"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

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
      <Creator onComplete={handleComplete} initialCharacter={existingCharacter ?? null} />
    </Suspense>
  );
}
