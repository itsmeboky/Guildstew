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
import { getRule, DAMAGE_TYPES, WEAPON_PROPERTIES } from "@/components/dnd5e/dnd5eRules";
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
// Content type used by the top-of-dialog selector. `rule_modification`
// stores rule-tree deltas in `modifications`; `custom_item` stores a
// full item record.
const CONTENT_TYPES = [
  { value: "rule_modification", label: "Rule Modification", description: "Change how an existing rule works." },
  { value: "custom_item", label: "Custom Item", description: "Weapon, armor, potion, or wondrous item." },
];

// Item types the creator can pick; the form below reveals different
// extra fields per choice. Keep in sync with the campaign_items type
// column the campaign library already renders.
const ITEM_TYPES = [
  "Weapon",
  "Armor",
  "Shield",
  "Potion",
  "Wondrous Item",
  "Adventuring Gear",
  "Ammunition",
];

const ITEM_RARITIES = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];

const BLANK_ITEM = {
  name: "",
  type: "Weapon",
  rarity: "Common",
  description: "",
  image_url: "",
  weight: 0,
  cost: 0,
  // Weapon defaults
  damage: "1d8",
  damage_type: "slashing",
  properties: [],
  range: "",
  weapon_category: "Simple",
  versatile_damage: "",
  // Armor defaults
  base_ac: 11,
  armor_type: "light",
  str_requirement: 0,
  stealth_disadvantage: false,
  max_dex_bonus: null,
  // Potion defaults
  potion_effect: "Healing",
  healing_dice: "2d4+2",
  effect_description: "",
  duration: "Instantaneous",
  // Wondrous defaults
  requires_attunement: false,
  charges: 0,
  recharge: "Dawn",
};

function itemFromModifications(mods) {
  if (!mods || typeof mods !== "object") return { ...BLANK_ITEM };
  return { ...BLANK_ITEM, ...mods, properties: Array.isArray(mods.properties) ? mods.properties : [] };
}

export default function CreateHomebrewDialog({ open, onClose, brew = null }) {
  const queryClient = useQueryClient();
  const isEditMode = !!brew?.id;

  // Which form body to show. Seeded from the existing brew's category
  // so editing a saved item keeps the right form open.
  const [contentType, setContentType] = useState("rule_modification");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("combat_rules");
  const [gameSystem, setGameSystem] = useState("dnd5e");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Rule-mod-specific state — delta from MODIFIABLE_RULES.
  const [modifications, setModifications] = useState({});
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("{}");
  const [jsonError, setJsonError] = useState(null);

  // Custom-item-specific state. Holds the full item record; saved as
  // the `modifications` JSONB for custom_item brews.
  const [item, setItem] = useState(BLANK_ITEM);

  // Populate state whenever the dialog opens / the brew prop changes.
  useEffect(() => {
    if (!open) return;
    const incomingType = brew?.category === "custom_item" ? "custom_item" : "rule_modification";
    setContentType(incomingType);
    setTitle(brew?.title || "");
    setCategory(
      brew?.category && brew.category !== "custom_item" ? brew.category : "combat_rules",
    );
    setGameSystem(brew?.game_system || "dnd5e");
    setDescription(brew?.description || "");
    setVersion(brew?.version || "1.0.0");
    setTags(Array.isArray(brew?.tags) ? brew.tags : []);
    setTagDraft("");
    setCoverImageUrl(brew?.cover_image_url || "");
    if (incomingType === "custom_item") {
      setItem(itemFromModifications(brew?.modifications));
      setModifications({});
    } else {
      setModifications(
        brew?.modifications && typeof brew.modifications === "object" && !Array.isArray(brew.modifications)
          ? JSON.parse(JSON.stringify(brew.modifications))
          : {},
      );
      setItem(BLANK_ITEM);
    }
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
      const isCustomItem = contentType === "custom_item";
      const effectiveTitle = isCustomItem ? (item.name || title).trim() : title.trim();
      const effectiveDescription = isCustomItem ? (item.description || description).trim() : description.trim();
      if (!effectiveTitle) throw new Error(isCustomItem ? "Item name is required" : "Title is required");
      if (!effectiveDescription) throw new Error("Description is required");

      // Pull current auth user for creator_id.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");
      const userId = authData.user.id;

      // Build the modifications blob. For rule mods we save the delta
      // tree directly; for custom items we serialize the relevant
      // fields based on the chosen item type and drop the unused
      // defaults so the JSONB stays readable.
      let mods;
      let effectiveCategory;
      if (isCustomItem) {
        mods = buildItemModifications(item);
        effectiveCategory = "custom_item";
      } else {
        mods = modifications;
        effectiveCategory = category;
      }

      const payload = {
        creator_id: userId,
        title: effectiveTitle,
        description: effectiveDescription,
        category: effectiveCategory,
        game_system: gameSystem,
        version: version || "1.0.0",
        cover_image_url: coverImageUrl || (isCustomItem ? item.image_url : null) || null,
        tags,
        modifications: mods,
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
          {/* Content type selector — picks which form body to render.
              Locked in edit mode since the `category` determines the
              downstream rendering (rule tree vs item library). */}
          <Section title="Content Type">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CONTENT_TYPES.map((t) => {
                const selected = contentType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    disabled={isEditMode}
                    onClick={() => setContentType(t.value)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selected
                        ? "bg-[#37F2D1]/15 border-[#37F2D1] text-white"
                        : "bg-[#050816] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                    } ${isEditMode ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="text-sm font-black">{t.label}</div>
                    <div className="text-[11px] text-slate-400">{t.description}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={contentType === "custom_item" ? "Pack Title" : "Title"} required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={contentType === "custom_item" ? "e.g., Flame Tongue Greatsword Pack" : "e.g., Flanking Gives +2 To Hit"}
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
              {contentType === "rule_modification" && (
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
              )}
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
                placeholder={contentType === "custom_item"
                  ? "Short pitch for this pack. The item's own description lives in the Item section below."
                  : "Explain what this rule does and how it changes gameplay..."}
                rows={3}
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

          {contentType === "rule_modification" && (
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
          )}

          {contentType === "custom_item" && (
            <Section title="Item">
              <CustomItemForm item={item} setItem={setItem} />
            </Section>
          )}
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

// ─────────────────────────────────────────────
// Custom Item form. Renders the base fields (name / type / rarity /
// description / image / weight / cost) and reveals extra fields
// depending on the chosen Type. The parent passes the full item
// state object + a setter; this component only uses callbacks so
// the whole record round-trips through the dialog's save path.
// ─────────────────────────────────────────────

function CustomItemForm({ item, setItem }) {
  const patch = (fields) => setItem((prev) => ({ ...prev, ...fields }));
  const togglePropertyFlag = (name) => {
    const props = Array.isArray(item.properties) ? [...item.properties] : [];
    const idx = props.indexOf(name);
    if (idx === -1) props.push(name);
    else props.splice(idx, 1);
    patch({ properties: props });
  };

  const isWeapon = item.type === "Weapon";
  const isArmor = item.type === "Armor" || item.type === "Shield";
  const isPotion = item.type === "Potion";
  const isWondrous = item.type === "Wondrous Item";
  const isRanged = Array.isArray(item.properties) && (
    item.properties.includes("Thrown") || item.properties.includes("Ammunition") || item.properties.includes("Range")
  );

  return (
    <div className="space-y-4">
      {/* --- Common fields --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={item.name || ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g., Flame Tongue Greatsword"
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Type">
          <Select value={item.type} onValueChange={(v) => patch({ type: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rarity">
          <Select value={item.rarity} onValueChange={(v) => patch({ rarity: v })}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_RARITIES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Weight (lbs)">
          <Input
            type="number" min={0} step="0.1"
            value={item.weight ?? 0}
            onChange={(e) => patch({ weight: Number(e.target.value) || 0 })}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
        <Field label="Cost (GP)">
          <Input
            type="number" min={0} step="0.01"
            value={item.cost ?? 0}
            onChange={(e) => patch({ cost: Number(e.target.value) || 0 })}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
        </Field>
      </div>

      <Field label="Description" required>
        <Textarea
          value={item.description || ""}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What does the item look like? What does it do?"
          rows={3}
          className="bg-[#0b1220] border-slate-700 text-white"
        />
      </Field>

      <Field label="Item image">
        <ItemImageUpload
          url={item.image_url}
          onChange={(url) => patch({ image_url: url })}
        />
      </Field>

      {/* --- Weapon-specific --- */}
      {isWeapon && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Weapon Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Damage dice">
              <Input
                value={item.damage || ""}
                onChange={(e) => patch({ damage: e.target.value })}
                placeholder="e.g., 2d6"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Damage type">
              <Select value={item.damage_type || "slashing"} onValueChange={(v) => patch({ damage_type: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <RadioGroup
                value={item.weapon_category || "Simple"}
                onValueChange={(v) => patch({ weapon_category: v })}
                className="flex gap-3 mt-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="wc-simple" value="Simple" />
                  <Label htmlFor="wc-simple" className="text-xs text-slate-200">Simple</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="wc-martial" value="Martial" />
                  <Label htmlFor="wc-martial" className="text-xs text-slate-200">Martial</Label>
                </div>
              </RadioGroup>
            </Field>
            {isRanged && (
              <Field label="Range (e.g., 20/60)">
                <Input
                  value={item.range || ""}
                  onChange={(e) => patch({ range: e.target.value })}
                  placeholder="20/60"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
          </div>
          <Field label="Properties">
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(WEAPON_PROPERTIES).map((prop) => {
                const active = Array.isArray(item.properties) && item.properties.includes(prop);
                return (
                  <button
                    key={prop}
                    type="button"
                    onClick={() => togglePropertyFlag(prop)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                      active
                        ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                        : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                    }`}
                    title={WEAPON_PROPERTIES[prop]}
                  >
                    {prop}
                  </button>
                );
              })}
            </div>
          </Field>
          {Array.isArray(item.properties) && item.properties.includes("Versatile") && (
            <Field label="Versatile damage (two-handed)">
              <Input
                value={item.versatile_damage || ""}
                onChange={(e) => patch({ versatile_damage: e.target.value })}
                placeholder="e.g., 1d10"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          )}
        </div>
      )}

      {/* --- Armor / Shield --- */}
      {isArmor && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
            {item.type === "Shield" ? "Shield Details" : "Armor Details"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={item.type === "Shield" ? "AC bonus" : "Base AC"}>
              <Input
                type="number" min={0}
                value={item.base_ac ?? 0}
                onChange={(e) => patch({ base_ac: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            {item.type !== "Shield" && (
              <Field label="Armor type">
                <RadioGroup
                  value={item.armor_type || "light"}
                  onValueChange={(v) => {
                    // Sensible DEX cap defaults by armor class.
                    const maxDex = v === "light" ? null : v === "medium" ? 2 : 0;
                    patch({ armor_type: v, max_dex_bonus: maxDex });
                  }}
                  className="flex gap-3 mt-1"
                >
                  {["light", "medium", "heavy"].map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <RadioGroupItem id={`at-${t}`} value={t} />
                      <Label htmlFor={`at-${t}`} className="text-xs text-slate-200 capitalize">{t}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </Field>
            )}
            <Field label="STR requirement">
              <Input
                type="number" min={0}
                value={item.str_requirement ?? 0}
                onChange={(e) => patch({ str_requirement: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Stealth disadvantage">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={!!item.stealth_disadvantage}
                  onCheckedChange={(c) => patch({ stealth_disadvantage: c })}
                />
                <span className="text-xs text-slate-300">
                  {item.stealth_disadvantage ? "Imposed" : "None"}
                </span>
              </div>
            </Field>
            {item.type !== "Shield" && item.armor_type !== "heavy" && (
              <Field label="Max DEX bonus (blank = uncapped)">
                <Input
                  type="number" min={0}
                  value={item.max_dex_bonus ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    patch({ max_dex_bonus: v === "" ? null : Number(v) || 0 });
                  }}
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
          </div>
        </div>
      )}

      {/* --- Potion --- */}
      {isPotion && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Potion Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Effect type">
              <Select value={item.potion_effect || "Healing"} onValueChange={(v) => patch({ potion_effect: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Healing">Healing</SelectItem>
                  <SelectItem value="Buff">Buff</SelectItem>
                  <SelectItem value="Utility">Utility</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {item.potion_effect === "Healing" && (
              <Field label="Healing dice">
                <Input
                  value={item.healing_dice || ""}
                  onChange={(e) => patch({ healing_dice: e.target.value })}
                  placeholder="e.g., 4d4+4"
                  className="bg-[#0b1220] border-slate-700 text-white"
                />
              </Field>
            )}
            <Field label="Duration">
              <Input
                value={item.duration || ""}
                onChange={(e) => patch({ duration: e.target.value })}
                placeholder="e.g., Instantaneous, 1 hour"
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
          </div>
          <Field label="Effect description">
            <Textarea
              value={item.effect_description || ""}
              onChange={(e) => patch({ effect_description: e.target.value })}
              placeholder="What happens when the potion is drunk?"
              rows={3}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
        </div>
      )}

      {/* --- Wondrous Item --- */}
      {isWondrous && (
        <div className="bg-[#050816] border border-[#1e293b] rounded-lg p-3 space-y-3">
          <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Wondrous Item Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Requires attunement">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={!!item.requires_attunement}
                  onCheckedChange={(c) => patch({ requires_attunement: c })}
                />
                <span className="text-xs text-slate-300">
                  {item.requires_attunement ? "Yes" : "No"}
                </span>
              </div>
            </Field>
            <Field label="Charges (0 = unlimited)">
              <Input
                type="number" min={0}
                value={item.charges ?? 0}
                onChange={(e) => patch({ charges: Number(e.target.value) || 0 })}
                className="bg-[#0b1220] border-slate-700 text-white"
              />
            </Field>
            <Field label="Recharge">
              <Select value={item.recharge || "Dawn"} onValueChange={(v) => patch({ recharge: v })}>
                <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dawn">Dawn</SelectItem>
                  <SelectItem value="Short Rest">Short Rest</SelectItem>
                  <SelectItem value="Long Rest">Long Rest</SelectItem>
                  <SelectItem value="Never">Never</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Effect description">
            <Textarea
              value={item.effect_description || ""}
              onChange={(e) => patch({ effect_description: e.target.value })}
              placeholder="How does the item work? What does each charge do?"
              rows={3}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// Small image-upload helper scoped to custom items. Uploads into
// campaign-assets/homebrew/items/ so item covers live alongside the
// pack cover without colliding.
function ItemImageUpload({ url, onChange }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "campaign-assets", "homebrew/items");
      onChange(file_url);
    } catch (err) {
      toast.error("Item image upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      {url && (
        <img
          src={url}
          alt="Item"
          className="w-16 h-16 rounded object-cover border border-slate-700"
        />
      )}
      <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
        <Upload className="w-3 h-3" />
        {uploading ? "Uploading..." : url ? "Replace" : "Upload"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handle}
          disabled={uploading}
        />
      </label>
      {url && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-slate-400 hover:text-red-400"
        >
          Remove
        </button>
      )}
    </div>
  );
}

// Serialize the in-form item state into a compact modifications blob
// — only the fields relevant to the chosen Type are kept, so the
// saved JSONB doesn't carry stale Armor fields for a Weapon.
export function buildItemModifications(item) {
  if (!item || typeof item !== "object") return {};
  const base = {
    name: item.name || "",
    type: item.type || "Wondrous Item",
    rarity: item.rarity || "Common",
    description: item.description || "",
    image_url: item.image_url || "",
    weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 0,
    cost: Number.isFinite(Number(item.cost)) ? Number(item.cost) : 0,
  };
  if (item.type === "Weapon") {
    return {
      ...base,
      damage: item.damage || "",
      damage_type: item.damage_type || "slashing",
      properties: Array.isArray(item.properties) ? item.properties : [],
      range: item.range || "",
      weapon_category: item.weapon_category || "Simple",
      versatile_damage: item.versatile_damage || "",
    };
  }
  if (item.type === "Armor" || item.type === "Shield") {
    return {
      ...base,
      base_ac: Number(item.base_ac) || 0,
      armor_type: item.type === "Shield" ? "shield" : item.armor_type || "light",
      str_requirement: Number(item.str_requirement) || 0,
      stealth_disadvantage: !!item.stealth_disadvantage,
      max_dex_bonus:
        item.max_dex_bonus === null || item.max_dex_bonus === "" || item.max_dex_bonus === undefined
          ? null
          : Number(item.max_dex_bonus),
    };
  }
  if (item.type === "Potion") {
    return {
      ...base,
      potion_effect: item.potion_effect || "Utility",
      healing_dice: item.potion_effect === "Healing" ? item.healing_dice || "" : "",
      effect_description: item.effect_description || "",
      duration: item.duration || "",
    };
  }
  if (item.type === "Wondrous Item") {
    return {
      ...base,
      requires_attunement: !!item.requires_attunement,
      effect_description: item.effect_description || "",
      charges: Number(item.charges) || 0,
      recharge: item.recharge || "Dawn",
    };
  }
  return base;
}

