import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, LogOut, Users, StickyNote, Archive, FileText, Trophy,
} from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * Sidebar pinned to the left of the GM session panel. Two things
 * sit at the top — a subtle "Back to Campaign" link and a prominent
 * red "End Session" button — followed by the in-session tool links.
 * Back to Campaign is intentionally low-key so a GM reaching for
 * the big red End Session button doesn't accidentally abandon
 * session state.
 */
export default function GMSessionSidebar({ campaignId, onEndSession }) {
  const navigate = useNavigate();
  const q = campaignId ? `?id=${campaignId}` : "";

  const items = [
    { name: "Adventuring Party", icon: Users,      path: createPageUrl("AdventuringParty") + q },
    { name: "Quick Notes",       icon: StickyNote, path: createPageUrl("QuickNotes") + q },
    { name: "Campaign Archives", icon: Archive,    path: createPageUrl("CampaignArchives") + q },
    { name: "Campaign Updates",  icon: FileText,   path: createPageUrl("CampaignUpdates") + q },
    { name: "Achievements",      icon: Trophy,     path: createPageUrl("Achievements") },
  ];

  const handleBackToCampaign = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignGMPanel") + q);
  };

  return (
    <aside className="w-56 flex-shrink-0 bg-[#050816] border-r border-[#1e293b] flex flex-col">
      <div className="px-3 pt-4 pb-3 border-b border-[#1e293b] space-y-2">
        <button
          type="button"
          onClick={handleBackToCampaign}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:text-[#37F2D1] transition-colors"
          title="Return to the campaign dashboard without ending the session"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Campaign
        </button>
        <button
          type="button"
          onClick={onEndSession}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg py-2 transition-colors"
          title="End the session and close the GM panel"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-[#37F2D1] hover:bg-[#0b1220] transition-colors"
            >
              <Icon className="w-4 h-4 text-[#37F2D1]" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
