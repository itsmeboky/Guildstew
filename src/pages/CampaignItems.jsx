import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Upload, Package, Search } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { safeText } from "@/utils/safeRender";

/**
 * Campaign Items tab. Split-panel layout: the selected item on the
 * left, a filterable merged list on the right. SRD items come from
 * dnd5e_items (the shared reference table); homebrew items come from
 * the per-campaign campaign_items table. Each row is tagged with
 * _source so the two render side by side with distinct badges.
 *
 * All rendering is routed through the safe helpers because the
 * reseeded SRD data stores `properties`, `damage`, and
 * `armor_class` as JSONB objects — rendering them directly crashes
 * React.
 */

const RARITY_OPTIONS = [
  { value: "all",       label: "Any rarity" },
  { value: "common",    label: "Common" },
  { value: "uncommon",  label: "Uncommon" },
  { value: "rare",      label: "Rare" },
  { value: "very_rare", label: "Very Rare" },
  { value: "legendary", label: "Legendary" },
  { value: "artifact",  label: "Artifact" },
];

const SOURCE_OPTIONS = [
  { value: "all",      label: "All sources" },
  { value: "srd",      label: "SRD" },
  { value: "homebrew", label: "Homebrew" },
];

// Delegate to the shared safeText helper so every render site in the
// app goes through the same coercion — see src/utils/safeRender.js.
const safeString = safeText;

/**
 * Item-field accessors. The reseeded dnd5e_items rows store the raw
 * D&D 5e API record under `properties._raw` and hoist the handful of
 * fields we display to top-level keys inside `properties`. Homebrew
 * items usually have the same shape flattened onto the row itself.
 * Each accessor walks both paths so the UI stays consistent across
 * sources.
 */
function getItemCost(item) {
  const top = item?.cost;
  if (typeof top === "string" && top.trim()) return top;
  if (top && typeof top === "object" && (top.quantity != null || top.unit)) {
    return `${top.quantity ?? ""} ${top.unit ?? ""}`.trim() || "—";
  }
  const raw = item?.properties?._raw;
  if (raw?.cost?.quantity != null) {
    return `${raw.cost.quantity} ${raw.cost.unit ?? ""}`.trim() || "—";
  }
  return "—";
}

function getItemWeight(item) {
  const w1 = item?.properties?.weight;
  if (w1 != null && w1 !== "") return `${w1} lb.`;
  const w2 = item?.properties?._raw?.weight;
  if (w2 != null && w2 !== "") return `${w2} lb.`;
  const w3 = item?.weight;
  if (w3 != null && w3 !== "") return `${w3} lb.`;
  return "—";
}

function getItemPropertiesList(item) {
  const p1 = item?.properties?.properties;
  if (Array.isArray(p1) && p1.length) {
    return p1.map((p) => (typeof p === "string" ? p : safeString(p?.name || p))).filter(Boolean);
  }
  const p2 = item?.properties?._raw?.properties;
  if (Array.isArray(p2) && p2.length) {
    return p2.map((p) => safeString(p?.name || p)).filter(Boolean);
  }
  return [];
}

function getItemDamage(item) {
  const d = item?.properties?.damage;
  if (d && (d.dice || d.type)) return [d.dice, d.type].filter(Boolean).join(" ");
  const r = item?.properties?._raw?.damage;
  if (r && (r.damage_dice || r.damage_type)) {
    return [r.damage_dice, r.damage_type?.name].filter(Boolean).join(" ");
  }
  const flat = item?.damage;
  if (typeof flat === "string" && flat.trim()) return flat;
  return null;
}

function getItemArmorClass(item) {
  const format = (ac) =>
    `AC ${ac.base}${ac.dex_bonus ? " + DEX" : ""}${ac.max_bonus ? ` (max ${ac.max_bonus})` : ""}`;
  const a1 = item?.properties?.armor_class;
  if (a1?.base != null) return format(a1);
  const a2 = item?.properties?._raw?.armor_class;
  if (a2?.base != null) return format(a2);
  const a3 = item?.armor_class ?? item?.armorClass;
  if (a3 && typeof a3 === "object" && a3.base != null) return format(a3);
  if (typeof a3 === "number") return `AC ${a3}`;
  return null;
}

function getItemRange(item) {
  const fmt = (r) => `${r.normal ?? "—"}/${r.long ?? "—"} ft.`;
  const r1 = item?.properties?.range;
  if (r1 && (r1.normal || r1.long)) return fmt(r1);
  const r2 = item?.properties?._raw?.range;
  if (r2 && (r2.normal || r2.long)) return fmt(r2);
  return null;
}

function collectTypes(items) {
  const set = new Set();
  for (const item of items) {
    const t = safeString(item?.type || item?.category);
    if (t) set.add(t);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default function CampaignItems({ embedded = false, campaignId: campaignIdOverride } = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = campaignIdOverride ?? urlParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((c) => c[0]),
    enabled: !!campaignId,
  });

  const isGM = !!campaign && (
    campaign.game_master_id === user?.id
    || (Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(user?.id))
  );

  const { data: homebrewItems = [] } = useQuery({
    queryKey: ["homebrewItems", campaignId],
    queryFn: () => base44.entities.CampaignItem
      .filter({ campaign_id: campaignId })
      .then((rows) => (rows || []).map((i) => ({ ...i, _source: "homebrew" })))
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const { data: srdItems = [] } = useQuery({
    queryKey: ["srdItems"],
    queryFn: () => base44.entities.Dnd5eItem
      .list("name")
      .then((rows) => (rows || []).map((i) => ({ ...i, _source: "srd" })))
      .catch(() => []),
    initialData: [],
  });

  const merged = useMemo(() => [...srdItems, ...homebrewItems], [srdItems, homebrewItems]);

  const typeOptions = useMemo(
    () => [{ value: "all", label: "Any type" }, ...collectTypes(merged).map((t) => ({ value: t, label: t }))],
    [merged],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged;
    if (sourceFilter !== "all") {
      rows = rows.filter((i) => i._source === sourceFilter);
    }
    if (rarityFilter !== "all") {
      rows = rows.filter((i) => safeString(i.rarity).toLowerCase() === rarityFilter);
    }
    if (typeFilter !== "all") {
      rows = rows.filter((i) => safeString(i.type || i.category) === typeFilter);
    }
    if (q) {
      rows = rows.filter((i) =>
        safeString(i.name).toLowerCase().includes(q) ||
        safeString(i.type).toLowerCase().includes(q) ||
        safeString(i.description).toLowerCase().includes(q)
      );
    }
    return rows.slice().sort((a, b) => safeString(a.name).localeCompare(safeString(b.name)));
  }, [merged, search, sourceFilter, rarityFilter, typeFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignItem.create({
      ...data, campaign_id: campaignId, is_system: false,
    }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["homebrewItems", campaignId] });
      setEditing(null);
      if (row) setSelected({ ...row, _source: "homebrew" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampaignItem.update(id, data),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["homebrewItems", campaignId] });
      setEditing(null);
      if (row) setSelected({ ...row, _source: "homebrew" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CampaignItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homebrewItems", campaignId] });
      setSelected(null);
    },
  });

  const back = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignArchives") + `?id=${campaignId}`);
  };

  const handleCreateNew = () => {
    setEditing({ name: "", description: "", rarity: "common", type: "Item" });
  };

  const handleEdit = () => {
    if (!selected || selected._source !== "homebrew") return;
    setEditing({ ...selected });
  };

  const handleSave = (payload) => {
    if (payload.id) {
      updateMutation.mutate({ id: payload.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (!selected || selected._source !== "homebrew") return;
    if (confirm(`Delete "${selected.name}"?`)) deleteMutation.mutate(selected.id);
  };

  return (
    <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col overflow-hidden bg-[#0f1219] text-white`}>
      {!embedded && (
        <header className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              onClick={back}
              variant="outline"
              size="sm"
              className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10 hover:text-[#37F2D1]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Archives
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-[#37F2D1]" /> Items
            </h1>
          </div>
          {isGM && (
            <Button
              onClick={handleCreateNew}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              <Plus className="w-4 h-4 mr-1" /> New Item
            </Button>
          )}
        </header>
      )}
      {embedded && isGM && (
        <div className="flex justify-end px-6 py-3 flex-shrink-0">
          <Button
            onClick={handleCreateNew}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Item
          </Button>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden px-6 pb-6 min-h-0">
        {/* Left: item detail */}
        <div className="w-1/2 overflow-y-auto border border-slate-700/50 rounded-lg bg-[#1a1f2e]">
          {selected ? (
            <ItemDetail
              item={selected}
              isGM={isGM}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 italic text-sm p-6 text-center">
              Select an item to view its details.
            </div>
          )}
        </div>

        {/* Right: filter + list */}
        <div className="w-1/2 flex flex-col overflow-hidden min-h-0">
          <div className="flex-shrink-0 mb-3 bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-3 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="pl-7 bg-[#0f1219] border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FilterSelect value={typeFilter}   onChange={setTypeFilter}   options={typeOptions} />
              <FilterSelect value={rarityFilter} onChange={setRarityFilter} options={RARITY_OPTIONS} />
              <FilterSelect value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-12 text-center">
                <p className="text-sm text-slate-500 italic">No items match these filters.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/30 bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden">
                {filtered.map((item) => (
                  <ItemRow
                    key={`${item._source}-${item.id}`}
                    item={item}
                    selected={selected?.id === item.id && selected?._source === item._source}
                    onClick={() => setSelected(item)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <EditItemDialog
        open={!!editing}
        item={editing}
        saving={createMutation.isPending || updateMutation.isPending}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full bg-[#0f1219] border-slate-600 text-white text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const RARITY_PILL = {
  common:    "bg-slate-700 text-slate-300",
  uncommon:  "bg-emerald-900/30 text-emerald-400",
  rare:      "bg-blue-900/30 text-blue-400",
  very_rare: "bg-purple-900/30 text-purple-400",
  legendary: "bg-orange-900/30 text-orange-400",
  artifact:  "bg-red-900/30 text-red-400",
};

function rarityPillClass(rarity) {
  const key = safeString(rarity).toLowerCase().replace(/\s+/g, "_");
  return RARITY_PILL[key] || "bg-slate-700 text-slate-300";
}

function rarityLabel(rarity) {
  const str = safeString(rarity);
  if (!str) return "Common";
  return str
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function ItemRow({ item, selected, onClick }) {
  const img = item.icon_url || item.image_url;
  const isHomebrew = item._source === "homebrew";
  const cost = getItemCost(item);
  const weight = getItemWeight(item);
  const type = safeString(item.type);
  const category = safeString(item.category);
  const subLine = [
    [type, category].filter(Boolean).join(" · "),
    cost,
    weight,
  ].filter((s) => s && s !== "—").join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-3 flex items-center gap-3 transition-colors border-b border-slate-700/30 last:border-b-0 ${
          selected ? "bg-[#252b3d] border-l-2 border-l-[#37F2D1]" : "hover:bg-[#252b3d]"
        }`}
      >
        {img ? (
          <img
            src={img}
            alt=""
            className="w-8 h-8 rounded object-cover flex-shrink-0 bg-[#0f1219]"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-8 h-8 rounded bg-[#0f1219] flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-slate-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white font-semibold truncate">{safeString(item.name)}</span>
            {isHomebrew && (
              <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">Homebrew</Badge>
            )}
          </div>
          <div className="text-xs text-slate-400 truncate">{subLine || "—"}</div>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${rarityPillClass(item.rarity)}`}>
          {rarityLabel(item.rarity)}
        </span>
      </button>
    </li>
  );
}

function ItemDetail({ item, isGM, onEdit, onDelete }) {
  const img = item.icon_url || item.image_url;
  const isHomebrew = item._source === "homebrew";
  const category = safeString(item.category);
  const typeLine = [safeString(item.type), category].filter(Boolean).join(" — ");
  const damageText   = getItemDamage(item);
  const rangeText    = getItemRange(item);
  const acText       = getItemArmorClass(item);
  const propsList    = getItemPropertiesList(item);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-4">
        {img ? (
          <img
            src={img}
            alt=""
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-[#0f1219] border border-slate-700/60"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-[#0f1219] border border-slate-700/60 flex items-center justify-center flex-shrink-0">
            <Package className="w-7 h-7 text-slate-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white">{safeString(item.name)}</h2>
          <p className="text-sm text-slate-400 italic">{typeLine || "—"}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isHomebrew ? (
              <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-300">Homebrew</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-300">SRD</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Always show cost / weight / rarity so the detail is consistent
          regardless of whether the row represents a weapon, armor,
          gear, or a trinket. */}
      <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-700/30">
        <div>
          <div className="text-xs text-slate-500">Cost</div>
          <div className="text-sm text-white font-semibold">{getItemCost(item)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Weight</div>
          <div className="text-sm text-white font-semibold">{getItemWeight(item)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Rarity</div>
          <div className="text-sm text-white font-semibold">{rarityLabel(item.rarity)}</div>
        </div>
      </div>

      {damageText && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300">
            Damage: {damageText}
          </span>
          {rangeText && (
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              Range: {rangeText}
            </span>
          )}
        </div>
      )}

      {acText && (
        <span className="inline-block text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300">
          {acText}
        </span>
      )}

      {propsList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {propsList.map((prop, i) => (
            <span key={`${prop}-${i}`} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              {prop}
            </span>
          ))}
        </div>
      )}

      {item.description && (
        <div className="pt-3 border-t border-slate-700/30">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {safeString(item.description)}
          </p>
        </div>
      )}

      {isGM && isHomebrew && (
        <div className="flex gap-2 pt-4 border-t border-slate-700/50">
          <Button onClick={onEdit} variant="outline" className="text-[#37F2D1] border-[#37F2D1]/60">
            Edit
          </Button>
          <Button onClick={onDelete} variant="outline" className="text-red-400 border-red-700 hover:bg-red-950/30">
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

const ITEM_TYPE_OPTIONS = [
  "Weapon", "Armor", "Shield", "Potion", "Wondrous Item",
  "Scroll", "Ring", "Rod", "Staff", "Wand", "Ammunition", "Adventuring Gear",
];
const WEAPON_CATEGORIES = ["Simple", "Martial"];
const WEAPON_DAMAGE_TYPES = [
  "bludgeoning", "piercing", "slashing",
  "acid", "cold", "fire", "force", "lightning",
  "necrotic", "poison", "psychic", "radiant", "thunder",
];
const WEAPON_PROPERTIES = [
  "Ammunition", "Finesse", "Heavy", "Light", "Loading",
  "Range", "Reach", "Special", "Thrown", "Two-Handed", "Versatile",
];
const ARMOR_TYPES = ["light", "medium", "heavy"];
const WONDROUS_RECHARGE = ["Dawn", "Short Rest", "Long Rest", "Never"];

function EditItemDialog({ open, item, saving, onClose, onSave }) {
  const [draft, setDraft] = useState(item || {});
  // Re-seed state whenever the item we're editing changes.
  useStateSync(setDraft, item, open);

  const uploadImage = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDraft((d) => ({ ...d, image_url: file_url }));
  };

  const handleSave = () => {
    if (!safeString(draft.name).trim()) return;
    onSave({ ...draft, name: safeString(draft.name).trim() });
  };

  const type = safeString(draft.type) || "Weapon";
  const isWeapon   = type === "Weapon" || type === "Ammunition";
  const isArmor    = type === "Armor";
  const isShield   = type === "Shield";
  const isPotion   = type === "Potion";
  const isWondrous = type === "Wondrous Item" || type === "Ring"
                  || type === "Rod" || type === "Staff" || type === "Wand";

  const patch = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleProperty = (prop) => {
    const current = Array.isArray(draft.properties) ? draft.properties : [];
    const next = current.includes(prop) ? current.filter((p) => p !== prop) : [...current, prop];
    patch("properties", next);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit Item" : "New Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Image</label>
            {draft.image_url ? (
              <img src={draft.image_url} alt="" className="w-32 h-32 rounded-lg object-cover mb-2" />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-[#0f1219] border border-slate-700/60 flex items-center justify-center mb-2">
                <Upload className="w-8 h-8 text-slate-500" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <Input
              value={safeString(draft.name)}
              onChange={(e) => patch("name", e.target.value)}
              className="bg-[#0f1219] border-slate-600 text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <Select value={type} onValueChange={(v) => patch("type", v)}>
                <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                  {ITEM_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rarity</label>
              <Select
                value={safeString(draft.rarity) || "common"}
                onValueChange={(v) => patch("rarity", v)}
              >
                <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                  {RARITY_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cost</label>
              <Input
                value={safeString(draft.cost)}
                onChange={(e) => patch("cost", e.target.value)}
                placeholder="50 gp"
                className="bg-[#0f1219] border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Weight</label>
              <Input
                value={safeString(draft.weight)}
                onChange={(e) => patch("weight", e.target.value)}
                placeholder="3 lb"
                className="bg-[#0f1219] border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Type-conditional sections below. Driven purely off the
              `type` dropdown — switching types doesn't clear the
              other branches so authors can flip back and forth
              while tuning. Save path writes the full draft, and
              readers ignore branches that don't apply to their
              type. */}

          {isWeapon && (
            <ItemTypeSection title="Weapon details">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Damage</label>
                  <Input
                    value={safeString(draft.damage)}
                    onChange={(e) => patch("damage", e.target.value)}
                    placeholder="1d8"
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Damage type</label>
                  <Select
                    value={safeString(draft.damage_type) || "slashing"}
                    onValueChange={(v) => patch("damage_type", v)}
                  >
                    <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                      {WEAPON_DAMAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Weapon category</label>
                  <Select
                    value={safeString(draft.weapon_category) || "Simple"}
                    onValueChange={(v) => patch("weapon_category", v)}
                  >
                    <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                      {WEAPON_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Range (if ranged/thrown)</label>
                  <Input
                    value={safeString(draft.range)}
                    onChange={(e) => patch("range", e.target.value)}
                    placeholder="80/320"
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Properties</label>
                <div className="flex flex-wrap gap-1">
                  {WEAPON_PROPERTIES.map((prop) => {
                    const active = Array.isArray(draft.properties) && draft.properties.includes(prop);
                    return (
                      <button
                        key={prop}
                        type="button"
                        onClick={() => toggleProperty(prop)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${
                          active
                            ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                            : "bg-[#050816] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
                        }`}
                      >
                        {prop}
                      </button>
                    );
                  })}
                </div>
              </div>
              {Array.isArray(draft.properties) && draft.properties.includes("Versatile") && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Versatile damage (two-handed)</label>
                  <Input
                    value={safeString(draft.versatile_damage)}
                    onChange={(e) => patch("versatile_damage", e.target.value)}
                    placeholder="1d10"
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
              )}
            </ItemTypeSection>
          )}

          {(isArmor || isShield) && (
            <ItemTypeSection title={isShield ? "Shield details" : "Armor details"}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{isShield ? "AC bonus" : "Base AC"}</label>
                  <Input
                    type="number"
                    value={Number.isFinite(draft.base_ac) ? draft.base_ac : ""}
                    onChange={(e) => patch("base_ac", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={isShield ? "2" : "11"}
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
                {!isShield && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Armor type</label>
                    <Select
                      value={safeString(draft.armor_type) || "light"}
                      onValueChange={(v) => patch("armor_type", v)}
                    >
                      <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                        {ARMOR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!isShield && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Max DEX bonus (blank = uncapped)</label>
                      <Input
                        type="number"
                        value={Number.isFinite(draft.max_dex_bonus) ? draft.max_dex_bonus : ""}
                        onChange={(e) => patch("max_dex_bonus", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="2"
                        className="bg-[#0f1219] border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">STR requirement</label>
                      <Input
                        type="number"
                        value={Number.isFinite(draft.str_requirement) ? draft.str_requirement : ""}
                        onChange={(e) => patch("str_requirement", e.target.value === "" ? 0 : Number(e.target.value))}
                        placeholder="0"
                        className="bg-[#0f1219] border-slate-600 text-white"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Checkbox
                        id="stealth_disadvantage"
                        checked={!!draft.stealth_disadvantage}
                        onCheckedChange={(v) => patch("stealth_disadvantage", !!v)}
                      />
                      <label htmlFor="stealth_disadvantage" className="text-xs text-slate-300">
                        Stealth disadvantage
                      </label>
                    </div>
                  </>
                )}
              </div>
            </ItemTypeSection>
          )}

          {isPotion && (
            <ItemTypeSection title="Potion effect">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Effect</label>
                  <Input
                    value={safeString(draft.potion_effect)}
                    onChange={(e) => patch("potion_effect", e.target.value)}
                    placeholder="Healing, Resistance, Giant Strength"
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Healing dice</label>
                  <Input
                    value={safeString(draft.healing_dice)}
                    onChange={(e) => patch("healing_dice", e.target.value)}
                    placeholder="2d4+2"
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Duration</label>
                  <Input
                    value={safeString(draft.duration)}
                    onChange={(e) => patch("duration", e.target.value)}
                    placeholder="Instantaneous, 1 hour, until dispelled"
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Effect description</label>
                  <Textarea
                    value={safeString(draft.effect_description)}
                    onChange={(e) => patch("effect_description", e.target.value)}
                    rows={2}
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
              </div>
            </ItemTypeSection>
          )}

          {isWondrous && (
            <ItemTypeSection title="Wondrous item">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 flex items-center gap-2">
                  <Checkbox
                    id="requires_attunement"
                    checked={!!draft.requires_attunement}
                    onCheckedChange={(v) => patch("requires_attunement", !!v)}
                  />
                  <label htmlFor="requires_attunement" className="text-xs text-slate-300">
                    Requires attunement
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Charges (0 = unlimited)</label>
                  <Input
                    type="number"
                    value={Number.isFinite(draft.charges) ? draft.charges : 0}
                    onChange={(e) => patch("charges", Number(e.target.value) || 0)}
                    className="bg-[#0f1219] border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Recharge</label>
                  <Select
                    value={safeString(draft.recharge) || "Dawn"}
                    onValueChange={(v) => patch("recharge", v)}
                  >
                    <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white">
                      {WONDROUS_RECHARGE.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ItemTypeSection>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <Textarea
              value={safeString(draft.description)}
              onChange={(e) => patch("description", e.target.value)}
              rows={4}
              className="bg-[#0f1219] border-slate-600 text-white"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemTypeSection({ title, children }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 space-y-2">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#37F2D1]">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * Tiny wrapper around useEffect so the dialog resets its local draft
 * whenever the parent swaps the `item` prop.
 */
function useStateSync(setter, value, trigger) {
  useEffect(() => { setter(value || {}); }, [trigger, value?.id]);
}
