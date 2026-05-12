import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Crown, Sparkles, ArrowRight,
  Shield, Package, Wallet, Ticket,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Band, SectionTitle, CREAM } from "@/components/marketing/MarketingBand";
import { useSubscription } from "@/lib/SubscriptionContext";
import { listGuildMembers, redeemGuildInviteCode } from "@/api/billingClient";
import { createPageUrl } from "@/utils";
import GuildHallHeader from "@/components/guild/GuildHallHeader";
import GuildMembersSection from "@/components/guild/GuildMembersSection";
import GuildActiveCampaigns from "@/components/guild/GuildActiveCampaigns";
import GuildUpdatesFeed from "@/components/guild/GuildUpdatesFeed";
import GuildAchievements from "@/components/guild/GuildAchievements";
import GuildTreasury from "@/components/guild/GuildTreasury";
import GuildSettingsDialog from "@/components/guild/GuildSettingsDialog";

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
  const navigate = useNavigate();
  const guildOwnerId = sub.guildOwnerId || (sub.isGuildOwner ? user?.id : null);
  const isLeader = sub.isGuildOwner || user?.id === guildOwnerId;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const goToCrestBuilder = () => navigate("/guild/crest-builder");

  // Subscription guild row (separate from the campaign-scoped
  // guild_halls table — this one carries name / crest / officers /
  // spending flag / max_members / founded_at). Lazily created on
  // the leader's first edit, so a fresh guild reads as null until
  // settings are saved.
  const { data: guild } = useQuery({
    queryKey: ["guildRow", guildOwnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("*")
        .eq("owner_user_id", guildOwnerId)
        .maybeSingle();
      return data || null;
    },
    enabled: !!guildOwnerId,
  });
  const officerIds = guild?.officer_ids || [];

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
        .select("user_id, username, avatar_url, status, last_seen_at, favorite_class, favorite_class_icon, tagline, display_title, subscription_tier")
        .in("user_id", memberIds);
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const leaderProfile = useMemo(
    () => profiles.find((p) => p.user_id === guildOwnerId) || null,
    [profiles, guildOwnerId],
  );

  const profilesById = useMemo(() => {
    const map = new Map();
    for (const p of profiles) map.set(p.user_id, p);
    return map;
  }, [profiles]);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <GuildHallHeader
        guild={guild}
        leaderProfile={leaderProfile}
        memberCount={profiles.length}
        isLeader={isLeader}
        onOpenSettings={() => setSettingsOpen(true)}
        onCreateCrest={goToCrestBuilder}
        onEditCrest={goToCrestBuilder}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-10">
        <GuildMembersSection
          profiles={profiles}
          guildOwnerId={guildOwnerId}
          officerIds={officerIds}
          isLeader={isLeader}
          onManageMembers={() => setSettingsOpen(true)}
        />

        <GuildActiveCampaigns memberIds={memberIds} viewerId={user?.id} />

        <GuildUpdatesFeed memberIds={memberIds} />

        <GuildAchievements memberIds={memberIds} profilesById={profilesById} />

        <GuildTreasury guildOwnerId={guildOwnerId} />
      </div>

      {isLeader && (
        <GuildSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          guild={guild}
          guildOwnerId={guildOwnerId}
          profiles={profiles}
        />
      )}
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
              Pool your Spice, share cosmetics, and adventure together —
              <br />
              six tables, one subscription.
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
          <div className="flex justify-center md:justify-end md:mr-20">
            <img
              src={GUILD_HERO}
              alt="Become a guild"
              className="w-full max-w-[420px] md:max-w-[480px] drop-shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
              draggable={false}
            />
          </div>
        </div>
      </header>

      {/* Redeem-by-code band — for visitors arriving with an invite
          code (or via the /guild?code=XXX share link). Lives at the
          top so it's the first thing someone with a code sees. */}
      <Band bg="#FFFFFF">
        <RedeemInviteCodeForm />
      </Band>

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

// Maps the redeem RPC's `status` envelope to a user-readable
// message + toast tone. Keeping it in one place so the spec's
// canaries (invalid / full / already-member / already-in-other) all
// surface with consistent wording.
const REDEEM_MESSAGES = {
  invalid_code:           { tone: "error",   text: "Invite code not recognized." },
  guild_full:             { tone: "error",   text: "This guild is full (6/6 members)." },
  already_member:         { tone: "info",    text: "You're already a member of this guild." },
  already_in_other_guild: { tone: "error",   text: "You're already in another guild — leave it before joining a new one." },
  not_authenticated:      { tone: "error",   text: "Sign in before redeeming a code." },
};

function RedeemInviteCodeForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const sub = useSubscription();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  // Prefill from /guild?code=GLD-XXXX-XXXX share links.
  useEffect(() => {
    const fromUrl = searchParams.get("code");
    if (fromUrl && !code) setCode(fromUrl.toUpperCase());
    // intentionally only on first render with the param; the user
    // editing the field afterwards shouldn't snap back to the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redeem = useMutation({
    mutationFn: () => redeemGuildInviteCode(code.trim().toUpperCase()),
    onSuccess: (result) => {
      if (result?.status === "joined") {
        toast.success("Welcome to your new guild!");
        // Drop the ?code=… off the URL so a refresh after joining
        // doesn't re-attempt to redeem.
        if (searchParams.has("code")) {
          searchParams.delete("code");
          setSearchParams(searchParams, { replace: true });
        }
        // Refresh subscription state so Guild.jsx flips to GuildHub.
        sub.refresh?.();
        queryClient.invalidateQueries({ queryKey: ["guildRow"] });
        queryClient.invalidateQueries({ queryKey: ["guildMembers"] });
        // Soft nav to /guild — the page itself re-renders into the
        // hub once SubscriptionContext refreshes.
        navigate("/guild");
        return;
      }
      const mapped = REDEEM_MESSAGES[result?.status];
      if (mapped) {
        if (mapped.tone === "info") toast.info ? toast.info(mapped.text) : toast(mapped.text);
        else toast.error(mapped.text);
      } else {
        toast.error("Could not redeem code.");
      }
    },
    onError: (err) => toast.error(err?.message || "Could not redeem code"),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    redeem.mutate();
  };

  return (
    <div
      className="rounded-2xl border p-6 md:p-8 max-w-2xl mx-auto"
      style={{ backgroundColor: CREAM.card, borderColor: CREAM.cardBorder }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#FFF0E8", border: `1px solid ${CREAM.cardBorder}` }}
        >
          <Ticket className="w-5 h-5" style={{ color: CREAM.accent }} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: CREAM.accent }}>
            Have an invite code?
          </p>
          <p className="text-lg font-black mt-1" style={{ color: "#1E2430" }}>
            Join a guild
          </p>
          <p className="text-xs mt-1" style={{ color: CREAM.textMuted }}>
            Paste the code your friend shared (looks like <span className="font-mono">GLD-XXXX-XXXX</span>).
          </p>
          <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GLD-XXXX-XXXX"
              className="font-mono tracking-widest bg-white"
              maxLength={20}
              disabled={redeem.isPending}
            />
            <Button
              type="submit"
              disabled={redeem.isPending || !code.trim()}
              className="font-black uppercase tracking-[0.2em]"
              style={{ backgroundColor: CREAM.accent, color: CREAM.textPrimary }}
            >
              {redeem.isPending ? "Joining…" : "Redeem"}
            </Button>
          </form>
        </div>
      </div>
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
