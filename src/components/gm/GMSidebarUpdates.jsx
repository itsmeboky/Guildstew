import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

function formatUpdateTimestamp(update) {
  const raw = update?.created_at || update?.created_date;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

/**
 * Post a CampaignUpdate from inside the GM sidebar so the players'
 * dashboards pick it up without the GM leaving the session. Shows
 * the five most recent posts below the form for quick context.
 */
export default function GMSidebarUpdates({ campaignId }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: recent = [] } = useQuery({
    queryKey: ["campaignUpdates", campaignId],
    queryFn: () => base44.entities.CampaignUpdate
      .filter({ campaign_id: campaignId }, "-created_at", 5)
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const postMutation = useMutation({
    mutationFn: () => base44.entities.CampaignUpdate.create({
      campaign_id: campaignId,
      title: title.trim(),
      content: content.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignUpdates", campaignId] });
      setTitle("");
      setContent("");
      toast.success("Update posted.");
    },
    onError: (err) => toast.error(err?.message || "Couldn't post update."),
  });

  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-2">Post Update</h3>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Update title…"
        className="w-full mb-2 bg-[#0f1219] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write an update…"
        className="w-full h-32 bg-[#0f1219] border border-slate-700 rounded-lg p-3 text-sm text-white resize-none mb-2"
      />
      <button
        type="button"
        onClick={() => {
          if (!title.trim() || !content.trim()) {
            toast.error("Title and content are required.");
            return;
          }
          postMutation.mutate();
        }}
        disabled={postMutation.isPending}
        className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold text-sm py-2 rounded-lg disabled:opacity-50"
      >
        {postMutation.isPending ? "Posting…" : "Post Update"}
      </button>

      {recent.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Recent</h4>
          <ul className="space-y-2">
            {recent.map((u) => (
              <li key={u.id} className="bg-[#0f1219] border border-slate-700/40 rounded p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-white font-semibold truncate">{u.title}</p>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">
                    {formatUpdateTimestamp(u)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2">{u.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
