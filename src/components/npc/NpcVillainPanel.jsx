import { useState } from "react";
import { Plus, Trash, Crown, Swords, Skull, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAMAGE_TYPES } from "@/components/dnd5e/dnd5eRules";
import { CONDITION_COLORS } from "@/components/combat/conditions";

/**
 * NPC villain editor. Surfaces on a CampaignNPC row when the "This NPC
 * is a Villain" toggle is on, letting the GM author the same boss-
 * fight blocks a monster stat block can carry: villain actions (MCDM
 * three-round arc), legendary resistances, legendary actions, phase
 * transitions, and auras. Everything lives in a single `villain_data`
 * JSONB so the characters / campaign_npcs tables stay flat.
 *
 * Villain Actions and Legendary Actions are mutually exclusive — the
 * MCDM design swaps the legendary pool for a scripted arc. Toggling
 * one clears the other.
 *
 * Props:
 *   value     — villain_data object (or null on first open)
 *   onChange  — (nextVillainData) => void; parent persists via
 *               CampaignNPC.update({ villain_data: next })
 */
const SAVE_ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const AOE_SHAPES = ["", "Cone", "Line", "Sphere", "Cube", "Cylinder"];

const BLANK_VILLAIN_ACTION = {
  name: "",
  round: 1,
  description: "",
  action_type: "no_roll",
  save_ability: "",
  save_dc: "",
  attack_bonus: "",
  damage_dice: "",
  damage_type: "",
  healing_dice: "",
  half_on_save: true,
  applies_condition: "",
  condition_end: "",
  aoe_shape: "",
  aoe_size: "",
};

const BLANK_LEGENDARY_ACTION = {
  name: "",
  description: "",
  legendary_cost: 1,
  attack_bonus: "",
  damage: "",
  damage_type: "",
};

const BLANK_PHASE = {
  name: "",
  trigger_type: "hp_threshold",
  trigger_value: 50,
  hp_reset: null,
  reset_legendary_resistances: false,
  recharge_abilities: [],
  ac_change: null,
  speed_change: null,
  unlocked_actions: [],
  disabled_actions: [],
  self_conditions: [],
  unlocked_auras: [],
  description: "",
  phase_color: "#ef4444",
};

const BLANK_AURA = {
  name: "",
  description: "",
  radius: "10 ft",
  damage_dice: "",
  damage_type: "",
  save_ability: "",
  save_dc: "",
  trigger: "start_of_turn",
  applies_condition: "",
};

export default function NpcVillainPanel({ value, onChange, baseActionNames = [] }) {
  const data = value || {};
  const patch = (fields) => onChange({ ...data, ...fields });

  const villain = data.villain_actions || { enabled: false, actions: [] };
  const legendary = Array.isArray(data.legendary_actions) ? data.legendary_actions : [];
  const phases = Array.isArray(data.phases) ? data.phases : [];
  const auras = Array.isArray(data.auras) ? data.auras : [];

  // XOR — enabling villain actions clears legendary, and vice versa.
  const setVillainEnabled = (on) => {
    if (on) {
      patch({
        villain_actions: {
          enabled: true,
          actions: villain.actions?.length === 3 ? villain.actions : [
            { ...BLANK_VILLAIN_ACTION, round: 1 },
            { ...BLANK_VILLAIN_ACTION, round: 2 },
            { ...BLANK_VILLAIN_ACTION, round: 3 },
          ],
        },
        legendary_actions: [],
        legendary_actions_per_round: 0,
      });
    } else {
      patch({ villain_actions: { ...villain, enabled: false } });
    }
  };

  const updateVillainAction = (idx, fields) => {
    const next = villain.actions.map((a, i) => (i === idx ? { ...a, ...fields } : a));
    patch({ villain_actions: { ...villain, actions: next } });
  };

  const addLegendary = () => patch({
    legendary_actions: [...legendary, { ...BLANK_LEGENDARY_ACTION }],
    // Clear villain when the GM starts adding legendary — XOR.
    villain_actions: { ...villain, enabled: false },
  });
  const updateLegendary = (idx, fields) => patch({
    legendary_actions: legendary.map((a, i) => (i === idx ? { ...a, ...fields } : a)),
  });
  const removeLegendary = (idx) => patch({
    legendary_actions: legendary.filter((_, i) => i !== idx),
  });

  const addPhase = () => patch({ phases: [...phases, { ...BLANK_PHASE }] });
  const updatePhase = (idx, fields) => patch({
    phases: phases.map((p, i) => (i === idx ? { ...p, ...fields } : p)),
  });
  const removePhase = (idx) => patch({ phases: phases.filter((_, i) => i !== idx) });

  const addAura = () => patch({ auras: [...auras, { ...BLANK_AURA }] });
  const updateAura = (idx, fields) => patch({
    auras: auras.map((a, i) => (i === idx ? { ...a, ...fields } : a)),
  });
  const removeAura = (idx) => patch({ auras: auras.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      {/* --- Villain Actions (MCDM) --- */}
      <div className="bg-gradient-to-br from-[#1a0514] to-[#0b1220] border-2 border-rose-600/50 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm uppercase tracking-[0.2em] text-rose-300 font-black flex items-center gap-2">
              <Skull className="w-4 h-4" /> Villain Actions (MCDM)
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Three cinematic single-use actions, one per round. Fire at the end of an enemy's turn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!villain.enabled} onCheckedChange={setVillainEnabled} />
            <span className="text-xs text-slate-400">{villain.enabled ? "On" : "Off"}</span>
          </div>
        </div>
        {villain.enabled && (
          <div className="space-y-2">
            {legendary.length > 0 && (
              <p className="text-[11px] text-amber-300 italic">
                Villain Actions replace Legendary Actions. Enabling this cleared the legendary list.
              </p>
            )}
            {villain.actions.map((action, idx) => (
              <VillainActionCard
                key={idx}
                action={action}
                round={idx + 1}
                onChange={(fields) => updateVillainAction(idx, fields)}
              />
            ))}
          </div>
        )}
      </div>

      {/* --- Legendary Resistances + Legendary Actions --- */}
      <div className="bg-[#050816] border-2 border-amber-500/40 rounded-xl p-4 space-y-3">
        <h3 className="text-sm uppercase tracking-[0.2em] text-amber-300 font-black flex items-center gap-2">
          <Crown className="w-4 h-4" /> Legendary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Legendary resistances / day">
            <Input
              type="number" min={0} max={5}
              value={data.legendary_resistances ?? 0}
              onChange={(e) => patch({ legendary_resistances: Number(e.target.value) || 0 })}
              className="bg-[#0b1220] border-slate-700 text-white"
            />
          </Field>
          <Field label="Legendary actions / round">
            <Input
              type="number" min={0} max={5}
              value={data.legendary_actions_per_round ?? 0}
              onChange={(e) => patch({ legendary_actions_per_round: Number(e.target.value) || 0 })}
              disabled={!!villain.enabled}
              className="bg-[#0b1220] border-slate-700 text-white disabled:opacity-40"
            />
          </Field>
        </div>
        {villain.enabled ? (
          <p className="text-[11px] text-slate-500 italic">
            Legendary Actions are disabled while Villain Actions are on.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                Legendary action list
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addLegendary}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {legendary.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic text-center py-2">
                No legendary actions.
              </p>
            ) : (
              <div className="space-y-2">
                {legendary.map((action, idx) => (
                  <div key={idx} className="bg-[#0b1220] border border-amber-500/40 rounded p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={action.name || ""}
                        onChange={(e) => updateLegendary(idx, { name: e.target.value })}
                        placeholder="Tail Attack, Frightful Presence, ..."
                        className="bg-[#050816] border-slate-700 text-white flex-1"
                      />
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        Cost:
                        <Input
                          type="number" min={1} max={3}
                          value={action.legendary_cost ?? 1}
                          onChange={(e) => updateLegendary(idx, { legendary_cost: Number(e.target.value) || 1 })}
                          className="bg-[#050816] border-slate-700 text-white w-12 text-xs h-7"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLegendary(idx)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                    <Textarea
                      value={action.description || ""}
                      onChange={(e) => updateLegendary(idx, { description: e.target.value })}
                      placeholder="Effect"
                      rows={2}
                      className="bg-[#050816] border-slate-700 text-white text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* --- Phase Transitions (Tier 2) --- */}
      <div className="bg-[#050816] border-2 border-indigo-500/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-[0.2em] text-indigo-300 font-black flex items-center gap-2">
            <Zap className="w-4 h-4" /> Phase Transitions
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addPhase}>
            <Plus className="w-3 h-3 mr-1" /> Add Phase
          </Button>
        </div>
        {phases.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-2">
            No phase transitions. Add one to evolve the villain mid-fight.
          </p>
        ) : (
          <div className="space-y-2">
            {phases.map((phase, idx) => (
              <PhaseCard
                key={idx}
                phase={phase}
                baseActionNames={baseActionNames}
                onChange={(fields) => updatePhase(idx, fields)}
                onRemove={() => removePhase(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* --- Auras (Tier 1) --- */}
      <div className="bg-[#050816] border-2 border-pink-500/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-[0.2em] text-pink-300 font-black flex items-center gap-2">
            <Swords className="w-4 h-4" /> Auras
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addAura}>
            <Plus className="w-3 h-3 mr-1" /> Add Aura
          </Button>
        </div>
        {auras.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-2">
            No auras.
          </p>
        ) : (
          <div className="space-y-2">
            {auras.map((aura, idx) => (
              <AuraCard
                key={idx}
                aura={aura}
                onChange={(fields) => updateAura(idx, fields)}
                onRemove={() => removeAura(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="block mb-1 text-[11px] text-slate-300 font-semibold uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}

function VillainActionCard({ action, round, onChange }) {
  const type = action.action_type || "no_roll";
  const isSave = type === "save";
  const isAttack = type === "attack";
  const isHealing = type === "healing";
  return (
    <div className="bg-[#0b1220] border border-rose-600/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 bg-rose-600/20 border border-rose-600/60 rounded px-2 py-0.5">
          Round {round}
        </span>
        <Input
          value={action.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Villain Action ${round}`}
          className="bg-[#050816] border-slate-700 text-white flex-1"
        />
      </div>
      <Textarea
        value={action.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="What the villain does this round."
        rows={2}
        className="bg-[#050816] border-slate-700 text-white text-xs"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CompactSelect
          label="Resolution"
          value={type}
          onChange={(v) => onChange({ action_type: v })}
          options={[
            { value: "no_roll", label: "No Roll" },
            { value: "save",    label: "Saving Throw" },
            { value: "attack",  label: "Attack Roll" },
            { value: "healing", label: "Healing" },
          ]}
        />
        {isSave && (
          <>
            <CompactSelect
              label="Save ability"
              value={action.save_ability || "DEX"}
              onChange={(v) => onChange({ save_ability: v })}
              options={SAVE_ABILITIES.map((s) => ({ value: s, label: s }))}
            />
            <CompactInput
              label="Save DC"
              type="number"
              value={action.save_dc ?? ""}
              onChange={(e) => onChange({ save_dc: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="18"
            />
            <div className="flex items-center gap-1 mt-5">
              <Switch
                checked={!!action.half_on_save}
                onCheckedChange={(c) => onChange({ half_on_save: c })}
              />
              <span className="text-[10px] text-slate-300">Half on save</span>
            </div>
          </>
        )}
        {isAttack && (
          <CompactInput
            label="Attack bonus"
            type="number"
            value={action.attack_bonus ?? ""}
            onChange={(e) => onChange({ attack_bonus: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder="+12"
          />
        )}
        {isHealing && (
          <CompactInput
            label="Healing dice"
            value={action.healing_dice || ""}
            onChange={(e) => onChange({ healing_dice: e.target.value })}
            placeholder="4d8+10"
          />
        )}
        {(isSave || isAttack) && (
          <>
            <CompactInput
              label="Damage dice"
              value={action.damage_dice || ""}
              onChange={(e) => onChange({ damage_dice: e.target.value })}
              placeholder="6d6"
            />
            <CompactSelect
              label="Damage type"
              value={action.damage_type || "fire"}
              onChange={(v) => onChange({ damage_type: v })}
              options={DAMAGE_TYPES.map((d) => ({ value: d, label: d }))}
            />
          </>
        )}
        <CompactSelect
          label="Condition"
          value={action.applies_condition || ""}
          onChange={(v) => onChange({ applies_condition: v === "__none" ? "" : v })}
          placeholder="None"
          options={[
            { value: "__none", label: "None" },
            ...Object.keys(CONDITION_COLORS).map((c) => ({ value: c, label: c })),
          ]}
        />
        <CompactSelect
          label="AoE shape"
          value={action.aoe_shape || ""}
          onChange={(v) => onChange({ aoe_shape: v === "__none" ? "" : v })}
          placeholder="None"
          options={[
            { value: "__none", label: "None" },
            ...AOE_SHAPES.filter(Boolean).map((s) => ({ value: s, label: s })),
          ]}
        />
        <CompactInput
          label="AoE size"
          value={action.aoe_size || ""}
          onChange={(e) => onChange({ aoe_size: e.target.value })}
          placeholder="30 ft"
        />
      </div>
    </div>
  );
}

function PhaseCard({ phase, onChange, onRemove, baseActionNames }) {
  const unlocked = Array.isArray(phase.unlocked_actions) ? phase.unlocked_actions : [];
  const disabled = Array.isArray(phase.disabled_actions) ? phase.disabled_actions : [];

  const BLANK_PHASE_ACTION = {
    name: "",
    description: "",
    action_type: "melee_attack",
    action_cost: "Action",
    attack_bonus: "",
    save_ability: "",
    save_dc: "",
    half_on_save: true,
    damage_dice: "",
    damage_type: "",
    reach: "",
    applies_condition: "",
    aoe_shape: "",
    aoe_size: "",
    recharge: "",
  };

  const addAction = () => onChange({ unlocked_actions: [...unlocked, { ...BLANK_PHASE_ACTION }] });
  const updateAction = (idx, fields) => onChange({
    unlocked_actions: unlocked.map((a, i) => (i === idx ? { ...a, ...fields } : a)),
  });
  const removeAction = (idx) => onChange({ unlocked_actions: unlocked.filter((_, i) => i !== idx) });

  const toggleDisabled = (name) => {
    const set = new Set(disabled);
    if (set.has(name)) set.delete(name); else set.add(name);
    onChange({ disabled_actions: Array.from(set) });
  };

  return (
    <div className="bg-[#0b1220] border border-indigo-500/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={phase.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Phase name (e.g., Bloodied)"
          className="bg-[#050816] border-slate-700 text-white flex-1"
        />
        <input
          type="color"
          value={phase.phase_color || "#ef4444"}
          onChange={(e) => onChange({ phase_color: e.target.value })}
          className="w-10 h-9 rounded border border-slate-700 bg-[#050816]"
          title="Phase color (tints portrait/HP bar + badge on unlocked actions)"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-400"
        >
          <Trash className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <CompactSelect
          label="Trigger"
          value={phase.trigger_type || "hp_threshold"}
          onChange={(v) => onChange({ trigger_type: v })}
          options={[
            { value: "hp_threshold", label: "HP %" },
            { value: "round_count",  label: "Round #" },
            { value: "manual",       label: "Manual" },
          ]}
        />
        {phase.trigger_type !== "manual" && (
          <CompactInput
            label={phase.trigger_type === "hp_threshold" ? "% HP" : "Round"}
            type="number"
            value={phase.trigger_value ?? ""}
            onChange={(e) => onChange({ trigger_value: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="50"
          />
        )}
        <CompactInput
          label="HP reset (optional)"
          type="number"
          value={phase.hp_reset ?? ""}
          onChange={(e) => onChange({ hp_reset: e.target.value === "" ? null : Number(e.target.value) })}
          placeholder="blank = no reset"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={!!phase.reset_legendary_resistances}
          onCheckedChange={(c) => onChange({ reset_legendary_resistances: c })}
        />
        <span className="text-[10px] text-slate-300">Refill legendary resistances on trigger</span>
      </div>
      <Textarea
        value={phase.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Narrative — what the GM reads aloud when the phase triggers."
        rows={2}
        className="bg-[#050816] border-slate-700 text-white text-xs"
      />

      <div className="bg-[#050816] border border-indigo-400/30 rounded p-2 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold">
            Unlocked actions (new, phase-only)
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addAction}>
            <Plus className="w-3 h-3 mr-1" /> Add Action
          </Button>
        </div>
        {unlocked.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-2">
            No phase-only actions. Add Desperate Frenzy, Wing Buffet, etc.
          </p>
        ) : (
          unlocked.map((a, idx) => (
            <PhaseActionEditor
              key={idx}
              action={a}
              tint={phase.phase_color || "#ef4444"}
              onChange={(fields) => updateAction(idx, fields)}
              onRemove={() => removeAction(idx)}
            />
          ))
        )}
      </div>

      {Array.isArray(baseActionNames) && baseActionNames.length > 0 && (
        <div className="bg-[#050816] border border-indigo-400/30 rounded p-2 space-y-1">
          <Label className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold block">
            Disabled base actions (hidden during this phase)
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {baseActionNames.map((name) => {
              const active = disabled.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleDisabled(name)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                    active
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-[#0b1220] border-slate-700 text-slate-300 hover:border-red-400"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Full authoring form for a phase-unlocked action. Mirrors the
// monster-action fields from Tier 1 (attack / save / no_roll / healing
// resolution, damage, conditions, AoE, recharge) so GMs can build
// entirely new actions that only appear when a phase fires.
function PhaseActionEditor({ action, tint, onChange, onRemove }) {
  const type = action.action_type || "melee_attack";
  const isAttack = type === "melee_attack" || type === "ranged_attack";
  const isSave = type === "saving_throw";
  const isHealing = type === "healing";
  return (
    <div
      className="bg-[#0b1220] border-2 rounded-lg p-2 space-y-2"
      style={{ borderColor: `${tint}55` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ background: `${tint}30`, color: tint, border: `1px solid ${tint}80` }}
        >
          Phase
        </span>
        <Input
          value={action.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Action name (e.g., Desperate Frenzy)"
          className="bg-[#050816] border-slate-700 text-white flex-1"
        />
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-400">
          <Trash className="w-3 h-3" />
        </button>
      </div>
      <Textarea
        value={action.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description"
        rows={2}
        className="bg-[#050816] border-slate-700 text-white text-xs"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CompactSelect
          label="Type"
          value={type}
          onChange={(v) => onChange({ action_type: v })}
          options={[
            { value: "melee_attack",  label: "Melee Attack" },
            { value: "ranged_attack", label: "Ranged Attack" },
            { value: "saving_throw",  label: "Saving Throw" },
            { value: "healing",       label: "Healing" },
            { value: "no_roll",       label: "No Roll" },
          ]}
        />
        <CompactSelect
          label="Cost"
          value={action.action_cost || "Action"}
          onChange={(v) => onChange({ action_cost: v })}
          options={[
            { value: "Action",        label: "Action" },
            { value: "Bonus Action",  label: "Bonus Action" },
            { value: "Reaction",      label: "Reaction" },
            { value: "Free",          label: "Free" },
            { value: "Legendary",     label: "Legendary" },
          ]}
        />
        <CompactInput
          label="Recharge"
          value={action.recharge || ""}
          onChange={(e) => onChange({ recharge: e.target.value })}
          placeholder="5-6 / 6 / short"
        />
        {isAttack && (
          <CompactInput
            label="Atk bonus"
            type="number"
            value={action.attack_bonus ?? ""}
            onChange={(e) => onChange({ attack_bonus: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder="+9"
          />
        )}
        {isSave && (
          <>
            <CompactSelect
              label="Save ability"
              value={action.save_ability || "DEX"}
              onChange={(v) => onChange({ save_ability: v })}
              options={SAVE_ABILITIES.map((s) => ({ value: s, label: s }))}
            />
            <CompactInput
              label="Save DC"
              type="number"
              value={action.save_dc ?? ""}
              onChange={(e) => onChange({ save_dc: e.target.value === "" ? "" : Number(e.target.value) })}
              placeholder="17"
            />
            <div className="flex items-center gap-1 mt-5">
              <Switch
                checked={!!action.half_on_save}
                onCheckedChange={(c) => onChange({ half_on_save: c })}
              />
              <span className="text-[10px] text-slate-300">Half on save</span>
            </div>
          </>
        )}
        {(isAttack || isSave) && (
          <>
            <CompactInput
              label="Damage dice"
              value={action.damage_dice || ""}
              onChange={(e) => onChange({ damage_dice: e.target.value })}
              placeholder="3d8+5"
            />
            <CompactSelect
              label="Damage type"
              value={action.damage_type || "slashing"}
              onChange={(v) => onChange({ damage_type: v })}
              options={DAMAGE_TYPES.map((d) => ({ value: d, label: d }))}
            />
          </>
        )}
        {isAttack && (
          <CompactInput
            label="Reach / Range"
            value={action.reach || ""}
            onChange={(e) => onChange({ reach: e.target.value })}
            placeholder="5 ft / 60/120 ft"
          />
        )}
        {isHealing && (
          <CompactInput
            label="Healing dice"
            value={action.damage_dice || ""}
            onChange={(e) => onChange({ damage_dice: e.target.value })}
            placeholder="4d8+10"
          />
        )}
        <CompactSelect
          label="Condition"
          value={action.applies_condition || ""}
          onChange={(v) => onChange({ applies_condition: v === "__none" ? "" : v })}
          placeholder="None"
          options={[
            { value: "__none", label: "None" },
            ...Object.keys(CONDITION_COLORS).map((c) => ({ value: c, label: c })),
          ]}
        />
        <CompactSelect
          label="AoE shape"
          value={action.aoe_shape || ""}
          onChange={(v) => onChange({ aoe_shape: v === "__none" ? "" : v })}
          placeholder="None"
          options={[
            { value: "__none", label: "None" },
            { value: "Cone",     label: "Cone" },
            { value: "Line",     label: "Line" },
            { value: "Sphere",   label: "Sphere" },
            { value: "Cube",     label: "Cube" },
            { value: "Cylinder", label: "Cylinder" },
          ]}
        />
        <CompactInput
          label="AoE size"
          value={action.aoe_size || ""}
          onChange={(e) => onChange({ aoe_size: e.target.value })}
          placeholder="30 ft"
        />
      </div>
    </div>
  );
}

function AuraCard({ aura, onChange, onRemove }) {
  return (
    <div className="bg-[#0b1220] border border-pink-500/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={aura.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Aura name"
          className="bg-[#050816] border-slate-700 text-white flex-1"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-400"
        >
          <Trash className="w-3 h-3" />
        </button>
      </div>
      <Textarea
        value={aura.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="What does the aura do?"
        rows={2}
        className="bg-[#050816] border-slate-700 text-white text-xs"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CompactInput
          label="Radius"
          value={aura.radius || ""}
          onChange={(e) => onChange({ radius: e.target.value })}
          placeholder="10 ft"
        />
        <CompactSelect
          label="Trigger"
          value={aura.trigger || "start_of_turn"}
          onChange={(v) => onChange({ trigger: v })}
          options={[
            { value: "start_of_turn", label: "Start of target turn" },
            { value: "enter_aura",    label: "On enter" },
            { value: "end_of_turn",   label: "End of target turn" },
          ]}
        />
        <CompactInput
          label="Damage dice"
          value={aura.damage_dice || ""}
          onChange={(e) => onChange({ damage_dice: e.target.value })}
          placeholder="1d6"
        />
        <CompactSelect
          label="Damage type"
          value={aura.damage_type || ""}
          onChange={(v) => onChange({ damage_type: v === "__none" ? "" : v })}
          placeholder="None"
          options={[
            { value: "__none", label: "None" },
            ...DAMAGE_TYPES.map((d) => ({ value: d, label: d })),
          ]}
        />
        <CompactSelect
          label="Save ability"
          value={aura.save_ability || ""}
          onChange={(v) => onChange({ save_ability: v === "__none" ? "" : v })}
          placeholder="None"
          options={[
            { value: "__none", label: "None" },
            ...SAVE_ABILITIES.map((s) => ({ value: s, label: s })),
          ]}
        />
        <CompactInput
          label="Save DC"
          type="number"
          value={aura.save_dc ?? ""}
          onChange={(e) => onChange({ save_dc: e.target.value === "" ? "" : Number(e.target.value) })}
          placeholder="blank = caster DC"
        />
        <CompactSelect
          label="Applies condition"
          value={aura.applies_condition || ""}
          onChange={(v) => onChange({ applies_condition: v === "__none" ? "" : v })}
          placeholder="None"
          options={[
            { value: "__none", label: "None" },
            ...Object.keys(CONDITION_COLORS).map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>
    </div>
  );
}

function CompactInput({ label, ...props }) {
  return (
    <div>
      <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">{label}</Label>
      <Input {...props} className="bg-[#050816] border-slate-700 text-white text-xs h-8" />
    </div>
  );
}

function CompactSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="bg-[#050816] border-slate-700 text-white text-xs h-8">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
