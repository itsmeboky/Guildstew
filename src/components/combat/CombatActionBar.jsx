import React, { useState } from "react";
import { Heart, Circle, Triangle, Music, ChevronLeft, ChevronRight } from "lucide-react";
import { spellIcons, spellDetails as hardcodedSpellDetails } from "@/components/dnd5e/spellData";

const PC_ICON_BASE = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/abilities/basic%20actions";
const MONSTER_ICON_BASE = "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/monsters/monster%20abilities";

const basicActionIcons = [
  { name: "Non-Lethal", url: `${PC_ICON_BASE}/non-lethal.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20non-lethal.png`, toggleable: true },
  { name: "Dash", url: `${PC_ICON_BASE}/dash.png`, monsterUrl: `${MONSTER_ICON_BASE}/monster%20dash.png` },
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

export default function CombatActionBar({ 
  character, 
  onActionClick, 
  className,
  actionsState,
  setActionsState
}) {
  // Internal state if not provided controlled
  const [localActions, setLocalActions] = useState({ action: true, bonus: true, inspiration: false });
  const actions = actionsState || localActions;
  const setActions = setActionsState || setLocalActions;

  const [nonLethalActive, setNonLethalActive] = useState(false);
  const [sneakActive, setSneakActive] = useState(false);
  const [attackMode, setAttackMode] = useState(0);

  // Determine if selected character is a creature (monster/npc) vs humanoid (player)
  const isCreature = character?.type === 'monster' || character?.type === 'npc';
  const [scrollPosition, setScrollPosition] = useState(0);

  // Get weapons from equipment
  const equipment = character?.equipment || {};
  const meleeWeapon = equipment.weapon1;
  const rangedWeapon = equipment.ranged;

  // Determine available modes
  // 0: Generic/Unarmed (always available if no weapons?) or just Melee if weapon1 exists
  // Let's strictly follow: Melee (Weapon 1) vs Ranged (Ranged Slot)
  // If we want to toggle, we need to know what's valid.

  const isMeleeAvailable = !!meleeWeapon;
  const isRangedAvailable = !!rangedWeapon;

  const handleAttackToggle = () => {
    let nextMode = attackMode;
    // Cycle: 0 (Melee) -> 1 (Ranged) -> 0
    // If one is missing, can we switch?
    // If currently Melee (0), try Ranged (1). If Ranged not available, stay 0? 
    // Or if Melee not available, default to Ranged?

    if (attackMode === 0) { // Switching from Melee to Ranged
       if (isRangedAvailable) nextMode = 1;
    } else { // Switching from Ranged to Melee
       if (isMeleeAvailable) nextMode = 0;
    }
    setAttackMode(nextMode);
  };

  // Ensure valid initial mode
  React.useEffect(() => {
     if (attackMode === 0 && !isMeleeAvailable && isRangedAvailable) setAttackMode(1);
     if (attackMode === 1 && !isRangedAvailable && isMeleeAvailable) setAttackMode(0);
  }, [isMeleeAvailable, isRangedAvailable]);
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
            <ActionButton active={actions.action} onClick={() => setActions(p => ({...p, action: !p.action}))} color="green" icon={Circle} />
            <ActionButton active={actions.bonus} onClick={() => setActions(p => ({...p, bonus: !p.bonus}))} color="orange" icon={Triangle} />
            <ActionButton active={actions.inspiration} onClick={() => setActions(p => ({...p, inspiration: !p.inspiration}))} color="yellow" icon={Music} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-3">
          {basicActionIcons.map((action, idx) => {
            const iconUrl = (isCreature && action.monsterUrl) ? action.monsterUrl : action.url;
            const isSneakAction = action.name === "Sneak";
            const isNonLethal = action.name === "Non-Lethal";
            const isToggleable = action.toggleable;
            const isActive = isSneakAction ? sneakActive : (isNonLethal ? nonLethalActive : false);
            
            return (
              <BasicActionSlot 
                key={idx} 
                src={iconUrl} 
                tooltip={action.name}
                toggleable={isToggleable}
                isActive={isToggleable && isActive}
                onToggle={() => {
                  if (isSneakAction) setSneakActive(!sneakActive);
                  else if (isNonLethal) setNonLethalActive(!nonLethalActive);
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
            src={isCreature 
              ? (attackMode === 1 ? MONSTER_RANGED_ICON : MONSTER_MELEE_ICON) 
              : (attackMode === 1 ? PC_RANGED_ICON : PC_MELEE_ICON)}
            tooltip={
              (character?.type === 'monster' || character?.type === 'npc')
                ? `Attack (${(character.actions?.[0]?.name) || 'Default'})`
                : (attackMode === 1 ? `Ranged Attack (${rangedWeapon?.name || 'No Weapon'})` : `Melee Attack (${meleeWeapon?.name || 'No Weapon'})`)
            }
            toggleable={!(character?.type === 'monster' || character?.type === 'npc')}
            isActive={true}
            disabled={
              !(character?.type === 'monster' || character?.type === 'npc') && 
              (attackMode === 0 ? !isMeleeAvailable : !isRangedAvailable) && !(
               // Enable if Off-hand attack is possible: Action used + Bonus available + 2nd weapon exists
               !actions.action && actions.bonus && equipment.weapon2
            )}
            onToggle={handleAttackToggle}
            onClick={() => {
              // Check for Monster Actions first
              if (character?.type === 'monster' || character?.type === 'npc') {
                const actionsList = character.actions || character.stats?.actions || [];
                const primaryAction = actionsList[0]; // Default to first action
                
                if (primaryAction) {
                   onActionClick && onActionClick(primaryAction);
                   return;
                }
              }

              // Logic for standard attack vs off-hand attack
              let weapon = attackMode === 0 ? meleeWeapon : rangedWeapon;
              let isOffHand = false;

              // Check for Off-hand trigger
              if (!actions.action && actions.bonus && equipment.weapon2) {
                 weapon = equipment.weapon2;
                 isOffHand = true;
              } else if (!actions.action) {
                 // Action used and no off-hand valid -> do nothing (disabled state usually handles this)
                 return;
              }

              if (weapon) {
                 onActionClick && onActionClick({ 
                   type: 'basic', 
                   name: 'Attack', 
                   mode: isOffHand ? 'offhand' : (attackMode === 0 ? 'melee' : 'ranged'),
                   weapon: weapon,
                   isOffHand: isOffHand
                 });
              }
            }}
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
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-[14px] border flex items-center justify-center transition-all ${active ? `bg-[#050816] ${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.3)]` : 'bg-[#050816] border-[#111827] opacity-50'}`}
    >
      <Icon className={`w-4 h-4 fill-current ${active ? colorClass.split(' ')[0] : 'text-slate-500'}`} />
    </button>
  );
}

function BasicActionSlot({ src, tooltip, toggleable, isActive, onToggle, onClick, disabled }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <button 
      className={`w-16 h-16 rounded-2xl bg-[#050816] border-2 border-[#111827] p-[2px] flex-shrink-0 shadow-[0_14px_32px_rgba(0,0,0,0.8)] transition relative ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:-translate-y-[1px]'}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        if (toggleable && onToggle) {
          onToggle();
        }
        if (onClick && !disabled) onClick(e);
      }}
      style={isActive ? {
        animation: 'rotateBorder 3s linear infinite',
        borderImage: 'linear-gradient(45deg, #37F2D1, #FF5722, #37F2D1) 1',
        borderWidth: '3px'
      } : {}}
    >
      <div className="w-full h-full rounded-[18px] bg-[#050816] overflow-hidden flex items-center justify-center">
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