import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Check, X, MessageSquare, Ban, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StatusDot from "@/components/presence/StatusDot";
import { trackEvent } from "@/utils/analytics";
import { RowSkeleton } from "@/components/ui/Skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Search user_profiles directly via Supabase. Replaces the dead
 * `searchUsers` Edge Function that used to throw CORS on every
 * keystroke. Returns an array of profile objects identical to what
 * the old function returned.
 */
async function searchUsers(searchQuery, excludeUserIds = []) {
  if (!searchQuery || !searchQuery.trim()) return [];
  const term = searchQuery.trim();
  let query = supabase
    .from('user_profiles')
    .select('*')
    .or(`username.ilike.%${term}%,email.ilike.%${term}%`)
    .limit(20);
  if (excludeUserIds.length > 0) {
    query = query.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
  }
  const { data, error } = await query;
  if (error) {
    console.error('searchUsers query failed:', error);
    return [];
  }
  return data || [];
}

export default function Friends() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMinorWarning, setShowMinorWarning] = useState(false);
  const [pendingFriendRequest, setPendingFriendRequest] = useState(null);
  const [showBlockWarning, setShowBlockWarning] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  const [showMinorAcceptWarning, setShowMinorAcceptWarning] = useState(false);
  const [pendingAcceptRequest, setPendingAcceptRequest] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [previousRequestCount, setPreviousRequestCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // NOTE: the old `syncUserProfiles` Edge Function call has been
  // removed. Profile syncing is handled by AuthContext.jsx on login.



  const { data: allFriendships = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['allFriendships'],
    queryFn: () => base44.entities.Friend.list(),
    refetchInterval: 5000
  });

  const friendships = React.useMemo(() => {
    if (!user || !allFriendships) return [];
    return allFriendships.filter(f => 
      f.user_id === user.id || f.friend_id === user.id
    );
  }, [allFriendships, user]);


  const handleAddFriend = (friendData) => {
    const currentUserAge = user?.age;
    const targetUserAge = friendData.age;

    // Check if current user is 18+ and target is under 18
    if (currentUserAge >= 18 && targetUserAge < 18) {
      setPendingFriendRequest(friendData);
      setShowMinorWarning(true);
    } else {
      sendRequestMutation.mutate(friendData);
    }
  };

  const sendRequestMutation = useMutation({
    mutationFn: async (friendData) => {
      await base44.entities.Friend.create({
        user_id: user.id,
        friend_id: friendData.friendId,
        user_username: user.username || user.email?.split('@')[0],
        user_avatar: user.avatar_url,
        friend_username: friendData.friendUsername,
        friend_avatar: friendData.friendAvatar,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFriendships'] });
      toast.success('Friend request sent');
      setShowMinorWarning(false);
      setPendingFriendRequest(null);
    }
  });

  const handleAcceptRequest = (friendshipData) => {
    const currentUserAge = user?.age;
    const requesterAge = friendshipData.age;

    // Check if current user is under 18 and requester is 18+
    if (currentUserAge < 18 && requesterAge >= 18) {
      setPendingAcceptRequest(friendshipData);
      setShowMinorAcceptWarning(true);
    } else {
      acceptRequestMutation.mutate(friendshipData.friendshipId);
    }
  };

  const acceptRequestMutation = useMutation({
    mutationFn: async (friendshipId) => {
      await base44.entities.Friend.update(friendshipId, { 
        status: 'accepted',
        friend_username: user.username || user.email?.split('@')[0],
        friend_avatar: user.avatar_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFriendships'] });
      trackEvent(user?.id, 'friend_added');
      toast.success('Friend request accepted');
      setShowMinorAcceptWarning(false);
      setPendingAcceptRequest(null);
    }
  });

  const declineRequestMutation = useMutation({
    mutationFn: async (friendshipId) => {
      await base44.entities.Friend.delete(friendshipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFriendships'] });
      toast.success('Request declined');
    }
  });

  const blockUserMutation = useMutation({
    mutationFn: async (friendData) => {
      // Delete existing friendships
      const existingFriendship = friendships.find(f => 
        (f.user_id === user.id && f.friend_id === friendData.friendId) ||
        (f.user_id === friendData.friendId && f.friend_id === user.id)
      );

      if (existingFriendship) {
        await base44.entities.Friend.delete(existingFriendship.id);
      }

      // Create block relationship
      await base44.entities.Friend.create({
        user_id: user.id,
        friend_id: friendData.friendId,
        user_username: user.username || user.email?.split('@')[0],
        user_avatar: user.avatar_url,
        friend_username: friendData.friendUsername,
        friend_avatar: friendData.friendAvatar,
        status: 'blocked'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFriendships'] });
      toast.success('User blocked');
      setShowBlockWarning(false);
      setUserToBlock(null);
    }
  });

  const handleBlockUser = (friendData) => {
    setUserToBlock(friendData);
    setShowBlockWarning(true);
  };

  const handleDeleteFriend = (friendData) => {
    setUserToDelete(friendData);
    setShowDeleteWarning(true);
  };

  const deleteFriendMutation = useMutation({
    mutationFn: async (friendshipId) => {
      await base44.entities.Friend.delete(friendshipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFriendships'] });
      toast.success('Friend removed');
      setShowDeleteWarning(false);
      setUserToDelete(null);
    }
  });

  const createDMConversation = useMutation({
    mutationFn: async (friendData) => {
      const conversations = await base44.entities.ChatConversation.list();
      const existingConvo = conversations.find(c => 
        c.type === 'dm' && 
        c.participant_ids?.includes(user.id) && 
        c.participant_ids?.includes(friendData.friendId)
      );

      if (existingConvo) {
        return existingConvo;
      }

      return await base44.entities.ChatConversation.create({
        type: 'dm',
        participant_ids: [user.id, friendData.friendId],
        last_message: '',
        last_message_at: new Date().toISOString()
      });
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
      // Dispatch a custom event so Layout.jsx's chat panel opens
      // with this specific conversation pre-selected.
      window.dispatchEvent(
        new CustomEvent('open-chat-conversation', {
          detail: { conversationId: conversation.id },
        }),
      );
    }
  });
  
  const acceptedFriends = React.useMemo(() => {
    const friendMap = new Map();
    
    friendships
      .filter(f => f.status === 'accepted')
      .forEach(f => {
        const isSender = f.user_id === user?.id;
        const friendId = isSender ? f.friend_id : f.user_id;
        
        if (!friendMap.has(friendId)) {
          friendMap.set(friendId, {
            id: friendId,
            friendId: friendId,
            username: isSender ? f.friend_username : f.user_username,
            avatar_url: isSender ? f.friend_avatar : f.user_avatar,
            email: isSender ? f.friend_username : f.user_username,
            friendshipId: f.id
          });
        }
      });
    
    return Array.from(friendMap.values());
  }, [friendships, user?.id]);

  const pendingRequests = React.useMemo(() => {
    const requestMap = new Map();
    
    friendships
      .filter(f => f.friend_id === user?.id && f.status === 'pending')
      .forEach(f => {
        if (!requestMap.has(f.user_id)) {
          requestMap.set(f.user_id, {
            id: f.user_id,
            friendId: f.user_id,
            username: f.user_username,
            avatar_url: f.user_avatar,
            email: f.user_username,
            friendshipId: f.id,
            senderId: f.user_id,
            age: 18
          });
        }
      });
    
    return Array.from(requestMap.values());
  }, [friendships, user?.id]);


  // Play notification sound when new friend request arrives
  useEffect(() => {
    if (isInitialLoad) {
      setPreviousRequestCount(pendingRequests.length);
      setIsInitialLoad(false);
    } else if (pendingRequests.length > previousRequestCount) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
      audio.play().catch(() => {});
      setPreviousRequestCount(pendingRequests.length);
    } else if (pendingRequests.length < previousRequestCount) {
      setPreviousRequestCount(pendingRequests.length);
    }
  }, [pendingRequests.length, previousRequestCount, isInitialLoad]);

  const sentRequests = React.useMemo(() => {
    const requestMap = new Map();
    
    friendships
      .filter(f => f.user_id === user?.id && f.status === 'pending')
      .forEach(f => {
        if (!requestMap.has(f.friend_id)) {
          requestMap.set(f.friend_id, {
            id: f.friend_id,
            friendId: f.friend_id,
            username: f.friend_username,
            avatar_url: f.friend_avatar,
            email: f.friend_username,
            friendshipId: f.id,
            recipientId: f.friend_id
          });
        }
      });
    
    return Array.from(requestMap.values());
  }, [friendships, user?.id]);

  const blockedUsers = React.useMemo(() => {
    const blockedMap = new Map();
    
    friendships
      .filter(f => f.user_id === user?.id && f.status === 'blocked')
      .forEach(f => {
        if (!blockedMap.has(f.friend_id)) {
          blockedMap.set(f.friend_id, {
            id: f.friend_id,
            friendId: f.friend_id,
            username: f.friend_username,
            avatar_url: f.friend_avatar,
            email: f.friend_username,
            friendshipId: f.id
          });
        }
      });
    
    return Array.from(blockedMap.values());
  }, [friendships, user?.id]);

  const allFriendUserIds = friendships.map(f => 
    f.user_id === user?.id ? f.friend_id : f.user_id
  );

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['searchUsers', searchQuery, allFriendUserIds],
    queryFn: () => searchUsers(searchQuery, allFriendUserIds),
    enabled: !!user && searchQuery.length > 0,
    initialData: []
  });

  const FriendCard = ({ friend, actions }) => (
    <div className="bg-gradient-to-br from-[#1a1f2e] to-[#2A3441] rounded-2xl p-4 flex items-center gap-4 border border-[#FF5722]/20 hover:border-[#37F2D1]/50 transition-all">
      <Link to={createPageUrl("UserProfile") + `?id=${friend.user_id || friend.id}`} className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FF5722]/40 hover:border-[#37F2D1] hover:scale-105 transition-all">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt={friend.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#FF5722] to-[#37F2D1] flex items-center justify-center text-white font-bold text-2xl">
              {(friend.username || friend.email?.split('@')[0] || 'U')[0]}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0">
          <StatusDot profile={friend} size="md" border="#2A3441" />
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={createPageUrl("UserProfile") + `?id=${friend.user_id || friend.id}`}>
          <h3 className="font-bold text-white hover:text-[#37F2D1] transition-colors text-lg truncate">{friend.username || 'User'}</h3>
        </Link>
        {friend.tagline && <p className="text-xs text-gray-500 italic truncate mt-1">{friend.tagline}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {actions}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050816] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#FF5722] to-[#37F2D1] bg-clip-text text-transparent">Friends</h1>
          <p className="text-slate-400">Connect with other adventurers</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-gradient-to-r from-[#2A3441] to-[#1a1f2e] border border-[#FF5722]/20 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5722] data-[state=active]:to-[#37F2D1] data-[state=active]:text-white">
              All Friends ({acceptedFriends.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5722] data-[state=active]:to-[#37F2D1] data-[state=active]:text-white relative">
              Requests ({pendingRequests.length})
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5722] data-[state=active]:to-[#37F2D1] data-[state=active]:text-white">
              Add Friends
            </TabsTrigger>
            <TabsTrigger value="blocked" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5722] data-[state=active]:to-[#37F2D1] data-[state=active]:text-white">
              Blocked
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {friendsLoading && acceptedFriends.length === 0 && (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
                  </>
                )}
                {acceptedFriends.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    actions={
                      <>
                        <Button 
                          size="icon" 
                          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                          onClick={() => createDMConversation.mutate(friend)}
                          disabled={createDMConversation.isPending}
                          title="Message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => handleDeleteFriend(friend.friendshipId)}
                          title="Remove Friend"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/20"
                          onClick={() => handleBlockUser(friend)}
                          title="Block User"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </>
                    }
                  />
                ))}
                {!friendsLoading && acceptedFriends.length === 0 && (
                  <p className="text-center text-gray-500 py-12">No friends yet. Start adding friends!</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending">
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {pendingRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Incoming Requests</h3>
                    <div className="space-y-3">
                      {pendingRequests.map(friend => (
                        <FriendCard
                          key={friend.id}
                          friend={friend}
                          actions={
                            <>
                              <Button 
                                size="icon" 
                                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                                onClick={() => handleAcceptRequest(friend)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-red-400"
                                onClick={() => declineRequestMutation.mutate(friend.friendshipId)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Sent Requests</h3>
                    <div className="space-y-3">
                      {sentRequests.map(friend => (
                        <FriendCard
                          key={friend.id}
                          friend={friend}
                          actions={
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => declineRequestMutation.mutate(friend.friendshipId)}
                            >
                              Cancel Request
                            </Button>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {pendingRequests.length === 0 && sentRequests.length === 0 && (
                  <p className="text-center text-gray-500 py-12">No pending requests</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 text-white bg-[#2A3441] border-[#FF5722]/30 focus:border-[#37F2D1] h-12 text-base"
                  />
                </div>
              </div>

              <ScrollArea className="h-[540px]">
                <div className="space-y-3">
                  {isSearching ? (
                    <p className="text-center text-gray-500 py-12">Searching...</p>
                  ) : searchQuery.length > 0 && searchResults.length === 0 ? (
                    <p className="text-center text-gray-500 py-12">No users found</p>
                  ) : searchQuery.length > 0 ? (
                    searchResults.map(friend => (
                      <FriendCard
                        key={friend.id}
                        friend={friend}
                        actions={
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6"
                            onClick={() => handleAddFriend({
                              friendId: friend.user_id,
                              friendUsername: friend.username || friend.email?.split('@')[0],
                              friendAvatar: friend.avatar_url,
                              age: friend.age
                            })}
                            disabled={sendRequestMutation.isPending}
                          >
                            <UserPlus className="w-4 h-4" />
                            Add Friend
                          </Button>
                        }
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-12">Search for users to add as friends</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="blocked">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {blockedUsers.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    actions={
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => declineRequestMutation.mutate(friend.friendshipId)}
                        disabled={declineRequestMutation.isPending}
                      >
                        Unblock
                      </Button>
                    }
                  />
                ))}
                {blockedUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-12">No blocked users</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Minor Warning Dialog */}
      <Dialog open={showMinorWarning} onOpenChange={setShowMinorWarning}>
        <DialogContent className="bg-[#1E2430] border-2 border-red-500 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-400">
              Are you sure you want to do that?
            </DialogTitle>
            <DialogDescription className="text-gray-300 space-y-4 text-base leading-relaxed pt-4">
              <p>
                You're an adult. The person you're trying to add is a minor — someone whose judgment and boundaries are still developing. That comes with responsibility on your end.
              </p>
              <p>
                If you don't personally know this underage user in real life, <span className="font-bold text-white">do not continue</span>. Adults initiating contact with minors is a serious safety concern, and Guildstew enforces this aggressively. We protect young users first, always.
              </p>
              <p>
                If you choose to move forward, the minor will receive the request and decide what to do — but understand this clearly:
              </p>
              <p className="font-bold text-red-400">
                Your choices matter. Your actions have consequences. Don't screw this up.
              </p>
              <p className="font-semibold">
                Be a responsible adult. Keep our community safe.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => {
                setShowMinorWarning(false);
                setPendingFriendRequest(null);
              }}
              className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-semibold"
            >
              Nevermind
            </Button>
            <Button
              onClick={() => {
                if (pendingFriendRequest) {
                  sendRequestMutation.mutate(pendingFriendRequest);
                }
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Send Friend Request Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Warning Dialog */}
      <Dialog open={showBlockWarning} onOpenChange={setShowBlockWarning}>
        <DialogContent className="bg-[#1E2430] border-2 border-red-500 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">
              Are you sure you want to block this person?
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
                This action can be reversed from the Blocked tab.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setShowBlockWarning(false);
                setUserToBlock(null);
              }}
              className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (userToBlock) {
                  blockUserMutation.mutate(userToBlock);
                }
              }}
              disabled={blockUserMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {blockUserMutation.isPending ? 'Blocking...' : 'Block User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Minor Accept Warning Dialog */}
      <Dialog open={showMinorAcceptWarning} onOpenChange={setShowMinorAcceptWarning}>
        <DialogContent className="bg-[#1E2430] border-2 border-[#37F2D1] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#37F2D1]">
              Heads up.
            </DialogTitle>
            <DialogDescription className="text-gray-300 space-y-4 text-base leading-relaxed pt-4">
              <p>
                The person sending you this request is <span className="font-bold text-white">over 18</span>.
              </p>
              <p>
                You never have to accept a request from an adult — even if you know them. If you don't personally know this person in real life, <span className="font-bold text-white">do not accept.</span> Your comfort and safety always come first.
              </p>
              <p className="font-semibold text-white">
                And listen carefully:
              </p>
              <p className="font-bold text-[#37F2D1]">
                It is NOT your job to protect yourself from adults online. That's our job.
              </p>
              <p>
                If an adult ever makes you feel uncomfortable, pressured, weird, or unsafe in any way:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Tell a trusted adult,</li>
                <li>Contact <a href="mailto:support@aetherianstudios.com" className="text-[#37F2D1] hover:underline font-semibold">support@aetherianstudios.com</a>,</li>
                <li>Or open a support ticket through the app.</li>
              </ul>
              <p>
                The Guildstew staff and developers are <span className="font-bold text-white">always on your side</span>, and we take reports involving minors incredibly seriously. If something is wrong, we will handle it — firmly and privately.
              </p>
              <p className="font-bold text-[#37F2D1] text-lg">
                You're not alone. You're protected here.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => {
                if (pendingAcceptRequest) {
                  blockUserMutation.mutate({
                    friendId: pendingAcceptRequest.friendId,
                    friendUsername: pendingAcceptRequest.username,
                    friendAvatar: pendingAcceptRequest.avatar_url
                  });
                  setShowMinorAcceptWarning(false);
                  setPendingAcceptRequest(null);
                }
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              I don't know this person
            </Button>
            <Button
              onClick={() => {
                if (pendingAcceptRequest) {
                  acceptRequestMutation.mutate(pendingAcceptRequest.friendshipId);
                }
              }}
              disabled={acceptRequestMutation.isPending}
              className="flex-1 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-semibold"
            >
              {acceptRequestMutation.isPending ? 'Accepting...' : 'Accept Friend Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Friend Warning Dialog */}
      <Dialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <DialogContent className="bg-[#1E2430] border-2 border-[#FF5722] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#FF5722]">
              Remove Friend?
            </DialogTitle>
            <DialogDescription className="text-gray-300 space-y-3 text-sm leading-relaxed pt-4">
              <p>
                Are you sure you want to remove this person from your friends list?
              </p>
              <p className="text-white font-semibold">
                You can always add them back later.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setShowDeleteWarning(false);
                setUserToDelete(null);
              }}
              className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (userToDelete) {
                  deleteFriendMutation.mutate(userToDelete);
                }
              }}
              disabled={deleteFriendMutation.isPending}
              className="flex-1 bg-gradient-to-r from-[#FF5722] to-[#37F2D1] hover:from-[#FF6B3D] hover:to-[#2dd9bd] text-white"
            >
              {deleteFriendMutation.isPending ? 'Removing...' : 'Remove Friend'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}