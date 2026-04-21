import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, Upload, X, Send, CheckCircle2, Clock, Circle, Ban, Plus, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { uploadFile } from "@/utils/uploadFile";

/**
 * /support/ticket — user-facing ticket flow.
 *
 * Two surfaces in one page:
 *   - Left (or top on mobile): "My Tickets" list
 *   - Right: either the "New Ticket" form or an open ticket's
 *     detail + message thread, depending on `selected` state.
 *
 * Messages use the same `ticket_messages` table the admin panel
 * reads, so the conversation is bi-directional out of the box.
 */
const CATEGORIES = [
  { value: "bug",      label: "Bug Report" },
  { value: "billing",  label: "Billing Issue" },
  { value: "account",  label: "Account Problem" },
  { value: "feature",  label: "Feature Request" },
  { value: "other",    label: "Other" },
];

const PRIORITIES = [
  { value: "low",     label: "Low" },
  { value: "normal",  label: "Normal" },
  { value: "high",    label: "High" },
  { value: "urgent",  label: "Urgent" },
];

export default function SupportTicket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ["myTickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const selected = tickets.find((t) => t.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6">
        {/* Tickets list */}
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#37F2D1]" />
              Support
            </h1>
            <Button
              size="sm"
              onClick={() => setSelectedId(null)}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              <Plus className="w-3 h-3 mr-1" /> New
            </Button>
          </div>

          <p className="text-xs text-slate-500">Your tickets ({tickets.length})</p>

          {tickets.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No tickets yet.</p>
          ) : (
            <ul className="space-y-1">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === t.id
                        ? "bg-[#2a3441] border-[#37F2D1]/50"
                        : "bg-[#1E2430] border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={t.status} />
                      <PriorityDot priority={t.priority} />
                    </div>
                    <p className="text-sm font-bold text-white line-clamp-2">{t.subject}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {categoryLabel(t.category)} · {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Detail or new form */}
        <main>
          {selected ? (
            <TicketDetail ticket={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <NewTicketForm
              user={user}
              onCreated={(ticket) => {
                queryClient.invalidateQueries({ queryKey: ["myTickets", user.id] });
                setSelectedId(ticket.id);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function NewTicketForm({ user, onCreated }) {
  const [form, setForm] = useState({
    subject: "",
    category: "bug",
    priority: "normal",
    description: "",
  });
  const [screenshots, setScreenshots] = useState([]);
  const [uploading, setUploading] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const addScreenshot = async (file) => {
    if (!file) return;
    if (screenshots.length >= 3) { toast.error("Maximum 3 screenshots."); return; }
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "support/screenshots", {
        userId: user?.id,
        uploadType: "support_screenshot",
      });
      setScreenshots((s) => [...s, file_url]);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user?.id) { toast.error("Sign in first."); return; }
    if (!form.subject.trim()) { toast.error("Subject required."); return; }
    if (!form.description.trim()) { toast.error("Describe the problem."); return; }
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: form.subject.trim(),
          description: form.description,
          category: form.category,
          priority: form.priority,
          status: "open",
          screenshot_urls: screenshots,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      toast.success(`Ticket submitted — we'll get back to you soon.`);
      onCreated?.(data);
    } catch (err) {
      toast.error(err?.message || "Submit failed");
    }
  };

  return (
    <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">Report a Problem</h2>
        <p className="text-xs text-slate-500">
          We read every ticket. Include reproduction steps if reporting a bug.
        </p>
      </div>

      <div>
        <Label className="text-xs">Subject</Label>
        <Input
          value={form.subject}
          onChange={(e) => set({ subject: e.target.value })}
          className="bg-[#050816] border-slate-700 text-white mt-1"
          placeholder="Short summary of the issue"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={form.category} onValueChange={(v) => set({ category: v })}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <Select value={form.priority} onValueChange={(v) => set({ priority: v })}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          rows={8}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          className="bg-[#050816] border-slate-700 text-white mt-1 font-mono text-xs leading-relaxed"
          placeholder="Describe the issue in detail. For bugs include: what you did, what happened, what you expected."
        />
      </div>

      <div>
        <Label className="text-xs">Screenshots (optional, up to 3)</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {screenshots.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="w-20 h-20 rounded object-cover border border-slate-700" />
              <button
                type="button"
                onClick={() => setScreenshots(screenshots.filter((_, idx) => idx !== i))}
                className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {screenshots.length < 3 && (
            <label className="inline-flex items-center gap-1 bg-[#050816] border border-slate-700 hover:border-[#37F2D1] rounded px-3 py-2 text-xs cursor-pointer">
              <Upload className="w-3 h-3" />
              {uploading ? "Uploading…" : "Attach"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => addScreenshot(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={submit}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Send className="w-4 h-4 mr-1" /> Submit Ticket
        </Button>
      </div>
    </div>
  );
}

function TicketDetail({ ticket, onBack }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [reply, setReply] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["ticketMessages", ticket.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!reply.trim()) throw new Error("Write something.");
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        author_id: user.id,
        content: reply,
        is_admin: false,
      });
      if (error) throw error;
      // Re-open the ticket if the user replies to a resolved/closed one.
      if (["resolved", "closed"].includes(ticket.status)) {
        await supabase.from("support_tickets").update({ status: "open" }).eq("id", ticket.id);
      }
    },
    onSuccess: () => {
      setReply("");
      toast.success("Message sent");
      queryClient.invalidateQueries({ queryKey: ["ticketMessages", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["myTickets", user.id] });
    },
    onError: (err) => toast.error(err?.message || "Send failed"),
  });

  const locked = ["resolved", "closed"].includes(ticket.status);

  return (
    <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-5 space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#37F2D1]"
      >
        <ArrowLeft className="w-3 h-3" /> Back to tickets
      </button>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            {categoryLabel(ticket.category)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-white mt-2">{ticket.subject}</h2>
        <p className="text-[11px] text-slate-500 mt-1">
          Opened {new Date(ticket.created_at).toLocaleString()}
          {ticket.resolved_at && ` · Resolved ${new Date(ticket.resolved_at).toLocaleDateString()}`}
        </p>
      </div>

      <article className="bg-[#050816] border border-slate-800 rounded-lg p-3 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
        {ticket.description}
      </article>

      {(ticket.screenshot_urls || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ticket.screenshot_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="" className="w-24 h-24 rounded object-cover border border-slate-700 hover:border-[#37F2D1]" />
            </a>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
          Conversation
        </p>
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No replies yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg border p-3 text-sm ${
                m.is_admin
                  ? "bg-[#0b1220] border-[#37F2D1]/40 border-l-4 border-l-[#37F2D1]"
                  : "bg-[#050816] border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {m.is_admin && (
                  <span className="text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 bg-[#37F2D1] text-[#050816]">
                    Guildstew Team
                  </span>
                )}
                <span className="text-[10px] text-slate-500">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-200 whitespace-pre-wrap">{m.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-slate-700/50">
        <Label className="text-xs">
          {locked ? "Reopen this ticket with a new message" : "Reply"}
        </Label>
        <Textarea
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="bg-[#050816] border-slate-700 text-white mt-1"
          placeholder={locked ? "Add a new message to reopen this ticket." : "Add more context or a follow-up."}
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={() => send.mutate()}
            disabled={send.isPending || !reply.trim()}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Send className="w-4 h-4 mr-1" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = {
    open:        { color: "bg-[#37F2D1]/20 text-[#37F2D1]",     label: "Open",        icon: Circle },
    in_progress: { color: "bg-amber-900/40 text-amber-300",     label: "In Progress", icon: Clock },
    resolved:    { color: "bg-emerald-900/40 text-emerald-300", label: "Resolved",    icon: CheckCircle2 },
    closed:      { color: "bg-slate-700 text-slate-400",        label: "Closed",      icon: Ban },
  }[status] || { color: "bg-slate-800 text-slate-400", label: status, icon: Circle };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest rounded px-2 py-0.5 ${meta.color}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    urgent: "bg-red-900/40 text-red-300",
    high:   "bg-amber-900/40 text-amber-300",
    normal: "bg-slate-700 text-slate-300",
    low:    "bg-slate-800 text-slate-400",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest rounded px-2 py-0.5 ${map[priority] || map.normal}`}>
      {priority || "normal"}
    </span>
  );
}

function PriorityDot({ priority }) {
  const color = {
    urgent: "bg-red-500",
    high:   "bg-amber-400",
    normal: "bg-slate-500",
    low:    "bg-slate-600",
  }[priority] || "bg-slate-500";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} aria-hidden />;
}

function categoryLabel(v) {
  return CATEGORIES.find((c) => c.value === v)?.label || v;
}
