import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import GuildHallManager from "./GuildHallManager";

/**
 * Thin wrapper that fetches the campaign's guild_halls row + the
 * available upgrade options, then hands them to the existing
 * GuildHallManager component. Seeds a blank hall on first render
 * so a brand-new campaign's Guild Hall tab isn't empty.
 *
 * Talks to Supabase directly rather than through the base44 entity
 * shim — both code paths hit the same `guild_halls` /
 * `guild_hall_options` tables, but inlining the queries makes the
 * dependency explicit.
 */
export default function GuildHallPanel({ campaignId, campaign, isGM }) {
  const queryClient = useQueryClient();

  const { data: guildHall, isLoading } = useQuery({
    queryKey: ["guildHall", campaignId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("guild_halls")
        .select("*")
        .eq("campaign_id", campaignId);
      if (error) { console.error("GuildHall load failed:", error); return null; }
      if (rows && rows.length > 0) return rows[0];

      // Auto-seed a blank hall on first visit so the manager can
      // open for a campaign that never called the upgrade API.
      const { data: created, error: createErr } = await supabase
        .from("guild_halls")
        .insert({ campaign_id: campaignId })
        .select("*")
        .single();
      if (createErr) { console.error("GuildHall seed failed:", createErr); return null; }
      return created;
    },
    enabled: !!campaignId,
  });

  const { data: options = [] } = useQuery({
    queryKey: ["guildHallOptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guild_hall_options").select("*");
      if (error) { console.error("GuildHallOption list failed:", error); return []; }
      return data || [];
    },
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: async (patch) => {
      const { error } = await supabase
        .from("guild_halls")
        .update(patch)
        .eq("id", guildHall.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guildHall", campaignId] }),
  });

  const handleUpdate = (patch) => updateMutation.mutate(patch);
  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["guildHall", campaignId] });

  if (isLoading) {
    return <div className="text-sm text-slate-500 italic text-center py-12">Loading guild hall…</div>;
  }
  if (!guildHall) {
    return (
      <div className="text-sm text-slate-500 italic text-center py-12">
        No guild hall yet. Try again in a moment.
      </div>
    );
  }

  return (
    <GuildHallManager
      campaign={campaign}
      guildHall={guildHall}
      options={options}
      canEdit={isGM}
      onUpdate={handleUpdate}
      onRefresh={handleRefresh}
    />
  );
}
