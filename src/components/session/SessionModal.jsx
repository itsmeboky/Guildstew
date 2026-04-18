import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared overlay used by every in-session tool the GM reaches from
 * the sidebar. The live session (combat queue, dice, action bars)
 * stays mounted underneath the dim backdrop — clicking the
 * backdrop or pressing Escape closes the modal, nothing navigates.
 *
 *   <SessionModal isOpen={active === 'party'} onClose={close} title="Adventuring Party">
 *     <AdventuringPartyContent … />
 *   </SessionModal>
 *
 * The modal sizes to 90vw × 85vh and the content area owns its own
 * scroll so consumers don't have to think about page scroll.
 */
export default function SessionModal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[80vw] h-[80vh] max-w-6xl bg-[#0f1219] border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5 mr-1" /> Back to Session
          </Button>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">{children}</div>
      </div>
    </div>
  );
}
