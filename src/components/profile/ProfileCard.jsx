import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export default function ProfileCard({ user, showFullStats = false, featuredAchievements = [] }) {
  const [failedImages, setFailedImages] = useState({});
  const [hoveredAchievement, setHoveredAchievement] = useState(null);

  const statusColors = {
    online: 'bg-[#37F2D1]',
    streaming: 'bg-[#FF00FF]',
    offline: 'bg-gray-400'
  };

  const rarityColors = {
    common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  };

  const handleImageError = (achievementId) => {
    setFailedImages(prev => ({ ...prev, [achievementId]: true }));
  };

  return (
    <div className="bg-[#2A3441] rounded-2xl p-6 relative">
      {/* Avatar with ornate border */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 rounded-full p-1">
          <div className="w-full h-full rounded-full overflow-hidden bg-[#2A3441]">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'}
              alt={user?.username}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        {/* Online Status Dot */}
        <div className={`absolute bottom-2 right-2 w-5 h-5 ${statusColors[user?.online_status || 'offline']} rounded-full border-4 border-[#2A3441]`} />
      </div>

      {/* User Info */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold flex items-center justify-center gap-2">
          {user?.username || 'Adventurer'}
          {user?.online_status === 'online' && (
            <div className="w-2 h-2 bg-[#37F2D1] rounded-full" />
          )}
        </h3>
        <p className="text-sm text-gray-400 italic">{user?.tagline || 'The Adventurer'}</p>
        {user?.stream_url && user?.online_status === 'streaming' && (
          <a
            href={user.stream_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#FF00FF] hover:underline mt-1 block"
          >
            Now Live On Twitch
          </a>
        )}
      </div>

      {/* Featured Achievements */}
      {featuredAchievements && featuredAchievements.length > 0 && (
        <div className="mb-4 flex justify-center gap-4">
          {featuredAchievements.slice(0, 3).map((achievement) => (
            <div 
              key={achievement.id} 
              className="relative"
              onMouseEnter={() => setHoveredAchievement(achievement.id)}
              onMouseLeave={() => setHoveredAchievement(null)}
            >
              <div className={`w-16 h-16 rounded-lg ${rarityColors[achievement.rarity]} border-2 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}>
                {achievement.icon_url && !failedImages[achievement.id] ? (
                  <img 
                    src={achievement.icon_url} 
                    alt={achievement.title} 
                    className="w-12 h-12" 
                    onError={() => handleImageError(achievement.id)}
                  />
                ) : (
                  <Trophy className="w-8 h-8" />
                )}
              </div>
              
              {/* Tooltip */}
              {hoveredAchievement === achievement.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#1E2430] rounded-lg p-3 shadow-xl border border-gray-700 z-50 animate-in fade-in duration-200">
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1E2430] border-r border-b border-gray-700 rotate-45" />
                  <h4 className="font-bold text-sm mb-1">{achievement.title}</h4>
                  <p className="text-xs text-gray-400">{achievement.description}</p>
                  <Badge className={`${rarityColors[achievement.rarity]} text-xs mt-2`}>
                    {achievement.rarity}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Campaigns Played:</span>
          <span className="font-medium">{user?.total_campaigns || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Characters Created:</span>
          <span className="font-medium">{user?.total_characters || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Most Played System:</span>
          <span className="font-medium">{user?.most_played_system || 'D&D 5e'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Hours Played:</span>
          <span className="font-medium">{user?.total_hours_played || 0}h</span>
        </div>
      </div>

      {/* Play Style Tags */}
      {user?.play_style_tags && user.play_style_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {user.play_style_tags.map((tag, idx) => (
            <Badge
              key={idx}
              className="bg-gradient-to-r from-green-400/20 to-yellow-400/20 text-green-300 border-green-400/30"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}