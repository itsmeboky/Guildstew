import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package, Plus, Edit3, ExternalLink, Trash2, X,
  Upload as UploadIcon, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { uploadFile } from "@/utils/uploadFile";
import { BUCKETS } from "@/config/storageConfig";
import { useAuth } from "@/lib/AuthContext";

// Game Pack Listings — admin CRUD for the marketing/presentation layer.
//
// Two views: a list of all listings, and an editor with three tabs at
// the top (Basics | Content | Theme). Tabs 1+2 are implemented; Theme
// is a stub for now — edit theme_tokens via SQL or use a seeded preset
// until the visual editor lands.

const FORM_TAB_BASICS = "basics";
const FORM_TAB_CONTENT = "content";
const FORM_TAB_THEME = "theme";

const STATUSES = ["draft", "published", "hidden"];

const IMAGE_FIELDS = [
  { key: "hero_image_path",            label: "Hero image",          dims: "1600×800" },
  { key: "pack_feature_1_image_path",  label: "Pack feature 1 image", dims: "800×500"  },
  { key: "pack_feature_2_image_path",  label: "Pack feature 2 image", dims: "800×500"  },
  { key: "theme_dice_image_path",      label: "Theme + dice image",   dims: "800×600"  },
  { key: "book_cover_image_path",      label: "Book cover image",     dims: "600×800"  },
];

function emptyListing() {
  return {
    game_pack_id: "",
    slug: "",
    display_name: "",
    subtitle: "",
    genre_tag: "",
    publisher_name: "",
    publisher_origin: "",
    status: "draft",
    price_cents: null,
    stripe_price_id: "",
    hero_image_path: "",
    pack_feature_1_image_path: "",
    pack_feature_2_image_path: "",
    theme_dice_image_path: "",
    book_cover_image_path: "",
    hero_pull_quote: "",
    about_paragraphs: [""],
    pack_feature_1_title: "",
    pack_feature_1_body: "",
    pack_feature_2_title: "",
    pack_feature_2_body: "",
    theme_section_header: "",
    theme_section_tagline: "",
    theme_section_body: "",
    book_section_header: "",
    book_section_tagline: "",
    book_section_body: "",
    book_cta_label: "",
    book_purchase_url: "",
    cta_primary_label: "Buy Pack",
    cta_secondary_label: "Preview",
    theme_tokens: {},
  };
}

function formatPrice(cents) {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function GamePackListingsTab() {
  const [editing, setEditing] = useState(null);

  if (editing) {
    return (
      <ListingEditor
        listing={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    );
  }

  return <ListingsList onEdit={setEditing} />;
}

function ListingsList({ onEdit }) {
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["adminGamePackListings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_pack_listings")
        .select(
          "id, slug, display_name, status, price_cents, updated_at, game_pack_id",
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("game_pack_listings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing deleted");
      queryClient.invalidateQueries({ queryKey: ["adminGamePackListings"] });
    },
    onError: (err) => toast.error(`Delete failed: ${err?.message || err}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#37F2D1]" /> Game Packs
          </h2>
          <p className="text-xs text-slate-500">
            Marketing-side listings for the Tavern product pages. Edit copy and
            imagery here; theme tokens are edited via SQL for now.
          </p>
        </div>
        <Button
          onClick={() => onEdit(emptyListing())}
          className="bg-[#37F2D1] text-[#050816] hover:bg-[#37F2D1]/90"
        >
          <Plus className="w-4 h-4 mr-1" /> New Pack Listing
        </Button>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0b1220] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#1E2430] text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="text-left p-3">Display Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Updated</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading…</td></tr>
            )}
            {!isLoading && listings.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">No listings yet.</td></tr>
            )}
            {listings.map((l) => (
              <tr key={l.id} className="border-t border-[#1e293b] text-slate-200">
                <td className="p-3 font-bold">{l.display_name}</td>
                <td className="p-3 font-mono text-xs text-slate-400">{l.slug}</td>
                <td className="p-3">
                  <span
                    className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${
                      l.status === "published"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : l.status === "hidden"
                          ? "bg-slate-500/20 text-slate-300"
                          : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="p-3 text-slate-300">{formatPrice(l.price_cents)}</td>
                <td className="p-3 text-xs text-slate-500">
                  {l.updated_at ? new Date(l.updated_at).toLocaleString() : "—"}
                </td>
                <td className="p-3 text-right space-x-1">
                  <a
                    href={`/tavern/packs/${l.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-[#37F2D1] px-2 py-1 rounded border border-[#1e293b]"
                  >
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(l)}
                    className="h-7 text-xs"
                  >
                    <Edit3 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(`Delete listing "${l.display_name}"? This cannot be undone.`)) {
                        del.mutate(l.id);
                      }
                    }}
                    className="h-7 text-xs text-red-400 border-red-400/30"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListingEditor({ listing, onCancel, onSaved }) {
  const queryClient = useQueryClient();
  const isNew = !listing.id;
  const [tab, setTab] = useState(FORM_TAB_BASICS);
  const [form, setForm] = useState(() => ({
    ...emptyListing(),
    ...listing,
    about_paragraphs: Array.isArray(listing.about_paragraphs) && listing.about_paragraphs.length > 0
      ? listing.about_paragraphs
      : [""],
  }));

  // When the editor opens with a sparse list-row payload, fetch the
  // full record so all fields populate.
  const { data: full } = useQuery({
    queryKey: ["adminGamePackListingFull", listing.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_pack_listings")
        .select("*")
        .eq("id", listing.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!listing.id,
  });

  React.useEffect(() => {
    if (full) {
      setForm({
        ...emptyListing(),
        ...full,
        about_paragraphs: Array.isArray(full.about_paragraphs) && full.about_paragraphs.length > 0
          ? full.about_paragraphs
          : [""],
      });
    }
  }, [full]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = useMutation({
    mutationFn: async () => {
      // Strip any empty about_paragraphs entries before save.
      const payload = {
        ...form,
        about_paragraphs: (form.about_paragraphs || []).map((p) => (p || "").trim()).filter(Boolean),
        // Coerce empty strings to null on optional scalar columns.
        subtitle: form.subtitle || null,
        genre_tag: form.genre_tag || null,
        publisher_name: form.publisher_name || null,
        publisher_origin: form.publisher_origin || null,
        stripe_price_id: form.stripe_price_id || null,
        price_cents: form.price_cents === "" || form.price_cents == null ? null : Number(form.price_cents),
      };

      if (isNew) {
        if (!payload.game_pack_id) throw new Error("Game pack is required.");
        if (!payload.slug) throw new Error("Slug is required.");
        if (!payload.display_name) throw new Error("Display name is required.");
        const { error } = await supabase.from("game_pack_listings").insert(payload);
        if (error) throw error;
      } else {
        const { id, created_at, updated_at, ...rest } = payload;
        const { error } = await supabase
          .from("game_pack_listings")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Listing saved");
      queryClient.invalidateQueries({ queryKey: ["adminGamePackListings"] });
      queryClient.invalidateQueries({ queryKey: ["gamePackListings"] });
      queryClient.invalidateQueries({ queryKey: ["gamePackListing", form.slug] });
      onSaved();
    },
    onError: (err) => {
      console.error("Save game pack listing", err);
      toast.error(`Save failed: ${err?.message || err}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">
            {isNew ? "New Pack Listing" : `Editing: ${form.display_name || form.slug}`}
          </h2>
          <p className="text-xs text-slate-500">
            Save commits all tabs at once. Switching tabs preserves entries.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" /> Close
        </Button>
      </div>

      <div className="border-b border-[#1e293b] flex gap-2">
        {[
          { id: FORM_TAB_BASICS,  label: "Basics" },
          { id: FORM_TAB_CONTENT, label: "Content" },
          { id: FORM_TAB_THEME,   label: "Theme" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              tab === t.id
                ? "border-[#37F2D1] text-[#37F2D1]"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0b1220] p-6">
        {tab === FORM_TAB_BASICS && <BasicsTab form={form} setField={setField} />}
        {tab === FORM_TAB_CONTENT && <ContentTab form={form} setField={setField} setForm={setForm} />}
        {tab === FORM_TAB_THEME && <ThemeStubTab form={form} />}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-[#37F2D1] text-[#050816] hover:bg-[#37F2D1]/90"
        >
          {save.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          {isNew ? "Create Listing" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function BasicsTab({ form, setField }) {
  const { data: gamePacks = [] } = useQuery({
    queryKey: ["adminGamePacksList"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_packs")
        .select("id, slug, name")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Game pack" required>
        <Select
          value={form.game_pack_id || ""}
          onValueChange={(v) => setField("game_pack_id", v)}
        >
          <SelectTrigger className="bg-[#0b1220] border-[#1e293b] text-white">
            <SelectValue placeholder="Select pack…" />
          </SelectTrigger>
          <SelectContent>
            {gamePacks.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Status" required>
        <Select value={form.status} onValueChange={(v) => setField("status", v)}>
          <SelectTrigger className="bg-[#0b1220] border-[#1e293b] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Display name" required>
        <Input value={form.display_name || ""} onChange={(e) => setField("display_name", e.target.value)} />
      </Field>

      <Field label="Slug" required hint="URL: /tavern/packs/{slug}">
        <Input
          value={form.slug || ""}
          onChange={(e) => setField("slug", e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}
        />
      </Field>

      <Field label="Subtitle" hint="e.g., Fifth Edition">
        <Input value={form.subtitle || ""} onChange={(e) => setField("subtitle", e.target.value)} />
      </Field>

      <Field label="Genre tag" hint="e.g., Heroic fantasy">
        <Input value={form.genre_tag || ""} onChange={(e) => setField("genre_tag", e.target.value)} />
      </Field>

      <Field label="Publisher name">
        <Input value={form.publisher_name || ""} onChange={(e) => setField("publisher_name", e.target.value)} />
      </Field>

      <Field label="Publisher origin" hint="e.g., Stockholm">
        <Input value={form.publisher_origin || ""} onChange={(e) => setField("publisher_origin", e.target.value)} />
      </Field>

      <Field label="Price (cents)" hint="Leave blank for free. 799 = $7.99">
        <Input
          type="number"
          min="0"
          value={form.price_cents == null ? "" : form.price_cents}
          onChange={(e) => setField("price_cents", e.target.value === "" ? null : Number(e.target.value))}
        />
      </Field>

      <Field label="Stripe price ID">
        <Input value={form.stripe_price_id || ""} onChange={(e) => setField("stripe_price_id", e.target.value)} />
      </Field>
    </div>
  );
}

function ContentTab({ form, setField, setForm }) {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeading title="Imagery" hint="Files upload to user-assets / pack-listings/{slug}/" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {IMAGE_FIELDS.map((f) => (
            <ImageUploadField
              key={f.key}
              label={f.label}
              dims={f.dims}
              slug={form.slug}
              fieldKey={f.key}
              path={form[f.key]}
              onChange={(p) => setField(f.key, p)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Hero copy" />
        <Field label="Hero pull quote" hint="The italic narrative paragraph at the top.">
          <Textarea
            rows={3}
            value={form.hero_pull_quote || ""}
            onChange={(e) => setField("hero_pull_quote", e.target.value)}
          />
        </Field>
      </section>

      <section>
        <SectionHeading title="About paragraphs" hint="3–4 paragraphs, max 5." />
        <ParagraphsEditor
          values={form.about_paragraphs || [""]}
          onChange={(vals) => setForm((f) => ({ ...f, about_paragraphs: vals }))}
        />
      </section>

      <section>
        <SectionHeading title="Pack contents" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Feature 1 title">
            <Input value={form.pack_feature_1_title || ""} onChange={(e) => setField("pack_feature_1_title", e.target.value)} />
          </Field>
          <Field label="Feature 2 title">
            <Input value={form.pack_feature_2_title || ""} onChange={(e) => setField("pack_feature_2_title", e.target.value)} />
          </Field>
          <Field label="Feature 1 body">
            <Textarea rows={4} value={form.pack_feature_1_body || ""} onChange={(e) => setField("pack_feature_1_body", e.target.value)} />
          </Field>
          <Field label="Feature 2 body">
            <Textarea rows={4} value={form.pack_feature_2_body || ""} onChange={(e) => setField("pack_feature_2_body", e.target.value)} />
          </Field>
        </div>
      </section>

      <section>
        <SectionHeading title="Theme + dice section" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Header (kicker)">
            <Input value={form.theme_section_header || ""} onChange={(e) => setField("theme_section_header", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={form.theme_section_tagline || ""} onChange={(e) => setField("theme_section_tagline", e.target.value)} />
          </Field>
          <Field label="Body" className="md:col-span-2">
            <Textarea rows={3} value={form.theme_section_body || ""} onChange={(e) => setField("theme_section_body", e.target.value)} />
          </Field>
        </div>
      </section>

      <section>
        <SectionHeading title="Book section" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Header (kicker)">
            <Input value={form.book_section_header || ""} onChange={(e) => setField("book_section_header", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={form.book_section_tagline || ""} onChange={(e) => setField("book_section_tagline", e.target.value)} />
          </Field>
          <Field label="Body" className="md:col-span-2">
            <Textarea rows={3} value={form.book_section_body || ""} onChange={(e) => setField("book_section_body", e.target.value)} />
          </Field>
          <Field label="Book CTA label">
            <Input value={form.book_cta_label || ""} onChange={(e) => setField("book_cta_label", e.target.value)} />
          </Field>
          <Field label="Book purchase URL">
            <Input value={form.book_purchase_url || ""} onChange={(e) => setField("book_purchase_url", e.target.value)} />
          </Field>
        </div>
      </section>

      <section>
        <SectionHeading title="CTA labels" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Primary CTA label">
            <Input value={form.cta_primary_label || ""} onChange={(e) => setField("cta_primary_label", e.target.value)} />
          </Field>
          <Field label="Secondary CTA label">
            <Input value={form.cta_secondary_label || ""} onChange={(e) => setField("cta_secondary_label", e.target.value)} />
          </Field>
        </div>
      </section>
    </div>
  );
}

function ThemeStubTab({ form }) {
  return (
    <div className="text-sm text-slate-300 space-y-3">
      <p>
        Theme editor coming soon — for now, edit{" "}
        <code className="bg-[#1E2430] px-1 rounded">theme_tokens</code> via SQL
        or use the seeded presets.
      </p>
      <details className="bg-[#1E2430] rounded p-3">
        <summary className="cursor-pointer text-xs uppercase tracking-widest text-slate-400">
          Current theme_tokens
        </summary>
        <pre className="mt-2 text-xs text-slate-300 overflow-auto">
          {JSON.stringify(form.theme_tokens || {}, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function ParagraphsEditor({ values, onChange }) {
  const max = 5;
  const set = (i, v) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  const add = () => {
    if (values.length >= max) return;
    onChange([...values, ""]);
  };
  const remove = (i) => {
    if (values.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(values.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      {values.map((p, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Textarea
            rows={3}
            value={p}
            onChange={(e) => set(i, e.target.value)}
            placeholder={`Paragraph ${i + 1}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => remove(i)}
            className="h-9 px-2 text-red-400 border-red-400/30"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
      {values.length < max && (
        <Button
          type="button"
          variant="outline"
          onClick={add}
          className="text-xs"
        >
          <Plus className="w-3 h-3 mr-1" /> Add paragraph
        </Button>
      )}
    </div>
  );
}

function ImageUploadField({ label, dims, slug, fieldKey, path, onChange }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const inputRef = React.useRef(null);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!slug) {
      toast.error("Set a slug on the Basics tab before uploading.");
      return;
    }
    setBusy(true);
    try {
      const result = await uploadFile(file, BUCKETS.USER, `pack-listings/${slug}/${fieldKey}`, {
        userId: user?.id,
        uploadType: "general",
      });
      onChange(result.path);
      toast.success(`${label} uploaded`);
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(`Upload failed: ${err?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const publicUrl = path
    ? supabase.storage.from(BUCKETS.USER).getPublicUrl(path).data?.publicUrl
    : null;

  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-slate-400 mb-2 block">
        {label} <span className="text-slate-600 normal-case lowercase">· {dims}</span>
      </Label>
      <div className="flex items-start gap-3">
        <div
          className="w-28 h-20 rounded border border-[#1e293b] bg-[#0b1220] flex items-center justify-center overflow-hidden flex-shrink-0"
        >
          {publicUrl ? (
            <img src={publicUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">none</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UploadIcon className="w-3 h-3 mr-1" />}
              {path ? "Replace" : "Upload"}
            </Button>
            {path && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange("")}
                className="text-red-400 border-red-400/30"
              >
                Clear
              </Button>
            )}
          </div>
          {path && (
            <p className="text-[10px] font-mono text-slate-500 truncate">{path}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children, className = "" }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-widest text-slate-400 mb-1 block">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function SectionHeading({ title, hint }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}
