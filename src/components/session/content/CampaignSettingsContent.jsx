import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { TIME_OPTIONS } from "@/utils/sessionTime";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/**
 * Full in-session Campaign Settings editor. Grouped into three
 * cards — Session Settings (day / time), Game Rules (guild hall
 * toggle, retry policy, max_players, open_recruitment), and Roles
 * (co-DMs + mole). Consent rating appears as a locked read-only
 * block at the bottom; it was signed off at campaign creation
 * and cannot be modified here.
 */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CampaignSettingsContent({ campaignId, campaign, allUserProfiles = [] }) {
  const queryClient = useQueryClient();

  const [sessionDay, setSessionDay] = useState(campaign?.session_day || "");
  const [sessionTime, setSessionTime] = useState(campaign?.session_time || "");
  const [guildHall, setGuildHall] = useState(campaign?.guild_hall_enabled !== false);
  const [retryPolicy, setRetryPolicy] = useState(campaign?.skill_check_retry_policy || "next_session");
  const [maxPlayers, setMaxPlayers] = useState(campaign?.max_players ?? 6);
  const [openRecruitment, setOpenRecruitment] = useState(!!campaign?.open_recruitment);
  const [coDmTarget, setCoDmTarget] = useState("");
  const [moleTarget, setMoleTarget] = useState(campaign?.mole_player_id || "");

  useEffect(() => {
    setSessionDay(campaign?.session_day || "");
    setSessionTime(campaign?.session_time || "");
    setGuildHall(campaign?.guild_hall_enabled !== false);
    setRetryPolicy(campaign?.skill_check_retry_policy || "next_session");
    setMaxPlayers(campaign?.max_players ?? 6);
    setOpenRecruitment(!!campaign?.open_recruitment);
    setMoleTarget(campaign?.mole_player_id || "");
  }, [campaign?.id]);

  const saveCampaign = (updates) =>
    base44.entities.Campaign.update(campaignId, updates).then(() => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    });

  const updateCampaign = useMutation({
    mutationFn: saveCampaign,
    onError: (err) => toast.error(err?.message || "Couldn't save."),
  });

  const coDmIds = Array.isArray(campaign?.co_dm_ids) ? campaign.co_dm_ids : [];
  const playerIds = Array.isArray(campaign?.player_ids) ? campaign.player_ids : [];

  const addCoDM = useMutation({
    mutationFn: (uid) => saveCampaign({ co_dm_ids: [...coDmIds, uid] }),
    onSuccess: () => { setCoDmTarget(""); toast.success("Co-DM added."); },
    onError: (err) => toast.error(err?.message || "Couldn't add co-DM."),
  });
  const removeCoDM = useMutation({
    mutationFn: (uid) => saveCampaign({ co_dm_ids: coDmIds.filter((id) => id !== uid) }),
    onSuccess: () => toast.success("Co-DM removed."),
    onError: (err) => toast.error(err?.message || "Couldn't remove co-DM."),
  });
  const setMole = useMutation({
    mutationFn: (uid) => saveCampaign({ mole_player_id: uid || null }),
    onSuccess: () => toast.success("Mole updated."),
    onError: (err) => toast.error(err?.message || "Couldn't set mole."),
  });

  const nameFor = (uid) => {
    const p = allUserProfiles.find((x) => x.user_id === uid);
    return p?.username || p?.email || uid;
  };

  const consentRating = campaign?.consent_rating || campaign?.campaign_rating || null;

  return (
    <div className="p-6 overflow-y-auto max-h-full h-full space-y-6">
      {/* Session settings */}
      <section>
        <h3 className="text-white font-semibold mb-3">Session Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Session Day</label>
            <Select
              value={sessionDay || "__none"}
              onValueChange={(v) => {
                const next = v === "__none" ? "" : v;
                setSessionDay(next);
                updateCampaign.mutate({ session_day: next });
              }}
            >
              <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
                <SelectValue placeholder="Select day…" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                <SelectItem value="__none">Unscheduled</SelectItem>
                {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Session Time</label>
            <Select
              value={sessionTime || "__none"}
              onValueChange={(v) => {
                const next = v === "__none" ? "" : v;
                setSessionTime(next);
                updateCampaign.mutate({ session_time: next });
              }}
            >
              <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
                <SelectValue placeholder="Select time…" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white max-h-64">
                <SelectItem value="__none">Unscheduled</SelectItem>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Game rules */}
      <section className="border-t border-slate-700/50 pt-6">
        <h3 className="text-white font-semibold mb-4">Game Rules</h3>

        <Row
          label="Guild Hall & Training"
          hint="Enable Guild Hall upgrades and downtime training"
        >
          <Switch
            checked={guildHall}
            onCheckedChange={(v) => {
              setGuildHall(v);
              updateCampaign.mutate({ guild_hall_enabled: v });
            }}
          />
        </Row>

        <Panel label="Knowledge Check Retry Policy">
          <Select
            value={retryPolicy}
            onValueChange={(v) => {
              setRetryPolicy(v);
              updateCampaign.mutate({ skill_check_retry_policy: v });
            }}
          >
            <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
              <SelectItem value="next_session">Next Session</SelectItem>
              <SelectItem value="24_hours">24 Hours</SelectItem>
              <SelectItem value="permanent">Permanent (one attempt)</SelectItem>
              <SelectItem value="unlimited">Unlimited retries</SelectItem>
            </SelectContent>
          </Select>
        </Panel>

        <Panel label="Max Players">
          <Select
            value={String(maxPlayers)}
            onValueChange={(v) => {
              const n = Number(v);
              setMaxPlayers(n);
              updateCampaign.mutate({ max_players: n });
            }}
          >
            <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} Players</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">Capped at 8 players + 1 GM.</p>
        </Panel>

        <Row
          label="Open Recruitment"
          hint="Allow players to request to join"
        >
          <Switch
            checked={openRecruitment}
            onCheckedChange={(v) => {
              setOpenRecruitment(v);
              updateCampaign.mutate({ open_recruitment: v });
            }}
          />
        </Row>
      </section>

      {/* Roles */}
      <section className="border-t border-slate-700/50 pt-6">
        <h3 className="text-white font-semibold mb-4">Roles</h3>

        <Panel label="Co-DM / Co-GM">
          <Select value={coDmTarget || "__pick"} onValueChange={setCoDmTarget}>
            <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
              <SelectValue placeholder="Add a co-DM…" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
              <SelectItem value="__pick">Add a co-DM…</SelectItem>
              {playerIds.filter((id) => !coDmIds.includes(id)).map((uid) => (
                <SelectItem key={uid} value={uid}>{nameFor(uid)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {coDmTarget && coDmTarget !== "__pick" && (
            <Button
              onClick={() => addCoDM.mutate(coDmTarget)}
              disabled={addCoDM.isPending}
              className="mt-2 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-xs"
            >
              {addCoDM.isPending ? "Adding…" : `Add ${nameFor(coDmTarget)}`}
            </Button>
          )}
          {coDmIds.length > 0 && (
            <ul className="mt-3 space-y-1">
              {coDmIds.map((uid) => (
                <li key={uid} className="flex items-center justify-between p-2 bg-[#0f1219] rounded">
                  <span className="text-sm text-slate-300 truncate">{nameFor(uid)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCoDM.mutate(uid)}
                    className="text-red-400 text-xs"
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          label="Mole (Secret GM Ally)"
          hint="Can see GM-flagged content in World Lore."
        >
          <Select
            value={moleTarget || "__none"}
            onValueChange={(v) => {
              const next = v === "__none" ? "" : v;
              setMoleTarget(next);
              setMole.mutate(next);
            }}
          >
            <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
              <SelectValue placeholder="Designate mole…" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
              <SelectItem value="__none">No mole</SelectItem>
              {playerIds.map((uid) => (
                <SelectItem key={uid} value={uid}>{nameFor(uid)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Panel>
      </section>

      {/* Consent — locked */}
      <section className="border-t border-slate-700/50 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-slate-500" />
          <h3 className="text-slate-500 font-semibold">Content Consent</h3>
        </div>
        <div className="p-3 bg-[#0f1219] rounded-lg border border-slate-700/30">
          <p className="text-sm text-slate-400">
            Rating: {consentRating || "Not set"}
          </p>
          <p className="text-xs text-slate-600 mt-1 italic">
            Locked at campaign creation. Cannot be modified.
          </p>
        </div>
      </section>
    </div>
  );
}

function Panel({ label, hint, children }) {
  return (
    <div className="p-3 bg-[#1a1f2e] rounded-lg border border-slate-700/50 mb-3">
      <p className="text-sm text-white mb-2">{label}</p>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg border border-slate-700/50 mb-3">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  );
}
