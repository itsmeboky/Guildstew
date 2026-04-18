import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Users, Package, Skull, Sparkles, BookOpen, Globe,
} from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * Archives entry point inside the session modal. Renders the
 * six-card landing so the GM can pick a category without closing
 * the modal. Each card navigates to the standalone page (Monsters,
 * Items, Spells, etc.), which carries its own "Back to Session"
 * button thanks to the session-active check in CampaignArchives
 * and friends. Keeping the navigation out-of-modal avoids the
 * deep rewrite of cloning every split-view page into an embeddable
 * shell.
 */
const SECTIONS = [
  { key: "npcs",           label: "NPCs",           icon: Users,    page: "CampaignNPCs",      description: "Non-player characters in this campaign." },
  { key: "items",          label: "Items",          icon: Package,  page: "CampaignItems",     description: "Equipment, magic items, and homebrew gear." },
  { key: "monsters",       label: "Monsters",       icon: Skull,    page: "CampaignMonsters",  description: "Bestiary and encountered creatures." },
  { key: "spells",         label: "Spells",         icon: Sparkles, page: "CampaignSpells",    description: "Spell reference, SRD + homebrew." },
  { key: "class_features", label: "Class Features", icon: BookOpen, page: "CampaignAbilities", description: "Class abilities organised by class." },
  { key: "world_lore",     label: "World Lore",     icon: Globe,    page: "CampaignWorldLore", description: "World history, factions, regions, and lore." },
];

export default function CampaignArchivesContent({ campaignId, onClose }) {
  const navigate = useNavigate();

  const open = (section) => {
    onClose?.();
    navigate(createPageUrl(section.page) + `?id=${campaignId}`);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => open(section)}
              className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6 text-left hover:border-[#37F2D1]/30 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className="w-6 h-6 text-[#37F2D1]" />
                <h3 className="text-lg font-bold text-white">{section.label}</h3>
              </div>
              <p className="text-sm text-slate-400">{section.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-[#37F2D1]">
                Open page <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 italic mt-6">
        Archives pages keep the session alive. Use &quot;Back to Session&quot; on each page to return here.
      </p>
    </div>
  );
}
