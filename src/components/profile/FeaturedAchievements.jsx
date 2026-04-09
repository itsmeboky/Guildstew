import React from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FeaturedAchievements({ achievements }) {
  const rarityColors = {
    common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  };

  if (!achievements || achievements.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#2A3441] rounded-2xl p-6">
      <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Featured Achievements</h3>
      <div className="grid grid-cols-1 gap-3">
        {achievements.slice(0, 3).map((achievement) => (
          <div key={achievement.id} className="flex items-center gap-3 bg-[#1E2430] rounded-lg p-3">
            <div className={`w-12 h-12 rounded-lg ${rarityColors[achievement.rarity]} border flex items-center justify-center flex-shrink-0`}>
              {achievement.icon_url ? (
                <img src={achievement.icon_url} alt={achievement.title} className="w-8 h-8" />
              ) : (
                <Trophy className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">{achievement.title}</h4>
              <Badge className={`${rarityColors[achievement.rarity]} text-xs mt-1`}>
                {achievement.rarity}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}