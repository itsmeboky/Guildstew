import React from "react";
import { Shield, TrendingUp, Users, Package } from "lucide-react";

export default function FactionStats({ faction }) {
  const statIcons = {
    type: Shield,
    influence_level: TrendingUp,
    goals: Users,
    resources: Package
  };

  const stats = [];

  if (faction.type) {
    stats.push({ 
      key: 'type', 
      label: 'Type', 
      value: faction.type.replace('_', ' ').toUpperCase() 
    });
  }

  if (faction.influence_level) {
    stats.push({ 
      key: 'influence_level', 
      label: 'Influence', 
      value: faction.influence_level.toUpperCase() 
    });
  }

  if (faction.goals?.length > 0) {
    stats.push({ 
      key: 'goals', 
      label: 'Goals', 
      value: `${faction.goals.length} objectives` 
    });
  }

  if (faction.resources?.length > 0) {
    stats.push({ 
      key: 'resources', 
      label: 'Resources', 
      value: `${faction.resources.length} assets` 
    });
  }

  return (
    <div className="bg-[#1E2430]/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 space-y-3">
      {stats.map(stat => {
        const Icon = statIcons[stat.key];
        return (
          <div key={stat.key} className="flex items-center gap-3 text-sm">
            {Icon && <Icon className="w-4 h-4 text-[#37F2D1]" />}
            <div className="flex-1">
              <div className="text-gray-400 text-xs">{stat.label}</div>
              <div className="text-white font-semibold">{stat.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}