import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";
import { PointerLockControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js";
import { CONFIG } from './config.js';
import { AIManager } from './ai.js';
import { AudioManager } from './audio.js';
import { LevelBuilder } from './level.js';
import { GLTFLoader } from "https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass.js";

console.log("✨ Crystal Core Adventure Loading...");

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
  settingsVisible: false,
  currentLevel: 'jungle',
  weather: 'clear', // 'clear', 'rain', 'dust'
  timeOfDay: 'day', // 'day', 'sunset', 'night'
  structures: [],
  loadedChunks: new Set(),
  enemies: []
};

/* ===================== SCENE ===================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x1a331a, 0.01); // Reduced fog for better jungle visibility

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; // Softer, more realistic shadows
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

/* ===================== POST-PROCESSING ===================== */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, // strength
  0.4, // radius
  0.85 // threshold
);
composer.addPass(bloomPass);

/* ===================== CONTROLS ===================== */
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.body.addEventListener("click", async (e) => {
  // Ignore clicks on UI
  if (e.target.closest('#settings-ui') || e.target.closest('#settings-btn') || e.target.closest('#pause-ui')) return;

  if (!gameState.playing && !renderer.xr.isPresenting) {
    controls.lock();
    gameState.playing = true;
    gameState.startTime = Date.now();
    const startMsg = document.getElementById('start-message');
    if (startMsg) startMsg.remove();
    await audioManager.init();
    const intro = await aiManager.generateNarration(gameState, 'intro');
    showMessage(intro || "Welcome to the Jungle. Find the Core Entrance.", 0xccffcc, 5000);
  }
});

controls.addEventListener('unlock', () => {
  if (!gameState.gameWon && !gameState.mapVisible && !gameState.settingsVisible) {
    const pauseUI = document.getElementById('pause-ui');
    if (pauseUI) pauseUI.style.display = 'flex';
  }
});

controls.addEventListener('lock', () => {
  const pauseUI = document.getElementById('pause-ui');
  if (pauseUI) pauseUI.style.display = 'none';
});

/* ===================== MOVEMENT ===================== */
const move = { f: false, b: false, l: false, r: false, sprint: false };
const velocity = new THREE.Vector3();
const clock = new THREE.Clock();
let footstepTimer = 0;

document.addEventListener("keydown", e => {
  if (e.code === "KeyW") move.f = true;
  if (e.code === "KeyS") move.b = true;
  if (e.code === "KeyA") move.l = true;
  if (e.code === "KeyD") move.r = true;
  if (e.code === "ShiftLeft") move.sprint = true;
  if (e.code === "KeyM") toggleMap();
  if (e.code === "KeyT") interactNPC();
  if (e.code === "KeyL") { // Debug
    const next = gameState.currentLevel === 'jungle' ? 'crystal_core' : 'jungle';
    loadLevel(next);
  }
  if (e.code === "Escape") {
    if (gameState.settingsVisible) toggleSettings();
  }
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
sunLight.shadow.mapSize.set(4096, 4096); // Higher resolution for 4K
scene.add(sunLight);

const lantern = new THREE.PointLight(0xffaa00, 0, 30);
lantern.position.copy(camera.position);
scene.add(lantern);

/* ===================== WEATHER SYSTEM ===================== */
let weatherParticles = null;

function setWeather(type) {
  gameState.weather = type;
  if (weatherParticles) {
    scene.remove(weatherParticles);
    weatherParticles = null;
  }

  if (type === 'clear') return;

  const count = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions.push((Math.random() - 0.5) * 100, Math.random() * 50, (Math.random() - 0.5) * 100);
    velocities.push(0, type === 'rain' ? -0.5 : -0.1, 0);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.userData.velocities = velocities;

  const color = type === 'rain' ? 0xaaaaaa : 0xffffff;
  const size = type === 'rain' ? 0.2 : 0.1;
  const opacity = type === 'rain' ? 0.6 : 0.8;

  const material = new THREE.PointsMaterial({
    color: color,
    size: size,
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending
  });

  weatherParticles = new THREE.Points(geometry, material);
  scene.add(weatherParticles);
}

function updateWeather() {
  if (!weatherParticles) return;
  const positions = weatherParticles.geometry.attributes.position.array;
  const velocities = weatherParticles.geometry.userData.velocities;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] += velocities[i + 1]; // Y movement

    // Reset if below ground
    if (positions[i + 1] < 0) {
      positions[i + 1] = 50;
      positions[i] = camera.position.x + (Math.random() - 0.5) * 50;
      positions[i + 2] = camera.position.z + (Math.random() - 0.5) * 50;
    }
  }
  weatherParticles.geometry.attributes.position.needsUpdate = true;

  // Follow player roughly
  weatherParticles.position.x = camera.position.x;
  weatherParticles.position.z = camera.position.z;
}

/* ===================== TIME OF DAY SYSTEM ===================== */
function setTimeOfDay(time) {
  gameState.timeOfDay = time;

  if (time === 'day') {
    sunLight.color.setHex(0xffffee);
    sunLight.intensity = gameState.currentLevel === 'jungle' ? 1.2 : 0.5;
    sunLight.position.set(50, 100, 50);

    if (gameState.currentLevel === 'jungle') {
      scene.background = new THREE.Color(0x87CEEB);
      scene.fog.color.setHex(0x1a331a);
    } else {
      scene.background = new THREE.Color(0x1a3333);
      scene.fog.color.setHex(0x1a3333);
    }
  } else if (time === 'sunset') {
    sunLight.color.setHex(0xffa500); // Orange
    sunLight.intensity = 0.8;
    sunLight.position.set(100, 20, 50); // Lower on horizon

    if (gameState.currentLevel === 'jungle') {
      scene.background = new THREE.Color(0xff6b35);
      scene.fog.color.setHex(0x3d2817);
    } else {
      scene.background = new THREE.Color(0x2d1b2e);
      scene.fog.color.setHex(0x2d1b2e);
    }
  } else if (time === 'night') {
    sunLight.color.setHex(0x4444ff); // Moonlight
    sunLight.intensity = 0.3;
    sunLight.position.set(-50, 80, -50);

    if (gameState.currentLevel === 'jungle') {
      scene.background = new THREE.Color(0x0a0a1a);
      scene.fog.color.setHex(0x0a0a1a);
    } else {
      scene.background = new THREE.Color(0x050510);
      scene.fog.color.setHex(0x050510);
    }

    // Enable lantern at night
    lantern.intensity = 2;
  } else {
    lantern.intensity = 0;
  }
}

/* ===================== LEVEL SYSTEM ===================== */
const levelBuilder = new LevelBuilder(scene);
let treasures = [];

class ShadowGuardian {
  constructor(x, z) {
    this.group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: 0x5500ff, emissive: 0x220055, roughness: 0.1, metalness: 0.8 }));
    this.group.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    eye.position.set(0, 0.2, 0.5);
    this.group.add(eye);
    this.group.position.set(x, 1.5, z);
    scene.add(this.group);

    this.spawnPos = new THREE.Vector3(x, 1.5, z);
    this.velocity = new THREE.Vector3();
    this.state = 'patrol'; // 'patrol' or 'chase'
  }

  update(deltaTime, playerPos) {
    const distToPlayer = playerPos.distanceTo(this.group.position);

    if (distToPlayer < 15) {
      this.state = 'chase';
    } else if (distToPlayer > 25) {
      this.state = 'patrol';
    }

    if (this.state === 'chase') {
      const dir = new THREE.Vector3().subVectors(playerPos, this.group.position).normalize();
      dir.y = 0;
      this.group.position.add(dir.multiplyScalar(deltaTime * 4));
    } else {
      // Idle/Patrol float
      this.group.position.y = 1.5 + Math.sin(Date.now() * 0.002) * 0.5;
    }

    // Look at player if close
    if (distToPlayer < 20) this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);

    // Collision
    if (distToPlayer < 1.5) {
      showMessage("THE SHADOWS TOUCH YOU...", 0xff0000, 2000);
      const pushBack = new THREE.Vector3().subVectors(this.group.position, playerPos).normalize();
      controls.moveForward(-10); // Simple knockback
      audioManager.play('reveal'); // Use reveal sound for scare
    }
  }
}

function loadLevel(type) {
  gameState.currentLevel = type;

  // CRITICAL: Clean up all existing entities and state
  treasures.forEach(t => scene.remove(t));
  treasures = [];

  gameState.enemies.forEach(e => scene.remove(e.group));
  gameState.enemies = [];

  gameState.loadedChunks.clear(); // Force chunk regeneration
  levelBuilder.clearLevel(); // Clear all chunks and structures

  if (type === 'jungle') {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x1a331a, 0.02);
    ambientLight.color.setHex(0xffffff); ambientLight.intensity = 0.6;
    sunLight.intensity = 1.2;
    lantern.intensity = 0;

    levelBuilder.buildJungle();
    setWeather('rain'); // Default jungle weather

    createTreasure(10, 10, 'gold');
    createTreasure(-20, 20, 'gold');

  } else if (type === 'crystal_core') {
    // Dimmer, Magical Atmosphere
    scene.background = new THREE.Color(0x1a3333); // Darker Teal
    scene.fog = new THREE.FogExp2(0x1a3333, 0.02); // Recalibrated fog density

    ambientLight.color.setHex(0x00ffff);
    ambientLight.intensity = 0.8; // Brighter ambient for better visibility

    sunLight.intensity = 0.5; // Soft directional light
    lantern.intensity = 0; // Not needed

    levelBuilder.buildCrystalCore();
    setWeather('dust'); // Crystal dust

    createTreasure(0, -20, 'gem');
    createTreasure(-40, 40, 'gem');
    createTreasure(40, -40, 'gem');
  }

  // Snap structures to ground
  levelBuilder.structures.forEach(s => {
    if (type === 'jungle') s.y = levelBuilder.getJungleHeight(s.x, s.z);
    else s.y = levelBuilder.getCrystalHeight(s.x, s.z);
  });

  gameState.structures = levelBuilder.structures;
  camera.position.set(0, 5, 5);
  velocity.set(0, 0, 0);

  // Initial Chunks
  updateChunks(true);
}

function updateChunks(force = false) {
  const px = camera.position.x;
  const pz = camera.position.z;
  const cx = Math.round(px / levelBuilder.chunkSize);
  const cz = Math.round(pz / levelBuilder.chunkSize);

  // Only update if we moved to a new chunk or force
  const radius = 2;
  const newChunks = new Set();

  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let z = cz - radius; z <= cz + radius; z++) {
      const key = `${x},${z}`;
      newChunks.add(key);
      if (!gameState.loadedChunks.has(key)) {
        levelBuilder.buildChunk(x, z, gameState.currentLevel);

        // Spawn treasure if chunk has one
        const chunk = levelBuilder.chunks.get(key);
        if (chunk.userData.hasTreasure) {
          createTreasure(chunk.userData.hasTreasure.x, chunk.userData.hasTreasure.z, chunk.userData.hasTreasure.type);
        }

        // Spawn enemy if chunk has one
        if (chunk.userData.hasEnemy) {
          const enemy = new ShadowGuardian(chunk.userData.hasEnemy.x, chunk.userData.hasEnemy.z);
          gameState.enemies.push(enemy);
        }
      }
    }
  }

  // Unload old chunks
  gameState.loadedChunks.forEach(key => {
    if (!newChunks.has(key)) {
      const [ux, uz] = key.split(',').map(Number);
      levelBuilder.removeChunk(ux, uz);
      // Optional: Clean up enemies in that chunk
      gameState.enemies = gameState.enemies.filter(e => {
        const ex = Math.round(e.group.position.x / levelBuilder.chunkSize);
        const ez = Math.round(e.group.position.z / levelBuilder.chunkSize);
        if (ex === ux && ez === uz) {
          scene.remove(e.group);
          return false;
        }
        return true;
      });
    }
  });

  gameState.loadedChunks = newChunks;
  gameState.structures = levelBuilder.structures;
}

// REMOVE loadLevel('jungle') from here

/* ===================== TREASURES ===================== */
function createTreasure(x, z, type = 'gold') {
  let y = 0.5;
  if (gameState.currentLevel === 'crystal_core') {
    y = levelBuilder.getCrystalHeight(x, z) + 0.5;
  } else {
    y = levelBuilder.getJungleHeight(x, z) + 0.5;
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

  // Real-time map update trigger - ensuring we use accurate world pos
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

/* ===================== UI SYSTEMS ===================== */
// Map
const mapCanvas = document.createElement('canvas');
mapCanvas.width = 512; mapCanvas.height = 512;
const mapCtx = mapCanvas.getContext('2d');
const mapOverlay = document.createElement('div');
mapOverlay.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; height: 400px; background-color: #2a2a2a; border: 4px solid #555; border-radius: 50%; display: none; z-index: 1500; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.8);`;
const mapImage = document.createElement('img');
mapImage.style.width = '100%'; mapImage.style.height = '100%';
mapOverlay.appendChild(mapImage);
document.body.appendChild(mapOverlay);

function toggleMap() {
  gameState.mapVisible = !gameState.mapVisible;
  mapOverlay.style.display = gameState.mapVisible ? 'block' : 'none';
}

function updateMap() {
  mapCtx.fillStyle = '#111'; mapCtx.fillRect(0, 0, 512, 512);
  mapCtx.strokeStyle = '#333'; mapCtx.lineWidth = 2;
  mapCtx.beginPath(); mapCtx.arc(256, 256, 250, 0, Math.PI * 2); mapCtx.stroke();

  // North Indicator on Map
  mapCtx.fillStyle = '#00ffff';
  mapCtx.font = '24px Courier New';
  mapCtx.textAlign = 'center';
  mapCtx.fillText('N', 256, 35);

  const scale = 2; // Fixed zoom scale
  const px = camera.position.x;
  const pz = camera.position.z;

  gameState.structures.forEach(struct => {
    const mx = (struct.x - px) * scale + 256;
    const my = (struct.z - pz) * scale + 256;
    if (Math.hypot(mx - 256, my - 256) < 240) {
      mapCtx.font = '20px serif';
      mapCtx.fillText(struct.type === 'cave' ? "🕳️" : "🏛️", mx, my);
    }
  });

  treasures.forEach(t => {
    if (!t.userData.collected) {
      const mx = (t.position.x - px) * scale + 256;
      const my = (t.position.z - pz) * scale + 256;
      if (Math.hypot(mx - 256, my - 256) < 240) {
        mapCtx.font = '16px serif';
        mapCtx.fillText(t.userData.type === 'gold' ? '💰' : '💎', mx, my);
      }
    }
  });

  // Draw Enemies on Map
  gameState.enemies.forEach(e => {
    const mx = (e.group.position.x - px) * scale + 256;
    const my = (e.group.position.z - pz) * scale + 256;
    if (Math.hypot(mx - 256, my - 256) < 240) {
      mapCtx.font = '16px serif';
      mapCtx.fillText('👾', mx, my);
    }
  });

  // Player in center
  mapCtx.fillStyle = '#00ff00'; mapCtx.beginPath(); mapCtx.arc(256, 256, 8, 0, Math.PI * 2); mapCtx.fill();

  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const angle = Math.atan2(dir.z, dir.x);
  mapCtx.fillStyle = 'rgba(0, 255, 0, 0.3)';
  mapCtx.beginPath(); mapCtx.moveTo(256, 256);
  mapCtx.arc(256, 256, 40, angle - 0.5, angle + 0.5);
  mapCtx.fill();

  mapImage.src = mapCanvas.toDataURL();
}

// Settings UI
const settingsBtn = document.createElement('div');
settingsBtn.id = 'settings-btn';
settingsBtn.innerHTML = '⚙️';
settingsBtn.style.cssText = `position: fixed; top: 20px; right: 90px; font-size: 30px; cursor: pointer; z-index: 1000; color: white; text-shadow: 0 0 5px black;`;
settingsBtn.onclick = toggleSettings;
document.body.appendChild(settingsBtn);

const settingsUI = document.createElement('div');
settingsUI.id = 'settings-ui';
settingsUI.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; color: white; display: none; z-index: 2000; font-family: sans-serif;`;
settingsUI.innerHTML = `
  <h2 style="margin-top:0">Settings</h2>
  <div style="margin-bottom: 15px;">
    <label>Weather:</label>
    <select id="weather-select" style="margin-left: 10px; padding: 5px;">
      <option value="clear">Clear</option>
      <option value="rain">Rain</option>
      <option value="dust">Crystal Dust</option>
    </select>
  </div>
  <div style="margin-bottom: 15px;">
    <label>Time of Day:</label>
    <select id="time-select" style="margin-left: 10px; padding: 5px;">
      <option value="day" selected>Day</option>
      <option value="sunset">Sunset</option>
      <option value="night">Night</option>
    </select>
  </div>
  <button id="close-settings" style="padding: 5px 15px; cursor: pointer;">Close</button>
`;
document.body.appendChild(settingsUI);

document.getElementById('weather-select').addEventListener('change', (e) => {
  setWeather(e.target.value);
});

document.getElementById('time-select').addEventListener('change', (e) => {
  setTimeOfDay(e.target.value);
});

function toggleSettings() {
  gameState.settingsVisible = !gameState.settingsVisible;
  settingsUI.style.display = gameState.settingsVisible ? 'block' : 'none';
  if (gameState.settingsVisible) {
    controls.unlock();
  } else {
    controls.lock();
  }
}

document.getElementById('close-settings').addEventListener('click', toggleSettings);

/* ===================== GAME LOOP ===================== */
function update() {
  const deltaTime = clock.getDelta();

  if (controls.isLocked && gameState.playing) {
    const speed = 5.0 * (move.sprint ? 1.6 : 1);
    velocity.set(0, 0, 0);
    if (move.f) velocity.z += speed * deltaTime;
    if (move.b) velocity.z -= speed * deltaTime;
    if (move.l) velocity.x -= speed * deltaTime;
    if (move.r) velocity.x += speed * deltaTime;
    controls.moveRight(velocity.x); controls.moveForward(velocity.z);

    const playerPos = controls.getObject().position;

    let terrainH = 0;
    if (gameState.currentLevel === 'crystal_core') {
      terrainH = levelBuilder.getCrystalHeight(playerPos.x, playerPos.z);
    } else {
      terrainH = levelBuilder.getJungleHeight(playerPos.x, playerPos.z);
    }
    playerPos.y = terrainH + 1.8;

    if (gameState.currentLevel === 'jungle') {
      const cave = gameState.structures.find(s => s.type === 'cave');
      if (cave && Math.hypot(playerPos.x - cave.x, playerPos.z - cave.z) < 3) {
        showMessage("Entering the Crystal Core...", 0xffffff, 2000);
        setTimeout(() => loadLevel('crystal_core'), 1000);
      }
    }

    lantern.position.copy(playerPos);
    treasures.forEach(t => {
      if (!t.userData.collected && playerPos.distanceTo(t.position) < 3) collectTreasure(t);
    });

    gameState.enemies.forEach(e => e.update(deltaTime, playerPos));

    // Footsteps
    if (move.f || move.b || move.l || move.r) {
      footstepTimer += deltaTime * (move.sprint ? 1.6 : 1);
      if (footstepTimer > 0.45) { // Threshold for step sound
        audioManager.play('footstep');
        footstepTimer = 0;
      }
    } else {
      footstepTimer = 0;
    }
  }

  updateNPC(deltaTime);
  updateWeather();
  updateChunks();
  if (gameState.mapVisible) updateMap();
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

// Pause UI
const pauseUI = document.createElement('div');
pauseUI.id = 'pause-ui';
pauseUI.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; color: white; display: none; z-index: 2000; font-family: sans-serif; text-align: center;`;
pauseUI.innerHTML = `
  <h2 style="margin-top:0">Paused</h2>
  <button id="resume-btn" style="padding: 10px 20px; font-size: 18px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px;">Resume Game</button>
`;
document.body.appendChild(pauseUI);

document.getElementById('resume-btn').addEventListener('click', () => {
  controls.lock();
  pauseUI.style.display = 'none';
});

const hudElement = document.createElement('div');
hudElement.style.cssText = `position: fixed; top: 20px; left: 20px; color: white; font-family: 'Courier New', monospace; font-size: 18px; text-shadow: 2px 2px 4px black; pointer-events: none; z-index: 1000; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px;`;
document.body.appendChild(hudElement);

const startMessage = document.createElement('div');
startMessage.id = 'start-message';
startMessage.textContent = "Click to Explore";
startMessage.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 32px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px black; pointer-events: none; z-index: 2000; background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px;`;
document.body.appendChild(startMessage);

const compassElement = document.createElement('div');
compassElement.id = 'compass';
compassElement.style.cssText = `
  position: fixed; 
  top: 20px; 
  left: 50%; 
  transform: translateX(-50%); 
  width: 300px; 
  height: 40px; 
  background: rgba(255, 255, 255, 0.1); 
  backdrop-filter: blur(10px); 
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2); 
  border-radius: 20px; 
  overflow: hidden; 
  z-index: 1000; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
`;
const compassTape = document.createElement('div');
compassTape.style.cssText = `
  position: absolute;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #fff;
  letter-spacing: 15px;
  transition: transform 0.1s ease-out;
  text-shadow: 0 0 5px #00ffff;
`;
// Create the compass text
const directions = "N · · E · · S · · W · · ";
compassTape.textContent = directions + directions + directions;
compassElement.appendChild(compassTape);

const compassPointer = document.createElement('div');
compassPointer.style.cssText = `
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #00ffff;
  box-shadow: 0 0 10px #00ffff;
  z-index: 2;
`;
compassElement.appendChild(compassPointer);
document.body.appendChild(compassElement);

function updateHUD() {
  hudElement.innerHTML = `
    <div style="margin-bottom: 5px; color: #ffd700;">🏆 TREASURES: ${gameState.treasuresCollected}/${gameState.treasuresRequired}</div>
    <div style="font-size: 14px; opacity: 0.8; margin-top: 10px;">WASD: Move | M: Map | T: Guide</div>
    <div style="font-size: 12px; color: #aaa;">ZONE: ${gameState.currentLevel.toUpperCase()}</div>
  `;

  // Update Compass
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  let angle = Math.atan2(dir.x, dir.z); // Yaw angle
  if (angle < 0) angle += Math.PI * 2;

  // HUD tape math fix: We have 4 cardinal directions in "N · · E · · S · · W · · "
  // 12 units total. Width is 300px.
  // One full rotation (2PI) should shift the tape by its full length.
  const tapeWidth = 480; // Estimated pixels for the triple-string
  const shift = (angle / (Math.PI * 2)) * (tapeWidth / 3);
  compassTape.style.transform = `translateX(${-shift}px)`;
}

function showMessage(text, color = 0xffffff, duration = 3000) {
  const messageEl = document.createElement('div');
  messageEl.textContent = text;
  messageEl.style.cssText = `position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%); color: #${color.toString(16).padStart(6, '0')}; font-size: 28px; font-family: 'Georgia', serif; font-style: italic; text-align: center; text-shadow: 0px 0px 10px rgba(0,0,0,0.5); pointer-events: none; z-index: 2000; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.6), transparent); padding: 20px 60px; width: 100%; opacity: 0; transition: opacity 1s;`;
  document.body.appendChild(messageEl);
  requestAnimationFrame(() => messageEl.style.opacity = '1');
  setTimeout(() => { messageEl.style.opacity = '0'; setTimeout(() => messageEl.remove(), 1000); }, duration);
}

// Initial Level Load & Start Loop
renderer.setAnimationLoop(() => {
  update();
  composer.render(); // Use composer instead of direct renderer
});
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight); // Update composer size
});

updateHUD();
loadLevel('jungle');
