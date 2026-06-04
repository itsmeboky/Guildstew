import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PantheonViewer from "@/components/worldLore/PantheonViewer";
import DeityEditor from "@/components/worldLore/DeityEditor";

/**
 * Deities & Religion — the wired container for the World Lore "religions"
 * category. Replaces the generic EntryCategoryView for this category:
 *   - PantheonViewer renders the campaign pantheon (party-facing; non-GMs
 *     only see discovered + accepted deities — the editor enforces the
 *     same, RLS enforces accepted server-side).
 *   - DeityEditor (GM only) creates/edits deities against the campaign-
 *     scoped `deities` table.
 *
 * GM-authored deities save with source 'gm-authored' / approval_status
 * 'accepted'; the player-submission + GM-acceptance workflow is a later
 * phase (the columns exist for it now).
 */
export default function DeitiesPanel({ campaignId, isGM, user }) {
  const queryClient = useQueryClient();
  // null = closed; {} = creating a new deity; deity object = editing.
  const [editing, setEditing] = useState(null);

  const { data: deities = [] } = useQuery({
    queryKey: ["deities", campaignId],
    queryFn: () =>
      base44.entities.Deity.filter({ campaign_id: campaignId }, "-created_at"),
    enabled: !!campaignId,
  });

  // World Lore entries, for the optional deity ↔ lore-entry link the
  // editor/viewer support via `entry_id`.
  const { data: entries = [] } = useQuery({
    queryKey: ["worldLoreEntriesAll", campaignId],
    queryFn: () =>
      base44.entities.WorldLoreEntry.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deities", campaignId] });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        const { id, ...rest } = data;
        return base44.entities.Deity.update(id, rest);
      }
      // GM-authored, accepted by definition. submitted_by stays null
      // (that's for player-submitted deities in a later phase).
      return base44.entities.Deity.create({
        ...data,
        campaign_id: campaignId,
        source: "gm-authored",
        approval_status: "accepted",
        submitted_by: null,
        created_by: user?.id || null,
      });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Deity saved.");
    },
    onError: (err) => toast.error(`Couldn't save deity: ${err?.message || err}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Deity.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("Deity removed.");
    },
    onError: (err) => toast.error(`Couldn't delete deity: ${err?.message || err}`),
  });

  return (
    <div className="space-y-4">
      {isGM && (
        <div className="flex justify-end">
          <Button
            onClick={() => setEditing({})}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" /> Create Deity
          </Button>
        </div>
      )}

      <PantheonViewer
        deities={deities}
        entries={entries}
        canEdit={isGM}
        onSelectDeity={(deity) => setEditing(deity)}
        onDeleteDeity={(id) => deleteMutation.mutate(id)}
      />

      {editing && (
        <DeityEditor
          deity={editing.id ? editing : null}
          deities={deities}
          entries={entries}
          campaignId={campaignId}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
