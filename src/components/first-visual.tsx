"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createLiminalScene } from "@/webgl/scenes/liminal-scene";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerMotion = () => true;

export function FirstVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof createLiminalScene> | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [available, setAvailable] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion);
  const paused = userPaused || reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = createLiminalScene(canvas, setAvailable);
    sceneRef.current = scene;
    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <>
      <div className="visual-layer" role="img" aria-label="Liminal — 暗い空間で、青白い光の輪がゆっくりと重なり、形を変える作品。">
        <div className="visual-fallback" aria-hidden="true" />
        <canvas ref={canvasRef} className="visual-canvas" aria-hidden="true" />
      </div>
      <button
        className="motion-toggle"
        type="button"
        aria-label={reducedMotion || !available ? "静止画を表示中" : "アニメーションを一時停止"}
        aria-pressed={paused || !available}
        disabled={reducedMotion || !available}
        onClick={() => setUserPaused((current) => !current)}
      >
        <span className="motion-symbol" aria-hidden="true">{paused || !available ? "▷" : "Ⅱ"}</span>
        {reducedMotion || !available ? "STILL" : userPaused ? "PLAY" : "PAUSE"}
      </button>
    </>
  );
}
