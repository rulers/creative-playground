"use client";

import { useSyncExternalStore } from "react";
import {
  parseSearch,
  readLifeShareState,
  readLiminalShareState,
  readShareWork,
  type LifeShareState,
  type LiminalShareState,
  type ShareWorkId,
} from "@/lib/url-state";
import {
  LIFE_DEFAULT_DENSITY,
  LIFE_DEFAULT_HEIGHT,
  LIFE_DEFAULT_SEED,
  LIFE_DEFAULT_WIDTH,
} from "@/webgl/life/life-engine";

export interface ShareInit {
  work: ShareWorkId | null;
  liminal: LiminalShareState | null;
  life: LifeShareState | null;
}

const EMPTY: ShareInit = { work: null, liminal: null, life: null };
let cached: ShareInit | null = null;

/**
 * Parsed once from the initial URL and never replaced, so later history updates
 * (e.g. the copy-link fallback) cannot re-apply a snapshot over live edits.
 */
function getClientInit(): ShareInit {
  if (!cached) {
    const params = parseSearch(window.location.search);
    const work = readShareWork(params);
    cached = {
      work,
      liminal: work === "life" ? null : readLiminalShareState(params),
      life:
        work === "liminal"
          ? null
          : readLifeShareState(params, {
              seed: LIFE_DEFAULT_SEED,
              width: LIFE_DEFAULT_WIDTH,
              height: LIFE_DEFAULT_HEIGHT,
              fill: LIFE_DEFAULT_DENSITY,
            }),
    };
  }
  return cached;
}

const subscribe = () => () => {};
const getServerInit = () => EMPTY;

/** Server and hydration render defaults; the client re-renders with URL state afterwards. */
export function useShareInit(): ShareInit {
  return useSyncExternalStore(subscribe, getClientInit, getServerInit);
}

export function shareLocation() {
  return { pathname: window.location.pathname, search: window.location.search, hash: "" };
}
