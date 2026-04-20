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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BLANK_CLASS,
  BLANK_FEATURE,
  BLANK_SUBCLASS_OPTION,
  HIT_DICE,
  ABILITIES,
  CASTER_TYPES,
  SPELL_KNOWLEDGE_TYPES,
  SPELL_LIST_SOURCES,
  FULL_CASTER_SLOTS,
  HALF_CASTER_SLOTS,
  STANDARD_ASI_LEVELS,
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
          <SpellcastingSection formData={formData} setField={setField} />
          <FeatureScheduleSection
            formData={formData}
            setField={setField}
            minLevel={1}
            maxLevel={10}
            title="Feature Schedule — Levels 1–10"
          />
          <FeatureScheduleSection
            formData={formData}
            setField={setField}
            minLevel={11}
            maxLevel={20}
            title="Feature Schedule — Levels 11–20"
          />
          <SubclassSection formData={formData} setField={setField} />
          <ClassResourceSection formData={formData} setField={setField} />
          <MulticlassSection formData={formData} setField={setField} />
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

// ─────────────────────────── B5 Spellcasting ─────────────────────

// Empty 20-row custom slot table used when the author flips to
// "custom" caster type. Level 1..20 × spell level 1..9 = 20 rows
// of 9 zeros.
function blankCustomSlotTable() {
  return Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  }));
}

// Empty spells-known schedule: 20 rows of { level, cantrips, known }
// used for Known casters (sorcerer / bard style) when the editor
// wants to hand-author the knowledge curve.
function blankKnownSchedule() {
  return Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    cantrips: 0,
    known: 0,
  }));
}

function SpellcastingSection({ formData, setField }) {
  const sc = formData.spellcasting || {};
  const enabled = !!sc.enabled;
  const setSc = (patch) => setField("spellcasting", { ...sc, ...patch });

  const onCasterTypeChange = (nextType) => {
    const patch = { slot_progression: nextType };
    // Auto-populate / clear custom_slots so the editor only shows
    // the 20×9 grid when the author actually wants to hand-tune.
    if (nextType === "custom") {
      patch.custom_slots = Array.isArray(sc.custom_slots) && sc.custom_slots.length === 20
        ? sc.custom_slots
        : blankCustomSlotTable();
    } else {
      patch.custom_slots = null;
    }
    setSc(patch);
  };

  const onKnowledgeTypeChange = (nextType) => {
    const patch = { type: nextType };
    // Known casters get an editable cantrip / spells-known schedule;
    // Prepared + Ritual Only don't need one.
    if (nextType === "known") {
      patch.spells_known_schedule = Array.isArray(sc.spells_known_schedule) && sc.spells_known_schedule.length === 20
        ? sc.spells_known_schedule
        : blankKnownSchedule();
    } else {
      patch.spells_known_schedule = [];
    }
    setSc(patch);
  };

  return (
    <Section title="Spellcasting">
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={(v) => setSc({ enabled: v })}
          id="spellcasting-toggle"
        />
        <Label htmlFor="spellcasting-toggle" className="text-sm text-slate-300">
          This class can cast spells
        </Label>
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Spellcasting Ability">
              <Select value={sc.ability || "INT"} onValueChange={(v) => setSc({ ability: v })}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["INT", "WIS", "CHA"].map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Caster Type">
              <Select value={sc.slot_progression || "none"} onValueChange={onCasterTypeChange}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASTER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Knowledge Type">
              <Select value={sc.type || "prepared"} onValueChange={onKnowledgeTypeChange}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPELL_KNOWLEDGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Preview slot tables for the non-custom progressions so
              authors see what their caster type actually grants. */}
          {sc.slot_progression === "full" && (
            <SlotTablePreview title="Full Caster Slots" rows={FULL_CASTER_SLOTS} />
          )}
          {sc.slot_progression === "half" && (
            <SlotTablePreview title="Half Caster Slots" rows={HALF_CASTER_SLOTS} />
          )}
          {sc.slot_progression === "custom" && (
            <CustomSlotEditor
              rows={Array.isArray(sc.custom_slots) && sc.custom_slots.length === 20
                ? sc.custom_slots
                : blankCustomSlotTable()}
              onChange={(next) => setSc({ custom_slots: next })}
            />
          )}

          {sc.type === "known" && (
            <KnownSpellsSchedule
              schedule={Array.isArray(sc.spells_known_schedule) && sc.spells_known_schedule.length === 20
                ? sc.spells_known_schedule
                : blankKnownSchedule()}
              onChange={(next) => setSc({ spells_known_schedule: next })}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#1e293b]">
            <Field label="Spell List Source">
              <Select
                value={sc.spell_list_source || "custom"}
                onValueChange={(v) => setSc({ spell_list_source: v })}
              >
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPELL_LIST_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end gap-2">
              <Checkbox
                id="ritual-casting"
                checked={!!sc.ritual_casting}
                onCheckedChange={(v) => setSc({ ritual_casting: !!v })}
              />
              <Label htmlFor="ritual-casting" className="text-sm text-slate-300 mb-1">
                Can cast rituals
              </Label>
            </div>
          </div>

          {sc.spell_list_source === "custom" && (
            <CustomSpellList
              list={Array.isArray(sc.custom_spell_list) ? sc.custom_spell_list : []}
              onChange={(next) => setSc({ custom_spell_list: next })}
            />
          )}
        </>
      )}
    </Section>
  );
}

function SlotTablePreview({ title, rows }) {
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">{title}</p>
      <div className="overflow-x-auto">
        <table className="text-[10px] min-w-full">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pr-2">Lvl</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                <th key={s} className="px-1 text-center">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {rows.map((row) => (
              <tr key={row.level}>
                <td className="pr-2 font-bold">{row.level}</td>
                {row.slots.map((n, i) => (
                  <td key={i} className="px-1 text-center">{n || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomSlotEditor({ rows, onChange }) {
  const setCell = (rowIdx, slotIdx, value) => {
    const next = rows.map((r, i) => {
      if (i !== rowIdx) return r;
      const nextSlots = [...r.slots];
      nextSlots[slotIdx] = Number(value) || 0;
      return { ...r, slots: nextSlots };
    });
    onChange(next);
  };
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
        Custom Slot Table (Level × Spell Level)
      </p>
      <div className="overflow-x-auto">
        <table className="text-[10px]">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pr-2">Lvl</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                <th key={s} className="px-1 text-center w-10">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.level}>
                <td className="pr-2 font-bold text-slate-300">{row.level}</td>
                {row.slots.map((n, slotIdx) => (
                  <td key={slotIdx} className="px-0.5">
                    <input
                      type="number"
                      min={0}
                      max={9}
                      value={n}
                      onChange={(e) => setCell(rowIdx, slotIdx, e.target.value)}
                      className="w-10 bg-[#1E2430] border border-slate-700 text-white text-center rounded px-1 py-0.5"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KnownSpellsSchedule({ schedule, onChange }) {
  const setCell = (rowIdx, key, value) => {
    const next = schedule.map((r, i) => (i === rowIdx ? { ...r, [key]: Number(value) || 0 } : r));
    onChange(next);
  };
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
        Cantrips / Spells Known per Class Level
      </p>
      <div className="overflow-x-auto">
        <table className="text-[10px]">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pr-2">Lvl</th>
              <th className="px-2">Cantrips</th>
              <th className="px-2">Spells Known</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, rowIdx) => (
              <tr key={row.level}>
                <td className="pr-2 font-bold text-slate-300">{row.level}</td>
                <td className="px-2">
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={row.cantrips}
                    onChange={(e) => setCell(rowIdx, "cantrips", e.target.value)}
                    className="w-16 bg-[#1E2430] border border-slate-700 text-white text-center rounded px-1 py-0.5"
                  />
                </td>
                <td className="px-2">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={row.known}
                    onChange={(e) => setCell(rowIdx, "known", e.target.value)}
                    className="w-16 bg-[#1E2430] border border-slate-700 text-white text-center rounded px-1 py-0.5"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomSpellList({ list, onChange }) {
  // Simple textarea — one spell name per line. Keeps the UI light
  // at this stage; a picker that reads from the SRD spell DB can
  // layer on later without schema changes.
  const text = list.join("\n");
  return (
    <Field label="Custom Spell List (one spell per line)">
      <Textarea
        value={text}
        onChange={(e) =>
          onChange(e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))
        }
        rows={6}
        placeholder={"Fireball\nMage Armor\nShield"}
        className="bg-[#050816] border-slate-700 text-white"
      />
    </Field>
  );
}

// ────────────────────── B6 Feature Schedule ──────────────────────

// Mechanical effect option sets — kept inline so the editor is
// self-contained and the schema can evolve without forcing an
// import chain.
const FEATURE_EFFECT_TYPES = ["damage", "healing", "buff", "condition", "utility"];
const FEATURE_COSTS        = ["passive", "free", "action", "bonus_action", "reaction"];
const FEATURE_RECHARGE     = ["", "short_rest", "long_rest", "dawn", "dusk", "special"];
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
const FEATURE_DAMAGE_TYPES = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
];

function cloneBlankFeature() {
  return JSON.parse(JSON.stringify(BLANK_FEATURE));
}

function makeAsiFeature(level) {
  return {
    ...cloneBlankFeature(),
    level,
    name: "Ability Score Improvement",
    description:
      "Increase one ability score by 2, or two ability scores by 1. You can take a feat instead if the campaign allows it.",
    is_asi: true,
  };
}

/**
 * Renders a range of class levels (minLevel..maxLevel) as rows. Each
 * row lists the features currently scheduled at that level and
 * exposes an "Add Feature" button. A single shared
 * characterData.features array holds every feature across every
 * level; filtering by feature.level keeps the row view simple.
 *
 * On first render (empty features list) an ASI feature is seeded at
 * each level in STANDARD_ASI_LEVELS — but only for the row range
 * this section owns, so the 1–10 and 11–20 sections can seed their
 * own ASIs without double-seeding.
 */
function FeatureScheduleSection({ formData, setField, minLevel, maxLevel, title }) {
  const features = Array.isArray(formData.features) ? formData.features : [];

  // One-time ASI seed for empty schedules. Uses a ref so the hook
  // guard is simple; effect runs only if nothing in the row range
  // exists yet.
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (seededRef.current) return;
    const existing = features.filter((f) => f.level >= minLevel && f.level <= maxLevel);
    if (existing.length > 0) {
      seededRef.current = true;
      return;
    }
    const asiLevels = STANDARD_ASI_LEVELS.filter((l) => l >= minLevel && l <= maxLevel);
    if (asiLevels.length === 0) {
      seededRef.current = true;
      return;
    }
    const seeded = asiLevels.map(makeAsiFeature);
    setField("features", [...features, ...seeded]);
    seededRef.current = true;
  }, [features, minLevel, maxLevel, setField]);

  const addFeatureAtLevel = (level) =>
    setField("features", [...features, { ...cloneBlankFeature(), level }]);
  const updateFeature = (uid, next) =>
    setField("features", features.map((f, i) => (i === uid ? next : f)));
  const removeFeature = (uid) =>
    setField("features", features.filter((_, i) => i !== uid));

  const rows = [];
  for (let lvl = minLevel; lvl <= maxLevel; lvl += 1) rows.push(lvl);

  return (
    <Section title={title}>
      <div className="space-y-3">
        {rows.map((lvl) => {
          const rowFeatures = features
            .map((f, i) => ({ f, i }))
            .filter(({ f }) => f.level === lvl);
          return (
            <div key={lvl} className="bg-[#050816] border border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-widest font-bold text-[#37F2D1]">
                  Level {lvl}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addFeatureAtLevel(lvl)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Feature
                </Button>
              </div>
              {rowFeatures.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No feature scheduled at this level.</p>
              ) : (
                <div className="space-y-2">
                  {rowFeatures.map(({ f, i }) => (
                    <FeatureCard
                      key={i}
                      feature={f}
                      onChange={(next) => updateFeature(i, next)}
                      onRemove={() => removeFeature(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function FeatureCard({ feature, onChange, onRemove }) {
  const set = (key, value) => onChange({ ...feature, [key]: value });
  const setMech = (key, value) =>
    onChange({ ...feature, mechanical: { ...(feature.mechanical || {}), [key]: value } });

  return (
    <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex-1">
          Feature @ Lvl {feature.level}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-400 hover:text-red-300"
          title="Remove feature"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <Field label="Name">
        <Input
          value={feature.name || ""}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g., Second Wind"
          className="bg-[#050816] border-slate-700 text-white"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={feature.description || ""}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="bg-[#050816] border-slate-700 text-white"
        />
      </Field>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <Checkbox
            checked={!!feature.is_asi}
            onCheckedChange={(v) => set("is_asi", !!v)}
          />
          Is ASI (Ability Score Improvement)
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <Checkbox
            checked={!!feature.is_subclass_choice}
            onCheckedChange={(v) => set("is_subclass_choice", !!v)}
          />
          Is Subclass Choice
        </label>
      </div>

      <details className="bg-[#0b1220] border border-slate-700 rounded p-2">
        <summary className="cursor-pointer text-xs text-slate-300 font-semibold">
          Mechanical Effect
        </summary>
        <div className="mt-3">
          <MechanicalEffectFields
            value={feature.mechanical || {}}
            onChange={(next) => onChange({ ...feature, mechanical: next })}
          />
        </div>
      </details>
    </div>
  );
}

function MechanicalEffectFields({ value, onChange }) {
  const effect = value?.effect_type || "utility";
  const set = (key, v) => onChange({ ...(value || {}), [key]: v });
  const isDamage  = effect === "damage";
  const isHealing = effect === "healing";
  const isLimited = effect !== "utility" || (value?.uses && value.uses !== "At Will");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Field label="Effect Type">
        <Select value={effect} onValueChange={(v) => set("effect_type", v)}>
          <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FEATURE_EFFECT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Cost">
        <Select value={value?.cost || "passive"} onValueChange={(v) => set("cost", v)}>
          <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FEATURE_COSTS.map((t) => (
              <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isDamage && (
        <>
          <Field label="Damage Dice">
            <Input
              value={value?.damage_dice || ""}
              onChange={(e) => set("damage_dice", e.target.value)}
              placeholder="e.g., 1d6"
              className="bg-[#1E2430] border-slate-700 text-white"
            />
          </Field>
          <Field label="Damage Type">
            <Select
              value={value?.damage_type || ""}
              onValueChange={(v) => set("damage_type", v)}
            >
              <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
                <SelectValue placeholder="select…" />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_DAMAGE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      )}

      {isHealing && (
        <Field label="Healing Dice">
          <Input
            value={value?.healing_dice || ""}
            onChange={(e) => set("healing_dice", e.target.value)}
            placeholder="e.g., 1d10 + level"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}

      {isLimited && (
        <>
          <Field label="Uses">
            <Select value={value?.uses || "At Will"} onValueChange={(v) => set("uses", v)}>
              <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_USES.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Recharge">
            <Select value={value?.recharge || ""} onValueChange={(v) => set("recharge", v)}>
              <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
                <SelectValue placeholder="(none)" />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_RECHARGE.map((r) => (
                  <SelectItem key={r || "none"} value={r}>
                    {r ? r.replace("_", " ") : "(none)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
    </div>
  );
}

// ──────────────────────── B7 Subclass Framework ──────────────────

function cloneBlankSubclassOption() {
  return JSON.parse(JSON.stringify(BLANK_SUBCLASS_OPTION));
}

function SubclassSection({ formData, setField }) {
  const subclass = formData.subclass || { name: "", choose_at_level: 3, options: [] };
  const options = Array.isArray(subclass.options) ? subclass.options : [];
  const setSub = (patch) => setField("subclass", { ...subclass, ...patch });

  const addOption    = () => setSub({ options: [...options, cloneBlankSubclassOption()] });
  const updateOption = (idx, next) => setSub({ options: options.map((o, i) => (i === idx ? next : o)) });
  const removeOption = (idx) => setSub({ options: options.filter((_, i) => i !== idx) });

  return (
    <Section title="Subclass Framework">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Field label='Subclass Label (e.g., "Sacred Oath", "Martial Archetype")'>
            <Input
              value={subclass.name || ""}
              onChange={(e) => setSub({ name: e.target.value })}
              placeholder="What this class calls its specialization"
              className="bg-[#050816] border-slate-700 text-white"
            />
          </Field>
        </div>
        <Field label="Choose at Level">
          <NumberInput
            value={subclass.choose_at_level ?? 3}
            onChange={(v) => setSub({ choose_at_level: v })}
            min={1}
            max={20}
          />
        </Field>
      </div>

      <div className="space-y-3">
        {options.length === 0 && (
          <p className="text-xs text-slate-500 italic">
            No subclass options yet — add at least one path your class can take.
          </p>
        )}
        {options.map((opt, idx) => (
          <SubclassOptionCard
            key={idx}
            idx={idx}
            option={opt}
            onChange={(next) => updateOption(idx, next)}
            onRemove={() => removeOption(idx)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="w-3 h-3 mr-1" /> Add Subclass Option
      </Button>
    </Section>
  );
}

function SubclassOptionCard({ idx, option, onChange, onRemove }) {
  const set = (key, value) => onChange({ ...option, [key]: value });
  const features = Array.isArray(option.features) ? option.features : [];

  const addFeature    = () => set("features", [...features, { ...cloneBlankFeature(), level: 3 }]);
  const updateFeature = (fi, next) => set("features", features.map((f, i) => (i === fi ? next : f)));
  const removeFeature = (fi) => set("features", features.filter((_, i) => i !== fi));
  const setFeatureLevel = (fi, level) =>
    updateFeature(fi, { ...features[fi], level: Math.max(1, Math.min(20, Number(level) || 1)) });

  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex-1">
          Subclass Option #{idx + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-400 hover:text-red-300"
          title="Remove subclass option"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <Field label="Name">
        <Input
          value={option.name || ""}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g., Oath of Devotion"
          className="bg-[#1E2430] border-slate-700 text-white"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={option.description || ""}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="bg-[#1E2430] border-slate-700 text-white"
        />
      </Field>

      <div>
        <Label className="block mb-1 text-xs text-slate-300 font-semibold">
          Subclass Features
        </Label>
        {features.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No features yet.</p>
        ) : (
          <div className="space-y-2">
            {features.map((f, fi) => (
              <div key={fi} className="bg-[#1E2430] border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex-1">
                    Feature #{fi + 1}
                  </span>
                  <Field label="Lvl">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={f.level ?? 3}
                      onChange={(e) => setFeatureLevel(fi, e.target.value)}
                      className="w-16 bg-[#050816] border border-slate-700 text-white text-center rounded px-1 py-0.5"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeFeature(fi)}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Remove feature"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <Field label="Name">
                  <Input
                    value={f.name || ""}
                    onChange={(e) => updateFeature(fi, { ...f, name: e.target.value })}
                    placeholder="Feature name"
                    className="bg-[#050816] border-slate-700 text-white"
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={f.description || ""}
                    onChange={(e) => updateFeature(fi, { ...f, description: e.target.value })}
                    rows={2}
                    className="bg-[#050816] border-slate-700 text-white"
                  />
                </Field>
                <details className="bg-[#0b1220] border border-slate-700 rounded p-2">
                  <summary className="cursor-pointer text-xs text-slate-300 font-semibold">
                    Mechanical Effect
                  </summary>
                  <div className="mt-3">
                    <MechanicalEffectFields
                      value={f.mechanical || {}}
                      onChange={(next) => updateFeature(fi, { ...f, mechanical: next })}
                    />
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addFeature} className="mt-2">
          <Plus className="w-3 h-3 mr-1" /> Add Subclass Feature
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── B8 Class Resource ─────────────────────

const RESOURCE_RECHARGES = ["short_rest", "long_rest", "dawn", "dusk", "special"];

function blankResourceCountsByLevel() {
  return Array.from({ length: 20 }, (_, i) => ({ level: i + 1, count: 0 }));
}

function ClassResourceSection({ formData, setField }) {
  const res = formData.class_resource || {
    enabled: false,
    name: "",
    abbreviation: "",
    count_by_level: blankResourceCountsByLevel(),
    recharge: "long_rest",
  };
  const counts = Array.isArray(res.count_by_level) && res.count_by_level.length === 20
    ? res.count_by_level
    : blankResourceCountsByLevel();

  const setRes = (patch) => setField("class_resource", { ...res, ...patch });

  const setCount = (rowIdx, value) => {
    const next = counts.map((r, i) => (i === rowIdx ? { ...r, count: Number(value) || 0 } : r));
    setRes({ count_by_level: next });
  };

  return (
    <Section title="Class Resource">
      <div className="flex items-center gap-3">
        <Switch
          checked={!!res.enabled}
          onCheckedChange={(v) => setRes({ enabled: v })}
          id="resource-toggle"
        />
        <Label htmlFor="resource-toggle" className="text-sm text-slate-300">
          This class has a tracked resource (Ki, Rages, Superiority Dice, etc.)
        </Label>
      </div>

      {res.enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Field label="Resource Name">
                <Input
                  value={res.name || ""}
                  onChange={(e) => setRes({ name: e.target.value })}
                  placeholder="e.g., Ki Points"
                  className="bg-[#050816] border-slate-700 text-white"
                />
              </Field>
            </div>
            <Field label="Abbreviation">
              <Input
                value={res.abbreviation || ""}
                onChange={(e) => setRes({ abbreviation: e.target.value })}
                placeholder="e.g., Ki"
                className="bg-[#050816] border-slate-700 text-white"
              />
            </Field>
          </div>

          <Field label="Recharges On">
            <Select value={res.recharge || "long_rest"} onValueChange={(v) => setRes({ recharge: v })}>
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_RECHARGES.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="bg-[#050816] border border-slate-700 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
              Count by Class Level
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {counts.map((row, rowIdx) => (
                <div key={row.level} className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold w-6 text-right">{row.level}</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={row.count}
                    onChange={(e) => setCount(rowIdx, e.target.value)}
                    className="w-14 bg-[#1E2430] border border-slate-700 text-white text-center rounded px-1 py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

// ────────────────────────── B9 Multiclass ────────────────────────

function MulticlassSection({ formData, setField }) {
  const mc = formData.multiclass || { ability_requirement: {}, proficiencies_gained: [] };
  const setMc = (patch) => setField("multiclass", { ...mc, ...patch });

  const setReq = (ab, value) => {
    const next = { ...(mc.ability_requirement || {}) };
    const n = Number(value) || 0;
    if (n <= 0) delete next[ab];
    else next[ab] = n;
    setMc({ ability_requirement: next });
  };

  return (
    <Section title="Multiclass Requirements">
      <p className="text-[11px] text-slate-500 -mt-1">
        Minimum ability scores to multiclass into or out of this class. Leave a score at 0 to skip that requirement.
      </p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {ABILITIES.map((ab) => (
          <Field key={ab} label={ab}>
            <NumberInput
              value={(mc.ability_requirement || {})[ab] ?? 0}
              onChange={(v) => setReq(ab, v)}
              min={0}
              max={20}
            />
          </Field>
        ))}
      </div>
      <Field label="Proficiencies Granted on Multiclass Entry">
        <ChipMultiSelect
          options={[...ARMOR_OPTIONS, ...WEAPON_OPTIONS, ...TOOL_OPTIONS, ...SKILL_OPTIONS]}
          values={mc.proficiencies_gained || []}
          onChange={(v) => setMc({ proficiencies_gained: v })}
        />
      </Field>
    </Section>
  );
}
