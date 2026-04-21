import React, { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Dice Skin live preview.
 *
 * Slowly-spinning die rendered with the current skin settings
 * applied. Intentionally separated from the DiceRoller to avoid
 * dragging in all the physics / roll-history state. Runs its own
 * Three.js scene in a fixed-size canvas; the parent passes the
 * effective skin data + selected die type and we rebuild / re-skin
 * the mesh whenever either changes.
 *
 * `ref.captureDataUrl()` grabs a PNG of the canvas so Step 4 can use
 * the current pose as the Tavern listing's preview image.
 */
const DiceSkinPreview = forwardRef(function DiceSkinPreview(
  { skin, diceType = "d20", modelUrls, defaultTextureUrl },
  ref,
) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const lightRefs = useRef({ primary: null, secondary: null });
  const animRef = useRef(null);
  const loadedGlbs = useRef({});
  const defaultTextureRef = useRef(null);
  const customTextureRef = useRef(null);

  useImperativeHandle(ref, () => ({
    captureDataUrl() {
      const renderer = rendererRef.current;
      if (!renderer) return null;
      return renderer.domElement.toDataURL("image/png");
    },
  }), []);

  // Scene init — one-time.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const width = el.clientWidth || 280;
    const height = el.clientHeight || 280;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050816);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    el.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);

    const primary = new THREE.PointLight(0xffffff, 1.2, 20);
    primary.position.set(3, 3, 4);
    scene.add(primary);

    const secondary = new THREE.PointLight(0xffffff, 0.8, 20);
    secondary.position.set(-3, -2, 4);
    scene.add(secondary);

    lightRefs.current = { primary, secondary };
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const animate = () => {
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.01;
        meshRef.current.rotation.x += 0.003;
      }
      renderer.render(scene, camera);
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  // Load GLB + default texture lazily, keyed by diceType.
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const url = modelUrls?.[diceType];
    if (!url) return;

    const setMesh = (root) => {
      if (meshRef.current) {
        scene.remove(meshRef.current);
      }
      const model = root.clone();
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      model.scale.setScalar(2 / maxDim);
      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      meshRef.current = model;
      scene.add(model);
      applySkinToMesh();
    };

    if (loadedGlbs.current[diceType]) {
      setMesh(loadedGlbs.current[diceType].scene);
      return;
    }

    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      loadedGlbs.current[diceType] = gltf;
      setMesh(gltf.scene);
    }, undefined, () => {
      // GLB failed — render an icosahedron so the preview still works.
      const geom = new THREE.IcosahedronGeometry(1.3);
      const mat = new THREE.MeshStandardMaterial({ color: 0x2a3441, flatShading: true });
      const mesh = new THREE.Mesh(geom, mat);
      if (meshRef.current) scene.remove(meshRef.current);
      meshRef.current = mesh;
      scene.add(mesh);
      applySkinToMesh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceType, modelUrls]);

  // Load default texture once (shared by all dice).
  useEffect(() => {
    if (!defaultTextureUrl) return;
    const tl = new THREE.TextureLoader();
    tl.load(defaultTextureUrl, (tex) => {
      tex.flipY = false;
      defaultTextureRef.current = tex;
      applySkinToMesh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTextureUrl]);

  // Swap in the custom texture whenever the URL changes.
  useEffect(() => {
    if (!skin?.customTextureUrl) {
      customTextureRef.current = null;
      applySkinToMesh();
      return;
    }
    const tl = new THREE.TextureLoader();
    tl.load(skin.customTextureUrl, (tex) => {
      tex.flipY = false;
      customTextureRef.current = tex;
      applySkinToMesh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skin?.customTextureUrl]);

  // Re-skin on any material / color / light / glow change.
  useEffect(() => {
    applySkinToMesh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    skin?.baseColor,
    skin?.numberColor,
    skin?.edgeColor,
    skin?.metalness,
    skin?.roughness,
    skin?.primaryLight,
    skin?.secondaryLight,
    skin?.glowEnabled,
    skin?.glowColor,
  ]);

  function applySkinToMesh() {
    const mesh = meshRef.current;
    if (!mesh || !skin) return;

    const materialMap = customTextureRef.current || defaultTextureRef.current || null;

    const baseColor = new THREE.Color(skin.baseColor || "#1a0a2e");
    const emissive = skin.glowEnabled
      ? new THREE.Color(skin.glowColor || "#37F2D1")
      : new THREE.Color(0x000000);

    mesh.traverse((child) => {
      if (!child.isMesh) return;
      const mat = new THREE.MeshStandardMaterial({
        color: skin.customTextureUrl ? 0xffffff : baseColor,
        map: materialMap,
        metalness: clamp01(skin.metalness ?? 0.3),
        roughness: clamp01(skin.roughness ?? 0.4),
        emissive,
        emissiveIntensity: skin.glowEnabled ? 0.6 : 0,
        flatShading: true,
      });
      child.material = mat;
    });

    const { primary, secondary } = lightRefs.current;
    if (primary) primary.color.set(skin.primaryLight || "#37F2D1");
    if (secondary) secondary.color.set(skin.secondaryLight || "#8B5CF6");
  }

  return (
    <div
      ref={containerRef}
      className="w-full aspect-square bg-[#050816] rounded-lg border border-slate-700 overflow-hidden"
    />
  );
});

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export default DiceSkinPreview;
