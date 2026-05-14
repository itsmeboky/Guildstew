// Step 6: Spells — pick cantrips and leveled spells from the class spell list.

const SPELL_LIMITS = {
  // [cantripsKnown, spellsKnownOrPrepared, slots]
  bard: { c: 2, s: 4, slots: 2, type: 'known' },
  cleric: { c: 3, s: 'wis-mod+lvl', slots: 2, type: 'prepared' },
  druid: { c: 2, s: 'wis-mod+lvl', slots: 2, type: 'prepared' },
  paladin: { c: 0, s: 0, slots: 0, type: 'prepared', note: 'No spells until level 2.' },
  ranger: { c: 0, s: 0, slots: 0, type: 'known', note: 'No spells until level 2.' },
  sorcerer: { c: 4, s: 2, slots: 2, type: 'known' },
  warlock: { c: 2, s: 2, slots: 1, type: 'known', label: 'Pact slots' },
  wizard: { c: 3, s: 6, slots: 2, type: 'spellbook', note: '6 spells in your spellbook. You prepare INT mod + level each day.' },
};

function StepSpells({ data, update }) {
  const cls = CLASSES.find(c => c.id === data.class);
  if (!cls || !cls.spellcaster) {
    return (
      <div className="step-content">
        <StepHeader kicker="Step 6 of 8" title="Spells" />
        <div className="panel" style={{ padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚔️</div>
          <div className="display" style={{ fontSize: 22, color: 'var(--text)', marginBottom: 6 }}>No spells for {cls?.name || 'this class'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {cls?.name || 'Your class'} doesn't cast spells. Skip ahead to equipment.
          </div>
        </div>
      </div>
    );
  }

  const limits = SPELL_LIMITS[cls.id] || { c: 2, s: 2, slots: 2, type: 'known' };
  const cantrips = data.spells?.cantrips || [];
  const leveled = data.spells?.level1 || [];

  // Filter available spells by class list
  const availableCantrips = SPELLS.cantrips.filter(s => s.classes.includes(cls.id));
  const availableL1 = SPELLS.level1.filter(s => s.classes.includes(cls.id));

  const toggleSpell = (level, name) => {
    const list = level === 'cantrips' ? cantrips : leveled;
    const max = level === 'cantrips' ? limits.c : (typeof limits.s === 'number' ? limits.s : 99);
    let next;
    if (list.includes(name)) next = list.filter(s => s !== name);
    else if (list.length < max) next = [...list, name];
    else return;
    update({ spells: { ...data.spells, [level === 'cantrips' ? 'cantrips' : 'level1']: next } });
  };

  const useRecommended = () => {
    const recCantrips = availableCantrips.slice(0, limits.c).map(s => s.name);
    const recL1 = availableL1.slice(0, typeof limits.s === 'number' ? limits.s : 4).map(s => s.name);
    update({ spells: { cantrips: recCantrips, level1: recL1 } });
  };

  return (
    <div className="step-content">
      <StepHeader
        kicker="Step 6 of 8"
        title="Choose your spells"
        subtitle={cls.spellcaster === 'pact' ? 'You cast through your patron — fewer slots, but they refresh every short rest.' : 'Cantrips cast at will. Leveled spells cost a slot each.'}
      />

      <Primer title={`How ${cls.name} spellcasting works`}>
        <strong style={{ color: 'var(--text)' }}>Cantrips</strong> are free magic — cast as often as you want. <strong style={{ color: 'var(--text)' }}>Leveled spells</strong> cost a spell slot to cast. You use <strong style={{ color: 'var(--orange-soft)' }}>{cls.spellAbility.toUpperCase()}</strong> for your spell attacks & save DC. {limits.note || ''}
      </Primer>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <CounterChip label="Cantrips" current={cantrips.length} max={limits.c} color="purple" />
          {typeof limits.s === 'number' && limits.s > 0 && (
            <CounterChip label={limits.type === 'spellbook' ? 'Spellbook' : 'Level 1 spells'} current={leveled.length} max={limits.s} color="orange" />
          )}
          <CounterChip label={limits.label || 'L1 slots'} current={limits.slots} max={limits.slots} color="teal" static />
        </div>
        <button className="btn btn-teal" onClick={useRecommended}>
          ✨ Use recommended
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <h3 className="display" style={{ fontSize: 24, color: 'var(--purple)' }}>Cantrips</h3>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{cantrips.length}/{limits.c} picked</span>
        </div>
        <SpellGrid spells={availableCantrips} picked={cantrips} onToggle={(n) => toggleSpell('cantrips', n)} maxReached={cantrips.length >= limits.c} cantrip />
      </div>

      {(typeof limits.s === 'number' ? limits.s > 0 : true) && availableL1.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <h3 className="display" style={{ fontSize: 24, color: 'var(--orange)' }}>Level 1 Spells</h3>
            {typeof limits.s === 'number' && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{leveled.length}/{limits.s} picked</span>}
          </div>
          <SpellGrid spells={availableL1} picked={leveled} onToggle={(n) => toggleSpell('l1', n)} maxReached={typeof limits.s === 'number' && leveled.length >= limits.s} />
        </div>
      )}
    </div>
  );
}

function CounterChip({ label, current, max, color, static: isStatic }) {
  const c = color === 'orange' ? 'var(--orange-soft)' : color === 'purple' ? 'var(--purple)' : 'var(--teal)';
  const bg = color === 'orange' ? 'rgba(255,83,0,0.1)' : color === 'purple' ? 'rgba(179,136,255,0.1)' : 'rgba(55,242,209,0.1)';
  return (
    <div style={{ padding: '10px 14px', background: bg, border: `1px solid ${c}40`, borderRadius: 10 }}>
      <div className="label" style={{ color: c, marginBottom: 2, fontSize: 10 }}>{label}</div>
      <div className="display" style={{ fontSize: 20, color: 'var(--text)' }}>
        {isStatic ? max : <>{current}<span style={{ color: 'var(--text-faint)', fontSize: 16 }}> / {max}</span></>}
      </div>
    </div>
  );
}

function SpellGrid({ spells, picked, onToggle, maxReached, cantrip }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {spells.map(s => {
        const isPicked = picked.includes(s.name);
        const disabled = !isPicked && maxReached;
        return (
          <button
            key={s.name}
            onClick={() => !disabled && onToggle(s.name)}
            className={`pickable ${isPicked ? 'selected' : ''}`}
            disabled={disabled}
            style={{ padding: 14, textAlign: 'left', color: 'inherit', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                background: isPicked ? (cantrip ? 'var(--purple)' : 'var(--orange)') : 'var(--bg-3)',
                border: `1.5px solid ${isPicked ? (cantrip ? 'var(--purple)' : 'var(--orange)') : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                color: 'white', fontSize: 12, fontWeight: 800,
              }}>{isPicked ? '✓' : ''}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span className="display" style={{ fontSize: 16, color: 'var(--text)' }}>{s.name}</span>
                  {s.concentration && <span className="chip-gold chip" style={{ fontSize: 9, padding: '1px 5px' }}>CONC</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>
                  {s.school} · {s.range}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

window.StepSpells = StepSpells;
