import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';
import { collectItem } from './GameState.js';
import { physicsWorld } from './physics.js';
import { initDandelions } from './Weather.js';

export let bee = null;
export let honey = null;
let beeMixer;

let challengeStarted = false;
let challengeCompleted = false;
let timer = 0;
let maxTime = 30;
let activeItems = [];
let beeTalked = false;
let inDialogue = false;
let dialogueStep = 0;
let beeFlyingAction;



let collectiblePositions = [
  new THREE.Vector3(30, 0, 24),
  new THREE.Vector3(35, 0, 25),
  new THREE.Vector3(36, 0, 35),
  new THREE.Vector3(29, 0, 38),
  new THREE.Vector3(32, 0, 32)
];

const loader = new GLTFLoader();

export async function loadBeeGame(scene) {
  // Carica ape
  const beeGltf = await loader.loadAsync('assets/models/bee.glb');
  bee = beeGltf.scene;
  bee.position.set(20, 1.2, 36);
  bee.rotation.y = Math.PI;
  bee.scale.set(0.7, 0.7, 0.7);
  scene.add(bee);
  setupBeePhysics();


  if (beeGltf.animations && beeGltf.animations.length > 0) {
    const flyingClip = beeGltf.animations.find(clip => clip.name === "MonsterArmature|Flying");

    if (flyingClip) {
      beeMixer = new THREE.AnimationMixer(bee);
      beeFlyingAction = beeMixer.clipAction(flyingClip);
      beeFlyingAction.setEffectiveTimeScale(0.3); // default: lenta
      beeFlyingAction.setLoop(THREE.LoopRepeat);
      beeFlyingAction.play();

    } else {
      console.warn('Animazione "MonsterArmature|Flying" non trovata');
    }
  }

  // Carica miele
  const honeyGltf = await loader.loadAsync('assets/models/honey.glb');
  honey = honeyGltf.scene;
  honey.position.set(18, 0.8, 36);
  honey.scale.set(2.5, 2.5, 2.5);
  scene.add(honey);

  // Messaggio iniziale sul miele
  const honeyLabel = document.createElement('div');
  honeyLabel.id = 'honeyLabel';
  honeyLabel.style.position = 'absolute';
  honeyLabel.style.color = 'gold';
  honeyLabel.style.top = '20%';
  honeyLabel.style.left = '50%';
  honeyLabel.style.transform = 'translateX(-50%)';
  honeyLabel.style.fontSize = '22px';
  honeyLabel.style.fontWeight = 'bold';
  honeyLabel.style.display = 'none';
  document.body.appendChild(honeyLabel);

  // Timer in alto a destra
  const timerBox = document.createElement('div');
  timerBox.id = 'timerBox';
  timerBox.style.position = 'absolute';
  timerBox.style.top = '8%';
  timerBox.style.left = '50%';
  timerBox.style.transform = 'translateX(-50%)';
  timerBox.style.color = 'white';
  timerBox.style.fontSize = '40px';
  timerBox.style.fontWeight = 'bold';
  timerBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  timerBox.style.padding = '16px 24px';
  timerBox.style.borderRadius = '12px';
  timerBox.style.display = 'none';
  timerBox.style.zIndex = '1000';
  document.body.appendChild(timerBox);

  // Contatore degli oggetti raccolti
  const counterBox = document.createElement('div');
  counterBox.id = 'counterBox';
  counterBox.style.position = 'absolute';
  counterBox.style.top = '17%';
  counterBox.style.left = '50%';
  counterBox.style.transform = 'translateX(-50%)';
  counterBox.style.color = '#ffcc00';
  counterBox.style.fontSize = '30px';
  counterBox.style.fontWeight = 'bold';
  counterBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  counterBox.style.padding = '12px 20px';
  counterBox.style.borderRadius = '10px';
  counterBox.style.display = 'none';
  counterBox.style.zIndex = '1000';
  document.body.appendChild(counterBox);

  initDandelions(scene, bee.position.clone());
}

// fisica per l'ape
function setupBeePhysics() {
  if (!physicsWorld.ready) {
    console.warn('Physics world not ready, skipping bee physics setup');
    return;
  }

  if (bee) {
    physicsWorld.addBeeCollider();
  }
  
}


export {beeMixer};

export function updateBeeGame(playerPosition, scene) {
  const distanceToBee = playerPosition.distanceTo(bee.position);
  const distanceToHoney = honey ? playerPosition.distanceTo(honey.position) : Infinity;
  const dialogueBox = document.getElementById('dialogueBox');

  // Se premi F mentre un messaggio (tipo 'tempo scaduto' o 'hai raccolto tutto') è visibile, chiudilo
if (!inDialogue && dialogueBox.style.display !== 'none' && keys.fPressed) {
  keys.fPressed = false;
  dialogueBox.style.display = 'none';
  dialogueBox.innerHTML = '';
  return;
}


  const honeyLabel = document.getElementById('honeyLabel');
  const timerBox = document.getElementById('timerBox');

  // Mostra messaggio se miele non è disponibile
  if (!challengeCompleted && honey && distanceToHoney < 2) {
    promptState.active = true;
    promptState.text = '🍯 Miele non disponibile';
    honeyLabel.style.display = 'block';
  } else {
    honeyLabel.style.display = 'none';
  }

  // Gestione dialogo con ape
  if (distanceToBee < 2 && !challengeStarted) {
  promptState.active = true;
  promptState.text = '🐝 Premi F per parlare con l\'ape';

  if (keys.fPressed) {
    keys.fPressed = false;

    if (inDialogue) {
      dialogueStep++;
      showBeeDialogueLine(scene);
      return;
    }

    if (dialogueBox.style.display !== 'none') {
      dialogueBox.style.display = 'none';
      return;
    }

    if (challengeCompleted) {
      // Dialogo post-vittoria
      inDialogue = true;
      dialogueStep = 100; // nuovo step speciale
      showBeeDialogueLine(scene);
    } else {
      // Dialogo iniziale/standard
      startBeeDialogue(scene);
    }
  }
}


  // Se sfida attiva, aggiorna timer e raccoglimento nettari
  if (challengeStarted && !challengeCompleted) {
    timer -= 1 / 60;
    timerBox.style.display = 'block';
    timerBox.textContent = `⏳ ${Math.ceil(timer)}s`;
    const counterBox = document.getElementById('counterBox');
    counterBox.style.display = 'block';
    counterBox.textContent = `${5 - activeItems.length}/5 raccolti`;


    for (let i = activeItems.length - 1; i >= 0; i--) {
      if (playerPosition.distanceTo(activeItems[i].position) < 1) {
        scene.remove(activeItems[i]);
        activeItems.splice(i, 1);
      }
    }

    if (activeItems.length === 0) {
      completeChallenge(timerBox);
    } else if (timer <= 0) {
      failChallenge(scene, timerBox);
    }
  } else {
    timerBox.style.display = 'none';
  }

  // Se la sfida è completata e il player è vicino al miele
  if (challengeCompleted && honey && distanceToHoney < 1.5) {
    promptState.active = true;
    promptState.text = '🍯 Premi F per raccogliere il Miele Dorato';

    if (keys.fPressed) {
      keys.fPressed = false;
      scene.remove(honey);
      honey = null; 
      collectItem();
      honeyLabel.style.display = 'none';
      dialogueBox.innerHTML = '';
      dialogueBox.style.display = 'none';
    }
  }

  // Chiudi dialogo se ti allontani dall'ape
  if (inDialogue && distanceToBee > 2) {
    inDialogue = false;
    dialogueStep = 0;
    dialogueBox.style.display = 'none';
    beeFlyingAction.setEffectiveTimeScale(0.3);
  }
}




function startBeeDialogue(scene) {
  inDialogue = true;
  dialogueStep = 0;
  showBeeDialogueLine(scene);
}


function showBeeDialogueLine(scene) {
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '';
  dialogueBox.style.display = 'block';

  let text = '';
  if (dialogueStep === 100) {
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '';
  dialogueBox.style.display = 'block';

  const p = document.createElement('p');
  p.textContent = '🐝 Rinnah: Zzzzzz—COSA?! Hai davvero raccolto tutto?! Bah! Io... volevo solo farti correre un po’! Ma vabbè... prendi il Miele Dorato prima che cambi idea!';  
  dialogueBox.appendChild(p);

  inDialogue = false;
  beeFlyingAction.setEffectiveTimeScale(0.3);
  return;
}

  switch (dialogueStep) {
  case 0:
    text = '🧝‍♂️ Avventuriero: Un\'ape! Perfetto, magari ha del miele...';
    break;
  case 1:
    text = '🐝 Ape: Zzzzz... EH?! Chi osa disturbarmi?! Oh, un altro bipede...';
    break;
  case 2:
    text = '🐝 Ape: Lascia che indovini: vuoi il Miele Dorato! Tutti lo vogliono. Nessuno lo merita!';
    break;
  case 3:
    text = '🧝‍♂️ Avventuriero: Non voglio litigare, ma sono disposto a tutto per quel miele.';
    break;
  case 4:
    text = '🐝 Rinnah: Io sono Rinnah, Regina della Radura, Protrettrice del Nettare! E no, non lo do a chiunque!';
    break;
  case 5:
    text = '🐝 Rinnah: Però... potrei fare un\'eccezione. Ma solo se dimostri d\'essere più veloce di un calabrone affamato!';
    break;
  case 6:
    text = '🐝 Rinnah: Ecco la sfida: raccogli i 5 nettari sparsi nella radura in 30 secondi. Se ci riesci, potrei... *forse*... darti una goccia del mio miele.';
    break;
  case 7:
    text = '🐝 Rinnah: Bene, accetti la sfida o te ne torni dalle tue margheritine?';


      const btnYes = document.createElement('button');
      btnYes.classList.add('dialogue-button');
      btnYes.textContent = 'SÌ';
      btnYes.onclick = () => {
        dialogueBox.style.display = 'none';
        inDialogue = false;
        beeFlyingAction.setEffectiveTimeScale(0.3);
        startChallenge(scene);
      };

      const btnNo = document.createElement('button');
      btnNo.classList.add('dialogue-button');
      btnNo.textContent = 'NO';
      btnNo.onclick = () => {
        dialogueBox.style.display = 'none';
        inDialogue = false;
        beeFlyingAction.setEffectiveTimeScale(0.3);
      };

      const p = document.createElement('p');
      p.textContent = text;
      dialogueBox.appendChild(p);
      dialogueBox.appendChild(btnYes);
      dialogueBox.appendChild(btnNo);
      return;

    default:
      inDialogue = false;
      dialogueBox.style.display = 'none';
      beeFlyingAction.setEffectiveTimeScale(0.3); 
      return;
  }

  if (text.startsWith('🐝') && beeFlyingAction) {
    beeFlyingAction.setEffectiveTimeScale(1.5); // parla → veloce
    
  }
  else if (text.startsWith('🧝‍♂️') && beeFlyingAction)  {
    beeFlyingAction.setEffectiveTimeScale(0.3); // non parla 
  }


  const p = document.createElement('p');
  p.textContent = text;
  dialogueBox.appendChild(p);
}


function startChallenge(scene) {
  challengeStarted = true;
  timer = maxTime;
  activeItems = [];

  collectiblePositions.forEach(pos => {
    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
    const item = new THREE.Mesh(geo, mat);
    item.position.copy(pos);
    scene.add(item);
    activeItems.push(item);
  });
}

function completeChallenge(timerBox) {
  challengeStarted = false;
  challengeCompleted = true;
  timerBox.style.display = 'none';
  document.getElementById('counterBox').style.display = 'none';
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '✅ Sfida completata! Torna dall\'ape.';
  dialogueBox.style.display = 'block'; 
}


function failChallenge(scene, timerBox) {
  challengeStarted = false;
  timerBox.style.display = 'none';
  document.getElementById('counterBox').style.display = 'none';
  activeItems.forEach(item => scene.remove(item));
  activeItems = [];
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '❌ Tempo scaduto! Riprova.';
  dialogueBox.style.display = 'block'; 
}

