import React from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default function ProductCard({ product, creatorName }) {
  const categoryLabels = {
    game_pack: "Game Pack",
    dice_pack: "Dice Pack",
    ui_pack: "UI Pack"
  };

  const categoryColors = {
    game_pack: "bg-[#FF5722] text-white",
    dice_pack: "bg-purple-500 text-white",
    ui_pack: "bg-blue-500 text-white"
  };

  return (
    <div className="bg-[#2A3441] rounded-xl overflow-hidden hover:shadow-xl transition-all hover:scale-105">
      <div 
        className="h-48 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${product.cover_image_url || 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=300&fit=crop'})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#2A3441] to-transparent" />
        <Badge className={`absolute top-3 right-3 ${categoryColors[product.category]}`}>
          {categoryLabels[product.category]}
        </Badge>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 truncate">{product.name}</h3>
        
        <p className="text-sm text-gray-400 mb-2">by {creatorName}</p>
        
        {product.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-[#37F2D1]">
            ${product.price.toFixed(2)}
          </span>
          
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm text-gray-400">{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}