import React, { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Users } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance } from "@/lib/spiceWallet";
import { formatSpice } from "@/config/spiceConfig";
import BuySpiceDialog from "@/components/tavern/BuySpiceDialog";
import { base44 } from "@/api/base44Client";

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

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

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

  const { data: friendProfiles = [] } = useQuery({
    queryKey: ["sidebarFriendProfiles", friendIds.sort().join(",")],
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      const rows = await base44.entities.UserProfile.list();
      return (rows || []).filter((p) => friendIds.includes(p.user_id)).slice(0, 5);
    },
    enabled: friendIds.length > 0,
  });

  const tier = sub.tierData;

  return (
    <>
      <aside className="w-[260px] bg-[#1E2430] border-r border-[#2a3441] min-h-[calc(100vh-4rem)] flex flex-col">
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
                {(user?.username || user?.email || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">
                {user?.username || user?.full_name || user?.email || "Guest"}
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
              <Flame className="w-4 h-4 text-amber-400" />
              {formatSpice(wallet?.balance || 0)}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-amber-300/80">Buy Spice</span>
          </button>
        </div>

        {/* Scrollable middle section — links land here in steps 2-6 */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          <SidebarSection>
            <SidebarLink
              to={createPageUrl("Friends")}
              icon={Users}
              label="Friends"
              badge={pendingRequestsCount}
            />
            {friendProfiles.length > 0 && (
              <div className="flex items-center gap-1 px-3 pt-1.5">
                {friendProfiles.map((p) => (
                  <Link
                    key={p.user_id}
                    to={`${createPageUrl("UserProfile")}?id=${p.user_id}`}
                    title={p.username || p.full_name || "Friend"}
                    className="block"
                  >
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover object-top border border-slate-700 hover:border-[#37F2D1] transition-colors"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-slate-700 hover:border-[#37F2D1] transition-colors">
                        {(p.username || p.full_name || "?")[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </SidebarSection>
        </nav>

        {/* Pinned bottom — Account + Settings land here in step 7 */}
        <div className="border-t border-[#2a3441] p-2 space-y-1">
          {/* Populated by step 7. */}
        </div>
      </aside>

      <BuySpiceDialog open={spiceOpen} onClose={() => setSpiceOpen(false)} />
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
  const active = !external && location.pathname === to;
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
