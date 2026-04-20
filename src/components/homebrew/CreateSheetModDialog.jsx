import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Layers, Info } from "lucide-react";
import {
  SHEET_MOD_TEMPLATES,
  SHEET_MOD_CATEGORIES,
  SKILL_PRESETS,
  blankSheetChanges,
  cloneTemplateSections,
  cloneSkillPreset,
} from "@/config/sheetModTemplates";

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

  React.useEffect(() => {
    if (!open) return;
    if (mod) {
      const meta = mod.metadata || {};
      setSheetChanges({ ...blankSheetChanges(), ...(meta.sheet_changes || {}) });
      setPickedTemplate("custom");
      setPickedSkillPreset(null);
      setStage("custom");
    } else {
      setSheetChanges(blankSheetChanges());
      setPickedTemplate(null);
      setPickedSkillPreset(null);
      setStage("gallery");
    }
  }, [open, mod]);

  const pickTemplate = (templateId) => {
    const sections = templateId === "blank" ? [] : cloneTemplateSections(templateId);
    setPickedTemplate(templateId);
    setSheetChanges((cur) => ({ ...cur, add_sections: sections }));
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
          <div className="space-y-4">
            <button
              type="button"
              onClick={backToGallery}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3 h-3" /> Pick a different template
            </button>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-100">
                Loaded template: <strong>{labelForTemplate(pickedTemplate)}</strong>
                {pickedSkillPreset && <> + skill preset: <strong>{SKILL_PRESETS[pickedSkillPreset]?.name}</strong></>}. Step 3 wires the customization
                fields + save controls — for now this shows the loaded sheet-changes blob.
              </p>
            </div>

            <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-4 text-xs text-slate-300">
              <p className="font-bold mb-2 text-[#37F2D1] uppercase tracking-widest">
                Loaded Sheet Changes (preview)
              </p>
              <pre className="whitespace-pre-wrap text-[10px] leading-snug max-h-72 overflow-y-auto">
                {JSON.stringify(sheetChanges, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
