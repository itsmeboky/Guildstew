import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { uploadFile } from "@/utils/uploadFile";
import { trackEvent } from "@/utils/analytics";

const CATEGORIES = [
  "Harassment",
  "Cheating",
  "Inappropriate Content",
  "Spam",
  "Underage User",
  "Other",
];

/**
 * Report-a-user dialog. Posted to user_reports for the moderation
 * queue. Evidence images are uploaded to campaign-assets/support/.
 */
export default function ReportUserDialog({ open, onClose, reporterId, targetUser, campaignId = null }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setCategory(CATEGORIES[0]);
    setDescription("");
    setEvidence([]);
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Describe what happened.");
      if (!reporterId || !targetUser?.id) throw new Error("Missing reporter / target.");
      let evidence_urls = [];
      if (evidence.length > 0) {
        setUploading(true);
        try {
          for (const file of evidence) {
            const { file_url } = await uploadFile(file, "user-assets", "support", { uploadType: "general" });
            evidence_urls.push(file_url);
          }
        } finally {
          setUploading(false);
        }
      }
      return base44.entities.UserReport.create({
        reporter_id: reporterId,
        reported_user_id: targetUser.id,
        campaign_id: campaignId || null,
        category,
        description: description.trim(),
        evidence_urls,
        status: "pending",
      });
    },
    onSuccess: () => {
      toast.success("Report submitted. Thank you for helping keep Guildstew safe.");
      trackEvent(reporterId, "report_filed", { category, target_id: targetUser?.id });
      reset();
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Failed to submit report"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Report {targetUser?.username || "user"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-300 font-semibold mb-1 block">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-300 font-semibold mb-1 block">Describe what happened *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Be specific. Quote what they said or describe their behavior."
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-300 font-semibold mb-1 block">Evidence (optional)</Label>
            <div className="flex items-center gap-2 mb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
                <Upload className="w-3 h-3" />
                {uploading ? "Uploading…" : "Add screenshot"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setEvidence((prev) => [...prev, ...files]);
                  }}
                  disabled={uploading}
                />
              </label>
            </div>
            {evidence.length > 0 && (
              <ul className="text-[11px] text-slate-300 space-y-1">
                {evidence.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="truncate flex-1">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setEvidence((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || uploading}
            className="bg-red-600 hover:bg-red-500 text-white font-bold"
          >
            {submit.isPending ? "Sending…" : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
