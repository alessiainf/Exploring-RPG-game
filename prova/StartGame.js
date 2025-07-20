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
let bookMesh = null;
let table = null;
export { book, bookRead, table, bookMesh };





export async function loadBook(scene) {
  const loader = new GLTFLoader();

  // Carica il libro
  const gltfBook = await loader.loadAsync('assets/models/book.glb');
  book = gltfBook.scene;
  bookMesh = book;

  // Carica il tavolo
  const gltfTable = await loader.loadAsync('assets/models/Table.glb');
  table = gltfTable.scene;


  // Posizione comune per entrambi
  const basePosition = new THREE.Vector3(-9, -0.1, -7);

  // Tavolo
  table.position.copy(basePosition);
  table.scale.set(1.2, 1.2, 1.2);
  scene.add(table);

  table.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  // Libro sopra il tavolo
  book.position.set(basePosition.x, basePosition.y + 1.2, basePosition.z); // 0.9 = altezza tavolo
  book.scale.set(1.5, 1.5, 1.5);
  book.rotation.set(-Math.PI, Math.PI, Math.PI / 2);
  scene.add(book);

  book.traverse(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
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
    promptState.text = '📖 Premi F per leggere lo strano libro';

    if (keys.fPressed) {
      keys.fPressed = false;

      if (dialogueBox.style.display === 'none' || dialogueBox.style.display === '') {
        // Mostra istruzioni
        dialogueBox.innerHTML = `"🧾 Chiunque voglia fuggire da queste Terre Velate, dovrà risvegliare l’antico Portale.
          Per farlo devi offrire agli altari a Nord tre Doni perduti nel tempo:<br>
          🔮 <b>La Collana del Vento</b>.<br>
          🍯 <b>Il Miele Dorato</b>.<br>
          🐙 <b>Il Tentacolo d'Ombra</b>."
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

