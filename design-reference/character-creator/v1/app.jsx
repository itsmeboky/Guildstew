// CharacterCreator — main shell. Owns the wizard state, validates each step,
// dispatches to the right step component, and renders the nav.

// Pull shared utilities from window (each Babel script has its own scope).
const {
  Stepper, StepHeader, StepNav, CharacterSummary, Primer, HelpTip,
  StepIdentity, StepClass, StepAbilities, StepFeatures,
  StepSkills, StepSpells, StepEquipment, StepReview,
  RACES, BACKGROUNDS, ALIGNMENTS, CLASSES, SKILLS, SPELLS,
  applyRacialBonuses, calcMod, modString, proficiencyBonus,
} = window;

const STEP_COUNT = 8;

const DEFAULT_DATA = {
  name: '',
  level: 1,
  race: '',
  subrace: '',
  background: '',
  alignment: 'TN',
  age: '', height: '', weight: '',
  biography: '',
  portrait: '',
  profile_avatar: '',
  class: '',
  subclass: '',
  patron: '',
  companion: '',
  baseAttributes: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  attributes: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  abilityMethod: 'standard',
  feature_choices: {},
  skills_picked: [],
  spells: { cantrips: [], level1: [] },
  equipment_choices: {},
  inventory_custom: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
};

function CharacterCreator() {
  const [step, setStep] = React.useState(0);
  const [completed, setCompleted] = React.useState([]);
  const [data, setData] = React.useState(DEFAULT_DATA);
  const [finalized, setFinalized] = React.useState(false);

  const update = (updates) => setData(prev => ({ ...prev, ...updates }));

  // Step validation
  const stepValid = React.useMemo(() => {
    switch (step) {
      case 0: { // Identity
        const race = RACES.find(r => r.id === data.race);
        const subraceOk = !race || race.subraces.length <= 1 || !!data.subrace;
        return !!(data.name && data.race && subraceOk && data.background && data.alignment);
      }
      case 1: { // Class
        const cls = CLASSES.find(c => c.id === data.class);
        if (!cls) return false;
        if (cls.hasPatron && !data.subclass) return false;
        // subclass technically optional below patron's level, but always pick
        return true;
      }
      case 2: { // Abilities — sanity check
        const vals = Object.values(data.attributes || {});
        return vals.every(v => v >= 3 && v <= 20);
      }
      case 3: { // Features
        const cls = CLASSES.find(c => c.id === data.class);
        if (!cls) return false;
        if (cls.id === 'fighter' && !data.feature_choices?.fightingStyle) return false;
        if (cls.id === 'ranger' && !data.feature_choices?.favoredEnemy) return false;
        if (cls.id === 'rogue' && (data.feature_choices?.expertise || []).length < 2) return false;
        return true;
      }
      case 4: { // Skills
        const cls = CLASSES.find(c => c.id === data.class);
        if (!cls) return false;
        return (data.skills_picked || []).length === cls.skillChoices;
      }
      case 5: { // Spells
        const cls = CLASSES.find(c => c.id === data.class);
        if (!cls || !cls.spellcaster) return true;
        const limits = window.SPELL_LIMITS?.[cls.id] || { c: 0, s: 0 };
        const cantrips = data.spells?.cantrips || [];
        const leveled = data.spells?.level1 || [];
        if (cantrips.length !== limits.c) return false;
        if (typeof limits.s === 'number' && leveled.length !== limits.s) return false;
        return true;
      }
      case 6: return true; // Equipment
      case 7: return true; // Review
      default: return false;
    }
  }, [step, data]);

  const blockedReason = React.useMemo(() => {
    if (stepValid) return null;
    switch (step) {
      case 0:
        if (!data.name) return 'Pick a name';
        if (!data.race) return 'Pick a race';
        const race = RACES.find(r => r.id === data.race);
        if (race && race.subraces.length > 1 && !data.subrace) return 'Pick a subrace';
        if (!data.background) return 'Pick a background';
        if (!data.alignment) return 'Pick an alignment';
        return 'Fill required fields';
      case 1: {
        const cls = CLASSES.find(c => c.id === data.class);
        if (!cls) return 'Pick a class';
        if (cls.hasPatron && !data.subclass) return 'Pick a patron';
        return null;
      }
      case 3: {
        const cls = CLASSES.find(c => c.id === data.class);
        if (cls?.id === 'fighter') return 'Pick a fighting style';
        if (cls?.id === 'ranger') return 'Pick a favored enemy';
        if (cls?.id === 'rogue') return 'Pick 2 expertise skills';
        return null;
      }
      case 4: {
        const cls = CLASSES.find(c => c.id === data.class);
        return `Pick ${cls.skillChoices - (data.skills_picked || []).length} more skill${cls.skillChoices - (data.skills_picked || []).length === 1 ? '' : 's'}`;
      }
      case 5: {
        return 'Finish picking spells';
      }
      default: return null;
    }
  }, [step, data, stepValid]);

  const handleNext = () => {
    if (!stepValid) return;
    setCompleted(prev => prev.includes(step) ? prev : [...prev, step]);
    if (step < STEP_COUNT - 1) setStep(step + 1);
  };
  const handleBack = () => step > 0 && setStep(step - 1);
  const handleStepClick = (i) => {
    if (completed.includes(i) || i <= step) setStep(i);
  };

  const handleFinalize = () => {
    setFinalized(true);
    setCompleted(STEP_DEFS.map((_, i) => i));
  };

  // Render finalized state
  if (finalized) {
    return <Finalized data={data} onEdit={() => setFinalized(false)} onNew={() => { setData(DEFAULT_DATA); setStep(0); setCompleted([]); setFinalized(false); }} />;
  }

  const StepComponent = [StepIdentity, StepClass, StepAbilities, StepFeatures, StepSkills, StepSpells, StepEquipment, StepReview][step];

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '32px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 52, color: 'white', lineHeight: 1, marginBottom: 6, letterSpacing: 1, textShadow: '0 4px 24px rgba(255, 83, 0, 0.25)' }}>
          Character Creator
        </h1>
        <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: 15 }}>Build your D&amp;D 5e hero — step by step, with help along the way.</p>
      </header>

      <Stepper current={step} completed={completed} onClick={handleStepClick} />

      <div key={step} className="step-content">
        {step === 7
          ? <StepReview data={data} onFinalize={handleFinalize} />
          : <StepComponent data={data} update={update} />
        }
      </div>

      {step !== 7 && (
        <StepNav
          onBack={handleBack}
          onNext={handleNext}
          canBack={step > 0}
          canNext={stepValid}
          nextLabel={step === STEP_COUNT - 1 ? 'Finalize' : null}
          blockedReason={blockedReason}
        />
      )}

      <footer style={{ marginTop: 60, textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>
        D&amp;D 5e content adapted from the System Reference Document 5.1 (CC BY 4.0).
      </footer>
    </div>
  );
}

// ============================================================================
// Finalized congratulations screen
// ============================================================================
function Finalized({ data, onEdit, onNew }) {
  const cls = CLASSES.find(c => c.id === data.class);
  const race = RACES.find(r => r.id === data.race);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div className="panel-strong fade-in" style={{ padding: 48, maxWidth: 560, textAlign: 'center', boxShadow: '0 20px 60px rgba(255, 83, 0, 0.2)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{race?.icon || '⚔️'}</div>
        <div className="label" style={{ color: 'var(--teal)', marginBottom: 8 }}>Character created</div>
        <h2 className="display" style={{ fontSize: 44, color: 'var(--orange)', lineHeight: 1, marginBottom: 8 }}>
          {data.name || 'Unnamed Hero'}
        </h2>
        <div style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 24 }}>
          Level {data.level} {race?.name} {cls?.name}
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
          Your sheet is ready. Roll well, adventurer.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onEdit}>← Edit</button>
          <button className="btn btn-primary" onClick={onNew}>Create another</button>
        </div>
      </div>
    </div>
  );
}

// Render
ReactDOM.createRoot(document.getElementById('root')).render(<CharacterCreator />);
