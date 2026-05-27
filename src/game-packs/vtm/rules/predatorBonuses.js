// V5 predator-type grant + cost parser, choice-driven.
//
// The prototype's parser auto-applied multi-option grants (e.g.
// "Gain (•) Celerity or (•) Potence") and silently picked one,
// or worse — for "Specialty: X or Y" — pushed the literal OR
// string as a specialty. This file replaces that with a two-step
// pipeline:
//
//   parsePredatorGrants(predatorType)
//      → { required: [...], choices: [...] }
//
//   applyResolution(baseline, predatorType, resolutions)
//      → patched character
//
// `parsePredatorGrants` is pure and deterministic. It produces
//   - `required` entries: grants/costs with no user input
//   - `choices` entries: grants/costs that need the user to pick
//     between options or distribute a dot budget
//
// `applyResolution` overlays the required entries + the user's
// resolved choices onto a baseline character snapshot (which the
// caller — VTMCharacterCreator — snapshots on first entry to
// Step VI, then re-uses on every re-apply). Idempotent across
// predator changes: switching from Alleycat to Bagger and
// re-resolving produces the same character as picking Bagger from
// scratch.
//
// Resolution shape stored on character.predatorResolutions:
//   { [choice.id]: { picked: <option index> } }            // OR
//   { [choice.id]: { distribution: [<dots>, <dots>, …] } } // distribute

const KNOWN_BACKGROUNDS = new Set([
  'allies', 'contacts', 'fame', 'haven', 'herd', 'influence',
  'mask', 'mawla', 'resources', 'retainers', 'status',
]);

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
};

// Lower-cased background id from a corebook-cased name. Plural form
// (`Contact` → `contacts`) collapsed to the canonical key used in
// data/backgrounds.js.
function backgroundId(name) {
  let id = name.toLowerCase().trim();
  if (id === 'contact') id = 'contacts';
  if (id === 'resource') id = 'resources';
  return KNOWN_BACKGROUNDS.has(id) ? id : null;
}

function countBullets(str) {
  const m = str.match(/\(([•]+)\)/);
  return m ? m[1].length : 0;
}

// --- Effect builders ----------------------------------------------
// Each returns one of the {kind, ...} effect shapes referenced by
// `required` entries and by `choices[].options[]` /
// `choices[].targets[]`.
//
// For flaws and merits the payload is a structured object — either
// `{ value: '...verbatim flavor text...' }` (for required entries
// the corebook calls out by name, e.g. "Enemy (••) — Police") or
// `{ name, dots }` (for distribute-driven entries that share a
// category name and need to consolidate, e.g. Osiris's Enemies
// distribution). Verbatim and structured entries can coexist in
// the same array.

const discipline = (target, dots = 1) => ({ kind: 'discipline', target, dots });
const background = (target, dots) => ({ kind: 'background', target, dots });
const specialty  = (value)         => ({ kind: 'specialty',  value });
const humanity   = (delta)         => ({ kind: 'humanity',   delta });
const meritFromString = (value)    => ({ kind: 'merit', payload: { value } });
const meritFromName   = (name, dots) => ({ kind: 'merit', payload: { name, dots } });
const flawFromString  = (value)    => ({ kind: 'flaw',  payload: { value } });
const flawFromName    = (name, dots) => ({ kind: 'flaw',  payload: { name, dots } });

// --- Line classifier ----------------------------------------------
// Returns one of:
//   { kind: 'required', effect: <effect> }
//   { kind: 'choice', choice: { id, prompt, kind, ... } }
// Choice ids are derived from (predatorType.id, line index) so
// resolutions can persist across re-renders.

function parseLine(line, predatorId, idx) {
  const raw = line.trim();

  // ---- Specialty grants -----------------------------------------
  // "Specialty: X" — one option → required
  // "Specialty: X or Y" — two options → OR choice
  // "Specialty: X / Y / Z" — three slash-separated options → OR choice
  const specMatch = raw.match(/^Specialty:\s*(.+)$/i);
  if (specMatch) {
    const body = specMatch[1].trim();
    // Slash-separated wins first because Scene Queen's
    // "Etiquette / Leadership / Streetwise (scene)" uses ` / `.
    if (body.includes(' / ')) {
      const opts = body.split(' / ').map((s) => s.trim()).filter(Boolean);
      if (opts.length >= 2) {
        return {
          kind: 'choice',
          choice: {
            id: `${predatorId}-specialty-${idx}`,
            prompt: 'Choose your starting specialty',
            kind: 'or',
            options: opts.map((value) => specialty(value)),
          },
        };
      }
    }
    if (/\s+or\s+/i.test(body)) {
      const opts = body.split(/\s+or\s+/i).map((s) => s.trim()).filter(Boolean);
      if (opts.length === 2) {
        return {
          kind: 'choice',
          choice: {
            id: `${predatorId}-specialty-${idx}`,
            prompt: 'Choose your starting specialty',
            kind: 'or',
            options: opts.map((value) => specialty(value)),
          },
        };
      }
    }
    return { kind: 'required', effect: specialty(body) };
  }

  // ---- Humanity nudges (no options) -----------------------------
  if (/Lose three dots of Humanity/i.test(raw)) return { kind: 'required', effect: humanity(-3) };
  if (/Lose one dot of Humanity/i.test(raw))    return { kind: 'required', effect: humanity(-1) };
  if (/Gain one dot of Humanity/i.test(raw))    return { kind: 'required', effect: humanity(+1) };

  // ---- Discipline OR choice -------------------------------------
  // "Gain (•) X or (•) Y" — always one dot per side.
  // The "(in-clan)" trailing tag is informational only; it doesn't
  // change the effect, so we strip it before building the option.
  const eitherDisc = raw.match(/^Gain\s+\(•\)\s+(.+?)\s+or\s+\(•\)\s+(.+?)\s*$/i);
  if (eitherDisc) {
    const a = eitherDisc[1].trim().replace(/\s*\(in-clan\)\s*$/i, '');
    const b = eitherDisc[2].trim().replace(/\s*\(in-clan\)\s*$/i, '');
    return {
      kind: 'choice',
      choice: {
        id: `${predatorId}-discipline-${idx}`,
        prompt: 'Choose your starting discipline',
        kind: 'or',
        options: [discipline(a, 1), discipline(b, 1)],
      },
    };
  }

  // ---- Single-dot discipline grant (no choice) ------------------
  const singleDisc = raw.match(/^Gain\s+\(•\)\s+(.+?)\s*(?:\(in-clan\))?\s*$/i);
  if (singleDisc) {
    return { kind: 'required', effect: discipline(singleDisc[1].trim(), 1) };
  }

  // ---- "Spend N dots between X and Y" distribute choice ---------
  const spendBetween = raw.match(/^Spend\s+(\w+)\s+dots?\s+between\s+(.+?)\s+and\s+(.+?)\s*$/i);
  if (spendBetween) {
    const budget = WORD_NUMBERS[spendBetween[1].toLowerCase()] ?? parseInt(spendBetween[1], 10) ?? 0;
    const a = spendBetween[2].trim();
    const b = spendBetween[3].trim();
    // Targets are either backgrounds (Fame/Herd/etc.) or
    // flaws (Enemies / Mythic Flaws). Inspect both sides — if
    // both resolve to backgrounds, target.kind = 'background';
    // otherwise treat each side as a flaw category.
    const aBg = backgroundId(a);
    const bBg = backgroundId(b);
    const targets = (aBg && bBg)
      ? [background(aBg, 0), background(bBg, 0)]
      : [{ kind: 'flaw', target: a, dots: 0 }, { kind: 'flaw', target: b, dots: 0 }];
    return {
      kind: 'choice',
      choice: {
        id: `${predatorId}-distribute-${idx}`,
        prompt: `Distribute ${budget} dots between ${a} and ${b}`,
        kind: 'distribute',
        budget,
        targets: targets.map((t) => ({ ...t, max: 3, label: t.target })),
      },
    };
  }

  // ---- Background grants ----------------------------------------
  // "Contact (•••)", "Herd (••)", "Resources (•)", "Fame (•)
  // within the scene", "Contact (•)". Both numbered-bullet count
  // and known-background name are required.
  const bgMatch = raw.match(/^(Allies|Contacts?|Fame|Haven|Herd|Influence|Mask|Mawla|Resources?|Retainers|Status)\s*\(([•]+)\)/i);
  if (bgMatch) {
    const id = backgroundId(bgMatch[1]);
    if (id) return { kind: 'required', effect: background(id, bgMatch[2].length) };
  }

  // ---- Feeding lines --------------------------------------------
  // V5 distinguishes feeding merits (Iron Gullet, Bloodhound) from
  // feeding flaws (Vegan). Heuristic: if the line has a "—" with a
  // trailing dietary restriction descriptor, treat as flaw;
  // otherwise treat as merit. The current data only has one flaw
  // form (Farmer's "Feeding (••) — Vegan").
  if (/^Feeding\s*\(/i.test(raw)) {
    if (/—\s*Vegan/i.test(raw)) return { kind: 'required', effect: flawFromString(raw) };
    return { kind: 'required', effect: meritFromString(raw) };
  }

  // ---- Other merits ---------------------------------------------
  if (/^Looks Merit\s*\(/i.test(raw)) {
    return { kind: 'required', effect: meritFromString(raw) };
  }

  // ---- Flaws -----------------------------------------------------
  if (/^Enemy\s*\(/i.test(raw))         return { kind: 'required', effect: flawFromString(raw) };
  if (/^Dark Secret\s*\(/i.test(raw))   return { kind: 'required', effect: flawFromString(raw) };
  if (/^Prey Exclusion\s*\(/i.test(raw)) return { kind: 'required', effect: flawFromString(raw) };

  // ---- Unrecognized line — surface as a required raw note --------
  // Better than a silent drop: the Embrace summary will show this
  // so the GM/player can deal with it manually.
  return { kind: 'required', effect: { kind: 'raw', value: raw } };
}

/**
 * Parse every grant + cost line on a predator type into a
 * structured choice tree.
 *
 * @param {Object} predatorType  Entry from PREDATOR_TYPES
 * @returns {{ required: Effect[], choices: Choice[] }}
 */
export function parsePredatorGrants(predatorType) {
  if (!predatorType) return { required: [], choices: [] };
  const required = [];
  const choices = [];
  const lines = [...(predatorType.grants || []), ...(predatorType.cost || [])];
  lines.forEach((line, idx) => {
    const parsed = parseLine(line, predatorType.id, idx);
    if (parsed.kind === 'required') required.push(parsed.effect);
    else choices.push(parsed.choice);
  });
  return { required, choices };
}

// --- Resolution completeness check --------------------------------

/**
 * Whether the user has fully resolved every choice. The Step VI
 * NavBar uses this to gate Continue.
 */
export function isResolutionComplete(parsedOrPredatorType, resolutions = {}) {
  const parsed = parsedOrPredatorType?.choices
    ? parsedOrPredatorType
    : parsePredatorGrants(parsedOrPredatorType);
  if (!parsed) return false;
  for (const choice of parsed.choices) {
    const r = resolutions[choice.id];
    if (!r) return false;
    if (choice.kind === 'or') {
      if (typeof r.picked !== 'number') return false;
      if (r.picked < 0 || r.picked >= choice.options.length) return false;
    } else if (choice.kind === 'distribute') {
      if (!Array.isArray(r.distribution)) return false;
      if (r.distribution.length !== choice.targets.length) return false;
      const sum = r.distribution.reduce((a, b) => a + b, 0);
      if (sum !== choice.budget) return false;
      for (let i = 0; i < r.distribution.length; i++) {
        const d = r.distribution[i];
        if (d < 0 || d > (choice.targets[i].max ?? 3)) return false;
      }
    }
  }
  return true;
}

// --- Overlay computation ------------------------------------------

const cap = (n, m) => Math.min(m, Math.max(0, n));

function applyEffectToAccum(acc, effect) {
  switch (effect.kind) {
    case 'discipline':
      acc.disciplines[effect.target] = (acc.disciplines[effect.target] || 0) + effect.dots;
      break;
    case 'background':
      if (effect.dots > 0) {
        acc.backgrounds[effect.target] = (acc.backgrounds[effect.target] || 0) + effect.dots;
      }
      break;
    case 'specialty':
      acc.specialties.push(effect.value);
      break;
    case 'humanity':
      acc.humanityDelta += effect.delta;
      break;
    case 'merit':
      acc.merits.push({ ...effect.payload });
      break;
    case 'flaw':
      acc.flaws.push({ ...effect.payload });
      break;
    case 'raw':
      // Surface in flaws as a verbatim entry so the GM/player sees
      // something on Embrace rather than the line being dropped.
      acc.flaws.push({ value: `(Unparsed) ${effect.value}` });
      break;
    default:
      break;
  }
}

// Merge entries that share a `name` field, summing their `dots`.
// Verbatim entries (no `name`, just `value`) pass through unchanged
// because there's no canonical key to group them by — Bagger's
// "Enemy (••) — Police or escaped victim" and Scene Queen's
// "Enemy (••) — A rival in the scene" are distinct flaws even
// though they share the "Enemy" prefix, so we don't merge them.
//
// Within-category only: Bagger's `Enemy` (flaw) and Scene Queen's
// `Enemy` (flaw) live in the same array but on different characters,
// never on the same character at the same time.
function consolidateByName(entries) {
  const namedFirst = new Map();
  const order = [];
  const verbatim = [];
  for (const entry of entries) {
    if (entry.name) {
      const prev = namedFirst.get(entry.name);
      if (prev) {
        prev.dots = (prev.dots || 0) + (entry.dots || 0);
      } else {
        const copy = { ...entry };
        namedFirst.set(entry.name, copy);
        order.push(copy);
      }
    } else {
      verbatim.push(entry);
    }
  }
  return [...verbatim, ...order];
}

function computeOverlay(parsed, resolutions) {
  const acc = {
    disciplines: {}, backgrounds: {},
    specialties: [], merits: [], flaws: [],
    humanityDelta: 0,
  };

  for (const effect of parsed.required) {
    applyEffectToAccum(acc, effect);
  }

  for (const choice of parsed.choices) {
    const r = resolutions[choice.id];
    if (!r) continue;
    if (choice.kind === 'or' && typeof r.picked === 'number') {
      const opt = choice.options[r.picked];
      if (opt) applyEffectToAccum(acc, opt);
    } else if (choice.kind === 'distribute' && Array.isArray(r.distribution)) {
      r.distribution.forEach((dots, i) => {
        const target = choice.targets[i];
        if (!target || dots <= 0) return;
        if (target.kind === 'background') {
          applyEffectToAccum(acc, background(target.target, dots));
        } else if (target.kind === 'flaw') {
          applyEffectToAccum(acc, flawFromName(target.target, dots));
        } else if (target.kind === 'merit') {
          applyEffectToAccum(acc, meritFromName(target.target, dots));
        }
      });
    }
  }

  // Final consolidation pass — sum dots across same-name entries.
  // Backgrounds are already a {[name]: dots} map and don't need
  // this step; flaws and merits are arrays where the same `name`
  // could legitimately appear more than once (one required entry +
  // one distribute entry, or two distribute entries from different
  // choices on the same predator).
  acc.flaws  = consolidateByName(acc.flaws);
  acc.merits = consolidateByName(acc.merits);

  return acc;
}

// --- Final apply --------------------------------------------------

/**
 * Take a baseline character (user's hand-allocated state, before
 * any predator bonuses), the predator type, and the user's
 * resolutions, and produce the patched character with bonuses
 * overlaid.
 *
 * Pure / idempotent — calling twice with the same arguments
 * produces the same result. Calling with a different predatorType
 * or resolutions starts from the same baseline (the caller passes
 * the *baseline*, not the previously-patched character) so prior
 * predator effects never leak.
 *
 * @param {Object} baseline    User-hand-allocated character snapshot
 * @param {Object} predatorType
 * @param {Object} resolutions { [choice.id]: { picked|distribution } }
 * @returns {Object}           New character object
 */
export function applyResolution(baseline, predatorType, resolutions = {}) {
  if (!baseline) return baseline;
  if (!predatorType) return baseline;

  const parsed = parsePredatorGrants(predatorType);
  const overlay = computeOverlay(parsed, resolutions);

  const disciplines = { ...(baseline.disciplines || {}) };
  for (const [d, dots] of Object.entries(overlay.disciplines)) {
    disciplines[d] = cap((disciplines[d] || 0) + dots, 5);
  }

  const backgrounds = { ...(baseline.backgrounds || {}) };
  for (const [b, dots] of Object.entries(overlay.backgrounds)) {
    backgrounds[b] = cap((backgrounds[b] || 0) + dots, 3);
  }

  const humanity = cap((baseline.humanity ?? 7) + overlay.humanityDelta, 10);

  return {
    ...baseline,
    disciplines,
    backgrounds,
    humanity,
    specialties: [...(baseline.specialties || []), ...overlay.specialties],
    merits:      [...(baseline.merits      || []), ...overlay.merits],
    flaws:       [...(baseline.flaws       || []), ...overlay.flaws],
  };
}
