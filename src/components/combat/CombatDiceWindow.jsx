import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Swords, Music, Lightbulb } from "lucide-react";
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
import { logCombatEvent } from "@/utils/combatLog";
import { buildInspirationConsume } from "@/lib/combat/buildInspirationConsume";
import { getRule } from "@/engine/contentLayer";
import {
  abilityModifier as abilMod,
  proficiencyBonus as profBonus,
  SPELLCASTING_ABILITY,
  CLASS_SAVING_THROWS,
  sneakAttackDice as registrySneakAttackDice,
  cantripScaling as registryCantripScaling,
  CONCENTRATION,
  MONK_MARTIAL_ARTS_DIE,
  divineSmiteDice,
  spellSaveDC as spellSaveDCFn,
  getSpellSlots as getSpellSlotsFromRegistry,
  COVER,
} from "@/components/dnd5e/dnd5eRules";
import { safeText } from "@/utils/safeRender";

// Alias so the existing in-file lookups don't need renaming.
const CLASS_SPELL_ABILITY = SPELLCASTING_ABILITY;

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
  // When true AND viewer is spectator AND the rolling actor is
  // GM-controlled (attackerId not prefixed `player-`), the dice
  // canvas swaps to a "GM is rolling" placeholder so players see
  // SOMETHING happening but not the math. Final outcome (damage,
  // HP, log entries) still applies — only the dice animation
  // hides. Wired from campaign.settings.gm_screen_mode at the
  // panel mount sites.
  gmScreenMode = false,
  isOffHand = false,
  onActionComplete,
  isSpectator = false,
  spectatorData = null,
  sneakActive = false,
  onViewTurnOrder,
  spellDataList = [],
  extraAttackInfo = null, // { current: 2, total: 3 } → "Attack 2 of 3"
  homebrewRules = null,   // campaign.homebrew_rules — for getRule() overrides
  // Post-hit class features (Divine Smite, Stunning Strike, Bardic
  // Inspiration consumption). These hooks let the parent spend the
  // resource, apply conditions, and update combat_data.
  //
  //   spentSlots           : { [level]: spentCount } — caller's map of
  //                          spell slots already burned this combat.
  //                          Used to determine which Paladin slots are
  //                          available for Divine Smite.
  //   onDivineSmite        : (slotLevel) => void — caller should spend
  //                          the slot in its own state/store.
  //   onStunningStrike     : ({ saved, dc, roll }) => void — caller
  //                          should decrement ki, apply the Stunned
  //                          condition on save failure, and log.
  //   onBardicInspirationUse : ({ roll, newTotal, rollKind }) => void
  //                          Caller removes the inspiration from the
  //                          actor combatant record.
  spentSlots = {},
  onDivineSmite,
  onStunningStrike,
  onBardicInspirationUse,
  // Tier 3 consume callbacks. onLuckySpend decrements
  // classResources.luckyPointsRemaining in the parent; onInspirationUse
  // strips the hasInspiration flag from the actor combatant.
  onLuckySpend,
  onInspirationUse,
  // P.I.E. stat tracker — (field, amount?) → void. Parent passes a
  // closure that already knows the actor's characterId + campaignId
  // so the dice window only has to fire field names. Defaults to a
  // no-op so the dice window still works in isolation / Storybook.
  onStat = () => {},
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
  const [dicePopup, setDicePopup] = useState({
    open: false,
    dice: "d20",
    forcedResult: null,
    onComplete: null,
    // Optional modifier passthrough for DiceRoller's character-state
    // visual treatments (rage / inspiration / wildMagic / deathSave).
    // null falls through to the default base timeline — every existing
    // setDicePopup callsite that doesn't set this stays byte-identical.
    state: null,
  });
  const [initiativeRoll, setInitiativeRoll] = useState(null);
  // Post-hit prompt state. postHitOptions is a set of strings the
  // actor qualifies for on this hit ('divine_smite', 'stunning_strike').
  // postHitDecisions tracks whether each prompt has been resolved
  // (null = pending). bonusDamage carries the extra dice Divine Smite
  // will add on top of weapon damage.
  const [postHitOptions, setPostHitOptions] = useState([]);
  const [postHitDecisions, setPostHitDecisions] = useState({});
  const [bonusDamage, setBonusDamage] = useState(null);
  // Bardic Inspiration prompt — shown after any d20 roll when the
  // actor has `actor.bardicInspiration` set. The player can opt to
  // consume the die to add to the roll. `inspirationUsed` prevents
  // double-consumption if the user clicks more than once.
  const [inspirationConsumed, setInspirationConsumed] = useState(false);
  // Tier 3 resource prompts — independent toggles so Lucky + DM
  // Inspiration + Bardic Inspiration can coexist without fighting.
  const [luckyConsumed, setLuckyConsumed] = useState(false);
  const [inspirationDiceUsed, setInspirationDiceUsed] = useState(false);
  // Cover selector (per-attack). Applied to the target's AC when
  // rolling the attack. Not persisted on the combatant.
  const [targetCover, setTargetCover] = useState('none');
  // Uncanny Dodge decision (defender side). null = pending, 'use' =
  // reaction spent / halve damage, 'skip' = take full.
  const [uncannyDodge, setUncannyDodge] = useState(null);

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
    (rollType, saveAbility = null) =>
      getConditionModifiers(
        actor,
        target,
        rollType,
        selectedAction?.mode || null,
        saveAbility,
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
    return abilMod(score);
  }, [actor]);

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
    setPostHitOptions([]);
    setPostHitDecisions({});
    setBonusDamage(null);
    setInspirationConsumed(false);
    setLuckyConsumed(false);
    setInspirationDiceUsed(false);
    setTargetCover('none');
    setUncannyDodge(null);
  }, [isOpen, initialAction, mode]);

  // Spectator sync (follow campaign.combat_data.active_encounter)
  useEffect(() => {
    if (!isSpectator) return;

    // Encounter cleared (e.g., actor clicked Done after a miss, or
    // the GM cancelled). Reset the spectator's local roll state so
    // the NEXT encounter doesn't inherit a stale attackRoll /
    // damageRoll / phase. Without this, a missed attack's attackRoll
    // would persist into the next encounter and skew the spectator's
    // isHit computation (since attackRoll is non-null + targetAC
    // defaults to 10 on the spectator side, isHit erroneously
    // resolves true and the spectator UI thinks the previous miss
    // was a hit).
    if (!spectatorData) {
      setPhase("ready");
      setAttackRoll(null);
      setDamageRoll(null);
      setSkillCheckRoll(null);
      setSavingThrowRoll(null);
      setRollPair(null);
      setIsCrit(false);
      prevSpectatorDataRef.current = null;
      return;
    }

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
      setDicePopup({
        open: true,
        dice: "d20",
        // Mirror the rolling actor's character-state visual treatment
        // (rage glow, death-save EKG, inspiration sparkle, etc.) so
        // the spectator sees the same dice as the rolling player.
        // Defaults to "none" when the writer didn't send state — keeps
        // pre-fix encounters byte-identical.
        state: spectatorData.state || "none",
        forcedResult: spectatorData.attackRoll.d20,
        onComplete: () => {
          setDicePopup(p => ({ ...p, open: false }));
          setIsRolling(false);
        },
      });
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
      setDicePopup({
        open: true,
        dice: diceType,
        state: spectatorData.state || "none",
        forcedResult: spectatorData.damageRoll.dice,
        onComplete: () => {
          setDicePopup(p => ({ ...p, open: false }));
          setIsRolling(false);
        },
      });
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

  // Monk Martial Arts die scales with level — from the registry.
  const monkMartialArtsDie = () => {
    const level = actor?.level || actor?.stats?.level || 1;
    const dieFaces = MONK_MARTIAL_ARTS_DIE[level] || 4;
    return `1d${dieFaces}`;
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
    return registrySneakAttackDice(level);
  };

  // Attack modifier (weapon or spell)
  // Power Attack qualification — a weapon attack eligible for the
  // GWM / Sharpshooter toggle. GWM needs a Heavy melee weapon,
  // Sharpshooter needs a ranged weapon. Used by both attack and
  // damage flows below.
  const getPowerAttackKind = () => {
    if (!actor) return null;
    const active = !!actor?.classResources?.powerAttackActive;
    if (!active) return null;
    if (selectedAction?.type === 'spell') return null;
    const feats = Array.isArray(actor?.feats)
      ? actor.feats
      : Array.isArray(actor?.features) ? actor.features : [];
    const hasFeat = (n) => feats.some((f) => {
      const name = typeof f === 'string' ? f : f?.name;
      return typeof name === 'string' && name.toLowerCase() === n.toLowerCase();
    });
    const weapon = selectedAction?.weapon;
    const props = Array.isArray(weapon?.properties) ? weapon.properties : [];
    const mode = selectedAction?.mode;
    const isHeavyMelee = (mode === 'melee' || mode === 'offhand') &&
      props.some((p) => /heavy/i.test(String(p)));
    const isRanged = mode === 'ranged' || !!weapon?.category?.includes?.('Ranged');
    if (hasFeat('Great Weapon Master') && isHeavyMelee) return 'gwm';
    if (hasFeat('Sharpshooter') && isRanged) return 'sharpshooter';
    return null;
  };

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
      const mod = abilMod(score);
      const prof =
        actor.proficiency_bonus || actor.stats?.proficiency_bonus || 2;
      return mod + prof;
    }

    const weapon = selectedAction?.weapon;
    const str = actor.attributes?.str || actor.stats?.strength || 10;
    const dex = actor.attributes?.dex || actor.stats?.dexterity || 10;
    const proficiency =
      actor.proficiency_bonus || actor.stats?.proficiency_bonus || 2;
    const strMod = abilMod(str);
    const dexMod = abilMod(dex);
    const isFinesse = !!weapon?.properties?.includes?.("Finesse");
    const isRangedWeapon = !!weapon?.category?.includes?.("Ranged");

    let attackMod;

    // Unarmed: Monk uses the best of STR/DEX (Martial Arts); everyone
    // else just STR.
    if (isUnarmedAttack()) {
      attackMod = (isMonkActor() ? Math.max(strMod, dexMod) : strMod) + proficiency;
    } else {
      // Explicit mode hints from the 4-state attack toggle take priority
      // over property sniffing, but finesse still lets melee pick the
      // higher of STR/DEX (that's the whole point of the property).
      const mode = selectedAction?.mode;
      if (mode === "ranged" || isRangedWeapon) {
        // Ranged: always DEX. (Thrown finesse like a dagger is rare —
        // the GM can switch to melee mode for that case.)
        // (I) Fighting Style: Archery → +2 to ranged attack rolls.
        const archeryBonus = /archery/i.test(actor?.fighting_style || actor?.fightingStyle || '') ? 2 : 0;
        attackMod = dexMod + proficiency + archeryBonus;
      } else if (isFinesse || mode === "offhand") {
        // Finesse weapons + off-hand bonus attacks pick max(STR, DEX)
        // for the attack roll. Off-hand damage is stripped in
        // onDamageRollComplete unless Two-Weapon Fighting is set.
        attackMod = Math.max(strMod, dexMod) + proficiency;
      } else {
        // Default melee: STR.
        attackMod = strMod + proficiency;
      }
    }

    // Tier 3: Power Attack (GWM / Sharpshooter) — -5 to hit.
    if (getPowerAttackKind()) attackMod -= 5;
    return attackMod;
  };

  // Paladin spell-slot availability for Divine Smite. The caller hands
  // us their spentSlots map and we compute how many slots remain at
  // each level using the registry's getSpellSlots table.
  const getPaladinSlotsLeft = React.useCallback(() => {
    const actorClass = actor?.class || actor?.stats?.class || '';
    if (!/paladin/i.test(String(actorClass))) return [];
    const level = actor?.level || actor?.stats?.level || 1;
    const slotsTable = getSpellSlotsFromRegistry('Paladin', level);
    if (!Array.isArray(slotsTable)) return [];
    return slotsTable.map((max, idx) => {
      const slotLevel = idx + 1;
      const spent = (spentSlots || {})[slotLevel] || 0;
      return { slotLevel, max, spent, remaining: Math.max(0, max - spent) };
    }).filter((s) => s.max > 0);
  }, [actor, spentSlots]);

  const computePostHitOptions = React.useCallback(() => {
    const opts = [];
    const actorClass = actor?.class || actor?.stats?.class || '';
    const actorLevel = actor?.level || actor?.stats?.level || 1;
    const mode = selectedAction?.mode;
    // Both Divine Smite and Stunning Strike are "hit with a melee
    // weapon attack" effects — we include Monk unarmed strikes since
    // those count as melee weapon attacks for feature purposes.
    const isMelee = mode === 'melee' || mode === 'unarmed' || mode === 'offhand';
    if (!isMelee) return opts;
    if (selectedAction?.type === 'spell') return opts;

    // Divine Smite: Paladin 2+, any spell slot available.
    if (/paladin/i.test(String(actorClass)) && actorLevel >= 2) {
      const slots = getPaladinSlotsLeft();
      if (slots.some((s) => s.remaining > 0)) opts.push('divine_smite');
    }
    // Stunning Strike: Monk 5+, at least 1 ki remaining.
    if (/monk/i.test(String(actorClass)) && actorLevel >= 5) {
      const kiRemaining = actor?.classResources?.kiRemaining ?? 0;
      if (kiRemaining > 0) opts.push('stunning_strike');
    }
    return opts;
  }, [actor, selectedAction, getPaladinSlotsLeft]);

  // Resolves the active DiceRoller `modifier` for the rolling actor.
  // Auto-detects character-state visuals from existing tracking
  // (classResources.isRaging today). Inspiration is handled at its
  // dedicated reroll callsite — see `useInspirationAdvantage` —
  // because it's a per-roll opt-in mechanic that fires AFTER the
  // initial d20, not a passive state on the actor. Wild Magic has no
  // active-state tracking in production yet (subclass exists in data,
  // surge detection does not), so it stays "none" until a manual GM
  // toggle or auto-trigger lands as a separate task.
  const resolveDiceModifier = React.useCallback(
    (actorRef = actor) => {
      if (!actorRef) return "none";
      if (actorRef?.classResources?.isRaging) return "rage";
      return "none";
    },
    [actor]
  );

  const handleAttackRoll = () => {
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_attack");
    // Thread state into the rolling event so the parent's onRoll
    // handler can persist it onto combat_data.active_encounter,
    // which the spectator's effect above reads back to render the
    // matching DiceRoller modifier (rage / deathSave / inspiration /
    // wildMagic).
    onRoll && onRoll({ type: "rolling_attack", state: resolveDiceModifier() });
    // P.I.E. — track non-cantrip spell casts. Cantrips have level 0
    // / undefined; leveled spells fire spells_cast.
    if (selectedAction?.type === 'spell' && Number(selectedAction.level || 0) > 0) {
      onStat('spells_cast');
    }
    setDicePopup({
      open: true,
      dice: "d20",
      state: resolveDiceModifier(),
      forcedResult: isSpectator ? attackRoll?.d20 : null,
      onComplete: (value) => {
        setDicePopup(p => ({ ...p, open: false }));
        onAttackRollComplete(value);
      },
    });
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
    const baseAC = target?.stats?.armor_class || target?.armor_class || 10;
    const coverBonus = COVER?.[targetCover]?.acBonus || 0;
    const effectiveAC = baseAC + (Number.isFinite(coverBonus) ? coverBonus : 0);
    const willHit = nat20 || total >= effectiveAC;
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
    onRoll && onRoll({ type: "attack_result", roll: result, state: resolveDiceModifier() });

    // P.I.E. — fire-and-forget stat tracking. Parent already
    // scopes onStat to the actor's character + campaign.
    if (d20 === 20) onStat('nat_20s');
    else if (d20 === 1) onStat('nat_1s');
    if (willHit) {
      onStat('attacks_hit');
      if (isCritFlag) onStat('crits_landed');
    } else {
      onStat('attacks_missed');
    }

    // On a hit, check whether the attacker qualifies for any post-hit
    // class features (Divine Smite, Stunning Strike). If so, surface
    // them as prompts alongside the ROLL DAMAGE button.
    if (willHit) {
      const opts = computePostHitOptions();
      if (opts.length > 0) {
        setPostHitOptions(opts);
        const decisions = {};
        for (const o of opts) decisions[o] = null;
        setPostHitDecisions(decisions);
      } else {
        // Auto-advance to the damage roll so the player isn't stranded
        // on the HIT badge. Brief delay lets the badge register first.
        setTimeout(() => {
          handleDamageRoll();
        }, 900);
      }
    }

    // Campaign log — attack result line. Includes the advantage /
    // disadvantage prefix and the pair-dice readout when relevant so
    // the feed matches the on-screen animation.
    if (campaignId) {
      const targetAC = effectiveAC;
      const willHit = d20 === 20 || result.total >= targetAC;
      const weaponName =
        selectedAction?.type === "spell"
          ? selectedAction?.name || "spell"
          : selectedAction?.weapon?.name ||
            (selectedAction?.mode === "unarmed" ? "Unarmed" : "attack");
      const advPrefix = hasAdvantage
        ? " with advantage"
        : hasDisadvantage
        ? " with disadvantage"
        : "";
      const pairNote = pair
        ? ` — rolls ${pair.dice[0]}, ${pair.dice[1]} — takes ${pair.dice[pair.chosen]}`
        : ` — rolls ${d20}`;
      const outcome = result.isCrit
        ? "CRITICAL HIT!"
        : willHit
        ? "HIT!"
        : "MISS!";
      logCombatEvent(
        campaignId,
        `${actor?.name || "Actor"} attacks ${target?.name || "target"} with ${weaponName}${advPrefix}${pairNote} vs AC ${targetAC} — ${outcome}`,
        {
          event: willHit ? "attack_hit" : "attack_miss",
          category: "attack",
          actor: actor?.name,
          target: target?.name,
          weapon: weaponName,
          roll: result.total,
          d20,
          ac: targetAC,
          crit: result.isCrit,
          advantage: hasAdvantage,
          disadvantage: hasDisadvantage,
        },
      );
    }
  };

  // Divine Smite decision. Clicking a slot level commits that slot,
  // queues up the radiant dice as bonus damage, and marks the smite
  // decision resolved. The actual dice roll happens inside the normal
  // damage flow, which reads bonusDamage off state.
  // Bardic Inspiration consumption. Rolls the stored die, adds it to
  // the current roll's total, recomputes success/failure, and asks
  // the parent to strip the inspiration off the actor combatant. Only
  // available once per roll.
  const rollBardicInspiration = React.useCallback((kind) => {
    const insp = actor?.bardicInspiration;
    if (!insp?.die || inspirationConsumed) return;
    const faces = parseInt(String(insp.die).replace(/\D/g, ''), 10) || 8;
    const rolled = Math.floor(Math.random() * faces) + 1;

    let newTotal = 0;
    if (kind === 'attack' && attackRoll) {
      newTotal = attackRoll.total + rolled;
      const targetAC = target?.stats?.armor_class || target?.armor_class || 10;
      const willHit = attackRoll.d20 === 20 || newTotal >= targetAC;
      setAttackRoll({ ...attackRoll, total: newTotal, inspirationBonus: rolled });
      // Re-evaluate post-hit options if the roll just flipped to hit.
      if (willHit && !((attackRoll.d20 === 20) || (attackRoll.total >= targetAC))) {
        const opts = computePostHitOptions();
        if (opts.length > 0) {
          setPostHitOptions(opts);
          const decisions = {};
          for (const o of opts) decisions[o] = null;
          setPostHitDecisions(decisions);
        }
      }
    } else if (kind === 'skill' && skillCheckRoll) {
      newTotal = skillCheckRoll.total + rolled;
      setSkillCheckRoll({ ...skillCheckRoll, total: newTotal, inspirationBonus: rolled });
    } else if (kind === 'save' && savingThrowRoll) {
      newTotal = savingThrowRoll.total + rolled;
      const success = newTotal >= savingThrowRoll.dc;
      setSavingThrowRoll({ ...savingThrowRoll, total: newTotal, success, inspirationBonus: rolled });
    }

    setInspirationConsumed(true);
    // Source metadata (event name, log category, attribution shape)
    // comes from buildInspirationConsume so the bardic + standard
    // branches don't drift on event-type strings as future
    // inspiration sources land.
    const meta = buildInspirationConsume('bardic', insp);
    if (campaignId) {
      logCombatEvent(
        campaignId,
        `${actor?.name || 'Actor'} uses Bardic Inspiration! +${rolled} (new total: ${newTotal})`,
        {
          event: meta.eventType,
          category: meta.logCategory,
          actor: actor?.name,
          die: meta.attribution.die,
          roll: rolled,
          newTotal,
        },
      );
    }
    if (typeof onBardicInspirationUse === 'function') {
      onBardicInspirationUse({ roll: rolled, newTotal, rollKind: kind });
    }
    onRoll && onRoll({
      type: 'bardic_inspiration_used',
      actorId: actor?.id || actor?.uniqueId,
      roll: rolled,
      newTotal,
      rollKind: kind,
    });
  }, [actor, attackRoll, skillCheckRoll, savingThrowRoll, inspirationConsumed, target, campaignId, onBardicInspirationUse, onRoll, computePostHitOptions]);

  // Lucky feat — roll a second d20, keep whichever the player wants.
  // For simplicity we always take the better of the two rolls
  // automatically. On an attack the improved total is re-evaluated
  // against the target's AC (cover applied).
  const rollLuckyReroll = React.useCallback((kind) => {
    if (luckyConsumed) return;
    const reroll = Math.floor(Math.random() * 20) + 1;
    setLuckyConsumed(true);
    const targetAC = (target?.stats?.armor_class || target?.armor_class || 10) +
      (COVER?.[targetCover]?.acBonus || 0);
    if (kind === 'attack' && attackRoll) {
      const bestD20 = Math.max(attackRoll.d20, reroll);
      const newTotal = bestD20 + attackRoll.mod;
      const willHit = bestD20 === 20 || newTotal >= targetAC;
      setAttackRoll({ ...attackRoll, d20: bestD20, total: newTotal, luckyReroll: reroll, isCrit: bestD20 === 20 || attackRoll.isCrit });
      if (willHit) {
        const opts = computePostHitOptions();
        if (opts.length > 0) {
          setPostHitOptions(opts);
          const decisions = {};
          for (const o of opts) decisions[o] = null;
          setPostHitDecisions(decisions);
        }
      }
    } else if (kind === 'skill' && skillCheckRoll) {
      const bestD20 = Math.max(skillCheckRoll.d20, reroll);
      setSkillCheckRoll({ ...skillCheckRoll, d20: bestD20, total: bestD20 + skillCheckRoll.mod, luckyReroll: reroll });
    } else if (kind === 'save' && savingThrowRoll) {
      const bestD20 = Math.max(savingThrowRoll.d20, reroll);
      const newTotal = bestD20 + savingThrowRoll.mod;
      setSavingThrowRoll({ ...savingThrowRoll, d20: bestD20, total: newTotal, success: newTotal >= savingThrowRoll.dc, luckyReroll: reroll });
    }
    if (campaignId) {
      logCombatEvent(campaignId, `${actor?.name || 'Actor'} uses Lucky! Rolls ${reroll}, takes the better.`, {
        event: 'lucky_reroll', category: 'roll', actor: actor?.name, reroll,
      });
    }
    if (typeof onLuckySpend === 'function') onLuckySpend();
    onRoll && onRoll({ type: 'lucky_reroll', actorId: actor?.id, reroll });
  }, [actor, attackRoll, skillCheckRoll, savingThrowRoll, target, targetCover, luckyConsumed, campaignId, onRoll, onLuckySpend, computePostHitOptions]);

  // DM Inspiration — reroll with advantage. Spawns a real DiceRoller
  // d20 with `state: "inspiration"` so the player sees the gold
  // sparkle/notes treatment on the reroll instead of a silent number.
  // Pre-fix this called Math.random() inline; the visual was missing
  // entirely. The post-roll body (compare-and-keep, state writes,
  // campaign log, callbacks) is now invoked from onComplete with the
  // dice scene's actual d20 value.
  const useInspirationAdvantage = React.useCallback((kind) => {
    if (inspirationDiceUsed) return;
    setInspirationDiceUsed(true);
    setDicePopup({
      open: true,
      dice: "d20",
      state: "inspiration",
      forcedResult: null,
      onComplete: (reroll) => {
        setDicePopup(p => ({ ...p, open: false }));
        const targetAC = (target?.stats?.armor_class || target?.armor_class || 10) +
          (COVER?.[targetCover]?.acBonus || 0);
        if (kind === 'attack' && attackRoll) {
          const bestD20 = Math.max(attackRoll.d20, reroll);
          const newTotal = bestD20 + attackRoll.mod;
          const willHit = bestD20 === 20 || newTotal >= targetAC;
          setAttackRoll({ ...attackRoll, d20: bestD20, total: newTotal, inspirationReroll: reroll, isCrit: bestD20 === 20 || attackRoll.isCrit });
          if (willHit) {
            const opts = computePostHitOptions();
            if (opts.length > 0) {
              setPostHitOptions(opts);
              const decisions = {};
              for (const o of opts) decisions[o] = null;
              setPostHitDecisions(decisions);
            }
          }
        } else if (kind === 'skill' && skillCheckRoll) {
          const bestD20 = Math.max(skillCheckRoll.d20, reroll);
          setSkillCheckRoll({ ...skillCheckRoll, d20: bestD20, total: bestD20 + skillCheckRoll.mod });
        } else if (kind === 'save' && savingThrowRoll) {
          const bestD20 = Math.max(savingThrowRoll.d20, reroll);
          const newTotal = bestD20 + savingThrowRoll.mod;
          setSavingThrowRoll({ ...savingThrowRoll, d20: bestD20, total: newTotal, success: newTotal >= savingThrowRoll.dc });
        }
        // Source metadata (event name, log category) from
        // buildInspirationConsume — keeps the standard + bardic
        // branches in lockstep on event-type strings.
        const meta = buildInspirationConsume('standard');
        if (campaignId) {
          logCombatEvent(campaignId, `${actor?.name || 'Actor'} uses Inspiration! Advantage on the roll.`, {
            event: meta.eventType, category: meta.logCategory, actor: actor?.name, reroll,
          });
        }
        if (typeof onInspirationUse === 'function') onInspirationUse();
        onRoll && onRoll({ type: meta.eventType, actorId: actor?.id, reroll });
      },
    });
  }, [actor, attackRoll, skillCheckRoll, savingThrowRoll, target, targetCover, inspirationDiceUsed, campaignId, onRoll, onInspirationUse, computePostHitOptions]);

  const handleSmiteChoice = (slotLevel) => {
    if (slotLevel === 'skip') {
      setPostHitDecisions((prev) => ({ ...prev, divine_smite: 'skip' }));
      return;
    }
    const tType = (target?.stats?.type || target?.creature_type || '').toString().toLowerCase();
    const isUndeadOrFiend = /undead|fiend/.test(tType);
    const dice = divineSmiteDice(slotLevel, isUndeadOrFiend);
    setBonusDamage({ dice, type: 'radiant', label: 'Divine Smite', slotLevel });
    setPostHitDecisions((prev) => ({ ...prev, divine_smite: slotLevel }));
    if (typeof onDivineSmite === 'function') onDivineSmite(slotLevel);
    if (campaignId) {
      logCombatEvent(
        campaignId,
        `${actor?.name || 'Actor'} calls upon divine power! (+${dice} radiant)`,
        {
          event: 'divine_smite',
          category: 'attack',
          actor: actor?.name,
          target: target?.name,
          slotLevel,
          dice,
          isUndeadOrFiend,
        },
      );
    }
    onRoll && onRoll({
      type: 'divine_smite',
      slotLevel,
      dice,
    });
  };

  // Stunning Strike decision. Clicking Spend Ki rolls the target's CON
  // save silently, resolves success/failure, and signals the parent to
  // decrement ki and apply the Stunned condition on failure.
  const handleStunningStrike = (spend) => {
    if (!spend) {
      setPostHitDecisions((prev) => ({ ...prev, stunning_strike: 'skip' }));
      return;
    }
    const actorLevel = actor?.level || actor?.stats?.level || 1;
    const actorWis = actor?.attributes?.wis || actor?.stats?.wisdom || 10;
    const dc = spellSaveDCFn(profBonus(actorLevel), abilMod(actorWis));
    const conMod = abilMod(
      target?.attributes?.con ||
      target?.stats?.constitution ||
      target?.constitution ||
      10,
    );
    // Target CON save proficiency — if the target is proficient add
    // their proficiency bonus (CR-derived for monsters, level-derived
    // for characters). We don't track target proficiencies in detail,
    // so fall back to just their CON mod.
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + conMod;
    const saved = total >= dc;
    setPostHitDecisions((prev) => ({ ...prev, stunning_strike: saved ? 'saved' : 'stunned' }));
    if (typeof onStunningStrike === 'function') {
      onStunningStrike({ saved, dc, roll: total, d20, conMod });
    }
    if (campaignId) {
      const line = saved
        ? `${target?.name || 'Target'} resists the stunning blow. (CON save ${total} vs DC ${dc})`
        : `${target?.name || 'Target'} is Stunned! (CON save ${total} vs DC ${dc})`;
      logCombatEvent(campaignId, line, {
        event: saved ? 'stunning_strike_resisted' : 'stunning_strike_hit',
        category: 'condition',
        actor: actor?.name,
        target: target?.name,
        total,
        dc,
      });
    }
    onRoll && onRoll({ type: 'stunning_strike', saved, dc, roll: total });
  };

  const handleDamageRoll = () => {
    setIsRolling(true);
    onRoll && onRoll({ type: "rolling_damage", state: resolveDiceModifier() });

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
    setDicePopup({
      open: true,
      dice: diceType,
      state: resolveDiceModifier(),
      forcedResult: isSpectator ? damageRoll?.dice : null,
      onComplete: (value) => {
        setDicePopup(p => ({ ...p, open: false }));
        onDamageRollComplete(value);
      },
    });
  };

  const onDamageRollComplete = (roll) => {
    let mod = 0;
    // Off-hand flag lives on the action object when the GM panel
    // fires the off-hand bonus attack. Fall back to the legacy
    // top-level prop for callers that still pass it there.
    const actionIsOffHand = !!selectedAction?.isOffHand || !!isOffHand;

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
      const strMod = abilMod(actor?.attributes?.str || 10);
      const dexMod = abilMod(actor?.attributes?.dex || 10);
      const isFinesse = !!weapon?.properties?.includes?.("Finesse");
      const isRangedWeapon = !!weapon?.category?.includes?.("Ranged");
      const mode = selectedAction?.mode;

      if (isUnarmedAttack()) {
        mod = isMonkActor() ? Math.max(strMod, dexMod) : strMod;
      } else if (mode === "ranged" || isRangedWeapon) {
        mod = dexMod;
      } else if (isFinesse || mode === "offhand") {
        // Off-hand attacks are almost always Light finesse weapons
        // (dagger, shortsword, scimitar, handaxe), so treat them the
        // same as finesse — pick the higher of STR/DEX for the ATTACK
        // roll. The "no mod on damage" penalty lives below.
        mod = Math.max(strMod, dexMod);
      } else {
        mod = strMod;
      }
      // Off-hand: no positive ability mod on DAMAGE unless the
      // character has the Two-Weapon Fighting fighting style. We
      // sniff a couple of common shapes so a PC tagged with the
      // feature in any of them still keeps their damage mod.
      if (actionIsOffHand && mod > 0) {
        const hasTWF = (() => {
          const style = actor?.fighting_style || actor?.fightingStyle || "";
          if (typeof style === "string" && /two[-\s]?weapon/i.test(style)) return true;
          const styles = actor?.fighting_styles || actor?.features || [];
          if (Array.isArray(styles)) {
            return styles.some((s) => {
              const name = typeof s === "string" ? s : s?.name || "";
              return /two[-\s]?weapon fighting/i.test(name);
            });
          }
          return false;
        })();
        if (!hasTWF) mod = 0;
      }

      // (A) Rage damage bonus — melee STR attacks only.
      if (actor?.classResources?.isRaging && !isRangedWeapon && mode !== 'ranged') {
        const rageBonus = actor.classResources.rageDamageBonus || 2;
        mod += rageBonus;
      }

      // (I) Fighting Style: Dueling — +2 damage when wielding a
      // melee weapon in one hand and no other weapon.
      const fightingStyle = actor?.fighting_style || actor?.fightingStyle || '';
      if (/dueling/i.test(fightingStyle) && !isRangedWeapon && !actionIsOffHand && weapon) {
        // "One hand, no other weapons" — we approximate by checking
        // no weapon2 is equipped. Shield doesn't count as a weapon.
        const hasOffhandWeapon = actor?.equipment?.weapon2;
        if (!hasOffhandWeapon) mod += 2;
      }
      // Tier 3: Power Attack (GWM / Sharpshooter) — +10 damage when
      // the toggle is on and the weapon qualifies.
      if (getPowerAttackKind()) mod += 10;
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

    // (L) Critical hit homebrew override. Check campaign.homebrew_rules
    // for alternate crit rules before applying the default double-dice.
    const critMaxAll = getRule(homebrewRules, 'combat.critical_hits.max_all');
    const critMaxFirst = getRule(homebrewRules, 'combat.critical_hits.max_first_roll_second');

    // Per-die breakdown for the non-compound weapon branch. We keep
    // each die's face + value so Great Weapon Fighting can reroll 1s
    // and 2s and the UI can render the "~1~ → 4" strikethroughs.
    let rolledDice = null;
    let gwfRerolls = 0;

    if (isCompoundDice) {
      numDice = match ? parseInt(match[1], 10) : 1;
      total = rollDiceString(diceString);
      if (isCrit) {
        if (critMaxAll) {
          // Maximize ALL dice — roll the expression and set each die to max.
          const maxMatch = diceString.match(/(\d+)d(\d+)/g);
          let maxTotal = 0;
          (maxMatch || []).forEach(term => {
            const m = term.match(/(\d+)d(\d+)/);
            if (m) maxTotal += parseInt(m[1]) * parseInt(m[2]) * 2;
          });
          total = maxTotal;
        } else {
          total += rollDiceString(diceString);
        }
      }
    } else {
      numDice = match ? parseInt(match[1], 10) : 1;
      rolledDice = [];

      if (isCrit) {
        if (critMaxAll) {
          // Max all: every die shows its maximum face.
          numDice *= 2;
          for (let i = 0; i < numDice; i++) {
            rolledDice.push({ faces, value: faces });
          }
        } else if (critMaxFirst) {
          // Max first set, roll second set normally.
          for (let i = 0; i < numDice; i++) {
            rolledDice.push({ faces, value: faces });
          }
          rolledDice.push({ faces, value: roll });
          for (let i = 1; i < numDice; i++) {
            rolledDice.push({ faces, value: Math.floor(Math.random() * faces) + 1 });
          }
          numDice *= 2; // for display purposes
        } else {
          // Default: double the number of dice.
          numDice *= 2;
          rolledDice.push({ faces, value: roll });
          for (let i = 1; i < numDice; i++) {
            rolledDice.push({ faces, value: Math.floor(Math.random() * faces) + 1 });
          }
        }
      } else {
        rolledDice.push({ faces, value: roll });
        for (let i = 1; i < numDice; i++) {
          rolledDice.push({ faces, value: Math.floor(Math.random() * faces) + 1 });
        }
      }

      // Fighting Style: Great Weapon Fighting — reroll 1s and 2s on a
      // weapon attack with a Two-Handed (or Versatile) melee weapon,
      // taking the new roll even if it's also low. Skip when crits are
      // set to max-all (no point rerolling a maxed die).
      if (!critMaxAll && selectedAction?.type !== 'spell') {
        const weapon = selectedAction?.weapon;
        const weaponProps = Array.isArray(weapon?.properties) ? weapon.properties : [];
        const isTwoHanded = weaponProps.some(
          (p) => /two[-\s]?handed/i.test(String(p)) || /versatile/i.test(String(p))
        );
        const styles = [];
        const primary = actor?.fighting_style || actor?.fightingStyle || '';
        if (primary) styles.push(typeof primary === 'string' ? primary : primary?.name || '');
        const arr = actor?.fighting_styles;
        if (Array.isArray(arr)) {
          for (const s of arr) styles.push(typeof s === 'string' ? s : s?.name || '');
        }
        const feats = actor?.features;
        if (Array.isArray(feats)) {
          for (const s of feats) styles.push(typeof s === 'string' ? s : s?.name || '');
        }
        const hasGWF = styles.some((s) => /great\s*weapon\s*fighting/i.test(String(s)));
        if (hasGWF && isTwoHanded) {
          rolledDice = rolledDice.map((d) => {
            if (d.value <= 2) {
              const reroll = Math.floor(Math.random() * d.faces) + 1;
              gwfRerolls += 1;
              return { ...d, original: d.value, value: reroll, rerolled: true };
            }
            return d;
          });
        }
      }

      total = rolledDice.reduce((s, d) => s + d.value, 0);
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

    // Divine Smite / other post-hit bonus damage (radiant, etc.). The
    // dice expression lives on bonusDamage.dice (e.g. "3d8"). Crit
    // doubles these dice the same as the weapon damage.
    let bonusDamageTotal = 0;
    let bonusDamageRolls = null;
    if (bonusDamage?.dice) {
      const bMatch = bonusDamage.dice.match(/^(\d+)d(\d+)$/);
      if (bMatch) {
        const bN = parseInt(bMatch[1], 10);
        const bF = parseInt(bMatch[2], 10);
        const totalDice = isCrit ? bN * 2 : bN;
        bonusDamageRolls = [];
        for (let i = 0; i < totalDice; i++) {
          const v = Math.floor(Math.random() * bF) + 1;
          bonusDamageRolls.push(v);
          bonusDamageTotal += v;
        }
        total += bonusDamageTotal;
      }
    }

    let totalDamage = Math.max(0, total + mod);
    // Tier 3: Uncanny Dodge — target halves damage as a reaction.
    const uncannyHalved = uncannyDodge === 'use';
    if (uncannyHalved) {
      totalDamage = Math.floor(totalDamage / 2);
    }
    const result = {
      total: totalDamage,
      dice: total,
      mod,
      isCrit,
      sneakDice: sneakDiceBase,
      sneakDamage,
      rolledDice: rolledDice || undefined,
      gwfRerolls,
      bonusDamage: bonusDamage
        ? { ...bonusDamage, total: bonusDamageTotal, rolls: bonusDamageRolls }
        : undefined,
      uncannyDodgeUsed: uncannyHalved,
    };
    if (uncannyHalved && campaignId) {
      logCombatEvent(campaignId, `${target?.name || 'Target'} uses Uncanny Dodge! Damage halved from ${total + mod} to ${totalDamage}.`, {
        event: 'uncanny_dodge_applied', category: 'reaction', target: target?.name, from: total + mod, to: totalDamage,
      });
    }
    setDamageRoll(result);
    setIsRolling(false);
    setPhase("damage_result");

    if (target?.id && onRoll) {
      onRoll({
        type: "damage",
        value: totalDamage,
        detail: result,
        targetId: target.id,
        state: resolveDiceModifier(),
      });
    }

    // Campaign log — damage roll line. Crits get a dramatic callout.
    if (campaignId) {
      const damageType =
        spellEffect?.type ||
        selectedAction?.weapon?.damage_type ||
        (selectedAction?.type === "spell" ? "magical" : "weapon");
      const weaponName =
        selectedAction?.type === "spell"
          ? selectedAction?.name || "spell"
          : selectedAction?.weapon?.name ||
            (isUnarmedAttack() ? "unarmed" : "weapon");
      if (isCrit) {
        logCombatEvent(
          campaignId,
          `CRITICAL HIT! ${actor?.name || "Actor"} deals ${totalDamage} ${damageType} damage to ${target?.name || "target"} with ${weaponName}!`,
          {
            event: "damage_roll_crit",
            category: "damage",
            actor: actor?.name,
            target: target?.name,
            weapon: weaponName,
            damage: totalDamage,
            crit: true,
          },
        );
      } else {
        logCombatEvent(
          campaignId,
          `${actor?.name || "Actor"} deals ${totalDamage} ${damageType} damage to ${target?.name || "target"} with ${weaponName}.`,
          {
            event: "damage_roll",
            category: "damage",
            actor: actor?.name,
            target: target?.name,
            weapon: weaponName,
            damage: totalDamage,
          },
        );
      }
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
    const healDice = (spellEffect?.dice || "1d8").match(/d\d+/)?.[0] || "d8";
    setCurrentDice(healDice); // visual only; the real roll is computed below
    setPhase("rolling_heal");
    onRoll && onRoll({ type: "rolling_heal" });
    if (selectedAction?.type === 'spell' && Number(selectedAction.level || 0) > 0) {
      onStat('spells_cast');
    }
    setDicePopup({
      open: true,
      dice: healDice,
      state: resolveDiceModifier(),
      forcedResult: null,
      onComplete: () => {
        setDicePopup(p => ({ ...p, open: false }));
        onHealRollComplete();
      },
    });
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

    // Campaign log — heal line. The HP write-through in GMPanel also
    // emits a follow-up damage_applied line with the new current/max
    // HP, so this one focuses on the cast context.
    if (campaignId) {
      logCombatEvent(
        campaignId,
        `${actor?.name || "Caster"} casts ${spellName || "a healing spell"} and heals ${target?.name || "target"} for ${total} HP.`,
        {
          event: "heal_roll",
          category: "heal",
          actor: actor?.name,
          target: target?.name,
          spell: spellName,
          heal: total,
        },
      );
    }
  };

  // === Effect-apply flow (buff / debuff / utility / condition w/o save) ===
  // For spells that have no roll at all, jumping directly into an
  // "effect_applied" phase lets the GM confirm the spell took effect
  // and move on. The actual condition badge handling lives in the
  // parent; we just ship the label text back.
  const handleApplyEffect = () => {
    if (!spellEffect) return;
    if (selectedAction?.type === 'spell' && Number(selectedAction.level || 0) > 0) {
      onStat('spells_cast');
    }
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

    // Campaign log — the generic "X casts Y" line fires here so the
    // player can see every spell cast in the feed, not just damage
    // ones. Downstream condition_applied / buff_applied hooks from
    // the parent log their own follow-ups.
    if (campaignId && spellName) {
      const castLevel =
        typeof selectedAction?.castLevel === "number"
          ? selectedAction.castLevel
          : selectedAction?.level || 0;
      const levelPhrase = castLevel > 0 ? ` at level ${castLevel}` : "";
      logCombatEvent(
        campaignId,
        `${actor?.name || "Caster"} casts ${spellName}${levelPhrase}.`,
        {
          event: "spell_cast",
          category: "spell",
          actor: actor?.name,
          spell: spellName,
          castLevel,
        },
      );
    }

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
    const autoDice = (spellEffect?.dice || "1d10").match(/d\d+/)?.[0] || "d10";
    setCurrentDice(autoDice);
    setPhase("rolling_damage");
    onRoll && onRoll({ type: "rolling_damage", state: resolveDiceModifier() });
    setDicePopup({
      open: true,
      dice: autoDice,
      state: resolveDiceModifier(),
      forcedResult: null,
      onComplete: () => {
        setDicePopup(p => ({ ...p, open: false }));
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
      },
    });
  };

  // === Skill Check flow ===
  const handleSkillCheckRoll = () => {
    setIsRolling(true);
    setCurrentDice("d20");
    setPhase("rolling_check");
    onRoll && onRoll({ type: "rolling_check" });
    setDicePopup({
      open: true,
      dice: "d20",
      state: resolveDiceModifier(),
      forcedResult: isSpectator ? skillCheckRoll?.d20 : null,
      onComplete: (value) => {
        setDicePopup(p => ({ ...p, open: false }));
        onSkillCheckRollComplete(value);
      },
    });
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
    if (d20 === 20) onStat('nat_20s');
    else if (d20 === 1) onStat('nat_1s');

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

    // Campaign log — skill check result. Contested checks get a
    // "actor total vs target total — WINS/LOSES" readout so the feed
    // shows both rolls at a glance.
    if (campaignId) {
      if (contested) {
        logCombatEvent(
          campaignId,
          `${actor?.name || "Actor"} rolls ${skill}: ${total} vs ${contested.targetName}'s ${contested.targetSkill}: ${contested.targetTotal} — ${contested.winner === "actor" ? `${skill.toUpperCase()} SUCCEEDS` : `${contested.targetName} resists`}`,
          {
            event: "skill_check_contested",
            category: "attack",
            actor: actor?.name,
            target: contested.targetName,
            skill,
            total,
            contestedTotal: contested.targetTotal,
            winner: contested.winner,
          },
        );
      } else {
        const sign = mod >= 0 ? "+" : "−";
        logCombatEvent(
          campaignId,
          `${actor?.name || "Actor"} rolls ${skill} check: ${total} (${d20} ${sign} ${Math.abs(mod)})`,
          {
            event: "skill_check",
            category: "attack",
            actor: actor?.name,
            skill,
            total,
            d20,
            mod,
          },
        );
      }
    }
  };

  // === Saving Throw flow (target rolls) ===
  const handleSavingThrowRoll = () => {
    if (selectedAction?.type === 'spell' && Number(selectedAction.level || 0) > 0) {
      onStat('spells_cast');
    }
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
      if (campaignId) {
        const prefix = spellName ? `${spellName} — ` : "";
        logCombatEvent(
          campaignId,
          `${prefix}${target?.name || "Target"} auto-fails ${saveAbility.toUpperCase()} save (DC ${dc}).`,
          {
            event: "save_auto_fail",
            category: "spell",
            target: target?.name,
            ability: saveAbility,
            dc,
            spell: spellName,
          },
        );
      }
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
    setDicePopup({
      open: true,
      dice: "d20",
      state: resolveDiceModifier(),
      forcedResult: isSpectator ? savingThrowRoll?.d20 : null,
      onComplete: (value) => {
        setDicePopup(p => ({ ...p, open: false }));
        onSavingThrowRollComplete(value);
      },
    });
  };

  const onSavingThrowRollComplete = (roll) => {
    const saveAbility = resolved?.save || "dex";
    const mod = getSaveModifier(target, saveAbility);
    const { hasAdvantage, hasDisadvantage } =
      computeConditionModifiers("saving_throw", saveAbility);

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
    // P.I.E. — saving throws are rolled by the *target*, but we
    // only have the actor's onStat closure here. Skip nat-tracking
    // for saves to avoid mis-attributing rolls.

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

    // Campaign log — save result line. If the spell that triggered
    // the save is known, tag it as "[Spell] — ...".
    if (campaignId) {
      const prefix = spellName ? `${spellName} — ` : "";
      logCombatEvent(
        campaignId,
        `${prefix}${target?.name || "Target"} makes a ${saveAbility.toUpperCase()} saving throw: ${total} vs DC ${dc} — ${success ? "SAVED" : "FAIL"}!`,
        {
          event: success ? "save_success" : "save_fail",
          category: "spell",
          target: target?.name,
          ability: saveAbility,
          total,
          dc,
          spell: spellName,
        },
      );
    }

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
    const mod = abilMod(dex);
    const total = roll + mod;
    const result = { total, dice: roll, mod };
    setInitiativeRoll(result);
    setIsRolling(false);
    onRoll && onRoll({ type: "initiative", value: total });
  };

  const baseTargetAC = target?.stats?.armor_class || target?.armor_class || 10;
  const coverAcBonus = COVER?.[targetCover]?.acBonus || 0;
  const targetAC = baseTargetAC + (Number.isFinite(coverAcBonus) ? coverAcBonus : 0);
  const isHit =
    attackRoll && (attackRoll.isCrit || attackRoll.total >= targetAC);

  if (!isOpen) return null;

  // INITIATIVE MODE — bulk-roll display. All combatants (queued
  // monsters/NPCs + player characters) already have their rolls in
  // combat_data.order when we arrive here, so this screen is purely
  // a readout + a "View Turn Order" CTA. No dice are rolled on this
  // screen — the GM doesn't click a d20.
  if (mode === "initiative") {
    // Faction visibility: GM sees every faction's results live as
    // they roll. Non-GM viewers (players) see only the player-
    // characters section with their own + each others' rolls;
    // enemy / ally / neutral results stay hidden behind a
    // "Preparing for battle…" placeholder until combat fully
    // starts and the turn-order bar renders the final order.
    // (Alpha bug 2 — players were seeing monster initiative
    // numbers like "Aboleth: 5" before combat began, which leaks
    // GM information.)
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

    // Split into GM-visible and player-visible groups. Players
    // still see the section header + portrait + name (so the
    // panel doesn't feel empty / weird) but the initiative number
    // is replaced with a loader for non-player factions.
    const visibleGrouped = isGM
      ? grouped
      : grouped.map((g) => ({
          ...g,
          // Player view: hide the rolled numbers for non-player
          // factions. Set initiative/initiativeRoll to undefined on
          // a copy so the render path falls through to "—" / "?"
          // affordances. The combatants array itself stays intact
          // so the section still shows portraits + names.
          combatants: g.factionKey === 'player'
            ? g.combatants
            : g.combatants.map((c) => ({
                ...c,
                initiative: undefined,
                initiativeRoll: undefined,
                initiativeMod: undefined,
                _rollHidden: true,
              })),
        }));

    const handleViewTurnOrder = () => {
      if (onViewTurnOrder) onViewTurnOrder();
      else if (onClose) onClose();
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-start overflow-y-auto py-12 px-6"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255, 83, 0, 0.08), transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(55, 242, 209, 0.06), transparent 60%), " +
            "#050816",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255, 83, 0, 0.025) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(255, 83, 0, 0.025) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 80%)",
          }}
        />
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
          {visibleGrouped.map(({ factionKey, style, combatants }) => (
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
                                alt={safeText(c.name)}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#1a1f2e] flex items-center justify-center text-xl text-slate-400 font-bold">
                                {safeText(c.name)?.[0] || "?"}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <h4 className="text-xs font-bold text-white mb-1 truncate max-w-full">
                        {safeText(c.name)}
                      </h4>
                      {c._rollHidden ? (
                        // Player view of a non-player faction:
                        // tasteful pulse + ellipsis instead of
                        // the actual roll number. GM sees the
                        // real values; players see this until
                        // combat starts and the turn order bar
                        // resolves.
                        <div className="flex flex-col items-center justify-center min-h-[60px] mt-1">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin opacity-70"
                            style={{ borderColor: style.hex, borderTopColor: 'transparent' }}
                          />
                          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mt-2">
                            Preparing…
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
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
              className="text-white px-10 py-4 rounded-2xl text-xl font-black tracking-[0.08em] uppercase transition-transform hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(180deg, #FF5300, #cc4200)",
                boxShadow:
                  "0 8px 24px rgba(255,83,0,0.4), inset 0 -3px 0 rgba(0,0,0,0.3)",
              }}
            >
              View Turn Order
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // COMBAT MODE
  // ----------------------------------------------------------------
  // Visual rewrite — single-target layout with a step indicator at
  // top, actor card on the left, dice zone in the middle, target
  // card on the right. All state, handlers, and DiceRoller wiring
  // are preserved from the previous implementation; only render
  // output and inline styles changed.

  const FACTION_HEX = {
    player: "#37F2D1",
    enemy: "#FF5300",
    ally: "#22c55e",
    neutral: "#60a5fa",
  };
  const factionFor = (c) => {
    if (!c) return "neutral";
    if (c.type === "monster" || c.type === "npc") {
      return c.faction === "ally" ? "ally" : "enemy";
    }
    return "player";
  };
  const factionColor = (c) => FACTION_HEX[factionFor(c)] || FACTION_HEX.neutral;

  const STEP_FLOWS = {
    attack: [
      { label: "Ready", phases: ["ready"] },
      { label: "Attack", phases: ["rolling_attack"] },
      { label: "Result", phases: ["attack_result"] },
      { label: "Damage", phases: ["rolling_damage"] },
      { label: "Applied", phases: ["damage_result"] },
    ],
    skill_check: [
      { label: "Ready", phases: ["ready"] },
      { label: "Roll", phases: ["rolling_check"] },
      { label: "Result", phases: ["check_result"] },
    ],
    saving_throw: [
      { label: "Ready", phases: ["ready"] },
      { label: "Roll", phases: ["rolling_save"] },
      { label: "Result", phases: ["save_result"] },
    ],
    heal: [
      { label: "Ready", phases: ["ready"] },
      { label: "Roll", phases: ["rolling_heal"] },
      { label: "Healed", phases: ["heal_result"] },
    ],
    auto_damage: [
      { label: "Ready", phases: ["ready"] },
      { label: "Roll", phases: ["rolling_damage"] },
      { label: "Damage", phases: ["damage_result"] },
    ],
    effect: [
      { label: "Ready", phases: ["ready"] },
      { label: "Cast", phases: ["effect_applied"] },
    ],
  };
  const stepsForFlow = STEP_FLOWS[flowType] || STEP_FLOWS.attack;
  const currentStepIndex = (() => {
    for (let i = stepsForFlow.length - 1; i >= 0; i--) {
      if (stepsForFlow[i].phases.includes(phase)) return i;
    }
    return 0;
  })();

  const actorColor = factionColor(actor);
  const targetColor = factionColor(target);

  // Inline sub-component renderers — kept in this file rather than
  // extracted so the surrounding state stays close.
  const renderUpNext = (side) => {
    if (isSpectator) return null;
    const queue = getQueueAvatars(side);
    if (!queue.length) return null;
    const sideStyle = side === "left" ? { left: 24 } : { right: 24 };
    return (
      <div
        className="absolute z-20 flex flex-col items-center gap-2"
        style={{ top: 100, ...sideStyle }}
      >
        <span className="text-[9px] uppercase tracking-[0.24em] text-slate-500 font-bold">
          Up Next
        </span>
        {queue.map((c, i) => {
          const avatar = c.avatar || c.avatar_url || c.image_url;
          return (
            <div
              key={c.uniqueId || c.id || i}
              className="relative group rounded-full overflow-hidden bg-[#0b1220] transition-all hover:scale-105"
              style={{
                width: 44,
                height: 44,
                border: "2px solid rgba(51,65,85,1)",
                opacity: 0.7,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.borderColor = "#FF5300";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
                e.currentTarget.style.borderColor = "rgba(51,65,85,1)";
              }}
            >
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
                  {safeText(c.name)?.[0]}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/70 text-[8px] text-white text-center leading-tight transition-opacity px-1">
                {safeText(c.name)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCombatTitle = () => {
    const showVs = !!target && flowType !== "skill_check";
    const showSkill =
      flowType === "skill_check" && !target && resolved?.skill;
    return (
      <div
        className="flex items-center justify-center gap-3"
        style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}
      >
        <span style={{ color: actorColor }}>{safeText(actor?.name) || "Actor"}</span>
        {showVs && (
          <>
            <span
              className="uppercase text-slate-500"
              style={{ fontSize: 14, letterSpacing: "0.32em", fontWeight: 700 }}
            >
              vs
            </span>
            <span style={{ color: targetColor }}>
              {safeText(target?.name) || "Target"}
            </span>
          </>
        )}
        {flowType === "skill_check" && resolved?.contested && target && (
          <>
            <span
              className="uppercase text-slate-500"
              style={{ fontSize: 14, letterSpacing: "0.32em", fontWeight: 700 }}
            >
              vs
            </span>
            <span style={{ color: targetColor }}>{safeText(target.name)}</span>
          </>
        )}
        {showSkill && (
          <span
            className="text-slate-300"
            style={{ fontSize: 16, fontWeight: 600 }}
          >
            — {resolved.skill}
          </span>
        )}
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div
      className="flex items-center gap-2 rounded-full"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.05)",
        padding: "6px 8px",
      }}
    >
      {stepsForFlow.map((step, i) => {
        const isCurrent = i === currentStepIndex;
        const isDone = i < currentStepIndex;
        const circleStyle = isCurrent
          ? {
              background: "#FF5300",
              border: "1px solid #FF5300",
              animation: "cdwPulse 1.6s infinite",
            }
          : isDone
          ? {
              background: "rgba(55,242,209,0.15)",
              border: "1px solid rgba(55,242,209,0.6)",
            }
          : {
              background: "transparent",
              border: "1px solid rgba(100,116,139,0.6)",
            };
        const labelColor = isCurrent
          ? "#fff"
          : isDone
          ? "#cbd5e1"
          : "#64748b";
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 1,
                  background: i <= currentStepIndex ? "rgba(55,242,209,0.4)" : "#334155",
                }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...circleStyle,
                }}
              >
                {isDone && (
                  <span
                    style={{
                      color: "#37F2D1",
                      fontSize: 11,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: labelColor,
                }}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderPortrait = (combatant, opts = {}) => {
    const { isActor = false, size = 200 } = opts;
    const color = factionColor(combatant);
    const avatar =
      combatant?.avatar_url ||
      combatant?.image_url ||
      combatant?.profile_avatar_url ||
      combatant?.avatar;
    return (
      <div
        className="relative bg-[#1a1f2e] overflow-hidden"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `3px solid ${color}`,
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.4), 0 0 40px " +
            (color +
              "4D") +
            ", inset 0 0 30px rgba(0,0,0,0.5)",
        }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={safeText(combatant?.name)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-slate-600 font-bold">
            {isActor ? "?" : "?"}
          </div>
        )}
      </div>
    );
  };

  const renderHpBar = (combatant, { showNumbers = true } = {}) => {
    if (!combatant?.hit_points) return null;
    const max = combatant.hit_points.max || 0;
    const current = combatant.hit_points.current ?? max;
    const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
    // Armour class can come in as a number, an object with a value/
    // total/base shape, or be missing. Coerce to a plain string so we
    // never end up with "[object Object]" leaking into the UI.
    const acRaw =
      combatant?.stats?.armor_class ?? combatant?.armor_class ?? combatant?.ac;
    const ac =
      typeof acRaw === "number"
        ? acRaw
        : acRaw?.value ?? acRaw?.total ?? acRaw?.base ?? null;
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            width: 180,
            height: 8,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            className={`h-full rounded-full ${hpBarColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
              animation: "cdwShimmer 2.4s infinite",
            }}
          />
        </div>
        {showNumbers && (
          <span
            className="text-slate-300 font-mono"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}
          >
            {current} / {max} HP{ac ? ` · AC ${ac}` : ""}
          </span>
        )}
      </div>
    );
  };

  const renderCombatantCard = (combatant, role) => {
    if (!combatant) {
      return (
        <div className="flex flex-col items-center gap-3 opacity-50">
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              border: "3px dashed rgba(100,116,139,0.4)",
            }}
          />
          <div className="text-slate-500 text-xs uppercase tracking-[0.24em]">
            {role === "actor" ? "No Actor" : "No Target"}
          </div>
        </div>
      );
    }
    const isActor = role === "actor";
    const color = factionColor(combatant);
    const showHpNumbers =
      isActor || isGM || combatant.type === "player";
    return (
      <div className="relative flex flex-col items-center gap-3">
        {renderPortrait(combatant, { isActor })}
        {/* Switch-target lives on the portrait edge — only on the
            target column, never on the actor. Positioned vertically
            centered on the 200px portrait. */}
        {role === "target" && !isSpectator && target && (
          <button
            onClick={onSwitchTarget}
            title="Switch Target"
            className="absolute flex items-center justify-center transition-transform hover:scale-110"
            style={{
              left: -18,
              top: 100,
              transform: "translateY(-50%)",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#FF5300",
              border: "3px solid #050816",
              boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
              zIndex: 5,
            }}
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        )}
        <div className="relative flex flex-col items-center gap-2 w-full">
          {isActor && (
            <div
              className="absolute uppercase font-black"
              style={{
                top: -10,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#FF5300",
                color: "#fff",
                padding: "3px 12px",
                borderRadius: 9999,
                fontSize: 9,
                letterSpacing: "0.18em",
                fontWeight: 800,
                border: "2px solid #050816",
                whiteSpace: "nowrap",
                zIndex: 5,
              }}
            >
              Acting
            </div>
          )}
          <div
            className="rounded-full text-center"
            style={{
              background: color + "1F",
              border: `1px solid ${color}`,
              padding: "6px 18px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              maxWidth: 220,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {safeText(combatant.name) || (isActor ? "Actor" : "Target")}
          </div>
          {combatant.hit_points && renderHpBar(combatant, { showNumbers: showHpNumbers })}
          {!isActor &&
            !isSpectator &&
            target &&
            flowType === "attack" &&
            phase === "ready" && (
              <div className="flex flex-wrap items-center justify-center gap-1 mt-1 max-w-[220px]">
                {[
                  { key: "none", label: "No Cover" },
                  { key: "half", label: "½ +2" },
                  { key: "three_quarters", label: "¾ +5" },
                  { key: "full", label: "Full" },
                ].map(({ key, label }) => {
                  const selected = targetCover === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "full") {
                          if (onClose) onClose();
                          return;
                        }
                        setTargetCover(key);
                      }}
                      className="font-bold uppercase tracking-wider rounded-md transition-colors"
                      style={
                        selected
                          ? {
                              background: "#FF5300",
                              color: "#fff",
                              border: "1px solid #FF5300",
                              padding: "4px 10px",
                              fontSize: 9,
                            }
                          : {
                              background: "rgba(0,0,0,0.4)",
                              color: "#cbd5e1",
                              border: "1px solid rgba(255,255,255,0.1)",
                              padding: "4px 10px",
                              fontSize: 9,
                            }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          {!isActor && targetCover !== "none" && (
            <div className="text-[9px] text-[#FF5300] font-bold uppercase tracking-wider">
              vs AC {targetAC} (base {baseTargetAC} + {coverAcBonus} cover)
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResultBurst = () => {
    if (phase === "attack_result" || phase === "damage_result") {
      if (damageRoll) {
        return (
          <div className="flex flex-col items-center gap-3 z-30">
            <motion.div
              initial={{ scale: 0, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="flex flex-col items-center justify-center"
              style={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 30%, #dc2626, #991b1b)",
                border: "4px solid #fff",
                boxShadow:
                  "0 0 60px rgba(220,38,38,0.7), 0 10px 30px rgba(0,0,0,0.6)",
                color: "#fff",
              }}
            >
              <span
                style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, textShadow: "0 4px 8px rgba(0,0,0,0.5)" }}
              >
                {damageRoll.total}
              </span>
              <span
                className="uppercase"
                style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", opacity: 0.9, marginTop: 6 }}
              >
                Damage
              </span>
              {damageRoll.sneakDice > 0 && (
                <span
                  className="uppercase mt-1 text-yellow-300"
                  style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em" }}
                >
                  +{damageRoll.sneakDice}d6 Sneak
                </span>
              )}
              {damageRoll.bonusDamage?.label && (
                <span
                  className="uppercase mt-1"
                  style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", color: "#fbbf24" }}
                >
                  +{safeText(damageRoll.bonusDamage.dice)} {safeText(damageRoll.bonusDamage.label)}
                </span>
              )}
              {spellEffect?.effect === "damage_condition" && spellEffect.condition && (
                <span
                  className="uppercase mt-1 text-purple-200"
                  style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em" }}
                >
                  +{safeText(spellEffect.condition)}
                </span>
              )}
            </motion.div>
            {attackRoll && (
              <div
                className="font-mono rounded-md"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#cbd5e1",
                  fontSize: 12,
                  padding: "4px 10px",
                }}
              >
                {damageRoll.dice ? `${damageRoll.dice}` : ""}
                {damageRoll.mod != null
                  ? ` ${damageRoll.mod >= 0 ? "+" : "−"} ${Math.abs(damageRoll.mod)} mod`
                  : ""}
                {damageRoll.total != null ? ` = ${damageRoll.total}` : ""}
              </div>
            )}
            {damageRoll.gwfRerolls > 0 && Array.isArray(damageRoll.rolledDice) && (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1 bg-black/60 border border-yellow-500/40 rounded-full px-3 py-1 max-w-xs">
                <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-300 mr-1">
                  GWF
                </span>
                {damageRoll.rolledDice.map((d, i) => (
                  <span key={i} className="text-[10px] font-mono">
                    {d.rerolled ? (
                      <>
                        <span className="line-through text-red-300">{safeText(d.original)}</span>
                        <span className="text-yellow-200"> → {safeText(d.value)}</span>
                      </>
                    ) : (
                      <span className="text-slate-300">{safeText(d.value)}</span>
                    )}
                    {i < damageRoll.rolledDice.length - 1 && (
                      <span className="text-slate-600">, </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }
      // Attack roll result (no damage yet)
      if (!attackRoll) return null;
      const hit = isHit;
      const crit = !!attackRoll.isCrit;
      const numColor = crit ? "#fbbf24" : hit ? "#37F2D1" : "#ef4444";
      const glow = crit
        ? "0 0 32px rgba(251,191,36,0.8)"
        : hit
        ? "0 0 32px rgba(55,242,209,0.6)"
        : "0 0 28px rgba(239,68,68,0.5)";
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="flex flex-col items-center gap-2 z-30"
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              color: numColor,
              textShadow: glow,
            }}
          >
            {crit ? "CRIT!" : attackRoll.total}
          </div>
          {!crit && (
            <div
              className="font-mono rounded-md"
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#cbd5e1",
                fontSize: 14,
                padding: "4px 10px",
              }}
            >
              {attackRoll.d20}{" "}
              {attackRoll.mod >= 0 ? "+" : "−"} {Math.abs(attackRoll.mod || 0)}{" "}
              = {attackRoll.total}
            </div>
          )}
          <div
            className="uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              fontWeight: 800,
              color: hit ? "#37F2D1" : "#94a3b8",
            }}
          >
            vs AC {targetAC} · {hit ? (crit ? "Critical Hit" : "Hit") : "Miss"}
          </div>
          {attackRoll.pair && (
            <div
              className="flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  attackRoll.pair.chosen === 0
                    ? attackRoll.pair.mode === "advantage"
                      ? "bg-[#22c55e]/30 text-[#22c55e]"
                      : "bg-red-500/30 text-red-300"
                    : "text-slate-600 line-through"
                }`}
              >
                {attackRoll.pair.dice[0]}
              </span>
              <span className="text-[10px] uppercase text-slate-400 tracking-widest">
                {attackRoll.pair.mode === "advantage" ? "ADV" : "DIS"}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  attackRoll.pair.chosen === 1
                    ? attackRoll.pair.mode === "advantage"
                      ? "bg-[#22c55e]/30 text-[#22c55e]"
                      : "bg-red-500/30 text-red-300"
                    : "text-slate-600 line-through"
                }`}
              >
                {attackRoll.pair.dice[1]}
              </span>
            </div>
          )}
        </motion.div>
      );
    }
    if (phase === "heal_result" && healRoll) {
      return (
        <div className="flex flex-col items-center gap-3 z-30">
          <motion.div
            initial={{ scale: 0, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="flex flex-col items-center justify-center"
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, #22c55e, #14532d)",
              border: "4px solid #fff",
              boxShadow:
                "0 0 60px rgba(34,197,94,0.7), 0 10px 30px rgba(0,0,0,0.6)",
              color: "#fff",
            }}
          >
            <span
              style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, textShadow: "0 4px 8px rgba(0,0,0,0.5)" }}
            >
              +{healRoll.total}
            </span>
            <span
              className="uppercase"
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", opacity: 0.9, marginTop: 6 }}
            >
              Healed
            </span>
          </motion.div>
          <div
            className="font-mono rounded-md"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1",
              fontSize: 12,
              padding: "4px 10px",
            }}
          >
            {healRoll.dice}
            {healRoll.mod > 0 ? ` + ${healRoll.mod}` : ""}
          </div>
        </div>
      );
    }
    if (phase === "effect_applied" && effectApplied) {
      const palette =
        effectApplied.effect === "buff"
          ? "linear-gradient(135deg, #37F2D1, #0ea5e9)"
          : effectApplied.effect === "utility"
          ? "linear-gradient(135deg, #475569, #0f172a)"
          : "linear-gradient(135deg, #8B5CF6, #5b21b6)";
      return (
        <motion.div
          initial={{ scale: 0, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="flex flex-col items-center justify-center px-6 py-5 z-30"
          style={{
            minWidth: 220,
            minHeight: 140,
            borderRadius: 24,
            background: palette,
            border: "3px solid rgba(255,255,255,0.85)",
            boxShadow: "0 0 60px rgba(0,0,0,0.6)",
            color: "#fff",
          }}
        >
          <span
            className="uppercase"
            style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", opacity: 0.85 }}
          >
            Spell Cast
          </span>
          <span
            className="uppercase text-center mt-1"
            style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1.2 }}
          >
            {effectApplied.label}
          </span>
        </motion.div>
      );
    }
    if (phase === "check_result" && skillCheckRoll && !skillCheckRoll.contested) {
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="flex flex-col items-center gap-2 z-30"
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              color: "#37F2D1",
              textShadow: "0 0 32px rgba(55,242,209,0.6)",
            }}
          >
            {skillCheckRoll.total}
          </div>
          <div
            className="font-mono rounded-md"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1",
              fontSize: 14,
              padding: "4px 10px",
            }}
          >
            {skillCheckRoll.d20} {skillCheckRoll.mod >= 0 ? "+" : "−"}{" "}
            {Math.abs(skillCheckRoll.mod)} = {skillCheckRoll.total}
          </div>
          <div
            className="uppercase text-slate-300"
            style={{ fontSize: 11, letterSpacing: "0.16em", fontWeight: 800 }}
          >
            {skillCheckRoll.skill}
          </div>
        </motion.div>
      );
    }
    if (phase === "check_result" && skillCheckRoll?.contested) {
      const winnerActor = skillCheckRoll.contested.winner === "actor";
      return (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-3 z-30"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex flex-col items-center justify-center rounded-full"
              style={{
                width: 128,
                height: 128,
                background: winnerActor
                  ? "radial-gradient(circle at 30% 30%, #37F2D1, #0ea5e9)"
                  : "linear-gradient(180deg, #334155, #0f172a)",
                color: winnerActor ? "#050816" : "rgba(255,255,255,0.7)",
                border: `4px solid ${winnerActor ? "#fff" : "#475569"}`,
                boxShadow: "0 0 40px rgba(0,0,0,0.7)",
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", opacity: 0.85 }}>
                {skillCheckRoll.skill}
              </span>
              <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
                {skillCheckRoll.total}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.75 }}>
                {skillCheckRoll.d20} {skillCheckRoll.mod >= 0 ? "+" : "−"} {Math.abs(skillCheckRoll.mod)}
              </span>
            </div>
            <span className="text-white text-xs font-black uppercase tracking-[0.24em]">vs</span>
            <div
              className="flex flex-col items-center justify-center rounded-full"
              style={{
                width: 128,
                height: 128,
                background: !winnerActor
                  ? "radial-gradient(circle at 30% 30%, #ef4444, #7f1d1d)"
                  : "linear-gradient(180deg, #334155, #0f172a)",
                color: !winnerActor ? "#fff" : "rgba(255,255,255,0.7)",
                border: `4px solid ${!winnerActor ? "#fff" : "#475569"}`,
                boxShadow: "0 0 40px rgba(0,0,0,0.7)",
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", opacity: 0.85 }}>
                {safeText(skillCheckRoll.contested.targetSkill)}
              </span>
              <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
                {skillCheckRoll.contested.targetTotal}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.75 }}>
                {skillCheckRoll.contested.targetD20}{" "}
                {skillCheckRoll.contested.targetMod >= 0 ? "+" : "−"}{" "}
                {Math.abs(skillCheckRoll.contested.targetMod)}
              </span>
            </div>
          </div>
          <div
            className="uppercase rounded-full px-4 py-1"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              fontWeight: 800,
              background: winnerActor ? "rgba(55,242,209,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${winnerActor ? "rgba(55,242,209,0.55)" : "rgba(239,68,68,0.55)"}`,
              color: winnerActor ? "#37F2D1" : "#fca5a5",
            }}
          >
            {winnerActor
              ? `${actor?.name || "Actor"} wins the contest`
              : `${skillCheckRoll.contested.targetName} resists`}
          </div>
        </motion.div>
      );
    }
    if (phase === "save_result" && savingThrowRoll) {
      const success = !!savingThrowRoll.success;
      const numColor = success ? "#37F2D1" : "#ef4444";
      const glow = success
        ? "0 0 32px rgba(55,242,209,0.6)"
        : "0 0 32px rgba(239,68,68,0.5)";
      // Tier 3: Evasion notice (Monk/Rogue 7+ on DEX save)
      const tgt = target;
      let evasionLabel = null;
      if (tgt) {
        const tgtClass = (tgt.class || tgt.stats?.class || "").toString();
        const tgtLvl = tgt.level || tgt.stats?.level || 0;
        const hasEvasion =
          (/monk/i.test(tgtClass) || /rogue/i.test(tgtClass)) && tgtLvl >= 7;
        if (
          hasEvasion &&
          (savingThrowRoll.ability || "").toLowerCase() === "dex"
        ) {
          evasionLabel = success ? "No damage!" : "Half damage!";
        }
      }
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="flex flex-col items-center gap-2 z-30"
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              color: numColor,
              textShadow: glow,
            }}
          >
            {safeText(savingThrowRoll.total)}
          </div>
          <div
            className="font-mono rounded-md"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1",
              fontSize: 14,
              padding: "4px 10px",
            }}
          >
            vs DC {safeText(savingThrowRoll.dc)}
          </div>
          <div
            className="uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              fontWeight: 800,
              color: success ? "#37F2D1" : "#fca5a5",
            }}
          >
            {safeText(savingThrowRoll.ability).toUpperCase()} Save · {success ? "Saved" : "Failed"}
          </div>
          {evasionLabel && (
            <div
              className="rounded-full px-3 py-1 mt-1"
              style={{
                background: "rgba(0,0,0,0.7)",
                border: "1px solid #37F2D1",
                color: "#37F2D1",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Evasion — {evasionLabel}
            </div>
          )}
        </motion.div>
      );
    }
    if (phase === "ready") {
      // Ready-state visuals live on the dice-zone wrapper as a
      // pointer-events:none overlay above the DiceRoller, so we
      // intentionally render nothing from inside the result-burst.
      return null;
    }
    if (phase.startsWith("rolling_")) {
      // The embedded DiceRoller renders the live dice itself — no
      // additional placeholder text is needed.
      return null;
    }
    return null;
  };

  const renderPostHitPrompts = () => {
    if (phase !== "attack_result") return null;
    if (!isHit) return null;

    const tgt = target;
    const tgtClass = (tgt?.class || tgt?.stats?.class || "").toString();
    const tgtLvl = tgt?.level || tgt?.stats?.level || 0;
    const isRogue5 = tgt && /rogue/i.test(tgtClass) && tgtLvl >= 5;
    const tgtConds = tgt?.conditions || [];
    const showUncannyDodge = isRogue5 && !tgtConds.includes("Blinded");

    if (postHitOptions.length === 0 && !showUncannyDodge) return null;

    return (
      <div className="flex flex-col gap-3 w-full">
        {showUncannyDodge && (
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(56,189,248,0.5)",
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#38bdf8] font-black mb-1">
              🛡 Uncanny Dodge — {safeText(tgt.name)}?
            </div>
            <p className="text-[10px] text-slate-400 mb-2">
              Halve this damage (Reaction)?
            </p>
            <div className="flex gap-2">
              <button
                disabled={uncannyDodge !== null}
                onClick={() => {
                  setUncannyDodge("use");
                  if (campaignId) {
                    logCombatEvent(
                      campaignId,
                      `${tgt.name} uses Uncanny Dodge! (Reaction)`,
                      {
                        event: "uncanny_dodge_use",
                        category: "reaction",
                        target: tgt.name,
                      }
                    );
                  }
                }}
                className={`flex-1 text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border transition-colors ${
                  uncannyDodge === "use"
                    ? "bg-[#38bdf8] text-[#050816] border-[#38bdf8]"
                    : uncannyDodge !== null
                    ? "bg-[#0b1220] text-slate-600 border-slate-800 cursor-not-allowed"
                    : "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/60 hover:bg-[#38bdf8]/25"
                }`}
              >
                Use (Reaction)
              </button>
              <button
                disabled={uncannyDodge !== null}
                onClick={() => setUncannyDodge("skip")}
                className={`flex-1 text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border transition-colors ${
                  uncannyDodge === "skip"
                    ? "bg-slate-600 text-white border-slate-400"
                    : uncannyDodge !== null
                    ? "bg-[#0b1220] text-slate-600 border-slate-800 cursor-not-allowed"
                    : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700"
                }`}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {postHitOptions.length > 0 && (
          <div
            className="flex flex-col gap-3 rounded-xl p-3"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,83,0,0.3)",
            }}
          >
            {postHitOptions.includes("divine_smite") && (() => {
              const decided = postHitDecisions.divine_smite;
              const slots = getPaladinSlotsLeft();
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-[#fbbf24] font-black flex items-center gap-1">
                      <Swords className="w-3 h-3" /> Divine Smite?
                    </span>
                    {decided !== null && (
                      <span className="text-[9px] uppercase tracking-widest text-slate-400">
                        {decided === "skip" ? "Skipped" : `L${decided} slot spent`}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Expend a spell slot for extra radiant damage.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map(({ slotLevel, remaining }) => {
                      const disabled = remaining <= 0 || decided !== null;
                      const selected = decided === slotLevel;
                      return (
                        <button
                          key={slotLevel}
                          disabled={disabled}
                          onClick={() => handleSmiteChoice(slotLevel)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border transition-colors ${
                            selected
                              ? "bg-[#fbbf24] text-[#050816] border-[#fbbf24]"
                              : disabled
                              ? "bg-[#0b1220] text-slate-600 border-slate-800 cursor-not-allowed"
                              : "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/60 hover:bg-[#fbbf24]/25"
                          }`}
                        >
                          L{slotLevel} ({remaining})
                        </button>
                      );
                    })}
                    <button
                      disabled={decided !== null}
                      onClick={() => handleSmiteChoice("skip")}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border transition-colors ${
                        decided === "skip"
                          ? "bg-slate-600 text-white border-slate-400"
                          : decided !== null
                          ? "bg-[#0b1220] text-slate-600 border-slate-800 cursor-not-allowed"
                          : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700"
                      }`}
                    >
                      No Smite
                    </button>
                  </div>
                </div>
              );
            })()}

            {postHitOptions.includes("stunning_strike") && (() => {
              const decided = postHitDecisions.stunning_strike;
              const kiRemaining = actor?.classResources?.kiRemaining ?? 0;
              const canSpend = kiRemaining > 0 && decided === null;
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-[#37F2D1] font-black">
                      💥 Stunning Strike? (1 ki)
                    </span>
                    {decided !== null && (
                      <span className="text-[9px] uppercase tracking-widest text-slate-400">
                        {decided === "skip"
                          ? "Skipped"
                          : decided === "saved"
                          ? "Resisted"
                          : "Stunned!"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Target makes CON save or is Stunned until end of your next turn.
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={!canSpend}
                      onClick={() => handleStunningStrike(true)}
                      className={`flex-1 text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border transition-colors ${
                        decided === "saved" || decided === "stunned"
                          ? "bg-[#37F2D1] text-[#050816] border-[#37F2D1]"
                          : canSpend
                          ? "bg-[#37F2D1]/10 text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/25"
                          : "bg-[#0b1220] text-slate-600 border-slate-800 cursor-not-allowed"
                      }`}
                    >
                      Spend Ki
                    </button>
                    <button
                      disabled={decided !== null}
                      onClick={() => handleStunningStrike(false)}
                      className={`flex-1 text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg border transition-colors ${
                        decided === "skip"
                          ? "bg-slate-600 text-white border-slate-400"
                          : decided !== null
                          ? "bg-[#0b1220] text-slate-600 border-slate-800 cursor-not-allowed"
                          : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700"
                      }`}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderD20Prompts = () => {
    if (isSpectator) return null;
    const feats = Array.isArray(actor?.feats)
      ? actor.feats
      : Array.isArray(actor?.features)
      ? actor.features
      : [];
    const hasLucky = feats.some((f) => {
      const n = typeof f === "string" ? f : f?.name;
      return typeof n === "string" && n.toLowerCase() === "lucky";
    });
    let kind = null;
    if (phase === "attack_result" && attackRoll) kind = "attack";
    else if (phase === "check_result" && skillCheckRoll) kind = "skill";
    else if (phase === "save_result" && savingThrowRoll) kind = "save";
    if (!kind) return null;

    const luckyLeft = actor?.classResources?.luckyPointsRemaining ?? 3;
    const showLucky = hasLucky && luckyLeft > 0 && !luckyConsumed;
    const showInspiration = !!actor?.hasInspiration && !inspirationDiceUsed;
    const insp = actor?.bardicInspiration;
    const showBardic = !!insp?.die && !inspirationConsumed;

    if (!showLucky && !showInspiration && !showBardic) return null;

    return (
      <div className="flex flex-col gap-2 w-full">
        {showLucky && (
          <div className="w-full bg-gradient-to-r from-[#facc15]/15 to-[#f59e0b]/10 border border-[#facc15]/50 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#facc15] font-black">
                ● Lucky ({luckyLeft} left)
              </span>
              <span className="text-[11px] text-white font-bold">
                Roll an extra d20, take the better.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => rollLuckyReroll(kind)}
                className="text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-[#facc15] text-[#050816] hover:bg-[#fde68a]"
              >
                Spend
              </button>
              <button
                onClick={() => setLuckyConsumed(true)}
                className="text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Keep
              </button>
            </div>
          </div>
        )}
        {showInspiration && (
          <div className="w-full bg-gradient-to-r from-[#facc15]/20 to-[#eab308]/10 border border-[#facc15]/60 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#facc15] font-black flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Inspiration
              </span>
              <span className="text-[11px] text-white font-bold">
                Reroll with advantage?
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => useInspirationAdvantage(kind)}
                className="text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-[#facc15] text-[#050816] hover:bg-[#fde68a]"
              >
                Use
              </button>
              <button
                onClick={() => setInspirationDiceUsed(true)}
                className="text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Save
              </button>
            </div>
          </div>
        )}
        {showBardic && (
          <div className="w-full bg-gradient-to-r from-[#fbbf24]/20 to-[#f59e0b]/10 border border-[#fbbf24]/50 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#fbbf24] font-black flex items-center gap-1">
                <Music className="w-3 h-3" /> Bardic Inspiration
              </span>
              <span className="text-[11px] text-white font-bold">
                Use inspiration? +{insp.die}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => rollBardicInspiration(kind)}
                className="text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-[#fbbf24] text-[#050816] hover:bg-[#fde68a] transition-colors"
              >
                Use
              </button>
              <button
                onClick={() => setInspirationConsumed(true)}
                className="text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderConditionPreview = () => {
    if (phase !== "ready" || !conditionPreview.warnings.length) return null;
    return (
      <div className="w-full flex flex-col gap-1">
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
            <div key={i} className="text-[10px] text-yellow-200/90 leading-snug">
              • {w}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------
  // Action button — phase- and flow-aware. The bug fix is the
  // explicit `!damageRoll` check on the attack_result branch so we
  // never lose the ROLL DAMAGE button after a hit.
  const PRIMARY_ORANGE_STYLE = {
    background: "linear-gradient(180deg, #FF5300, #cc4200)",
    boxShadow:
      "0 8px 24px rgba(255,83,0,0.4), inset 0 -3px 0 rgba(0,0,0,0.3)",
    color: "#fff",
  };
  const PRIMARY_RED_STYLE = {
    background: "linear-gradient(180deg, #dc2626, #991b1b)",
    boxShadow:
      "0 8px 24px rgba(220,38,38,0.4), inset 0 -3px 0 rgba(0,0,0,0.3)",
    color: "#fff",
  };
  const TEAL_DONE_STYLE = {
    background: "linear-gradient(180deg, #37F2D1, #2dd9bd)",
    boxShadow:
      "0 8px 24px rgba(55,242,209,0.35), inset 0 -3px 0 rgba(0,0,0,0.2)",
    color: "#1B2535",
  };

  const renderActionButton = () => {
    if (isSpectator) return null;

    if (phase === "ready") {
      const handler =
        flowType === "attack"
          ? handleAttackRoll
          : flowType === "heal"
          ? handleHealRoll
          : flowType === "auto_damage"
          ? handleAutoDamage
          : flowType === "effect"
          ? handleApplyEffect
          : flowType === "skill_check"
          ? handleSkillCheckRoll
          : flowType === "saving_throw"
          ? handleSavingThrowRoll
          : handleAttackRoll;
      const label =
        flowType === "attack"
          ? "Roll Attack"
          : flowType === "heal"
          ? "Roll Heal"
          : flowType === "auto_damage"
          ? "Roll Damage"
          : flowType === "effect"
          ? "Cast Spell"
          : flowType === "skill_check"
          ? `Roll ${(resolved?.skill || "Skill").toString()} Check`
          : flowType === "saving_throw"
          ? `Roll ${(resolved?.save || "Save").toString().toUpperCase()} Save`
          : "Roll";
      const disabled =
        isRolling ||
        (flowType !== "skill_check" && flowType !== "effect" && !target);
      const needsTargetWarning =
        flowType !== "skill_check" && flowType !== "effect" && !target;
      return (
        <div className="flex flex-col items-center gap-2 w-full">
          {extraAttackInfo && flowType === "attack" && (
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#37F2D1] font-black bg-[#37F2D1]/10 border border-[#37F2D1]/40 rounded-full px-4 py-1">
              Attack {extraAttackInfo.current} of {extraAttackInfo.total}
            </div>
          )}
          <button
            onClick={handler}
            disabled={disabled}
            className="w-full uppercase font-black tracking-[0.08em] rounded-2xl transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              ...PRIMARY_ORANGE_STYLE,
              padding: "18px 24px",
              fontSize: 18,
            }}
          >
            {isRolling ? "Rolling…" : label}
          </button>
          {needsTargetWarning && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Choose a target
            </span>
          )}
        </div>
      );
    }

    if (phase.startsWith("rolling_")) {
      // Dice zone already shows the live dice during rolls; no extra
      // "Rolling…" text underneath.
      return null;
    }

    // BUG FIX: explicit damageRoll guard so the ROLL DAMAGE button
    // never disappears between attack_result and damage_result.
    if (phase === "attack_result" && isHit && !damageRoll) {
      return (
        <button
          onClick={handleDamageRoll}
          className="w-full uppercase font-black tracking-[0.08em] rounded-2xl transition-transform hover:-translate-y-0.5 active:translate-y-0"
          style={{
            ...PRIMARY_RED_STYLE,
            padding: "18px 24px",
            fontSize: 18,
          }}
        >
          Roll Damage
        </button>
      );
    }

    if (
      phase === "damage_result" ||
      (phase === "attack_result" && !isHit) ||
      phase === "check_result" ||
      phase === "save_result" ||
      phase === "heal_result" ||
      phase === "effect_applied"
    ) {
      return (
        <button
          onClick={() => {
            if (onActionComplete) onActionComplete();
            else onClose();
          }}
          className="w-full uppercase font-black tracking-[0.06em] rounded-2xl transition-transform hover:-translate-y-0.5 active:translate-y-0"
          style={{
            ...TEAL_DONE_STYLE,
            padding: "16px 24px",
            fontSize: 16,
          }}
        >
          Done
        </button>
      );
    }

    return null;
  };

  const renderSpectatorReadout = () => {
    if (!isSpectator) return null;
    return (
      <div
        className="rounded-xl text-center flex flex-col gap-2 w-full"
        style={{
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "14px 18px",
        }}
      >
        {spectatorData?.action && (
          <div className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-white/10 pb-1 mb-1">
            Using {safeText(spectatorData.action.name)}
          </div>
        )}
        <p className="text-sm font-bold text-[#37F2D1] animate-pulse">
          {phase === "ready" && "Preparing…"}
          {phase === "rolling_attack" && "Rolling Attack…"}
          {phase === "attack_result" &&
            (isHit
              ? "Attack hit! Waiting for damage…"
              : "Attack missed")}
          {phase === "rolling_damage" && "Rolling Damage…"}
          {phase === "damage_result" && "Damage applied"}
          {phase === "rolling_check" && "Rolling Check…"}
          {phase === "check_result" && "Check complete"}
          {phase === "rolling_save" && "Rolling Save…"}
          {phase === "save_result" && "Save resolved"}
        </p>
      </div>
    );
  };

  // Portaled to document.body so the modal escapes any transformed /
  // filtered ancestor's containing block (e.g. body.colorblind-* gets
  // a `filter: url(#…)` from App.css, framer-motion can leave inline
  // transform residue on the wrapper itself, etc.). Portaling keeps
  // `position: fixed` honestly anchored to the viewport on every code
  // path, so the backdrop actually covers the screen instead of being
  // clipped to whatever the React-tree ancestor permits.
  return createPortal(
    <>
      <style>{`
        @keyframes cdwPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 83, 0, 0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(255, 83, 0, 0); }
        }
        @keyframes cdwShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      {/* Backdrop layer: covers the viewport, applies the radial
          gradient + slight transparency, centers the constrained
          panel via flex. Framer-motion fade lives on this layer so
          the dialog still animates in/out as before. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden flex items-start sm:items-center justify-center p-4 sm:p-6"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255, 83, 0, 0.08), transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(55, 242, 209, 0.06), transparent 60%), " +
            "rgba(5, 8, 22, 0.88)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      >
        {/* Grid lines decorate the backdrop layer, behind the panel,
            masked to fade at edges. They stay on the backdrop so the
            panel reads as a solid contained surface. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255, 83, 0, 0.025) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(255, 83, 0, 0.025) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 80%)",
          }}
        />

        {/* Panel: centered, constrained, rounded. The previous
            full-screen takeover content moves inside this div. The
            radial gradient + grid lines stay on the backdrop above so
            the panel reads as a contained dialog instead of a
            takeover. The Up Next rails and close button are now
            anchored to this panel via its `relative` positioning;
            their visual placement in late-combat states is a Phase 6
            queue-redesign concern and intentionally untouched here. */}
        <div
          className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-y-auto overflow-x-hidden"
          style={{ background: "#050816" }}
        >
          <button
            onClick={onClose}
            className="combat-close absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-30"
          >
            <X className="w-6 h-6" />
          </button>

          {renderUpNext("left")}
          {renderUpNext("right")}

          {/* Header */}
          <header
            className="combat-header relative z-10 flex flex-col items-center gap-[18px]"
            // 32px inside the panel — the prior 56 was sized for a
            // full-viewport takeover and feels too generous now that
            // the panel has its own top edge with rounded corners.
            style={{ paddingTop: 32 }}
          >
            {renderCombatTitle()}
            {renderStepIndicator()}
          </header>

        {/* Stage */}
        <div
          className="combat-stage relative z-10"
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr 320px",
            gap: 24,
            padding: "32px 32px 24px",
            maxWidth: '1200px',
            margin: "0 auto",
            alignItems: "center",
          }}
        >
          {/* Actor */}
          <div className="flex flex-col items-center">
            {renderCombatantCard(actor, "actor")}
          </div>

          {/* Dice zone */}
          <div className="flex flex-col items-center gap-4 w-full">
            <div
              className="relative rounded-3xl"
              style={{
                width: 320,
                height: 320,
                background:
                  "radial-gradient(ellipse at center, rgba(255,83,0,0.08), transparent 70%), rgba(15,18,25,0.5)",
                border: "1px solid rgba(255,83,0,0.15)",
                boxShadow:
                  "inset 0 0 40px rgba(0,0,0,0.5), 0 0 60px rgba(0,0,0,0.4)",
                overflow: "hidden",
              }}
            >
              {/* DiceRoller is mounted unconditionally and re-keyed on
                  the requested dice type. `initialDice` only takes
                  effect on mount, so the key change is what swaps the
                  tray from d20 (attack) to the damage die (d4/d6/d8…).
                  `autoCloseOnReveal` is left off because every
                  `dicePopup.onComplete` callback in this component
                  already closes the popup synchronously — leaving it
                  on schedules an orphan 1.6s `onClose` timer that can
                  fire after the next phase has reopened the popup and
                  close the new roll mid-flight. Phase-aware overlays
                  sit on top with pointer-events:none so they never
                  block the dice. */}
              <div style={{ position: "absolute", inset: 0 }}>
                {(() => {
                  // DM Screen Mode — players see a placeholder gif
                  // instead of the GM's dice canvas. Only fires when
                  // all three apply:
                  //   1. campaign.settings.gm_screen_mode is true
                  //   2. viewer is a spectator (so the rolling actor
                  //      doesn't see their own dice hidden)
                  //   3. rolling actor is GM-controlled (attackerId
                  //      not prefixed `player-`). Player-rolled
                  //      actions remain visible to GM regardless;
                  //      there's no PC screen mode.
                  // Action label, post-roll readout, and DONE button
                  // logic all stay outside this branch — only the
                  // dice canvas swaps.
                  const attackerId = spectatorData?.attackerId || "";
                  const isGmRolledAction = !!attackerId && !attackerId.startsWith('player-');
                  const screenModeActive = gmScreenMode && isSpectator && isGmRolledAction;
                  if (screenModeActive) {
                    return (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(5, 8, 22, 0.85)",
                        }}
                      >
                        <img
                          src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/UI/DiceWait.gif"
                          alt="GM is rolling…"
                          style={{
                            maxWidth: "70%",
                            maxHeight: "70%",
                            objectFit: "contain",
                            filter: "drop-shadow(0 0 16px rgba(255, 83, 0, 0.4))",
                          }}
                        />
                      </div>
                    );
                  }
                  return (
                    <DiceRoller
                      key={dicePopup.dice || "d20"}
                      isOpen={dicePopup.open}
                      onClose={() => setDicePopup((p) => ({ ...p, open: false }))}
                      initialDice={dicePopup.dice}
                      forcedResult={dicePopup.forcedResult}
                      onRollComplete={dicePopup.onComplete}
                      modifier={dicePopup.state || "none"}
                      // Spectators don't physically interact with the
                      // dice arena, so the actor's click-to-roll path
                      // never fires for them. autoRollOnOpen tells
                      // DiceRoller to execute one roll the moment the
                      // popup opens with a forcedResult — the watching
                      // seat then sees the same animation the rolling
                      // player saw.
                      autoRollOnOpen={isSpectator}
                      primaryColor={currentUserProfile?.profile_color_1 || "#FF5300"}
                      secondaryColor={currentUserProfile?.profile_color_2 || "#f8a47c"}
                      isThemedSkin={true}
                      config={campaignConfig}
                      compact={true}
                    />
                  );
                })()}
              </div>

              {/* Ready-state overlay */}
              {phase === "ready" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontSize: 96, color: "rgba(255,255,255,0.06)" }}>
                    ⚔
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.32em",
                      color: "#5A6478",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {flowType === "skill_check"
                      ? `Ready — ${resolved?.skill || "Skill"} Check`
                      : flowType === "saving_throw"
                      ? `${(resolved?.save || "DEX").toUpperCase()} Save`
                      : flowType === "heal"
                      ? "Ready to Heal"
                      : flowType === "effect"
                      ? "Ready to Cast"
                      : "Ready"}
                  </div>
                </div>
              )}

              {/* Result overlays — positioned absolute, never block
                  the underlying DiceRoller surface. */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <AnimatePresence>{renderResultBurst()}</AnimatePresence>
              </div>
            </div>

            <div
              className="flex flex-col items-center gap-3"
              style={{ width: 320 }}
            >
              {renderConditionPreview()}
              {renderD20Prompts()}
              {renderPostHitPrompts()}
              {renderSpectatorReadout()}
              {renderActionButton()}
            </div>
          </div>

          {/* Target — hide entirely for target-less skill checks */}
          <div className="flex flex-col items-center">
            {!(flowType === "skill_check" && !target) &&
              renderCombatantCard(target, "target")}
          </div>
        </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
}
