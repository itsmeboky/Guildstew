import * as THREE from "three";

/**
 * Rebuild a dice mesh's material from the active skin's file_data.
 *
 * Called after the GLB model is cloned and positioned. Traverses the
 * mesh and replaces every MeshStandardMaterial with one built from
 * the skin's color / metalness / roughness / (optional) glow. If a
 * custom texture URL is present on the skin we load it and apply as
 * material.map on every child mesh — one shared texture wraps all
 * die shapes.
 *
 * `textureCache` is a Map owned by the caller so we don't re-fetch
 * the same texture across roll → re-skin cycles.
 */
export function applyDiceSkinToMesh(mesh, skin, { defaultTexture = null, textureCache } = {}) {
  if (!mesh || !skin) return;

  const baseColor = new THREE.Color(skin.baseColor || "#1a0a2e");
  const emissive = skin.glowEnabled
    ? new THREE.Color(skin.glowColor || "#37F2D1")
    : new THREE.Color(0x000000);

  const materialMap = resolveTexture(skin.customTextureUrl, textureCache) || defaultTexture || null;

  mesh.traverse((child) => {
    if (!child.isMesh) return;
    child.material = new THREE.MeshStandardMaterial({
      color: skin.customTextureUrl ? 0xffffff : baseColor,
      map: materialMap,
      metalness: clamp01(skin.metalness ?? 0.3),
      roughness: clamp01(skin.roughness ?? 0.4),
      emissive,
      emissiveIntensity: skin.glowEnabled ? 0.6 : 0,
      flatShading: true,
    });
  });
}

/**
 * Update scene lighting to match the skin's light colors. Reads the
 * known light refs the DiceRoller stashes on sceneRef.userData.
 */
export function applyDiceSkinLighting(scene, skin) {
  if (!scene?.userData || !skin) return;
  const { ambientLight, hemiLight, keyLight, ringLights } = scene.userData;
  const pColor = new THREE.Color(skin.primaryLight || "#37F2D1");
  const sColor = new THREE.Color(skin.secondaryLight || "#8B5CF6");
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
}

function resolveTexture(url, cache) {
  if (!url) return null;
  if (cache?.has(url)) return cache.get(url);
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url, (tex) => {
    tex.flipY = false;
    tex.needsUpdate = true;
  });
  texture.flipY = false;
  if (cache) cache.set(url, texture);
  return texture;
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
