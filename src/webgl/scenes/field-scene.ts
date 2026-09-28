import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2 } from "three";
import { fieldFragmentShader, fieldVertexShader } from "@/webgl/shaders/field";

export function createFieldScene() {
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

  return {
    scene,
    camera,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
