import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/utils/csv";
import { PanelCard, EmptyState, withinRange } from "./adminShared";

export default function AdminLogTab() {
  const [search, setSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState("all");
  const [logRange, setLogRange] = useState({ from: "", to: "" });

  const { data: actions = [] } = useQuery({
    queryKey: ["admin", "adminActions"],
    queryFn: () => base44.entities.AdminAction.list("-created_at").catch(() => []),
    initialData: [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.UserProfile.list().catch(() => []),
    initialData: [],
  });

  const profileMap = useMemo(() => {
    const m = new Map();
    for (const p of profiles) m.set(p.user_id || p.id, p);
    return m;
  }, [profiles]);

  // Distinct admins seen in the log — drives the admin dropdown.
  const adminOptions = useMemo(() => {
    const ids = new Set();
    for (const a of actions) if (a.admin_id) ids.add(a.admin_id);
    return Array.from(ids).map((id) => ({
      id,
      label: profileMap.get(id)?.username || profileMap.get(id)?.email || id.slice(0, 8),
    }));
  }, [actions, profileMap]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return actions.filter((a) => {
      if (adminFilter !== "all" && a.admin_id !== adminFilter) return false;
      if ((logRange.from || logRange.to) && !withinRange(a.created_at, logRange)) return false;
      if (s) {
        const adminLabel = profileMap.get(a.admin_id)?.username || a.admin_id || "";
        const blob = `${a.action_type || ""} ${a.target_type || ""} ${a.target_id || ""} ${adminLabel} ${JSON.stringify(a.details || {})}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [actions, search, adminFilter, logRange, profileMap]);

  const handleExport = () => {
    const rows = filtered.map((a) => ({
      timestamp:   a.created_at || "",
      admin:       profileMap.get(a.admin_id)?.username || a.admin_id || "",
      action_type: a.action_type || "",
      target_type: a.target_type || "",
      target_id:   a.target_id || "",
      details:     JSON.stringify(a.details || {}),
    }));
    downloadCsv("admin_actions_log", rows, ["timestamp","admin","action_type","target_type","target_id","details"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Admin Action Log
          <span className="ml-3 text-xs text-slate-500 font-normal">Read-only audit trail</span>
        </h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <PanelCard>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action_type, target, details…"
              className="pl-7 bg-[#0b1220] border-slate-700 text-white"
            />
          </div>
          <Select value={adminFilter} onValueChange={setAdminFilter}>
            <SelectTrigger className="w-[200px] h-9 bg-[#0b1220] border-slate-700 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All admins</SelectItem>
              {adminOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={logRange.from}
            onChange={(e) => setLogRange((r) => ({ ...r, from: e.target.value }))}
            className="h-9 bg-[#0b1220] border-slate-700 text-white text-xs w-40"
          />
          <span className="text-slate-600 text-xs">→</span>
          <Input
            type="date"
            value={logRange.to}
            onChange={(e) => setLogRange((r) => ({ ...r, to: e.target.value }))}
            className="h-9 bg-[#0b1220] border-slate-700 text-white text-xs w-40"
          />
          {(logRange.from || logRange.to) && (
            <Button size="sm" variant="outline" onClick={() => setLogRange({ from: "", to: "" })} className="text-slate-300 h-9">
              Clear dates
            </Button>
          )}
        </div>
      </PanelCard>

      <PanelCard className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState label="No admin actions match." />
        ) : (
          <div className="max-h-[680px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500 sticky top-0 bg-[#1E2430]">
                <tr>
                  <th className="text-left py-2 px-2">When</th>
                  <th className="text-left py-2 px-2">Admin</th>
                  <th className="text-left py-2 px-2">Action</th>
                  <th className="text-left py-2 px-2">Target</th>
                  <th className="text-left py-2 px-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const adminProfile = profileMap.get(a.admin_id);
                  const adminLabel = adminProfile?.username || adminProfile?.email || (a.admin_id || "—").slice(0, 8);
                  return (
                    <tr key={a.id} className="border-t border-[#2A3441] align-top">
                      <td className="py-2 px-2 text-[11px] text-slate-400 whitespace-nowrap">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-2 text-xs text-white font-bold">{adminLabel}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-200 font-mono">
                          {a.action_type || "—"}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-300">
                        <div className="font-mono">{a.target_type || "—"}</div>
                        <div className="text-slate-500 font-mono truncate max-w-[200px]">{a.target_id || ""}</div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-300">
                        {a.details && Object.keys(a.details).length > 0 ? (
                          <DetailsSummary details={a.details} />
                        ) : (
                          <span className="text-slate-500 italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

// Compact summary of the JSON details blob — short keys inline,
// long values truncated. Click to reveal the full JSON.
function DetailsSummary({ details }) {
  const [open, setOpen] = useState(false);
  const summary = Object.entries(details)
    .slice(0, 3)
    .map(([k, v]) => {
      const str = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}=${str.length > 40 ? str.slice(0, 40) + "…" : str}`;
    })
    .join("  ·  ");
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-left text-slate-300 hover:text-white"
      >
        {summary}
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-[#0b1220] border border-slate-700 rounded text-[10px] text-slate-300 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}
