// GLSL stays in strings so both Next.js bundlers work without a custom loader.
export const liminalVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const liminalFragmentShader = /* glsl */ `
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;
  // Experiment panel controls (Phase 3). Defaults reproduce the original look.
  uniform float uDensity;
  uniform float uPalette;
  // Optional generative-audio level (0..1). Stays 0 when sound is off or reduced motion is set.
  uniform float uAudioLevel;
  varying vec2 vUv;

  mat2 rotate(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    float portrait = 1.0 - smoothstep(0.75, 1.2, aspect);
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= aspect;
    // Fit the entire form in portrait as well as landscape viewports.
    p /= min(aspect * mix(0.73, 0.98, portrait), 1.08);
    p.y -= 0.05;
    p -= uPointer * 0.045;
    p = rotate(-0.38 - portrait * 0.52 + sin(uTime * 0.12) * 0.07) * p;
    p.y /= 0.66;

    float angle = atan(p.y, p.x);
    float radius = length(p);
    float phase = uTime * 0.23;
    float wave = sin(angle * 3.0 + phase) * 0.065
               + sin(angle * 2.0 - phase * 0.7) * 0.09;
    float center = 0.79 + wave;
    float width = 0.19 + 0.075 * sin(angle * 2.0 + phase + 0.6);
    float band = (radius - center) / width;
    float envelope = 1.0 - smoothstep(0.72, 1.0, abs(band));
    float surface = sqrt(max(0.0, 1.0 - band * band));

    // Parallel contours curl around a breathing, asymmetric annulus.
    // uDensity (default 1.0) scales the contour line count for the experiment panel.
    float lineCount = mix(12.0, 23.0, smoothstep(350.0, 1000.0, uResolution.x)) * uDensity;
    float contour = band * lineCount + sin(angle * 3.0 - phase) * 2.0
                  + sin(angle * 7.0 + band * 2.0 + phase) * 0.35;
    float ridge = abs(sin(contour * 3.14159265));
    float aa = max(fwidth(contour) * 1.3, 0.025);
    float threads = 1.0 - smoothstep(0.12, 0.12 + aa, ridge);
    float light = 0.48 + 0.52 * sin(angle + phase * 0.4 + band * 0.85);
    vec3 cool = vec3(0.34, 0.66, 0.72);
    vec3 pearl = vec3(0.85, 0.88, 0.72);
    vec3 violet = vec3(0.60, 0.51, 0.77);
    // uPalette (0, 1, 2) swaps the hue triad used by the experiment panel; 0 is the original look.
    vec3 warmA = vec3(0.86, 0.47, 0.33);
    vec3 warmB = vec3(0.93, 0.78, 0.45);
    vec3 warmC = vec3(0.74, 0.32, 0.46);
    vec3 monoA = vec3(0.58, 0.58, 0.58);
    vec3 monoB = vec3(0.86, 0.86, 0.86);
    vec3 monoC = vec3(0.34, 0.34, 0.34);
    vec3 paletteA = mix(cool, warmA, step(0.5, uPalette)) * step(uPalette, 1.5) + monoA * step(1.5, uPalette);
    vec3 paletteB = mix(pearl, warmB, step(0.5, uPalette)) * step(uPalette, 1.5) + monoB * step(1.5, uPalette);
    vec3 paletteC = mix(violet, warmC, step(0.5, uPalette)) * step(uPalette, 1.5) + monoC * step(1.5, uPalette);
    vec3 tint = mix(paletteA, paletteB, smoothstep(-0.65, 0.8, sin(angle - 0.8)));
    tint = mix(tint, paletteC, smoothstep(0.1, 1.0, cos(angle + phase * 0.2)) * 0.6);

    float halo = exp(-abs(radius - center) * 13.0) * 0.045 * (1.0 + uAudioLevel * 2.5);
    float filaments = envelope * (0.08 * surface + threads * (0.4 + surface * 0.6)) * (1.0 + uAudioLevel * 0.3);
    vec3 color = vec3(0.031, 0.035, 0.039);
    color += tint * (filaments * (0.35 + light * 0.95) + halo);
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.012;
    gl_FragColor = vec4(color, 1.0);
  }
`;
