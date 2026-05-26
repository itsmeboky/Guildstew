// V5 predator-type parser + applyResolution regression tests.
//
// Walks all ten shipped predator types and verifies the
// spot-checks from the choice-resolver brief. Each case:
//   1. Parses the predator's grants + costs
//   2. Asserts the right shape of choices vs required
//   3. Picks one resolution and asserts the patched character
//      matches the V5 corebook expectation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePredatorGrants,
  applyResolution,
  isResolutionComplete,
} from '../predatorBonuses.js';
import { PREDATOR_TYPES, getPredatorType } from '../../data/predatorTypes.js';

// Baseline character: clean user-allocated state. No disciplines,
// no backgrounds, default Humanity 7.
const baseline = () => ({
  disciplines: {}, backgrounds: {},
  humanity: 7,
  specialties: [], merits: [], flaws: [],
});

// Helper: pick first option for each OR-choice, distribute evenly
// (round-down on remainder) for each distribute-choice.
function autoResolve(parsed) {
  const out = {};
  for (const choice of parsed.choices) {
    if (choice.kind === 'or') out[choice.id] = { picked: 0 };
    else if (choice.kind === 'distribute') {
      const dist = choice.targets.map(() => 0);
      let remaining = choice.budget;
      let i = 0;
      while (remaining > 0) {
        if (dist[i] < (choice.targets[i].max ?? 3)) {
          dist[i]++;
          remaining--;
        }
        i = (i + 1) % choice.targets.length;
      }
      out[choice.id] = { distribution: dist };
    }
  }
  return out;
}

// --- All predator types parse without crashing -----------------
test('every predator type parses to required+choices', () => {
  for (const pt of PREDATOR_TYPES) {
    const parsed = parsePredatorGrants(pt);
    assert.ok(Array.isArray(parsed.required), `${pt.id}: required is array`);
    assert.ok(Array.isArray(parsed.choices),  `${pt.id}: choices is array`);
    // Every predator has at least one OR-choice (the discipline OR).
    assert.ok(parsed.choices.length >= 1, `${pt.id}: ≥1 choice`);
  }
});

// --- Specialty OR lines become choices, not required strings ----
test('specialty "X or Y" lines are choices, not auto-applied', () => {
  for (const pt of PREDATOR_TYPES) {
    const parsed = parsePredatorGrants(pt);
    // Should not have any required entry whose value contains " or " —
    // that would be the old bug.
    for (const req of parsed.required) {
      if (req.kind === 'specialty') {
        assert.ok(!/\s+or\s+/i.test(req.value),
          `${pt.id}: specialty required has unsplit "or": ${req.value}`);
        assert.ok(!/\s+\/\s+/.test(req.value),
          `${pt.id}: specialty required has unsplit "/": ${req.value}`);
      }
    }
    // Should have at least one choice tagged with id ending in -specialty-N.
    const hasSpecialtyChoice = parsed.choices.some((c) => /specialty/.test(c.id));
    assert.ok(hasSpecialtyChoice, `${pt.id}: specialty becomes choice`);
  }
});

// --- isResolutionComplete contract -----------------------------
test('isResolutionComplete starts false, becomes true after autoResolve', () => {
  for (const pt of PREDATOR_TYPES) {
    const parsed = parsePredatorGrants(pt);
    assert.equal(isResolutionComplete(parsed, {}), false, `${pt.id}: empty resolutions`);
    const auto = autoResolve(parsed);
    assert.equal(isResolutionComplete(parsed, auto), true, `${pt.id}: auto-resolved`);
  }
});

// --- Per-predator spot-checks (V5 corebook) --------------------

test('alleycat: Celerity or Potence; humanity 6; contacts 3', () => {
  const pt = getPredatorType('alleycat');
  const parsed = parsePredatorGrants(pt);
  // Discipline OR — Celerity is option 0
  const disc = parsed.choices.find((c) => /discipline/.test(c.id));
  assert.deepEqual(disc.options[0], { kind: 'discipline', target: 'Celerity', dots: 1 });
  assert.deepEqual(disc.options[1], { kind: 'discipline', target: 'Potence', dots: 1 });
  // Pick Celerity
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines.Celerity, 1);
  assert.equal(c.humanity, 6, 'humanity = 7 - 1');
  assert.equal(c.backgrounds.contacts, 3);
});

test('bagger: Blood Sorcery or Obfuscate; Enemy flaw', () => {
  const pt = getPredatorType('bagger');
  const parsed = parsePredatorGrants(pt);
  const disc = parsed.choices.find((c) => /discipline/.test(c.id));
  // "(in-clan)" must be stripped from the Blood Sorcery option label.
  assert.equal(disc.options[0].target, 'Blood Sorcery');
  assert.equal(disc.options[1].target, 'Obfuscate');
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines['Blood Sorcery'], 1);
  assert.ok(c.flaws.some((f) => f.startsWith('Enemy')), 'enemy flaw present');
});

test('blood_leech: Celerity or Protean; humanity 4; diablerist', () => {
  const pt = getPredatorType('blood_leech');
  const parsed = parsePredatorGrants(pt);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  // Auto-resolve picks Celerity (option 0)
  assert.equal(c.disciplines.Celerity, 1);
  assert.equal(c.humanity, 4, 'humanity = 7 - 3');
  assert.ok(c.flaws.some((f) => /Diablerist/.test(f)), 'diablerist flaw');
});

test('cleaver: Dominate or Animalism; Herd 2', () => {
  const pt = getPredatorType('cleaver');
  const parsed = parsePredatorGrants(pt);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines.Dominate, 1);
  assert.equal(c.backgrounds.herd, 2);
});

test('consensualist: Auspex or Fortitude; humanity 8; masquerade-breacher flaw', () => {
  const pt = getPredatorType('consensualist');
  const parsed = parsePredatorGrants(pt);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines.Auspex, 1);
  assert.equal(c.humanity, 8);
  assert.ok(c.flaws.some((f) => /Masquerade Breacher/i.test(f)));
});

test('farmer: Animalism or Protean; humanity 8; vegan as a flaw (not merit)', () => {
  const pt = getPredatorType('farmer');
  const parsed = parsePredatorGrants(pt);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines.Animalism, 1);
  assert.equal(c.humanity, 8);
  // V5 taxonomy: feeding restrictions are flaws, not merits.
  assert.ok(c.flaws.some((f) => /Vegan/i.test(f)), 'vegan landed in flaws');
  assert.ok(!c.merits.some((m) => /Vegan/i.test(m)), 'vegan not in merits');
});

test('osiris: Blood Sorcery or Presence; Fame+Herd sum 3; Enemies+Mythic sum 2', () => {
  const pt = getPredatorType('osiris');
  const parsed = parsePredatorGrants(pt);
  // Three choices: discipline OR + 2 distributes
  assert.equal(parsed.choices.filter((c) => c.kind === 'distribute').length, 2);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines['Blood Sorcery'], 1);
  // Auto distribution puts 2/1 in Fame/Herd (3 budget, round-robin)
  assert.equal((c.backgrounds.fame || 0) + (c.backgrounds.herd || 0), 3);
  // Enemies + Mythic Flaws flaws sum to 2 dots
  const enemyFlawCount = c.flaws.filter((f) => /Enemies/.test(f)).length;
  const mythicFlawCount = c.flaws.filter((f) => /Mythic Flaws/.test(f)).length;
  assert.equal(enemyFlawCount + mythicFlawCount, 2);
});

test('sandman: Auspex or Obfuscate; Resources 1', () => {
  const pt = getPredatorType('sandman');
  const parsed = parsePredatorGrants(pt);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines.Auspex, 1);
  assert.equal(c.backgrounds.resources, 1);
});

test('scene_queen: three-option specialty choice; Fame 1 + Contact 1', () => {
  const pt = getPredatorType('scene_queen');
  const parsed = parsePredatorGrants(pt);
  // Specialty choice has 3 options (Etiquette / Leadership / Streetwise…)
  const specChoice = parsed.choices.find((c) => /specialty/.test(c.id));
  assert.equal(specChoice.options.length, 3);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines.Dominate, 1);
  assert.equal(c.backgrounds.fame, 1);
  assert.equal(c.backgrounds.contacts, 1);
  assert.ok(c.flaws.some((f) => /Enemy/.test(f)));
});

test('siren: Fortitude or Presence; Looks Merit; Enemy', () => {
  const pt = getPredatorType('siren');
  const parsed = parsePredatorGrants(pt);
  const c = applyResolution(baseline(), pt, autoResolve(parsed));
  assert.equal(c.disciplines.Fortitude, 1);
  assert.ok(c.merits.some((m) => /Looks Merit/.test(m)));
  assert.ok(c.flaws.some((f) => /^Enemy/.test(f)));
});

// --- Idempotency: re-applying with the same baseline + resolutions
//     produces the same character, no accumulation ----------------
test('applyResolution is idempotent across runs from same baseline', () => {
  const pt = getPredatorType('alleycat');
  const parsed = parsePredatorGrants(pt);
  const resolutions = autoResolve(parsed);
  const a = applyResolution(baseline(), pt, resolutions);
  const b = applyResolution(baseline(), pt, resolutions);
  assert.deepEqual(a, b);
});

// --- Switching predators starts fresh from baseline -------------
test('switching predator type does not accumulate', () => {
  const baselineState = baseline();
  // Apply alleycat first
  const alleycatRes = autoResolve(parsePredatorGrants(getPredatorType('alleycat')));
  const afterAlleycat = applyResolution(baselineState, getPredatorType('alleycat'), alleycatRes);
  assert.equal(afterAlleycat.backgrounds.contacts, 3);
  // Switch to bagger — rebase from the *same baseline*, not from afterAlleycat
  const baggerRes = autoResolve(parsePredatorGrants(getPredatorType('bagger')));
  const afterBagger = applyResolution(baselineState, getPredatorType('bagger'), baggerRes);
  // Alleycat's contacts +3 must NOT carry over
  assert.equal(afterBagger.backgrounds.contacts || 0, 0);
  assert.equal(afterBagger.humanity, 7, 'humanity also reset (no -1 from Alleycat)');
});
