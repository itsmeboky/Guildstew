import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/utils/csv";
import { StatCard, PanelCard, EmptyState, formatNumber } from "./adminShared";

export default function CombatStatsTab() {
  const { data: stats = [] } = useQuery({
    queryKey: ["admin", "characterStats"],
    queryFn: () => base44.entities.CharacterStat.list().catch(() => []),
    initialData: [],
  });
  const { data: characters = [] } = useQuery({
    queryKey: ["admin", "characters"],
    queryFn: () => base44.entities.Character.list().catch(() => []),
    initialData: [],
  });

  const charMap = useMemo(() => {
    const m = new Map();
    for (const c of characters) m.set(c.id, c);
    return m;
  }, [characters]);

  const totals = useMemo(() => {
    let damage = 0, healing = 0, nat20 = 0, nat1 = 0;
    let hits = 0, misses = 0, kills = 0, downs = 0, rounds = 0;
    let biggest = 0;
    for (const s of stats) {
      damage += Number(s.total_damage_dealt || 0);
      healing += Number(s.total_healing_done || 0);
      nat20 += Number(s.nat_20s || 0);
      nat1 += Number(s.nat_1s || 0);
      hits += Number(s.attacks_hit || 0);
      misses += Number(s.attacks_missed || 0);
      kills += Number(s.kills || 0);
      downs += Number(s.times_downed || 0);
      rounds += Number(s.rounds_in_combat || 0);
      biggest = Math.max(biggest, Number(s.highest_single_damage || 0));
    }
    const n = Math.max(1, stats.length);
    const totalAttacks = hits + misses;
    return {
      avgDamage: damage / n,
      avgHealing: healing / n,
      nat20, nat1,
      accuracy: totalAttacks ? (hits / totalAttacks) * 100 : 0,
      avgRounds: rounds / Math.max(1, stats.filter((s) => Number(s.rounds_in_combat || 0) > 0).length),
      biggest,
      kills, downs,
    };
  }, [stats]);

  // Per-class aggregates: avg kills, avg times_downed.
  const byClass = useMemo(() => {
    const buckets = new Map();
    for (const s of stats) {
      const ch = charMap.get(s.character_id);
      const cls = ch?.class || "Unknown";
      if (!buckets.has(cls)) {
        buckets.set(cls, { class: cls, kills: 0, downs: 0, count: 0 });
      }
      const b = buckets.get(cls);
      b.kills += Number(s.kills || 0);
      b.downs += Number(s.times_downed || 0);
      b.count += 1;
    }
    const rows = Array.from(buckets.values()).map((b) => ({
      class: b.class,
      avgKills: b.kills / b.count,
      avgDowns: b.downs / b.count,
    }));
    return {
      deadliest: rows.slice().sort((a, b) => b.avgKills - a.avgKills),
      mostDowned: rows.slice().sort((a, b) => b.avgDowns - a.avgDowns),
    };
  }, [stats, charMap]);

  const handleExport = () => {
    const rows = [
      { metric: "avg_damage_per_character", value: totals.avgDamage.toFixed(2) },
      { metric: "avg_healing_per_character", value: totals.avgHealing.toFixed(2) },
      { metric: "total_nat_20", value: totals.nat20 },
      { metric: "total_nat_1", value: totals.nat1 },
      { metric: "accuracy_percent", value: totals.accuracy.toFixed(1) },
      { metric: "avg_combat_rounds", value: totals.avgRounds.toFixed(1) },
      { metric: "biggest_single_hit", value: totals.biggest },
      { metric: "total_kills", value: totals.kills },
      { metric: "total_downs", value: totals.downs },
      ...byClass.deadliest.map((r) => ({ metric: `class_${r.class}_avg_kills`, value: r.avgKills.toFixed(2) })),
      ...byClass.mostDowned.map((r) => ({ metric: `class_${r.class}_avg_downs`, value: r.avgDowns.toFixed(2) })),
    ];
    downloadCsv("admin_combat_stats", rows, ["metric", "value"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Combat Stats <span className="text-xs text-slate-500 font-normal">— Aggregate P.I.E.</span></h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg Damage" value={formatNumber(totals.avgDamage)} accent="#FF5722" hint="Per character" />
        <StatCard label="Avg Healing" value={formatNumber(totals.avgHealing)} accent="#22c55e" hint="Per character" />
        <StatCard label="Total Nat 20s" value={formatNumber(totals.nat20)} accent="#fbbf24" />
        <StatCard label="Total Nat 1s" value={formatNumber(totals.nat1)} accent="#ef4444" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Accuracy"          value={`${totals.accuracy.toFixed(1)}%`} accent="#37F2D1" />
        <StatCard label="Avg Combat Length" value={`${totals.avgRounds.toFixed(1)} rd`} accent="#a855f7" />
        <StatCard label="Biggest Single Hit" value={formatNumber(totals.biggest)} accent="#FF5722" />
        <StatCard label="Total Kills"        value={formatNumber(totals.kills)} accent="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard title="Deadliest Class (avg kills)">
          {byClass.deadliest.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: Math.max(220, byClass.deadliest.length * 28) }}>
              <ResponsiveContainer>
                <BarChart data={byClass.deadliest} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="class" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Bar dataKey="avgKills" fill="#FF5722" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>
        <PanelCard title="Most Downed Class (avg downs)">
          {byClass.mostDowned.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: Math.max(220, byClass.mostDowned.length * 28) }}>
              <ResponsiveContainer>
                <BarChart data={byClass.mostDowned} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="class" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Bar dataKey="avgDowns" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
