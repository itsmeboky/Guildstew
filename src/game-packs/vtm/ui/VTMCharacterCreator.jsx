// Root VTM creator. Owns the character state, the current step
// index, the random background tile, the Blood-Leech storyteller
// gate, and the predator-bonus apply pass on advance from
// Step VI. Save is lifted to the parent via `onComplete` (the
// pages/VTMCharacterCreator.jsx shell handles the actual
// Character.create call so the page can also pull `useAuth`
// + `useSubscription` without leaking those into the pack).
//
// Auth identity (userId for upload paths) is also passed down
// from the shell — the pack itself never touches AuthContext so
// it stays self-contained.

import React, { useState, useCallback, useMemo, useRef } from 'react';

import { STEPS } from '../data/steps.js';
import { BACKGROUND_IMAGES } from '../data/assets.js';
import { PREDATOR_TYPES, getPredatorType } from '../data/predatorTypes.js';
import { applyPredatorBonuses } from '../rules/predatorBonuses.js';
import { uploadVtmAsset } from '../rules/uploadAsset.js';

import GlobalStyles from '../theme/GlobalStyles.jsx';
import BackgroundLayer from '../components/BackgroundLayer.jsx';
import LacyCorners from '../components/LacyCorners.jsx';
import NavBar from '../components/NavBar.jsx';
import BloodLeechGate from '../components/BloodLeechGate.jsx';

import StepConcept from '../steps/StepConcept.jsx';
import StepClan from '../steps/StepClan.jsx';
import StepAttributes from '../steps/StepAttributes.jsx';
import StepSkills from '../steps/StepSkills.jsx';
import StepDisciplines from '../steps/StepDisciplines.jsx';
import StepPredator from '../steps/StepPredator.jsx';
import StepTouchstones from '../steps/StepTouchstones.jsx';
import StepAdvantages from '../steps/StepAdvantages.jsx';
import StepEmbrace from '../steps/StepEmbrace.jsx';

// Lightweight UUID-ish id for asset paths. Real UUIDs would be nicer
// but the upload path doesn't need cryptographic uniqueness —
// userId already namespaces.
const newTempId = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function VTMCharacterCreator({
  userId,           // string — auth user.id; required for uploads
  onComplete,       // (characterPayload) => Promise<void>
  saving = false,   // bool — disables the EMBRACE button while parent persists
}) {
  // Per-character upload key. Stable across step navigations.
  const tempIdRef = useRef(newTempId());

  // Random tile picked once per mount — matches prototype behavior.
  const bgUrl = useMemo(
    () => BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)],
    []
  );

  const [step, setStep] = useState(0);
  const [character, setCharacter] = useState({
    name: '', chronicle: '', sire: '', concept: '', ambition: '', desire: '',
    portrait: null, token: null, clan: null,
    attributes: {
      Strength: 1, Dexterity: 2, Stamina: 2,
      Charisma: 2, Manipulation: 2, Composure: 3,
      Intelligence: 3, Wits: 3, Resolve: 4,
    },
    skills: {}, skillApproach: 'Balanced',
    disciplines: {}, predatorType: null,
    touchstones: [], backgrounds: {},
    humanity: 7,
    specialties: [], merits: [], flaws: [],
    pendingChoices: [],
    predatorBonusesApplied: null,
  });

  const update = useCallback((patch) => setCharacter((c) => ({ ...c, ...patch })), []);

  // --- Blood Leech gating ----------------------------------------
  const [pendingPredator, setPendingPredator] = useState(null);
  const requestPredatorPick = useCallback((id) => {
    if (id === 'blood_leech' && character.predatorType !== 'blood_leech') {
      setPendingPredator(id);
      return;
    }
    update({ predatorType: id, predatorBonusesApplied: null });
  }, [character.predatorType, update]);
  const acceptPredator = useCallback(() => {
    if (pendingPredator) update({ predatorType: pendingPredator, predatorBonusesApplied: null });
    setPendingPredator(null);
  }, [pendingPredator, update]);
  const cancelPredator = useCallback(() => setPendingPredator(null), []);

  // --- Step nav with predator-bonus apply pass on Step VI exit ----
  // Returns the next character object so handleEmbrace can save the
  // freshly-mutated state without waiting for a re-render.
  const goTo = useCallback((newStep) => {
    if (newStep < 0 || newStep > 8) return character;
    let nextChar = character;
    // Leaving Step VI (Hunt) forward — apply predator bonuses once.
    if (step === 5 && newStep > 5) {
      const pt = getPredatorType(character.predatorType);
      if (pt && character.predatorBonusesApplied !== pt.id) {
        nextChar = applyPredatorBonuses(character, pt);
        setCharacter(nextChar);
      }
    }
    setStep(newStep);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    return nextChar;
  }, [step, character]);

  // --- Upload helpers (passed down to the step renderers) ---------
  const uploadPortraitToken = useCallback(async (file, slot) => {
    return uploadVtmAsset({ userId, tempId: tempIdRef.current, slot, file });
  }, [userId]);

  const uploadTouchstone = useCallback(async (file, idx) => {
    return uploadVtmAsset({ userId, tempId: tempIdRef.current, slot: `touchstone-${idx}`, file });
  }, [userId]);

  // --- Embrace handler ------------------------------------------
  // Called when the player clicks "EMBRACE" on Step VIII
  // (Connections). Advances to Step IX (the read-only reveal) AND
  // fires the save handler in parallel — Step IX is the visual
  // outcome of the save.
  const handleEmbrace = useCallback(async () => {
    if (!onComplete) {
      setStep(8);
      return;
    }
    // Apply predator bonuses if the user skipped Step VI bonuses
    // pass (defensive — usually goTo handles it on advance from 5).
    let finalChar = character;
    const pt = getPredatorType(character.predatorType);
    if (pt && character.predatorBonusesApplied !== pt.id) {
      finalChar = applyPredatorBonuses(character, pt);
      setCharacter(finalChar);
    }
    setStep(8);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      await onComplete({
        ...finalChar,
        _vtmTempId: tempIdRef.current,
      });
    } catch (err) {
      // Parent toasts the failure; rewind step so the player can retry.
      console.error('VTM Embrace save failed', err);
      setStep(7);
    }
  }, [character, onComplete]);

  const isAdvantages = step === 7;

  return (
    <div
      className="v-root"
      style={{
        minHeight: '100vh',
        color: 'var(--vtm-text, #e8dcc8)',
        overflowX: 'hidden',
        position: 'relative',
        backgroundColor: '#03020a',
        backgroundImage: bgUrl ? `url("${bgUrl}")` : 'none',
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        backgroundAttachment: 'fixed',
      }}
    >
      <GlobalStyles />

      <BackgroundLayer bgUrl={bgUrl} />
      <LacyCorners step={step} />

      {step === 0 && <StepConcept character={character} update={update} uploadPortraitToken={uploadPortraitToken} />}
      {step === 1 && <StepClan character={character} update={update} />}
      {step === 2 && <StepAttributes character={character} update={update} />}
      {step === 3 && <StepSkills character={character} update={update} />}
      {step === 4 && <StepDisciplines character={character} update={update} />}
      {step === 5 && <StepPredator character={character} update={update} requestPredatorPick={requestPredatorPick} />}
      {step === 6 && <StepTouchstones character={character} update={update} uploadTouchstone={uploadTouchstone} />}
      {step === 7 && <StepAdvantages character={character} update={update} />}
      {step === 8 && <StepEmbrace character={character} />}

      <NavBar
        step={step}
        total={STEPS.length}
        onBack={() => goTo(step - 1)}
        // Step VIII → IX: "EMBRACE" fires the save *and* advances.
        // Step IX itself: NavBar's last-step branch disables the
        // button — by that point save is already in flight or done.
        onNext={isAdvantages ? handleEmbrace : () => goTo(step + 1)}
        canNext={!saving}
        nextLabel={isAdvantages ? (saving ? 'SAVING…' : 'EMBRACE') : 'CONTINUE'}
      />

      <BloodLeechGate
        open={!!pendingPredator}
        onConfirm={acceptPredator}
        onCancel={cancelPredator}
      />
    </div>
  );
}
