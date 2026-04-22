import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Heart, Wind, Upload, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { resolveCompanionContext } from "@/config/companionCatalog";

/**
 * Official companion picker — used by the creator's ClassStep when
 * the character's class grants a companion (Wizard familiar, Paladin
 * steed, Ranger beast companion, Warlock familiar incl. Pact of the
 * Chain upgrades).
 *
 * Persistence shape: writes the first (and, for now, only) companion
 * onto `characterData.companions[0]`. The legacy freeform fields
 * (`companion_name`, `companion_image`, `companion_background`) still
 * mirror the same data so any existing code that reads them keeps
 * working.
 *
 * Custom companions:
 *   { id: 'custom', is_custom: true, needs_gm_approval: true, name,
 *     image, description }
 * The GM approval flow in Step 5 picks these up from whichever
 * character has `needs_gm_approval: true` on a companion entry.
 */
export default function CompanionPicker({ characterData, updateCharacterData, campaignId }) {
  const ctx = resolveCompanionContext({
    className: characterData.class,
    subclass: characterData.subclass,
  });
  const current = Array.isArray(characterData.companions) && characterData.companions[0]
    ? characterData.companions[0]
    : null;

  // Beast Master draws its options from the live dnd5e_monsters
  // table — CR ≤ 1/4, beasts only. We still fall back to the
  // catalog's SRD beasts if the query is empty (fresh DB seed).
  const { data: beasts = [] } = useQuery({
    queryKey: ["beastCompanions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dnd5e_monsters")
        .select("id, name, type, armor_class, hit_points, speed, challenge_rating, image_url")
        .ilike("type", "beast%")
        .lte("challenge_rating", 0.25)
        .order("challenge_rating", { ascending: false })
        .limit(80);
      if (error) {
        console.error("Beast companion fetch failed", error);
        return [];
      }
      return data || [];
    },
    enabled: ctx?.kind === "beast_master",
  });

  const options = useMemo(() => {
    if (ctx?.kind !== "beast_master") return ctx?.list || [];
    if (!beasts || beasts.length === 0) return ctx.list || [];
    return beasts.map((b) => {
      const speedValue = typeof b.speed === "object" && b.speed !== null
        ? b.speed.walk || b.speed.swim || b.speed.fly || 30
        : Number(b.speed) || 30;
      return {
        id: `beast-${b.id}`,
        species: b.name,
        creature_type: "beast",
        ac: Number(b.armor_class) || 10,
        hp: Number(b.hit_points) || 1,
        speed: speedValue,
        description: `Beast · CR ${b.challenge_rating}`,
        image: b.image_url || null,
      };
    });
  }, [ctx, beasts]);

  if (!ctx) return null;

  const selectedId = current?.id || null;

  const pick = (opt) => {
    const name = current?.name && current?.id === opt.id ? current.name : opt.species;
    const next = {
      id: opt.id,
      species: opt.species,
      creature_type: opt.creature_type,
      ac: opt.ac,
      hp: opt.hp,
      speed: opt.speed,
      fly: opt.fly || null,
      swim: opt.swim || null,
      climb: opt.climb || null,
      description: opt.description || "",
      image: current?.id === opt.id && current?.image ? current.image : opt.image,
      name,
      is_custom: false,
      needs_gm_approval: false,
    };
    updateCharacterData({
      companions: [next],
      companion_name: next.name,
      companion_image: next.image,
      companion_background: current?.companion_background || "",
    });
  };

  const updateCurrent = (patch) => {
    if (!current) return;
    const merged = { ...current, ...patch };
    updateCharacterData({
      companions: [merged],
      companion_name: merged.name ?? current.name,
      companion_image: merged.image ?? current.image,
    });
  };

  const uploadPortrait = async (file) => {
    if (!current) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateCurrent({ image: file_url });
      toast.success("Portrait updated");
    } catch {
      toast.error("Portrait upload failed");
    }
  };

  return (
    <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#5B4B9E]/30 space-y-4">
      <div>
        <h3 className="text-base font-bold text-[#5B4B9E]">{ctx.title}</h3>
        <p className="text-xs text-white/60 mt-0.5">{ctx.description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
        {options.map((opt) => {
          const isSel = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => pick(opt)}
              className={`text-left rounded-lg border p-2 transition-all ${
                isSel
                  ? "border-[#37F2D1] bg-[#37F2D1]/10 shadow-[0_0_12px_rgba(55,242,209,0.2)]"
                  : "border-slate-700 bg-[#0b1220]/60 hover:border-[#5B4B9E]/60"
              }`}
            >
              <div className="aspect-square rounded overflow-hidden bg-[#050816] border border-slate-800 mb-2">
                {opt.image ? (
                  <img src={opt.image} alt={opt.species} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Sparkles className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] font-bold text-white truncate">{opt.species}</p>
                {isSel && <Check className="w-3 h-3 text-[#37F2D1] flex-shrink-0" />}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                <span className="inline-flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> {opt.ac}</span>
                <span className="inline-flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-red-400" /> {opt.hp}</span>
                <span className="inline-flex items-center gap-0.5"><Wind className="w-2.5 h-2.5" /> {opt.speed}</span>
              </div>
            </button>
          );
        })}
      </div>

      {current && !current.is_custom && (
        <CompanionEditor
          current={current}
          onChange={updateCurrent}
          onPortraitFile={uploadPortrait}
        />
      )}
    </div>
  );
}

// Rename / background / portrait-override editor for an already-picked
// SRD companion. Custom companions have their own editor in Step 4.
function CompanionEditor({ current, onChange, onPortraitFile }) {
  const [uploading, setUploading] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await onPortraitFile(file); } finally { setUploading(false); }
  };

  return (
    <div className="border-t border-slate-800 pt-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded overflow-hidden bg-[#050816] border border-slate-700 flex-shrink-0">
          {current.image ? (
            <img src={current.image} alt={current.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <Sparkles className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Selected</p>
          <p className="text-white font-bold text-sm">{current.species}</p>
          <p className="text-[10px] text-slate-500 line-clamp-2">{current.description}</p>
        </div>
        <label className="inline-flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
            className="border-slate-700 text-slate-300"
          >
            <Upload className="w-3 h-3 mr-1" /> {uploading ? "…" : "Portrait"}
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      </div>

      <div>
        <Label className="text-white/50 mb-1 block text-xs">Companion Name</Label>
        <Input
          value={current.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={current.species}
          className="bg-[#0b1220] border-slate-700 text-white text-sm h-9"
        />
      </div>

      <div>
        <Label className="text-white/50 mb-1 block text-xs">Background</Label>
        <Textarea
          value={current.background || ""}
          onChange={(e) => onChange({ background: e.target.value })}
          placeholder="How did you meet? Any quirks?"
          className="bg-[#0b1220] border-slate-700 text-white text-sm min-h-20 resize-none"
        />
      </div>
    </div>
  );
}
