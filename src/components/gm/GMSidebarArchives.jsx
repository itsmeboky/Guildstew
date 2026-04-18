import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Skull, Package, Sparkles, BookOpen } from "lucide-react";

/**
 * Quick-reference mini-archives inside the GM sidebar. Read-only —
 * one unified search across SRD monsters / items / spells / class
 * features with a bucket icon on each row. Clicking a hit expands
 * a compact detail view right under it so the GM can glance at a
 * stat without leaving the session.
 */
const BUCKETS = [
  { key: "monsters",       label: "Monsters",       icon: Skull,    entity: "Dnd5eMonster"  },
  { key: "items",          label: "Items",          icon: Package,  entity: "Dnd5eItem"     },
  { key: "spells",         label: "Spells",         icon: Sparkles, entity: "Dnd5eSpell"    },
  { key: "class_features", label: "Class Features", icon: BookOpen, entity: "Dnd5eAbility"  },
];

function loadBucket(entity) {
  return base44.entities[entity].list("name").catch(() => []);
}

export default function GMSidebarArchives() {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("monsters");
  const [opened, setOpened] = useState(null);

  const active = BUCKETS.find((b) => b.key === bucket);

  const { data = [], isLoading } = useQuery({
    queryKey: ["gmSidebarArchives", bucket],
    queryFn: () => loadBucket(active.entity),
    staleTime: 5 * 60_000,
    initialData: [],
  });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.slice(0, 20);
    return data
      .filter((r) => String(r?.name || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [data, query]);

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-2">Quick Reference</h3>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full pl-7 bg-[#0f1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-4 gap-1 mb-3">
        {BUCKETS.map((b) => {
          const Icon = b.icon;
          const activeBucket = bucket === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => { setBucket(b.key); setOpened(null); }}
              className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg border text-[10px] transition-colors ${
                activeBucket
                  ? "border-[#37F2D1] bg-[#37F2D1]/10 text-[#37F2D1]"
                  : "border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {b.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-xs italic">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="text-slate-500 text-xs italic">No matches.</p>
      ) : (
        <ul className="divide-y divide-slate-700/30 bg-[#0f1219] border border-slate-700/40 rounded-lg overflow-hidden">
          {matches.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpened(opened === row.id ? null : row.id)}
                className="w-full text-left px-3 py-2 hover:bg-[#252b3d] transition-colors"
              >
                <span className="text-sm text-white">{String(row?.name || "")}</span>
              </button>
              {opened === row.id && (
                <div className="px-3 pb-3 text-xs text-slate-300 space-y-1">
                  {row?.description && (
                    <p className="whitespace-pre-wrap">{String(row.description)}</p>
                  )}
                  {row?.stats?.challenge_rating != null && <p>CR {row.stats.challenge_rating}</p>}
                  {row?.level != null && <p>Level {row.level}</p>}
                  {row?.type && <p>Type: {String(row.type)}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
