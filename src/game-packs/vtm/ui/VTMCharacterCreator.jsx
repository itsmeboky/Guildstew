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
import { CLANS } from '../data/clans.js';
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

  // Random clan accent for the gradient overlay, picked once per
  // mount alongside the tile. Tints the page so the pattern stops
  // out-shouting the polaroids / anatomical figure. Independent
  // of character.clan: the player hasn't picked one yet on Step 0,
  // and we don't want the page to re-hue mid-flow when they do.
  const overlayAccent = useMemo(
    () => CLANS[Math.floor(Math.random() * CLANS.length)].accent,
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

  // --- Step VIII → IX advance (review only, no save) -------------
  // Player clicks "REVIEW" on Step VIII. We re-apply the predator
  // overlay defensively (Step VI's gate normally enforces it, but
  // this catches a code-path drift) and advance to the read-only
  // review screen. Save fires from the explicit confirm button on
  // Step IX, not here.
  const advanceToReview = useCallback(() => {
    const pt = getPredatorType(character.predatorType);
    if (pt && character._preBonuses) {
      const overlaid = applyResolution(character._preBonuses, pt, character.predatorResolutions || {});
      setCharacter((c) => ({ ...c, ...overlaid }));
    }
    setStep(8);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [character]);

  // --- Embrace confirm — fires from Step IX's confirm button -----
  // Mirrors the dnd5e / pf2e creator pattern where the final step
  // shows a full review and the save only fires after an explicit
  // user click. Earlier the save fired the moment the player hit
  // "EMBRACE" on Step VIII, which gave them no chance to scan the
  // review summary before being yanked back to the library.
  const confirmEmbrace = useCallback(async () => {
    if (!onComplete) return;
    let finalChar = character;
    const pt = getPredatorType(character.predatorType);
    if (pt && character._preBonuses) {
      const overlaid = applyResolution(character._preBonuses, pt, character.predatorResolutions || {});
      finalChar = { ...character, ...overlaid };
      setCharacter(finalChar);
    }
    try {
      await onComplete({
        ...finalChar,
        _vtmTempId: tempIdRef.current,
      });
    } catch (err) {
      // Parent toasts the failure; player stays on Step IX and can
      // click the confirm button again. Rewinding to Step VIII would
      // lose the review context they were just looking at.
      console.error('VTM Embrace save failed', err);
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
        // Background paint is wholly delegated to <BackgroundLayer/>
        // below — the previous v-root inline `backgroundImage:
        // url(bgUrl)` painted the tile a second time, and v-root's
        // own background paints AFTER its negative-z fixed children
        // per CSS stacking (parent background = step 1 of its own
        // box render, fixed children with z<0 = step 2 of the
        // document root). That covered every BackgroundLayer layer
        // — base, texture, tile, the new clan overlay, the vignette
        // — with a fresh full-saturation tile, which is why the
        // overlay polish didn't visually mute the pattern.
      }}
    >
      <GlobalStyles />

      <BackgroundLayer bgUrl={bgUrl} overlayAccent={overlayAccent} />
      <LacyCorners step={step} />

      {step === 0 && <StepConcept character={character} update={update} uploadPortraitToken={uploadPortraitToken} />}
      {step === 1 && <StepClan character={character} update={update} />}
      {step === 2 && <StepAttributes character={character} update={update} />}
      {step === 3 && <StepSkills character={character} update={update} />}
      {step === 4 && <StepDisciplines character={character} update={update} />}
      {step === 5 && <StepPredator character={character} update={update} requestPredatorPick={requestPredatorPick} />}
      {step === 6 && <StepTouchstones character={character} update={update} uploadTouchstone={uploadTouchstone} />}
      {step === 7 && <StepAdvantages character={character} update={update} />}
      {step === 8 && (
        <StepEmbrace
          character={character}
          onConfirm={confirmEmbrace}
          saving={saving}
        />
      )}

      <NavBar
        step={step}
        total={STEPS.length}
        onBack={() => goTo(step - 1)}
        onNext={isAdvantages ? advanceToReview : () => goTo(step + 1)}
        canNext={canAdvance}
        nextLabel={
          isHunt && !huntComplete ? 'RESOLVE CHOICES'
          : isAdvantages ? 'REVIEW EMBRACE'
          : 'CONTINUE'
        }
        // Step IX's forward action is the explicit confirm button
        // inside StepEmbrace itself; hide the NavBar's next button
        // entirely so there's only one path forward.
        hideNext={step === STEPS.length - 1}
      />

      <BloodLeechGate
        open={!!pendingPredator}
        onConfirm={acceptPredator}
        onCancel={cancelPredator}
      />
    </div>
  );
}
