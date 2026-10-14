"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  createGenerativeAudio,
  isAudioSupported,
  type GenerativeAudioHandle,
} from "@/webgl/audio/generative-audio";

type Options = {
  autonomous: boolean;
  /** Section whose visibility scopes the sound: it stops when the work scrolls away. */
  sectionId: string;
  onNote?: (intensity: number) => void;
};

const subscribe = () => () => {};

export function useGenerativeAudio({ autonomous, sectionId, onNote }: Options) {
  const supported = useSyncExternalStore(subscribe, isAudioSupported, () => true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<GenerativeAudioHandle | null>(null);
  const onNoteRef = useRef(onNote);

  useEffect(() => {
    onNoteRef.current = onNote;
  });

  useEffect(() => {
    const handle = createGenerativeAudio({
      autonomous,
      onNote: (intensity) => onNoteRef.current?.(intensity),
      onStateChange: setPlaying,
    });
    handleRef.current = handle;
    const section = document.getElementById(sectionId);
    const observer = section
      ? new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) handle.stop();
        })
      : null;
    if (section) observer?.observe(section);
    return () => {
      observer?.disconnect();
      handle.dispose();
      handleRef.current = null;
    };
  }, [autonomous, sectionId]);

  const toggle = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return;
    if (handle.isPlaying()) {
      handle.stop();
      return;
    }
    setError(null);
    const started = await handle.start();
    if (!started && !handle.isPlaying()) setError("Sound could not start.");
  }, []);

  const trigger = useCallback((intensity: number) => {
    handleRef.current?.trigger(intensity);
  }, []);

  return { supported, playing, error, toggle, trigger };
}
