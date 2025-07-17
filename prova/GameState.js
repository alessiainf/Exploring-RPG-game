// GameState.js

let collectedItems = 0;
const totalItems = 3;
let counterElement = null;

export function initGameState() {
  // Crea il contatore in alto a sinistra
  counterElement = document.createElement('div');
  counterElement.id = 'itemCounter';
  counterElement.style.position = 'absolute';
  counterElement.style.top = '20px';
  counterElement.style.left = '20px';
  counterElement.style.color = 'white';
  counterElement.style.fontSize = '50px';
  counterElement.style.fontFamily = 'Georgia, serif';
  counterElement.style.textShadow = '2px 2px 5px black';
  counterElement.innerText = `Oggetti raccolti: 0/${totalItems}`;
  document.body.appendChild(counterElement);
}

export function collectItem() {
  collectedItems = Math.min(collectedItems + 1, totalItems);
  if (counterElement) {
    counterElement.innerText = `Oggetti raccolti: ${collectedItems}/${totalItems}`;
  }
}

export function hasCollectedAll() {
  return collectedItems >= totalItems;
}



//


if (hasCollectedAll()) {
//  // apri la porta o attiva l'uscita
}
//FINE GIOCO