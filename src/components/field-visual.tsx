"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createFieldScene } from "@/webgl/scenes/field-scene";

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerMotion = () => true;

export function FieldVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof createFieldScene> | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createFieldScene(canvas);
    sceneRef.current = scene;
    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <div className="visual-layer" role="img" aria-label="Field — PointerやTouchの位置に波紋が広がり、地形のような線が歪む作品。">
      <div className="visual-fallback" aria-hidden="true" />
      <canvas ref={canvasRef} className="visual-canvas" aria-hidden="true" />
    </div>
  );
}
