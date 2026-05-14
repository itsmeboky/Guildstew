import React, { useState, useMemo } from "react";
import { Sword, Sparkles, Lock } from "lucide-react";
import {
  abilityModifier,
  proficiencyBonus,
  SKILL_ABILITIES,
  ALL_SKILLS,
} from "@/components/dnd5e/dnd5eRules";
import { getSpeciesById, getSubspecies } from "@/data/games/dnd5e_2024/species";
import { getBackgroundById } from "@/data/games/dnd5e_2024/backgrounds";
import { getClassByName } from "@/data/games/dnd5e_2024/classes";
import { getSubclass } from "@/data/games/dnd5e_2024/subclassFeatures";
import {
  getSpellsKnownEntry,
  spellsPrepared,
  cantripsKnown,
  getSpellSlots,
  getPactSlots,
  weaponMasterySlots,
} from "@/data/games/dnd5e_2024/rules";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";

// ============================================================================
// 2024 D&D 5e — review step. Exact port of step-review.jsx with the 2024
// adapter (species + background + class + subclass + spells) wired in
// place of the prototype's local CLASSES / RACES / BACKGROUNDS lookups.
// Read-only — no mutations.
// ============================================================================

const ABILITY_META = [
  { key: "str", name: "Strength",     color: "#E74C3C", description: "Melee attacks, athletics, carrying capacity." },
  { key: "dex", name: "Dexterity",    color: "#52C77E", description: "Ranged attacks, stealth, AC, initiative." },
  { key: "con", name: "Constitution", color: "#E5688E", description: "Hit points, endurance, poison resistance." },
  { key: "int", name: "Intelligence", color: "#5DA8E8", description: "Memory, magical theory, deduction." },
  { key: "wis", name: "Wisdom",       color: "#E8C054", description: "Perception, insight, willpower." },
  { key: "cha", name: "Charisma",     color: "#C9A3FF", description: "Persuasion, performance, social magic." },
];

export default function ReviewStep2024({ characterData }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const className = characterData.class || "";
  const level = Number(characterData.level) || 1;
  const cls = className ? getClassByName(className) : null;
  const profBonus = proficiencyBonus(level);

  const species = characterData.species?.speciesId
    ? getSpeciesById(characterData.species.speciesId)
    : null;
  const subspecies = characterData.species?.subspeciesId
    ? getSubspecies(characterData.species.subspeciesId)
    : null;

  const bg = characterData.background?.backgroundId
    ? getBackgroundById(characterData.background.backgroundId)
    : null;

  const subclassRecord = characterData.subclass ? getSubclass(characterData.subclass) : null;

  const attributes = characterData.attributes || {};
  const conMod = abilityModifier(attributes.con || 10);
  const dexMod = abilityModifier(attributes.dex || 10);
  const hitDie = cls?.hitDie || 8;
  const maxHP = (hitDie + conMod) + Math.max(0, level - 1) * (Math.floor(hitDie / 2) + 1 + conMod);
  const ac = 10 + dexMod;
  const speed = species?.speed || 30;

  const proficientSkills = useMemo(() => {
    const sel = characterData.skills || {};
    return Object.entries(sel)
      .filter(([, on]) => on)
      .map(([s]) => s)
      .sort();
  }, [characterData.skills]);
  const backgroundSkills = characterData.background?.skillsGranted || [];
  const expertise = Array.isArray(characterData.expertise) ? characterData.expertise : [];

  const classSaves = (cls?.savingThrows || []).map((s) => String(s).toLowerCase().slice(0, 3));

  const spellTable = getSpellsKnownEntry(className);
  const isCaster = !!spellTable;
  const cantrips = characterData.spells?.cantrips || [];
  const prepared = characterData.spells?.prepared || [];
  const spellbook = characterData.spells?.spellbook || [];
  const alwaysPrepared = characterData.spells?.alwaysPrepared || [];
  const spellSlots = isCaster ? getSpellSlots(className, level) : [];
  const pactSlots = spellTable?.type === "pact" ? getPactSlots(level) : null;

  const masterySlotCount = className ? weaponMasterySlots(className, level) : 0;
  const masteries = Array.isArray(characterData.weaponMasteries) ? characterData.weaponMasteries : [];

  const inventory = Array.isArray(characterData.inventory) ? characterData.inventory : [];
  const currency = characterData.currency || {};
  const totalGoldEquiv =
    (Number(currency.cp) || 0) / 100
    + (Number(currency.sp) || 0) / 10
    + (Number(currency.ep) || 0) / 2
    + (Number(currency.gp) || 0)
    + (Number(currency.pp) || 0) * 10;

  const fullPortraitUrl = characterData.avatar_url;
  const fullPos = characterData.avatar_position || { x: 0, y: 0 };
  const fullZoom = characterData.avatar_zoom || 1;
  const profileUrl = characterData.profile_avatar_url || characterData.avatar_url;

  return (
    <div>
      <StepHeader
        kicker="Chapter VIII · The Reckoning"
        title="Review your hero"
        subtitle="One last look. Spot something off? Hop back to any chapter from the top."
      />

      <HeroCard
        name={characterData.name || 'Unnamed Hero'}
        level={level}
        className={className}
        subclass={characterData.subclass}
        species={species}
        subspecies={subspecies}
        background={bg}
        alignment={characterData.alignment}
        biography={characterData.description || characterData.biography}
        portraitUrl={fullPortraitUrl}
        portraitPos={fullPos}
        portraitZoom={fullZoom}
        profileUrl={profileUrl}
        maxHP={maxHP}
        ac={ac}
        speed={speed}
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
              const value = attributes[ab.key] || 10;
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
                  <div className="label" style={{ fontSize: 9, color: ab.color, marginBottom: 2 }}>
                    {ab.key.toUpperCase()}
                  </div>
                  <div
                    className="display"
                    style={{ fontSize: 24, color: 'var(--text)', lineHeight: 1.1 }}
                  >
                    {(mod >= 0 ? '+' : '') + mod}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{value}</div>
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
              const isProf = classSaves.includes(ab.key);
              const mod = abilityModifier(attributes[ab.key] || 10) + (isProf ? profBonus : 0);
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
                  <span style={{ color: isProf ? 'var(--teal)' : 'var(--text-dim)' }}>
                    {isProf ? '●' : '○'} {ab.name}
                  </span>
                  <span className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>
                    {(mod >= 0 ? '+' : '') + mod}
                  </span>
                </div>
              );
            })}
          </div>
        </ReviewCard>

        <ReviewCard title={`Skills · ${proficientSkills.length}`} icon="🎯">
          {proficientSkills.length === 0 ? (
            <div className="italic-serif" style={{ fontSize: 13, color: 'var(--text-faint)' }}>
              No skill proficiencies yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {proficientSkills.map((s) => {
                const abilityKey = SKILL_ABILITIES[s];
                const baseMod = abilityModifier(attributes[abilityKey] || 10);
                const hasExpertise = expertise.includes(s);
                const mod = baseMod + (hasExpertise ? profBonus * 2 : profBonus);
                const isBg = backgroundSkills.includes(s);
                return (
                  <span
                    key={s}
                    className={`chip ${hasExpertise ? 'chip-gold' : isBg ? '' : 'chip-orange'}`}
                    style={{
                      background: isBg && !hasExpertise ? 'rgba(55,242,209,0.15)' : undefined,
                      color: isBg && !hasExpertise ? 'var(--teal)' : undefined,
                      borderColor: isBg && !hasExpertise ? 'rgba(55,242,209,0.3)' : undefined,
                    }}
                  >
                    {s} {(mod >= 0 ? '+' : '') + mod}
                    {hasExpertise && ' ★'}
                  </span>
                );
              })}
            </div>
          )}
        </ReviewCard>

        {cls && (
          <ReviewCard title={`${cls.name} Build`} icon="⚔️">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                rowGap: 6,
                columnGap: 12,
                fontSize: 13,
              }}
            >
              <span className="label" style={{ color: 'var(--gold-soft)' }}>Hit Die</span>
              <span style={{ color: 'var(--text)' }}>d{cls.hitDie}</span>
              <span className="label" style={{ color: 'var(--gold-soft)' }}>Primary</span>
              <span style={{ color: 'var(--text)' }}>{cls.primaryAbility || '—'}</span>
              {characterData.subclass && (
                <>
                  <span className="label" style={{ color: 'var(--gold-soft)' }}>Subclass</span>
                  <span style={{ color: 'var(--text)' }}>{characterData.subclass}</span>
                </>
              )}
              {masterySlotCount > 0 && (
                <>
                  <span className="label" style={{ color: 'var(--gold-soft)' }}>Mastery slots</span>
                  <span style={{ color: 'var(--text)' }}>
                    {masteries.length} / {masterySlotCount}
                  </span>
                </>
              )}
            </div>
            {masteries.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {masteries.map((m) => (
                  <span
                    key={m}
                    className="chip chip-purple"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Sword className="w-3 h-3" /> {m}
                  </span>
                ))}
              </div>
            )}
          </ReviewCard>
        )}

        {species && (
          <ReviewCard title="Species Traits" icon="🛡️">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(species.traits || []).slice(0, 8).map((t) => (
                <span key={t.index || t.name} className="chip chip-neutral">{t.name}</span>
              ))}
            </div>
            {subspecies && (
              <div style={{ fontSize: 12, color: 'var(--gold-soft)' }}>
                Lineage: <strong style={{ color: 'var(--text)' }}>{subspecies.name}</strong>
              </div>
            )}
          </ReviewCard>
        )}

        {isCaster && (cantrips.length > 0 || prepared.length > 0 || spellbook.length > 0) && (
          <ReviewCard title="Spellbook" icon="📖">
            {alwaysPrepared.length > 0 && (
              <>
                <div className="label" style={{ marginBottom: 6, color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Lock className="w-3 h-3" /> Always prepared
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {alwaysPrepared.map((s) => (
                    <span key={s} className="chip chip-gold">{s}</span>
                  ))}
                </div>
              </>
            )}
            {cantrips.length > 0 && (
              <>
                <div className="label" style={{ marginBottom: 6, color: 'var(--purple)' }}>Cantrips</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {cantrips.map((c) => (
                    <span key={c} className="chip chip-purple">{c}</span>
                  ))}
                </div>
              </>
            )}
            {prepared.length > 0 && (
              <>
                <div className="label" style={{ marginBottom: 6, color: 'var(--orange-soft)' }}>Prepared</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {prepared.map((c) => (
                    <span key={c} className="chip chip-orange">{c}</span>
                  ))}
                </div>
              </>
            )}
            {spellbook.length > 0 && spellbook.length !== prepared.length && (
              <>
                <div className="label" style={{ marginBottom: 6, color: 'var(--gold-soft)' }}>
                  Spellbook · {spellbook.length}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {spellbook.map((c) => (
                    <span
                      key={c}
                      className="chip"
                      style={{
                        opacity: prepared.includes(c) ? 1 : 0.65,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </>
            )}
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {spellSlots.map((slots, idx) => slots > 0 && (
                <span key={idx} className="chip" style={{ fontSize: 10 }}>
                  L{idx + 1}: {slots}/day
                </span>
              ))}
              {pactSlots && (
                <span className="chip chip-purple" style={{ fontSize: 10 }}>
                  Pact: {pactSlots.slots} × L{pactSlots.level}
                </span>
              )}
            </div>
          </ReviewCard>
        )}

        {bg && (
          <ReviewCard title={`Background · ${bg.name}`} icon="📜">
            <div style={{ fontSize: 12, color: 'var(--gold-soft)', marginBottom: 4 }}>Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {(characterData.background?.skillsGranted || []).map((s) => (
                <span key={s} className="chip" style={{ background: 'rgba(55,242,209,0.15)', color: 'var(--teal)', borderColor: 'rgba(55,242,209,0.3)' }}>
                  {s}
                </span>
              ))}
            </div>
            {characterData.background?.toolGranted && (
              <>
                <div style={{ fontSize: 12, color: 'var(--gold-soft)', marginBottom: 4 }}>Tool</div>
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>
                  {characterData.background.toolGranted}
                </div>
              </>
            )}
            {characterData.background?.originFeat && (
              <>
                <div style={{ fontSize: 12, color: 'var(--gold-soft)', marginBottom: 4 }}>Origin Feat</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  {characterData.background.originFeat}
                </div>
              </>
            )}
          </ReviewCard>
        )}

        {subclassRecord && (
          <ReviewCard title={subclassRecord.name} icon="✦">
            {(subclassRecord.summary || subclassRecord.description) && (
              <p
                className="italic-serif"
                style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}
              >
                {subclassRecord.summary || subclassRecord.description}
              </p>
            )}
          </ReviewCard>
        )}

        {inventory.length > 0 && (
          <ReviewCard title={`Equipment · ${inventory.length}`} icon="🎒">
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 18px',
                fontSize: 12,
                color: 'var(--text-dim)',
                lineHeight: 1.7,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {inventory.filter((i) => i?.name).map((it, i) => (
                <li key={i}>
                  {it.name}
                  {it.quantity > 1 && (
                    <span style={{ color: 'var(--text-faint)' }}> ×{it.quantity}</span>
                  )}
                </li>
              ))}
            </ul>
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--border-faint)',
                fontSize: 12,
                color: 'var(--gold)',
                fontWeight: 600,
                textAlign: 'right',
              }}
            >
              Treasury · {totalGoldEquiv.toFixed(1)} gp
            </div>
          </ReviewCard>
        )}

        {(characterData.description || characterData.biography) && (
          <ReviewCard title="Biography" icon="✒️">
            <p
              className="italic-serif"
              style={{
                fontSize: 13.5,
                color: 'var(--text)',
                lineHeight: 1.6,
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {characterData.description || characterData.biography}
            </p>
          </ReviewCard>
        )}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 24,
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(255,83,0,0.1), rgba(255,83,0,0.02))',
          border: '1.5px solid rgba(255, 83, 0, 0.3)',
          textAlign: 'center',
        }}
      >
        <h3 className="display" style={{ fontSize: 24, color: 'var(--orange)', marginBottom: 8 }}>
          Ready to play?
        </h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: 0 }}>
          Save your character from the button at the bottom of the page. You can edit anything
          later from your library.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HeroCard — panel-strong with corner brackets, full-body portrait on the
// left + identity chips + 4 stat boxes (HP / AC / Speed / Prof) on the right
// + biography epigraph beneath. Profile avatar overlay in the bottom-right
// of the portrait when present.
// ============================================================================
function HeroCard({
  name, level, className, subclass, species, subspecies, background, alignment,
  biography, portraitUrl, portraitPos, portraitZoom, profileUrl,
  maxHP, ac, speed, profBonus,
}) {
  const speciesLabel = species
    ? `${subspecies?.name ? subspecies.name + ' ' : ''}${species.name}`
    : '';
  return (
    <div className="panel-strong" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <div className="tome-corner tr" />
      <div className="tome-corner bl" />

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0 }}>
        <div
          style={{
            width: 240,
            height: 280,
            background: portraitUrl
              ? 'rgba(20, 12, 8, 0.4)'
              : 'linear-gradient(135deg, rgba(255,83,0,0.1), rgba(55,242,209,0.05))',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt={name}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `translate(${portraitPos.x}px, ${portraitPos.y}px) scale(${portraitZoom})`,
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
                fontSize: 80,
                opacity: 0.3,
              }}
            >
              🛡️
            </div>
          )}
          {profileUrl && portraitUrl !== profileUrl && (
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: `url(${profileUrl}) center/cover`,
                border: '3px solid var(--orange)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            />
          )}
        </div>

        <div style={{ padding: 24 }}>
          <h2
            className="display"
            style={{ fontSize: 42, color: 'var(--orange)', lineHeight: 1, marginBottom: 8 }}
          >
            {name}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <span className="chip chip-orange">Level {level}</span>
            {speciesLabel && <span className="chip">{speciesLabel}</span>}
            {className && <span className="chip chip-purple">{className}</span>}
            {subclass && <span className="chip chip-gold">{subclass}</span>}
            {background?.name && <span className="chip">{background.name}</span>}
            {alignment && <span className="chip">{alignment}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatBox label="HP" value={maxHP} tone="red" />
            <StatBox label="AC" value={ac} tone="blue" />
            <StatBox label="Speed" value={speed} suffix="ft" tone="green" />
            <StatBox label="Prof" value={`+${profBonus}`} tone="orange" />
          </div>

          {biography && (
            <p
              className="italic-serif"
              style={{
                fontSize: 13,
                color: 'var(--text-dim)',
                margin: '14px 0 0',
                lineHeight: 1.5,
              }}
            >
              "{biography}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, suffix, tone }) {
  const colors = { red: '#E74C3C', blue: '#3498DB', green: '#27AE60', orange: 'var(--orange)' };
  const c = colors[tone] || 'var(--text)';
  return (
    <div
      style={{
        padding: '12px 8px',
        background: 'rgba(20, 12, 8, 0.5)',
        borderRadius: 10,
        textAlign: 'center',
        borderTop: `2px solid ${c}`,
      }}
    >
      <div className="label" style={{ color: c, marginBottom: 4 }}>{label}</div>
      <div className="display" style={{ fontSize: 28, color: 'var(--text)', lineHeight: 1 }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 14, color: 'var(--text-faint)', marginLeft: 2 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ title, icon, children }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h3 className="display" style={{ fontSize: 18, color: 'var(--text)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ReviewTooltip({ color, title, body, width = 240 }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '110%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: '#14090A',
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: 12,
        width,
        textAlign: 'left',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="display"
        style={{ fontSize: 13, color, marginBottom: 4 }}
      >
        {title}
      </div>
      <div
        className="italic-serif"
        style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}
      >
        {body}
      </div>
    </div>
  );
}
