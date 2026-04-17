import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Search, X, Send, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/utils/csv";
import { PanelCard, EmptyState } from "./adminShared";

const STATUS_STYLES = {
  open:        { label: "Open",        cls: "bg-amber-500 text-black" },
  in_progress: { label: "In Progress", cls: "bg-blue-500 text-white" },
  resolved:    { label: "Resolved",    cls: "bg-green-500 text-white" },
  closed:      { label: "Closed",      cls: "bg-slate-500 text-white" },
};
const PRIORITY_STYLES = {
  low:    { label: "Low",    cls: "bg-slate-700 text-slate-200" },
  normal: { label: "Normal", cls: "bg-slate-600 text-white" },
  high:   { label: "High",   cls: "bg-orange-500 text-white" },
  urgent: { label: "Urgent", cls: "bg-red-600 text-white" },
};
const CATEGORIES = [
  "Bug Report", "Account Issue", "Billing Question",
  "Feature Request", "Report a User", "Content Report", "Other",
];

export default function SupportTicketsTab({ adminId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_at").catch(() => []),
    initialData: [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.UserProfile.list(),
    initialData: [],
  });

  const profileMap = useMemo(() => {
    const m = new Map();
    for (const p of profiles) m.set(p.user_id || p.id, p);
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && (t.status || "open") !== statusFilter) return false;
      if (priorityFilter !== "all" && (t.priority || "normal") !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (s) {
        const profile = profileMap.get(t.user_id);
        const blob = `${t.subject || ""} ${t.description || ""} ${profile?.username || ""} ${profile?.email || ""}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, categoryFilter, search, profileMap]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId],
  );

  const handleExport = () => {
    const rows = filtered.map((t) => {
      const p = profileMap.get(t.user_id);
      return {
        id: t.id,
        user: p?.username || p?.email || t.user_id || "",
        category: t.category || "",
        subject: t.subject || "",
        priority: t.priority || "normal",
        status: t.status || "open",
        created_at: t.created_at || "",
      };
    });
    downloadCsv("admin_tickets", rows, ["id","user","category","subject","priority","status","created_at"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Support Tickets</h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <PanelCard>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, description, user…"
              className="pl-7 bg-[#0b1220] border-slate-700 text-white"
            />
          </div>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} all="All statuses"
            options={[["open","Open"],["in_progress","In Progress"],["resolved","Resolved"],["closed","Closed"]]} />
          <FilterSelect value={priorityFilter} onChange={setPriorityFilter} all="All priorities"
            options={[["low","Low"],["normal","Normal"],["high","High"],["urgent","Urgent"]]} />
          <FilterSelect value={categoryFilter} onChange={setCategoryFilter} all="All categories"
            options={CATEGORIES.map((c) => [c, c])} />
        </div>
      </PanelCard>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,520px] gap-4">
        <PanelCard className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState label="No tickets match." />
          ) : (
            <div className="max-h-[680px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500 sticky top-0 bg-[#1E2430]">
                  <tr>
                    <th className="text-left py-2 px-2">User</th>
                    <th className="text-left py-2 px-2">Category</th>
                    <th className="text-left py-2 px-2">Subject</th>
                    <th className="text-left py-2 px-2">Priority</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const profile = profileMap.get(t.user_id);
                    const status = STATUS_STYLES[t.status] || STATUS_STYLES.open;
                    const priority = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.normal;
                    const isActive = selectedId === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className={`border-t border-[#2A3441] cursor-pointer hover:bg-[#0b1220] ${isActive ? "bg-[#0b1220]" : ""}`}
                      >
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-700" />
                            )}
                            <span className="text-xs text-white font-bold">{profile?.username || "—"}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-[11px] text-slate-300">{t.category || ""}</td>
                        <td className="py-2 px-2 text-xs text-slate-200 max-w-xs truncate">{t.subject}</td>
                        <td className="py-2 px-2"><Badge className={`text-[10px] ${priority.cls}`}>{priority.label}</Badge></td>
                        <td className="py-2 px-2"><Badge className={`text-[10px] ${status.cls}`}>{status.label}</Badge></td>
                        <td className="py-2 px-2 text-[11px] text-slate-400">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>

        <TicketDetailPanel
          ticket={selected}
          profile={selected ? profileMap.get(selected.user_id) : null}
          adminId={adminId}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, all }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px] h-9 bg-[#0b1220] border-slate-700 text-white text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function TicketDetailPanel({ ticket, profile, adminId, onClose }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const ticketId = ticket?.id || null;

  // Reset locally-edited internal notes when switching tickets so we
  // don't accidentally splat the previous ticket's draft into a new one.
  React.useEffect(() => {
    setInternalNotes(ticket?.admin_notes || "");
    setReply("");
  }, [ticketId, ticket?.admin_notes]);

  const { data: responses = [] } = useQuery({
    queryKey: ["adminTicketResponses", ticketId],
    queryFn: () => base44.entities.TicketResponse.filter({ ticket_id: ticketId }, "created_at"),
    enabled: !!ticketId,
    initialData: [],
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!reply.trim()) throw new Error("Type a reply first.");
      // First reply on an open ticket bumps it to in_progress so the
      // user sees that someone has actually picked it up.
      if (ticket?.status === "open") {
        await base44.entities.SupportTicket.update(ticketId, { status: "in_progress" });
      }
      return base44.entities.TicketResponse.create({
        ticket_id: ticketId,
        sender_type: "admin",
        sender_id: adminId,
        body: reply.trim(),
      });
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["adminTicketResponses", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["myTickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticketResponses", ticketId] });
    },
    onError: (err) => toast.error(err?.message || "Failed to send"),
  });

  const updateField = useMutation({
    mutationFn: async (patch) => base44.entities.SupportTicket.update(ticketId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      toast.success("Updated");
    },
    onError: (err) => toast.error(err?.message || "Update failed"),
  });

  if (!ticket) {
    return (
      <PanelCard title="Detail">
        <EmptyState label="Select a ticket from the list." />
      </PanelCard>
    );
  }

  const status = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
  const priority = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.normal;

  return (
    <PanelCard
      title={ticket.subject}
      action={
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      }
    >
      <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-[10px] ${status.cls}`}>{status.label}</Badge>
          <Badge className={`text-[10px] ${priority.cls}`}>{priority.label}</Badge>
          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">{ticket.category}</Badge>
          <span className="text-[10px] text-slate-500 ml-auto">{new Date(ticket.created_at).toLocaleString()}</span>
        </div>

        {profile && (
          <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3 flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-700" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-bold truncate">{profile.username || "—"}</div>
              <div className="text-[11px] text-slate-400 truncate">{profile.email}</div>
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{ticket.user_id}</span>
          </div>
        )}

        <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Original Description</div>
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
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Conversation ({responses.length})</div>
          {responses.length === 0 && <p className="text-[11px] text-slate-500 italic">No replies yet.</p>}
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
                  {r.sender_type === "admin" ? "Support" : profile?.username || "User"}
                </span>
                <span className="text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 pt-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Reply to the user…"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => replyMutation.mutate()}
              disabled={replyMutation.isPending || !reply.trim()}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              <Send className="w-3 h-3 mr-1" /> Send Reply
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-700 pt-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Status</div>
            <Select value={ticket.status || "open"} onValueChange={(v) => updateField.mutate({ status: v })}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Priority</div>
            <Select value={ticket.priority || "normal"} onValueChange={(v) => updateField.mutate({ priority: v })}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1">
            <Lock className="w-3 h-3" /> Internal Notes <span className="text-slate-500 font-normal normal-case">(admin only)</span>
          </div>
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Notes for other admins. Never shown to the user."
            className="bg-[#0b1220] border-amber-700/40 text-amber-100"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateField.mutate({ admin_notes: internalNotes })}
              disabled={updateField.isPending || internalNotes === (ticket.admin_notes || "")}
              className="text-amber-400 border-amber-700"
            >
              Save Notes
            </Button>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
