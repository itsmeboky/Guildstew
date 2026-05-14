// Step 2: Class & Path — class, subclass, patron (warlock), companion (warlock/ranger).
// The original creator put the familiar UI on step 2 before the subclass step, even
// though the *choice* of familiar only matters once Pact of the Chain is taken.
// New flow: class grid → subclass/patron in same step → companion only if class
// supports one. Everything class-related lives together.

function StepClass({ data, update }) {
  const cls = CLASSES.find(c => c.id === data.class);
  return (
    <div className="step-content">
      <StepHeader
        kicker="Step 2 of 8"
        title="Choose your class & path"
        subtitle="Class is what your character does. Path is the specialty within that class — your subclass, patron, or companion."
      />

      <Primer title="How to pick a class">
        Pick the <strong style={{ color: 'var(--text)' }}>fantasy</strong> first — the kind of hero you want to be. The mechanics will follow. Hover any class for a playstyle tip. <strong style={{ color: 'var(--text)' }}>Subclass</strong> is your specialty (often picked at level 3, but you can plan ahead now). Some classes — Warlock especially — have extra choices like a <strong style={{ color: 'var(--text)' }}>patron</strong> or <strong style={{ color: 'var(--text)' }}>familiar</strong> that we'll surface here too.
      </Primer>

      <div style={{ marginTop: 24 }}>
        <ClassGrid value={data.class} onPick={(id) => update({ class: id, subclass: '', patron: '', companion: '' })} />
      </div>

      {cls && (
        <div className="fade-in" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <ClassDetail cls={cls} />
            <SubclassPicker cls={cls} data={data} update={update} />
            {cls.hasCompanion && (
              <CompanionPicker cls={cls} data={data} update={update} />
            )}
          </div>
          <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
            <ClassStatBlock cls={cls} data={data} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CLASS GRID
// ============================================================================
function ClassGrid({ value, onPick }) {
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>Pick a class</h3>
        <HelpTip>What you do in adventures — fighter, wizard, healer, sneak. This is the biggest mechanical choice you'll make.</HelpTip>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {CLASSES.map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className={`pickable ${value === c.id ? 'selected' : ''}`}
            style={{ padding: 14, textAlign: 'left', color: 'inherit', position: 'relative' }}
            title={c.playstyle}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8, marginBottom: 8,
              background: `${c.color}22`, color: c.color, fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${c.color}44`,
            }}>{c.icon}</div>
            <div className="display" style={{ fontSize: 17, color: 'var(--text)', marginBottom: 2 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.35 }}>{c.blurb}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="chip" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', borderColor: 'var(--border)' }}>d{c.hitDie}</span>
              {c.spellcaster && <span className="chip-purple chip" style={{ fontSize: 10, padding: '2px 6px' }}>Caster</span>}
              {c.hasCompanion && <span className="chip-gold chip" style={{ fontSize: 10, padding: '2px 6px' }}>Companion</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CLASS DETAIL
// ============================================================================
function ClassDetail({ cls }) {
  return (
    <div className="panel" style={{ padding: 20, borderLeft: `3px solid ${cls.color}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cls.color}26`, color: cls.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{cls.icon}</div>
        <div>
          <h3 className="display" style={{ fontSize: 28, color: cls.color }}>{cls.name}</h3>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>Hit Die: d{cls.hitDie} · Primary: {cls.primary}</div>
        </div>
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>{cls.blurb}</p>

      <div className="primer" style={{ marginBottom: 14, borderColor: `${cls.color}40`, background: `linear-gradient(135deg, ${cls.color}14, transparent)` }}>
        <div className="primer-title" style={{ color: cls.color }}>💡 Playstyle</div>
        <div>{cls.playstyle}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13 }}>
        <DetailRow label="Saving throws" value={cls.saves.join(', ')} />
        <DetailRow label="Skill choices" value={`Choose ${cls.skillChoices}`} />
        <DetailRow label="Armor" value={(cls.armorProf.length ? cls.armorProf : ['None']).join(', ')} />
        <DetailRow label="Weapons" value={cls.weaponProf.join(', ')} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ padding: '8px 12px', background: 'rgba(11,19,28,0.5)', borderRadius: 8 }}>
      <div className="label" style={{ marginBottom: 4, fontSize: 10 }}>{label}</div>
      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13 }}>{value}</div>
    </div>
  );
}

// ============================================================================
// SUBCLASS PICKER (Patron for Warlock, Domain for Cleric, etc.)
// ============================================================================
function SubclassPicker({ cls, data, update }) {
  const selected = cls.subclasses.find(s => s.id === data.subclass);
  const availableNow = data.level >= cls.subclassLevel;
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>
          {cls.hasPatron ? 'Pick a Patron' : `Pick your ${cls.subclassName}`}
        </h3>
        <HelpTip>
          {cls.hasPatron
            ? 'Your patron is the otherworldly being that grants your power. They define your spells and your story.'
            : `Your subclass is a specialty path within your class. Most subclasses unlock at level ${cls.subclassLevel}, but it helps to plan now.`}
        </HelpTip>
      </div>

      <div style={{ fontSize: 12, color: availableNow ? 'var(--teal)' : 'var(--text-faint)', marginBottom: 14 }}>
        {availableNow
          ? `✓ Active at your current level (${data.level})`
          : `Picks unlock at level ${cls.subclassLevel}. You're level ${data.level} — choose anyway to lock in the build.`}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cls.subclasses.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 }}>
        {cls.subclasses.map(s => (
          <button
            key={s.id}
            onClick={() => update({ subclass: s.id, patron: cls.hasPatron ? s.id : data.patron })}
            className={`pickable ${data.subclass === s.id ? 'selected' : ''}`}
            style={{ padding: 14, textAlign: 'left', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div className="display" style={{ fontSize: 16, color: 'var(--text)' }}>{s.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.45, flex: 1 }}>{s.desc}</div>
            {s.best && (
              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6, fontStyle: 'italic' }}>
                ⭐ Best for: {s.best}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// COMPANION PICKER (Warlock w/ Pact of the Chain; Ranger Beast Master)
// ============================================================================
function CompanionPicker({ cls, data, update }) {
  // Description varies by class
  const isWarlock = cls.id === 'warlock';
  const intro = isWarlock
    ? 'If you take Pact of the Chain at level 3, your patron grants you a familiar from this list. Plan ahead — your familiar shapes your tactics.'
    : 'If you choose the Beast Master subclass, your ranger gains a loyal animal companion. Pick a beast that matches your playstyle.';
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>
          {isWarlock ? 'Pact of the Chain Familiar' : 'Animal Companion'}
        </h3>
        <HelpTip>{intro}</HelpTip>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>{intro}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
        {cls.companions.map(comp => (
          <button
            key={comp.id}
            onClick={() => update({ companion: comp.id })}
            className={`pickable ${data.companion === comp.id ? 'selected' : ''}`}
            style={{ padding: 14, textAlign: 'left', color: 'inherit' }}
          >
            <div className="display" style={{ fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>{comp.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--teal)', marginBottom: 6 }}>{comp.stats}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{comp.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12, fontStyle: 'italic' }}>
        Optional — skip if you'd rather decide at the table.
      </div>
    </div>
  );
}

// ============================================================================
// CLASS STAT BLOCK (right column sticky)
// ============================================================================
function ClassStatBlock({ cls, data }) {
  const subcls = cls.subclasses.find(s => s.id === data.subclass);
  const companion = cls.companions?.find(c => c.id === data.companion);
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="label" style={{ marginBottom: 14, color: cls.color }}>{cls.name} build</div>

      <SummaryRow label="Hit Die" value={`d${cls.hitDie}`} />
      <SummaryRow label="Saves" value={cls.saves.join(', ')} />
      <SummaryRow label="Primary" value={cls.primary} />
      <SummaryRow label="Caster" value={cls.spellcaster ? (cls.spellcaster === 'full' ? 'Full caster' : cls.spellcaster === 'pact' ? 'Pact magic' : 'Half caster') : 'Martial'} />
      {subcls && <SummaryRow label={cls.subclassName} value={subcls.name} />}
      {companion && <SummaryRow label="Companion" value={companion.name} />}

      <div className="primer" style={{ marginTop: 16 }}>
        <div className="primer-title">Starting features</div>
        <ul style={{ margin: '6px 0 0', padding: '0 0 0 18px', fontSize: 12, lineHeight: 1.5, color: 'var(--text-dim)' }}>
          {cls.features.filter(f => f.level <= data.level).map(f => (
            <li key={f.name}><strong style={{ color: 'var(--text)' }}>{f.name}</strong> — {f.desc}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Re-export SummaryRow defined in ui.jsx via window
function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-faint)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

window.StepClass = StepClass;
