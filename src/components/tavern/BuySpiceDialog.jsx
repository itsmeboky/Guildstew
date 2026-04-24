import React, { useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance, addSpice } from "@/lib/spiceWallet";
import { notifySpicePurchase } from "@/lib/spiceBalanceBus";
import { formatSpice, SPICE_BUNDLES } from "@/config/spiceConfig";
import { createPageUrl } from "@/utils";

const TRINKET_GIF   = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/TrinketSpiceSignUp.gif";
const GUILD_ART     = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/GuildSignup.png";
const CREATOR_ART   = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/CreatorProgram.png";

/**
 * Buy Spice — custom-shaped popup.
 *
 * Replaces the shadcn Dialog with a bespoke overlay + arched container
 * so the center dome and asymmetric layout match the mockup. The
 * popup itself is structured as two stacked whites: a rectangle for
 * the main body with rounded bottom corners, and a circle perched on
 * the top edge (offset upward so it reads as a dome). Trinket's GIF
 * will sit inside that dome in Step 2; the left / right CTAs and the
 * pricing row land in subsequent steps.
 *
 * Accessibility:
 *   - Escape closes
 *   - click on the backdrop closes
 *   - scroll on <body> is locked while open so the overlay can't be
 *     scrolled past
 */
export default function BuySpiceDialog({ open, onClose }) {
  const { user } = useAuth();
  const sub = useSubscription();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Creator-program CTA pivots on whether the user already has any
  // The popup itself does NOT show the user's current Spice balance
  // — that lives on the sidebar / Tavern page and animates after a
  // successful purchase.
  const inGuild = !!sub?.isGuildMember || !!sub?.isGuildOwner || !!sub?.guildOwnerId;

  const goGuild = () => {
    onClose?.();
    // Both in-guild and non-member users land on /Guild — the page
    // routes itself to GuildHub or GuildJoinCTA depending on
    // membership, and GuildJoinCTA is the canonical guild
    // info/benefits surface.
    navigate(createPageUrl("Guild"));
  };

  const goCreator = () => {
    onClose?.();
    // Always route to /CreatorProgram — the popup button is a
    // pure marketing funnel, not a router to the creator's own
    // dashboard. Returning creators still see their dashboard via
    // /CreatorProgram's hero CTA (which swaps to "Open Creator
    // Dashboard" once listingCount > 0).
    navigate(createPageUrl("CreatorProgram"));
  };

  const purchase = useMutation({
    mutationFn: async (bundle) => {
      if (!user?.id) throw new Error("Sign in to purchase Spice.");

      // TODO(stripe): swap this simulated credit for a real Stripe
      // Checkout session once the billing Edge Function is live:
      //   1. POST { bundleId } to the billing function
      //   2. redirect to the returned checkout URL
      //   3. webhook credits Spice + logs the purchase
      // Until then we credit locally so the rest of the Tavern loop
      // (spending, earning, cashouts) is exercisable end-to-end.
      const prevBalance = Number(await getWalletBalance(user.id)) || 0;
      const newBalance = await addSpice(
        user.id,
        bundle.spice,
        "purchase",
        `Purchased ${bundle.label} ($${bundle.price.toFixed(2)})`,
      );

      // lifetime_purchased is analytics-only — non-fatal if the
      // column write fails.
      try {
        const { supabase } = await import("@/api/supabaseClient");
        const { data: current } = await supabase
          .from("spice_wallets")
          .select("lifetime_purchased")
          .eq("user_id", user.id)
          .maybeSingle();
        await supabase
          .from("spice_wallets")
          .update({ lifetime_purchased: (current?.lifetime_purchased || 0) + bundle.spice })
          .eq("user_id", user.id);
      } catch { /* ignore */ }

      return { prevBalance, newBalance };
    },
    onSuccess: ({ prevBalance, newBalance }) => {
      queryClient.invalidateQueries({ queryKey: ["spiceWallet", user?.id] });
      // Close the popup first so the count-up animation on the
      // sidebar / Tavern balance widgets owns the attention. The
      // tiny sonner toast just confirms the purchase succeeded —
      // the actual balance change is shown by the animated counters
      // wherever a balance is rendered.
      onClose?.();
      notifySpicePurchase({ from: prevBalance, to: newBalance });
      toast.success("Purchase complete!", {
        description: `+${formatSpice(newBalance - prevBalance)} Spice added to your wallet.`,
      });
    },
    onError: (err) => toast.error(err?.message || "Purchase failed."),
  });

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

  // Dome dimensions — the white circle sitting on the top-center of
  // the rectangle behind Trinket. Half of the circle overlaps the
  // rectangle's top edge (that's the visible "arch"). Guild +
  // Creator images overflow above the rectangle's flat top on their
  // respective sides; Trinket overflows HIGHER into the dome.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  // Another -20% pass from the previous sizes. Positional offsets
  // that derived from these constants (Trinket lift, button tuck,
  // CTA image lift) scale proportionally below.
  const DOME_SIZE  = isMobile ? 130 : 187;          // was 162 / 234 (-20%)
  const TOP_ROW_PT = isMobile ? 0   : 130;          // was 0   / 162
  const TRINKET_H  = isMobile ? 173 : 422;          // was 216 / 527
  const TRINKET_W  = isMobile ? 274 : 546;          // -20% then +50px wider per request
  const SIDE_IMG   = isMobile ? 173 : 288;          // was 216 / 360
  const SIDE_IMG_LIFT = isMobile ? 0 : TOP_ROW_PT - 32; // proportional to scaled TOP_ROW_PT

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start md:items-center justify-center p-4 md:p-8 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl"
        style={{ marginTop: `${Math.max(0, DOME_SIZE / 2 + 32 - 80)}px` }}
      >
        {/* Arch — the white circle anchored on the top center of the
            rectangle. Half of it sits above the rectangle's edge so
            the combined silhouette reads as an arched top; Trinket
            stands in front of it. */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] z-0"
          style={{
            width: `${DOME_SIZE}px`,
            height: `${DOME_SIZE}px`,
            borderRadius: "50%",
            top: `-${DOME_SIZE / 2}px`,
          }}
        />

        {/* Main rectangle — flat bottom with rounded bottom corners.
            padding-top leaves room for Guild / Trinket / Creator to
            extend upward from the top row's baseline. */}
        <div
          className="relative bg-white rounded-b-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.35)] z-10"
          style={{ paddingTop: `${TOP_ROW_PT}px` }}
        >
          {/* Close button — top-right of the rectangle, clear of the
              dome so it doesn't overlap Trinket. */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-slate-700 flex items-center justify-center transition-colors z-40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="px-5 md:px-10 pb-6 md:pb-8">
            {/* Top row — three columns on one horizontal line.
                items-end aligns Guild / Creator buttons to the row's
                baseline (which is also where the pricing row starts);
                their images overflow upward via `-mt`. Trinket owns
                the center column, overflows HIGHER than the flanking
                images, and the empty space below her feet is where
                the Best Deal card lifts up to meet her. */}
            <div className="hidden md:grid grid-cols-[1fr_0.55fr_1fr] gap-6 items-end">
              <TopColumn
                art={GUILD_ART}
                alt="Guild signup"
                label={inGuild ? "GUILD HUB" : "CREATE A GUILD"}
                onClick={goGuild}
                imgSize={SIDE_IMG}
                imgLift={SIDE_IMG_LIFT}
              />
              <div className="flex flex-col items-center" style={{ marginTop: -(TOP_ROW_PT + 288) }}>
                <img
                  src={TRINKET_GIF}
                  alt="Trinket"
                  draggable={false}
                  className="relative drop-shadow-[0_10px_16px_rgba(0,0,0,0.3)]"
                  style={{ height: `${TRINKET_H}px`, width: `${TRINKET_W}px`, objectFit: "fill", zIndex: 5 }}
                />
              </div>
              <TopColumn
                art={CREATOR_ART}
                alt="Creator program"
                label="BECOME A CREATOR"
                onClick={goCreator}
                imgSize={SIDE_IMG}
                imgLift={SIDE_IMG_LIFT}
              />
            </div>

            {/* Mobile: Trinket centered on top, CTAs as compact pills
                below the pricing grid. */}
            <div className="md:hidden flex flex-col items-center">
              <img
                src={TRINKET_GIF}
                alt="Trinket"
                draggable={false}
                className="relative drop-shadow-[0_8px_12px_rgba(0,0,0,0.3)]"
                style={{ height: `${TRINKET_H}px`, width: `${TRINKET_W}px`, objectFit: "fill", marginTop: `-${Math.max(DOME_SIZE * 0.45, 48) + 160}px`, zIndex: 5 }}
              />
            </div>

            {/* Pricing row. items-end lets the Best Deal card extend
                upward into the top row so Trinket visually perches on
                it — cards 1, 2, 4, 5 stay baseline-aligned while
                card 3 lifts via -mt in PricingCard. */}
            <div className="mt-3 md:mt-4">
              <PricingRow
                onPurchase={(bundle) => purchase.mutate(bundle)}
                disabled={purchase.isPending || !user?.id}
              />
            </div>

            {/* Mobile CTAs appear below the pricing grid. */}
            <div className="md:hidden mt-4 space-y-2">
              <CtaColumn
                art={GUILD_ART}
                alt="Guild signup"
                label={inGuild ? "GUILD HUB" : "CREATE A GUILD"}
                onClick={goGuild}
              />
              <CtaColumn
                art={CREATOR_ART}
                alt="Creator program"
                label="BECOME A CREATOR"
                onClick={goCreator}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop-only top-row CTA column. The image overflows the
 * rectangle's top edge by `imgLift` so all three images (Guild,
 * Trinket, Creator) share one visual horizontal row. Transparent on
 * the white — no card, no ring, no colored background.
 */
function TopColumn({ art, alt, label, onClick, imgSize, imgLift }) {
  return (
    <div className="flex flex-col items-center text-center">
      <img
        src={art}
        alt={alt}
        draggable={false}
        className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.15)] relative"
        style={{
          width: `${imgSize}px`,
          height: `${imgSize}px`,
          marginTop: `-${imgLift}px`,
          zIndex: 1,
        }}
      />
      {/* Button nests directly under the art — negative margin-top
          tucks it into the image's lower ~30px so it visually
          overlaps, and a higher z-index renders it above the art
          (spec: "above the art on the z-axis"). */}
      <button
        type="button"
        onClick={onClick}
        className="relative inline-flex items-center justify-center bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] px-6 py-3 rounded-full hover:bg-slate-800 transition-colors shadow-[0_6px_12px_rgba(0,0,0,0.25)]"
        style={{ marginTop: "-88px", zIndex: 3 }}
      >
        {label}
      </button>
    </div>
  );
}

/**
 * Mobile-only compact CTA. Rendered inside md:hidden wrappers; the
 * desktop flow uses TopColumn instead so the Guild / Trinket /
 * Creator trio shares one horizontal row.
 */
function CtaColumn({ art, alt, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-black text-white rounded-full pl-1.5 pr-5 py-1.5 hover:bg-slate-800 transition-colors"
    >
      <span className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        <img src={art} alt={alt} className="w-full h-full object-contain" draggable={false} />
      </span>
      <span className="font-black uppercase tracking-[0.18em] text-[11px] flex-1 text-left">
        {label}
      </span>
    </button>
  );
}

/**
 * Pricing row — four bundles left to right, `items-end` so the
 * "Best Deal" tile (which is taller) aligns to the same baseline
 * as the other three and overflows upward.
 */
/**
 * Pricing row — 2 regular cards | BEST DEAL center | 2 regular cards
 * on desktop. Cards align to `items-end` so the taller Best Deal
 * tile sits on the same baseline as the other four and overflows
 * upward toward Trinket.
 *
 * Mobile collapses to a 2-column grid (5 entries: 2 | 2 | 1 with
 * the last row's Best Deal centering itself).
 */
function PricingRow({ onPurchase, disabled }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 items-end">
      {SPICE_BUNDLES.map((b, i) => (
        <PricingCard
          key={b.id}
          bundle={b}
          disabled={disabled}
          onPurchase={() => onPurchase?.(b)}
          // Center the lone last item on mobile when there's an
          // odd number of bundles in a 2-column grid.
          // On mobile's 2-col grid the trailing odd card spans both
          // cells + caps its width so it centers as a single tile.
          // `md:mx-0` is critical: without it, `mx-auto` persists on
          // desktop and collapses the 5-col grid item to its
          // intrinsic width (the $100 card rendered narrower than
          // the other four), even though `md:max-w-none` removed
          // the width cap.
          extraClass={i === SPICE_BUNDLES.length - 1 && SPICE_BUNDLES.length % 2 === 1 ? "col-span-2 md:col-span-1 max-w-xs md:max-w-none mx-auto md:mx-0 md:w-full" : ""}
        />
      ))}
    </div>
  );
}

function PricingCard({ bundle, onPurchase, disabled, extraClass = "" }) {
  const isBest = !!bundle.best_deal;

  // Card shell — exact values from the brand spec. Regular cards
  // use the dark navy/slate gradient, Best Deal uses the teal
  // gradient. Everything (border, shadow, padding, radius, text
  // color) is applied inline so the cascade can't flatten it.
  // Best Deal palette pivots to Guildstew's brand orange (#ff5900)
  // while keeping the same shape language — inner-border glow,
  // 0 8px 32px shadow, 20px radius, 28px 20px padding, #1E2430
  // text. The shadow tint follows the gradient to a warm orange
  // so the hover pulse reads as the same hue.
  const base = isBest ? {
    background: "linear-gradient(145deg, #ff7a2a, #ff5900, #c43d00)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "20px",
    padding: "28px 20px",
    boxShadow: "0 8px 32px rgba(255, 89, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
    color: "#1E2430",
  } : {
    background: "linear-gradient(145deg, #1E2430, #2a3441, #1a1f2e)",
    border: "1px solid rgba(55, 242, 209, 0.25)",
    borderRadius: "20px",
    padding: "24px 16px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    color: "#e2e8f0",
  };

  // Hover deltas — the card lifts + scales, shadow deepens,
  // border brightens. Applied via inline onMouseEnter/Leave so the
  // exact rgba values land on the element.
  const hover = isBest ? {
    transform: "translateY(-6px) scale(1.05)",
    boxShadow: "0 16px 48px rgba(255, 89, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
    borderColor: "rgba(255, 255, 255, 0.5)",
  } : {
    transform: "translateY(-4px) scale(1.03)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(55, 242, 209, 0.5)",
  };

  // Shimmer pseudo-element — implemented as a nested absolute div
  // since React can't attach ::before styles without a CSS-in-JS lib.
  // Same 50% top gradient fade the spec calls for.
  const shimmerBg = isBest
    ? "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%)"
    : "linear-gradient(180deg, rgba(55, 242, 209, 0.06) 0%, transparent 100%)";

  // Header pair — [angled wheat icon] "Spice" — rendered in a
  // bright mustard yellow on every card regardless of background,
  // so the label reads as a consistent, unmissable ribbon across
  // the row.
  const headerColor = "#FBBF24";

  const bonusStyle = isBest ? {
    background: "rgba(30, 36, 48, 0.15)",
    color: "#1E2430",
    border: "1px solid rgba(30, 36, 48, 0.2)",
  } : {
    background: "rgba(55, 242, 209, 0.15)",
    color: "#37F2D1",
    border: "1px solid rgba(55, 242, 209, 0.25)",
  };

  // Purchase button — Best Deal gets a solid dark button (navy on
  // teal), regular cards get the teal-tinted glass button.
  // Regular-card buttons share identical dimensions so the 4
  // flanking cards look homogenous; the Best Deal button is a
  // noticeable step up in both padding and font size so it reads
  // as the featured CTA.
  const btnBase = isBest ? {
    background: "#1E2430",
    color: "#37F2D1",
    border: "1px solid rgba(30, 36, 48, 0.3)",
    borderRadius: "14px",
    padding: "14px 28px",
    fontWeight: 800,
    fontSize: "15px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
  } : {
    background: "rgba(55, 242, 209, 0.15)",
    color: "#37F2D1",
    border: "1px solid rgba(55, 242, 209, 0.35)",
    borderRadius: "12px",
    padding: "10px 24px",
    fontWeight: 700,
    fontSize: "13px",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
  };
  const btnHover = isBest
    ? { background: "#2a3441", borderColor: "rgba(30, 36, 48, 0.3)" }
    : { background: "rgba(55, 242, 209, 0.3)", borderColor: "rgba(55, 242, 209, 0.6)" };

  // Best Deal still reaches up 96px into the top row so Trinket
  // (z-5) appears to stand behind the card (z-10). Mobile's 2x2
  // grid keeps a flat baseline.
  return (
    <div
      className={`relative ${isBest ? "md:-mt-24" : ""} ${extraClass}`}
      style={{
        ...base,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s ease",
        zIndex: isBest ? 10 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = hover.transform;
        e.currentTarget.style.boxShadow = hover.boxShadow;
        e.currentTarget.style.borderColor = hover.borderColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = base.boxShadow;
        e.currentTarget.style.borderColor = isBest ? "rgba(255, 255, 255, 0.3)" : "rgba(55, 242, 209, 0.25)";
      }}
    >
      {/* Shimmer — top-half gradient fade (::before substitute). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: shimmerBg,
          borderRadius: "20px 20px 0 0",
          pointerEvents: "none",
        }}
      />

      {/* Content — relative so it layers above the shimmer. */}
      <div className="relative flex flex-col items-center text-center gap-3">
        {isBest && (
          <span style={{
            background: "#f8a47c",
            color: "#1E2430",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "4px 16px",
            borderRadius: "20px",
          }}>
            BEST DEAL
          </span>
        )}

        {/* Header — what you're buying. Biggest text on the card. */}
        <div
          className="inline-flex items-center gap-2"
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: headerColor,
            lineHeight: 1,
          }}
        >
          <SpiceIcon
            size={30}
            color={headerColor}
            style={{ transform: "rotate(-18deg)", transformOrigin: "50% 60%" }}
          />
          Spice
        </div>

        {/* Amount — how much Spice. */}
        <p style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1, margin: 0 }}>
          {formatSpice(bundle.spice)}
        </p>

        {/* Price — what it costs. */}
        <p style={{ fontSize: "18px", fontWeight: 600, opacity: 0.85, lineHeight: 1, margin: 0 }}>
          ${bundle.price.toFixed(2)}
        </p>

        {/* Bonus pill. */}
        {bundle.bonus > 0 && (
          <span
            style={{
              ...bonusStyle,
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "20px",
            }}
          >
            +{formatSpice(bundle.bonus)} BONUS
          </span>
        )}

        {/* Purchase — uppercase, tracked, full-width. */}
        <button
          type="button"
          onClick={onPurchase}
          disabled={disabled}
          style={{ ...btnBase, opacity: disabled ? 0.6 : 1 }}
          onMouseEnter={(e) => {
            if (disabled) return;
            e.currentTarget.style.background   = btnHover.background;
            e.currentTarget.style.borderColor  = btnHover.borderColor;
          }}
          onMouseLeave={(e) => {
            if (disabled) return;
            e.currentTarget.style.background   = btnBase.background;
            e.currentTarget.style.borderColor  = isBest ? "rgba(30, 36, 48, 0.3)" : "rgba(55, 242, 209, 0.35)";
          }}
        >
          {disabled ? "Processing…" : "Purchase"}
        </button>
      </div>
    </div>
  );
}
