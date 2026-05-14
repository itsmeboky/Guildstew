// Step 4: Features — single tome page with feature scroll, required choices highlighted.

const FIGHTING_STYLES = [
  { id: 'archery', name: 'Archery', desc: '+2 to ranged weapon attack rolls.' },
  { id: 'defense', name: 'Defense', desc: '+1 AC while wearing armor.' },
  { id: 'dueling', name: 'Dueling', desc: '+2 damage with a one-handed weapon when no other weapon in hand.' },
  { id: 'great-weapon', name: 'Great Weapon Fighting', desc: 'Reroll 1s & 2s on two-handed weapons.' },
  { id: 'protection', name: 'Protection', desc: 'Reaction: impose disadvantage on attack vs ally within 5ft (need shield).' },
  { id: 'two-weapon', name: 'Two-Weapon Fighting', desc: 'Add ability mod to off-hand attack damage.' },
];

function StepFeatures({ data, update }) {
  const cls = CLASSES.find(c => c.id === data.class);
  if (!cls) return <EmptyFeatures />;

  const level = data.level || 1;
  const features = cls.features.filter(f => f.level <= level);
  const choices = data.feature_choices || {};
  const setChoice = (key, val) => update({ feature_choices: { ...choices, [key]: val } });

  return (
    <div className="step-content">
      <StepHeader
        kicker="Chapter IV · The Gifts"
        title="Class features"
        subtitle="Special abilities your training has earned. Some automatic — some need your choice."
      />

      <Primer title="What this chapter is for">
        Most class features are <strong>automatic</strong> — they appear on your sheet without input. A handful (like a fighter's combat style) need a decision. We've called those out below. Everything else is here so you know what your hero can already do.
      </Primer>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 28, marginTop: 28, alignItems: 'flex-start' }}>
        <div className="tome" style={{ padding: '32px 36px' }}>
          <FeatureScroll cls={cls} features={features} level={level} color={cls.color} />

          {cls.id === 'fighter' && level >= 1 && (
            <>
              <FleurDivider />
              <RequiredChoice title="Choose your Fighting Style" help="A combat specialty you focus on." required>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {FIGHTING_STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setChoice('fightingStyle', s.id)}
                      className={`pickable ${choices.fightingStyle === s.id ? 'selected' : ''}`}
                      style={{ padding: 14, textAlign: 'left', color: 'inherit' }}
                    >
                      <div className="display" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{s.name}</div>
                      <div className="italic-serif" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </RequiredChoice>
            </>
          )}

          {cls.id === 'ranger' && level >= 1 && (
            <>
              <FleurDivider />
              <RequiredChoice title="Favored Enemy" help="A creature type you've hunted. Advantage to track and remember lore about them." required>
                <Select
                  value={choices.favoredEnemy}
                  onChange={(v) => setChoice('favoredEnemy', v)}
                  options={['Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons', 'Elementals', 'Fey', 'Fiends', 'Giants', 'Monstrosities', 'Oozes', 'Plants', 'Undead', 'Two humanoid races']}
                  placeholder="Choose enemy type…"
                />
              </RequiredChoice>
            </>
          )}

          {cls.id === 'rogue' && level >= 1 && (
            <>
              <FleurDivider />
              <RequiredChoice title="Expertise" help="Pick 2 skills (or thieves' tools) — proficiency bonus is doubled." required>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[...cls.skillList, 'Thieves\' tools'].map(s => {
                    const picked = (choices.expertise || []).includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          const cur = choices.expertise || [];
                          if (picked) setChoice('expertise', cur.filter(x => x !== s));
                          else if (cur.length < 2) setChoice('expertise', [...cur, s]);
                        }}
                        className={`pickable ${picked ? 'selected-gold' : ''}`}
                        style={{ padding: '9px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'inherit' }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <div className="italic-serif" style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 10 }}>
                  {(choices.expertise || []).length}/2 picked.
                </div>
              </RequiredChoice>
            </>
          )}
        </div>

        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CharacterSummary data={data} />
          <UpcomingFeatures cls={cls} level={level} />
        </div>
      </div>
    </div>
  );
}

function EmptyFeatures() {
  return (
    <div className="step-content">
      <StepHeader kicker="Chapter IV" title="Class features" />
      <div className="tome" style={{ padding: 40, textAlign: 'center', marginTop: 20 }}>
        <div className="italic-serif" style={{ fontSize: 16, color: 'var(--text-dim)' }}>Pick a class first to reveal your features.</div>
      </div>
    </div>
  );
}

function FeatureScroll({ cls, features, level, color }) {
  return (
    <div>
      <OrnateHeading color={color}>{cls.name} · Level {level}</OrnateHeading>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '52px 1fr',
            gap: 16, alignItems: 'flex-start',
          }}>
            {/* Level emblem on left */}
            <div style={{
              width: 52, height: 52, flexShrink: 0,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              background: `linear-gradient(180deg, ${color}40, ${color}10)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${color}66`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="label" style={{ fontSize: 8, color: color, marginBottom: 0 }}>LVL</div>
                <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1 }}>{f.level}</div>
              </div>
            </div>

            <div style={{ paddingTop: 2 }}>
              <div className="display" style={{ fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>{f.name}</div>
              <div className="italic-serif" style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.55 }}>
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequiredChoice({ title, help, required, children }) {
  return (
    <div>
      <div className="ornate-heading" style={{ marginBottom: 8 }}>
        <span className="ornate-flourish" style={{ background: 'var(--orange)' }}></span>
        <h3 style={{ fontSize: 22, color: 'var(--orange-soft)' }}>{title}</h3>
        <span className="ornate-flourish" style={{ background: 'var(--orange)' }}></span>
      </div>
      <div className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 16, textAlign: 'center' }}>
        {help} {required && <span className="label" style={{ color: 'var(--orange)', fontSize: 10 }}>· REQUIRED</span>}
      </div>
      {children}
    </div>
  );
}

function UpcomingFeatures({ cls, level }) {
  const upcoming = [
    { lvl: cls.subclassLevel, name: cls.subclassName },
    { lvl: 4, name: 'Ability Score Improvement' },
    { lvl: 5, name: cls.spellcaster ? 'Higher-level spells' : 'Extra Attack' },
    { lvl: 8, name: 'Ability Score Improvement' },
  ].filter(u => u.lvl > level).slice(0, 4);
  if (upcoming.length === 0) return null;
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="label" style={{ marginBottom: 12 }}>Coming up</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {upcoming.map((u, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, paddingBottom: 6, borderBottom: '1px solid var(--border-faint)' }}>
            <span className="italic-serif" style={{ color: 'var(--text)' }}>{u.name}</span>
            <span className="chip-gold chip" style={{ fontSize: 10, padding: '1px 6px' }}>L{u.lvl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.StepFeatures = StepFeatures;
