import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CreatorCard({ creator }) {
  return (
    <div className="relative group overflow-hidden rounded-lg">
      <div 
        className="h-64 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${creator.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop'})` 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#FF5722] via-[#FF5722]/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-xl mb-2 uppercase">
            {creator.username || "Creator"}
          </h3>
          <Link 
            to={createPageUrl("UserProfile") + `?id=${creator.id}`}
            className="text-white hover:underline flex items-center gap-1"
          >
            View Profile <span>&gt;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}