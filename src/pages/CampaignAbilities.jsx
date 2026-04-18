import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Campaign Abilities tab. Merges SRD class / racial abilities with
 * campaign-custom ones (home-brewed feats, class features, etc.).
 * Same SRD vs Custom badge pattern as the Monsters and Spells tabs.
 */
export default function CampaignAbilities() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");
  const [search, setSearch] = useState("");

  // SRD class / racial abilities live in the shared dnd5e_abilities
  // reference table. Per-campaign homebrew abilities live in
  // campaign_abilities. Tag each row with _source so the UI can
  // render the right badge and gate edit/delete correctly.
  const { data: srd = [] } = useQuery({
    queryKey: ["srdAbilities"],
    queryFn: () => base44.entities.Dnd5eAbility
      .list("name")
      .then((rows) => (rows || []).map((a) => ({ ...a, _source: "srd" })))
      .catch(() => []),
    initialData: [],
  });
  const { data: custom = [] } = useQuery({
    queryKey: ["homebrewAbilities", campaignId],
    queryFn: () => base44.entities.CampaignAbility
      .filter({ campaign_id: campaignId })
      .then((rows) => (rows || []).map((a) => ({ ...a, _source: "homebrew" })))
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const merged = useMemo(() => [...srd, ...custom], [srd, custom]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged;
    if (q) {
      rows = rows.filter((a) => (a.name || "").toLowerCase().includes(q));
    }
    return rows.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [merged, search]);

  const back = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignArchives") + `?id=${campaignId}`);
  };

  return (
    <div className="min-h-screen bg-[#0f1219] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              onClick={back}
              variant="outline"
              size="sm"
              className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10 hover:text-[#37F2D1]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Archives
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[#37F2D1]" /> Abilities
            </h1>
          </div>
        </header>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search abilities…"
            className="pl-7 bg-[#1a1f2e] border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">
              No abilities match. Custom abilities are created through The Brewery's homebrew flow.
            </p>
          ) : (
            <ul className="divide-y divide-slate-700/30">
              {filtered.map((a) => (
                <li key={a.id} className="px-4 py-3 hover:bg-[#252b3d] transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{a.name}</span>
                    {a.class && (
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">{a.class}</Badge>
                    )}
                    {a.ability_level && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                        Level {a.ability_level}
                      </Badge>
                    )}
                    <span className="ml-auto">
                      {a._source === "homebrew" ? (
                        <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">Homebrew</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-300">SRD</Badge>
                      )}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
