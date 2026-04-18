import { useState } from "react";
import {
  ArrowLeft, Users, Package, Skull, Sparkles, BookOpen, Globe,
} from "lucide-react";
import CampaignNPCs        from "@/pages/CampaignNPCs";
import CampaignItems       from "@/pages/CampaignItems";
import CampaignMonsters    from "@/pages/CampaignMonsters";
import CampaignSpells      from "@/pages/CampaignSpells";
import CampaignAbilities   from "@/pages/CampaignAbilities";
import CampaignWorldLore   from "@/pages/CampaignWorldLore";

/**
 * Archives experience rendered inside the GM session modal. Shows
 * the six-card landing on first mount; clicking a card swaps the
 * modal body to the matching compendium page in `embedded` mode,
 * with a "Back to Archives" row on top that returns to the grid.
 *
 * The underlying pages (CampaignMonsters, CampaignSpells, …) each
 * accept an `embedded` prop that hides their own h-screen shell
 * and page-level header so they slot straight into the modal's
 * content slot.
 */
const SECTIONS = [
  { key: "npcs",           label: "NPCs",           icon: Users,    description: "Non-player characters in this campaign.",    Component: CampaignNPCs },
  { key: "items",          label: "Items",          icon: Package,  description: "Equipment, magic items, and homebrew gear.",  Component: CampaignItems },
  { key: "monsters",       label: "Monsters",       icon: Skull,    description: "Bestiary and encountered creatures.",         Component: CampaignMonsters },
  { key: "spells",         label: "Spells",         icon: Sparkles, description: "Spell reference, SRD + homebrew.",            Component: CampaignSpells },
  { key: "class_features", label: "Class Features", icon: BookOpen, description: "Class abilities organised by class.",         Component: CampaignAbilities },
  { key: "world_lore",     label: "World Lore",     icon: Globe,    description: "World history, factions, regions, and lore.", Component: CampaignWorldLore },
];

export default function CampaignArchivesContent({ campaignId }) {
  const [activeKey, setActiveKey] = useState(null);
  const activeSection = activeKey ? SECTIONS.find((s) => s.key === activeKey) : null;

  if (!activeSection) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveKey(section.key)}
                className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6 text-left hover:border-[#37F2D1]/30 transition-colors"
              >
                <Icon className="w-8 h-8 text-[#37F2D1] mb-3" />
                <h3 className="text-white font-bold">{section.label}</h3>
                <p className="text-xs text-slate-400 mt-1">{section.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const Page = activeSection.Component;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-slate-700/30 flex-shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveKey(null)}
          className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Archives
        </button>
        <span className="text-xs text-slate-500 uppercase tracking-wider">
          {activeSection.label}
        </span>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <Page embedded campaignId={campaignId} />
      </div>
    </div>
  );
}
