import React from "react";
import { Badge } from "@/components/ui/badge";
import { Swords, Shield, Heart } from "lucide-react";

export default function CharacterGrid({ characters }) {
  if (characters.length === 0) {
    return (
      <div className="text-center py-16">
        <Swords className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No characters created yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {characters.map((character) => (
        <div
          key={character.id}
          className="bg-[#2A3441] rounded-2xl overflow-hidden hover:ring-2 hover:ring-[#37F2D1] transition-all group cursor-pointer"
        >
          <div className="aspect-square overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600">
            <img
              src={character.avatar_url || 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=400&h=400&fit=crop'}
              alt={character.name}
              className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform"
            />
          </div>
          
          <div className="p-4">
            <h3 className="font-bold text-lg mb-1">{character.name}</h3>
            <p className="text-sm text-gray-400 mb-3">Level {character.level} {character.class}</p>
            
            {character.tags && character.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {character.tags.slice(0, 3).map((tag, idx) => (
                  <Badge
                    key={idx}
                    className="text-xs bg-gradient-to-r from-green-400/20 to-yellow-400/20 text-green-300 border-green-400/30"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Swords className="w-3 h-3" />
                <span>{character.stats?.dps || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>{character.stats?.defense || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span>{character.stats?.healing || 0}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}