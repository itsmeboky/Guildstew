// Step 1: Identity — single tome-page layout. Name, race+subrace, background,
// alignment, portrait, profile pic. Replaces the nested-boxes feel with one
// continuous parchment with ornate dividers between sections.

function StepIdentity({ data, update }) {
  return (
    <div className="step-content">
      <StepHeader
        kicker="Chapter I · The Hero"
        title="Forge your hero"
        subtitle="Name, heritage, history — the soul of your character before they ever swing a sword."
      />

      <Primer title="New to D&D? Start here">
        Your character is the person you'll play. <strong>Race</strong> is the species you were born as — it sets your size, speed, and one or two special tricks. <strong>Background</strong> is what you did before adventuring — it gives you two skills and a unique perk. Don't overthink it — every combination tells a story.
      </Primer>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 28, marginTop: 32, alignItems: 'flex-start' }}>
        {/* LEFT — tome page with race, background, alignment in flowing sections */}
        <div className="tome" style={{ padding: '32px 36px' }}>
          <RaceSection data={data} update={update} />
          <FleurDivider />
          <BackgroundSection data={data} update={update} />
          <FleurDivider />
          <AlignmentSection data={data} update={update} />
        </div>

        {/* RIGHT — character codex */}
        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <IdentityCodex data={data} update={update} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RACE SECTION — single featured display, side rail of races below
// ============================================================================
function RaceSection({ data, update }) {
  const selected = RACES.find(r => r.id === data.race);
  const subraces = selected?.subraces || [];

  return (
    <div>
      <OrnateHeading>Race</OrnateHeading>

      {selected ? (
        <FeaturedRace
          race={selected}
          subrace={data.subrace}
          onPickSub={(id) => update({ subrace: id })}
        />
      ) : (
        <div className="primer" style={{ textAlign: 'center', padding: 28, fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text-dim)', fontSize: 16 }}>
          Choose a heritage from the line below to reveal their tale.
        </div>
      )}

      {/* Race rail — bigger icons, hover-reveal name, click to feature */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)',
        gap: 8, marginTop: 18,
      }}>
        {RACES.map(r => (
          <RaceMedallion
            key={r.id}
            race={r}
            active={data.race === r.id}
            onClick={() => update({ race: r.id, subrace: '' })}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturedRace({ race, subrace, onPickSub }) {
  const selectedSub = race.subraces.find(s => s.id === subrace);
  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 22 }}>
      {/* Iconic emblem */}
      <div style={{
        height: 90, width: 90,
        background: `radial-gradient(circle, rgba(212, 169, 81, 0.18) 0%, transparent 70%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 56, lineHeight: 1, position: 'relative',
        filter: 'drop-shadow(0 4px 12px rgba(255, 83, 0, 0.25))',
      }}>
        <span style={{ filter: 'sepia(0.15) saturate(1.2)' }}>{race.icon}</span>
      </div>

      <div>
        <div className="display" style={{ fontSize: 36, color: 'var(--orange-soft)', lineHeight: 1, marginBottom: 8, letterSpacing: 1 }}>
          {race.name}
        </div>
        <p className="italic-serif" style={{ fontSize: 16, color: 'var(--text-dim)', margin: 0, marginBottom: 14, lineHeight: 1.55 }}>
          {race.description}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <span className="chip-gold chip">Speed {race.speed} ft</span>
          <span className="chip-gold chip">Size {race.size}</span>
          {Object.entries(race.bonuses).map(([k, v]) => {
            if (k === 'choice') return null;
            if (k === 'all') return <span key={k} className="chip-orange chip">All +{v}</span>;
            return <span key={k} className="chip-orange chip">{k.toUpperCase()} +{v}</span>;
          })}
          {race.traits.map(t => <span key={t} className="chip chip-neutral">{t}</span>)}
        </div>

        {race.subraces.length > 1 && (
          <div>
            <div className="label" style={{ marginBottom: 8, color: 'var(--gold-soft)' }}>Choose a lineage</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {race.subraces.map(s => (
                <button
                  key={s.id}
                  onClick={() => onPickSub(s.id)}
                  className={`pickable ${subrace === s.id ? 'selected-teal' : ''}`}
                  style={{ padding: '12px 14px', textAlign: 'left', color: 'inherit' }}
                >
                  <div className="display" style={{ fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{s.name}</div>
                  <div className="italic-serif" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {race.subraces.length === 1 && (
          <AutoSelect onMount={() => onPickSub(race.subraces[0].id)} current={subrace} target={race.subraces[0].id} />
        )}
      </div>
    </div>
  );
}

function AutoSelect({ onMount, current, target }) {
  useEffect(() => { if (current !== target) onMount(); }, []);
  return null;
}

function RaceMedallion({ race, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={race.name}
      style={{
        all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6, padding: '8px 4px',
        borderRadius: 4, transition: 'all .15s',
        background: active ? 'rgba(255, 83, 0, 0.10)' : 'transparent',
        border: `1px solid ${active ? 'var(--orange)' : 'transparent'}`,
        boxShadow: active ? '0 0 16px var(--orange-glow)' : 'none',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(212, 169, 81, 0.06)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 44, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, lineHeight: 1,
        background: active
          ? 'radial-gradient(circle, rgba(255, 83, 0, 0.22) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(212, 169, 81, 0.08) 0%, transparent 70%)',
        filter: active ? 'none' : 'grayscale(0.4) opacity(0.85)',
      }}>{race.icon}</div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        color: active ? 'var(--orange-soft)' : 'var(--text-dim)',
        textAlign: 'center', lineHeight: 1.2,
      }}>{race.name}</div>
    </button>
  );
}

// ============================================================================
// BACKGROUND SECTION
// ============================================================================
function BackgroundSection({ data, update }) {
  const selected = BACKGROUNDS.find(b => b.id === data.background);
  return (
    <div>
      <OrnateHeading>Background</OrnateHeading>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {BACKGROUNDS.map(b => (
          <BackgroundChip
            key={b.id}
            bg={b}
            active={data.background === b.id}
            onClick={() => update({ background: b.id })}
          />
        ))}
      </div>

      {selected && (
        <div className="fade-in" style={{ padding: '16px 20px', background: 'rgba(20, 12, 8, 0.5)', borderRadius: 4, borderLeft: '3px solid var(--gold)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>{selected.icon}</span>
            <span className="display" style={{ fontSize: 22, color: 'var(--orange-soft)' }}>{selected.name}</span>
          </div>
          <p className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', margin: '8px 0 14px', lineHeight: 1.5 }}>
            {selected.desc}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 14, rowGap: 6, fontSize: 13, marginBottom: 10 }}>
            <span className="label-cream label" style={{ color: 'var(--gold-soft)' }}>Skills</span>
            <span style={{ color: 'var(--text)' }}>{selected.skills.join(' · ')}</span>
            {selected.tools && (<>
              <span className="label" style={{ color: 'var(--gold-soft)' }}>Tools</span>
              <span style={{ color: 'var(--text)' }}>{selected.tools.join(' · ')}</span>
            </>)}
            {selected.languages && (<>
              <span className="label" style={{ color: 'var(--gold-soft)' }}>Languages</span>
              <span style={{ color: 'var(--text)' }}>{selected.languages} of your choice</span>
            </>)}
            <span className="label" style={{ color: 'var(--gold-soft)' }}>Feature</span>
            <span style={{ color: 'var(--text)' }}>{selected.feature}</span>
          </div>
          <div className="italic-serif" style={{ fontSize: 13, color: 'var(--gold-soft)', marginTop: 8, opacity: 0.9 }}>
            ✦ {selected.tip}
          </div>
        </div>
      )}
    </div>
  );
}

function BackgroundChip({ bg, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`pickable ${active ? 'selected' : ''}`}
      style={{ padding: '12px 14px', textAlign: 'left', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>{bg.icon}</span>
        <span className="display" style={{ fontSize: 15, color: 'var(--text)' }}>{bg.name}</span>
      </div>
      <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.35 }}>
        {bg.skills.join(' & ')}
      </div>
    </button>
  );
}

// ============================================================================
// ALIGNMENT SECTION — 3x3 grid with elegant labels
// ============================================================================
function AlignmentSection({ data, update }) {
  const selected = ALIGNMENTS.find(a => a.id === data.alignment);
  return (
    <div>
      <OrnateHeading>Alignment</OrnateHeading>
      <div className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 14, textAlign: 'center' }}>
        Roleplay only — no mechanics depend on alignment.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxWidth: 540, margin: '0 auto' }}>
        {ALIGNMENTS.map(a => (
          <button
            key={a.id}
            onClick={() => update({ alignment: a.id })}
            className={`pickable ${data.alignment === a.id ? 'selected' : ''}`}
            style={{ padding: '12px 8px', textAlign: 'center', color: 'inherit' }}
          >
            <div className="display" style={{ fontSize: 13, color: data.alignment === a.id ? 'var(--orange-soft)' : 'var(--gold-soft)', marginBottom: 2 }}>{a.short}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: 0.2 }}>
              {a.name.split(' ')[0]}
              <br />
              {a.name.split(' ')[1] || '\u00a0'}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="italic-serif fade-in" style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, maxWidth: 540, margin: '16px auto 0' }}>
          <strong className="display" style={{ color: 'var(--orange-soft)', fontSize: 16, fontWeight: 'normal' }}>{selected.name}.</strong>{' '}
          {selected.desc} <span style={{ color: 'var(--text-faint)' }}>— {selected.example}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHARACTER CODEX — right column "card" with portrait + identity form
// ============================================================================
function IdentityCodex({ data, update }) {
  return (
    <div className="panel-strong" style={{ padding: 24, position: 'relative' }}>
      <div className="tome-corner tr"></div>
      <div className="tome-corner bl"></div>

      <div className="ornate-heading" style={{ marginBottom: 20 }}>
        <span className="ornate-flourish small"></span>
        <h3 style={{ fontSize: 22, color: 'var(--text)' }}>Codex</h3>
        <span className="ornate-flourish small"></span>
      </div>

      <div style={{ marginBottom: 18 }}>
        <PortraitUpload
          src={data.portrait}
          onChange={(v) => update({ portrait: v })}
          height={240}
          placeholder="Drop your character art"
        />
      </div>

      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <div className="label" style={{ marginBottom: 6 }}>Avatar</div>
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <PortraitUpload
              src={data.profile_avatar}
              onChange={(v) => update({ profile_avatar: v })}
              shape="circle"
              placeholder=" "
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 6 }}>Character Name <span style={{ color: 'var(--orange)' }}>*</span></div>
          <input
            className="input"
            value={data.name || ''}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Kael Stormwhisper"
            maxLength={40}
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, marginBottom: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Level</div>
          <Select
            value={data.level || 1}
            onChange={(v) => update({ level: Number(v) || 1 })}
            options={Array.from({ length: 20 }, (_, i) => ({ value: i + 1, label: `Level ${i + 1}` }))}
          />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Age</div>
          <input className="input" value={data.age || ''} onChange={(e) => update({ age: e.target.value })} placeholder="25" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Height</div>
          <input className="input" value={data.height || ''} onChange={(e) => update({ height: e.target.value })} placeholder="5'10&quot;" />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Weight</div>
          <input className="input" value={data.weight || ''} onChange={(e) => update({ weight: e.target.value })} placeholder="180 lbs" />
        </div>
      </div>

      <div>
        <div className="label" style={{ marginBottom: 6 }}>Biography <span style={{ color: 'var(--text-faint)', fontWeight: 600, letterSpacing: 0 }}>(optional)</span></div>
        <textarea
          className="input italic-serif"
          value={data.biography || ''}
          onChange={(e) => update({ biography: e.target.value })}
          placeholder="Their story so far..."
          rows={4}
          style={{ resize: 'vertical', minHeight: 90, fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.5, fontStyle: 'italic' }}
        />
      </div>
    </div>
  );
}

window.StepIdentity = StepIdentity;
