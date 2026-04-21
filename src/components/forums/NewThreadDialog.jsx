import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Stub — replaced in step 5 with the full New Thread form.
export default function NewThreadDialog({ open, onClose }) {
  return (
    <Dialog open={!!open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>New Thread</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400">Thread form lands in step 5.</p>
      </DialogContent>
    </Dialog>
  );
}
