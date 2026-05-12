/**
 * Registry of wall materials. Mirrors terrainMaterials.js — keyed by
 * id, with runtime-only render extensions (`fillColor`, `edgeColor`)
 * that drive the flat polygon rendering today. Texture/lighting work
 * lands in a later phase and the extension drops away.
 *
 * Only one material for now ("stone-rough"). The registry shape is
 * already plural so adding wood, brick, etc. in the next prompt is
 * just a new entry.
 */

/** @type {Object<string, import("./types").WallMaterial & { fillColor: string, edgeColor: string }>} */
export const WALL_MATERIALS = {
  "stone-rough": {
    id: "stone-rough",
    soundDampening: 0.95,
    sightBlocking: "full",
    coverValue: "full",
    fireResistance: "high",
    climbable: false,
    fillColor: "#4b5563",
    edgeColor: "#1f2937",
  },
};

/**
 * Look up a wall material by id. Falls back to stone-rough so a stale
 * building referencing a removed material still renders instead of
 * crashing the layer.
 * @param {string} id
 */
export function getWallMaterial(id) {
  return WALL_MATERIALS[id] || WALL_MATERIALS["stone-rough"];
}
