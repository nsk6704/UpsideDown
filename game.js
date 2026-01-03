import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { PointerLockControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js";
import { CONFIG } from './config.js';
import { AIManager } from './ai.js';
import { AudioManager } from './audio.js';
import { LevelBuilder } from './level.js';

console.log("🎮 Enhanced Horror Game Loading...");

/* ===================== MANAGERS ===================== */
const aiManager = new AIManager();
const audioManager = new AudioManager();

/* ===================== GAME STATE ===================== */
const gameState = {
  keysCollected: 0,
  keysRequired: CONFIG.KEYS_REQUIRED,
  gameWon: false,
  sanity: CONFIG.INITIAL_SANITY,
  flashlightBattery: CONFIG.INITIAL_BATTERY,
  playing: false,
  deaths: 0,
  startTime: 0,
  monstersKilled: 0,
  doorsOpened: 0,
  lastFootstep: 0,
  lastHeartbeat: 0
};

/* ===================== SCENE ===================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.035);

/* ===================== CAMERA ===================== */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0, 1.6, 5);

/* ===================== RENDERER ===================== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

/* ===================== CONTROLS ===================== */
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Start game on click
document.body.addEventListener("click", async () => {
  if (!gameState.playing && !renderer.xr.isPresenting) {
    controls.lock();
    gameState.playing = true;
    gameState.startTime = Date.now();
    
    // Initialize audio on first user interaction
    await audioManager.init();
    audioManager.playAmbientDrone();
    
    const hint = await aiManager.getDynamicHint(gameState);
    showMessage(hint || "Collect the keys to escape...", 0xffff00);
  }
});

controls.addEventListener('unlock', () => {
  if (!gameState.gameWon) {
    showMessage("Click to continue", 0xffffff);
  }
});

/* ===================== MOVEMENT ===================== */
const move = { f: false, b: false, l: false, r: false, sprint: false, crouch: false };
const velocity = new THREE.Vector3();
const clock = new THREE.Clock();

document.addEventListener("keydown", e => {
  if (e.code === "KeyW") move.f = true;
  if (e.code === "KeyS") move.b = true;
  if (e.code === "KeyA") move.l = true;
  if (e.code === "KeyD") move.r = true;
  if (e.code === "ShiftLeft") move.sprint = true;
  if (e.code === "KeyC" || e.code === "ControlLeft") move.crouch = true;
  if (e.code === "KeyF") toggleFlashlight();
  if (e.code === "KeyH") requestHint();
});

document.addEventListener("keyup", e => {
  if (e.code === "KeyW") move.f = false;
  if (e.code === "KeyS") move.b = false;
  if (e.code === "KeyA") move.l = false;
  if (e.code === "KeyD") move.r = false;
  if (e.code === "ShiftLeft") move.sprint = false;
  if (e.code === "KeyC" || e.code === "ControlLeft") move.crouch = false;
});

let flashlightOn = true;
function toggleFlashlight() {
  flashlightOn = !flashlightOn;
  flashlight.visible = flashlightOn;
  showMessage(flashlightOn ? "Flashlight ON" : "Flashlight OFF", 0xffffff, 1000);
}

async function requestHint() {
  const hint = await aiManager.getDynamicHint(gameState);
  if (hint) {
    showMessage(hint, 0x00ffff, 4000);
  }
}

/* ===================== LIGHTING ===================== */
scene.add(new THREE.AmbientLight(0xffffff, 0.08));

// Player's flashlight
const flashlight = new THREE.SpotLight(0xffffee, 2.5, 30, Math.PI / 7, 0.5, 1.5);
flashlight.position.copy(camera.position);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(2048, 2048);
scene.add(flashlight);
scene.add(flashlight.target);

/* ===================== LEVEL BUILDING ===================== */
const levelBuilder = new LevelBuilder(scene);
console.log("Building complex level...");
levelBuilder.buildComplexLevel();

// Add corridor lights
const corridorLights = [];
const lightPositions = [
  [0, -5], [0, -15], [0, -25], [0, -35], [0, -45],
  [10, -20], [20, -20], [-10, -32], [-20, -32]
];

lightPositions.forEach(([x, z]) => {
  const light = new THREE.SpotLight(0xfff2cc, 2.5, 18, Math.PI / 4, 0.4, 1.2);
  light.position.set(x, 2.7, z);
  light.target.position.set(x, 0, z);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  scene.add(light, light.target);
  corridorLights.push(light);
});

// Add props for atmosphere
levelBuilder.addProp('crate', -1.5, 0.5, -12);
levelBuilder.addProp('barrel', 1.3, 0.4, -18);
levelBuilder.addProp('crate', -1.2, 0.5, -25);
levelBuilder.addProp('barrel', 1.7, 0.4, -40);
levelBuilder.addProp('pillar', 18, 1.5, -20);
levelBuilder.addProp('pillar', -18, 1.5, -32);

/* ===================== MATERIALS ===================== */
const keyMaterial = new THREE.MeshStandardMaterial({
  color: 0xffaa00,
  emissive: 0xffaa00,
  emissiveIntensity: 0.6,
  metalness: 0.9,
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
  emissiveIntensity: 0.4,
  roughness: 0.7,
  metalness: 0.1
});

/* ===================== COLLECTIBLE KEYS ===================== */
const keys = [];
const raycaster = new THREE.Raycaster();

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
  
  // Add glow
  const glowLight = new THREE.PointLight(0xffaa00, 0.5, 5);
  glowLight.position.set(0, 0, 0);
  
  keyGroup.add(keyBody, keyHead, glowLight);
  keyGroup.position.set(x, y, z);
  keyGroup.userData.type = 'key';
  keyGroup.userData.collected = false;
  keyGroup.userData.baseY = y;
  keyGroup.userData.floatOffset = Math.random() * Math.PI * 2;
  
  scene.add(keyGroup);
  keys.push(keyGroup);
  
  return keyGroup;
}

// Place keys strategically throughout the level
createKey(-1.5, 1.2, -10);
createKey(18, 1.0, -22);
createKey(-18, 1.0, -34);
createKey(1.5, 1.5, -40);
createKey(0, 1.3, -58);

/* ===================== DOORS ===================== */
const doors = [];

function createDoor(x, y, z, rotation = 0, locked = false) {
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.5, 0.15),
    locked ? lockedDoorMaterial : doorMaterial
  );
  door.position.set(x, y, z);
  door.rotation.y = rotation;
  door.castShadow = true;
  door.userData.type = 'door';
  door.userData.locked = locked;
  door.userData.opened = false;
  door.userData.originalX = x;
  door.userData.originalZ = z;
  door.userData.originalRot = rotation;
  
  scene.add(door);
  doors.push(door);
  
  return door;
}

// Place doors
createDoor(0, 1.25, -65, 0, true); // Final locked door
createDoor(10, 1.25, -20, Math.PI/2, false);
createDoor(-10, 1.25, -32, Math.PI/2, false);

/* ===================== MONSTERS ===================== */
const monsters = [];

function createMonster(x, y, z) {
  const monsterGroup = new THREE.Group();
  
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1.4, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      emissive: 0xff0000,
      emissiveIntensity: 0.4,
      roughness: 0.9
    })
  );
  
  // Glowing eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  leftEye.position.set(-0.12, 0.8, 0.3);
  
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.12;
  
  // Add eye lights
  const leftLight = new THREE.PointLight(0xff0000, 0.5, 3);
  leftLight.position.copy(leftEye.position);
  const rightLight = new THREE.PointLight(0xff0000, 0.5, 3);
  rightLight.position.copy(rightEye.position);
  
  monsterGroup.add(body, leftEye, rightEye, leftLight, rightLight);
  monsterGroup.position.set(x, y, z);
  monsterGroup.userData.type = 'monster';
  monsterGroup.userData.active = false;
  monsterGroup.userData.speed = CONFIG.MONSTER_SPEED;
  monsterGroup.userData.patrolStart = new THREE.Vector3(x, y, z);
  monsterGroup.userData.patrolOffset = 0;
  
  scene.add(monsterGroup);
  monsters.push(monsterGroup);
  
  return monsterGroup;
}

// Place monsters strategically
createMonster(-1.5, 1, -18);
createMonster(15, 1, -20);
createMonster(-15, 1, -32);
createMonster(1.5, 1, -45);
createMonster(0, 1, -55);

/* ===================== INTERACTION ===================== */
function checkInteractions() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  
  // Check keys
  keys.forEach(key => {
    if (!key.userData.collected) {
      const distance = camera.position.distanceTo(key.position);
      if (distance < CONFIG.INTERACTION_DISTANCE) {
        collectKey(key);
      }
    }
  });
  
  // Check doors
  const intersects = raycaster.intersectObjects(doors);
  if (intersects.length > 0 && intersects[0].distance < CONFIG.INTERACTION_DISTANCE) {
    const door = intersects[0].object;
    if (!door.userData.opened) {
      showPrompt("Press E to interact", 0xffffff);
    }
  }
}

// Door interaction
document.addEventListener("keydown", async (e) => {
  if (e.code === "KeyE" && controls.isLocked) {
    const intersects = raycaster.intersectObjects(doors);
    if (intersects.length > 0 && intersects[0].distance < CONFIG.INTERACTION_DISTANCE) {
      await interactWithDoor(intersects[0].object);
    }
  }
});

async function collectKey(key) {
  key.userData.collected = true;
  gameState.keysCollected++;
  
  scene.remove(key);
  audioManager.play('collect');
  updateHUD();
  
  // AI narration
  const narration = await aiManager.generateNarration(gameState, 'key_collected');
  
  if (gameState.keysCollected >= gameState.keysRequired) {
    // Unlock all locked doors
    doors.forEach(door => {
      if (door.userData.locked) {
        door.material = doorMaterial;
        door.userData.locked = false;
      }
    });
    showMessage(narration || "ALL KEYS COLLECTED! Find the exit!", 0x00ff00, 4000);
  } else {
    showMessage(narration || `Key ${gameState.keysCollected}/${gameState.keysRequired} collected`, 0xffaa00);
  }
}

async function interactWithDoor(door) {
  if (door.userData.locked) {
    if (gameState.keysCollected >= gameState.keysRequired) {
      door.userData.locked = false;
      door.material = doorMaterial;
      showMessage("Door unlocked!", 0x00ff00);
      audioManager.play('doorOpen');
    } else {
      const narration = await aiManager.generateNarration(gameState, 'door_locked');
      showMessage(narration || `Locked! Need ${gameState.keysRequired - gameState.keysCollected} more keys`, 0xff0000);
      audioManager.play('locked');
      shakeDoor(door);
    }
  } else if (!door.userData.opened) {
    openDoor(door);
  }
}

function openDoor(door) {
  door.userData.opened = true;
  gameState.doorsOpened++;
  audioManager.play('doorOpen');
  
  const targetRot = door.userData.originalRot - Math.PI / 2;
  const openInterval = setInterval(() => {
    door.rotation.y -= 0.05;
    if (door.rotation.y <= targetRot) {
      clearInterval(openInterval);
      door.rotation.y = targetRot;
      
      // Check win condition
      if (door.position.z < -60 && gameState.keysCollected >= gameState.keysRequired) {
        winGame();
      }
    }
  }, 16);
}

function shakeDoor(door) {
  let shakeCount = 0;
  const shakeInterval = setInterval(() => {
    const shake = (Math.random() - 0.5) * 0.1;
    door.position.x = door.userData.originalX + shake;
    door.position.z = door.userData.originalZ + shake;
    shakeCount++;
    if (shakeCount > 8) {
      clearInterval(shakeInterval);
      door.position.x = door.userData.originalX;
      door.position.z = door.userData.originalZ;
    }
  }, 50);
}

/* ===================== MONSTER AI ===================== */
function updateMonsters(deltaTime) {
  monsters.forEach(monster => {
    const distToPlayer = camera.position.distanceTo(monster.position);
    
    if (!monster.userData.active) {
      // Patrol behavior
      monster.userData.patrolOffset += deltaTime * 0.5;
      const patrolX = monster.userData.patrolStart.x + Math.sin(monster.userData.patrolOffset) * 3;
      const patrolZ = monster.userData.patrolStart.z + Math.cos(monster.userData.patrolOffset) * 3;
      monster.position.x = patrolX;
      monster.position.z = patrolZ;
      
      // Check activation
      if (distToPlayer < CONFIG.MONSTER_DETECTION_RANGE) {
        activateMonster(monster);
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
      if (distToPlayer < CONFIG.MONSTER_KILL_RANGE) {
        gameOver("The creature caught you...");
      }
    }
  });
}

async function activateMonster(monster) {
  monster.userData.active = true;
  
  audioManager.playMonsterGrowl();
  gameState.sanity -= 15;
  updateHUD();
  
  const narration = await aiManager.generateNarration(gameState, 'monster_spotted');
  showMessage(narration || "RUN!", 0xff0000, 2000);
}

/* ===================== GAME MECHANICS ===================== */
async function winGame() {
  gameState.gameWon = true;
  controls.unlock();
  audioManager.stopAmbientDrone();
  
  const playTime = Math.floor((Date.now() - gameState.startTime) / 1000);
  showMessage(`YOU ESCAPED!\nTime: ${playTime}s | Deaths: ${gameState.deaths}`, 0x00ff00, 8000);
  gameState.playing = false;
}

function gameOver(message) {
  controls.unlock();
  gameState.deaths++;
  audioManager.stopAmbientDrone();
  
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
  background: rgba(0,0,0,0.5);
  padding: 10px;
  border-radius: 5px;
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
  background: rgba(255,255,255,0.7);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 0 4px black, 0 0 8px rgba(255,255,255,0.5);
`;
document.body.appendChild(crosshair);

const promptElement = document.createElement('div');
promptElement.style.cssText = `
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  text-shadow: 2px 2px 4px black;
  pointer-events: none;
  z-index: 1000;
  background: rgba(0,0,0,0.7);
  padding: 8px 15px;
  border-radius: 5px;
  display: none;
`;
document.body.appendChild(promptElement);

function showPrompt(text, color = 0xffffff) {
  promptElement.textContent = text;
  promptElement.style.color = `#${color.toString(16).padStart(6, '0')}`;
  promptElement.style.display = 'block';
  
  clearTimeout(showPrompt.timeout);
  showPrompt.timeout = setTimeout(() => {
    promptElement.style.display = 'none';
  }, 100);
}

function updateHUD() {
  const sanityColor = gameState.sanity > 50 ? '#00ff00' : gameState.sanity > 25 ? '#ffaa00' : '#ff0000';
  const batteryColor = gameState.flashlightBattery > 50 ? '#00ff00' : gameState.flashlightBattery > 25 ? '#ffaa00' : '#ff0000';
  
  hudElement.innerHTML = `
    <div style="margin-bottom: 5px;">🔑 KEYS: ${gameState.keysCollected}/${gameState.keysRequired}</div>
    <div style="color: ${sanityColor}; margin-bottom: 5px;">🧠 SANITY: ${Math.round(gameState.sanity)}%</div>
    <div style="color: ${batteryColor}; margin-bottom: 5px;">🔦 BATTERY: ${Math.round(gameState.flashlightBattery)}%</div>
    <div style="font-size: 12px; opacity: 0.7; margin-top: 8px;">F: Toggle Light | H: Hint | E: Interact</div>
  `;
}

function showMessage(text, color = 0xffffff, duration = 2500) {
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
    background: rgba(0,0,0,0.8);
    padding: 20px 30px;
    border-radius: 10px;
    max-width: 600px;
    white-space: pre-line;
  `;
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.style.transition = 'opacity 0.5s';
    messageEl.style.opacity = '0';
    setTimeout(() => messageEl.remove(), 500);
  }, duration);
}

/* ===================== ANIMATIONS ===================== */
let flickerTime = 0;

function updateFlicker(deltaTime) {
  flickerTime += deltaTime * 8;
  corridorLights.forEach((light, i) => {
    const offset = i * 1.5;
    const flicker = Math.sin(flickerTime + offset) * 0.25 + Math.sin(flickerTime * 4.2 + offset) * 0.15;
    light.intensity = 2.5 + flicker;
  });
}

function updateAnimations(deltaTime, elapsedTime) {
  // Animate keys
  keys.forEach(key => {
    if (!key.userData.collected) {
      key.position.y = key.userData.baseY + Math.sin(elapsedTime * 2 + key.userData.floatOffset) * 0.15;
      key.rotation.y += deltaTime * 2;
    }
  });
  
  // Camera breathing
  const breathAmount = move.sprint ? 0.03 : 0.015;
  const breathSpeed = move.sprint ? 3 : 1.5;
  camera.position.y = (move.crouch ? 1.2 : 1.6) + Math.sin(elapsedTime * breathSpeed) * breathAmount;
}

/* ===================== UPDATE LOOP ===================== */
let elapsedTime = 0;
let lastSanityCheck = 0;

function update() {
  const deltaTime = clock.getDelta();
  elapsedTime += deltaTime;
  
  if (controls.isLocked && gameState.playing) {
    // Movement
    const speed = CONFIG.BASE_SPEED * (move.sprint ? CONFIG.SPRINT_MULTIPLIER : 1) * (move.crouch ? 0.5 : 1);
    velocity.set(0, 0, 0);
    
    const isMoving = move.f || move.b || move.l || move.r;
    
    if (move.f) velocity.z -= speed * deltaTime;
    if (move.b) velocity.z += speed * deltaTime;
    if (move.l) velocity.x -= speed * deltaTime;
    if (move.r) velocity.x += speed * deltaTime;
    
    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);
    
    // Footstep sounds
    if (isMoving && elapsedTime - gameState.lastFootstep > (move.sprint ? 0.3 : 0.5)) {
      audioManager.playFootstep();
      gameState.lastFootstep = elapsedTime;
    }
    
    // Keep in expanded bounds
    const playerPos = controls.getObject().position;
    playerPos.x = Math.max(-25, Math.min(25, playerPos.x));
    playerPos.z = Math.max(-75, Math.min(6, playerPos.z));
    playerPos.y = move.crouch ? 1.2 : 1.6;
    
    // Update flashlight
    if (flashlightOn) {
      flashlight.position.copy(camera.position);
      flashlight.target.position.copy(camera.position).add(
        camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5)
      );
      
      // Drain battery
      gameState.flashlightBattery = Math.max(0, gameState.flashlightBattery - deltaTime * CONFIG.BATTERY_DRAIN_RATE);
      flashlight.intensity = 2.5 * (gameState.flashlightBattery / 100);
    }
    
    // Drain sanity in darkness
    if (!flashlightOn || gameState.flashlightBattery < 20) {
      gameState.sanity = Math.max(0, gameState.sanity - deltaTime * CONFIG.SANITY_DRAIN_RATE);
    }
    
    // Heartbeat when low sanity
    if (gameState.sanity < 40 && elapsedTime - gameState.lastHeartbeat > 1.2) {
      const intensity = 1 - (gameState.sanity / 40);
      audioManager.playHeartbeat(intensity);
      gameState.lastHeartbeat = elapsedTime;
    }
    
    // AI narration for low stats
    if (elapsedTime - lastSanityCheck > 20) {
      lastSanityCheck = elapsedTime;
      if (gameState.sanity < 30) {
        aiManager.generateNarration(gameState, 'low_sanity').then(msg => {
          if (msg) showMessage(msg, 0xff6666, 3000);
        });
      } else if (gameState.flashlightBattery < 20) {
        aiManager.generateNarration(gameState, 'low_battery').then(msg => {
          if (msg) showMessage(msg, 0xffaa44, 3000);
        });
      }
    }
    
    // Check game over
    if (gameState.sanity <= 0) {
      gameOver("Your sanity has completely shattered...");
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
showMessage("🎮 ENHANCED HORROR GAME\n\nClick to start\nWASD: Move | Shift: Sprint | C: Crouch\nF: Toggle Flashlight | H: Get Hint | E: Interact\n\nCollect all keys and escape!", 0xffffff, 6000);

console.log("✅ Game Ready!");
