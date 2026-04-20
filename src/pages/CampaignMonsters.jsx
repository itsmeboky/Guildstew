import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Search, Skull, HelpCircle, Eye, EyeOff, Check,
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
import { safeText } from "@/utils/safeRender";

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

export default function CampaignMonsters({ embedded = false, campaignId: campaignIdOverride } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = campaignIdOverride ?? params.get("id");
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

  const onDeleteSelected = () => {
    if (!selected) return;
    if (selected._source !== "homebrew") {
      toast.error("SRD monsters can't be deleted.");
      return;
    }
    if (confirm(`Delete "${selected.name}"?`)) deleteMutation.mutate(selected.id);
  };

  return (
    <div className={`${embedded ? "h-full" : "h-screen"} flex flex-col overflow-hidden bg-[#0f1219] text-white`}>
      {!embedded && (
        <header className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap flex-shrink-0">
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
      )}
      {embedded && isGM && (
        <div className="flex justify-end px-6 py-3 flex-shrink-0">
          <Button
            onClick={() => setCreating(true)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Monster
          </Button>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden px-6 pb-6 min-h-0">
        {/* Left: selected monster's stat block. Scrolls independently. */}
        <div className="w-1/2 overflow-y-auto border border-slate-700/50 rounded-lg bg-[#1a1f2e]">
          {selected ? (
            <MonsterStatBlock
              monster={selected}
              isGM={isGM}
              onDelete={onDeleteSelected}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 italic text-sm p-6 text-center">
              Select a monster to view its stat block.
            </div>
          )}
        </div>

        {/* Right: filters (fixed) + grid (scrolls). */}
        <div className="w-1/2 flex flex-col overflow-hidden min-h-0">
          <div className="flex-shrink-0 mb-3">
            <Filters
              search={search} setSearch={setSearch}
              crRange={crRange} setCrRange={setCrRange}
              typeFilter={typeFilter} setTypeFilter={setTypeFilter}
              sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
              sortBy={sortBy} setSortBy={setSortBy}
              showUnencountered={effectiveShowUnencountered}
              onToggleShowUnencountered={(v) => setShowUnencountered(v)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-12 text-center">
                <p className="text-sm text-slate-500 italic">
                  No monsters match these filters.
                  {!effectiveShowUnencountered && !isGM && " Try enabling \"Show unencountered\"."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((monster) => (
                  <MonsterCard
                    key={`${monster._source}-${monster.id}`}
                    monster={monster}
                    encountered={isEncountered(monster)}
                    isGM={isGM}
                    selected={selected?.id === monster.id && selected?._source === monster._source}
                    onClick={() => selectMonster(monster)}
                    onToggleEncountered={() => toggleEncountered(monster)}
                    busy={updateCampaignMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
    <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-3 space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search monsters…"
          className="pl-7 bg-[#0f1219] border-slate-600 text-white placeholder:text-slate-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
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

function MonsterCard({ monster, encountered, isGM, selected, onClick, onToggleEncountered, busy }) {
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
    <div className={`bg-[#1a1f2e] border rounded-lg overflow-hidden hover:border-[#37F2D1]/30 transition-colors flex flex-col ${
      selected
        ? "border-[#37F2D1] ring-1 ring-[#37F2D1]/40"
        : "border-slate-700/50"
    }`}>
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
              {safeText(monster?.name)?.charAt(0) || "?"}
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
          <h3 className="text-white font-semibold text-sm truncate">{safeText(monster.name)}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 truncate">
              {safeText(typeLabel)}
            </span>
            <span className="text-xs text-[#37F2D1] font-semibold">CR {safeText(cr)}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>AC {safeText(ac)}</span>
            <span>HP {safeText(hp)}</span>
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
 * identically. Renders inline in the split-panel left pane —
 * the outer container provides the scroll.
 */
function MonsterStatBlock({ monster, isGM, onDelete }) {
  if (!monster) return null;
  const img   = getMonsterImageUrl(monster);
  const size  = getSize(monster);
  const type  = getMonsterType(monster);
  const align = getAlignment(monster);
  const typeStr = safeText(type);
  const metaLine = [safeText(size), typeStr ? typeStr.toLowerCase() : "", safeText(align)]
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
    <div>
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
              {safeText(monster.name)?.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1f2e] via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white truncate drop-shadow-lg">{safeText(monster.name)}</h2>
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
          <CoreStat label="Armor Class" value={safeText(getAC(monster))} />
          <CoreStat label="Hit Points"  value={safeText(getHP(monster))} sub={safeText(getHitDice(monster))} />
          <CoreStat label="Speed"       value={safeText(getSpeed(monster))} small />
          <CoreStat label="CR"          value={safeText(getCR(monster))} accent />
          <CoreStat label="XP"          value={safeText(formatXP(xp))} small />
        </div>

        {/* Ability scores */}
        <div className="grid grid-cols-6 gap-2 p-4 border-b border-red-900/30">
          {Object.entries(abilityScores).map(([ability, score]) => (
            <div key={ability} className="text-center">
              <div className="text-xs text-red-400 uppercase font-bold">{safeText(ability)}</div>
              <div className="text-white font-bold text-lg">{safeText(score)}</div>
              <div className="text-xs text-slate-400">({safeText(getAbilityMod(score))})</div>
            </div>
          ))}
        </div>

        {/* Proficiencies, immunities, senses, languages */}
        {(saves.length > 0 || skills.length > 0 || damage.vulnerabilities ||
          damage.resistances || damage.immunities || damage.conditionImmunities ||
          senses || languages) && (
          <div className="p-4 border-b border-red-900/30 space-y-2 text-sm">
            {saves.length > 0  && <PropLine label="Saving Throws"     value={saves.map((s) => safeText(s)).join(", ")} />}
            {skills.length > 0 && <PropLine label="Skills"            value={skills.map((s) => safeText(s)).join(", ")} />}
            {damage.vulnerabilities     && <PropLine label="Vulnerabilities"        value={safeText(damage.vulnerabilities)} />}
            {damage.resistances         && <PropLine label="Resistances"            value={safeText(damage.resistances)} />}
            {damage.immunities          && <PropLine label="Damage Immunities"      value={safeText(damage.immunities)} />}
            {damage.conditionImmunities && <PropLine label="Condition Immunities"   value={safeText(damage.conditionImmunities)} />}
            {senses    && <PropLine label="Senses"    value={safeText(senses)} />}
            {languages && <PropLine label="Languages" value={safeText(languages)} />}
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
              The {(safeText(monster.name) || "creature").toLowerCase()} can take 3 legendary actions,
              choosing from the options below. Only one legendary action option can be used at
              a time and only at the end of another creature&apos;s turn.
              The {(safeText(monster.name) || "creature").toLowerCase()} regains spent legendary actions
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
              {safeText(description)}
            </p>
          </div>
        )}

        {isGM && monster._source === "homebrew" && (
          <div className="p-4 border-t border-red-900/30 flex justify-end">
            <Button variant="outline" onClick={onDelete} className="text-red-400 border-red-700 hover:bg-red-950/30">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        )}
    </div>
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
        {safeText(value)}
      </div>
      {sub && <div className="text-xs text-slate-500">{safeText(sub)}</div>}
    </div>
  );
}

function PropLine({ label, value }) {
  return (
    <div>
      <span className="text-red-400 font-semibold">{label}: </span>
      <span className="text-white">{safeText(value)}</span>
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
      <span className="text-white font-semibold italic">{safeText(item.name)}</span>
      {item.usage && (
        <span className="text-amber-400 text-xs ml-1">{safeText(formatUsage(item.usage))}</span>
      )}
      <span className="text-white font-semibold italic">. </span>
      <span className="text-slate-300 text-sm">{safeText(item.desc || item.description)}</span>
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
      <span className="text-white font-semibold italic">{safeText(item.name)}</span>
      {item.usage && (
        <span className="text-amber-400 text-xs ml-1">{safeText(formatUsage(item.usage))}</span>
      )}
      <span className="text-white font-semibold italic">. </span>
      <span className="text-slate-300 text-sm">{safeText(item.desc || item.description)}</span>

      {item.attack_bonus != null && (
        <div className="flex flex-wrap items-center gap-2 mt-1 ml-4">
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-700/40">
            +{safeText(item.attack_bonus)} to hit
          </span>
          {damage.map((d, di) => (
            <DamageBadge key={`dmg-${di}`} damage={d} />
          ))}
        </div>
      )}

      {item.dc && item.attack_bonus == null && (
        <div className="flex flex-wrap items-center gap-2 mt-1 ml-4">
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-700/40">
            DC {safeText(item.dc.dc_value)}{item.dc.dc_type?.name ? ` ${safeText(item.dc.dc_type.name)}` : ""}
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
  const diceStr = safeText(dice);
  const dtypeStr = safeText(dtype);
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
      {diceStr}{diceStr && dtypeStr ? " " : ""}{dtypeStr ? dtypeStr.toLowerCase() : ""}
    </span>
  );
}

const MONSTER_SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
const MONSTER_ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
  "Unaligned", "Any Alignment",
];
const MONSTER_CREATURE_TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon", "Elemental",
  "Fey", "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant", "Undead",
];
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const SAVE_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const SKILL_LIST = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
  "History", "Insight", "Intimidation", "Investigation", "Medicine",
  "Nature", "Perception", "Performance", "Persuasion", "Religion",
  "Sleight of Hand", "Stealth", "Survival",
];
const DAMAGE_TYPES = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
];
const CONDITION_LIST = [
  "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
];
const ACTION_DAMAGE_TYPES = DAMAGE_TYPES;

const BLANK_MONSTER_ACTION = {
  name: "",
  description: "",
  attack_bonus: "",
  damage: "",
  damage_type: "bludgeoning",
  reach: "5 ft.",
};

function NewMonsterDialog({ open, onClose, onSave, saving }) {
  const [name, setName] = useState("");
  const [size, setSize] = useState("Medium");
  const [creatureType, setCreatureType] = useState("Humanoid");
  const [alignment, setAlignment] = useState("True Neutral");
  const [cr, setCr] = useState("1");
  const [ac, setAc] = useState(12);
  const [hp, setHp] = useState("30 (4d8 + 12)");
  const [speed, setSpeed] = useState("30 ft.");
  const [stats, setStats] = useState({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  const [saves, setSaves] = useState([]);
  const [skills, setSkills] = useState([]);
  const [damageResistances, setDamageResistances] = useState([]);
  const [damageImmunities, setDamageImmunities] = useState([]);
  const [damageVulnerabilities, setDamageVulnerabilities] = useState([]);
  const [conditionImmunities, setConditionImmunities] = useState([]);
  const [senses, setSenses] = useState("");
  const [languages, setLanguages] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState([]);

  const reset = () => {
    setName(""); setSize("Medium"); setCreatureType("Humanoid");
    setAlignment("True Neutral"); setCr("1"); setAc(12);
    setHp("30 (4d8 + 12)"); setSpeed("30 ft.");
    setStats({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    setSaves([]); setSkills([]);
    setDamageResistances([]); setDamageImmunities([]);
    setDamageVulnerabilities([]); setConditionImmunities([]);
    setSenses(""); setLanguages(""); setImageUrl("");
    setDescription(""); setActions([]);
  };

  const toggleList = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const uploadImage = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch (err) {
      toast.error("Image upload failed.");
    }
  };

  const addAction = () => setActions((a) => [...a, { ...BLANK_MONSTER_ACTION }]);
  const updateAction = (idx, patch) => setActions((a) => a.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  const removeAction = (idx) => setActions((a) => a.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name the monster."); return; }
    // Combat reads monster.stats.* at runtime — mirror the full
    // stat block under `stats` so every downstream reader
    // (action bar, detail card, initiative picker) gets the
    // same shape it gets from SRD monsters.
    const statsBlob = {
      size, creature_type: creatureType, alignment,
      challenge_rating: cr.trim() || "0",
      cr: cr.trim() || "0",
      armor_class: Number(ac) || 10,
      hit_points: typeof hp === "string" ? hp : String(hp),
      speed: speed || "30 ft.",
      abilities: { ...stats },
      saves: saves.slice(),
      skills: skills.slice(),
      damage_resistances:    damageResistances.slice(),
      damage_immunities:     damageImmunities.slice(),
      damage_vulnerabilities: damageVulnerabilities.slice(),
      condition_immunities:  conditionImmunities.slice(),
      senses: senses.trim(),
      languages: languages.trim(),
      actions: actions
        .map((a) => ({
          name: (a.name || "").trim(),
          description: (a.description || "").trim(),
          attack_bonus: a.attack_bonus === "" ? null : Number(a.attack_bonus),
          damage: (a.damage || "").trim(),
          damage_type: a.damage_type || "bludgeoning",
          reach: (a.reach || "").trim(),
        }))
        .filter((a) => a.name),
    };
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      image_url: imageUrl || null,
      stats: statsBlob,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Custom Monster</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">

          <Section title="Identity">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0f1219] border-slate-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Challenge Rating</Label>
                <Input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="1/2, 5, 13"
                  className="bg-[#0f1219] border-slate-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONSTER_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-300">Creature Type</Label>
                <Select value={creatureType} onValueChange={setCreatureType}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONSTER_CREATURE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-300">Alignment</Label>
                <Select value={alignment} onValueChange={setAlignment}>
                  <SelectTrigger className="bg-[#0f1219] border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONSTER_ALIGNMENTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section title="Defense & Movement">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Armor Class</Label>
                <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)} className="bg-[#0f1219] border-slate-600 text-white mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-300">Hit Points (dice formula)</Label>
                <Input value={hp} onChange={(e) => setHp(e.target.value)} placeholder="e.g. 39 (6d8 + 12)"
                  className="bg-[#0f1219] border-slate-600 text-white mt-1" />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs text-slate-300">Speed</Label>
                <Input value={speed} onChange={(e) => setSpeed(e.target.value)} placeholder="30 ft., fly 60 ft., swim 40 ft."
                  className="bg-[#0f1219] border-slate-600 text-white mt-1" />
              </div>
            </div>
          </Section>

          <Section title="Ability Scores">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {ABILITY_KEYS.map((k) => (
                <div key={k}>
                  <Label className="text-[10px] text-slate-400 uppercase">{k}</Label>
                  <Input
                    type="number"
                    value={stats[k] ?? 10}
                    onChange={(e) => setStats((s) => ({ ...s, [k]: Number(e.target.value) || 0 }))}
                    className="bg-[#0f1219] border-slate-600 text-white mt-1 text-center"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Proficiencies">
            <ChipGrid label="Saving Throws" options={SAVE_KEYS} values={saves} onToggle={(v) => toggleList(saves, setSaves, v)} />
            <ChipGrid label="Skills"        options={SKILL_LIST} values={skills} onToggle={(v) => toggleList(skills, setSkills, v)} />
          </Section>

          <Section title="Damage & Conditions">
            <ChipGrid label="Damage Resistances"     options={DAMAGE_TYPES}  values={damageResistances}     onToggle={(v) => toggleList(damageResistances, setDamageResistances, v)} />
            <ChipGrid label="Damage Immunities"      options={DAMAGE_TYPES}  values={damageImmunities}      onToggle={(v) => toggleList(damageImmunities, setDamageImmunities, v)} />
            <ChipGrid label="Damage Vulnerabilities" options={DAMAGE_TYPES}  values={damageVulnerabilities} onToggle={(v) => toggleList(damageVulnerabilities, setDamageVulnerabilities, v)} />
            <ChipGrid label="Condition Immunities"   options={CONDITION_LIST} values={conditionImmunities}  onToggle={(v) => toggleList(conditionImmunities, setConditionImmunities, v)} />
          </Section>

          <Section title="Senses & Languages">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Senses</Label>
                <Input value={senses} onChange={(e) => setSenses(e.target.value)}
                  placeholder="darkvision 60 ft., passive Perception 14"
                  className="bg-[#0f1219] border-slate-600 text-white mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Languages</Label>
                <Input value={languages} onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Common, Draconic"
                  className="bg-[#0f1219] border-slate-600 text-white mt-1" />
              </div>
            </div>
          </Section>

          <Section title="Actions">
            <p className="text-[11px] text-slate-500 -mt-1">
              Attacks, abilities, breath weapons. These land on the combat action bar when the monster takes a turn.
            </p>
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div key={i} className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex-1">Action #{i + 1}</span>
                    <button type="button" onClick={() => removeAction(i)} className="p-1 text-red-400 hover:text-red-300" title="Remove">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-2">
                      <Label className="text-[10px] text-slate-400">Name</Label>
                      <Input value={a.name} onChange={(e) => updateAction(i, { name: e.target.value })}
                        placeholder="Bite, Breath Weapon, Multiattack"
                        className="bg-[#1E2430] border-slate-700 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Reach / Range</Label>
                      <Input value={a.reach} onChange={(e) => updateAction(i, { reach: e.target.value })}
                        placeholder="5 ft. / 30/120 ft."
                        className="bg-[#1E2430] border-slate-700 text-white mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-400">Attack Bonus</Label>
                      <Input type="number" value={a.attack_bonus}
                        onChange={(e) => updateAction(i, { attack_bonus: e.target.value })}
                        placeholder="+5"
                        className="bg-[#1E2430] border-slate-700 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Damage</Label>
                      <Input value={a.damage} onChange={(e) => updateAction(i, { damage: e.target.value })}
                        placeholder="2d6+4"
                        className="bg-[#1E2430] border-slate-700 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Damage Type</Label>
                      <Select value={a.damage_type} onValueChange={(v) => updateAction(i, { damage_type: v })}>
                        <SelectTrigger className="bg-[#1E2430] border-slate-700 text-white mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACTION_DAMAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400">Description</Label>
                    <Textarea value={a.description}
                      onChange={(e) => updateAction(i, { description: e.target.value })}
                      rows={2}
                      placeholder="What the action does in narrative terms."
                      className="bg-[#1E2430] border-slate-700 text-white mt-1" />
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addAction} className="mt-2">
              <Plus className="w-3 h-3 mr-1" /> Add Action
            </Button>
          </Section>

          <Section title="Portrait & Description">
            <div className="flex items-start gap-3">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover border border-slate-700" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-[#0f1219] border border-slate-700 flex items-center justify-center">
                  <Skull className="w-8 h-8 text-slate-500" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e.target.files?.[0])}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
          </Section>
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

function Section({ title, children }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#37F2D1] mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ChipGrid({ label, options, values, onToggle }) {
  return (
    <div>
      <Label className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</Label>
      <div className="flex flex-wrap gap-1 mt-1">
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors capitalize ${
                active
                  ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                  : "bg-[#050816] border-slate-700 text-slate-300 hover:border-[#37F2D1]/60"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
