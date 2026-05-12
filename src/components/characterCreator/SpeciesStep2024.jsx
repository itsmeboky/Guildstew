import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  getSpeciesList,
  getSpeciesById,
  getSubspeciesForSpecies,
  getSubspecies,
} from "@/data/games/dnd5e_2024/species";
import { getSpeciesIcon } from "@/data/games/dnd5e_2024/assets";
import InfoTip from "@/components/characterCreator/InfoTip";

/**
 * 2024 D&D 5e — species selection step.
 *
 * Edition-specific. Reads exclusively from the dnd5e_2024 species
 * adapter (SRD 5.2 via 5e-bits JSON). Routed by the dispatcher in
 * CharacterCreator.jsx when characterData.gamePack === 'dnd5e_2024'.
 *
 * Key 2024 rule shift from 2014: species does NOT grant ability
 * score increases. Those come from the chosen background and are
 * picked in AbilitiesStep2024 (Build Commit 3). This step therefore
 * never mutates `characterData.attributes` — only writes the
 * species + subspecies selection.
 *
 * Persistence:
 *   characterData.species = { speciesId, subspeciesId? }
 *
 * Existing characterData.race is left untouched for back-compat
 * (review steps read it); a future cleanup can unify the two
 * fields after the 2024 pack is fully shipped.
 */
export default function SpeciesStep2024({ characterData, updateCharacterData }) {
  const speciesList = getSpeciesList();
  const selectedSpeciesId = characterData.species?.speciesId || null;
  const selectedSubspeciesId = characterData.species?.subspeciesId || null;

  const selectedSpecies = selectedSpeciesId ? getSpeciesById(selectedSpeciesId) : null;
  const subspeciesOptions = selectedSpeciesId
    ? getSubspeciesForSpecies(selectedSpeciesId)
    : [];
  const selectedSubspecies = selectedSubspeciesId
    ? getSubspecies(selectedSubspeciesId)
    : null;

  const handleSpeciesSelect = (speciesId) => {
    const species = getSpeciesById(speciesId);
    if (!species) return;
    // Reset subspecies when species changes.
    updateCharacterData({
      species: { speciesId },
      // Mirror to legacy `race` field so review / sheet code that
      // hasn't been migrated yet still reads the species name.
      race: species.name,
      // 2024: species grants no ASI. Defensive: clear any racial
      // bonuses the 2014 step might have stamped if the player
      // switched edition mid-create.
      _racialAbilityBonuses: null,
    });
  };

  const handleSubspeciesSelect = (subspeciesId) => {
    if (!selectedSpeciesId) return;
    const subspecies = getSubspecies(subspeciesId);
    updateCharacterData({
      species: { speciesId: selectedSpeciesId, subspeciesId },
      subrace: subspecies?.name || "",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-[#2A3441]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-2 flex items-center gap-2">
          Species
          <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] font-black">
            2024
          </Badge>
          <InfoTip width="w-80">
            The 2024 edition renames "race" to "species" and moves ability
            score bonuses to the background. Your species sets size, speed,
            and innate traits — nothing more.
          </InfoTip>
        </h2>
        <p className="text-white/80 text-sm">
          Pick the species your character belongs to. In 2024, ability
          score increases come from your background, not your species.
        </p>

        <div className="mt-4">
          <label className="text-white/70 text-xs uppercase tracking-wide block mb-1">
            Character Name
          </label>
          <input
            type="text"
            value={characterData.name || ""}
            onChange={(e) => updateCharacterData({ name: e.target.value })}
            placeholder="Enter character name"
            className="w-full bg-[#1E2430] border-2 border-[#1E2430] focus:border-[#37F2D1] outline-none text-white px-3 py-2 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {speciesList.map((s) => {
          const isSelected = selectedSpeciesId === s.index;
          const hasSubspecies = Array.isArray(s.subspecies) && s.subspecies.length > 0;
          const iconUrl = getSpeciesIcon(s.name);
          return (
            <button
              key={s.index}
              type="button"
              onClick={() => handleSpeciesSelect(s.index)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? "bg-[#2A3441] border-[#37F2D1]"
                  : "bg-[#2A3441]/50 border-[#1E2430] hover:border-[#37F2D1]/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={s.name}
                    className="w-12 h-12 object-contain flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white truncate">{s.name}</h3>
                    {isSelected && <Sparkles className="w-4 h-4 text-[#37F2D1] flex-shrink-0" />}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-white/60 mt-1">
                    <span>{s.type}</span>
                    <span>•</span>
                    <span>{s.size}</span>
                    <span>•</span>
                    <span>{s.speed} ft</span>
                    {hasSubspecies && (
                      <>
                        <span>•</span>
                        <span>{s.subspecies.length} lineages</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {Array.isArray(s.traits) && s.traits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.traits.map((t) => (
                    <Badge
                      key={t.index}
                      className="bg-[#5B4B9E]/30 text-white text-[10px] border border-[#5B4B9E]/50"
                      title={t.description || undefined}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedSpecies && subspeciesOptions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#FFC6AA] mb-2">
            {selectedSpecies.name} Lineage
            <InfoTip>
              Pick the lineage / ancestry that fits your character. Each
              option grants different innate traits or spells.
            </InfoTip>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subspeciesOptions.map((sub) => {
              const isSelected = selectedSubspeciesId === sub.index;
              return (
                <button
                  key={sub.index}
                  type="button"
                  onClick={() => handleSubspeciesSelect(sub.index)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "bg-[#1E2430] border-[#5B4B9E]"
                      : "bg-[#2A3441]/50 border-[#1E2430] hover:border-[#5B4B9E]/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-semibold text-sm">{sub.name}</span>
                    {isSelected && <Sparkles className="w-4 h-4 text-[#5B4B9E]" />}
                  </div>
                  {Array.isArray(sub.traits) && sub.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sub.traits.map((t) => (
                        <Badge
                          key={t.index}
                          className="bg-[#1E2430] text-white/80 text-[10px] border border-white/10"
                        >
                          {t.name}
                          {t.level > 1 && (
                            <span className="ml-1 text-white/40">L{t.level}</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedSpecies && subspeciesOptions.length > 0 && !selectedSubspeciesId && (
        <div className="bg-[#FF5722]/10 border-2 border-[#FF5722]/40 rounded-lg p-3 text-sm text-[#FF5722]">
          ⚠️ Choose a {selectedSpecies.name} lineage to continue.
        </div>
      )}

      {selectedSpecies && (
        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441] mb-4">
          <div className="flex items-center gap-3 mb-4">
            {getSpeciesIcon(selectedSpecies.name) && (
              <img
                src={getSpeciesIcon(selectedSpecies.name)}
                alt={selectedSpecies.name}
                className="w-16 h-16 object-contain"
              />
            )}
            <div>
              <h3 className="text-xl font-bold text-[#37F2D1]">
                {selectedSpecies.name}
                {selectedSubspecies && (
                  <>
                    <span className="text-white/50 font-normal"> — </span>
                    <span className="text-[#5B4B9E]">{selectedSubspecies.name}</span>
                  </>
                )}
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                {selectedSpecies.type} • {selectedSpecies.size} • Speed {selectedSpecies.speed} ft
              </p>
            </div>
          </div>

          {Array.isArray(selectedSpecies.traits) && selectedSpecies.traits.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-white/50">Traits</p>
              {selectedSpecies.traits.map((t) => (
                <div key={t.index} className="bg-[#2A3441]/50 rounded p-3 text-sm">
                  <p className="font-semibold text-[#FFC6AA] mb-1">{t.name}</p>
                  {t.description && (
                    <p className="text-white/80 text-xs leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedSubspecies && Array.isArray(selectedSubspecies.traits)
            && selectedSubspecies.traits.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs uppercase tracking-wide text-[#5B4B9E]">
                {selectedSubspecies.name} traits
              </p>
              {selectedSubspecies.traits.map((t) => (
                <div key={t.index} className="bg-[#2A3441]/50 rounded p-3 text-sm">
                  <p className="font-semibold text-[#FFC6AA] mb-1">
                    {t.name}
                    {t.level > 1 && (
                      <span className="ml-2 text-[10px] text-white/40 font-normal">
                        Level {t.level}
                      </span>
                    )}
                  </p>
                  {t.description && (
                    <p className="text-white/80 text-xs leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-white/50 mt-4 italic">
            Ability score bonuses come from your background, not your species.
          </p>
        </div>
      )}
    </motion.div>
  );
}
