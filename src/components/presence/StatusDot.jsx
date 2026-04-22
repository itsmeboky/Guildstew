import React, { useEffect, useRef, useState } from "react";
import { resolveStatus, statusMeta, STATUS_OPTIONS } from "@/lib/PresenceContext";

/**
 * Small colored dot representing a user's presence status. Accepts
 * either a raw status string or a full profile row — the latter
 * applies the 10-minute staleness check via resolveStatus.
 *
 * Props:
 *   status       — 'online' | 'away' | 'dnd' | 'offline' (optional)
 *   profile      — full user_profiles row; staleness check applies (optional)
 *   size         — 'sm' | 'md' | 'lg' — footprint of the dot itself
 *   border       — the border color used to ring the dot against
 *                  an avatar (hex or tailwind). Default `#0f1219`.
 *   className    — extra tailwind utilities
 */
export default function StatusDot({ status, profile, size = 'md', border = '#0f1219', className = '' }) {
  const resolved = profile ? resolveStatus(profile) : (status || 'offline');
  const meta = statusMeta(resolved);
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <span
      className={`inline-block rounded-full ${meta.dot} ${sizeClass} ${className}`}
      style={{ boxShadow: `0 0 0 2px ${border}` }}
      title={meta.label}
    />
  );
}

/**
 * Avatar + corner status dot combo. Wraps any avatar content in a
 * relatively-positioned span and plants the dot in the bottom-right.
 */
export function AvatarWithStatus({ children, status, profile, dotSize = 'sm', dotBorder = '#0f1219', className = '' }) {
  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <span className="absolute bottom-0 right-0 leading-none">
        <StatusDot status={status} profile={profile} size={dotSize} border={dotBorder} />
      </span>
    </span>
  );
}

/**
 * Clickable status dot with a dropdown picker. Used in the nav bar
 * so the signed-in user can pick Online / Away / DND / Offline.
 *
 * Props:
 *   current     — current status string
 *   onChange    — (nextStatus) => void
 */
export function StatusPicker({ current = 'offline', onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onAway = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const meta = statusMeta(current);
  return (
    <div className="relative inline-block" ref={ref}>
      {/* Compact dot-only trigger — the text label previously here
          cluttered the nav bar. Users click the dot to open the
          Online / Away / DND / Invisible picker. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 -m-1 rounded-full"
        title={`Status: ${meta.label}`}
        aria-label={`Presence status: ${meta.label}`}
      >
        <StatusDot status={current} size="md" border="#FF5722" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[180px] bg-[#0f1219] border border-white/10 rounded-lg shadow-xl overflow-hidden">
          {STATUS_OPTIONS.map((opt) => {
            const selected = opt.value === current;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange?.(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  selected ? 'bg-white/5 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <StatusDot status={opt.value} size="sm" border="#0f1219" />
                <span>{opt.label}</span>
                {selected && <span className="ml-auto text-[#37F2D1] text-[10px]">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
