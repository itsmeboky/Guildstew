import React, { useState } from "react";
import { Heart, Circle, Triangle, Music, ChevronLeft, ChevronRight } from "lucide-react";
import { spellIcons, spellDetails as hardcodedSpellDetails } from "@/components/dnd5e/spellData";

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
}) {
  // Internal state if not provided controlled
  const [localActions, setLocalActions] = useState({ action: true, bonus: true, inspiration: false });
  const actions = actionsState || localActions;
  const setActions = setActionsState || setLocalActions;

  const [nonLethalActive, setNonLethalActive] = useState(false);
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

  const attackIsTargeting = attackMode !== null && attackMode !== undefined;

  // 4-state cycle: null → 'melee' → 'ranged' → 'unarmed' → null
  // Clicking this button DOES NOT trigger an attack — it only cycles the
  // selected attack mode. The parent uses attackMode to enter targeting mode
  // and fires the attack when the GM clicks a combatant portrait.
  const handleAttackClick = () => {
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

  const ac = character?.armor_class || 10;
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
    
    // If enriched spells array exists
    if (Array.isArray(character.spells) && character.spells.length > 0) {
      return character.spells;
    }
    
    // Fallback to spells object
    const spellSource = character.spells || character.stats?.spells;
    
    if (spellSource && typeof spellSource === 'object') {
      return [
        ...(spellSource.cantrips || []),
        ...(spellSource.level1 || []),
        ...(spellSource.level2 || []),
        ...(spellSource.level3 || []),
        ...(spellSource.level4 || []),
        ...(spellSource.level5 || []),
        ...(spellSource.level6 || []),
        ...(spellSource.level7 || []),
        ...(spellSource.level8 || []),
        ...(spellSource.level9 || [])
      ];
    }
    
    return [];
  }, [character]);

  const visibleSpellCount = 8;
  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollPosition + visibleSpellCount < defaultSpells.length;

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

  // Quick lookup so we can grab icon URLs by action name when rendering
  // the class bonus row. basicActionIcons is the canonical list.
  const basicActionByName = React.useMemo(
    () => Object.fromEntries(basicActionIcons.map((a) => [a.name, a])),
    []
  );

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
          <div className="w-14 h-14 rounded-full bg-[#050816] border border-[#111827] flex items-center justify-center relative shadow-lg">
            <Heart className="w-6 h-6 text-white fill-transparent" strokeWidth={2.5} />
          </div>
          <div className="w-64">
            <div className="h-5 rounded-full bg-[#111827] overflow-hidden relative border border-[#1e293b]">
              <div className="h-full absolute left-0 top-0 bg-[#22c55e]" style={{ width: `${hpPercent}%` }} />
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
            <ActionButton active={actions.inspiration} onClick={() => setActions(p => ({...p, inspiration: !p.inspiration}))} color="yellow" icon={Music} />
          </div>
        </div>
      </div>

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
          <BasicActionSlot
            src={(() => {
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
              isCreature
                ? `Attack (${(character?.actions?.[0]?.name) || 'Default'})`
                : attackMode === 'ranged'
                ? `Ranged Attack (${rangedWeapon?.name || 'No Ranged Weapon'})`
                : attackMode === 'unarmed'
                ? 'Unarmed Strike'
                : attackMode === 'melee'
                ? `Melee Attack (${meleeWeapon?.name || 'No Melee Weapon'})`
                : `Attack — click to select (${meleeWeapon?.name || 'no melee'})`
            }
            toggleable={false}
            isActive={attackIsTargeting}
            disabled={false}
            onClick={handleAttackClick}
          />
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

        <div className="flex-1 flex gap-3 overflow-visible relative">
          {defaultSpells.slice(scrollPosition, scrollPosition + visibleSpellCount).map((spell, idx) => {
            const spellName = typeof spell === 'string' ? spell : spell.name;
            return (
              <div key={idx} className="relative">
                <SpellSlot 
                  src={spellIcons[spellName] || spellIcons[Object.keys(spellIcons).find(k => k.toLowerCase() === spellName?.toLowerCase())]} 
                  tooltip={spellName}
                  onHover={() => handleSpellHover(spellName)}
                  onLeave={handleSpellLeave}
                  onClick={() => onActionClick && onActionClick({ type: 'spell', ...spell })}
                />
                {showSpellDetails === spellName && (
                  (() => {
                    const details = getSpellDetail(spellName);
                    if (!details) return null;
                    return (
                      <div className="absolute bottom-full left-0 mb-2 bg-[#1E2430] text-white p-4 rounded-lg text-xs w-80 shadow-2xl border-2 border-[#37F2D1] z-[100] max-h-96 overflow-y-auto custom-scrollbar pointer-events-auto">
                        <div className="font-bold mb-2 text-[#37F2D1] text-sm">{spellName}</div>
                        <div className="text-gray-400 mb-2">
                          {details.level} {details.school}
                        </div>
                        <div className="space-y-1 mb-2">
                          <div><span className="text-gray-400">Casting Time:</span> {details.castingTime}</div>
                          <div><span className="text-gray-400">Range:</span> {details.range}</div>
                          <div><span className="text-gray-400">Components:</span> {details.components}</div>
                          <div><span className="text-gray-400">Duration:</span> {details.duration}</div>
                        </div>
                        <div className="text-white leading-relaxed whitespace-pre-wrap">{details.description}</div>
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })}
          {defaultSpells.length === 0 && (
            <div className="text-slate-500 text-xs italic flex items-center px-4">No spells available</div>
          )}
        </div>

        {canScrollRight && (
          <button
            onClick={() => setScrollPosition(Math.min(defaultSpells.length - visibleSpellCount, scrollPosition + 1))}
            className="w-8 h-16 bg-[#050816]/80 hover:bg-[#0b1220] rounded-r-xl flex items-center justify-center transition-all shadow-lg z-10"
          >
            <ChevronRight className="w-5 h-5 text-[#37F2D1]" />
          </button>
        )}
      </div>

      {/* Class-specific bonus action row — tinted variants of the main
          action icons that cost a bonus action instead of an action,
          gated on class + level 2+. */}
      {classBonusActions.length > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#111827]">
          <div className="flex flex-col items-start gap-0.5 pr-2 border-r border-[#111827]">
            <span className="text-[9px] uppercase tracking-[0.22em] text-orange-400 font-bold">
              Bonus Action
            </span>
            <span className="text-[8px] uppercase tracking-[0.18em] text-slate-500">
              Class Feature
            </span>
          </div>
          <div className="flex gap-3">
            {classBonusActions.map((cba, idx) => {
              const base = basicActionByName[cba.name];
              const tint = CLASS_TINT[cba.classKey];
              // Hide shows its hidden state in both the main row AND the
              // bonus row so either button reflects reality.
              const hideActive = cba.name === 'Hide' && isHidden;

              return (
                <BasicActionSlot
                  key={`${cba.classKey}-${cba.name}-${idx}`}
                  src={base?.url || null}
                  tooltip={`${cba.name} (${cba.classFeature}) — bonus action`}
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
          </div>
        </div>
      )}
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
  const colorClass = color === 'green' ? 'text-green-500 border-green-500' : color === 'orange' ? 'text-orange-500 border-orange-500' : 'text-yellow-400 border-yellow-400';
  const interactive = typeof onClick === 'function';
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`w-12 h-12 rounded-[14px] border flex items-center justify-center transition-all ${active ? `bg-[#050816] ${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.3)]` : 'bg-[#050816] border-[#111827] opacity-50'} ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <Icon className={`w-4 h-4 fill-current ${active ? colorClass.split(' ')[0] : 'text-slate-500'}`} />
    </button>
  );
}

function BasicActionSlot({ src, tooltip, toggleable, isActive, onToggle, onClick, disabled, activeTint, iconFilter }) {
  const [showTooltip, setShowTooltip] = useState(false);

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
      className={`w-16 h-16 rounded-2xl bg-[#050816] border-2 border-[#111827] p-[2px] flex-shrink-0 shadow-[0_14px_32px_rgba(0,0,0,0.8)] transition relative ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:-translate-y-[1px]'}`}
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
      <div className="w-full h-full rounded-[18px] bg-[#050816] overflow-hidden flex items-center justify-center">
        {src ? (
          <img
            src={src}
            alt={tooltip || ""}
            className="w-full h-full object-cover"
            style={iconStyle}
          />
        ) : null}
      </div>
      {showTooltip && tooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1E2430] text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-xl border border-[#37F2D1] z-50">
          {tooltip}
        </div>
      )}
    </button>
  );
}

function SpellSlot({ src, tooltip, onHover, onLeave, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <button 
      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4c1d95] via-[#6366f1] to-[#22d3ee] p-[2px] flex-shrink-0 shadow-[0_14px_32px_rgba(0,0,0,0.8)] hover:-translate-y-[1px] transition relative"
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
      <div className="w-full h-full rounded-[18px] bg-black/60 overflow-hidden">
        {src ? <img src={src} alt={tooltip || ""} className="w-full h-full object-cover" /> : null}
      </div>
      {showTooltip && tooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1E2430] text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-xl border border-[#37F2D1] z-50">
          {tooltip}
        </div>
      )}
    </button>
  );
}