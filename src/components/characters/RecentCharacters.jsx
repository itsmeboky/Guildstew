import React from "react";
import { Swords } from "lucide-react";

export default function RecentCharacters({ characters }) {
  return (
    <div className="bg-[#2A3441] rounded-2xl p-6">
      <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
        Recently Played Characters
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {characters.slice(0, 4).map((character) => (
          <div
            key={character.id}
            className="bg-[#1E2430] rounded-xl p-3 flex items-center gap-2 hover:bg-[#37F2D1]/10 transition-colors cursor-pointer"
          >
            <Swords className="w-4 h-4 text-[#37F2D1]" />
            <span className="text-sm font-medium truncate">{character.name}</span>
          </div>
        ))}
      </div>

      {characters.length === 0 && (
        <p className="text-gray-500 text-center py-8 text-sm">No characters yet</p>
      )}
    </div>
  );
}