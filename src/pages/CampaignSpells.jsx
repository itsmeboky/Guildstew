import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Campaign Spells tab. Merges SRD spells (is_system=true) with
 * campaign-custom ones (is_system=false, filtered by campaign_id).
 * Kept minimal on purpose — this is the entry point for the
 * feature; editing custom spells still flows through the Brewery
 * homebrew creator.
 */
export default function CampaignSpells() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  // SRD spells live in the shared dnd5e_spells reference table;
  // per-campaign homebrew spells live in the `spells` table. Tag
  // each row with _source so the UI renders the right badge.
  const { data: srd = [] } = useQuery({
    queryKey: ["srdSpells"],
    queryFn: () => base44.entities.Dnd5eSpell
      .list("name")
      .then((rows) => (rows || []).map((s) => ({ ...s, _source: "srd" })))
      .catch(() => []),
    initialData: [],
  });
  const { data: custom = [] } = useQuery({
    queryKey: ["homebrewSpells", campaignId],
    queryFn: () => base44.entities.Spell
      .filter({ campaign_id: campaignId })
      .then((rows) => (rows || []).map((s) => ({ ...s, _source: "homebrew" })))
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const merged = useMemo(() => [...srd, ...custom], [srd, custom]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged;
    if (levelFilter !== "all") {
      rows = rows.filter((s) => String(s.level ?? "0") === levelFilter);
    }
    if (q) {
      rows = rows.filter((s) => (s.name || "").toLowerCase().includes(q));
    }
    return rows.slice().sort((a, b) => {
      const la = Number(a.level || 0);
      const lb = Number(b.level || 0);
      if (la !== lb) return la - lb;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [merged, search, levelFilter]);

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
              <Sparkles className="w-5 h-5 text-[#37F2D1]" /> Spells
            </h1>
          </div>
        </header>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search spells…"
              className="pl-7 bg-[#1a1f2e] border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-1">
            {["all", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-1 rounded text-xs font-bold ${
                  levelFilter === lvl
                    ? "bg-[#37F2D1]/15 text-[#37F2D1]"
                    : "bg-[#1a1f2e] text-slate-400 hover:text-white"
                }`}
              >
                {lvl === "all" ? "All" : lvl === "0" ? "Cantrip" : lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">
              No spells match. Custom spells are created through The Brewery's homebrew flow.
            </p>
          ) : (
            <ul className="divide-y divide-slate-700/30">
              {filtered.map((s) => (
                <li key={s.id} className="px-4 py-3 hover:bg-[#252b3d] transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{s.name}</span>
                    <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                      {Number(s.level || 0) === 0 ? "Cantrip" : `Level ${s.level}`}
                    </Badge>
                    {s.school && (
                      <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300">
                        {s.school}
                      </Badge>
                    )}
                    <span className="ml-auto">
                      {s._source === "homebrew" ? (
                        <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">Homebrew</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-300">SRD</Badge>
                      )}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</p>
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
