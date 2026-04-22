import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { getClassFeaturesForLevel } from "@/components/dnd5e/classFeatures";
import { spellDetails } from "@/components/dnd5e/spellData";
import { abilityModifier, proficiencyBonus, CLASS_HIT_DICE } from '@/components/dnd5e/dnd5eRules';
import { safeText } from "@/utils/safeRender";
import CompanionCard from "@/components/characters/CompanionCard";

const classes = [
  { name: "Barbarian", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a6652f2d8_Barbarian1.png" },
  { name: "Bard", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png" },
  { name: "Cleric", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png" },
  { name: "Druid", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png" },
  { name: "Fighter", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/5e1b2cd68_Fighter1.png" },
  { name: "Monk", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png" },
  { name: "Paladin", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png" },
  { name: "Ranger", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png" },
  { name: "Rogue", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png" },
  { name: "Sorcerer", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/6f5b501db_Sorceror1.png" },
  { name: "Warlock", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/184c98268_Warlock1.png" },
  { name: "Wizard", icon: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png" }
];

const raceTraits = {
  "Dragonborn": [
    { name: "Breath Weapon", description: "Use your action to exhale destructive energy based on your draconic ancestry." },
    { name: "Damage Resistance", description: "Resistance to damage type associated with your draconic ancestry." },
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." }
  ],
  "Elf": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Fey Ancestry", description: "Advantage on saves against being charmed, magic can't put you to sleep." },
    { name: "Trance", description: "Elves don't sleep, instead meditate for 4 hours." }
  ],
  "Dwarf": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Dwarven Resilience", description: "Advantage on saves against poison and resistance to poison damage." },
    { name: "Stonecunning", description: "Double proficiency on History checks related to stonework." }
  ],
  "Human": [
    { name: "Versatile", description: "+1 to all ability scores." },
    { name: "Extra Skill", description: "Proficiency in one additional skill." }
  ],
  "Halfling": [
    { name: "Lucky", description: "Reroll 1s on attack rolls, ability checks, or saving throws." },
    { name: "Brave", description: "Advantage on saves against being frightened." },
    { name: "Nimble", description: "Move through space of larger creatures." }
  ],
  "Tiefling": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Hellish Resistance", description: "Resistance to fire damage." },
    { name: "Infernal Legacy", description: "Know thaumaturgy cantrip, hellish rebuke at 3rd level." }
  ],
  "Half-Elf": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Fey Ancestry", description: "Advantage on saves against being charmed, magic can't put you to sleep." },
    { name: "Skill Versatility", description: "Proficiency in two skills of your choice." }
  ],
  "Half-Orc": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Relentless Endurance", description: "When reduced to 0 HP, drop to 1 HP instead (once per long rest)." },
    { name: "Savage Attacks", description: "Roll extra weapon damage die on critical hits." }
  ],
  "Gnome": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Gnome Cunning", description: "Advantage on Int, Wis, and Cha saves against magic." },
    { name: "Small Size", description: "Between 3-4 feet tall with unique advantages." }
  ]
};

const skillDescriptions = {
  "Acrobatics": "Balance, tumbling, rolls, and fancy footwork",
  "Animal Handling": "Calming, training, and controlling animals",
  "Arcana": "Knowledge of magic, spells, and magical items",
  "Athletics": "Climbing, jumping, swimming, and physical feats",
  "Deception": "Lying convincingly and misleading others",
  "History": "Knowledge of historical events and ancient lore",
  "Insight": "Reading people's emotions and detecting lies",
  "Intimidation": "Influencing others through threats and fear",
  "Investigation": "Finding clues and making logical deductions",
  "Medicine": "Treating injuries, illnesses, and poison",
  "Nature": "Knowledge of plants, animals, and weather",
  "Perception": "Noticing details in your surroundings",
  "Performance": "Acting, dancing, singing, and public displays",
  "Persuasion": "Convincing others diplomatically",
  "Religion": "Knowledge of gods, rituals, and faiths",
  "Sleight of Hand": "Pickpocketing and manual dexterity tricks",
  "Stealth": "Moving quietly and hiding from others",
  "Survival": "Tracking, hunting, and wilderness navigation"
};

const companionTypes = {
  Paladin: "Mount",
  Ranger: "Animal Companion",
  Warlock: "Patron",
  Wizard: "Familiar",
  Druid: "Animal Companion"
};

export default function ReviewStep({ characterData }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const calculateModifier = (score) => {
    const mod = abilityModifier(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getModifierColor = (modifier) => {
    if (modifier.startsWith('+')) return 'text-[#37F2D1]';
    if (modifier.startsWith('-')) return 'text-[#F23737]';
    return 'text-white';
  };

  const profBonus = proficiencyBonus(characterData.level);
  const hitDie = CLASS_HIT_DICE[characterData.class] || 10;
  const conMod = abilityModifier(characterData.attributes.con);
  const maxHP = hitDie + conMod;
  const ac = 10 + abilityModifier(characterData.attributes.dex);

  const primaryClassLevel = characterData.level - (characterData.multiclasses || []).reduce((sum, mc) => sum + (mc.level || 0), 0);
  const primaryFeatures = getClassFeaturesForLevel(characterData.class, primaryClassLevel) || [];
  const multiclassFeatures = (characterData.multiclasses || []).flatMap(mc => {
    if (!mc.class || !mc.level) return [];
    const features = getClassFeaturesForLevel(mc.class, mc.level) || [];
    return features.map(f => ({ ...f, multiclass: mc.class }));
  });
  const allClassFeatures = [...primaryFeatures, ...multiclassFeatures];

  const profileImageUrl = characterData.profile_avatar_url || characterData.avatar_url;
  const profilePosition = characterData.profile_position || { x: 0, y: 0 };
  const profileZoom = characterData.profile_zoom || 1;

  const primaryClassIcon = classes.find(c => c.name === characterData.class)?.icon;
  const raceFeatures = raceTraits[characterData.race] || [];

  const companionName = companionTypes[characterData.class];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#FF5722] mb-2">Character Overview</h2>
        <p className="text-white font-semibold">Review your character before finalizing</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Portrait */}
        <div className="space-y-4">
          <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
            <div className="w-40 h-40 rounded-full bg-[#1E2430] overflow-hidden border-4 border-[#FF5722] mx-auto mb-4 relative">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Character Portrait"
                  className="absolute"
                  style={{
                    transform: `translate(${profilePosition.x}px, ${profilePosition.y}px) scale(${profileZoom})`,
                    transformOrigin: 'center center',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-500" />
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-[#FFC6AA] text-center mb-1">
              {characterData.name || "Unnamed Character"}
            </h3>
            <p className="text-center text-white">
              Level {characterData.level} {characterData.race} {characterData.class}
            </p>
            {characterData.multiclasses && characterData.multiclasses.filter(mc => mc.class).length > 0 && (
              <div className="mt-2 text-center">
                {characterData.multiclasses.filter(mc => mc.class).map((mc, idx) => (
                  <p key={idx} className="text-sm text-[#5B4B9E]">
                    {mc.class} {mc.level}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Class Icons */}
          <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
            <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Classes</h3>
            <div className="space-y-3">
              {primaryClassIcon && (
                <div className="flex items-center gap-3">
                  <img src={primaryClassIcon} alt={characterData.class} className="w-16 h-16" />
                  <div>
                    <p className="font-bold text-[#5B4B9E]">{characterData.class}</p>
                    <p className="text-white text-sm">Level {primaryClassLevel}</p>
                  </div>
                </div>
              )}
              {(characterData.multiclasses || []).filter(mc => mc.class).map((mc, idx) => {
                const mcIcon = classes.find(c => c.name === mc.class)?.icon;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    {mcIcon && <img src={mcIcon} alt={mc.class} className="w-16 h-16" />}
                    <div>
                      <p className="font-bold text-[#5B4B9E]">{mc.class}</p>
                      <p className="text-white text-sm">Level {mc.level}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Racial Features */}
          {raceFeatures.length > 0 && (
            <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
              <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Racial Traits</h3>
              <div className="space-y-2">
                {raceFeatures.map((trait, idx) => (
                  <div
                    key={idx}
                    className="relative cursor-help p-3 bg-[#1E2430] rounded-lg"
                    onMouseEnter={() => setHoveredItem(`racetrait-${idx}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <p className="font-semibold text-white text-sm">{trait.name}</p>
                    {hoveredItem === `racetrait-${idx}` && (
                      <div className="absolute z-10 left-0 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#FF5722]">
                        <div className="font-bold mb-1">{trait.name}</div>
                        {trait.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combat Stats */}
          <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
            <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Combat Stats</h3>
            <div className="space-y-2 text-sm">
              <div
                className="flex justify-between relative cursor-help"
                onMouseEnter={() => setHoveredItem('hp')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="text-[#FFC6AA]">Hit Points:</span>
                <span className="text-white font-semibold">{maxHP}</span>
                {hoveredItem === 'hp' && (
                  <div className="absolute z-10 left-0 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#FF5722]">
                    Your maximum HP determines how much damage you can take before falling unconscious.
                  </div>
                )}
              </div>
              <div
                className="flex justify-between relative cursor-help"
                onMouseEnter={() => setHoveredItem('ac')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="text-[#FFC6AA]">Armor Class:</span>
                <span className="text-white font-semibold">{ac}</span>
                {hoveredItem === 'ac' && (
                  <div className="absolute z-10 left-0 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#FF5722]">
                    Your AC determines how hard you are to hit in combat. Higher is better.
                  </div>
                )}
              </div>
              <div
                className="flex justify-between relative cursor-help"
                onMouseEnter={() => setHoveredItem('prof')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="text-[#FFC6AA]">Proficiency Bonus:</span>
                <span className="text-[#37F2D1] font-semibold">+{profBonus}</span>
                {hoveredItem === 'prof' && (
                  <div className="absolute z-10 left-0 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#37F2D1]">
                    Added to attacks, skills, and saves you're proficient in. Increases with level.
                  </div>
                )}
              </div>
              <div
                className="flex justify-between relative cursor-help"
                onMouseEnter={() => setHoveredItem('speed')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="text-[#FFC6AA]">Speed:</span>
                <span className="text-white font-semibold">{characterData.speed || 30} ft</span>
                {hoveredItem === 'speed' && (
                  <div className="absolute z-10 left-0 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#FF5722]">
                    How far you can move in a single turn during combat.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Character Details */}
          <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
            <h3 className="text-lg font-bold text-[#FFC6AA] mb-4">Character Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-[#FFC6AA]">Background:</span>
                <span className="text-white font-semibold ml-2">
                  {characterData.background || "Not set"}
                </span>
              </div>
              <div>
                <span className="text-[#FFC6AA]">Alignment:</span>
                <span className="text-white font-semibold ml-2">{characterData.alignment}</span>
              </div>
              {characterData.subrace && (
                <div>
                  <span className="text-[#FFC6AA]">Subrace:</span>
                  <span className="text-white font-semibold ml-2">{characterData.subrace}</span>
                </div>
              )}
              {characterData.appearance?.age && (
                <div>
                  <span className="text-[#FFC6AA]">Age:</span>
                  <span className="text-white font-semibold ml-2">{characterData.appearance.age}</span>
                </div>
              )}
              {characterData.appearance?.height && (
                <div>
                  <span className="text-[#FFC6AA]">Height:</span>
                  <span className="text-white font-semibold ml-2">{characterData.appearance.height}</span>
                </div>
              )}
              {characterData.appearance?.weight && (
                <div>
                  <span className="text-[#FFC6AA]">Weight:</span>
                  <span className="text-white font-semibold ml-2">{characterData.appearance.weight}</span>
                </div>
              )}
            </div>
          </div>

          {/* Companions — renders the shared CompanionCard for every
              entry on characterData.companions. Falls back to the
              legacy freeform companion_* fields for characters
              created before the picker existed. */}
          {(() => {
            const companions = Array.isArray(characterData.companions) ? characterData.companions : [];
            const legacy = characterData.companion_image || characterData.companion_name
              ? [{
                  name: characterData.companion_name,
                  species: companionName,
                  image: characterData.companion_image,
                  background: characterData.companion_background,
                }]
              : [];
            const list = companions.length > 0 ? companions : legacy;
            if (list.length === 0) return null;
            return (
              <div className="bg-[#2A3441] rounded-xl p-4 border-2 border-[#5B4B9E] space-y-3">
                <h3 className="text-lg font-bold text-[#5B4B9E]">Companions</h3>
                {list.map((comp, i) => (
                  <CompanionCard key={comp?.id || i} companion={comp} compact />
                ))}
              </div>
            );
          })()}
        </div>

        {/* Middle Column - Abilities & Skills */}
        <div className="space-y-4">
          <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
            <h3 className="text-lg font-bold text-[#FFC6AA] mb-4">Ability Scores</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(characterData.attributes).map(([key, value]) => {
                const modifier = calculateModifier(value);
                const abilityNames = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };
                const abilityDescriptions = {
                  str: "Physical power for melee attacks and carrying",
                  dex: "Agility for ranged attacks, AC, and stealth",
                  con: "Health and stamina for HP and concentration",
                  int: "Reasoning for knowledge and investigation",
                  wis: "Awareness for perception and insight",
                  cha: "Personality for persuasion and spellcasting"
                };
                return (
                  <div
                    key={key}
                    className="text-center p-3 bg-[#1E2430] rounded-lg relative cursor-help"
                    onMouseEnter={() => setHoveredItem(key)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="text-xs text-white uppercase mb-1">{key}</div>
                    <div className={`text-2xl font-bold ${getModifierColor(modifier)}`}>{modifier}</div>
                    <div className="text-sm text-gray-400">{value}</div>
                    {hoveredItem === key && (
                      <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-48 shadow-lg border-2 border-[#FF5722]">
                        <div className="font-bold mb-1">{abilityNames[key]}</div>
                        {abilityDescriptions[key]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
            <h3 className="text-lg font-bold text-[#FFC6AA] mb-4">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(characterData.skills || {})
                .filter(([_, proficient]) => proficient)
                .map(([skill]) => {
                  const hasExpertise = (characterData.expertise || []).includes(skill);
                  return (
                    <div
                      key={skill}
                      className="relative cursor-help"
                      onMouseEnter={() => setHoveredItem(`skill-${skill}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <Badge className={hasExpertise ? "bg-yellow-400 text-[#1E2430]" : "bg-[#37F2D1] text-[#1E2430]"}>
                        {skill} {hasExpertise && "★"}
                      </Badge>
                      {hoveredItem === `skill-${skill}` && (
                        <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-48 shadow-lg border-2 border-[#37F2D1]">
                          <div className="font-bold mb-1">{skill}</div>
                          {skillDescriptions[skill]}
                          {hasExpertise && <div className="mt-2 text-yellow-400 font-bold">★ Expertise: Double proficiency bonus</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              {Object.keys(characterData.skills || {}).filter(k => characterData.skills[k]).length === 0 && (
                <span className="text-gray-400 text-sm">No skills selected</span>
              )}
            </div>
          </div>

          {allClassFeatures.length > 0 && (
            <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
              <h3 className="text-lg font-bold text-[#FFC6AA] mb-4">Class Features</h3>
              <div className="space-y-2">
                {allClassFeatures.map((feature, idx) => (
                  <div
                    key={idx}
                    className="relative cursor-help p-3 bg-[#1E2430] rounded-lg"
                    onMouseEnter={() => setHoveredItem(`classfeature-${idx}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{feature.name}</span>
                      {feature.multiclass && (
                        <Badge className="bg-[#5B4B9E] text-white text-xs">
                          {feature.multiclass}
                        </Badge>
                      )}
                      {feature.level && (
                        <Badge className="bg-[#1E2430] text-gray-300 border border-white/20 text-xs">
                          Lvl {feature.level}
                        </Badge>
                      )}
                    </div>
                    {hoveredItem === `classfeature-${idx}` && feature.description && (
                      <div className="absolute z-10 left-0 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-80 shadow-lg border-2 border-[#5B4B9E] max-h-48 overflow-y-auto">
                        <div className="font-bold mb-1">{feature.name}</div>
                        {feature.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {characterData.inventory && characterData.inventory.length > 0 && (
            <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
              <h3 className="text-lg font-bold text-[#FFC6AA] mb-4">Equipment</h3>
              <div className="space-y-1 text-sm text-white">
                {characterData.inventory.slice(0, 8).map((item, idx) => (
                  <div key={idx}>
                    • {safeText(item.name)} {item.quantity > 1 ? `(×${safeText(item.quantity)})` : ''}
                  </div>
                ))}
                {characterData.inventory.length > 8 && (
                  <div className="text-gray-400 text-xs mt-2">
                    +{characterData.inventory.length - 8} more items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-4">
          {characterData.spells && Object.keys(characterData.spells).some(key => Array.isArray(characterData.spells[key]) && characterData.spells[key].length > 0) && (
            <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
              <h3 className="text-lg font-bold text-[#FFC6AA] mb-4">Spells</h3>
              
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {['cantrips', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'].map(levelKey => {
                  const spells = characterData.spells[levelKey];
                  if (!spells || spells.length === 0) return null;
                  
                  const levelLabel = levelKey === 'cantrips' ? 'Cantrips' : 
                                     levelKey === 'level1' ? '1st Level Spells' :
                                     levelKey === 'level2' ? '2nd Level Spells' :
                                     levelKey === 'level3' ? '3rd Level Spells' :
                                     `${levelKey.replace('level', '')}th Level Spells`;
                  
                  return (
                    <div key={levelKey} className="mb-4 last:mb-0">
                      <h4 className="text-sm font-semibold text-[#5B4B9E] mb-2">{levelLabel}</h4>
                      <div className="flex flex-wrap gap-2">
                        {spells.map((spell, idx) => {
                          const spellInfo = spellDetails[spell];
                          return (
                            <div
                              key={idx}
                              className="relative cursor-help"
                              onMouseEnter={() => setHoveredItem(`${levelKey}-${idx}`)}
                              onMouseLeave={() => setHoveredItem(null)}
                            >
                              <Badge className={levelKey === 'cantrips' ? "bg-[#5B4B9E] text-white" : "bg-[#37F2D1] text-[#1E2430]"}>
                                {spell}
                              </Badge>
                              {hoveredItem === `${levelKey}-${idx}` && spellInfo && (
                                <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#1E2430] text-white p-3 rounded-lg text-xs w-64 shadow-lg border-2 border-[#5B4B9E] max-h-64 overflow-y-auto">
                                  <div className="font-bold mb-1">{spell}</div>
                                  <div className="text-[#5B4B9E] text-xs mb-2">
                                    {spellInfo.level} {spellInfo.school}
                                  </div>
                                  <div className="space-y-1 mb-2 text-xs">
                                    <div><span className="text-white/60">Casting Time:</span> {spellInfo.castingTime}</div>
                                    <div><span className="text-white/60">Range:</span> {spellInfo.range}</div>
                                    <div><span className="text-white/60">Components:</span> {spellInfo.components}</div>
                                    <div><span className="text-white/60">Duration:</span> {spellInfo.duration}</div>
                                  </div>
                                  <p className="text-white/80 leading-relaxed">{spellInfo.description}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(30, 36, 48, 0.5);
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(91, 75, 158, 0.5);
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(91, 75, 158, 0.7);
                }
              `}</style>
            </div>
          )}

          {characterData.description && (
            <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
              <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Biography</h3>
              <p className="text-sm text-white leading-relaxed">{characterData.description}</p>
            </div>
          )}

          {characterData.languages && characterData.languages.length > 0 && (
            <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
              <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {characterData.languages.map((lang, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-[#1E2430] text-white">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {characterData.feature_choices && Object.keys(characterData.feature_choices).length > 0 && (
            <div className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]">
              <h3 className="text-lg font-bold text-[#FFC6AA] mb-3">Feature Choices</h3>
              <div className="space-y-2 text-sm text-white">
                {Object.entries(characterData.feature_choices).map(([key, choice], idx) => {
                  const featureName = key.split('-').pop();
                  return (
                    <div key={idx}>
                      <span className="text-[#5B4B9E] font-semibold">{featureName}:</span>
                      <span className="ml-2">{choice}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}