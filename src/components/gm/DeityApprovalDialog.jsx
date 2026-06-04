import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Church, Check, X as XIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

/**
 * GM-side pending-approval queue for PLAYER-SUBMITTED deities. Surfaces
 * automatically (poll) when the GM is in the campaign lobby if any joining
 * character materialized a custom deity (see materializeJoinBonds in
 * campaignApplications.js). Accept → approval_status 'accepted' (now renders
 * in the Deities & Religion tab via the deities_read RLS policy); Reject →
 * 'rejected' (stays hidden). Mirrors CustomCompanionApprovalDialog's idiom;
 * deities need no stat editor, so this is a straight accept/reject list.
 *
 * The relationship-entity queue (Phase 3b) is the same component against a
 * relationship_entities table once the Allies & Enemies tab exists.
 */
export default function DeityApprovalDialog({ campaignId, isGM }) {
  const queryClient = useQueryClient();
  // Locally hide rows the GM just decided on, so the dialog closes smoothly
  // before the poll/invalidation catches up.
  const [dismissed, setDismissed] = useState(() => new Set());

  const { data: pendingRows = [] } = useQuery({
    queryKey: ["pendingDeities", campaignId],
    queryFn: () => base44.entities.Deity
      .filter({
        campaign_id: campaignId,
        approval_status: "pending",
        source: "player-submitted",
      })
      .catch(() => []),
    enabled: !!isGM && !!campaignId,
    refetchInterval: 10000,
  });

  const pending = pendingRows.filter((d) => d?.id && !dismissed.has(d.id));

  const decide = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.Deity.update(id, {
        approval_status: status,
        updated_at: new Date().toISOString(),
      });
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      toast.success(
        status === "accepted"
          ? "Deity accepted — added to the pantheon."
          : "Deity rejected.",
      );
      setDismissed((prev) => new Set(prev).add(id));
      queryClient.invalidateQueries({ queryKey: ["pendingDeities", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["deities", campaignId] });
    },
    onError: (err) => {
      console.error("Decide deity", err);
      toast.error(`Couldn't update deity: ${err?.message || err}`);
    },
  });

  if (!isGM || pending.length === 0) return null;

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) setDismissed(new Set(pendingRows.map((d) => d.id)));
      }}
    >
      <DialogContent className="bg-[#1E2430] border border-amber-500/40 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Church className="w-5 h-5 text-amber-300" />
            {pending.length === 1
              ? "A player's deity needs approval"
              : `${pending.length} player deities need approval`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-300">
          A character joining your campaign brought a custom deity. Accept it to add it
          to <span className="font-semibold">Deities &amp; Religion</span>, or reject it.
        </p>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {pending.map((d) => (
            <div
              key={d.id}
              className="flex gap-3 items-start rounded-lg border border-slate-700 bg-[#161B24] p-3"
            >
              {d.image_url ? (
                <img
                  src={d.image_url}
                  alt=""
                  className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-md bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                  <Church className="w-6 h-6 text-slate-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-bold text-white truncate">{d.name}</div>
                {d.description && (
                  <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap max-h-20 overflow-y-auto">
                    {d.description}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: d.id, status: "accepted" })}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-semibold"
                  >
                    <Check className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ id: d.id, status: "rejected" })}
                    className="border-red-700/60 text-red-300 hover:bg-red-900/30"
                  >
                    <XIcon className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
