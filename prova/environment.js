import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { physicsWorld } from './physics.js';
import { statues, wizard} from './Statuegame.js';
import { mushrooms} from './MushroomRiddle.js';

export const grassMeshes = [];
export const flowerMeshes = [];
export const treeMeshes = [];
export const rockMeshes = [];
export const columnMeshes = [];
export let groundMesh = null;

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
        if (child.name.toLowerCase().includes("plane")) {
          groundMesh = child;
          child.material = new THREE.MeshStandardMaterial({ color: 0x3C7626}); // forest green
        }
        
        // Identifica l'erba
        if (child.isMesh && child.name.toLowerCase().includes("grass")) {
          grassMeshes.push(child);
        }

        // Identifica i fiori
        if (child.isMesh && child.name.toLowerCase().includes("flower")) {
          flowerMeshes.push(child);
        }
        
        // Identifica gli alberi
        if (child.name.toLowerCase().includes("tree")) {
          treeMeshes.push(child);
        }

        // Identifica le rocce
        if (child.name.toLowerCase().includes("rock")) {
          rockMeshes.push(child);
        }

        // Identifica colonne
        if (child.name.toLowerCase().includes("column")) {
          columnMeshes.push(child);
        }
      });
      
      scene.add(world);
      
      // Aggiungi i collider fisici dopo aver caricato il mondo
      setupWorldPhysics();
      
      console.log('World loaded with physics');
      
      resolve(world);
    }, 
    function(progress) {
      // console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
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

  // Aggiungi collider per le rocce
  if (rockMeshes.length > 0) {
    physicsWorld.addrockColliders(rockMeshes);
  }

  // Aggiungi collider per le statue (se già caricate)
  if (columnMeshes.length > 0) {
    physicsWorld.addColumnColliders(columnMeshes);
  }

   // Aggiungi collider per le colonne (se già caricate)
  if (statues.length > 0) {
    physicsWorld.addStatueColliders(statues);
  }

  // Aggiungi collider per il mago (se già caricato)
  if (wizard) {
    physicsWorld.addWizardCollider(wizard);
  }

    // Aggiungi collider per il fungo
  if (mushrooms.length > 0) {
    physicsWorld.addMushroomCollider(mushrooms[0]);
  }

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

// Aggiorna l'erba dinamica 
export function updateGrass(playerPosition, time) {
  grassMeshes.forEach((mesh, i) => {
    const baseSway = Math.sin(time + i * 0.3) * 0.1;
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

// Aggiorna i fiori dinamici
export function updateFlower(playerPosition, time) {
  flowerMeshes.forEach((mesh, i) => {
    const baseSway = Math.sin(time + i * 0.3) * 0.1;

    const targetX = baseSway * 0.3;
    const targetZ = baseSway * 0.3;

    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetX, 0.05);
    mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetZ, 0.05);
  });
}


/*
export function addProceduralFloor(scene, size = 300, segments = 30) {
  const floorGroup = new THREE.Group();
  const tileSize = size / segments;

  const material = new THREE.MeshStandardMaterial({
    color: 0x3C7626, // verde oliva scuro
    roughness: 1,
    metalness: 0,
  });

  // === CREAZIONE DEL PAVIMENTO ===
  for (let x = -size / 2; x < size / 2; x += tileSize) {
    for (let z = -size / 2; z < size / 2; z += tileSize) {
      const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
      const tile = new THREE.Mesh(geometry, material);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x + tileSize / 2, -0.1, z + tileSize / 2);
      tile.receiveShadow = true;
      floorGroup.add(tile);
    }
  }

  scene.add(floorGroup);

  // === ALBERI ED ERBA RANDOMICI FUORI DAL CENTRO ===
  const addRandomObjects = () => {
    const treeCount = 400;   // Aumentato
    const grassCount = 3000;  // Aumentato
    const exclusionRadius = 30; // zona interna senza oggetti (muri)

        const exclusionCenterX = 30;
    const exclusionCenterZ = -6;
    const exclusionWidth = 100;
    const exclusionDepth = 100;

    function isOutsideWalls(x, z) {
      return (
        x < exclusionCenterX - exclusionWidth / 2 ||
        x > exclusionCenterX + exclusionWidth / 2 ||
        z < exclusionCenterZ - exclusionDepth / 2 ||
        z > exclusionCenterZ + exclusionDepth / 2
      );
    }

    // === Alberi ===
    for (let i = 0; i < treeCount; i++) {
      const tree = treeMeshes[0]?.clone();
      if (!tree) continue;

      let x, z;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * size;
        z = (Math.random() - 0.5) * size;
        attempts++;
        if (attempts > 100) break; // evita loop infiniti
      } while (!isOutsideWalls(x, z));

      tree.position.set(x, 0, z);
      tree.castShadow = true;
      tree.receiveShadow = true;

      const scale = 0.8 + Math.random() * 0.6;
      tree.scale.set(scale, scale, scale);
      scene.add(tree);
    }

    // === Erba ===
    for (let i = 0; i < grassCount; i++) {
      const grass = grassMeshes[0]?.clone();
      if (!grass) continue;

      let x, z;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * size;
        z = (Math.random() - 0.5) * size;
        attempts++;
        if (attempts > 100) break;
      } while (!isOutsideWalls(x, z));

      grass.position.set(x, 0, z);
      grass.rotation.y = Math.random() * Math.PI * 2;

      const scale = 0.5 + Math.random() * 0.5;
      grass.scale.set(scale, scale, scale);

      grass.castShadow = true;
      grass.receiveShadow = true;

      scene.add(grass);
    }
  };

  addRandomObjects();
}

*/


// Pulisci le risorse quando necessario
export function cleanupWorld() {
  grassMeshes.length = 0;
  flowerMeshes.length = 0;
  treeMeshes.length = 0;
  rockMeshes.length = 0;
  columnMeshes.length = 0;
  groundMesh = null;
  physicsWorld.cleanup();
}