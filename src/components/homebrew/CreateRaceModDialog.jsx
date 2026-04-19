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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  BLANK_RACE,
  BLANK_TRAIT,
  RACE_ABILITY_MODES,
  RACE_SIZES,
  DARKVISION_OPTIONS,
  SPEED_TYPES,
  DAMAGE_TYPES,
  TRAIT_EFFECT_TYPES,
  TRAIT_COSTS,
  TRAIT_RECHARGE,
} from "@/config/breweryRaceSchema";
import { CONDITIONS } from "@/components/combat/conditions";

/**
 * Race mod creator — dialog form that authors a brewery_mods row
 * with mod_type='race'. The metadata it writes matches what the
 * character creator expects from SRD races (see Part 2A schema).
 *
 * This file grows in pieces: Identity / Ability Scores / Basics ship
 * first; Languages / Proficiencies / Resistances / Traits / Subraces
 * / Flavor / Save buttons land in follow-up commits.
 *
 * Props:
 *   open     — dialog visibility
 *   onClose  — close handler (also fired after a successful save)
 *   mod      — existing brewery_mods row to edit (optional)
 */

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

const ASI_MODE_LABELS = {
  fixed:  "Fixed Bonuses",
  choose: "Player's Choice (Tasha's)",
  custom: "Hybrid (Half-Elf style)",
};

const GAME_SYSTEMS = [
  { value: "dnd5e", label: "D&D 5e" },
];

// Option lists for B4-B6. Hard-coded here rather than pulled from
// dnd5eRules so a later system can swap them without refactoring
// the creator form.
const LANGUAGE_OPTIONS = [
  "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin",
  "Halfling", "Orc", "Abyssal", "Celestial", "Draconic", "Deep Speech",
  "Infernal", "Primordial", "Sylvan", "Undercommon",
];

const SKILL_OPTIONS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival",
];

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

const CONDITION_OPTIONS = Object.keys(CONDITIONS || {});

function cloneBlankRace() {
  return JSON.parse(JSON.stringify(BLANK_RACE));
}

export default function CreateRaceModDialog({ open, onClose, mod = null }) {
  const [formData, setFormData] = useState(cloneBlankRace);
  const [gameSystem, setGameSystem] = useState("dnd5e");

  // Reset state every time the dialog is opened so a closed-then-
  // reopened dialog doesn't leak the previous session's state.
  useEffect(() => {
    if (!open) return;
    if (mod) {
      setFormData({ ...cloneBlankRace(), ...(mod.metadata || {}), name: mod.name || "" });
      setGameSystem(mod.game_system || "dnd5e");
    } else {
      setFormData(cloneBlankRace());
      setGameSystem("dnd5e");
    }
  }, [open, mod]);

  const setField = (key, value) => setFormData((f) => ({ ...f, [key]: value }));
  const setAsi = (updater) =>
    setFormData((f) => ({ ...f, ability_score_increases: updater(f.ability_score_increases) }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mod ? "Edit Race Mod" : "Create Race Mod"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <IdentitySection
            formData={formData}
            setField={setField}
            gameSystem={gameSystem}
            setGameSystem={setGameSystem}
          />
          <AbilityScoresSection formData={formData} setAsi={setAsi} />
          <BasicsSection formData={formData} setField={setField} />
          <LanguagesSection formData={formData} setField={setField} />
          <ProficienciesSection formData={formData} setField={setField} />
          <ResistancesSection formData={formData} setField={setField} />
          <TraitsSection formData={formData} setField={setField} />
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

function ChipMultiSelect({ options, values, onChange }) {
  const selected = Array.isArray(values) ? values : [];
  const toggle = (opt) => {
    const next = selected.includes(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt];
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

// ────────────────────────── B1 Identity ──────────────────────────

function IdentitySection({ formData, setField, gameSystem, setGameSystem }) {
  return (
    <Section title="Identity">
      <Field label="Race Name" required>
        <Input
          value={formData.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="e.g., Tigerfolk"
          className="bg-[#050816] border-slate-700 text-white"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={formData.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Fierce feline humanoids from the Sunstripe Savanna..."
          rows={4}
          className="bg-[#050816] border-slate-700 text-white"
        />
      </Field>
      <Field label="Portrait Image URL">
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

// ──────────────────────── B2 Ability Scores ──────────────────────

function AbilityScoresSection({ formData, setAsi }) {
  const asi = formData.ability_score_increases || {};
  const mode = asi.mode || "fixed";

  const setMode = (next) => setAsi((cur) => ({ ...cur, mode: next }));
  const setFixedScore = (key, value) =>
    setAsi((cur) => ({ ...cur, fixed: { ...(cur.fixed || {}), [key]: Number(value) || 0 } }));
  const setChooseField = (key, value) =>
    setAsi((cur) => ({ ...cur, choose: { ...(cur.choose || {}), [key]: Number(value) || 0 } }));
  const setCustomFixed = (key, value) =>
    setAsi((cur) => {
      const nextFixed = { ...((cur.custom || {}).fixed || {}) };
      const n = Number(value) || 0;
      if (n === 0) delete nextFixed[key];
      else nextFixed[key] = n;
      return { ...cur, custom: { ...(cur.custom || {}), fixed: nextFixed } };
    });
  const setCustomChoose = (key, value) =>
    setAsi((cur) => ({
      ...cur,
      custom: {
        ...(cur.custom || {}),
        choose: { ...((cur.custom || {}).choose || {}), [key]: Number(value) || 0 },
      },
    }));
  const toggleExclude = (key) =>
    setAsi((cur) => {
      const existing = ((cur.custom || {}).choose || {}).exclude || [];
      const next = existing.includes(key)
        ? existing.filter((k) => k !== key)
        : [...existing, key];
      return {
        ...cur,
        custom: {
          ...(cur.custom || {}),
          choose: { ...((cur.custom || {}).choose || {}), exclude: next },
        },
      };
    });

  return (
    <Section title="Ability Score Increases">
      <RadioGroup
        value={mode}
        onValueChange={setMode}
        className="flex flex-col gap-2"
      >
        {RACE_ABILITY_MODES.map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={m} />
            <span>{ASI_MODE_LABELS[m] || m}</span>
          </label>
        ))}
      </RadioGroup>

      {mode === "fixed" && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {ABILITY_KEYS.map((k) => (
            <Field key={k} label={k.toUpperCase()}>
              <NumberInput
                value={(asi.fixed || {})[k] ?? 0}
                onChange={(v) => setFixedScore(k, v)}
              />
            </Field>
          ))}
        </div>
      )}

      {mode === "choose" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pick X scores">
            <NumberInput
              value={(asi.choose || {}).count ?? 0}
              onChange={(v) => setChooseField("count", v)}
              min={1}
            />
          </Field>
          <Field label="Each gets +Y">
            <NumberInput
              value={(asi.choose || {}).amount ?? 0}
              onChange={(v) => setChooseField("amount", v)}
              min={1}
            />
          </Field>
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-3">
          <div>
            <Label className="block mb-1 text-xs text-slate-300 font-semibold">
              Fixed bonuses
            </Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {ABILITY_KEYS.map((k) => (
                <Field key={k} label={k.toUpperCase()}>
                  <NumberInput
                    value={((asi.custom || {}).fixed || {})[k] ?? 0}
                    onChange={(v) => setCustomFixed(k, v)}
                  />
                </Field>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pick X more">
              <NumberInput
                value={((asi.custom || {}).choose || {}).count ?? 0}
                onChange={(v) => setCustomChoose("count", v)}
                min={1}
              />
            </Field>
            <Field label="Each gets +Y">
              <NumberInput
                value={((asi.custom || {}).choose || {}).amount ?? 0}
                onChange={(v) => setCustomChoose("amount", v)}
                min={1}
              />
            </Field>
          </div>
          <Field label="Exclude from choice (already fixed)">
            <div className="flex flex-wrap gap-1.5">
              {ABILITY_KEYS.map((k) => {
                const excluded = (((asi.custom || {}).choose || {}).exclude || []).includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleExclude(k)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors uppercase ${
                      excluded
                        ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                        : "bg-[#050816] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────── B3 Basics ───────────────────────────

function BasicsSection({ formData, setField }) {
  const speeds = formData.additional_speeds || {};
  const setSpeed = (key, value) =>
    setField("additional_speeds", { ...speeds, [key]: Number(value) || 0 });

  return (
    <Section title="Basics">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Size">
          <Select value={formData.size} onValueChange={(v) => setField("size", v)}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RACE_SIZES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Base Speed (ft)">
          <NumberInput
            value={formData.speed ?? 30}
            onChange={(v) => setField("speed", v)}
            min={0}
            step={5}
          />
        </Field>
        <Field label="Darkvision (ft)">
          <Select
            value={String(formData.darkvision ?? 0)}
            onValueChange={(v) => setField("darkvision", Number(v))}
          >
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DARKVISION_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>{d === 0 ? "None" : `${d} ft`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <details className="bg-[#050816] border border-slate-700 rounded-lg p-3">
        <summary className="cursor-pointer text-xs text-slate-300 font-semibold">
          Additional Speeds
        </summary>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {SPEED_TYPES.map((t) => (
            <Field key={t} label={t.charAt(0).toUpperCase() + t.slice(1)}>
              <NumberInput
                value={speeds[t] ?? 0}
                onChange={(v) => setSpeed(t, v)}
                min={0}
                step={5}
              />
            </Field>
          ))}
        </div>
      </details>
    </Section>
  );
}

// ───────────────────────── B4 Languages ──────────────────────────

function LanguagesSection({ formData, setField }) {
  const langs = formData.languages || { fixed: [], bonus_picks: 0, restricted_to: [] };
  const setLang = (key, value) =>
    setField("languages", { ...langs, [key]: value });

  return (
    <Section title="Languages">
      <Field label="Fixed Languages (auto-granted)">
        <ChipMultiSelect
          options={LANGUAGE_OPTIONS}
          values={langs.fixed || []}
          onChange={(v) => setLang("fixed", v)}
        />
      </Field>
      <Field label="Bonus Language Picks">
        <NumberInput
          value={langs.bonus_picks ?? 0}
          onChange={(v) => setLang("bonus_picks", v)}
          min={0}
          max={10}
        />
      </Field>
      <Field label="Restricted To (leave empty to allow any language)">
        <ChipMultiSelect
          options={LANGUAGE_OPTIONS}
          values={langs.restricted_to || []}
          onChange={(v) => setLang("restricted_to", v)}
        />
      </Field>
    </Section>
  );
}

// ──────────────────────── B5 Proficiencies ───────────────────────

function ProficienciesSection({ formData, setField }) {
  const skills = formData.skill_proficiencies || { fixed: [], choose: 0, choose_from: [] };
  const setSkills = (key, value) =>
    setField("skill_proficiencies", { ...skills, [key]: value });

  return (
    <Section title="Proficiencies">
      <Field label="Fixed Skill Proficiencies">
        <ChipMultiSelect
          options={SKILL_OPTIONS}
          values={skills.fixed || []}
          onChange={(v) => setSkills("fixed", v)}
        />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Choose X Skills">
          <NumberInput
            value={skills.choose ?? 0}
            onChange={(v) => setSkills("choose", v)}
            min={0}
            max={10}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="…from (leave empty for any skill)">
            <ChipMultiSelect
              options={SKILL_OPTIONS}
              values={skills.choose_from || []}
              onChange={(v) => setSkills("choose_from", v)}
            />
          </Field>
        </div>
      </div>
      <Field label="Weapon Proficiencies">
        <ChipMultiSelect
          options={WEAPON_OPTIONS}
          values={formData.weapon_proficiencies || []}
          onChange={(v) => setField("weapon_proficiencies", v)}
        />
      </Field>
      <Field label="Armor Proficiencies">
        <ChipMultiSelect
          options={ARMOR_OPTIONS}
          values={formData.armor_proficiencies || []}
          onChange={(v) => setField("armor_proficiencies", v)}
        />
      </Field>
      <Field label="Tool Proficiencies">
        <ChipMultiSelect
          options={TOOL_OPTIONS}
          values={formData.tool_proficiencies || []}
          onChange={(v) => setField("tool_proficiencies", v)}
        />
      </Field>
    </Section>
  );
}

// ───────────────────────── B6 Resistances ────────────────────────

function ResistancesSection({ formData, setField }) {
  return (
    <Section title="Resistances & Immunities">
      <Field label="Damage Resistances">
        <ChipMultiSelect
          options={DAMAGE_TYPES}
          values={formData.damage_resistances || []}
          onChange={(v) => setField("damage_resistances", v)}
        />
      </Field>
      <Field label="Damage Immunities">
        <ChipMultiSelect
          options={DAMAGE_TYPES}
          values={formData.damage_immunities || []}
          onChange={(v) => setField("damage_immunities", v)}
        />
      </Field>
      <Field label="Condition Resistances (advantage on saves vs.)">
        <ChipMultiSelect
          options={CONDITION_OPTIONS}
          values={formData.condition_resistances || []}
          onChange={(v) => setField("condition_resistances", v)}
        />
      </Field>
    </Section>
  );
}

// ──────────────────────── B7 Racial Traits ───────────────────────

function cloneBlankTrait() {
  return JSON.parse(JSON.stringify(BLANK_TRAIT));
}

function TraitsSection({ formData, setField }) {
  const traits = Array.isArray(formData.traits) ? formData.traits : [];
  const add = () => setField("traits", [...traits, cloneBlankTrait()]);
  const update = (idx, next) =>
    setField("traits", traits.map((t, i) => (i === idx ? next : t)));
  const remove = (idx) =>
    setField("traits", traits.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= traits.length) return;
    const next = [...traits];
    [next[idx], next[target]] = [next[target], next[idx]];
    setField("traits", next);
  };

  return (
    <Section title="Racial Traits">
      {traits.length === 0 && (
        <p className="text-xs text-slate-500 italic">
          No traits yet — click "Add Trait" to create the first racial feature.
        </p>
      )}
      <div className="space-y-3">
        {traits.map((trait, idx) => (
          <TraitEditor
            key={idx}
            trait={trait}
            idx={idx}
            total={traits.length}
            onChange={(next) => update(idx, next)}
            onRemove={() => remove(idx)}
            onMoveUp={() => move(idx, -1)}
            onMoveDown={() => move(idx, 1)}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="mt-2"
      >
        <Plus className="w-3 h-3 mr-1" /> Add Trait
      </Button>
    </Section>
  );
}

function TraitEditor({ trait, idx, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  const set = (key, value) => onChange({ ...trait, [key]: value });
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex-1">
          Trait #{idx + 1}
        </span>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={idx === 0}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
          title="Move up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={idx === total - 1}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
          title="Move down"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-400 hover:text-red-300"
          title="Delete trait"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="md:col-span-3">
          <Field label="Name">
            <Input
              value={trait.name || ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g., Feline Agility"
              className="bg-[#1E2430] border-slate-700 text-white"
            />
          </Field>
        </div>
        <Field label="Level">
          <NumberInput
            value={trait.level ?? 1}
            onChange={(v) => set("level", v)}
            min={1}
            max={20}
          />
        </Field>
      </div>

      <Field label="Description">
        <Textarea
          value={trait.description || ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What the trait does, in plain language."
          rows={3}
          className="bg-[#1E2430] border-slate-700 text-white"
        />
      </Field>

      <details className="bg-[#0b1220] border border-slate-700 rounded p-2">
        <summary className="cursor-pointer text-xs text-slate-300 font-semibold">
          Mechanical Effect
        </summary>
        <div className="mt-3">
          <MechanicalEffectFields
            value={trait.mechanical || {}}
            onChange={(next) => set("mechanical", next)}
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
  const isLimitedUse = effect !== "utility" || (value?.uses && value.uses !== "At Will");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Field label="Effect Type">
        <Select value={effect} onValueChange={(v) => set("effect_type", v)}>
          <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAIT_EFFECT_TYPES.map((t) => (
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
            {TRAIT_COSTS.map((t) => (
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
              placeholder="e.g., 1d4"
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
                {DAMAGE_TYPES.map((t) => (
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
            placeholder="e.g., 1d6 + CON"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}

      {isLimitedUse && (
        <>
          <Field label="Uses">
            <Input
              value={value?.uses || ""}
              onChange={(e) => set("uses", e.target.value)}
              placeholder='e.g., "1", "At Will", "Prof/LR"'
              className="bg-[#1E2430] border-slate-700 text-white"
            />
          </Field>
          <Field label="Recharge">
            <Select
              value={value?.recharge || ""}
              onValueChange={(v) => set("recharge", v)}
            >
              <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
                <SelectValue placeholder="(none)" />
              </SelectTrigger>
              <SelectContent>
                {TRAIT_RECHARGE.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
    </div>
  );
}
