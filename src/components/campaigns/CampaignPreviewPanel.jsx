import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Gamepad2, Ban, Sparkles, AlertTriangle, ScrollText } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { listCampaignBans, groupBansByType, BAN_TYPE_LABELS } from "@/lib/campaignBans";
import { isCampaignModded } from "@/lib/campaignApplications";
import { displayName } from "@/utils/displayName";

/**
 * Campaign preview — rendered before the applicant picks a
 * character. Pulls everything they need to decide whether the
 * campaign is a fit: GM, system, description, seat count, house
 * rules, active bans, and the installed-mods notice.
 *
 * Kept read-only: the Apply button that passes state to Step 3+
 * lives in the parent CampaignApplyFlow so this component is
 * reusable on a standalone campaign-details page if we ship one.
 */
export default function CampaignPreviewPanel({ campaign }) {
  const { data: gmProfile } = useQuery({
    queryKey: ["campaignPreviewGM", campaign?.game_master_id],
    queryFn: async () => {
      if (!campaign?.game_master_id) return null;
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, avatar_url")
        .eq("user_id", campaign.game_master_id)
        .maybeSingle();
      return data;
    },
    enabled: !!campaign?.game_master_id,
  });

  const { data: bans = [] } = useQuery({
    queryKey: ["campaignPreviewBans", campaign?.id],
    queryFn: () => listCampaignBans(campaign.id),
    enabled: !!campaign?.id,
  });

  const { data: modInfo = { modded: false, mods: [] } } = useQuery({
    queryKey: ["campaignPreviewMods", campaign?.id],
    queryFn: () => isCampaignModded(campaign.id),
    enabled: !!campaign?.id,
  });

  const grouped = useMemo(() => groupBansByType(bans), [bans]);
  const hasAnyBans = bans.length > 0;

  const playerCount = Array.isArray(campaign?.player_ids) ? campaign.player_ids.length : 0;
  const cap = Math.min(Number(campaign?.max_players) || 6, 8);
  const houseRules = extractHouseRulesSummary(campaign?.homebrew_rules);

  return (
    <div className="space-y-4">
      <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-white">
              {campaign?.title || campaign?.name || "Untitled Campaign"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              GM <span className="text-[#37F2D1] font-bold">{displayName(gmProfile, { fallback: "Unknown GM" })}</span>
              {campaign?.system && <> · {campaign.system}</>}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 bg-[#050816] text-slate-300 border border-slate-700 flex-shrink-0">
            <Users className="w-3 h-3" /> {playerCount}/{cap}
          </span>
        </div>

        {(campaign?.campaign_description || campaign?.description) && (
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {campaign.campaign_description || campaign.description}
          </p>
        )}

        {campaign?.system && (
          <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" /> Game system: {campaign.system}
          </p>
        )}
      </section>

      {houseRules && (
        <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
            <ScrollText className="w-4 h-4 text-[#37F2D1]" /> House Rules
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {houseRules}
          </p>
        </section>
      )}

      {modInfo.modded && (
        <section className="bg-violet-500/10 border border-violet-400/40 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-bold text-violet-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> This campaign uses custom mods
          </h4>
          <p className="text-xs text-violet-100/80 leading-relaxed">
            You'll need to create a new character using this campaign's modded rules.
          </p>
          {modInfo.mods.length > 0 && (
            <ul className="mt-2 space-y-1">
              {modInfo.mods.map((m) => (
                <li key={m.id} className="text-[11px] text-violet-100 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-300" />
                  <span className="font-bold">{m.mod_name || m.mod_id?.slice(0, 8) || "Custom mod"}</span>
                  {m.mod_type && <span className="text-violet-300/70">· {m.mod_type}</span>}
                  {m.mod_version && <span className="text-violet-300/50">v{m.mod_version}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {hasAnyBans && (
        <section className="bg-rose-500/10 border border-rose-400/40 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-bold text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> This campaign has content restrictions
          </h4>
          {Object.entries(grouped).map(([type, entries]) => {
            if (!entries || entries.length === 0) return null;
            const label = BAN_TYPE_LABELS[type]?.plural || type;
            return (
              <div key={type} className="space-y-1">
                <p className="text-[11px] uppercase tracking-widest font-bold text-rose-300">
                  Banned {label}
                </p>
                <ul className="space-y-1">
                  {entries.map((b) => (
                    <li key={b.id} className="text-xs text-rose-100 leading-snug">
                      <span className="inline-flex items-center gap-1 font-bold">
                        <Ban className="w-3 h-3" /> {b.banned_name}
                      </span>
                      {b.reason && (
                        <span className="text-rose-200/80"> — {b.reason}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

/**
 * The homebrew_rules column is a large JSONB blob (see
 * HouseRulesPanel) with top-level keys per mechanic. For the preview
 * we render a short paragraph summarizing any non-default overrides
 * so applicants see what they're agreeing to without a wall of JSON.
 */
function extractHouseRulesSummary(rules) {
  if (!rules || typeof rules !== "object") return null;
  const lines = [];
  const combat = rules.combat || {};
  if (combat.critical_hits?.doubleDice === false) lines.push("Critical hits: flat max damage (no doubled dice).");
  if (combat.death_saves?.dc && combat.death_saves.dc !== 10) lines.push(`Death save DC: ${combat.death_saves.dc}.`);
  if (combat.initiative?.group_turns) lines.push("Initiative: group turns in rotating brackets.");

  const rest = rules.rest_rules || {};
  if (rest.short_rest_minutes && rest.short_rest_minutes !== 60) lines.push(`Short rest: ${rest.short_rest_minutes} min.`);
  if (rest.long_rest_hours && rest.long_rest_hours !== 8) lines.push(`Long rest: ${rest.long_rest_hours} hr.`);

  if (rules.variant?.milestone_leveling) lines.push("Leveling: milestone.");
  if (rules.variant?.slow_natural_healing) lines.push("Slow natural healing — no HP back from long rests without healing dice.");

  if (lines.length === 0) return null;
  return lines.join(" ");
}
