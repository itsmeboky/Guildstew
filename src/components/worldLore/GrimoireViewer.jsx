import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search, BookOpen, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { safeText } from "@/utils/safeRender";

const SCHOOL_COLORS = {
  abjuration: "#3B82F6",
  conjuration: "#10B981",
  divination: "#8B5CF6",
  enchantment: "#EC4899",
  evocation: "#EF4444",
  illusion: "#06B6D4",
  necromancy: "#6366F1",
  transmutation: "#F59E0B"
};

export default function GrimoireViewer({ spells, entries, canEdit, onSelectSpell, onDelete }) {
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleSpells = canEdit 
    ? spells 
    : spells.filter(s => s.discovered);

  const filteredSpells = visibleSpells.filter(spell => {
    const matchesSearch = spell.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = filterSchool === "all" || spell.school === filterSchool;
    const matchesLevel = filterLevel === "all" || spell.level === parseInt(filterLevel);
    return matchesSearch && matchesSchool && matchesLevel;
  });

  const groupedByLevel = filteredSpells.reduce((acc, spell) => {
    const level = spell.level === 0 ? "Cantrips" : `Level ${spell.level}`;
    if (!acc[level]) acc[level] = [];
    acc[level].push(spell);
    return acc;
  }, {});

  const linkedEntry = selectedSpell && entries?.find(e => e.id === selectedSpell.entry_id);

  const getComponents = (components) => {
    if (!components) return "";
    const parts = [];
    if (components.verbal) parts.push("V");
    if (components.somatic) parts.push("S");
    if (components.material) parts.push("M");
    return parts.join(", ");
  };

  return (
    <div className="space-y-4">
      {/* Grimoire Header */}
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-[#37F2D1] flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Grimoire
          </h2>
          {canEdit && (
            <button
              onClick={() => onSelectSpell({})}
              className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
              style={{ backgroundColor: '#37F2D1' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
            >
              <Sparkles className="w-4 h-4" />
              New Spell
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spells..."
              className="bg-[#1E2430] border-gray-700 text-white pl-10"
            />
          </div>

          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="bg-[#1E2430] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">All Schools</option>
            {SCHOOL_COLORS && Object.keys(SCHOOL_COLORS).map(school => (
              <option key={school} value={school}>
                {school.charAt(0).toUpperCase() + school.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-[#1E2430] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">All Levels</option>
            <option value="0">Cantrips</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Spell List */}
      <div className="space-y-6">
        {Object.entries(groupedByLevel).sort((a, b) => {
          const aLevel = a[0] === "Cantrips" ? -1 : parseInt(a[0].split(" ")[1]);
          const bLevel = b[0] === "Cantrips" ? -1 : parseInt(b[0].split(" ")[1]);
          return aLevel - bLevel;
        }).map(([levelLabel, levelSpells]) => (
          <div key={levelLabel} className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
              {levelLabel}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {levelSpells.map((spell) => (
                <motion.div
                  key={spell.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50 hover:border-cyan-400/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedSpell(spell)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-white group-hover:text-[#37F2D1] transition-colors">
                        {safeText(spell.name)}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{
                            backgroundColor: `${SCHOOL_COLORS[spell.school]}20`,
                            color: SCHOOL_COLORS[spell.school]
                          }}
                        >
                          {safeText(spell.school)}
                        </span>
                        {!spell.discovered && canEdit && (
                          <span className="text-xs text-yellow-500">Hidden</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSpell(spell);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-[#37F2D1] h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${spell.name}?`)) {
                              onDelete(spell.id);
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-400 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {spell.casting_time} • {spell.range}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {filteredSpells.length === 0 && (
          <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-12 border border-gray-700 text-center">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {searchQuery || filterSchool !== "all" || filterLevel !== "all" 
                ? "No spells match your filters" 
                : canEdit ? "The grimoire awaits its first spell..." : "No spells discovered yet..."}
            </p>
          </div>
        )}
      </div>

      {/* Selected Spell Details */}
      {selectedSpell && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-3xl font-bold text-white mb-2">{selectedSpell.name}</h3>
              <div className="flex items-center gap-2">
                <span 
                  className="text-sm px-3 py-1 rounded font-semibold"
                  style={{ 
                    backgroundColor: `${SCHOOL_COLORS[selectedSpell.school]}20`,
                    color: SCHOOL_COLORS[selectedSpell.school]
                  }}
                >
                  {selectedSpell.school}
                </span>
                <span className="text-sm text-gray-400">
                  {selectedSpell.level === 0 ? 'Cantrip' : `Level ${selectedSpell.level}`}
                </span>
              </div>
            </div>
            <Button
              onClick={() => setSelectedSpell(null)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Casting Time</div>
              <div className="text-white font-semibold">{selectedSpell.casting_time}</div>
            </div>
            <div className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Range</div>
              <div className="text-white font-semibold">{selectedSpell.range}</div>
            </div>
            <div className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Components</div>
              <div className="text-white font-semibold">{getComponents(selectedSpell.components)}</div>
            </div>
            <div className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Duration</div>
              <div className="text-white font-semibold">{selectedSpell.duration}</div>
            </div>
          </div>

          {selectedSpell.components?.material && selectedSpell.components.materials_needed && (
            <div className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50 mb-4">
              <div className="text-gray-400 text-xs mb-1">Materials</div>
              <div className="text-white text-sm">{selectedSpell.components.materials_needed}</div>
            </div>
          )}

          <div className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50 mb-4">
            <p className="text-gray-300 whitespace-pre-wrap">{selectedSpell.description}</p>
          </div>

          {selectedSpell.at_higher_levels && (
            <div className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50 mb-4">
              <div className="text-[#37F2D1] font-semibold text-sm mb-2">At Higher Levels</div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedSpell.at_higher_levels}</p>
            </div>
          )}

          {linkedEntry && (
            <div className="bg-[#1E2430] rounded-lg p-4 border border-cyan-400/30">
              <h4 className="text-lg font-semibold text-[#37F2D1] mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Related Lore: {linkedEntry.title}
              </h4>
              <div 
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: linkedEntry.content || '<p class="text-gray-400">No lore written yet.</p>' }}
              />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}