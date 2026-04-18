import {
  LogOut, WifiOff, Users, BookOpen, StickyNote, Trophy, UserCog,
  Megaphone, Settings,
} from "lucide-react";

/**
 * In-session GM sidebar. A slim icon column pinned to the left of
 * GMPanel. The big red End Session button lives at the top, then
 * a divider, then one icon per in-session tool. Each tool button
 * sets the active modal key on the parent — nothing here ever
 * navigates away from the session. A live disconnected-player
 * tooltip surfaces on the WifiOff icon when the presence channel
 * drops someone.
 */
const SECTIONS = [
  { key: "party",        icon: Users,     label: "Adventuring Party" },
  { key: "archives",     icon: BookOpen,  label: "Campaign Archives" },
  { key: "quick_notes",  icon: StickyNote, label: "Quick Notes" },
  { key: "achievements", icon: Trophy,    label: "Achievements" },
  { key: "players",      icon: UserCog,   label: "Player Management" },
  { key: "updates",      icon: Megaphone, label: "Campaign Updates" },
  { key: "settings",     icon: Settings,  label: "Campaign Settings" },
];

export default function GMSessionSidebar({
  activeModal,
  onOpenModal,
  onEndSession,
  disconnectedPlayers = [],
}) {
  return (
    <aside className="w-16 flex-shrink-0 bg-[#1a1f2e] border-r border-slate-700/50 flex flex-col items-center py-4 gap-3">
      <button
        type="button"
        onClick={onEndSession}
        className="w-12 h-12 rounded-lg bg-red-600 hover:bg-red-500 flex items-center justify-center"
        title="End Session"
      >
        <LogOut className="w-5 h-5 text-white" />
      </button>

      <div className="w-8 border-t border-slate-700 my-1" />

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const active = activeModal === section.key;
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => onOpenModal(section.key)}
            title={section.label}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              active
                ? "bg-[#37F2D1]/10 text-[#37F2D1]"
                : "text-slate-400 hover:text-white hover:bg-[#252b3d]"
            }`}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}

      {disconnectedPlayers.length > 0 && (
        <div className="mt-auto mb-2 relative group">
          <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/60 flex items-center justify-center text-amber-400">
            <WifiOff className="w-5 h-5" />
          </div>
          <span className="absolute -top-1 -right-1 bg-amber-500 text-[#050816] text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {disconnectedPlayers.length}
          </span>
          <div className="absolute left-full ml-2 top-0 min-w-[180px] bg-[#1a1f2e] border border-amber-700/50 rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 mb-2">Disconnected</p>
            <ul className="space-y-1">
              {disconnectedPlayers.map((p) => (
                <li key={p.id} className="text-xs text-slate-300 truncate">{p.name}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
}
