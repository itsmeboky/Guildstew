// World Lore import — readable color defaults tests.
// Stripping default/black text colors (so imported content inherits the
// dark .lore-prose theme) while preserving any intentional color.

import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeImportedColors, isDefaultBlack } from "../normalizeImportedColors.js";

test("isDefaultBlack flags black / near-black, spares real colors", () => {
  for (const black of ["#000000", "#000", "rgb(0,0,0)", "black", "#111111", "#202020", "rgb(16,16,16)"]) {
    assert.equal(isDefaultBlack(black), true, `${black} should be default-black`);
  }
  for (const real of ["#ffffff", "#C0392B", "#F2C037", "#37F2D1", "#000080", "#800000", "rgb(192,57,43)"]) {
    assert.equal(isDefaultBlack(real), false, `${real} should be preserved`);
  }
});

test("strips Google's forced black on a span so it inherits the theme", () => {
  const out = normalizeImportedColors('<span style="color:#000000">Hello</span>');
  assert.equal(out, "<span>Hello</span>");
});

test("strips black in various formats", () => {
  assert.equal(normalizeImportedColors('<p style="color:#000">x</p>'), "<p>x</p>");
  assert.equal(normalizeImportedColors('<p style="color: rgb(0, 0, 0)">x</p>'), "<p>x</p>");
  assert.equal(normalizeImportedColors('<p style="color:black">x</p>'), "<p>x</p>");
  assert.equal(normalizeImportedColors('<h2 style="color:#1a1a1a">T</h2>'), "<h2>T</h2>");
});

test("preserves intentional non-black colors exactly", () => {
  assert.match(normalizeImportedColors('<span style="color:#C0392B">red</span>'), /color: #C0392B/i);
  assert.match(normalizeImportedColors('<span style="color:#F2C037">gold</span>'), /color: #F2C037/i);
  // dark-but-saturated colors are intentional, not "black"
  assert.match(normalizeImportedColors('<span style="color:#000080">navy</span>'), /color: #000080/i);
});

test("only the color property is stripped; other styles survive", () => {
  const out = normalizeImportedColors(
    '<span style="color:#000000;font-weight:700;background-color:#000000">x</span>',
  );
  assert.doesNotMatch(out, /(^|;|\s)color:/i, "text color removed");
  assert.match(out, /font-weight: 700/i, "font-weight kept");
  assert.match(out, /background-color: #000000/i, "background-color kept (not a text color)");
});

test("mixed declarations: black color dropped, rest kept and re-joined", () => {
  const out = normalizeImportedColors('<p style="margin:0;color:#000000;font-style:italic">x</p>');
  assert.equal(out, '<p style="margin: 0; font-style: italic">x</p>');
});

test("no-op when there is no color or no style", () => {
  assert.equal(normalizeImportedColors("<p>plain</p>"), "<p>plain</p>");
  assert.equal(normalizeImportedColors('<p style="font-weight:700">x</p>'), '<p style="font-weight: 700">x</p>');
  assert.equal(normalizeImportedColors(""), "");
  assert.equal(normalizeImportedColors(null), "");
});
