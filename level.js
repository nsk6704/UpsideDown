import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { CONFIG } from './config.js';

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.materials = {};
    this.loadMaterials();
  }

  loadMaterials() {
    // Create procedural textures if external textures aren't available
    this.materials.wall = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.8,
      metalness: 0.1,
      map: this.createBrickTexture()
    });

    this.materials.floor = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.0,
      map: this.createFloorTexture()
    });

    this.materials.ceiling = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.7,
      metalness: 0.2
    });

    this.materials.woodDoor = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1,
      map: this.createWoodTexture()
    });

    this.materials.lockedDoor = new THREE.MeshStandardMaterial({
      color: 0x660000,
      emissive: 0x330000,
      emissiveIntensity: 0.3,
      roughness: 0.7,
      metalness: 0.1
    });
  }

  createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw bricks
    const brickWidth = 64;
    const brickHeight = 32;
    const mortarSize = 2;
    
    ctx.fillStyle = '#2a2a2a';
    for (let y = 0; y < 512; y += brickHeight) {
      for (let x = 0; x < 512; x += brickWidth) {
        const offset = (y / brickHeight) % 2 === 0 ? 0 : brickWidth / 2;
        ctx.fillRect(x + offset, y, brickWidth - mortarSize, brickHeight - mortarSize);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base dark floor
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise/dirt
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3;
      ctx.fillStyle = `rgba(${Math.random() * 50}, ${Math.random() * 50}, ${Math.random() * 50}, 0.3)`;
      ctx.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Wood grain
    ctx.fillStyle = '#6b3410';
    ctx.fillRect(0, 0, 256, 256);
    
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(50, 20, 5, ${Math.random() * 0.3})`;
      ctx.lineWidth = Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * 256);
      ctx.lineTo(256, Math.random() * 256);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  buildCorridor(startX, startZ, length, direction = 'z', width = 4) {
    const segments = Math.floor(length / 4);
    const objects = [];
    
    for (let i = 0; i < segments; i++) {
      const x = direction === 'x' ? startX + i * 4 : startX;
      const z = direction === 'z' ? startZ - i * 4 : startZ;
      
      const segment = this.createCorridorSegment(x, z, width);
      objects.push(...segment);
    }
    
    return objects;
  }

  createCorridorSegment(x, z, width = 4) {
    const objects = [];
    
    // Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, 4),
      this.materials.floor
    );
    floor.position.set(x, 0, z);
    floor.receiveShadow = true;
    this.scene.add(floor);
    objects.push(floor);
    
    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3, 4),
      this.materials.wall
    );
    leftWall.position.set(x - width/2, 1.5, z);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    objects.push(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3, 4),
      this.materials.wall
    );
    rightWall.position.set(x + width/2, 1.5, z);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
    objects.push(rightWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, 4),
      this.materials.ceiling
    );
    ceiling.position.set(x, 3, z);
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
    objects.push(ceiling);
    
    return objects;
  }

  createRoom(x, z, width, depth) {
    const objects = [];
    
    // Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, depth),
      this.materials.floor
    );
    floor.position.set(x, 0, z);
    floor.receiveShadow = true;
    this.scene.add(floor);
    objects.push(floor);
    
    // Walls
    const walls = [
      { pos: [x - width/2, 1.5, z], size: [0.2, 3, depth] },
      { pos: [x + width/2, 1.5, z], size: [0.2, 3, depth] },
      { pos: [x, 1.5, z - depth/2], size: [width, 3, 0.2] },
      { pos: [x, 1.5, z + depth/2], size: [width, 3, 0.2] }
    ];
    
    walls.forEach(wall => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...wall.size),
        this.materials.wall
      );
      mesh.position.set(...wall.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      objects.push(mesh);
    });
    
    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, depth),
      this.materials.ceiling
    );
    ceiling.position.set(x, 3, z);
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
    objects.push(ceiling);
    
    return objects;
  }

  createDoorway(x, z, rotation = 0) {
    // Remove section of wall for doorway
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.8, 0.2),
      new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0 
      })
    );
    doorFrame.position.set(x, 1.4, z);
    doorFrame.rotation.y = rotation;
    this.scene.add(doorFrame);
    
    return doorFrame;
  }

  // Build complex multi-corridor level
  buildComplexLevel() {
    const objects = [];
    
    // Main corridor (starting area)
    objects.push(...this.buildCorridor(0, 5, 40, 'z'));
    
    // Right branch at -20
    objects.push(...this.buildCorridor(2, -20, 24, 'x'));
    
    // Left branch at -32
    objects.push(...this.buildCorridor(-2, -32, 24, 'x'));
    
    // Large room at end of right branch
    objects.push(...this.createRoom(20, -20, 10, 10));
    
    // Large room at end of left branch
    objects.push(...this.createRoom(-20, -32, 10, 10));
    
    // Final corridor to exit
    objects.push(...this.buildCorridor(0, -45, 20, 'z'));
    
    // Side rooms
    objects.push(...this.createRoom(-8, -15, 6, 6));
    objects.push(...this.createRoom(8, -28, 6, 6));
    
    return objects;
  }

  addProp(type, x, y, z) {
    let mesh;
    
    switch(type) {
      case 'crate':
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
        );
        break;
      case 'barrel':
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 0.8, 12),
          new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 })
        );
        break;
      case 'pillar':
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 3, 8),
          this.materials.wall
        );
        break;
    }
    
    if (mesh) {
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      return mesh;
    }
  }
}
