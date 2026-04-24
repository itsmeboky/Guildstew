import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Upload, Wallet, Palette, Dices, Image as ImageIcon,
  Headphones, ArrowRight, Coins, ShieldCheck, PenTool, MousePointer2,
  Zap, Flame, Star, Trophy, Crown, Users, Gift, MessageSquare,
  Calendar, ChefHat, Award, Medal, LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import {
  Band, SectionTitle, MarketingCard, CREAM,
} from "@/components/marketing/MarketingBand";
import {
  formatSpice, UPLOAD_FEES, CREATOR_SPLITS, MIN_CASHOUT, MIN_ITEM_PRICE,
} from "@/config/spiceConfig";
import { ensureReferralCode } from "@/lib/creatorMilestones";

/**
 * /CreatorProgram — marketing landing page for the Tavern creator
 * program. Warm creamsicle palette (matches /Forums and the Tavern
 * hero) so the marketing surfaces read as friendly / consumer /
 * outside-the-tool, distinct from the dark navy campaign chrome.
 *
 * Sections top-to-bottom:
 *   1. Hero — headline + art + primary CTA
 *   2. How It Works — 3-step flow (Create / Publish / Earn)
 *   3. What You Earn — tier-split table + cashout minimum
 *   4. What You Can Create — cosmetic types grid
 *   5. Early Creator Rewards — time-limited launch incentives
 *   6. Chef's Choice — monthly spotlight program
 *   7. Creator Milestones — sales-count progression
 *   8. Community — Discord invite + referral bonus
 *   9. Bottom CTA — Start Creating / Dashboard
 */

const CREATOR_ART = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/joincreatorprogram.png";
const DISCORD_URL = "https://discord.gg/TK2s88fzSQ";

const HOW_IT_WORKS = [
  {
    icon: PenTool,
    title: "Create",
    body: "Design dice skins, UI themes, portraits, sound packs, and more using our built-in creator tools. No coding required.",
  },
  {
    icon: Upload,
    title: "Publish",
    body: "List your creations in The Tavern. Set your own price. Reach thousands of players.",
  },
  {
    icon: Coins,
    title: "Earn",
    body: "Earn Spice on every sale. Cash out to real money when you're ready.",
  },
];

const CONTENT_TYPES = [
  { icon: Dices,          label: "Dice Skins",        hint: "Paint custom 3D dice with our in-app creator or upload your own textures." },
  { icon: Palette,        label: "UI Themes",         hint: "Design full color schemes and backgrounds that transform the entire app." },
  { icon: ImageIcon,      label: "Character Portraits", hint: "Create portrait packs for players to use on their characters." },
  { icon: Headphones,     label: "Sound Packs",       hint: "Replace dice rolls, combat sounds, and notifications with your audio." },
  { icon: Sparkles,       label: "Profile Banners",   hint: "Design banners players display on their profiles." },
  { icon: MousePointer2,  label: "Cursor Sets",       hint: "Custom cursor designs that match UI themes." },
  { icon: Zap,            label: "Animations",        hint: "Critical hit effects, level-up celebrations, and combat flair." },
];

const TIER_ROWS = [
  {
    tier: "Free",
    priceLabel: "$0 / mo",
    upload: UPLOAD_FEES.free,
    splitPlatform: CREATOR_SPLITS.free[0],
    splitCreator:  CREATOR_SPLITS.free[1],
  },
  {
    tier: "Adventurer",
    priceLabel: "$6.99 / mo",
    upload: UPLOAD_FEES.adventurer,
    splitPlatform: CREATOR_SPLITS.adventurer[0],
    splitCreator:  CREATOR_SPLITS.adventurer[1],
  },
  {
    tier: "Veteran",
    priceLabel: "$12.99 / mo",
    upload: UPLOAD_FEES.veteran,
    splitPlatform: CREATOR_SPLITS.veteran[0],
    splitCreator:  CREATOR_SPLITS.veteran[1],
    highlight: true,
  },
  {
    tier: "Guild",
    priceLabel: "$34.99 / mo",
    upload: UPLOAD_FEES.guild,
    splitPlatform: CREATOR_SPLITS.guild[0],
    splitCreator:  CREATOR_SPLITS.guild[1],
  },
];

const MILESTONES = [
  { sales: 1,   title: "Creator",             description: "Unlocked on your first sale.", icon: Medal },
  { sales: 10,  title: "Rising Creator",      description: "The algorithm starts to notice.", icon: Star },
  { sales: 50,  title: "Established Creator", description: "You've built a following.", icon: Award },
  { sales: 100, title: "Master Creator",      description: "Featured placement in The Tavern for a week.", icon: Trophy },
  { sales: 500, title: "Legendary Creator",   description: "Collaboration opportunities with Guildstew.", icon: Crown },
];

export default function CreatorProgram() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Existing creators (any tavern_items row) skip the marketing
  // sections mentally and the CTAs re-point them at the dashboard.
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

  // Any signed-in visitor to this page gets a referral code
  // assigned if they don't already have one, so the "invite
  // another creator" bonus in the community section has something
  // to dangle. Non-fatal; silent on failure.
  useEffect(() => {
    if (user?.id) {
      ensureReferralCode(user.id).catch(() => { /* non-fatal */ });
    }
  }, [user?.id]);

  const startCreating = () => {
    navigate(createPageUrl(isCreator ? "CreatorDashboard" : "TheTavern"));
  };

  return (
    <div className="min-h-screen" style={{ color: CREAM.textPrimary, backgroundColor: "#FFF8F3" }}>
      {/* 1. Hero — white background, text left, image right. */}
      <header className="px-6 md:px-12 pt-12 pb-16" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: CREAM.accent }}>
              Guildstew Tavern
            </p>
            <h1 className="text-4xl md:text-6xl font-black mt-2 leading-[1.05]" style={{ color: "#1E2430" }}>
              Become a Guildstew Creator
            </h1>
            <p className="text-lg md:text-xl mt-4 max-w-xl" style={{ color: CREAM.textMuted }}>
              Design cosmetics. Build a following. Earn real money.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={startCreating}
                className="font-black uppercase tracking-[0.2em] px-6 py-5 text-sm"
                style={{ backgroundColor: CREAM.accent, color: CREAM.textPrimary }}
              >
                {isCreator ? "Open Creator Dashboard" : "Start Creating"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              src={CREATOR_ART}
              alt="Creator program"
              className="w-full max-w-[420px] md:max-w-[480px] drop-shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
              draggable={false}
            />
          </div>
        </div>
      </header>

      {/* Sections alternate white / cream / peach bands for rhythm.
          Each band is full-bleed; content is centered inside. */}
      <Band bg="#FFF8F3">
        <Section title="How it works" subtitle="Three steps from idea to revenue.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <Card key={step.title} className="relative">
                <span
                  className="absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shadow"
                  style={{ backgroundColor: CREAM.accent, color: "#FFFFFF" }}
                >
                  {i + 1}
                </span>
                <div className="flex items-center gap-2 font-black text-lg">
                  <step.icon className="w-5 h-5" style={{ color: CREAM.accent }} />
                  {step.title}
                </div>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: CREAM.textMuted }}>
                  {step.body}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      </Band>

      <Band bg="#FFF0E8">
        <Section title="What you earn" subtitle="Every tier unlocks a better split.">
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: CREAM.cardBorder, backgroundColor: CREAM.card }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: CREAM.gradEnd, color: CREAM.textPrimary }}>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">Tier</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">Price</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">Upload Fee</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-[11px]">You Keep</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ROWS.map((row) => (
                  <tr
                    key={row.tier}
                    className="border-t"
                    style={{
                      borderColor: CREAM.cardBorder,
                      backgroundColor: row.highlight ? "rgba(248,164,124,0.12)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3 font-black">
                      <span className="inline-flex items-center gap-1.5">
                        {row.highlight && <ShieldCheck className="w-4 h-4" style={{ color: CREAM.accent }} />}
                        {row.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: CREAM.textMuted }}>{row.priceLabel}</td>
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
                      <span className="font-black text-lg" style={{ color: CREAM.accent }}>{row.splitCreator}%</span>
                      <span className="opacity-50 text-xs"> · platform keeps {row.splitPlatform}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <Card>
              <div className="flex items-center gap-2 font-black">
                <Wallet className="w-5 h-5" style={{ color: CREAM.accent }} />
                Cashout floor
              </div>
              <p className="text-2xl font-black mt-1 inline-flex items-center gap-1.5">
                <SpiceIcon size={20} color={CREAM.accent} />
                {formatSpice(MIN_CASHOUT)}
              </p>
              <p className="text-xs" style={{ color: CREAM.textMuted }}>
                ~$50 USD minimum. You pay the Stripe processing fee on cashouts.
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 font-black">
                <Coins className="w-5 h-5" style={{ color: CREAM.accent }} />
                Listing minimum
              </div>
              <p className="text-2xl font-black mt-1 inline-flex items-center gap-1.5">
                <SpiceIcon size={20} color={CREAM.accent} />
                {formatSpice(MIN_ITEM_PRICE)}
              </p>
              <p className="text-xs" style={{ color: CREAM.textMuted }}>
                Per listing (about $2.50 USD). The more you sell, the more you earn — upgrading your tier means bigger cuts on every sale.
              </p>
            </Card>
          </div>
        </Section>
      </Band>

      <Band bg="#FFF8F3">
        <Section title="What you can create" subtitle="Every category gets a dedicated storefront picker.">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
      </Band>

      <Band bg="#FFF0E8">
        <Section
          title="Early Creator Rewards"
          subtitle="Limited-time perks for the first wave of Guildstew creators."
          pill="Limited time"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card accent="gold">
              <div className="flex items-center gap-2 font-black">
                <Flame className="w-5 h-5" style={{ color: "#D97706" }} />
                Pioneer Creator Badge
              </div>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: CREAM.textMuted }}>
                Be one of the first 100 creators to list an item and earn the Pioneer Creator badge — a permanent mark of honor that will never be available again.
              </p>
            </Card>
            <Card accent="gold">
              <div className="flex items-center gap-2 font-black">
                <Gift className="w-5 h-5" style={{ color: "#D97706" }} />
                Zero Upload Fees
              </div>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: CREAM.textMuted }}>
                For our first 3 months, all upload fees are waived for every creator regardless of tier. List as many creations as you want, completely free.
              </p>
            </Card>
            <Card accent="gold">
              <div className="flex items-center gap-2 font-black">
                <SpiceIcon size={20} color="#D97706" />
                Creator Starter Pack
              </div>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: CREAM.textMuted }}>
                List your first item and receive 500 Spice free — enough to start shopping in The Tavern yourself.
              </p>
            </Card>
            <Card accent="gold">
              <div className="flex items-center gap-2 font-black">
                <Calendar className="w-5 h-5" style={{ color: "#D97706" }} />
                Featured Fridays
              </div>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: CREAM.textMuted }}>
                Every Friday, we spotlight one creator's work across our social media, Discord, and homepage. Great work gets seen.
              </p>
            </Card>
          </div>
        </Section>
      </Band>

      <Band bg="#FFF8F3">
        <Section title="Chef's Choice — monthly creator spotlight">
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <Card>
              <p className="text-sm leading-relaxed" style={{ color: CREAM.textMuted }}>
                Every month, our team selects the top 10 creator items and awards them the
                <strong style={{ color: CREAM.textPrimary }}> Chef's Choice </strong>
                badge — the Aetherian stamp of quality. Chef's Choice items get premium placement in The Tavern, a featured blog post, and bragging rights.
              </p>
            </Card>
            <div
              className="w-36 h-36 rounded-full flex flex-col items-center justify-center mx-auto shadow-xl"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${CREAM.gradStart}, ${CREAM.accent})`,
                border: `4px solid ${CREAM.card}`,
                boxShadow: `0 0 0 4px ${CREAM.accent}, 0 20px 30px rgba(0,0,0,0.18)`,
              }}
            >
              <ChefHat className="w-10 h-10 text-white" />
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white mt-1">Chef's Choice</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Aetherian</span>
            </div>
          </div>
        </Section>
      </Band>

      <Band bg="#FFF0E8">
        <Section title="Grow your reputation" subtitle="Every sale moves you up the ladder.">
          <div className="relative">
            {/* Dashed connector drawn behind the tiles on desktop. */}
            <div className="hidden md:block absolute left-0 right-0 top-9 h-0 border-t-2 border-dashed" style={{ borderColor: CREAM.cardBorder }} />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
              {MILESTONES.map((m) => (
                <Card key={m.title} className="text-center">
                  <div
                    className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2 shadow"
                    style={{ backgroundColor: CREAM.gradEnd, color: CREAM.textPrimary }}
                  >
                    <m.icon className="w-7 h-7" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: CREAM.accent }}>
                    {m.sales === 1 ? "1st sale" : `${m.sales} sales`}
                  </p>
                  <p className="text-sm font-black mt-0.5">{m.title}</p>
                  <p className="text-[11px] mt-1 leading-snug" style={{ color: CREAM.textMuted }}>
                    {m.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </Section>
      </Band>

      <Band bg="#FFF8F3">
        <Section title="Join the creator community">
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <div className="flex items-center gap-2 font-black">
                <MessageSquare className="w-5 h-5" style={{ color: CREAM.accent }} />
                Creator Discord
              </div>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: CREAM.textMuted }}>
                Connect with other creators, share works-in-progress, get feedback, and stay ahead of new features.
              </p>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 font-black uppercase tracking-[0.18em] text-[11px] px-4 py-2 rounded-full"
                style={{ backgroundColor: CREAM.textPrimary, color: "#FFFFFF" }}
              >
                <Users className="w-3 h-3" /> Open Discord
              </a>
            </Card>
            <Card>
              <div className="flex items-center gap-2 font-black">
                <Trophy className="w-5 h-5" style={{ color: CREAM.accent }} />
                Contests & Referrals
              </div>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: CREAM.textMuted }}>
                Monthly creator contests with Spice prizes and Chef's Choice badges.
              </p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: CREAM.textMuted }}>
                <span className="inline-flex items-center gap-1 font-black" style={{ color: CREAM.textPrimary }}>
                  <LinkIcon className="w-3.5 h-3.5" /> Referral bonus
                </span>{" "}
                invite another creator and you BOTH get 1,000 Spice when they list their first item.
              </p>
            </Card>
          </div>
        </Section>
      </Band>

      {/* Bottom CTA — white band so the "Start Creating" teal
          button reads as a final focal point. */}
      <Band bg="#FFFFFF">
        <div className="text-center py-6 space-y-3">
          <Button
            onClick={startCreating}
            className="font-black uppercase tracking-[0.25em] px-10 py-5 text-sm"
            style={{ backgroundColor: "#37F2D1", color: "#050816" }}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isCreator ? "Open Creator Dashboard" : "Start Creating"}
          </Button>
          {!isCreator && (
            <p className="text-xs" style={{ color: CREAM.textMuted }}>
              Already creating?{" "}
              <button
                type="button"
                onClick={() => navigate(createPageUrl("CreatorDashboard"))}
                className="underline font-bold"
                style={{ color: CREAM.accent }}
              >
                Go to your Creator Dashboard
              </button>
            </p>
          )}
        </div>
      </Band>
    </div>
  );
}

// Thin adapters — the real primitives live in
// @/components/marketing/MarketingBand so /Guild and /CreatorProgram
// render with identical DOM + styling.
function Section({ title, subtitle, pill, children }) {
  return (
    <div className="space-y-4">
      <SectionTitle title={title} subtitle={subtitle} pill={pill} />
      {children}
    </div>
  );
}

const Card = MarketingCard;
