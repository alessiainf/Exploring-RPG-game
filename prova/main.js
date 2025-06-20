import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { loadWorld, grassMeshes, groundMesh, updateGrass} from './environment.js';
import { CharacterController } from './characterController.js';
import { setupLights } from './lighting.js';

// === SCENA, CAMERA, RENDERER ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0xaaaaaa, 10, 50);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 3, -6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === CONTROLLI ORBIT (verranno disabilitati dalla telecamera in terza persona) ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// === LUCI ===
setupLights(scene);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// === MONDO ===
loadWorld(scene);

// ======= FISICA DEL MONDO ========
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const timeStep = 1 / 60;

// === CREAZIONE CORPO FISICO DEL TERRENO ===
function createGroundBody() {
  if (!groundMesh) {
    setTimeout(createGroundBody, 100);
    return;
  }

  groundMesh.receiveShadow = true;
  const bbox = new THREE.Box3().setFromObject(groundMesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
  const groundBody = new CANNON.Body({
    mass: 0,
    shape: shape,
    position: new CANNON.Vec3(center.x, center.y, center.z)
  });

  world.addBody(groundBody);
}
createGroundBody();

// === CONTROLLER PERSONAGGIO ===
const characterController = new CharacterController(scene, world, camera, controls);

// === ANIMATE LOOP ===
function animate() {
  requestAnimationFrame(animate);

  // I controlli orbit vengono disabilitati automaticamente dal character controller
  // quando la telecamera in terza persona è attiva
  if (controls.enabled) {
    controls.update();
  }
  
  world.step(timeStep);

  // Update personaggio (che include anche l'aggiornamento della telecamera)
  characterController.update();

  // Update erba dinamica
  const playerPosition = characterController.getPlayerPosition();
  const t = performance.now() / 1000;
  updateGrass(playerPosition, t);
  
  renderer.render(scene, camera);
}
animate();

// === RESIZE ===
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === ISTRUZIONI PER L'UTENTE ===
console.log('=== CONTROLLI ===');
console.log('WASD: Movimento (relativo alla telecamera)');
console.log('Shift + WASD: Corsa');
console.log('Mouse (click sinistro + trascina): Ruota telecamera');
console.log('Scroll del mouse: Zoom in/out');