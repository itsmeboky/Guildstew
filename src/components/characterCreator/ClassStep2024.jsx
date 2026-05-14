import React, { useState } from "react";
import { Sword } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { getGamePack } from "@/data/games";
import { getClassIcon } from "@/data/games/dnd5e_2024/assets";
import { classCopy, ALIGNMENTS } from "@/data/games/dnd5e_2024/copy";
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
  const selectedAlignment = ALIGNMENTS.find((a) => a.name === characterData.alignment);
  const selectedCopy = selectedClass ? classCopy(selectedClass.name) : null;

  const accent = "var(--page-accent)";

  const [uploading, setUploading] = useState(false);

  const handleClassSelect = (clsName) => {
    const cls = classes.find((c) => c.name === clsName);
    if (!cls) return;
    updateCharacterData({
      class: cls.name,
      features: [],
      _gamePackClassId: cls.id,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateCharacterData({ avatar_url: file_url });
      toast.success("Portrait uploaded!");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const setAppearance = (patch) => {
    updateCharacterData({ appearance: { ...(characterData.appearance || {}), ...patch } });
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
            <ClassFeaturedTome cls={selectedClass} copy={selectedCopy} accent={accent} />
          ) : (
            <EmptyClassPrompt />
          )}

          <AlignmentTome
            value={characterData.alignment}
            onChange={(name) => updateCharacterData({ alignment: name })}
            selected={selectedAlignment}
          />

          <PortraitTome
            avatarUrl={characterData.avatar_url}
            uploading={uploading}
            onUpload={handleImageUpload}
            name={characterData.name}
            onName={(v) => updateCharacterData({ name: v })}
            description={characterData.description}
            onDescription={(v) => updateCharacterData({ description: v })}
            appearance={characterData.appearance}
            onAppearance={setAppearance}
          />
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

function ClassFeaturedTome({ cls, copy, accent }) {
  const icon = getClassIcon(cls.name);
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
      </div>
    </div>
  );
}

function AlignmentTome({ value, onChange, selected }) {
  const current = value || 'True Neutral';
  return (
    <div className="tome" style={{ padding: '32px 36px' }}>
      <OrnateHeading>Alignment</OrnateHeading>
      <div
        className="italic-serif"
        style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 14, textAlign: 'center' }}
      >
        Roleplay only — no mechanics depend on alignment.
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          maxWidth: 540,
          margin: '0 auto',
        }}
      >
        {ALIGNMENTS.map((a) => {
          const active = current === a.name;
          const short = (a.name.match(/\b(\w)\w*/g) || []).map((s) => s[0]).join('');
          const [w1, w2] = a.name.split(' ');
          return (
            <button
              key={a.name}
              type="button"
              onClick={() => onChange(a.name)}
              className={`pickable ${active ? 'selected' : ''}`}
              style={{ padding: '12px 8px', textAlign: 'center', color: 'inherit' }}
            >
              <div
                className="display"
                style={{
                  fontSize: 13,
                  color: active ? 'var(--orange-soft)' : 'var(--gold-soft)',
                  marginBottom: 2,
                }}
              >
                {short}
              </div>
              <div
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: 0.2 }}
              >
                {w1}
                <br />
                {w2 || ' '}
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div
          className="italic-serif fade-in"
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.5,
            maxWidth: 540,
            margin: '16px auto 0',
          }}
        >
          <strong
            className="display"
            style={{ color: 'var(--orange-soft)', fontSize: 16, fontWeight: 'normal' }}
          >
            {selected.name}.
          </strong>{' '}
          {selected.description}
        </div>
      )}
    </div>
  );
}

function PortraitTome({
  avatarUrl,
  uploading,
  onUpload,
  name,
  onName,
  description,
  onDescription,
  appearance,
  onAppearance,
}) {
  return (
    <div className="tome" style={{ padding: '32px 36px' }}>
      <OrnateHeading>Portrait &amp; Identity</OrnateHeading>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 22, alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 8,
              background: 'rgba(20, 12, 8, 0.5)',
              border: '1px solid var(--border)',
              aspectRatio: '2 / 3',
              width: '100%',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Character"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-faint)',
                  textAlign: 'center',
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 40, opacity: 0.4, marginBottom: 8 }}>⊕</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>
                  Upload your hero
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('avatar-upload-2024').click()}
            disabled={uploading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 10 }}
          >
            {uploading ? 'Uploading…' : 'Upload Portrait'}
          </button>
          <input
            type="file"
            id="avatar-upload-2024"
            accept="image/*"
            onChange={onUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              Character Name <span style={{ color: 'var(--orange)' }}>*</span>
            </div>
            <input
              className="input"
              value={name || ''}
              onChange={(e) => onName(e.target.value)}
              placeholder="e.g. Kael Stormwhisper"
              maxLength={40}
              style={{ fontSize: 16 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Age</div>
              <input
                type="number"
                className="input"
                value={appearance?.age ?? ''}
                onChange={(e) => onAppearance({ age: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
                placeholder="25"
              />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Height</div>
              <input
                className="input"
                value={appearance?.height || ''}
                onChange={(e) => onAppearance({ height: e.target.value })}
                placeholder={`5'10"`}
              />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Weight</div>
              <input
                className="input"
                value={appearance?.weight || ''}
                onChange={(e) => onAppearance({ weight: e.target.value })}
                placeholder="180 lbs"
              />
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              Biography <span style={{ color: 'var(--text-faint)', fontWeight: 600, letterSpacing: 0 }}>(optional)</span>
            </div>
            <textarea
              className="input italic-serif"
              value={description || ''}
              onChange={(e) => onDescription(e.target.value)}
              placeholder="Their story so far..."
              rows={4}
              style={{
                resize: 'vertical',
                minHeight: 90,
                fontFamily: 'var(--serif)',
                fontSize: 15,
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            />
          </div>
        </div>
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
