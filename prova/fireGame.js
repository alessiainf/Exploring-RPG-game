import * as THREE from 'three';
import { collectItem, hasCollectedAll } from './GameState.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const gltfLoader = new GLTFLoader();


let cauldrons = [];
let firesLit = [false, false, false];
let fireParticles = [[], [], []];  
let fireflies = [];
let fireflyClock = new THREE.Clock();
let magicDoor = null;
let doorVisible = false;
let gameFinished = false;
const cauldronModels = [
  { url: 'assets/models/Honey.glb', scale: 1.2 },
  { url: 'assets/models/Tentacle.glb', scale: 1.5 },
  { url: 'assets/models/Necklace.glb', scale: 0.5 }
];


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
  magicDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 3, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0 })
  );
  magicDoor.position.set(58, 1.5, 27);
  magicDoor.visible = false;
  scene.add(magicDoor);
}

export function updateCauldronInteraction(playerPosition) {
  if (gameFinished) return;

  for (let i = 0; i < cauldrons.length; i++) {
    const cauldron = cauldrons[i];
    const distance = playerPosition.distanceTo(cauldron.position);
/*
    if (distance < 2 && !firesLit[i]) {
  if (hasCollectedAll()) {
    promptState.active = true;
    promptState.text = `🔥 Press F to offer a gift`;

    if (keys.fPressed) {
      keys.fPressed = false;
      lightFire(i);
    }
  } else {
    promptState.active = true;
    promptState.text = `🛑 You need all 3 items to offer something`;
  }
}*/

if (distance < 2 && !firesLit[i]) {
      promptState.active = true;
      promptState.text = `🔥 Press F to offer an item`;

      if (keys.fPressed) {
        keys.fPressed = false;
        lightFire(i);
        collectItem();
      }
    }

  }
     

  if (firesLit.every(Boolean) && !doorVisible) {
    triggerFinalSequence(cauldrons[1].parent);
  }
}

function lightFire(index) {
  const cauldron = cauldrons[index];
  firesLit[index] = true;

  // Luce tremolante
  const fireLight = new THREE.PointLight(0xff5500, 1, 5, 2);
  fireLight.position.set(0, 1.1, 0);
  cauldron.add(fireLight);
  cauldron.fireLight = fireLight;

  // Sprite fuoco animato
  const fireSprites = [];
  const fireTexture = new THREE.TextureLoader().load('assets/textures/fire.png');
  const spriteMaterial = new THREE.SpriteMaterial({
    map: fireTexture,
    transparent: true,
    depthWrite: false,
    opacity: 1,                    // meno trasparente
    color: new THREE.Color(0xff66ff), 
  });

  for (let i = 0; i < 10; i++) {
    const sprite = new THREE.Sprite(spriteMaterial.clone());
    sprite.scale.set(0.5 + Math.random() * 0.2, 0.6 + Math.random() * 0.3, 1);
    sprite.position.set(
      (Math.random() - 0.5) * 0.3,
      0.3 + Math.random() * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    sprite.material.opacity = 0.5 + Math.random() * 0.4;
    sprite.material.rotation = Math.random() * Math.PI;
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



function triggerFinalSequence(scene) {
  // Calcola punto centrale dei calderoni
  const start = new THREE.Vector3();
  cauldrons.forEach(c => start.add(c.position));
  start.divideScalar(cauldrons.length);

  const end = magicDoor.position.clone();

  const steps = 100;
for (let i = 0; i < steps; i++) {
  const t = i / (steps - 1);
  const basePos = new THREE.Vector3().lerpVectors(start, end, t);

  // Aggiunta random per sparpagliarli attorno al percorso
  const offset = new THREE.Vector3(
    (Math.random() - 0.5) * 2,  // lateralmente
    (Math.random() - 0.5) * 1,  // verticalmente
    (Math.random() - 0.5) * 2   // profondità
  );

  const pos = basePos.clone().add(offset);

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
  magicDoor.visible = true;
  doorVisible = true;
}


export function updateFireEffects() {
  const delta = fireflyClock.getDelta();

  // 🔥 Update sprite flames
  for (let i = 0; i < fireParticles.length; i++) {
    const sprites = fireParticles[i];
    if (!sprites || sprites.length === 0) continue;

    for (let j = 0; j < sprites.length; j++) {
      const sprite = sprites[j];
      sprite.position.addScaledVector(sprite.userData.velocity, delta * 60);
      sprite.material.opacity -= 0.002;

      if (sprite.position.y > 1 || sprite.material.opacity <= 0) {
        // Reset posizione e opacità
        sprite.position.y = 0.3 + Math.random() * 0.3;
        sprite.position.x = (Math.random() - 0.5) * 0.3;
        sprite.position.z = (Math.random() - 0.5) * 0.3;
        sprite.material.opacity = 0.5 + Math.random() * 0.4;
      }
    }

    // Luce tremolante
    if (cauldrons[i].fireLight) {
      cauldrons[i].fireLight.intensity = 0.8 + Math.sin(performance.now() * 0.01 + i) * 0.2;
    }
  }


  // Firefly trail 
  const time = performance.now() * 0.001;
  for (let i = 0; i < fireflies.length; i++) {
    const p = fireflies[i];
    const offset = p.userData.floatOffset || 0;
    p.position.y = p.userData.originalY + Math.sin(time * 2 + offset) * 0.1;
    p.material.emissiveIntensity = 0.8 + Math.sin(time * 5 + offset) * 0.2;
  }


  // Door fade-in
  if (magicDoor && doorVisible && magicDoor.material.opacity < 1.0) {
    magicDoor.material.opacity += 0.01;
  }
}


export function checkDoorCollision(playerPosition) {
  if (!doorVisible || gameFinished) return;
  const distance = playerPosition.distanceTo(magicDoor.position);
  if (distance < 1.5) {
    gameFinished = true;

    // 🕳️ Overlay nero
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'black';
    overlay.style.zIndex = '999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.gap = '30px';
    overlay.style.color = 'white';
    overlay.style.fontFamily = 'sans-serif';
    overlay.style.transition = 'opacity 1s';
    document.body.appendChild(overlay);

    // Testo finale
    const text = document.createElement('div');
    text.innerText = '✨ Sei fuggito! ✨';
    text.style.fontSize = '48px';
    overlay.appendChild(text);

    // Pulsante Rigioca
    const button = document.createElement('button');
    button.innerText = 'Rigioca';
    button.style.padding = '15px 30px';
    button.style.fontSize = '20px';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = '#ffffff';
    button.style.border = '2px solid white';
    button.style.borderRadius = '10px';
    button.onclick = () => window.location.reload();
    overlay.appendChild(button);
  }
}
