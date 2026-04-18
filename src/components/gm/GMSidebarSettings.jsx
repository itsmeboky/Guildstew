import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * In-session Campaign Settings editor. Exposes the knobs a GM
 * actually wants to flip mid-session:
 *
 *   - House Rules textarea, persisted under campaign.settings
 *   - Co-DM add / remove
 *   - Mole designation
 *   - Session day / time alerts
 *
 * Content consent is *not* editable here — it was locked at
 * campaign creation time. The panel surfaces the current rating
 * read-only so the GM can still see what the party agreed to.
 * Full settings (images, retry policy, deeper guild hall config,
 * etc.) still live on the Campaign Settings page.
 */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function GMSidebarSettings({ campaignId, campaign, allUserProfiles = [] }) {
  const queryClient = useQueryClient();
  const [houseRules, setHouseRules] = useState(campaign?.settings?.house_rules || "");
  const [sessionDay, setSessionDay] = useState(campaign?.session_day || "");
  const [sessionTime, setSessionTime] = useState(campaign?.session_time || "");
  const [coDmTarget, setCoDmTarget] = useState("");
  const [moleTarget, setMoleTarget] = useState(campaign?.mole_player_id || "");

  useEffect(() => {
    setHouseRules(campaign?.settings?.house_rules || "");
    setSessionDay(campaign?.session_day || "");
    setSessionTime(campaign?.session_time || "");
    setMoleTarget(campaign?.mole_player_id || "");
  }, [campaign?.id]);

  const saveCampaign = (updates) =>
    base44.entities.Campaign.update(campaignId, updates).then(() => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    });

  const saveHouseRules = useMutation({
    mutationFn: () => saveCampaign({
      settings: { ...(campaign?.settings || {}), house_rules: houseRules },
    }),
    onSuccess: () => toast.success("House rules saved."),
    onError: (err) => toast.error(err?.message || "Couldn't save house rules."),
  });

  const saveSessionAlert = useMutation({
    mutationFn: () => saveCampaign({ session_day: sessionDay, session_time: sessionTime }),
    onSuccess: () => toast.success("Session alert updated."),
    onError: (err) => toast.error(err?.message || "Couldn't save session alert."),
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

  const consentRating = campaign?.campaign_rating || campaign?.consent_rating || null;

  return (
    <div className="space-y-6">
      <h3 className="text-white font-semibold text-sm">Campaign Settings</h3>

      {/* House rules */}
      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
          House Rules
        </label>
        <textarea
          value={houseRules}
          onChange={(e) => setHouseRules(e.target.value)}
          rows={5}
          className="w-full bg-[#0f1219] border border-slate-700 rounded-lg p-3 text-sm text-white resize-none"
          placeholder="Enter any house rules for your campaign…"
        />
        <button
          type="button"
          onClick={() => saveHouseRules.mutate()}
          disabled={saveHouseRules.isPending}
          className="mt-2 w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-xs py-2 rounded-lg disabled:opacity-50"
        >
          {saveHouseRules.isPending ? "Saving…" : "Save House Rules"}
        </button>
      </div>

      {/* Co-DMs */}
      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
          Co-DM / Co-GM
        </label>
        <Select value={coDmTarget} onValueChange={setCoDmTarget}>
          <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
            <SelectValue placeholder="Add a co-DM…" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
            {playerIds.filter((id) => !coDmIds.includes(id)).length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 italic">No eligible players.</div>
            ) : (
              playerIds
                .filter((id) => !coDmIds.includes(id))
                .map((uid) => (
                  <SelectItem key={uid} value={uid}>{nameFor(uid)}</SelectItem>
                ))
            )}
          </SelectContent>
        </Select>
        {coDmTarget && (
          <button
            type="button"
            onClick={() => addCoDM.mutate(coDmTarget)}
            disabled={addCoDM.isPending}
            className="mt-2 w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-xs py-2 rounded-lg disabled:opacity-50"
          >
            {addCoDM.isPending ? "Adding…" : `Add ${nameFor(coDmTarget)}`}
          </button>
        )}
        {coDmIds.length > 0 && (
          <ul className="mt-2 space-y-1">
            {coDmIds.map((uid) => (
              <li key={uid} className="flex items-center justify-between p-2 bg-[#0f1219] rounded">
                <span className="text-sm text-slate-300 truncate">{nameFor(uid)}</span>
                <button
                  type="button"
                  onClick={() => removeCoDM.mutate(uid)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950/30"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mole */}
      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
          Mole (Secret GM Ally)
        </label>
        <Select
          value={moleTarget || "__none"}
          onValueChange={(v) => {
            const next = v === "__none" ? "" : v;
            setMoleTarget(next);
            setMole.mutate(next);
          }}
        >
          <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
            <SelectValue placeholder="Designate a mole…" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
            <SelectItem value="__none">No mole</SelectItem>
            {playerIds.map((uid) => (
              <SelectItem key={uid} value={uid}>{nameFor(uid)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1">
          The mole can see GM-flagged content in World Lore.
        </p>
      </div>

      {/* Session alert */}
      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
          Session Alerts
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-300">Day</span>
            <Select value={sessionDay || "__none"} onValueChange={(v) => setSessionDay(v === "__none" ? "" : v)}>
              <SelectTrigger className="w-32 bg-[#0f1219] border-slate-700 text-white">
                <SelectValue placeholder="Day…" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                <SelectItem value="__none">Unscheduled</SelectItem>
                {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-300">Time</span>
            <Input
              type="time"
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
              className="w-32 bg-[#0f1219] border-slate-700 text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => saveSessionAlert.mutate()}
            disabled={saveSessionAlert.isPending}
            className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-xs py-2 rounded-lg disabled:opacity-50"
          >
            {saveSessionAlert.isPending ? "Saving…" : "Save Session Alert"}
          </button>
        </div>
      </div>

      {/* Consent — read-only */}
      <div className="border border-slate-700/30 rounded-lg p-3 bg-slate-800/30 space-y-2">
        {consentRating && (
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-slate-300">Content Rating: {consentRating}</p>
              <p className="text-xs text-slate-500">Set at campaign creation — cannot be modified.</p>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500 italic">
          Content consent settings were locked when this campaign was created and cannot be
          modified. This protects all players who joined under the original agreement.
        </p>
      </div>
    </div>
  );
}
