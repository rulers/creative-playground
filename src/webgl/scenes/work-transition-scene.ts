import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { createFieldScene } from "@/webgl/scenes/field-scene";
import { createLiminalScene } from "@/webgl/scenes/liminal-scene";
import { transitionFragmentShader, transitionVertexShader } from "@/webgl/shaders/transition";

export function createWorkTransitionScene(
  canvas: HTMLCanvasElement,
  liminalElement: HTMLElement,
  fieldElement: HTMLElement,
  liminalTitleElement: HTMLElement,
  fieldTitleElement: HTMLElement,
  liminalEyebrowElement: HTMLElement,
  fieldEyebrowElement: HTMLElement,
  onAvailability: (available: boolean) => void,
) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  } catch {
    canvas.dataset.state = "unavailable";
    onAvailability(false);
    return null;
  }

  const liminal = createLiminalScene();
  const field = createFieldScene();
  const transitionScene = new Scene();
  const transitionCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const transitionUniforms = {
    uLiminal: { value: null as WebGLRenderTarget["texture"] | null },
    uField: { value: null as WebGLRenderTarget["texture"] | null },
    uLiminalTitle: { value: null as CanvasTexture | null },
    uFieldTitle: { value: null as CanvasTexture | null },
    uLiminalEyebrow: { value: null as CanvasTexture | null },
    uFieldEyebrow: { value: null as CanvasTexture | null },
    uPointer: { value: new Vector2(0.5, 0.5) },
    uLiminalTitleMap: { value: new Vector4(1, 1, 0, 0) },
    uFieldTitleMap: { value: new Vector4(1, 1, 0, 0) },
    uLiminalEyebrowMap: { value: new Vector4(1, 1, 0, 0) },
    uFieldEyebrowMap: { value: new Vector4(1, 1, 0, 0) },
    uHasPointer: { value: 0 },
    uProgress: { value: 0 },
  };
  const transitionGeometry = new PlaneGeometry(2, 2);
  const transitionMaterial = new ShaderMaterial({
    uniforms: transitionUniforms,
    vertexShader: transitionVertexShader,
    fragmentShader: transitionFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  transitionScene.add(new Mesh(transitionGeometry, transitionMaterial));

  const liminalPointer = new Vector2();
  const targetLiminalPointer = new Vector2();
  const fieldPointer = new Vector2(-1, -1);
  const targetFieldPointer = new Vector2(-1, -1);
  const targetWarpPointer = new Vector2(0.5, 0.5);
  const transitionPointer = new Vector2(0.5, 0.5);
  const drawingBufferSize = new Vector2(1, 1);
  let liminalTarget: WebGLRenderTarget | null = null;
  let fieldTarget: WebGLRenderTarget | null = null;
  let liminalTitleTexture: CanvasTexture | null = null;
  let fieldTitleTexture: CanvasTexture | null = null;
  let liminalEyebrowTexture: CanvasTexture | null = null;
  let fieldEyebrowTexture: CanvasTexture | null = null;
  let progress = 0;
  let paused = false;
  let reducedMotion = false;
  let visible = false;
  let contextLost = false;
  let failed = false;
  let disposed = false;
  let frame = 0;
  let lastTime = 0;
  let viewportWidth = 1;
  let viewportHeight = 1;

  function getTargetSize() {
    const rect = canvas.getBoundingClientRect();
    const mobile = window.matchMedia("(max-width: 600px)").matches || navigator.maxTouchPoints > 0;
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      mobile ? 1 : 1.25,
      Math.sqrt((mobile ? 1_000_000 : 1_500_000) / Math.max(rect.width * rect.height, 1)),
    );
    return {
      width: Math.max(1, Math.floor(rect.width * pixelRatio)),
      height: Math.max(1, Math.floor(rect.height * pixelRatio)),
    };
  }

  function resizeTargets() {
    if (!liminalTarget || !fieldTarget) return;
    const { width, height } = getTargetSize();
    liminalTarget.setSize(width, height);
    fieldTarget.setSize(width, height);
    resizeTitleTexture(liminalTitleTexture, liminalTitleElement, liminalElement);
    resizeTitleTexture(fieldTitleTexture, fieldTitleElement, fieldElement);
    resizeTitleTexture(liminalEyebrowTexture, liminalEyebrowElement, liminalElement);
    resizeTitleTexture(fieldEyebrowTexture, fieldEyebrowElement, fieldElement);
  }

  function drawTitleTexture(texture: CanvasTexture | null, title: HTMLElement, stage: HTMLElement) {
    if (!texture) return;
    const titleCanvas = texture.image as HTMLCanvasElement;
    const context = titleCanvas.getContext("2d");
    if (!context) return;

    const stageBounds = stage.getBoundingClientRect();
    const titleBounds = title.getBoundingClientRect();
    if (!stageBounds.width || !stageBounds.height) return;
    const style = window.getComputedStyle(title);
    const targetScale = titleCanvas.height / stageBounds.height;
    const horizontalScale = titleCanvas.width / stageBounds.width;
    context.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
    context.fillStyle = style.color;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.letterSpacing = style.letterSpacing;
    context.font = `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize) * targetScale}px ${style.fontFamily}`;

    const text = title.textContent ?? "";
    const metrics = context.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || parseFloat(style.fontSize) * targetScale * 0.75;
    const descent = metrics.actualBoundingBoxDescent || parseFloat(style.fontSize) * targetScale * 0.2;
    const top = (titleBounds.top - stageBounds.top) * targetScale;
    const baseline = top + (titleBounds.height * targetScale - ascent - descent) / 2 + ascent;
    const x = (titleBounds.left - stageBounds.left) * horizontalScale;
    context.fillText(text, x, baseline);

    texture.needsUpdate = true;
  }

  function resizeTitleTexture(texture: CanvasTexture | null, title: HTMLElement, stage: HTMLElement) {
    if (!texture || !liminalTarget || !fieldTarget) return;
    const stageBounds = stage.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const renderTarget = stage === liminalElement ? liminalTarget : fieldTarget;
    const titleCanvas = texture.image as HTMLCanvasElement;
    const width = renderTarget.width;
    const height = Math.max(1, Math.ceil(renderTarget.height * stageBounds.height / viewportHeight));
    if (titleCanvas.width !== width) titleCanvas.width = width;
    if (titleCanvas.height !== height) titleCanvas.height = height;
    drawTitleTexture(texture, title, stage);
  }

  function updateTitleMaps() {
    const viewportWidth = Math.max(window.innerWidth, 1);
    const viewportHeight = Math.max(window.innerHeight, 1);
    const liminalBounds = liminalElement.getBoundingClientRect();
    const fieldBounds = fieldElement.getBoundingClientRect();
    if (!liminalBounds.width || !liminalBounds.height || !fieldBounds.width || !fieldBounds.height) return;
    transitionUniforms.uLiminalTitleMap.value.set(
      viewportWidth / liminalBounds.width,
      viewportHeight / liminalBounds.height,
      -liminalBounds.left / liminalBounds.width,
      (liminalBounds.top + liminalBounds.height - viewportHeight) / liminalBounds.height,
    );
    transitionUniforms.uFieldTitleMap.value.set(
      viewportWidth / fieldBounds.width,
      viewportHeight / fieldBounds.height,
      -fieldBounds.left / fieldBounds.width,
      (fieldBounds.top + fieldBounds.height - viewportHeight) / fieldBounds.height,
    );
    transitionUniforms.uLiminalEyebrowMap.value.copy(transitionUniforms.uLiminalTitleMap.value);
    transitionUniforms.uFieldEyebrowMap.value.copy(transitionUniforms.uFieldTitleMap.value);
  }

  renderer.debug.onShaderError = () => {
    failed = true;
    stop();
    canvas.dataset.state = "unavailable";
    onAvailability(false);
  };

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function getDisplayProgress() {
    return reducedMotion ? (progress < 0.5 ? 0 : 1) : progress;
  }

  function ensureTargets() {
    if (liminalTarget && fieldTarget) return;
    const { width, height } = getTargetSize();
    const options = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      type: UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    };
    liminalTarget = new WebGLRenderTarget(width, height, options);
    fieldTarget = new WebGLRenderTarget(width, height, options);
    transitionUniforms.uLiminal.value = liminalTarget.texture;
    transitionUniforms.uField.value = fieldTarget.texture;
    const liminalCanvas = document.createElement("canvas");
    const fieldCanvas = document.createElement("canvas");
    const liminalEyebrowCanvas = document.createElement("canvas");
    const fieldEyebrowCanvas = document.createElement("canvas");
    liminalTitleTexture = new CanvasTexture(liminalCanvas);
    fieldTitleTexture = new CanvasTexture(fieldCanvas);
    liminalEyebrowTexture = new CanvasTexture(liminalEyebrowCanvas);
    fieldEyebrowTexture = new CanvasTexture(fieldEyebrowCanvas);
    for (const texture of [liminalTitleTexture, fieldTitleTexture, liminalEyebrowTexture, fieldEyebrowTexture]) {
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = false;
    }
    transitionUniforms.uLiminalTitle.value = liminalTitleTexture;
    transitionUniforms.uFieldTitle.value = fieldTitleTexture;
    transitionUniforms.uLiminalEyebrow.value = liminalEyebrowTexture;
    transitionUniforms.uFieldEyebrow.value = fieldEyebrowTexture;
    resizeTitleTexture(liminalTitleTexture, liminalTitleElement, liminalElement);
    resizeTitleTexture(fieldTitleTexture, fieldTitleElement, fieldElement);
    resizeTitleTexture(liminalEyebrowTexture, liminalEyebrowElement, liminalElement);
    resizeTitleTexture(fieldEyebrowTexture, fieldEyebrowElement, fieldElement);
    updateTitleMaps();
  }

  function setPassResolution(width: number, height: number) {
    liminal.uniforms.uResolution.value.set(width, height);
    field.uniforms.uResolution.value.set(width, height);
  }

  function render() {
    if (disposed || contextLost || failed || !visible || document.hidden) return;
    const displayProgress = getDisplayProgress();
    renderer.getDrawingBufferSize(drawingBufferSize);

    if (displayProgress <= 0.01) {
      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, viewportWidth, viewportHeight);
      setPassResolution(drawingBufferSize.x, drawingBufferSize.y);
      renderer.render(liminal.scene, liminal.camera);
    } else if (displayProgress >= 0.99) {
      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, viewportWidth, viewportHeight);
      setPassResolution(drawingBufferSize.x, drawingBufferSize.y);
      renderer.render(field.scene, field.camera);
    } else {
      ensureTargets();
      const targetWidth = liminalTarget!.width;
      const targetHeight = liminalTarget!.height;
      transitionUniforms.uProgress.value = displayProgress;
      transitionUniforms.uPointer.value.copy(transitionPointer);
      setPassResolution(targetWidth, targetHeight);
      renderer.setRenderTarget(liminalTarget);
      renderer.render(liminal.scene, liminal.camera);
      renderer.setRenderTarget(fieldTarget);
      renderer.render(field.scene, field.camera);
      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, viewportWidth, viewportHeight);
      renderer.render(transitionScene, transitionCamera);
    }

    if (canvas.dataset.state !== "ready") {
      canvas.dataset.state = "ready";
      onAvailability(true);
    }
  }

  function animate(time: number) {
    frame = 0;
    if (disposed || contextLost || failed || !visible || document.hidden || reducedMotion) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    if (!paused) {
      liminal.uniforms.uTime.value += delta;
      liminalPointer.lerp(targetLiminalPointer, 1 - Math.exp(-delta * 4));
      liminal.uniforms.uPointer.value.copy(liminalPointer);
    }
    field.uniforms.uTime.value += delta;
    fieldPointer.lerp(targetFieldPointer, 1 - Math.exp(-delta * 5));
    field.uniforms.uPointer.value.copy(fieldPointer);
    transitionPointer.lerp(targetWarpPointer, 1 - Math.exp(-delta * 4));
    render();
    frame = requestAnimationFrame(animate);
  }

  function updatePlayback() {
    stop();
    if (!disposed && !contextLost && !failed && visible && !document.hidden && !reducedMotion) {
      frame = requestAnimationFrame(animate);
    } else {
      render();
    }
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    viewportWidth = width;
    viewportHeight = height;
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      1.5,
      Math.sqrt(2_000_000 / (width * height)),
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    resizeTargets();
    render();
  }

  function updateTitleTextures() {
    resizeTitleTexture(liminalTitleTexture, liminalTitleElement, liminalElement);
    resizeTitleTexture(fieldTitleTexture, fieldTitleElement, fieldElement);
    resizeTitleTexture(liminalEyebrowTexture, liminalEyebrowElement, liminalElement);
    resizeTitleTexture(fieldEyebrowTexture, fieldEyebrowElement, fieldElement);
    updateTitleMaps();
    if (paused || reducedMotion) render();
  }

  function onFontsLoaded() {
    if (disposed) return;
    updateTitleTextures();
    render();
  }

  function setPointerPosition(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    targetWarpPointer.set(
      Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    );
    transitionUniforms.uHasPointer.value = 1;
  }

  function onLiminalPointerMove(event: PointerEvent) {
    if (event.pointerType !== "mouse" || paused || reducedMotion) return;
    const bounds = liminalElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    targetLiminalPointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      1 - ((event.clientY - bounds.top) / bounds.height) * 2,
    );
    setPointerPosition(event);
  }

  function clearLiminalPointer() {
    targetLiminalPointer.set(0, 0);
    targetWarpPointer.set(0.5, 0.5);
    transitionUniforms.uHasPointer.value = 0;
  }

  function onFieldPointer(event: PointerEvent) {
    const bounds = fieldElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    targetFieldPointer.set(
      (event.clientX - bounds.left) / bounds.width,
      1 - (event.clientY - bounds.top) / bounds.height,
    );
    setPointerPosition(event);
    if (reducedMotion) {
      fieldPointer.copy(targetFieldPointer);
      field.uniforms.uPointer.value.copy(fieldPointer);
      render();
    }
  }

  function clearFieldPointer() {
    targetFieldPointer.set(-1, -1);
    targetWarpPointer.set(0.5, 0.5);
    transitionUniforms.uHasPointer.value = 0;
    if (reducedMotion) {
      fieldPointer.copy(targetFieldPointer);
      field.uniforms.uPointer.value.copy(fieldPointer);
      render();
    }
  }

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
  const titleResizeObserver = new ResizeObserver(updateTitleTextures);
  titleResizeObserver.observe(liminalElement);
  titleResizeObserver.observe(fieldElement);
  titleResizeObserver.observe(liminalTitleElement);
  titleResizeObserver.observe(fieldTitleElement);
  titleResizeObserver.observe(liminalEyebrowElement);
  titleResizeObserver.observe(fieldEyebrowElement);
  document.fonts.addEventListener("loadingdone", onFontsLoaded);
  void document.fonts.ready.then(onFontsLoaded);
  const visibleElements = [liminalElement, document.getElementById("about-work"), fieldElement].filter(
    (element): element is HTMLElement => element !== null,
  );
  const visibleSet = new Set<Element>();
  const visibilityObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleSet.add(entry.target);
      else visibleSet.delete(entry.target);
    }
    visible = visibleSet.size > 0;
    updatePlayback();
  });
  visibleElements.forEach((element) => visibilityObserver.observe(element));
  liminalElement.addEventListener("pointermove", onLiminalPointerMove, { passive: true });
  liminalElement.addEventListener("pointerleave", clearLiminalPointer);
  fieldElement.addEventListener("pointerdown", onFieldPointer, { passive: true });
  fieldElement.addEventListener("pointermove", onFieldPointer, { passive: true });
  fieldElement.addEventListener("pointerleave", clearFieldPointer);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.addEventListener("visibilitychange", updatePlayback);
  window.addEventListener("resize", resize, { passive: true });
  resize();

  return {
    setTransition(value: number) {
      progress = Math.max(0, Math.min(1, value));
      updateTitleMaps();
      if (paused || reducedMotion) render();
    },
    setPaused(value: boolean) {
      paused = value;
      updatePlayback();
    },
    setReducedMotion(value: boolean) {
      reducedMotion = value;
      if (reducedMotion) {
        liminal.uniforms.uTime.value = 0;
        field.uniforms.uTime.value = 0;
      }
      updatePlayback();
    },
    dispose() {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      titleResizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.fonts.removeEventListener("loadingdone", onFontsLoaded);
      liminalElement.removeEventListener("pointermove", onLiminalPointerMove);
      liminalElement.removeEventListener("pointerleave", clearLiminalPointer);
      fieldElement.removeEventListener("pointerdown", onFieldPointer);
      fieldElement.removeEventListener("pointermove", onFieldPointer);
      fieldElement.removeEventListener("pointerleave", clearFieldPointer);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", updatePlayback);
      window.removeEventListener("resize", resize);
      liminalTarget?.dispose();
      fieldTarget?.dispose();
      liminalTitleTexture?.dispose();
      fieldTitleTexture?.dispose();
      liminalEyebrowTexture?.dispose();
      fieldEyebrowTexture?.dispose();
      liminal.dispose();
      field.dispose();
      transitionGeometry.dispose();
      transitionMaterial.dispose();
      renderer.dispose();
      delete canvas.dataset.state;
    },
  };
}
