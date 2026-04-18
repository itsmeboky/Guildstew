import React, { useState } from "react";
import { X, Plus, Package, Wand2, Save, Trash2, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { allItemsWithEnchanted, itemIcons } from "@/components/dnd5e/itemData";
import { spellIcons, spellDetails } from "@/components/dnd5e/spellData";
import { enrichMonster } from "./monsterEnrichment";
import { readCombatQueue, writeCombatQueue, FACTION_STYLES, FACTIONS } from "@/utils/combatQueue";
import { normalizeHp } from "@/components/combat/hpColor";
import { base44 } from "@/api/base44Client";

const SAVED_LOADOUTS_KEY = 'gm_saved_monster_loadouts';

/**
 * Append `monsterId` to `campaigns.encountered_monsters` so the
 * Monster Compendium reveals it. Idempotent: the server load plus a
 * local dedupe skip the write when the ID is already present.
 */
async function markMonsterEncountered(campaignId, monsterId) {
  const rows = await base44.entities.Campaign.filter({ id: campaignId });
  const campaign = rows?.[0];
  if (!campaign) return;
  const current = Array.isArray(campaign.encountered_monsters)
    ? campaign.encountered_monsters
    : [];
  if (current.includes(monsterId)) return;
  await base44.entities.Campaign.update(campaignId, {
    encountered_monsters: [...current, monsterId],
  });
}

export default function CombatQueue({
  monsters,
  npcs,
  onSelectMonster,
  onCreateNpc,
  campaignId
}) {
  // Use the shared combat-queue helper so localStorage key + legacy
  // migration live in one place.
  const [queue, setQueue] = useState(() => readCombatQueue(campaignId));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMonster, setEditingMonster] = useState(null);
  const [savedLoadouts, setSavedLoadouts] = useState(() => {
    const saved = localStorage.getItem(`${SAVED_LOADOUTS_KEY}_${campaignId}`);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse saved loadouts", e);
      return [];
    }
  });
  const [scrollPosition, setScrollPosition] = useState(0);

  const saveQueue = (newQueue) => {
    setQueue(newQueue);
    writeCombatQueue(campaignId, newQueue);
  };

  const addToQueue = (creature, options = {}) => {
    const { quantity = 1, level, faction = 'enemy', charmDuration = null } = options;

    // Calculate how many we can add
    const canAddCount = Math.min(quantity, 12 - queue.length);
    if (canAddCount <= 0) return;

    // Pokédex-style unlock: any monster (not NPC) added to the combat
    // queue flips the campaign's encountered_monsters array so players
    // can see its bestiary entry. Fire-and-forget — a network failure
    // here should not block the combat flow.
    if (campaignId && creature?.id && creature?.type !== 'npc') {
      markMonsterEncountered(campaignId, creature.id).catch(() => {});
    }

    const newCombatants = [];
    for (let i = 0; i < canAddCount; i++) {
      const baseCreature = { ...creature };
      if (level) {
        baseCreature.level = level;
        if (baseCreature.stats) baseCreature.stats.level = level;
      }

      const enriched = enrichMonster(baseCreature);

      // Normalize HP from whatever shape the source gave us into the
      // canonical { current, max, temporary } PC shape so the HP bar
      // renderers can read a single path. Handles SRD monster strings
      // ("135 (18d10 + 36)") and nested stats.hit_points variants.
      const normalizedHp = normalizeHp(enriched);

      const queued = {
        ...enriched,
        hit_points: normalizedHp,
        queueId: Date.now() + i, // unique IDs per creature in the queue
        inventory: enriched.inventory || [],
        spells: enriched.spells || [],
        equipped: enriched.equipped || {},
        // Faction + charm metadata. Empty charmDuration means the
        // friendly status is permanent (summon, ranger companion,
        // standing NPC ally, etc.).
        faction,
        originalFaction: faction === 'ally' && charmDuration ? 'enemy' : faction,
        charmDuration:
          faction === 'ally' && charmDuration ? Number(charmDuration) : null,
      };
      newCombatants.push(queued);
    }

    saveQueue([...queue, ...newCombatants]);
    setShowAddDialog(false);
  };

  const removeFromQueue = (queueId) => {
    saveQueue(queue.filter(m => m.queueId !== queueId));
  };

  const updateQueuedMonster = (queueId, updates) => {
    saveQueue(queue.map(m => m.queueId === queueId ? { ...m, ...updates } : m));
  };

  const saveLoadout = (monster) => {
    const loadout = {
      id: Date.now(),
      name: `${monster.name} Loadout`,
      baseCreatureId: monster.id,
      inventory: monster.inventory,
      spells: monster.spells,
      equipped: monster.equipped
    };
    const newLoadouts = [...savedLoadouts, loadout];
    setSavedLoadouts(newLoadouts);
    localStorage.setItem(`${SAVED_LOADOUTS_KEY}_${campaignId}`, JSON.stringify(newLoadouts));
  };

  const applyLoadout = (monster, loadout) => {
    updateQueuedMonster(monster.queueId, {
      inventory: loadout.inventory,
      spells: loadout.spells,
      equipped: loadout.equipped
    });
  };

  const visibleCount = 6;
  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollPosition + visibleCount < queue.length;

  return (
    <div className="rounded-[20px] bg-[#050816]/95 shadow-[0_14px_40px_rgba(0,0,0,0.7)] overflow-hidden">
      <div className="px-4 pt-2.5 pb-2 border-b border-[#111827] flex items-center justify-between">
        <span className="text-[10px] tracking-[0.22em] uppercase text-slate-300">Combat Queue ({queue.length}/12)</span>
        <button
          onClick={() => setShowAddDialog(true)}
          disabled={queue.length >= 12}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#22c5f5]/20 hover:bg-[#22c5f5]/30 text-[#22c5f5] text-[10px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      <div className="px-4 py-3">
        {queue.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-slate-500 text-[11px]">Combat queue is empty. Add monsters, NPCs, or allies to prep for combat.</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {canScrollLeft && (
              <button
                onClick={() => setScrollPosition(Math.max(0, scrollPosition - 1))}
                className="w-6 h-12 bg-[#0b1220] hover:bg-[#111827] rounded-lg flex items-center justify-center flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            )}
            
            <div className="flex gap-2 overflow-hidden flex-1">
              {queue.slice(scrollPosition, scrollPosition + visibleCount).map((monster) => {
                const factionKey = monster.faction || 'enemy';
                const style = FACTION_STYLES[factionKey] || FACTION_STYLES.enemy;
                return (
                <div
                  key={monster.queueId}
                  className="relative group"
                >
                  <button
                    onClick={() => onSelectMonster({ ...monster, type: monster.type || 'monster' })}
                    className={`w-14 h-14 rounded-xl bg-[#0b1220] border-2 ${style.outline} hover:brightness-125 overflow-hidden transition-all flex-shrink-0`}
                  >
                    {monster.image_url || monster.avatar_url ? (
                      <img 
                        src={monster.image_url || monster.avatar_url} 
                        alt={monster.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                        {monster.name?.charAt(0)}
                      </div>
                    )}
                    {(monster.inventory?.length > 0 || monster.spells?.length > 0) && (
                      <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-[#37F2D1] rounded-full flex items-center justify-center">
                        <span className="text-[7px] text-[#050816] font-bold">✓</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Hover actions */}
                  <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingMonster(monster); }}
                      className="w-4 h-4 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center"
                      title="Edit loadout"
                    >
                      <Package className="w-2.5 h-2.5 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(monster.queueId); }}
                      className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center"
                      title="Remove"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                  
                  {/* Faction + charm badge */}
                  {monster.charmDuration != null && (
                    <div
                      className={`absolute -bottom-1 -left-1 px-1 py-[1px] rounded-full text-[8px] font-bold ${style.pillStrong}`}
                      title={`${style.label} — ${monster.charmDuration} turn${monster.charmDuration === 1 ? '' : 's'} left`}
                    >
                      ×{monster.charmDuration}
                    </div>
                  )}

                  {/* Name tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className={`px-2 py-1 rounded text-[9px] whitespace-nowrap ${style.pill} border ${style.outline}`}>
                      {monster.name}
                      <span className="ml-1 opacity-80">({style.label})</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {canScrollRight && (
              <button
                onClick={() => setScrollPosition(Math.min(queue.length - visibleCount, scrollPosition + 1))}
                className="w-6 h-12 bg-[#0b1220] hover:bg-[#111827] rounded-lg flex items-center justify-center flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Monster Dialog */}
      {showAddDialog && (
        <AddMonsterDialog
          monsters={monsters}
          npcs={npcs}
          onAdd={addToQueue}
          onClose={() => setShowAddDialog(false)}
          onCreateNpc={onCreateNpc}
        />
      )}

      {/* Edit Monster Loadout Dialog */}
      {editingMonster && (
        <EditLoadoutDialog
          monster={editingMonster}
          savedLoadouts={savedLoadouts.filter(l => l.baseCreatureId === editingMonster.id)}
          onUpdate={(updates) => {
            updateQueuedMonster(editingMonster.queueId, updates);
            setEditingMonster({ ...editingMonster, ...updates });
          }}
          onSaveLoadout={() => saveLoadout(editingMonster)}
          onApplyLoadout={(loadout) => applyLoadout(editingMonster, loadout)}
          onClose={() => setEditingMonster(null)}
        />
      )}
    </div>
  );
}

function AddMonsterDialog({ monsters, npcs, onAdd, onClose, onCreateNpc }) {
  const [tab, setTab] = useState('monsters');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customLevel, setCustomLevel] = useState('');
  const [faction, setFaction] = useState('enemy');
  const [charmTurns, setCharmTurns] = useState('');

  const filtered = (tab === 'monsters' ? monsters : npcs).filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ ...selected, type: tab === 'monsters' ? 'monster' : 'npc' }, {
      quantity: Math.max(1, parseInt(quantity) || 1),
      level: customLevel || undefined,
      faction,
      charmDuration: faction === 'ally' && charmTurns ? Math.max(1, parseInt(charmTurns) || 0) : null,
    });
  };

  if (selected) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
        <div className="bg-[#050816] rounded-2xl border border-[#22c5f5]/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-md w-full overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#111827]">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h3 className="text-lg font-bold truncate max-w-[200px]">{selected.name}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1f2e] hover:bg-[#22c5f5]/20 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex justify-center">
              {selected.image_url || selected.avatar_url ? (
                <img src={selected.image_url || selected.avatar_url} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-lg border border-[#111827]" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-[#111827] flex items-center justify-center text-slate-600 text-2xl font-bold">
                  {selected.name?.charAt(0)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Quantity</label>
                <div className="flex items-center h-10 bg-[#1a1f2e] rounded-lg border border-[#111827] px-1">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="flex-1 bg-transparent text-center text-white text-sm font-bold focus:outline-none"
                  />
                  <button 
                    onClick={() => setQuantity(Math.min(12, quantity + 1))}
                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Level / CR</label>
                <input
                  type="text"
                  value={customLevel}
                  onChange={(e) => setCustomLevel(e.target.value)}
                  placeholder={selected.challenge_rating || selected.level || "1"}
                  className="w-full h-10 bg-[#1a1f2e] rounded-lg border border-[#111827] px-3 text-sm text-white focus:outline-none focus:border-[#22c5f5]"
                />
              </div>
            </div>

            {/* Faction picker — enemy / ally / neutral. Player is reserved
                for real PC entries and isn't selectable here. */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Faction</label>
              <div className="grid grid-cols-3 gap-2">
                {FACTIONS.map((f) => {
                  const style = FACTION_STYLES[f];
                  const active = faction === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFaction(f)}
                      className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border-2 ${
                        active
                          ? `${style.pillStrong} ${style.outline} shadow-[0_0_14px_rgba(0,0,0,0.5)]`
                          : `${style.pill} border-transparent hover:${style.outline}`
                      }`}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Charm duration — only meaningful for allies. Blank means
                permanent (summoned creature, ongoing ally NPC). */}
            {faction === 'ally' && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Charmed for how many turns?
                </label>
                <input
                  type="number"
                  min="1"
                  value={charmTurns}
                  onChange={(e) => setCharmTurns(e.target.value)}
                  placeholder="Leave blank for permanent"
                  className="w-full h-10 bg-[#1a1f2e] rounded-lg border border-[#111827] px-3 text-sm text-white focus:outline-none focus:border-[#22c55e]"
                />
                <p className="text-[10px] text-slate-500 italic">
                  When the counter hits 0 they revert to Enemy.
                </p>
              </div>
            )}

            <button
              onClick={handleAdd}
              className="w-full py-3 rounded-xl bg-[#22c5f5] hover:bg-[#38bdf8] text-[#050816] font-bold shadow-lg shadow-[#22c5f5]/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              Add to Combat Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
      <div className="bg-[#050816] rounded-2xl border border-[#22c5f5]/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-md w-full max-h-[70vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#111827]">
          <h3 className="text-lg font-bold">Add to Combat Queue</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1f2e] hover:bg-[#22c5f5]/20 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('monsters')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'monsters' ? 'bg-[#22c5f5] text-white' : 'bg-[#1a1f2e] text-slate-400 hover:text-white'}`}
            >
              Monsters ({monsters.length})
            </button>
            <button
              onClick={() => setTab('npcs')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'npcs' ? 'bg-[#22c5f5] text-white' : 'bg-[#1a1f2e] text-slate-400 hover:text-white'}`}
            >
              NPCs ({npcs.length})
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#1a1f2e] border border-[#111827] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#22c5f5]"
          />

          {/* Quick-create NPC shortcut — only shown on the NPC tab.
              The parent hands us a callback that navigates to the
              Character Creator in NPC mode for the current campaign. */}
          {tab === 'npcs' && typeof onCreateNpc === 'function' && (
            <button
              type="button"
              onClick={() => {
                onCreateNpc();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#22c55e]/15 hover:bg-[#22c55e]/25 border border-[#22c55e]/40 text-[#22c55e] text-xs font-bold uppercase tracking-wide transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create New NPC
            </button>
          )}

          <div className="max-h-[40vh] overflow-y-auto space-y-2 custom-scrollbar">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-500 py-4 text-sm">No {tab} found</p>
            ) : (
              filtered.map((creature) => (
                <button
                  key={creature.id}
                  onClick={() => {
                    setSelected(creature);
                    setCustomLevel(creature.challenge_rating || creature.level || '');
                    setQuantity(1);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0b1220] border border-[#111827] hover:border-[#22c5f5]/50 transition-all text-left"
                >
                  {creature.image_url || creature.avatar_url ? (
                    <img src={creature.image_url || creature.avatar_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#111827] flex items-center justify-center text-slate-600">?</div>
                  )}
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{creature.name}</p>
                    <p className="text-xs text-slate-400">
                      {creature.challenge_rating ? `CR ${creature.challenge_rating}` : creature.type || 'NPC'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditLoadoutDialog({ monster, savedLoadouts, onUpdate, onSaveLoadout, onApplyLoadout, onClose }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [spellSearch, setSpellSearch] = useState('');

  const filteredItems = React.useMemo(() => {
    return allItemsWithEnchanted.filter(item => {
      if (searchQuery && !item.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    }).slice(0, 50);
  }, [searchQuery, categoryFilter]);

  const allSpellNames = Object.keys(spellDetails);
  const filteredSpells = allSpellNames.filter(name => 
    name.toLowerCase().includes(spellSearch.toLowerCase())
  ).slice(0, 30);

  const addItem = (item) => {
    const existing = monster.inventory.find(i => i.name === item.name);
    if (existing) {
      onUpdate({ inventory: monster.inventory.map(i => i.name === item.name ? { ...i, quantity: (i.quantity || 1) + 1 } : i) });
    } else {
      onUpdate({ inventory: [...monster.inventory, { ...item, image_url: itemIcons[item.name], quantity: 1 }] });
    }
  };

  const removeItem = (itemName) => {
    onUpdate({ inventory: monster.inventory.filter(i => i.name !== itemName) });
  };

  const addSpell = (spellName) => {
    if (!monster.spells.includes(spellName)) {
      onUpdate({ spells: [...monster.spells, spellName] });
    }
  };

  const removeSpell = (spellName) => {
    onUpdate({ spells: monster.spells.filter(s => s !== spellName) });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
      <div className="bg-[#050816] rounded-3xl border-2 border-amber-500/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-3xl w-full max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#111827]">
          <div className="flex items-center gap-3">
            {monster.image_url || monster.avatar_url ? (
              <img src={monster.image_url || monster.avatar_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#111827] flex items-center justify-center text-slate-600">?</div>
            )}
            <div>
              <h2 className="text-lg font-bold">{monster.name}</h2>
              <p className="text-xs text-slate-400">Edit loadout</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSaveLoadout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#37F2D1]/20 hover:bg-[#37F2D1]/30 text-[#37F2D1] text-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Loadout
            </button>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#1a1f2e] hover:bg-amber-500/20 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Saved Loadouts */}
        {savedLoadouts.length > 0 && (
          <div className="px-5 py-3 border-b border-[#111827] bg-[#0b1220]/50">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Saved Loadouts</p>
            <div className="flex gap-2 flex-wrap">
              {savedLoadouts.map(loadout => (
                <button
                  key={loadout.id}
                  onClick={() => onApplyLoadout(loadout)}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#111827] hover:border-[#37F2D1]/50 text-sm text-white transition-colors"
                >
                  {loadout.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-3 border-b border-[#111827]">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'inventory' ? 'bg-amber-500 text-white' : 'bg-[#1a1f2e] text-slate-400 hover:text-white'}`}
          >
            <Package className="w-4 h-4" />
            Inventory ({monster.inventory.length})
          </button>
          <button
            onClick={() => setActiveTab('spells')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'spells' ? 'bg-purple-500 text-white' : 'bg-[#1a1f2e] text-slate-400 hover:text-white'}`}
          >
            <Wand2 className="w-4 h-4" />
            Spells ({monster.spells.length})
          </button>
        </div>

        <div className="p-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              {/* Current Inventory */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Current Items</h3>
                {monster.inventory.length === 0 ? (
                  <p className="text-slate-500 text-sm">No items</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {monster.inventory.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#1a1f2e] rounded-lg px-3 py-1.5 text-sm border border-[#111827]">
                        {item.image_url && <img src={item.image_url} alt="" className="w-5 h-5 rounded object-cover" />}
                        <span className="text-white">{item.name}</span>
                        {item.quantity > 1 && <span className="text-[#37F2D1] text-xs">x{item.quantity}</span>}
                        <button onClick={() => removeItem(item.name)} className="text-red-400 hover:text-red-300 ml-1">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Items */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="flex-1 bg-[#1a1f2e] border border-[#111827] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#1a1f2e] border border-[#111827] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All</option>
                    <option value="weapons">Weapons</option>
                    <option value="armor">Armor</option>
                    <option value="adventuringGear">Gear</option>
                    <option value="magic">Magic</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {filteredItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => addItem(item)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#0b1220] border border-[#111827] hover:border-amber-500/50 transition-all text-left"
                    >
                      {itemIcons[item.name] ? (
                        <img src={itemIcons[item.name]} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[#111827] flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-slate-600" />
                        </div>
                      )}
                      <span className="text-white text-xs truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'spells' && (
            <div className="space-y-4">
              {/* Current Spells */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Known Spells</h3>
                {monster.spells.length === 0 ? (
                  <p className="text-slate-500 text-sm">No spells</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {monster.spells.map((spellName, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#1a1f2e] rounded-lg px-3 py-1.5 text-sm border border-purple-500/30">
                        {spellIcons[spellName] && <img src={spellIcons[spellName]} alt="" className="w-5 h-5 rounded object-cover" />}
                        <span className="text-white">{spellName}</span>
                        <button onClick={() => removeSpell(spellName)} className="text-red-400 hover:text-red-300 ml-1">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Spells */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={spellSearch}
                  onChange={(e) => setSpellSearch(e.target.value)}
                  placeholder="Search spells..."
                  className="w-full bg-[#1a1f2e] border border-[#111827] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />

                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {filteredSpells.map((spellName, idx) => (
                    <button
                      key={idx}
                      onClick={() => addSpell(spellName)}
                      disabled={monster.spells.includes(spellName)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                        monster.spells.includes(spellName) 
                          ? 'bg-purple-500/20 border-purple-500/50 opacity-50 cursor-not-allowed' 
                          : 'bg-[#0b1220] border-[#111827] hover:border-purple-500/50'
                      }`}
                    >
                      {spellIcons[spellName] ? (
                        <img src={spellIcons[spellName]} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center flex-shrink-0">
                          <Wand2 className="w-4 h-4 text-purple-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-xs block truncate">{spellName}</span>
                        {spellDetails[spellName] && (
                          <span className="text-[9px] text-slate-500">{spellDetails[spellName].level}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#111827] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-[#22c5f5] hover:bg-[#38bdf8] text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}