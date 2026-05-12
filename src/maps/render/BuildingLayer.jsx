/**
 * Renders every authored building. Each building gets a filled
 * polygon body at z=0.01 (so it draws over terrain tiles) plus a
 * LineSegments overlay at z=0.02 tracing the wall edges. Strategy
 * matches TerrainLayer: tear down + rebuild on any change. Diffing
 * arrives once profiling demands it.
 */

import { useEffect } from "react";
import * as THREE from "three";
import { useScene } from "../state/SceneContext";
import { useThreeScene } from "./ThreeSceneContext";
import { getWallMaterial } from "../engine/wallMaterials";

const TILE_SIZE = 28;

export default function BuildingLayer() {
  const { scene } = useScene();
  const threeScene = useThreeScene();

  useEffect(() => {
    if (!threeScene) return undefined;

    /** @type {THREE.Object3D[]} */
    const added = [];

    for (const building of scene.buildings) {
      if (!building.shape || building.shape.length < 3) continue;
      const mat = getWallMaterial(building.defaultMaterialId);

      const shape = new THREE.Shape();
      shape.moveTo(
        building.shape[0].x * TILE_SIZE,
        building.shape[0].y * TILE_SIZE
      );
      for (let i = 1; i < building.shape.length; i++) {
        shape.lineTo(
          building.shape[i].x * TILE_SIZE,
          building.shape[i].y * TILE_SIZE
        );
      }
      shape.closePath();

      const fillGeom = new THREE.ShapeGeometry(shape);
      const fillMat = new THREE.MeshBasicMaterial({ color: mat.fillColor });
      const fillMesh = new THREE.Mesh(fillGeom, fillMat);
      fillMesh.position.z = 0.01;
      threeScene.add(fillMesh);
      added.push(fillMesh);

      const edgePositions = [];
      for (const wall of building.walls) {
        edgePositions.push(wall.x1 * TILE_SIZE, wall.y1 * TILE_SIZE, 0);
        edgePositions.push(wall.x2 * TILE_SIZE, wall.y2 * TILE_SIZE, 0);
      }
      const edgeGeom = new THREE.BufferGeometry();
      edgeGeom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(edgePositions, 3)
      );
      const edgeMat = new THREE.LineBasicMaterial({ color: mat.edgeColor });
      const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
      edgeLines.position.z = 0.02;
      threeScene.add(edgeLines);
      added.push(edgeLines);
    }

    return () => {
      added.forEach((obj) => {
        threeScene.remove(obj);
        /** @type {any} */
        const disposable = obj;
        if (disposable.geometry) disposable.geometry.dispose();
        if (disposable.material) disposable.material.dispose();
      });
    };
  }, [scene.buildings, threeScene]);

  return null;
}
