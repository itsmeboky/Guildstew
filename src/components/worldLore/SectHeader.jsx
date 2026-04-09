import React from "react";

export default function SectHeader({ sect }) {
  const influenceColors = {
    minimal: '#6b7280',
    local: '#3b82f6',
    regional: '#8b5cf6',
    national: '#f59e0b',
    continental: '#ef4444',
    global: '#dc2626'
  };

  const backgroundColor = influenceColors[sect.influence_level] || '#6b7280';

  return (
    <div 
      className="relative h-48 overflow-hidden"
      style={{
        background: sect.image_url 
          ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${sect.image_url})`
          : `linear-gradient(135deg, ${backgroundColor}20, ${backgroundColor}40)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center gap-6 p-6">
        {sect.symbol_url && (
          <div className="w-32 h-32 bg-[#1E2430]/80 backdrop-blur-sm rounded-lg border-4 border-white/30 p-2 flex items-center justify-center">
            <img 
              src={sect.symbol_url} 
              alt={`${sect.name} symbol`}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-4xl font-bold text-white drop-shadow-lg">{sect.name}</h2>
          {sect.motto && (
            <p className="text-lg text-gray-200 italic mt-2 drop-shadow-md">"{sect.motto}"</p>
          )}
        </div>
      </div>
    </div>
  );
}