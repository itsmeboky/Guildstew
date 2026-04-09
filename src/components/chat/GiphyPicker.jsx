import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GiphyPicker({ onSelectGif, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchGifs = async (query) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = 'your_giphy_api_key'; // This is a placeholder - Giphy has a public API key
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh&q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    }
    setIsLoading(false);
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    searchGifs(value);
  };

  return (
    <div className="bg-white p-4 h-64">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search GIFs..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 text-gray-900"
        />
      </div>

      <ScrollArea className="h-48">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelectGif(gif.images.fixed_height.url)}
                className="relative aspect-square overflow-hidden rounded-lg hover:ring-2 hover:ring-[#FF5722] transition-all"
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No GIFs found</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Search for GIFs</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}