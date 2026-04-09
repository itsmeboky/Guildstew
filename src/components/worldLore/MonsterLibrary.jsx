import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Lock, Eye, EyeOff, Images, Sparkles, Download } from "lucide-react";
import { motion } from "framer-motion";
import BulkMonsterImageUpload from "./BulkMonsterImageUpload";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MonsterLibrary({ monsters, currentCharacter, canEdit, onSelectMonster, onDeleteMonster, onRefresh }) {
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const isMonsterUnlocked = (monster) => {
    if (canEdit) return true; // GMs can see all
    return monster.encountered_by?.includes(currentCharacter?.id) || false;
  };

  const visibleMonsters = (canEdit ? monsters : monsters.filter(m => m.discovered)).sort((a, b) => a.name.localeCompare(b.name));

  const handleMonsterClick = (monster) => {
    if (isMonsterUnlocked(monster)) {
      setSelectedMonster(monster);
    }
  };

  const getModifier = (score) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Panel - Monster Details */}
      <div className="bg-gradient-to-br from-[#1E2430]/60 via-[#2A3441]/50 to-[#1E2430]/60 backdrop-blur-md rounded-xl p-8 border border-white/10 min-h-[400px]">
        {selectedMonster ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* Left - Monster Image */}
            <div className="bg-[#1E2430] rounded-lg overflow-hidden border border-white/20 flex items-center justify-center h-[400px]">
              {selectedMonster.image_url ? (
                <img 
                  src={selectedMonster.image_url} 
                  alt={selectedMonster.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1E2430]/50">
                  <span className="text-gray-500 text-6xl">?</span>
                </div>
              )}
            </div>

            {/* Right - Stats and Description */}
            <div className="md:col-span-2 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-4xl font-bold text-white">{selectedMonster.name.toUpperCase()}</h2>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onSelectMonster(selectedMonster)}
                      size="sm"
                      className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`Delete ${selectedMonster.name}?`)) {
                          onDeleteMonster(selectedMonster.id);
                          setSelectedMonster(null);
                        }
                      }}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-white/30 mb-4"></div>

              {/* Description Box */}
              <div className="flex-1 bg-[#2A3441]/30 rounded-lg p-4 overflow-y-auto border border-white/20">
                <h3 className="text-xl font-bold text-white mb-2">{selectedMonster.name}</h3>
                
                {selectedMonster.stats && (
                  <div className="text-sm text-gray-200 mb-3 space-y-1">
                    {selectedMonster.stats.challenge_rating && (
                      <p><strong>Challenge Rating:</strong> {selectedMonster.stats.challenge_rating}</p>
                    )}
                    {selectedMonster.stats.armor_class && (
                      <p><strong>AC:</strong> {selectedMonster.stats.armor_class}</p>
                    )}
                    {selectedMonster.stats.hit_points && (
                      <p><strong>HP:</strong> {selectedMonster.stats.hit_points}</p>
                    )}
                    {selectedMonster.stats.speed && (
                      <p><strong>Speed:</strong> {selectedMonster.stats.speed}</p>
                    )}
                  </div>
                )}

                {selectedMonster.stats && (
                  <div className="grid grid-cols-6 gap-2 mb-3 text-center text-xs">
                    <div className="bg-[#1E2430]/50 rounded p-1 border border-white/10">
                      <div className="font-bold text-white">STR</div>
                      <div className="text-gray-300">{selectedMonster.stats.str || 10}</div>
                      <div className="text-gray-400">{getModifier(selectedMonster.stats.str || 10)}</div>
                    </div>
                    <div className="bg-[#1E2430]/50 rounded p-1 border border-white/10">
                      <div className="font-bold text-white">DEX</div>
                      <div className="text-gray-300">{selectedMonster.stats.dex || 10}</div>
                      <div className="text-gray-400">{getModifier(selectedMonster.stats.dex || 10)}</div>
                    </div>
                    <div className="bg-[#1E2430]/50 rounded p-1 border border-white/10">
                      <div className="font-bold text-white">CON</div>
                      <div className="text-gray-300">{selectedMonster.stats.con || 10}</div>
                      <div className="text-gray-400">{getModifier(selectedMonster.stats.con || 10)}</div>
                    </div>
                    <div className="bg-[#1E2430]/50 rounded p-1 border border-white/10">
                      <div className="font-bold text-white">INT</div>
                      <div className="text-gray-300">{selectedMonster.stats.int || 10}</div>
                      <div className="text-gray-400">{getModifier(selectedMonster.stats.int || 10)}</div>
                    </div>
                    <div className="bg-[#1E2430]/50 rounded p-1 border border-white/10">
                      <div className="font-bold text-white">WIS</div>
                      <div className="text-gray-300">{selectedMonster.stats.wis || 10}</div>
                      <div className="text-gray-400">{getModifier(selectedMonster.stats.wis || 10)}</div>
                    </div>
                    <div className="bg-[#1E2430]/50 rounded p-1 border border-white/10">
                      <div className="font-bold text-white">CHA</div>
                      <div className="text-gray-300">{selectedMonster.stats.cha || 10}</div>
                      <div className="text-gray-400">{getModifier(selectedMonster.stats.cha || 10)}</div>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/20 pt-3">
                  <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedMonster.description || "No description available."}
                  </p>
                </div>

                {selectedMonster.stats?.abilities && selectedMonster.stats.abilities.length > 0 && (
                  <div className="mt-3 border-t border-white/20 pt-3">
                    <h4 className="font-bold text-white text-sm mb-2">Abilities</h4>
                    {selectedMonster.stats.abilities.map((ability, idx) => (
                      <div key={idx} className="mb-2">
                        <p className="text-sm"><strong className="text-white">{ability.name}:</strong> <span className="text-gray-200">{ability.description}</span></p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedMonster.stats?.actions && selectedMonster.stats.actions.length > 0 && (
                  <div className="mt-3 border-t border-white/20 pt-3">
                    <h4 className="font-bold text-white text-sm mb-2">Actions</h4>
                    {selectedMonster.stats.actions.map((action, idx) => (
                      <div key={idx} className="mb-2">
                        <p className="text-sm"><strong className="text-white">{action.name}:</strong> <span className="text-gray-200">{action.description}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <h2 className="text-4xl font-bold text-gray-400">Select a monster to view details</h2>
          </div>
        )}
      </div>

      {/* Bottom Panel - Monster Grid */}
      <div className="bg-gradient-to-br from-[#1E2430]/60 via-[#2A3441]/50 to-[#1E2430]/60 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white text-center flex-1">Monster Library</h3>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (confirm('This will AI-generate images and complete data for all monsters. This may take a few minutes. Continue?')) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const campaignId = urlParams.get('id');
                    toast.promise(
                      base44.functions.invoke('enrichMonsters', { campaign_id: campaignId }),
                      {
                        loading: 'Processing monsters...',
                        success: (res) => {
                          onRefresh?.();
                          return `✓ ${res.data.duplicates_removed} duplicates removed, ${res.data.images_generated} images generated, ${res.data.monsters_enriched} enriched`;
                        },
                        error: 'Failed to process monsters'
                      }
                    );
                  }
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Enrich All
              </Button>
              <Button
                onClick={() => setShowBulkUpload(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Images className="w-4 h-4 mr-2" />
                Bulk Upload Images
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const campaignId = urlParams.get('id');
                    toast.info("Preparing download... this may take a minute");
                    
                    const response = await base44.functions.invoke('exportMonsterImages', { campaign_id: campaignId });
                    
                    // Convert base64 to blob
                    const binaryString = window.atob(response.data.file_data);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'application/zip' });

                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `monsters_${campaignId}.zip`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    toast.success("Download started");
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to export images");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Images
              </Button>
              <Button
                onClick={() => onSelectMonster({})}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Monster
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto pr-2">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2">
            {visibleMonsters.map((monster, idx) => {
              const unlocked = isMonsterUnlocked(monster);
              return (
                <motion.div
                  key={monster.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => handleMonsterClick(monster)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedMonster?.id === monster.id
                      ? 'border-[#37F2D1] ring-2 ring-[#37F2D1]/50'
                      : 'border-white/20'
                  } ${
                    unlocked 
                      ? 'cursor-pointer hover:border-[#37F2D1] hover:scale-105 hover:shadow-lg hover:shadow-[#37F2D1]/20' 
                      : 'cursor-not-allowed opacity-40'
                  }`}
                  title={unlocked ? monster.name : "???"}
                >
                  {monster.image_url ? (
                    <>
                      <div className="w-full h-full bg-[#1E2430] flex items-center justify-center">
                        <img 
                          src={monster.image_url} 
                          alt={unlocked ? monster.name : "Locked"}
                          className={`w-full h-full object-contain ${unlocked ? '' : 'filter grayscale blur-sm'}`}
                        />
                      </div>
                      {!unlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Lock className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#2A3441]/50 flex items-center justify-center">
                      {unlocked ? (
                        <span className="text-gray-400 text-2xl">?</span>
                      ) : (
                        <Lock className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                  )}
                  {!monster.discovered && canEdit && (
                    <div className="absolute top-1 right-1">
                      <EyeOff className="w-3 h-3 text-yellow-400" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {visibleMonsters.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No monsters in the library yet.</p>
            </div>
          )}
        </div>
      </div>

      {showBulkUpload && (
        <BulkMonsterImageUpload
          monsters={monsters}
          onComplete={() => {
            setShowBulkUpload(false);
            onRefresh?.();
          }}
          onCancel={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
}