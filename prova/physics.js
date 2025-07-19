import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import * as THREE from 'three';

// Esporta RAPIER per l'uso in altri moduli
export { RAPIER };

export class PhysicsWorld {
  constructor() {
    this.world = null;
    this.ready = false;
    this.staticBodies = [];
    this.meshToBody = new Map();
    this.bodyToMesh = new Map();
  }

  async init() {
    try {
      await RAPIER.init({});

      
      // Crea il mondo fisico con gravità
      const gravity = { x: 0.0, y: -9.81, z: 0.0 };
      this.world = new RAPIER.World(gravity);
      
      this.ready = true;
      console.log('Physics world initialized');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize physics world:', error);
      return false;
    }
  }

  // Aggiunge un collider statico per il terreno
  addGroundCollider(groundMesh) {
    if (!this.ready || !groundMesh) return null;

    try {
      // Ottieni la geometria del mesh
      const geometry = groundMesh.geometry;
      
      if (geometry || groundMesh.name.toLowerCase().includes('plane')) {
        // Per un piano semplice, usa un cuboid collider
        const bbox = new THREE.Box3().setFromObject(groundMesh);
        const size = bbox.getSize(new THREE.Vector3());

        const halfExtents = {
          x: size.x * 0.5,
          y: 0.1,
          z: size.z * 0.5
        };

        const colliderDesc = RAPIER.ColliderDesc.cuboid(
          halfExtents.x,
          halfExtents.y,
          halfExtents.z
        );

        // Posiziona il collider
        const position = groundMesh.getWorldPosition(new THREE.Vector3());
        colliderDesc.setTranslation(position.x, position.y - halfExtents.y, position.z);

        // Applica la rotazione se necessario
        const quaternion = groundMesh.getWorldQuaternion(new THREE.Quaternion());
        colliderDesc.setRotation({ 
          x: quaternion.x, 
          y: quaternion.y, 
          z: quaternion.z, 
          w: quaternion.w 
        });

        const collider = this.world.createCollider(colliderDesc);
        
        this.staticBodies.push(collider);
        this.meshToBody.set(groundMesh, collider);
        this.bodyToMesh.set(collider, groundMesh);

        //console.log('Ground collider added');
        return collider;
      } else {
        // Per geometrie complesse, usa trimesh (più pesante ma preciso)
        //return this.addTrimeshCollider(groundMesh);
      }
    } catch (error) {
      console.error('Error adding ground collider:', error);
      return null;
    }
  }

  // Aggiunge collider per gli alberi (cilindri semplici)
  addTreeColliders(treeMeshes) {
    if (!this.ready || !treeMeshes.length) return [];

    const colliders = [];

    treeMeshes.forEach((treeMesh, index) => {
      try {
        // Calcola le dimensioni approssimative dell'albero
        const bbox = new THREE.Box3().setFromObject(treeMesh);
        const size = bbox.getSize(new THREE.Vector3());
        
        // Usa un cilindro come collider per l'albero
        const radius = Math.max(size.x, size.z) * 0.1; // Raggio del tronco
        const height = size.y * 0.5; // Altezza del tronco (non tutta la chioma)

        const colliderDesc = RAPIER.ColliderDesc.cylinder(height * 0.5, radius);

        // Posiziona il collider
        const position = treeMesh.getWorldPosition(new THREE.Vector3());
        colliderDesc.setTranslation(
          position.x, 
          position.y + height * 0.5, 
          position.z
        );

        const collider = this.world.createCollider(colliderDesc);
        
        this.staticBodies.push(collider);
        this.meshToBody.set(treeMesh, collider);
        this.bodyToMesh.set(collider, treeMesh);

        colliders.push(collider);
      } catch (error) {
        console.error(`Error adding tree collider ${index}:`, error);
      }
    });

    //console.log(`Added ${colliders.length} tree colliders`);
    return colliders;
  }

  // Aggiunge collider statici (box) per le rocce
  addrockColliders(rockMeshes) {
    if (!this.ready || !rockMeshes.length) return [];

    const colliders = [];

    rockMeshes.forEach((rockMesh, index) => {
      try {
        // Calcola il bounding box della roccia
        const bbox = new THREE.Box3().setFromObject(rockMesh);
        const size = bbox.getSize(new THREE.Vector3());

        // Calcola le dimensioni del box (serve metà estensione)
        const halfExtents = {
          x: size.x * 0.3,
          y: size.y * 0.3,
          z: size.z * 0.39
        };

        // Crea un collider box (cuboid)
        const colliderDesc = RAPIER.ColliderDesc.cuboid(
          halfExtents.x,
          halfExtents.y,
          halfExtents.z
        );

        // Calcola la posizione della roccia nel mondo
        const position = rockMesh.getWorldPosition(new THREE.Vector3());

        // Sposta il collider nel punto giusto (metà altezza in Y)
        colliderDesc.setTranslation(
          position.x,
          position.y + halfExtents.y,
          position.z
        );

        // Crea il collider nel mondo fisico
        const collider = this.world.createCollider(colliderDesc);

        // Mappa la mesh al collider
        this.staticBodies.push(collider);
        this.meshToBody.set(rockMesh, collider);
        this.bodyToMesh.set(collider, rockMesh);

        colliders.push(collider);
      } catch (error) {
        console.error(`Errore durante il collider della roccia ${index}:`, error);
      }
    });

  //console.log(`Aggiunti ${colliders.length} collider per rocce`);
  return colliders;
  }

  addColumnColliders(columnMeshes) {
  if (!this.ready || !columnMeshes.length) return [];

  const colliders = [];

  columnMeshes.forEach((columnMeshes, index) => {
    try {
      // Calcola le dimensioni approssimative della statua
      const bbox = new THREE.Box3().setFromObject(columnMeshes);
      const size = bbox.getSize(new THREE.Vector3());
      
      // Usa un cilindro come collider per la statua
      const radius = Math.max(size.x, size.z) * 0.30; // Raggio della base
      const height = size.y * 0.7; // Altezza del collider

      const colliderDesc = RAPIER.ColliderDesc.cylinder(height * 0.5, radius);

      // Posiziona il collider
      const position = columnMeshes.getWorldPosition(new THREE.Vector3());
      colliderDesc.setTranslation(
        position.x-0.9, 
        position.y -3, 
        position.z
      );

      const collider = this.world.createCollider(colliderDesc);
      
      this.staticBodies.push(collider);
      this.meshToBody.set(columnMeshes, collider);
      this.bodyToMesh.set(collider, columnMeshes);

      colliders.push(collider);
    } catch (error) {
      console.error(`Error adding statue collider ${index}:`, error);
    }
  });
  return colliders;
  }


  addStatueColliders(statueMeshes) {
  if (!this.ready || !statueMeshes.length) return [];

  const colliders = [];

  statueMeshes.forEach((statueMesh, index) => {
    try {
      // Calcola le dimensioni approssimative della statua
      const bbox = new THREE.Box3().setFromObject(statueMesh);
      const size = bbox.getSize(new THREE.Vector3());
      
      // Usa un cilindro come collider per la statua
      const radius = Math.max(size.x, size.z) * 0.25; // Raggio della base
      const height = size.y * 0.7; // Altezza del collider

      const colliderDesc = RAPIER.ColliderDesc.cylinder(height * 0.5, radius);

      // Posiziona il collider
      const position = statueMesh.getWorldPosition(new THREE.Vector3());
      colliderDesc.setTranslation(
        position.x, 
        position.y + height * 0.01, 
        position.z
      );

      const collider = this.world.createCollider(colliderDesc);
      
      this.staticBodies.push(collider);
      this.meshToBody.set(statueMesh, collider);
      this.bodyToMesh.set(collider, statueMesh);

      colliders.push(collider);
    } catch (error) {
      console.error(`Error adding statue collider ${index}:`, error);
    }
  });

  return colliders;
  }

  // Aggiunge collider cilindrico per il mago
  addWizardCollider(wizardMesh) {
  if (!this.ready || !wizardMesh) return null;

  try {
    // Calcola le dimensioni approssimative del mago
    const bbox = new THREE.Box3().setFromObject(wizardMesh);
    const size = bbox.getSize(new THREE.Vector3());
    
    // Usa un cilindro come collider per il mago
    const radius = Math.max(size.x, size.z) * 0.02; // Raggio più piccolo per il mago
    const height = size.y * 0.6; // Altezza del collider

    const colliderDesc = RAPIER.ColliderDesc.cylinder(height * 0.5, radius);

    // Posiziona il collider
    const position = wizardMesh.getWorldPosition(new THREE.Vector3());
    colliderDesc.setTranslation(
      position.x, 
      position.y + height * 0.5, 
      position.z
    );

    const collider = this.world.createCollider(colliderDesc);
    
    this.staticBodies.push(collider);
    this.meshToBody.set(wizardMesh, collider);
    this.bodyToMesh.set(collider, wizardMesh);

    return collider;
  } catch (error) {
    console.error('Error adding wizard collider:', error);
    return null;
  }
  }


  addMushroomCollider(mushroomGroup) {
  if (!this.ready || !mushroomGroup) return null;

  try {
    const bbox = new THREE.Box3().setFromObject(mushroomGroup);
    const size = bbox.getSize(new THREE.Vector3());

    // Definisce un collider a base cilindrica come tronco fungo
    const radius = Math.max(size.x, size.z) *16;
    const height = size.y * 30;

    const colliderDesc = RAPIER.ColliderDesc.cylinder(height * 0.7, radius);

    const position = mushroomGroup.getWorldPosition(new THREE.Vector3());
    colliderDesc.setTranslation(
      position.x,
      position.y+2,  // sollevato un po' da terra
      position.z-0.2
    );

    const collider = this.world.createCollider(colliderDesc);

    this.staticBodies.push(collider);
    this.meshToBody.set(mushroomGroup, collider);
    this.bodyToMesh.set(collider, mushroomGroup);
    return collider;
  } catch (error) {
    console.error('Error adding mushroom collider:', error);
    return null;
  }

  }

  addCrateColliders(crateMeshes) {
  if (!this.ready || !crateMeshes.length) return [];

  const colliders = [];

  crateMeshes.forEach((crateMesh, index) => {
    try {
      const bbox = new THREE.Box3().setFromObject(crateMesh);
      const size = bbox.getSize(new THREE.Vector3());

      const halfExtents = {
        x: size.x * 0.5,
        y: size.y * 0.5,
        z: size.z * 0.5
      };

      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        halfExtents.x, halfExtents.y, halfExtents.z
      );

      const position = crateMesh.getWorldPosition(new THREE.Vector3());
      colliderDesc.setTranslation(
        position.x,
        position.y + halfExtents.y,
        position.z
      );

      const collider = this.world.createCollider(colliderDesc);
      this.staticBodies.push(collider);
      this.meshToBody.set(crateMesh, collider);
      this.bodyToMesh.set(collider, crateMesh);
      colliders.push(collider);
    } catch (error) {
      console.error(`Error adding crate collider ${index}:`, error);
    }
  });

  return colliders;
  }

  addStandColliders(standMeshes) {
  if (!this.ready || !standMeshes.length) return [];

  const colliders = [];

  standMeshes.forEach((standMesh, index) => {
    try {
      const bbox = new THREE.Box3().setFromObject(standMesh);
      const size = bbox.getSize(new THREE.Vector3());

      const halfExtents = {
        x: size.x * 0.5,
        y: size.y * 0.5,
        z: size.z * 0.5
      };

      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        halfExtents.x, halfExtents.y, halfExtents.z
      );

      const position = standMesh.getWorldPosition(new THREE.Vector3());
      colliderDesc.setTranslation(
        position.x,
        position.y + halfExtents.y,
        position.z
      );

      const collider = this.world.createCollider(colliderDesc);
      this.staticBodies.push(collider);
      this.meshToBody.set(standMesh, collider);
      this.bodyToMesh.set(collider, standMesh);
      colliders.push(collider);
    } catch (error) {
      console.error(`Error adding stand collider ${index}:`, error);
    }
  });

  return colliders;
  }

  // Aggiunge un collider sferico statico per l'ape
// Aggiunge un collider sferico statico per l'ape
addBeeCollider(beeMesh) {
  if (!this.ready || !beeMesh) return null;

  try {
    const radius = 0.5;  // Raggio fisso della sfera
    const colliderDesc = RAPIER.ColliderDesc.ball(radius);

    // Prendi posizione dell’ape
    const position = beeMesh.getWorldPosition(new THREE.Vector3());
    colliderDesc.setTranslation(position.x, position.y + radius, position.z);

    const collider = this.world.createCollider(colliderDesc);

    this.staticBodies.push(collider);
    this.meshToBody.set(beeMesh, collider);
    this.bodyToMesh.set(collider, beeMesh);

    return collider;
  } catch (error) {
    console.error('Error adding bee collider:', error);
    return null;
  }
}







  addMapBoundaries(areaWidth = 100, areaDepth = 100, wallHeight = 20, wallThickness = 2, centerX = 30, centerZ =-6) {
  if (!this.ready) return [];

  const colliders = [];

  const halfW = areaWidth / 2;
  const halfD = areaDepth / 2;
  const halfH = wallHeight / 2;
  const halfT = wallThickness / 2;

  const walls = [
    // Nord
    {
      position: { x: centerX, y: halfH, z: centerZ - halfD - halfT },
      size: { x: halfW, y: halfH, z: halfT }
    },
    // Sud
    {
      position: { x: centerX, y: halfH, z: centerZ + halfD + halfT },
      size: { x: halfW, y: halfH, z: halfT }
    },
    // Ovest
    {
      position: { x: centerX - halfW - halfT, y: halfH, z: centerZ },
      size: { x: halfT, y: halfH, z: halfD }
    },
    // Est
    {
      position: { x: centerX + halfW + halfT, y: halfH, z: centerZ },
      size: { x: halfT, y: halfH, z: halfD }
    }
  ];

  for (const { position, size } of walls) {
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z);
    colliderDesc.setTranslation(position.x, position.y, position.z);
    const collider = this.world.createCollider(colliderDesc);
    this.staticBodies.push(collider);
    colliders.push(collider);
  }
  this.boundaryParams = { areaWidth, areaDepth, centerX, centerZ };

  return colliders;
  }

  isOutsideMap(position) {
    const { centerX, centerZ, areaWidth, areaDepth } = this.boundaryParams;
    const x = position.x, z = position.z;
    const margin = 5; // quanto puoi uscire prima che scatti l’easter egg

    return (
      x < centerX - areaWidth / 2 - margin || x > centerX + areaWidth / 2 + margin ||
      z < centerZ - areaDepth / 2 - margin || z > centerZ + areaDepth / 2 + margin
    );
  }






  // Aggiorna il mondo fisico
  update(deltaTime) {
    if (!this.ready) return;
    
    // Step della simulazione fisica
    this.world.step();
  }



  // Raycast per controllare collisioni
  raycast(origin, direction, maxDistance = 1000) {
    if (!this.ready) return null;

    const ray = new RAPIER.Ray(origin, direction);
    const hit = this.world.castRay(ray, maxDistance, true);

    if (hit) {
      const collider = hit.collider;
      const mesh = this.bodyToMesh.get(collider);
      
      return {
        point: ray.pointAt(hit.toi),
        normal: hit.normal,
        distance: hit.toi,
        collider: collider,
        mesh: mesh
      };
    }

    return null;
  }

  // Pulisci le risorse
  cleanup() {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.staticBodies = [];
    this.meshToBody.clear();
    this.bodyToMesh.clear();
    this.ready = false;
  }
}


//funzione per visualizzare i collider statici nel mondo fisico
export function visualizeColliders(scene) {
  if (!physicsWorld.ready) return [];

  const material = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
    depthTest: false
  });

  const visualMeshes = [];

  for (const collider of physicsWorld.staticBodies) {
    let shape;
    try {
      shape = collider.shape;
      if (!shape) continue;
    } catch (e) {
      console.warn("Collider shape not accessible", collider);
      continue;
    }

    let geometry;
    const pos = collider.translation();
    const rot = collider.rotation();

    try {
      if (shape.type === RAPIER.ShapeType.Cuboid) {
        geometry = new THREE.BoxGeometry(
          shape.halfExtents.x * 2,
          shape.halfExtents.y * 2,
          shape.halfExtents.z * 2
        );
      } else if (shape.type === RAPIER.ShapeType.Cylinder) {
        geometry = new THREE.CylinderGeometry(
          shape.radius,
          shape.radius,
          shape.halfHeight * 2,
          16
        );
      } else if (shape.type === RAPIER.ShapeType.TriMesh) {
        const vertices = shape.vertices();
        const indices = shape.indices();
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      } else if (shape.type === RAPIER.ShapeType.Ball) {
        geometry = new THREE.SphereGeometry(
          shape.radius,
          16,
          16
        );
      } else {
        console.warn("Unsupported shape:", shape.type);
        continue;
      }
    } catch (err) {
      console.warn("Error creating geometry for shape", shape, err);
      continue;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    scene.add(mesh);
    visualMeshes.push(mesh);
  }

  return visualMeshes;
}






// Istanza globale del mondo fisico
export const physicsWorld = new PhysicsWorld();