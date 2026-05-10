import React, { useState, useEffect } from 'react';
import { safeText } from '@/utils/safeRender';
import { abilityModifier } from '@/components/dnd5e/dnd5eRules';
import {
  getAC as monsterGetAC,
  getSpeed as monsterGetSpeed,
  getCR as monsterGetCR,
  getSenses as monsterGetSenses,
  getLanguages as monsterGetLanguages,
  getDamageInfo as monsterGetDamageInfo,
  getAbilityScores as monsterGetAbilityScores,
} from '@/utils/monsterHelpers';
import { computeArmorClass } from '@/components/dnd5e/armorClass';
import { SectionCard, collectFightingStyles } from '@/pages/GMPanel';

/**
 * MonsterStatBlock — GM-side display of a selected monster's stats.
 *
 * Extracted from GMPanel.jsx in Phase 1.11 of the Combat Engine v2 rebuild.
 * Pure structural extraction — body is verbatim from the original inline
 * definition. Receives all data and callbacks via props (character,
 * className, onActionClick); no closure over GMPanel scope.
 *
 * SectionCard and collectFightingStyles are imported back from GMPanel
 * because they are used by other GMPanel render sites too — co-extraction
 * would create duplication. The resulting circular import is safe under
 * ESM (live bindings resolve at call time, not module-load time).
 */
export default function MonsterStatBlock({ character, className, onActionClick }) {
  const [activeTab, setActiveTab] = useState('traits');

  // Listen for custom event as fallback/bridge
  useEffect(() => {
    const handler = (e) => {
      if (onActionClick) onActionClick(e.detail);
    };
    window.addEventListener('gm-monster-action', handler);
    return () => window.removeEventListener('gm-monster-action', handler);
  }, [onActionClick]);

  if (!character) {
    return (
      <SectionCard title="Monster Stats" className={className}>
        <div className="h-full flex items-center justify-center">
          <p className="text-slate-500 text-[11px]">Select a character to view stats</p>
        </div>
      </SectionCard>
    );
  }

  // Prioritize internal stats object if available (NPC structure), otherwise use top level
  const stats = character.stats || character;
  const abilities = stats.abilities || stats.attributes || {};

  const getMod = (score) => {
    if (!score) return '+0';
    const mod = abilityModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Handle nested attributes structure or flat keys. Falls through
  // to monsterGetAbilityScores for the SRD long-name keys
  // (`strength`, `dexterity`, …) so reseeded monsters resolve too.
  const helperScores = monsterGetAbilityScores(character);
  const getAbilityScore = (key) => {
    const lk = key.toLowerCase();
    if (abilities[lk] != null) return abilities[lk];
    if (stats[lk] != null) return stats[lk];
    if (stats.attributes?.[lk] != null) return stats.attributes[lk];
    if (helperScores[lk] != null) return helperScores[lk];
    return 10;
  };

  const abilityScores = {
    STR: getAbilityScore('STR'),
    DEX: getAbilityScore('DEX'),
    CON: getAbilityScore('CON'),
    INT: getAbilityScore('INT'),
    WIS: getAbilityScore('WIS'),
    CHA: getAbilityScore('CHA')
  };

  // Features can be in various places depending on data source.
  // SRD monsters tend to store under `special_abilities`, imported
  // monsters sometimes use `special_traits`, PCs use `features`.
  const traits = stats.traits || character.traits || [];
  const actions = stats.actions || character.actions || [];
  const specialAbilities = stats.special_abilities || character.special_abilities ||
                          stats.special_traits || character.special_traits ||
                          stats.features || character.features || [];
  const legendaryActions = stats.legendary_actions || character.legendary_actions || [];
  const reactions = stats.reactions || character.reactions || [];
  const bonusActions = stats.bonus_actions || character.bonus_actions || [];
  const lairActions = stats.lair_actions || character.lair_actions || [];
  const auras = stats.auras || character.auras || [];
  const multiattack = stats.multiattack || character.multiattack || null;
  const legendaryPerRound = stats.legendary_actions_per_round ?? character.legendary_actions_per_round ?? null;
  const legendaryResistances = stats.legendary_resistances ?? character.legendary_resistances ?? null;

  const skills = stats.skills || character.skills || {};
  // Senses / languages on reseeded SRD monsters are objects /
  // arrays — pipe them through the shared helpers so they end up
  // as plain strings before they hit JSX. Same story for the
  // damage info group: arrays of strings or arrays of objects with
  // `name` keys.
  const senses    = monsterGetSenses(character)    || stats.senses    || character.senses    || '';
  const languages = monsterGetLanguages(character) || stats.languages || character.languages || '—';
  const damageInfo = monsterGetDamageInfo(character);
  const damageResistances     = damageInfo.resistances     || (Array.isArray(stats.damage_resistances)     ? stats.damage_resistances.join(', ')     : stats.damage_resistances     || character.damage_resistances     || null);
  const damageImmunities      = damageInfo.immunities      || (Array.isArray(stats.damage_immunities)      ? stats.damage_immunities.join(', ')      : stats.damage_immunities      || character.damage_immunities      || null);
  const damageVulnerabilities = damageInfo.vulnerabilities || (Array.isArray(stats.damage_vulnerabilities) ? stats.damage_vulnerabilities.join(', ') : stats.damage_vulnerabilities || character.damage_vulnerabilities || null);
  const conditionImmunities   = damageInfo.conditionImmunities || (Array.isArray(stats.condition_immunities) ? stats.condition_immunities.map((c) => c?.name || c).join(', ') : stats.condition_immunities || character.condition_immunities || null);
  const proficiencyBonus = stats.proficiency_bonus || character.proficiency_bonus || 2;

  // Prefer a derived AC when the character has anything in their
  // equipment slots — armor + shield + DEX calculated per 5e rules.
  // Falls back to the static armor_class field for monsters / sheets
  // without an equipped map.
  const equippedForAC = character.equipped || character.equipment || {};
  const hasArmorEquipped =
    equippedForAC && Object.values(equippedForAC).some((i) => i?.category === 'armor');
  const computedACValue = hasArmorEquipped
    ? computeArmorClass({
        equipped: equippedForAC,
        dex:
          character.attributes?.dex ||
          character.stats?.dexterity ||
          10,
        fightingStyles: collectFightingStyles(character),
      }).total
    : null;
  // AC on reseeded SRD monsters ships as `[{ type: "natural", value: 19 }]`,
  // which crashes React if we hand it to JSX. monsterGetAC normalises
  // both that array shape and a plain number, so we route the
  // computed (equipped-armor) value first and fall through to it.
  const ac = computedACValue ?? monsterGetAC(character);
  const hpObj = stats.hit_points || character.hit_points;
  const hp = typeof hpObj === 'object' ? (hpObj?.max || '?') : (hpObj || '?');
  // Speed on reseeded SRD monsters ships as `{ walk: "40 ft.",
  // fly: "80 ft.", swim: "40 ft." }`; the helper joins it into a
  // single readable string.
  const speed = monsterGetSpeed(character) || '30 ft.';
  const cr = monsterGetCR(character);

  // Spells might be in stats.spells (NPC) or character.spells
  const spellsData = stats.spells || character.spells;
  const hasSpells = spellsData && (
    (Array.isArray(spellsData) && spellsData.length > 0) ||
    (typeof spellsData === 'object' && Object.keys(spellsData).some(k => spellsData[k]?.length > 0))
  );

  return (
    <SectionCard title={safeText(character.name) || 'Monster Stats'} className={`${className} flex flex-col`}>
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#0b1220] rounded-lg p-0.5 mb-3 flex-shrink-0">
          {['traits', 'abilities', 'skills', ...(hasSpells ? ['spells'] : [])].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                activeTab === tab
                  ? 'bg-[#22c5f5] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#111827]'
              }`}
            >
              {tab === 'abilities' ? 'Stats' : tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[300px]">
          {/* Traits Tab */}
          {activeTab === 'traits' && (
            <div className="space-y-4">
              {/* Core Stats Header */}
              <div className="grid grid-cols-4 gap-2 text-[10px] bg-[#0b1220] p-2 rounded-xl border border-[#111827]">
                <div className="text-center">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">AC</span>
                  <span className="text-white font-bold text-sm">{safeText(ac)}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">HP</span>
                  <span className="text-white font-bold text-sm">{safeText(hp)}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Speed</span>
                  <span className="text-white font-bold text-sm">{safeText(speed)}</span>
                </div>
                <div className="text-center border-l border-[#1e293b]">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">CR</span>
                  <span className="text-amber-400 font-bold text-sm">{safeText(cr)}</span>
                </div>
              </div>

              {/* Traits & Special Abilities */}
              {(traits.length > 0 || specialAbilities.length > 0) && (
                <div>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-2 font-bold border-b border-amber-500/20 pb-1">Traits & Features</p>
                  <div className="space-y-3">
                    {[...traits, ...specialAbilities].map((trait, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(trait.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(trait.desc || trait.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Damage / Condition treatment — only shows the rows
                  that the monster actually defines so the panel
                  stays compact for simple stat blocks. */}
              {(damageResistances || damageImmunities || damageVulnerabilities || conditionImmunities) && (
                <div>
                  <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-2 font-bold border-b border-blue-500/20 pb-1">Treatment</p>
                  <div className="space-y-1.5 text-[11px]">
                    {damageVulnerabilities && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Vulnerabilities </span>
                        <span className="text-rose-300">{safeText(damageVulnerabilities)}</span>
                      </div>
                    )}
                    {damageResistances && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Resistances </span>
                        <span className="text-emerald-300">{safeText(damageResistances)}</span>
                      </div>
                    )}
                    {damageImmunities && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Damage Immunities </span>
                        <span className="text-slate-200">{safeText(damageImmunities)}</span>
                      </div>
                    )}
                    {conditionImmunities && (
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px]">Condition Immunities </span>
                        <span className="text-slate-200">{safeText(conditionImmunities)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {actions.length > 0 && (
                <div>
                  <p className="text-[10px] text-red-400 uppercase tracking-wide mb-2 font-bold border-b border-red-500/20 pb-1">Actions</p>
                  <div className="space-y-3">
                    {actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] hover:bg-white/5 p-1 rounded cursor-pointer transition-colors group"
                        onClick={() => {
                          // Trigger action selection in parent (GMPanel)
                          // We need to lift this up. The component prop signature doesn't have onActionClick.
                          // Let's look for a way to bubble this event up.
                          // Currently MonsterStatBlock is self contained for display.
                          // I will add a custom event dispatch or callback if passed.
                          if (character?.onActionClick) {
                             character.onActionClick(action);
                          } else {
                             // Dispatch global event as fallback if props drilling is hard,
                             // but better to use the prop we'll add in GMPanel usage
                             const event = new CustomEvent('gm-monster-action', { detail: action });
                             window.dispatchEvent(event);
                          }
                        }}
                      >
                        <span className="text-white font-bold group-hover:text-[#37F2D1] transition-colors">{safeText(action.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reactions */}
              {reactions.length > 0 && (
                <div>
                  <p className="text-[10px] text-orange-400 uppercase tracking-wide mb-2 font-bold border-b border-orange-500/20 pb-1">Reactions</p>
                  <div className="space-y-3">
                    {reactions.map((reaction, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(reaction.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(reaction.desc || reaction.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Attack callout */}
              {multiattack && multiattack.enabled && (multiattack.description || (Array.isArray(multiattack.attacks) && multiattack.attacks.length > 0)) && (
                <div>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wide mb-2 font-bold border-b border-amber-500/20 pb-1">Multi-Attack</p>
                  {multiattack.description && (
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-1">{safeText(multiattack.description)}</p>
                  )}
                  {Array.isArray(multiattack.attacks) && multiattack.attacks.length > 0 && (
                    <ul className="text-[11px] text-slate-400 list-disc list-inside">
                      {multiattack.attacks.map((a, i) => (
                        <li key={i}>{a.count > 1 ? `${safeText(a.count)}× ` : ""}{safeText(a.name)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Bonus Actions */}
              {bonusActions.length > 0 && (
                <div>
                  <p className="text-[10px] text-cyan-400 uppercase tracking-wide mb-2 font-bold border-b border-cyan-500/20 pb-1">Bonus Actions</p>
                  <div className="space-y-3">
                    {bonusActions.map((action, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(action.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legendary Actions */}
              {legendaryActions.length > 0 && (
                <div>
                  <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-2 font-bold border-b border-purple-500/20 pb-1">
                    Legendary Actions
                    {legendaryPerRound != null && Number(legendaryPerRound) > 0 && (
                      <span className="text-slate-500 normal-case ml-2 font-normal">
                        ({safeText(legendaryPerRound)}/round)
                      </span>
                    )}
                  </p>
                  <div className="space-y-3">
                    {legendaryActions.map((action, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">
                          {safeText(action.name)}
                          {action.legendary_cost > 1 && (
                            <span className="text-purple-300"> (Costs {safeText(action.legendary_cost)})</span>
                          )}
                          . </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legendary Resistances */}
              {legendaryResistances != null && Number(legendaryResistances) > 0 && (
                <div>
                  <p className="text-[10px] text-fuchsia-400 uppercase tracking-wide mb-2 font-bold border-b border-fuchsia-500/20 pb-1">Legendary Resistance</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    If the creature fails a saving throw, it can choose to succeed instead.
                    <span className="text-fuchsia-300 ml-1 font-bold">{safeText(legendaryResistances)}/day</span>
                  </p>
                </div>
              )}

              {/* Lair Actions */}
              {lairActions.length > 0 && (
                <div>
                  <p className="text-[10px] text-lime-400 uppercase tracking-wide mb-2 font-bold border-b border-lime-500/20 pb-1">Lair Actions</p>
                  <p className="text-[10px] text-slate-400 italic mb-2">On initiative count 20 (losing ties), the creature takes one lair action.</p>
                  <div className="space-y-3">
                    {lairActions.map((action, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(action.name)}. </span>
                        <span className="text-slate-300 leading-relaxed">{safeText(action.desc || action.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auras */}
              {auras.length > 0 && (
                <div>
                  <p className="text-[10px] text-pink-400 uppercase tracking-wide mb-2 font-bold border-b border-pink-500/20 pb-1">Auras</p>
                  <div className="space-y-3">
                    {auras.map((aura, idx) => (
                      <div key={idx} className="text-[11px]">
                        <span className="text-white font-bold">{safeText(aura.name)}. </span>
                        <span className="text-slate-400">({safeText(aura.radius) || "—"})</span>
                        {aura.description && (
                          <span className="text-slate-300 leading-relaxed"> {safeText(aura.description)}</span>
                        )}
                        {(aura.damage_dice || aura.applies_condition) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {aura.damage_dice && <span>Damage: {safeText(aura.damage_dice)} {safeText(aura.damage_type)}</span>}
                            {aura.save_ability && <span className="ml-2">Save: DC {safeText(aura.save_dc) || "?"} {safeText(aura.save_ability)}</span>}
                            {aura.applies_condition && <span className="ml-2">Applies: {safeText(aura.applies_condition)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {traits.length === 0
                && specialAbilities.length === 0
                && actions.length === 0
                && bonusActions.length === 0
                && reactions.length === 0
                && legendaryActions.length === 0
                && lairActions.length === 0
                && auras.length === 0
                && !damageResistances
                && !damageImmunities
                && !damageVulnerabilities
                && !conditionImmunities && (
                <div className="h-full flex items-center justify-center py-8">
                  <p className="text-slate-500 text-xs italic">No traits or actions defined.</p>
                </div>
              )}
            </div>
          )}

          {/* Ability Scores Tab */}
          {activeTab === 'abilities' && (
            <div className="h-full">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.entries(abilityScores).map(([name, score]) => (
                  <div key={name} className="flex justify-between items-center bg-[#0b1220] rounded-lg p-2 border border-[#111827]">
                    <span className="text-xs text-amber-400 font-bold w-8">{safeText(name)}</span>
                    <span className="text-white font-bold text-sm">{safeText(score)}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{getMod(score)}</span>
                  </div>
                ))}
              </div>

              {/* Saves if available */}
              {stats.saving_throws && Object.keys(stats.saving_throws).length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Saving Throws</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.saving_throws).filter(([_, p]) => p).map(([key, val]) => (
                      <span key={key} className="text-xs bg-[#1a1f2e] px-2 py-1 rounded text-slate-300 border border-[#2A3441]">
                        {safeText(key).toUpperCase()} +{getMod(abilityScores[key.toUpperCase()]) + proficiencyBonus}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex justify-between text-xs pb-2 border-b border-[#111827]">
                <span className="text-slate-400">Proficiency Bonus</span>
                <span className="text-amber-400 font-bold">+{proficiencyBonus}</span>
              </div>

              {skills && Object.keys(skills).length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Skills</p>
                  <div className="grid grid-cols-2 gap-2">
                    {typeof skills === 'object' && !Array.isArray(skills) ? (
                      Object.entries(skills).filter(([_, v]) => v).map(([skill, value]) => {
                        // Calculate bonus roughly if boolean, or use value if number
                        let bonus = "+?";
                        if (typeof value === 'number') bonus = value >= 0 ? `+${value}` : value;
                        else if (value === true) bonus = "Proficient";

                        return (
                          <div key={skill} className="flex justify-between bg-[#0b1220] px-2 py-1.5 rounded text-xs">
                            <span className="text-slate-300">{safeText(skill)}</span>
                            <span className="text-[#37F2D1]">{safeText(bonus)}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-300 col-span-2">{Array.isArray(skills) ? skills.map((s) => safeText(s)).join(', ') : safeText(skills)}</p>
                    )}
                  </div>
                </div>
              )}

              {(senses || languages) && (
                <div className="space-y-3 pt-2">
                  {senses && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Senses</p>
                      <p className="text-xs text-white bg-[#0b1220] p-2 rounded">{safeText(senses)}</p>
                    </div>
                  )}
                  {languages && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Languages</p>
                      <p className="text-xs text-white bg-[#0b1220] p-2 rounded">{safeText(languages)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Spells Tab */}
          {activeTab === 'spells' && (
            <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 border border-slate-800/50 rounded-lg p-2 bg-[#080c14]/50">
              {typeof spellsData === 'object' && !Array.isArray(spellsData) ? (
                Object.entries(spellsData).map(([level, spells]) => {
                  if (!spells || spells.length === 0) return null;
                  const label = level === 'cantrips' ? 'Cantrips' :
                               level.startsWith('level') ? `Level ${level.replace('level', '')}` :
                               level;
                  return (
                    <div key={level}>
                      <p className="text-[10px] text-purple-400 uppercase tracking-wide mb-2 font-bold sticky top-0 bg-[#050816] py-1">{safeText(label)}</p>
                      <div className="space-y-1">
                        {spells.map((spell, idx) => (
                          <div key={idx} className="text-xs bg-[#0b1220] p-2 rounded border border-[#111827]">
                            <span className="text-white font-medium">{safeText(typeof spell === 'string' ? spell : spell?.name)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400">Spells format not supported or empty.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
