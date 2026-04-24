import React, { useEffect } from "react";
import { X } from "lucide-react";

// Canonical image URLs — all served from the app-assets/hero bucket.
export const IMAGES = {
  trinket: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/ezgif.com-reverse.gif",
  guild:   "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/Makeaguild.png",
  creator: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/becomeacreator1.png",
  tiers: [
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier1.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier2.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier3.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier4.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier5.png",
  ],
};

export const BUNDLES = [
  { id: 1, price: 5,   spice: 1310,  bonus: 60,   pct: "5%",  rarity: "common",    label: "Common" },
  { id: 2, price: 10,  spice: 2750,  bonus: 250,  pct: "10%", rarity: "uncommon",  label: "Uncommon" },
  { id: 3, price: 25,  spice: 7200,  bonus: 950,  pct: "15%", rarity: "legendary", label: "Legendary", best: true },
  { id: 4, price: 50,  spice: 14375, bonus: 1875, pct: "15%", rarity: "rare",      label: "Rare" },
  { id: 5, price: 100, spice: 27500, bonus: 2500, pct: "10%", rarity: "veryrare",  label: "Very Rare" },
];

export const RARITY = {
  common:    { gradient: "linear-gradient(160deg, #1e222a 0%, #2a2e36 50%, #1e222a 100%)", border: ["#9ca3af","#6b7280"], accent: "#9ca3af", glow: "rgba(156,163,175,0.25)", text: "#e2e8f0" },
  uncommon:  { gradient: "linear-gradient(160deg, #0f2418 0%, #1a3328 50%, #0f2418 100%)", border: ["#22c55e","#16a34a"], accent: "#22c55e", glow: "rgba(34,197,94,0.25)",   text: "#e2e8f0" },
  rare:      { gradient: "linear-gradient(160deg, #0f1a2e 0%, #1a2a45 50%, #0f1a2e 100%)", border: ["#3b82f6","#2563eb"], accent: "#3b82f6", glow: "rgba(59,130,246,0.3)",  text: "#e2e8f0" },
  veryrare:  { gradient: "linear-gradient(160deg, #1a0f2e 0%, #2a1a45 50%, #1a0f2e 100%)", border: ["#8b5cf6","#7c3aed"], accent: "#8b5cf6", glow: "rgba(139,92,246,0.3)",  text: "#e2e8f0" },
  legendary: { gradient: "linear-gradient(160deg, #f59e0b 0%, #d97706 40%, #b45309 100%)", border: ["#fbbf24","#f59e0b"], accent: "#fbbf24", glow: "rgba(245,158,11,0.45)", text: "#1a0f00" },
};

/**
 * Overlay + main container. Escape closes, backdrop click closes,
 * body scroll locks while open. Fade-in animation runs on every
 * mount via the `empFadeIn` keyframe. Content slots (Trinket dome,
 * title, pricing row, CTAs) come in in subsequent steps.
 */
export default function SpiceEmporium({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <Keyframes />
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 50,
          padding: "20px",
          background: "radial-gradient(ellipse at center, rgba(18,16,31,0.85) 0%, rgba(12,10,24,0.95) 100%)",
          animation: "empFadeIn 0.3s ease-out",
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full"
          style={{
            maxWidth: "920px",
            background: "linear-gradient(180deg, #1a1730 0%, #141225 50%, #100e1f 100%)",
            border: "1px solid rgba(245,158,11,0.08)",
            borderRadius: "24px",
            overflow: "visible",
            boxShadow: "0 0 100px rgba(139,92,246,0.05), 0 0 60px rgba(245,158,11,0.03), 0 30px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Accent glow line at the top edge — subtle pulsing seam. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: "-1px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "160px",
              height: "2px",
              background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
              animation: "empGentlePulse 3s ease-in-out infinite",
            }}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute flex items-center justify-center"
            style={{
              top: "14px",
              right: "14px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#5a5575",
              cursor: "pointer",
              zIndex: 20,
            }}
          >
            <X size={14} />
          </button>

          {/* Content slots below. Trinket + title + cards + CTAs land
              in the next commits. */}
          <div style={{ padding: "0 0 0 0", minHeight: "120px" }} />
        </div>
      </div>
    </>
  );
}

// Minimal keyframes used by step 2 — pulse for the accent line and
// fade-in for the overlay. Full animation set lands in step 10.
function Keyframes() {
  return (
    <style>{`
      @keyframes empFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes empGentlePulse {
        0%, 100% { opacity: 0.3; }
        50%      { opacity: 0.7; }
      }
    `}</style>
  );
}
