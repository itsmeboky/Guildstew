// Locks the CLASS_PRIMARY_ABILITY shape semantics for both parallel rules
// registries (src/components/dnd5e/dnd5eRules.js and
// src/game-packs/dnd5e/data/rules.js).
//
// The multiclass-prereq validator (slated for a later commit) depends on the
// AND vs OR distinction being preserved at the data layer. If a future
// refactor flattens this to a bare array or drops the discriminator, these
// tests fail loudly before that drift can break Paladin / Fighter / Monk /
// Ranger prereq checks downstream.
//
// Run with: node --test src/components/dnd5e/__tests__/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as primary from '../dnd5eRules.js';
import * as mirror from '../../../game-packs/dnd5e/data/rules.js';

const ALL_PHB_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter',   'Monk', 'Paladin', 'Ranger',
  'Rogue',     'Sorcerer', 'Warlock', 'Wizard',
];

test('Fighter primary ability is OR (one of STR/DEX)', () => {
  const entry = primary.CLASS_PRIMARY_ABILITY.Fighter;
  assert.deepEqual(entry.abilities, ['str', 'dex']);
  assert.equal(entry.mode, 'or');
  assert.equal(primary.primaryAbilityDisplay('Fighter'), 'Strength or Dexterity');
});

test('Paladin primary ability is AND (both STR and CHA)', () => {
  const entry = primary.CLASS_PRIMARY_ABILITY.Paladin;
  assert.deepEqual(entry.abilities, ['str', 'cha']);
  assert.equal(entry.mode, 'and');
  assert.equal(primary.primaryAbilityDisplay('Paladin'), 'Strength & Charisma');
});

test('Monk primary ability is AND (both DEX and WIS)', () => {
  const entry = primary.CLASS_PRIMARY_ABILITY.Monk;
  assert.deepEqual(entry.abilities, ['dex', 'wis']);
  assert.equal(entry.mode, 'and');
  assert.equal(primary.primaryAbilityDisplay('Monk'), 'Dexterity & Wisdom');
});

test('Ranger primary ability is AND (both DEX and WIS)', () => {
  const entry = primary.CLASS_PRIMARY_ABILITY.Ranger;
  assert.deepEqual(entry.abilities, ['dex', 'wis']);
  assert.equal(entry.mode, 'and');
  assert.equal(primary.primaryAbilityDisplay('Ranger'), 'Dexterity & Wisdom');
});

test('Barbarian primary ability is single (STR only)', () => {
  const entry = primary.CLASS_PRIMARY_ABILITY.Barbarian;
  assert.deepEqual(entry.abilities, ['str']);
  assert.equal(entry.mode, 'single');
  assert.equal(primary.primaryAbilityDisplay('Barbarian'), 'Strength');
});

test('Every PHB class has a valid CLASS_PRIMARY_ABILITY entry', () => {
  for (const cls of ALL_PHB_CLASSES) {
    const entry = primary.CLASS_PRIMARY_ABILITY[cls];
    assert.ok(entry, `${cls} missing entry`);
    assert.ok(Array.isArray(entry.abilities), `${cls} abilities is not an array`);
    assert.ok(entry.abilities.length >= 1, `${cls} abilities is empty`);
    assert.ok(
      ['single', 'or', 'and'].includes(entry.mode),
      `${cls} mode='${entry.mode}' is not single|or|and`,
    );
    // 'single' must have exactly one ability; 'or'/'and' must have two+
    if (entry.mode === 'single') {
      assert.equal(entry.abilities.length, 1, `${cls} single-mode must have 1 ability`);
    } else {
      assert.ok(entry.abilities.length >= 2, `${cls} ${entry.mode}-mode needs 2+ abilities`);
    }
  }
});

test('primaryAbilityDisplay returns empty for unknown class', () => {
  assert.equal(primary.primaryAbilityDisplay('Wereferret'), '');
  assert.equal(primary.primaryAbilityDisplay(undefined), '');
});

test('Mirror registry (game-packs/dnd5e/data/rules.js) has identical shape', () => {
  for (const cls of ALL_PHB_CLASSES) {
    const a = primary.CLASS_PRIMARY_ABILITY[cls];
    const b = mirror.CLASS_PRIMARY_ABILITY[cls];
    assert.ok(b, `${cls} missing in mirror registry`);
    assert.deepEqual(b.abilities, a.abilities, `${cls} abilities drift`);
    assert.equal(b.mode, a.mode, `${cls} mode drift`);
    assert.equal(
      mirror.primaryAbilityDisplay(cls),
      primary.primaryAbilityDisplay(cls),
      `${cls} display drift between registries`,
    );
  }
});
