import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Compass, Users, Gamepad2, Search, Send, Clock, Check,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { displayName } from "@/utils/displayName";
import CampaignApplyFlow from "@/components/campaigns/CampaignApplyFlow";
import MyApplicationsInbox from "@/components/campaigns/MyApplicationsInbox";

/**
 * /campaigns/find
 *
 * Public discovery surface. Lists campaigns that opted into both
 * `is_public = true` AND `looking_for_players = true`. "Apply to
 * Join" opens a dialog with a pitch textarea that writes a
 * `campaign_applications` row the GM sees in campaign settings.
 *
 * Campaigns a user has already applied to show an "Applied" pill
 * instead of the Apply button so they can't spam the GM.
 */
export default function CampaignsFind() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [applyFor, setApplyFor] = useState(null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["publicCampaigns", search.trim()],
    queryFn: async () => {
      let q = supabase
        .from("campaigns")
        .select("id, title, name, system, campaign_description, description, max_players, player_ids, game_master_id, image_url, updated_date")
        .eq("is_public", true)
        .eq("looking_for_players", true)
        .order("updated_date", { ascending: false })
        .limit(40);
      const term = search.trim();
      if (term) q = q.ilike("title", `%${term}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const gmIds = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.game_master_id).filter(Boolean))),
    [campaigns],
  );
  const { data: gms = [] } = useQuery({
    queryKey: ["publicCampaignGMs", gmIds.sort().join(",")],
    queryFn: async () => {
      if (gmIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, avatar_url")
        .in("user_id", gmIds);
      return data || [];
    },
    enabled: gmIds.length > 0,
  });
  const gmName = (id) => {
    const p = gms.find((g) => g.user_id === id);
    return displayName(p, { fallback: "Unknown GM" });
  };

  // My existing applications — disables the Apply button on the
  // campaigns I've already sent a pitch to.
  const { data: myApps = [] } = useQuery({
    queryKey: ["myCampaignApplications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaign_applications")
        .select("campaign_id, status")
        .eq("applicant_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });
  const myAppByCampaign = (id) => myApps.find((a) => a.campaign_id === id) || null;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Compass className="w-7 h-7 text-[#37F2D1]" />
            Find a Campaign
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Public campaigns with open seats. Send a pitch; the GM decides who joins.
          </p>
        </div>

        <MyApplicationsInbox />

        <div className="relative max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="pl-9 bg-[#1E2430] border-slate-700 text-white"
          />
        </div>

        {campaigns.length === 0 ? (
          <p className="text-center py-20 text-slate-500 italic">
            No public campaigns are looking for players right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((c) => {
              const app = myAppByCampaign(c.id);
              const playerCount = Array.isArray(c.player_ids) ? c.player_ids.length : 0;
              const cap = Math.min(c.max_players || 6, 8);
              const full = playerCount >= cap;
              const isGm = c.game_master_id === user?.id;
              return (
                <div
                  key={c.id}
                  className="bg-[#1E2430] border border-slate-700 hover:border-[#37F2D1]/40 rounded-lg overflow-hidden transition-colors flex flex-col"
                >
                  {c.image_url && (
                    <div className="h-36 overflow-hidden bg-[#050816]">
                      <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <h2 className="text-lg font-black text-white line-clamp-1">{c.title || c.name}</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      GM <span className="text-[#37F2D1]">{gmName(c.game_master_id)}</span>
                      {c.system && <> · {c.system}</>}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {playerCount}/{cap}
                      </span>
                      {c.system && (
                        <span className="inline-flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3" /> {c.system}
                        </span>
                      )}
                    </div>

                    {(c.campaign_description || c.description) && (
                      <p className="text-sm text-slate-300 mt-3 line-clamp-3">
                        {c.campaign_description || c.description}
                      </p>
                    )}

                    <div className="mt-auto pt-4">
                      {isGm ? (
                        <p className="text-[11px] text-slate-500 italic">Your campaign.</p>
                      ) : app ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest rounded px-2 py-1 bg-amber-900/40 text-amber-300">
                          <Clock className="w-3 h-3" /> Applied — {app.status}
                        </span>
                      ) : full ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest rounded px-2 py-1 bg-slate-700 text-slate-400">
                          Full
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setApplyFor(c)}
                          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                        >
                          <Send className="w-3 h-3 mr-1" /> Apply to Join
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CampaignApplyFlow
        campaign={applyFor}
        onClose={() => setApplyFor(null)}
      />
    </div>
  );
}
