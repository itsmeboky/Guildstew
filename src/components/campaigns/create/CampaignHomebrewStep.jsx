import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Search, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Step 3 — optional homebrew browser. Shows a quick search over
 * every published brew so the GM can pre-stage a few rules / items
 * before the campaign even exists. The actual install happens after
 * the campaign is saved (the campaign row needs an id first) — here
 * we just remember the chosen brew ids on `data.initial_homebrew`
 * and the mutation in CreateCampaign wires them up post-create.
 */
export default function CampaignHomebrewStep({ data, onChange }) {
  const [query, setQuery] = useState("");

  const { data: brews = [], isLoading } = useQuery({
    queryKey: ["brewery", "published"],
    queryFn: () => base44.entities.HomebrewRule
      .filter({ is_published: true }, "-created_at", 100)
      .catch(() => []),
    initialData: [],
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brews.slice(0, 30);
    return brews
      .filter((b) => (
        (b.title || "").toLowerCase().includes(q)
        || (b.description || "").toLowerCase().includes(q)
        || (Array.isArray(b.tags) && b.tags.some((t) => (t || "").toLowerCase().includes(q)))
      ))
      .slice(0, 30);
  }, [brews, query]);

  const selectedIds = Array.isArray(data.initial_homebrew) ? data.initial_homebrew : [];
  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange({ initial_homebrew: selectedIds.filter((x) => x !== id) });
    } else {
      onChange({ initial_homebrew: [...selectedIds, id] });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-[#37F2D1]" />
          Homebrew (Optional)
        </h2>
        <p className="text-sm text-gray-400">
          Would you like to install any homebrew before starting? Pick a few brews
          from The Brewery now, or skip and add them later.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brews by title, description, or tag"
          className="pl-9 bg-[#1E2430] border-gray-700 text-white"
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="text-xs text-[#37F2D1]">
          {selectedIds.length} brew{selectedIds.length === 1 ? "" : "s"} queued to install on create.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 italic text-center py-10">Loading brews…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 italic text-center py-10">
          No brews match — refine your search or skip this step.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
          {filtered.map((brew) => {
            const selected = selectedIds.includes(brew.id);
            return (
              <li key={brew.id}>
                <button
                  type="button"
                  onClick={() => toggle(brew.id)}
                  className={`w-full text-left bg-[#0b1220] border rounded-lg p-3 transition-colors ${
                    selected
                      ? "border-[#37F2D1] ring-1 ring-[#37F2D1]"
                      : "border-slate-700 hover:border-[#37F2D1]/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {brew.cover_image_url ? (
                      <img src={brew.cover_image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-800 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{brew.title}</div>
                      <div className="text-[10px] text-slate-400">{brew.category || "Homebrew"}</div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-[#37F2D1]" />}
                  </div>
                  {brew.description && (
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{brew.description}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
