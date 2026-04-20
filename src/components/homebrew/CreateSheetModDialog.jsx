import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Sparkles, Layers, Info, Plus, Trash2, Save, Lock, Globe,
  ChevronUp, ChevronDown,
} from "lucide-react";
import {
  SHEET_MOD_TEMPLATES,
  SHEET_MOD_CATEGORIES,
  SKILL_PRESETS,
  STANDARD_SKILLS,
  FIELD_TYPES,
  SECTION_POSITIONS,
  ABILITY_KEYS,
  blankSheetChanges,
  blankSection,
  blankField,
  blankSkillRow,
  blankProficiencyCategory,
  cloneTemplateSections,
  cloneSkillPreset,
} from "@/config/sheetModTemplates";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useSubscription } from "@/lib/SubscriptionContext";
import { tierAtLeast } from "@/api/billingClient";

/**
 * Sheet modification mod creator.
 *
 * Step 2 ships the template gallery + skill-preset picker. The
 * gallery groups the 12 canonical templates by category so the
 * player can scan them quickly, pick a starting point, and (with
 * the skill preset picker) seed both halves of the form state
 * before customizing. Step 3 wires the customization fields and
 * save controls onto the same dialog.
 */

export default function CreateSheetModDialog({ open, onClose, mod = null }) {
  const [sheetChanges, setSheetChanges] = useState(blankSheetChanges);
  const [pickedTemplate, setPickedTemplate] = useState(null);
  const [pickedSkillPreset, setPickedSkillPreset] = useState(null);
  const [stage, setStage] = useState("gallery"); // 'gallery' | 'custom'
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const sub = useSubscription();
  const canPublish = tierAtLeast(sub?.tier || "free", "veteran");
  const isEdit = !!mod?.id;

  React.useEffect(() => {
    if (!open) return;
    if (mod) {
      const meta = mod.metadata || {};
      setSheetChanges({ ...blankSheetChanges(), ...(meta.sheet_changes || {}) });
      setName(mod.name || "");
      setDescription(meta.description || "");
      setPickedTemplate("custom");
      setPickedSkillPreset(null);
      setStage("custom");
    } else {
      setSheetChanges(blankSheetChanges());
      setName("");
      setDescription("");
      setPickedTemplate(null);
      setPickedSkillPreset(null);
      setStage("gallery");
    }
  }, [open, mod]);

  const pickTemplate = (templateId) => {
    const sections = templateId === "blank" ? [] : cloneTemplateSections(templateId);
    setPickedTemplate(templateId);
    setSheetChanges((cur) => ({ ...cur, add_sections: sections }));
    // Suggest the template's name as the mod name if the user
    // hasn't typed one yet.
    if (!name && templateId !== "blank") {
      const t = SHEET_MOD_TEMPLATES[templateId];
      if (t?.name) setName(t.name);
      if (!description && t?.description) setDescription(t.description);
    }
    setStage("custom");
  };

  const pickSkillPreset = (presetId) => {
    const preset = cloneSkillPreset(presetId);
    setPickedSkillPreset(presetId);
    setSheetChanges((cur) => ({
      ...cur,
      add_skills: preset.add_skills,
      remove_skills: preset.remove_skills,
      rename_skills: preset.rename_skills,
    }));
  };

  const backToGallery = () => {
    setStage("gallery");
    setPickedTemplate(null);
    setPickedSkillPreset(null);
    setSheetChanges(blankSheetChanges());
  };

  // ── Section editors ────────────────────────────────────────
  const updateSection = (idx, patch) =>
    setSheetChanges((cur) => ({
      ...cur,
      add_sections: cur.add_sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  const removeSection = (idx) =>
    setSheetChanges((cur) => ({
      ...cur,
      add_sections: cur.add_sections.filter((_, i) => i !== idx),
    }));
  const addSection = () =>
    setSheetChanges((cur) => ({ ...cur, add_sections: [...cur.add_sections, blankSection()] }));

  const updateField = (sectionIdx, fieldIdx, patch) =>
    updateSection(sectionIdx, {
      fields: sheetChanges.add_sections[sectionIdx].fields.map((f, i) =>
        i === fieldIdx ? { ...f, ...patch } : f,
      ),
    });
  const addField = (sectionIdx) =>
    updateSection(sectionIdx, {
      fields: [...(sheetChanges.add_sections[sectionIdx].fields || []), blankField()],
    });
  const removeField = (sectionIdx, fieldIdx) =>
    updateSection(sectionIdx, {
      fields: sheetChanges.add_sections[sectionIdx].fields.filter((_, i) => i !== fieldIdx),
    });
  const moveField = (sectionIdx, fieldIdx, dir) => {
    const fields = [...sheetChanges.add_sections[sectionIdx].fields];
    const target = fieldIdx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[fieldIdx], fields[target]] = [fields[target], fields[fieldIdx]];
    updateSection(sectionIdx, { fields });
  };

  // ── Skill editors ──────────────────────────────────────────
  const updateAddSkill = (idx, patch) =>
    setSheetChanges((cur) => ({
      ...cur,
      add_skills: cur.add_skills.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  const addAddSkill = () =>
    setSheetChanges((cur) => ({ ...cur, add_skills: [...cur.add_skills, blankSkillRow()] }));
  const removeAddSkill = (idx) =>
    setSheetChanges((cur) => ({
      ...cur,
      add_skills: cur.add_skills.filter((_, i) => i !== idx),
    }));

  const toggleRemoveSkill = (skill) =>
    setSheetChanges((cur) => {
      const set = new Set(cur.remove_skills || []);
      if (set.has(skill)) set.delete(skill); else set.add(skill);
      return { ...cur, remove_skills: Array.from(set) };
    });

  const setRenameSkill = (skill, newLabel) =>
    setSheetChanges((cur) => {
      const next = { ...(cur.rename_skills || {}) };
      if (newLabel && newLabel.trim()) next[skill] = newLabel.trim();
      else delete next[skill];
      return { ...cur, rename_skills: next };
    });

  // ── Proficiency categories ─────────────────────────────────
  const updateProfCat = (idx, patch) =>
    setSheetChanges((cur) => ({
      ...cur,
      add_proficiency_categories: cur.add_proficiency_categories.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    }));
  const addProfCat = () =>
    setSheetChanges((cur) => ({
      ...cur,
      add_proficiency_categories: [...(cur.add_proficiency_categories || []), blankProficiencyCategory()],
    }));
  const removeProfCat = (idx) =>
    setSheetChanges((cur) => ({
      ...cur,
      add_proficiency_categories: cur.add_proficiency_categories.filter((_, i) => i !== idx),
    }));
  const updateProfItems = (idx, nextItems) =>
    updateProfCat(idx, { items: nextItems });

  // ── Save ───────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ mode }) => {
      const finalName = (name || "").trim();
      if (!finalName) throw new Error("Mod name is required");
      const isDraft      = mode === "draft";
      const isPublishing = mode === "publish";
      if (isPublishing && !canPublish) {
        throw new Error("Publishing to the Brewery requires a Veteran subscription");
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");
      const userId = authData.user.id;

      // Trim blanks at save time so the saved sheet_changes only
      // carries real entries. Empty sections / skills / categories
      // are dropped; fields with no label AND no key are dropped.
      const trimmed = {
        add_sections: (sheetChanges.add_sections || [])
          .map((s) => ({
            ...s,
            name: (s.name || "").trim(),
            fields: (s.fields || [])
              .map((f) => ({
                ...f,
                key: (f.key || "").trim(),
                label: (f.label || "").trim(),
              }))
              .filter((f) => f.key || f.label),
          }))
          .filter((s) => s.name || (s.fields && s.fields.length > 0)),
        add_skills: (sheetChanges.add_skills || [])
          .map((s) => ({
            name: (s.name || "").trim(),
            ability: s.ability || "int",
            description: (s.description || "").trim(),
          }))
          .filter((s) => s.name),
        remove_skills: Array.from(new Set(sheetChanges.remove_skills || [])),
        rename_skills: sheetChanges.rename_skills || {},
        add_proficiency_categories: (sheetChanges.add_proficiency_categories || [])
          .map((c) => ({
            name: (c.name || "").trim(),
            items: (c.items || []).map((i) => (typeof i === "string" ? i.trim() : i)).filter(Boolean),
          }))
          .filter((c) => c.name && c.items.length > 0),
      };

      const slug = finalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const payload = {
        name: finalName,
        slug,
        description: (description || "").trim(),
        mod_type: "sheet_mod",
        game_system: "dnd5e",
        creator_id: userId,
        creator_tier: sub?.tier || "free",
        metadata: {
          mod_type: "sheet_mod",
          name: finalName,
          description: (description || "").trim(),
          template: pickedTemplate || "custom",
          skill_preset: pickedSkillPreset || null,
          sheet_changes: trimmed,
        },
        // Sheet mods don't patch any rule tree; the sheet renderer
        // reads sheet_changes directly via getSheetModifications.
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
    onError: (err) => toast.error(err?.message || "Failed to save sheet mod"),
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mod ? "Edit Sheet Modification" : "Create Sheet Modification"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add tracking sections, new skills, or new proficiency categories to the character sheet.
            Start from a template or build from scratch.
          </DialogDescription>
        </DialogHeader>

        {stage === "gallery" ? (
          <Gallery
            onPickTemplate={pickTemplate}
            onPickSkillPreset={pickSkillPreset}
            pickedSkillPreset={pickedSkillPreset}
          />
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              onClick={backToGallery}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3 h-3" /> Pick a different template
            </button>

            <Section title="Identity">
              <Field label="Mod Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Cosmic Horror Sanity"
                  className="bg-[#050816] border-slate-700 text-white"
                />
              </Field>
              <Field label="Description">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell other GMs what this sheet mod does."
                  className="bg-[#050816] border-slate-700 text-white"
                />
              </Field>
            </Section>

            <Section
              title="Added Sections"
              action={
                <Button type="button" variant="outline" size="sm" onClick={addSection}>
                  <Plus className="w-3 h-3 mr-1" /> Add Section
                </Button>
              }
            >
              {sheetChanges.add_sections.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No sections yet. Add one to drop trackers, notes, or numeric fields onto the sheet.
                </p>
              ) : sheetChanges.add_sections.map((section, si) => (
                <SectionEditor
                  key={si}
                  section={section}
                  onChange={(patch) => updateSection(si, patch)}
                  onRemove={() => removeSection(si)}
                  onAddField={() => addField(si)}
                  onUpdateField={(fi, patch) => updateField(si, fi, patch)}
                  onRemoveField={(fi) => removeField(si, fi)}
                  onMoveField={(fi, dir) => moveField(si, fi, dir)}
                />
              ))}
            </Section>

            <Section
              title="Added Skills"
              action={
                <Button type="button" variant="outline" size="sm" onClick={addAddSkill}>
                  <Plus className="w-3 h-3 mr-1" /> Add Skill
                </Button>
              }
            >
              {sheetChanges.add_skills.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No added skills. New skills appear in the skill list alongside the SRD skills.
                </p>
              ) : sheetChanges.add_skills.map((sk, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_2fr_auto] gap-2 items-start">
                  <Input
                    value={sk.name}
                    onChange={(e) => updateAddSkill(i, { name: e.target.value })}
                    placeholder="Skill name"
                    className="bg-[#050816] border-slate-700 text-white"
                  />
                  <Select
                    value={sk.ability || "int"}
                    onValueChange={(v) => updateAddSkill(i, { ability: v })}
                  >
                    <SelectTrigger className="bg-[#050816] border-slate-700 text-white w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ABILITY_KEYS.map((a) => (
                        <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={sk.description}
                    onChange={(e) => updateAddSkill(i, { description: e.target.value })}
                    placeholder="Description (what this skill covers)"
                    className="bg-[#050816] border-slate-700 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeAddSkill(i)}
                    className="p-2 text-red-400 hover:text-red-300"
                    title="Remove skill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </Section>

            <Section title="Removed Skills">
              <p className="text-[11px] text-amber-300">
                ⚠ Removing skills may break features that reference them.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_SKILLS.map((skill) => {
                  const active = (sheetChanges.remove_skills || []).includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleRemoveSkill(skill)}
                      className={`px-2 py-1 rounded border text-[10px] font-semibold transition-colors ${
                        active
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-[#050816] border-slate-700 text-slate-300 hover:border-red-400/60"
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Renamed Skills">
              <p className="text-[11px] text-slate-500 -mt-1">
                Leave blank to keep the original label.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {STANDARD_SKILLS.map((skill) => (
                  <div key={skill} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs text-slate-400 truncate">{skill}</span>
                    <Input
                      value={(sheetChanges.rename_skills || {})[skill] || ""}
                      onChange={(e) => setRenameSkill(skill, e.target.value)}
                      placeholder={`New label for ${skill}`}
                      className="bg-[#050816] border-slate-700 text-white"
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Added Proficiency Categories"
              action={
                <Button type="button" variant="outline" size="sm" onClick={addProfCat}>
                  <Plus className="w-3 h-3 mr-1" /> Add Category
                </Button>
              }
            >
              {sheetChanges.add_proficiency_categories.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No extra categories. Examples: "Vehicles" (Land / Water / Air), "Firearms" (Pistol / Rifle / Shotgun).
                </p>
              ) : sheetChanges.add_proficiency_categories.map((cat, ci) => (
                <ProficiencyCategoryEditor
                  key={ci}
                  category={cat}
                  onChange={(patch) => updateProfCat(ci, patch)}
                  onUpdateItems={(items) => updateProfItems(ci, items)}
                  onRemove={() => removeProfCat(ci)}
                />
              ))}
            </Section>
          </div>
        )}

        {stage === "custom" && (
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

// ── Layout helpers ─────────────────────────────────────────

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

// ── Section + field editors ────────────────────────────────

function SectionEditor({ section, onChange, onRemove, onAddField, onUpdateField, onRemoveField, onMoveField }) {
  const fields = Array.isArray(section.fields) ? section.fields : [];
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex-1">
          Section
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-red-400 hover:text-red-300"
          title="Remove section"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Section Name">
          <Input
            value={section.name || ""}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g., Sanity"
            className="bg-[#1E2430] border-slate-700 text-white"
          />
        </Field>
        <Field label="Position">
          <Select value={section.position || "sidebar"} onValueChange={(v) => onChange({ position: v })}>
            <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTION_POSITIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            Fields
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={onAddField}>
            <Plus className="w-3 h-3 mr-1" /> Add Field
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">
            No fields yet — add at least one so this section renders on the sheet.
          </p>
        ) : (
          <div className="space-y-2">
            {fields.map((f, fi) => (
              <FieldEditor
                key={fi}
                field={f}
                idx={fi}
                total={fields.length}
                onChange={(patch) => onUpdateField(fi, patch)}
                onRemove={() => onRemoveField(fi)}
                onMove={(dir) => onMoveField(fi, dir)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldEditor({ field, idx, total, onChange, onRemove, onMove }) {
  const isSelect = field.type === "select";
  const optionsCsv = Array.isArray(field.options) ? field.options.join(", ") : "";
  return (
    <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex-1">
          Field #{idx + 1}
        </span>
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={idx === 0}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
          title="Move up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
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
          title="Remove field"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Field label="Label">
          <Input
            value={field.label || ""}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Displayed label"
            className="bg-[#050816] border-slate-700 text-white"
          />
        </Field>
        <Field label="Key">
          <Input
            value={field.key || ""}
            onChange={(e) => onChange({ key: e.target.value })}
            placeholder="storage_key"
            className="bg-[#050816] border-slate-700 text-white"
          />
        </Field>
        <Field label="Type">
          <Select value={field.type || "text"} onValueChange={(v) => onChange({ type: v })}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Default Value">
          <Input
            value={field.default ?? ""}
            onChange={(e) => onChange({ default: e.target.value })}
            placeholder="Initial value"
            className="bg-[#050816] border-slate-700 text-white"
          />
        </Field>
        {isSelect && (
          <Field label="Options (comma-separated)">
            <Input
              value={optionsCsv}
              onChange={(e) =>
                onChange({
                  options: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="None, Short-term, Long-term"
              className="bg-[#050816] border-slate-700 text-white"
            />
          </Field>
        )}
        {field.type === "computed" && (
          <Field label="Formula">
            <Input
              value={field.formula || ""}
              onChange={(e) => onChange({ formula: e.target.value })}
              placeholder="floor((sanity_score - 10) / 2)"
              className="bg-[#050816] border-slate-700 text-white"
            />
          </Field>
        )}
      </div>
    </div>
  );
}

// ── Proficiency category editor ────────────────────────────

function ProficiencyCategoryEditor({ category, onChange, onUpdateItems, onRemove }) {
  const items = Array.isArray(category.items) ? category.items : [];
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={category.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Category name (e.g. Vehicles)"
          className="bg-[#1E2430] border-slate-700 text-white flex-1"
        />
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-red-400 hover:text-red-300"
          title="Remove category"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">
          Items
        </Label>
        <div className="space-y-2">
          {items.map((item, ii) => (
            <div key={ii} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[ii] = e.target.value;
                  onUpdateItems(next);
                }}
                placeholder="e.g., Land Vehicles"
                className="bg-[#1E2430] border-slate-700 text-white"
              />
              <button
                type="button"
                onClick={() => onUpdateItems(items.filter((_, j) => j !== ii))}
                className="p-2 text-red-400 hover:text-red-300"
                title="Remove item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onUpdateItems([...items, ""])}
          className="mt-2"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Item
        </Button>
      </div>
    </div>
  );
}

function labelForTemplate(id) {
  if (!id) return "";
  if (id === "blank") return "Custom (Blank)";
  if (id === "custom") return "Existing mod";
  return SHEET_MOD_TEMPLATES[id]?.name || id;
}

function Gallery({ onPickTemplate, onPickSkillPreset, pickedSkillPreset }) {
  return (
    <div className="space-y-6 mt-2">
      <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-[#37F2D1] mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-300">
          Pick a starting point. Templates add a full section; you can rename fields, change
          types, adjust defaults, or remove entries once the form opens.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onPickTemplate("blank")}
          className="w-full text-left p-4 rounded-lg border bg-[#050816] border-slate-700 hover:border-[#37F2D1]/60 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-[#37F2D1]" />
            <span className="text-base font-bold text-white">Custom (Blank)</span>
            <span className="ml-auto text-[9px] uppercase tracking-widest text-[#37F2D1]">Build from scratch</span>
          </div>
          <p className="text-xs text-slate-400">
            Start with no template. Add sections, fields, skill changes, and proficiency categories by hand.
          </p>
        </button>
      </div>

      {SHEET_MOD_CATEGORIES.map((cat) => {
        const items = Object.entries(SHEET_MOD_TEMPLATES).filter(([, t]) => t.category === cat.key);
        if (items.length === 0) return null;
        return (
          <section key={cat.key} className="space-y-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#37F2D1]">{cat.label}</h3>
              <p className="text-[11px] text-slate-500">{cat.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(([id, t]) => (
                <TemplateCard
                  key={id}
                  templateId={id}
                  template={t}
                  onPick={() => onPickTemplate(id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="space-y-2 pt-3 border-t border-slate-700/50">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-[#37F2D1]">
            Skill Modifications (optional)
          </h3>
          <p className="text-[11px] text-slate-500">
            Seed the skills half of the form too. You can always toggle this on / off inside
            the editor.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(SKILL_PRESETS).map(([id, preset]) => {
            const active = pickedSkillPreset === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPickSkillPreset(id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  active
                    ? "bg-[#37F2D1]/10 border-[#37F2D1]"
                    : "bg-[#050816] border-slate-700 hover:border-[#37F2D1]/60"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{preset.name}</span>
                  {active && (
                    <span className="ml-auto text-[9px] uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1.5 py-0.5 font-black">
                      Loaded
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TemplateCard({ templateId, template, onPick }) {
  const firstSection = template.add_sections?.[0];
  const fieldPreview = (firstSection?.fields || []).slice(0, 4);
  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left p-4 rounded-lg border bg-[#050816] border-slate-700 hover:border-[#37F2D1]/60 transition-colors flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-bold text-white">{template.name}</span>
        <span className="text-[9px] uppercase tracking-widest text-[#37F2D1]">Template</span>
      </div>
      <p className="text-xs text-slate-400">{template.description}</p>
      {fieldPreview.length > 0 && (
        <ul className="text-[10px] text-slate-300 space-y-0.5 mt-1">
          {fieldPreview.map((f) => (
            <li key={f.key}>
              <span className="text-[#37F2D1]">{f.label}</span>
              <span className="text-slate-500"> · {f.type}</span>
              {f.default !== "" && f.default != null && (
                <span className="text-slate-500"> · default {String(f.default)}</span>
              )}
            </li>
          ))}
          {(firstSection?.fields || []).length > fieldPreview.length && (
            <li className="text-slate-500 italic">
              +{firstSection.fields.length - fieldPreview.length} more…
            </li>
          )}
        </ul>
      )}
    </button>
  );
}
