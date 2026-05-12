import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createDotGrid } from "./dotGrid";

const VIEW_WIDTH_INITIAL = 800;
const VIEW_WIDTH_MIN = 100;
const VIEW_WIDTH_MAX = 5000;
const ZOOM_STEP = 0.9;
const CLEAR_COLOR = 0x0a0d1a;

/**
 * Self-contained Three.js viewport for Forager. Owns the renderer,
 * scene, orthographic camera, and animation loop. Handles pan (left
 * mouse drag), zoom (wheel), and parent-resize. The canvas fills the
 * positioned ancestor it's mounted into; ForagerHome provides the box.
 *
 * Future render layers (terrain, buildings, NPCs) will need access to
 * the scene — we'll expose it via ref or context in Phase 3. Phase 2
 * just renders the dot-grid background.
 */
export default function Viewport() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    let viewWidth = VIEW_WIDTH_INITIAL;
    let canvasWidth = container.clientWidth || 1;
    let canvasHeight = container.clientHeight || 1;

    const scene = new THREE.Scene();

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
    scene.add(dotGrid);

    function updateCameraProjection() {
      const aspectNow = canvasWidth / canvasHeight;
      const viewHeightNow = viewWidth / aspectNow;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeightNow / 2;
      camera.bottom = -viewHeightNow / 2;
      camera.updateProjectionMatrix();
    }

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    function onMouseDown(e) {
      if (e.button !== 0) return;
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    }
    function onMouseMove(e) {
      if (!isPanning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const worldPerPixelX = (camera.right - camera.left) / canvasWidth;
      const worldPerPixelY = (camera.top - camera.bottom) / canvasHeight;
      // drag right -> camera moves left so world-content stays under cursor.
      // pixel Y grows downward, world Y grows upward — flip the sign.
      camera.position.x -= dx * worldPerPixelX;
      camera.position.y += dy * worldPerPixelY;
    }
    function onMouseUp() {
      if (!isPanning) return;
      isPanning = false;
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

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    canvas.style.cursor = "grab";

    let animationId = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      resizeObserver.disconnect();
      scene.traverse((obj) => {
        // Object3D itself has no geometry/material — those live on
        // Mesh/Points/Line subclasses. Duck-type the dispose walk so
        // future layers (any disposable child) clean up automatically.
        /** @type {any} */
        const disposable = obj;
        if (disposable.geometry) disposable.geometry.dispose();
        if (disposable.material) {
          if (Array.isArray(disposable.material)) {
            disposable.material.forEach((m) => m.dispose());
          } else {
            disposable.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
