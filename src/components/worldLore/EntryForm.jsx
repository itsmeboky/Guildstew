import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, X, Upload, Lock, Languages, Plus, Trash2 } from "lucide-react";
import { uploadFile } from "@/utils/uploadFile";
import { TEMPLATE_TYPES, templateById } from "@/data/worldLoreTemplates";
import {
  ENTRY_TEMPLATES,
  getTemplatesForCategory,
  templateByKey as entryTemplateByKey,
} from "@/config/entryTemplates";
import SketchCanvas from "@/components/shared/SketchCanvas";
import SymbolPicker from "@/components/shared/SymbolPicker";
import { SKILLS, ABILITIES } from "@/utils/languageComprehension";
import {
  THIEVES_CANT_SYMBOLS, CANT_CATEGORIES, CANT_COLOR_PRESETS, CANT_DEFAULT_COLOR,
} from "@/config/thievesCantSymbols";
import {
  DRUIDIC_SYMBOLS, DRUIDIC_CATEGORIES, DRUIDIC_COLOR_PRESETS, DRUIDIC_DEFAULT_COLOR,
} from "@/config/druidicSymbols";

const GATE_LANGUAGE_OPTIONS = [
  "Abyssal", "Celestial", "Common", "Deep Speech", "Draconic",
  "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin",
  "Halfling", "Infernal", "Orc", "Primordial", "Sylvan", "Undercommon",
];

function gateId() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Template-aware entry editor. Shared by all five entry-based
 * categories; the caller supplies any extra category-specific
 * metadata fields on top of the template fields.
 *
 * Metadata layering:
 *   - category-level fields (from parent) always render
 *   - template-level fields render when template != freeform
 *   - Secret Document template force-sets visibility to gm_only and
 *     disables the visibility dropdown
 */
export default function EntryForm({
  initial,
  categoryKey,
  categoryMetadataFields = [],
  partyPlayers = [],
  campaignId,
  saving,
  onCancel,
  onSave,
  allowTemplates = true,
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [templateType, setTemplateType] = useState(initial?.template_type || "freeform");
  const [visibility, setVisibility] = useState(initial?.visibility || "public");
  const [images, setImages] = useState(Array.isArray(initial?.images) ? initial.images : []);
  const [visibleTo, setVisibleTo] = useState(
    Array.isArray(initial?.visible_to_players) ? initial.visible_to_players : [],
  );
  const [metadata, setMetadata] = useState(initial?.metadata || {});
  const [imageUrl, setImageUrl] = useState(initial?.image_url || "");
  const [uploading, setUploading] = useState(false);

  // Knowledge gates (skill / ability / language checks) — stored on
  // world_lore_entries.knowledge_gates as a JSONB array.
  const [gates, setGates] = useState(
    Array.isArray(initial?.knowledge_gates) ? initial.knowledge_gates : [],
  );
  const addGate = () => setGates((prev) => [
    ...prev,
    { id: gateId(), type: "skill_check", skill: "Arcana", dc: 15, gated_content: "full", failure_text: "" },
  ]);
  const updateGate = (idx, patch) => setGates(
    (prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
  );
  const removeGate = (idx) => setGates((prev) => prev.filter((_, i) => i !== idx));

  // Language gating — which language the text is written in,
  // partial-speaker gist, Intelligence DC to decipher.
  const [language, setLanguage] = useState(initial?.language || null);
  const [gist, setGist] = useState(initial?.gist || "");
  const [decipherDc, setDecipherDc] = useState(
    Number.isFinite(initial?.decipher_dc) ? initial.decipher_dc : 15,
  );

  // Hidden class-specific annotations. Kept in metadata JSONB so
  // we don't need new columns for two short strings.
  const [thievesCantMessage, setThievesCantMessage] = useState(
    initial?.metadata?.thieves_cant_message || "",
  );
  const [druidicMessage, setDruidicMessage] = useState(
    initial?.metadata?.druidic_message || "",
  );
  const [cantSymbols, setCantSymbols] = useState(
    Array.isArray(initial?.metadata?.thieves_cant_symbols) ? initial.metadata.thieves_cant_symbols : [],
  );
  const [cantColor, setCantColor] = useState(
    initial?.metadata?.thieves_cant_color || CANT_DEFAULT_COLOR,
  );
  const [druidicSymbols, setDruidicSymbolsState] = useState(
    Array.isArray(initial?.metadata?.druidic_symbols) ? initial.metadata.druidic_symbols : [],
  );
  const [druidicColor, setDruidicColor] = useState(
    initial?.metadata?.druidic_color || DRUIDIC_DEFAULT_COLOR,
  );

  // Resolve the active template definition. The new catalog in
  // src/config/entryTemplates wins; the legacy templates in
  // src/data/worldLoreTemplates remain as a fallback so in-flight
  // entries that pointed at old template keys keep opening cleanly.
  const templateOptions = useMemo(() => getTemplatesForCategory(categoryKey), [categoryKey]);
  const categorySpecificCount = useMemo(
    () => (ENTRY_TEMPLATES[categoryKey]?.length || 0),
    [categoryKey],
  );
  const template = useMemo(() => {
    const fromCatalog = entryTemplateByKey(templateType);
    if (fromCatalog && fromCatalog.key === templateType) return fromCatalog;
    return templateById(templateType);
  }, [templateType]);
  // Backward compat: the legacy templates set `forceVisibility`; the
  // new catalog uses `autoVisibility`. Both keys flow through the
  // same visibility-locking code path below.
  const effectiveForceVisibility = template?.forceVisibility || template?.autoVisibility || null;

  // Secret Document auto-forces GM Only visibility. When the GM
  // switches to another template, they're free to change visibility
  // back.
  useEffect(() => {
    if (effectiveForceVisibility) setVisibility(effectiveForceVisibility);
  }, [effectiveForceVisibility]);

  const setMeta = (key, value) => setMetadata((m) => ({ ...m, [key]: value }));
  const togglePlayer = (id) => setVisibleTo(
    (prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
  );

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "worldlore", { uploadType: "worldLore" });
      setImageUrl(file_url);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error("Give the entry a title."); return; }
    const mergedMetadata = { ...(metadata || {}) };
    if (thievesCantMessage.trim()) mergedMetadata.thieves_cant_message = thievesCantMessage.trim();
    else delete mergedMetadata.thieves_cant_message;
    if (druidicMessage.trim()) mergedMetadata.druidic_message = druidicMessage.trim();
    else delete mergedMetadata.druidic_message;
    if (cantSymbols.length > 0) {
      mergedMetadata.thieves_cant_symbols = cantSymbols;
      mergedMetadata.thieves_cant_color = cantColor;
    } else {
      delete mergedMetadata.thieves_cant_symbols;
      delete mergedMetadata.thieves_cant_color;
    }
    if (druidicSymbols.length > 0) {
      mergedMetadata.druidic_symbols = druidicSymbols;
      mergedMetadata.druidic_color = druidicColor;
    } else {
      delete mergedMetadata.druidic_symbols;
      delete mergedMetadata.druidic_color;
    }

    onSave({
      id: initial?.id,
      title: title.trim(),
      content,
      template_type: templateType,
      visibility,
      visible_to_players: visibility === "selected" ? visibleTo : [],
      metadata: mergedMetadata,
      image_url: imageUrl || null,
      images,
      knowledge_gates: gates,
      language: language || null,
      gist: gist.trim() || null,
      decipher_dc: language ? Math.max(1, Math.min(30, Number(decipherDc) || 15)) : null,
    });
  };

  return (
    <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {initial?.id ? "Edit Entry" : "New Entry"}
        </h2>
      </div>

      {allowTemplates && (
        <div>
          <Label className="text-sm text-slate-300">Template</Label>
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templateOptions.map((t, i) => [
                // Divider between category-specific and global rows.
                i === categorySpecificCount && categorySpecificCount > 0 ? (
                  <div key={`divider-${t.key}`} className="my-1 border-t border-slate-700" aria-hidden />
                ) : null,
                <SelectItem key={t.key} value={t.key}>
                  <span className="flex items-center gap-2">
                    <span>{t.label}</span>
                    {t.autoVisibility === "gm_only" && (
                      <span className="text-[9px] uppercase tracking-widest text-amber-400">GM only</span>
                    )}
                  </span>
                </SelectItem>,
              ])}
            </SelectContent>
          </Select>
          {template?.description && (
            <p className="text-[11px] text-slate-500 mt-1">{template.description}</p>
          )}
        </div>
      )}

      <div>
        <Label className="text-sm text-slate-300">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#0f1219] border-slate-600 text-white mt-1"
        />
      </div>

      {/* Content body. Freeform uses it as the whole entry; structured
          templates use it as their main description area. Legacy
          templates without a contentField get the editor too so the
          upgrade is non-breaking. */}
      {(() => {
        const contentField = template?.contentField || (
          templateType === "freeform" || template?.fields?.length === 0
            ? { label: "Content", placeholder: "Write whatever you want." }
            : null
        );
        if (!contentField) return null;
        return (
          <div>
            <Label className="text-sm text-slate-300">{contentField.label}</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder={contentField.placeholder || "Supports rich text / HTML."}
              className="bg-[#0f1219] border-slate-600 text-white placeholder:text-slate-500 mt-1"
            />
          </div>
        );
      })()}

      {template?.fields?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0f1219] border border-slate-700 rounded-lg p-3">
          {template.fields.map((field) => (
            <TemplateField
              key={field.key}
              field={field}
              value={metadata[field.key] ?? ""}
              onChange={(v) => setMeta(field.key, v)}
              campaignId={campaignId}
            />
          ))}
        </div>
      )}

      {categoryMetadataFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0f1219] border border-slate-700 rounded-lg p-3">
          {categoryMetadataFields.map((field) => (
            <TemplateField
              key={field.key}
              field={field}
              value={metadata[field.key] ?? ""}
              onChange={(v) => setMeta(field.key, v)}
              campaignId={campaignId}
            />
          ))}
        </div>
      )}

      <div>
        <Label className="text-sm text-slate-300">Cover Image (optional)</Label>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-20 h-20 rounded object-cover border border-slate-700" />
          ) : (
            <div className="w-20 h-20 rounded bg-slate-800 border border-slate-700" />
          )}
          <label className="inline-flex items-center gap-1 text-xs text-slate-300 cursor-pointer bg-[#0f1219] border border-slate-600 px-2.5 py-1.5 rounded hover:border-[#37F2D1]">
            <Upload className="w-3 h-3" />
            {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              disabled={uploading} />
          </label>
          <SketchCanvas campaignId={campaignId} onSave={(url) => setImageUrl(url)} />
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="text-[11px] text-red-400 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <AttachmentsField
        images={images}
        onChange={setImages}
        campaignId={campaignId}
      />

      {/* Knowledge gates — optional skill / ability / language
          checks that lock this entry until passed. */}
      <div className="border border-slate-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            Knowledge Gates (Optional)
          </h4>
          <Button variant="outline" size="sm" onClick={addGate}>
            <Plus className="w-3 h-3 mr-1" /> Add Gate
          </Button>
        </div>
        {gates.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            No gates yet. Add one to lock this entry behind a skill check, ability check, or language requirement.
          </p>
        ) : (
          <div className="space-y-3">
            {gates.map((gate, idx) => (
              <div key={gate.id || idx} className="bg-[#0f1219] border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-slate-400">Gate Type</Label>
                    <Select value={gate.type} onValueChange={(v) => updateGate(idx, { type: v })}>
                      <SelectTrigger className="bg-[#050816] border-slate-600 text-white h-9 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skill_check">Skill Check</SelectItem>
                        <SelectItem value="ability_check">Ability Check</SelectItem>
                        <SelectItem value="language">Language Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {gate.type === "skill_check" && (
                    <>
                      <div>
                        <Label className="text-[10px] uppercase tracking-widest text-slate-400">Skill</Label>
                        <Select value={gate.skill || "Arcana"} onValueChange={(v) => updateGate(idx, { skill: v })}>
                          <SelectTrigger className="bg-[#050816] border-slate-600 text-white h-9 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-widest text-slate-400">DC</Label>
                        <Input
                          type="number" min={1} max={30}
                          value={gate.dc ?? 15}
                          onChange={(e) => updateGate(idx, { dc: Number(e.target.value) || 15 })}
                          className="bg-[#050816] border-slate-600 text-white h-9 text-xs mt-1 w-24"
                        />
                      </div>
                    </>
                  )}

                  {gate.type === "ability_check" && (
                    <>
                      <div>
                        <Label className="text-[10px] uppercase tracking-widest text-slate-400">Ability</Label>
                        <Select value={gate.ability || "int"} onValueChange={(v) => updateGate(idx, { ability: v })}>
                          <SelectTrigger className="bg-[#050816] border-slate-600 text-white h-9 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ABILITIES.map((a) => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-widest text-slate-400">DC</Label>
                        <Input
                          type="number" min={1} max={30}
                          value={gate.dc ?? 15}
                          onChange={(e) => updateGate(idx, { dc: Number(e.target.value) || 15 })}
                          className="bg-[#050816] border-slate-600 text-white h-9 text-xs mt-1 w-24"
                        />
                      </div>
                    </>
                  )}

                  {gate.type === "language" && (
                    <div className="md:col-span-1">
                      <Label className="text-[10px] uppercase tracking-widest text-slate-400">Language</Label>
                      <Select value={gate.language || "Common"} onValueChange={(v) => updateGate(idx, { language: v })}>
                        <SelectTrigger className="bg-[#050816] border-slate-600 text-white h-9 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GATE_LANGUAGE_OPTIONS.map((lang) => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Input
                  placeholder="What players see on failure (optional)…"
                  value={gate.failure_text || ""}
                  onChange={(e) => updateGate(idx, { failure_text: e.target.value })}
                  className="bg-[#050816] border-slate-600 text-white h-9 text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGate(idx)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove Gate
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Language gating — entry-wide language + gist + decipher
          DC. Independent of the per-gate "Language Required" type
          (that one locks the entry entirely; this one drives the
          comprehension tier + font rendering). */}
      <div className="border border-slate-700/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Languages className="w-4 h-4 text-amber-400" />
          Language Gating (Optional)
        </h4>
        <Select
          value={language || "none"}
          onValueChange={(v) => setLanguage(v === "none" ? null : v)}
        >
          <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None — readable by all</SelectItem>
            {GATE_LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {language && (
          <>
            <Textarea
              placeholder="What a partial speaker catches at a glance. e.g. 'Some kind of warning about the bridge.'"
              value={gist}
              onChange={(e) => setGist(e.target.value)}
              className="mt-3 bg-[#0f1219] border-slate-700 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              Partial speakers see this gist. Leave blank to give them no advantage over unknown speakers.
            </p>

            <div className="mt-3">
              <Label className="text-xs text-slate-400">Decipher DC</Label>
              <Input
                type="number" min={1} max={30}
                value={decipherDc}
                onChange={(e) => setDecipherDc(Number(e.target.value) || 15)}
                className="w-24 bg-[#0f1219] border-slate-700 text-white mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Intelligence check for partial speakers to unlock full text. Default 15.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Hidden class-specific annotations. Rendered only for the
          character that knows the language; others never see them. */}
      <div className="border border-dashed border-slate-600 rounded-lg p-3 space-y-3">
        <span className="text-sm text-slate-400">🗡️ Thieves&apos; Cant (Optional)</span>
        <SymbolPicker
          symbols={THIEVES_CANT_SYMBOLS}
          categories={CANT_CATEGORIES}
          selected={cantSymbols}
          defaultColor={cantColor}
          colorOptions={CANT_COLOR_PRESETS}
          label="Thieves' Cant"
          icon="🗡️"
          onSelect={(sym) =>
            setCantSymbols((prev) =>
              prev.some((s) => s.id === sym.id)
                ? prev
                : [...prev, { id: sym.id, color: cantColor }],
            )
          }
          onRemove={(id) => setCantSymbols((prev) => prev.filter((s) => s.id !== id))}
          onColorChange={(c) => {
            setCantColor(c);
            setCantSymbols((prev) => prev.map((s) => ({ ...s, color: c })));
          }}
        />
        <Textarea
          placeholder="Hidden message only Rogues with Thieves' Cant can see…"
          value={thievesCantMessage}
          onChange={(e) => setThievesCantMessage(e.target.value)}
          className="bg-[#0f1219] border-slate-700 text-white"
        />
        <p className="text-xs text-slate-500">
          Symbols and message are only visible to characters who know Thieves&apos; Cant.
        </p>
      </div>
      <div className="border border-dashed border-slate-600 rounded-lg p-3 space-y-3">
        <span className="text-sm text-slate-400">🌿 Druidic (Optional)</span>
        <SymbolPicker
          symbols={DRUIDIC_SYMBOLS}
          categories={DRUIDIC_CATEGORIES}
          selected={druidicSymbols}
          defaultColor={druidicColor}
          colorOptions={DRUIDIC_COLOR_PRESETS}
          label="Druidic"
          icon="🌿"
          onSelect={(sym) =>
            setDruidicSymbolsState((prev) =>
              prev.some((s) => s.id === sym.id)
                ? prev
                : [...prev, { id: sym.id, color: druidicColor }],
            )
          }
          onRemove={(id) => setDruidicSymbolsState((prev) => prev.filter((s) => s.id !== id))}
          onColorChange={(c) => {
            setDruidicColor(c);
            setDruidicSymbolsState((prev) => prev.map((s) => ({ ...s, color: c })));
          }}
        />
        <Textarea
          placeholder="Hidden message only Druids can see…"
          value={druidicMessage}
          onChange={(e) => setDruidicMessage(e.target.value)}
          className="bg-[#0f1219] border-slate-700 text-white"
        />
        <p className="text-xs text-slate-500">
          Symbols and message are only visible to Druids.
        </p>
      </div>

      <div className="bg-[#0f1219] border border-slate-700 rounded-lg p-3 space-y-2">
        <Label className="text-sm text-slate-300">Visibility</Label>
        <Select
          value={visibility}
          onValueChange={setVisibility}
          disabled={!!effectiveForceVisibility}
        >
          <SelectTrigger className="bg-[#050816] border-slate-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">🌍 Public — all players</SelectItem>
            <SelectItem value="gm_only">🔒 GM Only</SelectItem>
            <SelectItem value="selected">👁️ Selected Players</SelectItem>
          </SelectContent>
        </Select>
        {effectiveForceVisibility && (
          <p className="text-[11px] text-amber-400">
            This template is locked to {effectiveForceVisibility === "gm_only" ? "GM Only" : effectiveForceVisibility}.
          </p>
        )}
        {visibility === "selected" && (
          <div className="pt-1 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              Players who can see this
            </div>
            {partyPlayers.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No players in this campaign yet.</p>
            ) : (
              partyPlayers.map((p) => (
                <label key={p.user_id} className="flex items-center gap-2 text-sm text-slate-300">
                  <Checkbox
                    checked={visibleTo.includes(p.user_id)}
                    onCheckedChange={() => togglePlayer(p.user_id)}
                  />
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-700" />
                  )}
                  <span>{p.username || p.email || p.user_id}</span>
                </label>
              ))
            )}
            <p className="text-[10px] text-slate-500 italic">
              Players flagged as the campaign's mole also see selected-visibility entries.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/50">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save Entry"}
        </Button>
      </div>
    </div>
  );
}

function TemplateField({ field, value, onChange, campaignId }) {
  const { key, label, type = "text", options = [], placeholder } = field;
  if (type === "textarea") {
    return (
      <div className="md:col-span-2">
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="bg-[#050816] border-slate-600 text-white placeholder:text-slate-500 mt-1 text-sm"
        />
      </div>
    );
  }
  if (type === "select") {
    return (
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
        <Select value={String(value || "")} onValueChange={onChange}>
          <SelectTrigger className="bg-[#050816] border-slate-600 text-white h-9 text-xs mt-1">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (type === "image") {
    return <ImageField label={label} value={value} onChange={onChange} campaignId={campaignId} />;
  }
  if (type === "checkbox") {
    return (
      <div className="flex items-center gap-2 h-9 mt-5">
        <Checkbox
          checked={!!value}
          onCheckedChange={(c) => onChange(!!c)}
        />
        <Label className="text-xs text-slate-300">{label}</Label>
      </div>
    );
  }
  if (type === "tags") {
    // Stored as a string[]; editor is a comma-separated text input
    // for simplicity — matches how other comma-separated lists are
    // authored elsewhere in the app.
    const displayText = Array.isArray(value) ? value.join(", ") : (value || "");
    return (
      <div className="md:col-span-2">
        <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
        <Input
          value={displayText}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder={placeholder || "Tag, Tag, Tag"}
          className="bg-[#050816] border-slate-600 text-white placeholder:text-slate-500 h-9 text-xs mt-1"
        />
      </div>
    );
  }
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type === "number" ? "number" : "text"}
        placeholder={placeholder}
        className="bg-[#050816] border-slate-600 text-white placeholder:text-slate-500 h-9 text-xs mt-1"
      />
    </div>
  );
}

function ImageField({ label, value, onChange, campaignId }) {
  const [uploading, setUploading] = useState(false);
  const handle = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "worldlore", { uploadType: "worldLore" });
      onChange(file_url);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="md:col-span-2">
      <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        {value ? (
          <img src={value} alt="" className="w-16 h-16 rounded object-cover border border-slate-700" />
        ) : (
          <div className="w-16 h-16 rounded bg-slate-800 border border-slate-700" />
        )}
        <label className="inline-flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer bg-[#050816] border border-slate-600 px-2 py-1.5 rounded hover:border-[#37F2D1]">
          <Upload className="w-3 h-3" />
          {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} disabled={uploading} />
        </label>
        <SketchCanvas campaignId={campaignId} onSave={(url) => onChange(url)} />
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-[11px] text-red-400 hover:underline">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function AttachmentsField({ images, onChange, campaignId }) {
  const [uploading, setUploading] = useState(false);
  const add = (url) => {
    if (!url) return;
    onChange([...(Array.isArray(images) ? images : []), url]);
  };
  const remove = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };
  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "worldlore", { uploadType: "worldLore" });
      add(file_url);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div>
      <Label className="text-sm text-slate-300">Attached Images (optional)</Label>
      <p className="text-[11px] text-slate-500 mb-2">
        Adds to the 2-column image grid below the entry. Cover image stays separate.
      </p>
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          {images.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative group">
              <img src={url} alt="" className="w-full aspect-square object-cover rounded border border-slate-700" />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute top-1 right-1 bg-black/70 text-red-300 hover:text-red-200 rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer bg-[#0f1219] border border-slate-600 px-2.5 py-1.5 rounded hover:border-[#37F2D1]">
          <Upload className="w-3 h-3" />
          {uploading ? "Uploading…" : "Add image"}
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
            disabled={uploading} />
        </label>
        <SketchCanvas campaignId={campaignId} onSave={(url) => add(url)} />
      </div>
    </div>
  );
}
