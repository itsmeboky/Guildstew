import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Upload, X, Globe, Cake, User as UserIcon, Ban, UserPlus, Trophy, Flag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Link } from "react-router-dom";
import PostComments from "@/components/profile/PostComments";
import { uploadFile } from "@/utils/uploadFile";
import StatusDot from "@/components/presence/StatusDot";
import { resolveStatus, statusMeta } from "@/lib/PresenceContext";
import ReportUserDialog from "@/components/support/ReportUserDialog";
import { CardSkeleton } from "@/components/ui/Skeleton";
import SocialHandlesDisplay from "@/components/profile/SocialHandlesDisplay";

export default function UserProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  const [newPost, setNewPost] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [showBlockWarning, setShowBlockWarning] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const genreGradients = {
    "High Fantasy": "from-purple-500 to-pink-500",
    "Horror": "from-red-600 to-gray-900",
    "Modern Fantasy": "from-blue-400 to-purple-500",
    "Sci-Fi": "from-cyan-400 to-blue-600",
    "Cyberpunk": "from-pink-500 to-purple-600",
    "Post-Apocalyptic": "from-orange-600 to-red-700",
    "Steampunk": "from-amber-600 to-yellow-700",
    "Urban Fantasy": "from-indigo-500 to-purple-600",
    "Dark Fantasy": "from-gray-700 to-purple-900",
    "Historical": "from-yellow-600 to-amber-700"
  };

  const queryClient = useQueryClient();

  const { data: allUserProfiles } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 60000,
    initialData: []
  });

  const userProfile = allUserProfiles.find(p => p.user_id === userId);
  const user = userProfile ? {
    id: userProfile.user_id,
    username: userProfile.username,
    email: userProfile.email,
    avatar_url: userProfile.avatar_url,
    age: userProfile.age,
    tagline: userProfile.tagline,
    country: userProfile.country,
    pronouns: userProfile.pronouns,
    bio: userProfile.bio,
    social_handles: userProfile.social_handles,
    favorite_genres: userProfile.favorite_genres,
    profile_color_1: userProfile.profile_color_1 || "#FF5722",
    profile_color_2: userProfile.profile_color_2 || "#37F2D1",
    banner_url: userProfile.banner_url,
    role: userProfile.role
  } : null;

  const { data: characters } = useQuery({
    queryKey: ['userCharacters', userId],
    queryFn: () => base44.entities.Character.filter({ created_by: user?.email }, '-last_played', 6),
    enabled: !!user,
    initialData: []
  });

  const { data: campaigns } = useQuery({
    queryKey: ['userCampaigns', userId],
    queryFn: async () => {
      const allCampaigns = await base44.entities.Campaign.list('-updated_date');
      return allCampaigns.filter(c => 
        c.game_master_id === userId || c.player_ids?.includes(userId)
      ).slice(0, 9);
    },
    enabled: !!userId,
    initialData: []
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['userPosts', userId],
    queryFn: () => base44.entities.Post.filter({ profile_user_id: userId }, '-created_date'),
    enabled: !!userId,
    initialData: []
  });

  const { data: friendships } = useQuery({
    queryKey: ['userFriends', userId],
    queryFn: async () => {
      const allFriendships = await base44.entities.Friend.list();
      return allFriendships.filter(f => 
        (f.user_id === userId || f.friend_id === userId) && f.status === 'accepted'
      );
    },
    enabled: !!userId,
    initialData: []
  });



  const friends = React.useMemo(() => {
    if (!friendships || !allUserProfiles || !userId) return [];
    
    const friendIds = friendships.map(f => 
      f.user_id === userId ? f.friend_id : f.user_id
    );
    
    const friendProfiles = allUserProfiles.filter(p => friendIds.includes(p.user_id));
    
    // Map to format expected by display
    const friendUsers = friendProfiles.map(p => ({
      id: p.user_id,
      username: p.username,
      email: p.email,
      avatar_url: p.avatar_url
    }));
    
    // Shuffle and take max 9
    const shuffled = [...friendUsers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 9);
  }, [friendships, allUserProfiles, userId]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: allFriendships } = useQuery({
    queryKey: ['allFriendships'],
    queryFn: () => base44.entities.Friend.list(),
    initialData: []
  });

  const isBlocked = React.useMemo(() => {
    if (!allFriendships || !currentUser) return false;
    return allFriendships.some(f => 
      f.user_id === userId && f.friend_id === currentUser.id && f.status === 'blocked'
    );
  }, [allFriendships, currentUser, userId]);

  const isFriend = React.useMemo(() => {
    if (!friendships || !currentUser) return false;
    return friendships.some(f => 
      (f.user_id === currentUser.id || f.friend_id === currentUser.id) && f.status === 'accepted'
    );
  }, [friendships, currentUser]);

  const hasPendingRequest = React.useMemo(() => {
    if (!allFriendships || !currentUser) return false;
    return allFriendships.some(f => 
      f.user_id === currentUser.id && f.friend_id === userId && f.status === 'pending'
    );
  }, [allFriendships, currentUser, userId]);

  const sendFriendRequestMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Friend.create({
        user_id: currentUser.id,
        friend_id: userId,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFriendships'] });
      toast.success('Friend request sent');
    }
  });

  const blockUserMutation = useMutation({
    mutationFn: async () => {
      const existingFriendship = allFriendships.find(f => 
        (f.user_id === currentUser.id && f.friend_id === userId) ||
        (f.user_id === userId && f.friend_id === currentUser.id)
      );

      if (existingFriendship) {
        await base44.entities.Friend.delete(existingFriendship.id);
      }

      await base44.entities.Friend.create({
        user_id: currentUser.id,
        friend_id: userId,
        status: 'blocked'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFriendships'] });
      toast.success('User blocked');
      setShowBlockWarning(false);
    }
  });

  const createDMConversation = useMutation({
    mutationFn: async () => {
      const conversations = await base44.entities.ChatConversation.list();
      const existingConvo = conversations.find(c => 
        c.type === 'dm' && 
        c.participant_ids?.includes(currentUser.id) && 
        c.participant_ids?.includes(userId)
      );

      if (existingConvo) {
        return existingConvo;
      }

      return await base44.entities.ChatConversation.create({
        type: 'dm',
        participant_ids: [currentUser.id, userId],
        last_message: '',
        last_message_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Chat opened! Click the chat button in bottom right.');
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      let imageUrl = null;
      if (postImage) {
        const { file_url } = await uploadFile(postImage, 'user-assets', `users/${currentUser?.id || 'anon'}/posts`, { userId: currentUser?.id, uploadType: 'general' });
        imageUrl = file_url;
      }

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
          linkPreview = { url: links[0], title: links[0], description: "", image: "" };
        }
      }

      return base44.entities.Post.create({ 
        profile_user_id: userId,
        content: data.content, 
        image_url: imageUrl,
        link_preview: linkPreview
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
      setNewPost("");
      setPostImage(null);
    }
  });

  // Visitors can still like + comment on another user's posts but
  // can't edit or delete them (those buttons aren't rendered here).
  const likePostMutation = useMutation({
    mutationFn: ({ postId, likes }) => base44.entities.Post.update(postId, { likes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
    }
  });
  const handleLikePost = (post) => {
    if (!currentUser?.id) return;
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const hasLiked = likes.includes(currentUser.id);
    const nextLikes = hasLiked
      ? likes.filter((id) => id !== currentUser.id)
      : [...likes, currentUser.id];
    likePostMutation.mutate({ postId: post.id, likes: nextLikes });
  };
  const addCommentMutation = useMutation({
    mutationFn: async ({ post, content }) => {
      const comments = Array.isArray(post.comments) ? post.comments : [];
      const next = [...comments, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: currentUser?.id,
        username: currentUser?.username || currentUser?.full_name || 'Unknown',
        avatar_url: currentUser?.avatar_url || null,
        content,
        created_at: new Date().toISOString(),
      }];
      return base44.entities.Post.update(post.id, { comments: next });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
    }
  });
  const deleteCommentMutation = useMutation({
    mutationFn: async ({ post, commentId }) => {
      const comments = Array.isArray(post.comments) ? post.comments : [];
      const next = comments.filter((c) => c.id !== commentId);
      return base44.entities.Post.update(post.id, { comments: next });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-400 mb-2">Profile Not Available</p>
          <p className="text-gray-500">This user's profile is not accessible.</p>
        </div>
      </div>
    );
  }

  const color1 = user?.profile_color_1 || "#FF5722";
  const color2 = user?.profile_color_2 || "#37F2D1";

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
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent" style={{
                      backgroundImage: `linear-gradient(to right, ${color1}, ${color2})`,
                    }}>@{user?.username || user?.email?.split('@')[0]}</h1>
                    {user && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                        <StatusDot profile={user} size="sm" border="#1a1f2e" />
                        <span>{statusMeta(resolveStatus(user)).label}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">● Last online this week</p>
                </div>
                {currentUser && currentUser.id !== userId && !isBlocked && (
                  <div className="flex gap-3">
                    {!isFriend && !hasPendingRequest && (
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-[#37F2D1] to-[#FF5722] hover:from-[#2dd9bd] hover:to-[#FF6B3D] text-white shadow-lg shadow-[#FF5722]/50 border-0 gap-2"
                        onClick={() => sendFriendRequestMutation.mutate()}
                        disabled={sendFriendRequestMutation.isPending}
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </Button>
                    )}
                    {hasPendingRequest && (
                      <Button size="sm" disabled className="bg-gray-600 text-white cursor-not-allowed">
                        Request Sent
                      </Button>
                    )}
                    {isFriend && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-2 border-[#37F2D1]/50 text-white hover:bg-[#37F2D1]/20 bg-transparent shadow-lg gap-2"
                        onClick={() => createDMConversation.mutate()}
                        disabled={createDMConversation.isPending}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-2 border-amber-500/50 text-amber-300 hover:bg-amber-500/20 bg-transparent shadow-lg gap-2"
                      onClick={() => setReportOpen(true)}
                    >
                      <Flag className="w-4 h-4" />
                      Report
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 bg-transparent shadow-lg gap-2"
                      onClick={() => setShowBlockWarning(true)}
                    >
                      <Ban className="w-4 h-4" />
                      Block
                    </Button>
                  </div>
                )}
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
                  <UserIcon className="w-4 h-4 text-[#37F2D1]" />
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
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] rounded-xl border border-[#FF5722]/20">
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
              <h3 className="text-sm font-bold uppercase mb-4 bg-gradient-to-r from-[#FF5722] to-[#37F2D1] bg-clip-text text-transparent">Biography</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {user?.bio || "No biography yet."}
              </p>
            </div>

            {/* Social Handles */}
            <div className="bg-gradient-to-br from-[#1a1f2e]/90 to-[#2A3441]/90 backdrop-blur-md rounded-2xl p-6" style={{ boxShadow: `0 0 0 1px ${color1}80, 0 0 0 2px ${color2}80` }}>
              <h3 className="text-sm font-bold uppercase mb-4 bg-gradient-to-r from-[#FF5722] to-[#37F2D1] bg-clip-text text-transparent">Social Handles</h3>
              {Object.values(user?.social_handles || {}).some(Boolean) ? (
                <SocialHandlesDisplay handles={user.social_handles} />
              ) : (
                <p className="text-gray-500 text-sm">No social handles yet.</p>
              )}
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
              
              {/* Create Post - Show for friends */}
              {isFriend && (
                <div className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] rounded-xl p-4 mb-6 border border-[#FF5722]/20">
                  <Textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder={`Post on ${user?.username || user?.email?.split('@')[0]}'s profile...`}
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
                      id="post-image-friend"
                    />
                    <label htmlFor="post-image-friend" className="cursor-pointer">
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
              )}

              {/* Posts */}
              <div className="space-y-4">
                {postsLoading && posts.length === 0 && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
                  </>
                )}
                {posts.slice(0, 5).map(post => {
                  const authorProfile = allUserProfiles.find(p => p.email === post.created_by);
                  const hasLiked = (post.likes || []).includes(currentUser?.id);
                  const authorColor1 = authorProfile?.profile_color_1 || user?.profile_color_1 || "#FF5722";
                  const authorColor2 = authorProfile?.profile_color_2 || user?.profile_color_2 || "#37F2D1";

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] rounded-xl p-4 border border-[#FF5722]/20"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: `2px solid ${authorColor1}` }}>
                          {authorProfile?.avatar_url ? (
                            <img src={authorProfile.avatar_url} alt={authorProfile.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold" style={{ background: `linear-gradient(to right, ${authorColor1}, ${authorColor2})` }}>
                              {(authorProfile?.username)?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${authorColor1}, ${authorColor2})` }}>{authorProfile?.username}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(post.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-3">{post.content}</p>
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
                          type="button"
                          onClick={() => handleLikePost(post)}
                          disabled={!currentUser?.id || likePostMutation.isPending}
                          className={`flex items-center gap-1 transition-colors ${
                            hasLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{(post.likes || []).length}</span>
                        </button>
                      </div>
                      <PostComments
                        post={post}
                        currentUser={currentUser}
                        onAddComment={(content) => addCommentMutation.mutate({ post, content })}
                        onDeleteComment={(commentId) => deleteCommentMutation.mutate({ post, commentId })}
                        adding={addCommentMutation.isPending}
                      />
                    </motion.div>
                  );
                })}
                {posts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">No posts yet</p>
                  </div>
                )}
              </div>
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
                    {campaign.cover_image_url ? (
                      <img
                        src={campaign.cover_image_url}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1f2e] via-[#2A3441] to-[#050816]" />
                    )}
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
                {(user?.favorite_genres || []).map(genre => (
                  <Badge
                    key={genre}
                    className={`bg-gradient-to-r ${genreGradients[genre] || 'from-gray-600 to-gray-700'} text-white border-0`}
                  >
                    {genre}
                  </Badge>
                ))}
                {(!user?.favorite_genres || user.favorite_genres.length === 0) && (
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
                        <div className="w-full h-full relative">
                          <img
                            src={char.profile_avatar_url}
                            alt={char.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                              transform: char.profile_position && char.profile_zoom
                                ? `translate(${char.profile_position.x}px, ${char.profile_position.y}px) scale(${char.profile_zoom})`
                                : 'none',
                              transformOrigin: 'center center'
                            }}
                          />
                        </div>
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
                    return "An aggressive damage dealer who leads the charge in combat!";
                  } else if (avgHealing > avgDPS && avgHealing > 50) {
                    return "A supportive healer who keeps the party alive!";
                  } else if (avgAccuracy > 70) {
                    return "A precise strategist who rarely misses their mark!";
                  } else {
                    return "A balanced player who adapts to any situation!";
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

      {/* Block Warning Dialog */}
      <ReportUserDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reporterId={currentUser?.id}
        targetUser={user ? { id: userId, username: user.username } : null}
      />

      <Dialog open={showBlockWarning} onOpenChange={setShowBlockWarning}>
        <DialogContent className="bg-[#1E2430] border-2 border-red-500 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">
              Block this user?
            </DialogTitle>
            <DialogDescription className="text-gray-300 space-y-3 text-sm leading-relaxed pt-4">
              <p>
                Blocking this user will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Remove them from your friends list</li>
                <li>Prevent them from viewing your profile</li>
                <li>Prevent them from sending you friend requests</li>
              </ul>
              <p className="text-white font-semibold">
                This action can be reversed from the Friends page.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setShowBlockWarning(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => blockUserMutation.mutate()}
              disabled={blockUserMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {blockUserMutation.isPending ? 'Blocking...' : 'Block User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}