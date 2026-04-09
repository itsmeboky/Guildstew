import React from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export default function TopProducts({ products }) {
  return (
    <div className="bg-[#2A3441] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider">Top Selling Products</h3>
        <button className="text-gray-400 hover:text-white">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="group cursor-pointer relative"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 mb-2 group-hover:scale-105 transition-transform">
              <img
                src={product.cover_image_url || 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=200&h=200&fit=crop'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              
              {product.is_bestseller && (
                <Badge className="absolute top-2 right-2 bg-[#FF5722] text-white text-xs">
                  Best Seller
                </Badge>
              )}
              {product.is_new && (
                <Badge className="absolute top-2 right-2 bg-[#37F2D1] text-[#1E2430] text-xs">
                  New
                </Badge>
              )}
            </div>
            
            <p className="text-xs font-medium truncate mb-1">{product.name}</p>
            <p className="text-sm font-bold text-[#37F2D1]">${product.price.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-gray-500 text-center py-8 text-sm">No products available</p>
      )}
    </div>
  );
}