import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Church, Eye, EyeOff, Edit, Trash2, TrendingUp, Target, Package, Users as UsersIcon } from "lucide-react";
import { motion } from "framer-motion";
import { safeText } from "@/utils/safeRender";

const SECT_TYPE_COLORS = {
  religious_order: "#8b5cf6",
  cult: "#dc2626",
  monastery: "#10b981",
  church: "#3b82f6",
  temple: "#f59e0b",
  brotherhood: "#6366f1",
  secret_society: "#6b7280",
  other: "#6b7280"
};

const INFLUENCE_COLORS = {
  minimal: "#6b7280",
  local: "#3b82f6",
  regional: "#8b5cf6",
  national: "#f59e0b",
  continental: "#ef4444",
  global: "#dc2626"
};

export default function SectViewer({ sects, entries, characters, npcs, canEdit, onSelectSect, onDeleteSect }) {
  const [selectedSect, setSelectedSect] = useState(null);

  const visibleSects = canEdit ? sects : sects.filter(s => s.discovered);
  const linkedEntry = selectedSect && entries?.find(e => e.id === selectedSect.entry_id);

  const getCharacterName = (characterId) => {
    return characters?.find(c => c.id === characterId)?.name || "Unknown";
  };

  const getNPCData = (npcId) => {
    return npcs?.find(n => n.id === npcId);
  };

  return (
    <div className="space-y-6">
      {/* Sect Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSects.map(sect => {
          const typeColor = SECT_TYPE_COLORS[sect.type] || SECT_TYPE_COLORS.other;
          const influenceColor = INFLUENCE_COLORS[sect.influence_level] || INFLUENCE_COLORS.local;

          return (
            <motion.div
              key={sect.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border cursor-pointer transition-all hover:border-[#37F2D1] ${
                selectedSect?.id === sect.id 
                  ? 'border-[#37F2D1] ring-2 ring-[#37F2D1]/20' 
                  : 'border-cyan-400/30'
              } ${!sect.discovered && canEdit ? 'opacity-60' : ''}`}
              onClick={() => setSelectedSect(sect)}
            >
              {sect.symbol_url && (
                <div className="w-full h-24 bg-[#1E2430] flex items-center justify-center p-4">
                  <img 
                    src={sect.symbol_url} 
                    alt={sect.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {sect.name}
                      {!sect.discovered && canEdit && (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      )}
                    </h3>
                    {sect.motto && (
                      <p className="text-sm text-gray-400 italic mt-1">"{sect.motto}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <span 
                    className="text-xs px-2 py-1 rounded font-semibold"
                    style={{ backgroundColor: typeColor, color: 'white' }}
                  >
                    {sect.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span 
                    className="text-xs px-2 py-1 rounded font-semibold"
                    style={{ backgroundColor: influenceColor, color: 'white' }}
                  >
                    {sect.influence_level.toUpperCase()}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {visibleSects.length === 0 && (
        <div className="text-center py-12">
          <Church className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">
            {canEdit ? "No sects created yet. Build your world's religious organizations!" : "No known sects at this time..."}
          </p>
        </div>
      )}

      {/* Selected Sect Details */}
      {selectedSect && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border border-cyan-400/30"
        >
          {selectedSect.symbol_url && (
            <div className="w-full h-40 bg-[#1E2430] flex items-center justify-center p-8">
              <img 
                src={selectedSect.symbol_url} 
                alt={selectedSect.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">{selectedSect.name}</h2>
                {selectedSect.motto && (
                  <p className="text-lg text-gray-400 italic mt-1">"{selectedSect.motto}"</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span 
                    className="text-sm px-3 py-1 rounded-lg font-semibold"
                    style={{ backgroundColor: SECT_TYPE_COLORS[selectedSect.type], color: 'white' }}
                  >
                    {selectedSect.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span 
                    className="text-sm px-3 py-1 rounded-lg font-semibold"
                    style={{ backgroundColor: INFLUENCE_COLORS[selectedSect.influence_level], color: 'white' }}
                  >
                    {selectedSect.influence_level.toUpperCase()} INFLUENCE
                  </span>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    onClick={(e) => { e.stopPropagation(); onSelectSect(selectedSect); }}
                    size="sm"
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); onDeleteSect(selectedSect.id); }}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {selectedSect.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">About</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedSect.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedSect.tenets && selectedSect.tenets.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Core Tenets
                  </h4>
                  <ul className="space-y-2">
                    {selectedSect.tenets.map((tenet, idx) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-[#37F2D1] mt-1">•</span>
                        <span>{tenet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSect.resources && selectedSect.resources.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Resources
                  </h4>
                  <ul className="space-y-2">
                    {selectedSect.resources.map((resource, idx) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-[#37F2D1] mt-1">•</span>
                        <span>{resource}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {selectedSect.hierarchy && selectedSect.hierarchy.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Organizational Hierarchy
                </h4>
                <div className="space-y-2">
                  {selectedSect.hierarchy.sort((a, b) => parseInt(a.rank) - parseInt(b.rank)).map((h, idx) => (
                    <div key={idx} className="bg-[#1E2430] rounded-lg p-3 border-l-4 border-[#37F2D1]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#37F2D1] font-bold text-sm">#{h.rank}</span>
                        <span className="text-white font-semibold">{h.title}</span>
                      </div>
                      {h.description && (
                        <p className="text-sm text-gray-400">{h.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSect.linked_npcs && selectedSect.linked_npcs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  Members (Campaign NPCs)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedSect.linked_npcs.map((linkedNpc, idx) => {
                    const npc = getNPCData(linkedNpc.npc_id);
                    if (!npc) return null;
                    return (
                      <div key={idx} className="bg-[#1E2430] rounded-lg p-3 flex items-start gap-3">
                        {npc.avatar_url && (
                          <img src={npc.avatar_url} alt={safeText(npc.name)} className="w-12 h-12 rounded-full border-2 border-[#37F2D1]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white font-semibold">{safeText(npc.name)}</h5>
                          {linkedNpc.rank && (
                            <p className="text-xs text-[#37F2D1] font-semibold mt-0.5">{safeText(linkedNpc.rank)}</p>
                          )}
                          {linkedNpc.role_description && (
                            <p className="text-sm text-gray-400 mt-2">{safeText(linkedNpc.role_description)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedSect.key_members && selectedSect.key_members.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  Other Key Members
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedSect.key_members.map((member, idx) => (
                    <div key={idx} className="bg-[#1E2430] rounded-lg p-3">
                      <h5 className="text-white font-semibold">{member.name}</h5>
                      {member.rank && (
                        <p className="text-xs text-[#37F2D1] font-semibold mt-0.5">{member.rank}</p>
                      )}
                      {member.description && (
                        <p className="text-sm text-gray-400 mt-2">{member.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSect.player_reputations && Object.keys(selectedSect.player_reputations).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Player Reputations</h4>
                <div className="space-y-2">
                  {Object.entries(selectedSect.player_reputations).map(([charId, score]) => (
                    <div key={charId} className="flex items-center justify-between bg-[#1E2430] rounded-lg p-3">
                      <span className="text-white font-semibold">{getCharacterName(charId)}</span>
                      <span 
                        className="text-sm font-bold px-3 py-1 rounded"
                        style={{ 
                          backgroundColor: score >= 0 ? '#10b981' : '#ef4444',
                          color: 'white'
                        }}
                      >
                        {score >= 0 ? '+' : ''}{score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedEntry && (
              <div className="bg-[#1E2430] rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-semibold text-[#37F2D1] mb-2">
                  {linkedEntry.title}
                </h4>
                <div 
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: linkedEntry.content || '<p class="text-gray-400">No lore written yet.</p>' }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}