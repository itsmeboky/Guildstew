import React from "react";
import CampaignLog from "@/components/gm/CampaignLog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PlayerRightPanel({ campaignId, players, currentUser }) {
  const navigate = useNavigate();

  const handleLeaveSession = async () => {
    if (window.confirm("Are you sure you want to leave the session? The GM will have to control your character manually.")) {
      // Fetch current campaign to get ready list
      const campaigns = await base44.entities.Campaign.filter({ id: campaignId });
      if (campaigns.length > 0) {
        const currentReady = campaigns[0].ready_player_ids || [];
        const newReady = currentReady.filter(id => id !== currentUser?.id);
        await base44.entities.Campaign.update(campaignId, { ready_player_ids: newReady });
      }
      navigate(createPageUrl("CampaignPanel") + `?id=${campaignId}`);
    }
  };
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Party Members */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg p-4">
        <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Adventuring Party</h3>
        <div className="grid grid-cols-2 gap-3">
          {players.map(player => {
            const char = player.character;
            if (!char) return null;
            // Skip current user if desired, but user asked to "see the other players" (implies excluding self? or all?)
            // "Adventures section with companions so they can see the other players"
            if (player.user_id === currentUser.id) return null;

            return (
              <div key={player.user_id} className="bg-[#111827] rounded-xl overflow-hidden border border-gray-700 relative h-24">
                <div className="absolute inset-0">
                  {char.profile_avatar_url ? (
                    <img src={char.profile_avatar_url} alt={char.name} className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="w-full h-full bg-gray-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block mb-0.5">AC {char.armor_class}</span>
                      <h4 className="text-xs font-bold text-white truncate max-w-[80px]">{char.name}</h4>
                      <p className="text-[9px] text-gray-400">Lvl {char.level} {char.class}</p>
                    </div>
                    {/* Mini HP Bar */}
                    <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${Math.min((char.hit_points?.current/char.hit_points?.max)*100, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {players.length <= 1 && <p className="text-xs text-gray-500 col-span-2 text-center py-2">No other adventurers.</p>}
        </div>
      </div>

      {/* Campaign Log */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg overflow-hidden flex-1 min-h-[300px] flex flex-col">
        <div className="bg-[#111827] px-4 py-2 border-b border-gray-700">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-400">Campaign Log</h3>
        </div>
        <div className="flex-1 relative">
          <CampaignLog 
            campaignId={campaignId} 
            currentUser={currentUser} 
            height="100%"
          />
        </div>
      </div>

      <Button 
        variant="destructive" 
        className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-500 border border-red-500/50"
        onClick={handleLeaveSession}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Leave Session
      </Button>
    </div>
  );
}