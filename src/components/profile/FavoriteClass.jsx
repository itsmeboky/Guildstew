import React from "react";

export default function FavoriteClass({ favoriteClass, iconUrl }) {
  return (
    <div className="bg-[#2A3441] rounded-2xl p-6 h-full flex flex-col items-center justify-center">
      <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Favorite Class</h3>
      
      <p className="text-xl font-bold text-center text-[#ffc6aa] mb-4">{favoriteClass || 'Not Set'}</p>
      
      <div className="w-40 h-40">
        {iconUrl ? (
          <img src={iconUrl} alt={favoriteClass} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500 flex items-center justify-center">
            <div className="text-6xl">⚔️</div>
          </div>
        )}
      </div>
    </div>
  );
}