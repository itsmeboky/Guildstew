// Step 6: Spells — tome-page spellbook with cantrip and leveled chapters.

const SPELL_LIMITS = {
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
        <StepHeader kicker="Chapter VI" title="The Arcane" />
        <div className="tome" style={{ padding: 50, textAlign: 'center', marginTop: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 16, filter: 'sepia(0.2)' }}>⚔️</div>
          <div className="display" style={{ fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>No spells for {cls?.name || 'this class'}</div>
          <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
            {cls?.name || 'Your class'} doesn't wield arcane power. Step forward to equipment.
          </div>
        </div>
      </div>
    );
  }

  const limits = SPELL_LIMITS[cls.id] || { c: 2, s: 2, slots: 2, type: 'known' };
  const cantrips = data.spells?.cantrips || [];
  const leveled = data.spells?.level1 || [];

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
        kicker="Chapter VI · The Arcane"
        title="Your spellbook"
        subtitle={cls.spellcaster === 'pact' ? 'Your patron gifts you magic — fewer slots, but they return on a short rest.' : 'Cantrips cast at will. Leveled spells cost a slot each.'}
      />

      <Primer title={`How ${cls.name} spellcasting works`}>
        <strong>Cantrips</strong> are free magic — cast as often as you want. <strong>Leveled spells</strong> cost a spell slot. You use <strong>{cls.spellAbility?.toUpperCase()}</strong> for spell attacks &amp; save DCs. {limits.note || ''}
      </Primer>

      {/* Counters strip */}
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <CounterChip label="Cantrips" current={cantrips.length} max={limits.c} color="purple" />
          {typeof limits.s === 'number' && limits.s > 0 && (
            <CounterChip label={limits.type === 'spellbook' ? 'Spellbook' : 'Level 1 spells'} current={leveled.length} max={limits.s} color="orange" />
          )}
          <CounterChip label={limits.label || 'L1 slots'} current={limits.slots} max={limits.slots} color="teal" static />
        </div>
        <button className="btn btn-gold" onClick={useRecommended}>
          ✦ Use recommended
        </button>
      </div>

      {/* Spellbook tome */}
      <div className="tome" style={{ padding: '32px 36px', marginTop: 22 }}>
        <OrnateHeading color="var(--purple)">Cantrips</OrnateHeading>
        <div className="italic-serif" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>
          {cantrips.length}/{limits.c} picked · cast unlimited times
        </div>
        <ScrollableSpellArea maxHeight={availableCantrips.length > 8 ? 440 : null}>
          <SpellGrid spells={availableCantrips} picked={cantrips} onToggle={(n) => toggleSpell('cantrips', n)} maxReached={cantrips.length >= limits.c} cantrip />
        </ScrollableSpellArea>

        {(typeof limits.s === 'number' ? limits.s > 0 : true) && availableL1.length > 0 && (
          <>
            <FleurDivider />
            <OrnateHeading color="var(--orange)">First-level Spells</OrnateHeading>
            <div className="italic-serif" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>
              {typeof limits.s === 'number' && `${leveled.length}/${limits.s} picked · each cast spends one slot`}
            </div>
            <ScrollableSpellArea maxHeight={availableL1.length > 8 ? 440 : null}>
              <SpellGrid spells={availableL1} picked={leveled} onToggle={(n) => toggleSpell('l1', n)} maxReached={typeof limits.s === 'number' && leveled.length >= limits.s} />
            </ScrollableSpellArea>
          </>
        )}
      </div>
    </div>
  );
}

function CounterChip({ label, current, max, color, static: isStatic }) {
  const c = color === 'orange' ? 'var(--orange-soft)' : color === 'purple' ? 'var(--purple)' : 'var(--teal)';
  const bg = color === 'orange' ? 'rgba(255,83,0,0.10)' : color === 'purple' ? 'rgba(201,163,255,0.10)' : 'rgba(55,242,209,0.10)';
  return (
    <div style={{ padding: '10px 16px', background: bg, border: `1px solid ${c}40`, borderRadius: 4 }}>
      <div className="label" style={{ color: c, marginBottom: 2, fontSize: 10 }}>{label}</div>
      <div className="display" style={{ fontSize: 22, color: 'var(--text)' }}>
        {isStatic ? max : <>{current}<span style={{ color: 'var(--text-faint)', fontSize: 17 }}> / {max}</span></>}
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
            className={`pickable ${isPicked ? (cantrip ? 'selected-gold' : 'selected') : ''}`}
            disabled={disabled}
            style={{ padding: 14, textAlign: 'left', color: 'inherit', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 22, height: 22, flexShrink: 0,
                background: isPicked ? (cantrip ? 'var(--gold)' : 'var(--orange)') : 'transparent',
                border: `1.5px solid ${isPicked ? (cantrip ? 'var(--gold)' : 'var(--orange)') : 'var(--border-strong)'}`,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
              }}>
                {isPicked && <span style={{ color: cantrip ? 'var(--ink)' : 'white', fontSize: 10, fontWeight: 800 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span className="display" style={{ fontSize: 17, color: 'var(--text)' }}>{s.name}</span>
                  {s.concentration && <span className="chip chip-burgundy" style={{ fontSize: 9, padding: '1px 5px' }}>CONC</span>}
                </div>
                <div className="italic-serif" style={{ fontSize: 12, color: 'var(--gold-soft)', marginBottom: 6 }}>
                  {s.school} · {s.range}
                </div>
                <div className="italic-serif" style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.45 }}>{s.desc}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ScrollableSpellArea({ children, maxHeight }) {
  if (!maxHeight) return <>{children}</>;
  return (
    <div style={{
      maxHeight,
      overflowY: 'auto',
      paddingRight: 10,
      marginRight: -10,
      maskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
    }}>
      {children}
    </div>
  );
}

window.StepSpells = StepSpells;
