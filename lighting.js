// lighting.js
import * as THREE from 'three';

let currentLights = null;

export function setupLights(scene) {

  // Luce ambientale soft viola/blu
  const ambientLight = new THREE.AmbientLight(0x554477, 0.3); 

  // Luce direzionale 
  const directionalLight = new THREE.DirectionalLight(0xaa88ff, 0.7);
  directionalLight.position.set(-30, 80, 10);
  directionalLight.target.position.set(12, 0, -3);
  scene.add(directionalLight.target);

  // Ombre attive
  directionalLight.castShadow = true;
  //directionalLight.shadow.mapSize.set(4096, 4096);
  directionalLight.shadow.mapSize.set(8192, 8192); 

  directionalLight.shadow.camera.near = 10;
  directionalLight.shadow.camera.far = 140;
  directionalLight.shadow.camera.left = -80;
  directionalLight.shadow.camera.right = 80;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -80;

  // normalBias per evitare artefatti 
  directionalLight.shadow.normalBias = 0.03;

  scene.add(ambientLight);
  scene.add(directionalLight);

  currentLights = {
    ambientLight,
    directionalLight
  };

  return currentLights;
}

export function getLights() {
  return currentLights;
}
