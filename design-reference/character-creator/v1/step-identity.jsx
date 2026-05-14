// Step 1: Identity — name, race, subrace, background, alignment, portraits, bio.
// Combines what was previously split across the old step 1 (race) and step 2 (class
// step had portrait uploads + alignment + physical details).

function StepIdentity({ data, update }) {
  const race = RACES.find(r => r.id === data.race);
  const bg = BACKGROUNDS.find(b => b.id === data.background);

  return (
    <div className="step-content">
      <StepHeader
        kicker="Step 1 of 8"
        title="Who is your hero?"
        subtitle="Start with the soul of your character: their name, heritage, history, and likeness."
      />

      <Primer title="New to D&D? Start here">
        Your character is the person you'll play. <strong style={{ color: 'var(--text)' }}>Race</strong> is the species you were born as — it sets your size, speed, and one or two special tricks. <strong style={{ color: 'var(--text)' }}>Background</strong> is what you did before adventuring — it gives you two skills and a unique perk. Don't overthink it — you can build a great character from any combination.
      </Primer>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 24 }}>
        {/* LEFT: pickers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <RacePicker
            value={data.race}
            subrace={data.subrace}
            onPick={(race) => update({ race, subrace: '' })}
            onPickSub={(subrace) => update({ subrace })}
          />

          <BackgroundPicker
            value={data.background}
            onPick={(background) => update({ background })}
          />

          <AlignmentPicker
            value={data.alignment}
            onPick={(alignment) => update({ alignment })}
          />
        </div>

        {/* RIGHT: identity form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <IdentityForm data={data} update={update} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RACE PICKER
// ============================================================================
function RacePicker({ value, subrace, onPick, onPickSub }) {
  const selected = RACES.find(r => r.id === value);
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>Pick a race</h3>
        <HelpTip>Your character's species. Affects size, speed, languages, and gives you a couple of unique abilities.</HelpTip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {RACES.map(r => (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            className={`pickable ${value === r.id ? 'selected' : ''}`}
            style={{ padding: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, color: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{r.icon}</span>
              <span className="display" style={{ fontSize: 17, color: 'var(--text)' }}>{r.name}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{r.blurb}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fade-in" style={{ marginTop: 18, padding: 16, background: 'rgba(11,19,28,0.5)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 24 }}>{selected.icon}</span>
            <h4 className="display" style={{ fontSize: 22, color: 'var(--teal)' }}>{selected.name}</h4>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>{selected.description}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <span className="chip">Speed: {selected.speed}ft</span>
            <span className="chip">Size: {selected.size}</span>
            {Object.entries(selected.bonuses).map(([k, v]) => k !== 'choice' && k !== 'all' ? (
              <span key={k} className="chip-orange chip">{k.toUpperCase()} +{v}</span>
            ) : k === 'all' ? <span key={k} className="chip chip-orange">All +{v}</span> : null)}
            {selected.traits.map(t => <span key={t} className="chip" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', borderColor: 'var(--border)' }}>{t}</span>)}
          </div>

          {selected.subraces && selected.subraces.length > 1 && (
            <div>
              <SectionLabel required help="Subraces are variants — they add more bonuses on top of the base race.">Choose a subrace</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {selected.subraces.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onPickSub(s.id)}
                    className={`pickable ${subrace === s.id ? 'selected-teal' : ''}`}
                    style={{ padding: 12, textAlign: 'left', color: 'inherit' }}
                  >
                    <div className="display" style={{ fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selected.subraces && selected.subraces.length === 1 && (
            // Auto-select for races with only one variant
            <AutoSelect onMount={() => onPickSub(selected.subraces[0].id)} current={subrace} target={selected.subraces[0].id} />
          )}
        </div>
      )}
    </div>
  );
}

function AutoSelect({ onMount, current, target }) {
  useEffect(() => { if (current !== target) onMount(); }, []);
  return null;
}

// ============================================================================
// BACKGROUND PICKER
// ============================================================================
function BackgroundPicker({ value, onPick }) {
  const selected = BACKGROUNDS.find(b => b.id === value);
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>Pick a background</h3>
        <HelpTip>What your character did before adventuring. Gives you 2 free skills and a unique feature.</HelpTip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {BACKGROUNDS.map(b => (
          <button
            key={b.id}
            onClick={() => onPick(b.id)}
            className={`pickable ${value === b.id ? 'selected' : ''}`}
            style={{ padding: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, color: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{b.icon}</span>
              <span className="display" style={{ fontSize: 16, color: 'var(--text)' }}>{b.name}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{b.desc}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {b.skills.map(s => <span key={s} className="chip" style={{ fontSize: 10, padding: '3px 7px' }}>{s}</span>)}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fade-in" style={{ marginTop: 18, padding: 14, background: 'rgba(255, 83, 0, 0.06)', borderRadius: 10, border: '1px solid rgba(255, 83, 0, 0.2)' }}>
          <div className="label" style={{ color: 'var(--orange-soft)', marginBottom: 8 }}>{selected.name} grants you</div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
            <strong>Skill proficiencies:</strong> {selected.skills.join(', ')}
          </div>
          {selected.tools && <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}><strong>Tools:</strong> {selected.tools.join(', ')}</div>}
          {selected.languages && <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}><strong>Languages:</strong> {selected.languages} of your choice</div>}
          <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}><strong>Feature:</strong> {selected.feature}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>💡 {selected.tip}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ALIGNMENT PICKER
// ============================================================================
function AlignmentPicker({ value, onPick }) {
  const selected = ALIGNMENTS.find(a => a.id === value);
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>Pick an alignment</h3>
        <HelpTip>How your character approaches morality and law. Affects roleplay, not mechanics — pick what fits your story.</HelpTip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {ALIGNMENTS.map(a => (
          <button
            key={a.id}
            onClick={() => onPick(a.id)}
            className={`pickable ${value === a.id ? 'selected' : ''}`}
            style={{ padding: '10px 12px', textAlign: 'center', color: 'inherit' }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: value === a.id ? 'var(--orange-soft)' : 'var(--text-faint)' }}>{a.short}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{a.name.replace(/ /, ' ')}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fade-in" style={{ marginTop: 12, padding: 12, background: 'rgba(11,19,28,0.5)', borderRadius: 8, fontSize: 13, color: 'var(--text-dim)' }}>
          <strong style={{ color: 'var(--text)' }}>{selected.name}:</strong> {selected.desc} <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>— {selected.example}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// IDENTITY FORM (right column)
// ============================================================================
function IdentityForm({ data, update }) {
  return (
    <>
      <div className="panel" style={{ padding: 20 }}>
        <SectionLabel required>The basics</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label="Character Name"
            value={data.name}
            onChange={(v) => update({ name: v })}
            placeholder="e.g. Kael Stormwhisper"
            maxLength={40}
          />
          <Select
            label="Starting Level"
            value={data.level}
            onChange={(v) => update({ level: Number(v) || 1 })}
            options={[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n => ({ value: n, label: `Level ${n}` }))}
          />
        </div>
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="label">Character Portrait</div>
          <HelpTip>The big art piece — shown on your character sheet. Square or portrait orientation works best.</HelpTip>
        </div>
        <PortraitUpload
          src={data.portrait}
          onChange={(v) => update({ portrait: v })}
          height={260}
          placeholder="Drop your character art"
        />
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="label">Profile Picture</div>
          <HelpTip>Small circular avatar — shown next to your name in initiative, chat, and the party panel.</HelpTip>
        </div>
        <PortraitUpload
          src={data.profile_avatar}
          onChange={(v) => update({ profile_avatar: v })}
          shape="circle"
          placeholder="Headshot"
        />
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <SectionLabel optional>Physical & story</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          <TextInput label="Age" value={data.age} onChange={(v) => update({ age: v })} placeholder="25" />
          <TextInput label="Height" value={data.height} onChange={(v) => update({ height: v })} placeholder="5'10" />
          <TextInput label="Weight" value={data.weight} onChange={(v) => update({ weight: v })} placeholder="180 lbs" />
        </div>
        <div className="label" style={{ marginBottom: 6 }}>Biography</div>
        <textarea
          className="input"
          value={data.biography || ''}
          onChange={(e) => update({ biography: e.target.value })}
          placeholder="Where they came from, why they adventure, who they've left behind..."
          rows={5}
          style={{ resize: 'vertical', minHeight: 90, fontFamily: 'var(--body)' }}
        />
      </div>
    </>
  );
}

window.StepIdentity = StepIdentity;
