/**
 * Main 3D Game Engine for Coastal Highway Racing.
 * Manages Three.js scene, player vehicle, traffic AI, coin spawning, and collision loop.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPlayerCar, createTrafficCar, createCoin, CarParts } from './models';
import { RoadManager, LANE_WIDTH, LANE_POSITIONS } from './road';
import { sound } from './audio';

export type GameStatus = 'start' | 'playing' | 'paused' | 'gameover';

export interface GameStats {
  score: number;
  speedKmH: number;
  coins: number;
  distanceMeters: number;
  highScore: number;
}

interface TrafficEntity {
  car: CarParts;
  laneIndex: number;
  speed: number;
  z: number;
  x: number;
}

interface CoinEntity {
  group: THREE.Group;
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  laneIndex: number;
  x: number;
  z: number;
  collected: boolean;
  baseY: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private roadManager: RoadManager;
  private player: CarParts;
  
  // Game state
  private status: GameStatus = 'start';
  private score: number = 0;
  private coinsCount: number = 0;
  private distance: number = 0;
  private highScore: number = 0;
  private speedKmH: number = 100;
  private baseSpeed: number = 28; // ~100 km/h in m/s
  private currentForwardSpeed: number = 28;

  // Player motion
  private currentLane: number = 0; // -1: Left, 0: Center, 1: Right
  private playerX: number = 0;
  private playerTargetX: number = 0;
  private playerZ: number = 0;
  private playerRoll: number = 0;

  // Traffic & Coins
  private traffic: TrafficEntity[] = [];
  private coins: CoinEntity[] = [];
  private trafficSpawnTimer: number = 0;
  private coinSpawnTimer: number = 0;

  // Particle pool
  private particles: Particle[] = [];
  private particleGroup: THREE.Group;

  // Camera & Shake
  private cameraShake: number = 0;
  private hitstopTimer: number = 0;

  // Lights
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Animation frame
  private frameId: number = 0;
  private lastTime: number = 0;
  private isDestroyed: boolean = false;
  private isSoftwareGl: boolean = false;

  // Callbacks
  private onStatsUpdate?: (stats: GameStats) => void;
  private onStatusChange?: (status: GameStatus) => void;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onStatsUpdate?: (stats: GameStats) => void;
      onStatusChange?: (status: GameStatus) => void;
    }
  ) {
    this.container = container;
    this.onStatsUpdate = callbacks?.onStatsUpdate;
    this.onStatusChange = callbacks?.onStatusChange;

    const savedHigh = localStorage.getItem('coastal_racer_highscore');
    if (savedHigh) {
      this.highScore = parseInt(savedHigh, 10) || 0;
    }

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Setup Scene & Horizon Fog
    this.scene = new THREE.Scene();
    // Warm Mediterranean blue-sky atmosphere
    const skyColor = new THREE.Color(0x73bbf8);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x89c7f9, 0.008);

    // 3. Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 350);
    this.camera.position.set(0, 3.8, 7.5);
    this.camera.lookAt(0, 1.2, -15);

    // 4. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(this.renderer.domElement);

    // 5. Procedural Room Environment for PBR Reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Lighting Rig: Warm Sunlight + Cool Sky Fill
    this.hemiLight = new THREE.HemisphereLight(0x9bd8ff, 0xd49b5c, 1.4);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff3db, 2.2);
    this.dirLight.position.set(25, 45, 20);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 120;
    this.dirLight.shadow.camera.left = -20;
    this.dirLight.shadow.camera.right = 20;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -20;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    // 7. Road & Scenery
    this.roadManager = new RoadManager(this.scene);

    // 8. Player Red Supercar
    this.player = createPlayerCar();
    this.player.group.position.set(0, 0, 0);
    this.scene.add(this.player.group);

    // 9. Particle container
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    // Listeners
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);

    // Start render loop
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.frameId = requestAnimationFrame(this.tick);

    // Notify initial stats
    this.notifyStats();
  }

  // Handle window resizing
  private onWindowResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // Keyboard navigation
  private onKeyDown = (e: KeyboardEvent) => {
    if (this.status === 'start') {
      if (e.key === ' ' || e.key === 'Enter') {
        this.startGame();
        e.preventDefault();
      }
      return;
    }

    if (this.status === 'gameover') {
      if (e.key === ' ' || e.key === 'Enter') {
        this.restartGame();
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      this.togglePause();
      e.preventDefault();
      return;
    }

    if (this.status !== 'playing') return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.changeLane(-1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.changeLane(1);
      e.preventDefault();
    }
  };

  // Public Lane Control (used by mobile buttons and swipes)
  public changeLane(direction: -1 | 1) {
    if (this.status !== 'playing') return;
    const nextLane = this.currentLane + direction;
    if (nextLane >= -1 && nextLane <= 1) {
      this.currentLane = nextLane;
      this.playerTargetX = this.currentLane * LANE_WIDTH;
      sound.playLaneSwitch();
    }
  }

  // Public Start Game
  public startGame() {
    this.status = 'playing';
    this.score = 0;
    this.coinsCount = 0;
    this.distance = 0;
    this.speedKmH = 100;
    this.currentForwardSpeed = 28;
    this.currentLane = 0;
    this.playerX = 0;
    this.playerTargetX = 0;
    this.playerZ = 0;
    this.playerRoll = 0;
    this.hitstopTimer = 0;
    this.cameraShake = 0;

    this.clearTraffic();
    this.clearCoins();
    this.clearParticles();
    this.roadManager.reset();

    // Initial traffic ahead
    this.spawnInitialObstacles();

    sound.startEngine();
    this.onStatusChange?.(this.status);
    this.notifyStats();
  }

  // Public Toggle Pause
  public togglePause() {
    if (this.status === 'playing') {
      this.status = 'paused';
      sound.stopEngine();
      this.onStatusChange?.(this.status);
    } else if (this.status === 'paused') {
      this.status = 'playing';
      sound.startEngine();
      this.onStatusChange?.(this.status);
    }
  }

  // Public Restart Game
  public restartGame() {
    this.startGame();
  }

  private notifyStats() {
    this.onStatsUpdate?.({
      score: Math.floor(this.score),
      speedKmH: Math.round(this.speedKmH),
      coins: this.coinsCount,
      distanceMeters: Math.floor(this.distance),
      highScore: this.highScore,
    });
  }

  private spawnInitialObstacles() {
    // Spawn 2 traffic cars at safe distances ahead
    this.spawnTrafficAt(-50, -1);
    this.spawnTrafficAt(-85, 1);
    // Spawn coin group
    this.spawnCoinGroupAt(-30, 0, 4);
    this.spawnCoinGroupAt(-65, -1, 4);
  }

  private spawnTrafficAt(z: number, laneIndex: number) {
    const colors = [0x1a68e8, 0xf5ba18, 0x14a768, 0xfa6400, 0x9333ea, 0xdfe6e9];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const car = createTrafficCar(color);
    const x = laneIndex * LANE_WIDTH;

    car.group.position.set(x, 0, z);
    this.scene.add(car.group);

    // Traffic cruising speed relative to player
    const trafficSpeed = 16 + Math.random() * 6; // ~60-80 km/h

    this.traffic.push({
      car,
      laneIndex,
      speed: trafficSpeed,
      z,
      x,
    });
  }

  private spawnCoinGroupAt(startZ: number, laneIndex: number, count: number) {
    const x = laneIndex * LANE_WIDTH;
    for (let i = 0; i < count; i++) {
      const z = startZ - i * 3.2;
      const coinData = createCoin();
      coinData.group.position.set(x, 0, z);
      this.scene.add(coinData.group);

      this.coins.push({
        group: coinData.group,
        mesh: coinData.mesh,
        shadow: coinData.shadow,
        laneIndex,
        x,
        z,
        collected: false,
        baseY: 0.65,
      });
    }
  }

  private clearTraffic() {
    this.traffic.forEach((t) => {
      this.scene.remove(t.car.group);
    });
    this.traffic = [];
  }

  private clearCoins() {
    this.coins.forEach((c) => {
      this.scene.remove(c.group);
    });
    this.coins = [];
  }

  private clearParticles() {
    this.particles.forEach((p) => {
      this.particleGroup.remove(p.mesh);
    });
    this.particles = [];
  }

  private emitCoinParticles(x: number, y: number, z: number) {
    const pGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffe033 });

    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.set(x, y, z);
      this.particleGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        1.5 + Math.random() * 3,
        Math.sin(angle) * speed
      );

      this.particles.push({
        mesh,
        vel,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
      });
    }
  }

  private emitCrashParticles(x: number, y: number, z: number) {
    const sparkGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff4411 });
    const smokeGeo = new THREE.DodecahedronGeometry(0.35, 0);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 30; i++) {
      const isSmoke = i % 2 === 0;
      const mesh = new THREE.Mesh(isSmoke ? smokeGeo : sparkGeo, isSmoke ? smokeMat : sparkMat);
      mesh.position.set(x + (Math.random() - 0.5), y + 0.5, z + (Math.random() - 0.5));
      this.particleGroup.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        2 + Math.random() * 7,
        (Math.random() - 0.5) * 8
      );

      this.particles.push({
        mesh,
        vel,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
      });
    }
  }

  private triggerCrash() {
    this.status = 'gameover';
    this.hitstopTimer = 0.05; // 50ms hitstop
    this.cameraShake = 0.8;
    sound.stopEngine();
    sound.playCrash();

    // Check high score
    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem('coastal_racer_highscore', String(this.highScore));
    }

    this.emitCrashParticles(this.playerX, 0.5, this.playerZ);

    this.onStatusChange?.(this.status);
    this.notifyStats();
  }

  // Main Loop
  private tick = (currentTime: number) => {
    if (this.isDestroyed) return;

    const rawDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const delta = Math.min(rawDelta, 0.05);

    // Hitstop handling on heavy impact
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.renderer.render(this.scene, this.camera);
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }

    if (this.status === 'playing') {
      this.updateSimulation(delta);
    } else if (this.status === 'start' || this.status === 'gameover') {
      // Idle gentle bob and slow drift for attractive visual preview
      const t = currentTime * 0.001;
      this.player.group.position.y = Math.sin(t * 3) * 0.02;
    }

    // Camera follow with dynamic damping & shake
    this.updateCamera(delta);

    // Update particles
    this.updateParticles(delta);

    // Render scene
    this.renderer.render(this.scene, this.camera);

    this.frameId = requestAnimationFrame(this.tick);
  };

  private updateSimulation(delta: number) {
    // 1. Difficulty Ramp: Speed increases smoothly over distance
    // Starts at 100 km/h (~27.8 m/s), scales up to 180+ km/h
    this.distance += this.currentForwardSpeed * delta;
    const speedRatio = Math.min(this.distance / 1200, 1.0); // 1200 meters to max speed
    this.speedKmH = 100 + speedRatio * 80; // 100 km/h to 180 km/h
    this.currentForwardSpeed = this.speedKmH / 3.6;

    // Score increases with distance traveled + points
    this.score += (this.currentForwardSpeed * delta) * 1.5;

    // Update sound engine pitch
    sound.updateEngine(this.speedKmH);

    // 2. Move player along -Z axis
    this.playerZ -= this.currentForwardSpeed * delta;

    // 3. Smooth lane transition with spring damping
    const xDiff = this.playerTargetX - this.playerX;
    this.playerX += xDiff * Math.min(1, delta * 9);

    // Banking tilt / roll into turns
    const targetRoll = -xDiff * 0.12;
    this.playerRoll += (targetRoll - this.playerRoll) * Math.min(1, delta * 10);

    this.player.group.position.set(this.playerX, 0, this.playerZ);
    this.player.group.rotation.y = -xDiff * 0.08;
    this.player.group.rotation.z = this.playerRoll;

    // Spin player wheels
    const wheelRot = this.currentForwardSpeed * delta * 3.5;
    this.player.wheels.forEach((w) => {
      w.rotation.x -= wheelRot;
    });

    // 4. Update directional light tracking
    this.dirLight.position.set(this.playerX + 25, 45, this.playerZ + 20);
    this.dirLight.target.position.set(this.playerX, 0, this.playerZ - 10);
    this.dirLight.target.updateMatrixWorld();

    // 5. Update Road chunks & ocean scenery
    this.roadManager.update(this.playerZ, delta);

    // 6. Spawn traffic & coins
    this.updateSpawners(delta);

    // 7. Update Traffic AI & check collisions
    this.updateTraffic(delta);

    // 8. Update Coins & check pickup
    this.updateCoins(delta);

    // 9. Emit stats update periodically
    this.notifyStats();
  }

  private updateSpawners(delta: number) {
    this.trafficSpawnTimer += delta;
    this.coinSpawnTimer += delta;

    // Traffic spawn frequency scales with speed
    const trafficInterval = Math.max(1.3, 2.6 - (this.speedKmH - 100) * 0.012);
    if (this.trafficSpawnTimer > trafficInterval) {
      this.trafficSpawnTimer = 0;

      // Pick a random lane, but make sure not all 3 lanes are blocked in close proximity
      const availableLanes = [-1, 0, 1];
      // Check which lanes have a car within 30m of spawn point
      const spawnZ = this.playerZ - 120;
      const blockedLanes = new Set(
        this.traffic
          .filter((t) => Math.abs(t.z - spawnZ) < 28)
          .map((t) => t.laneIndex)
      );

      const openLanes = availableLanes.filter((l) => !blockedLanes.has(l));
      if (openLanes.length > 0) {
        const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
        this.spawnTrafficAt(spawnZ, lane);
      }
    }

    // Coin pattern spawn
    if (this.coinSpawnTimer > 3.0) {
      this.coinSpawnTimer = 0;
      const coinLane = Math.floor(Math.random() * 3) - 1;
      const spawnZ = this.playerZ - 90;
      const count = 3 + Math.floor(Math.random() * 3);
      this.spawnCoinGroupAt(spawnZ, coinLane, count);
    }
  }

  private updateTraffic(delta: number) {
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const entity = this.traffic[i];
      // Traffic drives forward in -Z direction
      entity.z -= entity.speed * delta;
      entity.car.group.position.z = entity.z;

      // Spin wheels
      entity.car.wheels.forEach((w) => {
        w.rotation.x -= entity.speed * delta * 3.5;
      });

      // Collision detection with player
      const dx = Math.abs(this.playerX - entity.x);
      const dz = Math.abs(this.playerZ - entity.z);

      if (dx < 1.35 && dz < 3.2) {
        // Impact!
        this.triggerCrash();
        return;
      }

      // Despawn traffic when far behind player (player has overtaken them)
      if (entity.z > this.playerZ + 35) {
        this.scene.remove(entity.car.group);
        this.traffic.splice(i, 1);
        // Bonus points for clean overtaking!
        this.score += 25;
      }
    }
  }

  private updateCoins(delta: number) {
    const time = performance.now() * 0.004;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];

      // Spin coin continuously
      coin.mesh.rotation.z += delta * 4.0;
      // Gentle vertical hover bob
      coin.mesh.position.y = coin.baseY + Math.sin(time + coin.z) * 0.12;

      // Check pickup with player
      const dx = Math.abs(this.playerX - coin.x);
      const dz = Math.abs(this.playerZ - coin.z);

      if (!coin.collected && dx < 1.4 && dz < 1.8) {
        coin.collected = true;
        this.coinsCount++;
        this.score += 50; // +50 points per coin
        sound.playCoin();
        this.emitCoinParticles(coin.x, coin.mesh.position.y, coin.z);
        this.scene.remove(coin.group);
        this.coins.splice(i, 1);
        continue;
      }

      // Despawn if passed
      if (coin.z > this.playerZ + 20) {
        this.scene.remove(coin.group);
        this.coins.splice(i, 1);
      }
    }
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= 9.8 * delta; // Gravity

      const scale = 1 - p.life / p.maxLife;
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  private updateCamera(delta: number) {
    // Camera smoothly follows player with subtle offset
    const targetCamX = this.playerX * 0.35;
    const targetCamY = 3.6;
    const targetCamZ = this.playerZ + 7.4;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, delta * 12);
    this.camera.position.y = targetCamY;
    this.camera.position.z = targetCamZ;

    // Apply camera shake if any
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);
    }

    // Look at point ahead on the highway
    this.camera.lookAt(this.playerX * 0.25, 1.1, this.playerZ - 14);
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    sound.stopEngine();

    this.clearTraffic();
    this.clearCoins();
    this.clearParticles();
    this.roadManager.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
