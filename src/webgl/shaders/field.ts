export const fieldVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fieldFragmentShader = /* glsl */ `
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= aspect;

    if (uPointer.x >= 0.0) {
      vec2 pointer = (uPointer - 0.5) * 2.0;
      pointer.x *= aspect;
      vec2 delta = p - pointer;
      float distanceToPointer = length(delta);
      float ripple = sin(distanceToPointer * 24.0 - uTime * 2.0)
                   * exp(-distanceToPointer * 3.5) * 0.075;
      p -= delta / max(distanceToPointer, 0.001) * ripple;
    }

    float flow = sin(p.x * 4.8 + sin(p.y * 2.0 + uTime * 0.12) * 1.6)
               + sin(p.y * 3.6 - p.x * 1.4) * 0.75;
    float contour = abs(sin(flow * 3.6));
    float lines = 1.0 - smoothstep(0.055, 0.19, contour);
    float haze = exp(-contour * 8.0) * 0.12;
    vec3 background = vec3(0.025, 0.034, 0.033);
    vec3 mint = vec3(0.48, 0.76, 0.61);
    vec3 amber = vec3(0.82, 0.59, 0.38);
    float warmth = smoothstep(-1.1, 1.1, p.x * 0.6 - p.y * 0.25);
    vec3 color = background + mix(mint, amber, warmth) * (lines * 0.72 + haze);
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.012;
    gl_FragColor = vec4(color, 1.0);
  }
`;
