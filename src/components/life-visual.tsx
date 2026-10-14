"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTransitionProgress } from "@/components/transition-progress";
import { shareLocation, useShareInit } from "@/components/use-share-init";
import { useGenerativeAudio } from "@/components/use-generative-audio";
import { downloadDataUrlPng } from "@/lib/canvas-capture";
import { buildShareUrl, lifeShareUpdates } from "@/lib/url-state";
import { LIFE_MAX_SEED } from "@/webgl/life/life-engine";
import { createLifeScene, type LifeScene } from "@/webgl/scenes/life-scene";

let canvas2dSupported: boolean | null = null;
function hasCanvas2d() {
  canvas2dSupported ??= document.createElement("canvas").getContext("2d") !== null;
  return canvas2dSupported;
}
const subscribe = () => () => {};

export function LifeVisual({ children }: { children?: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<LifeScene | null>(null);
  const { reducedMotion } = useTransitionProgress();
  const sharedLife = useShareInit().life;
  const [pausedOverride, setPausedOverride] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
  const graphicsAvailable = useSyncExternalStore(subscribe, hasCanvas2d, () => true);
  // Shared links open paused; reduced motion never auto-advances (STEP stays available).
  const paused = reducedMotion || (pausedOverride ?? sharedLife !== null);

  const audio = useGenerativeAudio({
    autonomous: false,
    sectionId: "life-study",
    onNote: (intensity) => sceneRef.current?.pulse(intensity),
  });
  const { trigger } = audio;

  useEffect(() => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;
    const scene = createLifeScene(canvas, board, {
      onGeneration: ({ generation, alive, activity }) => {
        if (counterRef.current) counterRef.current.textContent = `GEN ${generation} · ${alive} ALIVE`;
        trigger(activity);
      },
    });
    sceneRef.current = scene;
    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [trigger]);

  useEffect(() => {
    if (sharedLife) sceneRef.current?.load(sharedLife);
  }, [sharedLife]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  function step() {
    setPausedOverride(true);
    sceneRef.current?.step();
  }

  function reset() {
    sceneRef.current?.reset();
    setStatus("Reset to the generation-0 pattern of the current seed.");
  }

  function reseed() {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.reseed(1 + Math.floor(Math.random() * (LIFE_MAX_SEED - 1)));
    setStatus(`New seed ${scene.getSnapshot().seed}.`);
  }

  function savePng() {
    const scene = sceneRef.current;
    const snapshot = scene?.getSnapshot();
    if (!scene || !snapshot) {
      setStatus("Could not capture the image: graphics are unavailable.");
      return;
    }
    const filename = `creative-playground-life-seed${snapshot.seed}-gen${snapshot.generation}.png`;
    if (downloadDataUrlPng(scene.capturePng(), filename)) {
      setStatus(
        `Saved ${filename} (Life · ${snapshot.width}×${snapshot.height} · seed ${snapshot.seed} · generation ${snapshot.generation})`,
      );
    } else {
      setStatus("Could not capture the image: graphics are unavailable.");
    }
  }

  async function copyLink() {
    const snapshot = sceneRef.current?.getSnapshot();
    if (!snapshot) {
      setStatus("Nothing to share: the board is unavailable.");
      return;
    }
    const path = buildShareUrl(shareLocation(), lifeShareUpdates(snapshot));
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied. It opens paused at this exact generation, with sound off.");
    } catch {
      window.history.replaceState(null, "", url);
      setStatus("Copy was blocked. The shareable link is now in the address bar.");
    }
  }

  return (
    <>
      <div className="life-board" ref={boardRef}>
        <canvas
          ref={canvasRef}
          className="life-canvas"
          tabIndex={0}
          role="application"
          aria-label="Game of Life board. Click or touch to paint cells. With the keyboard, use arrow keys to move and Space to toggle a cell."
        />
        {!graphicsAvailable && <p className="exp-status">Canvas is unavailable in this browser.</p>}
      </div>
      <div className="life-footer">
        {children}
        <div className="life-controls">
          <p className="life-counter" aria-live="off">
            <span ref={counterRef}>GEN 0</span>
          </p>
          <div className="exp-actions">
            <button
              className="exp-button"
              type="button"
              aria-pressed={!paused}
              disabled={reducedMotion || !graphicsAvailable}
              onClick={() => setPausedOverride(!paused)}
            >
              {reducedMotion ? "STILL" : paused ? "PLAY" : "PAUSE"}
            </button>
            <button className="exp-button" type="button" disabled={!graphicsAvailable} onClick={step}>STEP</button>
            <button className="exp-button" type="button" disabled={!graphicsAvailable} onClick={reset}>RESET</button>
            <button className="exp-button" type="button" disabled={!graphicsAvailable} onClick={reseed}>RESEED</button>
            <button
              className="exp-button"
              type="button"
              aria-pressed={audio.playing}
              disabled={!audio.supported}
              onClick={audio.toggle}
            >
              {audio.supported ? (audio.playing ? "SOUND ON" : "SOUND OFF") : "NO AUDIO"}
            </button>
            <button className="exp-button" type="button" disabled={!graphicsAvailable} onClick={savePng}>SAVE PNG</button>
            <button className="exp-button" type="button" disabled={!graphicsAvailable} onClick={copyLink}>COPY LINK</button>
          </div>
          <p className="exp-status" role="status">{audio.error ?? status}</p>
        </div>
      </div>
    </>
  );
}
