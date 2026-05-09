import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdventuringPartyContent from "@/components/session/content/AdventuringPartyContent";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * Player-facing Adventuring Party section. Reuses the shared
 * AdventuringPartyContent (which already does dual-role rendering
 * via isUserGM + ownsCharacter + canSeeNote, so player visibility
 * rules are honored at the query layer inside PlayerNotesTab) and
 * stacks a per-user Quick Notes editor underneath it. The notes
 * mirror the GM's `gm_quick_notes` text scratch pad, but live in
 * a JSONB blob keyed by user_id so each player gets their own
 * private space without an extra table.
 */
export default function PlayerAdventuringPartyContent({ campaignId, campaign }) {
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden">
        <AdventuringPartyContent campaignId={campaignId} campaign={campaign} />
      </div>
      <div className="flex-shrink-0 border-t border-[#1e293b] bg-[#050816]">
        <PlayerQuickNotes campaignId={campaignId} campaign={campaign} />
      </div>
    </div>
  );
}

function PlayerQuickNotes({ campaignId, campaign }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const initial = userId ? (campaign?.player_quick_notes?.[userId] || "") : "";
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  // Re-seed when the campaign refreshes or the viewer changes.
  useEffect(() => {
    setValue(userId ? (campaign?.player_quick_notes?.[userId] || "") : "");
  }, [campaign?.id, userId]);

  const save = async () => {
    if (!campaignId || !userId) return;
    setSaving(true);
    try {
      // Merge into the existing JSONB so we don't clobber other
      // players' notes. The campaign row is the source of truth;
      // if a stale read clobbered something, the server-side
      // updated_at trigger would still bump but we'd lose data —
      // accept that for v1, since each user only writes their own
      // key here.
      const next = { ...(campaign?.player_quick_notes || {}), [userId]: value };
      await base44.entities.Campaign.update(campaignId, { player_quick_notes: next });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast.success("Notes saved.");
    } catch (err) {
      toast.error(err?.message || "Couldn't save notes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-sm">Quick Notes</h3>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Private to you</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full h-32 bg-[#0f1219] border border-slate-700 rounded-lg p-3 text-sm text-white resize-none"
        placeholder="Jot notes during the session…"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || !userId}
        className="mt-2 w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-sm py-2 rounded-lg disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Notes"}
      </button>
    </div>
  );
}
