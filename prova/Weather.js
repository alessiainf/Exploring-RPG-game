// Weather.js
import * as THREE from 'three';
import { wizard } from './Statuegame.js';  // importa wizard per calcolo distanza
import { getLights } from './lighting.js';
import { checkStatueOrientations } from './Statuegame.js';


//statue fame
let fog;  // nebbia attiva
let weatherCleared = false;
let clearingT = 0; 
const clearingSpeed = 0.01; // velocità di dissolvenza
let mystZoneT = 0; // 0 = fuori dalla nebbia, 1 = nebbia piena
const mystZoneSpeed = 0.010; // Velocità di apparizione/scomparsa


//bee game
let dandelionParticles = [];
let dandelionGroup = new THREE.Group();
let dandelionsInitialized = false;
let beeZoneCenter = new THREE.Vector3();  // da impostare esplicitamente
const DANDELION_ZONE_RADIUS = 35;

// Mushroom game
let sporeParticles = [];
let sporeGroup = new THREE.Group();
let sporesInitialized = false;
let fungusZoneCenter = new THREE.Vector3();
const FUNGUS_ZONE_RADIUS = 15;




export function initWeather(scene) {
  fog = new THREE.Fog(0xaaaaaa, 10, 60); 
  scene.fog = fog;
}

export function updateWeather(playerPosition) {

  //Statue game
  if (!wizard || !fog) return;

  const statuesCorrect = checkStatueOrientations();
  const distToWizard = playerPosition.distanceTo(wizard.position);
  const fogZoneRadius = 20;

  // Valori della nebbia globale (base)
  const baseNear = 15;
  const baseFar = 100;

  // Valori per la nebbia fitta vicino al mago
  const denseNear = 2;
  const denseFar = 30;

  if (statuesCorrect) {
    clearingT = THREE.MathUtils.clamp(clearingT + clearingSpeed, 0, 1);
  } else {
    clearingT = THREE.MathUtils.clamp(clearingT - clearingSpeed, 0, 1);
  }

  // --- Transizione nella zona del mago ---
  const insideFogZone = distToWizard < fogZoneRadius;

  if (insideFogZone) {
    mystZoneT = THREE.MathUtils.clamp(mystZoneT + mystZoneSpeed, 0, 1);
  } else {
    mystZoneT = THREE.MathUtils.clamp(mystZoneT - mystZoneSpeed, 0, 1);
  }

  // Transizione finale: da fitta → leggera → globale
  const t = THREE.MathUtils.lerp(0, 1, clearingT);
  const mixT = mystZoneT * (1 - t);  // se clearingT → 1, allora mixT → 0

  // Interpola near/far nebbia
  fog.near = THREE.MathUtils.lerp(baseNear, denseNear, mixT);
  fog.far  = THREE.MathUtils.lerp(baseFar, denseFar, mixT);

  // Luci in zona mago
  const lights = getLights();
  if (lights) {
    lights.ambientLight.intensity = THREE.MathUtils.lerp(1.5, 0.3, mixT);
    lights.directionalLight.intensity = THREE.MathUtils.lerp(4, 0.8, mixT);
  }

  // Dandelions fluff :) for bee game
  // Dandelions fluff :) for bee game (sempre visibili nella loro zona)
  dandelionGroup.visible = true;

  if (dandelionsInitialized) {
    const distToBee = playerPosition.distanceTo(beeZoneCenter);
    const insideBeeZone = distToBee < DANDELION_ZONE_RADIUS;

    
      for (const p of dandelionParticles) {
        p.position.add(p.userData.velocity);
        p.position.x += (Math.random() - 0.5) * 0.002;
        p.position.z += (Math.random() - 0.5) * 0.002;

        if (p.position.distanceTo(beeZoneCenter) > DANDELION_ZONE_RADIUS) {
          p.position.set(
            beeZoneCenter.x + (Math.random() - 0.5) * 2 * DANDELION_ZONE_RADIUS,
            beeZoneCenter.y + Math.random() * 3,
            beeZoneCenter.z + (Math.random() - 0.5) * 2 * DANDELION_ZONE_RADIUS
          );
        }
      }
    
  }



    // Spore luminose del fungone
  // Spore luminose del fungone (sempre visibili nella loro zona)
  sporeGroup.visible = true;

  if (sporesInitialized) {
    const distToFungus = playerPosition.distanceTo(fungusZoneCenter);
    const insideFungusZone = distToFungus < FUNGUS_ZONE_RADIUS;

    
      for (const p of sporeParticles) {
        p.position.add(p.userData.velocity);
        p.position.x += (Math.random() - 0.5) * 0.001;
        p.position.z += (Math.random() - 0.5) * 0.001;

        if (p.position.distanceTo(fungusZoneCenter) > FUNGUS_ZONE_RADIUS) {
          p.position.set(
            fungusZoneCenter.x + (Math.random() - 0.5) * 2 * FUNGUS_ZONE_RADIUS,
            fungusZoneCenter.y + Math.random() * 2,
            fungusZoneCenter.z + (Math.random() - 0.5) * 2 * FUNGUS_ZONE_RADIUS
          );
        }
      }
    
  }


}


export function initDandelions(scene, center, count = 250) {
  if (dandelionsInitialized) return;
  beeZoneCenter.copy(center);

  const geometry = new THREE.SphereGeometry(0.05, 3, 3);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geometry, material);

    p.position.set(
      center.x + (Math.random() - 0.5) * 2 * DANDELION_ZONE_RADIUS,
      center.y + Math.random() * 0.5,
      center.z + (Math.random() - 0.5) * 2 * DANDELION_ZONE_RADIUS
    );

    p.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      0.003 + Math.random() * 0.005,
      (Math.random() - 0.5) * 0.01
    );

    dandelionParticles.push(p);
    dandelionGroup.add(p);
  }

  scene.add(dandelionGroup);
  dandelionsInitialized = true;
}

export function initSpores(scene, center, count = 150) {
  if (sporesInitialized) return;
  fungusZoneCenter.copy(center);

  const geometry = new THREE.SphereGeometry(0.04, 6, 6);
  const material = new THREE.MeshBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.6
  });

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geometry, material);

    p.position.set(
      center.x + (Math.random() - 0.5) * 2 * FUNGUS_ZONE_RADIUS,
      center.y + Math.random() * 2,
      center.z + (Math.random() - 0.5) * 2 * FUNGUS_ZONE_RADIUS
    );

    p.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.002,
      0.002 + Math.random() * 0.002,
      (Math.random() - 0.5) * 0.002
    );

    sporeParticles.push(p);
    sporeGroup.add(p);
  }

  scene.add(sporeGroup);
  sporesInitialized = true;
}




