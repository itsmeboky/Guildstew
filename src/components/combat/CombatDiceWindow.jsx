import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Swords } from "lucide-react";
import DiceRoller from "@/components/dice/DiceRoller";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  getSkillModifier,
  getSaveModifier,
  getSpellSaveDC,
} from "@/components/combat/actionResolver";

const CLASS_SPELL_ABILITY = {
  Wizard: "int",
  Artificer: "int",
  "Fighter (Eldritch Knight)": "int",
  "Rogue (Arcane Trickster)": "int",
  Cleric: "wis",
  Druid: "wis",
  Ranger: "wis",
  Monk: "wis",
  Bard: "cha",
  Paladin: "cha",
  Sorcerer: "cha",
  Warlock: "cha",
};

export default function CombatDiceWindow({
  isOpen,
  onClose,
  actor,
  target,
  allCombatants = [],
  initialAction,
  onRoll,
  onSwitchTarget,
  onEndTurn,
  isGM = false,
  mode = "combat", // 'combat' or 'initiative'
  campaignId,
  isOffHand = false,
  onActionComplete,
  isSpectator = false,
  spectatorData = null,
}) {
  const [selectedAction, setSelectedAction] = useState(initialAction);
  const [attackRoll, setAttackRoll] = useState(null);
  const [damageRoll, setDamageRoll] = useState(null);
  const [skillCheckRoll, setSkillCheckRoll] = useState(null);
  const [savingThrowRoll, setSavingThrowRoll] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  // Phases:
  //  Attack:  ready → rolling_attack → attack_result → rolling_damage → damage_result
  //  Skill:   ready → rolling_check  → check_result
  //  Save:    ready → rolling_save   → save_result
  const [phase, setPhase] = useState("ready");
  const [isCrit, setIsCrit] = useState(false);
  const [currentDice, setCurrentDice] = useState("d20");
  const [campaignConfig, setCampaignConfig] = useState(null);
  const [initiativeRoll, setInitiativeRoll] = useState(null);

  // Flow type comes from the resolved action produced by actionResolver.resolveAction
  const resolved = selectedAction?.resolved || null;
  const flowType = resolved?.rollType || "attack"; // attack | skill_check | saving_throw | no_roll

  const diceRollerRef = useRef(null);
  const prevSpectatorDataRef = useRef(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    initialData: null,
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ["currentUserProfile", user?.id],
    queryFn: () =>
      base44.entities.UserProfile.filter({ user_id: user?.id }).then(
        (profiles) => profiles[0]
      ),
    enabled: !!user?.id,
    initialData: null,
  });

  // Load campaign dice config (3D dice models)
  useEffect(() => {
    if (!actor?.campaign_id) return;
    const fetchConfig = async () => {
      try {
        const res = await base44.entities.Campaign.filter({
          id: actor.campaign_id,
        });
        const c = res[0];
        if (c && c.dice_config) {
          setCampaignConfig(c.dice_config);
        }
      } catch (err) {
        console.error("Failed to load campaign config", err);
      }
    };
    fetchConfig();
  }, [actor?.campaign_id]);

  // Reset state when window opens / action changes / mode changes
  useEffect(() => {
    if (!isOpen) return;
    setSelectedAction(initialAction);
    setAttackRoll(null);
    setDamageRoll(null);
    setSkillCheckRoll(null);
    setSavingThrowRoll(null);
    setInitiativeRoll(null);
    setPhase("ready");
    setIsRolling(false);
    setCurrentDice("d20");
    setIsCrit(false);
  }, [isOpen, initialAction, mode]);

  // Spectator sync (follow campaign.combat_data.active_encounter)
  useEffect(() => {
    if (!isSpectator || !spectatorData) return;

    if (spectatorData.phase) setPhase(spectatorData.phase);
    if (spectatorData.attackRoll) {
      setAttackRoll(spectatorData.attackRoll);
      setIsCrit(
        !!spectatorData.attackRoll.isCrit ||
          spectatorData.attackRoll.d20 === 20
      );
    }
    if (spectatorData.damageRoll) setDamageRoll(spectatorData.damageRoll);
    if (spectatorData.action) setSelectedAction(spectatorData.action);

    // Attack animation
    if (
      spectatorData.phase === "attack_result" &&
      spectatorData.attackRoll &&
      prevSpectatorDataRef.current?.phase !== "attack_result"
    ) {
      setCurrentDice("d20");
      setIsRolling(true);
      setTimeout(() => {
        if (diceRollerRef.current) {
          diceRollerRef.current.roll();
        }
      }, 100);
    }

    // Damage animation
    if (
      spectatorData.phase === "damage_result" &&
      spectatorData.damageRoll &&
      prevSpectatorDataRef.current?.phase !== "damage_result"
    ) {
      const weaponDice = spectatorData.action?.weapon?.damage || "1d8";
      const diceType = weaponDice.match(/d\d+/)?.[0] || "d8";
      setCurrentDice(diceType);
      setIsRolling(true);
      setTimeout(() => {
        if (diceRollerRef.current) {
          diceRollerRef.current.roll();
        }
      }, 100);
    }

    prevSpectatorDataRef.current = spectatorData;
  }, [isSpectator, spectatorData]);

  // Build "Up Next" queues
  const getQueueAvatars = (side) => {
    if (!allCombatants.length || !actor) return [];
    const actorIndex = allCombatants.findIndex((c) => c.id === actor.id);
    if (actorIndex === -1) return [];

    const queue = [];
    const actorIsGM = actor.type === "monster" || actor.type === "npc";
    const isActorSide = side === "left";

    for (let i = 1; i < allCombatants.length * 2; i++) {
      const idx = (actorIndex + i) % allCombatants.length;
      const combatant = allCombatants[idx];
      const isCombatantGM =
        combatant.type === "monster" || combatant.type === "npc";

      if (isActorSide) {
        // same side as actor
        if (isCombatantGM === actorIsGM && combatant.id !== actor.id) {
          queue.push(combatant);
        }
      } else {
        // opposite side
        if (isCombatantGM !== actorIsGM && combatant.id !== target?.id) {
          queue.push(combatant);
        }
      }

      if (queue.length >= 4) break;
    }
    return queue;
  };

  // Attack modifier (weapon or spell)
  const getModifier = () => {
    if (!actor) return 0;

    // Spell attack
    if (selectedAction?.type === "spell") {
      let ability = "int";
      const charClass = actor.class || "";
      for (const [cls, stat] of Object.entries(CLASS_SPELL_ABILITY)) {
        if (charClass.includes(cls)) {
          ability = stat;
          break;
        }
      }
      if (actor.spellcasting_ability) {
        ability = actor.spellcasting_ability.toLowerCase().slice(0, 3);
      }
      const score =
        actor.attributes?.[ability] || actor.stats?.[ability] || 10;
      const mod = Math.floor((score - 10) / 2);
      const prof =
        actor.proficiency_bonus || actor.stats?.proficiency_bonus || 2;
      return mod + prof;
    }

    // Weapon attack: use best of STR/DEX + prof
    const str = actor.attributes?.str || actor.stats?.strength || 10;
    const dex = actor.attributes?.dex || actor.stats?.dexterity || 10;
    const proficiency =
      actor.proficiency_bonus || actor.stats?.proficiency_bonus || 2;

    const strMod = Math.floor((str - 10) / 2);
    const dexMod = Math.floor((dex - 10) / 2);

    return Math.max(strMod, dexMod) + proficiency;
  };

  const handleAttackRoll = () => {
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_attack");
    onRoll && onRoll({ type: "rolling_attack" });
  };

  const onAttackRollComplete = (roll) => {
    const mod = getModifier();
    const nat20 = roll === 20;
    const result = {
      total: roll + mod,
      d20: roll,
      mod,
      isCrit: nat20,
    };
    setIsCrit(nat20);
    setAttackRoll(result);
    setIsRolling(false);
    setPhase("attack_result");
    onRoll && onRoll({ type: "attack_result", roll: result });
  };

  const handleDamageRoll = () => {
    setIsRolling(true);
    onRoll && onRoll({ type: "rolling_damage" });

    const weaponDice =
      selectedAction?.weapon?.damage ||
      (selectedAction?.type === "spell" ? "1d10" : "1d8");
    const diceType = weaponDice.match(/d\d+/)?.[0] || "d8";
    setCurrentDice(diceType);
    setPhase("rolling_damage");
  };

  const onDamageRollComplete = (roll) => {
    let mod = 0;

    if (selectedAction?.type === "spell") {
      // Most spells don't add ability mod to damage; we can refine per-spell later.
      mod = 0;
    } else {
      // Weapon damage mod
      const strMod = Math.floor(((actor?.attributes?.str || 10) - 10) / 2);
      const dexMod = Math.floor(((actor?.attributes?.dex || 10) - 10) / 2);
      const isRanged =
        selectedAction?.weapon?.category?.includes("Ranged") ||
        selectedAction?.weapon?.properties?.includes("Finesse");

      mod = isRanged ? dexMod : strMod;
      // Off-hand: no positive ability mod unless they have Two-Weapon Fighting style
      if (isOffHand && mod > 0) mod = 0;
    }

    const diceString =
      selectedAction?.weapon?.damage ||
      (selectedAction?.type === "spell" ? "1d10" : "1d8");
    const match = diceString.match(/(\d+)d(\d+)/);
    let numDice = match ? parseInt(match[1], 10) : 1;
    const faces = match ? parseInt(match[2], 10) : 8;

    // Crit: double number of dice
    if (isCrit) numDice *= 2;

    let total = roll; // visible die
    for (let i = 1; i < numDice; i++) {
      total += Math.floor(Math.random() * faces) + 1;
    }

    const totalDamage = Math.max(0, total + mod);
    const result = { total: totalDamage, dice: total, mod, isCrit };
    setDamageRoll(result);
    setIsRolling(false);
    setPhase("damage_result");

    if (target?.id && onRoll) {
      onRoll({
        type: "damage",
        value: totalDamage,
        detail: result,
        targetId: target.id,
      });
    }
  };

  // === Skill Check flow ===
  const handleSkillCheckRoll = () => {
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_check");
    onRoll && onRoll({ type: "rolling_check" });
  };

  const onSkillCheckRollComplete = (roll) => {
    const skill = resolved?.skill || "Athletics";
    const mod = getSkillModifier(actor, skill);
    const total = roll + mod;
    const result = { total, d20: roll, mod, skill };
    setSkillCheckRoll(result);
    setIsRolling(false);
    setPhase("check_result");
    onRoll && onRoll({ type: "check_result", roll: result });
  };

  // === Saving Throw flow (target rolls) ===
  const handleSavingThrowRoll = () => {
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_save");
    onRoll && onRoll({ type: "rolling_save" });
  };

  const onSavingThrowRollComplete = (roll) => {
    const saveAbility = resolved?.save || "dex";
    const mod = getSaveModifier(target, saveAbility);
    const total = roll + mod;
    const dc = getSpellSaveDC(actor);
    const success = total >= dc;
    const result = {
      total,
      d20: roll,
      mod,
      dc,
      success,
      ability: saveAbility,
    };
    setSavingThrowRoll(result);
    setIsRolling(false);
    setPhase("save_result");
    onRoll && onRoll({ type: "save_result", roll: result });
  };

  const onInitiativeRollComplete = (roll) => {
    const dex = actor?.attributes?.dex || 10;
    const mod = Math.floor((dex - 10) / 2);
    const total = roll + mod;
    const result = { total, dice: roll, mod };
    setInitiativeRoll(result);
    setIsRolling(false);
    onRoll && onRoll({ type: "initiative", value: total });
  };

  const targetAC = target?.stats?.armor_class || target?.armor_class || 10;
  const isHit =
    attackRoll && (attackRoll.isCrit || attackRoll.total >= targetAC);

  if (!isOpen) return null;

  // INITIATIVE MODE
  if (mode === "initiative") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-4xl font-black text-white mb-8 tracking-widest">
          INITIATIVE ROLL
        </h2>

        <div className="grid grid-cols-4 gap-8 mb-12 w-full max-w-6xl px-8">
          {allCombatants
            .filter((c) => c.type === "player")
            .map((player) => (
              <div
                key={player.id}
                className="bg-[#1a1f2e] rounded-2xl p-6 flex flex-col items-center border border-white/10 relative"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-[#37F2D1]">
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-2xl">
                      {player.name[0]}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {player.name}
                </h3>
                {player.initiative_rolled ? (
                  <div className="text-4xl font-bold text-[#37F2D1]">
                    {player.initiative}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">Rolling...</div>
                )}
              </div>
            ))}
        </div>

        {/* Player's own initiative die */}
        {!initiativeRoll &&
          !allCombatants.find(
            (c) => c.id === `player-${user?.id}` && c.initiative_rolled
          ) && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-[200px] h-[200px] relative">
                <DiceRoller
                  ref={diceRollerRef}
                  isOpen={true}
                  embedded={true}
                  initialDice="d20"
                  config={campaignConfig}
                  onRollComplete={onInitiativeRollComplete}
                  primaryColor={
                    currentUserProfile?.profile_color_1 || "#FF5722"
                  }
                  secondaryColor={
                    currentUserProfile?.profile_color_2 || "#8B5CF6"
                  }
                />
                {!isRolling && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce text-[#37F2D1] font-bold text-xs whitespace-nowrap">
                    CLICK TO ROLL
                  </div>
                )}
              </div>
            </div>
          )}

        {/* GM confirms order */}
        {isGM && (
          <div className="mt-8">
            <button
              onClick={onEndTurn}
              className="bg-[#37F2D1] text-[#1E2430] px-8 py-4 rounded-full text-xl font-bold hover:bg-[#2dd9bd] transition-colors shadow-[0_0_30px_rgba(55,242,209,0.4)]"
            >
              Start Combat
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // COMBAT MODE
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-7xl flex-1 flex items-center justify-center gap-12 relative px-4 z-10 pointer-events-none">
        {/* LEFT: Actor side */}
        <div className="flex items-center gap-4 pointer-events-auto">
          {!isSpectator && (
            <div className="flex flex-col gap-2 items-end">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">
                Up Next
              </span>
              {getQueueAvatars("left").map((c, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full border-2 border-slate-700 overflow-hidden bg-[#050816] shadow-lg relative group"
                >
                  {c.avatar || c.avatar_url || c.image_url ? (
                    <img
                      src={c.avatar || c.avatar_url || c.image_url}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                      {c.name?.[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 text-[8px] text-white text-center leading-tight transition-opacity">
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex flex-col items-center gap-2">
            <div className="w-48 h-48 rounded-full border-4 border-[#37F2D1] overflow-hidden shadow-[0_0_50px_rgba(55,242,209,0.3)] bg-[#1a1f2e] relative z-10">
              {actor ? (
                <img
                  src={
                    actor.avatar_url ||
                    actor.image_url ||
                    actor.profile_avatar_url
                  }
                  alt={actor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-slate-600">
                  ?
                </div>
              )}
            </div>
            <div className="bg-[#050816] border border-[#37F2D1] text-[#37F2D1] px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap z-20">
              {actor?.name || "Actor"}
            </div>
            {/* Actor HP (actor always sees own HP) */}
            {actor?.hit_points && (
              <>
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${
                        Math.min(
                          100,
                          ((actor.hit_points.current || 0) /
                            (actor.hit_points.max || 1)) *
                            100
                        ) || 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">
                  {actor.hit_points.current || 0} / {actor.hit_points.max || 0}{" "}
                  HP
                </span>
              </>
            )}
          </div>
        </div>

        {/* CENTER: Dice + result */}
        <div className="flex-1 max-w-md flex flex-col items-center justify-center text-center z-20 pointer-events-auto">
          <h2 className="text-3xl font-black text-white mb-8 tracking-wider drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] flex items-center gap-3">
            <span className="text-[#37F2D1]">{actor?.name || "You"}</span>
            {(flowType === "attack" || flowType === "saving_throw" || target) && (
              <>
                <span className="text-slate-500 text-xl">
                  {flowType === "skill_check" && resolved?.contested
                    ? "VS"
                    : flowType === "saving_throw"
                    ? "→"
                    : "VS"}
                </span>
                <span className="text-red-500">{target?.name || (flowType === "skill_check" ? "" : "Target")}</span>
              </>
            )}
            {flowType === "skill_check" && !target && resolved?.skill && (
              <span className="text-[#37F2D1] text-xl">— {resolved.skill}</span>
            )}
          </h2>

          {/* Attack result line */}
          <div className="h-16 flex items-end justify-center mb-4 relative z-20 mt-12">
            <AnimatePresence>
              {(phase === "attack_result" || phase === "damage_result") &&
                attackRoll && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-white font-bold text-2xl flex items-center gap-2 bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg"
                  >
                    <span
                      className={
                        attackRoll.isCrit
                          ? "text-yellow-400 animate-pulse"
                          : "text-slate-300"
                      }
                    >
                      {attackRoll.d20 === 20 ? "NAT 20" : attackRoll.d20}
                    </span>
                    {!attackRoll.isCrit && attackRoll.mod !== 0 && (
                      <span className="text-slate-400 text-lg">
                        {attackRoll.mod > 0 ? "+" : ""}
                        {attackRoll.mod}
                      </span>
                    )}
                    <span className="mx-1">=</span>
                    <span
                      className={
                        attackRoll.isCrit
                          ? "text-yellow-400 text-3xl"
                          : attackRoll.total >= targetAC
                          ? "text-[#37F2D1]"
                          : "text-red-500"
                      }
                    >
                      {attackRoll.isCrit ? "CRIT!" : attackRoll.total}
                    </span>
                    {!attackRoll.isCrit && (
                      <span className="text-slate-500 text-sm ml-2 pl-2 border-l border-slate-600">
                        vs AC {targetAC}
                      </span>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>
          </div>

          {/* Dice container */}
          <div className="w-[300px] h-[300px] relative flex items-center justify-center mb-4">
            {phase === "ready" ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-slate-600 flex flex-col items-center"
              >
                <Swords className="w-32 h-32 opacity-20 mb-4" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  {flowType === "skill_check"
                    ? `Ready — ${resolved?.skill || "Skill"} Check`
                    : flowType === "saving_throw"
                    ? `${target?.name || "Target"} — ${(resolved?.save || "DEX").toUpperCase()} Save`
                    : "Ready to Attack"}
                </p>
              </motion.div>
            ) : (
              <>
                <div className="absolute inset-0 z-10">
                  <DiceRoller
                    ref={diceRollerRef}
                    isOpen={true}
                    embedded={true}
                    initialDice={currentDice}
                    config={campaignConfig}
                    forcedResult={
                      isSpectator
                        ? phase === "attack_result"
                          ? attackRoll?.d20
                          : phase === "damage_result"
                          ? damageRoll?.dice
                          : null
                        : null
                    }
                    onRollComplete={
                      isSpectator
                        ? () => setIsRolling(false)
                        : phase === "rolling_attack"
                        ? onAttackRollComplete
                        : phase === "rolling_damage"
                        ? onDamageRollComplete
                        : phase === "rolling_check"
                        ? onSkillCheckRollComplete
                        : phase === "rolling_save"
                        ? onSavingThrowRollComplete
                        : () => setIsRolling(false)
                    }
                    primaryColor={
                      currentUserProfile?.profile_color_1 || "#FF5722"
                    }
                    secondaryColor={
                      currentUserProfile?.profile_color_2 || "#8B5CF6"
                    }
                  />
                </div>

                {(phase === "rolling_attack" ||
                  phase === "rolling_damage" ||
                  phase === "rolling_check" ||
                  phase === "rolling_save") && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-50 animate-pulse">
                    <span className="text-white text-sm font-bold bg-black/30 px-3 py-1 rounded-full">
                      Click to Roll
                    </span>
                  </div>
                )}

                <AnimatePresence>
                  {(phase === "attack_result" ||
                    phase === "damage_result") && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                      {!damageRoll && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45, opacity: 0 }}
                          animate={{
                            scale: [0, 1.5, 1],
                            rotate: [-45, 0, -5],
                            opacity: 1,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 15,
                          }}
                          className={`absolute -right-16 -top-12 text-6xl font-black ${
                            isHit ? "text-[#37F2D1]" : "text-red-500"
                          } drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]`}
                          style={{
                            textShadow: isHit
                              ? "0 0 20px #37F2D1"
                              : "0 0 20px #ef4444",
                          }}
                        >
                          {isHit ? (isCrit ? "CRITICAL!" : "HIT!") : "MISS"}
                        </motion.div>
                      )}

                      {damageRoll && (
                        <motion.div
                          initial={{ scale: 0, y: 50 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                          className="bg-gradient-to-br from-red-600 to-red-800 text-white w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.8)] border-4 border-white z-50"
                        >
                          <span className="text-5xl font-black drop-shadow-md">
                            {damageRoll.total}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest opacity-90">
                            Damage
                          </span>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {phase === "check_result" && skillCheckRoll && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="bg-gradient-to-br from-[#37F2D1] to-[#0ea5e9] text-[#050816] w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(55,242,209,0.7)] border-4 border-white z-50"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                          {skillCheckRoll.skill}
                        </span>
                        <span className="text-5xl font-black drop-shadow-md">
                          {skillCheckRoll.total}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          {skillCheckRoll.d20}
                          {skillCheckRoll.mod >= 0 ? " + " : " − "}
                          {Math.abs(skillCheckRoll.mod)}
                        </span>
                      </motion.div>
                    </div>
                  )}

                  {phase === "save_result" && savingThrowRoll && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className={`${
                          savingThrowRoll.success
                            ? "bg-gradient-to-br from-[#37F2D1] to-[#0ea5e9] text-[#050816]"
                            : "bg-gradient-to-br from-red-600 to-red-800 text-white"
                        } w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border-4 border-white z-50`}
                      >
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                          {savingThrowRoll.ability.toUpperCase()} SAVE
                        </span>
                        <span className="text-5xl font-black drop-shadow-md">
                          {savingThrowRoll.total}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                          vs DC {savingThrowRoll.dc}
                        </span>
                        <span className="text-sm font-black uppercase tracking-widest mt-1">
                          {savingThrowRoll.success ? "SAVED" : "FAILED"}
                        </span>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Interaction Buttons (actor vs spectator) */}
          <div className="w-full max-w-xs space-y-3 relative z-30 min-h-[60px]">
            {isSpectator ? (
              <div className="bg-black/60 backdrop-blur text-white px-6 py-3 rounded-xl border border-white/10 text-center flex flex-col gap-2">
                {spectatorData?.action && (
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-white/10 pb-1 mb-1">
                    USING {spectatorData.action.name}
                  </div>
                )}
                <p className="text-sm font-bold text-[#37F2D1] animate-pulse">
                  {phase === "ready" && "PREPARING..."}
                  {phase === "rolling_attack" && "ROLLING ATTACK..."}
                  {phase === "attack_result" &&
                    (isHit
                      ? "ATTACK HIT! WAITING FOR DAMAGE..."
                      : "ATTACK MISSED")}
                  {phase === "rolling_damage" && "ROLLING DAMAGE..."}
                  {phase === "damage_result" && "DAMAGE APPLIED"}
                  {phase === "rolling_check" && "ROLLING CHECK..."}
                  {phase === "check_result" && "CHECK COMPLETE"}
                  {phase === "rolling_save" && "ROLLING SAVE..."}
                  {phase === "save_result" && "SAVE RESOLVED"}
                </p>
              </div>
            ) : (
              <>
                {phase === "ready" && flowType === "attack" && (
                  <button
                    onClick={handleAttackRoll}
                    disabled={isRolling || !target}
                    className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-2xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(255,87,34,0.4)] border-b-4 border-[#c43e12] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    {isRolling ? "ROLLING..." : "ROLL ATTACK"}
                  </button>
                )}

                {phase === "ready" && flowType === "skill_check" && (
                  <button
                    onClick={handleSkillCheckRoll}
                    disabled={isRolling}
                    className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] disabled:opacity-50 disabled:cursor-not-allowed text-[#050816] text-xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(55,242,209,0.4)] border-b-4 border-[#0f766e] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    {isRolling
                      ? "ROLLING..."
                      : `ROLL ${(resolved?.skill || "SKILL").toUpperCase()} CHECK`}
                  </button>
                )}

                {phase === "ready" && flowType === "saving_throw" && (
                  <button
                    onClick={handleSavingThrowRoll}
                    disabled={isRolling || !target}
                    className="w-full bg-[#8B5CF6] hover:bg-[#7c4dff] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(139,92,246,0.4)] border-b-4 border-[#5b21b6] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    {isRolling
                      ? "ROLLING..."
                      : `ROLL ${(resolved?.save || "SAVE").toUpperCase()} SAVE`}
                  </button>
                )}

                {phase === "attack_result" && isHit && (
                  <button
                    onClick={handleDamageRoll}
                    className="w-full bg-red-600 hover:bg-red-500 text-white text-2xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.4)] border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    ROLL DAMAGE
                  </button>
                )}

                {(phase === "damage_result" ||
                  (phase === "attack_result" && !isHit) ||
                  phase === "check_result" ||
                  phase === "save_result") && (
                  <div className="flex flex-col gap-3 pt-8">
                    <button
                      onClick={() => {
                        if (onActionComplete) onActionComplete();
                        else onClose();
                      }}
                      className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] text-xl font-bold py-4 rounded-2xl shadow-[0_10px_30px_rgba(55,242,209,0.3)]"
                    >
                      DONE
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Target side — hide entirely for target-less flows (Hide, etc.) */}
        {!(flowType === "skill_check" && !target) && (
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="relative group flex flex-col items-center gap-2">
            {!isSpectator && (
              <button
                onClick={onSwitchTarget}
                className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#FF5722] hover:bg-[#FF6B3D] rounded-full z-30 flex items-center justify-center shadow-lg border-4 border-[#050816] transition-transform hover:scale-110"
                title="Switch Target"
              >
                <RefreshCw className="w-6 h-6 text-white" />
              </button>
            )}

            <div className="w-48 h-48 rounded-full border-4 border-red-500 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.3)] bg-[#1a1f2e] relative z-10">
              {target ? (
                <img
                  src={
                    target.avatar_url ||
                    target.image_url ||
                    target.profile_avatar_url ||
                    target.avatar
                  }
                  alt={target.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-6xl font-bold">
                  ?
                </div>
              )}
            </div>
            <div className="bg-[#050816] border border-red-500 text-red-500 px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap z-20">
              {target?.name || "No Target"}
            </div>

            {/* Target HP: bar always for players, numbers only for GM or when target is a player */}
            {target && target.hit_points && (
              <>
                {/* For players: they should see HP loss; for monsters, only bar (no numbers) for non-GM */}
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${
                        Math.min(
                          100,
                          ((target.hit_points.current || 0) /
                            (target.hit_points.max || 1)) *
                            100
                        ) || 0
                      }%`,
                    }}
                  />
                </div>
                {(isGM || target.type === "player") && (
                  <span className="text-[10px] text-gray-400">
                    {target.hit_points.current || 0} /{" "}
                    {target.hit_points.max || 0} HP
                  </span>
                )}
              </>
            )}
          </div>

          {!isSpectator && (
            <div className="flex flex-col gap-2 items-start">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">
                Up Next
              </span>
              {getQueueAvatars("right").map((c, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full border-2 border-slate-700 overflow-hidden bg-[#050816] shadow-lg relative group"
                >
                  {c.avatar || c.avatar_url || c.image_url ? (
                    <img
                      src={c.avatar || c.avatar_url || c.image_url}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                      {c.name?.[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 text-[8px] text-white text-center leading-tight transition-opacity">
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </motion.div>
  );
}
