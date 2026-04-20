import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BLANK_CLASS,
  HIT_DICE,
  ABILITIES,
} from "@/config/breweryClassSchema";

/**
 * Class mod creator — dialog form that authors a brewery_mods row
 * with mod_type='class'. The metadata it writes matches what the
 * character creator's class engine expects (see Part 3A schema).
 *
 * This file grows in pieces: Identity / Core / Proficiencies ship
 * first; Starting Equipment, Spellcasting, Feature Schedule,
 * Subclasses, Class Resource / Multiclass, and Save buttons land in
 * follow-up commits onto the same file.
 *
 * Props:
 *   open     — dialog visibility
 *   onClose  — close handler (also fired after a successful save)
 *   mod      — existing brewery_mods row to edit (optional)
 */

const GAME_SYSTEMS = [{ value: "dnd5e", label: "D&D 5e" }];

const ARMOR_OPTIONS = ["Light", "Medium", "Heavy", "Shields"];

const WEAPON_OPTIONS = [
  "Simple Weapons", "Martial Weapons",
  "Club", "Dagger", "Greatclub", "Handaxe", "Javelin", "Light Hammer",
  "Mace", "Quarterstaff", "Sickle", "Spear", "Light Crossbow", "Dart",
  "Shortbow", "Sling",
  "Battleaxe", "Flail", "Glaive", "Greataxe", "Greatsword", "Halberd",
  "Lance", "Longsword", "Maul", "Morningstar", "Pike", "Rapier",
  "Scimitar", "Shortsword", "Trident", "War Pick", "Warhammer", "Whip",
  "Blowgun", "Hand Crossbow", "Heavy Crossbow", "Longbow", "Net",
];

const TOOL_OPTIONS = [
  "Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies",
  "Carpenter's tools", "Cartographer's tools", "Cobbler's tools",
  "Cook's utensils", "Disguise kit", "Forgery kit", "Glassblower's tools",
  "Herbalism kit", "Jeweler's tools", "Leatherworker's tools",
  "Mason's tools", "Navigator's tools", "Painter's supplies",
  "Poisoner's kit", "Potter's tools", "Smith's tools", "Thieves' tools",
  "Tinker's tools", "Weaver's tools", "Woodcarver's tools",
  "Vehicles (land)", "Vehicles (water)",
];

const SKILL_OPTIONS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival",
];

const SAVING_THROW_LIMIT = 2;

function cloneBlankClass() {
  return JSON.parse(JSON.stringify(BLANK_CLASS));
}

export default function CreateClassModDialog({ open, onClose, mod = null }) {
  const [formData, setFormData] = useState(cloneBlankClass);
  const [gameSystem, setGameSystem] = useState("dnd5e");

  useEffect(() => {
    if (!open) return;
    if (mod) {
      setFormData({ ...cloneBlankClass(), ...(mod.metadata || {}), name: mod.name || "" });
      setGameSystem(mod.game_system || "dnd5e");
    } else {
      setFormData(cloneBlankClass());
      setGameSystem("dnd5e");
    }
  }, [open, mod]);

  const setField = (key, value) => setFormData((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mod ? "Edit Class Mod" : "Create Class Mod"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <IdentitySection
            formData={formData}
            setField={setField}
            gameSystem={gameSystem}
            setGameSystem={setGameSystem}
          />
          <CoreSection formData={formData} setField={setField} />
          <ProficienciesSection formData={formData} setField={setField} />
          <StartingEquipmentSection formData={formData} setField={setField} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────── Shared layout helpers ─────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-4">
      <h3 className="text-sm font-black uppercase tracking-wider text-[#37F2D1] mb-3">
        {title}
      </h3>
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

function NumberInput({ value, onChange, min, max, step = 1 }) {
  return (
    <Input
      type="number"
      value={value ?? 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className="bg-[#050816] border-slate-700 text-white"
    />
  );
}

function ChipMultiSelect({ options, values, onChange, limit }) {
  const selected = Array.isArray(values) ? values : [];
  const toggle = (opt) => {
    const active = selected.includes(opt);
    if (!active && typeof limit === "number" && selected.length >= limit) {
      toast.error(`Pick at most ${limit}.`);
      return;
    }
    const next = active ? selected.filter((v) => v !== opt) : [...selected, opt];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors capitalize ${
              active
                ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                : "bg-[#050816] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────── B1 Identity ──────────────────────────

function IdentitySection({ formData, setField, gameSystem, setGameSystem }) {
  return (
    <Section title="Identity">
      <Field label="Class Name" required>
        <Input
          value={formData.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="e.g., Warden"
          className="bg-[#050816] border-slate-700 text-white"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={formData.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="A sworn guardian bound to the wild places of the world..."
          rows={4}
          className="bg-[#050816] border-slate-700 text-white"
        />
      </Field>
      <Field label="Class Art URL">
        <Input
          value={formData.image_url}
          onChange={(e) => setField("image_url", e.target.value)}
          placeholder="https://…"
          className="bg-[#050816] border-slate-700 text-white"
        />
      </Field>
      <Field label="Game System">
        <Select value={gameSystem} onValueChange={setGameSystem}>
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GAME_SYSTEMS.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </Section>
  );
}

// ──────────────────────────── B2 Core ────────────────────────────

function CoreSection({ formData, setField }) {
  const saves = Array.isArray(formData.saving_throws) ? formData.saving_throws : [];
  return (
    <Section title="Core">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Hit Die">
          <Select value={formData.hit_die || "d8"} onValueChange={(v) => setField("hit_die", v)}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HIT_DICE.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label={`Saving Throw Proficiencies (pick exactly ${SAVING_THROW_LIMIT})`}>
        <ChipMultiSelect
          options={ABILITIES}
          values={saves}
          onChange={(v) => setField("saving_throws", v)}
          limit={SAVING_THROW_LIMIT}
        />
      </Field>
    </Section>
  );
}

// ──────────────────────── B3 Proficiencies ───────────────────────

function ProficienciesSection({ formData, setField }) {
  const skills = formData.skill_proficiencies || { choose: 2, from: [] };
  const setSkills = (key, value) =>
    setField("skill_proficiencies", { ...skills, [key]: value });

  return (
    <Section title="Proficiencies">
      <Field label="Armor Proficiencies">
        <ChipMultiSelect
          options={ARMOR_OPTIONS}
          values={formData.armor_proficiencies || []}
          onChange={(v) => setField("armor_proficiencies", v)}
        />
      </Field>
      <Field label="Weapon Proficiencies">
        <ChipMultiSelect
          options={WEAPON_OPTIONS}
          values={formData.weapon_proficiencies || []}
          onChange={(v) => setField("weapon_proficiencies", v)}
        />
      </Field>
      <Field label="Tool Proficiencies">
        <ChipMultiSelect
          options={TOOL_OPTIONS}
          values={formData.tool_proficiencies || []}
          onChange={(v) => setField("tool_proficiencies", v)}
        />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Skill Picks">
          <NumberInput
            value={skills.choose ?? 2}
            onChange={(v) => setSkills("choose", v)}
            min={0}
            max={18}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="…from (empty = any skill)">
            <ChipMultiSelect
              options={SKILL_OPTIONS}
              values={skills.from || []}
              onChange={(v) => setSkills("from", v)}
            />
          </Field>
        </div>
      </div>
    </Section>
  );
}

// ─────────────────────── B4 Starting Equipment ───────────────────

function StartingEquipmentSection({ formData, setField }) {
  const equipment = formData.starting_equipment || { choices: [], fixed: [] };
  const fixed   = Array.isArray(equipment.fixed)   ? equipment.fixed   : [];
  const choices = Array.isArray(equipment.choices) ? equipment.choices : [];

  const setEquipment = (next) =>
    setField("starting_equipment", { ...equipment, ...next });

  // Fixed items: plain string list. One input per row; empty rows
  // are stripped on save, not on change, so the user can clear a row
  // mid-edit without losing focus.
  const addFixed   = () => setEquipment({ fixed: [...fixed, ""] });
  const updateFixed = (idx, value) =>
    setEquipment({ fixed: fixed.map((v, i) => (i === idx ? value : v)) });
  const removeFixed = (idx) =>
    setEquipment({ fixed: fixed.filter((_, i) => i !== idx) });

  // Choice groups: each is { options: string[] } with 2-3 options.
  // The UI always shows three option slots and treats empties as
  // "not an option"; the save path trims them.
  const addChoice = () => setEquipment({ choices: [...choices, { options: ["", "", ""] }] });
  const updateChoice = (idx, nextOptions) =>
    setEquipment({ choices: choices.map((c, i) => (i === idx ? { ...c, options: nextOptions } : c)) });
  const removeChoice = (idx) =>
    setEquipment({ choices: choices.filter((_, i) => i !== idx) });

  return (
    <Section title="Starting Equipment">
      <div>
        <Label className="block mb-1 text-xs text-slate-300 font-semibold">Fixed Items</Label>
        <p className="text-[10px] text-slate-500 mb-2">
          Items every character of this class starts with — one per row.
        </p>
        <div className="space-y-2">
          {fixed.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => updateFixed(idx, e.target.value)}
                placeholder="e.g., Explorer's Pack"
                className="bg-[#050816] border-slate-700 text-white"
              />
              <button
                type="button"
                onClick={() => removeFixed(idx)}
                className="p-2 text-red-400 hover:text-red-300"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addFixed} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Add Fixed Item
        </Button>
      </div>

      <div className="pt-3 border-t border-[#1e293b]">
        <Label className="block mb-1 text-xs text-slate-300 font-semibold">Equipment Choices</Label>
        <p className="text-[10px] text-slate-500 mb-2">
          Each group lets the player pick one of 2–3 options (e.g., "(a) a longsword or (b) any simple weapon").
        </p>
        <div className="space-y-3">
          {choices.map((choice, idx) => (
            <EquipmentChoiceRow
              key={idx}
              idx={idx}
              options={choice.options || ["", "", ""]}
              onChange={(nextOptions) => updateChoice(idx, nextOptions)}
              onRemove={() => removeChoice(idx)}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addChoice} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Add Choice Group
        </Button>
      </div>
    </Section>
  );
}

function EquipmentChoiceRow({ idx, options, onChange, onRemove }) {
  // Always render three option slots so the user can fill any of
  // them. A group with only one filled option is nonsensical but we
  // leave that validation to save time — save-path trimming drops
  // anything empty.
  const setOpt = (pos, value) => {
    const next = [...options];
    next[pos] = value;
    onChange(next);
  };
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          Choice Group #{idx + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-400 hover:text-red-300"
          title="Remove choice group"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[0, 1, 2].map((pos) => (
          <Input
            key={pos}
            value={options[pos] || ""}
            onChange={(e) => setOpt(pos, e.target.value)}
            placeholder={`Option ${String.fromCharCode(97 + pos)}`}
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        ))}
      </div>
    </div>
  );
}
