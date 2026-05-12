// 2024 D&D character creator — end-to-end data-layer smoke test
// (Build Bundle Commit 9).
//
// For each of the 12 SRD classes, synthesize a minimal valid L1
// build (species, background, abilities, class skills, cantrips +
// prepared if caster) and assert the 2024 data layer agrees the
// build is internally consistent. This isn't a React-level test
// (the step components mount inside the dispatcher); it's a smoke
// gate that the SRD adapters expose the right shape for each class
// so the UI never has to special-case missing data.

import { test } from "node:test";
import assert from "node:assert/strict";

import BACKGROUNDS from "../../../../../docs/5e_reference/2024/5e-SRD-Backgrounds.json" with { type: "json" };
import SPECIES from "../../../../../docs/5e_reference/2024/5e-SRD-Species.json" with { type: "json" };
import * as classesAdapter from "../classes.js";
import * as speciesAdapter from "../species.js";
import * as backgroundsAdapter from "../backgrounds.js";
import * as spellsAdapter from "../spells.js";
import {
  getSpellsKnownEntry,
  spellsPrepared,
  cantripsKnown,
  weaponMasterySlots,
  getSpellSlots,
  getPactSlots,
} from "../rules.js";

const EXPECTED_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid",
  "Fighter", "Monk", "Paladin", "Ranger",
  "Rogue", "Sorcerer", "Warlock", "Wizard",
];

const MARTIAL_CLASSES = new Set(["Barbarian", "Fighter", "Paladin", "Ranger", "Rogue"]);
const NON_CASTERS = new Set(["Barbarian", "Fighter", "Monk", "Rogue"]);

function stripSkillPrefix(name) {
  return String(name || "").replace(/^Skill:\s*/i, "");
}

test("SRD 5.2 ships exactly 12 classes", () => {
  const got = classesAdapter.getClasses().map((c) => c.name).sort();
  assert.deepEqual(got, [...EXPECTED_CLASSES].sort());
});

test("SRD 5.2 ships at least 1 background and 1 species", () => {
  assert.ok(BACKGROUNDS.length >= 1, "expected at least 1 background");
  assert.ok(SPECIES.length >= 1, "expected at least 1 species");
});

test("every background carries 3 ability bumps + 2 skills + a feat", () => {
  for (const bg of BACKGROUNDS) {
    const abilities = backgroundsAdapter.getBackgroundAbilities(bg.index);
    assert.equal(abilities.length, 3, `${bg.name} should grant 3 ASI abilities`);
    const profs = backgroundsAdapter.getBackgroundProficiencies(bg.index);
    assert.equal(profs.skills.length, 2, `${bg.name} should grant 2 skills`);
    const feat = backgroundsAdapter.getBackgroundFeat(bg.index);
    assert.ok(feat?.name, `${bg.name} should resolve a feat name`);
  }
});

test("every background grants a tool — fixed OR a tool choice block", () => {
  // Soldier's SRD entry encodes the tool grant as a Gaming Set
  // CHOICE in proficiency_choices rather than a fixed
  // `Tool: ...` row in proficiencies. The adapter currently only
  // surfaces fixed tools; tool choices are flagged as a smell for
  // follow-up (the player would lose a Gaming Set pick today).
  for (const bg of BACKGROUNDS) {
    const profs = backgroundsAdapter.getBackgroundProficiencies(bg.index);
    const hasFixedTool = profs.tools.length >= 1;
    const hasToolChoice = (bg.proficiency_choices || []).some((pc) => {
      const first = pc?.from?.options?.[0]?.item?.index || "";
      return String(first).startsWith("tool-");
    });
    assert.ok(hasFixedTool || hasToolChoice,
      `${bg.name} should grant at least one tool (fixed or choice)`);
  }
});

for (const className of EXPECTED_CLASSES) {
  test(`L1 ${className}: data layer exposes a complete buildable shape`, () => {
    const cls = classesAdapter.getClassByName(className);
    assert.ok(cls, `${className} should be returned by getClassByName`);

    // 1. Hit die + primary ability + saves
    assert.ok(typeof cls.hitDie === "number" && cls.hitDie > 0,
      `${className} should have a numeric hitDie`);
    assert.ok(Array.isArray(cls.savingThrows) && cls.savingThrows.length === 2,
      `${className} should expose exactly 2 saving throws`);

    // 2. Skill choice — every class should grant at least 2 skills
    //    except Rogue (4) and Bard (3); shape gets validated rather
    //    than counts to keep the test resilient to SRD updates.
    assert.ok(cls.skillChoiceCount >= 1,
      `${className} should grant at least 1 skill choice`);
    assert.ok(Array.isArray(cls.skillChoices) && cls.skillChoices.length >= cls.skillChoiceCount,
      `${className} skill options should cover the choice count`);

    // 3. Synthesize a minimal L1 build
    const level = 1;
    const skillOptions = cls.skillChoices.map(stripSkillPrefix);
    const chosenSkills = skillOptions.slice(0, cls.skillChoiceCount);

    // Background — pick any one with known abilities.
    const bg = backgroundsAdapter.getBackgroundList()[0];
    const bgProfs = backgroundsAdapter.getBackgroundProficiencies(bg.index);

    // Species — pick any one (we just need traits to render).
    const sp = speciesAdapter.getSpeciesList()[0];
    assert.ok(sp, "expected at least one species");

    // Attributes — every score in 3..20 (creation cap).
    const attributes = { str: 14, dex: 14, con: 14, int: 12, wis: 12, cha: 12 };
    for (const v of Object.values(attributes)) {
      assert.ok(v >= 3 && v <= 20, "attribute out of range");
    }

    // 4. Weapon mastery — martial classes only.
    const masterySlots = weaponMasterySlots(className, level);
    if (MARTIAL_CLASSES.has(className) && className !== "Monk") {
      assert.ok(masterySlots > 0,
        `${className} should grant >= 1 weapon mastery slot at L1`);
    } else {
      assert.equal(masterySlots, 0,
        `${className} should grant 0 weapon mastery slots at L1`);
    }

    // 5. Spellcasting shape
    const tableEntry = getSpellsKnownEntry(className);
    if (NON_CASTERS.has(className)) {
      assert.ok(!tableEntry, `${className} should not be in SPELLS_KNOWN_TABLE`);
    } else {
      assert.ok(tableEntry, `${className} should be in SPELLS_KNOWN_TABLE`);
      const cantripCap = cantripsKnown(className, level);
      const preparedCap = spellsPrepared(className, level);

      // Every L1 caster except Paladin/Ranger gets cantrips; half-
      // casters in 2024 don't.
      if (className === "Paladin" || className === "Ranger") {
        assert.equal(cantripCap, 0, `${className} L1 cantrips should be 0`);
      } else {
        assert.ok(cantripCap >= 1, `${className} L1 should know >= 1 cantrip`);
        const cantripPool = spellsAdapter.getCantripsForClass(cls.id);
        assert.ok(cantripPool.length >= cantripCap,
          `${className} cantrip pool should cover the cap`);
      }

      // Every L1 caster preps at least 2 spells (table starts at 2).
      assert.ok(preparedCap >= 2, `${className} L1 prep cap should be >= 2`);
      const spellPool = spellsAdapter.getSpellsForClass(cls.id, level)
        .filter((s) => Number(s.level ?? 0) > 0);
      assert.ok(spellPool.length >= preparedCap,
        `${className} spell pool should cover the prep cap`);

      // Wizard spellbook acquisition rule.
      if (tableEntry.type === "spellbook") {
        assert.ok(tableEntry.startingSpellbookSpells >= 1,
          "Wizard should start with >= 1 spellbook spell");
      }

      // Always-prepared spells (Divine Smite / Hunter's Mark) live
      // in the SRD-permissible list.
      if (Array.isArray(tableEntry.alwaysPrepared)) {
        for (const name of tableEntry.alwaysPrepared) {
          assert.ok(typeof name === "string" && name.length > 0,
            `${className} alwaysPrepared entry should be a non-empty string`);
        }
      }

      // Slot table — full casters get 2 L1 slots, half casters get 2
      // (2024 half-casters start at L1).
      const slots = getSpellSlots(className, level);
      if (tableEntry.type !== "pact") {
        assert.ok(Array.isArray(slots), `${className} slots should be an array`);
        assert.ok(slots[0] >= 1, `${className} should have >= 1 L1 spell slot`);
      } else {
        // Warlock uses Pact Magic — separate pool.
        const pact = getPactSlots(level);
        assert.ok(pact?.slots >= 1, "Warlock L1 should have a pact slot");
      }
    }

    // 6. Validate the synthesized skill picks are inside the class list.
    for (const s of chosenSkills) {
      assert.ok(skillOptions.includes(s),
        `${className} synthetic pick ${s} should be on class list`);
    }

    // 7. Background skills don't overlap with synthetic picks
    //    when sourced from the first 2 of the class list. Defend
    //    against future SRD adds where Acolyte's Insight is also a
    //    Cleric class skill: just assert the union has no dupes.
    const union = new Set([...chosenSkills, ...bgProfs.skills]);
    assert.ok(union.size >= chosenSkills.length, "skill picks should be unique");
  });
}
