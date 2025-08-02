// GameState.js

let collectedItems = 0;
const totalItems = 3;
let counterElement = null;

export function initGameState() {
  // Carica Google Font (es. Cinzel)
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  counterElement = document.createElement('div');
  counterElement.id = 'itemCounter';
  counterElement.style.position = 'absolute';
  counterElement.style.top = '20px';
  counterElement.style.left = '20px';
  counterElement.style.padding = '10px 20px';
  counterElement.style.background = 'rgba(0, 0, 0, 0.5)';
  counterElement.style.borderRadius = '10px';
  counterElement.style.color = '#FFD700';  // oro
  counterElement.style.fontSize = '40px';
  counterElement.style.fontFamily = "'Cinzel', serif";
  counterElement.style.textShadow = '2px 2px 5px black';
  counterElement.style.transition = 'transform 0.2s ease';
  counterElement.innerText = `Oggetti raccolti: 0/${totalItems}`;
  document.body.appendChild(counterElement);
}


export function collectItem() {
  collectedItems = Math.min(collectedItems + 1, totalItems);
  if (counterElement) {
    counterElement.innerText = `Oggetti raccolti: ${collectedItems}/${totalItems}`;
    
    // Effetto animato
    counterElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
      counterElement.style.transform = 'scale(1)';
    }, 200);
  }

  if (collectedItems >= totalItems) {
  counterElement.style.color = '#00FF00'; // verde brillante
  counterElement.innerText = '✅ Tutti gli oggetti raccolti!';
}

}


export function hasCollectedAll() {
  return collectedItems >= totalItems;
}


if (hasCollectedAll()) {
//  // apri la porta o attiva l'uscita
}
//FINE GIOCO