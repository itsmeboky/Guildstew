import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { safeText as sharedSafeText } from "@/utils/safeRender";

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

// Delegate to the shared safeText helper so every render site in the
// app goes through the same coercion — see src/utils/safeRender.js.
const safeText = sharedSafeText;

export default function CampaignSpells({ embedded = false, campaignId: campaignIdOverride } = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = campaignIdOverride ?? params.get("id");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from("spells")
        .insert([{
          ...payload,
          campaign_id: campaignId,
          is_system: false,
          source: "homebrew",
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["homebrewSpells", campaignId] });
      setCreating(false);
      setSelected({ ...row, _source: "homebrew" });
      toast.success(`${row?.name || "Spell"} saved.`);
    },
    onError: (err) => toast.error(err?.message || "Failed to save spell."),
  });

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
              <Sparkles className="w-5 h-5 text-[#37F2D1]" /> Spells
            </h1>
          </div>
          <Button
            onClick={() => setCreating(true)}
            size="sm"
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Spell
          </Button>
        </header>
      )}

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

      <NewSpellDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSave={(payload) => createMutation.mutate(payload)}
        saving={createMutation.isPending}
      />
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

// ─────────────── NewSpellDialog ───────────────

const SPELL_SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
];
const SPELL_CLASSES = [
  "Bard", "Cleric", "Druid", "Paladin", "Ranger",
  "Sorcerer", "Warlock", "Wizard", "Artificer",
];

function NewSpellDialog({ open, onClose, onSave, saving }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState(0);
  const [school, setSchool] = useState("Evocation");
  const [castingTime, setCastingTime] = useState("1 action");
  const [range, setRange] = useState("60 feet");
  const [components, setComponents] = useState({ v: true, s: true, m: false, material: "" });
  const [duration, setDuration] = useState("Instantaneous");
  const [concentration, setConcentration] = useState(false);
  const [ritual, setRitual] = useState(false);
  const [description, setDescription] = useState("");
  const [higherLevel, setHigherLevel] = useState("");
  const [classes, setClasses] = useState([]);

  const reset = () => {
    setName(""); setLevel(0); setSchool("Evocation");
    setCastingTime("1 action"); setRange("60 feet");
    setComponents({ v: true, s: true, m: false, material: "" });
    setDuration("Instantaneous");
    setConcentration(false); setRitual(false);
    setDescription(""); setHigherLevel(""); setClasses([]);
  };

  const toggleClass = (c) => {
    setClasses((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  };
  const patchComponent = (key, value) =>
    setComponents((c) => ({ ...c, [key]: value }));

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name the spell."); return; }
    // Format the V/S/M line the way the spells table expects:
    // a short uppercase letter list with an optional (material) tail.
    const letters = [];
    if (components.v) letters.push("V");
    if (components.s) letters.push("S");
    if (components.m) letters.push("M");
    const compString = letters.join(", ");
    onSave({
      name: name.trim(),
      level: Number(level) || 0,
      school,
      casting_time: castingTime.trim() || "1 action",
      range: range.trim() || "",
      components: compString + (components.m && components.material.trim() ? ` (${components.material.trim()})` : ""),
      duration: duration.trim() || "Instantaneous",
      concentration: !!concentration,
      ritual: !!ritual,
      description: description.trim(),
      higher_level: higherLevel.trim(),
      classes,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Custom Spell</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-slate-300">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Level</Label>
              <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0,1,2,3,4,5,6,7,8,9].map((l) => (
                    <SelectItem key={l} value={String(l)}>{l === 0 ? "Cantrip" : `Level ${l}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">School</Label>
              <Select value={school} onValueChange={setSchool}>
                <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPELL_SCHOOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Casting Time</Label>
              <Input value={castingTime} onChange={(e) => setCastingTime(e.target.value)}
                placeholder="1 action, 1 bonus action, 1 reaction"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Range</Label>
              <Input value={range} onChange={(e) => setRange(e.target.value)}
                placeholder="60 feet, Self, Touch, 30-ft cone"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-300">Components</Label>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {[
                { key: "v", label: "V" },
                { key: "s", label: "S" },
                { key: "m", label: "M" },
              ].map(({ key, label }) => {
                const active = !!components[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patchComponent(key, !active)}
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded border transition-colors ${
                      active
                        ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                        : "bg-[#0f1219] border-slate-600 text-slate-300 hover:border-[#37F2D1]/60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              {components.m && (
                <Input
                  value={components.material}
                  onChange={(e) => patchComponent("material", e.target.value)}
                  placeholder="Material component (e.g., a pinch of sulfur and bat guano)"
                  className="bg-[#0f1219] border-slate-600 text-white flex-1"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-300">Duration</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)}
                placeholder="Instantaneous, 1 minute, 1 hour"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-[#0f1219] border border-slate-600 rounded-lg p-2 cursor-pointer">
              <Checkbox checked={concentration} onCheckedChange={(v) => setConcentration(!!v)} />
              <span><span className="font-bold text-white">Concentration</span> — one per caster.</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-[#0f1219] border border-slate-600 rounded-lg p-2 cursor-pointer">
              <Checkbox checked={ritual} onCheckedChange={(v) => setRitual(!!v)} />
              <span><span className="font-bold text-white">Ritual</span> — +10 min, no slot.</span>
            </label>
          </div>

          <div>
            <Label className="text-xs text-slate-300">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="bg-[#0f1219] border-slate-600 text-white mt-1" />
          </div>

          <div>
            <Label className="text-xs text-slate-300">At Higher Levels</Label>
            <Textarea value={higherLevel} onChange={(e) => setHigherLevel(e.target.value)}
              rows={3}
              placeholder="When cast with a spell slot of higher level, …"
              className="bg-[#0f1219] border-slate-600 text-white mt-1" />
          </div>

          <div>
            <Label className="text-xs text-slate-300">Classes</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {SPELL_CLASSES.map((c) => {
                const active = classes.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleClass(c)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                      active
                        ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                        : "bg-[#0f1219] border-slate-600 text-slate-300 hover:border-[#37F2D1]/60"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
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
            {saving ? "Saving…" : "Save Spell"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
