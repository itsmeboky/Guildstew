import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Heart, MessageCircle, Upload, X, Trash2, Save, Globe, Cake, User } from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Link } from "react-router-dom";
import EditProfileDialog from "@/components/profile/EditProfileDialog";

export default function YourProfile() {
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [newPost, setNewPost] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editingLinks, setEditingLinks] = useState(false);
  const [links, setLinks] = useState([]);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: characters } = useQuery({
    queryKey: ['recentCharacters'],
    queryFn: () => base44.entities.Character.filter({ created_by: user?.email }, '-last_played', 6),
    enabled: !!user,
    initialData: []
  });

  const { data: campaigns } = useQuery({
    queryKey: ['recentCampaigns'],
    queryFn: async () => {
      const allCampaigns = await base44.entities.Campaign.list('-updated_date');
      return allCampaigns.filter(c => 
        c.game_master_id === user?.id || c.player_ids?.includes(user?.id)
      ).slice(0, 9);
    },
    enabled: !!user,
    initialData: []
  });

  const { data: posts } = useQuery({
    queryKey: ['userPosts'],
    queryFn: () => base44.entities.Post.filter({ profile_user_id: user?.id }, '-created_date'),
    enabled: !!user,
    initialData: []
  });

  const { data: featuredAchievements } = useQuery({
    queryKey: ['featuredAchievements'],
    queryFn: async () => {
      if (!user?.featured_achievement_ids || user.featured_achievement_ids.length === 0) {
        return [];
      }
      const allAchievements = await base44.entities.Achievement.filter({ user_id: user.id });
      return allAchievements.filter(a => user.featured_achievement_ids.includes(a.id)).slice(0, 3);
    },
    enabled: !!user,
    initialData: []
  });

  const displayedPosts = showAllPosts ? posts : posts.slice(0, 5);

  const { data: allUserProfiles } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    refetchInterval: 5000,
    initialData: []
  });

  const { data: friendships } = useQuery({
    queryKey: ['userFriends'],
    queryFn: async () => {
      const allFriendships = await base44.entities.Friend.list();
      return allFriendships.filter(f => 
        (f.user_id === user?.id || f.friend_id === user?.id) && f.status === 'accepted'
      );
    },
    enabled: !!user,
    initialData: []
  });

  const friends = React.useMemo(() => {
    if (!friendships || !allUserProfiles || !user) return [];
    
    const friendMap = new Map();
    
    friendships.forEach(f => {
      const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
      if (!friendMap.has(friendId)) {
        const profile = allUserProfiles.find(p => p.user_id === friendId);
        if (profile) {
          friendMap.set(friendId, {
            id: profile.user_id,
            username: profile.username,
            email: profile.email,
            avatar_url: profile.avatar_url
          });
        }
      }
    });
    
    const uniqueFriends = Array.from(friendMap.values());
    const shuffled = [...uniqueFriends].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 9);
  }, [friendships, allUserProfiles, user]);

  React.useEffect(() => {
    if (user) {
      setBioText(user.bio || "");
      setSelectedGenres(user.favorite_genres || []);
      setLinks(user.social_links || []);
    }
  }, [user]);

  const updateBioMutation = useMutation({
    mutationFn: (bio) => base44.auth.updateMe({ bio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditingBio(false);
    }
  });

  const updateGenresMutation = useMutation({
    mutationFn: (genres) => base44.auth.updateMe({ favorite_genres: genres }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });



  const updateLinksMutation = useMutation({
    mutationFn: (socialLinks) => base44.auth.updateMe({ social_links: socialLinks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditingLinks(false);
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      let imageUrl = null;
      if (postImage) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: postImage });
        imageUrl = file_url;
      }

      // Detect links in content
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const links = data.content.match(urlRegex);
      let linkPreview = null;

      if (links && links.length > 0) {
        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Extract the title, description, and preview image URL from this webpage: ${links[0]}. Return only the metadata.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                image: { type: "string" }
              }
            }
          });
          linkPreview = { url: links[0], ...result };
        } catch (e) {
          // Fallback if preview fetch fails
          linkPreview = { url: links[0], title: links[0], description: "", image: "" };
        }
      }

      return base44.entities.Post.create({ 
        profile_user_id: user.id,
        content: data.content, 
        image_url: imageUrl,
        link_preview: linkPreview
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      setNewPost("");
      setPostImage(null);
    }
  });

  const likePostMutation = useMutation({
    mutationFn: ({ postId, likes }) => base44.entities.Post.update(postId, { likes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, content }) => base44.entities.Post.update(postId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      setEditingPost(null);
      setEditContent("");
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => base44.entities.Post.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
    }
  });

  const handleLikePost = (post) => {
    const likes = post.likes || [];
    const hasLiked = likes.includes(user?.id);
    const newLikes = hasLiked ? likes.filter(id => id !== user?.id) : [...likes, user?.id];
    likePostMutation.mutate({ postId: post.id, likes: newLikes });
  };

  const availableGenres = [
    "High Fantasy", "Low Fantasy", "Dark Fantasy", "Grimdark", "Sword & Sorcery", "Urban Fantasy", "Modern Fantasy", "Mythic Fantasy", "Fairy Tale", "Gaslamp Fantasy", "Dungeon Crawl", "Wuxia", "Xianxia",
    "Hard Sci-Fi", "Soft Sci-Fi", "Cyberpunk", "Solarpunk", "Biopunk", "Steampunk", "Dieselpunk", "Atompunk", "Post-Cyberpunk", "Mecha", "Space Opera", "Space Western", "Time Travel",
    "Gothic Horror", "Cosmic Horror", "Supernatural Horror", "Folk Horror", "Survival Horror", "Psychological Horror", "Splatter Horror", "Paranormal Investigation",
    "Zombie Apocalypse", "Wasteland", "Bio-Plague", "Nuclear Fallout", "Alien Invasion", "Magical Apocalypse", "Climate Collapse", "Reclamation / Rebuilding",
    "Ancient World", "Medieval", "Renaissance", "Age of Sail", "Victorian", "Western", "Roaring 20s", "World War", "Cold War",
    "Crime", "Heist", "Noir", "Action Thriller", "Military Ops", "Urban Grit", "Espionage",
    "Monster Hunting", "Occult", "Paranormal", "Supernatural Urban", "Modern Mythology", "Angels & Demons",
    "Classic Superheroes", "Vigilante", "Teen Supers", "Cosmic Supers", "Mutant Powers",
    "Absurdist", "Parody", "Slice-of-Life Comedy", "Goblin Chaos",
    "Detective", "Whodunnit", "Conspiracy", "Tech Thriller",
    "Cozy Romance", "Romantic Fantasy", "Gothic Romance", "Drama Romance",
    "Expedition", "Treasure Hunting", "Naval Adventure", "Skyship Adventure", "Lost World",
    "Wilderness Survival", "Ocean Survival", "Space Survival", "Isolated Outpost",
    "Multiverse", "Planar", "Dreamworld", "Surreal", "Anthropomorphic", "Kaiju", "Wargame Hybrid", "Narrative Drama"
  ];

  const genreGradients = {
    "High Fantasy": "from-purple-500 to-pink-500", "Low Fantasy": "from-indigo-400 to-purple-400", "Dark Fantasy": "from-gray-700 to-purple-900", "Grimdark": "from-gray-900 to-red-900", "Sword & Sorcery": "from-orange-500 to-red-600", "Urban Fantasy": "from-indigo-500 to-purple-600", "Modern Fantasy": "from-blue-400 to-purple-500", "Mythic Fantasy": "from-yellow-400 to-purple-500", "Fairy Tale": "from-pink-300 to-purple-400", "Gaslamp Fantasy": "from-amber-500 to-orange-600", "Dungeon Crawl": "from-stone-600 to-gray-800", "Wuxia": "from-red-500 to-yellow-500", "Xianxia": "from-cyan-400 to-blue-500",
    "Hard Sci-Fi": "from-blue-600 to-cyan-500", "Soft Sci-Fi": "from-sky-400 to-blue-500", "Cyberpunk": "from-pink-500 to-purple-600", "Solarpunk": "from-green-400 to-emerald-500", "Biopunk": "from-lime-500 to-green-600", "Steampunk": "from-amber-600 to-yellow-700", "Dieselpunk": "from-orange-700 to-amber-800", "Atompunk": "from-cyan-500 to-teal-600", "Post-Cyberpunk": "from-violet-500 to-fuchsia-600", "Mecha": "from-slate-500 to-blue-600", "Space Opera": "from-indigo-600 to-purple-700", "Space Western": "from-orange-600 to-red-700", "Time Travel": "from-blue-500 to-purple-600",
    "Gothic Horror": "from-purple-900 to-gray-900", "Cosmic Horror": "from-indigo-900 to-purple-950", "Supernatural Horror": "from-violet-800 to-gray-900", "Folk Horror": "from-green-900 to-gray-800", "Survival Horror": "from-red-900 to-gray-900", "Psychological Horror": "from-gray-800 to-slate-900", "Splatter Horror": "from-red-700 to-red-950", "Paranormal Investigation": "from-indigo-700 to-purple-900",
    "Zombie Apocalypse": "from-green-800 to-gray-900", "Wasteland": "from-yellow-800 to-orange-900", "Bio-Plague": "from-lime-700 to-green-900", "Nuclear Fallout": "from-orange-600 to-red-800", "Alien Invasion": "from-purple-700 to-red-800", "Magical Apocalypse": "from-fuchsia-600 to-purple-900", "Climate Collapse": "from-blue-800 to-gray-900", "Reclamation / Rebuilding": "from-emerald-600 to-teal-700",
    "Ancient World": "from-amber-700 to-orange-800", "Medieval": "from-stone-600 to-amber-700", "Renaissance": "from-rose-500 to-amber-600", "Age of Sail": "from-blue-600 to-cyan-700", "Victorian": "from-purple-700 to-gray-800", "Western": "from-yellow-700 to-orange-800", "Roaring 20s": "from-yellow-500 to-pink-600", "World War": "from-gray-700 to-red-800", "Cold War": "from-blue-800 to-gray-800",
    "Crime": "from-red-700 to-gray-800", "Heist": "from-emerald-600 to-cyan-700", "Noir": "from-gray-800 to-slate-900", "Action Thriller": "from-red-600 to-orange-700", "Military Ops": "from-green-700 to-gray-800", "Urban Grit": "from-slate-700 to-gray-900", "Espionage": "from-blue-700 to-gray-800",
    "Monster Hunting": "from-red-600 to-purple-700", "Occult": "from-purple-700 to-gray-900", "Paranormal": "from-violet-600 to-purple-800", "Supernatural Urban": "from-indigo-600 to-gray-800", "Modern Mythology": "from-cyan-500 to-purple-600", "Angels & Demons": "from-yellow-400 to-red-700",
    "Classic Superheroes": "from-blue-500 to-red-600", "Vigilante": "from-red-700 to-gray-900", "Teen Supers": "from-pink-500 to-blue-600", "Cosmic Supers": "from-purple-600 to-cyan-500", "Mutant Powers": "from-green-500 to-purple-600",
    "Absurdist": "from-pink-400 to-yellow-400", "Parody": "from-orange-400 to-pink-500", "Slice-of-Life Comedy": "from-green-400 to-blue-400", "Goblin Chaos": "from-lime-500 to-orange-600",
    "Detective": "from-amber-600 to-gray-700", "Whodunnit": "from-purple-600 to-gray-700", "Conspiracy": "from-red-700 to-gray-900", "Tech Thriller": "from-cyan-600 to-blue-800",
    "Cozy Romance": "from-pink-400 to-rose-500", "Romantic Fantasy": "from-rose-400 to-purple-500", "Gothic Romance": "from-purple-700 to-red-800", "Drama Romance": "from-red-500 to-pink-600",
    "Expedition": "from-green-600 to-blue-600", "Treasure Hunting": "from-yellow-600 to-orange-700", "Naval Adventure": "from-blue-600 to-cyan-600", "Skyship Adventure": "from-sky-500 to-indigo-600", "Lost World": "from-green-700 to-purple-700",
    "Wilderness Survival": "from-green-700 to-emerald-800", "Ocean Survival": "from-blue-700 to-cyan-800", "Space Survival": "from-indigo-700 to-purple-900", "Isolated Outpost": "from-gray-700 to-blue-800",
    "Multiverse": "from-purple-500 to-pink-600", "Planar": "from-indigo-600 to-violet-700", "Dreamworld": "from-pink-400 to-purple-500", "Surreal": "from-fuchsia-500 to-cyan-500", "Anthropomorphic": "from-orange-500 to-pink-500", "Kaiju": "from-red-700 to-purple-800", "Wargame Hybrid": "from-slate-600 to-red-700", "Narrative Drama": "from-rose-600 to-purple-700"
  };

  const color1 = user?.profile_color_1 || "#FF5722";
  const color2 = user?.profile_color_2 || "#37F2D1";

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      const newGenres = selectedGenres.filter(g => g !== genre);
      setSelectedGenres(newGenres);
      updateGenresMutation.mutate(newGenres);
    } else if (selectedGenres.length < 9) {
      const newGenres = [...selectedGenres, genre];
      setSelectedGenres(newGenres);
      updateGenresMutation.mutate(newGenres);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#0f1419] relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      {/* Hero Banner - Fixed to take 50% of page */}
      <div className="fixed top-0 left-0 right-0 h-[50vh] z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${user?.banner_url || 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=1200&h=400&fit=crop'})`,
            filter: 'brightness(0.7)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#131820]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-[1600px] mx-auto pl-[75px] pr-12 pt-32 pb-12">
        {/* Profile Header Box */}
        <div className="bg-gradient-to-br from-[#1a1f2e]/95 to-[#2A3441]/95 backdrop-blur-md rounded-2xl p-6 mb-8 relative overflow-hidden" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80, 0 20px 25px -5px rgba(0, 0, 0, 0.3)` }}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF5722]/5 to-[#37F2D1]/5" />
          <div className="relative z-10">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 w-32 h-32 rounded-full blur-xl opacity-50" style={{ background: `linear-gradient(to right, ${color1}, ${color2})` }} />
              <div className="relative w-32 h-32 rounded-full border-4 overflow-hidden bg-[#1a1f2e] shadow-2xl" style={{ borderColor: color1, boxShadow: `0 20px 25px -5px ${color1}80` }}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white">
                    {user?.full_name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg" style={{ background: `linear-gradient(to right, ${color1}, ${color2})`, boxShadow: `0 10px 15px -3px ${color1}80` }}>
                {user?.role === 'admin' ? 'Admin' : 'Game Master'}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent" style={{ 
                    backgroundImage: `linear-gradient(to right, ${color1}, ${color2})`
                  }}>@{user?.username || user?.email?.split('@')[0]}</h1>
                  <p className="text-gray-400 text-sm">● Last online this week</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    size="sm" 
                    onClick={() => setEditProfileOpen(true)}
                    style={{ 
                      background: `linear-gradient(to right, ${color1}, ${color2})`,
                      boxShadow: `0 4px 6px -1px ${color1}50`
                    }}
                    className="text-white border-0 hover:opacity-90"
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4 leading-relaxed">{user?.tagline || "No tagline set."}</p>

              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#37F2D1]" />
                  <span className="text-white">{user?.country || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-[#37F2D1]" />
                  <span className="text-white">{user?.age || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#37F2D1]" />
                  <span className="text-white">{user?.pronouns || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>
          </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="col-span-3 space-y-6">
            {/* User Stats */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] rounded-xl" style={{ border: `1px solid ${color1}40` }}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#37F2D1]">{campaigns.length}</div>
                  <div className="text-xs text-gray-400">Campaigns</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#FF5722]">{characters.length}</div>
                  <div className="text-xs text-gray-400">Characters</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{posts.length}</div>
                  <div className="text-xs text-gray-400">Posts</div>
                </div>
              </div>
            </div>

            {/* Biography */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Biography</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {user?.bio || "No biography yet."}
              </p>
            </div>

            {/* Links */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Links</h3>
              <div className="space-y-2">
                {(user?.social_links || []).length > 0 ? (
                  user.social_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#37F2D1] hover:text-[#2dd9bd] transition-colors text-sm"
                    >
                      🔗 {link.label}
                    </a>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No links yet.</p>
                )}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6 relative z-20" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Achievements</h3>
              <div className="grid grid-cols-3 gap-3 relative z-30">
                {featuredAchievements.length > 0 ? (
                  featuredAchievements.map((achievement) => {
                    const rarityColors = {
                      common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                      rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                      legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    };
                    const rarityBorderColors = {
                      common: 'border-gray-500',
                      rare: 'border-blue-500',
                      epic: 'border-purple-500',
                      legendary: 'border-yellow-500'
                    };
                    return (
                      <div 
                        key={achievement.id} 
                        className={`aspect-square rounded-lg flex items-center justify-center ${rarityColors[achievement.rarity]} border overflow-visible relative group cursor-pointer z-40 transition-all`}
                        title={achievement.title}
                      >
                        {achievement.icon_url ? (
                          <img src={achievement.icon_url} alt={achievement.title} className="w-12 h-12 object-contain" />
                        ) : (
                          <span className="text-3xl">🏆</span>
                        )}
                        <div className={`absolute left-0 top-full mt-2 bg-[#2A3441] border-2 ${rarityBorderColors[achievement.rarity]} rounded-lg p-3 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[9999] shadow-2xl pointer-events-none`}>
                          <p className="text-white font-bold text-sm mb-2">{achievement.title}</p>
                          <p className="text-gray-300 text-xs leading-relaxed mb-2">{achievement.description}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${rarityColors[achievement.rarity]} text-[10px] px-2 py-0.5`}>
                              {achievement.rarity}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Earned {new Date(achievement.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square bg-[#1E2430] rounded-lg flex items-center justify-center border border-gray-700">
                      <span className="text-3xl">🏆</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Friends */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Friends</h3>
                {friendships.length > 0 && (
                  <span className="text-xs text-gray-400">{friendships.length} total</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {friends.map((friend) => (
                  <Link
                    key={friend.id}
                    to={createPageUrl(`UserProfile?id=${friend.id}`)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#FF5722]/30 hover:border-[#37F2D1] hover:shadow-lg hover:shadow-[#37F2D1]/50 transition-all cursor-pointer"
                    >
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.username || friend.email?.split('@')[0]}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1E2430] flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-600">{(friend.username || friend.email?.split('@')[0])?.[0] || 'U'}</span>
                      </div>
                    )}
                    </motion.div>
                    </Link>
                    ))}
              </div>
              {friends.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No friends yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Center Column - Feed */}
          <div className="col-span-6 space-y-6">
            {/* Social Feed */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Feed</h3>
              
              {/* Create Post - Only show on own profile */}
              <div className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] rounded-xl p-4 mb-6 border border-[#FF5722]/20">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share your adventure..."
                  rows={3}
                  className="bg-transparent border-none text-white mb-3"
                />
                {postImage && (
                  <div className="relative inline-block mb-3">
                    <img src={URL.createObjectURL(postImage)} alt="Preview" className="max-h-40 rounded-lg" />
                    <button
                      onClick={() => setPostImage(null)}
                      className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPostImage(e.target.files[0])}
                    className="hidden"
                    id="post-image"
                  />
                  <label htmlFor="post-image" className="cursor-pointer">
                    <Upload className="w-5 h-5 text-gray-400 hover:text-[#37F2D1]" />
                  </label>
                  <Button
                    onClick={() => createPostMutation.mutate({ content: newPost })}
                    disabled={!newPost.trim()}
                    className="ml-auto text-white hover:bg-[#FF5722] hover:text-white transition-all"
                    style={{ background: `linear-gradient(to right, ${color1}, ${color2})` }}
                    size="sm"
                  >
                    Post
                  </Button>
                </div>
              </div>

              {/* Posts */}
              <div className="space-y-4">
                {displayedPosts.map(post => {
                  const authorProfile = allUserProfiles.find(p => p.email === post.created_by);
                  const hasLiked = (post.likes || []).includes(user?.id);
                  const authorColor1 = user?.profile_color_1 || "#FF5722";
                  const authorColor2 = user?.profile_color_2 || "#37F2D1";

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] rounded-xl p-4 border border-[#FF5722]/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: `2px solid ${authorColor1}` }}>
                            {authorProfile?.avatar_url || user?.avatar_url ? (
                              <img src={authorProfile?.avatar_url || user?.avatar_url} alt={authorProfile?.username || user?.username} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold" style={{ background: `linear-gradient(to right, ${authorColor1}, ${authorColor2})` }}>
                                {(authorProfile?.username || user?.username)?.[0] || 'U'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${authorColor1}, ${authorColor2})` }}>{authorProfile?.username || user?.username}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(post.created_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPost(post.id);
                              setEditContent(post.content);
                            }}
                            className="text-gray-400 hover:text-[#37F2D1] h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePostMutation.mutate(post.id)}
                            className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {editingPost === post.id ? (
                        <div className="mb-3">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-[#2A3441] border-gray-700 mb-2"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => updatePostMutation.mutate({ postId: post.id, content: editContent })}
                              size="sm"
                              className="text-white hover:bg-[#FF5722] hover:text-white transition-all"
                              style={{ background: `linear-gradient(to right, ${color1}, ${color2})` }}
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingPost(null);
                                setEditContent("");
                              }}
                              size="sm"
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-300 mb-3">{post.content}</p>
                      )}
                      {post.image_url && (
                        <img src={post.image_url} alt="Post" className="w-full rounded-lg mb-3" />
                      )}
                      {post.link_preview && (
                        <a 
                          href={post.link_preview.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block border border-gray-700 rounded-lg overflow-hidden hover:border-[#37F2D1] transition-colors mb-3"
                        >
                          {post.link_preview.image && (
                            <img 
                              src={post.link_preview.image} 
                              alt={post.link_preview.title}
                              className="w-full h-48 object-cover"
                            />
                          )}
                          <div className="p-3 bg-[#2A3441]">
                            <h4 className="font-semibold text-white text-sm mb-1">{post.link_preview.title}</h4>
                            {post.link_preview.description && (
                              <p className="text-gray-400 text-xs line-clamp-2">{post.link_preview.description}</p>
                            )}
                            <p className="text-[#37F2D1] text-xs mt-2">{new URL(post.link_preview.url).hostname}</p>
                          </div>
                        </a>
                      )}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLikePost(post)}
                          className={`flex items-center gap-1 transition-colors ${
                            hasLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{(post.likes || []).length}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-400 hover:text-[#37F2D1] transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm">0</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {!showAllPosts && posts.length > 5 && (
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => setShowAllPosts(true)}
                    size="sm"
                    className="text-white hover:bg-[#FF5722] hover:text-white transition-all"
                    style={{ background: `linear-gradient(to right, ${color1}, ${color2})` }}
                  >
                    See Older Posts
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-3 space-y-6">
            {/* Recent Campaigns */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Recent Campaigns</h3>
              <div className="space-y-3">
                {campaigns.slice(0, 3).map(campaign => (
                  <motion.div
                    key={campaign.id}
                    whileHover={{ scale: 1.02 }}
                    className="relative h-24 rounded-lg overflow-hidden cursor-pointer border-2 border-[#FF5722]/30 hover:border-[#37F2D1] hover:shadow-lg hover:shadow-[#37F2D1]/50 transition-all"
                  >
                    <img
                      src={campaign.cover_image_url || 'https://via.placeholder.com/300x200'}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-3">
                      <h4 className="text-white font-bold text-sm truncate">{campaign.title}</h4>
                      <p className="text-gray-300 text-xs">{campaign.system}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Favorite Genres */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Favorite Genres</h3>
              <div className="flex flex-wrap gap-2">
                {selectedGenres.length > 0 ? (
                  selectedGenres.map(genre => (
                    <Badge
                      key={genre}
                      className={`bg-gradient-to-r ${genreGradients[genre]} text-white border-0`}
                    >
                      {genre}
                    </Badge>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No tags selected</p>
                )}
              </div>
            </div>

            {/* Recent Characters */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>Recent Characters</h3>
              <div className="space-y-3">
                {characters.slice(0, 3).map(char => (
                  <motion.div
                    key={char.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-3 p-2 rounded-lg border-2 border-[#FF5722]/30 hover:border-[#37F2D1] hover:shadow-lg hover:shadow-[#37F2D1]/50 transition-all cursor-pointer bg-gradient-to-br from-[#0f1419] to-[#1a1f2e]"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0 relative">
                      {char.profile_avatar_url ? (
                        <img
                          src={char.profile_avatar_url}
                          alt={char.name}
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: 'center center',
                            transform: char.profile_position && char.profile_zoom
                              ? `translate(${char.profile_position.x * 0.12}px, ${char.profile_position.y * 0.12}px) scale(${char.profile_zoom})`
                              : 'scale(1)',
                            transformOrigin: 'center center'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-[#2A3441] flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-600">{char.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{char.name}</p>
                      <p className="text-gray-400 text-xs">{char.class} • Lvl {char.level}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* P.I.E. Chart */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` }}>P.I.E. Chart</h3>
              <p className="text-gray-300 text-xs mb-4 leading-relaxed">
                {(() => {
                  const avgDPS = characters.reduce((sum, c) => sum + (c.stats?.dps || 0), 0) / (characters.length || 1);
                  const avgHealing = characters.reduce((sum, c) => sum + (c.stats?.healing || 0), 0) / (characters.length || 1);
                  const avgAccuracy = characters.reduce((sum, c) => sum + (c.stats?.accuracy || 0), 0) / (characters.length || 1);
                  
                  if (avgDPS > avgHealing && avgDPS > 50) {
                    return "You're an aggressive damage dealer who leads the charge in combat!";
                  } else if (avgHealing > avgDPS && avgHealing > 50) {
                    return "You're a supportive healer who keeps your party alive!";
                  } else if (avgAccuracy > 70) {
                    return "You're a precise strategist who rarely misses their mark!";
                  } else {
                    return "You're a balanced player who adapts to any situation!";
                  }
                })()}
              </p>
              <div className="bg-gradient-to-br from-[#1a1f2e] to-[#2A3441] rounded-xl p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={[
                    { stat: 'DPS', value: characters.reduce((sum, c) => sum + (c.stats?.dps || 0), 0) / (characters.length || 1) },
                    { stat: 'Healing', value: characters.reduce((sum, c) => sum + (c.stats?.healing || 0), 0) / (characters.length || 1) },
                    { stat: 'Nat 20s', value: characters.reduce((sum, c) => sum + (c.stats?.nat_20s || 0), 0) / (characters.length || 1) },
                    { stat: 'Nat 1s', value: characters.reduce((sum, c) => sum + (c.stats?.nat_1s || 0), 0) / (characters.length || 1) },
                    { stat: 'Accuracy', value: characters.reduce((sum, c) => sum + (c.stats?.accuracy || 0), 0) / (characters.length || 1) },
                    { stat: 'Defense', value: characters.reduce((sum, c) => sum + (c.stats?.defense || 0), 0) / (characters.length || 1) }
                  ]}>
                    <PolarGrid stroke="#94a3b8" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar
                      name="Stats"
                      dataKey="value"
                      stroke="#37F2D1"
                      fill="#37F2D1"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfileDialog 
        open={editProfileOpen} 
        onClose={() => setEditProfileOpen(false)} 
        user={user}
      />
    </div>
  );
}