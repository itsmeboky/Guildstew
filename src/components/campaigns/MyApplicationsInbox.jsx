import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Inbox, AlertTriangle, Pencil, Shuffle, MessageSquare, Lock, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { displayName } from "@/utils/displayName";
import { MAX_SUBMISSIONS } from "@/lib/campaignApplications";
import CampaignApplyFlow from "@/components/campaigns/CampaignApplyFlow";

/**
 * Player-facing inbox of the applicant's own campaign applications.
 * Renders above the CampaignsFind grid so rejected-character
 * resubmissions are the first thing the player sees when they come
 * back to the discovery surface.
 *
 * Row states:
 *   pending              → "Waiting on the GM"
 *   rejected_character   → GM message + Edit / Choose Different buttons
 *   rejected_player      → "Declined" (read-only)
 *   accepted             → "You're in!" with link to the campaign
 *   auto_closed          → locked: "This application has been closed
 *                          after multiple rejections."
 */
export default function MyApplicationsInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [replayCampaign, setReplayCampaign] = useState(null);

  const { data: applications = [] } = useQuery({
    queryKey: ["myCampaignApplicationsInbox", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("campaign_applications")
        .select("*")
        .or(`user_id.eq.${user.id},applicant_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const campaignIds = useMemo(
    () => Array.from(new Set(applications.map((a) => a.campaign_id))),
    [applications],
  );

  const { data: campaigns = [] } = useQuery({
    queryKey: ["myAppCampaigns", campaignIds.sort().join(",")],
    queryFn: async () => {
      if (campaignIds.length === 0) return [];
      const { data } = await supabase
        .from("campaigns")
        .select("id, title, name, game_master_id, image_url, max_players, player_ids, campaign_description, description, system")
        .in("id", campaignIds);
      return data || [];
    },
    enabled: campaignIds.length > 0,
  });

  const gmIds = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.game_master_id).filter(Boolean))),
    [campaigns],
  );
  const { data: gms = [] } = useQuery({
    queryKey: ["myAppCampaignGMs", gmIds.sort().join(",")],
    queryFn: async () => {
      if (gmIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username")
        .in("user_id", gmIds);
      return data || [];
    },
    enabled: gmIds.length > 0,
  });

  // Only show action-worthy rows — pending and rejected_character —
  // at the top. Accepted / rejected_player / auto_closed go into a
  // collapsible history section so the inbox doesn't grow forever.
  const active = applications.filter((a) => ["pending", "rejected_character"].includes(a.status));
  const history = applications.filter((a) => !["pending", "rejected_character"].includes(a.status));

  if (applications.length === 0) return null;

  const campaignFor = (id) => campaigns.find((c) => c.id === id) || null;
  const gmFor = (id) => gms.find((g) => g.user_id === id) || null;

  return (
    <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
        <Inbox className="w-4 h-4 text-[#37F2D1]" /> My Applications
      </h2>

      {active.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No active applications.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((app) => {
            const campaign = campaignFor(app.campaign_id);
            const gm = gmFor(campaign?.game_master_id);
            return (
              <ApplicationRow
                key={app.id}
                app={app}
                campaign={campaign}
                gm={gm}
                onEdit={() => {
                  // Reopen the character in the creator, mod-aware.
                  if (!app.character_id) {
                    setReplayCampaign(campaign);
                    return;
                  }
                  const params = new URLSearchParams();
                  params.set("campaignId", app.campaign_id);
                  params.set("forApply", "1");
                  params.set("edit", app.character_id);
                  params.set("returnTo", "CampaignsFind");
                  navigate(createPageUrl("CharacterCreator") + "?" + params.toString());
                }}
                onChooseOther={() => setReplayCampaign(campaign)}
              />
            );
          })}
        </ul>
      )}

      {history.length > 0 && (
        <details>
          <summary className="text-[10px] uppercase tracking-widest text-slate-500 cursor-pointer">
            History ({history.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {history.map((app) => {
              const campaign = campaignFor(app.campaign_id);
              return (
                <li key={app.id} className="text-[11px] text-slate-400 flex items-center justify-between bg-[#050816] border border-slate-800 rounded px-2 py-1">
                  <span className="truncate">{campaign?.title || campaign?.name || "Campaign"}</span>
                  <StatusPill status={app.status} />
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <CampaignApplyFlow
        campaign={replayCampaign}
        onClose={() => setReplayCampaign(null)}
      />
    </section>
  );
}

function ApplicationRow({ app, campaign, gm, onEdit, onChooseOther }) {
  if (!campaign) return null;
  const attemptsRemaining = Math.max(0, MAX_SUBMISSIONS - (app.submission_count || 1));

  if (app.status === "rejected_character") {
    return (
      <li className="bg-[#050816] border border-amber-500/40 rounded p-3 space-y-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-bold leading-tight">
              {displayName(gm, { fallback: "The GM" })} wants you in{" "}
              <span className="text-[#37F2D1]">{campaign.title || campaign.name}</span>{" "}
              but asked you to use a different character.
            </p>
            {app.gm_message && (
              <div className="mt-2 bg-[#1E2430] border border-slate-700 rounded p-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> GM's note
                </p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap mt-0.5">{app.gm_message}</p>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-2">
              {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining before this application auto-closes.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onChooseOther}
            className="border-slate-700 text-slate-200"
          >
            <Shuffle className="w-3 h-3 mr-1" /> Choose Different Character
          </Button>
          <Button
            size="sm"
            onClick={onEdit}
            disabled={!app.character_id}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Pencil className="w-3 h-3 mr-1" /> Edit Character
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="bg-[#050816] border border-slate-800 rounded p-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm text-white font-bold truncate">{campaign.title || campaign.name}</p>
        <p className="text-[11px] text-slate-500 truncate">
          GM {displayName(gm, { fallback: "Unknown" })}
          {app.submission_count > 1 && ` · attempt #${app.submission_count}`}
        </p>
      </div>
      <StatusPill status={app.status} />
    </li>
  );
}

function StatusPill({ status }) {
  const base = "inline-flex items-center gap-1 text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 font-bold flex-shrink-0";
  if (status === "pending") {
    return <span className={`${base} bg-amber-900/40 text-amber-300 border border-amber-500/40`}>Waiting on GM</span>;
  }
  if (status === "accepted") {
    return (
      <span className={`${base} bg-emerald-900/40 text-emerald-300 border border-emerald-500/40`}>
        <CheckCircle2 className="w-3 h-3" /> Accepted
      </span>
    );
  }
  if (status === "rejected_player") {
    return <span className={`${base} bg-rose-900/40 text-rose-300 border border-rose-500/40`}>Declined</span>;
  }
  if (status === "auto_closed") {
    return (
      <span className={`${base} bg-slate-800 text-slate-400 border border-slate-700`}>
        <Lock className="w-3 h-3" /> Closed
      </span>
    );
  }
  return <span className={`${base} bg-slate-800 text-slate-300`}>{status}</span>;
}
