
import React, { useState } from "react";
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

export default function CreateCharacterDialog({ open, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

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
    onClose();
    setQuickCreateOpen(true);
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
          <DialogHeader>
            <DialogTitle className="text-3xl text-center mb-2">Create Your Character</DialogTitle>
            <p className="text-gray-400 text-center">Choose how you'd like to build your D&D character</p>
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
              className="bg-[#1E2430] rounded-xl p-6 border-2 border-gray-600 hover:border-[#FF5722] cursor-pointer transition-all group"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#FF5722]/20 rounded-full flex items-center justify-center group-hover:bg-[#FF5722]/30 transition-all">
                  <Zap className="w-8 h-8 text-[#FF5722]" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Quick Create</h3>
              <p className="text-sm text-gray-400 text-center mb-4">
                Jump right in with pre-configured character templates
              </p>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Quick pick options</li>
                <li>• AI-generated characters</li>
                <li>• Recommended defaults</li>
                <li>• Start playing faster</li>
              </ul>
            </div>
          </div>
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
