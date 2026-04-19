import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  archiveCampaign,
  deleteCampaign,
  exportCampaignData,
} from "@/utils/campaignLifecycle";

/**
 * Two-step campaign delete confirmation:
 *
 *   Step 1 — "Are you sure?"
 *     [Archive Instead] · [Continue to Delete] · [Cancel]
 *
 *   Step 2 — "Export before delete?"
 *     [Download Campaign Data] · [Delete Without Exporting] · [Cancel]
 *
 * Export bundles every campaign-scoped table into a JSON file (via
 * exportCampaignData); delete cascades rows + storage files via
 * deleteCampaign. The "Archive Instead" path honours the tier-based
 * archive limit and surfaces a toast if the user is already at cap.
 */
export default function DeleteCampaignDialog({
  open,
  onClose,
  campaign,
  gmUserId,
  tier,
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Reset the step each time the dialog reopens.
  React.useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const archiveMutation = useMutation({
    mutationFn: async () => archiveCampaign({
      campaignId: campaign.id,
      userId: gmUserId,
      tier,
    }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.reason || "Could not archive.");
        return;
      }
      toast.success("Campaign archived instead.");
      queryClient.invalidateQueries({ queryKey: ["userCampaigns"] });
      onClose?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteCampaign({
      campaignId: campaign.id,
      gmUserId,
      wasArchived: campaign.status === "archived",
    }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.reason || "Could not delete.");
        return;
      }
      toast.success("Campaign permanently deleted.");
      queryClient.invalidateQueries({ queryKey: ["userCampaigns"] });
      onClose?.();
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCampaignData({
        campaignId: campaign.id,
        campaignName: campaign.title || campaign.name || "campaign",
      });
      toast.success("Campaign data downloaded.");
    } catch (err) {
      toast.error(err?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  if (!campaign) return null;
  const campaignName = campaign.title || campaign.name || "Untitled Campaign";

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-lg">
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{campaignName}"?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 space-y-3">
                <span className="block">
                  This will permanently delete all campaign data including World Lore entries,
                  session logs, NPCs, items, monsters, maps, and every uploaded file.
                  This cannot be undone.
                </span>
                <span className="block text-emerald-300/80">
                  We recommend archiving instead — archived campaigns don't count against
                  your active campaign limit but can be restored anytime.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 flex-col sm:flex-row sm:justify-end">
              <AlertDialogCancel
                onClick={onClose}
                className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {archiveMutation.isPending ? "Archiving…" : "Archive Instead"}
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                Continue to Delete
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Last chance — export your data?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Download a copy of your campaign data (World Lore, NPCs, session logs,
                custom monsters / items / spells, custom conditions) before deleting.
                Once deleted, this data cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 flex-col sm:flex-row sm:justify-end">
              <AlertDialogCancel
                onClick={onClose}
                className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
              >
                {exporting ? "Exporting…" : "Download Campaign Data"}
              </Button>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Without Exporting"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
