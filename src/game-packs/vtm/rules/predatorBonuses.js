// Applies a V5 predator type's grants + costs to the character
// object. The prototype rendered the bonus strings as flavor text
// only — production has to actually mutate the character state so
// the Embrace step reflects the right Humanity, the right
// background dots, the right merits/flaws.
//
// The strings come straight from PREDATOR_TYPES in
// ../data/predatorTypes.js. They follow a small set of patterns
// the V5 corebook uses for every predator type:
//
//   "Specialty: X"                       → specialties += [X]
//   "Gain (•) <Discipline>"              → disciplines[<D>] += 1 (cap 5)
//   "Gain (•) <D> or (•) <D2>"           → ambiguous; queued as a player pick
//   "Contact (•••)"                      → backgrounds.contacts += 3 (cap 3)
//   "Herd (••)" / "Resources (•)" etc.   → backgrounds.<id> += N (cap 3)
//   "Feeding (••) <flavor>"              → merits += ["Feeding (•••) flavor"]
//   "Looks Merit (••) — X"               → merits += [verbatim string]
//   "Fame (•) within the scene"          → backgrounds.fame += 1
//   "Gain one dot of Humanity"           → humanity = (humanity ?? 7) + 1
//   "Lose one dot of Humanity"           → humanity -= 1
//   "Lose three dots of Humanity"        → humanity -= 3
//   "Enemy (•) — X" / "Dark Secret (•)"  → flaws += [verbatim]
//   "Prey Exclusion (•) — X"             → flaws += [verbatim]
//   "Spend three dots between X and Y"   → player-choice prompts queued
//
// Strings that don't match any pattern (rare, but possible if the
// data file grows) get pushed onto pendingChoices with a `raw`
// label so the GM / player can resolve them by hand.

const KNOWN_BACKGROUNDS = [
  'allies', 'contacts', 'fame', 'haven', 'herd', 'influence',
  'mask', 'mawla', 'resources', 'retainers', 'status',
];

// Strip the ornamental bullet dots and count them.
function dotsFromBullets(str) {
  const m = str.match(/\(([•]+)\)/);
  return m ? m[1].length : 0;
}

function classifyDot(line) {
  // Specialty grants
  const specialty = line.match(/^Specialty:\s*(.+)$/i);
  if (specialty) return { kind: 'specialty', value: specialty[1].trim() };

  // Humanity nudges
  if (/Lose three dots of Humanity/i.test(line)) return { kind: 'humanity', delta: -3 };
  if (/Lose one dot of Humanity/i.test(line))    return { kind: 'humanity', delta: -1 };
  if (/Gain one dot of Humanity/i.test(line))    return { kind: 'humanity', delta: +1 };

  // Either/or discipline grants — queued as a pick
  const eitherDisc = line.match(/Gain\s+\(•\)\s+([\w\s]+?)\s+or\s+\(•\)\s+(.+?)(?:\s*\(in-clan\))?$/i);
  if (eitherDisc) {
    const choices = [eitherDisc[1].trim(), eitherDisc[2].trim()].map((s) => s.replace(/\s*\(in-clan\)\s*$/i, ''));
    return { kind: 'choice', label: 'Discipline', options: choices.map((opt) => ({ kind: 'discipline', value: opt, dots: 1 })) };
  }

  // Plain single-dot discipline grant
  const singleDisc = line.match(/Gain\s+\(•\)\s+(.+?)\s*(?:\(in-clan\))?\s*$/i);
  if (singleDisc) return { kind: 'discipline', value: singleDisc[1].trim(), dots: 1 };

  // Either/or background — Fame and Herd, etc.
  const spendBetween = line.match(/Spend\s+(\w+)\s+dots?\s+between\s+(.+?)\s+and\s+(.+?)$/i);
  if (spendBetween) {
    const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const total = wordToNum[spendBetween[1].toLowerCase()] || parseInt(spendBetween[1], 10) || 0;
    return {
      kind: 'choice',
      label: `Spend ${total} dots between ${spendBetween[2]} and ${spendBetween[3]}`,
      total,
      options: [spendBetween[2], spendBetween[3]].map((name) => ({ name, id: name.toLowerCase() })),
    };
  }

  // Background grants — "Contact (•••)", "Herd (••)", "Resources (•)", etc.
  // Also handles "Contact (•••) — Criminal" trailing flavor.
  const bgMatch = line.match(/^(Allies|Contacts?|Contact|Fame|Haven|Herd|Influence|Mask|Mawla|Resources?|Retainers|Status)\s*\(([•]+)\)/i);
  if (bgMatch) {
    let id = bgMatch[1].toLowerCase();
    if (id === 'contact') id = 'contacts';
    if (id === 'resource') id = 'resources';
    if (KNOWN_BACKGROUNDS.includes(id)) {
      return { kind: 'background', id, dots: bgMatch[2].length };
    }
  }
  // "Fame (•) within the scene" — same pattern.
  if (/^Fame\s*\(([•]+)\)/i.test(line)) {
    const m = line.match(/^Fame\s*\(([•]+)\)/i);
    return { kind: 'background', id: 'fame', dots: m[1].length };
  }

  // Feeding merit — V5 calls these out as "Feeding (•••) Iron Gullet", etc.
  if (/^Feeding\s*\(/i.test(line)) {
    return { kind: 'merit', value: line };
  }

  // Looks Merit, generic merits
  if (/^Looks Merit\s*\(/i.test(line)) {
    return { kind: 'merit', value: line };
  }

  // Costs that read as flaws.
  if (/^Enemy\s*\(/i.test(line)) return { kind: 'flaw', value: line };
  if (/^Dark Secret\s*\(/i.test(line)) return { kind: 'flaw', value: line };
  if (/^Prey Exclusion\s*\(/i.test(line)) return { kind: 'flaw', value: line };

  // Anything else gets queued for human resolution.
  return { kind: 'raw', value: line };
}

function clampedAdd(prev, addend, cap) {
  return Math.min(cap, (prev || 0) + addend);
}

// Returns the next character state after applying every grant/cost
// the predator type carries. Pure — does not mutate the input.
// Re-running with the same predator id is a no-op-ish noop because
// the second call still re-applies bonuses; the caller is
// responsible for only calling once per predator pick (see
// VTMCharacterCreator.jsx, which calls on advance from Step VI).
export function applyPredatorBonuses(character, predatorType) {
  if (!predatorType) return character;

  const next = {
    ...character,
    specialties: [...(character.specialties || [])],
    merits: [...(character.merits || [])],
    flaws: [...(character.flaws || [])],
    pendingChoices: [...(character.pendingChoices || [])],
    disciplines: { ...(character.disciplines || {}) },
    backgrounds: { ...(character.backgrounds || {}) },
    humanity: character.humanity != null ? character.humanity : 7,
    predatorBonusesApplied: predatorType.id,
  };

  const lines = [...(predatorType.grants || []), ...(predatorType.cost || [])];

  for (const raw of lines) {
    const eff = classifyDot(raw);
    switch (eff.kind) {
      case 'specialty':
        next.specialties.push(eff.value);
        break;
      case 'humanity':
        next.humanity = Math.max(0, Math.min(10, next.humanity + eff.delta));
        break;
      case 'discipline':
        next.disciplines[eff.value] = clampedAdd(next.disciplines[eff.value], eff.dots, 5);
        break;
      case 'background':
        next.backgrounds[eff.id] = clampedAdd(next.backgrounds[eff.id], eff.dots, 3);
        break;
      case 'merit':
        next.merits.push(eff.value);
        break;
      case 'flaw':
        next.flaws.push(eff.value);
        break;
      case 'choice':
        // Either/or grant — player has to resolve before save. The
        // VTMCharacterCreator surfaces this as a UI prompt before
        // advancing past Step VI.
        next.pendingChoices.push({ source: predatorType.id, ...eff });
        break;
      case 'raw':
      default:
        next.pendingChoices.push({ source: predatorType.id, kind: 'raw', value: eff.value, label: 'Apply manually' });
    }
  }

  return next;
}
