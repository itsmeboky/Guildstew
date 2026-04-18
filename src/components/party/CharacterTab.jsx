import React from "react";
import { Shield, Heart, Footprints, Zap } from "lucide-react";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };

function getAbility(character, key) {
  const attrs = character?.attributes || character?.stats?.abilities || character?.ability_scores || {};
  const v = attrs[key] ?? attrs[key.toUpperCase()] ?? 10;
  return Number(v) || 10;
}

function modFor(score) {
  const mod = Math.floor((Number(score) - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export default function CharacterTab({ character }) {
  if (!character) return null;

  const hp = character.hit_points || {};
  const ac = character.armor_class ?? "—";
  const initMod = character.initiative ?? character.initiative_modifier ?? Math.floor((getAbility(character, "dex") - 10) / 2);
  const speed = character.speed ?? 30;
  const title = [character.race, character.subrace, character.class, character.subclass].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <div className="flex gap-5 flex-col md:flex-row">
        {character.avatar_url ? (
          <img
            src={character.avatar_url}
            alt={character.name}
            className="w-48 h-48 rounded-2xl object-cover border-2 border-[#37F2D1]/60 shadow-[0_0_25px_rgba(55,242,209,0.25)] flex-shrink-0"
          />
        ) : (
          <div className="w-48 h-48 rounded-2xl bg-slate-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-black text-white">{character.name}</h2>
          <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">
            Level {character.level || 1}
            {title ? ` · ${title}` : ""}
          </p>
          {character.backstory && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Biography</div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{character.backstory}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <InfoCell label="Race" value={character.race || "—"} />
        <InfoCell label="Background" value={character.background || "—"} />
        <InfoCell label="Alignment" value={character.alignment || "—"} />
        <InfoCell label="Subclass" value={character.subclass || "—"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard icon={Shield} label="AC" value={ac} accent="#3b82f6" />
        <StatCard
          icon={Zap}
          label="Initiative"
          value={initMod >= 0 ? `+${initMod}` : `${initMod}`}
          accent="#fbbf24"
        />
        <StatCard icon={Footprints} label="Speed" value={`${speed} ft`} accent="#22c55e" />
        <StatCard
          icon={Heart}
          label="HP"
          value={`${hp.current ?? hp.max ?? "?"}/${hp.max ?? "?"}`}
          accent="#ef4444"
        />
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Ability Scores</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {ABILITIES.map((key) => {
            const score = getAbility(character, key);
            return (
              <div key={key} className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-2 text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{ABILITY_LABELS[key]}</div>
                <div className="text-[#37F2D1] font-black text-xl mt-1">{modFor(score)}</div>
                <div className="text-white text-sm font-bold">{score}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-sm text-white font-semibold truncate mt-0.5">{value}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3 flex flex-col items-center">
      <Icon className="w-4 h-4 mb-1" style={{ color: accent }} />
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-white font-black text-lg">{value}</div>
    </div>
  );
}
