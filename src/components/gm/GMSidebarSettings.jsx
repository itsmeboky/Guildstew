import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Compact inline Campaign Settings editor. Exposes the four
 * settings the GM most often wants to flip mid-session — title,
 * description, max players (capped at 8), and open-recruitment —
 * without leaving the panel. Anything more ambitious still lives
 * on the full Campaign Settings page.
 */
export default function GMSidebarSettings({ campaignId, campaign }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(campaign?.title || "");
  const [description, setDescription] = useState(campaign?.description || "");
  const [maxPlayers, setMaxPlayers] = useState(campaign?.max_players ?? 6);
  const [openRecruitment, setOpenRecruitment] = useState(campaign?.open_recruitment !== false);

  useEffect(() => {
    setTitle(campaign?.title || "");
    setDescription(campaign?.description || "");
    setMaxPlayers(campaign?.max_players ?? 6);
    setOpenRecruitment(campaign?.open_recruitment !== false);
  }, [campaign?.id]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Campaign.update(campaignId, {
      title: title.trim(),
      description: description.trim(),
      max_players: Math.max(2, Math.min(8, Number(maxPlayers) || 6)),
      open_recruitment: !!openRecruitment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast.success("Settings saved.");
    },
    onError: (err) => toast.error(err?.message || "Couldn't save settings."),
  });

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold text-sm">Campaign Settings</h3>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#0f1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full bg-[#0f1219] border border-slate-700 rounded-lg p-3 text-sm text-white resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Maximum players</label>
        <select
          value={String(maxPlayers)}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="w-full bg-[#0f1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>{n} Players</option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">Maximum 8 players + 1 GM per campaign.</p>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={openRecruitment}
          onChange={(e) => setOpenRecruitment(e.target.checked)}
          className="accent-[#37F2D1]"
        />
        Open recruitment (campaign visible in Join Campaign)
      </label>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-sm py-2 rounded-lg disabled:opacity-50"
      >
        {saveMutation.isPending ? "Saving…" : "Save Settings"}
      </button>

      <p className="text-xs text-slate-500 italic">
        Full settings (consent, guild hall, retry policy, images, co-DMs)
        still live on the Campaign Settings page.
      </p>
    </div>
  );
}
