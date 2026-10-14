import {
  LIFE_DEFAULT_DENSITY,
  LIFE_DEFAULT_HEIGHT,
  LIFE_DEFAULT_SEED,
  LIFE_DEFAULT_WIDTH,
  countAlive,
  createLifeState,
  encodeGrid,
  restoreLife,
  step,
  type LifeGrid,
  type LifeRestoreInput,
  type LifeState,
} from "@/webgl/life/life-engine";

// Canvas 2D renderer + loop for the Game of Life work. The grid is at most 96x96,
// so a 2D canvas is lighter than a WebGL pipeline and needs no readback tricks for PNG export.

const STEP_INTERVAL_MS = 125; // bounded to 8 generations per second
const BACKGROUND = "#08090a";
const GRID_LINE = "rgba(236, 238, 234, 0.06)";
const CELL_COLOR = "212, 229, 185";
const CAPTURE_CELL_PX = 16;
const PIXEL_BUDGET = 2_000_000;

export interface LifeGenerationInfo {
  generation: number;
  alive: number;
  /** 0..1 magnitude of the population change, used to drive sound. */
  activity: number;
}

export interface LifeSnapshot {
  seed: number;
  width: number;
  height: number;
  fill: number;
  generation: number;
  cells: string;
}

export interface LifeSceneOptions {
  onGeneration?: (info: LifeGenerationInfo) => void;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: LifeGrid,
  cellPx: number,
  glow: number,
  cursor: { x: number; y: number } | null,
) {
  const width = grid.width * cellPx;
  const height = grid.height * cellPx;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  if (cellPx >= 6) {
    ctx.fillStyle = GRID_LINE;
    for (let x = 1; x < grid.width; x++) ctx.fillRect(x * cellPx, 0, 1, height);
    for (let y = 1; y < grid.height; y++) ctx.fillRect(0, y * cellPx, width, 1);
  }

  const inset = Math.max(cellPx >= 6 ? 1 : 0, Math.round(cellPx * 0.12 * (1 - glow * 0.7)));
  ctx.fillStyle = `rgba(${CELL_COLOR}, ${0.78 + glow * 0.22})`;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y * grid.width + x]) {
        ctx.fillRect(x * cellPx + inset, y * cellPx + inset, cellPx - inset * 2, cellPx - inset * 2);
      }
    }
  }

  if (cursor) {
    ctx.strokeStyle = "#dcf4c9";
    ctx.lineWidth = Math.max(1, Math.round(cellPx * 0.1));
    ctx.strokeRect(
      cursor.x * cellPx + ctx.lineWidth / 2,
      cursor.y * cellPx + ctx.lineWidth / 2,
      cellPx - ctx.lineWidth,
      cellPx - ctx.lineWidth,
    );
  }
}

export function createLifeScene(canvas: HTMLCanvasElement, board: HTMLElement, options: LifeSceneOptions = {}) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  let life: LifeState = createLifeState(LIFE_DEFAULT_SEED, LIFE_DEFAULT_WIDTH, LIFE_DEFAULT_HEIGHT, LIFE_DEFAULT_DENSITY);
  let cellPx = 1;
  let paused = true;
  let reducedMotion = false;
  let visible = false;
  let disposed = false;
  let frame = 0;
  let lastFrameTime = 0;
  let lastStepTime = 0;
  let glow = 0;
  let focused = false;
  let cursor = { x: 0, y: 0 };
  let paintValue: 0 | 1 | null = null;
  let lastPaint: { x: number; y: number } | null = null;

  function draw() {
    if (disposed) return;
    drawGrid(ctx!, life.grid, cellPx, glow, focused ? cursor : null);
  }

  function layout() {
    const { width: boardW, height: boardH } = board.getBoundingClientRect();
    if (!boardW || !boardH) return;
    const { width, height } = life.grid;
    const cssCell = Math.max(1, Math.floor(Math.min(boardW / width, boardH / height)));
    const cssW = cssCell * width;
    const cssH = cssCell * height;
    const ratio = Math.max(
      1,
      Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (cssW * cssH))),
    );
    cellPx = Math.max(1, Math.floor(cssCell * ratio));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const backingW = cellPx * width;
    const backingH = cellPx * height;
    if (canvas.width !== backingW) canvas.width = backingW;
    if (canvas.height !== backingH) canvas.height = backingH;
    draw();
  }

  function shouldRun() {
    return !disposed && visible && !document.hidden;
  }

  function ensureLoop() {
    if (frame || !shouldRun()) return;
    if ((paused || reducedMotion) && glow <= 0) return;
    frame = requestAnimationFrame(tick);
  }

  function stopLoop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrameTime = 0;
    lastStepTime = 0;
  }

  function advance() {
    const before = countAlive(life.grid);
    life = { ...life, grid: step(life.grid), generation: life.generation + 1 };
    const alive = countAlive(life.grid);
    const cells = life.grid.cells.length;
    options.onGeneration?.({
      generation: life.generation,
      alive,
      activity: Math.min(1, Math.abs(alive - before) / Math.max(1, cells * 0.04)),
    });
  }

  function tick(time: number) {
    frame = 0;
    if (!shouldRun()) return;
    const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.1) : 0;
    lastFrameTime = time;
    let changed = false;
    if (!paused && !reducedMotion) {
      if (!lastStepTime) lastStepTime = time;
      if (time - lastStepTime >= STEP_INTERVAL_MS) {
        lastStepTime = time;
        advance();
        changed = true;
      }
    }
    if (glow > 0) {
      glow = glow < 0.01 ? 0 : glow * Math.exp(-delta * 4);
      changed = true;
    }
    if (changed) draw();
    ensureLoop();
  }

  function updatePlayback() {
    stopLoop();
    ensureLoop();
    if (!visible || document.hidden) return;
    draw();
  }

  function cellFromEvent(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * life.grid.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * life.grid.height);
    if (x < 0 || y < 0 || x >= life.grid.width || y >= life.grid.height) return null;
    return { x, y };
  }

  function paint(x: number, y: number) {
    if (paintValue === null) return;
    life.grid.cells[y * life.grid.width + x] = paintValue;
  }

  function paintLine(from: { x: number; y: number }, to: { x: number; y: number }) {
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
    for (let i = 0; i <= steps; i++) {
      paint(Math.round(from.x + ((to.x - from.x) * i) / steps), Math.round(from.y + ((to.y - from.y) * i) / steps));
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = cellFromEvent(event);
    if (!target) return;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* capture is optional */
    }
    paintValue = life.grid.cells[target.y * life.grid.width + target.x] ? 0 : 1;
    cursor = target;
    lastPaint = target;
    paint(target.x, target.y);
    draw();
  }

  function onPointerMove(event: PointerEvent) {
    if (paintValue === null) return;
    const target = cellFromEvent(event);
    if (!target) return;
    paintLine(lastPaint ?? target, target);
    lastPaint = target;
    cursor = target;
    draw();
  }

  function endPaint() {
    paintValue = null;
    lastPaint = null;
  }

  function onKeyDown(event: KeyboardEvent) {
    const { width, height } = life.grid;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = moves[event.key];
    if (move) {
      cursor = {
        x: Math.min(width - 1, Math.max(0, cursor.x + move[0])),
        y: Math.min(height - 1, Math.max(0, cursor.y + move[1])),
      };
    } else if (event.key === " " || event.key === "Enter") {
      const index = cursor.y * width + cursor.x;
      life.grid.cells[index] = life.grid.cells[index] ? 0 : 1;
    } else {
      return;
    }
    event.preventDefault();
    draw();
  }

  function onFocus() {
    focused = true;
    draw();
  }

  function onBlur() {
    focused = false;
    draw();
  }

  function replace(next: LifeState) {
    life = next;
    cursor = { x: Math.min(cursor.x, next.grid.width - 1), y: Math.min(cursor.y, next.grid.height - 1) };
    layout();
    options.onGeneration?.({ generation: life.generation, alive: countAlive(life.grid), activity: 0 });
  }

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(board);
  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    updatePlayback();
  });
  visibilityObserver.observe(canvas);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endPaint);
  canvas.addEventListener("pointercancel", endPaint);
  canvas.addEventListener("lostpointercapture", endPaint);
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("focus", onFocus);
  canvas.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", updatePlayback);
  layout();

  return {
    setPaused(value: boolean) {
      paused = value;
      updatePlayback();
    },
    setReducedMotion(value: boolean) {
      reducedMotion = value;
      if (value) glow = 0;
      updatePlayback();
    },
    /** One generation, always available (also with reduced motion or while paused). */
    step() {
      advance();
      draw();
    },
    reset() {
      replace(createLifeState(life.seed, life.grid.width, life.grid.height, life.fill));
    },
    reseed(seed: number) {
      replace(createLifeState(seed, life.grid.width, life.grid.height, life.fill));
    },
    load(input: LifeRestoreInput) {
      replace(restoreLife(input));
    },
    getSnapshot(): LifeSnapshot {
      return {
        seed: life.seed,
        width: life.grid.width,
        height: life.grid.height,
        fill: life.fill,
        generation: life.generation,
        cells: encodeGrid(life.grid),
      };
    },
    /** Short-lived brightening in response to a sounding note. */
    pulse(level: number) {
      if (reducedMotion) return;
      glow = Math.max(glow, Math.min(1, Math.max(0, level)));
      ensureLoop();
    },
    /** Renders the current board at a fixed resolution, independent of the on-screen size. */
    capturePng(): string | null {
      if (disposed) return null;
      const out = document.createElement("canvas");
      out.width = life.grid.width * CAPTURE_CELL_PX;
      out.height = life.grid.height * CAPTURE_CELL_PX;
      const outCtx = out.getContext("2d", { alpha: false });
      if (!outCtx || !out.width || !out.height) return null;
      drawGrid(outCtx, life.grid, CAPTURE_CELL_PX, 0, null);
      try {
        return out.toDataURL("image/png");
      } catch {
        return null;
      }
    },
    dispose() {
      disposed = true;
      stopLoop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPaint);
      canvas.removeEventListener("pointercancel", endPaint);
      canvas.removeEventListener("lostpointercapture", endPaint);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("focus", onFocus);
      canvas.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", updatePlayback);
    },
  };
}

export type LifeScene = NonNullable<ReturnType<typeof createLifeScene>>;
