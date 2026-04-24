import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { createPageUrl } from "@/utils";

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
  const { user } = useAuth();
  const sub = useSubscription();
  const navigate = useNavigate();
  const inGuild = !!sub?.isGuildMember || !!sub?.isGuildOwner || !!sub?.guildOwnerId;

  // Creator CTA label pivots on whether the user already has any
  // tavern_items rows. Kept as a head+count so we don't pull rows.
  const { data: listingCount = 0 } = useQuery({
    queryKey: ["emporiumListingCount", user?.id],
    queryFn: async () => {
      const { supabase } = await import("@/api/supabaseClient");
      const { count } = await supabase
        .from("tavern_items")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id);
      return count || 0;
    },
    enabled: !!user?.id && open,
  });
  const isCreator = listingCount > 0;

  const goGuild = () => {
    onClose?.();
    navigate(createPageUrl("Guild"));
  };

  const goCreator = () => {
    onClose?.();
    navigate(createPageUrl(isCreator ? "CreatorDashboard" : "CreatorProgram"));
  };

  const goPricing = () => {
    onClose?.();
    navigate(createPageUrl("AccountBilling"));
  };

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

          <TrinketDome />
          <TitleBlock />
          <PricingRow onPurchase={(bundle) => {
            // step 7 wires the real purchase flow; until then we
            // just close so the button is already functional.
            onClose?.();
          }} />
          <CtaStrip
            inGuild={inGuild}
            isCreator={isCreator}
            onGuild={goGuild}
            onCreator={goCreator}
            onPricing={goPricing}
          />
        </div>
      </div>
    </>
  );
}

/**
 * Trinket in the dome — anchored at the top-center of the main
 * container, offset upward by 80px so her silhouette overlaps the
 * top edge like a shopkeeper leaning out of her shop window. A
 * subtle 3s bob keeps her alive while the popup is open.
 *
 * 140x140 circle with object-fit: cover clips her trailing smoke
 * tail cleanly at the frame edge.
 */
function TrinketDome() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: "-80px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        pointerEvents: "none",
        animation: "empTrinketBob 3s ease-in-out infinite",
      }}
    >
      <div
        style={{
          width: "140px",
          height: "140px",
          borderRadius: "50%",
          overflow: "hidden",
          background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
          border: "2px solid rgba(245,158,11,0.15)",
          boxShadow: "0 0 50px rgba(245,158,11,0.08)",
        }}
      >
        <img
          src={IMAGES.trinket}
          alt="Trinket"
          draggable={false}
          style={{
            width: "140px",
            height: "140px",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Title block — three lines of copy centered under the dome.
 *   1. Emporium eyebrow (salmon).
 *   2. Decorative line — wheat — "SPICE" — decorative line (orange).
 *   3. Subtitle tagline (muted).
 *
 * padding-top 76px clears the bottom half of the dome (60px below
 * the container top) plus breathing room.
 */
function TitleBlock() {
  return (
    <div style={{ paddingTop: "76px", textAlign: "center" }}>
      <p
        style={{
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#f8a47c",
          margin: 0,
        }}
      >
        Trinket's Emporium
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          marginTop: "8px",
        }}
      >
        <span
          aria-hidden
          style={{
            width: "40px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.25))",
          }}
        />
        <SpiceIcon size={24} color="#f59e0b" />
        <span
          style={{
            fontSize: "24px",
            fontWeight: 900,
            fontFamily: "'Cinzel', serif",
            color: "#f59e0b",
            letterSpacing: "0.08em",
          }}
        >
          SPICE
        </span>
        <SpiceIcon size={24} color="#f59e0b" style={{ transform: "scaleX(-1)" }} />
        <span
          aria-hidden
          style={{
            width: "40px",
            height: "1px",
            background: "linear-gradient(90deg, rgba(245,158,11,0.25), transparent)",
          }}
        />
      </div>

      <p
        style={{
          fontSize: "10px",
          color: "#4a4560",
          fontWeight: 500,
          marginTop: "6px",
          marginBottom: 0,
        }}
      >
        The currency that flavors your adventure
      </p>
    </div>
  );
}

/**
 * Pricing row — 5 cards aligned to flex-end. Best Deal floats 28px
 * above the row via translateY so it visually breaks the baseline.
 */
function PricingRow({ onPurchase }) {
  const [hoveredId, setHoveredId] = React.useState(null);
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        padding: "6px 20px",
        alignItems: "flex-end",
      }}
    >
      {BUNDLES.map((b) => (
        <PricingCard
          key={b.id}
          bundle={b}
          hovered={hoveredId === b.id}
          onHover={() => setHoveredId(b.id)}
          onLeave={() => setHoveredId((h) => (h === b.id ? null : h))}
          onPurchase={() => onPurchase?.(b)}
        />
      ))}
    </div>
  );
}

function PricingCard({ bundle, hovered, onHover, onLeave, onPurchase }) {
  const r = RARITY[bundle.rarity];
  const isLegendary = bundle.rarity === "legendary";
  const isBest = !!bundle.best;
  const isActiveMotion = isBest || hovered;

  // Border via layered box-shadow so the rarity border blends with
  // the glow instead of fighting a solid 1px outline.
  const shadow = hovered
    ? `0 0 0 2px ${r.border[0]}, 0 20px 60px ${r.glow}, 0 0 40px ${r.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`
    : isBest
      ? `0 0 0 2px ${r.border[1]}, 0 10px 40px ${r.glow}, 0 0 20px ${r.glow}`
      : `0 0 0 1px ${r.border[1]}40, 0 4px 20px rgba(0,0,0,0.3)`;

  const transform = hovered
    ? "translateY(-12px) scale(1.06)"
    : isBest
      ? "translateY(-28px)"
      : "translateY(0)";

  const z = isBest ? 3 : hovered ? 2 : 1;

  // Overlay gradient strength depends on rarity + state.
  const shimmerBg = hovered
    ? (isLegendary
        ? "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)"
        : `linear-gradient(180deg, ${r.glow} 0%, transparent 100%)`)
    : (isLegendary
        ? "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)");

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        flex: isBest ? 1.2 : 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: isBest ? "14px 14px 18px" : "12px 12px 16px",
        borderRadius: "16px",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        background: r.gradient,
        color: r.text,
        transform,
        boxShadow: shadow,
        zIndex: z,
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Static top-half shimmer overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "55%",
          background: shimmerBg,
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          pointerEvents: "none",
        }}
      />

      {/* Sliding shimmer ribbon — only on legendary + hovered cards. */}
      {isActiveMotion && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "60%",
            height: "100%",
            background: isLegendary
              ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)"
              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            animation: "empShimmerSlide 2.5s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Floating particles — rising from bottom on legendary + hovered. */}
      {isActiveMotion && (
        <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                bottom: "6px",
                left: `${15 + i * 14}%`,
                width: "3px",
                height: "3px",
                borderRadius: "50%",
                background: isLegendary ? "rgba(255,255,255,0.9)" : r.accent,
                opacity: 0,
                animation: `empFloatUp ${1.8 + (i % 3) * 0.4}s ease-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* --- Content stack --- */}
      <div style={{ position: "relative", zIndex: 1, display: "contents" }}>
        {/* 1. Rarity label */}
        {isBest ? (
          <span
            style={{
              background: "rgba(26,15,0,0.7)",
              color: "#fbbf24",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "3px 12px",
              borderRadius: "20px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            ★ Best Deal
          </span>
        ) : (
          <span
            style={{
              fontSize: "8px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: r.accent,
              opacity: 0.65,
            }}
          >
            {bundle.label}
          </span>
        )}

        {/* 2. Tier image */}
        <div
          style={{
            width: isBest ? "100px" : "75px",
            height: isBest ? "100px" : "75px",
            transition: "filter 0.3s ease, transform 0.3s ease",
            filter: hovered ? `drop-shadow(0 0 12px ${r.accent})` : "none",
            transform: hovered ? "scale(1.12)" : "scale(1)",
          }}
        >
          <img
            src={IMAGES.tiers[bundle.id - 1]}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        {/* 3. Spice header — wheat icon + "Spice" */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <SpiceIcon
            size={isBest ? 20 : 16}
            color={isLegendary ? "#1a0f00" : r.accent}
          />
          <span
            style={{
              fontSize: isBest ? "16px" : "13px",
              fontWeight: 900,
              fontFamily: "'Cinzel', serif",
              color: isLegendary ? "#1a0f00" : r.accent,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Spice
          </span>
        </div>

        {/* 4. Amount */}
        <div
          style={{
            fontSize: isBest ? "28px" : "22px",
            fontWeight: 800,
            fontFamily: "'Cinzel', serif",
            color: r.text,
            lineHeight: 1,
            textShadow: hovered && !isLegendary ? `0 0 20px ${r.glow}` : "none",
          }}
        >
          {bundle.spice.toLocaleString()}
        </div>

        {/* 5. Bonus badge */}
        <span
          style={{
            background: isLegendary ? "rgba(26,15,0,0.15)" : `${r.accent}18`,
            border: `1px solid ${isLegendary ? "rgba(26,15,0,0.2)" : `${r.accent}30`}`,
            color: isLegendary ? "#1a0f00" : r.accent,
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "12px",
          }}
        >
          +{bundle.bonus.toLocaleString()} bonus
        </span>

        {/* 6. Price */}
        <div
          style={{
            fontSize: isBest ? "14px" : "12px",
            fontWeight: 600,
            color: isLegendary ? "rgba(26,15,0,0.6)" : "rgba(255,255,255,0.55)",
          }}
        >
          ${bundle.price.toFixed(2)}
        </div>

        {/* 7. Bonus percent */}
        <div
          style={{
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: isLegendary ? "rgba(26,15,0,0.4)" : "rgba(255,255,255,0.3)",
            textTransform: "uppercase",
          }}
        >
          {bundle.pct} Bonus
        </div>

        {/* 8. Purchase button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPurchase?.(); }}
          style={{
            marginTop: "6px",
            width: "100%",
            padding: isBest ? "9px 14px" : "7px 12px",
            borderRadius: "10px",
            background: isLegendary
              ? (hovered ? "#2a1a08" : "linear-gradient(135deg, #1a0f00, #2a1a08)")
              : (hovered ? `${r.accent}28` : `${r.accent}12`),
            border: isLegendary ? "none" : `1px solid ${hovered ? `${r.accent}70` : `${r.accent}40`}`,
            color: isLegendary ? "#fbbf24" : r.accent,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "'Cinzel', serif",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Purchase
        </button>
      </div>
    </div>
  );
}

/**
 * Bottom CTA strip — Guild left, center upsell copy, Creator right.
 * Each CTA uses JumpCTA which overlaps the character image above
 * the button so the character appears to leap out on hover.
 */
function CtaStrip({ inGuild, isCreator, onGuild, onCreator, onPricing }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "24px 32px 20px",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        marginTop: "4px",
      }}
    >
      <JumpCTA
        image={IMAGES.guild}
        alt="Guild"
        label={inGuild ? "Guild Hub" : "Create a Guild"}
        sublabel="$5.83/person · 6 members"
        onClick={onGuild}
      />

      {/* Center upsell — points the user at tier pricing. */}
      <div style={{ textAlign: "center", alignSelf: "center" }}>
        <p style={{ fontSize: "9px", color: "#4a4560", fontWeight: 500, margin: 0 }}>
          Upgrade for better splits
        </p>
        <button
          type="button"
          onClick={onPricing}
          style={{
            fontSize: "9px",
            color: "#f8a47c",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "2px",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          See tier benefits →
        </button>
      </div>

      <JumpCTA
        image={IMAGES.creator}
        alt="Creator"
        label={isCreator ? "Creator Dashboard" : "Become a Creator"}
        sublabel="Earn Spice on every sale"
        onClick={onCreator}
      />
    </div>
  );
}

function JumpCTA({ image, alt, label, sublabel, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Character — sits above the button, overlaps the button's
          top edge via a negative margin-bottom so it reads as the
          character leaping out of the shop window. */}
      <div
        style={{
          width: "90px",
          height: "90px",
          position: "relative",
          zIndex: 2,
          marginBottom: "-20px",
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: hovered ? "translateY(-8px) scale(1.1)" : "translateY(0) scale(1)",
          filter: hovered
            ? "drop-shadow(0 8px 16px rgba(248,164,124,0.3))"
            : "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          pointerEvents: "none",
        }}
      >
        <img
          src={image}
          alt={alt}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      <button
        type="button"
        onClick={onClick}
        style={{
          position: "relative",
          zIndex: 1,
          background: hovered ? "rgba(248,164,124,0.12)" : "rgba(248,164,124,0.04)",
          border: `1px solid ${hovered ? "rgba(248,164,124,0.4)" : "rgba(248,164,124,0.15)"}`,
          borderRadius: "14px",
          padding: "22px 20px 12px",
          minWidth: "160px",
          textAlign: "center",
          cursor: "pointer",
          boxShadow: hovered ? "0 4px 20px rgba(248,164,124,0.1)" : "none",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#f8a47c",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "9px",
            fontWeight: 500,
            color: "#5a5575",
            marginTop: "2px",
          }}
        >
          {sublabel}
        </div>
      </button>
    </div>
  );
}

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
      @keyframes empTrinketBob {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50%      { transform: translateX(-50%) translateY(-8px); }
      }
      @keyframes empFloatUp {
        0%   { opacity: 0; transform: translateY(0) scale(1); }
        30%  { opacity: 0.8; }
        100% { opacity: 0; transform: translateY(-60px) scale(0.3); }
      }
      @keyframes empShimmerSlide {
        0%   { left: -100%; }
        100% { left: 200%; }
      }
    `}</style>
  );
}
