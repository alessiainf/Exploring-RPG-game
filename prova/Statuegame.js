import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { physicsWorld } from './physics.js';
import { collectItem } from './GameState.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';

const statues = [];
let wizard = null;
let chestBone = null;
let necklace = null;
let nearWizard = false;
let dialogueStep = 0;



export { statues, wizard, necklace };

export async function loadStatues(scene) {
  if (!physicsWorld.ready) {
    console.log('Waiting for physics world to initialize...');
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

    //Proprietà per la rotazione del targhet
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


let hintObject = null;
let nearHint = false;
let hintVisible = false; 

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

let necklaceUnlocked = false;
let necklaceCollected = false;
let thankedPlayer = false;


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
          collectItem();
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
  dialogueBox.textContent = '🧙‍♂️ Peppino: Grazie, avventuriero. Il tuo gesto non sarà dimenticato.';
  dialogueBox.style.display = 'block';
  thankedPlayer = true;
} else if (checkStatueOrientations() && thankedPlayer) {
  // Se le statue sono corrette e ha già ringraziato → chiude
  dialogueBox.style.display = 'none';
  thankedPlayer = false;
} else {
  // Conversazione normale finché le statue non sono giuste
  dialogueStep++;
  switch (dialogueStep) {
    case 1:
      dialogueBox.textContent = '🧝‍♂️ Avventuriero: Mi serve quella collana è la mia unica via di fuga. Me la darai?';
      break;
    case 2:
      dialogueBox.textContent = '🧙‍♂️ Peppino: I Venti... sono muti da secoli. Ma tu... tu potresti risvegliarli.';
      break;
    case 3:
      dialogueBox.textContent = '🧙‍♂️ Peppino: Quando i Guardiani si volgeranno verso i Venti giusti, il loro soffio tornerà a fluire... e con esso, anche la Luce.';
      break;
    case 4:
      dialogueBox.textContent = '🧙‍♂️ Peppino: Restituisci l’orientamento alle Statue. Solo allora la nebbia svanirà, e la collana sarà tua.';
      break;
    default:
      dialogueBox.style.display = 'none';
      dialogueStep = 0;
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
    promptState.text = '🧙 Premi F per parlare con il mago';
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

