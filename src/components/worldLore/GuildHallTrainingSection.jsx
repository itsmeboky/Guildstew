import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, Clock, Coins } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import {
  BASE_TRAINING_WEEKS,
  COST_PER_WEEK,
  TRAINABLE_LANGUAGES,
  TRAINABLE_TOOLS,
  TRAINABLE_SIMPLE_WEAPONS,
  TRAINABLE_MARTIAL_WEAPONS,
  TRAINABLE_ARMOR,
  calculateTrainingTime,
  canTrainRareLanguages,
  canTrainMartialWeapons,
  availableTrainingTypes,
  anyTrainingUnlocked,
} from "@/config/trainingConfig";

/**
 * Guild Hall → Training section.
 *
 * Visible only when the campaign owns at least one training-related
 * upgrade (Library / Training Grounds / Workshop, any tier).
 *
 * Step 2 scope: render the picker. Character → type → specific item,
 * with gates on the item dropdown (rare languages hidden without
 * Scholar's Archive, martial weapons hidden without Combat Arena).
 * Items the character already has are filtered out. A duration +
 * cost readout updates live from calculateTrainingTime. The "Start
 * Training" button currently toasts a placeholder; step 3 persists
 * the training row to characters.training_progress.
 */
export default function GuildHallTrainingSection({ campaign, purchasedUpgrades = [], canEdit }) {
  if (!anyTrainingUnlocked(purchasedUpgrades)) return null;

  const campaignId = campaign?.id;
  const { data: characters = [] } = useQuery({
    queryKey: ["guildHallTraining", "characters", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("campaign_id", campaignId);
      if (error) { console.error("characters load failed:", error); return []; }
      return data || [];
    },
    enabled: !!campaignId,
    initialData: [],
  });

  const [characterId, setCharacterId] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [target, setTarget] = useState("");

  const character = characters.find((c) => c.id === characterId) || null;
  const typeOptions = availableTrainingTypes(purchasedUpgrades);

  // Narrow the item dropdown by type + strip entries the character
  // already has so the GM can't double-train the same proficiency.
  const itemOptions = useMemo(() => {
    if (!character || !trainingType) return [];
    const stats = character.stats || character;
    if (trainingType === "language") {
      const known = new Set(stats.languages || []);
      const standard = TRAINABLE_LANGUAGES.standard.filter((l) => !known.has(l));
      const rare = canTrainRareLanguages(purchasedUpgrades)
        ? TRAINABLE_LANGUAGES.rare.filter((l) => !known.has(l))
        : [];
      return [
        ...standard.map((l) => ({ value: l, label: l, group: "Standard" })),
        ...rare.map((l) => ({ value: l, label: l, group: "Rare" })),
      ];
    }
    if (trainingType === "tool") {
      const known = new Set((stats.tool_proficiencies) || (stats.proficiencies?.tools) || []);
      return TRAINABLE_TOOLS
        .filter((t) => !known.has(t))
        .map((t) => ({ value: t, label: t }));
    }
    if (trainingType === "weapon") {
      const known = new Set((stats.weapon_proficiencies) || (stats.proficiencies?.weapons) || []);
      const simple = TRAINABLE_SIMPLE_WEAPONS.filter((w) => !known.has(w));
      const martial = canTrainMartialWeapons(purchasedUpgrades)
        ? TRAINABLE_MARTIAL_WEAPONS.filter((w) => !known.has(w))
        : [];
      return [
        ...simple.map((w) => ({ value: w, label: w, group: "Simple" })),
        ...martial.map((w) => ({ value: w, label: w, group: "Martial" })),
      ];
    }
    if (trainingType === "armor") {
      const known = new Set((stats.armor_proficiencies) || (stats.proficiencies?.armor) || []);
      return TRAINABLE_ARMOR
        .filter((a) => !known.has(a))
        .map((a) => ({ value: a, label: a }));
    }
    return [];
  }, [character, trainingType, purchasedUpgrades]);

  const quote = useMemo(() => {
    if (!character || !trainingType || !target) return null;
    return calculateTrainingTime(character.stats || character, trainingType, purchasedUpgrades);
  }, [character, trainingType, target, purchasedUpgrades]);

  const resetForm = () => {
    setCharacterId("");
    setTrainingType("");
    setTarget("");
  };

  const startTraining = () => {
    if (!character || !trainingType || !target || !quote) return;
    // Step 3 will wire this to characters.training_progress.
    toast.success(`${character.name} can start training ${target} — ${quote.weeks} wk, ${quote.totalCost} gp.`);
    resetForm();
  };

  // Group options by `group` if any are tagged. The native <Select>
  // here is flat so we emit a single list with section dividers
  // injected via disabled headers.
  const groupedItemOptions = useMemo(() => {
    const groups = new Map();
    for (const opt of itemOptions) {
      const key = opt.group || "All";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(opt);
    }
    return groups;
  }, [itemOptions]);

  return (
    <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 space-y-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-6 h-6 text-[#37F2D1]" />
        <div>
          <h3 className="text-xl font-bold text-white">Training</h3>
          <p className="text-xs text-slate-400">
            Spend downtime to pick up new proficiencies. Base {BASE_TRAINING_WEEKS} weeks at {COST_PER_WEEK} gp/week,
            reduced by INT mod and Guild Hall upgrades.
          </p>
        </div>
      </div>

      {!canEdit && (
        <p className="text-xs text-amber-300 italic">
          Only the GM can start training. Ask them to open a slot for you.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-slate-300 font-semibold mb-1 block">Character</Label>
          <Select value={characterId} onValueChange={(v) => { setCharacterId(v); setTrainingType(""); setTarget(""); }} disabled={!canEdit}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
              <SelectValue placeholder="Choose a character…" />
            </SelectTrigger>
            <SelectContent>
              {characters.length === 0 ? (
                <div className="px-2 py-1 text-xs text-slate-400">No characters in campaign.</div>
              ) : characters.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name || "Unnamed"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-slate-300 font-semibold mb-1 block">Training Type</Label>
          <Select value={trainingType} onValueChange={(v) => { setTrainingType(v); setTarget(""); }} disabled={!canEdit || !character}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
              <SelectValue placeholder="Choose a type…" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.includes("language") && <SelectItem value="language">Language</SelectItem>}
              {typeOptions.includes("tool") && <SelectItem value="tool">Tool</SelectItem>}
              {typeOptions.includes("weapon") && <SelectItem value="weapon">Weapon Proficiency</SelectItem>}
              {typeOptions.includes("armor") && <SelectItem value="armor">Armor Proficiency</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-slate-300 font-semibold mb-1 block">What to Train</Label>
          <Select value={target} onValueChange={setTarget} disabled={!canEdit || !trainingType}>
            <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
              <SelectValue placeholder="Pick what to learn…" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(groupedItemOptions.entries()).map(([group, opts]) => (
                <React.Fragment key={group}>
                  {groupedItemOptions.size > 1 && (
                    <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      {group}
                    </div>
                  )}
                  {opts.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </React.Fragment>
              ))}
              {itemOptions.length === 0 && trainingType && (
                <div className="px-2 py-1 text-xs text-slate-400">
                  Nothing left to train of that type.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {quote && (
        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-4 text-sm text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#37F2D1]" />
              <strong>{quote.weeks}</strong> week{quote.weeks === 1 ? "" : "s"}
              {quote.reduction > 0 && (
                <span className="text-[#37F2D1] ml-1">(-{quote.reduction}% from Guild Hall)</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-400" />
              <strong>{quote.totalCost}</strong> gp total
              <span className="text-slate-500 ml-1">({COST_PER_WEEK} gp/wk)</span>
            </span>
          </div>
          <Button
            type="button"
            onClick={startTraining}
            disabled={!canEdit}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            Start Training
          </Button>
        </div>
      )}
    </div>
  );
}
