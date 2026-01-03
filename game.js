import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { PointerLockControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js";
import { CONFIG } from './config.js';
import { AIManager } from './ai.js';
import { AudioManager } from './audio.js';
import { LevelBuilder } from './level.js';
import { GLTFLoader } from "https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

console.log("🌴 Multi-Level Adventure Loading...");

/* ===================== MANAGERS ===================== */
const aiManager = new AIManager();
const audioManager = new AudioManager();
const gltfLoader = new GLTFLoader();

/* ===================== GAME STATE ===================== */
const gameState = {
  treasuresCollected: 0,
  treasuresRequired: 5,
  gameWon: false,
  playing: false,
  startTime: 0,
  mapVisible: false,
  currentLevel: 'jungle', // 'jungle' or 'subterranean'
  structures: []
};

/* ===================== SCENE ===================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Start with Jungle Sky
scene.fog = new THREE.FogExp2(0x1a331a, 0.02);

/* ===================== CAMERA ===================== */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(0, 1.7, 5);

/* ===================== RENDERER ===================== */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

/* ===================== CONTROLS ===================== */
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.body.addEventListener("click", async () => {
  if (!gameState.playing && !renderer.xr.isPresenting) {
    controls.lock();
    gameState.playing = true;
    gameState.startTime = Date.now();

    const startMsg = document.getElementById('start-message');
    if (startMsg) startMsg.remove();

    await audioManager.init();

    const intro = await aiManager.generateNarration(gameState, 'intro');
    showMessage(intro || "Welcome to the Jungle. Explore and find the secrets.", 0xccffcc, 5000);
  }
});

controls.addEventListener('unlock', () => {
  if (!gameState.gameWon) {
    showMessage("Click to continue adventure", 0xffffff);
  }
});

/* ===================== MOVEMENT ===================== */
const move = { f: false, b: false, l: false, r: false, sprint: false };
const velocity = new THREE.Vector3();
const clock = new THREE.Clock();

document.addEventListener("keydown", e => {
  if (e.code === "KeyW") move.f = true;
  if (e.code === "KeyS") move.b = true;
  if (e.code === "KeyA") move.l = true;
  if (e.code === "KeyD") move.r = true;
  if (e.code === "ShiftLeft") move.sprint = true;
  if (e.code === "KeyM") toggleMap();
  if (e.code === "KeyT") interactNPC();
});

document.addEventListener("keyup", e => {
  if (e.code === "KeyW") move.f = false;
  if (e.code === "KeyS") move.b = false;
  if (e.code === "KeyA") move.l = false;
  if (e.code === "KeyD") move.r = false;
  if (e.code === "ShiftLeft") move.sprint = false;
});

/* ===================== LIGHTING ===================== */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
scene.add(sunLight);

const lantern = new THREE.PointLight(0xffaa00, 0, 15); // Off initially
lantern.position.copy(camera.position);
scene.add(lantern);

/* ===================== LEVEL SYSTEM ===================== */
const levelBuilder = new LevelBuilder(scene);
let treasures = [];

function loadLevel(type) {
  gameState.currentLevel = type;
  treasures.forEach(t => scene.remove(t));
  treasures = [];

  if (type === 'jungle') {
    // Visuals
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x1a331a, 0.02);
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.6;
    sunLight.intensity = 1.2;
    lantern.intensity = 0;

    // Build
    levelBuilder.buildJungle();

    // Treasures
    createTreasure(10, 10, 'gold');
    createTreasure(-20, 20, 'gold');

  } else if (type === 'subterranean') {
    // Visuals
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.025);
    ambientLight.color.setHex(0x442266);
    ambientLight.intensity = 0.4;
    sunLight.intensity = 0.2; // Dim core light
    lantern.intensity = 1.5;

    // Build
    levelBuilder.buildSubterranean();

    // Treasures
    createTreasure(0, -20, 'gem');
    createTreasure(-40, 40, 'gem');
    createTreasure(40, -40, 'gem');
  }

  gameState.structures = levelBuilder.structures;

  // Reset Player
  camera.position.set(0, 5, 5);
  velocity.set(0, 0, 0);
}

// Initial Load
loadLevel('jungle');

/* ===================== TREASURES ===================== */
function createTreasure(x, z, type = 'gold') {
  let y = 0.5;
  if (gameState.currentLevel === 'subterranean') {
    y = levelBuilder.getTerrainHeight(x, z) + 0.5;
  }

  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: type === 'gold' ? 0xffd700 : 0x00ffff, metalness: 0.9, roughness: 0.1, emissive: type === 'gold' ? 0x443300 : 0x004444 });
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), mat);
  group.add(mesh);
  const glow = new THREE.PointLight(mat.color, 1, 3);
  group.add(glow);
  group.position.set(x, y, z);
  group.userData.type = 'treasure';
  group.userData.collected = false;
  scene.add(group);
  treasures.push(group);
}

/* ===================== NPC SYSTEM ===================== */
const npcGroup = new THREE.Group();
const npcBody = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.8 }));
npcGroup.add(npcBody);
npcGroup.position.set(2, 5, 2);
scene.add(npcGroup);
let npcTargetPos = new THREE.Vector3();

function updateNPC(deltaTime) {
  const playerPos = camera.position.clone();
  const offset = new THREE.Vector3(1.5, 0.5, 1.5);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Date.now() * 0.0005);
  npcTargetPos.copy(playerPos).add(offset);
  npcGroup.position.lerp(npcTargetPos, deltaTime * 2);
}

async function interactNPC() {
  const hint = await aiManager.getDynamicHint(gameState, camera.position);
  showMessage(`GUIDE: ${hint}`, 0x00ff00, 5000);
  audioManager.play('collect');
}

/* ===================== MAP SYSTEM ===================== */
const mapCanvas = document.createElement('canvas');
mapCanvas.width = 512; mapCanvas.height = 512;
const mapCtx = mapCanvas.getContext('2d');
const mapOverlay = document.createElement('div');
mapOverlay.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; height: 400px; background-color: #2a2a2a; border: 4px solid #555; border-radius: 8px; display: none; z-index: 1500;`;
const mapImage = document.createElement('img');
mapImage.style.width = '100%'; mapImage.style.height = '100%';
mapOverlay.appendChild(mapImage);
document.body.appendChild(mapOverlay);

function toggleMap() {
  gameState.mapVisible = !gameState.mapVisible;
  mapOverlay.style.display = gameState.mapVisible ? 'block' : 'none';
  if (gameState.mapVisible) {
    updateMap();
    controls.unlock();
  } else {
    controls.lock();
  }
}

function updateMap() {
  mapCtx.fillStyle = '#111'; mapCtx.fillRect(0, 0, 512, 512);

  // Draw Structures
  const scale = 512 / 200; const offsetX = 256; const offsetY = 256;
  mapCtx.fillStyle = '#888'; mapCtx.font = '12px Arial'; mapCtx.textAlign = 'center';
  gameState.structures.forEach(struct => {
    const mx = struct.x * scale + offsetX; const my = struct.z * scale + offsetY;
    mapCtx.fillRect(mx - 8, my - 8, 16, 16);
    mapCtx.fillStyle = '#aaa'; mapCtx.fillText(struct.type === 'cave' ? "🕳️" : "🏛️", mx, my + 4);
  });

  // Draw Treasures
  mapCtx.fillStyle = '#ffaa00';
  treasures.forEach(t => {
    if (!t.userData.collected) {
      const mx = t.position.x * scale + offsetX; const my = t.position.z * scale + offsetY;
      mapCtx.fillRect(mx - 3, my - 3, 6, 6);
    }
  });

  // Player
  const px = camera.position.x * scale + offsetX; const py = camera.position.z * scale + offsetY;
  mapCtx.fillStyle = '#00ff00'; mapCtx.beginPath(); mapCtx.arc(px, py, 6, 0, Math.PI * 2); mapCtx.fill();
  mapImage.src = mapCanvas.toDataURL();
}

/* ===================== GAME LOOP ===================== */
function update() {
  const deltaTime = clock.getDelta();

  if (controls.isLocked && gameState.playing) {
    const speed = 5.0 * (move.sprint ? 1.6 : 1);
    velocity.set(0, 0, 0);
    if (move.f) velocity.z -= speed * deltaTime;
    if (move.b) velocity.z += speed * deltaTime;
    if (move.l) velocity.x -= speed * deltaTime;
    if (move.r) velocity.x += speed * deltaTime;
    controls.moveRight(velocity.x); controls.moveForward(velocity.z);

    const playerPos = controls.getObject().position;
    playerPos.x = Math.max(-95, Math.min(95, playerPos.x));
    playerPos.z = Math.max(-95, Math.min(95, playerPos.z));

    // Physics & Interaction
    if (gameState.currentLevel === 'subterranean') {
      const h = levelBuilder.getTerrainHeight(playerPos.x, playerPos.z);
      playerPos.y = h + 1.7;
    } else {
      playerPos.y = 1.7; // Flat jungle

      // Check Cave Entrance
      const cave = gameState.structures.find(s => s.type === 'cave');
      if (cave) {
        const dist = Math.hypot(playerPos.x - cave.x, playerPos.z - cave.z);
        if (dist < 3) {
          showMessage("Entering the Depths...", 0x000000, 2000);
          setTimeout(() => loadLevel('subterranean'), 1000);
        }
      }
    }

    lantern.position.copy(playerPos);
    treasures.forEach(t => {
      if (!t.userData.collected && playerPos.distanceTo(t.position) < 3) collectTreasure(t);
    });
  }

  updateNPC(deltaTime);
  treasures.forEach(t => { if (!t.userData.collected) t.rotation.y += deltaTime; });
  updateHUD();
}

async function collectTreasure(t) {
  t.userData.collected = true;
  gameState.treasuresCollected++;
  scene.remove(t);
  audioManager.play('collect');
  const narration = await aiManager.generateNarration(gameState, 'treasure_found');
  showMessage(narration || `Artifact Found! (${gameState.treasuresCollected}/${gameState.treasuresRequired})`, 0xffd700);
  if (gameState.treasuresCollected >= gameState.treasuresRequired) winGame();
}

async function winGame() {
  gameState.gameWon = true; controls.unlock();
  showMessage("YOU ARE THE MASTER EXPLORER!", 0x00ff00, 8000);
  gameState.playing = false;
}

/* ===================== HUD ===================== */
const hudElement = document.createElement('div');
hudElement.style.cssText = `position: fixed; top: 20px; left: 20px; color: white; font-family: 'Courier New', monospace; font-size: 18px; text-shadow: 2px 2px 4px black; pointer-events: none; z-index: 1000; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px;`;
document.body.appendChild(hudElement);

const startMessage = document.createElement('div');
startMessage.id = 'start-message';
startMessage.textContent = "Click to Explore";
startMessage.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 32px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px black; pointer-events: none; z-index: 2000; background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px;`;
document.body.appendChild(startMessage);

function updateHUD() {
  hudElement.innerHTML = `
    <div style="margin-bottom: 5px; color: #ffd700;">🏆 TREASURES: ${gameState.treasuresCollected}/${gameState.treasuresRequired}</div>
    <div style="font-size: 14px; opacity: 0.8; margin-top: 10px;">WASD: Move | M: Map | T: Guide</div>
    <div style="font-size: 12px; color: #aaa;">ZONE: ${gameState.currentLevel.toUpperCase()}</div>
  `;
}

function showMessage(text, color = 0xffffff, duration = 3000) {
  const messageEl = document.createElement('div');
  messageEl.textContent = text;
  messageEl.style.cssText = `position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%); color: #${color.toString(16).padStart(6, '0')}; font-size: 28px; font-family: 'Georgia', serif; font-style: italic; text-align: center; text-shadow: 0px 0px 10px rgba(0,0,0,0.5); pointer-events: none; z-index: 2000; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.6), transparent); padding: 20px 60px; width: 100%; opacity: 0; transition: opacity 1s;`;
  document.body.appendChild(messageEl);
  requestAnimationFrame(() => messageEl.style.opacity = '1');
  setTimeout(() => { messageEl.style.opacity = '0'; setTimeout(() => messageEl.remove(), 1000); }, duration);
}

renderer.setAnimationLoop(() => { update(); renderer.render(scene, camera); });
window.addEventListener("resize", () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
updateHUD();
