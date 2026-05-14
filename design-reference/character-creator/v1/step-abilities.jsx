// Step 3: Abilities — six core stats with four assignment methods and live modifier display.

const ABILITIES = [
  { id: 'str', name: 'Strength', icon: '💪', desc: 'Melee attacks, athletics, carrying.', color: '#E74C3C' },
  { id: 'dex', name: 'Dexterity', icon: '🏃', desc: 'Ranged attacks, stealth, AC, initiative.', color: '#27AE60' },
  { id: 'con', name: 'Constitution', icon: '❤️', desc: 'Hit points, endurance, poison saves.', color: '#E91E63' },
  { id: 'int', name: 'Intelligence', icon: '📖', desc: 'Memory, magic theory, deduction.', color: '#3498DB' },
  { id: 'wis', name: 'Wisdom', icon: '👁️', desc: 'Perception, insight, willpower.', color: '#F1C40F' },
  { id: 'cha', name: 'Charisma', icon: '💬', desc: 'Persuasion, performance, social magic.', color: '#9B59B6' },
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

const CLASS_PRIORITY = {
  barbarian: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  bard: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
  cleric: ['wis', 'con', 'str', 'cha', 'dex', 'int'],
  druid: ['wis', 'con', 'dex', 'cha', 'str', 'int'],
  fighter: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  monk: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  paladin: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
  ranger: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  rogue: ['dex', 'con', 'cha', 'int', 'wis', 'str'],
  sorcerer: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  warlock: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  wizard: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
};

function StepAbilities({ data, update }) {
  const [method, setMethod] = useState(data.abilityMethod || 'standard');
  const cls = CLASSES.find(c => c.id === data.class);
  const race = RACES.find(r => r.id === data.race);
  const subrace = race?.subraces.find(s => s.id === data.subrace);

  // Base scores (before racial bonus)
  const base = data.baseAttributes || { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

  const setBase = (key, val) => {
    const newBase = { ...base, [key]: val };
    const newAttrs = applyRacialBonuses(newBase, data.race, data.subrace);
    update({ baseAttributes: newBase, attributes: newAttrs, abilityMethod: method });
  };

  const applyMethod = (newMethod) => {
    setMethod(newMethod);
    if (newMethod === 'standard') {
      // Auto-assign by class priority
      const priority = CLASS_PRIORITY[data.class] || ['str','dex','con','int','wis','cha'];
      const newBase = {};
      priority.forEach((ab, i) => { newBase[ab] = STANDARD_ARRAY[i]; });
      update({ baseAttributes: newBase, attributes: applyRacialBonuses(newBase, data.race, data.subrace), abilityMethod: 'standard' });
    } else {
      update({ abilityMethod: newMethod });
    }
  };

  const rollAll = () => {
    const priority = CLASS_PRIORITY[data.class] || ['str','dex','con','int','wis','cha'];
    const rolls = Array.from({ length: 6 }, () => {
      const dice = [0,0,0,0].map(() => Math.floor(Math.random() * 6) + 1).sort((a,b) => b-a);
      return dice[0] + dice[1] + dice[2];
    }).sort((a,b) => b-a);
    const newBase = {};
    priority.forEach((ab, i) => { newBase[ab] = rolls[i]; });
    update({ baseAttributes: newBase, attributes: applyRacialBonuses(newBase, data.race, data.subrace), abilityMethod: 'roll' });
    setMethod('roll');
  };

  return (
    <div className="step-content">
      <StepHeader
        kicker="Step 3 of 8"
        title="Set your ability scores"
        subtitle="The six numbers that define what your character is good at."
      />

      <AbilityPrimer />

      <MethodPicker method={method} setMethod={applyMethod} onRoll={rollAll} />

      {(race) && (
        <RacialBonusBanner race={race} subrace={subrace} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 18 }}>
        {ABILITIES.map(ab => (
          <AbilityCard
            key={ab.id}
            ab={ab}
            base={base[ab.id]}
            finalScore={(data.attributes || {})[ab.id] || 10}
            onChange={(v) => setBase(ab.id, v)}
            method={method}
            cls={cls}
            recommendedSlot={CLASS_PRIORITY[data.class]?.indexOf(ab.id)}
          />
        ))}
      </div>

      {method === 'point-buy' && <PointBuyTracker base={base} />}
      {method === 'standard' && <ArrayTracker base={base} />}
    </div>
  );
}

// ============================================================================
function AbilityPrimer() {
  return (
    <Primer title="What ability scores actually do">
      Each ability has a <strong style={{ color: 'var(--text)' }}>score</strong> (3–20) and a <strong style={{ color: 'var(--text)' }}>modifier</strong> (–4 to +5). The score is the number; the modifier is what you actually add to dice rolls. <strong style={{ color: 'var(--orange-soft)' }}>10–11 = +0</strong>, <strong style={{ color: 'var(--orange-soft)' }}>12–13 = +1</strong>, <strong style={{ color: 'var(--orange-soft)' }}>14–15 = +2</strong>, <strong style={{ color: 'var(--orange-soft)' }}>16–17 = +3</strong>, <strong style={{ color: 'var(--orange-soft)' }}>18–19 = +4</strong>, <strong style={{ color: 'var(--orange-soft)' }}>20 = +5</strong>.
    </Primer>
  );
}

function MethodPicker({ method, setMethod, onRoll }) {
  const methods = [
    { id: 'standard', label: 'Standard Array', desc: '15, 14, 13, 12, 10, 8 — auto-assigned by class.', icon: '⚙️' },
    { id: 'point-buy', label: 'Point Buy', desc: 'Spend 27 points (each 8–15). Most balanced.', icon: '🎯' },
    { id: 'roll', label: 'Roll 4d6', desc: 'Roll, drop lowest. Could be great. Could be tragic.', icon: '🎲' },
    { id: 'manual', label: 'Manual', desc: 'Type your own numbers (3–20). No rules enforced.', icon: '✏️' },
  ];
  return (
    <div className="panel" style={{ padding: 18, marginTop: 20 }}>
      <div className="label" style={{ marginBottom: 12 }}>How to assign scores</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {methods.map(m => (
          <button
            key={m.id}
            onClick={() => m.id === 'roll' ? onRoll() : setMethod(m.id)}
            className={`pickable ${method === m.id ? 'selected' : ''}`}
            style={{ padding: 12, textAlign: 'left', color: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function RacialBonusBanner({ race, subrace }) {
  const bonuses = [];
  Object.entries(race.bonuses || {}).forEach(([k, v]) => {
    if (k === 'all') ['str','dex','con','int','wis','cha'].forEach(a => bonuses.push([a, v]));
    else if (k !== 'choice') bonuses.push([k, v]);
  });
  if (subrace?.bonuses) Object.entries(subrace.bonuses).forEach(([k, v]) => bonuses.push([k, v]));

  if (bonuses.length === 0) return null;
  return (
    <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(55, 242, 209, 0.08)', border: '1px solid rgba(55, 242, 209, 0.25)', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{race.icon}</span>
        <div>
          <div className="label" style={{ color: 'var(--teal)', marginBottom: 2 }}>Racial bonuses from {subrace?.name ? subrace.name + ' ' : ''}{race.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {bonuses.map(([k, v], i) => (
              <span key={i} className="chip" style={{ fontSize: 12 }}>{k.toUpperCase()} +{v}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
function AbilityCard({ ab, base, finalScore, onChange, method, cls, recommendedSlot }) {
  const mod = calcMod(finalScore);
  const modStr = (mod >= 0 ? '+' : '') + mod;
  const racialBonus = finalScore - base;
  const isPrimary = cls && (cls.primary || '').toLowerCase().includes(ab.name.toLowerCase().slice(0, 3));
  const isRecommended = recommendedSlot != null && recommendedSlot <= 1;

  return (
    <div className="panel" style={{ padding: 18, position: 'relative', borderColor: isPrimary ? `${ab.color}80` : 'var(--border)', borderWidth: isPrimary ? 2 : 1 }}>
      {isPrimary && (
        <div style={{ position: 'absolute', top: -10, right: 14, background: ab.color, color: 'white', fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: '3px 8px', borderRadius: 999 }}>PRIMARY</div>
      )}
      {!isPrimary && isRecommended && (
        <div style={{ position: 'absolute', top: -10, right: 14, background: 'rgba(242, 179, 61, 0.9)', color: '#000', fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: '3px 8px', borderRadius: 999 }}>RECOMMENDED</div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18, color: ab.color }}>{ab.icon}</span>
        <span className="display" style={{ fontSize: 18, color: 'var(--text)' }}>{ab.name}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 14, lineHeight: 1.3 }}>{ab.desc}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <input
          type="number"
          className="input"
          value={base}
          onChange={(e) => onChange(Math.max(3, Math.min(method === 'manual' ? 20 : 15, Number(e.target.value) || 0)))}
          min={method === 'point-buy' ? 8 : 3}
          max={method === 'point-buy' ? 15 : 20}
          style={{ width: 64, textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '6px 4px' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Final score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="display" style={{ fontSize: 26, color: 'var(--text)' }}>{finalScore}</span>
            {racialBonus > 0 && <span className="chip" style={{ fontSize: 10, padding: '2px 6px' }}>+{racialBonus} racial</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Modifier</div>
          <div className="display" style={{ fontSize: 28, color: mod >= 0 ? 'var(--teal)' : 'var(--danger)' }}>{modStr}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
function PointBuyTracker({ base }) {
  const cost = (n) => n <= 13 ? n - 8 : (n - 13) * 2 + 5;
  const used = Object.values(base).reduce((sum, v) => sum + (v >= 8 ? cost(v) : 0), 0);
  const remaining = 27 - used;
  return (
    <div className="panel" style={{ padding: 16, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div className="label">Point Buy</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>8 = 0pt · 13 = 5pt · 14 = 7pt · 15 = 9pt</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="display" style={{ fontSize: 32, color: remaining < 0 ? 'var(--danger)' : remaining === 0 ? 'var(--teal)' : 'var(--orange)' }}>{remaining}</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: 1, textTransform: 'uppercase' }}>{remaining < 0 ? 'Over' : 'Remaining'} of 27</div>
      </div>
    </div>
  );
}

function ArrayTracker({ base }) {
  const used = Object.values(base).filter(v => STANDARD_ARRAY.includes(v));
  const counts = {};
  used.forEach(v => counts[v] = (counts[v] || 0) + 1);
  return (
    <div className="panel" style={{ padding: 16, marginTop: 18 }}>
      <div className="label" style={{ marginBottom: 10 }}>Standard Array — assign these to your abilities</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {STANDARD_ARRAY.map((n, i) => {
          const usedCount = Object.values(base).filter(v => v === n).length;
          const isUsed = usedCount > 0;
          return (
            <div key={i} style={{
              width: 48, height: 48, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 20, fontFamily: 'var(--display)',
              background: isUsed ? 'rgba(55, 242, 209, 0.15)' : 'var(--bg-3)',
              border: `2px solid ${isUsed ? 'var(--teal)' : 'var(--border)'}`,
              color: isUsed ? 'var(--teal)' : 'var(--text-dim)',
              opacity: isUsed ? 1 : 0.5,
            }}>{n}</div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
        Auto-assigned by class priority. Type a new value in any ability card to override.
      </div>
    </div>
  );
}

window.StepAbilities = StepAbilities;
