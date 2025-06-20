// environment.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const grassMeshes = [];
export const treeMeshes = [];
export let groundMesh = null;


// Carica il modello del mondo creato in Blender
export function loadWorld(scene) {
  const loader = new GLTFLoader();
  loader.load('assets/models/mondo.glb', function (gltf) {
    const world = gltf.scene;
    world.position.set(0, 0, 0); // modifica se vuoi spostarlo
    world.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.name.toLowerCase().includes("plane")) {
        groundMesh = child;
      }
      if (child.isMesh && child.name.includes("Grass")) {
        grassMeshes.push(child);
      // Salva le mesh degli alberi
  }
        if (child.name.toLowerCase().includes("tree")) {
        treeMeshes.push(child);
        //console.log(child.name);
        }
    });
    //gltf.scene.traverse(obj => console.log(obj.name));
    scene.add(world);
  }, undefined, function (error) {
    console.error('Error loading world model:', error);
  });
}


export function updateGrass(playerPosition, time) {
  grassMeshes.forEach((mesh, i) => {
    const baseSway = Math.sin(time + i * 0.3) * 0.05;
    const distance = mesh.position.distanceTo(playerPosition);

    if (distance < 1.5) {
      const away = new THREE.Vector3().subVectors(mesh.position, playerPosition).normalize();
      const angle = Math.atan2(away.z, away.x);
      const targetX = 0.1 * Math.cos(angle);
      const targetZ = 0.1 * Math.sin(angle);

      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetX, 0.2);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetZ, 0.2);
    } else {
      const targetX = baseSway * 0.3;
      const targetZ = baseSway * 0.3;

      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetX, 0.05);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetZ, 0.05);
    }
  });
}

