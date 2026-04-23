import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, Upload, Wallet, BarChart3, Palette, Dices, Image as ImageIcon,
  Headphones, ArrowRight, Coins, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { CREAM } from "@/pages/Forums";
import {
  formatSpice, UPLOAD_FEES, CREATOR_SPLITS, MIN_CASHOUT, MIN_ITEM_PRICE,
} from "@/config/spiceConfig";

/**
 * /CreatorProgram — marketing landing page for the "Become a Creator"
 * CTA on the Buy Spice popup. Explains what creators can publish to
 * the Tavern, the per-tier upload-fee + revenue-split economics, and
 * the cashout floor before sending people into the upload flow.
 *
 * Uses the same creamsicle palette as /Forums so the marketing
 * surfaces feel consistent (warm, friendly, distinct from the tool
 * pages which run on the dark navy chrome).
 */
const CONTENT_TYPES = [
  { icon: Dices,      label: "Dice Skins",      hint: "Custom dice sets with paint, materials, lighting." },
  { icon: Palette,    label: "UI Themes",       hint: "Reskin the entire app for everyone who buys." },
  { icon: ImageIcon,  label: "Portraits",       hint: "Character art packs and avatar collections." },
  { icon: Headphones, label: "Sound Packs",     hint: "Combat SFX, ambient loops, music beds." },
  { icon: Sparkles,   label: "Profile Banners", hint: "Background art for player profiles." },
];

const TIER_ROWS = [
  {
    tier: "Free",
    upload: UPLOAD_FEES.free,
    splitPlatform: CREATOR_SPLITS.free[0],
    splitCreator:  CREATOR_SPLITS.free[1],
    note: "Get started with no subscription.",
  },
  {
    tier: "Adventurer",
    upload: UPLOAD_FEES.adventurer,
    splitPlatform: CREATOR_SPLITS.adventurer[0],
    splitCreator:  CREATOR_SPLITS.adventurer[1],
    note: "Lower fee + better split for hobbyists.",
  },
  {
    tier: "Veteran +",
    upload: UPLOAD_FEES.veteran,
    splitPlatform: CREATOR_SPLITS.veteran[0],
    splitCreator:  CREATOR_SPLITS.veteran[1],
    note: "No upload fee, top split.",
    highlight: true,
  },
];

export default function CreatorProgram() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If the player already has Tavern listings, the CTA jumps to
  // their dashboard instead of dropping them into the upload flow
  // for a first listing. Same gate the Buy Spice popup uses.
  const { data: listingCount = 0 } = useQuery({
    queryKey: ["creatorProgramListingCount", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("tavern_items")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });
  const isCreator = listingCount > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM.pageBg, color: CREAM.textPrimary }}>
      {/* Hero */}
      <header
        className="px-6 md:px-12 pt-12 pb-16"
        style={{ background: `linear-gradient(135deg, ${CREAM.gradStart} 0%, ${CREAM.gradEnd} 100%)` }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: CREAM.textPrimary, opacity: 0.7 }}>
            Guildstew Tavern
          </p>
          <h1 className="text-3xl md:text-5xl font-black mt-2 leading-tight">
            Sell your art to the table.
          </h1>
          <p className="text-base md:text-lg mt-3 max-w-2xl" style={{ opacity: 0.85 }}>
            Upload dice skins, UI themes, portrait packs, banners, and sound
            packs to the Tavern. You set the price, you keep most of the
            sale. We handle the storefront, payments, and cashouts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => navigate(createPageUrl(isCreator ? "CreatorDashboard" : "TheTavern"))}
              className="font-black uppercase tracking-[0.2em]"
              style={{ backgroundColor: CREAM.textPrimary, color: "#FFFFFF" }}
            >
              {isCreator ? "Open Creator Dashboard" : "Start Creating"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link
              to={createPageUrl("TheTavern")}
              className="inline-flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs px-4 py-2 rounded-md border"
              style={{ borderColor: CREAM.textPrimary, color: CREAM.textPrimary }}
            >
              Browse the Tavern
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-12">
        {/* What you can sell */}
        <Section title="What you can sell" subtitle="Every category gets a dedicated picker on the storefront.">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {CONTENT_TYPES.map(({ icon: Icon, label, hint }) => (
              <Card key={label}>
                <div className="flex items-center gap-2 font-black">
                  <Icon className="w-5 h-5" style={{ color: CREAM.accent }} />
                  {label}
                </div>
                <p className="text-sm mt-1" style={{ color: CREAM.textMuted }}>{hint}</p>
              </Card>
            ))}
          </div>
        </Section>

        {/* Earning model */}
        <Section title="You set the price, you earn the Spice" subtitle="Buyers pay in Spice; we pay you in Spice.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <div className="flex items-center gap-2 font-black">
                <Coins className="w-5 h-5" style={{ color: CREAM.accent }} />
                Listing minimum
              </div>
              <p className="text-2xl font-black mt-1 inline-flex items-center gap-1.5">
                <SpiceIcon size={20} color={CREAM.accent} />
                {formatSpice(MIN_ITEM_PRICE)}
              </p>
              <p className="text-xs" style={{ color: CREAM.textMuted }}>Per listing — about $2.50 USD.</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 font-black">
                <Wallet className="w-5 h-5" style={{ color: CREAM.accent }} />
                Cashout floor
              </div>
              <p className="text-2xl font-black mt-1 inline-flex items-center gap-1.5">
                <SpiceIcon size={20} color={CREAM.accent} />
                {formatSpice(MIN_CASHOUT)}
              </p>
              <p className="text-xs" style={{ color: CREAM.textMuted }}>About $50 USD. Stripe fee deducted on payout.</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 font-black">
                <BarChart3 className="w-5 h-5" style={{ color: CREAM.accent }} />
                Analytics included
              </div>
              <p className="text-sm mt-2" style={{ color: CREAM.textMuted }}>
                Real-time sales, applied-cosmetic counts, and per-listing
                conversion in your Creator Dashboard.
              </p>
            </Card>
          </div>
        </Section>

        {/* Tier economics */}
        <Section title="Tier economics" subtitle="Subscriptions lower the fee and raise your cut.">
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: CREAM.cardBorder, backgroundColor: CREAM.card }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: CREAM.gradEnd, color: CREAM.textPrimary }}>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">Tier</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">Upload Fee</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">Split (Platform / Creator)</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ROWS.map((row) => (
                  <tr
                    key={row.tier}
                    className="border-t"
                    style={{ borderColor: CREAM.cardBorder, backgroundColor: row.highlight ? "rgba(248,164,124,0.12)" : "transparent" }}
                  >
                    <td className="px-4 py-3 font-black">
                      <span className="inline-flex items-center gap-1.5">
                        {row.highlight && <ShieldCheck className="w-4 h-4" style={{ color: CREAM.accent }} />}
                        {row.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.upload === 0 ? (
                        <span className="font-black" style={{ color: CREAM.accent }}>Waived</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <SpiceIcon size={14} color={CREAM.textPrimary} />
                          {formatSpice(row.upload)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-black">{row.splitPlatform}%</span>
                      <span className="opacity-60"> / </span>
                      <span className="font-black" style={{ color: CREAM.accent }}>{row.splitCreator}%</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: CREAM.textMuted }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Cashout */}
        <Section title="Cashing out" subtitle="Convert your earnings to USD via Stripe.">
          <Card>
            <p className="text-sm leading-relaxed">
              Once you've earned at least <strong>{formatSpice(MIN_CASHOUT)} Spice</strong>{" "}
              ($50), submit a cashout request from the Creator Dashboard. We
              pay out via Stripe; the Stripe processing fee is deducted from
              your payout. There's no platform fee on top — what's left
              after Stripe is yours.
            </p>
          </Card>
        </Section>

        {/* Final CTA */}
        <div className="text-center py-6">
          <Button
            onClick={() => navigate(createPageUrl(isCreator ? "CreatorDashboard" : "TheTavern"))}
            className="font-black uppercase tracking-[0.25em] px-8 py-4 text-sm"
            style={{ backgroundColor: CREAM.textPrimary, color: "#FFFFFF" }}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isCreator ? "Open Creator Dashboard" : "Start Creating"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-black">{title}</h2>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: CREAM.textMuted }}>{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Card({ children }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}
    >
      {children}
    </div>
  );
}
