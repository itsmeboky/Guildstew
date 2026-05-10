
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wand2, Zap } from "lucide-react";
import QuickCreateDialog from "@/components/characterCreator/QuickCreateDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import {
  calculateMaxHP,
  calculateAC,
  calculateProficiencyBonus,
  calculatePassivePerception,
  getSpeed,
  calculateAbilityModifier
} from "@/components/dnd5e/characterCalculations";
import GamePackPicker from "@/components/characters/GamePackPicker";
import { useUserGamePacks } from "@/lib/useUserGamePacks";
import { getGamePack } from "@/config/gamePacks";

export default function CreateCharacterDialog({ open, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Game pack gate. With one owned pack (everyone today) we
  // auto-skip and render the existing D&D 5e mode picker. With
  // multiple owned packs the player picks the system first; for
  // anything other than dnd5e there's no creator yet so we toast
  // and bail. The picker stays out of sight for current alpha
  // users — zero UX change until a second pack ships.
  const ownedPacks = useUserGamePacks();
  const [chosenPack, setChosenPack] = useState(
    ownedPacks.length === 1 ? ownedPacks[0] : null,
  );

  // Reset the chosen pack each time the dialog opens so a returning
  // multi-pack user gets the picker again.
  useEffect(() => {
    if (open) {
      setChosenPack(ownedPacks.length === 1 ? ownedPacks[0] : null);
    }
  }, [open, ownedPacks]);

  const handlePackSelect = (packId) => {
    const pack = getGamePack(packId);
    if (!pack || pack.status !== "available") {
      toast.error("That game system isn't available yet.");
      return;
    }
    setChosenPack(packId);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Character.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCharacters'] });
      toast.success("Character created successfully!");
      onClose();
      setQuickCreateOpen(false);
    },
    onError: (err) => {
      console.error("Character save failed", err);
      toast.error(`Couldn't save character: ${err?.message || err}`);
    },
  });

  const handleFullCreator = () => {
    onClose();
    navigate(createPageUrl("CharacterCreator"));
  };

  const handleQuickCreate = () => {
    // AI-driven creation paths are gated until 1.0 (provider
    // integration + level-N completeness still in flight). Users
    // see the card visually but the click no-ops with a toast,
    // matching the SpiceEmporium "Disabled for Alpha" pattern.
    toast("Coming in 1.0 — use Full Character Creator for now.");
  };

  const handleQuickCreateComplete = (generatedCharacter) => {
    const proficiencyBonus = calculateProficiencyBonus(generatedCharacter.level);
    const maxHP = calculateMaxHP(generatedCharacter.class, generatedCharacter.level, generatedCharacter.attributes.con);
    const ac = calculateAC(generatedCharacter.attributes.dex);
    const initiative = calculateAbilityModifier(generatedCharacter.attributes.dex);
    const speed = getSpeed(generatedCharacter.race);
    const isPerceptionProficient = generatedCharacter.skills?.["Perception"] || false;
    const hasPerceptionExpertise = generatedCharacter.expertise?.includes("Perception") || false;
    const passivePerception = calculatePassivePerception(generatedCharacter.attributes.wis, isPerceptionProficient, hasPerceptionExpertise, proficiencyBonus);

    const finalData = {
      ...generatedCharacter,
      proficiency_bonus: proficiencyBonus,
      hit_points: { max: maxHP, current: maxHP, temporary: 0 },
      armor_class: ac,
      initiative: initiative,
      passive_perception: passivePerception,
      speed: speed,
      // Ownership — required by RLS. The save failed silently without
      // these because the Quick Create flow skipped the ownership
      // stamp that the full creator / edit flow sets.
      user_id: user?.id,
      created_by: user?.email,
    };

    if (!user?.id || !user?.email) {
      toast.error("Sign in again — your session is missing identity info.");
      return;
    }

    createMutation.mutate(finalData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#2A3441] text-white border-[#37F2D1] max-w-2xl">
          {!chosenPack ? (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">Choose Game System</DialogTitle>
              </DialogHeader>
              <GamePackPicker ownedPackIds={ownedPacks} onSelect={handlePackSelect} />
            </>
          ) : (
            <DialogPackedContent
              packId={chosenPack}
              handleFullCreator={handleFullCreator}
              handleQuickCreate={handleQuickCreate}
            />
          )}
        </DialogContent>
      </Dialog>

      <QuickCreateDialog
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCharacterCreated={handleQuickCreateComplete}
      />
    </>
  );
}

/**
 * The mode picker (Full Creator vs Quick Create) for a chosen
 * game pack. Today only the dnd5e pack reaches this screen, so the
 * copy still references D&D — when other packs ship, gate the
 * Quick Create card on whether the pack supports it and swap the
 * mode-card descriptions per-pack.
 */
function DialogPackedContent({ packId, handleFullCreator, handleQuickCreate }) {
  const pack = getGamePack(packId);
  const headline = pack ? `Create Your ${pack.short} Character` : "Create Your Character";
  const subhead = pack
    ? `Choose how you'd like to build your ${pack.short} character`
    : "Choose how you'd like to build your D&D character";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-3xl text-center mb-2">{headline}</DialogTitle>
        <p className="text-gray-400 text-center">{subhead}</p>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-6 mt-6">
            <div
              onClick={handleFullCreator}
              className="bg-[#1E2430] rounded-xl p-6 border-2 border-gray-600 hover:border-[#37F2D1] cursor-pointer transition-all group"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#37F2D1]/20 rounded-full flex items-center justify-center group-hover:bg-[#37F2D1]/30 transition-all">
                  <Wand2 className="w-8 h-8 text-[#37F2D1]" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Full Character Creator</h3>
              <p className="text-sm text-gray-400 text-center mb-4">
                Complete step-by-step builder with all D&D 5e options
              </p>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Choose race & class</li>
                <li>• Customize ability scores</li>
                <li>• Select skills & proficiencies</li>
                <li>• Pick equipment & spells</li>
              </ul>
            </div>

            <div
              onClick={handleQuickCreate}
              title="Coming in 1.0 — use Full Character Creator for now"
              className="bg-[#1E2430]/40 rounded-xl p-6 border-2 border-dashed border-slate-700 cursor-not-allowed opacity-70 transition-all group"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-slate-500/15 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-slate-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2 text-slate-300">Quick Create</h3>
              <p className="text-sm text-gray-400 text-center mb-4">
                Jump right in with pre-configured character templates
              </p>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Quick pick options</li>
                <li>• AI-generated characters</li>
                <li>• Recommended defaults</li>
                <li>• Start playing faster</li>
              </ul>
              <div className="mt-4 inline-flex items-center justify-center w-full text-xs font-black uppercase tracking-widest text-slate-400">
                Coming in 1.0
              </div>
            </div>
          </div>
    </>
  );
}
