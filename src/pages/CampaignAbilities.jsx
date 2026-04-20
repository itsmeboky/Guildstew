import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Wand2, Plus } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = campaignIdOverride ?? params.get("id");

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Barbarian");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from("campaign_class_features")
        .insert([{
          ...payload,
          campaign_id: campaignId,
          is_system: false,
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["homebrewClassFeatures", campaignId] });
      setCreating(false);
      setSelected({ ...row, _source: "homebrew" });
      toast.success(`${row?.name || "Feature"} saved.`);
    },
    onError: (err) => toast.error(err?.message || "Failed to save feature."),
  });

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
          <Button
            onClick={() => setCreating(true)}
            size="sm"
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Feature
          </Button>
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

      <NewFeatureDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSave={(payload) => createMutation.mutate(payload)}
        saving={createMutation.isPending}
        defaultClass={selectedClass}
      />
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

// ─────────────── NewFeatureDialog ───────────────

const FEATURE_TYPES = ["Class Feature", "Racial Trait", "Feat", "General Ability"];
const FEATURE_EFFECT_TYPES = ["damage", "healing", "buff", "condition", "utility", "resource"];
const FEATURE_COSTS = ["passive", "free", "action", "bonus_action", "reaction"];
const FEATURE_USES = [
  "At Will",
  "1/Short Rest",
  "1/Long Rest",
  "2/Long Rest",
  "3/Long Rest",
  "Proficiency Bonus/Long Rest",
  "Charges",
  "Special",
];
const FEATURE_RECHARGE = ["", "short_rest", "long_rest", "dawn", "dusk", "special"];
const DAMAGE_TYPES_SHORT = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
];

function NewFeatureDialog({ open, onClose, onSave, saving, defaultClass }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classAssoc, setClassAssoc] = useState(defaultClass || "Barbarian");
  const [level, setLevel] = useState(1);
  const [type, setType] = useState("Class Feature");
  const [effectType, setEffectType] = useState("utility");
  const [cost, setCost] = useState("action");
  const [uses, setUses] = useState("At Will");
  const [recharge, setRecharge] = useState("");
  const [damageDice, setDamageDice] = useState("");
  const [damageType, setDamageType] = useState("bludgeoning");
  const [healingDice, setHealingDice] = useState("");

  // Re-seed the class default whenever the dialog reopens.
  if (open && classAssoc == null && defaultClass) setClassAssoc(defaultClass);

  const reset = () => {
    setName(""); setDescription("");
    setClassAssoc(defaultClass || "Barbarian");
    setLevel(1); setType("Class Feature");
    setEffectType("utility"); setCost("action"); setUses("At Will"); setRecharge("");
    setDamageDice(""); setDamageType("bludgeoning"); setHealingDice("");
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name the feature."); return; }
    const mechanical = {
      effect_type: effectType,
      cost,
      uses,
      recharge,
    };
    if (effectType === "damage") {
      mechanical.damage_dice = damageDice.trim();
      mechanical.damage_type = damageType;
    } else if (effectType === "healing") {
      mechanical.healing_dice = healingDice.trim();
    }
    // Payload shape mirrors campaign_class_features columns: name,
    // description, type, class_name (nullable — only meaningful for
    // Class Feature type), level, properties (full mechanical blob).
    onSave({
      name: name.trim(),
      description: description.trim(),
      type,
      class_name: type === "Class Feature" ? classAssoc : null,
      level: Number(level) || 1,
      properties: { ...mechanical, class: classAssoc },
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Class Feature</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-slate-300">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Second Wind"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEATURE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Class</Label>
              <Select value={classAssoc} onValueChange={setClassAssoc}>
                <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Level</Label>
              <Input type="number" value={level}
                onChange={(e) => setLevel(Number(e.target.value) || 1)}
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-300">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What the feature does in plain language."
              className="bg-[#0f1219] border-slate-600 text-white mt-1" />
          </div>

          <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#37F2D1]">
              Mechanical Effect
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-slate-400">Effect Type</Label>
                <Select value={effectType} onValueChange={setEffectType}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEATURE_EFFECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Action Cost</Label>
                <Select value={cost} onValueChange={setCost}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEATURE_COSTS.map((c) => (
                      <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Uses</Label>
                <Select value={uses} onValueChange={setUses}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEATURE_USES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Recharge</Label>
                <Select value={recharge || "none"} onValueChange={(v) => setRecharge(v === "none" ? "" : v)}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    {FEATURE_RECHARGE.filter(Boolean).map((r) => (
                      <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {effectType === "damage" && (
                <>
                  <div>
                    <Label className="text-[10px] text-slate-400">Damage Dice</Label>
                    <Input value={damageDice}
                      onChange={(e) => setDamageDice(e.target.value)}
                      placeholder="1d6"
                      className="bg-[#0f1219] border-slate-600 text-white mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400">Damage Type</Label>
                    <Select value={damageType} onValueChange={setDamageType}>
                      <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAMAGE_TYPES_SHORT.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {effectType === "healing" && (
                <div className="col-span-2">
                  <Label className="text-[10px] text-slate-400">Healing Dice</Label>
                  <Input value={healingDice}
                    onChange={(e) => setHealingDice(e.target.value)}
                    placeholder="1d10 + level"
                    className="bg-[#0f1219] border-slate-600 text-white mt-1" />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {saving ? "Saving…" : "Save Feature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
