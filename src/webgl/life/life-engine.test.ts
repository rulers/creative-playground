// Run with: node --test src/webgl/life/life-engine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIFE_DEFAULT_SEED,
  LIFE_PATTERNS,
  clampDensity,
  clampGridSize,
  clampSeed,
  countAlive,
  countNeighbors,
  createEmptyGrid,
  createLifeState,
  createSeededRng,
  decodeGrid,
  encodeGrid,
  getCell,
  restoreLife,
  seededRandomGrid,
  setCell,
  stampCenteredPattern,
  step,
  toggleCell,
} from "./life-engine.ts";

function gridToString(grid: ReturnType<typeof createEmptyGrid>) {
  let out = "";
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) out += getCell(grid, x, y) ? "#" : ".";
    out += "\n";
  }
  return out;
}

test("blinker oscillates with period 2", () => {
  const grid = stampCenteredPattern(7, 7, LIFE_PATTERNS.blinker);
  const after1 = step(grid);
  const after2 = step(after1);
  assert.notEqual(gridToString(after1), gridToString(grid), "should change after one step");
  assert.equal(gridToString(after2), gridToString(grid), "should return to original after two steps");
});

test("block still life remains stable", () => {
  const grid = stampCenteredPattern(6, 6, LIFE_PATTERNS.block);
  const after = step(grid);
  assert.equal(gridToString(after), gridToString(grid));
  assert.equal(countAlive(after), 4);
});

test("glider translates after four generations (toroidal wrap-safe)", () => {
  let grid = stampCenteredPattern(16, 16, LIFE_PATTERNS.glider);
  const startAlive = countAlive(grid);
  for (let i = 0; i < 4; i++) grid = step(grid);
  assert.equal(countAlive(grid), startAlive, "glider preserves population every 4 steps");
});

test("boundary neighbor counting wraps around the torus", () => {
  // A single live cell at (0,0) should be visible as a neighbor of (width-1, height-1).
  let grid = createEmptyGrid(8, 8);
  grid = setCell(grid, 0, 0, 1);
  const neighbors = countNeighbors(grid, 7, 7);
  assert.equal(neighbors, 1, "cell at (0,0) wraps to be a neighbor of (width-1,height-1)");
});

test("underpopulation and overpopulation kill cells", () => {
  let grid = createEmptyGrid(8, 8);
  grid = setCell(grid, 4, 4, 1); // lone cell, 0 neighbors
  const next = step(grid);
  assert.equal(getCell(next, 4, 4), 0, "lone live cell dies from underpopulation");
});

test("dead cell with exactly three neighbors is born", () => {
  let grid = createEmptyGrid(8, 8);
  grid = setCell(grid, 1, 0, 1);
  grid = setCell(grid, 2, 0, 1);
  grid = setCell(grid, 3, 0, 1);
  const next = step(grid);
  assert.equal(getCell(next, 2, 1), 1, "cell below the middle of three gains life");
});

test("toggleCell flips a single cell without mutating the input grid", () => {
  const grid = createEmptyGrid(4, 4);
  const toggled = toggleCell(grid, 1, 1);
  assert.equal(getCell(grid, 1, 1), 0, "original grid is untouched");
  assert.equal(getCell(toggled, 1, 1), 1);
});

test("seededRandomGrid is deterministic for a fixed seed", () => {
  const a = seededRandomGrid(20, 20, 42, 0.3);
  const b = seededRandomGrid(20, 20, 42, 0.3);
  assert.equal(gridToString(a), gridToString(b));
});

test("seededRandomGrid differs across distinct seeds", () => {
  const a = seededRandomGrid(20, 20, 1, 0.3);
  const b = seededRandomGrid(20, 20, 2, 0.3);
  assert.notEqual(gridToString(a), gridToString(b));
});

test("createSeededRng produces values in [0, 1)", () => {
  const rng = createSeededRng(7);
  for (let i = 0; i < 50; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1);
  }
});

test("clamp helpers bound out-of-range and non-finite input", () => {
  assert.equal(clampGridSize(1000), 96);
  assert.equal(clampGridSize(-5), 8);
  assert.equal(clampGridSize(Number.NaN), 48);
  assert.equal(clampDensity(5), 0.6);
  assert.equal(clampDensity(-1), 0.05);
  assert.equal(clampSeed(-10), 10);
  assert.equal(clampSeed(Number.NaN), 1);
});

test("encodeGrid/decodeGrid round-trips a grid exactly", () => {
  const grid = seededRandomGrid(24, 16, 99, 0.35);
  const encoded = encodeGrid(grid);
  const decoded = decodeGrid(encoded, 24, 16);
  assert.ok(decoded, "decoding should succeed");
  assert.equal(gridToString(decoded!), gridToString(grid));
});

test("decodeGrid rejects malformed input instead of throwing", () => {
  assert.equal(decodeGrid("not base64 !!", 8, 8), null);
  assert.equal(decodeGrid("", 8, 8), null);
  assert.equal(decodeGrid("A".repeat(10_000), 8, 8), null, "oversized input is rejected, not processed");
});

test("decodeGrid rejects truncated and over-long snapshots by exact length", () => {
  const encoded = encodeGrid(seededRandomGrid(24, 16, 5, 0.3));
  assert.ok(decodeGrid(encoded, 24, 16));
  assert.equal(decodeGrid(encoded.slice(0, -1), 24, 16), null);
  assert.equal(decodeGrid(`${encoded}A`, 24, 16), null);
  assert.equal(decodeGrid(encoded, 24, 17), null, "dimension mismatch is rejected");
});

test("restoreLife restores exact cells and generation from a valid snapshot", () => {
  let grid = stampCenteredPattern(16, 12, LIFE_PATTERNS.glider);
  grid = step(step(grid));
  const restored = restoreLife({ seed: 7, width: 16, height: 12, fill: 0.3, generation: 2, cells: encodeGrid(grid) });
  assert.equal(gridToString(restored.grid), gridToString(grid));
  assert.equal(restored.generation, 2);
});

test("restoreLife falls back to the seeded pattern for invalid cells", () => {
  const restored = restoreLife({ seed: 7, width: 16, height: 12, fill: 0.3, generation: 50, cells: "AAAA" });
  const expected = createLifeState(7, 16, 12, 0.3);
  assert.equal(restored.generation, 0);
  assert.equal(gridToString(restored.grid), gridToString(expected.grid));
});

test("simulation from a seed is reproducible across runs", () => {
  let a = createLifeState(LIFE_DEFAULT_SEED, 48, 32, 0.28).grid;
  let b = createLifeState(LIFE_DEFAULT_SEED, 48, 32, 0.28).grid;
  for (let i = 0; i < 20; i++) {
    a = step(a);
    b = step(b);
  }
  assert.equal(encodeGrid(a), encodeGrid(b));
});
