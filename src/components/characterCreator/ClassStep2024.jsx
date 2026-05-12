import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, Sparkles, Sword } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import { getGamePack } from "@/data/games";
import { getClassIcon } from "@/data/games/dnd5e_2024/assets";
import { classCopy, ALIGNMENTS } from "@/data/games/dnd5e_2024/copy";

/**
 * 2024 D&D 5e — class step.
 *
 * Mirrors the 2014 ClassStep visual layout (2-column grid: class +
 * detail card on the left, alignment + portrait + name on the
 * right). Data wiring stays on the 2024 adapter — class list comes
 * from `getGamePack("dnd5e_2024").getClasses()` (SRD-sourced) and
 * descriptive copy comes from `classCopy(name)` which carries
 * 2024-edition flavor text for every class.
 */

export default function ClassStep2024({ characterData, updateCharacterData }) {
  const adapter = getGamePack("dnd5e_2024");
  const classes = adapter.getClasses();

  const selectedClass = classes.find((c) => c.name === characterData.class) || null;
  const selectedAlignment = ALIGNMENTS.find((a) => a.name === characterData.alignment);
  const selectedCopy = selectedClass ? classCopy(selectedClass.name) : null;

  const [uploading, setUploading] = useState(false);

  const handleClassSelect = (value) => {
    const cls = classes.find((c) => c.name === value);
    if (!cls) return;
    updateCharacterData({
      class: cls.name,
      features: [],
      _gamePackClassId: cls.id,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateCharacterData({ avatar_url: file_url });
      toast.success("Portrait uploaded!");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 gap-6"
    >
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide flex items-center gap-2">
            Class
            <span className="inline-block bg-[#37F2D1] text-[#1E2430] text-[9px] font-black px-1.5 py-0.5 rounded">
              2024
            </span>
            <InfoTip>{tipFor("class")}</InfoTip>
          </Label>
          <Select
            value={characterData.class || ""}
            onValueChange={handleClassSelect}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/30 text-white text-base h-12 hover:border-[#37F2D1]/60 transition-colors">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {classes.map((cls) => (
                <SelectItem
                  key={cls.id}
                  value={cls.name}
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  <span className="inline-flex items-center gap-2">
                    {cls.name}
                    {cls.hasWeaponMastery && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1 py-0.5">
                        <Sword className="w-2.5 h-2.5" /> Mastery
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {selectedClass && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
          >
            <div className="flex items-center gap-4 mb-4">
              {getClassIcon(selectedClass.name) ? (
                <img
                  src={getClassIcon(selectedClass.name)}
                  alt={selectedClass.name}
                  className="w-20 h-20 object-contain"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#37F2D1]/30 to-[#8B5CF6]/30 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#37F2D1]" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-2xl font-bold text-white">{selectedClass.name}</h3>
                  {selectedClass.hasWeaponMastery && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1.5 py-0.5">
                      <Sword className="w-3 h-3" /> Weapon Mastery
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-1">Hit Die: d{selectedClass.hitDie}</p>
              </div>
            </div>

            <p className="text-white/80 mb-4 text-sm leading-relaxed">
              {selectedCopy.description}
            </p>

            <div className="bg-[#37F2D1]/10 rounded-lg p-4 mb-4 border border-[#37F2D1]/20">
              <p className="text-xs font-semibold text-[#37F2D1] mb-2">💡 PLAYSTYLE TIP</p>
              <p className="text-sm text-white/80">{selectedCopy.playstyle}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Primary Ability:</span>
                <span className="text-[#37F2D1] font-semibold">
                  {selectedClass.primaryAbility || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Saving Throws:</span>
                <span className="text-white">
                  {(selectedClass.savingThrows || []).join(", ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Skills:</span>
                <span className="text-white">
                  Choose {selectedClass.skillChoiceCount} of{" "}
                  {selectedClass.skillChoices.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Subclass at level:</span>
                <span className="text-white">3</span>
              </div>
            </div>

            {(selectedClass.multiclass?.prerequisites?.length ?? 0) > 0 && (
              <div className="bg-[#37F2D1]/10 rounded-lg p-3 mt-4 border border-[#37F2D1]/20 text-xs">
                <p className="font-semibold text-[#37F2D1] mb-1 uppercase tracking-wide">
                  Multiclass prerequisites
                </p>
                <ul className="space-y-0.5 text-white/80">
                  {selectedClass.multiclass.prerequisites.map((p) => (
                    <li key={p.ability}>
                      {p.abilityName} {p.minimumScore}+
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
            Alignment
          </Label>
          <Select
            value={characterData.alignment || "True Neutral"}
            onValueChange={(value) => updateCharacterData({ alignment: value })}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/30 text-white h-12 hover:border-[#37F2D1]/60 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {ALIGNMENTS.map((align) => (
                <SelectItem
                  key={align.name}
                  value={align.name}
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  {align.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAlignment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-[#2A3441]/50 rounded-lg p-3 mt-3 border border-[#37F2D1]/20"
            >
              <p className="text-sm text-white/80">{selectedAlignment.description}</p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-4 block text-sm uppercase tracking-wide">
            Physical Details
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-white/50 text-xs mb-1 block">Age</Label>
              <Input
                type="number"
                value={characterData.appearance?.age || ""}
                onChange={(e) => updateCharacterData({
                  appearance: { ...characterData.appearance, age: parseInt(e.target.value) },
                })}
                placeholder="25"
                className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-10 focus:border-[#37F2D1]"
              />
            </div>
            <div>
              <Label className="text-white/50 text-xs mb-1 block">Height</Label>
              <Input
                value={characterData.appearance?.height || ""}
                onChange={(e) => updateCharacterData({
                  appearance: { ...characterData.appearance, height: e.target.value },
                })}
                placeholder="5'10&quot;"
                className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-10 focus:border-[#37F2D1]"
              />
            </div>
            <div>
              <Label className="text-white/50 text-xs mb-1 block">Weight</Label>
              <Input
                value={characterData.appearance?.weight || ""}
                onChange={(e) => updateCharacterData({
                  appearance: { ...characterData.appearance, weight: e.target.value },
                })}
                placeholder="180 lbs"
                className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-10 focus:border-[#37F2D1]"
              />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-3 block text-sm uppercase tracking-wide">
            Character Portrait
          </Label>
          <div
            className="relative overflow-hidden rounded-xl bg-[#2A3441]/50 mx-auto border border-[#37F2D1]/20"
            style={{ aspectRatio: "2/3", width: "100%" }}
          >
            {characterData.avatar_url ? (
              <img
                src={characterData.avatar_url}
                alt="Character"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <User className="w-20 h-20 text-white/20 mb-3" />
                <p className="text-white/40 text-center px-4 text-sm">Upload character portrait</p>
              </div>
            )}
          </div>
          <Button
            onClick={() => document.getElementById("avatar-upload-2024").click()}
            disabled={uploading}
            className="w-full mt-3 bg-[#FF5722]/90 hover:bg-[#FF5722] text-white border-0"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Portrait"}
          </Button>
          <input
            type="file"
            id="avatar-upload-2024"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
            Character Name
          </Label>
          <Input
            value={characterData.name || ""}
            onChange={(e) => updateCharacterData({ name: e.target.value })}
            placeholder="Enter character name"
            className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white text-lg h-12 placeholder:text-white/30 focus:border-[#37F2D1]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
            Description
          </Label>
          <Textarea
            value={characterData.description || ""}
            onChange={(e) => updateCharacterData({ description: e.target.value })}
            placeholder="Tell us about your character's backstory, personality, and motivations..."
            className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white min-h-[120px] focus:border-[#37F2D1]"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
