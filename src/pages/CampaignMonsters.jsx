import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Search, Skull, X, HelpCircle, Eye, EyeOff, Check,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

/**
 * Pokédex-style Monster Compendium. Renders SRD + campaign-custom
 * monsters as a responsive card grid. Encountered monsters (any
 * monster added to the combat queue, or manually flagged by the GM)
 * reveal their full card + stat block; unencountered monsters show
 * a greyed silhouette with "???" and are not clickable for players.
 * The GM always sees everything fully revealed.
 */

const MONSTER_TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon", "Elemental",
  "Fey", "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant", "Undead",
];

const CR_OPTIONS = [
  { value: "all", label: "Any CR" },
  { value: "0-1", label: "CR 0–1" },
  { value: "2-4", label: "CR 2–4" },
  { value: "5-10", label: "CR 5–10" },
  { value: "11-16", label: "CR 11–16" },
  { value: "17-20", label: "CR 17–20" },
  { value: "21-30", label: "CR 21–30" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "srd", label: "SRD" },
  { value: "homebrew", label: "Homebrew" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name (A→Z)" },
  { value: "cr", label: "CR (low→high)" },
  { value: "type", label: "Type" },
];

const SUPABASE_MONSTER_PATH =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/monsters";

function getMonsterImageUrl(monster) {
  if (!monster) return null;
  if (monster.image_url) return monster.image_url;
  if (monster.avatar_url) return monster.avatar_url;
  if (!monster.name) return null;
  return `${SUPABASE_MONSTER_PATH}/${encodeURIComponent(monster.name)}.png`;
}

function crToNumber(monster) {
  const raw = monster?.stats?.challenge_rating
    ?? monster?.stats?.cr
    ?? monster?.challenge_rating
    ?? monster?.cr;
  if (raw === undefined || raw === null || raw === "") return 99;
  if (typeof raw === "number") return raw;
  const s = String(raw);
  if (s.includes("/")) {
    const [a, b] = s.split("/");
    const na = Number(a); const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && nb !== 0) return na / nb;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 99;
}

function crInRange(monster, range) {
  if (range === "all") return true;
  const cr = crToNumber(monster);
  const [lo, hi] = range.split("-").map(Number);
  return cr >= lo && cr <= hi;
}

function getMonsterType(monster) {
  const raw = monster?.stats?.type
    || monster?.stats?.meta
    || monster?.type
    || monster?.monster_type
    || "";
  // Some SRD rows store meta as "Medium beast, unaligned" — grab the
  // type word. Otherwise return the explicit value.
  const str = String(raw).toLowerCase();
  for (const t of MONSTER_TYPES) {
    if (str.includes(t.toLowerCase())) return t;
  }
  return null;
}

export default function CampaignMonsters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [crRange, setCrRange] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showUnencountered, setShowUnencountered] = useState(null);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((r) => r[0]),
    enabled: !!campaignId,
  });
  const isGM = !!campaign && (
    campaign.game_master_id === user?.id
    || (Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(user?.id))
  );

  const encounteredIds = useMemo(() => {
    const list = Array.isArray(campaign?.encountered_monsters) ? campaign.encountered_monsters : [];
    return new Set(list);
  }, [campaign?.encountered_monsters]);

  // `showUnencountered` defaults to true for GMs (they always see
  // everything anyway, but keeping the toggle on keeps the grid
  // consistent) and false for players. Respect an explicit toggle.
  const effectiveShowUnencountered = showUnencountered ?? isGM;

  const { data: srd = [] } = useQuery({
    queryKey: ["monsters", "srd"],
    queryFn: () => base44.entities.Monster.filter({ is_system: true }).catch(() => []),
    initialData: [],
  });
  const { data: custom = [] } = useQuery({
    queryKey: ["monsters", "campaign", campaignId],
    queryFn: () => base44.entities.Monster.filter({ campaign_id: campaignId }).catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const merged = useMemo(() => {
    const byId = new Map();
    for (const row of [...srd, ...custom]) {
      if (!row?.id || byId.has(row.id)) continue;
      byId.set(row.id, row);
    }
    return Array.from(byId.values());
  }, [srd, custom]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged;
    if (q) {
      rows = rows.filter((m) => (m.name || "").toLowerCase().includes(q));
    }
    if (sourceFilter !== "all") {
      const wantSystem = sourceFilter === "srd";
      rows = rows.filter((m) => !!m.is_system === wantSystem);
    }
    if (typeFilter !== "all") {
      rows = rows.filter((m) => getMonsterType(m) === typeFilter);
    }
    rows = rows.filter((m) => crInRange(m, crRange));
    if (!effectiveShowUnencountered) {
      rows = rows.filter((m) => isGM || encounteredIds.has(m.id));
    }
    const sorted = rows.slice();
    if (sortBy === "cr") {
      sorted.sort((a, b) => crToNumber(a) - crToNumber(b) || (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "type") {
      sorted.sort((a, b) => (getMonsterType(a) || "zzz").localeCompare(getMonsterType(b) || "zzz") || (a.name || "").localeCompare(b.name || ""));
    } else {
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return sorted;
  }, [merged, search, crRange, typeFilter, sourceFilter, sortBy, effectiveShowUnencountered, isGM, encounteredIds]);

  const updateCampaignMutation = useMutation({
    mutationFn: (updates) => base44.entities.Campaign.update(campaignId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] }),
  });

  const toggleEncountered = (monsterId) => {
    const current = Array.isArray(campaign?.encountered_monsters) ? campaign.encountered_monsters : [];
    const next = current.includes(monsterId)
      ? current.filter((id) => id !== monsterId)
      : [...current, monsterId];
    updateCampaignMutation.mutate({ encountered_monsters: next });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Monster.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monsters", "campaign", campaignId] });
      setSelected(null);
      toast.success("Monster removed.");
    },
    onError: (err) => toast.error(err?.message || "Delete failed."),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.Monster.create({
      ...payload,
      campaign_id: campaignId,
      is_system: false,
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monsters", "campaign", campaignId] });
      setCreating(false);
      toast.success("Custom monster saved.");
    },
    onError: (err) => toast.error(err?.message || "Save failed."),
  });

  const back = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignArchives") + `?id=${campaignId}`);
  };

  const selectMonster = (monster) => {
    const unlocked = isGM || encounteredIds.has(monster.id);
    if (!unlocked) return;
    setSelected(monster);
  };

  return (
    <div className="min-h-screen bg-[#0f1219] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
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
              <Skull className="w-5 h-5 text-[#37F2D1]" /> Monster Compendium
            </h1>
          </div>
          {isGM && (
            <Button
              onClick={() => setCreating(true)}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              <Plus className="w-4 h-4 mr-1" /> New Monster
            </Button>
          )}
        </header>

        <Filters
          search={search} setSearch={setSearch}
          crRange={crRange} setCrRange={setCrRange}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          showUnencountered={effectiveShowUnencountered}
          onToggleShowUnencountered={(v) => setShowUnencountered(v)}
        />

        {filtered.length === 0 ? (
          <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-12 text-center">
            <p className="text-sm text-slate-500 italic">
              No monsters match these filters.
              {!effectiveShowUnencountered && !isGM && " Try enabling \"Show unencountered\"."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((monster) => (
              <MonsterCard
                key={monster.id}
                monster={monster}
                encountered={isGM || encounteredIds.has(monster.id)}
                isGM={isGM}
                onClick={() => selectMonster(monster)}
                onToggleEncountered={() => toggleEncountered(monster.id)}
                busy={updateCampaignMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <StatBlockDialog
        monster={selected}
        isGM={isGM}
        onClose={() => setSelected(null)}
        onDelete={() => {
          if (!selected) return;
          if (selected.is_system) {
            toast.error("SRD monsters can't be deleted.");
            return;
          }
          if (confirm(`Delete "${selected.name}"?`)) deleteMutation.mutate(selected.id);
        }}
      />

      <NewMonsterDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSave={(payload) => createMutation.mutate(payload)}
        saving={createMutation.isPending}
      />
    </div>
  );
}

function Filters({
  search, setSearch,
  crRange, setCrRange,
  typeFilter, setTypeFilter,
  sourceFilter, setSourceFilter,
  sortBy, setSortBy,
  showUnencountered, onToggleShowUnencountered,
}) {
  return (
    <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-4 mb-6 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monsters by name…"
            className="pl-7 bg-[#0f1219] border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        <FilterSelect value={crRange} onChange={setCrRange} options={CR_OPTIONS} />
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: "all", label: "Any type" }, ...MONSTER_TYPES.map((t) => ({ value: t, label: t }))]}
        />
        <FilterSelect value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} />
        <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <Checkbox
          checked={showUnencountered}
          onCheckedChange={(v) => onToggleShowUnencountered(!!v)}
        />
        <span className="flex items-center gap-1">
          {showUnencountered ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Show unencountered entries
        </span>
      </label>
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] bg-[#0f1219] border-slate-600 text-white text-xs">
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

function MonsterCard({ monster, encountered, isGM, onClick, onToggleEncountered, busy }) {
  if (!encountered) {
    return (
      <div className="bg-[#1a1f2e] border border-slate-700/30 rounded-lg overflow-hidden opacity-50 cursor-not-allowed">
        <div className="h-40 bg-[#0f1219] flex items-center justify-center">
          <HelpCircle className="w-16 h-16 text-slate-700" />
        </div>
        <div className="p-3">
          <h3 className="text-slate-600 font-semibold text-sm">???</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-600">Unknown</span>
          </div>
          <div className="text-xs text-slate-700 mt-2">Not yet encountered</div>
        </div>
      </div>
    );
  }

  const img = getMonsterImageUrl(monster);
  const type = getMonsterType(monster) || monster?.stats?.type || monster?.stats?.meta || "Unknown Type";
  const cr = monster?.stats?.challenge_rating ?? monster?.stats?.cr ?? monster?.challenge_rating ?? monster?.cr ?? "?";
  const ac = monster?.stats?.armor_class ?? monster?.stats?.ac ?? monster?.armor_class ?? "?";
  const hp = monster?.stats?.hit_points ?? monster?.stats?.hp ?? monster?.hit_points ?? "?";

  return (
    <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden hover:border-[#37F2D1]/30 transition-colors flex flex-col">
      <button
        type="button"
        onClick={onClick}
        className="text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#37F2D1]/40"
      >
        <div className="h-40 overflow-hidden bg-[#0f1219] relative">
          {img ? (
            <img
              src={img}
              alt={monster.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/default-monster.png";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700 text-5xl font-bold">
              {monster?.name?.charAt(0) || "?"}
            </div>
          )}
          {!monster.is_system && (
            <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-[#37F2D1]/15 text-[#37F2D1] border border-[#37F2D1]/40">
              Homebrew
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-white font-semibold text-sm truncate">{monster.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 truncate">
              {type}
            </span>
            <span className="text-xs text-[#37F2D1] font-semibold">CR {cr}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>AC {ac}</span>
            <span>HP {hp}</span>
          </div>
        </div>
      </button>
      {isGM && (
        <button
          type="button"
          onClick={onToggleEncountered}
          disabled={busy}
          className="text-xs px-3 py-2 border-t border-slate-700/50 text-slate-400 hover:text-[#37F2D1] hover:bg-[#0f1219] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Check className="w-3 h-3" />
          {encountered ? "Lock entry" : "Mark as encountered"}
        </button>
      )}
    </div>
  );
}

function StatBlockDialog({ monster, isGM, onClose, onDelete }) {
  if (!monster) return null;
  const stats = monster.stats || {};
  const img = getMonsterImageUrl(monster);
  const meta = stats.meta || [stats.size, stats.type, stats.alignment].filter(Boolean).join(" ");

  const traits = stats.special_abilities || stats.traits || monster.special_abilities || [];
  const actions = stats.actions || monster.actions || [];
  const legendary = stats.legendary_actions || monster.legendary_actions || [];
  const reactions = stats.reactions || monster.reactions || [];

  const getAbility = (key) => {
    const k = key.toLowerCase();
    const K = key.toUpperCase();
    return stats[k] ?? stats[K] ?? stats.abilities?.[k] ?? stats.abilities?.[K] ?? 10;
  };
  const mod = (score) => {
    const m = Math.floor((Number(score) - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  return (
    <Dialog open={!!monster} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{monster.name}</DialogTitle>
        </DialogHeader>
        <div className="relative h-48 overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={monster.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/default-monster.png";
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#0f1219] flex items-center justify-center text-slate-600 text-6xl font-bold">
              {monster.name?.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1f2e] to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white truncate">{monster.name}</h2>
              {meta && <p className="text-sm text-slate-300 italic truncate">{meta}</p>}
            </div>
            {!monster.is_system && (
              <Badge variant="outline" className="text-[10px] border-[#37F2D1]/60 text-[#37F2D1] flex-shrink-0">Homebrew</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 p-4 border-b border-slate-700/30">
          <CoreStat label="AC" value={stats.armor_class ?? stats.ac ?? monster.armor_class ?? "—"} />
          <CoreStat
            label="HP"
            value={stats.hit_points ?? stats.hp ?? (typeof monster.hit_points === "object" ? monster.hit_points?.max : monster.hit_points) ?? "—"}
            sub={stats.hit_dice}
          />
          <CoreStat label="Speed" value={stats.speed ?? "30 ft."} />
          <CoreStat label="CR" value={stats.challenge_rating ?? stats.cr ?? monster.cr ?? "?"} accent />
        </div>

        <div className="grid grid-cols-6 gap-2 p-4 border-b border-slate-700/30">
          {["str", "dex", "con", "int", "wis", "cha"].map((k) => {
            const score = Number(getAbility(k)) || 10;
            return (
              <div key={k} className="text-center">
                <div className="text-xs text-slate-400 uppercase">{k}</div>
                <div className="text-white font-bold">{score}</div>
                <div className="text-xs text-slate-400">({mod(score)})</div>
              </div>
            );
          })}
        </div>

        <div className="p-4">
          <Tabs defaultValue="traits">
            <TabsList className="bg-[#0f1219] border border-slate-700">
              <TabsTrigger value="traits">Traits</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="traits" className="mt-4 space-y-3">
              {traits.length > 0 ? (
                traits.map((trait, i) => <TraitLine key={i} item={trait} />)
              ) : (
                <p className="text-slate-500 italic">No special traits.</p>
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-4 space-y-3">
              {actions.length > 0
                ? actions.map((a, i) => <TraitLine key={`a-${i}`} item={a} />)
                : <p className="text-slate-500 italic">No actions defined.</p>}

              {legendary.length > 0 && (
                <>
                  <h4 className="text-amber-400 font-semibold mt-6 mb-2 border-t border-slate-700/30 pt-4">
                    Legendary Actions
                  </h4>
                  {legendary.map((a, i) => <TraitLine key={`l-${i}`} item={a} />)}
                </>
              )}

              {reactions.length > 0 && (
                <>
                  <h4 className="text-blue-400 font-semibold mt-6 mb-2 border-t border-slate-700/30 pt-4">
                    Reactions
                  </h4>
                  {reactions.map((r, i) => <TraitLine key={`r-${i}`} item={r} />)}
                </>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-2 text-sm">
              <DetailLine label="Saving Throws"      value={stats.saving_throws} />
              <DetailLine label="Skills"             value={stats.skills} />
              <DetailLine label="Damage Resistances" value={stats.damage_resistances} />
              <DetailLine label="Damage Immunities"  value={stats.damage_immunities} />
              <DetailLine label="Vulnerabilities"    value={stats.damage_vulnerabilities} />
              <DetailLine label="Condition Immunities" value={stats.condition_immunities} />
              <DetailLine label="Senses"             value={stats.senses} />
              <DetailLine label="Languages"          value={stats.languages} />
              {(monster.description || stats.description) && (
                <div className="border-t border-slate-700/30 pt-3 mt-4">
                  <p className="text-slate-300 italic whitespace-pre-wrap">
                    {monster.description || stats.description}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t border-slate-700/30">
          {isGM && !monster.is_system && (
            <Button variant="outline" onClick={onDelete} className="text-red-400 border-red-700 hover:bg-red-950/30">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          )}
          <Button onClick={onClose} className="bg-[#37F2D1] text-[#050816] hover:bg-[#2dd9bd]">
            <X className="w-3 h-3 mr-1" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoreStat({ label, value, sub, accent }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-[#37F2D1]" : "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function TraitLine({ item }) {
  if (!item) return null;
  return (
    <div>
      <span className="text-white font-semibold">{item.name}. </span>
      <span className="text-slate-300 text-sm">{item.desc || item.description}</span>
    </div>
  );
}

function DetailLine({ label, value }) {
  if (!value) return null;
  return (
    <p><span className="text-slate-400">{label}:</span> <span className="text-white">{value}</span></p>
  );
}

function NewMonsterDialog({ open, onClose, onSave, saving }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [cr, setCr] = useState("");
  const [ac, setAc] = useState(10);
  const [hp, setHp] = useState(10);
  const [description, setDescription] = useState("");

  const reset = () => { setName(""); setType(""); setCr(""); setAc(10); setHp(10); setDescription(""); };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name the monster."); return; }
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      stats: {
        type: type.trim() || null,
        challenge_rating: cr.trim() || null,
        armor_class: Number(ac) || 10,
        hit_points: Number(hp) || 10,
      },
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>New Custom Monster</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-300">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0f1219] border-slate-600 text-white mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-300">Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. beast, undead"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Challenge Rating</Label>
              <Input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="e.g. 1/2, 5"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">AC</Label>
              <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)}
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">HP</Label>
              <Input type="number" value={hp} onChange={(e) => setHp(e.target.value)}
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-300">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="bg-[#0f1219] border-slate-600 text-white mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {saving ? "Saving…" : "Save Monster"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
