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
      
      if (geometry.isPlaneGeometry || groundMesh.name.toLowerCase().includes('plane')) {
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

        console.log('Ground collider added');
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

    console.log(`Added ${colliders.length} tree colliders`);
    return colliders;
  }

  /*
  // Aggiunge collider trimesh per geometrie complesse
  addTrimeshCollider(mesh) {
    if (!this.ready || !mesh) return null;

    try {
      const geometry = mesh.geometry;
      
      // Ottieni i vertici e gli indici
      const vertices = geometry.attributes.position.array;
      const indices = geometry.index ? geometry.index.array : null;

      // Applica la trasformazione del mesh ai vertici
      const worldMatrix = mesh.matrixWorld;
      const transformedVertices = new Float32Array(vertices.length);
      
      for (let i = 0; i < vertices.length; i += 3) {
        const vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        vertex.applyMatrix4(worldMatrix);
        transformedVertices[i] = vertex.x;
        transformedVertices[i + 1] = vertex.y;
        transformedVertices[i + 2] = vertex.z;
      }

      let colliderDesc;
      if (indices) {
        colliderDesc = RAPIER.ColliderDesc.trimesh(transformedVertices, indices);
      } else {
        // Se non ci sono indici, crea indici sequenziali
        const autoIndices = new Uint32Array(vertices.length / 3);
        for (let i = 0; i < autoIndices.length; i++) {
          autoIndices[i] = i;
        }
        colliderDesc = RAPIER.ColliderDesc.trimesh(transformedVertices, autoIndices);
      }

      const collider = this.world.createCollider(colliderDesc);
      
      this.staticBodies.push(collider);
      this.meshToBody.set(mesh, collider);
      this.bodyToMesh.set(collider, mesh);

      console.log('Trimesh collider added for', mesh.name || 'unnamed mesh');
      return collider;
    } catch (error) {
      console.error('Error adding trimesh collider:', error);
      return null;
    }
  }
*/
  

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

  console.log("Collider wireframes visualizzati.");
  return visualMeshes;
}




// Istanza globale del mondo fisico
export const physicsWorld = new PhysicsWorld();