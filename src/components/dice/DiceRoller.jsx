import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { X } from "lucide-react";
import { FACE_ROTATIONS } from "./faceRotations";
import { DICE_SIDES } from "./diceConfig";
import { useActiveDiceSkin } from "@/lib/useActiveDiceSkin";
import { applyDiceSkinToMesh } from "@/lib/applyDiceSkin";
import { DEFAULT_MODEL_URLS, DEFAULT_TEXTURE_URL } from "@/config/diceAssets";

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
  const normalizeScale = TARGET_DICE_SIZE / maxDim;

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
    applyVertexGradient(wrapper, primaryColorHex, secondaryColorHex, true);
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
  d4:  { sides: 4,  label: "d4",  size: 0.65 },
  d6:  { sides: 6,  label: "d6",  size: 0.8 },
  d8:  { sides: 8,  label: "d8",  size: 0.65 },
  d10: { sides: 10, label: "d10", size: 0.6 },
  d12: { sides: 12, label: "d12", size: 0.6 },
  d20: { sides: 20, label: "d20", size: 0.6 },
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
  const c = DICE_CONFIGS[type];
  switch (type) {
    case "d4":  return new THREE.TetrahedronGeometry(c.size, 0);
    case "d6":  return new THREE.BoxGeometry(c.size, c.size, c.size);
    case "d8":  return new THREE.OctahedronGeometry(c.size, 0);
    case "d10": return buildD10Geometry(c.size);
    case "d12": return new THREE.DodecahedronGeometry(c.size, 0);
    case "d20": return new THREE.IcosahedronGeometry(c.size, 0);
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
const nearWall = (wall, offset = 0.3) => {
  const w = WALL_POSITIONS[wall];
  return w.axis === "z"
    ? [(Math.random() - 0.5) * (ARENA.width - 2), 0.55, w.pos[2] + w.sign * offset]
    : [w.pos[0] + w.sign * offset, 0.55, (Math.random() - 0.5) * (ARENA.depth - 2)];
};

function buildNormalRoll(result, diceType, shakeIntensity = 0.7, releaseVector = null) {
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
  const targetRot = randomAxis();
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

function buildLazyRoll(result, diceType) {
  const restPos = [(Math.random() - 0.5) * 2, 0.55, (Math.random() - 0.5) * 1.5];
  const targetRot = randomAxis();
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

function buildEpicRoll(result, diceType, releaseVector = null) {
  const base = buildNormalRoll(result, diceType, 1.0, releaseVector);
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
class StyledParticles {
  constructor(scene, max = 350) {
    this.pool = []; this.scene = scene; this.textureCache = {};
    for (let i = 0; i < max; i++) {
      const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false; sprite.scale.setScalar(0.15); scene.add(sprite);
      this.pool.push({ sprite, mat, vel: [0,0,0], life: 0, maxLife: 0, style: null, baseScale: 0.15 });
    }
  }
  _getTexture(style) {
    if (this.textureCache[style]) return this.textureCache[style];
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const ctx = c.getContext("2d"); ctx.clearRect(0, 0, 64, 64);
    switch (style) {
      case "note": {
        ctx.font = "bold 44px serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(["♪","♫","♩","♬"][Math.floor(Math.random()*4)], 32, 30); break;
      }
      case "fire": {
        const g = ctx.createRadialGradient(32,38,3,32,32,26);
        g.addColorStop(0,"#ffffcc"); g.addColorStop(0.25,"#ffaa00"); g.addColorStop(0.6,"#ff3300"); g.addColorStop(1,"rgba(200,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(32,34,18,24,0,0,Math.PI*2); ctx.fill(); break;
      }
      case "ember": {
        const g = ctx.createRadialGradient(32,32,1,32,32,12);
        g.addColorStop(0,"#ffcc44"); g.addColorStop(0.6,"#ff4400"); g.addColorStop(1,"rgba(80,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,12,0,Math.PI*2); ctx.fill(); break;
      }
      case "sparkle": {
        ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
        for (let j = 0; j < 4; j++) {
          const a = (j/4)*Math.PI*2 - Math.PI/2;
          ctx.beginPath(); ctx.moveTo(32+Math.cos(a)*4,32+Math.sin(a)*4);
          ctx.lineTo(32+Math.cos(a)*22,32+Math.sin(a)*22); ctx.stroke();
        }
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(32,32,4,0,Math.PI*2); ctx.fill(); break;
      }
      case "rainbow": {
        const colors = ["#ff0000","#ff8800","#ffff00","#00ff00","#0088ff","#aa00ff"];
        const col = colors[Math.floor(Math.random()*colors.length)];
        const g = ctx.createRadialGradient(32,32,3,32,32,20);
        g.addColorStop(0,"#ffffff"); g.addColorStop(0.4,col); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,20,0,Math.PI*2); ctx.fill(); break;
      }
      default: {
        const g = ctx.createRadialGradient(32,32,2,32,32,22);
        g.addColorStop(0,"#ffffff"); g.addColorStop(0.3,"#FF5300"); g.addColorStop(1,"rgba(255,83,0,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,22,0,Math.PI*2); ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    if (style !== "note" && style !== "rainbow") this.textureCache[style] = tex;
    return tex;
  }
  emit(pos, count, style = "impact", speed = 3, life = 600) {
    let spawned = 0;
    for (const p of this.pool) {
      if (p.life > 0 || spawned >= count) continue;
      p.sprite.visible = true;
      p.sprite.position.set(pos[0]||0, pos[1]||0.5, pos[2]||0);
      p.mat.map = this._getTexture(style); p.mat.needsUpdate = true; p.mat.opacity = 1;
      p.style = style;
      const isRising = style === "note" || style === "sparkle";
      p.vel = [
        (Math.random()-0.5)*speed*(style==="note"?0.4:1),
        isRising ? Math.random()*speed*0.5+2 : Math.random()*speed*0.8+1,
        (Math.random()-0.5)*speed*(style==="note"?0.4:1),
      ];
      p.baseScale = style==="note"?0.4 : style==="fire"?0.28 : style==="sparkle"?0.22 : 0.16;
      p.sprite.scale.setScalar(p.baseScale);
      p.life = life; p.maxLife = life; spawned++;
    }
  }
  update(dt) {
    const ds = dt / 1000;
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt; const lr = Math.max(0, p.life / p.maxLife);
      p.sprite.position.x += p.vel[0]*ds;
      p.sprite.position.y += p.vel[1]*ds;
      p.sprite.position.z += p.vel[2]*ds;
      if (p.style==="note") { p.vel[0]+=Math.sin(p.life*0.008)*0.04; p.vel[1]*=0.998; p.sprite.scale.setScalar(p.baseScale*(0.8+Math.sin(p.life*0.01)*0.2)); }
      else if (p.style==="fire") { p.vel[1]+=2*ds; p.vel[0]+=(Math.random()-0.5)*0.3; p.sprite.scale.setScalar(p.baseScale*lr); }
      else if (p.style==="ember") { p.vel[1]-=1.5*ds; p.vel[0]+=(Math.random()-0.5)*0.08; p.sprite.scale.setScalar(p.baseScale*(0.5+lr*0.5)); }
      else if (p.style==="sparkle") { p.vel[1]*=0.99; p.sprite.scale.setScalar(p.baseScale*(0.7+Math.sin(p.life*0.02)*0.3)*lr); }
      else if (p.style==="rainbow") { p.vel[1]-=4*ds; p.sprite.scale.setScalar(p.baseScale*lr); }
      else { p.vel[1]-=9.8*ds; }
      p.mat.opacity = p.style==="note" ? lr*0.85 : lr;
      if (p.life<=0) p.sprite.visible = false;
    }
  }
  dispose() { for (const p of this.pool) { if(p.mat.map)p.mat.map.dispose(); p.mat.dispose(); this.scene.remove(p.sprite); } }
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
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const DiceRoller = forwardRef(function DiceRoller(props, ref) {
  const {
    primaryColor = "#FF5722",
    secondaryColor = "#8B5CF6",
    isThemedSkin = false,
  } = props;
  const mountRef = useRef(null);
  const sceneRef = useRef({});
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

  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc?.diceState?.activeContent) return;
    if (sc.diceState.isPlaceholder) return;
    applyDiceSkinToMesh(sc.diceState.activeContent, activeSkin || STOCK_SKIN, {
      defaultTexture: _defaultTexture,
      textureCache: _textureCache,
    });
    if (isThemedSkin) {
      applyVertexGradient(sc.diceState.activeContent, primaryColor, secondaryColor, true);
    }
    // applyDiceSkinToMesh replaces materials — refresh the materials array + emissive originals
    const newMats = collectMaterials(sc.diceState.activeContent);
    newMats.forEach(m => {
      m.userData._origEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0x000000);
      m.userData._origEmissiveIntensity = m.emissiveIntensity ?? 0;
    });
    sc.diceState.materials = newMats;
  }, [activeSkin, isThemedSkin, primaryColor, secondaryColor]);

  const [diceType, setDiceType] = useState("d20");
  const [equippedEffect, setEquippedEffect] = useState("default");
  const [modifier, setModifier] = useState("none");
  const [lastResult, setLastResult] = useState(null);
  const [lastResultDiceType, setLastResultDiceType] = useState(null);
  const [overlayText, setOverlayText] = useState(null);
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

  // Keep refs in sync with state for the animation loop
  useEffect(() => { diceTypeRef.current = diceType; }, [diceType]);
  useEffect(() => { equippedEffectRef.current = equippedEffect; }, [equippedEffect]);
  useEffect(() => { modifierRef.current = modifier; }, [modifier]);

  // Preload all GLB dice models in parallel; swap in active type as soon as it loads
  useEffect(() => {
    let cancelled = false;
    const loadOne = async (type) => {
      try {
        await loadDiceModel(type, {
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.05);
    mainLight.position.set(3, 10, 4); mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    Object.assign(mainLight.shadow.camera, { near:1, far:25, left:-5, right:5, top:5, bottom:-5 });
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.22);
    fillLight.position.set(-4, 6, -3);
    scene.add(fillLight);

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

    const particles = new StyledParticles(scene, 350);
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
        // Use loaded GLB. Reuse the cached group directly (we only have one die in the scene at a time).
        dice.add(cached.group);
        diceState.activeContent = cached.group;
        diceState.isPlaceholder = false;
        diceState.materials = collectMaterials(cached.group);
        // Reset any leftover emissive state
        resetDiceEmissive(diceState.materials);
      } else {
        // Fall back to placeholder polyhedron with the right shape
        const newGeo = buildDiceGeometry(type);
        placeholderMesh.geometry.dispose();
        placeholderMesh.geometry = newGeo;
        dice.add(placeholderMesh);
        diceState.activeContent = placeholderMesh;
        diceState.isPlaceholder = true;
        diceState.materials = [placeholderMat];
        resetDiceEmissive(diceState.materials);
      }
    };

    sceneRef.current = {
      renderer, scene, camera, dice, ghost, ghostMat,
      diceState, // { activeContent, isPlaceholder, materials }
      glowPlane, glowMat, ekgFloor, ekgFloorMat, ekgCanvas, ekgCtx, ekgTexture, ekgWave,
      mouseToWorld, swapDiceModel,
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
      if (pb.playing && tl && pb.startTime !== null) {
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
      if (resultOverlayRef.current && dicePosForOverlay) {
        const v = new THREE.Vector3(dicePosForOverlay.x, dicePosForOverlay.y + 0.5, dicePosForOverlay.z);
        v.project(camera);
        const rect = container.getBoundingClientRect();
        const sx = (v.x * 0.5 + 0.5) * rect.width;
        const sy = (-v.y * 0.5 + 0.5) * rect.height - 70; // 70px above the dice in screen space
        resultOverlayRef.current.style.left = `${sx}px`;
        resultOverlayRef.current.style.top = `${sy}px`;
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
      case "overlay": setOverlayText(ev.text); setTimeout(()=>setOverlayText(null), 2200); break;
      case "settled": setTimeout(()=>{
        for (const w of Object.values(wallMeshesRef.current)) { w.mat.opacity = w.restOpacity; w.targetY = w.restY; }
      }, 500); break;
      case "reveal": {
        setLastResult(ev.value);
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
  }, []);

  // ==============================================================
  // ROLL EXECUTION
  // ==============================================================
  const executeRoll = useCallback((shakeIntensity = 0.7, releaseVector = null, forceLazy = false) => {
    if (playbackRef.current.playing) return;
    const type = diceTypeRef.current;
    const sides = DICE_CONFIGS[type].sides;
    const result = Math.floor(Math.random() * sides) + 1;
    setLastResult(null); setLastResultDiceType(null); setOverlayText(null); setEventLog([]); setIsRolling(true); setShowEKG(false);

    const isLazy = forceLazy || shakeIntensity < 0.15;
    let timeline;
    if (isLazy) {
      timeline = buildLazyRoll(result, type);
      if (strictMode) {
        timeline.events = timeline.events.filter(e => e.type !== "reveal");
        timeline.events.push({ t: timeline.duration - 100, type: "overlay", text: "REJECTED — Roll properly!", style: "reject" });
        timeline.events.push({ t: timeline.duration, type: "rejected" });
        timeline.events.sort((a, b) => a.t - b.t);
      }
    } else if (shakeIntensity > 0.85) {
      timeline = buildEpicRoll(result, type, releaseVector);
    } else {
      timeline = buildNormalRoll(result, type, shakeIntensity, releaseVector);
    }

    // Character state modifier
    switch (modifierRef.current) {
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
  }, [strictMode]);

  const handleRollClick = useCallback(() => executeRoll(0.7, null, false), [executeRoll]);

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
  const lastSides = lastResultDiceType ? DICE_CONFIGS[lastResultDiceType].sides : 20;
  const isCritMax = lastResult !== null && lastResult === lastSides;
  const isCritMin = lastResult !== null && lastResult === 1;
  const shakeColor = shakeLevel<0.15?"#ff4444":shakeLevel<0.5?"#ff8844":shakeLevel<0.8?"#ffcc00":"#44ff88";

  // ==============================================================
  // RENDER
  // ==============================================================
  return (
    <div style={S.page}>
      <style>{globalCSS}</style>

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
      </header>

      {/* === Center: Arena === */}
      <main style={S.arenaWrap}>
        <div style={S.arenaFrame}>
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
                <div>Click & drag to pick up the {DICE_CONFIGS[diceType].label}</div>
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
              style={{
                ...S.resultOverlay,
                opacity: lastResult !== null ? 1 : 0,
                color: isCritMax ? "#ffd700" : isCritMin ? "#ff3333" : "#ffffff",
                textShadow: isCritMax
                  ? "0 0 28px rgba(255,215,0,0.85), 0 0 60px rgba(255,215,0,0.5), 0 4px 12px rgba(0,0,0,0.6)"
                  : isCritMin
                  ? "0 0 28px rgba(255,40,40,0.7), 0 4px 12px rgba(0,0,0,0.6)"
                  : "0 0 18px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.7)",
              }}
            >
              <div style={S.resultDiceType}>{lastResultDiceType}</div>
              <div style={S.resultValue}>{lastResult}</div>
              {isCritMax && <div style={S.resultBadge}>CRIT</div>}
              {isCritMin && <div style={{ ...S.resultBadge, color: "#ff5555", borderColor: "rgba(255,68,68,0.5)" }}>FAIL</div>}
            </div>
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
        {/* Dice type selector */}
        <div style={S.controlRow}>
          <div style={S.rowLabel}>DICE</div>
          <div style={S.diceSelector}>
            {DICE_ORDER.map(t => {
              const active = diceType === t;
              const isLoaded = !!loadedModels[t];
              return (
                <button
                  key={t}
                  onClick={() => !isRolling && setDiceType(t)}
                  disabled={isRolling}
                  style={{
                    ...S.dicePill,
                    background: active ? "linear-gradient(135deg, rgba(255,83,0,0.25), rgba(255,83,0,0.08))" : "rgba(255,255,255,0.025)",
                    borderColor: active ? "#FF5300" : "rgba(255,255,255,0.07)",
                    color: active ? "#fff" : "#8d92a1",
                    boxShadow: active ? "0 0 20px rgba(255,83,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                    opacity: isRolling ? 0.4 : 1,
                    position: "relative",
                  }}
                  title={isLoaded ? `${t} model loaded` : `${t} model loading…`}
                >
                  <span style={{ ...S.diceGlyph, color: active ? "#FF5300" : "#5f6373" }}>◆</span>
                  <span style={S.diceLabel}>{t}</span>
                  {!isLoaded && (
                    <span style={{
                      position: "absolute", top: 4, right: 6,
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#f8a47c", opacity: 0.7,
                      animation: "pulse 1.4s ease-in-out infinite",
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Roll button */}
        <div style={S.rollButtonWrap}>
          <button
            onClick={handleRollClick}
            disabled={isRolling || isHolding}
            style={{
              ...S.rollButton,
              cursor: (isRolling || isHolding) ? "not-allowed" : "pointer",
              opacity: (isRolling || isHolding) ? 0.5 : 1,
              background: (isRolling || isHolding)
                ? "linear-gradient(135deg, rgba(255,83,0,0.25), rgba(255,120,60,0.15))"
                : "linear-gradient(135deg, #FF5300 0%, #ff7733 100%)",
            }}
          >
            <span style={S.rollButtonInner}>
              {isRolling ? "ROLLING..." : `ROLL ${DICE_CONFIGS[diceType].label.toUpperCase()}`}
            </span>
          </button>
          <div style={S.rollHint}>
            shake harder → bigger bounces · shake light → walk of shame
          </div>
        </div>

        {/* Effect equip */}
        <div style={S.controlRow}>
          <div style={S.rowLabel}>
            EFFECT
            <div style={S.rowSubLabel}>equipped trail</div>
          </div>
          <div style={S.effectRow}>
            {EFFECT_ORDER.map(key => {
              const e = EFFECTS[key];
              const active = equippedEffect === key;
              return (
                <button
                  key={key}
                  onClick={() => setEquippedEffect(key)}
                  style={{
                    ...S.effectCard,
                    background: active ? `linear-gradient(135deg, ${e.color}26, ${e.color}0a)` : "rgba(255,255,255,0.025)",
                    borderColor: active ? e.color : "rgba(255,255,255,0.07)",
                    boxShadow: active ? `0 0 18px ${e.color}40, inset 0 1px 0 rgba(255,255,255,0.05)` : "none",
                  }}
                >
                  <div style={{ ...S.effectIcon, color: active ? e.color : "#6a6f80", textShadow: active ? `0 0 12px ${e.color}80` : "none" }}>
                    {e.icon}
                  </div>
                  <div style={{ ...S.effectLabel, color: active ? "#fff" : "#8d92a1" }}>{e.label}</div>
                </button>
              );
            })}
            {/* Tavern hint card */}
            <button style={S.tavernCard} title="More effects coming from the Tavern">
              <div style={S.tavernIcon}>+</div>
              <div style={S.tavernLabel}>Tavern</div>
              <div style={S.tavernSub}>more soon</div>
            </button>
          </div>
        </div>

        {/* Character state + GM rules — secondary row */}
        <div style={{ ...S.controlRow, gap: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={S.rowLabel}>
            STATE
            <div style={S.rowSubLabel}>character mod</div>
          </div>
          <div style={S.stateRow}>
            {[
              { id: "none", label: "Normal" },
              { id: "rage", label: "Rage", color: "#ff5530" },
              { id: "deathSave", label: "Death Save", color: "#ff3333" },
              { id: "inspiration", label: "Inspiration", color: "#ffcc44" },
              { id: "wildMagic", label: "Wild Magic", color: "#cc66ff" },
            ].map(s => {
              const active = modifier === s.id;
              const accent = s.color || "#FF5300";
              return (
                <button
                  key={s.id}
                  onClick={() => setModifier(s.id)}
                  style={{
                    ...S.stateChip,
                    background: active ? `${accent}22` : "rgba(255,255,255,0.025)",
                    borderColor: active ? accent : "rgba(255,255,255,0.07)",
                    color: active ? accent : "#8d92a1",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

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

        {/* Optional event log */}
        {showEventLog && (
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