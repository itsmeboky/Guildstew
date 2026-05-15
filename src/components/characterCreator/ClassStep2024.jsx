import React from "react";
import { Sword } from "lucide-react";
import { getGamePack } from "@/data/games";
import { getClassIcon } from "@/data/games/dnd5e_2024/assets";
import { classCopy } from "@/data/games/dnd5e_2024/copy";
import { getSubclassesForClass } from "@/data/games/dnd5e_2024/subclassFeatures";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

/**
 * 2024 D&D 5e — class step.
 *
 * Ported from design-reference/character-creator/step-class.jsx with
 * the 2024 adapter (`getGamePack("dnd5e_2024").getClasses()`) wired
 * in place of the prototype's local CLASSES array. classCopy() carries
 * 2024 flavor; getClassIcon() supplies the medallion artwork.
 *
 * The 2024 SRD ships every base class without subclasses (subclasses
 * unlock at level 3). When a future copy update introduces subclass
 * cards into the adapter, ClassFeaturedTome will pick them up
 * automatically — the prototype's SubclassChapter component renders
 * directly from cls.subclasses.
 */
export default function ClassStep2024({ characterData, updateCharacterData }) {
  const adapter = getGamePack("dnd5e_2024");
  const classes = adapter.getClasses();

  const selectedClass = classes.find((c) => c.name === characterData.class) || null;
  const selectedCopy = selectedClass ? classCopy(selectedClass.name) : null;

  const accent = "var(--page-accent)";

  const handleClassSelect = (clsName) => {
    const cls = classes.find((c) => c.name === clsName);
    if (!cls) return;
    updateCharacterData({
      class: cls.name,
      features: [],
      _gamePackClassId: cls.id,
    });
  };

  return (
    <div>
      <StepHeader
        kicker="Chapter II · The Calling"
        title="Choose your path"
        subtitle="What kind of hero is this? Each calling shapes your spells, your weapons, your destiny."
      />

      <Primer title="How to pick a class">
        Pick the <strong>fantasy</strong> first — the kind of hero you want to be. The mechanics
        will follow. In 2024, subclasses unlock at level 3 — for now, your class shapes your
        hit die, primary ability, and starting skills.
      </Primer>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 28,
          alignItems: 'flex-start',
          marginTop: 28,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {selectedClass ? (
            <ClassFeaturedTome
              cls={selectedClass}
              copy={selectedCopy}
              accent={accent}
              level={characterData.level || 1}
              subclass={characterData.subclass}
              onPickSubclass={(name) => updateCharacterData({ subclass: name })}
            />
          ) : (
            <EmptyClassPrompt />
          )}

          {/* Alignment, physical details, biography, portrait, profile
              avatar moved to IdentityStep2024 per prototype step-class.jsx. */}
        </div>

        <div
          style={{
            position: 'sticky',
            top: 20,
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <ClassRoster classes={classes} current={selectedClass?.name} onPick={handleClassSelect} />
          {selectedClass && <ClassBuildSummary cls={selectedClass} accent={accent} />}
        </div>
      </div>
    </div>
  );
}

function EmptyClassPrompt() {
  return (
    <div
      className="tome"
      style={{
        padding: '60px 36px',
        textAlign: 'center',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 56, opacity: 0.4, marginBottom: 8 }}>✦</div>
      <div className="display" style={{ fontSize: 32, color: 'var(--text)' }}>Choose a calling</div>
      <div
        className="italic-serif"
        style={{ fontSize: 16, color: 'var(--text-dim)', maxWidth: 400, lineHeight: 1.5 }}
      >
        Pick one of the callings from the roster — the chapter will unfurl with its lore.
      </div>
    </div>
  );
}

function ClassFeaturedTome({ cls, copy, accent, level, subclass, onPickSubclass }) {
  const icon = getClassIcon(cls.name);
  const subclasses = getSubclassesForClass(cls.id);
  return (
    <div className="tome" style={{ padding: '32px 36px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
          <div
            style={{
              width: 100,
              height: 100,
              background: `radial-gradient(circle, ${accent}55 0%, ${accent}11 50%, transparent 75%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              lineHeight: 1,
              flexShrink: 0,
              filter: `drop-shadow(0 4px 16px ${accent}66)`,
            }}
          >
            {icon ? (
              <img
                src={icon}
                alt={cls.name}
                style={{ width: 80, height: 80, objectFit: 'contain', filter: 'sepia(0.1)' }}
              />
            ) : (
              <span style={{ filter: 'sepia(0.1)' }}>✦</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div className="label" style={{ color: accent, marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span>The {cls.name}</span>
              {cls.hasWeaponMastery && (
                <span
                  className="chip chip-orange"
                  style={{ padding: '2px 8px', fontSize: 9, letterSpacing: 1 }}
                >
                  <Sword className="w-2.5 h-2.5" /> Mastery
                </span>
              )}
            </div>
            <div
              className="display"
              style={{
                fontSize: 44,
                color: 'var(--text)',
                lineHeight: 1,
                marginBottom: 8,
                letterSpacing: 1,
                textShadow: `0 2px 16px ${accent}44`,
              }}
            >
              {cls.name}
            </div>
            <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
              Hit Die <span style={{ color: accent }}>d{cls.hitDie}</span> &nbsp;·&nbsp;
              Primary <span style={{ color: accent }}>{cls.primaryAbility || '—'}</span> &nbsp;·&nbsp;
              Saves <span style={{ color: accent }}>{(cls.savingThrows || []).join(', ')}</span>
            </div>
          </div>
        </div>

        {copy?.description && (
          <p className="body-prose" style={{ marginBottom: 18 }}>
            {copy.description}
          </p>
        )}

        {copy?.playstyle && (
          <div
            style={{
              padding: 16,
              borderLeft: `3px solid ${accent}`,
              background: `linear-gradient(90deg, ${accent}14, transparent 80%)`,
              borderRadius: 4,
            }}
          >
            <div className="label" style={{ color: accent, marginBottom: 4 }}>✦ Playstyle</div>
            <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.55 }}>
              {copy.playstyle}
            </div>
          </div>
        )}

        {(cls.multiclass?.prerequisites?.length ?? 0) > 0 && (
          <>
            <FleurDivider />
            <div>
              <div className="label" style={{ color: accent, marginBottom: 6 }}>
                Multiclass prerequisites
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>
                {cls.multiclass.prerequisites.map((p) => (
                  <li key={p.ability}>
                    {p.abilityName} {p.minimumScore}+
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {subclasses.length > 0 && (
          <>
            <FleurDivider />
            <SubclassChapter
              subclasses={subclasses}
              accent={accent}
              level={level}
              subclass={subclass}
              onPick={onPickSubclass}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SubclassChapter({ subclasses, accent, level, subclass, onPick }) {
  const availableNow = (level || 1) >= 3;
  return (
    <div>
      <OrnateHeading color={accent}>Subclass</OrnateHeading>
      <div
        className="italic-serif"
        style={{
          fontSize: 14,
          textAlign: 'center',
          color: availableNow ? 'var(--teal)' : 'var(--text-dim)',
          marginBottom: 18,
        }}
      >
        {availableNow
          ? `Active at your current level (${level || 1}).`
          : `Unlocks at level 3 — pick now to plan your build.`}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: subclasses.length === 1 ? '1fr' : subclasses.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {subclasses.map((s) => {
          const active = subclass === s.name;
          const desc = s.summary || s.description || '';
          return (
            <button
              key={s.index || s.name}
              type="button"
              onClick={() => onPick(s.name)}
              className={`pickable ${active ? 'selected' : ''}`}
              style={{
                padding: 16,
                textAlign: 'left',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div className="display" style={{ fontSize: 18, color: 'var(--text)' }}>
                {s.name}
              </div>
              {desc && (
                <div
                  className="italic-serif"
                  style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, flex: 1 }}
                >
                  {desc}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function ClassRoster({ classes, current, onPick }) {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 12 }}>The Callings</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {classes.map((c) => {
          const active = c.name === current;
          const icon = getClassIcon(c.name);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.name)}
              title={c.name}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '10px 4px',
                textAlign: 'center',
                borderRadius: 4,
                transition: 'all .2s',
                background: active ? 'rgba(255, 83, 0, 0.12)' : 'transparent',
                border: `1px solid ${active ? 'var(--orange)' : 'transparent'}`,
                boxShadow: active ? '0 0 14px var(--orange-glow)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(212, 169, 81, 0.06)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                  filter: active ? 'none' : 'grayscale(0.4) opacity(0.75)',
                  transition: 'filter .2s',
                }}
              >
                {icon ? (
                  <img src={icon} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 22 }}>✦</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: active ? 'var(--orange-soft)' : 'var(--text-dim)',
                  letterSpacing: 0.3,
                }}
              >
                {c.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClassBuildSummary({ cls, accent }) {
  return (
    <div className="panel-strong" style={{ padding: 18, position: 'relative' }}>
      <div className="tome-corner tr" />
      <div className="tome-corner bl" />

      <div className="ornate-heading" style={{ marginBottom: 16 }}>
        <span className="ornate-flourish small" style={{ background: accent }} />
        <h3 style={{ fontSize: 18, color: 'var(--text)' }}>{cls.name} build</h3>
        <span className="ornate-flourish small" style={{ background: accent }} />
      </div>

      <SummaryRow label="Hit Die" value={`d${cls.hitDie}`} />
      <SummaryRow label="Primary" value={cls.primaryAbility || '—'} />
      <SummaryRow label="Saves" value={(cls.savingThrows || []).join(', ') || '—'} />
      <SummaryRow
        label="Skills"
        value={`Choose ${cls.skillChoiceCount} of ${cls.skillChoices?.length || 0}`}
      />
      <SummaryRow label="Subclass at" value="Level 3" />
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
        borderBottom: '1px solid var(--border)',
        fontSize: 13,
      }}
    >
      <span
        style={{
          color: 'var(--text-faint)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </span>
    </div>
  );
}
