import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Stub — replaced in Tavern Part 2, step 4 with the full creator
// upload form.
export default function CreatorUploadDialog({ open, onClose }) {
  return (
    <Dialog open={!!open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Sell on the Tavern</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400">Creator upload form coming online in step 4.</p>
      </DialogContent>
    </Dialog>
  );
}
