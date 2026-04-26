import React from "react";
import { Crown, Shield, Users, Settings as SettingsIcon } from "lucide-react";
import { displayName } from "@/utils/displayName";

const SEATS = 6;

/**
 * Top banner for the Guild Hall.
 *
 * Left: Guild Crest placeholder (120x120, gold shield outline) with
 * a "Create Crest" button tucked inside when no crest exists.
 * Right: name in Cinzel gold, "Est. …" subtitle, "N/6 Members" count,
 * and the guild leader's name with a crown icon.
 *
 * When the viewer is the guild leader, a gear icon surfaces in the
 * top-right so they can open the settings dialog (wired up in step 6).
 */
export default function GuildHallHeader({
  guild,
  leaderProfile,
  memberCount,
  isLeader,
  onOpenSettings,
  onCreateCrest,
  onEditCrest,
}) {
  const hasCrest = !!(guild?.crest_image_url || guild?.crest_url);
  const foundedAt = guild?.founded_at ? new Date(guild.founded_at) : null;
  const foundedLabel = foundedAt
    ? foundedAt.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "Recently";
  const guildName = guild?.name || "Unnamed Guild";
  const leader = leaderProfile ? displayName(leaderProfile, { fallback: "Guild Leader" }) : "Guild Leader";

  return (
    <header
      className="w-full px-6 md:px-10 py-10 relative"
      style={{
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.14) 55%, rgba(5,8,22,0.98) 100%)",
        borderBottom: "1px solid rgba(245,158,11,0.35)",
      }}
    >
      {isLeader && (
        <button
          type="button"
          onClick={onOpenSettings}
          title="Guild settings"
          className="absolute top-4 right-6 w-10 h-10 rounded-full border border-amber-500/40 bg-[#050816]/60 text-amber-300 hover:text-amber-200 hover:border-amber-300 transition-colors flex items-center justify-center"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      )}

      <div className="max-w-5xl mx-auto flex items-start gap-6 flex-wrap">
        {/* Crest: 120x120 gold shield outline. If no crest, show a
            "Create Crest" CTA overlay. */}
        <div className="relative flex-shrink-0">
          <div
            className="w-[120px] h-[120px] rounded-xl flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(251,191,36,0.15) 0%, rgba(5,8,22,0.75) 70%)",
              border: "2px solid rgba(245,158,11,0.55)",
              boxShadow:
                "0 0 22px rgba(245,158,11,0.25), inset 0 0 18px rgba(251,191,36,0.08)",
            }}
          >
            {guild?.crest_image_url || guild?.crest_url ? (
              <img
                src={guild.crest_image_url || guild.crest_url}
                alt={`${guildName} crest`}
                className="w-full h-full rounded-[10px] object-contain"
              />
            ) : (
              <Shield className="w-14 h-14" strokeWidth={1.5} fill="#2a3441" stroke="#4a5568" />
            )}
          </div>
          {!hasCrest && isLeader && (
            <button
              type="button"
              onClick={onCreateCrest}
              className="absolute inset-x-0 -bottom-2 mx-auto w-[108px] text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 border border-amber-400/60 bg-[#050816] text-amber-200 hover:bg-amber-500/15 transition-colors"
            >
              Create Crest
            </button>
          )}
          {hasCrest && isLeader && (
            <button
              type="button"
              onClick={onEditCrest}
              className="absolute inset-x-0 -bottom-2 mx-auto w-[96px] text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 border border-amber-400/60 bg-[#050816] text-amber-200 hover:bg-amber-500/15 transition-colors"
            >
              Edit Crest
            </button>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-[240px]">
          <h1
            className="text-4xl md:text-5xl font-black leading-tight"
            style={{
              fontFamily: "'Cinzel', 'Cream', Georgia, serif",
              color: "#fbbf24",
              textShadow: "0 2px 18px rgba(245,158,11,0.35)",
            }}
          >
            {guildName}
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70 mt-2 font-bold">
            Est. {foundedLabel}
          </p>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-100">
              <Users className="w-4 h-4 text-amber-300" />
              {memberCount}/{SEATS} Members
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-100">
              <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
              {leader}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
