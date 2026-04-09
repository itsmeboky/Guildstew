import React from "react";
import { Church, TrendingUp, Users, Package } from "lucide-react";

export default function SectStats({ sect }) {
  const statIcons = {
    type: Church,
    influence_level: TrendingUp,
    tenets: Users,
    resources: Package
  };

  const stats = [];

  if (sect.type) {
    stats.push({ 
      key: 'type', 
      label: 'Type', 
      value: sect.type.replace('_', ' ').toUpperCase() 
    });
  }

  if (sect.influence_level) {
    stats.push({ 
      key: 'influence_level', 
      label: 'Influence', 
      value: sect.influence_level.toUpperCase() 
    });
  }

  if (sect.tenets?.length > 0) {
    stats.push({ 
      key: 'tenets', 
      label: 'Tenets', 
      value: `${sect.tenets.length} beliefs` 
    });
  }

  if (sect.resources?.length > 0) {
    stats.push({ 
      key: 'resources', 
      label: 'Resources', 
      value: `${sect.resources.length} assets` 
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