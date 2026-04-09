import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const LEGEND_BENCHMARKS = [
  { score: -100, label: "Arch-Villain", color: "#7f1d1d" },
  { score: -80, label: "Infamous", color: "#991b1b" },
  { score: -60, label: "Notorious", color: "#b91c1c" },
  { score: -40, label: "Troublemaker", color: "#dc2626" },
  { score: -20, label: "Minor Nuisance", color: "#ef4444" },
  { score: 0, label: "Unknown", color: "#6b7280" },
  { score: 20, label: "Slightly Known", color: "#3b82f6" },
  { score: 40, label: "Notable", color: "#2563eb" },
  { score: 60, label: "Famous", color: "#1d4ed8" },
  { score: 80, label: "Renowned Hero", color: "#1e40af" },
  { score: 100, label: "Living Legend", color: "#1e3a8a" }
];

export default function PlayerLegendTracker({ campaignId, canEdit }) {
  const queryClient = useQueryClient();

  const { data: characters = [] } = useQuery({
    queryKey: ['campaignCharacters', campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId
  });

  const updateScoreMutation = useMutation({
    mutationFn: ({ character_id, is_critical_success }) => 
      base44.functions.invoke('updateLegendScore', { character_id, is_critical_success }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaignCharacters'] });
      
      const char = characters.find(c => c.id === variables.character_id);
      if (response.data.achievements_awarded?.length > 0) {
        toast.success(`${char?.name} earned: ${response.data.achievements_awarded.join(', ')}`, {
          icon: <Trophy className="w-4 h-4" />
        });
      } else {
        toast.success(`${char?.name}'s legend score updated to ${response.data.new_score}`);
      }
    }
  });

  const getLegendLabel = (score) => {
    for (let i = LEGEND_BENCHMARKS.length - 1; i >= 0; i--) {
      if (score >= LEGEND_BENCHMARKS[i].score) {
        return LEGEND_BENCHMARKS[i];
      }
    }
    return LEGEND_BENCHMARKS[5]; // Unknown
  };

  if (characters.length === 0) {
    return (
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
        <h2 className="text-xl font-bold text-[#37F2D1] mb-4">Legend System</h2>
        <p className="text-gray-400 text-sm">No characters in this campaign yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
      <h2 className="text-xl font-bold text-[#37F2D1] mb-6">Legend System</h2>
      
      <div className="space-y-6">
        {characters.map(character => {
          const score = character.legend_score || 0;
          const legend = getLegendLabel(score);
          const percentage = ((score + 100) / 200) * 100; // Convert -100 to 100 range to 0-100%

          return (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Character Header */}
              <div className="flex items-center gap-3">
                {character.profile_avatar_url && (
                  <img 
                    src={character.profile_avatar_url} 
                    alt={character.name}
                    className="w-10 h-10 rounded-full border-2 border-[#37F2D1]"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-white">{character.name}</h3>
                  <p className="text-xs text-gray-400">{character.class} • Level {character.level}</p>
                </div>
              </div>

              {/* Legend Bar */}
              <div className="relative">
                {/* Background bar */}
                <div className="h-8 bg-[#1E2430] rounded-lg overflow-hidden border border-gray-700">
                  {/* Negative side (red gradient) */}
                  <div 
                    className="absolute left-0 h-full bg-gradient-to-r from-red-900 to-red-600 opacity-30"
                    style={{ width: '50%' }}
                  />
                  {/* Positive side (blue gradient) */}
                  <div 
                    className="absolute right-0 h-full bg-gradient-to-l from-blue-900 to-blue-600 opacity-30"
                    style={{ width: '50%' }}
                  />
                  
                  {/* Score indicator */}
                  <motion.div
                    initial={{ width: '50%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full relative"
                  >
                    <div 
                      className="absolute right-0 top-0 h-full w-1 shadow-lg"
                      style={{ backgroundColor: legend.color }}
                    />
                  </motion.div>

                  {/* Benchmark markers */}
                  {LEGEND_BENCHMARKS.map(benchmark => {
                    const pos = ((benchmark.score + 100) / 200) * 100;
                    return (
                      <div
                        key={benchmark.score}
                        className="absolute top-0 h-full w-px bg-white/20"
                        style={{ left: `${pos}%` }}
                      />
                    );
                  })}

                  {/* Center line */}
                  <div className="absolute left-1/2 top-0 h-full w-px bg-white/40" />
                </div>

                {/* Score display */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 bg-[#2A3441] px-2 py-0.5 rounded text-xs font-bold border border-gray-700">
                  {score > 0 && '+'}{score}
                </div>
              </div>

              {/* Legend label and controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: legend.color }}
                  />
                  <span className="text-sm font-semibold" style={{ color: legend.color }}>
                    {legend.label}
                  </span>
                </div>

                {canEdit && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateScoreMutation.mutate({ 
                        character_id: character.id, 
                        is_critical_success: false 
                      })}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                      title="Critical Fail"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateScoreMutation.mutate({ 
                        character_id: character.id, 
                        is_critical_success: true 
                      })}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 w-7 p-0"
                      title="Critical Success"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}