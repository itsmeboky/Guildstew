import React from "react";
import { Link } from "react-router-dom";
import { Crown, Sparkles, ArrowRight } from "lucide-react";
import { useSubscription } from "@/lib/SubscriptionContext";
import { createPageUrl } from "@/utils";

/**
 * /guild page.
 *
 * In-a-guild players see a placeholder Guild Hub (full Hub is a
 * follow-up task). Guild-less players see the "Join a Guild" CTA
 * with the warm amber treatment the sidebar hints at.
 */
export default function Guild() {
  const sub = useSubscription();
  const inGuild = !!sub.guildOwnerId || sub.isGuildMember || sub.isGuildOwner;

  if (inGuild) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1E2430] border border-[#2a3441] mb-4">
            <Crown className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-3xl font-black text-white">Guild Hub</h1>
          <p className="text-sm text-slate-400 mt-2">
            Your guild's shared wallet, roster, and Hub surfaces are on the way. For now, the guild
            perks (shared Spice wallet, stipend, subscriber-level splits) are live in the background.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.25)]">
          <Sparkles className="w-10 h-10 text-amber-300" />
        </div>
        <h1 className="text-3xl font-black text-white">Join a Guild</h1>
        <p className="text-sm text-slate-400">
          Guilds share a subscription, a Spice wallet, and a dedicated home base. One membership covers
          up to six tables.
        </p>
        <Link
          to={createPageUrl("Settings") + "?tab=subscription"}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-amber-950 font-black rounded-lg hover:bg-amber-300 transition-colors shadow-[0_0_20px_rgba(251,191,36,0.35)]"
        >
          ✨ Join a Guild <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
