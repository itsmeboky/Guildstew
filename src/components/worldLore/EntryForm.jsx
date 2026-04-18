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
import { Save, X, Upload } from "lucide-react";
import { uploadFile } from "@/utils/uploadFile";
import { TEMPLATE_TYPES, templateById } from "@/data/worldLoreTemplates";
import SketchCanvas from "@/components/shared/SketchCanvas";

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

  const template = useMemo(() => templateById(templateType), [templateType]);

  // Secret Document auto-forces GM Only visibility. When the GM
  // switches to another template, they're free to change visibility
  // back.
  useEffect(() => {
    if (template.forceVisibility) setVisibility(template.forceVisibility);
  }, [template]);

  const setMeta = (key, value) => setMetadata((m) => ({ ...m, [key]: value }));
  const togglePlayer = (id) => setVisibleTo(
    (prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
  );

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "campaign-assets", "worldlore");
      setImageUrl(file_url);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error("Give the entry a title."); return; }
    onSave({
      id: initial?.id,
      title: title.trim(),
      content,
      template_type: templateType,
      visibility,
      visible_to_players: visibility === "selected" ? visibleTo : [],
      metadata,
      image_url: imageUrl || null,
      images,
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
              {TEMPLATE_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
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

      {templateType === "freeform" && (
        <div>
          <Label className="text-sm text-slate-300">Content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Write whatever you want. Supports rich text / HTML."
            className="bg-[#0f1219] border-slate-600 text-white placeholder:text-slate-500 mt-1"
          />
        </div>
      )}

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

      <div className="bg-[#0f1219] border border-slate-700 rounded-lg p-3 space-y-2">
        <Label className="text-sm text-slate-300">Visibility</Label>
        <Select
          value={visibility}
          onValueChange={setVisibility}
          disabled={!!template.forceVisibility}
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
        {template.forceVisibility && (
          <p className="text-[11px] text-amber-400">
            Secret documents are locked to GM Only.
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
      const { file_url } = await uploadFile(file, "campaign-assets", "worldlore");
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
      const { file_url } = await uploadFile(file, "campaign-assets", "worldlore");
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
