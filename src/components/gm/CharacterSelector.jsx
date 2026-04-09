import React, { useState, useMemo } from "react";
import { X, Search, Filter, Users, Skull } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CR_OPTIONS = [
  { value: "all", label: "All CRs" },
  { value: "0-1", label: "CR 0-1" },
  { value: "2-4", label: "CR 2-4" },
  { value: "5-10", label: "CR 5-10" },
  { value: "11-16", label: "CR 11-16" },
  { value: "17+", label: "CR 17+" }
];

const SIZE_OPTIONS = [
  { value: "all", label: "All Sizes" },
  { value: "tiny", label: "Tiny" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "huge", label: "Huge" },
  { value: "gargantuan", label: "Gargantuan" }
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "aberration", label: "Aberration" },
  { value: "beast", label: "Beast" },
  { value: "celestial", label: "Celestial" },
  { value: "construct", label: "Construct" },
  { value: "dragon", label: "Dragon" },
  { value: "elemental", label: "Elemental" },
  { value: "fey", label: "Fey" },
  { value: "fiend", label: "Fiend" },
  { value: "giant", label: "Giant" },
  { value: "humanoid", label: "Humanoid" },
  { value: "monstrosity", label: "Monstrosity" },
  { value: "ooze", label: "Ooze" },
  { value: "plant", label: "Plant" },
  { value: "undead", label: "Undead" }
];

function parseCR(cr) {
  if (cr === undefined || cr === null) return 0;
  if (typeof cr === 'number') return cr;
  const str = String(cr);
  if (str.includes('/')) {
    const [num, denom] = str.split('/');
    return parseInt(num) / parseInt(denom);
  }
  return parseFloat(str) || 0;
}

function matchesCRFilter(cr, filter) {
  if (filter === "all") return true;
  const crValue = parseCR(cr);
  switch (filter) {
    case "0-1": return crValue >= 0 && crValue <= 1;
    case "2-4": return crValue >= 2 && crValue <= 4;
    case "5-10": return crValue >= 5 && crValue <= 10;
    case "11-16": return crValue >= 11 && crValue <= 16;
    case "17+": return crValue >= 17;
    default: return true;
  }
}

export default function CharacterSelector({ 
  isOpen, 
  onClose, 
  monsters = [], 
  npcs = [], 
  onSelect 
}) {
  const [activeTab, setActiveTab] = useState("monsters");
  const [searchQuery, setSearchQuery] = useState("");
  const [crFilter, setCrFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredMonsters = useMemo(() => {
    return monsters.filter(monster => {
      // Search filter
      if (searchQuery && !monster.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // CR filter
      if (!matchesCRFilter(monster.challenge_rating, crFilter)) {
        return false;
      }
      // Size filter
      if (sizeFilter !== "all" && monster.size?.toLowerCase() !== sizeFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== "all" && monster.type?.toLowerCase() !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [monsters, searchQuery, crFilter, sizeFilter, typeFilter]);

  const filteredNPCs = useMemo(() => {
    if (!searchQuery) return npcs;
    return npcs.filter(npc => 
      npc.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [npcs, searchQuery]);

  const handleSelect = (character, type) => {
    onSelect({ ...character, type });
    onClose();
    setSearchQuery("");
    setCrFilter("all");
    setSizeFilter("all");
    setTypeFilter("all");
  };

  const clearFilters = () => {
    setCrFilter("all");
    setSizeFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters = crFilter !== "all" || sizeFilter !== "all" || typeFilter !== "all";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-[#050816] rounded-3xl border-2 border-[#22c5f5]/30 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#111827]">
          <h2 className="text-2xl font-bold">Select Character</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1a1f2e] hover:bg-[#22c5f5]/20 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b border-[#111827]">
            <TabsList className="bg-[#1a1f2e] p-1 rounded-xl">
              <TabsTrigger 
                value="monsters" 
                className="data-[state=active]:bg-[#22c5f5] data-[state=active]:text-white rounded-lg px-6 py-2 flex items-center gap-2"
              >
                <Skull className="w-4 h-4" />
                Monsters ({monsters.length})
              </TabsTrigger>
              <TabsTrigger 
                value="npcs"
                className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-black rounded-lg px-6 py-2 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                NPCs ({npcs.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-[#111827] space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === "monsters" ? "Search monsters..." : "Search NPCs..."}
                  className="w-full bg-[#1a1f2e] border border-[#111827] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#22c5f5] transition-colors"
                />
              </div>
              
              {activeTab === "monsters" && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-[#22c5f5] text-white'
                      : 'bg-[#1a1f2e] border border-[#111827] hover:border-[#22c5f5]'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-5 h-5 rounded-full bg-white text-[#22c5f5] text-xs flex items-center justify-center font-bold">
                      {[crFilter, sizeFilter, typeFilter].filter(f => f !== "all").length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Monster Filters */}
            {activeTab === "monsters" && showFilters && (
              <div className="flex gap-3 flex-wrap items-center">
                <Select value={crFilter} onValueChange={setCrFilter}>
                  <SelectTrigger className="w-32 bg-[#1a1f2e] border-[#111827]">
                    <SelectValue placeholder="CR" />
                  </SelectTrigger>
                  <SelectContent>
                    {CR_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-32 bg-[#1a1f2e] border-[#111827]">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-36 bg-[#1a1f2e] border-[#111827]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#22c5f5] hover:text-[#38bdf8] transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <TabsContent value="monsters" className="m-0 p-6">
              {filteredMonsters.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredMonsters.map(monster => (
                    <CharacterCard
                      key={monster.id}
                      character={monster}
                      type="monster"
                      onClick={() => handleSelect(monster, 'monster')}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  message={searchQuery || hasActiveFilters ? "No monsters match your filters" : "No monsters in this campaign"}
                  onClear={hasActiveFilters ? clearFilters : undefined}
                />
              )}
            </TabsContent>

            <TabsContent value="npcs" className="m-0 p-6">
              {filteredNPCs.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredNPCs.map(npc => (
                    <CharacterCard
                      key={npc.id}
                      character={npc}
                      type="npc"
                      onClick={() => handleSelect(npc, 'npc')}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  message={searchQuery ? "No NPCs match your search" : "No NPCs in this campaign"}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050816;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}

function CharacterCard({ character, type, onClick }) {
  const imageUrl = character.image_url || character.avatar_url;
  const isMonster = type === 'monster';

  return (
    <button
      onClick={onClick}
      className="bg-[#1a1f2e] rounded-xl overflow-hidden hover:ring-2 hover:ring-[#22c5f5] transition-all text-left group"
    >
      <div className="relative h-36 bg-[#0b1220]">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={character.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-600">
            {isMonster ? '👹' : '👤'}
          </div>
        )}
        
        {/* Type badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isMonster ? 'bg-red-500/80 text-white' : 'bg-[#37F2D1]/80 text-black'
        }`}>
          {isMonster ? 'Monster' : 'NPC'}
        </div>
      </div>

      <div className="p-3 space-y-1">
        <h3 className="text-white font-bold text-sm truncate">{character.name}</h3>
        
        {isMonster ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-[#111827]">
              CR {character.challenge_rating ?? '?'}
            </span>
            {character.size && (
              <span className="capitalize">{character.size}</span>
            )}
            {character.type && (
              <span className="capitalize truncate">{character.type}</span>
            )}
          </div>
        ) : (
          <p className="text-slate-400 text-xs truncate">
            {character.description?.slice(0, 50) || 'No description'}
          </p>
        )}

        {/* Quick stats for monsters */}
        {isMonster && character.stats && (
          <div className="flex gap-2 text-[10px] text-slate-500 pt-1">
            {character.stats.armor_class && (
              <span>AC {character.stats.armor_class}</span>
            )}
            {character.stats.hit_points && (
              <span>HP {character.stats.hit_points}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyState({ message, onClear }) {
  return (
    <div className="text-center py-16">
      <p className="text-slate-400 mb-4">{message}</p>
      {onClear && (
        <button
          onClick={onClear}
          className="text-[#22c5f5] hover:text-[#38bdf8] text-sm transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}