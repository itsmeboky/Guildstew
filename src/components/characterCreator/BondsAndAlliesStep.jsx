import { useRef, useState } from "react";
import { Heart, Shield, Swords, Skull, Users, GraduationCap, UserRound, BookOpen, Circle } from "lucide-react";
import CompanionPicker from "@/components/characterCreator/CompanionPicker";
import { bondsForClass } from "@/components/characterCreator/bondsSections";
import { CLASSES_DATA, CLASS_ACCENT } from "@/components/characterCreator/ClassStep";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading } from "@/components/characterCreator/chrome/Ornaments";
import { Select } from "@/components/characterCreator/chrome/forms/Select";

// ============================================================================
// Step: Bonds & Allies — sits after Skills, before Equipment (2014 only).
//
// Two halves:
//   1. GATED BONDS — the conditional cards relocated out of the Class step
//      (deity, patron readout, familiar picker, mount flag, druid circle,
//      Beast Master companion). Driven by bondsForClass(); persists each
//      card to characterData.allies[key].
//   2. OTHER RELATIONSHIPS — a universal free-create list available to
//      EVERY class (so the step is never empty). Persists to
//      characterData.relationships[].
//
// Both halves live in the merged `creator_data` jsonb blob (allies +
// relationships). The bar value is captured as INTENT only — it is not
// wired to the party-panel relationship edges yet (that's a later phase).
// ============================================================================

// Free-create relationship types — mirrors the party panel's RelationshipsTab
// vocabulary so the lore tab / party panel can render them consistently later.
export const RELATIONSHIP_TYPES = [
  { value: "ally", label: "Ally" },
  { value: "friend", label: "Friend" },
  { value: "rival", label: "Rival" },
  { value: "enemy", label: "Enemy" },
  { value: "romantic", label: "Romantic" },
  { value: "family", label: "Family" },
  { value: "mentor", label: "Mentor" },
  { value: "student", label: "Student" },
  { value: "contact", label: "Contact" },
  { value: "neutral", label: "Neutral" },
];

const newRelationshipId = () =>
  (globalThis.crypto?.randomUUID?.() ||
    `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

// Type → portrait ring + icon. `color` is the solid accent (ring + icon +
// glow); `ring` is the frame gradient (Romantic gets pink→red per the
// brief, the rest are a soft single-hue gradient off `color`). Reuses the
// creator's class-accent palette values where they fit (--gold for family).
export const TYPE_META = {
  romantic: { color: "#FF4DA6", ring: "linear-gradient(135deg, #FF4DA6, #FF5040)", Icon: Heart },
  ally:     { color: "#52D880", ring: "linear-gradient(135deg, #52D880, #2F9E5B)", Icon: Shield },
  friend:   { color: "#52D880", ring: "linear-gradient(135deg, #6FE39A, #3FB873)", Icon: Heart },
  rival:    { color: "var(--orange)", ring: "linear-gradient(135deg, #FF7A40, #FF5300)", Icon: Swords },
  enemy:    { color: "#FF5040", ring: "linear-gradient(135deg, #FF5040, #B5241B)", Icon: Skull },
  family:   { color: "var(--gold)", ring: "linear-gradient(135deg, #E8C56B, #B8862F)", Icon: Users },
  mentor:   { color: "#5AA0FF", ring: "linear-gradient(135deg, #7CB6FF, #3F7FE0)", Icon: GraduationCap },
  student:  { color: "#5AA0FF", ring: "linear-gradient(135deg, #8FC4FF, #5A8FD8)", Icon: BookOpen },
  contact:  { color: "#7B8AA0", ring: "linear-gradient(135deg, #94A2B8, #5E6B7E)", Icon: UserRound },
  neutral:  { color: "#7B8AA0", ring: "linear-gradient(135deg, #8A97AB, #5E6B7E)", Icon: Circle },
};
export const typeMeta = (t) => TYPE_META[t] || TYPE_META.neutral;

// Value-band fill color, shared by the affinity + trust bars. Cutoffs are
// tunable. gold (max) → green (positive) → orange (souring) → red (critical).
export function bandColor(value) {
  const n = Math.max(0, Math.min(100, Number(value) || 0));
  if (n >= 85) return "var(--gold)";
  if (n >= 50) return "#52D880";
  if (n >= 25) return "var(--orange)";
  return "#FF5040";
}

export default function BondsAndAlliesStep({ characterData, updateCharacterData, campaignId }) {
  // 2024 doesn't get this step — it's filtered out of the step list upstream
  // (CharacterCreator). This guard is purely defensive so the component is
  // never a broken/empty render if it's ever reached under 2024.
  if (characterData.gamePack === "dnd5e_2024") {
    return <ComingSoon2024 />;
  }

  // Resolve the picked class's data object so the gated cards can tint
  // themselves and the Warlock patron readout can show its blurb. Brewery
  // (modded) classes won't be in CLASSES_DATA — they fall back to a minimal
  // {name} object, which bondsForClass treats as "no SRD bonds" (the
  // universal relationships section below still renders).
  const cls =
    (CLASSES_DATA || []).find((c) => c.name === characterData.class) ||
    (characterData.class ? { name: characterData.class } : null);
  const accent = (cls && CLASS_ACCENT[cls.name]) || "var(--gold)";
  const sections = cls ? bondsForClass(cls, characterData) : [];

  return (
    <div>
      <StepHeader
        kicker="Chapter VII · The Fellowship"
        title="Bonds & Allies"
        subtitle="No hero walks alone. Detail the patrons, deities, companions, and the people who shape their story."
      />

      <Primer title="How bonds work">
        Some bonds come with your <strong>class</strong> — a warlock's patron, a
        cleric's deity, a familiar. Below those, <strong>everyone</strong> can add the
        allies, rivals, and enemies that matter to their hero. These are{" "}
        <strong>story</strong> details — they colour your character without changing the rules.
      </Primer>

      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 28 }}>
        {sections.length > 0 && (
          <GatedBonds
            sections={sections}
            cls={cls}
            accent={accent}
            data={characterData}
            update={updateCharacterData}
            campaignId={campaignId}
          />
        )}

        <OtherRelationships data={characterData} update={updateCharacterData} />
      </div>
    </div>
  );
}

function ComingSoon2024() {
  return (
    <div>
      <StepHeader
        kicker="Chapter · The Fellowship"
        title="Bonds & Allies"
        subtitle="This chapter is being tuned for the 2024 ruleset."
      />
      <div className="tome" style={{ padding: "40px 36px", textAlign: "center" }}>
        <p className="italic-serif" style={{ fontSize: 15, color: "var(--text-dim)", margin: 0, lineHeight: 1.55 }}>
          Bonds &amp; Allies arrives for the 2024 ruleset in a future update. Continue —
          nothing is required here.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// GATED BONDS — the conditional cards relocated from the Class step. Renders
// only the sections bondsForClass() says apply to this character.
// ============================================================================
function GatedBonds({ sections, cls, accent, data, update, campaignId }) {
  return (
    <div className="tome" style={{ padding: "32px 36px" }}>
      <OrnateHeading color={accent}>Bound by Class</OrnateHeading>
      <div
        className="italic-serif"
        style={{
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 15,
          maxWidth: 600,
          margin: "0 auto 22px",
        }}
      >
        The beings — divine, infernal, animal — that your calling ties you to.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {sections.map((section) => {
          if (section.type === "flavor") {
            return <AllyCard key={section.key} bond={section} accent={accent} data={data} update={update} />;
          }
          if (section.type === "patron") {
            return <PatronReadout key={section.key} accent={accent} subclass={data.subclass} cls={cls} />;
          }
          if (section.type === "mount-flag") {
            return <MountFlag key={section.key} accent={accent} />;
          }
          if (section.type === "companion-picker") {
            return (
              <CompanionPicker
                key={section.key}
                characterData={data}
                updateCharacterData={update}
                campaignId={campaignId}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// Read-only patron surface — the patron IS the Warlock subclass, chosen
// on the Class step's subclass picker; this just reflects it (no re-pick).
function PatronReadout({ accent, subclass, cls }) {
  const detail = (cls?.subclasses || []).find((s) => s.name === subclass) || null;
  return (
    <div
      style={{
        padding: 20,
        background: `linear-gradient(135deg, ${accent}0E, transparent 70%)`,
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
      }}
    >
      <div className="label" style={{ color: accent, marginBottom: 4 }}>The being you serve</div>
      <div className="display" style={{ fontSize: 22, color: "var(--text)" }}>
        {subclass || "Choose your patron on the Class step"}
      </div>
      {detail?.desc && (
        <div className="italic-serif" style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.5 }}>
          {detail.desc}
        </div>
      )}
    </div>
  );
}

// Informational mount note — Find Steed summons a celestial mount in
// play; it isn't a creation-time picker.
function MountFlag({ accent }) {
  return (
    <div
      style={{
        padding: 20,
        background: `linear-gradient(135deg, ${accent}0E, transparent 70%)`,
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
      }}
    >
      <div className="label" style={{ color: accent, marginBottom: 4 }}>Celestial Mount</div>
      <div className="italic-serif" style={{ fontSize: 14.5, color: "var(--text-dim)", lineHeight: 1.55 }}>
        Your <strong style={{ color: "var(--text)" }}>Find Steed</strong> spell lets you summon a celestial
        mount when you cast it in play — no need to pick one now.
      </div>
    </div>
  );
}

function AllyCard({ bond, accent, data, update }) {
  const allies = data.allies || {};
  const ally = allies[bond.key] || {};
  const setAlly = (patch) => {
    update({ allies: { ...allies, [bond.key]: { ...ally, ...patch } } });
  };

  const effectiveName = ally.name ?? bond.preset?.name ?? "";
  const effectiveDesc = ally.desc ?? bond.preset?.desc ?? "";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 20,
        padding: 20,
        background: `linear-gradient(135deg, ${accent}0E, transparent 70%)`,
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
      }}
    >
      <AllyPortrait src={ally.image} onChange={(img) => setAlly({ image: img })} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="label" style={{ color: accent, marginBottom: 4 }}>{bond.kicker}</div>
          <div className="display" style={{ fontSize: 22, color: "var(--text)" }}>{bond.label}</div>
        </div>

        {bond.presetOptions && bond.presetOptions.length > 0 && (
          <PresetPicker
            options={bond.presetOptions}
            current={ally.presetId}
            color={accent}
            onPick={(opt) =>
              setAlly({
                presetId: opt.id,
                name: ally.name?.trim() ? ally.name : opt.name,
                desc: ally.desc?.trim() ? ally.desc : opt.desc,
              })
            }
          />
        )}

        <div>
          <div className="label" style={{ marginBottom: 4, color: "var(--text-dim)" }}>Name</div>
          <input
            className="input"
            value={effectiveName}
            onChange={(e) => setAlly({ name: e.target.value })}
            placeholder={bond.placeholder}
            style={{ fontFamily: "var(--display)", fontSize: 18 }}
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 4, color: "var(--text-dim)" }}>Description</div>
          <textarea
            className="input italic-serif"
            value={effectiveDesc}
            onChange={(e) => setAlly({ desc: e.target.value })}
            placeholder={bond.descPlaceholder}
            rows={3}
            style={{
              resize: "vertical",
              minHeight: 70,
              // Cap the height so a long bond bio scrolls in-field.
              maxHeight: 140,
              overflowY: "auto",
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AllyPortrait({ src, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
      style={{
        width: "100%",
        height: 160,
        borderRadius: 8,
        background: src ? `url(${src}) center/cover` : "rgba(11,19,28,0.6)",
        border: `2px ${drag ? "solid" : "dashed"} ${drag || src ? "var(--orange)" : "var(--border-strong)"}`,
        cursor: "pointer",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color .15s, background .15s",
        overflow: "hidden",
      }}
    >
      {!src && (
        <div style={{ textAlign: "center", color: "var(--text-faint)", pointerEvents: "none", padding: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 6, opacity: 0.5 }}>⊕</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>Drop their likeness</div>
        </div>
      )}
      {src && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "rgba(0,0,0,0.72)",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "3px 7px",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Replace
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

function PresetPicker({ options, current, color, onPick }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6, color: "var(--text-dim)" }}>
        Pick a preset (you can edit)
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const active = current === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPick(opt)}
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: active ? color : "transparent",
                color: active ? "white" : "var(--text-dim)",
                border: `1px solid ${active ? color : "var(--border)"}`,
                transition: "all .15s",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// OTHER RELATIONSHIPS — universal free-create list (every class). Reuses the
// AllyCard portrait/name/bio vocabulary plus a type Select and a starting
// bar. Available to all so the step is never empty.
// ============================================================================
function OtherRelationships({ data, update }) {
  const relationships = Array.isArray(data.relationships) ? data.relationships : [];
  const accent = "var(--gold)";

  const setAll = (next) => update({ relationships: next });

  const addRelationship = () => {
    setAll([
      ...relationships,
      { id: newRelationshipId(), name: "", bio: "", image: "", type: "ally", affinity: 50, trust: 50 },
    ]);
  };

  const patchAt = (id, patch) =>
    setAll(relationships.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeAt = (id) => setAll(relationships.filter((r) => r.id !== id));

  return (
    <div className="tome" style={{ padding: "32px 36px" }}>
      <OrnateHeading color={accent}>Other Relationships</OrnateHeading>
      <div
        className="italic-serif"
        style={{
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: 15,
          maxWidth: 600,
          margin: "0 auto 22px",
        }}
      >
        The people who matter — a mentor, a rival, the sibling you left behind, the
        enemy who hunts you. Add as many or as few as you like.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {relationships.map((rel) => (
          <RelationshipCard
            key={rel.id}
            rel={rel}
            accent={accent}
            onChange={(patch) => patchAt(rel.id, patch)}
            onRemove={() => removeAt(rel.id)}
          />
        ))}

        {relationships.length === 0 && (
          <div
            className="italic-serif"
            style={{
              textAlign: "center",
              color: "var(--text-faint)",
              fontSize: 14,
              padding: "8px 0 4px",
            }}
          >
            No relationships yet — this is optional, but a single rival or ally can make
            your hero feel real.
          </div>
        )}

        <button
          type="button"
          onClick={addRelationship}
          className="btn"
          style={{
            alignSelf: "flex-start",
            marginTop: 4,
            border: `1px solid ${accent}55`,
            color: accent,
            background: `${accent}12`,
            padding: "8px 16px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Add a relationship
        </button>
      </div>
    </div>
  );
}

function RelationshipCard({ rel, accent, onChange, onRemove }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 20,
        padding: 20,
        background: `linear-gradient(135deg, ${accent}0E, transparent 70%)`,
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        position: "relative",
      }}
    >
      <TypeRingPortrait
        type={rel.type}
        src={rel.image}
        affinity={rel.affinity ?? 50}
        trust={rel.trust ?? 50}
        onChange={(img) => onChange({ image: img })}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div className="label" style={{ marginBottom: 4, color: "var(--text-dim)" }}>Name</div>
            <input
              className="input"
              value={rel.name || ""}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Captain Mara, Old Wytch, your estranged brother…"
              style={{ fontFamily: "var(--display)", fontSize: 18 }}
            />
          </div>
          <div style={{ width: 150, flexShrink: 0 }}>
            <Select
              label="Type"
              value={rel.type || "ally"}
              onChange={(v) => onChange({ type: v })}
              options={RELATIONSHIP_TYPES}
              placeholder="Type"
            />
          </div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 4, color: "var(--text-dim)" }}>How you know them</div>
          <textarea
            className="input italic-serif"
            value={rel.bio || ""}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="What's the history? Why do they matter to your hero?"
            rows={2}
            style={{
              resize: "vertical",
              minHeight: 56,
              // Cap the height so a long bio scrolls inside the field
              // instead of blowing the card open.
              maxHeight: 120,
              overflowY: "auto",
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Dual bars mirror the PC↔PC character_relationships fields
            (affinity + trust) so Phase 3 is a clean copy, not a translation.
            Each fill is colored by value band. */}
        <div style={{ display: "flex", gap: 16 }}>
          <ValueBar label="Affinity" value={rel.affinity ?? 50} onChange={(v) => onChange({ affinity: v })} />
          <ValueBar label="Trust" value={rel.trust ?? 50} onChange={(v) => onChange({ trust: v })} />
        </div>

        <button
          type="button"
          onClick={onRemove}
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            background: "rgba(0,0,0,0.45)",
            color: "var(--text-dim)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "3px 9px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// A starting-standing meter — same range + bar vocabulary the party panel's
// RelationshipsTab uses, restyled in the creator's idiom. The fill is colored
// by value band (bandColor). Captured as INTENT only; not wired to any live
// relationship edge yet (Phase 3 reads it when the character joins a campaign).
function ValueBar({ label, value, onChange }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const c = bandColor(pct);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span className="label" style={{ color: "var(--text-dim)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{pct}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pct}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: "100%", accentColor: c, cursor: "pointer" }}
      />
      <div
        aria-hidden
        style={{
          width: "100%",
          height: 6,
          marginTop: 6,
          borderRadius: 999,
          background: "rgba(20,12,8,0.6)",
          overflow: "hidden",
          border: "1px solid var(--border-faint)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${c}99, ${c})`,
            transition: "width .15s, background .15s",
          }}
        />
      </div>
    </div>
  );
}

// Portrait with a type-keyed ring + a small type icon — a styling layer over
// AllyPortrait, not a new portrait control. Flourish: the ring's vividness
// tracks the combined bar state — vivid + glowing when both bars are high,
// desaturating to grey when both are low — so the frame doubles as a
// glance-able health cue layered on the relationship type.
function TypeRingPortrait({ type, src, affinity, trust, onChange }) {
  const meta = typeMeta(type);
  const Icon = meta.Icon;
  const vibe = (Math.max(0, Math.min(100, Number(affinity) || 0)) +
    Math.max(0, Math.min(100, Number(trust) || 0))) / 200; // 0..1
  // Below ~0.35 the frame greys out; mid gets a soft glow; high gets a
  // strong glow. (Opacity is NOT set on the frame — that would also fade
  // the portrait child; the dimming is baked into the ring color instead.)
  const dim = vibe < 0.35;
  const ringBg = dim ? "linear-gradient(135deg, #5A6473, #3A4250)" : meta.ring;
  const glow =
    vibe > 0.7 ? `0 0 16px ${meta.color}66`
      : vibe > 0.35 ? `0 0 8px ${meta.color}33`
        : "none";
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          padding: 4,
          borderRadius: 12,
          background: ringBg,
          boxShadow: glow,
          transition: "box-shadow .2s, background .2s",
        }}
      >
        <div style={{ borderRadius: 9, overflow: "hidden" }}>
          <AllyPortrait src={src} onChange={onChange} />
        </div>
      </div>
      <div
        title={type}
        style={{
          position: "absolute",
          bottom: -8,
          left: -8,
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--page-bg-1, #0B131C)",
          border: `2px solid ${dim ? "#5A6473" : meta.color}`,
          color: dim ? "#8A97AB" : meta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          transition: "all .2s",
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={2.4} />
      </div>
    </div>
  );
}
