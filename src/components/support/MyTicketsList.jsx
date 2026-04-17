import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Ticket as TicketIcon } from "lucide-react";

const STATUS_STYLES = {
  open:        { label: "Open",        className: "bg-amber-500 text-black" },
  in_progress: { label: "In Progress", className: "bg-blue-500 text-white" },
  resolved:    { label: "Resolved",    className: "bg-green-500 text-white" },
  closed:      { label: "Closed",      className: "bg-slate-500 text-white" },
};

/**
 * User-facing list of their own support tickets. Clicking a ticket
 * opens a thread view that surfaces every ticket_responses row
 * (admin + user) and lets the user reply while the ticket is open.
 */
export default function MyTicketsList({ userId }) {
  const [openTicket, setOpenTicket] = useState(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["myTickets", userId],
    queryFn: () => base44.entities.SupportTicket.filter({ user_id: userId }, "-created_at"),
    enabled: !!userId,
    initialData: [],
  });

  if (!userId) return null;

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-sm text-slate-500 italic">Loading tickets…</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-slate-500 italic">You haven't filed any tickets yet.</p>
      ) : (
        tickets.map((t) => {
          const style = STATUS_STYLES[t.status] || STATUS_STYLES.open;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenTicket(t)}
              className="w-full text-left bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TicketIcon className="w-4 h-4 text-[#37F2D1] flex-shrink-0" />
                <span className="text-sm font-bold text-white truncate">{t.subject}</span>
                <Badge className={`ml-auto ${style.className} hover:${style.className}`}>{style.label}</Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span>{t.category}</span>
                <span className="text-slate-700">·</span>
                <span>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ""}</span>
              </div>
            </button>
          );
        })
      )}

      <TicketThreadDialog
        ticket={openTicket}
        userId={userId}
        onClose={() => setOpenTicket(null)}
      />
    </div>
  );
}

function TicketThreadDialog({ ticket, userId, onClose }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const open = !!ticket;
  const ticketId = ticket?.id || null;

  const { data: responses = [] } = useQuery({
    queryKey: ["ticketResponses", ticketId],
    queryFn: () => base44.entities.TicketResponse.filter({ ticket_id: ticketId }, "created_at"),
    enabled: open && !!ticketId,
    initialData: [],
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!reply.trim()) throw new Error("Type something first.");
      return base44.entities.TicketResponse.create({
        ticket_id: ticketId,
        sender_type: "user",
        sender_id: userId,
        body: reply.trim(),
      });
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["ticketResponses", ticketId] });
    },
    onError: (err) => toast.error(err?.message || "Failed to send reply"),
  });

  const canReply = ticket?.status === "open" || ticket?.status === "in_progress";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ticket?.subject}</DialogTitle>
        </DialogHeader>

        {ticket && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Badge className={`${STATUS_STYLES[ticket.status]?.className || ""}`}>
                {STATUS_STYLES[ticket.status]?.label || ticket.status}
              </Badge>
              <span>{ticket.category}</span>
              <span className="text-slate-700">·</span>
              <span>{new Date(ticket.created_at).toLocaleString()}</span>
            </div>

            <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3">
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{ticket.description}</p>
              {ticket.screenshot_url && (
                <img
                  src={ticket.screenshot_url}
                  alt="Screenshot"
                  className="mt-2 rounded-lg border border-slate-700 max-h-72"
                />
              )}
            </div>

            <div className="space-y-2">
              {responses.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-lg p-3 border ${
                    r.sender_type === "admin"
                      ? "bg-[#37F2D1]/10 border-[#37F2D1]/40"
                      : "bg-[#0b1220] border-slate-700"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
                    <span className={r.sender_type === "admin" ? "text-[#37F2D1]" : "text-slate-400"}>
                      {r.sender_type === "admin" ? "Support" : "You"}
                    </span>
                    <span className="text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{r.body}</p>
                </div>
              ))}
              {responses.length === 0 && (
                <p className="text-[11px] text-slate-500 italic">No responses yet.</p>
              )}
            </div>

            {canReply && (
              <div className="border-t border-slate-700 pt-3">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Add a reply…"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={() => replyMutation.mutate()}
                    disabled={replyMutation.isPending || !reply.trim()}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                  >
                    Send reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
