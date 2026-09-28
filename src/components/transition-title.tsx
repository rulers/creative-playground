"use client";

import { useTransitionProgress } from "@/components/transition-progress";
import type { ReactNode } from "react";

type TransitionTitleProps = {
  id: string;
  children: string;
};

type TransitionEyebrowProps = {
  id: string;
  children: ReactNode;
};

function useTextureVisibility() {
  const { progress, reducedMotion, available } = useTransitionProgress();
  return available && !reducedMotion && progress > 0.01 && progress < 0.99;
}

export function TransitionEyebrow({ id, children }: TransitionEyebrowProps) {
  const textureActive = useTextureVisibility();

  return (
    <p id={id} className="eyebrow" style={{ opacity: textureActive ? 0 : 1 }}>
      {children}
    </p>
  );
}

export function TransitionTitle({ id, children }: TransitionTitleProps) {
  const textureActive = useTextureVisibility();

  return (
    <h2 id={id} style={{ opacity: textureActive ? 0 : 1 }}>
      {children}
    </h2>
  );
}
