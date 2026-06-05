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
 * GM-side approval surface for PLAYER-SUBMITTED deities (materialized on join
 * by materializeJoinBonds in campaignApplications.js).
 *
 * It is a PERSISTENT, clickable indicator — a count badge that stays visible
 * while anything is pending — NOT a transient auto-popup (the popup-only
 * version, mounted solely in the in-session GMPanel, never surfaced in the
 * lobby where the GM actually accepts players, so nothing showed). Mount it
 * wherever the GM works the campaign (the lobby CampaignGMPanel and the
 * in-session GMPanel both mount it).
 *
 * Accept → approval_status 'accepted' (then renders in Deities & Religion via
 * the deities_read RLS policy); Reject → 'rejected' (stays hidden). The same
 * badge+queue pattern is what relationship / homebrew approvals will reuse.
 */
export default function DeityApprovalDialog({ campaignId, isGM }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  // Locally hide rows the GM just decided on, so the queue empties smoothly
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

  const count = pending.length;

  return (
    <>
      {/* Persistent indicator — visible while anything is pending. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors shadow"
      >
        <Church className="w-4 h-4" />
        {count} {count === 1 ? "deity" : "deities"} pending approval
        <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-[#1E2430] text-xs font-bold">
          {count}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1E2430] border border-amber-500/40 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Church className="w-5 h-5 text-amber-300" />
              {count === 1
                ? "A player's deity needs approval"
                : `${count} player deities need approval`}
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
    </>
  );
}
