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
    color: 0x2a3441,
    metalness: 0.3,
    roughness: 0.4,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

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
      }
    });
  }, []);
  
  // Keep latest callback in ref to avoid re-init of scene
  const onRollCompleteRef = useRef(onRollComplete);
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  useImperativeHandle(ref, () => ({
    roll: handleRoll
  }));

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
    // Use container dimensions if available, otherwise fallback (though full screen logic should handle this via resize normally, simplified here for immediate render)
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    // Scale camera distance based on container size to keep dice visual size constant
    const baseSize = 300;
    const scale = Math.max(width, height) / baseSize;
    const distance = 3 * scale;
    
    camera.position.set(distance, distance, distance);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    const pColor = new THREE.Color(primaryColor);
    const sColor = new THREE.Color(secondaryColor);

    // Lights - Adjusted for Tint and Proximity
    // Ambient light for base color tint
    const ambientLight = new THREE.AmbientLight(sColor, 2.0); 
    scene.add(ambientLight);

    // Hemisphere light for gradient
    const hemiLight = new THREE.HemisphereLight(pColor, sColor, 1.5);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    // Point lights CLOSER to the dice for intense local color
    const ringRadius = 2.5; // Closer
    const numLights = 6;
    const ringLights = [];
    for (let i = 0; i < numLights; i++) {
      const angle = (i / numLights) * Math.PI * 2;
      const lightColor = i % 2 === 0 ? pColor : sColor;
      
      const pointLight = new THREE.PointLight(lightColor, 5.0, 10); // Less intensity, closer decay
      pointLight.position.set(
        Math.cos(angle) * ringRadius,
        2, // Lower height
        Math.sin(angle) * ringRadius
      );
      scene.add(pointLight);
      ringLights.push(pointLight);
    }

    // Soft directional light for definition
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
    keyLight.position.set(5, 10, 5);
    scene.add(keyLight);

    // Store lights
    scene.userData = { ambientLight, hemiLight, keyLight, ringLights };

    const bottomFill = new THREE.PointLight(0xffffff, 1.5, 20);
    bottomFill.position.set(0, -3, 0);
    scene.add(bottomFill);

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

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const diceMesh = diceRef.current;
      if (!renderer || !camera || !scene) return;

      const roll = rollDataRef.current;
      if (rollingRef.current && roll && diceMesh) {
        const now = performance.now();
        const elapsed = now - roll.startTime;
        const t = Math.min(1, elapsed / roll.duration);
        const k = easeOutCubic(t);

        // spin progress
        const spinProgress =
          t < 0.7
            ? t / 0.7
            : 0.7 +
              ((k - easeOutCubic(0.7)) * 0.3) / (1 - easeOutCubic(0.7));
        const normalizedSpin = Math.min(1, spinProgress);

        const x = THREE.MathUtils.lerp(
          roll.startRot.x,
          roll.endRot.x,
          normalizedSpin
        );
        const y = THREE.MathUtils.lerp(
          roll.startRot.y,
          roll.endRot.y,
          normalizedSpin
        );
        const z = THREE.MathUtils.lerp(
          roll.startRot.z,
          roll.endRot.z,
          normalizedSpin
        );
        diceMesh.rotation.set(x, y, z);

        const angle = 2 * Math.PI * roll.orbitTurns * t;
        const radius = roll.maxRadius * (1 - t);
        const posX = radius * Math.cos(angle);
        const posZ = radius * Math.sin(angle);
        const posY = Math.sin(t * Math.PI) * 0.15;

        diceMesh.position.set(posX, posY, posZ);

        if (t >= 1) {
          rollingRef.current = false;
          diceMesh.position.set(0, 0, 0);
          const finalRollValue = rollDataRef.current?.rollValue;
          rollDataRef.current = null;
          setIsRolling(false);
          
          // Handle Crit Effects
          let pType = "default";
          if (selectedDice === "d20") {
            if (finalRollValue === 20) {
              pType = "crit-success";
              playCritSuccessSound();
            } else if (finalRollValue === 1) {
              pType = "crit-fail";
              playCritFailSound();
            }
          }
          setParticleType(pType);
          
          setShowParticles(true);
          // All animations last 1 second
          const duration = 1000;
          setTimeout(() => setShowParticles(false), duration);
          
          if (onRollCompleteRef.current && typeof finalRollValue === "number") {
            onRollCompleteRef.current(finalRollValue);
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    isInitializedRef.current = true;

    return () => {
      window.removeEventListener('resize', handleResize);
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

  // Update lights when colors change. If the player has a Tavern
  // dice skin applied, its lighting colors win over the prop-passed
  // `primaryColor` / `secondaryColor` so the skin drives the look.
  useEffect(() => {
    if (!sceneRef.current?.userData) return;
    const skin = activeSkin || null;
    const pColor = new THREE.Color(skin?.primaryLight || primaryColor);
    const sColor = new THREE.Color(skin?.secondaryLight || secondaryColor);
    const { ambientLight, hemiLight, keyLight, ringLights } = sceneRef.current.userData;
    if (ambientLight) ambientLight.color.set(sColor);
    if (hemiLight) {
      hemiLight.color.set(pColor);
      hemiLight.groundColor.set(sColor);
    }
    if (keyLight) keyLight.color.set(pColor);
    if (ringLights) {
      ringLights.forEach((light, i) => {
        light.color.set(i % 2 === 0 ? pColor : sColor);
      });
    }
  }, [primaryColor, secondaryColor, activeSkin]);

  // Re-skin the current die whenever the active Tavern dice skin
  // changes (e.g. player applies a new skin from My Collection
  // without closing the roller).
  useEffect(() => {
    if (!diceRef.current) return;
    applyDiceSkinToMesh(diceRef.current, activeSkin || STOCK_SKIN, {
      defaultTexture: defaultTextureRef.current,
      textureCache: textureCacheRef.current,
    });
  }, [activeSkin]);

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
          color: 0x2a3441,
          metalness: 0.3,
          roughness: 0.4,
          flatShading: true,
        });
        mesh = new THREE.Mesh(geometry, material);
      }
    }

    diceRef.current = mesh;
    scene.add(mesh);

    // Re-skin with the active Tavern skin (or stock defaults). Must
    // run after scene.add so the traversal hits the cloned meshes,
    // not the original.
    applyDiceSkinToMesh(mesh, activeSkinRef.current || STOCK_SKIN, {
      defaultTexture: defaultTextureRef.current,
      textureCache: textureCacheRef.current,
    });
  };

  const handleRoll = () => {
    if (!diceRef.current || isRolling) return;
    const diceType = selectedDice;
    const sides = DICE_SIDES[diceType] || 20;
    
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
      const startRot = diceMesh.rotation.clone();

      const spinX = 4 + Math.floor(Math.random() * 4);
      const spinY = 4 + Math.floor(Math.random() * 4);
      const spinZ = 2 + Math.floor(Math.random() * 3);

      const endRot = new THREE.Euler(
        safeSnap.x + Math.PI * 2 * spinX,
        safeSnap.y + Math.PI * 2 * spinY,
        safeSnap.z + Math.PI * 2 * spinZ
      );

      rollDataRef.current = {
      startTime: performance.now(),
      duration: 1000, // Synced with average sound duration
      startRot,
      endRot,
      orbitTurns: 1 + Math.random() * 1,
      maxRadius: 12.0, // Keep wide area
      rollValue: roll,
      };
      rollingRef.current = true;
      
      playRollSound();
    }

    const total = roll + modifier;
    setLastRoll({ roll, total });

    if (!embedded) {
      setRollHistory((prev) => [
        {
          result: roll,
          timestamp: new Date().toLocaleTimeString(),
          dice: selectedDice,
          modifier,
          total,
        },
        ...prev,
      ].slice(0, 10));
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
          onClick={!isRolling ? handleRoll : undefined}
        />
        {showParticles && <Particles type={particleType} />}
      </div>
    );
  }

  // Modal mode
  return (
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
          </div>

          <div className="relative flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">

            {/* 3D Dice Display */}
            <div
              className="relative flex justify-center items-center overflow-visible shrink-0 bg-black/20 rounded-2xl border border-white/5"
              style={{ minHeight: "400px" }}
            >
              <div
                ref={containerRef}
                className="cursor-pointer overflow-visible"
                style={{ width: 400, height: 400 }}
                onClick={!isRolling ? handleRoll : undefined}
              />
              {showParticles && <Particles type={particleType} />}

              {lastRoll && !isRolling && modifier !== 0 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full font-bold text-xs bg-[#37F2D1] text-[#1E2430] shadow-lg whitespace-nowrap border border-white/20">
                  TOTAL: {lastRoll.total}
                </div>
              )}
            </div>

            {/* Rolled Number */}
            {lastRoll && !isRolling && (
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

            {/* Instruction */}
            <div className="text-center">
              <div className="inline-block px-6 py-2 border-2 border-[#FF5722] rounded-lg">
                <span className="text-[#FF5722] font-semibold tracking-wide">
                  {isRolling ? "ROLLING..." : "Click dice to roll"}
                </span>
              </div>
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
                          <span className="text-white font-bold">
                             {entry.result}
                          </span>
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
    </div>
  );
});

DiceRoller.displayName = "DiceRoller";
export default DiceRoller;