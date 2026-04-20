import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Stub — replaced in Tavern Part 2, step 3 with the full detail /
// purchase / rating modal. Kept here so step 2's page imports resolve.
export default function TavernItemDetailDialog({ item, open, onClose }) {
  return (
    <Dialog open={!!open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.name || "Item"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400">Detail view coming online in step 3.</p>
      </DialogContent>
    </Dialog>
  );
}
