import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Info } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CharacterAnalytics() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const characterId = params.get('id');
  const [hoveredTag, setHoveredTag] = useState(null);

  const { data: character } = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () => {
      const chars = await base44.entities.Character.list();
      return chars.find(c => c.id === characterId);
    },
    enabled: !!characterId
  });

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading character...</p>
      </div>
    );
  }

  const tagDefinitions = {
    'Glass Cannon': {
      description: 'You have exceptionally high damage output but low durability during battle. Very go in, and get out or else.',
      color: 'bg-green-600 hover:bg-green-700'
    },
    'Assassin': {
      description: 'The amount of times someone has met their end from your blade is unmatched. You are known for always getting a killing blow.',
      color: 'bg-green-600 hover:bg-green-700'
    },
    "A Surgeon's Hand": {
      description: 'Slow. Steady. Precise. You are known for your successes in saves that require lockpicking, or pickpocketing.',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    'Stay Down': {
      description: "You've been downed in combat so many times in one encounter, that you might as well have been sleeping.",
      color: 'bg-red-600 hover:bg-red-700'
    },
    'One Hit Wonder': {
      description: 'Based on your playstyle, you\'re a glass canon. High damage, high consistency, with an even higher body count - which are all good things as far as being a rogue is considered. However, your time down is in need of much improvement. Try using a bonus dash action to get out as soon as you put in some damage, to reposition yourself for another round of sneak attacks.',
      color: 'bg-gray-600'
    }
  };

  const stats = character.stats || {};
  const radarData = [
    { stat: 'DPS', value: stats.dps || 0, fullMark: 100 },
    { stat: 'Healing', value: stats.healing || 0, fullMark: 100 },
    { stat: 'Critical\nSuccess', value: stats.critical_hits || 0, fullMark: 50 },
    { stat: 'Critical\nFails', value: stats.nat_1s || 0, fullMark: 50 },
    { stat: 'Consistency', value: stats.accuracy || 0, fullMark: 100 },
    { stat: 'Defense', value: stats.defense || 0, fullMark: 100 },
    { stat: 'Killing\nBlows', value: stats.nat_20s || 0, fullMark: 50 },
    { stat: 'Time\nDown', value: stats.downed || 0, fullMark: 20 }
  ];

  const StatBar = ({ label, value, max = 100 }) => (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#4B5563] to-[#374151]" 
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
    </div>
  );

  const characterTags = character.tags || ['Glass Cannon', 'Assassin', "A Surgeon's Hand", 'Stay Down'];
  const playstyle = 'One Hit Wonder';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E8E8] to-[#D0D0D0] relative">
      <Link 
        to={createPageUrl("PIEChart")}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to P.I.E. Chart
      </Link>

      <div className="flex h-screen pt-20">
        {/* Left Side - Character Info */}
        <div className="w-[500px] bg-white/80 backdrop-blur-sm rounded-r-3xl shadow-2xl p-8 flex flex-col">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{character.name}</h1>
            <p className="text-lg text-gray-600">Level {character.level} {character.class}</p>
          </div>

          <p className="text-sm text-gray-700 mb-6 leading-relaxed">
            {tagDefinitions[playstyle]?.description || 'Your character playstyle analysis.'}
          </p>

          {/* Stats Bars */}
          <div className="flex-1 overflow-auto">
            <StatBar label="DPS" value={stats.dps || 0} />
            <StatBar label="Healing" value={stats.healing || 0} />
            <StatBar label="Critical Successes" value={stats.critical_hits || 0} max={50} />
            <StatBar label="Critical Fails" value={stats.nat_1s || 0} max={50} />
            <StatBar label="Consistency" value={stats.accuracy || 0} />
            <StatBar label="Defense" value={stats.defense || 0} />
            <StatBar label="Killing Blows" value={stats.nat_20s || 0} max={50} />
            <StatBar label="Time Down" value={stats.downed || 0} max={20} />
          </div>
        </div>

        {/* Center - Character Portrait */}
        <div className="flex-1 flex items-end justify-center pb-0 relative">
          <img 
            src={character.avatar_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/ca3bdbe6d_Test12.png"}
            alt={character.name}
            className="h-[90%] object-contain drop-shadow-2xl"
          />
        </div>

        {/* Right Side - Tags & Radar */}
        <div className="w-[500px] flex flex-col items-center justify-start pt-12 pr-8">
          {/* Tags Box */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Character Playstyle</h3>
              <Info className="w-4 h-4 text-gray-500" />
            </div>
            
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-gray-800 mb-1">{playstyle}</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {characterTags.map((tag) => {
                const tagDef = tagDefinitions[tag] || {};
                return (
                  <div key={tag} className="relative">
                    <button
                      onMouseEnter={() => setHoveredTag(tag)}
                      onMouseLeave={() => setHoveredTag(null)}
                      className={`w-full px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors ${tagDef.color || 'bg-gray-600'}`}
                    >
                      {tag}
                    </button>
                    
                    {hoveredTag === tag && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64">
                        <div className="bg-[#2A2A2A] text-white p-4 rounded-lg shadow-xl border-4 border-[#D4A574]">
                          <h5 className="font-bold mb-2 text-[#D4A574]">{tag}</h5>
                          <p className="text-sm leading-relaxed">{tagDef.description}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar Chart */}
          <div className="relative w-[450px] h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#9CA3AF" strokeOpacity={0.4} />
                <PolarAngleAxis 
                  dataKey="stat" 
                  tick={{ fill: '#1F2937', fontSize: 11, fontWeight: '600' }}
                  tickLine={false}
                />
                <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar 
                  name="Stats" 
                  dataKey="value" 
                  stroke="#7DD3C0" 
                  fill="#7DD3C0" 
                  fillOpacity={0.5} 
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Icon decorations around radar - positioned further out */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl">⚔️</div>
            <div className="absolute top-4 -right-6 text-3xl">🏃</div>
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-3xl">🎯</div>
            <div className="absolute bottom-16 -right-6 text-3xl">🛡️</div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-3xl">💀</div>
            <div className="absolute bottom-16 -left-6 text-3xl">🗡️</div>
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-3xl">⚗️</div>
            <div className="absolute top-4 -left-6 text-3xl">☠️</div>
          </div>
        </div>
      </div>
    </div>
  );
}