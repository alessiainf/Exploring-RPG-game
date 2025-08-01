import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { physicsWorld } from './physics.js';
import { collectItem } from './GameState.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';

const statues = [];
let wizard = null;
let chestBone = null;
let nearWizard = false;
let dialogueStep = 0;
let wizardArmBone = null;
let isWizardTalking = false;
export { isWizardTalking };
let wizardTorso = null;
let wizardShoulderR = null;
let wizardNeck = null;
let wizardHead = null;
let wizardFistR = null;

//hint object
let hintObject = null;
let compass = null;
let nearHint = false;
let hintVisible = false;

//Necklace
let necklace = null;
let necklaceUnlocked = false;
let necklaceCollected = false;
let thankedPlayer = false;



export { statues, wizard, necklace };

export async function loadStatues(scene) {
  if (!physicsWorld.ready) {
    //console.log('Waiting for physics world to initialize...');
    await physicsWorld.init();
  }

  const loader = new GLTFLoader();

  const paths = [
    'assets/models/statue1.glb',
    'assets/models/statue2.glb',
    'assets/models/statue3.glb',
  ];

  const positions = [
    new THREE.Vector3(14, 1, -43),
    new THREE.Vector3(17, 2.45, -43),
    new THREE.Vector3(20, 1.9, -43),
  ];

  for (let i = 0; i < paths.length; i++) {
    const gltf = await loader.loadAsync(paths[i]);
    const statue = gltf.scene;
    statue.position.copy(positions[i]);
    statue.scale.set(2, 2, 2);

    //Proprietà per la rotazione del target
    statue.userData.targetRotationY = statue.rotation.y;

    scene.add(statue);
    statues.push(statue);
    statue.traverse(child => {
      child.receiveShadow = true;
      child.castShadow = true;
    });
  }

  //aggiugi collider per le statue
  setupStatuePhysics();
}

export async function loadWizard(scene) {
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync('assets/models/Animated wizard.glb');
    wizard = gltf.scene;
    wizard.position.set(20, -0.12, -35);
    wizard.scale.set(0.6, 0.6, 0.6);
    scene.add(wizard);

    //per simulare il respiro
    wizard.traverse(child => {
      child.receiveShadow = true;
      child.castShadow = true;
      if (child.isBone && child.name === 'Torso') {
        chestBone = child;
      }
      if (child.isBone) {
        if (child.name === 'UpperArmR') wizardArmBone = child;
        if (child.name === 'Torso') wizardTorso = child;
        if (child.name === 'ShoulderR') wizardShoulderR = child;
        if (child.name === 'Neck') wizardNeck = child;
        if (child.name === 'Head') wizardHead = child;
        if (child.name === 'FistR') wizardFistR = child;
      }
    });

    // Aggiungi collider per il mago 
    setupWizardPhysics();

  } catch (err) {
    console.error('Errore nel caricamento del mago:', err);
  }
}

export function updateBreathing(deltaTime) {
  if (!chestBone) return;
  const t = performance.now() / 1000;
  chestBone.position.z = Math.sin(t * 2.0) * 0.0002;
  chestBone.scale.y = 1.0 + Math.sin(t * 2.0) * 0.003;
}

export function animateWizardSpeaking(timeMs) {
  const t = timeMs / 1000;

  // Respiro generale
  const breath = Math.sin(t * 0.2 * Math.PI * 2);

  // Gesticolazione attiva solo se parla
  const gesture = isWizardTalking ? Math.sin(t * 2.5) : 0;

  if (wizardArmBone)
    wizardArmBone.rotation.y = -0.3 + gesture * 0.05 + breath * 0.05;

  if (wizardTorso)
    wizardTorso.rotation.z = breath * 0.02;

  if (wizardShoulderR)
    wizardShoulderR.rotation.x = gesture * 0.01;

  if (wizardNeck)
    wizardNeck.rotation.x = gesture * 0.02;

  if (wizardHead)
    wizardHead.rotation.z = gesture * 0.05;

  if (wizardFistR)
    wizardFistR.rotation.z = gesture * 0.05;
}


export async function loadNecklace(scene) {
  const loader = new GLTFLoader();

  const gltf = await loader.loadAsync('assets/models/Necklace.glb');
  necklace = gltf.scene;

  necklace.position.set(18, 0.4, -35);  
  necklace.scale.set(0.7, 0.7, 0.7);
  scene.add(necklace);

  necklace.traverse(child => {
    child.receiveShadow = true;
    child.castShadow = true;
  });
}

export function updateNecklace(deltaTime) {
  if (!necklace) return;
  necklace.rotation.y += deltaTime * 0.7; // rotazione lenta
  
}

export async function loadHintObject(scene) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('assets/models/shrine.glb');  
  hintObject = gltf.scene;
  hintObject.position.set(11, -0.3, -43); 
  hintObject.scale.set(1.2, 1.2, 1.2);
  scene.add(hintObject);

  hintObject.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const compassGltf = await loader.loadAsync('assets/models/compass_rose.glb');
  compass = compassGltf.scene;
  compass.position.set(
    hintObject.position.x,
    hintObject.position.y + 3.45, // altezza sopra lo shrine
    hintObject.position.z
  );
  compass.rotation.set(0, 0, -Math.PI/2); 
  compass.scale.set(0.04, 0.04, 0.04);

  scene.add(compass);

  compass.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  setupHintPhysics();
}



//fisica per le statue
function setupStatuePhysics() {
  if (!physicsWorld.ready) {
    console.warn('Physics world not ready, skipping statue physics setup');
    return;
  }

  if (statues.length > 0) {
    physicsWorld.addStatueColliders(statues);
  }
}

//fisica per il mago
function setupWizardPhysics() {
  if (!physicsWorld.ready) {
    console.warn('Physics world not ready, skipping wizard physics setup');
    return;
  }

  if (wizard) {
    physicsWorld.addWizardCollider(wizard);
  }
}

// fisica per l'oggetto indizio
function setupHintPhysics() {
  if (!physicsWorld.ready) {
    console.warn('Physics world not ready, skipping hint object physics setup');
    return;
  }

  if (hintObject) {
    physicsWorld.addHintCollider(hintObject);  // deve esistere questa funzione
  }
}


// Gestione dell'interazione con statue, mago e collana
export function updateInteraction(playerPosition, scene) {
  const prompt = document.getElementById('interactionPrompt');
  const dialogueBox = document.getElementById('dialogueBox');
  let nearAnyStatue = false;
  nearWizard = false;

  // === Oggetto indizio ===
  nearHint = false;
  if (hintObject && playerPosition.distanceTo(hintObject.position) < 2.5) {
    nearHint = true;
    if (keys.fPressed) {
      keys.fPressed = false;
      const dialogueBox = document.getElementById('dialogueBox');
      if (!hintVisible) {
        dialogueBox.textContent = '📜 "Tre statue, tre respiri del cielo. \nLa prima ascolti il Sussurro dell’Est. \nLa seconda accolga il Canto del Sud. \nLa terza segua il Sospiro dell’Ovest. \nCosì i Venti torneranno a danzare."';
        dialogueBox.style.display = 'block';
        hintVisible = true;
      } else {
        dialogueBox.style.display = 'none';
        hintVisible = false;
      }
    }
  }

  // === Sblocca la collana se le statue sono correttamente orientate ===
  if (!necklaceUnlocked && checkStatueOrientations()) {
    necklaceUnlocked = true;
    console.log('Collana sbloccata! Le statue sono corrette.');
  }


  // === Collana ===
  let showingNecklacePrompt = false;

  if (necklace && playerPosition.distanceTo(necklace.position) < 1 && !necklaceCollected) {
    showingNecklacePrompt = true;

    if (necklaceUnlocked) {
      promptState.active = true;
      promptState.text = '✨ Premi F per raccogliere la collana';

      if (keys.fPressed) {
        keys.fPressed = false;
        scene.remove(necklace);
        necklaceCollected = true;
        dialogueBox.style.display = 'none';
        collectItem(); //aumenta il contatore
      }
    } else {
      promptState.active = true;
      promptState.text = '🔒 Qualcosa ti impedisce di prenderla...';
    }
  }


  // === Statue ===
  statues.forEach(statue => {
    const dist = statue.position.distanceTo(playerPosition);

    // Solo se la collana NON è stata sbloccata
    if (!necklaceUnlocked && dist < 3) {
      nearAnyStatue = true;

      if (keys.fPressed) {
        statue.userData.targetRotationY -= Math.PI / 2;
        keys.fPressed = false;
      }
    }

    const currentY = statue.rotation.y;
    const targetY = statue.userData.targetRotationY;
    if (Math.abs(currentY - targetY) > 0.001) {
      statue.rotation.y = THREE.MathUtils.lerp(currentY, targetY, 0.05);
    } else {
      statue.rotation.y = targetY;
    }
  });


  // === Mago ===
  if (wizard && playerPosition.distanceTo(wizard.position) < 2) {
    nearWizard = true;

    if (keys.fPressed) {
      keys.fPressed = false;

      if (checkStatueOrientations() && !thankedPlayer) {
        // Le statue sono corrette e non abbiamo ancora ringraziato
        dialogueBox.textContent = '🛡️ Peppino: Grazie. Il tuo gesto non sarà dimenticato.';
        dialogueBox.style.display = 'block';
        isWizardTalking = true;
        thankedPlayer = true;
        
      } else if (checkStatueOrientations() && thankedPlayer) {
        // Se le statue sono corrette e ha già ringraziato → chiude
        dialogueBox.style.display = 'none';
        thankedPlayer = false;
        isWizardTalking = false;

      } else {
        // Conversazione normale finché le statue non sono giuste
        dialogueStep++;
        switch (dialogueStep) {
          case 1:
            dialogueBox.textContent = '🛡️ Guardiano: ...Un’anima persa tra le nebbie? Non è comune vedere viandanti qui.';
            isWizardTalking = true;
            break;
          case 2:
            dialogueBox.textContent = '🧙‍♀️ Strega: Cerco una via d’uscita. Sono alla ricerca della Collana del Vento.';
            isWizardTalking = false;
            break;
          case 3:
            dialogueBox.textContent = '🛡️ Peppino: È un oggetto antico, legato a forze dimenticate. Io sono Peppino, guardiano di ciò che resta.';
            isWizardTalking = true;
            break;
          case 4:
            dialogueBox.textContent = '🛡️ Peppino: Ma non tutto si conquista con la forza. I Venti devono tornare a parlare prima.';
            isWizardTalking = true;
            break;
          case 5:
            dialogueBox.textContent = '🛡️ Peppino: Orienta i Guardiani come vuole la brezza. Solo allora, la collana sarà tua.';
            isWizardTalking = true;
            break;
          default:
            dialogueBox.style.display = 'none';
            dialogueStep = 0;
            isWizardTalking = false;
            return;
        }
        dialogueBox.style.display = 'block';
      }
    }
  }

  const dialogueVisible = dialogueBox && dialogueBox.style.display !== 'none';

  // Se già mostrato un messaggio per la collana, non fare nulla
  if (showingNecklacePrompt) return;

  // Messaggio contestuale
  if (!dialogueVisible) {
    if (nearAnyStatue && !necklaceUnlocked) {
      promptState.active = true;
      promptState.text = '🔁 Premi F per ruotare le statue';
    } else if (nearHint) {
      promptState.active = true;
      promptState.text = '📜 Premi F per leggere l\'incisione';
    } else if (nearWizard) {
      promptState.active = true;
      promptState.text = '🧙 Premi F per parlare con il guardiano';
    }
  }
}

function checkStatueOrientations() {
  const toleratedError = 0.2;  //errore ammesso in radianti

  // Est
  const statue1Correct = Math.abs(THREE.MathUtils.euclideanModulo(statues[0].rotation.y, 2 * Math.PI) - 0) < toleratedError;

  // Sud
  const statue2Correct = Math.abs(THREE.MathUtils.euclideanModulo(statues[1].rotation.y, 2 * Math.PI) - (3 * Math.PI / 2)) < toleratedError;

  // Ovest (-π)
  const statue3Angle = THREE.MathUtils.euclideanModulo(statues[2].rotation.y, 2 * Math.PI);
  const statue3Correct = Math.abs(statue3Angle - Math.PI) < toleratedError;


  return statue1Correct && statue2Correct && statue3Correct;
}



export { hintObject, checkStatueOrientations };

