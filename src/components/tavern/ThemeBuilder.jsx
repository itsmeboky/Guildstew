import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Palette, Flame, Store, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance } from "@/lib/spiceWallet";
import { uploadItem } from "@/lib/tavernClient";
import { uploadFile } from "@/utils/uploadFile";
import { THEME_PRESETS, THEME_COLOR_FIELDS, DEFAULT_THEME } from "@/config/themePresets";
import { MIN_ITEM_PRICE, UPLOAD_FEES, formatSpice } from "@/config/spiceConfig";

/**
 * UI Theme Builder.
 *
 * Left-side controls: 10 color pickers + 2 Google Font text inputs +
 * a preset picker. Right-side: a mini UI sample that updates live
 * (nav bar, card, button, heading + body text, Spice pill).
 *
 * Saving builds a `tavern_items` row with `category: 'ui_theme'` and
 * `file_data: { type, colors, fonts }`. The same `applyTheme` that
 * runs at app startup (see ThemeApplier) will then read the saved
 * colors and fonts when the buyer equips this theme.
 */
export default function ThemeBuilder({ open, onClose }) {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();
  const previewRef = useRef(null);

  const [theme, setTheme] = useState(() => cloneTheme(DEFAULT_THEME));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(MIN_ITEM_PRICE);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [presetKey, setPresetKey] = useState("default_dark");

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id && open,
  });

  useEffect(() => {
    if (open) {
      setTheme(cloneTheme(DEFAULT_THEME));
      setName("");
      setDescription("");
      setPrice(MIN_ITEM_PRICE);
      setTags([]);
      setTagInput("");
      setPresetKey("default_dark");
    }
  }, [open]);

  // Debounced Google Font loader so the preview reflects the typed
  // font name without hammering the Google Fonts CDN on each keystroke.
  const { heading, body } = theme.fonts || {};
  useEffect(() => { injectGoogleFont(heading); }, [heading]);
  useEffect(() => { injectGoogleFont(body); }, [body]);

  const setColor = (key, value) =>
    setTheme((t) => ({ ...t, colors: { ...t.colors, [key]: value } }));

  const setFont = (role, value) =>
    setTheme((t) => ({ ...t, fonts: { ...t.fonts, [role]: value } }));

  const applyPreset = (key) => {
    const p = THEME_PRESETS[key];
    if (!p) return;
    setTheme((t) => ({ ...t, colors: { ...p.colors } }));
    setPresetKey(key);
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || tags.includes(v)) { setTagInput(""); return; }
    setTags([...tags, v]);
    setTagInput("");
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

      // Synthesize a simple preview thumbnail from the theme's color
      // palette. A DOM screenshot of the live preview would be
      // richer, but pulling in html2canvas just for this one listing
      // flow isn't worth the bundle cost — the thumbnail below
      // still tells a buyer the palette at a glance.
      let previewImageUrl = null;
      try {
        const dataUrl = renderThemeThumbnail(theme, name);
        const blob = dataURLtoBlob(dataUrl);
        const file = new File([blob], `${safeFileName(name)}-preview.png`, { type: "image/png" });
        const up = await uploadFile(file, "user-assets", "tavern/theme-previews", {
          userId: user.id,
          uploadType: "tavern_preview",
        });
        previewImageUrl = up.file_url;
      } catch { /* non-fatal */ }

      const fileData = { type: "ui_theme", colors: theme.colors, fonts: theme.fonts };

      const r = await uploadItem({
        creatorId: user.id,
        creatorTier: sub.tier,
        form: {
          name: name.trim(),
          description: description.trim(),
          category: "ui_theme",
          tags,
          price,
          preview_image_url: previewImageUrl,
          preview_images: [],
          file_url: null,
          file_data: fileData,
        },
      });
      if (!r.success) throw new Error(r.reason || "Upload failed");
      return r;
    },
    onSuccess: () => {
      toast.success("Theme listed!");
      queryClient.invalidateQueries({ queryKey: ["spiceWallet", user.id] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-400" />
            UI Theme Builder
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Tune colors and Google Fonts. Preview updates live.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr,360px] gap-4">
          {/* LEFT — controls */}
          <div className="space-y-3">
            <Section title="Base Theme">
              <Select value={presetKey} onValueChange={applyPreset}>
                <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(THEME_PRESETS).map(([key, p]) => (
                    <SelectItem key={key} value={key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                {THEME_PRESETS[presetKey]?.description}
              </p>
            </Section>

            <Section title="Colors">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {THEME_COLOR_FIELDS.map((f) => (
                  <ColorRow
                    key={f.key}
                    label={f.label}
                    value={theme.colors[f.key]}
                    onChange={(v) => setColor(f.key, v)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Fonts">
              <FontField
                label="Heading Font"
                value={heading || ""}
                onChange={(v) => setFont("heading", v)}
                sample="Lorem Ipsum"
                stack="serif"
              />
              <FontField
                label="Body Font"
                value={body || ""}
                onChange={(v) => setFont("body", v)}
                sample="The quick brown fox jumps over the lazy dog."
                stack="sans-serif"
              />
              <p className="text-[10px] text-slate-500 italic">
                Enter any Google Font name. Browse fonts at fonts.google.com.
              </p>
            </Section>

            <Section title="Save as Tavern Listing">
              <div>
                <Label className="text-xs text-slate-300">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#050816] border-slate-700 text-white mt-1" placeholder="e.g. Crimson Scholar" />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-[#050816] border-slate-700 text-white mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-300">Price (Spice)</Label>
                  <Input
                    type="number"
                    min={MIN_ITEM_PRICE}
                    step="25"
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="bg-[#050816] border-slate-700 text-white mt-1"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">~${(price / 250).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Tags</Label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      className="bg-[#050816] border-slate-700 text-white"
                      placeholder="dark, elegant"
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
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Upload fee: <strong>{uploadFee === 0 ? "Waived" : `${formatSpice(uploadFee)} Spice`}</strong>
                <span className="text-slate-400">· Wallet {formatSpice(balance)}</span>
              </div>
            </Section>
          </div>

          {/* RIGHT — live preview */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">Live Preview</p>
            <ThemePreview ref={previewRef} theme={theme} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !canAffordFee}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : uploadFee > 0 ? `List Theme — ${formatSpice(uploadFee)} Spice` : "List Theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ThemePreview = React.forwardRef(function ThemePreview({ theme }, ref) {
  const c = theme.colors;
  const headingFont = theme.fonts?.heading ? `"${theme.fonts.heading}", serif` : "serif";
  const bodyFont = theme.fonts?.body ? `"${theme.fonts.body}", sans-serif` : "sans-serif";

  return (
    <div
      ref={ref}
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: c.pageBackground,
        borderColor: c.cardBorder,
        color: c.textPrimary,
        fontFamily: bodyFont,
      }}
    >
      <div
        className="px-4 py-2 flex items-center justify-between text-sm font-bold"
        style={{ backgroundColor: c.navBackground, color: "#050816" }}
      >
        <span style={{ fontFamily: headingFont }}>GUILDSTEW</span>
        <span
          className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5"
          style={{
            backgroundColor: `${c.primaryAccent}22`,
            color: c.primaryAccent,
            border: `1px solid ${c.primaryAccent}55`,
          }}
        >
          <Flame className="w-3 h-3" /> 1,250
        </span>
      </div>

      {/* Homepage content-card strip — previews the Homepage Cards color. */}
      <div className="p-3">
        <div
          className="rounded-lg p-3 text-[11px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: c.homepageCards, color: "#050816" }}
        >
          Newest Game Pack
        </div>
      </div>

      <div className="p-4 pt-1 space-y-3">
        <h2
          style={{ fontFamily: headingFont, color: c.textPrimary }}
          className="text-2xl font-bold"
        >
          Welcome back, adventurer.
        </h2>
        <p className="text-sm" style={{ color: c.textMuted }}>
          Your party has three unread rumors from the last session.
        </p>
        <div
          className="rounded-lg border p-3"
          style={{ backgroundColor: c.cardBackground, borderColor: c.cardBorder }}
        >
          <p className="text-xs uppercase tracking-widest mb-1 font-bold" style={{ color: c.textMuted }}>
            Campaign · Session 14
          </p>
          <p className="text-sm" style={{ color: c.textPrimary }}>
            The tavern keeper leans in: "There's coin to be made out past the ridge."
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              className="text-xs font-bold px-3 py-1.5 rounded"
              style={{ backgroundColor: c.primaryAccent, color: "#050816" }}
            >
              Accept Quest
            </button>
            <button
              className="text-xs font-bold px-3 py-1.5 rounded border"
              style={{
                borderColor: c.cardBorder,
                color: c.textPrimary,
                backgroundColor: "transparent",
              }}
            >
              Decline
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: `${c.success}22`, color: c.success }}>
            Connected
          </span>
          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: `${c.danger}22`, color: c.danger }}>
            1 warning
          </span>
          <span
            className="px-2 py-0.5 rounded"
            style={{ backgroundColor: `${c.secondaryAccent}22`, color: c.secondaryAccent }}
          >
            Epic loot
          </span>
        </div>
      </div>
    </div>
  );
});

function Section({ title, children }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 space-y-2">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#37F2D1]">{title}</h3>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-slate-300 flex-1">{label}</Label>
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
      />
      <Input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-[#050816] border-slate-700 text-white w-24 text-[11px] font-mono"
      />
    </div>
  );
}

function FontField({ label, value, onChange, sample, stack }) {
  // Debounce font injection so the sample reflects the typed name
  // without spamming <link> tags while the user is mid-typing.
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    const handle = setTimeout(() => { if (local !== value) onChange?.(local); }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div>
      <Label className="text-xs text-slate-300 mb-1 block">{label}</Label>
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="bg-[#050816] border-slate-700 text-white"
        placeholder={stack === "serif" ? "Cinzel" : "Inter"}
      />
      {value && (
        <p
          className="mt-2 text-lg text-white"
          style={{ fontFamily: `"${value}", ${stack}` }}
        >
          {sample}
        </p>
      )}
    </div>
  );
}

// Font loader — idempotent. Each font name gets a single <link> tag
// keyed by id so typing "Inter" twice doesn't stack duplicate links.
const loadedFonts = new Set();
function injectGoogleFont(name) {
  if (!name) return;
  const key = String(name).trim();
  if (!key) return;
  const id = `theme-builder-font-${key.replace(/\s+/g, "_")}`;
  if (loadedFonts.has(id)) return;
  if (document.getElementById(id)) { loadedFonts.add(id); return; }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.id = id;
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(key)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(id);
}

function renderThemeThumbnail(theme, label) {
  const c = theme.colors || {};
  const W = 512, H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Page background.
  ctx.fillStyle = c.pageBackground || "#0f1219";
  ctx.fillRect(0, 0, W, H);

  // Nav bar.
  ctx.fillStyle = c.navBackground || "#f8a47c";
  ctx.fillRect(0, 0, W, 48);

  // Homepage content card (the salmon/orange the theme can retint).
  ctx.fillStyle = c.homepageCards || "#f8a47c";
  ctx.fillRect(32, 64, W - 64, 24);

  // Primary card.
  ctx.fillStyle = c.cardBackground || "#1a1f2e";
  ctx.fillRect(32, 104, W - 64, 176);
  ctx.strokeStyle = c.cardBorder || "#2a3441";
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 104, W - 64, 176);

  // Heading.
  ctx.fillStyle = c.textPrimary || "#e2e8f0";
  const head = theme.fonts?.heading || "serif";
  ctx.font = `700 22px "${head}", serif`;
  ctx.fillText((label || "Guildstew Theme").slice(0, 32), 48, 140);

  // Body text.
  const body = theme.fonts?.body || "sans-serif";
  ctx.fillStyle = c.textMuted || "#94a3b8";
  ctx.font = `400 14px "${body}", sans-serif`;
  ctx.fillText("The quick brown fox jumps over the lazy dog.", 48, 168);

  // Accent button.
  ctx.fillStyle = c.primaryAccent || "#37F2D1";
  ctx.fillRect(48, 194, 120, 32);
  ctx.fillStyle = "#050816";
  ctx.font = `700 13px "${body}", sans-serif`;
  ctx.fillText("Accept Quest", 62, 215);

  // Status chips.
  const chip = (x, color, text) => {
    ctx.fillStyle = hexA(color, 0.18);
    ctx.fillRect(x, 240, 88, 24);
    ctx.fillStyle = color;
    ctx.font = `700 11px "${body}", sans-serif`;
    ctx.fillText(text, x + 10, 257);
  };
  chip(48,  c.success         || "#22c55e", "Connected");
  chip(148, c.danger          || "#ef4444", "Warning");
  chip(240, c.secondaryAccent || "#a855f7", "Epic");

  return canvas.toDataURL("image/png");
}

function hexA(hex, alpha) {
  const h = String(hex || "#000000").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function cloneTheme(t) {
  return {
    type: "ui_theme",
    colors: { ...t.colors },
    fonts: { ...t.fonts },
    images: { ...(t.images || {}) },
  };
}

function dataURLtoBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.+?);base64/.exec(meta)?.[1] || "image/png";
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

function safeFileName(s) {
  return (s || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "theme";
}
