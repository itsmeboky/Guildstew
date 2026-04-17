import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, Star } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/utils/csv";
import {
  ADMIN_COLORS, StatCard, PanelCard, EmptyState, formatNumber,
} from "./adminShared";

export default function MarketplaceTab() {
  const { data: brews = [] } = useQuery({
    queryKey: ["admin", "brews"],
    queryFn: () => base44.entities.HomebrewRule.list().catch(() => []),
    initialData: [],
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["admin", "homebrewReviews"],
    queryFn: () => base44.entities.HomebrewReview.list().catch(() => []),
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

  const published = useMemo(() => brews.filter((b) => b.is_published), [brews]);

  const ratingsByBrew = useMemo(() => {
    const m = new Map();
    for (const r of reviews) {
      const id = r.homebrew_id;
      if (!id) continue;
      if (!m.has(id)) m.set(id, { total: 0, count: 0 });
      const entry = m.get(id);
      entry.total += Number(r.rating || 0);
      entry.count += 1;
    }
    return m;
  }, [reviews]);

  const byCategory = useMemo(() => {
    const m = new Map();
    for (const b of published) {
      const cat = b.category || "uncategorized";
      m.set(cat, (m.get(cat) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [published]);

  const topDownloads = useMemo(
    () => published.slice().sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 10),
    [published],
  );

  const topRated = useMemo(() => {
    const enriched = published.map((b) => {
      const r = ratingsByBrew.get(b.id) || { total: 0, count: 0 };
      const avg = r.count > 0 ? r.total / r.count : 0;
      return { ...b, _avgRating: avg, _ratingCount: r.count };
    });
    return enriched
      .filter((b) => b._ratingCount >= 3)
      .sort((a, b) => b._avgRating - a._avgRating)
      .slice(0, 10);
  }, [published, ratingsByBrew]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    let total = 0;
    for (const r of reviews) total += Number(r.rating || 0);
    return total / reviews.length;
  }, [reviews]);

  const totalDownloads = useMemo(
    () => published.reduce((sum, b) => sum + Number(b.downloads || 0), 0),
    [published],
  );

  const ratingPie = useMemo(() => {
    let allAges = 0;
    let adult = 0;
    for (const b of published) {
      if ((b.content_rating || "all_ages") === "18+") adult += 1;
      else allAges += 1;
    }
    return [
      { name: "All Ages", value: allAges, color: "#37F2D1" },
      { name: "18+",      value: adult,    color: "#FF5722" },
    ];
  }, [published]);

  const handleExport = () => {
    const out = published.map((b) => {
      const r = ratingsByBrew.get(b.id) || { total: 0, count: 0 };
      const avg = r.count > 0 ? r.total / r.count : 0;
      return {
        id: b.id,
        title: b.title,
        category: b.category || "",
        creator: profileMap.get(b.creator_id)?.username || b.creator_id || "",
        downloads: b.downloads || 0,
        ratings: r.count,
        avg_rating: avg.toFixed(2),
        content_rating: b.content_rating || "all_ages",
        published_at: b.created_at || "",
      };
    });
    downloadCsv("admin_marketplace", out, [
      "id","title","category","creator","downloads","ratings","avg_rating","content_rating","published_at",
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Marketplace</h2>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Published"   value={formatNumber(published.length)} accent="#37F2D1" />
        <StatCard label="Total Downloads"   value={formatNumber(totalDownloads)} accent="#a855f7" />
        <StatCard label="Avg Rating"        value={`${avgRating.toFixed(2)} ★`} accent="#fbbf24" />
        <StatCard label="Total Reviews"     value={formatNumber(reviews.length)} accent="#3b82f6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
        <PanelCard title="Homebrew by Category">
          {byCategory.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: Math.max(220, byCategory.length * 28) }}>
              <ResponsiveContainer>
                <BarChart data={byCategory} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid stroke="#2A3441" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Bar dataKey="count" fill="#37F2D1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>

        <PanelCard title="Content Rating Mix">
          {ratingPie.every((p) => p.value === 0) ? (
            <EmptyState />
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={ratingPie} dataKey="value" nameKey="name" outerRadius={80} label>
                    {ratingPie.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #2A3441" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </PanelCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard title="Most Downloaded (Top 10)">
          <BrewTable
            rows={topDownloads}
            cols={["title", "creator", "downloads", "rating"]}
            profileMap={profileMap}
            ratingsByBrew={ratingsByBrew}
          />
        </PanelCard>
        <PanelCard title="Highest Rated (min 3 reviews)">
          <BrewTable
            rows={topRated}
            cols={["title", "creator", "rating", "downloads"]}
            profileMap={profileMap}
            ratingsByBrew={ratingsByBrew}
          />
        </PanelCard>
      </div>
    </div>
  );
}

function BrewTable({ rows, cols, profileMap, ratingsByBrew }) {
  if (!rows || rows.length === 0) return <EmptyState />;
  return (
    <div className="max-h-[300px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-widest text-slate-500 sticky top-0 bg-[#1E2430]">
          <tr>{cols.map((c) => <th key={c} className="text-left py-1.5 px-2">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const r = ratingsByBrew.get(b.id) || { total: 0, count: 0 };
            const avg = r.count > 0 ? r.total / r.count : 0;
            const creator = profileMap.get(b.creator_id)?.username || b.creator_id?.slice(0, 8) || "—";
            return (
              <tr key={b.id} className="border-t border-[#2A3441]">
                {cols.map((c) => {
                  if (c === "title") return <td key={c} className="py-1.5 px-2 text-slate-200">{b.title}</td>;
                  if (c === "creator") return <td key={c} className="py-1.5 px-2 text-slate-400">{creator}</td>;
                  if (c === "downloads") return <td key={c} className="py-1.5 px-2 text-slate-300 font-bold">{b.downloads || 0}</td>;
                  if (c === "rating") return (
                    <td key={c} className="py-1.5 px-2 text-amber-400 font-bold">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {avg.toFixed(1)}
                        <span className="text-slate-500 font-normal">({r.count})</span>
                      </span>
                    </td>
                  );
                  return <td key={c} className="py-1.5 px-2">{b[c]}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
