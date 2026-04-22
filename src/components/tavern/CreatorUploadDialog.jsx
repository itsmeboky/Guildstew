import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
import { Upload, X, AlertTriangle, Dices, Palette } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance } from "@/lib/spiceWallet";
import { uploadItem } from "@/lib/tavernClient";
import {
  MIN_ITEM_PRICE, UPLOAD_FEES, formatSpice,
} from "@/config/spiceConfig";
import { TAVERN_CATEGORIES } from "@/config/tavernCategories";
import DiceSkinCreator from "@/components/tavern/DiceSkinCreator";
import ThemeBuilder from "@/components/tavern/ThemeBuilder";

/**
 * Creator upload form.
 *
 * One dialog covers every category; the `file hint` copy changes with
 * the category so the creator knows what asset to attach. The upload
 * fee is tier-based and is deducted by `uploadItem` — we display it
 * up-front and disable the submit button when the wallet can't cover
 * it. The fee is refunded automatically if the DB insert fails.
 *
 * Upload widgets here are simple URL inputs — the real file-to-URL
 * hop runs through the existing storage helpers and is plugged in
 * once the Tavern has its own asset bucket wired.
 */
const DEFAULTS = {
  name: "",
  description: "",
  category: "portrait",
  price: MIN_ITEM_PRICE,
  preview_image_url: "",
  preview_images: [],
  file_url: "",
  tags: [],
};

export default function CreatorUploadDialog({ open, onClose }) {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULTS);
  const [tagInput, setTagInput] = useState("");
  const [diceCreatorOpen, setDiceCreatorOpen] = useState(false);
  const [themeBuilderOpen, setThemeBuilderOpen] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id && open,
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  React.useEffect(() => {
    if (open) {
      setForm(DEFAULTS);
      setTagInput("");
    }
  }, [open]);

  const uploadFee = UPLOAD_FEES[sub.tier] ?? UPLOAD_FEES.free;
  const canAffordFee = (wallet?.balance || 0) >= uploadFee;
  const feeShortfall = Math.max(0, uploadFee - (wallet?.balance || 0));

  const categoryMeta = TAVERN_CATEGORIES.find((c) => c.value === form.category) || TAVERN_CATEGORIES[0];

  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!form.category) return "Category is required.";
    if (!form.preview_image_url.trim()) return "A preview image URL is required.";
    if (!form.file_url.trim()) return "An asset file URL is required.";
    if (form.price < MIN_ITEM_PRICE) return `Minimum price is ${formatSpice(MIN_ITEM_PRICE)} Spice.`;
    return null;
  };

  const submit = useMutation({
    mutationFn: async () => {
      const err = validate();
      if (err) throw new Error(err);
      if (!canAffordFee) throw new Error(`You need ${formatSpice(feeShortfall)} more Spice to list this item.`);

      const r = await uploadItem({
        creatorId: user.id,
        creatorTier: sub.tier,
        form: {
          ...form,
          tags: form.tags.map((t) => t.trim()).filter(Boolean),
        },
      });
      if (!r.success) throw new Error(r.reason || "Upload failed.");
      return r;
    },
    onSuccess: () => {
      toast.success("Listing live — good luck!");
      queryClient.invalidateQueries({ queryKey: ["spiceWallet", user.id] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Upload failed."),
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (form.tags.includes(t)) return;
    set({ tags: [...form.tags, t] });
    setTagInput("");
  };

  const removeTag = (t) => set({ tags: form.tags.filter((x) => x !== t) });

  const addPreviewUrl = (url) => {
    const u = url.trim();
    if (!u) return;
    if (form.preview_images.length >= 4) {
      toast.error("Up to 4 additional previews.");
      return;
    }
    set({ preview_images: [...form.preview_images, u] });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#37F2D1]" />
            Sell on the Tavern
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            List a cosmetic for the community. Upload fees vary by subscription tier.
          </DialogDescription>
        </DialogHeader>

        <FeeBanner tier={sub.tier} uploadFee={uploadFee} balance={wallet?.balance || 0} shortfall={feeShortfall} />

        <div className="space-y-4">
          <Field label="Item Name" required>
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white"
              placeholder="e.g. Midnight Obsidian Dice"
            />
          </Field>

          <Field label="Category" required>
            <Select value={form.category} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAVERN_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500 mt-1">Expected asset: {categoryMeta.fileHint}</p>
          </Field>

          {form.category === "dice_skin" && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
              <Dices className="w-4 h-4 text-amber-300 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-amber-100 font-bold mb-1">Use the Dice Skin Creator</p>
                <p className="text-[11px] text-amber-100/80 mb-2">
                  The in-app painter handles colors, material presets, lighting, and custom textures — with a live 3D preview.
                  Skin data and the preview image are generated for you.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { onClose?.(); setDiceCreatorOpen(true); }}
                  className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
                >
                  Open Dice Skin Creator
                </Button>
              </div>
            </div>
          )}

          {form.category === "ui_theme" && (
            <div className="bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-lg p-3 flex items-start gap-3">
              <Palette className="w-4 h-4 text-[#37F2D1] mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-[#37F2D1] font-bold mb-1">Use the UI Theme Builder</p>
                <p className="text-[11px] text-slate-200 mb-2">
                  Pick a starter palette, tweak colors, type any Google Font name — and save straight to the Tavern.
                  The live preview and listing thumbnail are generated for you.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { onClose?.(); setThemeBuilderOpen(true); }}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                >
                  Open Theme Builder
                </Button>
              </div>
            </div>
          )}

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={4}
              className="bg-[#050816] border-slate-700 text-white"
              placeholder="What makes this cosmetic special?"
            />
          </Field>

          <Field label="Preview Image URL" required>
            <Input
              value={form.preview_image_url}
              onChange={(e) => set({ preview_image_url: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white"
              placeholder="https://…"
            />
            <p className="text-[11px] text-slate-500 mt-1">Shown on cards and carousels.</p>
          </Field>

          <Field label="Additional Previews (up to 4)">
            <PreviewUrlAdder onAdd={addPreviewUrl} />
            {form.preview_images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.preview_images.map((url, i) => (
                  <span key={i} className="bg-[#050816] border border-slate-700 text-[11px] text-slate-300 rounded px-2 py-1 flex items-center gap-1">
                    {url.length > 28 ? url.slice(0, 28) + "…" : url}
                    <button
                      type="button"
                      onClick={() => set({ preview_images: form.preview_images.filter((_, idx) => idx !== i) })}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Asset File URL" required>
            <Input
              value={form.file_url}
              onChange={(e) => set({ file_url: e.target.value })}
              className="bg-[#050816] border-slate-700 text-white"
              placeholder={categoryMeta.fileHint}
            />
          </Field>

          <Field label={`Price (Spice, min ${formatSpice(MIN_ITEM_PRICE)})`} required>
            <Input
              type="number"
              min={MIN_ITEM_PRICE}
              step="25"
              value={form.price}
              onChange={(e) => set({ price: Math.max(0, Number(e.target.value) || 0) })}
              className="bg-[#050816] border-slate-700 text-white"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              ~${(form.price / 250).toFixed(2)} USD. Subscribers get an automatic discount at checkout.
            </p>
          </Field>

          <Field label="Tags">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                }}
                className="bg-[#050816] border-slate-700 text-white"
                placeholder="fantasy, dark, wood…"
              />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <span key={t} className="text-[11px] bg-[#050816] border border-slate-700 text-slate-300 rounded px-2 py-0.5 flex items-center gap-1">
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} className="text-slate-500 hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !canAffordFee}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
          >
            {submit.isPending
              ? "Listing…"
              : canAffordFee
              ? uploadFee > 0
                ? `List Item — ${formatSpice(uploadFee)} Spice`
                : "List Item"
              : `Need ${formatSpice(feeShortfall)} more Spice`}
          </Button>
        </DialogFooter>
      </DialogContent>
      <DiceSkinCreator open={diceCreatorOpen} onClose={() => setDiceCreatorOpen(false)} />
      <ThemeBuilder open={themeBuilderOpen} onClose={() => setThemeBuilderOpen(false)} />
    </Dialog>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <Label className="text-xs text-slate-300 mb-1 block">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FeeBanner({ tier, uploadFee, balance, shortfall }) {
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (uploadFee === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
        <SpiceIcon size={16} color="#6ee7b7" />
        <p className="text-[12px] text-emerald-100">
          Upload fee: <strong>Waived</strong> for your {tierName} tier.
        </p>
      </div>
    );
  }
  if (shortfall > 0) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
        <p className="text-[12px] text-rose-100">
          Upload fee: <strong>{formatSpice(uploadFee)} Spice</strong> (${(uploadFee / 250).toFixed(2)}). You need
          <strong> {formatSpice(shortfall)} more Spice</strong> to list this item.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
      <SpiceIcon size={16} color="#fcd34d" />
      <p className="text-[12px] text-amber-100">
        Upload fee: <strong>{formatSpice(uploadFee)} Spice</strong> (${(uploadFee / 250).toFixed(2)}) for your {tierName} tier.
        Wallet balance: {formatSpice(balance)}.
      </p>
    </div>
  );
}

function PreviewUrlAdder({ onAdd }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onAdd(v); setV(""); }
        }}
        className="bg-[#050816] border-slate-700 text-white"
        placeholder="https://…"
      />
      <Button type="button" variant="outline" onClick={() => { onAdd(v); setV(""); }}>Add</Button>
    </div>
  );
}
