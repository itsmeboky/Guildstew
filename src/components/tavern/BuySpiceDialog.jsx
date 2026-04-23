import React, { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  // tavern_items rows. The popup itself does NOT show the user's
  // current Spice balance — that lives on the sidebar / Tavern page
  // and animates after a successful purchase (see step 8).
  const { data: listingCount = 0 } = useQuery({
    queryKey: ["buySpiceListingCount", user?.id],
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

  const inGuild = !!sub?.isGuildMember || !!sub?.isGuildOwner || !!sub?.guildOwnerId;
  const isCreator = listingCount > 0;

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
    // Existing creators (anyone with at least one tavern_items row)
    // skip the marketing landing page and go straight to their
    // dashboard. Everyone else lands on /CreatorProgram which
    // explains the program, the tier economics, and the cashout
    // floor before sending them into the upload flow.
    navigate(createPageUrl(isCreator ? "CreatorDashboard" : "CreatorProgram"));
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

  // The dome's diameter controls how tall the arch is above the
  // rectangle. The rectangle's top padding matches `DOME_SIZE / 2`
  // so the content doesn't collide with the dome's lower half.
  // Mobile shrinks the dome so Trinket doesn't eat the viewport.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const DOME_SIZE = isMobile ? 180 : 240;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start md:items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl"
        style={{ marginTop: `${DOME_SIZE / 2}px` }}
      >
        {/* Dome — the white circle anchored on the top center of the
            rectangle. Half of it sits above the rectangle's edge so
            the combined silhouette reads as an arched top. */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
          style={{
            width: `${DOME_SIZE}px`,
            height: `${DOME_SIZE}px`,
            borderRadius: "50%",
            top: `-${DOME_SIZE / 2}px`,
          }}
        />

        {/* Main rectangle — flat bottom with rounded bottom corners,
            white background. Top padding clears the dome. */}
        <div
          className="relative bg-white rounded-b-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          style={{ paddingTop: `${DOME_SIZE / 2 + 16}px` }}
        >
          {/* Close button — top-right of the white area, not inside
              the dome (so it doesn't overlap Trinket). */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-slate-700 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="px-5 md:px-10 pb-6 md:pb-8">
            <DomeSlot />

            {/* Desktop: CTAs flank an empty center column so Trinket
                in the dome reads as floating directly above the
                pricing row's Best Deal card. Mobile: single column
                with pricing first, then compact CTA pills. The
                popup intentionally never shows the user's Spice
                balance — that's the sidebar's job. */}
            <div className="mt-6 md:mt-12 grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr] gap-4 md:gap-6 items-start">
              <div className="order-2 md:order-1">
                <CtaColumn
                  art={GUILD_ART}
                  alt="Guild signup"
                  label={inGuild ? "GUILD HUB" : "CREATE A GUILD"}
                  onClick={goGuild}
                />
              </div>
              <div className="order-3 md:order-3">
                <CtaColumn
                  art={CREATOR_ART}
                  alt="Creator program"
                  label={isCreator ? "CREATOR DASHBOARD" : "BECOME A CREATOR"}
                  onClick={goCreator}
                />
              </div>
              <div className="order-1 md:order-4 md:col-span-3 md:mt-4">
                <PricingRow
                  onPurchase={(bundle) => purchase.mutate(bundle)}
                  disabled={purchase.isPending || !user?.id}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dome content — Trinket GIF overlapping the dome silhouette.
 * The GIF is positioned absolutely relative to the main rectangle so
 * its feet rest just inside the dome's lower half; the character
 * reads as peeking out over the arch.
 */
/**
 * Trinket GIF — perched in the dome directly above the popup's
 * horizontal center, which is where the BEST DEAL card lands in the
 * 5-card row (cards 1-2-3-4-5; card 3 is dead-center). z-30 keeps
 * her above the cards and above the popup's white surface so she
 * appears to "sit" on top of the Best Deal card's raised silhouette.
 */
function DomeSlot() {
  return (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-[160px] md:-top-[210px] w-[170px] md:w-[240px] h-[190px] md:h-[260px] flex items-end justify-center z-30">
      <img
        src={TRINKET_GIF}
        alt="Trinket"
        className="w-full h-auto object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.3)]"
        draggable={false}
      />
    </div>
  );
}

/**
 * Left / right column layout.
 *
 *   Desktop (≥ md): the transparent PNG art floats directly on the
 *     popup's white surface — no card, no ring, no colored
 *     background — with a black pill button stacked below. Matches
 *     the mockup where the CTA visually feels like a sticker on the
 *     paper rather than its own panel.
 *   Mobile (< md): compact horizontal pill with a small thumbnail
 *     on the left and the label text on the right, so the two CTAs
 *     don't eat vertical real estate on a phone.
 *
 * Both variants share the same click handler + label / art props.
 */
function CtaColumn({ art, alt, label, onClick }) {
  return (
    <>
      {/* Mobile compact */}
      <button
        type="button"
        onClick={onClick}
        className="md:hidden w-full flex items-center gap-3 bg-black text-white rounded-full pl-1.5 pr-5 py-1.5 hover:bg-slate-800 transition-colors"
      >
        <span className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <img src={art} alt={alt} className="w-full h-full object-contain" draggable={false} />
        </span>
        <span className="font-black uppercase tracking-[0.18em] text-[11px] flex-1 text-left">
          {label}
        </span>
      </button>

      {/* Desktop stacked — fully transparent on the popup's white. */}
      <div className="hidden md:flex flex-col items-center text-center gap-3">
        <div className="w-[150px] h-[150px] lg:w-[170px] lg:h-[170px]">
          <img
            src={art}
            alt={alt}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center justify-center bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] px-5 py-2.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          {label}
        </button>
      </div>
    </>
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
          extraClass={i === SPICE_BUNDLES.length - 1 && SPICE_BUNDLES.length % 2 === 1 ? "col-span-2 md:col-span-1 max-w-xs mx-auto md:max-w-none" : ""}
        />
      ))}
    </div>
  );
}

function PricingCard({ bundle, onPurchase, disabled, extraClass = "" }) {
  const isBest = !!bundle.best_deal;
  const baseColor = isBest ? "#37F2D1" : "#7C3AED";
  const textColor = isBest ? "#1E2430" : "#FFFFFF";
  const buttonBg  = isBest ? "bg-[#1E2430] text-[#37F2D1]" : "bg-white text-[#7C3AED]";

  return (
    <div
      className={`relative rounded-2xl shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-transform ${
        isBest ? "md:-translate-y-8" : ""
      } ${extraClass}`}
      style={{ backgroundColor: baseColor, color: textColor }}
    >
      {isBest && (
        <span className="absolute left-1/2 -translate-x-1/2 -top-3 inline-block text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full bg-black text-[#37F2D1] shadow">
          Best Deal
        </span>
      )}
      <div className={`px-4 pt-5 pb-4 flex flex-col items-center text-center ${isBest ? "pt-7 pb-6" : ""}`}>
        <p className={`font-black leading-none ${isBest ? "text-4xl" : "text-3xl"}`}>
          ${bundle.price.toFixed(2)}
        </p>
        <div className={`mt-3 inline-flex items-center gap-1.5 font-black ${isBest ? "text-2xl" : "text-xl"}`}>
          <SpiceIcon size={isBest ? 22 : 20} color={textColor} />
          {formatSpice(bundle.spice)}
        </div>
        {bundle.bonus > 0 && (
          <span
            className="mt-2 inline-block text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5"
            style={{
              backgroundColor: isBest ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)",
              color: textColor,
            }}
          >
            +{formatSpice(bundle.bonus)} bonus
          </span>
        )}
        <button
          type="button"
          onClick={onPurchase}
          disabled={disabled}
          className={`mt-4 w-full text-[11px] font-black uppercase tracking-[0.18em] rounded-full py-2 ${buttonBg} hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {disabled ? "Processing…" : "Purchase"}
        </button>
      </div>
    </div>
  );
}
