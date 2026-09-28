import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from "three";
import { liminalFragmentShader, liminalVertexShader } from "@/webgl/shaders/liminal";

export function createLiminalScene(canvas: HTMLCanvasElement, onAvailability: (available: boolean) => void) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  } catch {
    // The CSS artwork and all page content remain available without WebGL.
    return null;
  }

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uResolution: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uPointer: { value: new Vector2() },
  };
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: liminalVertexShader,
    fragmentShader: liminalFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new Mesh(geometry, material));

  const targetPointer = new Vector2();
  let paused = true;
  let visible = true;
  let contextLost = false;
  let failed = false;
  let disposed = false;
  let frame = 0;
  let lastTime = 0;

  renderer.debug.onShaderError = () => {
    failed = true;
    canvas.dataset.state = "unavailable";
    onAvailability(false);
  };

  function render() {
    if (disposed || contextLost || failed) return;
    renderer.render(scene, camera);
    if (!failed && canvas.dataset.state !== "ready") {
      canvas.dataset.state = "ready";
      onAvailability(true);
    }
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function animate(time: number) {
    frame = 0;
    if (paused || !visible || document.hidden || contextLost || failed || disposed) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    uniforms.uTime.value += delta;
    uniforms.uPointer.value.lerp(targetPointer, 1 - Math.exp(-delta * 4));
    render();
    frame = requestAnimationFrame(animate);
  }

  function updatePlayback() {
    stop();
    if (!paused && visible && !document.hidden && !contextLost && !failed && !disposed) {
      frame = requestAnimationFrame(animate);
    }
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    // Cap both density and total pixels to keep phones and 4K displays modest.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
    render();
  }

  function onPointerMove(event: PointerEvent) {
    if (paused || event.pointerType !== "mouse") return;
    const bounds = canvas.getBoundingClientRect();
    targetPointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
  }
  function onPointerLeave() { targetPointer.set(0, 0); }
  function onContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    stop();
    canvas.dataset.state = "unavailable";
    onAvailability(false);
  }
  function onContextRestored() {
    contextLost = false;
    failed = false;
    resize();
    updatePlayback();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  });
  visibilityObserver.observe(canvas);
  canvas.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.addEventListener("visibilitychange", updatePlayback);
  resize();

  return {
    setPaused(value: boolean) {
      paused = value;
      updatePlayback();
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", updatePlayback);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      delete canvas.dataset.state;
    },
  };
}
