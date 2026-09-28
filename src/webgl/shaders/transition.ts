export const transitionVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const transitionFragmentShader = /* glsl */ `
  uniform sampler2D uLiminal;
  uniform sampler2D uField;
  uniform sampler2D uLiminalTitle;
  uniform sampler2D uFieldTitle;
  uniform sampler2D uLiminalEyebrow;
  uniform sampler2D uFieldEyebrow;
  uniform vec2 uPointer;
  uniform vec4 uLiminalTitleMap;
  uniform vec4 uFieldTitleMap;
  uniform vec4 uLiminalEyebrowMap;
  uniform vec4 uFieldEyebrowMap;
  uniform float uHasPointer;
  uniform float uProgress;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  void main() {
    float progress = clamp(uProgress, 0.0, 1.0);
    float peakPosition = (progress - 0.5) * 3.7;
    float peak = exp(-(peakPosition * peakPosition))
               * smoothstep(0.04, 0.28, progress)
               * (1.0 - smoothstep(0.74, 0.98, progress));
    vec2 center = mix(vec2(0.5), uPointer, 0.28 * uHasPointer);
    vec2 radial = vUv - center;
    float radius = max(length(radial), 0.001);
    vec2 direction = radial / radius;
    float broadNoise = noise(vUv * vec2(4.0, 5.5) + vec2(progress * 2.1, -progress));
    float fineNoise = noise(vUv * vec2(13.0, 10.0) - vec2(progress * 3.0, progress * 1.7));

    vec2 warpedUv = center + radial * (1.0 + peak * (1.0 + broadNoise * 0.8));
    warpedUv -= direction * peak * (0.34 + broadNoise * 0.18)
              * (1.0 - smoothstep(0.0, 0.95, radius));
    warpedUv.x += peak * (sin(vUv.y * 8.0 + progress * 5.0) * 0.16
                        + (fineNoise - 0.5) * 0.34);
    warpedUv.y += peak * (sin(vUv.x * 5.0 - progress * 4.0) * 0.08
                        + (broadNoise - 0.5) * 0.22);

    float edgeNoise = noise(warpedUv * vec2(7.0, 9.0) + vec2(progress * 3.0, -progress * 2.0));
    float fieldReveal = smoothstep(0.49, 0.91, progress + (edgeNoise - 0.5) * 0.88);
    vec4 liminal = texture2D(uLiminal, warpedUv);
    vec4 field = texture2D(uField, warpedUv);
    vec2 titleWarp = center + (warpedUv - center) * (1.0 + peak * 0.24);
    titleWarp.x += peak * (fineNoise - 0.5) * 0.12;
    titleWarp.y += peak * (broadNoise - 0.5) * 0.08;
    vec2 liminalTitleUv = titleWarp * uLiminalTitleMap.xy + uLiminalTitleMap.zw;
    vec2 fieldTitleUv = titleWarp * uFieldTitleMap.xy + uFieldTitleMap.zw;
    vec4 liminalTitle = texture2D(uLiminalTitle, liminalTitleUv);
    vec4 fieldTitle = texture2D(uFieldTitle, fieldTitleUv);
    vec2 subtitleWarp = vUv + (warpedUv - vUv) * 0.84;
    vec2 liminalEyebrowUv = subtitleWarp * uLiminalEyebrowMap.xy + uLiminalEyebrowMap.zw;
    vec2 fieldEyebrowUv = subtitleWarp * uFieldEyebrowMap.xy + uFieldEyebrowMap.zw;
    vec4 liminalEyebrow = texture2D(uLiminalEyebrow, liminalEyebrowUv);
    vec4 fieldEyebrow = texture2D(uFieldEyebrow, fieldEyebrowUv);
    float fieldEyebrowReveal = smoothstep(
      0.49,
      0.91,
      progress - 0.025 + (edgeNoise - 0.5) * 0.88
    );
    vec4 color = mix(liminal, field, fieldReveal);
    color.rgb = mix(color.rgb, liminalTitle.rgb, liminalTitle.a * (1.0 - fieldReveal));
    color.rgb = mix(color.rgb, fieldTitle.rgb, fieldTitle.a * fieldReveal);
    color.rgb = mix(color.rgb, liminalEyebrow.rgb, liminalEyebrow.a * (1.0 - fieldEyebrowReveal));
    color.rgb = mix(color.rgb, fieldEyebrow.rgb, fieldEyebrow.a * fieldEyebrowReveal);
    gl_FragColor = color;
  }
`;
