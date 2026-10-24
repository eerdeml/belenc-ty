/**
 * Main 3D Game Engine for Coastal Highway Racing.
 * Manages Three.js scene, player vehicle, traffic AI, coin spawning, and collision loop.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createPlayerCar,
  createTrafficCar,
  createTrafficTruck,
  createTrafficBus,
  createTrafficSUV,
  createCoin,
  createMagnetModel,
  createNitroModel,
  CarParts,
} from './models';
import { RoadManager, LANE_WIDTH, LANE_POSITIONS } from './road';
import { sound } from './audio';
import { synthwaveBgm } from './synthwaveBgm';
import { WeatherSystem, WeatherMode } from './weather';
import { saveScoreToLeaderboard } from './leaderboard';
import { achievements, Achievement } from './achievements';
import { getEquippedCar, addBankCoins, getBankCoins, CarDefinition } from './cars';

export type GameStatus = 'start' | 'playing' | 'paused' | 'gameover';
export type PowerUpType = 'magnet' | 'boost';
export type TrafficVehicleType = 'car' | 'suv' | 'truck' | 'bus';

export interface ActivePowerUp {
  type: PowerUpType;
  remaining: number;
  total: number;
}

export interface RunTimelinePoint {
  distance: number;
  difficulty: number; // 0 - 100%
  speed: number;      // km/h
}

export interface GameStats {
  score: number;
  speedKmH: number;
  coins: number;
  bankCoins: number;
  distanceMeters: number;
  highScore: number;
  weatherMode: WeatherMode;
  isAutoWeather: boolean;
  activePowerUps: ActivePowerUp[];
  lastRunId?: string;
  equippedCar: CarDefinition;
  lastCrashedVehicleType?: TrafficVehicleType;
  runTimeline?: RunTimelinePoint[];
}

interface PowerUpItem {
  type: PowerUpType;
  group: THREE.Group;
  mesh: THREE.Group;
  shadow: THREE.Mesh;
  laneIndex: number;
  x: number;
  z: number;
  collected: boolean;
}

interface TrafficEntity {
  car: CarParts;
  vehicleType: TrafficVehicleType;
  laneIndex: number;
  speed: number;
  z: number;
  x: number;
  length: number;
  width: number;
  nearMissTriggered?: boolean;
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

interface SkidmarkSegment {
  mesh: THREE.Mesh;
  opacity: number;
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
  private lastRunId: string = '';

  // Player motion
  private currentLane: number = 0; // -1: Left, 0: Center, 1: Right
  private playerX: number = 0;
  private playerTargetX: number = 0;
  private playerZ: number = 0;
  private playerRoll: number = 0;

  // Traffic, Coins & Power-ups
  private traffic: TrafficEntity[] = [];
  private coins: CoinEntity[] = [];
  private powerUps: PowerUpItem[] = [];
  private trafficSpawnTimer: number = 0;
  private coinSpawnTimer: number = 0;
  private powerUpSpawnTimer: number = 0;

  // Active Power-up Durations
  private magnetTimer: number = 0;
  private boostTimer: number = 0;
  private readonly magnetDuration: number = 9.0;
  private readonly boostDuration: number = 6.5;

  // Visual vehicle attachments
  private playerShieldMesh!: THREE.Mesh;
  private nitroFlames: THREE.Mesh[] = [];

  // Particle pool
  private particles: Particle[] = [];
  private particleGroup: THREE.Group;

  // Skidmark Decals
  private skidmarks: SkidmarkSegment[] = [];
  private skidmarkGroup: THREE.Group;
  private lastSkidZ: number = 0;

  // Camera & Shake
  private cameraShake: number = 0;
  private hitstopTimer: number = 0;

  // Lights & Atmosphere
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private weather: WeatherSystem;

  // Animation frame
  private frameId: number = 0;
  private lastTime: number = 0;
  private isDestroyed: boolean = false;
  private isSoftwareGl: boolean = false;
  // Achievement & Run tracking
  private runSurvivalSec: number = 0;
  private overtakesThisRun: number = 0;
  private nitroTriggeredThisRun: boolean = false;
  private magnetTriggeredThisRun: boolean = false;

  // Crash Vehicle & Timeline Tracking (Distance vs Difficulty & Speed)
  private lastCrashedVehicleType: TrafficVehicleType | null = null;
  private runTimeline: RunTimelinePoint[] = [];
  private timelineRecordTimer: number = 0;

  // Callbacks
  private onStatsUpdate?: (stats: GameStats) => void;
  private onStatusChange?: (status: GameStatus) => void;
  private onAchievementUnlocked?: (achievement: Achievement) => void;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onStatsUpdate?: (stats: GameStats) => void;
      onStatusChange?: (status: GameStatus) => void;
      onAchievementUnlocked?: (achievement: Achievement) => void;
    }
  ) {
    this.container = container;
    this.onStatsUpdate = callbacks?.onStatsUpdate;
    this.onStatusChange = callbacks?.onStatusChange;
    this.onAchievementUnlocked = callbacks?.onAchievementUnlocked;

    achievements.onUnlock((ach) => {
      this.onAchievementUnlocked?.(ach);
    });

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
    this.scene.fog = new THREE.FogExp2(0x89c7f9, 0.007);

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

    // Dynamic Weather System (Sun glare, mist, and atmospheric cycle)
    this.weather = new WeatherSystem(this.scene, this.dirLight, this.hemiLight);

    // 7. Road & Scenery
    this.roadManager = new RoadManager(this.scene);

    // 8. Player Supercar (Equipped Model)
    const equipped = getEquippedCar();
    this.player = createPlayerCar(equipped);
    this.player.group.position.set(0, 0, 0);
    this.scene.add(this.player.group);

    // Player Energy Shield & Nitro Exhaust Attachments
    const shieldGeo = new THREE.SphereGeometry(2.1, 16, 12);
    shieldGeo.scale(1.0, 0.65, 1.4);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    this.playerShieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.playerShieldMesh.position.y = 0.6;
    this.playerShieldMesh.visible = false;
    this.player.group.add(this.playerShieldMesh);

    // Nitro exhaust fire cones
    const flameGeo = new THREE.ConeGeometry(0.12, 0.65, 8);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: equipped.neonColorHex || 0x06b6d4,
      transparent: true,
      opacity: 0.9,
    });
    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.46, 0.22, 2.15);
    flameL.visible = false;
    this.player.group.add(flameL);
    this.nitroFlames.push(flameL);

    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.position.set(0.46, 0.22, 2.15);
    flameR.visible = false;
    this.player.group.add(flameR);
    this.nitroFlames.push(flameR);

    // 9. Particle container & Skidmark container
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.skidmarkGroup = new THREE.Group();
    this.scene.add(this.skidmarkGroup);

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
    this.lastRunId = '';

    // Reset power-ups
    this.magnetTimer = 0;
    this.boostTimer = 0;
    this.powerUpSpawnTimer = 0;
    if (this.playerShieldMesh) this.playerShieldMesh.visible = false;
    this.nitroFlames.forEach((f) => (f.visible = false));

    // Reset run tracking for achievements & crash vehicle
    this.runSurvivalSec = 0;
    this.overtakesThisRun = 0;
    this.nitroTriggeredThisRun = false;
    this.magnetTriggeredThisRun = false;
    this.lastCrashedVehicleType = null;
    this.runTimeline = [{ distance: 0, difficulty: 0, speed: 100 }];
    this.timelineRecordTimer = 0;
    achievements.resetNewFlags();

    this.clearTraffic();
    this.clearCoins();
    this.clearPowerUps();
    this.clearParticles();
    this.roadManager.reset();

    // Initial traffic ahead
    this.spawnInitialObstacles();

    sound.startEngine();
    synthwaveBgm.start();
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
      synthwaveBgm.start();
      this.onStatusChange?.(this.status);
    }
  }

  // Public Restart Game
  public restartGame() {
    this.startGame();
  }

  /**
   * Reloads the player's 3D vehicle when changed in Garage
   */
  public reloadEquippedCar() {
    if (!this.player) return;
    this.scene.remove(this.player.group);
    this.nitroFlames = [];

    const equipped = getEquippedCar();
    this.player = createPlayerCar(equipped);
    this.player.group.position.set(this.playerX, 0, this.playerZ);
    this.scene.add(this.player.group);

    // Re-attach nitro flames
    const flameGeo = new THREE.ConeGeometry(0.12, 0.65, 8);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: equipped.neonColorHex || 0x06b6d4,
      transparent: true,
      opacity: 0.9,
    });
    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.46, 0.22, 2.15);
    flameL.visible = false;
    this.player.group.add(flameL);
    this.nitroFlames.push(flameL);

    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.position.set(0.46, 0.22, 2.15);
    flameR.visible = false;
    this.player.group.add(flameR);
    this.nitroFlames.push(flameR);

    this.notifyStats();
  }

  private notifyStats() {
    const activePowerUps: ActivePowerUp[] = [];
    if (this.magnetTimer > 0) {
      activePowerUps.push({
        type: 'magnet',
        remaining: Math.max(0, this.magnetTimer),
        total: this.magnetDuration,
      });
    }
    if (this.boostTimer > 0) {
      activePowerUps.push({
        type: 'boost',
        remaining: Math.max(0, this.boostTimer),
        total: this.boostDuration,
      });
    }

    this.onStatsUpdate?.({
      score: Math.floor(this.score),
      speedKmH: Math.round(this.speedKmH),
      coins: this.coinsCount,
      bankCoins: getBankCoins(),
      distanceMeters: Math.floor(this.distance),
      highScore: this.highScore,
      weatherMode: this.weather ? this.weather.getWeatherMode() : 'sunny',
      isAutoWeather: this.weather ? this.weather.isAutoCycling() : true,
      activePowerUps,
      lastRunId: this.lastRunId,
      equippedCar: getEquippedCar(),
      lastCrashedVehicleType: this.lastCrashedVehicleType || undefined,
      runTimeline: [...this.runTimeline],
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
    const diffFactor = Math.min(1.0, this.distance / 1600);

    // Pick vehicle type: standard sports car, SUV, semi-truck (Tır), or coach bus (Otobüs)
    let vehicleType: TrafficVehicleType = 'car';
    const rand = Math.random();
    if (diffFactor < 0.25) {
      if (rand < 0.65) vehicleType = 'car';
      else if (rand < 0.85) vehicleType = 'suv';
      else if (rand < 0.94) vehicleType = 'truck';
      else vehicleType = 'bus';
    } else {
      if (rand < 0.40) vehicleType = 'car';
      else if (rand < 0.60) vehicleType = 'suv';
      else if (rand < 0.82) vehicleType = 'truck';
      else vehicleType = 'bus';
    }

    const colors = [0x1a68e8, 0xf5ba18, 0x14a768, 0xfa6400, 0x9333ea, 0xdfe6e9, 0xdc2626, 0x0284c7];
    const color = colors[Math.floor(Math.random() * colors.length)];

    let car: CarParts;
    let length = 3.6;
    let width = 1.5;

    if (vehicleType === 'truck') {
      car = createTrafficTruck(color);
      length = 6.8;
      width = 1.85;
    } else if (vehicleType === 'bus') {
      car = createTrafficBus(color);
      length = 7.5;
      width = 1.85;
    } else if (vehicleType === 'suv') {
      car = createTrafficSUV(color);
      length = 4.2;
      width = 1.65;
    } else {
      car = createTrafficCar(color);
      length = 3.6;
      width = 1.5;
    }

    const x = laneIndex * LANE_WIDTH;
    car.group.position.set(x, 0, z);
    this.scene.add(car.group);

    // Dynamic traffic speed: trucks & buses are heavier and drive slightly slower
    const baseMin = (vehicleType === 'truck' || vehicleType === 'bus') ? 13 : 15;
    const baseTrafficSpeed = baseMin + Math.random() * 6;
    const speedVariation = (Math.random() - 0.5) * (diffFactor * 8);
    const trafficSpeed = Math.max(10, baseTrafficSpeed + speedVariation);

    this.traffic.push({
      car,
      vehicleType,
      laneIndex,
      speed: trafficSpeed,
      z,
      x,
      length,
      width,
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

  private spawnPowerUpAt(z: number, laneIndex: number, type: PowerUpType) {
    const model = type === 'magnet' ? createMagnetModel() : createNitroModel();
    const x = laneIndex * LANE_WIDTH;
    model.group.position.set(x, 0, z);
    this.scene.add(model.group);

    this.powerUps.push({
      type,
      group: model.group,
      mesh: model.mesh,
      shadow: model.shadow,
      laneIndex,
      x,
      z,
      collected: false,
    });
  }

  private clearPowerUps() {
    this.powerUps.forEach((p) => {
      this.scene.remove(p.group);
    });
    this.powerUps = [];
  }

  private clearParticles() {
    this.particles.forEach((p) => {
      this.particleGroup.remove(p.mesh);
    });
    this.particles = [];

    this.skidmarks.forEach((s) => {
      this.skidmarkGroup.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    });
    this.skidmarks = [];
  }

  private createSkidmarkPair(x: number, z: number) {
    if (this.skidmarks.length > 60) {
      const oldest = this.skidmarks.shift();
      if (oldest) {
        this.skidmarkGroup.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    const geo = new THREE.PlaneGeometry(0.24, 1.4);
    geo.rotateX(-Math.PI / 2);

    [-0.72, 0.72].forEach((offset) => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x111317,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + offset, 0.015, z + 1.15);
      this.skidmarkGroup.add(mesh);
      this.skidmarks.push({ mesh, opacity: 0.55 });
    });
  }

  private updateSkidmarks(delta: number) {
    for (let i = this.skidmarks.length - 1; i >= 0; i--) {
      const s = this.skidmarks[i];
      s.opacity -= delta * 0.45;
      if (s.opacity <= 0) {
        this.skidmarkGroup.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.skidmarks.splice(i, 1);
      } else {
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = s.opacity;
      }
    }
  }

  private emitNearMissParticles(x: number, y: number, z: number) {
    // 1. Slipstream Wind Streaks
    const streakGeo = new THREE.PlaneGeometry(0.08, 3.2);
    streakGeo.rotateX(-Math.PI / 2);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(streakGeo, streakMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.6,
        y + 0.2 + (Math.random() - 0.5) * 0.4,
        z + (Math.random() - 0.5) * 1.5
      );
      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, 0.5, 30 + Math.random() * 20),
        life: 0,
        maxLife: 0.2,
      });
    }

    // 2. Dust puffs
    const dustGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(dustGeo, dustMat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.5, 0.15, z);
      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          0.8 + Math.random() * 1.5,
          8 + Math.random() * 10
        ),
        life: 0,
        maxLife: 0.35,
      });
    }
  }

  private emitSpeedDust(x: number, z: number) {
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.45,
    });
    [-0.65, 0.65].forEach((offsetX) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + offsetX, 0.1, z + 1.2);
      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          0.5 + Math.random() * 0.8,
          6 + Math.random() * 8
        ),
        life: 0,
        maxLife: 0.3,
      });
    });
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

    // Record final data point in timeline
    const diffFactor = Math.min(1.0, this.distance / 1600);
    this.runTimeline.push({
      distance: Math.round(this.distance),
      difficulty: Math.round(diffFactor * 100),
      speed: Math.round(this.speedKmH),
    });

    // Save run to local leaderboard
    if (this.score > 0) {
      const record = saveScoreToLeaderboard({
        score: this.score,
        coins: this.coinsCount,
        distanceMeters: this.distance,
        maxSpeedKmH: this.speedKmH,
      });
      this.lastRunId = record.entry.id;
      this.highScore = Math.max(this.highScore, record.entry.score);
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
      this.roadManager.update(this.playerZ, delta);
      this.weather.update(this.playerZ, delta, this.roadManager.getOceanMaterial());
    } else if (this.status === 'paused') {
      this.weather.update(this.playerZ, delta, this.roadManager.getOceanMaterial());
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
    // 1. Difficulty Ramp & Power-up Timers
    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - delta);
    }
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - delta);
    }

    this.distance += this.currentForwardSpeed * delta;
    const speedRatio = Math.min(this.distance / 1200, 1.0); // 1200 meters to base max speed
    const boostSpeedBonus = this.boostTimer > 0 ? 55 : 0;
    
    // Apply car speed perk bonus
    const equipped = getEquippedCar();
    const speedPerk = equipped.bonusType === 'speed_boost' ? (equipped.bonusValue || 1.15) : 1.0;
    this.speedKmH = (100 + speedRatio * 80 + boostSpeedBonus) * speedPerk;
    this.currentForwardSpeed = this.speedKmH / 3.6;

    // Record timeline samples every ~1.6 seconds for Recharts distance vs difficulty chart
    this.timelineRecordTimer += delta;
    if (this.timelineRecordTimer >= 1.6) {
      this.timelineRecordTimer = 0;
      this.runTimeline.push({
        distance: Math.round(this.distance),
        difficulty: Math.round(speedRatio * 100),
        speed: Math.round(this.speedKmH),
      });
      if (this.runTimeline.length > 50) {
        this.runTimeline.shift();
      }
    }

    // Modulate Synthwave BGM tempo dynamically to player speed
    synthwaveBgm.setSpeed(this.speedKmH);

    // Camera dynamic FOV (widens to 64 during nitro boost for speed rush feel)
    const targetFov = this.boostTimer > 0 ? 64 : 54;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, delta);
      this.camera.updateProjectionMatrix();
    }

    // Vehicle visual attachments: Blazing nitro flames (no shield, crash remains active!)
    if (this.playerShieldMesh) {
      this.playerShieldMesh.visible = false;
    }

    this.nitroFlames.forEach((flame) => {
      flame.visible = this.boostTimer > 0;
      if (this.boostTimer > 0) {
        const flicker = 0.8 + Math.random() * 0.6;
        flame.scale.set(1, 1, flicker);
      }
    });

    // Score increases with distance traveled + points
    this.score += (this.currentForwardSpeed * delta) * 1.5;

    // Track survival time and live achievements
    this.runSurvivalSec += delta;
    achievements.updateLiveRun({
      runSurvivalSec: this.runSurvivalSec,
      coinsCollectedThisRun: this.coinsCount,
      currentSpeedKmH: this.speedKmH,
      overtakesThisRun: this.overtakesThisRun,
      nitroTriggered: this.nitroTriggeredThisRun,
      magnetTriggered: this.magnetTriggeredThisRun,
      distanceMeters: this.distance,
    });

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

    // Spawn tire skidmark decals during cornering or nitro acceleration
    const isCornering = Math.abs(xDiff) > 0.08;
    const isBoost = this.boostTimer > 0;
    if ((isCornering || isBoost) && Math.abs(this.playerZ - this.lastSkidZ) > 1.3) {
      this.lastSkidZ = this.playerZ;
      this.createSkidmarkPair(this.playerX, this.playerZ);
    }

    // High speed road dust puffs behind tires
    if (this.speedKmH > 115 && Math.random() < 0.28) {
      this.emitSpeedDust(this.playerX, this.playerZ);
    }

    // Update and fade active skidmarks
    this.updateSkidmarks(delta);

    // Spin player wheels
    const wheelRot = this.currentForwardSpeed * delta * 3.5;
    this.player.wheels.forEach((w) => {
      w.rotation.x -= wheelRot;
    });

    // 4. Update directional light tracking
    this.dirLight.position.set(this.playerX + 25, 45, this.playerZ + 20);
    this.dirLight.target.position.set(this.playerX, 0, this.playerZ - 10);
    this.dirLight.target.updateMatrixWorld();

    // 5. Update Road chunks & ocean scenery & dynamic weather
    this.roadManager.update(this.playerZ, delta, this.speedKmH);
    this.weather.update(this.playerZ, delta, this.roadManager.getOceanMaterial());

    // 6. Spawn traffic, coins & power-ups
    this.updateSpawners(delta);

    // 7. Update Traffic AI & check collisions
    this.updateTraffic(delta);

    // 8. Update Coins & magnet attraction
    this.updateCoins(delta);

    // 9. Update Power-ups
    this.updatePowerUps(delta);

    // 10. Emit stats update periodically
    this.notifyStats();
  }

  private updateSpawners(delta: number) {
    this.trafficSpawnTimer += delta;
    this.coinSpawnTimer += delta;
    this.powerUpSpawnTimer += delta;

    // Progressive difficulty: increases with distance traveled (from 0 up to 1.0 at 1600m+)
    const diffFactor = Math.min(1.0, this.distance / 1600);

    // Traffic spawn frequency accelerates noticeably with distance/difficulty & speed
    const trafficInterval = Math.max(0.72, 2.3 - diffFactor * 1.15 - (this.speedKmH - 100) * 0.007);
    if (this.trafficSpawnTimer > trafficInterval) {
      this.trafficSpawnTimer = 0;

      const availableLanes = [-1, 0, 1];
      const spawnZ = this.playerZ - 120;
      // As difficulty increases, tighter spacing between oncoming vehicles
      const clearanceZ = Math.max(14, 26 - diffFactor * 12);
      const blockedLanes = new Set(
        this.traffic
          .filter((t) => Math.abs(t.z - spawnZ) < clearanceZ)
          .map((t) => t.laneIndex)
      );

      const openLanes = availableLanes.filter((l) => !blockedLanes.has(l));
      if (openLanes.length > 0) {
        // High difficulty wave: occasionally spawn 2 cars leaving only 1 escape lane for sharp slalom
        const shouldSpawnDouble = diffFactor > 0.35 && openLanes.length >= 2 && Math.random() < diffFactor * 0.42;
        if (shouldSpawnDouble) {
          const firstLane = openLanes[Math.floor(Math.random() * openLanes.length)];
          const remainingLanes = openLanes.filter((l) => l !== firstLane);
          const secondLane = remainingLanes[Math.floor(Math.random() * remainingLanes.length)];
          this.spawnTrafficAt(spawnZ, firstLane);
          this.spawnTrafficAt(spawnZ - (Math.random() * 8 + 4), secondLane);
        } else {
          const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
          this.spawnTrafficAt(spawnZ, lane);
        }
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

    // Power-up spawn (every ~14 to 18 seconds)
    if (this.powerUpSpawnTimer > 15.0) {
      this.powerUpSpawnTimer = 0;
      const lane = Math.floor(Math.random() * 3) - 1;
      const type: PowerUpType = Math.random() > 0.5 ? 'magnet' : 'boost';
      const spawnZ = this.playerZ - 105;
      this.spawnPowerUpAt(spawnZ, lane, type);
    }
  }

  private updatePowerUps(delta: number) {
    const time = performance.now() * 0.003;

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];

      // Spin and hover
      p.mesh.rotation.y += delta * 3.5;
      p.mesh.position.y = 0.65 + Math.sin(time * 3 + p.z) * 0.12;

      // Check pickup
      const dx = Math.abs(this.playerX - p.x);
      const dz = Math.abs(this.playerZ - p.z);

      if (!p.collected && dx < 1.4 && dz < 2.0) {
        p.collected = true;

        if (p.type === 'magnet') {
          this.magnetTimer = this.magnetDuration;
          this.magnetTriggeredThisRun = true;
          sound.playPowerUp();
        } else {
          this.boostTimer = this.boostDuration;
          this.nitroTriggeredThisRun = true;
          sound.playNitro();
        }

        this.score += 100;
        this.emitCoinParticles(p.x, p.mesh.position.y, p.z);
        this.scene.remove(p.group);
        this.powerUps.splice(i, 1);
        continue;
      }

      // Despawn if passed
      if (p.z > this.playerZ + 25) {
        this.scene.remove(p.group);
        this.powerUps.splice(i, 1);
      }
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

      // Dynamic collision detection with player (Active even during nitro boost - no protection!)
      const dx = Math.abs(this.playerX - entity.x);
      const dz = Math.abs(this.playerZ - entity.z);

      const collisionLength = (entity.length + 3.6) * 0.44;
      const collisionWidth = (entity.width + 1.45) * 0.44;

      if (dx < collisionWidth && dz < collisionLength) {
        // High speed crash during nitro has even higher camera shake!
        if (this.boostTimer > 0) {
          this.cameraShake = 1.3;
        }
        this.lastCrashedVehicleType = entity.vehicleType;
        this.triggerCrash();
        return;
      }

      // Close pass detection ("Makas" / near-miss overtake with slipstream & dust)
      if (!entity.nearMissTriggered && this.currentForwardSpeed > entity.speed) {
        const lateralDist = Math.abs(this.playerX - entity.x);
        const longDist = entity.z - this.playerZ;
        const triggerDepth = (entity.length + 3.6) * 0.5;
        if (lateralDist > collisionWidth && lateralDist < collisionWidth + 1.2 && Math.abs(longDist) < triggerDepth) {
          entity.nearMissTriggered = true;
          this.score += 35; // Bonus score for near miss
          this.emitNearMissParticles(
            (this.playerX + entity.x) / 2,
            0.5,
            (this.playerZ + entity.z) / 2
          );
        }
      }

      // Despawn traffic when far behind player (player has overtaken them)
      if (entity.z > this.playerZ + 35) {
        this.scene.remove(entity.car.group);
        this.traffic.splice(i, 1);
        this.overtakesThisRun++;
        // Bonus points for clean overtaking!
        this.score += 25;
      }
    }
  }

  private updateCoins(delta: number) {
    const time = performance.now() * 0.004;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];

      // Magnet Attraction Physics: pull coins towards player when magnet is active
      if (this.magnetTimer > 0) {
        const equipped = getEquippedCar();
        const maxDist = equipped.bonusType === 'magnet_boost' ? 44 : 32;
        const distToPlayer = Math.hypot(this.playerX - coin.x, this.playerZ - coin.z);
        if (distToPlayer < maxDist) {
          const pull = Math.min(1, delta * 15);
          coin.x += (this.playerX - coin.x) * pull;
          coin.z += (this.playerZ - coin.z) * pull;
          coin.group.position.x = coin.x;
          coin.group.position.z = coin.z;
        }
      }

      // Spin coin continuously
      coin.mesh.rotation.z += delta * 4.0;
      // Gentle vertical hover bob
      coin.mesh.position.y = coin.baseY + Math.sin(time + coin.z) * 0.12;

      // Check pickup with player
      const dx = Math.abs(this.playerX - coin.x);
      const dz = Math.abs(this.playerZ - coin.z);

      if (!coin.collected && dx < 1.4 && dz < 1.8) {
        coin.collected = true;
        const equipped = getEquippedCar();
        const mult = equipped.bonusType === 'coin_boost' ? (equipped.bonusValue || 1.5) : 1.0;
        const earned = Math.round(1 * mult);
        this.coinsCount += earned;
        addBankCoins(earned); // Instant deposit so garage always reflects current coins!
        this.score += 50 * earned; // +50 points per coin
        achievements.recordCoinsCollected(earned);
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
    // Dynamic camera: as speed increases, elevate the camera and pull back slightly
    // for an expansive, cinematic highway view
    const speedFactor = Math.max(0, Math.min(1.0, (this.speedKmH - 100) / 115));
    const targetCamX = this.playerX * 0.35;
    const targetCamY = 3.6 + speedFactor * 1.5; // Elevates from 3.6m to 5.1m
    const targetCamZ = this.playerZ + 7.4 + speedFactor * 1.6; // Pulls back from 7.4m to 9.0m

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, delta * 12);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, delta * 6);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, delta * 12);

    // Apply camera shake if any
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.5);
    }

    // Dynamic LookAt: looks further down the coastal highway as speed increases
    const targetLookAtX = this.playerX * 0.25;
    const targetLookAtY = 1.1 + speedFactor * 0.45;
    const targetLookAtZ = this.playerZ - 14 - speedFactor * 13;
    this.camera.lookAt(targetLookAtX, targetLookAtY, targetLookAtZ);
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public nextWeather(): WeatherMode {
    const mode = this.weather.nextWeather();
    this.notifyStats();
    return mode;
  }

  public setWeather(mode: WeatherMode) {
    this.weather.setWeather(mode);
    this.notifyStats();
  }

  public toggleAutoWeather(): boolean {
    const auto = this.weather.toggleAutoCycle();
    this.notifyStats();
    return auto;
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    sound.stopEngine();
    synthwaveBgm.stop();

    this.clearTraffic();
    this.clearCoins();
    this.clearPowerUps();
    this.clearParticles();
    this.roadManager.dispose();
    this.weather.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
