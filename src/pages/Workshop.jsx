import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductGrid from "@/components/workshop/ProductGrid";

export default function Workshop() {
  const { data: products } = useQuery({
    queryKey: ['allProducts'],
    queryFn: () => base44.entities.Product.list('-created_date'),
    initialData: []
  });

  const bestsellers = products.filter(p => p.is_bestseller);
  const newProducts = products.filter(p => p.is_new);
  const gamePacks = products.filter(p => p.category === 'game_pack');

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Workshop</h1>
          <p className="text-gray-400">Discover new adventures and content</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-[#2A3441]">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              All Products
            </TabsTrigger>
            <TabsTrigger value="bestsellers" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Best Sellers
            </TabsTrigger>
            <TabsTrigger value="new" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              New Releases
            </TabsTrigger>
            <TabsTrigger value="packs" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Game Packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ProductGrid products={products} />
          </TabsContent>

          <TabsContent value="bestsellers">
            <ProductGrid products={bestsellers} />
          </TabsContent>

          <TabsContent value="new">
            <ProductGrid products={newProducts} />
          </TabsContent>

          <TabsContent value="packs">
            <ProductGrid products={gamePacks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}