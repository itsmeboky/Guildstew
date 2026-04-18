import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Scratch pad inside the GM sidebar. Persists to
 * `campaigns.gm_quick_notes` via a debounced save so the GM can
 * jot without thinking about a save button, but a manual button is
 * there too.
 */
export default function GMSidebarQuickNotes({ campaignId, campaign }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(campaign?.gm_quick_notes || "");
  const [saving, setSaving] = useState(false);

  // Re-seed from upstream when the campaign record refreshes and
  // we haven't typed anything fresh yet.
  useEffect(() => {
    setValue(campaign?.gm_quick_notes || "");
  }, [campaign?.id]);

  const save = async () => {
    if (!campaignId) return;
    setSaving(true);
    try {
      await base44.entities.Campaign.update(campaignId, { gm_quick_notes: value });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast.success("Notes saved.");
    } catch (err) {
      toast.error(err?.message || "Couldn't save notes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-2">Quick Notes</h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full h-64 bg-[#0f1219] border border-slate-700 rounded-lg p-3 text-sm text-white resize-none"
        placeholder="Jot notes during the session…"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-2 w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-sm py-2 rounded-lg disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Notes"}
      </button>
    </div>
  );
}
