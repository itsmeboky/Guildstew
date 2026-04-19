import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { base44 } from "@/api/base44Client";
import { TIERS } from "@/api/billingClient";
import { downloadCsv } from "@/utils/csv";
import {
  ADMIN_COLORS, StatCard, PanelCard, EmptyState, withinRange,
  formatNumber, formatCurrency,
} from "./adminShared";

// MRR prices pull straight from the TIERS catalog so billing,
// admin, and the pricing page can never drift.
const REVENUE_PRICES = {
  adventurer: TIERS.adventurer.price,
  veteran:    TIERS.veteran.price,
  guild:      TIERS.guild.price,
};
const AI_COST_PER_EVENT = 0.10;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export default function RevenueTab({ dateRange }) {
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.UserProfile.list().catch(() => []),
    initialData: [],
  });
  const { data: events = [] } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => base44.entities.AnalyticsEvent.list().catch(() => []),
    initialData: [],
  });

  const tierCounts = useMemo(() => {
    const m = { free: 0, adventurer: 0, veteran: 0, guild: 0 };
    for (const u of users) {
      const t = u.subscription_tier || "free";
      m[t] = (m[t] || 0) + 1;
    }
    return m;
  }, [users]);

  const mrr = useMemo(() => {
    return (
      tierCounts.adventurer * REVENUE_PRICES.adventurer +
      tierCounts.veteran    * REVENUE_PRICES.veteran +
      tierCounts.guild      * REVENUE_PRICES.guild
    );
  }, [tierCounts]);

  const tierPie = useMemo(() => {
    return ["adventurer", "veteran", "guild"].map((tier, i) => ({
      tier,
      name: TIERS[tier]?.name || tier,
      value: tierCounts[tier] || 0,
      color: TIERS[tier]?.badgeColor || ADMIN_COLORS[i],
    })).filter((t) => t.value > 0);
  }, [tierCounts]);

  // Subscription growth — `subscription_started` events per week.
  const subGrowth = useMemo(() => weeklySeries(events, dateRange, ["subscription_started"]), [events, dateRange]);

  // AI usage — per-day count + estimated $cost.
  const aiSeries = useMemo(() => {
    const range = effectiveRange(dateRange);
    const buckets = new Map();
    for (let t = range.start; t <= range.end; t += DAY_MS) {
      buckets.set(new Date(t).toISOString().slice(0, 10), { count: 0 });
    }
    for (const e of events) {
      if (!withinRange(e.created_at, dateRange)) continue;
      if (!["ai_quick_pick_used", "ai_generate_used", "ai_portrait_generated"].includes(e.event_type)) continue;
      const d = new Date(e.created_at).toISOString().slice(0, 10);
      if (!buckets.has(d)) continue;
      buckets.get(d).count += 1;
    }
    return Array.from(buckets.entries()).map(([date, v]) => ({
      date,
      count: v.count,
      cost: +(v.count * AI_COST_PER_EVENT).toFixed(2),
    }));
  }, [events, dateRange]);

  const totalAi = useMemo(
    () => aiSeries.reduce((sum, p) => sum + p.count, 0),
    [aiSeries],
  );
  const totalAiCost = useMemo(
    () => aiSeries.reduce((sum, p) => sum + p.cost, 0),
    [aiSeries],
  );

  const handleExport = () => {
    const rows = [
      { metric: "MRR", value: mrr.toFixed(2) },
      { metric: "Adventurer count", value: tierCounts.adventurer },
      { metric: "Veteran count", value: tierCounts.veteran },
      { metric: "Guild count", value: tierCounts.guild },
      { metric: "Total AI events (range)", value: totalAi },
      { metric: "Estimated AI cost (range)", value: totalAiCost.toFixed(2) },
      ...subGrowth.map((p) => ({ metric: `weekly_subs_${p.date}`, value: p.count })),
      ...aiSeries.map((p) => ({ metric: `ai_events_${p.date}`, value: p.count })),
    ];
    downloadCsv("admin_revenue", rows, ["metric", "value"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Revenue</h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MRR"               value={formatCurrency(mrr)} accent="#fbbf24" hint="Adventurer + Veteran + Guild" />
        <StatCard label="Paying Users"      value={formatNumber(tierCounts.adventurer + tierCounts.veteran + tierCounts.guild)} accent="#22c55e" />
        <StatCard label="AI Events (range)" value={formatNumber(totalAi)} accent="#a855f7" />
        <StatCard label="AI Cost (range)"   value={formatCurrency(totalAiCost)} accent="#FF5722" hint="$0.10 per event" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,2fr] gap-4">
        <PanelCard title="Tier Distribution (paying users)">
          {tierPie.length === 0 ? (
            <EmptyState label="No paid subscriptions yet." />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={tierPie} dataKey="value" nameKey="name" outerRadius={100} label>
                    {tierPie.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>

        <PanelCard title="Subscription Growth (weekly)">
          {subGrowth.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={subGrowth}>
                  <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Line type="monotone" dataKey="count" name="New subs" stroke="#fbbf24" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard title="AI Usage & Estimated Cost">
        {aiSeries.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={aiSeries}>
                <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#a855f7" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#FF5722" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                <Legend />
                <Line yAxisId="left"  type="monotone" dataKey="count" name="Events" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cost"  name="Est. cost ($)" stroke="#FF5722" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

function effectiveRange(dateRange) {
  if (dateRange?.from) {
    return {
      start: new Date(dateRange.from).getTime(),
      end:   new Date(dateRange.to || dateRange.from).getTime() + DAY_MS - 1,
    };
  }
  // Default: trailing 12 weeks.
  const end = Date.now();
  return { start: end - 12 * WEEK_MS, end };
}

function weeklySeries(events, dateRange, types) {
  const range = effectiveRange(dateRange);
  // Snap start to a Monday so weekly buckets align nicely.
  const startMon = startOfWeek(new Date(range.start));
  const endMon = startOfWeek(new Date(range.end));
  const buckets = new Map();
  for (let t = startMon; t <= endMon; t += WEEK_MS) {
    buckets.set(new Date(t).toISOString().slice(0, 10), 0);
  }
  for (const e of events) {
    if (!types.includes(e.event_type)) continue;
    const t = new Date(e.created_at || 0).getTime();
    if (!Number.isFinite(t) || t < startMon || t > range.end) continue;
    const wk = startOfWeek(new Date(t));
    const key = new Date(wk).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

function startOfWeek(d) {
  const c = new Date(d);
  const day = (c.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  c.setUTCDate(c.getUTCDate() - day);
  c.setUTCHours(0, 0, 0, 0);
  return c.getTime();
}
