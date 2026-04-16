import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/workshop/ProductCard";
import CreatorCard from "@/components/workshop/CreatorCard";

const HERO_BANNERS = [
  {
    image: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/tavern/1f9516a5f_Karliah.png",
    title: "Whip Up Something New",
    buttonText: "BECOME A CREATOR",
    buttonAction: "create",
    textColor: "text-[#FF5722]",
    alignRight: true
  },
  {
    image: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/tavern/057be99da_KidsonBikes.png",
    title: "KIDS ON BIKES",
    buttonText: "AVAILABLE NOW",
    buttonAction: "product",
    textColor: "text-white",
    alignRight: false
  },
  {
    image: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/tavern/b72150a33_MorkBorg.png",
    title: "TAKE ON THE APOCALYPSE",
    buttonText: "CHECK OUT MORKBORG",
    buttonAction: "product",
    textColor: "text-white",
    alignRight: false
  }
];

export default function TheTavern() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [activeTab, setActiveTab] = useState("categories");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date'),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % HERO_BANNERS.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + HERO_BANNERS.length) % HERO_BANNERS.length);
  };

  const featuredProducts = products.filter(p => p.is_featured).slice(0, 4);
  const whatsHot = products.filter(p => !p.is_featured).slice(0, 4);
  
  const topCreators = users
    .filter(u => products.some(p => p.creator_id === u.id))
    .slice(0, 8);

  const getCreatorName = (creatorId) => {
    if (!creatorId) return "Guildstew Studios";
    const creator = users.find(u => u.id === creatorId);
    return creator?.username || creator?.full_name || "Unknown Creator";
  };

  const filterProducts = () => {
    let filtered = products;

    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (activeTab === "merchants" && searchQuery) {
      filtered = filtered.filter(p => 
        getCreatorName(p.creator_id).toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (activeTab === "categories" && searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredProducts = filterProducts();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner Carousel */}
      <div className="relative h-[400px] overflow-hidden">
        {HERO_BANNERS.map((banner, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentBanner ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${banner.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className={`absolute inset-0 flex items-center ${banner.alignRight ? 'justify-end pr-20' : 'justify-center'} text-center`}>
              <div className="space-y-6">
                <h1 className={`text-6xl font-bold ${banner.textColor}`} style={{ fontFamily: 'Cream, Inter, sans-serif' }}>
                  {banner.title}
                </h1>
                <Button className="bg-[#1E2430] hover:bg-[#2A3441] text-white px-8 py-6 text-lg">
                  {banner.buttonText}
                </Button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={prevBanner}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={nextBanner}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_BANNERS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBanner(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentBanner ? 'bg-white w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tab Toggle Section */}
      <div className="bg-[#2A3441]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2">
            <button
              onClick={() => setActiveTab("categories")}
              className={`py-6 font-bold text-lg transition-colors ${
                activeTab === "categories" 
                  ? "bg-[#FF5722] text-white" 
                  : "text-white hover:bg-[#1E2430]"
              }`}
            >
              Shop Categories
            </button>
            <button
              onClick={() => setActiveTab("merchants")}
              className={`py-6 font-bold text-lg transition-colors ${
                activeTab === "merchants" 
                  ? "bg-[#FF5722] text-white" 
                  : "text-white hover:bg-[#1E2430]"
              }`}
            >
              Search Merchants
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-[#FF5722] py-6">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 bg-[#FF5722] text-white border-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-[#FF5722] border-white">
                <SelectItem value="all" className="text-white">All Categories</SelectItem>
                <SelectItem value="game_pack" className="text-white">Game Packs</SelectItem>
                <SelectItem value="dice_pack" className="text-white">Dice Packs</SelectItem>
                <SelectItem value="ui_pack" className="text-white">UI Packs</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === "merchants" ? "Search by creator..." : "Search products..."}
                className="bg-[#FF5722] text-white placeholder:text-white/70 border-white"
              />
              <Button className="bg-[#1E2430] hover:bg-[#2A3441] text-white">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "categories" ? (
        <>
          {/* Featured Section */}
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-[#FF5722]">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-900">FEATURED</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  creatorName={getCreatorName(product.creator_id)}
                />
              ))}
            </div>
          </div>

          {/* What's Hot Section */}
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-[#FF5722]">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-900">WHAT'S HOT</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {whatsHot.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  creatorName={getCreatorName(product.creator_id)}
                />
              ))}
            </div>
          </div>

          {/* Top Creators Section */}
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-[#FF5722]">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.5 11.5C7.5 9.01 9.51 7 12 7s4.5 2.01 4.5 4.5S14.49 16 12 16s-4.5-2.01-4.5-4.5zM0 20v-1.5C0 16.01 1.99 14 4.45 14h.3c.14 0 .28.01.42.02.43.07.84.27 1.2.59.72.64 1.67 1.03 2.71 1.03h5.84c1.04 0 1.99-.39 2.71-1.03.36-.32.77-.52 1.2-.59.14-.01.28-.02.42-.02h.3c2.46 0 4.45 2.01 4.45 4.5V20H0z"/>
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gray-900">TOP CREATORS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {topCreators.map(creator => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product}
                creatorName={getCreatorName(product.creator_id)}
              />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}