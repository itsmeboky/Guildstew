import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { X } from "lucide-react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DICE_SIDES } from "./diceConfig";
import { FACE_ROTATIONS } from "./faceRotations";
import { useActiveDiceSkin } from "@/lib/useActiveDiceSkin";
import { applyDiceSkinToMesh } from "@/lib/applyDiceSkin";
import { DEFAULT_MODEL_URLS, DEFAULT_TEXTURE_URL } from "@/config/diceAssets";

// Default GLB paths live in `src/config/diceAssets.js` — they point
// at the shared `campaign-assets/dice/models/*.glb` URLs on Supabase
// so the default texture + skin preview + DiceRoller all agree on
// the canonical model + texture URLs.

// The dice types we support for 3D
const diceTypes = [
  { name: "d4", sides: 4 },
  { name: "d6", sides: 6 },
  { name: "d8", sides: 8 },
  { name: "d10", sides: 10 },
  { name: "d12", sides: 12 },
  { name: "d20", sides: 20 },
];

// Per-dice-type cocked rates for the physics path: how often the
// hidden simulation deliberately seeks a tilted-but-on-target
// landing instead of a clean one. d20 ~5%, smaller numbers for
// chunkier dice scaling per dice type. Lazy rolls remain on the
// scripted keyframe path and use COCK_CHANCE_LAZY below.
const COCK_RATES = {
  d4: 0.08, d6: 0.07, d8: 0.06, d10: 0.06, d12: 0.05, d20: 0.05, d100: 0.05,
};

// Lazy rolls bypass physics (they're scripted) so they keep a
// pre-roll probability check. Same shape as the original
// COCK_CHANCE table from the keyframe era, multiplied 5× to match
// the "lazy rolls cock more often" intent.
const COCK_CHANCE_LAZY = {
  d4: 0.025, d6: 0.05, d8: 0.10, d10: 0.15,
  d12: 0.20, d20: 0.25, d100: 0.25,
};

const COCKED_SOUNDS = [
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/notification/cockdeddice1.mp3",
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/notification/cockeddice2.mp3",
];

const LAZY_SOUND_URL =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/notification/badroll.wav";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Apply vertex gradient: top vertices get primary color, bottom get secondary
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

function Particles({ type = "default" }) {
  // Configuration based on type
  const config = {
    default: {
      glowColor: "rgba(55, 242, 209, 0.8)",
      ringColor: "#37F2D1",
      sparkColors: ["#37F2D1", "#00FFFF", "#8B5CF6", "#FFD700", "#FFFFFF"],
      trailColors: ["#37F2D1", "#8B5CF6", "#FFD700"],
      emberColors: ["#FFD700", "#FF6B6B", "#37F2D1"],
      sparkCount: 40,
    },
    "crit-success": {
      glowColor: "rgba(255, 215, 0, 0.9)", // Gold
      ringColor: "#FFD700",
      sparkColors: ["#FFD700", "#FFA500", "#FFFFFF", "#FFFF00"],
      trailColors: ["#FFD700", "#FFA500", "#FFFFFF"],
      emberColors: ["#FFD700", "#FFA500", "#FFFFFF"],
      sparkCount: 100, // MOAR
    },
    "crit-fail": {
      glowColor: "rgba(220, 38, 38, 0.9)", // Red
      ringColor: "#DC2626",
      sparkColors: ["#DC2626", "#7F1D1D", "#000000", "#450a0a"],
      trailColors: ["#DC2626", "#000000", "#7F1D1D"],
      emberColors: ["#DC2626", "#000000", "#991b1b"],
      sparkCount: 60,
    }
  }[type] || { // Fallback
      glowColor: "rgba(55, 242, 209, 0.8)",
      ringColor: "#37F2D1",
      sparkColors: ["#37F2D1", "#00FFFF", "#8B5CF6", "#FFD700", "#FFFFFF"],
      trailColors: ["#37F2D1", "#8B5CF6", "#FFD700"],
      emberColors: ["#FFD700", "#FF6B6B", "#37F2D1"],
      sparkCount: 40,
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {/* Central glow pulse */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: type === 'crit-success' ? 300 : 200,
          height: type === 'crit-success' ? 300 : 200,
          background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
          animation: "pulseGlow 0.8s ease-out forwards",
        }}
      />

      {/* Expanding ring */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{
          borderColor: config.ringColor,
          width: 20,
          height: 20,
          animation: "expandRing 0.6s ease-out forwards",
          boxShadow: `0 0 20px ${config.ringColor}, inset 0 0 20px ${config.ringColor}`,
        }}
      />

      {/* Sparkle dust particles */}
      {[...Array(config.sparkCount)].map((_, i) => {
        const angle = (i / config.sparkCount) * Math.PI * 2 + Math.random() * 0.5;
        const distance = (type === 'crit-success' ? 100 : 60) + Math.random() * 100;
        const size = (type === 'crit-success' ? 3 : 2) + Math.random() * 4;
        const delay = Math.random() * 0.15;
        const duration = 0.5 + Math.random() * 0.4;
        const color = config.sparkColors[Math.floor(Math.random() * config.sparkColors.length)];
        const curve = Math.random() * 40 - 20;

        return (
          <div
            key={`spark-${i}`}
            className="absolute rounded-full"
            style={{
              left: "50%",
              top: "50%",
              width: size,
              height: size,
              backgroundColor: color,
              boxShadow: `0 0 ${size * 3}px ${color}, 0 0 ${
                size * 6
              }px ${color}`,
              animation: `sparkBurst ${duration}s ease-out ${delay}s forwards`,
              "--tx": `${Math.cos(angle) * distance + curve}px`,
              "--ty": `${Math.sin(angle) * distance + curve}px`,
              opacity: 0,
            }}
          />
        );
      })}

      {/* Swirling magical trails */}
      {[...Array(12)].map((_, i) => {
        const startAngle = (i / 12) * Math.PI * 2;
        const color = config.trailColors[i % config.trailColors.length];

        return (
          <div
            key={`trail-${i}`}
            className="absolute left-1/2 top-1/2"
            style={{
              width: 3,
              height: (type === 'crit-fail' ? 60 : 30) + Math.random() * 20,
              background: `linear-gradient(to top, ${color}, transparent)`,
              transformOrigin: "bottom center",
              animation: `swirlTrail 0.7s ease-out ${i * 0.03}s forwards`,
              "--startAngle": `${startAngle}rad`,
              "--endAngle": `${startAngle + Math.PI * (type === 'crit-fail' ? -0.5 : 0.5)}rad`,
              borderRadius: "50%",
              opacity: 0,
            }}
          />
        );
      })}

      {/* DOOM Skull for Crit Fail */}
      {type === 'crit-fail' && (
         <img 
            src="https://static.wixstatic.com/media/5cdfd8_a03a4ac66ac74ade9a4a8d335345bda8~mv2.gif"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] object-contain pointer-events-none select-none z-50"
            alt="Critical Fail"
         />
      )}
      
      {/* Critical Success GIF */}
       {type === 'crit-success' && (
         <img 
            src="https://static.wixstatic.com/media/5cdfd8_d1ea4fb5b8b84280a211084922fd620c~mv2.gif"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] object-contain pointer-events-none select-none z-50"
            alt="Critical Success"
         />
      )}

      {/* Standard Result Reveal (any other result) */}
      {type === 'default' && (
         <img 
            src="https://static.wixstatic.com/media/5cdfd8_82aaa116dc8f49f08605c0ea770ff50e~mv2.gif"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] object-contain pointer-events-none select-none z-50 opacity-80 mix-blend-screen"
            alt="Result Reveal"
         />
      )}

      {/* Floating embers */}
      {[...Array(15)].map((_, i) => {
        const x = (Math.random() - 0.5) * 120;
        const size = 2 + Math.random() * 3;
        const delay = 0.2 + Math.random() * 0.3;
        const color = config.emberColors[Math.floor(Math.random() * config.emberColors.length)];

        return (
          <div
            key={`ember-${i}`}
            className="absolute rounded-full"
            style={{
              left: `calc(50% + ${x}px)`,
              top: "50%",
              width: size,
              height: size,
              backgroundColor: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              animation: `floatUp 1s ease-out ${delay}s forwards`,
              opacity: 0,
            }}
          />
        );
      })}

      <style>{`
        @keyframes pulseGlow {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes expandRing {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(8); opacity: 0; }
        }
        @keyframes sparkBurst {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes swirlTrail {
          0% {
            transform: translate(-50%, 0) rotate(var(--startAngle)) translateY(-20px);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, 0) rotate(var(--endAngle)) translateY(-80px);
            opacity: 0;
          }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Physics arena helpers (cannon-es) ───
// Single source of truth for arena geometry — used both for the
// visible world and the hidden simulation world. Identical setup
// is required for the hidden simulation to faithfully predict the
// visible roll.
const ARENA = {
  halfSize: 3,    // 6×6 footprint
  floorY: -1,
  wallHeight: 5,
  wallThickness: 0.5,
  gravity: -30,
  friction: 0.4,
  restitution: 0.4,
  defaultRestitution: 0.5,
};

function buildPhysicsWorld() {
  const world = new CANNON.World();
  world.gravity.set(0, ARENA.gravity, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.defaultContactMaterial.friction = ARENA.friction;
  world.defaultContactMaterial.restitution = ARENA.defaultRestitution;

  const diceMat = new CANNON.Material("dice");
  const arenaMat = new CANNON.Material("arena");
  world.addContactMaterial(
    new CANNON.ContactMaterial(diceMat, arenaMat, {
      friction: ARENA.friction,
      restitution: ARENA.restitution,
    })
  );

  const floor = new CANNON.Body({
    mass: 0,
    material: arenaMat,
    shape: new CANNON.Plane(),
  });
  floor.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  floor.position.set(0, ARENA.floorY, 0);
  world.addBody(floor);

  const wallY = ARENA.floorY + ARENA.wallHeight / 2;
  const halfA = ARENA.halfSize;
  const wt = ARENA.wallThickness;
  const wallShape = new CANNON.Box(
    new CANNON.Vec3(halfA + wt, ARENA.wallHeight / 2, wt / 2)
  );
  const sideShape = new CANNON.Box(
    new CANNON.Vec3(wt / 2, ARENA.wallHeight / 2, halfA + wt)
  );
  const walls = [];
  [
    [wallShape, [0, wallY, -halfA - wt / 2]],
    [wallShape, [0, wallY, halfA + wt / 2]],
    [sideShape, [-halfA - wt / 2, wallY, 0]],
    [sideShape, [halfA + wt / 2, wallY, 0]],
  ].forEach(([shape, pos]) => {
    const b = new CANNON.Body({ mass: 0, material: arenaMat, shape });
    b.position.set(pos[0], pos[1], pos[2]);
    world.addBody(b);
    walls.push(b);
  });

  return { world, diceMat, arenaMat, floor, walls };
}

function buildDiceBody(diceMat, halfExtents) {
  return new CANNON.Body({
    mass: 1,
    material: diceMat,
    shape: new CANNON.Box(halfExtents),
    linearDamping: 0.1,
    angularDamping: 0.1,
    allowSleep: true,
    sleepSpeedLimit: 0.15,
    sleepTimeLimit: 0.4,
  });
}

// Build a face-map for a dice type: for each face value, compute the
// body-local direction that should point world-up when that face is
// shown. After a roll settles, we transform each direction by the
// body's quaternion and pick the one most aligned with world-up — its
// value is the result.
function buildFaceMap(diceType) {
  const rotations = FACE_ROTATIONS[diceType];
  if (!rotations) return [];
  const obj = new THREE.Object3D();
  const map = [];
  for (const [valueStr, euler] of Object.entries(rotations)) {
    obj.rotation.copy(euler);
    obj.updateMatrix();
    const invQ = obj.quaternion.clone().invert();
    const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(invQ).normalize();
    map.push({ value: parseInt(valueStr, 10), dir: localUp });
  }
  return map;
}

// Given a body's quaternion, find which face is most aligned with
// world-up. Returns { value, dot } — dot ∈ [-1, 1], higher = cleaner.
function detectFaceUp(quaternion, faceMap) {
  if (!faceMap || faceMap.length === 0) return { value: null, dot: -1 };
  const q = new THREE.Quaternion(
    quaternion.x, quaternion.y, quaternion.z, quaternion.w
  );
  const tmp = new THREE.Vector3();
  let bestVal = null;
  let bestDot = -2;
  for (const entry of faceMap) {
    tmp.copy(entry.dir).applyQuaternion(q);
    const dot = tmp.y;
    if (dot > bestDot) { bestDot = dot; bestVal = entry.value; }
  }
  return { value: bestVal, dot: bestDot };
}

// Hidden simulation: try up to maxRetries random impulses until one
// settles with the requested value face-up within [minDot, maxDot].
// Returns the impulse + angular velocity that worked, or null.
function findMatchingRoll({
  targetValue,
  faceMap,
  halfExtents,
  startPos,
  startVelocity = null,
  startAngVel = null,
  impulseScale = 1,
  maxRetries = 50,
  maxSteps = 300,
  minDot = 0.92,
  maxDot = 1.01,
}) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { world, diceMat } = buildPhysicsWorld();
    const body = buildDiceBody(diceMat, halfExtents);
    body.position.set(startPos.x, startPos.y, startPos.z);
    world.addBody(body);

    // Random impulse — biased toward horizontal motion with slight
    // upward, magnitude 10..15. Random angular vel ~50 per axis.
    // If startVelocity is provided (mouse release), bias around it.
    const angle = Math.random() * Math.PI * 2;
    const horiz = (10 + Math.random() * 5) * impulseScale;
    let impulse;
    if (startVelocity) {
      // Direction biased by release vector + small randomness.
      const jitter = 0.4;
      impulse = new CANNON.Vec3(
        startVelocity.x + (Math.random() - 0.5) * horiz * jitter,
        Math.max(2, Math.abs(startVelocity.y) + 2 + Math.random() * 2),
        startVelocity.z + (Math.random() - 0.5) * horiz * jitter
      );
    } else {
      impulse = new CANNON.Vec3(
        Math.cos(angle) * horiz,
        (2 + Math.random() * 3) * impulseScale,
        Math.sin(angle) * horiz
      );
    }
    const angVel = startAngVel
      ? new CANNON.Vec3(
          startAngVel.x + (Math.random() - 0.5) * 30,
          startAngVel.y + (Math.random() - 0.5) * 30,
          startAngVel.z + (Math.random() - 0.5) * 30
        )
      : new CANNON.Vec3(
          (Math.random() - 0.5) * 50 * impulseScale,
          (Math.random() - 0.5) * 50 * impulseScale,
          (Math.random() - 0.5) * 50 * impulseScale
        );
    body.quaternion.setFromEuler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    const initQ = {
      x: body.quaternion.x, y: body.quaternion.y,
      z: body.quaternion.z, w: body.quaternion.w,
    };
    body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));
    body.angularVelocity.copy(angVel);

    let settled = false;
    for (let i = 0; i < maxSteps; i++) {
      world.step(1 / 120);
      if (body.sleepState === CANNON.Body.SLEEPING) { settled = true; break; }
    }
    if (!settled) continue;

    const { value, dot } = detectFaceUp(body.quaternion, faceMap);
    if (value === targetValue && dot >= minDot && dot <= maxDot) {
      return {
        impulse: { x: impulse.x, y: impulse.y, z: impulse.z },
        angVel: { x: angVel.x, y: angVel.y, z: angVel.z },
        startPos: { x: startPos.x, y: startPos.y, z: startPos.z },
        initQuat: initQ,
        attempts: attempt + 1,
        finalDot: dot,
      };
    }
  }
  return null;
}

// Arena floor texture: Brand Navy base at 60% opacity with a faint
// secondary-color hex grid overlaid at 10% opacity, radial-gradient
// masked so the floor edges fade to fully transparent and blend
// into the modal background instead of showing harsh seams.
function buildTableTexture(secondary) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // 1) Brand Navy base, 60% opacity.
  ctx.fillStyle = "rgba(27, 37, 53, 0.6)";
  ctx.fillRect(0, 0, size, size);

  // 2) Hex grid in secondaryColor at ~10% opacity.
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 1.25;
  const hexR = 32;
  const hexW = Math.sqrt(3) * hexR;
  const hexH = 2 * hexR;
  const rowH = hexH * 0.75;
  for (let row = -1, y = 0; y < size + hexH; row++, y = row * rowH) {
    const xOff = row % 2 === 0 ? 0 : hexW / 2;
    for (let x = -hexW; x < size + hexW; x += hexW) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = x + xOff + Math.cos(a) * hexR;
        const py = y + Math.sin(a) * hexR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // 3) Radial mask: punch out the corners so the floor fades to
  // transparent before reaching the wall line. We use destination-out
  // with a radial gradient that's transparent at the center (keep)
  // and opaque at the edges (erase).
  const mask = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.25,
    size / 2, size / 2, size * 0.55
  );
  mask.addColorStop(0, "rgba(0,0,0,0)");
  mask.addColorStop(0.7, "rgba(0,0,0,0.4)");
  mask.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

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

// Simple D20 fallback (for when GLB fails completely)
function createFallbackD20() {
  const geometry = new THREE.IcosahedronGeometry(1.3);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.4,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

// Top-of-arena reveal — fades in over 400ms, renders centered just
// below the arena's top edge with a subtle blurred dark plate behind
// the number for legibility against the dice/floor visuals.
const RevealOverlay = ({ value, color, modifier = 0 }) => {
  const [opacity, setOpacity] = useState(0);
  const total = (typeof value === "number" ? value : 0) + (modifier || 0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const animate = () => {
      const t = Math.min((performance.now() - start) / 400, 1);
      setOpacity(t);
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  const sign = modifier > 0 ? "+" : modifier < 0 ? "" : "";
  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-40 flex flex-col items-center"
      style={{
        opacity,
        transition: "opacity 80ms linear",
      }}
    >
      <div
        className="px-6 py-2 rounded-2xl flex flex-col items-center"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            color,
            fontFamily: "'Cream', 'Cinzel', serif",
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1,
            textShadow: `0 0 28px ${color}, 0 0 56px ${color}66, 0 3px 14px rgba(0,0,0,0.6)`,
          }}
        >
          {value}
        </div>
        {modifier !== 0 && (
          <div
            className="mt-1 text-xs font-bold tracking-wider"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {value} {sign}{modifier} = <span className="text-white">{total}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Phase 1: chicken slides left → right across the arena. Phase 2:
// gold "COCKED!" text fades in at the top of the arena with a
// scale-bounce, then pulses. Both phases are absolute-positioned so
// the component lives inside the arena div, not the viewport.
const CockedAnimation = () => {
  const [phase, setPhase] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setPhase(2), 1100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="absolute inset-0 pointer-events-none z-[70] overflow-hidden">
      <style>{`
        @keyframes chickenRun {
          0%   { left: -10%; transform: translateY(0) rotate(-6deg); }
          25%  { transform: translateY(-30px) rotate(4deg); }
          50%  { transform: translateY(0) rotate(-4deg); }
          75%  { transform: translateY(-22px) rotate(6deg); }
          100% { left: 110%; transform: translateY(0) rotate(-2deg); }
        }
        @keyframes cockedPop {
          0%   { transform: translate(-50%, 0) scale(0.4); opacity: 0; }
          60%  { transform: translate(-50%, 0) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1.0); opacity: 1; }
        }
        @keyframes cockedPulse {
          0%, 100% { filter: drop-shadow(0 0 18px #FFD700) drop-shadow(0 0 36px #FFA500); }
          50%      { filter: drop-shadow(0 0 32px #FFD700) drop-shadow(0 0 64px #FFA500); }
        }
      `}</style>
      {phase === 1 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            fontSize: 72,
            animation: "chickenRun 1100ms cubic-bezier(.5,1.6,.55,.85) forwards",
          }}
        >
          🐔
        </div>
      )}
      {phase === 2 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            padding: "8px 24px",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16,
            color: "#FFD700",
            fontFamily: "'Cream', 'Cinzel', serif",
            fontWeight: 900,
            fontSize: 56,
            letterSpacing: "0.08em",
            textShadow: "0 0 24px #FFD700, 0 0 48px #FFA500, 0 4px 12px rgba(0,0,0,0.55)",
            animation:
              "cockedPop 480ms cubic-bezier(.34,1.56,.64,1) forwards, cockedPulse 1.4s ease-in-out 480ms infinite",
          }}
        >
          COCKED!
        </div>
      )}
    </div>
  );
};

// Wobbling italic "Lame..." text. When `rejected` is true the color
// flips pink and the copy nudges the player to try again. Lives at
// the top of the arena (absolute) so it parallels the result reveal.
const LameAnimation = ({ rejected = false }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[70] flex items-start justify-center">
      <style>{`
        @keyframes lameWobble {
          0%   { transform: translate(-2px, 0) rotate(-2deg); }
          25%  { transform: translate(2px, -2px) rotate(2deg); }
          50%  { transform: translate(-1px, 1px) rotate(-1deg); }
          75%  { transform: translate(1px, 0) rotate(1deg); }
          100% { transform: translate(-2px, 0) rotate(-2deg); }
        }
        @keyframes lameFade {
          0%   { opacity: 0; transform: translateY(-8px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div
        style={{
          marginTop: 12,
          padding: "8px 24px",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
          fontStyle: "italic",
          fontFamily: "'Cream', 'Cinzel', serif",
          fontWeight: 700,
          fontSize: 48,
          color: rejected ? "#fb7185" : "#94a3b8",
          textShadow: rejected
            ? "0 0 20px #fb718580, 0 4px 14px rgba(0,0,0,0.5)"
            : "0 4px 14px rgba(0,0,0,0.45)",
          animation:
            "lameFade 1500ms ease-in-out forwards, lameWobble 240ms linear infinite",
        }}
      >
        {rejected ? "Lame... try again." : "Lame..."}
      </div>
    </div>
  );
};

const DiceRoller = forwardRef((props, ref) => {
  const {
    isOpen,
    onClose,
    embedded = false,
    config = null,
    onRollComplete,
    initialDice = "d20",
    primaryColor = "#FF5722",
    secondaryColor = "#8B5CF6",
    isThemedSkin = false,
    forcedResult: forcedResultProp = null,
    allowLazyRolls = true,
  } = props;
  const [selectedDice, setSelectedDice] = useState(initialDice);
  const [modifier, setModifier] = useState(0);
  const [lastRoll, setLastRoll] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState([]);
  const [showParticles, setShowParticles] = useState(false);
  const [particleType, setParticleType] = useState("default"); // default, crit-success, crit-fail
  const [internalForcedResult, setInternalForcedResult] = useState(null);
  const [revealAnim, setRevealAnim] = useState(null); // { value, color }
  const [isCocked, setIsCocked] = useState(false);
  const [showCockedAnim, setShowCockedAnim] = useState(false);
  const [lameAnim, setLameAnim] = useState(null); // { rejected: boolean }

  // Use prop if available, otherwise internal state
  const forcedResult = forcedResultProp !== null ? forcedResultProp : internalForcedResult;

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const diceRef = useRef(null);
  const animationRef = useRef(null);
  const isInitializedRef = useRef(false);
  const rollingRef = useRef(false);
  const rollDataRef = useRef(null);
  // Mouse-pickup / shake-to-roll state. Initialised here so the
  // animate loop and pointer event handlers (set up in the init
  // effect below) can both read/write the same object.
  const dragStateRef = useRef({
    isDown: false,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    accumulatedShake: 0,
    velocityX: 0,
    velocityY: 0,
    targetX: 0,
    targetZ: 0,
  });
  const handleRollRef = useRef(null);
  const customModelsRef = useRef({});
  const customFaceRotationsRef = useRef({});
  const customTransformsRef = useRef({});
  const modelsLoadedRef = useRef(false);
  const [modelsReady, setModelsReady] = useState(false);

  // Physics (cannon-es) — active in fullscreen/modal mode only.
  // Embedded mode keeps the lightweight keyframe path.
  const worldRef = useRef(null);
  const diceBodyRef = useRef(null);
  const diceMaterialRef = useRef(null);
  const wallBodiesRef = useRef([]);
  const wallMeshesRef = useRef([]);
  const tableMeshRef = useRef(null);
  const lastPhysicsTimeRef = useRef(0);
  const cameraOriginRef = useRef(null);
  const cameraShakeRef = useRef(null);
  const motionTrailRef = useRef(null);
  const particleGroupsRef = useRef([]);
  const faceMapRef = useRef({});
  const audioCtxRef = useRef(null);
  const cockedDepthRef = useRef(0);
  const physicsRollRef = useRef(null);
  // Wall arena state — drives both visual animation and the gate
  // that buffers a dice release while the walls are still landing.
  // 'parked' = up out of view, 'dropping' = animation in flight,
  // 'down' = settled around the floor, 'lifting' = receding back up.
  const wallsStateRef = useRef("parked");
  const wallsDropPromiseRef = useRef(null);
  const pendingReleaseRef = useRef(null);

  // Active Tavern dice skin (null = use stock Guildstew material).
  // Kept in a ref so createDice() can read it without needing the
  // hook value captured in its closure.
  const activeSkin = useActiveDiceSkin();
  const activeSkinRef = useRef(null);
  const defaultTextureRef = useRef(null);
  const textureCacheRef = useRef(new Map());
  useEffect(() => { activeSkinRef.current = activeSkin; }, [activeSkin]);

  // Preload the shared default dice texture once.
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(DEFAULT_TEXTURE_URL, (tex) => {
      tex.flipY = false;
      defaultTextureRef.current = tex;
      // If the die is already on stage, re-skin it so it picks up the
      // texture once it loads.
      if (diceRef.current) {
        applyDiceSkinToMesh(diceRef.current, activeSkinRef.current || STOCK_SKIN, {
          defaultTexture: defaultTextureRef.current,
          textureCache: textureCacheRef.current,
        });
        applyVertexGradient(diceRef.current, primaryColor, secondaryColor, isThemedSkin);
      }
    });
  }, []);
  
  // Keep latest callback in ref to avoid re-init of scene
  const onRollCompleteRef = useRef(onRollComplete);
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  // Keep latest state visible to pointer event handlers that were
  // bound once at init time.
  const isRollingRef = useRef(false);
  const isCockedRef = useRef(false);
  useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);
  useEffect(() => { isCockedRef.current = isCocked; }, [isCocked]);

  useImperativeHandle(ref, () => ({
    roll: () => handleRoll(),
    lazyRoll: () => handleRoll({ lazy: true }),
  }));

  // Keep handleRollRef pointing at the latest closure so the
  // pointer-event handlers (bound once at init) always trigger
  // the current handleRoll.
  useEffect(() => {
    handleRollRef.current = handleRoll;
  });

  useEffect(() => {
    if (initialDice) setSelectedDice(initialDice);
  }, [initialDice]);

  // Load GLB models & config
  useEffect(() => {
    if (!isOpen && !embedded) return;

    const loadCustomConfig = async () => {
      let configToLoad = config;

      // localStorage fallback
      if (!configToLoad) {
        const savedConfig = localStorage.getItem("diceConfig");
        if (savedConfig) configToLoad = JSON.parse(savedConfig);
      }

      // If still nothing, use defaults pointing at your GLBs
      if (!configToLoad) {
        configToLoad = { uploadedModels: DEFAULT_MODEL_URLS };
      }

      // face rotations (optional)
      if (configToLoad.faceRotations) {
        customFaceRotationsRef.current = configToLoad.faceRotations;
      }

      // transforms (optional)
      if (configToLoad.modelTransforms) {
        customTransformsRef.current = configToLoad.modelTransforms;
      }

      // GLB models
      if (configToLoad.uploadedModels) {
        const loader = new GLTFLoader();
        const promises = [];

        for (const [type, url] of Object.entries(configToLoad.uploadedModels)) {
          if (customModelsRef.current[type]?.url === url) continue;

          const p = new Promise((resolve) => {
            loader.load(
              url,
              (gltf) => {
                customModelsRef.current[type] = { ...gltf, url };
                resolve();
              },
              undefined,
              (err) => {
                console.error(
                  `Failed to load custom dice model for ${type}:`,
                  err
                );
                resolve();
              }
            );
          });
          promises.push(p);
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }
      }

      modelsLoadedRef.current = true;
      setModelsReady(true);

      if (sceneRef.current && isInitializedRef.current) {
        createDice(selectedDice);
      }
    };

    loadCustomConfig();
  }, [isOpen, embedded, config, selectedDice]);

  // Init Three.js
  useEffect(() => {
    if ((!isOpen && !embedded) || !containerRef.current || isInitializedRef.current)
      return;

    const container = containerRef.current;
    // Both modal and embedded modes now render the canvas inside
    // their host container. Modal mode adds the physics arena (walls,
    // floor, top-down camera); embedded mode keeps the lightweight
    // keyframe-only setup (shadow disc, isometric camera).
    const arenaMode = !embedded;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    let camera;
    if (arenaMode) {
      // "Roll20 angle" — camera lives almost directly above the floor
      // with a tiny Z offset so the up-face number is dominant but
      // the player still sees a hint of dimension on the dice. FOV 30
      // is narrow enough to minimize perspective distortion across
      // the 6×6 arena while still fitting the floor + walls.
      camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
      camera.position.set(0, 12, 0.5);
    } else {
      camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      const baseSize = 300;
      const scale = Math.max(width, height) / baseSize;
      const distance = 3 * scale;
      camera.position.set(distance, distance, distance);
    }
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    if (arenaMode) {
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.touchAction = "none";
    }
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!camera || !renderer || !container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);
    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    // Neutral lighting — dice color now comes from vertex colors
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.8);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    // Subtle accent in secondary color for atmosphere only — NOT driving dice color
    const accentLight = new THREE.PointLight(secondaryColor, 0.6, 8);
    accentLight.position.set(-3, 2, 3);
    scene.add(accentLight);

    scene.userData = { ambientLight, hemiLight, keyLight, fillLight, accentLight };

    if (arenaMode) {
      // ─── Physics world (modal/arena mode only) ───
      const { world, diceMat, walls } = buildPhysicsWorld();
      diceMaterialRef.current = diceMat;
      wallBodiesRef.current = walls;
      worldRef.current = world;
      lastPhysicsTimeRef.current = performance.now();
      cameraOriginRef.current = camera.position.clone();

      // Premium table surface — 6×6 with gradient + hex pattern.
      const tableSize = (ARENA.halfSize + ARENA.wallThickness) * 2;
      const tableGeometry = new THREE.PlaneGeometry(tableSize, tableSize);
      const tableTex = buildTableTexture(secondaryColor);
      const tableMaterial = new THREE.MeshBasicMaterial({
        map: tableTex,
        transparent: true,
        opacity: 1,
      });
      const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
      tableMesh.rotation.x = -Math.PI / 2;
      tableMesh.position.y = ARENA.floorY + 0.001;
      scene.add(tableMesh);
      tableMeshRef.current = tableMesh;

      // Visual walls — thin glowing slabs at the arena boundaries,
      // parked above (y=8) until a roll triggers the thunk-down.
      const wallW = (ARENA.halfSize + ARENA.wallThickness) * 2;
      const wallH = ARENA.wallHeight;
      const wallT = 0.05;
      const wallY = 0;
      const parkedY = 8;
      const sides = [
        { pos: [0, parkedY, -ARENA.halfSize - ARENA.wallThickness / 2], scale: [wallW, wallH, wallT] },
        { pos: [0, parkedY, ARENA.halfSize + ARENA.wallThickness / 2], scale: [wallW, wallH, wallT] },
        { pos: [-ARENA.halfSize - ARENA.wallThickness / 2, parkedY, 0], scale: [wallT, wallH, wallW] },
        { pos: [ARENA.halfSize + ARENA.wallThickness / 2, parkedY, 0], scale: [wallT, wallH, wallW] },
      ];
      const wallMeshes = sides.map((side) => {
        const geom = new THREE.BoxGeometry(side.scale[0], side.scale[1], side.scale[2]);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(primaryColor),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(side.pos[0], side.pos[1], side.pos[2]);
        mesh.userData = { restY: wallY, parkedY };
        scene.add(mesh);
        return mesh;
      });
      wallMeshesRef.current = wallMeshes;

      // Contact reactions — sound + camera shake + dust particles
      // whenever the dice hits the floor or any wall during a roll.
      world.addEventListener("postStep", () => {
        const body = diceBodyRef.current;
        if (!body) return;
        const v = body.velocity.length();
        if (v < 2) return;
        for (const c of world.contacts) {
          if (c.bi !== body && c.bj !== body) continue;
          const other = c.bi === body ? c.bj : c.bi;
          const isFloor = other.shapes[0] instanceof CANNON.Plane;
          const now = performance.now();
          if (body.userLastContactAt && now - body.userLastContactAt < 60) continue;
          body.userLastContactAt = now;

          const vNorm = Math.min(v / 14, 1);
          if (isFloor) {
            playThunk(0.15 + 0.3 * vNorm, 75);
          } else {
            playThunk(0.2 + 0.4 * vNorm, 110);
          }
          shakeCamera(2 * vNorm, 80);

          const cp = c.bi === body ? c.ri : c.rj;
          const wp = new CANNON.Vec3();
          (c.bi === body ? c.bi : c.bj).pointToWorldFrame(cp, wp);
          spawnDustPuff(wp.x, wp.y, wp.z);
          break;
        }
      });
    } else {
      // Embedded mode keeps the lightweight shadow disc.
      const shadowGeometry = new THREE.CircleGeometry(1.5, 32);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
      });
      const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -1.2;
      scene.add(shadowMesh);
    }

    if (modelsReady) {
      createDice(selectedDice);
    }

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const diceMesh = diceRef.current;
      if (!renderer || !camera || !scene) return;

      // Step physics (modal/fullscreen mode only).
      const world = worldRef.current;
      if (world) {
        const now = performance.now();
        const dt = Math.min((now - lastPhysicsTimeRef.current) / 1000, 1 / 30);
        lastPhysicsTimeRef.current = now;
        world.step(1 / 60, dt, 3);
      }

      // Camera shake — additive offset on top of the resting camera.
      if (cameraOriginRef.current) {
        const shake = cameraShakeRef.current;
        if (shake) {
          const t = (performance.now() - shake.start) / shake.duration;
          if (t >= 1) {
            camera.position.copy(cameraOriginRef.current);
            cameraShakeRef.current = null;
          } else {
            const decay = 1 - t;
            const i = shake.intensity * decay;
            camera.position.set(
              cameraOriginRef.current.x + (Math.random() - 0.5) * i,
              cameraOriginRef.current.y + (Math.random() - 0.5) * i,
              cameraOriginRef.current.z + (Math.random() - 0.5) * i
            );
          }
        }
      }

      // While the dice is being held, lerp it toward the cursor
      // target each frame. This runs only when not currently rolling.
      const drag = dragStateRef.current;
      if (drag.isDragging && diceMesh && !rollingRef.current) {
        const lerp = 0.25;
        diceMesh.position.x += (drag.targetX - diceMesh.position.x) * lerp;
        diceMesh.position.y += (1.5 - diceMesh.position.y) * lerp;
        diceMesh.position.z += (drag.targetZ - diceMesh.position.z) * lerp;
        // Slight wiggle so a held dice feels alive.
        diceMesh.rotation.x += 0.02 + drag.velocityX * 0.001;
        diceMesh.rotation.z += 0.02 + drag.velocityY * 0.001;
        // Keep physics body parked at the held position so when the
        // user lets go the body's start state matches the mesh.
        if (diceBodyRef.current) {
          diceBodyRef.current.position.set(
            diceMesh.position.x, diceMesh.position.y, diceMesh.position.z
          );
          diceBodyRef.current.velocity.set(0, 0, 0);
          diceBodyRef.current.angularVelocity.set(0, 0, 0);
          diceBodyRef.current.sleep();
        }
      }

      // Sync dice mesh to physics body when:
      //  - we have a body (modal mode), AND
      //  - no scripted keyframe roll is in flight, AND
      //  - the dice is not currently being dragged.
      const body = diceBodyRef.current;
      if (body && diceMesh && !rollingRef.current && !drag.isDragging) {
        diceMesh.position.set(body.position.x, body.position.y, body.position.z);
        diceMesh.quaternion.set(
          body.quaternion.x, body.quaternion.y,
          body.quaternion.z, body.quaternion.w
        );
      }

      // Motion blur — faint trailing ghost while moving fast.
      if (body && diceMesh && sceneRef.current) {
        const speed = body.velocity.length();
        if (speed > 5 && !rollingRef.current) {
          if (!motionTrailRef.current) {
            const ghost = diceMesh.clone(true);
            ghost.traverse((c) => {
              if (c.isMesh && c.material) {
                c.material = c.material.clone();
                c.material.transparent = true;
                c.material.opacity = 0.25;
                c.material.depthWrite = false;
              }
            });
            sceneRef.current.add(ghost);
            motionTrailRef.current = ghost;
          }
          const ghost = motionTrailRef.current;
          const offset = 0.18;
          ghost.position.set(
            body.position.x - (body.velocity.x / speed) * offset,
            body.position.y - (body.velocity.y / speed) * offset,
            body.position.z - (body.velocity.z / speed) * offset
          );
          ghost.scale.copy(diceMesh.scale);
          ghost.quaternion.copy(diceMesh.quaternion);
          ghost.visible = true;
        } else if (motionTrailRef.current) {
          motionTrailRef.current.visible = false;
        }
      }

      // Animate dust-puff particle groups.
      if (particleGroupsRef.current.length > 0) {
        const now2 = performance.now();
        const remaining = [];
        for (const g of particleGroupsRef.current) {
          const t = (now2 - g.start) / g.duration;
          if (t >= 1) {
            for (const m of g.meshes) {
              sceneRef.current.remove(m);
              m.geometry.dispose();
              m.material.dispose();
            }
            continue;
          }
          const dtp = 1 / 60;
          for (const m of g.meshes) {
            m.position.x += m.userData.vel.x * dtp;
            m.position.y += m.userData.vel.y * dtp;
            m.position.z += m.userData.vel.z * dtp;
            m.userData.vel.y -= 1.5 * dtp;
            m.material.opacity = 0.7 * (1 - t);
            m.scale.setScalar(1 + t * 0.6);
          }
          remaining.push(g);
        }
        particleGroupsRef.current = remaining;
      }

      const roll = rollDataRef.current;
      if (rollingRef.current && roll && diceMesh) {
        const now = performance.now();
        const elapsed = now - roll.startTime;

        // PHASE 1: Anticipation — shake/wiggle in place
        if (elapsed < roll.anticipationDuration) {
          const t = elapsed / roll.anticipationDuration;
          const shakeAmount = 0.08 * Math.sin(t * Math.PI * 8) * (1 - t);
          diceMesh.rotation.set(
            roll.startRot.x + shakeAmount,
            roll.startRot.y + shakeAmount * 0.7,
            roll.startRot.z + shakeAmount * 0.5
          );
          // NOTE: do NOT touch diceMesh.scale here — createDice
          // auto-fits the GLB to ~2.5 world units and any
          // scale.setScalar(...) call would wipe that out and shrink
          // the dice for the rest of the session.
        }

        // PHASE 2: Tumble — procedural angular velocity with random jitter
        else if (elapsed < roll.anticipationDuration + roll.tumbleDuration) {
          const phaseT = (elapsed - roll.anticipationDuration) / roll.tumbleDuration;
          const eased = easeOutCubic(phaseT);

          const velMult = roll.tumbleVelMult ?? 1.0;

          if (!roll.tumbleAccumulator) {
            roll.tumbleAccumulator = { x: roll.startRot.x, y: roll.startRot.y, z: roll.startRot.z };
            roll.tumbleVelocity = {
              x: (Math.random() - 0.5) * 0.6 * velMult,
              y: (Math.random() - 0.5) * 0.6 * velMult,
              z: (Math.random() - 0.5) * 0.6 * velMult,
            };
            roll.lastFrameTime = now;
          }

          const dt = Math.min((now - roll.lastFrameTime) / 1000, 0.05);
          roll.lastFrameTime = now;

          const decay = 1 - phaseT * 0.3;
          roll.tumbleVelocity.x += (Math.random() - 0.5) * 0.08 * velMult;
          roll.tumbleVelocity.y += (Math.random() - 0.5) * 0.08 * velMult;
          roll.tumbleVelocity.z += (Math.random() - 0.5) * 0.05 * velMult;

          const speedMult = (12 + Math.random() * 4) * (1 - eased * 0.6) * velMult;
          roll.tumbleAccumulator.x += roll.tumbleVelocity.x * dt * speedMult * decay;
          roll.tumbleAccumulator.y += roll.tumbleVelocity.y * dt * speedMult * decay;
          roll.tumbleAccumulator.z += roll.tumbleVelocity.z * dt * speedMult * decay;

          diceMesh.rotation.set(
            roll.tumbleAccumulator.x,
            roll.tumbleAccumulator.y,
            roll.tumbleAccumulator.z
          );

          const orbitT = phaseT;
          const angle = roll.orbitStart + 2 * Math.PI * roll.orbitTurns * orbitT + Math.sin(orbitT * 8) * 0.3;
          const radius = roll.maxRadius * (1 - easeOutQuint(orbitT));
          const heightFactor = roll.throwHeight ?? 1.0;
          const arcHeight = (Math.sin(orbitT * Math.PI) * 0.4 + Math.sin(orbitT * Math.PI * 3) * 0.1) * heightFactor;
          // Lerp the throw-start position out to (0, arc, 0) over the
          // tumble so dice picked up at an offset start point still
          // land back near center.
          const blend = easeOutQuint(orbitT);
          const sx = (roll.startPos?.x ?? 0) * (1 - blend);
          const sz = (roll.startPos?.z ?? 0) * (1 - blend);
          diceMesh.position.set(sx + radius * Math.cos(angle), arcHeight, sz + radius * Math.sin(angle));
          // NOTE: see PHASE 1 — never set scale here either.
        }

        // PHASE 3: Settle — snap to final face with overshoot bounce
        else if (elapsed < roll.totalDuration) {
          const settleStart = roll.anticipationDuration + roll.tumbleDuration;
          const settleT = (elapsed - settleStart) / roll.settleDuration;
          const eased = easeOutBack(Math.min(settleT, 1));

          if (!roll.settleStartRot) {
            roll.settleStartRot = {
              x: diceMesh.rotation.x,
              y: diceMesh.rotation.y,
              z: diceMesh.rotation.z,
            };
          }

          diceMesh.rotation.set(
            THREE.MathUtils.lerp(roll.settleStartRot.x, roll.finalRot.x, eased),
            THREE.MathUtils.lerp(roll.settleStartRot.y, roll.finalRot.y, eased),
            THREE.MathUtils.lerp(roll.settleStartRot.z, roll.finalRot.z, eased)
          );

          const dropT = Math.min(settleT * 1.5, 1);
          const bounce = Math.abs(Math.sin(dropT * Math.PI * 2)) * (1 - dropT) * 0.15;
          diceMesh.position.set(0, bounce, 0);
        }

        // PHASE 4: Done — trigger result, particles, reveal
        else {
          rollingRef.current = false;
          diceMesh.position.set(0, 0, 0);
          diceMesh.rotation.set(roll.finalRot.x, roll.finalRot.y, roll.finalRot.z);
          // NOTE: see PHASE 1 — never set scale here either.

          // Re-park the physics body to match the keyframe end pose so
          // the body→mesh sync that resumes next frame doesn't yank
          // the dice. Asleep + zero-velocity = stable rest state.
          if (diceBodyRef.current) {
            const b = diceBodyRef.current;
            const half = b.userHalfExtents || new CANNON.Vec3(1, 1, 1);
            b.position.set(0, ARENA.floorY + half.y, 0);
            b.quaternion.setFromEuler(roll.finalRot.x, roll.finalRot.y, roll.finalRot.z);
            b.velocity.set(0, 0, 0);
            b.angularVelocity.set(0, 0, 0);
            b.sleep();
          }

          const finalValue = roll.rollValue;
          const wasCocked = !!roll.willCock;
          const wasLazy = !!roll.lazy;
          const lazyAllowed = roll.lazyAllowed !== false;
          const rollMod = roll.modifier ?? 0;
          rollDataRef.current = null;
          setIsRolling(false);

          // Cocked: chicken + sound, no result counted, no history,
          // no onRollComplete. Player must roll again. Keep walls
          // down so the re-roll fires without re-thunking.
          if (wasCocked) {
            triggerCockedOverlay();
            return;
          }
          // Clean keyframe finish — lift the walls so the result
          // reveal isn't framed inside a closed arena.
          if (!embedded && wallMeshesRef.current.length > 0) {
            animateWallsUp();
          }

          // Lazy roll: always plays the sad sound + Lame... overlay.
          // In strict mode (allowLazyRolls=false) it doesn't count.
          // In permissive mode the result still counts but we delay
          // the reveal so the Lame... animation gets center stage.
          if (wasLazy) {
            playLazySound();
            if (!lazyAllowed) {
              setLameAnim({ rejected: true });
              setTimeout(() => setLameAnim(null), 1600);
              return;
            }
            setLameAnim({ rejected: false });
            setTimeout(() => setLameAnim(null), 1600);
            // Defer the result reveal/history so the Lame... overlay
            // plays before the number drops.
            setTimeout(() => {
              const total = finalValue + rollMod;
              setRevealAnim({ value: finalValue, color: "#94a3b8", modifier: rollMod });
              setLastRoll({ roll: finalValue, total });
              if (!embedded) {
                setRollHistory((prev) => [
                  {
                    result: finalValue,
                    timestamp: new Date().toLocaleTimeString(),
                    dice: selectedDice,
                    modifier: rollMod,
                    total,
                    lazy: true,
                  },
                  ...prev,
                ].slice(0, 10));
              }
              if (onRollCompleteRef.current && typeof finalValue === "number") {
                onRollCompleteRef.current(finalValue);
              }
            }, 800);
            return;
          }

          const isCritSuccess = selectedDice === "d20" && finalValue === 20;
          const isCritFail = selectedDice === "d20" && finalValue === 1;

          let revealColor = "#ffffff";
          let pType = "default";
          if (isCritSuccess) { revealColor = "#FFD700"; pType = "crit-success"; playCritSuccessSound(); }
          else if (isCritFail) { revealColor = "#DC2626"; pType = "crit-fail"; playCritFailSound(); }
          else if (finalValue >= (DICE_SIDES[selectedDice] * 0.85)) { revealColor = "#37F2D1"; }
          else if (finalValue <= (DICE_SIDES[selectedDice] * 0.15)) { revealColor = "#94a3b8"; }

          setRevealAnim({ value: finalValue, color: revealColor, modifier: rollMod });
          setParticleType(pType);
          setShowParticles(true);
          setTimeout(() => setShowParticles(false), 1200);

          const total = finalValue + rollMod;
          setLastRoll({ roll: finalValue, total });
          if (!embedded) {
            setRollHistory((prev) => [
              {
                result: finalValue,
                timestamp: new Date().toLocaleTimeString(),
                dice: selectedDice,
                modifier: rollMod,
                total,
              },
              ...prev,
            ].slice(0, 10));
          }

          if (onRollCompleteRef.current && typeof finalValue === "number") {
            onRollCompleteRef.current(finalValue);
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Mouse pickup + shake-to-roll. Only wired for the modal/arena
    // canvas; embedded mode keeps its simple click-to-roll. The
    // canvas is contained inside the modal arena so we attach
    // listeners to the canvas directly — no window-level capture
    // needed.
    let detachPointer = () => {};
    if (arenaMode) {
      const canvas = renderer.domElement;
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5);
      const tmp = new THREE.Vector3();

      const setNdc = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };

      const projectToWorld = (clientX, clientY, target) => {
        setNdc(clientX, clientY);
        raycaster.setFromCamera(ndc, cameraRef.current);
        raycaster.ray.intersectPlane(dragPlane, target);
      };

      const hitsDice = (clientX, clientY) => {
        const dice = diceRef.current;
        if (!dice) return false;
        setNdc(clientX, clientY);
        raycaster.setFromCamera(ndc, cameraRef.current);
        const hits = raycaster.intersectObject(dice, true);
        return hits.length > 0;
      };

      const onPointerMoveHover = (e) => {
        if (dragStateRef.current.isDown) return;
        if (rollingRef.current || isCockedRef.current) {
          canvas.style.cursor = "";
          return;
        }
        canvas.style.cursor = hitsDice(e.clientX, e.clientY) ? "grab" : "";
      };

      const onPointerDown = (e) => {
        if (rollingRef.current || isCockedRef.current) return;
        if (!hitsDice(e.clientX, e.clientY)) return;
        e.preventDefault();
        e.stopPropagation();
        const drag = dragStateRef.current;
        drag.isDown = true;
        drag.isDragging = true;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.lastT = performance.now();
        drag.accumulatedShake = 0;
        drag.velocityX = 0;
        drag.velocityY = 0;
        projectToWorld(e.clientX, e.clientY, tmp);
        drag.targetX = tmp.x;
        drag.targetZ = tmp.z;
        canvas.style.cursor = "grabbing";
        // Walls thunk down immediately on pickup. If the player
        // releases before they've landed, onPointerUp queues the
        // release and the wall-drop promise fires it on land.
        ensureWallsDown();
      };

      const onPointerMove = (e) => {
        const drag = dragStateRef.current;
        if (!drag.isDown) {
          onPointerMoveHover(e);
          return;
        }
        const now = performance.now();
        const dt = Math.max(1, now - drag.lastT);
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        drag.accumulatedShake += Math.abs(dx) + Math.abs(dy);
        drag.velocityX = (dx / dt) * 1000;
        drag.velocityY = (dy / dt) * 1000;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.lastT = now;
        projectToWorld(e.clientX, e.clientY, tmp);
        drag.targetX = tmp.x;
        drag.targetZ = tmp.z;
      };

      const onPointerUp = () => {
        const drag = dragStateRef.current;
        if (!drag.isDown) return;
        drag.isDown = false;
        drag.isDragging = false;
        canvas.style.cursor = "";
        const lazy = drag.accumulatedShake <= 250;
        // Hand the dice's current world position to handleRoll so
        // the roll animation (or physics impulse) begins where the
        // player let go.
        const dice = diceRef.current;
        const startPos = dice
          ? { x: dice.position.x, y: dice.position.y, z: dice.position.z }
          : null;
        // Release velocity (px/s) → world space. With the top-down
        // camera, screen-right ≈ world +X and screen-up ≈ world -Z
        // (i.e. flicking forward sends the dice away from the
        // camera). Y is added in rollWithPhysics.
        const releaseVelocity = !lazy
          ? { x: drag.velocityX, y: 0, z: -drag.velocityY }
          : null;
        const args = { lazy, startPos, releaseVelocity };
        // Gate release on walls being fully down. If they're still
        // dropping, queue the release and the ensureWallsDown promise
        // (kicked off in onPointerDown) fires the roll on land.
        if (wallsStateRef.current === "down") {
          if (handleRollRef.current) handleRollRef.current(args);
        } else {
          pendingReleaseRef.current = args;
        }
      };

      // Attach to the canvas directly. Pointer events outside the
      // arena (modifier input, ROLL button, etc.) flow normally to
      // the modal controls without any capture trickery.
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      detachPointer = () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        canvas.style.cursor = "";
      };
    }

    isInitializedRef.current = true;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      detachPointer();
      isInitializedRef.current = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.dispose();
        if (container && renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
      // Tear down physics world.
      if (worldRef.current) {
        const w = worldRef.current;
        [...w.bodies].forEach((b) => w.removeBody(b));
        worldRef.current = null;
      }
      diceBodyRef.current = null;
      wallBodiesRef.current = [];
      wallMeshesRef.current = [];
      tableMeshRef.current = null;
      motionTrailRef.current = null;
      particleGroupsRef.current = [];
    };
  }, [isOpen, embedded, modelsReady, selectedDice, forcedResult]); // Re-add forcedResult to dependency array so force re-roll works

  useEffect(() => {
    if (sceneRef.current?.userData?.accentLight) {
      sceneRef.current.userData.accentLight.color.set(secondaryColor);
    }
    if (diceRef.current && modelsReady) {
      const customModel = customModelsRef.current[selectedDice];
      if (customModel?.scene) {
        applyVertexGradient(diceRef.current, primaryColor, secondaryColor, isThemedSkin);
      }
    }
  }, [primaryColor, secondaryColor, isThemedSkin, modelsReady, selectedDice]);

  // Re-skin the current die whenever the active Tavern dice skin
  // changes (e.g. player applies a new skin from My Collection
  // without closing the roller).
  useEffect(() => {
    if (!diceRef.current) return;
    applyDiceSkinToMesh(diceRef.current, activeSkin || STOCK_SKIN, {
      defaultTexture: defaultTextureRef.current,
      textureCache: textureCacheRef.current,
    });
    applyVertexGradient(diceRef.current, primaryColor, secondaryColor, isThemedSkin);
  }, [activeSkin, primaryColor, secondaryColor, isThemedSkin]);

  useEffect(() => {
    if ((isOpen || embedded) && sceneRef.current && isInitializedRef.current) {
      createDice(selectedDice);
    }
  }, [selectedDice, isOpen, embedded, modelsReady]);

  // Sound Effects
  const playRollSound = () => {
    const sounds = [
      "https://static.wixstatic.com/mp3/5cdfd8_e217d9cf6d2740878d9c75447a59650c.wav",
      "https://static.wixstatic.com/mp3/5cdfd8_51fb8464ed11497ca568fd738696a23a.wav",
      "https://static.wixstatic.com/mp3/5cdfd8_d530a1fb3ee4434a8291a7cf1e705332.wav",
      "https://static.wixstatic.com/mp3/5cdfd8_26ff827714844fccaaf4872fc002437e.wav"
    ];
    const sound = new Audio(sounds[Math.floor(Math.random() * sounds.length)]);
    sound.volume = 0.6;
    sound.play().catch(() => {});
  };

  const playCritSuccessSound = () => {
    const sounds = [
      "https://static.wixstatic.com/mp3/5cdfd8_e8c4a95d12884406920d8eb54b0868ee.wav",
      "https://static.wixstatic.com/mp3/5cdfd8_1d4320bb6ce140e3968f1104c2ef2acf.mp3"
    ];
    const sound = new Audio(sounds[Math.floor(Math.random() * sounds.length)]);
    sound.volume = 0.8;
    sound.play().catch(() => {});
  };

  const playCritFailSound = () => {
    const sounds = [
      "https://static.wixstatic.com/mp3/5cdfd8_277e185148974f8689952c9658c27f54.wav",
      "https://static.wixstatic.com/mp3/5cdfd8_f4193867f1004b74adaab28c878082ea.wav"
    ];
    const sound = new Audio(sounds[Math.floor(Math.random() * sounds.length)]);
    sound.volume = 0.8;
    sound.play().catch(() => {});
  };

  const playLazySound = () => {
    const sound = new Audio(LAZY_SOUND_URL);
    sound.volume = 0.7;
    sound.play().catch(() => {});
  };

  // Synth a "thunk" via WebAudio — short low-freq sine with a click
  // on top, so we don't need to ship/host an asset for every device.
  const ensureAudioCtx = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  };
  const playThunk = (volume = 0.5, freq = 90) => {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);

    const click = ctx.createOscillator();
    click.type = "triangle";
    click.frequency.setValueAtTime(180, t);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(volume * 0.6, t);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(t);
    click.stop(t + 0.06);
  };

  // Camera micro-shake: drives offsets on top of cameraOriginRef.
  const shakeCamera = (intensity, duration) => {
    const camera = cameraRef.current;
    const origin = cameraOriginRef.current;
    if (!camera || !origin) return;
    cameraShakeRef.current = {
      start: performance.now(),
      duration,
      intensity: intensity * 0.05,
    };
  };

  // 3D dust puff at world position — 6-10 small fading sprites.
  const spawnDustPuff = (x, y, z) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const count = 6 + Math.floor(Math.random() * 5);
    const group = { meshes: [], start: performance.now(), duration: 400 };
    for (let i = 0; i < count; i++) {
      const geom = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xd9c9b0),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const m = new THREE.Mesh(geom, mat);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.05;
      m.position.set(x + Math.cos(a) * r, y + 0.02, z + Math.sin(a) * r);
      m.userData.vel = {
        x: Math.cos(a) * (0.5 + Math.random() * 0.7),
        y: 0.6 + Math.random() * 0.6,
        z: Math.sin(a) * (0.5 + Math.random() * 0.7),
      };
      scene.add(m);
      group.meshes.push(m);
    }
    particleGroupsRef.current.push(group);
  };

  // Wall thunk-down: drop each wall sequentially (180ms each, 40ms
  // stagger). Returns a promise resolved when all four landed. Use
  // `ensureWallsDown` rather than calling this directly so the
  // wallsState lifecycle stays in sync.
  const animateWallsDown = () => {
    const meshes = wallMeshesRef.current;
    if (!meshes || meshes.length === 0) return Promise.resolve();
    const flashMs = 80;
    const dropMs = 180;
    const stagger = 40;
    const settledOpacity = 0.2;
    const flashColor = new THREE.Color(primaryColor);
    // Walls settle to a low-opacity primary outline — bright flash on
    // landing, then dim glow that sits in the player's brand color.
    const settleColor = new THREE.Color(primaryColor);
    return new Promise((resolve) => {
      let landedCount = 0;
      meshes.forEach((mesh, i) => {
        const startDelay = i * stagger;
        const startY = mesh.userData.parkedY;
        const restY = mesh.userData.restY;
        mesh.material.color.copy(flashColor);
        mesh.material.opacity = 0;
        mesh.position.y = startY;
        const t0 = performance.now() + startDelay;
        const drop = () => {
          const now = performance.now();
          if (now < t0) { requestAnimationFrame(drop); return; }
          const elapsed = now - t0;
          const t = Math.min(elapsed / dropMs, 1);
          const eased = easeOutCubic(t);
          mesh.position.y = startY + (restY - startY) * eased;
          mesh.material.opacity = eased;
          if (t < 1) {
            requestAnimationFrame(drop);
          } else {
            playThunk(0.5, 80 + Math.random() * 30);
            shakeCamera(3, 100);
            mesh.material.opacity = 1;
            const flashStart = performance.now();
            const settle = () => {
              const f = Math.min((performance.now() - flashStart) / flashMs, 1);
              mesh.material.opacity = 1 - (1 - settledOpacity) * f;
              mesh.material.color.copy(flashColor).lerp(settleColor, f);
              if (f < 1) {
                requestAnimationFrame(settle);
              } else {
                landedCount += 1;
                if (landedCount === meshes.length) resolve();
              }
            };
            settle();
          }
        };
        drop();
      });
    });
  };

  const animateWallsUp = () => {
    const meshes = wallMeshesRef.current;
    if (!meshes || meshes.length === 0) return;
    const liftMs = 250;
    wallsStateRef.current = "lifting";
    meshes.forEach((mesh) => {
      const startY = mesh.position.y;
      const startOpacity = mesh.material.opacity;
      const targetY = mesh.userData.parkedY;
      const t0 = performance.now();
      const lift = () => {
        const t = Math.min((performance.now() - t0) / liftMs, 1);
        const e = easeOutCubic(t);
        mesh.position.y = startY + (targetY - startY) * e;
        mesh.material.opacity = startOpacity * (1 - e);
        if (t < 1) requestAnimationFrame(lift);
      };
      lift();
    });
    setTimeout(() => {
      if (wallsStateRef.current === "lifting") wallsStateRef.current = "parked";
    }, liftMs + 20);
  };

  // Drop walls if they're not already down. Returns a promise that
  // resolves once the walls are fully landed. Used by both the dice-
  // pickup path (so the arena snaps up the moment the player grabs
  // the die) and the ROLL-button path (so a click triggers the same
  // walls-then-impulse sequence).
  const ensureWallsDown = () => {
    if (wallsStateRef.current === "down") return Promise.resolve();
    if (wallsStateRef.current === "dropping" && wallsDropPromiseRef.current) {
      return wallsDropPromiseRef.current;
    }
    wallsStateRef.current = "dropping";
    const p = animateWallsDown().then(() => {
      wallsStateRef.current = "down";
      wallsDropPromiseRef.current = null;
      // Flush any release that was queued while we were still
      // landing — the player let go before the arena was ready.
      const queued = pendingReleaseRef.current;
      if (queued) {
        pendingReleaseRef.current = null;
        if (handleRollRef.current) handleRollRef.current(queued);
      }
    });
    wallsDropPromiseRef.current = p;
    return p;
  };

  const createDice = (diceType) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (diceRef.current) {
      scene.remove(diceRef.current);
    }
    // Drop any prior physics body so we can rebuild for the new dice type.
    if (worldRef.current && diceBodyRef.current) {
      worldRef.current.removeBody(diceBodyRef.current);
      diceBodyRef.current = null;
    }
    // Drop any motion-trail ghost — it's tied to the previous mesh.
    if (motionTrailRef.current) {
      scene.remove(motionTrailRef.current);
      motionTrailRef.current = null;
    }

    let mesh;

    const customModel = customModelsRef.current[diceType];
    if (customModel && customModel.scene) {
      const model = customModel.scene.clone();
      const transform = customTransformsRef.current[diceType] || { x: 0, y: 0 };

      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.setScalar(scale);

      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      model.position.x += transform.x;
      model.position.y += transform.y;

      mesh = model;
    } else {
      // Fallback geometry (should rarely be hit if GLBs exist)
      if (diceType === "d20") {
        mesh = createFallbackD20();
      } else {
        let geometry;
        switch (diceType) {
          case "d4":
            geometry = new THREE.TetrahedronGeometry(1.3);
            break;
          case "d6":
            geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            break;
          case "d8":
            geometry = new THREE.OctahedronGeometry(1.3);
            break;
          case "d10":
          case "d12":
            geometry = new THREE.DodecahedronGeometry(1.2);
            break;
          default:
            geometry = new THREE.IcosahedronGeometry(1.3);
        }
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.3,
          roughness: 0.4,
          flatShading: true,
        });
        mesh = new THREE.Mesh(geometry, material);
      }
    }

    // Deep-clone materials/geometries so each dice instance can be
    // tinted independently without mutating shared GLB data.
    mesh.traverse((child) => {
      if (child.isMesh) {
        if (child.material) child.material = child.material.clone();
        if (child.geometry) child.geometry = child.geometry.clone();
      }
    });

    // Apply the vertex gradient
    applyVertexGradient(mesh, primaryColor, secondaryColor, isThemedSkin);

    diceRef.current = mesh;
    scene.add(mesh);

    // Re-skin with the active Tavern skin (or stock defaults). This
    // builds the material (texture map, metalness, etc.) so it must
    // run before the final vertex-gradient pass, which sets
    // vertexColors:true on whatever material the skin produced.
    applyDiceSkinToMesh(mesh, activeSkinRef.current || STOCK_SKIN, {
      defaultTexture: defaultTextureRef.current,
      textureCache: textureCacheRef.current,
    });

    // Re-apply the gradient so vertex colors survive applyDiceSkinToMesh's
    // material replacement. For themed skins this is a no-op tint reset.
    applyVertexGradient(mesh, primaryColor, secondaryColor, isThemedSkin);

    // ─── Physics body ───
    // Box approximation of the visual mesh — ~85% of the bounding box
    // half-extents so a d20 (etc.) settles cleanly face-up on the floor.
    if (worldRef.current) {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      const half = new CANNON.Vec3(
        Math.max(size.x * 0.5 * 0.85, 0.1),
        Math.max(size.y * 0.5 * 0.85, 0.1),
        Math.max(size.z * 0.5 * 0.85, 0.1)
      );
      const body = buildDiceBody(diceMaterialRef.current, half);
      body.position.set(0, ARENA.floorY + half.y, 0);
      body.sleep();
      worldRef.current.addBody(body);
      diceBodyRef.current = body;
      diceBodyRef.current.userHalfExtents = half;
    }

    // Cache face map (body-local up-direction per face value).
    if (!faceMapRef.current[diceType]) {
      faceMapRef.current[diceType] = buildFaceMap(diceType);
    }
  };

  // Trigger the cocked overlay (chicken + COCKED!) and a re-roll prompt.
  const triggerCockedOverlay = () => {
    setIsCocked(true);
    setShowCockedAnim(true);
    const sound = new Audio(
      COCKED_SOUNDS[Math.floor(Math.random() * COCKED_SOUNDS.length)]
    );
    sound.volume = 0.85;
    sound.play().catch(() => {});
    setTimeout(() => setShowCockedAnim(false), 2400);
  };

  // Centralized "roll resolved cleanly" handler used by the physics
  // path. The keyframe path (lazy rolls only) inlines its own version
  // because it needs to handle the lazy/strict overlay sequencing.
  const finalizePhysicsResult = (finalValue, rollMod) => {
    setIsRolling(false);
    rollingRef.current = false;
    cockedDepthRef.current = 0;

    const isCritSuccess = selectedDice === "d20" && finalValue === 20;
    const isCritFail = selectedDice === "d20" && finalValue === 1;

    let revealColor = "#ffffff";
    let pType = "default";
    if (isCritSuccess) {
      revealColor = "#FFD700"; pType = "crit-success";
      playCritSuccessSound();
      shakeCamera(5, 200);
    } else if (isCritFail) {
      revealColor = "#DC2626"; pType = "crit-fail";
      playCritFailSound();
      shakeCamera(5, 200);
    } else if (finalValue >= (DICE_SIDES[selectedDice] * 0.85)) {
      revealColor = "#37F2D1";
    } else if (finalValue <= (DICE_SIDES[selectedDice] * 0.15)) {
      revealColor = "#94a3b8";
    }

    setRevealAnim({ value: finalValue, color: revealColor, modifier: rollMod });
    setParticleType(pType);
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 1200);

    const total = finalValue + rollMod;
    setLastRoll({ roll: finalValue, total });
    if (!embedded) {
      setRollHistory((prev) => [
        {
          result: finalValue,
          timestamp: new Date().toLocaleTimeString(),
          dice: selectedDice,
          modifier: rollMod,
          total,
        },
        ...prev,
      ].slice(0, 10));
    }

    if (onRollCompleteRef.current && typeof finalValue === "number") {
      onRollCompleteRef.current(finalValue);
    }
  };

  // Physics-driven roll. Hidden simulation predicts outcome → replay
  // matching impulse on the visible body so the player watches a real
  // tumble that lands on the predetermined value. Returns true if the
  // physics path took the roll, false to signal fallback to keyframe.
  const rollWithPhysics = (targetValue, rollMod, opts = {}) => {
    const body = diceBodyRef.current;
    const world = worldRef.current;
    const diceType = selectedDice;
    const faceMap = faceMapRef.current[diceType];
    if (!body || !world || !faceMap || faceMap.length === 0) return false;

    const half = body.userHalfExtents;
    // Throw-start position: prefer the mouse-release point so the roll
    // begins where the player let go of the dice.
    const startPos = opts.startPos
      ? { x: opts.startPos.x, y: Math.max(opts.startPos.y, 1.2), z: opts.startPos.z }
      : { x: 0, y: 2.2, z: 0 };

    // Optionally bias the impulse direction by the release velocity
    // (mouse-pickup case). cannon-es applyImpulse takes a vector with
    // direct mass-scaled units; release dx/dt is in px/s — we map it
    // into rough world impulse magnitude with a small constant.
    const v = opts.releaseVelocity || null;
    const startVelocity = v
      ? { x: v.x * 0.012, y: 4 + Math.abs(v.y) * 0.006, z: v.z * 0.012 }
      : null;

    // ~5% (per dice type) of rolls deliberately seek a tilted-but-
    // on-target landing instead of a clean one. Forced rolls
    // (calibration) never cock.
    const wantCocked = forcedResult === null
      && Math.random() < (COCK_RATES[diceType] ?? 0.05);
    let match = null;
    if (wantCocked) {
      match = findMatchingRoll({
        targetValue, faceMap, halfExtents: half, startPos,
        startVelocity, minDot: 0.75, maxDot: 0.92, maxRetries: 30,
      });
    }
    if (!match) {
      match = findMatchingRoll({
        targetValue, faceMap, halfExtents: half, startPos,
        startVelocity, minDot: 0.92,
      });
    }
    if (!match) return false; // vanishingly rare

    physicsRollRef.current = { targetValue, rollMod, startTime: performance.now() };

    // Walls have already been dropped (on pickup or by handleRoll's
    // ensureWallsDown). Apply impulse immediately.
    body.wakeUp();
    body.position.set(startPos.x, startPos.y, startPos.z);
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
    body.quaternion.set(
      match.initQuat.x, match.initQuat.y,
      match.initQuat.z, match.initQuat.w
    );
    body.applyImpulse(
      new CANNON.Vec3(match.impulse.x, match.impulse.y, match.impulse.z),
      new CANNON.Vec3(0, 0, 0)
    );
    body.angularVelocity.set(match.angVel.x, match.angVel.y, match.angVel.z);
    playRollSound();

    const onSleep = () => {
      body.removeEventListener("sleep", onSleep);
      // Classify the actual settled orientation.
      const { dot } = detectFaceUp(body.quaternion, faceMap);
      if (dot > 0.92) {
        // Clean settle — lift walls so the result reveal isn't boxed in.
        animateWallsUp();
        setTimeout(() => finalizePhysicsResult(targetValue, rollMod), 120);
      } else {
        // Cocked! Keep walls down so the auto re-roll can fire its
        // impulse without an extra thunk-down beat. Trigger
        // chicken + COCKED! overlay; player rolls again.
        cockedDepthRef.current += 1;
        setIsRolling(false);
        rollingRef.current = false;
        if (cockedDepthRef.current > 3) {
          // Bail rather than recurse forever.
          cockedDepthRef.current = 0;
          animateWallsUp();
          setTimeout(() => finalizePhysicsResult(targetValue, rollMod), 120);
          return;
        }
        setTimeout(() => triggerCockedOverlay(), 200);
      }
    };
    body.addEventListener("sleep", onSleep);
    return true;
  };

  const handleRoll = (opts = {}) => {
    if (!diceRef.current || isRolling) return;
    const lazy = !!opts.lazy;
    const startPos = opts.startPos || null;
    const releaseVelocity = opts.releaseVelocity || null;
    const diceType = selectedDice;
    const sides = DICE_SIDES[diceType] || 20;

    // Clear cocked / lame state from a prior roll the moment a new roll starts.
    setIsCocked(false);
    setShowCockedAnim(false);
    setLameAnim(null);

    // Snapshot allowLazyRolls into rollData so toggling the prop
    // mid-flight doesn't corrupt this roll's outcome.
    const lazyAllowedSnap = !!allowLazyRolls;

    // Use forced result if set (for calibration), otherwise random
    let roll;
    if (forcedResult !== null) {
      roll = Math.min(Math.max(1, forcedResult), sides);
    } else {
      roll = Math.floor(Math.random() * sides) + 1;
    }

    setRevealAnim(null);

    // ─── Physics path (regular non-lazy roll, modal/arena mode) ───
    // This is the "premium tabletop" path: real cannon-es simulation
    // matches the predetermined value. Cocked outcomes emerge from the
    // physics dot product (no pre-roll probability needed). Walls
    // drop first (no-op if they're already down from pickup); the
    // impulse fires once the arena is up.
    if (!lazy && !embedded && worldRef.current && diceBodyRef.current) {
      setIsRolling(true);
      ensureWallsDown().then(() => {
        const ok = rollWithPhysics(roll, modifier, { startPos, releaseVelocity });
        if (!ok) {
          setIsRolling(false);
        }
      });
      return;
    }

    // ─── Keyframe path (lazy rolls + embedded mode + physics fallback) ───
    const customFaceMap = customFaceRotationsRef.current[selectedDice];
    const defaultFaceMap = FACE_ROTATIONS[selectedDice];
    const customSnap = customFaceMap?.[roll];
    const defaultSnap = defaultFaceMap?.[roll];
    const snap = customSnap
      ? { x: customSnap.x, y: customSnap.y, z: customSnap.z }
      : defaultSnap;

    setIsRolling(true);
    // Lazy rolls (and the rare physics-fallback) play their keyframe
    // flop inside the arena too, so picking up the dice always shows
    // the walls — even if you don't shake.
    if (!embedded && wallMeshesRef.current.length > 0) {
      ensureWallsDown();
    }
    const diceMesh = diceRef.current;

    const safeSnap = snap || {
      x: Math.random() * Math.PI * 2,
      y: Math.random() * Math.PI * 2,
      z: Math.random() * Math.PI * 2
    };

    const isCrit = selectedDice === "d20" && (roll === 20 || roll === 1);

    // Cocked check only applies to the lazy/scripted path now.
    // Physics rolls handle cocked detection naturally (see rollWithPhysics).
    // Forced rolls (calibration) never cock.
    const baseCockChance = lazy ? (COCK_CHANCE_LAZY[selectedDice] ?? 0) : 0;
    const willCock = lazy && forcedResult === null && Math.random() < baseCockChance;

    const anticipationDuration = lazy ? 80 : 280;
    const tumbleDuration = lazy ? 700 : (isCrit ? 900 : 800);
    const settleDuration = lazy ? 250 : (isCrit ? 600 : 350);

    const startRot = {
      x: diceMesh.rotation.x,
      y: diceMesh.rotation.y,
      z: diceMesh.rotation.z,
    };

    const spinX = 3 + Math.floor(Math.random() * 3);
    const spinY = 3 + Math.floor(Math.random() * 3);
    const spinZ = 1 + Math.floor(Math.random() * 2);

    const COCK_OFFSET = (30 * Math.PI) / 180;
    const cockX = willCock ? (Math.random() < 0.5 ? COCK_OFFSET : -COCK_OFFSET) : 0;
    const cockZ = willCock ? (Math.random() < 0.5 ? COCK_OFFSET : -COCK_OFFSET) : 0;

    const finalRot = {
      x: safeSnap.x + Math.PI * 2 * spinX + cockX,
      y: safeSnap.y + Math.PI * 2 * spinY,
      z: safeSnap.z + Math.PI * 2 * spinZ + cockZ,
    };

    rollDataRef.current = {
      startTime: performance.now(),
      anticipationDuration,
      tumbleDuration,
      settleDuration,
      totalDuration: anticipationDuration + tumbleDuration + settleDuration,
      startRot,
      startPos: startPos || { x: 0, y: 0, z: 0 },
      finalRot,
      orbitStart: Math.random() * Math.PI * 2,
      orbitTurns: lazy ? 0.4 : (1.5 + Math.random() * 1.5),
      maxRadius: lazy ? 0 : 1.8 + Math.random() * 0.8,
      throwHeight: lazy ? 0.3 : 1.6 + Math.random() * 0.8,
      tumbleVelMult: lazy ? 0.4 : 1.0,
      rollValue: roll,
      willCock,
      modifier,
      lazy,
      lazyAllowed: lazyAllowedSnap,
    };

    rollingRef.current = true;

    // Delay the roll sound so it plays AFTER anticipation, when the dice actually starts tumbling
    setTimeout(() => playRollSound(), anticipationDuration);
  };

  if (!isOpen && !embedded) return null;

  // Embedded mode (no modal chrome)
  if (embedded) {
    return (
      <div
        className="relative flex justify-center items-center overflow-visible w-full h-full pointer-events-auto"
      >
        <div
          ref={containerRef}
          className="cursor-pointer overflow-visible w-full h-full"
          onClick={!isRolling ? () => handleRoll() : undefined}
        />
        {showParticles && <Particles type={particleType} />}
        {revealAnim && !isRolling && !isCocked && <RevealOverlay value={revealAnim.value} color={revealAnim.color} />}
        {showCockedAnim && <CockedAnimation />}
        {lameAnim && <LameAnimation rejected={lameAnim.rejected} />}
      </div>
    );
  }

  // Modal mode — arena-contained layout. Header on top, the dice
  // arena fills the bulk of the modal, and a single bottom strip
  // hosts the controls + horizontal roll history.
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full" style={{ maxWidth: 640 }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-[#FF5722] hover:bg-[#FF6B3D] transition-colors flex items-center justify-center text-white z-20 shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Frame */}
        <div
          className="relative bg-[#1E2430] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 800, maxHeight: "90vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#37F2D1] rounded-full animate-pulse" />
              <h2 className="text-white font-bold tracking-wider">DICE ROLLER</h2>
            </div>
            {!allowLazyRolls && (
              <span className="text-amber-400 font-bold text-[10px] tracking-widest bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded">
                STRICT ROLLS
              </span>
            )}
          </div>

          {/* Arena — fills bulk of modal, contains the canvas + overlays */}
          <div
            className="relative flex-1 min-h-0 overflow-hidden bg-[#1B2535]"
          >
            <div
              ref={containerRef}
              data-dice-canvas
              className="absolute inset-0"
            />
            {showParticles && <Particles type={particleType} />}
            {revealAnim && !isRolling && !isCocked && (
              <RevealOverlay
                value={revealAnim.value}
                color={revealAnim.color}
                modifier={revealAnim.modifier ?? 0}
              />
            )}
            {showCockedAnim && <CockedAnimation />}
            {lameAnim && <LameAnimation rejected={lameAnim.rejected} />}
          </div>

          {/* Bottom strip */}
          <div className="shrink-0 border-t border-white/5 px-4 pt-3 pb-2 bg-[#161B26]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={!isRolling ? () => handleRoll() : undefined}
                disabled={isRolling}
                className={`shrink-0 h-10 px-5 rounded-lg font-bold tracking-wide text-white transition-colors ${
                  isRolling
                    ? "bg-[#FF5722]/40 cursor-default"
                    : isCocked
                      ? "bg-[#FFD700] text-[#1E2430] hover:bg-[#FFE34D]"
                      : "bg-[#FF5300] hover:bg-[#FF6B3D] cursor-pointer"
                }`}
                style={{ minWidth: 120 }}
              >
                {isRolling ? "ROLLING..." : isCocked ? "ROLL AGAIN" : "ROLL"}
              </button>

              <select
                value={selectedDice}
                onChange={(e) => setSelectedDice(e.target.value)}
                className="shrink-0 h-10 bg-black/30 border border-white/10 rounded-lg px-2 text-white text-sm font-semibold focus:border-[#37F2D1] transition-colors outline-none appearance-none cursor-pointer hover:bg-black/40"
                style={{ width: 80 }}
              >
                {diceTypes.map((dice) => (
                  <option key={dice.name} value={dice.name}>
                    {dice.name.toUpperCase()}
                  </option>
                ))}
              </select>

              <div className="relative shrink-0" style={{ width: 80 }}>
                <input
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                  className="w-full h-10 bg-black/30 border border-white/10 rounded-lg pl-6 pr-2 text-center text-white font-semibold focus:border-[#37F2D1] transition-colors outline-none"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">+</span>
              </div>

              <div className="flex-1 min-w-0 overflow-x-auto custom-scrollbar">
                <div className="flex items-stretch gap-1.5 justify-end">
                  {rollHistory.slice(0, 5).map((entry, idx) => {
                    const isCritS = entry.result === 20 && entry.dice === "d20";
                    const isCritF = entry.result === 1 && entry.dice === "d20";
                    return (
                      <div
                        key={idx}
                        className={`shrink-0 flex flex-col items-center justify-center rounded-md px-2 py-1 border ${
                          isCritS
                            ? "border-[#FFD700]/60 bg-[#FFD700]/10"
                            : isCritF
                              ? "border-[#DC2626]/60 bg-[#DC2626]/10"
                              : "border-white/10 bg-black/30"
                        }`}
                        style={{ minWidth: 40 }}
                        title={entry.timestamp}
                      >
                        <span className={`font-bold text-sm leading-none ${
                          isCritS ? "text-[#FFD700]" :
                          isCritF ? "text-[#DC2626]" :
                          "text-white"
                        }`}>
                          {entry.modifier !== 0 ? entry.total : entry.result}
                        </span>
                        <span className="text-[8px] tracking-wider text-slate-400 mt-0.5">
                          {entry.dice.toUpperCase()}
                          {entry.lazy && <span className="text-amber-400 ml-0.5">·LAZY</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic mt-2 text-center">
              Or grab the dice and shake to roll
              {!allowLazyRolls && " — must shake!"}
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #37F2D1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2dd9bd;
        }
      `}</style>
    </div>
  );
});

DiceRoller.displayName = "DiceRoller";
export default DiceRoller;