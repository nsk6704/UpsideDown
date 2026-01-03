import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.materials = {};
    this.structures = [];
    this.levelObjects = [];
    this.loadMaterials();
    this.noiseScale = 0.05;
    this.heightScale = 8;
  }

  loadMaterials() {
    // Jungle
    this.materials.grass = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 1.0, map: this.createNoiseTexture(0x2d4c1e, 0x1a2e12) });
    this.materials.bark = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9, map: this.createNoiseTexture(0x3e2723, 0x281a17) });
    this.materials.leaves = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, side: THREE.DoubleSide });

    // Crystal Core (Bright & Magical)
    this.materials.coreGround = new THREE.MeshStandardMaterial({ color: 0xe0ffff, roughness: 0.4, metalness: 0.1, emissive: 0x004444, emissiveIntensity: 0.2 });
    this.materials.lightPillar = new THREE.MeshPhysicalMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.0, transparent: true, opacity: 0.8, transmission: 0.5 });
    this.materials.crystalTree = new THREE.MeshPhysicalMaterial({ color: 0xff00ff, emissive: 0x550055, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.1 });
    this.materials.crystalArch = new THREE.MeshPhysicalMaterial({ color: 0x0088ff, emissive: 0x002244, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.0, transmission: 0.2 });

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
    this.levelObjects.forEach(obj => this.scene.remove(obj));
    this.levelObjects = [];
    this.structures = [];
  }

  buildJungle() {
    this.clearLevel();
    console.log("Building Jungle...");

    const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);
    const posAttribute = geometry.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      const h = this.getJungleHeight(x, -y);
      posAttribute.setZ(i, h);
    }
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, this.materials.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.levelObjects.push(ground);

    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
      const y = this.getJungleHeight(x, z);
      this.createTree(x, y, z);
    }

    this.createTemple(30, 30, "Sun Temple");
    this.createTemple(-30, -30, "Moon Ruins");
    this.createCaveEntrance(0, -40);
  }

  buildCrystalCore() {
    this.clearLevel();
    console.log("Building Crystal Core...");

    // 1. Terrain (Flatter)
    const geometry = new THREE.PlaneGeometry(200, 200, 100, 100);
    const posAttribute = geometry.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      posAttribute.setZ(i, this.getCrystalHeight(x, -y));
    }
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, this.materials.coreGround);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.levelObjects.push(ground);

    // 2. Light Pillars
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      const y = this.getCrystalHeight(x, z);
      this.createLightPillar(x, y, z);
    }

    // 3. Crystal Trees
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * 190;
      const z = (Math.random() - 0.5) * 190;
      const y = this.getCrystalHeight(x, z);
      this.createCrystalTree(x, y, z);
    }

    // 4. Crystal Arches (New Feature)
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 160;
      const y = this.getCrystalHeight(x, z);
      this.createCrystalArch(x, y, z, Math.random() * Math.PI);
    }

    // 5. Structures
    this.createTemple(0, -20, "Core Sanctum");
    this.createTemple(-40, 40, "North Prism");
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
