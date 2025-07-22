// lighting.js
import * as THREE from 'three';

let currentLights = null;

export function setupLights(scene) {
  // Luce ambientale viola/blu soft
const ambientLight = new THREE.AmbientLight(0x554477, 0.5); 
 // viola profondo e meno intenso


  // Luce direzionale più morbida, con ombre se necessario
const directionalLight = new THREE.DirectionalLight(0xaa88ff, 1.0);
directionalLight.position.set(-30, 80, 10);
directionalLight.target.position.set(12, 0, -3); 
scene.add(directionalLight.target);

//const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
//scene.add(helper);

  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.set(4096, 4096);
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 140;
  directionalLight.shadow.camera.left = -140;
  directionalLight.shadow.camera.right = 140;
  directionalLight.shadow.camera.top = 140;
  directionalLight.shadow.camera.bottom = -140;
  directionalLight.shadow.bias = -0.0001;  
  directionalLight.shadow.radius = 0; 

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