import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Paperclip, Send, X, Maximize2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/api/supabaseClient";
import { uploadFile } from "@/utils/uploadFile";
import { useAuth } from "@/lib/AuthContext";

const MIN_DESCRIPTION_CHARS = 10;

/**
 * "Report a Problem" quick-file modal. Mounted from the side nav
 * trigger; writes a row into the existing support_tickets table
 * (the SupportTicket page is the management surface for follow-ups).
 *
 * Screenshot UX per spec: clicking "Take Screenshot" minimises the
 * dialog to a floating restore widget so the user can run their
 * OS screenshot tools (Cmd+Shift+4 / Snipping Tool / etc.) without
 * losing the form. Form state is preserved on minimise; restore
 * brings the dialog back exactly as it was.
 *
 * No in-app capture — this is purely an OS-tools handoff.
 *
 * Props:
 *   open      controlled open state
 *   onClose   () => void
 */
export default function ReportProblemDialog({ open, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [minimised, setMinimised] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset form on open. Don't reset on close — the dialog re-opens
  // with the same state so an accidental ESC doesn't clobber a
  // half-typed report.
  useEffect(() => {
    if (open) {
      setMinimised(false);
    }
  }, [open]);

  const reset = () => {
    setDescription("");
    setFile(null);
    setMinimised(false);
  };

  const handleClose = () => {
    setMinimised(false);
    onClose?.();
  };

  const onFilePicked = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
  };

  const submit = async () => {
    if (!user?.id) {
      toast.error("Sign in first.");
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION_CHARS) {
      toast.error(`Add a bit more detail (at least ${MIN_DESCRIPTION_CHARS} characters).`);
      return;
    }
    setSubmitting(true);

    let screenshotUrl = null;
    if (file) {
      try {
        const { file_url } = await uploadFile(file, "user-assets", "support/screenshots", {
          userId: user.id,
          uploadType: "support_screenshot",
        });
        screenshotUrl = file_url;
      } catch (err) {
        console.error("Screenshot upload failed:", err);
        toast.error("Couldn't upload the screenshot — submitting without it.");
      }
    }

    try {
      const subject = `Bug report from ${location?.pathname || "unknown page"}`;
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject,
        description: description.trim(),
        category: "bug",
        priority: "normal",
        status: "open",
        screenshot_urls: screenshotUrl ? [screenshotUrl] : [],
      });
      if (error) throw error;
      toast.success("Thanks for the report — we'll take a look.");
      reset();
      onClose?.();
    } catch (err) {
      console.error("Failed to submit bug report:", err);
      toast.error(`Couldn't save your report: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Minimised state — render the floating restore widget instead
  // of the dialog content. State is preserved because we keep
  // ReportProblemDialog mounted (just hide the dialog visually).
  if (open && minimised) {
    return (
      <button
        type="button"
        onClick={() => setMinimised(false)}
        className="fixed bottom-6 right-6 z-[100] inline-flex items-center gap-2 bg-[#FF5722] hover:bg-[#ff7043] text-white font-bold rounded-full shadow-2xl px-4 py-3 border-2 border-white/20 animate-pulse"
        title="Restore your bug report"
      >
        <Camera className="w-4 h-4" />
        <span className="text-xs uppercase tracking-widest">Reporting</span>
        <span className="text-slate-200">·</span>
        <span className="inline-flex items-center gap-1 text-xs">
          <Maximize2 className="w-3.5 h-3.5" /> Restore
        </span>
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="bg-[#1E2430] border border-[#FF5722]/40 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-[#FF5722]" />
            Report a Problem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Describe the issue
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen? Any reproduction steps that help us track it down."
              rows={6}
              className="mt-1 bg-[#050816] border-slate-700 text-white"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {description.trim().length < MIN_DESCRIPTION_CHARS
                ? `${description.trim().length}/${MIN_DESCRIPTION_CHARS} minimum chars`
                : "Looks good."}
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Attach a screenshot (optional)
            </label>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMinimised(true)}
                className="border-[#37F2D1]/40 text-[#37F2D1] hover:bg-[#37F2D1]/10"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Screenshot
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-600 text-slate-200 hover:bg-slate-700/40"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFilePicked}
                className="hidden"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Click <span className="text-[#37F2D1]">Take Screenshot</span> to minimise this
              dialog so you can capture with your OS tools (Cmd+Shift+4 on Mac, Snipping Tool on Windows),
              save it, then click <span className="text-slate-300">Choose File</span> to attach. Your
              text won&apos;t be lost.
            </p>
            {file && (
              <div className="mt-2 inline-flex items-center gap-2 bg-[#050816] border border-slate-700 rounded px-2 py-1 text-xs">
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span className="text-slate-200 truncate max-w-[260px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-slate-500 hover:text-red-400"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={submitting}
              className="text-slate-300 hover:bg-slate-700/40"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={submitting || description.trim().length < MIN_DESCRIPTION_CHARS}
              className="bg-[#FF5722] hover:bg-[#ff7043] text-white font-bold disabled:opacity-40"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
