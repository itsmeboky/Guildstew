import * as THREE from "three";

/**
 * Subtle off-white dot grid that sits in world space at z=0. Built from
 * THREE.Points with a fixed pixel-size material so the dots stay legible
 * at every zoom level (the way design-tool grids feel — Figma, Excalidraw).
 *
 * Dots span ±EXTENT on both axes; once you pan past that the grid runs
 * out. Bumping EXTENT is cheap (a few hundred kB of float32 at most), so
 * the cap can move whenever real maps need a larger play area.
 */

const SPACING = 28;
const EXTENT = 2000;
const COLOR = 0xffffff;
const OPACITY = 0.08;
const POINT_SIZE = 2;

/**
 * @returns {THREE.Points}
 */
export function createDotGrid() {
  const positions = [];
  for (let x = -EXTENT; x <= EXTENT; x += SPACING) {
    for (let y = -EXTENT; y <= EXTENT; y += SPACING) {
      positions.push(x, y, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  const material = new THREE.PointsMaterial({
    color: COLOR,
    size: POINT_SIZE,
    sizeAttenuation: false,
    transparent: true,
    opacity: OPACITY,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}
