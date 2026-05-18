// PF2e character creator — main 9-step flow.
// Lifted from the prototype's `PF2eCharacterForge` function body, unchanged
// except for the final onForge callback (parent saves to Supabase via onComplete).
//
// The big inline <style> block from the prototype is preserved here as a
// fallback for environments where the Tailwind tokens in config/pf2e-theme.js
// haven't been merged into tailwind.config.js yet. Once they're merged, this
// block can be deleted.

import React, { useState } from 'react';
import { Hexagon } from 'lucide-react';

import StepIdentity from './steps/StepIdentity.jsx';
import StepAncestry from './steps/StepAncestry.jsx';
import StepBackground from './steps/StepBackground.jsx';
import StepClass from './steps/StepClass.jsx';
import StepAbilities from './steps/StepAbilities.jsx';
import StepSkills from './steps/StepSkills.jsx';
import StepSpells from './steps/StepSpells.jsx';
import StepGear from './steps/StepGear.jsx';
import StepReview from './steps/StepReview.jsx';

import StepIndicator from './components/StepIndicator.jsx';
import BottomBar from './components/BottomBar.jsx';
import DeityModal from './components/DeityModal.jsx';

import { STEPS } from '../config/steps.js';

export default function CharacterCreatorFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [deityModalOpen, setDeityModalOpen] = useState(false);
  const [data, setData] = useState({
    name: '', pronouns: '', age: '', height: '', bio: '',
    catchphrase: '', sanctification: 'none', edicts: '', anathema: '', alliesEnemies: '',
    level: 1,
    avatar: null, portrait: null,
    ancestry: null, heritage: null,
    background: null, backgroundLore: '',
    class: null, classFeats: {}, subclass: null, subclassPick: null, domain: null,
    deity: null,
    boostBatches: { 1: {} },
    trainedSkills: [], skillTiers: {}, skillIncreases: {}, skillFeats: {}, generalFeats: {}, languages: [],
    cantripsKnown: [], rank1Known: [], spellsByRank: {}, spellbook: [],
    focusSpells: [], focusPoints: 0,
    healHarmFont: null, arcaneBond: null,
    animalCompanion: null, familiar: null,
    loadout: [], kitTaken: null,
    ancestryFeats: {},
    // House Rules variants + dependent fields
    houseRules: {
      freeArchetype: false, ancestryParagon: false, voluntaryFlaws: false,
      proficiencyWithoutLevel: false, dualClass: false, gradualBoosts: false,
    },
    voluntaryFlaws: [], voluntaryFlawBoost: null,
    secondClass: null,
    freeArchetypeFeats: {},
  });

  const update = (patch) => setData(d => ({ ...d, ...patch }));

  const next = () => {
    setCompleted(prev => prev.includes(step) ? prev : [...prev, step]);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const stepKey = STEPS[step].key;

  return (
    <div className="min-h-screen bg-pf-bg text-pf-bone font-body antialiased flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --pf-bg: #0E1419;
          --pf-bg-card: #171F26;
          --pf-bg-elev: #1F2933;
          --pf-oxblood: #9B1D26;
          --pf-oxblood-glow: #C8323E;
          --pf-brass: #C9A961;
          --pf-brass-dim: #8A7340;
          --pf-parchment: #E8DCC4;
          --pf-bone: #F5EFE0;
          --pf-stone: #8A95A0;
          --pf-sage: #6B8E7F;
        }

        .bg-pf-bg { background-color: var(--pf-bg); }
        .bg-pf-bg-card { background-color: var(--pf-bg-card); }
        .bg-pf-bg-elev { background-color: var(--pf-bg-elev); }
        .bg-pf-oxblood { background-color: var(--pf-oxblood); }
        .bg-pf-oxblood-glow { background-color: var(--pf-oxblood-glow); }
        .bg-pf-brass { background-color: var(--pf-brass); }
        .bg-pf-brass-dim { background-color: var(--pf-brass-dim); }
        .bg-pf-sage { background-color: var(--pf-sage); }

        .text-pf-bone { color: var(--pf-bone); }
        .text-pf-parchment { color: var(--pf-parchment); }
        .text-pf-stone { color: var(--pf-stone); }
        .text-pf-brass { color: var(--pf-brass); }
        .text-pf-brass-dim { color: var(--pf-brass-dim); }
        .text-pf-oxblood { color: var(--pf-oxblood); }
        .text-pf-oxblood-glow { color: var(--pf-oxblood-glow); }
        .text-pf-sage { color: var(--pf-sage); }

        .fill-pf-brass { fill: var(--pf-brass); }

        .border-pf-brass { border-color: var(--pf-brass); }
        .border-pf-brass-dim { border-color: var(--pf-brass-dim); }
        .border-pf-oxblood { border-color: var(--pf-oxblood); }
        .border-pf-sage { border-color: var(--pf-sage); }

        .font-display { font-family: 'Cinzel', serif; font-weight: 600; }
        .font-body { font-family: 'Crimson Pro', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }

        body {
          background: var(--pf-bg);
          background-image:
            radial-gradient(ellipse at top, rgba(155,29,38,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(201,169,97,0.04) 0%, transparent 50%);
        }

        /* Opacity helpers */
        .bg-pf-brass\\/5 { background-color: rgba(201,169,97,0.05); }
        .bg-pf-brass\\/10 { background-color: rgba(201,169,97,0.10); }
        .bg-pf-brass\\/15 { background-color: rgba(201,169,97,0.15); }
        .bg-pf-brass\\/20 { background-color: rgba(201,169,97,0.20); }
        .bg-pf-brass\\/30 { background-color: rgba(201,169,97,0.30); }
        .border-pf-brass\\/30 { border-color: rgba(201,169,97,0.30); }
        .border-pf-brass\\/40 { border-color: rgba(201,169,97,0.40); }
        .border-pf-brass\\/60 { border-color: rgba(201,169,97,0.60); }
        .border-pf-brass-dim\\/10 { border-color: rgba(138,115,64,0.10); }
        .border-pf-brass-dim\\/15 { border-color: rgba(138,115,64,0.15); }
        .border-pf-brass-dim\\/20 { border-color: rgba(138,115,64,0.20); }
        .border-pf-brass-dim\\/30 { border-color: rgba(138,115,64,0.30); }
        .border-pf-brass-dim\\/40 { border-color: rgba(138,115,64,0.40); }
        .border-pf-brass-dim\\/60 { border-color: rgba(138,115,64,0.60); }
        .bg-pf-brass-dim\\/20 { background-color: rgba(138,115,64,0.20); }
        .text-pf-brass\\/30 { color: rgba(201,169,97,0.30); }
        .bg-pf-oxblood\\/10 { background-color: rgba(155,29,38,0.10); }
        .bg-pf-oxblood\\/15 { background-color: rgba(155,29,38,0.15); }
        .bg-pf-oxblood\\/20 { background-color: rgba(155,29,38,0.20); }
        .border-pf-oxblood\\/40 { border-color: rgba(155,29,38,0.40); }
        .border-pf-oxblood\\/50 { border-color: rgba(155,29,38,0.50); }
        .bg-pf-bg\\/95 { background-color: rgba(14,20,25,0.95); }
        .bg-pf-bg-card\\/95 { background-color: rgba(23,31,38,0.95); }
        .text-pf-stone\\/40 { color: rgba(138,149,160,0.40); }
        .text-pf-stone\\/50 { color: rgba(138,149,160,0.50); }
        .text-pf-stone\\/60 { color: rgba(138,149,160,0.60); }
        .text-pf-stone\\/70 { color: rgba(138,149,160,0.70); }
        .bg-pf-bg-elev\\/30 { background-color: rgba(31,41,51,0.30); }
        .bg-pf-bg-elev\\/40 { background-color: rgba(31,41,51,0.40); }
        .bg-pf-bg-elev\\/50 { background-color: rgba(31,41,51,0.50); }
        .bg-pf-bg-elev\\/60 { background-color: rgba(31,41,51,0.60); }
        .bg-pf-bg-elev\\/80 { background-color: rgba(31,41,51,0.80); }
        .bg-pf-sage\\/15 { background-color: rgba(107,142,127,0.15); }
        .border-pf-sage\\/40 { border-color: rgba(107,142,127,0.40); }

        .step-enter { animation: stepEnter 0.4s ease-out both; }
        @keyframes stepEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-pf-brass-dim/30 bg-pf-bg-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Hexagon size={28} className="text-pf-brass" strokeWidth={1.2} />
            <div>
              <p className="font-display text-[10px] tracking-[0.4em] text-pf-brass uppercase">Pathfinder Second Edition</p>
              <h1 className="font-display text-lg text-pf-bone tracking-wider">Character Forge</h1>
            </div>
          </div>
          <span className="font-display text-[10px] tracking-[0.2em] text-pf-stone uppercase">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>

      <StepIndicator current={step} onStepClick={setStep} completed={completed} />

      <div className="flex-1 max-w-7xl w-full mx-auto px-8 py-8">
        <div key={stepKey} className="step-enter">
          {stepKey === 'identity'   && <StepIdentity   data={data} update={update} setData={setData} />}
          {stepKey === 'ancestry'   && <StepAncestry   data={data} update={update} />}
          {stepKey === 'background' && <StepBackground data={data} update={update} />}
          {stepKey === 'class'      && <StepClass      data={data} update={update} openDeityModal={() => setDeityModalOpen(true)} />}
          {stepKey === 'abilities'  && <StepAbilities  data={data} update={update} />}
          {stepKey === 'skills'     && <StepSkills     data={data} update={update} />}
          {stepKey === 'spells'     && <StepSpells     data={data} update={update} />}
          {stepKey === 'gear'       && <StepGear       data={data} update={update} />}
          {stepKey === 'review'     && <StepReview     data={data} onForge={() => onComplete?.(data)} />}
        </div>
      </div>

      <BottomBar
        data={data}
        step={step}
        totalSteps={STEPS.length}
        onBack={back}
        onNext={next}
      />

      <DeityModal
        open={deityModalOpen}
        onClose={() => setDeityModalOpen(false)}
        onSelect={(d) => update({ deity: d })}
      />
    </div>
  );
}
