import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Lock, Star, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Achievements() {
  const [failedImages, setFailedImages] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: achievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => base44.entities.Achievement.filter({ user_id: user?.id }, '-earned_at'),
    enabled: !!user,
    initialData: []
  });

  const rarityColors = {
    common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  };

  const rarityIcons = {
    common: '⚪',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡'
  };

  const achievementsByRarity = {
    all: achievements,
    legendary: achievements.filter(a => a.rarity === 'legendary'),
    epic: achievements.filter(a => a.rarity === 'epic'),
    rare: achievements.filter(a => a.rarity === 'rare'),
    common: achievements.filter(a => a.rarity === 'common')
  };

  const handleImageError = (achievementId) => {
    setFailedImages(prev => ({ ...prev, [achievementId]: true }));
  };

  const AchievementCard = ({ achievement }) => (
    <div className="bg-[#2A3441] rounded-xl p-6 hover:bg-[#2A3441]/80 transition-colors">
      <div className="flex gap-4">
        <div className={`w-16 h-16 rounded-xl ${rarityColors[achievement.rarity]} border flex items-center justify-center flex-shrink-0`}>
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
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg">{achievement.title}</h3>
              <p className="text-sm text-gray-400">{achievement.description}</p>
            </div>
            <span className="text-2xl">{rarityIcons[achievement.rarity]}</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Badge className={rarityColors[achievement.rarity]}>
              {achievement.rarity}
            </Badge>
            {achievement.earned_at && (
              <span className="text-xs text-gray-500">
                Earned {format(new Date(achievement.earned_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const stats = {
    total: achievements.length,
    legendary: achievementsByRarity.legendary.length,
    epic: achievementsByRarity.epic.length,
    rare: achievementsByRarity.rare.length,
    common: achievementsByRarity.common.length
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Achievements</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#2A3441] rounded-xl p-4 text-center">
            <Trophy className="w-8 h-8 text-[#37F2D1] mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
          <div className="bg-[#2A3441] rounded-xl p-4 text-center">
            <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.legendary}</p>
            <p className="text-sm text-gray-400">Legendary</p>
          </div>
          <div className="bg-[#2A3441] rounded-xl p-4 text-center">
            <Star className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.epic}</p>
            <p className="text-sm text-gray-400">Epic</p>
          </div>
          <div className="bg-[#2A3441] rounded-xl p-4 text-center">
            <Star className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.rare}</p>
            <p className="text-sm text-gray-400">Rare</p>
          </div>
          <div className="bg-[#2A3441] rounded-xl p-4 text-center">
            <Star className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.common}</p>
            <p className="text-sm text-gray-400">Common</p>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-[#2A3441]">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="legendary" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Legendary ({stats.legendary})
            </TabsTrigger>
            <TabsTrigger value="epic" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Epic ({stats.epic})
            </TabsTrigger>
            <TabsTrigger value="rare" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Rare ({stats.rare})
            </TabsTrigger>
            <TabsTrigger value="common" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Common ({stats.common})
            </TabsTrigger>
          </TabsList>

          {Object.keys(achievementsByRarity).map(rarity => (
            <TabsContent key={rarity} value={rarity}>
              <div className="grid gap-4">
                {achievementsByRarity[rarity].map(achievement => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
                {achievementsByRarity[rarity].length === 0 && (
                  <div className="text-center py-12">
                    <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No {rarity !== 'all' ? rarity : ''} achievements earned yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}