import React, { useState } from "react";
import { User } from "lucide-react";
import { getClassFeaturesForLevel } from "@/components/dnd5e/classFeatures";
import { spellDetails } from "@/components/dnd5e/spellData";
import {
  abilityModifier,
  proficiencyBonus,
  CLASS_SAVING_THROWS,
} from '@/components/dnd5e/dnd5eRules';
import { calculateMaxHP } from "@/components/dnd5e/characterCalculations";
import { safeText } from "@/utils/safeRender";
import CompanionCard from "@/components/characters/CompanionCard";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";

// Per-class portrait icons used by the ribbon under the hero card.
// Mirrors the table that lives on ClassStep — dropped to a flat
// {name → icon} map to keep this step display-only.
const CLASS_ICONS = {
  Barbarian: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a6652f2d8_Barbarian1.png",
  Bard:      "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png",
  Cleric:    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png",
  Druid:     "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png",
  Fighter:   "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/5e1b2cd68_Fighter1.png",
  Monk:      "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png",
  Paladin:   "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png",
  Ranger:    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png",
  Rogue:     "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png",
  Sorcerer:  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/6f5b501db_Sorceror1.png",
  Warlock:   "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/184c98268_Warlock1.png",
  Wizard:    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png",
};

const RACE_TRAITS = {
  "Dragonborn": [
    { name: "Breath Weapon", description: "Use your action to exhale destructive energy based on your draconic ancestry." },
    { name: "Damage Resistance", description: "Resistance to damage type associated with your draconic ancestry." },
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
  ],
  "Elf": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Fey Ancestry", description: "Advantage on saves against being charmed; magic can't put you to sleep." },
    { name: "Trance", description: "Elves don't sleep — instead they meditate for 4 hours." },
  ],
  "Dwarf": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Dwarven Resilience", description: "Advantage on saves against poison and resistance to poison damage." },
    { name: "Stonecunning", description: "Double proficiency on History checks related to stonework." },
  ],
  "Human": [
    { name: "Versatile", description: "+1 to all ability scores." },
    { name: "Extra Skill", description: "Proficiency in one additional skill." },
  ],
  "Halfling": [
    { name: "Lucky", description: "Reroll 1s on attack rolls, ability checks, or saving throws." },
    { name: "Brave", description: "Advantage on saves against being frightened." },
    { name: "Nimble", description: "Move through the space of larger creatures." },
  ],
  "Tiefling": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Hellish Resistance", description: "Resistance to fire damage." },
    { name: "Infernal Legacy", description: "Know thaumaturgy cantrip; hellish rebuke at 3rd level." },
  ],
  "Half-Elf": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Fey Ancestry", description: "Advantage on saves against being charmed; magic can't put you to sleep." },
    { name: "Skill Versatility", description: "Proficiency in two skills of your choice." },
  ],
  "Half-Orc": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Relentless Endurance", description: "When reduced to 0 HP, drop to 1 HP instead (once per long rest)." },
    { name: "Savage Attacks", description: "Roll an extra weapon damage die on critical hits." },
  ],
  "Gnome": [
    { name: "Darkvision", description: "See in dim light within 60 feet as if it were bright light." },
    { name: "Gnome Cunning", description: "Advantage on Int, Wis, and Cha saves against magic." },
    { name: "Small Size", description: "Between 3-4 feet tall with unique advantages." },
  ],
};

const SKILL_DESCRIPTIONS = {
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
  "Survival": "Tracking, hunting, and wilderness navigation",
};

const ABILITY_META = [
  { key: "str", name: "Strength",     color: "#E74C3C", description: "Physical power for melee attacks and carrying" },
  { key: "dex", name: "Dexterity",    color: "#52C77E", description: "Agility for ranged attacks, AC, and stealth" },
  { key: "con", name: "Constitution", color: "#E5688E", description: "Health and stamina for HP and concentration" },
  { key: "int", name: "Intelligence", color: "#5DA8E8", description: "Reasoning for knowledge and investigation" },
  { key: "wis", name: "Wisdom",       color: "#E8C054", description: "Awareness for perception and insight" },
  { key: "cha", name: "Charisma",     color: "#C9A3FF", description: "Personality for persuasion and spellcasting" },
];

const COMPANION_LABELS = {
  Paladin: "Mount",
  Ranger:  "Animal Companion",
  Warlock: "Patron",
  Wizard:  "Familiar",
  Druid:   "Animal Companion",
};

export default function ReviewStep({ characterData }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const profBonus = proficiencyBonus(characterData.level);
  const conMod = abilityModifier(characterData.attributes?.con || 10);
  const dexMod = abilityModifier(characterData.attributes?.dex || 10);
  const maxHP = calculateMaxHP({
    class: characterData.class,
    level: characterData.level,
    conScore: characterData.attributes?.con,
    multiclasses: characterData.multiclasses,
  });
  const ac = 10 + dexMod;

  const primaryClassLevel =
    (characterData.level || 1) -
    (characterData.multiclasses || []).reduce((sum, mc) => sum + (mc.level || 0), 0);
  const primaryFeatures = getClassFeaturesForLevel(characterData.class, primaryClassLevel) || [];
  const multiclassFeatures = (characterData.multiclasses || []).flatMap((mc) => {
    if (!mc.class || !mc.level) return [];
    const features = getClassFeaturesForLevel(mc.class, mc.level) || [];
    return features.map((f) => ({ ...f, multiclass: mc.class }));
  });
  const allClassFeatures = [...primaryFeatures, ...multiclassFeatures];

  const profileImageUrl = characterData.profile_avatar_url || characterData.avatar_url;
  const profilePosition = characterData.profile_position || { x: 0, y: 0 };
  const profileZoom = characterData.profile_zoom || 1;

  const fullPortraitUrl = characterData.avatar_url;
  const fullPortraitPos = characterData.avatar_position || { x: 0, y: 0 };
  const fullPortraitZoom = characterData.avatar_zoom || 1;

  const racialTraits = RACE_TRAITS[characterData.race] || [];
  const skillEntries = Object.entries(characterData.skills || {})
    .filter(([, on]) => on)
    .map(([skill]) => skill);
  const expertise = characterData.expertise || [];

  const classSaves = (CLASS_SAVING_THROWS[characterData.class] || []).map((s) => s.toLowerCase());

  return (
    <div>
      <StepHeader
        kicker="Chapter VIII · The Reckoning"
        title="Review your hero"
        subtitle="One last look. Spot something off? Hop back to any chapter from the top."
      />

      <HeroCard
        characterData={characterData}
        fullPortraitUrl={fullPortraitUrl}
        fullPortraitPos={fullPortraitPos}
        fullPortraitZoom={fullPortraitZoom}
        profileImageUrl={profileImageUrl}
        profilePosition={profilePosition}
        profileZoom={profileZoom}
        primaryClassLevel={primaryClassLevel}
        maxHP={maxHP}
        ac={ac}
        profBonus={profBonus}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginTop: 24,
        }}
      >
        <ReviewCard title="Ability Scores" icon="🎲">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ABILITY_META.map((ab) => {
              const value = characterData.attributes?.[ab.key] || 10;
              const mod = abilityModifier(value);
              return (
                <div
                  key={ab.key}
                  style={{
                    background: 'rgba(20, 12, 8, 0.45)',
                    padding: '10px 8px',
                    borderRadius: 8,
                    textAlign: 'center',
                    borderTop: `2px solid ${ab.color}`,
                    position: 'relative',
                    cursor: 'help',
                  }}
                  onMouseEnter={() => setHoveredItem(`ab-${ab.key}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div
                    className="cc-label"
                    style={{ fontSize: 9, color: ab.color, marginBottom: 2 }}
                  >
                    {ab.key.toUpperCase()}
                  </div>
                  <div
                    className="cc-display"
                    style={{
                      fontSize: 24,
                      color: 'var(--cc-text)',
                      lineHeight: 1.1,
                    }}
                  >
                    {(mod >= 0 ? '+' : '') + mod}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cc-text-faint)' }}>
                    {value}
                  </div>
                  {hoveredItem === `ab-${ab.key}` && (
                    <ReviewTooltip color={ab.color} title={ab.name} body={ab.description} />
                  )}
                </div>
              );
            })}
          </div>
        </ReviewCard>

        <ReviewCard title="Saving Throws" icon="🛡">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {ABILITY_META.map((ab) => {
              const isProf = classSaves.some((s) => s.startsWith(ab.key));
              const mod = abilityModifier(characterData.attributes?.[ab.key] || 10) + (isProf ? profBonus : 0);
              return (
                <div
                  key={ab.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'rgba(20, 12, 8, 0.45)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      color: isProf ? 'var(--cc-teal)' : 'var(--cc-text-dim)',
                    }}
                  >
                    {isProf ? '●' : '○'} {ab.name}
                  </span>
                  <span
                    className="cc-mono"
                    style={{ color: 'var(--cc-text)', fontWeight: 700 }}
                  >
                    {(mod >= 0 ? '+' : '') + mod}
                  </span>
                </div>
              );
            })}
          </div>
        </ReviewCard>

        <ReviewCard title={`Skills · ${skillEntries.length}`} icon="🎯">
          {skillEntries.length === 0 ? (
            <div
              className="cc-italic-serif"
              style={{ fontSize: 13, color: 'var(--cc-text-faint)' }}
            >
              No skill proficiencies yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skillEntries.map((skill) => {
                const hasExpertise = expertise.includes(skill);
                return (
                  <div
                    key={skill}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredItem(`skill-${skill}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <span
                      className={`cc-chip ${hasExpertise ? 'cc-chip-gold' : 'cc-chip-teal'}`}
                      style={{ cursor: 'help' }}
                    >
                      {skill} {hasExpertise && '★'}
                    </span>
                    {hoveredItem === `skill-${skill}` && SKILL_DESCRIPTIONS[skill] && (
                      <ReviewTooltip
                        color={hasExpertise ? 'var(--cc-gold)' : 'var(--cc-teal)'}
                        title={skill}
                        body={
                          <>
                            {SKILL_DESCRIPTIONS[skill]}
                            {hasExpertise && (
                              <div style={{ marginTop: 6, color: 'var(--cc-gold)', fontWeight: 700 }}>
                                ★ Expertise: doubles your proficiency bonus
                              </div>
                            )}
                          </>
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ReviewCard>

        {allClassFeatures.length > 0 && (
          <ReviewCard
            title={`${characterData.class} Features`}
            icon={CLASS_ICONS[characterData.class] || '✦'}
            iconIsImage={!!CLASS_ICONS[characterData.class]}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allClassFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    padding: '8px 10px',
                    background: 'rgba(20, 12, 8, 0.45)',
                    borderRadius: 6,
                    cursor: feature.description ? 'help' : 'default',
                  }}
                  onMouseEnter={() => feature.description && setHoveredItem(`cf-${idx}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cc-text)' }}>
                      {feature.name}
                    </span>
                    {feature.multiclass && (
                      <span className="cc-chip cc-chip-purple" style={{ fontSize: 9 }}>
                        {feature.multiclass}
                      </span>
                    )}
                    {feature.level && (
                      <span className="cc-chip cc-chip-neutral" style={{ fontSize: 9 }}>
                        L{feature.level}
                      </span>
                    )}
                  </div>
                  {hoveredItem === `cf-${idx}` && feature.description && (
                    <ReviewTooltip
                      color="var(--cc-gold)"
                      title={feature.name}
                      body={feature.description}
                      width={320}
                    />
                  )}
                </div>
              ))}
            </div>
          </ReviewCard>
        )}

        {racialTraits.length > 0 && (
          <ReviewCard title="Racial Traits" icon="🛡️">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {racialTraits.map((trait, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    padding: '8px 10px',
                    background: 'rgba(20, 12, 8, 0.45)',
                    borderRadius: 6,
                    cursor: 'help',
                  }}
                  onMouseEnter={() => setHoveredItem(`rt-${idx}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cc-text)' }}>
                    {trait.name}
                  </div>
                  {hoveredItem === `rt-${idx}` && (
                    <ReviewTooltip color="var(--cc-orange)" title={trait.name} body={trait.description} />
                  )}
                </div>
              ))}
            </div>
            {Array.isArray(characterData.languages) && characterData.languages.length > 0 && (
              <div
                className="cc-italic-serif"
                style={{
                  fontSize: 12,
                  color: 'var(--cc-text-faint)',
                  marginTop: 10,
                }}
              >
                Languages: {characterData.languages.join(', ')}
              </div>
            )}
          </ReviewCard>
        )}

        <SpellbookReviewCard
          spells={characterData.spells || {}}
          hoveredItem={hoveredItem}
          setHoveredItem={setHoveredItem}
        />

        {characterData.background && (
          <ReviewCard title={`Background · ${characterData.background}`} icon="📜">
            <div
              className="cc-italic-serif"
              style={{ fontSize: 13, color: 'var(--cc-text-dim)', lineHeight: 1.5 }}
            >
              {characterData.alignment && (
                <div>
                  <span style={{ color: 'var(--cc-gold-soft)', fontWeight: 700 }}>Alignment:</span>{' '}
                  {characterData.alignment}
                </div>
              )}
              {characterData.appearance?.age && (
                <div>
                  <span style={{ color: 'var(--cc-gold-soft)', fontWeight: 700 }}>Age:</span>{' '}
                  {characterData.appearance.age}
                </div>
              )}
              {characterData.appearance?.height && (
                <div>
                  <span style={{ color: 'var(--cc-gold-soft)', fontWeight: 700 }}>Height:</span>{' '}
                  {characterData.appearance.height}
                </div>
              )}
              {characterData.appearance?.weight && (
                <div>
                  <span style={{ color: 'var(--cc-gold-soft)', fontWeight: 700 }}>Weight:</span>{' '}
                  {characterData.appearance.weight}
                </div>
              )}
            </div>
          </ReviewCard>
        )}

        {characterData.feature_choices && Object.keys(characterData.feature_choices).length > 0 && (
          <ReviewCard title="Feature Choices" icon="✦">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 13,
              }}
            >
              {Object.entries(characterData.feature_choices).map(([key, choice]) => {
                const featureName = key.split('-').slice(2).join('-') || key;
                const choiceText = Array.isArray(choice) ? choice.join(', ') : String(choice);
                return (
                  <div
                    key={key}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(20, 12, 8, 0.45)',
                      borderRadius: 6,
                    }}
                  >
                    <span className="cc-label" style={{ color: 'var(--cc-gold-soft)' }}>
                      {featureName}
                    </span>
                    <span style={{ color: 'var(--cc-text)', marginLeft: 8 }}>
                      {choiceText}
                    </span>
                  </div>
                );
              })}
            </div>
          </ReviewCard>
        )}

        <CompanionsReviewCard characterData={characterData} />

        {Array.isArray(characterData.inventory) && characterData.inventory.length > 0 && (
          <ReviewCard title={`Equipment · ${characterData.inventory.length}`} icon="🎒">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontSize: 13,
                color: 'var(--cc-text)',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {characterData.inventory.slice(0, 12).map((item, idx) => (
                <div key={idx}>
                  • {safeText(item.name)}
                  {item.quantity > 1 && (
                    <span style={{ color: 'var(--cc-text-faint)' }}>
                      {' '}×{safeText(item.quantity)}
                    </span>
                  )}
                </div>
              ))}
              {characterData.inventory.length > 12 && (
                <div
                  className="cc-italic-serif"
                  style={{
                    fontSize: 12,
                    color: 'var(--cc-text-faint)',
                    marginTop: 6,
                  }}
                >
                  +{characterData.inventory.length - 12} more items
                </div>
              )}
            </div>
          </ReviewCard>
        )}

        {characterData.description && (
          <ReviewCard title="Biography" icon="✒️">
            <p
              className="cc-italic-serif"
              style={{
                fontSize: 14,
                color: 'var(--cc-text-dim)',
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {characterData.description}
            </p>
          </ReviewCard>
        )}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 24,
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255,83,0,0.10), rgba(255,83,0,0.02))',
          border: '1.5px solid rgba(255, 83, 0, 0.35)',
          textAlign: 'center',
        }}
      >
        <h3
          className="cc-display"
          style={{ fontSize: 24, color: 'var(--cc-orange)', margin: '0 0 8px' }}
        >
          Ready to play?
        </h3>
        <p
          className="cc-italic-serif"
          style={{
            color: 'var(--cc-text-dim)',
            fontSize: 14,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Use <strong>Save Character</strong> in the toolbar above to lock in your build. You can
          edit later from your character library.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Hero card — big portrait + name + chips + 4 stat boxes + biography preview
// ============================================================================
function HeroCard({
  characterData, fullPortraitUrl, fullPortraitPos, fullPortraitZoom,
  profileImageUrl, profilePosition, profileZoom,
  primaryClassLevel, maxHP, ac, profBonus,
}) {
  return (
    <div
      className="cc-panel-strong"
      style={{
        marginTop: 24,
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className="cc-tome-corner cc-tl"></div>
      <div className="cc-tome-corner cc-br"></div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 0,
          alignItems: 'stretch',
        }}
      >
        {/* Full-body portrait — uses saved zoom/position from ClassStep */}
        <div
          style={{
            width: 240,
            height: 320,
            background: 'linear-gradient(135deg, rgba(255,83,0,0.08), rgba(55,242,209,0.04))',
            position: 'relative',
            overflow: 'hidden',
            borderRight: '1px solid var(--cc-border)',
          }}
        >
          {fullPortraitUrl ? (
            <img
              src={fullPortraitUrl}
              alt={characterData.name || 'Character'}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `translate(${fullPortraitPos.x}px, ${fullPortraitPos.y}px) scale(${fullPortraitZoom})`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cc-text-faint)',
                opacity: 0.4,
              }}
            >
              <User className="w-24 h-24" />
            </div>
          )}

          {profileImageUrl && (
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(20, 12, 8, 0.7)',
                border: '3px solid var(--cc-orange)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
              }}
            >
              <img
                src={profileImageUrl}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `translate(${profilePosition.x}px, ${profilePosition.y}px) scale(${profileZoom})`,
                  transformOrigin: 'center center',
                }}
              />
            </div>
          )}
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h2
            className="cc-display"
            style={{
              fontSize: 42,
              color: 'var(--cc-orange-soft)',
              lineHeight: 1,
              margin: '0 0 10px',
              letterSpacing: 1,
            }}
          >
            {characterData.name || 'Unnamed Hero'}
          </h2>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 18,
            }}
          >
            <span className="cc-chip cc-chip-orange">Level {characterData.level || 1}</span>
            {characterData.race && (
              <span className="cc-chip cc-chip-neutral">
                {characterData.subrace ? `${characterData.subrace} ` : ''}{characterData.race}
              </span>
            )}
            {characterData.class && (
              <span className="cc-chip cc-chip-purple">{characterData.class}</span>
            )}
            {characterData.subclass && (
              <span className="cc-chip cc-chip-gold">{characterData.subclass}</span>
            )}
            {characterData.background && (
              <span className="cc-chip cc-chip-neutral">{characterData.background}</span>
            )}
            {characterData.alignment && (
              <span className="cc-chip cc-chip-neutral">{characterData.alignment}</span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}
          >
            <StatBox label="HP" value={maxHP} tone="red" />
            <StatBox label="AC" value={ac} tone="blue" />
            <StatBox
              label="Speed"
              value={characterData.speed || 30}
              suffix="ft"
              tone="green"
            />
            <StatBox label="Prof" value={`+${profBonus}`} tone="orange" />
          </div>

          {(characterData.multiclasses || []).filter((mc) => mc.class).length > 0 && (
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span
                className="cc-label"
                style={{ color: 'var(--cc-text-dim)' }}
              >
                Class breakdown
              </span>
              {[
                { class: characterData.class, level: primaryClassLevel },
                ...(characterData.multiclasses || []).filter((mc) => mc.class),
              ].map((entry, idx) => {
                const icon = CLASS_ICONS[entry.class];
                return (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '2px 10px',
                      background: 'rgba(20, 12, 8, 0.5)',
                      borderRadius: 4,
                      border: '1px solid var(--cc-border)',
                      fontSize: 12,
                      color: 'var(--cc-text)',
                    }}
                  >
                    {icon && <img src={icon} alt="" style={{ width: 18, height: 18 }} />}
                    {entry.class} L{entry.level}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Stat box — used in the hero card
// ============================================================================
function StatBox({ label, value, suffix, tone }) {
  const colors = {
    red:    '#E74C3C',
    blue:   '#3498DB',
    green:  '#52C77E',
    orange: 'var(--cc-orange)',
  };
  const color = colors[tone] || 'var(--cc-text)';
  return (
    <div
      style={{
        padding: '12px 8px',
        background: 'rgba(20, 12, 8, 0.45)',
        borderRadius: 8,
        textAlign: 'center',
        borderTop: `2px solid ${color}`,
      }}
    >
      <div className="cc-label" style={{ color, marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="cc-display"
        style={{
          fontSize: 28,
          color: 'var(--cc-text)',
          lineHeight: 1,
        }}
      >
        {value}
        {suffix && (
          <span
            style={{
              fontSize: 14,
              color: 'var(--cc-text-faint)',
              marginLeft: 2,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Review card — generic .cc-panel wrapper with title row
// ============================================================================
function ReviewCard({ title, icon, iconIsImage, children }) {
  return (
    <div className="cc-panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        {iconIsImage ? (
          <img src={icon} alt="" style={{ width: 22, height: 22 }} />
        ) : (
          <span style={{ fontSize: 18 }}>{icon}</span>
        )}
        <h3
          className="cc-display"
          style={{
            fontSize: 18,
            color: 'var(--cc-text)',
            margin: 0,
            letterSpacing: 0.3,
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// Hover tooltip — lightweight popover for ReviewCard children
// ============================================================================
function ReviewTooltip({ color, title, body, width = 240 }) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 6,
        background: 'var(--cc-bg-3)',
        color: 'var(--cc-text)',
        padding: 12,
        borderRadius: 8,
        fontSize: 12,
        width,
        border: `1px solid ${color}`,
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
        textAlign: 'left',
        pointerEvents: 'none',
      }}
    >
      <div
        className="cc-display"
        style={{ color, fontSize: 13, marginBottom: 4 }}
      >
        {title}
      </div>
      <div className="cc-italic-serif" style={{ lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

// ============================================================================
// Spellbook review card — grouped by spell level with hover details
// ============================================================================
function SpellbookReviewCard({ spells, hoveredItem, setHoveredItem }) {
  const spellLevels = [
    'cantrips', 'level1', 'level2', 'level3', 'level4',
    'level5', 'level6', 'level7', 'level8', 'level9',
  ];
  const hasAnySpells = spellLevels.some((k) => Array.isArray(spells[k]) && spells[k].length > 0);
  if (!hasAnySpells) return null;

  return (
    <ReviewCard title="Spellbook" icon="📖">
      <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
        {spellLevels.map((levelKey) => {
          const list = spells[levelKey];
          if (!list || list.length === 0) return null;
          const isCantrip = levelKey === 'cantrips';
          const labelText = isCantrip
            ? 'Cantrips'
            : levelKey === 'level1' ? '1st Level'
              : levelKey === 'level2' ? '2nd Level'
                : levelKey === 'level3' ? '3rd Level'
                  : `${levelKey.replace('level', '')}th Level`;
          return (
            <div key={levelKey} style={{ marginBottom: 12 }}>
              <div
                className="cc-label"
                style={{
                  marginBottom: 6,
                  color: isCantrip ? 'var(--cc-gold)' : 'var(--cc-orange-soft)',
                }}
              >
                {labelText}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {list.map((spell, idx) => {
                  const info = spellDetails[spell];
                  return (
                    <div
                      key={idx}
                      style={{ position: 'relative' }}
                      onMouseEnter={() => setHoveredItem(`spell-${levelKey}-${idx}`)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <span
                        className={`cc-chip ${isCantrip ? 'cc-chip-gold' : 'cc-chip-orange'}`}
                        style={{ cursor: info ? 'help' : 'default' }}
                      >
                        {spell}
                      </span>
                      {hoveredItem === `spell-${levelKey}-${idx}` && info && (
                        <SpellTooltip name={spell} info={info} accent={isCantrip ? 'var(--cc-gold)' : 'var(--cc-orange)'} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ReviewCard>
  );
}

function SpellTooltip({ name, info, accent }) {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 20,
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 6,
        background: 'var(--cc-bg-3)',
        color: 'var(--cc-text)',
        padding: 12,
        borderRadius: 8,
        fontSize: 11,
        width: 260,
        border: `1px solid ${accent}`,
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'none',
        maxHeight: 280,
        overflowY: 'auto',
        textAlign: 'left',
      }}
    >
      <div
        className="cc-display"
        style={{ color: accent, fontSize: 13, marginBottom: 4 }}
      >
        {name}
      </div>
      <div
        className="cc-italic-serif"
        style={{ fontSize: 11, color: 'var(--cc-text-faint)', marginBottom: 6 }}
      >
        {info.level} {info.school}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
        <div><span style={{ color: 'var(--cc-text-faint)' }}>Casting Time:</span> {info.castingTime}</div>
        <div><span style={{ color: 'var(--cc-text-faint)' }}>Range:</span> {info.range}</div>
        <div><span style={{ color: 'var(--cc-text-faint)' }}>Components:</span> {info.components}</div>
        <div><span style={{ color: 'var(--cc-text-faint)' }}>Duration:</span> {info.duration}</div>
      </div>
      <p
        className="cc-italic-serif"
        style={{ lineHeight: 1.5, color: 'var(--cc-text-dim)', margin: 0 }}
      >
        {info.description}
      </p>
    </div>
  );
}

// ============================================================================
// Companions card — falls back to legacy companion_* fields when needed
// ============================================================================
function CompanionsReviewCard({ characterData }) {
  const companions = Array.isArray(characterData.companions)
    ? characterData.companions
    : [];
  const legacy = (characterData.companion_image || characterData.companion_name)
    ? [{
        name: characterData.companion_name,
        species: COMPANION_LABELS[characterData.class],
        image: characterData.companion_image,
        background: characterData.companion_background,
      }]
    : [];
  const list = companions.length > 0 ? companions : legacy;
  if (list.length === 0) return null;

  return (
    <ReviewCard title="Companions" icon="🐾">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((comp, i) => (
          <CompanionCard key={comp?.id || i} companion={comp} compact />
        ))}
      </div>
    </ReviewCard>
  );
}
