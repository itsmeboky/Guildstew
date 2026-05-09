import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, BookUser, Plus, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { loadCampaignBans, findCharacterIncompatibilities } from "@/lib/campaignBans";
import LazyImage from "@/components/ui/LazyImage";

/**
 * CharacterPickerModal — opened from a player's empty lobby slot.
 * Two paths:
 *   1. Create New: routes to the existing CharacterCreator apply
 *      flow (`?campaignId=…&forApply=1`). The creator already
 *      stamps is_campaign_copy=true / required_mods on save (per
 *      hotfix #10a's apply-flow update); no new wiring needed
 *      there.
 *   2. Pick from Library: list the user's library characters
 *      (is_campaign_copy=false, is_npc=false) decorated with
 *      compatibility flags. Compatible → clone-on-attach
 *      (Character.create with explicit active_session_id/last_played
 *      strip — smell #6 from #10a). Incompatible → show greyed
 *      with reason text. Banned content → route to mandatory
 *      edit-pass in the creator.
 */
export default function CharacterPickerModal({
  campaignId,
  user,
  campaign,
  onClose,
}) {
  const [path, setPath] = useState(null); // null | 'library'
  const navigate = useNavigate();

  const handleCreateNew = () => {
    onClose();
    navigate(
      createPageUrl("CharacterCreator") +
        `?campaignId=${campaignId}&forApply=1&returnTo=CampaignPanel`,
    );
  };

  // Top-level path picker
  if (!path) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="bg-[#1E2430] border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Pick a Character</DialogTitle>
            <DialogDescription className="text-slate-400">
              Bring an existing library character into this campaign, or create a new one tailored to it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
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
              className="border-slate-600 hover:bg-[#2A3441] text-white font-bold py-6 text-base flex items-center justify-center gap-2"
            >
              <BookUser className="w-5 h-5" />
              Pick from Library
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <LibraryPickerView
      campaignId={campaignId}
      campaign={campaign}
      user={user}
      onClose={onClose}
      onBack={() => setPath(null)}
    />
  );
}

/**
 * LibraryPickerView — second screen of the picker. Lists the user's
 * library characters with mod-compatibility decorations. Greyed-out
 * cards explain WHY they can't be selected (wrong system, missing
 * mods).
 *
 * On select: load campaign bans, run findCharacterIncompatibilities.
 * Clean → clone-on-attach. Dirty → route to creator in
 * editIncompatibilities mode (mandatory edit-pass).
 */
function LibraryPickerView({ campaignId, campaign, user, onClose, onBack }) {
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

      // System match — campaigns have a `system` (or `game_system`)
      // column; characters don't carry an explicit system today, so
      // we only flag a mismatch if both sides have a value AND
      // they differ. Most characters / campaigns are dnd5e and
      // this guard becomes a no-op.
      const charSys = char.system || char.game_system || null;
      const campSys = campaign?.system || campaign?.game_system || null;
      if (charSys && campSys && charSys !== campSys) {
        reasons.push(`Wrong system (character is ${charSys}, campaign is ${campSys})`);
      }

      // Mod compatibility — character's required_mods must all be
      // installed on the campaign. mod_dependencies entries are
      // {mod_id, mod_type, mod_name} objects (per #10a
      // canonicalization).
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

  // Clone-on-attach. Strip identity + session-lock + last_played
  // explicitly — smell #6 from #10a. Spreading ...rest without
  // these would carry stale state into the clone.
  const cloneMutation = useMutation({
    mutationFn: async (libraryChar) => {
      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        last_played: _lastPlayed,
        active_session_id: _activeSessionId,
        ...rest
      } = libraryChar;

      const cloneFields = {
        ...rest,
        campaign_id: campaignId,
        is_campaign_copy: true,
        source_character_id: libraryChar.id,
        active_session_id: null,
        last_played: null,
      };

      return base44.entities.Character.create(cloneFields);
    },
    onSuccess: () => {
      toast.success("Character attached to campaign.");
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", campaignId] });
      onClose();
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
    // items, we route them to the creator in mandatory edit-pass
    // mode rather than cloning the violating character.
    try {
      const bans = await loadCampaignBans(campaignId);
      const violations = findCharacterIncompatibilities(bans, libraryChar);
      if (violations.length > 0) {
        // Hand off to the creator. The creator's editIncompatibilities
        // UI is deferred to a follow-up; for now we route + show a
        // toast so the player understands why the clone-on-attach
        // didn't happen.
        toast.error(
          `${libraryChar.name} relies on banned content (${violations[0].banned_name}). Edit before attaching.`,
        );
        onClose();
        navigate(
          createPageUrl("CharacterCreator") +
            `?campaignId=${campaignId}&forApply=1&edit=${libraryChar.id}` +
            `&editIncompatibilities=1&returnTo=CampaignPanel`,
        );
        return;
      }
    } catch (err) {
      console.warn("[lobby picker] ban check failed:", err);
      // Don't block on a ban-check failure — fall through to clone;
      // the player can still ready up but the GM may want to inspect.
    }

    cloneMutation.mutate(libraryChar);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#1E2430] border border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-slate-400 hover:text-white p-1 h-auto"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <DialogTitle className="text-2xl">Pick from Library</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">
            Picking a character creates a campaign-scoped copy. Your library version stays unchanged so you can use it in other campaigns later.
          </DialogDescription>
        </DialogHeader>

        {charsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#37F2D1]" />
          </div>
        ) : decorated.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No library characters yet. Use <span className="text-[#37F2D1] font-semibold">Create New</span> to build one for this campaign.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {decorated.map(({ character, compatible, reasons }) => (
              <button
                key={character.id}
                type="button"
                onClick={compatible ? () => handleSelect(character) : undefined}
                disabled={!compatible || !!selecting}
                title={compatible ? "Attach to this campaign" : reasons.join("\n")}
                className={`relative text-left rounded-xl border-2 transition-all overflow-hidden ${
                  compatible
                    ? "border-slate-700 hover:border-[#37F2D1] hover:shadow-[0_0_15px_rgba(55,242,209,0.25)] cursor-pointer bg-[#2A3441]"
                    : "border-slate-800 bg-[#1A1F2A] opacity-60 cursor-not-allowed"
                } ${selecting === character.id ? "ring-2 ring-[#37F2D1]" : ""}`}
              >
                <div className="flex gap-3 p-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#1E2430] flex-shrink-0">
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-600">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
