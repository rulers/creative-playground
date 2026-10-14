// Pure, deterministic Conway's Game of Life simulation.
// No DOM / rendering concerns live here so the rules can be unit tested in isolation.

export const LIFE_MIN_SIZE = 8;
export const LIFE_MAX_SIZE = 96;
export const LIFE_DEFAULT_WIDTH = 48;
export const LIFE_DEFAULT_HEIGHT = 32;
export const LIFE_MIN_DENSITY = 0.05;
export const LIFE_MAX_DENSITY = 0.6;
export const LIFE_DEFAULT_DENSITY = 0.28;
export const LIFE_MIN_SEED = 0;
export const LIFE_MAX_SEED = 0xffffffff;

export type Cell = 0 | 1;

export interface LifeGrid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
}

/** Clamp a grid dimension to the bounded simulation size. */
export function clampGridSize(value: number): number {
  if (!Number.isFinite(value)) return LIFE_DEFAULT_WIDTH;
  return Math.min(LIFE_MAX_SIZE, Math.max(LIFE_MIN_SIZE, Math.round(value)));
}

export function clampDensity(value: number): number {
  if (!Number.isFinite(value)) return LIFE_DEFAULT_DENSITY;
  return Math.min(LIFE_MAX_DENSITY, Math.max(LIFE_MIN_DENSITY, value));
}

export function clampSeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const normalized = Math.floor(Math.abs(value)) % (LIFE_MAX_SEED + 1);
  return normalized === 0 ? 1 : normalized;
}

export function createEmptyGrid(width: number, height: number): LifeGrid {
  const w = clampGridSize(width);
  const h = clampGridSize(height);
  return { width: w, height: h, cells: new Uint8Array(w * h) };
}

export function cloneGrid(grid: LifeGrid): LifeGrid {
  return { width: grid.width, height: grid.height, cells: grid.cells.slice() };
}

function wrapIndex(value: number, size: number): number {
  const m = value % size;
  return m < 0 ? m + size : m;
}

export function getCell(grid: LifeGrid, x: number, y: number): Cell {
  const wx = wrapIndex(x, grid.width);
  const wy = wrapIndex(y, grid.height);
  return (grid.cells[wy * grid.width + wx] ? 1 : 0) as Cell;
}

/** Returns a new grid with the given cell set. The input grid is not mutated. */
export function setCell(grid: LifeGrid, x: number, y: number, value: Cell): LifeGrid {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return grid;
  const next = cloneGrid(grid);
  next.cells[y * grid.width + x] = value;
  return next;
}

export function toggleCell(grid: LifeGrid, x: number, y: number): LifeGrid {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return grid;
  const current = grid.cells[y * grid.width + x];
  return setCell(grid, x, y, current ? 0 : 1);
}

/** Alive-neighbor count. The grid wraps at the edges (toroidal topology). */
export function countNeighbors(grid: LifeGrid, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      count += getCell(grid, x + dx, y + dy);
    }
  }
  return count;
}

export function countAlive(grid: LifeGrid): number {
  let total = 0;
  for (let i = 0; i < grid.cells.length; i++) total += grid.cells[i];
  return total;
}

/** Advances the grid by exactly one generation using the standard B3/S23 rule. */
export function step(grid: LifeGrid): LifeGrid {
  const next = createEmptyGrid(grid.width, grid.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const alive = getCell(grid, x, y) === 1;
      const neighbors = countNeighbors(grid, x, y);
      const survives = alive && (neighbors === 2 || neighbors === 3);
      const born = !alive && neighbors === 3;
      next.cells[y * grid.width + x] = survives || born ? 1 : 0;
    }
  }
  return next;
}

/** Deterministic PRNG (mulberry32) so a given seed always reproduces the same field. */
export function createSeededRng(seed: number): () => number {
  let state = clampSeed(seed) >>> 0;
  return function rng() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds a deterministic random grid: same width/height/seed/density always produce the same cells. */
export function seededRandomGrid(width: number, height: number, seed: number, density: number): LifeGrid {
  const grid = createEmptyGrid(width, height);
  const rng = createSeededRng(seed);
  const d = clampDensity(density);
  for (let i = 0; i < grid.cells.length; i++) {
    grid.cells[i] = rng() < d ? 1 : 0;
  }
  return grid;
}

function stampPattern(grid: LifeGrid, pattern: number[][], originX: number, originY: number): LifeGrid {
  const next = cloneGrid(grid);
  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (!pattern[row][col]) continue;
      const x = wrapIndex(originX + col, next.width);
      const y = wrapIndex(originY + row, next.height);
      next.cells[y * next.width + x] = 1;
    }
  }
  return next;
}

/** Fixed, well-known patterns used for both tests and the "reset" control. */
export const LIFE_PATTERNS = {
  blinker: [
    [1, 1, 1],
  ],
  block: [
    [1, 1],
    [1, 1],
  ],
  glider: [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
  ],
};

export function stampCenteredPattern(
  width: number,
  height: number,
  pattern: number[][],
): LifeGrid {
  const grid = createEmptyGrid(width, height);
  const originX = Math.floor(grid.width / 2 - pattern[0].length / 2);
  const originY = Math.floor(grid.height / 2 - pattern.length / 2);
  return stampPattern(grid, pattern, originX, originY);
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Isomorphic (browser + Node) base64 encode of packed 1-bit-per-cell data, for compact URL sharing. */
export function encodeGrid(grid: LifeGrid): string {
  const bitCount = grid.cells.length;
  const byteCount = Math.ceil(bitCount / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < bitCount; i++) {
    if (grid.cells[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    const triple = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);
    output += BASE64_CHARS[(triple >> 18) & 0x3f];
    output += BASE64_CHARS[(triple >> 12) & 0x3f];
    output += b1 === undefined ? "" : BASE64_CHARS[(triple >> 6) & 0x3f];
    output += b2 === undefined ? "" : BASE64_CHARS[triple & 0x3f];
  }
  return output;
}

/**
 * Returns null (rather than throwing) for malformed input so callers can safely fall back to defaults.
 * The encoded length must match the grid exactly: truncated or oversized snapshots are rejected.
 */
export function decodeGrid(encoded: string, width: number, height: number): LifeGrid | null {
  if (typeof encoded !== "string") return null;
  const w = clampGridSize(width);
  const h = clampGridSize(height);
  const bitCount = w * h;
  const byteCount = Math.ceil(bitCount / 8);
  const remainder = byteCount % 3;
  const expectedChars = Math.floor(byteCount / 3) * 4 + (remainder === 0 ? 0 : remainder + 1);
  if (encoded.length !== expectedChars) return null;
  if (!/^[A-Za-z0-9+/]+$/.test(encoded)) return null;

  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i += 4) {
    const chars = encoded.slice(i, i + 4);
    const v = [0, 0, 0, 0];
    for (let j = 0; j < chars.length; j++) v[j] = BASE64_CHARS.indexOf(chars[j]);
    const triple = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
    bytes.push((triple >> 16) & 0xff);
    if (chars.length > 2) bytes.push((triple >> 8) & 0xff);
    if (chars.length > 3) bytes.push(triple & 0xff);
  }
  if (bytes.length !== byteCount) return null;
  const usedBits = bitCount & 7;
  if (usedBits !== 0 && bytes[byteCount - 1] >> usedBits !== 0) return null;

  const grid = createEmptyGrid(w, h);
  for (let i = 0; i < bitCount; i++) {
    grid.cells[i] = bytes[i >> 3] & (1 << (i & 7)) ? 1 : 0;
  }
  return grid;
}

export const LIFE_DEFAULT_SEED = 2026;
export const LIFE_MAX_GENERATION = 100_000;

export interface LifeRestoreInput {
  seed: number;
  width: number;
  height: number;
  fill: number;
  generation: number;
  cells: string | null;
}

export interface LifeState {
  grid: LifeGrid;
  seed: number;
  fill: number;
  generation: number;
}

/** Builds the generation-0 state for a seed. */
export function createLifeState(seed: number, width: number, height: number, fill: number): LifeState {
  const safeSeed = clampSeed(seed);
  const safeFill = clampDensity(fill);
  return { grid: seededRandomGrid(width, height, safeSeed, safeFill), seed: safeSeed, fill: safeFill, generation: 0 };
}

/**
 * Restores a shared snapshot. Invalid/truncated `cells` fall back to the seeded
 * generation-0 pattern so a bad link still opens a valid, bounded simulation.
 */
export function restoreLife(input: LifeRestoreInput): LifeState {
  const decoded = input.cells ? decodeGrid(input.cells, input.width, input.height) : null;
  if (!decoded) return createLifeState(input.seed, input.width, input.height, input.fill);
  const generation = Number.isFinite(input.generation)
    ? Math.min(LIFE_MAX_GENERATION, Math.max(0, Math.floor(input.generation)))
    : 0;
  return { grid: decoded, seed: clampSeed(input.seed), fill: clampDensity(input.fill), generation };
}
