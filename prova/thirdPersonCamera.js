// thirdPersonCamera.js
import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    
    // Configurazione telecamera
    this.distance = 8;
    this.height = 4;
    this.rotationSpeed = 0.003;
    this.followSpeed = 0.1;
    this.heightOffset = 2;
    
    // Angoli di rotazione
    this.horizontalAngle = Math.PI;
    this.verticalAngle = 0.3;
    this.minVerticalAngle = -Math.PI / 3;
    this.maxVerticalAngle = Math.PI / 3;
    
    // Posizioni
    this.idealOffset = new THREE.Vector3();
    this.idealLookat = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.currentLookat = new THREE.Vector3();
    
    // Input mouse
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;
    
    this.addEventListeners();
  }
  
  addEventListeners() {
    // Mouse per ruotare la telecamera
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Click sinistro
        this.isMouseDown = true;
        document.body.style.cursor = 'grabbing';
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
        document.body.style.cursor = 'default';
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        const deltaX = e.movementX || e.mozMovementX || 0;
        const deltaY = e.movementY || e.mozMovementY || 0;
        
        this.horizontalAngle -= deltaX * this.rotationSpeed;
        this.verticalAngle -= deltaY * this.rotationSpeed;
        
        // Limita l'angolo verticale
        this.verticalAngle = Math.max(
          this.minVerticalAngle,
          Math.min(this.maxVerticalAngle, this.verticalAngle)
        );
      }
    });
    
    // Scroll per zoom
    document.addEventListener('wheel', (e) => {
      this.distance += e.deltaY * 0.01;
      this.distance = Math.max(3, Math.min(15, this.distance));
    });
    
    // Impedisci il menu contestual del click destro
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  update() {
    if (!this.target) return;
    
    // Calcola la posizione ideale della telecamera
    const horizontalDistance = this.distance * Math.cos(this.verticalAngle);
    const verticalDistance = this.distance * Math.sin(this.verticalAngle);
    
    this.idealOffset.set(
      horizontalDistance * Math.sin(this.horizontalAngle),
      verticalDistance + this.heightOffset,
      horizontalDistance * Math.cos(this.horizontalAngle)
    );
    
    // Posizione ideale della telecamera
    const idealPosition = new THREE.Vector3()
      .copy(this.target.position)
      .add(this.idealOffset);
    
    // Punto ideale dove guardare
    this.idealLookat.copy(this.target.position);
    this.idealLookat.y += this.heightOffset;
    
    // Interpolazione smooth
    this.currentPosition.lerp(idealPosition, this.followSpeed);
    this.currentLookat.lerp(this.idealLookat, this.followSpeed);
    
    // Applica la posizione alla telecamera
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookat);
  }
  
  // Ottieni la direzione forward della telecamera (per i controlli WASD)
  getForwardDirection() {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; // Rimuovi la componente Y per movimento orizzontale
    forward.normalize();
    return forward;
  }
  
  // Ottieni la direzione right della telecamera
  getRightDirection() {
    const forward = this.getForwardDirection();
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    right.normalize();
    return right;
  }
  
  // Ottieni l'angolo orizzontale della telecamera (per orientare il personaggio)
  getHorizontalAngle() {
    return this.horizontalAngle;
  }
}