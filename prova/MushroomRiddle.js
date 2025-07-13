import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { physicsWorld } from './physics.js';
import { collectItem } from './GameState.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';

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
  const gltf = await loader.loadAsync('assets/models/Mushrooms In A Trenc.glb');
  const mushroomGroup = gltf.scene;

  mushroomGroup.position.set(74, 1.8, -26);
  mushroomGroup.rotation.set(0, -Math.PI / 2, 0);
  mushroomGroup.scale.set(1.5, 1.5, 1.5);
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
  if (dialogueBox && dialogueBox.style.display === 'block' && dialogueBox.textContent.trim() === '') {
    dialogueBox.style.display = 'none';
  }
//dialogueBox.textContent = ''
  const mush = mushrooms[0];
  const dist = mush.position.distanceTo(playerPosition);
  const allAnswered = answered.every(val => val);

  if (dist < 2) {
    if (keys.fPressed) {
      keys.fPressed = false;

      if (dialogueBox.style.display !== 'none') {
        const next = answered.findIndex(val => !val);
        if (next !== -1) {
          showRiddleUI(next);
        } else {
          dialogueBox.style.display = 'none';
        }
      } else {
        if (!allAnswered) {
          const next = answered.findIndex(val => !val);
          showRiddleUI(next);
        } else {
          promptState.active = true;
          promptState.text = '🐙 Tutti gli indovinelli risolti! Vai al tentacolo.';
        }
      }
    }

    if (dialogueBox.style.display === 'none') {
      promptState.active = true;
      promptState.text = allAnswered
        ? '🐙 Tutti gli indovinelli risolti! Vai al tentacolo.'
        : '🍄 Premi F per parlare con il fungo';
    }
  }
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

  // === PULIZIA COMPLETA del contenuto del dialogo precedente ===
  dialogueBox.innerHTML = '';

  // === CREA ELEMENTI per domanda e risposte ===
  const questionEl = document.createElement('p');
  questionEl.id = 'riddleQuestion';
  questionEl.textContent = riddle.question;

  const optionsEl = document.createElement('div');
  optionsEl.id = 'riddleOptions';
  optionsEl.style.marginTop = '10px';

  dialogueBox.appendChild(questionEl);
  dialogueBox.appendChild(optionsEl);

  // === CREA BOTTONI DELLE RISPOSTE ===
  riddle.options.forEach(option => {
    const btn = document.createElement('button');
    btn.textContent = option;
    btn.style.margin = '5px';
    btn.style.padding = '6px 12px';
    btn.style.cursor = 'pointer';

    btn.onclick = () => {
      if (option.toLowerCase() === riddle.answer.toLowerCase()) {
        questionEl.textContent = "✅ Risposta corretta!";
        answered[index] = true;
      } else {
        questionEl.textContent = "❌ Risposta sbagliata. Riprova!";
      }
    };
    optionsEl.appendChild(btn);
  });

  riddleActive = true;
  dialogueBox.style.display = 'block';
}


