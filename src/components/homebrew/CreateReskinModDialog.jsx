import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, ArrowLeft, Info } from "lucide-react";
import { RESKIN_PRESETS, blankRenames } from "@/config/reskinPresets";

/**
 * Reskin mod creator.
 *
 * Step 3 ships only the preset picker — five cards (Blank,
 * Sci-Fi, Horror, Grimdark, Heroic) that load a starting rename
 * blob into form state and reveal the rename-fields form. The
 * fields + save controls land in step 4 (currently a placeholder
 * panel below the picker).
 */

export default function CreateReskinModDialog({ open, onClose, mod = null }) {
  const [presetKey, setPresetKey] = useState(null);
  const [renames, setRenames] = useState(blankRenames);
  const [name, setName] = useState("");

  // Reset state every time the dialog opens / the source mod
  // changes so a previous pick doesn't leak through.
  React.useEffect(() => {
    if (!open) return;
    if (mod) {
      const meta = mod.metadata || {};
      setRenames({ ...blankRenames(), ...(meta.renames || {}) });
      setName(mod.name || "");
      setPresetKey("custom");
    } else {
      setRenames(blankRenames());
      setName("");
      setPresetKey(null);
    }
  }, [open, mod]);

  const pickPreset = (key) => {
    const preset = RESKIN_PRESETS[key];
    if (!preset) return;
    setPresetKey(key);
    setRenames({ ...blankRenames(), ...preset.renames });
    if (!name && preset.name && key !== "blank") {
      setName(preset.name);
    }
  };

  const reset = () => {
    setPresetKey(null);
    setRenames(blankRenames());
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mod ? "Edit Reskin Mod" : "Create Reskin Mod"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Renames change display labels only. No math or mechanics are affected. Players see
            the renamed terms everywhere in the UI.
          </DialogDescription>
        </DialogHeader>

        {presetKey === null ? (
          <PresetPicker onPick={pickPreset} />
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3 h-3" /> Pick a different preset
            </button>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-100">
                You're starting from <strong>
                  {RESKIN_PRESETS[presetKey]?.name || "an existing reskin"}
                </strong>. Step 4 wires the rename fields + save controls — for now this is a
                placeholder showing the loaded rename map.
              </p>
            </div>

            <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-4 text-xs text-slate-300">
              <p className="font-bold mb-2 text-[#37F2D1] uppercase tracking-widest">
                Loaded Renames (preview)
              </p>
              <pre className="whitespace-pre-wrap text-[10px] leading-snug max-h-72 overflow-y-auto">
                {JSON.stringify(renames, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PresetPicker({ onPick }) {
  return (
    <div className="space-y-3 mt-2">
      <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-[#37F2D1] mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-300">
          Pick a starting point. Each preset loads a community-standard rename package — you can
          change, add, or remove any rename after.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(RESKIN_PRESETS).map(([key, preset]) => (
          <PresetCard
            key={key}
            presetKey={key}
            preset={preset}
            onPick={() => onPick(key)}
          />
        ))}
      </div>
    </div>
  );
}

function PresetCard({ presetKey, preset, onPick }) {
  // Build a tiny example list of 3-4 renames so the card hints at
  // the preset's flavor without dumping the full map.
  const examples = collectExamples(preset.renames, 4);
  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left p-4 rounded-lg border bg-[#050816] border-slate-700 hover:border-[#37F2D1]/60 transition-colors flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-bold text-white">{preset.name}</span>
        <span className="text-[9px] uppercase tracking-widest text-[#37F2D1]">
          {presetKey === "blank" ? "Custom" : "Preset"}
        </span>
      </div>
      <p className="text-xs text-slate-400">{preset.description}</p>
      {examples.length > 0 && (
        <ul className="text-[10px] text-slate-300 space-y-0.5 mt-1">
          {examples.map((e, i) => (
            <li key={i}>
              <span className="text-slate-500">{e.from}</span>
              <span className="text-slate-500"> → </span>
              <span className="text-[#37F2D1] font-semibold">{e.to}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}

function collectExamples(renames, max) {
  const out = [];
  const push = (from, to) => { if (out.length < max) out.push({ from, to }); };
  for (const [k, v] of Object.entries(renames?.terms || {}))   push(k, v);
  for (const [k, v] of Object.entries(renames?.abilities || {})) {
    if (out.length >= max) break;
    if (v?.name) push(k.toUpperCase(), v.name);
  }
  for (const [k, v] of Object.entries(renames?.damage_types || {})) push(k, v);
  for (const [k, v] of Object.entries(renames?.conditions || {}))   push(k, v);
  return out;
}
