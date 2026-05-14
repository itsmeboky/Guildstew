import React from "react";
import { Sword } from "lucide-react";
import {
  getClassBasics,
  hasPerLevelFeatures,
} from "@/data/games/dnd5e_2024/classFeatures";
import {
  getSubclassesForClass,
  getSubclassFeaturesAtLevel,
} from "@/data/games/dnd5e_2024/subclassFeatures";
import { getWeaponsWithMastery } from "@/data/games/dnd5e_2024/equipment";
import {
  weaponMasterySlots,
  getSpellsKnownEntry,
  rageUsesAtLevel,
  rageDamageAtLevel,
  sneakAttackDice,
  martialArtsDie,
  focusPoints,
  layOnHandsPool,
  channelDivinityUses,
  sorceryPoints,
  metamagicKnown,
  getPactSlots,
  eldritchInvocationsKnown,
  mysticArcanumLevels,
  cantripsKnown,
} from "@/data/games/dnd5e_2024/rules";
import SubclassPicker from "@/components/characterCreator/SubclassPicker";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";
import { CharacterSummary } from "@/components/characterCreator/chrome/CharacterSummary";

// ============================================================================
// 2024 D&D 5e — class features step. Prototype-aligned port of
// step-features.jsx with the 2024 adapter (classFeatures / subclassFeatures
// / rules helpers) wired in place of the prototype's local CLASSES table.
// ============================================================================

const CLASS_ACCENT = {
  Barbarian: "#D89860", Bard: "#FF4DA6", Cleric: "#FFF1D2", Druid: "#52D880",
  Fighter: "#FF5040",  Monk: "#3FE0E8",  Paladin: "#FFD550", Ranger: "#D45A50",
  Rogue: "#D8D5E0",    Sorcerer: "#FF9050", Warlock: "#B580FF", Wizard: "#5AA0FF",
};
const ACCENT_FALLBACK = "var(--gold)";

export default function ClassFeaturesStep2024({ characterData, updateCharacterData }) {
  const className = characterData.class || "";
  const level = characterData.level || 1;
  const basics = className ? getClassBasics(className) : null;
  const accent = CLASS_ACCENT[className] || ACCENT_FALLBACK;

  const subclassChoices = basics
    ? getSubclassesForClass(basics.index).map((s) => ({
        name: s.name,
        description: s.summary || s.description || "",
      }))
    : [];

  const chosenSubclass = characterData.subclass || null;
  const subclassFeatures = chosenSubclass
    ? getSubclassFeaturesAtLevel(chosenSubclass, level)
    : [];

  // Weapon Mastery (2024 mechanic for 5 martial classes)
  const masterySlotCount = weaponMasterySlots(className, level);
  const selectedMasteries = Array.isArray(characterData.weaponMasteries)
    ? characterData.weaponMasteries
    : [];
  const masteryWeapons = masterySlotCount > 0 ? getWeaponsWithMastery() : [];

  const toggleMastery = (weaponName) => {
    const isSelected = selectedMasteries.includes(weaponName);
    if (isSelected) {
      updateCharacterData({
        weaponMasteries: selectedMasteries.filter((n) => n !== weaponName),
      });
    } else if (selectedMasteries.length < masterySlotCount) {
      updateCharacterData({
        weaponMasteries: [...selectedMasteries, weaponName],
      });
    }
  };

  // Per-class live mechanical values at this level (Rage uses, Sneak
  // Attack dice, Martial Arts die, Lay on Hands pool, etc.).
  const scalingRows = (() => {
    const rows = [];
    const cantrips = cantripsKnown(className, level);
    if (cantrips > 0) rows.push({ label: "Cantrips known", value: String(cantrips) });

    if (className === "Barbarian") {
      const uses = rageUsesAtLevel(level);
      if (uses > 0) rows.push({ label: "Rage uses / Long Rest", value: uses === Infinity ? "Unlimited" : String(uses) });
      const dmg = rageDamageAtLevel(level);
      if (dmg > 0) rows.push({ label: "Rage damage bonus", value: `+${dmg}` });
    }
    if (className === "Rogue") {
      const dice = sneakAttackDice(level);
      if (dice > 0) rows.push({ label: "Sneak Attack", value: `${dice}d6` });
    }
    if (className === "Monk") {
      const die = martialArtsDie(level);
      if (die) rows.push({ label: "Martial Arts die", value: die });
      const fp = focusPoints(level);
      if (fp > 0) rows.push({ label: "Focus Points", value: String(fp) });
    }
    if (className === "Paladin") {
      const pool = layOnHandsPool(level);
      if (pool > 0) rows.push({ label: "Lay on Hands pool", value: `${pool} HP` });
      const cd = channelDivinityUses("Paladin", level);
      if (cd > 0) rows.push({ label: "Channel Divinity / Short or Long Rest", value: String(cd) });
    }
    if (className === "Cleric") {
      const cd = channelDivinityUses("Cleric", level);
      if (cd > 0) rows.push({ label: "Channel Divinity / Long Rest", value: String(cd) });
    }
    if (className === "Sorcerer") {
      const sp = sorceryPoints(level);
      if (sp > 0) rows.push({ label: "Sorcery Points", value: String(sp) });
      const mm = metamagicKnown(level);
      if (mm > 0) rows.push({ label: "Metamagic options known", value: String(mm) });
    }
    if (className === "Warlock") {
      const pact = getPactSlots(level);
      if (pact) rows.push({ label: "Pact Magic slots / Short or Long Rest", value: `${pact.slots} × level-${pact.level}` });
      const inv = eldritchInvocationsKnown(level);
      if (inv > 0) rows.push({ label: "Eldritch Invocations known", value: String(inv) });
      const arcanum = mysticArcanumLevels(level);
      if (arcanum.length > 0) rows.push({ label: "Mystic Arcanum slots (1 / Long Rest each)", value: arcanum.map((l) => `level-${l}`).join(", ") });
    }
    return rows;
  })();

  const hasL1PathChoice = !!getSpellsKnownEntry(className)?.level1ClassPathChoice;

  if (!className) {
    return (
      <div>
        <StepHeader kicker="Chapter IV · The Gifts" title="Class features" />
        <div className="tome" style={{ padding: 40, textAlign: 'center', marginTop: 20 }}>
          <div className="italic-serif" style={{ fontSize: 16, color: 'var(--text-dim)' }}>
            Pick a class first to reveal your features.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        kicker="Chapter IV · The Gifts"
        title="Class features"
        subtitle="Special abilities your training has earned. Some automatic — some need your choice."
      />

      <Primer title="What this chapter is for">
        Most class features are <strong>automatic</strong>. In 2024 the per-level feature
        progression for base classes ships as URL stubs in the SRD — only the subclass
        features at <strong>level 3+</strong> render below. Class scaling values (Rage
        uses, Sneak Attack dice, Focus Points, etc.) are computed live from the rules
        helpers.
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
        {/* LEFT — features tome */}
        <div className="tome" style={{ padding: '32px 36px' }}>
          {basics && <ClassBasicsBlock basics={basics} accent={accent} />}

          {scalingRows.length > 0 && (
            <>
              <FleurDivider />
              <OrnateHeading color={accent}>Class Scaling · Level {level}</OrnateHeading>
              <div className="italic-serif" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>
                Live values from the {basics?.name || className} class table at your current level.
              </div>
              <ScalingTable rows={scalingRows} accent={accent} />
            </>
          )}

          {hasL1PathChoice && (
            <RequiredChoice
              title="Additional Level-1 Options"
              help={`${basics?.name || "This class"} has a level-1 path choice with options beyond what the SRD provides. Consult your rulebook to make the selection — the picker will land once the SRD ships the option list.`}
              required={false}
            >
              <div
                className="italic-serif"
                style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}
              >
                Pending SRD expansion.
              </div>
            </RequiredChoice>
          )}

          {masterySlotCount > 0 && (
            <>
              <FleurDivider />
              <OrnateHeading color={accent}>Weapon Mastery</OrnateHeading>
              <div
                className="italic-serif"
                style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, marginBottom: 6 }}
              >
                Choose {masterySlotCount} weapon type{masterySlotCount === 1 ? '' : 's'} you can apply
                mastery properties to. You can swap one on a long rest.
              </div>
              <div
                className="label"
                style={{ textAlign: 'center', color: 'var(--teal)', marginBottom: 14 }}
              >
                {selectedMasteries.length} / {masterySlotCount} chosen
              </div>
              <WeaponMasteryGrid
                weapons={masteryWeapons}
                selected={selectedMasteries}
                onToggle={toggleMastery}
                atMax={selectedMasteries.length >= masterySlotCount}
              />
              {selectedMasteries.length < masterySlotCount && (
                <p
                  className="italic-serif"
                  style={{ marginTop: 10, fontSize: 12, color: 'var(--orange-soft)', textAlign: 'center' }}
                >
                  ⚠ Pick {masterySlotCount - selectedMasteries.length} more weapon{masterySlotCount - selectedMasteries.length === 1 ? '' : 's'} to use mastery properties.
                </p>
              )}
            </>
          )}

          {basics && level >= 3 && subclassChoices.length > 0 && (
            <RequiredChoice
              title={`${basics.name} Subclass`}
              help={`Choose your path at level 3. The chosen subclass's features unlock immediately at your current level.`}
              required={!chosenSubclass}
            >
              <SubclassPicker
                choices={subclassChoices}
                value={chosenSubclass}
                onSelect={(value) => updateCharacterData({ subclass: value })}
                featureName={`${basics.name} Subclass`}
                levelGained={3}
              />
              {subclassChoices.length < 4 && (
                <p
                  className="italic-serif"
                  style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 10, textAlign: 'center' }}
                >
                  Showing {subclassChoices.length} of 4 PHB 2024 subclasses for {basics.name}.
                  The remaining subclasses are PHB-only and will appear once Wizards expands the SRD.
                </p>
              )}
            </RequiredChoice>
          )}

          {basics && level < 3 && (
            <div
              style={{
                marginTop: 22,
                padding: '14px 20px',
                background: 'rgba(20, 12, 8, 0.5)',
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
            >
              <div className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center' }}>
                Subclass selection unlocks at <strong style={{ color: 'var(--text)', fontStyle: 'normal' }}>Level 3</strong> in PHB 2024.
              </div>
            </div>
          )}

          {chosenSubclass && subclassFeatures.length > 0 && (
            <>
              <FleurDivider />
              <OrnateHeading color={accent}>
                {chosenSubclass} · Subclass Features
              </OrnateHeading>
              <SubclassFeatureScroll features={subclassFeatures} color={accent} />
            </>
          )}
        </div>

        {/* RIGHT — sticky rail with summary + upcoming */}
        <div
          style={{
            position: 'sticky',
            top: 20,
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <CharacterSummary data={characterData} />
          <UpcomingMilestones className={className} basics={basics} level={level} chosenSubclass={chosenSubclass} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ClassBasicsBlock — hit die / primary / saves / proficiencies + multiclass
// prereqs surfaced from the SRD class record.
// ============================================================================
function ClassBasicsBlock({ basics, accent }) {
  const primary = basics.primary_ability?.desc || "—";
  const saves = (basics.saving_throws || []).map((s) => s.name).join(', ') || "—";
  const profs = (basics.proficiencies || []).map((p) => p.name).join(' · ') || "—";
  return (
    <div>
      <OrnateHeading color={accent}>
        {basics.name} · Class Basics
      </OrnateHeading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: 16,
          rowGap: 8,
          fontSize: 14,
          padding: '12px 16px',
          background: 'rgba(20, 12, 8, 0.5)',
          border: '1px solid var(--border)',
          borderRadius: 6,
        }}
      >
        <span className="label" style={{ color: 'var(--gold-soft)' }}>Hit Die</span>
        <span style={{ color: 'var(--text)' }}>d{basics.hit_die}</span>

        <span className="label" style={{ color: 'var(--gold-soft)' }}>Primary</span>
        <span style={{ color: 'var(--text)' }}>{primary}</span>

        <span className="label" style={{ color: 'var(--gold-soft)' }}>Saves</span>
        <span style={{ color: 'var(--text)' }}>{saves}</span>

        <span className="label" style={{ color: 'var(--gold-soft)' }}>Proficiencies</span>
        <span style={{ color: 'var(--text)' }}>{profs}</span>

        {basics.multi_classing?.prerequisites?.length > 0 && (
          <>
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Multiclass</span>
            <span style={{ color: 'var(--text)' }}>
              {basics.multi_classing.prerequisites
                .map((p) => `${p.ability_score?.name || "?"} ${p.minimum_score}+`)
                .join(', ')}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ScalingTable — 2-col grid of label/value rows with class-tinted values
// ============================================================================
function ScalingTable({ rows, accent }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
      }}
    >
      {rows.map((row, idx) => (
        <div
          key={`${row.label}-${idx}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '8px 12px',
            background: 'rgba(20, 12, 8, 0.45)',
            border: '1px solid var(--border-faint)',
            borderRadius: 6,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{row.label}</span>
          <span className="display" style={{ fontSize: 15, color: accent }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// WeaponMasteryGrid — 3-col .pickable grid with mastery property chip
// ============================================================================
function WeaponMasteryGrid({ weapons, selected, onToggle, atMax }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        maxHeight: 360,
        overflowY: 'auto',
        paddingRight: 8,
      }}
    >
      {weapons.map((w) => {
        const isSelected = selected.includes(w.name);
        const disabled = !isSelected && atMax;
        return (
          <button
            key={w.id || w.name}
            type="button"
            onClick={() => !disabled && onToggle(w.name)}
            disabled={disabled}
            className={`pickable ${isSelected ? 'selected' : ''}`}
            style={{
              padding: '10px 12px',
              textAlign: 'left',
              color: 'inherit',
              opacity: disabled ? 0.4 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}
            >
              <Sword className="w-3 h-3" style={{ color: 'var(--gold-soft)' }} />
              <span className="display" style={{ fontSize: 14, color: 'var(--text)' }}>{w.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span className="chip chip-purple" style={{ fontSize: 9, padding: '1px 5px' }}>
                {w.mastery}
              </span>
              {w.damage?.dice && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {w.damage.dice} {w.damage.type?.toLowerCase()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// RequiredChoice — orange-flourish OrnateHeading + help line + picker
// container. Matches the prototype's RequiredChoice from step-features.jsx.
// ============================================================================
function RequiredChoice({ title, help, required, children }) {
  return (
    <div
      style={{
        padding: '18px 22px',
        marginTop: 22,
        background: 'linear-gradient(135deg, rgba(255, 83, 0, 0.10), rgba(255, 83, 0, 0.02))',
        border: `1px solid ${required ? 'var(--orange)' : 'rgba(255, 83, 0, 0.4)'}`,
        borderRadius: 8,
        boxShadow: required ? '0 0 16px rgba(255, 83, 0, 0.18)' : 'none',
      }}
    >
      <div className="ornate-heading" style={{ marginBottom: 8 }}>
        <span className="ornate-flourish" style={{ background: 'var(--orange)' }} />
        <h3 style={{ fontSize: 22, color: 'var(--orange-soft)' }}>{title}</h3>
        <span className="ornate-flourish" style={{ background: 'var(--orange)' }} />
      </div>
      {help && (
        <div
          className="italic-serif"
          style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            marginBottom: 14,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {help}{' '}
          {required && (
            <span className="label" style={{ color: 'var(--orange)', fontSize: 10 }}>
              · REQUIRED
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// SubclassFeatureScroll — prototype's FeatureScroll pattern (hex emblem
// + name + italic-serif description) for the chosen subclass's features.
// ============================================================================
function SubclassFeatureScroll({ features, color }) {
  const accent = color || ACCENT_FALLBACK;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {features.map((feature, idx) => (
        <div
          key={`${feature.level}-${feature.name}-${idx}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr',
            gap: 16,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              flexShrink: 0,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background: `linear-gradient(180deg, ${accent}40, ${accent}10)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${accent}66`,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="label" style={{ fontSize: 8, color: accent, marginBottom: 0 }}>
                LVL
              </div>
              <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1 }}>
                {feature.level}
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 2 }}>
            <div className="display" style={{ fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
              {feature.name}
            </div>
            <div
              className="italic-serif"
              style={{
                fontSize: 14.5,
                color: 'var(--text-dim)',
                lineHeight: 1.55,
                whiteSpace: 'pre-line',
              }}
            >
              {feature.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// UpcomingMilestones — right-rail panel showing next 5 features for the
// class, surfaced from the rules tables (subclass features after L3 +
// known progression milestones).
// ============================================================================
function UpcomingMilestones({ className, basics, level, chosenSubclass }) {
  const milestones = [];

  // Hardcoded universal milestones from PHB 2024
  const phbUniversal = [
    { level: 3, label: "Subclass unlocks" },
    { level: 4, label: "ASI / Feat" },
    { level: 5, label: "Higher-level features" },
    { level: 8, label: "ASI / Feat" },
    { level: 12, label: "ASI / Feat" },
    { level: 16, label: "ASI / Feat" },
    { level: 19, label: "Epic Boon" },
  ];

  for (const m of phbUniversal) {
    if (milestones.length >= 5) break;
    if (m.level > level) milestones.push(m);
  }

  // Subclass features at future levels
  if (chosenSubclass) {
    for (let lvl = level + 1; lvl <= 20 && milestones.length < 5; lvl++) {
      const feats = getSubclassFeaturesAtLevel(chosenSubclass, lvl) || [];
      for (const f of feats) {
        if (f.level === lvl) {
          milestones.push({ level: lvl, label: f.name });
          if (milestones.length >= 5) break;
        }
      }
    }
  }

  if (milestones.length === 0) return null;
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 12, color: 'var(--gold-soft)' }}>
        Coming up
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {milestones.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              fontSize: 13,
              paddingBottom: 6,
              borderBottom: '1px solid var(--border-faint)',
            }}
          >
            <span className="italic-serif" style={{ color: 'var(--text)' }}>{m.label}</span>
            <span className="chip chip-gold" style={{ fontSize: 10, padding: '1px 6px' }}>
              L{m.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
