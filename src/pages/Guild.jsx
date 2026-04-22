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
import { useSubscription } from "@/lib/SubscriptionContext";
import { listGuildMembers } from "@/api/billingClient";
import { getGuildWalletBalance } from "@/lib/spiceWallet";
import { formatSpice } from "@/config/spiceConfig";
import { createPageUrl } from "@/utils";

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
                          {(p.username || p.full_name || "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                          {isLeaderRow && <Crown className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />}
                          {p.username || p.full_name || "Adventurer"}
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

function GuildJoinCTA() {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Hero */}
      <div
        className="w-full px-6 pt-16 pb-12 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(251,191,36,0.25) 0%, rgba(251,191,36,0.08) 40%, rgba(5,8,22,1) 80%)",
        }}
      >
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-300/20 to-amber-600/10 border-2 border-amber-400/60 shadow-[0_0_40px_rgba(251,191,36,0.4)] mb-5">
            <Crown className="w-12 h-12 text-amber-300" />
          </div>
          <h1
            className="text-5xl md:text-6xl font-black text-amber-100 tracking-tight"
            style={{ fontFamily: "'Cream', 'Inter', sans-serif" }}
          >
            Join a Guild
          </h1>
          <p className="text-base md:text-lg text-amber-100/80 mt-3 max-w-xl mx-auto">
            Pool your Spice, share cosmetics, and adventure together.
          </p>
          <div
            className="inline-block mt-6 text-[11px] uppercase tracking-widest font-bold px-3 py-1 rounded-full"
            style={{
              backgroundColor: "rgba(251,191,36,0.2)",
              color: "#fbbf24",
              border: "1px solid rgba(251,191,36,0.5)",
            }}
          >
            <Sparkles className="w-3 h-3 inline-block mr-1" />
            Six tables. One subscription.
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Benefits */}
        <section>
          <p className="text-[10px] uppercase tracking-widest font-black text-amber-300/70 text-center">
            Why guilds
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-white text-center mt-1">
            Everyone wins when one person subscribes.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
        </section>

        {/* How it works */}
        <section>
          <div className="bg-[#1E2430] border border-amber-400/30 rounded-xl p-6 md:p-8">
            <p className="text-[10px] uppercase tracking-widest font-black text-amber-300/80">
              How it works
            </p>
            <ol className="mt-3 space-y-3">
              <Step n={1}>
                One person subscribes to the <strong className="text-amber-200">Guild tier ($34.99/month)</strong>.
              </Step>
              <Step n={2}>
                They invite up to <strong className="text-amber-200">5 friends</strong> from Billing → Manage guild.
              </Step>
              <Step n={3}>
                Everyone gets full Veteran access, a shared Spice wallet, and 250 Spice/month stipend — automatic.
              </Step>
            </ol>
          </div>
        </section>

        {/* CTAs */}
        <section className="text-center space-y-3">
          <p className="text-sm text-slate-300">
            Know someone with a Guild subscription?
          </p>
          <p className="text-sm text-slate-400">
            <strong className="text-amber-300">Ask your GM for a Guild invite</strong> — they can add you from their Billing page.
          </p>
          <div className="pt-3">
            <Link
              to={createPageUrl("AccountBilling")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-amber-950 font-black rounded-lg hover:bg-amber-300 transition-colors shadow-[0_0_20px_rgba(251,191,36,0.35)]"
            >
              ✨ Start your own Guild <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Guilds are private. There's no public directory — you join by invitation from an existing Guild leader.
          </p>
        </section>
      </div>
    </div>
  );
}

function Benefit({ icon: Icon, title, body }) {
  return (
    <div className="bg-[#1E2430] border border-slate-700 hover:border-amber-400/40 transition-colors rounded-xl p-5 flex gap-4">
      <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-amber-300" />
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <p className="text-sm text-slate-300 pt-0.5">{children}</p>
    </li>
  );
}
