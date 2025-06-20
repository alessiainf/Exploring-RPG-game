// lighting.js
import * as THREE from 'three';

export function setupLights(scene) {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.set(4096, 4096);
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);

  scene.add(directionalLight);
  scene.add(ambientLight);

  return {
    directionalLight,
    ambientLight
  };
}
