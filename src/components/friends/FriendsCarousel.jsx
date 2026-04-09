import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FriendsCarousel({ friends }) {
  const statusColors = {
    online: 'bg-[#37F2D1]',
    streaming: 'bg-[#FF00FF]',
    offline: 'bg-gray-400'
  };

  return (
    <div className="bg-[#2A3441] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-gray-400 uppercase tracking-wider">Friends</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {friends.map((friend) => (
          <div key={friend.id} className="flex-shrink-0 relative cursor-pointer group">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 ring-2 ring-transparent group-hover:ring-[#37F2D1] transition-all">
              <img
                src={friend.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                alt={friend.username}
                className="w-full h-full object-cover"
              />
            </div>
            {friend.online_status && (
              <div className={`absolute bottom-0 right-0 w-4 h-4 ${statusColors[friend.online_status]} rounded-full border-2 border-[#2A3441]`} />
            )}
          </div>
        ))}
      </div>

      {friends.length === 0 && (
        <p className="text-gray-500 text-center py-8 text-sm">No friends yet</p>
      )}
    </div>
  );
}