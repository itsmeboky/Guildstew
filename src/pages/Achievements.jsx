import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Lock, Star, Award, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ACHIEVEMENT_DEFINITIONS, nextClosestAchievement } from "@/data/achievementDefinitions";
import { checkAchievements } from "@/utils/achievementChecker";

/**
 * Achievements page. Displays earned achievements grouped by rarity
 * + an overall progress block. Runs the achievement checker on
 * mount for every character the user owns so any newly-met
 * thresholds (e.g. ones earned outside of an end-of-combat trigger)
 * land here on visit.
 */
export default function Achievements() {
  const queryClient = useQueryClient();
  const [failedImages, setFailedImages] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: () => base44.entities.Achievement.filter({ user_id: user?.id }, '-earned_at'),
    enabled: !!user?.id,
    initialData: [],
  });

  // Pull the user's characters so we can fold their stats together
  // into the "next achievement" hint and run the on-mount check.
  const { data: characters = [] } = useQuery({
    queryKey: ['userCharactersForAchievements', user?.id || user?.email],
    queryFn: async () => {
      const byId = user?.id
        ? await base44.entities.Character.filter({ created_by: user.id }).catch(() => [])
        : [];
      if (byId.length > 0) return byId;
      if (user?.email) {
        return base44.entities.Character.filter({ created_by: user.email }).catch(() => []);
      }
      return [];
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: characterStats = [] } = useQuery({
    queryKey: ['characterStatsForAchievements', characters.map((c) => c.id).sort().join(',')],
    queryFn: async () => {
      if (characters.length === 0) return [];
      const all = [];
      for (const c of characters) {
        try {
          const rows = await base44.entities.CharacterStat.filter({ character_id: c.id });
          for (const r of rows) all.push(r);
        } catch { /* table may not exist yet */ }
      }
      return all;
    },
    enabled: characters.length > 0,
    initialData: [],
  });

  // On mount: run achievement checks for every character so any
  // thresholds met outside the end-of-combat path get awarded too.
  // Only needs to run once per visit because subsequent earnings
  // come back in via the combat trigger.
  useEffect(() => {
    if (!user?.id || characters.length === 0) return;
    let cancelled = false;
    (async () => {
      let anyNew = false;
      for (const c of characters) {
        const awards = await checkAchievements(user.id, c.id, c.campaign_id || null);
        if (awards.length > 0) anyNew = true;
      }
      if (!cancelled && anyNew) {
        queryClient.invalidateQueries({ queryKey: ['achievements', user.id] });
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, characters, queryClient]);

  // Aggregate stats across every character + campaign for the
  // "next achievement" hint.
  const aggregateStats = useMemo(() => {
    return characterStats.reduce((acc, r) => {
      for (const k of Object.keys(r)) {
        if (typeof r[k] === 'number') acc[k] = (acc[k] || 0) + r[k];
      }
      acc.highest_single_damage = Math.max(
        Number(acc.highest_single_damage || 0),
        Number(r.highest_single_damage || 0),
      );
      acc.most_healing_single_spell = Math.max(
        Number(acc.most_healing_single_spell || 0),
        Number(r.most_healing_single_spell || 0),
      );
      return acc;
    }, {});
  }, [characterStats]);

  const earnedKeys = useMemo(
    () => new Set(achievements.map((a) => a.achievement_key).filter(Boolean)),
    [achievements],
  );

  const nextHint = useMemo(
    () => nextClosestAchievement(aggregateStats, earnedKeys),
    [aggregateStats, earnedKeys],
  );

  const totalAvailable = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
  const totalEarned = achievements.length;
  const earnedPct = totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0;

  const rarityColors = {
    common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  const rarityIcons = {
    common: '⚪',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡',
  };

  const achievementsByRarity = {
    all: achievements,
    legendary: achievements.filter((a) => a.rarity === 'legendary'),
    epic: achievements.filter((a) => a.rarity === 'epic'),
    rare: achievements.filter((a) => a.rarity === 'rare'),
    common: achievements.filter((a) => a.rarity === 'common'),
  };

  const handleImageError = (achievementId) => {
    setFailedImages((prev) => ({ ...prev, [achievementId]: true }));
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
          ) : achievement.icon ? (
            <span className="text-3xl leading-none">{achievement.icon}</span>
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
    common: achievementsByRarity.common.length,
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Achievements</h1>

        {/* --- Progress block --- */}
        <div className="bg-[#2A3441] rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Overall progress</p>
              <p className="text-3xl font-bold text-white">
                {totalEarned} <span className="text-gray-500 text-xl">/ {totalAvailable}</span>
                <span className="text-[#37F2D1] text-base ml-2">({earnedPct}%)</span>
              </p>
            </div>
            <div className="flex-1 max-w-md">
              <div className="h-3 bg-[#1E2430] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#37F2D1] to-[#22c5f5]"
                  style={{ width: `${earnedPct}%` }}
                />
              </div>
            </div>
          </div>

          {nextHint && (
            <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${rarityColors[nextHint.def.rarity]} border flex items-center justify-center flex-shrink-0`}>
                <span className="text-2xl">{nextHint.def.icon || '🏆'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-[#37F2D1] font-bold flex items-center gap-1">
                  <Target className="w-3 h-3" /> Next up
                </div>
                <div className="text-white font-bold">{nextHint.def.title}</div>
                <div className="text-xs text-gray-400">{nextHint.def.description}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#1E2430] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#37F2D1] to-[#22c5f5]"
                      style={{ width: `${Math.round(nextHint.ratio * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {Math.min(nextHint.current, nextHint.target)}/{nextHint.target}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

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

          {Object.keys(achievementsByRarity).map((rarity) => (
            <TabsContent key={rarity} value={rarity}>
              <div className="grid gap-4">
                {achievementsByRarity[rarity].map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
                {achievementsByRarity[rarity].length === 0 && (
                  <div className="text-center py-12">
                    <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No {rarity !== 'all' ? rarity : ''} achievements earned yet
                    </p>
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
