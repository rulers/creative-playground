// Client-safe URL state helpers for sharing a reproducible snapshot of a work.
// All reads are bounds-checked and malformed/missing values silently fall back
// to safe defaults; nothing here can throw or trigger unbounded work.

export const SHARE_WORK_PARAM = "work";

export type ShareWorkId = "liminal" | "life";

export interface LiminalShareState {
  speed: number;
  density: number;
  palette: number;
  /** Animation phase in seconds; shared links open paused at this time. */
  time: number;
  /** Rendered pointer offset (-1..1) driving the Liminal parallax. */
  pointerX: number;
  pointerY: number;
}

export interface LifeShareState {
  seed: number;
  width: number;
  height: number;
  fill: number;
  generation: number;
  cells: string | null;
}

export const LIMINAL_SPEED_MIN = 0.1;
export const LIMINAL_SPEED_MAX = 2.5;
export const LIMINAL_DENSITY_MIN = 0.4;
export const LIMINAL_DENSITY_MAX = 2.2;
export const LIMINAL_PALETTE_COUNT = 3;
export const LIMINAL_TIME_MAX = 100_000;
export const LIMINAL_DEFAULTS: LiminalShareState = {
  speed: 1,
  density: 1,
  palette: 0,
  time: 0,
  pointerX: 0,
  pointerY: 0,
};

export const LIFE_URL_SIZE_MIN = 8;
export const LIFE_URL_SIZE_MAX = 96;
export const LIFE_URL_FILL_MIN = 0.05;
export const LIFE_URL_FILL_MAX = 0.6;
export const LIFE_URL_GENERATION_MAX = 100_000;
export const LIFE_URL_SEED_MAX = 0xffffffff;
// 96 * 96 cells = 1152 bytes = 1536 unpadded base64 characters.
export const LIFE_URL_CELLS_MAX_CHARS = 1536;
export const SEARCH_MAX_LENGTH = 8192;

const LIMINAL_KEYS = ["speed", "density", "palette", "t", "px", "py"];
const LIFE_KEYS = ["seed", "w", "h", "fill", "gen", "cells"];

/** Strict decimal parser: rejects empty, hex, exponent, Infinity and very long inputs. */
function parseDecimal(raw: string | null): number | null {
  if (raw === null || !/^-?\d{1,12}(\.\d{1,6})?$/.test(raw)) return null;
  return Number(raw);
}

function clampNumber(raw: string | null, min: number, max: number, fallback: number): number {
  const value = parseDecimal(raw);
  if (value === null) return fallback;
  return Math.min(max, Math.max(min, value));
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  return Math.round(clampNumber(raw, min, max, fallback));
}

/** Safe wrapper: never throws and ignores absurdly long query strings. */
export function parseSearch(search: string): URLSearchParams {
  if (typeof search !== "string" || search.length > SEARCH_MAX_LENGTH) return new URLSearchParams();
  try {
    return new URLSearchParams(search);
  } catch {
    return new URLSearchParams();
  }
}

export function readShareWork(params: URLSearchParams): ShareWorkId | null {
  const value = params.get(SHARE_WORK_PARAM);
  return value === "liminal" || value === "life" ? value : null;
}

/** Returns null when no liminal params are present (so callers keep defaults). */
export function readLiminalShareState(
  params: URLSearchParams,
  defaults: LiminalShareState = LIMINAL_DEFAULTS,
): LiminalShareState | null {
  if (!LIMINAL_KEYS.some((key) => params.has(key))) return null;
  return {
    speed: clampNumber(params.get("speed"), LIMINAL_SPEED_MIN, LIMINAL_SPEED_MAX, defaults.speed),
    density: clampNumber(params.get("density"), LIMINAL_DENSITY_MIN, LIMINAL_DENSITY_MAX, defaults.density),
    palette: clampInt(params.get("palette"), 0, LIMINAL_PALETTE_COUNT - 1, defaults.palette),
    time: clampNumber(params.get("t"), 0, LIMINAL_TIME_MAX, defaults.time),
    pointerX: clampNumber(params.get("px"), -1, 1, defaults.pointerX),
    pointerY: clampNumber(params.get("py"), -1, 1, defaults.pointerY),
  };
}

export function readLifeShareState(
  params: URLSearchParams,
  defaults: { seed: number; width: number; height: number; fill: number },
): LifeShareState | null {
  if (!LIFE_KEYS.some((key) => params.has(key))) return null;
  const cellsRaw = params.get("cells");
  const cells =
    cellsRaw !== null && cellsRaw.length <= LIFE_URL_CELLS_MAX_CHARS && /^[A-Za-z0-9+/]+$/.test(cellsRaw)
      ? cellsRaw
      : null;
  return {
    seed: clampInt(params.get("seed"), 0, LIFE_URL_SEED_MAX, defaults.seed),
    width: clampInt(params.get("w"), LIFE_URL_SIZE_MIN, LIFE_URL_SIZE_MAX, defaults.width),
    height: clampInt(params.get("h"), LIFE_URL_SIZE_MIN, LIFE_URL_SIZE_MAX, defaults.height),
    fill: clampNumber(params.get("fill"), LIFE_URL_FILL_MIN, LIFE_URL_FILL_MAX, defaults.fill),
    generation: clampInt(params.get("gen"), 0, LIFE_URL_GENERATION_MAX, 0),
    cells,
  };
}

/** Query updates for a Liminal share link (removes the other work's keys). */
export function liminalShareUpdates(state: LiminalShareState): Record<string, string | undefined> {
  const updates: Record<string, string | undefined> = { [SHARE_WORK_PARAM]: "liminal" };
  for (const key of LIFE_KEYS) updates[key] = undefined;
  updates.speed = state.speed.toFixed(2);
  updates.density = state.density.toFixed(2);
  updates.palette = String(Math.round(state.palette));
  updates.t = state.time.toFixed(2);
  updates.px = state.pointerX.toFixed(3);
  updates.py = state.pointerY.toFixed(3);
  return updates;
}

/** Query updates for a Life share link (removes the other work's keys). */
export function lifeShareUpdates(state: LifeShareState & { cells: string }): Record<string, string | undefined> {
  const updates: Record<string, string | undefined> = { [SHARE_WORK_PARAM]: "life" };
  for (const key of LIMINAL_KEYS) updates[key] = undefined;
  updates.seed = String(state.seed);
  updates.w = String(state.width);
  updates.h = String(state.height);
  updates.fill = state.fill.toFixed(2);
  updates.gen = String(state.generation);
  updates.cells = state.cells;
  return updates;
}

/**
 * Builds a shareable URL by merging `updates` into the current location,
 * preserving the path (and basePath, since it's part of pathname) and any
 * unrelated existing query parameters. `updates[key] = undefined` removes it.
 */
export function buildShareUrl(
  location: { pathname: string; search: string; hash: string },
  updates: Record<string, string | undefined>,
): string {
  const params = parseSearch(location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}
