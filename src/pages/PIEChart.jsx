import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Award, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";

export default function PIEChart() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: characters } = useQuery({
    queryKey: ['userCharacters'],
    queryFn: () => base44.entities.Character.filter({ created_by: user?.email }),
    enabled: !!user,
    initialData: []
  });

  const { data: campaigns } = useQuery({
    queryKey: ['userCampaigns'],
    queryFn: async () => {
      const all = await base44.entities.Campaign.list();
      return all.filter(c => c.game_master_id === user?.id || c.player_ids?.includes(user?.id));
    },
    enabled: !!user,
    initialData: []
  });

  const aggregateStats = characters.reduce((acc, char) => {
    if (char.stats) {
      acc.dps += char.stats.dps || 0;
      acc.healing += char.stats.healing || 0;
      acc.nat_20s += char.stats.nat_20s || 0;
      acc.nat_1s += char.stats.nat_1s || 0;
      acc.accuracy += char.stats.accuracy || 0;
      acc.defense += char.stats.defense || 0;
      acc.critical_hits += char.stats.critical_hits || 0;
      acc.downed += char.stats.downed || 0;
    }
    return acc;
  }, { dps: 0, healing: 0, nat_20s: 0, nat_1s: 0, accuracy: 0, defense: 0, critical_hits: 0, downed: 0 });

  const avgStats = characters.length > 0 ? {
    dps: aggregateStats.dps / characters.length,
    healing: aggregateStats.healing / characters.length,
    accuracy: aggregateStats.accuracy / characters.length,
    defense: aggregateStats.defense / characters.length,
    critical_hits: aggregateStats.critical_hits / characters.length,
  } : { dps: 0, healing: 0, accuracy: 0, defense: 0, critical_hits: 0 };

  // Generate playstyle description based on stats
  const getPlaystyleDescription = () => {
    if (characters.length === 0) {
      return "Create your first character to see your overall playstyle analysis!";
    }

    const isDamageDealer = avgStats.dps > 60;
    const isHealer = avgStats.healing > 50;
    const isTank = avgStats.defense > 60;
    const isLucky = aggregateStats.nat_20s > aggregateStats.nat_1s;
    const isReckless = aggregateStats.downed > characters.length * 3;

    let description = "Based on your gameplay across all characters, ";

    if (isDamageDealer && !isTank) {
      description += "you favor aggressive, high-damage playstyles. You excel at dealing devastating blows to enemies, though your defensive capabilities suggest you prefer to strike hard and fast rather than endure prolonged combat. ";
    } else if (isHealer) {
      description += "you're a natural support player. Your focus on healing and keeping your party alive shows you understand that victory comes through teamwork and sustainability. ";
    } else if (isTank) {
      description += "you prefer the role of protector. Your high defense stats indicate you're comfortable being on the front lines, absorbing damage while your allies deal with threats. ";
    } else {
      description += "you maintain a balanced approach to combat. You're versatile, adapting your tactics to whatever the situation demands. ";
    }

    if (isLucky) {
      description += "The dice favor you - your natural 20s far exceed your critical failures, suggesting either exceptional luck or clever strategic positioning. ";
    } else if (aggregateStats.nat_1s > 10) {
      description += "Your dice rolls can be unpredictable, with more critical failures than successes. Consider this an opportunity to develop creative problem-solving when things don't go as planned. ";
    }

    if (isReckless) {
      description += "However, your tendency to go down in combat suggests you might benefit from more cautious positioning and defensive awareness.";
    } else {
      description += "Your survival instincts are solid, keeping you in the fight when it matters most.";
    }

    return description;
  };

  const radarData = [
    { stat: 'DPS', value: Math.round(avgStats.dps) },
    { stat: 'Healing', value: Math.round(avgStats.healing) },
    { stat: 'Accuracy', value: Math.round(avgStats.accuracy) },
    { stat: 'Defense', value: Math.round(avgStats.defense) },
    { stat: 'Critical Hits', value: Math.round(avgStats.critical_hits) }
  ];

  const diceData = [
    { name: 'Nat 20s', value: aggregateStats.nat_20s, fill: '#37F2D1' },
    { name: 'Nat 1s', value: aggregateStats.nat_1s, fill: '#FF5722' }
  ];

  const characterData = characters.map(c => ({
    name: c.name,
    dps: c.stats?.dps || 0,
    healing: c.stats?.healing || 0,
    defense: c.stats?.defense || 0
  }));

  const CharacterCard = ({ character }) => (
    <Link
      to={`${createPageUrl("CharacterAnalytics")}?id=${character.id}`}
      className="bg-[#2A3441] rounded-xl overflow-hidden hover:ring-2 hover:ring-[#37F2D1] transition-all cursor-pointer group"
    >
      <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 relative overflow-hidden">
        {character.avatar_url && (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{character.name}</h3>
        <p className="text-sm text-gray-400 mb-3">Level {character.level} {character.class}</p>
        <div className="flex flex-wrap gap-2">
          {character.tags?.slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs border-[#37F2D1] text-[#37F2D1]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">P.I.E. Chart</h1>
          <p className="text-gray-400">Player Intelligence & Experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#2A3441] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#37F2D1]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#37F2D1]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Characters</p>
                <p className="text-3xl font-bold">{characters.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#2A3441] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#FF5722]/20 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-[#FF5722]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Campaigns</p>
                <p className="text-3xl font-bold">{campaigns.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#2A3441] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Hours</p>
                <p className="text-3xl font-bold">{campaigns.reduce((acc, c) => acc + (c.total_hours || 0), 0)}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Playstyle Description */}
        <div className="bg-[#2A3441] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Your Overall Playstyle</h2>
          <p className="text-gray-300 leading-relaxed text-base">
            {getPlaystyleDescription()}
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#2A3441]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="characters" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              By Character
            </TabsTrigger>
            <TabsTrigger value="dice" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Dice Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#2A3441] rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Average Combat Stats</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#37F2D1" strokeOpacity={0.3} />
                    <PolarAngleAxis dataKey="stat" stroke="#fff" />
                    <PolarRadiusAxis stroke="#37F2D1" />
                    <Radar name="Stats" dataKey="value" stroke="#37F2D1" fill="#37F2D1" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#2A3441] rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold mb-4">Aggregate Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total DPS</span>
                    <span className="font-bold text-xl">{Math.round(aggregateStats.dps)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Healing</span>
                    <span className="font-bold text-xl">{Math.round(aggregateStats.healing)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Critical Hits</span>
                    <span className="font-bold text-xl">{aggregateStats.critical_hits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Times Downed</span>
                    <span className="font-bold text-xl">{aggregateStats.downed}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="characters">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {characters.map(character => (
                <CharacterCard key={character.id} character={character} />
              ))}
              {characters.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No characters yet. Create your first character to see their analytics!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dice">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#2A3441] rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Dice Roll Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={diceData}>
                    <XAxis dataKey="name" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip contentStyle={{ backgroundColor: '#2A3441', border: 'none' }} />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#2A3441] rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Luck Rating</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Natural 20s</span>
                      <span className="text-[#37F2D1] font-bold">{aggregateStats.nat_20s}</span>
                    </div>
                    <div className="h-3 bg-[#1E2430] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#37F2D1] to-[#2dd9bd]" 
                        style={{ width: `${Math.min((aggregateStats.nat_20s / (aggregateStats.nat_20s + aggregateStats.nat_1s)) * 100 || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Natural 1s</span>
                      <span className="text-[#FF5722] font-bold">{aggregateStats.nat_1s}</span>
                    </div>
                    <div className="h-3 bg-[#1E2430] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#FF5722] to-[#FF6B3D]" 
                        style={{ width: `${Math.min((aggregateStats.nat_1s / (aggregateStats.nat_20s + aggregateStats.nat_1s)) * 100 || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Overall Luck Score</p>
                    <p className="text-4xl font-bold text-[#37F2D1]">
                      {aggregateStats.nat_20s + aggregateStats.nat_1s > 0 
                        ? Math.round((aggregateStats.nat_20s / (aggregateStats.nat_20s + aggregateStats.nat_1s)) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}