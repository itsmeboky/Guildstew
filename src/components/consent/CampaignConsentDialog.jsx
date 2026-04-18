import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, AlertTriangle, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  findConsentConflicts,
  isBlockedFromCampaign,
  ratingIcon,
  ratingLabel,
} from "@/utils/contentConflicts";

/**
 * Two-stage consent gate shown when a player joins a new campaign.
 *
 * Stage A ("minor-block"): if the viewer is a minor joining a red-
 * rated campaign, show a hard stop — no option to continue.
 *
 * Stage B ("conflicts"): if the campaign's planned content overlaps
 * with topics the player has flagged as "not allowed" or "handle
 * with care", show the conflict warning first. The player can back
 * out or push through to the normal consent dialog.
 *
 * Stage C ("consent"): the regular acknowledgement form, now with
 * extra sections for the campaign's rating, the GM's Player
 * Expectations, and the GM's stated Responsibilities.
 */
export default function CampaignConsentDialog({ open, campaign, userId, onAccept }) {
  const navigate = useNavigate();

  // Viewer profile — we need is_minor + content_preferences for the
  // two gating stages. Keep the query small and cached.
  const { data: profile } = useQuery({
    queryKey: ["consentProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const rows = await base44.entities.UserProfile
        .filter({ user_id: userId })
        .catch(() => []);
      return rows?.[0] || null;
    },
    enabled: open && !!userId,
  });

  const blocked = useMemo(
    () => isBlockedFromCampaign({ campaign, profile }),
    [campaign, profile],
  );

  const conflicts = useMemo(
    () => findConsentConflicts(
      profile?.content_preferences,
      campaign?.content_settings,
      campaign?.consent_checklist,
    ),
    [profile, campaign],
  );
  const hasConflicts = conflicts.notAllowed.length > 0 || conflicts.handleWithCare.length > 0;

  // Stage ladder. `minor-block` and `conflicts` are pre-flights; the
  // core consent form lives at `consent`. `conflictsAck` just tracks
  // whether the player clicked "Continue Anyway".
  const [conflictsAck, setConflictsAck] = useState(false);
  const stage = blocked
    ? "minor-block"
    : (hasConflicts && !conflictsAck ? "conflicts" : "consent");

  const cancel = () => navigate(createPageUrl("Campaigns"));

  if (stage === "minor-block") {
    return <MinorBlockDialog open={open} onGoBack={cancel} />;
  }

  if (stage === "conflicts") {
    return (
      <ConflictsDialog
        open={open}
        conflicts={conflicts}
        onGoBack={cancel}
        onContinue={() => setConflictsAck(true)}
      />
    );
  }

  return (
    <ConsentDialog
      open={open}
      campaign={campaign}
      userId={userId}
      onAccept={onAccept}
      onCancel={cancel}
    />
  );
}

// ─── Minor-block stage ─────────────────────────────────────────────

function MinorBlockDialog({ open, onGoBack }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onGoBack(); }}>
      <DialogContent className="bg-[#1E2430] border border-red-500/50 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-300">
            🚫 Age Restriction
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-300">
          This campaign is rated for adults only. You cannot join this campaign with
          your current account.
        </p>
        <div className="flex justify-end pt-3">
          <Button variant="outline" onClick={onGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Conflicts stage ───────────────────────────────────────────────

function ConflictsDialog({ open, conflicts, onGoBack, onContinue }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onGoBack(); }}>
      <DialogContent className="bg-[#1E2430] border border-amber-500/50 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-5 h-5" /> Content Preference Conflicts
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-300">
          This campaign contains content that conflicts with your preferences:
        </p>

        {conflicts.notAllowed.length > 0 && (
          <section className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 mt-2">
            <div className="text-xs uppercase tracking-widest text-red-300 font-bold mb-1">
              🔴 Not Allowed by you, but present in this campaign
            </div>
            <ul className="text-sm text-slate-200 list-disc pl-5 space-y-0.5">
              {conflicts.notAllowed.map((t) => <li key={`r-${t}`}>{t}</li>)}
            </ul>
          </section>
        )}
        {conflicts.handleWithCare.length > 0 && (
          <section className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 mt-2">
            <div className="text-xs uppercase tracking-widest text-amber-300 font-bold mb-1">
              🟡 Handle with Care for you, present in this campaign
            </div>
            <ul className="text-sm text-slate-200 list-disc pl-5 space-y-0.5">
              {conflicts.handleWithCare.map((t) => <li key={`y-${t}`}>{t}</li>)}
            </ul>
          </section>
        )}

        <p className="text-xs text-slate-400 mt-3">
          You can still join, but the GM should be aware of your boundaries.
          Would you like to continue?
        </p>

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
          <Button
            onClick={onContinue}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            Continue Anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Consent stage ─────────────────────────────────────────────────

function ConsentDialog({ open, campaign, userId, onAccept, onCancel }) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const consent = campaign?.consent_config || {};
  const safetyTools = Array.isArray(consent.safety_tools) ? consent.safety_tools : [];

  // Prefer the new campaign_rating column when the migration's been
  // applied; fall back to the legacy consent_rating field.
  const rating = campaign?.campaign_rating || campaign?.consent_rating;
  const hasExpectations = !!campaign?.player_expectations?.trim?.();
  const hasResponsibilities = !!campaign?.gm_responsibilities?.trim?.();

  const accept = async () => {
    if (!agreed || !userId || !campaign?.id) return;
    setSubmitting(true);
    try {
      const consents = { ...(campaign.player_consents || {}) };
      consents[userId] = {
        accepted: true,
        accepted_at: new Date().toISOString(),
        version: campaign.consent_version || 1,
      };
      await base44.entities.Campaign.update(campaign.id, { player_consents: consents });
      onAccept?.();
    } catch (err) {
      toast.error(err?.message || "Failed to record consent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#37F2D1]" />
            Welcome to {campaign?.title || "this campaign"}!
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-400">
          Before you begin, please review:
        </p>

        {rating && (
          <DefaultSection
            icon={ratingIcon(rating)}
            title={`Campaign Rating: ${ratingLabel(rating)}`}
            body="The GM set this rating to describe the overall tone and intensity of the campaign."
          />
        )}

        {hasExpectations && (
          <DefaultSection
            icon="📋"
            title="Player Expectations"
            body={campaign.player_expectations}
          />
        )}

        {hasResponsibilities && (
          <DefaultSection
            icon="🛡️"
            title="GM Responsibilities"
            body={campaign.gm_responsibilities}
          />
        )}

        <DefaultSection
          icon="📊"
          title="Gameplay Data"
          body="Your dice rolls, combat actions, and character stats are recorded to power your P.I.E. Chart and achievements."
        />
        <DefaultSection
          icon="👥"
          title="Shared with Party"
          body="Your character name, portrait, stats, and combat actions are visible to all players in this campaign. The GM can see all player data."
        />
        <DefaultSection
          icon="💬"
          title="Chat & Messages"
          body="Campaign chat messages are stored and visible to all campaign members."
        />
        <DefaultSection
          icon="🏠"
          title="House Rules"
          body="This campaign may use homebrew rules that modify standard D&D 5e gameplay. Check the House Rules tab for details."
        />

        {consent.content_warnings && (
          <DefaultSection icon="⚠️" title="Content Warnings" body={consent.content_warnings} />
        )}
        {consent.etiquette && (
          <DefaultSection icon="📜" title="Table Etiquette" body={consent.etiquette} />
        )}
        {safetyTools.length > 0 && (
          <section className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 mt-2">
            <div className="text-xs uppercase tracking-widest text-[#37F2D1] font-bold mb-1">
              🛡️ Safety Tools in Use
            </div>
            <ul className="text-sm text-slate-300 list-disc pl-5 space-y-0.5">
              {safetyTools.map((tool) => <li key={tool}>{tool}</li>)}
            </ul>
          </section>
        )}
        {consent.additional_notes && (
          <DefaultSection icon="📝" title="GM Notes" body={consent.additional_notes} />
        )}

        <label className="flex items-start gap-2 text-sm text-slate-200 mt-4 pt-4 border-t border-slate-700">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-1" />
          <span>I understand and agree to participate in this campaign.</span>
        </label>

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={accept}
            disabled={!agreed || submitting}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {submitting ? "Joining…" : "Join Campaign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DefaultSection({ icon, title, body }) {
  return (
    <section className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 mt-2">
      <div className="text-xs uppercase tracking-widest text-[#37F2D1] font-bold mb-1">
        {icon} {title}
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{body}</p>
    </section>
  );
}

export function needsCampaignConsent(campaign, user) {
  if (!campaign || !user) return false;
  const isGM = user.id === campaign.game_master_id;
  const isCoDM = Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(user.id);
  if (isGM || isCoDM) return false;
  const requiredVersion = Number(campaign.consent_version || 1);
  const stored = campaign.player_consents?.[user.id];
  if (!stored?.accepted) return true;
  return Number(stored.version || 0) < requiredVersion;
}
