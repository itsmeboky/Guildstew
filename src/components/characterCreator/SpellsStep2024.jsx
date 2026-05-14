import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lock, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import {
  getSpellsForClass,
  getCantripsForClass,
} from "@/data/games/dnd5e_2024/spells";
import {
  getSpellsKnownEntry,
  spellsPrepared,
  cantripsKnown,
  getSpellSlots,
  getPactSlots,
} from "@/data/games/dnd5e_2024/rules";
import { getClassByName } from "@/data/games/dnd5e_2024/classes";
import InfoTip from "@/components/characterCreator/InfoTip";

/**
 * 2024 D&D 5e — spells step.
 *
 * Spell preparation model in 2024: every spellcasting class prepares
 * from a fixed table (no "known" spells); the only differences are
 * the swap rule and prep source.
 *
 *   - prepared casters (Bard / Cleric / Druid / Paladin / Ranger /
 *     Sorcerer / Warlock): prepare from the class's full spell list
 *     up to the prep cap.
 *   - spellbook caster (Wizard): prepare from the player's spellbook
 *     (6 spells at L1, +2 on level-up). Spellbook contents are picked
 *     from the wizard list; prep cap is the wizard prepared table.
 *   - always-prepared: features that grant a spell that doesn't count
 *     against the prep cap. Paladin: Divine Smite. Ranger: Hunter's
 *     Mark. The names are SRD-permissible; mechanics are encoded
 *     in SPELLS_KNOWN_TABLE.alwaysPrepared.
 *
 * Non-spellcasters (Barbarian, Fighter, Monk, Rogue baseline) render
 * a short "no spells at this level" notice and validate as complete.
 *
 * Persistence shape (under characterData.spells):
 *   { cantrips: [name], prepared: [name], spellbook: [name],
 *     alwaysPrepared: [name] }
 */

const ABILITIES_NAME = {
  bard: "Charisma",
  cleric: "Wisdom",
  druid: "Wisdom",
  paladin: "Charisma",
  ranger: "Wisdom",
  sorcerer: "Charisma",
  warlock: "Charisma",
  wizard: "Intelligence",
};

function classIdLower(name) {
  return String(name || "").toLowerCase();
}

export default function SpellsStep2024({ characterData, updateCharacterData }) {
  const className = characterData.class;
  const cls = className ? getClassByName(className) : null;
  const classLevel = Number(characterData.level) || 1;
  const tableEntry = getSpellsKnownEntry(className);

  const isCaster = !!tableEntry;
  const shape = tableEntry?.type || "none"; // 'prepared' | 'spellbook' | 'pact' | 'none'
  const classKey = cls?.id || classIdLower(className);

  const cantripCount = isCaster ? cantripsKnown(className, classLevel) : 0;
  const preparedCount = isCaster ? spellsPrepared(className, classLevel) : 0;
  const wizardSpellbookSize = shape === "spellbook"
    ? (tableEntry.startingSpellbookSpells || 6)
      + Math.max(0, classLevel - 1) * (tableEntry.spellsPerLevel || 2)
    : 0;

  // Spell pools
  const cantripPool = useMemo(
    () => (isCaster ? getCantripsForClass(classKey) : []),
    [isCaster, classKey],
  );
  const spellPool = useMemo(
    () => (isCaster
      ? getSpellsForClass(classKey, classLevel).filter(
          (s) => Number(s.level ?? 0) > 0,
        )
      : []),
    [isCaster, classKey, classLevel],
  );

  // Always-prepared (free) spells from the SRD-encoded list.
  const alwaysPrepared = useMemo(() => {
    if (!tableEntry?.alwaysPrepared) return [];
    return tableEntry.alwaysPrepared;
  }, [tableEntry]);

  // Current selections — keep canonical names (matches what
  // getSpellById returns as `.name`).
  const initial = characterData.spells || {};
  const [cantrips, setCantrips] = useState(
    Array.isArray(initial.cantrips) ? initial.cantrips : [],
  );
  const [prepared, setPrepared] = useState(
    Array.isArray(initial.prepared) ? initial.prepared : [],
  );
  const [spellbook, setSpellbook] = useState(
    Array.isArray(initial.spellbook) ? initial.spellbook : [],
  );

  // Spell slots (for "casts per day" display)
  const spellSlots = useMemo(
    () => (isCaster ? getSpellSlots(className, classLevel) : []),
    [isCaster, className, classLevel],
  );
  const pactSlots = shape === "pact" ? getPactSlots(classLevel) : null;

  // Persist whenever picks change.
  useEffect(() => {
    if (!isCaster) {
      // Wipe stale spells when switching to a non-caster class.
      if (cantrips.length || prepared.length || spellbook.length) {
        updateCharacterData({
          spells: { cantrips: [], prepared: [], spellbook: [], alwaysPrepared: [] },
        });
      }
      return;
    }
    updateCharacterData({
      spells: {
        cantrips,
        prepared,
        spellbook,
        alwaysPrepared,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantrips, prepared, spellbook, isCaster]);

  // ── Render — non-spellcaster ─────────────────────────────
  if (!isCaster) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
          <h2 className="text-2xl font-bold text-[#FFC6AA] mb-2 flex items-center gap-2">
            Spells
            <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] font-black">
              2024
            </Badge>
          </h2>
          <p className="text-white/80 text-sm">
            {className || "This class"} doesn't gain spellcasting at level
            {" "}
            {classLevel} in 2024. Skip ahead — there's nothing to pick here.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Render — spellcaster ─────────────────────────────────

  const toggle = (list, setList, max) => (name) => {
    const has = list.includes(name);
    if (has) {
      setList(list.filter((n) => n !== name));
    } else if (list.length < max) {
      setList([...list, name]);
    }
  };

  const toggleCantrip = toggle(cantrips, setCantrips, cantripCount);
  const toggleSpellbook = toggle(spellbook, setSpellbook, wizardSpellbookSize);

  // Wizard prep pool = spellbook contents (not the whole class list).
  const prepPool = shape === "spellbook"
    ? spellPool.filter((s) => spellbook.includes(s.name))
    : spellPool;

  const togglePrepared = (name) => {
    if (alwaysPrepared.includes(name)) return; // locked
    const has = prepared.includes(name);
    if (has) {
      setPrepared(prepared.filter((n) => n !== name));
    } else if (prepared.length < preparedCount) {
      setPrepared([...prepared, name]);
    }
  };

  const groupedSpellPool = useMemo(() => {
    const groups = new Map();
    for (const s of prepPool) {
      const lvl = Number(s.level ?? 0);
      if (!groups.has(lvl)) groups.set(lvl, []);
      groups.get(lvl).push(s);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [prepPool]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      <div className="bg-[#1E2430]/90 backdrop-blur-sm rounded-2xl p-6 border border-[#2A3441]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-2 flex items-center gap-2">
          Spells
          <Badge className="bg-[#37F2D1] text-[#1E2430] text-[10px] font-black">
            2024
          </Badge>
          <InfoTip width="w-80">
            2024 unifies spellcasting under a fixed prepared table. The
            casting ability for {className} is {ABILITIES_NAME[classKey]}.
          </InfoTip>
        </h2>
        <p className="text-white/80 text-sm">
          {shape === "spellbook"
            ? `Pick ${wizardSpellbookSize} spells for your spellbook, then prepare up to ${preparedCount} from it.`
            : `Prepare up to ${preparedCount} spell${preparedCount === 1 ? "" : "s"} from the ${className} list.`}
        </p>

        <div className="flex items-center gap-3 mt-4 flex-wrap text-sm">
          {cantripCount > 0 && (
            <div className="bg-[#1E2430]/60 rounded-lg px-3 py-1.5">
              <span className="text-white/60">Cantrips: </span>
              <span className={`font-bold ${cantrips.length === cantripCount ? "text-[#37F2D1]" : "text-[#FF5722]"}`}>
                {cantrips.length}/{cantripCount}
              </span>
            </div>
          )}
          {shape === "spellbook" && (
            <div className="bg-[#1E2430]/60 rounded-lg px-3 py-1.5">
              <span className="text-white/60">Spellbook: </span>
              <span className={`font-bold ${spellbook.length === wizardSpellbookSize ? "text-[#37F2D1]" : "text-[#FF5722]"}`}>
                {spellbook.length}/{wizardSpellbookSize}
              </span>
            </div>
          )}
          {preparedCount > 0 && (
            <div className="bg-[#1E2430]/60 rounded-lg px-3 py-1.5">
              <span className="text-white/60">Prepared: </span>
              <span className={`font-bold ${prepared.length === preparedCount ? "text-[#37F2D1]" : "text-[#FF5722]"}`}>
                {prepared.length}/{preparedCount}
              </span>
            </div>
          )}
        </div>

        {/* Slots — display only */}
        <div className="flex items-center gap-2 mt-3 flex-wrap text-[11px]">
          {spellSlots.length > 0 && spellSlots.map((slots, idx) => slots > 0 && (
            <span key={idx} className="bg-[#1E2430] rounded px-2 py-1 text-white/70">
              L{idx + 1}: {slots}/day
            </span>
          ))}
          {pactSlots && (
            <span className="bg-[#5B4B9E]/30 rounded px-2 py-1 text-white border border-[#5B4B9E]/50">
              Pact: {pactSlots.slots} × L{pactSlots.level}
            </span>
          )}
        </div>
      </div>

      {/* Always-prepared spells */}
      {alwaysPrepared.length > 0 && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4">
          <h3 className="text-yellow-400 font-bold text-sm mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Always Prepared (free — doesn't count against your cap)
          </h3>
          <div className="flex flex-wrap gap-2">
            {alwaysPrepared.map((name) => (
              <Badge key={name} className="bg-yellow-400 text-[#1E2430]">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Cantrips */}
      {cantripCount > 0 && (
        <SpellPicker
          title={`Cantrips (${cantrips.length}/${cantripCount})`}
          spells={cantripPool}
          selected={cantrips}
          onToggle={toggleCantrip}
          atMax={cantrips.length >= cantripCount}
        />
      )}

      {/* Wizard — spellbook contents */}
      {shape === "spellbook" && (
        <div>
          <h3 className="text-lg font-bold text-[#FFC6AA] mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Spellbook ({spellbook.length}/{wizardSpellbookSize})
            <InfoTip>
              Your spellbook holds every spell you can prepare. Wizards
              start with 6 spells at L1 and add 2 per level on level-up.
            </InfoTip>
          </h3>
          <SpellGrid
            spells={spellPool}
            selected={spellbook}
            onToggle={toggleSpellbook}
            atMax={spellbook.length >= wizardSpellbookSize}
            groupByLevel
          />
        </div>
      )}

      {/* Prepared spells */}
      {preparedCount > 0 && (
        <div>
          <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">
            Prepared spells ({prepared.length}/{preparedCount})
            {shape === "spellbook" && (
              <span className="text-xs text-white/50 ml-2 font-normal">
                (from your spellbook)
              </span>
            )}
          </h3>
          {groupedSpellPool.length === 0 ? (
            <p className="text-sm text-white/50 italic">
              {shape === "spellbook"
                ? "Pick spells for your spellbook above first."
                : "No spells available for this class at this level."}
            </p>
          ) : (
            <div className="space-y-4">
              {groupedSpellPool.map(([lvl, list]) => (
                <div key={lvl}>
                  <p className="text-xs uppercase text-white/50 mb-2">
                    Level {lvl}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {list.map((s) => {
                      const isSelected = prepared.includes(s.name);
                      const isLocked = alwaysPrepared.includes(s.name);
                      const atMax = !isSelected && prepared.length >= preparedCount;
                      return (
                        <button
                          key={s.index}
                          type="button"
                          onClick={() => togglePrepared(s.name)}
                          disabled={isLocked || atMax}
                          title={isLocked ? "Always prepared" : undefined}
                          className={`text-left p-2 rounded border-2 text-sm transition-all ${
                            isSelected
                              ? "bg-[#37F2D1]/20 border-[#37F2D1] text-white"
                              : isLocked
                              ? "bg-yellow-400/10 border-yellow-400/40 text-white/80 cursor-not-allowed"
                              : atMax
                              ? "bg-[#1E2430]/40 border-[#1E2430] text-white/30 cursor-not-allowed"
                              : "bg-[#2A3441] border-[#1E2430] text-white/80 hover:border-[#37F2D1]/50"
                          }`}
                        >
                          <span className="font-semibold">{s.name}</span>
                          {isSelected && (
                            <Sparkles className="w-3 h-3 inline ml-1 text-[#37F2D1]" />
                          )}
                          {isLocked && (
                            <Lock className="w-3 h-3 inline ml-1 text-yellow-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function SpellPicker({ title, spells, selected, onToggle, atMax }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">{title}</h3>
      <SpellGrid
        spells={spells}
        selected={selected}
        onToggle={onToggle}
        atMax={atMax}
      />
    </div>
  );
}

function SpellGrid({ spells, selected, onToggle, atMax, groupByLevel = false }) {
  if (!groupByLevel) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {spells.map((s) => (
          <SpellChip
            key={s.index}
            spell={s}
            isSelected={selected.includes(s.name)}
            onToggle={() => onToggle(s.name)}
            disabled={!selected.includes(s.name) && atMax}
          />
        ))}
      </div>
    );
  }
  const groups = new Map();
  for (const s of spells) {
    const lvl = Number(s.level ?? 0);
    if (!groups.has(lvl)) groups.set(lvl, []);
    groups.get(lvl).push(s);
  }
  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).sort(([a], [b]) => a - b).map(([lvl, list]) => (
        <div key={lvl}>
          <p className="text-xs uppercase text-white/50 mb-2">
            {lvl === 0 ? "Cantrips" : `Level ${lvl}`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {list.map((s) => (
              <SpellChip
                key={s.index}
                spell={s}
                isSelected={selected.includes(s.name)}
                onToggle={() => onToggle(s.name)}
                disabled={!selected.includes(s.name) && atMax}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpellChip({ spell, isSelected, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`text-left p-2 rounded border-2 text-sm transition-all ${
        isSelected
          ? "bg-[#37F2D1]/20 border-[#37F2D1] text-white"
          : disabled
          ? "bg-[#1E2430]/40 border-[#1E2430] text-white/30 cursor-not-allowed"
          : "bg-[#2A3441] border-[#1E2430] text-white/80 hover:border-[#37F2D1]/50"
      }`}
    >
      <span className="font-semibold">{spell.name}</span>
      {isSelected && <Sparkles className="w-3 h-3 inline ml-1 text-[#37F2D1]" />}
    </button>
  );
}
