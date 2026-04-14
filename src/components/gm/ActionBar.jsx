import React from "react";
import { hpBarColor } from "@/components/combat/hpColor";

export const ActionBar = ({ character }) => {
  const ac = character?.stats?.armor_class || character?.armor_class || 13;
  const initiative = character?.stats?.initiative || 2;
  const speed = character?.speed || 30;
  const currentHp = character?.hit_points?.current || 34;
  const maxHp = character?.hit_points?.max || 52;
  const tempHp = character?.hit_points?.temporary || 0;
  const hpPercent = (currentHp / maxHp) * 100;

  // Mock spell icons - replace with actual character spells
  const spellIcons = Array(12).fill(null);

  return (
    <div className="w-full bg-transparent flex justify-center">
      <div className="w-full max-w-[1600px] rounded-[32px] bg-[#050b18]/95 backdrop-blur-md px-8 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] space-y-4">
        {/* TOP ROW */}
        <div className="flex items-center gap-6">
          {/* AC / INIT / SPEED cluster */}
          <div className="flex items-end gap-3">
            {/* AC */}
            <div className="bg-[#141b30] text-white rounded-t-full rounded-b-3xl px-5 pt-5 pb-4 flex flex-col items-center min-w-[82px]">
              <span className="text-[10px] tracking-[0.25em] uppercase text-slate-400">
                AC
              </span>
              <span className="text-3xl font-semibold leading-none mt-1">
                {ac}
              </span>
            </div>

            {/* Initiative */}
            <div className="bg-[#141b30] text-white rounded-t-full rounded-b-3xl px-4 pt-4 pb-3 flex flex-col items-center min-w-[82px]">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">
                Initiative
              </span>
              <span className="text-xl font-semibold leading-none mt-1">
                +{initiative}
              </span>
            </div>

            {/* Speed */}
            <div className="bg-[#141b30] text-white rounded-t-full rounded-b-3xl px-4 pt-4 pb-3 flex flex-col items-center min-w-[90px]">
              <span className="text-[10px] tracking-[0.15em] uppercase text-slate-400">
                Speed
              </span>
              <span className="text-sm font-semibold leading-none mt-1">
                {speed} ft.
              </span>
            </div>
          </div>

          {/* HEALTH BAR */}
          <div className="flex-1 flex items-center gap-3">
            {/* Heart icon */}
            <div className="w-9 h-9 rounded-full bg-[#141b30] flex items-center justify-center">
              <span className="text-lg text-rose-300">♡</span>
            </div>

            {/* Bar */}
            <div className="flex-1">
              <div className="h-4 rounded-full bg-[#252b3d] overflow-hidden">
                {/* % HP fill — color driven by threshold (green/yellow/red) */}
                <div
                  className={`h-full ${hpBarColor(hpPercent)}`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-slate-300 tracking-wide">
                <span>{currentHp} / {maxHp} HP</span>
                <span>Temp HP {tempHp}</span>
              </div>
            </div>
          </div>

          {/* VERTICAL DIVIDER */}
          <div className="w-px h-12 bg-[#343a4f]" />

          {/* RIGHT BUTTON CLUSTER */}
          <div className="flex items-center gap-2">
            {/* Inspiration */}
            <button className="w-11 h-11 rounded-[14px] bg-[#141b30] flex items-center justify-center shadow-inner hover:bg-[#1c2340] transition">
              <span className="text-xl">♪</span>
            </button>

            {/* Action / Bonus */}
            <button className="w-11 h-11 rounded-[14px] bg-[#141b30] flex items-center justify-center shadow-inner hover:bg-[#1c2340] transition">
              <span className="text-xl">▶</span>
            </button>

            {/* Spell slots (little houses) */}
            <button className="w-11 h-11 rounded-[14px] bg-[#141b30] flex items-center justify-center shadow-inner hover:bg-[#1c2340] transition">
              <div className="w-6 h-6 bg-[#0ea5e9] rounded-[6px] flex items-end justify-center pb-[3px]">
                <div className="w-[14px] h-[10px] bg-[#020617] rounded-t-[4px]" />
              </div>
            </button>

            <button className="w-11 h-11 rounded-[14px] bg-[#141b30] flex items-center justify-center shadow-inner hover:bg-[#1c2340] transition">
              <div className="w-6 h-6 bg-[#38bdf8] rounded-[6px] flex items-end justify-center pb-[3px]">
                <div className="w-[14px] h-[10px] bg-[#020617] rounded-t-[4px]" />
              </div>
            </button>
          </div>
        </div>

        {/* BOTTOM ROW – SPELLS / ACTIONS */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 overflow-hidden">
            {spellIcons.map((src, idx) => (
              <button
                key={idx}
                className="flex-shrink-0 w-[64px] h-[64px] rounded-2xl bg-[#111827] border border-[#1f2937] overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)] hover:-translate-y-[1px] hover:border-[#38bdf8] transition"
              >
                {src ? (
                  <img
                    src={src}
                    alt={`Spell ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600" />
                )}
              </button>
            ))}

            {/* Empty slots */}
            <div className="flex-shrink-0 w-[64px] h-[64px] rounded-2xl bg-[#111827]/70 border border-dashed border-[#1f2937]" />
            <div className="flex-shrink-0 w-[64px] h-[64px] rounded-2xl bg-[#111827]/70 border border-dashed border-[#1f2937]" />
          </div>
        </div>
      </div>
    </div>
  );
};