import React from "react";

/**
 * Shared bits for the admin dashboard — colour palette, big-number
 * stat card, and a date-range filter helper. Centralising these keeps
 * every tab's look-and-feel consistent.
 */
export const ADMIN_COLORS = [
  "#37F2D1", "#FF5722", "#a855f7", "#fbbf24",
  "#22c55e", "#3b82f6", "#ec4899", "#f97316",
  "#14b8a6", "#8b5cf6", "#eab308", "#06b6d4",
];

export function StatCard({ label, value, hint, accent = "#37F2D1" }) {
  return (
    <div
      className="bg-[#1E2430] border border-[#2A3441] rounded-xl p-4 flex flex-col"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}11` }}
    >
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-3xl font-black mt-1" style={{ color: accent }}>{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export function PanelCard({ title, action, children, className = "" }) {
  return (
    <div className={`bg-[#1E2430] border border-[#2A3441] rounded-xl p-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function withinRange(iso, range) {
  if (!iso) return false;
  if (!range?.from && !range?.to) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (range.from && t < new Date(range.from).getTime()) return false;
  // Inclusive end-of-day on `to`.
  if (range.to) {
    const end = new Date(range.to).getTime() + 24 * 60 * 60 * 1000 - 1;
    if (t > end) return false;
  }
  return true;
}

export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatCurrency(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "$0";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function EmptyState({ label = "No data yet" }) {
  return (
    <div className="text-center text-slate-500 text-sm py-12">{label}</div>
  );
}
