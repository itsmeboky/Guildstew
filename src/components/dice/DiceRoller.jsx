import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { X } from "lucide-react";
import { FACE_ROTATIONS } from "./faceRotations";
import { DICE_SIDES } from "./diceConfig";
import { useActiveDiceSkin } from "@/lib/useActiveDiceSkin";
import { applyDiceSkinToMesh } from "@/lib/applyDiceSkin";
import { DEFAULT_MODEL_URLS, DEFAULT_TEXTURE_URL } from "@/config/diceAssets";
import { supabase } from "@/api/supabaseClient";

// Globally-published dice face calibrations, fetched once from
// site_config.dice_face_rotations. Shape: { d4:{1:{x,y,z,w},...}, ... }.
// Falls back to the static FACE_ROTATIONS table when missing.
let _globalFaceRotations = null;
const _globalFaceRotationsPromise = (async () => {
  try {
    const { data, error } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "dice_face_rotations")
      .maybeSingle();
    if (error) throw error;
    _globalFaceRotations = data?.value || null;
  } catch (err) {
    console.warn("Failed to load global dice face rotations", err);
    _globalFaceRotations = null;
  }
})();

// ============================================================
// DICE MODEL LOADING (.glb from Supabase)
// ============================================================
// Module-scoped cache so HMR / re-mounts don't re-fetch
const _modelCache = {};
const _textureCache = new Map();
const TARGET_DICE_SIZE = 1.4;

const _defaultTexture = (() => {
  const loader = new THREE.TextureLoader();
  const tex = loader.load(DEFAULT_TEXTURE_URL, t => { t.flipY = false; t.needsUpdate = true; });
  tex.flipY = false;
  return tex;
})(); // max dimension target after normalization

// Baseline "skin" used when the player has no Tavern dice skin
// applied. Mirrors the original hard-coded Guildstew look so the
// apply-skin path is the single source of truth for the material
// whether or not the player has a skin equipped.
const STOCK_SKIN = {
  baseColor: "#2a3441",
  metalness: 0.3,
  roughness: 0.4,
  glowEnabled: false,
  primaryLight: "#FF5722",
  secondaryLight: "#8B5CF6",
  customTextureUrl: null,
};

const _gltfLoader = new GLTFLoader();

// Three's FileLoader cache is off by default. Turning it on globally
// lets `_gltfLoader.loadAsync(url)` reuse glb bytes across calls — so
// the campaign-mount preload below and the on-mount load inside
// DiceRoller hit the same cached payload instead of refetching.
THREE.Cache.enabled = true;

// Tracks in-flight preload promises so repeat calls (e.g. from a
// re-rendering campaign mount effect) don't refire the network.
const _preloadInflight = new Map();

/**
 * Warm the GLB cache for every dice type before the dice tray spawns.
 *
 * Called from campaign route mounts (GMPanel, CampaignPlayerPanel)
 * once `campaign.dice_config` is available. The fetches run in
 * parallel in the background while the user reads the campaign UI;
 * by the time combat starts and DiceRoller mounts, the on-mount
 * `loadDiceModel` calls hit `THREE.Cache` instead of the network and
 * the dice render with their correct models on the first frame
 * instead of falling back to the orange placeholder geometry.
 *
 * Idempotent and fire-and-forget: failures are logged and DiceRoller's
 * own on-mount load effect remains the authoritative loader path.
 *
 * @param {object|null} uploadedModels — optional per-die-type URL map
 *   from `campaign.dice_config.uploadedModels`. Falls back to
 *   DEFAULT_MODEL_URLS when a type is missing.
 */
export function preloadDiceModels(uploadedModels = null) {
  for (const type of Object.keys(DEFAULT_MODEL_URLS)) {
    const url = uploadedModels?.[type] || DEFAULT_MODEL_URLS[type];
    if (!url || _preloadInflight.has(url)) continue;
    const promise = _gltfLoader.loadAsync(url).catch((err) => {
      // Don't surface — DiceRoller's own load effect retries on mount
      // and reports user-visible errors there.
      console.warn(`[dice preload] ${type} (${url}) failed`, err);
    });
    _preloadInflight.set(url, promise);
  }
}

async function loadDiceModel(type, opts = {}) {
  const {
    configUploadedModels = null,
    activeSkinRef = null,
    isThemedSkin: isThemedSkinFlag = false,
    primaryColor: primaryColorHex = "#FF5722",
    secondaryColor: secondaryColorHex = "#8B5CF6",
    defaultTexture = null,
  } = opts;
  if (_modelCache[type]) return _modelCache[type];
  const url = configUploadedModels?.[type] || DEFAULT_MODEL_URLS[type];
  const gltf = await _gltfLoader.loadAsync(url);
  const root = gltf.scene;

  // Compute bounding box, center the model so its origin is geometric center
  const bbox = new THREE.Box3().setFromObject(root);
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  root.position.sub(center); // shift so center is at local 0,0,0

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const displayScale = DICE_CONFIGS[type]?.displayScale ?? 1.0;
  const normalizeScale = (TARGET_DICE_SIZE / maxDim) * displayScale;

  // Wrap in a Group so we can apply normalization scale without losing the offset
  const wrapper = new THREE.Group();
  wrapper.add(root);
  wrapper.scale.setScalar(normalizeScale);

  // Apply active skin (replaces materials based on skin properties)
  applyDiceSkinToMesh(wrapper, activeSkinRef?.current || STOCK_SKIN, {
    defaultTexture,
    textureCache: _textureCache,
  });

  // Apply themed vertex gradient if enabled
  if (isThemedSkinFlag) {
    applyVertexGradient(wrapper, primaryColorHex, secondaryColorHex, false);
  }

  // Configure materials, save originals for restoration after color flashes
  wrapper.traverse(c => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = false;
      const apply = (m) => {
        if (!m) return;
        m.userData._origEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0x000000);
        m.userData._origEmissiveIntensity = m.emissiveIntensity ?? 0;
      };
      if (Array.isArray(c.material)) c.material.forEach(apply);
      else apply(c.material);
    }
  });

  _modelCache[type] = { group: wrapper, halfHeight: (size.y * normalizeScale) / 2 };
  return _modelCache[type];
}

function collectMaterials(obj3d) {
  const mats = [];
  obj3d.traverse(c => {
    if (c.isMesh && c.material) {
      if (Array.isArray(c.material)) mats.push(...c.material);
      else mats.push(c.material);
    }
  });
  return mats;
}

function setDiceEmissive(materials, color, intensity) {
  for (const m of materials) {
    if (!m.emissive) continue;
    if (color !== undefined) {
      if (typeof color === "number") m.emissive.setHex(color);
      else m.emissive.copy(color);
    }
    if (intensity !== undefined) m.emissiveIntensity = intensity;
  }
}

function setDiceEmissiveHSL(materials, h, s, l, intensity) {
  for (const m of materials) {
    if (!m.emissive) continue;
    m.emissive.setHSL(h, s, l);
    if (intensity !== undefined) m.emissiveIntensity = intensity;
  }
}

function resetDiceEmissive(materials) {
  for (const m of materials) {
    if (!m.emissive) continue;
    if (m.userData._origEmissive) m.emissive.copy(m.userData._origEmissive);
    else m.emissive.setHex(0x000000);
    m.emissiveIntensity = m.userData._origEmissiveIntensity ?? 0;
  }
}

function decayDiceEmissive(materials, decay = 0.95) {
  for (const m of materials) {
    if (!m.emissive) continue;
    m.emissiveIntensity *= decay;
    const orig = m.userData._origEmissiveIntensity ?? 0;
    if (m.emissiveIntensity < orig + 0.01) {
      m.emissiveIntensity = orig;
      if (m.userData._origEmissive) m.emissive.copy(m.userData._origEmissive);
    }
  }
}

// ============================================================
// EASING
// ============================================================
const easings = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => 1 - (1 - t) * (1 - t),
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeOutQuart: t => 1 - Math.pow(1 - t, 4),
  easeOutBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeOutBounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};
const ease = (name, t) => (easings[name] || easings.linear)(Math.max(0, Math.min(1, t)));

// ============================================================
// QUATERNION HELPERS
// ============================================================
const quatFromEuler = (x, y, z) => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return [q.x, q.y, q.z, q.w];
};
const slerpQuat = (a, b, t) => {
  const qa = new THREE.Quaternion(...a);
  const qb = new THREE.Quaternion(...b);
  qa.slerp(qb, t);
  return [qa.x, qa.y, qa.z, qa.w];
};
const randomAxis = () => quatFromEuler(
  (Math.random() - 0.5) * Math.PI * 8,
  (Math.random() - 0.5) * Math.PI * 8,
  (Math.random() - 0.5) * Math.PI * 8,
);

// ============================================================
// ARENA — SQUARE 8x8 IN 3D, RENDERS AS 950x950 PX
// ============================================================
const ARENA = { width: 8, depth: 8, wallHeight: 2.0 };
const WALL_STAGGER = 50;
const WALL_SLAM_DUR = 120;
const WALL_ORDER = ["north", "east", "south", "west"];
const LAST_WALL_LAND = WALL_STAGGER * 3 + WALL_SLAM_DUR;
const ROLL_START = 50;

function buildWallIntro() {
  const events = [];
  WALL_ORDER.forEach((wall, i) => {
    const dropTime = i * WALL_STAGGER;
    events.push({ t: dropTime, type: "wallDropSingle", wall });
    events.push({ t: dropTime + WALL_SLAM_DUR, type: "wallLandSingle", wall });
    events.push({ t: dropTime + WALL_SLAM_DUR, type: "sound", sound: "wallSlam" });
  });
  return events;
}
const WALL_POSITIONS = {
  north: { pos: [0, 0, -ARENA.depth / 2], axis: "z", sign: 1 },
  south: { pos: [0, 0, ARENA.depth / 2], axis: "z", sign: -1 },
  east:  { pos: [ARENA.width / 2, 0, 0], axis: "x", sign: -1 },
  west:  { pos: [-ARENA.width / 2, 0, 0], axis: "x", sign: 1 },
};
const WALLS = ["north", "south", "east", "west"];

// ============================================================
// DICE TYPE CONFIGS
// ============================================================
const DICE_CONFIGS = {
  d4:  { sides: 4,  label: "d4",  size: 0.65, displayScale: 1.0 },
  d6:  { sides: 6,  label: "d6",  size: 0.8,  displayScale: 0.8 },
  d8:  { sides: 8,  label: "d8",  size: 0.65, displayScale: 1.0 },
  d10: { sides: 10, label: "d10", size: 0.6,  displayScale: 1.0 },
  d12: { sides: 12, label: "d12", size: 0.6,  displayScale: 1.0 },
  d20: { sides: 20, label: "d20", size: 0.6,  displayScale: 1.0 },
};
const DICE_ORDER = ["d4", "d6", "d8", "d10", "d12", "d20"];

// Custom pentagonal trapezohedron for d10 (proper kite-faced shape)
function buildD10Geometry(scale = 0.6) {
  const apex = scale * 1.1;
  const ringR = scale * 0.85;
  const ringH = scale * 0.22;
  const verts = [];
  // 0: top apex
  verts.push(0, apex, 0);
  // 1-5: top ring
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    verts.push(Math.cos(a) * ringR, ringH, Math.sin(a) * ringR);
  }
  // 6-10: bottom ring (staggered)
  for (let i = 0; i < 5; i++) {
    const a = ((i + 0.5) / 5) * Math.PI * 2;
    verts.push(Math.cos(a) * ringR, -ringH, Math.sin(a) * ringR);
  }
  // 11: bottom apex
  verts.push(0, -apex, 0);

  const indices = [];
  // Upper kites (CCW from outside)
  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;
    indices.push(0, 1 + next, 6 + i);
    indices.push(0, 6 + i, 1 + i);
  }
  // Lower kites (CCW from outside)
  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;
    indices.push(11, 6 + i, 1 + next);
    indices.push(11, 1 + next, 6 + next);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildDiceGeometry(type) {
  const size = DICE_CONFIGS[type]?.size ?? 0.6;
  switch (type) {
    case "d4":  return new THREE.TetrahedronGeometry(size, 0);
    case "d6":  return new THREE.BoxGeometry(size, size, size);
    case "d8":  return new THREE.OctahedronGeometry(size, 0);
    case "d10": return buildD10Geometry(size);
    case "d12": return new THREE.DodecahedronGeometry(size, 0);
    case "d20": return new THREE.IcosahedronGeometry(size, 0);
    default:    return new THREE.IcosahedronGeometry(0.6, 0);
  }
}

// ============================================================
// EFFECT EQUIP — player customization (foundation for tavern store)
// ============================================================
const EFFECTS = {
  default:  { label: "Default",  icon: "◆", trail: null,       color: "#a0a4b0", desc: "Standard impact" },
  fire:     { label: "Fire",     icon: "🔥", trail: "fire",     color: "#ff7733", desc: "Burning trail" },
  sparkle:  { label: "Sparkle",  icon: "✦", trail: "sparkle",  color: "#ffd700", desc: "Golden bursts" },
  notes:    { label: "Notes",    icon: "♪", trail: "notes",    color: "#b88dff", desc: "Floating melody" },
  rainbow:  { label: "Rainbow",  icon: "❋", trail: "rainbow",  color: "#ff5cae", desc: "Chaotic prism" },
};
const EFFECT_ORDER = ["default", "fire", "sparkle", "notes", "rainbow"];

const EFFECT_CATEGORIES = ["All", "Default", "Class", "Tavern", "Custom"];
const EFFECT_CATEGORY_MEMBERS = {
  "All":     ["default", "fire", "sparkle", "notes", "rainbow"],
  "Default": ["default", "fire", "sparkle", "notes", "rainbow"],
  "Class":   [],
  "Tavern":  [],
  "Custom":  [],
};

// ============================================================
// SHAKE DETECTOR
// ============================================================
class ShakeDetector {
  constructor() { this.reset(); }
  reset() {
    this.positions = []; this.totalDistance = 0; this.maxSpeed = 0;
    this.lastPos = null; this.lastTime = null;
    this.directionChanges = 0; this.lastDir = null;
  }
  addSample(x, y, time) {
    this.positions.push({ x, y, time });
    if (this.lastPos) {
      const dx = x - this.lastPos.x, dy = y - this.lastPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = (time - this.lastTime) / 1000;
      if (dt > 0) this.maxSpeed = Math.max(this.maxSpeed, dist / dt);
      this.totalDistance += dist;
      const dir = Math.atan2(dy, dx);
      if (this.lastDir !== null && Math.abs(dir - this.lastDir) > Math.PI * 0.5) this.directionChanges++;
      this.lastDir = dir;
    }
    this.lastPos = { x, y }; this.lastTime = time;
  }
  getIntensity() {
    return Math.min(
      Math.min(this.totalDistance / 800, 1) * 0.3 +
      Math.min(this.directionChanges / 8, 1) * 0.5 +
      Math.min(this.maxSpeed / 1500, 1) * 0.2,
    1);
  }
  getReleaseVector() {
    if (this.positions.length < 3) return { vx: 0, vy: 0, speed: 0 };
    const r = this.positions.slice(-4), f = r[0], l = r[r.length - 1];
    const dt = (l.time - f.time) / 1000;
    if (dt === 0) return { vx: 0, vy: 0, speed: 0 };
    const vx = (l.x - f.x) / dt, vy = (l.y - f.y) / dt;
    return { vx, vy, speed: Math.sqrt(vx * vx + vy * vy) };
  }
}

// ============================================================
// SEQUENCE BUILDERS
// ============================================================
const randomArenaPos = (m = 1.2) => [
  (Math.random() - 0.5) * (ARENA.width - m * 2), 0.55,
  (Math.random() - 0.5) * (ARENA.depth - m * 2),
];

// Generates N non-overlapping settle targets within the arena.
// Divides the arena into a soft grid, picks N unique cells, jitters within each.
function generateSettleGrid(n) {
  // Use up to an 8x8 grid (64 cells). With max 60 dice, never exceeds.
  const cols = Math.min(8, Math.ceil(Math.sqrt(n)) + 1);
  const rows = cols;
  const cellW = (ARENA.width - 1.5) / cols;
  const cellD = (ARENA.depth - 1.5) / rows;
  const offsetX = -(ARENA.width - 1.5) / 2;
  const offsetZ = -(ARENA.depth - 1.5) / 2;
  // Build all cell centers, shuffle, take first n
  const cells = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      cells.push([
        offsetX + cellW * (cx + 0.5),
        offsetZ + cellD * (cy + 0.5),
      ]);
    }
  }
  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  // Take n with ±0.35 jitter for organic feel
  return cells.slice(0, n).map(([x, z]) => [
    x + (Math.random() - 0.5) * 0.7,
    0.55,
    z + (Math.random() - 0.5) * 0.7,
  ]);
}
const nearWall = (wall, offset = 0.3) => {
  const w = WALL_POSITIONS[wall];
  return w.axis === "z"
    ? [(Math.random() - 0.5) * (ARENA.width - 2), 0.55, w.pos[2] + w.sign * offset]
    : [w.pos[0] + w.sign * offset, 0.55, (Math.random() - 0.5) * (ARENA.depth - 2)];
};

const ROLL_SOUNDS = [
  "https://static.wixstatic.com/mp3/5cdfd8_e217d9cf6d2740878d9c75447a59650c.wav",
  "https://static.wixstatic.com/mp3/5cdfd8_51fb8464ed11497ca568fd738696a23a.wav",
  "https://static.wixstatic.com/mp3/5cdfd8_d530a1fb3ee4434a8291a7cf1e705332.wav",
  "https://static.wixstatic.com/mp3/5cdfd8_26ff827714844fccaaf4872fc002437e.wav",
];
const CRIT_SUCCESS_SOUNDS = [
  "https://static.wixstatic.com/mp3/5cdfd8_e8c4a95d12884406920d8eb54b0868ee.wav",
  "https://static.wixstatic.com/mp3/5cdfd8_1d4320bb6ce140e3968f1104c2ef2acf.mp3",
];
const CRIT_FAIL_SOUNDS = [
  "https://static.wixstatic.com/mp3/5cdfd8_277e185148974f8689952c9658c27f54.wav",
  "https://static.wixstatic.com/mp3/5cdfd8_f4193867f1004b74adaab28c878082ea.wav",
];

function playFromList(list, volume = 0.6) {
  const url = list[Math.floor(Math.random() * list.length)];
  const a = new Audio(url);
  a.volume = volume;
  a.play().catch(() => {});
}
const playRollSound        = (v = 0.6) => playFromList(ROLL_SOUNDS, v);
const playCritSuccessSound = (v = 0.8) => playFromList(CRIT_SUCCESS_SOUNDS, v);
const playCritFailSound    = (v = 0.8) => playFromList(CRIT_FAIL_SOUNDS, v);

const REVEAL_GIFS = {
  "crit-success": "https://static.wixstatic.com/media/5cdfd8_d1ea4fb5b8b84280a211084922fd620c~mv2.gif",
  "crit-fail":    "https://static.wixstatic.com/media/5cdfd8_a03a4ac66ac74ade9a4a8d335345bda8~mv2.gif",
};

function getFaceRotation(diceType, result, configFaceRotations) {
  // 1. Globally-published calibration (quaternion {x,y,z,w}).
  const global = _globalFaceRotations?.[diceType]?.[result];
  if (global && Number.isFinite(global.w)) {
    return [global.x, global.y, global.z, global.w];
  }
  // Legacy path: campaign-scoped Euler overrides.
  const override = configFaceRotations?.[diceType]?.[result];
  if (override) {
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(override.x, override.y, override.z));
    return [q.x, q.y, q.z, q.w];
  }
  // 2. Static defaults (Euler).
  const fallback = FACE_ROTATIONS?.[diceType]?.[result];
  if (fallback) {
    const q = new THREE.Quaternion();
    q.setFromEuler(fallback);
    return [q.x, q.y, q.z, q.w];
  }
  // 3. Random.
  return randomAxis();
}

function buildNormalRoll(result, diceType, shakeIntensity = 0.7, releaseVector = null, configFaceRotations = null) {
  // Bounce count: scales with shake, with randomness inside the band.
  // Min shake (0):   range 2-3
  // Mid shake (0.5): range 5-9
  // Max shake (1):   range 10-15
  const baseBounce = 2.5 + shakeIntensity * 10;
  const bounceVariance = 1 + shakeIntensity * 1.5;
  const bounceCount = Math.max(2, Math.floor(baseBounce + (Math.random() * 2 - 1) * bounceVariance));
  // Roll duration scales with bounce count so each bounce gets similar stage time
  const rollDur = 600 + bounceCount * 180;
  const totalDur = ROLL_START + rollDur;
  const targetRot = getFaceRotation(diceType, result, configFaceRotations);
  const path = [];
  const events = [...buildWallIntro()];

  let startX = (Math.random() - 0.5) * 2, startZ = (Math.random() - 0.5) * 1.5;
  if (releaseVector && releaseVector.speed > 100) {
    const n = releaseVector.speed;
    startX = -(releaseVector.vx / n) * 2;
    startZ = (releaseVector.vy / n) * 2;
  }
  path.push({ t: ROLL_START, pos: [startX, 4, startZ], rot: randomAxis(), scale: 1 });

  let currentT = ROLL_START + 150;
  const segDur = (rollDur - 400) / (bounceCount + 1);

  for (let i = 0; i < bounceCount; i++) {
    const wall = WALLS[Math.floor(Math.random() * 4)];
    const hitPos = nearWall(wall);
    const intensity = 0.5 + (1 - i / bounceCount) * 0.5;
    const peakY = 1.2 + (1 - i / bounceCount) * 2.5;
    const midT = currentT + segDur * 0.4;
    path.push({
      t: midT,
      pos: [(path[path.length - 1].pos[0] + hitPos[0]) / 2, peakY, (path[path.length - 1].pos[2] + hitPos[2]) / 2],
      rot: randomAxis(), scale: 1, ease: "easeOutQuad",
    });
    currentT += segDur;
    path.push({ t: currentT, pos: hitPos, rot: randomAxis(), scale: 1, ease: "easeOutCubic" });
    events.push({ t: currentT, type: "wallHit", wall, intensity });
    events.push({ t: currentT, type: "sound", sound: "wallThunk", volume: intensity });
    events.push({ t: currentT, type: "particles", preset: "impact", pos: hitPos, intensity });
  }

  const restPos = randomArenaPos();
  const settleT = currentT + segDur * 0.5;
  path.push({ t: settleT, pos: [restPos[0], 1.0, restPos[2]], rot: randomAxis(), scale: 1, ease: "easeOutQuad" });
  path.push({ t: totalDur - 200, pos: [restPos[0], 0.55, restPos[2]], rot: targetRot, scale: 1, ease: "easeOutBounce" });
  path.push({ t: totalDur, pos: [restPos[0], 0.55, restPos[2]], rot: targetRot, scale: 1, ease: "easeOutQuart" });
  events.push({ t: totalDur - 200, type: "sound", sound: "diceSettle" });
  events.push({ t: totalDur, type: "settled" });
  events.push({ t: totalDur + 300, type: "reveal", value: result, diceType });

  return {
    id: `roll_${Date.now()}`, diceType, result, duration: totalDur + 300,
    path, events: events.sort((a, b) => a.t - b.t),
    modifiers: { meshEffect: null, trailParticles: null, cameraShake: 0, arenaGlow: null },
  };
}

function buildLazyRoll(result, diceType, configFaceRotations = null) {
  const restPos = [(Math.random() - 0.5) * 2, 0.55, (Math.random() - 0.5) * 1.5];
  const targetRot = getFaceRotation(diceType, result, configFaceRotations);
  const dur = ROLL_START + 1200;
  return {
    id: `roll_${Date.now()}`, diceType, result, duration: dur + 400,
    path: [
      { t: ROLL_START, pos: [0, 3, 0], rot: quatFromEuler(0, 0, 0), scale: 1 },
      { t: ROLL_START + 300, pos: [0, 0.55, 0], rot: quatFromEuler(0.1, 0, 0.05), scale: 1, ease: "easeInQuad" },
      { t: ROLL_START + 550, pos: [0.15, 0.7, 0.1], rot: quatFromEuler(0.15, 0.1, -0.1), scale: 1, ease: "easeOutQuad" },
      { t: ROLL_START + 750, pos: [restPos[0], 0.55, restPos[2]], rot: targetRot, scale: 1, ease: "easeOutQuad" },
      { t: dur, pos: [restPos[0], 0.55, restPos[2]], rot: targetRot, scale: 1 },
    ],
    events: [
      ...buildWallIntro(),
      { t: ROLL_START + 300, type: "sound", sound: "sadThud" },
      { t: ROLL_START + 400, type: "overlay", text: "Lame... try again.", style: "shame" },
      { t: ROLL_START + 750, type: "settled" },
      { t: dur, type: "reveal", value: result, diceType },
    ].sort((a, b) => a.t - b.t),
    modifiers: { meshEffect: null, trailParticles: null, cameraShake: 0, arenaGlow: null },
  };
}

function buildEpicRoll(result, diceType, releaseVector = null, configFaceRotations = null) {
  const base = buildNormalRoll(result, diceType, 1.0, releaseVector, configFaceRotations);
  return { ...base, duration: base.duration + 500,
    path: base.path.map((kf, i) => ({ ...kf, t: kf.t * 1.12,
      pos: i > 1 && i < base.path.length - 2 ? [kf.pos[0] * 1.3, kf.pos[1] * 1.15, kf.pos[2] * 1.3] : kf.pos,
    })),
    events: [
      ...base.events.map(e => ({ ...e, t: e.t * 1.12, intensity: e.intensity ? Math.min(e.intensity * 1.3, 1) : undefined })),
      { t: ROLL_START + 50, type: "sound", sound: "epicWhoosh" },
    ].sort((a, b) => a.t - b.t),
    modifiers: { ...base.modifiers, cameraShake: 0.15 },
  };
}

// ============================================================
// CHARACTER STATE MODIFIERS
// ============================================================
function applyRage(tl) {
  return { ...tl, duration: tl.duration * 0.82,
    path: tl.path.map(kf => ({ ...kf, t: kf.t * 0.82 })),
    events: [...tl.events.map(e => ({ ...e, t: e.t * 0.82,
      intensity: e.intensity ? Math.min(e.intensity * 1.6, 1) : undefined,
      volume: e.volume ? Math.min(e.volume * 1.4, 1) : undefined,
    })), { t: 0, type: "meshEffect", effect: "fire" }].sort((a, b) => a.t - b.t),
    modifiers: { ...tl.modifiers, meshEffect: "fire", trailParticles: "fire", cameraShake: 0.35, arenaGlow: "#ff2200" },
  };
}
function applyDeathSave(tl) {
  const ekgStart = LAST_WALL_LAND + 50;
  const heartbeatCount = Math.floor((tl.duration - ekgStart) / 420);
  const heartbeats = Array.from({ length: heartbeatCount }, (_, i) => ({
    t: ekgStart + i * 420, type: "sound", sound: "heartbeat"
  }));
  const slowPoint = ROLL_START + (tl.duration - ROLL_START) * 0.55;
  return {
    ...tl,
    duration: tl.duration * 1.35,
    path: tl.path.map(kf => ({ ...kf, t: kf.t > slowPoint ? slowPoint + (kf.t - slowPoint) * 1.6 : kf.t })),
    events: [
      ...tl.events.map(e => ({ ...e, t: e.t > slowPoint ? slowPoint + (e.t - slowPoint) * 1.6 : e.t })),
      { t: ekgStart, type: "arenaEffect", effect: "dim" },
      ...heartbeats,
    ].sort((a, b) => a.t - b.t),
    modifiers: { ...tl.modifiers, meshEffect: "pulse", trailParticles: "embers", arenaGlow: "#330000" },
  };
}
function applyInspiration(tl) {
  return { ...tl,
    events: [...tl.events, { t: 0, type: "meshEffect", effect: "sparkle" }].sort((a, b) => a.t - b.t),
    modifiers: { ...tl.modifiers, meshEffect: "sparkle", trailParticles: "notes", arenaGlow: "#ffcc00" },
  };
}
function applyWildMagic(tl) {
  return { ...tl,
    events: [...tl.events, { t: 0, type: "meshEffect", effect: "rainbow" }].sort((a, b) => a.t - b.t),
    modifiers: { ...tl.modifiers, meshEffect: "rainbow", trailParticles: "rainbow", arenaGlow: "#aa00ff" },
  };
}

// Apply equipped effect ONLY if character state didn't already set a trail
function applyEquippedEffect(tl, effectKey) {
  if (effectKey === "default" || tl.modifiers.trailParticles) return tl;
  return { ...tl, modifiers: { ...tl.modifiers, trailParticles: EFFECTS[effectKey].trail } };
}

// ============================================================
// PATH INTERPOLATION
// ============================================================
function interpolatePath(path, elapsed) {
  if (!path || !path.length) return { pos: [0, 0.55, 0], rot: [0, 0, 0, 1], scale: 1 };
  if (elapsed <= path[0].t) return { pos: path[0].pos, rot: path[0].rot, scale: path[0].scale };
  if (elapsed >= path[path.length - 1].t) { const l = path[path.length - 1]; return { pos: l.pos, rot: l.rot, scale: l.scale }; }
  let i = 0;
  while (i < path.length - 1 && path[i + 1].t <= elapsed) i++;
  const a = path[i], b = path[i + 1];
  const eased = ease(b.ease || "linear", (elapsed - a.t) / (b.t - a.t));
  return {
    pos: a.pos.map((v, j) => v + (b.pos[j] - v) * eased),
    rot: slerpQuat(a.rot, b.rot, eased),
    scale: a.scale + (b.scale - a.scale) * eased,
  };
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
// ============================================================
// PROCEDURAL TEXTURE FACTORIES
// Each entry returns a fresh THREE.CanvasTexture by drawing into a 64x64 canvas.
// In Phase B, user-uploaded URL textures will sit alongside these.
// ============================================================
const PROCEDURAL_TEXTURES = {
  "radial-orange": () => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32,32,2,32,32,22);
    g.addColorStop(0,"#ffffff"); g.addColorStop(0.3,"#FF5300"); g.addColorStop(1,"rgba(255,83,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,22,0,Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
  },
  "fire-flame": () => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32,38,3,32,32,26);
    g.addColorStop(0,"#ffffcc"); g.addColorStop(0.25,"#ffaa00"); g.addColorStop(0.6,"#ff3300"); g.addColorStop(1,"rgba(200,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(32,34,18,24,0,0,Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
  },
  "ember-spark": () => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32,32,1,32,32,12);
    g.addColorStop(0,"#ffcc44"); g.addColorStop(0.6,"#ff4400"); g.addColorStop(1,"rgba(80,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,12,0,Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
  },
  "sparkle-cross": () => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    for (let j = 0; j < 4; j++) {
      const a = (j/4)*Math.PI*2 - Math.PI/2;
      ctx.beginPath();
      ctx.moveTo(32+Math.cos(a)*4, 32+Math.sin(a)*4);
      ctx.lineTo(32+Math.cos(a)*22, 32+Math.sin(a)*22);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(32,32,4,0,Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
  },
  "music-note": () => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.font = "bold 44px serif"; ctx.fillStyle = "#fff";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(["♪","♫","♩","♬"][Math.floor(Math.random()*4)], 32, 30);
    return new THREE.CanvasTexture(c);
  },
  "rainbow-orb": () => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const ctx = c.getContext("2d");
    const colors = ["#ff0000","#ff8800","#ffff00","#00ff00","#0088ff","#aa00ff"];
    const col = colors[Math.floor(Math.random()*colors.length)];
    const g = ctx.createRadialGradient(32,32,3,32,32,20);
    g.addColorStop(0,"#ffffff"); g.addColorStop(0.4,col); g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,20,0,Math.PI*2); ctx.fill();
    return new THREE.CanvasTexture(c);
  },
};

// ============================================================
// PARTICLE EFFECTS — DATA-DRIVEN CONFIGS
// Each effect is a behavior config. The engine reads these at emit time
// and animates particles accordingly. In Phase B, user-uploaded effects
// will follow the same schema with `textureUrl` instead of `texture`.
// ============================================================
const PARTICLE_EFFECTS = {
  // Default impact — orange radial burst, falls under gravity
  impact: {
    texture: "radial-orange",
    spawn: {
      lifetime: 600,
      velocity: {
        x: { min: -1, max: 1 },
        y: { min: 1.0, max: 2.6 },
        z: { min: -1, max: 1 },
      },
    },
    physics: {
      accelY: -9.8,
      verticalDamping: 1.0,
      lateralJitter: 0,
      lateralOscillation: { amp: 0, freq: 0 },
    },
    visual: {
      baseScale: 0.16,
      scaleStart: 1.0,
      scaleEnd: 1.0,
      scaleOscillation: { amp: 0, freq: 0 },
      opacityStart: 1.0,
      opacityEnd: 0.0,
      isRising: false,
    },
  },
  // Fire — orange flame, rises with random side jitter
  fire: {
    texture: "fire-flame",
    spawn: {
      lifetime: 450,
      velocity: {
        x: { min: -1, max: 1 },
        y: { min: 1.0, max: 3.0 },
        z: { min: -1, max: 1 },
      },
    },
    physics: {
      accelY: 2.0,
      verticalDamping: 1.0,
      lateralJitter: 0.3,
      lateralOscillation: { amp: 0, freq: 0 },
    },
    visual: {
      baseScale: 0.28,
      scaleStart: 1.0,
      scaleEnd: 0.0,
      scaleOscillation: { amp: 0, freq: 0 },
      opacityStart: 1.0,
      opacityEnd: 0.0,
      isRising: false,
    },
  },
  // Ember — small spark, falls slowly with tiny side drift
  ember: {
    texture: "ember-spark",
    spawn: {
      lifetime: 1000,
      velocity: {
        x: { min: -0.8, max: 0.8 },
        y: { min: 0.8, max: 2.4 },
        z: { min: -0.8, max: 0.8 },
      },
    },
    physics: {
      accelY: -1.5,
      verticalDamping: 1.0,
      lateralJitter: 0.08,
      lateralOscillation: { amp: 0, freq: 0 },
    },
    visual: {
      baseScale: 0.16,
      scaleStart: 1.0,
      scaleEnd: 0.5,
      scaleOscillation: { amp: 0, freq: 0 },
      opacityStart: 1.0,
      opacityEnd: 0.0,
      isRising: false,
    },
  },
  // Sparkle — gold cross, hangs in air with subtle pulse
  sparkle: {
    texture: "sparkle-cross",
    spawn: {
      lifetime: 600,
      velocity: {
        x: { min: -1, max: 1 },
        y: { min: 2.0, max: 3.5 },
        z: { min: -1, max: 1 },
      },
    },
    physics: {
      accelY: 0,
      verticalDamping: 0.99,
      lateralJitter: 0,
      lateralOscillation: { amp: 0, freq: 0 },
    },
    visual: {
      baseScale: 0.22,
      scaleStart: 1.0,
      scaleEnd: 1.0,
      scaleOscillation: { amp: 0.3, freq: 0.02 },
      opacityStart: 1.0,
      opacityEnd: 0.0,
      isRising: true,
    },
  },
  // Note — musical note, rises with sine swirl, slow fade
  note: {
    texture: "music-note",
    spawn: {
      lifetime: 1400,
      velocity: {
        x: { min: -0.4, max: 0.4 },
        y: { min: 2.0, max: 3.5 },
        z: { min: -0.4, max: 0.4 },
      },
    },
    physics: {
      accelY: 0,
      verticalDamping: 0.998,
      lateralJitter: 0,
      lateralOscillation: { amp: 0.04, freq: 0.008 },
    },
    visual: {
      baseScale: 0.4,
      scaleStart: 1.0,
      scaleEnd: 1.0,
      scaleOscillation: { amp: 0.2, freq: 0.01 },
      opacityStart: 0.85,
      opacityEnd: 0.0,
      isRising: true,
    },
  },
  // Rainbow — multicolor orb, falls fast (fresh texture per particle for color variety)
  rainbow: {
    texture: "rainbow-orb",
    spawn: {
      lifetime: 600,
      velocity: {
        x: { min: -1, max: 1 },
        y: { min: 1.0, max: 2.6 },
        z: { min: -1, max: 1 },
      },
    },
    physics: {
      accelY: -4.0,
      verticalDamping: 1.0,
      lateralJitter: 0,
      lateralOscillation: { amp: 0, freq: 0 },
    },
    visual: {
      baseScale: 0.16,
      scaleStart: 1.0,
      scaleEnd: 0.0,
      scaleOscillation: { amp: 0, freq: 0 },
      opacityStart: 1.0,
      opacityEnd: 0.0,
      isRising: false,
    },
  },
};

// ============================================================
// ENGINE PARTICLES — config-driven particle pool
// Reads behavior from PARTICLE_EFFECTS configs. The same pool services
// every effect; particles store a reference to their effect config.
// ============================================================
class EngineParticles {
  constructor(scene, max = 350) {
    this.pool = [];
    this.scene = scene;
    this.textureCache = {};
    for (let i = 0; i < max; i++) {
      const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.scale.setScalar(0.15);
      scene.add(sprite);
      this.pool.push({
        sprite, mat,
        vel: [0, 0, 0],
        life: 0, maxLife: 0,
        config: null,
        baseScale: 0.15,
        speedMultiplier: 1,
      });
    }
  }

  // Resolve a texture by key. Some textures (note, rainbow) generate fresh per particle.
  _getTexture(textureKey) {
    const factory = PROCEDURAL_TEXTURES[textureKey];
    if (!factory) return PROCEDURAL_TEXTURES["radial-orange"]();
    // music-note and rainbow-orb pick random glyphs/colors per call — don't cache
    if (textureKey === "music-note" || textureKey === "rainbow-orb") {
      return factory();
    }
    if (!this.textureCache[textureKey]) {
      this.textureCache[textureKey] = factory();
    }
    return this.textureCache[textureKey];
  }

  // Public API — preserves the old (pos, count, style, speed, life) signature.
  // `style` is a key into PARTICLE_EFFECTS. `speed` and `life` override config defaults.
  emit(pos, count, style = "impact", speed = 3, life = null) {
    const config = PARTICLE_EFFECTS[style] || PARTICLE_EFFECTS.impact;
    let spawned = 0;
    for (const p of this.pool) {
      if (p.life > 0 || spawned >= count) continue;

      // Transform: position
      p.sprite.visible = true;
      p.sprite.position.set(pos[0] || 0, pos[1] || 0.5, pos[2] || 0);

      // Texture
      p.mat.map = this._getTexture(config.texture);
      p.mat.needsUpdate = true;
      p.mat.opacity = config.visual.opacityStart;

      // Stash the config + params for the update loop
      p.config = config;
      p.speedMultiplier = speed;
      p.baseScale = config.visual.baseScale;
      p.sprite.scale.setScalar(p.baseScale * config.visual.scaleStart);

      // Initial velocity from config range, scaled by speed
      // The legacy emit() called speed=3 the "default speed" — preserve that scaling.
      // Each spawn-velocity range was defined for speed=3, so divide by 3 to normalize.
      const vScale = speed / 3;
      const v = config.spawn.velocity;
      p.vel = [
        ((Math.random() - 0.5) * 2) * (v.x.max - v.x.min) * 0.5 * vScale + (v.x.min + v.x.max) * 0.5 * 0,
        // For y, use the range directly (it's not symmetric around 0)
        (v.y.min + Math.random() * (v.y.max - v.y.min)) * vScale,
        ((Math.random() - 0.5) * 2) * (v.z.max - v.z.min) * 0.5 * vScale + (v.z.min + v.z.max) * 0.5 * 0,
      ];

      // Lifetime — explicit override or config default
      p.life = life ?? config.spawn.lifetime;
      p.maxLife = p.life;

      spawned++;
    }
  }

  update(dt) {
    const ds = dt / 1000;
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      const ageRatio = 1 - lifeRatio;
      const cfg = p.config;
      if (!cfg) {
        // Defensive: if config went missing somehow, treat as default impact
        p.vel[1] -= 9.8 * ds;
      } else {
        // === Apply physics ===
        p.vel[1] += cfg.physics.accelY * ds;
        if (cfg.physics.verticalDamping !== 1.0) {
          p.vel[1] *= cfg.physics.verticalDamping;
        }
        // Lateral random jitter
        if (cfg.physics.lateralJitter > 0) {
          const j = cfg.physics.lateralJitter;
          p.vel[0] += (Math.random() - 0.5) * j;
          p.vel[2] += (Math.random() - 0.5) * j;
        }
        // Lateral sine oscillation (driven by life ms)
        const osc = cfg.physics.lateralOscillation;
        if (osc.amp > 0) {
          p.vel[0] += Math.sin(p.life * osc.freq) * osc.amp;
        }
      }

      // === Integrate position ===
      p.sprite.position.x += p.vel[0] * ds;
      p.sprite.position.y += p.vel[1] * ds;
      p.sprite.position.z += p.vel[2] * ds;

      // === Visual: scale (lerp start→end + optional oscillation) ===
      if (cfg) {
        const scaleLerp = cfg.visual.scaleStart + (cfg.visual.scaleEnd - cfg.visual.scaleStart) * ageRatio;
        let scaleOsc = 1.0;
        const sOsc = cfg.visual.scaleOscillation;
        if (sOsc.amp > 0) {
          // Match the existing pattern: (centerOffset + sin(life*freq)*amp)
          // For sparkle: (0.7 + sin*0.3); for note: (0.8 + sin*0.2)
          // We encode this as: center = 1 - amp; scale = baseScale * (center + sin*amp)
          const center = 1.0 - sOsc.amp;
          scaleOsc = (center + Math.sin(p.life * sOsc.freq) * sOsc.amp);
        }
        // sparkle multiplies by lifeRatio AND oscillation, so combine
        const finalScale = p.baseScale * scaleLerp * scaleOsc * (cfg.visual.opacityEnd === 0 && cfg.visual.scaleEnd === 0 ? lifeRatio : 1);
        // ^ The `lifeRatio` multiplier preserves sparkle's "(0.7+sin*0.3)*lr" behavior
        //   and rainbow/fire's "lr" fade. impact/note keep scaleStart=scaleEnd=1 so this is a no-op.
        p.sprite.scale.setScalar(finalScale);

        // === Visual: opacity ===
        p.mat.opacity = cfg.visual.opacityStart + (cfg.visual.opacityEnd - cfg.visual.opacityStart) * ageRatio;
      }

      if (p.life <= 0) p.sprite.visible = false;
    }
  }

  dispose() {
    for (const p of this.pool) {
      if (p.mat.map) p.mat.map.dispose();
      p.mat.dispose();
      this.scene.remove(p.sprite);
    }
    Object.values(this.textureCache).forEach(t => t.dispose());
    this.textureCache = {};
  }
}

function applyVertexGradient(model, primaryHex, secondaryHex, isThemedSkin) {
  const primary = new THREE.Color(primaryHex);
  const secondary = new THREE.Color(secondaryHex);

  let minY = Infinity, maxY = -Infinity;
  model.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const pos = child.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  });
  const yRange = maxY - minY || 1;

  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const mat = child.material;

      if (isThemedSkin) {
        // Themed skins keep textures clean — no tinting
        mat.color = new THREE.Color(0xffffff);
        if (child.geometry.attributes.color) {
          child.geometry.deleteAttribute("color");
        }
        mat.vertexColors = false;
        mat.needsUpdate = true;
        return;
      }

      // Apply vertex gradient
      const geometry = child.geometry;
      const pos = geometry.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const tmpColor = new THREE.Color();

      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = (y - minY) / yRange;
        tmpColor.copy(secondary).lerp(primary, t);
        colors[i * 3] = tmpColor.r;
        colors[i * 3 + 1] = tmpColor.g;
        colors[i * 3 + 2] = tmpColor.b;
      }

      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      mat.vertexColors = true;
      mat.color = new THREE.Color(0xffffff); // White base so vertex colors multiply cleanly
      mat.needsUpdate = true;
    }
  });

  if (isThemedSkin) return;
  model.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const setup = (m) => {
      if (!m) return;
      m.vertexColors = true;
      if (m.emissive) {
        m.emissive.set(primaryHex);
        m.emissiveIntensity = 0.25;
      }
      m.needsUpdate = true;
    };
    if (Array.isArray(child.material)) child.material.forEach(setup);
    else setup(child.material);
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const DiceRoller = forwardRef(function DiceRoller(props, ref) {
  const {
    primaryColor = "#FF5722",
    secondaryColor = "#8B5CF6",
    isThemedSkin = false,
    config = null,
    forcedResult = null,
    onRollComplete = null,
    autoCloseOnReveal = false,
    onClose = null,
    compact = false,
    isOpen = true,
    modifier = "none",
    initialDice = null,
    // When true, the dice arena auto-rolls once isOpen flips from
    // false → true and a forcedResult is set. Used by the combat
    // dice window's spectator path so the watching seat sees the
    // same animation the rolling actor sees, without needing the
    // spectator to physically click/shake the arena.
    autoRollOnOpen = false,
  } = props;
  const mountRef = useRef(null);
  const sceneRef = useRef({});
  // Gates the imperative orange-fallback render in `swapDiceModel`.
  // Starts false on every mount; flips to true after a 200ms timer
  // so warm-cache .glb loads (which usually arrive within tens of ms)
  // can swap in the real dice model without the user ever seeing the
  // placeholder polyhedron flash. After 200ms, fallback rendering is
  // re-enabled — genuine cold-start / slow-network mounts still get
  // a placeholder, just one frame later.
  const fallbackAllowedRef = useRef(false);
  const timelineRef = useRef(null);
  const playbackRef = useRef({ startTime: null, eventIndex: 0, playing: false });
  const particleRef = useRef(null);
  const wallMeshesRef = useRef({});
  const interactionRef = useRef({ isDragging: false, shakeDetector: new ShakeDetector(), currentPos: null, isHolding: false });
  const resultOverlayRef = useRef(null);
  const diceTypeRef = useRef("d20");
  const equippedEffectRef = useRef("default");
  const modifierRef = useRef("none");

  const activeSkin = useActiveDiceSkin();
  const activeSkinRef = useRef(activeSkin);
  useEffect(() => { activeSkinRef.current = activeSkin; }, [activeSkin]);

  const primaryColorRef = useRef(primaryColor);
  const secondaryColorRef = useRef(secondaryColor);
  useEffect(() => { primaryColorRef.current = primaryColor; }, [primaryColor]);
  useEffect(() => { secondaryColorRef.current = secondaryColor; }, [secondaryColor]);

  const forcedResultRef = useRef(forcedResult);
  useEffect(() => { forcedResultRef.current = forcedResult; }, [forcedResult]);

  const onRollCompleteRef = useRef(onRollComplete);
  useEffect(() => { onRollCompleteRef.current = onRollComplete; }, [onRollComplete]);

  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc?.diceState?.activeContent) return;
    if (sc.diceState.isPlaceholder) return;
    applyDiceSkinToMesh(sc.diceState.activeContent, activeSkin || STOCK_SKIN, {
      defaultTexture: _defaultTexture,
      textureCache: _textureCache,
    });
    if (isThemedSkin) {
      const hasCustomTexture = !!(activeSkin?.customTextureUrl);
      applyVertexGradient(sc.diceState.activeContent, primaryColor, secondaryColor, hasCustomTexture);
    }
    // applyDiceSkinToMesh replaces materials — refresh the materials array + emissive originals
    const newMats = collectMaterials(sc.diceState.activeContent);
    newMats.forEach(m => {
      m.userData._origEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0x000000);
      m.userData._origEmissiveIntensity = m.emissiveIntensity ?? 0;
    });
    sc.diceState.materials = newMats;

    const pool = sceneRef.current?.multiDicePool;
    if (Array.isArray(pool)) {
      for (const die of pool) {
        if (!die.group) continue;
        const innerClone = die.group.children[0];
        if (!innerClone) continue;
        try {
          const hasCustomTexture = !!(activeSkin?.customTextureUrl);
          if (hasCustomTexture && typeof applyDiceSkinToMesh === "function") {
            applyDiceSkinToMesh(innerClone, activeSkin, primaryColor, secondaryColor);
          }
          if (typeof applyVertexGradient === "function") {
            applyVertexGradient(innerClone, primaryColor, secondaryColor, hasCustomTexture);
          }
        } catch (err) {
          console.error("Failed to update multi-dice clone gradient:", err);
        }
      }
    }
  }, [activeSkin, isThemedSkin, primaryColor, secondaryColor]);

  const [diceType, setDiceType] = useState("d20");
  const [diceCounts, setDiceCounts] = useState({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 });
  const [multiDiceHint, setMultiDiceHint] = useState(false);
  const [equippedEffect, setEquippedEffect] = useState("default");
  const [effectCategory, setEffectCategory] = useState("All");
  const [lastResult, setLastResult] = useState(null);
  const [lastResultDiceType, setLastResultDiceType] = useState(null);
  const [lastBreakdown, setLastBreakdown] = useState(null);
  // Shape: { perType: {d4: [3,2,5], d6: [4,1], ...}, total: 28 }
  const [hoveringResult, setHoveringResult] = useState(false);
  const [overlayText, setOverlayText] = useState(null);
  const [revealOverlay, setRevealOverlay] = useState(null);
  const [eventLog, setEventLog] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [shakeLevel, setShakeLevel] = useState(0);
  const [resultHistory, setResultHistory] = useState([]);
  const [strictMode, setStrictMode] = useState(false);
  const [showEKG, setShowEKG] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [loadedModels, setLoadedModels] = useState({}); // { d4: true, d6: true, ... }
  const [modelLoadError, setModelLoadError] = useState(null);
  const ekgStateRef = useRef({ active: false, cursor: 0 });
  const shakeRef = useRef(0);

  // Keep refs in sync with state/props for the animation loop
  useEffect(() => { diceTypeRef.current = diceType; }, [diceType]);
  useEffect(() => { equippedEffectRef.current = equippedEffect; }, [equippedEffect]);
  useEffect(() => { modifierRef.current = modifier; }, [modifier]);

  // Dice tray helpers
  const incDice = (type) => setDiceCounts(prev => ({ ...prev, [type]: Math.min(10, prev[type] + 1) }));
  const decDice = (type) => setDiceCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
  const clearTray = useCallback(() => {
    setDiceCounts({ d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 });
    sceneRef.current?.despawnAllMultiDice?.();
    if (sceneRef.current?.dice) {
      sceneRef.current.dice.visible = false;
    }
    setLastResult(null);
    setLastResultDiceType(null);
    if (typeof setLastBreakdown === "function") setLastBreakdown(null);
  }, []);
  const totalDice = Object.values(diceCounts).reduce((s, n) => s + n, 0);

  // Initialize tray from initialDice prop on mount
  useEffect(() => {
    if (initialDice) setDiceCounts(prev => ({ ...prev, [initialDice]: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-track displayed model to the first non-zero tray type (DICE_ORDER priority).
  // Empty tray → leave displayed model as-is so the arena doesn't flicker.
  useEffect(() => {
    const activeType = DICE_ORDER.find(t => diceCounts[t] > 0);
    if (!activeType) return;
    if (diceTypeRef.current === activeType) return;
    diceTypeRef.current = activeType;
    if (sceneRef.current?.swapDiceModel) {
      sceneRef.current.swapDiceModel(activeType);
    }
  }, [diceCounts]);

  const firstDiceCountsChange = useRef(true);

  useEffect(() => {
    console.log("[tray-change-cleanup] fired. first?", firstDiceCountsChange.current, "isRolling?", isRolling, "playing?", playbackRef.current?.playing);
    if (firstDiceCountsChange.current) {
      firstDiceCountsChange.current = false;
      console.log("[tray-change-cleanup] skipping (first change)");
      return;
    }
    if (isRolling) {
      console.log("[tray-change-cleanup] skipping (isRolling)");
      return;
    }
    if (playbackRef.current?.playing) {
      console.log("[tray-change-cleanup] skipping (playback playing)");
      return;
    }
    console.log("[tray-change-cleanup] CLEARING — pool size before:", sceneRef.current?.multiDicePool?.length);
    sceneRef.current?.despawnAllMultiDice?.();
    console.log("[tray-change-cleanup] pool size after:", sceneRef.current?.multiDicePool?.length);
    if (sceneRef.current?.dice && sceneRef.current.dice.visible) {
      console.log("[tray-change-cleanup] hiding single dice wrapper");
      sceneRef.current.dice.visible = false;
    }
    setLastResult(null);
    setLastResultDiceType(null);
    if (typeof setLastBreakdown === "function") setLastBreakdown(null);
  }, [diceCounts]);

  // Preload all GLB dice models in parallel; swap in active type as soon as it loads
  useEffect(() => {
    let cancelled = false;
    const loadOne = async (type) => {
      try {
        await loadDiceModel(type, {
          configUploadedModels: config?.uploadedModels,
          activeSkinRef,
          isThemedSkin,
          primaryColor,
          secondaryColor,
          defaultTexture: _defaultTexture,
        });
        if (cancelled) return;
        setLoadedModels(prev => ({ ...prev, [type]: true }));
        // If this is the currently-displayed type, swap it in immediately
        if (diceTypeRef.current === type && sceneRef.current?.swapDiceModel) {
          sceneRef.current.swapDiceModel(type);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(`Failed to load ${type}.glb:`, err);
        setModelLoadError(`Failed to load ${type}.glb`);
      }
    };
    Object.keys(DEFAULT_MODEL_URLS).forEach(loadOne);
    return () => { cancelled = true; };
  }, []);

  // `_modelCache` is intentionally NOT wiped when `config?.uploadedModels`
  // changes. The cache is module-scoped and meant to persist across every
  // DiceRoller mount for the lifetime of the page; an over-broad wipe here
  // (which is what used to live in this slot) fired on every TanStack
  // refetch / Realtime tick that produced a new `uploadedModels` object
  // reference, even when the underlying URLs hadn't changed — and the next
  // mount went back to fetching every glb from the network. If a campaign
  // genuinely swaps a die's URL mid-session, `loadDiceModel` overwrites the
  // cached entry naturally on the next miss, so users see the OLD model
  // briefly until the new load finishes; that's an acceptable tradeoff
  // for keeping warm-cache combat instant.

  // 200ms fallback guard — see `fallbackAllowedRef` above. After the
  // timer fires we re-invoke `swapDiceModel` for the active type so the
  // placeholder polyhedron shows up on genuinely slow loads.
  useEffect(() => {
    const t = setTimeout(() => {
      fallbackAllowedRef.current = true;
      const type = diceTypeRef.current;
      if (type && sceneRef.current?.swapDiceModel) {
        sceneRef.current.swapDiceModel(type);
      }
    }, 200);
    return () => clearTimeout(t);
  }, []);

  // ==============================================================
  // SCENE SETUP — runs once
  // ==============================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.025);

    // Square arena → camera fully top-down, walls visible as the dice box edge
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(0, 13, 0); camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x202830, 1.4);
    scene.add(hemi);
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
    mainLight.position.set(3, 10, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    Object.assign(mainLight.shadow.camera, { near:1, far:25, left:-5, right:5, top:5, bottom:-5 });
    scene.add(mainLight);

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1B2535, roughness: 0.85, metalness: 0.1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.width + 1, ARENA.depth + 1), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA.width, ARENA.depth, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xFF5300, transparent: true, opacity: 0.06, wireframe: true })
    );
    grid.rotation.x = -Math.PI / 2; grid.position.y = 0.01; scene.add(grid);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5300, transparent: true, opacity: 0 });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.width + 2, ARENA.depth + 2), glowMat);
    glowPlane.rotation.x = -Math.PI / 2; glowPlane.position.y = 0.005; scene.add(glowPlane);

    // EKG floor
    const ekgCanvas = document.createElement("canvas");
    ekgCanvas.width = 512; ekgCanvas.height = 512;
    const ekgCtx = ekgCanvas.getContext("2d");
    ekgCtx.fillStyle = "rgba(0,0,0,0)"; ekgCtx.fillRect(0, 0, 512, 512);
    const ekgTexture = new THREE.CanvasTexture(ekgCanvas);
    ekgTexture.minFilter = THREE.LinearFilter;
    const ekgFloorMat = new THREE.MeshBasicMaterial({
      map: ekgTexture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const ekgFloor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.width, ARENA.depth), ekgFloorMat);
    ekgFloor.rotation.x = -Math.PI / 2; ekgFloor.position.y = 0.02; scene.add(ekgFloor);

    const ekgWave = (px) => {
      const cycle = 140;
      const pos = ((px % cycle) + cycle) % cycle;
      const t = pos / cycle;
      if (t < 0.32) return 0;
      if (t < 0.37) return Math.sin((t - 0.32) / 0.05 * Math.PI) * 0.08;
      if (t < 0.41) return 0;
      if (t < 0.43) return -0.06;
      if (t < 0.47) return -0.06 + ((t - 0.43) / 0.04) * 0.55;
      if (t < 0.51) return 0.49 - ((t - 0.47) / 0.04) * 0.70;
      if (t < 0.55) return -0.21 + ((t - 0.51) / 0.04) * 0.21;
      if (t < 0.62) return 0;
      if (t < 0.72) return Math.sin((t - 0.62) / 0.10 * Math.PI) * 0.12;
      return 0;
    };
    let ekgCursor = 0;

    // Walls
    const wallMeshes = {};
    const WALL_THICKNESS = 0.4;
    const WALL_REST_Y = ARENA.wallHeight / 2;
    const WALL_REST_OPACITY = 0.88;
    for (const [name, config] of Object.entries(WALL_POSITIONS)) {
      const geo = new THREE.BoxGeometry(config.axis==="z"?ARENA.width:WALL_THICKNESS, ARENA.wallHeight, config.axis==="x"?ARENA.depth:WALL_THICKNESS);
      const mat = new THREE.MeshStandardMaterial({ color:0xFF5300, transparent:true, opacity:WALL_REST_OPACITY, emissive:0xFF5300, emissiveIntensity:0, roughness:0.45, metalness:0.35 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(config.pos[0], WALL_REST_Y, config.pos[2]); mesh.castShadow = true; scene.add(mesh);
      wallMeshes[name] = { mesh, mat, flashIntensity:0, targetY: WALL_REST_Y, currentY: WALL_REST_Y, restY: WALL_REST_Y, restOpacity: WALL_REST_OPACITY };
    }
    wallMeshesRef.current = wallMeshes;

    // Dice — wrapper Object3D holds either a placeholder polyhedron or the loaded GLB.
    // The wrapper is what the animation manipulates (position/rotation/scale).
    const dice = new THREE.Group();
    dice.position.set(0, 0.55, 0); dice.visible = false; scene.add(dice);

    const placeholderMat = new THREE.MeshStandardMaterial({ color:0xFF5300, roughness:0.35, metalness:0.18, emissive:0x000000, emissiveIntensity:0, side: THREE.DoubleSide });
    const placeholderGeo = buildDiceGeometry("d20");
    const placeholderMesh = new THREE.Mesh(placeholderGeo, placeholderMat);
    placeholderMesh.castShadow = true;
    placeholderMat.userData._origEmissive = new THREE.Color(0x000000);
    placeholderMat.userData._origEmissiveIntensity = 0;
    dice.add(placeholderMesh);

    // Track the active dice content + its materials for color/emissive flashes
    const diceState = {
      activeContent: placeholderMesh,
      isPlaceholder: true,
      materials: [placeholderMat],
    };

    // Ghost (preview that follows mouse before release) — uses simple polyhedron always
    const ghostMat = new THREE.MeshStandardMaterial({ color:0xFF5300, roughness:0.35, metalness:0.15, transparent:true, opacity:0.5, emissive:0xFF5300, emissiveIntensity:0.3, side: THREE.DoubleSide });
    const ghost = new THREE.Mesh(buildDiceGeometry("d20"), ghostMat);
    ghost.visible = false; scene.add(ghost);

    const particles = new EngineParticles(scene, 350);
    particleRef.current = particles;

    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.5);
    const raycaster = new THREE.Raycaster();
    const mouseToWorld = (mx, my) => {
      const rect = container.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(((mx-rect.left)/rect.width)*2-1, -((my-rect.top)/rect.height)*2+1), camera);
      const t = new THREE.Vector3(); raycaster.ray.intersectPlane(floorPlane, t); return t;
    };

    // Swap dice content. If a GLB is cached for this type, use it. Otherwise fall back to placeholder polyhedron.
    const swapDiceModel = (type) => {
      // Update ghost geometry (always polyhedron)
      const ghostGeo = buildDiceGeometry(type);
      ghost.geometry.dispose();
      ghost.geometry = ghostGeo;

      const cached = _modelCache[type];
      // Remove current content
      if (diceState.activeContent && diceState.activeContent.parent === dice) {
        dice.remove(diceState.activeContent);
      }
      if (cached) {
        // Clone the cached group on every add so the cache stays a pristine
        // template — sharing the same Group instance across scene mounts
        // leaves it tied to a disposed scene's parent on reopen.
        const cloned = cached.group.clone(true);

        // Cloned materials are shared by reference; ensure each has its own
        // _origEmissive userData so emissive flashes can reset cleanly.
        cloned.traverse(c => {
          if (c.isMesh && c.material) {
            const apply = (m) => {
              if (!m) return;
              if (!m.userData._origEmissive) {
                m.userData._origEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0x000000);
                m.userData._origEmissiveIntensity = m.emissiveIntensity ?? 0;
              }
            };
            if (Array.isArray(c.material)) c.material.forEach(apply);
            else apply(c.material);
          }
        });

        dice.add(cloned);
        diceState.activeContent = cloned;
        diceState.isPlaceholder = false;
        diceState.materials = collectMaterials(cloned);
        resetDiceEmissive(diceState.materials);
      } else if (fallbackAllowedRef.current) {
        // Fall back to placeholder polyhedron with the right shape.
        // Gated on `fallbackAllowedRef` so cache hits within the 200ms
        // post-mount window can swap in the real .glb without the user
        // ever seeing the orange placeholder. Once the guard expires
        // the timer effect re-invokes swapDiceModel and we land here.
        const newGeo = buildDiceGeometry(type);
        placeholderMesh.geometry.dispose();
        placeholderMesh.geometry = newGeo;
        dice.add(placeholderMesh);
        diceState.activeContent = placeholderMesh;
        diceState.isPlaceholder = true;
        diceState.materials = [placeholderMat];
        resetDiceEmissive(diceState.materials);
      } else {
        // Within the 200ms guard window with no cached model yet —
        // intentionally render nothing so the user doesn't see the
        // placeholder flash before the real dice arrive.
        diceState.activeContent = null;
        diceState.isPlaceholder = false;
        diceState.materials = [];
      }
    };

    // Multi-dice pool — each entry: { type, group, materials, timeline, result, eventIndex, settled }
    const multiDicePool = []; // populated at executeRoll, cleared between rolls

    // Spawn a cloned dice from a cached GLB
    const spawnDie = (type) => {
      const cached = _modelCache[type];
      if (!cached) return null; // model not loaded yet — caller must guard
      const cloned = cached.group.clone(true);
      cloned.traverse(c => {
        if (c.isMesh && c.material) {
          const apply = (m) => {
            if (!m) return;
            if (!m.userData._origEmissive) {
              m.userData._origEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0x000000);
              m.userData._origEmissiveIntensity = m.emissiveIntensity ?? 0;
            }
          };
          if (Array.isArray(c.material)) c.material.forEach(apply);
          else apply(c.material);
        }
      });
      const outerGroup = new THREE.Group();
      outerGroup.add(cloned);
      scene.add(outerGroup);
      outerGroup.visible = false;
      try {
        const skin = activeSkinRef.current;
        const primary = primaryColorRef.current;
        const secondary = secondaryColorRef.current;
        const hasCustomTexture = !!(skin?.customTextureUrl);
        if (hasCustomTexture && typeof applyDiceSkinToMesh === "function") {
          applyDiceSkinToMesh(cloned, skin, primary, secondary);
        }
        if (typeof applyVertexGradient === "function") {
          applyVertexGradient(cloned, primary, secondary, hasCustomTexture);
        }
      } catch (err) {
        console.error("Failed to apply skin/gradient to multi-dice clone:", err);
      }
      return { group: outerGroup, materials: collectMaterials(cloned) };
    };

    const despawnAllMultiDice = () => {
      console.log("[despawnAllMultiDice] called. pool size:", multiDicePool.length);
      for (const d of multiDicePool) {
        if (d.group?.parent) {
          d.group.parent.remove(d.group);
          console.log("[despawnAllMultiDice] removed", d.type);
        }
      }
      multiDicePool.length = 0;
      console.log("[despawnAllMultiDice] complete. pool size:", multiDicePool.length);
    };

    sceneRef.current = {
      renderer, scene, camera, dice, ghost, ghostMat,
      diceState, // { activeContent, isPlaceholder, materials }
      glowPlane, glowMat, ekgFloor, ekgFloorMat, ekgCanvas, ekgCtx, ekgTexture, ekgWave,
      mouseToWorld, swapDiceModel,
      mainLight,
      spawnDie, despawnAllMultiDice, multiDicePool,
    };

    // If a model finished preloading before the scene mounted, swap it in now
    swapDiceModel(diceTypeRef.current);

    const shakeState = { intensity:0, basePos: camera.position.clone() };
    let lastTime = performance.now(), trailTimer = 0, rafId;
    const struggle = { wobblePhase: 0, beatPhase: 0, active: false };

    const animate = (now) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(now - lastTime, 50); lastTime = now;
      const pb = playbackRef.current, tl = timelineRef.current;
      const ekgActive = ekgStateRef.current.active;

      // EKG floor
      if (ekgActive) {
        ekgFloorMat.opacity += (0.9 - ekgFloorMat.opacity) * 0.08;
        struggle.active = true;
        const cw = 512, ch = 512, midY = ch / 2;
        ekgCtx.fillStyle = "rgba(0, 0, 0, 0.06)"; ekgCtx.fillRect(0, 0, cw, ch);
        ekgCtx.strokeStyle = "rgba(255, 30, 30, 0.08)"; ekgCtx.lineWidth = 0.5;
        for (let gy = 0; gy < ch; gy += 32) { ekgCtx.beginPath(); ekgCtx.moveTo(0, gy); ekgCtx.lineTo(cw, gy); ekgCtx.stroke(); }
        for (let gx = 0; gx < cw; gx += 32) { ekgCtx.beginPath(); ekgCtx.moveTo(gx, 0); ekgCtx.lineTo(gx, ch); ekgCtx.stroke(); }
        const speed = 2.5;
        ekgCtx.strokeStyle = "#ff2222"; ekgCtx.lineWidth = 3;
        ekgCtx.shadowColor = "#ff0000"; ekgCtx.shadowBlur = 16;
        ekgCtx.beginPath();
        for (let i = 0; i < speed + 1; i++) {
          const px = ekgCursor + i;
          const screenX = px % cw;
          const val = ekgWave(px) * (ch * 0.7);
          if (i === 0 || screenX <= 1) ekgCtx.moveTo(screenX, midY - val);
          else ekgCtx.lineTo(screenX, midY - val);
        }
        ekgCtx.stroke(); ekgCtx.shadowBlur = 0;
        const clearX = (ekgCursor + speed + 1) % cw;
        ekgCtx.clearRect(clearX, 0, 40, ch);
        const dotX = (ekgCursor + speed) % cw;
        const dotY = midY - ekgWave(ekgCursor + speed) * (ch * 0.7);
        ekgCtx.beginPath(); ekgCtx.arc(dotX, dotY, 6, 0, Math.PI * 2); ekgCtx.fillStyle = "#ff4444"; ekgCtx.fill();
        ekgCtx.beginPath(); ekgCtx.arc(dotX, dotY, 12, 0, Math.PI * 2); ekgCtx.fillStyle = "rgba(255,50,50,0.25)"; ekgCtx.fill();
        ekgCursor += speed;
        ekgTexture.needsUpdate = true;
        const beatCycle = 140 / speed;
        struggle.beatPhase = (struggle.beatPhase + 1) % beatCycle;
        struggle.wobblePhase += dt * 0.003;
      } else {
        ekgFloorMat.opacity *= 0.92;
        struggle.active = false;
        if (ekgFloorMat.opacity < 0.01) {
          ekgCtx.clearRect(0, 0, 512, 512);
          ekgTexture.needsUpdate = true;
          ekgCursor = 0;
        }
      }

      // Wall lerp
      for (const w of Object.values(wallMeshesRef.current)) {
        const dy = w.targetY - w.currentY;
        if (Math.abs(dy) > 0.01) {
          const speed = w.targetY < w.currentY ? 0.45 : 0.12;
          w.currentY += dy * speed;
          w.mesh.position.y = w.currentY;
        }
      }

      // Ghost follows mouse
      const inter = interactionRef.current;
      if (inter.isHolding && inter.currentPos) {
        ghost.visible = true;
        ghost.position.lerp(new THREE.Vector3(inter.currentPos.x, 2.5, inter.currentPos.z), 0.3);
        ghost.rotation.x += 0.06; ghost.rotation.y += 0.09;
        ghostMat.opacity = 0.35 + Math.sin(now * 0.008) * 0.15;
        // Pre-roll particles based on equipped effect or modifier
        const mod = modifierRef.current;
        const equipped = equippedEffectRef.current;
        let style = null;
        if (mod === "rage") style = "fire";
        else if (mod === "deathSave") style = "ember";
        else if (mod === "inspiration") style = "note";
        else if (mod === "wildMagic") style = "rainbow";
        else if (equipped !== "default") style = EFFECTS[equipped].trail;
        if (style && Math.random() < 0.3) {
          particleRef.current?.emit([ghost.position.x, ghost.position.y, ghost.position.z], 1, style, 1, 500);
        }
      } else { ghost.visible = false; }

      // Playback
      let dicePosForOverlay = null;
      if (pb.playing && pb.multi) {
        const elapsed = now - pb.startTime;
        const pool = sceneRef.current.multiDicePool;
        const shakeScale = pool.length > 5 ? Math.max(0.2, 5 / pool.length) : 1;
        // shakeScale: 1 dice = 1.0, 5 dice = 1.0, 10 dice = 0.5, 20 dice = 0.25, 60 dice = 0.083
        for (const die of pool) {
          const tl = die.timeline;
          if (!tl || tl.path.length === 0) continue;
          if (elapsed >= tl.path[0].t && die.group) {
            die.group.visible = true;
            const { pos, rot, scale } = interpolatePath(tl.path, elapsed);
            die.group.position.set(pos[0], pos[1], pos[2]);
            die.group.quaternion.set(rot[0], rot[1], rot[2], rot[3]);
            die.group.scale.setScalar(scale);
          }
          // Fire per-die events (wallHit, particles, etc.) — but settled/reveal already filtered
          while (die.eventIndex < tl.events.length && tl.events[die.eventIndex].t <= elapsed) {
            handleEvent(tl.events[die.eventIndex]);
            die.eventIndex++;
          }
        }
        // Throttle camera shake when many dice are rolling — cumulative wall hits would be unwatchable
        if (shakeRef.current > 0) {
          shakeRef.current = shakeRef.current * shakeScale;
        }
        if (elapsed >= pb.longestDuration) {
          pb.playing = false;
          // Aggregate results
          const breakdown = { perType: {}, total: 0 };
          for (const d of pool) {
            if (!breakdown.perType[d.type]) breakdown.perType[d.type] = [];
            breakdown.perType[d.type].push(d.result);
            breakdown.total += d.result;
          }
          setLastBreakdown(breakdown);
          setLastResult(breakdown.total);
          setLastResultDiceType("multi"); // tag so UI can render aggregate
          setIsRolling(false);
          setResultHistory(prev => [...prev.slice(-9), { type: "multi", value: breakdown.total }]);
        }
      } else if (pb.playing && tl && pb.startTime !== null) {
        const elapsed = now - pb.startTime;
        if (tl.path.length > 0 && elapsed >= tl.path[0].t) {
          dice.visible = true;
          const { pos, rot, scale } = interpolatePath(tl.path, elapsed);
          dice.position.set(pos[0], pos[1], pos[2]);
          dice.quaternion.set(rot[0], rot[1], rot[2], rot[3]);
          dice.scale.setScalar(scale);

          if (struggle.active && tl.modifiers.meshEffect === "pulse") {
            const jitterAmt = 0.04 + Math.sin(now * 0.007) * 0.02;
            dice.position.x += (Math.random() - 0.5) * jitterAmt;
            dice.position.z += (Math.random() - 0.5) * jitterAmt;
            const wobbleX = Math.sin(struggle.wobblePhase * 2.3) * 0.08 + Math.sin(struggle.wobblePhase * 5.1) * 0.04;
            const wobbleZ = Math.cos(struggle.wobblePhase * 1.7) * 0.07 + Math.cos(struggle.wobblePhase * 4.3) * 0.03;
            const wobbleQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(wobbleX, 0, wobbleZ));
            dice.quaternion.multiply(wobbleQ);
            const beatCycle = 140 / 2.5;
            const beatNorm = struggle.beatPhase / beatCycle;
            let scalePulse = 1.0;
            if (beatNorm > 0.44 && beatNorm < 0.54) {
              const pulseT = (beatNorm - 0.44) / 0.10;
              scalePulse = 1.0 + Math.sin(pulseT * Math.PI) * 0.12;
            }
            dice.scale.setScalar(scale * scalePulse);
            if (beatNorm > 0.44 && beatNorm < 0.56) {
              const liftT = (beatNorm - 0.44) / 0.12;
              dice.position.y += Math.sin(liftT * Math.PI) * 0.15;
            }
            // Sickly emissive overlay (preserves GLB albedo/textures)
            const sickAmount = 0.3 + Math.sin(now * 0.005) * 0.2 + Math.random() * 0.1;
            setDiceEmissive(sceneRef.current.diceState.materials, 0x88aa66, 0.15 + sickAmount * 0.6);
          }

          // Trail particles
          trailTimer += dt;
          if (tl.modifiers.trailParticles && trailTimer > 45 && elapsed < tl.duration - 500) {
            trailTimer = 0;
            const ts = tl.modifiers.trailParticles;
            const style = ts==="notes"?"note" : ts==="fire"?"fire" : ts==="embers"?"ember" : ts==="rainbow"?"rainbow" : "sparkle";
            particleRef.current?.emit([pos[0],pos[1],pos[2]], ts==="fire"?3 : ts==="notes"?1 : 2, style, ts==="fire"?2.5 : 1.5, ts==="notes"?1400 : ts==="fire"?450 : 600);
          }

          dicePosForOverlay = { x: dice.position.x, y: dice.position.y, z: dice.position.z };
        }

        while (pb.eventIndex < tl.events.length && tl.events[pb.eventIndex].t <= elapsed) {
          handleEvent(tl.events[pb.eventIndex]); pb.eventIndex++;
        }
        if (tl.modifiers.cameraShake > 0) shakeState.intensity = tl.modifiers.cameraShake;
        if (elapsed >= tl.duration) pb.playing = false;
      } else if (dice.visible) {
        // Dice has settled — keep tracking its position for overlay
        dicePosForOverlay = { x: dice.position.x, y: dice.position.y, z: dice.position.z };
      }

      // Camera shake
      if (shakeRef.current > 0) { shakeState.intensity = Math.max(shakeState.intensity, shakeRef.current); shakeRef.current = 0; }
      if (shakeState.intensity > 0) {
        camera.position.x = shakeState.basePos.x + (Math.random()-0.5)*shakeState.intensity*0.3;
        camera.position.z = shakeState.basePos.z + (Math.random()-0.5)*shakeState.intensity*0.2;
        shakeState.intensity *= 0.96;
        if (shakeState.intensity < 0.001) { shakeState.intensity = 0; camera.position.copy(shakeState.basePos); }
      }

      // Wall flash decay
      for (const w of Object.values(wallMeshesRef.current)) {
        if (w.flashIntensity > 0) { w.flashIntensity *= 0.88; w.mat.emissiveIntensity = w.flashIntensity; if (w.flashIntensity < 0.01) w.flashIntensity = 0; }
      }

      // Glow
      const tgo = tl?.modifiers?.arenaGlow && pb.playing ? 0.12 : 0;
      glowMat.opacity += (tgo - glowMat.opacity) * 0.05;
      if (tl?.modifiers?.arenaGlow) glowMat.color.set(tl.modifiers.arenaGlow);

      // Mesh effects (emissive overlay — preserves GLB textures)
      const diceMats = sceneRef.current.diceState.materials;
      if (tl?.modifiers?.meshEffect && pb.playing) {
        switch (tl.modifiers.meshEffect) {
          case "fire":    setDiceEmissive(diceMats, 0xff2200, 0.3 + Math.sin(now*0.012)*0.15 + Math.random()*0.1); break;
          case "pulse":   setDiceEmissive(diceMats, 0x880000, 0.1 + Math.abs(Math.sin(now*0.004))*0.5); break;
          case "sparkle": setDiceEmissive(diceMats, 0xffcc00, 0.2 + Math.sin(now*0.008)*0.3); break;
          case "rainbow": setDiceEmissiveHSL(diceMats, (now*0.001)%1, 1, 0.35, 0.5); break;
        }
      } else if (!pb.playing) {
        decayDiceEmissive(diceMats, 0.95);
      }

      particles.update(dt);
      renderer.render(scene, camera);

      // Update result number overlay position — projects dice 3D pos to screen
      if (resultOverlayRef.current) {
        resultOverlayRef.current.style.left = "50%";
        resultOverlayRef.current.style.top = "20px";
        resultOverlayRef.current.style.transform = "translateX(-50%)";
      }
    };
    rafId = requestAnimationFrame(animate);

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      if (diceState.activeContent && diceState.activeContent.parent) {
        diceState.activeContent.parent.remove(diceState.activeContent);
      }
      despawnAllMultiDice();
      cancelAnimationFrame(rafId);
      ro.disconnect();
      particles.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Sync EKG state to ref
  useEffect(() => { ekgStateRef.current.active = showEKG; }, [showEKG]);

  // Swap dice geometry when type changes
  useEffect(() => {
    if (sceneRef.current.swapDiceModel) {
      sceneRef.current.swapDiceModel(diceType);
    }
  }, [diceType]);

  const handleEvent = useCallback((ev) => {
    const logEntry = `[${Math.round(ev.t)}ms] ${ev.type}${ev.wall?` → ${ev.wall}`:""}${ev.effect?` (${ev.effect})`:""}${ev.value!==undefined?` = ${ev.value}`:""}`;
    setEventLog(prev => [...prev.slice(-18), logEntry]);
    switch (ev.type) {
      case "wallDropSingle": {
        const w = wallMeshesRef.current[ev.wall];
        if (w) {
          // Snap the wall up high, then animate it back down — slam intro
          w.currentY = ARENA.wallHeight * 2.2;
          w.mesh.position.y = w.currentY;
          w.mat.opacity = 0.9;
          w.targetY = w.restY;
        }
        break;
      }
      case "wallLandSingle": {
        const w = wallMeshesRef.current[ev.wall];
        if (w) {
          w.flashIntensity = 3.5; w.mat.emissiveIntensity = 3.5;
          const config = WALL_POSITIONS[ev.wall];
          particleRef.current?.emit(config.pos, 22, "impact", 5, 600);
          shakeRef.current = 0.32;
        }
        break;
      }
      case "wallHit": {
        const w = wallMeshesRef.current[ev.wall];
        if (w) {
          w.flashIntensity = (ev.intensity||0.5)*2.5; w.mat.emissiveIntensity = w.flashIntensity;
          particleRef.current?.emit(w.mesh.position.toArray(), Math.floor(8+(ev.intensity||0.5)*15), "impact", (ev.intensity||0.5)*4, 400);
        }
        break;
      }
      case "particles": particleRef.current?.emit(ev.pos||[0,0.5,0], 12, "impact", (ev.intensity||0.5)*3); break;
      case "sound": {
        const v = ev.volume ?? 0.6;
        if (ev.sound === "diceSettle") playRollSound(v);
        else if (ev.sound === "wallSlam" || ev.sound === "wallThunk") playRollSound(Math.min(0.5, v * 0.5));
        break;
      }
      case "overlay": setOverlayText(ev.text); setTimeout(()=>setOverlayText(null), 2200); break;
      case "settled": setTimeout(()=>{
        for (const w of Object.values(wallMeshesRef.current)) { w.mat.opacity = w.restOpacity; w.targetY = w.restY; }
      }, 500); break;
      case "reveal": {
        setLastResult(ev.value);
        if (typeof ev.value === "number") {
          onRollCompleteRef.current?.(ev.value);
        }
        if (autoCloseOnReveal && onClose) {
          setTimeout(() => onClose(), 1600);
        }
        if (ev.diceType === "d20") {
          if (ev.value === 20) playCritSuccessSound();
          else if (ev.value === 1) playCritFailSound();
        }
        if (ev.diceType === "d20" && ev.value === 20) {
          setRevealOverlay("crit-success");
          setTimeout(() => setRevealOverlay(null), 1600);
        } else if (ev.diceType === "d20" && ev.value === 1) {
          setRevealOverlay("crit-fail");
          setTimeout(() => setRevealOverlay(null), 1600);
        }
        setLastResultDiceType(ev.diceType);
        setIsRolling(false);
        setShowEKG(false);
        setResultHistory(prev => [...prev.slice(-9), { type: ev.diceType, value: ev.value }]);
        const sides = DICE_CONFIGS[ev.diceType]?.sides ?? 20;
        if (ev.value === sides) {
          for (let i=0;i<4;i++) setTimeout(()=>particleRef.current?.emit([0,1,0],25,"sparkle",5,900),i*120);
        } else if (ev.value === 1) {
          particleRef.current?.emit([0,0.5,0],15,"ember",2,1000);
        }
        break;
      }
      case "rejected": setIsRolling(false); setShowEKG(false); break;
      case "arenaEffect": if (ev.effect === "dim") setShowEKG(true); break;
    }
  }, [autoCloseOnReveal, onClose]);

  // ==============================================================
  // ROLL EXECUTION
  // ==============================================================
  const executeRoll = useCallback((shakeIntensity = 0.7, releaseVector = null, forceLazy = false) => {
    if (playbackRef.current.playing) return;

    const totalDice = Object.values(diceCounts).reduce((s, n) => s + n, 0);
    if (totalDice <= 1) {
      const type = diceTypeRef.current;
      const sides = DICE_CONFIGS[type]?.sides ?? 20;
      const result = forcedResultRef.current != null
        ? Math.min(Math.max(1, forcedResultRef.current), sides)
        : Math.floor(Math.random() * sides) + 1;
      setLastResult(null); setLastResultDiceType(null); setLastBreakdown(null); setOverlayText(null); setEventLog([]); setIsRolling(true); setShowEKG(false);

      const isLazy = forceLazy || shakeIntensity < 0.15;
      let timeline;
      if (isLazy) {
        timeline = buildLazyRoll(result, type, config?.faceRotations);
        if (strictMode) {
          timeline.events = timeline.events.filter(e => e.type !== "reveal");
          timeline.events.push({ t: timeline.duration - 100, type: "overlay", text: "REJECTED — Roll properly!", style: "reject" });
          timeline.events.push({ t: timeline.duration, type: "rejected" });
          timeline.events.sort((a, b) => a.t - b.t);
        }
      } else if (shakeIntensity > 0.85) {
        timeline = buildEpicRoll(result, type, releaseVector, config?.faceRotations);
      } else {
        timeline = buildNormalRoll(result, type, shakeIntensity, releaseVector, config?.faceRotations);
      }

      // Character state modifier
      switch (modifier) {
        case "rage": timeline = applyRage(timeline); break;
        case "deathSave": timeline = applyDeathSave(timeline); break;
        case "inspiration": timeline = applyInspiration(timeline); break;
        case "wildMagic": timeline = applyWildMagic(timeline); break;
      }
      // Equipped effect (only fills in trail if state didn't already)
      timeline = applyEquippedEffect(timeline, equippedEffectRef.current);

      sceneRef.current.dice.visible = false;
      resetDiceEmissive(sceneRef.current.diceState.materials);
      for (const w of Object.values(wallMeshesRef.current)) {
        // Walls stay visible at rest; slam intro will yank them up and slam back down
        w.mat.opacity = w.restOpacity;
        w.targetY = w.restY; w.currentY = w.restY;
        w.mesh.position.y = w.restY; w.flashIntensity = 0;
        w.mat.emissiveIntensity = 0;
      }
      timelineRef.current = timeline;
      playbackRef.current = { startTime: performance.now(), eventIndex: 0, playing: true };
      return;
    }

    // === MULTI-DICE PATH ===
    setLastResult(null); setLastResultDiceType(null); setLastBreakdown(null); setOverlayText(null); setIsRolling(true); setShowEKG(false);

    // Clean any previous multi-dice from prior roll
    sceneRef.current.despawnAllMultiDice?.();
    const pool = sceneRef.current.multiDicePool;

    // Hide the single-dice Group during multi mode
    sceneRef.current.dice.visible = false;

    // Build the array of dice to spawn from the tray
    const diceList = [];
    for (const [type, count] of Object.entries(diceCounts)) {
      for (let i = 0; i < count; i++) diceList.push({ type });
    }

    const settleTargets = generateSettleGrid(diceList.length);

    // Spawn each, build per-dice timeline, push into pool
    for (let i = 0; i < diceList.length; i++) {
      const { type } = diceList[i];
      const spawned = sceneRef.current.spawnDie(type);
      if (!spawned) continue;
      const sides = DICE_CONFIGS[type]?.sides ?? 20;
      const result = Math.floor(Math.random() * sides) + 1;
      // Build a normal-roll timeline (same as single-dice)
      let timeline = buildNormalRoll(result, type, 0.7, null);
      // Filter out "reveal" events — we don't want each dice firing setLastResult
      timeline.events = timeline.events.filter(e => e.type !== "reveal" && e.type !== "settled");
      const target = settleTargets[i];
      // Replace the settled path keyframes with the grid-assigned position
      if (timeline.path.length >= 2) {
        timeline.path[timeline.path.length - 2] = {
          ...timeline.path[timeline.path.length - 2],
          pos: [target[0], 1.0, target[2]],
        };
        timeline.path[timeline.path.length - 1] = {
          ...timeline.path[timeline.path.length - 1],
          pos: [target[0], 0.55, target[2]],
        };
      }
      const startOffset = Math.random() * 250 + 50;
      timeline.path = timeline.path.map(kf => ({ ...kf, t: kf.t + startOffset }));
      timeline.events = timeline.events.map(ev => ({ ...ev, t: ev.t + startOffset }));
      timeline.duration += startOffset;
      // Apply equipped effect (trail particles only — no state modifiers in multi mode for now)
      timeline = applyEquippedEffect(timeline, equippedEffectRef.current);
      pool.push({
        type, group: spawned.group, materials: spawned.materials,
        timeline, result, eventIndex: 0, settled: false,
      });
    }

    // Setup playback for multi mode
    const longestDuration = Math.max(...pool.map(d => d.timeline.duration), 1000);
    timelineRef.current = null; // single-dice timeline disabled
    playbackRef.current = {
      startTime: performance.now(),
      eventIndex: 0,
      playing: true,
      multi: true,
      longestDuration,
    };

    // Reset walls/glow as in single mode
    for (const w of Object.values(wallMeshesRef.current)) {
      w.mat.opacity = w.restOpacity; w.targetY = w.restY; w.currentY = w.restY;
      w.mesh.position.y = w.restY; w.flashIntensity = 0; w.mat.emissiveIntensity = 0;
    }
  }, [strictMode, config, modifier, diceCounts]);

  useImperativeHandle(ref, () => ({
    roll: () => executeRoll(0.7, null, false),
  }), [executeRoll]);

  // Auto-roll latch for the spectator path. Watch isOpen + forcedResult
  // and fire executeRoll exactly once per (open + forced result) edge.
  // Tracks the last result we've already auto-rolled for so subsequent
  // re-renders with the same forcedResult don't double-fire.
  const autoRolledForRef = useRef(null);
  useEffect(() => {
    if (!autoRollOnOpen) return;
    if (!isOpen) {
      autoRolledForRef.current = null;
      return;
    }
    if (forcedResult == null) return;
    // Composite key catches "same forcedResult, new arena" cases (e.g.
    // a damage-then-attack sequence where d20 → d8 → d20 lands on the
    // same value — the dice-type swap would normally re-mount and reset
    // this ref via the unmount path, but guarding by value+type is
    // robust either way).
    const key = `${diceTypeRef.current || initialDice || "?"}:${forcedResult}`;
    if (autoRolledForRef.current === key) return;
    autoRolledForRef.current = key;
    // Defer one tick so the scene mount + dice tray initialization
    // settle before the roll kicks off. executeRoll otherwise no-ops
    // when totalDice resolves to zero on the very first paint.
    const t = setTimeout(() => executeRoll(0.7, null, false), 60);
    return () => clearTimeout(t);
  }, [autoRollOnOpen, isOpen, forcedResult, initialDice, executeRoll]);

  const handleRollClick = useCallback(() => {
    if (totalDice === 0) return;
    if (totalDice === 1) {
      const type = Object.keys(diceCounts).find(k => diceCounts[k] > 0);
      if (type) {
        diceTypeRef.current = type;
        setDiceType(type);
        if (sceneRef.current.swapDiceModel) sceneRef.current.swapDiceModel(type);
        executeRoll(0.7, null, false);
      }
    } else {
      const type = Object.keys(diceCounts).find(k => diceCounts[k] > 0);
      if (type) {
        diceTypeRef.current = type;
        setDiceType(type);
        if (sceneRef.current.swapDiceModel) sceneRef.current.swapDiceModel(type);
        executeRoll(0.7, null, false);
      }
      setMultiDiceHint(true);
      setTimeout(() => setMultiDiceHint(false), 4000);
    }
  }, [totalDice, diceCounts, executeRoll]);

  // Mouse interactions
  const handlePointerDown = useCallback((e) => {
    if (playbackRef.current.playing || isRolling) return;
    const inter = interactionRef.current;
    inter.shakeDetector.reset(); inter.isDragging = true; inter.isHolding = true;
    inter.shakeDetector.addSample(e.clientX, e.clientY, performance.now());
    if (sceneRef.current.mouseToWorld) inter.currentPos = sceneRef.current.mouseToWorld(e.clientX, e.clientY);
    setIsHolding(true); setShakeLevel(0); setLastResult(null); setLastResultDiceType(null); setOverlayText(null); setShowEKG(false);
  }, [isRolling]);

  const handlePointerMove = useCallback((e) => {
    const inter = interactionRef.current;
    if (!inter.isDragging) return;
    inter.shakeDetector.addSample(e.clientX, e.clientY, performance.now());
    if (sceneRef.current.mouseToWorld) inter.currentPos = sceneRef.current.mouseToWorld(e.clientX, e.clientY);
    setShakeLevel(inter.shakeDetector.getIntensity());
  }, []);

  const handlePointerUp = useCallback(() => {
    const inter = interactionRef.current;
    if (!inter.isDragging) return;
    inter.isDragging = false; inter.isHolding = false; setIsHolding(false);
    executeRoll(inter.shakeDetector.getIntensity(), inter.shakeDetector.getReleaseVector(), false);
    inter.shakeDetector.reset(); setShakeLevel(0);
  }, [executeRoll]);

  // Computed
  const lastSides = lastResultDiceType && lastResultDiceType !== "multi"
    ? (DICE_CONFIGS[lastResultDiceType]?.sides ?? 20)
    : 20;
  const modalSize = 500;
  const arenaFrameStyle = {
    ...S.arenaFrame,
    width: `min(${modalSize}px, calc(100vw - 48px))`,
    height: `min(${modalSize}px, calc(100vh - 48px))`,
    aspectRatio: undefined,
  };
  const isCritMax = lastResult !== null && lastResultDiceType !== "multi" && lastResult === lastSides;
  const isCritMin = lastResult !== null && lastResultDiceType !== "multi" && lastResult === 1;
  const shakeColor = shakeLevel<0.15?"#ff4444":shakeLevel<0.5?"#ff8844":shakeLevel<0.8?"#ffcc00":"#44ff88";

  // ==============================================================
  // RENDER
  // ==============================================================
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: isOpen ? "flex" : "none",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.78)",
      backdropFilter: "blur(8px)",
      padding: 24,
      overflow: "auto",
    }}>
      <div style={{ ...S.page, position: "relative", minHeight: "auto", maxWidth: "100%", maxHeight: "100%" }}>
      <style>{globalCSS}</style>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close dice roller"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255, 83, 0, 0.15)",
            border: "1px solid rgba(255, 83, 0, 0.4)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 100,
          }}
        >
          <X size={18} />
        </button>
      )}

      {/* === Top Bar: Title + Roll History === */}
      <header style={S.header}>
        <div style={S.titleBlock}>
          <div style={S.titleLine}>
            <span style={S.titleMark}>◆</span>
            <h1 style={S.title}>DICE FORGE</h1>
            <span style={S.titleSub}>Choreography v3</span>
          </div>
          <div style={S.subtitle}>Click & drag in the arena to pick up · shake · release to throw</div>
        </div>

        {!compact && (
          <div style={S.historyWrap}>
            <div style={S.historyLabel}>RECENT ROLLS</div>
            <div style={S.historyChips}>
              {resultHistory.length === 0 && <div style={S.historyEmpty}>—</div>}
              {resultHistory.slice().reverse().map((r, i) => {
                const sides = DICE_CONFIGS[r.type]?.sides ?? 20;
                const isMax = r.value === sides, isMin = r.value === 1;
                return (
                  <div key={i} style={{
                    ...S.chip,
                    background: isMax ? "rgba(255,215,0,0.12)" : isMin ? "rgba(255,68,68,0.12)" : "rgba(255,255,255,0.04)",
                    borderColor: isMax ? "rgba(255,215,0,0.45)" : isMin ? "rgba(255,68,68,0.4)" : "rgba(255,255,255,0.08)",
                  }}>
                    <span style={{ ...S.chipType, color: isMax ? "#e8c34a" : isMin ? "#ff7a7a" : "#7d8494" }}>{r.type}</span>
                    <span style={{ ...S.chipValue, color: isMax ? "#ffd700" : isMin ? "#ff4444" : "#e8e9ed" }}>{r.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* === Center: Arena === */}
      <main style={S.arenaWrap}>
        <div style={arenaFrameStyle}>
          <div
            ref={mountRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ ...S.arena, cursor: isHolding ? "grabbing" : isRolling ? "default" : "grab" }}
          >
            {/* Idle hint */}
            {!isRolling && !isHolding && lastResult === null && (
              <div style={S.idleHint}>
                <div style={S.idleHintIcon}>◇</div>
                <div>Click & drag to pick up the {DICE_CONFIGS[diceType]?.label ?? "d20"}</div>
                <div style={S.idleHintSub}>or use the ROLL button below</div>
              </div>
            )}

            {/* Shake meter */}
            {isHolding && (
              <div style={S.shakeMeterWrap}>
                <div style={{ ...S.shakeMeterLabel, color: shakeColor }}>
                  {shakeLevel<0.15?"Shake it!":shakeLevel<0.5?"Keep going...":shakeLevel<0.8?"Nice shake!":"EPIC SHAKE!"}
                </div>
                <div style={S.shakeMeterBar}>
                  <div style={{ ...S.shakeMeterFill, width: `${shakeLevel*100}%` }} />
                </div>
              </div>
            )}

            {/* In-arena overlay text (lazy roll shame, rejection) */}
            {overlayText && (
              <div style={S.shameText}>{overlayText}</div>
            )}

            {/* Floating result number — anchored to dice screen position */}
            <div
              ref={resultOverlayRef}
              onMouseEnter={() => setHoveringResult(true)}
              onMouseLeave={() => setHoveringResult(false)}
              style={{
                ...S.resultOverlay,
                opacity: lastResult !== null ? 1 : 0,
                cursor: lastResultDiceType === "multi" ? "help" : "default",
                color: isCritMax ? "#ffd700" : isCritMin ? "#ff3333" : "#ffffff",
                textShadow: isCritMax
                  ? "0 0 28px rgba(255,215,0,0.85), 0 0 60px rgba(255,215,0,0.5), 0 4px 12px rgba(0,0,0,0.6)"
                  : isCritMin
                  ? "0 0 28px rgba(255,40,40,0.7), 0 4px 12px rgba(0,0,0,0.6)"
                  : "0 0 18px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.7)",
              }}
            >
              <div style={S.resultDiceType}>
                {lastResultDiceType === "multi" ? "TOTAL" : lastResultDiceType}
              </div>
              <div style={S.resultValue}>{lastResult}</div>
              {isCritMax && <div style={S.resultBadge}>CRIT</div>}
              {isCritMin && <div style={{ ...S.resultBadge, color: "#ff5555", borderColor: "rgba(255,68,68,0.5)" }}>FAIL</div>}
              {hoveringResult && lastResultDiceType === "multi" && lastBreakdown && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "rgba(15, 18, 28, 0.96)",
                  border: "1px solid rgba(255, 83, 0, 0.4)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "ui-monospace, 'Cascadia Code', monospace",
                  color: "#e8e9ed",
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}>
                  {Object.entries(lastBreakdown.perType).map(([type, rolls]) => (
                    <div key={type} style={{ marginBottom: 4 }}>
                      <span style={{ color: "#FF5300", fontWeight: 700 }}>{rolls.length}{type}:</span>
                      {' '}
                      {rolls.join(' + ')}
                      {' = '}
                      <span style={{ color: "#fff", fontWeight: 700 }}>{rolls.reduce((s, n) => s + n, 0)}</span>
                    </div>
                  ))}
                  <div style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px solid rgba(255, 83, 0, 0.3)",
                    color: "#fff",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}>
                    TOTAL: {lastBreakdown.total}
                  </div>
                </div>
              )}
            </div>

            {revealOverlay && (
              <img
                src={REVEAL_GIFS[revealOverlay]}
                alt=""
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 300,
                  height: 300,
                  objectFit: "contain",
                  pointerEvents: "none",
                  zIndex: 50,
                }}
              />
            )}
          </div>

          {/* Arena corner accents */}
          <div style={{ ...S.corner, top: -1, left: -1, borderTop: "2px solid #FF5300", borderLeft: "2px solid #FF5300" }} />
          <div style={{ ...S.corner, top: -1, right: -1, borderTop: "2px solid #FF5300", borderRight: "2px solid #FF5300" }} />
          <div style={{ ...S.corner, bottom: -1, left: -1, borderBottom: "2px solid #FF5300", borderLeft: "2px solid #FF5300" }} />
          <div style={{ ...S.corner, bottom: -1, right: -1, borderBottom: "2px solid #FF5300", borderRight: "2px solid #FF5300" }} />
        </div>
      </main>

      {/* === Bottom: Controls === */}
      <footer style={S.controlsWrap}>
        {/* Roll Tray */}
        {!compact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, color: "#8d92a1" }}>ROLL TRAY</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: totalDice > 0 ? "#fff" : "#5d6573", fontWeight: 600 }}>
                  Total: {totalDice} {totalDice === 1 ? "die" : "dice"}
                </div>
                <button
                  onClick={clearTray}
                  disabled={totalDice === 0 && lastResult === null}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(255, 83, 0, 0.3)",
                    background: "rgba(255, 83, 0, 0.08)",
                    color: "#FF5300",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    cursor: (totalDice === 0 && lastResult === null) ? "not-allowed" : "pointer",
                    opacity: (totalDice === 0 && lastResult === null) ? 0.4 : 1,
                    transition: "all 150ms",
                    marginLeft: 12,
                  }}
                  title="Reset tray and clear arena"
                >
                  Clear
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {DICE_ORDER.map(type => {
                const count = diceCounts[type];
                const active = count > 0;
                return (
                  <div key={type} style={{
                    padding: "10px 8px", borderRadius: 12,
                    background: active
                      ? "linear-gradient(135deg, rgba(255,83,0,0.18), rgba(255,83,0,0.04))"
                      : "rgba(255,255,255,0.025)",
                    border: active ? "1px solid #FF5300" : "1px solid rgba(255,255,255,0.07)",
                    boxShadow: active ? "0 0 14px rgba(255,83,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    transition: "all 180ms",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: active ? "#FF5300" : "#5f6373", fontSize: 12 }}>◆</span>
                      <span style={{ color: active ? "#fff" : "#8d92a1", fontWeight: 700, fontSize: 13 }}>{type}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: active ? "#fff" : "#5d6573", lineHeight: 1 }}>{count}</div>
                    <div style={{ display: "flex", gap: 4, width: "100%" }}>
                      <button
                        onClick={() => decDice(type)}
                        disabled={count === 0}
                        style={{
                          flex: 1, padding: "4px 0", fontSize: 14, fontWeight: 700,
                          borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                          background: count > 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                          color: count > 0 ? "#fff" : "#3d4350",
                          cursor: count > 0 ? "pointer" : "not-allowed",
                        }}
                      >−</button>
                      <button
                        onClick={() => incDice(type)}
                        disabled={count === 10}
                        style={{
                          flex: 1, padding: "4px 0", fontSize: 14, fontWeight: 700,
                          borderRadius: 6, border: "1px solid rgba(255,83,0,0.4)",
                          background: count < 10 ? "rgba(255,83,0,0.18)" : "rgba(255,83,0,0.05)",
                          color: count < 10 ? "#FF5300" : "#5d3520",
                          cursor: count < 10 ? "pointer" : "not-allowed",
                        }}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Effect carousel */}
        {!compact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", fontWeight: 700, color: "#8d92a1" }}>EFFECT</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {EFFECT_CATEGORIES.map(cat => {
                  const active = effectCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setEffectCategory(cat)}
                      style={{
                        padding: "5px 12px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
                        borderRadius: 14,
                        background: active ? "rgba(255,83,0,0.18)" : "rgba(255,255,255,0.025)",
                        border: active ? "1px solid #FF5300" : "1px solid rgba(255,255,255,0.07)",
                        color: active ? "#fff" : "#8d92a1",
                        cursor: "pointer",
                        transition: "all 150ms",
                      }}
                    >{cat}</button>
                  );
                })}
              </div>
            </div>
            <div style={{
              display: "flex", gap: 12,
              overflowX: "auto", overflowY: "hidden",
              scrollSnapType: "x mandatory",
              paddingBottom: 8,
              scrollbarWidth: "thin",
            }}>
              {(() => {
                const visible = EFFECT_CATEGORY_MEMBERS[effectCategory] || [];
                if (visible.length === 0) {
                  return (
                    <div style={{
                      flex: "1 0 auto", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#5d6573", fontStyle: "italic", fontSize: 13,
                    }}>
                      No effects in this category yet — coming soon.
                    </div>
                  );
                }
                return visible.map(key => {
                  const e = EFFECTS[key];
                  const active = equippedEffect === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setEquippedEffect(key)}
                      style={{
                        flex: "0 0 auto", scrollSnapAlign: "start",
                        minWidth: 96, padding: "12px 14px",
                        borderRadius: 12,
                        background: active ? `linear-gradient(135deg, ${e.color}26, ${e.color}0a)` : "rgba(255,255,255,0.025)",
                        border: active ? `1px solid ${e.color}` : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: active ? `0 0 16px ${e.color}40, inset 0 1px 0 rgba(255,255,255,0.05)` : "none",
                        color: active ? "#fff" : "#8d92a1",
                        cursor: "pointer", transition: "all 180ms",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      }}
                    >
                      <div style={{ fontSize: 22, color: active ? e.color : "#6a6f80", textShadow: active ? `0 0 12px ${e.color}80` : "none" }}>{e.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{e.label}</div>
                    </button>
                  );
                });
              })()}
              {/* Tavern card always at the end */}
              <button style={{
                flex: "0 0 auto", scrollSnapAlign: "start",
                minWidth: 96, padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.025)",
                border: "1px dashed rgba(255,255,255,0.15)",
                color: "#8d92a1", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }} title="More effects coming from the Tavern">
                <div style={{ fontSize: 20, color: "#5f6373" }}>+</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Tavern</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>more soon</div>
              </button>
            </div>
          </div>
        )}

        {/* Roll button */}
        <div style={S.rollButtonWrap}>
          <button
            onClick={handleRollClick}
            disabled={isRolling || isHolding || totalDice === 0}
            style={{
              ...S.rollButton,
              cursor: (isRolling || isHolding || totalDice === 0) ? "not-allowed" : "pointer",
              opacity: (isRolling || isHolding || totalDice === 0) ? 0.5 : 1,
              background: (isRolling || isHolding || totalDice === 0)
                ? "linear-gradient(135deg, rgba(255,83,0,0.25), rgba(255,120,60,0.15))"
                : "linear-gradient(135deg, #FF5300 0%, #ff7733 100%)",
            }}
          >
            <span style={S.rollButtonInner}>
              {isRolling ? "ROLLING..." : "ROLL ALL"}
            </span>
          </button>
          {multiDiceHint && (
            <div style={{
              fontSize: 11, color: "#f8a47c", fontStyle: "italic", textAlign: "center",
              marginTop: 6, opacity: 0.85,
            }}>
              Multi-dice rolling lands in the next update — rolling the first die for now.
            </div>
          )}
          <div style={S.rollHint}>
            shake harder → bigger bounces · shake light → walk of shame
          </div>
        </div>

        {/* GM tools row */}
        {!compact && (
          <div style={{ ...S.controlRow, gap: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={S.gmTools}>
              <button
                onClick={() => setStrictMode(!strictMode)}
                style={{
                  ...S.strictBtn,
                  background: strictMode ? "rgba(255,68,68,0.12)" : "rgba(255,255,255,0.025)",
                  borderColor: strictMode ? "#ff4444" : "rgba(255,255,255,0.07)",
                  color: strictMode ? "#ff7777" : "#8d92a1",
                }}
                title="GM enforcement: lazy rolls get rejected"
              >
                <span style={{
                  ...S.checkbox,
                  background: strictMode ? "#ff4444" : "transparent",
                  borderColor: strictMode ? "#ff4444" : "#555",
                }}>{strictMode ? "✓" : ""}</span>
                Strict Mode
              </button>
              <button
                onClick={() => setShowEventLog(v => !v)}
                style={{
                  ...S.strictBtn,
                  background: showEventLog ? "rgba(255,83,0,0.1)" : "rgba(255,255,255,0.025)",
                  borderColor: showEventLog ? "#FF5300" : "rgba(255,255,255,0.07)",
                  color: showEventLog ? "#FF5300" : "#8d92a1",
                }}
                title="Show timeline event log (debug)"
              >
                {showEventLog ? "Hide" : "Show"} Log
              </button>
            </div>
          </div>
        )}

        {/* Optional event log */}
        {!compact && showEventLog && (
          <div style={S.eventLogWrap}>
            <div style={S.eventLogLabel}>TIMELINE EVENTS</div>
            <div style={S.eventLog}>
              {eventLog.length === 0 && <span style={{ opacity: 0.3 }}>Events appear here as the timeline fires...</span>}
              {eventLog.map((log, i) => (
                <div key={i} style={{
                  color:
                    log.includes("wallHit") ? "#FF5300" :
                    log.includes("reveal") ? "#ffd700" :
                    log.includes("overlay") || log.includes("rejected") ? "#ff8844" :
                    log.includes("settled") ? "#44ff88" :
                    log.includes("wallLand") ? "#ff7744" :
                    log.includes("wallDrop") ? "#ff9955" : "#666"
                }}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </footer>
      </div>
    </div>
  );
});
export default DiceRoller;

// ============================================================
// STYLES
// ============================================================
const FONT_DISPLAY = "'Cream', 'Cinzel', 'Stack Sans Notch', Georgia, serif";
const FONT_BODY = "'Cream', 'Stack Sans Notch', system-ui, -apple-system, sans-serif";

const S = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #1a1f30 0%, #0a0d18 60%, #050710 100%)",
    color: "#e8e9ed",
    fontFamily: FONT_BODY,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px 24px 32px",
    boxSizing: "border-box",
    userSelect: "none",
  },

  // Header
  header: {
    width: "100%",
    maxWidth: 980,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginBottom: 18,
  },
  titleBlock: { display: "flex", flexDirection: "column", gap: 4 },
  titleLine: { display: "flex", alignItems: "baseline", gap: 12 },
  titleMark: { color: "#FF5300", fontSize: 22, lineHeight: 1, transform: "translateY(2px)" },
  title: {
    margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "3px",
    color: "#f5e6d3", fontFamily: FONT_DISPLAY,
    textShadow: "0 2px 12px rgba(255,83,0,0.15)",
  },
  titleSub: {
    fontSize: 11, color: "#FF5300", fontWeight: 600, letterSpacing: "2px",
    textTransform: "uppercase", paddingLeft: 8,
    borderLeft: "1px solid rgba(255,83,0,0.4)",
  },
  subtitle: { fontSize: 12, color: "#6a6f80", letterSpacing: "0.3px", paddingLeft: 34 },

  historyWrap: {
    background: "rgba(15,20,32,0.7)",
    border: "1px solid rgba(255,83,0,0.12)",
    borderRadius: 10,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    backdropFilter: "blur(8px)",
  },
  historyLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: "2px",
    color: "#FF5300", whiteSpace: "nowrap", opacity: 0.85,
  },
  historyChips: {
    display: "flex", flexDirection: "row-reverse", justifyContent: "flex-end",
    gap: 6, flex: 1, overflow: "hidden",
  },
  historyEmpty: { color: "#444", fontSize: 12, fontStyle: "italic" },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 10px", borderRadius: 6,
    border: "1px solid", minWidth: 56, justifyContent: "center",
  },
  chipType: { fontSize: 9, fontWeight: 600, letterSpacing: "0.5px", textTransform: "lowercase" },
  chipValue: { fontSize: 14, fontWeight: 800, fontFamily: FONT_DISPLAY },

  // Arena
  arenaWrap: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  arenaFrame: {
    position: "relative",
    width: "min(950px, calc(100vw - 48px))",
    aspectRatio: "1 / 1",
    background: "#0d111c",
    border: "1px solid rgba(255,83,0,0.15)",
    borderRadius: 6,
    boxShadow:
      "0 0 0 1px rgba(255,83,0,0.05), " +
      "0 20px 60px rgba(0,0,0,0.6), " +
      "inset 0 0 80px rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  arena: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  corner: {
    position: "absolute",
    width: 14, height: 14,
    pointerEvents: "none",
    zIndex: 5,
  },
  idleHint: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    color: "rgba(255,255,255,0.18)",
    fontSize: 13, textAlign: "center",
    pointerEvents: "none",
    fontFamily: FONT_BODY,
  },
  idleHintIcon: { fontSize: 32, marginBottom: 8, color: "rgba(255,83,0,0.35)" },
  idleHintSub: { fontSize: 11, opacity: 0.6, marginTop: 4 },

  shakeMeterWrap: {
    position: "absolute", bottom: 22, left: "50%",
    transform: "translateX(-50%)", width: 240,
    zIndex: 10, pointerEvents: "none",
  },
  shakeMeterLabel: {
    fontSize: 11, textAlign: "center", marginBottom: 5,
    fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px",
    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
  shakeMeterBar: {
    height: 6, borderRadius: 3,
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  shakeMeterFill: {
    height: "100%", borderRadius: 3,
    background: "linear-gradient(90deg, #ff4444, #ffcc00, #44ff88)",
    transition: "width 0.08s ease",
    boxShadow: "0 0 10px currentColor",
  },

  shameText: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 24, fontWeight: 700,
    color: "#ff8844", fontStyle: "italic",
    textShadow: "0 0 20px rgba(255,83,0,0.6), 0 4px 12px rgba(0,0,0,0.7)",
    zIndex: 11, pointerEvents: "none",
    animation: "shameFade 0.5s ease-out",
    fontFamily: FONT_DISPLAY,
  },

  // Result overlay (anchored to dice 3D position)
  resultOverlay: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    zIndex: 10,
    transition: "opacity 0.25s ease",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    fontFamily: FONT_DISPLAY,
  },
  resultDiceType: {
    fontSize: 11, fontWeight: 600,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: "2px", textTransform: "lowercase",
    fontFamily: FONT_BODY,
    textShadow: "0 2px 6px rgba(0,0,0,0.8)",
  },
  resultValue: {
    fontSize: 88, fontWeight: 900, lineHeight: 0.9,
    fontFamily: FONT_DISPLAY,
    animation: "resultPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  resultBadge: {
    fontSize: 10, fontWeight: 800,
    color: "#ffd700", letterSpacing: "3px",
    padding: "3px 10px", borderRadius: 3,
    background: "rgba(0,0,0,0.5)",
    border: "1px solid rgba(255,215,0,0.5)",
    marginTop: 4,
    fontFamily: FONT_BODY,
  },

  // Controls
  controlsWrap: {
    width: "100%", maxWidth: 980,
    marginTop: 16,
    background: "rgba(15,20,32,0.7)",
    border: "1px solid rgba(255,83,0,0.12)",
    borderRadius: 10,
    padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 14,
    backdropFilter: "blur(8px)",
  },
  controlRow: {
    display: "flex", alignItems: "center", gap: 12,
  },
  rowLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: "2px",
    color: "#FF5300", width: 70, flexShrink: 0,
    lineHeight: 1.2,
  },
  rowSubLabel: {
    fontSize: 9, color: "#5f6373", fontWeight: 500,
    letterSpacing: "0.5px", marginTop: 2, textTransform: "lowercase",
  },

  // Dice selector
  diceSelector: { display: "flex", gap: 6, flexWrap: "wrap", flex: 1 },
  dicePill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 7,
    border: "1px solid", cursor: "pointer",
    fontFamily: FONT_BODY,
    fontSize: 13, fontWeight: 600,
    transition: "all 0.18s ease",
  },
  diceGlyph: { fontSize: 13, lineHeight: 1, transition: "color 0.18s" },
  diceLabel: { fontWeight: 700, letterSpacing: "0.3px" },

  // Roll button
  rollButtonWrap: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    paddingTop: 4, paddingBottom: 4,
  },
  rollButton: {
    width: "100%", maxWidth: 480,
    padding: 0,
    border: "none",
    borderRadius: 10,
    overflow: "hidden",
    transition: "all 0.2s ease, transform 0.1s",
    boxShadow: "0 6px 24px rgba(255,83,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
  },
  rollButtonInner: {
    display: "block",
    padding: "16px 20px",
    color: "#fff",
    fontSize: 18, fontWeight: 900, letterSpacing: "5px",
    fontFamily: FONT_DISPLAY,
    textShadow: "0 2px 8px rgba(0,0,0,0.4)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 50%)",
  },
  rollHint: {
    fontSize: 11, color: "#6a6f80", letterSpacing: "0.4px",
    fontStyle: "italic", textAlign: "center",
  },

  // Effect equip
  effectRow: { display: "flex", gap: 8, flex: 1, flexWrap: "wrap" },
  effectCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "10px 12px", borderRadius: 8,
    border: "1px solid", cursor: "pointer",
    minWidth: 76,
    transition: "all 0.18s ease",
    fontFamily: FONT_BODY,
  },
  effectIcon: { fontSize: 22, lineHeight: 1, transition: "all 0.18s" },
  effectLabel: { fontSize: 11, fontWeight: 600, letterSpacing: "0.5px" },
  tavernCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "10px 12px", borderRadius: 8,
    border: "1px dashed rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.015)",
    cursor: "pointer", minWidth: 76,
    color: "#5f6373", fontFamily: FONT_BODY,
    transition: "all 0.18s ease",
  },
  tavernIcon: { fontSize: 22, lineHeight: 1, color: "#7d6f4a" },
  tavernLabel: { fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", color: "#a09686" },
  tavernSub: { fontSize: 9, opacity: 0.6, letterSpacing: "0.5px" },

  // Character state
  stateRow: { display: "flex", gap: 6, flex: 1, flexWrap: "wrap" },
  stateChip: {
    padding: "6px 12px", borderRadius: 6,
    border: "1px solid", cursor: "pointer",
    fontSize: 11, letterSpacing: "0.5px",
    fontFamily: FONT_BODY,
    transition: "all 0.15s ease",
  },

  gmTools: { display: "flex", gap: 6, flexShrink: 0 },
  strictBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 6,
    border: "1px solid", cursor: "pointer",
    fontSize: 11, fontWeight: 600, letterSpacing: "0.5px",
    fontFamily: FONT_BODY, transition: "all 0.15s ease",
  },
  checkbox: {
    width: 12, height: 12, borderRadius: 2,
    border: "1.5px solid",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 9, color: "#fff",
  },

  eventLogWrap: { paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.04)" },
  eventLogLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: "2px",
    color: "#FF5300", marginBottom: 6,
  },
  eventLog: {
    background: "rgba(0,0,0,0.4)",
    borderRadius: 6, padding: 10,
    fontSize: 10, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    maxHeight: 160, overflowY: "auto", lineHeight: 1.7,
  },
};

const globalCSS = `
  @keyframes resultPop {
    0%   { transform: scale(0.4); opacity: 0; }
    60%  { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes shameFade {
    0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.35; transform: scale(1); }
    50%      { opacity: 0.85; transform: scale(1.3); }
  }
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  button:active:not(:disabled) {
    transform: translateY(0);
  }
`;