import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, UserPlus, Compass } from "lucide-react";
import { createPageUrl } from "@/utils";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

/**
 * Sidebar Campaigns CTA block.
 *
 * Three stacked actions rendered at the top of the sidebar when the
 * user is on the Campaigns list page:
 *   - PLAY          (primary teal) → CreateCampaign flow
 *   - Join Campaign (secondary)    → opens invite-code dialog
 *   - Find Campaign (secondary)    → /campaigns/find discovery page
 *
 * Kept as a single component so AppSidebar just renders it when the
 * current route matches.
 */
export default function CampaignActions() {
  const navigate = useNavigate();
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <>
      <div className="px-1 pb-2 space-y-2">
        <button
          type="button"
          onClick={() => navigate(createPageUrl("CreateCampaign"))}
          className="w-full flex items-center justify-center gap-2 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-black text-sm rounded-lg py-3 shadow-[0_0_18px_rgba(55,242,209,0.25)] transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          PLAY
        </button>
        <button
          type="button"
          onClick={() => setJoinOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-[#1E2430] hover:bg-[#2a3441] text-[#37F2D1] font-bold text-sm rounded-lg py-2.5 border border-[#37F2D1]/50 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Join Campaign
        </button>
        <button
          type="button"
          onClick={() => navigate("/campaigns/find")}
          className="w-full flex items-center justify-center gap-2 bg-[#1E2430] hover:bg-[#2a3441] text-[#37F2D1] font-bold text-sm rounded-lg py-2.5 border border-[#37F2D1]/50 transition-colors"
        >
          <Compass className="w-4 h-4" />
          Find Campaign
        </button>
      </div>
      <JoinByInviteCodeDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}

function JoinByInviteCodeDialog({ open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  React.useEffect(() => { if (open) setCode(""); }, [open]);

  const join = useMutation({
    mutationFn: async () => {
      const cleaned = code.trim().toUpperCase();
      if (!cleaned) throw new Error("Enter an invite code.");
      if (!user?.id) throw new Error("Sign in first.");

      // Match is case-insensitive at the UI layer; DB codes are stored
      // uppercase so equality works with .eq.
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select("id, title, name, player_ids, max_players, game_master_id")
        .eq("invite_code", cleaned)
        .maybeSingle();
      if (error) throw error;
      if (!campaign) throw new Error("Invalid invite code.");

      const playerIds = Array.isArray(campaign.player_ids) ? campaign.player_ids : [];
      if (campaign.game_master_id === user.id || playerIds.includes(user.id)) {
        return campaign;
      }

      const cap = Math.min(campaign.max_players || 6, 8);
      if (playerIds.length >= cap) {
        throw new Error("Campaign is full.");
      }

      const { error: updateErr } = await supabase
        .from("campaigns")
        .update({ player_ids: [...playerIds, user.id] })
        .eq("id", campaign.id);
      if (updateErr) throw updateErr;

      return campaign;
    },
    onSuccess: (campaign) => {
      toast.success(`Joined "${campaign.title || campaign.name || "campaign"}"`);
      queryClient.invalidateQueries({ queryKey: ["userCampaigns"] });
      onClose?.();
      navigate(createPageUrl("CampaignView") + `?id=${campaign.id}`);
    },
    onError: (err) => {
      console.error("Join by invite code", err);
      toast.error(`Failed to join: ${err?.message || err}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#37F2D1]" /> Enter Invite Code
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Ask your GM for the 6-character code for the campaign.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder="ABC123"
          className="bg-[#050816] border-slate-700 text-white text-center tracking-[0.3em] font-mono text-lg"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => join.mutate()}
            disabled={join.isPending || code.trim().length < 4}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {join.isPending ? "Joining…" : "Join"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
