// Step 3: Abilities — single tome layout with the six ability scores as crests.

const ABILITIES = [
  { id: 'str', name: 'Strength', icon: '💪', desc: 'Melee attacks, athletics, carrying capacity.', color: '#E74C3C' },
  { id: 'dex', name: 'Dexterity', icon: '🏃', desc: 'Ranged attacks, stealth, AC, initiative.', color: '#52C77E' },
  { id: 'con', name: 'Constitution', icon: '❤️', desc: 'Hit points, endurance, poison resistance.', color: '#E5688E' },
  { id: 'int', name: 'Intelligence', icon: '📖', desc: 'Memory, magical theory, deduction.', color: '#5DA8E8' },
  { id: 'wis', name: 'Wisdom', icon: '👁️', desc: 'Perception, insight, willpower.', color: '#E8C054' },
  { id: 'cha', name: 'Charisma', icon: '💬', desc: 'Persuasion, performance, social magic.', color: '#C9A3FF' },
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

  const base = data.baseAttributes || { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

  const setBase = (key, val) => {
    const newBase = { ...base, [key]: val };
    const newAttrs = applyRacialBonuses(newBase, data.race, data.subrace);
    update({ baseAttributes: newBase, attributes: newAttrs, abilityMethod: method });
  };

  const applyMethod = (newMethod) => {
    setMethod(newMethod);
    if (newMethod === 'standard') {
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
        kicker="Chapter III · The Gift of Talents"
        title="Forge your fate"
        subtitle="Six numbers that decide what your hero can do. Higher is better."
      />

      <AbilityPrimer />

      <div className="tome" style={{ padding: '32px 36px', marginTop: 28 }}>
        <MethodPicker method={method} setMethod={applyMethod} onRoll={rollAll} />

        {race && <RacialBonusBanner race={race} subrace={subrace} />}

        <FleurDivider />

        <OrnateHeading>The Six Crests</OrnateHeading>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {ABILITIES.map(ab => (
            <AbilityCrest
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
    </div>
  );
}

function AbilityPrimer() {
  return (
    <Primer title="What ability scores mean">
      Each ability has a <strong>score</strong> (3–20) and a <strong>modifier</strong> (–4 to +5). The score is the number; the modifier is what you add to dice. <strong>10–11 → +0 · 14–15 → +2 · 18–19 → +4 · 20 → +5</strong>.
    </Primer>
  );
}

function MethodPicker({ method, setMethod, onRoll }) {
  const methods = [
    { id: 'standard', label: 'Standard Array', desc: '15, 14, 13, 12, 10, 8 — auto-assigned by class.', icon: '⚖️' },
    { id: 'point-buy', label: 'Point Buy', desc: 'Spend 27 points (each 8–15). Balanced.', icon: '⚙️' },
    { id: 'roll', label: 'Roll 4d6', desc: 'Roll, drop the lowest. Lucky? Unlucky?', icon: '🎲' },
    { id: 'manual', label: 'Manual', desc: 'Type your own numbers, 3–20.', icon: '✒️' },
  ];
  return (
    <div style={{ marginBottom: 10 }}>
      <OrnateHeading>The Method</OrnateHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {methods.map(m => (
          <button
            key={m.id}
            onClick={() => m.id === 'roll' ? onRoll() : setMethod(m.id)}
            className={`pickable ${method === m.id ? 'selected' : ''}`}
            style={{ padding: 14, textAlign: 'center', color: 'inherit' }}
          >
            <div style={{ fontSize: 26, marginBottom: 6 }}>{m.icon}</div>
            <div className="display" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{m.label}</div>
            <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.4 }}>{m.desc}</div>
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
    <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(55, 242, 209, 0.06)', border: '1px solid rgba(55, 242, 209, 0.22)', borderLeft: '3px solid var(--teal)', borderRadius: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 28 }}>{race.icon}</span>
        <div>
          <div className="label" style={{ color: 'var(--teal)', marginBottom: 4 }}>Heritage of the {subrace?.name ? subrace.name + ' ' : ''}{race.name}</div>
          <div className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 6 }}>
            Your blood grants these bonuses automatically.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {bonuses.map(([k, v], i) => (
              <span key={i} className="chip-orange chip">{k.toUpperCase()} +{v}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AbilityCrest({ ab, base, finalScore, onChange, method, cls, recommendedSlot }) {
  const mod = calcMod(finalScore);
  const modStr = (mod >= 0 ? '+' : '') + mod;
  const racialBonus = finalScore - base;
  const isPrimary = cls && (cls.primary || '').toLowerCase().includes(ab.name.toLowerCase().slice(0, 3));
  const isRecommended = recommendedSlot != null && recommendedSlot <= 1;

  return (
    <div className="pickable" style={{
      padding: '20px 18px 16px', position: 'relative',
      cursor: 'default',
      borderColor: isPrimary ? `${ab.color}88` : 'var(--border)',
      background: isPrimary ? `linear-gradient(180deg, ${ab.color}15, rgba(56, 36, 22, 0.6) 60%)` : undefined,
    }}>
      {isPrimary && (
        <div className="display" style={{ position: 'absolute', top: -10, left: 14, padding: '2px 10px', background: ab.color, color: 'white', fontSize: 12, fontWeight: 800, letterSpacing: 1, borderRadius: 2 }}>PRIMARY</div>
      )}
      {!isPrimary && isRecommended && (
        <div className="display" style={{ position: 'absolute', top: -10, left: 14, padding: '2px 10px', background: 'var(--gold)', color: 'var(--ink)', fontSize: 12, fontWeight: 800, letterSpacing: 1, borderRadius: 2 }}>RECOMMENDED</div>
      )}

      {/* Top — name + icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 22 }}>{ab.icon}</span>
        <span className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{ab.name}</span>
      </div>
      <div className="italic-serif" style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16, lineHeight: 1.35 }}>{ab.desc}</div>

      {/* The big modifier shield in the middle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 4, fontSize: 10 }}>Score</div>
          <input
            type="number"
            className="input"
            value={base}
            onChange={(e) => onChange(Math.max(3, Math.min(method === 'manual' ? 20 : 15, Number(e.target.value) || 0)))}
            min={method === 'point-buy' ? 8 : 3}
            max={method === 'point-buy' ? 15 : 20}
            style={{ width: '100%', textAlign: 'center', fontSize: 20, fontWeight: 800, padding: '6px 4px', fontFamily: 'var(--display)' }}
          />
          {racialBonus > 0 && (
            <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4, textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
              +{racialBonus} from race
            </div>
          )}
        </div>

        <div style={{
          width: 76, height: 84, flexShrink: 0,
          background: `radial-gradient(circle at 50% 30%, ${ab.color}22, transparent 70%)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          border: `1px solid ${ab.color}44`,
        }}>
          <div className="label" style={{ fontSize: 9, marginBottom: 0, color: ab.color }}>MOD</div>
          <div className="display" style={{ fontSize: 30, color: mod >= 0 ? ab.color : 'var(--danger)', lineHeight: 1 }}>{modStr}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>({finalScore})</div>
        </div>
      </div>
    </div>
  );
}

function PointBuyTracker({ base }) {
  const cost = (n) => n <= 13 ? n - 8 : (n - 13) * 2 + 5;
  const used = Object.values(base).reduce((sum, v) => sum + (v >= 8 ? cost(v) : 0), 0);
  const remaining = 27 - used;
  return (
    <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(20, 12, 8, 0.5)', border: '1px solid var(--border)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div className="label">Point Buy Treasury</div>
        <div className="italic-serif" style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>8 = 0pt · 13 = 5pt · 14 = 7pt · 15 = 9pt</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="display" style={{ fontSize: 36, color: remaining < 0 ? 'var(--danger)' : remaining === 0 ? 'var(--teal)' : 'var(--gold)', lineHeight: 1 }}>{remaining}</div>
        <div className="label" style={{ fontSize: 10, marginTop: 2 }}>{remaining < 0 ? 'Overdrawn' : 'Remaining of 27'}</div>
      </div>
    </div>
  );
}

function ArrayTracker({ base }) {
  return (
    <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(20, 12, 8, 0.5)', border: '1px solid var(--border)', borderRadius: 4 }}>
      <div className="label" style={{ marginBottom: 10 }}>Standard Array · auto-assigned by class priority</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {STANDARD_ARRAY.map((n, i) => {
          const isUsed = Object.values(base).filter(v => v === n).length > 0;
          return (
            <div key={i} style={{
              width: 48, height: 48,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 20, fontFamily: 'var(--display)',
              background: isUsed ? 'rgba(55, 242, 209, 0.18)' : 'rgba(20, 12, 8, 0.7)',
              color: isUsed ? 'var(--teal)' : 'var(--text-faint)',
              border: `1px solid ${isUsed ? 'var(--teal)' : 'var(--border-faint)'}`,
              opacity: isUsed ? 1 : 0.5,
            }}>{n}</div>
          );
        })}
      </div>
    </div>
  );
}

window.StepAbilities = StepAbilities;
window.ABILITIES = ABILITIES;
