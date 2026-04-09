import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Dice6, Eye, EyeOff, ChevronDown } from "lucide-react";
import moment from "moment";

export default function CampaignLog({ campaignId, currentUser, currentUserProfile, campaign, characters, allUserProfiles }) {
  const [message, setMessage] = useState("");
  const [isWhisper, setIsWhisper] = useState(false);
  const [isGmOnly, setIsGmOnly] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: logEntries = [] } = useQuery({
    queryKey: ['campaignLog', campaignId],
    queryFn: () => base44.entities.CampaignLogEntry.filter({ campaign_id: campaignId }, 'created_date'),
    enabled: !!campaignId,
    refetchInterval: 3000
  });

  const isGM = campaign?.game_master_id === currentUser?.id || 
               campaign?.co_dm_ids?.includes(currentUser?.id);
  const isCoGM = campaign?.co_dm_ids?.includes(currentUser?.id);

  // Get user's character for this campaign
  const userCharacter = characters?.find(c => c.created_by === currentUser?.email);

  // Helper to get display info for a user
  const getDisplayInfo = (entry) => {
    const isEntryGM = entry.user_id === campaign?.game_master_id;
    const isEntryCoGM = campaign?.co_dm_ids?.includes(entry.user_id);
    
    // Look up the user's profile to get their username
    const userProfile = allUserProfiles?.find(p => p.user_id === entry.user_id);
    const entryCharacter = characters?.find(c => c.created_by === userProfile?.email || entry.character_id === c.id);
    
    let role = '';
    if (isEntryGM) role = 'GM';
    else if (isEntryCoGM) role = 'Co-GM';
    
    // Use username from profile, not full name
    const displayName = userProfile?.username || entry.user_name;
    const characterName = entry.character_name || entryCharacter?.name;
    const avatar = entryCharacter?.profile_avatar_url || userProfile?.avatar_url || entry.user_avatar;
    
    return { displayName, characterName, role, avatar };
  };

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignLogEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignLog', campaignId] });
      setMessage("");
    }
  });

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logEntries, autoScroll]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    createEntryMutation.mutate({
      campaign_id: campaignId,
      type: "chat",
      user_id: currentUser?.id,
      user_name: currentUserProfile?.username || currentUser?.full_name,
      user_avatar: currentUserProfile?.avatar_url,
      content: message,
      is_whisper: isWhisper,
      is_gm_only: isGmOnly
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter entries based on visibility
  const visibleEntries = logEntries.filter(entry => {
    if (entry.is_gm_only && !isGM) return false;
    if (entry.is_whisper && entry.user_id !== currentUser?.id && !isGM) {
      if (!entry.whisper_target_ids?.includes(currentUser?.id)) return false;
    }
    return true;
  });

  const formatTimestamp = (date) => {
    const m = moment(date);
    if (m.isSame(moment(), 'day')) {
      return m.format('h:mm A');
    }
    return m.format('MM/DD/YYYY h:mm A');
  };

  const renderEntry = (entry, displayInfo) => {
    switch (entry.type) {
      case 'dice_roll':
        return <DiceRollEntry entry={entry} formatTimestamp={formatTimestamp} displayInfo={displayInfo} />;
      case 'system':
        return <SystemEntry entry={entry} formatTimestamp={formatTimestamp} />;
      case 'combat':
        return <CombatEntry entry={entry} formatTimestamp={formatTimestamp} />;
      default:
        return <ChatEntry entry={entry} formatTimestamp={formatTimestamp} isGM={isGM} displayInfo={displayInfo} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Log entries */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 custom-scrollbar"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.target;
          setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
        }}
      >
        {visibleEntries.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-4">
            No log entries yet. Start the conversation!
          </div>
        ) : (
          visibleEntries.map((entry, index) => (
            <div key={entry.id} className={index % 2 === 0 ? 'bg-[#0a1628]/50 rounded px-2 py-1 -mx-2' : 'px-2 py-1 -mx-2'}>
              {renderEntry(entry, getDisplayInfo(entry))}
            </div>
          ))
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-16 right-4 bg-[#22c5f5] text-white rounded-full p-2 shadow-lg hover:bg-[#38bdf8] transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Input area */}
      <div className="pt-3 border-t border-[#111827] mt-2">
        <div className="flex items-center gap-2 mb-2">
          {isGM && (
            <>
              <button
                onClick={() => setIsWhisper(!isWhisper)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                  isWhisper ? 'bg-purple-500/30 text-purple-300' : 'bg-[#111827] text-slate-400 hover:text-slate-300'
                }`}
              >
                {isWhisper ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                Whisper
              </button>
              <button
                onClick={() => setIsGmOnly(!isGmOnly)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                  isGmOnly ? 'bg-amber-500/30 text-amber-300' : 'bg-[#111827] text-slate-400 hover:text-slate-300'
                }`}
              >
                GM Only
              </button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#22c5f5] transition-colors"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="w-8 h-8 rounded-lg bg-[#22c5f5] hover:bg-[#38bdf8] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatEntry({ entry, formatTimestamp, isGM, displayInfo }) {
  const { displayName, characterName, role, avatar } = displayInfo;
  
  // Format: Username / Character or Username / GM
  const nameDisplay = role 
    ? `${displayName} / ${role}` 
    : characterName 
      ? `${displayName} / ${characterName}` 
      : displayName;

  return (
    <div className={`space-y-[2px] ${entry.is_whisper ? 'opacity-70 border-l-2 border-purple-500 pl-2' : ''} ${entry.is_gm_only ? 'border-l-2 border-amber-500 pl-2' : ''}`}>
      <div className="flex justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          {avatar ? (
            <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-[#22c5f5]/30" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#1a1f2e] flex items-center justify-center text-[8px] text-slate-500">?</div>
          )}
          <span className="font-medium text-slate-300">
            {nameDisplay}
          </span>
          {entry.is_whisper && <span className="text-purple-400">(whisper)</span>}
          {entry.is_gm_only && <span className="text-amber-400">(GM only)</span>}
        </div>
        <span>{formatTimestamp(entry.created_date)}</span>
      </div>
      <p className="text-[11px] text-slate-200 pl-7 break-words whitespace-pre-wrap">{entry.content}</p>
    </div>
  );
}

function DiceRollEntry({ entry, formatTimestamp, displayInfo }) {
  const { dice_data } = entry;
  const isSuccess = dice_data?.success;
  const isCrit = dice_data?.roll_result === 20;
  const isFail = dice_data?.roll_result === 1;
  const { displayName, characterName, role, avatar } = displayInfo;
  
  const nameDisplay = role 
    ? `${displayName} / ${role}` 
    : characterName 
      ? `${displayName} / ${characterName}` 
      : displayName;

  return (
    <div className="space-y-[2px]">
      <div className="flex justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          {avatar ? (
            <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-[#22c5f5]/30" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#1a1f2e] flex items-center justify-center text-[8px] text-slate-500">?</div>
          )}
          <span className="font-medium text-slate-300">
            {nameDisplay}
          </span>
          <Dice6 className="w-3 h-3 text-[#22c5f5]" />
        </div>
        <span>{formatTimestamp(entry.created_date)}</span>
      </div>
      <div className={`text-[11px] px-2 py-1 rounded ${
        isCrit ? 'bg-green-500/20 text-green-300' :
        isFail ? 'bg-red-500/20 text-red-300' :
        isSuccess ? 'text-amber-300' : 'text-slate-200'
      }`}>
        <span className="font-semibold">
          Rolled {dice_data?.dice_type?.toUpperCase()}
          {dice_data?.modifier ? ` ${dice_data.modifier > 0 ? '+' : ''}${dice_data.modifier}` : ''}
          : {dice_data?.roll_result}
        </span>
        {dice_data?.modifier !== 0 && (
          <span> | Total: {dice_data?.total}</span>
        )}
        {dice_data?.target && (
          <span className={isSuccess ? ' text-green-400' : ' text-red-400'}>
            {' '}| vs DC {dice_data.target}: {isSuccess ? 'Success!' : 'Failed'}
          </span>
        )}
        {isCrit && <span className="ml-2 text-green-400 font-bold">CRITICAL!</span>}
        {isFail && <span className="ml-2 text-red-400 font-bold">NAT 1!</span>}
      </div>
      {dice_data?.roll_type && (
        <p className="text-[10px] text-slate-500">{dice_data.roll_type}</p>
      )}
    </div>
  );
}

function SystemEntry({ entry, formatTimestamp }) {
  return (
    <div className="text-center py-1">
      <span className="text-[10px] text-slate-500 bg-[#111827] px-3 py-1 rounded-full">
        {entry.content}
      </span>
    </div>
  );
}

function CombatEntry({ entry, formatTimestamp }) {
  return (
    <div className="space-y-[2px] border-l-2 border-red-500/50 pl-2">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span className="text-red-400 font-medium">⚔️ Combat</span>
        <span>{formatTimestamp(entry.created_date)}</span>
      </div>
      <p className="text-[11px] text-slate-200">{entry.content}</p>
    </div>
  );
}