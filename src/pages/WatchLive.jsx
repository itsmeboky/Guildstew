import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

const MOCK_STREAMS = [
  {
    id: 1,
    title: "Epic Dragon Battle - Session 24",
    streamer: "QuestQuasar",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    game: "Dungeons & Dragons",
    viewers: 234,
    thumbnail: "https://images.unsplash.com/photo-1551431009-a802eeec77b1?w=600&h=400&fit=crop",
    tags: ["D&D 5e", "Fantasy", "Combat"],
    category: "Dungeons & Dragons"
  },
  {
    id: 2,
    title: "Building, Battling, and Victory",
    streamer: "SkilzePulse",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop",
    game: "Pathfinder",
    viewers: 189,
    thumbnail: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&h=400&fit=crop",
    tags: ["Pathfinder 2e", "English", "RP-Heavy"],
    category: "Pathfinder"
  },
  {
    id: 3,
    title: "Merciless Gunslinger",
    streamer: "BattlefieldChaos",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    game: "Cyberpunk Red",
    viewers: 156,
    thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop",
    tags: ["Sci-Fi", "Cyberpunk", "Action"],
    category: "Sci-Fi"
  },
  {
    id: 4,
    title: "Viewer Requests Welcome!",
    streamer: "TacticalSniper92",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    game: "Call of Cthulhu",
    viewers: 89,
    thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&h=400&fit=crop",
    tags: ["Horror", "Mystery", "Investigation"],
    category: "Horror"
  },
  {
    id: 5,
    title: "Space Opera Adventures",
    streamer: "StarGazer88",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    game: "Starfinder",
    viewers: 142,
    thumbnail: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=400&fit=crop",
    tags: ["Sci-Fi", "Space", "Adventure"],
    category: "Sci-Fi"
  },
  {
    id: 6,
    title: "Hilarious One-Shot Night",
    streamer: "LaughTrackDM",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    game: "Honey Heist",
    viewers: 98,
    thumbnail: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&h=400&fit=crop",
    tags: ["Comedy", "One-Shot", "Casual"],
    category: "Comedy"
  },
  {
    id: 7,
    title: "Enchanted Forest Quest",
    streamer: "MysticMage",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    game: "D&D 5e",
    viewers: 201,
    thumbnail: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=600&h=400&fit=crop",
    tags: ["D&D 5e", "Fantasy", "Magic"],
    category: "Fantasy"
  },
  {
    id: 8,
    title: "Detective Noir Investigation",
    streamer: "ShadowDetective",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    game: "Call of Cthulhu",
    viewers: 76,
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
    tags: ["Mystery", "Noir", "Investigation"],
    category: "Mystery"
  }
];

const TRENDING_CATEGORIES = [
  { name: "Dungeons & Dragons", color: "bg-red-500" },
  { name: "Pathfinder", color: "bg-blue-500" },
  { name: "Sci-Fi", color: "bg-purple-500" },
  { name: "Horror", color: "bg-gray-700" },
  { name: "Fantasy", color: "bg-green-500" },
  { name: "Cyberpunk", color: "bg-pink-500" },
  { name: "Mystery", color: "bg-indigo-500" },
  { name: "Comedy", color: "bg-yellow-500" }
];

const UPCOMING_EVENTS = [
  {
    title: "GuildStew Demo Day",
    date: "Nov 18, 2025",
    time: "2:00 PM EST",
    thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=200&fit=crop"
  },
  {
    title: "Developer Showcase",
    date: "Nov 22, 2025",
    time: "7:00 PM EST",
    thumbnail: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&h=200&fit=crop"
  }
];

export default function WatchLive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredStreams = selectedCategory 
    ? MOCK_STREAMS.filter(stream => stream.category === selectedCategory)
    : MOCK_STREAMS;

  const featuredStream = filteredStreams[0];
  const recommendedStreams = filteredStreams.slice(1);

  return (
    <div className="min-h-screen bg-[#1E2430] p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured Stream */}
            {featuredStream && (
              <div className="bg-[#2A3441] rounded-xl overflow-hidden hover:shadow-2xl transition-all group cursor-pointer">
                <div className="relative h-[400px] bg-cover bg-center" style={{ backgroundImage: `url(${featuredStream.thumbnail})` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2A3441] via-transparent to-transparent" />
                  <Badge className="absolute top-4 left-4 bg-[#FF00FF] text-white px-3 py-1 text-sm font-bold">
                    LIVE
                  </Badge>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold text-white mb-2">{featuredStream.title}</h2>
                    <div className="flex items-center gap-3">
                      <img src={featuredStream.avatar} alt={featuredStream.streamer} className="w-10 h-10 rounded-full border-2 border-[#37F2D1]" />
                      <div>
                        <p className="text-white font-semibold flex items-center gap-2">
                          {featuredStream.streamer}
                          <span className="w-2 h-2 bg-[#37F2D1] rounded-full"></span>
                        </p>
                        <p className="text-gray-400 text-sm">{featuredStream.game}</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-lg">
                    <Eye className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-semibold">{featuredStream.viewers} viewers</span>
                  </div>
                </div>
              </div>
            )}

            {/* Live Channels We Think You'll Like */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                {selectedCategory ? `${selectedCategory} Streams` : "Live channels we think you'll like"}
              </h2>
              {recommendedStreams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendedStreams.map(stream => (
                    <div key={stream.id} className="bg-[#2A3441] rounded-xl overflow-hidden hover:shadow-xl hover:scale-105 transition-all group cursor-pointer">
                      <div className="relative h-40 bg-cover bg-center" style={{ backgroundImage: `url(${stream.thumbnail})` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2A3441] to-transparent" />
                        <Badge className="absolute top-2 left-2 bg-[#FF00FF] text-white text-xs px-2 py-0.5 font-bold">
                          LIVE
                        </Badge>
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded text-xs">
                          <Eye className="w-3 h-3 text-white" />
                          <span className="text-white font-semibold">{stream.viewers}</span>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-1">{stream.title}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <img src={stream.avatar} alt={stream.streamer} className="w-6 h-6 rounded-full" />
                          <div className="flex-1">
                            <p className="text-white text-xs font-medium flex items-center gap-1">
                              {stream.streamer}
                              <span className="w-1.5 h-1.5 bg-[#37F2D1] rounded-full"></span>
                            </p>
                            <p className="text-gray-400 text-xs">{stream.game}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {stream.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs text-gray-400 border-gray-600">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#2A3441] rounded-xl p-12 text-center">
                  <p className="text-gray-400">No streams found for this category</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (1/3) */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="bg-[#2A3441] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg">Upcoming Events</h3>
                <span className="text-[#37F2D1] text-sm">01.12 - 07.12</span>
              </div>
              
              <div className="space-y-4">
                {UPCOMING_EVENTS.map((event, idx) => (
                  <div key={idx} className="group cursor-pointer">
                    <div 
                      className="h-32 bg-cover bg-center rounded-lg mb-2 relative overflow-hidden"
                      style={{ backgroundImage: `url(${event.thumbnail})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <h4 className="text-white font-bold text-sm group-hover:text-[#37F2D1] transition-colors">
                          {event.title}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{event.date} • {event.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-[#2A3441] rounded-xl p-4">
              <h3 className="text-white font-bold text-lg mb-4">Categories</h3>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search categories..."
                    className="bg-[#1E2430] border-gray-700 text-white pl-10"
                  />
                </div>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="w-full mb-2 p-2 rounded-lg bg-[#37F2D1] text-[#1E2430] font-semibold text-sm hover:bg-[#2dd9bd] transition-colors"
                >
                  Clear Filter
                </button>
              )}
              <div className="space-y-2">
                {TRENDING_CATEGORIES.map((category, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-[#1E2430] transition-colors cursor-pointer group ${
                      selectedCategory === category.name ? 'bg-[#1E2430] ring-2 ring-[#37F2D1]' : ''
                    }`}
                  >
                    <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                      {category.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm transition-colors ${
                        selectedCategory === category.name ? 'text-[#37F2D1]' : 'text-white group-hover:text-[#37F2D1]'
                      }`}>
                        {category.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}