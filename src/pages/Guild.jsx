import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Crown, Sparkles, ArrowRight, Users, Ban, Settings as SettingsIcon,
  Shield, Package, TrendingUp, Wallet,
} from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Band, SectionTitle, CREAM } from "@/components/marketing/MarketingBand";
import { useSubscription } from "@/lib/SubscriptionContext";
import { listGuildMembers } from "@/api/billingClient";
import { getGuildWalletBalance } from "@/lib/spiceWallet";
import { formatSpice } from "@/config/spiceConfig";
import { createPageUrl } from "@/utils";
import { displayName, displayInitial } from "@/utils/displayName";

/**
 * /guild
 *
 * Two faces: members see the Guild Hub (members, wallet, activity,
 * settings). Non-members see the golden "Join a Guild" CTA that
 * lives in `GuildJoinCTA` (step 3). Split here so both paths live
 * in one route.
 */
export default function Guild() {
  const sub = useSubscription();
  const inGuild = !!sub.guildOwnerId || sub.isGuildMember || sub.isGuildOwner;
  return inGuild ? <GuildHub /> : <GuildJoinCTA />;
}

function GuildHub() {
  const { user } = useAuth();
  const sub = useSubscription();
  const guildOwnerId = sub.guildOwnerId || (sub.isGuildOwner ? user?.id : null);
  const isLeader = sub.isGuildOwner || user?.id === guildOwnerId;

  // Guild membership rows come from the `subscriptions` table via
  // the billingClient helper — it already knows which shape it needs.
  const { data: memberships = [] } = useQuery({
    queryKey: ["guildMembers", guildOwnerId],
    queryFn: () => listGuildMembers(guildOwnerId),
    enabled: !!guildOwnerId,
  });

  const memberIds = useMemo(() => {
    const ids = new Set();
    if (guildOwnerId) ids.add(guildOwnerId);
    for (const row of memberships) {
      if (row.user_id) ids.add(row.user_id);
    }
    return Array.from(ids);
  }, [memberships, guildOwnerId]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["guildMemberProfiles", memberIds.sort().join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, avatar_url, subscription_tier")
        .in("user_id", memberIds);
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const { data: wallet } = useQuery({
    queryKey: ["guildSpiceWallet", guildOwnerId],
    queryFn: () => getGuildWalletBalance(guildOwnerId),
    enabled: !!guildOwnerId,
  });

  // Recent wallet activity — pulled from the shared ledger, filtered
  // by this guild's id. Anything the guild wallet has touched
  // (credit / debit) shows up.
  const { data: walletActivity = [] } = useQuery({
    queryKey: ["guildLedger", guildOwnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("spice_transactions")
        .select("id, amount, balance_after, transaction_type, description, created_at")
        .eq("guild_id", guildOwnerId)
        .order("created_at", { ascending: false })
        .limit(15);
      return data || [];
    },
    enabled: !!guildOwnerId,
  });

  const { data: guildPurchases = [] } = useQuery({
    queryKey: ["guildPurchases", guildOwnerId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("tavern_purchases")
        .select("item_id, purchased_at, price_paid")
        .eq("guild_id", guildOwnerId)
        .order("purchased_at", { ascending: false })
        .limit(20);
      if (!rows?.length) return [];
      const ids = rows.map((r) => r.item_id);
      const { data: items } = await supabase
        .from("tavern_items")
        .select("id, name, preview_image_url, category")
        .in("id", ids);
      return rows.map((r) => ({
        ...r,
        item: (items || []).find((i) => i.id === r.item_id),
      }));
    },
    enabled: !!guildOwnerId,
  });

  const seats = 6;
  const memberCount = profiles.length;

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Guild banner */}
      <div
        className="w-full px-6 py-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(217,119,6,0.12) 60%, rgba(5,8,22,0.95) 100%)",
          borderBottom: "1px solid rgba(251,191,36,0.35)",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center shadow-[0_0_24px_rgba(251,191,36,0.25)]">
            <Crown className="w-10 h-10 text-amber-300" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-3xl md:text-4xl font-black text-amber-100" style={{ fontFamily: "'Cream', 'Inter', sans-serif" }}>
              Your Guild
            </h1>
            <p className="text-xs uppercase tracking-widest font-bold text-amber-300/80 mt-1">
              <Users className="w-3 h-3 inline-block mr-1" />
              {memberCount}/{seats} members · Guild tier
            </p>
            {isLeader && (
              <p className="text-[11px] text-amber-200/70 mt-1">
                <Shield className="w-3 h-3 inline-block mr-0.5" /> You're the Guild Leader.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Link to={createPageUrl("AccountBilling")}>
              <Button variant="outline" className="border-amber-400/40 text-amber-200">
                Billing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-[1fr,320px] gap-6">
        {/* Members + activity */}
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-black text-white mb-3">Members</h2>
            {profiles.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No member profiles loaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profiles.map((p) => {
                  const isLeaderRow = p.user_id === guildOwnerId;
                  return (
                    <div
                      key={p.user_id}
                      className="bg-[#1E2430] border border-slate-700 rounded-lg p-3 flex items-center gap-3"
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover object-top" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-200">
                          {displayInitial(p)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                          {isLeaderRow && <Crown className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />}
                          {displayName(p)}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                          {isLeaderRow ? "Leader" : "Member"} · {p.subscription_tier || "guild"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {isLeader && (
              <Link to={createPageUrl("AccountBilling")} className="text-[11px] text-amber-300 hover:underline inline-flex items-center gap-1 mt-3">
                <SettingsIcon className="w-3 h-3" /> Manage members in Billing
              </Link>
            )}
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">Activity</h2>
            {walletActivity.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No activity yet.</p>
            ) : (
              <ul className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
                {walletActivity.map((t) => (
                  <li key={t.id} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-slate-300 truncate">{t.description || t.transaction_type}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(t.created_at).toLocaleString()} · {t.transaction_type}
                      </p>
                    </div>
                    <span className={`font-bold font-mono text-sm ${t.amount > 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {t.amount > 0 ? "+" : ""}{formatSpice(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">Guild Purchases</h2>
            {guildPurchases.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                Nothing bought with guild Spice yet. Buy from the Tavern with "Guild Wallet" selected to unlock it for everyone.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {guildPurchases.map((p) => (
                  <div key={p.item_id} className="bg-[#1E2430] border border-slate-700 rounded-lg p-3">
                    {p.item?.preview_image_url ? (
                      <img src={p.item.preview_image_url} alt="" className="w-full h-20 rounded object-cover" />
                    ) : (
                      <div className="w-full h-20 rounded bg-[#050816] border border-slate-800 flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-700" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-white line-clamp-1 mt-2">
                      {p.item?.name || "Unknown item"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {p.item?.category} · {formatSpice(p.price_paid)} Spice
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Wallet + settings */}
        <aside className="space-y-5">
          <section className="bg-[#1E2430] border border-amber-600/40 rounded-lg p-5">
            <p className="text-[10px] uppercase tracking-widest text-amber-300 font-black flex items-center gap-1">
              <SpiceIcon size={12} color="currentColor" /> Guild Wallet
            </p>
            <p className="text-3xl font-black text-amber-200 mt-1">
              {formatSpice(wallet?.balance || 0)}
            </p>
            <p className="text-[11px] text-slate-400">
              Lifetime: {formatSpice(wallet?.lifetime_total || 0)} Spice
            </p>
            {wallet?.spending_restricted && (
              <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded p-2 text-[11px] text-amber-100 flex items-start gap-2">
                <Ban className="w-3.5 h-3.5 mt-0.5" />
                <span>
                  Guild spending is <strong>restricted</strong> — only the Leader can spend from this wallet.
                </span>
              </div>
            )}
          </section>

          {isLeader && (
            <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
                Leader tools
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Crest upload, spending permissions, and disband live in the Billing portal for now.
              </p>
              <Link to={createPageUrl("AccountBilling")}>
                <Button variant="outline" className="w-full">
                  Guild Settings <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </section>
          )}

          <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-5">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
              Perks active for everyone
            </p>
            <ul className="text-[12px] text-slate-300 space-y-1">
              <li className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-emerald-300" /> Veteran-level features
              </li>
              <li className="flex items-center gap-1.5">
                <SpiceIcon size={12} color="#fcd34d" /> 250 Spice / month guild stipend
              </li>
              <li className="flex items-center gap-1.5">
                <Package className="w-3 h-3 text-purple-300" /> Shared Tavern purchases
              </li>
              <li className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-blue-300" /> 20% Tavern discount + 80% creator split
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

// Hero illustration — matches the Creator Program asset pattern
// under /app-assets/hero/…
const GUILD_HERO = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/Becomeaguild.png";

function GuildJoinCTA() {
  return (
    <div className="min-h-screen" style={{ color: CREAM.textPrimary, backgroundColor: "#FFF8F3" }}>
      {/* Hero — white background, text left, image right. Mirrors
          the Creator Program layout exactly so the two marketing
          entry points feel like siblings. */}
      <header className="px-6 md:px-12 pt-12 pb-16" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: CREAM.accent }}>
              Guildstew Guild
            </p>
            <h1 className="text-4xl md:text-6xl font-black mt-2 leading-[1.05]" style={{ color: "#1E2430" }}>
              Join a Guild
            </h1>
            <p className="text-lg md:text-xl mt-4 max-w-xl" style={{ color: CREAM.textMuted }}>
              Pool your Spice, share cosmetics, and adventure together — six tables, one subscription.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={createPageUrl("AccountBilling")}
                className="inline-flex items-center gap-2 font-black uppercase tracking-[0.2em] px-6 py-4 text-sm rounded-md transition-colors"
                style={{ backgroundColor: CREAM.accent, color: CREAM.textPrimary }}
              >
                Start a Guild <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              src={GUILD_HERO}
              alt="Become a guild"
              className="w-full max-w-[420px] md:max-w-[480px] drop-shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
              draggable={false}
            />
          </div>
        </div>
      </header>

      {/* Benefits band */}
      <Band bg="#FFF8F3">
        <div className="space-y-4">
          <SectionTitle
            eyebrow="Why guilds"
            title="Everyone wins when one person subscribes."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Benefit
              icon={Wallet}
              title="Shared Spice wallet"
              body="Everyone contributes, everyone benefits. The guild's Spice pool funds cosmetic buys that cover the whole table."
            />
            <Benefit
              icon={Package}
              title="Group cosmetic purchases"
              body="Buy a UI theme, dice skin, or portrait pack once. Every guild member gets access as long as they're in the guild."
            />
            <Benefit
              icon={Shield}
              title="Veteran perks for all"
              body="One person pays $34.99/mo for Guild tier. All five invited members get Veteran-level features — AI generation, Brewery downloads, 20% Tavern discount, 80% creator split."
            />
            <Benefit
              icon={Sparkles}
              title="Guild-exclusive features"
              body="Guild-only events, shared libraries, and Hub-locked cosmetics are on the roadmap. Guilds get them first."
            />
          </div>
        </div>
      </Band>

      {/* How it works band */}
      <Band bg="#FFF0E8">
        <div className="space-y-4">
          <SectionTitle
            eyebrow="How it works"
            title="Three moves to get everyone in."
          />
          <ol className="space-y-3">
            <Step n={1}>
              One person subscribes to the <strong style={{ color: "#1E2430" }}>Guild tier ($34.99/mo)</strong>.
            </Step>
            <Step n={2}>
              They invite up to <strong style={{ color: "#1E2430" }}>5 friends</strong> from Billing → Manage guild.
            </Step>
            <Step n={3}>
              Everyone gets full Veteran access, a shared Spice wallet, and 250 Spice / month stipend — automatic.
            </Step>
          </ol>
        </div>
      </Band>

      {/* Pricing callout */}
      <Band bg="#FFF8F3">
        <div className="rounded-2xl border p-6 md:p-8 text-center" style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}>
          <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: CREAM.accent }}>
            Pricing
          </p>
          <p className="text-3xl md:text-4xl font-black mt-2" style={{ color: "#1E2430" }}>
            $34.99 / month
          </p>
          <p className="text-sm mt-2" style={{ color: CREAM.textMuted }}>
            That's <strong>$5.83 per person</strong> when all six seats are filled — full Veteran access for every member.
          </p>
        </div>
      </Band>

      {/* Bottom CTA band */}
      <Band bg="#FFFFFF">
        <div className="text-center space-y-3">
          <Link
            to={createPageUrl("AccountBilling")}
            className="inline-flex items-center gap-2 font-black uppercase tracking-[0.25em] px-10 py-5 text-sm rounded-md"
            style={{ backgroundColor: "#1E2430", color: "#FFFFFF" }}
          >
            <Crown className="w-4 h-4" /> Start a Guild
          </Link>
          <p className="text-[11px] max-w-md mx-auto" style={{ color: CREAM.textMuted }}>
            Guilds are private — there's no public directory. Your friends join by invitation from the guild leader.
          </p>
        </div>
      </Band>
    </div>
  );
}

function Benefit({ icon: Icon, title, body }) {
  return (
    <div
      className="rounded-2xl border p-5 flex gap-4 transition-colors"
      style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: "#FFF0E8", border: `1px solid ${CREAM.cardBorder}` }}
      >
        <Icon className="w-5 h-5" style={{ color: CREAM.accent }} />
      </div>
      <div>
        <p className="text-sm font-black" style={{ color: "#1E2430" }}>{title}</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: CREAM.textMuted }}>{body}</p>
      </div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="w-7 h-7 rounded-full font-black flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: CREAM.accent, color: CREAM.textPrimary }}
      >
        {n}
      </span>
      <p className="text-sm pt-0.5" style={{ color: "#1E2430" }}>{children}</p>
    </li>
  );
}
