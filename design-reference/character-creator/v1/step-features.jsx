// Step 4: Features — class features unlocked at current level, plus any required choices.

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
        kicker="Step 4 of 8"
        title="Class features"
        subtitle="Special abilities you've earned. Some are automatic; a few need you to pick a flavor."
      />

      <Primer title="What this step is for">
        Every class gets features at every level. Most are <strong style={{ color: 'var(--text)' }}>automatic</strong> — they just appear on your sheet. A handful require a choice (like a fighter's combat style). We've called out the choices below; everything else is here so you know what your character can do.
      </Primer>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{cls.name} features <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>at level {level}</span></h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {features.map((f, i) => (
                <FeatureCard key={i} feature={f} color={cls.color} />
              ))}
            </div>
          </div>

          {/* Required choices */}
          {cls.id === 'fighter' && level >= 1 && (
            <ChoicePanel
              title="Choose your Fighting Style"
              help="A fighting specialty you focus on. Pick the one that fits your weapon and armor."
              required
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {FIGHTING_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setChoice('fightingStyle', s.id)}
                    className={`pickable ${choices.fightingStyle === s.id ? 'selected' : ''}`}
                    style={{ padding: 14, textAlign: 'left', color: 'inherit' }}
                  >
                    <div className="display" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </ChoicePanel>
          )}

          {cls.id === 'ranger' && level >= 1 && (
            <ChoicePanel
              title="Favored Enemy"
              help="A creature type you've studied. You have advantage to track them and remember information about them."
              required
            >
              <Select
                value={choices.favoredEnemy}
                onChange={(v) => setChoice('favoredEnemy', v)}
                options={['Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons', 'Elementals', 'Fey', 'Fiends', 'Giants', 'Monstrosities', 'Oozes', 'Plants', 'Undead', 'Two humanoid races']}
                placeholder="Choose enemy type…"
              />
            </ChoicePanel>
          )}

          {cls.id === 'rogue' && level >= 1 && (
            <ChoicePanel
              title="Expertise"
              help="Pick 2 skills (or thieves' tools) — your proficiency bonus is DOUBLED for them. Rogues are skill masters."
              required
            >
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
                      className={`pickable ${picked ? 'selected-teal' : ''}`}
                      style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'inherit' }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 10 }}>
                {(choices.expertise || []).length}/2 picked
              </div>
            </ChoicePanel>
          )}

          {cls.id === 'bard' && level >= 3 && (
            <ChoicePanel title="Expertise" help="Choose 2 skills you're proficient in — proficiency bonus is doubled." required>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Available at L3. You'll pick after the skills step.</div>
            </ChoicePanel>
          )}

          {cls.id === 'cleric' && (
            <DomainSpellsCallout cls={cls} subclass={data.subclass} />
          )}

          {cls.id === 'sorcerer' && (
            <SorcerousOriginCallout cls={cls} subclass={data.subclass} />
          )}

          {cls.id === 'warlock' && (
            <PatronFeaturesCallout cls={cls} patron={data.patron || data.subclass} />
          )}
        </div>

        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <CharacterSummary data={data} />
          <div style={{ height: 12 }} />
          <UpcomingFeatures cls={cls} level={level} />
        </div>
      </div>
    </div>
  );
}

function EmptyFeatures() {
  return (
    <div className="step-content">
      <StepHeader kicker="Step 4 of 8" title="Class features" />
      <div className="panel" style={{ padding: 30, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>Pick a class first to see features.</div>
      </div>
    </div>
  );
}

function FeatureCard({ feature, color }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: 'rgba(11,19,28,0.5)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${color || 'var(--teal)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="display" style={{ fontSize: 17, color: 'var(--text)' }}>{feature.name}</div>
        <span className="chip" style={{ fontSize: 10, padding: '2px 8px' }}>L{feature.level}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{feature.desc}</div>
    </div>
  );
}

function ChoicePanel({ title, help, required, children }) {
  return (
    <div className="panel" style={{ padding: 20, borderColor: 'rgba(255, 83, 0, 0.3)', boxShadow: '0 0 0 1px rgba(255, 83, 0, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 className="display" style={{ fontSize: 20, color: 'var(--orange-soft)' }}>{title}</h3>
        {required && <span style={{ color: 'var(--orange)', fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>REQUIRED</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>{help}</div>
      {children}
    </div>
  );
}

function DomainSpellsCallout({ cls, subclass }) {
  if (!subclass) return null;
  const sub = cls.subclasses.find(s => s.id === subclass);
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ color: 'var(--purple)', marginBottom: 8 }}>{sub.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{sub.desc}</div>
    </div>
  );
}
const SorcerousOriginCallout = DomainSpellsCallout;
const PatronFeaturesCallout = ({ cls, patron }) => {
  if (!patron) return null;
  const sub = cls.subclasses.find(s => s.id === patron);
  if (!sub) return null;
  return (
    <div className="panel" style={{ padding: 16, borderLeft: '3px solid var(--purple)' }}>
      <div className="label" style={{ color: 'var(--purple)', marginBottom: 8 }}>Patron: {sub.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>{sub.desc}</div>
      <div style={{ fontSize: 12, color: 'var(--gold)', fontStyle: 'italic' }}>⭐ {sub.best}</div>
    </div>
  );
};

function UpcomingFeatures({ cls, level }) {
  const upcoming = [
    { lvl: cls.subclassLevel, name: cls.subclassName },
    { lvl: 2, name: 'Class features' },
    { lvl: 4, name: 'Ability Score Improvement' },
    { lvl: 5, name: cls.spellcaster ? 'Better spells' : 'Extra Attack' },
    { lvl: 8, name: 'Ability Score Improvement' },
  ].filter(u => u.lvl > level).slice(0, 4);
  if (upcoming.length === 0) return null;
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 10 }}>Coming up</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.map((u, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-dim)' }}>{u.name}</span>
            <span style={{ color: 'var(--text-faint)' }}>L{u.lvl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.StepFeatures = StepFeatures;
