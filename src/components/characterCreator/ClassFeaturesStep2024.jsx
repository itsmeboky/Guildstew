import React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getClassBasics,
  hasPerLevelFeatures,
} from "@/data/games/dnd5e_2024/classFeatures";
import {
  getSubclassesForClass,
  getSubclassFeaturesAtLevel,
} from "@/data/games/dnd5e_2024/subclassFeatures";
import { getWeaponsWithMastery } from "@/data/games/dnd5e_2024/equipment";
import {
  weaponMasterySlots,
  SPELLS_KNOWN_TABLE,
  // Class-scaling helpers — each is a per-class function that
  // returns the relevant live value at the given class level. The
  // scaling panel below renders whichever ones are non-zero/non-null
  // for the chosen class.
  rageUsesAtLevel,
  rageDamageAtLevel,
  sneakAttackDice,
  martialArtsDie,
  focusPoints,
  layOnHandsPool,
  channelDivinityUses,
  sorceryPoints,
  metamagicKnown,
  getPactSlots,
  eldritchInvocationsKnown,
  mysticArcanumLevels,
  cantripsKnown,
} from "@/data/games/dnd5e_2024/rules";
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
 * What renders here (Commits 3 + 8):
 *   - Class basics card (hit die, primary ability, saving throws,
 *     proficiencies) sourced from 2024 SRD Classes.json
 *   - Subclass picker at level >= 3 listing SRD subclasses for the
 *     chosen class (12 total in SRD, 1 per class) [Commit 3]
 *   - Subclass features inline from 2024 SRD Subclasses.json [Commit 3]
 *   - **Weapon Mastery picker** for the 5 martial classes that
 *     get the mechanic in 2024 (Barbarian, Fighter, Paladin,
 *     Ranger, Rogue). Player picks N weapon types per
 *     `weaponMasterySlots(class, level)`; the mastery property of
 *     each weapon is sourced from `5e-SRD-Equipment.json`. [Commit 8]
 *   - **Level-1 class-path-choice banner** for Cleric / Druid
 *     where the SRD entry has `level1ClassPathChoice: true`. The
 *     PHB-2024 option names (Divine Order: Protector/Thaumaturge;
 *     Primal Order: Magician/Warden) are NOT in the OGL SRD JSON,
 *     so this commit only surfaces the existence of the mechanic
 *     with a banner; the picker stays a smell pending SRD
 *     expansion. [Commit 8]
 *
 * What does NOT render (deferred):
 *   - Per-level non-subclass class features (`class_levels` is a
 *     URL stub in the 2024 SRD).
 *   - Multiclass UI for 2024 (separate scope, multiclass vetting).
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

  // ── Weapon Mastery (2024 mechanic) ──────────────────────────
  // 5 of 6 martial classes get Weapon Mastery slots in 2024.
  // weaponMasterySlots() returns 0 for classes that don't have the
  // mechanic, gating the picker cleanly.
  const masterySlotCount = weaponMasterySlots(className, level);
  const selectedMasteries = Array.isArray(characterData.weaponMasteries)
    ? characterData.weaponMasteries
    : [];
  const masteryWeapons = masterySlotCount > 0 ? getWeaponsWithMastery() : [];

  const toggleMastery = (weaponName) => {
    const isSelected = selectedMasteries.includes(weaponName);
    if (isSelected) {
      updateCharacterData({
        weaponMasteries: selectedMasteries.filter((n) => n !== weaponName),
      });
    } else if (selectedMasteries.length < masterySlotCount) {
      updateCharacterData({
        weaponMasteries: [...selectedMasteries, weaponName],
      });
    }
  };

  // ── Class scaling at this level ────────────────────────────
  // Surfaces live mechanical values from the rules.js per-class
  // helpers — Rage uses + damage (Barb), Sneak Attack dice (Rog),
  // Martial Arts die + Focus Points (Monk), Lay on Hands pool +
  // Channel Divinity uses (Pal/Clr), Bardic Inspiration die (Bard),
  // Sorcery Points + Metamagic known (Sor), Eldritch Invocations
  // + Mystic Arcanum levels (Wlk), cantrips known (any caster).
  //
  // Each row is only included if its helper returns a non-zero /
  // non-null value, so single-class characters see only their
  // relevant rows.
  const scalingRows = (() => {
    const rows = [];
    const cantrips = cantripsKnown(className, level);
    if (cantrips > 0) {
      rows.push({ label: "Cantrips known", value: String(cantrips) });
    }

    if (className === "Barbarian") {
      const uses = rageUsesAtLevel(level);
      if (uses > 0) {
        rows.push({
          label: "Rage uses / Long Rest",
          value: uses === Infinity ? "Unlimited" : String(uses),
        });
      }
      const dmg = rageDamageAtLevel(level);
      if (dmg > 0) {
        rows.push({ label: "Rage damage bonus", value: `+${dmg}` });
      }
    }

    if (className === "Rogue") {
      const dice = sneakAttackDice(level);
      if (dice > 0) {
        rows.push({ label: "Sneak Attack", value: `${dice}d6` });
      }
    }

    if (className === "Monk") {
      const die = martialArtsDie(level);
      if (die) {
        rows.push({ label: "Martial Arts die", value: die });
      }
      const fp = focusPoints(level);
      if (fp > 0) {
        rows.push({ label: "Focus Points", value: String(fp) });
      }
    }

    if (className === "Paladin") {
      const pool = layOnHandsPool(level);
      if (pool > 0) {
        rows.push({ label: "Lay on Hands pool", value: `${pool} HP` });
      }
      const cd = channelDivinityUses("Paladin", level);
      if (cd > 0) {
        rows.push({
          label: "Channel Divinity / Short or Long Rest",
          value: String(cd),
        });
      }
    }

    if (className === "Cleric") {
      const cd = channelDivinityUses("Cleric", level);
      if (cd > 0) {
        rows.push({ label: "Channel Divinity / Long Rest", value: String(cd) });
      }
    }

    if (className === "Bard") {
      // Bardic Inspiration die scales per the SPELLS_KNOWN_TABLE
      // entry's bardicInspirationDie threshold map.
      let die = null;
      try {
        const table = SPELLS_KNOWN_TABLE.Bard?.bardicInspirationDie || {};
        const thresholds = Object.keys(table).map(Number).sort((a, b) => b - a);
        for (const t of thresholds) if (level >= t) { die = table[t]; break; }
      } catch { /* unknown-class proxy guard — Bard always exists */ }
      if (die) {
        rows.push({ label: "Bardic Inspiration die", value: die });
      }
    }

    if (className === "Sorcerer") {
      const sp = sorceryPoints(level);
      if (sp > 0) {
        rows.push({ label: "Sorcery Points", value: String(sp) });
      }
      const mm = metamagicKnown(level);
      if (mm > 0) {
        rows.push({ label: "Metamagic options known", value: String(mm) });
      }
    }

    if (className === "Warlock") {
      const pact = getPactSlots(level);
      if (pact) {
        rows.push({
          label: "Pact Magic slots / Short or Long Rest",
          value: `${pact.slots} × level-${pact.level}`,
        });
      }
      const inv = eldritchInvocationsKnown(level);
      if (inv > 0) {
        rows.push({ label: "Eldritch Invocations known", value: String(inv) });
      }
      const arcanum = mysticArcanumLevels(level);
      if (arcanum.length > 0) {
        rows.push({
          label: "Mystic Arcanum slots (1 / Long Rest each)",
          value: arcanum.map((l) => `level-${l}`).join(", "),
        });
      }
    }

    return rows;
  })();

  // ── L1 class-path choice (Cleric Divine Order / Druid Primal
  //    Order) ───────────────────────────────────────────────────
  // The mechanic exists; the PHB-2024 option names are NOT in the
  // OGL SRD JSON. We surface the existence with a banner so the
  // player knows to consult the PHB; the picker itself stays a
  // smell pending SRD expansion or licensed third-party data.
  const hasL1PathChoice = (() => {
    try {
      return !!SPELLS_KNOWN_TABLE[className]?.level1ClassPathChoice;
    } catch {
      return false;
    }
  })();

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

      {/* Class scaling at this level — live mechanical values
          from the per-class helpers. Renders only the rows
          relevant to the chosen class. */}
      {basics && scalingRows.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#FFC6AA] mb-2 flex items-center gap-2">
            Class scaling at Level {level}
            <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] font-black">
              2024
            </Badge>
          </h3>
          <p className="text-sm text-white/60 mb-4">
            Live values from the {basics.name} class table at your
            current level.
          </p>
          <div className="bg-[#2A3441] rounded-xl p-5 border-2 border-[#1E2430]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {scalingRows.map((row, idx) => (
                <div
                  key={`${row.label}-${idx}`}
                  className="flex justify-between bg-[#1E2430]/40 rounded px-3 py-2"
                >
                  <span className="text-white/60">{row.label}</span>
                  <span className="text-[#37F2D1] font-semibold">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* L1 class-path-choice banner — Cleric Divine Order /
          Druid Primal Order. The mechanic exists in PHB 2024 but
          the option names aren't in the OGL SRD JSON, so this
          surfaces the mechanic without naming the options. */}
      {hasL1PathChoice && (
        <div className="mb-8 p-4 bg-[#5B4B9E]/10 rounded-xl border-2 border-[#5B4B9E]/40 text-sm">
          <p className="font-semibold text-[#5B4B9E] mb-1">
            Level-1 path choice (PHB 2024)
          </p>
          <p className="text-white/80">
            PHB 2024 adds a level-1 path choice for {basics?.name} that
            grants different proficiencies / cantrips depending on which
            option you pick. The specific option names and effects are
            PHB-only content not present in the OGL SRD; refer to your
            PHB 2024 to make the choice. We'll surface the picker once
            the SRD is expanded.
          </p>
        </div>
      )}

      {/* Weapon Mastery picker — 2024 mechanic for 5 martial classes
          (Barbarian, Fighter, Paladin, Ranger, Rogue). Slot count
          scales with class level per weaponMasterySlots(). */}
      {masterySlotCount > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#FFC6AA] mb-2 flex items-center gap-2">
            Weapon Mastery
            <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] font-black">
              2024
            </Badge>
          </h3>
          <p className="text-sm text-white/70 mb-4">
            Choose {masterySlotCount} weapon type{masterySlotCount === 1 ? "" : "s"} you
            can apply mastery properties to. You can swap one of these
            on a long rest.
          </p>
          <div className="mb-3 text-sm text-[#37F2D1]">
            Selected: {selectedMasteries.length} / {masterySlotCount}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-2">
            {masteryWeapons.map((w) => {
              const isSelected = selectedMasteries.includes(w.name);
              const isDisabled = !isSelected && selectedMasteries.length >= masterySlotCount;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => !isDisabled && toggleMastery(w.name)}
                  disabled={isDisabled}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "bg-[#2A3441] border-[#37F2D1]"
                      : "bg-[#2A3441]/50 border-[#1E2430] hover:border-[#37F2D1]/50"
                  } ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-white text-sm font-semibold">{w.name}</span>
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => !isDisabled && toggleMastery(w.name)}
                      className="pointer-events-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge className="bg-[#5B4B9E] text-white text-[9px] font-bold uppercase tracking-wider">
                      {w.mastery}
                    </Badge>
                    {w.damage?.dice && (
                      <span className="text-white/50">
                        {w.damage.dice} {w.damage.type?.toLowerCase()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedMasteries.length < masterySlotCount && (
            <p className="mt-3 text-xs text-[#FF5722]">
              ⚠️ Pick {masterySlotCount - selectedMasteries.length} more weapon{masterySlotCount - selectedMasteries.length === 1 ? "" : "s"} to use mastery properties.
            </p>
          )}
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
