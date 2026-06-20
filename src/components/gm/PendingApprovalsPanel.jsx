import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Church, Check, X as XIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

/**
 * Pending player-submitted content awaiting GM approval, for the campaign GM
 * panel (CampaignView). This is the always-visible surface — a nav item +
 * count badge feed off `usePendingApprovals`, and this panel renders the
 * always-on list with per-item accept / reject and an explicit empty state.
 *
 * Built as a GENERIC list of pending items so future content types slot in.
 * DEITY is the only wired type this run (materialized on join by
 * materializeJoinBonds in campaignApplications.js). GM-only by virtue of its
 * mount (the whole panel is GM-only).
 */

// Shared query → normalized generic items. Both the nav badge (count) and
// this panel call it; the shared queryKey dedupes the fetch.
export function usePendingApprovals(campaignId, enabled) {
  const { data: deities = [] } = useQuery({
    queryKey: ["pendingApprovals", "deity", campaignId],
    queryFn: () => base44.entities.Deity
      .filter({
        campaign_id: campaignId,
        approval_status: "pending",
        source: "player-submitted",
      })
      .catch(() => []),
    enabled: !!enabled && !!campaignId,
    refetchInterval: 15000,
  });

  const items = (deities || [])
    .filter((d) => d?.id)
    .map((d) => ({
      key: `deity:${d.id}`,
      type: "deity",
      typeLabel: "Deity",
      id: d.id,
      name: d.name,
      description: d.description,
      image_url: d.image_url,
    }));

  return { items, count: items.length };
}

export default function PendingApprovalsPanel({ campaignId, isGM }) {
  const queryClient = useQueryClient();
  const { items } = usePendingApprovals(campaignId, isGM);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["pendingApprovals", "deity", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["deities", campaignId] });
  };

  const decide = useMutation({
    mutationFn: async ({ item, status }) => {
      // status: 'accepted' → renders in Deities & Religion; 'rejected' → hidden.
      if (item.type === "deity") {
        await base44.entities.Deity.update(item.id, {
          approval_status: status,
          updated_at: new Date().toISOString(),
        });
      }
      return { item, status };
    },
    onSuccess: ({ status }) => {
      toast.success(status === "accepted" ? "Approved." : "Rejected.");
      invalidate();
    },
    onError: (err) => {
      console.error("decide approval", err);
      toast.error(`Couldn't update: ${err?.message || err}`);
    },
  });

  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Pending Approvals</h2>

      {items.length === 0 ? (
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-10 text-center">
          <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No pending approvals</p>
          <p className="text-slate-500 text-sm mt-1">
            Player-submitted content (like a custom deity) shows up here when a player
            joins, for you to accept or reject.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex gap-3 items-start bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-4"
            >
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-md bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                  <Church className="w-6 h-6 text-slate-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">
                    {item.typeLabel}
                  </span>
                  <span className="font-bold text-white truncate">{item.name}</span>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {item.description}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ item, status: "accepted" })}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-semibold"
                  >
                    <Check className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ item, status: "rejected" })}
                    className="border-red-700/60 text-red-300 hover:bg-red-900/30"
                  >
                    <XIcon className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
