import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { X } from "lucide-react";
import * as THREE from "three";
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

// Probability that any given roll "cocks" (lands wedged so two faces
// share the upward-facing claim). Tighter dice cock less often;
// chunkier dice (d20, d100) cock more.
const COCK_CHANCE = {
  d4: 0.005, d6: 0.01, d8: 0.02, d10: 0.03,
  d12: 0.04, d20: 0.05, d100: 0.05,
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

const RevealOverlay = ({ value, color }) => {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const animate = () => {
      const t = Math.min((performance.now() - start) / 600, 1);
      const easeT = t < 0.4
        ? easeOutBack(t / 0.4) * 1.3
        : 1.3 - (1.3 - 1) * easeOutCubic((t - 0.4) / 0.6);
      setScale(easeT);
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
      <div style={{
        transform: `scale(${scale})`,
        color,
        fontFamily: "'Cream', 'Cinzel', serif",
        fontSize: 120,
        fontWeight: 900,
        lineHeight: 1,
        textShadow: `0 0 40px ${color}, 0 0 80px ${color}66, 0 4px 20px rgba(0,0,0,0.6)`,
        filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.5))",
      }}>
        {value}
      </div>
    </div>
  );
};

// Phase 1: chicken slides left → right. Phase 2: gold "COCKED!" text
// fades in at top center with a scale-bounce, then pulses.
const CockedAnimation = () => {
  const [phase, setPhase] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setPhase(2), 1100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-[70] overflow-hidden">
      <style>{`
        @keyframes chickenRun {
          0%   { left: -10vw; transform: translateY(0) rotate(-6deg); }
          25%  { transform: translateY(-30px) rotate(4deg); }
          50%  { transform: translateY(0) rotate(-4deg); }
          75%  { transform: translateY(-22px) rotate(6deg); }
          100% { left: 110vw; transform: translateY(0) rotate(-2deg); }
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
            fontSize: 96,
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
            top: "12vh",
            left: "50%",
            color: "#FFD700",
            fontFamily: "'Cream', 'Cinzel', serif",
            fontWeight: 900,
            fontSize: "min(14vw, 160px)",
            letterSpacing: "0.08em",
            textShadow: "0 0 30px #FFD700, 0 0 60px #FFA500, 0 6px 18px rgba(0,0,0,0.55)",
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
// flips pink and the copy nudges the player to try again.
const LameAnimation = ({ rejected = false }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[70] flex items-start justify-center">
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
          marginTop: "14vh",
          fontStyle: "italic",
          fontFamily: "'Cream', 'Cinzel', serif",
          fontWeight: 700,
          fontSize: "min(9vw, 96px)",
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
    // Modal mode renders the canvas fullscreen (the modal content
    // sits on top, with a "landing zone" placeholder where the dice
    // used to live). Embedded mode keeps using its host container's
    // dimensions so it can sit inline (e.g. CombatDiceWindow).
    const fullscreen = !embedded;
    const width = fullscreen ? window.innerWidth : (container.clientWidth || 300);
    const height = fullscreen ? window.innerHeight : (container.clientHeight || 300);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    let camera;
    if (fullscreen) {
      // Wider FOV + closer camera shrinks the resting dice and
      // softens the perspective compression during the arc, so the
      // dice doesn't dramatically shrink as it leaves center.
      camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
      camera.position.set(5, 5, 5);
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
    if (fullscreen) {
      // The fullscreen canvas has pointer-events:none so clicks pass
      // straight through to the modal beneath it. We pick up dice
      // grabs at the window level via raycasting (see the pointer
      // event block below) and only intercept when the ray actually
      // hits the dice mesh.
      renderer.domElement.style.pointerEvents = "none";
      renderer.domElement.style.display = "block";
    }
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!camera || !renderer) return;
      const newWidth = fullscreen ? window.innerWidth : container.clientWidth;
      const newHeight = fullscreen ? window.innerHeight : container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

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
          const scaleBoost = 1 + 0.08 * Math.sin(t * Math.PI);
          diceMesh.scale.setScalar(scaleBoost);
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
          diceMesh.scale.setScalar(1);
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
          diceMesh.scale.setScalar(1);

          const finalValue = roll.rollValue;
          const wasCocked = !!roll.willCock;
          const wasLazy = !!roll.lazy;
          const lazyAllowed = roll.lazyAllowed !== false;
          const rollMod = roll.modifier ?? 0;
          rollDataRef.current = null;
          setIsRolling(false);

          // Cocked: chicken + sound, no result counted, no history,
          // no onRollComplete. Player must roll again.
          if (wasCocked) {
            setIsCocked(true);
            setShowCockedAnim(true);
            const sound = new Audio(
              COCKED_SOUNDS[Math.floor(Math.random() * COCKED_SOUNDS.length)]
            );
            sound.volume = 0.85;
            sound.play().catch(() => {});
            setTimeout(() => setShowCockedAnim(false), 2400);
            return;
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
              setRevealAnim({ value: finalValue, color: "#94a3b8" });
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

          setRevealAnim({ value: finalValue, color: revealColor });
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

    // Mouse pickup + shake-to-roll. Only wired for the fullscreen
    // (modal) canvas; embedded mode keeps its simple click-to-roll.
    // We listen at the window level because the canvas is
    // pointer-events:none — we raycast on pointerdown and only
    // intercept (preventDefault, capture, etc.) when the ray hits
    // the dice mesh.
    let detachPointer = () => {};
    if (fullscreen) {
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
          document.body.style.cursor = "";
          return;
        }
        document.body.style.cursor = hitsDice(e.clientX, e.clientY) ? "grab" : "";
      };

      const onPointerDown = (e) => {
        if (rollingRef.current || isCockedRef.current) return;
        if (!hitsDice(e.clientX, e.clientY)) return;
        // Hit the dice — start dragging and prevent the click from
        // bubbling to anything underneath (e.g. modal close button).
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
        document.body.style.cursor = "grabbing";
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
        document.body.style.cursor = "";
        const lazy = drag.accumulatedShake <= 250;
        // Hand the dice's current world position to handleRoll so
        // the roll animation begins where the player let go.
        const dice = diceRef.current;
        const startPos = dice
          ? { x: dice.position.x, y: dice.position.y, z: dice.position.z }
          : null;
        if (handleRollRef.current) {
          handleRollRef.current({ lazy, startPos });
        }
      };

      // pointerdown gets `capture: true` so we can intercept clicks
      // that would otherwise hit modal buttons before they fire.
      window.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      detachPointer = () => {
        window.removeEventListener("pointerdown", onPointerDown, true);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        document.body.style.cursor = "";
      };
    }

    isInitializedRef.current = true;

    return () => {
      window.removeEventListener('resize', handleResize);
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

  const createDice = (diceType) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (diceRef.current) {
      scene.remove(diceRef.current);
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
  };

  const handleRoll = (opts = {}) => {
    if (!diceRef.current || isRolling) return;
    const lazy = !!opts.lazy;
    const startPos = opts.startPos || null; // optional world-space throw start
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

    const customFaceMap = customFaceRotationsRef.current[selectedDice];
    const defaultFaceMap = FACE_ROTATIONS[selectedDice];
    const faceMap = customFaceMap || defaultFaceMap;
    const customSnap = customFaceMap?.[roll];
    const defaultSnap = defaultFaceMap?.[roll];
    const snap = customSnap
      ? { x: customSnap.x, y: customSnap.y, z: customSnap.z }
      : defaultSnap;

    if (diceRef.current) {
      setIsRolling(true);
      const diceMesh = diceRef.current;

      // Fallback for snap if missing
      const safeSnap = snap || {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2
      };

      const isCrit = selectedDice === "d20" && (roll === 20 || roll === 1);

      // Probability check for cocked outcome. Forced rolls (calibration)
      // never cock — calibrators want a clean snap to the requested face.
      // Lazy rolls cock 5x more often (capped at 50%).
      const baseCockChance = COCK_CHANCE[selectedDice] ?? 0;
      const cockChance = lazy ? Math.min(0.5, baseCockChance * 5) : baseCockChance;
      const willCock = forcedResult === null && Math.random() < cockChance;

      const anticipationDuration = lazy ? 80 : 280;
      const tumbleDuration = lazy ? 700 : (isCrit ? 900 : 800);
      const settleDuration = lazy ? 250 : (isCrit ? 600 : 350); // Crits get slow-mo settle for drama

      const startRot = {
        x: diceMesh.rotation.x,
        y: diceMesh.rotation.y,
        z: diceMesh.rotation.z,
      };

      const spinX = 3 + Math.floor(Math.random() * 3);
      const spinY = 3 + Math.floor(Math.random() * 3);
      const spinZ = 1 + Math.floor(Math.random() * 2);

      // Cocked rolls land tilted ~30° on X and Z so the dice visually
      // wedges between two faces instead of snapping flat.
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

      setRevealAnim(null); // Clear previous reveal
    }
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

  // Modal mode
  return (
    <>
      {/* Fullscreen canvas — sits above the modal so dice can fly
          across the whole screen. The wrapper is pointer-events:none
          so the modal underneath stays clickable; the canvas itself
          flips pointer-events back on so the dice can be grabbed. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <div
          ref={containerRef}
          data-dice-canvas
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative max-w-lg w-full">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-[#FF5722] hover:bg-[#FF6B3D] transition-colors flex items-center justify-center text-white z-10 shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Frame */}
        <div className="relative bg-[#1E2430] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col h-[800px] max-h-[90vh] w-[500px]">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
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

          <div className="relative flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">

            {/* 3D Dice Display — landing-zone placeholder. The actual
                canvas is the fullscreen layer above the modal; this
                dotted circle marks the area where the dice lands. */}
            <div
              className="relative flex justify-center items-center overflow-visible shrink-0 bg-black/20 rounded-2xl border border-white/5"
              style={{ minHeight: "400px" }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 220,
                  height: 220,
                  border: "2px dashed rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.18em",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                LANDING
              </div>
              {showParticles && <Particles type={particleType} />}
              {revealAnim && !isRolling && !isCocked && <RevealOverlay value={revealAnim.value} color={revealAnim.color} />}

              {lastRoll && !isRolling && !isCocked && modifier !== 0 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full font-bold text-xs bg-[#37F2D1] text-[#1E2430] shadow-lg whitespace-nowrap border border-white/20">
                  TOTAL: {lastRoll.total}
                </div>
              )}
            </div>

            {/* Rolled Number */}
            {lastRoll && !isRolling && !isCocked && (
              <div className="text-center">
                <span className="text-6xl font-bold text-white">
                  {lastRoll.roll}
                </span>
                {modifier !== 0 && (
                  <span className="text-3xl text-gray-400 ml-2">
                    {modifier > 0 ? "+" : ""}
                    {modifier} = {lastRoll.total}
                  </span>
                )}
              </div>
            )}

            {/* Instruction / ROLL button */}
            <div className="text-center flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={!isRolling ? () => handleRoll() : undefined}
                disabled={isRolling}
                className={`inline-block px-6 py-2 border-2 rounded-lg font-semibold tracking-wide transition-colors ${
                  isCocked
                    ? "border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10"
                    : "border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722]/10"
                } ${isRolling ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                {isRolling ? "ROLLING..." : isCocked ? "ROLL AGAIN" : "ROLL"}
              </button>
              <p className="text-[11px] text-slate-400 italic">
                {allowLazyRolls
                  ? "Or grab the dice and shake to roll"
                  : "Or grab the dice and shake to roll — must shake!"}
              </p>
            </div>

            {/* Controls: dice, modifier */}
            <div className="grid grid-cols-2 gap-4 shrink-0">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block tracking-wider">DICE TYPE</label>
                <select
                  value={selectedDice}
                  onChange={(e) => setSelectedDice(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-semibold focus:border-[#37F2D1] transition-colors outline-none appearance-none cursor-pointer hover:bg-black/40"
                >
                  {diceTypes.map((dice) => (
                    <option key={dice.name} value={dice.name}>
                      {dice.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block tracking-wider">
                  MODIFIER
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={modifier}
                    onChange={(e) =>
                      setModifier(parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-center text-white font-semibold focus:border-[#37F2D1] transition-colors outline-none"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">+</span>
                </div>
              </div>
            </div>

            {/* History */}
            {rollHistory.length > 0 && (
              <div className="flex flex-col min-h-0 flex-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-[10px] font-bold text-slate-500 tracking-wider">
                    RECENT ROLLS
                  </h3>
                  <button
                    onClick={() => setRollHistory([])}
                    className="text-[10px] text-slate-500 hover:text-[#FF5722] transition-colors"
                  >
                    CLEAR
                  </button>
                </div>
                <div className="bg-black/20 rounded-lg p-2 overflow-y-auto custom-scrollbar border border-white/5 flex-1 min-h-[100px]">
                  <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
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
                  <div className="space-y-1">
                    {rollHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 rounded hover:bg-white/5 transition-colors"
                      >
                        <span className="text-xs text-gray-500 font-mono">
                          {entry.timestamp}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#37F2D1] font-bold text-xs bg-[#37F2D1]/10 px-1.5 py-0.5 rounded">
                            {entry.dice.toUpperCase()}
                          </span>
                          <span className={`font-bold ${
                            entry.result === 20 && entry.dice === "d20" ? "text-[#FFD700]" :
                            entry.result === 1 && entry.dice === "d20" ? "text-[#DC2626]" :
                            "text-white"
                          }`}>
                            {entry.result}
                          </span>
                          {entry.lazy && (
                            <span className="text-amber-400 font-bold text-[10px] bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded tracking-wider">
                              LAZY
                            </span>
                          )}
                          {entry.modifier !== 0 && (
                            <>
                              <span className="text-gray-500 text-xs">
                                ({entry.modifier > 0 ? "+" : ""}
                                {entry.modifier})
                              </span>
                              <span className="text-white font-bold text-xs bg-white/10 px-1.5 py-0.5 rounded">
                                = {entry.total}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showCockedAnim && <CockedAnimation />}
      {lameAnim && <LameAnimation rejected={lameAnim.rejected} />}
    </div>
    </>
  );
});

DiceRoller.displayName = "DiceRoller";
export default DiceRoller;