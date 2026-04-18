import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import GuildHallManager from "./GuildHallManager";

/**
 * Thin wrapper that fetches the campaign's GuildHall row + the
 * available upgrade options, then hands them to the existing
 * GuildHallManager component. Creates the row on first render so a
 * brand-new campaign's Guild Hall tab isn't blank.
 */
export default function GuildHallPanel({ campaignId, campaign, isGM }) {
  const queryClient = useQueryClient();

  const { data: guildHall, isLoading } = useQuery({
    queryKey: ["guildHall", campaignId],
    queryFn: async () => {
      const rows = await base44.entities.GuildHall.filter({ campaign_id: campaignId }).catch(() => []);
      if (rows.length > 0) return rows[0];
      // Auto-seed a blank hall on first visit — otherwise the
      // manager can't open for a campaign that never called the
      // upgrade API.
      try {
        return await base44.entities.GuildHall.create({ campaign_id: campaignId });
      } catch (err) {
        console.error("GuildHall seed failed:", err);
        return null;
      }
    },
    enabled: !!campaignId,
  });

  const { data: options = [] } = useQuery({
    queryKey: ["guildHallOptions"],
    queryFn: () => base44.entities.GuildHallOption.list().catch(() => []),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: (patch) => base44.entities.GuildHall.update(guildHall.id, patch),
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
