import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSpeciesList,
  getSubspeciesForSpecies,
  getSubspecies,
} from "@/data/games/dnd5e_2024/species";
import { getSpeciesIcon } from "@/data/games/dnd5e_2024/assets";
import { speciesCopy, subspeciesCopy } from "@/data/games/dnd5e_2024/copy";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";

/**
 * 2024 D&D 5e — species step.
 *
 * Mirrors the 2014 RaceStep visual layout: left column carries the
 * character-name input, level select, and a 2024-flavored
 * "Background context" banner; right column is the species carousel
 * with prev/next chevrons, icon, name header, subspecies (lineage)
 * select, trait list with hover-to-expand descriptions, and species
 * description + lineage description boxes.
 *
 * 2024 rule shift surfaced in the UI: species DOES NOT grant ability
 * score bonuses — those come from the background, picked in the
 * Abilities step. The banner on the left calls this out so players
 * don't expect ASI choices here.
 *
 * Persistence:
 *   characterData.species   = { speciesId, subspeciesId? }
 *   characterData.race      = species.name (legacy field for review)
 *   characterData.subrace   = subspecies.name (legacy)
 */

export default function SpeciesStep2024({ characterData, updateCharacterData }) {
  const speciesList = getSpeciesList();
  const [selectedSpeciesIndex, setSelectedSpeciesIndex] = useState(() => {
    const id = characterData.species?.speciesId;
    if (!id) return 0;
    const idx = speciesList.findIndex((s) => s.index === id);
    return idx >= 0 ? idx : 0;
  });
  const [hoveredTrait, setHoveredTrait] = useState(null);

  const currentSpecies = speciesList[selectedSpeciesIndex];
  const subspeciesOptions = useMemo(
    () => getSubspeciesForSpecies(currentSpecies?.index),
    [currentSpecies],
  );
  const selectedSubspeciesId = characterData.species?.subspeciesId
    || subspeciesOptions[0]?.index
    || null;
  const selectedSubspecies = selectedSubspeciesId
    ? getSubspecies(selectedSubspeciesId)
    : null;

  const handleSpeciesChange = (delta) => {
    const next = (selectedSpeciesIndex + delta + speciesList.length) % speciesList.length;
    setSelectedSpeciesIndex(next);
    const sp = speciesList[next];
    const firstSub = getSubspeciesForSpecies(sp.index)[0]?.index || null;
    updateCharacterData({
      species: { speciesId: sp.index, subspeciesId: firstSub },
      race: sp.name,
      subrace: firstSub ? getSubspecies(firstSub)?.name || "" : "",
      _racialAbilityBonuses: null,
    });
  };

  const handleSubspeciesSelect = (subspeciesId) => {
    const sub = getSubspecies(subspeciesId);
    updateCharacterData({
      species: { speciesId: currentSpecies.index, subspeciesId },
      subrace: sub?.name || "",
    });
  };

  const speciesPlaque = speciesCopy(currentSpecies?.name);
  const subspeciesPlaque = selectedSubspeciesId ? subspeciesCopy(selectedSubspeciesId) : "";

  // Auto-write the displayed species on mount so the race-step
  // validator (which checks characterData.species?.speciesId)
  // accepts the initial state. Mirrors the 2014 RaceStep effect.
  React.useEffect(() => {
    if (!characterData.species?.speciesId) {
      const firstSub = subspeciesOptions[0]?.index || null;
      updateCharacterData({
        species: { speciesId: currentSpecies.index, subspeciesId: firstSub },
        race: currentSpecies.name,
        subrace: firstSub ? getSubspecies(firstSub)?.name || "" : "",
        _racialAbilityBonuses: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-[1fr_1.2fr] gap-6"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide flex items-center gap-2">
            Character Name
            <span className="inline-block bg-[#37F2D1] text-[#1E2430] text-[9px] font-black px-1.5 py-0.5 rounded">
              2024
            </span>
          </Label>
          <Input
            value={characterData.name || ""}
            onChange={(e) => updateCharacterData({ name: e.target.value })}
            placeholder="Enter character name"
            className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white text-lg h-12 placeholder:text-white/30 focus:border-[#37F2D1]"
          />
        </div>

        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
            Level
          </Label>
          <Select
            value={(characterData.level || 1).toString()}
            onValueChange={(value) => updateCharacterData({ level: parseInt(value, 10) })}
          >
            <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-12 hover:border-[#37F2D1]/60 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#2A3441]">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
                <SelectItem
                  key={level}
                  value={level.toString()}
                  className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                >
                  Level {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide flex items-center gap-2">
            Background
            <InfoTip>{tipFor("background")}</InfoTip>
          </Label>
          <div className="bg-[#2A3441]/50 rounded-lg p-3 border border-[#37F2D1]/20">
            <p className="text-sm text-white/80 leading-relaxed">
              In 2024, your background grants ability score bonuses, two skills,
              a tool proficiency, and an Origin Feat. You'll choose it on the
              next step (Abilities & Background) — species no longer grants ASI.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSpecies.index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]"
        >
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => handleSpeciesChange(-1)}
              className="text-[#FF5722] hover:text-[#FF6B3D] transition-colors bg-[#2A3441]/50 rounded-lg p-2 hover:bg-[#2A3441]"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              {getSpeciesIcon(currentSpecies.name) ? (
                <img
                  src={getSpeciesIcon(currentSpecies.name)}
                  alt={currentSpecies.name}
                  className="w-12 h-12"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#37F2D1]/30 to-[#8B5CF6]/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#37F2D1]" />
                </div>
              )}
              <div className="flex flex-col items-start">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {currentSpecies.name}
                  <InfoTip>{tipFor("race")}</InfoTip>
                </h2>
                <p className="text-xs text-white/50">
                  {currentSpecies.type} • {currentSpecies.size} • Speed {currentSpecies.speed} ft
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSpeciesChange(1)}
              className="text-[#FF5722] hover:text-[#FF6B3D] transition-colors bg-[#2A3441]/50 rounded-lg p-2 hover:bg-[#2A3441]"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {subspeciesOptions.length > 0 && (
            <div className="mb-4">
              <Label className="text-white/70 mb-2 block text-sm uppercase tracking-wide">
                Lineage
              </Label>
              <Select
                value={selectedSubspeciesId || subspeciesOptions[0].index}
                onValueChange={handleSubspeciesSelect}
              >
                <SelectTrigger className="bg-[#2A3441]/80 border-[#37F2D1]/20 text-white h-12 hover:border-[#37F2D1]/60 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1E2430] border-[#2A3441]">
                  {subspeciesOptions.map((sub) => (
                    <SelectItem
                      key={sub.index}
                      value={sub.index}
                      className="text-white hover:bg-[#2A3441] focus:bg-[#2A3441]"
                    >
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 mb-4">
            {currentSpecies.traits.map((trait, idx) => (
              <motion.div
                key={trait.index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="relative bg-[#2A3441]/50 border border-[#FF5722]/30 rounded-lg p-3 cursor-pointer transition-all hover:border-[#FF5722]/60 hover:bg-[#2A3441]/70"
                onMouseEnter={() => setHoveredTrait(idx)}
                onMouseLeave={() => setHoveredTrait(null)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF5722]" />
                  <span className="font-semibold text-white text-sm">{trait.name}</span>
                </div>
                <AnimatePresence>
                  {hoveredTrait === idx && trait.description && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 pt-2 border-t border-[#FF5722]/20"
                    >
                      <p className="text-xs text-white/70 leading-relaxed">
                        {trait.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="bg-[#2A3441]/50 rounded-lg p-4 mb-3 border border-[#37F2D1]/20">
            <h4 className="text-[#37F2D1] font-semibold mb-2 text-sm">Species Description</h4>
            <p className="text-white/70 leading-relaxed text-xs">
              {speciesPlaque.description}
            </p>
          </div>

          {selectedSubspecies && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2A3441]/50 rounded-lg p-4 border border-[#5B4B9E]/20 mb-3"
            >
              <h4 className="text-[#5B4B9E] font-semibold mb-2 text-sm">
                {selectedSubspecies.name}
              </h4>
              {subspeciesPlaque && (
                <p className="text-white/70 leading-relaxed text-xs mb-2">
                  {subspeciesPlaque}
                </p>
              )}
              {Array.isArray(selectedSubspecies.traits) && selectedSubspecies.traits.length > 0 && (
                <div className="space-y-1 mt-2">
                  {selectedSubspecies.traits.map((t) => (
                    <div key={t.index} className="bg-[#1E2430]/60 rounded p-2 text-xs">
                      <p className="font-semibold text-[#FFC6AA] flex items-center gap-2">
                        {t.name}
                        {t.level > 1 && (
                          <Badge className="bg-[#1E2430] text-white/60 text-[9px] border border-white/10">
                            L{t.level}
                          </Badge>
                        )}
                      </p>
                      {t.description && (
                        <p className="text-white/70 mt-1 leading-relaxed">
                          {t.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
