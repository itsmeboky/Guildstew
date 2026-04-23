import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { useAuth } from "@/lib/AuthContext";
import { getWalletBalance } from "@/lib/spiceWallet";
import { formatSpice } from "@/config/spiceConfig";

const TRINKET_GIF = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/TrinketSpiceSignUp.gif";

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

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id && open,
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

  if (!open) return null;

  // The dome's diameter controls how tall the arch is above the
  // rectangle. The rectangle's top padding matches `DOME_SIZE / 2`
  // so the content doesn't collide with the dome's lower half.
  const DOME_SIZE = 240;

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

          <div className="px-6 md:px-10 pb-8">
            <DomeSlot />

            {/* Body grid — left CTA, center column (balance beneath
                Trinket), right CTA. Steps 3-5 replace the placeholders. */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr] gap-6 items-start">
              <LeftCtaSlot />
              <BalanceBlock balance={wallet?.balance || 0} />
              <RightCtaSlot />
            </div>

            <div className="mt-6">
              <PricingRowSlot />
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
function DomeSlot() {
  return (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-[230px] md:-top-[230px] w-[220px] md:w-[240px] h-[240px] md:h-[260px] flex items-end justify-center">
      <img
        src={TRINKET_GIF}
        alt="Trinket"
        className="w-full h-auto object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
        draggable={false}
      />
    </div>
  );
}

function BalanceBlock({ balance }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-bold">
        Your Spice
      </p>
      <p className="text-3xl font-black text-slate-900 flex items-center gap-2">
        <SpiceIcon size={28} color="#b45309" />
        {formatSpice(balance)}
      </p>
      <p className="text-[11px] text-slate-500">
        Never expires · spend on Tavern cosmetics
      </p>
    </div>
  );
}

function LeftCtaSlot() { return <div className="hidden md:block" />; }
function RightCtaSlot(){ return <div className="hidden md:block" />; }
function PricingRowSlot() {
  return (
    <p className="text-center text-xs text-slate-500 italic">
      Pricing options land in step 5.
    </p>
  );
}
