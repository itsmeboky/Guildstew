import React, { useMemo } from "react";
import { Clock, Sparkles } from "lucide-react";
import { spellDetails as HARDCODED_SPELLS } from "@/components/dnd5e/spellData";

const LEVEL_LABELS = {
  0: "Cantrips",
  1: "1st Level",
  2: "2nd Level",
  3: "3rd Level",
  4: "4th Level",
  5: "5th Level",
  6: "6th Level",
  7: "7th Level",
  8: "8th Level",
  9: "9th Level",
};

/**
 * Best-effort spell lookup against the hardcoded SRD table. Imported
 * homebrew spells that aren't in the registry still render — we just
 * don't have metadata for them.
 */
function lookup(name) {
  if (!name) return null;
  return HARDCODED_SPELLS?.[name]
    || HARDCODED_SPELLS?.[name.toLowerCase?.()]
    || null;
}

function normalize(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    const meta = lookup(entry);
    return {
      name: entry,
      level: Number.isFinite(meta?.level) ? meta.level : null,
      school: meta?.school || null,
      castingTime: meta?.castingTime || null,
    };
  }
  const meta = lookup(entry.name);
  return {
    name: entry.name,
    level: Number.isFinite(entry.level) ? entry.level : (meta?.level ?? null),
    school: entry.school || meta?.school || null,
    castingTime: entry.casting_time || entry.castingTime || meta?.castingTime || null,
  };
}

export default function SpellsTab({ character }) {
  const groups = useMemo(() => {
    const raw = character?.spells_known
      || character?.spellsKnown
      || character?.spells_prepared
      || character?.spells
      || [];
    const list = Array.isArray(raw) ? raw : Object.values(raw || {}).flat();
    const bucket = new Map();
    for (const entry of list) {
      const norm = normalize(entry);
      if (!norm?.name) continue;
      const key = norm.level ?? "?";
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(norm);
    }
    return Array.from(bucket.entries())
      .sort(([a], [b]) => {
        if (a === "?") return 1;
        if (b === "?") return -1;
        return Number(a) - Number(b);
      });
  }, [character]);

  if (groups.length === 0) {
    return (
      <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-10 text-center text-slate-500 text-sm">
        {character?.name || "This character"} doesn't have any spells recorded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([level, spells]) => (
        <div key={level}>
          <div className="text-[11px] uppercase tracking-widest text-purple-400 font-bold border-b border-purple-500/20 pb-1 mb-2">
            {LEVEL_LABELS[level] || `Level ${level}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {spells.map((s, idx) => (
              <div
                key={`${s.name}-${idx}`}
                className="bg-[#0b1220] border border-[#1e293b] rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-bold truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    {s.school && <span className="uppercase tracking-widest">{s.school}</span>}
                    {s.castingTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.castingTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
