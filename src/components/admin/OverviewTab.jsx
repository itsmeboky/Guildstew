import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { base44 } from "@/api/base44Client";
import { TIERS } from "@/api/billingClient";
import { downloadCsv } from "@/utils/csv";
import {
  ADMIN_COLORS, StatCard, PanelCard, EmptyState, withinRange,
  formatNumber, formatCurrency,
} from "./adminShared";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function OverviewTab({ dateRange }) {
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.UserProfile.list(),
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
  const { data: tickets = [] } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => base44.entities.SupportTicket.list().catch(() => []),
    initialData: [],
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => base44.entities.UserReport.list().catch(() => []),
    initialData: [],
  });
  const { data: brews = [] } = useQuery({
    queryKey: ["admin", "brews"],
    queryFn: () => base44.entities.HomebrewRule.list().catch(() => []),
    initialData: [],
  });

  // Active users — distinct user_id from analytics_events in the last
  // 7 days. Independent of dateRange so the card always reflects "right
  // now" engagement instead of an arbitrary slice.
  const activeUsers7d = useMemo(() => {
    const cutoff = Date.now() - 7 * DAY_MS;
    const set = new Set();
    for (const e of events) {
      const t = new Date(e.created_at || e.timestamp || 0).getTime();
      if (t >= cutoff && e.user_id) set.add(e.user_id);
    }
    return set.size;
  }, [events]);

  const usersByTier = useMemo(() => {
    const counts = { free: 0, adventurer: 0, veteran: 0, guild: 0 };
    for (const u of users) {
      const t = u.subscription_tier || "free";
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts).map(([tier, count]) => ({
      tier,
      name: TIERS[tier]?.name || tier,
      value: count,
      color: TIERS[tier]?.badgeColor && TIERS[tier].badgeColor !== "transparent"
        ? TIERS[tier].badgeColor
        : "#475569",
    }));
  }, [users]);

  // MRR — paid tier headcount × monthly price.
  const mrr = useMemo(() => {
    let total = 0;
    for (const row of usersByTier) {
      const price = TIERS[row.tier]?.price || 0;
      total += price * row.value;
    }
    return total;
  }, [usersByTier]);

  // New signups per day inside the date range. Falls back to "last 30
  // days" when no range is set so the chart isn't blank on first load.
  const signupsSeries = useMemo(() => {
    const range = dateRange?.from
      ? dateRange
      : { from: new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10),
          to:   new Date().toISOString().slice(0, 10) };
    const buckets = new Map();
    const start = new Date(range.from).getTime();
    const end = new Date(range.to || range.from).getTime() + DAY_MS - 1;
    for (let t = start; t <= end; t += DAY_MS) {
      buckets.set(new Date(t).toISOString().slice(0, 10), 0);
    }
    for (const u of users) {
      const created = u.created_at;
      if (!created) continue;
      const d = new Date(created).toISOString().slice(0, 10);
      if (buckets.has(d)) buckets.set(d, buckets.get(d) + 1);
    }
    return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  }, [users, dateRange]);

  const openTickets = useMemo(
    () => tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
    [tickets],
  );
  const pendingReports = useMemo(
    () => reports.filter((r) => r.status === "pending" || !r.status).length,
    [reports],
  );
  const pendingContent = useMemo(
    () => brews.filter((b) => b.is_published && (b.moderation_status === "pending" || !b.moderation_status)).length,
    [brews],
  );

  const eventsInRange = useMemo(
    () => events.filter((e) => withinRange(e.created_at || e.timestamp, dateRange)),
    [events, dateRange],
  );

  const handleExport = () => {
    const rows = [
      { metric: "Total Users", value: users.length },
      { metric: "Active Users (7d)", value: activeUsers7d },
      { metric: "Total Campaigns", value: campaigns.length },
      { metric: "MRR", value: mrr.toFixed(2) },
      { metric: "Open Support Tickets", value: openTickets },
      { metric: "Pending Reports", value: pendingReports },
      { metric: "Pending Content Reviews", value: pendingContent },
      { metric: "Events (range)", value: eventsInRange.length },
    ];
    for (const t of usersByTier) {
      rows.push({ metric: `Tier: ${t.name}`, value: t.value });
    }
    downloadCsv("admin_overview", rows, ["metric", "value"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Overview</h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users"     value={formatNumber(users.length)} accent="#37F2D1" />
        <StatCard label="Active (7d)"     value={formatNumber(activeUsers7d)} accent="#22c55e" hint="Distinct event users" />
        <StatCard label="Total Campaigns" value={formatNumber(campaigns.length)} accent="#a855f7" />
        <StatCard label="MRR"             value={formatCurrency(mrr)} accent="#fbbf24" hint="Paid tier × price" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard title="Users by Tier">
          {usersByTier.every((t) => t.value === 0) ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={usersByTier} dataKey="value" nameKey="name" outerRadius={100} label>
                    {usersByTier.map((t, i) => (
                      <Cell key={i} fill={t.color || ADMIN_COLORS[i % ADMIN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>

        <PanelCard title="New Signups">
          {signupsSeries.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={signupsSeries}>
                  <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Line type="monotone" dataKey="count" stroke="#37F2D1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Open Support Tickets"      value={formatNumber(openTickets)}     accent="#fbbf24" />
        <StatCard label="Pending Reports"           value={formatNumber(pendingReports)}  accent="#FF5722" />
        <StatCard label="Pending Content Reviews"   value={formatNumber(pendingContent)}  accent="#a855f7" />
      </div>
    </div>
  );
}
