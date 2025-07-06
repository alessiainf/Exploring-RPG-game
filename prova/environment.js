import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { physicsWorld } from './physics.js';

export const grassMeshes = [];
export const treeMeshes = [];
export let groundMesh = null;

///come sto genstendo la fisica? in pratica in blender creo un mondo con un piano, 
// e degli alberi, poi creo i collider per questi oggetti. cioè identifico le mesh e poi gestsco
// le collisioni con queste mesh nel file physics.js 

// Carica il modello del mondo creato in Blender
export async function loadWorld(scene) {
  // Aspetta che la fisica sia inizializzata
  if (!physicsWorld.ready) {
    console.log('Waiting for physics world to initialize...');
    await physicsWorld.init();
  }

  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.load('assets/models/mondo.glb', function (gltf) {
      const world = gltf.scene;
      world.position.set(0, 0, 0);
      
      world.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
        }
        
        // Identifica il terreno
        if (child.name.toLowerCase().includes("plane") || 
            child.name.toLowerCase().includes("ground") ||
            child.name.toLowerCase().includes("terrain")) {
          groundMesh = child;
          console.log('Ground mesh found:', child.name);
        }
        
        // Identifica l'erba
        if (child.isMesh && child.name.toLowerCase().includes("grass")) {
          grassMeshes.push(child);
        }
        
        // Identifica gli alberi
        if (child.name.toLowerCase().includes("tree")) {
          treeMeshes.push(child);
        }
      });
      
      scene.add(world);
      
      // Aggiungi i collider fisici dopo aver caricato il mondo
      //è una funzione che richiama le funzioni di physics.js per aggiungere i collider (vedi dopo)
      setupWorldPhysics();
      
      console.log('World loaded with physics');
      console.log(`- Ground mesh: ${groundMesh ? groundMesh.name : 'none'}`);
      console.log(`- Trees: ${treeMeshes.length}`);
      console.log(`- Grass patches: ${grassMeshes.length}`);
      
      resolve(world);
    }, 
    function(progress) {
      console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    function (error) {
      console.error('Error loading world model:', error);
      reject(error);
    });
  });
}

// Configura la fisica del mondo
function setupWorldPhysics() {
  if (!physicsWorld.ready) {
    console.warn('Physics world not ready, skipping physics setup');
    return;
  }

  // Aggiungi collider per il terreno
  if (groundMesh) {
    physicsWorld.addGroundCollider(groundMesh);
  }

  // Aggiungi collider per gli alberi
  if (treeMeshes.length > 0) {
    physicsWorld.addTreeColliders(treeMeshes);
  }

  // Puoi aggiungere altri collider qui per oggetti specifici
  // Ad esempio, rocce, edifici, ecc.
}

// Funzione helper per ottenere l'altezza del terreno in una posizione
export function getGroundHeight(x, z) {
  if (physicsWorld.ready) {
    return physicsWorld.getGroundHeight(x, z);
  }
  return 0;
}

// Funzione helper per controllare collisioni
export function checkCollision(origin, direction, maxDistance = 10) {
  if (physicsWorld.ready) {
    return physicsWorld.raycast(origin, direction, maxDistance);
  }
  return null;
}

// Aggiorna l'erba dinamica (manteniamo la funzione esistente)
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

// Pulisci le risorse quando necessario
export function cleanupWorld() {
  grassMeshes.length = 0;
  treeMeshes.length = 0;
  groundMesh = null;
  physicsWorld.cleanup();
}