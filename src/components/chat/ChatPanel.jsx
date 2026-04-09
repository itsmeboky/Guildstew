import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, Send, Image } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import GiphyPicker from "@/components/chat/GiphyPicker";

export default function ChatPanel({ isOpen, onClose }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = React.useState(0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const allConvos = await base44.entities.ChatConversation.list('-updated_date');
      return allConvos.filter(c => c.participant_ids?.includes(user?.id));
    },
    enabled: !!user && isOpen,
    initialData: []
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: () => base44.entities.Message.filter({ conversation_id: selectedConversation.id }, 'created_date'),
    enabled: !!selectedConversation,
    initialData: []
  });

  React.useEffect(() => {
    if (messages.length > previousMessageCount && previousMessageCount > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_id !== user?.id) {
        const audio = new Audio('https://static.wixstatic.com/mp3/5cdfd8_78ee0fc6dc864bd0a71286dfe3b48f54.wav');
        audio.play().catch(() => {});
      }
    }
    setPreviousMessageCount(messages.length);
  }, [messages.length, previousMessageCount, user?.id]);

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: isOpen,
    initialData: []
  });

  const sendMessage = async (content = messageText) => {
    if (!content.trim() || !selectedConversation) return;
    
    await base44.entities.Message.create({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: content,
      read_by: [user.id]
    });

    setMessageText("");
  };

  const sendGif = async (gifUrl) => {
    await sendMessage(`[GIF]${gifUrl}`);
    setShowGiphyPicker(false);
  };

  const isGifMessage = (content) => {
    return content?.startsWith('[GIF]');
  };

  const getGifUrl = (content) => {
    return content?.replace('[GIF]', '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 bottom-0 h-3/4 w-96 bg-white shadow-2xl z-40 flex flex-col rounded-tl-2xl">
      {/* Header */}
      <div className="bg-[#FF5722] px-4 py-4 flex items-center justify-between rounded-tl-2xl">
        <h3 className="text-white font-bold text-lg">Chat</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {!selectedConversation ? (
        /* Conversation List */
        <div className="flex-1 flex flex-col">
          {/* Online Friends */}
          <div className="p-4 border-b border-gray-200">
            <ScrollArea className="w-full">
              <div className="flex gap-3">
                <button className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 flex-shrink-0">
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
                {allUsers.slice(0, 5).map((u) => (
                  <button
                    key={u.id}
                    className="relative flex-shrink-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                    {u.online_status === 'online' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#37F2D1] rounded-full border-2 border-white" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {conversations.map((conv) => {
                const otherUserId = conv.participant_ids?.find(id => id !== user?.id);
                const otherUser = allUsers.find(u => u.id === otherUserId);
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">
                        {conv.type === 'campaign_group' ? conv.name : otherUser?.username || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        /* Chat View */
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
              className="text-gray-900 hover:bg-gray-100"
            >
              ←
            </Button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
            <span className="font-medium text-gray-900">{selectedConversation.name || 'Chat'}</span>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => {
                const sender = allUsers.find(u => u.id === msg.sender_id);
                const isMe = msg.sender_id === user?.id;
                const isGif = isGifMessage(msg.content);

                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex-shrink-0" />
                    )}
                    <div className={`max-w-[70%] ${isGif ? '' : isMe ? 'bg-[#FF5722] text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl ${isGif ? 'p-0' : 'px-4 py-2'}`}>
                      {!isMe && !isGif && <p className="text-xs font-medium mb-1 text-gray-700">{sender?.username}</p>}
                      {isGif ? (
                        <img src={getGifUrl(msg.content)} alt="GIF" className="rounded-2xl max-w-full" />
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Giphy Picker */}
          {showGiphyPicker && (
            <div className="border-t border-gray-200">
              <GiphyPicker onSelectGif={sendGif} onClose={() => setShowGiphyPicker(false)} />
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGiphyPicker(!showGiphyPicker)}
                className="text-gray-600 hover:text-[#FF5722]"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 text-gray-900"
              />
              <Button onClick={() => sendMessage()} className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}