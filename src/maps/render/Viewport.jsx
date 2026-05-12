import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createDotGrid } from "./dotGrid";
import { ThreeSceneContext } from "./ThreeSceneContext";
import { useScene } from "../state/SceneContext";

const TILE_SIZE = 28;
const VIEW_WIDTH_INITIAL = 800;
const VIEW_WIDTH_MIN = 100;
const VIEW_WIDTH_MAX = 5000;
const ZOOM_STEP = 0.9;
const CLEAR_COLOR = 0x0a0d1a;

/**
 * Self-contained Three.js viewport for Forager. Owns the renderer,
 * camera, and animation loop. Holds the THREE.Scene in React state so
 * descendant layers rendered as children can register meshes on it via
 * ThreeSceneContext.
 *
 * Mouse roles are unambiguous: left paints, right erases (both fire on
 * mousedown for responsiveness), middle drags to pan. Space-bar held +
 * left-drag also pans (Photoshop/Figma convention) so trackpad users
 * without a middle button still get pan-mode. The cursor reflects the
 * current role — crosshair to paint, grab while space is held, grabbing
 * while actually panning.
 */
export default function Viewport({ children }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  // Scene lives in state so children rendering before the effect runs
  // already see a stable reference through ThreeSceneContext.
  const [threeScene] = useState(() => new THREE.Scene());
  const { paintTile, eraseTile } = useScene();

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
    // Stroke painting: -1 means no stroke; 0 means left/paint, 2 means
    // right/erase. lastStrokeTile guards against re-firing on every
    // mousemove that stays within one tile.
    let strokeButton = -1;
    let lastStrokeTileX = 0;
    let lastStrokeTileY = 0;

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

    function onMouseDown(e) {
      // Middle: pan. Always preventDefault to kill autoscroll.
      if (e.button === 1) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
        return;
      }
      // Left: pan when space is held, otherwise begin a paint stroke.
      if (e.button === 0) {
        if (spaceHeld) {
          startPan(e.clientX, e.clientY);
        } else {
          const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
          paintTile(tileX, tileY, "grass");
          strokeButton = 0;
          lastStrokeTileX = tileX;
          lastStrokeTileY = tileY;
        }
        return;
      }
      // Right: begin an erase stroke. Context menu is suppressed separately.
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
      if (strokeButton === -1) return;
      const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
      if (tileX === lastStrokeTileX && tileY === lastStrokeTileY) return;
      lastStrokeTileX = tileX;
      lastStrokeTileY = tileY;
      if (strokeButton === 0) paintTile(tileX, tileY, "grass");
      else if (strokeButton === 2) eraseTile(tileX, tileY);
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
      if (e.code !== "Space") return;
      if (isTypingTarget()) return;
      // Stop the page from scrolling on space.
      e.preventDefault();
      if (spaceHeld) return;
      spaceHeld = true;
      updateCursor();
    }

    function onKeyUp(e) {
      if (e.code !== "Space") return;
      if (!spaceHeld) return;
      spaceHeld = false;
      // If a space+left pan was in progress, end it on space-release too.
      // The user can re-press space and re-click to pan again.
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
    // Mousemove/up on document so middle-drag keeps tracking even when
    // the cursor leaves the canvas mid-pan.
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
      threeScene.remove(dotGrid);
      dotGrid.geometry.dispose();
      /** @type {THREE.Material} */ (dotGrid.material).dispose();
      renderer.dispose();
    };
  }, [threeScene, paintTile, eraseTile]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full select-none" />
      <ThreeSceneContext.Provider value={threeScene}>
        {children}
      </ThreeSceneContext.Provider>
    </div>
  );
}
