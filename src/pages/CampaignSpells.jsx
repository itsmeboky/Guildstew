import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Campaign Spells tab. Split-panel layout: the selected spell's
 * detail sits on the left, the filter/list on the right, and the
 * page itself never scrolls (only the two panes do). Merges SRD
 * spells (dnd5e_spells) with campaign homebrew (spells table).
 *
 * Spell icons are served by name from Supabase storage at
 * campaign-assets/dnd5e/spells/<Name>.png. Icons quietly hide when
 * the object doesn't exist.
 */
const SUPABASE_SPELL_ICON_PATH =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/spells";

function getSpellIconUrl(spell) {
  if (!spell?.name) return null;
  return `${SUPABASE_SPELL_ICON_PATH}/${encodeURIComponent(spell.name)}.png`;
}

function levelLabel(level) {
  return Number(level || 0) === 0 ? "Cantrip" : `Level ${level}`;
}

function safeText(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(safeText).filter(Boolean).join(", ");
  return "";
}

export default function CampaignSpells() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selected, setSelected] = useState(null);

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
      rows = rows.filter((s) => safeText(s.name).toLowerCase().includes(q));
    }
    return rows.slice().sort((a, b) => {
      const la = Number(a.level || 0);
      const lb = Number(b.level || 0);
      if (la !== lb) return la - lb;
      return safeText(a.name).localeCompare(safeText(b.name));
    });
  }, [merged, search, levelFilter]);

  const back = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignArchives") + `?id=${campaignId}`);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0f1219] text-white">
      <header className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0 flex-wrap">
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

      <div className="flex-1 flex gap-4 overflow-hidden px-6 pb-6 min-h-0">
        {/* Left: spell detail */}
        <div className="w-1/2 overflow-y-auto border border-slate-700/50 rounded-lg bg-[#1a1f2e]">
          {selected ? (
            <SpellDetail spell={selected} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 italic text-sm p-6 text-center">
              Select a spell to view its description.
            </div>
          )}
        </div>

        {/* Right: filter + list */}
        <div className="w-1/2 flex flex-col overflow-hidden min-h-0">
          <div className="flex-shrink-0 mb-3 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search spells…"
                className="pl-7 bg-[#1a1f2e] border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
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

          <div className="flex-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-12 text-center">
                <p className="text-sm text-slate-500 italic">
                  No spells match. Custom spells are created through The Brewery&apos;s homebrew flow.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/30 bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden">
                {filtered.map((s) => (
                  <SpellRow
                    key={`${s._source}-${s.id}`}
                    spell={s}
                    selected={selected?.id === s.id && selected?._source === s._source}
                    onClick={() => setSelected(s)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpellRow({ spell, selected, onClick }) {
  const icon = getSpellIconUrl(spell);
  const isHomebrew = spell._source === "homebrew";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
          selected ? "bg-[#252b3d]" : "hover:bg-[#252b3d]"
        }`}
      >
        {icon ? (
          <img
            src={icon}
            alt=""
            className="w-10 h-10 rounded object-cover flex-shrink-0 bg-[#0f1219]"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-10 h-10 rounded bg-[#0f1219] flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold truncate">{safeText(spell.name)}</span>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
              {levelLabel(spell.level)}
            </Badge>
            {spell.school && (
              <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300">
                {safeText(spell.school)}
              </Badge>
            )}
            <span className="ml-auto">
              {isHomebrew ? (
                <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">Homebrew</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-300">SRD</Badge>
              )}
            </span>
          </div>
          {spell.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{safeText(spell.description)}</p>
          )}
        </div>
      </button>
    </li>
  );
}

function SpellDetail({ spell }) {
  const icon = getSpellIconUrl(spell);
  const isHomebrew = spell._source === "homebrew";
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start gap-4">
        {icon ? (
          <img
            src={icon}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-[#0f1219] border border-slate-700/60"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white">{safeText(spell.name)}</h2>
          <p className="text-sm text-slate-400 italic">
            {levelLabel(spell.level)}{spell.school ? ` · ${safeText(spell.school)}` : ""}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {isHomebrew ? (
              <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">Homebrew</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-300">SRD</Badge>
            )}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <StatRow label="Casting Time" value={safeText(spell.casting_time)} />
        <StatRow label="Range"        value={safeText(spell.range)} />
        <StatRow label="Components"   value={componentText(spell)} />
        <StatRow label="Duration"     value={safeText(spell.duration)} />
        <StatRow label="Ritual"       value={spell.ritual ? "Yes" : ""} />
        <StatRow label="Concentration" value={spell.concentration ? "Yes" : ""} />
        <StatRow label="Classes"      value={safeText(spell.classes)} />
      </dl>

      {spell.description && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-1">Description</h3>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {safeText(spell.description)}
          </p>
        </div>
      )}

      {spell.higher_level && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-1">At Higher Levels</h3>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {safeText(spell.higher_level)}
          </p>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-white">{value}</dd>
    </>
  );
}

function componentText(spell) {
  const parts = [];
  if (Array.isArray(spell.components)) parts.push(spell.components.join(", "));
  else if (spell.components) parts.push(safeText(spell.components));
  if (spell.material) parts.push(`(${safeText(spell.material)})`);
  return parts.join(" ");
}
