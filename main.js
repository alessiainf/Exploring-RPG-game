import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadWorld, 
    updateGrass,
    addProceduralFloor, 
    updateFlower} from './environment.js';
import { CharacterController } from './characterController.js';
import { setupLights } from './lighting.js';
import { physicsWorld, visualizeColliders } from './physics.js';
import { initGameState } from './GameState.js';
import {
  loadStatues,
  loadWizard,
  loadNecklace,
  loadHintObject,
  updateBreathing,
  animateWizardSpeaking,
  updateInteraction,
  updateNecklace,
} from './Statuegame.js';
import { initWeather, updateWeather } from './Weather.js';
import { loadBook, updateBookInteraction, IntroManager } from './StartGame.js';
import { loadMushrooms, 
    loadTentacle, 
    updateMushroomInteraction, 
    updateTentacleInteraction,
animateTalkingHead,
currentTalkingBone,
boneSimon,
animateArms,
boneBritney,
animateTentacle,
animateBritney} from './MushroomRiddle.js';
import {
  loadBeeGame,
  updateBeeGame,
  beeMixer,
} from './beeGame.js';
import { hasCollectedAll } from './GameState.js';
import {
  createCauldrons,
  updateCauldronInteraction,
  updateFireEffects,
  checkDoorCollision
} from './fireGame.js';


// === SCENA, CAMERA, RENDERER ===
const scene = new THREE.Scene();
//scene.background = new THREE.Color(0x87ceeb);
//scene.fog = new THREE.Fog(0xaaaaaa, 10, 50);
scene.background = new THREE.Color(0x8e80aa);
//scene.fog = new THREE.Fog(0x8a2be2, 20, 60); // Viola (BlueViolet)



const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 500);
//camera.position.set(0, 3, -6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === CONTROLLI ORBIT (verranno disabilitati dalla telecamera in terza persona) ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// === LUCI ===
setupLights(scene);

//wizard game
await loadStatues(scene);
await loadWizard(scene);
await loadNecklace(scene);
await loadHintObject(scene);
await loadBook(scene);

//mushroom riddle
await loadMushrooms(scene);
await loadTentacle(scene);

//bee game
await loadBeeGame(scene);


export const promptState = {
  active: false,
  text: '',
};




// === INIZIALIZZAZIONE ===
let characterController = null;
let isInitialized = false;

async function init() {
    try {
        console.log('Initializing physics...');

        // Inizializza la fisica
        const physicsReady = await physicsWorld.init();
        if (!physicsReady) {
            throw new Error('Failed to initialize physics');
        }

        console.log('Loading world...');

        // Carica il mondo (ora include la fisica)
        await loadWorld(scene);
        physicsWorld.addMapBoundaries(100, 100, 10, 1);
        addProceduralFloor(scene, 300, 20); //For procedural map

        console.log('Initializing character controller...');


        // Inizializza il controller del personaggio
        characterController = new CharacterController(scene, camera, controls);

        isInitialized = true;
        console.log('Game initialized successfully!');

        // Mostra le istruzioni
        showInstructions();
        initWeather(scene);
        createCauldrons(scene);



    } catch (error) {
        console.error('Initialization error:', error);

        // Fallback: inizializza senza fisica
        console.log('Falling back to initialization without physics...');
        try {
            await loadWorldWithoutPhysics();
            characterController = new CharacterController(scene, camera, controls);
            isInitialized = true;
            console.log('Game initialized without physics');
            showInstructions();
        } catch (fallbackError) {
            console.error('Fallback initialization failed:', fallbackError);
            document.body.innerHTML = '<div style="color: red; font-size: 24px; text-align: center; margin-top: 50px;">Errore nel caricamento del gioco</div>';
        }
    }
}

// Fallback per caricare il mondo senza fisica
async function loadWorldWithoutPhysics() {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
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
            });

            scene.add(world);
            resolve(world);
        }, undefined, reject);
    });
}

//easter egg
let robotMixer = null; // globale

function loadRobotModel() {
  const robotGroup = new THREE.Group();
  const loader = new GLTFLoader();

  loader.load('assets/models/Robot.glb', gltf => {
    const model = gltf.scene;
    robotGroup.add(model);

    robotMixer = new AnimationMixer(model);
    const idleClip = gltf.animations.find(clip => clip.name.includes('Idle'));

    if (idleClip) {
      const idleAction = robotMixer.clipAction(idleClip);
      idleAction.play();
    } else {
      console.warn('Animazione Idle non trovata nel robot!');
    }
  });

  return robotGroup;
}

function showTextOverlay(text) {
  let div = document.createElement('div');
  div.id = 'easter-egg-overlay';
  div.style.position = 'absolute';
  div.style.top = '40%';
  div.style.left = '50%';
  div.style.transform = 'translate(-50%, -50%)';
  div.style.color = 'white';
  div.style.fontSize = '24px';
  div.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  div.style.padding = '20px';
  div.style.borderRadius = '10px';
  div.style.zIndex = 1000;
  div.innerText = text;
  document.body.appendChild(div);
}

function hideTextOverlay() {
  const div = document.getElementById('easter-egg-overlay');
  if (div) div.remove();
}


let easterEggTriggered = false;
let robot = null;
const startPosition = { x: -15, y: -0.04, z: -5 };


function triggerOutOfBoundsEasterEgg() {
  easterEggTriggered = true;

  characterController.freeze(); // blocca movimento

  robot = loadRobotModel(); // carica il robot
  scene.add(robot);

  const pos = characterController.getPlayerPosition().clone();
  robot.position.copy(pos).add(new THREE.Vector3(0, 2, -2));
  robot.lookAt(camera.position);

  showTextOverlay("Ehm... non dovresti essere qui.\nPremi F per tornare indietro.");
}



let collidersShown = false;
let colliderVisuals = [];

window.addEventListener('keydown', (event) => {
  if (event.key === '9') {
    if (!collidersShown) {
      colliderVisuals = visualizeColliders(scene);
      collidersShown = true;
    } else {
      colliderVisuals.forEach(mesh => scene.remove(mesh));
      colliderVisuals = [];
      collidersShown = false;
    }
  }
});



// === ANIMATE LOOP ===
function animate(time) {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();


    if (!isInitialized) return;

    // Aggiorna i controlli orbit se abilitati
    if (controls.enabled) {
        controls.update();
    }

    // Calcola deltaTime per la fisica e il movimento
    const deltaTime = 1 / 60; // Fixed timestep per la fisica

    // Aggiorna la fisica
    if (physicsWorld.ready) {
        physicsWorld.update(deltaTime);
    }

    // Aggiorna il personaggio (include l'aggiornamento della telecamera)
    if (characterController) {
        characterController.update(deltaTime); // Passa deltaTime al characterController

        // Aggiorna l'erba dinamica e i fiori
        const playerPosition = characterController.getPlayerPosition();
        const t = performance.now() / 1000;
        updateGrass(playerPosition, t);
        updateFlower(playerPosition, t);
    }

    // wizard game
    updateBreathing(delta);
    animateWizardSpeaking(performance.now());
    updateNecklace(delta);
    updateInteraction(characterController.getPlayerPosition(), scene);
    updateWeather(characterController.getPlayerPosition());

    //start game
    updateBookInteraction(characterController.getPlayerPosition());

    // mushroom riddle
    updateMushroomInteraction(characterController.getPlayerPosition());
    updateTentacleInteraction(characterController.getPlayerPosition());
    animateTentacle(time);
    animateTalkingHead(boneSimon, performance.now() / 1000);
    animateBritney(performance.now());
    animateArms(time);

    // bee game
    updateBeeGame(characterController.getPlayerPosition(), scene);
    if (beeMixer) beeMixer.update(delta);

    //fire game
    updateCauldronInteraction(characterController.getPlayerPosition());
    updateFireEffects();
    checkDoorCollision(characterController.getPlayerPosition());




    //easter egg
    if (!easterEggTriggered && physicsWorld.isOutsideMap(characterController.getPlayerPosition())) {
    triggerOutOfBoundsEasterEgg();
    }
    if (robotMixer) {
    robotMixer.update(delta);
    }

    const prompt = document.getElementById('interactionPrompt');
    if (promptState.active) {
    prompt.style.display = 'block';
    prompt.textContent = promptState.text;
    } else {
    prompt.style.display = 'none';
    }
    // Reset per il prossimo frame
    promptState.active = false;
    promptState.text = '';

    

    renderer.render(scene, camera);
}

initGameState();


// === RESIZE ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === ISTRUZIONI PER L'UTENTE ===
function showInstructions() {
    console.log('=== CONTROLLI ===');
    console.log('WASD: Movimento');
    console.log('Shift + WASD: Corsa');
    console.log('Mouse (click sinistro + trascina): Ruota telecamera');
    console.log('Scroll del mouse: Zoom in/out');
    console.log('');
    console.log('=== DEBUG CONTROLLI ===');
    console.log('P: Mostra informazioni fisica');
    console.log('R: Reset posizione personaggio');
    console.log('G: Test gravità (solleva personaggio)');
    console.log('W: Toggle wireframe corpo fisico');
    console.log('H: Rimuovi/aggiugni wireframe corpo fisico');
    console.log('9: Rimuovi/aggiungi visualizzazione dei collider');

    if (physicsWorld.ready) {
        console.log('Physics enabled');
    } else {
        console.log('Physics disabled (fallback mode)');
    }
}

// === DEBUG INFO ===
window.addEventListener('keydown', (event) => {
    // Premi 'P' per informazioni sulla fisica
    if (event.key.toLowerCase() === 'p' && physicsWorld.ready) {
        console.log('=== PHYSICS INFO ===');
        console.log('Static bodies:', physicsWorld.staticBodies.length);
        console.log('Physics world ready:', physicsWorld.ready);

        if (characterController) {
            const pos = characterController.getPlayerPosition();
            console.log('Player position:', pos);

            // Informazioni fisiche del personaggio
            const physicsInfo = characterController.getPhysicsInfo();
            if (physicsInfo) {
                console.log('=== CHARACTER PHYSICS ===');
                console.log('Position:', physicsInfo.position);
                console.log('Velocity:', physicsInfo.velocity);
                console.log('Height:', physicsInfo.characterHeight);
                console.log('Radius:', physicsInfo.characterRadius);
            }
        }
    }

    // Premi 'R' per resettare la posizione del personaggio
    if (event.key.toLowerCase() === 'r' && characterController) {
        console.log('Resetting character position...');
        characterController.setPosition(0, 2, 0);
    }

    // Premi 'G' per testare la gravità (far cadere il personaggio)
    if (event.key.toLowerCase() === 'g' && characterController) {
        console.log('Testing gravity...');
        characterController.setPosition(0, 10, 0);
    }

    // Premi 'W' per attivare/disattivare il wireframe del corpo fisico
    if (event.key.toLowerCase() === 'h' && characterController) {
        characterController.toggleWireframe();
    }

    if (event.key.toLowerCase() === 'f' && easterEggTriggered) {
    const safePosition = new THREE.Vector3(
        startPosition.x,
        startPosition.y,
        startPosition.z
    );

    characterController.setPosition(
        safePosition.x,
        safePosition.y,
        safePosition.z
    );

    scene.remove(robot);
    hideTextOverlay();
    characterController.unfreeze();
    easterEggTriggered = false;
    robot = null;
    }
});

// === AVVIO ===
//init().then(() => {
//   animate();
//});


new IntroManager(() => {
 init().then(() => animate());
});
