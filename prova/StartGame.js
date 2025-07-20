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



// IntroManager.js
export class IntroManager {
  constructor(startCallback) {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = 0;
    this.container.style.left = 0;
    this.container.style.width = '100vw';
    this.container.style.height = '100vh';
    this.container.style.backgroundColor = 'black';
    this.container.style.zIndex = 10000;
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';
    this.container.style.color = 'white';
    this.container.style.fontFamily = 'Georgia, serif';
    this.container.style.fontSize = '28px';
    this.container.style.textAlign = 'center';
    this.container.style.overflow = 'hidden';
    document.body.appendChild(this.container);

    this.images = [
      '1.png', '2.png', '3.png', '4.png', '5.png', '6.png'
    ].map(name => `./assets/images/${name}`);

    this.texts = [
      "C'era una volta una giovane maga, animata da un'insaziabile curiosità, che studiava segretamente le arti oscure.",
      "Un giorno qualcosa andò storto ed evocò un potere che non riusciva a comprendere.",
      "La magia divenne incontrollabile e tutto iniziò a tremare.",
      "In un istante, un vortice di pura energia la avvolse e la strappò via dal suo mondo.",
      "Si risvegliò, confusa, in una foresta misteriosa.",
      "Ora, deve trovare un modo per tornare indietro..."
    ];

    this.index = -2;
    this.startCallback = startCallback;

    this.showMenu();
  }

  showMenu() {
    this.container.innerHTML = '';

    // Imposta immagine di sfondo a schermo intero
    this.container.style.backgroundImage = 'url("./assets/images/menu.png")';
    this.container.style.backgroundSize = 'cover';
    this.container.style.backgroundPosition = 'center';
    this.container.style.backgroundRepeat = 'no-repeat';

    const overlay = document.createElement('div');
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    const title = document.createElement('h1');
    title.textContent = 'A Lost Witch Tale';
    title.style.fontSize = '64px';
    title.style.color = 'white';
    title.style.fontFamily = 'Georgia, serif';
    title.style.textShadow = '2px 2px 10px rgba(0,0,0,0.8)';
    title.style.marginBottom = '40px';

    overlay.appendChild(title);


    const button = document.createElement('button');
    button.textContent = 'Inizia l\'avventura';
    button.style.padding = '20px 40px';
    button.style.fontSize = '32px';
    button.style.cursor = 'pointer';
    button.style.borderRadius = '10px';
    button.style.border = 'none';
    button.style.backgroundColor = '#7b4fa3';
    button.style.color = 'white';
    button.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
    button.onclick = () => this.showNext();

    overlay.appendChild(button);
    this.container.appendChild(overlay);
  }


showNext() {
  this.index++;

  // Se finita la sequenza narrativa: fade out
  if (this.index >= this.images.length) {
    this.container.style.transition = 'opacity 1s';
    this.container.style.opacity = 0;
    setTimeout(() => {
      document.body.removeChild(this.container);
      this.startCallback();
    }, 1000);
    return;
  }

  // Alla prima immagine della storia: cambia sfondo da immagine → viola
  if (this.index === 0) {
    this.container.style.backgroundImage = '';
    this.container.style.backgroundColor = this.narrativeBackground;
  }

  // Crea slide narrativa con fade-in
  const slide = document.createElement('div');
  slide.style.position = 'absolute';
  slide.style.top = 0;
  slide.style.left = 0;
  slide.style.width = '100%';
  slide.style.height = '100%';
  slide.style.display = 'flex';
  slide.style.flexDirection = 'column';
  slide.style.alignItems = 'center';
  slide.style.justifyContent = 'center';
  slide.style.opacity = 0;
  slide.style.transition = 'opacity 1s';

  const img = document.createElement('img');
  img.src = this.images[this.index];
  img.style.height = '100vh';
  img.style.width = 'auto';
  img.style.objectFit = 'contain';
  img.style.display = 'block';
  img.style.margin = '0 auto';

  const caption = document.createElement('div');
  caption.textContent = this.texts[this.index];
  caption.style.position = 'absolute';
  caption.style.bottom = '60px';
  caption.style.width = '100%';
  caption.style.textAlign = 'center';
  caption.style.color = 'white';
  caption.style.fontSize = '28px';
  caption.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  caption.style.padding = '20px';
  caption.style.fontFamily = 'Georgia, serif';

  slide.appendChild(img);
  slide.appendChild(caption);

  this.container.innerHTML = '';
  this.container.appendChild(slide);

  // Forza reflow e fade-in
  void slide.offsetWidth;
  slide.style.opacity = 1;

  // Al clic: fade-out e passa alla prossima slide
  this.container.onclick = () => {
    slide.style.opacity = 0;
    this.container.onclick = null;
    setTimeout(() => this.showNext(), 1000);
  };
}



}

