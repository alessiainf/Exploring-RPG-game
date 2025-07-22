import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { physicsWorld } from './physics.js';
import { collectItem } from './GameState.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';
import { initSpores } from './Weather.js';


let dialogueStep = 0;
let inDialogue = false;
const mushrooms = [];
let tentacle = null;
const answered = [false, false, false];  // uno per ogni riddle
export {mushrooms}

let mushroomRoot = null;
export { mushroomRoot };


//animation
let boneSimon = null;
let boneL_Arm = null;
let boneR_Arm = null;


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

  mushroomGroup.position.set(63, -0.1, -21);
  mushroomGroup.rotation.set(0, 0, 0);
  mushroomGroup.scale.set(0.015, 0.015, 0.015);
  scene.add(mushroomGroup);
  mushroomRoot = mushroomGroup;


  mushroomGroup.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  
  mushroomGroup.traverse(child => {
  if (child.isBone) {
    if (child.name === 'CC_Base_Head') boneSimon = child;
    if (child.name === 'CC_Base_L_Upperarm') boneL_Arm = child;
    if (child.name === 'CC_Base_R_Upperarm') boneR_Arm = child;
    if (child.name === 'CC_Base_Spine01') boneBritney = child;
  }
});


  mushrooms.push(mushroomGroup); 
  setupMushroomPhysics(mushroomGroup);
  initSpores(scene, mushroomRoot.position);

}


//mushroom animation
let currentTalkingBone = null;
let armsActive = false;
let boneBritney = null;
export{currentTalkingBone, boneSimon, boneL_Arm, boneR_Arm, armsActive, boneBritney};
let isTalkingSimon = false;
let isTalkingBritney = false;

export { isTalkingSimon, isTalkingBritney };

//head aniamtion (simon)
export function animateTalkingHead(bone, time) {
  if (!bone) return;

  // Respiro (sempre attivo)
  const breathAmplitude = 0.04;
  const breathFrequency = 0.2;
  const breathOffset = Math.sin(time * breathFrequency * Math.PI * 2) * breathAmplitude;
  bone.rotation.x = breathOffset;

  // Movimento laterale solo se sta parlando
  if (isTalkingSimon) {
    const talkAngle = Math.sin(time * 10) * 0.05;
    bone.rotation.y = talkAngle;
  } else {
    bone.rotation.y = 0; // neutro
  }
}



//arms animation (braum)
export function animateArms(timeMs) {
  if (!boneL_Arm || !boneR_Arm) return;

  const time = timeMs / 1000;

  // Movimento di respirazione (sempre attivo)
  const breathAmplitude = 0.09;
  const breathFrequency = 0.2;
  const breathOffset = Math.sin(time * breathFrequency * Math.PI * 2) * breathAmplitude;

  // Movimento attivo (gesticolazione)
  const gestureAmplitude = 0.2;
  const gestureFrequency = 1.5;
  const gestureOffset = Math.sin(time * gestureFrequency * Math.PI * 2) * gestureAmplitude;

  // Se sta parlando con braccia attive → gesticolazione + respiro
  if (armsActive) {
    boneL_Arm.rotation.x = gestureOffset - 0.4 + breathOffset;
    boneR_Arm.rotation.x = -gestureOffset - 0.4 + breathOffset;
  } else {
    // Solo respirazione
    boneL_Arm.rotation.x = -0.4 + breathOffset;
    boneR_Arm.rotation.x = -0.4 + breathOffset;
  }
}


//leg animation (britney)
export function animateBritney(timeMs) {
  if (!boneBritney) return;

  const time = timeMs / 1000;

  // Respiro (sempre attivo)
  const breathAmplitude = 0.02;
  const breathFrequency = 0.25;
  const breath = Math.sin(time * breathFrequency * Math.PI * 2) * breathAmplitude;

  // Oscillazione solo se sta parlando
  let swing = 0;
  if (isTalkingBritney) {
    const swingAmplitude = 0.04;
    const swingFrequency = 1;
    swing = Math.sin(time * swingFrequency * Math.PI * 2) * swingAmplitude;
  }

  boneBritney.rotation.x = swing + breath;
}


export function updateMushroomLogic(time) {
  // Aggiorna i flag
  isTalkingSimon = (currentTalkingBone === boneSimon);
  isTalkingBritney = (currentTalkingBone === boneBritney);

  // Anima braccia (sempre)
  animateArms(time);

  // Anima Simon e Britney
  animateTalkingHead(boneSimon, time / 1000);
  animateBritney(time);
}




export async function loadTentacle(scene) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('assets/models/Tentacle.glb');
  tentacle = gltf.scene;
  tentacle.position.set(65, 1, -24);
  tentacle.rotation.set(0, -Math.PI, -Math.PI / 2);
  tentacle.scale.set(1.5, 1.5, 1.5);
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

  // Reset default
  currentTalkingBone = null;
  isTalkingSimon = false;
  isTalkingBritney = false;

  let text = '';

  switch (dialogueStep) {
    case 0:
      text = '🧙‍♀️ Strega: ...Siete tre funghi impilati sotto un trench?!';
      break;
    case 1:
      text = '🍄???: SILENZIO! Noi siamo... IL FUNGONE!';
      currentTalkingBone = boneSimon;
      isTalkingSimon = true;
      isTalkingBritney = true;
      armsActive = true;
      break;
    case 2:
      text = '🍄Fungo in alto (Simon): Trattiamo oggetti rari, proibiti, dimenticati...';
      currentTalkingBone = boneSimon;
      isTalkingSimon = true;
      armsActive = false;
      break;
    case 3:
      text = '🍄 Fungo in basso (Britney): ...tipo tentacoli, denti di drago, fiale di tempo solido...';
      currentTalkingBone = boneBritney;
      isTalkingBritney = true;
      break;
    case 4:
      text = '🍄 Fungo in mezzo (Braum): Britney! Smettila di rivelare a tutti i nostri segreti!';
      armsActive = true;
      break;
    case 5:
      text = '🧙‍♀️ Strega: Be io avrei proprio bisogno di un tentacolo.';
      armsActive = false;
      break;
    case 6:
      text = '🍄 Fungo in mezzo (Braum): Non è in vendita. Ma potresti... meritarlo. Se il tuo cervello è ancora intatto.';
      armsActive = true;
      break;
    case 7:
      text = '🍄 Fungo in alto (Simon): Tre indovinelli. Se li risolvi, il tentacolo sarà tuo.';
      currentTalkingBone = boneSimon;
      isTalkingSimon = true;
      armsActive = false;
      break;
    case 8:
      text = '🍄 Fungo in basso (Britney): Se bari... ti vendiamo al mercato degli gnomi ciechi.';
      currentTalkingBone = boneBritney;
      isTalkingBritney = true;
      break;
    case 9:
      text = '🍄 Fungo in alto (Simon): Accetti la sfida?';
      currentTalkingBone = boneSimon;
      isTalkingSimon = true;
      // Mostra i bottoni qui sotto solo in questo caso
      const btnYes = document.createElement('button');
      btnYes.classList.add('dialogue-button');
      btnYes.textContent = 'SÌ';
      //btnYes.style.margin = '5px';
      btnYes.onclick = () => {
        dialogueBox.style.display = 'none';
        inDialogue = false;
        const next = answered.findIndex(val => !val);
        showRiddleUI(next);
      };

      const btnNo = document.createElement('button');
      btnNo.classList.add('dialogue-button');
      btnNo.textContent = 'NO';
      //btnNo.style.margin = '5px';
      btnNo.onclick = () => {
        dialogueBox.style.display = 'none';
        inDialogue = false;
        isTalkingSimon = false;
        isTalkingBritney = false;
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

export function animateTentacle(time) {
  if (!tentacle) return;

  // Rotazione continua sul proprio asse
  tentacle.rotation.y += 0.01;
}



function showRiddleUI(index) {
  const riddle = riddles[index];
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '';

  const questionEl = document.createElement('p');
  questionEl.id = 'riddleQuestion';
  isTalkingSimon = true;
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
    btn.classList.add('dialogue-button');
    btn.onclick = () => {
      if (option.toLowerCase() === riddle.answer.toLowerCase()) {
        btn.classList.add('dialogue-button');

        questionEl.textContent = "✅ Risposta corretta!";
        isTalkingSimon = false;
        isTalkingBritney = false;
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
        btn.classList.add('dialogue-button');

        questionEl.textContent = "❌ Risposta sbagliata. Riprova!";
        isTalkingSimon = false;
        isTalkingBritney = false;
      }
    };
    optionsEl.appendChild(btn);
  });

  riddleActive = true;
  dialogueBox.style.display = 'block';
}



function showFinalDialogue() {
  isTalkingSimon = false;
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = '';

  const lines = [
    "🍄 Fungo in alto (Simon): Incredibile... li hai risolti tutti. Beh, hai vinto. Il tentacolo è tuo. \nSi dice che scelga solo menti... saporite."
  ];

  lines.forEach(line => {
    const p = document.createElement('p');
    p.textContent = line;
    dialogueBox.appendChild(p);
  });

  dialogueBox.style.display = 'block';
}
