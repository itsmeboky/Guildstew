import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Code, Eye, RotateCcw, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { uploadFile } from "@/utils/uploadFile";
import { getRule } from "@/components/dnd5e/dnd5eRules";
import { supabase } from "@/api/supabaseClient";

/**
 * Rule Modification creation / edit dialog. Drives a homebrew_rules
 * row through base44.entities.HomebrewRule, storing only the changed
 * rule values (the delta from MODIFIABLE_RULES) in `modifications`.
 *
 * Guided UI mirrors HouseRulesPanel so GMs see the same controls they
 * already know. A JSON preview / edit toggle exposes the raw object
 * for power users.
 *
 * Props:
 *   open     — boolean, whether the dialog is open
 *   onClose  — close handler (also called after a successful save)
 *   brew     — existing homebrew_rules row to edit (optional). When
 *              null/undefined the dialog is in create mode.
 */
export default function CreateHomebrewDialog({ open, onClose, brew = null }) {
  const queryClient = useQueryClient();
  const isEditMode = !!brew?.id;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("combat_rules");
  const [gameSystem, setGameSystem] = useState("dnd5e");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Modifications delta — only contains rules that differ from default.
  const [modifications, setModifications] = useState({});
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("{}");
  const [jsonError, setJsonError] = useState(null);

  // Populate state whenever the dialog opens / the brew prop changes.
  useEffect(() => {
    if (!open) return;
    setTitle(brew?.title || "");
    setCategory(brew?.category || "combat_rules");
    setGameSystem(brew?.game_system || "dnd5e");
    setDescription(brew?.description || "");
    setVersion(brew?.version || "1.0.0");
    setTags(Array.isArray(brew?.tags) ? brew.tags : []);
    setTagDraft("");
    setCoverImageUrl(brew?.cover_image_url || "");
    setModifications(
      brew?.modifications && typeof brew.modifications === "object" && !Array.isArray(brew.modifications)
        ? JSON.parse(JSON.stringify(brew.modifications))
        : {},
    );
    setShowJson(false);
    setJsonError(null);
  }, [open, brew]);

  // Keep the JSON draft in sync with modifications whenever the raw
  // view is hidden, so flipping it open doesn't lose recent edits.
  useEffect(() => {
    setJsonDraft(JSON.stringify(modifications, null, 2));
  }, [modifications]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (!description.trim()) throw new Error("Description is required");

      // Pull current auth user for creator_id.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");
      const userId = authData.user.id;

      const payload = {
        creator_id: userId,
        title: title.trim(),
        description: description.trim(),
        category,
        game_system: gameSystem,
        version: version || "1.0.0",
        cover_image_url: coverImageUrl || null,
        tags,
        modifications,
      };
      if (isEditMode) {
        return base44.entities.HomebrewRule.update(brew.id, payload);
      }
      return base44.entities.HomebrewRule.create({ ...payload, is_published: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBrews"] });
      queryClient.invalidateQueries({ queryKey: ["homebrewMeta"] });
      toast.success(isEditMode ? "Homebrew updated" : "Homebrew created");
      onClose?.();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to save homebrew");
      console.error(err);
    },
  });

  // Image upload. Files land in campaign-assets/homebrew/<filename>.
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "campaign-assets", "homebrew");
      setCoverImageUrl(file_url);
    } catch (err) {
      toast.error("Image upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Tag input — enter to add, × on chip to remove. Dedupe + trim on add.
  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) { setTagDraft(""); return; }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  // Commit a JSON-draft edit. Validates parse + shape.
  const applyJsonDraft = () => {
    try {
      const parsed = JSON.parse(jsonDraft || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Top-level value must be an object");
      }
      setModifications(parsed);
      setJsonError(null);
    } catch (err) {
      setJsonError(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Homebrew" : "Create Homebrew"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Flanking Gives +2 To Hit"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
              <Field label="Category">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combat_rules">Combat Rules</SelectItem>
                    <SelectItem value="rest_rules">Rest Rules</SelectItem>
                    <SelectItem value="character_rules">Character Rules</SelectItem>
                    <SelectItem value="spell_modifiers">Spellcasting Rules</SelectItem>
                    <SelectItem value="class_modifiers">Class Modifiers</SelectItem>
                    <SelectItem value="item_rules">Item Rules</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Game System">
                <Select value={gameSystem} onValueChange={setGameSystem}>
                  <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dnd5e">D&D 5e</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Version">
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            </div>

            <Field label="Description" required>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what this rule does and how it changes gameplay..."
                rows={4}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>

            <Field label="Cover Image">
              <div className="flex items-center gap-3">
                {coverImageUrl && (
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-20 h-20 rounded-lg object-cover border border-slate-700"
                  />
                )}
                <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
                  <Upload className="w-3 h-3" />
                  {uploading ? "Uploading..." : coverImageUrl ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>

            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 bg-[#37F2D1]/20 border border-[#37F2D1]/50 text-[#37F2D1] text-xs font-semibold px-2 py-0.5 rounded-full"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                }}
                placeholder="Type a tag and press Enter"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </Section>

          <Section
            title="Modifications"
            action={
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-2 py-1 text-slate-300"
              >
                {showJson ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                {showJson ? "Guided UI" : "Preview JSON"}
              </button>
            }
          >
            <p className="text-xs text-slate-400 mb-3">
              Toggle any rule you want this homebrew to change. Only the values you alter are stored.
            </p>
            {showJson ? (
              <div className="space-y-2">
                <Textarea
                  value={jsonDraft}
                  onChange={(e) => { setJsonDraft(e.target.value); setJsonError(null); }}
                  rows={14}
                  className="font-mono text-xs bg-[#050816] border-slate-700 text-[#37F2D1]"
                />
                {jsonError && (
                  <p className="text-[11px] text-red-400">JSON error: {jsonError}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyJsonDraft}
                >
                  Apply JSON
                </Button>
              </div>
            ) : (
              <ModificationsEditor
                modifications={modifications}
                setModifications={setModifications}
              />
            )}
          </Section>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {saveMutation.isPending ? "Saving..." : isEditMode ? "Save Changes" : "Create Homebrew"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, action }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#37F2D1]">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div>
      <Label className="block mb-1 text-xs text-slate-300 font-semibold">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Modifications editor — mirrors HouseRulesPanel controls but binds
// to a local `modifications` object that only holds deltas. This is
// the JSON that gets persisted on the homebrew row.
// ─────────────────────────────────────────────

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function setPath(root, path, value) {
  const keys = path.split(".");
  const next = clone(root);
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cursor[keys[i]] || typeof cursor[keys[i]] !== "object") cursor[keys[i]] = {};
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
  return next;
}

function clearPath(root, path) {
  const keys = path.split(".");
  const next = clone(root);
  const trail = [];
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cursor[keys[i]] || typeof cursor[keys[i]] !== "object") return next;
    trail.push([cursor, keys[i]]);
    cursor = cursor[keys[i]];
  }
  delete cursor[keys[keys.length - 1]];
  for (let i = trail.length - 1; i >= 0; i--) {
    const [parent, key] = trail[i];
    if (parent[key] && typeof parent[key] === "object" && Object.keys(parent[key]).length === 0) {
      delete parent[key];
    } else {
      break;
    }
  }
  return next;
}

function hasPath(root, path) {
  const keys = path.split(".");
  let cursor = root;
  for (const key of keys) {
    if (cursor && typeof cursor === "object" && key in cursor) cursor = cursor[key];
    else return false;
  }
  return true;
}

// Same row catalog as HouseRulesPanel. Kept duplicated so the two
// editors can evolve independently — the mod editor may eventually
// expose fields the settings panel doesn't.
const SECTIONS = [
  {
    key: "combat",
    title: "Combat Rules",
    rows: [
      { path: "combat.flanking.enabled", label: "Flanking", control: "toggle" },
      { path: "combat.flanking.bonus", label: "Flanking bonus", control: "number", min: 0, max: 5 },
      { path: "combat.flanking.grants_advantage", label: "Flanking grants advantage", control: "toggle" },
      { path: "combat.critical_hits", label: "Critical hit formula", control: "crit_hit_radio" },
      { path: "combat.critical_fumbles.enabled", label: "Critical fumbles", control: "toggle" },
      { path: "combat.death_saves.dc", label: "Death save DC", control: "number", min: 5, max: 20 },
      { path: "combat.death_saves.visible_to_party", label: "Death saves visible to party", control: "toggle" },
      { path: "combat.initiative.dex_tiebreaker", label: "DEX tiebreaker on initiative", control: "toggle" },
      { path: "combat.initiative.group_initiative", label: "Group initiative", control: "toggle" },
      { path: "combat.opportunity_attacks.enabled", label: "Opportunity attacks enabled", control: "toggle" },
      { path: "combat.healing_potions.action_cost", label: "Healing potion cost", control: "radio_string", options: [
        { value: "action", label: "Action (default)" },
        { value: "bonus", label: "Bonus Action (self)" },
      ]},
    ],
  },
  {
    key: "resting",
    title: "Rest Rules",
    rows: [
      { path: "resting.short_rest_minutes", label: "Short rest duration (minutes)", control: "number", min: 1, max: 1440 },
      { path: "resting.long_rest_hours", label: "Long rest duration (hours)", control: "number", min: 1, max: 168 },
      { path: "resting.full_hp_on_long_rest", label: "Full HP on long rest", control: "toggle" },
      { path: "resting.gritty_realism", label: "Gritty Realism", control: "toggle" },
      { path: "resting.epic_heroism", label: "Epic Heroism", control: "toggle" },
    ],
  },
  {
    key: "character",
    title: "Character Rules",
    rows: [
      { path: "character.stat_generation", label: "Stat generation", control: "radio_string", options: [
        { value: "standard_array", label: "Standard Array" },
        { value: "point_buy", label: "Point Buy" },
        { value: "roll_4d6_drop_lowest", label: "Roll 4d6 Drop Lowest" },
      ]},
      { path: "character.hp_on_level_up", label: "HP on level up", control: "radio_string", options: [
        { value: "average", label: "Average" },
        { value: "roll", label: "Roll" },
        { value: "max_first_then_roll", label: "Max at 1st, Roll after" },
      ]},
      { path: "character.multiclass_allowed", label: "Multiclassing allowed", control: "toggle" },
      { path: "character.feats_allowed", label: "Feats allowed", control: "toggle" },
      { path: "character.encumbrance_variant", label: "Variant encumbrance", control: "toggle" },
    ],
  },
  {
    key: "spellcasting",
    title: "Spellcasting Rules",
    rows: [
      { path: "spellcasting.component_tracking", label: "Track material components", control: "toggle" },
      { path: "spellcasting.identify_before_counterspell", label: "Identify before Counterspell", control: "toggle" },
      { path: "spellcasting.spell_points_variant", label: "Spell points variant", control: "toggle" },
    ],
  },
];

function resolveCritHitMode(mods) {
  const val = getRule(mods, "combat.critical_hits") || {};
  if (val.max_all) return "max_all";
  if (val.max_first_roll_second) return "max_first_roll_second";
  if (val.double_dice === true) return "double_dice";
  return null; // not set in delta
}

function applyCritHitMode(mods, mode) {
  const next = clone(mods || {});
  if (!next.combat) next.combat = {};
  next.combat.critical_hits = {
    double_dice: mode === "double_dice",
    max_first_roll_second: mode === "max_first_roll_second",
    max_all: mode === "max_all",
  };
  return next;
}

function ModificationsEditor({ modifications, setModifications }) {
  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => (
        <div key={section.key} className="bg-[#050816] border border-[#1e293b] rounded-lg p-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">
            {section.title}
          </h4>
          <div className="divide-y divide-[#1e293b]">
            {section.rows.map((row) => (
              <ModRow
                key={row.path}
                row={row}
                modifications={modifications}
                onSet={(path, value) => setModifications(setPath(modifications, path, value))}
                onClear={(path) => setModifications(clearPath(modifications, path))}
                onApplyCritMode={(mode) => setModifications(applyCritHitMode(modifications, mode))}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModRow({ row, modifications, onSet, onClear, onApplyCritMode }) {
  if (row.control === "crit_hit_radio") {
    const mode = resolveCritHitMode(modifications);
    const modified = hasPath(modifications, "combat.critical_hits");
    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">{row.label}</span>
            {modified && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Changed</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroup
            value={mode || ""}
            onValueChange={onApplyCritMode}
            className="flex flex-col gap-0.5"
          >
            {[
              { value: "double_dice", label: "Double Dice" },
              { value: "max_first_roll_second", label: "Max First, Roll Second" },
              { value: "max_all", label: "Maximize All" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem id={`mod-crit-${opt.value}`} value={opt.value} />
                <Label htmlFor={`mod-crit-${opt.value}`} className="text-xs text-slate-200">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {modified && (
            <button
              type="button"
              className="text-slate-400 hover:text-white"
              onClick={() => onClear("combat.critical_hits")}
              title="Revert to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const defaultVal = getRule({}, row.path);
  const currentVal = getRule(modifications, row.path);
  const modified = hasPath(modifications, row.path);
  const displayVal = modified ? currentVal : defaultVal;

  let control;
  if (row.control === "toggle") {
    control = (
      <Switch
        checked={!!displayVal}
        onCheckedChange={(checked) => onSet(row.path, checked)}
      />
    );
  } else if (row.control === "number") {
    control = (
      <Input
        type="number"
        min={row.min}
        max={row.max}
        value={displayVal ?? 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onSet(row.path, n);
        }}
        className="bg-[#0b1220] border-slate-700 text-white w-24"
      />
    );
  } else if (row.control === "radio_string") {
    control = (
      <RadioGroup
        value={String(displayVal ?? "")}
        onValueChange={(next) => onSet(row.path, next)}
        className="flex flex-col gap-0.5"
      >
        {row.options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem id={`${row.path}-${opt.value}`} value={opt.value} />
            <Label htmlFor={`${row.path}-${opt.value}`} className="text-xs text-slate-200">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">{row.label}</span>
          {modified && <Badge className="bg-amber-500 text-black hover:bg-amber-500">Changed</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {control}
        {modified && (
          <button
            type="button"
            className="text-slate-400 hover:text-white"
            onClick={() => onClear(row.path)}
            title="Revert to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
