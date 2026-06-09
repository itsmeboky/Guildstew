import { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, X, Send, Ban, RotateCcw, Copy, Search, ChevronDown, ChevronRight,
  Clock, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/isAdmin";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const FILTERS = ["pending", "approved", "revoked", "rejected", "all"];

// Status -> Badge styling. Tailwind classes so it tracks the admin dark theme.
const STATUS_STYLE = {
  pending:  { label: "Pending",  cls: "bg-[#F8A47C]/15 text-[#F8A47C] border border-[#F8A47C]/30" },
  approved: { label: "Approved", cls: "bg-[#04685A]/25 text-[#5FD3C4] border border-[#5FD3C4]/30" },
  revoked:  { label: "Revoked",  cls: "bg-[#FF5300]/15 text-[#FF8A52] border border-[#FF8A52]/30" },
  rejected: { label: "Rejected", cls: "bg-slate-500/10 text-slate-400 border border-slate-500/30" },
};

// Per-status action buttons. `key` maps to the alpha-admin Edge Function action.
function actionsFor(status) {
  switch (status) {
    case "pending":
      return [
        { key: "approve", label: "Approve", icon: Check, variant: "default" },
        { key: "reject",  label: "Reject",  icon: X,     variant: "ghost" },
      ];
    case "approved":
      return [
        { key: "resend", label: "Resend key", icon: Send, variant: "secondary" },
        { key: "revoke", label: "Revoke",     icon: Ban,  variant: "destructive" },
      ];
    case "revoked":
      return [{ key: "approve", label: "Reinstate", icon: RotateCcw, variant: "default" }];
    case "rejected":
      return [{ key: "approve", label: "Approve", icon: Check, variant: "default" }];
    default:
      return [];
  }
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

// Calls the alpha-admin Edge Function. Token is pulled fresh from the live
// Supabase session (never a stored value), matching how AuthContext reads auth.
async function callAlphaAdmin({ action, email, first_name }) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    console.error("alpha-admin call aborted: no access token in session", action, email);
    throw new Error("Not authenticated");
  }
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpha-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action, email, first_name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    console.error("alpha-admin call failed", action, email, res.status, body);
    throw new Error(body?.detail || body?.error || `alpha-admin ${res.status}`);
  }
  return body; // { ok, action, email, code? }
}

export default function AlphaApprovals() {
  const { user, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const [copied, setCopied] = useState(null);
  // `${email}:${action}` of the row+action whose mutation is in flight.
  const [busy, setBusy] = useState(null);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["alpha_applications", filter],
    queryFn: async () => {
      let query = supabase
        .from("alpha_applications")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) {
        console.error("alpha_applications query failed", error);
        throw error;
      }
      return data;
    },
    enabled: !!user && isAdminUser(user),
  });

  const mutation = useMutation({
    mutationFn: callAlphaAdmin,
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["alpha_applications"] });
      if (body.code && (body.action === "approve")) {
        toast.success(`Approved — key ${body.code} emailed to ${body.email}`);
      } else if (body.action === "resend") {
        toast.success(`Key re-sent to ${body.email}`);
      } else if (body.action === "revoke") {
        toast.success(`Revoked ${body.email}`);
      } else if (body.action === "reject") {
        toast.success(`Rejected ${body.email}`);
      } else {
        toast.success("Done");
      }
    },
    onError: (err) => toast.error(err?.message || "Action failed"),
    onSettled: () => setBusy(null),
  });

  function act(row, action) {
    setBusy(`${row.email}:${action}`);
    mutation.mutate({ action, email: row.email, first_name: row.first_name });
  }

  function copyCode(code, email) {
    navigator.clipboard?.writeText(code);
    setCopied(email);
    setTimeout(() => setCopied((c) => (c === email ? null : c)), 1400);
  }

  // Counts for the filter pills. `all` is the full set; the rest are per-status.
  // Reads from the current (possibly filtered) result, so only the active
  // filter's count is exact — kept simple to avoid an extra query.
  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, revoked: 0, rejected: 0, all: rows.length };
    rows.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(needle) ||
        (r.first_name || "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#1B2535] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!user || !isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#1B2535] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/admin-tools"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#FF5300] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Admin Tools</span>
        </Link>

        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1
              className="text-4xl font-black tracking-wider mb-2"
              style={{ fontFamily: "Cream, ui-serif, serif", color: "#FFF" }}
            >
              Alpha Approvals
            </h1>
            <p className="text-slate-400 text-sm">
              Hand-vetted queue. Approving mints a join key and emails it.
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-2xl font-black text-[#F8A47C] leading-none">{counts.pending}</div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">pending</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-[#5FD3C4] leading-none">{counts.approved}</div>
              <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">approved</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] capitalize border transition-colors flex items-center gap-1.5 ${
                    active
                      ? "border-[#FF5300] bg-[#FF5300]/15 text-white"
                      : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  {f}
                  <span className="opacity-70 text-xs">{counts[f] ?? 0}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="w-[15px] h-[15px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email…"
              className="w-56 pl-9 bg-[#0d141f] border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-2.5">
          {isLoading && (
            <div className="text-center py-12 text-slate-500 text-sm">Loading queue…</div>
          )}
          {isError && (
            <div className="text-center py-12 text-[#FF8A52] text-sm">
              Failed to load applications. Check console for details.
            </div>
          )}
          {!isLoading && !isError && visible.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">Nothing here.</div>
          )}
          {visible.map((r) => {
            const st = STATUS_STYLE[r.status] || STATUS_STYLE.rejected;
            const isOpen = open[r.id];
            const rowBusy = busy && busy.startsWith(`${r.email}:`);
            return (
              <div
                key={r.id}
                className="bg-[#0d141f] border border-white/10 rounded-xl overflow-hidden"
              >
                <div className="p-4 flex gap-4 items-start">
                  {/* identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-[15px]">{r.first_name || "—"}</span>
                      <Badge className={`gap-1.5 rounded-full uppercase tracking-wide text-[11px] ${st.cls}`}>
                        {st.label}
                      </Badge>
                      {r.role && (
                        <span className="text-xs text-slate-400 border border-white/10 rounded px-2 py-0.5">
                          {r.role}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-slate-400 mt-1 truncate">{r.email}</div>

                    {r.join_code && (
                      <div className="mt-2 inline-flex items-center gap-2">
                        <code className="font-mono text-[13px] text-[#5FD3C4] bg-[#04685A]/15 border border-[#04685A]/40 rounded px-2.5 py-1 tracking-wider">
                          {r.join_code}
                        </code>
                        <button
                          onClick={() => copyCode(r.join_code, r.email)}
                          title="Copy key"
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-xs transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" /> {copied === r.email ? "copied" : "copy"}
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                      className="mt-2 text-slate-400 hover:text-white flex items-center gap-1 text-xs transition-colors"
                    >
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      why they want in
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{r.why || "—"}</p>
                    )}
                  </div>

                  {/* meta + actions */}
                  <div className="flex flex-col items-end gap-2.5">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="w-3 h-3" /> {fmtDate(r.submitted_at)}
                    </span>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {actionsFor(r.status).map((a) => {
                        const Icon = a.icon;
                        const thisBusy = busy === `${r.email}:${a.key}`;
                        return (
                          <Button
                            key={a.key}
                            size="sm"
                            variant={a.variant}
                            disabled={rowBusy}
                            onClick={() => act(r, a.key)}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {thisBusy ? "…" : a.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
