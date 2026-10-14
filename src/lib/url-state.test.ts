// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIMINAL_DEFAULTS,
  buildShareUrl,
  lifeShareUpdates,
  liminalShareUpdates,
  parseSearch,
  readLifeShareState,
  readLiminalShareState,
  readShareWork,
} from "./url-state.ts";

const lifeDefaults = { seed: 2026, width: 48, height: 32, fill: 0.28 };

test("liminal params are clamped to supported bounds", () => {
  const state = readLiminalShareState(parseSearch("?speed=99&density=-4&palette=9&t=-3"));
  assert.deepEqual(state, { speed: 2.5, density: 0.4, palette: 2, time: 0, pointerX: 0, pointerY: 0 });
});

test("malformed liminal values fall back to defaults", () => {
  const state = readLiminalShareState(parseSearch("?speed=abc&density=&palette=1e9&t=Infinity"));
  assert.deepEqual(state, { ...LIMINAL_DEFAULTS, palette: LIMINAL_DEFAULTS.palette });
});

test("no liminal params yields null so defaults are kept", () => {
  assert.equal(readLiminalShareState(parseSearch("?utm=1")), null);
});

test("liminal pointer is bounded, strict and backwards compatible", () => {
  const clamped = readLiminalShareState(parseSearch("?px=5&py=-9"));
  assert.equal(clamped?.pointerX, 1);
  assert.equal(clamped?.pointerY, -1);
  const malformed = readLiminalShareState(parseSearch("?px=abc&py=1e3&speed=1"));
  assert.equal(malformed?.pointerX, 0);
  assert.equal(malformed?.pointerY, 0);
  const legacy = readLiminalShareState(parseSearch("?speed=1.5&density=1&palette=0&t=3"));
  assert.equal(legacy?.pointerX, 0);
  assert.equal(legacy?.pointerY, 0);
});

test("unsupported work values are ignored", () => {
  assert.equal(readShareWork(parseSearch("?work=evil")), null);
  assert.equal(readShareWork(parseSearch("?work=life")), "life");
  assert.equal(readShareWork(parseSearch("?work=liminal")), "liminal");
});

test("life params are validated and bounded", () => {
  const state = readLifeShareState(parseSearch("?seed=99999999999&w=1000&h=2&fill=9&gen=9999999"), lifeDefaults);
  assert.ok(state);
  assert.equal(state.seed, 0xffffffff);
  assert.equal(state.width, 96);
  assert.equal(state.height, 8);
  assert.equal(state.fill, 0.6);
  assert.equal(state.generation, 100_000);
  assert.equal(state.cells, null);
});

test("oversized or non-base64 cells are dropped", () => {
  const long = readLifeShareState(parseSearch(`?seed=1&cells=${"A".repeat(5000)}`), lifeDefaults);
  assert.equal(long?.cells, null);
  const bad = readLifeShareState(parseSearch("?seed=1&cells=%3Cscript%3E"), lifeDefaults);
  assert.equal(bad?.cells, null);
});

test("absurdly long query strings are ignored", () => {
  const params = parseSearch(`?speed=1&${"x=1&".repeat(5000)}`);
  assert.equal(readLiminalShareState(params), null);
});

test("share url preserves unrelated params, pathname and basePath", () => {
  const url = buildShareUrl(
    { pathname: "/creative-playground/", search: "?utm=abc&seed=5", hash: "" },
    liminalShareUpdates({ speed: 1.5, density: 1.2, palette: 2, time: 12.345, pointerX: 0, pointerY: 0 }),
  );
  const params = new URL(url, "https://example.com").searchParams;
  assert.ok(url.startsWith("/creative-playground/?"));
  assert.equal(params.get("utm"), "abc");
  assert.equal(params.get("work"), "liminal");
  assert.equal(params.get("speed"), "1.50");
  assert.equal(params.get("palette"), "2");
  assert.equal(params.get("seed"), null, "life keys are removed from liminal links");
});

test("liminal share link round-trips through the reader", () => {
  const url = buildShareUrl(
    { pathname: "/", search: "", hash: "" },
    liminalShareUpdates({ speed: 0.75, density: 1.8, palette: 1, time: 42.5, pointerX: -0.25, pointerY: 0.5 }),
  );
  const state = readLiminalShareState(parseSearch(url.slice(url.indexOf("?"))));
  assert.deepEqual(state, { speed: 0.75, density: 1.8, palette: 1, time: 42.5, pointerX: -0.25, pointerY: 0.5 });
});

test("life share link round-trips including cells", () => {
  const url = buildShareUrl(
    { pathname: "/", search: "?speed=1", hash: "" },
    lifeShareUpdates({ seed: 7, width: 16, height: 12, fill: 0.3, generation: 5, cells: "AB+/" }),
  );
  const params = parseSearch(url.slice(url.indexOf("?")));
  assert.equal(params.get("speed"), null, "liminal keys are removed from life links");
  const state = readLifeShareState(params, lifeDefaults);
  assert.deepEqual(state, { seed: 7, width: 16, height: 12, fill: 0.3, generation: 5, cells: "AB+/" });
});
