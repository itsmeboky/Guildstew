import {
  LogOut, Users, BookOpen, StickyNote, Trophy, UserCog,
  Megaphone, Settings,
} from "lucide-react";

/**
 * In-session GM sidebar. Wide enough (w-56) to carry both an icon
 * and a text label per tool so the GM isn't left guessing what
 * each button does. End Session lives at the top — a full-width
 * red button with a label — and a live Disconnected Players card
 * drops in below it whenever the presence channel loses somebody.
 * Every tool button flips the parent's activeModal; nothing here
 * navigates away from the session.
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
    <aside className="w-56 flex-shrink-0 bg-[#1a1f2e] border-r border-slate-700/50 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-slate-700/50">
        <button
          type="button"
          onClick={onEndSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
          title="End the session and release every locked character"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </div>

      {disconnectedPlayers.length > 0 && (
        <div className="p-3 border-b border-slate-700/50">
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-2">
            <p className="text-xs text-amber-400 font-semibold mb-1">Disconnected</p>
            <ul className="space-y-0.5">
              {disconnectedPlayers.map((p) => (
                <li key={p.id} className="text-xs text-slate-300 truncate">{p.name}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = activeModal === section.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onOpenModal(section.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                active
                  ? "bg-[#37F2D1]/10 text-[#37F2D1]"
                  : "text-slate-400 hover:text-white hover:bg-[#252b3d]"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
