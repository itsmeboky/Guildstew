// Root VTM creator. Owns the character state, the current step
// index, the random background tile, the Blood-Leech storyteller
// gate, the predator-resolution snapshot, and the bonus-apply
// pass on advance from Step VI. Save is lifted to the parent via
// `onComplete` (the pages/VTMCharacterCreator.jsx shell handles
// the actual Character.create call so the page can also pull
// `useAuth` + `useSubscription` without leaking those into the
// pack).
//
// Auth identity (userId for upload paths) is also passed down
// from the shell — the pack itself never touches AuthContext so
// it stays self-contained.
//
// Predator-bonus state machine (Step VI semantics):
//   - On forward Step VI → VII (or any later step): snapshot the
//     pure-user character into `_preBonuses` (if not already), then
//     overlay applyResolution() onto that baseline. Storing the
//     baseline lets us re-apply cleanly when the player changes
//     their predator pick or their resolutions without accumulating
//     prior predator's effects.
//   - On backward navigation past Step VI (to ≤ V): drop
//     `_preBonuses` AND `predatorResolutions`, and restore the
//     character to its pre-bonus state. The player can re-pick
//     and re-resolve when they advance again.
//   - On predator change while on Step VI itself: clear
//     `predatorResolutions` (resolutions don't carry across
//     predator picks). The baseline (if it exists) stays put.

import React, { useState, useCallback, useMemo, useRef } from 'react';

import { STEPS } from '../data/steps.js';
import { BACKGROUND_IMAGES } from '../data/assets.js';
import { getPredatorType } from '../data/predatorTypes.js';
import { applyResolution, isResolutionComplete, parsePredatorGrants } from '../rules/predatorBonuses.js';
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

// Fields that get overwritten by the predator-bonus overlay. The
// snapshot stashes their values before first apply so subsequent
// re-applies start from a clean baseline.
function snapshotBonusFields(character) {
  return {
    disciplines: { ...(character.disciplines || {}) },
    backgrounds: { ...(character.backgrounds || {}) },
    humanity:    character.humanity ?? 7,
    specialties: [...(character.specialties || [])],
    merits:      [...(character.merits      || [])],
    flaws:       [...(character.flaws       || [])],
  };
}

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
    predatorResolutions: {},
    _preBonuses: null,
    touchstones: [], backgrounds: {},
    humanity: 7,
    specialties: [], merits: [], flaws: [],
  });

  const update = useCallback((patch) => setCharacter((c) => ({ ...c, ...patch })), []);

  // --- Blood Leech gating ----------------------------------------
  const [pendingPredator, setPendingPredator] = useState(null);
  const commitPredator = useCallback((id) => {
    // Changing predator clears resolutions (they don't carry across
    // picks). The baseline snapshot stays so re-applying with the
    // new predator produces a clean character from the same baseline.
    update({ predatorType: id, predatorResolutions: {} });
  }, [update]);
  const requestPredatorPick = useCallback((id) => {
    if (id === 'blood_leech' && character.predatorType !== 'blood_leech') {
      setPendingPredator(id);
      return;
    }
    commitPredator(id);
  }, [character.predatorType, commitPredator]);
  const acceptPredator = useCallback(() => {
    if (pendingPredator) commitPredator(pendingPredator);
    setPendingPredator(null);
  }, [pendingPredator, commitPredator]);
  const cancelPredator = useCallback(() => setPendingPredator(null), []);

  // --- Step nav with predator-bonus apply pass on Step VI exit ----
  // Returns the next character object so handleEmbrace can save the
  // freshly-mutated state without waiting for a re-render.
  const goTo = useCallback((newStep) => {
    if (newStep < 0 || newStep > 8) return character;
    let nextChar = character;

    // Leaving Step VI (Hunt) forward — overlay predator bonuses.
    // applyResolution only touches the six bonus fields
    // (disciplines, backgrounds, humanity, specialties, merits,
    // flaws); the rest of the character (attributes, skills,
    // touchstones, identity text, etc.) carries over via the
    // outer spread.
    if (step === 5 && newStep > 5) {
      const pt = getPredatorType(character.predatorType);
      if (pt) {
        const baseline = character._preBonuses || snapshotBonusFields(character);
        const overlaid = applyResolution(baseline, pt, character.predatorResolutions || {});
        nextChar = { ...character, ...overlaid, _preBonuses: baseline };
        setCharacter(nextChar);
      }
    }

    // Going backward to Step VI or earlier — drop the overlay so
    // the player sees their pure user state. Predator resolutions
    // stay so they don't have to re-pick if they're just bouncing
    // back to Step VI to change disciplines. The overlay will
    // re-apply on the next forward advance from Step VI.
    if (step > 5 && newStep <= 5 && character._preBonuses) {
      nextChar = {
        ...character,
        ...character._preBonuses,
        _preBonuses: null,
      };
      setCharacter(nextChar);
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
    // Defensive re-apply — by Step VIII the overlay is already
    // applied (Step VI's resolution gate enforces it), so this
    // mostly catches the path where a future code change loses
    // the overlay state. Cheap to run.
    let finalChar = character;
    const pt = getPredatorType(character.predatorType);
    if (pt && character._preBonuses) {
      const overlaid = applyResolution(character._preBonuses, pt, character.predatorResolutions || {});
      finalChar = { ...character, ...overlaid };
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
  const isHunt = step === 5;

  // Block Step VI → VII advance until every predator choice is
  // resolved. Other steps don't gate today.
  const huntComplete = useMemo(() => {
    if (!isHunt) return true;
    const pt = getPredatorType(character.predatorType);
    if (!pt) return false; // no predator picked yet
    return isResolutionComplete(parsePredatorGrants(pt), character.predatorResolutions || {});
  }, [isHunt, character.predatorType, character.predatorResolutions]);

  const canAdvance = (saving ? false : true) && (isHunt ? huntComplete : true);

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
        onNext={isAdvantages ? handleEmbrace : () => goTo(step + 1)}
        canNext={canAdvance}
        nextLabel={
          isHunt && !huntComplete ? 'RESOLVE CHOICES'
          : isAdvantages ? (saving ? 'SAVING…' : 'EMBRACE')
          : 'CONTINUE'
        }
      />

      <BloodLeechGate
        open={!!pendingPredator}
        onConfirm={acceptPredator}
        onCancel={cancelPredator}
      />
    </div>
  );
}
