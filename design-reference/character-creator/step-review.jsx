// Step 8: Review — full character sheet preview before finalizing.

function StepReview({ data, onFinalize }) {
  const cls = CLASSES.find(c => c.id === data.class);
  const race = RACES.find(r => r.id === data.race);
  const subrace = race?.subraces.find(s => s.id === data.subrace);
  const bg = BACKGROUNDS.find(b => b.id === data.background);
  const align = ALIGNMENTS.find(a => a.id === data.alignment);
  const subcls = cls?.subclasses.find(s => s.id === data.subclass);
  const companion = cls?.companions?.find(c => c.id === data.companion);

  const attrs = data.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const level = data.level || 1;
  const profBonus = proficiencyBonus(level);
  const conMod = calcMod(attrs.con);
  const dexMod = calcMod(attrs.dex);
  const hp = cls ? cls.hitDie + conMod : 8;
  const ac = 10 + dexMod; // base; armor not modeled
  const speed = race?.speed || 30;
  const bgSkills = bg?.skills || [];
  const classSkills = data.skills_picked || [];
  const allSkills = [...new Set([...bgSkills, ...classSkills])];
  const cantrips = data.spells?.cantrips || [];
  const l1Spells = data.spells?.level1 || [];

  return (
    <div className="step-content">
      <StepHeader
        kicker="Step 8 of 8 — almost done"
        title="Review your hero"
        subtitle="One last look. Spot anything wrong? Hop back to any step from the top."
      />

      {/* Hero card */}
      <div className="panel-strong" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 0 }}>
          <div style={{
            width: 240, height: 280,
            background: data.portrait ? `url(${data.portrait}) center/cover` : 'linear-gradient(135deg, rgba(255,83,0,0.1), rgba(55,242,209,0.05))',
            position: 'relative',
          }}>
            {!data.portrait && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: 0.3 }}>
                {race?.icon || '🛡️'}
              </div>
            )}
            {data.profile_avatar && (
              <div style={{
                position: 'absolute', bottom: 12, right: 12,
                width: 60, height: 60, borderRadius: '50%',
                background: `url(${data.profile_avatar}) center/cover`,
                border: '3px solid var(--orange)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }} />
            )}
          </div>

          <div style={{ padding: 24 }}>
            <h2 className="display" style={{ fontSize: 42, color: 'var(--orange)', lineHeight: 1, marginBottom: 8 }}>{data.name || 'Unnamed Hero'}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <span className="chip-orange chip">Level {level}</span>
              {race && <span className="chip">{subrace?.name && `${subrace.name} `}{race.name}</span>}
              {cls && <span className="chip-purple chip">{cls.name}</span>}
              {subcls && <span className="chip-gold chip">{subcls.name}</span>}
              {bg && <span className="chip">{bg.name}</span>}
              {align && <span className="chip">{align.name}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <StatBox label="HP" value={hp} suffix="" tone="red" />
              <StatBox label="AC" value={ac} tone="blue" />
              <StatBox label="Speed" value={speed} suffix="ft" tone="green" />
              <StatBox label="Prof" value={`+${profBonus}`} tone="orange" />
            </div>

            {data.biography && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '14px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{data.biography}"
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Abilities */}
        <ReviewCard title="Ability Scores" icon="🎲">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ABILITIES.map(ab => {
              const val = attrs[ab.id] || 10;
              const mod = calcMod(val);
              return (
                <div key={ab.id} style={{ background: 'rgba(11,19,28,0.5)', padding: 10, borderRadius: 8, textAlign: 'center', borderTop: `2px solid ${ab.color}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: ab.color, letterSpacing: 1 }}>{ab.id.toUpperCase()}</div>
                  <div className="display" style={{ fontSize: 26, color: 'var(--text)', lineHeight: 1.1, margin: '2px 0' }}>{(mod >= 0 ? '+' : '') + mod}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{val}</div>
                </div>
              );
            })}
          </div>
        </ReviewCard>

        {/* Saves */}
        <ReviewCard title="Saving Throws" icon="🛡️">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {ABILITIES.map(ab => {
              const isProf = cls?.saves.some(s => s.toLowerCase().startsWith(ab.id));
              const mod = calcMod(attrs[ab.id] || 10) + (isProf ? profBonus : 0);
              return (
                <div key={ab.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(11,19,28,0.5)', borderRadius: 6, fontSize: 13 }}>
                  <span style={{ color: isProf ? 'var(--teal)' : 'var(--text-dim)' }}>
                    {isProf ? '●' : '○'} {ab.name}
                  </span>
                  <span className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>{(mod >= 0 ? '+' : '') + mod}</span>
                </div>
              );
            })}
          </div>
        </ReviewCard>

        {/* Skills */}
        <ReviewCard title={`Skills (${allSkills.length})`} icon="🎯">
          {allSkills.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>No skill proficiencies yet.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allSkills.map(s => {
                const skillData = SKILLS.find(sk => sk.name === s);
                const ability = skillData?.ability || 'str';
                const mod = calcMod(attrs[ability] || 10) + profBonus;
                const isBg = bgSkills.includes(s);
                return (
                  <span key={s} className="chip" style={{ background: isBg ? 'rgba(55,242,209,0.15)' : 'rgba(255,83,0,0.12)', color: isBg ? 'var(--teal)' : 'var(--orange-soft)', borderColor: isBg ? 'rgba(55,242,209,0.3)' : 'rgba(255,83,0,0.3)' }}>
                    {s} {(mod >= 0 ? '+' : '') + mod}
                  </span>
                );
              })}
            </div>
          )}
        </ReviewCard>

        {/* Features */}
        {cls && (
          <ReviewCard title={`${cls.name} Features`} icon={cls.icon}>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              {cls.features.filter(f => f.level <= level).map(f => (
                <li key={f.name}><strong style={{ color: 'var(--text)' }}>{f.name}</strong></li>
              ))}
              {data.feature_choices?.fightingStyle && (
                <li><strong style={{ color: 'var(--text)' }}>Fighting Style:</strong> {data.feature_choices.fightingStyle}</li>
              )}
              {data.feature_choices?.favoredEnemy && (
                <li><strong style={{ color: 'var(--text)' }}>Favored Enemy:</strong> {data.feature_choices.favoredEnemy}</li>
              )}
              {(data.feature_choices?.expertise || []).length > 0 && (
                <li><strong style={{ color: 'var(--text)' }}>Expertise:</strong> {data.feature_choices.expertise.join(', ')}</li>
              )}
            </ul>
          </ReviewCard>
        )}

        {/* Racial Traits */}
        {race && (
          <ReviewCard title="Racial Traits" icon={race.icon}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {race.traits.map(t => <span key={t} className="chip" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', borderColor: 'var(--border)' }}>{t}</span>)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              Languages: {race.languages.join(', ')}
            </div>
          </ReviewCard>
        )}

        {/* Spells */}
        {(cantrips.length > 0 || l1Spells.length > 0) && (
          <ReviewCard title="Spellbook" icon="📖">
            {cantrips.length > 0 && (
              <>
                <div className="label" style={{ marginBottom: 6, color: 'var(--purple)' }}>Cantrips</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {cantrips.map(c => <span key={c} className="chip-purple chip">{c}</span>)}
                </div>
              </>
            )}
            {l1Spells.length > 0 && (
              <>
                <div className="label" style={{ marginBottom: 6, color: 'var(--orange-soft)' }}>Level 1 Spells</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {l1Spells.map(c => <span key={c} className="chip-orange chip">{c}</span>)}
                </div>
              </>
            )}
          </ReviewCard>
        )}

        {/* Companion */}
        {companion && (
          <ReviewCard title="Companion" icon="🐾">
            <div className="display" style={{ fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>{companion.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--teal)', marginBottom: 6 }}>{companion.stats}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{companion.desc}</div>
          </ReviewCard>
        )}

        {/* Background feature */}
        {bg && (
          <ReviewCard title={`Background: ${bg.name}`} icon={bg.icon}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>{bg.desc}</div>
            <div style={{ padding: 10, background: 'rgba(11,19,28,0.5)', borderRadius: 8, fontSize: 12 }}>
              <strong style={{ color: 'var(--teal)' }}>{bg.feature.split(' — ')[0]}</strong>
              {bg.feature.includes(' — ') && <span style={{ color: 'var(--text-dim)' }}> — {bg.feature.split(' — ')[1]}</span>}
            </div>
          </ReviewCard>
        )}
      </div>

      <div style={{
        marginTop: 28, padding: 24, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(255,83,0,0.1), rgba(255,83,0,0.02))',
        border: '1.5px solid rgba(255, 83, 0, 0.3)',
        textAlign: 'center',
      }}>
        <h3 className="display" style={{ fontSize: 24, color: 'var(--orange)', marginBottom: 8 }}>Ready to play?</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>
          Finalizing locks in your build. You can edit later from your character library.
        </p>
        <button onClick={onFinalize} className="btn btn-primary" style={{ padding: '14px 36px', fontSize: 16 }}>
          ⚔️ Create {data.name || 'Hero'}
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, suffix, tone }) {
  const colors = { red: '#E74C3C', blue: '#3498DB', green: '#27AE60', orange: 'var(--orange)' };
  const c = colors[tone] || 'var(--text)';
  return (
    <div style={{ padding: '12px 8px', background: 'rgba(11,19,28,0.5)', borderRadius: 10, textAlign: 'center', borderTop: `2px solid ${c}` }}>
      <div className="label" style={{ color: c, marginBottom: 4 }}>{label}</div>
      <div className="display" style={{ fontSize: 28, color: 'var(--text)', lineHeight: 1 }}>
        {value}{suffix && <span style={{ fontSize: 14, color: 'var(--text-faint)', marginLeft: 2 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function ReviewCard({ title, icon, children }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h3 className="display" style={{ fontSize: 18, color: 'var(--text)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Make ABILITIES available here (it's also in step-abilities.jsx). Define a fallback.
const ABILITIES = window.ABILITIES || [
  { id: 'str', name: 'Strength', color: '#E74C3C' },
  { id: 'dex', name: 'Dexterity', color: '#27AE60' },
  { id: 'con', name: 'Constitution', color: '#E91E63' },
  { id: 'int', name: 'Intelligence', color: '#3498DB' },
  { id: 'wis', name: 'Wisdom', color: '#F1C40F' },
  { id: 'cha', name: 'Charisma', color: '#9B59B6' },
];
window.ABILITIES = ABILITIES;

window.StepReview = StepReview;
