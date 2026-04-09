import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ArtifactViewer({ artifacts, entries, canEdit, onSelectArtifact, onDeleteArtifact }) {
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);

  const visibleArtifacts = canEdit ? artifacts : artifacts.filter(a => a.discovered);

  const rarityBorders = {
    'Common': 'border-gray-400',
    'Uncommon': 'border-green-500',
    'Rare': 'border-blue-500',
    'Very Rare': 'border-purple-500',
    'Legendary': 'border-orange-500',
    'Artifact': 'border-red-500'
  };

  const getRarityBorder = (artifact) => {
    if (!artifact.properties?.rarity) return 'border-white/20';
    return rarityBorders[artifact.properties.rarity] || 'border-white/20';
  };

  const handleArtifactClick = (artifact) => {
    setSelectedArtifact(artifact);
    setActiveHotspot(null);
  };

  const handleStateChange = (direction) => {
    if (!selectedArtifact || !selectedArtifact.states?.length) return;
    
    const maxIndex = selectedArtifact.states.length - 1;
    let newIndex = selectedArtifact.current_state_index || 0;
    
    if (direction === 'next') {
      newIndex = newIndex >= maxIndex ? 0 : newIndex + 1;
    } else {
      newIndex = newIndex <= 0 ? maxIndex : newIndex - 1;
    }
    
    setSelectedArtifact({
      ...selectedArtifact,
      current_state_index: newIndex
    });
  };

  const getCurrentState = () => {
    if (!selectedArtifact || !selectedArtifact.states?.length) return null;
    return selectedArtifact.states[selectedArtifact.current_state_index || 0];
  };

  const getDiscoveryPercentage = () => {
    if (!selectedArtifact) return 0;
    return selectedArtifact.discovery_level || 0;
  };

  const isHotspotDiscovered = (hotspot) => {
    return canEdit || hotspot.discovered;
  };

  const linkedEntry = selectedArtifact?.lore_entry_id 
    ? entries.find(e => e.id === selectedArtifact.lore_entry_id)
    : null;

  const currentState = getCurrentState();
  const discoveryPercentage = getDiscoveryPercentage();

  return (
    <div className="space-y-6">
      {/* Artifact Grid */}
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-[#37F2D1]">Artifacts & Relics</h2>
          {canEdit && (
            <Button
              onClick={() => onSelectArtifact({})}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Artifact
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleArtifacts.length > 0 ? (
            visibleArtifacts.map((artifact, idx) => (
              <motion.div
                key={artifact.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleArtifactClick(artifact)}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-4 transition-all ${
                  selectedArtifact?.id === artifact.id
                    ? 'border-[#37F2D1] ring-2 ring-[#37F2D1]/50'
                    : `${getRarityBorder(artifact)} hover:border-[#37F2D1]`
                }`}
              >
                {artifact.image_url ? (
                  <img 
                    src={artifact.image_url} 
                    alt={artifact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1E2430] flex items-center justify-center">
                    <span className="text-gray-500 text-4xl">?</span>
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
                  <h3 className="text-white font-bold text-sm">{artifact.name}</h3>
                  {artifact.discovery_level > 0 && (
                    <div className="mt-1 h-1 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#37F2D1] transition-all duration-500"
                        style={{ width: `${artifact.discovery_level}%` }}
                      />
                    </div>
                  )}
                </div>

                {!artifact.discovered && canEdit && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-yellow-400" />
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">No artifacts yet. {canEdit ? 'Create your first artifact!' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Artifact Details */}
      {selectedArtifact && (
        <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">{selectedArtifact.name}</h2>
              {selectedArtifact.properties?.rarity && (canEdit || discoveryPercentage >= 100) && (
                <span className="inline-block px-3 py-1 bg-[#37F2D1]/20 text-[#37F2D1] rounded-full text-sm font-semibold">
                  {selectedArtifact.properties.rarity}
                </span>
              )}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  onClick={() => onSelectArtifact(selectedArtifact)}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-[#37F2D1]"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    if (confirm(`Delete ${selectedArtifact.name}?`)) {
                      onDeleteArtifact(selectedArtifact.id);
                      setSelectedArtifact(null);
                    }
                  }}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image with Hotspots */}
            <div className="space-y-4">
              <div className="relative bg-[#1E2430] rounded-lg overflow-hidden border border-white/20">
                <img 
                  src={currentState?.image_url || selectedArtifact.image_url}
                  alt={selectedArtifact.name}
                  className="w-full h-auto"
                />
                
                {/* Hotspots */}
                {selectedArtifact.hotspots?.map((hotspot, idx) => {
                  const discovered = isHotspotDiscovered(hotspot);
                  if (!discovered) return null;

                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveHotspot(activeHotspot?.title === hotspot.title ? null : hotspot);
                      }}
                      onMouseEnter={() => setHoveredHotspot(hotspot)}
                      onMouseLeave={() => setHoveredHotspot(null)}
                      className={`absolute w-6 h-6 rounded-full border-2 transition-all ${
                        activeHotspot?.title === hotspot.title
                          ? 'bg-[#37F2D1] border-[#37F2D1] scale-125'
                          : 'bg-[#37F2D1]/30 border-[#37F2D1] hover:scale-110'
                      }`}
                      style={{
                        left: `${hotspot.x}%`,
                        top: `${hotspot.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="absolute inset-0 rounded-full animate-ping bg-[#37F2D1]/50" />
                    </button>
                  );
                })}

                {/* Hotspot Tooltip */}
                {hoveredHotspot && !activeHotspot && (
                  <div 
                    className="absolute z-10 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
                    style={{
                      left: `${hoveredHotspot.x}%`,
                      top: `${hoveredHotspot.y - 5}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    {hoveredHotspot.title}
                  </div>
                )}
              </div>

              {/* State Controls */}
              {selectedArtifact.states?.length > 1 && (
                <div className="flex items-center justify-between bg-[#1E2430] rounded-lg p-3">
                  <Button
                    onClick={() => handleStateChange('prev')}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:text-[#37F2D1]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-300">
                    {currentState?.name || `State ${(selectedArtifact.current_state_index || 0) + 1}`}
                  </span>
                  <Button
                    onClick={() => handleStateChange('next')}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:text-[#37F2D1]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Details Panel */}
            <div className="space-y-4">
              {/* Discovery Progress */}
              {discoveryPercentage > 0 && (
                <div className="bg-[#1E2430] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Discovery Progress</span>
                    <span className="text-sm font-bold text-[#37F2D1]">{discoveryPercentage}%</span>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#37F2D1] to-[#2dd9bd]"
                      initial={{ width: 0 }}
                      animate={{ width: `${discoveryPercentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-[#1E2430] rounded-lg p-4 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-bold text-white mb-2">Description</h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {currentState?.description || selectedArtifact.description || "No description available."}
                </p>
              </div>

              {/* Active Hotspot Info */}
              <AnimatePresence>
                {activeHotspot && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[#37F2D1]/10 border border-[#37F2D1]/50 rounded-lg p-4"
                  >
                    <h3 className="text-lg font-bold text-[#37F2D1] mb-2">{activeHotspot.title}</h3>
                    <p className="text-gray-300 text-sm">{activeHotspot.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Properties */}
              {selectedArtifact.properties?.powers?.length > 0 && (
                <div className="bg-[#1E2430] rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3">Powers & Abilities</h3>
                  <div className="space-y-2">
                    {selectedArtifact.properties.powers.map((power, idx) => (
                      <div key={idx} className="border-l-2 border-[#37F2D1] pl-3">
                        <p className="text-sm"><strong className="text-white">{power.name}:</strong> <span className="text-gray-300">{power.description}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Lore Entry */}
              {linkedEntry && (
                <div className="bg-[#1E2430] rounded-lg p-4">
                  <h3 className="text-sm text-gray-400 mb-2">Related Lore</h3>
                  <div className="text-white font-semibold">{linkedEntry.title}</div>
                  {linkedEntry.content && (
                    <div 
                      className="text-gray-300 text-sm mt-2 line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: linkedEntry.content }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}