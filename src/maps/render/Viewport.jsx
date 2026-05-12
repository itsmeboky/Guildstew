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
const CLICK_THRESHOLD_PX = 3;

/**
 * Self-contained Three.js viewport for Forager. Owns the renderer,
 * camera, and animation loop. Holds the THREE.Scene in React state so
 * descendant layers (rendered as children) can register meshes on it
 * via ThreeSceneContext.
 *
 * Input handling distinguishes click from drag with a small pixel
 * threshold: a left-press that releases under the threshold paints a
 * grass tile at the cursor; one that moves beyond it pans the camera.
 * Right-click erases (and the browser's default context menu is
 * suppressed on the canvas).
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
     * at camera center, Y grows up. We flip Y in NDC before scaling
     * by half-view-size to get a world-space offset from the camera.
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

    let pressButton = -1;
    let pressX = 0;
    let pressY = 0;
    let lastX = 0;
    let lastY = 0;
    let panActive = false;

    function onMouseDown(e) {
      if (e.button !== 0 && e.button !== 2) return;
      pressButton = e.button;
      pressX = e.clientX;
      pressY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      panActive = false;
    }

    function onMouseMove(e) {
      // Only the left button can pan; right-button drags are ignored
      // so right-click stays a clean erase gesture.
      if (pressButton !== 0) return;
      const totalDx = e.clientX - pressX;
      const totalDy = e.clientY - pressY;
      if (!panActive && Math.hypot(totalDx, totalDy) >= CLICK_THRESHOLD_PX) {
        panActive = true;
        canvas.style.cursor = "grabbing";
      }
      if (!panActive) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const worldPerPixelX = (camera.right - camera.left) / canvasWidth;
      const worldPerPixelY = (camera.top - camera.bottom) / canvasHeight;
      camera.position.x -= dx * worldPerPixelX;
      camera.position.y += dy * worldPerPixelY;
    }

    function onMouseUp(e) {
      if (pressButton === -1) return;
      const totalDx = e.clientX - pressX;
      const totalDy = e.clientY - pressY;
      const moved = Math.hypot(totalDx, totalDy);
      if (moved < CLICK_THRESHOLD_PX) {
        const { tileX, tileY } = clientToTile(e.clientX, e.clientY);
        if (pressButton === 0) paintTile(tileX, tileY, "grass");
        else if (pressButton === 2) eraseTile(tileX, tileY);
      }
      pressButton = -1;
      panActive = false;
      canvas.style.cursor = "grab";
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
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    canvas.style.cursor = "grab";

    let animationId = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      renderer.render(threeScene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
      resizeObserver.disconnect();
      threeScene.remove(dotGrid);
      dotGrid.geometry.dispose();
      /** @type {THREE.Material} */ (dotGrid.material).dispose();
      renderer.dispose();
    };
  }, [threeScene, paintTile, eraseTile]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <ThreeSceneContext.Provider value={threeScene}>
        {children}
      </ThreeSceneContext.Provider>
    </div>
  );
}
