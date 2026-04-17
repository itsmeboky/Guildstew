import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { base44 } from "@/api/base44Client";
import { ACHIEVEMENT_DEFINITIONS } from "@/data/achievementDefinitions";
import { downloadCsv } from "@/utils/csv";
import { ADMIN_COLORS, StatCard, PanelCard, EmptyState, formatNumber } from "./adminShared";

const RARITY_COLORS = {
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#fbbf24",
};

export default function AchievementsTab() {
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "achievements"],
    queryFn: () => base44.entities.Achievement.list().catch(() => []),
    initialData: [],
  });

  const distribution = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const key = r.achievement_key || r.key;
      if (!key) continue;
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([key, count]) => ({
        key,
        title: ACHIEVEMENT_DEFINITIONS[key]?.title || key,
        rarity: ACHIEVEMENT_DEFINITIONS[key]?.rarity || "common",
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const rarest = useMemo(() => distribution.slice().sort((a, b) => a.count - b.count).slice(0, 5), [distribution]);
  const mostCommon = useMemo(() => distribution.slice(0, 5), [distribution]);

  const userAvg = useMemo(() => {
    const userSet = new Set();
    for (const r of rows) if (r.user_id) userSet.add(r.user_id);
    return userSet.size === 0 ? 0 : rows.length / userSet.size;
  }, [rows]);

  const tierBreakdown = useMemo(() => {
    const m = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const d of distribution) m[d.rarity] = (m[d.rarity] || 0) + d.count;
    return Object.entries(m).map(([rarity, value]) => ({
      name: rarity,
      value,
      color: RARITY_COLORS[rarity] || "#475569",
    }));
  }, [distribution]);

  const handleExport = () => {
    const out = distribution.map((d) => ({
      key: d.key,
      title: d.title,
      rarity: d.rarity,
      count: d.count,
    }));
    downloadCsv("admin_achievements", out, ["key", "title", "rarity", "count"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Achievements</h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Awards"        value={formatNumber(rows.length)} accent="#fbbf24" />
        <StatCard label="Unique Achievements" value={formatNumber(distribution.length)} accent="#37F2D1" />
        <StatCard label="Avg Per User"        value={userAvg.toFixed(1)} accent="#a855f7" />
      </div>

      <PanelCard title="Achievement Distribution">
        {distribution.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ width: "100%", height: Math.max(280, distribution.length * 22) }}>
            <ResponsiveContainer>
              <BarChart data={distribution} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="title" stroke="#64748b" tick={{ fontSize: 10 }} width={150} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {distribution.map((d, i) => (
                    <Cell key={i} fill={RARITY_COLORS[d.rarity] || "#37F2D1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PanelCard title="Rarest 5">
          <List rows={rarest} />
        </PanelCard>
        <PanelCard title="Most Common 5">
          <List rows={mostCommon} />
        </PanelCard>
        <PanelCard title="Tier Breakdown">
          {tierBreakdown.every((t) => t.value === 0) ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={tierBreakdown} dataKey="value" nameKey="name" outerRadius={80} label>
                    {tierBreakdown.map((t, i) => <Cell key={i} fill={t.color} />)}
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

function List({ rows }) {
  if (!rows || rows.length === 0) return <EmptyState />;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between text-xs">
          <span className="text-slate-300 truncate">{r.title}</span>
          <span className="font-bold" style={{ color: RARITY_COLORS[r.rarity] || "#94a3b8" }}>{r.count}</span>
        </li>
      ))}
    </ul>
  );
}
