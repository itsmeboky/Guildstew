import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import {
  spellsByClass,
  recommendedSpells,
  spellDetails as hardcodedSpellDetails,
  effectDescriptions,
  getSpellSlots,
  getAllAvailableSpells,
  spellIcons,
  fetchAllSpells,
  getPactSlots,
  getMaxSpellLevelForCharacter
} from "@/components/dnd5e/spellData";
import { getBreweryClassSpellSlots } from "@/lib/breweryClassApply";
import {
  SPELLS_KNOWN_TABLE,
  spellsKnown,
  spellsPrepared,
  cantripsKnown,
  abilityModifier,
  SPELLCASTING_ABILITY,
} from "@/components/dnd5e/dnd5eRules";
import { getSpellsCompletion } from "@/components/characterCreator/spellsCompletion";

export default function SpellsStep({ characterData, updateCharacterData }) {
  const [hoveredEffect, setHoveredEffect] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);

  // Fetch all spells from API to support higher levels
  const { data: fullSpellsList, isLoading } = useQuery({
    queryKey: ['dnd5e-spells'],
    queryFn: () => fetchAllSpells().then(data => data.spells),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Brewery classes authored their own slot progression in the
  // mod's spellcasting.slot_progression block — when the selected
  // class is brewery-sourced, those slots win over the SRD lookup.
  const breweryClass = characterData._brewery_class || null;
  const spellSlots = breweryClass?.spellcasting?.enabled
    ? getBreweryClassSpellSlots(breweryClass, characterData.level)
    : getSpellSlots(characterData.class, characterData.level, characterData.multiclasses || []);
  const availableSpells = getAllAvailableSpells(characterData.class, characterData.multiclasses || [], fullSpellsList);

  const selectedSpells = characterData.spells || {};

  const pactSlots = getPactSlots(
    characterData.class,
    characterData.level,
    characterData.multiclasses || []
  );

  // Max spell level you’re allowed to learn/prepare based on each class’s own table
  const maxSpellLevel = getMaxSpellLevelForCharacter(
    characterData.class,
    characterData.level,
    characterData.multiclasses || []
  );

  // Per-spell-level SLOT count for display ("X casts/day"). Pact Magic
  // slots merge into the matching spell-level row for display only —
  // they used to drive the pick cap too, which conflated non-fungible
  // pools for multiclass Warlock + full-caster builds. The pick cap
  // is now driven by `prepKnownCap` / `cantripCap` below (PHB 2014
  // model: prepared/known is a single TOTAL count distributable
  // across eligible spell levels, while slots are casts/day).
  const getSlotsForLevelKey = (levelKey) => {
    let slots = spellSlots[levelKey] || 0;
    if (pactSlots && levelKey.startsWith("level")) {
      const numericLevel = parseInt(levelKey.replace("level", ""), 10);
      if (numericLevel === pactSlots.slotLevel) {
        slots += pactSlots.slots;
      }
    }
    return slots;
  };

  // Total prepared / known spell cap (excluding cantrips) summed
  // across every spellcasting class. PHB 2014 model: prepared casters
  // (Cleric/Druid/Paladin/Wizard) prepare ABILITY_MOD + class level
  // (or Paladin's CHA + floor(lvl/2)) spells from their list, and
  // known casters (Bard/Sorcerer/Warlock/Ranger) know a fixed table
  // value. Either way, the cap is a TOTAL count distributable across
  // any eligible spell level — NOT a per-spell-level slot cap (that's
  // casts/day, a separate axis).
  //
  // Brewery classes are skipped here (their slot progression is
  // author-defined and out of scope for the SRD-table cap).
  const totalSelectedNonCantrips = Object.entries(selectedSpells).reduce(
    (sum, [key, arr]) => (key === "cantrips" ? sum : sum + (Array.isArray(arr) ? arr.length : 0)),
    0,
  );
  const totalSelectedCantrips = Array.isArray(selectedSpells.cantrips)
    ? selectedSpells.cantrips.length
    : 0;

  const spellcastingEntries = (() => {
    const multis = Array.isArray(characterData.multiclasses)
      ? characterData.multiclasses.filter((mc) => mc?.class && mc?.level)
      : [];
    const primaryLevel = Math.max(
      1,
      (Number(characterData.level) || 1) - multis.reduce((s, m) => s + (Number(m.level) || 0), 0),
    );
    return [
      { class: characterData.class, level: primaryLevel },
      ...multis.map((m) => ({ class: m.class, level: Number(m.level) || 0 })),
    ].filter((e) => e.class && e.level > 0 && SPELLS_KNOWN_TABLE[e.class]);
  })();

  // Cap math is shared with the Next-button validator via
  // getSpellsCompletion() so the picker and gate can never disagree.
  // Wizards specifically: at character creation the cap is the
  // spellbook size (6 at L1, +2 per level), not the prepared formula
  // — preparation is a daily in-game decision, not a creator choice.
  const completion = getSpellsCompletion(characterData);
  const cantripCap = completion.cantripCap;
  const prepKnownCap = completion.nonCantripCap;

  // Helper to merge API spell details with hardcoded ones (for icons/effects)
  const getSpellDetail = (spellName) => {
    const hardcoded = hardcodedSpellDetails[spellName];
    const apiSpell = fullSpellsList?.find(s => s.name === spellName);
    
    if (apiSpell) {
      return {
        ...apiSpell,
        description: apiSpell.description || hardcoded?.description,
        effects: hardcoded?.effects || [],
        castingTime: apiSpell.castingTime || apiSpell.casting_time,
      };
    }
    return hardcoded || {
      level: "?",
      school: "Unknown",
      castingTime: "-",
      range: "-",
      components: "-",
      duration: "-",
      description: "No description available.",
      effects: []
    };
  };

  // Determine which class provides spellcasting
  const getSpellcastingClass = () => {
    const spellcastingClasses = ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard", "Warlock"];
    const halfCasters = ["Paladin", "Ranger"];
    
    // Check primary class first
    if (spellcastingClasses.includes(characterData.class)) {
      return { class: characterData.class, level: characterData.level };
    }
    
    if (halfCasters.includes(characterData.class) && characterData.level >= 2) {
      return { class: characterData.class, level: characterData.level };
    }
    
    // Check multiclasses
    for (const mc of (characterData.multiclasses || [])) {
      if (spellcastingClasses.includes(mc.class)) {
        return { class: mc.class, level: mc.level };
      }
      if (halfCasters.includes(mc.class) && mc.level >= 2) {
        return { class: mc.class, level: mc.level };
      }
    }
    
    return null;
  };

  const spellcastingClass = getSpellcastingClass();

  if (spellSlots.cantrips === 0 && spellSlots.level1 === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 bg-[#2A3441] rounded-xl p-8 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-4">No Spells Available</h2>
        <p className="text-white">
          {characterData.class} at level {characterData.level} doesn't have spellcasting yet.
        </p>
      </div>
    );
  }

  const useRecommended = () => {
    // Find the first class that has recommendations
    let recommended = null;
    let recommendedClass = null;
    
    // Check primary class
    if (recommendedSpells[characterData.class]) {
      recommended = recommendedSpells[characterData.class];
      recommendedClass = characterData.class;
    } else {
      // Check multiclasses
      for (const mc of (characterData.multiclasses || [])) {
        if (recommendedSpells[mc.class]) {
          recommended = recommendedSpells[mc.class];
          recommendedClass = mc.class;
          break;
        }
      }
    }
    
    if (recommended) {
      const newSpells = { ...selectedSpells };

      // Auto-select up to the per-class TOTAL prepared/known cap
      // (cantrips counted separately, against cantripCap). Walk
      // levels in ascending order so the first 1st-level spells
      // get auto-picked before higher levels eat the budget.
      let cantripBudget = cantripCap;
      let prepBudget = prepKnownCap;
      const orderedKeys = Object.keys(spellSlots).sort((a, b) => {
        if (a === "cantrips") return -1;
        if (b === "cantrips") return 1;
        const ai = parseInt(a.replace("level", ""), 10);
        const bi = parseInt(b.replace("level", ""), 10);
        return ai - bi;
      });
      orderedKeys.forEach((levelKey) => {
        if (!recommended[levelKey] || (spellSlots[levelKey] || 0) <= 0) return;
        const remaining = levelKey === "cantrips" ? cantripBudget : prepBudget;
        if (remaining <= 0) {
          newSpells[levelKey] = [];
          return;
        }
        const taken = recommended[levelKey].slice(0, remaining);
        newSpells[levelKey] = taken;
        if (levelKey === "cantrips") cantripBudget -= taken.length;
        else prepBudget -= taken.length;
      });

      updateCharacterData({ spells: newSpells });
      setShowRecommendation(recommendedClass);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#1E2430]">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-[#FFC6AA] mb-3 flex items-center gap-2">
              Spellcasting
              <InfoTip width="w-80">{tipFor("spell_prepared_vs_known")}</InfoTip>
            </h2>
            <div className="flex items-center gap-4 mb-3 text-xs text-white/70 flex-wrap">
              <span className="inline-flex items-center gap-1">
                Cantrips <InfoTip>{tipFor("spell_cantrip")}</InfoTip>
              </span>
              <span className="inline-flex items-center gap-1">
                Spell Slots <InfoTip>{tipFor("spell_slots")}</InfoTip>
              </span>
            </div>
            <p className="text-white mb-2">
              {spellcastingClass ? (
                <>
                  As a level {spellcastingClass.level} <span className="text-[#5B4B9E] font-bold">{spellcastingClass.class}</span>, you can prepare the following spells:
                </>
              ) : (
                <>As a level {characterData.level} {characterData.class}, you can prepare the following spells:</>
              )}
            </p>
            <div className="flex gap-4 text-sm flex-wrap">
              {/* Per-class TOTAL caps. PHB 2014: prepared/known is one
                  pool per class; per-spell-level slot counts are
                  casts/day, a separate axis. */}
              {(cantripCap > 0 || prepKnownCap > 0) && (
                <>
                  {cantripCap > 0 && (
                    <div className="text-[#37F2D1]">
                      <span className="font-bold">Cantrips:</span> {totalSelectedCantrips}/{cantripCap}
                    </div>
                  )}
                  {prepKnownCap > 0 && (
                    <div className="text-[#37F2D1]">
                      <span className="font-bold">Spells:</span> {totalSelectedNonCantrips}/{prepKnownCap}{" "}
                      <span className="text-white/50">prepared/known</span>
                    </div>
                  )}
                </>
              )}
              {/* Per-spell-level slot counts (casts/day) — separate
                  from the prepared/known total. Pact slots merge into
                  the matching row for display only. */}
              {Object.keys(spellSlots).map((levelKey) => {
                const slots = getSlotsForLevelKey(levelKey);
                if (slots <= 0 || levelKey === "cantrips") return null;
                const levelLabel = `Level ${levelKey.replace("level", "")}`;
                return (
                  <div key={levelKey} className="text-white/70">
                    <span className="font-semibold">{levelLabel}:</span> {slots}{" "}
                    <span className="text-white/40">casts/day</span>
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            onClick={useRecommended}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Use Recommended
          </Button>
        </div>
      </div>

      <PerClassSpellsKnownPanel characterData={characterData} />

      {pactSlots && (
        <div className="mb-6 bg-[#1E2430] border-2 border-[#5B4B9E] rounded-xl p-4">
          <h3 className="text-lg font-bold text-[#5B4B9E] mb-1">Pact Magic (Warlock)</h3>
          <p className="text-white text-sm">
            Warlock {pactSlots.totalWarlockLevels} • 
            {` ${pactSlots.slots} slot${pactSlots.slots > 1 ? 's' : ''}`} of 
            {` ${pactSlots.slotLevel}${['st','nd','rd'][pactSlots.slotLevel - 1] || 'th'} level`}
          </p>
          <p className="text-xs text-white/70 mt-2">
            You regain these slots on a short rest. All Pact Magic slots are cast at the level shown above.
          </p>
        </div>
      )}

      {showRecommendation && recommendedSpells[showRecommendation] && (
        <div className="bg-[#2A3441] border-2 border-[#37F2D1] rounded-xl p-4 mb-6">
          <h3 className="text-[#37F2D1] font-bold text-lg mb-2">Recommended Spells for {showRecommendation}</h3>
          <p className="text-white">{recommendedSpells[showRecommendation].reasoning}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto text-[#37F2D1] animate-spin mb-4" />
          <p className="text-white">Loading spell library...</p>
        </div>
      ) : (
        <div className="space-y-8 h-[600px] overflow-y-auto pr-4 custom-scrollbar">
          {Object.keys(spellSlots).map((levelKey) => {
            const slots = getSlotsForLevelKey(levelKey);
            if (slots <= 0) return null;

            // Gate by what you’re actually allowed to learn
            if (levelKey !== "cantrips") {
              const numericLevel = parseInt(levelKey.replace("level", ""), 10);
              if (numericLevel > maxSpellLevel) {
                return null;
              }
            }

            const levelLabel = levelKey === "cantrips" ? "Cantrips" : `${levelKey.replace("level", "")}${["st", "nd", "rd"][parseInt(levelKey.replace("level", "")) - 1] || "th"} Level Spells`;
            const spellsForLevel = availableSpells[levelKey] || [];
            const currentSelected = selectedSpells[levelKey] || [];

            return (
              <div key={levelKey}>
                <h3 className="text-xl font-bold text-[#5B4B9E] mb-4">{levelLabel}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {spellsForLevel.length === 0 ? (
                    <p className="text-white/60 col-span-2">No spells available for this level.</p>
                  ) : (
                    spellsForLevel.map((spell) => {
                      const details = getSpellDetail(spell);
                      const isSelected = currentSelected.includes(spell);
                      // Cap by TOTAL prepared/known per class (PHB 2014),
                      // not per-spell-level slot count. Cantrips and
                      // non-cantrips share separate caps. Brewery
                      // classes have no SRD-table cap; fall back to
                      // the per-level slot count for them.
                      const isCantrip = levelKey === "cantrips";
                      const totalCap = breweryClass
                        ? slots
                        : isCantrip
                          ? cantripCap
                          : prepKnownCap;
                      const totalSelected = breweryClass
                        ? currentSelected.length
                        : isCantrip
                          ? totalSelectedCantrips
                          : totalSelectedNonCantrips;
                      const isDisabled = !isSelected && totalSelected >= totalCap;

                      const handleToggle = (checked) => {
                        const newSpells = checked
                          ? [...currentSelected, spell]
                          : currentSelected.filter(s => s !== spell);

                        updateCharacterData({
                          spells: { ...characterData.spells, [levelKey]: newSpells }
                        });
                      };

                      return (
                        <HoverCard key={spell} openDelay={150} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div
                              onClick={() => !isDisabled && handleToggle(!isSelected)}
                              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#2A3441] border-[#37F2D1] border-4'
                                  : 'bg-[#2A3441] border-[#1E2430]'
                              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#37F2D1]/50'}`}
                            >
                              <div className="flex items-start gap-3 mb-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={handleToggle}
                                  disabled={isDisabled}
                                  className="mt-1 border-white pointer-events-none"
                                />
                                {spellIcons[spell] && (
                                  <img
                                    src={spellIcons[spell]}
                                    alt={spell}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-[#37F2D1]/30"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-semibold text-[#FFC6AA]">{spell}</h4>
                                  <div className="text-xs text-gray-400 mb-2">
                                    {details.school} • {details.castingTime} • {details.range}
                                  </div>
                                  <p className="text-xs text-white leading-relaxed line-clamp-3">{details.description}</p>
                                  {details.effects && details.effects.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {details.effects.map((effect, idx) => (
                                        <div
                                          key={idx}
                                          className="relative"
                                          onMouseEnter={() => setHoveredEffect(effect)}
                                          onMouseLeave={() => setHoveredEffect(null)}
                                        >
                                          <Badge className="bg-[#FF5722] text-white text-xs cursor-help">
                                            {effect}
                                          </Badge>
                                          {hoveredEffect === effect && effectDescriptions[effect] && (
                                            <div className="absolute z-10 bottom-full left-0 mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#FF5722]">
                                              <div className="font-bold mb-1">{effect}</div>
                                              {effectDescriptions[effect]}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent
                            side="right"
                            align="start"
                            sideOffset={8}
                            className="w-96 max-h-[80vh] overflow-y-auto custom-scrollbar bg-[#1E2430] border-2 border-[#37F2D1]/50 text-white p-4"
                          >
                            <SpellFullDetail name={spell} spell={details} />
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Full spell detail rendered in the hover popover. Untruncated
 * description plus all metadata (level, school, casting time, range,
 * components, duration, at-higher-levels scaling, eligible classes).
 *
 * Tolerates the slight shape variance between the API spell rows
 * (level: number, classes: array, higherLevel: string) and the
 * hardcoded fallback rows (level: "Cantrip" | string, no higherLevel
 * / classes). Missing fields drop their row instead of rendering "-".
 */
function SpellFullDetail({ name, spell }) {
  if (!spell) return null;
  const levelDisplay =
    spell.level === 0 || spell.level === "Cantrip"
      ? "Cantrip"
      : typeof spell.level === "number"
        ? `Level ${spell.level}`
        : spell.level;
  const higher = spell.higherLevel || spell.higher_level || spell.atHigherLevels;
  const classes = Array.isArray(spell.classes) ? spell.classes : [];
  const meta = [
    levelDisplay && spell.school ? `${levelDisplay} ${spell.school}` : (levelDisplay || spell.school),
    spell.castingTime,
    spell.range,
    spell.components,
    spell.duration,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-base font-bold text-[#FFC6AA] leading-tight">{name}</h4>
        {meta.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-0.5">{meta.join(" • ")}</p>
        )}
      </div>

      {spell.description && (
        <p className="text-xs text-white/90 leading-relaxed whitespace-pre-line">
          {spell.description}
        </p>
      )}

      {higher && (
        <div className="border-l-2 border-[#37F2D1]/60 pl-3 py-1">
          <p className="text-[10px] uppercase tracking-widest text-[#37F2D1] font-bold mb-1">
            At Higher Levels
          </p>
          <p className="text-xs text-white/85 leading-relaxed whitespace-pre-line">{higher}</p>
        </div>
      )}

      {classes.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">
            Classes
          </p>
          <div className="flex flex-wrap gap-1">
            {classes.map((c) => (
              <Badge key={c} className="bg-[#1E2430] border border-[#37F2D1]/30 text-[#37F2D1] text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Per-class spells-known / spells-prepared reference panel for
 * multiclass casters. Today's spell picker selects from a unified
 * pool constrained by total slot count per level — it doesn't
 * track which class learned which spell, which means a Bard 3 /
 * Sorcerer 2 has no enforced per-class budget. Per RAW (PHB p.
 * 165), each class tracks its known/prepared spells separately:
 *   Bard 3 → 6 spells known
 *   Sorcerer 2 → 3 spells known + Sorcerer's cantrip count
 *
 * This panel surfaces the rules so player + GM can verify the
 * total count is consistent with each class's individual budget.
 * Renders nothing for single-class characters (the inline
 * Spellcasting summary already shows the right number) and for
 * non-caster classes (no spells to surface). Reads from the
 * existing SPELLS_KNOWN_TABLE so the rules data stays the single
 * source of truth.
 */
function PerClassSpellsKnownPanel({ characterData }) {
  const primary = characterData?.class;
  const multiclasses = Array.isArray(characterData?.multiclasses)
    ? characterData.multiclasses.filter((mc) => mc?.class && mc?.level)
    : [];
  if (multiclasses.length === 0) return null; // single-class — existing summary is sufficient

  const primaryLevel =
    Math.max(1, Number(characterData?.level) || 1) -
    multiclasses.reduce((s, mc) => s + (Number(mc.level) || 0), 0);

  const allEntries = [
    { className: primary, level: Math.max(1, primaryLevel) },
    ...multiclasses.map((mc) => ({ className: mc.class, level: Number(mc.level) || 0 })),
  ].filter((e) => e.className && e.level > 0 && SPELLS_KNOWN_TABLE[e.className]);

  if (allEntries.length === 0) return null;

  const attributes = characterData?.attributes || {};

  return (
    <div className="mb-6 bg-[#1E2430] border-2 border-[#5B4B9E]/40 rounded-xl p-4">
      <h3 className="text-[#5B4B9E] font-bold mb-1 flex items-center gap-2">
        Multiclass Spells Reference
        <InfoTip width="w-80">
          Each class tracks its own spells known or prepared count.
          The picker below shows the unified slot pool — these per-class
          budgets are the RAW limits to keep your selections consistent
          with.
        </InfoTip>
      </h3>
      <p className="text-xs text-white/60 mb-3">
        Per PHB p. 165, multiclass casters track spells separately per class.
      </p>
      <ul className="text-sm text-white space-y-1.5">
        {allEntries.map(({ className: cls, level }) => {
          const data = SPELLS_KNOWN_TABLE[cls];
          if (!data) return null;
          const cantrips = cantripsKnown(cls, level);
          let spellsLine = null;
          if (data.type === "known") {
            const known = spellsKnown(cls, level);
            if (known != null) spellsLine = `${known} spells known`;
          } else if (data.type === "prepared") {
            const ability = SPELLCASTING_ABILITY[cls];
            const score = Number(attributes?.[ability] ?? 10);
            const mod = abilityModifier(score);
            const prepared = spellsPrepared(cls, level, mod);
            if (prepared != null) {
              spellsLine = `${prepared} prepared (${ability?.toUpperCase()} mod ${mod >= 0 ? "+" : ""}${mod} + level adj.)`;
            }
          }
          return (
            <li key={cls} className="flex items-center justify-between gap-2 flex-wrap">
              <span>
                <span className="font-bold text-white">{cls}</span>{" "}
                <span className="text-white/60">level {level}</span>
              </span>
              <span className="text-[#37F2D1] text-xs font-semibold">
                {cantrips > 0 && `${cantrips} cantrips`}
                {cantrips > 0 && spellsLine && " · "}
                {spellsLine || (cantrips === 0 ? "—" : "")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}