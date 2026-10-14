// Minimal, dependency-free generative audio engine built on the Web Audio API.
// It never starts on its own: audio only begins from an explicit user gesture
// (the toggle button), starts quiet, and is torn down on hide/unmount.
// Each start() belongs to a "session"; stop()/dispose() invalidate the session so
// late timers or an awaited resume() can never touch a newer graph.

export interface GenerativeAudioOptions {
  /** Plays sparse notes on its own (Liminal). When false, notes come from trigger() only (Life). */
  autonomous: boolean;
  /** Called when a note sounds, with intensity 0..1, to drive a modest visual reaction. */
  onNote?: (intensity: number) => void;
  /** Called when playback starts/stops, including stops caused by another work or a hidden tab. */
  onStateChange?: (playing: boolean) => void;
}

export interface GenerativeAudioHandle {
  isPlaying(): boolean;
  start(): Promise<boolean>;
  stop(): void;
  /** Plays one note on demand (throttled); ignored while stopped. */
  trigger(intensity: number): void;
  dispose(): void;
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ??
    null
  );
}

export function isAudioSupported(): boolean {
  return getAudioContextCtor() !== null;
}

const MAX_VOLUME = 0.05;
const FADE_OUT_SECONDS = 0.3;
const MIN_NOTE_GAP_MS = 220;
const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];

interface Graph {
  gain: GainNode;
  filter: BiquadFilterNode;
  oscillators: OscillatorNode[];
  noteTimer: number;
  teardownTimer: number;
}

// Only one work may sound at a time.
let activeHandle: GenerativeAudioHandle | null = null;

export function createGenerativeAudio(options: GenerativeAudioOptions): GenerativeAudioHandle {
  const Ctor = getAudioContextCtor();
  let context: AudioContext | null = null;
  let graph: Graph | null = null;
  let session = 0;
  let starting: Promise<boolean> | null = null;
  let disposed = false;
  let lastNoteAt = 0;
  let rngState = 0x9e3779b9;

  const self: GenerativeAudioHandle = { isPlaying, start, stop, trigger, dispose };

  function isPlaying() {
    return graph !== null;
  }

  function random() {
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    return rngState / 4294967296;
  }

  function playNote(intensity: number) {
    const ctx = context;
    const current = graph;
    if (!ctx || !current) return;
    const now = performance.now();
    if (now - lastNoteAt < MIN_NOTE_GAP_MS) return;
    lastNoteAt = now;
    const level = Math.min(1, Math.max(0, intensity));
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 220 * SCALE[Math.floor(random() * SCALE.length)];
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.35 + level * 0.4, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    osc.connect(env);
    env.connect(current.filter);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
    osc.start(t);
    osc.stop(t + 1.7);
    current.filter.frequency.cancelScheduledValues(t);
    current.filter.frequency.setTargetAtTime(480 + level * 900, t, 0.05);
    current.filter.frequency.setTargetAtTime(480, t + 0.15, 0.25);
    options.onNote?.(0.4 + level * 0.6);
  }

  function scheduleAutonomousNote(forSession: number) {
    const current = graph;
    if (!current || forSession !== session) return;
    current.noteTimer = window.setTimeout(() => {
      if (forSession !== session) return;
      playNote(random());
      scheduleAutonomousNote(forSession);
    }, 900 + random() * 1400);
  }

  function disposeGraph(target: Graph) {
    window.clearTimeout(target.noteTimer);
    window.clearTimeout(target.teardownTimer);
    target.oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
      osc.disconnect();
    });
    target.filter.disconnect();
    target.gain.disconnect();
  }

  function parkContext() {
    // Nothing is playing and no start() is pending: release the audio device.
    if (graph || starting || !context) return;
    void context.suspend().catch(() => {});
  }

  function notify(playing: boolean) {
    if (!disposed) options.onStateChange?.(playing);
  }

  function start(): Promise<boolean> {
    if (!Ctor || disposed) return Promise.resolve(false);
    if (graph) return Promise.resolve(true);
    if (starting) return starting;

    if (activeHandle && activeHandle !== self) activeHandle.stop();
    activeHandle = self;
    const mySession = ++session;

    starting = (async () => {
      try {
        context ??= new Ctor();
        const ctx = context;
        // Always awaited so `starting` is assigned before this block's finally runs.
        await ctx.resume();
        if (mySession !== session || disposed) return false;

        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(MAX_VOLUME, ctx.currentTime + 0.8);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 480;
        filter.Q.value = 0.7;
        const oscillators = [110, 110 * 1.5, 110 * 2.01].map((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = i === 0 ? "sine" : "triangle";
          osc.frequency.value = freq;
          osc.connect(filter);
          osc.start();
          return osc;
        });
        filter.connect(gain);
        gain.connect(ctx.destination);
        graph = { gain, filter, oscillators, noteTimer: 0, teardownTimer: 0 };
        if (options.autonomous) scheduleAutonomousNote(mySession);
        notify(true);
        return true;
      } catch {
        return false;
      } finally {
        starting = null;
        if (!graph) {
          if (disposed) void context?.close().catch(() => {});
          else parkContext();
        }
      }
    })();
    return starting;
  }

  function stop() {
    session++;
    if (activeHandle === self) activeHandle = null;
    const current = graph;
    graph = null;
    if (!current || !context) {
      parkContext();
      return;
    }
    const ctx = context;
    window.clearTimeout(current.noteTimer);
    current.gain.gain.cancelScheduledValues(ctx.currentTime);
    current.gain.gain.setValueAtTime(current.gain.gain.value, ctx.currentTime);
    current.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_OUT_SECONDS);
    // Tears down only this graph; a restarted graph is a different object.
    current.teardownTimer = window.setTimeout(() => {
      disposeGraph(current);
      parkContext();
    }, FADE_OUT_SECONDS * 1000 + 50);
    notify(false);
  }

  function trigger(intensity: number) {
    if (!graph) return;
    playNote(intensity);
  }

  function onVisibility() {
    if (document.hidden) stop();
  }

  function dispose() {
    if (disposed) return;
    const current = graph;
    disposed = true;
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", stop);
    if (current) disposeGraph(current);
    // A pending start() closes the context itself once it observes disposal.
    if (starting || !context) return;
    const ctx = context;
    context = null;
    void ctx.close().catch(() => {});
  }

  if (Ctor && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
  }

  return self;
}
