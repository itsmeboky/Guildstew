import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Info, Plus, Trash2, Save, Lock, Globe } from "lucide-react";
import {
  RESKIN_PRESETS,
  RENAMEABLE_TERMS,
  STANDARD_CONDITIONS,
  DAMAGE_TYPES,
  ABILITY_KEYS,
  ABILITY_LABELS,
  blankRenames,
  compactRenames,
} from "@/config/reskinPresets";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useSubscription } from "@/lib/SubscriptionContext";
import { tierAtLeast } from "@/api/billingClient";

/**
 * Reskin mod creator.
 *
 * Step 3 ships only the preset picker — five cards (Blank,
 * Sci-Fi, Horror, Grimdark, Heroic) that load a starting rename
 * blob into form state and reveal the rename-fields form. The
 * fields + save controls land in step 4 (currently a placeholder
 * panel below the picker).
 */

export default function CreateReskinModDialog({ open, onClose, mod = null }) {
  const [presetKey, setPresetKey] = useState(null);
  const [renames, setRenames] = useState(blankRenames);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customTerms, setCustomTerms] = useState([]); // [{ from, to }]
  const queryClient = useQueryClient();
  const sub = useSubscription();
  const canPublish = tierAtLeast(sub?.tier || "free", "veteran");
  const isEdit = !!mod?.id;

  // Reset state every time the dialog opens / the source mod
  // changes so a previous pick doesn't leak through. Edit mode
  // hydrates from the mod's stored renames + lifts any term keys
  // that aren't in RENAMEABLE_TERMS into the customTerms list so
  // they remain editable.
  React.useEffect(() => {
    if (!open) return;
    if (mod) {
      const meta = mod.metadata || {};
      const incoming = { ...blankRenames(), ...(meta.renames || {}) };
      const known = new Set(RENAMEABLE_TERMS);
      const customs = [];
      const standardTerms = {};
      for (const [k, v] of Object.entries(incoming.terms || {})) {
        if (known.has(k)) standardTerms[k] = v;
        else customs.push({ from: k, to: v });
      }
      incoming.terms = standardTerms;
      setRenames(incoming);
      setCustomTerms(customs);
      setName(mod.name || "");
      setDescription(meta.description || "");
      setPresetKey("custom");
    } else {
      setRenames(blankRenames());
      setCustomTerms([]);
      setName("");
      setDescription("");
      setPresetKey(null);
    }
  }, [open, mod]);

  const pickPreset = (key) => {
    const preset = RESKIN_PRESETS[key];
    if (!preset) return;
    setPresetKey(key);
    setRenames({ ...blankRenames(), ...preset.renames });
    setCustomTerms([]);
    if (!name && preset.name && key !== "blank") {
      setName(preset.name);
    }
    if (!description && preset.description) {
      setDescription(preset.description);
    }
  };

  const reset = () => {
    setPresetKey(null);
    setRenames(blankRenames());
    setCustomTerms([]);
  };

  // Renames mutators — each scoped to a category to keep the form
  // sections cheap to re-render.
  const setAbility = (key, field, value) =>
    setRenames((r) => ({
      ...r,
      abilities: {
        ...(r.abilities || {}),
        [key]: { ...(r.abilities?.[key] || {}), [field]: value },
      },
    }));
  const setTerm = (key, value) =>
    setRenames((r) => ({ ...r, terms: { ...(r.terms || {}), [key]: value } }));
  const setDamageType = (key, value) =>
    setRenames((r) => ({ ...r, damage_types: { ...(r.damage_types || {}), [key]: value } }));
  const setCondition = (key, value) =>
    setRenames((r) => ({ ...r, conditions: { ...(r.conditions || {}), [key]: value } }));

  const addCustomTerm = () => setCustomTerms((c) => [...c, { from: "", to: "" }]);
  const updateCustomTerm = (idx, field, value) =>
    setCustomTerms((c) => c.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  const removeCustomTerm = (idx) =>
    setCustomTerms((c) => c.filter((_, i) => i !== idx));

  const saveMutation = useMutation({
    mutationFn: async ({ mode }) => {
      const finalName = (name || "").trim();
      if (!finalName) throw new Error("Reskin name is required");
      const isDraft      = mode === "draft";
      const isPublishing = mode === "publish";
      if (isPublishing && !canPublish) {
        throw new Error("Publishing to the Brewery requires a Veteran subscription");
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");
      const userId = authData.user.id;

      // Merge custom terms in alongside the standard ones, then
      // strip blanks so only actual changes land in metadata.
      const mergedRenames = {
        ...renames,
        terms: { ...(renames.terms || {}) },
      };
      for (const row of customTerms) {
        const from = (row.from || "").trim();
        const to   = (row.to   || "").trim();
        if (from && to) mergedRenames.terms[from] = to;
      }
      const compact = compactRenames(mergedRenames);

      const slug = finalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const payload = {
        name: finalName,
        slug,
        description: (description || "").trim(),
        mod_type: "reskin",
        game_system: "dnd5e",
        creator_id: userId,
        creator_tier: sub?.tier || "free",
        metadata: {
          mod_type: "reskin",
          name: finalName,
          description: (description || "").trim(),
          preset: presetKey || "custom",
          renames: compact,
        },
        // Reskins don't patch any rule tree — display labels are
        // resolved lazily via getDisplayName, which walks the
        // installed mods list. The patches array stays empty.
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
    onError: (err) => toast.error(err?.message || "Failed to save reskin mod"),
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mod ? "Edit Reskin Mod" : "Create Reskin Mod"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Renames change display labels only. No math or mechanics are affected. Players see
            the renamed terms everywhere in the UI.
          </DialogDescription>
        </DialogHeader>

        {presetKey === null ? (
          <PresetPicker onPick={pickPreset} />
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3 h-3" /> Pick a different preset
            </button>

            <Section title="Identity">
              <Field label="Reskin Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Gothic Horror Renames"
                  className="bg-[#050816] border-slate-700 text-white"
                />
              </Field>
              <Field label="Description">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell other GMs what this reskin is for."
                  className="bg-[#050816] border-slate-700 text-white"
                />
              </Field>
            </Section>

            <Section title="Ability Score Renames">
              <p className="text-[11px] text-slate-500 -mt-1">
                Leave blank to keep the original label.
              </p>
              <div className="space-y-2">
                {ABILITY_KEYS.map((k) => {
                  const cur = renames.abilities?.[k] || {};
                  const canon = ABILITY_LABELS[k];
                  return (
                    <div key={k} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <span className="text-xs text-slate-400 font-mono">{canon.name} ({canon.abbreviation})</span>
                      <Input
                        value={cur.name || ""}
                        onChange={(e) => setAbility(k, "name", e.target.value)}
                        placeholder={`New name for ${canon.name}`}
                        className="bg-[#050816] border-slate-700 text-white"
                      />
                      <Input
                        value={cur.abbreviation || ""}
                        onChange={(e) => setAbility(k, "abbreviation", e.target.value)}
                        placeholder={`New abbr (${canon.abbreviation})`}
                        className="bg-[#050816] border-slate-700 text-white"
                      />
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Core Term Renames">
              <p className="text-[11px] text-slate-500 -mt-1">
                Leave blank to keep the original label.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {RENAMEABLE_TERMS.map((term) => (
                  <div key={term} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs text-slate-400 truncate">{term}</span>
                    <Input
                      value={renames.terms?.[term] || ""}
                      onChange={(e) => setTerm(term, e.target.value)}
                      placeholder={`New label for ${term}`}
                      className="bg-[#050816] border-slate-700 text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-700/50">
                <Label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                  Custom Terms
                </Label>
                <p className="text-[10px] text-slate-500 mb-2">
                  Add a rename for any term not in the list above.
                </p>
                <div className="space-y-2">
                  {customTerms.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <Input
                        value={row.from}
                        onChange={(e) => updateCustomTerm(idx, "from", e.target.value)}
                        placeholder="Original term"
                        className="bg-[#050816] border-slate-700 text-white"
                      />
                      <Input
                        value={row.to}
                        onChange={(e) => updateCustomTerm(idx, "to", e.target.value)}
                        placeholder="Replacement"
                        className="bg-[#050816] border-slate-700 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomTerm(idx)}
                        className="p-2 text-red-400 hover:text-red-300"
                        title="Remove custom term"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCustomTerm} className="mt-2">
                  <Plus className="w-3 h-3 mr-1" /> Add Custom Term
                </Button>
              </div>
            </Section>

            <Section title="Damage Type Renames">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DAMAGE_TYPES.map((dt) => (
                  <div key={dt} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs text-slate-400 capitalize">{dt}</span>
                    <Input
                      value={renames.damage_types?.[dt] || ""}
                      onChange={(e) => setDamageType(dt, e.target.value)}
                      placeholder={`New label for ${dt}`}
                      className="bg-[#050816] border-slate-700 text-white"
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Condition Renames">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {STANDARD_CONDITIONS.map((c) => (
                  <div key={c} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs text-slate-400">{c}</span>
                    <Input
                      value={renames.conditions?.[c] || ""}
                      onChange={(e) => setCondition(c, e.target.value)}
                      placeholder={`New label for ${c}`}
                      className="bg-[#050816] border-slate-700 text-white"
                    />
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {presetKey !== null && (
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveMutation.mutate({ mode: "draft" })}
              disabled={saveMutation.isPending}
              className="text-slate-300"
            >
              <Save className="w-4 h-4 mr-1" /> Save as Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => saveMutation.mutate({ mode: "private" })}
              disabled={saveMutation.isPending}
              className="text-amber-300 border-amber-400/40"
            >
              <Lock className="w-4 h-4 mr-1" /> Save &amp; Use Privately
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate({ mode: "publish" })}
              disabled={saveMutation.isPending || !canPublish}
              title={canPublish ? "Publish to The Brewery" : "Veteran subscription required"}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
            >
              <Globe className="w-4 h-4 mr-1" />
              {canPublish ? "Publish to Brewery" : "Publish (Veteran+)"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

function PresetPicker({ onPick }) {
  return (
    <div className="space-y-3 mt-2">
      <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-[#37F2D1] mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-300">
          Pick a starting point. Each preset loads a community-standard rename package — you can
          change, add, or remove any rename after.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(RESKIN_PRESETS).map(([key, preset]) => (
          <PresetCard
            key={key}
            presetKey={key}
            preset={preset}
            onPick={() => onPick(key)}
          />
        ))}
      </div>
    </div>
  );
}

function PresetCard({ presetKey, preset, onPick }) {
  // Build a tiny example list of 3-4 renames so the card hints at
  // the preset's flavor without dumping the full map.
  const examples = collectExamples(preset.renames, 4);
  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left p-4 rounded-lg border bg-[#050816] border-slate-700 hover:border-[#37F2D1]/60 transition-colors flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-bold text-white">{preset.name}</span>
        <span className="text-[9px] uppercase tracking-widest text-[#37F2D1]">
          {presetKey === "blank" ? "Custom" : "Preset"}
        </span>
      </div>
      <p className="text-xs text-slate-400">{preset.description}</p>
      {examples.length > 0 && (
        <ul className="text-[10px] text-slate-300 space-y-0.5 mt-1">
          {examples.map((e, i) => (
            <li key={i}>
              <span className="text-slate-500">{e.from}</span>
              <span className="text-slate-500"> → </span>
              <span className="text-[#37F2D1] font-semibold">{e.to}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

function collectExamples(renames, max) {
  const out = [];
  const push = (from, to) => { if (out.length < max) out.push({ from, to }); };
  for (const [k, v] of Object.entries(renames?.terms || {}))   push(k, v);
  for (const [k, v] of Object.entries(renames?.abilities || {})) {
    if (out.length >= max) break;
    if (v?.name) push(k.toUpperCase(), v.name);
  }
  for (const [k, v] of Object.entries(renames?.damage_types || {})) push(k, v);
  for (const [k, v] of Object.entries(renames?.conditions || {}))   push(k, v);
  return out;
}
