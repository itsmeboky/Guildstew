import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PendingApprovalsPanel from "@/components/gm/PendingApprovalsPanel";

/**
 * Pending Approvals — a campaign GM page (reached from the campaign GM
 * sidebar item in Layout). Renders the always-on list of pending
 * player-submitted content (PendingApprovalsPanel); deity is the only wired
 * type. GM-only: the sidebar item is GM-only, and this page double-checks.
 */
export default function PendingApprovals() {
  const campaignId = new URLSearchParams(window.location.search).get("id");

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((r) => r?.[0]),
    enabled: !!campaignId,
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isGM = !!campaign
    && (campaign.game_master_id === user?.id
        || (Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(user?.id)));

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1219] text-slate-400">
        Loading campaign…
      </div>
    );
  }

  if (!isGM) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1219] text-slate-400">
        Only the GM can review pending approvals.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1219] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Pending Approvals</h1>
        <p className="text-slate-400 text-sm mb-6">
          Player-submitted content awaiting your review for{" "}
          <span className="text-white font-semibold">{campaign.name || campaign.title}</span>.
        </p>
        <PendingApprovalsPanel campaignId={campaignId} isGM={isGM} />
      </div>
    </div>
  );
}
