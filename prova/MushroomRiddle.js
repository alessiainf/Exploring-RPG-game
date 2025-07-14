import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { physicsWorld } from './physics.js';
import { collectItem } from './GameState.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';


let dialogueStep = 0;
let inDialogue = false;
const mushrooms = [];
let tentacle = null;
const answered = [false, false, false];  // uno per ogni riddle
export {mushrooms}


const riddles = [
  {
    question: "🧠 'Mi trovi una volta in un minuto, due volte in un momento, ma mai in mille anni. Cosa sono?'",
    options: ["m", "n", "e", "z"],
    answer: "m"
  },
  {
    question: "🌫️ 'Più ne togli, più divento grande. Cosa sono?'",
    options: ["ombra", "buco", "vento", "fame"],
    answer: "buco"
  },
  {
    question: "🕳️ 'Sono sempre davanti a te ma non puoi mai vedermi. Cosa sono?'",
    options: ["passato", "futuro", "occhi", "vento"],
    answer: "futuro"
  }
];


let currentRiddleIndex = -1;
let riddleActive = false;

export async function loadMushrooms(scene) {
  if (!physicsWorld.ready) {
    await physicsWorld.init();
  }

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('assets/models/Mushrooms In A Trenc_an.glb');
  const mushroomGroup = gltf.scene;

    // Stampa informazioni per verificare se è riggato
  mushroomGroup.traverse(child => {
    if (child.isSkinnedMesh) {
      console.log('SkinnedMesh trovato:', child.name);
      console.log('Skeleton:', child.skeleton);
    }
    if (child.isBone) {
      console.log('Bone trovato:', child.name);
    }
  });

  mushroomGroup.position.set(74, -0.1, -26);
  mushroomGroup.rotation.set(0, -Math.PI / 2, 0);
  mushroomGroup.scale.set(0.02, 0.02, 0.02);
  scene.add(mushroomGroup);

  mushroomGroup.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  mushrooms.push(mushroomGroup); 
  setupMushroomPhysics(mushroomGroup);
}



export async function loadTentacle(scene) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('assets/models/Tentacle.glb');
  tentacle = gltf.scene;
  tentacle.position.set(76, 1, -24);
  tentacle.rotation.set(0, -Math.PI, -Math.PI / 2);
  tentacle.scale.set(2, 2, 2);
  scene.add(tentacle);

  tentacle.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function setupMushroomPhysics(mushroomGroup) {
  if (!physicsWorld.ready) {
    console.warn('Physics world not ready, skipping mushroom physics setup');
    return;
  }

  physicsWorld.addMushroomCollider(mushroomGroup);
}



export function updateMushroomInteraction(playerPosition) {
  const dialogueBox = document.getElementById('dialogueBox');
  const mush = mushrooms[0];
  const dist = mush.position.distanceTo(playerPosition);
  const allAnswered = answered.every(val => val);

  if (dist < 2) {
    if (keys.fPressed) {
      keys.fPressed = false;

      if (inDialogue) {
        dialogueStep++;
        showDialogueLine();
        return;
      }

      if (dialogueBox.style.display !== 'none') {
        dialogueBox.style.display = 'none';
        return;
      }

      if (allAnswered) {
        showFinalDialogue();
      } else {
        startDialogueSequence();
      }
    }


    if (dialogueBox.style.display === 'none') {
      promptState.active = true;
      promptState.text = allAnswered
        ? '🍄 Premi F per parlare con il Fungone'
        : '🍄 Premi F per parlare con le strane teste fungo';
    }
  }
}

function startDialogueSequence() {
  inDialogue = true;
  dialogueStep = 0;
  showDialogueLine(); // mostra la prima battuta
}
function showDialogueLine() {
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.style.display = 'block';
  dialogueBox.innerHTML = '';

  let text = '';
switch (dialogueStep) {
  case 0:
    text = '🧝‍♀️ Avventuriero: ...Siete tre funghi impilati sotto un trench?!';
    break;
  case 1:
    text = '🍄???: SILENZIO! Noi siamo... IL FUNGONE!';
    break;
  case 2:
    text = '🍄Fungo in alto (Simon): Trattiamo oggetti rari, proibiti, dimenticati...';
    break;
  case 3:
    text = '🍄 Fungo in basso (Britney): ...tipo tentacoli, denti di drago, fiale di tempo solido...';
    break;
  case 4:
    text = '🍄 Fungo in mezzo (Braum): Britney! Smettila di rivelare a tutti i nostri segreti!';
    break;
  case 5:
    text = '🧝‍♀️ Avventuriero: Be io avrei proprio bisogno di un tentacolo.';
    break;
  case 6:
    text = '🍄 Fungo in mezzo (Braum): Non è in vendita. Ma potresti... meritarlo.';
    break;
  case 7:
    text = '🍄 Fungo in alto (Simon): Tre indovinelli. Se li risolvi, il tentacolo sarà tuo.';
    break;
  case 8:
    text = '🍄 Fungo in basso (Britney): Se bari... ti vendiamo al mercato degli gnomi ciechi.';
    break;
  case 9:
    text = '🍄 Fungo in alto (Simon): Accetti la sfida?';
      // Mostra i bottoni qui sotto solo in questo caso
      const btnYes = document.createElement('button');
      btnYes.textContent = 'SÌ';
      btnYes.style.margin = '5px';
      btnYes.onclick = () => {
        dialogueBox.style.display = 'none';
        inDialogue = false;
        const next = answered.findIndex(val => !val);
        showRiddleUI(next);
      };

      const btnNo = document.createElement('button');
      btnNo.textContent = 'NO';
      btnNo.style.margin = '5px';
      btnNo.onclick = () => {
        dialogueBox.style.display = 'none';
        inDialogue = false;
      };

      dialogueBox.appendChild(document.createElement('p')).textContent = text;
      dialogueBox.appendChild(btnYes);
      dialogueBox.appendChild(btnNo);
      return; // fermati qui, altrimenti fa il default
    default:
      text = '🍄 Fungo: ...';
      inDialogue = false;
      dialogueBox.style.display = 'none';
      return;
  }

  const p = document.createElement('p');
  p.textContent = text;
  dialogueBox.appendChild(p);
}




export function updateTentacleInteraction(playerPosition) {
  if (!tentacle || !tentacle.visible) return;

  const dist = tentacle.position.distanceTo(playerPosition);

  if (dist < 2) {
    if (answered.every(val => val)) {
      promptState.active = true;
      promptState.text = '🐙 Premi F per raccogliere il tentacolo';

      if (keys.fPressed) {
        keys.fPressed = false;
        tentacle.visible = false;
        collectItem();
      }
    } else {
      promptState.active = true;
      promptState.text = '🔒 L’articolo non è in vendita.';
    }
  }
}


function showRiddleUI(index) {
  const riddle = riddles[index];
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '';

  const questionEl = document.createElement('p');
  questionEl.id = 'riddleQuestion';
  questionEl.textContent = riddle.question;

  const optionsEl = document.createElement('div');
  optionsEl.id = 'riddleOptions';
  optionsEl.style.marginTop = '10px';

  dialogueBox.appendChild(questionEl);
  dialogueBox.appendChild(optionsEl);

  riddle.options.forEach(option => {
    const btn = document.createElement('button');
    btn.textContent = option;
    btn.style.margin = '5px';
    btn.onclick = () => {
      if (option.toLowerCase() === riddle.answer.toLowerCase()) {
        questionEl.textContent = "✅ Risposta corretta!";
        answered[index] = true;

        setTimeout(() => {
          dialogueBox.style.display = 'none';

          const next = answered.findIndex(val => !val);
          if (next !== -1) {
            showRiddleUI(next);
          } else {
            showFinalDialogue();  // tutti risolti
          }
        }, 1000);
      } else {
        questionEl.textContent = "❌ Risposta sbagliata. Riprova!";
      }
    };
    optionsEl.appendChild(btn);
  });

  riddleActive = true;
  dialogueBox.style.display = 'block';
}



function showFinalDialogue() {
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '';

  const lines = [
    "🍄 Fungo in alto (Simon): Incredibile... li hai risolti tutti.",
    "Beh, hai vinto. Il tentacolo è tuo. Prendilo, se hai il coraggio..."
  ];

  lines.forEach(line => {
    const p = document.createElement('p');
    p.textContent = line;
    dialogueBox.appendChild(p);
  });

  dialogueBox.style.display = 'block';
}
