import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, Camera, Dices, Download, Settings2, Sparkles, Upload, X,
} from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance } from "@/lib/spiceWallet";
import { uploadItem } from "@/lib/tavernClient";
import { uploadFile } from "@/utils/uploadFile";
import {
  MATERIAL_PRESETS, MATERIAL_PRESET_LIST, matchPreset, DEFAULT_DICE_SKIN,
} from "@/config/diceSkinPresets";
import {
  DEFAULT_MODEL_URLS, DEFAULT_TEXTURE_URL, TEMPLATE_TEXTURE_URL, DICE_TYPES,
} from "@/config/diceAssets";
import { MIN_ITEM_PRICE, UPLOAD_FEES, formatSpice } from "@/config/spiceConfig";
import DiceSkinPreview from "@/components/tavern/DiceSkinPreview";

/**
 * Dice Skin Creator.
 *
 * Two-pane layout:
 *   left  — painter controls (colors, material preset, lighting,
 *           effects, advanced/texture upload, save form)
 *   right — live 3D preview of a slowly-rotating die with the current
 *           skin applied. Die-type buttons switch between d4..d20.
 *
 * On save: capture the preview canvas as a PNG (that becomes the
 * Tavern listing's preview image), upload any custom texture, build
 * the skin's file_data, and create a `tavern_items` row through the
 * shared `uploadItem` helper (which also debits the upload fee).
 *
 * When a creator uploads a custom texture the painter greys out — the
 * texture becomes the single source of truth for the look.
 */
export default function DiceSkinCreator({ open, onClose }) {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();
  const previewRef = useRef(null);
  const [selectedDie, setSelectedDie] = useState("d20");
  const [skin, setSkin] = useState(() => ({ ...DEFAULT_DICE_SKIN }));
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(MIN_ITEM_PRICE);
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState([]);
  const [customTextureUploading, setCustomTextureUploading] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id && open,
  });

  React.useEffect(() => {
    if (open) {
      setSkin({ ...DEFAULT_DICE_SKIN });
      setName("");
      setDescription("");
      setPrice(MIN_ITEM_PRICE);
      setTags([]);
      setTagsInput("");
      setSelectedDie("d20");
      setEffectsOpen(false);
      setAdvancedOpen(false);
    }
  }, [open]);

  const currentPreset = useMemo(
    () => skin.materialPreset || matchPreset(skin.metalness, skin.roughness) || "custom",
    [skin.materialPreset, skin.metalness, skin.roughness],
  );

  const set = (patch) => setSkin((s) => ({ ...s, ...patch }));

  const applyPreset = (key) => {
    const p = MATERIAL_PRESETS[key];
    if (!p) return;
    set({ metalness: p.metalness, roughness: p.roughness, materialPreset: key });
  };

  const onSliderChange = (field, value) => {
    // Manual slider overrides preset — set it to the matching preset
    // if the value happens to equal one, otherwise "Custom".
    const next = { ...skin, [field]: value };
    const matched = matchPreset(next.metalness, next.roughness);
    setSkin({ ...next, materialPreset: matched });
  };

  const uploadCustomTexture = async (file) => {
    if (!file || !user?.id) return;
    setCustomTextureUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "tavern/dice-textures", {
        userId: user.id,
        uploadType: "dice_texture",
      });
      set({ customTextureUrl: file_url });
      toast.success("Custom texture applied");
    } catch (err) {
      toast.error("Texture upload failed");
    } finally {
      setCustomTextureUploading(false);
    }
  };

  const addTag = () => {
    const t = tagsInput.trim();
    if (!t || tags.includes(t)) { setTagsInput(""); return; }
    setTags([...tags, t]);
    setTagsInput("");
  };

  const uploadFee = UPLOAD_FEES[sub.tier] ?? UPLOAD_FEES.free;
  const balance = wallet?.balance || 0;
  const canAffordFee = balance >= uploadFee;

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in to save");
      if (!name.trim()) throw new Error("Name is required");
      if (price < MIN_ITEM_PRICE) throw new Error(`Minimum price is ${formatSpice(MIN_ITEM_PRICE)} Spice`);
      if (!canAffordFee) throw new Error(`Need ${formatSpice(uploadFee - balance)} more Spice for the upload fee`);

      // Capture a PNG snapshot of the current 3D pose. If capture
      // fails (canvas not ready, renderer disposed), we fall back to
      // letting the creator upload a preview later.
      let previewImageUrl = null;
      try {
        const dataUrl = previewRef.current?.captureDataUrl?.();
        if (dataUrl) {
          const blob = dataURLtoBlob(dataUrl);
          const file = new File([blob], `${safeFileName(name)}-preview.png`, { type: "image/png" });
          const up = await uploadFile(file, "user-assets", "tavern/dice-previews", {
            userId: user.id,
            uploadType: "tavern_preview",
          });
          previewImageUrl = up.file_url;
        }
      } catch { /* non-fatal */ }

      const fileData = { ...skin, type: "dice_skin" };

      const r = await uploadItem({
        creatorId: user.id,
        creatorTier: sub.tier,
        form: {
          name: name.trim(),
          description: description.trim(),
          category: "dice_skin",
          tags,
          price,
          preview_image_url: previewImageUrl,
          preview_images: [],
          file_url: skin.customTextureUrl || null,
          file_data: fileData,
        },
      });
      if (!r.success) throw new Error(r.reason || "Upload failed");
      return r;
    },
    onSuccess: () => {
      toast.success("Dice skin listed!");
      queryClient.invalidateQueries({ queryKey: ["spiceWallet", user.id] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  const hasCustomTexture = !!skin.customTextureUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-amber-400" />
            Dice Skin Creator
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Paint a basic skin or upload a custom texture. Changes preview live.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr,320px] gap-4">
          {/* LEFT — controls */}
          <div className="space-y-4">
            {/* Colors */}
            <Section title="Color" disabled={hasCustomTexture} disabledNote="Custom texture overrides color settings">
              <ColorRow label="Base Color"   value={skin.baseColor}   onChange={(v) => set({ baseColor: v })}   disabled={hasCustomTexture} />
              <ColorRow label="Number Color" value={skin.numberColor} onChange={(v) => set({ numberColor: v })} disabled={hasCustomTexture} />
              <div className="flex items-center gap-2">
                <ColorRow
                  label="Edge Color"
                  value={skin.edgeColor || skin.baseColor}
                  onChange={(v) => set({ edgeColor: v })}
                  disabled={hasCustomTexture || !skin.edgeColor}
                />
                <label className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!skin.edgeColor}
                    onChange={(e) => set({ edgeColor: e.target.checked ? null : skin.baseColor })}
                  />
                  Same as base
                </label>
              </div>
            </Section>

            {/* Material preset grid */}
            <Section title="Material">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MATERIAL_PRESET_LIST.map((p) => {
                  const active = currentPreset === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => applyPreset(p.value)}
                      className={`text-left rounded-lg border-2 p-2 transition-colors ${
                        active
                          ? "border-amber-400 bg-amber-500/10"
                          : "border-slate-700 bg-[#050816] hover:border-slate-500"
                      }`}
                    >
                      <div
                        className="h-6 rounded mb-1.5"
                        style={{
                          background: `linear-gradient(120deg, ${skin.baseColor}, ${skin.numberColor})`,
                          filter: `brightness(${1 - p.roughness * 0.4}) saturate(${1 + p.metalness * 0.5})`,
                        }}
                      />
                      <p className="text-xs font-bold text-white">{p.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{p.description}</p>
                    </button>
                  );
                })}
              </div>
              <SliderRow
                label={`Metalness${currentPreset === "custom" ? " · Custom" : ""}`}
                value={skin.metalness}
                onChange={(v) => onSliderChange("metalness", v)}
              />
              <SliderRow
                label={`Roughness${currentPreset === "custom" ? " · Custom" : ""}`}
                value={skin.roughness}
                onChange={(v) => onSliderChange("roughness", v)}
              />
            </Section>

            {/* Lighting */}
            <Section title="Lighting">
              <ColorRow label="Primary Light"   value={skin.primaryLight}   onChange={(v) => set({ primaryLight: v })} />
              <ColorRow label="Secondary Light" value={skin.secondaryLight} onChange={(v) => set({ secondaryLight: v })} />
              <p className="text-[10px] text-slate-500">Controls the two scene lights that reflect off the die.</p>
            </Section>

            {/* Effects */}
            <CollapsibleSection
              title="Effects"
              icon={Sparkles}
              open={effectsOpen}
              onToggle={() => setEffectsOpen((o) => !o)}
            >
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300">Glow</Label>
                <input
                  type="checkbox"
                  checked={!!skin.glowEnabled}
                  onChange={(e) => set({ glowEnabled: e.target.checked })}
                />
              </div>
              {skin.glowEnabled && (
                <ColorRow label="Glow Color" value={skin.glowColor} onChange={(v) => set({ glowColor: v })} />
              )}
              <ColorRow label="Crit Success Particles" value={skin.critSuccessColor} onChange={(v) => set({ critSuccessColor: v })} />
              <ColorRow label="Crit Fail Particles"    value={skin.critFailColor}    onChange={(v) => set({ critFailColor: v })} />
            </CollapsibleSection>

            {/* Advanced / texture upload */}
            <CollapsibleSection
              title="Advanced — Custom Texture"
              icon={Settings2}
              open={advancedOpen}
              onToggle={() => setAdvancedOpen((o) => !o)}
            >
              <p className="text-[11px] text-slate-400 leading-snug">
                For artists: download the template, paint over it in your favorite art program, and upload the result.
                One texture wraps <strong>all dice</strong> (d4 through d20). Must be a square PNG (512×512 or 1024×1024).
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={TEMPLATE_TEXTURE_URL} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline" size="sm">
                    <Download className="w-3 h-3 mr-1" /> Download Template
                  </Button>
                </a>
                <label className="inline-flex items-center gap-2 bg-[#050816] border border-slate-700 hover:border-amber-400 rounded px-3 py-1.5 text-xs cursor-pointer">
                  <Upload className="w-3 h-3" />
                  {customTextureUploading ? "Uploading…" : "Upload Custom Texture"}
                  <input
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => uploadCustomTexture(e.target.files?.[0])}
                  />
                </label>
                {skin.customTextureUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set({ customTextureUrl: null })}
                    className="border-rose-500/50 text-rose-300"
                  >
                    <X className="w-3 h-3 mr-1" /> Remove Texture
                  </Button>
                )}
              </div>
              {skin.customTextureUrl && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 flex items-start gap-2 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300 mt-0.5" />
                  <p className="text-[11px] text-amber-100">
                    Custom texture active — color, material, and edge settings no longer affect the look.
                  </p>
                </div>
              )}
            </CollapsibleSection>

            {/* Save form */}
            <Section title="Save as Tavern Listing">
              <div>
                <Label className="text-xs text-slate-300">Item Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#050816] border-slate-700 text-white mt-1" placeholder="e.g. Obsidian Dragon Dice" />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-[#050816] border-slate-700 text-white mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-300">Price (Spice)</Label>
                  <Input type="number" min={MIN_ITEM_PRICE} step="25" value={price}
                    onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="bg-[#050816] border-slate-700 text-white mt-1" />
                  <p className="text-[10px] text-slate-500 mt-1">Min {formatSpice(MIN_ITEM_PRICE)} · ~${(price / 250).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Tags</Label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      className="bg-[#050816] border-slate-700 text-white"
                      placeholder="fantasy, dark"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tags.map((t) => (
                        <span key={t} className="text-[10px] bg-[#050816] border border-slate-700 text-slate-300 rounded px-2 py-0.5 flex items-center gap-1">
                          #{t}
                          <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-slate-500 hover:text-rose-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-[#050816] border border-amber-500/30 rounded p-2 text-[11px] text-amber-100 flex items-center gap-2">
                <SpiceIcon size={14} color="#fbbf24" />
                Upload fee: <strong>{uploadFee === 0 ? "Waived" : `${formatSpice(uploadFee)} Spice`}</strong>
                <span className="text-slate-400">· Wallet {formatSpice(balance)}</span>
              </div>
            </Section>
          </div>

          {/* RIGHT — preview */}
          <div className="space-y-3">
            <DiceSkinPreview
              ref={previewRef}
              skin={skin}
              diceType={selectedDie}
              modelUrls={DEFAULT_MODEL_URLS}
              defaultTextureUrl={DEFAULT_TEXTURE_URL}
            />
            <div className="flex items-center gap-1 flex-wrap">
              {DICE_TYPES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDie(d)}
                  className={`text-[11px] uppercase font-bold tracking-widest px-2 py-1 rounded border ${
                    selectedDie === d
                      ? "bg-amber-500 text-amber-950 border-amber-500"
                      : "bg-[#050816] text-slate-300 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const data = previewRef.current?.captureDataUrl?.();
                if (data) {
                  const w = window.open();
                  if (w) w.document.body.innerHTML = `<img src="${data}" />`;
                }
              }}
              className="w-full"
            >
              <Camera className="w-3 h-3 mr-1" /> Preview Screenshot
            </Button>
            <p className="text-[10px] text-slate-500 italic text-center">
              Screenshot auto-captures on save.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !canAffordFee}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : uploadFee > 0 ? `List Skin — ${formatSpice(uploadFee)} Spice` : "List Skin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, disabled, disabledNote }) {
  return (
    <div className={`bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 space-y-2 ${disabled ? "opacity-60" : ""}`}>
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#37F2D1]">{title}</h3>
      {disabled && disabledNote && (
        <p className="text-[10px] text-amber-300 italic">{disabledNote}</p>
      )}
      {children}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, open, onToggle, children }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="text-[11px] font-black uppercase tracking-widest text-[#37F2D1] flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {title}
        </span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function ColorRow({ label, value, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-slate-300 flex-1">{label}</Label>
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer disabled:cursor-not-allowed"
      />
      <Input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="bg-[#050816] border-slate-700 text-white w-24 text-xs font-mono"
      />
    </div>
  );
}

function SliderRow({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-slate-300">{label}</Label>
        <span className="text-[11px] font-mono text-slate-400">{Number(value).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className="w-full accent-amber-400"
      />
    </div>
  );
}

function dataURLtoBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.+?);base64/.exec(meta)?.[1] || "image/png";
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

function safeFileName(s) {
  return (s || "dice-skin").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dice-skin";
}
