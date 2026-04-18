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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  MONSTER_TYPES,
  getAC, getHP, getCR, getXP, getHitDice, getSize, getAlignment,
  getMonsterType, getMonsterImageUrl, getSpeed,
  getAbilityScores, getAbilityMod,
  getProficiencies, getSenses, getLanguages, getDamageInfo,
  getSpecialAbilities, getActions, getLegendaryActions, getReactions,
  getDescription, formatUsage,
} from "@/utils/monsterHelpers";

/**
 * Pokédex-style Monster Compendium. Renders SRD + campaign-custom
 * monsters as a responsive card grid. Encountered monsters (any
 * monster added to the combat queue, or manually flagged by the GM)
 * reveal their full card + stat block; unencountered monsters show
 * a greyed silhouette with "???" and are not clickable for players.
 * The GM always sees everything fully revealed.
 */

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

/**
 * Pokédex encounter key. SRD + homebrew IDs come from different
 * tables (dnd5e_monsters vs. monsters), so we prefix to avoid an ID
 * collision between `srd:<uuid>` and `hb:<uuid>`.
 */
function encounterKey(monster) {
  if (!monster?.id) return null;
  return monster._source === "srd" ? `srd:${monster.id}` : `hb:${monster.id}`;
}

function crToNumber(monster) {
  const raw = getCR(monster);
  if (raw === "?" || raw == null || raw === "") return 99;
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

  // SRD monsters live in the shared dnd5e_monsters reference table
  // (one row per monster, no campaign_id). Homebrew monsters live in
  // the per-campaign `monsters` table. Tag each row with _source so
  // the UI knows which lane to render and so the Pokédex uses a
  // prefixed ID (srd:<uuid> / hb:<uuid>) to disambiguate.
  const { data: srd = [] } = useQuery({
    queryKey: ["srdMonsters"],
    queryFn: () => base44.entities.Dnd5eMonster
      .list("name")
      .then((rows) => (rows || []).map((m) => ({ ...m, _source: "srd" })))
      .catch(() => []),
    initialData: [],
  });
  const { data: custom = [] } = useQuery({
    queryKey: ["homebrewMonsters", campaignId],
    queryFn: () => base44.entities.Monster
      .filter({ campaign_id: campaignId })
      .then((rows) => (rows || []).map((m) => ({ ...m, _source: "homebrew" })))
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const merged = useMemo(() => [...srd, ...custom], [srd, custom]);

  const isEncountered = (monster) => {
    if (isGM) return true;
    // Homebrew = GM's own creation — no Pokédex lock on your own.
    if (monster._source === "homebrew") return true;
    return encounteredIds.has(encounterKey(monster));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged;
    if (q) {
      rows = rows.filter((m) => (m.name || "").toLowerCase().includes(q));
    }
    if (sourceFilter !== "all") {
      rows = rows.filter((m) => m._source === sourceFilter);
    }
    if (typeFilter !== "all") {
      rows = rows.filter((m) => getMonsterType(m) === typeFilter);
    }
    rows = rows.filter((m) => crInRange(m, crRange));
    if (!effectiveShowUnencountered) {
      rows = rows.filter(isEncountered);
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

  const toggleEncountered = (monster) => {
    // Only SRD entries participate in the Pokédex — homebrew is
    // always visible to the party, so toggling does nothing useful
    // there (still flip in case a GM wants to "hide" one).
    const key = encounterKey(monster);
    const current = Array.isArray(campaign?.encountered_monsters) ? campaign.encountered_monsters : [];
    const next = current.includes(key)
      ? current.filter((id) => id !== key)
      : [...current, key];
    updateCampaignMutation.mutate({ encountered_monsters: next });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Monster.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homebrewMonsters", campaignId] });
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
      queryClient.invalidateQueries({ queryKey: ["homebrewMonsters", campaignId] });
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
    if (!isEncountered(monster)) return;
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
                key={`${monster._source}-${monster.id}`}
                monster={monster}
                encountered={isEncountered(monster)}
                isGM={isGM}
                onClick={() => selectMonster(monster)}
                onToggleEncountered={() => toggleEncountered(monster)}
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
          if (selected._source !== "homebrew") {
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
  const size = getSize(monster);
  const type = getMonsterType(monster);
  const ac = getAC(monster);
  const hp = getHP(monster);
  const cr = getCR(monster);
  // "Huge Dragon" instead of just "Dragon". Size falls back silently
  // when the stat block doesn't record one (most homebrew shims).
  const typeLabel = size ? `${size} ${type}` : type;
  const isHomebrew = monster._source === "homebrew";

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
              className="w-full h-full object-cover object-top"
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
          <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded ${
            isHomebrew
              ? "bg-purple-900/30 text-purple-400 border border-purple-700/40"
              : "bg-blue-900/30 text-blue-400 border border-blue-700/40"
          }`}>
            {isHomebrew ? "Homebrew" : "SRD"}
          </span>
        </div>
        <div className="p-3">
          <h3 className="text-white font-semibold text-sm truncate">{monster.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 truncate">
              {typeLabel}
            </span>
            <span className="text-xs text-[#37F2D1] font-semibold">CR {cr}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>AC {ac}</span>
            <span>HP {hp}</span>
          </div>
        </div>
      </button>
      {isGM && !isHomebrew && (
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

/**
 * Full D&D 5e-style monster stat block. Uses red accents to
 * visually distinguish monster sheets from the teal-accented
 * UI chrome. Everything pipes through the shared helpers so
 * SRD (nested under .stats) and homebrew (often flat) render
 * identically.
 */
function StatBlockDialog({ monster, isGM, onClose, onDelete }) {
  if (!monster) return null;
  const img   = getMonsterImageUrl(monster);
  const size  = getSize(monster);
  const type  = getMonsterType(monster);
  const align = getAlignment(monster);
  const metaLine = [size, type ? type.toLowerCase() : "", align]
    .filter(Boolean)
    .join(", ");
  const xp = getXP(monster);
  const abilityScores = getAbilityScores(monster);
  const { saves, skills } = getProficiencies(monster);
  const damage = getDamageInfo(monster);
  const senses = getSenses(monster);
  const languages = getLanguages(monster);
  const traits = getSpecialAbilities(monster);
  const actions = getActions(monster);
  const reactions = getReactions(monster);
  const legendary = getLegendaryActions(monster);
  const description = getDescription(monster);

  return (
    <Dialog open={!!monster} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{monster.name}</DialogTitle>
        </DialogHeader>

        {/* Hero image + title */}
        <div className="relative h-56 overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={monster.name}
              className="w-full h-full object-cover object-top"
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1f2e] via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white truncate drop-shadow-lg">{monster.name}</h2>
              {metaLine && (
                <p className="text-sm text-slate-300 italic truncate drop-shadow">{metaLine}</p>
              )}
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] flex-shrink-0 ${
                monster._source === "homebrew"
                  ? "border-purple-500/50 text-purple-300"
                  : "border-blue-500/50 text-blue-300"
              }`}
            >
              {monster._source === "homebrew" ? "Homebrew" : "SRD"}
            </Badge>
          </div>
        </div>

        {/* Core stats row — red-tinted backing to match official stat blocks */}
        <div className="grid grid-cols-5 gap-2 p-4 border-b border-red-900/30 bg-red-900/5">
          <CoreStat label="Armor Class" value={getAC(monster)} />
          <CoreStat label="Hit Points"  value={getHP(monster)} sub={getHitDice(monster)} />
          <CoreStat label="Speed"       value={getSpeed(monster)} small />
          <CoreStat label="CR"          value={getCR(monster)} accent />
          <CoreStat label="XP"          value={formatXP(xp)} small />
        </div>

        {/* Ability scores */}
        <div className="grid grid-cols-6 gap-2 p-4 border-b border-red-900/30">
          {Object.entries(abilityScores).map(([ability, score]) => (
            <div key={ability} className="text-center">
              <div className="text-xs text-red-400 uppercase font-bold">{ability}</div>
              <div className="text-white font-bold text-lg">{score}</div>
              <div className="text-xs text-slate-400">({getAbilityMod(score)})</div>
            </div>
          ))}
        </div>

        {/* Proficiencies, immunities, senses, languages */}
        {(saves.length > 0 || skills.length > 0 || damage.vulnerabilities ||
          damage.resistances || damage.immunities || damage.conditionImmunities ||
          senses || languages) && (
          <div className="p-4 border-b border-red-900/30 space-y-2 text-sm">
            {saves.length > 0  && <PropLine label="Saving Throws"     value={saves.join(", ")} />}
            {skills.length > 0 && <PropLine label="Skills"            value={skills.join(", ")} />}
            {damage.vulnerabilities     && <PropLine label="Vulnerabilities"        value={damage.vulnerabilities} />}
            {damage.resistances         && <PropLine label="Resistances"            value={damage.resistances} />}
            {damage.immunities          && <PropLine label="Damage Immunities"      value={damage.immunities} />}
            {damage.conditionImmunities && <PropLine label="Condition Immunities"   value={damage.conditionImmunities} />}
            {senses    && <PropLine label="Senses"    value={senses} />}
            {languages && <PropLine label="Languages" value={languages} />}
          </div>
        )}

        {/* Traits */}
        {traits.length > 0 && (
          <Section title="Traits">
            {traits.map((trait, i) => (
              <TraitBlock key={`tr-${i}`} item={trait} />
            ))}
          </Section>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <Section title="Actions">
            {actions.map((action, i) => (
              <ActionBlock key={`a-${i}`} item={action} />
            ))}
          </Section>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <Section title="Reactions" titleClass="text-blue-400">
            {reactions.map((r, i) => (
              <TraitBlock key={`rx-${i}`} item={r} />
            ))}
          </Section>
        )}

        {/* Legendary actions */}
        {legendary.length > 0 && (
          <Section title="Legendary Actions" titleClass="text-amber-400">
            <p className="text-slate-400 text-sm mb-3 italic">
              The {(monster.name || "creature").toLowerCase()} can take 3 legendary actions,
              choosing from the options below. Only one legendary action option can be used at
              a time and only at the end of another creature&apos;s turn.
              The {(monster.name || "creature").toLowerCase()} regains spent legendary actions
              at the start of its turn.
            </p>
            {legendary.map((action, i) => (
              <ActionBlock key={`lg-${i}`} item={action} />
            ))}
          </Section>
        )}

        {/* Lore */}
        {description && (
          <div className="p-4">
            <h3 className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-3">Lore</h3>
            <p className="text-slate-300 italic text-sm leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}

        <DialogFooter className="p-4 border-t border-red-900/30">
          {isGM && monster._source === "homebrew" && (
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

function formatXP(xp) {
  if (xp == null || xp === "") return "—";
  const n = Number(xp);
  if (!Number.isFinite(n)) return String(xp);
  return n.toLocaleString();
}

function CoreStat({ label, value, sub, accent, small }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`font-bold ${small ? "text-sm" : "text-lg"} ${accent ? "text-[#37F2D1]" : "text-white"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function PropLine({ label, value }) {
  return (
    <div>
      <span className="text-red-400 font-semibold">{label}: </span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function Section({ title, titleClass = "text-red-400", children }) {
  return (
    <div className="p-4 border-b border-red-900/30">
      <h3 className={`${titleClass} font-bold text-sm uppercase tracking-wider mb-3`}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TraitBlock({ item }) {
  if (!item) return null;
  return (
    <div>
      <span className="text-white font-semibold italic">{item.name}</span>
      {item.usage && (
        <span className="text-amber-400 text-xs ml-1">{formatUsage(item.usage)}</span>
      )}
      <span className="text-white font-semibold italic">. </span>
      <span className="text-slate-300 text-sm">{item.desc || item.description}</span>
    </div>
  );
}

/**
 * Action entry — prints the name + description like a trait, then
 * shows inline badges for attack bonus + damage dice (for attack
 * actions) or a DC badge + damage (for save-based actions). Pulls
 * "half on save" off `dc.success_type === 'half'` when present.
 */
function ActionBlock({ item }) {
  if (!item) return null;
  const damage = Array.isArray(item.damage) ? item.damage : [];
  return (
    <div>
      <span className="text-white font-semibold italic">{item.name}</span>
      {item.usage && (
        <span className="text-amber-400 text-xs ml-1">{formatUsage(item.usage)}</span>
      )}
      <span className="text-white font-semibold italic">. </span>
      <span className="text-slate-300 text-sm">{item.desc || item.description}</span>

      {item.attack_bonus != null && (
        <div className="flex flex-wrap items-center gap-2 mt-1 ml-4">
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-700/40">
            +{item.attack_bonus} to hit
          </span>
          {damage.map((d, di) => (
            <DamageBadge key={`dmg-${di}`} damage={d} />
          ))}
        </div>
      )}

      {item.dc && item.attack_bonus == null && (
        <div className="flex flex-wrap items-center gap-2 mt-1 ml-4">
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-700/40">
            DC {item.dc.dc_value}{item.dc.dc_type?.name ? ` ${item.dc.dc_type.name}` : ""}
          </span>
          {damage.map((d, di) => (
            <DamageBadge key={`dc-${di}`} damage={d} />
          ))}
          {item.dc.success_type === "half" && (
            <span className="text-xs text-slate-500">half on save</span>
          )}
        </div>
      )}
    </div>
  );
}

function DamageBadge({ damage }) {
  if (!damage) return null;
  const dice = damage.damage_dice || damage.dice || "";
  const dtype = damage.damage_type?.name || damage.type || "";
  if (!dice && !dtype) return null;
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
      {dice}{dice && dtype ? " " : ""}{dtype ? dtype.toLowerCase() : ""}
    </span>
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
