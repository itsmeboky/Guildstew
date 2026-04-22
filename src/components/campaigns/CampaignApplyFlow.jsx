import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ArrowRight, ShieldCheck, ShieldAlert, Send, Plus, Pencil, Sparkles, X, Check,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  isCampaignModded, validateCharacterForCampaign, submitApplication,
} from "@/lib/campaignApplications";
import { createPageUrl } from "@/utils";
import CampaignPreviewPanel from "@/components/campaigns/CampaignPreviewPanel";

/**
 * Multi-step apply flow orchestrator.
 *
 *   preview       → read-only campaign details + restrictions
 *   characters    → pick / create / edit a library character
 *   validate      → run ban check; block submission if any hits
 *   submit        → attach a message and send the application
 *   done          → success screen; auto-closes after a beat
 *
 * Driven by one state slot (`step`). Parent opens the flow by
 * passing `campaign`; closes via `onClose`.
 */
const STEPS = ["preview", "characters", "validate", "submit", "done"];

export default function CampaignApplyFlow({ campaign, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState("preview");
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [message, setMessage] = useState("");

  const { data: modInfo = { modded: false, mods: [] } } = useQuery({
    queryKey: ["campaignApplyMods", campaign?.id],
    queryFn: () => isCampaignModded(campaign.id),
    enabled: !!campaign?.id,
  });

  const { data: characters = [] } = useQuery({
    queryKey: ["applyFlowCharacters", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const rows = await base44.entities.Character
        .filter({ created_by: user.email })
        .catch(() => []);
      return rows || [];
    },
    enabled: !!user?.email && step === "characters",
  });

  const installedModIds = useMemo(
    () => new Set((modInfo.mods || []).map((m) => m.mod_id)),
    [modInfo.mods],
  );

  // Character compatibility for modded campaigns. Vanilla characters
  // (no mod_dependencies) or characters built against a different
  // mod set render as disabled in the picker.
  const characterCompat = (char) => {
    if (!modInfo.modded) {
      // Unmodded campaign — flag modded characters but keep them
      // selectable; the validator (Step 4) still blocks banned bits.
      const deps = Array.isArray(char.mod_dependencies) ? char.mod_dependencies : [];
      return {
        ok: deps.length === 0,
        reason: deps.length === 0 ? null : "Built with mods not used in this campaign",
      };
    }
    const deps = Array.isArray(char.mod_dependencies) ? char.mod_dependencies : [];
    if (deps.length === 0) {
      return { ok: false, reason: "This campaign uses custom content" };
    }
    const missing = deps.filter((id) => !installedModIds.has(id));
    if (missing.length > 0) {
      return { ok: false, reason: `Missing required mod: ${missing.length} item${missing.length === 1 ? "" : "s"}` };
    }
    return { ok: true, reason: null };
  };

  const { data: validation = { valid: true, violations: [] }, isFetching: validating, refetch: rerunValidation } = useQuery({
    queryKey: ["applyFlowValidate", selectedCharacter?.id, campaign?.id],
    queryFn: () => validateCharacterForCampaign(selectedCharacter, campaign.id),
    enabled: !!selectedCharacter && !!campaign?.id && step === "validate",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!validation?.valid) throw new Error("Fix the ban violations before submitting.");
      await submitApplication({
        campaignId: campaign.id,
        userId: user.id,
        characterId: selectedCharacter.id,
        message,
        isModded: modInfo.modded,
      });
    },
    onSuccess: () => {
      toast.success("Application submitted — the GM will review your character.");
      queryClient.invalidateQueries({ queryKey: ["myCampaignApplications"] });
      setStep("done");
      setTimeout(() => onClose?.(), 1800);
    },
    onError: (err) => {
      console.error("Application submit", err);
      toast.error(err?.message || "Couldn't submit the application.");
    },
  });

  const openCreatorForCampaign = ({ editId = null } = {}) => {
    // The standard creator reads ?campaignId=… to opt into modded
    // race/class lists + the brewery apply layer, ?edit=… to re-
    // enter an existing character row, and ?forApply=1 to signal
    // "this is a PC for the applicant, not an NPC". Without forApply,
    // campaignId would route into the GM's NPC-create path.
    const params = new URLSearchParams();
    if (campaign?.id) params.set("campaignId", campaign.id);
    if (editId) params.set("edit", editId);
    params.set("forApply", "1");
    params.set("returnTo", "CampaignsFind");
    onClose?.();
    navigate(createPageUrl("CharacterCreator") + "?" + params.toString());
  };

  const dialogOpen = !!campaign;

  return (
    <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#050816] border border-slate-700 text-white max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "preview"    && <><Sparkles className="w-5 h-5 text-[#37F2D1]" /> Apply to campaign</>}
            {step === "characters" && <><Plus className="w-5 h-5 text-[#37F2D1]" /> Choose a character</>}
            {step === "validate"   && <><ShieldCheck className="w-5 h-5 text-[#37F2D1]" /> Review restrictions</>}
            {step === "submit"     && <><Send className="w-5 h-5 text-[#37F2D1]" /> Send application</>}
            {step === "done"       && <><Check className="w-5 h-5 text-emerald-400" /> Application submitted</>}
          </DialogTitle>
        </DialogHeader>

        {step === "preview" && (
          <div className="space-y-4">
            <CampaignPreviewPanel campaign={campaign} />
            <DialogFooter className="sticky bottom-0 bg-[#050816] pt-3 -mx-6 px-6 border-t border-slate-800">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => setStep("characters")}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
              >
                Choose a Character <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "characters" && (
          <CharacterSelectStep
            campaign={campaign}
            characters={characters}
            modded={modInfo.modded}
            mods={modInfo.mods}
            installedModIds={installedModIds}
            characterCompat={characterCompat}
            onPick={(c) => {
              setSelectedCharacter(c);
              setStep("validate");
            }}
            onCreateNew={() => openCreatorForCampaign()}
            onEdit={(c) => openCreatorForCampaign({ editId: c.id })}
            onBack={() => setStep("preview")}
          />
        )}

        {step === "validate" && (
          <ValidationStep
            character={selectedCharacter}
            validation={validation}
            validating={validating}
            onEdit={() => openCreatorForCampaign({ editId: selectedCharacter?.id })}
            onBack={() => setStep("characters")}
            onContinue={() => setStep("submit")}
            onRecheck={() => rerunValidation()}
          />
        )}

        {step === "submit" && (
          <SubmitStep
            character={selectedCharacter}
            message={message}
            setMessage={setMessage}
            submitting={submit.isPending}
            onBack={() => setStep("validate")}
            onSubmit={() => submit.mutate()}
            hasViolations={!validation?.valid}
          />
        )}

        {step === "done" && (
          <div className="py-10 text-center space-y-3">
            <div className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="w-8 h-8" />
            </div>
            <p className="text-lg font-bold text-white">You're in the queue.</p>
            <p className="text-sm text-slate-400">
              We'll notify you when the GM reviews your character.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CharacterSelectStep({
  campaign, characters, modded, mods, installedModIds, characterCompat,
  onPick, onCreateNew, onEdit, onBack,
}) {
  const creatorButtonLabel = modded ? "Create Modded Character" : "Create New Character";

  return (
    <div className="space-y-4">
      {modded && (
        <div className="bg-violet-500/10 border border-violet-400/40 rounded-lg p-3">
          <p className="text-xs text-violet-100 leading-relaxed">
            <Sparkles className="w-3 h-3 inline-block mr-1" />
            This campaign has {mods.length} installed mod{mods.length === 1 ? "" : "s"}. Library characters must match the mod set; otherwise build a new one with the modded creator.
          </p>
        </div>
      )}

      {characters.length === 0 ? (
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-6 text-center">
          <p className="text-sm text-slate-300">You don't have any characters yet.</p>
          <Button
            onClick={onCreateNew}
            className="mt-3 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> {creatorButtonLabel}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {characters.map((c) => {
            const compat = characterCompat(c);
            return (
              <CharacterTile
                key={c.id}
                character={c}
                compat={compat}
                onPick={() => compat.ok && onPick(c)}
                onEdit={() => onEdit(c)}
              />
            );
          })}
          <button
            type="button"
            onClick={onCreateNew}
            className="rounded-lg border-2 border-dashed border-slate-600 bg-[#0b1220]/50 p-4 text-center hover:border-[#37F2D1]/60 transition-colors"
          >
            <Plus className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-white">{creatorButtonLabel}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {modded ? "Uses the campaign's modded rules" : "Standard D&D 5e creator"}
            </p>
          </button>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </DialogFooter>
    </div>
  );
}

function CharacterTile({ character, compat, onPick, onEdit }) {
  const disabled = !compat.ok;
  return (
    <div
      className={`relative rounded-lg border p-3 transition-all ${
        disabled
          ? "border-slate-800 bg-[#0b1220]/40 opacity-60 cursor-not-allowed"
          : "border-slate-700 bg-[#0b1220] hover:border-[#37F2D1]/60 cursor-pointer"
      }`}
      onClick={onPick}
    >
      <div className="flex items-start gap-3">
        {character.profile_avatar_url || character.avatar_url ? (
          <img
            src={character.profile_avatar_url || character.avatar_url}
            alt=""
            className="w-14 h-14 rounded-md object-cover object-top flex-shrink-0 bg-[#050816]"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-300 flex-shrink-0">
            {(character.name || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{character.name || "Unnamed"}</p>
          <p className="text-[11px] text-slate-400 truncate">
            {character.race}
            {character.subrace ? ` (${character.subrace})` : ""}
            {character.class ? ` · ${character.class}` : ""}
            {character.level ? ` L${character.level}` : ""}
          </p>
          {character.campaign_origin && (
            <p className="text-[10px] text-violet-300 uppercase tracking-widest mt-1 truncate">
              Built for {character.campaign_origin}
            </p>
          )}
          {disabled && compat.reason && (
            <p className="text-[10px] text-amber-300 italic mt-1 leading-snug">{compat.reason}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-slate-400 hover:text-[#37F2D1] flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-[#050816]"
      >
        <Pencil className="w-3 h-3" /> Edit
      </button>
    </div>
  );
}

function ValidationStep({ character, validation, validating, onEdit, onBack, onContinue, onRecheck }) {
  if (!character) return null;
  if (validating) {
    return <p className="text-sm text-slate-400 italic py-10 text-center">Checking restrictions…</p>;
  }

  if (!validation.valid) {
    return (
      <div className="space-y-4">
        <div className="bg-rose-500/10 border border-rose-400/40 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-300" />
            <p className="text-sm font-bold text-rose-100">This character can't be used in this campaign.</p>
          </div>
          <ul className="space-y-2">
            {validation.violations.map((v, i) => (
              <li key={i} className="bg-[#050816]/70 rounded p-2 text-xs text-rose-100">
                <span className="font-bold uppercase tracking-widest text-rose-300 mr-2">
                  Banned {v.type}
                </span>
                <span className="font-bold">{v.name}</span>
                {v.reason && <span className="text-rose-200/80"> — {v.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Choose Different Character
          </Button>
          <Button
            onClick={onEdit}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
          >
            <Pencil className="w-4 h-4 mr-1" /> Edit Character
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-500/10 border border-emerald-400/40 rounded-lg p-4 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-300 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-100">Character is compatible.</p>
          <p className="text-[11px] text-emerald-200/80">No banned content on this character.</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button variant="ghost" onClick={onRecheck} className="text-slate-400">
          Re-check
        </Button>
        <Button
          onClick={onContinue}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </DialogFooter>
    </div>
  );
}

function SubmitStep({ character, message, setMessage, submitting, onBack, onSubmit, hasViolations }) {
  if (!character) return null;
  return (
    <div className="space-y-4">
      <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-3 flex items-center gap-3">
        {character.profile_avatar_url || character.avatar_url ? (
          <img
            src={character.profile_avatar_url || character.avatar_url}
            alt=""
            className="w-14 h-14 rounded-md object-cover object-top flex-shrink-0 bg-[#050816]"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-300 flex-shrink-0">
            {(character.name || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{character.name}</p>
          <p className="text-[11px] text-slate-400">
            {character.race} · {character.class} · L{character.level || 1}
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-slate-400 block mb-1">
          Message to the GM (optional)
        </label>
        <Textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I'm looking for a long-running roleplay-heavy game. I can commit to weekly sessions…"
          className="bg-[#050816] border-slate-700 text-white"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting || hasViolations}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
        >
          <Send className="w-4 h-4 mr-1" />
          {submitting ? "Submitting…" : "Submit Application"}
        </Button>
      </DialogFooter>
    </div>
  );
}
