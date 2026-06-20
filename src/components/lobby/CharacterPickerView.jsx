import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookUser, Plus, AlertTriangle, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { loadCampaignBans, findCharacterIncompatibilities } from "@/lib/campaignBans";
import { buildCampaignCloneRow } from "@/lib/cloneCharacterRow";
import LazyImage from "@/components/ui/LazyImage";

/**
 * CharacterPickerView — page-content character picker for the
 * pre-lobby gate. Replaces #10b's CharacterPickerModal: same
 * two-path UI (Create New / Pick from Library), same library list
 * with mod-compat filter, same banned-content edit-pass routing.
 * What's gone: the Dialog wrapper and the close/Cancel buttons.
 *
 * The gate at the top of CampaignPanel renders this as the page
 * content when the current user has no campaign-copy character for
 * this campaign. There is intentionally no escape hatch — the
 * player attaches a character and the lobby falls through, or they
 * navigate away to a different campaign / page.
 */
export default function CharacterPickerView({ campaignId, user, campaign }) {
  const [path, setPath] = useState(null); // null | 'library'
  const navigate = useNavigate();

  const handleCreateNew = () => {
    navigate(
      createPageUrl("CharacterCreator") +
        `?campaignId=${campaignId}&forApply=1&returnTo=CampaignPanel`,
    );
  };

  if (!path) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#2A3441] rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="w-7 h-7 text-[#37F2D1]" />
            <h1 className="text-3xl font-bold text-white">Pick a Character</h1>
          </div>
          <p className="text-slate-400 mb-8">
            You need a character to enter this campaign. Bring an existing library
            character in, or create a new one tailored to this campaign's homebrew
            and house rules.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={handleCreateNew}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold py-6 text-base flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Character
            </Button>
            <Button
              onClick={() => setPath("library")}
              variant="outline"
              className="border-slate-600 hover:bg-[#1E2430] text-white font-bold py-6 text-base flex items-center justify-center gap-2"
            >
              <BookUser className="w-5 h-5" />
              Pick from Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LibraryPickerSection
      campaignId={campaignId}
      campaign={campaign}
      user={user}
      onBack={() => setPath(null)}
    />
  );
}

/**
 * LibraryPickerSection — second screen of the picker. Lists the
 * user's library characters with mod-compatibility decorations.
 * Greyed-out cards explain WHY they can't be selected (wrong
 * system, missing mods).
 *
 * On select: load campaign bans, run findCharacterIncompatibilities.
 * Clean → clone-on-attach. Dirty → route to creator in
 * editIncompatibilities mode (mandatory edit-pass UI from #5a918d5).
 *
 * Back button returns to the two-path menu — NOT to a non-existent
 * "lobby" (the gate is upstream of the lobby).
 */
function LibraryPickerSection({ campaignId, campaign, user, onBack }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selecting, setSelecting] = useState(null); // character.id while clone-in-flight

  const { data: libraryChars = [], isLoading: charsLoading } = useQuery({
    queryKey: ["libraryCharacters", user?.email],
    enabled: !!user?.email,
    // is_campaign_copy=false: hide clones (post-#10a). is_npc=false:
    // hide NPCs the GM may have created via the legacy creator
    // route (smell #5 from #10a recon — library should only show
    // the player's PCs).
    queryFn: () =>
      base44.entities.Character.filter({
        created_by: user.email,
        is_campaign_copy: false,
        is_npc: false,
      }),
  });

  // Pull the campaign's installed mods so we can flag library
  // characters whose required_mods don't match.
  const { data: campaignMods = [] } = useQuery({
    queryKey: ["campaignInstalledMods", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_installed_mods")
        .select("mod_id, status")
        .eq("campaign_id", campaignId)
        .eq("status", "active");
      if (error) {
        console.warn("[lobby picker] failed to load campaign mods:", error.message);
        return [];
      }
      return data || [];
    },
  });

  // Compatibility decoration. Reasons array drives the disabled +
  // tooltip render. Greyed cards show the reasons inline.
  const decorated = useMemo(() => {
    const campaignModIds = new Set(campaignMods.map((m) => m.mod_id));
    return libraryChars.map((char) => {
      const reasons = [];

      const charSys = char.system || char.game_system || null;
      const campSys = campaign?.system || campaign?.game_system || null;
      if (charSys && campSys && charSys !== campSys) {
        reasons.push(`Wrong system (character is ${charSys}, campaign is ${campSys})`);
      }

      const charMods = Array.isArray(char.mod_dependencies)
        ? char.mod_dependencies.filter((d) => d && d.mod_id)
        : [];
      const missing = charMods.filter((d) => !campaignModIds.has(d.mod_id));
      if (missing.length > 0) {
        const names = missing.map((d) => d.mod_name || d.mod_id).join(", ");
        reasons.push(`Missing required mod${missing.length === 1 ? "" : "s"}: ${names}`);
      }

      return { character: char, compatible: reasons.length === 0, reasons };
    });
  }, [libraryChars, campaignMods, campaign]);

  // Clone-on-attach. Row shape comes from the shared helper
  // (buildCampaignCloneRow) so the lobby and application-accept paths can't
  // drift — it strips identity / session-lock / last_played so stale state
  // can't ride into the clone. The INSERT stays here (player auth → owner
  // INSERT policy).
  const cloneMutation = useMutation({
    mutationFn: async (libraryChar) => {
      return base44.entities.Character.create(
        buildCampaignCloneRow(libraryChar, { campaignId }),
      );
    },
    onSuccess: () => {
      toast.success("Character attached to campaign.");
      // Invalidate the query backing the gate's myCharacter
      // computation in CampaignPanel — without this the cached
      // library-only view persists and the gate refuses to fall
      // through to the lobby on the next render.
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", campaignId] });
    },
    onError: (err) => {
      toast.error(`Couldn't attach: ${err?.message || err}`);
      setSelecting(null);
    },
  });

  const handleSelect = async (libraryChar) => {
    if (selecting) return;
    setSelecting(libraryChar.id);

    // Banned-content check before cloning. If the campaign bans
    // any of the character's race / class / spells / features /
    // items, route to the creator in mandatory edit-pass mode
    // (UI lives in CharacterCreator post-#5a918d5).
    try {
      const bans = await loadCampaignBans(campaignId);
      const violations = findCharacterIncompatibilities(bans, libraryChar);
      if (violations.length > 0) {
        toast.error(
          `${libraryChar.name} relies on banned content (${violations[0].banned_name}). Edit before attaching.`,
        );
        navigate(
          createPageUrl("CharacterCreator") +
            `?campaignId=${campaignId}&forApply=1&edit=${libraryChar.id}` +
            `&editIncompatibilities=1&returnTo=CampaignPanel`,
        );
        return;
      }
    } catch (err) {
      console.warn("[lobby picker] ban check failed:", err);
    }

    cloneMutation.mutate(libraryChar);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-[#2A3441] rounded-2xl border border-slate-700 p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-400 hover:text-white p-1 h-auto"
            title="Back to picker menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Pick from Library</h1>
        </div>
        <p className="text-slate-400 mb-6">
          Picking a character creates a campaign-scoped copy. Your library version stays unchanged so you can use it in other campaigns later.
        </p>

        {charsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#37F2D1]" />
          </div>
        ) : decorated.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No library characters yet. Go back and pick{" "}
            <span className="text-[#37F2D1] font-semibold">Create New</span>{" "}
            to build one for this campaign.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decorated.map(({ character, compatible, reasons }) => (
              <button
                key={character.id}
                type="button"
                onClick={compatible ? () => handleSelect(character) : undefined}
                disabled={!compatible || !!selecting}
                title={compatible ? "Attach to this campaign" : reasons.join("\n")}
                className={`relative text-left rounded-xl border-2 transition-all overflow-hidden ${
                  compatible
                    ? "border-slate-700 hover:border-[#37F2D1] hover:shadow-[0_0_15px_rgba(55,242,209,0.25)] cursor-pointer bg-[#1E2430]"
                    : "border-slate-800 bg-[#15191F] opacity-60 cursor-not-allowed"
                } ${selecting === character.id ? "ring-2 ring-[#37F2D1]" : ""}`}
              >
                <div className="flex gap-3 p-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0b1220] flex-shrink-0">
                    {character.profile_avatar_url || character.avatar_url ? (
                      <LazyImage
                        src={character.profile_avatar_url || character.avatar_url}
                        alt={character.name}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{character.name}</div>
                    <div className="text-xs text-slate-300">
                      Level {character.level || 1} {character.class || "Adventurer"}
                    </div>
                    {character.race && (
                      <div className="text-xs text-slate-400">{character.race}</div>
                    )}
                  </div>
                  {selecting === character.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#37F2D1] mt-1" />
                  )}
                </div>
                {!compatible && reasons.length > 0 && (
                  <div className="px-3 pb-3 -mt-1 flex items-start gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{reasons[0]}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
