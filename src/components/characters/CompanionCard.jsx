import React from "react";
import { Shield, Heart, Wind, AlertTriangle, PawPrint } from "lucide-react";

/**
 * Shared companion card — used by the creator's ReviewStep and by
 * the character sheet viewer. Accepts a companion object of the
 * shape written by CompanionPicker / CustomCompanionApprovalDialog:
 *
 *   { name, species, creature_type, ac, hp, speed, fly, swim, climb,
 *     image, description, background, abilities?, actions?, special?,
 *     is_custom, needs_gm_approval }
 *
 * Renders a "Pending GM Approval" amber badge when the custom
 * companion hasn't had stats filled in yet; stats fall back to em-
 * dashes so the card still looks complete.
 */
export default function CompanionCard({ companion, compact = false }) {
  if (!companion) return null;
  const pending = !!companion.needs_gm_approval;
  const statVal = (v) => (v === null || v === undefined || v === "" ? "—" : v);
  const abilities = companion.abilities || {};

  return (
    <div className={`bg-[#1E2430] border rounded-lg overflow-hidden ${pending ? "border-amber-400/50" : "border-slate-700"}`}>
      <div className="flex gap-3 p-3">
        <div className="w-20 h-20 rounded bg-[#050816] border border-slate-700 overflow-hidden flex-shrink-0">
          {companion.image ? (
            <img src={companion.image} alt={companion.name || "Companion"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <PawPrint className="w-8 h-8" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-bold truncate">{companion.name || companion.species || "Unnamed"}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 truncate">
                {companion.species || companion.creature_type || "Companion"}
                {companion.size ? ` · ${companion.size}` : ""}
              </p>
            </div>
            {pending && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 bg-amber-500/20 text-amber-200 border border-amber-400/40 flex-shrink-0">
                <AlertTriangle className="w-3 h-3" /> Pending GM
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
            <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3 text-slate-400" /> AC {statVal(companion.ac)}</span>
            <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> HP {statVal(companion.hp)}</span>
            <span className="inline-flex items-center gap-1"><Wind className="w-3 h-3 text-slate-400" /> {statVal(companion.speed)} ft.</span>
            {companion.fly ? <span className="text-sky-300">Fly {companion.fly}</span> : null}
            {companion.swim ? <span className="text-cyan-300">Swim {companion.swim}</span> : null}
            {companion.climb ? <span className="text-emerald-300">Climb {companion.climb}</span> : null}
          </div>
        </div>
      </div>

      {(companion.description || companion.background) && (
        <p className="text-[11px] text-slate-400 leading-snug px-3 pb-2">
          {companion.background || companion.description}
        </p>
      )}

      {!compact && Object.keys(abilities).length > 0 && (
        <div className="grid grid-cols-6 gap-1 px-3 pb-3">
          {["str","dex","con","int","wis","cha"].map((k) => (
            <div key={k} className="bg-[#050816] border border-slate-800 rounded py-1 text-center">
              <p className="text-[9px] uppercase text-slate-500">{k.toUpperCase()}</p>
              <p className="text-xs font-bold text-white">{abilities[k] ?? "—"}</p>
            </div>
          ))}
        </div>
      )}

      {!compact && (companion.actions || companion.special) && (
        <div className="px-3 pb-3 space-y-2">
          {companion.actions && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Actions</p>
              <p className="text-[11px] text-slate-300 whitespace-pre-line leading-snug">{companion.actions}</p>
            </div>
          )}
          {companion.special && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Special</p>
              <p className="text-[11px] text-slate-300 whitespace-pre-line leading-snug">{companion.special}</p>
            </div>
          )}
        </div>
      )}

      {pending && (
        <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <p className="text-[10px] text-amber-100 leading-snug">
            Your GM will assign stats before this companion can participate in combat.
          </p>
        </div>
      )}
    </div>
  );
}
