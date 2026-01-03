import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.materials = {};
    this.structures = [];
    this.levelObjects = []; // Track objects for cleanup
    this.loadMaterials();
    this.noiseScale = 0.05;
    this.heightScale = 8;
  }

  loadMaterials() {
    // Jungle
    this.materials.grass = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 1.0, map: this.createNoiseTexture(0x2d4c1e, 0x1a2e12) });
    this.materials.bark = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9, map: this.createNoiseTexture(0x3e2723, 0x281a17) });
    this.materials.leaves = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, side: THREE.DoubleSide });

    // Subterranean
    this.materials.rockGround = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, map: this.createNoiseTexture(0x1a1a1a, 0x0d0d0d) });
    this.materials.mushroomCap = new THREE.MeshStandardMaterial({ color: 0x9933ff, emissive: 0x5500aa, emissiveIntensity: 0.8, roughness: 0.4 });
    this.materials.mushroomStem = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
    this.materials.crystal = new THREE.MeshPhysicalMaterial({ color: 0x00ffff, emissive: 0x004444, emissiveIntensity: 0.5, metalness: 0.1, roughness: 0.1, transmission: 0.6, thickness: 1.0 });

    // Shared
    this.materials.stone = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, map: this.createNoiseTexture(0x555555, 0x333333) });
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
    return Math.sin(x * this.noiseScale) * Math.cos(z * this.noiseScale) * this.heightScale
      + Math.sin(x * this.noiseScale * 2.5 + z) * 2
      + Math.cos(z * this.noiseScale * 3) * 2;
  }

  clearLevel() {
    this.levelObjects.forEach(obj => this.scene.remove(obj));
    this.levelObjects = [];
    this.structures = [];
  }

  buildJungle() {
    this.clearLevel();
    console.log("Building Jungle...");

    // 1. Ground
    const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);
    const posAttribute = geometry.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      // Flatter terrain for jungle
      const h = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2;
      posAttribute.setZ(i, h);
    }
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, this.materials.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.levelObjects.push(ground);

    // 2. Trees
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue; // Clear spawn
      this.createTree(x, 0, z);
    }

    // 3. Structures
    this.createTemple(30, 30, "Sun Temple");
    this.createTemple(-30, -30, "Moon Ruins");

    // 4. Cave Entrance
    this.createCaveEntrance(0, -40);
  }

  buildSubterranean() {
    this.clearLevel();
    console.log("Building Subterranean...");

    // 1. Terrain
    const geometry = new THREE.PlaneGeometry(200, 200, 100, 100);
    const posAttribute = geometry.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      posAttribute.setZ(i, this.getTerrainHeight(x, -y));
    }
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, this.materials.rockGround);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.levelObjects.push(ground);

    // 2. Flora
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      const y = this.getTerrainHeight(x, z);
      this.createMushroom(x, y, z);
    }
    for (let i = 0; i < 120; i++) {
      const x = (Math.random() - 0.5) * 190;
      const z = (Math.random() - 0.5) * 190;
      const y = this.getTerrainHeight(x, z);
      this.createCrystal(x, y, z);
    }

    // 3. Structures
    this.createTemple(0, -20, "Core Shrine");
    this.createTemple(-40, 40, "North Tomb");
    this.createTemple(40, -40, "South Spire");
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

  createMushroom(x, y, z) {
    const scale = 1 + Math.random() * 2;
    const group = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 3 * scale, 8), this.materials.mushroomStem);
    stem.position.y = 1.5 * scale;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.5 * scale, 1 * scale, 16, 1, true), this.materials.mushroomCap);
    cap.position.y = 3 * scale;
    const light = new THREE.PointLight(0x9933ff, 1, 10 * scale);
    light.position.y = 2 * scale;
    group.add(stem, cap, light);
    group.position.set(x, y, z);
    this.scene.add(group);
    this.levelObjects.push(group);
  }

  createCrystal(x, y, z) {
    const height = 0.5 + Math.random() * 1.5;
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.2, height, 4), this.materials.crystal);
    crystal.position.set(x, y + height / 2, z);
    crystal.rotation.x = (Math.random() - 0.5) * 0.5;
    crystal.rotation.z = (Math.random() - 0.5) * 0.5;
    this.scene.add(crystal);
    this.levelObjects.push(crystal);
  }

  createTemple(x, z, name) {
    // Height depends on level type, but we can approximate or pass it
    // For simplicity, we'll just raycast or use terrain func if available
    // Here we assume Y=0 for jungle, terrain func for sub
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

    // Position logic handled by caller usually, but we'll set it here
    // If jungle, Y is approx 0. If sub, use getTerrainHeight
    // We'll just set X/Z and let caller adjust Y or assume 0 for now
    group.position.set(x, 0, z);

    this.scene.add(group);
    this.levelObjects.push(group);
    this.structures.push({ x, z, name, type: 'temple' });
    return group;
  }

  createCaveEntrance(x, z) {
    const group = new THREE.Group();
    const caveGeo = new THREE.SphereGeometry(4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const caveMat = new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const cave = new THREE.Mesh(caveGeo, caveMat);
    cave.scale.set(1, 0.5, 1);
    group.add(cave);

    const textDiv = document.createElement('div'); // Just a marker logic

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.levelObjects.push(group);
    this.structures.push({ x, z, name: "Cave Entrance", type: 'cave' });
  }
}
