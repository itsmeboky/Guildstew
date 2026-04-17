import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/utils/csv";
import {
  ADMIN_COLORS, StatCard, PanelCard, EmptyState, withinRange, formatNumber,
} from "./adminShared";

export default function GameplayTab({ dateRange }) {
  const { data: characters = [] } = useQuery({
    queryKey: ["admin", "characters"],
    queryFn: () => base44.entities.Character.list().catch(() => []),
    initialData: [],
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin", "campaigns"],
    queryFn: () => base44.entities.Campaign.list(),
    initialData: [],
  });
  const { data: events = [] } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => base44.entities.AnalyticsEvent.list(),
    initialData: [],
  });

  const races = useMemo(() => bucketBy(characters, (c) => c.race || "Unknown"), [characters]);
  const classes = useMemo(() => bucketBy(characters, (c) => c.class || "Unknown"), [characters]);
  const combos = useMemo(() => {
    const m = new Map();
    for (const c of characters) {
      const key = `${c.race || "?"} / ${c.class || "?"}`;
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([combo, count]) => ({ combo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [characters]);

  // Creation method pie — uses event_data.method from character_created.
  const methodPie = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      if (e.event_type !== "character_created") continue;
      if (!withinRange(e.created_at || e.timestamp, dateRange)) continue;
      const method = e.event_data?.method || "full";
      m.set(method, (m.get(method) || 0) + 1);
    }
    return Array.from(m.entries()).map(([method, value], i) => ({
      name: method,
      value,
      color: ADMIN_COLORS[i % ADMIN_COLORS.length],
    }));
  }, [events, dateRange]);

  const avgPartySize = useMemo(() => {
    if (campaigns.length === 0) return 0;
    let total = 0;
    for (const c of campaigns) total += (c.player_ids?.length || 0);
    return total / campaigns.length;
  }, [campaigns]);

  const handleExport = () => {
    const rows = [
      ...races.map((r) => ({ section: "race", label: r.label, count: r.count })),
      ...classes.map((c) => ({ section: "class", label: c.label, count: c.count })),
      ...combos.map((c) => ({ section: "combo", label: c.combo, count: c.count })),
      ...methodPie.map((m) => ({ section: "creation_method", label: m.name, count: m.value })),
      { section: "summary", label: "avg_party_size", count: avgPartySize.toFixed(2) },
      { section: "summary", label: "total_characters", count: characters.length },
    ];
    downloadCsv("admin_gameplay", rows, ["section", "label", "count"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Gameplay</h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Characters" value={formatNumber(characters.length)} accent="#37F2D1" />
        <StatCard label="Avg Party Size" value={avgPartySize.toFixed(1)} accent="#a855f7" hint="Players per campaign" />
        <StatCard label="Total Campaigns" value={formatNumber(campaigns.length)} accent="#fbbf24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard title="Most Popular Races">
          <HBar rows={races.slice(0, 12)} color="#37F2D1" />
        </PanelCard>
        <PanelCard title="Most Popular Classes">
          <HBar rows={classes.slice(0, 12)} color="#a855f7" />
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
        <PanelCard title="Top 20 Race / Class Combos">
          {combos.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500 sticky top-0 bg-[#1E2430]">
                  <tr><th className="text-left py-1.5 px-2">Combo</th><th className="text-right py-1.5 px-2">Count</th></tr>
                </thead>
                <tbody>
                  {combos.map((c) => (
                    <tr key={c.combo} className="border-t border-[#2A3441]">
                      <td className="py-1.5 px-2 text-slate-300">{c.combo}</td>
                      <td className="py-1.5 px-2 text-right text-white font-bold">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
        <PanelCard title="Character Creation Method">
          {methodPie.length === 0 ? (
            <EmptyState label="No character_created events in range." />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={methodPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {methodPie.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

function bucketBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function HBar({ rows, color }) {
  if (!rows || rows.length === 0) return <EmptyState />;
  return (
    <div style={{ width: "100%", height: Math.max(220, rows.length * 26) }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
          <YAxis type="category" dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
          <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
          <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
