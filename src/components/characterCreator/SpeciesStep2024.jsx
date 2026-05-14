import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  getSpeciesList,
  getSubspeciesForSpecies,
  getSubspecies,
} from "@/data/games/dnd5e_2024/species";
import { getSpeciesIcon } from "@/data/games/dnd5e_2024/assets";
import { speciesCopy, subspeciesCopy } from "@/data/games/dnd5e_2024/copy";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import { OrnateHeading } from "@/components/characterCreator/chrome/Ornaments";

/**
 * 2024 D&D 5e — Species step.
 *
 * Visual layout: 1:1 with the prototype race section in
 * design-reference/character-creator/step-identity.jsx (RaceSection
 * ~40-76, FeaturedRace ~78-137, AutoSelect ~139-142, RaceMedallion
 * ~144-176). Three differences for 2024:
 *   1. "Species" copy in place of "Race"
 *   2. NO ability-bonus chips in the FeaturedSpecies chip row — 2024
 *      shifts ASI from species to background (background grants ASI,
 *      picked on the Abilities step)
 *   3. Lineage picker only shows when the picked species actually has
 *      subspecies (Human in 2024 SRD has none, so the picker hides
 *      cleanly without graceful-degradation noise)
 *
 * Persistence (preserved from the prior 2024 component on this branch):
 *   characterData.species  = { speciesId, subspeciesId? }
 *   characterData.race     = species.name      (legacy field for review/save)
 *   characterData.subrace  = subspecies.name   (legacy)
 */
export default function SpeciesStep2024({ characterData, updateCharacterData }) {
  const speciesList = useMemo(() => getSpeciesList(), []);

  const [selectedSpeciesIndex, setSelectedSpeciesIndex] = useState(() => {
    const id = characterData.species?.speciesId;
    if (!id) return 0;
    const idx = speciesList.findIndex((s) => s.index === id);
    return idx >= 0 ? idx : 0;
  });

  const currentSpecies = speciesList[selectedSpeciesIndex] || speciesList[0];
  const subspeciesOptions = useMemo(
    () => getSubspeciesForSpecies(currentSpecies?.index),
    [currentSpecies],
  );
  const activeSubspeciesId = characterData.species?.subspeciesId
    || subspeciesOptions[0]?.index
    || null;

  const handlePickSpecies = (sp, index) => {
    setSelectedSpeciesIndex(index);
    const firstSub = getSubspeciesForSpecies(sp.index)[0]?.index || null;
    updateCharacterData({
      species: { speciesId: sp.index, subspeciesId: firstSub },
      race: sp.name,
      subrace: firstSub ? getSubspecies(firstSub)?.name || "" : "",
      _racialAbilityBonuses: null,
    });
  };

  const handlePickSubspecies = (subspeciesId) => {
    const sub = getSubspecies(subspeciesId);
    updateCharacterData({
      species: { speciesId: currentSpecies.index, subspeciesId },
      subrace: sub?.name || "",
    });
  };

  // Auto-write the displayed species on mount so the step validator
  // (which checks characterData.species?.speciesId) accepts the
  // initial state. Mirrors the 2014 RaceStep init effect.
  React.useEffect(() => {
    if (!characterData.species?.speciesId && currentSpecies) {
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

  return (
    <div>
      <div className="cc-tome" style={{ padding: '32px 36px' }}>
        <SpeciesSection
          currentSpecies={currentSpecies}
          speciesList={speciesList}
          subspeciesOptions={subspeciesOptions}
          activeSubspeciesId={activeSubspeciesId}
          characterData={characterData}
          onPickSpecies={handlePickSpecies}
          onPickSubspecies={handlePickSubspecies}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SpeciesSection — 1:1 with design-reference/character-creator/step-identity.jsx
// RaceSection (~40-76).
// ============================================================================
function SpeciesSection({
  currentSpecies, speciesList, subspeciesOptions, activeSubspeciesId,
  characterData, onPickSpecies, onPickSubspecies,
}) {
  return (
    <div>
      <OrnateHeading>Species</OrnateHeading>

      {currentSpecies ? (
        <FeaturedSpecies
          species={currentSpecies}
          subspeciesOptions={subspeciesOptions}
          activeSubspeciesId={activeSubspeciesId}
          onPickSubspecies={onPickSubspecies}
        />
      ) : (
        <div
          className="cc-primer"
          style={{
            textAlign: 'center',
            padding: 28,
            fontFamily: 'var(--cc-serif)',
            fontStyle: 'italic',
            color: 'var(--cc-text-dim)',
            fontSize: 16,
          }}
        >
          Choose a species from the line below to reveal its tale.
        </div>
      )}

      {/* Species rail — prototype uses repeat(9, 1fr). The 2024 SRD
          ships exactly 9 species (Aasimar, Dragonborn, Dwarf, Elf,
          Gnome, Goliath, Halfling, Human, Orc, Tiefling — 10 entries
          actually). When the list overflows 9 columns the grid simply
          wraps to a second row. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: 8,
          marginTop: 18,
        }}
      >
        {speciesList.map((sp, idx) => (
          <SpeciesMedallion
            key={sp.index}
            species={sp}
            active={characterData.species?.speciesId === sp.index}
            onClick={() => onPickSpecies(sp, idx)}
          />
        ))}
      </div>
    </div>
  );
}

// FeaturedSpecies — 1:1 with prototype's FeaturedRace (~78-137).
// Ability-bonus chips omitted: 2024 species don't grant ASI.
function FeaturedSpecies({
  species, subspeciesOptions, activeSubspeciesId, onPickSubspecies,
}) {
  const blurb = speciesCopy(species.name) || "";
  const traits = Array.isArray(species.traits) ? species.traits : [];

  return (
    <motion.div
      key={species.index}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 22 }}
    >
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
        <SpeciesGlyph species={species} size={56} />
      </div>

      <div>
        <div
          className="cc-display"
          style={{
            fontSize: 36,
            color: 'var(--cc-orange-soft)',
            lineHeight: 1,
            marginBottom: 8,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {species.name}
          <InfoTip>{tipFor("race")}</InfoTip>
        </div>

        {blurb && (
          <p
            className="cc-italic-serif"
            style={{
              fontSize: 16,
              color: 'var(--cc-text-dim)',
              margin: 0,
              marginBottom: 14,
              lineHeight: 1.55,
            }}
          >
            {blurb}
          </p>
        )}

        {/* Chip row — Speed / Size / trait names. No ability-bonus
            chips: 2024 background grants ASI instead. */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 16,
          }}
        >
          {species.speed != null && (
            <span className="cc-chip cc-chip-gold">Speed {species.speed} ft</span>
          )}
          {species.size && (
            <span className="cc-chip cc-chip-gold">Size {species.size}</span>
          )}
          {traits.map((t, idx) => (
            <span
              key={`${t.index || t.name}-${idx}`}
              className="cc-chip cc-chip-neutral"
              title={t.description || undefined}
              style={t.description ? { cursor: 'help' } : undefined}
            >
              {t.name}
            </span>
          ))}
        </div>

        {/* Lineage picker — only when this species has subspecies in
            the 2024 SRD (Human has none, Dragonborn / Elf / Gnome /
            Goliath / Tiefling all have multiple). Layout matches the
            prototype's auto-fill minmax(180px, 1fr) grid. */}
        {subspeciesOptions.length > 0 && (
          <div>
            <div
              className="cc-label"
              style={{ marginBottom: 8, color: 'var(--cc-gold-soft)' }}
            >
              Choose a lineage
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
              }}
            >
              {subspeciesOptions.map((sub) => {
                const active = activeSubspeciesId === sub.index;
                const desc = subspeciesCopy(sub.index) || "";
                return (
                  <button
                    key={sub.index}
                    type="button"
                    onClick={() => onPickSubspecies(sub.index)}
                    className={`cc-pickable ${active ? 'cc-selected-teal' : ''}`}
                    style={{ padding: '12px 14px', textAlign: 'left', color: 'inherit' }}
                  >
                    <div
                      className="cc-display"
                      style={{
                        fontSize: 16,
                        color: 'var(--cc-text)',
                        marginBottom: 4,
                      }}
                    >
                      {sub.name}
                    </div>
                    {desc && (
                      <div
                        className="cc-italic-serif"
                        style={{
                          fontSize: 13,
                          color: 'var(--cc-text-dim)',
                          lineHeight: 1.45,
                        }}
                      >
                        {desc}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// SpeciesMedallion — 1:1 with prototype's RaceMedallion (~144-176).
function SpeciesMedallion({ species, active, onClick }) {
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
        border: `1px solid ${active ? 'var(--cc-orange)' : 'transparent'}`,
        boxShadow: active ? '0 0 16px var(--cc-orange-glow)' : 'none',
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
        <SpeciesGlyph species={species} size={26} />
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: active ? 'var(--cc-orange-soft)' : 'var(--cc-text-dim)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {species.name}
      </div>
    </button>
  );
}

// Renders the species icon. 2024 assets adapter returns a URL when
// known; otherwise we fall back to the first letter of the species
// name (the prototype's emoji glyphs are 2014-specific and the 2024
// SRD ships icon assets via `getSpeciesIcon`).
function SpeciesGlyph({ species, size }) {
  const iconUrl = getSpeciesIcon(species.name);
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        style={{ width: size + 12, height: size + 12, objectFit: 'contain' }}
      />
    );
  }
  return (
    <span style={{ fontSize: size, lineHeight: 1, color: 'var(--cc-gold)' }}>
      {species.name?.charAt(0) || '?'}
    </span>
  );
}
