import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, Sparkles, Sword, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import { getGamePack } from "@/data/games";

/**
 * 2024 D&D 5e — class step.
 *
 * Card-grid picker. Players click a class card to select; the card
 * lights up in selected state, the right-hand detail panel shows the
 * class's hit die, saves, primary ability, skill choice count, and
 * subclass-decision level, and the Next button enables.
 *
 * Persistence:
 *   characterData.class            = class name (string, e.g. "Wizard")
 *   characterData._gamePackClassId = SRD index (e.g. "wizard")
 *   characterData.features         = [] (seeded for the features step)
 *
 * The card layout mirrors SpeciesStep2024's grid pattern. The
 * previous version used a Radix Select dropdown which surfaced a
 * production blocker — the dropdown either failed to open or its
 * value updates didn't propagate consistently. A clickable card is
 * simpler React state, no Radix shadow trees to debug, and gives
 * the player a glanceable comparison of all 12 classes at once.
 */

// 2024 subclass-decision level per class. Source: PHB 2024.
const SUBCLASS_DECISION_LEVEL = {
  cleric: 3, sorcerer: 3, warlock: 3, druid: 3, wizard: 3, bard: 3,
  fighter: 3, rogue: 3, monk: 3, paladin: 3, ranger: 3, barbarian: 3,
};

const ALIGNMENTS = [
  { name: "Lawful Good",    description: "Honour, compassion, and order." },
  { name: "Neutral Good",   description: "Does good because it's right." },
  { name: "Chaotic Good",   description: "Values freedom and kindness above rules." },
  { name: "Lawful Neutral", description: "Values order and tradition." },
  { name: "True Neutral",   description: "Balanced; acts based on situation." },
  { name: "Chaotic Neutral",description: "Values personal freedom; unpredictable." },
  { name: "Lawful Evil",    description: "Uses systems to gain power and hurt others." },
  { name: "Neutral Evil",   description: "Purely selfish, no loyalty." },
  { name: "Chaotic Evil",   description: "Cruel, unpredictable, destructive." },
];

export default function ClassStep2024({ characterData, updateCharacterData }) {
  const adapter = getGamePack("dnd5e_2024");
  const classes = adapter.getClasses();

  const selectedClass = classes.find((c) => c.name === characterData.class) || null;
  const selectedAlignment = ALIGNMENTS.find((a) => a.name === characterData.alignment);

  const [uploading, setUploading] = useState(false);

  const handleClassSelect = (className) => {
    const cls = classes.find((c) => c.name === className);
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
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441] mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-white/70 text-sm uppercase tracking-wide">
            Class
          </Label>
          <span className="inline-block bg-[#37F2D1] text-[#1E2430] text-[9px] font-black px-1.5 py-0.5 rounded">
            2024
          </span>
          <InfoTip>{tipFor("class")}</InfoTip>
        </div>
        <p className="text-white/60 text-sm">
          Pick a class to define your character's combat role and core
          abilities. Click a card to select.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {classes.map((cls) => {
          const isSelected = characterData.class === cls.name;
          return (
            <button
              key={cls.id}
              type="button"
              onClick={() => handleClassSelect(cls.name)}
              data-testid={`class-card-${cls.id}`}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? "bg-[#2A3441] border-[#37F2D1] shadow-lg shadow-[#37F2D1]/20"
                  : "bg-[#2A3441]/50 border-[#1E2430] hover:border-[#37F2D1]/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{cls.name}</h3>
                {isSelected && <Check className="w-4 h-4 text-[#37F2D1]" />}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/60">
                <span>d{cls.hitDie}</span>
                <span>•</span>
                <span>{cls.primaryAbility || "—"}</span>
                {cls.hasWeaponMastery && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#37F2D1]">
                      <Sword className="w-3 h-3" /> Mastery
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedClass && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#37F2D1]/40 mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#37F2D1]/30 to-[#8B5CF6]/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-[#37F2D1]" />
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between bg-[#2A3441]/50 rounded px-3 py-2">
              <span className="text-white/60">Primary Ability:</span>
              <span className="text-[#37F2D1] font-semibold">
                {selectedClass.primaryAbility || "—"}
              </span>
            </div>
            <div className="flex justify-between bg-[#2A3441]/50 rounded px-3 py-2">
              <span className="text-white/60">Saving Throws:</span>
              <span className="text-white">
                {(selectedClass.savingThrows || []).join(", ")}
              </span>
            </div>
            <div className="flex justify-between bg-[#2A3441]/50 rounded px-3 py-2">
              <span className="text-white/60">Skills:</span>
              <span className="text-white">
                Choose {selectedClass.skillChoiceCount} of{" "}
                {selectedClass.skillChoices.length}
              </span>
            </div>
            <div className="flex justify-between bg-[#2A3441]/50 rounded px-3 py-2">
              <span className="text-white/60">Subclass at level:</span>
              <span className="text-white">
                {SUBCLASS_DECISION_LEVEL[selectedClass.id] ?? 3}
              </span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
            Alignment
          </Label>
          <Select
            value={characterData.alignment || "True Neutral"}
            onValueChange={(value) => updateCharacterData({ alignment: value })}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/30 text-white h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {ALIGNMENTS.map((a) => (
                <SelectItem
                  key={a.name}
                  value={a.name}
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAlignment && (
            <div className="bg-[#2A3441]/50 rounded-lg p-3 mt-3 border border-[#37F2D1]/20">
              <p className="text-sm text-white/80">{selectedAlignment.description}</p>
            </div>
          )}
        </div>

        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
            Portrait
          </Label>
          {characterData.avatar_url ? (
            <div className="relative h-32 rounded-lg overflow-hidden bg-[#2A3441] mb-3">
              <img
                src={characterData.avatar_url}
                alt="Character portrait"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-32 rounded-lg bg-[#2A3441] flex items-center justify-center mb-3">
              <User className="w-12 h-12 text-white/30" />
            </div>
          )}
          <label className="flex items-center justify-center gap-2 px-4 py-2 bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-lg text-[#37F2D1] cursor-pointer hover:bg-[#37F2D1]/20 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">
              {uploading ? "Uploading…" : "Upload"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
            Name
          </Label>
          <Input
            value={characterData.name || ""}
            onChange={(e) => updateCharacterData({ name: e.target.value })}
            placeholder="Name your character"
            className="bg-[#2A3441]/80 border-[#37F2D1]/30 text-white h-10 mb-3"
          />
          <Label className="text-white/70 mb-2 block text-xs uppercase tracking-wide">
            Description
          </Label>
          <Textarea
            value={characterData.description || ""}
            onChange={(e) => updateCharacterData({ description: e.target.value })}
            placeholder="Backstory, personality, motivations…"
            className="bg-[#2A3441]/80 border-[#37F2D1]/30 text-white text-sm min-h-[80px]"
          />
        </div>
      </div>
    </motion.div>
  );
}
