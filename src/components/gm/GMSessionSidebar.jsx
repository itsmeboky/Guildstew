import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, WifiOff, Users, StickyNote, Trophy, UserCog, Megaphone,
  Settings, BookOpen, ArrowLeft,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import GMSidebarPartyPanel     from "./GMSidebarPartyPanel";
import GMSidebarQuickNotes     from "./GMSidebarQuickNotes";
import GMSidebarAchievements   from "./GMSidebarAchievements";
import GMSidebarPlayers        from "./GMSidebarPlayers";
import GMSidebarUpdates        from "./GMSidebarUpdates";
import GMSidebarSettings       from "./GMSidebarSettings";

/**
 * In-session GM sidebar. One red End Session button, a live
 * Disconnected Players card (pushed from GMPanel's presence
 * channel), and a menu of in-session tool panels that open inline
 * in the same sidebar column. The one exception is Campaign
 * Archives — it's too big to cram into a sidebar, so the Archives
 * entry navigates to the full page and that page carries a "Back
 * to Session" button home.
 */
const SECTIONS = [
  { key: "party",        label: "Adventuring Party", icon: Users,     Component: GMSidebarPartyPanel },
  { key: "archives",     label: "Campaign Archives", icon: BookOpen,  navTo: "CampaignArchives" },
  { key: "quick_notes",  label: "Quick Notes",       icon: StickyNote, Component: GMSidebarQuickNotes },
  { key: "achievements", label: "Achievements",      icon: Trophy,    Component: GMSidebarAchievements },
  { key: "players",      label: "Player Management", icon: UserCog,   Component: GMSidebarPlayers },
  { key: "updates",      label: "Campaign Updates",  icon: Megaphone, Component: GMSidebarUpdates },
  { key: "settings",     label: "Campaign Settings", icon: Settings,  Component: GMSidebarSettings },
];

export default function GMSessionSidebar({
  onEndSession,
  disconnectedPlayers = [],
  campaignId,
  campaign,
  allUserProfiles = [],
}) {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const ActivePanel = SECTIONS.find((s) => s.key === active)?.Component || null;
  const activeLabel = SECTIONS.find((s) => s.key === active)?.label || "";

  return (
    <aside className="w-72 flex-shrink-0 bg-[#1a1f2e] border-r border-slate-700/50 flex flex-col h-full overflow-hidden">
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

      {disconnectedPlayers.length > 0 && (
        <div className="p-3 border-b border-slate-700/50">
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
            <h4 className="text-amber-400 font-semibold text-sm mb-2 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5" />
              Disconnected Players
            </h4>
            <ul className="space-y-1">
              {disconnectedPlayers.map((player) => (
                <li key={player.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-300 truncate">{player.name}</span>
                  <span className="text-[10px] text-amber-400 whitespace-nowrap">GM controlling</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-2">
              You have control of these characters until they reconnect.
            </p>
          </div>
        </div>
      )}

      {!active ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const handleClick = () => {
              if (section.navTo) {
                navigate(createPageUrl(section.navTo) + `?id=${campaignId}`);
                return;
              }
              setActive(section.key);
            };
            return (
              <button
                key={section.key}
                type="button"
                onClick={handleClick}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-left hover:bg-[#252b3d] transition-colors text-slate-300 hover:text-white"
              >
                <Icon className="w-5 h-5 text-[#37F2D1]" />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <button
            type="button"
            onClick={() => setActive(null)}
            className="flex items-center gap-2 p-3 text-sm text-slate-400 hover:text-white border-b border-slate-700/50 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Menu
            <span className="ml-auto text-xs text-slate-500">{activeLabel}</span>
          </button>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {ActivePanel && (
              <ActivePanel
                campaignId={campaignId}
                campaign={campaign}
                allUserProfiles={allUserProfiles}
                disconnectedPlayers={disconnectedPlayers}
              />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
