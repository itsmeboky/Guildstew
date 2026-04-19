import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { uploadFile } from "@/utils/uploadFile";
import { trackEvent } from "@/utils/analytics";

const CATEGORIES = [
  "Bug Report",
  "Account Issue",
  "Billing Question",
  "Feature Request",
  "Report a User",
  "Content Report",
  "Other",
];

/**
 * Create-a-ticket dialog for end users. Lives in Settings →
 * Help & Support. Submits to the support_tickets table and fires
 * a `ticket_created` analytics event so the admin Overview tab
 * picks up the activity.
 */
export default function SupportTicketDialog({ open, onClose, userId }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setCategory(CATEGORIES[0]);
    setSubject("");
    setDescription("");
    setScreenshot(null);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !description.trim()) {
        throw new Error("Subject and description are required.");
      }
      if (!userId) throw new Error("Sign in first.");
      let screenshot_url = null;
      if (screenshot) {
        setUploading(true);
        try {
          const { file_url } = await uploadFile(screenshot, "user-assets", "support", { uploadType: "general" });
          screenshot_url = file_url;
        } finally {
          setUploading(false);
        }
      }
      return base44.entities.SupportTicket.create({
        user_id: userId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        screenshot_url,
        status: "open",
        priority: "normal",
      });
    },
    onSuccess: () => {
      toast.success("Ticket submitted! We'll get back to you soon.");
      trackEvent(userId, "ticket_created", { category });
      queryClient.invalidateQueries({ queryKey: ["myTickets", userId] });
      reset();
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Failed to submit ticket"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit a support ticket</DialogTitle>
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
            <Label className="text-xs text-slate-300 font-semibold mb-1 block">Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick summary"
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-300 font-semibold mb-1 block">Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What happened? Steps to reproduce, expected vs actual behavior, anything else useful."
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-300 font-semibold mb-1 block">Screenshot (optional)</Label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
                <Upload className="w-3 h-3" />
                {uploading ? "Uploading…" : screenshot ? "Replace" : "Attach"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
              </label>
              {screenshot && (
                <span className="text-[11px] text-slate-400 truncate">{screenshot.name}</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || uploading}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {submitMutation.isPending ? "Submitting…" : "Submit ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
