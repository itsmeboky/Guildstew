import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { DEFAULT_MODEL_URLS, DEFAULT_TEXTURE_URL, DICE_TYPES } from "@/config/diceAssets";

const SITE_CONFIG_KEY = "dice_face_rotations";

const DICE_SIDES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
const TOTAL_FACES = Object.values(DICE_SIDES).reduce((a, b) => a + b, 0); // 60

const ORANGE = "#FF5300";
const NAVY_DEEP = "#0a0d1a";
const NAVY = "#1B2535";
const GREEN = "#4ade80";
const TEXT_MUTED = "#8d92a1";

const facesForType = (type) => DICE_SIDES[type] || 6;

function formatLastPublished(ts) {
  if (!ts) return "Never published";
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `Last published: ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Last published: ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Last published: ${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `Last published: ${days} day${days === 1 ? "" : "s"} ago`;
}

export default function DiceCalibrator() {
  const mountRef = useRef(null);
  const wrapperRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const loadedModelsRef = useRef({});
  const defaultTextureRef = useRef(null);

  const [diceType, setDiceType] = useState("d20");
  const [savedFaces, setSavedFaces] = useState({}); // { "d20_3": {x,y,z,w} }
  const [currentFace, setCurrentFace] = useState(1);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [lastPublished, setLastPublished] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Hydrate published calibrations from site_config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("site_config")
        .select("value, updated_at")
        .eq("key", SITE_CONFIG_KEY)
        .maybeSingle();
      if (cancelled || error || !data?.value) return;
      const flat = {};
      Object.entries(data.value).forEach(([type, rotations]) => {
        Object.entries(rotations || {}).forEach(([n, r]) => {
          flat[`${type}_${n}`] = r;
        });
      });
      setSavedFaces(flat);
      if (data.updated_at) setLastPublished(data.updated_at);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load default texture once
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(DEFAULT_TEXTURE_URL, (tex) => {
      tex.flipY = false;
      tex.needsUpdate = true;
      defaultTextureRef.current = tex;
      reskinCurrent();
    });
  }, []);

  const savedCount = useMemo(() => Object.keys(savedFaces).length, [savedFaces]);
  const savedCountForType = (type) =>
    Object.keys(savedFaces).filter((k) => k.startsWith(`${type}_`)).length;

  const maxFaces = facesForType(diceType);
  const allDoneForType = savedCountForType(diceType) >= maxFaces;

  // ---- Three.js scene init (one-time)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 580;
    const height = mount.clientHeight || 580;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(NAVY_DEEP);
    sceneRef.current = scene;

    // Top-down camera matching live system
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 13, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting matching live DiceRoller
    const ambientLight = new THREE.AmbientLight(new THREE.Color("#8B5CF6"), 0.6);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202830, 1.8);
    scene.add(hemiLight);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(new THREE.Color(ORANGE), 2.2);
    mainLight.position.set(3, 10, 4);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.22);
    fillLight.position.set(-4, 6, -3);
    scene.add(fillLight);

    scene.userData = { ambientLight, hemiLight, mainLight, fillLight };

    // ---- Drag-to-rotate using quaternion arcball pattern
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = "grabbing";
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current || !wrapperRef.current) return;
      const dx = e.clientX - previousMouseRef.current.x;
      const dy = e.clientY - previousMouseRef.current.y;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };

      const rotSpeed = 0.01;
      // Build a delta quaternion in world-space and pre-multiply.
      // Mouse-x → spin around world Y; mouse-y → tilt around world X.
      const qx = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        dy * rotSpeed,
      );
      const qy = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        dx * rotSpeed,
      );
      const delta = qy.multiply(qx);
      wrapperRef.current.quaternion.premultiply(delta);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      renderer.domElement.style.cursor = "grab";
    };

    const onWheel = (e) => {
      e.preventDefault();
      const dy = e.deltaY * 0.001 * camera.position.y * 0.1;
      camera.position.y = Math.max(5, Math.min(25, camera.position.y + dy));
      camera.lookAt(0, 0, 0);
    };

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 580;
      const h = mountRef.current.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ---- Load (or swap) the GLB whenever diceType changes
  useEffect(() => {
    if (!sceneRef.current) return;

    const mountModel = (gltf) => {
      const scene = sceneRef.current;
      if (wrapperRef.current) {
        scene.remove(wrapperRef.current);
        wrapperRef.current = null;
      }

      const root = gltf.scene;

      // 1. Scale first — sets root.scale on the model
      const initialBbox = new THREE.Box3().setFromObject(root);
      const size = initialBbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const targetSize = 3.0;
      root.scale.setScalar(targetSize / maxDim);

      // 2. Re-compute bbox AFTER scaling, then center using the NEW center
      const scaledBbox = new THREE.Box3().setFromObject(root);
      const center = scaledBbox.getCenter(new THREE.Vector3());
      root.position.sub(center);

      // 3. Wrap in Group so rotation pivots around the geometric center
      const wrapper = new THREE.Group();
      wrapper.add(root);
      scene.add(wrapper);
      wrapperRef.current = wrapper;
      reskinCurrent();
    };

    if (loadedModelsRef.current[diceType]) {
      mountModel(loadedModelsRef.current[diceType]);
      return;
    }

    setIsLoadingModel(true);
    const loader = new GLTFLoader();
    loader.load(
      DEFAULT_MODEL_URLS[diceType],
      (gltf) => {
        loadedModelsRef.current[diceType] = gltf;
        mountModel(gltf);
        setIsLoadingModel(false);
      },
      undefined,
      (err) => {
        console.error("Failed to load model", err);
        toast.error(`Failed to load ${diceType.toUpperCase()} model`);
        setIsLoadingModel(false);
      },
    );
  }, [diceType]);

  // When the dice type changes, jump to the first unsaved face for that type.
  useEffect(() => {
    const max = facesForType(diceType);
    let next = 1;
    for (let i = 1; i <= max; i++) {
      if (!savedFaces[`${diceType}_${i}`]) { next = i; break; }
      if (i === max) next = max;
    }
    setCurrentFace(next);
    if (wrapperRef.current) wrapperRef.current.quaternion.set(0, 0, 0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceType]);

  function reskinCurrent() {
    const wrapper = wrapperRef.current;
    const tex = defaultTextureRef.current;
    if (!wrapper) return;
    wrapper.traverse((child) => {
      if (!child.isMesh) return;
      child.material = new THREE.MeshStandardMaterial({
        color: tex ? 0xffffff : new THREE.Color("#1a0a2e"),
        map: tex,
        metalness: 0.3,
        roughness: 0.4,
        flatShading: true,
      });
    });
  }

  // ---- Actions
  const saveFace = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper || allDoneForType) return;
    const q = wrapper.quaternion;
    const rot = {
      x: Number(q.x.toFixed(6)),
      y: Number(q.y.toFixed(6)),
      z: Number(q.z.toFixed(6)),
      w: Number(q.w.toFixed(6)),
    };
    const key = `${diceType}_${currentFace}`;
    setSavedFaces((prev) => ({ ...prev, [key]: rot }));
    wrapper.quaternion.set(0, 0, 0, 1);

    const max = facesForType(diceType);
    let next = currentFace + 1;
    while (next <= max && savedFaces[`${diceType}_${next}`]) next++;
    if (next > max) {
      // find first remaining gap
      for (let i = 1; i <= max; i++) {
        if (i === currentFace) continue;
        if (!savedFaces[`${diceType}_${i}`]) { next = i; break; }
      }
    }
    if (next <= max) setCurrentFace(next);
  };

  const skipFace = () => {
    const max = facesForType(diceType);
    const next = currentFace >= max ? 1 : currentFace + 1;
    setCurrentFace(next);
    if (wrapperRef.current) wrapperRef.current.quaternion.set(0, 0, 0, 1);
  };

  const resetThisFace = () => {
    const key = `${diceType}_${currentFace}`;
    setSavedFaces((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const resetRotation = () => {
    if (wrapperRef.current) wrapperRef.current.quaternion.set(0, 0, 0, 1);
  };

  const selectFace = (n) => {
    setCurrentFace(n);
    if (wrapperRef.current) wrapperRef.current.quaternion.set(0, 0, 0, 1);
  };

  const publishLive = async () => {
    setIsPublishing(true);
    try {
      const bundle = {};
      DICE_TYPES.forEach((t) => { bundle[t] = {}; });
      Object.entries(savedFaces).forEach(([key, rot]) => {
        const [type, n] = key.split("_");
        if (!bundle[type]) bundle[type] = {};
        bundle[type][n] = rot;
      });

      const updatedAt = new Date().toISOString();
      const { error } = await supabase
        .from("site_config")
        .upsert(
          { key: SITE_CONFIG_KEY, value: bundle, updated_at: updatedAt },
          { onConflict: "key" },
        );
      if (error) throw error;

      setLastPublished(updatedAt);
      toast.success("Calibrations pushed live.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // ---- Render
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: `radial-gradient(circle at 50% 30%, ${NAVY} 0%, ${NAVY_DEEP} 70%)`,
        color: "#FFFFFF",
      }}
    >
      <style>{`
        @keyframes calibPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
        @keyframes calibPop {
          0%   { transform: scale(0.6); }
          60%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .calib-pulse { animation: calibPulse 1.5s ease-in-out infinite; }
        .calib-pop   { animation: calibPop 250ms ease-out; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
        {/* HEADER */}
        <header style={{ textAlign: "center" }}>
          <div style={{ color: ORANGE, fontSize: 14, marginBottom: 6 }}>◆</div>
          <h1
            style={{
              fontWeight: 900,
              letterSpacing: "0.15em",
              fontSize: "1.875rem",
              color: "#FFFFFF",
              margin: 0,
            }}
          >
            DICE CALIBRATOR
          </h1>
          <p style={{ fontSize: "0.875rem", color: TEXT_MUTED, marginTop: 8 }}>
            Drag the dice. Land the face up. Save. Repeat.
          </p>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                position: "relative",
                width: 320,
                height: 6,
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(savedCount / TOTAL_FACES) * 100}%`,
                  height: "100%",
                  background: ORANGE,
                  transition: "width 250ms ease-out",
                }}
              />
            </div>
            <span style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>
              {savedCount}/{TOTAL_FACES} calibrated
            </span>
          </div>
        </header>

        {/* DICE TYPE PILLS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            marginTop: 32,
            flexWrap: "wrap",
          }}
        >
          {DICE_TYPES.map((type) => {
            const active = type === diceType;
            const count = savedCountForType(type);
            const max = facesForType(type);
            const done = count >= max;
            return (
              <button
                key={type}
                onClick={() => setDiceType(type)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: active
                    ? `1px solid ${ORANGE}`
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active
                    ? "linear-gradient(135deg, rgba(255,83,0,0.25), rgba(255,83,0,0.08))"
                    : "rgba(255,255,255,0.04)",
                  color: active ? "#FFFFFF" : TEXT_MUTED,
                  boxShadow: active ? "0 0 20px rgba(255,83,0,0.25)" : "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  transition: "all 200ms ease",
                }}
              >
                <span style={{ color: active ? ORANGE : TEXT_MUTED, fontSize: 10 }}>◆</span>
                <span>{type}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: done ? GREEN : TEXT_MUTED,
                    fontWeight: 700,
                    marginLeft: 4,
                  }}
                >
                  {count}/{max}
                </span>
              </button>
            );
          })}
        </div>

        {/* VIEWPORT */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 32,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 580,
              aspectRatio: "1 / 1",
              borderRadius: 24,
              border: `2px solid ${ORANGE}`,
              background: NAVY_DEEP,
              overflow: "hidden",
            }}
          >
            <div
              ref={mountRef}
              style={{
                position: "absolute",
                inset: 0,
                cursor: "grab",
              }}
            />
            {/* Corner accents */}
            <CornerAccent style={{ top: 12, left: 12 }} />
            <CornerAccent style={{ top: 12, right: 12 }} flipX />
            {/* Instruction overlay */}
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: "0.75rem",
                color: "#FFFFFF",
                opacity: 0.5,
                pointerEvents: "none",
                letterSpacing: "0.05em",
              }}
            >
              {isLoadingModel ? "Loading model..." : "Drag to rotate · Scroll to zoom"}
            </div>
          </div>
        </div>

        {/* FACE PROGRESS DOTS */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
            marginTop: 24,
          }}
        >
          {Array.from({ length: maxFaces }, (_, i) => i + 1).map((n) => {
            const saved = !!savedFaces[`${diceType}_${n}`];
            const isActive = n === currentFace;
            return (
              <button
                key={n}
                onClick={() => selectFace(n)}
                title={`Face ${n}`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  background: saved ? GREEN : "transparent",
                  border: saved
                    ? `1px solid ${GREEN}`
                    : "1px solid rgba(255,255,255,0.18)",
                  color: saved ? "#0a0d1a" : TEXT_MUTED,
                  outline: isActive ? `2px solid ${ORANGE}` : "none",
                  outlineOffset: 1,
                  cursor: "pointer",
                  transition: "background 250ms ease-out, color 250ms ease-out, filter 150ms ease",
                  filter: isActive ? "brightness(1.05)" : "brightness(1)",
                }}
                className={isActive ? "calib-pulse" : saved ? "calib-pop" : ""}
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.15)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.filter = isActive ? "brightness(1.05)" : "brightness(1)")
                }
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* PRIMARY ACTION */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            marginTop: 32,
          }}
        >
          <button
            onClick={saveFace}
            disabled={allDoneForType}
            style={{
              width: 280,
              height: 56,
              borderRadius: 16,
              border: "none",
              background: allDoneForType
                ? "rgba(74,222,128,0.2)"
                : "linear-gradient(135deg, #FF5300, #ff7733)",
              color: allDoneForType ? GREEN : "#FFFFFF",
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: "1.125rem",
              textTransform: "uppercase",
              cursor: allDoneForType ? "default" : "pointer",
              boxShadow: allDoneForType ? "none" : "0 8px 24px rgba(255,83,0,0.35)",
              transition: "transform 150ms ease, box-shadow 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (allDoneForType) return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(255,83,0,0.55)";
            }}
            onMouseLeave={(e) => {
              if (allDoneForType) return;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,83,0,0.35)";
            }}
          >
            {allDoneForType ? "✓ All faces saved" : `Save Face ${currentFace}`}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: "0.8rem",
              color: TEXT_MUTED,
            }}
          >
            <SecondaryTextButton onClick={resetThisFace}>Reset this face</SecondaryTextButton>
            <span style={{ opacity: 0.4 }}>·</span>
            <SecondaryTextButton onClick={skipFace}>Skip</SecondaryTextButton>
            <span style={{ opacity: 0.4 }}>·</span>
            <SecondaryTextButton onClick={resetRotation}>Reset rotation</SecondaryTextButton>
          </div>
        </div>

        {/* FOOTER */}
        <footer
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: TEXT_MUTED }}>
            {formatLastPublished(lastPublished)}
          </div>
          <button
            onClick={publishLive}
            disabled={isPublishing}
            style={{
              height: 56,
              padding: "0 28px",
              borderRadius: 16,
              border: `2px solid ${ORANGE}`,
              background: "transparent",
              color: ORANGE,
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: "0.95rem",
              textTransform: "uppercase",
              cursor: isPublishing ? "default" : "pointer",
              transition: "background 150ms ease, color 150ms ease",
              opacity: isPublishing ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (isPublishing) return;
              e.currentTarget.style.background = ORANGE;
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              if (isPublishing) return;
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = ORANGE;
            }}
          >
            {isPublishing ? "Publishing..." : "Push Calibrations Live"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function SecondaryTextButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: TEXT_MUTED,
        cursor: "pointer",
        fontSize: "0.8rem",
        padding: "4px 6px",
        transition: "color 150ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
      onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
    >
      {children}
    </button>
  );
}

function CornerAccent({ style, flipX }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        position: "absolute",
        opacity: 0.5,
        pointerEvents: "none",
        transform: flipX ? "scaleX(-1)" : undefined,
        ...style,
      }}
    >
      <path d="M2 2 L2 14 M2 2 L14 2" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
