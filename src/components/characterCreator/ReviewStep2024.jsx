import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";
import {
  abilityModifier,
  proficiencyBonus,
  SKILL_ABILITIES,
  ALL_SKILLS,
} from "@/components/dnd5e/dnd5eRules";
import { getSpeciesById, getSubspecies } from "@/data/games/dnd5e_2024/species";
import { getBackgroundById } from "@/data/games/dnd5e_2024/backgrounds";
import { getClassByName } from "@/data/games/dnd5e_2024/classes";
import {
  SPELLS_KNOWN_TABLE,
  spellsPrepared,
  cantripsKnown,
  getSpellSlots,
  getPactSlots,
  weaponMasterySlots,
} from "@/data/games/dnd5e_2024/rules";

/**
 * 2024 D&D 5e — review step.
 *
 * Read-only summary of every selection the player made in the
 * preceding 2024 steps. Collapsible sections keep long lists out of
 * the player's face while still letting them double-check before
 * saving.
 *
 * Pulls exclusively from the 2024 adapters and from characterData
 * fields written by SpeciesStep2024 / AbilitiesStep2024 /
 * ClassStep2024 / SkillsStep2024 / SpellsStep2024.
 */

const ABILITIES = [
  { key: "str", name: "Strength" },
  { key: "dex", name: "Dexterity" },
  { key: "con", name: "Constitution" },
  { key: "int", name: "Intelligence" },
  { key: "wis", name: "Wisdom" },
  { key: "cha", name: "Charisma" },
];

function Section({ title, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#2A3441] rounded-xl border-2 border-[#1E2430]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-4 h-4 text-[#37F2D1]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white/60" />
          )}
          <h3 className="text-base font-bold text-[#FFC6AA]">{title}</h3>
          {badge}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function modSign(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

export default function ReviewStep2024({ characterData }) {
  const className = characterData.class || "";
  const level = Number(characterData.level) || 1;
  const cls = className ? getClassByName(className) : null;
  const profBonus = proficiencyBonus(level);

  const species = characterData.species?.speciesId
    ? getSpeciesById(characterData.species.speciesId)
    : null;
  const subspecies = characterData.species?.subspeciesId
    ? getSubspecies(characterData.species.subspeciesId)
    : null;

  const bg = characterData.background?.backgroundId
    ? getBackgroundById(characterData.background.backgroundId)
    : null;

  const attributes = characterData.attributes || {};

  const savingThrows = useMemo(() => {
    if (!cls?.savingThrows) return [];
    return cls.savingThrows.map((name) => {
      // savingThrows are full ability names; map to keys.
      const lower = name.toLowerCase();
      const key = lower.slice(0, 3);
      return { ability: name, key, isProficient: true };
    });
  }, [cls]);

  const proficientSkills = useMemo(() => {
    const sel = characterData.skills || {};
    return Object.entries(sel)
      .filter(([, on]) => on)
      .map(([s]) => s)
      .sort();
  }, [characterData.skills]);

  const expertise = Array.isArray(characterData.expertise)
    ? characterData.expertise
    : [];

  const spellTable = className ? SPELLS_KNOWN_TABLE[className] : null;
  const isCaster = !!spellTable;
  const cantrips = characterData.spells?.cantrips || [];
  const prepared = characterData.spells?.prepared || [];
  const spellbook = characterData.spells?.spellbook || [];
  const alwaysPrepared = characterData.spells?.alwaysPrepared || [];
  const spellSlots = isCaster ? getSpellSlots(className, level) : [];
  const pactSlots = spellTable?.type === "pact" ? getPactSlots(level) : null;
  const cantripCap = isCaster ? cantripsKnown(className, level) : 0;
  const preparedCap = isCaster ? spellsPrepared(className, level) : 0;

  const masterySlotCount = className ? weaponMasterySlots(className, level) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-4"
    >
      {/* Header card */}
      <div className="bg-[#1E2430] rounded-xl p-6 border-2 border-[#37F2D1]/40">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {characterData.name || "Unnamed Hero"}
            </h2>
            <p className="text-white/70 text-sm mt-1">
              Level {level} {species?.name || characterData.race || "—"}
              {subspecies && <> ({subspecies.name})</>} {className || "—"}
              {characterData.subclass && <> — {characterData.subclass}</>}
            </p>
            <p className="text-white/50 text-xs mt-1">
              {bg?.name || "No background"} • {characterData.alignment || "—"}
            </p>
          </div>
          <Badge className="bg-[#37F2D1] text-[#1E2430] text-xs font-black">
            2024
          </Badge>
        </div>
      </div>

      {/* Abilities */}
      <Section title="Ability Scores" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ABILITIES.map((a) => {
            const score = Number(attributes[a.key] || 10);
            const mod = abilityModifier(score);
            const save = savingThrows.find((s) => s.key === a.key);
            const saveMod = save ? mod + profBonus : mod;
            return (
              <div key={a.key} className="bg-[#1E2430]/40 rounded p-3 text-center">
                <p className="text-xs text-white/60 uppercase">{a.name}</p>
                <p className="text-2xl font-bold text-[#37F2D1]">{score}</p>
                <p className="text-sm text-white/70">{modSign(mod)}</p>
                <p className="text-[10px] text-white/50 mt-1 uppercase">
                  Save: {modSign(saveMod)}{save && " *"}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-white/40 mt-2">* = proficient save</p>
      </Section>

      {/* Background ASI breakdown */}
      {bg && (
        <Section title={`Background — ${bg.name}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase text-white/50 mb-1">Ability bonus</p>
              <p className="text-white/80">
                {characterData.background?.asiDistribution || "—"}{" "}
                <span className="text-white/50">across</span>{" "}
                {Object.entries(characterData.background?.asiAssignment || {})
                  .map(([ab, v]) => `${ab.toUpperCase()} +${v}`)
                  .join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 mb-1">Skills granted</p>
              <p className="text-white/80">
                {(characterData.background?.skillsGranted || []).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 mb-1">Tool granted</p>
              <p className="text-white/80">
                {characterData.background?.toolGranted || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-white/50 mb-1">Origin Feat</p>
              <p className="text-white/80">
                {characterData.background?.originFeat || "—"}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Species */}
      {species && (
        <Section title={`Species — ${species.name}${subspecies ? ` (${subspecies.name})` : ""}`}>
          <div className="text-sm text-white/70 mb-2">
            {species.type} • {species.size} • Speed {species.speed} ft
          </div>
          {Array.isArray(species.traits) && species.traits.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {species.traits.map((t) => (
                <Badge
                  key={t.index}
                  className="bg-[#5B4B9E]/30 text-white text-[10px] border border-[#5B4B9E]/50"
                >
                  {t.name}
                </Badge>
              ))}
            </div>
          )}
          {Array.isArray(subspecies?.traits) && subspecies.traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {subspecies.traits.map((t) => (
                <Badge
                  key={t.index}
                  className="bg-[#1E2430] text-white/80 text-[10px] border border-white/10"
                >
                  {t.name}
                </Badge>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Skills */}
      {proficientSkills.length > 0 && (
        <Section
          title="Skills"
          badge={
            <span className="text-xs text-white/50">
              {proficientSkills.length} proficient
              {expertise.length > 0 && <> • {expertise.length} expertise</>}
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ALL_SKILLS.filter((s) => proficientSkills.includes(s)).map((skill) => {
              const ab = SKILL_ABILITIES[skill];
              const score = Number(attributes[ab] || 10);
              const hasExpertise = expertise.includes(skill);
              const mod = abilityModifier(score)
                + (hasExpertise ? profBonus * 2 : profBonus);
              return (
                <div
                  key={skill}
                  className="bg-[#1E2430]/40 rounded p-2 flex items-center justify-between text-sm"
                >
                  <span className="text-white">
                    {skill}
                    {hasExpertise && (
                      <span className="text-yellow-400 ml-1 text-[10px]">★</span>
                    )}
                  </span>
                  <span className="text-[#37F2D1] font-bold">{modSign(mod)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Weapon Mastery (martial classes only) */}
      {masterySlotCount > 0 && (
        <Section
          title="Weapon Mastery"
          badge={
            <span className="text-xs text-white/50">
              {masterySlotCount} weapon slot{masterySlotCount === 1 ? "" : "s"}
            </span>
          }
        >
          <p className="text-white/70 text-sm">
            As a martial class, you can apply mastery properties to{" "}
            {masterySlotCount} weapon{masterySlotCount === 1 ? "" : "s"} at a time
            (changes with each Long Rest).
          </p>
        </Section>
      )}

      {/* Spellcasting */}
      {isCaster && (
        <Section
          title="Spellcasting"
          badge={
            <span className="text-xs text-white/50">
              {spellTable.type}
              {cantripCap > 0 && <> • {cantrips.length}/{cantripCap} cantrips</>}
              {preparedCap > 0 && <> • {prepared.length}/{preparedCap} prepared</>}
            </span>
          }
        >
          <div className="space-y-3 text-sm">
            {/* Slots */}
            <div>
              <p className="text-xs uppercase text-white/50 mb-1">Spell slots</p>
              <div className="flex gap-2 flex-wrap">
                {spellSlots.map((slots, idx) => slots > 0 && (
                  <span
                    key={idx}
                    className="bg-[#1E2430] rounded px-2 py-0.5 text-white/80 text-xs"
                  >
                    L{idx + 1}: {slots}
                  </span>
                ))}
                {pactSlots && (
                  <span className="bg-[#5B4B9E]/30 rounded px-2 py-0.5 text-white text-xs border border-[#5B4B9E]/50">
                    Pact: {pactSlots.slots} × L{pactSlots.level}
                  </span>
                )}
              </div>
            </div>

            {alwaysPrepared.length > 0 && (
              <div>
                <p className="text-xs uppercase text-white/50 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Always prepared
                </p>
                <div className="flex flex-wrap gap-1">
                  {alwaysPrepared.map((name) => (
                    <Badge key={name} className="bg-yellow-400 text-[#1E2430] text-[10px]">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {cantrips.length > 0 && (
              <div>
                <p className="text-xs uppercase text-white/50 mb-1">Cantrips</p>
                <div className="flex flex-wrap gap-1">
                  {cantrips.map((name) => (
                    <Badge
                      key={name}
                      className="bg-[#37F2D1]/20 text-white text-[10px] border border-[#37F2D1]/40"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {prepared.length > 0 && (
              <div>
                <p className="text-xs uppercase text-white/50 mb-1">Prepared</p>
                <div className="flex flex-wrap gap-1">
                  {prepared.map((name) => (
                    <Badge
                      key={name}
                      className="bg-[#37F2D1]/20 text-white text-[10px] border border-[#37F2D1]/40"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {spellbook.length > 0 && spellTable.type === "spellbook" && (
              <div>
                <p className="text-xs uppercase text-white/50 mb-1">Spellbook</p>
                <div className="flex flex-wrap gap-1">
                  {spellbook.map((name) => (
                    <Badge
                      key={name}
                      className="bg-[#1E2430] text-white/80 text-[10px] border border-white/10"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Description / personality / appearance */}
      {(characterData.description
        || characterData.personality?.ideals
        || characterData.personality?.bonds
        || characterData.personality?.flaws
        || Array.isArray(characterData.personality?.traits)) && (
        <Section title="Roleplaying" defaultOpen={false}>
          <div className="space-y-2 text-sm text-white/80">
            {Array.isArray(characterData.personality?.traits)
              && characterData.personality.traits.length > 0 && (
              <div>
                <p className="text-xs uppercase text-white/50">Traits</p>
                <ul className="list-disc list-inside">
                  {characterData.personality.traits.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {characterData.personality?.ideals && (
              <div>
                <p className="text-xs uppercase text-white/50">Ideals</p>
                <p>{characterData.personality.ideals}</p>
              </div>
            )}
            {characterData.personality?.bonds && (
              <div>
                <p className="text-xs uppercase text-white/50">Bonds</p>
                <p>{characterData.personality.bonds}</p>
              </div>
            )}
            {characterData.personality?.flaws && (
              <div>
                <p className="text-xs uppercase text-white/50">Flaws</p>
                <p>{characterData.personality.flaws}</p>
              </div>
            )}
            {characterData.description && (
              <div>
                <p className="text-xs uppercase text-white/50">Description</p>
                <p>{characterData.description}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      <div className="bg-[#37F2D1]/10 border border-[#37F2D1]/30 rounded-lg p-3 text-sm text-[#37F2D1] flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Looks good? Click <span className="font-bold">Create Character</span> below
        to save.
      </div>
    </motion.div>
  );
}
