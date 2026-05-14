// Step 5: Skills — pick proficiencies from the class skill list. Background skills are free.

function StepSkills({ data, update }) {
  const cls = CLASSES.find(c => c.id === data.class);
  const bg = BACKGROUNDS.find(b => b.id === data.background);

  if (!cls) {
    return (
      <div className="step-content">
        <StepHeader kicker="Step 5 of 8" title="Skills" />
        <div className="panel" style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>Pick a class first.</div>
      </div>
    );
  }

  const bgSkills = bg?.skills || [];
  const classSkillList = cls.skillList === 'ANY' ? SKILLS.map(s => s.name) : (cls.skillList || []);
  const expertise = (data.feature_choices?.expertise) || [];
  const picked = data.skills_picked || [];

  const togglePick = (skillName) => {
    if (bgSkills.includes(skillName)) return; // already free
    if (picked.includes(skillName)) {
      update({ skills_picked: picked.filter(s => s !== skillName) });
    } else if (picked.length < cls.skillChoices) {
      update({ skills_picked: [...picked, skillName] });
    }
  };

  const remaining = cls.skillChoices - picked.length;
  const allChosen = remaining === 0;
  const totalSkills = bgSkills.length + picked.length;

  return (
    <div className="step-content">
      <StepHeader
        kicker="Step 5 of 8"
        title="Pick your skills"
        subtitle="Proficiency means you add your proficiency bonus to rolls with that skill."
      />

      <Primer title="Two sources of skill proficiency">
        Your <strong style={{ color: 'var(--text)' }}>background</strong> gives you {bgSkills.length} free skills. Your <strong style={{ color: 'var(--text)' }}>class</strong> lets you pick {cls.skillChoices} more from its list. You can't pick the same skill twice — if your background already gave you a skill that's also on your class list, that's fine; just pick different ones from the class list.
      </Primer>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 14, marginTop: 18, marginBottom: 18 }}>
        <StatusCard
          label="Class picks"
          value={`${picked.length} / ${cls.skillChoices}`}
          color={allChosen ? 'teal' : 'orange'}
          icon={cls.icon}
        />
        <StatusCard
          label="Background skills"
          value={bgSkills.length || 0}
          color="teal"
          icon={bg?.icon || '🎒'}
          sub={bgSkills.join(', ') || 'No background picked'}
        />
        <StatusCard
          label="Total proficient"
          value={totalSkills}
          color="teal"
          icon="✓"
        />
      </div>

      <div className="panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>All 18 skills</h3>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            <span className="chip" style={{ fontSize: 10, padding: '2px 6px', marginRight: 6 }}>✓ Background</span>
            <span className="chip-orange chip" style={{ fontSize: 10, padding: '2px 6px', marginRight: 6 }}>✓ Class pick</span>
            <span className="chip" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', borderColor: 'var(--border)' }}>Locked</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {SKILLS.map(s => {
            const isBg = bgSkills.includes(s.name);
            const isClassPick = picked.includes(s.name);
            const isAvailable = classSkillList.includes(s.name);
            const isExpert = expertise.includes(s.name);
            const locked = !isBg && !isAvailable;
            return (
              <SkillRow
                key={s.name}
                skill={s}
                ability={s.ability}
                isBg={isBg}
                isClassPick={isClassPick}
                isAvailable={isAvailable}
                isExpert={isExpert}
                locked={locked}
                disabled={!isAvailable || isBg || (!isClassPick && allChosen)}
                onToggle={() => togglePick(s.name)}
              />
            );
          })}
        </div>
      </div>

      {cls.skillList !== 'ANY' && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12, fontStyle: 'italic' }}>
          Greyed-out skills aren't on your class's list. Pick a different class to unlock them.
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, value, color, icon, sub }) {
  const bgColor = color === 'orange' ? 'rgba(255, 83, 0, 0.08)' : 'rgba(55, 242, 209, 0.08)';
  const borderColor = color === 'orange' ? 'rgba(255, 83, 0, 0.3)' : 'rgba(55, 242, 209, 0.25)';
  const txt = color === 'orange' ? 'var(--orange-soft)' : 'var(--teal)';
  return (
    <div style={{ flex: 1, padding: 14, background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10 }}>
      <div className="label" style={{ color: txt, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{value}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.3 }}>{sub}</div>}
    </div>
  );
}

function SkillRow({ skill, ability, isBg, isClassPick, isAvailable, isExpert, locked, disabled, onToggle }) {
  const status = isBg ? 'bg' : isClassPick ? 'pick' : locked ? 'locked' : 'avail';
  const bgColor = status === 'bg' ? 'rgba(55, 242, 209, 0.12)'
    : status === 'pick' ? 'rgba(255, 83, 0, 0.12)'
    : status === 'avail' ? 'rgba(11,19,28,0.5)'
    : 'rgba(11,19,28,0.3)';
  const borderColor = status === 'bg' ? 'var(--teal)'
    : status === 'pick' ? 'var(--orange)'
    : 'var(--border)';

  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled && !isClassPick}
      style={{
        all: 'unset', cursor: disabled && !isClassPick ? 'not-allowed' : 'pointer',
        padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 8,
        opacity: locked ? 0.4 : 1, transition: 'all .12s',
      }}
      title={skill.desc}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          background: status === 'bg' || status === 'pick' ? (status === 'bg' ? 'var(--teal)' : 'var(--orange)') : 'var(--bg-3)',
          border: `1.5px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: status === 'bg' ? 'var(--bg-1)' : 'white',
        }}>{(status === 'bg' || status === 'pick') ? '✓' : ''}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{skill.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{ability.toUpperCase()}</div>
        </div>
      </div>
      {isExpert && <span className="chip-gold chip" style={{ fontSize: 9, padding: '2px 6px' }}>EXPERT</span>}
    </button>
  );
}

window.StepSkills = StepSkills;
