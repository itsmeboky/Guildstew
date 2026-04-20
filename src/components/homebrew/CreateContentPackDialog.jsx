import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, Save, Lock, Globe, Package,
  Skull, Swords, Wand2, Stars,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useSubscription } from "@/lib/SubscriptionContext";
import { tierAtLeast } from "@/api/billingClient";
import {
  BLANK_CONTENT_PACK,
  computeContentCounts,
  contentPackSummary,
} from "@/lib/breweryContentPack";
import {
  CustomItemForm,
  CustomMonsterForm,
  CustomSpellForm,
  CustomClassFeatureForm,
  BLANK_ITEM,
  BLANK_MONSTER,
  BLANK_SPELL,
  BLANK_CLASS_FEATURE,
  buildItemModifications,
  buildMonsterModifications,
  buildSpellModifications,
  buildClassFeatureModifications,
} from "./CreateHomebrewDialog";

/**
 * Content Pack creator.
 *
 * Bundles pre-made monsters / items / spells / class features
 * into a single installable Brewery mod. The creation forms are
 * re-exported from CreateHomebrewDialog so authors get the exact
 * same editors they'd see building campaign-level homebrew — the
 * only difference is where the saved object lands (pack metadata
 * vs. campaign table).
 *
 * Layout: identity block, then a four-tab list (Monsters / Items
 * / Spells / Features). Each tab shows the pack's current
 * entries with edit + remove; adding opens a secondary dialog
 * with the reused form. A preview block at the bottom summarizes
 * the pack; the footer has Draft / Private / Publish saves.
 */

const TAB_META = {
  monsters: { label: "Monsters",  icon: Skull, singular: "monster" },
  items:    { label: "Items",     icon: Swords, singular: "item" },
  spells:   { label: "Spells",    icon: Wand2, singular: "spell" },
  class_features: { label: "Features", icon: Stars, singular: "feature" },
};

function cloneBlankPack() {
  return JSON.parse(JSON.stringify(BLANK_CONTENT_PACK));
}

export default function CreateContentPackDialog({ open, onClose, mod = null }) {
  const [formData, setFormData] = useState(cloneBlankPack);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameSystem, setGameSystem] = useState("dnd5e");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [activeTab, setActiveTab] = useState("monsters");
  const [entryEditor, setEntryEditor] = useState(null); // { bucket, index | null }
  const queryClient = useQueryClient();
  const sub = useSubscription();
  const canPublish = tierAtLeast(sub?.tier || "free", "veteran");
  const isEdit = !!mod?.id;

  React.useEffect(() => {
    if (!open) return;
    if (mod) {
      const meta = mod.metadata || {};
      setFormData({ ...cloneBlankPack(), ...meta });
      setName(mod.name || "");
      setDescription(meta.description || "");
      setGameSystem(mod.game_system || "dnd5e");
      setTags(Array.isArray(meta.tags) ? meta.tags : []);
    } else {
      setFormData(cloneBlankPack());
      setName("");
      setDescription("");
      setGameSystem("dnd5e");
      setTags([]);
    }
    setTagDraft("");
    setActiveTab("monsters");
    setEntryEditor(null);
  }, [open, mod]);

  const addEntry   = (bucket) => setEntryEditor({ bucket, index: null });
  const editEntry  = (bucket, index) => setEntryEditor({ bucket, index });
  const closeEntry = () => setEntryEditor(null);

  const saveEntry = (bucket, entry) => {
    setFormData((f) => {
      const next = { ...f };
      const list = Array.isArray(next.contents?.[bucket]) ? [...next.contents[bucket]] : [];
      if (entryEditor?.index == null) list.push(entry);
      else list[entryEditor.index] = entry;
      next.contents = { ...(next.contents || {}), [bucket]: list };
      return next;
    });
    closeEntry();
  };

  const removeEntry = (bucket, index) => {
    setFormData((f) => {
      const next = { ...f };
      const list = Array.isArray(next.contents?.[bucket]) ? [...next.contents[bucket]] : [];
      list.splice(index, 1);
      next.contents = { ...(next.contents || {}), [bucket]: list };
      return next;
    });
  };

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) { setTagDraft(""); return; }
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  const counts = computeContentCounts(formData.contents);
  const summary = contentPackSummary({ content_counts: counts, contents: formData.contents });

  const saveMutation = useMutation({
    mutationFn: async ({ mode }) => {
      const finalName = (name || "").trim();
      if (!finalName) throw new Error("Pack name is required");
      const isDraft      = mode === "draft";
      const isPublishing = mode === "publish";
      if (isPublishing && !canPublish) {
        throw new Error("Publishing to the Brewery requires a Veteran subscription");
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Not authenticated");
      const userId = authData.user.id;

      const slug = finalName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const metadata = {
        mod_type: "content_pack",
        name: finalName,
        description: (description || "").trim(),
        image_url: formData.image_url || "",
        tags,
        contents: formData.contents || { monsters: [], items: [], spells: [], class_features: [] },
        content_counts: computeContentCounts(formData.contents),
      };
      const payload = {
        name: finalName,
        slug,
        description: (description || "").trim(),
        mod_type: "content_pack",
        game_system: gameSystem || "dnd5e",
        creator_id: userId,
        creator_tier: sub?.tier || "free",
        metadata,
        // Content packs don't patch rule trees — the install path
        // copies the bundled entries into the campaign tables.
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
    onError: (err) => toast.error(err?.message || "Failed to save content pack"),
  });

  return (
    <>
      <Dialog open={open && !entryEditor} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
        <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mod ? "Edit Content Pack" : "Create Content Pack"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Bundle pre-made monsters, items, spells, and class features for others to install
              into their campaigns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <Section title="Identity">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Pack Name" required>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Arctic Bestiary"
                    className="bg-[#050816] border-slate-700 text-white"
                  />
                </Field>
                <Field label="Game System">
                  <Input
                    value={gameSystem}
                    onChange={(e) => setGameSystem(e.target.value)}
                    placeholder="dnd5e"
                    className="bg-[#050816] border-slate-700 text-white"
                  />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tell GMs what's in the pack and what it's for."
                  className="bg-[#050816] border-slate-700 text-white"
                />
              </Field>
              <Field label="Cover Image URL">
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://…"
                  className="bg-[#050816] border-slate-700 text-white"
                />
              </Field>
              <Field label="Tags">
                <div className="flex gap-2 items-center">
                  <Input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="arctic, horror, low-level"
                    className="bg-[#050816] border-slate-700 text-white flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((t) => (
                      <Badge key={t} className="bg-[#37F2D1]/15 text-[#37F2D1] border border-[#37F2D1]/30 text-[10px] flex items-center gap-1">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:text-red-300">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            </Section>

            <Section title="Contents">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-[#050816] border border-slate-700">
                  {Object.entries(TAB_META).map(([bucket, meta]) => {
                    const Icon = meta.icon;
                    const count = (formData.contents?.[bucket] || []).length;
                    return (
                      <TabsTrigger
                        key={bucket}
                        value={bucket}
                        className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#050816]"
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {meta.label} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {Object.entries(TAB_META).map(([bucket, meta]) => (
                  <TabsContent key={bucket} value={bucket} className="pt-3">
                    <EntryList
                      bucket={bucket}
                      meta={meta}
                      entries={formData.contents?.[bucket] || []}
                      onAdd={() => addEntry(bucket)}
                      onEdit={(idx) => editEntry(bucket, idx)}
                      onRemove={(idx) => removeEntry(bucket, idx)}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </Section>

            <Section title="Preview">
              <div className="bg-[#050816] border border-slate-700 rounded-lg p-4 flex items-center gap-3">
                <Package className="w-8 h-8 text-[#37F2D1]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {name || "Untitled Pack"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {summary || "Empty pack — add content in the tabs above."}
                  </p>
                </div>
              </div>
            </Section>
          </div>

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
        </DialogContent>
      </Dialog>

      {/* Secondary dialog for the reused per-entry form. */}
      <EntryEditorDialog
        editor={entryEditor}
        initial={entryEditor ? (formData.contents?.[entryEditor.bucket]?.[entryEditor.index] ?? null) : null}
        onClose={closeEntry}
        onSave={(entry) => saveEntry(entryEditor.bucket, entry)}
      />
    </>
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

function EntryList({ bucket, meta, entries, onAdd, onEdit, onRemove }) {
  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          No {meta.label.toLowerCase()} yet. Click "Add {meta.label.slice(0, -1)}" to create the first entry.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry, idx) => (
            <li key={idx} className="bg-[#050816] border border-slate-700 rounded-lg p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{entry?.name || `(unnamed ${meta.singular})`}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {entrySummary(bucket, entry)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEdit(idx)}
                className="p-1 text-slate-400 hover:text-white"
                title={`Edit ${meta.singular}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="p-1 text-red-400 hover:text-red-300"
                title={`Remove ${meta.singular}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="w-3 h-3 mr-1" /> Add {meta.label.slice(0, -1)}
      </Button>
    </div>
  );
}

function entrySummary(bucket, entry) {
  if (!entry) return "";
  if (bucket === "monsters") {
    return [entry.size, entry.creature_type, entry.cr != null ? `CR ${entry.cr}` : null].filter(Boolean).join(" · ");
  }
  if (bucket === "items") {
    return [entry.type, entry.rarity].filter(Boolean).join(" · ");
  }
  if (bucket === "spells") {
    return [entry.level != null ? `Level ${entry.level}` : null, entry.school].filter(Boolean).join(" · ");
  }
  if (bucket === "class_features") {
    return [entry.type, entry.level != null ? `Level ${entry.level}` : null].filter(Boolean).join(" · ");
  }
  return "";
}

// ──────────────────────── Entry editor dialog ────────────────────

function EntryEditorDialog({ editor, initial, onClose, onSave }) {
  if (!editor) return null;
  return (
    <Dialog open={!!editor} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit" : "Add"} {TAB_META[editor.bucket].singular}
          </DialogTitle>
        </DialogHeader>
        <EntryEditorBody
          bucket={editor.bucket}
          initial={initial}
          onCancel={onClose}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

function EntryEditorBody({ bucket, initial, onCancel, onSave }) {
  // Route to the right reused form for the bucket. Each form owns
  // its own state tree shape; the serializer produces the
  // database-ready record.
  if (bucket === "monsters") {
    const [monster, setMonster] = React.useState(initial || BLANK_MONSTER);
    return (
      <EntryShell onCancel={onCancel} onSave={() => onSave(buildMonsterModifications(monster))}>
        <CustomMonsterForm monster={monster} setMonster={setMonster} />
      </EntryShell>
    );
  }
  if (bucket === "items") {
    const [item, setItem] = React.useState(initial || BLANK_ITEM);
    return (
      <EntryShell onCancel={onCancel} onSave={() => onSave(buildItemModifications(item))}>
        <CustomItemForm item={item} setItem={setItem} />
      </EntryShell>
    );
  }
  if (bucket === "spells") {
    const [spell, setSpell] = React.useState(initial || BLANK_SPELL);
    return (
      <EntryShell onCancel={onCancel} onSave={() => onSave(buildSpellModifications(spell))}>
        <CustomSpellForm spell={spell} setSpell={setSpell} />
      </EntryShell>
    );
  }
  if (bucket === "class_features") {
    const [feature, setFeature] = React.useState(initial || BLANK_CLASS_FEATURE);
    return (
      <EntryShell onCancel={onCancel} onSave={() => onSave(buildClassFeatureModifications(feature))}>
        <CustomClassFeatureForm feature={feature} setFeature={setFeature} />
      </EntryShell>
    );
  }
  return null;
}

function EntryShell({ children, onCancel, onSave }) {
  return (
    <div className="space-y-4">
      {children}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          type="button"
          onClick={onSave}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          Save Entry
        </Button>
      </DialogFooter>
    </div>
  );
}
