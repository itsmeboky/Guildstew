import React from "react";
import { Crown, Shield, UserCog } from "lucide-react";
import { displayName, displayInitial } from "@/utils/displayName";
import StatusDot from "@/components/presence/StatusDot";

/**
 * Grid of member cards for the Guild Hall. 2-3 per row on desktop,
 * 1 on mobile. Each card shows avatar, username, display_title,
 * online status dot, preferred-class icon, plus a role badge (Leader,
 * Officer, or Member).
 *
 * Leaders see a "Manage Members" button at the top of the section
 * which opens the member-manager sheet (wired in step 6).
 */
export default function GuildMembersSection({
  profiles = [],
  guildOwnerId,
  officerIds = [],
  isLeader,
  onManageMembers,
}) {
  const sorted = React.useMemo(() => {
    // Leader first, then officers (in roster order), then everyone else.
    return [...profiles].sort((a, b) => {
      if (a.user_id === guildOwnerId) return -1;
      if (b.user_id === guildOwnerId) return 1;
      const aOfficer = officerIds.includes(a.user_id) ? 1 : 0;
      const bOfficer = officerIds.includes(b.user_id) ? 1 : 0;
      return bOfficer - aOfficer;
    });
  }, [profiles, guildOwnerId, officerIds]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xl font-black text-amber-200"
          style={{ fontFamily: "'Cinzel', 'Cream', Georgia, serif" }}
        >
          Members
        </h2>
        {isLeader && (
          <button
            type="button"
            onClick={onManageMembers}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-2 rounded-md border border-amber-500/50 bg-[#050816] text-amber-200 hover:bg-amber-500/15 transition-colors"
          >
            <UserCog className="w-3.5 h-3.5" />
            Manage Members
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No members loaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((p) => (
            <MemberCard
              key={p.user_id}
              profile={p}
              isLeader={p.user_id === guildOwnerId}
              isOfficer={officerIds.includes(p.user_id) && p.user_id !== guildOwnerId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MemberCard({ profile, isLeader, isOfficer }) {
  const name = displayName(profile, { fallback: "Member" });
  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3 transition-colors"
      style={{
        backgroundColor: "#0b1324",
        border: `1px solid ${isLeader ? "rgba(245,158,11,0.45)" : "rgba(148,163,184,0.15)"}`,
        boxShadow: isLeader
          ? "0 0 14px rgba(245,158,11,0.15)"
          : "none",
      }}
    >
      <div className="relative flex-shrink-0">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-[60px] h-[60px] rounded-full object-cover object-top border border-slate-700"
          />
        ) : (
          <div className="w-[60px] h-[60px] rounded-full bg-slate-700 flex items-center justify-center text-xl font-black text-slate-200 border border-slate-700">
            {displayInitial(profile)}
          </div>
        )}
        <span className="absolute bottom-0 right-0">
          <StatusDot profile={profile} size="md" border="#0b1324" />
        </span>
        {isLeader && (
          <Crown
            className="absolute -top-1 -right-1 w-4 h-4 text-amber-300 drop-shadow"
            fill="currentColor"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white truncate flex items-center gap-1.5">
          {name}
          {profile.favorite_class_icon ? (
            <img
              src={profile.favorite_class_icon}
              alt={profile.favorite_class || ""}
              title={profile.favorite_class || ""}
              className="w-4 h-4 opacity-80 flex-shrink-0"
            />
          ) : null}
        </p>
        {profile.display_title && (
          <p className="text-[11px] text-[#37F2D1] uppercase tracking-widest font-bold truncate mt-0.5">
            {profile.display_title}
          </p>
        )}
        <div className="mt-1.5 inline-flex items-center gap-1">
          {isLeader ? (
            <RoleBadge color="#fbbf24" bg="rgba(245,158,11,0.18)">
              <Crown className="w-3 h-3" fill="currentColor" /> Leader
            </RoleBadge>
          ) : isOfficer ? (
            <RoleBadge color="#93c5fd" bg="rgba(59,130,246,0.18)">
              <Shield className="w-3 h-3" /> Officer
            </RoleBadge>
          ) : (
            <RoleBadge color="#cbd5f5" bg="rgba(100,116,139,0.25)">
              Member
            </RoleBadge>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ children, color, bg }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5"
      style={{ color, backgroundColor: bg, border: `1px solid ${color}55` }}
    >
      {children}
    </span>
  );
}
