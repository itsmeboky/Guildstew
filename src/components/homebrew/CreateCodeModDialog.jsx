import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Plus, Trash2, Code2, FlaskConical, CheckCircle2, XCircle, Sparkles,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useSubscription } from "@/lib/SubscriptionContext";
import { tierAtLeast } from "@/api/billingClient";
import { validateFormula, evaluateFormula } from "@/lib/formulaEvaluator";
import CodeModHelpPanel, { CodeModHelpButton } from "./CodeModHelpPanel";
import {
  BLANK_CODE_MOD,
  EFFECT_TYPES,
  effectTypeMeta,
  TRIGGER_EVENTS,
  TRIGGER_GATES,
  TRIGGER_TEMPLATES,
  DEFAULT_MOCK_CONTEXT,
  APPLIES_TO_OPTIONS,
  RESOLUTION_RESOURCES,
  DAMAGE_TYPE_OPTIONS,
  REPLACES_OPTIONS,
  blankTrigger,
  blankConfigParam,
  cloneTriggerTemplate,
} from "@/config/codeModSchema";

/**
 * Code mod creator.
 *
 * Authoring Veteran-tier custom game mechanics. Every formula
 * typed into this form runs through validateFormula on blur so
 * errors surface before publish; the Test sandbox runs a real
 * evaluateFormula against a configurable mock context so the
 * author can verify the formula before sending it live.
 *
 * Installing a code mod only requires Adventurer tier
 * (downstream gate); creating / publishing requires Veteran.
 */

function cloneBlankMod() {
  return JSON.parse(JSON.stringify(BLANK_CODE_MOD));
}

export default function CreateCodeModDialog({ open, onClose, mod = null }) {
  const [formData, setFormData] = useState(cloneBlankMod);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameSystem, setGameSystem] = useState("dnd5e");
  const queryClient = useQueryClient();
  const sub = useSubscription();
  const canPublish = tierAtLeast(sub?.tier || "free", "veteran");
  const canCreate = canPublish;
  const isEdit = !!mod?.id;
  const [helpOpen, setHelpOpen] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (mod) {
      const meta = mod.metadata || {};
      setFormData({
        ...cloneBlankMod(),
        ...meta,
        triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
        config_schema: Array.isArray(meta.config_schema) ? meta.config_schema : [],
      });
      setName(mod.name || "");
      setDescription(meta.description || "");
      setGameSystem(mod.game_system || "dnd5e");
    } else {
      setFormData(cloneBlankMod());
      setName("");
      setDescription("");
      setGameSystem("dnd5e");
    }
  }, [open, mod]);

  // ── Trigger mutators ────────────────────────────────────────
  const addBlankTrigger = () =>
    setFormData((f) => ({ ...f, triggers: [...(f.triggers || []), blankTrigger()] }));
  const addTriggerFromTemplate = (templateId) =>
    setFormData((f) => ({ ...f, triggers: [...(f.triggers || []), cloneTriggerTemplate(templateId)] }));
  const updateTrigger = (idx, next) =>
    setFormData((f) => ({
      ...f,
      triggers: (f.triggers || []).map((t, i) => (i === idx ? next : t)),
    }));
  const removeTrigger = (idx) =>
    setFormData((f) => ({ ...f, triggers: (f.triggers || []).filter((_, i) => i !== idx) }));

  // ── Config param mutators ───────────────────────────────────
  const addConfigParam = () =>
    setFormData((f) => ({ ...f, config_schema: [...(f.config_schema || []), blankConfigParam()] }));
  const updateConfigParam = (idx, next) =>
    setFormData((f) => ({
      ...f,
      config_schema: (f.config_schema || []).map((p, i) => (i === idx ? next : p)),
    }));
  const removeConfigParam = (idx) =>
    setFormData((f) => ({ ...f, config_schema: (f.config_schema || []).filter((_, i) => i !== idx) }));

  const saveMutation = useMutation({
    mutationFn: async ({ mode }) => {
      const finalName = (name || "").trim();
      if (!finalName) throw new Error("Mod name is required");
      const isDraft      = mode === "draft";
      const isPublishing = mode === "publish";
      if (mode !== "draft" && !canCreate) {
        throw new Error("Creating code mods requires a Veteran subscription");
      }
      if (isPublishing && !canPublish) {
        throw new Error("Publishing a code mod requires a Veteran subscription");
      }

      // Validate every formula before save. Broken formulas must
      // NEVER land on a shared row — the session-start gate would
      // flip the install to status='error' and the GM would be
      // greeted with a blank failure.
      const triggers = formData.triggers || [];
      for (const [idx, t] of triggers.entries()) {
        const formula = t?.effect?.formula || "";
        if (!formula) continue; // description-only effects skip
        try { validateFormula(formula); }
        catch (err) {
          throw new Error(`Trigger #${idx + 1} "${t?.name || "unnamed"}" formula: ${err.message}`);
        }
        const dcFormula = t?.effect?.save_dc_formula || t?.effect?.dc_formula;
        if (dcFormula) {
          try { validateFormula(dcFormula); }
          catch (err) {
            throw new Error(`Trigger #${idx + 1} DC formula: ${err.message}`);
          }
        }
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");
      const userId = authData.user.id;

      const slug = finalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const metadata = {
        mod_type: "code_mod",
        name: finalName,
        description: (description || "").trim(),
        image_url: formData.image_url || "",
        triggers,
        config_schema: formData.config_schema || [],
      };
      const payload = {
        name: finalName,
        slug,
        description: (description || "").trim(),
        mod_type: "code_mod",
        game_system: gameSystem || "dnd5e",
        creator_id: userId,
        creator_tier: sub?.tier || "free",
        metadata,
        // Code mods register at runtime via checkModTriggers —
        // no static patches needed.
        patches: [],
        is_private: !isPublishing,
        published: isPublishing,
        status: isDraft ? "draft" : "active",
      };
      if (isEdit) return base44.entities.BreweryMod.update(mod.id, payload);
      return base44.entities.BreweryMod.create({ ...payload, version: "1.0.0" });
    },
    onSuccess: (_row, vars) => {
      queryClient.invalidateQueries({ queryKey: ["myMods"] });
      queryClient.invalidateQueries({ queryKey: ["brewery", "mods"] });
      const msg =
        vars.mode === "draft"   ? "Saved as draft" :
        vars.mode === "publish" ? "Published to The Brewery" :
                                  "Saved privately — only you can install it";
      toast.success(msg);
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Failed to save code mod"),
  });

  const publish = () => {
    if (!window.confirm(
      "Publishing makes this mod available to all players. Code mods with errors will prevent sessions from starting. Have you tested your formulas?",
    )) return;
    saveMutation.mutate({ mode: "publish" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#37F2D1]" />
                {mod ? "Edit Code Mod" : "Create Code Mod"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Veteran-tier custom mechanics. Build trigger bundles that fire on combat events and
                produce effects via a safe formula language — no JavaScript, no network access, just
                math + dice + game-state variables.
              </DialogDescription>
            </div>
            <CodeModHelpButton onOpen={() => setHelpOpen(true)} />
          </div>
        </DialogHeader>

        <CodeModHelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

        {!canCreate && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-100">
              Creating code mods requires a <strong>Veteran</strong> subscription. You can save
              drafts, but publishing is locked until you upgrade. Installing code mods others
              publish is available on Adventurer and up.
            </p>
          </div>
        )}

        <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
          <p className="text-[11px] text-rose-100">
            Code mods use custom formulas and triggers. <strong>Test every formula in the
            sandbox</strong> before publishing — broken formulas will prevent sessions from
            starting for anyone who installs them.
          </p>
        </div>

        <div className="space-y-5">
          <Section title="Identity">
            <Field label="Mod Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Brutal Critical Hits"
                className="bg-[#050816] border-slate-700 text-white"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What this mod does and when it fires."
                className="bg-[#050816] border-slate-700 text-white"
              />
            </Field>
            <Field label="Game System">
              <Input
                value={gameSystem}
                onChange={(e) => setGameSystem(e.target.value)}
                placeholder="dnd5e"
                className="bg-[#050816] border-slate-700 text-white"
              />
            </Field>
          </Section>

          <TriggersSection
            triggers={formData.triggers || []}
            onAddBlank={addBlankTrigger}
            onAddTemplate={addTriggerFromTemplate}
            onUpdate={updateTrigger}
            onRemove={removeTrigger}
          />

          <ConfigParamsSection
            params={formData.config_schema || []}
            onAdd={addConfigParam}
            onUpdate={updateConfigParam}
            onRemove={removeConfigParam}
          />
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveMutation.mutate({ mode: "draft" })}
            disabled={saveMutation.isPending}
            className="text-slate-300"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => saveMutation.mutate({ mode: "private" })}
            disabled={saveMutation.isPending || !canCreate}
            className="text-amber-300 border-amber-400/40"
          >
            Save &amp; Use Privately
          </Button>
          <Button
            type="button"
            onClick={publish}
            disabled={saveMutation.isPending || !canPublish}
            title={canPublish ? "Publish to The Brewery" : "Veteran subscription required"}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
          >
            {canPublish ? "Publish to Brewery" : "Publish (Veteran+)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── Layout helpers ─────────────────────

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

// ─────────────────── Triggers ─────────────────────

function TriggersSection({ triggers, onAddBlank, onAddTemplate, onUpdate, onRemove }) {
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  return (
    <Section
      title="Triggers"
      action={
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setTemplatePickerOpen((o) => !o)}>
            <Sparkles className="w-3 h-3 mr-1" /> Start from Template
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onAddBlank}>
            <Plus className="w-3 h-3 mr-1" /> Add Blank Trigger
          </Button>
        </div>
      }
    >
      {templatePickerOpen && (
        <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            Pick a template — stamps a copy of the trigger you can then customize.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {TRIGGER_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onAddTemplate(t.id); setTemplatePickerOpen(false); }}
                className="text-left bg-[#1E2430] border border-slate-700 hover:border-[#37F2D1]/60 rounded-lg p-2"
              >
                <div className="text-sm font-bold text-white">{t.name}</div>
                <div className="text-[11px] text-slate-400">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {triggers.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">
          No triggers yet. Add one to hook combat events to effects.
        </p>
      ) : (
        <div className="space-y-3">
          {triggers.map((t, idx) => (
            <TriggerEditor
              key={t.id || idx}
              trigger={t}
              idx={idx}
              onChange={(next) => onUpdate(idx, next)}
              onRemove={() => onRemove(idx)}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function TriggerEditor({ trigger, idx, onChange, onRemove }) {
  const set = (patch) => onChange({ ...trigger, ...patch });
  const setEffect = (patch) =>
    onChange({ ...trigger, effect: { ...(trigger.effect || {}), ...patch } });
  const setFilters = (patch) =>
    onChange({ ...trigger, filters: { ...(trigger.filters || {}), ...patch } });

  const effectMeta = effectTypeMeta(trigger?.effect?.type || "deal_damage");
  const fields = effectMeta?.fields || [];

  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex-1">
          Trigger #{idx + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-400 hover:text-red-300"
          title="Remove trigger"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Name">
          <Input
            value={trigger.name || ""}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g., Triple Crit Dice"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
        <Field label="Event">
          <Select value={trigger.event || "on_hit"} onValueChange={(v) => set({ event: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGER_EVENTS.map((e) => <SelectItem key={e} value={e}>{e.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Source filter">
          <Select
            value={trigger.filters?.source || "any"}
            onValueChange={(v) => setFilters({ source: v })}
          >
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="self">Self</SelectItem>
              <SelectItem value="ally">Ally</SelectItem>
              <SelectItem value="enemy">Enemy</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Weapon / damage filter">
          <Select
            value={trigger.filters?.weapon_type || "any"}
            onValueChange={(v) => setFilters({ weapon_type: v })}
          >
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="melee">Melee</SelectItem>
              <SelectItem value="ranged">Ranged</SelectItem>
              <SelectItem value="spell">Spell</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Gate">
          <Select value={trigger.gate || "unlimited"} onValueChange={(v) => set({ gate: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGER_GATES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Effect Type">
          <Select
            value={trigger.effect?.type || "deal_damage"}
            onValueChange={(v) => setEffect({ type: v })}
          >
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EFFECT_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {effectMeta?.description && (
        <p className="text-[10px] text-slate-500 italic">{effectMeta.description}</p>
      )}

      <Field label="Description">
        <Textarea
          value={trigger.description || ""}
          onChange={(e) => set({ description: e.target.value })}
          rows={2}
          placeholder="Plain-English summary players + the GM see when this fires."
          className="bg-[#1E2430] border-slate-700 text-white"
        />
      </Field>

      <EffectFields
        fields={fields}
        effect={trigger.effect || {}}
        onChange={setEffect}
      />
    </div>
  );
}

function EffectFields({ fields, effect, onChange }) {
  return (
    <div className="space-y-2">
      {fields.includes("formula") && (
        <FormulaInput
          value={effect.formula || ""}
          onChange={(v) => onChange({ formula: v })}
          label="Formula"
        />
      )}
      {fields.includes("damage_type") && (
        <Field label="Damage Type">
          <Select value={effect.damage_type || "fire"} onValueChange={(v) => onChange({ damage_type: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAMAGE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      )}
      {fields.includes("replaces") && (
        <Field label="Replaces">
          <Select value={effect.replaces || "outgoing_damage"} onValueChange={(v) => onChange({ replaces: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPLACES_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      )}
      {fields.includes("applies_to") && (
        <Field label="Applies To">
          <Select value={effect.applies_to || "attack"} onValueChange={(v) => onChange({ applies_to: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPLIES_TO_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      )}
      {fields.includes("duration") && (
        <Field label="Duration">
          <Input
            value={effect.duration || ""}
            onChange={(e) => onChange({ duration: e.target.value })}
            placeholder="1 round, end of turn, until save"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}
      {fields.includes("condition") && (
        <Field label="Condition">
          <Input
            value={effect.condition || ""}
            onChange={(e) => onChange({ condition: e.target.value })}
            placeholder="Frightened, Prone, …"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}
      {fields.includes("save_ability") && (
        <Field label="Save Ability">
          <Input
            value={effect.save_ability || ""}
            onChange={(e) => onChange({ save_ability: e.target.value })}
            placeholder="STR / DEX / CON / INT / WIS / CHA"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}
      {fields.includes("save_dc_formula") && (
        <FormulaInput
          value={effect.save_dc_formula || ""}
          onChange={(v) => onChange({ save_dc_formula: v })}
          label="Save DC Formula"
        />
      )}
      {fields.includes("dc_formula") && (
        <FormulaInput
          value={effect.dc_formula || ""}
          onChange={(v) => onChange({ dc_formula: v })}
          label="DC Formula"
        />
      )}
      {fields.includes("resource") && (
        <Field label="Resource">
          <Select value={effect.resource || "hp"} onValueChange={(v) => onChange({ resource: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESOLUTION_RESOURCES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      )}
      {fields.includes("ability_name") && (
        <Field label="Ability Name">
          <Input
            value={effect.ability_name || ""}
            onChange={(e) => onChange({ ability_name: e.target.value })}
            placeholder="e.g., Breath Weapon"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}
      {fields.includes("on_fail") && (
        <Field label="On Fail (description)">
          <Input
            value={effect.on_fail || ""}
            onChange={(e) => onChange({ on_fail: e.target.value })}
            placeholder="What happens when the target fails."
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}
      {fields.includes("on_success") && (
        <Field label="On Success (description)">
          <Input
            value={effect.on_success || ""}
            onChange={(e) => onChange({ on_success: e.target.value })}
            placeholder="What happens when the target succeeds."
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}
      {fields.includes("description") && (
        <Field label="Effect Description (GM adjudicates)">
          <Textarea
            value={effect.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={2}
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
      )}
    </div>
  );
}

// ────────────── Formula input with inline validation ──────────

function FormulaInput({ value, onChange, label }) {
  const [validation, setValidation] = useState(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);

  const revalidate = (next) => {
    const v = (next ?? value ?? "").trim();
    if (!v) { setValidation(null); return; }
    try { validateFormula(v); setValidation({ ok: true }); }
    catch (err) { setValidation({ ok: false, message: err.message }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs text-slate-300 font-semibold">{label}</Label>
        <button
          type="button"
          onClick={() => setSandboxOpen((o) => !o)}
          className="text-[10px] text-[#37F2D1] hover:underline inline-flex items-center gap-1"
        >
          <FlaskConical className="w-3 h-3" /> Test
        </button>
      </div>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => revalidate(value)}
        placeholder="1d6 + actor.str_mod"
        className="bg-[#1E2430] border-slate-700 text-white font-mono text-xs"
      />
      {validation && (
        <div className={`mt-1 flex items-start gap-1 text-[10px] ${validation.ok ? "text-emerald-300" : "text-red-300"}`}>
          {validation.ok
            ? <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
            : <XCircle className="w-3 h-3 mt-0.5 shrink-0" />}
          <span>{validation.ok ? "Formula looks good." : validation.message}</span>
        </div>
      )}
      {sandboxOpen && (
        <FormulaSandbox formula={value || ""} onClose={() => setSandboxOpen(false)} />
      )}
    </div>
  );
}

// ────────────── Test sandbox ──────────────

function FormulaSandbox({ formula, onClose }) {
  const [mock, setMock] = useState(() => JSON.parse(JSON.stringify(DEFAULT_MOCK_CONTEXT)));
  const [result, setResult] = useState(null);

  const setActor = (key, value) =>
    setMock((m) => ({ ...m, actor: { ...m.actor, [key]: Number(value) || 0 } }));
  const setScalar = (key, value) =>
    setMock((m) => ({ ...m, [key]: Number(value) || 0 }));

  const evaluate = () => {
    try {
      const n = evaluateFormula(formula, mock);
      setResult({ ok: true, value: n });
    } catch (err) {
      setResult({ ok: false, message: err.message });
    }
  };

  const shownActor = ["level", "prof", "str_mod", "dex_mod", "con_mod", "int_mod", "wis_mod", "cha_mod"];

  return (
    <div className="mt-2 bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-[#37F2D1] font-bold">
          Test sandbox — mock game state
        </p>
        <button type="button" onClick={onClose} className="text-[10px] text-slate-400 hover:text-white">
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        {shownActor.map((k) => (
          <label key={k} className="block">
            <span className="text-slate-400 uppercase text-[9px]">actor.{k}</span>
            <input
              type="number"
              value={mock.actor[k] ?? 0}
              onChange={(e) => setActor(k, e.target.value)}
              className="w-full bg-[#1E2430] border border-slate-700 text-white rounded px-2 py-1"
            />
          </label>
        ))}
        <label className="block">
          <span className="text-slate-400 uppercase text-[9px]">weapon_damage_dice</span>
          <input
            type="number"
            value={mock.weapon_damage_dice}
            onChange={(e) => setScalar("weapon_damage_dice", e.target.value)}
            className="w-full bg-[#1E2430] border border-slate-700 text-white rounded px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-slate-400 uppercase text-[9px]">spell_level</span>
          <input
            type="number"
            value={mock.spell_level}
            onChange={(e) => setScalar("spell_level", e.target.value)}
            className="w-full bg-[#1E2430] border border-slate-700 text-white rounded px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-slate-400 uppercase text-[9px]">damage_dealt</span>
          <input
            type="number"
            value={mock.damage_dealt}
            onChange={(e) => setScalar("damage_dealt", e.target.value)}
            className="w-full bg-[#1E2430] border border-slate-700 text-white rounded px-2 py-1"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={evaluate} className="bg-[#37F2D1] text-[#050816] font-bold">
          Evaluate
        </Button>
        {result && result.ok && (
          <span className="text-sm text-emerald-300 font-bold">= {String(result.value)}</span>
        )}
        {result && !result.ok && (
          <span className="text-xs text-red-300">Error: {result.message}</span>
        )}
      </div>
      <p className="text-[10px] text-slate-500 italic">
        Dice formulas roll live on each evaluate; non-dice formulas are deterministic.
      </p>
    </div>
  );
}

// ────────────── Configurable parameters ──────────────

function ConfigParamsSection({ params, onAdd, onUpdate, onRemove }) {
  return (
    <Section
      title="Configurable Parameters"
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-3 h-3 mr-1" /> Add Parameter
        </Button>
      }
    >
      <p className="text-[11px] text-slate-500 -mt-1">
        Values the installing GM can customize. Access them in formulas as <code>config.key</code>.
      </p>
      {params.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">
          No parameters — this mod runs with fixed values.
        </p>
      ) : (
        <div className="space-y-2">
          {params.map((p, idx) => (
            <ConfigParamEditor
              key={idx}
              param={p}
              onChange={(next) => onUpdate(idx, next)}
              onRemove={() => onRemove(idx)}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function ConfigParamEditor({ param, onChange, onRemove }) {
  const set = (patch) => onChange({ ...param, ...patch });
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex-1">
          Parameter
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-400 hover:text-red-300"
          title="Remove parameter"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Field label="Key">
          <Input
            value={param.key || ""}
            onChange={(e) => set({ key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
            placeholder="multiplier"
            className="bg-[#1E2430] border-slate-700 text-white font-mono text-xs"
          />
        </Field>
        <Field label="Label">
          <Input
            value={param.label || ""}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="Crit Damage Multiplier"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
        <Field label="Type">
          <Select value={param.type || "number"} onValueChange={(v) => set({ type: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="select">Select</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Field label="Default">
          <Input
            value={param.default ?? ""}
            onChange={(e) => set({ default: e.target.value })}
            placeholder="3"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
        {param.type === "number" && (
          <>
            <Field label="Min">
              <Input
                type="number"
                value={param.min ?? 0}
                onChange={(e) => set({ min: Number(e.target.value) || 0 })}
                className="bg-[#1E2430] border-slate-700 text-white"
              />
            </Field>
            <Field label="Max">
              <Input
                type="number"
                value={param.max ?? 10}
                onChange={(e) => set({ max: Number(e.target.value) || 0 })}
                className="bg-[#1E2430] border-slate-700 text-white"
              />
            </Field>
          </>
        )}
        {param.type === "select" && (
          <div className="md:col-span-2">
            <Field label="Options (comma-separated)">
              <Input
                value={Array.isArray(param.options) ? param.options.join(", ") : ""}
                onChange={(e) =>
                  set({
                    options: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="low, medium, high"
                className="bg-[#1E2430] border-slate-700 text-white"
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
