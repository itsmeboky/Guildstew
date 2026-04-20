import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { sheetSectionSlug } from "@/lib/modEngine";

/**
 * Render brewery sheet-mod sections at a given position anchor.
 *
 * Each install can add tracker sections (sanity, stress, piety,
 * etc.) that target one of four positions: 'sidebar',
 * 'after_skills', 'after_features', 'after_proficiencies'. The
 * character sheet drops one <SheetModSections> per position and
 * this component filters the merged view + renders the matching
 * sections as labeled cards with editable fields.
 *
 * Field values live on `character.stats.mod_data[sectionSlug]` as
 * a { [fieldKey]: value } map so custom data doesn't interfere
 * with core stats. `onChange` callback fires when any field is
 * edited; the callback receives the full next `mod_data` blob so
 * callers can merge it into their character update pipeline.
 *
 * Read-only mode: pass `editable={false}` to disable inputs (for
 * the viewer + shared-library panels where the reader can't edit).
 */
export default function SheetModSections({
  sections = [],
  position,
  character,
  onChange,
  editable = true,
}) {
  const matched = (sections || []).filter((s) => s?.position === position);
  if (matched.length === 0) return null;

  const modData = character?.stats?.mod_data || character?.mod_data || {};

  const setValue = (sectionSlug, fieldKey, value) => {
    if (!editable || !onChange) return;
    const next = { ...modData };
    next[sectionSlug] = { ...(next[sectionSlug] || {}), [fieldKey]: value };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {matched.map((section, idx) => {
        const slug = sheetSectionSlug(section.name) || `section_${idx}`;
        const values = modData[slug] || {};
        return (
          <div
            key={slug + "-" + idx}
            className="bg-[#1E2430]/70 border border-[#37F2D1]/30 rounded-xl p-4"
          >
            <h3 className="text-sm font-bold text-[#37F2D1] mb-3 uppercase tracking-wide">
              {section.name || "Custom Section"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(section.fields || []).map((field) => {
                const key = field.key;
                if (!key) return null;
                const current = values[key] !== undefined ? values[key] : field.default;
                return (
                  <div key={key}>
                    <Label className="block mb-1 text-xs text-slate-300 font-semibold">
                      {field.label || key}
                    </Label>
                    <FieldInput
                      field={field}
                      value={current}
                      onChange={(v) => setValue(slug, key, v)}
                      disabled={!editable}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({ field, value, onChange, disabled }) {
  if (field.type === "number") {
    return (
      <Input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        disabled={disabled}
        className="bg-[#050816] border-slate-700 text-white"
      />
    );
  }
  if (field.type === "toggle") {
    return (
      <Switch
        checked={!!value}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    );
  }
  if (field.type === "select") {
    const options = Array.isArray(field.options) ? field.options : [];
    return (
      <Select value={String(value ?? "")} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "computed") {
    // v1: display the stored computed value; the formula engine
    // lands in a follow-up and will replace this with a live eval.
    return (
      <Input
        value={value ?? ""}
        readOnly
        placeholder={field.formula ? `= ${field.formula}` : ""}
        className="bg-[#050816] border-slate-700 text-slate-400 italic"
      />
    );
  }
  return (
    <Input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[#050816] border-slate-700 text-white"
    />
  );
}
