import React, { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Trophy, PieChart,
  MessageSquare, Calendar, BarChart3,
  Upload, LayoutDashboard, TrendingUp,
  HelpCircle, BookOpen, AlertTriangle,
  User, Settings, CreditCard, Crown, Package, UserCircle2,
  ChevronDown, Sparkles,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance } from "@/lib/spiceWallet";
import { formatSpice } from "@/config/spiceConfig";
import SpiceEmporium from "@/components/tavern/SpiceEmporium";
import CreatorUploadDialog from "@/components/tavern/CreatorUploadDialog";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import AnimatedSpiceBalance from "@/components/tavern/AnimatedSpiceBalance";
import CampaignActions from "@/components/layout/CampaignActions";
import FriendsSidebarPanel from "@/components/layout/FriendsSidebarPanel";
import { base44 } from "@/api/base44Client";
import { displayName, displayInitial } from "@/utils/displayName";

/**
 * App-wide sidebar.
 *
 * Shown on every page except the campaign interior (which has its
 * own in-context nav rendered by Layout.jsx). Layout.jsx decides
 * whether to mount this or the campaign sidebar based on
 * `currentPageName`.
 *
 * Structure grows in follow-up commits:
 *   1. (this) user header + Spice balance + section scaffolding
 *   2. Friends
 *   3. Achievements + P.I.E. Chart
 *   4. Community — Discord / Forums / Events / Leaderboards
 *   5. Creator Panel — Upload / Dashboard / Analytics
 *   6. Support — FAQ / Documentation / Report
 *   7. Account submenu + Settings pinned to the bottom
 *   8. Polish — active-state styling, scrollable middle, pinned bottom
 */
export default function AppSidebar() {
  const { user } = useAuth();
  const sub = useSubscription();
  const location = useLocation();
  const [spiceOpen, setSpiceOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Creator Panel swaps its first link between "Join the Creator
  // Program" and "Creator Dashboard" based on whether the user has
  // any tavern_items listings. Cheap head+count query so the
  // sidebar doesn't pull full rows.
  const { data: creatorListingCount = 0 } = useQuery({
    queryKey: ["sidebarCreatorListingCount", user?.id],
    queryFn: async () => {
      const { supabase } = await import("@/api/supabaseClient");
      const { count } = await supabase
        .from("tavern_items")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id);
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const isCreator = creatorListingCount > 0;

  // Friendships power both the pending-requests badge and the online
  // avatars strip. Same query is already cached by Layout.jsx's
  // top-level badge lookup, so this is just reading the same entry.
  const { data: friendships = [] } = useQuery({
    queryKey: ["friendships", user?.id],
    queryFn: async () => {
      const rows = await base44.entities.Friendship.list();
      return (rows || []).filter(
        (f) => f.user_id === user?.id || f.friend_id === user?.id,
      );
    },
    enabled: !!user?.id,
  });

  const pendingRequestsCount = useMemo(
    () => friendships.filter((f) => f.friend_id === user?.id && f.status === "pending").length,
    [friendships, user?.id],
  );

  const friendIds = useMemo(
    () => friendships
      .filter((f) => f.status === "accepted")
      .map((f) => (f.user_id === user?.id ? f.friend_id : f.user_id))
      .filter(Boolean),
    [friendships, user?.id],
  );

  const tier = sub.tierData;

  return (
    <>
      <aside className="hidden md:flex w-[260px] bg-[#1E2430] border-r border-[#2a3441] min-h-[calc(100vh-4rem)] flex-col sticky top-16 self-start max-h-[calc(100vh-4rem)] z-50">
        {/* User header */}
        <div className="p-4 border-b border-[#2a3441]">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover object-top border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                {displayInitial(user)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">
                {displayName(user, { fallback: "Guest" })}
              </p>
              {tier?.badgeIcon && sub.tier !== "free" ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 mt-0.5"
                  style={{
                    backgroundColor: `${tier.badgeColor}33`,
                    color: tier.badgeColor,
                    border: `1px solid ${tier.badgeColor}66`,
                  }}
                >
                  {tier.badgeIcon} {tier.name}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Free tier</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSpiceOpen(true)}
            title="Buy more Spice"
            className="mt-3 w-full inline-flex items-center justify-between gap-2 rounded-lg px-3 py-2 bg-[#050816] border border-amber-600/30 hover:border-amber-400 transition-colors"
          >
            <span className="inline-flex items-center gap-2 text-amber-200 font-bold text-sm">
              <SpiceIcon size={18} color="#fbbf24" />
              <AnimatedSpiceBalance balance={wallet?.balance || 0} />
            </span>
            <span className="text-[10px] uppercase tracking-widest text-amber-300/80">Buy Spice</span>
          </button>
        </div>

        {/* Scrollable middle section — links land here in steps 2-6 */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {/* Campaigns-page-specific PLAY / Join / Find CTA block.
              Shown on /campaigns, /campaigns/find, and anything else
              under the campaigns-list umbrella (never inside a
              specific campaign — Layout handles that routing). */}
          {(location.pathname === "/campaigns" || location.pathname === "/Campaigns" || location.pathname.startsWith("/campaigns/")) && (
            <CampaignActions />
          )}
          <SidebarSection>
            <SidebarLink
              to={createPageUrl("Friends")}
              icon={Users}
              label="Friends"
              badge={pendingRequestsCount}
            />
            <FriendsSidebarPanel user={user} friendIds={friendIds} sub={sub} />
            <SidebarLink to={createPageUrl("Achievements")} icon={Trophy} label="Achievements" />
            <SidebarLink to={createPageUrl("PIEChart")} icon={PieChart} label="P.I.E. Chart" />
          </SidebarSection>

          <SidebarSection label="Community">
            {/* Discord is a CTA, not a nav row. Brand gradient
                (salmon → teal) + soft glow so it pops against the
                plain nav rows. */}
            <a
              href="https://discord.gg/TK2s88fzSQ"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mx-1 mb-1 font-bold text-sm transition-all hover:brightness-110 hover:shadow-[0_0_18px_rgba(55,242,209,0.35)]"
              style={{
                background: "linear-gradient(135deg, #f8a47c 0%, #37F2D1 100%)",
                color: "#1E2430",
                padding: "10px 16px",
                borderRadius: "12px",
                boxShadow: "0 0 14px rgba(55, 242, 209, 0.18)",
              }}
            >
              <DiscordIcon className="w-4 h-4" />
              Join our Discord
            </a>
            <SidebarLink to={createPageUrl("Forums")}       icon={MessageSquare} label="Forums" />
            <SidebarLink to={createPageUrl("Events")}       icon={Calendar}      label="Community Events" />
            <SidebarLink to={createPageUrl("Leaderboards")} icon={BarChart3}     label="Leaderboards" />
          </SidebarSection>

          <SidebarSection label="Creator Panel">
            {/* Upload opens the existing CreatorUploadDialog straight
                from the sidebar — no intermediate page. Stays
                regardless of creator status so experienced creators
                can list from anywhere. */}
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-[#2a3441] hover:text-white transition-colors"
            >
              <Upload className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">Upload New</span>
            </button>
            {isCreator ? (
              <SidebarLink to={createPageUrl("CreatorDashboard")} icon={LayoutDashboard} label="Creator Dashboard" />
            ) : (
              <SidebarLink to={createPageUrl("CreatorProgram")}   icon={Sparkles}       label="Join the Creator Program" />
            )}
            <SidebarLink to={createPageUrl("CreatorAnalytics")} icon={TrendingUp} label="Analytics" />
          </SidebarSection>

          <SidebarSection label="Support">
            <SidebarLink to={createPageUrl("FAQ")}           icon={HelpCircle}     label="FAQ" />
            <SidebarLink to={createPageUrl("Docs")}          icon={BookOpen}       label="Documentation" />
            <SidebarLink to={createPageUrl("SupportTicket")} icon={AlertTriangle}  label="Report a Problem" />
          </SidebarSection>
        </nav>

        {/* Pinned bottom — Account submenu + Settings stay anchored
            so they're reachable regardless of scroll. */}
        <div className="border-t border-[#2a3441] p-2 space-y-1">
          {/* Account — expandable */}
          <button
            type="button"
            onClick={() => setAccountOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-[#2a3441] hover:text-white transition-colors"
          >
            <User className="w-[18px] h-[18px]" />
            <span className="flex-1 text-left">Account</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
          </button>
          {accountOpen && (
            <div className="pl-3 space-y-0.5">
              <SidebarLink to={createPageUrl("AccountBilling")} icon={CreditCard} label="Billing & Payments" />
              {guildManagementItem(sub)}
              <SidebarLink to={createPageUrl("MyCollection")} icon={Package}      label="My Collection" />
              <SidebarLink to={createPageUrl("YourProfile")}  icon={UserCircle2}  label="Profile" />
            </div>
          )}

          {/* Settings — pinned single button. */}
          <SidebarLink to={createPageUrl("Settings")} icon={Settings} label="Settings" />
        </div>
      </aside>

      <SpiceEmporium open={spiceOpen} onClose={() => setSpiceOpen(false)} />
      <CreatorUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}

/**
 * Section wrapper used by the nav entries. Exported so later steps'
 * commits have a stable primitive to plug into without re-defining
 * it in place.
 */
export function SidebarSection({ label, children }) {
  return (
    <div>
      {label && (
        <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
          {label}
        </p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

/**
 * Single nav link with hover + active styles. `to` accepts either a
 * react-router path OR an external URL (in which case `external={true}`
 * opens it in a new tab and the link renders as an <a>).
 */
export function SidebarLink({ to, icon: Icon, label, badge, external, className = "", accent, onClick }) {
  const location = useLocation();
  const here = (location.pathname || "").toLowerCase();
  const target = String(to || "").toLowerCase();
  // Exact match OR nested (e.g. /blog/slug inside the /blog link).
  // Root "/" gets exact-match only so it doesn't light up everywhere.
  const active = !external && target && (
    target === "/"
      ? here === "/"
      : here === target || here.startsWith(target + "/") || here.startsWith(target + "?")
  );
  const base = `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative ${className}`;
  const activeCls = active
    ? "bg-[#2a3441] text-[#37F2D1]"
    : "text-slate-300 hover:bg-[#2a3441] hover:text-white";
  const style = accent ? { color: accent } : undefined;

  const content = (
    <>
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#37F2D1]" aria-hidden />
      )}
      {Icon && <Icon className={`w-[18px] h-[18px] ${active ? "text-[#37F2D1]" : ""}`} style={style} />}
      <span className="flex-1 truncate">{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="text-[10px] font-black rounded-full px-1.5 py-0.5 bg-[#37F2D1] text-[#050816] min-w-[18px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={`${base} ${activeCls}`}
      >
        {content}
      </a>
    );
  }
  return (
    <Link to={to} onClick={onClick} className={`${base} ${activeCls}`}>
      {content}
    </Link>
  );
}

/**
 * Guild Management entry.
 *
 * In-a-guild users get a plain link to /guild. Guild-less users get
 * a warm amber CTA — "✨ Join a Guild" — so the upsell feels
 * inviting rather than nag-like.
 */
function guildManagementItem(sub) {
  const inGuild = !!sub?.guildOwnerId || sub?.isGuildMember || sub?.isGuildOwner;
  if (inGuild) {
    return (
      <SidebarLink
        to={createPageUrl("Guild")}
        icon={Crown}
        label="Guild Management"
      />
    );
  }
  return (
    <Link
      to={createPageUrl("Guild")}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-bold bg-amber-500/10 text-amber-200 border border-amber-400/60 hover:bg-amber-500/20 hover:border-amber-300 transition-colors shadow-[0_0_12px_rgba(251,191,36,0.12)]"
    >
      <Sparkles className="w-[18px] h-[18px] text-amber-300" />
      <span className="flex-1">Join a Guild</span>
    </Link>
  );
}

// Discord glyph — inlined so we don't pull in another icon pack just
// for the one CTA.
function DiscordIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.372.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.175 1.096 2.156 2.42 0 1.333-.955 2.418-2.156 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.175 1.096 2.156 2.42 0 1.333-.946 2.418-2.156 2.418z" />
    </svg>
  );
}
