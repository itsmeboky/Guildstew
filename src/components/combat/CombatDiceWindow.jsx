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
  getSpellDamageDice,
  getSpellEffect,
  getScaledDice,
  getUpcastDice,
} from "@/components/combat/actionResolver";
import { hpBarColor } from "@/components/combat/hpColor";
import { FACTION_STYLES, getFaction } from "@/utils/combatQueue";
import { getConditionModifiers } from "@/components/combat/conditions";

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
  sneakActive = false,
  onViewTurnOrder,
  spellDataList = [],
}) {
  const [selectedAction, setSelectedAction] = useState(initialAction);
  const [attackRoll, setAttackRoll] = useState(null);
  const [damageRoll, setDamageRoll] = useState(null);
  const [healRoll, setHealRoll] = useState(null);
  const [effectApplied, setEffectApplied] = useState(null);
  const [skillCheckRoll, setSkillCheckRoll] = useState(null);
  const [savingThrowRoll, setSavingThrowRoll] = useState(null);
  // Pair of d20s used when the roll has advantage or disadvantage.
  // rollPair = { dice: [d20a, d20b], chosen: 0|1 } on the attack /
  // save / check result so the render can dim the unused die.
  const [rollPair, setRollPair] = useState(null);
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
  const baseFlowType = resolved?.rollType || "attack"; // attack | skill_check | saving_throw | no_roll

  // Spell effect lookup — post-roll behaviour for known spells (damage,
  // heal, condition, buff, debuff, utility). When null we fall back to
  // the generic attack → damage pipeline.
  const spellName =
    selectedAction?.type === "spell"
      ? selectedAction?.name ||
        selectedAction?.spell?.name ||
        selectedAction?.weapon?.name
      : null;
  // Look the spell row up in the cached list from the parent so the
  // classifier can inspect the description. Fallback map still wins
  // via getSpellEffect's internal precedence.
  const spellData = React.useMemo(() => {
    if (!spellName || !Array.isArray(spellDataList) || spellDataList.length === 0) {
      return null;
    }
    return (
      spellDataList.find(
        (s) => s?.name && s.name.toLowerCase() === spellName.toLowerCase(),
      ) || null
    );
  }, [spellName, spellDataList]);
  const spellEffect = getSpellEffect(spellName, spellData);
  const casterLevel = actor?.level || actor?.stats?.level || 1;

  // A spell requires Concentration if its duration field contains the
  // word (e.g. "Concentration, up to 1 minute"). We also honour an
  // explicit `concentration: true` flag on the spell row for edge
  // cases where the duration is formatted oddly.
  const requiresConcentration = React.useMemo(() => {
    if (!spellData) return false;
    if (spellData.concentration === true) return true;
    const duration = (spellData.duration || "").toString().toLowerCase();
    return duration.includes("concentration");
  }, [spellData]);

  // Condition-driven roll modifiers. Derived from actor.conditions /
  // target.conditions arrays — the GM panel attaches these when it
  // passes the combatants in. rollType is resolved below via flowType,
  // so this memoizes as a callback and is called just-in-time in the
  // roll handlers.
  const computeConditionModifiers = React.useCallback(
    (rollType) =>
      getConditionModifiers(
        actor,
        target,
        rollType,
        selectedAction?.mode || null,
      ),
    [actor, target, selectedAction?.mode],
  );

  // Live preview for the banners above the roll button. We compute it
  // based on the current flow so the GM sees disadvantage warnings
  // before even pressing the roll button.
  const previewRollType =
    resolved?.rollType === "skill_check"
      ? "skill_check"
      : resolved?.rollType === "saving_throw"
      ? "saving_throw"
      : "attack";
  const conditionPreview = React.useMemo(
    () => getConditionModifiers(actor, target, previewRollType, selectedAction?.mode || null),
    [actor, target, previewRollType, selectedAction?.mode],
  );

  // Cast level: for a cantrip this is always 0 and we apply character-
  // level scaling. For a leveled spell this is the slot level the GM/
  // player chose (defaults to the spell's base level if unspecified).
  const baseSpellLevel =
    typeof selectedAction?.level === "number" ? selectedAction.level : 0;
  const castLevel =
    typeof selectedAction?.castLevel === "number"
      ? selectedAction.castLevel
      : baseSpellLevel;

  // Resolve the actual dice string for this spell instance, honoring
  // cantrip scaling and upcasting. Called from both the damage path
  // and the heal path so behaviour stays consistent.
  const getEffectiveSpellDice = React.useCallback(
    (baseDice) => {
      if (!baseDice) return baseDice;
      // Cantrips auto-scale with character level; they never upcast.
      if (spellEffect?.scaling === "cantrip") {
        return getScaledDice(baseDice, casterLevel);
      }
      // Leveled spells: apply upcast when cast above base.
      const extraLevels = Math.max(0, castLevel - baseSpellLevel);
      if (extraLevels > 0) {
        return getUpcastDice(baseDice, spellEffect?.upcastPerLevel, extraLevels);
      }
      return baseDice;
    },
    [spellEffect, casterLevel, castLevel, baseSpellLevel],
  );

  // Some spell effects override the resolver's rollType. Heal, buff
  // and utility spells never need an attack roll or save even if the
  // resolver classified them differently. For those we jump into a
  // dedicated "heal" or "effect" flow.
  let flowType = baseFlowType;
  if (spellEffect) {
    if (spellEffect.effect === "heal") flowType = "heal";
    else if (
      spellEffect.effect === "buff" ||
      spellEffect.effect === "utility" ||
      (spellEffect.effect === "condition" && baseFlowType !== "saving_throw") ||
      (spellEffect.effect === "debuff" && baseFlowType !== "saving_throw")
    ) {
      flowType = "effect";
    }
    // Magic Missile (autoHit) still deals damage but skips the attack
    // roll — treat it like an effect flow that rolls damage.
    if (spellEffect.autoHit) flowType = "auto_damage";
  }

  // Shared helper — fire a concentration_start event when a spell
  // with a Concentration duration successfully takes effect. Called
  // from each apply site (effect_applied, save failure, damage hit).
  const emitConcentrationStart = React.useCallback(() => {
    if (!requiresConcentration || !onRoll) return;
    if (!actor?.id || !spellName) return;
    onRoll({
      type: "concentration_start",
      casterId: actor.id,
      casterName: actor?.name,
      spell: spellName,
      spellLevel:
        typeof selectedAction?.castLevel === "number"
          ? selectedAction.castLevel
          : selectedAction?.level || 0,
      targetIds: target?.id ? [target.id] : [],
    });
  }, [requiresConcentration, onRoll, actor?.id, actor?.name, spellName, selectedAction, target?.id]);

  // Parse a "NdF" / "NdF+M" / "NdF+NdF" style dice string into a number.
  // Rolls deterministically via Math.random for simple forms, and just
  // sums parts for compound dice. Used by heal and auto-damage flows.
  const rollDiceString = React.useCallback((diceString) => {
    if (!diceString || typeof diceString !== "string") return 0;
    let total = 0;
    // Split on '+' to handle things like "3d4+3" and "2d8+4d6".
    const parts = diceString.split("+").map((p) => p.trim());
    for (const part of parts) {
      const diceMatch = part.match(/^(\d+)d(\d+)$/);
      if (diceMatch) {
        const n = parseInt(diceMatch[1], 10);
        const f = parseInt(diceMatch[2], 10);
        for (let i = 0; i < n; i++) {
          total += Math.floor(Math.random() * f) + 1;
        }
        continue;
      }
      const flat = parseInt(part, 10);
      if (Number.isFinite(flat)) total += flat;
    }
    return total;
  }, []);

  // Caster's spellcasting ability mod — used for heal spells with
  // addMod: true. Mirrors the logic in getModifier's spell branch.
  const getSpellAbilityMod = React.useCallback(() => {
    if (!actor) return 0;
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
    return Math.floor((score - 10) / 2);
  }, [actor]);

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
    setHealRoll(null);
    setEffectApplied(null);
    setSkillCheckRoll(null);
    setSavingThrowRoll(null);
    setInitiativeRoll(null);
    setRollPair(null);
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

  // Is this an unarmed strike? Either the action says so (mode=='unarmed')
  // or the weapon is flagged as Unarmed.
  const isUnarmedAttack = () => {
    if (selectedAction?.mode === "unarmed") return true;
    const weapon = selectedAction?.weapon;
    return !!weapon?.properties?.includes?.("Unarmed");
  };

  // Whether the current actor is a Monk (they get Martial Arts die + best of STR/DEX).
  const isMonkActor = () => {
    const cls = (actor?.class || actor?.stats?.class || "").toLowerCase();
    return cls.includes("monk");
  };

  // Monk Martial Arts die scales with level.
  const monkMartialArtsDie = () => {
    const level = actor?.level || actor?.stats?.level || 1;
    if (level >= 17) return "1d10";
    if (level >= 11) return "1d8";
    if (level >= 5) return "1d6";
    return "1d4";
  };

  // Rogue Sneak Attack dice count. Requirements:
  //   - Sneak toggle active (set by the parent)
  //   - Actor class includes "Rogue"
  //   - Weapon is finesse or ranged (melee unarmed / non-finesse doesn't
  //     qualify)
  // Returns 1d6 per 2 Rogue levels rounded up (1-2 → 1d6, 3-4 → 2d6, etc).
  // Multiclass: for now we simplify and use the character's full level as
  // the rogue level; proper multiclass tracking is a later feature.
  const getSneakAttackDiceCount = () => {
    if (!sneakActive) return 0;
    if (selectedAction?.type === "spell") return 0;
    const cls = (actor?.class || actor?.stats?.class || "").toLowerCase();
    if (!cls.includes("rogue")) return 0;
    const weapon = selectedAction?.weapon;
    // Unarmed strikes don't qualify for Sneak Attack.
    const isFinesse = !!weapon?.properties?.includes?.("Finesse");
    const isRangedWeapon = !!weapon?.category?.includes?.("Ranged");
    if (!isFinesse && !isRangedWeapon) return 0;
    const level = actor?.level || actor?.stats?.level || 1;
    return Math.ceil(level / 2);
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

    const weapon = selectedAction?.weapon;
    const str = actor.attributes?.str || actor.stats?.strength || 10;
    const dex = actor.attributes?.dex || actor.stats?.dexterity || 10;
    const proficiency =
      actor.proficiency_bonus || actor.stats?.proficiency_bonus || 2;
    const strMod = Math.floor((str - 10) / 2);
    const dexMod = Math.floor((dex - 10) / 2);
    const isFinesse = !!weapon?.properties?.includes?.("Finesse");
    const isRangedWeapon = !!weapon?.category?.includes?.("Ranged");

    // Unarmed: Monk uses the best of STR/DEX (Martial Arts); everyone
    // else just STR.
    if (isUnarmedAttack()) {
      return (isMonkActor() ? Math.max(strMod, dexMod) : strMod) + proficiency;
    }

    // Explicit mode hints from the 4-state attack toggle take priority
    // over property sniffing, but finesse still lets melee pick the
    // higher of STR/DEX (that's the whole point of the property).
    const mode = selectedAction?.mode;
    if (mode === "ranged" || isRangedWeapon) {
      // Ranged: always DEX. (Thrown finesse like a dagger is rare —
      // the GM can switch to melee mode for that case.)
      return dexMod + proficiency;
    }
    if (isFinesse) {
      // Finesse weapons (rapier, shortsword, scimitar, whip, dagger,
      // etc.) pick the higher of STR or DEX.
      return Math.max(strMod, dexMod) + proficiency;
    }
    // Default melee: STR.
    return strMod + proficiency;
  };

  const handleAttackRoll = () => {
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_attack");
    onRoll && onRoll({ type: "rolling_attack" });
  };

  const onAttackRollComplete = (roll) => {
    const mod = getModifier();
    const { hasAdvantage, hasDisadvantage, isAutoCrit } =
      computeConditionModifiers("attack");

    // Advantage / disadvantage: roll a second d20 silently, pick the
    // higher / lower. The DiceRoller animation only ever shows one
    // die, so the "paired" die is computed here and stored in
    // rollPair for the result render.
    let d20 = roll;
    let pair = null;
    if (hasAdvantage || hasDisadvantage) {
      const second = Math.floor(Math.random() * 20) + 1;
      const [a, b] = [roll, second];
      const chosen = hasAdvantage
        ? (a >= b ? 0 : 1)
        : (a <= b ? 0 : 1);
      d20 = chosen === 0 ? a : b;
      pair = { dice: [a, b], chosen, mode: hasAdvantage ? "advantage" : "disadvantage" };
    }

    const nat20 = d20 === 20;
    const total = d20 + mod;
    // Auto-crit from conditions (Paralyzed / Unconscious melee) only
    // applies IF the attack actually hits. Nat 20 always crits.
    const willHit = nat20 || total >= (target?.stats?.armor_class || target?.armor_class || 10);
    const isCritFlag = nat20 || (isAutoCrit && willHit);
    const result = {
      total,
      d20,
      mod,
      isCrit: isCritFlag,
      advantage: hasAdvantage,
      disadvantage: hasDisadvantage,
      autoCrit: isAutoCrit && willHit,
      pair,
    };
    setIsCrit(isCritFlag);
    setAttackRoll(result);
    setRollPair(pair);
    setIsRolling(false);
    setPhase("attack_result");
    onRoll && onRoll({ type: "attack_result", roll: result });
  };

  const handleDamageRoll = () => {
    setIsRolling(true);
    onRoll && onRoll({ type: "rolling_damage" });

    const weapon = selectedAction?.weapon;
    // Unarmed damage die: Monk uses their scaling Martial Arts die, everyone
    // else uses 1d4. Weapon-backed attacks use the weapon's damage string.
    let weaponDice;
    if (isUnarmedAttack()) {
      weaponDice = isMonkActor() ? monkMartialArtsDie() : "1d4";
    } else {
      weaponDice =
        weapon?.damage ||
        (selectedAction?.type === "spell" ? "1d10" : "1d8");
    }

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
      // Weapon / unarmed damage mod. Same rules as the attack roll:
      //   - Unarmed: STR (Monk gets max(STR, DEX)).
      //   - Ranged weapon OR explicit ranged mode: DEX.
      //   - Finesse weapon (melee): max(STR, DEX).
      //   - Everything else: STR.
      const weapon = selectedAction?.weapon;
      const strMod = Math.floor(((actor?.attributes?.str || 10) - 10) / 2);
      const dexMod = Math.floor(((actor?.attributes?.dex || 10) - 10) / 2);
      const isFinesse = !!weapon?.properties?.includes?.("Finesse");
      const isRangedWeapon = !!weapon?.category?.includes?.("Ranged");
      const mode = selectedAction?.mode;

      if (isUnarmedAttack()) {
        mod = isMonkActor() ? Math.max(strMod, dexMod) : strMod;
      } else if (mode === "ranged" || isRangedWeapon) {
        mod = dexMod;
      } else if (isFinesse) {
        mod = Math.max(strMod, dexMod);
      } else {
        mod = strMod;
      }
      // Off-hand: no positive ability mod unless they have Two-Weapon Fighting style
      if (isOffHand && mod > 0) mod = 0;
    }

    // Unarmed damage uses 1d4 (or Monk Martial Arts die), not the weapon damage.
    let diceString;
    if (isUnarmedAttack()) {
      diceString = isMonkActor() ? monkMartialArtsDie() : "1d4";
    } else if (selectedAction?.type === "spell") {
      // Prefer the SPELL_EFFECTS entry (with cantrip scaling AND
      // upcasting) over the bare damage-dice table. Fall through to
      // the legacy table and a 1d10 safety net for unknown spells.
      const effectDice = spellEffect?.dice;
      const scaled = getEffectiveSpellDice(effectDice);
      diceString =
        scaled ||
        getSpellDamageDice(spellName) ||
        selectedAction?.weapon?.damage ||
        "1d10";
    } else {
      diceString = selectedAction?.weapon?.damage || "1d8";
    }
    // Compound spell dice (e.g. "2d8+4d6" for Ice Storm, "3d4+3" for
    // Magic Missile) aren't captured by the simple single-term regex
    // below, so fall back to rollDiceString for any dice string that
    // contains a '+'. Weapons only ever have a single term, so this
    // only ever matters for spell damage.
    const isCompoundDice = typeof diceString === "string" && diceString.includes("+");

    let total;
    let numDice;
    const match = diceString.match(/(\d+)d(\d+)/);
    const faces = match ? parseInt(match[2], 10) : 8;

    if (isCompoundDice) {
      numDice = match ? parseInt(match[1], 10) : 1;
      // Crit still doubles dice on compound spell damage — roll the
      // whole expression twice and sum.
      total = rollDiceString(diceString);
      if (isCrit) total += rollDiceString(diceString);
    } else {
      numDice = match ? parseInt(match[1], 10) : 1;
      // Crit: double number of dice
      if (isCrit) numDice *= 2;

      total = roll; // visible die
      for (let i = 1; i < numDice; i++) {
        total += Math.floor(Math.random() * faces) + 1;
      }
    }

    // Rogue Sneak Attack: add extra d6s when the sneak toggle is on, the
    // actor is a Rogue, and the weapon is finesse/ranged. Crit doubles the
    // sneak dice the same as the weapon dice. The dice roller only shows
    // the visible weapon die; sneak dice are added to the total silently
    // and surfaced in the result detail.
    const sneakDiceBase = getSneakAttackDiceCount();
    let sneakDamage = 0;
    if (sneakDiceBase > 0) {
      const sneakCount = isCrit ? sneakDiceBase * 2 : sneakDiceBase;
      for (let i = 0; i < sneakCount; i++) {
        sneakDamage += Math.floor(Math.random() * 6) + 1;
      }
      total += sneakDamage;
    }

    const totalDamage = Math.max(0, total + mod);
    const result = {
      total: totalDamage,
      dice: total,
      mod,
      isCrit,
      sneakDice: sneakDiceBase,
      sneakDamage,
    };
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

    // damage_condition spells: after damage resolves, also broadcast
    // the condition so the parent can slap the label on the target.
    if (
      spellEffect?.effect === "damage_condition" &&
      spellEffect.condition &&
      target?.id &&
      onRoll
    ) {
      onRoll({
        type: "condition_applied",
        condition: spellEffect.condition,
        targetId: target.id,
      });
      emitConcentrationStart();
    }
  };

  // === Heal flow ===
  // Heal spells never have an attack roll or save — the caster spends
  // the slot and rolls the dice directly. Flow: ready → rolling_heal
  // → heal_result → DONE.
  const handleHealRoll = () => {
    setIsRolling(true);
    setCurrentDice("d20"); // visual only; the real roll is computed below
    setPhase("rolling_heal");
    onRoll && onRoll({ type: "rolling_heal" });
    // Roll + resolve immediately — the dice animation is just eye
    // candy on the shared DiceRoller, there's no target d20 for heals.
    setTimeout(() => onHealRollComplete(), 600);
  };

  const onHealRollComplete = () => {
    const flat = spellEffect?.flat;
    const baseDice = spellEffect?.dice;
    const scaledDice = getEffectiveSpellDice(baseDice);

    let rolled = 0;
    if (typeof flat === "number") {
      rolled = flat;
    } else if (scaledDice) {
      rolled = rollDiceString(scaledDice);
    } else {
      rolled = rollDiceString("1d8"); // safe default
    }

    const mod = spellEffect?.addMod ? getSpellAbilityMod() : 0;
    const total = Math.max(0, rolled + mod);
    const result = {
      total,
      dice: rolled,
      mod,
      diceString: scaledDice || (typeof flat === "number" ? `${flat}` : "1d8"),
    };
    setHealRoll(result);
    setIsRolling(false);
    setPhase("heal_result");

    if (target?.id && onRoll) {
      onRoll({
        type: "heal",
        value: total,
        detail: result,
        targetId: target.id,
      });
    }
  };

  // === Effect-apply flow (buff / debuff / utility / condition w/o save) ===
  // For spells that have no roll at all, jumping directly into an
  // "effect_applied" phase lets the GM confirm the spell took effect
  // and move on. The actual condition badge handling lives in the
  // parent; we just ship the label text back.
  const handleApplyEffect = () => {
    if (!spellEffect) return;
    const label =
      spellEffect.effect === "condition"
        ? `Applied: ${spellEffect.condition}`
        : spellEffect.effect === "buff"
        ? `Applied: ${spellEffect.buff}`
        : spellEffect.effect === "debuff"
        ? `Applied: ${spellEffect.debuff}`
        : spellEffect.effect === "utility"
        ? spellEffect.note || "Spell cast"
        : "Spell cast";
    const applied = {
      label,
      effect: spellEffect.effect,
      condition: spellEffect.condition,
      buff: spellEffect.buff,
      debuff: spellEffect.debuff,
      note: spellEffect.note,
    };
    setEffectApplied(applied);
    setPhase("effect_applied");

    // Broadcast to the parent so it can add the condition tag /
    // toast, if this effect should track one.
    if (onRoll) {
      if (spellEffect.effect === "condition" && target?.id) {
        onRoll({
          type: "condition_applied",
          condition: spellEffect.condition,
          targetId: target.id,
        });
      } else if (spellEffect.effect === "debuff" && target?.id) {
        onRoll({
          type: "debuff_applied",
          debuff: spellEffect.debuff,
          targetId: target.id,
        });
      } else if (spellEffect.effect === "buff") {
        onRoll({
          type: "buff_applied",
          buff: spellEffect.buff,
          targetId: target?.id || actor?.id,
        });
      } else if (spellEffect.effect === "utility") {
        onRoll({ type: "utility_applied", note: spellEffect.note });
      }
    }
    emitConcentrationStart();
  };

  // Auto-damage flow (Magic Missile — skips the attack roll). Works
  // just like handleHealRoll but commits damage and routes through the
  // normal damage_result phase so the existing render paths apply.
  const handleAutoDamage = () => {
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_damage");
    onRoll && onRoll({ type: "rolling_damage" });
    setTimeout(() => {
      const baseDice = spellEffect?.dice || "1d10";
      const scaled = getEffectiveSpellDice(baseDice);
      const total = rollDiceString(scaled);
      const result = {
        total,
        dice: total,
        mod: 0,
        isCrit: false,
        sneakDice: 0,
        sneakDamage: 0,
        diceString: scaled,
      };
      setDamageRoll(result);
      setIsRolling(false);
      setPhase("damage_result");

      if (target?.id && onRoll) {
        onRoll({
          type: "damage",
          value: total,
          detail: result,
          targetId: target.id,
        });
      }
    }, 600);
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
    const { hasAdvantage, hasDisadvantage } =
      computeConditionModifiers("skill_check");

    let d20 = roll;
    let pair = null;
    if (hasAdvantage || hasDisadvantage) {
      const second = Math.floor(Math.random() * 20) + 1;
      const [a, b] = [roll, second];
      const chosen = hasAdvantage
        ? (a >= b ? 0 : 1)
        : (a <= b ? 0 : 1);
      d20 = chosen === 0 ? a : b;
      pair = { dice: [a, b], chosen, mode: hasAdvantage ? "advantage" : "disadvantage" };
    }
    setRollPair(pair);

    const total = d20 + mod;

    // Contested check: Grapple / Shove aren't flat DC checks — the
    // target rolls back and the higher total wins (tie goes to the
    // defender, per 5e). The target picks Athletics OR Acrobatics —
    // whichever has the higher modifier for them.
    let contested = null;
    if (resolved?.contested && target) {
      const options = ["Athletics", "Acrobatics"];
      const best = options.reduce(
        (acc, s) => {
          const m = getSkillModifier(target, s);
          return acc == null || m > acc.mod ? { skill: s, mod: m } : acc;
        },
        null,
      );
      const targetD20 = Math.floor(Math.random() * 20) + 1;
      const targetMod = best?.mod || 0;
      const targetTotal = targetD20 + targetMod;
      // Tie goes to the defender (target) — the attacker must beat,
      // not match, the contested roll.
      const actorWins = total > targetTotal;
      contested = {
        targetName: target.name,
        targetSkill: best?.skill || "Athletics",
        targetD20,
        targetMod,
        targetTotal,
        winner: actorWins ? "actor" : "target",
      };
    }

    const result = {
      total,
      d20,
      mod,
      skill,
      contested,
      advantage: hasAdvantage,
      disadvantage: hasDisadvantage,
      pair,
    };
    setSkillCheckRoll(result);
    setIsRolling(false);
    setPhase("check_result");
    onRoll && onRoll({ type: "check_result", roll: result });
  };

  // === Saving Throw flow (target rolls) ===
  const handleSavingThrowRoll = () => {
    const { isAutoFail } = computeConditionModifiers("saving_throw");
    if (isAutoFail) {
      // Skip the d20 animation entirely — the save is mechanically
      // forced to fail. Synthesize a result and jump to save_result.
      const saveAbility = resolved?.save || "dex";
      const mod = getSaveModifier(target, saveAbility);
      const dc = getSpellSaveDC(actor);
      const result = {
        total: 0,
        d20: 0,
        mod,
        dc,
        success: false,
        ability: saveAbility,
        autoFail: true,
      };
      setSavingThrowRoll(result);
      setPhase("save_result");
      onRoll && onRoll({ type: "save_result", roll: result });
      // Still trigger the condition-apply hooks that live in the
      // shared save-result handler.
      if (target?.id && onRoll && spellEffect) {
        if (spellEffect.effect === "condition" && spellEffect.condition) {
          onRoll({
            type: "condition_applied",
            condition: spellEffect.condition,
            targetId: target.id,
          });
          emitConcentrationStart();
        } else if (spellEffect.effect === "debuff" && spellEffect.debuff) {
          onRoll({
            type: "debuff_applied",
            debuff: spellEffect.debuff,
            targetId: target.id,
          });
          emitConcentrationStart();
        }
      }
      return;
    }
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_save");
    onRoll && onRoll({ type: "rolling_save" });
  };

  const onSavingThrowRollComplete = (roll) => {
    const saveAbility = resolved?.save || "dex";
    const mod = getSaveModifier(target, saveAbility);
    const { hasAdvantage, hasDisadvantage } =
      computeConditionModifiers("saving_throw");

    let d20 = roll;
    let pair = null;
    if (hasAdvantage || hasDisadvantage) {
      const second = Math.floor(Math.random() * 20) + 1;
      const [a, b] = [roll, second];
      const chosen = hasAdvantage
        ? (a >= b ? 0 : 1)
        : (a <= b ? 0 : 1);
      d20 = chosen === 0 ? a : b;
      pair = { dice: [a, b], chosen, mode: hasAdvantage ? "advantage" : "disadvantage" };
    }
    setRollPair(pair);

    const total = d20 + mod;
    const dc = getSpellSaveDC(actor);
    const success = total >= dc;
    const result = {
      total,
      d20,
      mod,
      dc,
      success,
      ability: saveAbility,
      advantage: hasAdvantage,
      disadvantage: hasDisadvantage,
      pair,
    };
    setSavingThrowRoll(result);
    setIsRolling(false);
    setPhase("save_result");
    onRoll && onRoll({ type: "save_result", roll: result });

    // If the target failed a save against a condition / debuff spell,
    // broadcast the apply hook so the parent can tag them. Damage
    // spells that call for a save (Fireball, Ice Storm, etc.) don't
    // need this — they already flow through the damage pipeline.
    if (!success && target?.id && onRoll && spellEffect) {
      if (spellEffect.effect === "condition" && spellEffect.condition) {
        onRoll({
          type: "condition_applied",
          condition: spellEffect.condition,
          targetId: target.id,
        });
        emitConcentrationStart();
      } else if (spellEffect.effect === "debuff" && spellEffect.debuff) {
        onRoll({
          type: "debuff_applied",
          debuff: spellEffect.debuff,
          targetId: target.id,
        });
        emitConcentrationStart();
      }
    }
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

  // INITIATIVE MODE — bulk-roll display. All combatants (queued
  // monsters/NPCs + player characters) already have their rolls in
  // combat_data.order when we arrive here, so this screen is purely
  // a readout + a "View Turn Order" CTA. No dice are rolled on this
  // screen — the GM doesn't click a d20.
  if (mode === "initiative") {
    // Group by faction so enemies/allies/neutrals/players each get
    // their own section, sorted by total desc within each.
    const factionOrder = ["enemy", "ally", "neutral", "player"];
    const grouped = factionOrder
      .map((factionKey) => ({
        factionKey,
        style: FACTION_STYLES[factionKey],
        combatants: allCombatants
          .filter((c) => getFaction(c) === factionKey)
          .sort((a, b) => (b.initiative || 0) - (a.initiative || 0)),
      }))
      .filter((g) => g.combatants.length > 0);

    const handleViewTurnOrder = () => {
      if (onViewTurnOrder) onViewTurnOrder();
      else if (onClose) onClose();
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto py-12 px-6"
      >
        <button
          onClick={onClose}
          className="fixed top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-4xl font-black text-white mb-2 tracking-widest">
          INITIATIVE ROLL
        </h2>
        <p className="text-xs text-slate-400 tracking-widest uppercase mb-10">
          All combatants roll 1d20 + DEX mod
        </p>

        <div className="w-full max-w-6xl space-y-8">
          {grouped.map(({ factionKey, style, combatants }) => (
            <div key={factionKey}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: style.hex }}
                />
                <h3 className="text-[11px] uppercase tracking-[0.28em] font-bold text-slate-300">
                  {style.label === "Player" ? "Player Characters" : `${style.label}s`}
                </h3>
                <div className="flex-1 h-px bg-[#1e293b]" />
                <span className="text-[10px] text-slate-500">{combatants.length}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {combatants.map((c) => {
                  const raw = c.initiativeRoll;
                  const mod = c.initiativeMod || 0;
                  const total = c.initiative;
                  const modLabel =
                    mod === 0 ? "" : mod > 0 ? ` + ${mod}` : ` − ${Math.abs(mod)}`;
                  return (
                    <div
                      key={c.uniqueId || c.id}
                      className="bg-[#0b1220] rounded-2xl p-4 flex flex-col items-center border border-[#111827] relative"
                    >
                      {(() => {
                        const avatar =
                          c.avatar ||
                          c.avatar_url ||
                          c.image_url ||
                          c.profile_avatar_url;
                        return (
                          <div
                            className={`w-16 h-16 rounded-full overflow-hidden mb-3 border-2 ${style.outline}`}
                          >
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#1a1f2e] flex items-center justify-center text-xl text-slate-400 font-bold">
                                {c.name?.[0] || "?"}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <h4 className="text-xs font-bold text-white mb-1 truncate max-w-full">
                        {c.name}
                      </h4>
                      <div
                        className="text-5xl font-black leading-none tracking-tight"
                        style={{ color: style.hex }}
                      >
                        {typeof total === "number" ? total : "—"}
                      </div>
                      {typeof raw === "number" && (
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {raw}
                          {modLabel}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* GM advances to the arrangement / turn-order stage. Non-GMs
            just watch until the GM commits the order. */}
        {isGM && (
          <div className="mt-10">
            <button
              onClick={handleViewTurnOrder}
              className="bg-[#37F2D1] text-[#1E2430] px-10 py-4 rounded-full text-xl font-black tracking-wide hover:bg-[#2dd9bd] transition-colors shadow-[0_0_30px_rgba(55,242,209,0.4)]"
            >
              View Turn Order
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
            {(() => {
              const isActorPlayer = actor?.type !== 'monster' && actor?.type !== 'npc';
              const bubble = isActorPlayer
                ? 'bg-[#37F2D1]/20 text-[#37F2D1] border border-[#37F2D1]'
                : 'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]';
              return (
                <div className={`px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap z-20 ${bubble}`}>
                  {actor?.name || "Actor"}
                </div>
              );
            })()}
            {/* Actor HP (actor always sees own HP) — color driven by % */}
            {actor?.hit_points && (() => {
              const max = actor.hit_points.max || 0;
              const current = actor.hit_points.current ?? max;
              const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
              return (
                <>
                  <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700">
                    <div
                      className={`h-full ${hpBarColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {current} / {max} HP
                  </span>
                </>
              );
            })()}
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
                    {attackRoll.pair && (
                      <span className="flex items-center gap-1 mr-1 text-sm">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            attackRoll.pair.chosen === 0
                              ? attackRoll.pair.mode === "advantage"
                                ? "bg-[#22c55e]/30 text-[#22c55e]"
                                : "bg-red-500/30 text-red-300"
                              : "text-slate-600 line-through"
                          }`}
                        >
                          {attackRoll.pair.dice[0]}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {attackRoll.pair.mode === "advantage" ? "ADV" : "DIS"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            attackRoll.pair.chosen === 1
                              ? attackRoll.pair.mode === "advantage"
                                ? "bg-[#22c55e]/30 text-[#22c55e]"
                                : "bg-red-500/30 text-red-300"
                              : "text-slate-600 line-through"
                          }`}
                        >
                          {attackRoll.pair.dice[1]}
                        </span>
                      </span>
                    )}
                    {attackRoll.autoCrit && (
                      <span className="text-yellow-300 text-[10px] uppercase tracking-widest mr-1">
                        Auto-crit
                      </span>
                    )}
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
                          {damageRoll.sneakDice > 0 && (
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-yellow-300 drop-shadow">
                              +{damageRoll.sneakDice}d6 Sneak
                            </span>
                          )}
                          {spellEffect?.effect === "damage_condition" && spellEffect.condition && (
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-purple-200 drop-shadow">
                              +{spellEffect.condition}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {phase === "heal_result" && healRoll && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="bg-gradient-to-br from-[#22c55e] to-[#14532d] text-white w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.8)] border-4 border-white z-50"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest opacity-90">
                          Healed
                        </span>
                        <span className="text-5xl font-black drop-shadow-md">
                          +{healRoll.total}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                          {healRoll.dice}
                          {healRoll.mod > 0 ? ` + ${healRoll.mod}` : ""}
                        </span>
                      </motion.div>
                    </div>
                  )}

                  {phase === "effect_applied" && effectApplied && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className={`${
                          effectApplied.effect === "buff"
                            ? "bg-gradient-to-br from-[#37F2D1] to-[#0ea5e9]"
                            : effectApplied.effect === "utility"
                            ? "bg-gradient-to-br from-slate-500 to-slate-800"
                            : "bg-gradient-to-br from-[#8B5CF6] to-[#5b21b6]"
                        } text-white w-56 min-h-[9rem] rounded-[2rem] flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.75)] border-4 border-white z-50 px-4 py-3`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                          Spell Cast
                        </span>
                        <span className="text-center text-sm font-black uppercase tracking-wide mt-1 drop-shadow leading-tight">
                          {effectApplied.label}
                        </span>
                      </motion.div>
                    </div>
                  )}

                  {phase === "check_result" && skillCheckRoll && !skillCheckRoll.contested && (
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

                  {phase === "check_result" && skillCheckRoll?.contested && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="flex items-center gap-4 z-50"
                      >
                        {/* Actor roll */}
                        <div
                          className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.7)] border-4 ${
                            skillCheckRoll.contested.winner === 'actor'
                              ? 'bg-gradient-to-br from-[#37F2D1] to-[#0ea5e9] text-[#050816] border-white'
                              : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white/70 border-slate-500'
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">
                            {skillCheckRoll.skill}
                          </span>
                          <span className="text-4xl font-black drop-shadow-md">
                            {skillCheckRoll.total}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                            {skillCheckRoll.d20}
                            {skillCheckRoll.mod >= 0 ? ' + ' : ' − '}
                            {Math.abs(skillCheckRoll.mod)}
                          </span>
                        </div>

                        <span className="text-white text-xs font-black uppercase tracking-widest drop-shadow">VS</span>

                        {/* Target roll */}
                        <div
                          className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.7)] border-4 ${
                            skillCheckRoll.contested.winner === 'target'
                              ? 'bg-gradient-to-br from-red-500 to-red-800 text-white border-white'
                              : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white/70 border-slate-500'
                          }`}
                        >
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-center px-1 truncate max-w-[110px]">
                            {skillCheckRoll.contested.targetSkill}
                          </span>
                          <span className="text-4xl font-black drop-shadow-md">
                            {skillCheckRoll.contested.targetTotal}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                            {skillCheckRoll.contested.targetD20}
                            {skillCheckRoll.contested.targetMod >= 0 ? ' + ' : ' − '}
                            {Math.abs(skillCheckRoll.contested.targetMod)}
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center z-50"
                      >
                        <div
                          className={`text-sm font-black uppercase tracking-widest px-4 py-1 rounded-full ${
                            skillCheckRoll.contested.winner === 'actor'
                              ? 'bg-[#37F2D1]/20 text-[#37F2D1] border border-[#37F2D1]/50'
                              : 'bg-red-500/20 text-red-300 border border-red-500/50'
                          }`}
                        >
                          {skillCheckRoll.contested.winner === 'actor'
                            ? `${actor?.name || 'Actor'} wins the contest`
                            : `${skillCheckRoll.contested.targetName} resists`}
                        </div>
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
                {phase === "ready" && conditionPreview.warnings.length > 0 && (
                  <div className="w-full flex flex-col gap-1 mb-2">
                    {conditionPreview.hasAdvantage && (
                      <div className="w-full text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/50 rounded-lg py-1.5">
                        Rolling with Advantage
                      </div>
                    )}
                    {conditionPreview.hasDisadvantage && (
                      <div className="w-full text-center text-[11px] font-black uppercase tracking-[0.22em] text-red-400 bg-red-500/10 border border-red-500/50 rounded-lg py-1.5">
                        Rolling with Disadvantage
                      </div>
                    )}
                    {conditionPreview.isAutoCrit && (
                      <div className="w-full text-center text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300 bg-yellow-400/10 border border-yellow-400/50 rounded-lg py-1.5">
                        Auto-crit on melee hit
                      </div>
                    )}
                    {conditionPreview.isAutoFail && flowType === "saving_throw" && (
                      <div className="w-full text-center text-[11px] font-black uppercase tracking-[0.22em] text-red-300 bg-red-600/20 border border-red-500/60 rounded-lg py-1.5">
                        Auto-Fail Save
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto rounded-lg bg-black/50 border border-yellow-500/30 px-2 py-1">
                      {conditionPreview.warnings.map((w, i) => (
                        <div
                          key={i}
                          className="text-[10px] text-yellow-200/90 leading-snug"
                        >
                          • {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {phase === "ready" && flowType === "attack" && (
                  <button
                    onClick={handleAttackRoll}
                    disabled={isRolling || !target}
                    className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-2xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(255,87,34,0.4)] border-b-4 border-[#c43e12] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    {isRolling ? "ROLLING..." : "ROLL ATTACK"}
                  </button>
                )}

                {phase === "ready" && flowType === "heal" && (
                  <button
                    onClick={handleHealRoll}
                    disabled={isRolling || !target}
                    className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-2xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(34,197,94,0.4)] border-b-4 border-[#14532d] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    {isRolling ? "HEALING..." : "ROLL HEALING"}
                  </button>
                )}

                {phase === "ready" && flowType === "auto_damage" && (
                  <button
                    onClick={handleAutoDamage}
                    disabled={isRolling || !target}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-2xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.4)] border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    {isRolling ? "ROLLING..." : "ROLL DAMAGE"}
                  </button>
                )}

                {phase === "ready" && flowType === "effect" && (
                  <button
                    onClick={handleApplyEffect}
                    className="w-full bg-[#8B5CF6] hover:bg-[#7c4dff] text-white text-2xl font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(139,92,246,0.4)] border-b-4 border-[#5b21b6] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    CAST SPELL
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
                  phase === "save_result" ||
                  phase === "heal_result" ||
                  phase === "effect_applied") && (
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
            {(() => {
              const isTargetPlayer = target?.type !== 'monster' && target?.type !== 'npc';
              const bubble = isTargetPlayer
                ? 'bg-[#37F2D1]/20 text-[#37F2D1] border border-[#37F2D1]'
                : 'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]';
              return (
                <div className={`px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap z-20 ${bubble}`}>
                  {target?.name || "No Target"}
                </div>
              );
            })()}

            {/* Target HP — same green/yellow/red threshold palette as the
                actor side. Numbers only for GM or when target is a player. */}
            {target && target.hit_points && (() => {
              const max = target.hit_points.max || 0;
              const current = target.hit_points.current ?? max;
              const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
              return (
                <>
                  <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden mt-1 border border-gray-700">
                    <div
                      className={`h-full ${hpBarColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {(isGM || target.type === "player") && (
                    <span className="text-[10px] text-gray-400">
                      {current} / {max} HP
                    </span>
                  )}
                </>
              );
            })()}
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
