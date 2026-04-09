import React from "react";
import { Cloud, CloudRain, Trees, Users, AlertTriangle } from "lucide-react";

const statIcons = {
  climate: Cloud,
  weather: CloudRain,
  biomes: Trees,
  population: Users,
  danger: AlertTriangle
};

export default function RegionStats({ region }) {
  const stats = [
    { key: "climate", label: "Climate", value: region.climate, icon: Cloud },
    { key: "weather", label: "Weather", value: region.weather, icon: CloudRain },
    { key: "biomes", label: "Biomes", value: region.biomes, icon: Trees },
    { key: "population", label: "Population", value: region.population, icon: Users },
    { key: "danger", label: "Danger Rating", value: region.danger_rating, icon: AlertTriangle }
  ].filter(stat => stat.value);

  if (stats.length === 0) return null;

  return (
    <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <div className="w-1 h-6 bg-[#37F2D1] rounded-full"></div>
        Region Stats
      </h3>
      <div className="space-y-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-[#1E2430]/60 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-[#37F2D1]/20 rounded-lg border border-[#37F2D1]/30">
                  <Icon className="w-4 h-4 text-[#37F2D1]" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-400 font-bold text-sm uppercase tracking-wide mb-1">
                    {stat.label}
                  </div>
                  <div className="text-white font-semibold">
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}