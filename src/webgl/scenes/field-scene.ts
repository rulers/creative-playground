import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import { fieldFragmentShader, fieldVertexShader } from "@/webgl/shaders/field";

export function createFieldScene(canvas: HTMLCanvasElement) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  } catch {
    // Keep the CSS artwork available when the browser cannot create a WebGL context.
    return null;
  }

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uResolution: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2(-1, -1) },
    uTime: { value: 0 },
  };
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: fieldVertexShader,
    fragmentShader: fieldFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new Mesh(geometry, material));

  const targetPointer = new Vector2(-1, -1);
  let reducedMotion = false;
  let visible = true;
  let contextLost = false;
  let failed = false;
  let disposed = false;
  let frame = 0;
  let lastTime = 0;

  renderer.debug.onShaderError = () => {
    failed = true;
    canvas.dataset.state = "unavailable";
  };

  function render() {
    if (disposed || contextLost || failed) return;
    renderer.render(scene, camera);
    if (!failed && canvas.dataset.state !== "ready") canvas.dataset.state = "ready";
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function isActive() {
    return !disposed && !contextLost && !failed && visible && !document.hidden;
  }

  function animate(time: number) {
    frame = 0;
    if (!isActive() || reducedMotion) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    uniforms.uTime.value += delta;
    uniforms.uPointer.value.lerp(targetPointer, 1 - Math.exp(-delta * 5));
    render();
    frame = requestAnimationFrame(animate);
  }

  function updatePlayback() {
    stop();
    if (isActive() && !reducedMotion) frame = requestAnimationFrame(animate);
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
    render();
  }

  function updatePointer(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    targetPointer.set(
      (event.clientX - bounds.left) / bounds.width,
      1 - (event.clientY - bounds.top) / bounds.height,
    );
    if (reducedMotion) {
      uniforms.uPointer.value.copy(targetPointer);
      render();
    } else if (!frame) {
      frame = requestAnimationFrame(animate);
    }
  }

  function clearPointer() {
    targetPointer.set(-1, -1);
    if (reducedMotion) {
      uniforms.uPointer.value.copy(targetPointer);
      render();
    }
  }

  function onContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    stop();
    canvas.dataset.state = "unavailable";
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
  canvas.addEventListener("pointerdown", updatePointer, { passive: true });
  canvas.addEventListener("pointermove", updatePointer, { passive: true });
  canvas.addEventListener("pointerleave", clearPointer);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.addEventListener("visibilitychange", updatePlayback);
  resize();

  return {
    setReducedMotion(value: boolean) {
      reducedMotion = value;
      if (reducedMotion) {
        stop();
        uniforms.uTime.value = 0;
        uniforms.uPointer.value.copy(targetPointer);
        render();
      } else {
        updatePlayback();
      }
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointerdown", updatePointer);
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerleave", clearPointer);
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
