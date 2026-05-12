/**
 * Renders every painted tile in the scene as a colored quad on the
 * z=0 plane. Subscribes to the SceneContext and rebuilds its meshes
 * whenever the tile list changes.
 *
 * First-pass strategy: tear everything down and rebuild on any tile
 * change. Simple, correct, and fine for the tile counts a single
 * authoring session produces. A future optimization can diff the
 * tile list and only touch what moved, but only after profiling says
 * it matters.
 */

import { useEffect } from "react";
import * as THREE from "three";
import { useScene } from "../state/SceneContext";
import { useThreeScene } from "./ThreeSceneContext";
import { getMaterial } from "../engine/terrainMaterials";

const TILE_SIZE = 28;

export default function TerrainLayer() {
  const { scene } = useScene();
  const threeScene = useThreeScene();

  useEffect(() => {
    if (!threeScene) return undefined;

    /** @type {THREE.Mesh[]} */
    const meshes = scene.tiles.map((tile) => {
      const mat = getMaterial(tile.materialId);
      const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const material = new THREE.MeshBasicMaterial({ color: mat.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        tile.position.x * TILE_SIZE,
        tile.position.y * TILE_SIZE,
        0
      );
      threeScene.add(mesh);
      return mesh;
    });

    return () => {
      meshes.forEach((mesh) => {
        threeScene.remove(mesh);
        mesh.geometry.dispose();
        /** @type {THREE.Material} */
        (mesh.material).dispose();
      });
    };
  }, [scene.tiles, threeScene]);

  return null;
}
