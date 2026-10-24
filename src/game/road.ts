/**
 * Procedural coastal highway road chunk and scenery manager.
 * Creates an endless 3-lane coastal road with ocean on the right, cliffs on the left,
 * roadside trees (palms & coastal pines), coastal lighthouse with rotating beacon, and seaside rocks.
 */

import * as THREE from 'three';
import {
  createPalmTree,
  createPineTree,
  createCliffRock,
  createWarningSign,
  createGuardrailSegment,
  createLighthouse,
  createSailboat,
  createHighwayLamp,
  createCoastalBushes,
  createBeachFence,
} from './models';

export const LANE_WIDTH = 2.4;
export const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH] as const;
export const ROAD_WIDTH = 8.2;
export const CHUNK_LENGTH = 60;
export const TOTAL_CHUNKS = 6;

// Procedural road asphalt texture with crisp painted lane markings
function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#22252c';
  ctx.fillRect(0, 0, 512, 1024);

  // Subtle asphalt grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Solid outer border lines (Left & Right)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(20, 0, 10, 1024);
  ctx.fillRect(482, 0, 10, 1024);

  // Dashed lines between lanes (2 dividers for 3 lanes)
  const dashLength = 80;
  const gapLength = 65;
  const totalPeriod = dashLength + gapLength;

  const div1X = 174;
  const div2X = 338;

  for (let y = 0; y < 1024; y += totalPeriod) {
    ctx.fillRect(div1X, y, 9, dashLength);
    ctx.fillRect(div2X, y, 9, dashLength);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural sand beach texture
function createSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e2be86'; // Warm coastal beach sand
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#d4af78' : '#ebd09e';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Procedural cliff grass/rock texture
function createCliffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5f6f4e'; // Mediterranean dry grass
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#4b573c' : '#7b8764';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Roadside reflector bollard
function createReflectorPost(isLeft: boolean): THREE.Group {
  const post = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  const capMat = new THREE.MeshBasicMaterial({ color: isLeft ? 0xffffff : 0xff7700 });

  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
  const poleMesh = new THREE.Mesh(poleGeo, poleMat);
  poleMesh.position.y = 0.45;
  post.add(poleMesh);

  const capGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.y = 0.8;
  post.add(capMesh);

  return post;
}

export interface RoadChunk {
  group: THREE.Group;
  zCenter: number;
}

export class RoadManager {
  private scene: THREE.Scene;
  private chunks: RoadChunk[] = [];
  private roadMaterial: THREE.MeshStandardMaterial;
  private sandMaterial: THREE.MeshStandardMaterial;
  private cliffMaterial: THREE.MeshStandardMaterial;
  private oceanMesh: THREE.Mesh;
  private oceanMaterial: THREE.MeshStandardMaterial;
  private lighthouse: THREE.Group;
  private lighthouseSecondary: THREE.Group;
  private sailboat: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const roadTex = createRoadTexture();
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.55,
      metalness: 0.1,
    });

    const sandTex = createSandTexture();
    this.sandMaterial = new THREE.MeshStandardMaterial({
      map: sandTex,
      roughness: 0.9,
      metalness: 0.05,
    });

    const cliffTex = createCliffTexture();
    this.cliffMaterial = new THREE.MeshStandardMaterial({
      map: cliffTex,
      roughness: 0.95,
      metalness: 0.05,
    });

    // Mediterranean Ocean plane on the right side
    const oceanGeo = new THREE.PlaneGeometry(180, 420, 32, 32);
    this.oceanMaterial = new THREE.MeshStandardMaterial({
      color: 0x0ca6d4, // Vibrant turquoise Mediterranean blue
      roughness: 0.15,
      metalness: 0.45,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, this.oceanMaterial);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(75, -0.6, -100);
    this.scene.add(this.oceanMesh);

    // Primary coastal lighthouse on rocky promontory
    this.lighthouse = createLighthouse();
    this.lighthouse.position.set(48, -0.2, -180);
    this.scene.add(this.lighthouse);

    // Secondary coastal lighthouse further ahead for richer horizon
    this.lighthouseSecondary = createLighthouse();
    this.lighthouseSecondary.scale.set(0.85, 0.85, 0.85);
    this.lighthouseSecondary.position.set(38, -0.3, -380);
    this.scene.add(this.lighthouseSecondary);

    // Distant landmark: White sailboat
    this.sailboat = createSailboat();
    this.sailboat.position.set(65, -0.5, -90);
    this.scene.add(this.sailboat);

    // Initialize initial sequence of road chunks
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      const zCenter = -i * CHUNK_LENGTH + CHUNK_LENGTH;
      const chunk = this.buildChunk(zCenter, i);
      this.chunks.push(chunk);
      this.scene.add(chunk.group);
    }
  }

  private buildChunk(zCenter: number, chunkIndex: number): RoadChunk {
    const group = new THREE.Group();
    group.position.z = zCenter;

    // 1. Road asphalt strip (centered at x = 0, y = 0)
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
    const road = new THREE.Mesh(roadGeo, this.roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    group.add(road);

    // 2. Guardrails (Left at -4.1, Right at +4.1)
    const leftRail = createGuardrailSegment(CHUNK_LENGTH);
    leftRail.position.x = -ROAD_WIDTH / 2 - 0.1;
    group.add(leftRail);

    const rightRail = createGuardrailSegment(CHUNK_LENGTH);
    rightRail.position.x = ROAD_WIDTH / 2 + 0.1;
    rightRail.rotation.y = Math.PI;
    group.add(rightRail);

    // 3. Roadside Reflector Bollards (Every 10m along both edges)
    for (let zOffset = -CHUNK_LENGTH / 2 + 5; zOffset < CHUNK_LENGTH / 2; zOffset += 12) {
      const leftPost = createReflectorPost(true);
      leftPost.position.set(-ROAD_WIDTH / 2 - 0.18, 0, zOffset);
      group.add(leftPost);

      const rightPost = createReflectorPost(false);
      rightPost.position.set(ROAD_WIDTH / 2 + 0.18, 0, zOffset);
      group.add(rightPost);
    }

    // 4. Left Hill & Cliff Slopes (Mountain side)
    const hillGeo = new THREE.PlaneGeometry(32, CHUNK_LENGTH, 8, 8);
    const hillPos = hillGeo.attributes.position;
    for (let i = 0; i < hillPos.count; i++) {
      const x = hillPos.getX(i);
      const distFromRoad = Math.abs(x - 16);
      const elevation = Math.pow(distFromRoad / 32, 1.4) * 14 + Math.sin(x * 0.45) * 1.5;
      hillPos.setZ(i, elevation);
    }
    hillGeo.computeVertexNormals();

    const hill = new THREE.Mesh(hillGeo, this.cliffMaterial);
    hill.rotation.x = -Math.PI / 2;
    hill.position.set(-ROAD_WIDTH / 2 - 16, 0, 0);
    hill.receiveShadow = true;
    group.add(hill);

    // 5. Right Beach Sand Strip
    const beachGeo = new THREE.PlaneGeometry(20, CHUNK_LENGTH);
    const beach = new THREE.Mesh(beachGeo, this.sandMaterial);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(ROAD_WIDTH / 2 + 10, -0.15, 0);
    beach.receiveShadow = true;
    group.add(beach);

    // 6. Roadside Trees (Palms & Mediterranean Pines)
    // Left verge trees
    const treePositionsLeft = [
      -CHUNK_LENGTH * 0.4,
      -CHUNK_LENGTH * 0.15,
      CHUNK_LENGTH * 0.2,
      CHUNK_LENGTH * 0.42,
    ];
    treePositionsLeft.forEach((zOffset, idx) => {
      // Alternate between majestic Coastal Pine and Palm tree
      const isPine = (idx + chunkIndex) % 2 === 0;
      const tree = isPine ? createPineTree() : createPalmTree();
      tree.position.set(-ROAD_WIDTH / 2 - 3.4 - Math.random() * 3.5, 0.4, zOffset);
      const scale = 0.85 + Math.random() * 0.35;
      tree.scale.set(scale, scale, scale);
      group.add(tree);
    });

    // Left rocks / boulders along mountain slope
    const rockPositions = [
      -CHUNK_LENGTH * 0.45,
      -CHUNK_LENGTH * 0.25,
      CHUNK_LENGTH * 0.05,
      CHUNK_LENGTH * 0.35,
    ];
    rockPositions.forEach((zOffset) => {
      const rock = createCliffRock();
      rock.position.set(-ROAD_WIDTH / 2 - 2.8 - Math.random() * 4, 0.5, zOffset);
      group.add(rock);
    });

    // Chevron warning signs
    if (chunkIndex % 2 === 0) {
      const sign = createWarningSign();
      sign.position.set(-ROAD_WIDTH / 2 - 0.7, 0, CHUNK_LENGTH * 0.1);
      group.add(sign);
    }

    // Right side: Coastal palms and beach boulders
    const treePositionsRight = [
      -CHUNK_LENGTH * 0.35,
      -CHUNK_LENGTH * 0.05,
      CHUNK_LENGTH * 0.3,
    ];
    treePositionsRight.forEach((zOffset, idx) => {
      const isPine = (idx + chunkIndex) % 3 === 0;
      const tree = isPine ? createPineTree() : createPalmTree();
      tree.position.set(ROAD_WIDTH / 2 + 4.2 + Math.random() * 3.8, -0.1, zOffset);
      const scale = 0.9 + Math.random() * 0.35;
      tree.scale.set(scale, scale, scale);
      group.add(tree);
    });

    // Right beach rocks
    const beachRockOffsets = [-CHUNK_LENGTH * 0.28, CHUNK_LENGTH * 0.18];
    beachRockOffsets.forEach((zOffset) => {
      const rock = createCliffRock();
      rock.position.set(ROAD_WIDTH / 2 + 3.8 + Math.random() * 3.2, 0.2, zOffset);
      rock.scale.set(0.9, 0.9, 0.9);
      group.add(rock);
    });

    // 7. Coastal Highway Lamps (Every chunk, alternating left/right for scenic rhythm)
    const lampIsLeft = chunkIndex % 2 === 0;
    const lamp = createHighwayLamp(lampIsLeft);
    const lampX = lampIsLeft ? -ROAD_WIDTH / 2 - 0.7 : ROAD_WIDTH / 2 + 0.7;
    lamp.position.set(lampX, 0, (chunkIndex % 3 === 0 ? -12 : 12));
    group.add(lamp);

    // 8. Mediterranean Flower Bushes (Bougainvillea / Coastal shrubbery)
    const bushZOffsets = [-CHUNK_LENGTH * 0.38, -CHUNK_LENGTH * 0.08, CHUNK_LENGTH * 0.25];
    bushZOffsets.forEach((zOff) => {
      const bush = createCoastalBushes();
      bush.position.set(-ROAD_WIDTH / 2 - 1.8 - Math.random() * 1.5, 0.2, zOff);
      group.add(bush);
    });

    // 9. Seaside Scenic Wooden Post & Rail Fence (On the beach side)
    const fence = createBeachFence(CHUNK_LENGTH * 0.75);
    fence.position.set(ROAD_WIDTH / 2 + 1.2, 0, 0);
    group.add(fence);

    return { group, zCenter };
  }

  public getOceanMaterial(): THREE.MeshStandardMaterial {
    return this.oceanMaterial;
  }

  public update(playerZ: number, delta: number, speedKmH: number = 100) {
    // Ocean wave animation for specular sun glints
    if (this.oceanMesh) {
      this.oceanMesh.position.z = playerZ - 100;
      const pos = (this.oceanMesh.geometry as THREE.BufferGeometry).attributes.position;
      const time = Date.now() * 0.002;
      for (let i = 0; i < pos.count; i += 2) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const wave = Math.sin(vx * 0.12 + time * 2.0) * 0.28 + Math.cos(vy * 0.06 + time * 1.5) * 0.22;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      (this.oceanMesh.geometry as THREE.BufferGeometry).computeVertexNormals();
    }

    // Keep sailboat drifting gracefully
    if (this.sailboat) {
      this.sailboat.position.z = playerZ - 80 + Math.sin(playerZ * 0.01) * 10;
      this.sailboat.rotation.z = Math.sin(Date.now() * 0.002) * 0.06;
      this.sailboat.position.y = -0.5 + Math.sin(Date.now() * 0.002) * 0.1;
    }

    // Spin lighthouse beacons (faster speed when player rushes)
    const spinRate = (2.0 + (speedKmH / 120)) * delta;
    if (this.lighthouse) {
      const beacon = this.lighthouse.getObjectByName('beacon');
      if (beacon) beacon.rotation.y += spinRate;

      // Recycle primary lighthouse ahead when passed
      if (this.lighthouse.position.z > playerZ + 45) {
        this.lighthouse.position.z = playerZ - 260 - Math.random() * 40;
        this.lighthouse.position.x = 45 + (Math.random() - 0.5) * 12;
      }
    }

    if (this.lighthouseSecondary) {
      const beacon = this.lighthouseSecondary.getObjectByName('beacon');
      if (beacon) beacon.rotation.y += spinRate * 1.2;

      // Recycle secondary lighthouse
      if (this.lighthouseSecondary.position.z > playerZ + 45) {
        this.lighthouseSecondary.position.z = playerZ - 420 - Math.random() * 50;
        this.lighthouseSecondary.position.x = 38 + (Math.random() - 0.5) * 10;
      }
    }

    // Find the furthest chunk ahead
    let minZ = Infinity;
    this.chunks.forEach((chunk) => {
      if (chunk.zCenter < minZ) minZ = chunk.zCenter;
    });

    // Check if any chunk is far behind the player (player moves in -Z direction)
    const recycleThreshold = playerZ + CHUNK_LENGTH * 1.5;
    this.chunks.forEach((chunk) => {
      if (chunk.zCenter > recycleThreshold) {
        // Recycle to the front
        const newZ = minZ - CHUNK_LENGTH;
        chunk.zCenter = newZ;
        chunk.group.position.z = newZ;
        minZ = newZ;
      }
    });
  }

  public reset() {
    for (let i = 0; i < this.chunks.length; i++) {
      const zCenter = -i * CHUNK_LENGTH + CHUNK_LENGTH;
      this.chunks[i].zCenter = zCenter;
      this.chunks[i].group.position.z = zCenter;
    }
    if (this.lighthouse) {
      this.lighthouse.position.set(48, -0.2, -180);
    }
    if (this.lighthouseSecondary) {
      this.lighthouseSecondary.position.set(38, -0.3, -380);
    }
    if (this.sailboat) {
      this.sailboat.position.set(65, -0.5, -90);
    }
  }

  public dispose() {
    this.chunks.forEach((c) => {
      this.scene.remove(c.group);
    });
    this.scene.remove(this.oceanMesh);
    this.scene.remove(this.lighthouse);
    this.scene.remove(this.lighthouseSecondary);
    this.scene.remove(this.sailboat);
  }
}
