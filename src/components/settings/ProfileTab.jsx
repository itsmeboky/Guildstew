import React, { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { supabase } from "@/api/supabaseClient";
import { base44 } from "@/api/base44Client";
import {
  TITLE_CATALOG, computeEarnedTitleIds, unlockHintFor,
} from "@/config/titleCatalog";
import { SectionHeader } from "@/pages/Settings";

/**
 * Profile / identity tab.
 *
 * Today this is just the display-title selector. Earned titles are
 * derived from the user's tier + guild membership + a `user_titles`
 * lookup for manually-granted ones (Founding Backer, Chef de Cuisine,
 * admin awards). Locked titles render grayed-out with a hint that
 * tells the user how to unlock them.
 */
export default function ProfileTab() {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();

  const { data: grants = [] } = useQuery({
    queryKey: ["userTitles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_titles")
        .select("title_id")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const earned = useMemo(() => computeEarnedTitleIds({
    tier: sub?.tier,
    isGuildMember: sub?.isGuildMember,
    isGuildOwner: sub?.isGuildOwner,
    grantedIds: new Set(grants.map((g) => g.title_id)),
  }), [sub?.tier, sub?.isGuildMember, sub?.isGuildOwner, grants]);

  const current = user?.display_title || "Wanderer";

  const setTitle = useMutation({
    mutationFn: async (label) => {
      if (!user?.profile_id) throw new Error("No profile loaded.");
      await base44.entities.UserProfile.update(user.profile_id, { display_title: label });
    },
    onSuccess: (_data, label) => {
      toast.success(`Title set to "${label}"`);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (err) => {
      console.error("Set title", err);
      toast.error(`Couldn't change title: ${err?.message || err}`);
    },
  });

  return (
    <>
      <SectionHeader
        title="Display Title"
        subtitle="The badge that appears under your avatar on your profile."
      />
      <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-4 space-y-2">
        <p className="text-xs text-slate-500">
          You currently display <span className="text-[#37F2D1] font-bold">{current}</span>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TITLE_CATALOG.map((t) => {
            const unlocked = earned.has(t.id);
            const isCurrent = current === t.label;
            return (
              <button
                key={t.id}
                type="button"
                disabled={!unlocked || setTitle.isPending}
                onClick={() => setTitle.mutate(t.label)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  isCurrent
                    ? "bg-[#37F2D1]/10 border-[#37F2D1] shadow-[0_0_10px_rgba(55,242,209,0.2)]"
                    : unlocked
                      ? "bg-[#0b1220] border-slate-700 hover:border-[#37F2D1]/60 hover:bg-[#37F2D1]/5"
                      : "bg-[#0b1220]/40 border-slate-800 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-bold ${unlocked ? "text-white" : "text-slate-400"}`}>
                    {t.label}
                  </p>
                  {isCurrent ? (
                    <Check className="w-4 h-4 text-[#37F2D1]" />
                  ) : !unlocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  ) : null}
                </div>
                {t.description && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {t.description}
                  </p>
                )}
                {!unlocked && (
                  <p className="text-[11px] text-amber-400/80 mt-1 italic">
                    {unlockHintFor(t)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
