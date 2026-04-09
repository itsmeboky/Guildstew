import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductGrid({ products }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-[#2A3441] rounded-2xl overflow-hidden hover:ring-2 hover:ring-[#37F2D1] transition-all group"
        >
          <div className="aspect-square overflow-hidden relative bg-gradient-to-br from-orange-600 to-red-700">
            <img
              src={product.cover_image_url || 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400&h=400&fit=crop'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            />
            
            {product.is_bestseller && (
              <Badge className="absolute top-3 right-3 bg-[#FF5722] text-white">
                Best Seller
              </Badge>
            )}
            {product.is_new && (
              <Badge className="absolute top-3 right-3 bg-[#37F2D1] text-[#1E2430]">
                New
              </Badge>
            )}
          </div>
          
          <div className="p-4">
            <h3 className="font-bold text-lg mb-1 truncate">{product.name}</h3>
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {product.description || 'No description available'}
            </p>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
              </div>
              <p className="text-xl font-bold text-[#37F2D1]">${product.price.toFixed(2)}</p>
            </div>

            <Button className="w-full bg-[#FF5722] hover:bg-[#FF6B3D]">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}