#!/usr/bin/env node
/**
 * Generate the 30 Druidic rune SVGs used by the language-gated
 * world-lore editor. Output: ./generated/druidic-symbols/*.svg.
 *
 * Every SVG:
 *   - viewBox="0 0 64 64"
 *   - fill="none" on the root
 *   - strokes use currentColor so CSS-mask tinting just works
 *   - stroke-width=2, round caps + joins for a carved-rune feel
 *   - transparent background, no <text>
 *
 * The 30 symbols prioritise recognisability over stylisation —
 * a "leaf" reads as a leaf, a "paw print" as a paw print. Shapes are
 * built from plain SVG elements (path, circle, polyline, polygon,
 * ellipse) so they compose cleanly under currentColor.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "generated", "druidic-symbols");
fs.mkdirSync(OUT_DIR, { recursive: true });

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const SVG_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const SVG_CLOSE = "</svg>";

function wrap(inner) {
  return `${HEADER}\n${SVG_OPEN}\n${inner}\n${SVG_CLOSE}\n`;
}

// Reusable primitives
const dot = (cx, cy, r = 2) => `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;
const circle = (cx, cy, r) => `  <circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const line = (x1, y1, x2, y2) => `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const pth = (d) => `  <path d="${d}"/>`;
const poly = (pts) => `  <polyline points="${pts}"/>`;
const polygon = (pts) => `  <polygon points="${pts}"/>`;

const SYMBOLS = {
  // ───────────── Navigation & Territory ─────────────
  "safe-path": [
    dot(8, 48), dot(56, 16),
    pth("M 8 48 C 20 44 26 24 40 24 C 48 24 52 18 56 16"),
  ],
  "danger-path": [
    dot(8, 48), dot(56, 16),
    poly("8,48 16,32 24,44 32,28 40,40 48,24 56,16"),
  ],
  "water-source": [
    pth("M 8 24 Q 16 18 24 24 Q 32 30 40 24 Q 48 18 56 24"),
    pth("M 8 34 Q 16 28 24 34 Q 32 40 40 34 Q 48 28 56 34"),
    pth("M 8 44 Q 16 38 24 44 Q 32 50 40 44 Q 48 38 56 44"),
  ],
  "shelter-ahead": [
    pth("M 12 44 Q 32 16 52 44"),
    line(12, 44, 52, 44),
    dot(32, 50, 2),
  ],
  "sacred-ground": [
    circle(32, 32, 14),
    circle(32, 32, 5),
    // Radiating sun rays
    line(32, 10, 32, 16),
    line(32, 48, 32, 54),
    line(10, 32, 16, 32),
    line(48, 32, 54, 32),
    line(15, 15, 20, 20),
    line(44, 44, 49, 49),
    line(15, 49, 20, 44),
    line(44, 20, 49, 15),
  ],
  "corrupted-land": [
    circle(32, 32, 14),
    // cracks
    line(32, 18, 28, 28),
    line(28, 28, 34, 34),
    line(34, 34, 30, 46),
    // outer thorns
    line(32, 14, 32, 8),
    line(18, 20, 13, 15),
    line(46, 20, 51, 15),
    line(18, 44, 13, 49),
    line(46, 44, 51, 49),
    line(48, 32, 54, 32),
    line(16, 32, 10, 32),
  ],
  "fey-crossing": [
    circle(24, 32, 14),
    circle(40, 32, 14),
    // accent dots at the vesica points
    dot(32, 20), dot(32, 44),
  ],
  "ley-line": [
    line(8, 56, 56, 8),
    // diamonds along the line — each a rotated square
    polygon("16,48 20,44 24,48 20,52"),
    polygon("32,32 36,28 40,32 36,36"),
    polygon("48,16 52,12 56,16 52,20"),
  ],
  "migration-route": [
    pth("M 8 44 Q 20 28 32 34"),
    pth("M 20 36 Q 32 20 44 26"),
    pth("M 32 28 Q 44 12 56 18"),
    // chevrons along the arc
    poly("14,40 18,36 22,40"),
    poly("26,32 30,28 34,32"),
    poly("42,22 46,18 50,22"),
  ],
  "territorial-boundary": [
    pth("M 8 40 Q 32 16 56 40", ),
    // dashed hash marks crossing the arc
    line(16, 34, 16, 44),
    line(26, 26, 26, 36),
    line(38, 26, 38, 36),
    line(48, 34, 48, 44),
  ],

  // ───────────── Warnings & Information ─────────────
  "predator-territory": [
    line(14, 14, 28, 48),
    line(24, 12, 38, 46),
    line(34, 14, 48, 48),
  ],
  "poisonous-plants": [
    // leaf outline
    pth("M 32 10 Q 50 20 42 44 Q 32 56 22 44 Q 14 20 32 10 Z"),
    // x through it
    line(20, 20, 44, 44),
    line(44, 20, 20, 44),
  ],
  "healing-herbs": [
    pth("M 32 10 Q 50 20 42 44 Q 32 56 22 44 Q 14 20 32 10 Z"),
    // plus inside
    line(32, 22, 32, 38),
    line(24, 30, 40, 30),
  ],
  "rare-ingredient": [
    // four-point star
    poly("32,10 35,26 50,29 35,32 32,48 29,32 14,29 29,26 32,10"),
    // sprout beneath
    line(32, 52, 32, 60),
    circle(32, 52, 2),
    pth("M 28 56 Q 32 50 36 56"),
  ],
  "storm-coming": [
    // cloud
    pth("M 14 26 Q 14 18 22 18 Q 24 12 32 14 Q 40 10 46 18 Q 54 18 54 26 Q 54 32 46 32 L 22 32 Q 14 32 14 26 Z"),
    // lightning
    poly("30,34 26,44 32,44 28,54"),
  ],
  "seasonal-danger": [
    // spiral
    pth("M 32 32 m -4 0 a 4 4 0 1 1 8 0 a 8 8 0 1 1 -16 0 a 12 12 0 1 1 24 0 a 16 16 0 1 1 -32 0"),
    dot(32, 32, 2),
  ],
  "undead-presence": [
    // skull circle
    circle(32, 26, 14),
    // eyes
    dot(26, 24, 2),
    dot(38, 24, 2),
    // jaw
    poly("22,38 26,48 38,48 42,38"),
    // teeth
    line(28, 42, 28, 48),
    line(32, 42, 32, 48),
    line(36, 42, 36, 48),
  ],
  "aberration-taint": [
    pth("M 32 32 m -3 0 a 3 3 0 1 1 6 0 a 7 7 0 1 1 -14 0 a 11 11 0 1 1 22 0"),
    pth("M 48 30 Q 56 28 56 20"),
    pth("M 18 40 Q 8 44 8 54"),
    pth("M 40 46 Q 48 54 40 60"),
  ],
  "wildfire-risk": [
    // outer flame
    pth("M 32 10 C 20 22 14 32 22 46 C 18 40 22 52 32 54 C 42 52 46 40 42 46 C 50 32 44 22 32 10 Z"),
    // inner flame
    pth("M 32 24 C 26 32 22 38 28 46 Q 32 50 36 46 C 42 38 38 32 32 24 Z"),
  ],
  "flood-zone": [
    pth("M 12 22 Q 20 16 28 22 Q 36 28 44 22 Q 52 16 60 22"),
    pth("M 8 34 Q 18 28 28 34 Q 38 40 48 34 Q 58 28 64 34"),
    pth("M 4 46 Q 16 40 28 46 Q 40 52 52 46 Q 60 42 64 46"),
  ],

  // ───────────── Social & Community ─────────────
  "druid-circle-nearby": [
    // 8 stones in a circle
    circle(32, 12, 3),
    circle(46, 17, 3),
    circle(52, 32, 3),
    circle(46, 47, 3),
    circle(32, 52, 3),
    circle(18, 47, 3),
    circle(12, 32, 3),
    circle(18, 17, 3),
    // outer ring as a dotted guide
    circle(32, 32, 20),
  ],
  "grove-meeting": [
    // three pine trees
    polygon("12,46 18,26 24,46"),
    line(18, 46, 18, 52),
    polygon("24,50 32,22 40,50"),
    line(32, 50, 32, 58),
    polygon("40,46 46,26 52,46"),
    line(46, 46, 46, 52),
  ],
  "friendly-settlement": [
    // house body
    polygon("18,30 32,16 46,30 46,52 18,52"),
    // door
    polygon("28,52 28,40 36,40 36,52"),
    // leaf on roof
    pth("M 32 10 Q 38 14 36 20 Q 30 18 32 10 Z"),
  ],
  "hostile-settlement": [
    polygon("18,30 32,16 46,30 46,52 18,52"),
    polygon("28,52 28,40 36,40 36,52"),
    // spikes around
    line(32, 14, 32, 6),
    line(14, 30, 8, 30),
    line(50, 30, 56, 30),
    line(14, 52, 8, 58),
    line(50, 52, 56, 58),
    line(24, 14, 22, 8),
    line(40, 14, 42, 8),
  ],
  "logging-threat": [
    // tree
    polygon("20,42 32,18 44,42"),
    line(32, 42, 32, 54),
    // axe: handle + head overlapping the trunk
    line(10, 50, 34, 30),
    polygon("32,24 42,22 40,32 30,34"),
  ],
  "mining-threat": [
    // target circle
    circle(36, 32, 14),
    // pickaxe
    pth("M 8 56 L 28 36"),
    polygon("26,30 46,22 50,28 32,40"),
    line(40, 24, 46, 32),
  ],
  "ally-creature": [
    // main pad
    pth("M 24 36 Q 32 32 40 36 Q 44 42 40 48 Q 32 54 24 48 Q 20 42 24 36 Z"),
    // toes
    circle(22, 22, 3),
    circle(30, 18, 3),
    circle(38, 18, 3),
    circle(46, 22, 3),
  ],
  "beast-companion": [
    // left paw
    pth("M 8 38 Q 14 36 20 38 Q 24 44 20 48 Q 14 52 8 48 Q 4 44 8 38 Z"),
    circle(7, 30, 2),
    circle(12, 26, 2),
    circle(17, 26, 2),
    circle(22, 30, 2),
    // right paw
    pth("M 40 38 Q 46 36 52 38 Q 56 44 52 48 Q 46 52 40 48 Q 36 44 40 38 Z"),
    circle(39, 30, 2),
    circle(44, 26, 2),
    circle(49, 26, 2),
    circle(54, 30, 2),
  ],
  "ritual-site": [
    circle(32, 32, 20),
    // pentagram
    polygon("32,14 38,32 54,32 40,42 46,58 32,48 18,58 24,42 10,32 26,32"),
  ],
  "ancient-tree": [
    // trunk
    line(32, 32, 32, 54),
    line(28, 38, 28, 54),
    line(36, 38, 36, 54),
    // canopy (two arcs)
    pth("M 8 32 Q 32 6 56 32"),
    pth("M 14 32 Q 32 18 50 32"),
    // roots
    pth("M 32 54 Q 22 58 12 56"),
    pth("M 32 54 Q 42 58 52 56"),
    pth("M 32 54 Q 32 60 32 60"),
  ],
};

// Write everything
let count = 0;
for (const [id, parts] of Object.entries(SYMBOLS)) {
  const body = parts.join("\n");
  const svg = wrap(body);
  const file = path.join(OUT_DIR, `${id}.svg`);
  fs.writeFileSync(file, svg, "utf8");
  count += 1;
}

console.log(`Wrote ${count} Druidic SVGs to ${OUT_DIR}`);
console.log(
  "Upload them to campaign-assets/dnd5e/languages/Druidic/ in Supabase Storage to finish wiring.",
);
