import {
  LogOut, Megaphone, Users, BookOpen, Trophy,
} from "lucide-react";

/**
 * PlayerSessionSidebar — player-side parity mirror of GMSessionSidebar.
 *
 * Structure mirrors the GM sidebar (sections list + sectionBadges
 * prop + active-section nav, primary action button at the top).
 * What differs is the section set (player-appropriate) and the
 * primary action (Leave Session instead of End Session).
 *
 * Section content panels are mounted by the parent
 * (CampaignPlayerPanel) via SessionModal — same swap-by-active-key
 * pattern the GM panel uses. This sidebar stays nav-only.
 *
 * Design intent (per Boky's #11 spec):
 *  - Campaign Updates: read GM posts + comment + bubble badge on
 *    unread (commit 2 wires the comments + badge; sections render
 *    a placeholder until then)
 *  - Adventuring Party: own character primary, others as tabs,
 *    Quick Notes mirroring (commit 3)
 *  - Campaign Archives: read all world lore + post per-section +
 *    knowledge checks + Legend Tracker mounted inside (commit 4)
 *  - Achievements: read surface into the existing global system
 *    (commit 5; recon confirmed real engine, not scaffold)
 *
 * The sidebar is always visible during an active session as a
 * narrow fixed left-edge column. Stays out of the way of the play
 * surface but present for one-click access to any section.
 */
export const PLAYER_SECTIONS = [
  { key: "campaignUpdates",   icon: Megaphone, label: "Campaign Updates" },
  { key: "adventuringParty",  icon: Users,     label: "Adventuring Party" },
  { key: "campaignArchives",  icon: BookOpen,  label: "Campaign Archives" },
  { key: "achievements",      icon: Trophy,    label: "Achievements" },
];

export default function PlayerSessionSidebar({
  activeSection,
  onOpenSection,
  onLeaveSession,
  // Per-section badge counts. Same shape the GM sidebar's
  // sectionBadges uses (#10b). Today the only one that fires is
  // campaignUpdates (unread-count, wired in commit 2), but the
  // shape is open-ended so future sections can opt in cheaply.
  sectionBadges = {},
}) {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#1a1f2e] border-r border-slate-700/50 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-700/50">
        <button
          type="button"
          onClick={onLeaveSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
          title="Leave the session — your character returns to the lobby and the GM may take temporary control until you re-join"
        >
          <LogOut className="w-4 h-4" />
          Leave Session
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {PLAYER_SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.key;
          const badge = sectionBadges[section.key];
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onOpenSection(section.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                active
                  ? "bg-[#37F2D1]/10 text-[#37F2D1]"
                  : "text-slate-400 hover:text-white hover:bg-[#252b3d]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{section.label}</span>
              {badge > 0 && (
                <span
                  className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#37F2D1] text-[#1E2430] text-xs font-bold"
                  title={`${badge} pending`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
