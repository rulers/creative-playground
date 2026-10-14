"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createWorkTransitionScene } from "@/webgl/scenes/work-transition-scene";
import { useShareInit } from "@/components/use-share-init";

export type LiminalSettings = { speed: number; density: number; palette: number };
export const LIMINAL_DEFAULT_SETTINGS: LiminalSettings = { speed: 1, density: 1, palette: 0 };

type LiminalControls = {
  settings: LiminalSettings;
  update: (patch: Partial<LiminalSettings>) => void;
  reset: () => void;
  getTime: () => number;
  getPointer: () => { x: number; y: number };
  capturePng: () => string | null;
  pulse: (level: number) => void;
};

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeToMotion = (onChange: () => void) => {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerMotion = () => true;

type TransitionContextValue = {
  progress: number;
  reducedMotion: boolean;
  paused: boolean;
  available: boolean;
  togglePaused: () => void;
  liminal: LiminalControls;
};

const TransitionContext = createContext<TransitionContextValue>({
  progress: 0,
  reducedMotion: true,
  paused: true,
  available: false,
  togglePaused: () => {},
  liminal: {
    settings: LIMINAL_DEFAULT_SETTINGS,
    update: () => {},
    reset: () => {},
    getTime: () => 0,
    getPointer: () => ({ x: 0, y: 0 }),
    capturePng: () => null,
    pulse: () => {},
  },
});

export function useTransitionProgress() {
  return useContext(TransitionContext);
}

export function TransitionProgress({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof createWorkTransitionScene> | null>(null);
  const [progress, setProgress] = useState(0);
  const init = useShareInit();
  const sharedLiminal = init.liminal;
  // Shared links open paused; a user choice always wins afterwards.
  const [pausedOverride, setPausedOverride] = useState<boolean | null>(null);
  const [settingsOverride, setSettingsOverride] = useState<LiminalSettings | null>(null);
  const [available, setAvailable] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion);
  const userPaused = pausedOverride ?? sharedLiminal !== null;
  const settings: LiminalSettings =
    settingsOverride ??
    (sharedLiminal
      ? { speed: sharedLiminal.speed, density: sharedLiminal.density, palette: sharedLiminal.palette }
      : LIMINAL_DEFAULT_SETTINGS);

  useEffect(() => {
    const canvas = canvasRef.current;
    const liminal = document.getElementById("first-visual");
    const field = document.getElementById("field-study");
    const liminalTitle = document.getElementById("liminal-title");
    const fieldTitle = document.getElementById("field-title");
    const liminalEyebrow = document.getElementById("liminal-eyebrow");
    const fieldEyebrow = document.getElementById("field-eyebrow");
    if (!canvas || !liminal || !field || !liminalTitle || !fieldTitle || !liminalEyebrow || !fieldEyebrow) return;
    const scene = createWorkTransitionScene(
      canvas,
      liminal,
      field,
      liminalTitle,
      fieldTitle,
      liminalEyebrow,
      fieldEyebrow,
      setAvailable,
    );
    sceneRef.current = scene;
    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sharedLiminal) return;
    sceneRef.current?.setLiminalTime(sharedLiminal.time);
    sceneRef.current?.setLiminalPointer(sharedLiminal.pointerX, sharedLiminal.pointerY);
  }, [sharedLiminal]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setLiminalSpeed(settings.speed);
    scene.setLiminalDensity(settings.density);
    scene.setLiminalPalette(settings.palette);
  }, [settings.speed, settings.density, settings.palette]);

  useEffect(() => {
    sceneRef.current?.setTransition(progress);
  }, [progress]);

  useEffect(() => {
    sceneRef.current?.setPaused(userPaused);
  }, [userPaused]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    const liminal = document.getElementById("first-visual");
    const aboutWork = document.getElementById("about-work");
    const field = document.getElementById("field-study");
    if (!liminal || !aboutWork || !field) return;
    const liminalSection = liminal;
    const aboutWorkSection = aboutWork;
    const fieldSection = field;

    let frame = 0;
    let start = 0;
    let end = 0;

    function measure() {
      start = liminalSection.getBoundingClientRect().top + window.scrollY;
      end = fieldSection.getBoundingClientRect().top + window.scrollY;
    }

    function update() {
      frame = 0;
      const nextProgress = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, end - start)));
      setProgress((current) => Math.abs(current - nextProgress) < 0.001 ? current : nextProgress);
    }

    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    function measureAndUpdate() {
      measure();
      scheduleUpdate();
    }

    const resizeObserver = new ResizeObserver(measureAndUpdate);
    resizeObserver.observe(liminalSection);
    resizeObserver.observe(aboutWorkSection);
    resizeObserver.observe(fieldSection);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", measureAndUpdate, { passive: true });
    measureAndUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", measureAndUpdate);
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const contextValue: TransitionContextValue = {
    progress,
    reducedMotion,
    paused: userPaused || reducedMotion,
    available,
    togglePaused: () => setPausedOverride(!userPaused),
    liminal: {
      settings,
      update: (patch) => setSettingsOverride({ ...settings, ...patch }),
      reset: () => {
        setSettingsOverride(LIMINAL_DEFAULT_SETTINGS);
        sceneRef.current?.setLiminalTime(0);
        sceneRef.current?.setLiminalPointer(0, 0);
      },
      getTime: () => sceneRef.current?.getLiminalTime() ?? 0,
      getPointer: () => sceneRef.current?.getLiminalPointer() ?? { x: 0, y: 0 },
      capturePng: () => sceneRef.current?.captureLiminalPng() ?? null,
      pulse: (level) => sceneRef.current?.pulseAudio(level),
    },
  };

  return (
    <TransitionContext.Provider value={contextValue}>
      <div className="transition-fallback" data-field={progress >= 0.5} aria-hidden="true" />
      <canvas ref={canvasRef} className="visual-canvas transition-canvas" aria-hidden="true" />
      {children}
    </TransitionContext.Provider>
  );
}
