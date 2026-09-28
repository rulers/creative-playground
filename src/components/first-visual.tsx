"use client";

import { useTransitionProgress } from "@/components/transition-progress";

export function FirstVisual() {
  const { reducedMotion, paused, available, togglePaused } = useTransitionProgress();

  return (
    <>
      <span className="visually-hidden" role="img" aria-label="Liminal — 暗い空間で、青白い光の輪がゆっくりと重なり、形を変える作品。" />
      <button
        className="motion-toggle"
        type="button"
        aria-label={reducedMotion || !available ? "静止画を表示中" : "アニメーションを一時停止"}
        aria-pressed={paused || !available}
        disabled={reducedMotion || !available}
        onClick={togglePaused}
      >
        <span className="motion-symbol" aria-hidden="true">{paused || !available ? "▷" : "Ⅱ"}</span>
        {reducedMotion || !available ? "STILL" : paused ? "PLAY" : "PAUSE"}
      </button>
    </>
  );
}
