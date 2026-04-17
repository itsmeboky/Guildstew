import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

/**
 * Campaign consent dialog. Shown the first time a player opens a
 * campaign they haven't consented to (or any time the GM bumps
 * consent_version). Renders the default Guildstew sections
 * followed by any GM-customized fields from
 * campaign.consent_config (content warnings, etiquette, safety
 * tools, additional notes).
 *
 * Acceptance writes to campaign.player_consents[user.id].
 */
export default function CampaignConsentDialog({ open, campaign, userId, onAccept }) {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const consent = campaign?.consent_config || {};
  const safetyTools = Array.isArray(consent.safety_tools) ? consent.safety_tools : [];

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

  const cancel = () => navigate(createPageUrl("Campaigns"));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cancel(); }}>
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
          <Button variant="outline" onClick={cancel}>Cancel</Button>
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

/**
 * Helper a page can call to decide whether to show the dialog. GM
 * + co-DMs auto-skip; everyone else needs consent at the campaign's
 * current version.
 */
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
