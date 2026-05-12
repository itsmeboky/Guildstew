import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createDotGrid } from "./dotGrid";
import { ThreeSceneContext } from "./ThreeSceneContext";
import { useScene } from "../state/SceneContext";
import { useTools } from "../state/ToolContext";

const TILE_SIZE = 28;
const VIEW_WIDTH_INITIAL = 800;
const VIEW_WIDTH_MIN = 100;
const VIEW_WIDTH_MAX = 5000;
const ZOOM_STEP = 0.9;
const CLEAR_COLOR = 0x0a0d1a;

const PREVIEW_COLOR = 0xff5300;
const PREVIEW_DOT_PX = 8;

/**
 * Self-contained Three.js viewport for Forager. Owns the renderer,
 * camera, and animation loop. Holds the THREE.Scene in React state so
 * descendant layers rendered as children can register meshes on it via
 * ThreeSceneContext.
 *
 * Input dispatch is tool-aware. Terrain mode: left paints, right
 * erases, both with stroke-on-drag. Building mode: left places a
 * corner (double-click or Enter finishes the polygon), right undoes
 * the last corner, Escape cancels the in-progress shape. Middle-mouse
 * and Space+left-drag pan in either mode. The cursor stays "crosshair"
 * by default, "grab" while space is held, "grabbing" during a pan.
 */
export default function Viewport({ children }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  // Scene lives in state so children rendering before the effect runs
  // already see a stable reference through ThreeSceneContext.
  const [threeScene] = useState(() => new THREE.Scene());
  const { paintTile, eraseTile, addBuilding } = useScene();
  const { activeTool, activeMaterialId } = useTools();
  // Tool + material mirrored into refs so the long-lived mousedown/move
  // closures captured by the main effect always see the latest values
  // without re-running (and tearing down the renderer) on every change.
  const activeMaterialIdRef = useRef(activeMaterialId);
  const activeToolRef = useRef(activeTool);
  // A bridge for the activeTool-change effect to reach helpers defined
  // inside the main effect (preview rebuild, in-progress polygon reset).
  const onToolChangeRef = useRef(() => {});

  useEffect(() => {
    activeMaterialIdRef.current = activeMaterialId;
  }, [activeMaterialId]);

  useEffect(() => {
    activeToolRef.current = activeTool;
    onToolChangeRef.current();
  }, [activeTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    let viewWidth = VIEW_WIDTH_INITIAL;
    let canvasWidth = container.clientWidth || 1;
    let canvasHeight = container.clientHeight || 1;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvasWidth, canvasHeight, false);
    renderer.setClearColor(CLEAR_COLOR, 1);

    const aspect = canvasWidth / canvasHeight;
    const viewHeight = viewWidth / aspect;
    const camera = new THREE.OrthographicCamera(
      -viewWidth / 2,
      viewWidth / 2,
      viewHeight / 2,
      -viewHeight / 2,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    const dotGrid = createDotGrid();
    threeScene.add(dotGrid);

    function updateCameraProjection() {
      const aspectNow = canvasWidth / canvasHeight;
      const viewHeightNow = viewWidth / aspectNow;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeightNow / 2;
      camera.bottom = -viewHeightNow / 2;
      camera.updateProjectionMatrix();
    }

    /**
     * Convert a clientX/Y pixel coordinate to a (tileX, tileY) pair.
     * Pixel space: origin top-left, Y grows down. World space: origin
     * at camera center, Y grows up. Flip Y in NDC before scaling by
     * half-view-size to get a world-space offset from the camera.
     */
    function clientToTile(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const ndcX = (px / rect.width) * 2 - 1;
      const ndcY = -((py / rect.height) * 2 - 1);
      const halfW = (camera.right - camera.left) / 2;
      const halfH = (camera.top - camera.bottom) / 2;
      const worldX = camera.position.x + ndcX * halfW;
      const worldY = camera.position.y + ndcY * halfH;
      return {
        tileX: Math.floor(worldX / TILE_SIZE),
        tileY: Math.floor(worldY / TILE_SIZE),
      };
    }

    // ── input state ────────────────────────────────────────────────
    let spaceHeld = false;
    let panActive = false;
    let panLastX = 0;
    let panLastY = 0;
    // Terrain stroke: -1 idle, 0 left/paint, 2 right/erase. lastStrokeTile
    // skips re-firing on every move that stays within one tile.
    let strokeButton = -1;
    let lastStrokeTileX = 0;
    let lastStrokeTileY = 0;
    // Building tool: in-progress polygon corners + tile-snapped cursor.
    /** @type {{x: number, y: number}[]} */
    let buildingCorners = [];
    let cursorTileX = 0;
    let cursorTileY = 0;
    let cursorTracked = false;

    // ── preview group (building corners + line to cursor) ──────────
    const previewGroup = new THREE.Group();
    previewGroup.position.z = 0.05;
    threeScene.add(previewGroup);

    function clearPreviewGroup() {
      while (previewGroup.children.length > 0) {
        const child = previewGroup.children[0];
        previewGroup.remove(child);
        /** @type {any} */
        const disposable = child;
        if (disposable.geometry) disposable.geometry.dispose();
        if (disposable.material) disposable.material.dispose();
      }
    }

    function rebuildBuildingPreview() {
      clearPreviewGroup();
      if (activeToolRef.current !== "building") return;
      if (buildingCorners.length === 0) return;

      const dotPositions = [];
      for (const c of buildingCorners) {
        dotPositions.push(c.x * TILE_SIZE, c.y * TILE_SIZE, 0);
      }
      const dotGeom = new THREE.BufferGeometry();
      dotGeom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(dotPositions, 3)
      );
      const dotMat = new THREE.PointsMaterial({
        color: PREVIEW_COLOR,
        size: PREVIEW_DOT_PX,
        sizeAttenuation: false,
      });
      previewGroup.add(new THREE.Points(dotGeom, dotMat));

      const linePts = buildingCorners.map(
        (c) => new THREE.Vector3(c.x * TILE_SIZE, c.y * TILE_SIZE, 0)
      );
      if (cursorTracked) {
        linePts.push(
          new THREE.Vector3(
            cursorTileX * TILE_SIZE,
            cursorTileY * TILE_SIZE,
            0
          )
        );
      }
      if (linePts.length >= 2) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
        const lineMat = new THREE.LineBasicMaterial({ color: PREVIEW_COLOR });
        previewGroup.add(new THREE.Line(lineGeom, lineMat));
      }
    }

    // Tool changes reach in via this ref. When leaving building mode
    // mid-draw, drop the in-progress corners so re-entering doesn't
    // resume a forgotten polygon.
    onToolChangeRef.current = () => {
      if (activeToolRef.current !== "building") {
        buildingCorners = [];
      }
      rebuildBuildingPreview();
    };

    function updateCursor() {
      if (panActive) canvas.style.cursor = "grabbing";
      else if (spaceHeld) canvas.style.cursor = "grab";
      else canvas.style.cursor = "crosshair";
    }

    /** True when keyboard focus is in a text input, textarea, or contenteditable. */
    function isTypingTarget() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
      }
      return el instanceof HTMLElement && el.isContentEditable;
    }

    function startPan(clientX, clientY) {
      panActive = true;
      panLastX = clientX;
      panLastY = clientY;
      updateCursor();
    }

    function finishBuilding() {
      if (buildingCorners.length < 3) return;
      addBuilding(buildingCorners);
      buildingCorners = [];
      rebuildBuildingPreview();
    }

    function onMouseDown(e) {
      // Middle: pan in either tool. preventDefault kills autoscroll.
      if (e.button === 1) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
        return;
      }
      // Space+left also pans regardless of active tool.
      if (e.button === 0 && spaceHeld) {
        startPan(e.clientX, e.clientY);
        return;
      }

      if (activeToolRef.current === "building") {
        if (e.button === 0) {
          // Browsers report consecutive clicks via e.detail. The
          // second mousedown of a double-click arrives with detail===2
          // — treat it as "finish" and skip placing another corner.
          if (e.detail >= 2) {
            finishBuilding();
            return;
          }
          const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
          buildingCorners = [...buildingCorners, { x: tileX, y: tileY }];
          rebuildBuildingPreview();
          return;
        }
        if (e.button === 2) {
          if (buildingCorners.length > 0) {
            buildingCorners = buildingCorners.slice(0, -1);
            rebuildBuildingPreview();
          }
          return;
        }
        return;
      }

      // Terrain tool.
      if (e.button === 0) {
        const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
        paintTile(tileX, tileY, activeMaterialIdRef.current);
        strokeButton = 0;
        lastStrokeTileX = tileX;
        lastStrokeTileY = tileY;
        return;
      }
      if (e.button === 2) {
        const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
        eraseTile(tileX, tileY);
        strokeButton = 2;
        lastStrokeTileX = tileX;
        lastStrokeTileY = tileY;
      }
    }

    function onMouseMove(e) {
      if (panActive) {
        const dx = e.clientX - panLastX;
        const dy = e.clientY - panLastY;
        panLastX = e.clientX;
        panLastY = e.clientY;
        const worldPerPixelX = (camera.right - camera.left) / canvasWidth;
        const worldPerPixelY = (camera.top - camera.bottom) / canvasHeight;
        camera.position.x -= dx * worldPerPixelX;
        camera.position.y += dy * worldPerPixelY;
        return;
      }

      if (activeToolRef.current === "building") {
        const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
        if (
          !cursorTracked ||
          tileX !== cursorTileX ||
          tileY !== cursorTileY
        ) {
          cursorTileX = tileX;
          cursorTileY = tileY;
          cursorTracked = true;
          if (buildingCorners.length > 0) rebuildBuildingPreview();
        }
        return;
      }

      if (strokeButton === -1) return;
      const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
      if (tileX === lastStrokeTileX && tileY === lastStrokeTileY) return;
      lastStrokeTileX = tileX;
      lastStrokeTileY = tileY;
      if (strokeButton === 0) {
        paintTile(tileX, tileY, activeMaterialIdRef.current);
      } else if (strokeButton === 2) {
        eraseTile(tileX, tileY);
      }
    }

    function onMouseUp(e) {
      if (panActive && (e.button === 0 || e.button === 1)) {
        panActive = false;
        updateCursor();
      }
      if (strokeButton !== -1 && e.button === strokeButton) {
        strokeButton = -1;
      }
    }

    function onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      viewWidth = Math.max(
        VIEW_WIDTH_MIN,
        Math.min(VIEW_WIDTH_MAX, viewWidth * factor)
      );
      updateCameraProjection();
    }

    function onContextMenu(e) {
      e.preventDefault();
    }

    function onKeyDown(e) {
      if (isTypingTarget()) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (spaceHeld) return;
        spaceHeld = true;
        updateCursor();
        return;
      }
      if (activeToolRef.current !== "building") return;
      if (e.code === "Enter") {
        e.preventDefault();
        finishBuilding();
      } else if (e.code === "Escape") {
        e.preventDefault();
        if (buildingCorners.length > 0) {
          buildingCorners = [];
          rebuildBuildingPreview();
        }
      }
    }

    function onKeyUp(e) {
      if (e.code !== "Space") return;
      if (!spaceHeld) return;
      spaceHeld = false;
      if (panActive) panActive = false;
      updateCursor();
    }

    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === canvasWidth && h === canvasHeight) return;
      canvasWidth = w || 1;
      canvasHeight = h || 1;
      renderer.setSize(canvasWidth, canvasHeight, false);
      updateCameraProjection();
    }

    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    updateCursor();

    let animationId = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      renderer.render(threeScene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      resizeObserver.disconnect();
      clearPreviewGroup();
      threeScene.remove(previewGroup);
      threeScene.remove(dotGrid);
      dotGrid.geometry.dispose();
      /** @type {THREE.Material} */ (dotGrid.material).dispose();
      renderer.dispose();
      onToolChangeRef.current = () => {};
    };
  }, [threeScene, paintTile, eraseTile, addBuilding]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full select-none" />
      <ThreeSceneContext.Provider value={threeScene}>
        {children}
      </ThreeSceneContext.Provider>
    </div>
  );
}
