import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  getClassBasics,
  hasPerLevelFeatures,
} from "@/data/games/dnd5e_2024/classFeatures";
import {
  getSubclassesForClass,
  getSubclassFeaturesAtLevel,
} from "@/data/games/dnd5e_2024/subclassFeatures";
import SubclassPicker from "@/components/characterCreator/SubclassPicker";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";

/**
 * 2024 D&D 5e — class features step.
 *
 * Edition-specific. Reads exclusively from the dnd5e_2024 SRD
 * adapters. Routed by the dispatcher in CharacterCreator.jsx when
 * characterData.gamePack === 'dnd5e_2024'.
 *
 * What renders here:
 *   - Class basics card (hit die, primary ability, saving throws,
 *     proficiencies) sourced from 2024 SRD Classes.json
 *   - Subclass picker at level >= 3 listing SRD subclasses for the
 *     chosen class (12 total in SRD, 1 per class)
 *   - Subclass features (inline in 2024 SRD Subclasses.json) for
 *     the chosen subclass, cumulative up to the character level
 *
 * What does NOT render (SRD gap, prominently banner-explained):
 *   - Per-level class features. The 2024 SRD's `class_levels`
 *     field is a URL stub, not inline data, and PHB 2024 is not
 *     OGL-covered. Until WotC expands the SRD or a licensed
 *     third-party drop lands, these features are not rendered.
 *     Players should refer to PHB 2024 directly.
 *
 * Multiclass UI for 2024 also not shipped here — separate scope.
 */

export default function ClassFeaturesStep2024({ characterData, updateCharacterData }) {
  const className = characterData.class || "";
  const level = characterData.level || 1;
  const basics = className ? getClassBasics(className) : null;
  const showsPerLevel = basics ? hasPerLevelFeatures(basics.index) : false;

  const subclassChoices = basics
    ? getSubclassesForClass(basics.index).map((s) => ({
        name: s.name,
        description: s.summary || s.description || "",
      }))
    : [];

  const chosenSubclass = characterData.subclass || null;
  const subclassFeatures = chosenSubclass
    ? getSubclassFeaturesAtLevel(chosenSubclass, level)
    : [];

  if (!className) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-[#2A3441] rounded-xl border-2 border-[#1E2430]">
        <p className="text-white">Pick a class on the previous step before viewing features.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header + per-level gap banner */}
      <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-3">
          Class Features (PHB 2024)
        </h2>
        <p className="text-white text-sm leading-7">
          Class basics (hit die, proficiencies, saving throws) and{" "}
          <span className="font-semibold">subclass features at level 3+</span>{" "}
          are sourced from the 2024 SRD and render below.
        </p>
        <div className="mt-4 p-4 bg-[#FF5722]/10 rounded-lg border border-[#FF5722]/40 text-sm text-white/90">
          <p className="font-semibold text-[#FF5722] mb-1">
            ⚠️ Per-level class features not available
          </p>
          <p>
            The 2024 SRD does not include per-level class progression.
            Refer to your PHB 2024 for the full feature list as you
            level up. We'll surface them automatically once Wizards
            expands the SRD.
          </p>
        </div>
      </div>

      {/* Class basics card */}
      {basics && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="bg-[#2A3441] border-2 border-[#37F2D1] rounded-lg px-4 py-2">
              <span className="text-[#37F2D1] font-bold text-lg">{basics.name}</span>
              <span className="text-white ml-2">Level {level}</span>
              <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] ml-2 font-black">
                2024
              </Badge>
            </div>
          </div>

          <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430] space-y-4">
            <div>
              <h4 className="text-lg font-bold text-[#FFC6AA] mb-2">
                Class basics
                <InfoTip>{tipFor("class")}</InfoTip>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between bg-[#1E2430]/40 rounded px-3 py-2">
                  <span className="text-white/60">Hit Die:</span>
                  <span className="text-white">d{basics.hit_die}</span>
                </div>
                <div className="flex justify-between bg-[#1E2430]/40 rounded px-3 py-2">
                  <span className="text-white/60">Primary Ability:</span>
                  <span className="text-white">
                    {basics.primary_ability?.desc || "—"}
                  </span>
                </div>
                <div className="flex justify-between bg-[#1E2430]/40 rounded px-3 py-2 md:col-span-2">
                  <span className="text-white/60">Saving Throws:</span>
                  <span className="text-white">
                    {(basics.saving_throws || [])
                      .map((s) => s.name)
                      .join(", ") || "—"}
                  </span>
                </div>
                <div className="md:col-span-2 bg-[#1E2430]/40 rounded px-3 py-2">
                  <p className="text-white/60 text-xs mb-1">Proficiencies</p>
                  <p className="text-white">
                    {(basics.proficiencies || [])
                      .map((p) => p.name)
                      .join(" • ") || "—"}
                  </p>
                </div>
                {basics.multi_classing?.prerequisites?.length > 0 && (
                  <div className="md:col-span-2 bg-[#1E2430]/40 rounded px-3 py-2">
                    <p className="text-white/60 text-xs mb-1">Multiclass prerequisites</p>
                    <p className="text-white">
                      {basics.multi_classing.prerequisites
                        .map(
                          (p) =>
                            `${p.ability_score?.name || "?"} ${p.minimum_score}+`,
                        )
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subclass picker — gated on level >= 3 (2024 unified subclass level) */}
      {basics && level >= 3 && subclassChoices.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#FFC6AA] mb-3">
            Subclass — choose at Level 3
          </h3>
          <SubclassPicker
            choices={subclassChoices}
            value={chosenSubclass}
            onSelect={(value) => updateCharacterData({ subclass: value })}
            featureName={`${basics.name} Subclass`}
            levelGained={3}
          />
          {subclassChoices.length < 4 && (
            <p className="text-xs text-white/50 mt-3 italic">
              Showing {subclassChoices.length} of 4 PHB 2024 subclasses for{" "}
              {basics.name}. The remaining subclasses are PHB-only and will
              appear once Wizards expands the SRD.
            </p>
          )}
        </div>
      )}

      {basics && level < 3 && (
        <div className="mb-8 p-4 bg-[#2A3441] rounded-xl border-2 border-[#1E2430] text-sm text-white/70">
          Subclass selection unlocks at <span className="font-bold text-white">Level 3</span> in PHB 2024.
        </div>
      )}

      {/* Subclass features — inline in 2024 SRD, render normally */}
      {chosenSubclass && subclassFeatures.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="bg-[#2A3441] border-2 border-[#5B4B9E] rounded-lg px-4 py-2">
              <span className="text-[#5B4B9E] font-bold text-lg">{chosenSubclass}</span>
              <span className="text-white ml-2">Subclass</span>
              <Badge className="bg-[#5B4B9E] text-white text-[10px] ml-2 font-black">
                2024
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {subclassFeatures.map((feature, idx) => (
              <div
                key={`${feature.level}-${feature.name}-${idx}`}
                className="p-6 rounded-xl border-2 transition-all bg-[#2A3441] border-[#1E2430]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-lg font-bold text-[#FFC6AA]">{feature.name}</h4>
                    <Badge className="bg-[#1E2430] text-white border border-white/20 text-xs">
                      Gained at Level {feature.level}
                    </Badge>
                  </div>
                </div>
                <p className="text-white text-sm leading-7 whitespace-pre-line">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suppression tip when level >= 3 but no subclass picked yet */}
      {basics && level >= 3 && !chosenSubclass && (
        <div className="bg-[#FF5722]/10 border-2 border-[#FF5722]/40 rounded-lg p-4 text-sm text-[#FF5722]">
          ⚠️ Choose a subclass above to see its features.
        </div>
      )}
    </div>
  );
}
