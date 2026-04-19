import React, { useState } from "react";
import { Heart, Circle, Triangle, Music, Zap, ChevronLeft, ChevronRight, Swords, Sword, Sparkles, Plus as PlusIcon, Star } from "lucide-react";
import { spellIcons, spellDetails as hardcodedSpellDetails } from "@/components/dnd5e/spellData";

const SPELL_ICONS_CI = Object.fromEntries(
  Object.entries(spellIcons).map(([k, v]) => [k.toLowerCase(), v]),
);
const getSpellIcon = (name) => {
  if (!name) return undefined;
  return spellIcons[name] || SPELL_ICONS_CI[String(name).toLowerCase()];
};
import { hpBarColor } from "@/components/combat/hpColor";
import {
  RAGES_PER_DAY,
  kiPoints,
  CLASS_ABILITY_MECHANICS,
} from "@/components/dnd5e/dnd5eRules";
import { computeArmorClass } from "@/components/dnd5e/armorClass";

const PC_ICON_BASE = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/abilities/basic%20actions";
const MONSTER_ICON_BASE = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/monsters/monster%20abilities";

const basicActionIcons = [
  { name: "Non-Lethal", url: `${PC_ICON_BASE}/non-lethal.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20non-lethal.png`, toggleable: true },
  { name: "Dash", url: `${PC_ICON_BASE}/dash.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20dash.png` },
  { name: "Disengage", url: `${PC_ICON_BASE}/disengage.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20disengage.png` },
  { name: "Dodge", url: `${PC_ICON_BASE}/dodge.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20dodge.png` },
  { name: "Help", url: `${PC_ICON_BASE}/help%20action.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20help%20action.png` },
  { name: "Grapple", url: `${PC_ICON_BASE}/grapple.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20grapple.png` },
  { name: "Throw", url: `${PC_ICON_BASE}/throw.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20throw.png` },
  { name: "Hide", url: `${PC_ICON_BASE}/hide.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20hide.png` },
  { name: "Sneak", url: `${PC_ICON_BASE}/sneak.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20sneak.png`, toggleable: true },
  { name: "Ready Action", url: `${PC_ICON_BASE}/ready%20action.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20ready%20action.png` }
];

const PC_MELEE_ICON = `${PC_ICON_BASE}/melee.png`;
const PC_RANGED_ICON = `${PC_ICON_BASE}/ranged.png`;
const PC_UNARMED_ICON = `${PC_ICON_BASE}/unarmed.png`;
const MONSTER_MELEE_ICON = `${MONSTER_ICON_BASE}/monster%20melee.png`;
const MONSTER_RANGED_ICON = `${MONSTER_ICON_BASE}/monster%20ranged.png`;
const MONSTER_UNARMED_ICON = `${MONSTER_ICON_BASE}/monster%20unarmed.png`;

// Class tint map — apply as a CSS filter to the base action icons to
// visually differentiate class-specific bonus-action variants. Only Rogue
// and Monk are actually used in the UI today; the others are future-proof
// placeholders so downstream code can add them without a refactor.
const CLASS_TINT = {
  Rogue: 'hue-rotate(260deg) saturate(1.5)',    // purple
  Monk: 'hue-rotate(160deg) saturate(1.5)',     // teal
  Barbarian: 'hue-rotate(0deg) saturate(2)',    // deep red
  Fighter: 'hue-rotate(30deg) saturate(1.5)',   // bronze
  Ranger: 'hue-rotate(90deg) saturate(1.5)',    // forest green
  Paladin: 'hue-rotate(45deg) saturate(2)',     // gold
};
// Tint used when a monster/NPC has an action that can be fired as a
// bonus action (e.g. legendary creatures with natural "quick strike"
// abilities). Not wired to real monster data yet.
const MONSTER_BONUS_TINT = 'hue-rotate(340deg) saturate(1.5)'; // crimson

export default function CombatActionBar({
  character,
  onActionClick,
  className,
  actionsState,
  setActionsState,
  // The Attack button is a stateful 4-state toggle controlled by the parent:
  //   null → 'melee' → 'ranged' → 'unarmed' → null
  // Clicking the button does NOT fire an attack — it just cycles attackMode.
  // The actual attack happens when the parent's target-selection flow picks
  // a target while attackMode is set.
  attackMode = null,
  onAttackModeChange,
  // Sneak / Hide gating — the Sneak toggle is locked unless the parent
  // says the character is currently hidden (i.e. a Hide skill check
  // resolved successfully). When isHidden goes false the Sneak toggle is
  // force-cleared via the parent's reveal flow.
  isHidden = false,
  sneakActive: sneakActiveProp,
  onSneakToggle,
  // Non-lethal toggle — parent-controlled so the damage flow can see
  // whether the killing blow should stabilise instead of triggering
  // death saves.
  nonLethalActive: nonLethalActiveProp,
  onNonLethalToggle,
  // Spell slot tracker. maxSpellSlots / spentSpellSlots are both
  // objects keyed by spell level ({ 1: 4, 2: 3, ... }). onToggleSlot is
  // (level, 'spend' | 'restore') → void, used when the GM clicks a
  // specific dot to override the auto-tracking.
  maxSpellSlots = {},
  spentSpellSlots = {},
  onToggleSlot,
  // Ki diamond click handler (Monk). Called with 'spend' | 'restore' so
  // the GM can correct a miscount by clicking a diamond. Max ki is
  // derived from monk level via kiPoints(); current ki lives on
  // classResources.kiRemaining.
  onToggleKi,
  // Sorcery point diamond click handler (Sorcerer). Same
  // spend/restore semantics as the ki diamonds.
  onToggleSorceryPoint,
  // Font of Magic conversion triggers. onConvertSlotToSP opens a
  // slot picker modal at the parent level; onConvertSPToSlot opens
  // the reverse picker. Both live on GMPanel because they need to
  // mutate spentSlots in addition to classResources.
  onConvertSlotToSP,
  onConvertSPToSlot,
  // Lucky feat pip click handler. 'spend' | 'restore' like the
  // sibling resource dots.
  onToggleLuck,
  // Off-hand bonus attack hook. GM panel fires this when the player
  // has used their main action on a melee attack and a weapon is
  // sitting in the Weapon 2 slot — clicking the attack button at that
  // point should trigger an off-hand bonus-action attack, not cycle
  // the normal attack mode.
  onOffhandAttack,
  // Class ability resources + handler. classResources is the per-
  // character resource object from combat_data.classResources.
  // onClassAbility(abilityName, payload?) is called when the player
  // clicks a class ability button — the parent (GMPanel / PlayerPanel)
  // handles the effect, resource decrement, and persistence.
  classResources = {},
  onClassAbility,
}) {
  // Internal state if not provided controlled
  const [localActions, setLocalActions] = useState({ action: true, bonus: true, reaction: true, inspiration: false });
  const actions = actionsState || localActions;
  const setActions = setActionsState || setLocalActions;

  const [localNonLethal, setLocalNonLethal] = useState(false);
  const nonLethalActive = typeof nonLethalActiveProp === 'boolean' ? nonLethalActiveProp : localNonLethal;
  const setNonLethalActive = (next) => {
    if (onNonLethalToggle) onNonLethalToggle(next);
    else setLocalNonLethal(next);
  };
  // Sneak is controlled by the parent when onSneakToggle is provided,
  // otherwise fall back to an internal toggle (so the component still
  // works in isolation / Storybook).
  const [localSneakActive, setLocalSneakActive] = useState(false);
  const sneakActive = onSneakToggle ? !!sneakActiveProp : localSneakActive;

  // Determine if selected character is a creature (monster/npc) vs humanoid (player)
  const isCreature = character?.type === 'monster' || character?.type === 'npc';
  const [scrollPosition, setScrollPosition] = useState(0);

  // Get weapons from equipment
  const equipment = character?.equipment || {};
  const meleeWeapon = equipment.weapon1;
  const rangedWeapon = equipment.ranged;
  const offHandWeapon = equipment.weapon2;

  const attackIsTargeting = attackMode !== null && attackMode !== undefined;

  // Off-hand bonus attack availability — D&D 5e two-weapon fighting.
  // Becomes live ONLY when the main Action has been used this turn,
  // the bonus action is still free, the character is wielding a
  // weapon in the Weapon 2 slot, and they're not currently mid-cycle
  // on another targeting mode. The attack button swaps its icon /
  // tooltip / click behaviour when this is true so the GM sees at a
  // glance that the next click fires an off-hand attack, not a main
  // action. Dual Wielder feat + light-weapon restriction aren't
  // enforced here — the GM can hand them any weapon in Weapon 2 and
  // it'll work.
  const offHandAvailable =
    !isCreature &&
    !!offHandWeapon &&
    !attackIsTargeting &&
    actions.action === false &&
    actions.bonus === true;

  // 4-state cycle: null → 'melee' → 'ranged' → 'unarmed' → null
  // Clicking this button DOES NOT trigger an attack — it only cycles the
  // selected attack mode. The parent uses attackMode to enter targeting mode
  // and fires the attack when the GM clicks a combatant portrait.
  const handleAttackClick = () => {
    // Off-hand path takes precedence: when the conditions above line
    // up, a click fires the off-hand bonus attack instead of cycling
    // the normal attack mode. The parent consumes the bonus action
    // after resolution.
    if (offHandAvailable && onOffhandAttack) {
      onOffhandAttack(offHandWeapon);
      return;
    }

    // Monster / NPC with a declared primary action → single-click fire.
    // If the monster has no declared actions, fall through to the same
    // 4-state cycle characters use so the button always does something.
    if (isCreature) {
      const actionsList = character?.actions || character?.stats?.actions || [];
      const primaryAction = actionsList[0];
      if (primaryAction) {
        onActionClick && onActionClick(primaryAction);
        return;
      }
    }

    let next;
    if (attackMode === null || attackMode === undefined) next = 'melee';
    else if (attackMode === 'melee') next = 'ranged';
    else if (attackMode === 'ranged') next = 'unarmed';
    else next = null; // 'unarmed' → cancel

    onAttackModeChange && onAttackModeChange(next);
  };
  const [showSpellDetails, setShowSpellDetails] = useState(null);
  const [hoveredSpell, setHoveredSpell] = useState(null);
  const [hoverTimer, setHoverTimer] = useState(null);

  // Effective AC: prefer a computation that accounts for equipped
  // armor/shield + DEX + Fighting Style: Defense (+1 when armored).
  // Falls back to the static character.armor_class field when the
  // character has no equipped armor (e.g. monsters, sheets without
  // gear slots).
  const fightingStylesList = React.useMemo(() => {
    if (!character) return [];
    const out = [];
    const primary = character.fighting_style || character.fightingStyle;
    if (primary) out.push(typeof primary === 'string' ? primary : primary.name);
    const arr = character.fighting_styles;
    if (Array.isArray(arr)) {
      for (const s of arr) out.push(typeof s === 'string' ? s : s?.name);
    }
    const feats = character.features;
    if (Array.isArray(feats)) {
      for (const s of feats) out.push(typeof s === 'string' ? s : s?.name);
    }
    return out.filter(Boolean);
  }, [character]);
  const ac = React.useMemo(() => {
    if (!character) return 10;
    const equipped = character.equipped || character.equipment || {};
    const hasArmor = Object.values(equipped).some((i) => i?.category === 'armor');
    if (!hasArmor) return character.armor_class || 10;
    const dexScore =
      character.attributes?.dex ||
      character.stats?.dexterity ||
      10;
    try {
      const breakdown = computeArmorClass({
        equipped,
        dex: dexScore,
        fightingStyles: fightingStylesList,
      });
      return breakdown.total || character.armor_class || 10;
    } catch {
      return character.armor_class || 10;
    }
  }, [character, fightingStylesList]);
  // Ki diamond row — only shown for Monks (level 2+). Max comes from
  // the level-keyed kiPoints() table; current is whatever the class-
  // resources block says (falls back to max when undefined so we don't
  // show the row as fully spent before initialisation).
  const kiMax = React.useMemo(() => {
    if (!character) return 0;
    const cls = (character.class || character.stats?.class || '').toString();
    if (!/monk/i.test(cls)) return 0;
    const level = character.level || character.stats?.level || 1;
    if (level < 2) return 0;
    return kiPoints(level);
  }, [character]);
  const kiCurrent = kiMax > 0
    ? Math.max(0, Math.min(kiMax, classResources.kiRemaining ?? kiMax))
    : 0;

  // Sorcery Point diamond row — Sorcerer level 2+. Max = sorcerer
  // level (Font of Magic). Follows the exact same click-to-correct
  // semantics as the ki row, just purple.
  const sorceryMax = React.useMemo(() => {
    if (!character) return 0;
    const cls = (character.class || character.stats?.class || '').toString();
    if (!/sorcerer/i.test(cls)) return 0;
    const level = character.level || character.stats?.level || 1;
    if (level < 2) return 0;
    return level;
  }, [character]);
  const sorceryCurrent = sorceryMax > 0
    ? Math.max(0, Math.min(sorceryMax, classResources.sorceryPointsRemaining ?? sorceryMax))
    : 0;

  // Lucky feat — 3 gold dots (long rest recharge). Surfaces only for
  // characters with the feat on their sheet.
  const luckyMax = React.useMemo(() => {
    if (!character) return 0;
    const feats = Array.isArray(character.feats)
      ? character.feats
      : Array.isArray(character.features)
        ? character.features
        : [];
    const hasLucky = feats.some((f) => {
      const n = typeof f === 'string' ? f : f?.name;
      return typeof n === 'string' && n.toLowerCase() === 'lucky';
    });
    return hasLucky ? 3 : 0;
  }, [character]);
  const luckyCurrent = luckyMax > 0
    ? Math.max(0, Math.min(luckyMax, classResources.luckyPointsRemaining ?? luckyMax))
    : 0;
  const initiative = character?.initiative || 0;
  const speed = character?.speed || 30;
  const currentHp = character?.hit_points?.current || 0;
  const maxHp = character?.hit_points?.max || 10;
  const tempHp = character?.hit_points?.temporary || 0;
  const totalMaxHp = maxHp + (tempHp > 0 ? tempHp : 0);
  const hpPercent = Math.min((currentHp / totalMaxHp) * 100, 100);
  const tempHpPercent = Math.min((tempHp / totalMaxHp) * 100, 100);

  const defaultSpells = React.useMemo(() => {
    if (!character) return [];

    // Normalize a spell entry (string or object) into an object and
    // attach its known spell level so the GMPanel slot consumption can
    // read action.level directly when the spell is clicked. Cantrips are
    // level 0 and never burn a slot.
    const normalize = (spell, level) => {
      if (!spell) return null;
      if (typeof spell === 'string') return { name: spell, level };
      return { ...spell, level: typeof spell.level === 'number' ? spell.level : level };
    };

    // Enriched spells array — each entry may already carry its level.
    if (Array.isArray(character.spells) && character.spells.length > 0) {
      return character.spells.map((s) => normalize(s, s?.level)).filter(Boolean);
    }

    // Fallback to spells object bucketed by level.
    const spellSource = character.spells || character.stats?.spells;
    if (spellSource && typeof spellSource === 'object') {
      const buckets = [
        { level: 0, arr: spellSource.cantrips },
        { level: 1, arr: spellSource.level1 },
        { level: 2, arr: spellSource.level2 },
        { level: 3, arr: spellSource.level3 },
        { level: 4, arr: spellSource.level4 },
        { level: 5, arr: spellSource.level5 },
        { level: 6, arr: spellSource.level6 },
        { level: 7, arr: spellSource.level7 },
        { level: 8, arr: spellSource.level8 },
        { level: 9, arr: spellSource.level9 },
      ];
      const out = [];
      for (const { level, arr } of buckets) {
        if (!arr) continue;
        for (const s of arr) {
          const n = normalize(s, level);
          if (n) out.push(n);
        }
      }
      return out;
    }

    return [];
  }, [character]);

  const visibleSpellCount = 8;

  // Class-specific bonus action variants. These are the "same" actions as
  // the main row (Dash, Disengage, etc.) but cost a bonus action instead of
  // an action, because the class feature grants the upgrade. Each entry
  // carries a class key (drives the tint) and a classFeature label (flows
  // through to onActionClick + the resolver).
  const classBonusActions = React.useMemo(() => {
    if (!character || isCreature) return [];
    const cls = (character.class || character.stats?.class || '').toLowerCase();
    const level = character.level || character.stats?.level || 1;
    const list = [];

    // Rogue — Cunning Action (2+): bonus-action Dash / Disengage / Hide.
    if (cls.includes('rogue') && level >= 2) {
      list.push(
        { name: 'Dash', classFeature: 'Cunning Action', classKey: 'Rogue' },
        { name: 'Disengage', classFeature: 'Cunning Action', classKey: 'Rogue' },
        { name: 'Hide', classFeature: 'Cunning Action', classKey: 'Rogue' },
      );
    }

    // Monk — Step of the Wind (Dash/Disengage) + Patient Defense (Dodge),
    // 2+, each costs 1 Ki. Ki tracking isn't implemented yet; the GM
    // enforces it manually for now.
    if (cls.includes('monk') && level >= 2) {
      list.push(
        { name: 'Dash', classFeature: 'Step of the Wind', classKey: 'Monk' },
        { name: 'Disengage', classFeature: 'Step of the Wind', classKey: 'Monk' },
        { name: 'Dodge', classFeature: 'Patient Defense', classKey: 'Monk' },
      );
    }

    return list;
  }, [character, isCreature]);

  // Class abilities that appear in the spell/ability row.
  // Pattern 1 (Toggle): Rage, Reckless Attack
  // Pattern 2 (One-Click): Second Wind, Action Surge, Flurry, Bardic Inspiration
  const classAbilities = React.useMemo(() => {
    if (!character || isCreature) return [];
    const cls = (character.class || character.stats?.class || '');
    const clsLower = cls.toLowerCase();
    const level = character.level || character.stats?.level || 1;
    const list = [];

    // Barbarian
    if (clsLower.includes('barbarian')) {
      list.push({
        id: 'rage',
        name: 'Rage',
        pattern: 'toggle',
        classKey: 'Barbarian',
        active: !!classResources.isRaging,
        usesRemaining: classResources.ragesRemaining ?? (RAGES_PER_DAY[level] || 2),
        usesMax: RAGES_PER_DAY[level] || 2,
        disabled: (classResources.ragesRemaining ?? 1) <= 0 && !classResources.isRaging,
        cost: 'bonus',
      });
      if (level >= 2) {
        list.push({
          id: 'reckless',
          name: 'Reckless',
          pattern: 'toggle',
          classKey: 'Barbarian',
          active: !!classResources.recklessActive,
          cost: 'free',
        });
      }
    }

    // Fighter
    if (clsLower.includes('fighter')) {
      list.push({
        id: 'secondWind',
        name: 'Second Wind',
        pattern: 'oneclick',
        classKey: 'Fighter',
        disabled: !!classResources.secondWindUsed,
        cost: 'bonus',
      });
      if (level >= 2) {
        const maxSurge = level >= 17 ? 2 : 1;
        list.push({
          id: 'actionSurge',
          name: 'Action Surge',
          pattern: 'oneclick',
          classKey: 'Fighter',
          usesRemaining: classResources.actionSurgeRemaining ?? maxSurge,
          usesMax: maxSurge,
          disabled: (classResources.actionSurgeRemaining ?? 1) <= 0,
          cost: 'free',
        });
      }
    }

    // Monk
    if (clsLower.includes('monk') && level >= 2) {
      const maxKi = kiPoints(level);
      list.push({
        id: 'flurry',
        name: 'Flurry',
        pattern: 'oneclick',
        classKey: 'Monk',
        disabled: (classResources.kiRemaining ?? maxKi) < 1 || !actions.bonus,
        cost: 'bonus',
        kiCost: 1,
      });
      if (level >= 5) {
        list.push({
          id: 'stunningStrike',
          name: 'Stunning Strike',
          pattern: 'posthit', // not rendered as a button — handled in CombatDiceWindow
          classKey: 'Monk',
        });
      }
    }

    // Paladin
    if (clsLower.includes('paladin')) {
      if (level >= 2) {
        list.push({
          id: 'divineSmite',
          name: 'Divine Smite',
          pattern: 'posthit', // not rendered as a button — handled in CombatDiceWindow
          classKey: 'Paladin',
        });
      }
      // Lay on Hands — level 1+. Pool = level × 5 HP.
      const lohMax = level * 5;
      list.push({
        id: 'layOnHands',
        name: 'Lay on Hands',
        pattern: 'oneclick',
        classKey: 'Paladin',
        usesRemaining: classResources.layOnHandsRemaining ?? lohMax,
        usesMax: lohMax,
        disabled: (classResources.layOnHandsRemaining ?? lohMax) <= 0 || !actions.action,
        cost: 'action',
      });
    }

    // Cleric — Channel Divinity: Turn Undead (level 2+).
    if (clsLower.includes('cleric') && level >= 2) {
      const maxCD = level >= 18 ? 3 : level >= 6 ? 2 : 1;
      list.push({
        id: 'turnUndead',
        name: 'Turn Undead',
        pattern: 'oneclick',
        classKey: 'Cleric',
        usesRemaining: classResources.channelDivinityRemaining ?? maxCD,
        usesMax: maxCD,
        disabled: (classResources.channelDivinityRemaining ?? maxCD) <= 0 || !actions.action,
        cost: 'action',
      });
    }

    // Druid — Wild Shape (level 2+). 2 uses per short/long rest.
    if (clsLower.includes('druid') && level >= 2) {
      const isMoon = /circle\s*of\s*the\s*moon/i.test(character.subclass || '');
      const isTransformed = !!classResources.wildShapeForm;
      list.push({
        id: 'wildShape',
        name: isTransformed ? 'Revert' : 'Wild Shape',
        pattern: 'oneclick',
        classKey: 'Druid',
        usesRemaining: classResources.wildShapeRemaining ?? 2,
        usesMax: 2,
        disabled: !isTransformed && (
          (classResources.wildShapeRemaining ?? 2) <= 0 ||
          (isMoon ? !actions.bonus : !actions.action)
        ),
        cost: isMoon ? 'bonus' : 'action',
      });
    }

    // --- Tier 3 feats (read from character.feats; fall back to
    //     features/class_features for characters that still store
    //     them loosely). ---
    const featsList = Array.isArray(character.feats)
      ? character.feats
      : Array.isArray(character.features)
        ? character.features
        : [];
    const hasFeat = (name) => featsList.some((f) => {
      const n = typeof f === 'string' ? f : f?.name;
      return typeof n === 'string' && n.toLowerCase() === name.toLowerCase();
    });

    // Great Weapon Master / Sharpshooter — Power Attack toggle
    // (-5 to hit / +10 damage). Enabled while the corresponding
    // weapon is equipped; we show the button regardless so the
    // player can pre-toggle it, and the damage window enforces the
    // weapon gate.
    if (hasFeat('Great Weapon Master') || hasFeat('Sharpshooter')) {
      const isOn = !!classResources.powerAttackActive;
      list.push({
        id: 'powerAttack',
        name: 'Power',
        pattern: 'toggle',
        classKey: (character.class || '').trim() || 'Fighter',
        active: isOn,
        cost: 'free',
      });
    }

    // Polearm Master — bonus-action butt-end attack (1d4). Only
    // qualifies when the main weapon is a glaive / halberd / pike /
    // quarterstaff / spear. Shown whenever the feat is present; if
    // the wielded weapon doesn't qualify the handler toasts an
    // error.
    if (hasFeat('Polearm Master')) {
      const w1 = character.equipped?.weapon1 || character.equipment?.weapon1;
      const w1name = (w1?.name || '').toLowerCase();
      const pamWeapon = /glaive|halberd|quarterstaff|spear|pike/.test(w1name);
      list.push({
        id: 'polearmMaster',
        name: 'Butt End',
        pattern: 'oneclick',
        classKey: (character.class || '').trim() || 'Fighter',
        disabled: !pamWeapon || !actions.bonus || !actions.action,
        cost: 'bonus',
      });
    }

    // Bard
    if (clsLower.includes('bard')) {
      const chaMod = Math.max(1, Math.floor(((character.attributes?.cha || 10) - 10) / 2));
      list.push({
        id: 'bardicInspiration',
        name: 'Inspire',
        pattern: 'oneclick',
        classKey: 'Bard',
        usesRemaining: classResources.bardicInspirationRemaining ?? chaMod,
        usesMax: chaMod,
        disabled: (classResources.bardicInspirationRemaining ?? 1) <= 0 || !actions.bonus,
        cost: 'bonus',
      });
    }

    return list;
  }, [character, isCreature, classResources, actions.bonus, actions.action]);

  // Quick lookup so we can grab icon URLs by action name when rendering
  // class bonus action entries. basicActionIcons is the canonical list.
  const basicActionByName = React.useMemo(
    () => Object.fromEntries(basicActionIcons.map((a) => [a.name, a])),
    []
  );

  // Ordered list of monster action groups for the right-side render.
  // Each entry: { key, label, color, actions, badge? }. The multiattack
  // slot rides at the front so the GM sees it first; stat-block-level
  // `multiattack.enabled` wins over an inline "Multiattack" action.
  const monsterActionGroups = React.useMemo(() => {
    if (!isCreature || !character) return [];
    const stats = character.stats || {};
    const pickList = (key) => {
      const nested = Array.isArray(stats[key]) ? stats[key] : null;
      if (nested && nested.length > 0) return nested;
      return Array.isArray(character[key]) ? character[key] : [];
    };
    const tag = (list, defaultCost) => list
      .filter((a) => a && (a.name || a.desc || a.description))
      .map((a) => ({ ...a, _cost: a.action_cost || a.cost || defaultCost }));

    // Phase context. When a phase is active, its disabled_actions
    // hide matching base-action names and its unlocked_actions land in
    // a dedicated coloured group. Phases can live on the monster stat
    // block (`stats.phases`) or the villain_data shape (§B5).
    const phases = Array.isArray(stats.phases) ? stats.phases
      : Array.isArray(character.phases) ? character.phases
      : Array.isArray(character.villain_data?.phases) ? character.villain_data.phases
      : [];
    const activePhaseIndex = typeof character.active_phase_index === "number"
      ? character.active_phase_index
      : (typeof character.active_phase === "number" ? character.active_phase : -1);
    const activePhase = activePhaseIndex >= 0 && activePhaseIndex < phases.length
      ? phases[activePhaseIndex]
      : null;
    const disabledNames = new Set(
      (activePhase?.disabled_actions || []).map((n) => String(n || "").toLowerCase()),
    );
    const notDisabled = (a) => !disabledNames.has(String(a?.name || "").toLowerCase());

    const rawActions = tag(pickList("actions"), "action").filter(notDisabled);
    let inlineMulti = null;
    const actions = [];
    for (const a of rawActions) {
      const name = (a?.name || "").toLowerCase();
      if (!inlineMulti && (name === "multiattack" || name === "multi-attack" || name === "multi attack")) {
        inlineMulti = a;
      } else {
        actions.push(a);
      }
    }
    const multiObj = stats.multiattack || character.multiattack || null;
    const multi = multiObj?.enabled
      ? { name: "Multiattack", description: multiObj.description || "", attacks: multiObj.attacks || [], _cost: "action", _isMulti: true }
      : (inlineMulti ? { ...inlineMulti, _isMulti: true } : null);

    const legendaryPerRound = stats.legendary_actions_per_round ?? character.legendary_actions_per_round ?? null;
    const legendaryLabel = legendaryPerRound ? `Legendary (${legendaryPerRound}/rd)` : "Legendary";

    const groups = [];
    if (multi) groups.push({ key: "multi", label: "Multi-Attack", color: "amber", actions: [multi] });
    if (actions.length)
      groups.push({ key: "actions", label: "Actions", color: "orange", actions });
    const bonusList = tag(pickList("bonus_actions"), "bonus_action").filter(notDisabled);
    if (bonusList.length)
      groups.push({ key: "bonus", label: "Bonus", color: "pink", actions: bonusList });
    const reactionList = tag(pickList("reactions"), "reaction").filter(notDisabled);
    if (reactionList.length)
      groups.push({ key: "reactions", label: "Reactions", color: "sky", actions: reactionList });
    const legendaryList = tag(pickList("legendary_actions"), "legendary").filter(notDisabled);
    if (legendaryList.length)
      groups.push({ key: "legendary", label: legendaryLabel, color: "gold", actions: legendaryList, badge: "L" });
    const lairList = tag(pickList("lair_actions"), "lair").filter(notDisabled);
    if (lairList.length)
      groups.push({ key: "lair", label: "Lair", color: "lime", actions: lairList });

    // Phase-unlocked actions. Each entry inherits its own action_cost
    // from the card; the `_phaseColor` hint drives the action-bar
    // group's tint so "this came from Phase 2" reads at a glance.
    if (activePhase && Array.isArray(activePhase.unlocked_actions)) {
      const pActions = activePhase.unlocked_actions
        .filter((a) => a && (a.name || a.description || a.desc))
        .map((a) => ({ ...a, _cost: a.action_cost || "action", _isPhase: true, _phaseColor: activePhase.phase_color }));
      if (pActions.length > 0) {
        groups.push({
          key: `phase-${activePhaseIndex}`,
          label: activePhase.name || "Phase",
          color: "phase",
          phaseColor: activePhase.phase_color || "#ef4444",
          actions: pActions,
        });
      }
    }

    // Villain actions sit in their own block with round badges. The
    // `_spent` flag lives in combat state (character.villain_spent[]),
    // which the GM sets when the prompt fires at the end of a turn.
    const villain = stats.villain_actions
      || character.villain_actions
      || character.villain_data?.villain_actions
      || null;
    if (villain?.enabled && Array.isArray(villain.actions)) {
      const spent = Array.isArray(character.villain_spent) ? character.villain_spent : [];
      const vActions = villain.actions.map((a, i) => ({
        ...a,
        _cost: "free",
        _isVillain: true,
        _round: a.round || (i + 1),
        _spent: spent.includes(a.round || (i + 1)),
      }));
      if (vActions.length > 0) {
        groups.push({ key: "villain", label: "Villain Actions", color: "crimson", actions: vActions });
      }
    }
    return groups;
  }, [character, isCreature]);

  const monsterSpells = React.useMemo(() => {
    if (!isCreature || !character) return [];
    const stats = character.stats || {};
    const collect = [];
    const push = (name, level) => {
      if (!name) return;
      const clean = typeof name === "string" ? name.trim() : name?.name?.trim();
      if (!clean) return;
      collect.push({ name: clean, level: typeof level === "number" ? level : undefined });
    };
    const sources = [stats.spells, stats.spellcasting?.spells, character.spells];
    for (const src of sources) {
      if (!src) continue;
      if (Array.isArray(src)) {
        for (const s of src) push(s, typeof s === "object" ? s?.level : undefined);
      } else if (typeof src === "object") {
        const buckets = [
          { level: 0, arr: src.cantrips || src.at_will || src["at will"] || src.atWill },
          { level: 1, arr: src.level1 || src["1"] || src.first },
          { level: 2, arr: src.level2 || src["2"] || src.second },
          { level: 3, arr: src.level3 || src["3"] || src.third },
          { level: 4, arr: src.level4 || src["4"] || src.fourth },
          { level: 5, arr: src.level5 || src["5"] || src.fifth },
          { level: 6, arr: src.level6 || src["6"] || src.sixth },
          { level: 7, arr: src.level7 || src["7"] || src.seventh },
          { level: 8, arr: src.level8 || src["8"] || src.eighth },
          { level: 9, arr: src.level9 || src["9"] || src.ninth },
        ];
        for (const { level, arr } of buckets) {
          if (!Array.isArray(arr)) continue;
          for (const s of arr) push(s, level);
        }
      }
    }
    // Dedupe by lowercase name.
    const seen = new Set();
    return collect.filter((s) => {
      const k = s.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [character, isCreature]);

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollPosition + visibleSpellCount < defaultSpells.length;

  const handleSpellHover = (spell) => {
    setHoveredSpell(spell);
    const timer = setTimeout(() => {
      setShowSpellDetails(spell);
    }, 3000);
    setHoverTimer(timer);
  };

  const handleSpellLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setHoveredSpell(null);
    setShowSpellDetails(null);
  };

  const getSpellDetail = (spellName) => {
    const name = typeof spellName === 'string' ? spellName : spellName.name;
    return hardcodedSpellDetails[name];
  };

  return (
    <div className={`relative z-20 rounded-[32px] bg-[#050816]/95 px-6 pt-4 pb-4 shadow-[0_20px_60px_rgba(0,0,0,0.75)] ${className}`}>
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-end gap-3">
          <StatHump label="AC" value={ac} />
          <StatHump label="INITIATIVE" value={initiative >= 0 ? `+${initiative}` : initiative} short />
          <StatHump label="SPEED" value={`${speed} ft.`} short />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#050816] border border-[#111827] flex items-center justify-center relative shadow-lg">
            <Heart className="w-5 h-5 text-white fill-transparent" strokeWidth={2.5} />
          </div>
          <div className="w-64">
            <div className="h-5 rounded-full bg-[#111827] overflow-hidden relative border border-[#1e293b]">
              <div className={`h-full absolute left-0 top-0 ${hpBarColor(hpPercent)}`} style={{ width: `${hpPercent}%` }} />
              {tempHp > 0 && <div className="h-full absolute top-0 bg-orange-500" style={{ left: `${hpPercent}%`, width: `${tempHpPercent}%` }} />}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-300 px-1">
              <span>{currentHp} / {maxHp} HP</span>
              {tempHp > 0 && <span className="text-orange-400">+{tempHp} Temp</span>}
            </div>
          </div>
        </div>
        <div className="h-12 w-[1px] bg-[#1e293b] mx-2" />
        <div className="flex-1 flex items-center gap-6">
          <div className="flex items-center gap-2">
            {/* Action & Bonus Action are display-only during combat; consumed by the system */}
            <ActionButton active={actions.action} color="green" icon={Circle} />
            <ActionButton active={actions.bonus} color="orange" icon={Triangle} />
            <ActionButton active={actions.reaction} color="purple" icon={Zap} />
            <ActionButton active={actions.inspiration} onClick={() => setActions(p => ({...p, inspiration: !p.inspiration}))} color="yellow" icon={Music} />
          </div>
        </div>
      </div>

      {/* Resource tracker row — Ki diamonds for Monks (level 2+),
          Sorcery Point diamonds for Sorcerers (level 2+), spell slot
          dots for casters. Dividers between sections. Same click-to-
          correct semantics for each: clicking a filled glyph spends
          one, clicking an empty one restores. */}
      {(kiMax > 0 || sorceryMax > 0 || luckyMax > 0 || Object.keys(maxSpellSlots).length > 0) && (
        <div className="flex items-center gap-3 mb-3 px-1 flex-wrap">
          {sorceryMax > 0 && (
            <>
              <span className="text-[9px] uppercase tracking-[0.22em] text-[#a855f7] font-bold">
                SP
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: sorceryMax }).map((_, i) => {
                  const isFilled = i < sorceryCurrent;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!onToggleSorceryPoint) return;
                        onToggleSorceryPoint(isFilled ? 'spend' : 'restore');
                      }}
                      title={`Sorcery point ${i + 1} — ${isFilled ? 'available' : 'spent'}`}
                      className={`text-base leading-none transition-colors ${
                        isFilled
                          ? 'text-[#a855f7] hover:text-[#d8b4fe] drop-shadow-[0_0_4px_rgba(168,85,247,0.7)]'
                          : 'text-[#1e293b] hover:text-[#334155]'
                      }`}
                    >
                      {isFilled ? '◆' : '◇'}
                    </button>
                  );
                })}
              </div>
              {(onConvertSlotToSP || onConvertSPToSlot) && (
                <div className="flex items-center gap-1">
                  {onConvertSlotToSP && (
                    <button
                      onClick={() => onConvertSlotToSP()}
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#a855f7]/60 text-[#a855f7] hover:bg-[#a855f7]/20"
                      title="Convert a spell slot into sorcery points"
                    >
                      Slot→SP
                    </button>
                  )}
                  {onConvertSPToSlot && (
                    <button
                      onClick={() => onConvertSPToSlot()}
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-[#a855f7]/60 text-[#a855f7] hover:bg-[#a855f7]/20"
                      title="Convert sorcery points into a spell slot"
                    >
                      SP→Slot
                    </button>
                  )}
                </div>
              )}
              {(kiMax > 0 || luckyMax > 0 || Object.keys(maxSpellSlots).length > 0) && (
                <div className="h-10 w-[2px] bg-[#1e2636]" />
              )}
            </>
          )}
          {luckyMax > 0 && (
            <>
              <span className="text-[9px] uppercase tracking-[0.22em] text-[#fbbf24] font-bold">
                Luck
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: luckyMax }).map((_, i) => {
                  const isFilled = i < luckyCurrent;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!onToggleLuck) return;
                        onToggleLuck(isFilled ? 'spend' : 'restore');
                      }}
                      title={`Lucky point ${i + 1} — ${isFilled ? 'available' : 'spent'}`}
                      className={`text-sm leading-none transition-colors ${
                        isFilled
                          ? 'text-[#fbbf24] hover:text-[#fde68a] drop-shadow-[0_0_4px_rgba(251,191,36,0.7)]'
                          : 'text-[#1e293b] hover:text-[#334155]'
                      }`}
                    >
                      ●
                    </button>
                  );
                })}
              </div>
              {(kiMax > 0 || Object.keys(maxSpellSlots).length > 0) && (
                <div className="h-10 w-[2px] bg-[#1e2636]" />
              )}
            </>
          )}
          {kiMax > 0 && (
            <>
              <span className="text-[9px] uppercase tracking-[0.22em] text-[#37F2D1] font-bold">
                Ki
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: kiMax }).map((_, i) => {
                  const isFilled = i < kiCurrent;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!onToggleKi) return;
                        onToggleKi(isFilled ? 'spend' : 'restore');
                      }}
                      title={`Ki point ${i + 1} — ${isFilled ? 'available' : 'spent'}`}
                      className={`text-base leading-none transition-colors ${
                        isFilled
                          ? 'text-[#37F2D1] hover:text-[#a7f5e6] drop-shadow-[0_0_4px_rgba(55,242,209,0.7)]'
                          : 'text-[#1e293b] hover:text-[#334155]'
                      }`}
                    >
                      {isFilled ? '◆' : '◇'}
                    </button>
                  );
                })}
              </div>
              {Object.keys(maxSpellSlots).length > 0 && (
                <div className="h-10 w-[2px] bg-[#1e2636]" />
              )}
            </>
          )}
          {Object.keys(maxSpellSlots).length > 0 && (
            <>
              <span className="text-[9px] uppercase tracking-[0.22em] text-slate-400 font-bold">
                Spell Slots
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                {Object.keys(maxSpellSlots)
                  .map((k) => Number(k))
                  .filter((level) => level > 0 && maxSpellSlots[level] > 0)
                  .sort((a, b) => a - b)
                  .map((level) => {
                    const max = maxSpellSlots[level];
                    const spent = spentSpellSlots[level] || 0;
                    return (
                      <div key={level} className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-500 font-semibold">
                          L{level}
                        </span>
                        {Array.from({ length: max }).map((_, i) => {
                          const isFilled = i < max - spent;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (!onToggleSlot) return;
                                onToggleSlot(level, isFilled ? 'spend' : 'restore');
                              }}
                              title={`Level ${level} slot — ${isFilled ? 'available' : 'spent'}`}
                              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                isFilled
                                  ? 'bg-[#6366f1] hover:bg-[#818cf8] shadow-[0_0_6px_rgba(99,102,241,0.6)]'
                                  : 'bg-[#1e293b] hover:bg-[#334155] border border-[#334155]'
                              }`}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex gap-3">
          {basicActionIcons.map((action, idx) => {
            const iconUrl = (isCreature && action.monsterUrl) ? action.monsterUrl : action.url;
            const isSneakAction = action.name === "Sneak";
            const isHideAction = action.name === "Hide";
            const isNonLethal = action.name === "Non-Lethal";
            const isToggleable = action.toggleable;

            // Visual "active" state per button:
            //   Sneak      → sneakActive && isHidden
            //   Non-Lethal → nonLethalActive
            //   Hide       → isHidden (not a toggle — this just surfaces
            //                that the last Hide check succeeded; Sneak can
            //                still be turned on, the Hide click still re-
            //                rolls the Stealth check)
            const isActive =
              isSneakAction
                ? (sneakActive && isHidden)
                : isNonLethal
                ? nonLethalActive
                : isHideAction
                ? isHidden
                : false;

            // Sneak is locked until the character has actually hidden. The
            // button still renders so you can see what's available, but it's
            // greyed out and unclickable.
            const slotDisabled = isSneakAction && !isHidden;

            // Tint colour used when active — distinct per button so the GM
            // can tell at a glance which toggle is lit.
            const activeTint = isHideAction
              ? "#38bdf8" // sky-400 — "you are hidden"
              : isSneakAction
              ? "#a855f7" // purple-500 — "sneak attack primed"
              : undefined; // Non-Lethal uses the default animated border

            return (
              <BasicActionSlot
                key={idx}
                src={iconUrl}
                tooltip={
                  isSneakAction && !isHidden
                    ? "Sneak (Hide first)"
                    : isHideAction && isHidden
                    ? "Hide (currently hidden — click to re-roll)"
                    : action.name
                }
                toggleable={isToggleable}
                isActive={isActive}
                activeTint={activeTint}
                disabled={slotDisabled}
                onToggle={() => {
                  if (isSneakAction) {
                    const next = !sneakActive;
                    if (onSneakToggle) onSneakToggle(next);
                    else setLocalSneakActive(next);
                  } else if (isNonLethal) {
                    setNonLethalActive(!nonLethalActive);
                  }
                }}
                onClick={() => {
                  if (!isToggleable) {
                    onActionClick && onActionClick({ type: 'basic', name: action.name });
                  }
                }}
              />
            );
          })}
          <div className="relative">
          <BasicActionSlot
            src={(() => {
              // Off-hand preview — show the off-hand weapon icon (or a
              // melee placeholder if we don't have one) so the player
              // knows their next click is the bonus-action attack.
              if (offHandAvailable) {
                return offHandWeapon?.image_url || offHandWeapon?.image || PC_MELEE_ICON;
              }
              // Icon reflects the currently-selected attack mode. When nothing
              // is selected we show the melee icon as the idle state (since
              // the first click will select melee). Monsters use their own
              // icon variants.
              if (isCreature) {
                if (attackMode === 'ranged') return MONSTER_RANGED_ICON;
                if (attackMode === 'unarmed') return MONSTER_UNARMED_ICON;
                return MONSTER_MELEE_ICON;
              }
              if (attackMode === 'ranged') return PC_RANGED_ICON;
              if (attackMode === 'unarmed') return PC_UNARMED_ICON;
              return PC_MELEE_ICON;
            })()}
            tooltip={
              offHandAvailable
                ? `Off-hand Attack — bonus action (${safeRender(offHandWeapon?.name) || 'Weapon 2'})`
                : isCreature
                ? `Attack (${safeRender(character?.actions?.[0]?.name) || 'Default'})`
                : attackMode === 'ranged'
                ? `Ranged Attack (${safeRender(rangedWeapon?.name) || 'No Ranged Weapon'})`
                : attackMode === 'unarmed'
                ? 'Unarmed Strike'
                : attackMode === 'melee'
                ? `Melee Attack (${safeRender(meleeWeapon?.name) || 'No Melee Weapon'})`
                : `Attack — click to select (${safeRender(meleeWeapon?.name) || 'no melee'})`
            }
            toggleable={false}
            isActive={offHandAvailable || attackIsTargeting}
            disabled={false}
            onClick={handleAttackClick}
          />
          {offHandAvailable && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-[#37F2D1] bg-black/90 border border-[#37F2D1]/70 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                Off-Hand
              </span>
            </div>
          )}
          </div>
        </div>
        <div className="h-10 w-[2px] bg-[#1e2636]" />
        
        {canScrollLeft && (
          <button
            onClick={() => setScrollPosition(Math.max(0, scrollPosition - 1))}
            className="w-8 h-16 bg-[#050816]/80 hover:bg-[#0b1220] rounded-l-xl flex items-center justify-center transition-all shadow-lg z-10"
          >
            <ChevronLeft className="w-5 h-5 text-[#37F2D1]" />
          </button>
        )}

        <div
          className="flex-1 min-w-0 flex items-center gap-3 overflow-x-auto overflow-y-hidden relative custom-scrollbar"
          onWheel={(e) => {
            // Let vertical wheel gestures drive the horizontal scroll
            // through the spell / ability row — otherwise the row
            // quietly overflows under the next section on small
            // viewports and users can't see the trailing icons.
            if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {/* Fixed prefix: class-feature bonus actions. Stays put while the
              spell portion scrolls. Label + tinted icons + vertical divider
              match the styling of the main-action / spell divider. Skipped
              entirely when the character has no bonus-action class features. */}
          {classBonusActions.length > 0 && (
            <>
              <div className="flex flex-col items-start gap-0.5 pr-1 flex-shrink-0">
                <span className="text-[9px] uppercase tracking-[0.22em] text-orange-400 font-bold leading-none">
                  Bonus Action
                </span>
                <span className="text-[8px] uppercase tracking-[0.18em] text-slate-500 leading-none">
                  Class Feature
                </span>
              </div>
              {classBonusActions.map((cba, idx) => {
                const base = basicActionByName[cba.name];
                if (!base) return null;
                const tint = CLASS_TINT[cba.classKey];
                const hideActive = cba.name === 'Hide' && isHidden;
                return (
                  <BasicActionSlot
                    key={`cb-${cba.classKey}-${cba.name}-${idx}`}
                    src={base.url}
                    tooltip={`${safeRender(cba.name)} (${safeRender(cba.classFeature)}) — bonus action`}
                    iconFilter={tint}
                    isActive={hideActive}
                    activeTint={hideActive ? '#38bdf8' : undefined}
                    onClick={() => {
                      onActionClick &&
                        onActionClick({
                          type: 'basic',
                          name: cba.name,
                          costOverride: 'bonus',
                          classFeature: cba.classFeature,
                        });
                    }}
                  />
                );
              })}
              <div className="h-10 w-[2px] bg-[#1e2636] flex-shrink-0" />
            </>
          )}

          {/* Class abilities (Rage, Second Wind, Action Surge, Flurry, Inspire) */}
          {classAbilities.filter(a => a.pattern !== 'posthit').length > 0 && (
            <>
              {classAbilities.filter(a => a.pattern !== 'posthit').map((ability) => {
                const tint = CLASS_TINT[ability.classKey] || '';
                const isToggle = ability.pattern === 'toggle';
                const isActive = isToggle && ability.active;
                return (
                  <div key={ability.id} className="relative flex-shrink-0">
                    <button
                      title={safeRender(ability.name)}
                      disabled={ability.disabled}
                      onClick={() => onClassAbility && onClassAbility(ability.id, ability)}
                      className={`w-[44px] h-[44px] rounded-xl border-2 flex flex-col items-center justify-center transition-all text-[8px] font-black uppercase tracking-wider leading-none ${
                        ability.disabled
                          ? 'bg-[#0b1220] border-[#111827] text-slate-600 opacity-50 cursor-not-allowed'
                          : isActive
                          ? 'bg-gradient-to-br from-[#FF5722]/30 to-[#ef4444]/20 border-[#FF5722] text-[#FF5722] shadow-[0_0_12px_rgba(255,87,34,0.5)]'
                          : 'bg-[#0b1220] border-[#1e293b] text-slate-300 hover:border-[#37F2D1]/60 hover:text-white cursor-pointer'
                      }`}
                      style={!isActive && !ability.disabled && tint ? { filter: tint } : undefined}
                    >
                      <span className="text-[9px] leading-tight">{safeRender(ability.name)}</span>
                    </button>
                    {/* Use counter badge */}
                    {ability.usesMax != null && (
                      <div className="absolute -bottom-1 -right-1 min-w-[16px] h-[14px] bg-black/90 border border-white/30 rounded-full flex items-center justify-center px-0.5">
                        <span className="text-[8px] font-bold text-white leading-none">
                          {safeRender(ability.usesRemaining ?? '?')}/{safeRender(ability.usesMax)}
                        </span>
                      </div>
                    )}
                    {/* Used indicator for single-use abilities */}
                    {ability.pattern === 'oneclick' && ability.usesMax == null && ability.disabled && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                        <span className="text-[8px] text-slate-500 font-bold">USED</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="h-10 w-[2px] bg-[#1e2636] flex-shrink-0" />
            </>
          )}

          {/* Scrollable: cantrips + leveled spells */}
          {defaultSpells
            .slice(scrollPosition, scrollPosition + visibleSpellCount)
            .map((spell, idx) => {
              const spellName = safeRender(typeof spell === 'string' ? spell : spell?.name);
              const spellLevel = typeof spell === 'object' && typeof spell.level === 'number' ? spell.level : undefined;
              return (
                <div key={`sp-${scrollPosition + idx}`} className="relative">
                  <SpellSlot
                    src={getSpellIcon(spellName)}
                    tooltip={spellName}
                    onHover={() => handleSpellHover(spellName)}
                    onLeave={handleSpellLeave}
                    onClick={() =>
                      onActionClick &&
                      onActionClick({
                        type: 'spell',
                        name: spellName,
                        level: spellLevel,
                        spell,
                      })
                    }
                  />
                  {showSpellDetails === spellName &&
                    (() => {
                      const details = getSpellDetail(spellName);
                      if (!details) return null;
                      return (
                        <div className="absolute bottom-full left-0 mb-2 bg-[#1E2430] text-white p-4 rounded-lg text-xs w-80 shadow-2xl border-2 border-[#37F2D1] z-[100] max-h-96 overflow-y-auto custom-scrollbar pointer-events-auto">
                          <div className="font-bold mb-2 text-[#37F2D1] text-sm">{safeRender(spellName)}</div>
                          <div className="text-gray-400 mb-2">
                            {safeRender(details.level)} {safeRender(details.school)}
                          </div>
                          <div className="space-y-1 mb-2">
                            <div><span className="text-gray-400">Casting Time:</span> {safeRender(details.castingTime)}</div>
                            <div><span className="text-gray-400">Range:</span> {safeRender(details.range)}</div>
                            <div><span className="text-gray-400">Components:</span> {safeRender(details.components)}</div>
                            <div><span className="text-gray-400">Duration:</span> {safeRender(details.duration)}</div>
                          </div>
                          <div className="text-white leading-relaxed whitespace-pre-wrap">{safeRender(details.description)}</div>
                        </div>
                      );
                    })()}
                </div>
              );
            })}
          {isCreature && (
            <>
              {monsterActionGroups.map((g) => (
                <MonsterActionGroup
                  key={g.key}
                  label={g.label}
                  color={g.color}
                  phaseColor={g.phaseColor}
                  actions={g.actions}
                  badge={g.badge}
                  onActionClick={onActionClick}
                />
              ))}
              {monsterSpells.length > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-10 w-[2px] bg-[#1e2636] flex-shrink-0" />
                  <div className="flex flex-col items-start gap-0.5 pr-1 flex-shrink-0">
                    <span className="text-[9px] uppercase tracking-[0.22em] text-indigo-300 font-bold leading-none">
                      Spells
                    </span>
                  </div>
                  {monsterSpells.map((spell, idx) => {
                    const msName = safeRender(spell?.name);
                    return (
                      <SpellSlot
                        key={`msp-${idx}`}
                        src={getSpellIcon(msName)}
                        tooltip={spell?.level != null ? `${msName} (L${spell.level})` : msName}
                        onHover={() => handleSpellHover(msName)}
                        onLeave={handleSpellLeave}
                        onClick={() =>
                          onActionClick &&
                          onActionClick({
                            type: "spell",
                            name: msName,
                            level: spell?.level,
                            spell,
                          })
                        }
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
          {defaultSpells.length === 0
            && classBonusActions.length === 0
            && monsterActionGroups.length === 0
            && monsterSpells.length === 0 && (
            <div className="text-slate-500 text-xs italic flex items-center px-4">
              No spells or abilities
            </div>
          )}
        </div>

        {canScrollRight && (
          <button
            onClick={() =>
              setScrollPosition(
                Math.min(
                  Math.max(0, defaultSpells.length - visibleSpellCount),
                  scrollPosition + 1
                )
              )
            }
            className="w-8 h-16 bg-[#050816]/80 hover:bg-[#0b1220] rounded-r-xl flex items-center justify-center transition-all shadow-lg z-10"
          >
            <ChevronRight className="w-5 h-5 text-[#37F2D1]" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatHump({ label, value, short }) {
  return (
    <div className={`bg-[#050816] text-white flex flex-col items-center justify-end pt-4 pb-3 px-4 shadow-[0_12px_30px_rgba(0,0,0,0.7)] ${short ? "rounded-t-[32px] rounded-b-3xl min-w-[82px] h-14" : "rounded-t-[40px] rounded-b-3xl min-w-[82px] h-16"}`}>
      <span className="text-[9px] tracking-[0.22em] uppercase text-slate-400">{label}</span>
      <span className="mt-1 text-xl font-semibold leading-none">{value}</span>
    </div>
  );
}

function ActionButton({ active, onClick, color, icon: Icon }) {
  const colorClass =
    color === 'green'
      ? 'text-green-500 border-green-500'
      : color === 'orange'
      ? 'text-orange-500 border-orange-500'
      : color === 'purple'
      ? 'text-purple-500 border-purple-500'
      : 'text-yellow-400 border-yellow-400';
  const interactive = typeof onClick === 'function';
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`w-10 h-10 rounded-[12px] border flex items-center justify-center transition-all ${active ? `bg-[#050816] ${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.3)]` : 'bg-[#050816] border-[#111827] opacity-50'} ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <Icon className={`w-3.5 h-3.5 fill-current ${active ? colorClass.split(' ')[0] : 'text-slate-500'}`} />
    </button>
  );
}

function BasicActionSlot({ src, tooltip, toggleable, isActive, onToggle, onClick, disabled, activeTint, iconFilter }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipText = safeRender(tooltip);

  // When active, we either apply a button-specific tint (solid coloured
  // border + coloured glow) or fall back to the existing teal/orange
  // animated border.
  let activeStyle = {};
  let glowFilter = null;
  if (isActive) {
    if (activeTint) {
      activeStyle = {
        borderColor: activeTint,
        borderWidth: '3px',
        boxShadow: `0 0 18px ${activeTint}, 0 0 6px ${activeTint}`,
      };
      glowFilter = `drop-shadow(0 0 6px ${activeTint}) drop-shadow(0 0 2px ${activeTint}) brightness(1.05)`;
    } else {
      activeStyle = {
        animation: 'rotateBorder 3s linear infinite',
        borderImage: 'linear-gradient(45deg, #37F2D1, #FF5722, #37F2D1) 1',
        borderWidth: '3px',
      };
    }
  }

  // The icon can be tinted via a class filter (e.g. Rogue/Monk bonus
  // action row) and/or glowed via the active tint. Compose both so a
  // Rogue Cunning-Hide icon is purple-tinted AND sky-blue-glowing when
  // the character is actually hidden.
  const iconStyle = {};
  const filters = [];
  if (iconFilter) filters.push(iconFilter);
  if (glowFilter) filters.push(glowFilter);
  if (filters.length > 0) iconStyle.filter = filters.join(' ');

  return (
    <button
      disabled={!!disabled}
      className={`w-[52px] h-[52px] rounded-xl bg-[#050816] border-2 border-[#111827] p-[2px] flex-shrink-0 shadow-[0_14px_32px_rgba(0,0,0,0.8)] transition relative ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:-translate-y-[1px]'}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        // A disabled slot blocks both toggles and action clicks.
        if (disabled) return;
        if (toggleable && onToggle) onToggle();
        if (onClick) onClick(e);
      }}
      style={activeStyle}
    >
      <div className="w-full h-full rounded-[10px] bg-[#050816] overflow-hidden flex items-center justify-center">
        {src ? (
          <img
            src={src}
            alt={tooltipText}
            className="w-full h-full object-cover"
            style={iconStyle}
          />
        ) : null}
      </div>
      {showTooltip && tooltipText && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1E2430] text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-xl border border-[#37F2D1] z-50">
          {tooltipText}
        </div>
      )}
    </button>
  );
}

const MONSTER_GROUP_COLORS = {
  amber:   { label: "text-amber-300",   border: "border-amber-500/70",  glow: "shadow-[0_0_10px_rgba(245,158,11,0.35)]" },
  orange:  { label: "text-orange-300",  border: "border-orange-500/70", glow: "shadow-[0_0_10px_rgba(249,115,22,0.35)]" },
  pink:    { label: "text-pink-300",    border: "border-pink-500/70",   glow: "shadow-[0_0_10px_rgba(236,72,153,0.35)]" },
  sky:     { label: "text-sky-300",     border: "border-sky-500/70",    glow: "shadow-[0_0_10px_rgba(14,165,233,0.35)]" },
  gold:    { label: "text-yellow-300",  border: "border-yellow-400/80", glow: "shadow-[0_0_12px_rgba(250,204,21,0.45)]" },
  lime:    { label: "text-lime-300",    border: "border-lime-500/70",   glow: "shadow-[0_0_10px_rgba(132,204,22,0.35)]" },
  crimson: { label: "text-rose-300",    border: "border-rose-600/80",  glow: "shadow-[0_0_14px_rgba(225,29,72,0.55)]" },
  phase:   { label: "text-white",       border: "",                     glow: "" },
};

// SRD monster data is wildly inconsistent in shape. A field nominally
// expected to be a string ("damage", "description", "reach") sometimes
// arrives as a structured object ({ damage_dice, damage_type }, or
// `{ type, value }` from the 5e-api AC/senses payloads) or an array
// (legendary-action usage). `toText` collapses any of those to a
// plain string so downstream JSX can render it without blowing up.
function toText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    if (value.damage_dice || value.damage_type) {
      return [toText(value.damage_dice), toText(value.damage_type)].filter(Boolean).join(" ").trim();
    }
    // `{ type, value }` — 5e-api AC entries (`{ type: "natural", value: 17 }`),
    // proficiency rows, and anything else that splits a label from a
    // number. Prefer "type: value" so both pieces survive.
    if ("type" in value && "value" in value) {
      const t = toText(value.type);
      const v = toText(value.value);
      return t && v ? `${t}: ${v}` : (v || t);
    }
    if (typeof value.text === "string") return value.text;
    if (typeof value.name === "string") return value.name;
    if (typeof value.value !== "undefined") return toText(value.value);
    if (typeof value.desc === "string") return value.desc;
    if (typeof value.description === "string") return value.description;
    return "";
  }
  return String(value);
}

// Narrow wrapper that always returns a React-safe value. Use on ANY
// interpolated field sourced from a monster / spell / action / ability
// payload — those shapes drift enough that raw JSX interpolation is a
// liability.
function safeRender(value) {
  const text = toText(value);
  return text || "";
}

function pickActionIconKind(action) {
  if (!action) return "generic";
  if (action._isMulti) return "multi";
  const desc = toText(action.description || action.desc).toLowerCase();
  const name = toText(action.name).toLowerCase();
  const actionType = toText(action.action_type).toLowerCase();
  if (actionType === "healing" || name.includes("heal") || desc.includes("regain hit points")) return "healing";
  if (actionType === "saving_throw" || action.save_dc || action.save_ability || desc.includes("saving throw")) return "burst";
  if (actionType === "melee_attack" || actionType === "ranged_attack"
    || action.attack_bonus != null
    || /\bto hit\b|melee attack|ranged attack|\battacks?\b/.test(desc)) return "attack";
  return "generic";
}

function MonsterActionGroup({ label, color, phaseColor, actions, onActionClick, badge }) {
  const palette = MONSTER_GROUP_COLORS[color] || MONSTER_GROUP_COLORS.orange;
  const labelStyle = color === "phase" && phaseColor ? { color: phaseColor } : undefined;
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="h-10 w-[2px] bg-[#1e2636] flex-shrink-0" />
      <div className="flex flex-col items-start gap-0.5 pr-1 flex-shrink-0">
        <span
          className={`text-[9px] uppercase tracking-[0.22em] font-bold leading-none ${color === "phase" ? "" : palette.label}`}
          style={labelStyle}
        >
          {safeRender(label)}
        </span>
      </div>
      {actions.map((action, idx) => (
        <MonsterActionSlot
          key={`${safeRender(label)}-${safeRender(action.name) || "action"}-${idx}`}
          action={action}
          palette={palette}
          phaseColor={phaseColor}
          badge={badge}
          onClick={() => onActionClick && onActionClick({
            type: action._isVillain
              ? "villain_action"
              : action._isPhase
              ? "phase_action"
              : "monster_action",
            name: toText(action.name),
            description: toText(action.description || action.desc),
            attack_bonus: action.attack_bonus,
            damage: toText(action.damage || action.damage_dice),
            damage_type: toText(action.damage_type),
            save_ability: toText(action.save_ability),
            save_dc: action.save_dc,
            action_type: toText(action.action_type),
            action_cost: action._cost,
            villain_round: action._round,
            trigger: action.trigger || null,
            _raw: action,
          })}
        />
      ))}
    </div>
  );
}

function MonsterActionSlot({ action, palette, badge, phaseColor, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const kind = pickActionIconKind(action);
  const Icon =
    kind === "multi"   ? Swords :
    kind === "attack"  ? Sword :
    kind === "burst"   ? Sparkles :
    kind === "healing" ? PlusIcon :
    Star;
  const name = toText(action.name) || "Action";
  const truncated = name.length > 10 ? `${name.slice(0, 9)}…` : name;
  const reachText = toText(action.reach);
  const damageText = toText(action.damage);
  const damageTypeText = toText(action.damage_type);
  const saveAbilityText = toText(action.save_ability);
  const descText = toText(action.description || action.desc);
  const legendaryCost = Number(action.legendary_cost) || 0;
  const attackBonusText = safeRender(action.attack_bonus);
  const saveDcText = safeRender(action.save_dc);
  const tooltip = (
    <div className="max-w-[260px]">
      <div className="font-bold text-[#37F2D1] mb-1">
        {name}{legendaryCost > 1 ? ` (Costs ${legendaryCost})` : ""}
      </div>
      {action.attack_bonus != null && action.attack_bonus !== "" && (
        <div className="text-[10px] text-slate-400 mb-1">+{attackBonusText} to hit{reachText ? ` · ${reachText}` : ""}</div>
      )}
      {action.save_dc && (
        <div className="text-[10px] text-slate-400 mb-1">DC {saveDcText} {saveAbilityText || "save"}</div>
      )}
      {damageText && (
        <div className="text-[10px] text-slate-400 mb-1">{damageText} {damageTypeText}</div>
      )}
      {descText && (
        <div className="text-[10px] text-slate-300 whitespace-pre-wrap leading-snug">
          {descText.slice(0, 280)}
        </div>
      )}
    </div>
  );
  const spent = !!action._spent;
  return (
    <button
      type="button"
      disabled={spent}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative w-[52px] h-[52px] rounded-xl bg-[#050816] border-2 ${action._isPhase ? "" : palette.border} ${action._isPhase ? "" : palette.glow} flex-shrink-0 flex flex-col items-center justify-center transition hover:-translate-y-[1px] ${spent ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
      style={action._isPhase && (action._phaseColor || phaseColor)
        ? {
            borderColor: action._phaseColor || phaseColor,
            boxShadow: `0 0 10px ${action._phaseColor || phaseColor}55`,
          }
        : undefined}
      title={name}
    >
      {action._isMulti ? (
        <span className="relative inline-block w-6 h-6">
          <Swords className={`absolute left-0 top-0 w-4 h-4 ${palette.label} opacity-70`} />
          <Swords className={`absolute right-0 bottom-0 w-4 h-4 ${palette.label}`} />
        </span>
      ) : (
        <Icon
          className="w-5 h-5"
          style={action._isPhase && (action._phaseColor || phaseColor)
            ? { color: action._phaseColor || phaseColor }
            : undefined}
        />
      )}
      <span
        className={`text-[7px] leading-none font-bold uppercase mt-0.5 truncate max-w-[46px] ${action._isPhase ? "" : palette.label}`}
        style={action._isPhase && (action._phaseColor || phaseColor)
          ? { color: action._phaseColor || phaseColor }
          : undefined}
      >
        {truncated}
      </span>
      {action._isPhase && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-widest px-1 rounded"
          style={{
            background: (action._phaseColor || phaseColor || "#ef4444") + "cc",
            color: "white",
          }}
        >
          P
        </span>
      )}
      {badge && (
        <span className="absolute -top-1 -right-1 bg-black border border-yellow-400 text-yellow-300 text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
          {safeRender(badge)}
        </span>
      )}
      {action._isVillain && action._round && (
        <span className="absolute -top-1 -right-1 bg-black border border-rose-500 text-rose-300 text-[8px] font-black rounded-full w-5 h-4 flex items-center justify-center">
          R{safeRender(action._round)}
        </span>
      )}
      {action._isMulti && Array.isArray(action.attacks) && action.attacks.length > 0 && (
        <span className="absolute -top-1 -left-1 bg-black border border-amber-400 text-amber-300 text-[8px] font-black rounded-full px-1 flex items-center justify-center">
          ×{action.attacks.reduce((n, a) => n + (Number(a?.count) || 1), 0)}
        </span>
      )}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1E2430] text-white px-3 py-2 rounded-lg text-[11px] shadow-xl border border-[#37F2D1] z-50 pointer-events-none">
          {tooltip}
        </div>
      )}
    </button>
  );
}

function SpellSlot({ src, tooltip, onHover, onLeave, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipText = safeRender(tooltip);

  return (
    <button
      className="w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-[#4c1d95] via-[#6366f1] to-[#22d3ee] p-[2px] flex-shrink-0 shadow-[0_14px_32px_rgba(0,0,0,0.8)] hover:-translate-y-[1px] transition relative"
      onMouseEnter={() => {
        setShowTooltip(true);
        if (onHover) onHover();
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
        if (onLeave) onLeave();
      }}
      onClick={onClick}
    >
      <div className="w-full h-full rounded-[10px] bg-black/60 overflow-hidden">
        {src ? <img src={src} alt={tooltipText} className="w-full h-full object-cover" /> : null}
      </div>
      {showTooltip && tooltipText && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1E2430] text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-xl border border-[#37F2D1] z-50">
          {tooltipText}
        </div>
      )}
    </button>
  );
}