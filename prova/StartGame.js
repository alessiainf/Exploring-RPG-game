// StartGame.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { keys } from './InputManager.js';
import { promptState } from './main.js';



let book = null;
let bookRead = false;
let nearBook = false;
let smokeParticles = [];
let smokeClock = new THREE.Clock();


export { book, bookRead };
let bookMesh = null;
export { bookMesh };

export async function loadBook(scene) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('assets/models/book.glb');

  book = gltf.scene;
  bookMesh = book;
  book.position.set(-9, 0.05, -7);  // Modifica posizione se necessario
  book.scale.set(1.5, 1.5, 1.5);
  book.rotation.set(-Math.PI, Math.PI , Math.PI / 2); // Ruota il libro per essere visibile

  scene.add(book);

  book.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true; 
  });
}

function createSmokeParticle(scene) {
  const geometry = new THREE.SphereGeometry(0.04, 8, 8);  //Regulate spheres dimension
  const material = new THREE.MeshStandardMaterial({
    color: 0x9933ff,
    transparent: true,
    opacity: 0.5,
    emissive: 0x9900ff
  });

  const particle = new THREE.Mesh(geometry, material);
  particle.position.copy(book.position);
  particle.position.y += 0.3 + Math.random() * 0.05;

  particle.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.004,    
    0.005 + Math.random() * 0.004,   
    (Math.random() - 0.5) * 0.009
  );

  particle.age = 0;
  scene.add(particle);
  smokeParticles.push(particle);
}

export function updateBookInteraction(playerPosition) {
  const dialogueBox = document.getElementById('dialogueBox');

  if (!bookMesh || !dialogueBox) return;

  // Non interferire se il dialogo è aperto e non riguarda il libro
  if (dialogueBox.style.display === 'block' && !dialogueBox.textContent.includes('ISTRUZIONI')) {
    return;
  }

  const distance = playerPosition.distanceTo(bookMesh.position);
  const isNear = distance < 2;

  if (isNear) {
    promptState.active = true;
    promptState.text = '📖 Premi F per leggere le istruzioni';

    if (keys.fPressed) {
      keys.fPressed = false;

      if (dialogueBox.style.display === 'none' || dialogueBox.style.display === '') {
        // Mostra istruzioni
        dialogueBox.innerHTML = `
          🧾 <b>ISTRUZIONI:</b><br>
           "Chiunque voglia fuggire da queste Terre Velate, dovrà risvegliare l’antico Portale a Nord.
          Per farlo servono tre Doni perduti nel tempo:<br>
          🔮 <b>La Collana del Vento</b>.<br>
          🍯 <b>Il Miele Dorato</b>.<br>
          🐙 <b>Il Tentacolo d'Ombra</b>.<br>
          Quando i tre Doni saranno tuoi, il Portale si aprirà... e il cammino verso la libertà sarà finalmente tracciato."<br><br>
        `;
        dialogueBox.style.display = 'block';
      } else {
        // Nascondi istruzioni
        dialogueBox.style.display = 'none';
      }
    }
  } else {
    if (dialogueBox.style.display === 'block') {
      dialogueBox.style.display = 'none';
    }
  }
}


//smoke effect animation
export function updateBookEffect(time) {
  if (!book) return;

  // Crea nuove particelle ogni 0.2s circa
  if (Math.floor(time * 5) % 2 === 0) {
    createSmokeParticle(book.parent);  // book è nella scena
  }

  // COnsider every particle in smookeParticles and move them
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const p = smokeParticles[i];
    p.position.add(p.velocity);
    p.material.opacity -= 0.005; //Diminuisci opacità per effetto dissolvenza a ogni frame
    p.age += 1; //tiene conto dell'età della particella

    //rimuove le particelle che sono troppo vecchie o completamente trasparenti
    if (p.material.opacity <= 0 || p.age > 300) { 
      book.parent.remove(p);
      smokeParticles.splice(i, 1);
    }
  }
}
