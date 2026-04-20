import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Package } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getOwnedPortraitOptions } from "@/lib/tavernCosmetics";

/**
 * Tavern portrait picker.
 *
 * Drop-in grid of portraits the signed-in user already owns —
 * personal purchases + portraits shared into the current guild.
 * Designed to sit alongside the existing AI-generate / manual-upload
 * options in the character creator, so the creator can pick from
 * their cosmetic library without leaving the flow.
 *
 * `selectedUrl` highlights the active pick. `onSelect` receives the
 * image url so the caller can slot it into `character.avatar_url` /
 * whatever field they use.
 */
export default function TavernPortraitPicker({ selectedUrl, onSelect, maxHeight = 220 }) {
  const { user } = useAuth();
  const sub = useSubscription();

  const { data: options = [] } = useQuery({
    queryKey: ["tavernOwnedPortraits", user?.id, sub.guildOwnerId],
    queryFn: () => getOwnedPortraitOptions(user.id, { currentGuildId: sub.guildOwnerId }),
    enabled: !!user?.id,
  });

  if (!user?.id) return null;

  if (options.length === 0) {
    return (
      <div className="bg-[#050816] border border-slate-800 rounded-lg p-4 text-center">
        <Package className="w-6 h-6 text-slate-600 mx-auto mb-1" />
        <p className="text-xs text-slate-500">
          You don't own any Tavern portraits yet. Browse The Tavern to pick up new looks.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-[#050816] border border-slate-800 rounded-lg p-2 overflow-y-auto"
      style={{ maxHeight }}
    >
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {options.map((o) => {
          const active = selectedUrl && selectedUrl === o.image_url;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect?.(o)}
              className={`relative aspect-square rounded border-2 overflow-hidden transition-colors ${
                active ? "border-amber-400" : "border-slate-700 hover:border-slate-500"
              }`}
              title={o.name}
            >
              <img src={o.image_url} alt={o.name} className="w-full h-full object-cover object-top" />
              {o.source === "guild" && (
                <span className="absolute top-0.5 left-0.5 inline-flex items-center gap-0.5 text-[8px] uppercase font-bold px-1 py-0.5 rounded bg-purple-600/90 text-white">
                  <Users className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
