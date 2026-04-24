import React from "react";
import { CREAM } from "@/pages/Forums";

/**
 * Marketing-page primitives shared by /CreatorProgram and /Guild
 * (and any future public-facing landing that joins the rotation).
 *
 * The contract here is intentionally tight so the surfaces stay
 * visually identical: both pages use the same Band background,
 * the same content column width (max-w-6xl), the same vertical
 * rhythm (py-14 md:py-16), and the same SectionTitle typography
 * pair — salmon eyebrow over a dark-navy heading.
 *
 * If a third marketing page lands, import from here rather than
 * duplicating the primitives — the whole point is that the pages
 * look like siblings out of the box.
 */

export { CREAM };

export function Band({ bg, children, className = "" }) {
  return (
    <section style={{ backgroundColor: bg }} className={className}>
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-14 md:py-16">
        {children}
      </div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, pill }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: CREAM.accent }}>
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl md:text-3xl font-black mt-1" style={{ color: "#1E2430" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: CREAM.textMuted }}>
            {subtitle}
          </p>
        )}
      </div>
      {pill && (
        <span
          className="text-[10px] font-black uppercase tracking-[0.22em] px-3 py-1 rounded-full"
          style={{ backgroundColor: CREAM.accent, color: "#FFFFFF" }}
        >
          {pill}
        </span>
      )}
    </div>
  );
}

export function MarketingCard({ children, accent = "plain", className = "" }) {
  const borderColor = accent === "gold" ? "#D97706" : CREAM.cardBorder;
  const background  = accent === "gold" ? "#FFF6E8" : CREAM.card;
  return (
    <div
      className={`rounded-2xl border p-4 ${className}`}
      style={{ backgroundColor: background, borderColor }}
    >
      {children}
    </div>
  );
}
