import * as THREE from 'three';
import { collectItem, hasCollectedAll } from './GameState.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';


const gltfLoader = new GLTFLoader();

let cauldrons = [];
let firesLit = [false, false, false];
let fireParticles = [[], [], []];  
let fireflies = [];
let fireflyClock = new THREE.Clock();
let doorVisible = false;
let gameFinished = false;
let mirrorPortale = null; // nuovo oggetto mirror

const cauldronModels = [
  { url: 'assets/models/Honey.glb', scale: 1.2 },
  { url: 'assets/models/Tentacle.glb', scale: 1.5 },
  { url: 'assets/models/Necklace.glb', scale: 0.5 }
];

const torchWallPositions = [
  new THREE.Vector3(76.2, 1.6, -5),  // sinistra dietro l'altare sinistro
  new THREE.Vector3(75.6, 1.6, 3.5)    // destra dietro l'altare destro
];
let wallTorches = [];


export function createCauldrons(scene) {
  const cauldronGeometry = new THREE.CylinderGeometry(0.6, 0.8, 1, 32);
  const cauldronMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const fireMaterial = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff3300 });

  const positions = [
    new THREE.Vector3(74, 0, -2.5),
    new THREE.Vector3(75, 0, -0.5),
    new THREE.Vector3(74, 0, 1.5)
  ];

  for (let i = 0; i < 3; i++) {
    const cauldron = new THREE.Mesh(cauldronGeometry, cauldronMaterial);
    cauldron.position.copy(positions[i]);
    cauldron.name = `cauldron_${i}`;
    scene.add(cauldron);

    cauldron.fire = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      fireMaterial.clone()
    );
    cauldron.fire.visible = false;
    cauldron.fire.position.set(0, 0.8, 0);
    cauldron.add(cauldron.fire);
    cauldrons.push(cauldron);
  }

  // Hidden door
  //uso reflector che è una classe di three.js per superfici riflettenti
  //-> examples/jsm/objects/Reflector.js
  //crea una camera virtuale per renderizzare la scena dietro al piano
  const mirrorGeometry = new THREE.PlaneGeometry(1.5, 3);
  mirrorPortale = new Reflector(mirrorGeometry, {
    clipBias: 0.003,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    color: 0x222244, //viola/blu
  });
  mirrorPortale.position.set(52, 1, -1);
  mirrorPortale.rotation.y = Math.PI / 2;
  mirrorPortale.visible = false;
  scene.add(mirrorPortale);

  // Torce da muro con sola PointLight
  for (let i = 0; i < torchWallPositions.length; i++) {
    gltfLoader.load('assets/models/Torch.glb', gltf => {
      const torch = gltf.scene;
      torch.position.copy(torchWallPositions[i]);
      torch.scale.set(1.5, 1.5, 1.5);
      torch.rotation.y = -Math.PI / 2; // Orientata verso l'altare
      torch.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // pointLight con luce calda
      const light = new THREE.PointLight(0xffaa66, 1.4, 6, 2); // colore caldo
      light.position.set(0, 0.5, 0); // leggermente sopra il modello
      torch.add(light);
      scene.add(torch);
      wallTorches.push(torch);
    });
  }
}


export function updateCauldronInteraction(playerPosition) {
  if (gameFinished) return;

  for (let i = 0; i < cauldrons.length; i++) {
    const cauldron = cauldrons[i];
    const distance = playerPosition.distanceTo(cauldron.position);

    if (distance < 2 && !firesLit[i]) {
      if (hasCollectedAll()) {
        promptState.active = true;
        promptState.text = `🔥 Premi F per offrire un oggetto`;

        if (keys.fPressed) {
          keys.fPressed = false;
          lightFire(i);
        }
      } else {
        promptState.active = true;
        promptState.text = `🛑 Raccogli prima i 3 oggetti per offrirli`;
      }
    }
      /*
      if (distance < 2 && !firesLit[i]) {
            promptState.active = true;
            promptState.text = `🔥 Premi F per offrire un oggetto`;

            if (keys.fPressed) {
              keys.fPressed = false;
              lightFire(i);
              collectItem();
            }
          }
        */
  }
  if (firesLit.every(Boolean) && !doorVisible) {
    triggerFinalSequence(cauldrons[1].parent);
  }
}


function lightFire(index) {
  //memorizza che il calderone è stato acceso
  const cauldron = cauldrons[index];
  firesLit[index] = true;

  // Luce tremolante sopra il calderone
  const fireLight = new THREE.PointLight(0xff5500, 1, 5, 2);
  fireLight.position.set(0, 1.1, 0);
  cauldron.add(fireLight);
  cauldron.fireLight = fireLight;

  //uso sprite che è un oggetto 2d grafico che è sempre orientato verso la camera
  //carico la texture
  const fireSprites = [];
  const fireTexture = new THREE.TextureLoader().load('assets/textures/fire.png');
  //definisco il materiale
  //SpriteMaterial è un materiale che posso assegnare a uno sprite
  const spriteMaterial = new THREE.SpriteMaterial({
    map: fireTexture, //png da visualizzare
    transparent: true,
    depthWrite: false, //non oscura altri oggetti nella scena
    opacity: 1,                    
    color: new THREE.Color(0xff66ff), //rosa :)
  });

  //definisco 10 sprite
  for (let i = 0; i < 10; i++) {
    const sprite = new THREE.Sprite(spriteMaterial.clone());
    //li scalo randomicamente
    sprite.scale.set(0.5 + Math.random() * 0.2, 0.6 + Math.random() * 0.3, 1);
    sprite.position.set(
      (Math.random() - 0.5) * 0.3,
      0.3 + Math.random() * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    //ruoto e opacizzo randomicamente per realismo
    sprite.material.opacity = 0.5 + Math.random() * 0.4;
    sprite.material.rotation = Math.random() * Math.PI;
    //velocità verso l'alto
    sprite.userData.velocity = new THREE.Vector3(0, 0.005 + Math.random() * 0.01, 0);
    cauldron.add(sprite);
    fireSprites.push(sprite);
  }
  fireParticles[index] = fireSprites;

  // Carica il modello dell’oggetto offerto
  const modelInfo = cauldronModels[index];
  gltfLoader.load(modelInfo.url, gltf => {
    const model = gltf.scene;
    model.scale.setScalar(modelInfo.scale);
    model.position.set(0, 0.8, 0); 
    model.rotation.y = Math.random() * Math.PI * 2;

    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    cauldron.add(model);
  });
}

//gestisce le animazioni per fiamme, fuochi fatui e il portale
export function updateFireEffects() {
  const delta = fireflyClock.getDelta();

  // per ogni calderone prendi lo sprite associato e muovilo verso l alto
  for (let i = 0; i < fireParticles.length; i++) {
    const sprites = fireParticles[i];
    if (!sprites || sprites.length === 0) continue;

    for (let j = 0; j < sprites.length; j++) {
      const sprite = sprites[j];
      //used data definito in lightfire
      sprite.position.addScaledVector(sprite.userData.velocity, delta * 60);
      //riduce la trasparenza gardualmente
      sprite.material.opacity -= 0.002;

      //se la fiamma è troppo alta o invisibile la rigenera
      if (sprite.position.y > 1 || sprite.material.opacity <= 0) {
        // Reset posizione e opacità
        sprite.position.y = 0.3 + Math.random() * 0.3;
        sprite.position.x = (Math.random() - 0.5) * 0.3;
        sprite.position.z = (Math.random() - 0.5) * 0.3;
        sprite.material.opacity = 0.5 + Math.random() * 0.4;
      }
    }

    // Per effetto tremolio con funzione seno
    if (cauldrons[i].fireLight) {
      cauldrons[i].fireLight.intensity = 0.8 + Math.sin(performance.now() * 0.01 + i) * 0.2;
    }
  }

  // Anima i fuochi fatui
  //galleggiano verticalmente su e giu seguendo una funzione sin
  const time = performance.now() * 0.001;
  for (let i = 0; i < fireflies.length; i++) {
    const p = fireflies[i];
    const offset = p.userData.floatOffset || 0;
    p.position.y = p.userData.originalY + Math.sin(time * 2 + offset) * 0.1;
    p.material.emissiveIntensity = 0.8 + Math.sin(time * 5 + offset) * 0.2;
  }

  // Quando la porta appare, lo fa gradualmente
  if (mirrorPortale && doorVisible && mirrorPortale.material.opacity < 1.0) {
    mirrorPortale.material.opacity += 0.01;
  }
}


//quando tutti e tre i calderoni sono attivati
function triggerFinalSequence(scene) {
  // Calcola punto centrale dei calderoni
  //->partenza per i fuochi fatui
  const start = new THREE.Vector3();
  cauldrons.forEach(c => start.add(c.position));
  start.divideScalar(cauldrons.length);
  //posizione verso cui vanno i fuochi fatui
  const end = mirrorPortale.position.clone();  

  //genera fuochi fatui
  const steps = 100;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    //calcola posizione intermedia tra start ed end
    //lo fa a step t quindi si distribuiscono lungo il percorso
    const basePos = new THREE.Vector3().lerpVectors(start, end, t);

    // Aggiunta random per sparpagliarli attorno al percorso
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 2,  // lateralmente
      (Math.random() - 0.5) * 1,  // verticalmente
      (Math.random() - 0.5) * 2   // profondità
    );

    const pos = basePos.clone().add(offset);

    //spheregeometry per i fuochi fatui
    const geom = new THREE.SphereGeometry(0.025, 6, 6); 
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffdd,
      transparent: true,
      opacity: 1.0
    });

    const glow = new THREE.Mesh(geom, mat);
    glow.position.copy(pos);
    glow.userData.floatOffset = Math.random() * Math.PI * 2;
    glow.userData.originalY = pos.y;
    scene.add(glow);
    fireflies.push(glow);
  }

  // Rendi la porta visibile
  mirrorPortale.visible = true;
  doorVisible = true;
}

//quando il giocatore è vicino alla porta e il gioco è finito,
// se preme F compare la schermata di fine gioco con un fade-in
//compare il pulsante "torna all'inizio" per ricominciare
export function checkDoorCollision(playerPosition) {
  if (!doorVisible || gameFinished) return;
  const distance = playerPosition.distanceTo(mirrorPortale.position);
  if (distance < 1.5 && !gameFinished) {
    promptState.active = true;
    promptState.text = '✨ Premi F per attraversare lo specchio';

    if (keys.fPressed) {
      keys.fPressed = false;
      gameFinished = true;

      // 🕳️ Overlay nero con fade-in
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundImage = 'url("assets/images/end.png")';
      overlay.style.backgroundSize = 'cover';
      overlay.style.backgroundPosition = 'center';
      overlay.style.backgroundRepeat = 'no-repeat';

      overlay.style.zIndex = '999';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.gap = '40px';
      overlay.style.color = 'white';
      overlay.style.fontFamily = 'serif';
      overlay.style.fontWeight = 'lighter';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 3s';
      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 100);

      // Testo finale narrativo
      const text = document.createElement('div');
      text.innerText =
      'Sei fuggito dal mondo delle nebbie\n' +
      'ma ciò che hai lasciato dietro non è più il mondo che conoscevi.\n\n' +
      'Forse non sei fuggito...\n' +
      'forse hai solo cambiato lato dello specchio.\n' +
      'La tua avventura nei mondi paralleli è appena cominciata.';

      text.style.fontSize = '36px';
      text.style.lineHeight = '1.6';
      text.style.textShadow = '2px 2px 8px #000000';
      text.style.textAlign = 'center';
      text.style.whiteSpace = 'pre-line';
      text.style.maxWidth = '80%';
      overlay.appendChild(text);

      // Pulsante Rigioca
      const button = document.createElement('button');
      button.innerText = 'Torna all’inizio';
      button.style.padding = '15px 30px';
      button.style.fontSize = '20px';
      button.style.cursor = 'pointer';
      button.style.backgroundColor = '#ffffff';
      button.style.border = '2px solid white';
      button.style.borderRadius = '10px';
      button.style.color = 'black';
      button.onmouseenter = () => (button.style.backgroundColor = '#dddddd');
      button.onmouseleave = () => (button.style.backgroundColor = '#ffffff');
      button.onclick = () => window.location.reload();
      overlay.appendChild(button);
    }
  }
}
