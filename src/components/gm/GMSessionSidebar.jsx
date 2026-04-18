import { LogOut, WifiOff } from "lucide-react";

/**
 * Sidebar pinned to the left of the GM session panel. In-session
 * UI only — the single big red End Session button (with its
 * confirmation modal owned by GMPanel) plus a live list of
 * disconnected players the GM is currently controlling via the
 * presence channel.
 *
 * This sidebar used to carry a "Back to Campaign" link and
 * external nav links to Adventuring Party / Quick Notes / Campaign
 * Archives / Campaign Updates / Achievements — those navigated
 * away from the running session, so they've been removed. The GM
 * stays on this panel until they click End Session.
 */
export default function GMSessionSidebar({ onEndSession, disconnectedPlayers = [] }) {
  return (
    <aside className="w-64 flex-shrink-0 bg-[#1a1f2e] border-r border-slate-700/50 flex flex-col">
      <div className="px-3 pt-4 pb-3 border-b border-slate-700/50">
        <button
          type="button"
          onClick={onEndSession}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg py-2 transition-colors"
          title="End the session and release every locked character"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
        {disconnectedPlayers.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
            <h4 className="text-amber-400 font-semibold text-sm mb-2 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5" />
              Disconnected Players
            </h4>
            <ul className="space-y-1">
              {disconnectedPlayers.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-slate-300 truncate">{player.name}</span>
                  <span className="text-[10px] text-amber-400 whitespace-nowrap">
                    GM controlling
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-2">
              You have control of these characters until they reconnect.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
