import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function CelestialViewer({ constellations, entries, canEdit, onSelectConstellation }) {
  const [selectedConstellation, setSelectedConstellation] = useState(null);
  const [showAllStars, setShowAllStars] = useState(true);

  const visibleConstellations = canEdit 
    ? constellations 
    : constellations.filter(c => c.discovered);

  const handleConstellationClick = (constellation) => {
    setSelectedConstellation(constellation);
  };

  const linkedEntry = selectedConstellation && entries?.find(e => e.id === selectedConstellation.entry_id);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-4 border border-cyan-400/30">
        <h2 className="text-2xl font-bold text-[#37F2D1] flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          Night Sky
        </h2>
        <button
          onClick={() => setShowAllStars(!showAllStars)}
          className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-colors"
          style={{ backgroundColor: '#FF5722' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
        >
          <Eye className="w-4 h-4" />
          {showAllStars ? "Hide" : "Show"} Background Stars
        </button>
      </div>

      {/* Celestial Canvas */}
      <div className="relative w-full aspect-video bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a] rounded-xl border-2 border-cyan-400/30 overflow-hidden">
        {/* Animated starfield background */}
        {showAllStars && (
          <div className="absolute inset-0">
            {[...Array(100)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.3
                }}
                animate={{
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.5, 1]
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>
        )}

        {/* Constellations */}
        {visibleConstellations.map((constellation, constIndex) => (
          <div key={constellation.id} className="absolute inset-0">
            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {constellation.connections?.map((conn, i) => {
                const star1 = constellation.stars[conn[0]];
                const star2 = constellation.stars[conn[1]];
                if (!star1 || !star2) return null;

                return (
                  <motion.line
                    key={i}
                    x1={`${star1.x}%`}
                    y1={`${star1.y}%`}
                    x2={`${star2.x}%`}
                    y2={`${star2.y}%`}
                    stroke="rgba(55, 242, 209, 0.4)"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ 
                      pathLength: selectedConstellation?.id === constellation.id ? 1 : 0.6,
                      opacity: selectedConstellation?.id === constellation.id ? 1 : 0.4
                    }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                );
              })}
            </svg>

            {/* Stars */}
            {constellation.stars?.map((star, index) => (
              <motion.div
                key={index}
                className="absolute cursor-pointer"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                whileHover={{ scale: 1.5 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: constIndex * 0.1 + index * 0.05 }}
              >
                <div
                  onClick={() => handleConstellationClick(constellation)}
                  style={{
                    width: `${star.size * 2}px`,
                    height: `${star.size * 2}px`,
                    backgroundColor: star.color,
                    borderRadius: '50%',
                    boxShadow: `0 0 ${star.size * 3}px ${star.color}`,
                    filter: selectedConstellation?.id === constellation.id ? 'brightness(1.5)' : 'brightness(1)'
                  }}
                />
              </motion.div>
            ))}

            {/* Constellation Label */}
            {constellation.stars?.length > 0 && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${constellation.stars.reduce((sum, s) => sum + s.x, 0) / constellation.stars.length}%`,
                  top: `${constellation.stars.reduce((sum, s) => sum + s.y, 0) / constellation.stars.length}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <motion.div
                  className="text-[#37F2D1] text-sm font-bold whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity"
                  animate={{
                    opacity: selectedConstellation?.id === constellation.id ? 1 : 0.6
                  }}
                >
                  {constellation.name}
                </motion.div>
              </div>
            )}
          </div>
        ))}

        {visibleConstellations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 text-lg">No constellations yet. {canEdit ? "Create your first constellation!" : "The sky awaits discovery..."}</p>
          </div>
        )}
      </div>

      {/* Selected Constellation Info */}
      {selectedConstellation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-white">{selectedConstellation.name}</h3>
              {selectedConstellation.description && (
                <p className="text-gray-400 mt-1">{selectedConstellation.description}</p>
              )}
            </div>
            {canEdit && (
              <Button
                onClick={() => onSelectConstellation(selectedConstellation)}
                size="sm"
                variant="outline"
                className="border-[#37F2D1] text-[#37F2D1]"
              >
                Edit
              </Button>
            )}
          </div>

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

          {!linkedEntry && selectedConstellation.entry_id && (
            <p className="text-gray-500 text-sm italic">Linked entry not found</p>
          )}
        </motion.div>
      )}
    </div>
  );
}