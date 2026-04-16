import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ArrowLeft, Send, Volume2, VolumeX } from "lucide-react";

const CHAT_NOTIFICATION_SOUNDS = [
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/notification/chatnotif1.mp3",
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/notification/chatnotif2.mp3",
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/notification/chatnotif3.mp3",
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/notification/chatnotif4.mp3",
];

function playNotificationSound() {
  const muted = localStorage.getItem("gs-chat-muted") === "true";
  if (muted) return;
  const idx = Math.floor(Math.random() * CHAT_NOTIFICATION_SOUNDS.length);
  const audio = new Audio(CHAT_NOTIFICATION_SOUNDS[idx]);
  audio.volume = 0.4;
  audio.play().catch(() => {});
}

/**
 * Compact floating chat panel — docked bottom-right, 350×450,
 * conversation list + active chat in one toggling view. Text only,
 * 50 message cap, 3s poll. Modeled after League of Legends client
 * chat: small, always-available, overlays without navigating.
 */
export default function ChatPanel({
  isOpen,
  onClose,
  initialConversationId = null,
}) {
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [muted, setMuted] = useState(
    () => localStorage.getItem("gs-chat-muted") === "true",
  );
  const [filter, setFilter] = useState("all"); // all | dms | groups
  const lastSeenRef = useRef({}); // { [convId]: latestTimestamp }
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    initialData: null,
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["allUserProfiles"],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 60000,
  });

  // All conversations the current user is in. Poll at 5s when open,
  // 15s when closed (so the unread badge stays roughly up to date).
  const { data: conversations = [] } = useQuery({
    queryKey: ["chatConversations", user?.id],
    queryFn: async () => {
      const all = await base44.entities.ChatConversation.list("-last_message_at");
      return (all || []).filter(
        (c) => c.participant_ids?.includes(user?.id),
      );
    },
    enabled: !!user?.id,
    refetchInterval: isOpen ? 5000 : 15000,
  });

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );

  // Open a specific conversation when the parent hands one in.
  useEffect(() => {
    if (initialConversationId && isOpen) {
      setSelectedConversationId(initialConversationId);
    }
  }, [initialConversationId, isOpen]);

  // Messages for the active conversation. 50 message cap, 3s poll.
  const { data: messages = [] } = useQuery({
    queryKey: ["chatMessages", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const msgs = await base44.entities.Message.filter(
        { conversation_id: selectedConversationId },
        "created_date",
      );
      return (msgs || []).slice(-50);
    },
    enabled: !!selectedConversationId && isOpen,
    refetchInterval: 3000,
  });

  // Auto-scroll to bottom.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedConversationId]);

  // Notification sound on new message from someone else.
  const prevMessageCountRef = useRef({});
  useEffect(() => {
    if (!messages.length || !user?.id) return;
    const convId = selectedConversationId;
    const prev = prevMessageCountRef.current[convId] || 0;
    if (messages.length > prev && prev > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender_id !== user.id) {
        playNotificationSound();
      }
    }
    prevMessageCountRef.current[convId] = messages.length;
  }, [messages, selectedConversationId, user?.id]);

  // Mark conversation as "seen" for unread badge calculation.
  useEffect(() => {
    if (selectedConversationId && messages.length > 0) {
      const last = messages[messages.length - 1];
      lastSeenRef.current[selectedConversationId] =
        last.created_date || last.created_at || Date.now();
    }
  }, [selectedConversationId, messages]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("gs-chat-muted", String(next));
  };

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !selectedConversationId || !user) return;
    const text = messageText.trim();
    setMessageText("");
    try {
      await base44.entities.Message.create({
        conversation_id: selectedConversationId,
        sender_id: user.id,
        content: text,
        read_by: [user.id],
      });
      await base44.entities.ChatConversation.update(selectedConversationId, {
        last_message: text.slice(0, 80),
        last_message_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", selectedConversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["chatConversations", user.id],
      });
    } catch (err) {
      console.error("Chat send failed:", err);
    }
  }, [messageText, selectedConversationId, user, queryClient]);

  const profileOf = useCallback(
    (uid) => allProfiles.find((p) => p.user_id === uid),
    [allProfiles],
  );

  const convName = useCallback(
    (conv) => {
      if (conv.type === "group" || conv.type === "campaign_group") {
        return conv.name || "Group Chat";
      }
      const otherId = conv.participant_ids?.find((id) => id !== user?.id);
      const other = profileOf(otherId);
      return other?.username || "Direct Message";
    },
    [user?.id, profileOf],
  );

  // Unread count exposed via data attribute so the parent button can
  // read it without a shared context.
  const unreadCount = conversations.filter((c) => {
    if (!c.last_message_at) return false;
    const seen = lastSeenRef.current[c.id];
    if (!seen) return !!c.last_message;
    return new Date(c.last_message_at) > new Date(seen);
  }).length;

  const filteredConversations = conversations.filter((c) => {
    if (filter === "dms") return c.type === "dm" || c.type === "direct";
    if (filter === "groups")
      return c.type === "group" || c.type === "campaign_group";
    return true;
  });

  if (!isOpen) return null;

  const NAME_COLORS = [
    "#37F2D1", "#FF5722", "#a855f7", "#f59e0b",
    "#3b82f6", "#ec4899", "#22c55e",
  ];
  function nameColor(uid, isMe) {
    if (isMe) return "#FF5722";
    const hash = (uid || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return NAME_COLORS[hash % NAME_COLORS.length];
  }

  return (
    <div
      className="fixed bottom-20 right-6 w-[350px] h-[450px] bg-[#0b1220] border border-[#1e2636] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-[60] flex flex-col overflow-hidden"
      data-unread={unreadCount}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2636] bg-[#0f1729]">
        {selectedConversation ? (
          <>
            <button
              onClick={() => setSelectedConversationId(null)}
              className="text-slate-400 hover:text-white transition-colors mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="flex-1 text-sm font-bold text-white truncate">
              {convName(selectedConversation)}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm font-bold text-white">Messages</span>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMute}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {!selectedConversation ? (
        /* ---- CONVERSATION LIST ---- */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1e2636]">
            {[
              { id: "all", label: "All" },
              { id: "dms", label: "DMs" },
              { id: "groups", label: "Groups" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  filter === t.id
                    ? "bg-[#FF5722]/25 text-[#FF5722] border border-[#FF5722]/50"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="text-center text-slate-600 text-xs py-10">
                No conversations yet.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const name = convName(conv);
                const isGroup = conv.type === "group" || conv.type === "campaign_group";
                const otherId = !isGroup
                  ? conv.participant_ids?.find((id) => id !== user?.id)
                  : null;
                const otherProfile = otherId ? profileOf(otherId) : null;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-[#1e2636]/50"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF5722] to-[#37F2D1] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {otherProfile?.avatar_url ? (
                        <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">
                          {isGroup ? "G" : name[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{name}</span>
                        {isGroup && (
                          <span className="text-[8px] uppercase tracking-widest text-[#37F2D1] bg-[#37F2D1]/15 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                            Group
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {conv.last_message.slice(0, 40)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ---- ACTIVE CONVERSATION ---- */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
            {messages.length === 0 ? (
              <div className="text-center text-slate-600 text-xs py-10">
                No messages yet. Say hello!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const sender = profileOf(msg.sender_id);
                const senderName = sender?.username || "User";
                return (
                  <div key={msg.id} className="mb-2">
                    {!isMe && (
                      <div className="text-[10px] font-bold mb-0.5" style={{ color: nameColor(msg.sender_id, false) }}>
                        {senderName}
                      </div>
                    )}
                    <div
                      className={`text-xs leading-snug rounded-xl px-3 py-1.5 max-w-[85%] ${
                        isMe
                          ? "bg-[#FF5722] text-white ml-auto"
                          : "bg-[#1a1f2e] text-slate-200"
                      }`}
                      style={{
                        marginLeft: isMe ? "auto" : undefined,
                        textAlign: isMe ? "right" : "left",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 border-t border-[#1e2636]">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message…"
                className="flex-1 bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5722] transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!messageText.trim()}
                className="w-8 h-8 rounded-lg bg-[#FF5722] hover:bg-[#FF6B3D] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
