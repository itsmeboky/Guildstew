import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Inbox, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";

/**
 * GM-side applications inbox.
 *
 * Lists pending `campaign_applications` for the given campaign.
 * Accept → adds the applicant to `campaigns.player_ids` and stamps
 * the row 'accepted'. Reject → just stamps 'rejected'. Both write
 * `responded_at` so applicants see the GM acted.
 *
 * Renders nothing when there are no pending apps so the section
 * stays out of the way until activity arrives.
 */
export default function CampaignApplicationsPanel({ campaign, campaignId }) {
  const queryClient = useQueryClient();
  const id = campaignId || campaign?.id;

  const { data: applications = [] } = useQuery({
    queryKey: ["campaignApplications", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaign_applications")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const applicantIds = Array.from(new Set(applications.map((a) => a.applicant_id)));
  const { data: profiles = [] } = useQuery({
    queryKey: ["campaignAppApplicants", applicantIds.sort().join(",")],
    queryFn: async () => {
      if (applicantIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, avatar_url")
        .in("user_id", applicantIds);
      return data || [];
    },
    enabled: applicantIds.length > 0,
  });
  const profileFor = (uid) => profiles.find((p) => p.user_id === uid) || null;

  const accept = useMutation({
    mutationFn: async (app) => {
      // Read the live player list so we don't clobber a concurrent
      // change. Cap at the smaller of campaign.max_players and 8 so
      // accept can't bust the platform's hard limit.
      const { data: c, error: readErr } = await supabase
        .from("campaigns")
        .select("player_ids, max_players")
        .eq("id", id)
        .maybeSingle();
      if (readErr) throw readErr;
      const ids = Array.isArray(c?.player_ids) ? c.player_ids : [];
      const cap = Math.min(c?.max_players || 6, 8);
      if (ids.includes(app.applicant_id)) {
        // Already a member somehow — just close the app row.
      } else {
        if (ids.length >= cap) throw new Error("Campaign is full.");
        const { error } = await supabase
          .from("campaigns")
          .update({ player_ids: [...ids, app.applicant_id] })
          .eq("id", id);
        if (error) throw error;
      }
      const { error: appErr } = await supabase
        .from("campaign_applications")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", app.id);
      if (appErr) throw appErr;
    },
    onSuccess: () => {
      toast.success("Applicant added to the campaign.");
      queryClient.invalidateQueries({ queryKey: ["campaignApplications", id] });
      queryClient.invalidateQueries({ queryKey: ["userCampaigns"] });
    },
    onError: (err) => {
      console.error("Accept application", err);
      toast.error(`Failed to accept: ${err?.message || err}`);
    },
  });

  const reject = useMutation({
    mutationFn: async (app) => {
      const { error } = await supabase
        .from("campaign_applications")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", app.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application rejected.");
      queryClient.invalidateQueries({ queryKey: ["campaignApplications", id] });
    },
    onError: (err) => {
      console.error("Reject application", err);
      toast.error(`Failed to reject: ${err?.message || err}`);
    },
  });

  const pending = applications.filter((a) => a.status === "pending");
  const handled = applications.filter((a) => a.status !== "pending");

  if (applications.length === 0) return null;

  return (
    <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Inbox className="w-5 h-5 text-[#37F2D1]" /> Applications
        </h2>
        <p className="text-xs text-slate-500">
          {pending.length} pending · {handled.length} handled
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No pending applications.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((app) => {
            const p = profileFor(app.applicant_id);
            return (
              <li key={app.id} className="bg-[#050816] border border-slate-800 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200 flex-shrink-0">
                      {(p?.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold">
                      {p?.username || "Anonymous"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Applied {new Date(app.created_at).toLocaleString()}
                    </p>
                    {app.message && (
                      <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
                        {app.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reject.mutate(app)}
                    disabled={reject.isPending}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-3 h-3 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => accept.mutate(app)}
                    disabled={accept.isPending}
                    className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold"
                  >
                    <Check className="w-3 h-3 mr-1" /> Accept
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {handled.length > 0 && (
        <details className="mt-4">
          <summary className="text-[10px] uppercase tracking-widest text-slate-500 font-black cursor-pointer">
            History ({handled.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {handled.map((app) => {
              const p = profileFor(app.applicant_id);
              return (
                <li key={app.id} className="text-[11px] text-slate-500 flex items-center justify-between gap-2 py-1">
                  <span className="truncate">
                    <Clock className="w-3 h-3 inline-block mr-1 align-middle" />
                    {p?.username || "Anonymous"}
                  </span>
                  <span className={`font-bold uppercase tracking-widest ${
                    app.status === "accepted" ? "text-emerald-300" : "text-rose-300"
                  }`}>
                    {app.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
