import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ScrollText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * /VirtualCurrencyPolicy — placeholder surface linked from the
 * SpiceEmporium popup ("View Virtual Currency Policy →").
 *
 * Eventual contents:
 *   - How Spice works as an in-app virtual currency
 *   - Purchase terms (Stripe, no expiration on unspent Spice)
 *   - Refund policy for unspent vs. spent Spice
 *   - Creator cashout terms + minimum threshold + Stripe fee
 *   - No secondary market / no transfers clause
 *
 * The page renders today with a dark-theme "Coming Soon" card so
 * the link in the emporium has a real destination until the
 * legal copy lands.
 */
export default function VirtualCurrencyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050816] text-slate-200">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div
          className="rounded-2xl p-8 md:p-12 text-center border"
          style={{
            backgroundColor: "#1E2430",
            borderColor: "rgba(245,158,11,0.25)",
            boxShadow: "0 0 40px rgba(245,158,11,0.05)",
          }}
        >
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
            style={{
              backgroundColor: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.35)",
            }}
          >
            <ScrollText className="w-8 h-8 text-[#f59e0b]" />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white">
            Virtual Currency Policy
          </h1>
          <p className="text-sm text-[#f8a47c] font-bold uppercase tracking-[0.25em] mt-2 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Coming Soon
          </p>
          <p className="text-sm text-slate-400 mt-4 max-w-xl mx-auto leading-relaxed">
            The full policy is being drafted. When it lands it will
            cover how Spice works as Guildstew's in-app currency,
            purchase and refund terms for unspent Spice, and the
            cashout process for creators earning Spice through the
            Tavern marketplace.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Until then, reach out via the support ticket flow for
            any questions.
          </p>

          <div className="pt-6">
            <Button
              onClick={() => navigate(-1)}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              Return to Guildstew
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
