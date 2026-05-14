import React, { useState, useMemo, useEffect } from "react";
import {
  getSpeciesList,
  getSubspeciesForSpecies,
  getSubspecies,
} from "@/data/games/dnd5e_2024/species";
import { getSpeciesIcon } from "@/data/games/dnd5e_2024/assets";
import { speciesCopy, subspeciesCopy } from "@/data/games/dnd5e_2024/copy";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";

/**
 * 2024 D&D 5e — species step.
 *
 * Visual layout mirrors the prototype's step-identity.jsx race section:
 * tome page with a featured species card + medallion rail beneath, and
 * a right-rail codex with name / level / 2024 background-context note.
 *
 * 2024 rule shift: species does NOT grant ability score bonuses — those
 * come from the background, picked in the Abilities step.
 *
 * Persistence (preserved from the previous step component):
 *   characterData.species   = { speciesId, subspeciesId? }
 *   characterData.race      = species.name (legacy field for review)
 *   characterData.subrace   = subspecies.name (legacy)
 */
export default function SpeciesStep2024({ characterData, updateCharacterData }) {
  const speciesList = getSpeciesList();

  const selectedSpeciesIndex = useMemo(() => {
    const id = characterData.species?.speciesId;
    if (!id) return 0;
    const idx = speciesList.findIndex((s) => s.index === id);
    return idx >= 0 ? idx : 0;
  }, [characterData.species?.speciesId, speciesList]);

  const currentSpecies = speciesList[selectedSpeciesIndex];
  const subspeciesOptions = useMemo(
    () => getSubspeciesForSpecies(currentSpecies?.index),
    [currentSpecies],
  );
  const selectedSubspeciesId = characterData.species?.subspeciesId
    || subspeciesOptions[0]?.index
    || null;
  const selectedSubspecies = selectedSubspeciesId
    ? getSubspecies(selectedSubspeciesId)
    : null;

  const handlePickSpecies = (sp) => {
    const firstSub = getSubspeciesForSpecies(sp.index)[0]?.index || null;
    updateCharacterData({
      species: { speciesId: sp.index, subspeciesId: firstSub },
      race: sp.name,
      subrace: firstSub ? getSubspecies(firstSub)?.name || "" : "",
      _racialAbilityBonuses: null,
    });
  };

  const handleSubspeciesSelect = (subspeciesId) => {
    const sub = getSubspecies(subspeciesId);
    updateCharacterData({
      species: { speciesId: currentSpecies.index, subspeciesId },
      subrace: sub?.name || "",
    });
  };

  useEffect(() => {
    if (!characterData.species?.speciesId) {
      const firstSub = subspeciesOptions[0]?.index || null;
      updateCharacterData({
        species: { speciesId: currentSpecies.index, subspeciesId: firstSub },
        race: currentSpecies.name,
        subrace: firstSub ? getSubspecies(firstSub)?.name || "" : "",
        _racialAbilityBonuses: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speciesDesc = speciesCopy(currentSpecies?.name)?.description || "";
  const subspeciesDesc = selectedSubspeciesId ? subspeciesCopy(selectedSubspeciesId) : "";

  return (
    <div>
      <StepHeader
        kicker="Chapter I · The Hero"
        title="Forge your hero"
        subtitle="Heritage and history — the soul of your character before they ever swing a sword."
      />

      <Primer title="2024 D&D — what's different">
        Your <strong>species</strong> sets your size, speed, and a handful of innate
        traits. Unlike 2014, species no longer grants ability score bonuses — those
        come from your <strong>background</strong>, which you'll pick next.
      </Primer>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: 28,
          marginTop: 24,
          alignItems: 'flex-start',
        }}
      >
        <div className="tome" style={{ padding: '32px 36px' }}>
          <OrnateHeading>Species</OrnateHeading>

          {currentSpecies ? (
            <FeaturedSpecies
              species={currentSpecies}
              description={speciesDesc}
              subspeciesOptions={subspeciesOptions}
              selectedSubspeciesId={selectedSubspeciesId}
              selectedSubspecies={selectedSubspecies}
              subspeciesDesc={subspeciesDesc}
              onPickSubspecies={handleSubspeciesSelect}
            />
          ) : (
            <div
              className="primer"
              style={{
                textAlign: 'center',
                padding: 28,
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                color: 'var(--text-dim)',
                fontSize: 16,
              }}
            >
              Choose a species from the line below to reveal their tale.
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              gap: 8,
              marginTop: 18,
            }}
          >
            {speciesList.map((sp) => (
              <SpeciesMedallion
                key={sp.index}
                species={sp}
                active={currentSpecies?.index === sp.index}
                onClick={() => handlePickSpecies(sp)}
              />
            ))}
          </div>

          <FleurDivider />

          <div>
            <OrnateHeading>Identity</OrnateHeading>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Character Name <span style={{ color: 'var(--orange)' }}>*</span>
                </div>
                <input
                  className="input"
                  value={characterData.name || ''}
                  onChange={(e) => updateCharacterData({ name: e.target.value })}
                  placeholder="e.g. Kael Stormwhisper"
                  maxLength={40}
                  style={{ fontSize: 16 }}
                />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Level</div>
                <select
                  className="input"
                  value={characterData.level || 1}
                  onChange={(e) => updateCharacterData({ level: parseInt(e.target.value, 10) || 1 })}
                  style={{
                    appearance: 'none',
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237B8AA0' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: 36,
                  }}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((lv) => (
                    <option key={lv} value={lv}>Level {lv}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <BackgroundContextCodex />
        </div>
      </div>
    </div>
  );
}

function FeaturedSpecies({
  species,
  description,
  subspeciesOptions,
  selectedSubspeciesId,
  selectedSubspecies,
  subspeciesDesc,
  onPickSubspecies,
}) {
  const icon = getSpeciesIcon(species.name);
  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 22 }}>
      <div
        style={{
          height: 90,
          width: 90,
          background: 'radial-gradient(circle, rgba(212, 169, 81, 0.18) 0%, transparent 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 56,
          lineHeight: 1,
          position: 'relative',
          filter: 'drop-shadow(0 4px 12px rgba(255, 83, 0, 0.25))',
        }}
      >
        {icon ? (
          <img src={icon} alt={species.name} style={{ width: 72, height: 72, objectFit: 'contain', filter: 'sepia(0.15) saturate(1.2)' }} />
        ) : (
          <span style={{ filter: 'sepia(0.15) saturate(1.2)' }}>✨</span>
        )}
      </div>

      <div>
        <div
          className="display"
          style={{ fontSize: 36, color: 'var(--orange-soft)', lineHeight: 1, marginBottom: 8, letterSpacing: 1 }}
        >
          {species.name}
        </div>
        <p
          className="italic-serif"
          style={{ fontSize: 16, color: 'var(--text-dim)', margin: 0, marginBottom: 14, lineHeight: 1.55 }}
        >
          {description || species.type}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <span className="chip chip-gold">Speed {species.speed} ft</span>
          <span className="chip chip-gold">Size {species.size}</span>
          {(species.traits || []).slice(0, 4).map((t) => (
            <span key={t.index || t.name} className="chip chip-neutral">{t.name}</span>
          ))}
        </div>

        {subspeciesOptions.length > 1 && (
          <div>
            <div className="label" style={{ marginBottom: 8, color: 'var(--gold-soft)' }}>
              Choose a lineage
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
              }}
            >
              {subspeciesOptions.map((s) => {
                const active = s.index === selectedSubspeciesId;
                return (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => onPickSubspecies(s.index)}
                    className={`pickable ${active ? 'selected-teal' : ''}`}
                    style={{ padding: '12px 14px', textAlign: 'left', color: 'inherit' }}
                  >
                    <div
                      className="display"
                      style={{ fontSize: 16, color: active ? 'var(--teal)' : 'var(--text)', marginBottom: 4 }}
                    >
                      {s.name}
                    </div>
                    <div
                      className="italic-serif"
                      style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}
                    >
                      {s.description || (active ? subspeciesDesc : "") || s.species?.name || ""}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedSubspecies && subspeciesDesc && (
              <p
                className="italic-serif fade-in"
                style={{
                  marginTop: 14,
                  padding: '12px 16px',
                  background: 'rgba(20, 12, 8, 0.5)',
                  borderRadius: 4,
                  borderLeft: '3px solid var(--teal)',
                  fontSize: 13,
                  color: 'var(--text-dim)',
                  lineHeight: 1.55,
                }}
              >
                {subspeciesDesc}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpeciesMedallion({ species, active, onClick }) {
  const icon = getSpeciesIcon(species.name);
  return (
    <button
      type="button"
      onClick={onClick}
      title={species.name}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 4px',
        borderRadius: 4,
        transition: 'all .15s',
        background: active ? 'rgba(255, 83, 0, 0.10)' : 'transparent',
        border: `1px solid ${active ? 'var(--orange)' : 'transparent'}`,
        boxShadow: active ? '0 0 16px var(--orange-glow)' : 'none',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(212, 169, 81, 0.06)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          lineHeight: 1,
          background: active
            ? 'radial-gradient(circle, rgba(255, 83, 0, 0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(212, 169, 81, 0.08) 0%, transparent 70%)',
          filter: active ? 'none' : 'grayscale(0.4) opacity(0.85)',
        }}
      >
        {icon ? (
          <img src={icon} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        ) : (
          <span>✦</span>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: active ? 'var(--orange-soft)' : 'var(--text-dim)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {species.name}
      </div>
    </button>
  );
}

function BackgroundContextCodex() {
  return (
    <div className="panel-strong" style={{ padding: 24, position: 'relative' }}>
      <div className="tome-corner tr" />
      <div className="tome-corner bl" />

      <div className="ornate-heading" style={{ marginBottom: 20 }}>
        <span className="ornate-flourish small" />
        <h3 style={{ fontSize: 22, color: 'var(--text)' }}>Codex</h3>
        <span className="ornate-flourish small" />
      </div>

      <p className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55, margin: 0 }}>
        In 2024, your <strong style={{ color: 'var(--orange-soft)' }}>background</strong> grants ability score bonuses,
        two skills, a tool proficiency, and an Origin Feat. You'll pick it on the next step
        (Abilities & Background) — species no longer grants ASI.
      </p>
    </div>
  );
}
