import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { physicsWorld, RAPIER } from './physics.js';

export class CharacterController {
    constructor(scene, camera, controls) {

        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.clock = new THREE.Clock();
        this.mixer = null;
        this.player = null;
        this.modelOffsetY = 0;
        this.frozen = false;
        this.thirdPersonCamera = null;

        //Animazioni
        this.walkAction = null;
        this.runAction = null;
        this.idleAction = null;
        this.currentAction = null;
        this.chestBone = null;

        // Proprietà fisiche
        this.rigidBody = null;
        this.collider = null;
        this.characterHeight = 1.8;
        this.characterRadius = 0.3;
        this.groundCheckDistance = 0.1;
        this.moveSpeed = 4; // Velocità di camminata
        this.runSpeedMultiplier = 4; // Moltiplicatore per la corsa
        this.rotationSpeed = 0.1; // Velocità di rotazione del personaggio

        // Visualizzazione debug
        this.debugWireframe = null;
        this.showWireframe = false;

        // Sincronizzazione fisica
        this.physicsPosition = new THREE.Vector3();
        this.visualPosition = new THREE.Vector3();
        this.physicsRotation = new THREE.Quaternion();
        this.visualRotation = new THREE.Quaternion();

        // Input
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            shift: false 
        };
        this.movementVector = new THREE.Vector3();
        this.targetRotation = new THREE.Quaternion(); // Nuova variabile per la rotazione target
        
        this.init();
    }

    async init() {
        // Aspetta che la fisica sia pronta
        while (!physicsWorld.ready) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

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
            model.rotation.y = Math.PI/2; 

            //crea un mixer per riprodurre le animazioni
            this.mixer = new THREE.AnimationMixer(model);

            this.walkAction = THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Walk')
                ? this.mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Walk'))
                : null;

            this.runAction = THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Run')
                ? this.mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Run'))
                : null;

            this.idleAction = THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Idle')
                ? this.mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'CharacterArmature|Idle'))
                : null;

            if (this.idleAction) {
                this.idleAction.play();
                this.currentAction = this.idleAction;
            } else if (this.walkAction) {
                this.walkAction.play();
                this.currentAction = this.walkAction;
            }
            
            //serve per animare respirazione
            this.chestBone = model.getObjectByName('Chest');

            //ottengo le dimensioni del bounding box del personaggio
            //per creare il collider fisico
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const minY = box.min.y;
            this.modelOffsetY = -minY;
            this.characterHeight = size.y * 0.9;
            this.characterRadius = Math.max(size.x, size.z) * 0.4;

            model.position.set(0, this.modelOffsetY, 0);
            this.scene.add(model);

            //crea la fisica del personaggio
            this.createPhysicsBody();
            this.createDebugWireframe();

            //crea la telecamera in terza persona
            this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.player);

            if (this.controls) {
                this.controls.enabled = false;
            }

            //attiva gli eventi tastiera
            this.addEventListeners();
        });
    }

    createPhysicsBody() {
        if (!physicsWorld.ready) {
            console.warn('Physics world not ready, cannot create character body');
            return;
        }

        //create a capsule for character collider
        try {
            const halfHeight = this.characterHeight * 0.5 - this.characterRadius
            const colliderDesc = RAPIER.ColliderDesc.capsule(
                halfHeight,
                this.characterRadius
            );
            
            const totalHeight = this.characterHeight;
            colliderDesc.setFriction(0.1);
            colliderDesc.setRestitution(0.0);
            colliderDesc.setDensity(1.0);

            //it's a kinematic body, so it won't be affected by forces but can move
            //può essere mosso manulamente con "setNextKinematicTranslation(...)"
            const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
            
            //start game
            const startPosition = { x: -15, y: totalHeight*0.47, z: -5 };

            //statue
            //const startPosition = { x: 18, y: totalHeight*0.47, z: -30 };

            //mushrooms
            //const startPosition = { x: 70, y: totalHeight*0.47, z: -25};

    
            //bee game
            //const startPosition = { x: 20, y: totalHeight * 0.47, z: 36 };
            rigidBodyDesc.setTranslation(startPosition.x, startPosition.y, startPosition.z);
            rigidBodyDesc.lockRotations(true, false, true);

            //Aggiungo al mondo fisico il kinematicbody e il collider (assegnato al kinematic body)
            this.rigidBody = physicsWorld.world.createRigidBody(rigidBodyDesc);
            this.collider = physicsWorld.world.createCollider(colliderDesc, this.rigidBody);

            this.rigidBody.setLinearDamping(5.0);
            this.rigidBody.setAngularDamping(10.0);

            //used to allign the model-mesh with the physics body during movement
            this.updatePhysicsPosition();

        } catch (error) {
            console.error('Error creating character physics body:', error);
        }
    }

    freeze() {
        this.frozen = true;
    }

    unfreeze() {
        this.frozen = false;
    }

    createDebugWireframe() {
        if (!this.scene) return;

        const group = new THREE.Group();

        const halfHeight = this.characterHeight * 0.4;
        const totalHeight = 2 * halfHeight + 2 * this.characterRadius;
        const cylinderHeight = 2 * halfHeight;

        const cylinderGeometry = new THREE.CylinderGeometry(
            this.characterRadius,
            this.characterRadius,
            cylinderHeight,
            8, 1
        );

        const topSphereGeometry = new THREE.SphereGeometry(this.characterRadius, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
        const bottomSphereGeometry = new THREE.SphereGeometry(this.characterRadius, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });

        const cylinderMesh = new THREE.Mesh(cylinderGeometry, wireframeMaterial);

        const topSphereMesh = new THREE.Mesh(topSphereGeometry, wireframeMaterial);
        topSphereMesh.position.y = cylinderHeight * 0.5;

        const bottomSphereMesh = new THREE.Mesh(bottomSphereGeometry, wireframeMaterial);
        bottomSphereMesh.position.y = -cylinderHeight * 0.5;

        group.add(cylinderMesh);
        group.add(topSphereMesh);
        group.add(bottomSphereMesh);

        group.position.set(0, totalHeight * 0.5, 0);

        this.debugWireframe = group;
        this.scene.add(this.debugWireframe);
    }
    updateDebugWireframe() {
        if (!this.debugWireframe || !this.rigidBody) return;

        if (this.showWireframe) {
            const position = this.rigidBody.translation();
            this.debugWireframe.position.set(position.x, position.y, position.z);

            const rotation = this.rigidBody.rotation();
            this.debugWireframe.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

            this.debugWireframe.visible = true;
        } else {
            this.debugWireframe.visible = false;
        }
    }
    toggleWireframe() {
        this.showWireframe = !this.showWireframe;
    }

    // Sincronizza la mesh del personaggio con il corpo fisico
    // Questa funzione viene chiamata ad ogni frame per sincronizzare la posizione del modello con quella
    // del corpo fisico.
    updatePhysicsPosition() {
        if (!this.rigidBody || !this.player) return;

        //Obtain the position of the physics body
        const position = this.rigidBody.translation();
        this.physicsPosition.set(position.x, position.y, position.z);

        //Copy this position in visualPosition
        this.visualPosition.copy(this.physicsPosition);

        //posiziono meglio la capsula per allinarla con il corpo
        this.visualPosition.y -= (this.characterHeight * 0.4 + this.characterRadius);
        this.visualPosition.y += this.modelOffsetY;;

        //update the model position with the physic position
        this.player.position.copy(this.visualPosition);
    }

    //Serve per fare shape casting, è una collisione predittiva per evitare
    //che il personaggio attraversi gli ostacoli
    checkFutureCollision(targetPosition) {
        if (!this.rigidBody) return null;

        // Calcola quanto il personaggio si sposterà tra posizione attuale e destinazione desiderata
        const currentPos = this.rigidBody.translation();
        const movement = {
            x: targetPosition.x - currentPos.x,
            y: targetPosition.y - currentPos.y,
            z: targetPosition.z - currentPos.z
        };

        //crea una capsule fittizia per vedere se collide con gli oggetti
        const shape = new RAPIER.Capsule(this.characterHeight * 0.4, this.characterRadius);

        // fa un cast shape della shape e dice se incontrerà qualcosa nel tragitto
        const hit = physicsWorld.world.castShape(
            currentPos,
            { x: 0, y: 0, z: 0, w: 1 },
            movement,
            shape,
            0.1,
            true
        );

        if (hit) {
            // Escludi collisione con sé stesso
            if (hit.collider.handle === this.rigidBody.collider(0).handle) {
                return null;
            }
            const mesh = physicsWorld.bodyToMesh.get(hit.collider);
            // Escludi collisione con il plane
            if (mesh && mesh.name === 'Plane') {
                return null;
            }
        }
        return hit;
    }


    addEventListeners() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.keys.shift = true; break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.keys.shift = false; break;
            }
        });
    }

    //Function used to update at each frame
    update(deltaTime) {
        const delta = this.clock.getDelta();
        if (this.frozen) return;

        //Aggiorna animazioni
        if (this.mixer) this.mixer.update(delta);

        // Gestisce il movimento e la rotazione del modello
        this.handleMovement(deltaTime); 

        // Aggiorna la posizione del modello dalla fisica
        this.updatePhysicsPosition(); 

        this.updateDebugWireframe();

        if (this.thirdPersonCamera) {
            this.thirdPersonCamera.update();
        }

        //Movimento del petto per respirazione personaggio
        if (this.player && this.chestBone) {
            const t = performance.now() / 1000;
            this.chestBone.rotation.x = Math.sin(t * 2.0) * 0.02;
        }
    }

    //funzione chiamata ad ogni frame per festire il movimento del personaggio:
    //WASD, movimento fisico, animazioni, collisioni
    handleMovement(deltaTime) {
        if (!this.rigidBody || !this.thirdPersonCamera || !this.player) return;

        //la direzione dipende da dove punta la camera
        this.movementVector.set(0, 0, 0);
        const forward = this.thirdPersonCamera.getForwardDirection();
        const right = this.thirdPersonCamera.getRightDirection();

        let moveRequested = false;

        //imposta movimento wasd
        if (this.keys.forward) {
            this.movementVector.add(forward);
            moveRequested = true;
        }
        if (this.keys.backward) {
            this.movementVector.sub(forward);
            moveRequested = true;
        }
        if (this.keys.left) {
            this.movementVector.sub(right);
            moveRequested = true;
        }
        if (this.keys.right) {
            this.movementVector.add(right);
            moveRequested = true;
        }

        if (moveRequested) {
            // Normalizza per non fare andare il personaggio piu veloce in diagonale
            this.movementVector.normalize();

            // gestisce la corsa
            const currentSpeed = this.keys.shift ? this.moveSpeed * this.runSpeedMultiplier : this.moveSpeed;
            
            //calcola la posizione futura del personaggio (senza muvoerlo)
            const currentPhysicsPos = this.rigidBody.translation();
            const targetX = currentPhysicsPos.x + this.movementVector.x * currentSpeed * deltaTime;
            const targetZ = currentPhysicsPos.z + this.movementVector.z * currentSpeed * deltaTime;
            const targetPosition = {
                x: targetX,
                y: currentPhysicsPos.y,
                z: targetZ
            };

            //Controlla collisioni future e le collisioni
            if (!this.checkFutureCollision(targetPosition)) {
                this.rigidBody.setNextKinematicTranslation(targetPosition);
            } else {
                console.log("Collisione evitata: oggetto davanti");
            }
            const hit = this.checkFutureCollision(targetPosition);

            // se non ci sono collisioni imposta la nuova posizione
            if (!hit) {
                this.rigidBody.setNextKinematicTranslation(targetPosition);
            } else {
                const mesh = physicsWorld.bodyToMesh.get(hit.collider);
                if (mesh) {
                    console.log("Mesh colpita:", mesh.name || mesh);
                }
            }

            //Rotazione fluida del personaggio
            // Calcola l'angolo di rotazione del personaggio
            // Math.atan2(y, x) restituisce l'angolo tra l'asse x positivo e il punto (x, y)
            const angle = Math.atan2(this.movementVector.x, this.movementVector.z);
            // Crea un quaternione target basato sull'angolo
            this.targetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            // Interpolazione slerp per una rotazione fluida del modello
            this.player.quaternion.slerp(this.targetRotation, this.rotationSpeed);


            if (this.keys.shift) {
                this.setAction(this.runAction);
            } else {
                this.setAction(this.walkAction);
            }
        //nessun movimento
        } else {
            this.rigidBody.setNextKinematicTranslation(this.rigidBody.translation());
            this.setAction(this.idleAction);
        }
    }

    //usato per settare la posizione del personaggio per debug
    setPosition(x, y, z) {
        if (this.rigidBody) {
            this.rigidBody.setTranslation({ x: x, y: y + this.characterHeight * 0.5, z: z }, true);
            this.updatePhysicsPosition();
        }
    }

    setAction(newAction) {
        if (newAction === this.currentAction) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }
        if (newAction) {
            newAction.reset().fadeIn(0.2).play();
            this.currentAction = newAction;
        } else {
            if (this.currentAction) {
                this.currentAction.stop();
                this.currentAction = null;
            }
        }
    }

    getPlayerPosition() {
        if (this.rigidBody) {
            const pos = this.rigidBody.translation();
            return new THREE.Vector3(pos.x, pos.y, pos.z);
        }
        return this.player ? this.player.position : new THREE.Vector3();
    }

    getPhysicsInfo() {
        if (!this.rigidBody) return null;

        const position = this.rigidBody.translation();
        const velocity = this.rigidBody.linvel();
        const rotation = this.rigidBody.rotation();

        return {
            position: { x: position.x, y: position.y, z: position.z },
            velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
            rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
            characterHeight: this.characterHeight,
            characterRadius: this.characterRadius
        };
    }

    destroy() {
        if (this.rigidBody && physicsWorld.world) {
            physicsWorld.world.removeRigidBody(this.rigidBody);
            this.rigidBody = null;
            this.collider = null;
        }

        if (this.debugWireframe) {
            this.scene.remove(this.debugWireframe);
            this.debugWireframe = null;
        }

        if (this.player) {
            this.scene.remove(this.player);
        }
    }
}