import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { PointerLockControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js";

console.log("Script loaded!");

/* ===================== GAME STATE ===================== */
const gameState = {
  keysCollected: 0,
  keysRequired: 3,
  gameWon: false,
  sanity: 100,
  flashlightBattery: 100,
  playing: false
};

/* ===================== SCENE ===================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 4, 30);

/* ===================== CAMERA ===================== */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 5);

/* ===================== RENDERER ===================== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

/* ===================== CONTROLS ===================== */
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Start game on click
document.body.addEventListener("click", () => {
  if (!gameState.playing && !renderer.xr.isPresenting) {
    controls.lock();
    gameState.playing = true;
    showMessage("COLLECT 3 KEYS TO ESCAPE", 0xffff00);
  }
});

controls.addEventListener('unlock', () => {
  if (!gameState.gameWon) {
    showMessage("Click to continue", 0xffffff);
  }
});

/* ===================== MOVEMENT ===================== */
const move = { f: false, b: false, l: false, r: false, sprint: false };
const velocity = new THREE.Vector3();
const baseSpeed = 4;
const sprintMultiplier = 1.8;
const clock = new THREE.Clock();

document.addEventListener("keydown", e => {
  if (e.code === "KeyW") move.f = true;
  if (e.code === "KeyS") move.b = true;
  if (e.code === "KeyA") move.l = true;
  if (e.code === "KeyD") move.r = true;
  if (e.code === "ShiftLeft") move.sprint = true;
});

document.addEventListener("keyup", e => {
  if (e.code === "KeyW") move.f = false;
  if (e.code === "KeyS") move.b = false;
  if (e.code === "KeyA") move.l = false;
  if (e.code === "KeyD") move.r = false;
  if (e.code === "ShiftLeft") move.sprint = false;
});

/* ===================== LIGHTING ===================== */
scene.add(new THREE.AmbientLight(0xffffff, 0.16));

const leftFill = new THREE.PointLight(0xffffff, 0.25, 15);
leftFill.position.set(-2, 1.5, -10);
scene.add(leftFill);

const rightFill = leftFill.clone();
rightFill.position.x = 2;
scene.add(rightFill);

// Player's flashlight
const flashlight = new THREE.SpotLight(0xffffee, 2, 25, Math.PI / 6, 0.5, 1.5);
flashlight.position.copy(camera.position);
flashlight.castShadow = true;
scene.add(flashlight);
scene.add(flashlight.target);

/* ===================== MATERIALS ===================== */
const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.45, metalness: 0.08 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });

const keyMaterial = new THREE.MeshStandardMaterial({
  color: 0xffaa00,
  emissive: 0xffaa00,
  emissiveIntensity: 0.5,
  metalness: 0.8,
  roughness: 0.2
});

const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b4513,
  roughness: 0.7,
  metalness: 0.1
});

const lockedDoorMaterial = new THREE.MeshStandardMaterial({
  color: 0x660000,
  emissive: 0x330000,
  emissiveIntensity: 0.3,
  roughness: 0.7,
  metalness: 0.1
});

/* ===================== CORRIDOR ===================== */
function segment(z) {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 4), floorMat);
  floor.position.set(0, 0, z);
  floor.receiveShadow = true;
  scene.add(floor);

  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 4), wallMat);
  wall.position.set(-2, 1.5, z);
  wall.castShadow = true;
  scene.add(wall);

  const wall2 = wall.clone();
  wall2.position.x = 2;
  scene.add(wall2);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 4), wallMat);
  ceil.position.set(0, 3, z);
  ceil.receiveShadow = true;
  scene.add(ceil);
}

for (let i = 0; i < 20; i++) segment(-i * 4);

/* ===================== CORRIDOR LIGHTS ===================== */
const lights = [];
for (let i = 0; i < 8; i++) {
  const l = new THREE.SpotLight(0xfff2cc, 3.6, 18, Math.PI / 4, 0.4, 1);
  l.position.set(0, 2.7, -i * 6);
  l.target.position.set(0, 0, -i * 6);
  l.castShadow = true;
  l.shadow.mapSize.set(1024, 1024);
  scene.add(l, l.target);
  lights.push(l);
}

// Flicker animation
let flickerTime = 0;
function updateFlicker(deltaTime) {
  flickerTime += deltaTime * 10;
  lights.forEach((light, i) => {
    const offset = i * 1.5;
    const flicker = Math.sin(flickerTime + offset) * 0.3 + Math.sin(flickerTime * 3.7 + offset) * 0.2;
    light.intensity = 3.6 + flicker;
  });
}

/* ===================== COLLECTIBLE KEYS ===================== */
const keys = [];
const raycaster = new THREE.Raycaster();
const interactionDistance = 3;

function createKey(x, y, z) {
  const keyGroup = new THREE.Group();
  
  const keyBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8),
    keyMaterial
  );
  keyBody.rotation.z = Math.PI / 2;
  
  const keyHead = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.03, 8, 16),
    keyMaterial
  );
  keyHead.position.x = -0.15;
  
  keyGroup.add(keyBody);
  keyGroup.add(keyHead);
  keyGroup.position.set(x, y, z);
  keyGroup.userData.type = 'key';
  keyGroup.userData.collected = false;
  keyGroup.userData.baseY = y;
  keyGroup.userData.floatOffset = Math.random() * Math.PI * 2;
  
  scene.add(keyGroup);
  keys.push(keyGroup);
  
  return keyGroup;
}

// Place keys
createKey(-1.5, 1.2, -8);
createKey(1.5, 0.8, -20);
createKey(0, 1.5, -35);

/* ===================== DOORS ===================== */
const doors = [];

function createDoor(z, locked = false) {
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.5, 0.2),
    locked ? lockedDoorMaterial : doorMaterial
  );
  door.position.set(0, 1.25, z);
  door.castShadow = true;
  door.userData.type = 'door';
  door.userData.locked = locked;
  door.userData.opened = false;
  door.userData.originalX = 0;
  
  scene.add(door);
  doors.push(door);
  
  return door;
}

const mainDoor = createDoor(-50, true);

/* ===================== MONSTERS ===================== */
const monsters = [];

function createMonster(x, y, z) {
  const monsterGroup = new THREE.Group();
  
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 1.2, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
      roughness: 0.9
    })
  );
  
  const leftEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  leftEye.position.set(-0.1, 0.7, 0.25);
  
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.1;
  
  monsterGroup.add(body);
  monsterGroup.add(leftEye);
  monsterGroup.add(rightEye);
  monsterGroup.position.set(x, y, z);
  monsterGroup.userData.type = 'monster';
  monsterGroup.userData.active = false;
  monsterGroup.userData.speed = 0.5;
  
  scene.add(monsterGroup);
  monsters.push(monsterGroup);
  
  return monsterGroup;
}

const monster1 = createMonster(-1.5, 1, -15);
const monster2 = createMonster(1.5, 1, -30);

/* ===================== INTERACTION ===================== */
function checkInteractions() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  
  // Check keys
  keys.forEach(key => {
    if (!key.userData.collected) {
      const distance = camera.position.distanceTo(key.position);
      if (distance < interactionDistance) {
        collectKey(key);
      }
    }
  });
  
  // Check doors
  const intersects = raycaster.intersectObjects(doors);
  if (intersects.length > 0 && intersects[0].distance < interactionDistance) {
    const door = intersects[0].object;
    if (!door.userData.opened) {
      interactWithDoor(door);
    }
  }
}

function collectKey(key) {
  key.userData.collected = true;
  gameState.keysCollected++;
  
  // Simple removal
  scene.remove(key);
  
  updateHUD();
  playSound('collect');
  
  if (gameState.keysCollected >= gameState.keysRequired) {
    mainDoor.material = doorMaterial;
    mainDoor.userData.locked = false;
    showMessage("ALL KEYS COLLECTED! Find the exit!", 0x00ff00);
  } else {
    showMessage(`Key ${gameState.keysCollected}/${gameState.keysRequired} collected`, 0xffaa00);
  }
}

function interactWithDoor(door) {
  if (door.userData.locked) {
    if (gameState.keysCollected >= gameState.keysRequired) {
      door.userData.locked = false;
      door.material = doorMaterial;
      showMessage("Door unlocked!", 0x00ff00);
    } else {
      showMessage(`Locked! Need ${gameState.keysRequired - gameState.keysCollected} more keys`, 0xff0000);
      shakeDoor(door);
    }
  } else {
    openDoor(door);
  }
}

function openDoor(door) {
  door.userData.opened = true;
  
  // Simple door opening animation
  const openInterval = setInterval(() => {
    door.rotation.y -= 0.05;
    door.position.x -= 0.03;
    if (door.rotation.y <= -Math.PI / 2) {
      clearInterval(openInterval);
      if (door === mainDoor) {
        winGame();
      }
    }
  }, 16);
}

function shakeDoor(door) {
  let shakeCount = 0;
  const shakeInterval = setInterval(() => {
    door.position.x = door.userData.originalX + (Math.random() - 0.5) * 0.1;
    shakeCount++;
    if (shakeCount > 10) {
      clearInterval(shakeInterval);
      door.position.x = door.userData.originalX;
    }
  }, 50);
}

/* ===================== MONSTER AI ===================== */
function updateMonsters(deltaTime) {
  monsters.forEach(monster => {
    if (!monster.userData.active) {
      // Check activation distance
      const distance = camera.position.distanceTo(monster.position);
      if (distance < 10) {
        monster.userData.active = true;
        showMessage("Something is watching you...", 0xff0000);
        gameState.sanity -= 20;
      }
    } else {
      // Chase player
      const direction = new THREE.Vector3();
      direction.subVectors(camera.position, monster.position);
      direction.y = 0;
      direction.normalize();
      
      monster.position.add(direction.multiplyScalar(monster.userData.speed * deltaTime));
      monster.lookAt(camera.position);
      
      // Check if caught player
      const distance = camera.position.distanceTo(monster.position);
      if (distance < 1.5) {
        gameOver("The darkness consumed you...");
      }
    }
  });
}

/* ===================== GAME MECHANICS ===================== */
function winGame() {
  gameState.gameWon = true;
  controls.unlock();
  showMessage("YOU ESCAPED! CONGRATULATIONS!", 0x00ff00, 5000);
  gameState.playing = false;
}

function gameOver(message) {
  controls.unlock();
  showMessage(message, 0xff0000, 3000);
  gameState.playing = false;
  
  setTimeout(() => {
    location.reload();
  }, 3000);
}

/* ===================== HUD ===================== */
const hudElement = document.createElement('div');
hudElement.style.cssText = `
  position: fixed;
  top: 20px;
  left: 20px;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  text-shadow: 2px 2px 4px black;
  pointer-events: none;
  z-index: 1000;
`;
document.body.appendChild(hudElement);

const crosshair = document.createElement('div');
crosshair.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 0 4px black;
`;
document.body.appendChild(crosshair);

function updateHUD() {
  const sanityColor = gameState.sanity > 50 ? '#00ff00' : gameState.sanity > 25 ? '#ffaa00' : '#ff0000';
  const batteryColor = gameState.flashlightBattery > 50 ? '#00ff00' : gameState.flashlightBattery > 25 ? '#ffaa00' : '#ff0000';
  
  hudElement.innerHTML = `
    <div>KEYS: ${gameState.keysCollected}/${gameState.keysRequired}</div>
    <div style="color: ${sanityColor}">SANITY: ${Math.round(gameState.sanity)}%</div>
    <div style="color: ${batteryColor}">BATTERY: ${Math.round(gameState.flashlightBattery)}%</div>
  `;
}

function showMessage(text, color = 0xffffff, duration = 2000) {
  const messageEl = document.createElement('div');
  messageEl.textContent = text;
  messageEl.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #${color.toString(16).padStart(6, '0')};
    font-size: 24px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    text-align: center;
    text-shadow: 3px 3px 6px black;
    pointer-events: none;
    z-index: 2000;
    background: rgba(0,0,0,0.7);
    padding: 20px;
    border-radius: 10px;
  `;
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, duration);
}

/* ===================== AUDIO ===================== */
function playSound(type) {
  console.log(`Sound: ${type}`);
  // To add real audio, create files in assets/sounds/ and use:
  // const audio = new Audio(`assets/sounds/${type}.mp3`);
  // audio.volume = 0.5;
  // audio.play().catch(e => console.log('Audio blocked:', e));
}

/* ===================== ANIMATIONS ===================== */
function updateAnimations(deltaTime, elapsedTime) {
  // Animate keys
  keys.forEach(key => {
    if (!key.userData.collected) {
      key.position.y = key.userData.baseY + Math.sin(elapsedTime * 2 + key.userData.floatOffset) * 0.15;
      key.rotation.y += deltaTime * 2;
    }
  });
  
  // Camera breathing
  camera.position.y = 1.6 + Math.sin(elapsedTime * 2) * 0.02;
}

/* ===================== UPDATE LOOP ===================== */
let elapsedTime = 0;

function update() {
  const deltaTime = clock.getDelta();
  elapsedTime += deltaTime;
  
  if (controls.isLocked && gameState.playing) {
    // Movement
    const speed = baseSpeed * (move.sprint ? sprintMultiplier : 1);
    velocity.set(0, 0, 0);
    
    if (move.f) velocity.z -= speed * deltaTime;
    if (move.b) velocity.z += speed * deltaTime;
    if (move.l) velocity.x -= speed * deltaTime;
    if (move.r) velocity.x += speed * deltaTime;
    
    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);
    
    // Keep in bounds
    const playerPos = controls.getObject().position;
    playerPos.x = Math.max(-1.8, Math.min(1.8, playerPos.x));
    playerPos.z = Math.max(-72, Math.min(5, playerPos.z));
    
    // Update flashlight
    flashlight.position.copy(camera.position);
    flashlight.target.position.copy(camera.position).add(
      camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5)
    );
    
    // Drain battery
    gameState.flashlightBattery = Math.max(0, gameState.flashlightBattery - deltaTime * 2);
    flashlight.intensity = 2 * (gameState.flashlightBattery / 100);
    
    // Drain sanity in darkness
    if (flashlight.intensity < 0.5) {
      gameState.sanity = Math.max(0, gameState.sanity - deltaTime * 5);
    }
    
    // Check game over
    if (gameState.sanity <= 0) {
      gameOver("Your mind shattered in the darkness...");
    }
    
    // Update systems
    checkInteractions();
    updateMonsters(deltaTime);
  }
  
  // Always update animations
  updateFlicker(deltaTime);
  updateAnimations(deltaTime, elapsedTime);
  updateHUD();
}

/* ===================== RENDER LOOP ===================== */
renderer.setAnimationLoop(() => {
  update();
  renderer.render(scene, camera);
});

/* ===================== RESIZE ===================== */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ===================== INITIAL STATE ===================== */
updateHUD();
showMessage("Click anywhere to start\nWASD to move, Shift to sprint\nCollect keys to escape", 0xffffff, 5000);
