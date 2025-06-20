// characterController.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';

export class CharacterController {
  constructor(scene, world, camera, controls) {
    this.scene = scene;
    this.world = world;
    this.camera = camera;
    this.controls = controls;

    this.clock = new THREE.Clock();
    this.mixer = null;
    this.player = null;
    this.runAction = null;
    this.walkAction = null;
    this.currentAction = null;
    this.playerBody = null;
    this.debugMesh = null;
    this.halfExtents = null;
    this.chestBone = null;
    this.modelOffsetY = 0;

    // Telecamera in terza persona
    this.thirdPersonCamera = null;

    this.keysPressed = {};
    this.moveSpeed = 15;
    this.runMultiplier = 1.4; // Aumentiamo il moltiplicatore per la corsa

    this.init();
    this.addListeners();
  }

  addListeners() {
    window.addEventListener('keydown', e => this.keysPressed[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => this.keysPressed[e.key.toLowerCase()] = false);
  }

  isMoving() {
    return this.keysPressed['w'] || this.keysPressed['a'] || this.keysPressed['s'] || this.keysPressed['d'];
  }

  init() {
    const loader = new GLTFLoader();
    loader.load('assets/models/witch.glb', gltf => {
      const model = gltf.scene;
      this.player = model;

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.mixer = new THREE.AnimationMixer(model);

      this.walkAction = THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Walk') ? this.mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Walk')) : null;
      this.runAction = THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Run') ? this.mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Run')) : null;

      this.chestBone = model.getObjectByName('Chest');

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const minY = box.min.y;

      const physicsY = size.y / 2;
      this.halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);

      this.playerBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(this.halfExtents),
        position: new CANNON.Vec3(0, physicsY, 0),
        fixedRotation: true,  // IMPORTANTE: tieni fisso per stabilità
        linearDamping: 0.9,
        material: new CANNON.Material({
          friction: 0.4,
          restitution: 0.0
        })
      });
      this.world.addBody(this.playerBody);

      const debugGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const debugMat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff0000 });
      this.debugMesh = new THREE.Mesh(debugGeo, debugMat);

      this.scene.add(this.debugMesh);

      this.modelOffsetY = -minY;
      model.position.y = this.modelOffsetY;
      this.scene.add(model);

      // Inizializza la telecamera in terza persona
      this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.player);
      
      // Disabilita i controlli orbit ora che usiamo la telecamera in terza persona
      if (this.controls) {
        this.controls.enabled = false;
      }
    });
  }

  update() {
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);

    if (this.playerBody && this.thirdPersonCamera) {
      // Ottieni le direzioni della telecamera
      const forward = this.thirdPersonCamera.getForwardDirection();
      const right = this.thirdPersonCamera.getRightDirection();
      
      const direction = new THREE.Vector3();

      // Calcola movimento basato sulla direzione della telecamera
      if (this.keysPressed['w']) {
        direction.add(forward);
      }
      if (this.keysPressed['s']) {
        direction.add(forward.clone().multiplyScalar(-1));
      }
      if (this.keysPressed['a']) {
        direction.add(right.clone().multiplyScalar(-1));
      }
      if (this.keysPressed['d']) {
        direction.add(right);
      }

      if (direction.length() > 0) {
        // IMPORTANTE: Normalizza SEMPRE la direzione per evitare velocità diverse
        direction.normalize();
        
        const speed = this.moveSpeed * (this.keysPressed['shift'] ? this.runMultiplier : 1);
        
        // Applica movimento al corpo fisico
        this.playerBody.velocity.x = direction.x * speed;
        this.playerBody.velocity.z = direction.z * speed;

        // Ruota il personaggio nella direzione del movimento
        const angle = Math.atan2(direction.x, direction.z);
        if (this.player) {
          // Rotazione solo del modello 3D, non del corpo fisico
          this.player.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);

          // Aggiungi questa riga per ruotare anche il corpo fisico
          this.playerBody.quaternion.copy(this.player.quaternion);
                  }
      } else {
        // Damping per fermarsi
        this.playerBody.velocity.x *= 0.9;
        this.playerBody.velocity.z *= 0.9;
      }
    }

    // Gestione animazioni
    if (this.mixer && this.walkAction && this.runAction) {
      const moving = this.isMoving();
      const running = moving && this.keysPressed['shift'];
      const targetAction = moving
        ? (running ? this.runAction : this.walkAction)
        : null;

      if (targetAction && this.currentAction !== targetAction) {
        if (this.currentAction) this.currentAction.fadeOut(0.2);
        targetAction.reset().fadeIn(0.2).play();
        this.currentAction = targetAction;
      }

      if (!targetAction && this.currentAction) {
        this.currentAction.fadeOut(0.2);
        this.currentAction = null;
      }
    }

    // Aggiorna posizioni
    if (this.player && this.playerBody && this.debugMesh) {
      this.player.position.x = this.playerBody.position.x;
      this.player.position.y = (this.playerBody.position.y - this.halfExtents.y) + this.modelOffsetY;
      this.player.position.z = this.playerBody.position.z;
      // NON copiare la rotazione del corpo fisico (che è fissa)

      this.debugMesh.position.copy(this.playerBody.position);
      this.debugMesh.quaternion.copy(this.playerBody.quaternion);
    }

    // Aggiorna telecamera in terza persona
    if (this.thirdPersonCamera) {
      this.thirdPersonCamera.update();
    }

    // Animazione respiro quando fermo
    if (this.player && this.chestBone && !this.isMoving()) {
      const t = performance.now() / 1000;
      this.chestBone.rotation.x = Math.sin(t * 2.0) * 0.02;
    }
  }

  getPlayerPosition() {
    return this.player ? this.player.position : new THREE.Vector3();
  }
}