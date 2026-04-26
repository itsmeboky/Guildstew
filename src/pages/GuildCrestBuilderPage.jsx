import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { createPageUrl } from "@/utils";
import CrestBuilder from "@/components/guild/CrestBuilder";

/**
 * /guild/crest-builder
 *
 * Wraps the CrestBuilder in the leader-gate + back-nav chrome. Non-
 * leaders bounce back to the Hall — only the guild owner can edit
 * the crest. Loads the saved crest_data from the guild_halls row
 * and hands it to the builder for hydration.
 */
export default function GuildCrestBuilderPage() {
  const { user } = useAuth();
  const sub = useSubscription();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const guildOwnerId = sub.guildOwnerId || (sub.isGuildOwner ? user?.id : null);
  const isLeader = sub.isGuildOwner || (user?.id && user.id === guildOwnerId);

  const { data: guild, isLoading } = useQuery({
    queryKey: ["guildRow", guildOwnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_halls")
        .select("*")
        .eq("owner_user_id", guildOwnerId)
        .maybeSingle();
      return data || null;
    },
    enabled: !!guildOwnerId,
  });

  // Bounce non-leaders / no-guild visitors. Done in an effect so the
  // initial guard render doesn't crash on missing context — the
  // sub query lands one tick later.
  React.useEffect(() => {
    if (sub.loading) return;
    if (!guildOwnerId || !isLeader) {
      navigate(createPageUrl("Guild"), { replace: true });
    }
  }, [sub.loading, guildOwnerId, isLeader, navigate]);

  if (sub.loading || isLoading || !guildOwnerId) {
    return (
      <div className="min-h-screen bg-[#1E2430] text-slate-400 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E2430] py-8 px-4">
      <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(createPageUrl("Guild"))}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-2 rounded-md border border-amber-500/40 bg-[#050816] text-amber-200 hover:bg-amber-500/15 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Guild Hall
        </button>
      </div>

      <CrestBuilder
        guildOwnerId={guildOwnerId}
        initialCrestData={guild?.crest_data || null}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["guildRow", guildOwnerId] });
          navigate(createPageUrl("Guild"));
        }}
      />
    </div>
  );
}
