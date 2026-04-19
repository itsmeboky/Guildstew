import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Campaign Class Features tab. Split-panel layout — the selected
 * feature's detail on the left, a class selector + feature list on
 * the right. SRD class features live in the shared
 * dnd5e_class_features reference table; per-campaign homebrew
 * features live in campaign_class_features. Each row gets a
 * _source tag so we can render
 * the SRD vs Homebrew badge and respect read-only SRD rules.
 *
 * Filtering keys off `source_class` (new SRD schema) with a
 * fallback to `class` / `classes[]` for older shapes so this keeps
 * rendering even if the reseed hasn't landed yet.
 */

const CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
];

const CLASS_ICON_MAP = {
  Barbarian: "a6652f2d8_Barbarian1.png",
  Bard:      "cbe7f7dba_Bard1.png",
  Cleric:    "15fe6ef24_Cleric1.png",
  Druid:     "ef43c9ff2_Druid1.png",
  Fighter:   "5e1b2cd68_Fighter1.png",
  Monk:      "f2e85e13a_Monk1.png",
  Paladin:   "1eb7cd2f2_Paladin1.png",
  Ranger:    "748e5be38_Ranger1.png",
  Rogue:     "a66f2aac1_Rogue1.png",
  Sorcerer:  "6f5b501db_Sorceror1.png",
  Warlock:   "184c98268_Warlock1.png",
  Wizard:    "94cfaa28a_Wizard1.png",
};

const CLASS_ICON_BASE =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes";

function getClassIconUrl(cls) {
  const file = CLASS_ICON_MAP[cls];
  return file ? `${CLASS_ICON_BASE}/${file}` : null;
}

function safeText(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(safeText).filter(Boolean).join(", ");
  return "";
}

function featureClasses(feature) {
  // Newer schema: `source_class` or `source_classes[]`. Older shape
  // used `class` (string) or `classes[]`.
  const raw =
    feature?.source_class
    ?? feature?.source_classes
    ?? feature?.class
    ?? feature?.classes
    ?? "";
  if (Array.isArray(raw)) return raw.map((c) => safeText(c)).filter(Boolean);
  const str = safeText(raw);
  if (!str) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function featureMatchesClass(feature, cls) {
  const list = featureClasses(feature);
  if (!list.length) return false;
  return list.some((c) => c.toLowerCase() === cls.toLowerCase());
}

function featureActionType(feature) {
  return safeText(
    feature?.action_type
    ?? feature?.ability_type
    ?? feature?.type
    ?? "",
  );
}

function featureLevel(feature) {
  return feature?.ability_level ?? feature?.level ?? null;
}

export default function CampaignAbilities({ embedded = false, campaignId: campaignIdOverride } = {}) {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const campaignId = campaignIdOverride ?? params.get("id");

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Barbarian");
  const [selected, setSelected] = useState(null);

  const { data: srd = [] } = useQuery({
    queryKey: ["srdClassFeatures"],
    queryFn: () => base44.entities.Dnd5eClassFeature
      .list("name")
      .then((rows) => (rows || []).map((a) => ({ ...a, _source: "srd" })))
      .catch(() => []),
    initialData: [],
  });
  const { data: custom = [] } = useQuery({
    queryKey: ["homebrewClassFeatures", campaignId],
    queryFn: () => base44.entities.CampaignClassFeature
      .filter({ campaign_id: campaignId })
      .then((rows) => (rows || []).map((a) => ({ ...a, _source: "homebrew" })))
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const merged = useMemo(() => [...srd, ...custom], [srd, custom]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged.filter((f) => featureMatchesClass(f, selectedClass));
    if (q) {
      rows = rows.filter((f) =>
        safeText(f.name).toLowerCase().includes(q)
        || safeText(f.description).toLowerCase().includes(q),
      );
    }
    return rows.slice().sort((a, b) => {
      const la = Number(featureLevel(a) || 0);
      const lb = Number(featureLevel(b) || 0);
      if (la !== lb) return la - lb;
      return safeText(a.name).localeCompare(safeText(b.name));
    });
  }, [merged, search, selectedClass]);

  const back = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignArchives") + `?id=${campaignId}`);
  };

  return (
    <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col overflow-hidden bg-[#0f1219] text-white`}>
      {!embedded && (
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
              <Wand2 className="w-5 h-5 text-[#37F2D1]" /> Class Features
            </h1>
          </div>
        </header>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden px-6 pb-6 min-h-0">
        {/* Left: feature detail */}
        <div className="w-1/2 overflow-y-auto border border-slate-700/50 rounded-lg bg-[#1a1f2e]">
          {selected ? (
            <FeatureDetail feature={selected} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 italic text-sm p-6 text-center">
              Select a class feature to view its description.
            </div>
          )}
        </div>

        {/* Right: class selector + feature list */}
        <div className="w-1/2 flex flex-col overflow-hidden min-h-0">
          <div className="flex-shrink-0 mb-3 space-y-2">
            {/* 12 classes laid out as 3 rows of 4 — bigger icons,
                stacked label below for symmetry. */}
            <div className="grid grid-cols-4 gap-3">
              {CLASSES.map((cls) => {
                const icon = getClassIconUrl(cls);
                const active = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => { setSelectedClass(cls); setSelected(null); }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                      active
                        ? "border-[#37F2D1] bg-[#37F2D1]/10 text-[#37F2D1]"
                        : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                    }`}
                  >
                    {icon && (
                      <img
                        src={icon}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    <span className="text-xs font-semibold">{cls}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${selectedClass} features…`}
                className="pl-7 bg-[#0f1219] border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-12 text-center">
                <p className="text-sm text-slate-500 italic">
                  No {selectedClass} features match. Homebrew features are created through The Brewery&apos;s flow.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/30 bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden">
                {filtered.map((feature) => (
                  <FeatureRow
                    key={`${feature._source}-${feature.id}`}
                    feature={feature}
                    selectedClass={selectedClass}
                    selected={selected?.id === feature.id && selected?._source === feature._source}
                    onClick={() => setSelected(feature)}
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

function FeatureRow({ feature, selectedClass, selected, onClick }) {
  const isHomebrew = feature._source === "homebrew";
  const actionType = featureActionType(feature);
  const level = featureLevel(feature);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-4 py-3 transition-colors ${
          selected ? "bg-[#252b3d]" : "hover:bg-[#252b3d]"
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold">{safeText(feature.name)}</span>
          {level != null && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
              Level {level}
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
        <div className="text-xs text-slate-400 mt-1">
          {[actionType, selectedClass].filter(Boolean).join(" · ")}
        </div>
        {feature.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{safeText(feature.description)}</p>
        )}
      </button>
    </li>
  );
}

function FeatureDetail({ feature }) {
  const isHomebrew = feature._source === "homebrew";
  const actionType = featureActionType(feature);
  const level = featureLevel(feature);
  const classes = featureClasses(feature);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">{safeText(feature.name)}</h2>
        <p className="text-sm text-slate-400 italic">
          {[classes.join(" / "), actionType, level != null ? `Level ${level}` : ""]
            .filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {isHomebrew ? (
            <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">Homebrew</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-300">SRD</Badge>
          )}
        </div>
      </div>

      {feature.description && (
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {safeText(feature.description)}
        </p>
      )}

      {feature.usage && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-1">Usage</h3>
          <p className="text-sm text-slate-200">{safeText(feature.usage)}</p>
        </div>
      )}
    </div>
  );
}
