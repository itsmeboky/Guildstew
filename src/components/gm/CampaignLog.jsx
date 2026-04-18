import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Dice6, Eye, EyeOff, ChevronDown, Lock, MessageSquare, Swords, Filter } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { COMBAT_LOG_BORDER, COMBAT_LOG_GLYPH } from "@/utils/combatLog";

export default function CampaignLog({ campaignId, currentUser, currentUserProfile, campaign, characters, allUserProfiles }) {
  const [message, setMessage] = useState("");
  const [isWhisper, setIsWhisper] = useState(false);
  const [isGmOnly, setIsGmOnly] = useState(false);
  const [whisperTargetId, setWhisperTargetId] = useState(null);
  // Feed filter: 'all' (default), 'chat' (player/GM messages only),
  // or 'combat' (system + combat_log + dice_roll only).
  const [feedFilter, setFeedFilter] = useState("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Poll the campaign log every few seconds so the chat stream feels
  // live. The query runs from many panels, so any failure here used
  // to flood the console with a 400 every 3s — wrap the queryFn in a
  // try/catch and back the retries off so transient schema mismatches
  // (e.g. `created_date` vs `created_at`) stop spamming.
  const { data: logEntries = [] } = useQuery({
    queryKey: ['campaignLog', campaignId],
    queryFn: async () => {
      try {
        return await base44.entities.CampaignLogEntry.filter({ campaign_id: campaignId }, 'created_date');
      } catch (err) {
        // Fall back to the legacy column name if the new one isn't
        // there yet, then quietly return [] if both fail so the
        // polling loop doesn't keep crashing.
        try {
          return await base44.entities.CampaignLogEntry.filter({ campaign_id: campaignId }, 'created_at');
        } catch {
          console.error('CampaignLog: log fetch failed', err);
          return [];
        }
      }
    },
    enabled: !!campaignId,
    refetchInterval: 5000,
    retry: 2,
    retryDelay: 5000,
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
    },
    onError: (err) => {
      // Previously the failure was silent — the input stayed full and
      // nothing got posted. Surface the problem so the GM / player
      // knows to look at their connection or retry.
      console.error('CampaignLogEntry.create failed:', err);
      toast.error(err?.message || "Couldn't send — try again.");
    },
  });

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logEntries, autoScroll]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const payload = {
      campaign_id: campaignId,
      type: "chat",
      user_id: currentUser?.id,
      user_name: currentUserProfile?.username || currentUser?.full_name,
      user_avatar: currentUserProfile?.avatar_url,
      content: message,
      is_whisper: isWhisper,
      is_gm_only: isGmOnly,
    };
    if (isWhisper && whisperTargetId) {
      payload.whisper_target_ids = [whisperTargetId];
      payload.metadata = { whisper_to: whisperTargetId };
    }
    createEntryMutation.mutate(payload);
  };

  // `onKeyPress` used to live here — it's deprecated and stops firing
  // on some browsers in React 18. `onKeyDown` is the canonical hook
  // for Enter-to-submit.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter entries based on visibility + the user's feed filter.
  // Visibility rules (must always be enforced):
  //   - gm_only: only the GM / co-GMs see it
  //   - whisper: only the sender, the GM, and the whisper_target_ids
  //     see it
  const visibleEntries = logEntries.filter(entry => {
    if (entry.is_gm_only && !isGM) return false;
    if (entry.is_whisper && entry.user_id !== currentUser?.id && !isGM) {
      if (!entry.whisper_target_ids?.includes(currentUser?.id)) return false;
    }
    if (feedFilter === "chat") {
      // Only typed chat — hide combat_log, system dividers, dice_roll.
      if (entry.type && entry.type !== "chat") return false;
    } else if (feedFilter === "combat") {
      // Only generated combat events and system notices — hide typed chat.
      if (entry.type === "chat") return false;
    }
    return true;
  });

  // Player roster for the whisper target picker. We exclude the GM
  // (they don't need to whisper themselves) and de-dupe by user_id.
  const whisperTargets = React.useMemo(() => {
    if (!campaign?.player_ids || !allUserProfiles) return [];
    const seen = new Set();
    const out = [];
    campaign.player_ids.forEach((pid) => {
      if (seen.has(pid)) return;
      seen.add(pid);
      const profile = allUserProfiles.find((p) => p.user_id === pid);
      if (!profile) return;
      if (pid === campaign.game_master_id) return;
      out.push(profile);
    });
    return out;
  }, [campaign?.player_ids, campaign?.game_master_id, allUserProfiles]);

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
      case 'combat_log':
        return <CombatLogEntry entry={entry} formatTimestamp={formatTimestamp} />;
      default:
        return <ChatEntry entry={entry} formatTimestamp={formatTimestamp} isGM={isGM} displayInfo={displayInfo} />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Feed filter tabs */}
      <div className="flex items-center gap-1 mb-2 pb-1 border-b border-[#111827]">
        <Filter className="w-3 h-3 text-slate-500" />
        {[
          { id: 'all', label: 'All', icon: null },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'combat', label: 'Combat', icon: Swords },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFeedFilter(id)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              feedFilter === id
                ? 'bg-[#22c5f5]/25 text-[#22c5f5] border border-[#22c5f5]/60'
                : 'bg-transparent text-slate-500 border border-transparent hover:text-slate-300'
            }`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {label}
          </button>
        ))}
      </div>

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
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {isGM && (
            <>
              <button
                onClick={() => {
                  const next = !isWhisper;
                  setIsWhisper(next);
                  if (!next) setWhisperTargetId(null);
                  // Whisper and GM Only are mutually exclusive — a
                  // message can't be both private-to-GM and directed
                  // at a specific player.
                  if (next) setIsGmOnly(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                  isWhisper ? 'bg-purple-500/30 text-purple-300' : 'bg-[#111827] text-slate-400 hover:text-slate-300'
                }`}
              >
                {isWhisper ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                Whisper
              </button>
              {isWhisper && (
                <select
                  value={whisperTargetId || ''}
                  onChange={(e) => setWhisperTargetId(e.target.value || null)}
                  className="bg-[#111827] border border-purple-500/40 text-purple-200 text-[10px] rounded px-1.5 py-1 focus:outline-none focus:border-purple-400"
                >
                  <option value="">to...</option>
                  {whisperTargets.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.username || p.email || p.user_id}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => {
                  const next = !isGmOnly;
                  setIsGmOnly(next);
                  if (next) {
                    setIsWhisper(false);
                    setWhisperTargetId(null);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                  isGmOnly ? 'bg-amber-500/30 text-amber-300' : 'bg-[#111827] text-slate-400 hover:text-slate-300'
                }`}
              >
                <Lock className="w-3 h-3" />
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
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#22c5f5] transition-colors"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || createEntryMutation.isPending}
            className="w-8 h-8 rounded-lg bg-[#22c5f5] hover:bg-[#38bdf8] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
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
  const isRoundDivider = entry.metadata?.kind === 'round_divider';
  if (isRoundDivider) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-slate-700/60" />
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] whitespace-nowrap">
          {entry.content}
        </span>
        <div className="flex-1 h-px bg-slate-700/60" />
      </div>
    );
  }
  return (
    <div className="text-center py-1">
      <span className="text-[10px] text-slate-500 bg-[#111827] px-3 py-1 rounded-full">
        {entry.content}
      </span>
    </div>
  );
}

/**
 * Auto-generated combat events. Styled as compact, left-border-
 * colored rows so they visually recede behind player chat and let
 * the eye skim them quickly during a busy turn.
 */
function CombatLogEntry({ entry, formatTimestamp }) {
  const category = entry.metadata?.category || 'misc';
  const borderClass = COMBAT_LOG_BORDER[category] || COMBAT_LOG_BORDER.misc;
  const glyph = COMBAT_LOG_GLYPH[category] || COMBAT_LOG_GLYPH.misc;
  // Damage/crit flags drive subtle emphasis so the GM can spot the
  // important lines in a sea of compact log rows.
  const isCrit = entry.metadata?.crit;
  return (
    <div className={`pl-2 pr-1 py-0.5 border-l-2 bg-white/5 rounded-sm ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] leading-snug flex-1 ${isCrit ? 'text-yellow-200 font-bold' : 'text-slate-200'}`}>
          <span className="mr-1">{glyph}</span>
          {entry.content}
        </p>
        <span className="text-[9px] text-slate-500 flex-shrink-0 mt-0.5">
          {formatTimestamp(entry.created_date)}
        </span>
      </div>
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