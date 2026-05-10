// Druidic symbol shape data. Each entry is an array of primitive
// drawing operations, rendered as inline SVG by the
// <DruidicSymbol> component. Coordinates assume viewBox="0 0 64 64".
//
// Primitive types:
//   dot     — filled circle (defaults r=2). Renders fill=currentColor.
//   circle  — stroked circle.
//   line    — stroked straight segment.
//   path    — stroked path (`d` is raw SVG path data).
//   poly    — stroked polyline.
//   polygon — stroked closed polygon.
//
// Ported from scripts/generateDruidicSymbols.js (now removed). Shape
// authorship lives here in src/ — no build script, no static SVGs,
// no asset upload step. Hand-designed and stable across campaigns;
// per-campaign symbol→meaning randomisation lives on the campaign
// settings, not on the shapes themselves.

export const DRUIDIC_SHAPES = {
  // ───────────── Navigation & Territory ─────────────
  'safe-path': [
    { type: 'dot', cx: 8, cy: 48 },
    { type: 'dot', cx: 56, cy: 16 },
    { type: 'path', d: 'M 8 48 C 20 44 26 24 40 24 C 48 24 52 18 56 16' },
  ],
  'danger-path': [
    { type: 'dot', cx: 8, cy: 48 },
    { type: 'dot', cx: 56, cy: 16 },
    { type: 'poly', points: '8,48 16,32 24,44 32,28 40,40 48,24 56,16' },
  ],
  'water-source': [
    { type: 'path', d: 'M 8 24 Q 16 18 24 24 Q 32 30 40 24 Q 48 18 56 24' },
    { type: 'path', d: 'M 8 34 Q 16 28 24 34 Q 32 40 40 34 Q 48 28 56 34' },
    { type: 'path', d: 'M 8 44 Q 16 38 24 44 Q 32 50 40 44 Q 48 38 56 44' },
  ],
  'shelter-ahead': [
    { type: 'path', d: 'M 12 44 Q 32 16 52 44' },
    { type: 'line', x1: 12, y1: 44, x2: 52, y2: 44 },
    { type: 'dot', cx: 32, cy: 50, r: 2 },
  ],
  'sacred-ground': [
    { type: 'circle', cx: 32, cy: 32, r: 14 },
    { type: 'circle', cx: 32, cy: 32, r: 5 },
    { type: 'line', x1: 32, y1: 10, x2: 32, y2: 16 },
    { type: 'line', x1: 32, y1: 48, x2: 32, y2: 54 },
    { type: 'line', x1: 10, y1: 32, x2: 16, y2: 32 },
    { type: 'line', x1: 48, y1: 32, x2: 54, y2: 32 },
    { type: 'line', x1: 15, y1: 15, x2: 20, y2: 20 },
    { type: 'line', x1: 44, y1: 44, x2: 49, y2: 49 },
    { type: 'line', x1: 15, y1: 49, x2: 20, y2: 44 },
    { type: 'line', x1: 44, y1: 20, x2: 49, y2: 15 },
  ],
  'corrupted-land': [
    { type: 'circle', cx: 32, cy: 32, r: 14 },
    { type: 'line', x1: 32, y1: 18, x2: 28, y2: 28 },
    { type: 'line', x1: 28, y1: 28, x2: 34, y2: 34 },
    { type: 'line', x1: 34, y1: 34, x2: 30, y2: 46 },
    { type: 'line', x1: 32, y1: 14, x2: 32, y2: 8 },
    { type: 'line', x1: 18, y1: 20, x2: 13, y2: 15 },
    { type: 'line', x1: 46, y1: 20, x2: 51, y2: 15 },
    { type: 'line', x1: 18, y1: 44, x2: 13, y2: 49 },
    { type: 'line', x1: 46, y1: 44, x2: 51, y2: 49 },
    { type: 'line', x1: 48, y1: 32, x2: 54, y2: 32 },
    { type: 'line', x1: 16, y1: 32, x2: 10, y2: 32 },
  ],
  'fey-crossing': [
    { type: 'circle', cx: 24, cy: 32, r: 14 },
    { type: 'circle', cx: 40, cy: 32, r: 14 },
    { type: 'dot', cx: 32, cy: 20 },
    { type: 'dot', cx: 32, cy: 44 },
  ],
  'ley-line': [
    { type: 'line', x1: 8, y1: 56, x2: 56, y2: 8 },
    { type: 'polygon', points: '16,48 20,44 24,48 20,52' },
    { type: 'polygon', points: '32,32 36,28 40,32 36,36' },
    { type: 'polygon', points: '48,16 52,12 56,16 52,20' },
  ],
  'migration-route': [
    { type: 'path', d: 'M 8 44 Q 20 28 32 34' },
    { type: 'path', d: 'M 20 36 Q 32 20 44 26' },
    { type: 'path', d: 'M 32 28 Q 44 12 56 18' },
    { type: 'poly', points: '14,40 18,36 22,40' },
    { type: 'poly', points: '26,32 30,28 34,32' },
    { type: 'poly', points: '42,22 46,18 50,22' },
  ],
  'territorial-boundary': [
    { type: 'path', d: 'M 8 40 Q 32 16 56 40' },
    { type: 'line', x1: 16, y1: 34, x2: 16, y2: 44 },
    { type: 'line', x1: 26, y1: 26, x2: 26, y2: 36 },
    { type: 'line', x1: 38, y1: 26, x2: 38, y2: 36 },
    { type: 'line', x1: 48, y1: 34, x2: 48, y2: 44 },
  ],

  // ───────────── Warnings & Information ─────────────
  'predator-territory': [
    { type: 'line', x1: 14, y1: 14, x2: 28, y2: 48 },
    { type: 'line', x1: 24, y1: 12, x2: 38, y2: 46 },
    { type: 'line', x1: 34, y1: 14, x2: 48, y2: 48 },
  ],
  'poisonous-plants': [
    { type: 'path', d: 'M 32 10 Q 50 20 42 44 Q 32 56 22 44 Q 14 20 32 10 Z' },
    { type: 'line', x1: 20, y1: 20, x2: 44, y2: 44 },
    { type: 'line', x1: 44, y1: 20, x2: 20, y2: 44 },
  ],
  'healing-herbs': [
    { type: 'path', d: 'M 32 10 Q 50 20 42 44 Q 32 56 22 44 Q 14 20 32 10 Z' },
    { type: 'line', x1: 32, y1: 22, x2: 32, y2: 38 },
    { type: 'line', x1: 24, y1: 30, x2: 40, y2: 30 },
  ],
  'rare-ingredient': [
    { type: 'poly', points: '32,10 35,26 50,29 35,32 32,48 29,32 14,29 29,26 32,10' },
    { type: 'line', x1: 32, y1: 52, x2: 32, y2: 60 },
    { type: 'circle', cx: 32, cy: 52, r: 2 },
    { type: 'path', d: 'M 28 56 Q 32 50 36 56' },
  ],
  'storm-coming': [
    { type: 'path', d: 'M 14 26 Q 14 18 22 18 Q 24 12 32 14 Q 40 10 46 18 Q 54 18 54 26 Q 54 32 46 32 L 22 32 Q 14 32 14 26 Z' },
    { type: 'poly', points: '30,34 26,44 32,44 28,54' },
  ],
  'seasonal-danger': [
    { type: 'path', d: 'M 32 32 m -4 0 a 4 4 0 1 1 8 0 a 8 8 0 1 1 -16 0 a 12 12 0 1 1 24 0 a 16 16 0 1 1 -32 0' },
    { type: 'dot', cx: 32, cy: 32, r: 2 },
  ],
  'undead-presence': [
    { type: 'circle', cx: 32, cy: 26, r: 14 },
    { type: 'dot', cx: 26, cy: 24, r: 2 },
    { type: 'dot', cx: 38, cy: 24, r: 2 },
    { type: 'poly', points: '22,38 26,48 38,48 42,38' },
    { type: 'line', x1: 28, y1: 42, x2: 28, y2: 48 },
    { type: 'line', x1: 32, y1: 42, x2: 32, y2: 48 },
    { type: 'line', x1: 36, y1: 42, x2: 36, y2: 48 },
  ],
  'aberration-taint': [
    { type: 'path', d: 'M 32 32 m -3 0 a 3 3 0 1 1 6 0 a 7 7 0 1 1 -14 0 a 11 11 0 1 1 22 0' },
    { type: 'path', d: 'M 48 30 Q 56 28 56 20' },
    { type: 'path', d: 'M 18 40 Q 8 44 8 54' },
    { type: 'path', d: 'M 40 46 Q 48 54 40 60' },
  ],
  'wildfire-risk': [
    { type: 'path', d: 'M 32 10 C 20 22 14 32 22 46 C 18 40 22 52 32 54 C 42 52 46 40 42 46 C 50 32 44 22 32 10 Z' },
    { type: 'path', d: 'M 32 24 C 26 32 22 38 28 46 Q 32 50 36 46 C 42 38 38 32 32 24 Z' },
  ],
  'flood-zone': [
    { type: 'path', d: 'M 12 22 Q 20 16 28 22 Q 36 28 44 22 Q 52 16 60 22' },
    { type: 'path', d: 'M 8 34 Q 18 28 28 34 Q 38 40 48 34 Q 58 28 64 34' },
    { type: 'path', d: 'M 4 46 Q 16 40 28 46 Q 40 52 52 46 Q 60 42 64 46' },
  ],

  // ───────────── Social & Community ─────────────
  'druid-circle-nearby': [
    { type: 'circle', cx: 32, cy: 12, r: 3 },
    { type: 'circle', cx: 46, cy: 17, r: 3 },
    { type: 'circle', cx: 52, cy: 32, r: 3 },
    { type: 'circle', cx: 46, cy: 47, r: 3 },
    { type: 'circle', cx: 32, cy: 52, r: 3 },
    { type: 'circle', cx: 18, cy: 47, r: 3 },
    { type: 'circle', cx: 12, cy: 32, r: 3 },
    { type: 'circle', cx: 18, cy: 17, r: 3 },
    { type: 'circle', cx: 32, cy: 32, r: 20 },
  ],
  'grove-meeting': [
    { type: 'polygon', points: '12,46 18,26 24,46' },
    { type: 'line', x1: 18, y1: 46, x2: 18, y2: 52 },
    { type: 'polygon', points: '24,50 32,22 40,50' },
    { type: 'line', x1: 32, y1: 50, x2: 32, y2: 58 },
    { type: 'polygon', points: '40,46 46,26 52,46' },
    { type: 'line', x1: 46, y1: 46, x2: 46, y2: 52 },
  ],
  'friendly-settlement': [
    { type: 'polygon', points: '18,30 32,16 46,30 46,52 18,52' },
    { type: 'polygon', points: '28,52 28,40 36,40 36,52' },
    { type: 'path', d: 'M 32 10 Q 38 14 36 20 Q 30 18 32 10 Z' },
  ],
  'hostile-settlement': [
    { type: 'polygon', points: '18,30 32,16 46,30 46,52 18,52' },
    { type: 'polygon', points: '28,52 28,40 36,40 36,52' },
    { type: 'line', x1: 32, y1: 14, x2: 32, y2: 6 },
    { type: 'line', x1: 14, y1: 30, x2: 8, y2: 30 },
    { type: 'line', x1: 50, y1: 30, x2: 56, y2: 30 },
    { type: 'line', x1: 14, y1: 52, x2: 8, y2: 58 },
    { type: 'line', x1: 50, y1: 52, x2: 56, y2: 58 },
    { type: 'line', x1: 24, y1: 14, x2: 22, y2: 8 },
    { type: 'line', x1: 40, y1: 14, x2: 42, y2: 8 },
  ],
  'logging-threat': [
    { type: 'polygon', points: '20,42 32,18 44,42' },
    { type: 'line', x1: 32, y1: 42, x2: 32, y2: 54 },
    { type: 'line', x1: 10, y1: 50, x2: 34, y2: 30 },
    { type: 'polygon', points: '32,24 42,22 40,32 30,34' },
  ],
  'mining-threat': [
    { type: 'circle', cx: 36, cy: 32, r: 14 },
    { type: 'path', d: 'M 8 56 L 28 36' },
    { type: 'polygon', points: '26,30 46,22 50,28 32,40' },
    { type: 'line', x1: 40, y1: 24, x2: 46, y2: 32 },
  ],
  'ally-creature': [
    { type: 'path', d: 'M 24 36 Q 32 32 40 36 Q 44 42 40 48 Q 32 54 24 48 Q 20 42 24 36 Z' },
    { type: 'circle', cx: 22, cy: 22, r: 3 },
    { type: 'circle', cx: 30, cy: 18, r: 3 },
    { type: 'circle', cx: 38, cy: 18, r: 3 },
    { type: 'circle', cx: 46, cy: 22, r: 3 },
  ],
  'beast-companion': [
    { type: 'path', d: 'M 8 38 Q 14 36 20 38 Q 24 44 20 48 Q 14 52 8 48 Q 4 44 8 38 Z' },
    { type: 'circle', cx: 7, cy: 30, r: 2 },
    { type: 'circle', cx: 12, cy: 26, r: 2 },
    { type: 'circle', cx: 17, cy: 26, r: 2 },
    { type: 'circle', cx: 22, cy: 30, r: 2 },
    { type: 'path', d: 'M 40 38 Q 46 36 52 38 Q 56 44 52 48 Q 46 52 40 48 Q 36 44 40 38 Z' },
    { type: 'circle', cx: 39, cy: 30, r: 2 },
    { type: 'circle', cx: 44, cy: 26, r: 2 },
    { type: 'circle', cx: 49, cy: 26, r: 2 },
    { type: 'circle', cx: 54, cy: 30, r: 2 },
  ],
  'ritual-site': [
    { type: 'circle', cx: 32, cy: 32, r: 20 },
    { type: 'polygon', points: '32,14 38,32 54,32 40,42 46,58 32,48 18,58 24,42 10,32 26,32' },
  ],
  'ancient-tree': [
    { type: 'line', x1: 32, y1: 32, x2: 32, y2: 54 },
    { type: 'line', x1: 28, y1: 38, x2: 28, y2: 54 },
    { type: 'line', x1: 36, y1: 38, x2: 36, y2: 54 },
    { type: 'path', d: 'M 8 32 Q 32 6 56 32' },
    { type: 'path', d: 'M 14 32 Q 32 18 50 32' },
    { type: 'path', d: 'M 32 54 Q 22 58 12 56' },
    { type: 'path', d: 'M 32 54 Q 42 58 52 56' },
    { type: 'path', d: 'M 32 54 Q 32 60 32 60' },
  ],
};
