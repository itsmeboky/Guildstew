import React from "react";
import { Mountain, TreePine, Flame, Building2, Home, Waves, Wheat, Droplets, Snowflake, Castle, Landmark } from "lucide-react";

const iconMap = {
  mountain: Mountain,
  forest: TreePine,
  desert: Flame,
  city: Building2,
  village: Home,
  ocean: Waves,
  plains: Wheat,
  swamp: Droplets,
  tundra: Snowflake,
  castle: Castle,
  ruins: Landmark,
  volcano: Mountain
};

export default function RegionHeader({ region }) {
  const Icon = iconMap[region.icon] || Mountain;

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6">
      {region.image_url ? (
        <img
          src={region.image_url}
          alt={region.name}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#2A3441] to-[#1E2430]" />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      <div className="absolute bottom-6 left-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
          <Icon className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white">{region.name}</h2>
      </div>
    </div>
  );
}