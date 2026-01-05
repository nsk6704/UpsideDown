import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.materials = {};
    this.structures = [];
    this.levelObjects = [];
    this.chunks = new Map(); // Key: 'x,z', Value: THREE.Group
    this.loadMaterials();
    this.noiseScale = 0.05;
    this.heightScale = 8;
    this.chunkSize = 100;
  }

  // Simple Seedable PRNG
  seededRandom(s) {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  }

  loadMaterials() {
    // Jungle
    this.materials.grass = new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 1.0, map: this.createNoiseTexture(0x2d4c1e, 0x1a2e12) });
    this.materials.bark = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9, map: this.createNoiseTexture(0x3e2723, 0x281a17) });
    this.materials.leaves = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, side: THREE.DoubleSide });

    // Crystal Core (Bright & Magical) - Enhanced for 4K
    this.materials.coreGround = new THREE.MeshStandardMaterial({
      color: 0xe0ffff,
      roughness: 0.3,
      metalness: 0.3,
      emissive: 0x004444,
      emissiveIntensity: 0.3
    });
    this.materials.lightPillar = new THREE.MeshPhysicalMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 3.0, // Increased for bloom
      transparent: true,
      opacity: 0.8,
      transmission: 0.5,
      metalness: 0.9,
      roughness: 0.1
    });
    this.materials.crystalTree = new THREE.MeshPhysicalMaterial({
      color: 0xff00ff,
      emissive: 0x550055,
      emissiveIntensity: 0.8, // Increased for bloom
      metalness: 0.9,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    this.materials.crystalArch = new THREE.MeshPhysicalMaterial({
      color: 0x0088ff,
      emissive: 0x002244,
      emissiveIntensity: 0.5,
      metalness: 0.95,
      roughness: 0.0,
      transmission: 0.3,
      clearcoat: 1.0
    });

    // Shared
    this.materials.stone = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, map: this.createNoiseTexture(0x888888, 0x666666) });
  }

  createNoiseTexture(color1, color2) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `#${color1.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 3 + 1;
      ctx.fillStyle = `#${color2.toString(16).padStart(6, '0')}`;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, y, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  getTerrainHeight(x, z) {
    // Old Subterranean height (unused now for core)
    return Math.sin(x * this.noiseScale) * Math.cos(z * this.noiseScale) * this.heightScale;
  }

  getJungleHeight(x, z) {
    return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
  }

  getCrystalHeight(x, z) {
    // Flatter terrain with occasional steps/plateaus
    // Using Math.floor to create steps
    const largeStep = Math.floor(Math.sin(x * 0.05) * 2) * 2;
    const smallDetail = Math.cos(z * 0.1) * 0.5;
    return largeStep + smallDetail;
  }

  clearLevel() {
    this.chunks.forEach(chunk => this.scene.remove(chunk));
    this.chunks.clear();
    this.levelObjects = [];
    this.structures = [];
  }

  buildChunk(cx, cz, type) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return;

    const chunkGroup = new THREE.Group();
    const xOffset = cx * this.chunkSize;
    const zOffset = cz * this.chunkSize;

    // Ground
    const geometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, 32, 32);
    const posAttribute = geometry.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const px = posAttribute.getX(i) + xOffset;
      const pz = posAttribute.getY(i) - zOffset; // Note: PlaneGeometry Y maps to World Z
      const h = type === 'jungle' ? this.getJungleHeight(px, -pz) : this.getCrystalHeight(px, -pz);
      posAttribute.setZ(i, h);
    }
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, type === 'jungle' ? this.materials.grass : this.materials.coreGround);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(xOffset, 0, zOffset);
    ground.receiveShadow = true;
    chunkGroup.add(ground);

    // Seed for this chunk
    const seed = cx * 73 + cz * 37;

    // Foliage/Props
    const density = type === 'jungle' ? 50 : 20;
    for (let i = 0; i < density; i++) {
      const rand = this.seededRandom(seed + i);
      const rx = (rand - 0.5) * this.chunkSize + xOffset;
      const rz = (this.seededRandom(seed + i + 100) - 0.5) * this.chunkSize + zOffset;
      const ry = type === 'jungle' ? this.getJungleHeight(rx, rz) : this.getCrystalHeight(rx, rz);

      if (type === 'jungle') {
        this.addTreeToChunk(chunkGroup, rx, ry, rz, seed + i);
      } else {
        if (rand > 0.7) this.addLightPillarToChunk(chunkGroup, rx, ry, rz, seed + i);
        else this.addCrystalTreeToChunk(chunkGroup, rx, ry, rz, seed + i);
      }
    }

    // Fixed structures at specific chunk coordinates for navigation
    if (type === 'jungle' && cx === 0 && cz === 0) {
      this.addCaveEntranceToChunk(chunkGroup, 0, this.getJungleHeight(0, -40), -40);
    }

    if (type === 'jungle') {
      if (cx === 1 && cz === 1) this.addTempleToChunk(chunkGroup, 30, this.getJungleHeight(30, 30), 30, "Sun Temple");
      if (cx === -1 && cz === -1) this.addTempleToChunk(chunkGroup, -30, this.getJungleHeight(-30, -30), -30, "Moon Ruins");
    } else if (type === 'crystal_core') {
      if (cx === 0 && cz === 0) this.addTempleToChunk(chunkGroup, 0, this.getCrystalHeight(0, -20), -20, "Core Sanctum");
    }

    // Occasional Random Structures
    const structSeed = seed + 999;
    if (Math.abs(this.seededRandom(structSeed)) > 0.95 && Math.abs(cx) > 1 && Math.abs(cz) > 1) {
      const sx = xOffset;
      const sz = zOffset;
      const sy = type === 'jungle' ? this.getJungleHeight(sx, sz) : this.getCrystalHeight(sx, sz);
      this.addTempleToChunk(chunkGroup, sx, sy, sz, "Lost Outpost");
    }

    // Rare Treasures & Enemies
    const entitySeed = seed + 500;
    if (this.seededRandom(entitySeed) > 0.92) {
      const tx = (this.seededRandom(entitySeed + 1) - 0.5) * this.chunkSize + xOffset;
      const tz = (this.seededRandom(entitySeed + 2) - 0.5) * this.chunkSize + zOffset;
      chunkGroup.userData.hasTreasure = { x: tx, z: tz, type: type === 'jungle' ? 'gold' : 'gem' };
    }

    if (this.seededRandom(entitySeed + 10) > 0.85) {
      const ex = (this.seededRandom(entitySeed + 11) - 0.5) * this.chunkSize + xOffset;
      const ez = (this.seededRandom(entitySeed + 12) - 0.5) * this.chunkSize + zOffset;
      chunkGroup.userData.hasEnemy = { x: ex, z: ez };
    }

    this.scene.add(chunkGroup);
    this.chunks.set(key, chunkGroup);
  }

  removeChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) {
      this.scene.remove(this.chunks.get(key));
      this.chunks.delete(key);
    }
  }

  addTreeToChunk(group, x, y, z, seed) {
    const height = 4 + this.seededRandom(seed) * 6;
    const treeGroup = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, height, 8), this.materials.bark);
    trunk.position.y = height / 2;
    treeGroup.add(trunk);
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + this.seededRandom(seed + 1), 0), this.materials.leaves);
    foliage.position.y = height - 1;
    treeGroup.add(foliage);
    treeGroup.position.set(x, y, z);
    group.add(treeGroup);
  }

  addLightPillarToChunk(group, x, y, z, seed) {
    const height = 10 + this.seededRandom(seed) * 20;
    const width = 0.5 + this.seededRandom(seed + 1) * 1.5;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(width, width, height, 6), this.materials.lightPillar);
    pillar.position.set(x, y + height / 2, z);
    group.add(pillar);
  }

  addCrystalTreeToChunk(group, x, y, z, seed) {
    const height = 2 + this.seededRandom(seed) * 4;
    const crystalGroup = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.ConeGeometry(0.5, height, 4), this.materials.crystalTree);
    trunk.position.y = height / 2;
    crystalGroup.add(trunk);
    crystalGroup.position.set(x, y, z);
    group.add(crystalGroup);
  }

  addTempleToChunk(group, x, y, z, name) {
    const templeGroup = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 18), this.materials.stone);
    templeGroup.add(base);

    // Restoration: Columns
    for (let cx = -5; cx <= 5; cx += 5) {
      for (let cz = -7; cz <= 7; cz += 7) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 8), this.materials.stone);
        col.position.set(cx, 3, cz);
        templeGroup.add(col);
      }
    }

    // Restoration: Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 4, 4), this.materials.stone);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 7.5;
    templeGroup.add(roof);

    templeGroup.position.set(x, y, z);
    group.add(templeGroup);
    this.structures.push({ x, z, name, type: 'temple' });
  }

  addCaveEntranceToChunk(group, x, y, z) {
    const caveGroup = new THREE.Group();
    const caveGeo = new THREE.SphereGeometry(4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const caveMat = new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const cave = new THREE.Mesh(caveGeo, caveMat);
    cave.scale.set(1, 0.5, 1);
    caveGroup.add(cave);
    caveGroup.position.set(x, y, z);
    group.add(caveGroup);
    this.structures.push({ x, z, name: "Core Entrance", type: 'cave' });
  }

  buildJungle() {
    this.clearLevel();
    console.log("Jungle Mode Initialized");
  }

  buildCrystalCore() {
    this.clearLevel();
    console.log("Core Mode Initialized");
  }

  createTree(x, y, z) {
    const height = 4 + Math.random() * 6;
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, height, 8), this.materials.bark);
    trunk.position.y = height / 2;
    group.add(trunk);
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + Math.random(), 0), this.materials.leaves);
    foliage.position.y = height - 1;
    group.add(foliage);
    group.position.set(x, y, z);
    this.scene.add(group);
    this.levelObjects.push(group);
  }

  createLightPillar(x, y, z) {
    const height = 10 + Math.random() * 20;
    const width = 0.5 + Math.random() * 1.5;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(width, width, height, 6), this.materials.lightPillar);
    pillar.position.set(x, y + height / 2, z);
    const light = new THREE.PointLight(0x00ffff, 2, 20);
    light.position.set(x, y + 5, z);
    this.scene.add(pillar);
    this.scene.add(light);
    this.levelObjects.push(pillar);
    this.levelObjects.push(light);
  }

  createCrystalTree(x, y, z) {
    const height = 2 + Math.random() * 4;
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.ConeGeometry(0.5, height, 4), this.materials.crystalTree);
    trunk.position.y = height / 2;
    group.add(trunk);
    for (let i = 0; i < 3; i++) {
      const branch = new THREE.Mesh(new THREE.ConeGeometry(0.2, 2, 4), this.materials.crystalTree);
      branch.position.y = height * 0.6;
      branch.rotation.z = (Math.random() - 0.5) * 2;
      branch.rotation.x = (Math.random() - 0.5) * 2;
      group.add(branch);
    }
    group.position.set(x, y, z);
    this.scene.add(group);
    this.levelObjects.push(group);
  }

  createCrystalArch(x, y, z, rotation) {
    const group = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4, 0, 0),
      new THREE.Vector3(-2, 4, 0),
      new THREE.Vector3(2, 4, 0),
      new THREE.Vector3(4, 0, 0)
    ]);
    const geometry = new THREE.TubeGeometry(curve, 20, 0.4, 8, false);
    const mesh = new THREE.Mesh(geometry, this.materials.crystalArch);
    group.add(mesh);
    group.position.set(x, y, z);
    group.rotation.y = rotation;
    this.scene.add(group);
    this.levelObjects.push(group);
  }

  createTemple(x, z, name) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 18), this.materials.stone);
    group.add(base);
    for (let cx = -5; cx <= 5; cx += 2.5) {
      for (let cz = -7; cz <= 7; cz += 3.5) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 8), this.materials.stone);
        col.position.set(cx, 3, cz);
        group.add(col);
      }
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 4, 4), this.materials.stone);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 7.5;
    group.add(roof);
    this.scene.add(group);
    this.levelObjects.push(group);
    this.structures.push({ x, z, name, type: 'temple' });
    return group;
  }

  createCaveEntrance(x, z) {
    const y = this.getJungleHeight(x, z);
    const group = new THREE.Group();
    const caveGeo = new THREE.SphereGeometry(4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const caveMat = new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const cave = new THREE.Mesh(caveGeo, caveMat);
    cave.scale.set(1, 0.5, 1);
    group.add(cave);
    group.position.set(x, y, z);
    this.scene.add(group);
    this.levelObjects.push(group);
    this.structures.push({ x, z, name: "Core Entrance", type: 'cave' });
  }
}
