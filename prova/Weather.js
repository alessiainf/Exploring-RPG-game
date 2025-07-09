// Weather.js
import * as THREE from 'three';
import { wizard } from './Statuegame.js';  // importa wizard per calcolo distanza
import { getLights } from './lighting.js';
import { checkStatueOrientations } from './Statuegame.js';


let fog;  // nebbia attiva
let weatherCleared = false;
let clearingT = 0; 
const clearingSpeed = 0.01; // velocità di dissolvenza


export function initWeather(scene) {
  fog = new THREE.Fog(0xaaaaaa, 10, 60); 
  scene.fog = fog;
}

export function updateWeather(playerPosition) {
  if (!wizard || !fog) return;

  const dist = playerPosition.distanceTo(wizard.position);

  // Controlla se le statue sono correttamente orientate
  const statuesCorrect = checkStatueOrientations();

  // Se statue corrette, aumenta progressivamente clearingT verso 1
  if (statuesCorrect) {
    clearingT = THREE.MathUtils.clamp(clearingT + clearingSpeed, 0, 1);
  } else {
    clearingT = THREE.MathUtils.clamp(clearingT - clearingSpeed, 0, 1);  
  }

  // Fattore di nebbia basato su distanza
  const minDist = 1;
  const maxDist = 40;
  let t = THREE.MathUtils.clamp((dist - minDist) / (maxDist - minDist), 0, 1);

  // Applichiamo dissolvenza: da t originale verso t = 1 (nebbia leggera)
  t = THREE.MathUtils.lerp(t, 1, clearingT);  // più clearingT sale, più t si avvicina a 1 (nebbia dissolta)

  // Imposta nebbia
fog.near = THREE.MathUtils.lerp(0.5, 12, t);  // prima era (2, 10)
fog.far  = THREE.MathUtils.lerp(10, 80, t);   // prima era (20, 60)


  // Luci
  const lights = getLights();
  if (lights) {
    lights.ambientLight.intensity = THREE.MathUtils.lerp(0.1, 1.5, t);
    lights.directionalLight.intensity = THREE.MathUtils.lerp(0.3, 5, t);
  }
}


