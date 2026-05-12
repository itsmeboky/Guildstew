// ClassStep2024 — selection wiring smoke test.
//
// Locks the production blocker the user reported: "players can't
// select a class" on the 2024 pack. The fix made the class picker
// a clickable card grid (matching SpeciesStep2024's pattern); this
// test asserts the data path the click handler depends on actually
// works for every class.
//
// Mirrors the equivalent 2014 test surface but doesn't mount the
// React component (node:test can't run JSX). Instead we exercise
// the underlying contract every click depends on:
//   1. getGamePack("dnd5e_2024").getClasses() returns 12 classes
//   2. each class has the fields the card renders
//   3. simulating handleClassSelect(cls.name) produces character
//      data the 'class' step validator accepts.

import { test } from "node:test";
import assert from "node:assert/strict";

import { getGamePack } from "../../../data/games/index.js";

const adapter = getGamePack("dnd5e_2024");

test("2024 class adapter exposes getClasses on the game-pack adapter", () => {
  assert.equal(typeof adapter.getClasses, "function",
    "getClasses must be a function on the adapter — without it the picker can't render");
});

test("2024 class picker has all 12 SRD classes available", () => {
  const classes = adapter.getClasses();
  assert.equal(classes.length, 12, `expected 12 classes, got ${classes.length}`);
});

test("each 2024 class card has the fields the picker renders", () => {
  for (const cls of adapter.getClasses()) {
    assert.ok(cls.id && typeof cls.id === "string", `${cls.name}: missing id`);
    assert.ok(cls.name && typeof cls.name === "string", `${cls.id}: missing name`);
    assert.ok(Number.isFinite(cls.hitDie) && cls.hitDie > 0,
      `${cls.name}: missing/invalid hitDie`);
    assert.ok(Array.isArray(cls.savingThrows) && cls.savingThrows.length === 2,
      `${cls.name}: should have exactly 2 saving throws`);
    assert.ok(cls.skillChoiceCount >= 1,
      `${cls.name}: should grant >=1 skill choice`);
    assert.ok(Array.isArray(cls.skillChoices) && cls.skillChoices.length >= cls.skillChoiceCount,
      `${cls.name}: skill options should cover the choice count`);
  }
});

// Mirror the validator in CharacterCreator.jsx (case 'class').
// If this changes, this test should change in lockstep.
function classStepValidator(characterData) {
  return Boolean(characterData.class && characterData.alignment);
}

// Mirror the click handler in ClassStep2024.jsx.
function simulateClassSelect(characterData, className) {
  const cls = adapter.getClasses().find((c) => c.name === className);
  if (!cls) return characterData;
  return {
    ...characterData,
    class: cls.name,
    features: [],
    _gamePackClassId: cls.id,
  };
}

test("clicking any of the 12 class cards produces a validator-passing state", () => {
  // Mirrors CharacterCreator's initial state — alignment defaults
  // to "True Neutral" so the validator only gates on `class`.
  const initial = {
    gamePack: "dnd5e_2024",
    alignment: "True Neutral",
    class: "",
  };
  for (const cls of adapter.getClasses()) {
    const next = simulateClassSelect(initial, cls.name);
    assert.equal(next.class, cls.name, `${cls.name}: class field not set`);
    assert.equal(next._gamePackClassId, cls.id, `${cls.name}: _gamePackClassId not set`);
    assert.ok(Array.isArray(next.features), `${cls.name}: features should be seeded as array`);
    assert.equal(classStepValidator(next), true,
      `${cls.name}: class-step validator should pass after selection`);
  }
});

test("the validator rejects empty class even with alignment set", () => {
  assert.equal(
    classStepValidator({ class: "", alignment: "True Neutral" }),
    false,
    "empty class should fail validation",
  );
});

test("the validator rejects valid class with empty alignment", () => {
  assert.equal(
    classStepValidator({ class: "Wizard", alignment: "" }),
    false,
    "empty alignment should fail validation",
  );
});
